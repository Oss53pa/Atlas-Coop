import { useState } from 'react';
import { Beef, Plus, Egg, Milk, Syringe, Bird, Activity, TrendingDown } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { formatFcfaText } from '../../lib/money';
import { formatDate, formatNumber } from '../../lib/format';

type Tab = 'aviculture' | 'cheptel' | 'lait';
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

interface BandeKpi {
  effectifActuel: number; totalOeufs: number; totalMort: number; jours: number;
  tauxPonte: number; mortaliteCumul: number; consoParSujetJour: number;
}
function computeKpi(effectifInitial: number, suivis: Record<string, unknown>[]): BandeKpi {
  const totalMort = suivis.reduce((s, x) => s + (x.mortalite as number), 0);
  const totalOeufs = suivis.reduce((s, x) => s + (x.oeufs as number), 0);
  const totalAlimentG = suivis.reduce((s, x) => s + (x.aliment_g as number), 0);
  const jours = suivis.length;
  const effectifActuel = Math.max(effectifInitial - totalMort, 0);
  const tauxPonte = jours > 0 && effectifActuel > 0 ? (totalOeufs / (effectifActuel * jours)) * 100 : 0;
  const mortaliteCumul = effectifInitial > 0 ? (totalMort / effectifInitial) * 100 : 0;
  const consoParSujetJour = jours > 0 && effectifActuel > 0 ? (totalAlimentG / 1000) / (effectifActuel * jours) : 0;
  return { effectifActuel, totalOeufs, totalMort, jours, tauxPonte, mortaliteCumul, consoParSujetJour };
}

export function ElevagePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('aviculture');
  const [modal, setModal] = useState<null | 'bande' | 'lot' | 'lactation' | 'collecte'>(null);
  const [bandeDetail, setBandeDetail] = useState<string | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['elevage'], async (coopId) => {
    const [bandes, suivis, lots, carnet, lactations, collectes] = await Promise.all([
      supabase.from('coop_bandes_avicoles').select('*, coop_membres(nom, prenoms)').eq('cooperative_id', coopId).order('date_mise_en_place', { ascending: false }),
      supabase.from('coop_suivis_quotidiens_bandes').select('bande_id, mortalite, oeufs, aliment_g').eq('cooperative_id', coopId),
      supabase.from('coop_lots_animaux').select('*, coop_membres(nom, prenoms)').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_carnet_sanitaire').select('*, coop_lots_animaux(code, espece)').eq('cooperative_id', coopId).order('date_intervention', { ascending: false }).limit(20),
      supabase.from('coop_lactations').select('*, coop_membres(nom, prenoms)').eq('cooperative_id', coopId).order('date_debut', { ascending: false }),
      supabase.from('coop_collectes_lait').select('*, coop_membres(nom, prenoms, numero)').eq('cooperative_id', coopId).order('date_collecte', { ascending: false }).limit(30),
    ]);
    const suivisByBande = new Map<string, Record<string, unknown>[]>();
    (suivis.data ?? []).forEach((s: Record<string, unknown>) => {
      const k = s.bande_id as string;
      if (!suivisByBande.has(k)) suivisByBande.set(k, []);
      suivisByBande.get(k)!.push(s);
    });
    const bandeRows = (bandes.data ?? []) as Record<string, unknown>[];
    const effectifVolaille = bandeRows.reduce((s, b) => s + computeKpi(b.effectif_initial as number, suivisByBande.get(b.id as string) ?? []).effectifActuel, 0);
    const litresLait = (collectes.data ?? []).reduce((s: number, c: Record<string, unknown>) => s + (c.quantite_ml as number), 0) / 1000;
    return {
      bandes: bandeRows, suivisByBande, lots: lots.data ?? [], carnet: carnet.data ?? [],
      lactations: lactations.data ?? [], collectes: collectes.data ?? [], effectifVolaille, litresLait,
    };
  });

  const addBtn = { aviculture: 'bande', cheptel: 'lot', lait: 'collecte' } as const;

  return (
    <>
      <PageHeader
        title="Élevage, aviculture & lait"
        subtitle="Cheptel & carnet sanitaire, bandes avicoles (indicateurs auto), production laitière."
        icon={<Beef className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(addBtn[tab])}><Plus className="h-4 w-4" /> Ajouter</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Bandes avicoles" value={data?.bandes.length ?? 0} icon={<Bird className="h-4 w-4" />} tone="primaire" />
        <Stat label="Effectif volaille" value={formatNumber(data?.effectifVolaille ?? 0)} icon={<Egg className="h-4 w-4" />} tone="or" />
        <Stat label="Lots cheptel" value={data?.lots.length ?? 0} icon={<Beef className="h-4 w-4" />} tone="action" />
        <Stat label="Lait collecté" value={`${formatNumber(Math.round(data?.litresLait ?? 0))} L`} icon={<Milk className="h-4 w-4" />} tone="primaire" />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'aviculture', label: 'Aviculture', count: data?.bandes.length },
        { key: 'cheptel', label: 'Cheptel & sanitaire', count: data?.lots.length },
        { key: 'lait', label: 'Lait', count: data?.collectes.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'aviculture' && (
            !data?.bandes.length ? <EmptyState icon={<Bird className="h-8 w-8" />} title="Aucune bande" description="Mettez en place une bande (ponte ou chair). Suivi quotidien simplifié : mortalité, aliment, œufs." action={<Button variant="action" onClick={() => setModal('bande')}><Plus className="h-4 w-4" /> Nouvelle bande</Button>} /> :
            <div className="grid gap-4 md:grid-cols-2">
              {data.bandes.map((b) => {
                const kpi = computeKpi(b.effectif_initial as number, data.suivisByBande.get(b.id as string) ?? []);
                const m = b.coop_membres as { nom?: string; prenoms?: string } | null;
                return (
                  <Card key={b.id as string} className="cursor-pointer transition hover:shadow-carte-hover" >
                    <CardBody onClick={() => setBandeDetail(b.id as string)}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-texte">{(b.souche as string) || 'Bande'} <span className="mono text-xs text-texte-2">{b.code as string}</span></h3>
                          <div className="text-xs text-texte-2">{b.type as string} · {m ? `${m.nom} ${m.prenoms ?? ''}` : 'coopérative'} · MEP {formatDate(b.date_mise_en_place as string)}</div>
                        </div>
                        <Badge tone={b.type === 'ponte' ? 'or' : 'primaire'}>{formatNumber(kpi.effectifActuel)} sujets</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <Kpi label="Taux de ponte" value={b.type === 'ponte' ? `${kpi.tauxPonte.toFixed(1)} %` : '—'} tone={kpi.tauxPonte >= 70 || b.type !== 'ponte' ? 'action' : 'alerte'} />
                        <Kpi label="Mortalité cumul." value={`${kpi.mortaliteCumul.toFixed(1)} %`} tone={kpi.mortaliteCumul <= 5 ? 'action' : 'alerte'} />
                        <Kpi label="Conso/sujet/j" value={`${(kpi.consoParSujetJour * 1000).toFixed(0)} g`} tone="neutre" />
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === 'cheptel' && (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Lots du cheptel" icon={<Beef className="h-5 w-5" />} />
                <CardBody className="p-0">
                  {!data?.lots.length ? <EmptyState title="Aucun lot" description="Enregistrez vos lots (bovins, ovins, caprins, porcins…)." action={<Button variant="action" onClick={() => setModal('lot')}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
                    <Table>
                      <THead><Th>Lot</Th><Th>Espèce / Race</Th><Th>Propriétaire</Th><Th align="right">Effectif</Th></THead>
                      <TBody>
                        {data.lots.map((l: Record<string, unknown>) => {
                          const m = l.coop_membres as { nom?: string; prenoms?: string } | null;
                          return (
                            <Tr key={l.id as string}>
                              <Td className="font-medium text-texte">{l.code as string}</Td>
                              <Td className="text-sm">{l.espece as string}{l.race ? ` · ${l.race}` : ''}</Td>
                              <Td className="text-sm">{m ? `${m.nom} ${m.prenoms ?? ''}` : 'coopérative'}</Td>
                              <Td align="right" className="font-semibold">{formatNumber(l.effectif as number)}</Td>
                            </Tr>
                          );
                        })}
                      </TBody>
                    </Table>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Carnet sanitaire" subtitle="Vaccinations, traitements, rappels" icon={<Syringe className="h-5 w-5" />} action={<Button variant="outline" size="sm" onClick={() => setModal('lot')} disabled={!data?.lots.length}>+ Intervention via lot</Button>} />
                <CardBody className="p-0">
                  {!data?.carnet.length ? <div className="py-6 text-center text-sm text-texte-2">Aucune intervention enregistrée.</div> :
                    <ul className="divide-y divide-ligne/60">
                      {data.carnet.map((c: Record<string, unknown>) => (
                        <li key={c.id as string} className="flex items-center justify-between px-5 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-texte">{(c.produit as string) || (c.type as string)}</span>
                            <span className="ml-2 text-xs text-texte-2">{(c.coop_lots_animaux as { code?: string } | null)?.code} · {formatDate(c.date_intervention as string)}</span>
                          </div>
                          {Boolean(c.rappel_date) && <Badge tone={new Date(c.rappel_date as string) < new Date() ? 'alerte' : 'or'}>Rappel {formatDate(c.rappel_date as string)}</Badge>}
                        </li>
                      ))}
                    </ul>}
                </CardBody>
              </Card>
            </div>
          )}

          {tab === 'lait' && (
            <Card>
              <CardHeader title="Collectes de lait" subtitle="Apport journalier (_ml), crédité au compte membre" icon={<Milk className="h-5 w-5" />} />
              <CardBody className="p-0">
                {!data?.collectes.length ? <EmptyState title="Aucune collecte" description="Enregistrez la collecte quotidienne de lait." action={<Button variant="action" onClick={() => setModal('collecte')}><Plus className="h-4 w-4" /> Collecte</Button>} /> :
                  <Table>
                    <THead><Th>Date</Th><Th>Membre</Th><Th align="right">Quantité</Th><Th align="right">Montant crédité</Th></THead>
                    <TBody>
                      {data.collectes.map((c: Record<string, unknown>) => {
                        const m = c.coop_membres as { nom?: string; prenoms?: string; numero?: string } | null;
                        return (
                          <Tr key={c.id as string}>
                            <Td className="text-xs text-texte-2">{formatDate(c.date_collecte as string)}</Td>
                            <Td className="font-medium text-texte">{m?.nom} {m?.prenoms}</Td>
                            <Td align="right">{formatNumber(Math.round((c.quantite_ml as number) / 1000 * 10) / 10)} L</Td>
                            <Td align="right"><Money value={c.montant_xof as number} size="sm" /></Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>}
              </CardBody>
            </Card>
          )}
        </>
      )}

      {modal === 'bande' && <BandeForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Bande créée')} />}
      {modal === 'lot' && <LotForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Enregistré')} />}
      {modal === 'collecte' && <CollecteLaitForm onClose={() => { setModal(null); refetch(); }} onDone={(m) => push('success', m)} />}
      {bandeDetail && <BandeDetail bandeId={bandeDetail} onClose={() => { setBandeDetail(null); refetch(); }} />}
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'action' | 'alerte' | 'neutre' }) {
  const c = tone === 'action' ? 'text-action' : tone === 'alerte' ? 'text-alerte' : 'text-texte';
  return <div className="rounded-lg bg-surface-2 p-2"><div className={`text-base font-bold ${c}`}>{value}</div><div className="text-[11px] text-texte-2">{label}</div></div>;
}

function BandeForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [membre, setMembre] = useState<Picked | null>(null);
  const [code, setCode] = useState(''); const [souche, setSouche] = useState(''); const [type, setType] = useState('ponte'); const [effectif, setEffectif] = useState(''); const [batiment, setBatiment] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_bandes_avicoles').insert({ cooperative_id: coopId, membre_id: membre?.id ?? null, code: code.toUpperCase(), souche: souche || null, type, effectif_initial: Number(effectif) || 0, batiment: batiment || null }); if (error) throw error; },
    { invalidate: ['elevage'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Nouvelle bande avicole"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !effectif} onClick={() => save.mutate(undefined)}>Mettre en place</Button></>}>
      <div className="space-y-4">
        <Field label="Propriétaire (membre, optionnel)">{membre ? <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-2.5"><span className="text-sm font-medium">{membre.nom} {membre.prenoms}</span><Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button></div> : <MembrePicker value={null} onChange={setMembre} onlyActive={false} />}</Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="B-01" /></Field>
          <Field label="Souche" className="col-span-2"><Input value={souche} onChange={(e) => setSouche(e.target.value)} placeholder="ISA Brown" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="ponte">Ponte</option><option value="chair">Chair</option></Select></Field>
          <Field label="Effectif" required><Input type="number" value={effectif} onChange={(e) => setEffectif(e.target.value)} placeholder="500" /></Field>
          <Field label="Bâtiment"><Input value={batiment} onChange={(e) => setBatiment(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function LotForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [espece, setEspece] = useState(''); const [race, setRace] = useState(''); const [effectif, setEffectif] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_lots_animaux').insert({ cooperative_id: coopId, code: code.toUpperCase(), espece, race: race || null, effectif: Number(effectif) || 0 }); if (error) throw error; },
    { invalidate: ['elevage'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouveau lot d'animaux"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !espece} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="L-BOV-1" /></Field>
          <Field label="Espèce" required><Input value={espece} onChange={(e) => setEspece(e.target.value)} placeholder="Bovin" /></Field>
          <Field label="Race"><Input value={race} onChange={(e) => setRace(e.target.value)} placeholder="N'Dama" /></Field>
        </div>
        <Field label="Effectif"><Input type="number" value={effectif} onChange={(e) => setEffectif(e.target.value)} placeholder="12" /></Field>
      </div>
    </Modal>
  );
}

function CollecteLaitForm({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const { push } = useToast();
  const [membre, setMembre] = useState<Picked | null>(null);
  const [litres, setLitres] = useState(''); const [prix, setPrix] = useState('');
  const montant = Math.round((Number(litres) || 0) * (Number(prix) || 0));
  const save = useCoopMutation(
    async (coopId) => {
      if (!membre) throw new Error('Membre requis');
      const ml = Math.round((Number(litres) || 0) * 1000);
      const { data: mvt } = await supabase.from('coop_mouvements_compte_membre').insert({
        cooperative_id: coopId, membre_id: membre.id, sens: 'credit', nature: 'apport', montant_xof: montant,
        quantite_base: ml, unite_base: 'ml', piece_type: 'collecte_lait', libelle: 'Collecte lait',
      }).select('id').single();
      const { error } = await supabase.from('coop_collectes_lait').insert({
        cooperative_id: coopId, membre_id: membre.id, quantite_ml: ml, prix_unitaire_xof: Number(prix) || 0, montant_xof: montant, mouvement_id: mvt?.id ?? null,
      });
      if (error) throw error;
      if (membre.telephone) {
        await supabase.from('coop_notifications_sms').insert({ cooperative_id: coopId, membre_id: membre.id, telephone: membre.telephone, type: 'recu_pesee', message: `Atlas Coop: collecte lait ${litres} L, ${formatFcfaText(montant)} crédité.` });
      }
    },
    { invalidate: ['elevage', 'dashboard', 'membres'], onSuccess: () => { onDone(`Collecte enregistrée · ${formatFcfaText(montant)} crédité`); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Collecte de lait" subtitle="Apport journalier crédité au compte membre (P6)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!membre || montant <= 0} onClick={() => { if (!membre) { push('error', 'Sélectionnez le membre'); return; } save.mutate(undefined); }}>Enregistrer</Button></>}>
      <div className="space-y-4">
        {membre ? <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-2.5"><span className="text-sm font-medium">{membre.nom} {membre.prenoms} <span className="mono text-xs text-texte-2">{membre.numero}</span></span><Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button></div> : <MembrePicker value={null} onChange={setMembre} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantité (litres)" required><Input type="number" step="0.1" value={litres} onChange={(e) => setLitres(e.target.value)} placeholder="15" /></Field>
          <Field label="Prix / litre (FCFA)"><Input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="350" /></Field>
        </div>
        {montant > 0 && <div className="rounded-lg bg-surface-2 p-3 text-sm">Montant crédité : <Money value={montant} size="sm" className="ml-1" /></div>}
      </div>
    </Modal>
  );
}

function BandeDetail({ bandeId, onClose }: { bandeId: string; onClose: () => void }) {
  const { push } = useToast();
  const [mort, setMort] = useState('0'); const [aliment, setAliment] = useState(''); const [oeufs, setOeufs] = useState('');
  const { data, isLoading, refetch } = useCoopQuery(['bande', bandeId], async () => {
    const [bande, suivis] = await Promise.all([
      supabase.from('coop_bandes_avicoles').select('*').eq('id', bandeId).single(),
      supabase.from('coop_suivis_quotidiens_bandes').select('*').eq('bande_id', bandeId).order('date_suivi', { ascending: false }),
    ]);
    return { bande: bande.data as Record<string, unknown>, suivis: (suivis.data ?? []) as Record<string, unknown>[] };
  });

  const addSuivi = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.from('coop_suivis_quotidiens_bandes').insert({
        cooperative_id: coopId, bande_id: bandeId, mortalite: Number(mort) || 0,
        aliment_g: Math.round((Number(aliment) || 0) * 1000), oeufs: Number(oeufs) || 0,
      });
      if (error) throw error;
    },
    { invalidate: ['bande', 'elevage'], onSuccess: () => { push('success', 'Suivi du jour enregistré'); setMort('0'); setAliment(''); setOeufs(''); refetch(); } },
  );

  const kpi = data ? computeKpi(data.bande.effectif_initial as number, data.suivis) : null;
  const isPonte = data?.bande.type === 'ponte';

  return (
    <Modal open onClose={onClose} size="xl" title={`Bande ${(data?.bande.code as string) ?? ''}`} subtitle={data ? `${data.bande.souche ?? ''} · ${data.bande.type} · effectif initial ${formatNumber(data.bande.effectif_initial as number)}` : ''}
      footer={<Button variant="outline" onClick={onClose}>Fermer</Button>}>
      {isLoading || !data || !kpi ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Effectif actuel" value={formatNumber(kpi.effectifActuel)} tone="primaire" icon={<Bird className="h-4 w-4" />} />
            {isPonte && <Stat label="Taux de ponte" value={`${kpi.tauxPonte.toFixed(1)} %`} tone="action" icon={<Egg className="h-4 w-4" />} />}
            <Stat label="Mortalité cumul." value={`${kpi.mortaliteCumul.toFixed(1)} %`} tone="alerte" icon={<TrendingDown className="h-4 w-4" />} />
            <Stat label="Conso/sujet/j" value={`${(kpi.consoParSujetJour * 1000).toFixed(0)} g`} tone="or" icon={<Activity className="h-4 w-4" />} />
          </div>

          <Card>
            <CardBody>
              <div className="mb-2 text-sm font-semibold text-texte">Suivi du jour</div>
              <div className="grid grid-cols-12 items-end gap-2">
                <Field label="Mortalité" className="col-span-3"><Input type="number" value={mort} onChange={(e) => setMort(e.target.value)} /></Field>
                <Field label="Aliment (kg)" className="col-span-3"><Input type="number" value={aliment} onChange={(e) => setAliment(e.target.value)} /></Field>
                {isPonte && <Field label="Œufs collectés" className="col-span-4"><Input type="number" value={oeufs} onChange={(e) => setOeufs(e.target.value)} /></Field>}
                <div className={isPonte ? 'col-span-2' : 'col-span-6'}><Button variant="action" className="w-full justify-center" loading={addSuivi.isPending} onClick={() => addSuivi.mutate(undefined)}><Plus className="h-4 w-4" /> Ajouter</Button></div>
              </div>
            </CardBody>
          </Card>

          <Table>
            <THead><Th>Date</Th><Th align="right">Mortalité</Th><Th align="right">Aliment</Th>{isPonte && <Th align="right">Œufs</Th>}</THead>
            <TBody>
              {data.suivis.slice(0, 15).map((s) => (
                <Tr key={s.id as string}>
                  <Td className="text-xs text-texte-2">{formatDate(s.date_suivi as string)}</Td>
                  <Td align="right">{s.mortalite as number}</Td>
                  <Td align="right">{formatNumber(Math.round((s.aliment_g as number) / 1000 * 10) / 10)} kg</Td>
                  {isPonte && <Td align="right">{s.oeufs as number}</Td>}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Modal>
  );
}
