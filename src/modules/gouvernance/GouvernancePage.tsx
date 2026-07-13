import { useState } from 'react';
import { Landmark, Plus, Gavel, Users2, FileText } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { useCoop } from '../../auth/CooperativeProvider';
import {
  PageHeader, Button, Card, CardBody, Badge, Modal, Field, Input, Select, Textarea,
  Tabs, Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate, formatDateTime } from '../../lib/format';

type Tab = 'organes' | 'assemblees' | 'decisions';

export function GouvernancePage() {
  const { current } = useCoop();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('assemblees');
  const [modal, setModal] = useState<Tab | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['gouvernance'], async (coopId) => {
    const [organes, assemblees, decisions] = await Promise.all([
      supabase.from('coop_organes').select('*').eq('cooperative_id', coopId).order('created_at'),
      supabase.from('coop_assemblees').select('*').eq('cooperative_id', coopId).order('date_prevue', { ascending: false, nullsFirst: false }),
      supabase.from('coop_decisions_organes').select('*').eq('cooperative_id', coopId).order('date_decision', { ascending: false }),
    ]);
    return { organes: organes.data ?? [], assemblees: assemblees.data ?? [], decisions: decisions.data ?? [] };
  });

  return (
    <>
      <PageHeader
        title="Gouvernance"
        subtitle={`Organes, assemblées, décisions — conforme OHADA (${current?.forme_juridique === 'COOP_CA' ? 'COOP-CA' : 'SCOOPS'}).`}
        icon={<Landmark className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(tab)}><Plus className="h-4 w-4" /> Ajouter</Button>}
      />

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'assemblees', label: 'Assemblées', count: data?.assemblees.length },
        { key: 'organes', label: 'Organes', count: data?.organes.length },
        { key: 'decisions', label: 'Décisions', count: data?.decisions.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'organes' && (
            !data?.organes.length ? <EmptyState icon={<Users2 className="h-8 w-8" />} title="Aucun organe" description="Comité de gestion, commission de surveillance, conseil d'administration…" /> :
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.organes.map((o: Record<string, unknown>) => (
                <Card key={o.id as string}><CardBody>
                  <h3 className="font-semibold text-texte">{o.nom as string}</h3>
                  <div className="mt-1 text-xs text-texte-2 capitalize">{(o.type as string).replace(/_/g, ' ')} · <span className="mono">{o.code as string}</span></div>
                  <div className="mt-2 text-sm text-texte-2">Quorum : {((o.quorum_bp as number) / 100).toFixed(0)} %</div>
                </CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'assemblees' && (
            !data?.assemblees.length ? <EmptyState icon={<Gavel className="h-8 w-8" />} title="Aucune assemblée" description="Convocations SMS, ordre du jour, quorum, votes, PV horodatés." /> :
            <div className="space-y-3">
              {data.assemblees.map((a: Record<string, unknown>) => (
                <Card key={a.id as string}><CardBody className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><Badge tone="primaire">{a.type as string}</Badge><h3 className="font-semibold text-texte">{a.titre as string}</h3></div>
                    <div className="mt-1 text-xs text-texte-2">{a.date_prevue ? formatDateTime(a.date_prevue as string) : 'Date à définir'} · {(a.lieu as string) ?? '—'}</div>
                  </div>
                  <Badge tone={a.statut === 'close' ? 'neutre' : a.statut === 'en_cours' ? 'action' : 'or'} dot>{a.statut as string}</Badge>
                </CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'decisions' && (
            !data?.decisions.length ? <EmptyState icon={<FileText className="h-8 w-8" />} title="Aucune décision" description="Prix de campagne, taux d'intérêt, plafonds, budgets — référençables par les modules opérationnels." /> :
            <Card><Table>
              <THead><Th>Référence</Th><Th>Type</Th><Th>Objet</Th><Th>Date</Th></THead>
              <TBody>
                {data.decisions.map((d: Record<string, unknown>) => (
                  <Tr key={d.id as string}>
                    <Td><span className="mono text-xs">{d.reference as string}</span></Td>
                    <Td><Badge tone="neutre">{(d.type as string).replace(/_/g, ' ')}</Badge></Td>
                    <Td>{(d.objet as string) ?? '—'}</Td>
                    <Td className="text-xs text-texte-2">{formatDate(d.date_decision as string)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table></Card>
          )}
        </>
      )}

      {modal === 'organes' && <OrganeForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Organe créé')} />}
      {modal === 'assemblees' && <AssembleeForm organes={data?.organes ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Assemblée créée')} />}
      {modal === 'decisions' && <DecisionForm organes={data?.organes ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Décision enregistrée')} />}
    </>
  );
}

function OrganeForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState(''); const [nom, setNom] = useState(''); const [type, setType] = useState('comite_gestion'); const [quorum, setQuorum] = useState('50');
  const save = useCoopMutation(async (coopId) => { const { error } = await supabase.from('coop_organes').insert({ cooperative_id: coopId, code: code.toUpperCase(), nom, type, quorum_bp: Math.round(Number(quorum) * 100) }); if (error) throw error; }, { invalidate: ['gouvernance'], onSuccess: () => { onDone(); onClose(); } });
  return (
    <Modal open onClose={onClose} title="Nouvel organe" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!nom || !code} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CG" /></Field>
          <Field label="Nom" required className="col-span-2"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Comité de gestion" /></Field>
        </div>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="comite_gestion">Comité de gestion (SCOOPS)</option>
          <option value="commission_surveillance">Commission de surveillance (SCOOPS)</option>
          <option value="conseil_admin">Conseil d'administration (COOP-CA)</option>
          <option value="commissaire_comptes">Commissaire aux comptes (COOP-CA)</option>
          <option value="ag">Assemblée générale</option>
        </Select></Field>
        <Field label="Quorum (%)"><Input type="number" value={quorum} onChange={(e) => setQuorum(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function AssembleeForm({ organes, onClose, onDone }: { organes: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState('AGO'); const [titre, setTitre] = useState(''); const [date, setDate] = useState(''); const [lieu, setLieu] = useState('');
  const save = useCoopMutation(async (coopId) => { const { error } = await supabase.from('coop_assemblees').insert({ cooperative_id: coopId, type, titre, date_prevue: date || null, lieu: lieu || null }); if (error) throw error; }, { invalidate: ['gouvernance'], onSuccess: () => { onDone(); onClose(); } });
  return (
    <Modal open onClose={onClose} title="Nouvelle assemblée" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!titre} onClick={() => save.mutate(undefined)}>Créer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}><option value="AGO">AGO</option><option value="AGE">AGE</option><option value="reunion_organe">Réunion d'organe</option></Select></Field>
          <Field label="Titre" required className="col-span-2"><Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="AG ordinaire 2026" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date prévue"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Lieu"><Input value={lieu} onChange={(e) => setLieu(e.target.value)} /></Field>
        </div>
        {organes.length === 0 && <p className="text-xs text-texte-2">Astuce : créez d'abord vos organes.</p>}
      </div>
    </Modal>
  );
}

function DecisionForm({ organes, onClose, onDone }: { organes: Record<string, unknown>[]; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState(`DEC-${new Date().getFullYear()}-`); const [type, setType] = useState('prix_campagne'); const [objet, setObjet] = useState(''); const [organeId, setOrganeId] = useState('');
  const save = useCoopMutation(async (coopId) => { const { error } = await supabase.from('coop_decisions_organes').insert({ cooperative_id: coopId, reference, type, objet: objet || null, organe_id: organeId || null }); if (error) throw error; }, { invalidate: ['gouvernance'], onSuccess: () => { onDone(); onClose(); } });
  return (
    <Modal open onClose={onClose} title="Nouvelle décision d'organe" subtitle="Référençable par les modules opérationnels" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!reference} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Référence" required><Input value={reference} onChange={(e) => setReference(e.target.value)} className="mono" /></Field>
        <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="prix_campagne">Prix de campagne</option>
          <option value="taux_interet_parts">Taux d'intérêt aux parts</option>
          <option value="plafond_credit">Plafond de crédit</option>
          <option value="prix_cession">Prix de cession interne</option>
          <option value="budget">Budget</option>
          <option value="agrement">Agrément</option>
          <option value="exclusion">Exclusion</option>
          <option value="mise_en_jeu_garantie">Mise en jeu de garantie</option>
        </Select></Field>
        <Field label="Objet"><Textarea value={objet} onChange={(e) => setObjet(e.target.value)} rows={2} /></Field>
        {organes.length > 0 && <Field label="Organe"><Select value={organeId} onChange={(e) => setOrganeId(e.target.value)}><option value="">—</option>{organes.map((o) => <option key={o.id as string} value={o.id as string}>{o.nom as string}</option>)}</Select></Field>}
      </div>
    </Modal>
  );
}
