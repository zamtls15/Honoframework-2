import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

router.use("/users", requireAuth);
router.use("/manage-supabase-user", requireAuth);

function getAdminClient() {
  const supabaseUrl     = process.env["SUPABASE_URL"];
  const serviceRoleKey  = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

router.get("/users", async (c) => {
  try {
    const supabaseAdmin = getAdminClient();
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const mapped = users.map((u) => ({
      id:    u.id,
      email: u.email,
      name:  u.user_metadata?.["full_name"] ?? u.user_metadata?.["name"] ?? "",
      tier:  u.user_metadata?.["tier"] ?? "",
    }));

    return c.json(mapped);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

router.post("/manage-supabase-user", async (c) => {
  const body = await c.req.json<{ action?: string; email?: string; name?: string; tier?: string }>();
  const { action, email, name = "", tier = "" } = body;

  if (!action || !email) {
    return c.json({ error: "Action and email are required." }, 400);
  }

  try {
    const supabaseAdmin = getAdminClient();

    if (action === "add") {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const existing = users.find((u) => u.email === email);
      if (existing) {
        return c.json({ message: "User already exists", user: existing });
      }

      const siteUrl = process.env["SITE_URL"];
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: name, tier },
        ...(siteUrl ? { redirectTo: siteUrl } : {}),
      });

      if (inviteError) throw inviteError;
      return c.json({ message: "User invited successfully", data: inviteData });

    } else if (action === "delete") {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const target = users.find((u) => u.email === email);
      if (!target) {
        return c.json({ message: "User not found in Auth" });
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target.id);
      if (deleteError) throw deleteError;
      return c.json({ message: "User deleted successfully" });

    } else {
      return c.json({ error: "Invalid action. Supported: add, delete." }, 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

export default router;
