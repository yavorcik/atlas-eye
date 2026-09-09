create table if not exists public.owner_activity_events (
  event_id text primary key check (char_length(event_id) between 8 and 180),
  site text not null check (site in ('atlas-eye', 'yavorcik-medmal', 'valley-smr', 'atlas-supplier-intake', 'owner-notifications')),
  event_type text not null check (event_type in ('page_view', 'click', 'download', 'inquiry', 'signup', 'supplier_submission', 'supplier_review', 'upload', 'project_change', 'access_change', 'processing_failure', 'delivery_failure', 'owner_test', 'daily_digest')),
  occurred_at timestamptz not null,
  reference text,
  path text,
  next_action text,
  created_at timestamptz not null default clock_timestamp(),
  check (reference is null or char_length(reference) <= 180),
  check (path is null or (char_length(path) <= 300 and path not like '%?%' and path not like '%#%')),
  check (next_action is null or char_length(next_action) <= 300)
);

create table if not exists public.owner_notification_deliveries (
  event_id text primary key references public.owner_activity_events(event_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 50),
  next_attempt_at timestamptz not null default clock_timestamp(),
  provider_id text,
  last_error_code text,
  claimed_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists public.owner_activity_sources (
  site text primary key check (site in ('atlas-eye', 'yavorcik-medmal', 'valley-smr')),
  collection_started_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.owner_activity_events enable row level security;
alter table public.owner_notification_deliveries enable row level security;
alter table public.owner_activity_sources enable row level security;
revoke all on public.owner_activity_events from anon, authenticated;
revoke all on public.owner_notification_deliveries from anon, authenticated;
revoke all on public.owner_activity_sources from anon, authenticated;

create or replace function public.claim_owner_notification(p_event_id text)
returns table(event_id text, attempts integer)
language sql
security definer
set search_path = public
as $$
  update public.owner_notification_deliveries
     set status = 'sending',
         attempts = attempts + 1,
         claimed_at = clock_timestamp(),
         updated_at = clock_timestamp()
   where owner_notification_deliveries.event_id = p_event_id
     and status <> 'sent'
     and next_attempt_at <= clock_timestamp()
     and (status <> 'sending' or claimed_at < clock_timestamp() - interval '10 minutes')
  returning owner_notification_deliveries.event_id, owner_notification_deliveries.attempts;
$$;
revoke all on function public.claim_owner_notification(text) from public, anon, authenticated;
grant execute on function public.claim_owner_notification(text) to service_role;

create index if not exists owner_activity_events_digest_idx
  on public.owner_activity_events (occurred_at, site, event_type)
  where event_type in ('page_view', 'click', 'download');
create index if not exists owner_notification_retry_idx
  on public.owner_notification_deliveries (status, next_attempt_at)
  where status <> 'sent';

comment on table public.owner_activity_events is
  'Minimal owner activity and aggregate analytics. Never stores form contents, credentials, document names, private review notes, query strings, IP addresses, or browser fingerprints.';
