import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type Item = { id: number; name: string; slug: string; par: number | null };

type ScheduleEntry = { itemId: number; weekday: string; quantity: number };

// scheduleMap[weekday][itemId] = quantity
type ScheduleMap = Record<string, Record<number, number>>;

// ─── Weekday helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type Weekday = typeof WEEKDAYS[number];

function getTodayIdx(): number {
  return new Date().getDay();
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function QuotaSheet({
  item,
  weekday,
  existing,
  onClose,
  onSaved,
  onRemoved,
}: {
  item: Item;
  weekday: Weekday;
  existing: number | null;
  onClose: () => void;
  onSaved: (itemId: number, weekday: Weekday, quantity: number) => void;
  onRemoved: (itemId: number, weekday: Weekday) => void;
}) {
  const [count, setCount] = useState(existing ?? 1);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/production-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: item.id, weekday, quantity: count }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved(item.id, weekday, count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/production-schedule/${item.id}/${weekday}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove');
      onRemoved(item.id, weekday);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-card rounded-t-[16px] px-6 pt-6 pb-10 z-10 max-w-[430px] w-full mx-auto">
        <div className="w-9 h-1 bg-border rounded-full mx-auto mb-5" />

        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">
          {weekday}
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-6">{item.name}</h2>

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>
        )}

        {/* Count incrementer */}
        <div className="flex items-center justify-center gap-6 mb-7">
          <button
            onClick={() => setCount(c => Math.max(0, c - 1))}
            aria-label="Decrease"
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <div className="text-center w-20">
            <div className="text-5xl font-bold text-foreground leading-none">{count}</div>
            <div className="text-[13px] text-muted-foreground mt-1">to bake</div>
          </div>
          <button
            onClick={() => setCount(c => c + 1)}
            aria-label="Increase"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Remove (only when entry already exists) */}
        {existing !== null && (
          <div className="mt-5 pt-5 border-t border-border text-center">
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-60"
            >
              {removing ? 'Removing…' : 'Remove from schedule'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayIdx);
  const [sheet, setSheet] = useState<{ item: Item; existing: number | null } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, schedRes] = await Promise.all([
          fetch(`${API_URL}/items`, { credentials: 'include' }),
          fetch(`${API_URL}/production-schedule`, { credentials: 'include' }),
        ]);
        if (!itemsRes.ok) throw new Error('Failed to load items');
        if (!schedRes.ok) throw new Error('Failed to load schedule');

        const [itemsData, schedData]: [Item[], ScheduleEntry[]] = await Promise.all([
          itemsRes.json(),
          schedRes.json(),
        ]);

        setItems(itemsData);

        const map: ScheduleMap = {};
        for (const entry of schedData) {
          if (!map[entry.weekday]) map[entry.weekday] = {};
          map[entry.weekday][entry.itemId] = entry.quantity;
        }
        setScheduleMap(map);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSaved = (itemId: number, weekday: Weekday, quantity: number) => {
    setScheduleMap(prev => ({
      ...prev,
      [weekday]: { ...(prev[weekday] ?? {}), [itemId]: quantity },
    }));
    setSheet(null);
    showToast('Schedule updated');
  };

  const handleRemoved = (itemId: number, weekday: Weekday) => {
    setScheduleMap(prev => {
      const day = { ...(prev[weekday] ?? {}) };
      delete day[itemId];
      return { ...prev, [weekday]: day };
    });
    setSheet(null);
    showToast('Removed from schedule');
  };

  const selectedWeekday = WEEKDAYS[selectedDayIdx];
  const todayIdx = getTodayIdx();
  const dayQuotas = scheduleMap[selectedWeekday] ?? {};
  const scheduledCount = Object.keys(dayQuotas).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <div className="mb-3">
          <h1 className="text-[22px] font-bold text-foreground">Schedule</h1>
          {!loading && !fetchError && (
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {scheduledCount > 0
                ? `${scheduledCount} item${scheduledCount !== 1 ? 's' : ''} scheduled for ${WEEKDAYS[selectedDayIdx]}`
                : `Nothing scheduled for ${WEEKDAYS[selectedDayIdx]}`}
            </p>
          )}
        </div>

        {/* Day pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {WEEKDAYS.map((day, idx) => {
            const isSelected = idx === selectedDayIdx;
            const isToday = idx === todayIdx;
            return (
              <button
                key={day}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex flex-col items-center px-3 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border'
                }`}
              >
                <span>{WEEKDAY_SHORT[idx]}</span>
                {isToday && (
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Item list */}
      <main className="px-4 pt-3 pb-24 flex flex-col gap-2">
        {loading && (
          <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>
        )}
        {fetchError && (
          <p className="text-center text-destructive pt-12">{fetchError}</p>
        )}
        {!loading && !fetchError && items.length === 0 && (
          <p className="text-center text-muted-foreground pt-12">
            No items yet — add some from the Inventory tab.
          </p>
        )}
        {items.map(item => {
          const quota = dayQuotas[item.id] ?? null;
          return (
            <button
              key={item.id}
              onClick={() => setSheet({ item, existing: quota })}
              className="w-full bg-card border border-border rounded-[12px] px-4 py-3.5 flex justify-between items-center text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
            >
              <span className={`text-[17px] font-medium ${quota !== null ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.name}
              </span>
              <div className="shrink-0 ml-4 text-right">
                {quota !== null ? (
                  <span className="text-[22px] font-bold text-foreground leading-none">{quota}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </button>
          );
        })}
      </main>

      {/* Quota sheet */}
      {sheet && (
        <QuotaSheet
          item={sheet.item}
          weekday={selectedWeekday}
          existing={sheet.existing}
          onClose={() => setSheet(null)}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
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
