import { useState, useMemo } from 'react';
import { Tractor, Plus, ClipboardList, Fuel, TrendingUp, Check } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { formatFcfaText } from '../../lib/money';
import { formatDate } from '../../lib/format';
import type { CoopCaisse } from '../../domain/database.types';

const CURRENT_YEAR = new Date().getFullYear();
type Tab = 'ordres' | 'catalogue' | 'rentabilite';
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

export function ServicesPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('ordres');
  const [modal, setModal] = useState<null | 'prestation' | 'ordre'>(null);

  const { data, isLoading, refetch } = useCoopQuery(['services'], async (coopId) => {
    const [prestations, ordres, immos, maint, plans, caisses] = await Promise.all([
      supabase.from('coop_catalogue_prestations').select('*, coop_immobilisations(nom)').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_ordres_prestation').select('*, coop_catalogue_prestations(nom, unite), coop_membres(nom, prenoms), coop_immobilisations(nom)').eq('cooperative_id', coopId).order('date_prestation', { ascending: false }).limit(30),
      supabase.from('coop_immobilisations').select('id, nom, code').eq('cooperative_id', coopId).eq('statut', 'actif').order('nom'),
      supabase.from('coop_maintenances').select('immobilisation_id, cout_xof').eq('cooperative_id', coopId),
      supabase.from('coop_plans_amortissement').select('immobilisation_id, dotation_xof, annee').eq('cooperative_id', coopId).eq('annee', CURRENT_YEAR),
      supabase.from('coop_caisses').select('*').eq('cooperative_id', coopId).eq('actif', true).order('code'),
    ]);
    const ordreRows = ordres.data ?? [];
    const recettes = ordreRows.reduce((s: number, o: Record<string, unknown>) => s + (o.montant_xof as number), 0);
    return {
      prestations: prestations.data ?? [], ordres: ordreRows, immos: immos.data ?? [],
      maint: maint.data ?? [], plans: plans.data ?? [], caisses: (caisses.data ?? []) as CoopCaisse[], recettes,
    };
  });

  // Rentabilité par équipement
  const rentabilite = useMemo(() => {
    if (!data) return [];
    return data.immos.map((im: Record<string, unknown>) => {
      const id = im.id as string;
      const recettes = data.ordres.filter((o: Record<string, unknown>) => o.immobilisation_id === id).reduce((s: number, o: Record<string, unknown>) => s + (o.montant_xof as number), 0);
      const carburant = data.ordres.filter((o: Record<string, unknown>) => o.immobilisation_id === id).reduce((s: number, o: Record<string, unknown>) => s + (o.carburant_xof as number), 0);
      const maintenance = data.maint.filter((m: Record<string, unknown>) => m.immobilisation_id === id).reduce((s: number, m: Record<string, unknown>) => s + (m.cout_xof as number), 0);
      const dotation = data.plans.filter((p: Record<string, unknown>) => p.immobilisation_id === id).reduce((s: number, p: Record<string, unknown>) => s + (p.dotation_xof as number), 0);
      return { id, nom: im.nom as string, recettes, carburant, maintenance, dotation, net: recettes - carburant - maintenance - dotation };
    }).filter((r) => r.recettes > 0 || r.carburant > 0);
  }, [data]);

  return (
    <>
      <PageHeader
        title="Services & locations aux membres"
        subtitle="Matériel mutualisé, prestations tarifées, rentabilité par équipement."
        icon={<Tractor className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(tab === 'catalogue' ? 'prestation' : 'ordre')} disabled={tab !== 'catalogue' && !data?.prestations.length}><Plus className="h-4 w-4" /> {tab === 'catalogue' ? 'Prestation' : 'Ordre'}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Recettes prestations" value={<Money value={data?.recettes ?? 0} suffix={false} size="lg" />} tone="or" icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Prestations catalogue" value={data?.prestations.length ?? 0} tone="primaire" icon={<ClipboardList className="h-4 w-4" />} />
        <Stat label="Ordres réalisés" value={data?.ordres.length ?? 0} tone="action" icon={<Tractor className="h-4 w-4" />} />
        <Stat label="Équipements suivis" value={rentabilite.length} tone="primaire" icon={<Fuel className="h-4 w-4" />} />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'ordres', label: 'Ordres de prestation', count: data?.ordres.length },
        { key: 'rentabilite', label: 'Rentabilité équipement', count: rentabilite.length },
        { key: 'catalogue', label: 'Catalogue', count: data?.prestations.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'ordres' && (
            !data?.ordres.length ? <EmptyState icon={<Tractor className="h-8 w-8" />} title="Aucun ordre" description="Enregistrez une prestation réalisée (labour, transport, décorticage, location)." action={<Button variant="action" onClick={() => setModal('ordre')} disabled={!data?.prestations.length}><Plus className="h-4 w-4" /> Ordre</Button>} /> :
            <Card><Table>
              <THead><Th>Date</Th><Th>Prestation</Th><Th>Bénéficiaire</Th><Th align="right">Quantité</Th><Th align="right">Carburant</Th><Th align="right">Montant</Th></THead>
              <TBody>
                {data.ordres.map((o: Record<string, unknown>) => {
                  const m = o.coop_membres as { nom?: string; prenoms?: string } | null;
                  const pr = o.coop_catalogue_prestations as { nom?: string; unite?: string } | null;
                  return (
                    <Tr key={o.id as string}>
                      <Td className="text-xs text-texte-2">{formatDate(o.date_prestation as string)}</Td>
                      <Td className="font-medium text-texte">{pr?.nom ?? '—'}</Td>
                      <Td className="text-sm">{m ? `${m.nom} ${m.prenoms ?? ''}` : 'tiers'}</Td>
                      <Td align="right">{Number(o.quantite)} {pr?.unite ?? ''}</Td>
                      <Td align="right">{Number(o.carburant_xof) > 0 ? <Money value={o.carburant_xof as number} size="sm" colorNegative /> : '—'}</Td>
                      <Td align="right"><Money value={o.montant_xof as number} size="sm" /></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table></Card>
          )}

          {tab === 'rentabilite' && (
            !rentabilite.length ? <EmptyState icon={<Fuel className="h-8 w-8" />} title="Aucune donnée" description="Réalisez des prestations sur vos équipements pour voir leur rentabilité." /> :
            <Card>
              <CardHeader title="Rentabilité par équipement" subtitle="« Le tracteur gagne-t-il de l'argent ? » — recettes vs carburant + maintenance + amortissement" icon={<Fuel className="h-5 w-5" />} />
              <CardBody className="p-0"><Table>
                <THead><Th>Équipement</Th><Th align="right">Recettes</Th><Th align="right">Carburant</Th><Th align="right">Maintenance</Th><Th align="right">Amort. {CURRENT_YEAR}</Th><Th align="right">Résultat net</Th></THead>
                <TBody>
                  {rentabilite.map((r) => (
                    <Tr key={r.id}>
                      <Td className="font-medium text-texte">{r.nom}</Td>
                      <Td align="right"><Money value={r.recettes} size="sm" suffix={false} /></Td>
                      <Td align="right" className="text-alerte"><Money value={-r.carburant} size="sm" suffix={false} /></Td>
                      <Td align="right" className="text-alerte"><Money value={-r.maintenance} size="sm" suffix={false} /></Td>
                      <Td align="right" className="text-alerte"><Money value={-r.dotation} size="sm" suffix={false} /></Td>
                      <Td align="right"><Badge tone={r.net >= 0 ? 'action' : 'alerte'}><Money value={r.net} size="sm" suffix={false} colorNegative /></Badge></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table></CardBody>
            </Card>
          )}

          {tab === 'catalogue' && (
            !data?.prestations.length ? <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="Aucune prestation" description="Créez votre catalogue (labour/ha, transport/km, décorticage/sac, location/jour)." action={<Button variant="action" onClick={() => setModal('prestation')}><Plus className="h-4 w-4" /> Prestation</Button>} /> :
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.prestations.map((p: Record<string, unknown>) => (
                <Card key={p.id as string}><CardBody>
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-texte">{p.nom as string}</h3><Badge tone="neutre">{p.type as string}</Badge></div>
                  <div className="mt-1 text-xs text-texte-2">{(p.coop_immobilisations as { nom?: string } | null)?.nom ?? 'Sans équipement'}</div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>Membre : <Money value={p.tarif_membre_xof as number} size="sm" /></span>
                    <span className="text-texte-2">/ {p.unite as string}</span>
                  </div>
                  <div className="text-sm">Tiers : <Money value={p.tarif_tiers_xof as number} size="sm" /></div>
                </CardBody></Card>
              ))}
            </div>
          )}
        </>
      )}

      {modal === 'prestation' && <PrestationForm immos={data?.immos ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Prestation créée')} />}
      {modal === 'ordre' && <OrdreForm data={data!} onClose={() => { setModal(null); refetch(); }} onDone={(m) => push('success', m)} />}
    </>
  );
}

function PrestationForm({ immos, onClose, onDone }: { immos: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [type, setType] = useState('location'); const [unite, setUnite] = useState('jour');
  const [immoId, setImmoId] = useState(''); const [tarifM, setTarifM] = useState(''); const [tarifT, setTarifT] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_catalogue_prestations').insert({ cooperative_id: coopId, code: code.toUpperCase(), nom, type, unite, immobilisation_id: immoId || null, tarif_membre_xof: Number(tarifM) || 0, tarif_tiers_xof: Number(tarifT) || 0 }); if (error) throw error; },
    { invalidate: ['services'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle prestation"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !nom} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LABOUR" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Labour à façon" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="location">Location</option><option value="labour">Labour</option><option value="transport">Transport</option><option value="decorticage">Décorticage</option><option value="stockage">Stockage</option></Select></Field>
          <Field label="Unité"><Select value={unite} onChange={(e) => setUnite(e.target.value)}><option value="heure">Heure</option><option value="jour">Jour</option><option value="ha">Hectare</option><option value="km">Kilomètre</option><option value="sac">Sac</option><option value="course">Course</option></Select></Field>
        </div>
        <Field label="Équipement (immobilisation)"><Select value={immoId} onChange={(e) => setImmoId(e.target.value)}><option value="">— aucun —</option>{immos.map((i) => <option key={i.id as string} value={i.id as string}>{i.nom as string}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tarif membre (FCFA/unité)"><Input type="number" value={tarifM} onChange={(e) => setTarifM(e.target.value)} /></Field>
          <Field label="Tarif tiers (FCFA/unité)"><Input type="number" value={tarifT} onChange={(e) => setTarifT(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function OrdreForm({ data, onClose, onDone }: {
  data: { prestations: Record<string, unknown>[]; caisses: CoopCaisse[] };
  onClose: () => void; onDone: (m: string) => void;
}) {
  const { push } = useToast();
  const [prestationId, setPrestationId] = useState(data.prestations[0]?.id as string ?? '');
  const [membre, setMembre] = useState<Picked | null>(null);
  const [estTiers, setEstTiers] = useState(false);
  const [quantite, setQuantite] = useState(''); const [carburant, setCarburant] = useState(''); const [operateur, setOperateur] = useState('');
  const [mode, setMode] = useState('comptant'); const [caisseId, setCaisseId] = useState(data.caisses[0]?.id ?? '');

  const prestation = data.prestations.find((p) => p.id === prestationId);
  const tarif = prestation ? (estTiers ? (prestation.tarif_tiers_xof as number) : (prestation.tarif_membre_xof as number)) : 0;
  const montant = Math.round((Number(quantite) || 0) * tarif);

  const save = useCoopMutation(
    async (coopId) => {
      if (!prestation) throw new Error('Prestation requise');
      if (!estTiers && !membre) throw new Error('Membre requis');
      const { data: ordre, error } = await supabase.from('coop_ordres_prestation').insert({
        cooperative_id: coopId, prestation_id: prestationId, immobilisation_id: prestation.immobilisation_id ?? null,
        membre_id: estTiers ? null : membre?.id, quantite: Number(quantite) || 0, montant_xof: montant,
        carburant_xof: Number(carburant) || 0, mode_paiement: mode, operateur: operateur || null,
      }).select('id').single();
      if (error) throw error;
      if (mode === 'comptant' || mode === 'mobile_money') {
        await supabase.from('coop_operations_tresorerie').insert({ cooperative_id: coopId, caisse_id: caisseId || null, sens: 'credit', montant_xof: montant, nature: 'prestation ' + (prestation.nom as string), mode: mode === 'comptant' ? 'espece' : 'mobile_money', source_type: 'ordre_prestation', source_id: ordre.id });
      } else if (mode === 'credit_membre' && membre) {
        await supabase.from('coop_mouvements_compte_membre').insert({ cooperative_id: coopId, membre_id: membre.id, sens: 'debit', nature: 'achat_credit', montant_xof: montant, piece_type: 'ordre_prestation', piece_id: ordre.id, libelle: 'Service : ' + (prestation.nom as string) });
      }
    },
    { invalidate: ['services', 'tresorerie', 'dashboard', 'membres'], onSuccess: () => { onDone(`Prestation enregistrée · ${formatFcfaText(montant)}`); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="lg" title="Ordre de prestation" subtitle="Exécution tracée + facturation"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!prestationId || montant <= 0} onClick={() => { if ((mode === 'comptant' || mode === 'mobile_money') && !caisseId) { push('error', 'Aucune caisse — créez-en une (Trésorerie)'); return; } save.mutate(undefined); }}><Check className="h-4 w-4" /> Valider ({formatFcfaText(montant)})</Button></>}>
      <div className="space-y-4">
        <Field label="Prestation"><Select value={prestationId} onChange={(e) => setPrestationId(e.target.value)}>{data.prestations.map((p) => <option key={p.id as string} value={p.id as string}>{p.nom as string} ({estTiers ? formatFcfaText(p.tarif_tiers_xof as number) : formatFcfaText(p.tarif_membre_xof as number)}/{p.unite as string})</option>)}</Select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={estTiers} onChange={(e) => { setEstTiers(e.target.checked); if (e.target.checked) setMembre(null); }} className="h-4 w-4 rounded border-ligne text-action" /> Bénéficiaire tiers (tarif tiers)</label>
        {!estTiers && (membre ? <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-2.5"><span className="text-sm font-medium">{membre.nom} {membre.prenoms}</span><Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button></div> : <MembrePicker value={null} onChange={setMembre} />)}
        <div className="grid grid-cols-3 gap-3">
          <Field label={`Quantité (${(prestation?.unite as string) ?? ''})`} required><Input type="number" step="0.01" value={quantite} onChange={(e) => setQuantite(e.target.value)} /></Field>
          <Field label="Carburant (FCFA)"><Input type="number" value={carburant} onChange={(e) => setCarburant(e.target.value)} /></Field>
          <Field label="Opérateur"><Input value={operateur} onChange={(e) => setOperateur(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paiement"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="comptant">Comptant (caisse)</option><option value="mobile_money">Mobile Money</option>{!estTiers && <option value="credit_membre">Crédit membre</option>}</Select></Field>
          {(mode === 'comptant' || mode === 'mobile_money') && data.caisses.length > 0 && <Field label="Caisse"><Select value={caisseId} onChange={(e) => setCaisseId(e.target.value)}>{data.caisses.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}</Select></Field>}
        </div>
      </div>
    </Modal>
  );
}
