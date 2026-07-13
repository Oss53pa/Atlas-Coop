import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, UserPlus } from 'lucide-react';
import { useCoopQuery, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, Money, Badge, Tabs, Input, Spinner, EmptyState, Avatar,
  Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { STATUT_MEMBRE, CATEGORIE_MEMBRE } from '../../domain/labels';
import type { MembreStatut, CategorieMembre } from '../../domain/database.types';
import { MembreForm } from './MembreForm';

interface MembreRow {
  id: string; numero: string; nom: string; prenoms: string | null; statut: MembreStatut;
  telephone: string | null; village: string | null; photo_url: string | null;
  coop_comptes_membres: { solde_xof: number }[] | { solde_xof: number } | null;
  coop_membres_categories: { categorie: CategorieMembre }[];
}

export function MembresPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<MembreStatut | 'tous'>('tous');

  const { data: membres, isLoading } = useCoopQuery(['membres'], async (coopId) => {
    const { data } = await supabase
      .from('coop_membres')
      .select('id, numero, nom, prenoms, statut, telephone, village, photo_url, coop_comptes_membres(solde_xof), coop_membres_categories(categorie)')
      .eq('cooperative_id', coopId)
      .order('created_at', { ascending: false });
    return (data ?? []) as unknown as MembreRow[];
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: membres?.length ?? 0 };
    membres?.forEach((m) => { c[m.statut] = (c[m.statut] ?? 0) + 1; });
    return c;
  }, [membres]);

  const filtered = useMemo(() => {
    let list = membres ?? [];
    if (tab !== 'tous') list = list.filter((m) => m.statut === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          `${m.nom} ${m.prenoms ?? ''}`.toLowerCase().includes(q) ||
          m.numero.toLowerCase().includes(q) ||
          (m.telephone ?? '').includes(q),
      );
    }
    return list;
  }, [membres, tab, search]);

  const solde = (m: MembreRow): number => {
    const c = m.coop_comptes_membres;
    if (!c) return 0;
    return Array.isArray(c) ? (c[0]?.solde_xof ?? 0) : c.solde_xof;
  };

  return (
    <>
      <PageHeader
        title="Sociétariat"
        subtitle="Le membre est le pivot du système — grand livre individuel, égalité de traitement (P2)."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button variant="action" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Nouveau membre
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-texte-2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, matricule, téléphone…"
            className="pl-9"
          />
        </div>
      </Card>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'tous', label: 'Tous', count: counts.tous },
          { key: 'actif', label: 'Actifs', count: counts.actif ?? 0 },
          { key: 'candidat', label: 'Candidats', count: counts.candidat ?? 0 },
          { key: 'probatoire', label: 'Probatoires', count: counts.probatoire ?? 0 },
          { key: 'suspendu', label: 'Suspendus', count: counts.suspendu ?? 0 },
        ]}
      />

      {isLoading ? (
        <Spinner />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Aucun membre"
          description={search ? 'Aucun résultat pour cette recherche.' : 'Enregistrez votre premier membre.'}
          action={!search && <Button variant="action" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button>}
        />
      ) : (
        <Card>
          <Table>
            <THead>
              <Th>Membre</Th>
              <Th>Matricule</Th>
              <Th>Catégories</Th>
              <Th>Statut</Th>
              <Th align="right">Solde compte</Th>
            </THead>
            <TBody>
              {filtered.map((m) => {
                const st = STATUT_MEMBRE[m.statut];
                return (
                  <Tr key={m.id} onClick={() => navigate(`/membres/${m.id}`)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={`${m.nom} ${m.prenoms ?? ''}`} src={m.photo_url} size="sm" />
                        <div>
                          <div className="font-medium text-texte">{m.nom} {m.prenoms}</div>
                          <div className="text-xs text-texte-2">{m.telephone ?? m.village ?? '—'}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><span className="mono text-xs">{m.numero}</span></Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {m.coop_membres_categories?.map((c) => (
                          <Badge key={c.categorie} tone="primaire">{CATEGORIE_MEMBRE[c.categorie]}</Badge>
                        )) ?? null}
                      </div>
                    </Td>
                    <Td><Badge tone={st.tone} dot>{st.label}</Badge></Td>
                    <Td align="right"><Money value={solde(m)} colorNegative size="sm" /></Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}

      <MembreForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}
