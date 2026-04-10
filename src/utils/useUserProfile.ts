/**
 * useUserProfile.ts
 * 
 * Fetches/creates the user profile from Supabase auth metadata
 * and local storage. Provides name-personalisation to the agent.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { UserProfile, UserRole } from '../logic/types';

const STORAGE_KEY = 'pl_profile';

function defaultProfile(email: string, id: string): UserProfile {
  // Derive first name from email (before @)
  const name = email.split('@')[0].replace(/[._-]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return {
    id,
    name,
    email,
    role: 'Lawyer',
    createdAt: new Date().toISOString(),
    queryCount: 0,
  };
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return; }

      const user = session.user;
      // Try local cache first (instant load)
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const p = JSON.parse(cached) as UserProfile;
          if (p.id === user.id) { setProfile(p); setLoading(false); return; }
        }
      } catch {}

      // Build from auth metadata
      const p = defaultProfile(user.email || 'User', user.id);
      saveProfile(p);
      setProfile(p);
      setLoading(false);
    });
  }, []);

  function saveProfile(p: UserProfile) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
    setProfile(p);
  }

  function updateName(name: string) {
    if (!profile) return;
    const updated = { ...profile, name };
    saveProfile(updated);
  }

  function updateRole(role: UserRole) {
    if (!profile) return;
    const updated = { ...profile, role };
    saveProfile(updated);
  }

  function incrementQuery() {
    if (!profile) return;
    const updated = { ...profile, queryCount: profile.queryCount + 1 };
    saveProfile(updated);
  }

  return { profile, loading, updateName, updateRole, incrementQuery };
}
