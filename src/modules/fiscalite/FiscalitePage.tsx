import { useState } from 'react';
import { Receipt, Plus, Info, Settings2, FileCheck2, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Money, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td, Tabs,
} from '../../ui';
import { formatBp } from '../../lib/rates';
import { formatDate } from '../../lib/format';

type Onglet = 'tva' | 'fne';

interface FneFacture {
  id: string; numero: string; client_nom: string | null; montant_ttc_xof: number;
  statut: string; fne_reference: string | null; erreur: string | null; created_at: string;
}

export function FiscalitePage() {
  const { push } = useToast();
  const [onglet, setOnglet] = useState<Onglet>('tva');
  const [paramOpen, setParamOpen] = useState(false);
  const [declOpen, setDeclOpen] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['fiscalite'], async (coopId) => {
    const [params, decls, fne] = await Promise.all([
      supabase.from('coop_parametres_fiscaux').select('*').eq('cooperative_id', coopId).maybeSingle(),
      supabase.from('coop_declarations_tva').select('*').eq('cooperative_id', coopId).order('date_debut', { ascending: false }),
      supabase.from('coop_fne_factures').select('*').eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(100),
    ]);
    return {
      params: params.data as Record<string, unknown> | null,
      decls: decls.data ?? [],
      fne: (fne.data ?? []) as FneFacture[],
    };
  });

  const params = data?.params;
  const aPayer = (data?.decls ?? []).filter((d: Record<string, unknown>) => d.statut !== 'payee' && (d.tva_nette_xof as number) > 0).reduce((s: number, d: Record<string, unknown>) => s + (d.tva_nette_xof as number), 0);

  const marquerPayee = useCoopMutation(
    async (_c, id: string) => { const { error } = await supabase.from('coop_declarations_tva').update({ statut: 'payee' }).eq('id', id); if (error) throw error; },
    { invalidate: ['fiscalite'], onSuccess: () => push('success', 'Déclaration marquée payée') },
  );

  const genererFne = useCoopMutation(
    async (coopId) => {
      const { data: n, error } = await supabase.rpc('coop_generer_fne_factures', { p_coop: coopId });
      if (error) throw error;
      return n as number;
    },
    { invalidate: ['fiscalite'], onSuccess: (n) => push('success', n > 0 ? `${n} facture(s) ajoutée(s) à la file` : 'Aucune nouvelle vente à certifier') },
  );

  const certifierFne = useCoopMutation(
    async (coopId) => {
      const { data: r, error } = await supabase.functions.invoke('coop-fne-certify', { body: { cooperative_id: coopId } });
      if (error) throw error;
      return r as { processed: number; certified: number; failed: number; mode: string };
    },
    {
      invalidate: ['fiscalite'],
      onSuccess: (r) => push('success', `Certification : ${r?.certified ?? 0}/${r?.processed ?? 0} factures (${r?.mode ?? 'simulé'})`),
    },
  );

  const aCertifier = (data?.fne ?? []).filter((f) => f.statut === 'a_certifier').length;

  return (
    <>
      <PageHeader
        title="Fiscalité"
        subtitle="Régime, TVA, déclarations, facturation normalisée électronique (FNE). Ce module paramètre, il ne remplace pas le conseil fiscal."
        icon={<Receipt className="h-5 w-5" />}
        actions={onglet === 'tva' ? (
          <>
            <Button variant="outline" onClick={() => setParamOpen(true)}><Settings2 className="h-4 w-4" /> Paramètres</Button>
            <Button variant="action" onClick={() => setDeclOpen(true)} disabled={!params?.assujetti_tva}><Plus className="h-4 w-4" /> Déclaration TVA</Button>
          </>
        ) : (
          <>
            <Button variant="outline" loading={genererFne.isPending} onClick={() => genererFne.mutate(undefined)}><RefreshCw className="h-4 w-4" /> Générer les factures</Button>
            <Button variant="action" loading={certifierFne.isPending} disabled={aCertifier === 0} onClick={() => certifierFne.mutate(undefined)}><ShieldCheck className="h-4 w-4" /> Certifier la file ({aCertifier})</Button>
          </>
        )}
      />

      <Tabs<Onglet>
        className="mb-4"
        value={onglet}
        onChange={setOnglet}
        tabs={[
          { key: 'tva', label: 'TVA' },
          { key: 'fne', label: 'Factures FNE', count: data?.fne.length },
        ]}
      />

      {isLoading ? <Spinner /> : onglet === 'tva' ? (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-or-fcfa/25 bg-or-fcfa/5 p-3 text-sm text-texte-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-or-fcfa" />
            La fiscalité coopérative comporte des exonérations spécifiques et des régimes variables par pays et par activité. Ce module prépare vos déclarations ; validez avec votre conseil fiscal.
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Assujetti TVA" value={params?.assujetti_tva ? 'Oui' : 'Non'} tone={params?.assujetti_tva ? 'action' : 'primaire'} icon={<Receipt className="h-4 w-4" />} hint={params ? `Régime ${(params.regime as string).replace('_', ' ')}` : 'Non paramétré'} />
            <Stat label="Taux TVA" value={params ? formatBp(params.taux_tva_bp as number, 0) : '—'} tone="primaire" icon={<Settings2 className="h-4 w-4" />} />
            <Stat label="TVA nette à payer" value={<Money value={aPayer} suffix={false} size="xl" />} tone="alerte" icon={<FileCheck2 className="h-4 w-4" />} />
          </div>

          {!params?.assujetti_tva ? (
            <EmptyState icon={<Receipt className="h-8 w-8" />} title="Coopérative non assujettie à la TVA" description="Si votre coopérative devient assujettie (par activité), activez la TVA dans les paramètres pour préparer les déclarations." action={<Button variant="outline" onClick={() => setParamOpen(true)}><Settings2 className="h-4 w-4" /> Paramètres fiscaux</Button>} />
          ) : !data?.decls.length ? (
            <EmptyState icon={<FileCheck2 className="h-8 w-8" />} title="Aucune déclaration" description="Générez une déclaration de TVA pour une période : collectée (4431) − déductible (4452)." action={<Button variant="action" onClick={() => setDeclOpen(true)}><Plus className="h-4 w-4" /> Déclaration TVA</Button>} />
          ) : (
            <Card>
              <CardHeader title="Déclarations de TVA" subtitle="TVA collectée − déductible = nette" />
              <CardBody className="p-0">
                <Table>
                  <THead><Th>Période</Th><Th align="right">Collectée</Th><Th align="right">Déductible</Th><Th align="right">Nette</Th><Th>Statut</Th><Th></Th></THead>
                  <TBody>
                    {data.decls.map((d: Record<string, unknown>) => {
                      const nette = d.tva_nette_xof as number;
                      return (
                        <Tr key={d.id as string}>
                          <Td className="font-medium text-texte">{d.periode as string}<div className="text-xs font-normal text-texte-2">{formatDate(d.date_debut as string)} → {formatDate(d.date_fin as string)}</div></Td>
                          <Td align="right"><Money value={d.tva_collectee_xof as number} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={d.tva_deductible_xof as number} size="sm" suffix={false} /></Td>
                          <Td align="right"><Money value={nette} size="sm" suffix={false} colorNegative /> <span className="text-xs text-texte-2">{nette >= 0 ? 'à payer' : 'crédit'}</span></Td>
                          <Td><Badge tone={d.statut === 'payee' ? 'action' : d.statut === 'declaree' ? 'or' : 'neutre'} dot>{d.statut as string}</Badge></Td>
                          <Td align="right">{d.statut !== 'payee' && nette > 0 && <Button variant="outline" size="sm" loading={marquerPayee.isPending} onClick={() => marquerPayee.mutate(d.id as string)}>Marquer payée</Button>}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-or-fcfa/25 bg-or-fcfa/5 p-3 text-sm text-texte-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-or-fcfa" />
            Facture Normalisée Électronique (FNE — DGI Côte d'Ivoire). « Générer les factures » importe les ventes non encore certifiées ; « Certifier la file » appelle la passerelle FNE (simulée tant qu'aucune clé n'est configurée).
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Factures" value={data?.fne.length ?? 0} tone="primaire" icon={<QrCode className="h-4 w-4" />} />
            <Stat label="À certifier" value={aCertifier} tone={aCertifier > 0 ? 'alerte' : 'primaire'} icon={<FileCheck2 className="h-4 w-4" />} />
            <Stat label="Certifiées" value={(data?.fne ?? []).filter((f) => f.statut === 'certifie').length} tone="action" icon={<ShieldCheck className="h-4 w-4" />} />
          </div>

          {!data?.fne.length ? (
            <EmptyState icon={<QrCode className="h-8 w-8" />} title="Aucune facture FNE" description="Générez les factures depuis les ventes de la coopérative." action={<Button variant="outline" loading={genererFne.isPending} onClick={() => genererFne.mutate(undefined)}><RefreshCw className="h-4 w-4" /> Générer les factures</Button>} />
          ) : (
            <Card>
              <CardHeader title="Factures FNE" subtitle="Certification DGI par facture" />
              <CardBody className="p-0">
                <Table>
                  <THead><Th>Numéro</Th><Th>Client</Th><Th align="right">Montant TTC</Th><Th>Statut</Th><Th>Référence DGI</Th></THead>
                  <TBody>
                    {data.fne.map((f) => (
                      <Tr key={f.id}>
                        <Td className="mono text-sm text-texte">{f.numero}</Td>
                        <Td className="text-texte-2">{f.client_nom ?? '—'}</Td>
                        <Td align="right"><Money value={f.montant_ttc_xof} size="sm" suffix={false} /></Td>
                        <Td><Badge tone={f.statut === 'certifie' ? 'action' : f.statut === 'echec' ? 'alerte' : 'or'} dot>{f.statut.replace('_', ' ')}</Badge></Td>
                        <Td className="mono text-xs text-texte-2">{f.fne_reference ?? f.erreur ?? '—'}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {paramOpen && <ParamsForm current={params ?? null} onClose={() => { setParamOpen(false); refetch(); }} onDone={() => push('success', 'Paramètres enregistrés')} />}
      {declOpen && <DeclForm onClose={() => { setDeclOpen(false); refetch(); }} onDone={() => push('success', 'Déclaration générée')} />}
    </>
  );
}

function ParamsForm({ current, onClose, onDone }: { current: Record<string, unknown> | null; onClose: () => void; onDone: () => void }) {
  const [regime, setRegime] = useState((current?.regime as string) ?? 'reel_simplifie');
  const [assujetti, setAssujetti] = useState((current?.assujetti_tva as boolean) ?? false);
  const [taux, setTaux] = useState(String(((current?.taux_tva_bp as number) ?? 1800) / 100));
  const [periodicite, setPeriodicite] = useState((current?.periodicite as string) ?? 'mensuelle');
  const save = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.from('coop_parametres_fiscaux').upsert({
        cooperative_id: coopId, regime, assujetti_tva: assujetti,
        taux_tva_bp: Math.round((Number(taux) || 0) * 100), periodicite,
      }, { onConflict: 'cooperative_id' });
      if (error) throw error;
    },
    { invalidate: ['fiscalite'], onSuccess: () => { onDone(); onClose(); } },
  );
  return (
    <Modal open onClose={onClose} title="Paramètres fiscaux"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Régime fiscal"><Select value={regime} onChange={(e) => setRegime(e.target.value)}><option value="reel">Réel normal</option><option value="reel_simplifie">Réel simplifié</option><option value="exonere">Exonéré (coopératif)</option></Select></Field>
        <label className="flex items-center gap-2 text-sm text-texte"><input type="checkbox" checked={assujetti} onChange={(e) => setAssujetti(e.target.checked)} className="h-4 w-4 rounded border-ligne text-action" /> Assujettie à la TVA</label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taux de TVA (%)"><Input type="number" value={taux} onChange={(e) => setTaux(e.target.value)} /></Field>
          <Field label="Périodicité"><Select value={periodicite} onChange={(e) => setPeriodicite(e.target.value)}><option value="mensuelle">Mensuelle</option><option value="trimestrielle">Trimestrielle</option></Select></Field>
        </div>
      </div>
    </Modal>
  );
}

function DeclForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const now = new Date();
  const [gran, setGran] = useState<'mois' | 'trimestre' | 'annee'>('mois');
  const [mois, setMois] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  function range(): { periode: string; debut: string; fin: string } {
    const [y, m] = mois.split('-').map(Number);
    if (gran === 'annee') return { periode: `${y}`, debut: `${y}-01-01`, fin: `${y}-12-31` };
    if (gran === 'trimestre') {
      const q = Math.floor((m - 1) / 3);
      const d = new Date(y, q * 3, 1), f = new Date(y, q * 3 + 3, 0);
      return { periode: `${y}-T${q + 1}`, debut: d.toISOString().slice(0, 10), fin: f.toISOString().slice(0, 10) };
    }
    const f = new Date(y, m, 0);
    return { periode: `${y}-${String(m).padStart(2, '0')}`, debut: `${y}-${String(m).padStart(2, '0')}-01`, fin: f.toISOString().slice(0, 10) };
  }

  const save = useCoopMutation(
    async (coopId) => {
      const r = range();
      const { data: tva, error: te } = await supabase.rpc('coop_calcul_tva', { p_coop: coopId, p_debut: r.debut, p_fin: r.fin });
      if (te) throw te;
      const row = (tva as { collectee: number; deductible: number; nette: number }[])?.[0] ?? { collectee: 0, deductible: 0, nette: 0 };
      const { error } = await supabase.from('coop_declarations_tva').upsert({
        cooperative_id: coopId, periode: r.periode, date_debut: r.debut, date_fin: r.fin,
        tva_collectee_xof: row.collectee, tva_deductible_xof: row.deductible, tva_nette_xof: row.nette, statut: 'declaree', date_declaration: new Date().toISOString().slice(0, 10),
      }, { onConflict: 'cooperative_id,periode' });
      if (error) throw error;
    },
    { invalidate: ['fiscalite'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} title="Nouvelle déclaration de TVA" subtitle="Calculée depuis les écritures de la période"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} onClick={() => save.mutate(undefined)}>Générer</Button></>}>
      <div className="space-y-4">
        <Field label="Granularité"><Select value={gran} onChange={(e) => setGran(e.target.value as 'mois' | 'trimestre' | 'annee')}><option value="mois">Mensuelle</option><option value="trimestre">Trimestrielle</option><option value="annee">Annuelle</option></Select></Field>
        <Field label="Période de référence"><Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></Field>
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-texte-2">Période : <b className="text-texte">{range().periode}</b> ({range().debut} → {range().fin})</div>
      </div>
    </Modal>
  );
}
