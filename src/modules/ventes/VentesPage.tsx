import { useState, useMemo } from 'react';
import { Store, Plus, Trash2, Check, Users, ShoppingBag, TrendingUp } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Money, Badge, Tabs, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { toBase, formatQty } from '../../lib/units';
import { formatFcfaText } from '../../lib/money';
import { formatDate } from '../../lib/format';
import type { CoopMagasin, CoopClient, CoopCaisse } from '../../domain/database.types';

type Tab = 'ventes' | 'recouvrement' | 'clients';
interface StockOpt { id: string; produit_id: string; lot: string; etat: string; quantite_base: number; nom: string; unite: string }
interface Ligne { stockId: string; qty: string; prix: string }
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

export function VentesPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('ventes');
  const [comptoir, setComptoir] = useState(false);
  const [newClient, setNewClient] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['ventes'], async (coopId) => {
    const [ventes, clients, magasins, caisses, stocks] = await Promise.all([
      supabase.from('coop_ventes').select('*, coop_clients(nom), coop_membres(nom, prenoms)').eq('cooperative_id', coopId).order('date_vente', { ascending: false }).limit(40),
      supabase.from('coop_clients').select('*').eq('cooperative_id', coopId).order('nom'),
      supabase.from('coop_magasins').select('*').eq('cooperative_id', coopId).eq('actif', true).order('code'),
      supabase.from('coop_caisses').select('*').eq('cooperative_id', coopId).eq('actif', true).order('code'),
      supabase.from('coop_stocks').select('id, produit_id, lot, etat, quantite_base, magasin_id, coop_produits(nom, unite_affichage)').eq('cooperative_id', coopId).gt('quantite_base', 0),
    ]);
    const vs = ventes.data ?? [];
    const ca = vs.reduce((s: number, v: Record<string, unknown>) => s + (v.montant_ttc_xof as number), 0);
    const aRecouvrer = vs.filter((v: Record<string, unknown>) => v.statut === 'a_recouvrer').reduce((s: number, v: Record<string, unknown>) => s + ((v.montant_ttc_xof as number) - (v.regle_xof as number)), 0);
    return {
      ventes: vs, clients: (clients.data ?? []) as CoopClient[], magasins: (magasins.data ?? []) as CoopMagasin[],
      caisses: (caisses.data ?? []) as CoopCaisse[], stocks: stocks.data ?? [], ca, aRecouvrer,
    };
  });

  const createClient = useCoopMutation(
    async (coopId, f: Record<string, unknown>) => { const { error } = await supabase.from('coop_clients').insert({ ...f, cooperative_id: coopId }); if (error) throw error; },
    { invalidate: ['ventes'], onSuccess: () => { push('success', 'Client créé'); setNewClient(false); } },
  );

  return (
    <>
      <PageHeader
        title="Ventes & commercial"
        subtitle="Comptoir : sortie de stock + encaissement ou crédit membre (plafond vérifié)."
        icon={<Store className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setNewClient(true)}><Users className="h-4 w-4" /> Client</Button>
            <Button variant="action" onClick={() => setComptoir(true)} disabled={!data?.magasins.length}><ShoppingBag className="h-4 w-4" /> Vente comptoir</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Chiffre d'affaires" value={<Money value={data?.ca ?? 0} suffix={false} size="xl" />} tone="or" icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="À recouvrer (clients)" value={<Money value={data?.aRecouvrer ?? 0} suffix={false} size="xl" />} tone="alerte" icon={<Store className="h-4 w-4" />} />
        <Stat label="Clients" value={data?.clients.length ?? 0} tone="primaire" icon={<Users className="h-4 w-4" />} />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'ventes', label: 'Ventes', count: data?.ventes.length },
        { key: 'recouvrement', label: 'Recouvrement', count: data?.ventes.filter((v: Record<string, unknown>) => v.statut === 'a_recouvrer').length },
        { key: 'clients', label: 'Clients', count: data?.clients.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'ventes' && (
            !data?.ventes.length ? <EmptyState icon={<Store className="h-8 w-8" />} title="Aucune vente" description="Lancez une vente comptoir (nécessite du stock disponible)." action={<Button variant="action" onClick={() => setComptoir(true)} disabled={!data?.magasins.length}><ShoppingBag className="h-4 w-4" /> Vente comptoir</Button>} /> :
            <Card><Table>
              <THead><Th>Date</Th><Th>Client / Membre</Th><Th>Paiement</Th><Th align="right">Montant</Th><Th>Statut</Th></THead>
              <TBody>
                {data.ventes.map((v: Record<string, unknown>) => {
                  const cl = v.coop_clients as { nom?: string } | null;
                  const mb = v.coop_membres as { nom?: string; prenoms?: string } | null;
                  return (
                    <Tr key={v.id as string}>
                      <Td className="text-xs text-texte-2">{formatDate(v.date_vente as string)}</Td>
                      <Td className="font-medium text-texte">{cl?.nom ?? (mb ? `${mb.nom} ${mb.prenoms ?? ''}` : 'Comptoir')}</Td>
                      <Td><Badge tone="neutre">{(v.mode_paiement as string).replace(/_/g, ' ')}</Badge></Td>
                      <Td align="right"><Money value={v.montant_ttc_xof as number} size="sm" /></Td>
                      <Td><Badge tone={v.statut === 'payee' ? 'action' : 'alerte'} dot>{v.statut === 'payee' ? 'Payée' : 'À recouvrer'}</Badge></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table></Card>
          )}

          {tab === 'recouvrement' && (
            (() => {
              const impayes = data!.ventes.filter((v: Record<string, unknown>) => v.statut === 'a_recouvrer');
              return !impayes.length ? <EmptyState icon={<Store className="h-8 w-8" />} title="Aucun impayé" description="Toutes les ventes à crédit externe sont recouvrées." /> :
                <Card>
                  <CardHeader title="Balance âgée clients" subtitle="Ventes à crédit externe en attente de recouvrement" />
                  <CardBody className="p-0"><Table>
                    <THead><Th>Date</Th><Th>Client</Th><Th align="right">Reste dû</Th><Th align="right">Ancienneté</Th></THead>
                    <TBody>
                      {impayes.map((v: Record<string, unknown>) => {
                        const jours = Math.floor((Date.now() - new Date(v.date_vente as string).getTime()) / 864e5);
                        return (
                          <Tr key={v.id as string}>
                            <Td className="text-xs text-texte-2">{formatDate(v.date_vente as string)}</Td>
                            <Td className="font-medium text-texte">{(v.coop_clients as { nom?: string } | null)?.nom ?? '—'}</Td>
                            <Td align="right"><Money value={(v.montant_ttc_xof as number) - (v.regle_xof as number)} size="sm" colorNegative /></Td>
                            <Td align="right"><Badge tone={jours > 30 ? 'alerte' : 'neutre'}>{jours} j</Badge></Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table></CardBody>
                </Card>;
            })()
          )}

          {tab === 'clients' && (
            !data?.clients.length ? <EmptyState icon={<Users className="h-8 w-8" />} title="Aucun client" description="Ajoutez vos clients (particuliers, revendeurs, grossistes…)." action={<Button variant="action" onClick={() => setNewClient(true)}><Plus className="h-4 w-4" /> Ajouter</Button>} /> :
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.clients.map((c) => (
                <Card key={c.id}><CardBody>
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-texte">{c.nom}</h3><Badge tone="neutre">{c.type}</Badge></div>
                  <div className="mt-1 text-sm text-texte-2">{c.telephone ?? '—'}</div>
                  {c.plafond_credit_xof > 0 && <div className="mt-1 text-xs text-texte-2">Plafond crédit : {formatFcfaText(c.plafond_credit_xof)}</div>}
                </CardBody></Card>
              ))}
            </div>
          )}
        </>
      )}

      {comptoir && <ComptoirForm data={data!} onClose={() => { setComptoir(false); refetch(); }} onDone={(m) => push('success', m)} />}
      {newClient && <ClientForm onClose={() => setNewClient(false)} onSubmit={(f) => createClient.mutate(f)} loading={createClient.isPending} />}
    </>
  );
}

function ComptoirForm({ data, onClose, onDone }: {
  data: { magasins: CoopMagasin[]; caisses: CoopCaisse[]; clients: CoopClient[]; stocks: Record<string, unknown>[] };
  onClose: () => void; onDone: (msg: string) => void;
}) {
  const { push } = useToast();
  const [magasinId, setMagasinId] = useState(data.magasins[0]?.id ?? '');
  const [mode, setMode] = useState('comptant');
  const [clientId, setClientId] = useState('');
  const [membre, setMembre] = useState<Picked | null>(null);
  const [caisseId, setCaisseId] = useState(data.caisses[0]?.id ?? '');
  const [lignes, setLignes] = useState<Ligne[]>([{ stockId: '', qty: '', prix: '' }]);

  const stockOpts: StockOpt[] = useMemo(() => data.stocks.filter((s) => s.magasin_id === magasinId).map((s) => ({
    id: s.id as string, produit_id: s.produit_id as string, lot: s.lot as string, etat: s.etat as string,
    quantite_base: s.quantite_base as number, nom: (s.coop_produits as { nom?: string } | null)?.nom ?? '—',
    unite: (s.coop_produits as { unite_affichage?: string } | null)?.unite_affichage ?? 'kg',
  })), [data.stocks, magasinId]);

  const total = lignes.reduce((s, l) => s + Math.round((Number(l.qty) || 0) * (Number(l.prix) || 0)), 0);
  const setL = (i: number, patch: Partial<Ligne>) => setLignes((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useCoopMutation(
    async (coopId) => {
      const valid = lignes.filter((l) => l.stockId && Number(l.qty) > 0);
      if (!valid.length) throw new Error('Ajoutez au moins une ligne');
      // vérif disponibilité
      for (const l of valid) {
        const opt = stockOpts.find((o) => o.id === l.stockId)!;
        if (toBase(Number(l.qty), opt.unite) > opt.quantite_base) throw new Error(`Stock insuffisant pour ${opt.nom}`);
      }
      const paye = mode === 'comptant' || mode === 'mobile_money' || mode === 'credit_membre';
      const { data: vente, error } = await supabase.from('coop_ventes').insert({
        cooperative_id: coopId, magasin_id: magasinId, client_id: clientId || null, membre_id: membre?.id ?? null,
        mode_paiement: mode, montant_ht_xof: total, montant_ttc_xof: total,
        regle_xof: paye ? total : 0, statut: paye ? 'payee' : 'a_recouvrer',
      }).select('id').single();
      if (error) throw error;

      for (const l of valid) {
        const opt = stockOpts.find((o) => o.id === l.stockId)!;
        const qBase = toBase(Number(l.qty), opt.unite);
        const montant = Math.round(Number(l.qty) * Number(l.prix));
        await supabase.from('coop_lignes_vente').insert({ cooperative_id: coopId, vente_id: vente.id, produit_id: opt.produit_id, lot: opt.lot, quantite_base: qBase, prix_unitaire_xof: Number(l.prix), montant_xof: montant });
        await supabase.from('coop_mouvements_stock').insert({ cooperative_id: coopId, magasin_id: magasinId, produit_id: opt.produit_id, lot: opt.lot, etat: opt.etat, sens: 'sortie', quantite_base: qBase, motif: 'vente_comptoir', piece_type: 'vente', piece_id: vente.id });
      }

      // effet du paiement
      if (mode === 'comptant' || mode === 'mobile_money') {
        await supabase.from('coop_operations_tresorerie').insert({ cooperative_id: coopId, caisse_id: caisseId || null, sens: 'credit', montant_xof: total, nature: 'vente comptoir', mode: mode === 'comptant' ? 'espece' : 'mobile_money', source_type: 'vente', source_id: vente.id });
      } else if (mode === 'credit_membre' && membre) {
        await supabase.from('coop_mouvements_compte_membre').insert({ cooperative_id: coopId, membre_id: membre.id, sens: 'debit', nature: 'achat_credit', montant_xof: total, piece_type: 'vente', piece_id: vente.id, libelle: 'Achat à crédit (comptoir)' });
        if (membre.telephone) {
          await supabase.from('coop_notifications_sms').insert({ cooperative_id: coopId, membre_id: membre.id, telephone: membre.telephone, type: 'confirmation_avance', message: `Atlas Coop: achat à crédit de ${formatFcfaText(total)} porté à votre compte.`, source_type: 'vente', source_id: vente.id });
        }
      }
    },
    {
      invalidate: ['ventes', 'stocks', 'tresorerie', 'dashboard', 'membres'],
      onSuccess: () => { onDone(`Vente enregistrée · ${formatFcfaText(total)}`); onClose(); },
    },
  );

  const onValidate = () => {
    if (mode === 'credit_membre' && !membre) { push('error', 'Sélectionnez le membre'); return; }
    if ((mode === 'comptant' || mode === 'mobile_money') && !caisseId) { push('error', 'Aucune caisse — créez-en une dans Trésorerie'); return; }
    save.mutate(undefined);
  };

  return (
    <Modal open onClose={onClose} size="xl" title="Vente comptoir" subtitle="Sortie de stock immédiate (P6)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={total <= 0} onClick={onValidate}><Check className="h-4 w-4" /> Valider ({formatFcfaText(total)})</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Magasin"><Select value={magasinId} onChange={(e) => { setMagasinId(e.target.value); setLignes([{ stockId: '', qty: '', prix: '' }]); }}>{data.magasins.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</Select></Field>
          <Field label="Mode de paiement"><Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="comptant">Comptant (caisse)</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="credit_membre">Crédit membre (M3)</option>
            <option value="credit_client">Crédit client (recouvrement)</option>
          </Select></Field>
        </div>

        {(mode === 'comptant' || mode === 'mobile_money') && data.caisses.length > 0 && (
          <Field label="Caisse"><Select value={caisseId} onChange={(e) => setCaisseId(e.target.value)}>{data.caisses.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}</Select></Field>
        )}
        {mode === 'credit_client' && (
          <Field label="Client"><Select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">— choisir —</option>{data.clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</Select></Field>
        )}
        {mode === 'credit_membre' && (
          membre ? (
            <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-3">
              <span className="font-medium text-texte">{membre.nom} {membre.prenoms} <span className="mono text-xs text-texte-2">{membre.numero}</span></span>
              <Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button>
            </div>
          ) : <MembrePicker value={null} onChange={setMembre} />
        )}

        {stockOpts.length === 0 ? (
          <div className="rounded-lg bg-alerte/10 p-3 text-sm text-alerte">Aucun stock disponible dans ce magasin. Réceptionnez des produits (Achats).</div>
        ) : (
          <div className="space-y-2">
            {lignes.map((l, i) => {
              const opt = stockOpts.find((o) => o.id === l.stockId);
              return (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Select className="col-span-5" value={l.stockId} onChange={(e) => setL(i, { stockId: e.target.value })}>
                    <option value="">— Produit —</option>
                    {stockOpts.map((o) => <option key={o.id} value={o.id}>{o.nom} (dispo {formatQty(o.quantite_base, o.unite)})</option>)}
                  </Select>
                  <Input className="col-span-3" type="number" placeholder={opt ? `Qté (${opt.unite})` : 'Qté'} value={l.qty} onChange={(e) => setL(i, { qty: e.target.value })} />
                  <Input className="col-span-3" type="number" placeholder="Prix/unité" value={l.prix} onChange={(e) => setL(i, { prix: e.target.value })} />
                  <button className="col-span-1 flex items-center justify-center text-texte-2 hover:text-alerte" onClick={() => setLignes((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" onClick={() => setLignes((p) => [...p, { stockId: '', qty: '', prix: '' }])}><Plus className="h-4 w-4" /> Ligne</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ClientForm({ onClose, onSubmit, loading }: { onClose: () => void; onSubmit: (f: Record<string, unknown>) => void; loading: boolean }) {
  const [nom, setNom] = useState(''); const [type, setType] = useState('particulier'); const [telephone, setTelephone] = useState(''); const [plafond, setPlafond] = useState('0');
  return (
    <Modal open onClose={onClose} title="Nouveau client"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={loading} disabled={!nom} onClick={() => onSubmit({ nom, type, telephone: telephone || null, plafond_credit_xof: Number(plafond) || 0 })}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Nom" required><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Grossiste Adjamé" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="particulier">Particulier</option><option value="revendeur">Revendeur</option><option value="grossiste">Grossiste</option><option value="industriel">Industriel</option><option value="exportateur">Exportateur</option></Select></Field>
          <Field label="Téléphone"><Input value={telephone} onChange={(e) => setTelephone(e.target.value)} /></Field>
        </div>
        <Field label="Plafond de crédit (FCFA)"><Input type="number" value={plafond} onChange={(e) => setPlafond(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
