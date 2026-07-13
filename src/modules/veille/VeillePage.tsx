import { useState } from 'react';
import {
  ScrollText, Gavel, Landmark, Lightbulb, CalendarClock, Coins, Sparkles,
  CheckCircle2, AlertTriangle, Clock, ExternalLink, Info,
} from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { useCoop } from '../../auth/CooperativeProvider';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Badge, Tabs, Money, Spinner, EmptyState, useToast,
  Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate, formatDateLong } from '../../lib/format';

type Tab = 'publications' | 'conformite' | 'prix' | 'appels';

const TYPE_META: Record<string, { label: string; icon: typeof Gavel; tone: 'primaire' | 'action' | 'or' }> = {
  juridique: { label: 'Juridique', icon: Gavel, tone: 'primaire' },
  gouvernementale: { label: 'Gouvernementale', icon: Landmark, tone: 'action' },
  opportunite: { label: 'Opportunité', icon: Lightbulb, tone: 'or' },
};

export function VeillePage() {
  const { current } = useCoop();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('conformite');
  const pays = current?.pays ?? 'CI';

  const { data, isLoading, refetch } = useCoopQuery(['veille', pays], async (coopId) => {
    const [pubs, prix, appels, echeances] = await Promise.all([
      supabase.from('coop_veille_publications').select('*').or(`pays.is.null,pays.eq.${pays}`).eq('actif', true).order('date_publication', { ascending: false }),
      supabase.from('coop_prix_officiels').select('*').eq('pays', pays).order('date_debut', { ascending: false }),
      supabase.from('coop_appels_projets').select('*').or(`pays.is.null,pays.eq.${pays}`).eq('statut', 'ouvert').order('date_limite'),
      supabase.from('coop_echeances_conformite').select('*').eq('cooperative_id', coopId).order('date_echeance'),
    ]);
    return { pubs: pubs.data ?? [], prix: prix.data ?? [], appels: appels.data ?? [], echeances: echeances.data ?? [] };
  });

  const seed = useCoopMutation(
    async (coopId) => { const { error } = await supabase.rpc('coop_seed_conformite', { p_coop: coopId }); if (error) throw error; },
    { invalidate: ['veille'], onSuccess: () => { push('success', 'Échéancier OHADA pré-chargé'); refetch(); } },
  );

  const marquerFait = useCoopMutation(
    async (_c, id: string) => { const { error } = await supabase.from('coop_echeances_conformite').update({ statut: 'fait', fait_le: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    { invalidate: ['veille'], onSuccess: () => { push('success', 'Échéance marquée faite'); refetch(); } },
  );

  return (
    <>
      <PageHeader
        title="Veille & conformité"
        subtitle="Veille juridique, gouvernementale et opportunités — qualifiée par pays et filière."
        icon={<ScrollText className="h-5 w-5" />}
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-or-fcfa/25 bg-or-fcfa/5 p-3 text-sm text-texte-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-or-fcfa" />
        La veille informe, elle ne constitue pas un conseil juridique. En cas de doute, consultez un conseil. Contenu opéré et validé par Atlas Studio.
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'conformite', label: 'Échéancier', count: data?.echeances.length },
        { key: 'publications', label: 'Publications', count: data?.pubs.length },
        { key: 'prix', label: 'Prix officiels', count: data?.prix.length },
        { key: 'appels', label: 'Appels à projets', count: data?.appels.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'conformite' && (
            !data?.echeances.length ? (
              <EmptyState
                icon={<CalendarClock className="h-8 w-8" />}
                title="Échéancier non initialisé"
                description="Pré-chargez les obligations OHADA récurrentes (AGO annuelle, dépôt des états financiers, registre des membres…) avec leurs échéances."
                action={<Button variant="action" loading={seed.isPending} onClick={() => seed.mutate(undefined)}><Sparkles className="h-4 w-4" /> Initialiser l'échéancier OHADA</Button>}
              />
            ) : (
              <Card>
                <CardHeader title="Échéancier de conformité" subtitle={`${current?.forme_juridique === 'COOP_CA' ? 'COOP-CA' : 'SCOOPS'} · ${pays}`} icon={<CalendarClock className="h-5 w-5" />} action={<Button variant="ghost" size="sm" loading={seed.isPending} onClick={() => seed.mutate(undefined)}>Régénérer</Button>} />
                <CardBody className="p-0">
                  <ul className="divide-y divide-ligne/60">
                    {data.echeances.map((e: Record<string, unknown>) => {
                      const statut = e.statut as string;
                      const Icon = statut === 'fait' ? CheckCircle2 : statut === 'en_retard' ? AlertTriangle : Clock;
                      const tone = statut === 'fait' ? 'action' : statut === 'en_retard' ? 'alerte' : 'or';
                      return (
                        <li key={e.id as string} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${tone}/10 text-${tone}`} style={{ backgroundColor: `rgb(var(--${tone}-rgb) / 0.1)`, color: `var(--${tone === 'or' ? 'or-fcfa' : tone})` }}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="font-semibold text-texte">{e.libelle as string}</div>
                              <div className="text-xs text-texte-2 capitalize">{(e.categorie as string)} · échéance {formatDateLong(e.date_echeance as string)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge tone={statut === 'fait' ? 'action' : statut === 'en_retard' ? 'alerte' : 'or'} dot>
                              {statut === 'fait' ? 'Fait' : statut === 'en_retard' ? 'En retard' : 'À faire'}
                            </Badge>
                            {statut !== 'fait' && <Button variant="outline" size="sm" onClick={() => marquerFait.mutate(e.id as string)}>Marquer fait</Button>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            )
          )}

          {tab === 'publications' && (
            !data?.pubs.length ? <EmptyState icon={<ScrollText className="h-8 w-8" />} title="Aucune publication" description={`Aucune veille pour ${pays} pour le moment.`} /> :
            <div className="space-y-3">
              {data.pubs.map((p: Record<string, unknown>) => {
                const meta = TYPE_META[p.type as string] ?? TYPE_META.juridique;
                const Icon = meta.icon;
                return (
                  <Card key={p.id as string}>
                    <CardBody className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `rgb(var(--${meta.tone === 'or' ? 'or-fcfa' : meta.tone}-rgb) / 0.1)`, color: `var(--${meta.tone === 'or' ? 'or-fcfa' : meta.tone})` }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {p.impact === 'action' && <Badge tone="or">Action requise</Badge>}
                          {p.impact === 'urgent' && <Badge tone="alerte">Urgent</Badge>}
                          {Boolean(p.filiere) && <Badge tone="neutre">{p.filiere as string}</Badge>}
                          <span className="text-xs text-texte-2">{formatDate(p.date_publication as string)}</span>
                        </div>
                        <h3 className="mt-2 font-semibold text-texte">{p.titre as string}</h3>
                        <p className="mt-1 text-sm text-texte-2">{p.resume as string}</p>
                        {Boolean(p.source || p.reference_texte) && (
                          <div className="mt-2 text-xs text-texte-2">Source : {p.source as string}{p.reference_texte ? ` · ${p.reference_texte}` : ''}</div>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === 'prix' && (
            !data?.prix.length ? <EmptyState icon={<Coins className="h-8 w-8" />} title="Aucun prix officiel" description={`Aucun prix décrété enregistré pour ${pays}.`} /> :
            <Card>
              <CardHeader title="Prix officiels décrétés" subtitle="Le moteur de campagnes refuse un prix planché inférieur (contrainte système, M15)" icon={<Coins className="h-5 w-5" />} />
              <CardBody className="p-0">
                <Table>
                  <THead><Th>Filière</Th><Th>Libellé</Th><Th align="right">Prix officiel</Th><Th>Période</Th><Th>Source</Th></THead>
                  <TBody>
                    {data.prix.map((p: Record<string, unknown>) => (
                      <Tr key={p.id as string}>
                        <Td><Badge tone="primaire">{p.filiere as string}</Badge></Td>
                        <Td className="text-sm">{p.libelle as string}</Td>
                        <Td align="right"><Money value={p.prix_xof as number} size="sm" /><span className="ml-1 text-xs text-texte-2">/{p.unite_affichage as string}</span></Td>
                        <Td className="text-xs text-texte-2">{formatDate(p.date_debut as string)} → {p.date_fin ? formatDate(p.date_fin as string) : '…'}</Td>
                        <Td className="text-xs text-texte-2">{p.source as string}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          )}

          {tab === 'appels' && (
            !data?.appels.length ? <EmptyState icon={<Lightbulb className="h-8 w-8" />} title="Aucun appel à projets" description="Aucun guichet de financement ouvert pour votre pays." /> :
            <div className="grid gap-4 md:grid-cols-2">
              {data.appels.map((a: Record<string, unknown>) => (
                <Card key={a.id as string}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <Badge tone="or">{a.bailleur as string}</Badge>
                      {Boolean(a.date_limite) && <span className="text-xs font-semibold text-alerte">Clôture {formatDate(a.date_limite as string)}</span>}
                    </div>
                    <h3 className="mt-2 font-semibold text-texte">{a.titre as string}</h3>
                    <p className="mt-1 text-sm text-texte-2">{a.objet as string}</p>
                    {Boolean(a.montant_max_xof) && <div className="mt-2 text-sm">Jusqu'à <Money value={a.montant_max_xof as number} size="sm" /></div>}
                    {Boolean(a.criteres) && <div className="mt-2 text-xs text-texte-2">Éligibilité : {a.criteres as string}</div>}
                    {Boolean(a.url) && <a href={a.url as string} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primaire hover:underline">Voir <ExternalLink className="h-3.5 w-3.5" /></a>}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
