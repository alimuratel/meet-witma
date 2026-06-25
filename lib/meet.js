import { supabase } from './supabase';
import { uploadMedia } from './storage';

/*
 * Supabase SQL — run once in SQL Editor:
 *
 * create table if not exists meet_profiles (
 *   id uuid primary key default gen_random_uuid(),
 *   phone text unique not null,
 *   photos text[] default '{}',
 *   age int,
 *   gender text,        -- 'man' | 'woman' | 'other'
 *   bio text default '',
 *   interests text[] default '{}',
 *   looking_for text default 'everyone',  -- 'men' | 'women' | 'everyone'
 *   language text default 'en',
 *   active boolean default true,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 *
 * create table if not exists meet_likes (
 *   id uuid primary key default gen_random_uuid(),
 *   from_phone text not null,
 *   to_phone text not null,
 *   liked boolean default true,
 *   created_at timestamptz default now(),
 *   unique(from_phone, to_phone)
 * );
 *
 * create table if not exists meet_matches (
 *   id uuid primary key default gen_random_uuid(),
 *   phone1 text not null,
 *   phone2 text not null,
 *   room_id text not null,
 *   matched_at timestamptz default now(),
 *   unique(phone1, phone2)
 * );
 *
 * alter table meet_profiles enable row level security;
 * alter table meet_likes enable row level security;
 * alter table meet_matches enable row level security;
 * create policy "public_read" on meet_profiles for select using (true);
 * create policy "own_write" on meet_profiles for insert with check (true);
 * create policy "own_update" on meet_profiles for update using (true);
 * create policy "own_insert" on meet_likes for insert with check (true);
 * create policy "own_select" on meet_likes for select using (true);
 * create policy "own_select" on meet_matches for select using (true);
 * create policy "own_insert" on meet_matches for insert with check (true);
 */

export async function fetchMyMeetProfile(phone) {
  const { data } = await supabase.from('meet_profiles').select('*').eq('phone', phone).maybeSingle();
  return data || null;
}

export async function saveMeetProfile(profile) {
  const { data, error } = await supabase
    .from('meet_profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadMeetPhoto(uri) {
  const { uri: url } = await uploadMedia(uri, { room: 'meet-photos', name: 'photo.jpg', contentType: 'image/jpeg' });
  return url;
}

export async function fetchCards(myPhone, lookingFor) {
  const { data: swipedRaw } = await supabase
    .from('meet_likes')
    .select('to_phone')
    .eq('from_phone', myPhone);

  const excluded = [...(swipedRaw || []).map((r) => r.to_phone), myPhone];

  let q = supabase
    .from('meet_profiles')
    .select('*, users!meet_profiles_phone_fkey(name, avatar_url)')
    .eq('active', true)
    .order('last_active', { ascending: false })
    .limit(30);

  if (excluded.length) {
    q = q.not('phone', 'in', `(${excluded.join(',')})`);
  }
  if (lookingFor === 'men') q = q.eq('gender', 'man');
  else if (lookingFor === 'women') q = q.eq('gender', 'woman');

  const { data } = await q;
  return (data || []).map((p) => ({ ...p, name: p.users?.name || p.phone }));
}

export async function swipe(fromPhone, toPhone, liked) {
  await supabase
    .from('meet_likes')
    .upsert({ from_phone: fromPhone, to_phone: toPhone, liked }, { onConflict: 'from_phone,to_phone' });

  if (!liked) return { matched: false };

  const { data: mutual } = await supabase
    .from('meet_likes')
    .select('id')
    .eq('from_phone', toPhone)
    .eq('to_phone', fromPhone)
    .eq('liked', true)
    .maybeSingle();

  if (!mutual) return { matched: false };

  const phones = [fromPhone, toPhone].sort();
  const roomId = `meet:${phones[0]}:${phones[1]}`;
  await supabase
    .from('meet_matches')
    .upsert({ phone1: phones[0], phone2: phones[1], room_id: roomId }, { onConflict: 'phone1,phone2' });

  return { matched: true, roomId };
}

export async function fetchMatches(phone) {
  const { data: matches } = await supabase
    .from('meet_matches')
    .select('*')
    .or(`phone1.eq.${phone},phone2.eq.${phone}`)
    .order('matched_at', { ascending: false });

  if (!matches?.length) return [];

  const peerPhones = matches.map((m) => (m.phone1 === phone ? m.phone2 : m.phone1));
  const { data: profiles } = await supabase
    .from('meet_profiles')
    .select('*, users!meet_profiles_phone_fkey(name, avatar_url)')
    .in('phone', peerPhones);

  const profileMap = {};
  (profiles || []).forEach((p) => {
    profileMap[p.phone] = { ...p, name: p.users?.name || p.phone };
  });

  return matches.map((m) => {
    const peerPhone = m.phone1 === phone ? m.phone2 : m.phone1;
    return { ...m, peer: profileMap[peerPhone], roomId: m.room_id };
  });
}
