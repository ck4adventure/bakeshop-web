import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type HistoryEntry = {
  id: number;
  itemId: number;
  quantity: number;
  note: string | null;
  createdAt: string;
  type: 'batch' | 'adjustment';
  product: { name: string; slug: string };
};

type InventoryRecord = {
  itemId: number;
  quantity: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDay(entries: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
  const groups: { label: string; items: HistoryEntry[] }[] = [];
  let currentLabel = '';

  for (const entry of entries) {
    const label = getDayLabel(entry.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(entry);
  }

  return groups;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [invMap, setInvMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [batchesRes, adjustmentsRes, invRes] = await Promise.all([
          fetch(`${API_URL}/batches`, { credentials: 'include' }),
          fetch(`${API_URL}/inventory/adjustments`, { credentials: 'include' }),
          fetch(`${API_URL}/inventory`, { credentials: 'include' }),
        ]);
        if (!batchesRes.ok) throw new Error('Failed to load history');

        const [batches, adjustments, invData]: [
          Omit<HistoryEntry, 'type'>[],
          Omit<HistoryEntry, 'type'>[],
          InventoryRecord[],
        ] = await Promise.all([
          batchesRes.json(),
          adjustmentsRes.ok ? adjustmentsRes.json() : Promise.resolve([]),
          invRes.ok ? invRes.json() : Promise.resolve([]),
        ]);

        const merged: HistoryEntry[] = [
          ...batches.map(b => ({ ...b, type: 'batch' as const })),
          ...adjustments.map(a => ({ ...a, type: 'adjustment' as const })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setEntries(merged);

        const map: Record<number, number> = {};
        for (const rec of invData) map[rec.itemId] = rec.quantity;
        setInvMap(map);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const groups = groupByDay(entries);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <h1 className="text-[22px] font-bold text-foreground">History</h1>
        {!loading && !fetchError && (
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {entries.length === 0 ? 'No history yet' : `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`}
          </p>
        )}
      </header>

      <main className="px-4 pt-3 pb-24 flex flex-col gap-1">
        {loading && (
          <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>
        )}
        {fetchError && (
          <p className="text-center text-destructive pt-12">{fetchError}</p>
        )}
        {!loading && !fetchError && entries.length === 0 && (
          <div className="text-center pt-16 text-muted-foreground text-sm">
            No history yet — log a batch or adjustment from the Inventory tab.
          </div>
        )}

        {groups.map(group => (
          <section key={group.label} className="mb-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground px-1 py-2">
              {group.label}
            </h2>

            <div className="flex flex-col gap-2">
              {group.items.map(entry => {
                const isAdjustment = entry.type === 'adjustment';
                const qtyDisplay = entry.quantity > 0 ? `+${entry.quantity}` : String(entry.quantity);
                const qtyColor = entry.quantity < 0 ? 'text-destructive' : 'text-foreground';

                return (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="bg-card border border-border rounded-[12px] px-4 py-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[17px] font-medium text-foreground truncate">
                            {entry.product.name}
                          </span>
                          {isAdjustment && (
                            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              Adjustment
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-muted-foreground mt-0.5">
                          {invMap[entry.itemId] ?? 0} in freezer
                        </div>
                        {entry.note && (
                          <div className="text-[13px] text-muted-foreground mt-0.5">
                            {entry.note}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className={`text-[22px] font-bold leading-none ${qtyColor}`}>
                          {qtyDisplay}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {formatTime(entry.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
