import { createMiddleware } from "hono/factory";
import { createClient } from "@supabase/supabase-js";

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env["SUPABASE_URL"];
  const anonKey    = process.env["VITE_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !anonKey) {
    return c.json({ error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
});
