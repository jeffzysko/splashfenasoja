-- Adiciona campos mornos e frios ao retorno de leads_dashboard_stats
DROP FUNCTION IF EXISTS public.leads_dashboard_stats(uuid);

CREATE OR REPLACE FUNCTION public.leads_dashboard_stats(p_feira_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',       count(*),
    'quentes',     count(*) FILTER (WHERE temperatura = 'quente'),
    'mornos',      count(*) FILTER (WHERE temperatura = 'morno'),
    'frios',       count(*) FILTER (WHERE temperatura = 'frio'),
    'hoje',        count(*) FILTER (WHERE created_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo'),
    'novo',        count(*) FILTER (WHERE status = 'novo'),
    'contatado',   count(*) FILTER (WHERE status = 'contatado'),
    'qualificado', count(*) FILTER (WHERE status = 'qualificado'),
    'vendido',     count(*) FILTER (WHERE status = 'vendido'),
    'perdido',     count(*) FILTER (WHERE status = 'perdido'),
    'descartado',  count(*) FILTER (WHERE status = 'descartado')
  )
  FROM public.leads
  WHERE (p_feira_id IS NULL OR feira_id = p_feira_id);
$$;

REVOKE ALL ON FUNCTION public.leads_dashboard_stats(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.leads_dashboard_stats(UUID) TO authenticated;
