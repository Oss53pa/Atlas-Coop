import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !key) {
  throw new Error(
    'Variables Supabase manquantes : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env',
  );
}

/**
 * Client Supabase typé. `service_role` n'est JAMAIS utilisé côté client (CDC §3) :
 * toute opération privilégiée passe par une Edge Function. RLS multitenant par
 * `cooperative_id` sur toutes les tables `coop_*`.
 */
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: { schema: 'public' },
});
