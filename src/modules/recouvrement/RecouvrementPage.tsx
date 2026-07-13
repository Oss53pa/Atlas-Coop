import { useMemo, useState } from 'react';
import {
  HandCoins, Plus, RefreshCw, Send, CheckCircle2, CalendarClock,
  AlertTriangle, Users, Layers, Info, ShieldAlert, Calculator,
} from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Money, Modal,
  Field, Input, Textarea, Select, Spinner, EmptyState, useToast,
  Table, THead, TBody, Th, Tr, Td, Tabs,
} from '../../ui';
import { formatDate } from '../../lib/format';

type Onglet = 'creances' | 'balance' | 'plans' | 'provisions';

interface Creance {
  id: string; debiteur_type: string; membre_id: string | null; client_id: string | null;
  debiteur_nom: string; telephone: string | null; origine: string; piece: string | null;
  date_creance: string; echeance: string; montant_xof: number; regle_xof: number;
  reste_xof: number; statut: string; stage: string; plan_id: string | null;
}
interface LigneAgee {
  debiteur_nom: string; telephone: string | null; nb_creances: number; total_du_xof: number;
  b0_30_xof: number | null; b31_60_xof: number | null; b61_90_xof: number | null; b90_plus_xof: number | null;
}
interface Plan {
  id: string; debiteur_nom: string; reference: string | null; montant_total_xof: number;
  nb_echeances: number; echeances_payees: number; mensualite_xof: number;
  prochaine_echeance: string | null; taux_respect_bp: number; statut: string; signed_at: string | null;
}
interface PreviewProvision {
  creance_id: string; debiteur_nom: string; reste_xof: number; jours_retard: number;
  taux_bp: number; provision_xof: number;
}
interface CampagneProvision {
  id: string; date_provision: string; nb_creances_provisionnees: number;
  provision_precedente_xof: number; provision_totale_xof: number; variation_xof: number;
}

const ORIGINE_LABEL: Record<string, string> = {
  vente_credit: 'Vente à crédit', avance: 'Avance', cotisation: 'Cotisation', autre: 'Autre',
};
const joursRetard = (echeance: string) =>
  Math.floor((Date.now() - new Date(echeance).getTime()) / 86_400_000);

export function RecouvrementPage() {
  const { push } = useToast();
  const [onglet, setOnglet] = useState<Onglet>('creances');
  const [regler, setRegler] = useState<Creance | null>(null);
  const [relance, setRelance] = useState<Creance | null>(null);
  const [nouvelle, setNouvelle] = useState(false);
  const [nouveauPlan, setNouveauPlan] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['recouvrement'], async (coopId) => {
    const [creances, balance, plans, preview, campagnes] = await Promise.all([
      supabase.from('coop_creances').select('*').eq('cooperative_id', coopId)
        .in('statut', ['ouverte', 'partiel']).order('echeance', { ascending: true }),
      supabase.rpc('coop_balance_agee', { p_coop: coopId }),
      supabase.from('coop_plans_recouvrement').select('*').eq('cooperative_id', coopId)
        .order('created_at', { ascending: false }),
      supabase.rpc('coop_previsualiser_provisions', { p_coop: coopId }),
      supabase.from('coop_provisions_creances').select('*').eq('cooperative_id', coopId)
        .order('date_provision', { ascending: false }).order('created_at', { ascending: false }).limit(12),
    ]);
    return {
      creances: (creances.data ?? []) as Creance[],
      balance: (balance.data ?? []) as LigneAgee[],
      plans: (plans.data ?? []) as Plan[],
      preview: (preview.data ?? []) as PreviewProvision[],
      campagnes: (campagnes.data ?? []) as CampagneProvision[],
    };
  });

  const creances = data?.creances ?? [];
  const totaux = useMemo(() => {
    const encours = creances.reduce((s, c) => s + c.reste_xof, 0);
    const enRetard = creances.filter((c) => joursRetard(c.echeance) > 0).reduce((s, c) => s + c.reste_xof, 0);
    const debiteurs = new Set(creances.map((c) => c.debiteur_nom)).size;
    return { encours, enRetard, debiteurs };
  }, [creances]);

  const generer = useCoopMutation(
    async (coopId) => {
      const { data: n, error } = await supabase.rpc('coop_generer_creances', { p_coop: coopId });
      if (error) throw error;
      return n as number;
    },
    { invalidate: ['recouvrement'], onSuccess: (n) => push('success', n > 0 ? `${n} créance(s) générée(s)` : 'Aucune nouvelle créance') },
  );

  const provisionActuelle = data?.campagnes?.[0]?.provision_totale_xof ?? 0;
  const provisionCible = (data?.preview ?? []).reduce((s, p) => s + p.provision_xof, 0);

  const provisionner = useCoopMutation(
    async (coopId) => {
      const { data: r, error } = await supabase.rpc('coop_provisionner_creances', { p_coop: coopId });
      if (error) throw error;
      return r as { variation_xof: number; provision_totale_xof: number };
    },
    {
      invalidate: ['recouvrement'],
      onSuccess: (r) => push('success', r.variation_xof === 0
        ? 'Provision déjà à jour, aucune écriture'
        : `${r.variation_xof > 0 ? 'Dotation' : 'Reprise'} comptabilisée : provision totale ${r.provision_totale_xof.toLocaleString('fr-FR')} FCFA`),
    },
  );

  return (
    <>
      <PageHeader
        title="Recouvrement"
        subtitle="Créances membres et clients : intrants à crédit, avances, ventes à crédit, cotisations. Balance âgée, relances, plans de règlement."
        icon={<HandCoins className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" loading={generer.isPending} onClick={() => generer.mutate(undefined)}>
              <RefreshCw className="h-4 w-4" /> Générer les créances
            </Button>
            <Button variant="action" onClick={() => setNouvelle(true)}><Plus className="h-4 w-4" /> Nouvelle créance</Button>
          </>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-or-fcfa/25 bg-or-fcfa/5 p-3 text-sm text-texte-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-or-fcfa" />
        « Générer les créances » importe automatiquement les ventes à crédit non soldées et les avances membres non remboursées. Les paiements se saisissent ici ou depuis la trésorerie.
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Encours total" value={<Money value={totaux.encours} suffix={false} size="xl" />} tone="primaire" icon={<HandCoins className="h-4 w-4" />} hint={`${creances.length} créance(s) ouverte(s)`} />
            <Stat label="Dont en retard" value={<Money value={totaux.enRetard} suffix={false} size="xl" />} tone="alerte" icon={<AlertTriangle className="h-4 w-4" />} hint="échéance dépassée" />
            <Stat label="Débiteurs" value={totaux.debiteurs} tone="or" icon={<Users className="h-4 w-4" />} />
          </div>

          <Tabs<Onglet>
            className="mb-4"
            value={onglet}
            onChange={setOnglet}
            tabs={[
              { key: 'creances', label: 'Créances', count: creances.length },
              { key: 'balance', label: 'Balance âgée', count: data?.balance.length },
              { key: 'plans', label: 'Plans de règlement', count: data?.plans.length },
              { key: 'provisions', label: 'Provisions', count: (data?.preview ?? []).filter((p) => p.provision_xof > 0).length },
            ]}
          />

          {onglet === 'creances' && (
            creances.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title="Aucune créance ouverte" description="Générez les créances depuis les ventes à crédit et les avances, ou saisissez-en une manuellement." action={<Button variant="outline" loading={generer.isPending} onClick={() => generer.mutate(undefined)}><RefreshCw className="h-4 w-4" /> Générer les créances</Button>} />
            ) : (
              <Card>
                <CardHeader title="Créances ouvertes" subtitle="Triées par échéance" />
                <CardBody className="p-0">
                  <Table>
                    <THead><Th>Débiteur</Th><Th>Origine</Th><Th>Échéance</Th><Th align="right">Montant</Th><Th align="right">Reste dû</Th><Th>Retard</Th><Th></Th></THead>
                    <TBody>
                      {creances.map((c) => {
                        const retard = joursRetard(c.echeance);
                        return (
                          <Tr key={c.id}>
                            <Td className="font-medium text-texte">{c.debiteur_nom}
                              <div className="text-xs font-normal text-texte-2">{c.piece ?? '—'} · {c.debiteur_type}</div>
                            </Td>
                            <Td><Badge tone="neutre">{ORIGINE_LABEL[c.origine] ?? c.origine}</Badge></Td>
                            <Td className="text-texte-2">{formatDate(c.echeance)}</Td>
                            <Td align="right"><Money value={c.montant_xof} size="sm" suffix={false} /></Td>
                            <Td align="right"><Money value={c.reste_xof} size="sm" suffix={false} /></Td>
                            <Td>{retard > 0 ? <Badge tone={retard > 90 ? 'alerte' : retard > 30 ? 'or' : 'neutre'} dot>{retard} j</Badge> : <span className="text-xs text-action">à jour</span>}</Td>
                            <Td align="right">
                              <div className="flex justify-end gap-1">
                                <Button variant="outline" size="sm" onClick={() => setRelance(c)} disabled={!c.telephone}><Send className="h-3.5 w-3.5" /> Relancer</Button>
                                <Button variant="action" size="sm" onClick={() => setRegler(c)}><HandCoins className="h-3.5 w-3.5" /> Régler</Button>
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </CardBody>
              </Card>
            )
          )}

          {onglet === 'balance' && (
            (data?.balance.length ?? 0) === 0 ? (
              <EmptyState icon={<Layers className="h-8 w-8" />} title="Balance âgée vide" description="Aucun poste ouvert à ventiler." />
            ) : (
              <Card>
                <CardHeader title="Balance âgée" subtitle="Reste dû ventilé par ancienneté d'échéance" />
                <CardBody className="p-0">
                  <Table>
                    <THead><Th>Débiteur</Th><Th align="right">0–30 j</Th><Th align="right">31–60 j</Th><Th align="right">61–90 j</Th><Th align="right">+90 j</Th><Th align="right">Total dû</Th></THead>
                    <TBody>
                      {data!.balance.map((l) => (
                        <Tr key={l.debiteur_nom}>
                          <Td className="font-medium text-texte">{l.debiteur_nom}<div className="text-xs font-normal text-texte-2">{l.nb_creances} poste(s)</div></Td>
                          <Td align="right"><Money value={l.b0_30_xof ?? 0} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={l.b31_60_xof ?? 0} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={l.b61_90_xof ?? 0} size="sm" suffix={false} /></Td>
                          <Td align="right"><span className={(l.b90_plus_xof ?? 0) > 0 ? 'rounded bg-alerte/10 px-1' : ''}><Money value={l.b90_plus_xof ?? 0} size="sm" suffix={false} /></span></Td>
                          <Td align="right"><Money value={l.total_du_xof} size="sm" suffix={false} /></Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </CardBody>
              </Card>
            )
          )}

          {onglet === 'plans' && (
            <>
              <div className="mb-3 flex justify-end">
                <Button variant="action" size="sm" onClick={() => setNouveauPlan(true)}><Plus className="h-4 w-4" /> Nouveau plan</Button>
              </div>
              {(data?.plans.length ?? 0) === 0 ? (
                <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="Aucun plan de règlement" description="Négociez un échéancier avec un débiteur en difficulté : montant total, nombre d'échéances, mensualité." action={<Button variant="action" onClick={() => setNouveauPlan(true)}><Plus className="h-4 w-4" /> Nouveau plan</Button>} />
              ) : (
                <Card>
                  <CardHeader title="Plans de règlement" subtitle="Échéanciers négociés" />
                  <CardBody className="p-0">
                    <Table>
                      <THead><Th>Débiteur</Th><Th>Réf.</Th><Th align="right">Total</Th><Th align="right">Mensualité</Th><Th>Avancement</Th><Th>Prochaine</Th><Th>Statut</Th></THead>
                      <TBody>
                        {data!.plans.map((p) => (
                          <Tr key={p.id}>
                            <Td className="font-medium text-texte">{p.debiteur_nom}</Td>
                            <Td className="text-texte-2">{p.reference ?? '—'}</Td>
                            <Td align="right"><Money value={p.montant_total_xof} size="sm" suffix={false} /></Td>
                            <Td align="right"><Money value={p.mensualite_xof} size="sm" suffix={false} /></Td>
                            <Td className="text-texte-2">{p.echeances_payees}/{p.nb_echeances}</Td>
                            <Td className="text-texte-2">{p.prochaine_echeance ? formatDate(p.prochaine_echeance) : '—'}</Td>
                            <Td><Badge tone={p.statut === 'solde' || p.statut === 'respecte' ? 'action' : p.statut === 'rompu' || p.statut === 'en_retard' ? 'alerte' : 'or'} dot>{p.statut}</Badge></Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </CardBody>
                </Card>
              )}
            </>
          )}

          {onglet === 'provisions' && (
            <>
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-or-fcfa/25 bg-or-fcfa/5 p-3 text-sm text-texte-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-or-fcfa" />
                Dépréciation SYSCOHADA des créances douteuses (compte 491). Taux suggéré par ancienneté — 0 % jusqu'à 90 j, 25 % à 91–180 j, 50 % à 181–360 j, 100 % au-delà — ajustable créance par créance. « Comptabiliser » génère la dotation (6817/491) ou la reprise (491/787) correspondant à l'écart avec la dernière campagne.
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat label="Provision comptabilisée" value={<Money value={provisionActuelle} suffix={false} size="xl" />} tone="primaire" icon={<ShieldAlert className="h-4 w-4" />} hint={data?.campagnes?.[0] ? `au ${formatDate(data.campagnes[0].date_provision)}` : 'aucune campagne'} />
                <Stat label="Provision cible (aujourd'hui)" value={<Money value={provisionCible} suffix={false} size="xl" />} tone="or" icon={<Calculator className="h-4 w-4" />} hint={`${(data?.preview ?? []).filter((p) => p.provision_xof > 0).length} créance(s) concernée(s)`} />
                <Stat
                  label="Écart à comptabiliser"
                  value={<Money value={provisionCible - provisionActuelle} suffix={false} size="xl" sign colorNegative />}
                  tone={provisionCible - provisionActuelle === 0 ? 'primaire' : provisionCible - provisionActuelle > 0 ? 'alerte' : 'action'}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  hint={provisionCible - provisionActuelle > 0 ? 'dotation à passer' : provisionCible - provisionActuelle < 0 ? 'reprise à passer' : 'à jour'}
                />
              </div>

              <div className="mb-3 flex justify-end">
                <Button variant="action" size="sm" loading={provisionner.isPending} disabled={provisionCible - provisionActuelle === 0} onClick={() => provisionner.mutate(undefined)}>
                  <Calculator className="h-4 w-4" /> Comptabiliser
                </Button>
              </div>

              {(data?.preview ?? []).filter((p) => p.provision_xof > 0).length === 0 ? (
                <EmptyState icon={<ShieldAlert className="h-8 w-8" />} title="Aucune créance à provisionner" description="Aucune créance ouverte n'a franchi le seuil de 90 jours de retard." />
              ) : (
                <Card className="mb-6">
                  <CardHeader title="Détail par créance" subtitle="Taux suggéré selon l'ancienneté (ou taux manuel si déjà fixé)" />
                  <CardBody className="p-0">
                    <Table>
                      <THead><Th>Débiteur</Th><Th align="right">Reste dû</Th><Th>Retard</Th><Th align="right">Taux</Th><Th align="right">Provision</Th></THead>
                      <TBody>
                        {(data!.preview).filter((p) => p.provision_xof > 0).map((p) => (
                          <Tr key={p.creance_id}>
                            <Td className="font-medium text-texte">{p.debiteur_nom}</Td>
                            <Td align="right"><Money value={p.reste_xof} size="sm" suffix={false} /></Td>
                            <Td className="text-texte-2">{p.jours_retard} j</Td>
                            <Td align="right" className="text-texte-2">{(p.taux_bp / 100).toLocaleString('fr-FR')} %</Td>
                            <Td align="right"><Money value={p.provision_xof} size="sm" suffix={false} /></Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {(data?.campagnes.length ?? 0) > 0 && (
                <Card>
                  <CardHeader title="Historique des campagnes" subtitle="Dotations et reprises comptabilisées" />
                  <CardBody className="p-0">
                    <Table>
                      <THead><Th>Date</Th><Th align="right">Créances</Th><Th align="right">Provision précédente</Th><Th align="right">Variation</Th><Th align="right">Provision totale</Th></THead>
                      <TBody>
                        {data!.campagnes.map((c) => (
                          <Tr key={c.id}>
                            <Td className="text-texte-2">{formatDate(c.date_provision)}</Td>
                            <Td align="right" className="text-texte-2">{c.nb_creances_provisionnees}</Td>
                            <Td align="right"><Money value={c.provision_precedente_xof} size="sm" suffix={false} /></Td>
                            <Td align="right"><Money value={c.variation_xof} size="sm" suffix={false} sign colorNegative /></Td>
                            <Td align="right"><Money value={c.provision_totale_xof} size="sm" suffix={false} /></Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {regler && <ReglerModal creance={regler} onClose={() => setRegler(null)} onDone={() => { setRegler(null); refetch(); push('success', 'Règlement enregistré'); }} />}
      {relance && <RelanceModal creance={relance} onClose={() => setRelance(null)} onDone={() => { setRelance(null); refetch(); push('success', 'Relance enregistrée (SMS en file)'); }} />}
      {nouvelle && <CreanceForm onClose={() => setNouvelle(false)} onDone={() => { setNouvelle(false); refetch(); push('success', 'Créance créée'); }} />}
      {nouveauPlan && <PlanForm onClose={() => setNouveauPlan(false)} onDone={() => { setNouveauPlan(false); refetch(); push('success', 'Plan créé'); }} />}
    </>
  );
}

function ReglerModal({ creance, onClose, onDone }: { creance: Creance; onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const [montant, setMontant] = useState(String(creance.reste_xof));
  const regler = useCoopMutation(
    async () => {
      const m = Math.round(Number(montant) || 0);
      if (m <= 0) throw new Error('Montant invalide');
      if (m > creance.reste_xof) throw new Error('Montant supérieur au reste dû');
      const { error } = await supabase.rpc('coop_regler_creance', { p_creance: creance.id, p_montant: m });
      if (error) throw error;
    },
    { invalidate: ['recouvrement'], onSuccess: onDone },
  );
  return (
    <Modal open onClose={onClose} title={`Régler — ${creance.debiteur_nom}`}
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={regler.isPending} onClick={() => regler.mutateAsync(undefined).catch((e) => push('error', (e as Error).message))}>Encaisser</Button></>}>
      <div className="space-y-4">
        <div className="rounded-xl border border-ligne bg-fond p-3 text-sm">
          <div className="flex justify-between"><span className="text-texte-2">Montant</span><Money value={creance.montant_xof} size="sm" /></div>
          <div className="flex justify-between"><span className="text-texte-2">Déjà réglé</span><Money value={creance.regle_xof} size="sm" /></div>
          <div className="mt-1 flex justify-between border-t border-ligne pt-1 font-medium"><span>Reste dû</span><Money value={creance.reste_xof} size="sm" /></div>
        </div>
        <Field label="Montant encaissé (FCFA)">
          <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} min={1} max={creance.reste_xof} />
        </Field>
      </div>
    </Modal>
  );
}

function RelanceModal({ creance, onClose, onDone }: { creance: Creance; onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const retard = joursRetard(creance.echeance);
  const [niveau, setNiveau] = useState(retard > 90 ? 'mise_en_demeure' : retard > 30 ? 'relance2' : 'relance1');
  const [canal, setCanal] = useState('sms');
  const defaultMsg = `Bonjour ${creance.debiteur_nom}, votre coopérative vous rappelle un solde dû de ${creance.reste_xof.toLocaleString('fr-FR')} FCFA (${creance.piece ?? 'créance'}), échéance ${formatDate(creance.echeance)}. Merci de régulariser.`;
  const [message, setMessage] = useState(defaultMsg);

  const envoyer = useCoopMutation(
    async (coopId) => {
      // Journalise la relance…
      const { data: rel, error: re } = await supabase.from('coop_relances').insert({
        cooperative_id: coopId, creance_id: creance.id, membre_id: creance.membre_id, client_id: creance.client_id,
        niveau, canal, notes: canal === 'sms' ? message : null,
      }).select('id').single();
      if (re) throw re;
      // …puis, si canal SMS, met le message en file (traité par coop-sms-dispatch).
      if (canal === 'sms' && creance.telephone) {
        const { error: se } = await supabase.from('coop_notifications_sms').insert({
          cooperative_id: coopId, membre_id: creance.membre_id, telephone: creance.telephone,
          type: 'recouvrement', message, source_type: 'relance', source_id: (rel as { id: string }).id,
        });
        if (se) throw se;
      }
      // Fait passer la créance en phase « relance » si elle était amiable.
      if (creance.stage === 'amiable') {
        await supabase.from('coop_creances').update({ stage: 'relance' }).eq('id', creance.id);
      }
    },
    { invalidate: ['recouvrement'], onSuccess: onDone },
  );

  return (
    <Modal open onClose={onClose} title={`Relancer — ${creance.debiteur_nom}`}
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={envoyer.isPending} onClick={() => envoyer.mutateAsync(undefined).catch((e) => push('error', (e as Error).message))}><Send className="h-4 w-4" /> {canal === 'sms' ? 'Mettre en file SMS' : 'Enregistrer'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Niveau">
            <Select value={niveau} onChange={(e) => setNiveau(e.target.value)}>
              <option value="rappel">Rappel amiable</option>
              <option value="relance1">1re relance</option>
              <option value="relance2">2e relance</option>
              <option value="mise_en_demeure">Mise en demeure</option>
            </Select>
          </Field>
          <Field label="Canal">
            <Select value={canal} onChange={(e) => setCanal(e.target.value)}>
              <option value="sms">SMS</option>
              <option value="appel">Appel</option>
              <option value="courrier">Courrier</option>
              <option value="email">Email</option>
              <option value="visite">Visite</option>
            </Select>
          </Field>
        </div>
        {canal === 'sms' && (
          <Field label="Message SMS" hint={creance.telephone ? `Vers ${creance.telephone}` : 'Aucun téléphone — SMS impossible'}>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function CreanceForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const { data: membres } = useCoopQuery(['recouvrement-membres'], async (coopId) => {
    const { data } = await supabase.from('coop_membres').select('id, nom, prenoms, raison_sociale, telephone')
      .eq('cooperative_id', coopId).order('nom').limit(1000);
    return (data ?? []) as { id: string; nom: string | null; prenoms: string | null; raison_sociale: string | null; telephone: string | null }[];
  });
  const [membreId, setMembreId] = useState('');
  const [origine, setOrigine] = useState('autre');
  const [piece, setPiece] = useState('');
  const [montant, setMontant] = useState('');
  const [echeance, setEcheance] = useState('');

  const nomDe = (m: { nom: string | null; prenoms: string | null; raison_sociale: string | null }) =>
    [m.nom, m.prenoms].filter(Boolean).join(' ').trim() || m.raison_sociale || 'Membre';

  const save = useCoopMutation(
    async (coopId) => {
      const m = (membres ?? []).find((x) => x.id === membreId);
      if (!m) throw new Error('Sélectionnez un membre');
      const mt = Math.round(Number(montant) || 0);
      if (mt <= 0) throw new Error('Montant invalide');
      if (!echeance) throw new Error('Échéance requise');
      const { error } = await supabase.from('coop_creances').insert({
        cooperative_id: coopId, debiteur_type: 'membre', membre_id: membreId,
        debiteur_nom: nomDe(m), telephone: m.telephone, origine, piece: piece || null,
        echeance, montant_xof: mt,
      });
      if (error) throw error;
    },
    { invalidate: ['recouvrement'], onSuccess: onDone },
  );

  return (
    <Modal open onClose={onClose} title="Nouvelle créance"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} onClick={() => save.mutateAsync(undefined).catch((e) => push('error', (e as Error).message))}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Membre débiteur">
          <Select value={membreId} onChange={(e) => setMembreId(e.target.value)}>
            <option value="">— Choisir —</option>
            {(membres ?? []).map((m) => <option key={m.id} value={m.id}>{nomDe(m)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Origine">
            <Select value={origine} onChange={(e) => setOrigine(e.target.value)}>
              <option value="avance">Avance</option>
              <option value="vente_credit">Vente à crédit</option>
              <option value="cotisation">Cotisation</option>
              <option value="autre">Autre</option>
            </Select>
          </Field>
          <Field label="Pièce / réf."><Input value={piece} onChange={(e) => setPiece(e.target.value)} placeholder="INTRANT-2026-01" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (FCFA)"><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} min={1} /></Field>
          <Field label="Échéance"><Input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function PlanForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const { data: membres } = useCoopQuery(['recouvrement-membres'], async (coopId) => {
    const { data } = await supabase.from('coop_membres').select('id, nom, prenoms, raison_sociale')
      .eq('cooperative_id', coopId).order('nom').limit(1000);
    return (data ?? []) as { id: string; nom: string | null; prenoms: string | null; raison_sociale: string | null }[];
  });
  const [membreId, setMembreId] = useState('');
  const [reference, setReference] = useState('');
  const [total, setTotal] = useState('');
  const [nb, setNb] = useState('3');
  const [prochaine, setProchaine] = useState('');

  const nomDe = (m: { nom: string | null; prenoms: string | null; raison_sociale: string | null }) =>
    [m.nom, m.prenoms].filter(Boolean).join(' ').trim() || m.raison_sociale || 'Membre';
  const mensualite = useMemo(() => {
    const t = Math.round(Number(total) || 0); const n = Math.max(1, Math.round(Number(nb) || 1));
    return Math.ceil(t / n);
  }, [total, nb]);

  const save = useCoopMutation(
    async (coopId) => {
      const m = (membres ?? []).find((x) => x.id === membreId);
      if (!m) throw new Error('Sélectionnez un membre');
      const t = Math.round(Number(total) || 0); const n = Math.max(1, Math.round(Number(nb) || 1));
      if (t <= 0) throw new Error('Montant total invalide');
      const { error } = await supabase.from('coop_plans_recouvrement').insert({
        cooperative_id: coopId, debiteur_type: 'membre', membre_id: membreId, debiteur_nom: nomDe(m),
        reference: reference || null, montant_total_xof: t, nb_echeances: n,
        mensualite_xof: mensualite, prochaine_echeance: prochaine || null, signed_at: prochaine || null,
      });
      if (error) throw error;
    },
    { invalidate: ['recouvrement'], onSuccess: onDone },
  );

  return (
    <Modal open onClose={onClose} title="Nouveau plan de règlement"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} onClick={() => save.mutateAsync(undefined).catch((e) => push('error', (e as Error).message))}>Créer le plan</Button></>}>
      <div className="space-y-4">
        <Field label="Membre débiteur">
          <Select value={membreId} onChange={(e) => setMembreId(e.target.value)}>
            <option value="">— Choisir —</option>
            {(membres ?? []).map((m) => <option key={m.id} value={m.id}>{nomDe(m)}</option>)}
          </Select>
        </Field>
        <Field label="Référence"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PLAN-2026-001" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant total (FCFA)"><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} min={1} /></Field>
          <Field label="Nombre d'échéances"><Input type="number" value={nb} onChange={(e) => setNb(e.target.value)} min={1} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mensualité (calculée)"><div className="flex h-10 items-center rounded-lg border border-ligne bg-fond px-3"><Money value={mensualite} size="sm" /></div></Field>
          <Field label="Prochaine échéance"><Input type="date" value={prochaine} onChange={(e) => setProchaine(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
