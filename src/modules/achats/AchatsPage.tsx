import { useState } from 'react';
import { ShoppingCart, Plus, Truck, Receipt, Trash2 } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardBody, Stat, Money, Badge, Tabs, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { toBase } from '../../lib/units';
import { formatDate } from '../../lib/format';
import type { CoopFournisseur, CoopMagasin, CoopFactureFournisseur } from '../../domain/database.types';

type Tab = 'dettes' | 'fournisseurs';

export function AchatsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('dettes');
  const [newFour, setNewFour] = useState(false);
  const [reception, setReception] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['achats'], async (coopId) => {
    const [fournisseurs, factures, magasins] = await Promise.all([
      supabase.from('coop_fournisseurs').select('*').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_factures_fournisseurs').select('*, coop_fournisseurs(nom)').eq('cooperative_id', coopId).order('date_facture', { ascending: false }),
      supabase.from('coop_magasins').select('*').eq('cooperative_id', coopId).eq('actif', true).order('code'),
    ]);
    const fs = (factures.data ?? []);
    const dette = fs.filter((f: Record<string, unknown>) => f.statut !== 'payee').reduce((s: number, f: Record<string, unknown>) => s + ((f.montant_ttc_xof as number) - (f.regle_xof as number)), 0);
    return {
      fournisseurs: (fournisseurs.data ?? []) as CoopFournisseur[],
      factures: fs, magasins: (magasins.data ?? []) as CoopMagasin[], dette,
    };
  });

  const createFour = useCoopMutation(
    async (coopId, f: Record<string, unknown>) => { const { error } = await supabase.from('coop_fournisseurs').insert({ ...f, cooperative_id: coopId }); if (error) throw error; },
    { invalidate: ['achats'], onSuccess: () => { push('success', 'Fournisseur créé'); setNewFour(false); } },
  );

  const regler = useCoopMutation(
    async (coopId, f: CoopFactureFournisseur) => {
      const reste = f.montant_ttc_xof - f.regle_xof;
      const { error } = await supabase.from('coop_factures_fournisseurs').update({ regle_xof: f.montant_ttc_xof, statut: 'payee' }).eq('id', f.id);
      if (error) throw error;
      await supabase.from('coop_reglements_fournisseurs').insert({ cooperative_id: coopId, facture_id: f.id, montant_xof: reste, mode: 'espece' });
    },
    { invalidate: ['achats'], onSuccess: () => push('success', 'Facture réglée') },
  );

  return (
    <>
      <PageHeader
        title="Achats & approvisionnements"
        subtitle="Fournisseurs, réceptions (entrée en stock, P6), dettes fournisseurs."
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setNewFour(true)}><Plus className="h-4 w-4" /> Fournisseur</Button>
            <Button variant="action" onClick={() => setReception(true)} disabled={!data?.fournisseurs.length || !data?.magasins.length}><Truck className="h-4 w-4" /> Réception</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Dettes fournisseurs" value={<Money value={data?.dette ?? 0} suffix={false} size="xl" />} tone="alerte" icon={<Receipt className="h-4 w-4" />} />
        <Stat label="Fournisseurs" value={data?.fournisseurs.length ?? 0} tone="primaire" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Factures" value={data?.factures.length ?? 0} tone="action" icon={<Receipt className="h-4 w-4" />} />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'dettes', label: 'Factures & dettes', count: data?.factures.length },
        { key: 'fournisseurs', label: 'Fournisseurs', count: data?.fournisseurs.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'dettes' && (
            !data?.factures.length ? <EmptyState icon={<Receipt className="h-8 w-8" />} title="Aucune facture" description="Enregistrez une réception fournisseur pour créer la dette et alimenter le stock." action={<Button variant="action" onClick={() => setReception(true)} disabled={!data?.fournisseurs.length}><Truck className="h-4 w-4" /> Réception</Button>} /> :
            <Card><Table>
              <THead><Th>Date</Th><Th>Fournisseur</Th><Th align="right">Montant TTC</Th><Th align="right">Réglé</Th><Th>Statut</Th><Th></Th></THead>
              <TBody>
                {data.factures.map((f: Record<string, unknown>) => (
                  <Tr key={f.id as string}>
                    <Td className="text-xs text-texte-2">{formatDate(f.date_facture as string)}</Td>
                    <Td className="font-medium text-texte">{(f.coop_fournisseurs as { nom?: string } | null)?.nom}</Td>
                    <Td align="right"><Money value={f.montant_ttc_xof as number} size="sm" /></Td>
                    <Td align="right"><Money value={f.regle_xof as number} size="sm" /></Td>
                    <Td><Badge tone={f.statut === 'payee' ? 'action' : 'alerte'} dot>{f.statut === 'payee' ? 'Payée' : 'À payer'}</Badge></Td>
                    <Td align="right">{f.statut !== 'payee' && <Button variant="outline" size="sm" loading={regler.isPending} onClick={() => regler.mutate(f as unknown as CoopFactureFournisseur)}>Régler</Button>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table></Card>
          )}

          {tab === 'fournisseurs' && (
            !data?.fournisseurs.length ? <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title="Aucun fournisseur" description="Ajoutez vos fournisseurs d'intrants, provende, emballages…" action={<Button variant="action" onClick={() => setNewFour(true)}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.fournisseurs.map((f) => (
                <Card key={f.id}><CardBody>
                  <h3 className="font-semibold text-texte">{f.nom}</h3>
                  <div className="mt-1 text-sm text-texte-2">{f.telephone ?? '—'}</div>
                  {f.conditions_paiement && <div className="mt-1 text-xs text-texte-2">Conditions : {f.conditions_paiement}</div>}
                </CardBody></Card>
              ))}
            </div>
          )}
        </>
      )}

      {newFour && <FournisseurForm onClose={() => setNewFour(false)} onSubmit={(f) => createFour.mutate(f)} loading={createFour.isPending} />}
      {reception && <ReceptionForm fournisseurs={data?.fournisseurs ?? []} magasins={data?.magasins ?? []} onClose={() => { setReception(false); refetch(); }} onDone={() => push('success', 'Réception enregistrée · stock alimenté · dette créée')} />}
    </>
  );
}

function FournisseurForm({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (f: Record<string, unknown>) => void; loading: boolean }) {
  const [nom, setNom] = useState(''); const [telephone, setTelephone] = useState(''); const [conditions, setConditions] = useState('');
  return (
    <Modal open onClose={onClose} title="Nouveau fournisseur"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={loading} disabled={!nom} onClick={() => onSubmit({ nom, telephone: telephone || null, conditions_paiement: conditions || null })}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom" required><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Ivoire Provende SA" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone"><Input value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
          <Field label="Conditions"><Input value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="30 jours" /></Field>
        </div>
      </div>
    </Modal>
  );
}

interface Ligne { produit: string; qty: string; prix: string }

function ReceptionForm({ fournisseurs, magasins, onClose, onDone }: { fournisseurs: CoopFournisseur[]; magasins: CoopMagasin[]; onClose: () => void; onDone: () => void }) {
  const [fournisseurId, setFournisseurId] = useState(fournisseurs[0]?.id ?? '');
  const [magasinId, setMagasinId] = useState(magasins[0]?.id ?? '');
  const [lignes, setLignes] = useState<Ligne[]>([{ produit: '', qty: '', prix: '' }]);

  const total = lignes.reduce((s, l) => s + Math.round((Number(l.qty) || 0) * (Number(l.prix) || 0)), 0);
  const setL = (i: number, patch: Partial<Ligne>) => setLignes((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useCoopMutation(
    async (coopId) => {
      // find-or-create produit par nom (type intrant)
      for (const l of lignes.filter((x) => x.produit && Number(x.qty) > 0)) {
        const { data: existing } = await supabase.from('coop_produits').select('id, unite_affichage').eq('cooperative_id', coopId).ilike('nom', l.produit).limit(1);
        let produitId = existing?.[0]?.id as string | undefined;
        let unite = (existing?.[0]?.unite_affichage as string) ?? 'kg';
        if (!produitId) {
          const code = l.produit.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 18) + '_' + Math.random().toString(36).slice(2, 5);
          const { data: prod, error } = await supabase.from('coop_produits').insert({ cooperative_id: coopId, code, nom: l.produit, type: 'intrant', unite_base: 'g', unite_affichage: 'kg' }).select('id').single();
          if (error) throw error;
          produitId = prod.id; unite = 'kg';
        }
        const montant = Math.round((Number(l.qty) || 0) * (Number(l.prix) || 0));
        const { error: me } = await supabase.from('coop_mouvements_stock').insert({
          cooperative_id: coopId, magasin_id: magasinId, produit_id: produitId, etat: 'intrant',
          sens: 'entree', quantite_base: toBase(Number(l.qty), unite), valeur_xof: montant, motif: 'reception_fournisseur',
        });
        if (me) throw me;
      }
      const { error: fe } = await supabase.from('coop_factures_fournisseurs').insert({
        cooperative_id: coopId, fournisseur_id: fournisseurId, date_facture: new Date().toISOString().slice(0, 10),
        montant_ht_xof: total, montant_ttc_xof: total, statut: 'a_payer',
      });
      if (fe) throw fe;
    },
    { invalidate: ['achats', 'stocks', 'dashboard'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Réception fournisseur" subtitle="Entrée en stock (intrants) + création de la dette fournisseur"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!fournisseurId || !magasinId || total <= 0} onClick={() => save.mutate(undefined)}>Valider la réception</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fournisseur"><Select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>{fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</Select></Field>
          <Field label="Magasin de réception"><Select value={magasinId} onChange={(e) => setMagasinId(e.target.value)}>{magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</Select></Field>
        </div>
        <div className="space-y-2">
          {lignes.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-6" placeholder="Produit (ex. Provende ponte)" value={l.produit} onChange={(e) => setL(i, { produit: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="Qté (kg)" value={l.qty} onChange={(e) => setL(i, { qty: e.target.value })} />
              <Input className="col-span-3" type="number" placeholder="Prix/kg" value={l.prix} onChange={(e) => setL(i, { prix: e.target.value })} />
              <button className="col-span-1 flex items-center justify-center text-texte-2 hover:text-alerte" onClick={() => setLignes((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setLignes((p) => [...p, { produit: '', qty: '', prix: '' }])}><Plus className="h-4 w-4" /> Ligne</Button>
        </div>
        <div className="flex justify-end rounded-lg bg-surface-2 p-3 text-sm">Total : <Money value={total} size="sm" className="ml-2" /></div>
      </div>
    </Modal>
  );
}
