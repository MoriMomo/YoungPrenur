alter table public.audit_log
  add column if not exists workspace text,
  add column if not exists reviewer_id text;

alter table public.decision_status add column if not exists workspace text;

update public.decision_status
set workspace = split_part(action_id, '::', 1)
where workspace is null and strpos(action_id, '::') <> 0;

create index if not exists idx_decision_status_workspace on public.decision_status (workspace);

create index if not exists idx_audit_log_workspace_created_at
  on public.audit_log (workspace, created_at desc);

drop policy if exists "decision_status_public_read" on public.decision_status;
drop policy if exists "audit_log_public_read" on public.audit_log;
revoke all on public.decision_status, public.audit_log from anon, authenticated;

create or replace function public.record_decision_review(
  entry jsonb, status_key text, review_status text
) returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.decision_status (
    action_id, workspace, flagged, status, decision, reviewer_role, notes, updated_at
  ) values (
    status_key, entry->>'workspace', true, review_status, entry->>'decision', entry->>'reviewer_role',
    entry->>'notes', (entry->>'timestamp')::timestamptz
  )
  on conflict (action_id) do update set
    workspace = excluded.workspace,
    flagged = excluded.flagged,
    status = excluded.status,
    decision = excluded.decision,
    reviewer_role = excluded.reviewer_role,
    notes = excluded.notes,
    updated_at = excluded.updated_at;

  insert into public.audit_log (
    id, workspace, action_id, action_title, decision, reviewer_id, reviewer_role, notes, sop_ref, timestamp
  ) values (
    entry->>'id', entry->>'workspace', entry->>'action_id', entry->>'action_title',
    entry->>'decision', entry->>'reviewer_id', entry->>'reviewer_role',
    entry->>'notes', entry->>'sop_ref', entry->>'timestamp'
  );
end;
$$;

revoke execute on function public.record_decision_review(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.record_decision_review(jsonb, text, text) to service_role;
