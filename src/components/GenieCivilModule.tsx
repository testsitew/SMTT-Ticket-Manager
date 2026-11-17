import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardHat,
  Send,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Building,
  FileText,
  Camera,
  Upload,
  Eye,
  Paperclip,
  Download,
  RefreshCw,
  ZoomIn,
  ShieldCheck,
  CheckCircle,
  Layers
} from 'lucide-react';
import { EtudeRFILoss, AppNotification, AsBuiltData, AsBuiltStepPhoto } from '../types';
import { TravauxGcPage } from './TravauxGcPage';
import { DEFAULT_ASBUILT_STEPS, generateAsBuiltPPTX } from '../utils/asBuiltPptxExport';
import { compressImage } from '../utils/excelExport';
import { compressImage as compressImageFile } from '../utils/imageCompressor.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import {
  fetchAllProfiles,
  fetchAsBuiltReportsWithPhotos,
  ensureAsBuiltReport,
  uploadSlidePhotoToStorage,
  deleteSlidePhotoFromDatabase,
  uploadAttestationSlide9ToStorage,
  clearAttestationSlide9InDatabase,
  submitAsBuiltReportToAdmin,
  validateAsBuiltReportByAdmin,
  deleteGcReportAndTicketFromSupabase,
  clearAllGcReportsFromSupabase,
  subscribeAsBuiltRealtime,
} from '../services/supabaseService';

interface GenieCivilModuleProps {
  currentUserRole: string;
  currentUserName: string;
}

type SlideKey =
  | 'page1_cover'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'
  | 'step5'
  | 'step6'
  | 'step7'
  | 'page9_attestation';

interface FeedbackState {
  type: 'success' | 'warning' | 'error';
  message: string;
}

const GC_STORAGE_KEY = 'smtt_gc_studies';

function buildNormalizedPhotos(existingPhotos?: AsBuiltStepPhoto[]): AsBuiltStepPhoto[] {
  return DEFAULT_ASBUILT_STEPS.map((defaultStep) => {
    const match = existingPhotos?.find(
      (p) => p.id === defaultStep.id || p.stepNumber === defaultStep.stepNumber
    );
    if (!match) {
      return { ...defaultStep };
    }
    return {
      ...defaultStep,
      ...match,
      id: defaultStep.id,
      stepNumber: defaultStep.stepNumber,
      title: defaultStep.title,
      description: defaultStep.description,
    };
  });
}

function getNormalizedAsBuiltData(study: EtudeRFILoss, fallbackUserName: string): AsBuiltData {
  const existing = study.asBuiltData || study.report?.asBuiltData;
  const fallbackNomSite =
    study.report?.donneesLOS?.header?.nomSite || study.site || 'Site Client Ooredoo';
  const fallbackCodeSite =
    study.report?.donneesLOS?.header?.codeSite || study.id;
  const fallbackSousTraitant =
    study.maintenancier ||
    study.report?.donneesLOS?.header?.maintenancier?.nom ||
    (study.chefsEquipe?.length ? study.chefsEquipe.join(', ') : fallbackUserName || 'SMTT');
  const fallbackDate =
    study.datePlanification ||
    study.report?.donneesLOS?.header?.dateLOS ||
    new Date().toISOString().split('T')[0];

  return {
    nomSiteClient: existing?.nomSiteClient || fallbackNomSite,
    codeSiteClient: existing?.codeSiteClient || fallbackCodeSite,
    nomSousTraitant: existing?.nomSousTraitant || fallbackSousTraitant,
    dateRealisation: existing?.dateRealisation || fallbackDate,
    photos: buildNormalizedPhotos(existing?.photos),
    attestationImageUrl: existing?.attestationImageUrl || existing?.attestationScellementUrl,
    attestationScellementUrl: existing?.attestationScellementUrl || existing?.attestationImageUrl,
    attestationScellementName: existing?.attestationScellementName,
    attestationDateUpload: existing?.attestationDateUpload,
    status: existing?.status || 'DRAFT',
    workflowStep: existing?.workflowStep || 2,
    submittedBy: existing?.submittedBy,
    submittedAt: existing?.submittedAt,
    updatedAt: existing?.updatedAt,
    statusValidationAdmin: existing?.statusValidationAdmin || 'En attente',
    validePar: existing?.validePar,
    dateValidation: existing?.dateValidation,
    remarquesGenerales: existing?.remarquesGenerales,
  };
}

function getUploadedPhotoCount(study: EtudeRFILoss): number {
  const photos = buildNormalizedPhotos(
    study.asBuiltData?.photos || study.report?.asBuiltData?.photos
  );
  return photos.filter((p) => Boolean(p.photoUrl)).length;
}

function getTicketDisplayStatus(study: EtudeRFILoss): {
  label: string;
  badgeClass: string;
} {
  const asBuilt = study.asBuiltData || study.report?.asBuiltData;
  const uploadedCount = getUploadedPhotoCount(study);

  if (asBuilt?.status === 'VALIDATED' || asBuilt?.statusValidationAdmin === 'Validé') {
    return {
      label: 'Rapport Validé',
      badgeClass: 'bg-emerald-950 text-emerald-400 border border-emerald-900/40',
    };
  }
  if (asBuilt?.status === 'SUBMITTED' || asBuilt?.statusValidationAdmin === "Soumis à l'admin") {
    return {
      label: 'Rapport Soumis',
      badgeClass: 'bg-amber-950 text-amber-400 border border-amber-900/40',
    };
  }
  if (uploadedCount > 0) {
    return {
      label: 'En cours',
      badgeClass: 'bg-orange-950 text-orange-400 border border-orange-900/40',
    };
  }
  return {
    label: 'Créé',
    badgeClass: 'bg-slate-900 text-slate-400 border border-slate-800',
  };
}

export default function GenieCivilModule({
  currentUserRole,
  currentUserName,
}: GenieCivilModuleProps) {
  const isAdmin =
    currentUserRole.toLowerCase().includes('admin') ||
    currentUserRole.toLowerCase().includes('suivi');
  const isChefEquipe = !isAdmin;

  const [studies, setStudies] = useState<EtudeRFILoss[]>([]);
  const [availableChefs, setAvailableChefs] = useState<string[]>([
    'Sami K.',
    'Amine M.',
    'Hassen T.',
    'Mohamed A.',
    'Riadh B.',
    'Karim Z.',
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const [activeSlideKey, setActiveSlideKey] = useState<SlideKey>('page1_cover');

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStepName, setExportStepName] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Dispatching Modal State (Admin)
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchStudyId, setDispatchStudyId] = useState<string>('__NEW__');
  const [dispatchNewSiteName, setDispatchNewSiteName] = useState<string>('');
  const [dispatchNewCodeSite, setDispatchNewCodeSite] = useState<string>('');
  const [dispatchNewClient, setDispatchNewClient] = useState<string>('Ooredoo');
  const [dispatchNewCgps, setDispatchNewCgps] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dispatchChefs, setDispatchChefs] = useState<string[]>(['']);
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // Consulter GC Details Modal (Admin)
  const [selectedGcReportStudy, setSelectedGcReportStudy] = useState<EtudeRFILoss | null>(null);

  // Delete Confirmation Modals (Single Ticket & Clear All GC)
  const [studyToDelete, setStudyToDelete] = useState<EtudeRFILoss | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);
  const [isDeletingGc, setIsDeletingGc] = useState<boolean>(false);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (type: FeedbackState['type'], message: string, duration = 5500) => {
    setFeedback({ type, message });
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Load GC studies from localStorage (empty by default, no mock seeds) + Supabase Realtime
  useEffect(() => {
    try {
      const storedGcStudies = localStorage.getItem(GC_STORAGE_KEY);
      if (storedGcStudies) {
        const parsed = JSON.parse(storedGcStudies);
        if (Array.isArray(parsed)) {
          setStudies(parsed);
        }
      } else {
        setStudies([]);
      }

      const storedUsers = localStorage.getItem('smtt_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        const chefs = users
          .filter((u: any) =>
            u.role === "Chef d'équipe" ||
            u.role === "Chef d'Equipe" ||
            u.role === 'Chef_Equipe' ||
            u.role === 'Technicien'
          )
          .map((u: any) => u.fullName || u.nom || u.username);
        if (chefs.length > 0) {
          setAvailableChefs(
            Array.from(
              new Set([
                ...chefs,
                'Sami K.',
                'Amine M.',
                'Hassen T.',
                'Mohamed A.',
                'Riadh B.',
                'Karim Z.',
              ])
            )
          );
        }
      }
    } catch (e) {
      console.error('Erreur de chargement des études GC:', e);
    }

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === GC_STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue || '[]');
          setStudies(Array.isArray(parsed) ? parsed : []);
        } catch {
          setStudies([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);

    if (!isSupabaseConfigured) {
      return () => {
        window.removeEventListener('storage', handleStorageSync);
      };
    }

    const syncFromSupabase = async () => {
      try {
        const [reports, profs] = await Promise.all([
          fetchAsBuiltReportsWithPhotos(),
          fetchAllProfiles().catch(() => []),
        ]);

        if (profs.length > 0) {
          const remoteChefs = profs
            .filter(
              (p) =>
                p.actif !== false &&
                (p.role === 'Chef_Equipe' ||
                  p.role === 'Technicien' ||
                  p.role === "Chef d'équipe")
            )
            .map((p) => p.nom);
          if (remoteChefs.length > 0) {
            setAvailableChefs((prev) => Array.from(new Set([...remoteChefs, ...prev])));
          }
        }

        const gcReports = reports.filter(
          (rep) => (rep.type_rapport || 'GC').toUpperCase() !== 'FH'
        );

        setStudies((prevStudies) => {
          // Keep purely local unsynced items only if they were never linked to a deleted Supabase record
          const localOnly = prevStudies.filter((s) => !s.supabaseReportId);
          const next: EtudeRFILoss[] = [...localOnly];

          gcReports.forEach((rep) => {
            const existingFromPrev = prevStudies.find(
              (s) =>
                s.supabaseReportId === rep.id ||
                (rep.study_id && s.id === rep.study_id) ||
                (rep.code_site_client &&
                  (s.asBuiltData?.codeSiteClient === rep.code_site_client ||
                    s.id === rep.code_site_client))
            );

            const matchInNextIdx = next.findIndex(
              (s) =>
                s.supabaseReportId === rep.id ||
                (rep.study_id && s.id === rep.study_id) ||
                (rep.code_site_client &&
                  (s.asBuiltData?.codeSiteClient === rep.code_site_client ||
                    s.id === rep.code_site_client))
            );

            const baseTarget = existingFromPrev || (matchInNextIdx >= 0 ? next[matchInNextIdx] : undefined);

            const remotePhotos = buildNormalizedPhotos(
              baseTarget?.asBuiltData?.photos || []
            ).map((step) => {
              const slideNumber = step.stepNumber + 1;
              const matchPhoto = rep.report_photos?.find(
                (rp) => rp.slide_number === slideNumber
              );
              return matchPhoto
                ? { ...step, photoUrl: matchPhoto.photo_url, status: 'Conforme' as const }
                : step;
            });

            const repStatutUpper = (rep.statut || '').toUpperCase();
            const mappedStatus: AsBuiltData['status'] =
              repStatutUpper === 'VALIDE' || repStatutUpper === 'VALIDATED'
                ? 'VALIDATED'
                : repStatutUpper === 'SOUMIS' || repStatutUpper === 'SUBMITTED'
                ? 'SUBMITTED'
                : 'DRAFT';

            const mappedAdminStatus: AsBuiltData['statusValidationAdmin'] =
              mappedStatus === 'VALIDATED'
                ? 'Validé'
                : mappedStatus === 'SUBMITTED'
                ? "Soumis à l'admin"
                : 'En attente';

            if (baseTarget) {
              const mergedAsBuilt: AsBuiltData = {
                ...getNormalizedAsBuiltData(baseTarget, currentUserName),
                supabaseReportId: rep.id,
                nomSiteClient:
                  rep.nom_site_client ||
                  baseTarget.asBuiltData?.nomSiteClient ||
                  baseTarget.site,
                codeSiteClient:
                  rep.code_site_client ||
                  baseTarget.asBuiltData?.codeSiteClient ||
                  baseTarget.id,
                nomSousTraitant:
                  rep.nom_sous_traitant ||
                  baseTarget.asBuiltData?.nomSousTraitant ||
                  'SMTT',
                dateRealisation:
                  rep.date_realisation ||
                  baseTarget.asBuiltData?.dateRealisation ||
                  new Date().toISOString().split('T')[0],
                photos: remotePhotos,
                attestationImageUrl:
                  rep.attestation_slide9_url ||
                  baseTarget.asBuiltData?.attestationImageUrl,
                attestationScellementUrl:
                  rep.attestation_slide9_url ||
                  baseTarget.asBuiltData?.attestationScellementUrl,
                status: mappedStatus,
                statusValidationAdmin: mappedAdminStatus,
                workflowStep: mappedStatus === 'DRAFT' ? 2 : 3,
              };
              const mergedStudy: EtudeRFILoss = {
                ...baseTarget,
                supabaseReportId: rep.id,
                asBuiltData: mergedAsBuilt,
              };

              if (matchInNextIdx >= 0) {
                next[matchInNextIdx] = mergedStudy;
              } else {
                next.push(mergedStudy);
              }
            } else {
              next.unshift({
                id: rep.study_id || rep.id,
                supabaseReportId: rep.id,
                site: rep.nom_site_client || rep.code_site_client || 'Site Ooredoo',
                contactClient: { nom: 'Ooredoo', tel: '' },
                gps: { latitude: '', longitude: '' },
                codesSitesDistants: [],
                dateCreation:
                  (rep.created_at || new Date().toISOString()).split('T')[0],
                action: 'Travaux Génie Civil',
                dateAffectation:
                  (rep.created_at || new Date().toISOString()).split('T')[0],
                datePlanification:
                  rep.date_realisation ||
                  new Date().toISOString().split('T')[0],
                chefsEquipe: [rep.nom_sous_traitant || currentUserName],
                status: mappedStatus === 'VALIDATED' ? 'Terminé' : 'Affecté',
                asBuiltData: {
                  supabaseReportId: rep.id,
                  nomSiteClient: rep.nom_site_client || 'Site Client Ooredoo',
                  codeSiteClient: rep.code_site_client || rep.id,
                  nomSousTraitant: rep.nom_sous_traitant || 'SMTT',
                  dateRealisation:
                    rep.date_realisation ||
                    new Date().toISOString().split('T')[0],
                  photos: remotePhotos,
                  attestationImageUrl: rep.attestation_slide9_url || undefined,
                  attestationScellementUrl:
                    rep.attestation_slide9_url || undefined,
                  status: mappedStatus,
                  statusValidationAdmin: mappedAdminStatus,
                  workflowStep: mappedStatus === 'DRAFT' ? 2 : 3,
                },
              });
            }
          });

          try {
            localStorage.setItem(GC_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore quota issues
          }
          return next;
        });
      } catch (err) {
        console.error('Erreur synchronisation Supabase GC:', err);
      }
    };

    syncFromSupabase();
    const unsub = subscribeAsBuiltRealtime(syncFromSupabase);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      unsub();
    };
  }, [currentUserName]);

  const saveStudies = (updated: EtudeRFILoss[]) => {
    setStudies(updated);
    try {
      localStorage.setItem(GC_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erreur de sauvegarde études GC:', e);
    }
  };

  // Eligible GC studies (transferred from LOS or assigned)
  const validatedLosStudies = useMemo(
    () =>
      studies.filter(
        (s) =>
          s.status === 'Terminé' ||
          s.status === 'Affecté' ||
          s.status === 'Planifié' ||
          (s.asBuiltData && s.asBuiltData.statusValidationAdmin === 'Validé') ||
          Boolean(s.report) ||
          (s.chefsEquipe && s.chefsEquipe.length > 0)
      ),
    [studies]
  );

  // Filter visible studies by role and search term
  const visibleStudies = useMemo(() => {
    return validatedLosStudies.filter((s) => {
      if (isChefEquipe) {
        if (!s.chefsEquipe || s.chefsEquipe.length === 0) return false;
        const nameLower = currentUserName.toLowerCase();
        const isAssigned = s.chefsEquipe.some(
          (c) =>
            c.toLowerCase().includes(nameLower) ||
            nameLower.includes(c.toLowerCase()) ||
            nameLower === 'sami k.' ||
            nameLower === "chef d'équipe" ||
            nameLower === "chef d'equipe"
        );
        if (!isAssigned) return false;
      }

      if (isAdmin && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          s.site.toLowerCase().includes(term) ||
          s.id.toLowerCase().includes(term) ||
          (s.asBuiltData?.codeSiteClient &&
            s.asBuiltData.codeSiteClient.toLowerCase().includes(term)) ||
          (s.chefsEquipe && s.chefsEquipe.some((c) => c.toLowerCase().includes(term)));
        if (!matches) return false;
      }

      return true;
    });
  }, [validatedLosStudies, isChefEquipe, isAdmin, currentUserName, searchTerm]);

  // Auto-select first study when none selected or selection filtered out
  useEffect(() => {
    if (visibleStudies.length === 0) {
      if (selectedStudyId) setSelectedStudyId('');
      return;
    }
    const exists = visibleStudies.some((s) => s.id === selectedStudyId);
    if (!exists) {
      setSelectedStudyId(visibleStudies[0].id);
      setActiveSlideKey('page1_cover');
    }
  }, [visibleStudies, selectedStudyId]);

  // Ensure Chef d'équipe can never land on Page 9
  useEffect(() => {
    if (isChefEquipe && activeSlideKey === 'page9_attestation') {
      setActiveSlideKey('page1_cover');
    }
  }, [isChefEquipe, activeSlideKey]);

  const activeStudy = useMemo(
    () => visibleStudies.find((s) => s.id === selectedStudyId) || null,
    [visibleStudies, selectedStudyId]
  );

  const activeAsBuiltData = useMemo(
    () => (activeStudy ? getNormalizedAsBuiltData(activeStudy, currentUserName) : null),
    [activeStudy, currentUserName]
  );

  const updateActiveAsBuilt = (
    updatedData: AsBuiltData,
    newStudyStatus?: EtudeRFILoss['status']
  ) => {
    if (!activeStudy) return;
    const updatedStudies = studies.map((s) => {
      if (s.id !== activeStudy.id) return s;
      return {
        ...s,
        status: newStudyStatus || s.status,
        asBuiltData: updatedData,
        report: s.report
          ? { ...s.report, asBuiltData: updatedData }
          : s.report,
      };
    });
    saveStudies(updatedStudies);

    try {
      const storedReport = localStorage.getItem(`rfi_report_${activeStudy.id}`);
      if (storedReport) {
        const parsedReport = JSON.parse(storedReport);
        localStorage.setItem(
          `rfi_report_${activeStudy.id}`,
          JSON.stringify({ ...parsedReport, asBuiltData: updatedData })
        );
      }
    } catch (e) {
      console.error('Erreur synchro report local:', e);
    }
  };

  // Handle cover metadata updates (Admin)
  const handleCoverFieldChange = (
    field: 'nomSiteClient' | 'codeSiteClient' | 'nomSousTraitant' | 'dateRealisation',
    value: string
  ) => {
    if (!activeAsBuiltData) return;
    updateActiveAsBuilt({
      ...activeAsBuiltData,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle photo upload for Slides 2 to 8 (step1..step7) -> Compression + Supabase Storage 'as-built-files'
  const handleStepPhotoUpload = async (stepId: string, file: File) => {
    if (!file || !activeAsBuiltData || !activeStudy) return;
    if (!file.type.startsWith('image/')) {
      showFeedback('warning', 'Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP).');
      return;
    }

    const targetStep = activeAsBuiltData.photos.find((p) => p.id === stepId);
    const slideNumber = targetStep ? targetStep.stepNumber + 1 : 2;
    const nowStamp =
      new Date().toLocaleDateString('fr-FR') +
      ' ' +
      new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setUploadingTarget(stepId);
    try {
      const compressedFile = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        fileName: `slide_${slideNumber}_${Date.now()}.jpg`,
      });

      if (isSupabaseConfigured) {
        const reportId = await ensureAsBuiltReport({
          existingReportId:
            activeAsBuiltData.supabaseReportId || activeStudy.supabaseReportId,
          studyId: activeStudy.id,
          typeRapport: 'GC',
          nomSiteClient: activeAsBuiltData.nomSiteClient,
          codeSiteClient: activeAsBuiltData.codeSiteClient,
          nomSousTraitant: activeAsBuiltData.nomSousTraitant,
          dateRealisation: activeAsBuiltData.dateRealisation,
        });

        const { publicUrl } = await uploadSlidePhotoToStorage({
          reportId,
          slideNumber,
          file: compressedFile,
        });

        const updatedPhotos = activeAsBuiltData.photos.map((p) =>
          p.id === stepId
            ? {
                ...p,
                photoUrl: publicUrl,
                timestamp: nowStamp,
                status: 'Conforme' as const,
              }
            : p
        );

        updateActiveAsBuilt({
          ...activeAsBuiltData,
          supabaseReportId: reportId,
          photos: updatedPhotos,
          updatedAt: new Date().toISOString(),
        });
        showFeedback('success', `Photo Slide ${slideNumber} compressée et envoyée dans Supabase Storage.`);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const rawBase64 = reader.result as string;
            const compressedBase64 = await compressImage(rawBase64);

            const updatedPhotos = activeAsBuiltData.photos.map((p) =>
              p.id === stepId
                ? {
                    ...p,
                    photoUrl: compressedBase64,
                    timestamp: nowStamp,
                    status: 'Conforme' as const,
                  }
                : p
            );

            updateActiveAsBuilt({
              ...activeAsBuiltData,
              photos: updatedPhotos,
              updatedAt: new Date().toISOString(),
            });
            showFeedback('success', 'Photo terrain compressée et enregistrée avec succès.');
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error("Erreur lecture fichier"));
        reader.readAsDataURL(compressedFile);
      });
    } catch (err: any) {
      console.error('Erreur upload photo GC:', err);
      showFeedback('error', err?.message || "Erreur lors de l'envoi de l'image.");
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleStepPhotoDelete = async (stepId: string) => {
    if (!activeAsBuiltData) return;
    const targetStep = activeAsBuiltData.photos.find((p) => p.id === stepId);
    const slideNumber = targetStep ? targetStep.stepNumber + 1 : 2;
    const reportId = activeAsBuiltData.supabaseReportId || activeStudy?.supabaseReportId;

    if (isSupabaseConfigured && reportId) {
      try {
        await deleteSlidePhotoFromDatabase(reportId, slideNumber);
      } catch (err) {
        console.error('Erreur suppression photo Supabase:', err);
      }
    }

    const updatedPhotos = activeAsBuiltData.photos.map((p) =>
      p.id === stepId
        ? { ...p, photoUrl: undefined, timestamp: undefined }
        : p
    );
    updateActiveAsBuilt({
      ...activeAsBuiltData,
      photos: updatedPhotos,
      updatedAt: new Date().toISOString(),
    });
    showFeedback('warning', 'Photo supprimée de cette diapositive.');
  };

  // Handle Attestation Upload (Slide 9 - Admin only)
  const handleAttestationUpload = async (file: File) => {
    if (!file || !activeAsBuiltData || !activeStudy) return;
    const isPdf = file.type === 'application/pdf';
    if (!file.type.startsWith('image/') && !isPdf) {
      showFeedback(
        'warning',
        "Veuillez importer une image (JPG, PNG) ou un PDF du scan de l'Attestation de scellement."
      );
      return;
    }

    const nowDate = new Date().toLocaleDateString('fr-FR');
    setUploadingTarget('attestation');

    try {
      const processedFile = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        fileName: `slide_9_${Date.now()}.jpg`,
      });

      if (isSupabaseConfigured) {
        const reportId = await ensureAsBuiltReport({
          existingReportId:
            activeAsBuiltData.supabaseReportId || activeStudy.supabaseReportId,
          studyId: activeStudy.id,
          typeRapport: 'GC',
          nomSiteClient: activeAsBuiltData.nomSiteClient,
          codeSiteClient: activeAsBuiltData.codeSiteClient,
          nomSousTraitant: activeAsBuiltData.nomSousTraitant,
          dateRealisation: activeAsBuiltData.dateRealisation,
        });

        const { publicUrl } = await uploadAttestationSlide9ToStorage({
          reportId,
          file: processedFile,
        });

        updateActiveAsBuilt({
          ...activeAsBuiltData,
          supabaseReportId: reportId,
          attestationImageUrl: publicUrl,
          attestationScellementUrl: publicUrl,
          attestationScellementName: processedFile.name,
          attestationDateUpload: nowDate,
          updatedAt: new Date().toISOString(),
        });
        showFeedback('success', `Attestation "${processedFile.name}" enregistrée dans as_built_reports (Slide 9).`);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const rawBase64 = reader.result as string;
            const finalDataUrl = processedFile.type.startsWith('image/')
              ? await compressImage(rawBase64)
              : rawBase64;

            updateActiveAsBuilt({
              ...activeAsBuiltData,
              attestationImageUrl: finalDataUrl,
              attestationScellementUrl: finalDataUrl,
              attestationScellementName: processedFile.name,
              attestationDateUpload: nowDate,
              updatedAt: new Date().toISOString(),
            });
            showFeedback('success', `Attestation "${processedFile.name}" importée pour le Slide 9.`);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error("Erreur lecture attestation"));
        reader.readAsDataURL(processedFile);
      });
    } catch (err: any) {
      console.error('Erreur upload attestation:', err);
      showFeedback('error', err?.message || "Impossible d'importer l'attestation de scellement.");
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleAttestationDelete = async () => {
    if (!activeAsBuiltData) return;
    const reportId = activeAsBuiltData.supabaseReportId || activeStudy?.supabaseReportId;
    if (isSupabaseConfigured && reportId) {
      try {
        await clearAttestationSlide9InDatabase(reportId);
      } catch (err) {
        console.error('Erreur suppression attestation Supabase:', err);
      }
    }

    updateActiveAsBuilt({
      ...activeAsBuiltData,
      attestationImageUrl: undefined,
      attestationScellementUrl: undefined,
      attestationScellementName: undefined,
      attestationDateUpload: undefined,
      updatedAt: new Date().toISOString(),
    });
    showFeedback('warning', "L'attestation de scellement a été retirée (Slide 9 vierge).");
  };

  // Submit Report to Admin ("SOUMETTRE RAPPORT À L'ADMIN") -> statut = 'SOUMIS' dans as_built_reports
  const handleSubmitReport = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!activeStudy || !activeAsBuiltData) {
      showFeedback('error', 'Erreur : Aucun ticket Génie Civil actif sélectionné.');
      return;
    }

    const uploadedCount = activeAsBuiltData.photos.filter((p) => Boolean(p.photoUrl)).length;
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      let resolvedReportId =
        activeAsBuiltData.supabaseReportId || activeStudy.supabaseReportId;

      if (isSupabaseConfigured) {
        resolvedReportId = await ensureAsBuiltReport({
          existingReportId: resolvedReportId,
          studyId: activeStudy.id,
          typeRapport: 'GC',
          nomSiteClient: activeAsBuiltData.nomSiteClient,
          codeSiteClient: activeAsBuiltData.codeSiteClient,
          nomSousTraitant: activeAsBuiltData.nomSousTraitant,
          dateRealisation: activeAsBuiltData.dateRealisation,
        });
        await submitAsBuiltReportToAdmin(resolvedReportId);
      }

      const updatedData: AsBuiltData = {
        ...activeAsBuiltData,
        supabaseReportId: resolvedReportId,
        status: 'SUBMITTED',
        workflowStep: 3,
        submittedBy: currentUserName || "Chef d'équipe",
        submittedAt: nowIso,
        updatedAt: nowIso,
        statusValidationAdmin: "Soumis à l'admin",
      };

      updateActiveAsBuilt(updatedData, 'Terminé');

      // Send notification to Admin
      try {
        const storedNotifs = localStorage.getItem('smtt_notifications');
        const existingNotifs: AppNotification[] = storedNotifs ? JSON.parse(storedNotifs) : [];
        const newNotif: AppNotification = {
          id: `NOTIF-GC-SUBMIT-${Date.now()}`,
          type: 'success',
          message: `📋 [As-Built Travaux GC Soumis] ${currentUserName || "Chef d'équipe"} a soumis le rapport du site "${activeStudy.site}" (${activeStudy.id}) avec ${uploadedCount}/7 photos.`,
          timestamp: nowIso,
          isRead: false,
          studyId: activeStudy.id,
          senderName: currentUserName || "Chef d'équipe",
        };
        localStorage.setItem('smtt_notifications', JSON.stringify([newNotif, ...existingNotifs]));
        window.dispatchEvent(new Event('storage'));
      } catch (notifErr) {
        console.warn('Notification admin ignorée:', notifErr);
      }

      if (uploadedCount < 7) {
        showFeedback(
          'success',
          `Rapport soumis à l'Admin (statut SOUMIS) avec ${uploadedCount}/7 photos jointes.`
        );
      } else {
        showFeedback(
          'success',
          `Rapport complet (7/7 photos) soumis à l'Admin (statut SOUMIS) pour "${activeStudy.site}" !`
        );
      }
    } catch (err: any) {
      console.error('Erreur lors de la soumission du rapport GC:', err);
      showFeedback('error', err?.message || 'Erreur lors de la soumission du rapport. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin: Validate & Export PPTX
  const handleAdminExportPPTX = async () => {
    if (!activeStudy || !activeAsBuiltData) {
      showFeedback('error', 'Sélectionnez un ticket avant de générer le PowerPoint.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    setExportStepName('Initialisation du modèle Ooredoo Business...');

    try {
      const reportId = activeAsBuiltData.supabaseReportId || activeStudy.supabaseReportId;
      if (isSupabaseConfigured && reportId) {
        await validateAsBuiltReportByAdmin(reportId);
      }

      const validatedData: AsBuiltData = {
        ...activeAsBuiltData,
        status: 'VALIDATED',
        workflowStep: 3,
        statusValidationAdmin: 'Validé',
        validePar: currentUserName || currentUserRole || 'Admin',
        dateValidation: new Date().toLocaleDateString('fr-FR'),
        updatedAt: new Date().toISOString(),
      };
      updateActiveAsBuilt(validatedData, 'Terminé');

      await generateAsBuiltPPTX(validatedData, (progress, stepName) => {
        setExportProgress(progress);
        setExportStepName(stepName);
      });

      showFeedback(
        'success',
        `PowerPoint officiel 9 slides généré et téléchargé pour "${activeStudy.site}" !`
      );
    } catch (err) {
      console.error('Erreur génération PPTX GC:', err);
      showFeedback('error', 'Erreur lors de la génération du fichier PowerPoint.');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStepName('');
      }, 800);
    }
  };

  // Delete single GC ticket/study (Supabase + localStorage)
  const handleConfirmDeleteSingleStudy = async () => {
    if (!studyToDelete) return;
    setIsDeletingGc(true);
    const target = studyToDelete;

    try {
      if (isSupabaseConfigured) {
        await deleteGcReportAndTicketFromSupabase({
          reportId:
            target.supabaseReportId || target.asBuiltData?.supabaseReportId,
          studyId: target.id,
          codeSiteClient: target.asBuiltData?.codeSiteClient,
        });
      }

      const updated = studies.filter((s) => s.id !== target.id);
      saveStudies(updated);

      // Clean up any localStorage remnants so it never reappears after refresh
      try {
        localStorage.removeItem(`rfi_report_${target.id}`);
        const storedRfi = localStorage.getItem('smtt_rfi_studies');
        if (storedRfi) {
          const parsedRfi: EtudeRFILoss[] = JSON.parse(storedRfi);
          if (Array.isArray(parsedRfi)) {
            const filteredRfi = parsedRfi.filter((s) => s.id !== target.id);
            localStorage.setItem('smtt_rfi_studies', JSON.stringify(filteredRfi));
          }
        }
      } catch {
        // ignore localStorage errors
      }

      if (selectedStudyId === target.id) {
        setSelectedStudyId('');
      }
      if (selectedGcReportStudy?.id === target.id) {
        setSelectedGcReportStudy(null);
      }
      setStudyToDelete(null);
      showFeedback(
        'success',
        `Dossier Génie Civil "${target.site}" (${target.asBuiltData?.codeSiteClient || target.id}) supprimé définitivement.`
      );
    } catch (err: any) {
      console.error('Erreur suppression dossier GC:', err);
      showFeedback(
        'error',
        err?.message || 'Impossible de supprimer ce ticket Génie Civil dans Supabase.'
      );
    } finally {
      setIsDeletingGc(false);
    }
  };

  // Clear ALL GC tickets & reports (Admin only - Supabase + localStorage)
  const handleConfirmClearAllGc = async () => {
    setIsDeletingGc(true);
    try {
      if (isSupabaseConfigured) {
        await clearAllGcReportsFromSupabase();
      }

      const deletedIds = new Set(studies.map((s) => s.id));
      saveStudies([]);
      setSelectedStudyId('');
      setSelectedGcReportStudy(null);

      try {
        deletedIds.forEach((id) => localStorage.removeItem(`rfi_report_${id}`));
        localStorage.removeItem('rfi_report_RFI-8321');
        localStorage.removeItem('rfi_report_RFI-10324');
        localStorage.setItem(GC_STORAGE_KEY, JSON.stringify([]));

        const storedRfi = localStorage.getItem('smtt_rfi_studies');
        if (storedRfi) {
          const parsedRfi: EtudeRFILoss[] = JSON.parse(storedRfi);
          if (Array.isArray(parsedRfi)) {
            const cleanedRfi = parsedRfi.filter(
              (s) =>
                !deletedIds.has(s.id) &&
                s.id !== 'RFI-8321' &&
                s.id !== 'RFI-10324'
            );
            localStorage.setItem('smtt_rfi_studies', JSON.stringify(cleanedRfi));
          }
        }
      } catch {
        // ignore localStorage errors
      }

      setShowClearAllConfirm(false);
      showFeedback(
        'success',
        'Tous les tickets et rapports Génie Civil ont été supprimés (application vierge).'
      );
    } catch (err: any) {
      console.error('Erreur vidage complet GC:', err);
      showFeedback(
        'error',
        err?.message || 'Erreur lors de la suppression globale Génie Civil dans Supabase.'
      );
    } finally {
      setIsDeletingGc(false);
    }
  };

  // Open Dispatch Modal (Admin)
  const openDispatchModal = (studyToDispatch?: EtudeRFILoss) => {
    const target = studyToDispatch || activeStudy || validatedLosStudies[0] || studies[0];
    if (target) {
      setDispatchStudyId(target.id);
      setDispatchDate(
        target.datePlanification ||
          target.dateAffectation ||
          new Date().toISOString().split('T')[0]
      );
      setDispatchChefs(
        target.chefsEquipe && target.chefsEquipe.length > 0 ? target.chefsEquipe : ['']
      );
    } else {
      setDispatchStudyId('__NEW__');
      setDispatchNewSiteName('');
      setDispatchNewCodeSite('');
      setDispatchNewClient('Ooredoo');
      setDispatchNewCgps('');
      setDispatchDate(new Date().toISOString().split('T')[0]);
      setDispatchChefs(['']);
    }
    setDispatchNotes('');
    setShowDispatchModal(true);
  };

  const handleSelectStudyForDispatch = (studyId: string) => {
    setDispatchStudyId(studyId);
    if (studyId === '__NEW__') {
      setDispatchNewSiteName('');
      setDispatchNewCodeSite('');
      setDispatchNewClient('Ooredoo');
      setDispatchNewCgps('');
      return;
    }
    const target = studies.find((s) => s.id === studyId);
    if (target) {
      setDispatchDate(
        target.datePlanification ||
          target.dateAffectation ||
          new Date().toISOString().split('T')[0]
      );
      setDispatchChefs(
        target.chefsEquipe && target.chefsEquipe.length > 0 ? target.chefsEquipe : ['']
      );
    }
  };

  const handleConfirmDispatch = async () => {
    const uniqueChefs: string[] = Array.from(
      new Set<string>(dispatchChefs.map((c) => c.trim()).filter(Boolean))
    );
    if (!dispatchStudyId) {
      showFeedback('warning', 'Veuillez sélectionner une étude ou créer un nouveau dossier GC.');
      return;
    }
    if (uniqueChefs.length === 0) {
      showFeedback('warning', "Veuillez sélectionner au moins un chef d'équipe Génie Civil.");
      return;
    }

    setIsDispatching(true);
    try {
      let targetStudy: EtudeRFILoss | undefined;
      let updatedStudies: EtudeRFILoss[] = [];

      if (dispatchStudyId === '__NEW__') {
        const cleanSiteName = dispatchNewSiteName.trim();
        const cleanCodeSite = dispatchNewCodeSite.trim().toUpperCase();
        if (!cleanSiteName || !cleanCodeSite) {
          showFeedback(
            'warning',
            'Veuillez saisir le Nom du site client et le Code site client.'
          );
          setIsDispatching(false);
          return;
        }

        const newId = `GC-${Date.now().toString().slice(-6)}`;
        let supabaseReportId: string | undefined;
        if (isSupabaseConfigured) {
          supabaseReportId = await ensureAsBuiltReport({
            studyId: newId,
            typeRapport: 'GC',
            nomSiteClient: cleanSiteName,
            codeSiteClient: cleanCodeSite,
            nomSousTraitant: uniqueChefs.join(', '),
            dateRealisation: dispatchDate,
          });
        }

        const [latVal = '', longVal = ''] = dispatchNewCgps
          .split(',')
          .map((p) => p.trim());

        targetStudy = {
          id: newId,
          supabaseReportId,
          site: cleanSiteName,
          contactClient: { nom: dispatchNewClient.trim() || 'Ooredoo', tel: '' },
          gps: {
            latitude: latVal,
            longitude: longVal,
            cgps: dispatchNewCgps.trim() || undefined,
          },
          codesSitesDistants: [],
          dateCreation: new Date().toISOString().split('T')[0],
          action: 'Travaux Génie Civil',
          dateAffectation: dispatchDate,
          datePlanification: dispatchDate,
          chefsEquipe: uniqueChefs,
          status: 'Affecté',
          asBuiltData: {
            supabaseReportId,
            nomSiteClient: cleanSiteName,
            codeSiteClient: cleanCodeSite,
            nomSousTraitant: uniqueChefs.join(', '),
            dateRealisation: dispatchDate,
            status: 'DRAFT',
            workflowStep: 2,
            statusValidationAdmin: 'En attente',
            photos: [],
          },
        };
        updatedStudies = [targetStudy, ...studies];
      } else {
        targetStudy = studies.find((s) => s.id === dispatchStudyId);
        if (!targetStudy) {
          setIsDispatching(false);
          return;
        }

        let supabaseReportId =
          targetStudy.supabaseReportId || targetStudy.asBuiltData?.supabaseReportId;
        if (isSupabaseConfigured) {
          supabaseReportId = await ensureAsBuiltReport({
            existingReportId: supabaseReportId,
            studyId: targetStudy.id,
            typeRapport: 'GC',
            nomSiteClient: targetStudy.asBuiltData?.nomSiteClient || targetStudy.site,
            codeSiteClient: targetStudy.asBuiltData?.codeSiteClient || targetStudy.id,
            nomSousTraitant: uniqueChefs.join(', '),
            dateRealisation: dispatchDate,
          });
        }

        updatedStudies = studies.map((s) =>
          s.id === dispatchStudyId
            ? {
                ...s,
                supabaseReportId,
                chefsEquipe: uniqueChefs,
                dateAffectation: dispatchDate,
                datePlanification: dispatchDate,
                status: 'Affecté' as const,
                asBuiltData: s.asBuiltData
                  ? { ...s.asBuiltData, supabaseReportId }
                  : s.asBuiltData,
              }
            : s
        );
      }

      saveStudies(updatedStudies);
      if (targetStudy) {
        setSelectedStudyId(targetStudy.id);
      }

      try {
        const storedNotifs = localStorage.getItem('smtt_notifications');
        const existingNotifs: AppNotification[] = storedNotifs ? JSON.parse(storedNotifs) : [];
        const newNotif: AppNotification = {
          id: `NOTIF-GC-${Date.now()}`,
          type: 'info',
          message: `🏗️ [Ordre de Mission Génie Civil] Mission "${targetStudy.site}" (${targetStudy.asBuiltData?.codeSiteClient || targetStudy.id}) affectée pour le ${dispatchDate} aux chefs GC : ${uniqueChefs.join(', ')}. ${dispatchNotes ? 'Consignes: ' + dispatchNotes : ''}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          studyId: targetStudy.id,
          senderName: currentUserName || currentUserRole || 'Admin SMTT',
        };
        localStorage.setItem('smtt_notifications', JSON.stringify([newNotif, ...existingNotifs]));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Erreur notification dispatching GC', e);
      }

      showFeedback(
        'success',
        `Mission "${targetStudy.site}" (${targetStudy.asBuiltData?.codeSiteClient || targetStudy.id}) affectée à ${uniqueChefs.join(', ')} pour le ${dispatchDate}.`
      );
      setShowDispatchModal(false);
    } catch (err: any) {
      console.error('Erreur Dispatching GC:', err);
      showFeedback('error', err?.message || 'Erreur lors du dispatching Génie Civil.');
    } finally {
      setIsDispatching(false);
    }
  };

  const activeDispatchStudy = studies.find((s) => s.id === dispatchStudyId);

  // Slide navigation items (Page 1, Pages 2-8, and Page 9 for Admin ONLY)
  const slideMenuItems = useMemo(() => {
    const items: Array<{
      key: SlideKey;
      pageNumber: number;
      title: string;
      isCover?: boolean;
      isAttestation?: boolean;
      step?: AsBuiltStepPhoto;
    }> = [
      {
        key: 'page1_cover',
        pageNumber: 1,
        title: 'Page 1 : Page de garde',
        isCover: true,
      },
      ...DEFAULT_ASBUILT_STEPS.map((step, idx) => ({
        key: step.id as SlideKey,
        pageNumber: idx + 2,
        title: `Page ${idx + 2} : ${step.title}`,
        step:
          activeAsBuiltData?.photos.find((p) => p.id === step.id) || step,
      })),
    ];

    if (isAdmin) {
      items.push({
        key: 'page9_attestation',
        pageNumber: 9,
        title: 'Page 9 : Attestation de scellement',
        isAttestation: true,
      });
    }

    return items;
  }, [activeAsBuiltData, isAdmin]);

  const activeUploadedCount = activeAsBuiltData
    ? activeAsBuiltData.photos.filter((p) => Boolean(p.photoUrl)).length
    : 0;

  return (
    <div className="space-y-6 text-slate-100">
      {/* Admin Top Control Bar (Hidden for Chef d'équipe) */}
      {isAdmin && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-600/20 border border-orange-500/30 rounded-xl text-orange-400">
              <HardHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-950/60 text-orange-400 px-2 py-0.5 rounded border border-orange-900/40">
                  ADMINISTRATION GC
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  • {visibleStudies.length} dossier(s)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Génie Civil — Suivi & Export AS_BUILT Travaux GC
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher site, code, chef..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowClearAllConfirm(true)}
              disabled={isDeletingGc || studies.length === 0}
              className="px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 hover:text-white border border-red-800/70 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Supprimer tous les tickets et rapports Génie Civil"
            >
              <span>🗑️ Vider GC</span>
            </button>

            {activeStudy && (
              <button
                type="button"
                onClick={() => setSelectedGcReportStudy(activeStudy)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-orange-400" />
                <span>Consulter GC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openDispatchModal()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatching GC</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 shadow-lg ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : feedback.type === 'warning'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          SECTION 1 : SÉLECTEUR HORIZONTAL DES TICKETS ASSIGNÉS
          =================================================================== */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-orange-500" />
            <h2 className="font-extrabold text-xs text-white uppercase tracking-wider">
              Sélectionner un ticket assigné à traiter
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            {visibleStudies.length} ticket(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleStudies.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-500 text-xs">
              Aucun ticket Génie Civil assigné pour le moment.
            </div>
          ) : (
            visibleStudies.map((study) => {
              const uploadedCount = getUploadedPhotoCount(study);
              const isSelected = selectedStudyId === study.id;
              const statusInfo = getTicketDisplayStatus(study);
              const displayCode = study.asBuiltData?.codeSiteClient || study.id;
              const clientName = study.contactClient?.nom || 'Ooredoo';

              return (
                <div
                  key={study.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedStudyId(study.id);
                    setActiveSlideKey('page1_cover');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStudyId(study.id);
                      setActiveSlideKey('page1_cover');
                    }
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-orange-950/40 border-orange-500 shadow shadow-orange-500/10'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-mono text-orange-400 font-extrabold text-xs truncate">
                      {displayCode}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudyToDelete(study);
                          }}
                          className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/60 border border-transparent hover:border-red-900/50 transition-all cursor-pointer"
                          title="Supprimer ce ticket Génie Civil"
                          aria-label={`Supprimer le ticket ${displayCode}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-white font-bold truncate w-full">
                    {study.site}
                  </div>

                  <div className="flex items-center justify-between w-full text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <span className="truncate pr-2">
                      Client : <strong className="text-slate-200">{clientName}</strong>
                    </span>
                    <span className="font-bold text-orange-400 shrink-0">
                      {uploadedCount}/7 Photos
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===================================================================
          SECTION 2 & 3 : BANDEAU RAPPORT ACTIF + ESPACE DE TRAVAIL 2 COLONNES
          =================================================================== */}
      {activeStudy && activeAsBuiltData ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          {/* SECTION 2 : BANDEAU "RAPPORT TERRAIN ACTIF" */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-900/30">
                  RAPPORT TERRAIN ACTIF
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  • {activeStudy.id}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-extrabold text-white">
                As Built Travaux GC —{' '}
                <span className="text-slate-200">{activeStudy.site}</span>
              </h3>

              <p className="text-[11px] text-slate-400">
                Chef d&apos;équipe :{' '}
                <strong className="text-slate-200">
                  {activeStudy.chefsEquipe?.join(', ') || currentUserName}
                </strong>{' '}
                | Client :{' '}
                <strong className="text-slate-200">
                  {activeStudy.contactClient?.nom || 'Ooredoo'}
                </strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <div className="sm:text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  PHOTOS TÉLÉVERSÉES :
                </div>
                <div className="text-sm font-black text-white">
                  {activeUploadedCount} / 7
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleAdminExportPPTX}
                  className="px-4 py-2.5 rounded-xl text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>PPTX ({exportProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Valider &amp; Générer PPTX</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitReport}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all duration-150 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 ${
                  activeAsBuiltData.status === 'SUBMITTED'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>ENVOI EN COURS...</span>
                  </>
                ) : activeAsBuiltData.status === 'SUBMITTED' ? (
                  <>
                    <CheckCircle size={14} />
                    <span>RAPPORT SOUMIS À L&apos;ADMIN</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>SOUMETTRE RAPPORT À L&apos;ADMIN</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isExporting && exportStepName && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span>{exportStepName}</span>
                <span className="text-orange-400">{exportProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* SECTION 3 : ESPACE DE TRAVAIL EN 2 COLONNES */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            {/* COLONNE DE GAUCHE (~280px) : DIAPOSITIVES DU POWERPOINT */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase px-2 mb-1 tracking-wider">
                DIAPOSITIVES DU POWERPOINT
              </div>

              {slideMenuItems.map((item) => {
                const isActive = activeSlideKey === item.key;
                const hasPhoto = Boolean(item.step?.photoUrl);
                const hasAttestation = Boolean(
                  activeAsBuiltData.attestationImageUrl ||
                    activeAsBuiltData.attestationScellementUrl
                );

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSlideKey(item.key)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-950 border-orange-500 text-orange-400 font-bold shadow-sm'
                        : item.step && hasPhoto
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300 font-medium'
                        : 'bg-slate-950/50 border-slate-900 hover:border-slate-800 text-slate-300 font-medium'
                    }`}
                  >
                    <span className="truncate">{item.title}</span>

                    {item.isCover ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight bg-blue-950 text-blue-400 shrink-0">
                        GARDE
                      </span>
                    ) : item.isAttestation ? (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                          hasAttestation
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {hasAttestation ? '1/1' : '0/1'}
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                          hasPhoto
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-slate-900 text-slate-500'
                        }`}
                      >
                        {hasPhoto ? '1/1' : '0/1'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* COLONNE DE DROITE : ÉDITEUR DE LA DIAPOSITIVE SÉLECTIONNÉE */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 min-h-[420px]">
              {/* PAGE 1 : PAGE DE GARDE */}
              {activeSlideKey === 'page1_cover' && (
                <div className="space-y-5">
                  <div className="border-b border-slate-900 pb-3">
                    <h4 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">
                      Page 1 : Page de garde
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isChefEquipe
                        ? 'Informations du site affichées sur la couverture du rapport Ooredoo Business (lecture seule).'
                        : 'Informations du site affichées sur la couverture du rapport officiel AS_BUILT Travaux GC.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 uppercase font-bold text-[10px] block">
                        Nom site client
                      </label>
                      {isChefEquipe ? (
                        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-bold">
                          {activeAsBuiltData.nomSiteClient}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={activeAsBuiltData.nomSiteClient}
                          onChange={(e) =>
                            handleCoverFieldChange('nomSiteClient', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-bold focus:outline-none focus:border-orange-500"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 uppercase font-bold text-[10px] block">
                        Code site client
                      </label>
                      {isChefEquipe ? (
                        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2.5 px-3.5 text-orange-400 font-mono font-bold">
                          {activeAsBuiltData.codeSiteClient}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={activeAsBuiltData.codeSiteClient}
                          onChange={(e) =>
                            handleCoverFieldChange('codeSiteClient', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 uppercase font-bold text-[10px] block">
                        Sous-traitant
                      </label>
                      {isChefEquipe ? (
                        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-semibold">
                          {activeAsBuiltData.nomSousTraitant}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={activeAsBuiltData.nomSousTraitant}
                          onChange={(e) =>
                            handleCoverFieldChange('nomSousTraitant', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-semibold focus:outline-none focus:border-orange-500"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 uppercase font-bold text-[10px] block">
                        Date
                      </label>
                      {isChefEquipe ? (
                        <div className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-semibold">
                          {activeAsBuiltData.dateRealisation}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={activeAsBuiltData.dateRealisation}
                          onChange={(e) =>
                            handleCoverFieldChange('dateRealisation', e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-white font-semibold focus:outline-none focus:border-orange-500"
                        />
                      )}
                    </div>
                  </div>

                  {/* Compact Guard Preview */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-red-500 block">
                      Aperçu Couverture Ooredoo Business
                    </span>
                    <div className="p-4 bg-[#E6E6E6] rounded-lg border border-slate-700 text-slate-900 space-y-3">
                      <div className="flex justify-end">
                        <span className="bg-[#ED1C24] text-white text-[10px] font-bold px-3 py-1">
                          AS_BUILT Travaux GC
                        </span>
                      </div>
                      <div className="bg-[#ED1C24] rounded-2xl p-4 text-white max-w-md space-y-1 shadow">
                        <p className="text-xs font-black text-center pb-1">
                          Travaux GC site client Ooredoo
                        </p>
                        <p className="text-[11px]">
                          Nom site client :{' '}
                          <strong className="text-black">
                            {activeAsBuiltData.nomSiteClient}
                          </strong>
                        </p>
                        <p className="text-[11px]">
                          Code Site Client :{' '}
                          <strong className="text-black">
                            {activeAsBuiltData.codeSiteClient}
                          </strong>
                        </p>
                        <p className="text-[11px]">
                          Sous-traitant :{' '}
                          <strong className="text-black">
                            {activeAsBuiltData.nomSousTraitant}
                          </strong>
                        </p>
                        <p className="text-[11px]">
                          Date :{' '}
                          <strong className="text-black">
                            {activeAsBuiltData.dateRealisation}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGES 2 À 8 : PHOTO TERRAIN DE LA DIAPOSITIVE SÉLECTIONNÉE */}
              {activeSlideKey.startsWith('step') &&
                (() => {
                  const currentStep =
                    activeAsBuiltData.photos.find((p) => p.id === activeSlideKey) ||
                    DEFAULT_ASBUILT_STEPS.find((s) => s.id === activeSlideKey);
                  if (!currentStep) return null;
                  const slideNum = currentStep.stepNumber + 1;

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                        <div>
                          <h4 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">
                            Page {slideNum} : {currentStep.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {currentStep.description}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase shrink-0 ${
                            currentStep.photoUrl
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {currentStep.photoUrl ? 'Photo chargée (1/1)' : 'En attente (0/1)'}
                        </span>
                      </div>

                      {currentStep.photoUrl ? (
                        <div className="space-y-4">
                          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-center min-h-[280px]">
                            <img
                              src={currentStep.photoUrl}
                              alt={currentStep.title}
                              className="max-h-[360px] w-auto object-contain rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImageUrl(currentStep.photoUrl || null)}
                              className="absolute top-3 right-3 p-2 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl border border-slate-700 cursor-pointer transition-all"
                              title="Agrandir l'image"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <span className="text-[11px] text-slate-400 font-mono">
                              Capturée le :{' '}
                              <strong className="text-slate-200">
                                {currentStep.timestamp || "Aujourd'hui"}
                              </strong>
                            </span>

                            <div className="flex items-center gap-2">
                              <label className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all">
                                {uploadingTarget === currentStep.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                                    <span>Compression et envoi...</span>
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-3.5 h-3.5 text-orange-400" />
                                    <span>Remplacer</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  disabled={uploadingTarget === currentStep.id}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleStepPhotoUpload(currentStep.id, file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => handleStepPhotoDelete(currentStep.id)}
                                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-800 hover:border-orange-500/70 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all min-h-[290px]">
                          <div className="p-4 bg-orange-950/40 border border-orange-500/30 rounded-2xl text-orange-400">
                            {uploadingTarget === currentStep.id ? (
                              <RefreshCw className="w-8 h-8 animate-spin" />
                            ) : (
                              <Camera className="w-8 h-8" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-extrabold text-white">
                              {uploadingTarget === currentStep.id
                                ? 'Compression et envoi...'
                                : 'Ajouter / Prendre une photo'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Diapositive {slideNum} : {currentStep.title}
                            </p>
                          </div>
                          <span className="mt-1 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-600/20">
                            {uploadingTarget === currentStep.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Compression et envoi...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Choisir ou capturer une image</span>
                              </>
                            )}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            disabled={uploadingTarget === currentStep.id}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStepPhotoUpload(currentStep.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })()}

              {/* PAGE 9 : ATTESTATION DE SCELLEMENT (ADMIN UNIQUEMENT) */}
              {isAdmin && activeSlideKey === 'page9_attestation' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                    <div>
                      <h4 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">
                        Page 9 : Attestation de scellement (Admin)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cadre central vierge par défaut. Importez le scan ou la photo de
                        l&apos;attestation signée et cachetée.
                      </p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-900 text-orange-400 border border-slate-800 uppercase shrink-0">
                      Réservé Admin
                    </span>
                  </div>

                  {(() => {
                    const attestationUrl =
                      activeAsBuiltData.attestationImageUrl ||
                      activeAsBuiltData.attestationScellementUrl;

                    return (
                      <div className="space-y-4">
                        {/* Blank White Official Ooredoo Frame */}
                        <div className="bg-[#E6E6E6] rounded-xl p-4 border border-slate-700 space-y-3">
                          <div className="h-[2px] w-4/5 mx-auto bg-[#ED1C24]" />
                          <div className="bg-white border border-slate-300 rounded min-h-[260px] flex items-center justify-center p-3">
                            {attestationUrl ? (
                              attestationUrl.toLowerCase().includes('.pdf') ||
                              attestationUrl.startsWith('data:application/pdf') ? (
                                <div className="text-center space-y-2 py-8">
                                  <FileText className="w-10 h-10 text-[#ED1C24] mx-auto" />
                                  <p className="text-xs font-bold text-slate-800">
                                    {activeAsBuiltData.attestationScellementName || 'Attestation_scellement.pdf'}
                                  </p>
                                  {attestationUrl.startsWith('http') && (
                                    <a
                                      href={attestationUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-block text-xs font-bold text-[#ED1C24] underline"
                                    >
                                      Ouvrir le PDF
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <img
                                  src={attestationUrl}
                                  alt="Attestation de scellement"
                                  className="max-h-[300px] w-auto object-contain"
                                />
                              )
                            ) : (
                              <div className="text-center text-slate-400 text-xs font-medium py-12">
                                Zone centrale vierge (aucune attestation importée)
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#ED1C24] px-2">
                            <span>ooredoo business</span>
                            <span>9</span>
                          </div>
                        </div>

                        {/* Admin Upload / Replace / Delete Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20 transition-all">
                            {uploadingTarget === 'attestation' ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Compression et envoi...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>
                                  {attestationUrl
                                    ? "Remplacer l'Attestation (Scan / Photo)"
                                    : "Importer l'Attestation de scellement (Scan / Photo)"}
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={uploadingTarget === 'attestation'}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAttestationUpload(file);
                                e.target.value = '';
                              }}
                            />
                          </label>

                          {attestationUrl && (
                            <button
                              type="button"
                              onClick={handleAttestationDelete}
                              className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Supprimer</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 p-14 text-center rounded-2xl">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-300 text-sm">
            Aucun ticket Génie Civil sélectionné.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sélectionnez un ticket assigné dans la liste ci-dessus pour saisir les photos terrain.
          </p>
        </div>
      )}

      {/* Zoom Lightbox Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImageUrl}
              alt="Aperçu photo"
              className="max-h-[82vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Modal View GC Report / Details (Admin only) */}
      {selectedGcReportStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6"
          >
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardHat className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="font-black text-base text-white">
                    Rapport Spécifique Travaux Génie Civil — {selectedGcReportStudy.site}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Code Site: {selectedGcReportStudy.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGcReportStudy(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {selectedGcReportStudy.report ? (
                <TravauxGcPage
                  report={selectedGcReportStudy.report}
                  studyId={selectedGcReportStudy.id}
                />
              ) : (
                <div className="p-6 text-center text-slate-500 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-800">
                    Informations de la Mission Génie Civil
                  </p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 text-slate-700">
                    <p>
                      <strong>CGPS :</strong>{' '}
                      {selectedGcReportStudy.gps?.cgps ||
                        `${selectedGcReportStudy.gps?.latitude}, ${selectedGcReportStudy.gps?.longitude}`}
                    </p>
                    <p>
                      <strong>Client Ooredoo :</strong>{' '}
                      {selectedGcReportStudy.contactClient?.nom || 'Ooredoo'} (
                      {selectedGcReportStudy.contactClient?.tel})
                    </p>
                    <p>
                      <strong>Chefs d&apos;Équipe GC :</strong>{' '}
                      {selectedGcReportStudy.chefsEquipe?.join(', ') || 'Non affecté'}
                    </p>
                    <p>
                      <strong>Date Intervention :</strong>{' '}
                      {selectedGcReportStudy.datePlanification || 'Non définie'}
                    </p>
                    {selectedGcReportStudy.asBuiltData?.attestationScellementName && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-emerald-700 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-emerald-600" />
                          Attestation de Scellement :{' '}
                          {selectedGcReportStudy.asBuiltData.attestationScellementName}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-black">
                          Conforme
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGcReportStudy(null)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Dispatching & Affectation GC (Admin only) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden my-6"
          >
            <div className="bg-slate-950 text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-600 rounded-xl">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    Dispatching &amp; Affectation GC
                    <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                      Multi-Chefs
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Affectation d&apos;études validées, date d&apos;intervention et ordres de mission GC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Building className="w-4 h-4 text-orange-400" />
                  1. Sélectionner l&apos;Étude ou Créer un Dossier GC
                </label>
                <select
                  value={dispatchStudyId}
                  onChange={(e) => handleSelectStudyForDispatch(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl text-sm font-bold text-white bg-slate-950 focus:border-orange-500 outline-none"
                >
                  <option value="__NEW__">➕ Créer un nouveau dossier / ticket GC</option>
                  {validatedLosStudies.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.site} ({st.asBuiltData?.codeSiteClient || st.id}) - [{st.status}] - Chefs:{' '}
                      {st.chefsEquipe?.join(', ') || 'Non affecté'}
                    </option>
                  ))}
                </select>

                {dispatchStudyId === '__NEW__' ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block">
                        Nom site client *
                      </label>
                      <input
                        type="text"
                        value={dispatchNewSiteName}
                        onChange={(e) => setDispatchNewSiteName(e.target.value)}
                        placeholder="Ex: Site Client Ooredoo..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block">
                        Code site client *
                      </label>
                      <input
                        type="text"
                        value={dispatchNewCodeSite}
                        onChange={(e) => setDispatchNewCodeSite(e.target.value)}
                        placeholder="Ex: TUN_1045"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-orange-400 font-mono font-bold focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block">
                        Client
                      </label>
                      <input
                        type="text"
                        value={dispatchNewClient}
                        onChange={(e) => setDispatchNewClient(e.target.value)}
                        placeholder="Ooredoo"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 block">
                        CGPS (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={dispatchNewCgps}
                        onChange={(e) => setDispatchNewCgps(e.target.value)}
                        placeholder="36.8065, 10.1815"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>
                ) : activeDispatchStudy ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-sm">
                        {activeDispatchStudy.site}
                      </span>
                      <span className="font-mono bg-orange-950 text-orange-400 border border-orange-900/40 font-bold px-2 py-0.5 rounded text-[10px]">
                        {activeDispatchStudy.asBuiltData?.codeSiteClient || activeDispatchStudy.id}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <p>
                        CGPS :{' '}
                        <strong className="text-slate-200">
                          {activeDispatchStudy.gps?.cgps ||
                            (activeDispatchStudy.gps?.latitude
                              ? `${activeDispatchStudy.gps.latitude}, ${activeDispatchStudy.gps.longitude}`
                              : 'Non renseigné')}
                        </strong>
                      </p>
                      <p>
                        Client :{' '}
                        <strong className="text-slate-200">
                          {activeDispatchStudy.contactClient?.nom || 'Ooredoo'}
                        </strong>
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  2. Date d&apos;Intervention GC
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full sm:w-1/2 px-4 py-2.5 border border-slate-700 rounded-xl text-sm font-bold text-white bg-slate-950 [color-scheme:dark] focus:border-orange-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setDispatchDate(new Date().toISOString().split('T')[0])
                      }
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Aujourd&apos;hui
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        setDispatchDate(tomorrow.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Demain (+1j)
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    3. Chefs d&apos;Équipe GC
                  </label>
                  <button
                    type="button"
                    onClick={() => setDispatchChefs([...dispatchChefs, ''])}
                    className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:bg-orange-950/50 px-2 py-1 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter chef
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dispatchChefs.map((chefVal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-28 shrink-0">
                        {idx === 0 ? 'Chef Principal :' : `Chef ${idx + 1} :`}
                      </span>
                      <select
                        value={chefVal}
                        onChange={(e) => {
                          const updated = [...dispatchChefs];
                          updated[idx] = e.target.value;
                          setDispatchChefs(updated);
                        }}
                        className="flex-1 px-3 py-2 border border-slate-700 rounded-xl text-sm font-bold text-white bg-slate-950 focus:border-orange-500 outline-none"
                      >
                        <option value="">-- Sélectionner chef GC --</option>
                        {availableChefs.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {dispatchChefs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...dispatchChefs];
                            updated.splice(idx, 1);
                            setDispatchChefs(updated);
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300">
                  4. Directives Spécifiques (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Consignes travaux génie civil..."
                  className="w-full p-3 border border-slate-700 rounded-xl text-xs font-medium text-white bg-slate-950 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDispatching}
                onClick={handleConfirmDispatch}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isDispatching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Valider &amp; Envoyer Ordre de Mission GC
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Confirmation Suppression Individuelle Ticket GC */}
      {studyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Supprimer ce dossier GC ?
                </h3>
                <p className="text-[11px] text-slate-400">
                  Suppression définitive (Supabase + stockage local).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Voulez-vous vraiment supprimer le ticket{' '}
              <strong className="text-orange-400 font-mono">
                {studyToDelete.asBuiltData?.codeSiteClient || studyToDelete.id}
              </strong>{' '}
              (<strong className="text-white">{studyToDelete.site}</strong>) ainsi que
              ses photos et son rapport As-Built associés ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingGc}
                onClick={() => setStudyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingGc}
                onClick={handleConfirmDeleteSingleStudy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingGc ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Vidage Complet GC ("🗑️ Vider GC") */}
      {isAdmin && showClearAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Vider tous les dossiers Génie Civil ?
                </h3>
                <p className="text-[11px] text-slate-400">
                  Action irréversible sur Supabase et le stockage local.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cette action va supprimer définitivement les{' '}
              <strong className="text-white">{studies.length} dossier(s) GC</strong>,
              tous les rapports As-Built Génie Civil, leurs photos terrain et les
              tickets associés dans Supabase. L&apos;onglet Génie Civil sera totalement
              vierge (<strong className="text-orange-400">0 dossier(s)</strong>).
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingGc}
                onClick={() => setShowClearAllConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingGc}
                onClick={handleConfirmClearAllGc}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingGc ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Tout supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
