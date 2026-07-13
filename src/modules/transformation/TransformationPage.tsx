import { useState, useMemo } from 'react';
import { Factory, Plus, Trash2, Boxes, Layers, Check } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { toBase, formatQty } from '../../lib/units';
import { formatBp } from '../../lib/rates';
import { formatDate } from '../../lib/format';
import type { CoopMagasin } from '../../domain/database.types';

type Tab = 'of' | 'nomenclatures';
interface StockOpt { id: string; produit_id: string; lot: string; etat: string; quantite_base: number; nom: string; unite: string }
interface MatLigne { stockId: string; qty: string }

export function TransformationPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('of');
  const [modal, setModal] = useState<null | 'of' | 'nomenclature'>(null);

  const { data, isLoading, refetch } = useCoopQuery(['transfo'], async (coopId) => {
    const [noms, ofs, lots, stocks, magasins, produits] = await Promise.all([
      supabase.from('coop_nomenclatures').select('*, coop_produits(nom, unite_affichage)').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_ordres_fabrication').select('*, coop_produits(nom, unite_affichage), coop_nomenclatures(nom)').eq('cooperative_id', coopId).order('date_of', { ascending: false }).limit(30),
      supabase.from('coop_lots_production').select('*, coop_produits(nom, unite_affichage)').eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(20),
      supabase.from('coop_stocks').select('id, produit_id, lot, etat, quantite_base, magasin_id, coop_produits(nom, unite_affichage)').eq('cooperative_id', coopId).gt('quantite_base', 0),
      supabase.from('coop_magasins').select('*').eq('cooperative_id', coopId).eq('actif', true).order('code'),
      supabase.from('coop_produits').select('id, nom, unite_affichage, unite_base').eq('cooperative_id', coopId).order('nom'),
    ]);
    return { noms: noms.data ?? [], ofs: ofs.data ?? [], lots: lots.data ?? [], stocks: stocks.data ?? [], magasins: (magasins.data ?? []) as CoopMagasin[], produits: produits.data ?? [] };
  });

  return (
    <>
      <PageHeader
        title="Transformation"
        subtitle="Ordres de fabrication : consommation stock → produit fini, coût de revient, lots tracés (P6)."
        icon={<Factory className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(tab === 'of' ? 'of' : 'nomenclature')} disabled={tab === 'of' ? !data?.magasins.length : false}><Plus className="h-4 w-4" /> {tab === 'of' ? 'Ordre de fabrication' : 'Nomenclature'}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Nomenclatures" value={data?.noms.length ?? 0} icon={<Layers className="h-4 w-4" />} tone="primaire" />
        <Stat label="Ordres réalisés" value={data?.ofs.length ?? 0} icon={<Factory className="h-4 w-4" />} tone="action" />
        <Stat label="Lots produits" value={data?.lots.length ?? 0} icon={<Boxes className="h-4 w-4" />} tone="or" />
        <Stat label="Coût de revient cumulé" value={<Money value={(data?.ofs ?? []).reduce((s: number, o: Record<string, unknown>) => s + (o.cout_revient_xof as number), 0)} suffix={false} size="lg" />} tone="primaire" />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'of', label: 'Ordres de fabrication', count: data?.ofs.length },
        { key: 'nomenclatures', label: 'Nomenclatures', count: data?.noms.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'of' && (
            <div className="space-y-6">
              {!data?.ofs.length ? <EmptyState icon={<Factory className="h-8 w-8" />} title="Aucun ordre de fabrication" description="Transformez des matières en stock en produit fini (avec coût de revient et lot)." action={<Button variant="action" onClick={() => setModal('of')} disabled={!data?.magasins.length}><Plus className="h-4 w-4" /> Ordre de fabrication</Button>} /> :
                <Card><Table>
                  <THead><Th>Date</Th><Th>Produit fini</Th><Th align="right">Produit</Th><Th align="right">Rendement</Th><Th align="right">Coût de revient</Th></THead>
                  <TBody>
                    {data.ofs.map((o: Record<string, unknown>) => {
                      const pf = o.coop_produits as { nom?: string; unite_affichage?: string } | null;
                      const rdt = o.rendement_reel_bp as number | null;
                      return (
                        <Tr key={o.id as string}>
                          <Td className="text-xs text-texte-2">{formatDate(o.date_of as string)}</Td>
                          <Td className="font-medium text-texte">{pf?.nom ?? '—'}</Td>
                          <Td align="right">{formatQty(o.quantite_produite_base as number, pf?.unite_affichage ?? 'kg')}</Td>
                          <Td align="right">{rdt !== null ? <Badge tone={rdt >= 5000 ? 'action' : 'alerte'}>{formatBp(rdt, 1)}</Badge> : '—'}</Td>
                          <Td align="right"><Money value={o.cout_revient_xof as number} size="sm" /></Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table></Card>}

              {data && data.lots.length > 0 && (
                <Card>
                  <CardHeader title="Lots de production" subtitle="Traçabilité amont (matières) et aval (ventes par lot)" icon={<Boxes className="h-5 w-5" />} />
                  <CardBody className="p-0"><Table>
                    <THead><Th>Lot</Th><Th>Produit</Th><Th align="right">Quantité</Th><Th align="right">Coût unitaire</Th><Th align="right">Coût total</Th></THead>
                    <TBody>
                      {data.lots.map((l: Record<string, unknown>) => {
                        const pf = l.coop_produits as { nom?: string; unite_affichage?: string } | null;
                        return (
                          <Tr key={l.id as string}>
                            <Td><span className="mono text-xs font-semibold">{l.numero_lot as string}</span></Td>
                            <Td className="text-sm">{pf?.nom ?? '—'}</Td>
                            <Td align="right">{formatQty(l.quantite_base as number, pf?.unite_affichage ?? 'kg')}</Td>
                            <Td align="right"><Money value={l.cout_revient_unitaire_xof as number} size="sm" /></Td>
                            <Td align="right"><Money value={l.cout_revient_total_xof as number} size="sm" /></Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table></CardBody>
                </Card>
              )}
            </div>
          )}

          {tab === 'nomenclatures' && (
            !data?.noms.length ? <EmptyState icon={<Layers className="h-8 w-8" />} title="Aucune nomenclature" description="Définissez vos recettes (matières → produit fini, rendement théorique)." action={<Button variant="action" onClick={() => setModal('nomenclature')}><Plus className="h-4 w-4" /> Nomenclature</Button>} /> :
            <div className="grid gap-4 md:grid-cols-2">
              {data.noms.map((n: Record<string, unknown>) => (
                <Card key={n.id as string}><CardBody>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-texte">{n.nom as string}</h3>
                    <Badge tone="neutre">Rdt théorique {formatBp(n.rendement_theorique_bp as number, 0)}</Badge>
                  </div>
                  <div className="mt-1 text-sm text-texte-2">Produit fini : {(n.coop_produits as { nom?: string } | null)?.nom ?? '—'}</div>
                </CardBody></Card>
              ))}
            </div>
          )}
        </>
      )}

      {modal === 'nomenclature' && <NomenclatureForm produits={data?.produits ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Nomenclature créée')} />}
      {modal === 'of' && <OFForm data={data!} onClose={() => { setModal(null); refetch(); }} onDone={(m) => push('success', m)} />}
    </>
  );
}

function NomenclatureForm({ produits, onClose, onDone }: { produits: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [nom, setNom] = useState(''); const [produitFini, setProduitFini] = useState(''); const [rendement, setRendement] = useState('65'); const [mo, setMo] = useState(''); const [energie, setEnergie] = useState('');
  const save = useCoopMutation(
    async (coopId) => {
      // find-or-create produit fini
      const { data: existing } = await supabase.from('coop_produits').select('id').eq('cooperative_id', coopId).ilike('nom', produitFini).limit(1);
      let pfId = existing?.[0]?.id as string | undefined;
      if (!pfId) {
        const code = produitFini.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 16) + '_' + Math.random().toString(36).slice(2, 5);
        const { data: p, error } = await supabase.from('coop_produits').insert({ cooperative_id: coopId, code, nom: produitFini, type: 'produit_fini', unite_base: 'g', unite_affichage: 'kg' }).select('id').single();
        if (error) throw error; pfId = p.id;
      }
      const { error } = await supabase.from('coop_nomenclatures').insert({ cooperative_id: coopId, produit_fini_id: pfId, code: nom.toUpperCase().replace(/\s+/g, '_').slice(0, 20), nom, rendement_theorique_bp: Math.round((Number(rendement) || 0) * 100), cout_mo_standard_xof: Number(mo) || 0, cout_energie_standard_xof: Number(energie) || 0 });
      if (error) throw error;
    },
    { invalidate: ['transfo'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle nomenclature (BOM)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!nom || !produitFini} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom de la recette" required><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Transformation cacao → pâte" /></Field>
        <Field label="Produit fini" required><Input value={produitFini} onChange={(e) => setProduitFini(e.target.value)} placeholder="Pâte de cacao" list="prods" /><datalist id="prods">{produits.map((p) => <option key={p.id as string} value={p.nom as string} />)}</datalist></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Rendement théorique (%)"><Input type="number" value={rendement} onChange={(e) => setRendement(e.target.value)} /></Field>
          <Field label="MO standard"><Input type="number" value={mo} onChange={(e) => setMo(e.target.value)} placeholder="FCFA" /></Field>
          <Field label="Énergie standard"><Input type="number" value={energie} onChange={(e) => setEnergie(e.target.value)} placeholder="FCFA" /></Field>
        </div>
      </div>
    </Modal>
  );
}

function OFForm({ data, onClose, onDone }: {
  data: { noms: Record<string, unknown>[]; stocks: Record<string, unknown>[]; magasins: CoopMagasin[]; produits: Record<string, unknown>[] };
  onClose: () => void; onDone: (m: string) => void;
}) {
  const { push } = useToast();
  const [nomId, setNomId] = useState('');
  const [magasinId, setMagasinId] = useState(data.magasins[0]?.id ?? '');
  const [produitFini, setProduitFini] = useState('');
  const [produiteQty, setProduiteQty] = useState('');
  const [mo, setMo] = useState(''); const [energie, setEnergie] = useState('');
  const [mats, setMats] = useState<MatLigne[]>([{ stockId: '', qty: '' }]);

  const nom = data.noms.find((n) => n.id === nomId);
  const rendementTheo = nom ? (nom.rendement_theorique_bp as number) : null;

  const stockOpts: StockOpt[] = useMemo(() => data.stocks.filter((s) => s.magasin_id === magasinId).map((s) => ({
    id: s.id as string, produit_id: s.produit_id as string, lot: s.lot as string, etat: s.etat as string,
    quantite_base: s.quantite_base as number, nom: (s.coop_produits as { nom?: string } | null)?.nom ?? '—',
    unite: (s.coop_produits as { unite_affichage?: string } | null)?.unite_affichage ?? 'kg',
  })), [data.stocks, magasinId]);

  const setMat = (i: number, patch: Partial<MatLigne>) => setMats((p) => p.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const consumedBase = mats.reduce((s, m) => { const o = stockOpts.find((x) => x.id === m.stockId); return s + (o ? toBase(Number(m.qty) || 0, o.unite) : 0); }, 0);
  const produitBase = toBase(Number(produiteQty) || 0, 'kg');
  const rendementReel = consumedBase > 0 ? Math.round((produitBase / consumedBase) * 10000) : 0;

  const save = useCoopMutation(
    async (coopId) => {
      const valid = mats.filter((m) => m.stockId && Number(m.qty) > 0);
      if (!valid.length) throw new Error('Ajoutez au moins une matière');
      if (produitBase <= 0) throw new Error('Quantité produite requise');
      for (const m of valid) { const o = stockOpts.find((x) => x.id === m.stockId)!; if (toBase(Number(m.qty), o.unite) > o.quantite_base) throw new Error(`Stock insuffisant : ${o.nom}`); }

      // produit fini find-or-create
      const nameFini = nom ? ((nom.coop_produits as { nom?: string } | null)?.nom ?? produitFini) : produitFini;
      let pfId = nom?.produit_fini_id as string | undefined;
      if (!pfId) {
        const { data: ex } = await supabase.from('coop_produits').select('id').eq('cooperative_id', coopId).ilike('nom', nameFini).limit(1);
        pfId = ex?.[0]?.id as string | undefined;
        if (!pfId) {
          const code = nameFini.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 16) + '_' + Math.random().toString(36).slice(2, 5);
          const { data: p, error } = await supabase.from('coop_produits').insert({ cooperative_id: coopId, code, nom: nameFini, type: 'produit_fini', unite_base: 'g', unite_affichage: 'kg' }).select('id').single();
          if (error) throw error; pfId = p.id;
        }
      }

      // OF header
      const { data: of, error: oe } = await supabase.from('coop_ordres_fabrication').insert({
        cooperative_id: coopId, nomenclature_id: nomId || null, magasin_id: magasinId, produit_fini_id: pfId,
        quantite_produite_base: produitBase, quantite_consommee_base: consumedBase,
        cout_mo_xof: Number(mo) || 0, cout_energie_xof: Number(energie) || 0,
        rendement_reel_bp: rendementReel, statut: 'termine',
      }).select('id').single();
      if (oe) throw oe;

      // consommations (sortie stock, valeur PMP calculée par trigger)
      let coutMatiere = 0;
      for (const m of valid) {
        const o = stockOpts.find((x) => x.id === m.stockId)!;
        const qBase = toBase(Number(m.qty), o.unite);
        const { data: mvt } = await supabase.from('coop_mouvements_stock').insert({
          cooperative_id: coopId, magasin_id: magasinId, produit_id: o.produit_id, lot: o.lot, etat: o.etat,
          sens: 'sortie', quantite_base: qBase, motif: 'consommation_of', piece_type: 'of', piece_id: of.id,
        }).select('id, valeur_xof').single();
        const val = (mvt?.valeur_xof as number) ?? 0;
        coutMatiere += val;
        await supabase.from('coop_consommations_of').insert({ cooperative_id: coopId, of_id: of.id, produit_id: o.produit_id, quantite_base: qBase, valeur_xof: val, mouvement_stock_id: mvt?.id ?? null });
      }
      const coutRevient = coutMatiere + (Number(mo) || 0) + (Number(energie) || 0);
      const lotNum = 'LOT-' + Date.now().toString().slice(-8);

      // entrée du produit fini en stock (valeur = coût de revient)
      const { data: mvtProd } = await supabase.from('coop_mouvements_stock').insert({
        cooperative_id: coopId, magasin_id: magasinId, produit_id: pfId, lot: lotNum, etat: 'produit_fini',
        sens: 'entree', quantite_base: produitBase, valeur_xof: coutRevient, motif: 'production_of', piece_type: 'of', piece_id: of.id,
      }).select('id').single();

      // MAJ OF + lot de production
      await supabase.from('coop_ordres_fabrication').update({ cout_matiere_xof: coutMatiere, cout_revient_xof: coutRevient }).eq('id', of.id);
      const coutUnit = produitBase > 0 ? Math.round(coutRevient / (produitBase / 1000)) : 0; // par kg
      await supabase.from('coop_lots_production').insert({
        cooperative_id: coopId, of_id: of.id, numero_lot: lotNum, produit_fini_id: pfId,
        quantite_base: produitBase, cout_revient_total_xof: coutRevient, cout_revient_unitaire_xof: coutUnit,
      });
      void mvtProd;
    },
    { invalidate: ['transfo', 'stocks', 'dashboard'], onSuccess: () => { onDone('Ordre de fabrication réalisé · produit fini en stock'); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Ordre de fabrication" subtitle="Consommation de matières → produit fini (coût de revient au PMP)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={consumedBase <= 0 || produitBase <= 0} onClick={() => { if (!nom && !produitFini) { push('error', 'Choisissez une nomenclature ou nommez le produit fini'); return; } save.mutate(undefined); }}><Check className="h-4 w-4" /> Réaliser l'OF</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nomenclature (recette)"><Select value={nomId} onChange={(e) => setNomId(e.target.value)}><option value="">— libre —</option>{data.noms.map((n) => <option key={n.id as string} value={n.id as string}>{n.nom as string}</option>)}</Select></Field>
          <Field label="Magasin"><Select value={magasinId} onChange={(e) => { setMagasinId(e.target.value); setMats([{ stockId: '', qty: '' }]); }}>{data.magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</Select></Field>
        </div>
        {!nom && <Field label="Produit fini" required><Input value={produitFini} onChange={(e) => setProduitFini(e.target.value)} placeholder="Pâte de cacao" /></Field>}

        <div>
          <div className="mb-1 text-sm font-semibold text-texte">Matières consommées (depuis le stock)</div>
          {stockOpts.length === 0 ? <div className="rounded-lg bg-alerte/10 p-3 text-sm text-alerte">Aucun stock dans ce magasin. Réceptionnez des matières (Achats).</div> : (
            <div className="space-y-2">
              {mats.map((m, i) => {
                const o = stockOpts.find((x) => x.id === m.stockId);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Select className="col-span-8" value={m.stockId} onChange={(e) => setMat(i, { stockId: e.target.value })}>
                      <option value="">— Matière —</option>
                      {stockOpts.map((x) => <option key={x.id} value={x.id}>{x.nom} (dispo {formatQty(x.quantite_base, x.unite)})</option>)}
                    </Select>
                    <Input className="col-span-3" type="number" placeholder={o ? `Qté (${o.unite})` : 'Qté'} value={m.qty} onChange={(e) => setMat(i, { qty: e.target.value })} />
                    <button className="col-span-1 flex items-center justify-center text-texte-2 hover:text-alerte" onClick={() => setMats((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                );
              })}
              <Button variant="ghost" size="sm" onClick={() => setMats((p) => [...p, { stockId: '', qty: '' }])}><Plus className="h-4 w-4" /> Matière</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Produit fini obtenu (kg)" required><Input type="number" value={produiteQty} onChange={(e) => setProduiteQty(e.target.value)} /></Field>
          <Field label="Main d'œuvre (FCFA)"><Input type="number" value={mo} onChange={(e) => setMo(e.target.value)} /></Field>
          <Field label="Énergie (FCFA)"><Input type="number" value={energie} onChange={(e) => setEnergie(e.target.value)} /></Field>
        </div>

        {consumedBase > 0 && produitBase > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3 text-sm">
            <span>Rendement réel : <b className={rendementReel >= (rendementTheo ?? 5000) ? 'text-action' : 'text-alerte'}>{formatBp(rendementReel, 1)}</b>{rendementTheo !== null && <span className="text-texte-2"> (théorique {formatBp(rendementTheo, 0)})</span>}</span>
            <span className="text-texte-2">Consommé {formatQty(consumedBase, 'kg')} → produit {formatQty(produitBase, 'kg')}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
