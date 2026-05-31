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

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify caller
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

    // Caller must be admin or superadmin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const callerTopRole = (callerRoles || [])
      .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9))[0]?.role;

    if (!callerTopRole || !["superadmin", "admin"].includes(callerTopRole)) {
      return new Response(JSON.stringify({ error: "Forbidden — admin or superadmin required" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { action, targetUserId, newPassword } = await req.json();

    if (!action || !targetUserId) {
      return new Response(JSON.stringify({ error: "Missing action or targetUserId" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fetch target user's top role for privilege ceiling check
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);

    const targetTopRole = (targetRoles || [])
      .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9))[0]?.role;

    // Admins cannot act on superadmins
    if (callerTopRole === "admin" && targetTopRole === "superadmin") {
      return new Response(JSON.stringify({ error: "Forbidden — cannot act on a superadmin" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (action === "ban") {
      // ban_duration of "876600h" ≈ 100 years — effectively permanent
      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876600h",
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (action === "unban") {
      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (action === "set_password") {
      if (!newPassword || newPassword.length < 10) {
        return new Response(JSON.stringify({ error: "Password must be at least 10 characters" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
        user_metadata: { force_password_change: true },
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("manage-user edge function error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
