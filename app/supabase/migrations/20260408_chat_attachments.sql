create extension if not exists pgcrypto;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists public.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text null,
  byte_size bigint null,
  status text not null,
  sha256 text null,
  uploaded_at timestamptz null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  last_used_at timestamptz null
);

create index if not exists chat_attachments_session_id_idx
  on public.chat_attachments(session_id);

create index if not exists chat_attachments_status_idx
  on public.chat_attachments(status);

create index if not exists chat_attachments_deleted_at_idx
  on public.chat_attachments(deleted_at);
