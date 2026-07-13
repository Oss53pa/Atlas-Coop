import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import type { CoopCooperative, CoopRole } from '../domain/database.types';

const LS_KEY = 'atlas_coop_current';

interface CoopState {
  cooperatives: CoopCooperative[];
  current: CoopCooperative | null;
  roles: CoopRole[];
  loading: boolean;
  setCurrent: (id: string) => void;
  hasRole: (...roles: CoopRole[]) => boolean;
  refresh: () => Promise<void>;
}

const CoopCtx = createContext<CoopState>({
  cooperatives: [],
  current: null,
  roles: [],
  loading: true,
  setCurrent: () => {},
  hasRole: () => false,
  refresh: async () => {},
});

export function CooperativeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cooperatives, setCooperatives] = useState<CoopCooperative[]>([]);
  const [rolesByCoop, setRolesByCoop] = useState<Record<string, CoopRole[]>>({});
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(LS_KEY));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCooperatives([]);
      setRolesByCoop({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: roles } = await supabase
      .from('coop_user_roles')
      .select('cooperative_id, role, coop_cooperatives(*)')
      .eq('user_id', user.id)
      .eq('actif', true);

    const coops = new Map<string, CoopCooperative>();
    const rmap: Record<string, CoopRole[]> = {};
    (roles ?? []).forEach((r: Record<string, unknown>) => {
      const coop = r.coop_cooperatives as CoopCooperative | null;
      if (coop) coops.set(coop.id, coop);
      const cid = r.cooperative_id as string;
      (rmap[cid] ??= []).push(r.role as CoopRole);
    });
    const list = [...coops.values()].sort((a, b) => a.nom.localeCompare(b.nom));
    setCooperatives(list);
    setRolesByCoop(rmap);
    setCurrentId((prev) => (prev && coops.has(prev) ? prev : (list[0]?.id ?? null)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setCurrent = (id: string) => {
    setCurrentId(id);
    localStorage.setItem(LS_KEY, id);
  };

  const current = cooperatives.find((c) => c.id === currentId) ?? null;
  const roles = current ? (rolesByCoop[current.id] ?? []) : [];
  const hasRole = (...want: CoopRole[]) =>
    roles.includes('admin') || want.some((r) => roles.includes(r));

  return (
    <CoopCtx.Provider
      value={{ cooperatives, current, roles, loading, setCurrent, hasRole, refresh: load }}
    >
      {children}
    </CoopCtx.Provider>
  );
}

export const useCoop = () => useContext(CoopCtx);

/** Raccourci : l'id de la coopérative courante (lève si absent). */
export function useCoopId(): string {
  const { current } = useCoop();
  if (!current) throw new Error('Aucune coopérative sélectionnée');
  return current.id;
}
