import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/auth';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryRecord = {
  id: number;
  itemId: number;
  quantity: number;
  item: { name: string; slug: string; par: number | null };
};

type ScheduleEntry = {
  itemId: number;
  weekday: string;
  quantity: number;
  item: { name: string; slug: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function getTodayWeekday(): string {
  return WEEKDAYS[new Date().getDay()];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ─── Bake card ────────────────────────────────────────────────────────────────

type BakeStatus = 'done' | 'partial' | 'empty';

function getBakeStatus(stock: number, quota: number): BakeStatus {
  if (stock >= quota) return 'done';
  if (stock > 0) return 'partial';
  return 'empty';
}

const BAKE_COLORS: Record<BakeStatus, string> = {
  done:    'var(--status-above-par-text)',
  partial: 'var(--status-below-par-text)',
  empty:   'var(--status-critical-text)',
};

function BakeCard({ entry, stock }: { entry: ScheduleEntry; stock: number }) {
  const quota = entry.quantity;
  const stillToBake = Math.max(0, quota - stock);
  const status = getBakeStatus(stock, quota);
  const pct = Math.min(100, Math.round((stock / quota) * 100));
  const color = BAKE_COLORS[status];

  return (
    <div className="relative bg-card border border-border rounded-[12px] p-4 overflow-hidden">
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[12px]"
        style={{ background: color }}
      />

      <div className="pl-2">
        {/* Top row */}
        <div className="flex justify-between items-start">
          <span className="text-[17px] font-medium text-foreground leading-snug">
            {entry.item.name}
          </span>
          <div className="text-right ml-4 shrink-0">
            <span className="text-[26px] font-bold text-foreground leading-none">{quota}</span>
            <div className="text-[11px] text-muted-foreground mt-0.5">target</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>

        {/* Bottom row */}
        <div className="flex justify-between items-center mt-2.5">
          <span className="text-[13px] text-muted-foreground">
            {stock} in stock
          </span>
          {status === 'done' ? (
            <span className="text-[13px] font-medium" style={{ color }}>
              All done ✓
            </span>
          ) : (
            <span className="text-[13px] font-semibold" style={{ color }}>
              Bake {stillToBake} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attention card ───────────────────────────────────────────────────────────

function AttentionCard({ record }: { record: InventoryRecord }) {
  return (
    <div className="relative bg-card border border-border rounded-[12px] p-4 overflow-hidden">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[12px]"
        style={{ background: 'var(--status-zero-text)' }}
      />
      <div className="pl-2 flex justify-between items-center">
        <span className="text-[17px] font-medium text-foreground">{record.item.name}</span>
        <span
          className="text-xs font-semibold px-[10px] py-0.5 rounded-full shrink-0 ml-4"
          style={{ background: 'var(--status-zero-bg)', color: 'var(--status-zero-text)' }}
        >
          Empty
        </span>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [bakeList, setBakeList] = useState<{ entry: ScheduleEntry; stock: number }[]>([]);
  const [attentionItems, setAttentionItems] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, schedRes] = await Promise.all([
          fetch(`${API_URL}/inventory`, { credentials: 'include' }),
          fetch(`${API_URL}/production-schedule`, { credentials: 'include' }),
        ]);
        if (!invRes.ok) throw new Error('Failed to load inventory');
        if (!schedRes.ok) throw new Error('Failed to load schedule');

        const [invData, schedData]: [InventoryRecord[], ScheduleEntry[]] = await Promise.all([
          invRes.json(),
          schedRes.json(),
        ]);

        const today = getTodayWeekday();
        const todayEntries = schedData.filter(e => e.weekday === today);

        // Map itemId → stock for quick lookup
        const invMap: Record<number, number> = {};
        for (const rec of invData) invMap[rec.itemId] = rec.quantity;

        // Bake list: today's scheduled items with current stock
        const bakes = todayEntries.map(entry => ({
          entry,
          stock: invMap[entry.itemId] ?? 0,
        }));
        // Sort: items still needing work first (empty → partial → done)
        bakes.sort((a, b) => {
          const order = { empty: 0, partial: 1, done: 2 };
          return order[getBakeStatus(a.stock, a.entry.quantity)] - order[getBakeStatus(b.stock, b.entry.quantity)];
        });
        setBakeList(bakes);

        // Attention: items NOT scheduled today that are out of stock
        const scheduledIds = new Set(todayEntries.map(e => e.itemId));
        const attention = invData.filter(
          rec => !scheduledIds.has(rec.itemId) && rec.quantity === 0
        );
        setAttentionItems(attention);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stillNeeded = bakeList.filter(b => getBakeStatus(b.stock, b.entry.quantity) !== 'done').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">{getGreeting()}</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{formatDate()}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-1"
        >
          Log out
        </button>
      </header>

      <main className="px-4 pt-4 pb-24 flex flex-col gap-5">
        {loading && (
          <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>
        )}
        {fetchError && (
          <p className="text-center text-destructive pt-12">{fetchError}</p>
        )}

        {!loading && !fetchError && (
          <>
            {/* Bake list */}
            <section>
              <div className="flex justify-between items-baseline mb-2">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Bakes
                </h2>
                {stillNeeded > 0 && (
                  <span className="text-[13px] text-muted-foreground">
                    {stillNeeded} still needed
                  </span>
                )}
              </div>

              {bakeList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nothing scheduled for today — set quotas in the Schedule tab.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {bakeList.map(({ entry, stock }) => (
                    <BakeCard key={entry.itemId} entry={entry} stock={stock} />
                  ))}
                </div>
              )}
            </section>

            {/* Needs attention */}
            {attentionItems.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Out of Stock
                </h2>
                <div className="flex flex-col gap-2">
                  {attentionItems.map(record => (
                    <AttentionCard key={record.id} record={record} />
                  ))}
                </div>
              </section>
            )}

            {/* All clear */}
            {bakeList.length === 0 && attentionItems.length === 0 && (
              <div className="text-center pt-8 text-muted-foreground text-sm">
                All good — nothing needs attention today.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
