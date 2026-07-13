import { useState } from 'react';
import { Landmark, Check } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { Modal, Button, Field, Input, Money, Badge, Spinner, useToast, Table, THead, TBody, Th, Tr, Td } from '../../ui';
import { formatDate } from '../../lib/format';
import type { CoopCompteBancaire } from '../../domain/database.types';

interface Op { id: string; sens: string; montant_xof: number; nature: string; mode: string; date_operation: string }

export function RapprochementModal({ banque, onClose }: { banque: CoopCompteBancaire; onClose: () => void }) {
  const { push } = useToast();
  const [releve, setReleve] = useState(String(banque.solde_xof));
  const [pointed, setPointed] = useState<Set<string>>(new Set());

  const { data: ops, isLoading } = useCoopQuery(['rappro-ops', banque.id], async (coopId) => {
    const { data } = await supabase.from('coop_operations_tresorerie')
      .select('id, sens, montant_xof, nature, mode, date_operation')
      .eq('cooperative_id', coopId).eq('compte_bancaire_id', banque.id)
      .order('date_operation', { ascending: false });
    return (data ?? []) as Op[];
  });

  const signed = (o: Op) => (o.sens === 'credit' ? o.montant_xof : -o.montant_xof);
  const book = banque.solde_xof;
  const releveN = Number(releve.replace(/\s/g, '')) || 0;
  const outstanding = (ops ?? []).filter((o) => !pointed.has(o.id)).reduce((s, o) => s + signed(o), 0);
  const ecart = releveN - (book - outstanding);
  const taux = ops && ops.length ? Math.round((pointed.size / ops.length) * 100) : 0;

  const save = useCoopMutation(
    async (coopId) => {
      const { data: rap, error } = await supabase.from('coop_rapprochements').insert({
        cooperative_id: coopId, compte_bancaire_id: banque.id, date_rapprochement: new Date().toISOString().slice(0, 10),
        solde_releve_xof: releveN, solde_comptable_xof: book, ecart_xof: ecart, taux_bp: taux * 100,
        statut: ecart === 0 ? 'valide' : 'brouillon',
      }).select('id').single();
      if (error) throw error;
      const rows = (ops ?? []).map((o) => ({ cooperative_id: coopId, rapprochement_id: rap.id, operation_id: o.id, pointee: pointed.has(o.id) }));
      if (rows.length) await supabase.from('coop_lignes_rapprochement').insert(rows);
    },
    { invalidate: ['tresorerie'], onSuccess: () => { push('success', ecart === 0 ? 'Rapprochement validé ✓' : 'Rapprochement enregistré (écart subsistant)'); onClose(); } },
  );

  const toggle = (id: string) => setPointed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Modal open onClose={onClose} size="xl" title={`Rapprochement bancaire — ${banque.banque}`} subtitle="Pointez les opérations présentes sur le relevé"
      footer={<><Button variant="outline" onClick={onClose}>Fermer</Button><Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)}><Check className="h-4 w-4" /> Enregistrer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Solde du relevé (FCFA)"><Input type="number" value={releve} onChange={(e) => setReleve(e.target.value)} /></Field>
          <div className="rounded-lg bg-surface-2 p-2.5"><div className="text-xs text-texte-2">Solde comptable</div><Money value={book} size="sm" suffix={false} /></div>
          <div className={`rounded-lg p-2.5 ${ecart === 0 ? 'bg-action/10' : 'bg-alerte/10'}`}>
            <div className="text-xs text-texte-2">Écart résiduel</div>
            <div className="flex items-center gap-2"><Money value={ecart} size="sm" suffix={false} colorNegative />{ecart === 0 && <Badge tone="action">rapproché ✓</Badge>}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-texte-2">
          <span>Opérations en cours (non pointées) : <Money value={outstanding} size="sm" suffix={false} colorNegative /></span>
          <span>Taux de pointage : <b className="text-texte">{taux} %</b></span>
        </div>

        {isLoading ? <Spinner /> : !ops?.length ? (
          <p className="py-6 text-center text-sm text-texte-2">Aucune opération sur ce compte bancaire.</p>
        ) : (
          <Table>
            <THead><Th align="center">Pointée</Th><Th>Date</Th><Th>Nature</Th><Th>Mode</Th><Th align="right">Montant</Th></THead>
            <TBody>
              {ops.map((o) => (
                <Tr key={o.id}>
                  <Td align="center"><input type="checkbox" checked={pointed.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 rounded border-ligne text-primaire" /></Td>
                  <Td className="text-xs text-texte-2">{formatDate(o.date_operation)}</Td>
                  <Td>{o.nature}</Td>
                  <Td><Badge tone="neutre">{o.mode.replace('_', ' ')}</Badge></Td>
                  <Td align="right"><Money value={signed(o)} size="sm" suffix={false} colorNegative /></Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        <p className="flex items-center gap-1.5 text-xs text-texte-2"><Landmark className="h-3.5 w-3.5" /> Rapproché quand le solde du relevé = solde comptable − opérations en cours.</p>
      </div>
    </Modal>
  );
}
