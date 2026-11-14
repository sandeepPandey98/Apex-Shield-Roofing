import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";
const simulation = spawn(
  "postman",
  [
    "simulation",
    "run",
    "postman/simulations/roofing.sim.yaml",
    "--port",
    "4110",
    "--no-history",
    "--output",
    "ndjson",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
simulation.stdout.on("data", (chunk) => {
  output += chunk;
});
simulation.stderr.on("data", (chunk) => {
  output += chunk;
});
let ready = false;
try {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch("http://127.0.0.1:4110/whop/__health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await setTimeout(100);
  }
  if (!ready) throw new Error(`Postman simulation did not start: ${output}`);
  const tests = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--test",
      "tests/validation.test.ts",
      "tests/routes.test.ts",
      "tests/deposit-client.test.ts",
      "tests/payment-state.test.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
        NEXT_PUBLIC_DEMO_MODE: "false",
        WHOP_TEST_BASE_URL: "http://127.0.0.1:4110/whop/api/v1",
        WHOP_API_KEY: "test-local-only",
        RESEND_API_KEY: "",
        ESTIMATE_EMAIL_FROM: "",
        RESEND_TEST_BASE_URL: "http://127.0.0.1:4110/resend",
        NEXT_PUBLIC_WHOP_ACCOUNT_ID: "biz_demo",
        NEXT_PUBLIC_PLAN_INSPECTION: "plan_inspection",
        NEXT_PUBLIC_PLAN_FLAT_RATE: "plan_repair",
        NEXT_PUBLIC_PLAN_DEPOSIT: "plan_deposit",
        CONTRACTOR_ADMIN_TOKEN: "local-test-admin-token-123456789",
        APP_URL: "http://localhost:3100",
      },
    },
  );
  process.exitCode = await new Promise((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
  const count = output
    .split("\n")
    .filter((line) => line.includes("request")).length;
  console.log(
    `Postman HTTP simulation exercised; ${count} request log entries observed.`,
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  simulation.kill("SIGINT");
}
