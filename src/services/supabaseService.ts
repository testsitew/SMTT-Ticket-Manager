import {
  supabase,
  isSupabaseConfigured,
  createSecondarySupabaseClient,
} from '../lib/supabase.js';
import { compressImage } from '../utils/imageCompressor.js';
import type {
  SupabaseProfile,
  SupabaseRole,
  TicketB2CRecord,
  AsBuiltReportRecord,
  ReportPhotoRecord,
} from '../types';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null): boolean {
  return Boolean(value && UUID_REGEX.test(value));
}

// ---------------------------------------------------------------------------
// 1. AUTHENTICATION & PROFILES
// ---------------------------------------------------------------------------

export async function signInWithSupabase(email: string, password: string): Promise<{
  user: { id: string; email: string };
  profile: SupabaseProfile;
}> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré (renseignez src/lib/supabase.js).');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Email ou mot de passe incorrect.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      profileError?.message ||
        "Profil utilisateur introuvable dans la table 'profiles'."
    );
  }

  if (profile.actif === false) {
    await supabase.auth.signOut();
    throw new Error("Ce compte est désactivé. Contactez l'administrateur.");
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || email.trim(),
    },
    profile: profile as SupabaseProfile,
  };
}

export async function getActiveSupabaseSessionProfile(): Promise<{
  id: string;
  email: string;
  profile: SupabaseProfile;
} | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || profile.actif === false) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    profile: profile as SupabaseProfile,
  };
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// 2. ADMIN USER MANAGEMENT (Secondary client + profiles updates + Realtime)
// ---------------------------------------------------------------------------

export async function fetchAllProfiles(): Promise<SupabaseProfile[]> {
  if (!supabase || !isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    console.error('Erreur chargement profiles:', error);
    throw error;
  }
  return (data || []) as SupabaseProfile[];
}

export async function createUserAccountAdmin(params: {
  nom: string;
  email: string;
  password: string;
  role: SupabaseRole;
  zone: string;
}): Promise<{ userId?: string }> {
  const secondaryClient = createSecondarySupabaseClient();
  if (!secondaryClient) {
    throw new Error('Supabase non configuré dans src/lib/supabase.js.');
  }

  const { data, error } = await secondaryClient.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: {
        nom: params.nom.trim(),
        role: params.role,
        zone: params.zone.trim(),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Fallback upsert in case SQL trigger runs asynchronously or lacks email/actif defaults
  if (data.user && supabase) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          nom: params.nom.trim(),
          role: params.role,
          zone: params.zone.trim(),
          actif: true,
        },
        { onConflict: 'id' }
      );
    } catch {
      // Trigger may already handle insert or RLS may restrict upsert; safe to ignore
    }
  }

  return { userId: data.user?.id };
}

export async function updateProfileAdmin(
  profileId: string,
  updates: Partial<Pick<SupabaseProfile, 'role' | 'zone' | 'actif' | 'nom'>>
): Promise<SupabaseProfile> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupabaseProfile;
}

export function subscribeProfilesRealtime(onUpdate: () => void): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`profiles-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// 3. TICKETS B2C REALTIME (with technicien:profiles(nom, zone))
// ---------------------------------------------------------------------------

export async function fetchTicketsB2C(): Promise<TicketB2CRecord[]> {
  if (!supabase || !isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('tickets_b2c')
    .select('*, technicien:profiles(nom, zone)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Lecture tickets_b2c avec jointure fallback:', error.message);
    const simple = await supabase.from('tickets_b2c').select('*');
    if (simple.error) {
      console.error('Erreur chargement tickets_b2c:', simple.error);
      return [];
    }
    return (simple.data || []) as TicketB2CRecord[];
  }

  return (data || []) as TicketB2CRecord[];
}

export async function createTicketB2C(payload: {
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
}): Promise<TicketB2CRecord | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('tickets_b2c')
    .insert(payload)
    .select('*, technicien:profiles(nom, zone)')
    .single();

  if (!error && data) {
    return data as TicketB2CRecord;
  }

  // Fallback with minimal guaranteed columns if schema uses a narrower subset
  const minimalPayload: Record<string, unknown> = {
    statut: payload.statut || 'Créé',
  };
  if (payload.date_planification) {
    minimalPayload.date_planification = payload.date_planification;
  }
  if (payload.technicien_id && isUuid(payload.technicien_id)) {
    minimalPayload.technicien_id = payload.technicien_id;
  }
  if (payload.client) minimalPayload.client = payload.client;
  if (payload.code_site) minimalPayload.code_site = payload.code_site;
  if (payload.titre) minimalPayload.titre = payload.titre;

  const retry = await supabase
    .from('tickets_b2c')
    .insert(minimalPayload)
    .select('*')
    .single();

  if (retry.error) {
    console.error('Erreur création ticket tickets_b2c:', retry.error);
    throw new Error(retry.error.message);
  }
  return retry.data as TicketB2CRecord;
}

export async function updateTicketB2CPlanificationAndStatut(
  ticketId: string,
  updates: { date_planification?: string | null; statut?: string }
): Promise<TicketB2CRecord | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('tickets_b2c')
    .update(updates)
    .eq('id', ticketId)
    .select('*, technicien:profiles(nom, zone)')
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as TicketB2CRecord;
}

export async function deleteTicketB2C(ticketId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  const { error } = await supabase.from('tickets_b2c').delete().eq('id', ticketId);
  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeTicketsB2CRealtime(onUpdate: () => void): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`tickets-b2c-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets_b2c' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// 4. AS-BUILT REPORTS, REPORT PHOTOS & STORAGE ('as-built-files')
// ---------------------------------------------------------------------------

export async function fetchAsBuiltReportsWithPhotos(): Promise<
  AsBuiltReportRecord[]
> {
  if (!supabase || !isSupabaseConfigured) return [];

  const { data: reports, error } = await supabase
    .from('as_built_reports')
    .select('*, report_photos(*)')
    .order('created_at', { ascending: false });

  if (!error && reports) {
    return reports as AsBuiltReportRecord[];
  }

  // Fallback query without nested relation if FK relationship isn't exposed in PostgREST cache
  const [{ data: repList }, { data: photoList }] = await Promise.all([
    supabase.from('as_built_reports').select('*'),
    supabase.from('report_photos').select('*'),
  ]);

  const photosByReport = new Map<string, ReportPhotoRecord[]>();
  (photoList || []).forEach((p: any) => {
    const list = photosByReport.get(p.report_id) || [];
    list.push(p as ReportPhotoRecord);
    photosByReport.set(p.report_id, list);
  });

  return (repList || []).map((r: any) => ({
    ...(r as AsBuiltReportRecord),
    report_photos: photosByReport.get(r.id) || [],
  }));
}

export async function ensureAsBuiltReport(params: {
  existingReportId?: string;
  ticketId?: string;
  studyId?: string;
  typeRapport?: 'FH' | 'GC';
  nomSiteClient?: string;
  codeSiteClient?: string;
  nomSousTraitant?: string;
  dateRealisation?: string;
}): Promise<string> {
  if (!supabase || !isSupabaseConfigured) {
    return params.existingReportId || params.studyId || params.ticketId || `LOCAL-${Date.now()}`;
  }

  if (params.existingReportId && isUuid(params.existingReportId)) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id')
      .eq('id', params.existingReportId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (params.studyId) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id')
      .eq('study_id', params.studyId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (params.codeSiteClient) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id')
      .eq('code_site_client', params.codeSiteClient)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const insertPayload: Record<string, unknown> = {
    statut: 'BROUILLON',
    type_rapport: params.typeRapport || 'GC',
    nom_site_client: params.nomSiteClient || 'Site Client Ooredoo',
    code_site_client: params.codeSiteClient || params.studyId || 'SITE',
    nom_sous_traitant: params.nomSousTraitant || 'SMTT',
    date_realisation: params.dateRealisation || new Date().toISOString().split('T')[0],
  };
  if (params.studyId) insertPayload.study_id = params.studyId;
  if (params.ticketId && isUuid(params.ticketId)) insertPayload.ticket_id = params.ticketId;

  const { data, error } = await supabase
    .from('as_built_reports')
    .insert(insertPayload)
    .select('id')
    .single();

  if (!error && data?.id) {
    return data.id;
  }

  // Minimal fallback insert if custom columns don't exist
  const minimal = await supabase
    .from('as_built_reports')
    .insert({ statut: 'BROUILLON' })
    .select('id')
    .single();

  if (minimal.error || !minimal.data?.id) {
    throw new Error(minimal.error?.message || error?.message || "Impossible de créer l'entrée as_built_reports.");
  }

  return minimal.data.id;
}

function getStorageFileExtension(file: File | Blob): string {
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'application/pdf') return 'pdf';
  if (file instanceof File && file.name.includes('.')) {
    return file.name.split('.').pop()?.toLowerCase() || 'jpg';
  }
  return 'jpg';
}

export async function uploadSlidePhotoToStorage(params: {
  reportId: string;
  slideNumber: number;
  file: File | Blob;
  contentType?: string;
}): Promise<{ publicUrl: string }> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré.');
  }

  const timestamp = Date.now();
  const sourceFile =
    params.file instanceof File
      ? params.file
      : new File([params.file], `slide_${params.slideNumber}_${timestamp}.jpg`, {
          type: params.contentType || params.file.type || 'image/jpeg',
        });

  const processedFile = await compressImage(sourceFile, {
    maxDimension: 1280,
    quality: 0.8,
    fileName: `slide_${params.slideNumber}_${timestamp}.jpg`,
  });

  const ext = getStorageFileExtension(processedFile);
  const filePath = `reports/${params.reportId}/slide_${params.slideNumber}_${timestamp}.${ext}`;
  const finalContentType = processedFile.type || params.contentType || 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('as-built-files')
    .upload(filePath, processedFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: finalContentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage
    .from('as-built-files')
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // Save or update record in report_photos
  const { data: existingPhoto } = await supabase
    .from('report_photos')
    .select('id')
    .eq('report_id', params.reportId)
    .eq('slide_number', params.slideNumber)
    .maybeSingle();

  if (existingPhoto?.id) {
    const { error: updateErr } = await supabase
      .from('report_photos')
      .update({ photo_url: publicUrl })
      .eq('id', existingPhoto.id);
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { error: insertErr } = await supabase
      .from('report_photos')
      .insert({
        report_id: params.reportId,
        slide_number: params.slideNumber,
        photo_url: publicUrl,
      });
    if (insertErr) throw new Error(insertErr.message);
  }

  return { publicUrl };
}

export async function deleteSlidePhotoFromDatabase(
  reportId: string,
  slideNumber: number
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const { error } = await supabase
    .from('report_photos')
    .delete()
    .eq('report_id', reportId)
    .eq('slide_number', slideNumber);

  if (error) {
    console.error('Erreur suppression photo report_photos:', error);
    throw new Error(error.message);
  }
}

export async function uploadAttestationSlide9ToStorage(params: {
  reportId: string;
  file: File;
}): Promise<{ publicUrl: string }> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase non configuré.');
  }

  const timestamp = Date.now();
  const processedFile = await compressImage(params.file, {
    maxDimension: 1280,
    quality: 0.8,
    fileName: `slide_9_${timestamp}.jpg`,
  });

  const ext = getStorageFileExtension(processedFile);
  const filePath = `reports/${params.reportId}/slide_9_${timestamp}.${ext}`;
  const finalContentType = processedFile.type || 'image/jpeg';

  const { error: uploadError } = await supabase.storage
    .from('as-built-files')
    .upload(filePath, processedFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: finalContentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage
    .from('as-built-files')
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  const { error: updateErr } = await supabase
    .from('as_built_reports')
    .update({ attestation_slide9_url: publicUrl })
    .eq('id', params.reportId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  return { publicUrl };
}

export async function clearAttestationSlide9InDatabase(
  reportId: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const { error } = await supabase
    .from('as_built_reports')
    .update({ attestation_slide9_url: null })
    .eq('id', reportId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitAsBuiltReportToAdmin(
  reportId: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const { error } = await supabase
    .from('as_built_reports')
    .update({ statut: 'SOUMIS' })
    .eq('id', reportId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function validateAsBuiltReportByAdmin(
  reportId: string
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const { error } = await supabase
    .from('as_built_reports')
    .update({ statut: 'VALIDE' })
    .eq('id', reportId);

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeAsBuiltRealtime(onUpdate: () => void): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`asbuilt-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'as_built_reports' },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'report_photos' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(channel);
  };
}

async function cleanupStorageFolderForReports(reportIds: string[]): Promise<void> {
  if (!supabase || reportIds.length === 0) return;
  for (const repId of reportIds) {
    try {
      const { data: files } = await supabase.storage
        .from('as-built-files')
        .list(`reports/${repId}`);
      if (files && files.length > 0) {
        const paths = files.map((f) => `reports/${repId}/${f.name}`);
        await supabase.storage.from('as-built-files').remove(paths);
      }
    } catch {
      // Best-effort storage cleanup; DB deletion must still proceed
    }
  }
}

export async function deleteGcReportAndTicketFromSupabase(params: {
  reportId?: string;
  studyId?: string;
  codeSiteClient?: string;
  ticketId?: string | null;
}): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const matchedReports: Array<{
    id: string;
    ticket_id?: string | null;
    type_rapport?: string | null;
  }> = [];

  if (params.reportId && isUuid(params.reportId)) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id, ticket_id, type_rapport')
      .eq('id', params.reportId);
    if (data) matchedReports.push(...(data as any[]));
  }

  if (params.studyId) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id, ticket_id, type_rapport')
      .eq('study_id', params.studyId);
    if (data) {
      (data as any[])
        .filter((r) => (r.type_rapport || 'GC').toUpperCase() !== 'FH')
        .forEach((r) => {
          if (!matchedReports.some((m) => m.id === r.id)) matchedReports.push(r);
        });
    }
  }

  if (params.codeSiteClient) {
    const { data } = await supabase
      .from('as_built_reports')
      .select('id, ticket_id, type_rapport')
      .eq('code_site_client', params.codeSiteClient);
    if (data) {
      (data as any[])
        .filter((r) => (r.type_rapport || 'GC').toUpperCase() !== 'FH')
        .forEach((r) => {
          if (!matchedReports.some((m) => m.id === r.id)) matchedReports.push(r);
        });
    }
  }

  const reportIds = Array.from(
    new Set(matchedReports.map((r) => r.id).filter(Boolean))
  );

  const ticketIds = Array.from(
    new Set(
      [
        params.ticketId,
        params.studyId && isUuid(params.studyId) ? params.studyId : null,
        ...matchedReports.map((r) => r.ticket_id),
      ].filter((id): id is string => Boolean(id && isUuid(id)))
    )
  );

  if (reportIds.length > 0) {
    const { error: photosErr } = await supabase
      .from('report_photos')
      .delete()
      .in('report_id', reportIds);
    if (photosErr) {
      throw new Error(photosErr.message);
    }

    const { error: repErr } = await supabase
      .from('as_built_reports')
      .delete()
      .in('id', reportIds);
    if (repErr) {
      throw new Error(repErr.message);
    }

    await cleanupStorageFolderForReports(reportIds);
  }

  if (ticketIds.length > 0) {
    const { error: tktErr } = await supabase
      .from('tickets_b2c')
      .delete()
      .in('id', ticketIds);
    if (tktErr) {
      throw new Error(tktErr.message);
    }
  }
}

export async function clearAllGcReportsFromSupabase(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const { data: allReports, error: fetchErr } = await supabase
    .from('as_built_reports')
    .select('id, ticket_id, study_id, code_site_client, type_rapport');

  if (fetchErr) {
    throw new Error(fetchErr.message);
  }

  const gcReports = (allReports || []).filter(
    (r: any) => (r.type_rapport || 'GC').toUpperCase() !== 'FH'
  );

  const reportIds: string[] = Array.from(
    new Set(gcReports.map((r: any) => r.id).filter(Boolean))
  );

  const linkedTicketIds: string[] = Array.from(
    new Set(
      gcReports
        .flatMap((r: any) => [r.ticket_id, isUuid(r.study_id) ? r.study_id : null])
        .filter((id: any): id is string => Boolean(id && isUuid(id)))
    )
  );

  if (reportIds.length > 0) {
    const { error: photosErr } = await supabase
      .from('report_photos')
      .delete()
      .in('report_id', reportIds);
    if (photosErr) {
      throw new Error(photosErr.message);
    }

    const { error: repErr } = await supabase
      .from('as_built_reports')
      .delete()
      .in('id', reportIds);
    if (repErr) {
      throw new Error(repErr.message);
    }

    await cleanupStorageFolderForReports(reportIds);
  }

  if (linkedTicketIds.length > 0) {
    const { error: tktErr } = await supabase
      .from('tickets_b2c')
      .delete()
      .in('id', linkedTicketIds);
    if (tktErr) {
      throw new Error(tktErr.message);
    }
  }
}
