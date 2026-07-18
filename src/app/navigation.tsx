import {
  LayoutDashboard, Users, Coins, Wallet, Landmark, BookText, Banknote,
  Scale, Fish, Beef, Sprout, ShoppingCart, Store, Factory, Boxes,
  Tractor, PiggyBank, Building2, Receipt, Bot, MessageSquare, Blocks,
  Network, ScrollText, PieChart, HandCoins, Smartphone,
  type LucideIcon,
} from 'lucide-react';
import type { CoopRole } from '../domain/database.types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: string;
  roles?: CoopRole[]; // si absent : tout membre-staff
  phase?: 1 | 2 | 3;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/', label: 'Cockpit', icon: LayoutDashboard, module: 'M21', phase: 1 },
    ],
  },
  {
    title: 'Noyau · Registre',
    items: [
      { to: '/membres', label: 'Sociétariat', icon: Users, module: 'M1', phase: 1 },
      { to: '/capital', label: 'Capital & parts', icon: Coins, module: 'M2', phase: 1 },
      { to: '/comptes', label: 'Comptes membres', icon: Wallet, module: 'M3', phase: 1 },
      { to: '/gouvernance', label: 'Gouvernance', icon: Landmark, module: 'M4', phase: 1 },
      { to: '/comptabilite', label: 'Comptabilité', icon: BookText, module: 'M5', phase: 1, roles: ['admin', 'gerant', 'comptable', 'commissaire'] },
      { to: '/tresorerie', label: 'Trésorerie', icon: Banknote, module: 'M6', phase: 1, roles: ['admin', 'gerant', 'comptable'] },
      { to: '/recouvrement', label: 'Recouvrement', icon: HandCoins, module: 'M6', phase: 1, roles: ['admin', 'gerant', 'comptable', 'commercial'] },
    ],
  },
  {
    title: 'Chaîne de valeur',
    items: [
      { to: '/collecte', label: 'Collecte terrain', icon: Scale, module: 'M7', phase: 1 },
      { to: '/campagnes', label: 'Campagnes', icon: Sprout, module: 'M15', phase: 2 },
      { to: '/ristournes', label: 'Ristournes', icon: PieChart, module: 'M15', phase: 2 },
      { to: '/achats', label: 'Achats & appro', icon: ShoppingCart, module: 'M11', phase: 2 },
      { to: '/ventes', label: 'Ventes & commercial', icon: Store, module: 'M12', phase: 2 },
      { to: '/transformation', label: 'Transformation', icon: Factory, module: 'M13', phase: 3 },
      { to: '/stocks', label: 'Stocks', icon: Boxes, module: 'M14', phase: 2 },
      { to: '/services', label: 'Services & locations', icon: Tractor, module: 'M22', phase: 3 },
    ],
  },
  {
    title: 'Sections d\'activité',
    items: [
      { to: '/peche', label: 'Pêche & aquaculture', icon: Fish, module: 'M8', phase: 2 },
      { to: '/elevage', label: 'Élevage, aviculture, lait', icon: Beef, module: 'M9', phase: 2 },
      { to: '/agriculture', label: 'Agriculture & cueillette', icon: Sprout, module: 'M10', phase: 2 },
    ],
  },
  {
    title: 'Transversaux',
    items: [
      { to: '/canal-membre', label: 'Canal membre (SMS)', icon: MessageSquare, module: 'M16', phase: 1 },
      { to: '/decaissements', label: 'Décaissements Mobile Money', icon: Smartphone, module: 'M16', phase: 3, roles: ['admin', 'gerant', 'comptable'] },
      { to: '/budgets', label: 'Budgets & subventions', icon: PiggyBank, module: 'M18', phase: 3 },
      { to: '/immobilisations', label: 'Immobilisations', icon: Building2, module: 'M19', phase: 3 },
      { to: '/fiscalite', label: 'Fiscalité', icon: Receipt, module: 'M17', phase: 3, roles: ['admin', 'gerant', 'comptable'] },
      { to: '/reseau', label: 'Réseau Atlas Coop', icon: Network, module: 'M23', phase: 3 },
      { to: '/veille', label: 'Veille & conformité', icon: ScrollText, module: 'M24', phase: 3 },
      { to: '/proph3t', label: 'PROPH3T', icon: Bot, module: 'M20', phase: 3 },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { to: '/sections', label: 'Sections (framework A1)', icon: Blocks, module: 'A1', phase: 1, roles: ['admin', 'gerant'] },
    ],
  },
];
