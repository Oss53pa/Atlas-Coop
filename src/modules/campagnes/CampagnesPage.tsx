import { useState } from 'react';
import { Sprout, Plus, Tag, Lock, Unlock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardBody, Badge, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';
import { formatFcfaText } from '../../lib/money';
import { useCoop } from '../../auth/CooperativeProvider';
import type { CoopCampagne, CoopSection } from '../../domain/database.types';

export function CampagnesPage() {
  const { push } = useToast();
  const [openCamp, setOpenCamp] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: sections } = useCoopQuery(['sections'], async (coopId) => {
    const { data } = await supabase.from('coop_sections').select('*').eq('cooperative_id', coopId).eq('actif', true).order('ordre');
    return (data ?? []) as CoopSection[];
  });
  const { data: campagnes, isLoading } = useCoopQuery(['campagnes'], async (coopId) => {
    const { data } = await supabase.from('coop_campagnes').select('*, coop_sections(nom, couleur)')
      .eq('cooperative_id', coopId).order('date_debut', { ascending: false });
    return (data ?? []) as (CoopCampagne & { coop_sections: { nom: string; couleur: string | null } | null })[];
  });

  const createCamp = useCoopMutation(
    async (coopId, f: Record<string, unknown>) => {
      const { error } = await supabase.from('coop_campagnes').insert({ ...f, cooperative_id: coopId });
      if (error) throw error;
    },
    { invalidate: ['campagnes'], onSuccess: () => { push('success', 'Campagne créée'); setOpenCamp(false); } },
  );

  const toggleStatut = useCoopMutation(
    async (_c, { id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from('coop_campagnes').update({ statut }).eq('id', id);
      if (error) throw error;
    },
    { invalidate: ['campagnes', 'campagnes-ouvertes'], onSuccess: () => push('success', 'Statut mis à jour') },
  );

  return (
    <>
      <PageHeader
        title="Campagnes & ristournes"
        subtitle="Prix planché à l'apport, prix définitif en fin de campagne, ristourne au prorata de l'usage (P8)."
        icon={<Sprout className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setOpenCamp(true)}><Plus className="h-4 w-4" /> Nouvelle campagne</Button>}
      />

      {isLoading ? <Spinner /> : !campagnes?.length ? (
        <EmptyState icon={<Sprout className="h-8 w-8" />} title="Aucune campagne" description="Créez une campagne pour cadrer les prix et la collecte." action={<Button variant="action" onClick={() => setOpenCamp(true)}><Plus className="h-4 w-4" /> Créer</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campagnes.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {c.coop_sections?.couleur && <span className="h-3 w-3 rounded-full" style={{ background: c.coop_sections.couleur }} />}
                      <h3 className="font-semibold text-texte">{c.nom}</h3>
                    </div>
                    <div className="mt-0.5 text-xs text-texte-2">
                      {c.coop_sections?.nom ?? 'Toutes sections'} · <span className="mono">{c.code}</span>
                    </div>
                    <div className="mt-1 text-xs text-texte-2">
                      {formatDate(c.date_debut)} → {c.date_fin ? formatDate(c.date_fin) : '…'}
                    </div>
                  </div>
                  <Badge tone={c.statut === 'ouverte' ? 'action' : 'neutre'} dot>{c.statut}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(c.id)}><Tag className="h-4 w-4" /> Prix</Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => toggleStatut.mutate({ id: c.id, statut: c.statut === 'ouverte' ? 'close' : 'ouverte' })}
                  >
                    {c.statut === 'ouverte' ? <><Lock className="h-4 w-4" /> Clôturer</> : <><Unlock className="h-4 w-4" /> Rouvrir</>}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <CampagneForm open={openCamp} onClose={() => setOpenCamp(false)} sections={sections ?? []} onSubmit={(f) => createCamp.mutate(f)} loading={createCamp.isPending} />
      {selected && <PrixModal campagneId={selected} sections={sections ?? []} onClose={() => setSelected(null)} />}
    </>
  );
}

function CampagneForm({ open, onClose, sections, onSubmit, loading }: {
  open: boolean; onClose: () => void; sections: CoopSection[]; onSubmit: (f: Record<string, unknown>) => void; loading: boolean;
}) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [debut, setDebut] = useState(new Date().toISOString().slice(0, 10));
  const [fin, setFin] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle campagne"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={loading} disabled={!nom || !code} onClick={() => onSubmit({ code: code.toUpperCase(), nom, section_id: sectionId || null, date_debut: debut, date_fin: fin || null })}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="C2026" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Campagne cacao 2026" /></Field>
        </div>
        <Field label="Section"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">Toutes</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début"><Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></Field>
          <Field label="Fin (prévue)"><Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

interface PrixOfficiel { id: string; filiere: string; libelle: string; prix_xof: number; unite_affichage: string; source: string }

function PrixModal({ campagneId, sections, onClose }: { campagneId: string; sections: CoopSection[]; onClose: () => void }) {
  const { push } = useToast();
  const { current } = useCoop();
  const pays = current?.pays ?? 'CI';
  const [nom, setNom] = useState('');
  const [filiere, setFiliere] = useState('');
  const [calibre, setCalibre] = useState('');
  const [prix, setPrix] = useState('');

  const { data: prixList, refetch } = useCoopQuery(['prix-campagne-admin', campagneId], async () => {
    const { data } = await supabase.from('coop_prix_campagne').select('*, coop_produits(nom, unite_affichage)').eq('campagne_id', campagneId);
    return data ?? [];
  });

  const { data: officiels } = useCoopQuery(['prix-officiels', pays], async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from('coop_prix_officiels').select('id, filiere, libelle, prix_xof, unite_affichage, source')
      .eq('pays', pays).lte('date_debut', today).or(`date_fin.is.null,date_fin.gte.${today}`);
    return (data ?? []) as PrixOfficiel[];
  });

  const officielSel = officiels?.find((o) => o.filiere === filiere) ?? null;
  const prixN = Number(prix.replace(/\s/g, '')) || 0;
  const violeOfficiel = !!officielSel && prixN > 0 && prixN < officielSel.prix_xof;

  const addPrix = useCoopMutation(
    async (coopId) => {
      // Contrainte système (M24 × M15) : prix planché ≥ prix officiel décrété
      if (violeOfficiel && officielSel) {
        throw new Error(`Prix planché < prix officiel (${formatFcfaText(officielSel.prix_xof)}/${officielSel.unite_affichage}). Source : ${officielSel.source}.`);
      }
      const { data: camp } = await supabase.from('coop_campagnes').select('section_id').eq('id', campagneId).single();
      const sectionId = camp?.section_id ?? null;
      const section = sections.find((s) => s.id === sectionId);
      const code = nom.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 20) + '_' + Math.random().toString(36).slice(2, 5);
      const { data: prod, error: pe } = await supabase.from('coop_produits').insert({
        cooperative_id: coopId, section_id: sectionId, code, nom,
        unite_base: section?.unite_base ?? 'g', unite_affichage: section?.unite_affichage ?? 'kg',
      }).select('id').single();
      if (pe) throw pe;
      const { error } = await supabase.from('coop_prix_campagne').insert({
        cooperative_id: coopId, campagne_id: campagneId, produit_id: prod.id,
        calibre: calibre || null, prix_planche_xof: prixN,
      });
      if (error) throw error;
    },
    { onSuccess: () => { push('success', 'Prix ajouté'); setNom(''); setCalibre(''); setPrix(''); setFiliere(''); refetch(); } },
  );

  const onAdd = () => {
    if (violeOfficiel && officielSel) {
      push('error', `Refusé : prix planché inférieur au prix officiel (${formatFcfaText(officielSel.prix_xof)}). Source : ${officielSel.source}.`);
      return;
    }
    addPrix.mutate(undefined);
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Prix de campagne" subtitle="Prix planché payé à l'apport (par unité d'affichage)">
      <div className="space-y-4">
        <div className="rounded-lg border border-ligne p-3">
          <div className="grid grid-cols-12 gap-2">
            <Field label="Produit" className="col-span-4"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Cacao" /></Field>
            <Field label="Filière (prix officiel)" className="col-span-4">
              <Select value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                <option value="">— aucune —</option>
                {officiels?.map((o) => <option key={o.id} value={o.filiere}>{o.filiere}</option>)}
              </Select>
            </Field>
            <Field label="Calibre" className="col-span-2"><Input value={calibre} onChange={(e) => setCalibre(e.target.value)} placeholder="1er choix" /></Field>
            <Field label="Prix (FCFA)" className="col-span-2"><Input type="number" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="0" /></Field>
          </div>
          {officielSel && (
            <div className={`mt-2 flex items-center gap-2 rounded-lg p-2 text-xs ${violeOfficiel ? 'bg-alerte/10 text-alerte' : 'bg-action/10 text-action'}`}>
              {violeOfficiel ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              Prix officiel {officielSel.filiere} : <b>{formatFcfaText(officielSel.prix_xof)}/{officielSel.unite_affichage}</b> — {officielSel.source}.
              {violeOfficiel ? ' Le prix planché ne peut être inférieur.' : ' Conforme.'}
            </div>
          )}
          <div className="mt-2 flex justify-end">
            <Button variant="action" size="sm" loading={addPrix.isPending} disabled={!nom || !prix || violeOfficiel} onClick={onAdd}>
              <Plus className="h-4 w-4" /> Ajouter le prix
            </Button>
          </div>
        </div>

        {!prixList?.length ? (
          <p className="py-4 text-center text-sm text-texte-2">Aucun prix défini.</p>
        ) : (
          <Table>
            <THead><Th>Produit</Th><Th>Calibre</Th><Th align="right">Prix planché</Th><Th align="right">Prix définitif</Th></THead>
            <TBody>
              {prixList.map((p: Record<string, unknown>) => (
                <Tr key={p.id as string}>
                  <Td>{(p.coop_produits as { nom?: string } | null)?.nom ?? '—'}</Td>
                  <Td>{(p.calibre as string) ?? '—'}</Td>
                  <Td align="right"><Money value={p.prix_planche_xof as number} size="sm" /></Td>
                  <Td align="right">{p.prix_definitif_xof ? <Money value={p.prix_definitif_xof as number} size="sm" /> : <span className="text-texte-2">—</span>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </Modal>
  );
}
