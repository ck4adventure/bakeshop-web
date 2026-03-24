import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type BatchEntry = {
  id: number;
  itemId: number;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: { name: string; slug: string };
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

function groupByDay(entries: BatchEntry[]): { label: string; items: BatchEntry[] }[] {
  const groups: { label: string; items: BatchEntry[] }[] = [];
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

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch(`${API_URL}/batches`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load batch history');
        setBatches(await res.json());
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const groups = groupByDay(batches);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <h1 className="text-[22px] font-bold text-foreground">History</h1>
        {!loading && !fetchError && (
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {batches.length === 0 ? 'No batches logged yet' : `${batches.length} batch${batches.length !== 1 ? 'es' : ''} logged`}
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
        {!loading && !fetchError && batches.length === 0 && (
          <div className="text-center pt-16 text-muted-foreground text-sm">
            No batches yet — log one from the Inventory tab.
          </div>
        )}

        {groups.map(group => (
          <section key={group.label} className="mb-4">
            {/* Day header */}
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground px-1 py-2">
              {group.label}
            </h2>

            <div className="flex flex-col gap-2">
              {group.items.map(batch => (
                <div
                  key={batch.id}
                  className="bg-card border border-border rounded-[12px] px-4 py-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[17px] font-medium text-foreground">
                        {batch.product.name}
                      </div>
                      {batch.note && (
                        <div className="text-[13px] text-muted-foreground mt-0.5">
                          {batch.note}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-[22px] font-bold text-foreground leading-none">
                        +{batch.quantity}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatTime(batch.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
