import React from 'react';
import {
  Shield,
  LogOut,
  User,
  Activity,
  CheckCircle,
  FileText,
  Clock,
  AlertTriangle,
  Briefcase,
  Layers,
  Terminal,
  Grid
} from 'lucide-react';

interface DashboardPageProps {
  role: string;
  fullName: string;
  onLogout: () => void;
}

export default function DashboardPage({ role, fullName, onLogout }: DashboardPageProps) {
  // Determine specific themes & titles based on role
  const getRoleHeader = () => {
    switch (role) {
      case 'Admin 1':
        return {
          title: "Espace Administration de Niveau 1 (Admin 1)",
          description: "Gestion opérationnelle, supervision des files d'attente et validation des priorités.",
          accent: "text-blue-400 bg-blue-950/40 border-blue-900/40"
        };
      case 'Admin 2':
        return {
          title: "Espace Expertise Technique de Niveau 2 (Admin 2)",
          description: "Résolution des incidents critiques, administration systèmes avancée et configuration.",
          accent: "text-purple-400 bg-purple-950/40 border-purple-900/40"
        };
      case "Chef d'équipe":
        return {
          title: "Espace Chef d'équipe SMTT",
          description: "Attribution des tâches, suivi des performances opérationnelles et rapports.",
          accent: "text-orange-400 bg-orange-950/40 border-orange-900/40"
        };
      default:
        return {
          title: "Espace SMTT Ticket Manager",
          description: "Espace de travail sécurisé.",
          accent: "text-slate-400 bg-slate-900/40 border-slate-800/40"
        };
    }
  };

  const headerDetails = getRoleHeader();

  return (
    <div id="dashboard-layout" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav id="top-navbar" className="bg-blue-900 border-b border-blue-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div id="navbar-brand" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-wider text-white">SMTT</span>
          <span className="text-blue-300 font-medium">|</span>
          <span className="text-blue-100 font-light text-sm tracking-wide">Ticket Manager</span>
        </div>
        <div id="navbar-actions" className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-blue-200 bg-blue-950/50 px-3 py-1.5 rounded-xl border border-blue-800">
            <User size={16} className="text-orange-500" />
            <span className="font-semibold">{fullName}</span>
            <span className="text-xs text-slate-400">({role})</span>
          </div>
          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-2 text-xs font-semibold bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded-xl border border-red-700/50 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${headerDetails.accent}`}>
                {role}
              </span>
              <span className="text-xs text-slate-500">• Session active</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight pt-1">
              Bienvenue, {fullName}
            </h1>
            <p className="text-xs text-slate-400 font-light">
              {headerDetails.description}
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 font-mono">
            ID Rôle : {role.toUpperCase().replace(' ', '_')}
          </div>
        </div>

        {/* Dynamic Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Main Metric */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tickets assignés</span>
              <div className="p-2 bg-blue-950 text-blue-400 rounded-xl border border-blue-900/30">
                <FileText size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-white">0</h3>
              <p className="text-xs text-slate-500 mt-1">Aucun ticket en attente de traitement.</p>
            </div>
          </div>

          {/* Card 2: Status Metric */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disponibilité SMTT</span>
              <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900/30">
                <Activity size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-emerald-400">100%</h3>
              <p className="text-xs text-slate-500 mt-1">Tous les services sont opérationnels.</p>
            </div>
          </div>

          {/* Card 3: Priority Alerts */}
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertes critiques</span>
              <div className="p-2 bg-amber-950 text-amber-400 rounded-xl border border-amber-900/30">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-amber-400">0</h3>
              <p className="text-xs text-slate-500 mt-1">Aucune alerte majeure détectée.</p>
            </div>
          </div>

        </div>

        {/* Operational Modules depending on the logged-in role */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Module 1: Activity Logs / Actions */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              Actions rapides
            </h3>
            <div className="space-y-2 text-xs">
              <button className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 px-4 rounded-xl flex items-center justify-between transition-colors">
                <span className="font-medium text-slate-300">Consulter la base de connaissances</span>
                <span className="text-slate-500">→</span>
              </button>
              <button className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 px-4 rounded-xl flex items-center justify-between transition-colors">
                <span className="font-medium text-slate-300">Rédiger un rapport de transfert d'incident</span>
                <span className="text-slate-500">→</span>
              </button>
              <button className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 px-4 rounded-xl flex items-center justify-between transition-colors">
                <span className="font-medium text-slate-300">Foire aux questions (FAQ) Technique</span>
                <span className="text-slate-500">→</span>
              </button>
            </div>
          </div>

          {/* Module 2: Dummy System Monitoring console */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal size={16} className="text-blue-400" />
              Console SMTT B2B
            </h3>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-[10px] text-slate-400 space-y-2 h-[155px] overflow-y-auto">
              <p className="text-slate-500">[SYSTEM] Session initialisée pour l'utilisateur {fullName}</p>
              <p className="text-slate-500">[SYSTEM] Authentification réussie avec le rôle : {role}</p>
              <p className="text-emerald-400">✓ Connexion au bus de messages SMTT établie</p>
              <p className="text-slate-500">[INFO] En attente de nouveaux tickets à traiter...</p>
            </div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer id="dashboard-footer" className="bg-slate-900 border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
        SMTT B2B Ticket Manager - Portail Sécurisé • Version 1.0.0
      </footer>
    </div>
  );
}
