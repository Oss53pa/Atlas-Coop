import { useState } from 'react';
import { Building2, Plus, Wrench, TrendingDown, Eye, ClipboardCheck } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardBody, Stat, Badge, Money, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';
import { InventaireImmoModal } from './InventaireImmoModal';

const CURRENT_YEAR = new Date().getFullYear();
const CATEGORIES: Record<string, string> = { batiment: 'Bâtiment', materiel: 'Matériel', vehicule: 'Véhicule', equipement: 'Équipement', pirogue: 'Pirogue', froid: 'Chambre froide' };
const FINANCEMENT: Record<string, string> = { fonds_propres: 'Fonds propres', credit: 'Crédit', subvention: 'Subvention' };

export function ImmobilisationsPage() {
  const { push } = useToast();
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [invImmo, setInvImmo] = useState(false);

  const [ceder, setCeder] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['immo'], async (coopId) => {
    const [immos, plans, maint, cessions] = await Promise.all([
      supabase.from('coop_immobilisations').select('*').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_plans_amortissement').select('*').eq('cooperative_id', coopId),
      supabase.from('coop_maintenances').select('immobilisation_id, cout_xof').eq('cooperative_id', coopId),
      supabase.from('coop_cessions_immobilisations').select('*, coop_immobilisations(nom, code)').eq('cooperative_id', coopId).order('date_cession', { ascending: false }),
    ]);
    const planByImmo = new Map<string, Record<string, unknown>[]>();
    (plans.data ?? []).forEach((p: Record<string, unknown>) => { const k = p.immobilisation_id as string; if (!planByImmo.has(k)) planByImmo.set(k, []); planByImmo.get(k)!.push(p); });
    const maintByImmo = new Map<string, number>();
    (maint.data ?? []).forEach((m: Record<string, unknown>) => { const k = m.immobilisation_id as string; maintByImmo.set(k, (maintByImmo.get(k) ?? 0) + (m.cout_xof as number)); });
    const immoRows = (immos.data ?? []) as Record<string, unknown>[];
    const actifs = immoRows.filter((i) => i.statut === 'actif');
    const valeurBrute = actifs.reduce((s, i) => s + (i.cout_acquisition_xof as number), 0);
    const vncTotale = actifs.reduce((s, i) => s + vncOf(i, planByImmo.get(i.id as string) ?? []), 0);
    return { immos: immoRows, planByImmo, maintByImmo, valeurBrute, vncTotale, cessions: cessions.data ?? [], maintTotale: [...maintByImmo.values()].reduce((s, x) => s + x, 0) };
  });

  return (
    <>
      <PageHeader
        title="Immobilisations"
        subtitle="Registre des actifs, amortissements SYSCOHADA linéaires, maintenance."
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setInvImmo(true)}><ClipboardCheck className="h-4 w-4" /> Inventaire</Button>
            <Button variant="action" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Nouvel actif</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Valeur brute" value={<Money value={data?.valeurBrute ?? 0} suffix={false} size="lg" />} tone="primaire" icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Valeur nette (VNC)" value={<Money value={data?.vncTotale ?? 0} suffix={false} size="lg" />} tone="or" icon={<TrendingDown className="h-4 w-4" />} />
        <Stat label="Actifs" value={data?.immos.length ?? 0} tone="action" icon={<Building2 className="h-4 w-4" />} />
        <Stat label="Maintenance cumulée" value={<Money value={data?.maintTotale ?? 0} suffix={false} size="lg" />} tone="alerte" icon={<Wrench className="h-4 w-4" />} />
      </div>

      {isLoading ? <Spinner /> : !data?.immos.length ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="Aucun actif" description="Enregistrez vos immobilisations (bâtiments, tracteurs, chambres froides, pirogues…)." action={<Button variant="action" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Ajouter</Button>} />
      ) : (
        <Card><Table>
          <THead><Th>Actif</Th><Th>Catégorie</Th><Th>Financement</Th><Th align="right">Valeur brute</Th><Th align="right">Dotation {CURRENT_YEAR}</Th><Th align="right">VNC</Th><Th></Th></THead>
          <TBody>
            {data.immos.map((i) => {
              const plans = data.planByImmo.get(i.id as string) ?? [];
              const cur = plans.find((p) => p.annee === CURRENT_YEAR);
              return (
                <Tr key={i.id as string}>
                  <Td><span className="font-medium text-texte">{i.nom as string}</span> <span className="mono text-xs text-texte-2">{i.code as string}</span></Td>
                  <Td><Badge tone="neutre">{CATEGORIES[i.categorie as string] ?? (i.categorie as string)}</Badge></Td>
                  <Td><Badge tone={i.financement === 'subvention' ? 'action' : 'neutre'}>{FINANCEMENT[i.financement as string]}</Badge></Td>
                  <Td align="right"><Money value={i.cout_acquisition_xof as number} size="sm" /></Td>
                  <Td align="right">{cur ? <Money value={cur.dotation_xof as number} size="sm" /> : <span className="text-texte-2">—</span>}</Td>
                  <Td align="right">{i.statut === 'actif' ? <Money value={vncOf(i, plans)} size="sm" /> : <Badge tone={i.statut === 'rebut' ? 'alerte' : 'neutre'}>{i.statut === 'rebut' ? 'Au rebut' : 'Cédé'}</Badge>}</Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      {i.statut === 'actif' && <Button variant="ghost" size="sm" onClick={() => setCeder(i)}>Céder</Button>}
                      <Button variant="outline" size="sm" onClick={() => setDetail(i.id as string)}><Eye className="h-4 w-4" /></Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table></Card>
      )}

      {!!data?.cessions.length && (
        <Card className="mt-6">
          <CardBody className="p-0">
            <div className="border-b border-ligne px-5 py-3 font-semibold text-texte">Cessions & mises au rebut</div>
            <Table>
              <THead><Th>Date</Th><Th>Actif</Th><Th>Type</Th><Th align="right">VNC</Th><Th align="right">Prix cession</Th><Th align="right">Plus/moins-value</Th></THead>
              <TBody>
                {data.cessions.map((c: Record<string, unknown>) => (
                  <Tr key={c.id as string}>
                    <Td className="text-xs text-texte-2">{formatDate(c.date_cession as string)}</Td>
                    <Td className="font-medium text-texte">{(c.coop_immobilisations as { nom?: string } | null)?.nom ?? '—'}</Td>
                    <Td><Badge tone={c.type === 'rebut' ? 'alerte' : 'neutre'}>{c.type === 'rebut' ? 'Rebut' : 'Cession'}</Badge></Td>
                    <Td align="right"><Money value={c.vnc_xof as number} size="sm" suffix={false} /></Td>
                    <Td align="right"><Money value={c.valeur_cession_xof as number} size="sm" suffix={false} /></Td>
                    <Td align="right"><Badge tone={(c.plus_moins_value_xof as number) >= 0 ? 'action' : 'alerte'}><Money value={c.plus_moins_value_xof as number} size="sm" suffix={false} colorNegative /></Badge></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {modal && <ImmoForm onClose={() => { setModal(false); refetch(); }} onDone={() => push('success', 'Actif enregistré · plan d\'amortissement généré')} />}
      {detail && <ImmoDetail immoId={detail} onClose={() => { setDetail(null); refetch(); }} />}
      {ceder && <CessionModal immo={ceder} onClose={() => { setCeder(null); refetch(); }} />}
      {invImmo && <InventaireImmoModal onClose={() => { setInvImmo(false); refetch(); }} />}
    </>
  );
}

function CessionModal({ immo, onClose }: { immo: Record<string, unknown>; onClose: () => void }) {
  const { push } = useToast();
  const [type, setType] = useState('cession');
  const [valeur, setValeur] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [acquereur, setAcquereur] = useState('');

  // Aperçu VNC (linéaire prorata annuel) — mêmes règles que la fonction serveur
  const cout = immo.cout_acquisition_xof as number;
  const duree = (immo.duree_amortissement_ans as number) || 0;
  const resid = (immo.valeur_residuelle_xof as number) || 0;
  const annuel = duree > 0 ? Math.floor((cout - resid) / duree) : 0;
  const ans = duree > 0 ? Math.min(Math.max(new Date(date).getFullYear() - new Date(immo.date_acquisition as string).getFullYear(), 0), duree) : 0;
  const cumul = Math.min(annuel * ans, cout - resid);
  const vnc = cout - cumul;
  const valeurN = type === 'rebut' ? 0 : Number(valeur.replace(/\s/g, '')) || 0;
  const pmv = valeurN - vnc;

  const save = useCoopMutation(
    async (coopId) => {
      void coopId;
      const { error } = await supabase.rpc('coop_ceder_immobilisation', {
        p_immo: immo.id, p_type: type, p_date: date, p_valeur: valeurN, p_acquereur: acquereur || null, p_mode: 'virement',
      });
      if (error) throw error;
    },
    { invalidate: ['immo'], onSuccess: () => { push('success', `${type === 'rebut' ? 'Mise au rebut' : 'Cession'} enregistrée · écriture générée`); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} title={`Céder — ${immo.nom as string}`} subtitle="Calcul VNC + plus/moins-value + écriture SYSCOHADA (HAO)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)}>Confirmer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="cession">Cession</option><option value="rebut">Mise au rebut</option></Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {type === 'cession' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix de cession (FCFA)"><Input type="number" value={valeur} onChange={(e) => setValeur(e.target.value)} /></Field>
            <Field label="Acquéreur"><Input value={acquereur} onChange={(e) => setAcquereur(e.target.value)} /></Field>
          </div>
        )}
        <div className="space-y-1 rounded-lg border border-ligne p-3 text-sm">
          <div className="flex justify-between"><span className="text-texte-2">Valeur brute</span><Money value={cout} size="sm" suffix={false} /></div>
          <div className="flex justify-between"><span className="text-texte-2">Amortissements cumulés</span><Money value={cumul} size="sm" suffix={false} /></div>
          <div className="flex justify-between"><span className="text-texte-2">Valeur nette comptable (VNC)</span><Money value={vnc} size="sm" suffix={false} /></div>
          <div className="flex justify-between border-t border-ligne pt-1 font-semibold"><span>Plus/moins-value</span><Money value={pmv} size="sm" suffix={false} colorNegative /></div>
        </div>
      </div>
    </Modal>
  );
}

function vncOf(immo: Record<string, unknown>, plans: Record<string, unknown>[]): number {
  if (!plans.length) return immo.cout_acquisition_xof as number;
  const past = plans.filter((p) => (p.annee as number) <= CURRENT_YEAR).sort((a, b) => (b.annee as number) - (a.annee as number));
  if (!past.length) return immo.cout_acquisition_xof as number;
  return past[0].vnc_xof as number;
}

function ImmoForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [categorie, setCategorie] = useState('materiel');
  const [cout, setCout] = useState(''); const [duree, setDuree] = useState('5'); const [financement, setFinancement] = useState('fonds_propres'); const [residuelle, setResiduelle] = useState('0');
  const [methode, setMethode] = useState('lineaire'); const [miseEnService, setMiseEnService] = useState('');
  const save = useCoopMutation(
    async (coopId) => {
      const { data: immo, error } = await supabase.from('coop_immobilisations').insert({
        cooperative_id: coopId, code: code.toUpperCase(), nom, categorie, cout_acquisition_xof: Number(cout) || 0,
        duree_amortissement_ans: Number(duree) || 5, financement, valeur_residuelle_xof: Number(residuelle) || 0,
        methode_amortissement: methode, date_mise_en_service: miseEnService || null,
      }).select('id').single();
      if (error) throw error;
      await supabase.rpc('coop_generer_amortissement', { p_immo: immo.id });
    },
    { invalidate: ['immo'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="lg" title="Nouvel actif"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !nom || !cout} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="IMMO-1" /></Field>
          <Field label="Désignation" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Tracteur Massey Ferguson" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie"><Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Financement"><Select value={financement} onChange={(e) => setFinancement(e.target.value)}>{Object.entries(FINANCEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Coût d'acquisition" required><Input type="number" value={cout} onChange={(e) => setCout(e.target.value)} placeholder="FCFA" /></Field>
          <Field label="Durée (ans)"><Input type="number" value={duree} onChange={(e) => setDuree(e.target.value)} /></Field>
          <Field label="Valeur résiduelle"><Input type="number" value={residuelle} onChange={(e) => setResiduelle(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Méthode d'amortissement"><Select value={methode} onChange={(e) => setMethode(e.target.value)}><option value="lineaire">Linéaire</option><option value="degressif">Dégressif</option></Select></Field>
          <Field label="Date de mise en service"><Input type="date" value={miseEnService} onChange={(e) => setMiseEnService(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ImmoDetail({ immoId, onClose }: { immoId: string; onClose: () => void }) {
  const { push } = useToast();
  const [type, setType] = useState('curative'); const [cout, setCout] = useState(''); const [note, setNote] = useState('');
  const { data, isLoading, refetch } = useCoopQuery(['immo-detail', immoId], async () => {
    const [immo, plans, maint] = await Promise.all([
      supabase.from('coop_immobilisations').select('*').eq('id', immoId).single(),
      supabase.from('coop_plans_amortissement').select('*').eq('immobilisation_id', immoId).order('annee'),
      supabase.from('coop_maintenances').select('*').eq('immobilisation_id', immoId).order('date_maintenance', { ascending: false }),
    ]);
    return { immo: immo.data as Record<string, unknown>, plans: (plans.data ?? []) as Record<string, unknown>[], maint: (maint.data ?? []) as Record<string, unknown>[] };
  });
  const addMaint = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_maintenances').insert({ cooperative_id: coopId, immobilisation_id: immoId, type, cout_xof: Number(cout) || 0, note: note || null }); if (error) throw error; },
    { invalidate: ['immo', 'immo-detail'], onSuccess: () => { push('success', 'Maintenance enregistrée'); setCout(''); setNote(''); refetch(); } },
  );
  return (
    <Modal open onClose={onClose} size="xl" title={(data?.immo.nom as string) ?? ''} subtitle={data ? `${CATEGORIES[data.immo.categorie as string]} · acquis ${formatDate(data.immo.date_acquisition as string)}` : ''}
      footer={<Button variant="outline" onClick={onClose}>Fermer</Button>}>
      {isLoading || !data ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Valeur brute" value={<Money value={data.immo.cout_acquisition_xof as number} suffix={false} size="lg" />} tone="primaire" />
            <Stat label="VNC actuelle" value={<Money value={vncOf(data.immo, data.plans)} suffix={false} size="lg" />} tone="or" />
            <Stat label="Durée" value={`${data.immo.duree_amortissement_ans} ans`} tone="action" />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-texte">Plan d'amortissement</div>
            <Table>
              <THead><Th>Année</Th><Th align="right">Dotation</Th><Th align="right">Cumul</Th><Th align="right">VNC</Th></THead>
              <TBody>
                {data.plans.map((p) => (
                  <Tr key={p.id as string} className={(p.annee as number) === CURRENT_YEAR ? 'bg-primaire/5' : ''}>
                    <Td className="font-medium">{p.annee as number}</Td>
                    <Td align="right"><Money value={p.dotation_xof as number} size="sm" suffix={false} /></Td>
                    <Td align="right"><Money value={p.cumul_xof as number} size="sm" suffix={false} /></Td>
                    <Td align="right"><Money value={p.vnc_xof as number} size="sm" suffix={false} /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
          <Card><CardBody>
            <div className="mb-2 text-sm font-semibold text-texte">Ajouter une maintenance</div>
            <div className="grid grid-cols-12 items-end gap-2">
              <Field label="Type" className="col-span-3"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="curative">Curative</option><option value="preventive">Préventive</option></Select></Field>
              <Field label="Coût" className="col-span-3"><Input type="number" value={cout} onChange={(e) => setCout(e.target.value)} /></Field>
              <Field label="Note" className="col-span-4"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              <div className="col-span-2"><Button variant="action" className="w-full justify-center" loading={addMaint.isPending} disabled={!cout} onClick={() => addMaint.mutate(undefined)}><Plus className="h-4 w-4" /></Button></div>
            </div>
            {data.maint.length > 0 && <ul className="mt-3 space-y-1 text-sm">{data.maint.map((m) => <li key={m.id as string} className="flex justify-between border-b border-ligne/60 py-1"><span className="text-texte-2">{formatDate(m.date_maintenance as string)} · {m.type as string} {m.note ? `· ${m.note}` : ''}</span><Money value={m.cout_xof as number} size="sm" /></li>)}</ul>}
          </CardBody></Card>
        </div>
      )}
    </Modal>
  );
}
