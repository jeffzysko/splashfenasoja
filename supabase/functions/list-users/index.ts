import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verifica autenticação do chamador
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verifica se o chamador é master
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: apenas master pode listar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lista todos os usuários via Admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (error) throw error;

    // Busca roles de todos os usuários
    const { data: allRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");

    // Busca perfis
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name");

    // Busca vínculos com feiras
    const { data: feiraUsers } = await supabaseAdmin
      .from("feira_users")
      .select("user_id, feira_id, feiras(id, nome, slug)");

    const roleMap = new Map<string, string>();
    (allRoles || []).forEach((r) => roleMap.set(r.user_id, r.role));

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p) => profileMap.set(p.id, p.full_name || ""));

    const feiraMap = new Map<string, any[]>();
    (feiraUsers || []).forEach((fu) => {
      if (!feiraMap.has(fu.user_id)) feiraMap.set(fu.user_id, []);
      feiraMap.get(fu.user_id)!.push(fu.feiras);
    });

    // Filtra apenas usuários que têm role (são usuários do sistema)
    const result = users
      .filter((u) => roleMap.has(u.id))
      .map((u) => ({
        user_id: u.id,
        email: u.email || null,
        full_name: profileMap.get(u.id) || null,
        role: roleMap.get(u.id) || "user",
        feiras: feiraMap.get(u.id) || [],
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

    return new Response(JSON.stringify({ users: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-users error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao listar usuários." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
