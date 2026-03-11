// Business layout — wraps all /:bakerySlug/* tab pages with a shared bottom nav

import { NavLink, Outlet, useParams } from "react-router";
import { useAuth } from "@/context/auth";

const TABS = [
  { label: "Today",     icon: "☀️",  path: "today"      },
  { label: "Inventory", icon: "📦",  path: "inventory"  },
  { label: "Batches",   icon: "🥐",  path: "batches"    },
  { label: "Schedule",  icon: "📅",  path: "schedule"   },
] as const;

const ADMIN_TAB = { label: "Settings", icon: "⚙️", path: "settings" } as const;

export default function BusinessLayout() {
  const { bakerySlug } = useParams();
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN';
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[430px] mx-auto pb-[64px]">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[64px] bg-card border-t border-border flex z-30">
        {tabs.map(tab => (
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
      </nav>
    </div>
  );
}
