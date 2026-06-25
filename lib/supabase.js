import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE AYARLARI
// 1) https://supabase.com adresinde ücretsiz proje aç
// 2) Project Settings > API'den URL ve anon key'i buraya yapıştır
// 3) supabase/setup.sql dosyasındaki SQL'i SQL Editor'de çalıştır
// ─────────────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://chjxugwwgrdstkbyvwml.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoanh1Z3d3Z3Jkc3RrYnl2d21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjY4OTcsImV4cCI6MjA5NzkwMjg5N30.ZhXDDg80OsqwJFtI_vFzyr4QBZFwOucbteYa3aYrQcY';

export const isSupabaseConfigured =
  !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
