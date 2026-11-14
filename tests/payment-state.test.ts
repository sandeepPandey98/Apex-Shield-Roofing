import test from "node:test";
import assert from "node:assert/strict";
import { paymentState } from "../lib/payment-state";
test("failed billing address is actionable without returning raw billing information", () => {
  const result = paymentState({
    status: "open",
    substatus: "failed",
    failure_message: "ZIP code 95014 is in CA, but the state entered is PA.",
  });
  assert.equal(result.retryAllowed, true);
  assert.equal(result.failureCode, "billing_address_mismatch");
  assert.equal(result.paid, false);
  assert.equal(JSON.stringify(result).includes("95014"), false);
});
test("open or pending receipts stay protected while explicit terminal failures allow correction", () => {
  for (const status of ["open", "pending"])
    assert.equal(paymentState({ status }).retryAllowed, false);
  for (const substatus of ["failed", "blocked", "canceled"])
    assert.equal(
      paymentState({ status: "open", substatus }).retryAllowed,
      true,
    );
});
test("paid and refunded/disputed receipts never permit a fresh retry", () => {
  assert.equal(
    paymentState({ status: "paid", substatus: "succeeded" }).paid,
    true,
  );
  for (const substatus of [
    "refunded",
    "partially_refunded",
    "dispute_under_review",
  ]) {
    const result = paymentState({ status: "paid", substatus });
    assert.equal(result.paid, false);
    assert.equal(result.retryAllowed, false);
  }
});
