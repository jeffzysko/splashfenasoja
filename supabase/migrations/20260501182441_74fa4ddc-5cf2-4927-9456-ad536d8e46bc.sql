
create or replace function public.leads_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'quentes', count(*) filter (where temperatura = 'quente'),
    'hoje', count(*) filter (where created_at >= (now() at time zone 'America/Sao_Paulo')::date at time zone 'America/Sao_Paulo'),
    'novo', count(*) filter (where status = 'novo'),
    'contatado', count(*) filter (where status = 'contatado'),
    'qualificado', count(*) filter (where status = 'qualificado'),
    'vendido', count(*) filter (where status = 'vendido'),
    'perdido', count(*) filter (where status = 'perdido'),
    'descartado', count(*) filter (where status = 'descartado')
  )
  from public.leads
  where public.has_any_role(auth.uid(), array['admin','master']::public.app_role[]);
$$;

revoke all on function public.leads_dashboard_stats() from public, anon;
grant execute on function public.leads_dashboard_stats() to authenticated;
