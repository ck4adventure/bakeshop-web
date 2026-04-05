import { useState, useEffect, useCallback, useRef } from 'react';
import { ModalShell } from '@/components/modal-shell';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type Item = { id: number; name: string; slug: string; par: number | null };
type ScheduleEntry = { itemId: number; weekday: string; quantity: number };
type ScheduleMap = Record<string, Record<number, number>>;  // scheduleMap[weekday][itemId] = qty
type OverrideEntry = { quantity: number; specialOrderQty: number };
type OverrideMap = Record<number, OverrideEntry>;           // itemId → { foh, special }
type AllOverrides = Record<string, OverrideMap>;            // dateStr → OverrideMap

// ─── Weekday helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type Weekday = typeof WEEKDAYS[number];

function getOrderedWeekdays(startDay: Weekday): Weekday[] {
  const startIdx = WEEKDAYS.indexOf(startDay);
  return [...WEEKDAYS.slice(startIdx), ...WEEKDAYS.slice(0, startIdx)] as Weekday[];
}

function getTodayIdx(): number {
  return new Date().getDay();
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getUpcomingDates(): { label: string; dateStr: string; weekdayIdx: number; isToday: boolean }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateStr: toDateStr(d),
      weekdayIdx: d.getDay(),
      isToday: i === 0,
    };
  });
}

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

function getTwoMonthsOutStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return toDateStr(d);
}

// ─── Weekly quota sheet ───────────────────────────────────────────────────────

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
    <ModalShell onClose={onClose}>
        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">{weekday}</p>
        <h2 className="text-xl font-semibold text-foreground mb-6">{item.name}</h2>
        {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>}
        <div className="flex items-center justify-center gap-6 mb-7">
          <button onClick={() => setCount(c => Math.max(0, c - 1))} aria-label="Decrease"
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center cursor-pointer">−</button>
          <div className="text-center w-20">
            <div className="text-5xl font-bold text-foreground leading-none">{count}</div>
            <div className="text-[13px] text-muted-foreground mt-1">to bake</div>
          </div>
          <button onClick={() => setCount(c => c + 1)} aria-label="Increase"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center cursor-pointer">+</button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {existing !== null && (
          <div className="mt-5 pt-5 border-t border-border text-center">
            <button onClick={handleRemove} disabled={removing}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-60">
              {removing ? 'Removing…' : 'Remove from schedule'}
            </button>
          </div>
        )}
    </ModalShell>
  );
}

// ─── Daily schedule sheet (FOH override + special orders) ─────────────────────

function DailySheet({
  item,
  dateStr,
  dateLabel,
  templateQty,
  existingEntry,
  locked,
  onClose,
  onSaved,
  onRemoved,
}: {
  item: Item;
  dateStr: string;
  dateLabel: string;
  templateQty: number | null;
  existingEntry: OverrideEntry | null;
  locked: boolean;
  onClose: () => void;
  onSaved: (itemId: number, quantity: number, specialOrderQty: number) => void;
  onRemoved: (itemId: number) => void;
}) {
  const [fohInput, setFohInput] = useState(String(existingEntry?.quantity ?? templateQty ?? 1));
  const [specialInput, setSpecialInput] = useState(String(existingEntry?.specialOrderQty ?? 0));
  const fohCount = Math.max(0, parseInt(fohInput, 10) || 0);
  const specialCount = Math.max(0, parseInt(specialInput, 10) || 0);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = fohCount + specialCount;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/production-schedule/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: item.id, date: dateStr, quantity: fohCount, specialOrderQty: specialCount }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved(item.id, fohCount, specialCount);
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
      const res = await fetch(`${API_URL}/production-schedule/overrides/${item.id}/${dateStr}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reset');
      onRemoved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setRemoving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">
          Daily Schedule · {dateLabel}
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-1">{item.name}</h2>
        {locked && (
          <p className="text-[13px] text-muted-foreground mb-4">Today's schedule is locked</p>
        )}
        {templateQty !== null && (
          <p className="text-[13px] text-muted-foreground mb-5">
            Weekly template: {templateQty}
          </p>
        )}
        {!templateQty && !locked && <div className="mb-5" />}
        {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg bg-destructive/10 text-destructive">{error}</p>}

        {/* FOH stepper */}
        <p className="text-[13px] font-semibold text-foreground mb-2 text-center">FOH</p>
        <div className="flex items-center justify-center gap-6 mb-5">
          <button onClick={() => setFohInput(String(Math.max(0, fohCount - 1)))} aria-label="Decrease FOH" disabled={locked}
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">−</button>
          <div className="text-center w-24">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={fohInput}
              disabled={locked}
              onChange={e => setFohInput(e.target.value)}
              onBlur={() => setFohInput(String(fohCount))}
              className="w-full text-5xl font-bold text-foreground text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
            />
            <div className="text-[13px] text-muted-foreground mt-1">FOH qty</div>
          </div>
          <button onClick={() => setFohInput(String(fohCount + 1))} aria-label="Increase FOH" disabled={locked}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">+</button>
        </div>

        {/* Special orders stepper */}
        <p className="text-[13px] font-semibold text-foreground mb-2 text-center">Special Orders</p>
        <div className="flex items-center justify-center gap-6 mb-5">
          <button onClick={() => setSpecialInput(String(Math.max(0, specialCount - 1)))} aria-label="Decrease special orders" disabled={locked}
            className="w-14 h-14 rounded-full border border-border bg-background text-2xl text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">−</button>
          <div className="text-center w-24">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={specialInput}
              disabled={locked}
              onChange={e => setSpecialInput(e.target.value)}
              onBlur={() => setSpecialInput(String(specialCount))}
              className="w-full text-5xl font-bold text-foreground text-center bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
            />
            <div className="text-[13px] text-muted-foreground mt-1">additive</div>
          </div>
          <button onClick={() => setSpecialInput(String(specialCount + 1))} aria-label="Increase special orders" disabled={locked}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">+</button>
        </div>

        {/* Breakdown line */}
        {specialCount > 0 && (
          <p className="text-center text-[13px] text-muted-foreground mb-5">
            {fohCount} FOH + {specialCount} special ={' '}
            <span className="font-semibold text-foreground">{total} total</span>
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-14 rounded-full border border-border bg-transparent text-foreground text-[15px] font-medium cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={saving || locked} className="flex-[2] h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {existingEntry !== null && !locked && (
          <div className="mt-5 pt-5 border-t border-border text-center">
            <button onClick={handleRemove} disabled={removing}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-60">
              {removing ? 'Resetting…' : 'Reset to weekly template'}
            </button>
          </div>
        )}
    </ModalShell>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Mode = 'summary' | 'weekly';

export default function SchedulePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>({});
  const [operatingDays, setOperatingDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [weekStart, setWeekStart] = useState<Weekday>('Sunday');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Summary mode state
  const [mode, setMode] = useState<Mode>('summary');
  const [allOverrides, setAllOverrides] = useState<AllOverrides>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Override sheet state
  const [dailySheet, setDailySheet] = useState<{
    item: Item;
    dateStr: string;
    dateLabel: string;
    isToday: boolean;
    existingEntry: OverrideEntry | null;
  } | null>(null);

  // Weekly mode state
  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayIdx);
  const [weeklySheet, setWeeklySheet] = useState<{ item: Item; existing: number | null } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const upcomingDates = getUpcomingDates();
  const filteredUpcomingDates = operatingDays.length === 0
    ? upcomingDates
    : upcomingDates.filter(d => operatingDays.includes(WEEKDAYS[d.weekdayIdx]));

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchOverridesForDate = useCallback(async (dateStr: string) => {
    try {
      const res = await fetch(`${API_URL}/production-schedule/overrides?date=${dateStr}`, { credentials: 'include' });
      if (!res.ok) return;
      const data: { itemId: number; quantity: number; specialOrderQty: number }[] = await res.json();
      const map: OverrideMap = {};
      for (const o of data) map[o.itemId] = { quantity: o.quantity, specialOrderQty: o.specialOrderQty ?? 0 };
      setAllOverrides(prev => ({ ...prev, [dateStr]: map }));
    } catch {
      // silently ignore — overrides just won't show
    }
  }, []);

  const fetchAllUpcomingOverrides = useCallback(async (dates: string[]) => {
    setSummaryLoading(true);
    try {
      const results = await Promise.all(
        dates.map(d =>
          fetch(`${API_URL}/production-schedule/overrides?date=${d}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
        )
      );
      const map: AllOverrides = {};
      dates.forEach((d, i) => {
        const entry: OverrideMap = {};
        for (const o of results[i]) {
          entry[o.itemId] = { quantity: o.quantity, specialOrderQty: o.specialOrderQty ?? 0 };
        }
        map[d] = entry;
      });
      setAllOverrides(map);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, schedRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/items`, { credentials: 'include' }),
          fetch(`${API_URL}/production-schedule`, { credentials: 'include' }),
          fetch(`${API_URL}/bakery/settings`, { credentials: 'include' }),
        ]);
        if (!itemsRes.ok) throw new Error('Failed to load items');
        if (!schedRes.ok) throw new Error('Failed to load schedule');

        const [itemsData, schedData, settingsData]: [Item[], ScheduleEntry[], { operatingDays: Weekday[] }] = await Promise.all([
          itemsRes.json(),
          schedRes.json(),
          settingsRes.ok ? settingsRes.json() : Promise.resolve({ operatingDays: [] }),
        ]);

        setItems(itemsData);

        const map: ScheduleMap = {};
        for (const entry of schedData) {
          if (!map[entry.weekday]) map[entry.weekday] = {};
          map[entry.weekday][entry.itemId] = entry.quantity;
        }
        setScheduleMap(map);

        let upcomingOpDates = upcomingDates;
        if (settingsData.operatingDays.length > 0) {
          setOperatingDays(settingsData.operatingDays);
          setWeekStart(settingsData.operatingDays[0]);
          const todayName = WEEKDAYS[getTodayIdx()];
          if (!settingsData.operatingDays.includes(todayName)) {
            const firstOpIdx = WEEKDAYS.indexOf(settingsData.operatingDays[0]);
            if (firstOpIdx >= 0) setSelectedDayIdx(firstOpIdx);
          }
          upcomingOpDates = upcomingDates.filter(d => settingsData.operatingDays.includes(WEEKDAYS[d.weekdayIdx]));
        }

        // Batch-fetch overrides for all upcoming operating days
        fetchAllUpcomingOverrides(upcomingOpDates.map(d => d.dateStr));
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleWeeklySaved = (itemId: number, weekday: Weekday, quantity: number) => {
    setScheduleMap(prev => ({ ...prev, [weekday]: { ...(prev[weekday] ?? {}), [itemId]: quantity } }));
    setWeeklySheet(null);
    setMode('summary');
    showToast('Schedule updated');
  };

  const handleWeeklyRemoved = (itemId: number, weekday: Weekday) => {
    setScheduleMap(prev => {
      const day = { ...(prev[weekday] ?? {}) };
      delete day[itemId];
      return { ...prev, [weekday]: day };
    });
    setWeeklySheet(null);
    setMode('summary');
    showToast('Removed from schedule');
  };

  const handleDailySaved = (dateStr: string, itemId: number, quantity: number, specialOrderQty: number) => {
    setAllOverrides(prev => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] ?? {}), [itemId]: { quantity, specialOrderQty } },
    }));
    setDailySheet(null);
    showToast('Saved');
  };

  const handleDailyRemoved = (dateStr: string, itemId: number) => {
    setAllOverrides(prev => {
      const day = { ...(prev[dateStr] ?? {}) };
      delete day[itemId];
      return { ...prev, [dateStr]: day };
    });
    setDailySheet(null);
    showToast('Reset to weekly template');
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedWeekday = WEEKDAYS[selectedDayIdx];
  const todayIdx = getTodayIdx();
  const weeklyDayQuotas = scheduleMap[selectedWeekday] ?? {};

  // Dates to show in summary: upcoming operating days + focusedDate if set
  const summaryDates = [
    ...filteredUpcomingDates,
    ...(focusedDate && !filteredUpcomingDates.find(d => d.dateStr === focusedDate)
      ? [{ label: focusedDate, dateStr: focusedDate, weekdayIdx: new Date(focusedDate + 'T00:00:00').getDay(), isToday: false }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Schedule</h1>
            {!loading && !fetchError && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {mode === 'summary'
                  ? summaryLoading
                    ? 'Loading…'
                    : `Next ${filteredUpcomingDates.length} operating days`
                  : `${Object.keys(weeklyDayQuotas).length} item${Object.keys(weeklyDayQuotas).length !== 1 ? 's' : ''} on ${selectedWeekday}`
                }
              </p>
            )}
          </div>

          {/* Mode toggle */}
          <button
            onClick={() => setMode(m => m === 'weekly' ? 'summary' : 'weekly')}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full border cursor-pointer transition-colors shrink-0 ${
              mode === 'weekly'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {mode === 'weekly' ? '← Summary' : 'Weekly template'}
          </button>
        </div>

        {/* Pill row */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {mode === 'weekly'
            ? getOrderedWeekdays(weekStart).map((day) => {
                if (!operatingDays.includes(day)) return null;
                const idx = WEEKDAYS.indexOf(day);
                const isSelected = idx === selectedDayIdx;
                const isToday = idx === todayIdx;
                return (
                  <button key={day} onClick={() => setSelectedDayIdx(idx)}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border'
                    }`}
                  >
                    <span>{WEEKDAY_SHORT[idx]}</span>
                    {isToday && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                  </button>
                );
              })
            : (
              <>
                {filteredUpcomingDates.map((d) => {
                  const dateOverrides = allOverrides[d.dateStr] ?? {};
                  const hasChanges = Object.keys(dateOverrides).length > 0;
                  return (
                    <button
                      key={d.dateStr}
                      onClick={() => {
                        document.getElementById(`day-${d.dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`flex flex-col items-center px-3 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors shrink-0 ${
                        d.isToday ? 'bg-transparent text-muted-foreground border-border opacity-60' : 'bg-transparent text-muted-foreground border-border'
                      }`}
                    >
                      <span>{d.isToday ? `🔒 ${d.label}` : d.label}</span>
                      {hasChanges && <span className="w-1 h-1 rounded-full mt-0.5 bg-primary" />}
                    </button>
                  );
                })}

                {/* Calendar picker button */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => {
                      setShowDatePicker(p => !p);
                      setTimeout(() => datePickerRef.current?.showPicker?.(), 50);
                    }}
                    className="px-3 py-1.5 rounded-full border border-border text-[13px] text-muted-foreground cursor-pointer transition-colors"
                    aria-label="Pick a date"
                  >
                    📅
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    min={getTomorrowStr()}
                    max={getTwoMonthsOutStr()}
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) return;
                      setFocusedDate(val);
                      fetchOverridesForDate(val);
                      setShowDatePicker(false);
                      setTimeout(() => document.getElementById(`day-${val}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
                    }}
                  />
                </div>

                {/* Focused date pill (if set) */}
                {focusedDate && !filteredUpcomingDates.find(d => d.dateStr === focusedDate) && (
                  <button
                    onClick={() => setFocusedDate(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary bg-primary/10 text-[13px] font-medium text-primary cursor-pointer shrink-0"
                  >
                    {new Date(focusedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-[11px]">×</span>
                  </button>
                )}
              </>
            )
          }
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pt-3 pb-24 flex flex-col gap-5">
        {loading && <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>}
        {fetchError && <p className="text-center text-destructive pt-12">{fetchError}</p>}
        {!loading && !fetchError && items.length === 0 && (
          <p className="text-center text-muted-foreground pt-12">No items yet — add some from the Inventory tab.</p>
        )}

        {!loading && !fetchError && mode === 'weekly' && (
          items.map(item => {
            const quota = weeklyDayQuotas[item.id] ?? null;
            return (
              <button key={item.id} onClick={() => setWeeklySheet({ item, existing: quota })}
                className="w-full bg-card border border-border rounded-[12px] px-4 py-3.5 flex justify-between items-center text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
              >
                <span className={`text-[17px] font-medium ${quota !== null ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.name}
                </span>
                <div className="shrink-0 ml-4 text-right">
                  {quota !== null
                    ? <span className="text-[22px] font-bold text-foreground leading-none">{quota}</span>
                    : <span className="text-sm text-muted-foreground">—</span>
                  }
                </div>
              </button>
            );
          })
        )}

        {!loading && !fetchError && mode === 'summary' && (
          summaryDates.map(d => {
            const weekday = WEEKDAYS[d.weekdayIdx];
            const dayTemplate = scheduleMap[weekday] ?? {};
            const dayOverrides = allOverrides[d.dateStr] ?? {};
            const scheduledItems = items.filter(item => dayTemplate[item.id] !== undefined);

            return (
              <section key={d.dateStr} id={`day-${d.dateStr}`}>
                <div className="flex justify-between items-baseline mb-2">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatSectionDate(d.dateStr)}
                  </h2>
                  {d.isToday && (
                    <span className="text-[11px] text-muted-foreground">🔒 locked</span>
                  )}
                </div>

                {scheduledItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">Nothing scheduled</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {scheduledItems.map(item => {
                      const templateQty = dayTemplate[item.id];
                      const override = dayOverrides[item.id] ?? null;
                      const fohQty = override?.quantity ?? templateQty;
                      const specialQty = override?.specialOrderQty ?? 0;
                      const total = fohQty + specialQty;
                      const hasFohOverride = override !== null && override.quantity !== templateQty;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setDailySheet({
                            item,
                            dateStr: d.dateStr,
                            dateLabel: d.label,
                            isToday: d.isToday,
                            existingEntry: override,
                          })}
                          className="w-full bg-card border border-border rounded-[12px] px-4 py-3.5 flex justify-between items-center text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
                        >
                          <div>
                            <div className="text-[17px] font-medium text-foreground">{item.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {hasFohOverride && (
                                <span className="text-[12px] text-muted-foreground">template: {templateQty}</span>
                              )}
                              {specialQty > 0 && (
                                <span
                                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--status-below-par-bg)', color: 'var(--status-below-par-text)' }}
                                >
                                  +{specialQty} special
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 ml-4 text-right">
                            <div className="text-[22px] font-bold text-foreground leading-none">{total}</div>
                            {hasFohOverride && (
                              <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--status-below-par-text)' }}>
                                FOH override
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>

      {/* Weekly sheet */}
      {mode === 'weekly' && weeklySheet && (
        <QuotaSheet
          item={weeklySheet.item}
          weekday={selectedWeekday}
          existing={weeklySheet.existing}
          onClose={() => setWeeklySheet(null)}
          onSaved={handleWeeklySaved}
          onRemoved={handleWeeklyRemoved}
        />
      )}

      {/* Daily sheet */}
      {dailySheet && (
        <DailySheet
          item={dailySheet.item}
          dateStr={dailySheet.dateStr}
          dateLabel={dailySheet.dateLabel}
          templateQty={scheduleMap[WEEKDAYS[new Date(dailySheet.dateStr + 'T00:00:00').getDay()]]?.[dailySheet.item.id] ?? null}
          existingEntry={dailySheet.existingEntry}
          locked={dailySheet.isToday}
          onClose={() => setDailySheet(null)}
          onSaved={(itemId, quantity, specialOrderQty) => handleDailySaved(dailySheet.dateStr, itemId, quantity, specialOrderQty)}
          onRemoved={(itemId) => handleDailyRemoved(dailySheet.dateStr, itemId)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div role="status" aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium z-40 shadow-lg whitespace-nowrap">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
