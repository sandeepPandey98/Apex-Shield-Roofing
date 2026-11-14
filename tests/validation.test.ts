import test from "node:test";
import assert from "node:assert/strict";
import { invoiceSchema, balanceCents, leadSchema } from "../lib/validation";
import { invoiceCheckoutLink } from "../lib/invoice-link";
test("signed invoice links use the matching Whop checkout and encode the token", () => {
  const signed = "pay_sample.abc+/=--123abc";
  const sandbox = new URL(invoiceCheckoutLink(signed,"sandbox")!);
  assert.equal(sandbox.origin,"https://sandbox.whop.com");
  assert.equal(sandbox.pathname,"/checkout/pay_sample/");
  assert.equal(sandbox.searchParams.get("token"),"abc+/=--123abc");
  assert.equal(new URL(invoiceCheckoutLink(signed,"production")!).origin,"https://whop.com");
  assert.equal(invoiceCheckoutLink(signed,"invalid"),null);
});
test("invoice links reject unsafe destinations and malformed tokens", () => {
  for(const value of [null,"javascript:alert(1)","https://whop.com.evil.example/pay","https://whop.com@evil.example/","https://user:pass@whop.com/","http://whop.com/","/checkout/pay_abc","pay_abc.unverified","pay_abc.abc--123&x=evil"])
    assert.equal(invoiceCheckoutLink(value),null);
  assert.equal(invoiceCheckoutLink("https://sandbox.whop.com/checkout/pay_sample/"),"https://sandbox.whop.com/checkout/pay_sample/");
});
const invoice = {
  customerEmail: "homeowner@example.com",
  requestedAt: "2026-11-13T08:00:00.000Z",
  totalJobAmount: 12500,
  depositPaid: 500,
  description: "Completed roof replacement",
};
test("final balance uses integer cents for decimal currency", () => {
  assert.equal(balanceCents(12500, 500), 1200000);
  assert.equal(balanceCents(100.1, 0.2), 9990);
});
test("negative, nonfinite, and overpaid invoices are rejected", () => {
  for (const total of [-1, 0, 500, NaN, Infinity])
    assert.equal(
      invoiceSchema.safeParse({ ...invoice, totalJobAmount: total }).success,
      false,
    );
});
test("saved card billing requires all authorization fields", () => {
  assert.equal(
    invoiceSchema.safeParse({ ...invoice, chargeStoredCard: true }).success,
    false,
  );
  assert.equal(
    invoiceSchema.safeParse({
      ...invoice,
      chargeStoredCard: true,
      memberId: "mber_abc",
      paymentMethodId: "payt_abc",
      authorizationConfirmed: true,
    }).success,
    true,
  );
});
test("contact consent, ZIP format, email and honeypot are validated", () => {
  const lead = {
    fullName: "Sample Homeowner",
    email: "demo@example.com",
    phone: "5125550123",
    address: "123 Sample Street",
    zipCode: "78701",
    serviceType: "Inspection",
    consent: true,
  };
  assert.equal(leadSchema.safeParse(lead).success, true);
  for (const patch of [
    { consent: false },
    { zipCode: "7870" },
    { email: "bad" },
    { website: "spam.example" },
  ])
    assert.equal(leadSchema.safeParse({ ...lead, ...patch }).success, false);
});
