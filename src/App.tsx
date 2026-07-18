import { lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useCoop } from './auth/CooperativeProvider';
import { LoginPage } from './auth/LoginPage';
import { LandingPage } from './marketing/LandingPage';
import { Onboarding } from './app/Onboarding';
import { AppShell } from './app/AppShell';
import { Spinner } from './ui';
import { ModulePlaceholder } from './modules/ModulePlaceholder';

// Pages de modules chargées à la demande (code-splitting par route)
const lz = <T extends Record<string, React.ComponentType>>(
  factory: () => Promise<T>, key: keyof T,
) => lazy(() => factory().then((m) => ({ default: m[key] })));

const Dashboard = lz(() => import('./modules/dashboard/Dashboard'), 'Dashboard');
const MembresPage = lz(() => import('./modules/membres/MembresPage'), 'MembresPage');
const MembreDetail = lz(() => import('./modules/membres/MembreDetail'), 'MembreDetail');
const SectionsPage = lz(() => import('./modules/sections/SectionsPage'), 'SectionsPage');
const CollectePage = lz(() => import('./modules/collecte/CollectePage'), 'CollectePage');
const ComptesPage = lz(() => import('./modules/comptes/ComptesPage'), 'ComptesPage');
const CapitalPage = lz(() => import('./modules/capital/CapitalPage'), 'CapitalPage');
const GouvernancePage = lz(() => import('./modules/gouvernance/GouvernancePage'), 'GouvernancePage');
const TresoreriePage = lz(() => import('./modules/tresorerie/TresoreriePage'), 'TresoreriePage');
const ComptabilitePage = lz(() => import('./modules/comptabilite/ComptabilitePage'), 'ComptabilitePage');
const CanalMembrePage = lz(() => import('./modules/canal/CanalMembrePage'), 'CanalMembrePage');
const CampagnesPage = lz(() => import('./modules/campagnes/CampagnesPage'), 'CampagnesPage');
const VeillePage = lz(() => import('./modules/veille/VeillePage'), 'VeillePage');
const StocksPage = lz(() => import('./modules/stocks/StocksPage'), 'StocksPage');
const AchatsPage = lz(() => import('./modules/achats/AchatsPage'), 'AchatsPage');
const VentesPage = lz(() => import('./modules/ventes/VentesPage'), 'VentesPage');
const RistournesPage = lz(() => import('./modules/ristournes/RistournesPage'), 'RistournesPage');
const AgriculturePage = lz(() => import('./modules/agriculture/AgriculturePage'), 'AgriculturePage');
const ElevagePage = lz(() => import('./modules/elevage/ElevagePage'), 'ElevagePage');
const PechePage = lz(() => import('./modules/peche/PechePage'), 'PechePage');
const TransformationPage = lz(() => import('./modules/transformation/TransformationPage'), 'TransformationPage');
const ImmobilisationsPage = lz(() => import('./modules/immobilisations/ImmobilisationsPage'), 'ImmobilisationsPage');
const ServicesPage = lz(() => import('./modules/services/ServicesPage'), 'ServicesPage');
const BudgetsPage = lz(() => import('./modules/budgets/BudgetsPage'), 'BudgetsPage');
const ReseauPage = lz(() => import('./modules/reseau/ReseauPage'), 'ReseauPage');
const FiscalitePage = lz(() => import('./modules/fiscalite/FiscalitePage'), 'FiscalitePage');
const RecouvrementPage = lz(() => import('./modules/recouvrement/RecouvrementPage'), 'RecouvrementPage');
const DecaissementsPage = lz(() => import('./modules/decaissements/DecaissementsPage'), 'DecaissementsPage');

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-fond">
      <Spinner label="Chargement…" />
    </div>
  );
}

/** Espace public (non authentifié) : landing + connexion. */
function PublicApp() {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/" element={<LandingPage onEnter={() => navigate('/connexion')} />} />
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const { cooperatives, loading: coopLoading } = useCoop();

  if (authLoading) return <FullScreenLoader />;
  if (!session) return <PublicApp />;
  if (coopLoading) return <FullScreenLoader />;
  if (cooperatives.length === 0) return <Onboarding />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/membres" element={<MembresPage />} />
        <Route path="/membres/:id" element={<MembreDetail />} />
        <Route path="/sections" element={<SectionsPage />} />
        <Route path="/collecte" element={<CollectePage />} />
        <Route path="/comptes" element={<ComptesPage />} />
        <Route path="/comptes/:membreId" element={<MembreDetail />} />
        <Route path="/capital" element={<CapitalPage />} />
        <Route path="/gouvernance" element={<GouvernancePage />} />
        <Route path="/tresorerie" element={<TresoreriePage />} />
        <Route path="/recouvrement" element={<RecouvrementPage />} />
        <Route path="/comptabilite" element={<ComptabilitePage />} />
        <Route path="/canal-membre" element={<CanalMembrePage />} />
        <Route path="/decaissements" element={<DecaissementsPage />} />
        <Route path="/campagnes" element={<CampagnesPage />} />
        <Route path="/ristournes" element={<RistournesPage />} />

        {/* Modules Phase 2/3 — socle données prêt (framework A1) */}
        <Route path="/achats" element={<AchatsPage />} />
        <Route path="/ventes" element={<VentesPage />} />
        <Route path="/transformation" element={<TransformationPage />} />
        <Route path="/stocks" element={<StocksPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/peche" element={<PechePage />} />
        <Route path="/elevage" element={<ElevagePage />} />
        <Route path="/agriculture" element={<AgriculturePage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/immobilisations" element={<ImmobilisationsPage />} />
        <Route path="/fiscalite" element={<FiscalitePage />} />
        <Route path="/proph3t" element={<ModulePlaceholder module="M20" phase={3} title="PROPH3T (advisory)" description="Alertes, prévisions, résumés — jamais de calcul de montant ni de validation." points={['Anomalies de pesée, rendements hors seuil', 'Prévisions de collecte & trésorerie', 'Résumés pré-AG en langage clair']} />} />
        <Route path="/reseau" element={<ReseauPage />} />
        <Route path="/veille" element={<VeillePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
