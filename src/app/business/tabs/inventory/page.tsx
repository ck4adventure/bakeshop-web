import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryItem = {
  id: number;
  itemId: number;
  quantity: number;
  item: { name: string; slug: string; par: number | null };
};

type ScheduleEntry = {
  itemId: number;
  weekday: string;
  quantity: number;
};

// ─── Status logic ─────────────────────────────────────────────────────────────

type Status = 'good' | 'low' | 'critical' | 'zero';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function getTomorrowWeekday(): string {
  return WEEKDAYS[(new Date().getDay() + 1) % 7];
}

function getStatus(quantity: number, par: number | null, nextDayQuota: number | null): Status {
  if (quantity === 0) return 'zero';
  if (nextDayQuota !== null && quantity < nextDayQuota) return 'critical';
  if (par !== null && quantity < par) return 'low';
  return 'good';
}

function getBarPct(quantity: number, par: number | null, status: Status): number {
  if (status === 'zero') return 0;
  if (par === null) return 50; // no par set — show a neutral fill
  return Math.min(100, Math.round((quantity / (par * 1.5)) * 100));
}

const STATUS_ORDER: Record<Status, number> = { zero: 0, critical: 1, low: 2, good: 3 };

const STATUS_CONFIG: Record<Status, { label: string; barColor: string; pillBg: string; pillText: string }> = {
  good:     { label: 'Above Par',  barColor: 'var(--status-above-par-text)', pillBg: 'var(--status-above-par-bg)', pillText: 'var(--status-above-par-text)' },
  low:      { label: 'Low',        barColor: 'var(--status-below-par-text)', pillBg: 'var(--status-below-par-bg)', pillText: 'var(--status-below-par-text)' },
  critical: { label: 'Critical',   barColor: 'var(--status-critical-text)',  pillBg: 'var(--status-critical-bg)',  pillText: 'var(--status-critical-text)'  },
  zero:     { label: 'Empty',      barColor: 'var(--status-zero-text)',      pillBg: 'var(--status-zero-bg)',      pillText: 'var(--status-zero-text)'      },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="text-xs font-semibold px-[10px] py-0.5 rounded-full"
      style={{ background: cfg.pillBg, color: cfg.pillText }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBar({ quantity, par, status }: { quantity: number; par: number | null; status: Status }) {
  const pct = getBarPct(quantity, par, status);
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ width: `${pct}%`, background: cfg.barColor }}
      />
    </div>
  );
}

function ItemCard({
  item,
  nextDayQuota,
  onClick,
}: {
  item: InventoryItem;
  nextDayQuota: number | null;
  onClick: (item: InventoryItem) => void;
}) {
  const { par } = item.item;
  const status = getStatus(item.quantity, par, nextDayQuota);
  const cfg = STATUS_CONFIG[status];

  return (
    <button
      onClick={() => onClick(item)}
      className="relative w-full bg-card border border-border rounded-[12px] p-4 text-left cursor-pointer overflow-hidden transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)]"
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[12px]"
        style={{ background: cfg.barColor }}
      />

      <div className="pl-2">
        {/* Top row: name + count */}
        <div className="flex justify-between items-start">
          <div className="text-[17px] font-medium text-foreground leading-snug">
            {item.item.name}
          </div>
          <div className="text-right ml-4 shrink-0">
            <div className="text-[26px] font-bold leading-none text-foreground">
              {item.quantity}
            </div>
            {par !== null && (
              <div className="text-[11px] text-muted-foreground mt-0.5">par {par}</div>
            )}
          </div>
        </div>

        <StatusBar quantity={item.quantity} par={par} status={status} />

        {/* Bottom row: status pill + tomorrow quota */}
        <div className="flex justify-between items-center mt-2.5">
          <StatusPill status={status} />
          {nextDayQuota !== null && (
            <div className="text-xs text-muted-foreground">
              Tomorrow: <span className="font-semibold text-foreground">{nextDayQuota}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function AddBatchModal({
  item,
  nextDayQuota,
  onClose,
  onConfirm,
  saving,
}: {
  item: InventoryItem;
  nextDayQuota: number | null;
  onClose: () => void;
  onConfirm: (item: InventoryItem, count: number) => void;
  saving: boolean;
}) {
  const [count, setCount] = useState(nextDayQuota ?? 1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-card rounded-t-[16px] px-6 pt-6 pb-10 z-10 max-w-[430px] w-full mx-auto">
        <div className="w-9 h-1 bg-border rounded-full mx-auto mb-5" />

        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">
          Add Batch
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-6">{item.item.name}</h2>

        {/* Count incrementer */}
        <div className="flex items-center justify-center gap-6 mb-7">
          <button
            onClick={() => setCount(c => Math.max(1, c - 1))}
            aria-label="Decrease quantity"
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <div className="text-center w-20">
            <div className="text-5xl font-bold text-foreground leading-none">{count}</div>
            {nextDayQuota !== null && (
              <div className="text-[13px] text-muted-foreground mt-1">
                expected yield: {nextDayQuota}
              </div>
            )}
          </div>
          <button
            onClick={() => setCount(c => c + 1)}
            aria-label="Increase quantity"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(item, count)}
            disabled={saving}
            className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'critical' | 'low' | 'zero';

const FILTERS: { val: Filter; label: string }[] = [
  { val: 'all',      label: 'All'      },
  { val: 'critical', label: 'Critical' },
  { val: 'low',      label: 'Low'      },
  { val: 'zero',     label: 'Empty'    },
];

export default function InventoryPage() {
  const { theme, toggle } = useTheme();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [nextDayQuotaMap, setNextDayQuotaMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, schedRes] = await Promise.all([
          fetch(`${API_URL}/inventory`, { credentials: 'include' }),
          fetch(`${API_URL}/production-schedule`, { credentials: 'include' }),
        ]);
        if (!invRes.ok) throw new Error('Failed to load inventory');
        if (!schedRes.ok) throw new Error('Failed to load schedule');

        const [invData, schedData]: [InventoryItem[], ScheduleEntry[]] = await Promise.all([
          invRes.json(),
          schedRes.json(),
        ]);

        setInventory(invData);

        const tomorrow = getTomorrowWeekday();
        const quotaMap: Record<number, number> = {};
        for (const entry of schedData) {
          if (entry.weekday === tomorrow) {
            quotaMap[entry.itemId] = entry.quantity;
          }
        }
        setNextDayQuotaMap(quotaMap);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleConfirmBatch = async (item: InventoryItem, count: number) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: item.itemId, quantity: count }),
      });
      if (!res.ok) throw new Error('Failed to save batch');
      setInventory(inv =>
        inv.map(i => i.id === item.id ? { ...i, quantity: i.quantity + count } : i)
      );
      setSelectedItem(null);
      showToast(`+${count} ${item.item.name} added`);
    } catch {
      showToast('Failed to save batch — please try again');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const getItemStatus = (item: InventoryItem) =>
    getStatus(item.quantity, item.item.par, nextDayQuotaMap[item.itemId] ?? null);

  const needsAttentionCount = inventory.filter(i => {
    const s = getItemStatus(i);
    return s === 'critical' || s === 'zero';
  }).length;

  const displayed = [...inventory]
    .filter(i => filter === 'all' || getItemStatus(i) === filter)
    .sort((a, b) => STATUS_ORDER[getItemStatus(a)] - STATUS_ORDER[getItemStatus(b)]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Inventory</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {needsAttentionCount > 0
                ? `${needsAttentionCount} item${needsAttentionCount !== 1 ? 's' : ''} need attention`
                : 'All items looking good'}
            </p>
          </div>
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-lg cursor-pointer"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mt-3">
          {FILTERS.map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors ${
                filter === val
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Item list */}
      <main className="px-4 pt-3 pb-24 flex flex-col gap-2">
        {loading && (
          <p className="text-center text-muted-foreground pt-12" role="status">
            Loading inventory…
          </p>
        )}
        {fetchError && (
          <p className="text-center text-destructive pt-12">{fetchError}</p>
        )}
        {!loading && !fetchError && displayed.length === 0 && (
          <p className="text-center text-muted-foreground pt-12">No items found.</p>
        )}
        {displayed.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            nextDayQuota={nextDayQuotaMap[item.itemId] ?? null}
            onClick={setSelectedItem}
          />
        ))}
      </main>

      {/* Batch modal */}
      {selectedItem && (
        <AddBatchModal
          item={selectedItem}
          nextDayQuota={nextDayQuotaMap[selectedItem.itemId] ?? null}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirmBatch}
          saving={saving}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium z-40 shadow-lg whitespace-nowrap"
        >
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
