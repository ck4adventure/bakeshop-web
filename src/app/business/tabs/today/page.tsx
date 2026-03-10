// TODO: Today tab — daily summary view (bake list, what's low, what to make)
import { useAuth } from '@/context/auth';
import { useNavigate } from 'react-router';

export default function TodayPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-5 pb-3 flex justify-between items-center">
        <h1 className="text-[22px] font-bold text-foreground">Today</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Log out
        </button>
      </header>
      <main className="flex flex-col items-center justify-center pt-24 text-muted-foreground text-sm">
        Coming soon
      </main>
    </div>
  );
}
