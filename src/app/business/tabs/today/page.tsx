import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: number; name: string };

type InventoryRecord = {
  id: number;
  itemId: number;
  quantity: number;
  item: { name: string; slug: string; par: number | null; category: Category | null };
};

type ScheduleEntry = {
  itemId: number;
  weekday: string;
  quantity: number;
  item: { name: string; slug: string };
  isOverridden?: boolean;
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

// Pre-bake freezer readiness (before baker confirms the bake)
type BakeReadiness = 'sufficient' | 'low' | 'empty';

function getReadiness(stock: number, quota: number): BakeReadiness {
  if (stock === 0) return 'empty';
  if (stock < quota) return 'low';
  return 'sufficient';
}

const READINESS_ORDER: Record<BakeReadiness, number> = { empty: 0, low: 1, sufficient: 2 };

const READINESS_COLOR: Record<BakeReadiness, string> = {
  sufficient: 'var(--status-above-par-text)',
  low:        'var(--status-below-par-text)',
  empty:      'var(--status-critical-text)',
};

const DONE_COLOR = 'var(--status-above-par-text)';

function BakeCard({
  entry,
  stock,
  bakedQty,
  onClick,
  onUndo,
}: {
  entry: ScheduleEntry;
  stock: number;
  bakedQty: number | null;
  onClick: () => void;
  onUndo: () => void;
}) {
  const quota = entry.quantity;
  const isBaked = bakedQty !== null;
  const readiness = getReadiness(stock, quota);
  const canTap = !isBaked && stock > 0;

  const accentColor = isBaked ? DONE_COLOR : READINESS_COLOR[readiness];
  const barPct = isBaked
    ? 100
    : Math.min(100, Math.round((stock / quota) * 100));

  const inner = (
    <div className="relative bg-card border border-border rounded-[12px] p-4 overflow-hidden">
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[12px]"
        style={{ background: accentColor }}
      />

      {/* Content dims when baked */}
      <div className={`pl-2 transition-opacity duration-300 ${isBaked ? 'opacity-50' : ''}`}>
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[17px] font-medium text-foreground leading-snug">
              {entry.item.name}
            </span>
            {isBaked && (
              <span className="text-[13px] font-medium" style={{ color: DONE_COLOR }}>
                Baked ✓
              </span>
            )}
            {entry.isOverridden && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--status-below-par-bg)', color: 'var(--status-below-par-text)' }}>
                override
              </span>
            )}
          </div>
          <div className="text-right ml-4 shrink-0">
            <span className="text-[26px] font-bold text-foreground leading-none">
              {isBaked ? bakedQty : quota}
            </span>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {isBaked ? 'baked' : 'target'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
            style={{ width: `${barPct}%`, background: accentColor }}
          />
        </div>

        {/* Bottom row */}
        <div className="flex justify-between items-center mt-2.5">
          <span className="text-[13px] text-muted-foreground">
            {isBaked ? `${stock} left in freezer` : `${stock} in freezer`}
          </span>
          {!isBaked && (readiness === 'empty' ? (
            <span className="text-[13px] font-medium" style={{ color: READINESS_COLOR.empty }}>
              Nothing in freezer
            </span>
          ) : readiness === 'low' ? (
            <span className="text-[13px] font-semibold" style={{ color: READINESS_COLOR.low }}>
              Only {stock} available
            </span>
          ) : (
            <span className="text-[13px] font-medium text-muted-foreground">
              Tap to confirm →
            </span>
          ))}
        </div>
      </div>

      {/* Undo button — full opacity, outside the dimmed wrapper */}
      {isBaked && (
        <button
          onClick={onUndo}
          className="absolute bottom-3 right-4 text-[12px] font-medium text-muted-foreground underline underline-offset-2 cursor-pointer"
        >
          Undo
        </button>
      )}
    </div>
  );

  if (!canTap) return inner;

  return (
    <button
      onClick={onClick}
      className="w-full text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
    >
      {inner}
    </button>
  );
}

// ─── Bake modal ───────────────────────────────────────────────────────────────

function BakeModal({
  entry,
  stock,
  onClose,
  onConfirm,
  saving,
}: {
  entry: ScheduleEntry;
  stock: number;
  onClose: () => void;
  onConfirm: (quantity: number, note: string) => void;
  saving: boolean;
}) {
  const maxBakeable = Math.min(entry.quantity, stock);
  const [count, setCount] = useState(maxBakeable);
  const [note, setNote] = useState('');

  const differsFromQuota = count !== entry.quantity;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-card rounded-t-[16px] px-6 pt-6 pb-10 z-10 max-w-[430px] w-full mx-auto">
        <div className="w-9 h-1 bg-border rounded-full mx-auto mb-5" />

        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">
          Mark as Baked
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-1">{entry.item.name}</h2>
        <p className="text-[13px] text-muted-foreground mb-6">
          Scheduled: {entry.quantity} · In freezer: {stock}
        </p>

        {/* Count stepper */}
        <div className="flex items-center justify-center gap-6 mb-5">
          <button
            onClick={() => setCount(c => Math.max(1, c - 1))}
            aria-label="Decrease quantity"
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <div className="text-center w-20">
            <div className="text-5xl font-bold text-foreground leading-none">{count}</div>
            <div className="text-[13px] text-muted-foreground mt-1">baking</div>
          </div>
          <button
            onClick={() => setCount(c => Math.min(stock, c + 1))}
            aria-label="Increase quantity"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Note — only shown when qty differs from quota */}
        {differsFromQuota && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Note <span className="text-muted-foreground font-normal">(why the difference?)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Short on stock, couldn't fill full quota"
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(count, note)}
            disabled={saving}
            className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Mark as Baked'}
          </button>
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

  const [bakeList, setBakeList] = useState<{ entry: ScheduleEntry; stock: number }[]>([]);
  const [attentionItems, setAttentionItems] = useState<InventoryRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // itemId → category (built from inventory response)
  const [itemCategoryMap, setItemCategoryMap] = useState<Record<number, Category | null>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // itemId → { qty, transactionId } for confirmed bakes this session
  const [bakedToday, setBakedToday] = useState<Record<number, { qty: number; transactionId: number }>>({});
  const [selectedBake, setSelectedBake] = useState<{ entry: ScheduleEntry; stock: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, schedRes, catsRes] = await Promise.all([
          fetch(`${API_URL}/inventory`, { credentials: 'include' }),
          fetch(`${API_URL}/production-schedule`, { credentials: 'include' }),
          fetch(`${API_URL}/categories`, { credentials: 'include' }),
        ]);
        if (!invRes.ok) throw new Error('Failed to load inventory');
        if (!schedRes.ok) throw new Error('Failed to load schedule');

        const todayDateStr = new Date().toISOString().split('T')[0];
        const overridesRes = await fetch(
          `${API_URL}/production-schedule/overrides?date=${todayDateStr}`,
          { credentials: 'include' },
        );

        const [invData, schedData, overridesData]: [InventoryRecord[], ScheduleEntry[], { itemId: number; quantity: number }[]] = await Promise.all([
          invRes.json(),
          schedRes.json(),
          overridesRes.ok ? overridesRes.json() : Promise.resolve([]),
        ]);

        setCategories(catsRes.ok ? await catsRes.json() : []);

        const today = getTodayWeekday();
        const todayEntries = schedData.filter(e => e.weekday === today);

        // Apply any overrides on top of the weekly template
        const overrideQtyMap: Record<number, number> = {};
        for (const o of overridesData) overrideQtyMap[o.itemId] = o.quantity;
        for (const entry of todayEntries) {
          if (overrideQtyMap[entry.itemId] !== undefined) {
            entry.quantity = overrideQtyMap[entry.itemId];
            entry.isOverridden = true;
          }
        }

        const invMap: Record<number, number> = {};
        const catMap: Record<number, Category | null> = {};
        for (const rec of invData) {
          invMap[rec.itemId] = rec.quantity;
          catMap[rec.itemId] = rec.item.category;
        }
        setItemCategoryMap(catMap);

        const bakes = todayEntries.map(entry => ({
          entry,
          stock: invMap[entry.itemId] ?? 0,
        }));

        sortBakeList(bakes, {});
        setBakeList(bakes);

        const scheduledIds = new Set(todayEntries.map(e => e.itemId));
        setAttentionItems(
          invData.filter(rec => !scheduledIds.has(rec.itemId) && rec.quantity === 0)
        );
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sort: unbaked empty → unbaked low → unbaked sufficient → baked
  function sortBakeList(
    list: { entry: ScheduleEntry; stock: number }[],
    baked: Record<number, number>,
  ) {
    list.sort((a, b) => {
      const aBaked = a.entry.itemId in baked;
      const bBaked = b.entry.itemId in baked;
      if (aBaked !== bBaked) return aBaked ? 1 : -1;
      return (
        READINESS_ORDER[getReadiness(a.stock, a.entry.quantity)] -
        READINESS_ORDER[getReadiness(b.stock, b.entry.quantity)]
      );
    });
  }

  const handleConfirmBake = async (quantity: number, note: string) => {
    if (!selectedBake) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { itemId: selectedBake.entry.itemId, quantity };
      if (note.trim()) body.note = note.trim();

      const res = await fetch(`${API_URL}/inventory/bake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? 'Failed to record bake');
      }

      const transaction: { id: number } = await res.json();
      const newBakedToday = { ...bakedToday, [selectedBake.entry.itemId]: { qty: quantity, transactionId: transaction.id } };
      setBakedToday(newBakedToday);

      // Deduct from local stock
      const updatedList = bakeList.map(b =>
        b.entry.itemId === selectedBake.entry.itemId
          ? { ...b, stock: b.stock - quantity }
          : b
      );
      sortBakeList(updatedList, newBakedToday);
      setBakeList(updatedList);

      setSelectedBake(null);
      showToast(`${selectedBake.entry.item.name} — ${quantity} baked`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleUndoBake = async (itemId: number) => {
    const baked = bakedToday[itemId];
    if (!baked) return;
    try {
      const res = await fetch(`${API_URL}/inventory/bake/${baked.transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to undo bake');

      const newBakedToday = { ...bakedToday };
      delete newBakedToday[itemId];
      setBakedToday(newBakedToday);

      // Restore stock locally
      const updatedList = bakeList.map(b =>
        b.entry.itemId === itemId ? { ...b, stock: b.stock + baked.qty } : b
      );
      sortBakeList(updatedList, newBakedToday);
      setBakeList(updatedList);

      showToast('Bake undone');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Categories that have at least one item in today's bake list or attention list
  const categoriesWithItems = categories.filter(cat =>
    bakeList.some(b => itemCategoryMap[b.entry.itemId]?.id === cat.id) ||
    attentionItems.some(a => a.item.category?.id === cat.id)
  );

  const filteredBakeList = categoryFilter === null
    ? bakeList
    : bakeList.filter(b => itemCategoryMap[b.entry.itemId]?.id === categoryFilter);

  const filteredAttentionItems = categoryFilter === null
    ? attentionItems
    : attentionItems.filter(a => a.item.category?.id === categoryFilter);

  const stillNeeded = filteredBakeList.filter(b => !(b.entry.itemId in bakedToday) && b.stock > 0).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <h1 className="text-[22px] font-bold text-foreground">{getGreeting()}</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{formatDate()}</p>

        {/* Category filter chips */}
        {!loading && !fetchError && categoriesWithItems.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors ${
                categoryFilter === null
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border'
              }`}
            >
              All
            </button>
            {categoriesWithItems.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

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
                {stillNeeded > 0 ? (
                  <span className="text-[13px] text-muted-foreground">
                    {stillNeeded} remaining
                  </span>
                ) : bakeList.length > 0 ? (
                  <span className="text-[13px] font-medium" style={{ color: DONE_COLOR }}>
                    All baked ✓
                  </span>
                ) : null}
              </div>

              {bakeList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nothing scheduled for today — set quotas in the Schedule tab.
                </p>
              ) : filteredBakeList.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nothing in this category today.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredBakeList.map(({ entry, stock }) => (
                    <BakeCard
                      key={entry.itemId}
                      entry={entry}
                      stock={stock}
                      bakedQty={bakedToday[entry.itemId]?.qty ?? null}
                      onClick={() => setSelectedBake({ entry, stock })}
                      onUndo={() => handleUndoBake(entry.itemId)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Needs attention */}
            {filteredAttentionItems.length > 0 && (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Out of Stock
                </h2>
                <div className="flex flex-col gap-2">
                  {filteredAttentionItems.map(record => (
                    <AttentionCard key={record.id} record={record} />
                  ))}
                </div>
              </section>
            )}

            {bakeList.length === 0 && attentionItems.length === 0 && (
              <div className="text-center pt-8 text-muted-foreground text-sm">
                All good — nothing needs attention today.
              </div>
            )}
          </>
        )}
      </main>

      {/* Bake modal */}
      {selectedBake && (
        <BakeModal
          entry={selectedBake.entry}
          stock={selectedBake.stock}
          onClose={() => setSelectedBake(null)}
          onConfirm={handleConfirmBake}
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
          {toast}
        </div>
      )}
    </div>
  );
}
