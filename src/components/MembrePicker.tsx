import { useState, useMemo } from 'react';
import { Search, Check, User } from 'lucide-react';
import { useCoopQuery, supabase } from '../hooks/data';
import { Input, Avatar, Spinner } from '../ui';
import { cn } from '../lib/cn';

interface MiniMembre { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null; statut: string }

export function MembrePicker({
  value, onChange, onlyActive = true,
}: {
  value: string | null;
  onChange: (m: MiniMembre) => void;
  onlyActive?: boolean;
}) {
  const [q, setQ] = useState('');
  const { data: membres, isLoading } = useCoopQuery(['membres-mini'], async (coopId) => {
    let query = supabase.from('coop_membres')
      .select('id, numero, nom, prenoms, telephone, photo_url, statut')
      .eq('cooperative_id', coopId).order('nom');
    if (onlyActive) query = query.in('statut', ['actif', 'probatoire']);
    const { data } = await query;
    return (data ?? []) as MiniMembre[];
  });

  const filtered = useMemo(() => {
    const list = membres ?? [];
    if (!q.trim()) return list.slice(0, 40);
    const s = q.toLowerCase();
    return list.filter((m) =>
      `${m.nom} ${m.prenoms ?? ''}`.toLowerCase().includes(s) ||
      m.numero.toLowerCase().includes(s) ||
      (m.telephone ?? '').includes(s),
    ).slice(0, 40);
  }, [membres, q]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texte-2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un membre…" className="pl-9" />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg border border-ligne">
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-8 text-sm text-texte-2">
            <User className="h-6 w-6" /> Aucun membre
          </div>
        ) : (
          filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-ligne/60 px-3 py-2 text-left last:border-0 hover:bg-surface-2',
                value === m.id && 'bg-primaire/5',
              )}
            >
              <Avatar name={`${m.nom} ${m.prenoms ?? ''}`} src={m.photo_url} size="sm" />
              <div className="flex-1">
                <div className="text-sm font-medium text-texte">{m.nom} {m.prenoms}</div>
                <div className="mono text-xs text-texte-2">{m.numero}{m.telephone ? ` · ${m.telephone}` : ''}</div>
              </div>
              {value === m.id && <Check className="h-4 w-4 text-action" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
