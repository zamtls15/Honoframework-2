import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, membersTable, insertMemberSchema, updateMemberSchema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router = new Hono();

router.use("*", requireAuth);

router.get("/", async (c) => {
  try {
    const rows = await db.select().from(membersTable).orderBy(membersTable.createdAt);
    return c.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

router.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const rows = await db.select().from(membersTable).where(eq(membersTable.id, id));
    if (!rows.length) return c.json({ error: "Member not found" }, 404);
    return c.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

router.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = insertMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
  }
  try {
    const [row] = await db.insert(membersTable).values(parsed.data).returning();
    return c.json(row, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("unique")) return c.json({ error: "A member with that email already exists" }, 409);
    return c.json({ error: message }, 500);
  }
});

router.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
  }
  try {
    const [row] = await db
      .update(membersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(membersTable.id, id))
      .returning();
    if (!row) return c.json({ error: "Member not found" }, 404);
    return c.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

router.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const [row] = await db.delete(membersTable).where(eq(membersTable.id, id)).returning();
    if (!row) return c.json({ error: "Member not found" }, 404);
    return c.json({ message: "Member deleted", id: row.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return c.json({ error: message }, 500);
  }
});

export default router;
