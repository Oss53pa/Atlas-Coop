import { useState } from 'react';
import { Banknote, Plus, Landmark, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Money, Modal, Field, Input, Select,
  Spinner, useToast, Badge, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';
import { RapprochementModal } from './RapprochementModal';
import type { CoopCaisse, CoopCompteBancaire, Sens } from '../../domain/database.types';

export function TresoreriePage() {
  const { push } = useToast();
  const [opOpen, setOpOpen] = useState(false);
  const [newCaisse, setNewCaisse] = useState(false);
  const [newBanque, setNewBanque] = useState(false);
  const [rappro, setRappro] = useState<CoopCompteBancaire | null>(null);

  const { data, isLoading } = useCoopQuery(['tresorerie'], async (coopId) => {
    const [caisses, banques, ops] = await Promise.all([
      supabase.from('coop_caisses').select('*').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_comptes_bancaires').select('*').eq('cooperative_id', coopId).order('banque'),
      supabase.from('coop_operations_tresorerie').select('*, coop_caisses(libelle), coop_comptes_bancaires(banque)').eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(30),
    ]);
    const c = (caisses.data ?? []) as CoopCaisse[];
    const b = (banques.data ?? []) as CoopCompteBancaire[];
    const total = c.reduce((s, x) => s + x.solde_xof, 0) + b.reduce((s, x) => s + x.solde_xof, 0);
    return { caisses: c, banques: b, ops: ops.data ?? [], total };
  });

  return (
    <>
      <PageHeader
        title="Trésorerie & paiements"
        subtitle="Multi-caisses & banques. Journal de caisse inviolable, arrêté quotidien (P6)."
        icon={<Banknote className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setOpOpen(true)} disabled={!data?.caisses.length && !data?.banques.length}><Plus className="h-4 w-4" /> Opération</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Trésorerie totale" value={<Money value={data?.total ?? 0} suffix={false} size="xl" />} tone="action" icon={<Banknote className="h-4 w-4" />} />
        <Stat label="Caisses" value={data?.caisses.length ?? 0} tone="primaire" icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Comptes bancaires" value={data?.banques.length ?? 0} tone="primaire" icon={<Landmark className="h-4 w-4" />} />
      </div>

      {isLoading ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Caisses" icon={<Wallet className="h-5 w-5" />} action={<Button variant="outline" size="sm" onClick={() => setNewCaisse(true)}><Plus className="h-4 w-4" /> Ajouter</Button>} />
            <CardBody className="space-y-2">
              {!data?.caisses.length ? <p className="py-4 text-center text-sm text-texte-2">Aucune caisse.</p> :
                data.caisses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-ligne p-3">
                    <div><div className="font-medium text-texte">{c.libelle}</div><div className="text-xs text-texte-2 capitalize">{c.type} · <span className="mono">{c.code}</span></div></div>
                    <Money value={c.solde_xof} size="sm" colorNegative />
                  </div>
                ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Comptes bancaires" icon={<Landmark className="h-5 w-5" />} action={<Button variant="outline" size="sm" onClick={() => setNewBanque(true)}><Plus className="h-4 w-4" /> Ajouter</Button>} />
            <CardBody className="space-y-2">
              {!data?.banques.length ? <p className="py-4 text-center text-sm text-texte-2">Aucun compte.</p> :
                data.banques.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-ligne p-3">
                    <div><div className="font-medium text-texte">{b.banque}</div><div className="mono text-xs text-texte-2">{b.numero ?? b.libelle ?? ''}</div></div>
                    <div className="flex items-center gap-3">
                      <Money value={b.solde_xof} size="sm" colorNegative />
                      <Button variant="ghost" size="sm" onClick={() => setRappro(b)}>Rapprocher</Button>
                    </div>
                  </div>
                ))}
            </CardBody>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Opérations récentes" />
        <CardBody className="p-0">
          {!data?.ops.length ? <div className="py-8 text-center text-sm text-texte-2">Aucune opération.</div> : (
            <Table>
              <THead><Th>Date</Th><Th>Nature</Th><Th>Compte</Th><Th>Mode</Th><Th align="right">Montant</Th></THead>
              <TBody>
                {data.ops.map((o: Record<string, unknown>) => {
                  const credit = o.sens === 'credit';
                  const compte = (o.coop_caisses as { libelle?: string } | null)?.libelle ?? (o.coop_comptes_bancaires as { banque?: string } | null)?.banque ?? '—';
                  return (
                    <Tr key={o.id as string}>
                      <Td className="text-xs text-texte-2">{formatDate(o.date_operation as string)}</Td>
                      <Td><span className="flex items-center gap-1.5">{credit ? <ArrowDownLeft className="h-3.5 w-3.5 text-action" /> : <ArrowUpRight className="h-3.5 w-3.5 text-alerte" />}{o.nature as string}</span></Td>
                      <Td className="text-sm">{compte}</Td>
                      <Td><Badge tone="neutre">{(o.mode as string).replace('_', ' ')}</Badge></Td>
                      <Td align="right"><Money value={credit ? (o.montant_xof as number) : -(o.montant_xof as number)} size="sm" colorNegative /></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {opOpen && <OperationForm caisses={data?.caisses ?? []} banques={data?.banques ?? []} onClose={() => setOpOpen(false)} onDone={() => push('success', 'Opération enregistrée')} />}
      {newCaisse && <CaisseForm onClose={() => setNewCaisse(false)} onDone={() => push('success', 'Caisse créée')} />}
      {newBanque && <BanqueForm onClose={() => setNewBanque(false)} onDone={() => push('success', 'Compte créé')} />}
      {rappro && <RapprochementModal banque={rappro} onClose={() => setRappro(null)} />}
    </>
  );
}

function OperationForm({ caisses, banques, onClose, onDone }: { caisses: CoopCaisse[]; banques: CoopCompteBancaire[]; onClose: () => void; onDone: () => void }) {
  const [compte, setCompte] = useState(caisses[0] ? `caisse:${caisses[0].id}` : banques[0] ? `banque:${banques[0].id}` : '');
  const [sens, setSens] = useState<Sens>('credit');
  const [montant, setMontant] = useState('');
  const [nature, setNature] = useState('');
  const [mode, setMode] = useState('espece');
  const montantN = Number(montant.replace(/\s/g, '')) || 0;

  const save = useCoopMutation(
    async (coopId) => {
      const [kind, id] = compte.split(':');
      const { error } = await supabase.from('coop_operations_tresorerie').insert({
        cooperative_id: coopId,
        caisse_id: kind === 'caisse' ? id : null,
        compte_bancaire_id: kind === 'banque' ? id : null,
        sens, montant_xof: montantN, nature: nature || 'divers', mode,
      });
      if (error) throw error;
    },
    { invalidate: ['tresorerie', 'dashboard'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} title="Nouvelle opération de trésorerie"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!compte || montantN <= 0} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Compte">
          <Select value={compte} onChange={(e) => setCompte(e.target.value)}>
            <optgroup label="Caisses">{caisses.map((c) => <option key={c.id} value={`caisse:${c.id}`}>{c.libelle}</option>)}</optgroup>
            <optgroup label="Banques">{banques.map((b) => <option key={b.id} value={`banque:${b.id}`}>{b.banque}</option>)}</optgroup>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sens"><Select value={sens} onChange={(e) => setSens(e.target.value as Sens)}><option value="credit">Encaissement (+)</option><option value="debit">Décaissement (−)</option></Select></Field>
          <Field label="Mode"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="espece">Espèces</option><option value="mobile_money">Mobile Money</option><option value="virement">Virement</option><option value="cheque">Chèque</option></Select></Field>
        </div>
        <Field label="Montant (FCFA)" required><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
        <Field label="Nature"><Input value={nature} onChange={(e) => setNature(e.target.value)} placeholder="Ex. approvisionnement caisse" /></Field>
      </div>
    </Modal>
  );
}

function CaisseForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [libelle, setLibelle] = useState(''); const [type, setType] = useState('siege');
  const save = useCoopMutation(async (coopId) => { const { error } = await supabase.from('coop_caisses').insert({ cooperative_id: coopId, code: code.toUpperCase(), libelle, type }); if (error) throw error; }, { invalidate: ['tresorerie'], onSuccess: () => { onDone(); onClose(); } });
  return (
    <Modal open onClose={onClose} title="Nouvelle caisse" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!code || !libelle} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="C-SIEGE" /></Field>
          <Field label="Libellé" required className="col-span-2"><Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Caisse siège" /></Field>
        </div>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="siege">Siège</option><option value="magasin">Magasin</option><option value="collecte">Point de collecte</option><option value="vente">Point de vente</option></Select></Field>
      </div>
    </Modal>
  );
}

function BanqueForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [banque, setBanque] = useState(''); const [numero, setNumero] = useState('');
  const save = useCoopMutation(async (coopId) => { const { error } = await supabase.from('coop_comptes_bancaires').insert({ cooperative_id: coopId, banque, numero: numero || null }); if (error) throw error; }, { invalidate: ['tresorerie'], onSuccess: () => { onDone(); onClose(); } });
  return (
    <Modal open onClose={onClose} title="Nouveau compte bancaire" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!banque} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <Field label="Banque" required><Input value={banque} onChange={(e) => setBanque(e.target.value)} placeholder="Ex. NSIA / Ecobank" /></Field>
        <Field label="Numéro de compte"><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
