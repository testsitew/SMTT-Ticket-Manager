import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Mail,
  Lock,
  Shield,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Save
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.js';
import {
  fetchAllProfiles,
  createUserAccountAdmin,
  updateProfileAdmin,
  subscribeProfilesRealtime,
} from '../services/supabaseService';
import type { SupabaseProfile, SupabaseRole } from '../types';

const ROLES: { value: SupabaseRole; label: string }[] = [
  { value: 'Admin1', label: 'Admin 1' },
  { value: 'Admin2', label: 'Admin 2' },
  { value: 'Chef_Equipe', label: "Chef d'équipe" },
  { value: 'Technicien', label: 'Technicien' },
];

export default function AdminUsersPanel() {
  const [profiles, setProfiles] = useState<SupabaseProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SupabaseRole>('Chef_Equipe');
  const [zone, setZone] = useState('');
  const [creating, setCreating] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Inline zone drafts
  const [zoneDrafts, setZoneDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const list = await fetchAllProfiles();
        setProfiles(list);
        const drafts: Record<string, string> = {};
        list.forEach((p) => {
          drafts[p.id] = p.zone || '';
        });
        setZoneDrafts(drafts);
      } else {
        const stored = localStorage.getItem('smtt_users');
        if (stored) {
          const parsed = JSON.parse(stored);
          const mapped: SupabaseProfile[] = parsed.map((u: any) => ({
            id: u.id,
            nom: u.fullName || u.nom || u.username,
            email: u.email || u.username,
            role: u.role,
            zone: u.zone || '',
            actif: u.actif !== false,
          }));
          setProfiles(mapped);
          const drafts: Record<string, string> = {};
          mapped.forEach((p) => {
            drafts[p.id] = p.zone || '';
          });
          setZoneDrafts(drafts);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors du chargement des utilisateurs.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
    const unsub = subscribeProfilesRealtime(() => {
      loadProfiles();
    });
    return () => {
      unsub();
    };
  }, [loadProfiles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!nom.trim() || !email.trim() || !password.trim()) {
      setFeedback({
        type: 'warning',
        message: 'Veuillez renseigner le nom complet, email et mot de passe.',
      });
      return;
    }

    if (password.length < 6) {
      setFeedback({
        type: 'warning',
        message: 'Le mot de passe doit contenir au moins 6 caractères.',
      });
      return;
    }

    setCreating(true);
    try {
      if (isSupabaseConfigured) {
        await createUserAccountAdmin({
          nom: nom.trim(),
          email: email.trim(),
          password,
          role,
          zone: zone.trim(),
        });
        setFeedback({
          type: 'success',
          message: `Compte créé pour ${nom.trim()} (${role}) sans déconnecter votre session Admin.`,
        });
        await loadProfiles();
      } else {
        const stored = localStorage.getItem('smtt_users');
        const list = stored ? JSON.parse(stored) : [];
        const newLocal = {
          id: `USR-${Date.now().toString().slice(-4)}`,
          fullName: nom.trim(),
          username: email.trim(),
          email: email.trim(),
          password,
          role,
          zone: zone.trim(),
          actif: true,
        };
        const updated = [...list, newLocal];
        localStorage.setItem('smtt_users', JSON.stringify(updated));
        await loadProfiles();
        setFeedback({
          type: 'warning',
          message: `Utilisateur ${nom.trim()} enregistré localement. Renseignez vos clés Supabase dans src/lib/supabase.js pour la création automatique dans auth.users.`,
        });
      }

      setNom('');
      setEmail('');
      setPassword('');
      setRole('Chef_Equipe');
      setZone('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Impossible de créer le compte utilisateur.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (profile: SupabaseProfile, newRole: string) => {
    setSavingId(profile.id);
    try {
      if (isSupabaseConfigured) {
        await updateProfileAdmin(profile.id, { role: newRole });
        await loadProfiles();
      } else {
        const stored = localStorage.getItem('smtt_users');
        const list = stored ? JSON.parse(stored) : [];
        const updated = list.map((u: any) =>
          u.id === profile.id ? { ...u, role: newRole } : u
        );
        localStorage.setItem('smtt_users', JSON.stringify(updated));
        await loadProfiles();
      }
      setFeedback({
        type: 'success',
        message: `Rôle mis à jour pour ${profile.nom} : ${newRole}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors de la modification du rôle.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateZone = async (profile: SupabaseProfile) => {
    const newZone = (zoneDrafts[profile.id] ?? '').trim();
    setSavingId(profile.id);
    try {
      if (isSupabaseConfigured) {
        await updateProfileAdmin(profile.id, { zone: newZone });
        await loadProfiles();
      } else {
        const stored = localStorage.getItem('smtt_users');
        const list = stored ? JSON.parse(stored) : [];
        const updated = list.map((u: any) =>
          u.id === profile.id ? { ...u, zone: newZone } : u
        );
        localStorage.setItem('smtt_users', JSON.stringify(updated));
        await loadProfiles();
      }
      setFeedback({
        type: 'success',
        message: `Zone mise à jour pour ${profile.nom}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors de la modification de la zone.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (profile: SupabaseProfile) => {
    const nextActive = profile.actif === false;
    setSavingId(profile.id);
    try {
      if (isSupabaseConfigured) {
        await updateProfileAdmin(profile.id, { actif: nextActive });
        await loadProfiles();
      } else {
        const stored = localStorage.getItem('smtt_users');
        const list = stored ? JSON.parse(stored) : [];
        const updated = list.map((u: any) =>
          u.id === profile.id ? { ...u, actif: nextActive } : u
        );
        localStorage.setItem('smtt_users', JSON.stringify(updated));
        await loadProfiles();
      }
      setFeedback({
        type: 'success',
        message: `Compte ${profile.nom} ${nextActive ? 'activé' : 'désactivé'}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erreur lors du changement de statut.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.nom || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q) ||
      (p.zone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-100">
      {/* Left: Create User Form */}
      <section className="lg:col-span-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <UserPlus className="text-orange-500" size={18} />
            <h2 className="font-black text-xs text-white uppercase tracking-wider">
              Créer un nouvel utilisateur
            </h2>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : feedback.type === 'warning'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">
                Nom complet *
              </label>
              <div className="relative">
                <User
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Sami Ben Ali"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">
                Email *
              </label>
              <div className="relative">
                <Mail
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sami@smtt.tn"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">
                  Rôle *
                </label>
                <div className="relative">
                  <Shield
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as SupabaseRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold uppercase block tracking-wider text-[10px]">
                  Zone
                </label>
                <div className="relative">
                  <MapPin
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Ex: Tunis / Nord"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-black uppercase py-2.5 px-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {creating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Créer l&apos;utilisateur</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Right: Users Table (profiles) */}
      <section className="lg:col-span-8">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="text-red-500" size={18} />
              <h2 className="font-extrabold text-xs text-white uppercase tracking-wider">
                Utilisateurs &amp; Profils ({filteredProfiles.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher nom, rôle, zone..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="button"
                onClick={loadProfiles}
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                title="Actualiser"
              >
                <RefreshCw
                  size={14}
                  className={loading ? 'animate-spin text-orange-400' : ''}
                />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Utilisateur</th>
                  <th className="py-3 px-3">Rôle</th>
                  <th className="py-3 px-3">Zone</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Actif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-slate-500 text-xs"
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => {
                    const isActive = p.actif !== false;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{p.nom}</div>
                          {p.email && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.email}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={p.role}
                            disabled={savingId === p.id}
                            onChange={(e) => handleUpdateRole(p, e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[11px] font-semibold text-white focus:outline-none focus:border-orange-500"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                            {!ROLES.some((r) => r.value === p.role) && (
                              <option value={p.role}>{p.role}</option>
                            )}
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={zoneDrafts[p.id] ?? p.zone ?? ''}
                              onChange={(e) =>
                                setZoneDrafts((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              placeholder="Zone..."
                              className="w-28 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[11px] text-white focus:outline-none focus:border-orange-500"
                            />
                            <button
                              type="button"
                              disabled={savingId === p.id}
                              onClick={() => handleUpdateZone(p)}
                              className="p-1.5 bg-slate-950 hover:bg-orange-600 text-slate-400 hover:text-white border border-slate-800 rounded-lg cursor-pointer transition-colors"
                              title="Enregistrer la zone"
                            >
                              <Save size={12} />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isActive
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40'
                                : 'bg-red-950/60 text-red-400 border-red-900/40'
                            }`}
                          >
                            {isActive ? 'Actif' : 'Désactivé'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={savingId === p.id}
                            onClick={() => handleToggleActive(p)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              isActive
                                ? 'bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white border-red-900/40'
                                : 'bg-emerald-950/40 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-900/40'
                            }`}
                          >
                            <Power size={11} />
                            <span>{isActive ? 'Désactiver' : 'Activer'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
