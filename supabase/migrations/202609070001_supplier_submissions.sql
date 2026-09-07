-- Private intake only. Public directory content remains explicitly editorially published.
create table public.atlas_supplier_submissions (
  id uuid primary key default gen_random_uuid(),
  request_hash text not null unique check (request_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16384),
  status text not null default 'pending' check (status in ('pending', 'needs_information', 'accepted', 'rejected', 'published')),
  created_at timestamptz not null default now()
);
create index atlas_supplier_email_time on public.atlas_supplier_submissions(email_hash, created_at);
create index atlas_supplier_created on public.atlas_supplier_submissions(created_at);
alter table public.atlas_supplier_submissions enable row level security;
revoke all on public.atlas_supplier_submissions from public, anon, authenticated;
grant select, insert, update on public.atlas_supplier_submissions to service_role;

create table public.atlas_supplier_review_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.atlas_supplier_submissions(id),
  reviewer text not null check (length(reviewer) between 1 and 160),
  action text not null check (action in ('needs_information', 'accepted', 'rejected', 'published')),
  notes text not null check (length(notes) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.atlas_supplier_review_events enable row level security;
revoke all on public.atlas_supplier_review_events from public, anon, authenticated;
grant select, insert on public.atlas_supplier_review_events to service_role;

create function public.submit_atlas_supplier(p_request_hash text, p_email_hash text, p_payload_hash text, p_payload jsonb)
returns table(outcome text, reference uuid)
language plpgsql security definer set search_path = ''
as $$
declare existing public.atlas_supplier_submissions%rowtype; new_id uuid;
begin
  if p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$'
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or octet_length(p_payload::text) > 16384 then raise exception 'invalid submission'; end if;
  -- Serialize the short intake transaction: rate limits and retry receipts stay atomic.
  perform pg_advisory_xact_lock(719307221);
  select * into existing from public.atlas_supplier_submissions where request_hash = p_request_hash;
  if found then
    if existing.payload_hash <> p_payload_hash then return query select 'conflict'::text, null::uuid;
    else return query select 'duplicate'::text, existing.id; end if;
    return;
  end if;
  if (select count(*) from public.atlas_supplier_submissions where email_hash = p_email_hash and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.atlas_supplier_submissions where created_at > now() - interval '1 hour') >= 100 then
    return query select 'limited'::text, null::uuid; return;
  end if;
  insert into public.atlas_supplier_submissions(request_hash, email_hash, payload_hash, payload)
    values(p_request_hash, p_email_hash, p_payload_hash, p_payload) returning id into new_id;
  return query select 'created'::text, new_id;
end $$;
revoke all on function public.submit_atlas_supplier(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_atlas_supplier(text,text,text,jsonb) to service_role;
