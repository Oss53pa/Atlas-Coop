/**
 * database.types.ts — Types Supabase focalisés sur les tables `coop_*` (Atlas Coop).
 * Le projet héberge d'autres produits Atlas Studio ; on ne type que notre périmètre.
 * Les colonnes `_xof` (bigint) sont exposées comme `number` (les montants d'une coop
 * restent < 2^53) et normalisées via Money.ts au besoin.
 */

type Ins<T> = Partial<T> & { cooperative_id?: string };
type Upd<T> = Partial<T>;

export interface CoopCooperative {
  id: string;
  nom: string;
  sigle: string | null;
  forme_juridique: 'SCOOPS' | 'COOP_CA';
  pays: string;
  devise: string;
  ville: string | null;
  agrement_numero: string | null;
  agrement_date: string | null;
  ninea_rccm: string | null;
  telephone: string | null;
  email: string | null;
  logo_url: string | null;
  valeur_part_xof: number;
  part_min_membre: number;
  parametres: Record<string, unknown>;
  epargne_activee: boolean;
  actif: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type CoopRole =
  | 'admin' | 'gerant' | 'comptable' | 'peseur' | 'magasinier'
  | 'chef_section' | 'commercial' | 'president' | 'commissaire' | 'membre';

export interface CoopUserRole {
  id: string;
  cooperative_id: string;
  user_id: string;
  role: CoopRole;
  membre_id: string | null;
  actif: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type ModeProduction = 'apport_ponctuel' | 'production_recurrente' | 'cycle_elevage' | 'service';
export type UniteBase = 'g' | 'ml' | 'u' | 'm2';

export interface CoopSection {
  id: string;
  cooperative_id: string;
  code: string;
  nom: string;
  mode_production: ModeProduction;
  unite_base: UniteBase;
  unite_affichage: string;
  couleur: string | null;
  icone: string | null;
  ordre: number;
  referentiels: Record<string, unknown>;
  parametres: Record<string, unknown>;
  actif: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type MembreStatut =
  | 'candidat' | 'probatoire' | 'actif' | 'suspendu' | 'retire' | 'exclu' | 'decede';
export type CategorieMembre = 'usager_producteur' | 'usager_consommateur' | 'apporteur_capitaux';

export interface CoopMembre {
  id: string;
  cooperative_id: string;
  numero: string;
  type_membre: 'physique' | 'morale';
  nom: string;
  prenoms: string | null;
  raison_sociale: string | null;
  sexe: string | null;
  date_naissance: string | null;
  piece_type: string | null;
  piece_numero: string | null;
  telephone: string | null;
  telephone2: string | null;
  village: string | null;
  localite: string | null;
  photo_url: string | null;
  qr_code: string | null;
  statut: MembreStatut;
  date_entree: string | null;
  date_probatoire_fin: string | null;
  parrain_membre_id: string | null;
  lien_parente: string | null;
  plafond_credit_xof: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface CoopMembreCategorie {
  id: string; cooperative_id: string; membre_id: string;
  categorie: CategorieMembre; created_at: string; created_by: string | null;
}
export interface CoopMembreSection {
  id: string; cooperative_id: string; membre_id: string; section_id: string;
  date_adhesion: string; created_at: string; created_by: string | null;
}
export interface CoopMembreStatutHist {
  id: string; cooperative_id: string; membre_id: string; statut: MembreStatut;
  motif: string | null; decision_ref: string | null; date_effet: string; created_at: string; created_by: string | null;
}
export interface CoopBeneficiaire {
  id: string; cooperative_id: string; membre_id: string; nom: string; lien: string | null;
  telephone: string | null; quote_part_bp: number; ordre: number;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopDemandeAdhesion {
  id: string; cooperative_id: string; nom: string; prenoms: string | null; telephone: string | null;
  village: string | null; sections: unknown[]; categories: unknown[]; parrain_membre_id: string | null;
  pieces: unknown[]; statut: string; decision_ref: string | null; membre_id: string | null;
  created_at: string; created_by: string | null; updated_at: string;
}

export type Sens = 'credit' | 'debit';

export interface CoopCompteMembre {
  id: string; cooperative_id: string; membre_id: string; solde_xof: number;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopMouvement {
  id: string; cooperative_id: string; membre_id: string; compte_id: string | null;
  section_id: string | null; campagne_id: string | null; sens: Sens; nature: string;
  montant_xof: number; quantite_base: number | null; unite_base: UniteBase | null;
  piece_type: string | null; piece_id: string | null; piece_ref: string | null;
  libelle: string | null; contrepasse_de: string | null; created_at: string; created_by: string | null;
}
export interface CoopAvance {
  id: string; cooperative_id: string; membre_id: string; type: string; montant_xof: number;
  motif: string | null; mouvement_id: string | null; rembourse_xof: number; statut: string;
  date_avance: string; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopPlafondCredit {
  id: string; cooperative_id: string; membre_id: string; plafond_xof: number;
  decision_ref: string | null; date_effet: string; actif: boolean; created_at: string; created_by: string | null;
}
export interface CoopGarantie {
  id: string; cooperative_id: string; membre_id: string; type: string; montant_couvert_xof: number;
  description: string | null; caution_membre_id: string | null; accord_sms: boolean; accord_date: string | null;
  statut: string; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopPartsSouscription {
  id: string; cooperative_id: string; membre_id: string; nombre: number; valeur_nominale_xof: number;
  echeancier: unknown[]; motif: string | null; date_souscription: string; created_at: string; created_by: string | null;
}
export interface CoopPartsLiberation {
  id: string; cooperative_id: string; membre_id: string; souscription_id: string | null; nombre: number;
  montant_xof: number; mode: string; nature_details: unknown; date_liberation: string; piece_ref: string | null;
  created_at: string; created_by: string | null;
}
export interface CoopInteretParts {
  id: string; cooperative_id: string; exercice: string; membre_id: string | null; taux_bp: number;
  base_parts: number | null; montant_xof: number; decision_ref: string | null; statut: string;
  date_versement: string | null; created_at: string; created_by: string | null;
}
export interface CoopDepotMembre {
  id: string; cooperative_id: string; membre_id: string; type: string; sens: Sens; montant_xof: number;
  taux_bp: number; echeance: string | null; convention_ref: string | null; date_operation: string;
  created_at: string; created_by: string | null;
}

export interface CoopOrgane {
  id: string; cooperative_id: string; code: string; nom: string; type: string; quorum_bp: number;
  actif: boolean; created_at: string; created_by: string | null;
}
export interface CoopMandat {
  id: string; cooperative_id: string; organe_id: string; membre_id: string; fonction: string;
  date_debut: string; date_fin: string | null; statut: string; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopAssemblee {
  id: string; cooperative_id: string; type: string; organe_id: string | null; titre: string;
  date_prevue: string | null; lieu: string | null; ordre_du_jour: unknown[]; quorum_requis_bp: number;
  statut: string; pv_texte: string | null; pv_hash: string | null; pv_clos_le: string | null;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopResolution {
  id: string; cooperative_id: string; assemblee_id: string; numero: number; intitule: string;
  texte: string | null; type_majorite: string; resultat: string | null; voix_pour: number; voix_contre: number;
  voix_abstention: number; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopVote {
  id: string; cooperative_id: string; resolution_id: string; membre_id: string; choix: string;
  poids_bp: number; created_at: string; created_by: string | null;
}
export interface CoopDecisionOrgane {
  id: string; cooperative_id: string; reference: string; organe_id: string | null; assemblee_id: string | null;
  type: string; objet: string | null; valeur: Record<string, unknown>; date_decision: string;
  created_at: string; created_by: string | null;
}

export interface CoopExercice {
  id: string; cooperative_id: string; code: string; date_debut: string; date_fin: string; statut: string;
  cloture_le: string | null; affectation: unknown; created_at: string; created_by: string | null;
}
export interface CoopCompte {
  id: string; cooperative_id: string; numero: string; libelle: string; classe: number | null; type: string | null;
  parent: string | null; actif: boolean; created_at: string; created_by: string | null;
}
export interface CoopJournal {
  id: string; cooperative_id: string; code: string; libelle: string; type: string | null;
  created_at: string; created_by: string | null;
}
export interface CoopEcriture {
  id: string; cooperative_id: string; exercice_id: string | null; journal_id: string | null; numero: string | null;
  date_ecriture: string; libelle: string | null; piece_ref: string | null; source_type: string | null;
  source_id: string | null; equilibree: boolean; created_at: string; created_by: string | null;
}
export interface CoopLigneEcriture {
  id: string; cooperative_id: string; ecriture_id: string; compte_numero: string; libelle: string | null;
  debit_xof: number; credit_xof: number; section_id: string | null; campagne_id: string | null;
  projet_id: string | null; tiers_ref: string | null; created_at: string; created_by: string | null;
}

export interface CoopProduit {
  id: string; cooperative_id: string; section_id: string | null; code: string; nom: string; type: string;
  unite_base: UniteBase; unite_affichage: string; calibres: unknown[]; perissable: boolean; actif: boolean;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopCampagne {
  id: string; cooperative_id: string; section_id: string | null; code: string; nom: string; date_debut: string;
  date_fin: string | null; statut: string; decision_ref: string | null; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopPrixCampagne {
  id: string; cooperative_id: string; campagne_id: string; produit_id: string | null; calibre: string | null;
  prix_planche_xof: number; prix_definitif_xof: number | null; decision_ref: string | null;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopApport {
  id: string; cooperative_id: string; campagne_id: string | null; section_id: string | null; membre_id: string;
  produit_id: string | null; quantite_base: number; unite_base: UniteBase; qualite: string | null; calibre: string | null;
  prix_unitaire_xof: number; montant_xof: number; parcelle_id: string | null; zone_collecte_id: string | null;
  equipage_id: string | null; debarquement_id: string | null; gps: unknown; photo_url: string | null;
  signature_url: string | null; source: string; peseur_id: string | null; device_ts: string | null;
  annulation_de: string | null; created_at: string; created_by: string | null;
}
export interface CoopEquipage {
  id: string; cooperative_id: string; section_id: string | null; nom: string; membres: unknown[]; actif: boolean;
  created_at: string; created_by: string | null; updated_at: string;
}

export interface CoopCaisse {
  id: string; cooperative_id: string; code: string; libelle: string; type: string; solde_xof: number;
  responsable_id: string | null; actif: boolean; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopCompteBancaire {
  id: string; cooperative_id: string; banque: string; libelle: string | null; numero: string | null; devise: string;
  solde_xof: number; actif: boolean; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopOperationTresorerie {
  id: string; cooperative_id: string; caisse_id: string | null; compte_bancaire_id: string | null; sens: Sens;
  montant_xof: number; nature: string; mode: string; membre_id: string | null; tiers_ref: string | null;
  piece_ref: string | null; source_type: string | null; source_id: string | null; rapproche: boolean;
  date_operation: string; created_at: string; created_by: string | null;
}
export interface CoopNotificationSms {
  id: string; cooperative_id: string; membre_id: string | null; telephone: string; type: string; message: string;
  langue: string; statut: string; reference_externe: string | null; source_type: string | null; source_id: string | null;
  created_at: string; created_by: string | null; sent_at: string | null;
}
export interface CoopAuditLog {
  id: number; cooperative_id: string; table_name: string; row_id: string | null; action: string;
  payload: Record<string, unknown>; prev_hash: string | null; hash: string; created_by: string | null; created_at: string;
}

// ---- Commerce (M11 / M12 / M14) ----
export interface CoopMagasin {
  id: string; cooperative_id: string; code: string; nom: string; type: string; actif: boolean;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopStock {
  id: string; cooperative_id: string; magasin_id: string; produit_id: string; lot: string; etat: string;
  quantite_base: number; valeur_xof: number; dlc: string | null; updated_at: string; created_at: string;
}
export interface CoopFournisseur {
  id: string; cooperative_id: string; code: string | null; nom: string; contact: string | null; telephone: string | null;
  rib_mobile_money: string | null; conditions_paiement: string | null; actif: boolean;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopFactureFournisseur {
  id: string; cooperative_id: string; fournisseur_id: string; numero: string | null; date_facture: string;
  montant_ht_xof: number; montant_tva_xof: number; montant_ttc_xof: number; echeance: string | null;
  regle_xof: number; statut: string; created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopClient {
  id: string; cooperative_id: string; code: string | null; nom: string; type: string; membre_id: string | null;
  telephone: string | null; plafond_credit_xof: number; actif: boolean;
  created_at: string; created_by: string | null; updated_at: string;
}
export interface CoopTarif {
  id: string; cooperative_id: string; produit_id: string; canal: string; prix_xof: number; actif: boolean;
  created_at: string; created_by: string | null;
}
export interface CoopVente {
  id: string; cooperative_id: string; numero: string | null; magasin_id: string | null; client_id: string | null;
  membre_id: string | null; canal: string; mode_paiement: string; montant_ht_xof: number; montant_tva_xof: number;
  montant_ttc_xof: number; regle_xof: number; statut: string; date_vente: string; created_at: string; created_by: string | null;
}

/** Mapping minimal pour le client typé Supabase. */
export interface Database {
  public: {
    Tables: {
      coop_cooperatives: { Row: CoopCooperative; Insert: Ins<CoopCooperative>; Update: Upd<CoopCooperative> };
      coop_user_roles: { Row: CoopUserRole; Insert: Ins<CoopUserRole>; Update: Upd<CoopUserRole> };
      coop_sections: { Row: CoopSection; Insert: Ins<CoopSection>; Update: Upd<CoopSection> };
      coop_membres: { Row: CoopMembre; Insert: Ins<CoopMembre>; Update: Upd<CoopMembre> };
      coop_membres_categories: { Row: CoopMembreCategorie; Insert: Ins<CoopMembreCategorie>; Update: Upd<CoopMembreCategorie> };
      coop_membres_sections: { Row: CoopMembreSection; Insert: Ins<CoopMembreSection>; Update: Upd<CoopMembreSection> };
      coop_membres_statut_historique: { Row: CoopMembreStatutHist; Insert: Ins<CoopMembreStatutHist>; Update: Upd<CoopMembreStatutHist> };
      coop_beneficiaires: { Row: CoopBeneficiaire; Insert: Ins<CoopBeneficiaire>; Update: Upd<CoopBeneficiaire> };
      coop_demandes_adhesion: { Row: CoopDemandeAdhesion; Insert: Ins<CoopDemandeAdhesion>; Update: Upd<CoopDemandeAdhesion> };
      coop_comptes_membres: { Row: CoopCompteMembre; Insert: Ins<CoopCompteMembre>; Update: Upd<CoopCompteMembre> };
      coop_mouvements_compte_membre: { Row: CoopMouvement; Insert: Ins<CoopMouvement>; Update: Upd<CoopMouvement> };
      coop_avances: { Row: CoopAvance; Insert: Ins<CoopAvance>; Update: Upd<CoopAvance> };
      coop_plafonds_credit_membre: { Row: CoopPlafondCredit; Insert: Ins<CoopPlafondCredit>; Update: Upd<CoopPlafondCredit> };
      coop_garanties: { Row: CoopGarantie; Insert: Ins<CoopGarantie>; Update: Upd<CoopGarantie> };
      coop_parts_souscriptions: { Row: CoopPartsSouscription; Insert: Ins<CoopPartsSouscription>; Update: Upd<CoopPartsSouscription> };
      coop_parts_liberations: { Row: CoopPartsLiberation; Insert: Ins<CoopPartsLiberation>; Update: Upd<CoopPartsLiberation> };
      coop_interets_parts: { Row: CoopInteretParts; Insert: Ins<CoopInteretParts>; Update: Upd<CoopInteretParts> };
      coop_depots_membres: { Row: CoopDepotMembre; Insert: Ins<CoopDepotMembre>; Update: Upd<CoopDepotMembre> };
      coop_organes: { Row: CoopOrgane; Insert: Ins<CoopOrgane>; Update: Upd<CoopOrgane> };
      coop_mandats: { Row: CoopMandat; Insert: Ins<CoopMandat>; Update: Upd<CoopMandat> };
      coop_assemblees: { Row: CoopAssemblee; Insert: Ins<CoopAssemblee>; Update: Upd<CoopAssemblee> };
      coop_resolutions: { Row: CoopResolution; Insert: Ins<CoopResolution>; Update: Upd<CoopResolution> };
      coop_votes: { Row: CoopVote; Insert: Ins<CoopVote>; Update: Upd<CoopVote> };
      coop_decisions_organes: { Row: CoopDecisionOrgane; Insert: Ins<CoopDecisionOrgane>; Update: Upd<CoopDecisionOrgane> };
      coop_exercices: { Row: CoopExercice; Insert: Ins<CoopExercice>; Update: Upd<CoopExercice> };
      coop_plan_comptable: { Row: CoopCompte; Insert: Ins<CoopCompte>; Update: Upd<CoopCompte> };
      coop_journaux: { Row: CoopJournal; Insert: Ins<CoopJournal>; Update: Upd<CoopJournal> };
      coop_ecritures: { Row: CoopEcriture; Insert: Ins<CoopEcriture>; Update: Upd<CoopEcriture> };
      coop_lignes_ecritures: { Row: CoopLigneEcriture; Insert: Ins<CoopLigneEcriture>; Update: Upd<CoopLigneEcriture> };
      coop_produits: { Row: CoopProduit; Insert: Ins<CoopProduit>; Update: Upd<CoopProduit> };
      coop_campagnes: { Row: CoopCampagne; Insert: Ins<CoopCampagne>; Update: Upd<CoopCampagne> };
      coop_prix_campagne: { Row: CoopPrixCampagne; Insert: Ins<CoopPrixCampagne>; Update: Upd<CoopPrixCampagne> };
      coop_apports: { Row: CoopApport; Insert: Ins<CoopApport>; Update: Upd<CoopApport> };
      coop_apports_preuves: { Row: { id: string; cooperative_id: string; apport_id: string; type: string; url: string | null; meta: unknown; created_at: string; created_by: string | null }; Insert: Ins<{ apport_id: string; type: string }>; Update: Upd<Record<string, unknown>> };
      coop_equipages: { Row: CoopEquipage; Insert: Ins<CoopEquipage>; Update: Upd<CoopEquipage> };
      coop_debarquements: { Row: { id: string; cooperative_id: string; campagne_id: string | null; equipage_id: string | null; produit_id: string | null; quantite_base: number; montant_xof: number; date_debarquement: string; created_at: string; created_by: string | null }; Insert: Ins<Record<string, unknown>>; Update: Upd<Record<string, unknown>> };
      coop_caisses: { Row: CoopCaisse; Insert: Ins<CoopCaisse>; Update: Upd<CoopCaisse> };
      coop_comptes_bancaires: { Row: CoopCompteBancaire; Insert: Ins<CoopCompteBancaire>; Update: Upd<CoopCompteBancaire> };
      coop_operations_tresorerie: { Row: CoopOperationTresorerie; Insert: Ins<CoopOperationTresorerie>; Update: Upd<CoopOperationTresorerie> };
      coop_previsions_tresorerie: { Row: { id: string; cooperative_id: string; date_prevue: string; sens: Sens; montant_xof: number; source_type: string | null; source_id: string | null; libelle: string | null; statut: string; created_at: string; created_by: string | null }; Insert: Ins<Record<string, unknown>>; Update: Upd<Record<string, unknown>> };
      coop_notifications_sms: { Row: CoopNotificationSms; Insert: Ins<CoopNotificationSms>; Update: Upd<CoopNotificationSms> };
      coop_audit_log: { Row: CoopAuditLog; Insert: Ins<CoopAuditLog>; Update: Upd<CoopAuditLog> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
