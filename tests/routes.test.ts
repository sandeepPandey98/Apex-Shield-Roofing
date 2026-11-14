import { createHmac } from "node:crypto";
import { createDepositProof } from "../lib/deposit-setup";
import { POST as setupIntent } from "../app/api/setup-intents/route";
import { POST as verifySetupIntent } from "../app/api/setup-intents/verify/route";
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as leads } from "../app/api/leads/route";
import { POST as payments } from "../app/api/payments/route";
import { POST as invoices } from "../app/api/invoices/route";
import { POST as verify } from "../app/api/verify/route";
const base = "http://127.0.0.1:4110/whop";
const key = "12345678-1234-1234-1234-123456789012";
const admin = "Bearer local-test-admin-token-123456789";
async function control(mode = "ok", reset = false) {
  await fetch(`${base}/__control`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, reset }),
  });
}
async function calls() {
  return (await (await fetch(`${base}/__calls`)).json()) as {
    path: string;
    body: Record<string, any>;
    key: string;
  }[];
}
function req(path: string, body: unknown, auth?: string) {
  return new Request(`http://localhost:3100/api/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3100",
      "idempotency-key": key,
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  });
}
const lead = {
  fullName: "Sample Homeowner",
  email: "demo@example.com",
  phone: "5125550123",
  address: "123 Sample Street",
  zipCode: "78701",
  serviceType: "Inspection",
  consent: true,
};
const payment = {
  serviceId: "replacement-deposit",
  confirmationToken: "ctok_sample",
  email: "demo@example.com",
  saveCardConsent: true,
};
const invoice = {
  billingAddress: {line1:"123 Oak Street",city:"Austin",state:"TX",postal_code:"78701",country:"US"},
  customerEmail: "demo@example.com",
  requestedAt: "2026-11-13T08:00:00.000Z",
  totalJobAmount: 12500,
  depositPaid: 500,
  description: "Completed roof replacement",
};
beforeEach(() => control("ok", true));
test("estimate saves a native Whop member note and preserves customer metadata", async () => {
  const response = await leads(req("leads", lead));
  assert.equal(response.status, 200);
  const log = await calls();
  assert.equal(log.length, 4);
  assert.equal(log[0].path, "/api/v1/members");
  assert.equal(log[0].body.email, lead.email);
  assert.equal((log[0] as any).injectKey, "none");
  assert.equal(log[0].body.name, lead.fullName);
  assert.equal(log[1].path, "/api/v1/members/mber_lead01/notes");
  const content=JSON.parse(String(log[1].body.content).split("\n").slice(1).join("\n"));
  assert.equal(content.property_address,lead.address);
  assert.equal(content.email,lead.email);
  assert.equal(log[3].path,"/api/v1/members/mber_lead01");
  assert.equal((log[3] as any).method,"PATCH");
  assert.equal((log[3].body.metadata as any).crm_owner,"preserve_me");
  assert.equal((log[3].body.metadata as any).roofing_address,lead.address);
  assert.equal(log.some(x=>x.path==="/api/v1/leads"),false);
  assert.notEqual(log[0].key,log[1].key);
});
test("out-of-area lead is rejected before contacting Whop", async () => {
  assert.equal(
    (await leads(req("leads", { ...lead, zipCode: "99999" }))).status,
    422,
  );
  assert.equal((await calls()).length, 0);
});
test("deposits cannot charge without card saving consent", async () => {
  assert.equal(
    (await payments(req("payments", { ...payment, saveCardConsent: false })))
      .status,
    400,
  );
  assert.equal((await calls()).length, 0);
});
test("payment uses server plan, saves off-session, ignores a forged price", async () => {
  assert.equal(
    (await payments(req("payments", { ...payment, price: 1 }))).status,
    200,
  );
  const log = await calls();
  assert.equal(log[0].body.variant_id, "plan_deposit");
  assert.equal(log[0].body.setup_future_usage, "off_session");
  assert.equal(log[0].body.price, undefined);
  assert.equal(log[0].key, key);
});
test("payment verification checks account and paid state", async () => {
  await payments(req("payments", payment));
  await control("wrong-account");
  assert.equal(
    (await verify(req("verify", { paymentId: "pay_demo01" }))).status,
    422,
  );
  await control("pending");
  const pending = await (
    await verify(req("verify", { paymentId: "pay_demo01" }))
  ).json();
  assert.equal(pending.paid, false);
  await control("refunded");
  const refunded = await (
    await verify(req("verify", { paymentId: "pay_demo01" }))
  ).json();
  assert.equal(refunded.paid, false);
  await control();
  const paid = await (
    await verify(req("verify", { paymentId: "pay_demo01" }))
  ).json();
  assert.equal(paid.paid, true);
});
test("invoice endpoint denies unauthenticated callers before upstream side effects", async () => {
  assert.equal((await invoices(req("invoices", invoice))).status, 401);
  assert.equal((await calls()).length, 0);
});
test("email invoice creates draft in dollars, then sends with separate idempotency keys", async () => {
  const response = await invoices(req("invoices", invoice, admin));
  assert.equal(response.status, 200);
  const data=await response.json();
  assert.equal(data.balanceDue,12000);
  assert.equal(new URL(data.invoice.checkout_link).pathname,"/checkout/pay_invoice01/");
  assert.equal(new URL(data.invoice.checkout_link).searchParams.get("token"),"c2FtcGxlLw==--123abc");
  const log = await calls();
  assert.equal(log.length, 2);
  assert.equal(log[0].body.items[0].variant.initial_price, 12000);
  assert.equal(log[0].body.payment_method_id, undefined);
  assert.equal(log[0].body.due_at, "2026-11-20T08:00:00.000Z");
  assert.equal(log[1].path, "/api/v1/invoices/pay_invoice01/send");
  assert.notEqual(log[0].key, log[1].key);
});
test("authorized stored-card invoice uses member and payment IDs and issues it", async () => {
  assert.equal(
    (
      await invoices(
        req(
          "invoices",
          {
            ...invoice,
            chargeStoredCard: true,
            memberId: "mber_sample",
            paymentMethodId: "payt_sample",
            authorizationConfirmed: true,
          },
          admin,
        ),
      )
    ).status,
    200,
  );
  const log = await calls();
  assert.equal(log[0].body.member_id, "mber_sample");
  assert.equal(log[0].body.payment_method_id, "payt_sample");
  assert.equal(log[1].path, "/api/v1/invoices/pay_invoice01/issue");
});
test("upstream HTML and rate limits produce safe errors", async () => {
  await control("html");
  assert.equal((await payments(req("payments", payment))).status, 502);
  await control("busy");
  assert.equal((await payments(req("payments", payment))).status, 429);
});
test("failed draft prevents invoice send", async () => {
  await control("unavailable");
  assert.equal((await invoices(req("invoices", invoice, admin))).status, 502);
  assert.equal((await calls()).length, 1);
});
test("malformed JSON and cross-origin requests are rejected", async () => {
  assert.equal(
    (
      await leads(
        new Request("http://localhost:3100/api/leads", {
          method: "POST",
          body: "{bad",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await leads(
        new Request("http://localhost:3100/api/leads", {
          method: "POST",
          headers: { origin: "https://untrusted.example" },
          body: JSON.stringify(lead),
        }),
      )
    ).status,
    403,
  );
});

async function depositInput() {
  const response = await payments(req("payments", payment));
  assert.equal(response.status, 200);
  const result = await response.json();
  return {
    paymentId: result.paymentId as string,
    verificationToken: result.verificationToken as string,
  };
}
test("explicit setup uses the paid deposit's method and a stable idempotency key, without another charge", async () => {
  const input = await depositInput();
  for (let i = 0; i < 2; i++) {
    const response = await setupIntent(
      req("setup-intents", {
        ...input,
        paymentMethodId: "payt_forged",
        memberId: "mber_forged",
      }),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).setupIntentId, "sint_demo01");
  }
  const log = await calls();
  assert.equal(log.filter((x) => x.path === "/api/v1/payments").length, 1);
  const setups = log.filter((x) => x.path === "/api/v1/setup_intents");
  assert.equal(setups.length, 2);
  assert.equal(setups[0].body.payment_method_id, "payt_sample");
  assert.equal(setups[0].body.confirmation_token, undefined);
  assert.equal(setups[0].body.metadata.deposit_payment_id, input.paymentId);
  assert.equal(setups[0].key, setups[1].key);
  assert.equal((await (await fetch(`${base}/__setup_count`)).json()).count, 1);
});
test("successful setup verification returns only status, never customer/member/method IDs", async () => {
  const input = await depositInput();
  await setupIntent(req("setup-intents", input));
  const response = await verifySetupIntent(
    req("setup-intents/verify", { ...input, setupIntentId: "sint_demo01" }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { saved: true, status: "succeeded" });
});
test("tampered, expired and mismatched payment proofs cannot touch the provider", async () => {
  const input = await depositInput();
  await control();
  const response = await setupIntent(
    req("setup-intents", {
      ...input,
      verificationToken: input.verificationToken + "x",
    }),
  );
  assert.equal(response.status, 403);
  assert.equal(
    (
      await setupIntent(
        req("setup-intents", { ...input, paymentId: "pay_other" }),
      )
    ).status,
    403,
  );
  const payload = Buffer.from(
    JSON.stringify({
      paymentId: input.paymentId,
      accountId: "biz_demo",
      expires: 0,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", process.env.CONTRACTOR_ADMIN_TOKEN!)
    .update(`deposit-setup:v1:${payload}`)
    .digest("base64url");
  assert.equal(
    (
      await setupIntent(
        req("setup-intents", {
          ...input,
          verificationToken: `${payload}.${signature}`,
        }),
      )
    ).status,
    403,
  );
  assert.equal((await calls()).length, 0);
});
test("unpaid, refunded, foreign, unconsented, and unsaveable deposits never create a setup", async () => {
  const input = await depositInput();
  for (const mode of [
    "pending",
    "refunded",
    "wrong-account",
    "no-consent",
    "missing-method",
  ]) {
    await control(mode);
    const response = await setupIntent(req("setup-intents", input));
    assert.ok(
      [409, 422].includes(response.status),
      `${mode}: ${response.status}`,
    );
    assert.equal(
      (await calls()).filter((x) => x.path === "/api/v1/setup_intents").length,
      0,
    );
  }
});
test("inspection receipts cannot be used to set up a replacement card", async () => {
  await payments(req("payments", { ...payment, serviceId: "roof-inspection" }));
  assert.equal(
    (
      await setupIntent(
        req("setup-intents", {
          paymentId: "pay_demo01",
          verificationToken: createDepositProof("pay_demo01"),
        }),
      )
    ).status,
    422,
  );
});
test("processing, action-required and canceled setups never report saved", async () => {
  const input = await depositInput();
  await setupIntent(req("setup-intents", input));
  for (const mode of ["setup-pending", "setup-action", "setup-canceled"]) {
    await control(mode);
    const response = await verifySetupIntent(
      req("setup-intents/verify", { ...input, setupIntentId: "sint_demo01" }),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).saved, false);
  }
});
test("setup verification rejects another account, member, method or deposit", async () => {
  const input = await depositInput();
  await setupIntent(req("setup-intents", input));
  for (const mode of [
    "setup-wrong-account",
    "setup-wrong-member",
    "setup-wrong-method",
    "setup-wrong-payment",
  ]) {
    await control(mode);
    assert.equal(
      (
        await verifySetupIntent(
          req("setup-intents/verify", {
            ...input,
            setupIntentId: "sint_demo01",
          }),
        )
      ).status,
      422,
    );
  }
});
test("setup upstream failure never triggers a second payment", async () => {
  const input = await depositInput();
  await control("unavailable");
  assert.equal((await setupIntent(req("setup-intents", input))).status, 502);
  assert.equal(
    (await calls()).some((x) => x.path === "/api/v1/payments"),
    false,
  );
});

test("missing setup-signing secret blocks deposit charging before any upstream request", async () => {
  const previous = process.env.CONTRACTOR_ADMIN_TOKEN;
  try {
    delete process.env.CONTRACTOR_ADMIN_TOKEN;
    assert.equal((await payments(req("payments", payment))).status, 503);
    assert.equal((await calls()).length, 0);
  } finally {
    process.env.CONTRACTOR_ADMIN_TOKEN = previous;
  }
});

test("missing member permission returns a safe service error and never attempts lead creation", async () => {
  await control("member-forbidden");
  const response = await leads(req("leads", lead));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /temporarily unavailable/);
  const log = await calls();
  assert.equal(log.length, 1);
  assert.equal(log[0].path, "/api/v1/members");
});
test("unresolved or foreign member identity cannot create a lead", async () => {
  for (const mode of ["member-no-user", "member-wrong-account"]) {
    await control(mode);
    assert.equal((await leads(req("leads", lead))).status, 502);
    assert.equal((await calls()).length, 1);
  }
});
test("member note permission failure does not claim submission success", async () => {
  await control("lead-forbidden");
  const response = await leads(req("leads", lead));
  assert.equal(response.status, 503);
  assert.equal((await calls()).length, 2);
});
test("estimate retries use stable customer and note keys without duplicating request history", async () => {
  for (let i = 0; i < 2; i++)
    assert.equal((await leads(req("leads", lead))).status, 200);
  const log = await calls();
  assert.equal(log[0].key, log[4].key);
  assert.equal(log[1].key, log[5].key);
  assert.equal((await (await fetch(`${base}/__note_count`)).json()).count,1);
  assert.notEqual(log[0].key, log[1].key);
});

test("failed open receipts report a retryable billing mismatch without exposing the address", async () => {
  await payments(req("payments", payment));
  await control("billing-mismatch");
  const response = await verify(req("verify", { paymentId: "pay_demo01" }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.paid, false);
  assert.equal(data.retryAllowed, true);
  assert.equal(data.failureCode, "billing_address_mismatch");
  assert.match(data.message, /billing state and ZIP code/);
  assert.equal(JSON.stringify(data).includes("95014"), false);
});

test("receipt recovery confirms the existing paid deposit and saved setup without another payment", async () => {
  const input = await depositInput();
  await setupIntent(req("setup-intents", input));
  await control();
  const response = await verify(
    req("verify", { paymentId: input.paymentId, setupIntentId: "sint_demo01" }),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.paid, true);
  assert.equal(data.setupVerified, true);
  assert.equal(
    (await calls()).some(
      (x) =>
        x.path === "/api/v1/payments" || x.path === "/api/v1/setup_intents",
    ),
    false,
  );
});
test("receipt recovery never trusts a setup reference belonging to a different member or deposit", async () => {
  const input = await depositInput();
  await setupIntent(req("setup-intents", input));
  for (const mode of ["setup-wrong-member", "setup-wrong-payment"]) {
    await control(mode);
    assert.equal(
      (
        await verify(
          req("verify", {
            paymentId: input.paymentId,
            setupIntentId: "sint_demo01",
          }),
        )
      ).status,
      422,
    );
  }
});


test("admin lists reject missing authentication before contacting Whop", async () => {
  const {adminList} = await import("../lib/admin-data");
  for (const kind of ["tracking", "leads", "invoices"] as const) {
    assert.equal((await adminList(new Request(`http://localhost:3100/api/${kind}`), kind)).status, 401);
  }
  assert.equal((await calls()).length, 0);
});
test("tracking reads real provider records within a bounded window without exposing identities", async () => {
  const {adminList} = await import("../lib/admin-data");
  const response = await adminList(new Request("http://localhost:3100/api/tracking", {headers:{authorization:admin}}), "tracking");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json();
  assert.equal(data.source, "whop");
  assert.equal(data.data[0].event, "service_viewed");
  assert.equal(new Date(data.to).getTime()-new Date(data.from).getTime(),86400000);
  assert.equal(JSON.stringify(data).includes("private@example.com"),false);
  assert.equal(JSON.stringify(data).includes("private_person"),false);
});
test("admin lists return leads, pagination, safe invoice links and permission errors", async () => {
  const {adminList} = await import("../lib/admin-data");
  const request=(kind:string)=>new Request(`http://localhost:3100/api/${kind}`,{headers:{authorization:admin}});
  await control("page");
  const leads = await (await adminList(request("leads"),"leads")).json();
  assert.equal(leads.data[0].name,"Test homeowner");
  assert.equal(leads.nextCursor,"next_page");
  const invoices = await (await adminList(request("invoices"),"invoices")).json();
  assert.equal(invoices.data[0].amount,"500.00");
  assert.equal(invoices.data[0].link,null);
  assert.equal(new URL(invoices.data[1].link).pathname,"/checkout/pay_invoice02/");
  await control("read-forbidden");
  assert.equal((await adminList(request("tracking"),"tracking")).status,503);
});
test("invalid admin window never reaches Whop and empty results stay empty", async () => {
  const {adminList} = await import("../lib/admin-data");
  const response=await adminList(new Request("http://localhost:3100/api/tracking?to=invalid",{headers:{authorization:admin}}),"tracking");
  assert.equal(response.status,400);
  assert.equal((await calls()).length,0);
  await control("empty");
  const data=await (await adminList(new Request("http://localhost:3100/api/tracking",{headers:{authorization:admin}}),"tracking")).json();
  assert.deepEqual(data.data,[]);
});

test("non-ASCII invalid admin tokens fail authentication safely", async () => {
  const {adminList} = await import("../lib/admin-data");
  const response=await adminList(new Request("http://localhost:3100/api/leads",{headers:{authorization:"Bearer " + "é".repeat(32)}}),"leads");
  assert.equal(response.status,401);
  assert.equal((await calls()).length,0);
});

test("contractor sign-in creates a scoped HTTP-only session usable by every admin route", async () => {
  const session = await import("../app/api/admin/session/route");
  const {adminList} = await import("../lib/admin-data");
  const login = await session.POST(req("admin/session", {}, admin));
  assert.equal(login.status,200);
  const cookie=login.headers.get("set-cookie")!;
  assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Strict/); assert.match(cookie,/Max-Age=14400/);
  assert.equal(cookie.includes(admin.replace("Bearer ","")),false);
  const headers={cookie:cookie.split(";")[0]};
  assert.equal((await session.GET(new Request("http://localhost:3100/api/admin/session",{headers}))).status,200);
  for (const kind of ["tracking","leads","invoices"] as const) {
    assert.equal((await adminList(new Request(`http://localhost:3100/api/${kind}`,{headers}),kind)).status,200);
  }
  const issued=await invoices(new Request("http://localhost:3100/api/invoices",{method:"POST",headers:{...headers,"content-type":"application/json","idempotency-key":key,origin:"http://localhost:3100"},body:JSON.stringify(invoice)}));
  assert.equal(issued.status,200);
});
test("session login rejects invalid tokens, cross-origin requests and forged or expired sessions", async () => {
  const session=await import("../app/api/admin/session/route");
  assert.equal((await session.POST(req("admin/session",{},"Bearer wrong"))).status,401);
  assert.equal((await session.POST(new Request("http://localhost:3100/api/admin/session",{method:"POST",headers:{authorization:admin,origin:"https://untrusted.example"}}))).status,403);
  const good=await session.POST(req("admin/session",{},admin));
  const cookie=good.headers.get("set-cookie")!.split(";")[0];
  const forged=cookie.slice(0,-1)+(cookie.endsWith("a")?"b":"a");
  assert.equal((await session.GET(new Request("http://localhost:3100/api/admin/session",{headers:{cookie:forged}}))).status,401);
  const payload=`${Date.now()-1000}.${"a".repeat(32)}`;
  const signature=createHmac("sha256",process.env.CONTRACTOR_ADMIN_TOKEN!).update(`contractor-session:v1:${payload}`).digest("base64url");
  assert.equal((await session.GET(new Request("http://localhost:3100/api/admin/session",{headers:{cookie:`roofing_contractor_session=${payload}.${signature}`}}))).status,401);
  const secure=await session.POST(new Request("https://localhost:3100/api/admin/session",{method:"POST",headers:{authorization:admin,origin:"https://localhost:3100"}}));
  assert.match(secure.headers.get("set-cookie")!,/; Secure/);
});
test("locking clears the shared session cookie and reauthentication is required", async () => {
  const session=await import("../app/api/admin/session/route");
  const response=await session.DELETE(new Request("http://localhost:3100/api/admin/session",{method:"DELETE",headers:{origin:"http://localhost:3100"}}));
  assert.equal(response.status,200);
  assert.match(response.headers.get("set-cookie")!,/Max-Age=0/);
  assert.equal((await session.GET(new Request("http://localhost:3100/api/admin/session",{headers:{cookie:response.headers.get("set-cookie")!.split(";")[0]}}))).status,401);
  assert.equal((await calls()).length,0);
});


test("long estimate notes are preserved and metadata stays within Whop limits",async()=>{
 const notes="roof detail ".repeat(165);
 const response=await leads(req("leads",{...lead,notes}));
 assert.equal(response.status,200);
 const log=await calls();
 const metadata=log[3].body.metadata as Record<string,string>;
 assert.equal([1,2,3,4].map(i=>metadata[`roofing_notes_${i}`]).join(""),notes.trim());
 assert.equal(Object.values(metadata).some(v=>typeof v==="string"&&v.length>500),false);
 assert.equal(String(log[1].body.content).includes(notes.trim()),true);
});
test("changed estimate details produce a fresh request key; retrying failed indexing reuses the saved note",async()=>{
 const estimateReq=(body:unknown)=>{const r=req("leads",body);r.headers.set("x-forwarded-for","192.0.2.42");return r;};
 await control("index-unavailable");
 assert.equal((await leads(estimateReq(lead))).status,502);
 await control("ok");
 assert.equal((await leads(estimateReq(lead))).status,200);
 const original=(await calls())[1].key;
 assert.equal((await leads(estimateReq({...lead,address:"456 Another Street"}))).status,200);
 const log=await calls();
 assert.notEqual(log[5].key,original);
});


test("hosted pixel reads use the hosting business and injected credential while checkout stays sandbox",async()=>{
 const {adminList}=await import("../lib/admin-data");
 const previous={flag:process.env.ROOFING_HOSTED_TRACKING,account:process.env.WHOP_ACCOUNT_ID,sandbox:process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID};
 try {
  process.env.ROOFING_HOSTED_TRACKING="true";process.env.WHOP_ACCOUNT_ID="biz_demo";process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID="biz_sandbox_other";
  const response=await adminList(new Request("http://localhost:3100/api/tracking",{headers:{authorization:admin}}),"tracking");
  assert.equal(response.status,200);assert.equal((await response.json()).environment,"production");
  const log=await calls();assert.equal((log[0] as any).hasAuthorization,false);assert.equal((log[0] as any).injectKey,undefined);
 }finally{
  for(const [k,v] of [["ROOFING_HOSTED_TRACKING",previous.flag],["WHOP_ACCOUNT_ID",previous.account],["NEXT_PUBLIC_WHOP_ACCOUNT_ID",previous.sandbox]])if(v===undefined)delete process.env[k!];else process.env[k!]=v;
 }
});


test("verification failure returns the saved draft and retry sends it without creating another",async()=>{
 await control("invoice-unverified");
 const blocked=await invoices(req("invoices",invoice,admin));
 assert.equal(blocked.status,409);
 const data=await blocked.json();assert.equal(data.code,"invoice_account_verification_required");assert.equal(data.invoiceId,"pay_invoice01");assert.match(data.error,/draft is saved/);
 await control("ok");
 const retried=await invoices(req("invoices",{...invoice,invoiceId:data.invoiceId},admin));
 assert.equal(retried.status,200);
 const log=await calls();assert.deepEqual(log.map(x=>x.path),["/api/v1/invoices/pay_invoice01","/api/v1/invoices/pay_invoice01","/api/v1/invoices/pay_invoice01/send"]);
 await control("ok");
 const alreadyIssued=await invoices(req("invoices",{...invoice,invoiceId:data.invoiceId},admin));
 assert.equal(alreadyIssued.status,200);
 assert.equal(new URL((await alreadyIssued.json()).invoice.checkout_link).pathname,"/checkout/pay_invoice01/");
 assert.equal((await calls()).length,1); // already open: no resend or second charge
});
test("saved invoice references cannot send another account's draft or a different balance",async()=>{
 const first=await invoices(req("invoices",invoice,admin));assert.equal(first.status,200);
 await control("invoice-wrong-account");
 assert.equal((await invoices(req("invoices",{...invoice,invoiceId:"pay_invoice01"},admin))).status,409);
 assert.equal((await calls()).length,1);
 await control("ok");
 assert.equal((await invoices(req("invoices",{...invoice,totalJobAmount:13000,invoiceId:"pay_invoice01"},admin))).status,409);
 assert.equal((await calls()).length,1);
});


test("new invoices require a billing address before creating an upstream draft",async()=>{
 const {billingAddress,...withoutAddress}=invoice;
 const result=await invoices(req("invoices",withoutAddress,admin));
 assert.equal(result.status,422);assert.equal((await result.json()).code,"invoice_tax_address_required");assert.equal((await calls()).length,0);
});
test("tax-address failures retain the draft and address corrections patch the same invoice",async()=>{
 await control("invoice-tax-address");
 const result=await invoices(req("invoices",invoice,admin));
 assert.equal(result.status,422);const data=await result.json();assert.equal(data.invoiceId,"pay_invoice01");assert.equal(data.code,"invoice_tax_address_required");
 assert.deepEqual((await calls())[0].body.billing_address,invoice.billingAddress);
 await control("ok");
 const address={...invoice.billingAddress,line1:"456 Oak Street"};
 assert.equal((await invoices(req("invoices",{...invoice,invoiceId:data.invoiceId,billingAddress:address},admin))).status,200);
 const log=await calls();assert.equal(log.length,3);assert.equal((log[1] as any).method,"PATCH");assert.deepEqual(log[1].body,{billing_address:address});assert.equal(log.some(x=>x.path==="/api/v1/invoices"),false);
});

test("embedded sign-in uses a secure partitioned cookie shared by all three account routes",async()=>{
 const session=await import("../app/api/admin/session/route");
 const {adminList}=await import("../lib/admin-data");
 const request=new Request("https://roofing.example/api/admin/session",{method:"POST",headers:{authorization:admin,origin:"https://roofing.example","x-contractor-embed":"1"}});
 const response=await session.POST(request);assert.equal(response.status,200);
 const cookie=response.headers.get("set-cookie")!;
 assert.match(cookie,/^__Host-roofing_contractor_embed=/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=None/);assert.match(cookie,/Partitioned/);
 assert.equal(cookie.includes(admin.replace("Bearer ","")),false);
 const headers={cookie:cookie.split(";")[0]};
 for(const kind of ["tracking","leads","invoices"] as const)assert.equal((await adminList(new Request(`https://roofing.example/api/${kind}`,{headers}),kind)).status,200);
 const forged=headers.cookie.slice(0,-1)+(headers.cookie.endsWith("a")?"b":"a");
 assert.equal((await session.GET(new Request("https://roofing.example/api/admin/session",{headers:{cookie:forged}}))).status,401);
 const locked=await session.DELETE(new Request("https://roofing.example/api/admin/session",{method:"DELETE",headers:{origin:"https://roofing.example","x-contractor-embed":"1"}}));
 assert.match(locked.headers.get("set-cookie")!,/^__Host-roofing_contractor_embed=;/);assert.match(locked.headers.get("set-cookie")!,/Max-Age=0/);
 const publicRequest=await session.POST(new Request("https://roofing.example/api/admin/session",{method:"POST",headers:{origin:"https://roofing.example","x-contractor-embed":"1"}}));assert.equal(publicRequest.status,401);
});
