import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { RfiReport } from '../types';

/**
 * Generate a high quality multi-page / single-page PDF report for Ooredoo Business
 */
export async function generatePdfFromElement(element: HTMLElement, fileName: string = 'Rapport_LOS_Ooredoo.pdf') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (300 DPI equivalent)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Fit canvas aspect ratio to A4 landscape
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, (pdfHeight - imgHeight) / 2, imgWidth, imgHeight);
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}
