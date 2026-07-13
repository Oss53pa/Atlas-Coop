import { useState } from 'react';
import {
  Network, ShieldCheck, RefreshCw, BookOpen, Bell, Lock, Award, Check, TrendingUp,
} from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { useCoop } from '../../auth/CooperativeProvider';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Badge, Tabs, Spinner, EmptyState, useToast,
} from '../../ui';
import { cn } from '../../lib/cn';

type Tab = 'benchmarks' | 'fiches' | 'alertes';

const METRIC_META: Record<string, { label: string; unite: string; sens: 'haut' | 'bas' }> = {
  rendement_agri_kg_ha: { label: 'Rendement agricole', unite: 'kg/ha', sens: 'haut' },
  taux_ponte_pct: { label: 'Taux de ponte', unite: '%', sens: 'haut' },
  ic_aquacole: { label: 'Indice de consommation (aquaculture)', unite: 'kg/kg', sens: 'bas' },
};
const QUARTILE_LABEL: Record<string, { label: string; tone: 'action' | 'or' | 'alerte' | 'neutre' }> = {
  q4: { label: 'Quartile supérieur', tone: 'action' },
  q3: { label: '3ᵉ quartile', tone: 'action' },
  q2: { label: '2ᵉ quartile', tone: 'or' },
  q1: { label: 'Quartile inférieur', tone: 'alerte' },
  segment_insuffisant: { label: 'Segment < 5', tone: 'neutre' },
};

export function ReseauPage() {
  const { current } = useCoop();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('benchmarks');

  const { data, isLoading, refetch } = useCoopQuery(['reseau', current?.pays], async (coopId) => {
    const [consent, bench, fiches, alertes] = await Promise.all([
      supabase.from('coop_reseau_consentements').select('*').eq('cooperative_id', coopId).maybeSingle(),
      supabase.rpc('coop_reseau_benchmarks', { p_coop: coopId }),
      supabase.rpc('coop_reseau_fiches'),
      supabase.rpc('coop_reseau_alertes', { p_pays: current?.pays ?? 'CI' }),
    ]);
    return {
      consent: consent.data as Record<string, unknown> | null,
      benchmarks: (bench.data ?? []) as Record<string, unknown>[],
      fiches: (fiches.data ?? []) as Record<string, unknown>[],
      alertes: (alertes.data ?? []) as Record<string, unknown>[],
    };
  });

  const actif = data?.consent?.statut === 'actif';
  const qualite = data?.benchmarks[0]?.quality_score as number | undefined;

  const adherer = useCoopMutation(
    async (coopId) => {
      await supabase.from('coop_reseau_consentements').upsert({ cooperative_id: coopId, statut: 'actif', decision_ref: 'AG' }, { onConflict: 'cooperative_id' });
      await supabase.rpc('coop_reseau_run_etl', { p_coop: coopId });
    },
    { invalidate: ['reseau'], onSuccess: () => { push('success', 'Adhésion au Réseau · contribution envoyée'); refetch(); } },
  );
  const revoquer = useCoopMutation(
    async (coopId) => { await supabase.from('coop_reseau_consentements').update({ statut: 'revoque', date_revocation: new Date().toISOString() }).eq('cooperative_id', coopId); },
    { invalidate: ['reseau'], onSuccess: () => { push('success', 'Adhésion révoquée'); refetch(); } },
  );
  const relancerEtl = useCoopMutation(
    async (coopId) => { await supabase.rpc('coop_reseau_run_etl', { p_coop: coopId }); },
    { invalidate: ['reseau'], onSuccess: () => { push('success', 'Contribution actualisée'); refetch(); } },
  );

  return (
    <>
      <PageHeader
        title="Réseau Atlas Coop"
        subtitle="Intelligence collective anonyme. Chaque coopérative rend le réseau plus utile à toutes."
        icon={<Network className="h-5 w-5" />}
        actions={actif ? <Button variant="outline" loading={relancerEtl.isPending} onClick={() => relancerEtl.mutate(undefined)}><RefreshCw className="h-4 w-4" /> Actualiser ma contribution</Button> : undefined}
      />

      {isLoading ? <Spinner /> : !actif ? (
        <Card>
          <CardBody className="mx-auto max-w-2xl py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primaire/10 text-primaire"><Network className="h-7 w-7" /></div>
            <h2 className="mt-4 text-xl font-bold text-texte">Rejoindre le Réseau</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-texte-2">
              L'adhésion est un <b className="text-texte">opt-in explicite, voté en organe</b> (résolution M4), révocable à tout moment.
              Vous partagez des agrégats anonymes issus de vos opérations réelles et recevez les benchmarks de votre segment.
              Pas de passager clandestin : on ne consulte que si l'on contribue.
            </p>
            <div className="mx-auto mt-4 grid max-w-lg gap-2 text-left text-sm">
              <Point>Anonymisation stricte : hash salé non réversible, aucune donnée membre ni montant individuel.</Point>
              <Point>Seuil anti-réidentification : aucun benchmark si le segment compte moins de 5 coopératives.</Point>
              <Point>Transactionnel, jamais déclaratif : les chiffres viennent des pesées, factures et cycles réels.</Point>
            </div>
            <Button variant="action" size="lg" className="mt-6" loading={adherer.isPending} onClick={() => adherer.mutate(undefined)}>
              <Check className="h-5 w-5" /> Adhérer (résolution d'organe)
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Statut" value="Contributeur actif" tone="action" icon={<ShieldCheck className="h-4 w-4" />} />
            <Stat label="Score de qualité des données" value={qualite !== undefined ? `${qualite}/100` : '—'} tone={qualite && qualite >= 70 ? 'action' : 'or'} icon={<Award className="h-4 w-4" />} hint="Plus il est élevé, plus votre contribution pèse" />
            <Stat label="Anonymisation" value="hash salé" tone="primaire" icon={<Lock className="h-4 w-4" />} hint="k≥5 · aucun retour vers la production" />
          </div>

          <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
            { key: 'benchmarks', label: 'Benchmarks', count: data?.benchmarks.length },
            { key: 'fiches', label: 'Bonnes pratiques', count: data?.fiches.length },
            { key: 'alertes', label: 'Alertes régionales', count: data?.alertes.length },
          ]} />

          {tab === 'benchmarks' && (
            !data?.benchmarks.length ? <EmptyState icon={<TrendingUp className="h-8 w-8" />} title="Aucun benchmark" description="Enregistrez plus d'activité (récoltes, ponte, cycles) puis actualisez votre contribution." /> :
            <div className="space-y-4">
              {data.benchmarks.map((b) => <BenchmarkCard key={b.metric as string} b={b} />)}
              <div className="flex items-start gap-2 rounded-xl border border-primaire/20 bg-primaire/5 p-3 text-xs text-texte-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primaire" />
                Vous voyez la <b className="text-texte">distribution</b> de votre segment (quartiles), jamais les valeurs d'une autre coopérative. Bruit différentiel et seuil k≥5 appliqués.
              </div>
            </div>
          )}

          {tab === 'fiches' && (
            !data?.fiches.length ? <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Aucune fiche" description="La bibliothèque de bonnes pratiques du réseau." /> :
            <div className="grid gap-4 md:grid-cols-2">
              {data.fiches.map((f) => (
                <Card key={f.id as string}><CardBody>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-texte">{f.titre as string}</h3>
                    {f.note_moyenne ? <Badge tone="or">★ {Number(f.note_moyenne).toFixed(1)}</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-texte-2">{(f.categorie as string) ?? ''} · {f.anonyme ? 'anonyme' : 'signée'}</div>
                  <p className="mt-2 text-sm text-texte-2">{f.contenu as string}</p>
                </CardBody></Card>
              ))}
            </div>
          )}

          {tab === 'alertes' && (
            !data?.alertes.length ? <EmptyState icon={<Bell className="h-8 w-8" />} title="Aucune alerte" description="Signalements sanitaires et phénomènes de marché de votre zone." /> :
            <div className="space-y-3">
              {data.alertes.map((a) => (
                <Card key={a.id as string}><CardBody className="flex items-start gap-3">
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', a.type === 'sanitaire' ? 'bg-alerte/10 text-alerte' : 'bg-or-fcfa/10 text-or-fcfa')}><Bell className="h-4 w-4" /></span>
                  <div>
                    <div className="flex items-center gap-2"><Badge tone={a.type === 'sanitaire' ? 'alerte' : 'or'}>{a.type as string}</Badge><span className="text-xs text-texte-2">{(a.zone as string) ? `Zone ${a.zone}` : (a.pays as string) ?? 'National'}</span></div>
                    <p className="mt-1 text-sm text-texte">{a.message as string}</p>
                  </div>
                </CardBody></Card>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between rounded-xl border border-ligne bg-surface-2 p-3 text-xs text-texte-2">
            <span>Charte publique : les données appartiennent aux coopératives. Atlas Studio n'est qu'opérateur.</span>
            <button onClick={() => revoquer.mutate(undefined)} className="font-semibold text-alerte hover:underline">Révoquer l'adhésion</button>
          </div>
        </>
      )}
    </>
  );
}

function Point({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 text-texte-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-action" /><span>{children}</span></div>;
}

function BenchmarkCard({ b }: { b: Record<string, unknown> }) {
  const meta = METRIC_META[b.metric as string] ?? { label: b.metric as string, unite: '', sens: 'haut' as const };
  const insuffisant = b.quartile === 'segment_insuffisant' || b.n == null;
  const q = QUARTILE_LABEL[b.quartile as string] ?? QUARTILE_LABEL.segment_insuffisant;
  const p25 = Number(b.p25), p50 = Number(b.p50), p75 = Number(b.p75), val = Number(b.ma_valeur);
  // échelle visuelle : min = p25 - marge, max = p75 + marge
  const lo = Math.min(p25, val), hi = Math.max(p75, val);
  const span = hi - lo || 1;
  const pct = (v: number) => Math.max(2, Math.min(98, ((v - lo) / span) * 100));

  return (
    <Card>
      <CardHeader
        title={meta.label}
        subtitle={insuffisant ? 'Segment insuffisant (< 5 coopératives) — voir benchmarks externes (Veille)' : `Segment de ${b.n} coopératives comparables`}
        action={<Badge tone={q.tone}>{q.label}</Badge>}
      />
      <CardBody>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-texte">{val.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
          <span className="text-sm text-texte-2">{meta.unite} — votre valeur</span>
        </div>
        {!insuffisant && (
          <>
            <div className="relative mt-4 h-2 rounded-full bg-desactive-fond">
              <div className="absolute inset-y-0 rounded-full bg-primaire/20" style={{ left: `${pct(p25)}%`, right: `${100 - pct(p75)}%` }} />
              <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-primaire" style={{ left: `${pct(p50)}%` }} title="médiane" />
              <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-action shadow" style={{ left: `${pct(val)}%` }} title="vous" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-texte-2">
              <span>P25 : {p25.toLocaleString('fr-FR')}</span>
              <span>Médiane : {p50.toLocaleString('fr-FR')}</span>
              <span>P75 : {p75.toLocaleString('fr-FR')}</span>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
