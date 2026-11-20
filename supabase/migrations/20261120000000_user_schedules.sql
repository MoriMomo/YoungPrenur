-- Each signed-in user gets their own schedule analysis instead of one shared active schedule.
-- Private to the backend: no anon/authenticated access, only the service role the API uses.
create table if not exists public.user_schedules (
  user_id text primary key,
  filename text not null,
  project_name text not null,
  analysis_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_schedules enable row level security;
grant all on public.user_schedules to service_role;

-- Uploads used to be mirrored into the shared IRoom progress stream; they are per user now.
delete from public.iroom_records where stream = 'progress' and record_id = 'prj-active';
