import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  LogOut,
  User,
  PlusCircle,
  Table,
  Search,
  Trash2,
  Calendar,
  Link as LinkIcon,
  Cpu,
  UserCheck,
  Users,
  FileText,
  AlertCircle,
  ArrowLeft,
  Ruler,
  HardHat,
  Monitor,
  X,
  RefreshCw
} from 'lucide-react';
import EtudeRFILossModule from '../../components/EtudeRFILoss.tsx';
import GenieCivilModule from '../../components/GenieCivilModule.tsx';
import AdminUsersPanel from '../../components/AdminUsersPanel.tsx';
import SmttLogo from '../../components/SmttLogo.tsx';

interface Admin2Ticket {
  id: string;
  activityType: 'rfi' | 'gc';
  lien: string;
  configuration: string;
  lienRecup: string;
  owner: string;
  debutInstallation: string;
  finInstallation: string;
  superviseur: string;
  chefEquipe1: string;
  chefEquipe2: string;
  chefEquipe3: string;
  createdAt: string;
  // Official template fields
  siteOoredoo1: string;
  siteOoredoo2: string;
  dateAsBuilt: string;
  // Specific fields
  perteSignal?: string;
  frequence?: string;
  volumeBeton?: string;
  typeInfrastructure?: string;
}

interface Admin2PageProps {
  fullName: string;
  onLogout: () => void;
}

export default function Admin2Page({ fullName, onLogout }: Admin2PageProps) {
  const [activeView, setActiveView] = useState<'tickets' | 'rfi'>('tickets');
  const [tickets, setTickets] = useState<Admin2Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chefsList, setChefsList] = useState<string[]>(["Sami K.", "Amine M.", "Hassen T."]);

  // Form States
  const [lien, setLien] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [lienRecup, setLienRecup] = useState('');
  const [owner, setOwner] = useState('');
  const [debutInstallation, setDebutInstallation] = useState('');
  const [finInstallation, setFinInstallation] = useState('');
  const [superviseur, setSuperviseur] = useState('');
  const [chefEquipe1, setChefEquipe1] = useState('');
  const [chefEquipe2, setChefEquipe2] = useState('');
  const [chefEquipe3, setChefEquipe3] = useState('');
  const [siteOoredoo1, setSiteOoredoo1] = useState('');
  const [siteOoredoo2, setSiteOoredoo2] = useState('');
  const [dateAsBuilt, setDateAsBuilt] = useState('');
  const [perteSignal, setPerteSignal] = useState('');
  const [frequence, setFrequence] = useState('');
  const [volumeBeton, setVolumeBeton] = useState('');
  const [typeInfrastructure, setTypeInfrastructure] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<'rfi' | 'gc' | 'users' | null>(null);
  const [previewTicket, setPreviewTicket] = useState<Admin2Ticket | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smtt_admin_tickets') || localStorage.getItem('smtt_admin1_tickets');
      if (stored) {
        setTickets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erreur lors du chargement des tickets', e);
    }

    try {
      const storedUsers = localStorage.getItem('smtt_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        const filtered = parsed
          .filter((u: any) => u.role === "Chef d'équipe")
          .map((u: any) => u.fullName);
        const combined = Array.from(new Set([...filtered, "Sami K.", "Amine M.", "Hassen T."]));
        setChefsList(combined);
      }
    } catch (e) {
      console.error('Erreur lors du chargement des chefs d\'équipe', e);
    }
  }, []);

  // Save to localStorage
  const saveTickets = (updated: Admin2Ticket[]) => {
    setTickets(updated);
    try {
      localStorage.setItem('smtt_admin_tickets', JSON.stringify(updated));
      localStorage.setItem('smtt_admin1_tickets', JSON.stringify(updated)); // sync
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des tickets', e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lien.trim() || !configuration.trim() || !owner.trim() || !debutInstallation || !finInstallation || !superviseur.trim()) {
      setFormError('Veuillez remplir tous les champs obligatoires (Lien, Configuration, Owner, Début/Fin, Superviseur).');
      return;
    }

    const newTicket: Admin2Ticket = {
      id: `TKT-${Date.now().toString().slice(-5)}`,
      activityType: activityType!,
      lien: lien.trim(),
      configuration: configuration.trim(),
      lienRecup: lienRecup.trim(),
      owner: owner.trim(),
      debutInstallation: debutInstallation,
      finInstallation: finInstallation,
      superviseur: superviseur.trim(),
      chefEquipe1: chefEquipe1.trim() || 'Non assigné',
      chefEquipe2: chefEquipe2.trim() || 'Non assigné',
      chefEquipe3: chefEquipe3.trim() || 'Non assigné',
      siteOoredoo1: siteOoredoo1.trim() || '---',
      siteOoredoo2: siteOoredoo2.trim() || '---',
      dateAsBuilt: dateAsBuilt.trim() || '---',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      perteSignal: activityType === 'rfi' ? perteSignal : undefined,
      frequence: activityType === 'rfi' ? frequence : undefined,
      volumeBeton: activityType === 'gc' ? volumeBeton : undefined,
      typeInfrastructure: activityType === 'gc' ? typeInfrastructure : undefined
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);

    // Reset Form
    setLien('');
    setConfiguration('');
    setLienRecup('');
    setOwner('');
    setDebutInstallation('');
    setFinInstallation('');
    setSuperviseur('');
    setChefEquipe1('');
    setChefEquipe2('');
    setChefEquipe3('');
    setSiteOoredoo1('');
    setSiteOoredoo2('');
    setDateAsBuilt('');
    setPerteSignal('');
    setFrequence('');
    setVolumeBeton('');
    setTypeInfrastructure('');
    setFormError('');
    setSuccessMessage('Ticket enregistré avec succès !');

    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDelete = (id: string) => {
    setTicketToDelete(id);
  };

  const confirmDelete = () => {
    if (ticketToDelete) {
      const updated = tickets.filter(t => t.id !== ticketToDelete);
      saveTickets(updated);
      setTicketToDelete(null);
    }
  };

  const filteredTickets = tickets.filter(t =>
    t.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.superviseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.configuration.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="admin2-layout" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav id="top-navbar" className="bg-blue-900 border-b border-blue-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div id="navbar-brand" className="flex items-center gap-3">
          <SmttLogo height={34} />
          <span className="font-bold text-xl tracking-wider text-white">SMTT B2B</span>
          <span className="text-blue-300 font-medium">|</span>
          <span className="text-blue-100 font-light text-sm tracking-wide">Ticket Manager</span>
        </div>
        <div id="navbar-actions" className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-blue-200 bg-blue-950/50 px-3 py-1.5 rounded-xl border border-blue-800">
            <User size={14} className="text-orange-500" />
            <span className="font-semibold">{fullName}</span>
            <span className="text-[10px] text-purple-300 bg-purple-900/60 px-1.5 py-0.5 rounded">Admin 2</span>
          </div>
          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-semibold bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded-xl border border-red-700/50 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Welcome Banner */}
      <div className="bg-slate-900 border-b border-slate-850 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <p className="text-xs text-slate-300">
            Bienvenue, <strong className="text-white font-semibold">{fullName}</strong>
          </p>
        </div>
        <div className="text-[10px] text-slate-500 hidden sm:block">
          Expertise Technique • Niveau 2
        </div>
      </div>

      {/* Main Grid View */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!activityType ? (
            <motion.div
              key="selection-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center p-6"
            >
              <div className="max-w-4xl w-full">
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Choisissez votre activité</h1>
                  <p className="text-slate-400 font-light">Sélectionnez la catégorie de saisie manuelle pour continuer</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Étude RFI LOSS Card */}
                  <button
                    onClick={() => setActivityType('rfi')}
                    className="group relative bg-slate-900/40 border border-slate-800 hover:border-orange-500/50 rounded-3xl p-10 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-orange-600/10 active:scale-[0.98] cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-orange-600/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform duration-300">
                      <Ruler size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">📐 1. Étude RFI LOSS</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">
                      Saisie manuelle des données pour les rapports d'étude RFI et calculs de perte.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-orange-500 transition-colors">
                      Commencer <PlusCircle size={14} />
                    </div>
                  </button>

                  {/* Génie Civil Card */}
                  <button
                    onClick={() => setActivityType('gc')}
                    className="group relative bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-10 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-purple-600/10 active:scale-[0.98] cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-purple-600/10 rounded-2xl text-purple-400 group-hover:scale-110 transition-transform duration-300">
                      <HardHat size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">🏗️ 2. Génie Civil</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">
                      Saisie manuelle pour les rapports de travaux de génie civil et infrastructures.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-purple-400 transition-colors">
                      Commencer <PlusCircle size={14} />
                    </div>
                  </button>

                  {/* Gestion Utilisateurs Card */}
                  <button
                    onClick={() => setActivityType('users')}
                    className="group relative bg-slate-900/40 border border-slate-800 hover:border-red-500/50 rounded-3xl p-10 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-red-600/10 active:scale-[0.98] cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-600/10 rounded-2xl text-red-400 group-hover:scale-110 transition-transform duration-300">
                      <Users size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-red-300 transition-colors">👥 3. Utilisateurs</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-light">
                      Créer des comptes utilisateurs et gérer les rôles, zones et accès en temps réel.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-red-400 transition-colors">
                      Gérer <PlusCircle size={14} />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden"
            >
              <div className={`border rounded-2xl p-6 shadow-xl space-y-4 ${
                activityType === 'gc' || activityType === 'users'
                  ? 'bg-slate-950/80 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}>
                <div className={`flex items-center justify-between pb-4 border-b ${
                  activityType === 'gc' || activityType === 'users' ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <PlusCircle className={activityType === 'gc' || activityType === 'users' ? 'text-orange-500' : 'text-red-600'} size={20} />
                    <h2 className={`font-bold text-base uppercase tracking-wider ${
                      activityType === 'gc' || activityType === 'users' ? 'text-white' : 'text-slate-800'
                    }`}>
                      {activityType === 'rfi'
                        ? '📐 1. Étude RFI LOSS'
                        : activityType === 'gc'
                        ? '🏗️ 2. Génie Civil'
                        : '👥 3. Gestion des Utilisateurs'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setActivityType(null)}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer px-3.5 py-2 rounded-xl border shadow-sm ${
                      activityType === 'gc' || activityType === 'users'
                        ? 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-700'
                        : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    <ArrowLeft size={14} />
                    Retour au choix d'activité
                  </button>
                </div>

                {activityType === 'rfi' ? (
                  <EtudeRFILossModule currentUserRole="Admin 2" currentUserName={fullName} />
                ) : activityType === 'gc' ? (
                  <GenieCivilModule currentUserRole="Admin 2" currentUserName={fullName} />
                ) : (
                  <AdminUsersPanel />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  </main>

      {/* Footer */}
      <footer id="admin2-footer" className="bg-slate-900 border-t border-slate-850 py-2.5 text-center text-[10px] text-slate-500">
        SMTT B2B Ticket Manager - Panel Admin 2 • Version 1.0.0
      </footer>

      {/* Custom Deletion Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 m-4">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">Confirmation de suppression</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Cette action est définitive et irréversible.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le ticket <span className="font-mono text-red-400 font-bold">{ticketToDelete}</span> ? Toutes les photos et diapositives associées seront supprimées.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase shadow-lg shadow-red-600/15 transition-all cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTicket && <ReportPreviewModal ticket={previewTicket} onClose={() => setPreviewTicket(null)} />}

    </div>
  );
}

// Preview Modal Component
function ReportPreviewModal({ ticket, onClose }: { ticket: Admin2Ticket, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-6 relative m-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-600/10 rounded-xl border border-orange-500/20">
            <Monitor className="text-orange-500" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">Aperçu du Rapport Officiel</h2>
            <p className="text-xs text-slate-400">Vérification de la Slide 1 (Page de Garde)</p>
          </div>
        </div>

        {/* The Slide Preview */}
        <div className="bg-[#ECECEC] rounded-xl aspect-[16/9] relative overflow-hidden shadow-2xl border border-slate-300">
           {/* Background Diamond Pattern - Smaller and finer */}
           <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3Cpath d='M15 0l15 15-15 15L0 15z' fill='%23ffffff' /%3E%3C/svg%3E")`,
              backgroundSize: '20px 20px',
              backgroundPosition: 'center'
            }} 
          />

          {/* Left Huge Textured Red Block - Moved up and refined scalloped border */}
          <div className="absolute left-4 top-[45%] -translate-y-1/2 w-[45%] h-[60%] bg-[#e21f26] p-4 flex flex-col justify-center text-left text-white shadow-xl z-10">
            {/* Bubbly border circles - Single row perimeter */}
            {/* Top */}
            <div className="absolute -top-3 left-0 right-0 flex justify-between pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`t-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
              ))}
            </div>
            {/* Bottom */}
            <div className="absolute -bottom-3 left-0 right-0 flex justify-between pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`b-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
              ))}
            </div>
            {/* Left - Exclude top/bottom corners to avoid vertical stacking clusters */}
            <div className="absolute -left-3 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`l-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
              ))}
            </div>
            {/* Right - Exclude top/bottom corners */}
            <div className="absolute -right-3 top-6 bottom-6 flex flex-col justify-between pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`r-${i}`} className="w-6 h-6 rounded-full bg-[#e21f26] shrink-0" />
              ))}
            </div>

            <div className="space-y-3 my-auto pl-6 font-sans select-none z-10">
              <h2 className="text-[10px] md:text-sm font-extrabold text-white tracking-tight italic mb-3 uppercase">
                MW Links installation Ooredoo
              </h2>
              
              <div className="space-y-2 text-[8px] md:text-xs font-sans font-medium text-white">
                <div className="flex items-center gap-1">
                  <span className="italic font-bold">Site Ooredoo : ...</span>
                  <span className="font-black italic px-1">{ticket.siteOoredoo1}</span>
                  <span className="italic font-bold">...</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="italic font-bold">Site Ooredoo : ......</span>
                  <span className="font-black italic px-1">{ticket.siteOoredoo2}</span>
                  <span className="italic font-bold">.......</span>
                </div>

                <div className="flex items-center gap-1 pt-2">
                  <span className="italic font-bold">Date As Built : ...</span>
                  <span className="font-black italic px-1">{ticket.dateAsBuilt}</span>
                  <span className="italic font-bold">..........</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right Header Banner */}
          <div className="absolute top-6 right-0 flex flex-col items-end select-none z-10">
            <div className="flex items-center">
              <div className="bg-[#e21f26] text-white text-[10px] md:text-[11px] font-black italic px-8 py-2.5 shadow-md uppercase tracking-wider rounded-l-md">
                As Built Installation FH
              </div>
              <div className="w-4 h-[1.5px] bg-[#e21f26]" />
            </div>
            <div className="w-56 h-[1.5px] bg-[#e21f26] mt-1.5 mr-0" />
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between text-[#e21f26]">
             <div className="flex flex-col items-start scale-110 origin-bottom-left">
                <div className="flex items-center -space-x-[1px]">
                  {['o','o','r','e','d','o','o'].map((l,i)=>(
                    <div key={i} className="w-5 h-5 rounded-full bg-[#e21f26] flex items-center justify-center">
                      <span className="text-white text-[11px] font-black">{l}</span>
                    </div>
                  ))}
                </div>
                <span className="text-slate-500 font-extrabold tracking-[0.3em] text-[8px] uppercase mt-1">business</span>
             </div>
             <span className="font-black text-xl font-mono">1</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fermer l'aperçu
          </button>
        </div>
      </div>
    </div>
  );
}
