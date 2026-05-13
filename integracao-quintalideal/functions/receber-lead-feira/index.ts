import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Segredo de integração ───────────────────────────────────────────────────
// Deve ser configurado como secret no Supabase do quintalideal:
//   supabase secrets set LEADS_FEIRA_SECRET=<valor-secreto>
// O mesmo valor deve estar em QUINTAL_INTEGRATION_SECRET no Supabase da feira.
const INTEGRATION_SECRET = Deno.env.get("LEADS_FEIRA_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-integration-secret",
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Validar segredo de integração ─────────────────────────────────────────
  const secret = req.headers.get("x-integration-secret");
  if (!INTEGRATION_SECRET || secret !== INTEGRATION_SECRET) {
    console.warn("receber-lead-feira: unauthorized attempt", {
      hasSecret: !!INTEGRATION_SECRET,
      ip: req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip"),
    });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Criar cliente Supabase com service_role ────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Ler e validar body ─────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.nome || !body.whatsapp) {
    return new Response(
      JSON.stringify({ error: "MISSING_FIELDS", message: "nome e whatsapp são obrigatórios" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Evitar duplicatas: mesmo lead_id já recebido ───────────────────────────
  if (body.lead_id) {
    const { count } = await supabase
      .from("leads_feira")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", body.lead_id as string);

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_received" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── Inserir na tabela leads_feira ──────────────────────────────────────────
  const { data, error } = await supabase.from("leads_feira").insert({
    lead_id:         body.lead_id         ?? null,
    feira_id:        body.feira_id        ?? null,
    feira_nome:      body.feira_nome      ?? null,
    feira_slug:      body.feira_slug      ?? null,
    nome:            (body.nome as string).trim(),
    whatsapp:        body.whatsapp        as string,
    email:           body.email           ?? null,
    cidade:          body.cidade          ?? null,
    estado:          body.estado          ?? null,
    tamanho_quintal: body.tamanho_quintal ?? null,
    prazo_compra:    body.prazo_compra    ?? null,
    orcamento:       body.orcamento       ?? null,
    score:           body.score           ?? null,
    temperatura:     body.temperatura     ?? null,
    evento:          body.evento          ?? null,
    utm_source:      body.utm_source      ?? null,
    utm_medium:      body.utm_medium      ?? null,
    utm_campaign:    body.utm_campaign    ?? null,
    ip:              body.ip              ?? null,
  }).select("id").single();

  if (error) {
    console.error("receber-lead-feira: insert error", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  console.log("receber-lead-feira: lead recebido", {
    id: data.id,
    lead_id: body.lead_id,
    feira: body.feira_nome,
    temperatura: body.temperatura,
  });

  return new Response(
    JSON.stringify({ success: true, id: data.id }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
});
