/**
 * Plan comptable SYSCOHADA révisé — adapté aux coopératives (réf. modèle Atlas FnA).
 * type : actif | passif | charge | produit | hao ; normal_balance : debit | credit.
 */
export interface CompteSyscohada { numero: string; libelle: string; classe: number; type: string; normal_balance: 'debit' | 'credit' }

export const PLAN_COOP: CompteSyscohada[] = [
  // ---- Classe 1 : Ressources durables (passif) ----
  { numero: '101', libelle: 'Parts sociales', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '1013', libelle: 'Parts sociales appelées, versées', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '106', libelle: 'Réserves', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '1061', libelle: 'Réserve légale (OHADA)', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '1068', libelle: 'Autres réserves (fonds de développement)', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '110', libelle: 'Report à nouveau', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '120', libelle: 'Résultat net de l\'exercice', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '130', libelle: 'Résultat en instance d\'affectation', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '131', libelle: 'Subventions d\'investissement', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '162', libelle: 'Emprunts et dettes établissements de crédit', classe: 1, type: 'passif', normal_balance: 'credit' },
  { numero: '166', libelle: 'Comptes courants d\'associés bloqués (dépôts membres)', classe: 1, type: 'passif', normal_balance: 'credit' },
  // ---- Classe 2 : Actif immobilisé ----
  { numero: '215', libelle: 'Installations techniques, agencements', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '231', libelle: 'Bâtiments', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '2411', libelle: 'Matériel agricole (tracteurs, motoculteurs)', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '2412', libelle: 'Matériel et outillage', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '2441', libelle: 'Matériel et mobilier de bureau', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '245', libelle: 'Matériel de transport', classe: 2, type: 'actif', normal_balance: 'debit' },
  { numero: '2831', libelle: 'Amortissements des bâtiments', classe: 2, type: 'actif', normal_balance: 'credit' },
  { numero: '2841', libelle: 'Amortissements du matériel', classe: 2, type: 'actif', normal_balance: 'credit' },
  { numero: '2845', libelle: 'Amortissements du matériel de transport', classe: 2, type: 'actif', normal_balance: 'credit' },
  // ---- Classe 3 : Stocks ----
  { numero: '31', libelle: 'Marchandises (intrants revendus)', classe: 3, type: 'actif', normal_balance: 'debit' },
  { numero: '32', libelle: 'Matières premières (apports des membres)', classe: 3, type: 'actif', normal_balance: 'debit' },
  { numero: '33', libelle: 'Autres approvisionnements (provende, emballages)', classe: 3, type: 'actif', normal_balance: 'debit' },
  { numero: '36', libelle: 'Produits finis (transformation)', classe: 3, type: 'actif', normal_balance: 'debit' },
  // ---- Classe 4 : Tiers ----
  { numero: '401', libelle: 'Fournisseurs', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '409', libelle: 'Fournisseurs débiteurs (avances)', classe: 4, type: 'actif', normal_balance: 'debit' },
  { numero: '411', libelle: 'Clients', classe: 4, type: 'actif', normal_balance: 'debit' },
  { numero: '419', libelle: 'Clients créditeurs (avances reçues)', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '4431', libelle: 'TVA facturée (collectée)', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '4452', libelle: 'TVA récupérable (déductible)', classe: 4, type: 'actif', normal_balance: 'debit' },
  { numero: '447', libelle: 'État, impôts et taxes', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '462', libelle: 'Membres, comptes courants (à payer)', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '4621', libelle: 'Ristournes à payer aux membres', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '4634', libelle: 'Intérêts aux parts à payer', classe: 4, type: 'passif', normal_balance: 'credit' },
  { numero: '463', libelle: 'Membres, avances et crédits de campagne', classe: 4, type: 'actif', normal_balance: 'debit' },
  { numero: '47', libelle: 'Débiteurs et créditeurs divers', classe: 4, type: 'actif', normal_balance: 'debit' },
  // ---- Classe 5 : Trésorerie ----
  { numero: '521', libelle: 'Banques locales', classe: 5, type: 'actif', normal_balance: 'debit' },
  { numero: '531', libelle: 'Mobile Money (Orange, MTN, Wave)', classe: 5, type: 'actif', normal_balance: 'debit' },
  { numero: '571', libelle: 'Caisse', classe: 5, type: 'actif', normal_balance: 'debit' },
  { numero: '585', libelle: 'Virements internes (caisses villages)', classe: 5, type: 'actif', normal_balance: 'debit' },
  // ---- Classe 6 : Charges ----
  { numero: '601', libelle: 'Achats de matières premières (apports)', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '602', libelle: 'Achats matières consommables (intrants, provende)', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '605', libelle: 'Autres achats (carburant, glace)', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '608', libelle: 'Achats d\'emballages', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '61', libelle: 'Transports', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '62', libelle: 'Services extérieurs A', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '63', libelle: 'Services extérieurs B', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '64', libelle: 'Impôts et taxes', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '66', libelle: 'Charges de personnel', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '67', libelle: 'Frais financiers', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '681', libelle: 'Dotations aux amortissements', classe: 6, type: 'charge', normal_balance: 'debit' },
  { numero: '691', libelle: 'Intérêts aux parts (répartition)', classe: 6, type: 'charge', normal_balance: 'debit' },
  // ---- Classe 7 : Produits ----
  { numero: '701', libelle: 'Ventes de produits agricoles/halieutiques', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '702', libelle: 'Ventes de produits transformés', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '706', libelle: 'Services vendus (locations, prestations)', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '707', libelle: 'Ventes de marchandises (intrants)', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '71', libelle: 'Subventions d\'exploitation', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '75', libelle: 'Autres produits', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '77', libelle: 'Revenus financiers', classe: 7, type: 'produit', normal_balance: 'credit' },
  { numero: '781', libelle: 'Reprises d\'amortissements', classe: 7, type: 'produit', normal_balance: 'credit' },
  // ---- Classe 8 : HAO ----
  { numero: '82', libelle: 'Produits HAO', classe: 8, type: 'hao', normal_balance: 'credit' },
  { numero: '83', libelle: 'Charges HAO', classe: 8, type: 'hao', normal_balance: 'debit' },
];

// Journaux SYSCOHADA (alignés Atlas FnA) + spécifiques coop (MM, PA).
export const JOURNAUX_DEFAUT = [
  { code: 'AN', libelle: 'À-nouveaux (reprise d\'ouverture)', type: 'anouveaux' },
  { code: 'VE', libelle: 'Ventes', type: 'vente' },
  { code: 'AC', libelle: 'Achats', type: 'achat' },
  { code: 'BQ', libelle: 'Banque', type: 'tresorerie' },
  { code: 'CA', libelle: 'Caisse', type: 'tresorerie' },
  { code: 'MM', libelle: 'Mobile Money', type: 'tresorerie' },
  { code: 'PA', libelle: 'Paie de campagne', type: 'paie' },
  { code: 'OD', libelle: 'Opérations diverses', type: 'od' },
];
