import { useState, useMemo } from 'react';
import { ClipboardCheck, Check } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { Modal, Button, Field, Select, Input, Money, Spinner, useToast, Table, THead, TBody, Th, Tr, Td } from '../../ui';
import { toBase, formatQty } from '../../lib/units';
import type { CoopMagasin } from '../../domain/database.types';

interface StockLine { id: string; produit_id: string; lot: string; etat: string; quantite_base: number; valeur_xof: number; nom: string; unite: string }

export function InventaireModal({ magasins, onClose }: { magasins: CoopMagasin[]; onClose: () => void }) {
  const { push } = useToast();
  const [magasinId, setMagasinId] = useState(magasins[0]?.id ?? '');
  const [counts, setCounts] = useState<Record<string, string>>({});

  const { data: stocks, isLoading } = useCoopQuery(['inv-stocks', magasinId], async (coopId) => {
    if (!magasinId) return [];
    const { data } = await supabase.from('coop_stocks')
      .select('id, produit_id, lot, etat, quantite_base, valeur_xof, coop_produits(nom, unite_affichage)')
      .eq('cooperative_id', coopId).eq('magasin_id', magasinId);
    return (data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string, produit_id: s.produit_id as string, lot: s.lot as string, etat: s.etat as string,
      quantite_base: s.quantite_base as number, valeur_xof: s.valeur_xof as number,
      nom: (s.coop_produits as { nom?: string } | null)?.nom ?? '—',
      unite: (s.coop_produits as { unite_affichage?: string } | null)?.unite_affichage ?? 'kg',
    })) as StockLine[];
  }, { enabled: !!magasinId });

  const lignes = useMemo(() => (stocks ?? []).map((s) => {
    const raw = counts[s.id];
    const comptee = raw === undefined || raw === '' ? s.quantite_base : toBase(Number(raw.replace(',', '.')) || 0, s.unite);
    const ecart = comptee - s.quantite_base;
    const pmp = s.quantite_base > 0 ? s.valeur_xof / s.quantite_base : 0;
    return { ...s, comptee, ecart, valeurEcart: Math.round(pmp * ecart) };
  }), [stocks, counts]);
  const netValeur = lignes.reduce((sum, l) => sum + l.valeurEcart, 0);
  const nbEcarts = lignes.filter((l) => l.ecart !== 0).length;

  const save = useCoopMutation(
    async (coopId) => {
      const { data: inv, error } = await supabase.from('coop_inventaires').insert({
        cooperative_id: coopId, magasin_id: magasinId, nom: `Inventaire ${new Date().toISOString().slice(0, 10)}`,
      }).select('id').single();
      if (error) throw error;
      const rows = lignes.map((l) => ({
        cooperative_id: coopId, inventaire_id: inv.id, stock_id: l.id, produit_id: l.produit_id, lot: l.lot, etat: l.etat,
        quantite_theorique_base: l.quantite_base, quantite_comptee_base: l.comptee,
      }));
      if (rows.length) await supabase.from('coop_lignes_inventaire').insert(rows);
      const { error: ve } = await supabase.rpc('coop_valider_inventaire', { p_inv: inv.id });
      if (ve) throw ve;
    },
    { invalidate: ['stocks'], onSuccess: () => { push('success', 'Inventaire validé · stock ajusté · écriture générée'); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Inventaire physique" subtitle="Comptage → écart valorisé → écriture d'ajustement (PMP)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!lignes.length} onClick={() => save.mutate(undefined)}><Check className="h-4 w-4" /> Valider l'inventaire</Button></>}>
      <div className="space-y-4">
        <Field label="Magasin"><Select value={magasinId} onChange={(e) => { setMagasinId(e.target.value); setCounts({}); }}>{magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</Select></Field>
        {isLoading ? <Spinner /> : !lignes.length ? (
          <p className="py-6 text-center text-sm text-texte-2">Aucun stock dans ce magasin.</p>
        ) : (
          <>
            <Table>
              <THead><Th>Produit</Th><Th align="right">Théorique</Th><Th align="right">Compté</Th><Th align="right">Écart</Th><Th align="right">Valeur écart</Th></THead>
              <TBody>
                {lignes.map((l) => (
                  <Tr key={l.id}>
                    <Td className="font-medium text-texte">{l.nom}</Td>
                    <Td align="right" className="text-sm text-texte-2">{formatQty(l.quantite_base, l.unite)}</Td>
                    <Td align="right"><Input type="number" className="w-24 text-right" value={counts[l.id] ?? ''} placeholder={String(Math.round(l.quantite_base / 1000 * 100) / 100)} onChange={(e) => setCounts((p) => ({ ...p, [l.id]: e.target.value }))} /></Td>
                    <Td align="right" className={l.ecart === 0 ? 'text-texte-2' : l.ecart > 0 ? 'text-action' : 'text-alerte'}>{l.ecart === 0 ? '—' : `${l.ecart > 0 ? '+' : ''}${formatQty(l.ecart, l.unite)}`}</Td>
                    <Td align="right"><Money value={l.valeurEcart} size="sm" suffix={false} colorNegative /></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center justify-between rounded-lg bg-surface-2 p-3 text-sm">
              <span className="flex items-center gap-1.5 text-texte-2"><ClipboardCheck className="h-4 w-4" /> {nbEcarts} écart{nbEcarts > 1 ? 's' : ''} détecté{nbEcarts > 1 ? 's' : ''}</span>
              <span>Ajustement net : <Money value={netValeur} size="sm" colorNegative /></span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
