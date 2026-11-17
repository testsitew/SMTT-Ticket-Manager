import React, { forwardRef } from 'react';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

interface PanoramiquesLosPageProps {
  report: RfiReport;
  studyId?: string;
}

export const PanoramiquesLosPage = forwardRef<HTMLDivElement, PanoramiquesLosPageProps>(({ report, studyId }, ref) => {
  const { donneesLOS, panoramiques = [] } = report;
  const codeSite = donneesLOS?.header?.codeSite || studyId || 'TUN_B956';
  const nomSite = donneesLOS?.header?.nomSite || 'Site FH';
  const dateLOS = donneesLOS?.header?.dateLOS || new Date().toLocaleDateString('fr-FR');

  // 12 panoramics at 30° intervals
  const panosList = Array.from({ length: 12 }).map((_, idx) => {
    const azimuth = idx * 30;
    const defaultLabel = `PHOTO PANORAMIQUE AZ. ${azimuth}°`;
    const item = panoramiques[idx];
    return {
      azimuth,
      label: item?.caption || defaultLabel,
      url: item?.url || ''
    };
  });

  return (
    <div 
      ref={ref}
      id="ooredoo-panoramiques-los-page"
      className="bg-white text-black p-6 font-sans antialiased border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-2 mx-auto"
      style={{ width: '100%', maxWidth: '1400px', minWidth: '1100px' }}
    >
      {/* --- EN-TÊTE SUPERIEUR OFFICIEL OOREDOO BUSINESS --- */}
      <div className="flex items-center justify-between gap-6 mb-4 pb-3 border-b-2 border-[#E2001A]">
        {/* Logo Ooredoo Business */}
        <div className="flex items-center">
          <img 
            src={OOREDOO_BUSINESS_LOGO} 
            alt="Ooredoo Business" 
            style={{ height: '45px', width: 'auto' }}
            className="object-contain max-h-[45px]"
            crossOrigin="anonymous"
          />
        </div>

        {/* Titre Principal Bandeau Rouge */}
        <div className="flex-1 max-w-2xl bg-[#E2001A] text-white text-center py-2 px-8 rounded-none border border-black shadow-xs">
          <h1 className="text-base font-black uppercase tracking-wider">PAGE 4 : PHOTOS PANORAMIQUES</h1>
          <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest mt-0.5">
            Tour d'Horizon 360° (Incrémentation de 30° — Azimut 0° à 330°)
          </p>
        </div>

        {/* Bloc Informations Site / Date */}
        <div className="text-right text-xs">
          <div className="font-mono font-black text-slate-900 bg-slate-100 px-3 py-1 border border-slate-300 inline-block mb-1">
            {codeSite} — {nomSite}
          </div>
          <div className="text-[11px] text-slate-600 font-semibold">
            Date : {dateLOS}
          </div>
        </div>
      </div>

      {/* --- GRILLE DES 12 PANORAMIQUES 360° (2 Colonnes x 6 Lignes) --- */}
      <div className="grid grid-cols-2 gap-4">
        {panosList.map((item, idx) => (
          <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
            <div className="bg-[#E2001A] text-white text-[11px] font-black text-center py-1 px-2 border-b border-black uppercase tracking-wider flex items-center justify-between">
              <span>{item.label}</span>
              <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">AZ. {item.azimuth}°</span>
            </div>
            <div className="h-44 bg-white flex items-center justify-center overflow-hidden relative">
              {item.url ? (
                <img 
                  src={item.url} 
                  alt={item.label} 
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="text-slate-400 text-xs italic flex flex-col items-center justify-center p-2 text-center">
                  <span>📷 [Capture Panoramique Azimut {item.azimuth}° non renseignée]</span>
                </div>
              )}
            </div>
            <div className="bg-[#FFFF00] text-black text-[10px] font-bold py-1 px-3 border-t border-black text-center truncate">
              Vue panoramique dégagée à l'azimut {item.azimuth}° — {codeSite}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PanoramiquesLosPage.displayName = 'PanoramiquesLosPage';
