import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

// Helper to convert SVG Data URL to PNG Base64 for Excel insertion
export const svgToPngBase64 = (svgDataUrl: string, width = 154, height = 52): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = svgDataUrl;
    } catch {
      resolve('');
    }
  });
};

// Image compression helper
export const compressImage = (base64: string, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }
      
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 900;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

export const generateExcelReport = async (reportData: RfiReport, studyId: string) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const logoPngBase64 = await svgToPngBase64(OOREDOO_BUSINESS_LOGO, 154, 52);
    
    // Style constants
    const OOREDOO_RED = 'FF0000';
    const WHITE = 'FFFFFF';
    const BLACK = 'FF000000';
    const BORDER_STYLE: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: BLACK } };
    const FULL_BORDER: Partial<ExcelJS.Borders> = {
      top: BORDER_STYLE,
      left: BORDER_STYLE,
      bottom: BORDER_STYLE,
      right: BORDER_STYLE
    };

    // Helper functions
    const colToLetter = (col: number) => {
      let letter = '';
      while (col > 0) {
        let temp = (col - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        col = (col - temp - 1) / 26;
      }
      return letter;
    };

    const addImageSafe = (ws: ExcelJS.Worksheet, base64: string | undefined, tl: { row: number, col: number }, br: { row: number, col: number }) => {
      if (!base64 || !base64.includes('base64,')) return;
      try {
        const imageId = workbook.addImage({
          base64: base64.split('base64,')[1],
          extension: 'png',
        });
        // Anchor with tiny offset inside cell range so image does not obscure cell perimeter borders
        ws.addImage(imageId, {
          tl: { col: tl.col - 1 + 0.02, row: tl.row - 1 + 0.02 } as any,
          br: { col: br.col - 0.02, row: br.row - 0.02 } as any,
          editAs: 'oneCell'
        });
      } catch (e) {
        console.error("Image add failed", e);
      }
    };

    const addLogoSafe = (ws: ExcelJS.Worksheet, base64: string | undefined, _tl?: { row: number, col: number }) => {
      if (!base64 || !base64.includes('base64,')) return;
      try {
        const imageId = workbook.addImage({
          base64: base64.split('base64,')[1],
          extension: 'png',
        });
        // Positioned top-left anchored at Cell B2/B3 (0-indexed col 1 = Column B, row 1 = Row 2)
        ws.addImage(imageId, {
          tl: { col: 1, row: 1 } as any,
          ext: { width: 154, height: 52 },
          editAs: 'oneCell'
        });
      } catch (e) {
        console.error("Logo add failed", e);
      }
    };

    const applyMergedBoxStyle = (
      ws: ExcelJS.Worksheet,
      startRow: number,
      startCol: number,
      endRow: number,
      endCol: number,
      fillColor = 'FFFFFF'
    ) => {
      ws.mergeCells(startRow, startCol, endRow, endCol);
      const borderThin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: BLACK } };
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = ws.getCell(r, c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
          cell.border = {
            top: borderThin,
            bottom: borderThin,
            left: borderThin,
            right: borderThin,
          };
        }
      }
    };

    const addSheetHeader = (ws: ExcelJS.Worksheet, title: string, subtitleOrMaxCol?: string | number, maxColParam?: number) => {
      let subtitle: string | undefined;
      let maxCol = 15;

      if (typeof subtitleOrMaxCol === 'number') {
        maxCol = subtitleOrMaxCol;
      } else if (typeof subtitleOrMaxCol === 'string') {
        subtitle = subtitleOrMaxCol;
        if (typeof maxColParam === 'number') {
          maxCol = maxColParam;
        }
      }

      // Zone du Logo exclusivement en Lignes 2 à 4, Colonnes B à C (B2:C4)
      ws.mergeCells('B2:C4');
      for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 3; c++) {
          ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
        }
      }
      ws.getCell('B2').value = '';

      if (logoPngBase64) {
        addLogoSafe(ws, logoPngBase64);
      }

      // Titre principal commençant à la Ligne 5 (Lignes 5 à 6, Colonnes B à maxCol)
      ws.mergeCells(5, 2, 6, maxCol);
      for (let r = 5; r <= 6; r++) {
        for (let c = 2; c <= maxCol; c++) {
          const cell = ws.getCell(r, c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
          cell.border = FULL_BORDER;
        }
      }
      const titleCell = ws.getCell(5, 2);
      titleCell.value = subtitle ? `${title}\n${subtitle}` : title;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    };

    // --- SHEET 1: DONNEES LOS ---
    const worksheet = workbook.addWorksheet('DONNEES LOS');
    worksheet.columns = Array(19).fill({ width: 15 });
    addSheetHeader(worksheet, 'FICHE LOS SURVEY', 15);

    // --- Header Block (shifted down: rows 8 & 9) ---
    const row8Header = worksheet.getRow(8);
    row8Header.getCell(1).value = 'CODE SITE';
    row8Header.getCell(1).font = { bold: true, color: { argb: WHITE } };
    row8Header.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row8Header.getCell(1).border = FULL_BORDER;
    row8Header.getCell(1).alignment = { horizontal: 'center' };

    worksheet.mergeCells('B8:D8');
    row8Header.getCell(2).value = reportData.donneesLOS.header.codeSite;
    row8Header.getCell(2).border = FULL_BORDER;
    row8Header.getCell(2).alignment = { horizontal: 'center' };

    row8Header.getCell(6).value = 'NOM DE SITE';
    row8Header.getCell(6).font = { bold: true, color: { argb: WHITE } };
    row8Header.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row8Header.getCell(6).border = FULL_BORDER;
    row8Header.getCell(6).alignment = { horizontal: 'center' };

    worksheet.mergeCells('G8:K8');
    row8Header.getCell(7).value = reportData.donneesLOS.header.nomSite;
    row8Header.getCell(7).border = FULL_BORDER;
    row8Header.getCell(7).alignment = { horizontal: 'center' };

    const row9Header = worksheet.getRow(9);
    row9Header.getCell(1).value = 'DATE LOS';
    row9Header.getCell(1).font = { bold: true, color: { argb: WHITE } };
    row9Header.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row9Header.getCell(1).border = FULL_BORDER;
    row9Header.getCell(1).alignment = { horizontal: 'center' };

    worksheet.mergeCells('B9:D9');
    row9Header.getCell(2).value = reportData.donneesLOS.header.dateLOS;
    row9Header.getCell(2).border = FULL_BORDER;
    row9Header.getCell(2).alignment = { horizontal: 'center' };

    worksheet.mergeCells('F9:H9');
    row9Header.getCell(6).value = 'SUPERVISEUR LOS';
    row9Header.getCell(6).font = { bold: true, color: { argb: WHITE } };
    row9Header.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row9Header.getCell(6).border = FULL_BORDER;
    row9Header.getCell(6).alignment = { horizontal: 'center' };

    worksheet.mergeCells('I9:J9');
    row9Header.getCell(9).value = reportData.donneesLOS.header.superviseur.nom + ' ' + reportData.donneesLOS.header.superviseur.tel;
    row9Header.getCell(9).border = FULL_BORDER;
    row9Header.getCell(9).alignment = { horizontal: 'center' };

    row9Header.getCell(11).value = 'Maintenancier';
    row9Header.getCell(11).font = { bold: true, color: { argb: WHITE } };
    row9Header.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row9Header.getCell(11).border = FULL_BORDER;
    row9Header.getCell(11).alignment = { horizontal: 'center' };

    worksheet.mergeCells('L9:N9');
    row9Header.getCell(12).value = reportData.donneesLOS.header.maintenancier.nom + ' ' + reportData.donneesLOS.header.maintenancier.tel;
    row9Header.getCell(12).border = FULL_BORDER;
    row9Header.getCell(12).alignment = { horizontal: 'center' };

    worksheet.mergeCells('A11:D11');
    const infoSiteHeader = worksheet.getCell('A11');
    infoSiteHeader.value = 'INFORMATION SITE';
    infoSiteHeader.font = { bold: true, color: { argb: WHITE } };
    infoSiteHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    infoSiteHeader.alignment = { horizontal: 'center' };
    infoSiteHeader.border = FULL_BORDER;

    worksheet.mergeCells('F11:K11');
    const coordHeader = worksheet.getCell('F11');
    coordHeader.value = 'COORDONNEES SITE';
    coordHeader.font = { bold: true, color: { argb: WHITE } };
    coordHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    coordHeader.alignment = { horizontal: 'center' };
    coordHeader.border = FULL_BORDER;

    const subHeaderRow = worksheet.getRow(12);
    ['Latitude DMS', 'Longitude DMS', 'Latitude DEC', 'Longitude DEC', 'Hauteur Batiment'].forEach((val, idx) => {
      const cell = subHeaderRow.getCell(6 + idx);
      cell.value = val;
      cell.font = { size: 8, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = FULL_BORDER;
    });
    subHeaderRow.height = 30;

    const row12Info = worksheet.getRow(12);
    row12Info.getCell(1).value = 'Contact client';
    row12Info.getCell(1).font = { bold: true, color: { argb: WHITE } };
    row12Info.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row12Info.getCell(1).border = FULL_BORDER;
    worksheet.mergeCells('B12:D12');
    row12Info.getCell(2).value = reportData.donneesLOS.infoSite.contactClient;
    row12Info.getCell(2).border = FULL_BORDER;

    const row13Info = worksheet.getRow(13);
    row13Info.getCell(1).value = 'STRUCTURE A CONSTRUIRE';
    row13Info.getCell(1).font = { size: 8, bold: true, color: { argb: WHITE } };
    row13Info.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row13Info.getCell(1).border = FULL_BORDER;
    worksheet.mergeCells('B13:D13');
    row13Info.getCell(2).value = reportData.donneesLOS.infoSite.structureAConstruire;
    row13Info.getCell(2).border = FULL_BORDER;

    const row14Info = worksheet.getRow(14);
    row14Info.getCell(1).value = 'Longueur de Câble POE';
    row14Info.getCell(1).font = { size: 8, bold: true, color: { argb: WHITE } };
    row14Info.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    row14Info.getCell(1).border = FULL_BORDER;
    worksheet.mergeCells('B14:D14');
    row14Info.getCell(2).value = reportData.donneesLOS.infoSite.longueurCablePOE;
    row14Info.getCell(2).border = FULL_BORDER;

    const coordDataRow = worksheet.getRow(13);
    coordDataRow.getCell(6).value = reportData.donneesLOS.coordonnees.latitudeDMS;
    coordDataRow.getCell(7).value = reportData.donneesLOS.coordonnees.longitudeDMS;
    coordDataRow.getCell(8).value = reportData.donneesLOS.coordonnees.latitudeDEC;
    coordDataRow.getCell(9).value = reportData.donneesLOS.coordonnees.longitudeDEC;
    coordDataRow.getCell(10).value = reportData.donneesLOS.coordonnees.hauteurBatiment;
    for (let i = 6; i <= 10; i++) {
      coordDataRow.getCell(i).border = FULL_BORDER;
      coordDataRow.getCell(i).alignment = { horizontal: 'center' };
    }

    const table1Start = 16;
    worksheet.mergeCells(`A${table1Start}:O${table1Start}`);
    const table1Header = worksheet.getCell(`A${table1Start}`);
    table1Header.value = 'INFORMATIONS SITES DISTANTS';
    table1Header.font = { bold: true, color: { argb: WHITE } };
    table1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
    table1Header.alignment = { horizontal: 'center' };
    table1Header.border = FULL_BORDER;

    const t1SubHeader = worksheet.getRow(table1Start + 1);
    const headers = [
      "Code site distant", "LOS", "Latitude DMS", "Longitude DMS", "Latitude DEC", "Longitude DEC", "Elevation",
      "H. Ant Locale (m)", "H. Ant Dist (m)", "Azimut L-D", "Azimut D-L", "Bond (Km)", "Diam L (cm)", "Diam D (cm)",
      "Freq (GHz)", "POE", "MW", "NRJ", "Commentaire"
    ];
    worksheet.columns = Array(19).fill({ width: 15 });

    headers.forEach((h, i) => {
      const cell = t1SubHeader.getCell(i + 1);
      cell.value = h;
      cell.font = { size: 8, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = FULL_BORDER;
    });
    t1SubHeader.height = 40;

    (reportData.donneesLOS.sitesDistants || []).forEach((rs, idx) => {
      const row = worksheet.getRow(table1Start + 2 + idx);
      const isNonLos = rs.statusLOS === 'Non';
      const values = [
        rs.codeSiteDistant, rs.statusLOS, rs.gpsDMS.lat, rs.gpsDMS.long, rs.gpsDEC.lat, rs.gpsDEC.long, rs.gpsDMS.elev || '',
        rs.hauteurAntenneLocale, rs.hauteurAntenneDistante, rs.azimutLocalDistant, rs.azimutDistantLocal, rs.longueurBond,
        rs.diametreAntenne, rs.diametreAntenneDistante, rs.frequence, rs.longueurCableIF || rs.longueurCablePOE || '', rs.ajoutSupportMW, rs.ajoutDepartEnergie, rs.commentaire
      ];
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.border = FULL_BORDER;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { size: 9 };

        // Highlight Commentaire cell in YELLOW #FFFF00 if LOS = NON
        if (i === 18 && isNonLos) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
          cell.font = { size: 9, bold: true, color: { argb: '000000' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    const table2Start = table1Start + 2 + Math.max(reportData.donneesLOS.sitesDistants?.length || 0, 1) + 2;

    // 1. Bandeau de Titre Principal (B to O)
    worksheet.mergeCells(`B${table2Start}:O${table2Start}`);
    for (let c = 2; c <= 15; c++) {
      const cell = worksheet.getCell(table2Start, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      cell.border = FULL_BORDER;
    }
    const table2Header = worksheet.getCell(`B${table2Start}`);
    table2Header.value = 'RESUME POUR TABLEAU TRANS';
    table2Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    table2Header.alignment = { horizontal: 'center', vertical: 'middle' };

    // Gap row
    worksheet.getRow(table2Start + 1).height = 10;

    // 2. Sous-titres (Ligne de Tableau) : B to H and I to O
    const subTitleRowIndex = table2Start + 2;
    worksheet.mergeCells(`B${subTitleRowIndex}:H${subTitleRowIndex}`);
    for (let c = 2; c <= 8; c++) {
      const cell = worksheet.getCell(subTitleRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      cell.border = FULL_BORDER;
    }
    const t2SubLeft = worksheet.getCell(`B${subTitleRowIndex}`);
    t2SubLeft.value = `Chaîne pour le site ${reportData.donneesLOS.header.codeSite}`;
    t2SubLeft.font = { name: 'Arial', size: 9, bold: true, color: { argb: WHITE } };
    t2SubLeft.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(`I${subTitleRowIndex}:O${subTitleRowIndex}`);
    for (let c = 9; c <= 15; c++) {
      const cell = worksheet.getCell(subTitleRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      cell.border = FULL_BORDER;
    }
    const t2SubRight = worksheet.getCell(`I${subTitleRowIndex}`);
    t2SubRight.value = 'Chaîne pour le site distant';
    t2SubRight.font = { name: 'Arial', size: 9, bold: true, color: { argb: WHITE } };
    t2SubRight.alignment = { horizontal: 'center', vertical: 'middle' };

    // 3. Lignes de Contenu du Tableau (Pour chaque ligne de données) : B to H and I to O
    const sitesList = (reportData.donneesLOS.sitesDistants && reportData.donneesLOS.sitesDistants.length > 0)
      ? reportData.donneesLOS.sitesDistants
      : [{
          id: 'default',
          codeSiteDistant: 'Site Distant',
          statusLOS: 'Oui' as const,
          gpsDMS: { lat: '', long: '' },
          gpsDEC: { lat: '', long: '' },
          hauteurAntenneLocale: '',
          hauteurAntenneDistante: '',
          azimutLocalDistant: '',
          azimutDistantLocal: '',
          longueurBond: '',
          diametreAntenne: '',
          diametreAntenneDistante: '',
          frequence: '',
          ajoutSupportMW: 'Non',
          ajoutDepartEnergie: 'Non',
          commentaire: '',
          chaineSiteLocal: reportData.donneesLOS.resumeTrans?.siteLocal || 'LOS OK',
          chaineSiteDistant: reportData.donneesLOS.resumeTrans?.siteDistant || ''
        }];

    sitesList.forEach((rs, idx) => {
      const dataRowIndex = subTitleRowIndex + 1 + idx;
      
      const localVal = rs.chaineSiteLocal || (idx === 0 ? reportData.donneesLOS.resumeTrans?.siteLocal : undefined) || (rs.statusLOS === 'Oui' ? 'LOS OK' : 'LOS Non OK');
      const distantVal = rs.chaineSiteDistant || (idx === 0 ? reportData.donneesLOS.resumeTrans?.siteDistant : undefined) || `H1=${rs.hauteurAntenneLocale || '-'}m / D1=${rs.diametreAntenne || '-'}cm / Az=${rs.azimutLocalDistant || '-'}° / Dist=${rs.longueurBond || '-'}km / ${rs.codeSiteDistant} / H2=${rs.hauteurAntenneDistante || '-'}m / D2=${rs.diametreAntenneDistante || '-'}cm / Freq=${rs.frequence || '-'}GHz`;

      worksheet.mergeCells(`B${dataRowIndex}:H${dataRowIndex}`);
      for (let c = 2; c <= 8; c++) {
        const cell = worksheet.getCell(dataRowIndex, c);
        cell.border = FULL_BORDER;
      }
      const t2DataLeft = worksheet.getCell(`B${dataRowIndex}`);
      t2DataLeft.value = localVal;
      t2DataLeft.alignment = { horizontal: 'center', vertical: 'middle' };
      t2DataLeft.font = { name: 'Arial', size: 9, bold: true };

      worksheet.mergeCells(`I${dataRowIndex}:O${dataRowIndex}`);
      for (let c = 9; c <= 15; c++) {
        const cell = worksheet.getCell(dataRowIndex, c);
        cell.border = FULL_BORDER;
      }
      const t2DataRight = worksheet.getCell(`I${dataRowIndex}`);
      t2DataRight.value = distantVal;
      t2DataRight.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      t2DataRight.font = { name: 'Arial', size: 9 };
    });

    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // --- SHEET 2: PROFILS ---
    const profilsWorksheet = workbook.addWorksheet('PROFILS');
    
    // Column widths A to T
    for (let c = 1; c <= 20; c++) {
      if (c === 6 || c === 10 || c === 15 || c === 16) {
        profilsWorksheet.getColumn(c).width = 3;  // Separators
      } else if (c === 17) {
        profilsWorksheet.getColumn(c).width = 18; // Col Q: Code site client
      } else if (c === 18) {
        profilsWorksheet.getColumn(c).width = 14; // Col R: Direction
      } else if (c === 19) {
        profilsWorksheet.getColumn(c).width = 16; // Col S: Taille antenne
      } else {
        profilsWorksheet.getColumn(c).width = 9;
      }
    }

    // Logo image area top-left (B2:C4)
    profilsWorksheet.mergeCells('B2:C4');
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 3; c++) {
        profilsWorksheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
      }
    }
    profilsWorksheet.getCell('B2').value = '';
    if (logoPngBase64) {
      addLogoSafe(profilsWorksheet, logoPngBase64);
    }

    // Grand bandeau rouge PROFILS LOS (B5 à T6) - Commençant à la Ligne 5
    profilsWorksheet.mergeCells('B5:T6');
    for (let r = 5; r <= 6; r++) {
      for (let c = 2; c <= 20; c++) {
        const cell = profilsWorksheet.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
        cell.border = FULL_BORDER;
      }
    }
    const profilsHeaderCell = profilsWorksheet.getCell('B5');
    profilsHeaderCell.value = 'PROFILS LOS';
    profilsHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
    profilsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 7 is blank space above sub-headers
    profilsWorksheet.getRow(7).height = 15;

    // Build vis-à-vis list strictly from reportData.visAVis or fallback to donneesLOS.sitesDistants
    const visAList = (reportData.visAVis && reportData.visAVis.length > 0)
      ? reportData.visAVis
      : (reportData.donneesLOS?.sitesDistants || []).map((sd, i) => ({
          id: sd.id || `vav_${i + 1}`,
          codeSite: sd.codeSiteDistant || `Site Distant ${i + 1}`,
          statusLOS: sd.statusLOS === 'Non' ? 'LOS Non OK' : 'LOS OK',
          imageProfilUrl: '',
          commentaireProfil: sd.commentaire || '',
          imageGoogleMapsUrl: '',
          typeDeuxiemeImage: 'google' as const,
          titreDeuxiemeImage: 'Photo Obstacle',
          planCapilaire: [
            { codeSite: sd.codeSiteDistant || `Site ${i + 1}`, direction: sd.azimutLocalDistant ? `${sd.azimutLocalDistant}°` : '', tailleAntenne: sd.diametreAntenne ? `${sd.diametreAntenne} cm` : '' }
          ]
        }));

    visAList.forEach((vav, idx) => {
      const codeSiteDistant = vav.codeSite || `Site Distant ${idx + 1}`;
      const titreDeuxieme = vav.titreDeuxiemeImage || (vav.typeDeuxiemeImage === 'obstacle' ? 'Photo obstacle' : 'Localisation sur google');

      // Sub-header Row (Row 8 for Bloc 1, Row 38 for Bloc 2, etc.)
      const subHeaderRow = 8 + (idx * 30);
      profilsWorksheet.getRow(subHeaderRow).height = 20;

      // Col 1 (PL vis-à-vis): Fusion D7:G7
      profilsWorksheet.mergeCells(`D${subHeaderRow}:G${subHeaderRow}`);
      const c1Header = profilsWorksheet.getCell(`D${subHeaderRow}`);
      c1Header.value = `PL vis-à-vis ${codeSiteDistant}`;
      c1Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
      c1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      c1Header.alignment = { horizontal: 'center', vertical: 'middle' };
      c1Header.border = FULL_BORDER;

      // Col 2 (Localisation/Obstacle): Fusion K7:N7
      profilsWorksheet.mergeCells(`K${subHeaderRow}:N${subHeaderRow}`);
      const c2Header = profilsWorksheet.getCell(`K${subHeaderRow}`);
      c2Header.value = titreDeuxieme;
      c2Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
      c2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      c2Header.alignment = { horizontal: 'center', vertical: 'middle' };
      c2Header.border = FULL_BORDER;

      // Col 3 (Plan Capillaire): Fusion Q7:S7
      profilsWorksheet.mergeCells(`Q${subHeaderRow}:S${subHeaderRow}`);
      const c3Header = profilsWorksheet.getCell(`Q${subHeaderRow}`);
      c3Header.value = 'Plan Capilaire ';
      c3Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
      c3Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      c3Header.alignment = { horizontal: 'center', vertical: 'middle' };
      c3Header.border = FULL_BORDER;

      // Row subHeaderRow + 1 is blank spacing above content
      profilsWorksheet.getRow(subHeaderRow + 1).height = 12;

      // Header row for Plan Capillaire (Ligne 9 for Bloc 1 / subHeaderRow + 2)
      const tHeaderRow = subHeaderRow + 2;
      profilsWorksheet.getRow(tHeaderRow).height = 20;

      // Q9: "Code site client "
      const cellQ = profilsWorksheet.getCell(`Q${tHeaderRow}`);
      cellQ.value = 'Code site client ';
      cellQ.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      cellQ.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cellQ.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cellQ.border = FULL_BORDER;

      // R9: "Direction"
      const cellR = profilsWorksheet.getCell(`R${tHeaderRow}`);
      cellR.value = 'Direction';
      cellR.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      cellR.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cellR.alignment = { horizontal: 'center', vertical: 'middle' };
      cellR.border = FULL_BORDER;

      // S9: "Taille antenne "
      const cellS = profilsWorksheet.getCell(`S${tHeaderRow}`);
      cellS.value = 'Taille antenne ';
      cellS.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      cellS.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cellS.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cellS.border = FULL_BORDER;

      // Content zone: Rows 10 to 28 for Bloc 1 (subHeaderRow + 3 to subHeaderRow + 21 -> 19 rows)
      const contentStart = subHeaderRow + 3;
      const contentEnd = subHeaderRow + 21;

      // Col 1 Photo Box: Fusion D10:G28
      applyMergedBoxStyle(profilsWorksheet, contentStart, 4, contentEnd, 7, 'FFFFFF');
      const p1Box = profilsWorksheet.getCell(`D${contentStart}`);
      p1Box.alignment = { horizontal: 'center', vertical: 'middle' };
      if (!vav.imageProfilUrl) {
        p1Box.value = `[Capture Profil LOS non renseignée]`;
        p1Box.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
      }
      addImageSafe(profilsWorksheet, vav.imageProfilUrl, { row: contentStart, col: 4 }, { row: contentEnd, col: 7 });

      // Col 2 Photo Box: Fusion K10:N28
      applyMergedBoxStyle(profilsWorksheet, contentStart, 11, contentEnd, 14, 'FFFFFF');
      const p2Box = profilsWorksheet.getCell(`K${contentStart}`);
      p2Box.alignment = { horizontal: 'center', vertical: 'middle' };
      if (!vav.imageGoogleMapsUrl) {
        p2Box.value = `[Capture Google Earth / Obstacle non renseignée]`;
        p2Box.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
      }
      addImageSafe(profilsWorksheet, vav.imageGoogleMapsUrl, { row: contentStart, col: 11 }, { row: contentEnd, col: 14 });

      // Col 3 Content: Vertical merge Q10:Q28 for Code site client
      profilsWorksheet.mergeCells(`Q${contentStart}:Q${contentEnd}`);
      const qValCell = profilsWorksheet.getCell(`Q${contentStart}`);
      qValCell.value = codeSiteDistant;
      qValCell.font = { name: 'Arial', size: 9, bold: true };
      qValCell.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let r = contentStart; r <= contentEnd; r++) {
        profilsWorksheet.getCell(`Q${r}`).border = FULL_BORDER;
      }

      // Populate 19 rows for Direction (Col R) and Taille antenne (Col S)
      const pcLines = (vav.planCapilaire && vav.planCapilaire.length > 0)
        ? vav.planCapilaire
        : [{ codeSite: codeSiteDistant, direction: '-', tailleAntenne: '-' }];

      for (let r = contentStart; r <= contentEnd; r++) {
        profilsWorksheet.getRow(r).height = 18;
        const i = r - contentStart;
        const item = pcLines[i];

        const rCell = profilsWorksheet.getCell(`R${r}`);
        rCell.value = item ? (item.direction || '-') : '';
        rCell.font = { name: 'Arial', size: 9 };
        rCell.alignment = { horizontal: 'center', vertical: 'middle' };
        rCell.border = FULL_BORDER;

        const sCell = profilsWorksheet.getCell(`S${r}`);
        sCell.value = item ? (item.tailleAntenne || '-') : '';
        sCell.font = { name: 'Arial', size: 9 };
        sCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sCell.border = FULL_BORDER;
      }

      // Fine bande jaune séparatrice sur A34:C34 (subHeaderRow + 27)
      const yellowRow = subHeaderRow + 27;
      profilsWorksheet.getRow(yellowRow).height = 16;
      profilsWorksheet.mergeCells(`A${yellowRow}:C${yellowRow}`);
      const yellowCell = profilsWorksheet.getCell(`A${yellowRow}`);
      yellowCell.value = ''; // Aucun texte
      yellowCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
      for (let c = 1; c <= 3; c++) {
        profilsWorksheet.getCell(yellowRow, c).border = FULL_BORDER;
      }
    });

    // --- SHEET 3: PHOTOS ---
    const photosWorksheet = workbook.addWorksheet('PHOTOS');
    for (let c = 1; c <= 20; c++) {
      if (c === 1 || c === 5 || c === 9 || c === 13 || c === 17) {
        photosWorksheet.getColumn(c).width = 3;  // Separators
      } else {
        photosWorksheet.getColumn(c).width = 11;
      }
    }

    // Logo image area top-left (B2:C4)
    photosWorksheet.mergeCells('B2:C4');
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 3; c++) {
        photosWorksheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
      }
    }
    photosWorksheet.getCell('B2').value = '';
    if (logoPngBase64) {
      addLogoSafe(photosWorksheet, logoPngBase64);
    }

    // Grand bandeau rouge PHOTOS LOS (B5 à P6) - Commençant à la Ligne 5
    photosWorksheet.mergeCells('B5:P6');
    for (let r = 5; r <= 6; r++) {
      for (let c = 2; c <= 16; c++) {
        const cell = photosWorksheet.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
        cell.border = FULL_BORDER;
      }
    }
    const photosHeaderCell = photosWorksheet.getCell('B5');
    photosHeaderCell.value = 'PHOTOS LOS';
    photosHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
    photosHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // SECTION 1: Local-Distant (Bandeau rouge en G9)
    photosWorksheet.mergeCells('G9:K9');
    const sec1Header = photosWorksheet.getCell('G9');
    sec1Header.value = 'Local-Distant';
    sec1Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    sec1Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
    sec1Header.alignment = { horizontal: 'center', vertical: 'middle' };
    sec1Header.border = FULL_BORDER;
    photosWorksheet.getRow(9).height = 20;

    const sec1Captions = [
      "PHOTO Zoom *1 vers site vi-à-vis",
      "PHOTO Zoom *2 vers site vi-à-vis",
      "PHOTO Zoom *3 vers site vi-à-vis",
      "PHOTO Zoom *4 vers site vi-à-vis"
    ];
    const photoCols = [2, 6, 10, 14]; // Cols B, F, J, N
    const sec1Photos = (reportData.photosStructured as any)?.zoomVisAVis || [];

    photoCols.forEach((colStart, i) => {
      const colEnd = colStart + 2; // B..D, F..H, J..L, N..P
      const captionText = sec1Photos[i]?.caption || sec1Captions[i];

      photosWorksheet.mergeCells(12, colStart, 12, colEnd);
      const capCell = photosWorksheet.getCell(12, colStart);
      capCell.value = captionText;
      capCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      capCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      capCell.alignment = { horizontal: 'center', vertical: 'middle' };
      capCell.border = FULL_BORDER;

      applyMergedBoxStyle(photosWorksheet, 13, colStart, 29, colEnd, 'FFFFFF');
      if (sec1Photos[i]?.url) {
        addImageSafe(photosWorksheet, sec1Photos[i].url, { row: 13, col: colStart }, { row: 29, col: colEnd });
      } else {
        const boxCell = photosWorksheet.getCell(13, colStart);
        boxCell.value = '[Photo non renseignée]';
        boxCell.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
        boxCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // SECTION 2: Distant-Local [CODE_SITE] (Bandeau rouge en G37)
    const distantCode = reportData.visAVis?.[0]?.codeSite || reportData.donneesLOS?.sitesDistants?.[0]?.codeSiteDistant || studyId || '';
    photosWorksheet.mergeCells('G37:K37');
    const sec2Header = photosWorksheet.getCell('G37');
    sec2Header.value = distantCode ? `Distant-Local ${distantCode}` : 'Distant-Local';
    sec2Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    sec2Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
    sec2Header.alignment = { horizontal: 'center', vertical: 'middle' };
    sec2Header.border = FULL_BORDER;
    photosWorksheet.getRow(37).height = 20;

    const sec2Captions = [
      "PHOTO Zoom *1 vers site local",
      "PHOTO Zoom *2 vers site local",
      "PHOTO Zoom *3 vers site local",
      "PHOTO Zoom *4 vers site local"
    ];
    const sec2Photos = (reportData.photosStructured as any)?.vuesGenerales || [];

    photoCols.forEach((colStart, i) => {
      const colEnd = colStart + 2;
      const captionText = sec2Photos[i]?.caption || sec2Captions[i];

      photosWorksheet.mergeCells(40, colStart, 40, colEnd);
      const capCell = photosWorksheet.getCell(40, colStart);
      capCell.value = captionText;
      capCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      capCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      capCell.alignment = { horizontal: 'center', vertical: 'middle' };
      capCell.border = FULL_BORDER;

      applyMergedBoxStyle(photosWorksheet, 41, colStart, 57, colEnd, 'FFFFFF');
      if (sec2Photos[i]?.url) {
        addImageSafe(photosWorksheet, sec2Photos[i].url, { row: 41, col: colStart }, { row: 57, col: colEnd });
      } else {
        const boxCell = photosWorksheet.getCell(41, colStart);
        boxCell.value = '[Photo non renseignée]';
        boxCell.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
        boxCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // SECTION 3: STRUCTURE [CODE_SITE] (Bandeau rouge en G66)
    const localCode = reportData.donneesLOS?.header?.codeSite || studyId || '';
    photosWorksheet.mergeCells('G66:K66');
    const sec3Header = photosWorksheet.getCell('G66');
    sec3Header.value = localCode ? `STRUCTURE ${localCode}` : 'STRUCTURE';
    sec3Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    sec3Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
    sec3Header.alignment = { horizontal: 'center', vertical: 'middle' };
    sec3Header.border = FULL_BORDER;
    photosWorksheet.getRow(66).height = 20;

    const sec3Captions = [
      "PHOTO Structure 1",
      "PHOTO Structure 2",
      "PHOTO Structure 3",
      "PHOTO Structure 4"
    ];
    const sec3Photos = (reportData.photosStructured as any)?.structures || [];

    photoCols.forEach((colStart, i) => {
      const colEnd = colStart + 2;
      const captionText = sec3Photos[i]?.caption || sec3Captions[i];

      photosWorksheet.mergeCells(69, colStart, 69, colEnd);
      const capCell = photosWorksheet.getCell(69, colStart);
      capCell.value = captionText;
      capCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
      capCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      capCell.alignment = { horizontal: 'center', vertical: 'middle' };
      capCell.border = FULL_BORDER;

      applyMergedBoxStyle(photosWorksheet, 70, colStart, 86, colEnd, 'FFFFFF');
      if (sec3Photos[i]?.url) {
        addImageSafe(photosWorksheet, sec3Photos[i].url, { row: 70, col: colStart }, { row: 86, col: colEnd });
      } else {
        const boxCell = photosWorksheet.getCell(70, colStart);
        boxCell.value = '[Photo non renseignée]';
        boxCell.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
        boxCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Bloc Structure Secondaire en G93 (si photos de structure supplémentaires)
    if (sec3Photos.length > 4) {
      photosWorksheet.mergeCells('G93:K93');
      const sec4Header = photosWorksheet.getCell('G93');
      sec4Header.value = distantCode ? `STRUCTURE ${distantCode}` : 'STRUCTURE';
      sec4Header.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
      sec4Header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      sec4Header.alignment = { horizontal: 'center', vertical: 'middle' };
      sec4Header.border = FULL_BORDER;
      photosWorksheet.getRow(93).height = 20;

      photoCols.forEach((colStart, i) => {
        const pIdx = i + 4;
        const colEnd = colStart + 2;
        const captionText = sec3Photos[pIdx]?.caption || `PHOTO Structure ${pIdx + 1}`;

        photosWorksheet.mergeCells(96, colStart, 96, colEnd);
        const capCell = photosWorksheet.getCell(96, colStart);
        capCell.value = captionText;
        capCell.font = { name: 'Arial', size: 8, bold: true, color: { argb: WHITE } };
        capCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
        capCell.alignment = { horizontal: 'center', vertical: 'middle' };
        capCell.border = FULL_BORDER;

        applyMergedBoxStyle(photosWorksheet, 97, colStart, 113, colEnd, 'FFFFFF');
        if (sec3Photos[pIdx]?.url) {
          addImageSafe(photosWorksheet, sec3Photos[pIdx].url, { row: 97, col: colStart }, { row: 113, col: colEnd });
        } else {
          const boxCell = photosWorksheet.getCell(97, colStart);
          boxCell.value = '[Photo non renseignée]';
          boxCell.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
          boxCell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // --- SHEET 4: PANORAMIQUES ---
    if (reportData.panoramiques.length > 0) {
      const panoWorksheet = workbook.addWorksheet('PANORAMIQUES');
      panoWorksheet.columns = Array(12).fill({ width: 15 });
      addSheetHeader(panoWorksheet, 'PHOTOS PANORAMIQUES', 12);

      let panoOffset = 8;
      reportData.panoramiques.forEach((pano, idx) => {
        panoWorksheet.mergeCells(panoOffset, 1, panoOffset, 12);
        const h = panoWorksheet.getCell(panoOffset, 1);
        h.value = pano.caption;
        h.font = { bold: true, color: { argb: WHITE } };
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
        h.alignment = { horizontal: 'center' };
        h.border = FULL_BORDER;
        panoOffset++;

        const frameRange = `A${panoOffset}:L${panoOffset + 15}`;
        panoWorksheet.mergeCells(frameRange);
        const cell = panoWorksheet.getCell(`A${panoOffset}`);
        cell.border = FULL_BORDER;
        
        if (pano.url) {
          addImageSafe(panoWorksheet, pano.url, { row: panoOffset, col: 1 }, { row: panoOffset + 15, col: 12 });
        } else {
          cell.value = `[ EMPLACEMENT ${pano.caption} ]`;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { italic: true, color: { argb: '94A3B8' } };
        }

        panoOffset += 17;
      });
    }

    // --- SHEET 5: TRAVAUX GC ---
    const gcWorksheet = workbook.addWorksheet('TRAVAUX GC');
    for (let c = 1; c <= 20; c++) {
      if (c === 1 || c === 3 || c === 9 || c === 10 || c === 12 || c === 18) {
        gcWorksheet.getColumn(c).width = 3;  // Separators
      } else {
        gcWorksheet.getColumn(c).width = 11;
      }
    }

    // Logo image area top-left (B2:C4)
    gcWorksheet.mergeCells('B2:C4');
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 3; c++) {
        gcWorksheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
      }
    }
    gcWorksheet.getCell('B2').value = '';
    if (logoPngBase64) {
      addLogoSafe(gcWorksheet, logoPngBase64);
    }

    // Grand bandeau rouge DONNÉES TRAVAUX GC (B5 à P6) - Commençant à la Ligne 5
    gcWorksheet.mergeCells('B5:P6');
    for (let r = 5; r <= 6; r++) {
      for (let c = 2; c <= 16; c++) {
        const cell = gcWorksheet.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
        cell.border = FULL_BORDER;
      }
    }
    const gcHeaderCell = gcWorksheet.getCell('B5');
    gcHeaderCell.value = 'DONNÉES TRAVAUX GC';
    gcHeaderCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: WHITE } };
    gcHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };

    let gR = 9;
    const addGCBlock = (row: number, col: number, p: {url: string, caption: string}) => {
      gcWorksheet.mergeCells(row, col, row, col + 3);
      const h = gcWorksheet.getCell(row, col);
      h.value = p.caption;
      h.font = { bold: true, color: { argb: WHITE }, size: 8 };
      h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OOREDOO_RED } };
      h.alignment = { horizontal: 'center', vertical: 'middle' };
      h.border = FULL_BORDER;

      applyMergedBoxStyle(gcWorksheet, row + 1, col, row + 10, col + 3, 'FFFFFF');
      if (p.url) addImageSafe(gcWorksheet, p.url, { row: row + 1, col: col }, { row: row + 10, col: col + 3 });
    };

    const gPs = reportData.travauxGC.photos || [];
    for (let i = 0; i < 4; i++) addGCBlock(gR, (i * 4) + 1, gPs[i] || {url: '', caption: ''});
    gR += 12;
    for (let i = 0; i < 4; i++) addGCBlock(gR, (i * 4) + 1, gPs[i + 4] || {url: '', caption: ''});
    gR += 11;

    gcWorksheet.mergeCells(gR, 1, gR, 16);
    const a2 = gcWorksheet.getCell(gR, 1);
    a2.value = reportData.travauxGC.annotationEchelle;
    a2.font = { italic: true, bold: true };
    a2.border = FULL_BORDER;
    gR += 2;

    gcWorksheet.mergeCells(gR, 1, gR + 1, 16);
    const rY = gcWorksheet.getCell(gR, 1);
    rY.value = reportData.travauxGC.annotationPassageCable;
    rY.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    rY.border = FULL_BORDER;
    rY.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    gR += 3;

    for (let i = 0; i < 4; i++) addGCBlock(gR, (i * 4) + 1, gPs[i + 8] || {url: '', caption: ''});

    // 1. SECTION DESCRIPTION TECHNIQUE (AU-DESSUS)
    // Bandeau rouge "DESCRIPTION TECHNIQUE" fusionné G94:K95
    gcWorksheet.mergeCells('G94:K95');
    for (let r = 94; r <= 95; r++) {
      for (let c = 7; c <= 11; c++) {
        const cell = gcWorksheet.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
        cell.border = FULL_BORDER;
      }
    }
    const dtHeader = gcWorksheet.getCell('G94');
    dtHeader.value = 'DESCRIPTION TECHNIQUE';
    dtHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    dtHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    gcWorksheet.getRow(94).height = 18;
    gcWorksheet.getRow(95).height = 18;

    // Row 96 is blank space
    gcWorksheet.getRow(96).height = 10;

    // Cadre/Zone de texte D97:N127
    applyMergedBoxStyle(gcWorksheet, 97, 4, 127, 14, 'FFFFFF');
    const dtValCell = gcWorksheet.getCell(97, 4);
    dtValCell.value = reportData.travauxGC.descriptionTechnique || '';
    dtValCell.font = { name: 'Arial', size: 9 };
    dtValCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    for (let r = 97; r <= 127; r++) {
      gcWorksheet.getRow(r).height = 16;
    }

    // 2. SECTION PLANS (EN-DESSOUS)
    // Ligne 128: Bandeaux de titre
    gcWorksheet.getRow(128).height = 20;

    // Sous-en-tête "PLAN" D128:F128
    gcWorksheet.mergeCells('D128:F128');
    for (let c = 4; c <= 6; c++) {
      const cell = gcWorksheet.getCell(128, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cell.border = FULL_BORDER;
    }
    const pSub1 = gcWorksheet.getCell('D128');
    pSub1.value = 'PLAN';
    pSub1.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    pSub1.alignment = { horizontal: 'center', vertical: 'middle' };

    // Grand bandeau "PLANS" G128:K128
    gcWorksheet.mergeCells('G128:K128');
    for (let c = 7; c <= 11; c++) {
      const cell = gcWorksheet.getCell(128, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cell.border = FULL_BORDER;
    }
    const pBanner = gcWorksheet.getCell('G128');
    pBanner.value = 'PLANS';
    pBanner.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    pBanner.alignment = { horizontal: 'center', vertical: 'middle' };

    // Sous-en-tête "PLAN GC" M128:O128
    gcWorksheet.mergeCells('M128:O128');
    for (let c = 13; c <= 15; c++) {
      const cell = gcWorksheet.getCell(128, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
      cell.border = FULL_BORDER;
    }
    const pSub2 = gcWorksheet.getCell('M128');
    pSub2.value = 'PLAN GC';
    pSub2.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
    pSub2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Ligne 129 (Espace)
    gcWorksheet.getRow(129).height = 10;

    // Cadres de plans fusionnés B130:H159 et K130:Q159
    for (let r = 130; r <= 159; r++) {
      gcWorksheet.getRow(r).height = 18;
    }

    // Frame PLAN B130:H159
    applyMergedBoxStyle(gcWorksheet, 130, 2, 159, 8, 'FFFFFF');
    if (reportData.travauxGC.plans?.plan) {
      addImageSafe(gcWorksheet, reportData.travauxGC.plans.plan, { row: 130, col: 2 }, { row: 159, col: 8 });
    } else {
      const cellP1 = gcWorksheet.getCell(130, 2);
      cellP1.value = '[PLAN non renseigné]';
      cellP1.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
      cellP1.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Frame PLAN GC K130:Q159
    applyMergedBoxStyle(gcWorksheet, 130, 11, 159, 17, 'FFFFFF');
    if (reportData.travauxGC.plans?.planGC) {
      addImageSafe(gcWorksheet, reportData.travauxGC.plans.planGC, { row: 130, col: 11 }, { row: 159, col: 17 });
    } else {
      const cellP2 = gcWorksheet.getCell(130, 11);
      cellP2.value = '[PLAN GC non renseigné]';
      cellP2.font = { italic: true, color: { argb: '94A3B8' }, size: 9 };
      cellP2.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `LOS_Survey_${studyId}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error("Export failed", error);
  }
};
