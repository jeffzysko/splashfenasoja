import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar se o chamador é master
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    if (!callerRoles?.some((r) => r.role === "master")) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas master pode criar usuários." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dados do novo usuário
    const { nome, email, senha, role, feira_ids } = await req.json();

    if (!nome || !email || !senha || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: nome, email, senha, role." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validRoles = ["master", "admin", "user"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Role inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (senha.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar usuário no Auth
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome.trim() },
    });

    if (createErr || !newUser?.user) {
      const msg = createErr?.message?.includes("already registered")
        ? "Este e-mail já está cadastrado."
        : createErr?.message || "Erro ao criar usuário.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = newUser.user.id;

    // Criar perfil
    await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: nome.trim() });

    // Atribuir role
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role });

    // Vincular feiras
    if (Array.isArray(feira_ids) && feira_ids.length > 0) {
      await supabaseAdmin.from("feira_users").insert(
        feira_ids.map((fid: string) => ({ feira_id: fid, user_id: uid }))
      );
    }

    return new Response(
      JSON.stringify({ user: { id: uid, email: newUser.user.email, full_name: nome.trim(), role } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno: " + String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
