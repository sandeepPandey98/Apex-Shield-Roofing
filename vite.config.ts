import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { whop } from "@whop/cli/vite";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, process.cwd(), "NEXT_PUBLIC_"),
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) =>
        key.startsWith("NEXT_PUBLIC_"),
      ),
    ),
  };
  const publicKeys = [
    "NEXT_PUBLIC_DEMO_MODE",
    "NEXT_PUBLIC_WHOP_ENVIRONMENT",
    "NEXT_PUBLIC_WHOP_ACCOUNT_ID",
    "NEXT_PUBLIC_WHOP_APP_ID",
    "NEXT_PUBLIC_PLAN_INSPECTION",
    "NEXT_PUBLIC_PLAN_FLAT_RATE",
    "NEXT_PUBLIC_PLAN_DEPOSIT",
  ];
  return {
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      react(),
      whop(),
    ],
    resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
    define: Object.fromEntries(
      publicKeys.map((key) => [
        `process.env.${key}`,
        JSON.stringify(
          env[key] ?? (key === "NEXT_PUBLIC_DEMO_MODE" ? "true" : ""),
        ),
      ]),
    ),
    build: { outDir: "dist" },
    environments: { ssr: { build: { outDir: "dist/server" } } },
  };
});
