import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Segurança: requer o mesmo secret de integração ──────────────────────────
const INTEGRATION_SECRET = Deno.env.get("QUINTAL_INTEGRATION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-integration-secret",
};

// ─── Reenvio de um lead para o quintalideal ───────────────────────────────────
async function reenviarLead(payload: Record<string, unknown>, quintalUrl: string, quintalSecret: string) {
  const endpoint = `${quintalUrl}/functions/v1/receber-lead-feira`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-integration-secret": quintalSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    const txt = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, body: txt.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Autenticação
  const secret = req.headers.get("x-integration-secret");
  if (!INTEGRATION_SECRET || secret !== INTEGRATION_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const quintalUrl    = Deno.env.get("QUINTAL_URL");
  const quintalSecret = Deno.env.get("QUINTAL_INTEGRATION_SECRET");

  if (!quintalUrl || !quintalSecret) {
    return new Response(
      JSON.stringify({ error: "QUINTAL_URL ou QUINTAL_INTEGRATION_SECRET não configurados" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Parâmetros opcionais via query string ou body
  const url     = new URL(req.url);
  let   body: Record<string, unknown> = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { /**/ }

  // dry_run=true → apenas lista o que seria enviado, sem enviar de fato
  const dryRun   = url.searchParams.get("dry_run") === "true"  || body.dry_run  === true;
  // feira_id → filtra por feira específica; omitir = todas as feiras
  const feiraId  = (url.searchParams.get("feira_id") ?? body.feira_id as string ?? "").trim() || null;
  // limit → máximo de leads a processar (padrão: 500)
  const limit    = parseInt(url.searchParams.get("limit") ?? String(body.limit ?? 500), 10);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Buscar leads com feira_id preenchido ─────────────────────────────────
  let query = supabase
    .from("leads")
    .select("id, nome, whatsapp, email, cidade, estado, tamanho_quintal, prazo_compra, orcamento, score, temperatura, evento, feira_id, utm_source, utm_medium, utm_campaign, ip, created_at")
    .not("feira_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (feiraId) {
    query = query.eq("feira_id", feiraId);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    return new Response(
      JSON.stringify({ error: "Erro ao buscar leads", detail: leadsError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!leads || leads.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "Nenhum lead com feira_id encontrado", total: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Buscar dados das feiras envolvidas (em lote) ─────────────────────────
  const feiraIds = [...new Set(leads.map((l) => l.feira_id).filter(Boolean))];
  const { data: feiras } = await supabase
    .from("feiras")
    .select("id, nome, slug, quintal_franquia_ids")
    .in("id", feiraIds);

  const feiraMap: Record<string, { nome: string; slug: string; quintal_franquia_ids: string[] }> = {};
  for (const f of feiras ?? []) {
    feiraMap[f.id] = {
      nome: f.nome,
      slug: f.slug,
      quintal_franquia_ids: Array.isArray(f.quintal_franquia_ids) ? f.quintal_franquia_ids : [],
    };
  }

  // ── Processar cada lead ───────────────────────────────────────────────────
  const results: Array<{
    lead_id: string;
    nome: string;
    feira: string;
    status: "enviado" | "skipped_dedup" | "erro" | "dry_run";
    detail?: string;
  }> = [];

  let enviados  = 0;
  let skipped   = 0;
  let erros     = 0;

  for (const lead of leads) {
    const feira = feiraMap[lead.feira_id] ?? null;

    const payload = {
      lead_id:             lead.id,
      feira_id:            lead.feira_id,
      feira_nome:          feira?.nome          ?? null,
      feira_slug:          feira?.slug          ?? null,
      origin_franquia_ids: feira?.quintal_franquia_ids ?? [],
      nome:                lead.nome,
      whatsapp:            lead.whatsapp,
      email:               lead.email           ?? null,
      cidade:              lead.cidade          ?? null,
      estado:              lead.estado          ?? null,
      tamanho_quintal:     lead.tamanho_quintal ?? null,
      prazo_compra:        lead.prazo_compra    ?? null,
      orcamento:           lead.orcamento       ?? null,
      score:               lead.score           ?? null,
      temperatura:         lead.temperatura     ?? null,
      evento:              lead.evento          ?? null,
      utm_source:          lead.utm_source      ?? null,
      utm_medium:          lead.utm_medium      ?? null,
      utm_campaign:        lead.utm_campaign    ?? null,
      ip:                  lead.ip              ?? "unknown",
    };

    if (dryRun) {
      results.push({
        lead_id: lead.id,
        nome:    lead.nome,
        feira:   feira?.nome ?? lead.feira_id,
        status:  "dry_run",
        detail:  `quintal_franquia_ids: [${payload.origin_franquia_ids.join(", ") || "vazio!"}]`,
      });
      continue;
    }

    const res = await reenviarLead(payload, quintalUrl, quintalSecret);

    if (res.ok) {
      // Verifica se foi inserido ou apenas dedup
      const parsed = (() => { try { return JSON.parse(res.body); } catch { return {}; } })();
      if (parsed?.skipped) {
        skipped++;
        results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "skipped_dedup", detail: "já existia no quintalideal" });
      } else {
        enviados++;
        results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "enviado" });
      }
    } else {
      erros++;
      results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "erro", detail: `HTTP ${res.status}: ${res.body}` });
    }

    // Pequena pausa para não sobrecarregar a edge function destino
    await new Promise((r) => setTimeout(r, 150));
  }

  const summary = dryRun
    ? { total: leads.length, mode: "dry_run (nada foi enviado)" }
    : { total: leads.length, enviados, skipped_dedup: skipped, erros };

  console.log("reenviar-leads-feira:", summary);

  return new Response(
    JSON.stringify({ success: true, summary, results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
