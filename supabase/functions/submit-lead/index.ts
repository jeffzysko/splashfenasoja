import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: máximo de submissões por IP por janela de tempo
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MINUTES = 60;

// ─── Integração com o projeto principal (quintalideal) ───────────────────────
async function syncLeadToQuintal(payload: {
  lead_id: string;
  feira_id: string | null;
  feira_nome: string | null;
  feira_slug: string | null;
  origin_franquia_ids: string[];
  nome: string;
  whatsapp: string;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  tamanho_quintal: string | null;
  prazo_compra: string | null;
  orcamento: string | null;
  score: number | null;
  temperatura: string | null;
  evento: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip: string;
}) {
  const quintalUrl = Deno.env.get("QUINTAL_URL");
  const quintalSecret = Deno.env.get("QUINTAL_INTEGRATION_SECRET");

  if (!quintalUrl || !quintalSecret) {
    console.error("quintal-sync: QUINTAL_URL ou QUINTAL_INTEGRATION_SECRET não configurados — lead NÃO enviado ao quintalideal", {
      lead_id: payload.lead_id,
      quintalUrl: quintalUrl ? "✓ definido" : "✗ AUSENTE",
      quintalSecret: quintalSecret ? "✓ definido" : "✗ AUSENTE",
    });
    return;
  }

  const endpoint = `${quintalUrl}/functions/v1/receber-lead-feira`;
  console.log("quintal-sync: iniciando envio", { lead_id: payload.lead_id, endpoint });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-integration-secret": quintalSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`quintal-sync: HTTP ${res.status} — lead NÃO inserido no quintalideal`, {
        lead_id: payload.lead_id,
        status: res.status,
        body: txt.slice(0, 300),
      });
    } else {
      console.log("quintal-sync: lead enviado com sucesso ✓", {
        lead_id: payload.lead_id,
        response: txt.slice(0, 200),
      });
    }
  } catch (e) {
    console.error("quintal-sync: erro de rede ao enviar lead", {
      lead_id: payload.lead_id,
      error: String(e),
    });
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────
// Migrado de serve() (std antigo) para Deno.serve() — padrão atual Supabase Edge Functions.
// IMPORTANTE: o sync com quintalideal usa EdgeRuntime.waitUntil() para garantir que
// o fetch completa mesmo após a response ser enviada ao cliente.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (ip !== "unknown") {
      const windowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      ).toISOString();

      const { count } = await supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", windowStart);

      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({
            error: "RATE_LIMIT_EXCEEDED",
            message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const body = await req.json();
    const {
      id,
      nome,
      whatsapp,
      email,
      cidade,
      estado,
      tamanho_quintal,
      prazo_compra,
      orcamento,
      score,
      temperatura,
      evento,
      feira_id,
      utm_source,
      utm_medium,
      utm_campaign,
      user_agent,
    } = body;

    if (!nome || !whatsapp || !cidade || !estado) {
      return new Response(
        JSON.stringify({ error: "MISSING_FIELDS", message: "Campos obrigatórios faltando." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabaseAdmin.from("leads").insert({
      id,
      nome: nome.trim(),
      whatsapp,
      email: email?.trim() || null,
      cidade,
      estado,
      tamanho_quintal,
      prazo_compra,
      orcamento,
      score,
      temperatura,
      evento,
      feira_id: feira_id || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      user_agent: user_agent || null,
      ip,
    }).select("id, score, temperatura").single();

    if (error) {
      if (error.code === "P0002" || error.message?.includes("LEAD_DUPLICATE")) {
        return new Response(
          JSON.stringify({ error: "LEAD_DUPLICATE", message: "Lead já cadastrado." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw error;
    }

    // ── Busca info da feira (nome, slug e array de franquias organizadoras) ──
    let fairaNome: string | null = null;
    let fairaSlug: string | null = null;
    let quintalFranquiaIds: string[] = [];
    if (feira_id) {
      const { data: feiraData } = await supabaseAdmin
        .from("feiras")
        .select("nome, slug, quintal_franquia_ids")
        .eq("id", feira_id)
        .single();
      fairaNome          = feiraData?.nome               ?? null;
      fairaSlug          = feiraData?.slug               ?? null;
      quintalFranquiaIds = Array.isArray(feiraData?.quintal_franquia_ids)
        ? feiraData.quintal_franquia_ids
        : [];

      if (quintalFranquiaIds.length === 0) {
        console.warn("quintal-sync: feira sem quintal_franquia_ids configurados — territory matching usará fallback", {
          feira_id,
          feira_nome: fairaNome,
        });
      }
    }

    // ── Sincroniza com quintalideal ──────────────────────────────────────────
    // USA EdgeRuntime.waitUntil() para garantir que o fetch completa após a
    // response ser enviada. Sem isso, o runtime cancela promises pendentes.
    const syncPayload = {
      lead_id:            data.id,
      feira_id:           feira_id           || null,
      feira_nome:         fairaNome,
      feira_slug:         fairaSlug,
      origin_franquia_ids: quintalFranquiaIds,
      nome:               nome.trim(),
      whatsapp,
      email:              email?.trim()      || null,
      cidade,
      estado,
      tamanho_quintal:    tamanho_quintal    || null,
      prazo_compra:       prazo_compra       || null,
      orcamento:          orcamento          || null,
      score:              data.score,
      temperatura:        data.temperatura,
      evento:             evento             || null,
      utm_source:         utm_source         || null,
      utm_medium:         utm_medium         || null,
      utm_campaign:       utm_campaign       || null,
      ip,
    };

    // EdgeRuntime.waitUntil garante execução pós-response no Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined") {
      EdgeRuntime.waitUntil(syncLeadToQuintal(syncPayload));
    } else {
      // Fallback para ambiente local / testes
      syncLeadToQuintal(syncPayload).catch((e) => console.error("sync fallback error:", e));
    }

    return new Response(
      JSON.stringify({ success: true, leadId: data.id, score: data.score, temperatura: data.temperatura }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("submit-lead error:", err);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro interno ao salvar lead." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
