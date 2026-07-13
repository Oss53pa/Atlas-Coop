import { useState, useMemo } from 'react';
import { BookText, Plus, Sparkles, Scale as ScaleIcon, TrendingUp, Landmark, Download, Layers } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Badge, Tabs, Money, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';
import { PLAN_COOP, JOURNAUX_DEFAUT } from './syscohada';
import { TiersLettrage } from './TiersLettrage';
import type { CoopCompte, CoopJournal } from '../../domain/database.types';

type Tab = 'balance' | 'resultat' | 'bilan' | 'tiers' | 'exercice' | 'plan' | 'journaux' | 'ecritures';

/** Export CSV (séparateur ; + BOM UTF-8 pour Excel francophone). */
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const SIG_LIGNES: { key: string; label: string; fort?: boolean }[] = [
  { key: 'chiffre_affaires', label: "Chiffre d'affaires" },
  { key: 'valeur_ajoutee', label: 'Valeur ajoutée', fort: true },
  { key: 'ebe', label: "Excédent brut d'exploitation (EBE)", fort: true },
  { key: 'resultat_exploitation', label: "Résultat d'exploitation", fort: true },
  { key: 'resultat_financier', label: 'Résultat financier' },
  { key: 'resultat_hao', label: 'Résultat HAO' },
  { key: 'resultat_net', label: 'Résultat net', fort: true },
];

export function ComptabilitePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('balance');
  const [ecrOpen, setEcrOpen] = useState(false);
  const [cpTarget, setCpTarget] = useState<{ id: string; libelle: string } | null>(null);
  const [cpMotif, setCpMotif] = useState('');
  const [clotureEx, setClotureEx] = useState<{ id: string; code: string } | null>(null);
  const [tauxReserve, setTauxReserve] = useState('15');
  const [interet, setInteret] = useState('0');
  const [ristournes, setRistournes] = useState('0');
  const [selExId, setSelExId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['compta'], async (coopId) => {
    const [plan, journaux, ecritures, exercices] = await Promise.all([
      supabase.from('coop_plan_comptable').select('*').eq('cooperative_id', coopId).order('numero'),
      supabase.from('coop_journaux').select('*').eq('cooperative_id', coopId).order('code'),
      supabase.from('coop_ecritures').select('*, coop_journaux(code)').eq('cooperative_id', coopId).order('date_ecriture', { ascending: false }).limit(30),
      supabase.from('coop_exercices').select('*').eq('cooperative_id', coopId).order('code', { ascending: false }),
    ]);
    return {
      plan: (plan.data ?? []) as CoopCompte[],
      journaux: (journaux.data ?? []) as CoopJournal[],
      ecritures: ecritures.data ?? [],
      exercices: exercices.data ?? [],
    };
  });

  const openEx = data?.exercices.find((e: Record<string, unknown>) => e.statut === 'ouvert') ?? data?.exercices[0];
  const exId = selExId ?? (openEx?.id as string | undefined) ?? null;

  // Soldes scopés à l'exercice sélectionné (fonction serveur, réf. Atlas FnA)
  const { data: soldes } = useCoopQuery(['compta-soldes', exId], async (coopId) => {
    if (!exId) return [];
    const { data } = await supabase.rpc('coop_soldes_comptes', { p_coop: coopId, p_exercice: exId });
    return (data ?? []) as { compte_numero: string; libelle: string | null; classe: number; debit: number; credit: number; solde: number }[];
  }, { enabled: !!exId });

  // Compte de résultat détaillé + SIG (activité de l'exercice, hors écritures de clôture)
  const { data: cr } = useCoopQuery(['compta-etats', exId], async (coopId) => {
    if (!exId) return null;
    const { data } = await supabase.rpc('coop_etats', { p_coop: coopId, p_exercice: exId });
    return data as null | {
      charges: { numero: string; libelle: string; montant: number }[];
      produits: { numero: string; libelle: string; montant: number }[];
      total_charges: number; total_produits: number; resultat: number;
      sig: Record<string, number>;
    };
  }, { enabled: !!exId });

  const balance = useMemo(() => {
    const rows = (soldes ?? []).map((r) => ({ numero: r.compte_numero, libelle: r.libelle ?? r.compte_numero, classe: r.classe, debit: r.debit, credit: r.credit, solde: r.solde }));
    const totalD = rows.reduce((s, r) => s + r.debit, 0);
    const totalC = rows.reduce((s, r) => s + r.credit, 0);
    return { rows, totalD, totalC };
  }, [soldes]);

  // États financiers (réf. modèle Atlas FnA) : Compte de résultat & Bilan
  const etats = useMemo(() => {
    type L = { numero: string; libelle: string; montant: number };
    const charges: L[] = [], produits: L[] = [], actif: L[] = [], passif: L[] = [];
    balance.rows.forEach((r) => {
      const lib = r.libelle;
      const c = r.classe;
      if (c === 6) charges.push({ numero: r.numero, libelle: lib, montant: r.solde });
      else if (c === 7) produits.push({ numero: r.numero, libelle: lib, montant: -r.solde });
      else if (c === 2 || c === 3) actif.push({ numero: r.numero, libelle: lib, montant: r.solde });
      else if (c === 1) passif.push({ numero: r.numero, libelle: lib, montant: -r.solde });
      else if (c === 4 || c === 5) {
        if (r.solde >= 0) actif.push({ numero: r.numero, libelle: lib, montant: r.solde });
        else passif.push({ numero: r.numero, libelle: lib, montant: -r.solde });
      }
    });
    const totCharges = charges.reduce((s, l) => s + l.montant, 0);
    const totProduits = produits.reduce((s, l) => s + l.montant, 0);
    const resultat = totProduits - totCharges;
    const totActif = actif.reduce((s, l) => s + l.montant, 0);
    const totPassif = passif.reduce((s, l) => s + l.montant, 0) + resultat;
    return { charges, produits, totCharges, totProduits, resultat, actif, passif, totActif, totPassif };
  }, [balance]);

  const seed = useCoopMutation(
    async (coopId) => {
      await supabase.from('coop_plan_comptable').insert(PLAN_COOP.map((p) => ({ ...p, cooperative_id: coopId })));
      await supabase.from('coop_journaux').insert(JOURNAUX_DEFAUT.map((j) => ({ ...j, cooperative_id: coopId })));
      const y = new Date().getFullYear();
      await supabase.from('coop_exercices').insert({ cooperative_id: coopId, code: String(y), date_debut: `${y}-01-01`, date_fin: `${y}-12-31` });
    },
    { invalidate: ['compta'], onSuccess: () => push('success', 'Plan SYSCOHADA coopératif initialisé') },
  );

  const contrepasser = useCoopMutation(
    async (_c, args: { id: string; motif: string }) => {
      const { error } = await supabase.rpc('coop_contrepasser_ecriture', { p_ecriture: args.id, p_motif: args.motif });
      if (error) throw error;
    },
    { invalidate: ['compta'], onSuccess: () => { push('success', 'Écriture contre-passée (OHADA)'); setCpTarget(null); setCpMotif(''); } },
  );

  const cloturer = useCoopMutation(
    async (_c, id: string) => {
      const { error } = await supabase.rpc('coop_cloturer_exercice', {
        p_exercice: id,
        p_taux_reserve_bp: Math.round((Number(tauxReserve) || 0) * 100),
        p_interet_xof: Number(interet.replace(/\s/g, '')) || 0,
        p_ristournes_xof: Number(ristournes.replace(/\s/g, '')) || 0,
      });
      if (error) throw error;
    },
    { invalidate: ['compta'], onSuccess: () => { push('success', 'Exercice clôturé · résultat affecté · à-nouveaux repris'); setClotureEx(null); } },
  );

  return (
    <>
      <PageHeader
        title="Comptabilité SYSCOHADA"
        subtitle="Analytique par section obligatoire dès la première écriture (P7)."
        icon={<BookText className="h-5 w-5" />}
        actions={
          data?.plan.length ? (
            <>
              <Select value={exId ?? ''} onChange={(e) => setSelExId(e.target.value)} className="h-10 w-auto">
                {data.exercices.map((ex: Record<string, unknown>) => (
                  <option key={ex.id as string} value={ex.id as string}>Exercice {ex.code as string}{ex.statut === 'cloture' ? ' (clôturé)' : ''}</option>
                ))}
              </Select>
              <Button variant="action" onClick={() => setEcrOpen(true)}><Plus className="h-4 w-4" /> Écriture</Button>
            </>
          ) : null
        }
      />

      {isLoading ? <Spinner /> : !data?.plan.length ? (
        <EmptyState
          icon={<BookText className="h-8 w-8" />}
          title="Comptabilité non initialisée"
          description="Générez le plan comptable SYSCOHADA adapté aux coopératives, les journaux et l'exercice courant."
          action={<Button variant="action" loading={seed.isPending} onClick={() => seed.mutate(undefined)}><Sparkles className="h-4 w-4" /> Initialiser le plan coopératif</Button>}
        />
      ) : (
        <>
          <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
            { key: 'balance', label: 'Balance' },
            { key: 'resultat', label: 'Compte de résultat' },
            { key: 'bilan', label: 'Bilan' },
            { key: 'tiers', label: 'Tiers & lettrage' },
            { key: 'exercice', label: 'Exercice & clôture', count: data.exercices.length },
            { key: 'plan', label: 'Plan comptable', count: data.plan.length },
            { key: 'journaux', label: 'Journaux', count: data.journaux.length },
            { key: 'ecritures', label: 'Écritures', count: data.ecritures.length },
          ]} />

          {tab === 'balance' && (
            <Card>
              <CardHeader title="Balance générale" subtitle={`Débit ${balance.totalD === balance.totalC ? '= Crédit ✓' : '≠ Crédit'}`} icon={<ScaleIcon className="h-5 w-5" />}
                action={<Button variant="outline" size="sm" onClick={() => downloadCsv(`balance-${exId ?? ''}.csv`, [['Compte', 'Libellé', 'Débit', 'Crédit', 'Solde'], ...balance.rows.map((r) => [r.numero, r.libelle, r.debit, r.credit, r.solde])])}><Download className="h-4 w-4" /> Excel</Button>} />
              <CardBody className="p-0">
                {!balance.rows.length ? <div className="py-8 text-center text-sm text-texte-2">Aucune écriture. La balance se remplit dès la première écriture.</div> : (
                  <Table>
                    <THead><Th>Compte</Th><Th>Libellé</Th><Th align="right">Débit</Th><Th align="right">Crédit</Th><Th align="right">Solde</Th></THead>
                    <TBody>
                      {balance.rows.map((r) => (
                        <Tr key={r.numero}>
                          <Td><span className="mono text-xs">{r.numero}</span></Td>
                          <Td className="text-sm">{r.libelle}</Td>
                          <Td align="right"><Money value={r.debit} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={r.credit} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={r.solde} size="sm" suffix={false} colorNegative /></Td>
                        </Tr>
                      ))}
                      <Tr className="font-semibold">
                        <Td /><Td>Totaux</Td>
                        <Td align="right"><Money value={balance.totalD} size="sm" suffix={false} /></Td>
                        <Td align="right"><Money value={balance.totalC} size="sm" suffix={false} /></Td>
                        <Td />
                      </Tr>
                    </TBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          )}

          {tab === 'resultat' && (
            !cr || (!cr.charges.length && !cr.produits.length) ? <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="Compte de résultat vide" description="Le résultat se construit dès les premières écritures de charges (classe 6) et produits (classe 7)." /> :
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadCsv(`compte-resultat-${exId ?? ''}.csv`, [['Type', 'Compte', 'Libellé', 'Montant'], ...cr.charges.map((l) => ['Charge', l.numero, l.libelle, l.montant]), ...cr.produits.map((l) => ['Produit', l.numero, l.libelle, l.montant]), ['', '', 'Résultat net', cr.resultat]])}><Download className="h-4 w-4" /> Excel</Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimer / PDF</Button>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Charges (classe 6)" icon={<TrendingUp className="h-5 w-5 rotate-180" />} />
                  <CardBody className="p-0"><Table>
                    <THead><Th>Compte</Th><Th align="right">Montant</Th></THead>
                    <TBody>
                      {cr.charges.map((l) => <Tr key={l.numero}><Td><span className="mono text-xs">{l.numero}</span> {l.libelle}</Td><Td align="right"><Money value={l.montant} size="sm" suffix={false} /></Td></Tr>)}
                      <Tr className="font-semibold"><Td>Total charges</Td><Td align="right"><Money value={cr.total_charges} size="sm" suffix={false} /></Td></Tr>
                    </TBody>
                  </Table></CardBody>
                </Card>
                <Card>
                  <CardHeader title="Produits (classe 7)" icon={<TrendingUp className="h-5 w-5" />} />
                  <CardBody className="p-0"><Table>
                    <THead><Th>Compte</Th><Th align="right">Montant</Th></THead>
                    <TBody>
                      {cr.produits.map((l) => <Tr key={l.numero}><Td><span className="mono text-xs">{l.numero}</span> {l.libelle}</Td><Td align="right"><Money value={l.montant} size="sm" suffix={false} /></Td></Tr>)}
                      <Tr className="font-semibold"><Td>Total produits</Td><Td align="right"><Money value={cr.total_produits} size="sm" suffix={false} /></Td></Tr>
                    </TBody>
                  </Table></CardBody>
                </Card>
              </div>
              <Card>
                <CardHeader title="Soldes intermédiaires de gestion (SIG)" subtitle="Cascade SYSCOHADA" icon={<Layers className="h-5 w-5" />} />
                <CardBody className="p-0"><Table>
                  <THead><Th>Solde</Th><Th align="right">Montant</Th></THead>
                  <TBody>
                    {SIG_LIGNES.map((s) => (
                      <Tr key={s.key} className={s.fort ? 'font-semibold' : ''}>
                        <Td>{s.label}</Td>
                        <Td align="right"><Money value={cr.sig[s.key] ?? 0} size="sm" suffix={false} colorNegative /></Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table></CardBody>
              </Card>
            </div>
          )}

          {tab === 'bilan' && (
            !etats.actif.length && !etats.passif.length ? <EmptyState icon={<Landmark className="h-8 w-8" />} title="Bilan vide" description="Le bilan s'établit dès les premières écritures." /> :
            <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => downloadCsv(`bilan-${exId ?? ''}.csv`, [['Poste', 'Compte', 'Libellé', 'Montant'], ...etats.actif.map((l) => ['Actif', l.numero, l.libelle, l.montant]), ...etats.passif.map((l) => ['Passif', l.numero, l.libelle, l.montant]), ['Passif', '', 'Résultat', etats.resultat]])}><Download className="h-4 w-4" /> Excel</Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Actif" subtitle="Emplois" icon={<Landmark className="h-5 w-5" />} />
                <CardBody className="p-0"><Table>
                  <THead><Th>Poste</Th><Th align="right">Montant</Th></THead>
                  <TBody>
                    {etats.actif.map((l) => <Tr key={l.numero}><Td><span className="mono text-xs">{l.numero}</span> {l.libelle}</Td><Td align="right"><Money value={l.montant} size="sm" suffix={false} colorNegative /></Td></Tr>)}
                    <Tr className="font-semibold"><Td>Total actif</Td><Td align="right"><Money value={etats.totActif} size="sm" suffix={false} /></Td></Tr>
                  </TBody>
                </Table></CardBody>
              </Card>
              <Card>
                <CardHeader title="Passif" subtitle="Ressources (résultat inclus)" icon={<Landmark className="h-5 w-5" />} />
                <CardBody className="p-0"><Table>
                  <THead><Th>Poste</Th><Th align="right">Montant</Th></THead>
                  <TBody>
                    {etats.passif.map((l) => <Tr key={l.numero}><Td><span className="mono text-xs">{l.numero}</span> {l.libelle}</Td><Td align="right"><Money value={l.montant} size="sm" suffix={false} colorNegative /></Td></Tr>)}
                    <Tr><Td className="text-texte-2">Résultat de l'exercice</Td><Td align="right"><Money value={etats.resultat} size="sm" suffix={false} colorNegative /></Td></Tr>
                    <Tr className="font-semibold"><Td>Total passif</Td><Td align="right"><Money value={etats.totPassif} size="sm" suffix={false} /></Td></Tr>
                  </TBody>
                </Table></CardBody>
              </Card>
              <div className="lg:col-span-2 text-center text-xs text-texte-2">
                {etats.totActif === etats.totPassif ? 'Bilan équilibré ✓' : `Écart actif/passif : ${(etats.totActif - etats.totPassif).toLocaleString('fr-FR')} (écritures en cours)`}
              </div>
            </div>
            </div>
          )}

          {tab === 'tiers' && <TiersLettrage />}

          {tab === 'exercice' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-primaire/20 bg-primaire/5 p-3 text-sm text-texte-2">
                <ScaleIcon className="mt-0.5 h-4 w-4 shrink-0 text-primaire" />
                Ordre d'affectation OHADA : <b className="text-texte">réserve légale</b> → intérêt aux parts → ristournes d'activité → report à nouveau. La clôture verrouille la période et génère les à-nouveaux (journal AN).
              </div>
              <Card><Table>
                <THead><Th>Exercice</Th><Th>Période</Th><Th align="right">Résultat</Th><Th>Statut</Th><Th></Th></THead>
                <TBody>
                  {data.exercices.map((ex: Record<string, unknown>) => (
                    <Tr key={ex.id as string}>
                      <Td className="font-medium text-texte">{ex.code as string}</Td>
                      <Td className="text-xs text-texte-2">{formatDate(ex.date_debut as string)} → {formatDate(ex.date_fin as string)}</Td>
                      <Td align="right">{ex.statut === 'ouvert' ? <Money value={etats.resultat} size="sm" suffix={false} colorNegative /> : ((ex.affectation as { resultat?: number } | null)?.resultat != null ? <Money value={(ex.affectation as { resultat: number }).resultat} size="sm" suffix={false} colorNegative /> : '—')}</Td>
                      <Td><Badge tone={ex.statut === 'ouvert' ? 'action' : 'neutre'} dot>{ex.statut as string}</Badge></Td>
                      <Td align="right">{ex.statut === 'ouvert' && <Button variant="primary" size="sm" onClick={() => { setClotureEx({ id: ex.id as string, code: ex.code as string }); setInteret('0'); setRistournes('0'); setTauxReserve('15'); }}>Clôturer & affecter</Button>}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table></Card>
            </div>
          )}

          {tab === 'plan' && (
            <Card><Table>
              <THead><Th>Numéro</Th><Th>Libellé</Th><Th>Classe</Th><Th>Type</Th></THead>
              <TBody>
                {data.plan.map((p) => (
                  <Tr key={p.id}><Td><span className="mono text-xs">{p.numero}</span></Td><Td>{p.libelle}</Td><Td>{p.classe}</Td><Td><Badge tone="neutre">{p.type}</Badge></Td></Tr>
                ))}
              </TBody>
            </Table></Card>
          )}

          {tab === 'journaux' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.journaux.map((j) => (
                <Card key={j.id}><CardBody><div className="flex items-center gap-2"><Badge tone="primaire">{j.code}</Badge><span className="font-medium text-texte">{j.libelle}</span></div></CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'ecritures' && (
            !data.ecritures.length ? <EmptyState icon={<BookText className="h-8 w-8" />} title="Aucune écriture" description="Saisissez une écriture manuelle ou laissez les flux opérationnels les générer (P6)." /> :
            <Card><Table>
              <THead><Th>Date</Th><Th>Journal</Th><Th>Libellé</Th><Th align="center">Équilibrée</Th><Th>Statut</Th><Th></Th></THead>
              <TBody>
                {data.ecritures.map((e: Record<string, unknown>) => {
                  const st = e.statut as string;
                  return (
                    <Tr key={e.id as string}>
                      <Td className="text-xs text-texte-2">{formatDate(e.date_ecriture as string)}</Td>
                      <Td><Badge tone="neutre">{(e.coop_journaux as { code?: string } | null)?.code ?? '—'}</Badge></Td>
                      <Td>{(e.libelle as string) ?? '—'}</Td>
                      <Td align="center">{e.equilibree ? <Badge tone="action">✓</Badge> : <Badge tone="alerte">≠</Badge>}</Td>
                      <Td><Badge tone={st === 'contrepassee' ? 'alerte' : st === 'brouillon' ? 'or' : 'action'}>{st ?? 'validée'}</Badge></Td>
                      <Td align="right">{st === 'validee' && <Button variant="ghost" size="sm" onClick={() => setCpTarget({ id: e.id as string, libelle: (e.libelle as string) ?? '' })}>Contre-passer</Button>}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table></Card>
          )}
        </>
      )}

      {ecrOpen && data && <EcritureForm plan={data.plan} journaux={data.journaux} onClose={() => { setEcrOpen(false); refetch(); }} onDone={() => push('success', 'Écriture enregistrée')} />}

      {cpTarget && (
        <Modal open onClose={() => setCpTarget(null)} title="Contre-passer l'écriture" subtitle={cpTarget.libelle}
          footer={<><Button variant="outline" onClick={() => setCpTarget(null)}>Annuler</Button><Button variant="danger" loading={contrepasser.isPending} disabled={!cpMotif} onClick={() => contrepasser.mutate({ id: cpTarget.id, motif: cpMotif })}>Contre-passer</Button></>}>
          <div className="space-y-3">
            <p className="text-sm text-texte-2">Une écriture inverse (débit ↔ crédit) est générée et liée. L'écriture d'origine reste immuable — jamais de suppression (OHADA, P6).</p>
            <Field label="Motif" required><Input value={cpMotif} onChange={(e) => setCpMotif(e.target.value)} placeholder="Ex. erreur d'imputation de compte" /></Field>
          </div>
        </Modal>
      )}

      {clotureEx && (() => {
        const res = etats.resultat;
        const reserve = res > 0 ? Math.round((res * (Number(tauxReserve) || 0)) / 100) : 0;
        const iN = Number(interet.replace(/\s/g, '')) || 0;
        const rN = Number(ristournes.replace(/\s/g, '')) || 0;
        const report = res - reserve - iN - rN;
        const over = report < 0;
        return (
          <Modal open onClose={() => setClotureEx(null)} title={`Clôture de l'exercice ${clotureEx.code}`} subtitle="Affectation du résultat (décision d'AG)"
            footer={<><Button variant="outline" onClick={() => setClotureEx(null)}>Annuler</Button><Button variant="primary" loading={cloturer.isPending} disabled={over} onClick={() => cloturer.mutate(clotureEx.id)}>Clôturer & affecter</Button></>}>
            <div className="space-y-4">
              <div className="rounded-lg bg-surface-2 p-3 text-sm"><span className="text-texte-2">Résultat de l'exercice : </span><Money value={res} colorNegative /></div>
              {res > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Réserve légale (%)"><Input type="number" value={tauxReserve} onChange={(e) => setTauxReserve(e.target.value)} /></Field>
                    <Field label="Intérêt aux parts (FCFA)"><Input type="number" value={interet} onChange={(e) => setInteret(e.target.value)} /></Field>
                    <Field label="Ristournes (FCFA)"><Input type="number" value={ristournes} onChange={(e) => setRistournes(e.target.value)} /></Field>
                  </div>
                  <div className="space-y-1 rounded-lg border border-ligne p-3 text-sm">
                    <div className="flex justify-between"><span className="text-texte-2">Réserve légale (1061)</span><Money value={reserve} size="sm" suffix={false} /></div>
                    <div className="flex justify-between"><span className="text-texte-2">Intérêt aux parts (4634)</span><Money value={iN} size="sm" suffix={false} /></div>
                    <div className="flex justify-between"><span className="text-texte-2">Ristournes à payer (4621)</span><Money value={rN} size="sm" suffix={false} /></div>
                    <div className="flex justify-between border-t border-ligne pt-1 font-semibold"><span>Report à nouveau (110)</span><Money value={report} size="sm" suffix={false} colorNegative /></div>
                  </div>
                  {over && <div className="rounded-lg bg-alerte/10 p-2 text-xs text-alerte">Sur-affectation : réserve + intérêts + ristournes dépassent le résultat.</div>}
                </>
              ) : (
                <p className="text-sm text-texte-2">Résultat négatif ou nul : reporté à nouveau (compte 110). La période sera verrouillée et les à-nouveaux repris sur l'exercice suivant.</p>
              )}
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

interface LigneSaisie { compte: string; libelle: string; debit: string; credit: string }

function EcritureForm({ plan, journaux, onClose, onDone }: { plan: CoopCompte[]; journaux: CoopJournal[]; onClose: () => void; onDone: () => void }) {
  const [journalId, setJournalId] = useState(journaux[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [libelle, setLibelle] = useState('');
  const [lignes, setLignes] = useState<LigneSaisie[]>([
    { compte: '', libelle: '', debit: '', credit: '' },
    { compte: '', libelle: '', debit: '', credit: '' },
  ]);

  const totalD = lignes.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalC = lignes.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const equilibre = totalD === totalC && totalD > 0;

  const setLigne = (i: number, patch: Partial<LigneSaisie>) =>
    setLignes((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useCoopMutation(
    async (coopId) => {
      const { data: ecr, error } = await supabase.from('coop_ecritures').insert({
        cooperative_id: coopId, journal_id: journalId || null, date_ecriture: date, libelle: libelle || null, source_type: 'manuel',
      }).select('id').single();
      if (error) throw error;
      const rows = lignes.filter((l) => l.compte && (Number(l.debit) || Number(l.credit))).map((l) => ({
        cooperative_id: coopId, ecriture_id: ecr.id, compte_numero: l.compte, libelle: l.libelle || libelle || null,
        debit_xof: Number(l.debit) || 0, credit_xof: Number(l.credit) || 0,
      }));
      const { error: e2 } = await supabase.from('coop_lignes_ecritures').insert(rows);
      if (e2) throw e2;
      await supabase.rpc('coop_ecriture_equilibre', { p_ecriture: ecr.id });
    },
    { invalidate: ['compta'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Nouvelle écriture" subtitle="La saisie manuelle est réservée au comptable (justificatif requis)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!equilibre} onClick={() => save.mutate(undefined)}>Enregistrer{!equilibre && ' (déséquilibrée)'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Journal"><Select value={journalId} onChange={(e) => setJournalId(e.target.value)}>{journaux.map((j) => <option key={j.id} value={j.id}>{j.code} — {j.libelle}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Libellé"><Input value={libelle} onChange={(e) => setLibelle(e.target.value)} /></Field>
        </div>

        <div className="space-y-2">
          {lignes.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Select className="col-span-5" value={l.compte} onChange={(e) => setLigne(i, { compte: e.target.value })}>
                <option value="">— Compte —</option>
                {plan.map((p) => <option key={p.id} value={p.numero}>{p.numero} — {p.libelle}</option>)}
              </Select>
              <Input className="col-span-3" placeholder="Libellé" value={l.libelle} onChange={(e) => setLigne(i, { libelle: e.target.value })} />
              <Input className="col-span-2" type="number" placeholder="Débit" value={l.debit} onChange={(e) => setLigne(i, { debit: e.target.value, credit: '' })} />
              <Input className="col-span-2" type="number" placeholder="Crédit" value={l.credit} onChange={(e) => setLigne(i, { credit: e.target.value, debit: '' })} />
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setLignes((p) => [...p, { compte: '', libelle: '', debit: '', credit: '' }])}><Plus className="h-4 w-4" /> Ligne</Button>
        </div>

        <div className="flex justify-end gap-6 rounded-lg bg-surface-2 p-3 text-sm">
          <span>Total débit : <Money value={totalD} size="sm" suffix={false} /></span>
          <span>Total crédit : <Money value={totalC} size="sm" suffix={false} /></span>
          <Badge tone={equilibre ? 'action' : 'alerte'}>{equilibre ? 'Équilibrée ✓' : 'Déséquilibrée'}</Badge>
        </div>
      </div>
    </Modal>
  );
}
