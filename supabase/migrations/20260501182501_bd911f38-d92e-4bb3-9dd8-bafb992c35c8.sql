
create or replace function public.leads_dashboard_stats()
returns jsonb
language sql
stable
security invoker
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
  from public.leads;
$$;

-- índice para acelerar a contagem por status
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_temperatura on public.leads(temperatura);
create index if not exists idx_leads_created_at on public.leads(created_at desc);
