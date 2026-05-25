import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { glob } from "glob";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const htmlPages = glob.sync("pages/**/*.html", { cwd: import.meta.dirname });

  const input: Record<string, string> = {
    main: path.resolve(import.meta.dirname, "index.html"),
    ...Object.fromEntries(
      htmlPages.map((file) => [
        file.replace(/\.html$/, ""),
        path.resolve(import.meta.dirname, file),
      ])
    ),
  };

  return {
    base: basePath,
    root: path.resolve(import.meta.dirname),
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
          ]
        : []),
    ],
    define: {
      "import.meta.env.VITE_FIREBASE_API_KEY":             JSON.stringify((env.VITE_FIREBASE_API_KEY             || "").trim()),
      "import.meta.env.VITE_FIREBASE_AUTH_DOMAIN":         JSON.stringify((env.VITE_FIREBASE_AUTH_DOMAIN         || "").trim()),
      "import.meta.env.VITE_FIREBASE_PROJECT_ID":          JSON.stringify((env.VITE_FIREBASE_PROJECT_ID          || "").trim()),
      "import.meta.env.VITE_FIREBASE_STORAGE_BUCKET":      JSON.stringify((env.VITE_FIREBASE_STORAGE_BUCKET      || "").trim()),
      "import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID": JSON.stringify((env.VITE_FIREBASE_MESSAGING_SENDER_ID || "").trim()),
      "import.meta.env.VITE_FIREBASE_APP_ID":              JSON.stringify((env.VITE_FIREBASE_APP_ID              || "").trim()),
      "import.meta.env.VITE_SUPABASE_URL":                 JSON.stringify((env.VITE_SUPABASE_URL                 || "").trim()),
      "import.meta.env.VITE_SUPABASE_ANON_KEY":            JSON.stringify((env.VITE_SUPABASE_ANON_KEY            || "").trim()),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: { input },
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: { strict: true },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
