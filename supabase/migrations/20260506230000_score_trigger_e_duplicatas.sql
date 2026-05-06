-- ============================================================
-- 1. FUNÇÃO: calcular score exatamente como o frontend faz
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_lead_score(
  p_prazo_compra    TEXT,
  p_orcamento       TEXT,
  p_email           TEXT,
  p_tamanho_quintal TEXT
)
RETURNS INT
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT LEAST(100, (
    -- prazo_compra (0-40)
    CASE p_prazo_compra
      WHEN '30dias'      THEN 40
      WHEN '3meses'      THEN 25
      WHEN '6meses+'     THEN 10
      WHEN 'Pesquisando' THEN  0
      ELSE 0
    END
    +
    -- orcamento (5-30)
    CASE p_orcamento
      WHEN '>100k'    THEN 30
      WHEN '50-100k'  THEN 25
      WHEN '25-50k'   THEN 15
      WHEN '<25k'     THEN 10
      WHEN 'Conversar' THEN  5
      ELSE 0
    END
    +
    -- email presente: +15
    CASE WHEN p_email IS NOT NULL AND trim(p_email) <> '' THEN 15 ELSE 0 END
    +
    -- tamanho_quintal presente e informado: +15
    CASE WHEN p_tamanho_quintal IS NOT NULL
              AND trim(p_tamanho_quintal) <> ''
              AND p_tamanho_quintal <> 'Não sei medir'
         THEN 15 ELSE 0 END
  ))::INT;
$$;

-- ============================================================
-- 2. TRIGGER: recalcular score e temperatura automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_leads_set_score()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
DECLARE
  v_score INT;
BEGIN
  v_score := public.calc_lead_score(
    NEW.prazo_compra,
    NEW.orcamento,
    NEW.email,
    NEW.tamanho_quintal
  );

  NEW.score       := v_score;
  NEW.temperatura := CASE
    WHEN v_score >= 70 THEN 'quente'
    WHEN v_score >= 40 THEN 'morno'
    ELSE                    'frio'
  END;

  RETURN NEW;
END;
$$;

-- Aplica no INSERT (score inicial) e UPDATE dos campos relevantes
DROP TRIGGER IF EXISTS trg_leads_set_score ON public.leads;
CREATE TRIGGER trg_leads_set_score
  BEFORE INSERT OR UPDATE OF prazo_compra, orcamento, email, tamanho_quintal
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_leads_set_score();

-- ============================================================
-- 3. FUNÇÃO: normalizar telefone (remove tudo que não for dígito)
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p, ''), '\D', '', 'g');
$$;

-- ============================================================
-- 4. TRIGGER: detectar lead duplicado (mesmo WhatsApp + feira)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_leads_check_duplicate()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  -- Procura lead existente com mesmo telefone na mesma feira
  SELECT id INTO v_existing
  FROM public.leads
  WHERE public.normalize_phone(whatsapp) = public.normalize_phone(NEW.whatsapp)
    AND (
      -- Mesma feira: ambos têm feira_id e são iguais
      (feira_id IS NOT NULL AND NEW.feira_id IS NOT NULL AND feira_id = NEW.feira_id)
      OR
      -- Sem feira: ambos são NULL (fallback para sistema legado)
      (feira_id IS NULL AND NEW.feira_id IS NULL)
    )
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Código P0002 = lead duplicado. O frontend detecta e trata com mensagem amigável.
    RAISE EXCEPTION 'LEAD_DUPLICATE' USING ERRCODE = 'P0002', DETAIL = v_existing::TEXT;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_check_duplicate ON public.leads;
CREATE TRIGGER trg_leads_check_duplicate
  BEFORE INSERT
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_leads_check_duplicate();

-- ============================================================
-- 5. BACKFILL: recalcular score de todos os leads existentes
-- ============================================================
UPDATE public.leads
SET
  score = public.calc_lead_score(prazo_compra, orcamento, email, tamanho_quintal),
  temperatura = CASE
    WHEN public.calc_lead_score(prazo_compra, orcamento, email, tamanho_quintal) >= 70 THEN 'quente'
    WHEN public.calc_lead_score(prazo_compra, orcamento, email, tamanho_quintal) >= 40 THEN 'morno'
    ELSE 'frio'
  END;
