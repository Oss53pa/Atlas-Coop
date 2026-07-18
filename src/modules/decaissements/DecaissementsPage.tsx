import { useState } from 'react';
import { Smartphone, Plus, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Money, Modal,
  Field, Input, Select, Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';

interface Decaissement {
  id: string; beneficiaire: string; telephone: string; operateur: string; montant_xof: number;
  motif: string | null; statut: string; reference_externe: string | null; erreur: string | null;
  created_at: string;
}
interface MembrePicker { id: string; nom: string | null; prenoms: string | null; raison_sociale: string | null; telephone: string | null }

const OPERATEUR_LABEL: Record<string, string> = { orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', wave: 'Wave' };

export function DecaissementsPage() {
  const { push } = useToast();
  const [nouveau, setNouveau] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['decaissements'], async (coopId) => {
    const { data } = await supabase.from('coop_decaissements').select('*')
      .eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(200);
    return (data ?? []) as Decaissement[];
  });

  const enFile = (data ?? []).filter((d) => d.statut === 'file').length;
  const totalFile = (data ?? []).filter((d) => d.statut === 'file').reduce((s, d) => s + d.montant_xof, 0);

  const dispatch = useCoopMutation(
    async (coopId) => {
      const { data: r, error } = await supabase.functions.invoke('coop-cinetpay-payout', { body: { cooperative_id: coopId } });
      if (error) throw error;
      return r as { processed: number; paid: number; failed: number; mode: string };
    },
    {
      invalidate: ['decaissements', 'tresorerie'],
      onSuccess: (r) => push('success', `Décaissement : ${r?.paid ?? 0}/${r?.processed ?? 0} payés (${r?.mode ?? 'simulé'})`),
    },
  );

  return (
    <>
      <PageHeader
        title="Décaissements Mobile Money"
        subtitle="Ristournes, avances et paiements collecte versés en masse (Orange/MTN/Moov/Wave)."
        icon={<Smartphone className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setNouveau(true)}><Plus className="h-4 w-4" /> Nouveau décaissement</Button>
            <Button variant="action" loading={dispatch.isPending} disabled={enFile === 0} onClick={() => dispatch.mutate(undefined)}><Send className="h-4 w-4" /> Traiter la file ({enFile})</Button>
          </>
        }
      />

      {isLoading ? <Spinner /> : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="En file d'attente" value={enFile} tone={enFile > 0 ? 'or' : 'primaire'} icon={<Clock className="h-4 w-4" />} hint={<Money value={totalFile} suffix={false} size="sm" />} />
            <Stat label="Payés" value={(data ?? []).filter((d) => d.statut === 'paye').length} tone="action" icon={<CheckCircle2 className="h-4 w-4" />} />
            <Stat label="Échecs" value={(data ?? []).filter((d) => d.statut === 'echec').length} tone={(data ?? []).some((d) => d.statut === 'echec') ? 'alerte' : 'primaire'} icon={<XCircle className="h-4 w-4" />} />
          </div>

          {!data?.length ? (
            <EmptyState icon={<Smartphone className="h-8 w-8" />} title="Aucun décaissement" description="Créez un décaissement (ristourne, avance, paiement collecte) puis traitez la file." action={<Button variant="action" onClick={() => setNouveau(true)}><Plus className="h-4 w-4" /> Nouveau décaissement</Button>} />
          ) : (
            <Card>
              <CardHeader title="Décaissements" subtitle="File Mobile Money" />
              <CardBody className="p-0">
                <Table>
                  <THead><Th>Bénéficiaire</Th><Th>Opérateur</Th><Th align="right">Montant</Th><Th>Motif</Th><Th>Statut</Th><Th>Référence</Th></THead>
                  <TBody>
                    {data.map((d) => (
                      <Tr key={d.id}>
                        <Td className="font-medium text-texte">{d.beneficiaire}<div className="text-xs font-normal text-texte-2">{d.telephone}</div></Td>
                        <Td><Badge tone="neutre">{OPERATEUR_LABEL[d.operateur] ?? d.operateur}</Badge></Td>
                        <Td align="right"><Money value={d.montant_xof} size="sm" suffix={false} /></Td>
                        <Td className="text-texte-2">{d.motif ?? '—'}</Td>
                        <Td><Badge tone={d.statut === 'paye' ? 'action' : d.statut === 'echec' ? 'alerte' : d.statut === 'en_cours' ? 'or' : 'neutre'} dot>{d.statut.replace('_', ' ')}</Badge></Td>
                        <Td className="mono text-xs text-texte-2">{d.reference_externe ?? d.erreur ?? '—'}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {nouveau && <DecaissementForm onClose={() => setNouveau(false)} onDone={() => { setNouveau(false); refetch(); push('success', 'Décaissement mis en file'); }} />}
    </>
  );
}

function DecaissementForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const { data: membres } = useCoopQuery(['decaissements-membres'], async (coopId) => {
    const { data } = await supabase.from('coop_membres').select('id, nom, prenoms, raison_sociale, telephone')
      .eq('cooperative_id', coopId).order('nom').limit(1000);
    return (data ?? []) as MembrePicker[];
  });
  const nomDe = (m: MembrePicker) => [m.nom, m.prenoms].filter(Boolean).join(' ').trim() || m.raison_sociale || 'Membre';

  const [membreId, setMembreId] = useState('');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [telephone, setTelephone] = useState('');
  const [operateur, setOperateur] = useState('orange');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');

  const onMembreChange = (id: string) => {
    setMembreId(id);
    const m = (membres ?? []).find((x) => x.id === id);
    if (m) { setBeneficiaire(nomDe(m)); setTelephone(m.telephone ?? ''); }
  };

  const save = useCoopMutation(
    async (coopId) => {
      const mt = Math.round(Number(montant) || 0);
      if (mt <= 0) throw new Error('Montant invalide');
      if (!beneficiaire.trim()) throw new Error('Bénéficiaire requis');
      if (!telephone.trim()) throw new Error('Téléphone requis');
      const { error } = await supabase.from('coop_decaissements').insert({
        cooperative_id: coopId, membre_id: membreId || null, beneficiaire: beneficiaire.trim(),
        telephone: telephone.trim(), operateur, montant_xof: mt, motif: motif || null,
      });
      if (error) throw error;
    },
    { invalidate: ['decaissements'], onSuccess: onDone },
  );

  return (
    <Modal open onClose={onClose} title="Nouveau décaissement Mobile Money"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} onClick={() => save.mutateAsync(undefined).catch((e) => push('error', (e as Error).message))}>Mettre en file</Button></>}>
      <div className="space-y-4">
        <Field label="Membre (optionnel — préremplit bénéficiaire/téléphone)">
          <Select value={membreId} onChange={(e) => onMembreChange(e.target.value)}>
            <option value="">— Bénéficiaire externe —</option>
            {(membres ?? []).map((m) => <option key={m.id} value={m.id}>{nomDe(m)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bénéficiaire"><Input value={beneficiaire} onChange={(e) => setBeneficiaire(e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="07XXXXXXXX" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opérateur">
            <Select value={operateur} onChange={(e) => setOperateur(e.target.value)}>
              <option value="orange">Orange Money</option>
              <option value="mtn">MTN MoMo</option>
              <option value="moov">Moov Money</option>
              <option value="wave">Wave</option>
            </Select>
          </Field>
          <Field label="Montant (FCFA)"><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} min={1} /></Field>
        </div>
        <Field label="Motif"><Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ristourne campagne 2026" /></Field>
      </div>
    </Modal>
  );
}

