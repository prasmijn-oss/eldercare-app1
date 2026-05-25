import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_PRIORITY: Record<string, number> = {
  superadmin: 1, admin: 2, power_user: 3, user: 4, inactive: 5,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Admin client — uses service role key stored as a Supabase secret (never exposed to browser)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify the caller is a real authenticated user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Check caller has admin or superadmin role
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const topRole = (callerRoles || [])
      .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9))[0]?.role;

    if (!topRole || !["superadmin", "admin"].includes(topRole)) {
      return new Response(JSON.stringify({ error: "Forbidden — admin or superadmin required" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email, password, name, role, username, company_ids } = await req.json();

    if (!email || !password || !name || !role || !company_ids?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Create auth user (email pre-confirmed, no verification email sent)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // Insert one user_roles row per company.
    // Username only goes on the first row — UNIQUE(username) constraint allows only one.
    let firstRow = true;
    let anyFailed = false;
    const failedCompanies: string[] = [];

    for (const company_id of company_ids) {
      const { error: roleErr } = await adminClient.from("user_roles").insert({
        user_id: newUserId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        username: firstRow ? (username?.toLowerCase().trim() || null) : null,
        role,
        company_id,
      });
      if (roleErr) {
        console.error(`Failed inserting role for company ${company_id}:`, roleErr.message);
        anyFailed = true;
        failedCompanies.push(company_id);
      }
      firstRow = false;
    }

    return new Response(
      JSON.stringify({
        user_id: newUserId,
        anyFailed,
        failedCompanies,
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("create-user edge function error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
