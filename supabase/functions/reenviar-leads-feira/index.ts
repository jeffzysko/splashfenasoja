import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const INTEGRATION_SECRET = Deno.env.get("QUINTAL_INTEGRATION_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-integration-secret",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function reenviarLead(
  payload: Record<string, unknown>,
  quintalUrl: string,
  quintalSecret: string,
): Promise<{ ok: boolean; status: number; body: string; skipped?: boolean }> {
  const endpoint = `${quintalUrl}/functions/v1/receber-lead-feira`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integration-secret": quintalSecret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    const txt = await res.text().catch(() => "");
    const parsed = (() => { try { return JSON.parse(txt); } catch { return {}; } })();
    return { ok: res.ok, status: res.status, body: txt.slice(0, 500), skipped: parsed?.skipped === true };
  } catch (e) {
    // Falha rápida — sem retry. Próxima rodada tenta de novo.
    return { ok: false, status: 0, body: String(e).slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = req.headers.get("x-integration-secret");
  if (!INTEGRATION_SECRET || secret !== INTEGRATION_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const quintalUrl    = Deno.env.get("QUINTAL_URL");
  const quintalSecret = Deno.env.get("QUINTAL_INTEGRATION_SECRET");
  if (!quintalUrl || !quintalSecret) {
    return new Response(JSON.stringify({ error: "QUINTAL_URL ou QUINTAL_INTEGRATION_SECRET não configurados" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const url  = new URL(req.url);
  let body: Record<string, unknown> = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { /**/ }

  const dryRun  = url.searchParams.get("dry_run") === "true" || body.dry_run === true;
  const feiraId = (url.searchParams.get("feira_id") ?? body.feira_id as string ?? "").trim() || null;
  // limit padrão 20 — cabe confortavelmente no timeout de 150s com delay de 5s
  const limit   = parseInt(url.searchParams.get("limit") ?? String(body.limit ?? 20), 10);
  // delay padrão 5s entre envios — reduz rate limit no quintalideal
  const delayMs = parseInt(url.searchParams.get("delay_ms") ?? String(body.delay_ms ?? 5000), 10);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Busca os leads paginando a partir do offset (para poder rodar em lotes)
  const offset = parseInt(url.searchParams.get("offset") ?? String(body.offset ?? 0), 10);

  let query = supabase
    .from("leads")
    .select("id, nome, whatsapp, email, cidade, estado, tamanho_quintal, prazo_compra, orcamento, score, temperatura, evento, feira_id, utm_source, utm_medium, utm_campaign, ip, created_at")
    .not("feira_id", "is", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  if (feiraId) query = query.eq("feira_id", feiraId);

  const { data: leads, error: leadsError } = await query;
  if (leadsError) return new Response(JSON.stringify({ error: "Erro ao buscar leads", detail: leadsError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  if (!leads || leads.length === 0) return new Response(JSON.stringify({ success: true, message: "Nenhum lead neste intervalo", total: 0, offset, limit }), { status: 200, headers: { "Content-Type": "application/json" } });

  const feiraIds = [...new Set(leads.map((l) => l.feira_id).filter(Boolean))];
  const { data: feiras } = await supabase.from("feiras").select("id, nome, slug, quintal_franquia_ids").in("id", feiraIds);
  const feiraMap: Record<string, { nome: string; slug: string; quintal_franquia_ids: string[] }> = {};
  for (const f of feiras ?? []) feiraMap[f.id] = { nome: f.nome, slug: f.slug, quintal_franquia_ids: Array.isArray(f.quintal_franquia_ids) ? f.quintal_franquia_ids : [] };

  const results: Array<{ lead_id: string; nome: string; feira: string; status: string; detail?: string }> = [];
  let enviados = 0, skipped = 0, erros = 0;

  for (const lead of leads) {
    const feira = feiraMap[lead.feira_id] ?? null;
    const payload = {
      lead_id: lead.id, feira_id: lead.feira_id,
      feira_nome: feira?.nome ?? null, feira_slug: feira?.slug ?? null,
      origin_franquia_ids: feira?.quintal_franquia_ids ?? [],
      nome: lead.nome, whatsapp: lead.whatsapp, email: lead.email ?? null,
      cidade: lead.cidade ?? null, estado: lead.estado ?? null,
      tamanho_quintal: lead.tamanho_quintal ?? null, prazo_compra: lead.prazo_compra ?? null,
      orcamento: lead.orcamento ?? null, score: lead.score ?? null, temperatura: lead.temperatura ?? null,
      evento: lead.evento ?? null, utm_source: lead.utm_source ?? null,
      utm_medium: lead.utm_medium ?? null, utm_campaign: lead.utm_campaign ?? null,
      ip: lead.ip ?? "unknown",
    };

    if (dryRun) {
      results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "dry_run",
        detail: `franquias: [${payload.origin_franquia_ids.join(", ") || "⚠️ VAZIO"}]` });
      continue;
    }

    const res = await reenviarLead(payload, quintalUrl, quintalSecret);

    if (res.ok) {
      if (res.skipped) { skipped++; results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "skipped_dedup" }); }
      else             { enviados++; results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "enviado" }); }
    } else {
      erros++;
      results.push({ lead_id: lead.id, nome: lead.nome, feira: feira?.nome ?? lead.feira_id, status: "erro", detail: `HTTP ${res.status}: ${res.body}` });
    }

    await sleep(delayMs);
  }

  const summary = dryRun
    ? { total: leads.length, offset, limit, mode: "dry_run" }
    : { offset, limit, processados: leads.length, enviados, skipped_dedup: skipped, erros };

  console.log("reenviar-leads-feira:", summary);
  return new Response(JSON.stringify({ success: true, summary, results }), { status: 200, headers: { "Content-Type": "application/json" } });
});
