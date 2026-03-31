import { useState, useEffect, useCallback } from 'react';
import { ModalShell } from '@/components/modal-shell';

const API_URL = import.meta.env.VITE_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

type Item = { id: number; name: string; slug: string; par: number | null };
type ScheduleEntry = { itemId: number; weekday: string; quantity: number };
type ScheduleMap = Record<string, Record<number, number>>;  // scheduleMap[weekday][itemId] = qty
type OverrideMap = Record<number, number>;                   // overrideMap[itemId] = qty

// ─── Weekday helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
type Weekday = typeof WEEKDAYS[number];

// Rotate WEEKDAYS so the bakery's first operating day comes first
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

function getUpcomingDates(): { label: string; dateStr: string; weekdayIdx: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateStr: toDateStr(d),
      weekdayIdx: d.getDay(),
    };
  });
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

// ─── Override sheet ───────────────────────────────────────────────────────────

function OverrideSheet({
  item,
  dateStr,
  dateLabel,
  templateQty,
  existingOverride,
  onClose,
  onSaved,
  onRemoved,
}: {
  item: Item;
  dateStr: string;
  dateLabel: string;
  templateQty: number | null;
  existingOverride: number | null;
  onClose: () => void;
  onSaved: (itemId: number, quantity: number) => void;
  onRemoved: (itemId: number) => void;
}) {
  const [count, setCount] = useState(existingOverride ?? templateQty ?? 1);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/production-schedule/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: item.id, date: dateStr, quantity: count }),
      });
      if (!res.ok) throw new Error('Failed to save override');
      onSaved(item.id, count);
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
      if (!res.ok) throw new Error('Failed to remove override');
      onRemoved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setRemoving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
        <p className="text-xs font-medium tracking-[0.06em] uppercase text-muted-foreground mb-1">
          Override · {dateLabel}
        </p>
        <h2 className="text-xl font-semibold text-foreground mb-1">{item.name}</h2>
        {templateQty !== null && (
          <p className="text-[13px] text-muted-foreground mb-6">
            Weekly template: {templateQty}
          </p>
        )}
        {!templateQty && <div className="mb-6" />}
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
            {saving ? 'Saving…' : 'Set Override'}
          </button>
        </div>
        {existingOverride !== null && (
          <div className="mt-5 pt-5 border-t border-border text-center">
            <button onClick={handleRemove} disabled={removing}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-60">
              {removing ? 'Removing…' : 'Remove override — use weekly template'}
            </button>
          </div>
        )}
    </ModalShell>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Mode = 'weekly' | 'override';

export default function SchedulePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>({});
  const [operatingDays, setOperatingDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [weekStart, setWeekStart] = useState<Weekday>('Sunday');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Weekly mode state
  const [selectedDayIdx, setSelectedDayIdx] = useState(getTodayIdx);
  const [weeklySheet, setWeeklySheet] = useState<{ item: Item; existing: number | null } | null>(null);

  // Override mode state
  const [mode, setMode] = useState<Mode>('weekly');
  const upcomingDates = getUpcomingDates();
  const filteredUpcomingDates = operatingDays.length === 0
    ? upcomingDates
    : upcomingDates.filter(d => operatingDays.includes(WEEKDAYS[d.weekdayIdx]));
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [overrideMap, setOverrideMap] = useState<OverrideMap>({});
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrideSheet, setOverrideSheet] = useState<{ item: Item; existingOverride: number | null } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

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

        if (settingsData.operatingDays.length > 0) {
          setOperatingDays(settingsData.operatingDays);
          setWeekStart(settingsData.operatingDays[0]);
          const todayName = WEEKDAYS[getTodayIdx()];
          if (!settingsData.operatingDays.includes(todayName)) {
            const firstOpIdx = WEEKDAYS.indexOf(settingsData.operatingDays[0]);
            if (firstOpIdx >= 0) setSelectedDayIdx(firstOpIdx);
          }
          // Snap override date selection to the first upcoming operating day
          const firstValidOverrideIdx = getUpcomingDates().findIndex(
            d => settingsData.operatingDays.includes(WEEKDAYS[d.weekdayIdx])
          );
          if (firstValidOverrideIdx >= 0) setSelectedDateIdx(firstValidOverrideIdx);
        }
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchOverrides = useCallback(async (dateStr: string) => {
    setOverridesLoading(true);
    try {
      const res = await fetch(`${API_URL}/production-schedule/overrides?date=${dateStr}`, { credentials: 'include' });
      if (!res.ok) return;
      const data: { itemId: number; quantity: number }[] = await res.json();
      const map: OverrideMap = {};
      for (const o of data) map[o.itemId] = o.quantity;
      setOverrideMap(map);
    } finally {
      setOverridesLoading(false);
    }
  }, []);

  // Fetch overrides whenever mode is override and selected date changes
  useEffect(() => {
    if (mode === 'override') {
      fetchOverrides(upcomingDates[selectedDateIdx].dateStr);
    }
  }, [mode, selectedDateIdx, fetchOverrides]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Weekly handlers
  const handleWeeklySaved = (itemId: number, weekday: Weekday, quantity: number) => {
    setScheduleMap(prev => ({ ...prev, [weekday]: { ...(prev[weekday] ?? {}), [itemId]: quantity } }));
    setWeeklySheet(null);
    showToast('Schedule updated');
  };

  const handleWeeklyRemoved = (itemId: number, weekday: Weekday) => {
    setScheduleMap(prev => {
      const day = { ...(prev[weekday] ?? {}) };
      delete day[itemId];
      return { ...prev, [weekday]: day };
    });
    setWeeklySheet(null);
    showToast('Removed from schedule');
  };

  // Override handlers
  const handleOverrideSaved = (itemId: number, quantity: number) => {
    setOverrideMap(prev => ({ ...prev, [itemId]: quantity }));
    setOverrideSheet(null);
    showToast('Override saved');
  };

  const handleOverrideRemoved = (itemId: number) => {
    setOverrideMap(prev => { const next = { ...prev }; delete next[itemId]; return next; });
    setOverrideSheet(null);
    showToast('Override removed');
  };

  const selectedWeekday = WEEKDAYS[selectedDayIdx];
  const todayIdx = getTodayIdx();
  const selectedDate = upcomingDates[selectedDateIdx];
  const overrideWeekday = WEEKDAYS[selectedDate.weekdayIdx];

  // What to show in the item list
  const weeklyDayQuotas = scheduleMap[selectedWeekday] ?? {};
  const overrideDayTemplate = scheduleMap[overrideWeekday] ?? {};
  const scheduledCount = mode === 'weekly'
    ? Object.keys(weeklyDayQuotas).length
    : Object.keys(overrideDayTemplate).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">Schedule</h1>
            {!loading && !fetchError && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {mode === 'weekly'
                  ? scheduledCount > 0
                    ? `${scheduledCount} item${scheduledCount !== 1 ? 's' : ''} on ${selectedWeekday}`
                    : `Nothing scheduled for ${selectedWeekday}`
                  : overridesLoading
                    ? 'Loading overrides…'
                    : `${Object.keys(overrideMap).length} override${Object.keys(overrideMap).length !== 1 ? 's' : ''} for ${selectedDate.label}`
                }
              </p>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-full border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setMode('weekly')}
              className={`px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                mode === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setMode('override')}
              className={`px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors ${
                mode === 'override' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Override
            </button>
          </div>
        </div>

        {/* Day / date pills */}
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
            : filteredUpcomingDates.map((d) => {
                const origIdx = upcomingDates.indexOf(d);
                const isSelected = origIdx === selectedDateIdx;
                const hasOverride = Object.keys(overrideMap).length > 0 && isSelected;
                return (
                  <button key={d.dateStr} onClick={() => setSelectedDateIdx(origIdx)}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-full border text-[13px] font-medium cursor-pointer transition-colors shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border'
                    }`}
                  >
                    <span>{d.label}</span>
                    {hasOverride && <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
                  </button>
                );
              })
          }
        </div>
      </header>

      {/* Item list */}
      <main className="px-4 pt-3 pb-24 flex flex-col gap-2">
        {loading && <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>}
        {fetchError && <p className="text-center text-destructive pt-12">{fetchError}</p>}
        {!loading && !fetchError && items.length === 0 && (
          <p className="text-center text-muted-foreground pt-12">No items yet — add some from the Inventory tab.</p>
        )}

        {mode === 'weekly'
          ? items.map(item => {
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
          : items.map(item => {
              const templateQty = overrideDayTemplate[item.id] ?? null;
              const overrideQty = overrideMap[item.id] ?? null;
              const hasOverride = overrideQty !== null;
              return (
                <button key={item.id}
                  onClick={() => setOverrideSheet({ item, existingOverride: overrideQty })}
                  className="w-full bg-card border border-border rounded-[12px] px-4 py-3.5 flex justify-between items-center text-left cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
                >
                  <div>
                    <div className="text-[17px] font-medium text-foreground">{item.name}</div>
                    {templateQty !== null && (
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        template: {templateQty}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    {hasOverride ? (
                      <>
                        <div className="text-[22px] font-bold text-foreground leading-none">{overrideQty}</div>
                        <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--status-below-par-text)' }}>override</div>
                      </>
                    ) : templateQty !== null ? (
                      <span className="text-[22px] font-bold text-muted-foreground leading-none">{templateQty}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </button>
              );
            })
        }
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

      {/* Override sheet */}
      {mode === 'override' && overrideSheet && (
        <OverrideSheet
          item={overrideSheet.item}
          dateStr={selectedDate.dateStr}
          dateLabel={selectedDate.label}
          templateQty={overrideDayTemplate[overrideSheet.item.id] ?? null}
          existingOverride={overrideSheet.existingOverride}
          onClose={() => setOverrideSheet(null)}
          onSaved={handleOverrideSaved}
          onRemoved={handleOverrideRemoved}
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
