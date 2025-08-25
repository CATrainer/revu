-- Minimal schema for Phase 1
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  account_type text not null default 'waiting', -- waiting | demo | full | admin
  account_tier text, -- individual | organization
  parent_account_id uuid references users(id) on delete set null,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  platforms text[] not null default '{}',
  voice_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists platform_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references creator_profiles(id) on delete cascade,
  platform text not null, -- youtube | tiktok | instagram
  tokens jsonb not null,
  last_sync timestamptz
);

create table if not exists content_uploads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references creator_profiles(id) on delete cascade,
  platform text not null,
  title text not null,
  url text,
  posted_at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references content_uploads(id) on delete cascade,
  author text,
  text text not null,
  sentiment text, -- positive | neutral | negative
  replied boolean default false,
  created_at timestamptz default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  text text not null,
  sent_at timestamptz,
  ai_generated boolean default true,
  created_at timestamptz default now()
);

create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references creator_profiles(id) on delete cascade,
  competitor_handle text not null,
  platform text not null
);
