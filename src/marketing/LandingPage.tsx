import {
  ArrowRight, Waves, Leaf, ShieldCheck, Smartphone, Scale, Coins, Network,
  Fish, Beef, Sprout, Factory, Tractor, CheckCircle2, Lock, Landmark,
} from 'lucide-react';
import { Button, Sparkline, Money } from '../ui';

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-fond text-texte">
      {/* Barre de navigation publique */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primaire/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="font-display text-3xl text-white">Atlas Coop</span>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/70 md:flex">
            <a href="#produit" className="hover:text-white">Produit</a>
            <a href="#modules" className="hover:text-white">Modules</a>
            <a href="#confiance" className="hover:text-white">Confiance</a>
            <a href="#reseau" className="hover:text-white">Réseau</a>
          </nav>
          <Button variant="action" onClick={onEnter}>
            Mon espace <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero-atlas relative overflow-hidden text-white">
        <div className="hero-dots absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-or-fcfa/40 bg-or-fcfa/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-or">
                <span className="h-1.5 w-1.5 rounded-full bg-or-fcfa" /> Suite Atlas Studio · OHADA
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
                L'ERP coopératif dont le centre de gravité est{' '}
                <span className="font-display text-5xl text-or sm:text-6xl">le membre</span>.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/75">
                Gestion de coopérative agropastorale multi-sections. Chaque franc, chaque kilo,
                chaque tête de bétail traçable jusqu'à un membre, un lot, une décision d'AG.
                Une machine à confiance.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="action" size="lg" onClick={onEnter}>
                  Accéder à mon espace <ArrowRight className="h-5 w-5" />
                </Button>
                <a href="#modules">
                  <Button variant="outline" size="lg" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
                    Découvrir les modules
                  </Button>
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-action" /> UEMOA / CEMAC</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-action" /> SCOOPS & COOP-CA</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-action" /> Reçu SMS à chaque pesée</span>
              </div>
            </div>

            {/* Aperçu cockpit factice */}
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-modale backdrop-blur">
                <div className="rounded-2xl bg-surface p-4 text-texte">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-texte-2">Compte membre · M-000142</span>
                    <span className="rounded-full bg-action/10 px-2 py-0.5 text-xs font-semibold text-action">Actif</span>
                  </div>
                  <div className="text-xs text-texte-2">Solde consolidé</div>
                  <Money value={487500} size="xl" />
                  <div className="mt-3"><Sparkline data={[3, 5, 4, 7, 6, 9, 8, 11, 10, 13]} color="var(--action)" /></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[['Apports', '2,4 t'], ['Parts', '12'], ['Ristourne', '~']].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-surface-2 p-2">
                        <div className="text-sm font-bold text-texte">{v}</div>
                        <div className="text-[11px] text-texte-2">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-white/10 bg-primaire-active px-3 py-2 text-xs text-white/80 shadow-lg sm:block">
                <span className="mono">SHA-256</span> · piste d'audit chaînée
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHIFFRES / PRINCIPES */}
      <section id="produit" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle eyebrow="Ce qui nous distingue" title="Le membre au pivot, pas le produit" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Feature icon={<Scale />} title="Le mouvement génère l'écriture" tone="primaire">
            Pesée, sortie de stock, livraison : jamais de saisie comptable manuelle sur les flux opérationnels (P6).
          </Feature>
          <Feature icon={<Coins />} title="Ristourne ≠ intérêt" tone="or">
            La ristourne rémunère l'usage, l'intérêt rémunère le capital. Deux mécaniques distinctes (P8).
          </Feature>
          <Feature icon={<Smartphone />} title="Canal membre sans app" tone="action">
            SMS/USSD d'abord. Le membre vérifie sa ristourne sur son téléphone, reçu à chaque pesée.
          </Feature>
          <Feature icon={<ShieldCheck />} title="Aucun chiffre orphelin" tone="primaire">
            Tout montant est cliquable jusqu'à sa pièce d'origine. Immuabilité par audit chaîné SHA-256 (P1).
          </Feature>
          <Feature icon={<Waves />} title="Multi-sections analytique" tone="action">
            Comptabilité analytique native par section dès la première écriture, prix de cession internes (P7).
          </Feature>
          <Feature icon={<Leaf />} title="Égalité de traitement" tone="or">
            Membre fondateur et membre entrant sont le même objet. Aucun privilège codé en dur (P2).
          </Feature>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="border-y border-ligne bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionTitle eyebrow="Framework A1" title="Des sections activables, sans refonte du noyau" />
          <p className="mx-auto mt-3 max-w-2xl text-center text-texte-2">
            Toute nouvelle activité se déclare par paramétrage. Pêche, élevage, agriculture ne sont que
            les premières instances d'une architecture générique.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { icon: <Fish />, label: 'Pêche & aquaculture' },
              { icon: <Beef />, label: 'Élevage, aviculture, lait' },
              { icon: <Sprout />, label: 'Agriculture & cueillette' },
              { icon: <Factory />, label: 'Transformation' },
              { icon: <Tractor />, label: 'Services & locations' },
              { icon: <Landmark />, label: 'Gouvernance OHADA' },
              { icon: <Coins />, label: 'Capital & parts' },
              { icon: <Scale />, label: 'Collecte terrain' },
              { icon: <Network />, label: 'Réseau inter-coops' },
              { icon: <ShieldCheck />, label: 'Veille & conformité' },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2 rounded-2xl border border-ligne bg-surface-2 p-5 text-center transition hover:shadow-carte">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primaire/10 text-primaire">{m.icon}</span>
                <span className="text-sm font-semibold text-texte">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIANCE */}
      <section id="confiance" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Confiance & conformité" title="Construite pour l'audit, pas ajustée après coup" align="left" />
            <ul className="mt-6 space-y-4">
              <Trust icon={<Lock />} title="RLS multitenant par coopérative">
                Isolation stricte des données par <span className="mono text-sm">cooperative_id</span> sur toutes les tables.
              </Trust>
              <Trust icon={<ShieldCheck />} title="Journal d'audit chaîné SHA-256">
                Chaque pesée, écriture, vote et facture inclut le hash du précédent. Registres append-only.
              </Trust>
              <Trust icon={<Landmark />} title="SYSCOHADA révisé & OHADA">
                Plan comptable coopératif, analytique par section, affectation du résultat conforme.
              </Trust>
            </ul>
          </div>
          <div className="rounded-3xl border border-ligne bg-surface p-6 shadow-carte">
            <div className="grid grid-cols-2 gap-4">
              <MiniStat value="100 %" label="Conformité SYSCOHADA" tone="action" />
              <MiniStat value="SHA-256" label="Piste d'audit chaînée" tone="primaire" />
              <MiniStat value="RLS" label="Isolation multitenant" tone="primaire" />
              <MiniStat value="Offline" label="Collecte terrain" tone="action" />
            </div>
          </div>
        </div>
      </section>

      {/* RESEAU */}
      <section id="reseau" className="hero-atlas relative overflow-hidden text-white">
        <div className="hero-dots absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <Network className="mx-auto h-10 w-10 text-or" />
          <h2 className="mt-4 text-3xl font-bold">Le Réseau Atlas Coop</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/75">
            Chaque nouvelle coopérative rend le réseau plus utile à toutes les autres : benchmarks anonymes
            par segment, prix de marché observés, alertes régionales. Anonymisation stricte, seuil k≥5,
            consentement voté en organe. L'effet réseau du produit.
          </p>
          <div className="mt-8">
            <Button variant="action" size="lg" onClick={onEnter}>
              Rejoindre mon espace <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ligne bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-texte-2 sm:flex-row sm:px-6">
          <span className="font-display text-2xl text-primaire">Atlas Coop</span>
          <span>Suite Atlas Studio · UEMOA / CEMAC · Conformité OHADA</span>
          <button onClick={onEnter} className="font-semibold text-primaire hover:underline">Se connecter</button>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, align = 'center' }: { eyebrow: string; title: string; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <div className="text-xs font-bold uppercase tracking-widest text-action">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-bold text-texte">{title}</h2>
    </div>
  );
}

function Feature({ icon, title, children, tone }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone: 'primaire' | 'action' | 'or' }) {
  const toneCls = { primaire: 'bg-primaire/10 text-primaire', action: 'bg-action/10 text-action', or: 'bg-or-fcfa/10 text-or-fcfa' }[tone];
  return (
    <div className="rounded-2xl border border-ligne bg-surface p-6 shadow-carte transition hover:shadow-carte-hover">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${toneCls}`}>{icon}</span>
      <h3 className="mt-4 font-bold text-texte">{title}</h3>
      <p className="mt-2 text-sm text-texte-2">{children}</p>
    </div>
  );
}

function Trust({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-action/10 text-action">{icon}</span>
      <div>
        <div className="font-semibold text-texte">{title}</div>
        <p className="text-sm text-texte-2">{children}</p>
      </div>
    </li>
  );
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone: 'primaire' | 'action' }) {
  const c = tone === 'action' ? 'text-action' : 'text-primaire';
  return (
    <div className="rounded-2xl bg-surface-2 p-4 text-center">
      <div className={`text-2xl font-bold ${c}`}>{value}</div>
      <div className="mt-1 text-xs text-texte-2">{label}</div>
    </div>
  );
}
