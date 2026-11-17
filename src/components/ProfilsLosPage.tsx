import React, { forwardRef } from 'react';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';
import { ProfilBlock } from './ProfilBlock';

interface ProfilsLosPageProps {
  report: RfiReport;
  studyId?: string;
}

export const ProfilsLosPage = forwardRef<HTMLDivElement, ProfilsLosPageProps>(({ report, studyId }, ref) => {
  const { donneesLOS, visAVis = [] } = report;
  const codeSiteLocal = donneesLOS?.header?.codeSite || studyId || 'TUN_B956';
  const nomSite = donneesLOS?.header?.nomSite || 'Site FH';
  const dateLOS = donneesLOS?.header?.dateLOS || new Date().toLocaleDateString('fr-FR');

  // If no visAVis exists yet, build from sitesDistants or provide a fallback
  const sitesList = visAVis.length > 0 ? visAVis : (
    (donneesLOS?.sitesDistants || []).map((sd, i) => ({
      id: sd.id || `vav_${i}`,
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
    }))
  );

  return (
    <div 
      ref={ref}
      id="ooredoo-profils-los-page"
      className="bg-white text-black p-6 font-sans antialiased border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-2 mx-auto"
      style={{ width: '100%', maxWidth: '1400px', minWidth: '1100px' }}
    >
      {/* --- EN-TÊTE SUPERIEUR OFFICIEL OOREDOO BUSINESS --- */}
      <div className="flex items-center gap-6 mb-6">
        {/* Logo Ooredoo Business */}
        <div className="flex items-center shrink-0">
          <img 
            src={OOREDOO_BUSINESS_LOGO} 
            alt="Ooredoo Business" 
            style={{ height: '45px', width: 'auto' }}
            className="object-contain max-h-[45px]"
            crossOrigin="anonymous"
          />
        </div>

        {/* Grand Titre Principal Bandeau Rouge sur toute la largeur */}
        <div className="flex-1 bg-[#E2001A] text-white text-center py-2.5 px-8 rounded-none border border-black shadow-xs">
          <h1 className="text-base font-black uppercase tracking-wider">PROFILS LOS</h1>
        </div>
      </div>

      {/* --- LISTE DYNAMIQUE DES PROFILS / SITES DISTANTS (EMPILEMENT VERTICAL) --- */}
      <div className="space-y-8">
        {sitesList.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold">
            Aucun site distant ou vis-à-vis configuré pour cette étude.
          </div>
        ) : (
          sitesList.map((vav, idx) => (
            <React.Fragment key={vav.id || idx}>
              <ProfilBlock
                index={idx}
                data={vav}
                isEditable={false}
              />
              {/* Séparation par ligne pointillée entre les blocs empilés */}
              {idx < sitesList.length - 1 && (
                <div className="my-6 border-b-2 border-dashed border-slate-400 print:break-before-page"></div>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Pied de page Onglet 2 */}
      <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 bg-[#E2001A] text-white font-bold rounded-xs">PROFILS LOS</span>
          <span>Page 2 / Rapport Fiche LOS Survey Ooredoo Business</span>
        </div>
        <div>
          Généré le {new Date().toLocaleDateString('fr-FR')} • Système RFI Survey FH
        </div>
      </div>
    </div>
  );
});

ProfilsLosPage.displayName = 'ProfilsLosPage';
