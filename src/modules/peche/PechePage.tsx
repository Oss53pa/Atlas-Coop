import { useState } from 'react';
import { Fish, Plus, Users, Waves, Anchor, Trash2, Droplets, Scale } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { formatFcfaText } from '../../lib/money';
import { formatDate, formatNumber } from '../../lib/format';
import { formatBp } from '../../lib/rates';

type Tab = 'peche' | 'aquaculture';
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }
interface Crew { membre_id: string; nom: string; quote_part_bp: number }

/** Répartit `total` selon les quote-parts (bp), reliquat aux plus grosses parts. */
function splitByQuote(total: number, crew: Crew[]): (Crew & { montant: number })[] {
  const totalBp = crew.reduce((s, c) => s + c.quote_part_bp, 0) || 10000;
  let allocated = 0;
  const res = crew.map((c) => { const m = Math.floor((total * c.quote_part_bp) / totalBp); allocated += m; return { ...c, montant: m }; });
  res.sort((a, b) => b.quote_part_bp - a.quote_part_bp);
  let rem = total - allocated;
  for (let i = 0; i < res.length && rem > 0; i++) { res[i].montant += 1; rem -= 1; }
  return res;
}

/** Indice de consommation d'un cycle (kg aliment / kg gain). */
function computeIC(cycle: Record<string, unknown>, aliments: Record<string, unknown>[], controles: Record<string, unknown>[]): { ic: number | null; biomasse: number; gain: number } {
  const totalAliment = aliments.reduce((s, a) => s + (a.quantite_g as number), 0);
  const biomasseInit = (cycle.nb_alevins as number) * (cycle.poids_alevin_g as number);
  let biomasse: number;
  if (cycle.statut === 'recolte' && cycle.poids_total_recolte_g) {
    biomasse = cycle.poids_total_recolte_g as number;
  } else {
    const latest = controles[0];
    const survivants = (cycle.nb_alevins as number) - (cycle.mortalite as number);
    biomasse = latest ? survivants * (latest.poids_moyen_g as number) : biomasseInit;
  }
  const gain = biomasse - biomasseInit;
  return { ic: gain > 0 ? totalAliment / gain : null, biomasse, gain };
}

export function PechePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('peche');
  const [modal, setModal] = useState<null | 'equipage' | 'debarquement' | 'bassin' | 'cycle'>(null);
  const [cycleDetail, setCycleDetail] = useState<string | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['peche'], async (coopId) => {
    const [equipages, debarquements, bassins, cycles, aliments, controles] = await Promise.all([
      supabase.from('coop_equipages').select('*').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_debarquements').select('*, coop_equipages(nom), coop_produits(nom, unite_affichage)').eq('cooperative_id', coopId).order('date_debarquement', { ascending: false }).limit(20),
      supabase.from('coop_bassins').select('*, coop_membres(nom, prenoms)').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_cycles_aquacoles').select('*, coop_bassins(code, nom)').eq('cooperative_id', coopId).order('date_empoissonnement', { ascending: false }),
      supabase.from('coop_distributions_aliment').select('cycle_id, quantite_g').eq('cooperative_id', coopId),
      supabase.from('coop_peches_controle').select('cycle_id, poids_moyen_g, date_controle').eq('cooperative_id', coopId).order('date_controle', { ascending: false }),
    ]);
    const alByCycle = new Map<string, Record<string, unknown>[]>();
    (aliments.data ?? []).forEach((a: Record<string, unknown>) => { const k = a.cycle_id as string; (alByCycle.get(k) ?? alByCycle.set(k, []).get(k)!).push(a); });
    const ctByCycle = new Map<string, Record<string, unknown>[]>();
    (controles.data ?? []).forEach((c: Record<string, unknown>) => { const k = c.cycle_id as string; (ctByCycle.get(k) ?? ctByCycle.set(k, []).get(k)!).push(c); });
    return { equipages: equipages.data ?? [], debarquements: debarquements.data ?? [], bassins: bassins.data ?? [], cycles: cycles.data ?? [], alByCycle, ctByCycle };
  });

  const addBtn = { peche: 'debarquement', aquaculture: 'cycle' } as const;

  return (
    <>
      <PageHeader
        title="Pêche & aquaculture"
        subtitle="Débarquements répartis à l'équipage · cycles aquacoles avec indice de consommation."
        icon={<Fish className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(addBtn[tab])} disabled={tab === 'peche' ? !data?.equipages.length : !data?.bassins.length}><Plus className="h-4 w-4" /> {tab === 'peche' ? 'Débarquement' : 'Cycle'}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Équipages" value={data?.equipages.length ?? 0} icon={<Users className="h-4 w-4" />} tone="primaire" />
        <Stat label="Débarquements" value={data?.debarquements.length ?? 0} icon={<Anchor className="h-4 w-4" />} tone="action" />
        <Stat label="Bassins / cages" value={data?.bassins.length ?? 0} icon={<Droplets className="h-4 w-4" />} tone="or" />
        <Stat label="Cycles en cours" value={data?.cycles.filter((c: Record<string, unknown>) => c.statut === 'en_cours').length ?? 0} icon={<Waves className="h-4 w-4" />} tone="primaire" />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'peche', label: 'Pêche de capture', count: data?.debarquements.length },
        { key: 'aquaculture', label: 'Aquaculture', count: data?.cycles.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'peche' && (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Équipages" icon={<Users className="h-5 w-5" />} action={<Button variant="outline" size="sm" onClick={() => setModal('equipage')}><Plus className="h-4 w-4" /> Équipage</Button>} />
                <CardBody className="p-0">
                  {!data?.equipages.length ? <EmptyState title="Aucun équipage" description="Créez un équipage et définissez les quote-parts de répartition." /> :
                    <ul className="divide-y divide-ligne/60">
                      {data.equipages.map((e: Record<string, unknown>) => (
                        <li key={e.id as string} className="flex items-center justify-between px-5 py-3">
                          <span className="font-medium text-texte">{e.nom as string}</span>
                          <Badge tone="neutre">{((e.membres as unknown[]) ?? []).length} membres</Badge>
                        </li>
                      ))}
                    </ul>}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Débarquements" subtitle="Valeur répartie sur les comptes des membres de l'équipage" icon={<Anchor className="h-5 w-5" />} />
                <CardBody className="p-0">
                  {!data?.debarquements.length ? <EmptyState title="Aucun débarquement" description="Enregistrez un débarquement : la valeur est répartie et créditée aux membres." action={<Button variant="action" onClick={() => setModal('debarquement')} disabled={!data?.equipages.length}><Plus className="h-4 w-4" /> Débarquement</Button>} /> :
                    <Table>
                      <THead><Th>Date</Th><Th>Équipage</Th><Th>Produit</Th><Th align="right">Quantité</Th><Th align="right">Valeur</Th></THead>
                      <TBody>
                        {data.debarquements.map((d: Record<string, unknown>) => (
                          <Tr key={d.id as string}>
                            <Td className="text-xs text-texte-2">{formatDate(d.date_debarquement as string)}</Td>
                            <Td className="font-medium text-texte">{(d.coop_equipages as { nom?: string } | null)?.nom ?? '—'}</Td>
                            <Td className="text-sm">{(d.coop_produits as { nom?: string } | null)?.nom ?? '—'}</Td>
                            <Td align="right">{formatNumber(Math.round((d.quantite_base as number) / 1000))} kg</Td>
                            <Td align="right"><Money value={d.montant_xof as number} size="sm" /></Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>}
                </CardBody>
              </Card>
            </div>
          )}

          {tab === 'aquaculture' && (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Bassins & cages" icon={<Droplets className="h-5 w-5" />} action={<Button variant="outline" size="sm" onClick={() => setModal('bassin')}><Plus className="h-4 w-4" /> Bassin</Button>} />
                <CardBody className="p-0">
                  {!data?.bassins.length ? <EmptyState title="Aucun ouvrage" description="Enregistrez vos bassins ou cages." /> :
                    <ul className="divide-y divide-ligne/60">
                      {data.bassins.map((b: Record<string, unknown>) => (
                        <li key={b.id as string} className="flex items-center justify-between px-5 py-3">
                          <div><span className="font-medium text-texte">{(b.nom as string) || (b.code as string)}</span> <span className="mono text-xs text-texte-2">{b.code as string}</span></div>
                          <Badge tone="neutre">{b.type as string}{b.volume_m3 ? ` · ${b.volume_m3} m³` : ''}</Badge>
                        </li>
                      ))}
                    </ul>}
                </CardBody>
              </Card>

              {!data?.cycles.length ? <EmptyState icon={<Waves className="h-8 w-8" />} title="Aucun cycle" description="Empoissonnez un bassin (alevins) et suivez l'alimentation pour l'indice de consommation." action={<Button variant="action" onClick={() => setModal('cycle')} disabled={!data?.bassins.length}><Plus className="h-4 w-4" /> Nouveau cycle</Button>} /> :
                <div className="grid gap-4 md:grid-cols-2">
                  {data.cycles.map((c: Record<string, unknown>) => {
                    const { ic } = computeIC(c, data.alByCycle.get(c.id as string) ?? [], data.ctByCycle.get(c.id as string) ?? []);
                    return (
                      <Card key={c.id as string} className="cursor-pointer transition hover:shadow-carte-hover">
                        <CardBody onClick={() => setCycleDetail(c.id as string)}>
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-texte">{c.espece as string} <span className="mono text-xs text-texte-2">{c.code as string}</span></h3>
                              <div className="text-xs text-texte-2">{(c.coop_bassins as { code?: string } | null)?.code} · {formatNumber(c.nb_alevins as number)} alevins · empoisson. {formatDate(c.date_empoissonnement as string)}</div>
                            </div>
                            <Badge tone={c.statut === 'recolte' ? 'action' : 'or'} dot>{c.statut as string}</Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-lg bg-surface-2 p-2"><div className={`text-base font-bold ${ic !== null && ic <= 2 ? 'text-action' : ic !== null ? 'text-alerte' : 'text-texte-2'}`}>{ic !== null ? ic.toFixed(2) : '—'}</div><div className="text-[11px] text-texte-2">Indice conso (kg/kg)</div></div>
                            <div className="rounded-lg bg-surface-2 p-2"><div className="text-base font-bold text-texte">{formatNumber(c.mortalite as number)}</div><div className="text-[11px] text-texte-2">Mortalité</div></div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>}
            </div>
          )}
        </>
      )}

      {modal === 'equipage' && <EquipageForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Équipage créé')} />}
      {modal === 'debarquement' && <DebarquementForm equipages={data?.equipages ?? []} onClose={() => { setModal(null); refetch(); }} onDone={(m) => push('success', m)} />}
      {modal === 'bassin' && <BassinForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Bassin créé')} />}
      {modal === 'cycle' && <CycleForm bassins={data?.bassins ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Cycle démarré')} />}
      {cycleDetail && <CycleDetail cycleId={cycleDetail} onClose={() => { setCycleDetail(null); refetch(); }} />}
    </>
  );
}

function EquipageForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [nom, setNom] = useState('');
  const [crew, setCrew] = useState<Crew[]>([]);
  const addMember = (m: Picked) => {
    if (crew.some((c) => c.membre_id === m.id)) return;
    const next = [...crew, { membre_id: m.id, nom: `${m.nom} ${m.prenoms ?? ''}`.trim(), quote_part_bp: 0 }];
    const eq = Math.floor(10000 / next.length);
    setCrew(next.map((c, i) => ({ ...c, quote_part_bp: i === 0 ? 10000 - eq * (next.length - 1) : eq })));
  };
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_equipages').insert({ cooperative_id: coopId, nom, membres: crew }); if (error) throw error; },
    { invalidate: ['peche'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Nouvel équipage"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!nom || !crew.length} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom de l'équipage" required><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Pirogue Fanta" /></Field>
        {crew.length > 0 && (
          <div className="space-y-1 rounded-lg border border-ligne p-2">
            {crew.map((c) => (
              <div key={c.membre_id} className="flex items-center justify-between text-sm">
                <span>{c.nom}</span>
                <span className="flex items-center gap-2"><span className="text-texte-2">{formatBp(c.quote_part_bp, 0)}</span><button onClick={() => setCrew((p) => p.filter((x) => x.membre_id !== c.membre_id))} className="text-texte-2 hover:text-alerte"><Trash2 className="h-3.5 w-3.5" /></button></span>
              </div>
            ))}
          </div>
        )}
        <Field label="Ajouter un membre (quote-parts égales auto)"><MembrePicker value={null} onChange={addMember} /></Field>
      </div>
    </Modal>
  );
}

function DebarquementForm({ equipages, onClose, onDone }: { equipages: Record<string, unknown>[]; onClose: () => void; onDone: (m: string) => void }) {
  const [equipageId, setEquipageId] = useState(equipages[0]?.id as string ?? '');
  const [produit, setProduit] = useState(''); const [qty, setQty] = useState(''); const [prix, setPrix] = useState('');
  const equipage = equipages.find((e) => e.id === equipageId);
  const crew = (equipage?.membres as Crew[]) ?? [];
  const montant = Math.round((Number(qty) || 0) * (Number(prix) || 0));
  const repartition = montant > 0 && crew.length ? splitByQuote(montant, crew) : [];

  const save = useCoopMutation(
    async (coopId) => {
      // find-or-create produit
      const { data: existing } = await supabase.from('coop_produits').select('id').eq('cooperative_id', coopId).ilike('nom', produit).limit(1);
      let produitId = existing?.[0]?.id as string | undefined;
      if (!produitId) {
        const code = produit.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 16) + '_' + Math.random().toString(36).slice(2, 5);
        const { data: prod, error } = await supabase.from('coop_produits').insert({ cooperative_id: coopId, code, nom: produit, type: 'matiere', unite_base: 'g', unite_affichage: 'kg' }).select('id').single();
        if (error) throw error; produitId = prod.id;
      }
      const { data: deb, error: de } = await supabase.from('coop_debarquements').insert({
        cooperative_id: coopId, equipage_id: equipageId, produit_id: produitId,
        quantite_base: Math.round((Number(qty) || 0) * 1000), montant_xof: montant,
      }).select('id').single();
      if (de) throw de;
      for (const r of repartition) {
        const { data: mvt } = await supabase.from('coop_mouvements_compte_membre').insert({
          cooperative_id: coopId, membre_id: r.membre_id, sens: 'credit', nature: 'apport', montant_xof: r.montant,
          piece_type: 'debarquement', piece_id: deb.id, libelle: `Part débarquement (${formatBp(r.quote_part_bp, 0)})`,
        }).select('id').single();
        await supabase.from('coop_repartitions_equipage').insert({ cooperative_id: coopId, debarquement_id: deb.id, membre_id: r.membre_id, quote_part_bp: r.quote_part_bp, montant_xof: r.montant, mouvement_id: mvt?.id ?? null });
      }
    },
    { invalidate: ['peche', 'dashboard', 'membres', 'comptes'], onSuccess: () => { onDone(`Débarquement réparti · ${formatFcfaText(montant)} crédité à ${repartition.length} membres`); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="lg" title="Nouveau débarquement" subtitle="Répartition automatique aux membres de l'équipage"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!equipageId || !produit || montant <= 0 || !crew.length} onClick={() => save.mutate(undefined)}>Valider & répartir</Button></>}>
      <div className="space-y-4">
        <Field label="Équipage"><Select value={equipageId} onChange={(e) => setEquipageId(e.target.value)}>{equipages.map((e) => <option key={e.id as string} value={e.id as string}>{e.nom as string}</option>)}</Select></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Produit" required><Input value={produit} onChange={(e) => setProduit(e.target.value)} placeholder="Tilapia" /></Field>
          <Field label="Quantité (kg)" required><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Prix / kg" required><Input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} /></Field>
        </div>
        {repartition.length > 0 && (
          <div className="rounded-lg border border-ligne p-2">
            <div className="mb-1 text-xs font-semibold text-texte-2">Répartition ({formatFcfaText(montant)})</div>
            {repartition.map((r) => <div key={r.membre_id} className="flex justify-between text-sm"><span>{r.nom} <span className="text-texte-2">({formatBp(r.quote_part_bp, 0)})</span></span><Money value={r.montant} size="sm" /></div>)}
          </div>
        )}
      </div>
    </Modal>
  );
}

function BassinForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [type, setType] = useState('bassin'); const [volume, setVolume] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_bassins').insert({ cooperative_id: coopId, code: code.toUpperCase(), nom: nom || null, type, volume_m3: volume ? Number(volume) : null }); if (error) throw error; },
    { invalidate: ['peche'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouveau bassin / cage"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BAS-1" /></Field>
          <Field label="Nom" className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="bassin">Bassin</option><option value="cage">Cage</option></Select></Field>
          <Field label="Volume (m³)"><Input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function CycleForm({ bassins, onClose, onDone }: { bassins: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [bassinId, setBassinId] = useState(bassins[0]?.id as string ?? '');
  const [code, setCode] = useState(''); const [espece, setEspece] = useState(''); const [nbAlevins, setNbAlevins] = useState(''); const [poidsAlevin, setPoidsAlevin] = useState(''); const [souche, setSouche] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_cycles_aquacoles').insert({ cooperative_id: coopId, bassin_id: bassinId, code: code.toUpperCase(), espece, nb_alevins: Number(nbAlevins) || 0, poids_alevin_g: Number(poidsAlevin) || 0, souche: souche || null }); if (error) throw error; },
    { invalidate: ['peche'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Nouveau cycle d'élevage" subtitle="Empoissonnement"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!bassinId || !code || !espece} onClick={() => save.mutate(undefined)}>Démarrer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bassin"><Select value={bassinId} onChange={(e) => setBassinId(e.target.value)}>{bassins.map((b) => <option key={b.id as string} value={b.id as string}>{(b.nom as string) || (b.code as string)}</option>)}</Select></Field>
          <Field label="Code cycle" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CYC-01" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Espèce" required><Input value={espece} onChange={(e) => setEspece(e.target.value)} placeholder="Tilapia" /></Field>
          <Field label="Nb alevins"><Input type="number" value={nbAlevins} onChange={(e) => setNbAlevins(e.target.value)} placeholder="2000" /></Field>
          <Field label="Poids alevin (g)"><Input type="number" value={poidsAlevin} onChange={(e) => setPoidsAlevin(e.target.value)} placeholder="5" /></Field>
        </div>
        <Field label="Souche / fournisseur"><Input value={souche} onChange={(e) => setSouche(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function CycleDetail({ cycleId, onClose }: { cycleId: string; onClose: () => void }) {
  const { push } = useToast();
  const [aliment, setAliment] = useState(''); const [poids, setPoids] = useState(''); const [ech, setEch] = useState('');
  const { data, isLoading, refetch } = useCoopQuery(['cycle', cycleId], async () => {
    const [cycle, aliments, controles] = await Promise.all([
      supabase.from('coop_cycles_aquacoles').select('*, coop_bassins(code)').eq('id', cycleId).single(),
      supabase.from('coop_distributions_aliment').select('*').eq('cycle_id', cycleId).order('date_distribution', { ascending: false }),
      supabase.from('coop_peches_controle').select('*').eq('cycle_id', cycleId).order('date_controle', { ascending: false }),
    ]);
    return { cycle: cycle.data as Record<string, unknown>, aliments: (aliments.data ?? []) as Record<string, unknown>[], controles: (controles.data ?? []) as Record<string, unknown>[] };
  });

  const addAliment = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_distributions_aliment').insert({ cooperative_id: coopId, cycle_id: cycleId, quantite_g: Math.round((Number(aliment) || 0) * 1000) }); if (error) throw error; },
    { invalidate: ['cycle', 'peche'], onSuccess: () => { push('success', 'Distribution enregistrée'); setAliment(''); refetch(); } },
  );
  const addControle = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_peches_controle').insert({ cooperative_id: coopId, cycle_id: cycleId, echantillon_n: Number(ech) || 0, poids_moyen_g: Number(poids) || 0 }); if (error) throw error; },
    { invalidate: ['cycle', 'peche'], onSuccess: () => { push('success', 'Pêche de contrôle enregistrée'); setPoids(''); setEch(''); refetch(); } },
  );

  const kpi = data ? computeIC(data.cycle, data.aliments, data.controles) : null;

  return (
    <Modal open onClose={onClose} size="xl" title={`Cycle ${(data?.cycle.code as string) ?? ''}`} subtitle={data ? `${data.cycle.espece} · ${formatNumber(data.cycle.nb_alevins as number)} alevins · bassin ${(data.cycle.coop_bassins as { code?: string } | null)?.code}` : ''}
      footer={<Button variant="outline" onClick={onClose}>Fermer</Button>}>
      {isLoading || !data || !kpi ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Indice de consommation" value={kpi.ic !== null ? `${kpi.ic.toFixed(2)} kg/kg` : '—'} tone={kpi.ic !== null && kpi.ic <= 2 ? 'action' : 'alerte'} icon={<Scale className="h-4 w-4" />} />
            <Stat label="Biomasse estimée" value={`${formatNumber(Math.round(kpi.biomasse / 1000))} kg`} tone="primaire" icon={<Fish className="h-4 w-4" />} />
            <Stat label="Gain de poids" value={`${formatNumber(Math.round(kpi.gain / 1000))} kg`} tone="or" icon={<Waves className="h-4 w-4" />} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardBody>
              <div className="mb-2 text-sm font-semibold text-texte">Distribution d'aliment</div>
              <div className="flex items-end gap-2"><Field label="Quantité (kg)" className="flex-1"><Input type="number" value={aliment} onChange={(e) => setAliment(e.target.value)} /></Field><Button variant="action" loading={addAliment.isPending} disabled={!aliment} onClick={() => addAliment.mutate(undefined)}><Plus className="h-4 w-4" /></Button></div>
              <div className="mt-2 text-xs text-texte-2">Total distribué : {formatNumber(Math.round(data.aliments.reduce((s, a) => s + (a.quantite_g as number), 0) / 1000))} kg</div>
            </CardBody></Card>
            <Card><CardBody>
              <div className="mb-2 text-sm font-semibold text-texte">Pêche de contrôle</div>
              <div className="flex items-end gap-2"><Field label="Poids moyen (g)" className="flex-1"><Input type="number" value={poids} onChange={(e) => setPoids(e.target.value)} /></Field><Field label="Échantillon" className="w-24"><Input type="number" value={ech} onChange={(e) => setEch(e.target.value)} /></Field><Button variant="action" loading={addControle.isPending} disabled={!poids} onClick={() => addControle.mutate(undefined)}><Plus className="h-4 w-4" /></Button></div>
              <div className="mt-2 text-xs text-texte-2">{data.controles.length ? `Dernier poids moyen : ${data.controles[0].poids_moyen_g} g` : 'Aucune pêche de contrôle'}</div>
            </CardBody></Card>
          </div>
        </div>
      )}
    </Modal>
  );
}
