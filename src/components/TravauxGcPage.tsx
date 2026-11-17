import React, { forwardRef } from 'react';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

interface TravauxGcPageProps {
  report: RfiReport;
  studyId?: string;
}

export const TravauxGcPage = forwardRef<HTMLDivElement, TravauxGcPageProps>(({ report, studyId }, ref) => {
  const { donneesLOS, travauxGC } = report;
  const codeSite = donneesLOS?.header?.codeSite || studyId || 'TUN_B956';
  const nomSite = donneesLOS?.header?.nomSite || 'Site FH';
  const dateLOS = donneesLOS?.header?.dateLOS || new Date().toLocaleDateString('fr-FR');

  const photosRow1 = travauxGC?.photos?.slice(0, 4) || [];
  const photosRow2 = travauxGC?.photos?.slice(4, 8) || [];

  return (
    <div 
      ref={ref}
      id="ooredoo-travaux-gc-page"
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
          <h1 className="text-base font-black uppercase tracking-wider">PAGE 5 : TRAVAUX GC</h1>
          <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest mt-0.5">
            Génie Civil, Emplacement Mât, Cheminement Câbles & Descriptif
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

      {/* --- SECTION 1 : RANGÉE 1 (PHOTOS SITE CLIENT & EMPLACEMENT MÂT) --- */}
      <div className="mb-6">
        <div className="bg-[#E2001A] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider border border-black mb-3 flex items-center justify-between">
          <span>1. Photos Site Client & Emplacement Support / Mât</span>
          <span className="text-[10px] font-normal opacity-90">Cadres 1 à 4</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {photosRow1.map((photo, idx) => (
            <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
              <div className="bg-slate-800 text-white text-[11px] font-bold text-center py-1 px-2 border-b border-slate-300 truncate">
                {photo.caption || `Vue Client ${idx + 1}`}
              </div>
              <div className="h-44 bg-white flex items-center justify-center overflow-hidden relative">
                {photo.url ? (
                  <img 
                    src={photo.url} 
                    alt={photo.caption} 
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-slate-400 text-xs italic flex flex-col items-center justify-center p-2 text-center">
                    <span>📷 [Capture Site Client {idx + 1} manquante]</span>
                  </div>
                )}
              </div>
              <div className="bg-[#FFFF00] text-black text-[10px] font-bold p-1 border-t border-black text-center truncate">
                {photo.caption || `Détail Mât #${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECTION 2 : RANGÉE 2 (ACHEMINEMENT CÂBLE POE & TERRASSE) --- */}
      <div className="mb-6">
        <div className="bg-[#E2001A] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider border border-black mb-3 flex items-center justify-between">
          <span>2. Acheminement Câble POE & Traversée Terrasse</span>
          <span className="text-[10px] font-normal opacity-90">Cadres 5 à 8</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {photosRow2.map((photo, idx) => (
            <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
              <div className="bg-slate-800 text-white text-[11px] font-bold text-center py-1 px-2 border-b border-slate-300 truncate">
                {photo.caption || `Cheminement ${idx + 1}`}
              </div>
              <div className="h-44 bg-white flex items-center justify-center overflow-hidden relative">
                {photo.url ? (
                  <img 
                    src={photo.url} 
                    alt={photo.caption} 
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-slate-400 text-xs italic flex flex-col items-center justify-center p-2 text-center">
                    <span>📷 [Capture Cheminement {idx + 1} manquante]</span>
                  </div>
                )}
              </div>
              <div className="bg-[#FFFF00] text-black text-[10px] font-bold p-1 border-t border-black text-center truncate">
                {photo.caption || `Passage Câble #${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECTION 3 : DESCRIPTIF TECHNIQUE & SPÉCIFICATIONS GC --- */}
      <div className="border border-black bg-slate-50 p-4">
        <div className="bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-wider mb-3">
          Spécifications Techniques & Notes Génie Civil
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
          <div className="bg-white p-3 border border-slate-300 rounded space-y-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Descriptif Technique Général :</span>
              <p className="text-slate-900 font-semibold mt-0.5">
                {travauxGC?.descriptionTechnique || "Installation mât autoportant / haubané avec fixation sur acrotère ou dalle béton. Passage de câble sous gaine ICTA/goulotte protégée."}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Annotation Échelle :</span>
              <p className="text-slate-800 font-medium">
                {travauxGC?.annotationEchelle || "Accès échelle crinoline avec ligne de vie réglementaire."}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 border border-slate-300 rounded space-y-2">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Annotation Passage Câble POE :</span>
              <p className="text-slate-800 font-medium">
                {travauxGC?.annotationPassageCable || "Cheminement câble POE extérieur blindé résistant aux UV avec étanchéité presse-étoupe."}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Remarques & Préconisations :</span>
              <p className="text-slate-800 font-medium">
                {travauxGC?.remarques || "Structure saine, aucun renfort maçonnerie préalable requis."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TravauxGcPage.displayName = 'TravauxGcPage';
