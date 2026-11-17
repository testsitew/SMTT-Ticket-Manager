import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Phone,
  Lock,
  Shield,
  UserPlus,
  Trash2,
  Search,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import SmttLogo from '../../components/SmttLogo.tsx';

interface UserType {
  id: string;
  fullName: string;
  phone: string;
  username: string;
  password?: string;
  role: 'Admin 1' | 'Admin 2' | "Chef d'équipe";
}

interface InformaticienPageProps {
  onLogout: () => void;
}

export default function InformaticienPage({ onLogout }: InformaticienPageProps) {
  // Le tableau doit être totalement vide au départ ou chargé depuis le localStorage
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin 1' | 'Admin 2' | "Chef d'équipe">('Admin 1');
  const [formError, setFormError] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smtt_users');
      if (stored) {
        setUsers(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erreur lors du chargement des utilisateurs depuis le localStorage', e);
    }
  }, []);

  // Save to localStorage on changes
  const saveUsersToStorage = (updatedUsers: UserType[]) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem('smtt_users', JSON.stringify(updatedUsers));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde dans le localStorage', e);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !username.trim() || !password.trim()) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Vérifier si l'identifiant existe déjà (y compris "it")
    if (username.trim().toLowerCase() === 'it' || users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setFormError("Cet identifiant est déjà utilisé.");
      return;
    }

    const newUser: UserType = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      username: username.trim(),
      password: password,
      role: role
    };

    const updated = [...users, newUser];
    saveUsersToStorage(updated);
    setIsModalOpen(false);

    // Reset Form
    setFullName('');
    setPhone('');
    setUsername('');
    setPassword('');
    setRole('Admin 1');
    setFormError('');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const updated = users.filter(u => u.id !== id);
      saveUsersToStorage(updated);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="user-manager-layout" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <nav id="top-navbar" className="bg-blue-900 border-b border-blue-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div id="navbar-brand" className="flex items-center gap-3">
          <SmttLogo height={34} />
          <span className="font-bold text-xl tracking-wider text-white">SMTT B2B</span>
          <span className="text-blue-300 font-medium">|</span>
          <span className="text-blue-100 font-light text-sm tracking-wide">Ticket Manager</span>
        </div>
        <div id="navbar-actions" className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-blue-200 bg-blue-950/50 px-3 py-1.5 rounded-xl border border-blue-800">
            <User size={16} className="text-orange-500" />
            <span className="font-semibold text-white">Informaticien (it)</span>
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

      {/* Main Workspace */}
      <div id="main-workspace" className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Gestion des Utilisateurs</h1>
            <p className="text-xs text-slate-400 mt-1 font-light">Créez et configurez les comptes utilisateurs locaux pour les connecter sur l'espace correspondant.</p>
          </div>
          <button
            id="add-user-btn"
            onClick={() => {
              setFormError('');
              setIsModalOpen(true);
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all self-start cursor-pointer"
          >
            <UserPlus size={16} />
            Créer un utilisateur
          </button>
        </div>

        {/* Dashboard Search & Table */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Filtering bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="text-xs text-slate-400">
              Total : <strong className="text-white">{filteredUsers.length}</strong> utilisateur(s)
            </div>
          </div>

          {/* User Table container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Nom & Prénom</th>
                  <th className="py-4 px-6">N° Téléphone</th>
                  <th className="py-4 px-6">Identifiant</th>
                  <th className="py-4 px-6">Mot de passe</th>
                  <th className="py-4 px-6">Rôle</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <User className="opacity-20 w-10 h-10 text-slate-400" />
                        <p className="font-semibold text-slate-300">Aucun utilisateur enregistré.</p>
                        <p className="text-xs text-slate-500 font-light">Le tableau est actuellement vide. Utilisez "Créer un utilisateur" pour commencer.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">
                        {user.fullName}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono">
                        {user.phone}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono bg-slate-950/20">
                        {user.username}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200">
                            {showPasswordMap[user.id] ? user.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                          >
                            {showPasswordMap[user.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          user.role === 'Admin 1' ? 'bg-blue-950/60 text-blue-400 border-blue-900/40' :
                          user.role === 'Admin 2' ? 'bg-purple-950/60 text-purple-400 border-purple-900/40' :
                          'bg-orange-950/60 text-orange-400 border-orange-900/40'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all cursor-pointer"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-6 relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-orange-500" />
                  Nouveau compte utilisateur
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300 text-sm focus:outline-none cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddUser} className="space-y-4 text-xs">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase block">Nom & Prénom *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase block">N° Téléphone *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase block">Identifiant *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <UserCheck size={14} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase block">Mot de passe *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Lock size={14} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold uppercase block">Rôle *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      <Shield size={14} />
                    </span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Admin 1">Admin 1</option>
                      <option value="Admin 2">Admin 2</option>
                      <option value="Chef d'équipe">Chef d'équipe</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-medium px-4 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-5 py-2 rounded-xl shadow-lg shadow-orange-600/10 active:scale-95 transition-all cursor-pointer"
                  >
                    Enregistrer l'utilisateur
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer id="dashboard-footer" className="bg-slate-900 border-t border-slate-800 py-3 text-center text-[11px] text-slate-500">
        SMTT B2B Ticket Manager - Panel de contrôle informatique • Version 1.0.0
      </footer>
    </div>
  );
}
