-- MDIP Manufacturing Decision Intelligence Platform Schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mkurfdbznwhgocecombq/sql/new

create table if not exists public.active_schedule (
  id bigint primary key check (id = 1),
  filename text not null,
  project_name text not null,
  analysis_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.iroom_records (
  stream text not null,
  record_id text not null,
  sort_order integer not null default 0,
  payload_json jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (stream, record_id)
);

create table if not exists public.sop_documents (
  doc_code text primary key,
  title text not null,
  clause text not null,
  keywords_json jsonb not null default '[]'::jsonb,
  excerpt text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.decision_status (
  action_id text primary key,
  flagged boolean not null default true,
  status text not null,
  decision text not null,
  reviewer_role text not null,
  notes text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id text primary key,
  action_id text not null,
  action_title text not null,
  decision text not null,
  reviewer_role text not null,
  notes text not null,
  sop_ref text not null,
  timestamp text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_iroom_records_stream_order
  on public.iroom_records (stream, sort_order);

create index if not exists idx_audit_log_created_at
  on public.audit_log (created_at desc);

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text not null,
  role text not null,
  password_hash text not null,
  salt text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email
  on public.users (email);

-- Enable Row Level Security across all exposed tables
alter table public.active_schedule enable row level security;
alter table public.iroom_records enable row level security;
alter table public.sop_documents enable row level security;
alter table public.decision_status enable row level security;
alter table public.audit_log enable row level security;
alter table public.users enable row level security;

-- Grant read-only Data API access on non-sensitive operational tables; users stays service_role-only
grant select on public.active_schedule, public.iroom_records, public.sop_documents, public.decision_status, public.audit_log to anon, authenticated;
grant all on public.active_schedule, public.iroom_records, public.sop_documents, public.decision_status, public.audit_log, public.users to service_role;

drop policy if exists "active_schedule_public_read" on public.active_schedule;
create policy "active_schedule_public_read" on public.active_schedule
  for select to anon, authenticated using (true);

drop policy if exists "iroom_records_public_read" on public.iroom_records;
create policy "iroom_records_public_read" on public.iroom_records
  for select to anon, authenticated using (true);

drop policy if exists "sop_documents_public_read" on public.sop_documents;
create policy "sop_documents_public_read" on public.sop_documents
  for select to anon, authenticated using (true);

drop policy if exists "decision_status_public_read" on public.decision_status;
create policy "decision_status_public_read" on public.decision_status
  for select to anon, authenticated using (true);

drop policy if exists "audit_log_public_read" on public.audit_log;
create policy "audit_log_public_read" on public.audit_log
  for select to anon, authenticated using (true);
