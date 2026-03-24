import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const API_URL = import.meta.env.VITE_API_URL as string;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type Weekday = typeof WEEKDAYS[number];

export default function OperatingDaysPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<Weekday>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/bakery/settings`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load settings');
        return r.json();
      })
      .then(data => setSelected(new Set(data.operatingDays)))
      .catch(err => setFetchError(err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (day: Weekday) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/bakery/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ operatingDays: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? 'Save failed');
      }
      navigate(-1);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Something went wrong');
      setTimeout(() => setToast(null), 2800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer text-lg"
        >
          ←
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-foreground leading-none">Operating Days</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Days your bakery is open</p>
        </div>
      </header>

      <main className="px-4 pt-5 pb-28">
        {loading && <p className="text-center text-muted-foreground pt-12" role="status">Loading…</p>}
        {fetchError && <p className="text-center text-destructive pt-12">{fetchError}</p>}

        {!loading && !fetchError && (
          <>
            <p className="text-[13px] text-muted-foreground mb-4">
              The schedule tab will only show these days for quota-setting.
            </p>
            <div className="flex flex-col gap-2">
              {WEEKDAYS.map(day => {
                const isOn = selected.has(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggle(day)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[12px] border transition-colors cursor-pointer ${
                      isOn ? 'bg-primary/10 border-primary text-foreground' : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    <span className={`text-[17px] font-medium ${isOn ? 'text-foreground' : ''}`}>{day}</span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isOn ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isOn && <span className="text-primary-foreground text-[11px] font-bold leading-none">✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 w-full h-14 rounded-full bg-primary text-primary-foreground text-[15px] font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        )}
      </main>

      {toast && (
        <div role="status" aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium z-40 shadow-lg whitespace-nowrap"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
