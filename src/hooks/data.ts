import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useCoop } from '../auth/CooperativeProvider';

/**
 * Hook de lecture scopé à la coopérative courante. La clé inclut l'id de coop
 * pour un cache correct au changement de coopérative.
 */
export function useCoopQuery<T>(
  key: (string | number | null | undefined)[],
  fn: (coopId: string) => Promise<T>,
  opts: { enabled?: boolean } = {},
) {
  const { current } = useCoop();
  const coopId = current?.id;
  return useQuery({
    queryKey: [coopId, ...key],
    queryFn: () => fn(coopId as string),
    enabled: !!coopId && (opts.enabled ?? true),
  });
}

/** Invalide toutes les requêtes de la coopérative courante. */
export function useInvalidate() {
  const qc = useQueryClient();
  const { current } = useCoop();
  return (...keys: string[]) => {
    if (keys.length === 0) {
      qc.invalidateQueries({ queryKey: [current?.id] });
    } else {
      keys.forEach((k) => qc.invalidateQueries({ queryKey: [current?.id, k] }));
    }
  };
}

export function useCoopMutation<TArgs, TResult>(
  fn: (coopId: string, args: TArgs) => Promise<TResult>,
  opts: { invalidate?: string[]; onSuccess?: (r: TResult) => void } = {},
) {
  const { current } = useCoop();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (args: TArgs) => fn(current!.id, args),
    onSuccess: (r) => {
      invalidate(...(opts.invalidate ?? []));
      opts.onSuccess?.(r);
    },
  });
}

export { supabase };
