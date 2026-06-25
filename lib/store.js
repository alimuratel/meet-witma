import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { kv } from './kv';

const KEY_PROFILE = 'meet:profile';
const KEY_SETTINGS = 'meet:settings';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({ writeLang: 'en', theme: 'dark' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      kv.get(KEY_PROFILE),
      kv.get(KEY_SETTINGS),
    ]).then(([p, s]) => {
      if (p) setProfile(p);
      if (s) setSettings((prev) => ({ ...prev, ...s }));
      setReady(true);
    });
  }, []);

  const registerProfile = useCallback(async ({ phone, name, avatar }) => {
    const next = { phone, name, avatar: avatar || null };
    await kv.set(KEY_PROFILE, next);
    await supabase.from('users').upsert({ phone, name, avatar_url: avatar || null }, { onConflict: 'phone' });
    setProfile(next);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const next = { ...profile, ...patch };
    await kv.set(KEY_PROFILE, next);
    await supabase.from('users').upsert(
      { phone: next.phone, name: next.name, avatar_url: next.avatar || null, updated_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
    setProfile(next);
  }, [profile]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      kv.set(KEY_SETTINGS, next);
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    await kv.remove(KEY_PROFILE);
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <Ctx.Provider value={{ profile, settings, ready, registerProfile, updateProfile, updateSettings, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
