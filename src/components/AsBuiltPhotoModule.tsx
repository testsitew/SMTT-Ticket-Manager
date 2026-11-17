import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
  Download,
  FileSpreadsheet,
  FileText,
  User,
  Calendar,
  Building,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  X,
  ShieldCheck,
  Layers,
  ArrowRight,
  Edit3,
  FileCheck,
  Award,
  Send,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AsBuiltData, AsBuiltStepPhoto, EtudeRFILoss, RfiReport, AppNotification } from '../types';
import { DEFAULT_ASBUILT_STEPS, generateAsBuiltPPTX } from '../utils/asBuiltPptxExport';
import { compressImage } from '../utils/excelExport';
import { compressImage as compressImageFile } from '../utils/imageCompressor.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import {
  fetchAsBuiltReportsWithPhotos,
  ensureAsBuiltReport,
  uploadSlidePhotoToStorage,
  deleteSlidePhotoFromDatabase,
  uploadAttestationSlide9ToStorage,
  clearAttestationSlide9InDatabase,
  submitAsBuiltReportToAdmin,
  validateAsBuiltReportByAdmin,
  subscribeAsBuiltRealtime,
} from '../services/supabaseService';

interface AsBuiltPhotoModuleProps {
  study?: EtudeRFILoss;
  report?: RfiReport;
  currentUserRole: string;
  currentUserName: string;
  onSaveReport?: (updatedReport: RfiReport) => void;
  onSaveStudy?: (updatedStudy: EtudeRFILoss) => void;
  onReportUpdated?: () => void;
  onClose?: () => void;
}

interface ToastState {
  type: 'success' | 'warning' | 'error';
  message: string;
}

export function AsBuiltPhotoModule({
  study,
  report,
  currentUserRole,
  currentUserName,
  onSaveReport,
  onSaveStudy,
  onReportUpdated,
  onClose
}: AsBuiltPhotoModuleProps) {
  const isAdmin = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase().includes('suivi');
  const isChefEquipe = !isAdmin;

  // --------------------------------------------------------------------------
  // 1. AUTOMATIC EXTRACTION OF ADMIN / RFI DATA FOR PAGE DE GARDE (SLIDE 1)
  // --------------------------------------------------------------------------
  const extractedNomSite =
    report?.donneesLOS?.header?.nomSite ||
    study?.site ||
    'Client Ooredoo Business';

  const extractedCodeSite =
    report?.donneesLOS?.header?.codeSite ||
    study?.id ||
    'SITE_B2B_01';

  const extractedSousTraitant =
    study?.chefsEquipe?.length
      ? study.chefsEquipe.join(', ')
      : report?.donneesLOS?.header?.maintenancier?.nom ||
        study?.maintenancier ||
        currentUserName ||
        'Sous-traitant Habilité SMTT';

  const extractedDateRealisation =
    study?.asBuiltData?.dateRealisation ||
    study?.datePlanification ||
    report?.donneesLOS?.header?.dateLOS ||
    new Date().toISOString().slice(0, 16).replace('T', ' ');

  const extractedZone =
    report?.donneesLOS?.infoSite?.remarquesAcces?.trim() ||
    study?.gps?.cgps?.trim() ||
    (study?.gps?.latitude && study?.gps?.longitude
      ? `${study.gps.latitude}, ${study.gps.longitude}`
      : '') ||
    'Zone client Ooredoo';

  const createDefaultPhotos = () =>
    DEFAULT_ASBUILT_STEPS.map((s) => ({
      ...s,
      timestamp:
        new Date().toLocaleDateString('fr-FR') +
        ' ' +
        new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }));

  // Initialize AsBuiltData state
  const [asBuiltData, setAsBuiltData] = useState<AsBuiltData>(() => {
    const existing = study?.asBuiltData || report?.asBuiltData;
    if (existing) {
      return {
        ...existing,
        nomSiteClient: existing.nomSiteClient || extractedNomSite,
        codeSiteClient: existing.codeSiteClient || extractedCodeSite,
        nomSousTraitant: existing.nomSousTraitant || extractedSousTraitant,
        dateRealisation: existing.dateRealisation || extractedDateRealisation,
        photos: existing.photos?.length === 7 ? existing.photos : createDefaultPhotos(),
        validePar: existing.validePar || currentUserName || 'Technicien Terrain',
        statusValidationAdmin: existing.statusValidationAdmin || 'En attente',
      };
    }
    return {
      nomSiteClient: extractedNomSite,
      codeSiteClient: extractedCodeSite,
      nomSousTraitant: extractedSousTraitant,
      dateRealisation: extractedDateRealisation,
      photos: createDefaultPhotos(),
      validePar: currentUserName || 'Technicien Terrain',
      statusValidationAdmin: 'En attente',
      workflowStep: 2,
      status: 'DRAFT',
    };
  });

  const [dateDebutIntervention, setDateDebutIntervention] = useState<string>(
    asBuiltData.dateRealisation || new Date().toISOString().slice(0, 16).replace('T', ' ')
  );

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStepName, setExportStepName] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<ToastState | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isEditingCoverData, setIsEditingCoverData] = useState<boolean>(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: ToastState['type'], message: string, duration = 4500) => {
    setToast({ type, message });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // File input refs for step photos and attestation
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const attestationFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state if study/report props change + Supabase Realtime sync
  useEffect(() => {
    const existing = study?.asBuiltData || report?.asBuiltData;
    if (existing) {
      setAsBuiltData((prev) => ({
        ...prev,
        ...existing,
        nomSiteClient: existing.nomSiteClient || prev.nomSiteClient || extractedNomSite,
        codeSiteClient: existing.codeSiteClient || prev.codeSiteClient || extractedCodeSite,
        nomSousTraitant: existing.nomSousTraitant || prev.nomSousTraitant || extractedSousTraitant,
        dateRealisation: existing.dateRealisation || prev.dateRealisation || extractedDateRealisation,
        photos: existing.photos?.length === 7 ? existing.photos : prev.photos,
      }));
    }
  }, [report, study]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const syncFromSupabase = async () => {
      try {
        const reports = await fetchAsBuiltReportsWithPhotos();
        const match = reports.find(
          (r) =>
            (asBuiltData.supabaseReportId && r.id === asBuiltData.supabaseReportId) ||
            (study?.id && r.study_id === study.id) ||
            (extractedCodeSite && r.code_site_client === extractedCodeSite)
        );
        if (!match) return;

        setAsBuiltData((prev) => {
          const updatedPhotos = prev.photos.map((step) => {
            const slidePhoto = match.report_photos?.find(
              (rp) => rp.slide_number === step.stepNumber + 1
            );
            if (!slidePhoto?.photo_url) return step;
            return {
              ...step,
              photoUrl: slidePhoto.photo_url,
              status: 'Conforme' as const,
            };
          });

          const rawStatut = (match.statut || '').toUpperCase();
          const nextStatus =
            rawStatut === 'VALIDE'
              ? 'VALIDATED'
              : rawStatut === 'SOUMIS'
              ? 'SUBMITTED'
              : prev.status;

          return {
            ...prev,
            supabaseReportId: match.id,
            nomSiteClient: match.nom_site_client || prev.nomSiteClient,
            codeSiteClient: match.code_site_client || prev.codeSiteClient,
            nomSousTraitant: match.nom_sous_traitant || prev.nomSousTraitant,
            dateRealisation: match.date_realisation || prev.dateRealisation,
            attestationImageUrl: match.attestation_slide9_url || prev.attestationImageUrl,
            attestationScellementUrl: match.attestation_slide9_url || prev.attestationScellementUrl,
            status: nextStatus,
            workflowStep:
              nextStatus === 'SUBMITTED' || nextStatus === 'VALIDATED' ? 3 : prev.workflowStep,
            statusValidationAdmin:
              nextStatus === 'VALIDATED'
                ? 'Validé'
                : nextStatus === 'SUBMITTED'
                ? "Soumis à l'admin"
                : prev.statusValidationAdmin,
            photos: updatedPhotos,
          };
        });
      } catch (err) {
        console.error('Erreur sync AsBuiltPhotoModule Supabase:', err);
      }
    };

    syncFromSupabase();
    return subscribeAsBuiltRealtime(syncFromSupabase);
  }, [study?.id, extractedCodeSite, asBuiltData.supabaseReportId]);

  // Save current data helper
  const persistAsBuiltData = (updatedData: AsBuiltData, updateStatus?: 'En attente' | 'Affecté' | 'Planifié' | 'Terminé') => {
    setAsBuiltData(updatedData);

    try {
      if (study?.id) {
        const storedStudies = localStorage.getItem('smtt_rfi_studies');
        if (storedStudies) {
          const parsedStudies: EtudeRFILoss[] = JSON.parse(storedStudies);
          const updatedStudies = parsedStudies.map((s) =>
            s.id === study.id
              ? { ...s, asBuiltData: updatedData, status: updateStatus || s.status }
              : s
          );
          localStorage.setItem('smtt_rfi_studies', JSON.stringify(updatedStudies));
        }
      }
      if (report && study?.id) {
        localStorage.setItem(
          `rfi_report_${study.id}`,
          JSON.stringify({ ...report, asBuiltData: updatedData })
        );
      }
    } catch (storageErr) {
      console.error('Erreur sauvegarde locale As-Built :', storageErr);
    }

    if (report && onSaveReport) {
      onSaveReport({
        ...report,
        asBuiltData: updatedData,
      });
    }

    if (study && onSaveStudy) {
      onSaveStudy({
        ...study,
        asBuiltData: updatedData,
        status: updateStatus || study.status
      });
    }
  };

  // Handler for uploading step photos (Slides 2 à 8) -> Compression + Supabase Storage 'as-built-files'
  const handlePhotoUpload = async (stepId: string, file: File) => {
    if (!file) return;
    const stepObj = asBuiltData.photos.find((p) => p.id === stepId);
    const slideNumber = stepObj ? stepObj.stepNumber + 1 : 2;
    const currentTimestamp =
      new Date().toLocaleDateString('fr-FR') +
      ' ' +
      new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });

    setUploadingTarget(stepId);
    try {
      const compressedFile = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        fileName: `slide_${slideNumber}_${Date.now()}.jpg`,
      });

      if (isSupabaseConfigured) {
        const reportId = await ensureAsBuiltReport({
          existingReportId: asBuiltData.supabaseReportId,
          studyId: study?.id,
          typeRapport: 'GC',
          nomSiteClient: asBuiltData.nomSiteClient,
          codeSiteClient: asBuiltData.codeSiteClient,
          nomSousTraitant: asBuiltData.nomSousTraitant,
          dateRealisation: dateDebutIntervention,
        });
        const { publicUrl } = await uploadSlidePhotoToStorage({
          reportId,
          slideNumber,
          file: compressedFile,
        });

        const updatedPhotos = asBuiltData.photos.map((p) =>
          p.id === stepId
            ? {
                ...p,
                photoUrl: publicUrl,
                timestamp: currentTimestamp,
                status: 'Conforme' as const,
              }
            : p
        );

        const nextData: AsBuiltData = {
          ...asBuiltData,
          supabaseReportId: reportId,
          photos: updatedPhotos,
          dateRealisation: dateDebutIntervention,
        };
        persistAsBuiltData(nextData);
        showToast('success', "Photo compressée et envoyée dans Supabase Storage (as-built-files) !", 3000);
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const rawBase64 = reader.result as string;
            const compressedBase64 = await compressImage(rawBase64);

            const updatedPhotos = asBuiltData.photos.map((p) => {
              if (p.id === stepId) {
                return {
                  ...p,
                  photoUrl: compressedBase64,
                  timestamp: currentTimestamp,
                  status: 'Conforme' as const,
                };
              }
              return p;
            });

            const nextData = { ...asBuiltData, photos: updatedPhotos, dateRealisation: dateDebutIntervention };
            persistAsBuiltData(nextData);

            showToast('success', "Photo compressée et enregistrée avec succès !", 3000);
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = () => reject(new Error("Erreur lecture fichier"));
        reader.readAsDataURL(compressedFile);
      });
    } catch (err: any) {
      console.error('Erreur upload photo:', err);
      showToast('error', `Erreur lors du traitement/envoi : ${err?.message || 'échec'}`);
    } finally {
      setUploadingTarget(null);
    }
  };

  // Handler for uploading Attestation de Scellement (Slide 9 - Admin only)
  const handleAttestationUpload = async (file: File) => {
    if (!file) return;
    if (!isAdmin) {
      showToast('warning', "L'importation de l'attestation de scellement (Slide 9) est réservée à l'Admin.");
      return;
    }

    const isPdf = file.type === 'application/pdf';
    if (!file.type.startsWith('image/') && !isPdf) {
      showToast('warning', "Veuillez importer une image/scan (JPG, PNG, WebP) ou un PDF pour le Slide 9.");
      return;
    }

    const dateNow = new Date().toLocaleDateString('fr-FR');
    setUploadingTarget('attestation');

    try {
      const processedFile = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        fileName: `slide_9_${Date.now()}.jpg`,
      });

      if (isSupabaseConfigured) {
        const reportId = await ensureAsBuiltReport({
          existingReportId: asBuiltData.supabaseReportId,
          studyId: study?.id,
          typeRapport: 'GC',
          nomSiteClient: asBuiltData.nomSiteClient,
          codeSiteClient: asBuiltData.codeSiteClient,
          nomSousTraitant: asBuiltData.nomSousTraitant,
          dateRealisation: dateDebutIntervention,
        });
        const { publicUrl } = await uploadAttestationSlide9ToStorage({
          reportId,
          file: processedFile,
        });

        const nextData: AsBuiltData = {
          ...asBuiltData,
          supabaseReportId: reportId,
          attestationImageUrl: publicUrl,
          attestationScellementUrl: publicUrl,
          attestationScellementName: processedFile.name,
          attestationDateUpload: dateNow,
          updatedAt: new Date().toISOString(),
        };

        persistAsBuiltData(nextData);
        if (attestationFileInputRef.current) {
          attestationFileInputRef.current.value = '';
        }
        showToast('success', 'Attestation Slide 9 importée dans Supabase Storage !', 3000);
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

            const nextData: AsBuiltData = {
              ...asBuiltData,
              attestationImageUrl: finalDataUrl,
              attestationScellementUrl: finalDataUrl,
              attestationScellementName: processedFile.name,
              attestationDateUpload: dateNow,
              updatedAt: new Date().toISOString(),
            };

            persistAsBuiltData(nextData);
            if (attestationFileInputRef.current) {
              attestationFileInputRef.current.value = '';
            }

            showToast('success', 'Attestation de scellement (Slide 9) importée et enregistrée !', 3000);
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
      showToast('error', `Erreur upload attestation : ${err?.message || 'échec'}`);
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleStatusChange = (stepId: string, status: 'Conforme' | 'Non Conforme') => {
    const updatedPhotos = asBuiltData.photos.map((p) =>
      p.id === stepId ? { ...p, status } : p
    );
    const nextData = { ...asBuiltData, photos: updatedPhotos };
    persistAsBuiltData(nextData);
  };

  const handleToggleStepValidation = (stepId: string) => {
    const step = asBuiltData.photos.find(p => p.id === stepId);
    if (!step) return;

    if (!step.photoUrl && !step.validatedByChef) {
      showToast('warning', `Veuillez d'abord charger la photo pour l'Étape ${step.stepNumber} (Slide ${step.stepNumber + 1}) avant de valider la conformité.`);
      return;
    }

    const nextValidated = !step.validatedByChef;
    const nowStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const updatedPhotos = asBuiltData.photos.map((p) => {
      if (p.id === stepId) {
        return {
          ...p,
          validatedByChef: nextValidated,
          chefValidationDate: nextValidated ? nowStr : undefined,
          chefValidatorName: nextValidated ? (currentUserName || "Chef d'équipe") : undefined,
          status: nextValidated ? ('Conforme' as const) : p.status,
        };
      }
      return p;
    });

    const nextData = { ...asBuiltData, photos: updatedPhotos };
    persistAsBuiltData(nextData);

    showToast(
      'success',
      nextValidated
        ? `✓ Slide ${step.stepNumber + 1} (${step.title}) validée conforme par le Chef d'équipe !`
        : `Validation annulée pour la Slide ${step.stepNumber + 1}`,
      3000
    );
  };

  const handleToggleCoverValidation = () => {
    const nextValidated = !asBuiltData.coverValidatedByChef;
    const nowStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const nextData: AsBuiltData = {
      ...asBuiltData,
      coverValidatedByChef: nextValidated,
      coverChefValidationDate: nextValidated ? nowStr : undefined,
      coverChefValidatorName: nextValidated ? (currentUserName || "Chef d'équipe") : undefined,
    };
    persistAsBuiltData(nextData);

    showToast(
      'success',
      nextValidated
        ? "✓ Slide 1 (Page de garde) validée conforme par le Chef d'équipe !"
        : "Validation annulée pour la Slide 1 (Page de garde)",
      3000
    );
  };

  const handleToggleAttestationValidation = () => {
    const nextValidated = !asBuiltData.attestationValidatedByChef;
    const nowStr = new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const nextData: AsBuiltData = {
      ...asBuiltData,
      attestationValidatedByChef: nextValidated,
      attestationChefValidationDate: nextValidated ? nowStr : undefined,
      attestationChefValidatorName: nextValidated ? (currentUserName || "Chef d'équipe") : undefined,
    };
    persistAsBuiltData(nextData);

    showToast(
      'success',
      nextValidated
        ? "✓ Slide 9 (Attestation de scellement) validée conforme par le Chef d'équipe !"
        : "Validation annulée pour la Slide 9",
      3000
    );
  };

  const handleCommentChange = (stepId: string, comment: string) => {
    const updatedPhotos = asBuiltData.photos.map((p) =>
      p.id === stepId ? { ...p, comment } : p
    );
    const nextData = { ...asBuiltData, photos: updatedPhotos };
    persistAsBuiltData(nextData);
  };

  const handleDeletePhoto = async (stepId: string) => {
    const stepObj = asBuiltData.photos.find((p) => p.id === stepId);
    if (isSupabaseConfigured && asBuiltData.supabaseReportId && stepObj) {
      try {
        await deleteSlidePhotoFromDatabase(asBuiltData.supabaseReportId, stepObj.stepNumber + 1);
      } catch (err) {
        console.error('Erreur suppression photo Supabase:', err);
      }
    }

    const updatedPhotos = asBuiltData.photos.map((p) =>
      p.id === stepId ? { ...p, photoUrl: undefined, validatedByChef: false } : p
    );
    const nextData = { ...asBuiltData, photos: updatedPhotos };
    persistAsBuiltData(nextData);
    showToast('warning', 'Photo supprimée', 3000);
  };

  const handleDeleteAttestation = async () => {
    if (!isAdmin) {
      showToast('warning', "Réservé à l'Admin SMTT.");
      return;
    }
    if (isSupabaseConfigured && asBuiltData.supabaseReportId) {
      try {
        await clearAttestationSlide9InDatabase(asBuiltData.supabaseReportId);
      } catch (err) {
        console.error('Erreur suppression attestation Supabase:', err);
      }
    }

    const nextData: AsBuiltData = {
      ...asBuiltData,
      attestationImageUrl: undefined,
      attestationScellementUrl: undefined,
      attestationScellementName: undefined,
      attestationDateUpload: undefined,
      attestationValidatedByChef: false,
      updatedAt: new Date().toISOString(),
    };
    persistAsBuiltData(nextData);
    showToast('warning', 'Attestation de scellement supprimée — Slide 9 remis à blanc.', 3000);
  };

  // Submit report by Chef d'équipe (Passage à l'Étape 3)
  const handleSubmitReport = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const reportId = study?.id || report?.donneesLOS?.header?.codeSite || asBuiltData.codeSiteClient;
    if (!reportId) {
      const errMsg = 'Erreur : Identifiant du rapport introuvable.';
      setSubmissionNotice({ type: 'error', message: errMsg });
      showToast('error', errMsg);
      return;
    }

    setIsSubmitting(true);
    try {
      const photosTaken = asBuiltData.photos.filter(p => !!p.photoUrl).length;
      const validatedCount = asBuiltData.photos.filter(p => p.validatedByChef).length;
      const nowIso = new Date().toISOString();

      let supabaseReportId = asBuiltData.supabaseReportId;
      if (isSupabaseConfigured) {
        supabaseReportId = await ensureAsBuiltReport({
          existingReportId: asBuiltData.supabaseReportId,
          studyId: study?.id,
          typeRapport: 'GC',
          nomSiteClient: asBuiltData.nomSiteClient,
          codeSiteClient: asBuiltData.codeSiteClient,
          nomSousTraitant: asBuiltData.nomSousTraitant,
          dateRealisation: dateDebutIntervention,
        });
        await submitAsBuiltReportToAdmin(supabaseReportId);
      }

      const nextData: AsBuiltData = {
        ...asBuiltData,
        supabaseReportId,
        dateRealisation: dateDebutIntervention,
        status: 'SUBMITTED',
        workflowStep: 3, // Passage à l'ÉTAPE 3 (ADMIN) : Valider & Générer PPTX
        statusValidationAdmin: "Soumis à l'admin",
        submittedBy: currentUserName || "Chef d'équipe",
        submittedAt: nowIso,
        updatedAt: nowIso,
        validePar: currentUserName || "Chef d'équipe"
      };

      // Yield briefly so the "ENVOI EN COURS..." state renders reliably
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Persist in localStorage (studies list + report cache) even if parent callback is omitted
      try {
        if (study?.id) {
          const storedStudies = localStorage.getItem('smtt_rfi_studies');
          if (storedStudies) {
            const parsedStudies: EtudeRFILoss[] = JSON.parse(storedStudies);
            const updatedStudies = parsedStudies.map((s) =>
              s.id === study.id
                ? { ...s, asBuiltData: nextData, status: 'Planifié' as const }
                : s
            );
            localStorage.setItem('smtt_rfi_studies', JSON.stringify(updatedStudies));
          }
        }
        if (report && study?.id) {
          localStorage.setItem(
            `rfi_report_${study.id}`,
            JSON.stringify({ ...report, asBuiltData: nextData })
          );
        }
      } catch (storageErr) {
        console.error('Erreur sauvegarde locale soumission As-Built :', storageErr);
      }

      // Update local state and notify parent handlers
      persistAsBuiltData(nextData, 'Planifié');

      // Send notification to Admin
      try {
        const storedNotifs = localStorage.getItem('smtt_notifications');
        const existingNotifs: AppNotification[] = storedNotifs ? JSON.parse(storedNotifs) : [];

        const newNotif: AppNotification = {
          id: `NOTIF-ASBUILT-${Date.now()}`,
          type: 'success',
          message: `📋 [Rapport As-Built Soumis - Étape 3] Le chef d'équipe ${currentUserName} a soumis ${photosTaken}/7 photos pour le site ${asBuiltData.nomSiteClient} (${asBuiltData.codeSiteClient}). En attente de validation Admin & génération PPTX.`,
          timestamp: nowIso,
          isRead: false,
          studyId: study?.id || reportId,
          senderName: currentUserName || "Chef d'équipe"
        };

        localStorage.setItem('smtt_notifications', JSON.stringify([newNotif, ...existingNotifs]));
        window.dispatchEvent(new Event('storage'));
      } catch (notifErr) {
        console.error('Erreur notification soumission AsBuilt', notifErr);
      }

      if (typeof onReportUpdated === 'function') {
        onReportUpdated();
      }

      const missingParts: string[] = [];
      if (photosTaken < 7) missingParts.push(`${photosTaken}/7 photos terrain`);
      if (validatedCount < 7) missingParts.push(`${validatedCount}/7 slides validées`);

      const successMsg =
        missingParts.length > 0
          ? `Rapport As-Built soumis avec succès à l'administrateur (Étape 3) ! Note : transmis avec ${missingParts.join(', ')}.`
          : "Rapport As-Built soumis avec succès à l'administrateur (Étape 3) !";

      setSubmissionNotice({ type: 'success', message: successMsg });
      showToast('success', successMsg, 5500);
    } catch (error) {
      console.error('Erreur lors de la soumission du rapport :', error);
      const errMsg = 'Échec de la soumission du rapport. Veuillez réessayer.';
      setSubmissionNotice({ type: 'error', message: errMsg });
      showToast('error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminValidation = async (status: 'Validé' | 'En attente' | 'Réserves') => {
    if (isSupabaseConfigured && status === 'Validé' && asBuiltData.supabaseReportId) {
      try {
        await validateAsBuiltReportByAdmin(asBuiltData.supabaseReportId);
      } catch (err) {
        console.error('Erreur validation rapport Supabase:', err);
      }
    }

    const nowIso = new Date().toISOString();
    const nextData: AsBuiltData = {
      ...asBuiltData,
      statusValidationAdmin: status,
      status: status === 'Validé' ? 'VALIDATED' : status === 'Réserves' ? 'CHANGES_REQUESTED' : asBuiltData.status,
      workflowStep: status === 'Réserves' ? 2 : 3,
      validePar: currentUserName,
      dateValidation: new Date().toLocaleDateString('fr-FR'),
      updatedAt: nowIso,
    };
    
    persistAsBuiltData(nextData, status === 'Validé' ? 'Terminé' : study?.status);
    showToast('success', `Statut du rapport mis à jour : ${status}`, 3000);
  };

  // Export PPTX Handler
  const handleGeneratePPTX = async () => {
    setIsExporting(true);
    setExportProgress(5);
    setExportStepName("Chargement du modèle Ooredoo AS_BUILT...");

    try {
      await generateAsBuiltPPTX(asBuiltData, (progress, stepName) => {
        setExportProgress(progress);
        setExportStepName(stepName);
      });

      showToast('success', 'Rapport PowerPoint AS_BUILT généré et téléchargé avec succès !', 4000);
    } catch (err: any) {
      console.error("PPTX Export Error:", err);
      showToast('error', "Erreur lors de la génération du fichier PowerPoint : " + (err?.message || "Erreur inconnue"));
    } finally {
      setIsExporting(false);
    }
  };

  const photosTakenCount = asBuiltData.photos.filter((p) => !!p.photoUrl).length;
  const activeStep = asBuiltData.photos[activeStepIndex];
  const rawAttestationSrc = asBuiltData.attestationImageUrl || asBuiltData.attestationScellementUrl || '';
  const attestationImageSrc =
    rawAttestationSrc &&
    !rawAttestationSrc.toLowerCase().endsWith('.pdf') &&
    !rawAttestationSrc.startsWith('data:application/pdf')
      ? rawAttestationSrc
      : '';
  const isSubmittedToAdmin =
    asBuiltData.workflowStep === 3 ||
    asBuiltData.status === 'SUBMITTED' ||
    asBuiltData.status === 'VALIDATED' ||
    asBuiltData.statusValidationAdmin === "Soumis à l'admin" ||
    asBuiltData.statusValidationAdmin === 'Validé';

  if (isChefEquipe) {
    return (
      <div className="space-y-6">
        {/* Toast notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-5 right-5 z-[100] pointer-events-none px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur border ${
                toast.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-500/50'
                  : toast.type === 'warning'
                  ? 'bg-amber-950 text-amber-100 border-amber-500/50'
                  : 'bg-emerald-900 text-white border-emerald-500/40'
              }`}
            >
              {toast.type === 'error' || toast.type === 'warning' ? (
                <AlertCircle className={`w-5 h-5 shrink-0 ${toast.type === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="pointer-events-auto ml-1 opacity-75 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Photo Modal */}
        <AnimatePresence>
          {previewImageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setPreviewImageUrl(null)}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImageUrl}
                alt="Aperçu Grand Format"
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* BLOC 1 : INFORMATIONS DU SITE (Compact & Lecture Seule) */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-red-500" />
            <span>Informations du Site</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Nom du site client
              </span>
              <p className="text-sm font-black text-white truncate">
                {asBuiltData.nomSiteClient}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Code Site Client
              </span>
              <p className="text-sm font-black text-red-400 truncate">
                {asBuiltData.codeSiteClient}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Adresse / Zone
              </span>
              <p className="text-sm font-bold text-slate-100 truncate">
                {extractedZone}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">
                Date prévue / réalisation
              </span>
              <p className="text-sm font-black text-emerald-400 truncate">
                {asBuiltData.dateRealisation}
              </p>
            </div>
          </div>
        </div>

        {/* BLOC 2 : EMPLACEMENTS DES PHOTOS TERRAIN (7 CASES DÉDIÉES) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-red-600" />
              <span>Emplacements des Photos Terrain</span>
            </h3>
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {photosTakenCount} / 7 photos ajoutées
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {asBuiltData.photos.map((step) => {
              const stepTitle =
                step.title === 'Installation Rack B2BNA' ? 'Installation Rack B2B' : step.title;

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                    step.photoUrl
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                        Slide {step.stepNumber + 1}
                      </span>
                      {step.photoUrl && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-snug min-h-[2rem]">
                      {stepTitle}
                    </h4>
                  </div>

                  {step.photoUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[4/3] group">
                      <img
                        src={step.photoUrl}
                        alt={stepTitle}
                        onClick={() => setPreviewImageUrl(step.photoUrl || null)}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(step.id)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-900/85 hover:bg-red-600 text-white rounded-lg shadow cursor-pointer transition-colors"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRefs.current[step.id]?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-red-500 bg-white rounded-xl aspect-[4/3] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors"
                    >
                      <Camera className="w-7 h-7 text-slate-400 mb-1.5" />
                      <span className="text-[11px] font-semibold text-slate-500">
                        Aucune photo
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={uploadingTarget === step.id}
                    onClick={() => fileInputRefs.current[step.id]?.click()}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70 ${
                      step.photoUrl
                        ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
                    }`}
                  >
                    {uploadingTarget === step.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        <span>Compression et envoi...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span>{step.photoUrl ? 'Remplacer la photo' : 'Ajouter / Prendre une photo'}</span>
                      </>
                    )}
                  </button>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploadingTarget === step.id}
                    ref={(el) => {
                      fileInputRefs.current[step.id] = el;
                    }}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(step.id, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* BLOC 3 : ACTION FINALE */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-300">
            {submissionNotice ? (
              <span
                className={`font-bold flex items-center gap-2 ${
                  submissionNotice.type === 'error' ? 'text-red-300' : 'text-emerald-300'
                }`}
              >
                {submissionNotice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{submissionNotice.message}</span>
              </span>
            ) : isSubmittedToAdmin ? (
              <span className="font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Rapport envoyé à l'administrateur ({photosTakenCount}/7 photos).</span>
              </span>
            ) : (
              <span>
                Photos prêtes : <strong className="text-white">{photosTakenCount} / 7</strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmitReport}
            disabled={isSubmitting}
            className="w-full sm:w-auto relative z-30 pointer-events-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:opacity-70 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>ENVOI EN COURS...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>SOUMETTRE LE RAPPORT</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-[100] pointer-events-none px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur border ${
              toast.type === 'error'
                ? 'bg-red-950 text-red-100 border-red-500/50'
                : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-100 border-amber-500/50'
                : 'bg-emerald-900 text-white border-emerald-500/40'
            }`}
          >
            {toast.type === 'error' || toast.type === 'warning' ? (
              <AlertCircle className={`w-5 h-5 shrink-0 ${toast.type === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="pointer-events-auto ml-1 opacity-75 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Photo Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewImageUrl(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Aperçu Grand Format"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKFLOW STEPS BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                FLUX DE TRAVAIL OFFICIEL (WORKFLOW OOREDOO)
              </span>
              <h3 className="text-sm font-black uppercase text-white">
                Module Saisie & Génération Rapport AS_BUILT (Slides 1 à 9)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
            <div className={`p-2 rounded-xl border text-center ${
              asBuiltData.nomSiteClient ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <span className="block font-black text-[9px] uppercase">Étape 1 (Admin)</span>
              <span>Info Site & Attestation</span>
            </div>

            <div className={`p-2 rounded-xl border text-center ${
              isSubmittedToAdmin || photosTakenCount === 7
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              <span className="block font-black text-[9px] uppercase">Étape 2 (Chef d'Équipe)</span>
              <span>
                {isSubmittedToAdmin
                  ? `✓ Soumis (${photosTakenCount}/7)`
                  : `${photosTakenCount}/7 Photos Terrain`}
              </span>
            </div>

            <div className={`p-2 rounded-xl border text-center transition-all ${
              asBuiltData.statusValidationAdmin === 'Validé'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : isSubmittedToAdmin
                ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-900/30'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <span className="block font-black text-[9px] uppercase">Étape 3 (Admin)</span>
              <span>
                {asBuiltData.statusValidationAdmin === 'Validé'
                  ? '✓ Validé & PPTX Prêt'
                  : isSubmittedToAdmin
                  ? 'En cours — Valider & PPTX'
                  : 'Valider & Générer PPTX'}
              </span>
            </div>
          </div>
        </div>

        {(submissionNotice || isSubmittedToAdmin) && (
          <div
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
              submissionNotice?.type === 'error'
                ? 'bg-red-950/70 border-red-500/50 text-red-200'
                : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {submissionNotice?.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>
                {submissionNotice?.message ||
                  `Rapport transmis à l'administrateur (Étape 3)${
                    asBuiltData.submittedBy ? ` par ${asBuiltData.submittedBy}` : ''
                  }.`}
              </span>
            </div>
            {submissionNotice && (
              <button
                type="button"
                onClick={() => setSubmissionNotice(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 1. HEADER CARD : PAGE DE GARDE AUTOMATIQUE (SLIDE 1 - READ ONLY FOR CHEF D'EQUIPE) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 text-white rounded-3xl p-6 shadow-2xl border border-red-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600 rounded-2xl text-white shadow-lg shadow-red-600/30">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-red-500/30">
                    SLIDE 1 : PAGE DE GARDE
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-emerald-500/30">
                    {isAdmin ? 'EXTRACTION RFI / ADMIN' : 'MODE LECTURE SEULE (CHEF D\'ÉQUIPE)'}
                  </span>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                  Information du Site (Page de Garde)
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-30 pointer-events-auto">
              <button
                type="button"
                onClick={handleToggleCoverValidation}
                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border shadow-md active:scale-95 ${
                  asBuiltData.coverValidatedByChef
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white'
                }`}
                title="Valider la conformité de la page de garde par le Chef d'équipe"
              >
                <CheckCircle className={`w-4 h-4 ${asBuiltData.coverValidatedByChef ? 'text-white' : 'text-emerald-400'}`} />
                <span>
                  {asBuiltData.coverValidatedByChef
                    ? "✓ Slide 1 Validée (Chef)"
                    : "Valider Slide 1 (Chef)"}
                </span>
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingCoverData(!isEditingCoverData)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-red-400" />
                    <span>{isEditingCoverData ? "Fermer l'édition" : "Éditer les données"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGeneratePPTX}
                    disabled={isExporting}
                    className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{exportProgress}% - Génération...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Valider & Générer PPTX</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {isChefEquipe && (
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={isSubmitting}
                  className="relative z-30 pointer-events-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:opacity-70 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ENVOI EN COURS...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {isSubmittedToAdmin ? 'SOUMIS (ÉTAPE 3) — RENVOYER' : 'SOUMETTRE LE RAPPORT'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Read-Only Cards for Page de Garde */}
          {!isEditingCoverData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Building className="w-3.5 h-3.5 text-red-400" />
                  <span>Nom Site Client</span>
                </div>
                <p className="text-sm font-black text-white truncate">
                  {asBuiltData.nomSiteClient}
                </p>
                <span className="text-[10px] text-slate-400 italic">Page de garde (Lecture seule)</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-red-400" />
                  <span>Code Site Client</span>
                </div>
                <p className="text-sm font-black text-red-400 truncate">
                  {asBuiltData.codeSiteClient}
                </p>
                <span className="text-[10px] text-slate-400 italic">Code site (Lecture seule)</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <User className="w-3.5 h-3.5 text-red-400" />
                  <span>Sous-traitant / Chefs</span>
                </div>
                <p className="text-sm font-black text-white truncate">
                  {asBuiltData.nomSousTraitant}
                </p>
                <span className="text-[10px] text-slate-400 italic">Chef d'équipe assigné</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  <span>Date Prévue / Réalisation</span>
                </div>
                <p className="text-sm font-black text-emerald-400 truncate">
                  {asBuiltData.dateRealisation}
                </p>
                <span className="text-[10px] text-slate-400 italic">Injecté automatiquement</span>
              </div>
            </div>
          ) : (
            /* Editable form for Admin only */
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur shadow-xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-red-400">
                Modification des Informations de la Page de Garde (Admin)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Nom site client</label>
                  <input
                    type="text"
                    value={asBuiltData.nomSiteClient}
                    onChange={(e) => setAsBuiltData({ ...asBuiltData, nomSiteClient: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Code site client</label>
                  <input
                    type="text"
                    value={asBuiltData.codeSiteClient}
                    onChange={(e) => setAsBuiltData({ ...asBuiltData, codeSiteClient: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-red-400 font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Sous-traitant</label>
                  <input
                    type="text"
                    value={asBuiltData.nomSousTraitant}
                    onChange={(e) => setAsBuiltData({ ...asBuiltData, nomSousTraitant: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Date de réalisation</label>
                  <input
                    type="text"
                    value={asBuiltData.dateRealisation}
                    onChange={(e) => setAsBuiltData({ ...asBuiltData, dateRealisation: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-emerald-400 font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CHAMP SAISIE DATE/HEURE INTERVENTION PAR CHEF D'EQUIPE */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-wider">
                b. Date & Heure Exacte de Début d'Intervention :
              </span>
            </div>
            <input
              type="text"
              value={dateDebutIntervention}
              onChange={(e) => {
                setDateDebutIntervention(e.target.value);
                setAsBuiltData(prev => ({ ...prev, dateRealisation: e.target.value }));
              }}
              placeholder="Ex: 2026-09-07 08:30"
              className="bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-64"
            />
            <span className="text-[11px] text-slate-400 italic">
              (Saisie terrain par le chef d'équipe)
            </span>
          </div>
        </div>
      </div>

      {/* Export Progress Bar Overlay */}
      {isExporting && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-lg space-y-3 animate-pulse">
          <div className="flex items-center justify-between text-xs font-black uppercase text-red-900">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
              {exportStepName}
            </span>
            <span>{exportProgress}%</span>
          </div>
          <div className="w-full bg-red-200 h-3 rounded-full overflow-hidden">
            <div
              className="bg-red-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. ADMIN ATTESTATION DE SCELLEMENT CARD (SLIDE 9 - ZONE VIERGE POUR UPLOAD ADMIN) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                SLIDE 9 : ATTESTATION DE SCELLEMENT
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                RÉSERVÉ À L'ADMIN
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900 mt-1">
              Importation du Scan / Photo de l'Attestation de Scellement
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Zone vierge par défaut : importez l'image officielle signée et cachetée pour l'insérer dans le Slide 9 du PPTX.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {attestationImageSrc ? (
              <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black uppercase px-3 py-1.5 rounded-xl border border-emerald-200">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Scan Importé (Slide 9)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-black uppercase px-3 py-1.5 rounded-xl border border-slate-200">
                <FileText className="w-4 h-4 text-slate-500" />
                Cadre Vierge (En attente Admin)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Admin Upload Controls & Uploaded Image Preview */}
          <div className="space-y-3">
            {attestationImageSrc ? (
              <>
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-white aspect-[16/9] group shadow-md flex items-center justify-center p-2">
                  <img
                    src={attestationImageSrc}
                    alt="Attestation de Scellement"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(attestationImageSrc)}
                      className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-xl cursor-pointer"
                      title="Agrandir"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 truncate max-w-[220px]">
                    {asBuiltData.attestationScellementName || 'Attestation_scellement.png'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(attestationImageSrc)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Agrandir
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          disabled={uploadingTarget === 'attestation'}
                          onClick={() => attestationFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                        >
                          {uploadingTarget === 'attestation' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Compression et envoi...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Remplacer</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteAttestation}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase bg-slate-900 hover:bg-black text-red-400 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div
                onClick={() => {
                  if (isAdmin && uploadingTarget !== 'attestation') attestationFileInputRef.current?.click();
                }}
                className={`border-2 border-dashed rounded-2xl p-6 aspect-[16/9] flex flex-col items-center justify-center text-center transition-all space-y-3 ${
                  isAdmin
                    ? 'border-slate-300 hover:border-red-500 bg-slate-50 hover:bg-red-50/30 cursor-pointer'
                    : 'border-slate-200 bg-slate-50 opacity-80 cursor-not-allowed'
                }`}
              >
                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                  {uploadingTarget === 'attestation' ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <p className="text-xs font-black uppercase text-slate-800">
                  {uploadingTarget === 'attestation'
                    ? 'Compression et envoi...'
                    : isAdmin
                    ? 'Importer l’Attestation de scellement (Scan / Photo)'
                    : 'Slide 9 : Attestation de scellement (Vierge)'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium max-w-sm">
                  {isAdmin
                    ? 'Formats acceptés : JPG, PNG, WebP, PDF. L’image est optimisée avant envoi.'
                    : "Zone réservée à l'Admin. Le cadre central du Slide 9 reste vierge jusqu'à l'importation du scan."}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={uploadingTarget === 'attestation'}
                    onClick={(e) => {
                      e.stopPropagation();
                      attestationFileInputRef.current?.click();
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-black uppercase px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-70 flex items-center gap-1.5"
                  >
                    {uploadingTarget === 'attestation' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Compression et envoi...</span>
                      </>
                    ) : (
                      <span>Importer l&apos;Attestation de scellement (Scan / Photo)</span>
                    )}
                  </button>
                )}
              </div>
            )}

            {isAdmin && (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*,application/pdf"
                disabled={uploadingTarget === 'attestation'}
                ref={attestationFileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAttestationUpload(file);
                }}
              />
            )}
          </div>

          {/* Right: Live Visual Preview of Slide 9 (Ooredoo Business Outer Frame + Blank White Center or Uploaded Scan) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                Aperçu Slide 9 (Modèle Ooredoo PPTX)
              </span>

              <button
                type="button"
                onClick={handleToggleAttestationValidation}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                  asBuiltData.attestationValidatedByChef
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className={`w-3.5 h-3.5 ${asBuiltData.attestationValidatedByChef ? 'text-white' : 'text-emerald-600'}`} />
                <span>
                  {asBuiltData.attestationValidatedByChef
                    ? "✓ Slide 9 Validée (Chef)"
                    : "Valider Slide 9 (Chef)"}
                </span>
              </button>
            </div>

            {/* Official 16:9 Slide 9 Miniature */}
            <div
              className="relative w-full aspect-[16/9] rounded-2xl border border-slate-300 shadow-inner overflow-hidden select-none"
              style={{
                backgroundColor: '#E6E6E6',
                backgroundImage:
                  'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.55), rgba(220,220,220,0.45)), radial-gradient(rgba(255,255,255,0.65) 1.5px, transparent 1.5px)',
                backgroundSize: '100% 100%, 16px 16px',
              }}
            >
              {/* Top red horizontal line */}
              <div
                className="absolute bg-[#ED1C24]"
                style={{ left: '14.25%', width: '69%', top: '9.3%', height: '2px' }}
              />

              {/* Central white box (completely empty when no image uploaded; centered scan only when uploaded) */}
              <div
                className="absolute bg-white border border-slate-300 flex items-center justify-center p-1.5"
                style={{ left: '17.25%', width: '65.25%', top: '11.3%', height: '78.6%' }}
              >
                {attestationImageSrc ? (
                  <img
                    src={attestationImageSrc}
                    alt="Aperçu Slide 9"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : null}
              </div>

              {/* Bottom-left Ooredoo Business logo */}
              <div
                className="absolute flex flex-col items-end leading-none"
                style={{ left: '3.75%', bottom: '3%' }}
              >
                <div className="flex items-center gap-[1.5px]">
                  {['o', 'o', 'r', 'e', 'd', 'o', 'o'].map((ch, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center justify-center rounded-full bg-[#ED1C24] text-white font-black text-[7px] w-3 h-3"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <span className="text-[7px] font-bold text-slate-500 tracking-tight -mt-0.5 pr-0.5">
                  business
                </span>
              </div>

              {/* Bottom red horizontal line */}
              <div
                className="absolute bg-[#ED1C24]"
                style={{ left: '26.25%', width: '69.75%', bottom: '7.3%', height: '2px' }}
              />

              {/* Slide number 9 */}
              <span
                className="absolute font-bold text-[#ED1C24] text-[10px]"
                style={{ right: '2.2%', bottom: '4.5%' }}
              >
                9
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODULE PRISE DE PHOTOS (FORMULAIRE DYNAMIQUE TECHNICIEN 7 ÉTAPES - SLIDES 2 À 8) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-700 text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                ÉTAPE 2 : CHEF D'ÉQUIPE TERRAIN
              </span>
              <span className="bg-red-50 text-red-700 text-xs font-black uppercase px-2.5 py-1 rounded-lg border border-red-200">
                SLIDES 2 À 8 (7 PHOTOS TERRAIN)
              </span>
            </div>
            <h3 className="text-lg font-black uppercase text-slate-900 mt-1">
              Prise des Photos Terrain As-Built
            </h3>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <div className="text-right">
              <span className="text-xs text-slate-500 font-bold uppercase block">
                Progression
              </span>
              <span className="text-sm font-black text-slate-900">
                {photosTakenCount} / 7 Photos Prises
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-red-600/20">
              {Math.round((photosTakenCount / 7) * 100)}%
            </div>
          </div>
        </div>

        {/* Horizontal Steps Nav (1 à 7) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {asBuiltData.photos.map((step, idx) => {
            const isCompleted = !!step.photoUrl;
            const isActive = idx === activeStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-24 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl ring-2 ring-red-500/50'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Slide {step.stepNumber + 1}
                  </span>
                  {isCompleted && (
                    <CheckCircle className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  )}
                </div>

                <p className="text-xs font-bold leading-tight line-clamp-2">
                  {step.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* ACTIVE STEP INTERACTIVE CAPTURE CARD */}
        {activeStep && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs font-black uppercase px-3 py-1 rounded-lg">
                    Slide {activeStep.stepNumber + 1} : Étape {activeStep.stepNumber} / 7
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {activeStep.status || 'Conforme'}
                  </span>
                </div>
                <h4 className="text-xl font-black text-slate-900 uppercase">
                  {activeStep.title}
                </h4>
                <p className="text-xs font-semibold text-slate-600">
                  {activeStep.description}
                </p>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-slate-600 px-2">
                  {activeStepIndex + 1} / 7
                </span>
                <button
                  disabled={activeStepIndex === 6}
                  onClick={() => setActiveStepIndex((prev) => Math.min(6, prev + 1))}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Capture & Upload Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Display / Dropzone */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                  Photo terrain de l'Étape {activeStep.stepNumber} (Slide {activeStep.stepNumber + 1})
                </label>

                {activeStep.photoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-300 bg-black aspect-[4/3] group shadow-lg">
                    <img
                      src={activeStep.photoUrl}
                      alt={activeStep.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Image overlay actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 backdrop-blur-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(activeStep.photoUrl || null)}
                        className="p-3 bg-white/20 hover:bg-white/40 text-white rounded-xl backdrop-blur transition-all cursor-pointer"
                        title="Agrandir"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[activeStep.id]?.click()}
                        className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all cursor-pointer"
                        title="Remplacer la photo"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(activeStep.id)}
                        className="p-3 bg-slate-900 hover:bg-black text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/20">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{activeStep.timestamp || 'Horodaté'}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRefs.current[activeStep.id]?.click()}
                    className="border-2 border-dashed border-red-300 hover:border-red-500 bg-white hover:bg-red-50/50 rounded-2xl p-8 aspect-[4/3] flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 group shadow-sm"
                  >
                    <div className="p-4 bg-red-100 group-hover:bg-red-600 text-red-600 group-hover:text-white rounded-2xl transition-all shadow-md">
                      {uploadingTarget === activeStep.id ? (
                        <RefreshCw className="w-8 h-8 animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">
                        {uploadingTarget === activeStep.id
                          ? 'Compression et envoi...'
                          : 'Prendre ou Sélectionner Photo'}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Appareil photo mobile / Galerie du téléphone
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-black uppercase px-4 py-2 rounded-xl shadow-md group-hover:scale-105 transition-all">
                      {uploadingTarget === activeStep.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Compression et envoi...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Prendre la Photo Étape {activeStep.stepNumber}</span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Hidden Camera File Input with mobile capture support */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={uploadingTarget === activeStep.id}
                  ref={(el) => (fileInputRefs.current[activeStep.id] = el)}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(activeStep.id, file);
                  }}
                />
              </div>

              {/* Technical Details & Status Selector */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200">
                <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider border-b border-slate-100 pb-2">
                  Détails Techniques Étape {activeStep.stepNumber}
                </h5>

                {/* Status Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Statut de la Réalisation:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeStep.id, 'Conforme')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        (activeStep.status || 'Conforme') === 'Conforme'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Conforme
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeStep.id, 'Non Conforme')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        activeStep.status === 'Non Conforme'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Non Conforme
                    </button>
                  </div>
                </div>

                {/* CHEF D'ÉQUIPE SLIDE VALIDATION BUTTON */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Validation Conformité Slide {activeStep.stepNumber + 1} (Chef d'Équipe) :
                  </label>
                  <button
                    type="button"
                    onClick={() => handleToggleStepValidation(activeStep.id)}
                    className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md active:scale-98 ${
                      activeStep.validatedByChef
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/20'
                    }`}
                  >
                    <CheckCircle className={`w-5 h-5 ${activeStep.validatedByChef ? 'text-white' : 'text-emerald-300'}`} />
                    <span>
                      {activeStep.validatedByChef
                        ? `✓ Slide ${activeStep.stepNumber + 1} Validée Conforme (Chef d'Équipe)`
                        : `Valider la Conformité Slide ${activeStep.stepNumber + 1} (Chef d'Équipe)`}
                    </span>
                  </button>
                  {activeStep.validatedByChef && activeStep.chefValidationDate && (
                    <p className="text-[10px] text-emerald-700 font-bold text-center bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200">
                      Slide validée conforme par {activeStep.chefValidatorName || "Chef d'équipe"} le {activeStep.chefValidationDate}
                    </p>
                  )}
                </div>

                {/* Technician Comment Field */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Observations / Remarques du Technicien:
                  </label>
                  <textarea
                    rows={3}
                    value={activeStep.comment || ''}
                    onChange={(e) => handleCommentChange(activeStep.id, e.target.value)}
                    placeholder="Saisissez vos observations pour cette étape (ex: support fixé avec haubans, câble moulé et étiqueté)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                {/* Step Summary Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Site Client:</span>
                    <span className="text-slate-900">{asBuiltData.nomSiteClient}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Code Site:</span>
                    <span className="text-red-600">{asBuiltData.codeSiteClient}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Horodatage photo:</span>
                    <span className="text-emerald-700">{activeStep.timestamp || 'Attente de photo'}</span>
                  </div>
                </div>

                {/* Next Step Button */}
                {activeStepIndex < 6 && (
                  <button
                    onClick={() => setActiveStepIndex((prev) => prev + 1)}
                    className="w-full bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <span>Valider & Passer à l'Étape {activeStepIndex + 2}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. CHEF SUBMIT OR ADMIN VALIDATION PANEL */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded-lg">
                  {isAdmin ? 'ÉTAPES 3 : VALIDATION ADMIN' : 'SOUMISSION PAR CHEF D\'ÉQUIPE'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  RAPPORT AS_BUILT PPTX
                </span>
              </div>
              <h4 className="text-base font-black uppercase text-white mt-1">
                {isAdmin ? 'Vérification Admin & Génération du Rapport PPTX' : 'Transmission des Photos Terrain à l\'Admin SMTT'}
              </h4>
            </div>

            {/* Validation Buttons (Admin) or Submit Button (Chef) */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdminValidation('Validé')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all ${
                    asBuiltData.statusValidationAdmin === 'Validé'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Rapport Validé
                </button>

                <button
                  type="button"
                  onClick={() => handleAdminValidation('Réserves')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition-all ${
                    asBuiltData.statusValidationAdmin === 'Réserves'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Réserves
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="relative z-30 pointer-events-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700 disabled:opacity-70 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ENVOI EN COURS...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmittedToAdmin
                        ? "Soumis (Étape 3) — Renvoyer à l'Admin"
                        : "Soumettre le rapport à l'Admin"}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <p>
                <strong className="text-white">Opérateur terrain:</strong> {currentUserName}
              </p>
              <p>
                <strong className="text-white">Photos conformes enregistrées:</strong> {photosTakenCount} / 7 photos
              </p>
              <p>
                <strong className="text-white">Slide 9 Attestation:</strong> {attestationImageSrc ? 'Scan importé' : 'Cadre vierge (Admin)'}
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={handleGeneratePPTX}
                disabled={isExporting}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{exportProgress}% - Génération PPTX Ooredoo...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Valider & Générer le rapport PPTX (Slides 1 à 9)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 5. SUMMARY TABLE OF ALL STEPS */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <h5 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Récapitulatif des Slides 2 à 8 (Photos Terrain Chef d'Équipe)
            </h5>
            <span className="text-xs text-slate-300 font-bold">
              {photosTakenCount} / 7 Valides
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {asBuiltData.photos.map((step) => (
              <div
                key={step.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {step.photoUrl ? (
                      <img
                        src={step.photoUrl}
                        alt={step.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      Slide {step.stepNumber + 1}
                    </span>
                    <h6 className="text-xs font-black text-slate-900 uppercase mt-0.5">
                      {step.title}
                    </h6>
                    <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                      {step.comment || step.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                      step.photoUrl
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {step.photoUrl ? 'Photo Prise' : 'En attente'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleStepValidation(step.id)}
                    className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer border ${
                      step.validatedByChef
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle className={`w-3 h-3 ${step.validatedByChef ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{step.validatedByChef ? 'Validé Chef' : 'Valider'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveStepIndex(step.stepNumber - 1);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Saisir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}