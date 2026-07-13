import { useState } from 'react';
import { useCoopMutation, supabase } from '../../hooks/data';
import { Modal, Button, Field, Input, Select, Textarea, useToast, Money } from '../../ui';
import { formatFcfaText } from '../../lib/money';
import type { CoopMembre } from '../../domain/database.types';

const NATURES_CREDIT = [
  { v: 'ristourne', l: 'Ristourne d\'activité' },
  { v: 'complement_prix', l: 'Complément de prix' },
  { v: 'prime_qualite', l: 'Prime qualité' },
  { v: 'interet_parts', l: 'Intérêt aux parts' },
  { v: 'remboursement', l: 'Remboursement' },
  { v: 'depot', l: 'Dépôt' },
];
const NATURES_DEBIT = [
  { v: 'prelevement', l: 'Prélèvement personnel (avance)' },
  { v: 'avance_intrant', l: 'Avance sur intrants' },
  { v: 'credit_campagne', l: 'Crédit de campagne' },
  { v: 'achat_credit', l: 'Achat à crédit' },
  { v: 'cotisation', l: 'Cotisation' },
];

export function MouvementForm({
  open, onClose, sens, membre,
}: {
  open: boolean; onClose: () => void; sens: 'credit' | 'debit'; membre: CoopMembre;
}) {
  const { push } = useToast();
  const natures = sens === 'credit' ? NATURES_CREDIT : NATURES_DEBIT;
  const [nature, setNature] = useState(natures[0].v);
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const montantN = Number(montant.replace(/\s/g, '')) || 0;

  const submit = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.from('coop_mouvements_compte_membre').insert({
        cooperative_id: coopId,
        membre_id: membre.id,
        sens,
        nature,
        montant_xof: montantN,
        libelle: libelle || null,
        piece_ref: `MAN-${Date.now().toString().slice(-6)}`,
      });
      if (error) throw error;

      // avance tracée si prélèvement/avance (P3)
      if (sens === 'debit' && (nature === 'prelevement' || nature === 'avance_intrant')) {
        await supabase.from('coop_avances').insert({
          cooperative_id: coopId, membre_id: membre.id,
          type: nature === 'prelevement' ? 'personnel' : 'intrant',
          montant_xof: montantN, motif: libelle || null,
        });
      }

      // reçu SMS (P3, P5) si téléphone connu
      if (membre.telephone) {
        const verbe = sens === 'credit' ? 'crédité' : 'débité';
        await supabase.from('coop_notifications_sms').insert({
          cooperative_id: coopId, membre_id: membre.id, telephone: membre.telephone,
          type: sens === 'credit' ? 'versement' : 'confirmation_avance',
          message: `Atlas Coop: votre compte a été ${verbe} de ${formatFcfaText(montantN)}. ${libelle ?? ''}`.trim(),
        });
      }
    },
    {
      invalidate: ['membre', 'membres', 'dashboard'],
      onSuccess: () => {
        push('success', `Compte ${sens === 'credit' ? 'crédité' : 'débité'} · reçu SMS mis en file`);
        onClose();
      },
    },
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sens === 'credit' ? 'Créditer le compte' : 'Avance / prélèvement'}
      subtitle={`${membre.nom} ${membre.prenoms ?? ''} · ${membre.numero}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            variant={sens === 'credit' ? 'action' : 'primary'}
            onClick={() => submit.mutate(undefined)}
            loading={submit.isPending}
            disabled={montantN <= 0}
          >
            {sens === 'credit' ? 'Créditer' : 'Enregistrer le débit'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nature">
          <Select value={nature} onChange={(e) => setNature(e.target.value)}>
            {natures.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
          </Select>
        </Field>
        <Field label="Montant (FCFA)" required>
          <Input type="number" min={0} value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0" />
        </Field>
        {montantN > 0 && (
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <span className="text-texte-2">Effet sur le solde : </span>
            <Money value={sens === 'credit' ? montantN : -montantN} sign colorNegative />
          </div>
        )}
        <Field label="Libellé / motif">
          <Textarea value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Précision facultative" rows={2} />
        </Field>
        <p className="text-xs text-texte-2">
          Écriture immuable (append-only) et horodatée dans le journal d'audit chaîné.
          La frontière caisse coopérative / poche personnelle est tracée (P3).
        </p>
      </div>
    </Modal>
  );
}
