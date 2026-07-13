import { useState } from 'react';
import { Sprout, Plus, MapPin, Ruler, Leaf, TreePine, Wheat } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { formatSuperficie } from '../../lib/units';
import { formatDate, formatNumber } from '../../lib/format';

type Tab = 'parcelles' | 'campagnes' | 'cultures' | 'zones';
const TENURE: Record<string, string> = { propriete: 'Propriété', location: 'Location', pret_coutumier: 'Prêt coutumier' };
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

/** Rendement kg/ha depuis grammes récoltés et superficie en m². */
function rendementKgHa(grammes: number, m2: number): number {
  if (m2 <= 0) return 0;
  return (grammes / 1000) / (m2 / 10000);
}

export function AgriculturePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('parcelles');
  const [modal, setModal] = useState<Tab | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['agri'], async (coopId) => {
    const [parcelles, cultures, campagnes, zones, apports] = await Promise.all([
      supabase.from('coop_parcelles').select('*, coop_membres(nom, prenoms, numero)').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_cultures').select('*').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_campagnes_culturales').select('*, coop_parcelles(code, nom, superficie_m2), coop_cultures(nom)').eq('cooperative_id', coopId).order('created_at', { ascending: false }),
      supabase.from('coop_zones_collecte').select('*').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_apports').select('parcelle_id, quantite_base').eq('cooperative_id', coopId).not('parcelle_id', 'is', null),
    ]);
    const recolteParParcelle = new Map<string, number>();
    (apports.data ?? []).forEach((a: Record<string, unknown>) => {
      const k = a.parcelle_id as string;
      recolteParParcelle.set(k, (recolteParParcelle.get(k) ?? 0) + (a.quantite_base as number));
    });
    const parcs = (parcelles.data ?? []) as Record<string, unknown>[];
    const superficieTotale = parcs.reduce((s, p) => s + (p.superficie_m2 as number), 0);
    return {
      parcelles: parcs, cultures: cultures.data ?? [], campagnes: campagnes.data ?? [],
      zones: zones.data ?? [], recolteParParcelle, superficieTotale,
    };
  });

  return (
    <>
      <PageHeader
        title="Agriculture & cueillette"
        subtitle="Parcelles, campagnes culturales, itinéraires. Traçabilité parcelle → apport → lot (socle certifications)."
        icon={<Sprout className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(tab)}><Plus className="h-4 w-4" /> Ajouter</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Parcelles" value={data?.parcelles.length ?? 0} icon={<MapPin className="h-4 w-4" />} tone="primaire" />
        <Stat label="Superficie totale" value={formatSuperficie(data?.superficieTotale ?? 0)} icon={<Ruler className="h-4 w-4" />} tone="action" />
        <Stat label="Cultures" value={data?.cultures.length ?? 0} icon={<Wheat className="h-4 w-4" />} tone="or" />
        <Stat label="Zones de collecte" value={data?.zones.length ?? 0} icon={<TreePine className="h-4 w-4" />} tone="primaire" />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'parcelles', label: 'Parcelles', count: data?.parcelles.length },
        { key: 'campagnes', label: 'Campagnes culturales', count: data?.campagnes.length },
        { key: 'cultures', label: 'Cultures', count: data?.cultures.length },
        { key: 'zones', label: 'Zones (cueillette)', count: data?.zones.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'parcelles' && (
            !data?.parcelles.length ? <EmptyState icon={<MapPin className="h-8 w-8" />} title="Aucune parcelle" description="Enregistrez les parcelles de vos membres (superficie, tenure)." action={<Button variant="action" onClick={() => setModal('parcelles')}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <Card><Table>
              <THead><Th>Parcelle</Th><Th>Exploitant</Th><Th>Tenure</Th><Th align="right">Superficie</Th><Th align="right">Récolté</Th><Th align="right">Rendement</Th></THead>
              <TBody>
                {data.parcelles.map((p) => {
                  const m = p.coop_membres as { nom?: string; prenoms?: string } | null;
                  const recolte = data.recolteParParcelle.get(p.id as string) ?? 0;
                  const rdt = rendementKgHa(recolte, p.superficie_m2 as number);
                  return (
                    <Tr key={p.id as string}>
                      <Td><span className="font-medium text-texte">{(p.nom as string) || (p.code as string)}</span> <span className="mono text-xs text-texte-2">{p.code as string}</span><div className="text-xs text-texte-2">{(p.localite as string) ?? ''}</div></Td>
                      <Td className="text-sm">{m ? `${m.nom} ${m.prenoms ?? ''}` : '—'}</Td>
                      <Td><Badge tone="neutre">{TENURE[p.mode_tenure as string] ?? (p.mode_tenure as string)}</Badge></Td>
                      <Td align="right" className="text-sm font-medium">{formatSuperficie(p.superficie_m2 as number)}</Td>
                      <Td align="right" className="text-sm">{recolte > 0 ? `${formatNumber(Math.round(recolte / 1000))} kg` : '—'}</Td>
                      <Td align="right">{rdt > 0 ? <Badge tone="action">{rdt.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg/ha</Badge> : <span className="text-texte-2">—</span>}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table></Card>
          )}

          {tab === 'campagnes' && (
            !data?.campagnes.length ? <EmptyState icon={<Sprout className="h-8 w-8" />} title="Aucune campagne culturale" description="Reliez une culture à une parcelle avec son calendrier." action={<Button variant="action" onClick={() => setModal('campagnes')} disabled={!data?.parcelles.length}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <div className="space-y-3">
              {data.campagnes.map((c) => (
                <Card key={c.id as string}><CardBody className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-action" />
                      <span className="font-semibold text-texte">{(c.coop_cultures as { nom?: string } | null)?.nom ?? 'Culture'}</span>
                      <span className="text-sm text-texte-2">sur {(c.coop_parcelles as { nom?: string; code?: string } | null)?.nom ?? (c.coop_parcelles as { code?: string } | null)?.code}</span>
                    </div>
                    <div className="mt-1 text-xs text-texte-2">
                      {c.date_semis ? `Semis ${formatDate(c.date_semis as string)}` : 'Semis —'} · {c.date_recolte_prevue ? `Récolte prévue ${formatDate(c.date_recolte_prevue as string)}` : 'Récolte —'}
                      {Number(c.superficie_emblavee_m2) > 0 ? ` · ${formatSuperficie(c.superficie_emblavee_m2 as number)}` : ''}
                    </div>
                  </div>
                  <Badge tone={c.statut === 'recoltee' ? 'action' : 'or'} dot>{c.statut as string}</Badge>
                </CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'cultures' && (
            !data?.cultures.length ? <EmptyState icon={<Wheat className="h-8 w-8" />} title="Aucune culture" description="Déclarez vos cultures (maïs, riz, cacao, maraîchage…)." action={<Button variant="action" onClick={() => setModal('cultures')}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.cultures.map((c) => (
                <Card key={c.id as string}><CardBody className="flex items-center justify-between">
                  <div><h3 className="font-semibold text-texte">{c.nom as string}</h3><div className="text-xs text-texte-2">{c.cycle_jours ? `Cycle ${c.cycle_jours} j` : ''}</div></div>
                  <Badge tone={c.perenne ? 'primaire' : 'neutre'}>{c.type as string}</Badge>
                </CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'zones' && (
            !data?.zones.length ? <EmptyState icon={<TreePine className="h-8 w-8" />} title="Aucune zone de collecte" description="Pour la cueillette / PFNL (karité, anacarde, néré) : apports sans parcelle." action={<Button variant="action" onClick={() => setModal('zones')}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.zones.map((z) => (
                <Card key={z.id as string}><CardBody><h3 className="font-semibold text-texte">{z.nom as string}</h3><div className="text-xs text-texte-2">{(z.description as string) ?? ''}</div></CardBody></Card>
              ))}
            </div>
          )}
        </>
      )}

      {modal === 'parcelles' && <ParcelleForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Parcelle enregistrée')} />}
      {modal === 'cultures' && <CultureForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Culture créée')} />}
      {modal === 'zones' && <ZoneForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Zone créée')} />}
      {modal === 'campagnes' && <CampagneCulturaleForm parcelles={data?.parcelles ?? []} cultures={data?.cultures ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Campagne culturale créée')} />}
    </>
  );
}

function ParcelleForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [membre, setMembre] = useState<Picked | null>(null);
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [ha, setHa] = useState(''); const [tenure, setTenure] = useState('propriete'); const [localite, setLocalite] = useState('');
  const save = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.from('coop_parcelles').insert({
        cooperative_id: coopId, membre_id: membre?.id ?? null, code: code.toUpperCase(), nom: nom || null,
        superficie_m2: Math.round((Number(ha) || 0) * 10000), mode_tenure: tenure, localite: localite || null,
      });
      if (error) throw error;
    },
    { invalidate: ['agri'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Nouvelle parcelle"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Exploitant (membre)">
          {membre ? <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-2.5"><span className="text-sm font-medium">{membre.nom} {membre.prenoms}</span><Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button></div> : <MembrePicker value={null} onChange={setMembre} onlyActive={false} />}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="P-001" /></Field>
          <Field label="Nom" className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Champ derrière la case" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Superficie (ha)" required><Input type="number" step="0.01" value={ha} onChange={(e) => setHa(e.target.value)} placeholder="1.5" /></Field>
          <Field label="Tenure"><Select value={tenure} onChange={(e) => setTenure(e.target.value)}>{Object.entries(TENURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Localité"><Input value={localite} onChange={(e) => setLocalite(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function CultureForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [type, setType] = useState('vivriere'); const [cycle, setCycle] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_cultures').insert({ cooperative_id: coopId, code: code.toUpperCase(), nom, type, perenne: type === 'perenne', cycle_jours: cycle ? Number(cycle) : null }); if (error) throw error; },
    { invalidate: ['agri'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle culture"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !nom} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAIS" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Maïs" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="vivriere">Vivrière</option><option value="maraichage">Maraîchage</option><option value="perenne">Pérenne</option><option value="pfnl">PFNL / cueillette</option></Select></Field>
          <Field label="Cycle (jours)"><Input type="number" value={cycle} onChange={(e) => setCycle(e.target.value)} placeholder="120" /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ZoneForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [desc, setDesc] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_zones_collecte').insert({ cooperative_id: coopId, code: code.toUpperCase(), nom, description: desc || null }); if (error) throw error; },
    { invalidate: ['agri'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle zone de collecte" subtitle="Cueillette / PFNL — apports sans parcelle cultivée"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !nom} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Z-KARITE" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Brousse Nord" /></Field>
        </div>
        <Field label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Zone de collecte du karité" /></Field>
      </div>
    </Modal>
  );
}

function CampagneCulturaleForm({ parcelles, cultures, onClose, onDone }: { parcelles: Record<string, unknown>[]; cultures: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [parcelleId, setParcelleId] = useState(parcelles[0]?.id as string ?? '');
  const [cultureId, setCultureId] = useState('');
  const [semis, setSemis] = useState(''); const [recolte, setRecolte] = useState('');
  const parcelle = parcelles.find((p) => p.id === parcelleId);
  const save = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.from('coop_campagnes_culturales').insert({
        cooperative_id: coopId, parcelle_id: parcelleId, culture_id: cultureId || null,
        superficie_emblavee_m2: (parcelle?.superficie_m2 as number) ?? 0, date_semis: semis || null, date_recolte_prevue: recolte || null,
      });
      if (error) throw error;
    },
    { invalidate: ['agri'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle campagne culturale"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!parcelleId} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Parcelle"><Select value={parcelleId} onChange={(e) => setParcelleId(e.target.value)}>{parcelles.map((p) => <option key={p.id as string} value={p.id as string}>{(p.nom as string) || (p.code as string)}</option>)}</Select></Field>
          <Field label="Culture"><Select value={cultureId} onChange={(e) => setCultureId(e.target.value)}><option value="">—</option>{cultures.map((c) => <option key={c.id as string} value={c.id as string}>{c.nom as string}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de semis"><Input type="date" value={semis} onChange={(e) => setSemis(e.target.value)} /></Field>
          <Field label="Récolte prévue"><Input type="date" value={recolte} onChange={(e) => setRecolte(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}
