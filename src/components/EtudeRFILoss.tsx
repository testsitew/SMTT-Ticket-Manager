import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  AlertCircle,
  Clock,
  Users,
  CheckCircle,
  Trash2,
  Filter,
  ChevronDown,
  FileText,
  Activity,
  Camera,
  Maximize,
  Hammer,
  Save,
  ArrowLeft,
  Plus,
  X,
  Image,
  Map,
  LayoutGrid,
  CheckCircle2,
  BarChart3,
  Download,
  ExternalLink,
  Printer,
  Radio,
  Building,
  Check,
  Eye,
  Send,
  Share2,
  Compass,
  FileCheck,
  Table,
  Columns,
  RefreshCw,
  AlertTriangle,
  Calculator,
  HelpCircle,
  Layers,
  Zap,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EtudeRFILoss, RfiReport, RemoteSiteInfo, VisAVisInfo, AppNotification } from '../types';
import { generateExcelReport, compressImage } from '../utils/excelExport';
import { generatePdfFromElement } from '../utils/pdfExport';
import { DonneesLosPage } from './DonneesLosPage';
import { ProfilsLosPage } from './ProfilsLosPage';
import { PhotosLosPage } from './PhotosLosPage';
import { PanoramiquesLosPage } from './PanoramiquesLosPage';
import { TravauxGcPage } from './TravauxGcPage';
import { ProfilBlock } from './ProfilBlock';
import { AsBuiltPhotoModule } from './AsBuiltPhotoModule';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

interface EtudeRFILossModuleProps {
  currentUserRole: string;
  currentUserName: string;
}

const RFI_ACTIONS = [
  "Remplacement Antenne",
  "Nouveau Site",
  "Optimisation de lien",
  "Maintenance Préventive",
  "Upgrade de Capacité"
];

interface RfiReportFormProps {
  study: EtudeRFILoss;
  currentUserRole: string;
  onSave: (report: RfiReport) => void;
  onCancel: () => void;
}

// Photo Frame Component for consistent UI
interface PhotoFrameProps {
  key?: React.Key;
  title: string;
  url: string;
  onUpload: (base64: string) => void;
  onDelete: () => void;
  icon?: React.ElementType;
  aspectRatio?: string;
}

function PhotoFrame({ title, url, onUpload, onDelete, icon: Icon = Camera, aspectRatio = 'aspect-[4/3]' }: PhotoFrameProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        onUpload(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full shadow-lg">
      {title && (
        <div className="bg-[#FF0000] text-white py-3 px-4 text-sm font-black uppercase tracking-wider text-center">
          {title}
        </div>
      )}
      <div className={`${aspectRatio} border-x border-b border-slate-200 flex flex-col items-center justify-center bg-white relative group overflow-hidden transition-all hover:bg-slate-50`}>
        {url ? (
          <>
            <img src={url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white text-slate-900 px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                Remplacer
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 group/btn w-full h-full justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center shadow-sm group-hover/btn:scale-110 group-hover/btn:border-red-500 group-hover/btn:bg-red-100 transition-all">
              <Camera className="w-8 h-8 text-red-400 group-hover/btn:text-red-600" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-black text-slate-600 uppercase tracking-tight group-hover/btn:text-red-700">📷 Prendre / Importer une photo</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cliquez pour capturer ou choisir un fichier</span>
            </div>
          </button>
        )}
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

function RfiReportForm({ study, currentUserRole, onSave, onCancel }: RfiReportFormProps) {
  const [activeTab, setActiveTab] = useState<'los' | 'profils' | 'photos' | 'panoramique' | 'gc' | 'asbuilt'>('los');
  const [activeRemoteSiteTab, setActiveRemoteSiteTab] = useState<string>('');
  const [viewModeRemoteSites, setViewModeRemoteSites] = useState<'grid' | 'tabs' | 'all'>('grid');
  const [draftToast, setDraftToast] = useState<string>('');
  const [validationWarning, setValidationWarning] = useState<string>('');
  const isAdmin = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase() === 'it';

  // Helper for Decimal to DMS formatted conversion
  const decToDms = (val: number | string, isLat: boolean): string => {
    if (val === '' || val === undefined || val === null) return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
    if (isNaN(num)) return '';
    const direction = isLat ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'O');
    const absVal = Math.abs(num);
    const degrees = Math.floor(absVal);
    const minutesNotTruncated = (absVal - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Robust DMS to DEC parser
  const parseDmsToDec = (dmsStr: string): string => {
    if (!dmsStr || typeof dmsStr !== 'string') return '';
    const str = dmsStr.trim().replace(',', '.');
    
    // Check if directly decimal number
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      const n = parseFloat(str);
      return isNaN(n) ? '' : n.toFixed(6);
    }

    // Pattern matching DMS like: 36°49'48.80"N, 36° 49' 48.80" N, 36d49m48.8sN, etc.
    const regex = /([NSEOWZ])?\s*([+-]?\d+(?:\.\d+)?)[°\s_dD]+(?:(\d+(?:\.\d+)?)[′'\s_mM]+)?(?:(\d+(?:\.\d+)?)[″"\s_sS]*)?\s*([NSEOWZ])?/i;
    const match = str.match(regex);
    if (!match) return '';

    const prefixDir = (match[1] || '').toUpperCase();
    const deg = parseFloat(match[2]);
    const min = match[3] ? parseFloat(match[3]) : 0;
    const sec = match[4] ? parseFloat(match[4]) : 0;
    const suffixDir = (match[5] || '').toUpperCase();
    const dir = suffixDir || prefixDir;

    if (isNaN(deg)) return '';

    let dec = Math.abs(deg) + (min / 60) + (sec / 3600);
    if (deg < 0 || dir === 'S' || dir === 'O' || dir === 'W') {
      dec = -dec;
    }
    return dec.toFixed(6);
  };

  // Reciprocal Azimuth calculator (Az + 180) % 360
  const computeReciprocalAzimuth = (azStr: string): string => {
    const az = parseFloat(azStr);
    if (isNaN(az)) return '';
    const reciprocal = (az + 180) % 360;
    return reciprocal.toFixed(0);
  };

  const [report, setReport] = useState<RfiReport>(() => {
    const adminRemoteCodes = (study.codesSitesDistants && study.codesSitesDistants.length > 0)
      ? study.codesSitesDistants
      : ['Site Distant 1', 'Site Distant 2', 'Site Distant 3'];

    const defaultReport: RfiReport = {
      donneesLOS: {
        header: {
          codeSite: study.id,
          nomSite: study.site,
          dateLOS: new Date().toISOString().split('T')[0],
          superviseur: { nom: study.superviseurLOS || '', tel: '' },
          maintenancier: { nom: study.maintenancier || '', tel: '' }
        },
        infoSite: {
          contactClient: study.contactClient?.nom ? `${study.contactClient.nom} / ${study.contactClient.tel}` : '',
          structureAConstruire: '',
          longueurCablePOE: '',
          remarquesAcces: ''
        },
        coordonnees: {
          latitudeDMS: '',
          longitudeDMS: '',
          latitudeDEC: study.gps?.latitude || '',
          longitudeDEC: study.gps?.longitude || '',
          hauteurBatiment: ''
        },
        sitesDistants: adminRemoteCodes.map((code, idx) => ({
          id: `rs_${idx + 1}_${Math.random().toString(36).substr(2, 6)}`,
          codeSiteDistant: code || `Site Distant ${idx + 1}`,
          statusLOS: 'Oui',
          gpsDMS: { lat: '', long: '', elev: '' },
          gpsDEC: { lat: '', long: '' },
          hauteurAntenneLocale: '',
          hauteurAntenneDistante: '',
          azimutLocalDistant: '',
          azimutDistantLocal: '',
          longueurBond: '',
          diametreAntenne: '',
          diametreAntenneDistante: '',
          frequence: '',
          longueurCableIF: '',
          longueurCablePOE: '',
          ajoutSupportMW: '',
          ajoutDepartEnergie: '',
          commentaire: ''
        })),
        resumeTrans: {
          siteLocal: 'LOS OK',
          siteDistant: ''
        }
      },
      visAVis: adminRemoteCodes.map((code, idx) => ({
        id: `vav_${idx + 1}`,
        codeSite: code || `Site Distant ${idx + 1}`,
        statusLOS: 'LOS OK',
        imageProfilUrl: '',
        commentaireProfil: '',
        imageGoogleMapsUrl: '',
        typeDeuxiemeImage: 'google' as const,
        titreDeuxiemeImage: 'Photo Obstacle',
        planCapilaire: [
          { codeSite: code || `Site Distant ${idx + 1}`, direction: '', tailleAntenne: '' }
        ]
      })),
      photosStructured: {
        zoomVisAVis: [
          { url: '', caption: 'PHOTO Zoom *1 vers site vi-à-vis' },
          { url: '', caption: 'PHOTO Zoom *2 vers site vi-à-vis' },
          { url: '', caption: 'PHOTO Zoom *3 vers site vi-à-vis' },
          { url: '', caption: 'PHOTO Zoom *4 vers site vi-à-vis' }
        ],
        vuesGenerales: [
          { url: '', caption: 'Vue Générale' },
          { url: '', caption: 'Vue du Disjoncteur' },
          { url: '', caption: 'Vue du Rack' },
          { url: '', caption: 'Emplacement Support' }
        ],
        structures: [
          { url: '', caption: 'Photos de la structure 1' },
          { url: '', caption: 'Photos de la structure 2' },
          { url: '', caption: 'Photos de la structure 3' },
          { url: '', caption: 'Emplacement Support' }
        ]
      },
      profils: [],
      photos: [],
      panoramiques: [
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 0°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 30°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 60°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 90°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 120°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 150°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 180°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 210°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 240°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 270°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 300°' },
        { url: '', caption: 'PHOTO PANORAMIQUE AZ. 330°' }
      ],
      travauxGC: {
        photos: [
          { url: '', caption: 'Vue Général' },
          { url: '', caption: 'Emplacement du Mât' },
          { url: '', caption: 'Emplacement du Mât' },
          { url: '', caption: 'Acces au Terrasse' },
          { url: '', caption: 'Acheminement câble POE' },
          { url: '', caption: 'Acheminement câble POE' },
          { url: '', caption: 'Acheminement câble POE' },
          { url: '', caption: 'Acheminement câble POE' },
          { url: '', caption: 'Passage de câble POE' },
          { url: '', caption: 'Emplacement Rack FH' },
          { url: '', caption: 'Source d\'énergie Rack' },
          { url: '', caption: 'Rack informatique' }
        ],
        annotationEchelle: '',
        annotationPassageCable: '',
        descriptionTechnique: '',
        ancrage: '',
        etatStructure: '',
        travauxMaconnerie: '',
        supportage: '',
        remarques: '',
        plans: {
          plan: '',
          planGC: ''
        }
      }
    };

    let existingReport: Partial<RfiReport> | null = null;
    const saved = localStorage.getItem(`rfi_report_${study.id}`);
    if (saved) {
      try {
        existingReport = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved report", e);
      }
    } else if (study.report) {
      existingReport = study.report;
    }

    if (!existingReport) return defaultReport;

    // Merge existing remote sites, or supplement with admin configured codes
    let existingSites = existingReport.donneesLOS?.sitesDistants || [];
    if (existingSites.length === 0) {
      existingSites = defaultReport.donneesLOS.sitesDistants;
    } else if (study.codesSitesDistants && study.codesSitesDistants.length > 0) {
      // Ensure any newly added admin site code exists
      study.codesSitesDistants.forEach((code, idx) => {
        const alreadyExists = existingSites.some(s => s.codeSiteDistant === code);
        if (!alreadyExists) {
          existingSites.push({
            id: `rs_adm_${idx}_${Math.random().toString(36).substr(2, 6)}`,
            codeSiteDistant: code,
            statusLOS: 'Oui',
            gpsDMS: { lat: '', long: '', elev: '' },
            gpsDEC: { lat: '', long: '' },
            hauteurAntenneLocale: '',
            hauteurAntenneDistante: '',
            azimutLocalDistant: '',
            azimutDistantLocal: '',
            longueurBond: '',
            diametreAntenne: '',
            diametreAntenneDistante: '',
            frequence: '',
            longueurCableIF: '',
            longueurCablePOE: '',
            ajoutSupportMW: '',
            ajoutDepartEnergie: '',
            commentaire: ''
          });
        }
      });
    }

    return {
      ...defaultReport,
      ...existingReport,
      donneesLOS: {
        ...defaultReport.donneesLOS,
        ...(existingReport.donneesLOS || {}),
        header: { ...defaultReport.donneesLOS.header, ...(existingReport.donneesLOS?.header || {}) },
        infoSite: { ...defaultReport.donneesLOS.infoSite, ...(existingReport.donneesLOS?.infoSite || {}) },
        coordonnees: { ...defaultReport.donneesLOS.coordonnees, ...(existingReport.donneesLOS?.coordonnees || {}) },
        sitesDistants: existingSites,
        resumeTrans: { ...defaultReport.donneesLOS.resumeTrans, ...(existingReport.donneesLOS?.resumeTrans || {}) },
      },
      photosStructured: {
        ...defaultReport.photosStructured,
        ...(existingReport.photosStructured || {}),
      },
      panoramiques: (existingReport.panoramiques && existingReport.panoramiques.length > 0) 
        ? existingReport.panoramiques 
        : defaultReport.panoramiques,
      visAVis: existingReport.visAVis || defaultReport.visAVis,
      travauxGC: {
        ...defaultReport.travauxGC,
        ...(existingReport.travauxGC || {}),
      }
    } as RfiReport;
  });

  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [pdfPreviewTab, setPdfPreviewTab] = useState<'donnees' | 'profils' | 'photos' | 'panoramique' | 'gc' | 'all'>('donnees');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);
  const hiddenPdfRef = React.useRef<HTMLDivElement>(null);
  const profilsContainerRef = React.useRef<HTMLDivElement>(null);
  const hiddenProfilsPdfRef = React.useRef<HTMLDivElement>(null);
  const photosContainerRef = React.useRef<HTMLDivElement>(null);
  const panoramiqueContainerRef = React.useRef<HTMLDivElement>(null);
  const gcContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-sync visAVis with sitesDistants
  useEffect(() => {
    const currentSites = report.donneesLOS.sitesDistants;
    if (!currentSites || currentSites.length === 0) return;

    setReport(prev => {
      let changed = false;
      const updatedVisAVis = [...(prev.visAVis || [])];

      currentSites.forEach((site, idx) => {
        const existingIdx = updatedVisAVis.findIndex(v => v.siteDistantId === site.id || v.codeSite === site.codeSiteDistant);
        const expectedStatus = site.statusLOS === 'Non' ? 'LOS Non OK' : 'LOS OK';

        if (existingIdx === -1) {
          changed = true;
          updatedVisAVis.push({
            id: `vav_${site.id || idx}`,
            siteDistantId: site.id,
            codeSite: site.codeSiteDistant || `Site Distant ${idx + 1}`,
            statusLOS: expectedStatus,
            imageProfilUrl: '',
            commentaireProfil: site.commentaire || '',
            imageGoogleMapsUrl: '',
            typeDeuxiemeImage: 'google',
            titreDeuxiemeImage: 'Localisation sur Google',
            planCapilaire: [
              { codeSite: site.codeSiteDistant || `Site ${idx + 1}`, direction: site.azimutLocalDistant ? `${site.azimutLocalDistant}°` : '', tailleAntenne: site.diametreAntenne ? `${site.diametreAntenne} cm` : '' }
            ]
          });
        } else {
          const currentVav = updatedVisAVis[existingIdx];
          if (currentVav.codeSite !== site.codeSiteDistant || currentVav.siteDistantId !== site.id || currentVav.statusLOS !== expectedStatus) {
            changed = true;
            updatedVisAVis[existingIdx] = {
              ...currentVav,
              siteDistantId: site.id,
              codeSite: site.codeSiteDistant || currentVav.codeSite,
              statusLOS: expectedStatus,
              commentaireProfil: currentVav.commentaireProfil || site.commentaire || ''
            };
          }
        }
      });

      if (!changed) return prev;
      return {
        ...prev,
        visAVis: updatedVisAVis
      };
    });
  }, [report.donneesLOS.sitesDistants]);

  // Set default active remote site tab
  useEffect(() => {
    if (!activeRemoteSiteTab && report.donneesLOS.sitesDistants.length > 0) {
      setActiveRemoteSiteTab(report.donneesLOS.sitesDistants[0].id);
    }
  }, [report.donneesLOS.sitesDistants]);

  // Auto-save effect in localStorage
  useEffect(() => {
    localStorage.setItem(`rfi_report_${study.id}`, JSON.stringify(report));
  }, [report, study.id]);

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(`rfi_report_${study.id}`, JSON.stringify(report));
      setDraftToast("💾 Brouillon de l'étude LOS enregistré avec succès sur votre appareil !");
      setTimeout(() => setDraftToast(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    // Check validation: If LOS = "Non", comment is mandatory
    const nonLosWithoutComment = report.donneesLOS.sitesDistants.find(
      s => s.statusLOS === 'Non' && (!s.commentaire || !s.commentaire.trim())
    );

    if (nonLosWithoutComment) {
      setValidationWarning(`Le commentaire / motif est OBLIGATOIRE pour le site distant "${nonLosWithoutComment.codeSiteDistant}" car la visibilité LOS est définie sur "NON". Veuillez préciser la raison (ex: Site inaccessible, obstacle relief/végétation, etc.).`);
      return;
    }

    setValidationWarning('');
    onSave(report);
  };

  const addRemoteSite = () => {
    const nextIdx = report.donneesLOS.sitesDistants.length + 1;
    const newSite: RemoteSiteInfo = {
      id: `rs_${nextIdx}_${Math.random().toString(36).substr(2, 6)}`,
      codeSiteDistant: `Site Distant ${nextIdx}`,
      statusLOS: 'Oui',
      gpsDMS: { lat: '', long: '', elev: '' },
      gpsDEC: { lat: '', long: '' },
      hauteurAntenneLocale: '',
      hauteurAntenneDistante: '',
      azimutLocalDistant: '',
      azimutDistantLocal: '',
      longueurBond: '',
      diametreAntenne: '',
      diametreAntenneDistante: '',
      frequence: '',
      longueurCableIF: '',
      longueurCablePOE: '',
      ajoutSupportMW: '',
      ajoutDepartEnergie: '',
      commentaire: '',
      chaineSiteLocal: 'LOS OK',
      chaineSiteDistant: ''
    };
    setReport({
      ...report,
      donneesLOS: {
        ...report.donneesLOS,
        sitesDistants: [...report.donneesLOS.sitesDistants, newSite]
      }
    });
    setActiveRemoteSiteTab(newSite.id);
  };

  const removeRemoteSite = (id: string) => {
    const filtered = report.donneesLOS.sitesDistants.filter(s => s.id !== id);
    setReport({
      ...report,
      donneesLOS: {
        ...report.donneesLOS,
        sitesDistants: filtered
      }
    });
    if (activeRemoteSiteTab === id && filtered.length > 0) {
      setActiveRemoteSiteTab(filtered[0].id);
    }
  };

  const updateRemoteSite = (id: string, field: string, value: any) => {
    setReport(prev => {
      const nextSites = prev.donneesLOS.sitesDistants.map(s => {
        if (s.id !== id) return s;

        let updated: RemoteSiteInfo = { ...s };

        if (field === 'gpsDMS.lat') {
          const dmsVal = value;
          const decVal = parseDmsToDec(dmsVal);
          updated = {
            ...updated,
            gpsDMS: { ...updated.gpsDMS, lat: dmsVal },
            gpsDEC: { ...updated.gpsDEC, lat: decVal || updated.gpsDEC.lat }
          };
        } else if (field === 'gpsDMS.long') {
          const dmsVal = value;
          const decVal = parseDmsToDec(dmsVal);
          updated = {
            ...updated,
            gpsDMS: { ...updated.gpsDMS, long: dmsVal },
            gpsDEC: { ...updated.gpsDEC, long: decVal || updated.gpsDEC.long }
          };
        } else if (field === 'gpsDEC.lat') {
          const decVal = value;
          const dmsVal = decToDms(decVal, true);
          updated = {
            ...updated,
            gpsDEC: { ...updated.gpsDEC, lat: decVal },
            gpsDMS: { ...updated.gpsDMS, lat: dmsVal || updated.gpsDMS.lat }
          };
        } else if (field === 'gpsDEC.long') {
          const decVal = value;
          const dmsVal = decToDms(decVal, false);
          updated = {
            ...updated,
            gpsDEC: { ...updated.gpsDEC, long: decVal },
            gpsDMS: { ...updated.gpsDMS, long: dmsVal || updated.gpsDMS.long }
          };
        } else if (field === 'azimutLocalDistant') {
          const azVal = value;
          const reciprocal = computeReciprocalAzimuth(azVal);
          const wasAutoReciprocal = !s.azimutDistantLocal || s.azimutDistantLocal === computeReciprocalAzimuth(s.azimutLocalDistant);
          updated = {
            ...updated,
            azimutLocalDistant: azVal,
            azimutDistantLocal: wasAutoReciprocal && reciprocal ? reciprocal : updated.azimutDistantLocal
          };
        } else if (field === 'longueurCableIF') {
          updated = {
            ...updated,
            longueurCableIF: value,
            longueurCablePOE: value
          };
        } else if (field.includes('.')) {
          const [parent, child] = field.split('.');
          updated = {
            ...updated,
            [parent]: { ...(updated[parent as keyof RemoteSiteInfo] as any), [child]: value }
          };
        } else {
          updated = {
            ...updated,
            [field]: value
          };
        }

        return updated;
      });

      return {
        ...prev,
        donneesLOS: {
          ...prev.donneesLOS,
          sitesDistants: nextSites
        }
      };
    });
  };

  // Field helper: Capture GPS for remote site
  const handleCaptureRemoteSiteGPS = (siteId: string) => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latDec = position.coords.latitude;
        const longDec = position.coords.longitude;
        const latDmsStr = decToDms(latDec, true);
        const longDmsStr = decToDms(longDec, false);

        setReport(prev => ({
          ...prev,
          donneesLOS: {
            ...prev.donneesLOS,
            sitesDistants: prev.donneesLOS.sitesDistants.map(s => {
              if (s.id === siteId) {
                return {
                  ...s,
                  gpsDEC: { lat: latDec.toFixed(6), long: longDec.toFixed(6) },
                  gpsDMS: { ...s.gpsDMS, lat: latDmsStr, long: longDmsStr }
                };
              }
              return s;
            })
          }
        }));
      },
      (err) => {
        alert("Impossible de récupérer la position GPS : " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Field helper: Generate technical string for remote site
  const generateResumeDistant = (rs: RemoteSiteInfo): string => {
    return `H1=${rs.hauteurAntenneLocale || '-'}m / D1=${rs.diametreAntenne || '-'}cm / Az=${rs.azimutLocalDistant || '-'}° / Dist=${rs.longueurBond || '-'}km / ${rs.codeSiteDistant || 'Site Distant'} / H2=${rs.hauteurAntenneDistante || '-'}m / D2=${rs.diametreAntenneDistante || '-'}cm / Freq=${rs.frequence || '-'}GHz`;
  };

  // Field helper: Generate local site string for remote site
  const generateResumeLocal = (rs: RemoteSiteInfo): string => {
    return rs.statusLOS === 'Oui' ? 'LOS OK' : 'LOS Non OK';
  };

  // Auto-generate all resume trans strings for all remote sites
  const handleAutoGenerateAllResumeTrans = () => {
    setReport(prev => {
      const updatedSites = prev.donneesLOS.sitesDistants.map(rs => ({
        ...rs,
        chaineSiteLocal: generateResumeLocal(rs),
        chaineSiteDistant: generateResumeDistant(rs)
      }));

      const firstSite = updatedSites[0];
      return {
        ...prev,
        donneesLOS: {
          ...prev.donneesLOS,
          sitesDistants: updatedSites,
          resumeTrans: {
            siteLocal: firstSite ? (firstSite.chaineSiteLocal || 'LOS OK') : prev.donneesLOS.resumeTrans.siteLocal,
            siteDistant: firstSite ? (firstSite.chaineSiteDistant || '') : prev.donneesLOS.resumeTrans.siteDistant
          }
        }
      };
    });
    setDraftToast("⚡ Chaînes de transmission générées automatiquement pour tous les sites distants !");
    setTimeout(() => setDraftToast(''), 3500);
  };

  const handleGenerateSiteResumeTrans = (siteId: string) => {
    setReport(prev => {
      const updatedSites = prev.donneesLOS.sitesDistants.map(rs => {
        if (rs.id === siteId) {
          return {
            ...rs,
            chaineSiteLocal: generateResumeLocal(rs),
            chaineSiteDistant: generateResumeDistant(rs)
          };
        }
        return rs;
      });

      const matched = updatedSites.find(s => s.id === siteId);
      return {
        ...prev,
        donneesLOS: {
          ...prev.donneesLOS,
          sitesDistants: updatedSites,
          resumeTrans: matched && matched.id === updatedSites[0]?.id ? {
            siteLocal: matched.chaineSiteLocal || 'LOS OK',
            siteDistant: matched.chaineSiteDistant || ''
          } : prev.donneesLOS.resumeTrans
        }
      };
    });
  };

  const handleExportExcel = () => {
    generateExcelReport(report, study.id);
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPdf(true);
      setDraftToast("📄 Génération du rapport PDF officiel Ooredoo en haute résolution...");
      
      const targetElement = hiddenPdfRef.current || pdfContainerRef.current;
      if (!targetElement) {
        setShowPdfPreview(true);
        setDraftToast("👁️ Aperçu de la Fiche LOS ouvert. Cliquez sur Télécharger le PDF.");
        setIsExportingPdf(false);
        return;
      }

      await generatePdfFromElement(targetElement, `Fiche_LOS_Survey_${report.donneesLOS.header.codeSite || study.id}_Ooredoo.pdf`);
      setDraftToast("✅ Fiche LOS Survey (Modèle Ooredoo Business) exportée en PDF !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la génération du PDF : " + (err?.message || "Erreur inconnue"));
    } finally {
      setIsExportingPdf(false);
      setTimeout(() => setDraftToast(''), 4000);
    }
  };

  const TABS = [
    { id: 'los', label: 'DONNÉES LOS', icon: FileText, completed: (report.donneesLOS?.sitesDistants?.length || 0) > 0 },
    { id: 'profils', label: 'PROFILS', icon: Activity, completed: report.visAVis?.some(v => v.imageProfilUrl || v.imageGoogleMapsUrl) || false },
    { id: 'photos', label: 'PHOTOS', icon: Camera, completed: report.photosStructured ? Object.values(report.photosStructured).some(section => (section as any[])?.some(p => p.url)) : false },
    { id: 'panoramique', label: 'PANORAMIQUE', icon: Maximize, completed: report.panoramiques?.some(p => !!p.url) || false },
    { id: 'gc', label: 'TRAVAUX GC', icon: Hammer, completed: !!report.travauxGC?.ancrage || !!report.travauxGC?.remarques },
    { id: 'asbuilt', label: 'RAPPORT AS_BUILT', icon: FileSpreadsheet, completed: !!report.asBuiltData?.photos?.some(p => !!p.photoUrl) },
  ];

  return (
    <div className="bg-slate-50 min-h-screen -m-6 p-4 md:p-6 space-y-6">
      
      {/* Toast Notification */}
      {draftToast && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-50 bg-slate-900 text-emerald-300 border border-emerald-500/40 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{draftToast}</span>
          <button onClick={() => setDraftToast('')} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Main Action Bar & Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onCancel}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
              title="Retour à la liste des missions"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  {study.id}
                </span>
                <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
                  Fiche Rapport Terrain LOS
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {study.site}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Export tools */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => {
                  if (activeTab === 'los') setPdfPreviewTab('donnees');
                  else if (activeTab === 'profils') setPdfPreviewTab('profils');
                  else if (activeTab === 'photos') setPdfPreviewTab('photos');
                  else if (activeTab === 'panoramique') setPdfPreviewTab('panoramique');
                  else if (activeTab === 'gc') setPdfPreviewTab('gc');
                  setShowPdfPreview(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-800 rounded-lg shadow-sm transition-all cursor-pointer border border-slate-200"
                title="Aperçu du Rapport Multi-pages"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" /> 
                {activeTab === 'los' ? 'Aperçu P1 (Données)' :
                 activeTab === 'profils' ? 'Aperçu P2 (Profils)' :
                 activeTab === 'photos' ? 'Aperçu P3 (Photos)' :
                 activeTab === 'panoramique' ? 'Aperçu P4 (360°)' :
                 activeTab === 'gc' ? 'Aperçu P5 (GC)' : 'Aperçu du Rapport'}
              </button>
              <button 
                onClick={() => handleExportExcel()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded-lg transition-all cursor-pointer"
                title="Exporter au format Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel
              </button>
              <button 
                disabled={isExportingPdf}
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded-lg transition-all cursor-pointer disabled:opacity-50"
                title="Exporter au format PDF"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 text-red-600 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                )} 
                {isExportingPdf ? 'Export...' : 'PDF'}
              </button>
            </div>

            {/* Save Draft Button */}
            <button
              onClick={handleSaveDraft}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Enregistrer Brouillon
            </button>

            {/* Final Validation & Submit */}
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              Enregistrer / Valider l'étude LOS
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-red-300 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.completed && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-white shadow-sm">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* =========================================================================
            TAB 1: DONNÉES LOS (CHEF D'ÉQUIPE WORKFLOW & SITES DISTANTS DYNAMIQUES)
            ========================================================================= */}
        {activeTab === 'los' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 1. CARTE RÉCAPITULATIVE : DONNÉES DE LA MISSION INITIALES (SAISIES PAR L'ADMIN) */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-600 rounded-xl text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
                      1. Fiche d'Intervention Assignée par l'Admin
                    </span>
                    <h3 className="text-base font-black text-white">
                      Mission Survey LOS : <span className="text-red-400">{study.site}</span> ({study.id})
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    study.status === 'Terminé' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    study.status === 'Planifié' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    Statut: {study.status}
                  </span>
                </div>
              </div>

              {/* Grid 7 Champs Requis Admin */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Site */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Site Principal</span>
                  <p className="font-bold text-white text-sm">{study.site}</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {study.id}</p>
                </div>

                {/* Coordonnées GPS (CGPS) */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block flex items-center justify-between">
                    <span>Coordonnées GPS (CGPS)</span>
                    <MapPin className="w-3 h-3 text-red-400" />
                  </span>
                  {study.gps?.latitude && study.gps?.longitude ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${study.gps.latitude},${study.gps.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 text-xs pt-0.5"
                    >
                      <span>{study.gps.latitude}, {study.gps.longitude}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="font-mono text-slate-300 text-xs">{study.gps?.cgps || 'Non renseigné'}</p>
                  )}
                  <p className="text-[10px] text-slate-500">Localisation terrain de référence</p>
                </div>

                {/* Contact Client */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block flex items-center justify-between">
                    <span>Contact Client</span>
                    <User className="w-3 h-3 text-slate-400" />
                  </span>
                  <p className="font-bold text-white truncate">{study.contactClient?.nom || 'Client Ooredoo'}</p>
                  {study.contactClient?.tel && (
                    <a 
                      href={`tel:${study.contactClient.tel}`}
                      className="text-red-400 hover:text-red-300 font-mono text-xs flex items-center gap-1 font-bold"
                    >
                      <Phone className="w-3 h-3" /> {study.contactClient.tel}
                    </a>
                  )}
                </div>

                {/* Action */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Action Demandée</span>
                  <p className="font-bold text-white text-xs">{study.action || 'Étude de visibilité FH'}</p>
                  <p className="text-[10px] text-slate-400">Date: {study.dateAffectation || study.dateCreation}</p>
                </div>

                {/* Contact SMTT */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Contact SMTT</span>
                  <p className="font-bold text-white">{study.contactSMTT || "Molka Miladi - 20736600"}</p>
                  <a 
                    href="tel:20736600"
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 font-mono"
                  >
                    <Phone className="w-2.5 h-2.5 text-emerald-400" /> Appel direct SMTT
                  </a>
                </div>

                {/* Type de mission */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Type de mission</span>
                  <p className="font-bold text-white text-xs leading-tight">
                    {study.typeMission || "Accès FH -> Survey -> Étude LOS + APS"}
                  </p>
                </div>

                {/* Chefs d'équipe Assignés */}
                <div className="lg:col-span-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-slate-400" /> Chefs d'équipe affectés
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {study.chefsEquipe && study.chefsEquipe.length > 0 ? (
                      study.chefsEquipe.map(chef => (
                        <span key={chef} className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg text-xs font-bold">
                          👷 {chef}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-xs">Non assigné</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. REMPLISSAGE DYNAMIQUE DES SITES DISTANTS (TABLEAU EXCEL / BLOCS / ONGLETS) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
              
              {/* Section Header with View Mode Switcher and Add Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <span>2. Informations Sites Distants (Saisie Chef d'équipe)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Grille dynamique conforme au modèle Excel : statut LOS, 4 coordonnées GPS (DMS/DEC auto-calculés), azimuts réciproques, radio FH et commentaire obligatoire si LOS = NON.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* View mode toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-inner">
                    <button
                      type="button"
                      onClick={() => setViewModeRemoteSites('grid')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        viewModeRemoteSites === 'grid' 
                          ? 'bg-red-600 text-white shadow-sm font-black' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      Tableau Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewModeRemoteSites('tabs')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        viewModeRemoteSites === 'tabs' 
                          ? 'bg-red-600 text-white shadow-sm font-black' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      Vue par Onglet
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewModeRemoteSites('all')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        viewModeRemoteSites === 'all' 
                          ? 'bg-red-600 text-white shadow-sm font-black' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Tous les Blocs
                    </button>
                  </div>

                  {/* Add Remote Site Button */}
                  <button 
                    type="button"
                    onClick={addRemoteSite}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-red-400" />
                    + Ajouter une ligne Site Distant
                  </button>
                </div>
              </div>

              {/* Validation Warning Alert if comment missing on non-LOS site */}
              {validationWarning && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 flex items-start gap-3 text-red-800 text-xs font-bold animate-shake">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{validationWarning}</p>
                  </div>
                  <button 
                    onClick={() => setValidationWarning('')}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Status Summary Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-700">
                    Total : <strong className="text-slate-900 font-mono font-black">{report.donneesLOS.sitesDistants.length}</strong> site(s)
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    LOS OK (OUI) : {report.donneesLOS.sitesDistants.filter(s => s.statusLOS === 'Oui').length}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    LOS NON OK : {report.donneesLOS.sitesDistants.filter(s => s.statusLOS === 'Non').length}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  💡 Saisissez la latitude/longitude en DMS ou DEC : la conversion et l'azimut réciproque sont calculés en temps réel !
                </div>
              </div>

              {/* 1. TABLEAU EXCEL ÉDITABLE INTERACTIF (MODE TABLEAU / GRILLE) */}
              {viewModeRemoteSites === 'grid' && (
                <div className="space-y-4">
                  <div className="overflow-x-auto border-2 border-slate-200 rounded-xl shadow-sm bg-white">
                    <table className="w-full text-left text-xs border-collapse min-w-[1700px]">
                      <thead>
                        {/* Master Header */}
                        <tr className="bg-red-600 text-white text-center text-xs font-black uppercase tracking-wider divide-x divide-red-700">
                          <th className="p-2.5 sticky left-0 z-20 bg-red-600 min-w-[140px]">Code Site Distant</th>
                          <th className="p-2.5 min-w-[100px]">LOS</th>
                          <th colSpan={4} className="p-2.5 bg-red-700">Coordonnées GPS Site Distant (DMS / DEC Auto)</th>
                          <th className="p-2.5 min-w-[85px]">Élév. (m)</th>
                          <th colSpan={2} className="p-2.5 bg-red-700">Hauteur Antenne (m)</th>
                          <th colSpan={2} className="p-2.5 bg-red-700">Azimut (°)</th>
                          <th className="p-2.5 min-w-[95px]">Bond (km)</th>
                          <th colSpan={2} className="p-2.5 bg-red-700">Diamètre Antenne (cm)</th>
                          <th className="p-2.5 min-w-[90px]">Fréq (GHz)</th>
                          <th className="p-2.5 min-w-[95px]">Câble IF</th>
                          <th className="p-2.5 min-w-[110px]">Support MW</th>
                          <th className="p-2.5 min-w-[110px]">Départ NRJ</th>
                          <th className="p-2.5 min-w-[240px]">Commentaire / Motif terrain</th>
                          <th className="p-2.5 min-w-[90px]">Actions</th>
                        </tr>
                        {/* Sub-headers matching Excel structure */}
                        <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider text-center divide-x divide-slate-200 border-b-2 border-slate-300">
                          <th className="p-2 sticky left-0 z-20 bg-slate-100">Généré / Éditable</th>
                          <th className="p-2">OUI / NON</th>
                          <th className="p-2 min-w-[130px]">Latitude DMS</th>
                          <th className="p-2 min-w-[130px]">Longitude DMS</th>
                          <th className="p-2 min-w-[110px] bg-slate-50">Latitude DEC</th>
                          <th className="p-2 min-w-[110px] bg-slate-50">Longitude DEC</th>
                          <th className="p-2">Altitude</th>
                          <th className="p-2 min-w-[100px]">Locale</th>
                          <th className="p-2 min-w-[100px]">Distante</th>
                          <th className="p-2 min-w-[105px]">Local &rarr; Dist</th>
                          <th className="p-2 min-w-[105px]">Dist &rarr; Local</th>
                          <th className="p-2">Longueur</th>
                          <th className="p-2 min-w-[95px]">Locale</th>
                          <th className="p-2 min-w-[95px]">Distante</th>
                          <th className="p-2">Bande</th>
                          <th className="p-2">IF / POE (m)</th>
                          <th className="p-2">Supportage</th>
                          <th className="p-2">Alimentation</th>
                          <th className="p-2 text-left px-3">
                            <span>Observations</span>
                            <span className="text-red-500 ml-1 font-bold">(*si NON)</span>
                          </th>
                          <th className="p-2">GPS / Suppr.</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200 font-sans">
                        {report.donneesLOS.sitesDistants.map((rs, idx) => {
                          const isNonLOS = rs.statusLOS === 'Non';
                          const isMissingComment = isNonLOS && (!rs.commentaire || !rs.commentaire.trim());

                          return (
                            <tr 
                              key={rs.id} 
                              className={`transition-colors divide-x divide-slate-100 ${
                                isNonLOS 
                                  ? 'bg-red-50/40 hover:bg-red-50/70' 
                                  : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-100/70'
                              }`}
                            >
                              {/* 1. Code Site Distant (Sticky) */}
                              <td className={`p-1.5 sticky left-0 z-10 font-mono ${
                                isNonLOS ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              }`}>
                                <div className="flex items-center gap-1">
                                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                    {idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-black text-slate-900 uppercase text-xs focus:ring-1 focus:ring-red-500 focus:bg-white bg-transparent outline-none"
                                    placeholder={`SD-${idx + 1}`}
                                    value={rs.codeSiteDistant}
                                    onChange={(e) => updateRemoteSite(rs.id, 'codeSiteDistant', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* 2. LOS (OUI / NON Dropdown) */}
                              <td className="p-1.5 text-center">
                                <select
                                  value={rs.statusLOS}
                                  onChange={(e) => updateRemoteSite(rs.id, 'statusLOS', e.target.value as 'Oui' | 'Non')}
                                  className={`w-full px-2 py-1.5 rounded font-black text-xs cursor-pointer border outline-none transition-all ${
                                    rs.statusLOS === 'Oui'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold focus:ring-2 focus:ring-emerald-500'
                                      : 'bg-red-600 text-white border-red-700 font-black focus:ring-2 focus:ring-red-500 shadow-sm'
                                  }`}
                                >
                                  <option value="Oui">OUI</option>
                                  <option value="Non">NON</option>
                                </select>
                              </td>

                              {/* 3. Latitude DMS */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder={`36°49'48.80"N`}
                                  title="Format DMS (ex: 36°49'48.80''N) - Conversion automatique en DEC"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-[11px] text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.gpsDMS.lat}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.lat', e.target.value)}
                                />
                              </td>

                              {/* 4. Longitude DMS */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder={`10°12'12.86"E`}
                                  title="Format DMS (ex: 10°12'12.86''E) - Conversion automatique en DEC"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-[11px] text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.gpsDMS.long}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.long', e.target.value)}
                                />
                              </td>

                              {/* 5. Latitude DEC (Auto calculé) */}
                              <td className="p-1.5 bg-slate-50/50">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="36.830250"
                                    title="Calcul automatique ou saisie décimale"
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-900 bg-slate-100/70 focus:bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                    value={rs.gpsDEC.lat}
                                    onChange={(e) => updateRemoteSite(rs.id, 'gpsDEC.lat', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* 6. Longitude DEC (Auto calculé) */}
                              <td className="p-1.5 bg-slate-50/50">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="10.203583"
                                    title="Calcul automatique ou saisie décimale"
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-900 bg-slate-100/70 focus:bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                    value={rs.gpsDEC.long}
                                    onChange={(e) => updateRemoteSite(rs.id, 'gpsDEC.long', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* 7. Élévation (m) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="Ex: 9"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.gpsDMS.elev || ''}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.elev', e.target.value)}
                                />
                              </td>

                              {/* 8. Hauteur antenne locale (m) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="H+2.5"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.hauteurAntenneLocale}
                                  onChange={(e) => updateRemoteSite(rs.id, 'hauteurAntenneLocale', e.target.value)}
                                />
                              </td>

                              {/* 9. Hauteur antenne distante (m) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="H+5"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.hauteurAntenneDistante}
                                  onChange={(e) => updateRemoteSite(rs.id, 'hauteurAntenneDistante', e.target.value)}
                                />
                              </td>

                              {/* 10. Azimut Local-Distant */}
                              <td className="p-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="211"
                                    className="w-full px-1.5 py-1.5 border border-slate-300 rounded font-mono text-center text-xs font-bold text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                    value={rs.azimutLocalDistant}
                                    onChange={(e) => updateRemoteSite(rs.id, 'azimutLocalDistant', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* 11. Azimut Distant-Local */}
                              <td className="p-1.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder="31"
                                    className="w-full px-1.5 py-1.5 border border-slate-300 rounded font-mono text-center text-xs font-bold text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                    value={rs.azimutDistantLocal}
                                    onChange={(e) => updateRemoteSite(rs.id, 'azimutDistantLocal', e.target.value)}
                                  />
                                  {rs.azimutLocalDistant && (
                                    <button
                                      type="button"
                                      onClick={() => updateRemoteSite(rs.id, 'azimutDistantLocal', computeReciprocalAzimuth(rs.azimutLocalDistant))}
                                      title="Calculer l'azimut inverse (Az+180)%"
                                      className="p-1 text-[10px] text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* 12. Longueur bond (km) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="0.43"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.longueurBond}
                                  onChange={(e) => updateRemoteSite(rs.id, 'longueurBond', e.target.value)}
                                />
                              </td>

                              {/* 13. Diamètre Antenne Locale (cm) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="30"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.diametreAntenne}
                                  onChange={(e) => updateRemoteSite(rs.id, 'diametreAntenne', e.target.value)}
                                />
                              </td>

                              {/* 14. Diamètre Antenne Distante (cm) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="30"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.diametreAntenneDistante}
                                  onChange={(e) => updateRemoteSite(rs.id, 'diametreAntenneDistante', e.target.value)}
                                />
                              </td>

                              {/* 15. Fréquence (GHz) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="38"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.frequence}
                                  onChange={(e) => updateRemoteSite(rs.id, 'frequence', e.target.value)}
                                />
                              </td>

                              {/* 16. Câble IF (m) */}
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  placeholder="30"
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none"
                                  value={rs.longueurCableIF || rs.longueurCablePOE || ''}
                                  onChange={(e) => {
                                    updateRemoteSite(rs.id, 'longueurCableIF', e.target.value);
                                    updateRemoteSite(rs.id, 'longueurCablePOE', e.target.value);
                                  }}
                                />
                              </td>

                              {/* 17. Support MW */}
                              <td className="p-1.5">
                                <select
                                  value={rs.ajoutSupportMW || 'Non'}
                                  onChange={(e) => updateRemoteSite(rs.id, 'ajoutSupportMW', e.target.value)}
                                  className="w-full px-1.5 py-1.5 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none font-bold"
                                >
                                  <option value="Non">Non</option>
                                  <option value="Oui">Oui</option>
                                  <option value="Oui - Mât 2m">Oui - Mât 2m</option>
                                  <option value="Oui - Mât 3m">Oui - Mât 3m</option>
                                  <option value="Oui - Bras déport">Oui - Bras déport</option>
                                </select>
                              </td>

                              {/* 18. Départ NRJ */}
                              <td className="p-1.5">
                                <select
                                  value={rs.ajoutDepartEnergie || 'Non'}
                                  onChange={(e) => updateRemoteSite(rs.id, 'ajoutDepartEnergie', e.target.value)}
                                  className="w-full px-1.5 py-1.5 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-red-500 outline-none font-bold"
                                >
                                  <option value="Non">Non</option>
                                  <option value="Oui">Oui</option>
                                  <option value="Oui - Disj. 10A">Oui - Disj. 10A</option>
                                  <option value="Oui - Disj. 16A">Oui - Disj. 16A</option>
                                  <option value="Oui - Disj. 20A">Oui - Disj. 20A</option>
                                </select>
                              </td>

                              {/* 19. Commentaire (Obligatoire si NON) */}
                              <td className="p-1.5">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder={isNonLOS ? "⚠️ Motif obligatoire (ex: Site inaccessible, obstacle...)" : "Observation terrain..."}
                                    className={`w-full px-2.5 py-1.5 rounded text-xs outline-none transition-all ${
                                      isMissingComment
                                        ? 'bg-red-100 border-2 border-red-500 text-red-900 font-bold placeholder:text-red-600 focus:ring-2 focus:ring-red-600'
                                        : 'bg-white border border-slate-300 text-slate-900 focus:ring-1 focus:ring-red-500'
                                    }`}
                                    value={rs.commentaire}
                                    onChange={(e) => updateRemoteSite(rs.id, 'commentaire', e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* 20. Actions */}
                              <td className="p-1.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCaptureRemoteSiteGPS(rs.id)}
                                    title="Capturer coordonnées GPS actuelles"
                                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Compass className="w-3.5 h-3.5 text-red-600" />
                                  </button>

                                  {report.donneesLOS.sitesDistants.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeRemoteSite(rs.id)}
                                      title="Supprimer cette ligne"
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button under table */}
                  <div className="flex justify-between items-center pt-2">
                    <button 
                      type="button"
                      onClick={addRemoteSite}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 px-4 py-2 rounded-xl border border-slate-300 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-red-600" />
                      + Ajouter une ligne Site Distant
                    </button>

                    <span className="text-xs text-slate-400 font-mono">
                      Données synchronisées automatiquement dans le rapport d'export Excel.
                    </span>
                  </div>
                </div>
              )}

              {/* Dynamic Remote Site Sub-Tabs (For 'tabs' or 'all' mode) */}
              {viewModeRemoteSites !== 'grid' && (
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                  {report.donneesLOS.sitesDistants.map((rs, index) => {
                    const isSelected = activeRemoteSiteTab === rs.id;

                    return (
                      <button
                        key={rs.id}
                        type="button"
                        onClick={() => {
                          setActiveRemoteSiteTab(rs.id);
                          setViewModeRemoteSites('tabs');
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border ${
                          isSelected && viewModeRemoteSites === 'tabs'
                            ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20 scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          rs.statusLOS === 'Oui' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        <span>Site Distant {index + 1} : <strong className="font-mono">{rs.codeSiteDistant || `SD-${index + 1}`}</strong></span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected && viewModeRemoteSites === 'tabs'
                            ? 'bg-white/20 text-white'
                            : rs.statusLOS === 'Oui' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {rs.statusLOS === 'Oui' ? 'LOS OK' : 'NON OK'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2 & 3. FORMULAIRE DÉTAILLÉ DU / DES SITES DISTANTS (MODE ONGLETS OU BLOCS) */}
              {viewModeRemoteSites !== 'grid' && (
                <div className="space-y-8">
                  {report.donneesLOS.sitesDistants
                    .filter(rs => viewModeRemoteSites === 'all' || rs.id === activeRemoteSiteTab)
                    .map((rs) => {
                      const actualIdx = report.donneesLOS.sitesDistants.findIndex(item => item.id === rs.id);
                      const isNonLOS = rs.statusLOS === 'Non';
                      const isMissingComment = isNonLOS && (!rs.commentaire || !rs.commentaire.trim());

                      return (
                        <div 
                          key={rs.id} 
                          className={`rounded-2xl p-6 border-2 space-y-6 shadow-sm relative transition-all ${
                            isNonLOS ? 'bg-red-50/30 border-red-200' : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          {/* Site Header: Name, LOS Toggle & Delete */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                  {actualIdx + 1}
                                </span>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                  Code Site Distant :
                                </span>
                              </div>
                              <input
                                type="text"
                                className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-black text-slate-900 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-red-500 outline-none w-48"
                                placeholder="Ex: TUN_2041"
                                value={rs.codeSiteDistant}
                                onChange={(e) => updateRemoteSite(rs.id, 'codeSiteDistant', e.target.value)}
                              />
                            </div>

                            {/* LOS Radio / Pill Selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase text-slate-600 mr-1">Visibilité LOS :</span>
                              <button
                                type="button"
                                onClick={() => updateRemoteSite(rs.id, 'statusLOS', 'Oui')}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  rs.statusLOS === 'Oui'
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                LOS OK (OUI)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateRemoteSite(rs.id, 'statusLOS', 'Non')}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  rs.statusLOS === 'Non'
                                    ? 'bg-red-600 text-white shadow-md shadow-red-600/25 scale-105'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                LOS NON OK (NON)
                              </button>

                              {report.donneesLOS.sitesDistants.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRemoteSite(rs.id)}
                                  className="ml-3 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer ce site distant"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Coordonnées Site Distant (Format obligatoire en 4 sous-champs) */}
                          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-red-600" />
                                Coordonnées Site Distant (4 sous-champs DMS / DEC avec calcul auto)
                              </h4>
                              
                              <div className="flex items-center gap-2">
                                {/* Geolocation Button */}
                                <button
                                  type="button"
                                  onClick={() => handleCaptureRemoteSiteGPS(rs.id)}
                                  className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-all cursor-pointer"
                                >
                                  <Compass className="w-3.5 h-3.5 text-red-600" />
                                  📍 Capturer GPS Site Distant
                                </button>

                                {/* Google Maps link if DEC is filled */}
                                {rs.gpsDEC.lat && rs.gpsDEC.long && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${rs.gpsDEC.lat},${rs.gpsDEC.long}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Google Maps
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Latitude DMS */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Latitude DMS <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={`Ex: 36°49'48.80"N`}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.gpsDMS.lat}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.lat', e.target.value)}
                                />
                                <span className="text-[10px] text-slate-400">Calcul auto vers DEC</span>
                              </div>

                              {/* Longitude DMS */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Longitude DMS <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={`Ex: 10°12'12.86"E`}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.gpsDMS.long}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.long', e.target.value)}
                                />
                                <span className="text-[10px] text-slate-400">Calcul auto vers DEC</span>
                              </div>

                              {/* Latitude DEC */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Latitude DEC <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 36.830250"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-100/70 focus:bg-white"
                                  value={rs.gpsDEC.lat}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDEC.lat', e.target.value)}
                                />
                                <span className="text-[10px] text-slate-400">Synchronisé avec DMS</span>
                              </div>

                              {/* Longitude DEC */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Longitude DEC <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 10.203583"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-100/70 focus:bg-white"
                                  value={rs.gpsDEC.long}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDEC.long', e.target.value)}
                                />
                                <span className="text-[10px] text-slate-400">Synchronisé avec DMS</span>
                              </div>
                            </div>
                          </div>

                          {/* Caractéristiques Techniques (Grille structurée et lisible) */}
                          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                              <Activity className="w-4 h-4 text-red-600" />
                              Caractéristiques Techniques & Radio FH
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Élévation (m) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Élévation / Altitude (m)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 9"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.gpsDMS.elev || ''}
                                  onChange={(e) => updateRemoteSite(rs.id, 'gpsDMS.elev', e.target.value)}
                                />
                              </div>

                              {/* Hauteur antenne locale (m) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Hauteur antenne locale (m)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: H+2,5"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.hauteurAntenneLocale}
                                  onChange={(e) => updateRemoteSite(rs.id, 'hauteurAntenneLocale', e.target.value)}
                                />
                              </div>

                              {/* Hauteur antenne distante (m) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Hauteur antenne distante (m)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: H+5"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.hauteurAntenneDistante}
                                  onChange={(e) => updateRemoteSite(rs.id, 'hauteurAntenneDistante', e.target.value)}
                                />
                              </div>

                              {/* Azimut (°) Local-distant */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Azimut (°) Local &rarr; Distant
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Ex: 211"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.azimutLocalDistant}
                                  onChange={(e) => updateRemoteSite(rs.id, 'azimutLocalDistant', e.target.value)}
                                />
                              </div>

                              {/* Azimut (°) Distant-Local */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                    Azimut (°) Distant &rarr; Local
                                  </label>
                                  {rs.azimutLocalDistant && (
                                    <button
                                      type="button"
                                      onClick={() => updateRemoteSite(rs.id, 'azimutDistantLocal', computeReciprocalAzimuth(rs.azimutLocalDistant))}
                                      className="text-[10px] text-red-600 font-bold hover:underline flex items-center gap-0.5"
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" /> (Az+180)°
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Ex: 31"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.azimutDistantLocal}
                                  onChange={(e) => updateRemoteSite(rs.id, 'azimutDistantLocal', e.target.value)}
                                />
                              </div>

                              {/* Longueur bond (km) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Longueur bond (km)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 0,43"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.longueurBond}
                                  onChange={(e) => updateRemoteSite(rs.id, 'longueurBond', e.target.value)}
                                />
                              </div>

                              {/* Diamètre antenne locale (cm) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Diamètre antenne locale (cm)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 30"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.diametreAntenne}
                                  onChange={(e) => updateRemoteSite(rs.id, 'diametreAntenne', e.target.value)}
                                />
                              </div>

                              {/* Diamètre antenne distante (cm) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Diamètre antenne distante (cm)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 30"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.diametreAntenneDistante}
                                  onChange={(e) => updateRemoteSite(rs.id, 'diametreAntenneDistante', e.target.value)}
                                />
                              </div>

                              {/* Fréquence (GHz) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Fréquence (GHz)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 38"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.frequence}
                                  onChange={(e) => updateRemoteSite(rs.id, 'frequence', e.target.value)}
                                />
                              </div>

                              {/* Longueur de Câble IF */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Longueur de Câble IF (m)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ex: 30"
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                  value={rs.longueurCableIF || rs.longueurCablePOE || ''}
                                  onChange={(e) => {
                                    updateRemoteSite(rs.id, 'longueurCableIF', e.target.value);
                                    updateRemoteSite(rs.id, 'longueurCablePOE', e.target.value);
                                  }}
                                />
                              </div>

                              {/* Ajout Support MW */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Ajout Support MW
                                </label>
                                <select
                                  value={rs.ajoutSupportMW || 'Non'}
                                  onChange={(e) => updateRemoteSite(rs.id, 'ajoutSupportMW', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                >
                                  <option value="Non">Non</option>
                                  <option value="Oui">Oui</option>
                                  <option value="Oui - Mât 2m">Oui - Mât 2m</option>
                                  <option value="Oui - Mât 3m">Oui - Mât 3m</option>
                                  <option value="Oui - Bras déport">Oui - Bras déport</option>
                                </select>
                              </div>

                              {/* Ajout départ énergie */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Ajout départ énergie
                                </label>
                                <select
                                  value={rs.ajoutDepartEnergie || 'Non'}
                                  onChange={(e) => updateRemoteSite(rs.id, 'ajoutDepartEnergie', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50 focus:bg-white"
                                >
                                  <option value="Non">Non</option>
                                  <option value="Oui">Oui</option>
                                  <option value="Oui - Disj. 10A">Oui - Disj. 10A</option>
                                  <option value="Oui - Disj. 16A">Oui - Disj. 16A</option>
                                  <option value="Oui - Disj. 20A">Oui - Disj. 20A</option>
                                </select>
                              </div>
                            </div>

                            {/* Commentaire multi-lignes */}
                            <div className="space-y-1 pt-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Commentaire & Observations Terrain
                                </label>
                                {isNonLOS && (
                                  <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Motif obligatoire car LOS = NON
                                  </span>
                                )}
                              </div>
                              <textarea
                                rows={3}
                                placeholder={isNonLOS ? "Précisez obligatoirement le motif (ex: Site inaccessible, obstacle relief/végétation, propriétaire absent...)" : "Indiquez les détails de visibilité, obstacles éventuels, type de support existant ou contraintes d'accès..."}
                                className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold outline-none transition-all ${
                                  isMissingComment
                                    ? 'bg-red-50 border-red-500 text-red-900 font-bold placeholder:text-red-500 focus:ring-2 focus:ring-red-600'
                                    : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-red-500 bg-slate-50 focus:bg-white placeholder:text-slate-400'
                                }`}
                                value={rs.commentaire}
                                onChange={(e) => updateRemoteSite(rs.id, 'commentaire', e.target.value)}
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>
              )}

            </div>

            {/* 3. SECTION DYNAMIQUE "RÉSUMÉ POUR TABLEAU TRANS" */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200 pb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-red-600" />
                    3. RÉSUMÉ POUR TABLEAU TRANS
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">
                      {report.donneesLOS.sitesDistants.length} liaison{report.donneesLOS.sitesDistants.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Chaînes de transmission pour le site local et chaque liaison distante. Saisie manuelle ou génération automatique selon les paramètres techniques.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoGenerateAllResumeTrans}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-red-200 active:scale-95 shadow-sm"
                    title="Générer automatiquement toutes les chaînes à partir des azimuts, hauteurs et diamètres saisis"
                  >
                    <Zap className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                    Tout auto-générer
                  </button>
                </div>
              </div>

              {report.donneesLOS.sitesDistants.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-500 font-medium">Aucun site distant n'a encore été ajouté.</p>
                  <button
                    type="button"
                    onClick={addRemoteSite}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un premier site distant
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.donneesLOS.sitesDistants.map((rs, index) => {
                    const localCode = report.donneesLOS.header.codeSite || study.site || 'SITE_LOCAL';
                    const currentLocalChain = rs.chaineSiteLocal ?? (rs.statusLOS === 'Oui' ? 'LOS OK' : 'LOS Non OK');
                    const currentDistantChain = rs.chaineSiteDistant ?? '';
                    const generatedPreview = generateResumeDistant(rs);

                    return (
                      <div 
                        key={rs.id} 
                        className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 hover:border-red-300 transition-all shadow-sm"
                      >
                        {/* En-tête de la liaison distante */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="text-xs font-black text-slate-900 uppercase">
                              Liaison : {localCode} &rarr; <span className="text-red-700">{rs.codeSiteDistant || `Site Distant ${index + 1}`}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              rs.statusLOS === 'Oui' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              LOS : {rs.statusLOS === 'Oui' ? 'OUI' : 'NON'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleGenerateSiteResumeTrans(rs.id)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 self-start sm:self-auto"
                            title="Générer les chaînes pour ce site à partir des paramètres techniques"
                          >
                            <Zap className="w-3 h-3 text-red-600" />
                            Générer pour ce site
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                          {/* 1. Chaîne pour le site local */}
                          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                Chaîne pour le site <span className="text-red-600">{localCode}</span>
                              </label>
                              <span className="text-[10px] text-slate-400 font-semibold">Site Local</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 transition-all">
                                <input 
                                  type="radio" 
                                  name={`local_status_${rs.id}`} 
                                  className="accent-red-600 w-3.5 h-3.5 cursor-pointer"
                                  checked={currentLocalChain === 'LOS OK'} 
                                  onChange={() => updateRemoteSite(rs.id, 'chaineSiteLocal', 'LOS OK')}
                                />
                                <span>LOS OK</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 transition-all">
                                <input 
                                  type="radio" 
                                  name={`local_status_${rs.id}`} 
                                  className="accent-red-600 w-3.5 h-3.5 cursor-pointer"
                                  checked={currentLocalChain === 'LOS Non OK'} 
                                  onChange={() => updateRemoteSite(rs.id, 'chaineSiteLocal', 'LOS Non OK')}
                                />
                                <span>LOS Non OK</span>
                              </label>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">
                                Valeur finale / personnalisée :
                              </label>
                              <input 
                                type="text"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={currentLocalChain}
                                placeholder="ex: LOS OK"
                                onChange={(e) => updateRemoteSite(rs.id, 'chaineSiteLocal', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* 2. Chaîne pour le site distant */}
                          <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                Chaîne pour le site distant <span className="text-red-600">{rs.codeSiteDistant || `Site Distant ${index + 1}`}</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => updateRemoteSite(rs.id, 'chaineSiteDistant', generatedPreview)}
                                className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1 transition-all cursor-pointer"
                                title="Remplacer par la chaîne calculée"
                              >
                                <Zap className="w-3 h-3" />
                                Insérer chaîne calculée
                              </button>
                            </div>

                            <textarea 
                              rows={2}
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-xs"
                              placeholder="ex: H1=25m / D1=60cm / Az=145° / Dist=4.8km / TUN_2041 / H2=30m / D2=60cm / Freq=18GHz"
                              value={currentDistantChain}
                              onChange={(e) => updateRemoteSite(rs.id, 'chaineSiteDistant', e.target.value)}
                            />

                            {/* Suggestion / Aperçu calculé en direct */}
                            <div className="bg-slate-100/70 p-2 rounded-lg border border-slate-200 flex items-start gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-500 shrink-0 mt-0.5">Calculé :</span>
                              <span className="text-[11px] font-mono text-slate-700 select-all break-all leading-tight">
                                {generatedPreview}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. VALIDATION & TRANSMISSION BAR */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tous les champs sont synchronisés en temps réel. Cliquez sur <strong>Valider l'étude LOS</strong> pour soumettre le rapport final.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Enregistrer Brouillon
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  Enregistrer / Valider l'étude LOS
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab !== 'los' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden min-h-[600px]">
            {activeTab === 'profils' && (
            <div className="p-6 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header de l'onglet Profils LOS */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-[#E2001A]">
                <div className="flex items-center gap-4">
                  <img 
                    src={OOREDOO_BUSINESS_LOGO} 
                    alt="Ooredoo Business" 
                    style={{ height: '38px', width: 'auto' }}
                    className="object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-[#E2001A] text-white px-2 py-0.5 uppercase tracking-wider">
                        Modèle Officiel Ooredoo
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Page 2 : PROFILS LOS</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                      Profils Vis-à-vis & Architecture Capillaire
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfPreviewTab('profils');
                      setShowPdfPreview(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-300"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> Aperçu Page 2 (PROFILS)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (report.visAVis || []).length + 1;
                      const newVav: VisAVisInfo = {
                        id: `vav_manual_${Date.now()}`,
                        codeSite: `Site Distant ${nextIdx}`,
                        statusLOS: 'LOS OK',
                        imageProfilUrl: '',
                        commentaireProfil: '',
                        imageGoogleMapsUrl: '',
                        typeDeuxiemeImage: 'google',
                        titreDeuxiemeImage: 'Localisation sur google',
                        planCapilaire: [
                          { codeSite: `Site Distant ${nextIdx}`, direction: '', tailleAntenne: '' }
                        ]
                      };
                      setReport({
                        ...report,
                        visAVis: [...(report.visAVis || []), newVav]
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-red-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un profil
                  </button>
                </div>
              </div>

              {/* Blocs dynamiques de Profils LOS par site distant (Empilement vertical) */}
              <div className="space-y-8">
                {(!report.visAVis || report.visAVis.length === 0) ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold">
                    Aucun profil vis-à-vis configuré. Cliquez sur "+ Ajouter un profil" pour commencer.
                  </div>
                ) : (
                  report.visAVis.map((vav, idx) => (
                    <React.Fragment key={vav.id || idx}>
                      <ProfilBlock
                        index={idx}
                        data={vav}
                        isEditable={true}
                        canDelete={(report.visAVis || []).length > 1}
                        onUpdate={(updated) => {
                          const newVisAVis = [...(report.visAVis || [])];
                          newVisAVis[idx] = updated;
                          setReport({ ...report, visAVis: newVisAVis });
                        }}
                        onDelete={() => {
                          if (confirm(`Supprimer le profil ${vav.codeSite || idx + 1} ?`)) {
                            const newVisAVis = report.visAVis.filter((_, i) => i !== idx);
                            setReport({ ...report, visAVis: newVisAVis });
                          }
                        }}
                      />
                      {idx < report.visAVis.length - 1 && (
                        <div className="my-6 border-b-2 border-dashed border-slate-300"></div>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-red-500 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                  <Camera className="text-red-500 w-6 h-6" /> PHOTOS LOS (GALERIE TECHNIQUE)
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grille de 4 par ligne</span>
              </div>

              {/* Helper for Photo Upload Block */}
              {Object.entries(report.photosStructured || {}).map(([key, photos], sectionIdx) => (
                <div key={key} className="space-y-6">
                  <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px]">{sectionIdx + 1}</span>
                    {key === 'zoomVisAVis' ? 'Photos Zoom Vis-à-vis' : key === 'vuesGenerales' ? 'Vues Générales & Équipements' : 'Photos Structures'}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {(photos as any[]).map((photo, photoIdx) => (
                      <div key={photoIdx} className="space-y-3">
                        <PhotoFrame 
                          title={photo.caption || 'Photo'}
                          url={photo.url || ''}
                          onUpload={(base64) => {
                            const newPhotosStructured = { ...report.photosStructured };
                            (newPhotosStructured as any)[key][photoIdx].url = base64;
                            setReport({...report, photosStructured: newPhotosStructured});
                          }}
                          onDelete={() => {
                            const newPhotosStructured = { ...report.photosStructured };
                            (newPhotosStructured as any)[key][photoIdx].url = '';
                            setReport({...report, photosStructured: newPhotosStructured});
                          }}
                        />
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Annotation</label>
                          <input 
                            type="text" 
                            className="w-full p-1.5 text-[10px] border border-slate-200 rounded bg-white font-medium focus:ring-1 focus:ring-red-500 outline-none"
                            value={photo.caption}
                            onChange={(e) => {
                              const newPhotosStructured = { ...report.photosStructured };
                              (newPhotosStructured as any)[key][photoIdx].caption = e.target.value;
                              setReport({...report, photosStructured: newPhotosStructured});
                            }}
                            placeholder="Annotation..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'panoramique' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#FF0000] p-4 flex items-center justify-between shadow-md mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                  <Maximize className="text-white w-6 h-6" /> PHOTOS PANORAMIQUES (360°) - INCRÉMENTATION DE 30°
                </h3>
              </div>

              <div className="space-y-12 pb-12">
                {Array.from({ length: 12 }).map((_, idx) => {
                  const azimuth = idx * 30;
                  const label = `PHOTO PANORAMIQUE AZ. ${azimuth}°`;
                  const pano = (report.panoramiques && report.panoramiques[idx]) || { url: '', caption: label };
                  
                  return (
                    <div key={idx} className="w-full max-w-4xl mx-auto px-4">
                      <PhotoFrame 
                        title={label}
                        url={pano.url || ''}
                        aspectRatio="aspect-[21/9]"
                        onUpload={(base64) => {
                          const newPanos = [...(report.panoramiques || [])];
                          // Ensure array has 12 slots
                          while (newPanos.length < 12) {
                            newPanos.push({ url: '', caption: `PHOTO PANORAMIQUE AZ. ${newPanos.length * 30}°` });
                          }
                          newPanos[idx] = { ...newPanos[idx], url: base64, caption: label };
                          setReport({...report, panoramiques: newPanos});
                        }}
                        onDelete={() => {
                          const newPanos = [...(report.panoramiques || [])];
                          while (newPanos.length < 12) {
                            newPanos.push({ url: '', caption: `PHOTO PANORAMIQUE AZ. ${newPanos.length * 30}°` });
                          }
                          newPanos[idx] = { ...newPanos[idx], url: '', caption: label };
                          setReport({...report, panoramiques: newPanos});
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'gc' && (
            <div className="p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-red-500 pb-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                  <Hammer className="text-red-500 w-6 h-6" /> DONNÉES TRAVAUX GC
                </h3>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Photo site client & Descriptif</span>
              </div>

              {/* Rangée 1 */}
              <div className="space-y-4">
                <div className="bg-slate-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600">Rangée 1: Photo site client</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {report.travauxGC.photos.slice(0, 4).map((photo, idx) => (
                    <PhotoFrame 
                      key={idx}
                      title={photo.caption}
                      url={photo.url || ''}
                      onUpload={(base64) => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx].url = base64;
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                      onDelete={() => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx].url = '';
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Rangée 2 */}
              <div className="space-y-4">
                <div className="bg-slate-100 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600">Rangée 2: Acheminement câble POE</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {report.travauxGC.photos.slice(4, 8).map((photo, idx) => (
                    <PhotoFrame 
                      key={idx + 4}
                      title={photo.caption}
                      url={photo.url || ''}
                      onUpload={(base64) => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx + 4].url = base64;
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                      onDelete={() => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx + 4].url = '';
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Annotation (ex: échelle de 6m)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-[#111827] font-semibold bg-white"
                    value={report.travauxGC.annotationEchelle}
                    onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, annotationEchelle: e.target.value}})}
                    placeholder="Saisir une annotation pour ce bloc..."
                  />
                </div>
              </div>

              {/* Rangée 3 */}
              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <label className="block text-[10px] font-black text-yellow-700 mb-1 uppercase tracking-widest">Remarque de passage (fond jaune)</label>
                  <textarea 
                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-yellow-900 outline-none resize-none placeholder-yellow-600/50"
                    value={report.travauxGC.annotationPassageCable}
                    onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, annotationPassageCable: e.target.value}})}
                    placeholder="Passage câble à travers des gains sous terrain..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {report.travauxGC.photos.slice(8, 12).map((photo, idx) => (
                    <PhotoFrame 
                      key={idx + 8}
                      title={photo.caption}
                      url={photo.url || ''}
                      onUpload={(base64) => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx + 8].url = base64;
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                      onDelete={() => {
                        const newPhotos = [...report.travauxGC.photos];
                        newPhotos[idx + 8].url = '';
                        setReport({...report, travauxGC: {...report.travauxGC, photos: newPhotos}});
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Descriptif Technique */}
              <div className="pt-8 border-t-2 border-slate-200">
                <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg text-sm font-black uppercase tracking-widest">DESCRIPTION TECHNIQUE</div>
                <textarea 
                  className="w-full px-6 py-4 border-x-2 border-b-2 border-slate-200 rounded-b-lg text-sm min-h-[200px] outline-none focus:ring-2 focus:ring-red-500 font-medium bg-white"
                  value={report.travauxGC.descriptionTechnique}
                  onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, descriptionTechnique: e.target.value}})}
                  placeholder="Décrire le descriptif complet du chantier (type de mât, moulures, tubes PVC, supports MW, etc.)..."
                />
              </div>

              {/* Section PLANS (Saisie Admin Only) */}
              <div className="pt-8 border-t-2 border-slate-200">
                <div className="bg-[#FF0000] text-white px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest text-center mb-6">PLANS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* PLAN 1 */}
                  <div className="space-y-4">
                    <div className="bg-[#FF0000] text-white py-2 px-4 text-xs font-black uppercase tracking-wider text-center">
                      PLAN
                    </div>
                    <div className="aspect-[3/4] border-2 border-slate-200 flex flex-col items-center justify-center bg-white relative group overflow-hidden transition-all hover:bg-slate-50">
                      {report.travauxGC.plans?.plan ? (
                        <>
                          <img src={report.travauxGC.plans.plan} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          const compressed = await compressImage(reader.result as string);
                                          setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, plan: compressed}}});
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="bg-white text-slate-900 px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-600 hover:text-white transition-colors"
                                >
                                  Remplacer
                                </button>
                                <button 
                                  onClick={() => setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, plan: ''}}})}
                                  className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition-colors"
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                            {!isAdmin && (
                              <div className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-black uppercase shadow-lg">
                                Mode Consultation
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Image className="w-8 h-8 text-slate-400" />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Aucun plan disponible</span>
                            {isAdmin ? (
                              <button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = async () => {
                                        const compressed = await compressImage(reader.result as string);
                                        setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, plan: compressed}}});
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  };
                                  input.click();
                                }}
                                className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition-all"
                              >
                                Importer le Plan
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En attente de l'administrateur</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PLAN GC */}
                  <div className="space-y-4">
                    <div className="bg-[#FF0000] text-white py-2 px-4 text-xs font-black uppercase tracking-wider text-center">
                      PLAN GC
                    </div>
                    <div className="aspect-[3/4] border-2 border-slate-200 flex flex-col items-center justify-center bg-white relative group overflow-hidden transition-all hover:bg-slate-50">
                      {report.travauxGC.plans?.planGC ? (
                        <>
                          <img src={report.travauxGC.plans.planGC} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e: any) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          const compressed = await compressImage(reader.result as string);
                                          setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, planGC: compressed}}});
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="bg-white text-slate-900 px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-600 hover:text-white transition-colors"
                                >
                                  Remplacer
                                </button>
                                <button 
                                  onClick={() => setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, planGC: ''}}})}
                                  className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition-colors"
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                            {!isAdmin && (
                              <div className="bg-white text-slate-900 px-4 py-2 rounded text-xs font-black uppercase shadow-lg">
                                Mode Consultation
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <Image className="w-8 h-8 text-slate-400" />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-tight">Aucun plan GC disponible</span>
                            {isAdmin ? (
                              <button 
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = async () => {
                                        const compressed = await compressImage(reader.result as string);
                                        setReport({...report, travauxGC: {...report.travauxGC, plans: {...report.travauxGC.plans, planGC: compressed}}});
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  };
                                  input.click();
                                }}
                                className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition-all"
                              >
                                Importer le Plan GC
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En attente de l'administrateur</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Old fields maintained for compatibility if needed */}
              <div className="hidden">
                <input value={report.travauxGC.ancrage} onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, ancrage: e.target.value}})} />
                <input value={report.travauxGC.etatStructure} onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, etatStructure: e.target.value}})} />
                <textarea value={report.travauxGC.travauxMaconnerie} onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, travauxMaconnerie: e.target.value}})} />
                <input value={report.travauxGC.supportage} onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, supportage: e.target.value}})} />
                <textarea value={report.travauxGC.remarques} onChange={(e) => setReport({...report, travauxGC: {...report.travauxGC, remarques: e.target.value}})} />
              </div>
            </div>
          )}

          {activeTab === 'asbuilt' && (
            <div className="p-6 bg-slate-50 animate-in fade-in duration-300">
              <AsBuiltPhotoModule
                study={study}
                report={report}
                currentUserRole={currentUserRole}
                currentUserName={currentUserRole}
                onSaveReport={(updatedReport) => setReport(updatedReport)}
              />
            </div>
          )}
        </div>
      )}
      </div>

      {/* Hidden container used for high-res PDF generation */}
      <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={hiddenPdfRef} style={{ width: '1350px' }}>
          <DonneesLosPage report={report} studyId={study.id} />
        </div>
        <div ref={hiddenProfilsPdfRef} style={{ width: '1350px' }}>
          <ProfilsLosPage report={report} studyId={study.id} />
        </div>
      </div>

      {/* Modal Aperçu Modèle Officiel Ooredoo Business Multi-pages */}
      <AnimatePresence>
        {showPdfPreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden text-white"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-[#E2001A] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Modèle Officiel Ooredoo Business
                      </span>
                      <span className="text-xs font-mono text-slate-300 font-bold">
                        {pdfPreviewTab === 'donnees' ? 'Page 1 : Données LOS' :
                         pdfPreviewTab === 'profils' ? 'Page 2 : Profils LOS' :
                         pdfPreviewTab === 'photos' ? 'Page 3 : Photos LOS' :
                         pdfPreviewTab === 'panoramique' ? 'Page 4 : Panoramiques 360°' :
                         pdfPreviewTab === 'gc' ? 'Page 5 : Travaux GC' : 'Rapport Complet (1-5)'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      Fiche LOS Survey — {report.donneesLOS.header.codeSite || study.id} ({study.site})
                    </h3>
                  </div>
                </div>

                {/* Sélecteur d'onglets de page PDF & Pagination */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const order = ['donnees', 'profils', 'photos', 'panoramique', 'gc', 'all'] as const;
                      const idx = order.indexOf(pdfPreviewTab as any);
                      if (idx > 0) setPdfPreviewTab(order[idx - 1]);
                    }}
                    disabled={pdfPreviewTab === 'donnees'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1"
                  >
                    Précédent
                  </button>

                  <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto max-w-xl">
                    <button
                      onClick={() => setPdfPreviewTab('donnees')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'donnees' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      P1 : Données
                    </button>
                    <button
                      onClick={() => setPdfPreviewTab('profils')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'profils' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      P2 : Profils
                    </button>
                    <button
                      onClick={() => setPdfPreviewTab('photos')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'photos' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      P3 : Photos
                    </button>
                    <button
                      onClick={() => setPdfPreviewTab('panoramique')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'panoramique' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      P4 : Panoramique
                    </button>
                    <button
                      onClick={() => setPdfPreviewTab('gc')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'gc' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      P5 : GC
                    </button>
                    <button
                      onClick={() => setPdfPreviewTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                        pdfPreviewTab === 'all' ? 'bg-[#E2001A] text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rapport Complet
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const order = ['donnees', 'profils', 'photos', 'panoramique', 'gc', 'all'] as const;
                      const idx = order.indexOf(pdfPreviewTab as any);
                      if (idx < order.length - 1) setPdfPreviewTab(order[idx + 1]);
                    }}
                    disabled={pdfPreviewTab === 'all'}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1"
                  >
                    Suivant
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 active:scale-95"
                    title="Imprimer directement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimer
                  </button>
                  <button
                    disabled={isExportingPdf}
                    onClick={async () => {
                      const targetElem = 
                        pdfPreviewTab === 'donnees' ? pdfContainerRef.current :
                        pdfPreviewTab === 'profils' ? profilsContainerRef.current :
                        pdfPreviewTab === 'photos' ? photosContainerRef.current :
                        pdfPreviewTab === 'panoramique' ? panoramiqueContainerRef.current :
                        pdfPreviewTab === 'gc' ? gcContainerRef.current : pdfContainerRef.current;

                      if (targetElem) {
                        setIsExportingPdf(true);
                        try {
                          const pageName = pdfPreviewTab === 'all' ? 'Rapport_Complet_1_5' : `Page_${pdfPreviewTab}`;
                          await generatePdfFromElement(targetElem, `Fiche_LOS_Survey_${report.donneesLOS.header.codeSite || study.id}_${pageName}_Ooredoo.pdf`);
                        } catch (err: any) {
                          alert("Erreur génération PDF: " + err.message);
                        } finally {
                          setIsExportingPdf(false);
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E2001A] hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-red-600/30 disabled:opacity-50 active:scale-95"
                  >
                    {isExportingPdf ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Export...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Télécharger PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable Canvas */}
              <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-950/70 flex justify-center">
                <div className="w-full max-w-[1350px] space-y-8">
                  {pdfPreviewTab === 'donnees' && <DonneesLosPage ref={pdfContainerRef} report={report} studyId={study.id} />}
                  {pdfPreviewTab === 'profils' && <ProfilsLosPage ref={profilsContainerRef} report={report} studyId={study.id} />}
                  {pdfPreviewTab === 'photos' && <PhotosLosPage ref={photosContainerRef} report={report} studyId={study.id} />}
                  {pdfPreviewTab === 'panoramique' && <PanoramiquesLosPage ref={panoramiqueContainerRef} report={report} studyId={study.id} />}
                  {pdfPreviewTab === 'gc' && <TravauxGcPage ref={gcContainerRef} report={report} studyId={study.id} />}
                  {pdfPreviewTab === 'all' && (
                    <div ref={pdfContainerRef} className="space-y-12">
                      <DonneesLosPage report={report} studyId={study.id} />
                      <div className="page-break my-8 border-t-4 border-dashed border-slate-700"></div>
                      <ProfilsLosPage report={report} studyId={study.id} />
                      <div className="page-break my-8 border-t-4 border-dashed border-slate-700"></div>
                      <PhotosLosPage report={report} studyId={study.id} />
                      <div className="page-break my-8 border-t-4 border-dashed border-slate-700"></div>
                      <PanoramiquesLosPage report={report} studyId={study.id} />
                      <div className="page-break my-8 border-t-4 border-dashed border-slate-700"></div>
                      <TravauxGcPage report={report} studyId={study.id} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const DEFAULT_SEED_STUDIES: EtudeRFILoss[] = [
  {
    id: 'RFI-8321',
    site: 'SIL_8321 Ooredoo Business',
    contactClient: {
      nom: 'M. Slah Belhadj',
      tel: '55 123 456',
      mail: 'slah.belhadj@ooredoo.tn'
    },
    contactSMTT: 'Molka Miladi - 20736600',
    typeMission: 'Accès FH -> Survey -> Étude LOS + APS & Massif GC',
    gps: {
      latitude: '36.806482',
      longitude: '10.181532',
      cgps: '36.806482, 10.181532'
    },
    superviseurLOS: 'Karim Zouaoui',
    maintenancier: 'TechPro SMTT',
    processusAccesFH: 'Accès FH -> Survey -> Étude LOS + APS',
    codesSitesDistants: ['TUN_2041', 'TUN_1080', 'TUN_3012'],
    dateCreation: '2026-09-01',
    action: 'Survey & Étude LOS + GC Massif',
    dateAffectation: '2026-09-02',
    datePlanification: '2026-09-05',
    chefsEquipe: ['Sami K.', 'Amine M.'],
    status: 'Terminé',
    asBuiltData: {
      nomSiteClient: 'SIL_8321 Ooredoo Business',
      codeSiteClient: 'SIL_8321',
      nomSousTraitant: 'SMTT Business Solutions',
      dateRealisation: '2026-09-05',
      attestationScellementName: 'Attestation_Scellement_SIL_8321.pdf',
      attestationScellementUrl: '/sample_attestation.pdf',
      attestationDateUpload: '2026-09-05T10:30:00Z',
      statusValidationAdmin: 'Validé',
      validePar: 'Admin 1 (Molka Miladi)',
      dateValidation: '2026-09-06',
      photos: [
        { id: 'step1', stepNumber: 1, title: 'Photos général de site', description: 'Vue globale du site Ooredoo', status: 'Conforme', timestamp: '2026-09-05 09:15' },
        { id: 'step2', stepNumber: 2, title: 'Photos général de mât', description: 'Mât autoportant 18m', status: 'Conforme', timestamp: '2026-09-05 09:30' },
        { id: 'step3', stepNumber: 3, title: 'Fixation Mat', description: 'Boulonnerie galva M16', status: 'Conforme', timestamp: '2026-09-05 09:45' },
        { id: 'step4', stepNumber: 4, title: 'Acheminement de fourreau Outdoor', description: 'Fourreau PEHD armé', status: 'Conforme', timestamp: '2026-09-05 10:00' },
        { id: 'step5', stepNumber: 5, title: 'Acheminement mollure indoor', description: 'Moulure PVC rigide', status: 'Conforme', timestamp: '2026-09-05 10:15' },
        { id: 'step6', stepNumber: 6, title: 'Installation Rack B2BNA', description: 'Rack B2BNA 19 pouces', status: 'Conforme', timestamp: '2026-09-05 10:30' },
        { id: 'step7', stepNumber: 7, title: 'Installation SUPPORT site Vis-à-vis', description: 'Support antenne MW 60cm', status: 'Conforme', timestamp: '2026-09-05 10:45' }
      ]
    }
  },
  {
    id: 'RFI-10324',
    site: 'Ooredoo Lac 2 Tower',
    contactClient: {
      nom: 'Mme Aida Ben Salem',
      tel: '98 765 432',
      mail: 'aida.bensalem@ooredoo.tn'
    },
    contactSMTT: 'Molka Miladi - 20736600',
    typeMission: 'Accès FH -> Survey -> Étude LOS + Massif GC',
    gps: {
      latitude: '36.839210',
      longitude: '10.237140',
      cgps: '36.839210, 10.237140'
    },
    codesSitesDistants: ['TUN_1001', 'LAC_2004', 'CAR_3002'],
    dateCreation: '2026-09-04',
    action: 'Audit GC & Pose Mât FH',
    dateAffectation: '2026-09-04',
    datePlanification: '2026-09-10',
    chefsEquipe: ['Hassen T.', 'Mohamed A.', 'Riadh B.'],
    status: 'Planifié'
  },
  {
    id: 'RFI-10325',
    site: 'Ooredoo Sfax Centre',
    contactClient: {
      nom: 'M. Karim Mezghani',
      tel: '22 345 678',
      mail: 'k.mezghani@sfax-telecom.tn'
    },
    contactSMTT: 'Molka Miladi - 20736600',
    typeMission: 'Inspection Visibilité & Scellement Massif GC',
    gps: {
      latitude: '34.740560',
      longitude: '10.760280',
      cgps: '34.740560, 10.760280'
    },
    codesSitesDistants: ['SFX_1002', 'SFX_2003', 'SFX_4001'],
    dateCreation: '2026-09-06',
    action: 'Accès FH & Diagnostic Génie Civil',
    dateAffectation: '2026-09-06',
    datePlanification: '2026-09-12',
    chefsEquipe: ['Riadh B.', 'Karim Z.'],
    status: 'Affecté'
  }
];

export default function EtudeRFILossModule({ currentUserRole, currentUserName }: EtudeRFILossModuleProps) {
  const [studies, setStudies] = useState<EtudeRFILoss[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingReportStudyId, setEditingReportStudyId] = useState<string | null>(null);
  const [selectedMissionStudy, setSelectedMissionStudy] = useState<EtudeRFILoss | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'en-cours' | 'terminees' | 'rapports' | 'historique'>('en-cours');
  const [selectedChefFilter, setSelectedChefFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [feedbackSuccess, setFeedbackSuccess] = useState<string>('');
  
  // Dispatching GC Modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchStudyId, setDispatchStudyId] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dispatchChefs, setDispatchChefs] = useState<string[]>(['']);
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  // Form State (Admin -> Chef d'équipe Assignment)
  const [site, setSite] = useState('');
  const [cgps, setCgps] = useState('');
  const [lat, setLat] = useState('');
  const [long, setLong] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [contactMail, setContactMail] = useState('');
  const [action, setAction] = useState('Accès FH -> Survey -> Étude LOS + APS');
  const [isCustomAction, setIsCustomAction] = useState(false);
  const [customActionText, setCustomActionText] = useState('');
  const [dateAffectation, setDateAffectation] = useState(new Date().toISOString().split('T')[0]);
  const [contactSMTT, setContactSMTT] = useState('Molka Miladi - 20736600');
  const [typeMission, setTypeMission] = useState('Accès FH -> Survey -> Étude LOS + APS');
  const [superviseurLOS, setSuperviseurLOS] = useState('');
  const [maintenancier, setMaintenancier] = useState('');
  const [processusAccesFH, setProcessusAccesFH] = useState('Accès FH -> Survey -> Étude LOS + APS');

  // Codes Sites Distants - Minimum 3 champs vides au chargement
  const [codesSitesDistants, setCodesSitesDistants] = useState<string[]>(['', '', '']);

  // Sélection des Chefs d'équipe - Minimum 3 listes déroulantes
  const [chef1, setChef1] = useState('');
  const [chef2, setChef2] = useState('');
  const [chef3, setChef3] = useState('');
  const [extraChefs, setExtraChefs] = useState<string[]>([]);

  // Liste des Chefs d'équipe disponibles
  const [availableChefs, setAvailableChefs] = useState<string[]>([
    "Sami K.", 
    "Amine M.", 
    "Hassen T.", 
    "Mohamed A.", 
    "Riadh B.",
    "Karim Z."
  ]);

  // Load from localStorage on mount & listen to storage events
  useEffect(() => {
    const loadData = () => {
      try {
        const storedStudies = localStorage.getItem('smtt_rfi_studies');
        if (storedStudies) {
          const parsed = JSON.parse(storedStudies);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudies(parsed);
          } else {
            setStudies(DEFAULT_SEED_STUDIES);
            localStorage.setItem('smtt_rfi_studies', JSON.stringify(DEFAULT_SEED_STUDIES));
          }
        } else {
          setStudies(DEFAULT_SEED_STUDIES);
          localStorage.setItem('smtt_rfi_studies', JSON.stringify(DEFAULT_SEED_STUDIES));
        }

        const storedUsers = localStorage.getItem('smtt_users');
        if (storedUsers) {
          const users = JSON.parse(storedUsers);
          const chefs = users
            .filter((u: any) => u.role === "Chef d'équipe" || u.role === "Chef d'Equipe")
            .map((u: any) => u.fullName || u.username);
          if (chefs.length > 0) {
            setAvailableChefs(Array.from(new Set([...chefs, "Sami K.", "Amine M.", "Hassen T.", "Mohamed A.", "Riadh B.", "Karim Z."])));
          }
        }
      } catch (e) {
        console.error("Erreur lors du chargement des données LOS", e);
      }
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smtt_rfi_studies' && e.newValue) {
        setStudies(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveStudies = (updated: EtudeRFILoss[]) => {
    setStudies(updated);
    try {
      localStorage.setItem('smtt_rfi_studies', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error("Erreur sauvegarde smtt_rfi_studies", e);
    }
  };

  // Sync CGPS input with Latitude / Longitude
  const handleCgpsChange = (value: string) => {
    setCgps(value);
    if (value.includes(',')) {
      const parts = value.split(',');
      if (parts.length >= 2) {
        setLat(parts[0].trim());
        setLong(parts[1].trim());
      }
    }
  };

  const handleLatChange = (value: string) => {
    setLat(value);
    setCgps(value && long ? `${value}, ${long}` : value);
  };

  const handleLongChange = (value: string) => {
    setLong(value);
    setCgps(lat && value ? `${lat}, ${value}` : value);
  };

  const handleGetGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude.toFixed(6);
          const longitude = position.coords.longitude.toFixed(6);
          setLat(latitude);
          setLong(longitude);
          setCgps(`${latitude}, ${longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Impossible de récupérer la position GPS. Assurez-vous que la géolocalisation est autorisée dans votre navigateur.");
        }
      );
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  // Sites Distants Dynamic Handlers
  const handleAddCodeSite = () => {
    setCodesSitesDistants([...codesSitesDistants, '']);
  };

  const handleRemoveCodeSite = (index: number) => {
    const newCodes = [...codesSitesDistants];
    newCodes.splice(index, 1);
    // Keep at least 1 input field if deleted, but user can add back anytime
    setCodesSitesDistants(newCodes.length > 0 ? newCodes : ['']);
  };

  const handleCodeSiteChange = (index: number, value: string) => {
    const newCodes = [...codesSitesDistants];
    newCodes[index] = value;
    setCodesSitesDistants(newCodes);
  };

  // Dynamic Extra Chefs
  const handleAddExtraChef = () => {
    setExtraChefs([...extraChefs, '']);
  };

  const handleExtraChefChange = (index: number, value: string) => {
    const updated = [...extraChefs];
    updated[index] = value;
    setExtraChefs(updated);
  };

  const handleRemoveExtraChef = (index: number) => {
    const updated = [...extraChefs];
    updated.splice(index, 1);
    setExtraChefs(updated);
  };

  // Form Submission (Admin -> Chef d'équipe Workflow)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!site.trim()) {
      alert("Veuillez saisir le nom ou code du site.");
      return;
    }

    if (!contactNom.trim() || !contactTel.trim()) {
      alert("Veuillez renseigner le contact client (Nom et Téléphone requis).");
      return;
    }

    const finalAction = isCustomAction ? customActionText.trim() : action;
    if (!finalAction) {
      alert("Veuillez sélectionner ou préciser une action.");
      return;
    }

    // Collect all selected unique team leaders
    const allChefs = [chef1, chef2, chef3, ...extraChefs].filter(c => c && c.trim() !== '');
    const uniqueChefs = Array.from(new Set(allChefs));

    if (uniqueChefs.length === 0) {
      alert("Veuillez sélectionner au moins un chef d'équipe.");
      return;
    }

    const cleanedCodesSites = codesSitesDistants
      .map(c => c.trim())
      .filter(c => c !== '');

    const newStudyId = `RFI-${Math.floor(10000 + Math.random() * 90000)}`;

    const newStudy: EtudeRFILoss = {
      id: newStudyId,
      site: site.trim(),
      contactClient: {
        nom: contactNom.trim(),
        tel: contactTel.trim(),
        mail: contactMail.trim()
      },
      contactSMTT: contactSMTT.trim() || 'Molka Miladi - 20736600',
      typeMission: typeMission.trim() || 'Accès FH -> Survey -> Étude LOS + APS',
      gps: {
        latitude: lat.trim(),
        longitude: long.trim(),
        cgps: cgps.trim() || (lat && long ? `${lat}, ${long}` : '')
      },
      superviseurLOS: superviseurLOS.trim() || undefined,
      maintenancier: maintenancier.trim() || undefined,
      processusAccesFH: processusAccesFH.trim() || 'Accès FH -> Survey -> Étude LOS + APS',
      dateCreation: new Date().toISOString().split('T')[0],
      action: finalAction,
      codesSitesDistants: cleanedCodesSites,
      dateAffectation: dateAffectation || new Date().toISOString().split('T')[0],
      chefsEquipe: uniqueChefs,
      status: 'Affecté'
    };

    // 1. Enregistrement de la tâche dans la base de données (localStorage / central state)
    const updatedStudies = [newStudy, ...studies];
    saveStudies(updatedStudies);

    // 2. Génération et transmission de la notification / fiche de mission aux chefs d'équipe sélectionnés
    try {
      const storedNotifications = localStorage.getItem('smtt_notifications');
      const existingNotifs: AppNotification[] = storedNotifications ? JSON.parse(storedNotifications) : [];

      const newNotif: AppNotification = {
        id: `NOTIF-${Date.now()}`,
        type: 'info',
        message: `📋 [Mission Étude LOS] Nouvelle mission sur le site ${newStudy.site} (${newStudy.typeMission}) attribuée aux chefs : ${uniqueChefs.join(', ')}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        studyId: newStudy.id,
        senderName: currentUserName || currentUserRole || 'Admin 1'
      };

      const updatedNotifs = [newNotif, ...existingNotifs];
      localStorage.setItem('smtt_notifications', JSON.stringify(updatedNotifs));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Erreur lors de la transmission de la notification", err);
    }

    // Feedback UI
    setFeedbackSuccess(`🎉 Tâche Étude LOS "${newStudy.site}" attribuée avec succès ! Fiche de mission transmise à : ${uniqueChefs.join(', ')}.`);
    setTimeout(() => setFeedbackSuccess(''), 7000);

    // Reset & Close
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSite('');
    setCgps('');
    setLat('');
    setLong('');
    setContactNom('');
    setContactTel('');
    setContactMail('');
    setAction('Accès FH -> Survey -> Étude LOS + APS');
    setIsCustomAction(false);
    setCustomActionText('');
    setDateAffectation(new Date().toISOString().split('T')[0]);
    setContactSMTT('Molka Miladi - 20736600');
    setTypeMission('Accès FH -> Survey -> Étude LOS + APS');
    setSuperviseurLOS('');
    setMaintenancier('');
    setProcessusAccesFH('Accès FH -> Survey -> Étude LOS + APS');
    setCodesSitesDistants(['', '', '']);
    setChef1('');
    setChef2('');
    setChef3('');
    setExtraChefs([]);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette étude LOS ?')) {
      saveStudies(studies.filter(s => s.id !== id));
      if (selectedMissionStudy?.id === id) {
        setSelectedMissionStudy(null);
      }
    }
  };

  // Handlers pour le Module Dispatching & Affectation Multi-Chefs GC
  const openDispatchModalForStudy = (study: EtudeRFILoss) => {
    setDispatchStudyId(study.id);
    setDispatchDate(study.datePlanification || study.dateAffectation || new Date().toISOString().split('T')[0]);
    setDispatchChefs(study.chefsEquipe && study.chefsEquipe.length > 0 ? study.chefsEquipe : ['']);
    setDispatchNotes('');
    setShowDispatchModal(true);
  };

  const openDispatchModalNew = () => {
    const firstStudy = studies[0];
    if (firstStudy) {
      setDispatchStudyId(firstStudy.id);
      setDispatchDate(firstStudy.datePlanification || firstStudy.dateAffectation || new Date().toISOString().split('T')[0]);
      setDispatchChefs(firstStudy.chefsEquipe && firstStudy.chefsEquipe.length > 0 ? firstStudy.chefsEquipe : ['']);
    } else {
      setDispatchStudyId('');
      setDispatchDate(new Date().toISOString().split('T')[0]);
      setDispatchChefs(['']);
    }
    setDispatchNotes('');
    setShowDispatchModal(true);
  };

  const handleSelectStudyForDispatch = (studyId: string) => {
    setDispatchStudyId(studyId);
    const target = studies.find(s => s.id === studyId);
    if (target) {
      setDispatchDate(target.datePlanification || target.dateAffectation || new Date().toISOString().split('T')[0]);
      setDispatchChefs(target.chefsEquipe && target.chefsEquipe.length > 0 ? target.chefsEquipe : ['']);
    }
  };

  const handleConfirmDispatch = () => {
    const uniqueChefs = Array.from(new Set(dispatchChefs.map(c => c.trim()).filter(Boolean)));
    if (!dispatchStudyId) {
      alert("Veuillez sélectionner une étude dans la base de données.");
      return;
    }
    if (uniqueChefs.length === 0) {
      alert("Veuillez sélectionner au moins un chef d'équipe.");
      return;
    }

    const targetStudy = studies.find(s => s.id === dispatchStudyId);
    if (!targetStudy) return;

    const updatedStudies = studies.map(s => {
      if (s.id === dispatchStudyId) {
        return {
          ...s,
          chefsEquipe: uniqueChefs,
          dateAffectation: dispatchDate,
          datePlanification: dispatchDate,
          status: 'Affecté' as const
        };
      }
      return s;
    });

    saveStudies(updatedStudies);

    // Envoi de la notification / ordre de mission
    try {
      const storedNotifs = localStorage.getItem('smtt_notifications');
      const existingNotifs: AppNotification[] = storedNotifs ? JSON.parse(storedNotifs) : [];
      
      const newNotif: AppNotification = {
        id: `NOTIF-${Date.now()}`,
        type: 'info',
        message: `📋 [Ordre de Mission GC] Mission "${targetStudy.site}" (${targetStudy.id}) affectée pour le ${dispatchDate} aux chefs : ${uniqueChefs.join(', ')}. ${dispatchNotes ? 'Consignes: ' + dispatchNotes : ''}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        studyId: targetStudy.id,
        senderName: currentUserName || currentUserRole || 'Admin SMTT'
      };

      localStorage.setItem('smtt_notifications', JSON.stringify([newNotif, ...existingNotifs]));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error("Erreur envoi notification dispatching", e);
    }

    setFeedbackSuccess(`🎉 Mission "${targetStudy.site}" (${targetStudy.id}) réaffectée avec succès à ${uniqueChefs.join(', ')} pour le ${dispatchDate}. Ordre de mission transmis !`);
    setTimeout(() => setFeedbackSuccess(''), 7000);
    setShowDispatchModal(false);
  };

  const handleUpdatePlanification = (id: string, date: string) => {
    const updated = studies.map(s => {
      if (s.id === id) {
        return { ...s, datePlanification: date, status: 'Planifié' as const };
      }
      return s;
    });
    saveStudies(updated);
    if (selectedMissionStudy?.id === id) {
      setSelectedMissionStudy({ ...selectedMissionStudy, datePlanification: date, status: 'Planifié' });
    }
  };

  const handleSaveReport = (id: string, report: RfiReport) => {
    const updated = studies.map(s => {
      if (s.id === id) {
        return { ...s, report, status: 'Terminé' as const };
      }
      return s;
    });
    saveStudies(updated);
    setEditingReportStudyId(null);
    setActiveView('terminees');
  };

  const currentStudyForReport = studies.find(s => s.id === editingReportStudyId);
  const activeDispatchStudy = studies.find(s => s.id === dispatchStudyId);

  const stats = {
    total: studies.length,
    enCours: studies.filter(s => s.status !== 'Terminé').length,
    terminees: studies.filter(s => s.status === 'Terminé').length,
    rapports: studies.filter(s => s.report).length
  };

  const filteredStudies = studies.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term ||
      s.site.toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term) ||
      (s.gps?.cgps && s.gps.cgps.toLowerCase().includes(term)) ||
      (s.contactClient?.nom && s.contactClient.nom.toLowerCase().includes(term)) ||
      (s.chefsEquipe && s.chefsEquipe.some(c => c.toLowerCase().includes(term)));
    
    if (!matchesSearch) return false;

    if (selectedChefFilter !== 'all') {
      if (!s.chefsEquipe || !s.chefsEquipe.some(c => c.toLowerCase() === selectedChefFilter.toLowerCase())) {
        return false;
      }
    }

    if (selectedStatusFilter !== 'all') {
      if (s.status !== selectedStatusFilter) return false;
    }

    if (activeView === 'en-cours') return s.status !== 'Terminé';
    if (activeView === 'terminees') return s.status === 'Terminé';
    if (activeView === 'rapports') return !!s.report;
    if (activeView === 'historique') return true;
    
    return true;
  });

  const canCreate = currentUserRole === 'Admin 1' || currentUserRole === 'Admin 2' || currentUserRole === 'it';

  // Si on est en mode édition / visualisation de rapport LOS complet
  if (editingReportStudyId && currentStudyForReport) {
    return (
      <RfiReportForm 
        study={currentStudyForReport} 
        currentUserRole={currentUserRole}
        onSave={(report) => handleSaveReport(currentStudyForReport.id, report)}
        onCancel={() => setEditingReportStudyId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Feedback */}
      {feedbackSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackSuccess}</span>
          </div>
          <button 
            onClick={() => setFeedbackSuccess('')}
            className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1"
          >
            Fermer
          </button>
        </motion.div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-600/10 text-red-600 rounded-xl">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Module Étude LOS (Line of Sight)
                <span className="text-xs font-bold px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                  SMTT FH Survey
                </span>
              </h2>
              <p className="text-slate-500 text-xs font-medium">
                Attribution des missions d'études de visibilité directe FH et coordination Admin &rarr; Chefs d'équipe
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canCreate && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (!showForm) {
                  setDateAffectation(new Date().toISOString().split('T')[0]);
                }
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {showForm ? 'Fermer le formulaire' : 'Nouvelle Attribution LOS'}
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          1. FORMULAIRE D'ATTRIBUTION ADMIN -> CHEF D'ÉQUIPE (SPEC EXACTE)
          ========================================================================= */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        >
          {/* Form Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Attribution de Tâche "Étude LOS" (Admin &rarr; Chef d'équipe)</h3>
                <p className="text-[11px] text-slate-400">Remplissez les informations obligatoires pour générer la fiche de mission</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section 1: Informations Générales & Mission */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1 border-b border-slate-100">
                <Building className="w-4 h-4 text-red-600" />
                1. Site & Type de Mission
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Site */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Site <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Ex: TUN_1032 / SMTT-LOS-01"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                  />
                </div>

                {/* Type de mission (Défaut: "Accès FH -> Survey -> Étude LOS + APS") */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Type de mission <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-slate-50 transition-all"
                    value={typeMission}
                    onChange={(e) => setTypeMission(e.target.value)}
                    placeholder="Accès FH -> Survey -> Étude LOS + APS"
                  />
                </div>

                {/* Action */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Action <span className="text-red-500">*</span>
                  </label>
                  {!isCustomAction ? (
                    <div className="space-y-1">
                      <select
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white cursor-pointer"
                        value={action}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomAction(true);
                            setCustomActionText('');
                          } else {
                            setAction(e.target.value);
                          }
                        }}
                      >
                        <option value="Accès FH -> Survey -> Étude LOS + APS">Accès FH &rarr; Survey &rarr; Étude LOS + APS</option>
                        <option value="Survey & Étude LOS">Survey & Étude LOS</option>
                        <option value="Accès & Visite LOS">Accès & Visite LOS</option>
                        <option value="Audit & Vérification Visibilité Directe">Audit & Vérification Visibilité</option>
                        <option value="Swap Antenne & Réalignement">Swap Antenne & Réalignement</option>
                        <option value="Installation & Pointage MW">Installation & Pointage MW</option>
                        <option value="__custom__">+ Saisie personnalisée...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        required
                        type="text"
                        placeholder="Préciser l'action..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none"
                        value={customActionText}
                        onChange={(e) => setCustomActionText(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomAction(false);
                          setAction('Accès FH -> Survey -> Étude LOS + APS');
                        }}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                        title="Retour à la liste"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date d'affectation <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                    value={dateAffectation}
                    onChange={(e) => setDateAffectation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Localisation GPS (CGPS) & Contacts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Coordonnées GPS (CGPS) */}
              <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    2. Coordonnées GPS (CGPS)
                  </h4>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 shadow-sm transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    📍 Obtenir ma position GPS actuelle
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Format GPS / CGPS combiné (Ex: 36.8065, 10.1815)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 36.806482, 10.181532"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white placeholder:text-slate-400"
                      value={cgps}
                      onChange={(e) => handleCgpsChange(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Latitude (DEC)</label>
                      <input
                        type="text"
                        placeholder="36.806482"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={lat}
                        onChange={(e) => handleLatChange(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Longitude (DEC)</label>
                      <input
                        type="text"
                        placeholder="10.181532"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={long}
                        onChange={(e) => handleLongChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {lat && long && (
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-medium">📍 CGPS: {lat}, {long}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${long}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Voir sur Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts Client & SMTT */}
              <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-red-600" />
                  3. Contacts & Intervenants
                </h4>

                <div className="space-y-3">
                  {/* Contact Client */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nom Contact Client <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: M. Ben Ali"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={contactNom}
                        onChange={(e) => setContactNom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Téléphone Client <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="Ex: 98 123 456"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={contactTel}
                        onChange={(e) => setContactTel(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Contact SMTT (Par défaut: "Molka Miladi - 20736600", éditable) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Contact SMTT (Par défaut: Molka Miladi - 20736600) <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                      value={contactSMTT}
                      onChange={(e) => setContactSMTT(e.target.value)}
                      placeholder="Molka Miladi - 20736600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Codes Sites Distants & Sélection Chefs d'équipe */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Codes Sites Distants (Min 3 champs vides + bouton dynamique) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-red-600" />
                    4. Codes Sites Distants (Min. 3 champs)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCodeSite}
                    className="flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Ajouter un autre site distant
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Saisissez les codes des sites distants vis-à-vis pour l'étude LOS.
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {codesSitesDistants.map((code, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-500 w-28 shrink-0">
                        Site Distant {index + 1} :
                      </div>
                      <input
                        type="text"
                        placeholder={`Code site distant ${index + 1} (ex: TUN_2041)`}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        value={code}
                        onChange={(e) => handleCodeSiteChange(index, e.target.value)}
                      />
                      {codesSitesDistants.length > 3 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCodeSite(index)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer ce champ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sélection des Chefs d'équipe (Min. 3 listes déroulantes) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-600" />
                    5. Sélection des Chefs d'équipe (Min. 3)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddExtraChef}
                    className="flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Ajouter un chef supplémentaire
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Sélectionnez les chefs d'équipe chargés de réaliser la mission sur le terrain.
                </p>

                <div className="space-y-2.5">
                  {/* Chef 1 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chef d'équipe 1 (Principal) <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white cursor-pointer"
                      value={chef1}
                      onChange={(e) => setChef1(e.target.value)}
                    >
                      <option value="">Sélectionner le chef d'équipe 1...</option>
                      {availableChefs.map(c => (
                        <option key={`chef1-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chef 2 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chef d'équipe 2 (Optionnel / Binôme)
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white cursor-pointer"
                      value={chef2}
                      onChange={(e) => setChef2(e.target.value)}
                    >
                      <option value="">-- Aucun --</option>
                      {availableChefs.map(c => (
                        <option key={`chef2-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Chef 3 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chef d'équipe 3 (Optionnel / Support)
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white cursor-pointer"
                      value={chef3}
                      onChange={(e) => setChef3(e.target.value)}
                    >
                      <option value="">-- Aucun --</option>
                      {availableChefs.map(c => (
                        <option key={`chef3-${c}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Extra Chefs */}
                  {extraChefs.map((extraChef, idx) => (
                    <div key={`extra-${idx}`} className="flex items-center gap-2">
                      <select
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-red-500 outline-none bg-white cursor-pointer"
                        value={extraChef}
                        onChange={(e) => handleExtraChefChange(idx, e.target.value)}
                      >
                        <option value="">Sélectionner chef supplémentaire {idx + 4}...</option>
                        {availableChefs.map(c => (
                          <option key={`extra-${idx}-${c}`} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraChef(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>La validation enregistrera la mission et transmettra la notification aux chefs d'équipe.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Valider & Attribuer la Mission LOS
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Tabs Navigation & Search Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveView('en-cours')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeView === 'en-cours' 
                ? 'border-red-600 text-red-600 bg-red-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Missions GC/LOS en cours
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === 'en-cours' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.enCours}
            </span>
          </button>
          <button
            onClick={() => setActiveView('terminees')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeView === 'terminees' 
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Études Terminées
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === 'terminees' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.terminees}
            </span>
          </button>
          <button
            onClick={() => setActiveView('rapports')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeView === 'rapports' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Rapports d'Intervention
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === 'rapports' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.rapports}
            </span>
          </button>
          <button
            onClick={() => setActiveView('historique')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeView === 'historique' 
                ? 'border-slate-900 text-slate-900 bg-slate-100' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Building className="w-4 h-4" />
            Base Complète des Études
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeView === 'historique' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.total}
            </span>
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Chef Filter */}
          <select
            value={selectedChefFilter}
            onChange={(e) => setSelectedChefFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          >
            <option value="all">Tous les chefs d'équipe</option>
            {availableChefs.map(chef => (
              <option key={chef} value={chef}>{chef}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="Affecté">Affecté</option>
            <option value="Planifié">Planifié</option>
            <option value="Terminé">Terminé</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher site, chef, ID..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Studies Cards / Reports Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="wait">
          {activeView === 'rapports' ? (
            <motion.div 
              key="rapports-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider text-left">
                      <th className="p-4">ID Étude</th>
                      <th className="p-4">Site Principal</th>
                      <th className="p-4">Date LOS</th>
                      <th className="p-4">Chefs d'équipe</th>
                      <th className="p-4">Contact Client</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {filteredStudies.map(study => (
                      <tr key={study.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-black text-slate-700">{study.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{study.site}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {study.gps?.latitude && study.gps?.longitude ? `${study.gps.latitude}, ${study.gps.longitude}` : (study.gps?.cgps || '-')}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{study.report?.donneesLOS.header.dateLOS || study.dateAffectation || '-'}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {study.chefsEquipe.map(c => (
                              <span key={c} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{study.contactClient.nom}</div>
                          <div className="text-[10px] text-slate-500">{study.contactClient.tel}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            study.status === 'Terminé' ? 'bg-emerald-100 text-emerald-700' :
                            study.status === 'Planifié' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {study.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => setSelectedMissionStudy(study)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Voir Fiche de Mission"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              Fiche
                            </button>
                            <button 
                              onClick={() => setEditingReportStudyId(study.id)}
                              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Consulter le Rapport"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Rapport
                            </button>
                            {study.report && (
                              <button 
                                onClick={() => generateExcelReport(study.report!, study.id)}
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                title="Télécharger Excel"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudies.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                          Aucun rapport d'intervention disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            filteredStudies.map((study, index) => (
              <motion.div 
                key={study.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-red-300 transition-all flex flex-col overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                          {study.id}
                        </span>
                        <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded uppercase tracking-wider border border-red-100">
                          {study.codesSitesDistants?.length || 0} Site(s) Distant(s)
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-red-600 transition-colors">
                        {study.site}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-500">
                        {study.typeMission || "Accès FH -> Survey -> Étude LOS + APS"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        study.status === 'Terminé' ? 'bg-emerald-100 text-emerald-700' :
                        study.status === 'Planifié' ? 'bg-blue-100 text-blue-700' :
                        study.status === 'Affecté' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {study.status}
                      </span>
                      {canCreate && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(study.id);
                          }}
                          className="text-slate-300 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="Supprimer cette étude"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid Infos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Affecté le: <span className="font-bold text-slate-900">{study.dateAffectation || study.dateCreation}</span>
                      </p>
                      <p className="flex items-center gap-2 text-slate-600">
                        <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Action: <span className="font-bold text-slate-900 truncate">{study.action}</span>
                      </p>
                      <p className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        SMTT: <span className="font-bold text-slate-900">{study.contactSMTT || "Molka Miladi - 20736600"}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Client: <a href={`tel:${study.contactClient.tel}`} className="font-bold text-slate-900 hover:text-red-600">
                          {study.contactClient.nom} ({study.contactClient.tel})
                        </a>
                      </p>
                      <p className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        CGPS: {study.gps?.latitude && study.gps?.longitude ? (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${study.gps.latitude},${study.gps.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-red-600 hover:underline"
                          >
                            {study.gps.latitude}, {study.gps.longitude}
                          </a>
                        ) : (
                          <span className="font-mono text-slate-700">{study.gps?.cgps || 'Non renseigné'}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        Chefs: 
                        <div className="flex flex-wrap gap-1">
                          {study.chefsEquipe.map(c => (
                            <span key={c} className="bg-white border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-black">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sites Distants Badges */}
                  {study.codesSitesDistants && study.codesSitesDistants.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                        Sites Distants à étudier (LOS) :
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {study.codesSitesDistants.map((remoteCode, rIdx) => (
                          <span 
                            key={rIdx} 
                            className="bg-slate-100 border border-slate-200 text-slate-800 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                            {remoteCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Footer */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">Planifié:</span>
                    {study.datePlanification ? (
                      <span className="text-xs font-black text-blue-600">{study.datePlanification}</span>
                    ) : (
                      <span className="text-xs italic text-slate-400">Non planifié</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Transfert GC */}
                    {study.status === 'Terminé' && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Transféré Génie Civil
                      </span>
                    )}

                    {/* Fiche de mission button */}
                    <button
                      onClick={() => setSelectedMissionStudy(study)}
                      className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      Fiche de Mission
                    </button>

                    {/* Report action button */}
                    <button
                      onClick={() => setEditingReportStudyId(study.id)}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {study.report ? 'Voir Rapport' : 'Remplir Rapport'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {filteredStudies.length === 0 && activeView !== 'rapports' && (
          <div className="lg:col-span-2 py-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <Radio className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-700 font-bold text-sm">Aucune étude LOS trouvée</p>
            <p className="text-slate-400 text-xs mt-1">Créez une nouvelle mission ou modifiez vos filtres de recherche.</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. MODAL FICHE DE MISSION STRUCTURÉE (ADMIN -> CHEF D'ÉQUIPE)
          ========================================================================= */}
      {selectedMissionStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8"
          >
            {/* Header Fiche de Mission */}
            <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    SMTT Télécom - Mission FH
                  </span>
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    Réf: {selectedMissionStudy.id}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                    selectedMissionStudy.status === 'Terminé' ? 'bg-emerald-500 text-white' :
                    selectedMissionStudy.status === 'Planifié' ? 'bg-blue-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {selectedMissionStudy.status}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  FICHE DE MISSION - ÉTUDE LOS
                </h2>
                <p className="text-slate-400 text-xs">
                  Transmise depuis l'Administration aux Chefs d'équipe assignés
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="Imprimer cette fiche"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMissionStudy(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu Fiche de Mission */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Site & Localisation */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Building className="w-4 h-4 text-red-600" />
                    Site Principal & Localisation
                  </span>
                  {selectedMissionStudy.gps?.latitude && selectedMissionStudy.gps?.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedMissionStudy.gps.latitude},${selectedMissionStudy.gps.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ouvrir dans Google Maps
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[11px] text-slate-500 block font-bold">Code / Nom du Site :</span>
                    <span className="text-lg font-black text-slate-900">{selectedMissionStudy.site}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block font-bold">Coordonnées GPS (CGPS) :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedMissionStudy.gps?.latitude && selectedMissionStudy.gps?.longitude 
                        ? `${selectedMissionStudy.gps.latitude}, ${selectedMissionStudy.gps.longitude}` 
                        : (selectedMissionStudy.gps?.cgps || 'Non renseigné')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Détails de la Mission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-red-600" />
                    Mission & Action
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 block">Type de mission :</span>
                      <span className="font-bold text-slate-900">{selectedMissionStudy.typeMission || "Accès FH -> Survey -> Étude LOS + APS"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Action requise :</span>
                      <span className="font-bold text-red-700">{selectedMissionStudy.action}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date d'affectation :</span>
                      <span className="font-bold text-slate-800">{selectedMissionStudy.dateAffectation || selectedMissionStudy.dateCreation}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-red-600" />
                    Contacts Référents
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 block">Contact Client :</span>
                      <span className="font-bold text-slate-900">{selectedMissionStudy.contactClient.nom}</span>
                      <a href={`tel:${selectedMissionStudy.contactClient.tel}`} className="text-red-600 font-bold block hover:underline">
                        📞 {selectedMissionStudy.contactClient.tel}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Contact SMTT :</span>
                      <a href="tel:20736600" className="font-bold text-blue-700 hover:underline">
                        📞 {selectedMissionStudy.contactSMTT || "Molka Miladi - 20736600"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Codes Sites Distants */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-600" />
                  Sites Distants à Analyser (Vis-à-vis LOS)
                </span>

                {selectedMissionStudy.codesSitesDistants && selectedMissionStudy.codesSitesDistants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {selectedMissionStudy.codesSitesDistants.map((siteCode, sIndex) => (
                      <div 
                        key={sIndex} 
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-black block">Site Distant {sIndex + 1}</span>
                          <span className="text-sm font-black text-slate-900">{siteCode}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">
                          LOS Visé
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">Aucun site distant renseigné</p>
                )}
              </div>

              {/* Chefs d'équipe Assignés */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-600" />
                    Chefs d'équipe Assignés
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Planification :</span>
                    <input
                      type="date"
                      className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-semibold outline-none focus:ring-2 focus:ring-red-500"
                      value={selectedMissionStudy.datePlanification || ''}
                      onChange={(e) => handleUpdatePlanification(selectedMissionStudy.id, e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedMissionStudy.chefsEquipe.map((chefName, cIdx) => (
                    <div 
                      key={cIdx}
                      className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2"
                    >
                      <div className="h-6 w-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">
                        {chefName.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{chefName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          {cIdx === 0 ? 'Chef Principal' : `Chef d'équipe ${cIdx + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-slate-100 p-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimer la Fiche de Mission
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMissionStudy(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedMissionStudy.id;
                    setSelectedMissionStudy(null);
                    setEditingReportStudyId(id);
                  }}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Remplir / Consulter le Rapport LOS
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
