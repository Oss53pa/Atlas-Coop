import { useEffect, useState, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight, LogOut, Menu, X, Check, Building2 } from 'lucide-react';
import { NAV } from './navigation';
import { useAuth } from '../auth/AuthProvider';
import { useCoop } from '../auth/CooperativeProvider';
import { Avatar, Spinner } from '../ui';
import { cn } from '../lib/cn';

const PANEL_PREF_KEY = 'atlas-coop-sidebar-panel-open';

/** Groupe contenant l'item dont la route correspond au chemin courant. */
function groupForPath(pathname: string): string | undefined {
  return NAV.find((g) =>
    g.items.some((it) => pathname === it.to || pathname.startsWith(it.to + '/')),
  )?.title;
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(() => localStorage.getItem(PANEL_PREF_KEY) !== 'ferme');
  const location = useLocation();
  const { hasRole } = useCoop();
  const [selectedGroup, setSelectedGroup] = useState(() => groupForPath(location.pathname) ?? NAV[0]?.title);

  useEffect(() => {
    const g = groupForPath(location.pathname);
    if (g) setSelectedGroup(g);
  }, [location.pathname]);

  const togglePanel = () => {
    setPanelOpen((v) => {
      const next = !v;
      localStorage.setItem(PANEL_PREF_KEY, next ? 'ouvert' : 'ferme');
      return next;
    });
  };

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((it) => !it.roles || hasRole(...it.roles)) }))
    .filter((g) => g.items.length > 0);
  const activeGroup = groups.find((g) => g.title === selectedGroup) ?? groups[0];

  return (
    <div className="flex min-h-screen bg-fond">
      {/* Sidebar desktop — rail d'icônes + panneau rétractable */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 hidden lg:flex',
          panelOpen ? 'w-[19rem]' : 'w-16',
        )}
      >
        {/* Rail — toujours visible, un icône par groupe */}
        <div className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-ligne bg-surface py-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primaire/10 font-display text-xl text-primaire">
            A
          </div>
          {groups.map((g) => (
            <button
              key={g.title}
              onClick={() => { setSelectedGroup(g.title); if (!panelOpen) togglePanel(); }}
              title={g.title}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                activeGroup?.title === g.title
                  ? 'bg-primaire/10 text-primaire'
                  : 'text-texte-2 hover:bg-surface-2 hover:text-texte',
              )}
            >
              <g.icon className="h-5 w-5" />
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={togglePanel}
            title={panelOpen ? 'Réduire le menu' : 'Étendre le menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-texte-2 hover:bg-surface-2 hover:text-texte"
          >
            {panelOpen ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Panneau — items du groupe sélectionné, masquable */}
        {panelOpen && (
          <div className="flex w-[15rem] shrink-0 flex-col border-r border-ligne bg-surface">
            <div className="flex h-16 items-center gap-2 border-b border-ligne px-5">
              <span className="font-display text-2xl text-primaire">Atlas Coop</span>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-texte-2">
                {activeGroup?.title}
              </div>
              {activeGroup?.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
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
            </nav>
          </div>
        )}
      </aside>

      {/* Sidebar mobile — liste complète, comme avant */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-primaire/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-ligne bg-surface">
            <div className="flex h-16 items-center gap-2 border-b border-ligne px-5">
              <span className="font-display text-2xl text-primaire">Atlas Coop</span>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {groups.map((g) => (
                <div key={g.title} className="mb-5">
                  <div className="mb-1.5 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-texte-2">
                    <g.icon className="h-3.5 w-3.5" /> {g.title}
                  </div>
                  {g.items.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      onClick={() => setMobileOpen(false)}
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
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className={cn('flex flex-1 flex-col transition-[padding] duration-150', panelOpen ? 'lg:pl-[19rem]' : 'lg:pl-16')}>
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
