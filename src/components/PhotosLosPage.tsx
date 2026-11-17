import React, { forwardRef } from 'react';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

interface PhotosLosPageProps {
  report: RfiReport;
  studyId?: string;
}

export const PhotosLosPage = forwardRef<HTMLDivElement, PhotosLosPageProps>(({ report, studyId }, ref) => {
  const { donneesLOS, photosStructured } = report;
  const codeSite = donneesLOS?.header?.codeSite || studyId || 'TUN_B956';
  const nomSite = donneesLOS?.header?.nomSite || 'Site FH';
  const dateLOS = donneesLOS?.header?.dateLOS || new Date().toLocaleDateString('fr-FR');

  const zoomVisAVis = photosStructured?.zoomVisAVis || [];
  const vuesGenerales = photosStructured?.vuesGenerales || [];
  const structures = photosStructured?.structures || [];

  return (
    <div 
      ref={ref}
      id="ooredoo-photos-los-page"
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
          <h1 className="text-base font-black uppercase tracking-wider">PAGE 3 : PHOTOS LOS</h1>
          <p className="text-[11px] font-bold text-white/90 uppercase tracking-widest mt-0.5">
            Galerie Technique, Vues d'Équipements & Structures
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

      {/* --- SECTION 1 : PHOTOS ZOOM VIS-À-VIS --- */}
      <div className="mb-6">
        <div className="bg-[#E2001A] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider border border-black mb-3 flex items-center justify-between">
          <span>1. Photos Zoom vers Site(s) Vis-à-vis</span>
          <span className="text-[10px] font-normal opacity-90">Cadres 1 à 4</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {zoomVisAVis.map((photo, idx) => (
            <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
              <div className="bg-slate-800 text-white text-[11px] font-bold text-center py-1 px-2 border-b border-slate-300 truncate">
                {photo.caption || `Zoom *${idx + 1} vers site vis-à-vis`}
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
                    <span>📷 [Capture Zoom {idx + 1} manquante]</span>
                  </div>
                )}
              </div>
              <div className="bg-[#FFFF00] text-black text-[10px] font-bold p-1 border-t border-black text-center truncate">
                {photo.caption || `Zoom vis-à-vis #${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECTION 2 : VUES GÉNÉRALES & ÉQUIPEMENTS --- */}
      <div className="mb-6">
        <div className="bg-[#E2001A] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider border border-black mb-3 flex items-center justify-between">
          <span>2. Vues Générales, Énergie & Équipements</span>
          <span className="text-[10px] font-normal opacity-90">Cadres 5 à 8</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {vuesGenerales.map((photo, idx) => (
            <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
              <div className="bg-slate-800 text-white text-[11px] font-bold text-center py-1 px-2 border-b border-slate-300 truncate">
                {photo.caption || `Vue Générale ${idx + 1}`}
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
                    <span>📷 [Vue Générale {idx + 1} manquante]</span>
                  </div>
                )}
              </div>
              <div className="bg-[#FFFF00] text-black text-[10px] font-bold p-1 border-t border-black text-center truncate">
                {photo.caption || `Équipement #${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECTION 3 : PHOTOS STRUCTURES --- */}
      <div>
        <div className="bg-[#E2001A] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider border border-black mb-3 flex items-center justify-between">
          <span>3. Photos des Structures & Supports</span>
          <span className="text-[10px] font-normal opacity-90">Cadres 9 à 12</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {structures.map((photo, idx) => (
            <div key={idx} className="border border-slate-300 bg-slate-50 flex flex-col">
              <div className="bg-slate-800 text-white text-[11px] font-bold text-center py-1 px-2 border-b border-slate-300 truncate">
                {photo.caption || `Structure ${idx + 1}`}
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
                    <span>📷 [Photo Structure {idx + 1} manquante]</span>
                  </div>
                )}
              </div>
              <div className="bg-[#FFFF00] text-black text-[10px] font-bold p-1 border-t border-black text-center truncate">
                {photo.caption || `Support Structure #${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

PhotosLosPage.displayName = 'PhotosLosPage';
