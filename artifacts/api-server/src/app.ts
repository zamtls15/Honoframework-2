import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import router from "./routes";

const app = new Hono();

app.use("*", honoLogger());
app.use("*", cors());

app.route("/api", router);

export default app;
