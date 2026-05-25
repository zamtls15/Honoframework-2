import { Hono } from "hono";
import healthRouter from "./health";
import supabaseUsersRouter from "./supabase-users";
import membersRouter from "./members";

const router = new Hono();

router.route("/", healthRouter);
router.route("/", supabaseUsersRouter);
router.route("/members", membersRouter);

export default router;
