import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

const API_URL = import.meta.env.VITE_API_URL as string;

type BakerySettings = {
  id: string;
  name: string;
  slug: string;
};

function NavRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-[12px] border border-border bg-card text-foreground cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)] transition-[transform,box-shadow] duration-150"
    >
      <span className="text-[17px] font-medium">{label}</span>
      <span className="text-muted-foreground text-lg">›</span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BakerySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/bakery/settings`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSettings(data); })
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-[22px] font-bold text-foreground leading-none">Settings</h1>
          {settings && (
            <p className="text-[13px] text-muted-foreground mt-0.5">{settings.name}</p>
          )}
        </div>
      </header>

      {!loading && (
        <main className="px-4 pt-5 pb-28 flex flex-col gap-8">
          <section>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Setup
            </p>
            <NavRow label="Operating Days" onClick={() => navigate('../operating-days')} />
          </section>
        </main>
      )}
    </div>
  );
}
