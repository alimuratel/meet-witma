-- ════════════════════════════════════════════════════════════════════
--  MEET WITMA — Production Schema (100k concurrent user ready)
--  Supabase SQL Editor'de çalıştır
--  Tüm index'ler, trigger'lar, RPC fonksiyonları dahil
-- ════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "pg_trgm";   -- trigram search (bio/name)
create extension if not exists "unaccent";   -- türkçe karakter arama

-- ── 1. USERS ──────────────────────────────────────────────────────
create table if not exists users (
  phone      text primary key,
  name       text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_users_updated on users(updated_at desc);

-- ── 2. MEET PROFILES ──────────────────────────────────────────────
create table if not exists meet_profiles (
  phone          text primary key references users(phone) on delete cascade,
  photos         text[]   default '{}',
  age            int      check (age >= 18 and age <= 99),
  gender         text     default 'other',       -- 'man' | 'woman' | 'other'
  bio            text     default '',
  interests      text[]   default '{}',
  looking_for    text     default 'everyone',    -- 'men' | 'women' | 'everyone'
  language       text     default 'en',
  location_city  text,
  active         boolean  default true,
  verified       boolean  default false,
  premium_tier   text,                           -- null | 'plus' | 'gold' | 'platinum'
  premium_expires timestamptz,
  last_active    timestamptz default now(),
  boost_expires  timestamptz,                    -- aktif boost süresi
  swipe_count    int      default 0,             -- günlük swipe sayacı (reset ile)
  swipe_reset_at timestamptz default now(),      -- günlük reset zamanı
  push_token     text,                           -- Expo push notification token
  updated_at     timestamptz default now()
);
-- Swipe candidates: aktif, son aktif önce
create index if not exists idx_profiles_active_last  on meet_profiles(last_active desc)     where active = true;
-- Gender filter
create index if not exists idx_profiles_gender       on meet_profiles(gender)               where active = true;
-- Premium boost: boost_expires olan profiller
create index if not exists idx_profiles_boost        on meet_profiles(boost_expires desc nulls last) where active = true;
-- Full text search on bio
create index if not exists idx_profiles_bio_trgm     on meet_profiles using gin(bio gin_trgm_ops);

-- ── 3. SWIPES / LIKES ─────────────────────────────────────────────
create table if not exists meet_likes (
  id          uuid primary key default gen_random_uuid(),
  from_phone  text not null references users(phone) on delete cascade,
  to_phone    text not null references users(phone) on delete cascade,
  liked       boolean not null,
  super_liked boolean default false,
  created_at  timestamptz default now(),
  unique(from_phone, to_phone)
);
-- Mutual like check: (to_phone, liked=true) → sık kullanılır
create index if not exists idx_likes_mutual  on meet_likes(to_phone, liked) where liked = true;
-- My swipe history
create index if not exists idx_likes_from    on meet_likes(from_phone, created_at desc);
-- Who liked me (beğenenler ekranı)
create index if not exists idx_likes_to_all  on meet_likes(to_phone, created_at desc);

-- ── 4. MATCHES ────────────────────────────────────────────────────
create table if not exists meet_matches (
  id         uuid primary key default gen_random_uuid(),
  phone1     text not null references users(phone) on delete cascade,
  phone2     text not null references users(phone) on delete cascade,
  room_id    text unique not null,
  matched_at timestamptz default now(),
  unique(phone1, phone2)
);
-- Conversation list queries (her iki yön)
create index if not exists idx_matches_p1_time on meet_matches(phone1, matched_at desc);
create index if not exists idx_matches_p2_time on meet_matches(phone2, matched_at desc);
create index if not exists idx_matches_room    on meet_matches(room_id);

-- ── 5. MESSAGES ───────────────────────────────────────────────────
create table if not exists meet_messages (
  id            uuid primary key default gen_random_uuid(),
  room_id       text not null references meet_matches(room_id) on delete cascade,
  sender_phone  text not null references users(phone) on delete cascade,
  text          text not null,
  original_text text,           -- WITMA: orijinal dil (çeviri öncesi)
  media_url     text,           -- fotoğraf/video mesaj
  msg_type      text default 'text',  -- 'text' | 'image' | 'gif'
  seen          boolean default false,
  seen_at       timestamptz,
  created_at    timestamptz default now()
);
-- Ana mesaj sorgusu
create index if not exists idx_messages_room_time on meet_messages(room_id, created_at asc);
-- Okunmamış sayısı
create index if not exists idx_messages_unseen    on meet_messages(room_id, sender_phone) where seen = false;

-- ── 6. BLOCKS ─────────────────────────────────────────────────────
create table if not exists meet_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker    text not null references users(phone) on delete cascade,
  blocked    text not null references users(phone) on delete cascade,
  created_at timestamptz default now(),
  unique(blocker, blocked)
);
create index if not exists idx_blocks_blocker on meet_blocks(blocker);
create index if not exists idx_blocks_blocked on meet_blocks(blocked);

-- ── 7. REPORTS ────────────────────────────────────────────────────
create table if not exists meet_reports (
  id         uuid primary key default gen_random_uuid(),
  reporter   text not null references users(phone) on delete cascade,
  reported   text not null references users(phone) on delete cascade,
  reason     text not null,
  details    text,
  status     text default 'pending',   -- 'pending' | 'reviewed' | 'actioned'
  created_at timestamptz default now()
);
create index if not exists idx_reports_status on meet_reports(status, created_at desc);

-- ── 8. CONSENT LOGS (KVKK zorunlu) ───────────────────────────────
create table if not exists consent_logs (
  id             uuid primary key default gen_random_uuid(),
  phone          text,
  session_id     text,
  necessary      boolean default true,
  analytics      boolean default false,
  marketing      boolean default false,
  preference     boolean default false,
  kvkk_accepted  boolean default false,
  terms_accepted boolean default false,
  ip_hash        text,
  user_agent     text,
  created_at     timestamptz default now()
);
create index if not exists idx_consent_phone on consent_logs(phone);

-- ── 9. PUSH TOKENS ────────────────────────────────────────────────
create table if not exists meet_push_tokens (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null references users(phone) on delete cascade,
  token      text not null unique,
  platform   text,   -- 'ios' | 'android' | 'web'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_push_phone on meet_push_tokens(phone);

-- ════════════════════════════════════════════════════════════════════
--  TRIGGERS
-- ════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
create or replace function _set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated') then
    create trigger trg_users_updated before update on users
      for each row execute function _set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated') then
    create trigger trg_profiles_updated before update on meet_profiles
      for each row execute function _set_updated_at();
  end if;
end $$;

-- Update last_active when user sends a message
create or replace function _msg_update_last_active()
returns trigger language plpgsql security definer as $$
begin
  update meet_profiles set last_active = now()
  where phone = NEW.sender_phone;
  return NEW;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_msg_last_active') then
    create trigger trg_msg_last_active after insert on meet_messages
      for each row execute function _msg_update_last_active();
  end if;
end $$;

-- Auto-set seen_at when seen flag changes
create or replace function _msg_seen_at()
returns trigger language plpgsql as $$
begin
  if NEW.seen = true and OLD.seen = false then
    NEW.seen_at := now();
  end if;
  return NEW;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_msg_seen_at') then
    create trigger trg_msg_seen_at before update on meet_messages
      for each row execute function _msg_seen_at();
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════
--  RPC FUNCTIONS  (N+1 query olmadan, tek sorguda)
-- ════════════════════════════════════════════════════════════════════

-- ── Swipe candidates (boost önce, sonra last_active) ──────────────
create or replace function get_swipe_candidates(me text, lim int default 20)
returns table (
  phone         text, photos text[], age int, gender text, bio text,
  interests     text[], language text, location_city text,
  premium_tier  text, verified boolean, last_active timestamptz,
  user_name     text
)
language sql stable security definer
set statement_timeout = '3s'
as $$
  select
    p.phone, p.photos, p.age, p.gender, p.bio,
    p.interests, p.language, p.location_city,
    p.premium_tier, p.verified, p.last_active,
    u.name as user_name
  from meet_profiles p
  join users u on u.phone = p.phone
  where p.phone != me
    and p.active = true
    and p.phone not in (
      select to_phone from meet_likes where from_phone = me
    )
    and p.phone not in (
      select blocked from meet_blocks where blocker = me
      union all
      select blocker from meet_blocks where blocked = me
    )
  order by
    case when p.boost_expires > now() then 0 else 1 end,
    case when p.premium_tier is not null then 0 else 1 end,
    p.last_active desc nulls last
  limit lim;
$$;

-- ── Atomic swipe + match detection ────────────────────────────────
create or replace function record_swipe(
  from_p    text,
  to_p      text,
  is_liked  bool,
  is_super  bool default false
)
returns json
language plpgsql security definer
set statement_timeout = '5s'
as $$
declare
  mutual   bool := false;
  room     text;
  match_id uuid;
begin
  -- Swipe'ı kaydet (duplicate ignore)
  insert into meet_likes(from_phone, to_phone, liked, super_liked)
  values (from_p, to_p, is_liked, is_super)
  on conflict (from_phone, to_phone) do nothing;

  if not is_liked then
    return json_build_object('matched', false);
  end if;

  -- Mutual check
  select exists(
    select 1 from meet_likes
    where from_phone = to_p and to_phone = from_p and liked = true
  ) into mutual;

  if mutual then
    -- Room ID: iki phone sıralı concat
    room := 'meet_' || least(from_p, to_p) || '_' || greatest(from_p, to_p);

    insert into meet_matches(phone1, phone2, room_id)
    values (least(from_p, to_p), greatest(from_p, to_p), room)
    on conflict (phone1, phone2) do nothing
    returning id into match_id;

    return json_build_object(
      'matched', true,
      'room_id', room,
      'match_id', match_id
    );
  end if;

  return json_build_object('matched', false);
end;
$$;

-- ── Conversation list (tek sorguda, N+1 yok) ──────────────────────
create or replace function get_conversations(me text, lim int default 30)
returns table (
  room_id       text,
  matched_at    timestamptz,
  peer_phone    text,
  peer_name     text,
  peer_photo    text,
  last_text     text,
  last_at       timestamptz,
  last_mine     bool,
  unread_count  int
)
language sql stable security definer
set statement_timeout = '5s'
as $$
  select
    m.room_id,
    m.matched_at,
    case when m.phone1 = me then m.phone2 else m.phone1 end  as peer_phone,
    u.name                                                    as peer_name,
    (p.photos)[1]                                             as peer_photo,
    msg.text                                                  as last_text,
    msg.created_at                                            as last_at,
    (msg.sender_phone = me)                                   as last_mine,
    coalesce(uc.cnt, 0)::int                                  as unread_count
  from meet_matches m
  join users u
    on u.phone = case when m.phone1 = me then m.phone2 else m.phone1 end
  join meet_profiles p
    on p.phone = case when m.phone1 = me then m.phone2 else m.phone1 end
  left join lateral (
    select text, created_at, sender_phone
    from meet_messages
    where room_id = m.room_id
    order by created_at desc
    limit 1
  ) msg on true
  left join lateral (
    select count(*)::int as cnt
    from meet_messages
    where room_id = m.room_id and sender_phone != me and seen = false
  ) uc on true
  where m.phone1 = me or m.phone2 = me
  order by coalesce(msg.created_at, m.matched_at) desc
  limit lim;
$$;

-- ── Who liked me (premium: beğenenler ekranı) ─────────────────────
create or replace function get_my_likers(me text, lim int default 50)
returns table (
  phone        text,
  user_name    text,
  photo        text,
  super_liked  bool,
  liked_at     timestamptz
)
language sql stable security definer as $$
  select l.from_phone, u.name, (p.photos)[1], l.super_liked, l.created_at
  from meet_likes l
  join users u on u.phone = l.from_phone
  join meet_profiles p on p.phone = l.from_phone
  where l.to_phone = me and l.liked = true
  order by l.super_liked desc, l.created_at desc
  limit lim;
$$;

-- ── Daily swipe limit reset ────────────────────────────────────────
create or replace function check_daily_swipe(me text, daily_limit int default 20)
returns json language plpgsql security definer as $$
declare
  p meet_profiles%rowtype;
begin
  select * into p from meet_profiles where phone = me;
  if p.premium_tier is not null then
    return json_build_object('allowed', true, 'remaining', 99999);
  end if;
  -- Reset if new day
  if p.swipe_reset_at < date_trunc('day', now()) then
    update meet_profiles set swipe_count = 0, swipe_reset_at = now() where phone = me;
    p.swipe_count := 0;
  end if;
  if p.swipe_count >= daily_limit then
    return json_build_object('allowed', false, 'remaining', 0);
  end if;
  update meet_profiles set swipe_count = swipe_count + 1 where phone = me;
  return json_build_object('allowed', true, 'remaining', daily_limit - p.swipe_count - 1);
end;
$$;

-- ════════════════════════════════════════════════════════════════════
--  RLS (Row Level Security)
-- ════════════════════════════════════════════════════════════════════

alter table users           enable row level security;
alter table meet_profiles   enable row level security;
alter table meet_likes      enable row level security;
alter table meet_matches    enable row level security;
alter table meet_messages   enable row level security;
alter table meet_blocks     enable row level security;
alter table meet_reports    enable row level security;
alter table consent_logs    enable row level security;
alter table meet_push_tokens enable row level security;

-- Drop existing policies (idempotent)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public'
    and tablename in ('users','meet_profiles','meet_likes','meet_matches','meet_messages','meet_blocks','meet_reports','consent_logs','meet_push_tokens')
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- users
create policy "users_read"   on users for select using (true);
create policy "users_insert" on users for insert with check (true);
create policy "users_update" on users for update using (
  auth.uid()::text = phone or auth.role() = 'service_role'
);

-- profiles: aktif profiller herkese görünür, sadece sahip değiştirebilir
create policy "profiles_read"   on meet_profiles for select using (active = true);
create policy "profiles_insert" on meet_profiles for insert with check (true);
create policy "profiles_update" on meet_profiles for update using (
  auth.uid()::text = phone or auth.role() = 'service_role'
);

-- likes
create policy "likes_insert" on meet_likes for insert with check (true);
create policy "likes_read"   on meet_likes for select using (
  from_phone = auth.uid()::text or to_phone = auth.uid()::text
);

-- matches: sadece ilgili iki kişi
create policy "matches_insert" on meet_matches for insert with check (true);
create policy "matches_read"   on meet_matches for select using (
  phone1 = auth.uid()::text or phone2 = auth.uid()::text
);

-- messages: aynı room'dakiler
create policy "msg_insert" on meet_messages for insert with check (true);
create policy "msg_read"   on meet_messages for select using (
  room_id in (
    select room_id from meet_matches
    where phone1 = auth.uid()::text or phone2 = auth.uid()::text
  )
);
create policy "msg_update" on meet_messages for update using (
  room_id in (
    select room_id from meet_matches
    where phone1 = auth.uid()::text or phone2 = auth.uid()::text
  )
);

-- blocks / reports
create policy "blocks_insert"  on meet_blocks  for insert with check (true);
create policy "blocks_read"    on meet_blocks  for select using (blocker = auth.uid()::text);
create policy "reports_insert" on meet_reports for insert with check (true);

-- consent
create policy "consent_insert" on consent_logs for insert with check (true);
create policy "consent_read"   on consent_logs for select using (
  phone = auth.uid()::text or auth.role() = 'service_role'
);

-- push tokens
create policy "push_insert" on meet_push_tokens for insert with check (true);
create policy "push_read"   on meet_push_tokens for select using (phone = auth.uid()::text);
create policy "push_delete" on meet_push_tokens for delete using (phone = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
--  STORAGE — meet-media bucket
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'meet-media', 'meet-media', true,
    10485760,   -- 10 MB max dosya boyutu
    array['image/jpeg','image/png','image/webp','image/gif','video/mp4']
  )
  on conflict (id) do update set
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies
do $$ begin
  drop policy if exists "meet_media_read"   on storage.objects;
  drop policy if exists "meet_media_insert" on storage.objects;
  drop policy if exists "meet_media_delete" on storage.objects;
exception when others then null; end $$;

create policy "meet_media_read"
  on storage.objects for select using (bucket_id = 'meet-media');

create policy "meet_media_insert"
  on storage.objects for insert with check (
    bucket_id = 'meet-media'
    and char_length(name) < 200
  );

create policy "meet_media_delete"
  on storage.objects for delete using (
    bucket_id = 'meet-media'
    and (storage.foldername(name))[1] = 'profiles'
    and auth.uid()::text = split_part((storage.filename(name)), '_', 1)
  );

-- ════════════════════════════════════════════════════════════════════
--  REALTIME — meet_messages için enable
--  Dashboard → Database → Replication → meet_messages ENABLE
-- ════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════
--  PLAN NOTLARI (100k kullanıcı için)
-- ════════════════════════════════════════════════════════════════════
-- Free tier:  500 DB connections, 200 Realtime connections → geliştirme için yeterli
-- Pro ($25):  5000 DB connections, 10k Realtime → ~50k aktif kullanıcı
-- Team ($599): sınırsız → 100k+ concurrent
-- Enterprise: SLA, dedicated infra
--
-- Connection pooler: supabase.com → Settings → Database → Connection Pooling
-- Transaction mode kullan (Supavisor): port 6543
-- Her deploy'da app.js'teki SUPABASE_URL zaten PostgREST üzerinden gidiyor,
-- direkt DB connection değil → otomatik pooling ✓
-- ════════════════════════════════════════════════════════════════════
