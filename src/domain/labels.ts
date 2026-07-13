import type { MembreStatut, CategorieMembre, ModeProduction, CoopRole } from './database.types';

export const STATUT_MEMBRE: Record<MembreStatut, { label: string; tone: 'neutre' | 'action' | 'alerte' | 'primaire' | 'or' }> = {
  candidat: { label: 'Candidat', tone: 'neutre' },
  probatoire: { label: 'Probatoire', tone: 'or' },
  actif: { label: 'Actif', tone: 'action' },
  suspendu: { label: 'Suspendu', tone: 'alerte' },
  retire: { label: 'Retiré', tone: 'neutre' },
  exclu: { label: 'Exclu', tone: 'alerte' },
  decede: { label: 'Décédé', tone: 'neutre' },
};

export const CATEGORIE_MEMBRE: Record<CategorieMembre, string> = {
  usager_producteur: 'Producteur',
  usager_consommateur: 'Consommateur',
  apporteur_capitaux: 'Apporteur de capitaux',
};

export const MODE_PRODUCTION: Record<ModeProduction, string> = {
  apport_ponctuel: 'Apport ponctuel (pesée)',
  production_recurrente: 'Production récurrente (quotidienne)',
  cycle_elevage: 'Cycle d\'élevage',
  service: 'Service / prestation',
};

export const ROLE_LABEL: Record<CoopRole, string> = {
  admin: 'Administrateur',
  gerant: 'Gérant',
  comptable: 'Comptable',
  peseur: 'Peseur / collecteur',
  magasinier: 'Magasinier',
  chef_section: 'Chef de section',
  commercial: 'Commercial',
  president: 'Président',
  commissaire: 'Commissaire aux comptes',
  membre: 'Membre',
};

/** Natures de mouvement du compte membre → libellés lisibles. */
export const NATURE_MOUVEMENT: Record<string, string> = {
  apport: 'Apport de production',
  ristourne: 'Ristourne d\'activité',
  prime_qualite: 'Prime qualité',
  interet_parts: 'Intérêt aux parts',
  remboursement: 'Remboursement',
  depot: 'Dépôt',
  avance_intrant: 'Avance sur intrants',
  credit_campagne: 'Crédit de campagne',
  achat_credit: 'Achat à crédit',
  prelevement: 'Prélèvement personnel',
  cotisation: 'Cotisation',
  complement_prix: 'Complément de prix',
  annulation_apport: 'Annulation d\'apport',
};

export const natureLabel = (n: string): string =>
  NATURE_MOUVEMENT[n] ?? n.replace(/_/g, ' ');
