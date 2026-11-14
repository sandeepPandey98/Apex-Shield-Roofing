import test, { TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  finishDeposit,
  pendingDeposit,
  rememberDeposit,
  PaymentVerificationError,
} from "../lib/deposit-client";
const deposit = {
  paymentId: "pay_deposit01",
  verificationToken: "signed-test-proof",
};
function browser(t: TestContext, status = "succeeded") {
  const state = new Map<string, string>();
  const paths: string[] = [];
  const bodies: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (path: unknown, options?: RequestInit) => {
      paths.push(String(path));
      bodies.push(JSON.parse(String(options?.body)));
      if (path === "/api/verify") return Response.json({ paid: true });
      if (path === "/api/setup-intents")
        return Response.json({
          setupIntentId: "sint_deposit01",
          status: status === "succeeded" ? status : "requires_action",
          clientSecret: "sint_secret_test",
        });
      if (path === "/api/setup-intents/verify")
        return Response.json({ saved: status === "succeeded", status });
      throw new Error(`Unexpected call: ${path}`);
    },
  );
  const oldStorage = Object.getOwnPropertyDescriptor(
      globalThis,
      "sessionStorage",
    ),
    oldLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => state.get(key) ?? null,
      setItem: (key: string, value: string) => state.set(key, value),
      removeItem: (key: string) => state.delete(key),
    },
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://roofing.example" },
  });
  t.after(() => {
    if (oldStorage)
      Object.defineProperty(globalThis, "sessionStorage", oldStorage);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
    if (oldLocation) Object.defineProperty(globalThis, "location", oldLocation);
    else Reflect.deleteProperty(globalThis, "location");
  });
  rememberDeposit(deposit);
  return { paths, bodies };
}
test("deposit completion verifies a succeeded setup and clears recovery state", async (t) => {
  const { paths } = browser(t);
  assert.equal(
    await finishDeposit(deposit, async () => {
      throw new Error("No action expected for a succeeded setup");
    }),
    true,
  );
  assert.equal(pendingDeposit(), null);
  assert.deepEqual(paths, [
    "/api/verify",
    "/api/setup-intents",
    "/api/setup-intents/verify",
  ]);
});
test("bank redirects preserve recovery state and do not report completion", async (t) => {
  const { paths } = browser(t, "requires_action");
  let actionCalled = false;
  assert.equal(
    await finishDeposit(deposit, async (input) => {
      actionCalled = true;
      assert.equal(
        input.returnUrl,
        "https://roofing.example/checkout/complete?flow=deposit",
      );
      return { redirected: true };
    }),
    false,
  );
  assert.equal(actionCalled, true);
  assert.deepEqual(pendingDeposit(), deposit);
  assert.equal(paths.includes("/api/setup-intents/verify"), false);
});
test("pending setup retry checks only verification and setup, never charges again", async (t) => {
  const { paths } = browser(t, "processing");
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      finishDeposit(deposit, async () => ({ redirected: false })),
      /deposit is paid/,
    );
  assert.equal(paths.includes("/api/payments"), false);
  assert.deepEqual(pendingDeposit(), deposit);
});

test("confirmed billing failures clear only the failed recovery and never attempt card setup", async (t) => {
  browser(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (path: unknown) => {
    assert.equal(path, "/api/verify");
    calls++;
    return Response.json({
      paid: false,
      retryAllowed: true,
      message: "Your billing state and ZIP code do not match.",
    });
  });
  await assert.rejects(
    finishDeposit(deposit, async () => {
      throw new Error("No bank action should be requested");
    }),
    (error) => error instanceof PaymentVerificationError && error.retryAllowed,
  );
  assert.equal(calls, 1);
  assert.equal(pendingDeposit(), null);
});
test("unsettled payment outcomes retain recovery and cannot be retried as new payments", async (t) => {
  browser(t);
  t.mock.method(globalThis, "fetch", async (path: unknown) => {
    assert.equal(path, "/api/verify");
    return Response.json({
      paid: false,
      retryAllowed: false,
      message: "Your payment is still being verified.",
    });
  });
  await assert.rejects(
    finishDeposit(deposit, async () => {
      throw new Error("No setup action expected");
    }),
    (error) => error instanceof PaymentVerificationError && !error.retryAllowed,
  );
  assert.deepEqual(pendingDeposit(), deposit);
});
