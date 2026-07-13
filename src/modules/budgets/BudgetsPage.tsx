import { useState } from 'react';
import { PiggyBank, Plus, HandCoins, Trash2, CheckCircle2, FileText } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Modal, Field, Input, Select, Money,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';
import type { CoopSection } from '../../domain/database.types';

type Tab = 'budgets' | 'subventions';
interface LigneBudget { section_id: string; nature: string; sens: string; montant: string }

export function BudgetsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('budgets');
  const [modal, setModal] = useState<null | 'budget' | 'convention' | 'depense'>(null);
  const [depenseConv, setDepenseConv] = useState<string | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['budgets'], async (coopId) => {
    const [budgets, lignes, sections, conventions, depenses, ecritures] = await Promise.all([
      supabase.from('coop_budgets').select('*, coop_sections(nom)').eq('cooperative_id', coopId).order('annee', { ascending: false }),
      supabase.from('coop_lignes_budget').select('*, coop_sections(nom)').eq('cooperative_id', coopId),
      supabase.from('coop_sections').select('*').eq('cooperative_id', coopId).eq('actif', true).order('ordre'),
      supabase.from('coop_conventions_bailleurs').select('*').eq('cooperative_id', coopId).order('created_at', { ascending: false }),
      supabase.from('coop_depenses_projets').select('*').eq('cooperative_id', coopId),
      supabase.from('coop_lignes_ecritures').select('compte_numero, section_id, debit_xof, credit_xof').eq('cooperative_id', coopId),
    ]);
    // Réalisé par (section, sens) depuis la compta analytique (P7)
    const realise = new Map<string, number>();
    (ecritures.data ?? []).forEach((l: Record<string, unknown>) => {
      const cls = (l.compte_numero as string)?.[0];
      const sens = cls === '7' ? 'produit' : cls === '6' ? 'charge' : null;
      if (!sens || !l.section_id) return;
      const key = `${l.section_id}:${sens}`;
      const val = sens === 'produit' ? (l.credit_xof as number) - (l.debit_xof as number) : (l.debit_xof as number) - (l.credit_xof as number);
      realise.set(key, (realise.get(key) ?? 0) + val);
    });
    const depByConv = new Map<string, { decaisse: number; justifie: number }>();
    (depenses.data ?? []).forEach((d: Record<string, unknown>) => {
      const k = d.convention_id as string;
      const cur = depByConv.get(k) ?? { decaisse: 0, justifie: 0 };
      cur.decaisse += d.montant_xof as number;
      if (d.justifie) cur.justifie += d.montant_xof as number;
      depByConv.set(k, cur);
    });
    return {
      budgets: budgets.data ?? [], lignes: lignes.data ?? [], sections: (sections.data ?? []) as CoopSection[],
      conventions: conventions.data ?? [], depenses: depenses.data ?? [], realise, depByConv,
    };
  });

  const totalSubv = (data?.conventions ?? []).reduce((s: number, c: Record<string, unknown>) => s + (c.montant_xof as number), 0);
  const totalDecaisse = [...(data?.depByConv.values() ?? [])].reduce((s, x) => s + x.decaisse, 0);

  return (
    <>
      <PageHeader
        title="Budgets & subventions"
        subtitle="Budget par section (réalisé vs prévu, P7), conventions bailleurs avec axe projet."
        icon={<PiggyBank className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setModal(tab === 'budgets' ? 'budget' : 'convention')}><Plus className="h-4 w-4" /> {tab === 'budgets' ? 'Budget' : 'Convention'}</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Budgets" value={data?.budgets.length ?? 0} icon={<PiggyBank className="h-4 w-4" />} tone="primaire" />
        <Stat label="Conventions bailleurs" value={data?.conventions.length ?? 0} icon={<HandCoins className="h-4 w-4" />} tone="action" />
        <Stat label="Financements obtenus" value={<Money value={totalSubv} suffix={false} size="lg" />} tone="or" icon={<HandCoins className="h-4 w-4" />} />
        <Stat label="Décaissé sur projets" value={<Money value={totalDecaisse} suffix={false} size="lg" />} tone="alerte" icon={<FileText className="h-4 w-4" />} />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'budgets', label: 'Budgets', count: data?.budgets.length },
        { key: 'subventions', label: 'Subventions & bailleurs', count: data?.conventions.length },
      ]} />

      {isLoading ? <Spinner /> : (
        <>
          {tab === 'budgets' && (
            !data?.budgets.length ? <EmptyState icon={<PiggyBank className="h-8 w-8" />} title="Aucun budget" description="Établissez un budget par section, voté en AG, suivi réalisé vs prévu." action={<Button variant="action" onClick={() => setModal('budget')}><Plus className="h-4 w-4" /> Budget</Button>} /> :
            <div className="space-y-4">
              {data.budgets.map((b: Record<string, unknown>) => {
                const lignes = data.lignes.filter((l: Record<string, unknown>) => l.budget_id === b.id);
                return (
                  <Card key={b.id as string}>
                    <CardHeader title={<span className="flex items-center gap-2">{b.libelle as string} <Badge tone={b.statut === 'vote' ? 'action' : 'neutre'}>{b.statut as string}</Badge></span>} subtitle={`${(b.coop_sections as { nom?: string } | null)?.nom ?? 'Consolidé'} · ${b.annee}`} />
                    <CardBody className="p-0">
                      {!lignes.length ? <div className="py-4 text-center text-sm text-texte-2">Aucune ligne.</div> :
                        <Table>
                          <THead><Th>Rubrique</Th><Th>Section</Th><Th>Sens</Th><Th align="right">Prévu</Th><Th align="right">Réalisé</Th><Th align="right">Écart</Th><Th align="right">Taux</Th></THead>
                          <TBody>
                            {lignes.map((l: Record<string, unknown>) => {
                              const prevu = l.montant_prevu_xof as number;
                              const reel = data.realise.get(`${l.section_id}:${l.sens}`) ?? 0;
                              const ecart = reel - prevu;
                              const taux = prevu > 0 ? Math.round((reel / prevu) * 100) : 0;
                              const depasse = l.sens === 'charge' && reel > prevu;
                              return (
                                <Tr key={l.id as string}>
                                  <Td className="font-medium text-texte">{l.nature as string}</Td>
                                  <Td className="text-sm text-texte-2">{(l.coop_sections as { nom?: string } | null)?.nom ?? '—'}</Td>
                                  <Td><Badge tone={l.sens === 'produit' ? 'action' : 'neutre'}>{l.sens as string}</Badge></Td>
                                  <Td align="right"><Money value={prevu} size="sm" suffix={false} /></Td>
                                  <Td align="right"><Money value={reel} size="sm" suffix={false} /></Td>
                                  <Td align="right"><Money value={ecart} size="sm" suffix={false} colorNegative /></Td>
                                  <Td align="right"><Badge tone={depasse ? 'alerte' : 'neutre'}>{taux} %</Badge></Td>
                                </Tr>
                              );
                            })}
                          </TBody>
                        </Table>}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === 'subventions' && (
            !data?.conventions.length ? <EmptyState icon={<HandCoins className="h-8 w-8" />} title="Aucune convention" description="Enregistrez les financements de projets (FIRCA, État, bailleurs, ONG)." action={<Button variant="action" onClick={() => setModal('convention')}><Plus className="h-4 w-4" /> Convention</Button>} /> :
            <div className="space-y-4">
              {data.conventions.map((c: Record<string, unknown>) => {
                const suivi = data.depByConv.get(c.id as string) ?? { decaisse: 0, justifie: 0 };
                const solde = (c.montant_xof as number) - suivi.decaisse;
                const deps = data.depenses.filter((d: Record<string, unknown>) => d.convention_id === c.id);
                return (
                  <Card key={c.id as string}>
                    <CardHeader
                      title={<span className="flex items-center gap-2">{c.bailleur as string} <Badge tone={c.statut === 'active' ? 'action' : 'neutre'}>{c.statut as string}</Badge></span>}
                      subtitle={c.objet as string}
                      action={<Button variant="outline" size="sm" onClick={() => { setDepenseConv(c.id as string); setModal('depense'); }}><Plus className="h-4 w-4" /> Dépense</Button>}
                    />
                    <CardBody>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Mini label="Montant convention" value={<Money value={c.montant_xof as number} suffix={false} size="sm" />} />
                        <Mini label="Décaissé" value={<Money value={suivi.decaisse} suffix={false} size="sm" />} />
                        <Mini label="Justifié" value={<Money value={suivi.justifie} suffix={false} size="sm" />} />
                        <Mini label="Solde" value={<Money value={solde} suffix={false} size="sm" colorNegative />} />
                      </div>
                      {deps.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {deps.map((d: Record<string, unknown>) => (
                            <div key={d.id as string} className="flex items-center justify-between border-b border-ligne/60 py-1.5 text-sm">
                              <span className="text-texte">{d.libelle as string} <span className="text-xs text-texte-2">· {formatDate(d.date_depense as string)}</span></span>
                              <span className="flex items-center gap-2">{d.justifie ? <Badge tone="action">Justifié</Badge> : <Badge tone="or">À justifier</Badge>}<Money value={d.montant_xof as number} size="sm" /></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal === 'budget' && <BudgetForm sections={data?.sections ?? []} onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Budget créé')} />}
      {modal === 'convention' && <ConventionForm onClose={() => { setModal(null); refetch(); }} onDone={() => push('success', 'Convention enregistrée')} />}
      {modal === 'depense' && depenseConv && <DepenseForm conventionId={depenseConv} sections={data?.sections ?? []} onClose={() => { setModal(null); setDepenseConv(null); refetch(); }} onDone={() => push('success', 'Dépense enregistrée')} />}
    </>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg bg-surface-2 p-2.5"><div className="text-[11px] text-texte-2">{label}</div><div className="mt-0.5 font-semibold">{value}</div></div>;
}

function BudgetForm({ sections, onClose, onDone }: { sections: CoopSection[]; onClose: () => void; onDone: () => void }) {
  const [libelle, setLibelle] = useState(''); const [sectionId, setSectionId] = useState(''); const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [statut, setStatut] = useState('brouillon');
  const [lignes, setLignes] = useState<LigneBudget[]>([{ section_id: '', nature: '', sens: 'charge', montant: '' }]);
  const setL = (i: number, patch: Partial<LigneBudget>) => setLignes((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const save = useCoopMutation(
    async (coopId) => {
      const { data: budget, error } = await supabase.from('coop_budgets').insert({ cooperative_id: coopId, libelle, section_id: sectionId || null, annee: Number(annee), statut }).select('id').single();
      if (error) throw error;
      const rows = lignes.filter((l) => l.nature && Number(l.montant) > 0).map((l) => ({ cooperative_id: coopId, budget_id: budget.id, section_id: l.section_id || sectionId || null, nature: l.nature, sens: l.sens, montant_prevu_xof: Number(l.montant) || 0 }));
      if (rows.length) { const { error: le } = await supabase.from('coop_lignes_budget').insert(rows); if (le) throw le; }
    },
    { invalidate: ['budgets'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} size="xl" title="Nouveau budget"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!libelle} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Libellé" required className="col-span-2"><Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Budget 2026" /></Field>
          <Field label="Section"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">Consolidé</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
          <Field label="Statut"><Select value={statut} onChange={(e) => setStatut(e.target.value)}><option value="brouillon">Brouillon</option><option value="vote">Voté (AG)</option></Select></Field>
        </div>
        <Field label="Année"><Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} className="w-32" /></Field>
        <div>
          <div className="mb-1 text-sm font-semibold text-texte">Lignes budgétaires</div>
          <div className="space-y-2">
            {lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input className="col-span-5" placeholder="Rubrique (ex. Intrants)" value={l.nature} onChange={(e) => setL(i, { nature: e.target.value })} />
                <Select className="col-span-3" value={l.section_id} onChange={(e) => setL(i, { section_id: e.target.value })}><option value="">Section…</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select>
                <Select className="col-span-2" value={l.sens} onChange={(e) => setL(i, { sens: e.target.value })}><option value="charge">Charge</option><option value="produit">Produit</option></Select>
                <Input className="col-span-1" type="number" placeholder="FCFA" value={l.montant} onChange={(e) => setL(i, { montant: e.target.value })} />
                <button className="col-span-1 flex items-center justify-center text-texte-2 hover:text-alerte" onClick={() => setLignes((p) => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setLignes((p) => [...p, { section_id: '', nature: '', sens: 'charge', montant: '' }])}><Plus className="h-4 w-4" /> Ligne</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ConventionForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [bailleur, setBailleur] = useState(''); const [objet, setObjet] = useState(''); const [montant, setMontant] = useState(''); const [reference, setReference] = useState('');
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_conventions_bailleurs').insert({ cooperative_id: coopId, bailleur, objet: objet || null, montant_xof: Number(montant) || 0, reference: reference || null }); if (error) throw error; },
    { invalidate: ['budgets'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle convention bailleur"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!bailleur} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bailleur" required><Input value={bailleur} onChange={(e) => setBailleur(e.target.value)} placeholder="FIRCA" /></Field>
          <Field label="Référence"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        </div>
        <Field label="Objet"><Input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Financement mécanisation" /></Field>
        <Field label="Montant (FCFA)" required><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function DepenseForm({ conventionId, sections, onClose, onDone }: { conventionId: string; sections: CoopSection[]; onClose: () => void; onDone: () => void }) {
  const [libelle, setLibelle] = useState(''); const [montant, setMontant] = useState(''); const [sectionId, setSectionId] = useState(''); const [justifie, setJustifie] = useState(false);
  const save = useCoopMutation(
    async (coopId) => { const { error } = await supabase.from('coop_depenses_projets').insert({ cooperative_id: coopId, convention_id: conventionId, section_id: sectionId || null, libelle, montant_xof: Number(montant) || 0, justifie }); if (error) throw error; },
    { invalidate: ['budgets'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Nouvelle dépense projet" subtitle="Axe analytique projet (P7)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!libelle || !montant} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Libellé" required><Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Achat décortiqueuse" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (FCFA)" required><Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
          <Field label="Section"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">—</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}</Select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-texte"><input type="checkbox" checked={justifie} onChange={(e) => setJustifie(e.target.checked)} className="h-4 w-4 rounded border-ligne text-action" /><CheckCircle2 className="h-4 w-4 text-action" /> Pièce justificative fournie</label>
      </div>
    </Modal>
  );
}
