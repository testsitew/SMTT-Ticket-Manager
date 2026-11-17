import React from 'react';
import { VisAVisInfo } from '../types';
import { Activity, MapPin, Trash2, Plus, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { compressImage } from '../utils/excelExport';

interface ProfilBlockProps {
  index: number;
  data: VisAVisInfo;
  isEditable?: boolean;
  onUpdate?: (updated: VisAVisInfo) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const ProfilBlock: React.FC<ProfilBlockProps> = ({
  index,
  data,
  isEditable = false,
  onUpdate,
  onDelete,
  canDelete = false,
}) => {
  const isNonLos = data.statusLOS === 'LOS Non OK' || data.statusLOS === 'Non';
  const codeSiteDistant = data.codeSite || `Site Distant ${index + 1}`;
  const titreDeuxieme = data.titreDeuxiemeImage || 'Photo Obstacle';

  const handleFieldChange = <K extends keyof VisAVisInfo>(key: K, value: VisAVisInfo[K]) => {
    if (onUpdate) {
      onUpdate({ ...data, [key]: value });
    }
  };

  const handleImageUpload = (field: 'imageProfilUrl' | 'imageGoogleMapsUrl') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string);
          handleFieldChange(field, compressed);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handlePlanCapilaireChange = (pIdx: number, field: 'codeSite' | 'direction' | 'tailleAntenne', val: string) => {
    const currentList = [...(data.planCapilaire || [])];
    if (!currentList[pIdx]) {
      currentList[pIdx] = { codeSite: codeSiteDistant, direction: '', tailleAntenne: '' };
    }
    currentList[pIdx][field] = val;
    handleFieldChange('planCapilaire', currentList);
  };

  const addPlanCapilaireRow = () => {
    const currentList = [...(data.planCapilaire || [])];
    currentList.push({ codeSite: codeSiteDistant, direction: '', tailleAntenne: '' });
    handleFieldChange('planCapilaire', currentList);
  };

  const removePlanCapilaireRow = (pIdx: number) => {
    const currentList = [...(data.planCapilaire || [])].filter((_, i) => i !== pIdx);
    handleFieldChange('planCapilaire', currentList.length > 0 ? currentList : [{ codeSite: codeSiteDistant, direction: '', tailleAntenne: '' }]);
  };

  const planLines = (data.planCapilaire && data.planCapilaire.length > 0)
    ? data.planCapilaire
    : [{ codeSite: codeSiteDistant, direction: '-', tailleAntenne: '-' }];

  return (
    <div className="border-2 border-black bg-white rounded-none p-4 shadow-sm" style={{ pageBreakInside: 'avoid' }}>
      {/* GRILLE PRINCIPALE 3 COLONNES HORIZONTALES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* === COLONNE 1 (GAUCHE - 5 Cols) : Profil LOS === */}
        <div className="md:col-span-5 flex flex-col border border-black bg-white">
          {/* Titre Rouge (vide / neutre) */}
          <div className="bg-[#E2001A] text-white font-black text-xs py-1.5 px-3 border-b border-black text-center uppercase tracking-wide h-6"></div>

          {/* Cadre Image Profil avec taille fixe propre */}
          <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden h-[240px]">
            {data.imageProfilUrl ? (
              <div className="relative w-full h-full group flex items-center justify-center">
                <img
                  src={data.imageProfilUrl}
                  alt={`Profil LOS ${codeSiteDistant}`}
                  className="w-full h-full object-contain p-1"
                  crossOrigin="anonymous"
                />
                {isEditable && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageUpload('imageProfilUrl')}
                      className="px-2.5 py-1 bg-white text-slate-900 rounded text-xs font-bold hover:bg-slate-100 shadow"
                    >
                      Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('imageProfilUrl', '')}
                      className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 shadow"
                    >
                      Effacer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <Activity className="w-8 h-8 text-slate-300" />
                <span className="text-[11px] font-bold uppercase">Image Profil LOS non renseignée</span>
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleImageUpload('imageProfilUrl')}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#E2001A] text-white rounded text-xs font-bold hover:bg-red-700 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importer profil
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Fine bande jaune séparatrice décollée (avec marges haut et bas) */}
          <div className="my-3 px-3">
            <div className="bg-[#FFFF00] border border-black h-4 w-full shadow-xs"></div>
          </div>
        </div>

        {/* === COLONNE 2 (MILIEU - 4 Cols) : Localisation sur google / Photo obstacle === */}
        <div className="md:col-span-4 flex flex-col border border-black bg-white">
          {/* Titre Rouge */}
          <div className="bg-[#E2001A] text-white font-black text-xs py-1.5 px-3 border-b border-black text-center uppercase tracking-wide flex items-center justify-between">
            <span className="flex-1 text-center">{titreDeuxieme}</span>
            {isEditable && (
              <button
                type="button"
                onClick={() => {
                  const isObs = data.typeDeuxiemeImage === 'obstacle';
                  handleFieldChange('typeDeuxiemeImage', isObs ? 'google' : 'obstacle');
                  handleFieldChange('titreDeuxiemeImage', isObs ? 'Localisation sur google' : 'Photo obstacle');
                }}
                className="text-[9px] bg-black/40 hover:bg-black/60 px-1.5 py-0.5 rounded text-white font-bold tracking-tight"
                title="Basculer entre Google Maps et Photo obstacle"
              >
                {data.typeDeuxiemeImage === 'obstacle' ? 'Mode Maps' : 'Mode Obstacle'}
              </button>
            )}
          </div>

          {/* Cadre Image Google Maps / Obstacle */}
          <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden h-[240px] flex-1">
            {data.imageGoogleMapsUrl ? (
              <div className="relative w-full h-full group flex items-center justify-center">
                <img
                  src={data.imageGoogleMapsUrl}
                  alt={titreDeuxieme}
                  className="w-full h-full object-contain p-1"
                  crossOrigin="anonymous"
                />
                {isEditable && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleImageUpload('imageGoogleMapsUrl')}
                      className="px-2.5 py-1 bg-white text-slate-900 rounded text-xs font-bold hover:bg-slate-100 shadow"
                    >
                      Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('imageGoogleMapsUrl', '')}
                      className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 shadow"
                    >
                      Effacer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <MapPin className="w-8 h-8 text-slate-300" />
                <span className="text-[11px] font-bold uppercase">Capture carte / obstacle non renseignée</span>
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleImageUpload('imageGoogleMapsUrl')}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importer capture
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Espace bas pour alignement avec la bande jaune */}
          <div className="my-3 px-3 opacity-0 pointer-events-none">
            <div className="h-4 w-full"></div>
          </div>
        </div>

        {/* === COLONNE 3 (DROITE - 3 Cols) : Plan Capilaire === */}
        <div className="md:col-span-3 flex flex-col border border-black bg-white">
          {/* Titre Rouge */}
          <div className="bg-[#E2001A] text-white font-black text-xs py-1.5 px-3 border-b border-black text-center uppercase tracking-wide flex items-center justify-between">
            <span className="flex-1 text-center">Plan Capilaire</span>
            {isEditable && (
              <button
                type="button"
                onClick={addPlanCapilaireRow}
                className="text-[9px] bg-white text-red-600 px-1 py-0.5 rounded font-black hover:bg-slate-100"
                title="Ajouter une ligne au plan capillaire"
              >
                +
              </button>
            )}
          </div>

          {/* Tableau Plan Capillaire */}
          <div className="flex-1 overflow-x-auto bg-white">
            <table className="w-full border-collapse text-[10px] text-center">
              <thead>
                <tr className="bg-[#E2001A] text-white font-bold">
                  <th className="border border-black p-1 text-center font-bold">Code site client</th>
                  <th className="border border-black p-1 text-center font-bold">Direction</th>
                  <th className="border border-black p-1 text-center font-bold">Taille antenne</th>
                  {isEditable && <th className="border border-black p-0.5 w-6"></th>}
                </tr>
              </thead>
              <tbody>
                {planLines.map((pc, pcIdx) => (
                  <tr key={pcIdx} className="border-b border-black font-semibold">
                    {pcIdx === 0 && (
                      <td rowSpan={planLines.length} className="border border-black p-1 font-bold font-mono align-middle bg-white">
                        {isEditable ? (
                          <input
                            type="text"
                            value={data.codeSite || codeSiteDistant}
                            onChange={(e) => handleFieldChange('codeSite', e.target.value)}
                            className="w-full text-center bg-transparent border-0 outline-none font-bold"
                            placeholder="BAR_B024"
                          />
                        ) : (
                          data.codeSite || codeSiteDistant
                        )}
                      </td>
                    )}
                    <td className="border border-black p-1 font-mono">
                      {isEditable ? (
                        <input
                          type="text"
                          value={pc.direction || ''}
                          onChange={(e) => handlePlanCapilaireChange(pcIdx, 'direction', e.target.value)}
                          className="w-full text-center bg-transparent border-0 outline-none"
                          placeholder="245°"
                        />
                      ) : (
                        pc.direction || '-'
                      )}
                    </td>
                    <td className="border border-black p-1 font-mono">
                      {isEditable ? (
                        <input
                          type="text"
                          value={pc.tailleAntenne || ''}
                          onChange={(e) => handlePlanCapilaireChange(pcIdx, 'tailleAntenne', e.target.value)}
                          className="w-full text-center bg-transparent border-0 outline-none"
                          placeholder="0.6 m"
                        />
                      ) : (
                        pc.tailleAntenne || '-'
                      )}
                    </td>
                    {isEditable && (
                      <td className="border border-black p-0.5 text-center">
                        {planLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePlanCapilaireRow(pcIdx)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Espace bas pour alignement avec la bande jaune */}
          <div className="my-3 px-3 opacity-0 pointer-events-none">
            <div className="h-4 w-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
};
