
export interface RemoteSiteInfo {
  id: string;
  codeSiteDistant: string;
  statusLOS: 'Oui' | 'Non';
  gpsDMS: { lat: string; long: string; elev?: string };
  gpsDEC: { lat: string; long: string };
  hauteurAntenneLocale: string;
  hauteurAntenneDistante: string;
  azimutLocalDistant: string;
  azimutDistantLocal: string;
  longueurBond: string;
  diametreAntenne: string;
  diametreAntenneDistante: string;
  frequence: string;
  longueurCableIF?: string;
  longueurCablePOE?: string;
  ajoutSupportMW: string;
  ajoutDepartEnergie: string;
  commentaire: string;
  chaineSiteLocal?: string;
  chaineSiteDistant?: string;
}

export interface VisAVisInfo {
  id?: string;
  siteDistantId?: string;
  codeSite: string;
  statusLOS: string;
  imageProfilUrl?: string;
  commentaireProfil?: string;
  imageGoogleMapsUrl?: string;
  typeDeuxiemeImage?: 'google' | 'obstacle';
  titreDeuxiemeImage?: string;
  planCapilaire: {
    codeSite: string;
    direction: string;
    tailleAntenne: string;
  }[];
}

export interface RfiReport {
  donneesLOS: {
    header: {
      codeSite: string;
      nomSite: string;
      dateLOS: string;
      superviseur: { nom: string; tel: string };
      maintenancier: { nom: string; tel: string };
    };
    infoSite: {
      contactClient: string;
      structureAConstruire: string;
      longueurCablePOE: string;
      remarquesAcces: string;
    };
    coordonnees: {
      latitudeDMS: string;
      longitudeDMS: string;
      latitudeDEC: string;
      longitudeDEC: string;
      hauteurBatiment: string;
    };
    sitesDistants: RemoteSiteInfo[];
    resumeTrans: {
      siteLocal: string;
      siteDistant: string;
    };
  };
  visAVis: VisAVisInfo[];
  photosStructured: {
    zoomVisAVis: { url: string; caption: string }[];
    vuesGenerales: { url: string; caption: string }[];
    structures: { url: string; caption: string }[];
  };
  profils: { url: string; caption: string }[];
  photos: { url: string; category: string; caption: string }[];
  panoramiques: { url: string; caption: string }[];
  travauxGC: {
    photos: { url: string; caption: string }[];
    annotationEchelle: string;
    annotationPassageCable: string;
    descriptionTechnique: string;
    ancrage: string;
    etatStructure: string;
    travauxMaconnerie: string;
    supportage: string;
    remarques: string;
    plans?: {
      plan?: string;
      planGC?: string;
    };
  };
  asBuiltData?: AsBuiltData;
}

export interface AsBuiltStepPhoto {
  id: string; // e.g., 'step1', 'step2', ..., 'step7'
  stepNumber: number; // 1 to 7
  title: string; // e.g. 'Photo générale du site'
  description: string;
  photoUrl?: string;
  timestamp?: string;
  status?: 'Conforme' | 'Non Conforme' | 'En attente';
  comment?: string;
  validatedByChef?: boolean;
  chefValidationDate?: string;
  chefValidatorName?: string;
}

export interface AsBuiltData {
  supabaseReportId?: string;
  nomSiteClient: string;
  codeSiteClient: string;
  nomSousTraitant: string;
  dateRealisation: string;
  photos: AsBuiltStepPhoto[];
  coverValidatedByChef?: boolean;
  coverChefValidationDate?: string;
  coverChefValidatorName?: string;
  attestationValidatedByChef?: boolean;
  attestationChefValidationDate?: string;
  attestationChefValidatorName?: string;
  attestationImageUrl?: string;
  attestationScellementUrl?: string;
  attestationScellementName?: string;
  attestationDateUpload?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'CHANGES_REQUESTED';
  workflowStep?: 1 | 2 | 3;
  submittedBy?: string;
  submittedAt?: string;
  updatedAt?: string;
  statusValidationAdmin?: 'En attente' | "Soumis à l'admin" | 'Validé' | 'Réserves';
  validePar?: string;
  dateValidation?: string;
  remarquesGenerales?: string;
}

export interface EtudeRFILoss {
  id: string;
  supabaseReportId?: string;
  site: string;
  contactClient: {
    nom: string;
    tel: string;
    mail?: string;
  };
  contactSMTT?: string;
  typeMission?: string;
  gps: {
    latitude: string;
    longitude: string;
    cgps?: string;
  };
  superviseurLOS?: string;
  maintenancier?: string;
  processusAccesFH?: string;
  codesSitesDistants: string[];
  dateCreation: string;
  action: string;
  dateAffectation: string;
  chefsEquipe: string[];
  datePlanification?: string;
  status: 'En attente' | 'Affecté' | 'Planifié' | 'Terminé';
  report?: RfiReport;
  asBuiltData?: AsBuiltData;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  isRead: boolean;
  ticketId?: string;
  studyId?: string;
  senderName: string;
}

export type SupabaseRole = 'Admin1' | 'Admin2' | 'Chef_Equipe' | 'Technicien';

export interface SupabaseProfile {
  id: string;
  nom: string;
  email?: string;
  role: SupabaseRole | string;
  zone?: string;
  actif?: boolean;
  created_at?: string;
}

export interface TicketB2CRecord {
  id: string;
  titre?: string;
  code_site?: string;
  nom_site?: string;
  client?: string;
  lien?: string;
  configuration?: string;
  lien_recup?: string;
  superviseur?: string;
  zone?: string;
  technicien_id?: string | null;
  date_planification?: string | null;
  statut?: string;
  created_at?: string;
  technicien?: {
    nom?: string;
    zone?: string;
  } | null;
}

export interface ReportPhotoRecord {
  id?: string;
  report_id: string;
  slide_number: number;
  photo_url: string;
  created_at?: string;
}

export interface AsBuiltReportRecord {
  id: string;
  ticket_id?: string | null;
  study_id?: string | null;
  type_rapport?: string | null;
  nom_site_client?: string | null;
  code_site_client?: string | null;
  nom_sous_traitant?: string | null;
  date_realisation?: string | null;
  statut?: string | null;
  attestation_slide9_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  report_photos?: ReportPhotoRecord[];
}

