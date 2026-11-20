import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase.js';
import { signInWithSupabase } from '../../services/supabaseService';
import SmttLogo from '../../components/SmttLogo.tsx';

interface LoginPageProps {
  onLoginSuccess: (
    role: string,
    fullName: string,
    meta?: { id?: string; email?: string; zone?: string }
  ) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { user, profile } = await signInWithSupabase(
          trimmedEmail,
          password
        );
        onLoginSuccess(profile.role, profile.nom || user.email, {
          id: user.id,
          email: user.email,
          zone: profile.zone,
        });
        return;
      }

      // Fallback local si les clés Supabase ne sont pas encore configurées dans src/lib/supabase.js
      if (trimmedEmail === 'it' && password === 'it') {
        onLoginSuccess('it', 'Informaticien IT');
        return;
      }

      const storedUsers = localStorage.getItem('smtt_users');
      if (storedUsers) {
        const users = JSON.parse(storedUsers);
        const foundUser = users.find(
          (u: any) =>
            (u.email && u.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
            (u.username &&
              u.username.toLowerCase() === trimmedEmail.toLowerCase())
        );

        if (foundUser && foundUser.password === password) {
          if (foundUser.actif === false) {
            setError("Votre compte est désactivé. Contactez l'administrateur.");
            return;
          }
          onLoginSuccess(foundUser.role, foundUser.fullName || foundUser.nom, {
            id: foundUser.id,
            email: foundUser.email || foundUser.username,
            zone: foundUser.zone,
          });
          return;
        }
      }

      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    } catch (err: any) {
      setError(err?.message || 'Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav id="top-navbar" className="w-full bg-white border-b border-slate-200 px-6 py-3.5 grid grid-cols-3 items-center shadow-sm">
        <div id="navbar-brand" className="flex items-center justify-start">
          <SmttLogo height={36} />
        </div>
        <div id="navbar-title" className="flex items-center justify-center gap-2 whitespace-nowrap">
          <span className="font-bold text-lg sm:text-xl tracking-wider text-[#1E3A8A]">SMTT B2B</span>
          <span className="text-slate-300 font-medium">|</span>
          <span className="text-[#0F172A] font-medium text-xs sm:text-sm tracking-wide">Ticket Manager</span>
        </div>
        <div className="flex items-center justify-end">
          <div id="navbar-status" className="text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] px-3 py-1 rounded-full border border-[#CBD5E1] whitespace-nowrap">
            Espace Authentification
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div id="login-main" className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          id="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 z-10"
        >
          {/* Form Header */}
          <div id="login-header" className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Connexion</h2>
            <p className="text-sm text-slate-400 font-light">Accédez à votre espace SMTT Ticket Manager</p>
          </div>

          {/* Error Message */}
          {error && (
            <div id="login-error" className="mb-6 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Identifier Field */}
            <div id="username-group" className="space-y-2">
              <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Identifiant
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail size={18} />
                </span>
                <input
                  id="username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Identifiant (ex: it ou nom)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div id="password-group" className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-12 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-950 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <footer id="login-footer" className="py-4 text-center text-[11px] text-slate-600 border-t border-slate-900/60 bg-slate-950">
        © 2026 SMTT. Tous droits réservés.
      </footer>
    </div>
  );
}
