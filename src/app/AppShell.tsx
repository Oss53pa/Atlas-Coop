import { useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X, Check, Building2 } from 'lucide-react';
import { NAV } from './navigation';
import { useAuth } from '../auth/AuthProvider';
import { useCoop } from '../auth/CooperativeProvider';
import { Avatar, Spinner } from '../ui';
import { cn } from '../lib/cn';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { hasRole } = useCoop();

  return (
    <div className="flex min-h-screen bg-fond">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ligne bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-primaire/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-ligne bg-surface">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:pl-64">
        <Topbar onMenu={() => setMobileOpen((v) => !v)} mobileOpen={mobileOpen} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={location.pathname} className="mx-auto max-w-7xl animate-fade-in">
            <Suspense fallback={<Spinner label="Chargement du module…" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );

  function SidebarContent({ onNavigate }: { onNavigate?: () => void } = {}) {
    return (
      <>
        <div className="flex h-16 items-center gap-2 border-b border-ligne px-5">
          <span className="font-display text-2xl text-primaire">Atlas Coop</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => {
            const items = group.items.filter((it) => !it.roles || hasRole(...it.roles));
            if (!items.length) return null;
            return (
              <div key={group.title} className="mb-5">
                <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-texte-2">
                  {group.title}
                </div>
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primaire/10 text-primaire'
                          : 'text-texte-2 hover:bg-surface-2 hover:text-texte',
                      )
                    }
                  >
                    <it.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.phase && it.phase > 1 && (
                      <span className="rounded bg-desactive-fond px-1 text-[10px] text-texte-2">
                        P{it.phase}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </>
    );
  }
}

function Topbar({ onMenu, mobileOpen }: { onMenu: () => void; mobileOpen: boolean }) {
  const { user, signOut } = useAuth();
  const { current, cooperatives, setCurrent } = useCoop();
  const [coopMenu, setCoopMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ligne bg-surface/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenu} className="rounded-lg p-2 text-texte-2 hover:bg-surface-2 lg:hidden">
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sélecteur de coopérative */}
      <div className="relative">
        <button
          onClick={() => setCoopMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-ligne bg-surface-2 px-3 py-1.5 text-sm font-medium text-texte hover:bg-desactive-fond"
        >
          <Building2 className="h-4 w-4 text-primaire" />
          <span className="max-w-[160px] truncate">{current?.nom ?? 'Coopérative'}</span>
          <ChevronDown className="h-4 w-4 text-texte-2" />
        </button>
        {coopMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCoopMenu(false)} />
            <div className="absolute left-0 z-20 mt-1 w-64 rounded-xl border border-ligne bg-surface p-1 shadow-carte-hover">
              {cooperatives.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCurrent(c.id);
                    setCoopMenu(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="truncate">{c.nom}</span>
                  {current?.id === c.id && <Check className="h-4 w-4 text-action" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Menu utilisateur */}
      <div className="relative">
        <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-2">
          <Avatar name={(user?.user_metadata?.full_name as string) ?? user?.email} size="sm" />
        </button>
        {userMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-ligne bg-surface p-1 shadow-carte-hover">
              <div className="px-3 py-2">
                <div className="truncate text-sm font-medium text-texte">
                  {(user?.user_metadata?.full_name as string) ?? 'Utilisateur'}
                </div>
                <div className="truncate text-xs text-texte-2">{user?.email}</div>
              </div>
              <div className="my-1 border-t border-ligne" />
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-alerte hover:bg-alerte/10"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
