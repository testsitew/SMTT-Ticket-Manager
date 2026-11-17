import pptxgen from 'pptxgenjs';
import { AsBuiltData, AsBuiltStepPhoto } from '../types';
import {
  getLogoPngBase64,
  getDiamondMasterBackgroundBase64,
  getRedCloudOverlayBase64,
} from '../assets/logo';

export const DEFAULT_ASBUILT_STEPS: AsBuiltStepPhoto[] = [
  { id: 'step1', stepNumber: 1, title: 'Photos général de site', description: "Vue d'ensemble du site client avant/après installation", status: 'Conforme' },
  { id: 'step2', stepNumber: 2, title: 'Photos général de mât', description: 'Vue globale du mât/pylône avec antennes installées', status: 'Conforme' },
  { id: 'step3', stepNumber: 3, title: 'Fixation Mat', description: 'Détails des ancrages, boulonnerie et haubans de sécurité', status: 'Conforme' },
  { id: 'step4', stepNumber: 4, title: 'Acheminement de fourreau Outdoor', description: 'Protection outdoor, traversée de cloison et étanchéité', status: 'Conforme' },
  { id: 'step5', stepNumber: 5, title: 'Acheminement mollure indoor', description: 'Chemin de câble intérieur, moulures PVC et propreté', status: 'Conforme' },
  { id: 'step6', stepNumber: 6, title: 'Installation Rack B2B', description: 'Baie B2B, alimentation -48V, terre et équipements', status: 'Conforme' },
  { id: 'step7', stepNumber: 7, title: 'Installation SUPPORT site Vis-à-vis', description: 'Support spécifique pour lien FH vers site vis-à-vis', status: 'Conforme' },
];

const OFFICIAL_PHOTO_TITLES: Record<number, string> = {
  1: 'Photos général de site',
  2: 'Photos général de mât',
  3: 'Fixation Mat',
  4: 'Acheminement de fourreau Outdoor',
  5: 'Acheminement mollure indoor',
  6: 'Installation Rack B2B',
  7: 'Installation SUPPORT site Vis-à-vis',
};

/**
 * Formats a date string into JJ/MM/AAAA format.
 */
function formatDateDDMMYYYY(rawDate?: string): string {
  if (!rawDate || !rawDate.trim()) {
    return new Date().toLocaleDateString('fr-FR');
  }
  const trimmed = rawDate.trim();
  const ddmmyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1]}/${ddmmyyyy[2]}/${ddmmyyyy[3]}`;
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('fr-FR');
  }
  return trimmed;
}

/**
 * Pre-fetches an image URL or Blob and returns a Base64 data URL string
 * to prevent CORS or rendering errors inside pptxgenjs.
 * Returns empty string for non-image payloads (e.g. PDFs) so slide rendering never crashes.
 */
async function urlToBase64(url?: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:image/') && url.toLowerCase().includes(';base64,')) return url;
  if (url.startsWith('data:application/pdf') || url.toLowerCase().endsWith('.pdf')) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    if (blob.type && !blob.type.startsWith('image/')) return '';
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        if (result.startsWith('data:image/') && result.toLowerCase().includes(';base64,')) {
          resolve(result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Unable to convert image URL to base64 for PPTX:', url, err);
    return '';
  }
}

/**
 * Generates and downloads the official AS_BUILT PowerPoint file (.pptx)
 * 16:9 Widescreen (13.33 x 7.5 in) matching the official Ooredoo Business 9-slide template.
 */
export async function generateAsBuiltPPTX(
  data: AsBuiltData,
  onProgress?: (progress: number, stepName: string) => void
): Promise<void> {
  const rawNomSite = String(data.nomSiteClient || 'SITE CLIENT OOREDOO').replace(/^f{4,8}/i, '').trim();
  const siteName = (rawNomSite || 'SITE CLIENT OOREDOO').toUpperCase();
  const siteCode = String(data.codeSiteClient || 'SIL_8321').trim();
  const subcontractor = String(data.nomSousTraitant || 'SMTT').trim();
  const formattedDate = formatDateDDMMYYYY(data.dateRealisation);

  const cleanFilename = `AS_BUILT_Travaux_GC_${siteCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_${formattedDate.replace(/[^a-zA-Z0-9]/g, '-')}.pptx`;

  if (onProgress) onProgress(15, 'Préparation du modèle officiel Ooredoo Business (16:9)...');

  const [masterBgBase64, cloudOverlayBase64, logoFooterBase64] = await Promise.all([
    getDiamondMasterBackgroundBase64(),
    getRedCloudOverlayBase64(),
    getLogoPngBase64(440, 148, 'red_on_white'),
  ]);

  const PptxClass = (pptxgen as any).default || pptxgen;
  const pptx = new PptxClass();

  // Exact 16:9 Widescreen 13.33 x 7.5 inches
  pptx.defineLayout({ name: 'OOREDOO_16x9_WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'OOREDOO_16x9_WIDE';
  pptx.author = 'Ooredoo Tunisia B2B';
  pptx.company = 'Ooredoo Business';
  pptx.title = `AS_BUILT Travaux GC - ${siteCode}`;

  const RED_OOREDOO = 'ED1C24';
  const BLACK = '000000';
  const WHITE = 'FFFFFF';
  const GREY_BG = 'E6E6E6';
  const SLATE_TEXT = '475569';

  // Common Master Slide: diamond background + bottom-left Ooredoo Business logo + bottom red horizontal line
  const masterObjects: any[] = [];
  if (logoFooterBase64 && logoFooterBase64.includes(';base64,')) {
    masterObjects.push({
      image: {
        data: logoFooterBase64,
        x: 0.5,
        y: 6.45,
        w: 2.85,
        h: 0.96,
      },
    });
  }
  masterObjects.push({
    line: {
      x: 3.5,
      y: 6.95,
      w: 9.3,
      h: 0,
      line: { color: RED_OOREDOO, width: 2.5 },
    },
  });

  pptx.defineSlideMaster({
    title: 'OOREDOO_ASBUILT_MASTER',
    background:
      masterBgBase64 && masterBgBase64.includes(';base64,')
        ? { data: masterBgBase64 }
        : { color: GREY_BG },
    objects: masterObjects,
  });

  const addSlideNumber = (slide: any, num: number) => {
    slide.addText(String(num), {
      x: 12.75,
      y: 6.82,
      w: 0.45,
      h: 0.35,
      fontFace: 'Arial',
      fontSize: 14,
      bold: true,
      color: RED_OOREDOO,
      align: 'right',
      valign: 'middle',
    });
  };

  // =========================================================================
  // SLIDE 1 : PAGE DE GARDE (OOREDOO BUSINESS - AS_BUILT TRAVAUX GC)
  // =========================================================================
  if (onProgress) onProgress(25, 'Génération Slide 1 : Page de garde...');
  const slide1 = pptx.addSlide({ masterName: 'OOREDOO_ASBUILT_MASTER' });

  // Top-right red rectangle + horizontal red line to the right edge
  slide1.addShape(pptx.ShapeType.rect, {
    x: 7.9,
    y: 0.45,
    w: 4.1,
    h: 0.45,
    fill: { color: RED_OOREDOO },
    line: { color: RED_OOREDOO, width: 0 },
  });
  slide1.addText('AS_BUILT Travaux GC', {
    x: 7.9,
    y: 0.45,
    w: 4.1,
    h: 0.45,
    fontFace: 'Times New Roman',
    fontSize: 16,
    bold: true,
    color: WHITE,
    align: 'center',
    valign: 'middle',
  });
  slide1.addShape(pptx.ShapeType.line, {
    x: 7.2,
    y: 0.96,
    w: 6.13,
    h: 0,
    line: { color: RED_OOREDOO, width: 2 },
  });

  // Left red scalloped cloud + detached right circle
  if (cloudOverlayBase64 && cloudOverlayBase64.includes(';base64,')) {
    slide1.addImage({
      data: cloudOverlayBase64,
      x: 0.55,
      y: 0.55,
      w: 8.15,
      h: 4.35,
    });
  } else {
    slide1.addShape(pptx.ShapeType.roundRect, {
      x: 0.7,
      y: 0.7,
      w: 6.8,
      h: 4.3,
      fill: { color: RED_OOREDOO },
      line: { color: RED_OOREDOO, width: 0 },
      rectRadius: 0.35,
    });
    slide1.addShape(pptx.ShapeType.ellipse, {
      x: 8.1,
      y: 3.3,
      w: 0.45,
      h: 0.45,
      fill: { color: RED_OOREDOO },
      line: { color: RED_OOREDOO, width: 0 },
    });
  }

  // Title & dynamic fields inside the red cloud
  slide1.addText(
    [
      {
        text: 'Travaux GC site client Ooredoo',
        options: {
          fontFace: 'Arial',
          fontSize: 20,
          bold: true,
          color: WHITE,
          align: 'center',
          breakLine: true,
          paraSpaceAfter: 10,
        },
      },
      {
        text: 'Nom site client: ',
        options: { fontFace: 'Times New Roman', fontSize: 18, color: WHITE, align: 'left' },
      },
      {
        text: siteName,
        options: {
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: BLACK,
          align: 'left',
          breakLine: true,
          paraSpaceAfter: 6,
        },
      },
      {
        text: 'Code Site Client : ',
        options: { fontFace: 'Times New Roman', fontSize: 18, color: WHITE, align: 'left' },
      },
      {
        text: siteCode,
        options: {
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: BLACK,
          align: 'left',
          breakLine: true,
          paraSpaceAfter: 6,
        },
      },
      {
        text: 'Sous-traitant: ',
        options: { fontFace: 'Times New Roman', fontSize: 18, color: WHITE, align: 'left' },
      },
      {
        text: subcontractor,
        options: {
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: BLACK,
          align: 'left',
          breakLine: true,
          paraSpaceAfter: 6,
        },
      },
      {
        text: 'Date: ',
        options: { fontFace: 'Times New Roman', fontSize: 18, color: WHITE, align: 'left' },
      },
      {
        text: formattedDate,
        options: {
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: BLACK,
          align: 'left',
        },
      },
    ],
    {
      x: 1.0,
      y: 1.0,
      w: 6.1,
      h: 3.15,
      margin: 0.05,
      valign: 'top',
      wrap: true,
    }
  );

  addSlideNumber(slide1, 1);

  // =========================================================================
  // SLIDES 2 À 8 : PHOTOS TERRAIN (ÉTAPE 2)
  // =========================================================================
  for (let stepNum = 1; stepNum <= 7; stepNum++) {
    const slideNumber = stepNum + 1;
    const stepPhoto =
      data.photos?.find((p) => p.stepNumber === stepNum) || data.photos?.[stepNum - 1];

    const rawTitle = stepPhoto?.title?.trim() || '';
    const slideTitle =
      !rawTitle || rawTitle === 'Installation Rack B2BNA'
        ? OFFICIAL_PHOTO_TITLES[stepNum]
        : rawTitle;

    if (onProgress) {
      onProgress(25 + Math.round((stepNum / 7) * 55), `Génération Slide ${slideNumber} : ${slideTitle}...`);
    }

    const slide = pptx.addSlide({ masterName: 'OOREDOO_ASBUILT_MASTER' });

    // Top centered red header with 1pt black border and white bold italic 16pt text
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.5,
      y: 0.35,
      w: 5.0,
      h: 0.48,
      fill: { color: RED_OOREDOO },
      line: { color: BLACK, width: 1 },
    });
    slide.addText(slideTitle, {
      x: 4.5,
      y: 0.35,
      w: 5.0,
      h: 0.48,
      fontFace: 'Times New Roman',
      fontSize: 16,
      bold: true,
      italic: true,
      color: WHITE,
      align: 'center',
      valign: 'middle',
    });

    // Horizontal red line below header
    slide.addShape(pptx.ShapeType.line, {
      x: 1.9,
      y: 0.92,
      w: 9.2,
      h: 0,
      line: { color: RED_OOREDOO, width: 2 },
    });

    // Photo zone (x: 4.8, y: 1.05, w: 4.3, h: 5.85)
    const photoBase64 = stepPhoto?.photoUrl ? await urlToBase64(stepPhoto.photoUrl) : '';
    if (photoBase64 && photoBase64.includes(';base64,')) {
      slide.addImage({
        data: photoBase64,
        x: 4.8,
        y: 1.05,
        w: 4.3,
        h: 5.85,
        sizing: { type: 'contain', w: 4.3, h: 5.85 },
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 4.8,
        y: 1.35,
        w: 4.3,
        h: 5.2,
        fill: { color: WHITE, transparency: 35 },
        line: { color: '94A3B8', width: 1.25, dashType: 'dash' },
      });
      slide.addText('Photo non fournie', {
        x: 4.8,
        y: 1.35,
        w: 4.3,
        h: 5.2,
        fontFace: 'Times New Roman',
        fontSize: 16,
        bold: true,
        color: SLATE_TEXT,
        align: 'center',
        valign: 'middle',
      });
    }

    addSlideNumber(slide, slideNumber);
  }

  // =========================================================================
  // SLIDE 9 : ATTESTATION DE SCELLEMENT (CADRE BLANC VIERGE OU SCAN UPLOADÉ)
  // =========================================================================
  if (onProgress) onProgress(88, 'Génération Slide 9 : Attestation de scellement...');
  const slide9 = pptx.addSlide({ masterName: 'OOREDOO_ASBUILT_MASTER' });

  // Top horizontal red line
  slide9.addShape(pptx.ShapeType.line, {
    x: 1.9,
    y: 0.7,
    w: 9.2,
    h: 0,
    line: { color: RED_OOREDOO, width: 2 },
  });

  // Central blank white document frame (x: 2.3, y: 0.85, w: 8.7, h: 5.9)
  slide9.addShape(pptx.ShapeType.rect, {
    x: 2.3,
    y: 0.85,
    w: 8.7,
    h: 5.9,
    fill: { color: WHITE },
    line: { color: 'CBD5E1', width: 1 },
  });

  const rawAttestationSource = data.attestationImageUrl || data.attestationScellementUrl;
  const attestationBase64 = rawAttestationSource ? await urlToBase64(rawAttestationSource) : '';

  if (attestationBase64 && attestationBase64.includes(';base64,')) {
    slide9.addImage({
      data: attestationBase64,
      x: 2.4,
      y: 0.92,
      w: 8.5,
      h: 5.76,
      sizing: { type: 'contain', w: 8.5, h: 5.76 },
    });
  }

  addSlideNumber(slide9, 9);

  if (onProgress) onProgress(95, 'Téléchargement du fichier PowerPoint...');
  await pptx.writeFile({ fileName: cleanFilename });
  if (onProgress) onProgress(100, 'Téléchargement terminé !');
}
