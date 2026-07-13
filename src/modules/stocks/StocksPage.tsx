import { useState } from 'react';
import { Boxes, Plus, Warehouse, AlertTriangle, ClipboardCheck, ArrowUp } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Money, Badge, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatQty } from '../../lib/units';
import { formatDate } from '../../lib/format';
import { InventaireModal } from './InventaireModal';
import type { CoopMagasin } from '../../domain/database.types';

const ETAT_LABEL: Record<string, string> = { frais: 'Frais', produit_fini: 'Produit fini', intrant: 'Intrant', declasse: 'Déclassé' };

export function StocksPage() {
  const { push } = useToast();
  const [newMag, setNewMag] = useState(false);
  const [inv, setInv] = useState(false);

  const { data, isLoading } = useCoopQuery(['stocks'], async (coopId) => {
    const [mags, stocks, mvts] = await Promise.all([
      supabase.from('coop_magasins').select('*').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_stocks').select('*, coop_produits(nom, unite_affichage, seuil_min_base, seuil_max_base), coop_magasins(nom)').eq('cooperative_id', coopId).gt('quantite_base', 0).order('valeur_xof', { ascending: false }),
      supabase.from('coop_mouvements_stock').select('*, coop_produits(nom, unite_affichage), coop_magasins(nom)').eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(15),
    ]);
    const valeurTotale = (stocks.data ?? []).reduce((s: number, x: Record<string, unknown>) => s + (x.valeur_xof as number), 0);
    return { mags: (mags.data ?? []) as CoopMagasin[], stocks: stocks.data ?? [], mvts: mvts.data ?? [], valeurTotale };
  });

  const create = useCoopMutation(
    async (coopId, f: Record<string, unknown>) => { const { error } = await supabase.from('coop_magasins').insert({ ...f, cooperative_id: coopId }); if (error) throw error; },
    { invalidate: ['stocks'], onSuccess: () => { push('success', 'Magasin créé'); setNewMag(false); } },
  );

  return (
    <>
      <PageHeader
        title="Stocks multi-états"
        subtitle="Mouvements exclusivement par pièces (P6). Valorisation au PMP."
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setNewMag(true)}><Plus className="h-4 w-4" /> Magasin</Button>
            <Button variant="action" onClick={() => setInv(true)} disabled={!data?.mags.length}><ClipboardCheck className="h-4 w-4" /> Inventaire</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Valeur du stock" value={<Money value={data?.valeurTotale ?? 0} suffix={false} size="xl" />} tone="or" icon={<Boxes className="h-4 w-4" />} />
        <Stat label="Magasins" value={data?.mags.length ?? 0} tone="primaire" icon={<Warehouse className="h-4 w-4" />} />
        <Stat label="Références en stock" value={data?.stocks.length ?? 0} tone="action" icon={<Boxes className="h-4 w-4" />} />
      </div>

      {isLoading ? <Spinner /> : (
        <div className="space-y-6">
          <Card>
            <CardHeader title="État des stocks" subtitle="Quantités et valeur par magasin" />
            <CardBody className="p-0">
              {!data?.stocks.length ? (
                <EmptyState icon={<Boxes className="h-8 w-8" />} title="Stock vide" description="Réceptionnez une commande fournisseur (Achats) pour alimenter le stock." />
              ) : (
                <Table>
                  <THead><Th>Produit</Th><Th>Magasin</Th><Th>État</Th><Th>Lot / DLC</Th><Th align="right">Quantité</Th><Th align="right">Valeur (PMP)</Th></THead>
                  <TBody>
                    {data.stocks.map((s: Record<string, unknown>) => {
                      const prod = s.coop_produits as { nom?: string; unite_affichage?: string } | null;
                      const dlcProche = Boolean(s.dlc) && new Date(s.dlc as string).getTime() - Date.now() < 7 * 864e5;
                      return (
                        <Tr key={s.id as string}>
                          <Td className="font-medium text-texte">{prod?.nom ?? '—'}</Td>
                          <Td className="text-sm text-texte-2">{(s.coop_magasins as { nom?: string } | null)?.nom}</Td>
                          <Td><Badge tone={s.etat === 'declasse' ? 'alerte' : 'neutre'}>{ETAT_LABEL[s.etat as string] ?? (s.etat as string)}</Badge></Td>
                          <Td className="text-xs text-texte-2">
                            {(s.lot as string) || '—'}
                            {Boolean(s.dlc) && <span className={dlcProche ? 'ml-1 text-alerte' : 'ml-1'}>{dlcProche && <AlertTriangle className="inline h-3 w-3" />} {formatDate(s.dlc as string)}</span>}
                          </Td>
                          <Td align="right" className="font-semibold">
                            <div className="flex items-center justify-end gap-1.5">
                              {(() => {
                                const min = (prod as { seuil_min_base?: number } | null)?.seuil_min_base ?? 0;
                                const max = (prod as { seuil_max_base?: number } | null)?.seuil_max_base ?? 0;
                                const q = s.quantite_base as number;
                                if (min > 0 && q < min) return <Badge tone="alerte"><AlertTriangle className="mr-0.5 inline h-3 w-3" />Rupture</Badge>;
                                if (max > 0 && q > max) return <Badge tone="or"><ArrowUp className="mr-0.5 inline h-3 w-3" />Surstock</Badge>;
                                return null;
                              })()}
                              {formatQty(s.quantite_base as number, prod?.unite_affichage ?? 'kg')}
                            </div>
                          </Td>
                          <Td align="right"><Money value={s.valeur_xof as number} size="sm" /></Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Mouvements récents" />
            <CardBody className="p-0">
              {!data?.mvts.length ? <div className="py-6 text-center text-sm text-texte-2">Aucun mouvement.</div> : (
                <ul className="divide-y divide-ligne/60">
                  {data.mvts.map((m: Record<string, unknown>) => {
                    const prod = m.coop_produits as { nom?: string; unite_affichage?: string } | null;
                    const entree = m.sens === 'entree';
                    return (
                      <li key={m.id as string} className="flex items-center justify-between px-5 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-texte">{prod?.nom ?? '—'}</span>
                          <span className="ml-2 text-xs text-texte-2">{(m.motif as string).replace(/_/g, ' ')} · {(m.coop_magasins as { nom?: string } | null)?.nom} · {formatDate(m.created_at as string)}</span>
                        </div>
                        <span className={`text-sm font-semibold ${entree ? 'text-action' : 'text-alerte'}`}>
                          {entree ? '+' : '−'}{formatQty(m.quantite_base as number, prod?.unite_affichage ?? 'kg')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {newMag && <MagasinForm onClose={() => setNewMag(false)} onSubmit={(f) => create.mutate(f)} loading={create.isPending} />}
      {inv && <InventaireModal magasins={data?.mags ?? []} onClose={() => setInv(false)} />}
    </>
  );
}

function MagasinForm({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (f: Record<string, unknown>) => void; loading: boolean }) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [type, setType] = useState('vente');
  return (
    <Modal open onClose={onClose} title="Nouveau magasin"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={loading} disabled={!code || !nom} onClick={() => onSubmit({ code: code.toUpperCase(), nom, type })}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAG-1" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Magasin intrants" /></Field>
        </div>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="vente">Point de vente</option><option value="siege">Siège</option><option value="froid">Chambre froide</option><option value="intrants">Magasin d'intrants</option></Select></Field>
      </div>
    </Modal>
  );
}
