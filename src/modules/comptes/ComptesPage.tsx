import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useCoopQuery, supabase } from '../../hooks/data';
import {
  PageHeader, Card, Stat, Money, Input, Spinner, EmptyState, Avatar,
  Table, THead, TBody, Th, Tr, Td,
} from '../../ui';

interface CompteRow {
  id: string; solde_xof: number;
  coop_membres: { id: string; nom: string; prenoms: string | null; numero: string; photo_url: string | null; telephone: string | null } | null;
}

export function ComptesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'tous' | 'crediteur' | 'debiteur'>('tous');

  const { data, isLoading } = useCoopQuery(['comptes'], async (coopId) => {
    const { data } = await supabase
      .from('coop_comptes_membres')
      .select('id, solde_xof, coop_membres(id, nom, prenoms, numero, photo_url, telephone)')
      .eq('cooperative_id', coopId)
      .order('solde_xof', { ascending: false });
    return (data ?? []) as unknown as CompteRow[];
  });

  const totals = useMemo(() => {
    const c = (data ?? []).filter((r) => r.solde_xof > 0).reduce((s, r) => s + r.solde_xof, 0);
    const d = (data ?? []).filter((r) => r.solde_xof < 0).reduce((s, r) => s + r.solde_xof, 0);
    return { crediteur: c, debiteur: Math.abs(d), net: c + d };
  }, [data]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (filter === 'crediteur') list = list.filter((r) => r.solde_xof > 0);
    if (filter === 'debiteur') list = list.filter((r) => r.solde_xof < 0);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((r) => r.coop_membres && (`${r.coop_membres.nom} ${r.coop_membres.prenoms ?? ''}`.toLowerCase().includes(s) || r.coop_membres.numero.toLowerCase().includes(s)));
    }
    return list;
  }, [data, filter, q]);

  return (
    <>
      <PageHeader
        title="Comptes membres"
        subtitle="Grand livre consolidé par membre. Aucun chiffre orphelin (P1)."
        icon={<Wallet className="h-5 w-5" />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="À payer aux membres" value={<Money value={totals.crediteur} suffix={false} size="xl" />} hint="Soldes créditeurs" tone="primaire" icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Encours crédits/avances" value={<Money value={totals.debiteur} suffix={false} size="xl" />} hint="Soldes débiteurs" tone="alerte" icon={<TrendingDown className="h-4 w-4" />} />
        <Stat label="Position nette" value={<Money value={totals.net} suffix={false} size="xl" colorNegative />} hint="Créditeurs − débiteurs" tone="action" icon={<Wallet className="h-4 w-4" />} />
      </div>

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texte-2" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un membre…" className="pl-9" />
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {(['tous', 'crediteur', 'debiteur'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${filter === f ? 'bg-surface text-primaire shadow-sm' : 'text-texte-2'}`}>{f}</button>
            ))}
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner /> : !filtered.length ? (
        <EmptyState icon={<Wallet className="h-8 w-8" />} title="Aucun compte" description="Les comptes s'ouvrent automatiquement au premier mouvement d'un membre." />
      ) : (
        <Card>
          <Table>
            <THead><Th>Membre</Th><Th>Matricule</Th><Th align="right">Solde</Th></THead>
            <TBody>
              {filtered.map((r) => r.coop_membres && (
                <Tr key={r.id} onClick={() => navigate(`/membres/${r.coop_membres!.id}`)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${r.coop_membres.nom} ${r.coop_membres.prenoms ?? ''}`} src={r.coop_membres.photo_url} size="sm" />
                      <span className="font-medium text-texte">{r.coop_membres.nom} {r.coop_membres.prenoms}</span>
                    </div>
                  </Td>
                  <Td><span className="mono text-xs">{r.coop_membres.numero}</span></Td>
                  <Td align="right"><Money value={r.solde_xof} colorNegative size="sm" /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
