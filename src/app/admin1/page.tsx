import React, { useState, useEffect } from 'react';
import pptxgen from 'pptxgenjs';
import {
  Shield,
  LogOut,
  User,
  PlusCircle,
  Table,
  Search,
  Trash2,
  Calendar,
  Link as LinkIcon,
  Cpu,
  UserCheck,
  Users,
  CheckCircle,
  FileText,
  AlertCircle,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Monitor,
  RefreshCw,
  Bell,
  Clock
} from 'lucide-react';
import EtudeRFILossModule from '../../components/EtudeRFILoss.tsx';
import GenieCivilModule from '../../components/GenieCivilModule.tsx';
import AdminUsersPanel from '../../components/AdminUsersPanel.tsx';
import SmttLogo from '../../components/SmttLogo.tsx';
import { AppNotification, AsBuiltReportRecord, SupabaseProfile, TicketB2CRecord } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase.js';
import { compressImage } from '../../utils/imageCompressor.js';
import {
  fetchAllProfiles,
  fetchTicketsB2C,
  createTicketB2C,
  deleteTicketB2C,
  updateTicketB2CPlanificationAndStatut,
  subscribeTicketsB2CRealtime,
  subscribeProfilesRealtime,
  fetchAsBuiltReportsWithPhotos,
  ensureAsBuiltReport,
  uploadSlidePhotoToStorage,
  deleteSlidePhotoFromDatabase,
  validateAsBuiltReportByAdmin,
  subscribeAsBuiltRealtime,
  isUuid,
} from '../../services/supabaseService';

interface Admin1Ticket {
  id: string;
  lien: string;
  configuration: string;
  lienRecup: string;
  owner: string;
  debutInstallation: string;
  finInstallation: string;
  superviseur: string;
  chefEquipe1: string;
  chefEquipe2: string;
  chefEquipe3: string;
  createdAt: string;
  status: 'Créé' | 'Rapport Soumis' | 'Rapport Validé';
  siteOoredoo1?: string;
  siteOoredoo2?: string;
  dateAsBuilt?: string;
  technicienId?: string | null;
  technicienNom?: string;
  technicienZone?: string;
  datePlanification?: string;
  supabaseReportId?: string;
  photos?: Record<string, Record<string, string>>; // slideId -> slotId -> url
}

interface Admin1PageProps {
  fullName: string;
  onLogout: () => void;
}

// In-memory cache to store live blobs for the active browser session
// This allows us to show the user's actual uploaded images in real time
const livePreviewCache: Record<string, string> = {};

// Slide config for As Built FH
const SLIDES_CONFIG = [
  {
    id: 'page1_cover',
    title: 'Page 1 : Page de garde',
    isCover: true,
    slots: []
  },
  {
    id: 'page2_site1_photo',
    title: 'Page 2 : Photo du site 1',
    slots: [
      { id: 'avant_inst', label: 'Avant installation' },
      { id: 'apres_inst', label: 'Après installation (clean up Site)' }
    ]
  },
  {
    id: 'page3_site1_outdoor_1',
    title: 'Page 3 : Site 1 Outdoor (1/2)',
    slots: [
      { id: 'antenne_mw', label: 'Antenne MW installé' },
      { id: 'labelling_ant_mw', label: 'Labelling Antenne MW' },
      { id: 'etancheite_conn', label: 'Etanchéité connecteur' }
    ]
  },
  {
    id: 'page4_site1_outdoor_2',
    title: 'Page 4 : Site 1 Outdoor (2/2)',
    slots: [
      { id: 'grounding_kit', label: 'Grounding kit (kit de masse)' },
      { id: 'cable_barrette', label: 'Câble connecté à la barrette de terre' },
      { id: 'acheminement_if_x2', label: 'Acheminement du câble IF x2' }
    ]
  },
  {
    id: 'page5_site1_indoor',
    title: 'Page 5 : Site 1 Indoor',
    slots: [
      { id: 'idu_installe', label: 'IDU installé' },
      { id: 'labelling_idu', label: 'Labelling IDU installé' },
      { id: 'conn_energie', label: 'Connecteur énergie -48V' },
      { id: 'labelling_energie', label: 'Labelling Câble énergie -48V' }
    ]
  },
  {
    id: 'page6_site2_photo',
    title: 'Page 6 : Photo du site 2',
    slots: [
      { id: 'avant_inst', label: 'Avant installation' },
      { id: 'apres_inst', label: 'Après installation (clean up Site)' }
    ]
  },
  {
    id: 'page7_site2_outdoor_1',
    title: 'Page 7 : Site 2 Outdoor (1/2)',
    slots: [
      { id: 'antenne_mw', label: 'Antenne MW installé' },
      { id: 'labelling_ant_mw', label: 'Labelling Antenne MW' },
      { id: 'etancheite_conn', label: 'Etanchéité connecteur' }
    ]
  },
  {
    id: 'page8_site2_outdoor_2',
    title: 'Page 8 : Site 2 Outdoor (2/2)',
    slots: [
      { id: 'acheminement_if_x3', label: 'Acheminement du câble IF x3' },
      { id: 'silicone_tube', label: 'Ajout silicone au Tube Gorge' }
    ]
  },
  {
    id: 'page9_site2_indoor_1',
    title: 'Page 9 : Site 2 Indoor (1/2)',
    slots: [
      { id: 'idu_installe', label: 'IDU installé' },
      { id: 'labelling_idu', label: 'Labelling IDU installé' },
      { id: 'conn_energie', label: 'Connecteur énergie -48V' },
      { id: 'labelling_energie', label: 'Labelling Câble énergie -48V' }
    ]
  },
  {
    id: 'page10_site2_indoor_2',
    title: 'Page 10 : Site 2 Indoor (2/2)',
    slots: [
      { id: 'labelling_nms_ge', label: 'Labelling Câble NMS et GE coté IDU' },
      { id: 'labelling_nms_ge_ex', label: 'Labelling Câble NMS et GE coté IDU existant' },
      { id: 'cable_nms_ge_cat6', label: 'Câble et connecteur NMS et GE catégorie 6' },
      { id: 'port_rattachement', label: 'Port de rattachement' }
    ]
  },
  {
    id: 'page11_screens_1',
    title: 'Page 11 : Imprimés écran (1/3)',
    slots: [
      { id: 'screen_dcn', label: 'Imprimé écran DCN' },
      { id: 'screen_ip', label: "Imprimé écran sur l'équipement @IP" }
    ]
  },
  {
    id: 'page12_screens_2',
    title: 'Page 12 : Imprimés écran (2/3)',
    slots: [
      { id: 'screen_xpic', label: 'Imprimé écran XPIC' },
      { id: 'screen_alarm', label: 'Imprimé écran Alarm' }
    ]
  }
];

// Helper to get preview URL (supports Supabase Storage URLs, blob/data URLs, and legacy demo fallbacks)
export function getPhotoPreviewUrl(cloudUrl: string | undefined, slotId: string): string {
  if (!cloudUrl) return '';
  if (livePreviewCache[cloudUrl]) {
    return livePreviewCache[cloudUrl];
  }
  if (
    cloudUrl.startsWith('data:') ||
    cloudUrl.startsWith('blob:') ||
    (cloudUrl.startsWith('http') && !cloudUrl.includes('supabase.ooredoo.tn'))
  ) {
    return cloudUrl;
  }

  // High quality curated telecom fallbacks for legacy demo URLs
  const fallbackImages: Record<string, string> = {
    "avant_inst": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80",
    "apres_inst": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80",
    "antenne_mw": "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80",
    "labelling_ant_mw": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    "etancheite_conn": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    "grounding_kit": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    "cable_barrette": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
    "acheminement_if_x2": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80",
    "acheminement_if_x3": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80",
    "idu_installe": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    "labelling_idu": "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80",
    "conn_energie": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
    "labelling_energie": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    "silicone_tube": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    "labelling_nms_ge": "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80",
    "labelling_nms_ge_ex": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    "cable_nms_ge_cat6": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80",
    "port_rattachement": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
    "screen_dcn": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    "screen_ip": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    "screen_xpic": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    "screen_alarm": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80"
  };
  
  return fallbackImages[slotId] || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80";
}

function getFhSlotSlideNumber(slideId: string, slotId: string): number {
  const slideIdx = SLIDES_CONFIG.findIndex((s) => s.id === slideId);
  if (slideIdx < 0) return 100;
  const slotIdx = SLIDES_CONFIG[slideIdx].slots.findIndex((sl) => sl.id === slotId);
  return (slideIdx + 1) * 10 + (slotIdx >= 0 ? slotIdx + 1 : 1);
}

function mapReportPhotosToFhSlots(report?: AsBuiltReportRecord): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  if (!report?.report_photos) return result;
  for (const photo of report.report_photos) {
    const slideIdx = Math.floor(photo.slide_number / 10) - 1;
    const slotIdx = (photo.slide_number % 10) - 1;
    const slide = SLIDES_CONFIG[slideIdx];
    const slot = slide?.slots?.[slotIdx];
    if (slide && slot && photo.photo_url) {
      if (!result[slide.id]) result[slide.id] = {};
      result[slide.id][slot.id] = photo.photo_url;
    }
  }
  return result;
}

export default function Admin1Page({ fullName, onLogout }: Admin1PageProps) {
  // Main Navigation View (verrouillé sur le rôle Admin 1)
  const [activeView, setActiveView] = useState<'tickets' | 'rfi' | 'gc' | 'users'>('tickets');

  const [tickets, setTickets] = useState<Admin1Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chefsList, setChefsList] = useState<string[]>(["Sami K.", "Amine M.", "Hassen T."]);
  const [supabaseProfiles, setSupabaseProfiles] = useState<SupabaseProfile[]>([]);
  const [selectedTechnicienId, setSelectedTechnicienId] = useState<string>('');

  // Form States (Admin 1 Ticket Creation)
  const [lien, setLien] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [lienRecup, setLienRecup] = useState('');
  const [owner, setOwner] = useState('');
  const [debutInstallation, setDebutInstallation] = useState('');
  const [superviseur, setSuperviseur] = useState('');
  const [chefEquipe1, setChefEquipe1] = useState('');
  const [chefEquipe2, setChefEquipe2] = useState('');
  const [chefEquipe3, setChefEquipe3] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Admin 1 PPT generation states
  const [previewTicket, setPreviewTicket] = useState<Admin1Ticket | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState<number>(0);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStep, setExportStep] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const mapSupabaseTicketToAdmin1 = (
    t: TicketB2CRecord,
    reports: AsBuiltReportRecord[] = []
  ): Admin1Ticket => {
    const matchedReport = reports.find(
      (r) =>
        r.ticket_id === t.id ||
        r.study_id === t.id ||
        (t.code_site && r.code_site_client === t.code_site)
    );
    const rawStatut = (matchedReport?.statut || t.statut || '').toUpperCase();
    const mappedStatus: Admin1Ticket['status'] =
      rawStatut.includes('VALID') ? 'Rapport Validé' :
      rawStatut.includes('SOUMIS') ? 'Rapport Soumis' : 'Créé';

    return {
      id: t.id,
      lien: t.lien || `https://smtt.b2b/ticket/${t.code_site || t.id}`,
      configuration: t.configuration || t.titre || 'Ticket B2C / FH',
      lienRecup: t.lien_recup || '',
      owner: t.client || 'Ooredoo',
      debutInstallation: t.date_planification || t.created_at || '',
      finInstallation: t.date_planification || '',
      superviseur: t.superviseur || 'Admin 1',
      chefEquipe1: t.technicien?.nom || 'Non assigné',
      chefEquipe2: 'Non assigné',
      chefEquipe3: 'Non assigné',
      createdAt: (t.created_at || new Date().toISOString()).replace('T', ' ').substring(0, 16),
      status: mappedStatus,
      siteOoredoo1: matchedReport?.nom_site_client || t.code_site || t.nom_site || 'Site Ooredoo',
      siteOoredoo2: t.zone || t.technicien?.zone || 'Zone',
      dateAsBuilt: matchedReport?.date_realisation || t.date_planification || '',
      technicienId: t.technicien_id,
      technicienNom: t.technicien?.nom || undefined,
      technicienZone: t.technicien?.zone || t.zone || undefined,
      datePlanification: t.date_planification || undefined,
      supabaseReportId: matchedReport?.id,
      photos: mapReportPhotosToFhSlots(matchedReport),
    };
  };

  // Load from Supabase Realtime & localStorage on mount
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smtt_notifications') {
        setNotifications(JSON.parse(e.newValue || '[]'));
      }
      if (!isSupabaseConfigured && (e.key === 'smtt_admin_tickets' || e.key === 'smtt_admin1_tickets')) {
        setTickets(JSON.parse(e.newValue || '[]'));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    try {
      const storedNotifications = localStorage.getItem('smtt_notifications');
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }

      const stored = localStorage.getItem('smtt_admin_tickets') || localStorage.getItem('smtt_admin1_tickets');
      if (stored) {
        setTickets(JSON.parse(stored));
      } else {
        // Hydrate default ticket for immediate illustration of As Built workflow
        const defaultTickets: Admin1Ticket[] = [
          {
            id: 'TKT-77412',
            lien: 'https://smtt.b2b/install/774',
            configuration: 'FH NEC iPASOLINK EX 15G - 1+0 XPIC',
            lienRecup: 'https://smtt.b2b/recup/982',
            owner: 'Ooredoo_TN',
            debutInstallation: '2026-07-08T08:00',
            finInstallation: '2026-07-09T17:00',
            superviseur: 'Kamel S.',
            chefEquipe1: 'Sami K.',
            chefEquipe2: 'Amine M.',
            chefEquipe3: 'Non assigné',
            createdAt: '2026-07-07 10:15',
            status: 'Rapport Soumis',
            siteOoredoo1: 'GAB_9463',
            siteOoredoo2: 'GAB_1028',
            dateAsBuilt: '09/08/2026',
            photos: {
              page2_site1_photo: {
                avant_inst: 'https://supabase.ooredoo.tn/storage/v1/object/public/asbuilt-photos/tkt_TKT-77412_site2_site1_photo_avant_inst.png',
                apres_inst: 'https://supabase.ooredoo.tn/storage/v1/object/public/asbuilt-photos/tkt_TKT-77412_site2_site1_photo_apres_inst.png'
              },
              page3_site1_outdoor_1: {
                antenne_mw: 'https://supabase.ooredoo.tn/storage/v1/object/public/asbuilt-photos/tkt_TKT-77412_site3_antenne_mw.png'
              }
            }
          },
          {
            id: 'TKT-54911',
            lien: 'https://smtt.b2b/install/892',
            configuration: 'FH Ericsson MINI-LINK 6366 18G XPIC',
            lienRecup: '',
            owner: 'Orange_B2B',
            debutInstallation: '2026-07-10T09:00',
            finInstallation: '2026-07-11T18:00',
            superviseur: 'Hassen T.',
            chefEquipe1: 'Hassen T.',
            chefEquipe2: 'Non assigné',
            chefEquipe3: 'Non assigné',
            createdAt: '2026-07-07 12:45',
            status: 'Créé',
            siteOoredoo1: 'TUN_1032',
            siteOoredoo2: 'TUN_0492',
            dateAsBuilt: '11/08/2026'
          }
        ];
        setTickets(defaultTickets);
        localStorage.setItem('smtt_admin_tickets', JSON.stringify(defaultTickets));
      }
    } catch (e) {
      console.error('Erreur lors du chargement des tickets', e);
    }

    try {
      const storedUsers = localStorage.getItem('smtt_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        const filtered = parsed
          .filter((u: any) => u.role === "Chef d'équipe" || u.role === 'Chef_Equipe' || u.role === 'Technicien')
          .map((u: any) => u.fullName || u.nom);
        const combined = Array.from(new Set([...filtered, "Sami K.", "Amine M.", "Hassen T."]));
        setChefsList(combined);
      }
    } catch (e) {
      console.error('Erreur lors du chargement des chefs d\'équipe', e);
    }

    let unsubTickets = () => {};
    let unsubProfiles = () => {};
    let unsubAsBuilt = () => {};

    if (isSupabaseConfigured) {
      const loadSupabaseTickets = async () => {
        const [remoteTickets, remoteReports] = await Promise.all([
          fetchTicketsB2C(),
          fetchAsBuiltReportsWithPhotos(),
        ]);
        if (remoteTickets.length > 0) {
          setTickets(remoteTickets.map((t) => mapSupabaseTicketToAdmin1(t, remoteReports)));
        }
      };

      const loadSupabaseProfiles = async () => {
        try {
          const profs = await fetchAllProfiles();
          setSupabaseProfiles(profs);
          const fieldNames = profs
            .filter((p) => p.actif !== false && (p.role === 'Chef_Equipe' || p.role === 'Technicien' || p.role === "Chef d'équipe"))
            .map((p) => p.nom);
          if (fieldNames.length > 0) {
            setChefsList((prev) => Array.from(new Set([...fieldNames, ...prev])));
          }
        } catch (err) {
          console.error('Erreur chargement profils Supabase:', err);
        }
      };

      loadSupabaseTickets();
      loadSupabaseProfiles();
      unsubTickets = subscribeTicketsB2CRealtime(loadSupabaseTickets);
      unsubProfiles = subscribeProfilesRealtime(loadSupabaseProfiles);
      unsubAsBuilt = subscribeAsBuiltRealtime(loadSupabaseTickets);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubTickets();
      unsubProfiles();
      unsubAsBuilt();
    };
  }, []);

  // Sync tickets with selected preview ticket if state updates
  useEffect(() => {
    if (previewTicket) {
      const match = tickets.find(t => t.id === previewTicket.id);
      if (match) {
        setPreviewTicket(match);
      }
    }
  }, [tickets]);

  // Save to localStorage
  const saveTickets = (updated: Admin1Ticket[]) => {
    setTickets(updated);
    try {
      localStorage.setItem('smtt_admin_tickets', JSON.stringify(updated));
      localStorage.setItem('smtt_admin1_tickets', JSON.stringify(updated));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des tickets', e);
    }
  };

  const saveNotifications = (updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem('smtt_notifications', JSON.stringify(updated));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des notifications', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lien.trim() || !configuration.trim() || !owner.trim() || !debutInstallation || !superviseur.trim()) {
      setFormError('Veuillez remplir tous les champs obligatoires (Lien, Configuration, Owner, Début, Superviseur).');
      return;
    }

    const matchedProf = supabaseProfiles.find(
      (p) => p.id === selectedTechnicienId || p.nom === chefEquipe1
    );

    if (isSupabaseConfigured) {
      try {
        const created = await createTicketB2C({
          titre: configuration.trim(),
          code_site: `SITE-${Date.now().toString().slice(-4)}`,
          client: owner.trim(),
          lien: lien.trim(),
          configuration: configuration.trim(),
          lien_recup: lienRecup.trim(),
          superviseur: superviseur.trim(),
          technicien_id: matchedProf?.id || null,
          date_planification: debutInstallation,
          statut: 'Créé',
        });
        if (created) {
          const [remoteList, remoteReports] = await Promise.all([
            fetchTicketsB2C(),
            fetchAsBuiltReportsWithPhotos(),
          ]);
          setTickets(remoteList.map((t) => mapSupabaseTicketToAdmin1(t, remoteReports)));
        }
      } catch (err: any) {
        setFormError(err?.message || 'Erreur lors de la création du ticket dans Supabase.');
        return;
      }
    } else {
      const newTicket: Admin1Ticket = {
        id: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
        lien: lien.trim(),
        configuration: configuration.trim(),
        lienRecup: lienRecup.trim(),
        owner: owner.trim(),
        debutInstallation: debutInstallation,
        finInstallation: '',
        superviseur: superviseur.trim(),
        chefEquipe1: chefEquipe1.trim() || 'Non assigné',
        chefEquipe2: chefEquipe2.trim() || 'Non assigné',
        chefEquipe3: chefEquipe3.trim() || 'Non assigné',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Créé',
        siteOoredoo1: 'GAB_9463',
        siteOoredoo2: 'GAB_1028',
        dateAsBuilt: new Date().toLocaleDateString('fr-FR'),
        photos: {}
      };

      const updated = [newTicket, ...tickets];
      saveTickets(updated);
    }

    // Reset Form
    setLien('');
    setConfiguration('');
    setLienRecup('');
    setOwner('');
    setDebutInstallation('');
    setSuperviseur('');
    setChefEquipe1('');
    setChefEquipe2('');
    setChefEquipe3('');
    setSelectedTechnicienId('');
    setFormError('');
    setSuccessMessage('Ticket enregistré avec succès !');

    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDelete = (id: string) => {
    setTicketToDelete(id);
  };

  const confirmDelete = async () => {
    if (ticketToDelete) {
      if (isSupabaseConfigured) {
        try {
          await deleteTicketB2C(ticketToDelete);
        } catch (err) {
          console.error('Erreur suppression Supabase:', err);
        }
      }
      const updated = tickets.filter(t => t.id !== ticketToDelete);
      saveTickets(updated);
      if (previewTicket?.id === ticketToDelete) setPreviewTicket(null);
      setTicketToDelete(null);
    }
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'Validated' | 'Pending' | 'Soumis'>('all');

  const validatedCount = tickets.filter(t => t.status === 'Rapport Validé' || (t.status as any) === 'Validé').length;
  const soumisCount = tickets.filter(t => t.status === 'Rapport Soumis' || (t.status as any) === 'Soumis').length;
  const pendingCount = tickets.filter(t => t.status === 'Créé' || (t.status as any) === 'En attente' || (t.status as any) === 'Pending' || !t.status).length;
  const totalCount = tickets.length;

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.superviseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.configuration.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'Validated') return t.status === 'Rapport Validé' || (t.status as any) === 'Validé';
    if (statusFilter === 'Soumis') return t.status === 'Rapport Soumis' || (t.status as any) === 'Soumis';
    if (statusFilter === 'Pending') return t.status === 'Créé' || (t.status as any) === 'En attente' || (t.status as any) === 'Pending' || !t.status;
    return true;
  });

  // File Upload Handlers (Supabase Storage 'as-built-files' & local fallback)
  const handlePhotoUpload = async (ticketId: string, slideId: string, slotId: string, file: File) => {
    const MAX_RAW_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_RAW_SIZE) {
      setFormError("⚠️ Fichier trop volumineux. La taille maximale brute autorisée est de 25 MO.");
      return;
    }

    const slotKey = `${slideId}_${slotId}`;
    setUploadingSlotKey(slotKey);

    try {
      const compressedFile = await compressImage(file, {
        maxDimension: 1280,
        quality: 0.8,
      });

      const targetTicket = tickets.find((t) => t.id === ticketId);
      const localBlobUrl = URL.createObjectURL(compressedFile);

      if (isSupabaseConfigured) {
        try {
          const reportId = await ensureAsBuiltReport({
            existingReportId: targetTicket?.supabaseReportId,
            ticketId: isUuid(ticketId) ? ticketId : undefined,
            studyId: ticketId,
            typeRapport: 'FH',
            nomSiteClient: targetTicket?.siteOoredoo1 || targetTicket?.configuration,
            codeSiteClient: targetTicket?.siteOoredoo1 || ticketId,
            nomSousTraitant: targetTicket?.chefEquipe1 || fullName,
            dateRealisation: targetTicket?.dateAsBuilt || undefined,
          });
          const slideNumber = getFhSlotSlideNumber(slideId, slotId);
          const { publicUrl } = await uploadSlidePhotoToStorage({
            reportId,
            slideNumber,
            file: compressedFile,
          });
          livePreviewCache[publicUrl] = localBlobUrl;

          const updated = tickets.map((t) => {
            if (t.id === ticketId) {
              const photos = t.photos ? { ...t.photos } : {};
              if (!photos[slideId]) photos[slideId] = {};
              photos[slideId][slotId] = publicUrl;
              return { ...t, supabaseReportId: reportId, photos };
            }
            return t;
          });
          saveTickets(updated);
          return;
        } catch (err) {
          console.error('Erreur upload photo Admin1 Supabase:', err);
        }
      }

      const cleanFileName = compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const cloudUrl = `https://supabase.ooredoo.tn/storage/v1/object/public/asbuilt-photos/tkt_${ticketId}_${slideId}_${slotId}_${Date.now()}_${cleanFileName}`;
      livePreviewCache[cloudUrl] = localBlobUrl;

      const updated = tickets.map(t => {
        if (t.id === ticketId) {
          const photos = t.photos ? { ...t.photos } : {};
          if (!photos[slideId]) photos[slideId] = {};
          photos[slideId][slotId] = cloudUrl;
          return { ...t, photos };
        }
        return t;
      });

      saveTickets(updated);
    } finally {
      setUploadingSlotKey((prev) => (prev === slotKey ? null : prev));
    }
  };

  // Delete/Clear photo handler
  const handlePhotoDelete = async (ticketId: string, slideId: string, slotId: string) => {
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (isSupabaseConfigured && targetTicket?.supabaseReportId) {
      try {
        await deleteSlidePhotoFromDatabase(
          targetTicket.supabaseReportId,
          getFhSlotSlideNumber(slideId, slotId)
        );
      } catch (err) {
        console.error('Erreur suppression photo Admin1 Supabase:', err);
      }
    }

    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        if (t.photos && t.photos[slideId]) {
          const slidePhotos = { ...t.photos[slideId] };
          delete slidePhotos[slotId];
          return {
            ...t,
            photos: {
              ...t.photos,
              [slideId]: slidePhotos
            }
          };
        }
      }
      return t;
    });
    saveTickets(updated);
  };

  // Calculate stats of photos uploaded
  const getPhotoStats = (ticket: Admin1Ticket) => {
    let uploadedCount = 0;
    let totalSlots = 0;
    SLIDES_CONFIG.forEach(slide => {
      if (!slide.isCover) {
        totalSlots += slide.slots.length;
        if (ticket.photos && ticket.photos[slide.id]) {
          uploadedCount += Object.keys(ticket.photos[slide.id]).length;
        }
      }
    });
    return { uploadedCount, totalSlots };
  };

  // Run PPT file generation with pptxgenjs
  const handleExportPPT = async (ticket: Admin1Ticket) => {
    setExportProgress(10);
    setExportSuccess(false);
    setExportStep("Génération des diapositives 16:9...");

    try {
      const PptxClass = (pptxgen as any).default || pptxgen;
      const pptx = new PptxClass();
      
      // Define 16:9 Layout
      pptx.layout = 'LAYOUT_16x9';

      const site1Name = ticket.siteOoredoo1 || 'Non renseigné';
      const site2Name = ticket.siteOoredoo2 || 'Non renseigné';
      const dateVal = ticket.dateAsBuilt || 'Non renseignée';

      // ------------------------------------------------------------------
      // SLIDE 1 : PAGE DE GARDE (Cover Page) - OFFICIAL OOREDOO TEMPLATE
      // ------------------------------------------------------------------
      const slide1 = pptx.addSlide();
      slide1.background = { color: 'ECECEC' };
      
      // Background watermark pattern (losanges) - More repetitive and smaller
      for (let i = 0; i < 30; i++) {
        for (let j = 0; j < 20; j++) {
          slide1.addShape(pptx.ShapeType.diamond, {
            x: i * 0.45, y: j * 0.4, w: 0.2, h: 0.2,
            fill: { color: 'FFFFFF', transparency: 85 }
          });
        }
      }
      
      // Left Huge Red Block - Moved up and refined scalloped border
      const rectX = -0.2;
      const rectY = 0.4;
      const rectW = 6.0;
      const rectH = 4.8;
      const circleSize = 0.4;

      // Add circles around the entire perimeter to create the scalloped effect
      const circleCountX = 20;
      const circleCountY = 16;

      // Top & Bottom (full width)
      for (let i = 0; i <= circleCountX; i++) {
        const x = rectX + (i * (rectW / circleCountX));
        slide1.addShape(pptx.ShapeType.ellipse, { x: x - (circleSize / 2), y: rectY - (circleSize / 2), w: circleSize, h: circleSize, fill: { color: 'E21F26' } });
        slide1.addShape(pptx.ShapeType.ellipse, { x: x - (circleSize / 2), y: rectY + rectH - (circleSize / 2), w: circleSize, h: circleSize, fill: { color: 'E21F26' } });
      }
      // Left & Right (exclude corners to avoid vertical "extensions" or redundant stacking)
      for (let i = 1; i < circleCountY; i++) {
        const y = rectY + (i * (rectH / circleCountY));
        slide1.addShape(pptx.ShapeType.ellipse, { x: rectX - (circleSize / 2), y: y - (circleSize / 2), w: circleSize, h: circleSize, fill: { color: 'E21F26' } });
        slide1.addShape(pptx.ShapeType.ellipse, { x: rectX + rectW - (circleSize / 2), y: y - (circleSize / 2), w: circleSize, h: circleSize, fill: { color: 'E21F26' } });
      }

      slide1.addShape(pptx.ShapeType.rect, {
        x: rectX, y: rectY, w: rectW, h: rectH,
        fill: { color: 'E21F26' }
      });

      // MW Links Title - Reduced font size
      slide1.addText("MW Links installation Ooredoo", {
        x: 0.6, y: 1.8, w: 5.0, h: 0.6,
        fontSize: 18, bold: true, italic: true, color: 'FFFFFF',
        fontFace: 'Arial'
      });

      // Site 1 Info - Reduced font size
      slide1.addText(`Site Ooredoo : ... ${site1Name} ...`, {
        x: 0.6, y: 2.5, w: 5.0, h: 0.4,
        fontSize: 12, color: 'FFFFFF', bold: true, italic: true,
        fontFace: 'Arial'
      });

      // Site 2 Info - Reduced font size
      slide1.addText(`Site Ooredoo : ...... ${site2Name} ......`, {
        x: 0.6, y: 3.0, w: 5.0, h: 0.4,
        fontSize: 12, color: 'FFFFFF', bold: true, italic: true,
        fontFace: 'Arial'
      });

      // Date As Built - Reduced font size
      slide1.addText(`Date As Built : ... ${dateVal} .........`, {
        x: 0.6, y: 3.6, w: 5.0, h: 0.4,
        fontSize: 12, color: 'FFFFFF', bold: true, italic: true,
        fontFace: 'Arial'
      });

      // Top Right Header Block
      slide1.addShape(pptx.ShapeType.rect, {
        x: 9.0, y: 0.4, w: 3.5, h: 0.5,
        fill: { color: 'E21F26' }
      });
      slide1.addText("As Built Installation FH", {
        x: 9.0, y: 0.4, w: 3.5, h: 0.5,
        fontSize: 12, italic: true, color: 'FFFFFF', bold: true,
        align: 'center',
        fontFace: 'Arial'
      });
      // Line under header extending to the right
      slide1.addShape(pptx.ShapeType.line, {
        x: 9.0, y: 1.0, w: 4.33, h: 0,
        line: { color: 'E21F26', width: 1.5 }
      });

      // Footer Logo (Bottom Left)
      slide1.addText("ooredoo business", {
        x: 0.6, y: 6.6, w: 3.0, h: 0.4,
        fontSize: 16, bold: true, color: 'E21F26',
        fontFace: 'Arial'
      });

      // Page Number (Bottom Right)
      slide1.addText("1", {
        x: 12.0, y: 6.6, w: 1.0, h: 0.4,
        fontSize: 14, bold: true, color: 'E21F26',
        align: 'right',
        fontFace: 'Arial'
      });

      // ------------------------------------------------------------------
      // SLIDES 2 to 12 : PHOTOS SLIDES
      // ------------------------------------------------------------------
      for (const slideCfg of SLIDES_CONFIG) {
        if (slideCfg.isCover) continue;

        const slide = pptx.addSlide();
        slide.background = { color: 'ECECEC' };

        // Crimson Header Banner
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 0.4, w: 12.33, h: 0.7,
          fill: { color: 'ED1C24' }
        });

        // Banner Title
        slide.addText(slideCfg.title, {
          x: 0.5, y: 0.4, w: 12.33, h: 0.7,
          fontSize: 18, bold: true, color: 'FFFFFF',
          align: 'center',
          fontFace: 'Arial',
          valign: 'middle'
        });

        const slotsCount = slideCfg.slots.length;
        const startX = 0.5;
        const availableWidth = 12.33;
        const gap = 0.25;
        const widthPerSlot = (availableWidth - (slotsCount - 1) * gap) / slotsCount;
        const yPos = 1.3;
        const hPos = 4.8;

        for (let index = 0; index < slideCfg.slots.length; index++) {
          const slot = slideCfg.slots[index];
          const xPos = startX + index * (widthPerSlot + gap);
          
          // Outer slot container border with Crimson line
          slide.addShape(pptx.ShapeType.rect, {
            x: xPos, y: yPos, w: widthPerSlot, h: hPos,
            line: { color: 'ED1C24', width: 2 },
            fill: { color: 'FFFFFF' }
          });

          // Slot Title Banner (Subtle grey background)
          slide.addShape(pptx.ShapeType.rect, {
            x: xPos + 0.05, y: yPos + 0.05, w: widthPerSlot - 0.1, h: 0.5,
            fill: { color: 'F5F5F5' }
          });

          // Slot Label Text
          slide.addText(slot.label, {
            x: xPos + 0.1, y: yPos + 0.05, w: widthPerSlot - 0.2, h: 0.5,
            fontSize: 10, bold: true, color: '333333',
            align: 'center',
            fontFace: 'Arial',
            valign: 'middle'
          });

          // Check if photo is present in ticket
          const uploadedUrl = ticket.photos?.[slideCfg.id]?.[slot.id];
          if (uploadedUrl) {
            try {
              const previewImgUrl = getPhotoPreviewUrl(uploadedUrl, slot.id);
              
              // Pre-fetch any image URL (blob or HTTP) and convert it to Base64 to avoid CORS issues inside pptxgenjs
              const res = await fetch(previewImgUrl);
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              const blob = await res.blob();
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string || '');
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });

              if (base64Data && base64Data.toLowerCase().includes(';base64,')) {
                let finalBase64 = base64Data;
                if (!finalBase64.startsWith('data:image/')) {
                  const parts = finalBase64.split(';base64,');
                  finalBase64 = `data:image/jpeg;base64,${parts[1]}`;
                }
                // Embed image
                slide.addImage({
                  data: finalBase64,
                  x: xPos + 0.15, y: yPos + 0.65, w: widthPerSlot - 0.3, h: hPos - 0.8
                });
              } else {
                throw new Error("Missing base64 header");
              }
            } catch (err) {
              console.error("Error adding image to pptx slide", err);
              // Text fallback if image loading fails
              slide.addText("[Image non chargée]\nCORS ou format non supporté", {
                x: xPos + 0.15, y: yPos + 1.8, w: widthPerSlot - 0.3, h: 1.2,
                fontSize: 10, color: '888888', align: 'center', fontFace: 'Arial',
                valign: 'middle'
              });
            }
          } else {
            // Placeholder empty photo box (Crimson interior thin border)
            slide.addShape(pptx.ShapeType.rect, {
              x: xPos + 0.2, y: yPos + 1.2, w: widthPerSlot - 0.4, h: hPos - 1.8,
              line: { color: 'CCCCCC', width: 1, dashType: 'dash' },
              fill: { color: 'FAFAFA' }
            });

            // Fallback instruction text
            slide.addText("CADRE PHOTO VIDE\n(Photo non chargée)", {
              x: xPos + 0.15, y: yPos + 1.8, w: widthPerSlot - 0.3, h: 1.2,
              fontSize: 9, color: '999999', align: 'center', fontFace: 'Arial',
              valign: 'middle'
            });
          }
        }

        // Bottom footer brand bar
        slide.addText("Ooredoo Business - As Built FH", {
          x: 0.5, y: 6.9, w: 12.33, h: 0.3,
          fontSize: 9, italic: true, color: '888888',
          align: 'left',
          fontFace: 'Arial'
        });
      }

      setExportProgress(75);
      setExportStep("Exportation finale du PowerPoint...");

      // Write presentation and trigger direct client download
      await pptx.writeFile({ fileName: `As_Built_FH_${site1Name}_${site2Name}_${ticket.id}.pptx` });
      
      if (isSupabaseConfigured) {
        try {
          if (ticket.supabaseReportId) {
            await validateAsBuiltReportByAdmin(ticket.supabaseReportId);
          }
          if (isUuid(ticket.id)) {
            await updateTicketB2CPlanificationAndStatut(ticket.id, { statut: 'VALIDE' });
          }
        } catch (syncErr) {
          console.error('Erreur validation Supabase post-export:', syncErr);
        }
      }

      // Success workflow
      const updated = tickets.map(t => {
        if (t.id === ticket.id) {
          return { ...t, status: 'Rapport Validé' as const };
        }
        return t;
      });
      saveTickets(updated);
      setExportSuccess(true);
      setExportProgress(null);

    } catch (e) {
      console.error("Error generating PPTX", e);
      alert("Erreur critique d'exportation. Veuillez essayer le bouton de secours.");
      setExportProgress(null);
    }
  };

  const emergencyExportPPT = async (ticket: Admin1Ticket) => {
    try {
      const PptxClass = (pptxgen as any).default || pptxgen;
      const pptx = new PptxClass();
      pptx.layout = 'LAYOUT_16x9';
      const slide = pptx.addSlide();
      slide.addText("RAPPORT SECOURS - " + ticket.id, { x: 1, y: 1, fontSize: 24, color: 'ED1C24' });
      slide.addText("Généré sans images pour forcer le téléchargement.", { x: 1, y: 2, fontSize: 14 });
      await pptx.writeFile({ fileName: `Secours_As_Built_${ticket.id}.pptx` });
      alert("Téléchargement du rapport de secours lancé !");
    } catch (err: any) {
      console.error(err);
      alert("L'export de secours a échoué: " + (err?.message || err));
    }
  };

  return (
    <div id="admin1-portal" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-600/30">
      
      {/* Top Main Navbar */}
      <nav id="navbar-main" className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div id="navbar-brand-sec" className="flex items-center gap-3">
          <SmttLogo height={32} />
          <div className="h-6 w-px bg-slate-800" />
          <div className="bg-gradient-to-br from-red-600 to-orange-500 text-white font-black px-3 py-1.5 rounded-xl tracking-tighter text-base shadow-lg shadow-red-600/20">
            Ooredoo
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex flex-col">
            <span className="font-extrabold text-xs tracking-wider text-white uppercase">As Built FH Workflow</span>
            <span className="text-[10px] text-slate-500">Validation & Automatisation Terrain</span>
          </div>
        </div>

        {/* User Info & Logout */}
        <div id="user-info-section" className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-white transition-colors relative cursor-pointer"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notifications</span>
                  <button 
                    onClick={() => {
                      const updated = notifications.map(n => ({ ...n, isRead: true }));
                      saveNotifications(updated);
                    }}
                    className="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-600 text-xs">Aucune notification</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer ${!notif.isRead ? 'bg-blue-600/5' : ''}`}
                        onClick={() => {
                          const updated = notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n);
                          saveNotifications(updated);
                          if (notif.ticketId) {
                              setSearchTerm(notif.ticketId);
                              setActiveView('tickets');
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notif.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <div className="space-y-1">
                            <p className="text-xs text-slate-200 leading-tight font-medium">{notif.message}</p>
                            <p className="text-[9px] text-slate-500">{new Date(notif.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <User size={13} className="text-red-500" />
            <span className="font-semibold">{fullName}</span>
            <span className="text-[9px] text-slate-500 font-mono">(Admin 1)</span>
          </div>
          <button
            id="logout-button"
            onClick={onLogout}
            className="flex items-center gap-1 text-xs font-bold bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-1.5 rounded-xl border border-red-900/40 transition-all duration-150 cursor-pointer"
          >
            <LogOut size={13} />
            Quitter
          </button>
        </div>
      </nav>

      {/* Role Notice Banner */}
      <div id="notice-banner" className="border-b text-center py-2 px-4 text-xs font-semibold tracking-wide transition-colors bg-blue-950/40 border-blue-900/50 text-blue-300">
        <p>🔧 Mode Administrateur Niveau 1 : Création de tickets, suivi des rapports terrains et génération de PowerPoint (Slides 16:9 Landscape).</p>
      </div>

      {/* Main Container - Verrouillé sur Admin 1 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Tab View Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-1 rounded-xl w-fit border border-slate-800">
          <button
            onClick={() => setActiveView('tickets')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'tickets' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tableau de bord Tickets
          </button>
          <button
            onClick={() => setActiveView('rfi')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'rfi' 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Étude RFI LOSS
          </button>
          <button
            onClick={() => setActiveView('gc')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'gc' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🏗️ Génie Civil
          </button>
          <button
            onClick={() => setActiveView('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeView === 'users' 
                ? 'bg-orange-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Utilisateurs
          </button>
        </div>

        {activeView === 'rfi' ? (
            <div className="bg-white p-6 rounded-2xl shadow-xl">
              <EtudeRFILossModule currentUserRole="Admin 1" currentUserName={fullName} />
            </div>
          ) : activeView === 'gc' ? (
            <div className="space-y-6">
              <GenieCivilModule currentUserRole="Admin 1" currentUserName={fullName} />
            </div>
          ) : activeView === 'users' ? (
            <AdminUsersPanel />
          ) : (
            /* =======================================
               ADMIN 1 PORTAL WORKSPACE
               ======================================= */
            <div id="admin1-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side: Create Ticket Form */}
            <section id="admin-create-ticket-section" className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                  <PlusCircle className="text-red-500" size={18} />
                  <h2 className="font-black text-xs text-white uppercase tracking-wider">Création manuelle de ticket</h2>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle size={14} className="shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                  {/* Link Input */}
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Lien Ooredoo FH *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <LinkIcon size={13} />
                      </span>
                      <input
                        id="form-lien"
                        type="text"
                        value={lien}
                        onChange={(e) => setLien(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Config Text Area */}
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Configuration FH *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-500">
                        <Cpu size={13} />
                      </span>
                      <textarea
                        id="form-configuration"
                        value={configuration}
                        onChange={(e) => setConfiguration(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Lien Recup */}
                  <div className="space-y-1">
                    <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Lien Récup (Optionnel)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <LinkIcon size={13} />
                      </span>
                      <input
                        id="form-recup"
                        type="text"
                        value={lienRecup}
                        onChange={(e) => setLienRecup(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Owner & Superviseur */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Client / Owner *</label>
                      <input
                        id="form-owner"
                        type="text"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Superviseur *</label>
                      <input
                        id="form-superviseur"
                        type="text"
                        value={superviseur}
                        onChange={(e) => setSuperviseur(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Install Dates */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">Début Installation *</label>
                      <input
                        id="form-debut"
                        type="datetime-local"
                        value={debutInstallation}
                        onChange={(e) => setDebutInstallation(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Team Leaders Assignation */}
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px] flex items-center gap-1">
                      <Users size={12} className="text-orange-500" />
                      Affectation Chefs d'équipe (Max 3)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        id="select-chef1"
                        value={chefEquipe1}
                        onChange={(e) => setChefEquipe1(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-white text-[10px] focus:outline-none focus:border-red-500"
                      >
                        <option value="">Chef 1</option>
                        {chefsList.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <select
                        id="select-chef2"
                        value={chefEquipe2}
                        onChange={(e) => setChefEquipe2(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-white text-[10px] focus:outline-none focus:border-red-500"
                      >
                        <option value="">Chef 2</option>
                        {chefsList.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <select
                        id="select-chef3"
                        value={chefEquipe3}
                        onChange={(e) => setChefEquipe3(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-white text-[10px] focus:outline-none focus:border-red-500"
                      >
                        <option value="">Chef 3</option>
                        {chefsList.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    id="submit-ticket-btn"
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/10 hover:shadow-red-500/20 active:scale-[0.98] transition-all duration-150 cursor-pointer text-xs mt-4"
                  >
                    Enregistrer le ticket
                  </button>
                </form>
              </div>
            </section>

            {/* Right Side: Tracking Dashboard & Tables */}
            <section id="admin-table-section" className="lg:col-span-8 flex flex-col space-y-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Table className="text-red-500" size={18} />
                    <h2 className="font-extrabold text-xs text-white uppercase tracking-wider">Suivi des Tickets "As Built"</h2>
                  </div>
                  
                  {/* Search bar */}
                  <div className="relative max-w-xs w-full">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Search size={14} />
                    </span>
                    <input
                      id="table-search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Summary Stats Widget */}
                <div id="tickets-summary-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                  {/* Total Card */}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-800/90 border-slate-600 shadow-md ring-1 ring-slate-500'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Total Tickets</span>
                      <Table size={13} className="text-slate-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-white">{totalCount}</span>
                      <span className="text-[9px] text-slate-500 font-medium">global</span>
                    </div>
                  </button>

                  {/* Validated Card */}
                  <button
                    onClick={() => setStatusFilter(statusFilter === 'Validated' ? 'all' : 'Validated')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      statusFilter === 'Validated'
                        ? 'bg-emerald-950/80 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-emerald-950/30 hover:border-emerald-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-emerald-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Validated</span>
                      <CheckCircle size={13} className="text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-emerald-300">{validatedCount}</span>
                      <span className="text-[9px] text-emerald-500/80 font-medium">validés</span>
                    </div>
                  </button>

                  {/* Pending Card */}
                  <button
                    onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'all' : 'Pending')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      statusFilter === 'Pending'
                        ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-blue-950/30 hover:border-blue-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-blue-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
                      <Clock size={13} className="text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-blue-300">{pendingCount}</span>
                      <span className="text-[9px] text-blue-500/80 font-medium">en attente</span>
                    </div>
                  </button>

                  {/* Soumis Card */}
                  <button
                    onClick={() => setStatusFilter(statusFilter === 'Soumis' ? 'all' : 'Soumis')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      statusFilter === 'Soumis'
                        ? 'bg-amber-950/80 border-amber-500 shadow-md ring-1 ring-amber-500'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-amber-950/30 hover:border-amber-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-amber-400 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Soumis</span>
                      <FileText size={13} className="text-amber-400" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-amber-300">{soumisCount}</span>
                      <span className="text-[9px] text-amber-500/80 font-medium">reçus terrain</span>
                    </div>
                  </button>
                </div>

                {/* Filter info indicator if filtered */}
                {statusFilter !== 'all' && (
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg mb-3 border border-slate-800 text-[10px]">
                    <span className="text-slate-400">
                      Filtre actif : <strong className="text-white uppercase">{statusFilter}</strong> ({filteredTickets.length} ticket(s))
                    </span>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
                    >
                      Réinitialiser le filtre
                    </button>
                  </div>
                )}

                {/* Tickets Table */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">ID / Client</th>
                        <th className="py-2.5 px-3">Configuration Technique</th>
                        <th className="py-2.5 px-3">Liens</th>
                        <th className="py-2.5 px-3">Photos Chargées</th>
                        <th className="py-2.5 px-3">Statut Workflow</th>
                        <th className="py-2.5 px-3 text-right">Actions / PPT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <FileText className="opacity-10 w-10 h-10 text-slate-400" />
                              <p className="font-bold text-slate-400">Aucun ticket enregistré.</p>
                              <p className="text-[10px] text-slate-600">Saisissez un ticket à gauche pour lancer le processus.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((ticket) => {
                          const { uploadedCount, totalSlots } = getPhotoStats(ticket);
                          const progressPercent = Math.round((uploadedCount / totalSlots) * 100);

                          return (
                            <tr key={ticket.id} className="hover:bg-slate-900/40 transition-colors group">
                              {/* ID & Client */}
                              <td className="py-3.5 px-3">
                                <div className="font-mono text-red-400 font-bold">{ticket.id}</div>
                                <div className="text-white font-medium">{ticket.owner}</div>
                              </td>

                              {/* Technical details */}
                              <td className="py-3.5 px-3 max-w-[180px]">
                                <div className="font-semibold text-slate-200 line-clamp-1">{ticket.configuration}</div>
                                <div className="text-[10px] text-slate-500 font-mono">Superv: {ticket.superviseur}</div>
                                {ticket.technicienNom && (
                                  <div className="text-[10px] text-orange-400 font-semibold">
                                    Tech: {ticket.technicienNom} {ticket.technicienZone ? `(${ticket.technicienZone})` : ''}
                                  </div>
                                )}
                              </td>

                              {/* Web links */}
                              <td className="py-3.5 px-3 space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] bg-slate-950 text-slate-500 px-1 py-0.5 rounded font-extrabold uppercase">Install</span>
                                  <span className="text-blue-400 font-mono truncate max-w-[100px] block" title={ticket.lien}>{ticket.lien}</span>
                                </div>
                                {ticket.lienRecup && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[8px] bg-slate-950 text-slate-500 px-1 py-0.5 rounded font-extrabold uppercase">Récup</span>
                                    <span className="text-amber-400 font-mono truncate max-w-[100px] block" title={ticket.lienRecup}>{ticket.lienRecup}</span>
                                  </div>
                                )}
                              </td>

                              {/* Photos stats */}
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-300">
                                    {uploadedCount}/{totalSlots}
                                  </span>
                                </div>
                              </td>

                              {/* Status badge */}
                              <td className="py-3.5 px-3">
                                {ticket.status === 'Rapport Validé' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-950 text-emerald-400 font-extrabold border border-emerald-900/30 px-2 py-1 rounded-xl uppercase">
                                    <CheckCircle size={10} /> Validé
                                  </span>
                                ) : ticket.status === 'Rapport Soumis' ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-amber-950 text-amber-400 font-extrabold border border-amber-900/30 px-2 py-1 rounded-xl uppercase animate-pulse">
                                    ● Soumis (Terrain)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-slate-950 text-slate-500 font-extrabold border border-slate-800 px-2 py-1 rounded-xl uppercase">
                                    Créé (En attente)
                                  </span>
                                )}
                              </td>

                              {/* Action items */}
                              <td className="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  id={`btn-ppt-${ticket.id}`}
                                  onClick={() => {
                                    setPreviewTicket(ticket);
                                    setPreviewSlideIndex(0);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-150 bg-red-600 hover:bg-red-500 text-white shadow shadow-red-600/10 cursor-pointer active:scale-95"
                                  title="Générer & Ajuster Rapport PPT"
                                >
                                  <Monitor size={11} /> PPT
                                </button>
                                <button
                                  id={`btn-del-${ticket.id}`}
                                  onClick={() => handleDelete(ticket.id)}
                                  className="p-1.5 bg-slate-950 hover:bg-red-950/60 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/50 rounded-lg transition-all cursor-pointer inline-block"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </section>
          </div>
        )}

      </main>

      {/* =======================================
         ADMIN 1: GENERATE REPORT PPT MODAL VIEW
         ======================================= */}
      {previewTicket && (
        <div 
          id="ppt-preview-modal-overlay" 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto"
        >
          <div 
            id="ppt-modal-box" 
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl p-5 md:p-6 space-y-5 shadow-2xl relative"
          >
            
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="text-red-500" size={18} />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Moteur de génération de slides PPT (As Built FH)</h3>
                  <p className="text-[10px] text-slate-500">Visualisation interactive et application de la charte Ooredoo Business (Format 16:9 Paysage)</p>
                </div>
              </div>
              <button
                id="close-modal-x"
                onClick={() => {
                  setPreviewTicket(null);
                  setExportSuccess(false);
                }}
                className="p-1.5 bg-slate-950 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-850 rounded-xl transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Simulated Export Progress Alert */}
            {exportProgress !== null && (
              <div id="export-progress-panel" className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                    <RefreshCw className="animate-spin text-red-500" size={12} /> {exportStep}
                  </span>
                  <span className="font-mono text-slate-400">{exportProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                </div>
              </div>
            )}

            {exportSuccess && (
              <div id="export-success-panel" className="bg-emerald-950/70 border border-emerald-500/30 p-4 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={18} />
                <div>
                  <h4 className="font-bold text-white mb-0.5">Rapport exporté avec succès !</h4>
                  <p>Le fichier <strong className="text-white">As_Built_FH_{previewTicket.id}.pptx</strong> a été généré avec la charte Ooredoo Business.</p>
                </div>
              </div>
            )}

            {/* Grid for Slide Navigator and Interactive 16:9 Canvas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* Left Column: Slide Selector Thumbnail Grid (16:9 ratio buttons) */}
              <div className="lg:col-span-3 space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Index des Diapositives :</span>
                <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0">
                  {SLIDES_CONFIG.map((slide, idx) => {
                    const isActive = previewSlideIndex === idx;
                    const photosCount = previewTicket.photos && previewTicket.photos[slide.id] 
                      ? Object.keys(previewTicket.photos[slide.id]).length 
                      : 0;

                    return (
                      <button
                        key={slide.id}
                        id={`btn-select-slide-idx-${idx}`}
                        onClick={() => setPreviewSlideIndex(idx)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer shrink-0 w-36 lg:w-full flex flex-col justify-between h-14 ${
                          isActive 
                            ? 'bg-red-950/20 border-red-500 text-red-400' 
                            : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] font-bold truncate block">{slide.title}</span>
                        <div className="flex items-center justify-between w-full text-[9px] text-slate-500 mt-1">
                          <span>Slide {idx + 1}</span>
                          {slide.isCover ? (
                            <span className="px-1 py-0.5 rounded font-extrabold bg-red-950 text-red-400">
                              Page de garde
                            </span>
                          ) : (
                            <span className={`px-1 py-0.5 rounded font-extrabold ${photosCount === slide.slots.length ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900'}`}>
                              {photosCount}/{slide.slots.length} photos
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Interactive landscape 16:9 slide layout */}
              <div className="lg:col-span-9 flex flex-col items-center justify-center space-y-4 slide-preview-zone">
                
                {/* PPT CANVAS - Exact Ooredoo charter layout: Light structured background with diamond pattern, Crimson rounded header banner, custom photo frames, bottom left logo */}
                <div 
                  id="ppt-slide-canvas"
                    className="text-slate-900 rounded-xl relative p-5 md:p-6 flex flex-col justify-between selection:bg-red-100 rapport-slide-preview"
                    style={{
                      backgroundColor: '#ececec',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpolygon points='16,4 21,16 16,28 11,16' fill='%23ffffff' opacity='0.7'/%3E%3Cpolygon points='0,20 5,32 0,44 -5,32' fill='%23ffffff' opacity='0.7'/%3E%3Cpolygon points='32,20 37,32 32,44 27,32' fill='%23ffffff' opacity='0.7'/%3E%3C/svg%3E")`
                    }}
                  >
                    {/* Slide Header: Left-aligned Ooredoo Red text, italic and bold, with a line */}
                    {!SLIDES_CONFIG[previewSlideIndex].isCover && (
                      <div className="w-full flex justify-between items-end border-b-2 border-[#e21f26] pb-1.5 mb-3 shrink-0 select-none">
                        <span className="text-xs sm:text-sm font-black text-[#e21f26] italic uppercase tracking-tight">
                          Site {previewTicket.siteOoredoo1 || 'Non renseigné'} / {previewTicket.siteOoredoo2 || 'Non renseigné'} : {SLIDES_CONFIG[previewSlideIndex].title}
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-[#e21f26] font-extrabold italic uppercase tracking-wider">
                          As Built Installation FH
                        </span>
                      </div>
                    )}

                    {/* Slide Content: Cover Slide Layout or dynamic slots grid */}
                    {SLIDES_CONFIG[previewSlideIndex].isCover ? (
                      <div id="cover-slide-content" className="flex-1 w-full relative flex items-center justify-between font-sans overflow-hidden">
                        {/* Background Diamond Pattern - Smaller and finer */}
                        <div 
                          className="absolute inset-0 opacity-10 pointer-events-none" 
                          style={{ 
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Cpath d='M15 0l15 15-15 15L0 15z' fill='%23ffffff' /%3E%3C/svg%3E")`,
                            backgroundSize: '20px 20px',
                            backgroundPosition: 'center'
                          }} 
                        />

                        {/* Left Huge Textured Red Block - Moved up and refined scalloped border */}
                        <div className="absolute left-4 top-[45%] -translate-y-1/2 w-[45%] h-[60%] bg-[#e21f26] p-4 flex flex-col justify-center text-left text-white shadow-xl z-10">
                          {/* Bubbly border circles - Single row perimeter */}
                          {/* Top */}
                          <div className="absolute -top-3 left-0 right-0 flex justify-between pointer-events-none">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div key={`t-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
                            ))}
                          </div>
                          {/* Bottom */}
                          <div className="absolute -bottom-3 left-0 right-0 flex justify-between pointer-events-none">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div key={`b-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
                            ))}
                          </div>
                          {/* Left - Exclude top/bottom corners to avoid vertical stacking clusters */}
                          <div className="absolute -left-3 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={`l-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
                            ))}
                          </div>
                          {/* Right - Exclude top/bottom corners */}
                          <div className="absolute -right-3 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={`r-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
                            ))}
                          </div>
                          
                          {/* Content of Red Block */}
                          <div className="space-y-3 my-auto pl-4 md:pl-8 font-sans select-none z-10">
                            <h2 className="text-xs md:text-sm font-extrabold text-white tracking-tight italic mb-2 uppercase leading-tight">
                              MW Links installation Ooredoo
                            </h2>
                            
                            <div className="space-y-2 text-[9px] md:text-xs font-sans font-medium text-white/95">
                              <div className="flex items-center gap-1">
                                <span className="italic font-bold">Site Ooredoo : ...</span>
                                <span className="font-black italic px-1 text-white text-[9px] md:text-xs">
                                  {previewTicket.siteOoredoo1 || "Non renseigné"}
                                </span>
                                <span className="italic font-bold">...</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="italic font-bold">Site Ooredoo : ......</span>
                                <span className="font-black italic px-1 text-white text-[9px] md:text-xs">
                                  {previewTicket.siteOoredoo2 || "Non renseigné"}
                                </span>
                                <span className="italic font-bold">.......</span>
                              </div>

                              <div className="flex items-center gap-1 pt-1">
                                <span className="italic font-bold">Date As Built : ...</span>
                                <span className="italic font-black text-white">
                                  {previewTicket.dateAsBuilt || "Non renseignée"}
                                </span>
                                <span className="italic font-bold">..........</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top Right Header Banner: As Built Installation FH */}
                        <div className="absolute top-4 right-0 flex flex-col items-end select-none z-10">
                          <div className="flex items-center">
                            <div className="bg-[#e21f26] text-white text-[9px] md:text-[10px] font-black italic px-6 py-2 shadow-md uppercase tracking-wider rounded-l-md">
                              As Built Installation FH
                            </div>
                            <div className="w-2.5 h-[1.5px] bg-[#e21f26]" />
                          </div>
                          <div className="w-48 h-[1.5px] bg-[#e21f26] mt-1 mr-0" />
                        </div>
                      </div>
                    ) : (
                      <div className={`grid gap-2.5 my-auto py-0.5 ${
                        SLIDES_CONFIG[previewSlideIndex].slots.length === 2 ? 'grid-cols-2' :
                        SLIDES_CONFIG[previewSlideIndex].slots.length === 4 ? 'grid-cols-4' :
                        'grid-cols-3'
                      }`}>
                        {SLIDES_CONFIG[previewSlideIndex].slots.map(slot => {
                          const activeSlideId = SLIDES_CONFIG[previewSlideIndex].id;
                          const uploadedUrl = previewTicket.photos && previewTicket.photos[activeSlideId]
                            ? previewTicket.photos[activeSlideId][slot.id]
                            : undefined;
                          const hasPhoto = !!uploadedUrl;
                          const previewImg = getPhotoPreviewUrl(uploadedUrl, slot.id);
                          const isUploadingSlot = uploadingSlotKey === `${activeSlideId}_${slot.id}`;

                          return (
                            <div 
                              key={slot.id} 
                              id={`canvas-slot-${slot.id}`}
                              className="border-2 border-[#e21f26] rounded-xl p-1.5 flex flex-col justify-between h-28 md:h-34 relative pt-4 group/canvas-slot shadow-sm bg-transparent"
                            >
                              {/* Attached Red rectangle label tab */}
                              <div className="absolute -top-2 left-3 bg-[#e21f26] text-white text-[7px] md:text-[8px] font-black italic px-2 py-0.5 rounded border border-red-750 uppercase shadow-sm tracking-wide z-10">
                                {slot.label}
                              </div>

                              <div className="flex-1 rounded-md overflow-hidden relative flex items-center justify-center bg-transparent">
                                {isUploadingSlot ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/90 text-center p-1">
                                    <RefreshCw size={14} className="animate-spin text-[#e21f26] mb-1" />
                                    <span className="text-[7px] font-black text-[#e21f26] uppercase">Compression et envoi...</span>
                                  </div>
                                ) : hasPhoto ? (
                                  <>
                                    <img 
                                      src={previewImg} 
                                      alt={slot.label}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                    {/* Interactive Action Overlay on Hover right in the slide */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/canvas-slot:opacity-100 flex items-center justify-center gap-1.5 transition-all">
                                      <button
                                        id={`btn-canvas-del-${slot.id}`}
                                        type="button"
                                        onClick={() => handlePhotoDelete(previewTicket.id, activeSlideId, slot.id)}
                                        className="p-1 bg-red-600 hover:bg-red-500 text-white rounded shadow transition-transform hover:scale-110 cursor-pointer text-[8px] font-bold"
                                        title="Supprimer de la diapositive"
                                      >
                                        Suppr.
                                      </button>
                                      <label 
                                        htmlFor={`canvas-file-replace-${slot.id}`}
                                        className="p-1 bg-white text-slate-900 hover:bg-slate-100 rounded shadow transition-transform hover:scale-110 cursor-pointer text-[8px] font-bold"
                                      >
                                        Changer
                                      </label>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center p-1 flex flex-col items-center justify-center">
                                    <Upload size={12} className="mb-0.5 opacity-50 text-[#e21f26]" />
                                    <span className="text-[6.5px] font-black text-[#e21f26] italic block uppercase">En attente terrain</span>
                                    <label 
                                      htmlFor={`canvas-file-replace-${slot.id}`}
                                      className="text-[6.5px] text-[#e21f26] font-black underline hover:text-red-700 block mt-0.5 cursor-pointer uppercase italic"
                                    >
                                      Ajouter
                                    </label>
                                  </div>
                                )}

                                {/* Hidden file input for slide adjustments */}
                                <input
                                  id={`canvas-file-replace-${slot.id}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (file) {
                                      handlePhotoUpload(previewTicket.id, activeSlideId, slot.id, file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </div>

                              {/* Cloud CDN info if exists */}
                              {hasPhoto && (
                                <div className="text-[6.5px] text-slate-400 truncate mt-0.5 font-mono select-all">
                                  {uploadedUrl}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Slide Footer with brand specifications */}
                    <div className="flex items-end justify-between border-t border-slate-250 pt-2 text-[9px] text-slate-400 shrink-0">
                      {/* Bottom Left Logo: EXACT Ooredoo Business Logo placement */}
                      <div className="flex flex-col items-start select-none scale-[0.8] origin-bottom-left">
                        <div className="flex items-center -space-x-[2px]">
                          {['o', 'o', 'r', 'e', 'd', 'o', 'o'].map((letter, i) => (
                            <div 
                              key={i} 
                              className="w-4.5 h-4.5 rounded-full bg-[#e21f26] flex items-center justify-center shadow-sm"
                            >
                              <span className="text-white text-[10px] font-black font-sans leading-none">
                                {letter}
                              </span>
                            </div>
                          ))}
                        </div>
                        <span className="text-slate-500 font-extrabold tracking-[0.3em] text-[7px] uppercase mt-1 pl-0.5">
                          business
                        </span>
                      </div>

                      {/* Confidential Clause */}
                      <div className="font-semibold text-slate-400 hidden sm:block font-sans italic text-[8px] sm:text-[9px]">
                        Confidentiel • As Built FH • ID: {previewTicket.id}
                      </div>

                      {/* Slide Numbering: bottom right, in red */}
                      <div className="text-right flex flex-col items-end">
                        <span className="font-black text-lg text-[#e21f26] font-mono leading-none">
                          {previewSlideIndex + 1}
                        </span>
                      </div>
                    </div>

                  </div>

                {/* Canvas Controls */}
                <div className="flex items-center gap-3">
                  <button
                    id="prev-slide-btn"
                    onClick={() => setPreviewSlideIndex(p => Math.max(0, p - 1))}
                    disabled={previewSlideIndex === 0}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 border border-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    Slide {previewSlideIndex + 1} / {SLIDES_CONFIG.length}
                  </span>
                  <button
                    id="next-slide-btn"
                    onClick={() => setPreviewSlideIndex(p => Math.min(SLIDES_CONFIG.length - 1, p + 1))}
                    disabled={previewSlideIndex === SLIDES_CONFIG.length - 1}
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-950 border border-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                id="btn-close-modal-bottom"
                onClick={() => {
                  setPreviewTicket(null);
                  setExportSuccess(false);
                }}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-ppt-export-emergency"
                  onClick={() => emergencyExportPPT(previewTicket)}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-orange-600/15 transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Utiliser si le bouton principal ne fonctionne pas"
                >
                  <Download size={13} /> Secours (Sans images)
                </button>
                <button
                  id="btn-ppt-export-trigger"
                  onClick={() => handleExportPPT(previewTicket)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-red-600/15 hover:shadow-red-500/25 transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={13} /> Lancer l'exportation finale (PPT)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Deletion Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 m-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Confirmation de suppression</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Cette action est définitive et irréversible.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le ticket <span className="font-mono text-red-400 font-bold">{ticketToDelete}</span> ? Toutes les photos et diapositives associées seront supprimées.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-red-600/15 transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
