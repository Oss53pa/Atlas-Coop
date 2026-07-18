import { Link } from 'react-router-dom';
import {
  Users, Scale, ArrowUpRight, Sparkles, Blocks, ArrowRight,
  ShieldCheck, BadgeCheck, CalendarDays, FileCheck2, Bot, MessageSquare, LogOut,
} from 'lucide-react';
import { useCoopQuery, supabase } from '../../hooks/data';
import { useCoop } from '../../auth/CooperativeProvider';
import { useAuth } from '../../auth/AuthProvider';
import { Card, CardHeader, CardBody, Money, Spinner, EmptyState, Sparkline, Avatar } from '../../ui';
import { formatDateTime, formatNumber } from '../../lib/format';
import { natureLabel } from '../../domain/labels';

const MOIS = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const MOIS_MAJ = MOIS.charAt(0).toUpperCase() + MOIS.slice(1);

/**
 * Cockpit d'accueil — écran AUTONOME affiché juste après connexion, AVANT
 * l'application (pas de menu latéral). L'utilisateur y entre dans son espace
 * via le bouton « Entrer dans l'application » (ou un raccourci ci-dessous).
 */
export function Dashboard() {
  const { current } = useCoop();
  const { user, signOut } = useAuth();
  const prenom = ((user?.user_metadata?.full_name as string) ?? user?.email ?? '').split(/[ @]/)[0];

  const { data, isLoading } = useCoopQuery(['dashboard'], async (coopId) => {
    const [membres, comptes, caisses, banques, parts, apports, sections, sms, audit] = await Promise.all([
      supabase.from('coop_membres').select('statut', { count: 'exact' }).eq('cooperative_id', coopId),
      supabase.from('coop_comptes_membres').select('solde_xof').eq('cooperative_id', coopId),
      supabase.from('coop_caisses').select('solde_xof').eq('cooperative_id', coopId).eq('actif', true),
      supabase.from('coop_comptes_bancaires').select('solde_xof').eq('cooperative_id', coopId).eq('actif', true),
      supabase.from('coop_parts_liberations').select('montant_xof').eq('cooperative_id', coopId),
      supabase
        .from('coop_mouvements_compte_membre')
        .select('id, nature, sens, montant_xof, created_at, coop_membres(nom, prenoms, numero)')
        .eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(6),
      supabase.from('coop_sections').select('id, nom, couleur').eq('cooperative_id', coopId).eq('actif', true),
      supabase.from('coop_notifications_sms').select('id', { count: 'exact', head: true }).eq('cooperative_id', coopId),
      supabase.from('coop_audit_log').select('id', { count: 'exact', head: true }).eq('cooperative_id', coopId),
    ]);
    const soldes = comptes.data ?? [];
    const crediteurs = soldes.filter((c: { solde_xof: number }) => c.solde_xof > 0).reduce((s: number, c: { solde_xof: number }) => s + c.solde_xof, 0);
    const treso =
      (caisses.data ?? []).reduce((s: number, c: { solde_xof: number }) => s + c.solde_xof, 0) +
      (banques.data ?? []).reduce((s: number, c: { solde_xof: number }) => s + c.solde_xof, 0);
    const capital = (parts.data ?? []).reduce((s: number, p: { montant_xof: number }) => s + p.montant_xof, 0);
    const actifs = (membres.data ?? []).filter((m: { statut: string }) => m.statut === 'actif').length;
    return {
      totalMembres: membres.count ?? 0, membresActifs: actifs, crediteurs, treso, capital,
      sections: sections.data ?? [], recents: apports.data ?? [],
      smsCount: sms.count ?? 0, auditCount: audit.count ?? 0,
    };
  });

  if (isLoading || !data) return <Spinner label="Chargement du cockpit…" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ===== EN-TÊTE MINIMAL (pas de menu — écran d'accueil avant l'application) ===== */}
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl text-primaire">Atlas Coop</span>
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-texte-2 hover:bg-surface-2 hover:text-texte"
        >
          <Avatar name={(user?.user_metadata?.full_name as string) ?? user?.email} size="sm" />
          <span className="hidden sm:inline">Se déconnecter</span>
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* ===== HERO ===== */}
      <section className="hero-atlas relative overflow-hidden rounded-3xl text-white">
        <div className="hero-dots absolute inset-0" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold uppercase tracking-wider text-white/60">
              {current?.nom} · {current?.devise ?? 'XOF'}{prenom ? ` · ${prenom}` : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-semibold text-white/80">
                <CalendarDays className="h-3.5 w-3.5" /> {MOIS_MAJ}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-action/40 bg-action/15 px-3 py-1 font-semibold text-white/90">
                <BadgeCheck className="h-3.5 w-3.5" /> {current?.forme_juridique === 'COOP_CA' ? 'COOP-CA' : 'SCOOPS'}
              </span>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-or">
              <span className="h-1.5 w-1.5 rounded-full bg-or-fcfa" /> Bienvenue · {MOIS_MAJ}
            </div>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
              Atlas <span className="font-display text-5xl text-or sm:text-6xl">Coop</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-white/70">
              Pilotage intégral de votre coopérative — du <b className="text-white/90">grand livre membre</b> à
              la <b className="text-white/90">ristourne</b>, en conformité <b className="text-white/90">OHADA · SYSCOHADA</b>.
              Données 100 % en temps réel.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/membres"
                className="inline-flex items-center gap-2 rounded-xl bg-action px-6 py-3 text-sm font-bold text-white shadow-carte-hover transition-colors hover:bg-action-hover"
              >
                Entrer dans l'application <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CARTES CHIFFRÉES ===== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TrendCard label="Membres" value={formatNumber(data.totalMembres)} unit="inscrits" hint={`${data.membresActifs} actifs`} color="var(--primaire)" />
        <TrendCard label="Capital libéré" value={<Money value={data.capital} suffix={false} size="xl" />} unit="" hint="Parts sociales" color="var(--or-fcfa)" data={[2, 3, 3, 4, 5, 5, 6, 7, 8, 9]} />
        <TrendCard label="Trésorerie" value={<Money value={data.treso} suffix={false} size="xl" />} unit="" hint="Caisses + banques" color="var(--action)" data={[5, 4, 6, 5, 7, 6, 8, 7, 9, 10]} />
        <TrendCard label="À payer aux membres" value={<Money value={data.crediteurs} suffix={false} size="xl" />} unit="" hint="Soldes créditeurs" color="#6E93B8" data={[3, 4, 4, 5, 6, 7, 7, 8, 9, 11]} />
      </div>

      {/* ===== INSIGHT PROPH3T + TUILES INTÉGRITÉ ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-or-fcfa/15 text-or-fcfa">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-texte">Insight du jour</span>
                <span className="text-xs font-semibold text-texte-2">PROPH3T · advisory</span>
              </div>
              <p className="mt-3 text-texte">
                {data.auditCount > 0
                  ? `Piste d'audit chaînée SHA-256 vérifiée sur ${formatNumber(data.auditCount)} événement${data.auditCount > 1 ? 's' : ''}. Aucune rupture de chaîne détectée. Registres append-only conformes.`
                  : 'Aucune anomalie à signaler. Enregistrez un premier apport ou une opération pour lancer la piste d\'audit.'}
              </p>
              <p className="mt-1 text-sm text-texte-2">
                Conformité SYSCOHADA révisé · analytique par section · frontière caisse/poche tracée (P3).
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/comptes"><ActionBtn primary>Consulter les comptes</ActionBtn></Link>
                <Link to="/collecte"><ActionBtn>Enregistrer un apport</ActionBtn></Link>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Tile icon={<Blocks className="h-4 w-4" />} label="Sections" value={String(data.sections.length)} sub="framework A1" />
          <Tile icon={<Users className="h-4 w-4" />} label="Membres actifs" value={String(data.membresActifs)} sub="sociétariat" />
          <Tile icon={<ShieldCheck className="h-4 w-4" />} label="Intégrité" value="SHA-256" sub="chaînée" tone="action" />
          <Tile icon={<FileCheck2 className="h-4 w-4" />} label="Événements" value={formatNumber(data.auditCount)} sub="audités" />
          <Tile icon={<MessageSquare className="h-4 w-4" />} label="SMS" value={formatNumber(data.smsCount)} sub="canal membre" />
          <Tile icon={<CalendarDays className="h-4 w-4" />} label="Période" value={new Date().getFullYear().toString()} sub="exercice" tone="primaire" />
        </div>
      </div>

      {/* ===== ACTIVITÉ + SECTIONS ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Activité récente"
            subtitle="Derniers mouvements des comptes membres"
            icon={<ArrowUpRight className="h-5 w-5" />}
            action={<Link to="/comptes" className="text-sm font-semibold text-primaire hover:underline">Tout voir</Link>}
          />
          <CardBody className="p-0">
            {data.recents.length === 0 ? (
              <EmptyState icon={<Scale className="h-8 w-8" />} title="Aucun mouvement" description="Enregistrez un apport ou une opération pour voir l'activité ici." />
            ) : (
              <ul className="divide-y divide-ligne/60">
                {data.recents.map((m: Record<string, unknown>) => {
                  const membre = m.coop_membres as { nom?: string; prenoms?: string; numero?: string } | null;
                  const credit = m.sens === 'credit';
                  return (
                    <li key={m.id as string} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${credit ? 'bg-action/10 text-action' : 'bg-alerte/10 text-alerte'}`}>
                          <ArrowUpRight className={`h-4 w-4 ${credit ? '' : 'rotate-90'}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-texte">
                            {membre ? `${membre.nom ?? ''} ${membre.prenoms ?? ''}`.trim() : 'Membre'}
                            {membre?.numero && <span className="ml-1 mono text-xs font-normal text-texte-2">{membre.numero}</span>}
                          </div>
                          <div className="text-xs text-texte-2">{natureLabel(m.nature as string)} · {formatDateTime(m.created_at as string)}</div>
                        </div>
                      </div>
                      <Money value={credit ? (m.montant_xof as number) : -(m.montant_xof as number)} colorNegative size="sm" />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Sections actives" subtitle="Framework A1" icon={<Blocks className="h-5 w-5" />} />
            <CardBody className="space-y-2">
              {data.sections.length === 0 ? (
                <p className="text-sm text-texte-2">Aucune section. <Link to="/sections" className="text-primaire hover:underline">En créer une</Link></p>
              ) : (
                data.sections.map((s: Record<string, unknown>) => (
                  <div key={s.id as string} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: (s.couleur as string) || 'var(--primaire)' }} />
                    <span className="text-sm text-texte">{s.nom as string}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="hero-atlas border-0 text-white">
            <CardBody>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-or" />
                <span className="font-semibold">PROPH3T · Assistant</span>
              </div>
              <p className="mt-2 text-sm text-white/70">
                Analyse, résume et anticipe votre activité. Strictement advisory : aucun calcul de montant,
                aucune validation, aucun droit d'écriture.
              </p>
              <div className="mt-3 text-xs text-white/50">Ollama-first · garde-fous éthiques actifs</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TrendCard({ label, value, unit, hint, color, data }: { label: string; value: React.ReactNode; unit?: string; hint: string; color: string; data?: number[] }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ligne bg-surface shadow-carte">
      <div className="p-4 pb-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-texte-2">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-texte">{value}</span>
          {unit && <span className="text-sm text-texte-2">{unit}</span>}
        </div>
        <div className="mt-0.5 text-xs text-texte-2">{hint}</div>
      </div>
      <div className="opacity-90"><Sparkline color={color} data={data} height={40} /></div>
    </div>
  );
}

function Tile({ icon, label, value, sub, tone = 'neutre' }: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: 'neutre' | 'action' | 'primaire' }) {
  const iconCls = tone === 'action' ? 'text-action bg-action/10' : tone === 'primaire' ? 'text-primaire bg-primaire/10' : 'text-texte-2 bg-surface-2';
  return (
    <div className="rounded-2xl border border-ligne bg-surface p-3.5 shadow-carte">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconCls}`}>{icon}</span>
      <div className="mt-2 text-lg font-bold leading-tight text-texte">{value}</div>
      <div className="text-xs font-semibold text-texte">{label}</div>
      <div className="text-[11px] text-texte-2">{sub}</div>
    </div>
  );
}

function ActionBtn({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${primary ? 'bg-primaire text-white hover:bg-primaire-hover' : 'border border-ligne bg-surface text-texte hover:bg-surface-2'}`}>
      {children}
    </span>
  );
}
