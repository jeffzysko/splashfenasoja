import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: máximo de submissões por IP por janela de tempo
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MINUTES = 60;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Captura o IP real do visitante ──────────────────────────────────────
    const ip =
      req.headers.get("cf-connecting-ip") ||      // Cloudflare
      req.headers.get("x-real-ip") ||             // Nginx proxy
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || // Proxies genéricos
      "unknown";

    // ── Cria cliente com service_role para operações privilegiadas ──────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Verifica rate limit por IP ──────────────────────────────────────────
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

    // ── Lê o body da requisição ─────────────────────────────────────────────
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

    // Validações básicas
    if (!nome || !whatsapp || !cidade || !estado) {
      return new Response(
        JSON.stringify({ error: "MISSING_FIELDS", message: "Campos obrigatórios faltando." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Insere o lead com o IP capturado ────────────────────────────────────
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
      // Erro de duplicata (trigger do banco)
      if (error.code === "P0002" || error.message?.includes("LEAD_DUPLICATE")) {
        return new Response(
          JSON.stringify({ error: "LEAD_DUPLICATE", message: "Lead já cadastrado." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw error;
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
