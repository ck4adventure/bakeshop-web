// Business layout — fixed app header + sidebar (desktop/landscape) or bottom nav (mobile portrait)

import { NavLink, Outlet, useParams, useNavigate, useLocation } from "react-router";
import { Sun, Moon, LogOut, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/hooks/useTheme";

const TABS = [
  { label: "Today",     icon: "☀️",  path: "today"      },
  { label: "Schedule",  icon: "📅",  path: "schedule"   },
  { label: "Inventory", icon: "📦",  path: "inventory"  },
  { label: "History",   icon: "🥐",  path: "history"    },
] as const;

const ADMIN_TABS = [
  { label: "Manage Items", icon: "🗂️", path: "items"    },
  { label: "Settings",     icon: "⚙️",  path: "settings" },
] as const;

export default function BusinessLayout() {
  const { bakerySlug } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const sidebarTabs = canManage ? [...TABS, ...ADMIN_TABS] : TABS;
  const moreIsActive = ADMIN_TABS.some(t => location.pathname.includes(`/${t.path}`));

  // Close "More" menu on navigation
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await logout?.();
    navigate("/");
  };

  return (
    <div className="bg-background">

      {/* ── App header — always visible ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-40 flex items-center px-4 gap-3">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src="/coookies.png" alt="Bakeshop logo" className="h-6 w-6" />
          <span className="text-base font-semibold tracking-tight">Bakedown</span>
        </div>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ── Sidebar — desktop & landscape, below header ── */}
      <aside className="hidden md:flex landscape:flex flex-col w-56 fixed top-14 left-0 bottom-0 bg-card border-r border-border z-30">

        {/* Nav links */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {sidebarTabs.map(tab => (
            <NavLink
              key={tab.path}
              to={`/${bakerySlug}/${tab.path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sienna/10 text-sienna"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Username */}
        <div className="px-4 py-4 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground truncate">{user?.username}</p>
        </div>
      </aside>

      {/* ── Main scroll container — below header, beside sidebar ── */}
      <main className="fixed top-14 left-0 right-0 bottom-0 overflow-y-auto pb-16 md:pb-0 landscape:pb-0 md:left-56 landscape:left-56 z-[35]">
        <div>
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav — mobile portrait only ── */}
      <nav className="flex md:hidden landscape:hidden fixed bottom-0 left-0 w-full h-16 bg-card border-t border-border z-40">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={`/${bakerySlug}/${tab.path}`}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-sienna" : "text-muted-foreground"
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[11px]">{tab.label}</span>
          </NavLink>
        ))}

        {canManage && (
          <div className="flex-1 relative flex flex-col items-center justify-center">
            {/* More popover */}
            {moreOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMoreOpen(false)}
                />
                {/* Menu */}
                <div className="absolute bottom-full right-0 mb-1 bg-card border border-border rounded-lg shadow-lg w-44 py-1 z-50">
                  {ADMIN_TABS.map(tab => (
                    <NavLink
                      key={tab.path}
                      to={`/${bakerySlug}/${tab.path}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                          isActive ? "text-sienna" : "text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </NavLink>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setMoreOpen(o => !o)}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                moreIsActive || moreOpen ? "text-sienna" : "text-muted-foreground"
              }`}
            >
              <MoreHorizontal size={20} />
              <span className="text-[11px]">More</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
