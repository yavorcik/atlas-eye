create table if not exists public.atlas_inquiry_delivery_guards (
  request_hash text primary key check (length(request_hash) = 64),
  client_hash text not null check (length(client_hash) = 64),
  correlation_id uuid not null unique,
  created_at timestamptz not null default now()
);
alter table public.atlas_inquiry_delivery_guards enable row level security;
revoke all on public.atlas_inquiry_delivery_guards from anon, authenticated;

create or replace function public.reserve_atlas_inquiry(p_request_hash text, p_client_hash text, p_correlation_id uuid)
returns table(accepted boolean, duplicate boolean, reference uuid)
language plpgsql security definer set search_path = public
as $$
declare existing uuid; recent_count integer;
begin
  if length(p_request_hash) <> 64 or length(p_client_hash) <> 64 then raise exception 'invalid guard'; end if;
  delete from public.atlas_inquiry_delivery_guards where created_at < now() - interval '24 hours';
  select correlation_id into existing from public.atlas_inquiry_delivery_guards where request_hash = p_request_hash;
  if existing is not null then return query select false, true, existing; return; end if;
  perform pg_advisory_xact_lock(hashtext(p_client_hash));
  select count(*) into recent_count from public.atlas_inquiry_delivery_guards where client_hash=p_client_hash and created_at > now()-interval '1 hour';
  if recent_count >= 5 then return query select false, false, p_correlation_id; return; end if;
  insert into public.atlas_inquiry_delivery_guards(request_hash,client_hash,correlation_id) values(p_request_hash,p_client_hash,p_correlation_id);
  return query select true, false, p_correlation_id;
end $$;
revoke all on function public.reserve_atlas_inquiry(text,text,uuid) from public, anon, authenticated;
grant execute on function public.reserve_atlas_inquiry(text,text,uuid) to service_role;

