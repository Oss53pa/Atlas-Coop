import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { Modal, Button, Field, Input, Select, Spinner, Badge, useToast, Table, THead, TBody, Th, Tr, Td } from '../../ui';

interface Immo { id: string; code: string; nom: string; localisation: string | null }
interface Comptage { statut: string; localisation: string; etat: string }

export function InventaireImmoModal({ onClose }: { onClose: () => void }) {
  const { push } = useToast();
  const [nom, setNom] = useState(`Inventaire immos ${new Date().toISOString().slice(0, 10)}`);
  const [responsable, setResponsable] = useState('');
  const [comptages, setComptages] = useState<Record<string, Comptage>>({});

  const { data: immos, isLoading } = useCoopQuery(['immos-inv'], async (coopId) => {
    const { data } = await supabase.from('coop_immobilisations').select('id, code, nom, localisation').eq('cooperative_id', coopId).eq('statut', 'actif').order('code');
    return (data ?? []) as Immo[];
  });

  const DEF: Comptage = { statut: 'present', localisation: '', etat: 'bon' };
  const setC = (id: string, patch: Partial<Comptage>) => setComptages((p) => ({ ...p, [id]: { ...DEF, ...p[id], ...patch } }));
  const nbAbsents = Object.values(comptages).filter((c) => c.statut === 'absent').length;

  const save = useCoopMutation(
    async (coopId) => {
      const { data: sess, error } = await supabase.from('coop_inventaires_immo').insert({ cooperative_id: coopId, nom, responsable: responsable || null }).select('id').single();
      if (error) throw error;
      const rows = (immos ?? []).map((i) => {
        const c = comptages[i.id] ?? { statut: 'present', localisation: '', etat: 'bon' };
        return { cooperative_id: coopId, session_id: sess.id, immobilisation_id: i.id, statut_comptage: c.statut, localisation_reelle: c.localisation || null, etat_physique: c.etat };
      });
      if (rows.length) await supabase.from('coop_comptages_immo').insert(rows);
      await supabase.from('coop_inventaires_immo').update({ statut: 'cloture' }).eq('id', sess.id);
    },
    { invalidate: ['immo'], onSuccess: () => { push('success', `Inventaire clôturé · ${nbAbsents} actif(s) absent(s)`); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Inventaire physique des immobilisations" subtitle="Pointez la présence, la localisation réelle et l'état de chaque actif"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!immos?.length} onClick={() => save.mutate(undefined)}><ClipboardCheck className="h-4 w-4" /> Clôturer l'inventaire</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intitulé"><Input value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
          <Field label="Responsable"><Input value={responsable} onChange={(e) => setResponsable(e.target.value)} /></Field>
        </div>
        {isLoading ? <Spinner /> : !immos?.length ? (
          <p className="py-6 text-center text-sm text-texte-2">Aucun actif à inventorier.</p>
        ) : (
          <Table>
            <THead><Th>Actif</Th><Th>Constat</Th><Th>Localisation réelle</Th><Th>État</Th></THead>
            <TBody>
              {immos.map((i) => {
                const c = comptages[i.id] ?? { statut: 'present', localisation: '', etat: 'bon' };
                return (
                  <Tr key={i.id}>
                    <Td><span className="font-medium text-texte">{i.nom}</span> <span className="mono text-xs text-texte-2">{i.code}</span></Td>
                    <Td>
                      <Select value={c.statut} onChange={(e) => setC(i.id, { statut: e.target.value })} className="w-32">
                        <option value="present">Présent</option><option value="deplace">Déplacé</option><option value="absent">Absent</option>
                      </Select>
                    </Td>
                    <Td><Input value={c.localisation} onChange={(e) => setC(i.id, { localisation: e.target.value })} placeholder={i.localisation ?? '—'} className="w-40" /></Td>
                    <Td>
                      <Select value={c.etat} onChange={(e) => setC(i.id, { etat: e.target.value })} className="w-28">
                        <option value="bon">Bon</option><option value="moyen">Moyen</option><option value="mauvais">Mauvais</option><option value="hs">Hors service</option>
                      </Select>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
        {nbAbsents > 0 && <Badge tone="alerte">{nbAbsents} actif(s) signalé(s) absent(s)</Badge>}
      </div>
    </Modal>
  );
}
