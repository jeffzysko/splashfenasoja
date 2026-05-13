-- ============================================================
-- MIGRAÇÃO: Recebimento de Leads das Feiras (splashfenasoja)
-- Projeto: quintalideal (principal)
-- ============================================================
-- Esta tabela recebe leads coletados no sistema de feiras e os
-- centraliza no projeto principal para acompanhamento e CRM.

CREATE TABLE IF NOT EXISTS public.leads_feira (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rastreabilidade da origem
  lead_id          UUID,                             -- ID original no sistema de feiras
  feira_id         UUID,                             -- ID da feira no sistema de feiras
  feira_nome       TEXT,                             -- Nome da feira (ex: "FENASOJA 2026")
  feira_slug       TEXT,                             -- Slug (ex: "fenasoja2026")

  -- Dados do lead
  nome             TEXT        NOT NULL,
  whatsapp         TEXT        NOT NULL,
  email            TEXT,
  cidade           TEXT,
  estado           TEXT,
  tamanho_quintal  TEXT,                             -- 'pequeno' | 'medio' | 'grande'
  prazo_compra     TEXT,                             -- '3_meses' | '6_meses' | '1_ano' | ...
  orcamento        TEXT,                             -- faixa de orçamento
  score            INTEGER,                          -- pontuação calculada (0-100)
  temperatura      TEXT,                             -- 'quente' | 'morno' | 'frio'
  evento           TEXT,                             -- informações do evento/produto de interesse

  -- UTM / rastreamento de marketing
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,

  -- Metadados técnicos
  ip               TEXT,
  recebido_em      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CRM: campos adicionados pela equipe do quintalideal
  status           TEXT        NOT NULL DEFAULT 'novo'
                   CHECK (status IN ('novo', 'em_contato', 'negociando', 'convertido', 'perdido')),
  notas            TEXT,
  atribuido_a      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  contatado_em     TIMESTAMPTZ,
  convertido_em    TIMESTAMPTZ
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_leads_feira_recebido_em  ON public.leads_feira (recebido_em DESC);
CREATE INDEX IF NOT EXISTS idx_leads_feira_temperatura  ON public.leads_feira (temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_feira_status       ON public.leads_feira (status);
CREATE INDEX IF NOT EXISTS idx_leads_feira_slug         ON public.leads_feira (feira_slug);
CREATE INDEX IF NOT EXISTS idx_leads_feira_lead_id      ON public.leads_feira (lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_feira_atribuido_a  ON public.leads_feira (atribuido_a);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE public.leads_feira ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver todos os leads de feiras
CREATE POLICY "leads_feira_select"
  ON public.leads_feira FOR SELECT TO authenticated USING (true);

-- Apenas service_role insere (via Edge Function receber-lead-feira)
CREATE POLICY "leads_feira_insert_service"
  ON public.leads_feira FOR INSERT TO service_role WITH CHECK (true);

-- Usuários autenticados podem atualizar (status, notas, atribuição)
CREATE POLICY "leads_feira_update"
  ON public.leads_feira FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, UPDATE ON public.leads_feira TO authenticated;
GRANT INSERT        ON public.leads_feira TO service_role;

-- ============================================================
-- Comentários
-- ============================================================
COMMENT ON TABLE  public.leads_feira              IS 'Leads recebidos do sistema de feiras (splashfenasoja) via integração';
COMMENT ON COLUMN public.leads_feira.lead_id      IS 'UUID do lead no banco de dados do sistema de feiras';
COMMENT ON COLUMN public.leads_feira.feira_id     IS 'UUID da feira no banco de dados do sistema de feiras';
COMMENT ON COLUMN public.leads_feira.score        IS 'Score 0-100 calculado pelo sistema de feiras';
COMMENT ON COLUMN public.leads_feira.temperatura  IS 'quente (≥60) / morno (30-59) / frio (<30)';
COMMENT ON COLUMN public.leads_feira.status       IS 'Status CRM: novo → em_contato → negociando → convertido/perdido';
COMMENT ON COLUMN public.leads_feira.recebido_em  IS 'Momento em que o lead chegou ao quintalideal (pode diferir do created_at na feira)';
