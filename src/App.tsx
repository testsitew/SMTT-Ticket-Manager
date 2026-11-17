import React, { useState, useEffect } from 'react';
import LoginPage from './app/login/page.tsx';
import InformaticienPage from './app/informaticien/page.tsx';
import Admin1Page from './app/admin1/page.tsx';
import Admin2Page from './app/admin2/page.tsx';
import ChefEquipePage from './app/chef-equipe/page.tsx';
import DashboardPage from './app/dashboard/page.tsx';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import {
  getActiveSupabaseSessionProfile,
  signOutSupabase,
} from './services/supabaseService';

interface LoggedInUser {
  id?: string;
  email?: string;
  zone?: string;
  role: string;
  fullName: string;
}

export default function App() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCheckingSession(false);
      return;
    }

    let mounted = true;

    const restoreSession = async () => {
      try {
        const sessionUser = await getActiveSupabaseSessionProfile();
        if (mounted && sessionUser) {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            zone: sessionUser.profile.zone,
            role: sessionUser.profile.role,
            fullName: sessionUser.profile.nom || sessionUser.email,
          });
        }
      } catch (err) {
        console.error('Erreur restauration session Supabase:', err);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) setUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const sessionUser = await getActiveSupabaseSessionProfile();
        if (mounted && sessionUser) {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            zone: sessionUser.profile.zone,
            role: sessionUser.profile.role,
            fullName: sessionUser.profile.nom || sessionUser.email,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (
    role: string,
    fullName: string,
    meta?: { id?: string; email?: string; zone?: string }
  ) => {
    setUser({
      id: meta?.id,
      email: meta?.email,
      zone: meta?.zone,
      role,
      fullName,
    });
  };

  const handleLogout = async () => {
    await signOutSupabase();
    setUser(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-xs font-semibold">
        Vérification de la session...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const normalizedRole = (user.role || '').trim();

  if (normalizedRole === 'it') {
    return <InformaticienPage onLogout={handleLogout} />;
  }

  if (
    normalizedRole === 'Admin1' ||
    normalizedRole === 'Admin 1' ||
    normalizedRole === 'Admin'
  ) {
    return <Admin1Page fullName={user.fullName} onLogout={handleLogout} />;
  }

  if (normalizedRole === 'Admin2' || normalizedRole === 'Admin 2') {
    return <Admin2Page fullName={user.fullName} onLogout={handleLogout} />;
  }

  if (
    normalizedRole === 'Chef_Equipe' ||
    normalizedRole === "Chef d'équipe" ||
    normalizedRole === "Chef d'Equipe" ||
    normalizedRole === 'Technicien'
  ) {
    return (
      <ChefEquipePage
        fullName={user.fullName}
        userId={user.id}
        userRole={normalizedRole}
        userZone={user.zone}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback for any custom role
  return (
    <DashboardPage
      role={user.role}
      fullName={user.fullName}
      onLogout={handleLogout}
    />
  );
}
