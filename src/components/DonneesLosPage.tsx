import React, { forwardRef } from 'react';
import { RfiReport } from '../types';
import { OOREDOO_BUSINESS_LOGO } from '../assets/logo';

interface DonneesLosPageProps {
  report: RfiReport;
  studyId?: string;
}

export const DonneesLosPage = forwardRef<HTMLDivElement, DonneesLosPageProps>(({ report, studyId }, ref) => {
  const { donneesLOS } = report;
  const { header, infoSite, coordonnees, sitesDistants, resumeTrans } = donneesLOS;
  const codeSite = header.codeSite || studyId || 'TUN_B956';

  // Build up to 10 rows for RESUME POUR TABLEAU TRANS as in the official Excel model
  const resumeRows = Array.from({ length: Math.max(10, sitesDistants.length) }).map((_, idx) => {
    const rs = sitesDistants[idx];
    if (rs) {
      const localVal = rs.chaineSiteLocal || (idx === 0 ? resumeTrans?.siteLocal : undefined) || (rs.statusLOS === 'Oui' ? 'LOS OK' : 'LOS Non OK');
      const distantVal = rs.chaineSiteDistant || (idx === 0 ? resumeTrans?.siteDistant : undefined) || `H1=${rs.hauteurAntenneLocale || '-'}m / D1=${rs.diametreAntenne || '-'}cm / Az=${rs.azimutLocalDistant || '-'}° / Dist=${rs.longueurBond || '-'}km / ${rs.codeSiteDistant} / H2=${rs.hauteurAntenneDistante || '-'}m / D2=${rs.diametreAntenneDistante || '-'}cm / Freq=${rs.frequence || '-'}GHz`;
      
      return {
        id: rs.id,
        index: idx + 1,
        local: localVal,
        distant: distantVal,
        isNonLos: rs.statusLOS === 'Non'
      };
    } else {
      return {
        id: `empty_${idx}`,
        index: idx + 1,
        local: 'LOS Non OK',
        distant: 'LOS Non OK',
        isNonLos: true
      };
    }
  });

  return (
    <div 
      ref={ref}
      id="ooredoo-donnees-los-page"
      className="bg-white text-black p-6 font-sans antialiased border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-2 mx-auto"
      style={{ width: '100%', maxWidth: '1400px', minWidth: '1100px' }}
    >
      {/* --- EN-TÊTE SUPERIEUR --- */}
      <div className="flex items-center justify-between gap-6 mb-3">
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
        <div className="flex-1 max-w-2xl bg-[#E2001A] text-white text-center py-1.5 px-6 rounded-none border border-black shadow-xs">
          <h1 className="text-sm font-black uppercase tracking-wider">FICHE LOS SURVEY</h1>
        </div>

        <div className="w-24"></div>
      </div>

      {/* --- BLOCS D'INFORMATIONS GÉNÉRAUX EN HAUT --- */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-1 mb-4 text-xs font-semibold">
        {/* Ligne 1 : CODE SITE & NOM SITE */}
        <div className="col-span-2 bg-[#E2001A] text-white font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          CODE SITE
        </div>
        <div className="col-span-3 bg-white text-black font-bold px-3 py-1 border border-black text-center flex items-center justify-center">
          {codeSite}
        </div>

        <div className="col-span-2 bg-[#E2001A] text-white font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          NOM SITE
        </div>
        <div className="col-span-5 bg-white text-black font-bold px-3 py-1 border border-black text-center flex items-center justify-center">
          {header.nomSite || 'Site FH Backup'}
        </div>

        {/* Ligne 2 : DATE LOS & SUPERVISEUR & RESPONSABLE */}
        <div className="col-span-2 bg-[#E2001A] text-white font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          DATE LOS
        </div>
        <div className="col-span-3 bg-white text-black font-bold px-3 py-1 border border-black text-center flex items-center justify-center">
          {header.dateLOS || new Date().toLocaleDateString('fr-FR')}
        </div>

        <div className="col-span-2 bg-[#E2001A] text-white font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          SUPERVISEUR LOS
        </div>
        <div className="col-span-3 bg-white text-black font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          {header.superviseur.nom || 'Montassar'}
        </div>
        <div className="col-span-2 bg-white text-black font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          {header.superviseur.tel || '29394238'}
        </div>

        {/* Ligne 3 : RESPONSABLE SITE */}
        <div className="col-span-5"></div>
        <div className="col-span-2 bg-[#E2001A] text-white font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          RESPONSABLE SITE
        </div>
        <div className="col-span-3 bg-white text-black font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          {header.maintenancier?.nom || ''}
        </div>
        <div className="col-span-2 bg-white text-black font-bold px-2 py-1 border border-black text-center flex items-center justify-center">
          {header.maintenancier?.tel || ''}
        </div>
      </div>

      {/* --- SECTION "INFORMATION SITE" & "COORDONNEES SITE" --- */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* 1. Tableau Gauche : INFORMATION SITE */}
        <div className="col-span-5">
          <div className="bg-[#E2001A] text-white font-bold text-xs py-1 px-2 border border-black text-center uppercase tracking-wide">
            INFORMATION SITE
          </div>
          <table className="w-full border-collapse border border-black text-[11px]">
            <tbody>
              <tr>
                <td className="bg-[#E2001A] text-white font-bold p-1.5 border border-black w-40 text-center">
                  Contact client
                </td>
                <td className="bg-white text-black font-bold p-1.5 border border-black text-center">
                  {infoSite.contactClient || 'Sami ABDENNABI / Hamza'}
                </td>
              </tr>
              <tr>
                <td className="bg-[#E2001A] text-white font-bold p-1.5 border border-black text-center leading-tight uppercase text-[10px]">
                  STRUCTURE A CONSTRUIRE
                </td>
                <td className="bg-white text-black font-bold p-1.5 border border-black text-center">
                  {infoSite.structureAConstruire || 'Mat Drapeau 2,5 m'}
                </td>
              </tr>
              <tr>
                <td className="bg-[#E2001A] text-white font-bold p-1.5 border border-black text-center">
                  Longueur de Câble IF
                </td>
                <td className="bg-white text-black font-bold p-1.5 border border-black text-center">
                  {infoSite.longueurCablePOE || '50 m'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Tableau Droite : COORDONNEES SITE */}
        <div className="col-span-7">
          <div className="bg-[#E2001A] text-white font-bold text-xs py-1 px-2 border border-black text-center uppercase tracking-wide">
            COORDONNEES SITE
          </div>
          <table className="w-full border-collapse border border-black text-[10px] text-center">
            <thead>
              <tr className="bg-[#E2001A] text-white font-bold">
                <th className="border border-black p-1 leading-tight font-bold w-1/5">
                  Latitude DMS WGS84<br />(°,minute,sec)
                </th>
                <th className="border border-black p-1 leading-tight font-bold w-1/5">
                  Longitude DMS WGS84 E<br />(°,minute,sec)
                </th>
                <th className="border border-black p-1 leading-tight font-bold w-1/5">
                  Latitude<br />hhh,dddd (°,dddd)
                </th>
                <th className="border border-black p-1 leading-tight font-bold w-1/5">
                  Longitude<br />hhh,dddd (°,dddd)
                </th>
                <th className="border border-black p-1 leading-tight font-bold w-1/5">
                  Elevation(m)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white text-black font-bold text-[11px]">
                <td className="border border-black p-2">{coordonnees.latitudeDMS || '36°52\'41.76"N'}</td>
                <td className="border border-black p-2">{coordonnees.longitudeDMS || '10°12\'22.17"E'}</td>
                <td className="border border-black p-2">{coordonnees.latitudeDEC || '36.833614'}</td>
                <td className="border border-black p-2">{coordonnees.longitudeDEC || '10.206157'}</td>
                <td className="border border-black p-2">{coordonnees.hauteurBatiment || '4'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- TABLEAU 1 : "INFORMATIONS SITES DISTANTS" --- */}
      <div className="mb-4">
        {/* Bandeau Titre */}
        <div className="bg-[#E2001A] text-white font-bold text-xs py-1 px-3 border border-black text-center uppercase tracking-wide">
          INFORMATIONS SITES DISTANTS
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-[10px] text-center">
            <thead>
              {/* Ligne 1 d'en-tête */}
              <tr className="bg-[#E2001A] text-white font-bold">
                <th rowSpan={2} className="border border-black p-1 w-6">#</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[90px]">Code site distant</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[45px]">LOS</th>
                <th colSpan={4} className="border border-black p-0.5">Coordonnées site distant</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[50px]">Elevation<br />(m)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[65px]">Hauteur antenne locale (m)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[65px]">Hauteur antenne distante(m)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[60px]">Azimut (°)<br />Local-distant</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[60px]">Azimut (°)<br />Distant-Local</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[55px]">Longueur bond (km)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[65px]">Diamètre antenne locale(cm)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[65px]">Diamètre antenne distante(cm)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[55px]">Fréquence (GHz)</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[55px]">Longueur de Câble IF</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[50px]">Ajout Support MW</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[50px]">Ajout départ énergie</th>
                <th rowSpan={2} className="border border-black p-1 min-w-[120px]">Commentaire</th>
              </tr>
              {/* Ligne 2 sous-en-têtes coordonnées */}
              <tr className="bg-[#E2001A] text-white font-bold text-[9px]">
                <th className="border border-black p-1 min-w-[80px]">Latitude DMS</th>
                <th className="border border-black p-1 min-w-[80px]">Longitude DMS</th>
                <th className="border border-black p-1 min-w-[65px]">Latitude DEC</th>
                <th className="border border-black p-1 min-w-[65px]">Longitude DEC</th>
              </tr>
            </thead>
            <tbody>
              {sitesDistants.length === 0 ? (
                <tr>
                  <td colSpan={20} className="border border-black p-3 text-center text-slate-500 italic">
                    Aucun site distant renseigné.
                  </td>
                </tr>
              ) : (
                sitesDistants.map((rs, idx) => {
                  const isNonLos = rs.statusLOS === 'Non';

                  return (
                    <tr key={rs.id} className="bg-white text-black font-semibold hover:bg-slate-50">
                      <td className="border border-black p-1 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 font-bold">{rs.codeSiteDistant || '-'}</td>
                      <td className={`border border-black p-1 font-bold ${isNonLos ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isNonLos ? 'NON' : 'OUI'}
                      </td>
                      <td className="border border-black p-1 font-mono text-[9px]">{rs.gpsDMS.lat || '-'}</td>
                      <td className="border border-black p-1 font-mono text-[9px]">{rs.gpsDMS.long || '-'}</td>
                      <td className="border border-black p-1 font-mono text-[9px]">{rs.gpsDEC.lat || '-'}</td>
                      <td className="border border-black p-1 font-mono text-[9px]">{rs.gpsDEC.long || '-'}</td>
                      <td className="border border-black p-1">{rs.gpsDMS.elev || '-'}</td>
                      <td className="border border-black p-1">{rs.hauteurAntenneLocale || '-'}</td>
                      <td className="border border-black p-1">{rs.hauteurAntenneDistante || '-'}</td>
                      <td className="border border-black p-1">{rs.azimutLocalDistant || '-'}</td>
                      <td className="border border-black p-1">{rs.azimutDistantLocal || '-'}</td>
                      <td className="border border-black p-1">{rs.longueurBond || '-'}</td>
                      <td className="border border-black p-1">{rs.diametreAntenne || '-'}</td>
                      <td className="border border-black p-1">{rs.diametreAntenneDistante || '-'}</td>
                      <td className="border border-black p-1">{rs.frequence || '-'}</td>
                      <td className="border border-black p-1">{rs.longueurCableIF || rs.longueurCablePOE || '-'}</td>
                      <td className="border border-black p-1">{rs.ajoutSupportMW || 'Non'}</td>
                      <td className="border border-black p-1">{rs.ajoutDepartEnergie || 'Non'}</td>
                      
                      {/* Cellule Commentaire avec fond JAUNE #FFFF00 si LOS = NON */}
                      <td 
                        className={`border border-black p-1 text-left font-bold ${
                          isNonLos ? 'bg-[#FFFF00] text-black' : 'bg-white text-slate-800'
                        }`}
                      >
                        {rs.commentaire || (isNonLos ? 'Motif non précisé' : '')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- TABLEAU 2 : "RESUME POUR TABLEAU TRANS" --- */}
      <div>
        {/* Bandeau Titre */}
        <div className="bg-[#E2001A] text-white font-bold text-xs py-1 px-3 border border-black text-center uppercase tracking-wide">
          RESUME POUR TABLEAU TRANS
        </div>

        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-[#E2001A] text-white font-bold text-center">
              <th className="border border-black p-1 w-8">#</th>
              <th className="border border-black p-1.5 w-1/2">Chaîne pour le site {codeSite}</th>
              <th className="border border-black p-1.5 w-1/2">Chaîne pour le site distant</th>
            </tr>
          </thead>
          <tbody>
            {resumeRows.map((row) => (
              <tr key={row.id} className="bg-white text-black font-semibold text-center hover:bg-slate-50">
                <td className="border border-black p-1 font-bold text-[9px]">{row.index}</td>
                <td className="border border-black p-1 text-[10px] font-mono text-center">
                  {row.local}
                </td>
                <td className="border border-black p-1 text-[10px] font-mono text-center">
                  {row.distant}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pied de page Onglet 1 */}
      <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 bg-[#E2001A] text-white font-bold rounded-xs">DONNEES LOS</span>
          <span>Page 1 / Rapport Fiche LOS Survey Ooredoo Business</span>
        </div>
        <div>
          Généré le {new Date().toLocaleDateString('fr-FR')} • Système RFI Survey FH
        </div>
      </div>
    </div>
  );
});

DonneesLosPage.displayName = 'DonneesLosPage';
