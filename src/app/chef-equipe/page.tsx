import React, { useState, useEffect } from 'react';
import {
  LogOut,
  User,
  Users,
  CheckCircle,
  FileText,
  Upload,
  X,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react';
import EtudeRFILossModule from '../../components/EtudeRFILoss.tsx';
import GenieCivilModule from '../../components/GenieCivilModule.tsx';
import SmttLogo from '../../components/SmttLogo.tsx';
import { AppNotification, AsBuiltReportRecord, TicketB2CRecord } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase.js';
import { compressImage } from '../../utils/imageCompressor.js';
import {
  fetchTicketsB2C,
  updateTicketB2CPlanificationAndStatut,
  subscribeTicketsB2CRealtime,
  fetchAsBuiltReportsWithPhotos,
  ensureAsBuiltReport,
  uploadSlidePhotoToStorage,
  deleteSlidePhotoFromDatabase,
  submitAsBuiltReportToAdmin,
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
  status: 'Créé' | 'Planifié' | 'En cours' | 'Rapport Soumis' | 'Rapport Validé';
  rawStatut?: string;
  siteOoredoo1?: string;
  siteOoredoo2?: string;
  dateAsBuilt?: string;
  technicienId?: string | null;
  technicienNom?: string;
  technicienZone?: string;
  datePlanification?: string;
  supabaseReportId?: string;
  photos?: Record<string, Record<string, string>>; // slideId -> slotId -> url
  slideValidations?: Record<string, { validated: boolean; validatedBy?: string; date?: string }>;
}

interface ChefEquipePageProps {
  fullName: string;
  userId?: string;
  userRole?: string;
  userZone?: string;
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

  // Curated telecom fallbacks for legacy demo mock URLs
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

export default function ChefEquipePage({
  fullName,
  userId,
  userRole,
  userZone,
  onLogout,
}: ChefEquipePageProps) {
  // Verrouillé strictement sur le rôle du profil (Chef_Equipe / Technicien)
  const [activeView, setActiveView] = useState<'tickets' | 'rfi' | 'gc'>('tickets');

  const [tickets, setTickets] = useState<Admin1Ticket[]>([]);

  // Chef d'équipe active states
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeSlideTab, setActiveSlideTab] = useState<string>('page1_cover');
  const [chefFeedback, setChefFeedback] = useState<string>('');
  const [savingPlanif, setSavingPlanif] = useState<boolean>(false);
  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const mapSupabaseTicketToAdmin1 = (
    t: TicketB2CRecord,
    reports: AsBuiltReportRecord[]
  ): Admin1Ticket => {
    const matchedReport = reports.find(
      (r) =>
        r.ticket_id === t.id ||
        r.study_id === t.id ||
        (t.code_site && r.code_site_client === t.code_site)
    );
    const rawStatut = (matchedReport?.statut || t.statut || 'Créé').toUpperCase();
    const mappedStatus: Admin1Ticket['status'] =
      rawStatut.includes('VALID')
        ? 'Rapport Validé'
        : rawStatut.includes('SOUMIS')
        ? 'Rapport Soumis'
        : rawStatut.includes('COURS')
        ? 'En cours'
        : rawStatut.includes('PLAN')
        ? 'Planifié'
        : 'Créé';

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
      rawStatut: t.statut || 'Créé',
      siteOoredoo1: matchedReport?.nom_site_client || t.code_site || t.nom_site || 'Site Ooredoo',
      siteOoredoo2: t.zone || t.technicien?.zone || 'Zone',
      dateAsBuilt: matchedReport?.date_realisation || t.date_planification || '',
      technicienId: t.technicien_id,
      technicienNom: t.technicien?.nom || undefined,
      technicienZone: t.technicien?.zone || t.zone || undefined,
      datePlanification: t.date_planification || '',
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

    let unsubTickets = () => {};
    let unsubAsBuilt = () => {};

    if (isSupabaseConfigured) {
      const loadSupabaseData = async () => {
        try {
          const [remoteTickets, remoteReports] = await Promise.all([
            fetchTicketsB2C(),
            fetchAsBuiltReportsWithPhotos(),
          ]);
          if (remoteTickets.length > 0) {
            setTickets(remoteTickets.map((t) => mapSupabaseTicketToAdmin1(t, remoteReports)));
          }
        } catch (err) {
          console.error('Erreur synchronisation Supabase ChefEquipe:', err);
        }
      };

      loadSupabaseData();
      unsubTickets = subscribeTicketsB2CRealtime(loadSupabaseData);
      unsubAsBuilt = subscribeAsBuiltRealtime(loadSupabaseData);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubTickets();
      unsubAsBuilt();
    };
  }, []);

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

  const addNotification = (message: string, type: AppNotification['type'] = 'info', ticketId?: string) => {
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      ticketId,
      senderName: fullName
    };
    const updated = [newNotif, ...notifications];
    saveNotifications(updated);
  };

  // File Upload Handlers (Supabase Storage 'as-built-files' & local fallback)
  const handlePhotoUpload = async (ticketId: string, slideId: string, slotId: string, file: File) => {
    const MAX_RAW_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_RAW_SIZE) {
      setChefFeedback("⚠️ Fichier trop volumineux. La taille maximale brute autorisée est de 25 MO.");
      setTimeout(() => setChefFeedback(''), 5000);
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
            nomSousTraitant: fullName,
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
          setChefFeedback('✅ Photo compressée et téléversée dans Supabase Storage (as-built-files).');
          setTimeout(() => setChefFeedback(''), 3000);
          return;
        } catch (err: any) {
          console.error('Erreur upload Supabase:', err);
          setChefFeedback(`⚠️ Erreur upload Supabase : ${err?.message || 'échec'}`);
          setTimeout(() => setChefFeedback(''), 5000);
          return;
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
        console.error('Erreur suppression photo Supabase:', err);
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

  // Update ticket date_planification & statut in real time on Supabase
  const handleUpdateTicketPlanifAndStatut = async (
    ticketId: string,
    updates: { date_planification?: string; statut?: string }
  ) => {
    const mappedStatus: Admin1Ticket['status'] | undefined = updates.statut
      ? updates.statut.toUpperCase().includes('VALID')
        ? 'Rapport Validé'
        : updates.statut.toUpperCase().includes('SOUMIS')
        ? 'Rapport Soumis'
        : updates.statut.toUpperCase().includes('COURS')
        ? 'En cours'
        : updates.statut.toUpperCase().includes('PLAN')
        ? 'Planifié'
        : 'Créé'
      : undefined;

    const updated = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            datePlanification:
              updates.date_planification !== undefined ? updates.date_planification : t.datePlanification,
            finInstallation:
              updates.date_planification !== undefined ? updates.date_planification : t.finInstallation,
            rawStatut: updates.statut || t.rawStatut,
            status: mappedStatus || t.status,
          }
        : t
    );
    saveTickets(updated);

    if (isSupabaseConfigured && isUuid(ticketId)) {
      setSavingPlanif(true);
      try {
        await updateTicketB2CPlanificationAndStatut(ticketId, updates);
        setChefFeedback('✅ Planification / Statut mis à jour en temps réel dans Supabase.');
        setTimeout(() => setChefFeedback(''), 3000);
      } catch (err: any) {
        setChefFeedback(`⚠️ Erreur mise à jour Supabase : ${err?.message || 'échec'}`);
      } finally {
        setSavingPlanif(false);
      }
    }
  };

  // Toggle slide validation for Chef d'équipe
  const handleToggleSlideValidationTicket = (ticketId: string, slideId: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        const slideValidations = { ...(t.slideValidations || {}) };
        const isVal = slideValidations[slideId]?.validated || false;

        slideValidations[slideId] = {
          validated: !isVal,
          validatedBy: !isVal ? fullName : undefined,
          date: !isVal ? new Date().toLocaleString('fr-FR') : undefined
        };

        return { ...t, slideValidations };
      }
      return t;
    });
    saveTickets(updated);
  };

  // Update Cover parameters (Site Ooredoo 1, Site Ooredoo 2, Date As Built, Fin Installation)
  const handleCoverUpdate = (ticketId: string, field: 'siteOoredoo1' | 'siteOoredoo2' | 'dateAsBuilt' | 'finInstallation', value: string) => {
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, [field]: value };
      }
      return t;
    });
    saveTickets(updated);
  };

  const handleChefSubmit = async (ticketId: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    if (!targetTicket.finInstallation && !targetTicket.datePlanification && !isSupabaseConfigured) {
      setChefFeedback(`⚠️ Impossible de soumettre : Veuillez renseigner la "Fin Installation" sur la page de garde.`);
      setTimeout(() => setChefFeedback(''), 5000);
      return;
    }

    let reportId = targetTicket.supabaseReportId;
    if (isSupabaseConfigured) {
      try {
        reportId = await ensureAsBuiltReport({
          existingReportId: targetTicket.supabaseReportId,
          ticketId: isUuid(ticketId) ? ticketId : undefined,
          studyId: ticketId,
          typeRapport: 'FH',
          nomSiteClient: targetTicket.siteOoredoo1 || targetTicket.configuration,
          codeSiteClient: targetTicket.siteOoredoo1 || ticketId,
          nomSousTraitant: fullName,
          dateRealisation: targetTicket.dateAsBuilt || undefined,
        });
        await submitAsBuiltReportToAdmin(reportId);
        if (isUuid(ticketId)) {
          await updateTicketB2CPlanificationAndStatut(ticketId, { statut: 'SOUMIS' });
        }
      } catch (err: any) {
        setChefFeedback(`⚠️ Erreur lors de la soumission Supabase : ${err?.message || 'échec'}`);
        return;
      }
    }

    // Change status to Rapport Soumis
    const updated = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, supabaseReportId: reportId, status: 'Rapport Soumis' as const, rawStatut: 'SOUMIS' };
      }
      return t;
    });

    saveTickets(updated);
    
    // Add notification for Admin 1
    addNotification(
      `Rapport soumis pour le ticket ${ticketId} par ${fullName}`,
      'success',
      ticketId
    );

    setChefFeedback(`🎉 Rapport "As Built FH" soumis avec succès pour le ticket ${ticketId} ! L'administrateur a été notifié.`);
    setTimeout(() => {
      setChefFeedback('');
    }, 8000);
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

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div id="chef-portal" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-600/30">
      
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
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <User size={13} className="text-red-500" />
            <span className="font-semibold">{fullName}</span>
            <span className="text-[9px] text-slate-500 font-mono">
              ({userRole || "Chef d'équipe"}{userZone ? ` • ${userZone}` : ''})
            </span>
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
      <div id="notice-banner" className="border-b text-center py-2 px-4 text-xs font-semibold tracking-wide transition-colors bg-orange-950/40 border-orange-900/50 text-orange-300">
        <p>👷 Mode Chef d'Équipe : Remplissage des rapports, téléversement de photos (compression auto 1280px JPEG 80%) par slide, soumission finale.</p>
      </div>

      {/* Main Container - Verrouillé sur Chef d'équipe */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Tab View Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl w-fit border border-slate-800">
          <button
            onClick={() => setActiveView('tickets')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
        </div>

        {activeView === 'rfi' ? (
          <div className="bg-white p-6 rounded-2xl shadow-xl">
            <EtudeRFILossModule currentUserRole="Chef d'équipe" currentUserName={fullName} />
          </div>
        ) : activeView === 'gc' ? (
          <div className="space-y-6">
            <GenieCivilModule currentUserRole="Chef d'équipe" currentUserName={fullName} />
          </div>
        ) : (
          /* =======================================
             CHEF D'EQUIPE PORTAL WORKSPACE
             ======================================= */
          <div id="chef-workspace" className="space-y-6">
            
            {/* Ticket Selector For Chef */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Users size={18} className="text-orange-500" />
                <h2 className="font-extrabold text-xs text-white uppercase tracking-wider">Sélectionner un ticket assigné à traiter</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tickets.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-slate-500 text-xs">
                    Aucun ticket assigné en cours.
                  </div>
                ) : (
                  tickets.map((t) => {
                    const { uploadedCount, totalSlots } = getPhotoStats(t);
                    const isSelected = selectedTicketId === t.id;
                    return (
                      <button
                        key={t.id}
                        id={`select-tkt-btn-${t.id}`}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setActiveSlideTab('page1_cover');
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-24 ${
                          isSelected
                            ? 'bg-orange-950/40 border-orange-500/80 shadow shadow-orange-500/10'
                            : 'bg-slate-950 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-orange-400 font-extrabold text-xs">{t.id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            t.status === 'Rapport Validé' 
                              ? 'bg-emerald-950 text-emerald-400' 
                              : t.status === 'Rapport Soumis' 
                                ? 'bg-amber-950 text-amber-400' 
                                : 'bg-slate-900 text-slate-500'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-white font-semibold truncate w-full">{t.configuration}</div>
                        <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-900">
                          <span>Owner: <strong className="text-slate-200">{t.owner}</strong></span>
                          <span className="font-bold text-orange-400">{uploadedCount}/{totalSlots} Photos</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Ticket Workspace */}
            {activeTicket ? (
              <div id="chef-interactive-workspace" className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                
                {/* Global Info Panel */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-850 rounded-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-900/30">
                        Rapport Terrain Actif
                      </span>
                      <span className="text-xs text-slate-500">• {activeTicket.id}</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white">
                      As Built FH - <span className="text-slate-300 font-medium">{activeTicket.configuration}</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Superviseur de Projet : <strong className="text-slate-200">{activeTicket.superviseur}</strong> | Client : <strong className="text-slate-200">{activeTicket.owner}</strong>
                    </p>
                  </div>

                  {/* Submission and indicators */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Photos Téléversées</div>
                      <div className="text-sm font-black text-white">
                        {getPhotoStats(activeTicket).uploadedCount} / {getPhotoStats(activeTicket).totalSlots}
                      </div>
                    </div>
                    
                    <button
                      id="btn-chef-submit-admin"
                      type="button"
                      disabled={activeTicket.status === 'Rapport Soumis' || activeTicket.status === 'Rapport Validé'}
                      onClick={() => handleChefSubmit(activeTicket.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 flex items-center gap-1.5 ${
                        activeTicket.status === 'Rapport Soumis' || activeTicket.status === 'Rapport Validé'
                          ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/30 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/10 cursor-pointer active:scale-95'
                      }`}
                    >
                      <CheckCircle size={14} />
                      {activeTicket.status === 'Rapport Soumis' || activeTicket.status === 'Rapport Validé'
                        ? "Rapport Soumis avec succès"
                        : "SOUMETTRE RAPPORT À L'ADMIN"}
                    </button>
                  </div>
                </div>

                {/* Planification & Statut en temps réel (Technicien / Chef d'équipe) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl items-end text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Calendar size={11} className="text-orange-400" />
                      Date Planification
                    </label>
                    <input
                      type="datetime-local"
                      value={(activeTicket.datePlanification || activeTicket.debutInstallation || '').slice(0, 16)}
                      onChange={(e) =>
                        handleUpdateTicketPlanifAndStatut(activeTicket.id, {
                          date_planification: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs [color-scheme:dark] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Clock size={11} className="text-orange-400" />
                      Statut Intervention
                    </label>
                    <select
                      value={activeTicket.rawStatut || activeTicket.status}
                      onChange={(e) =>
                        handleUpdateTicketPlanifAndStatut(activeTicket.id, {
                          statut: e.target.value,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-white text-xs focus:outline-none focus:border-orange-500"
                    >
                      <option value="Créé">Créé</option>
                      <option value="Planifié">Planifié</option>
                      <option value="En cours">En cours</option>
                      <option value="SOUMIS">SOUMIS</option>
                    </select>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between md:justify-end gap-2 py-1">
                    {activeTicket.technicienNom && (
                      <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                        Technicien : <strong className="text-white">{activeTicket.technicienNom}</strong>
                        {activeTicket.technicienZone ? ` (${activeTicket.technicienZone})` : ''}
                      </span>
                    )}
                    {savingPlanif && <span className="text-orange-400 font-bold">Synchronisation...</span>}
                  </div>
                </div>

                {chefFeedback && (
                  <div className="p-4 bg-orange-950/30 border border-orange-500/30 text-orange-300 rounded-xl text-xs flex items-center gap-3 animate-fade-in">
                    <CheckCircle className="text-orange-400 shrink-0" size={16} />
                    <span>{chefFeedback}</span>
                  </div>
                )}

                {/* Vertical Workspace Tabs (Slides Pages 1 to 12) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left slide selector menu */}
                  <div className="lg:col-span-3 flex flex-col gap-1.5">
                    <div className="text-[10px] text-slate-500 font-bold uppercase px-2 mb-1">Diapositives du PowerPoint</div>
                    {SLIDES_CONFIG.map((slide) => {
                      const uploadedCount = activeTicket.photos && activeTicket.photos[slide.id] 
                        ? Object.keys(activeTicket.photos[slide.id]).length 
                        : 0;
                      const isCover = slide.isCover;
                      const isValidated = activeTicket.slideValidations?.[slide.id]?.validated || false;
                      
                      return (
                        <button
                          key={slide.id}
                          id={`slide-tab-${slide.id}`}
                          onClick={() => setActiveSlideTab(slide.id)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                            activeSlideTab === slide.id
                              ? 'bg-slate-950 border-orange-500 text-orange-400 font-bold shadow-sm'
                              : isValidated
                              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                              : 'bg-slate-950/50 border-slate-900 hover:border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate pr-1">
                            {isValidated && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                            <span className="truncate">{slide.title}</span>
                          </div>
                          {!isCover && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              isValidated
                                ? 'bg-emerald-900 text-emerald-300 font-bold'
                                : uploadedCount === slide.slots.length 
                                  ? 'bg-emerald-950 text-emerald-400' 
                                  : uploadedCount > 0 
                                    ? 'bg-amber-950 text-amber-400' 
                                    : 'bg-slate-900 text-slate-500'
                            }`}>
                              {uploadedCount}/{slide.slots.length}
                            </span>
                          )}
                          {isCover && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter ${
                              isValidated ? 'bg-emerald-900 text-emerald-300' : 'bg-blue-950 text-blue-400'
                            }`}>
                              {isValidated ? 'Validé' : 'Garde'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Slide Tab Upload Editor */}
                  <div className="lg:col-span-9 bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4">
                    {(() => {
                      const activeSlide = SLIDES_CONFIG.find(s => s.id === activeSlideTab);
                      if (!activeSlide) return null;

                      const isCurrentSlideValidated = activeTicket.slideValidations?.[activeSlide.id]?.validated || false;

                      // COVER PAGE EXPLICIT INPUT FIELDS (Page 1)
                      if (activeSlide.isCover) {
                        return (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-2.5">
                              <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-wider">{activeSlide.title}</h4>
                                <p className="text-[10px] text-slate-500">Saisissez les informations qui s'afficheront sur la page de garde du rapport de marque Ooredoo Business.</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleSlideValidationTicket(activeTicket.id, activeSlide.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border shadow-sm shrink-0 ${
                                  isCurrentSlideValidated
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
                                }`}
                              >
                                <CheckCircle size={15} className={isCurrentSlideValidated ? 'text-white' : 'text-emerald-500'} />
                                <span>{isCurrentSlideValidated ? "✓ Slide Validée Conforme" : "Valider la conformité (Chef)"}</span>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                              <div className="space-y-1.5">
                                <label className="text-slate-400 uppercase font-bold text-[10px]">Code Site Source (A) *</label>
                                <input
                                  type="text"
                                  value={activeTicket.siteOoredoo1 || ''}
                                  onChange={(e) => handleCoverUpdate(activeTicket.id, 'siteOoredoo1', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 uppercase font-bold text-[10px]">Code Site Destination (B) *</label>
                                <input
                                  type="text"
                                  value={activeTicket.siteOoredoo2 || ''}
                                  onChange={(e) => handleCoverUpdate(activeTicket.id, 'siteOoredoo2', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-orange-500"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 uppercase font-bold text-[10px]">Date As Built *</label>
                                <input
                                  type="date"
                                  value={activeTicket.dateAsBuilt || ''}
                                  onChange={(e) => handleCoverUpdate(activeTicket.id, 'dateAsBuilt', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-slate-400 uppercase font-bold text-[10px]">Fin Installation *</label>
                                <input
                                  type="datetime-local"
                                  value={activeTicket.finInstallation || ''}
                                  onChange={(e) => handleCoverUpdate(activeTicket.id, 'finInstallation', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                                  required
                                />
                              </div>
                            </div>

                            {/* Guard Visual Card */}
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-850 space-y-2 mt-4">
                              <span className="text-[8px] uppercase tracking-widest font-bold text-red-500">Aperçu Layout Ooredoo Business</span>
                              <div className="p-4 bg-slate-950 border border-slate-800 rounded flex flex-col justify-between h-32 font-mono">
                                <div className="border-l-4 border-red-600 pl-2 text-[11px] text-white font-bold uppercase tracking-wider">
                                  MW Links installation Ooredoo
                                </div>
                                <div className="text-[10px] text-slate-400 space-y-0.5">
                                  <div>Site 1 : <strong className="text-white">{activeTicket.siteOoredoo1 || "Non renseigné"}</strong></div>
                                  <div>Site 2 : <strong className="text-white">{activeTicket.siteOoredoo2 || "Non renseigné"}</strong></div>
                                </div>
                                <div className="text-[9px] text-slate-500 text-right space-y-0.5">
                                  <div>Date : {activeTicket.dateAsBuilt || "Non renseignée"}</div>
                                  <div>Fin : {activeTicket.finInstallation ? new Date(activeTicket.finInstallation).toLocaleString('fr-FR') : "Non renseignée"}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // SLIDE IMAGE SLOTS (Pages 2 to 12)
                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-2.5">
                            <div>
                              <h4 className="text-white font-black text-xs uppercase tracking-wider">{activeSlide.title}</h4>
                              <p className="text-[10px] text-slate-500">Glissez-déposez ou cliquez pour charger chaque photo de contrôle obligatoire (compression auto 1280px JPEG).</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleSlideValidationTicket(activeTicket.id, activeSlide.id)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border shadow-sm shrink-0 ${
                                isCurrentSlideValidated
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
                              }`}
                            >
                              <CheckCircle size={15} className={isCurrentSlideValidated ? 'text-white' : 'text-emerald-500'} />
                              <span>{isCurrentSlideValidated ? "✓ Slide Validée Conforme" : "Valider la conformité (Chef)"}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeSlide.slots.map((slot) => {
                              const photoUrl = activeTicket.photos && activeTicket.photos[activeSlide.id] 
                                ? activeTicket.photos[activeSlide.id][slot.id] 
                                : undefined;
                              const previewPath = getPhotoPreviewUrl(photoUrl, slot.id);
                              const isUploadingSlot = uploadingSlotKey === `${activeSlide.id}_${slot.id}`;

                              return (
                                <div 
                                  key={slot.id} 
                                  className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-col justify-between space-y-3.5"
                                >
                                  <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block truncate" title={slot.label}>
                                      {slot.label}
                                    </span>
                                    <span className="text-[8px] text-slate-600 font-mono uppercase">ID: {slot.id}</span>
                                  </div>

                                  {/* Upload Zone */}
                                  <div className="relative h-28 w-full bg-slate-950 rounded-lg border border-dashed border-slate-800 hover:border-orange-500/50 transition-colors flex items-center justify-center overflow-hidden group">
                                    {isUploadingSlot ? (
                                      <div className="flex flex-col items-center justify-center p-3 text-center space-y-1.5 bg-slate-950/90 w-full h-full">
                                        <RefreshCw size={18} className="text-orange-400 animate-spin" />
                                        <span className="text-[10px] font-bold text-orange-300">Compression et envoi...</span>
                                      </div>
                                    ) : photoUrl ? (
                                      <>
                                        <img 
                                          src={previewPath} 
                                          alt={slot.label}
                                          referrerPolicy="no-referrer"
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button
                                            id={`btn-del-photo-${activeSlide.id}-${slot.id}`}
                                            type="button"
                                            onClick={() => handlePhotoDelete(activeTicket.id, activeSlide.id, slot.id)}
                                            className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs cursor-pointer active:scale-95 transition-all shadow-md"
                                            title="Supprimer la photo"
                                          >
                                            <X size={13} />
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-3 text-center space-y-1 hover:bg-slate-900/40">
                                        <Upload size={18} className="text-slate-600 group-hover:text-orange-500 transition-colors" />
                                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-300">Ajouter Photo</span>
                                        <span className="text-[8px] text-slate-600 font-mono block">Compression auto JPEG</span>
                                        <input
                                          id={`input-${activeSlide.id}-${slot.id}`}
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            if (file) {
                                              handlePhotoUpload(activeTicket.id, activeSlide.id, slot.id, file);
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    )}
                                  </div>

                                  {/* Bottom Slot Sync Label */}
                                  <div className="flex items-center justify-between text-[9px] text-slate-500">
                                    <span>État : {photoUrl ? <strong className="text-emerald-500">Chargé</strong> : "Vide"}</span>
                                    {photoUrl && <span className="font-mono text-slate-600 truncate max-w-[90px]">{photoUrl}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-850 p-16 text-center rounded-2xl">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <FileText className="opacity-10 w-12 h-12 text-slate-400" />
                  <p className="font-bold text-slate-400">Aucun ticket sélectionné par le Chef d'équipe.</p>
                  <p className="text-[11px] text-slate-600 max-w-sm">Choisissez l'un des tickets assignés dans le panneau supérieur pour lancer l'interface de téléversement As Built.</p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer id="footer-branding" className="border-t border-slate-900 bg-slate-950 py-5 px-6 text-center text-[11px] text-slate-600">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 SMTT B2B | Ticket Manager. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            <span className="text-slate-700">Sécurité TLS 1.3</span>
            <span className="h-3 w-px bg-slate-900" />
            <span className="text-slate-700">Simulation Cloud Storage</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
