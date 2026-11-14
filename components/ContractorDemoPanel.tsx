"use client";
import { useState } from "react";
import { DEMO_BILLING_ADDRESS, DEMO_MODE } from "@/config/site";
import { useContractorSession } from "@/lib/use-contractor-session";
import { Modal } from "./Modal";
export function ContractorDemoPanel({ onClose, embedded = false, authenticatedSession = false, onSessionExpired, onInvoiceUpdated }: { onClose?: () => void; embedded?: boolean; authenticatedSession?: boolean; onSessionExpired?: () => void; onInvoiceUpdated?: () => void }) {
  const sampleAddress = DEMO_MODE || process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "sandbox" ? DEMO_BILLING_ADDRESS : undefined;
  const session = useContractorSession(!embedded && !DEMO_MODE);
  const signedIn = authenticatedSession || session.authenticated;
  const [total, setTotal] = useState(12500),
    [deposit, setDeposit] = useState(500),
    [charge, setCharge] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState<string | null>(null);
  const [key, setKey] = useState(crypto.randomUUID());
  const [requestedAt, setRequestedAt] = useState(new Date().toISOString());
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    setInvoiceLink(null);
    const f = new FormData(e.currentTarget);
    try {
      if (!DEMO_MODE && !signedIn) await session.login(String(f.get("token") || ""));
      const response = await fetch("/api/invoices", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          customerEmail: f.get("email"),
          ...(draftId ? {invoiceId:draftId} : {}),
          billingAddress: {line1:f.get("billingLine1"),city:f.get("billingCity"),state:f.get("billingState"),postal_code:f.get("billingZip"),country:"US"},
          requestedAt,
          totalJobAmount: total,
          depositPaid: deposit,
          description: f.get("description"),
          chargeStoredCard: charge,
          ...(charge
            ? {
                memberId: f.get("memberId"),
                paymentMethodId: f.get("paymentMethodId"),
                authorizationConfirmed: f.get("authorized") === "on",
              }
            : {}),
        }),
      });
      const data = await response.json();
      if (response.status === 401) {session.invalidate(); onSessionExpired?.();}
      if (!response.ok) {
        if (data.invoiceId) {setDraftId(data.invoiceId); onInvoiceUpdated?.();}
        setVerificationRequired(data.code === "invoice_account_verification_required");
        throw new Error(data.error);
      }
      setDraftId(null); setVerificationRequired(false); onInvoiceUpdated?.();
      const invoiceTotal = data.invoice?.total;
      const totalLabel = invoiceTotal?.amount != null
        ? new Intl.NumberFormat("en-US", {style:"currency",currency:invoiceTotal.currency || "usd"}).format(Number(invoiceTotal.amount))
        : null;
      setMessage(
        data.demo
          ? data.message
          : `Invoice ${data.invoice.id}: ${data.invoice.status}.${totalLabel ? ` Total including tax: ${totalLabel}.` : ""} Check Whop for delivery or charge status.`,
      );
      const link = data.invoice?.checkout_link;
      if (typeof link === "string") {
        try { const u = new URL(link); if (u.protocol === "https:" && (u.hostname === "whop.com" || u.hostname.endsWith(".whop.com") || u.hostname.endsWith(".whop.app") || u.hostname.endsWith(".whop.site"))) setInvoiceLink(u.href); } catch {}
      }
      setKey(crypto.randomUUID());
      setRequestedAt(new Date().toISOString());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Invoice could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }
  const content = (
    <>
      <p className="notice">
        {DEMO_MODE
          ? "Demo calculator · no invoices are created and no cards are charged."
          : "Authorized contractor access. Confirm job completion, the deposit received, and the customer’s billing agreement before submitting."}
      </p>
      <form className="admin-form" onSubmit={submit} onChange={(e) => {if (draftId) {if (!(e.target instanceof HTMLInputElement && e.target.name.startsWith("billing"))) {setDraftId(null); setVerificationRequired(false);} setKey(crypto.randomUUID()); setRequestedAt(new Date().toISOString());}}}>
        <label>
          Customer email
          <input
            name="email"
            type="email"
            placeholder="homeowner@example.com"
            required
          />
        </label>
        <label>Customer billing street address<input name="billingLine1" defaultValue={sampleAddress?.line1} autoComplete="billing address-line1" minLength={5} maxLength={250} required /></label>
        <div className="form-grid">
          <label>City<input name="billingCity" defaultValue={sampleAddress?.city} autoComplete="billing address-level2" minLength={2} maxLength={100} required /></label>
          <label>State<input name="billingState" defaultValue={sampleAddress?.state} autoComplete="billing address-level1" placeholder="TX" pattern="[A-Za-z]{2}" maxLength={2} required /></label>
          <label>ZIP code<input name="billingZip" defaultValue={sampleAddress?.postal_code} autoComplete="billing postal-code" placeholder="78701" pattern="[0-9]{5}(-[0-9]{4})?" maxLength={10} required /></label>
          <label>Country<input value="United States" readOnly /></label>
        </div>
        <small>{sampleAddress ? "Sandbox sample address · edit to match your test customer." : "Use the customer’s billing address. Whop calculates applicable tax before issuing the invoice."}</small>
        <div className="form-grid">
          <label>
            Agreed project total ($)
            <input
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Deposit received ($)
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              required
            />
          </label>
        </div>
        <label>
          Invoice description
          <textarea
            name="description"
            defaultValue="Final roof replacement balance after completed walkthrough"
            minLength={3}
            maxLength={500}
            required
          />
        </label>
        <div className="balance">
          <span>Balance before tax</span>
          <strong>
            $
            {Math.max(
              0,
              (Math.round(total * 100) - Math.round(deposit * 100)) / 100,
            ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </strong>
        </div>
        <small>Whop calculates applicable tax when issuing the invoice. The payment link shows the final total.</small>
        <label>
          Collection method
          <select
            value={charge ? "card" : "invoice"}
            onChange={(e) => setCharge(e.target.value === "card")}
          >
            <option value="invoice">
              Email a payment link · due in 7 days
            </option>
            <option value="card">Charge authorized saved payment method</option>
          </select>
        </label>
        {charge && (
          <>
            <label>
              Whop member ID
              <input name="memberId" placeholder="mber_…" required />
            </label>
            <label>
              Saved payment method ID
              <input name="paymentMethodId" placeholder="payt_…" required />
            </label>
            <label className="check-label">
              <input name="authorized" type="checkbox" required />
              <span>
                I verified the completed work, deposit received, and customer
                authorization for this exact final balance.
              </span>
            </label>
          </>
        )}
        {!DEMO_MODE && !signedIn && (
          <label>
            Contractor access token
            <input name="token" type="password" autoComplete="off" required />
            <small>
              Unlocks a shared contractor session for up to 4 hours. The token is not saved in browser storage.
            </small>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {verificationRequired && <a className="button secondary" href={`https://${process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "sandbox" ? "sandbox.whop.com" : "whop.com"}/verify-identity/${process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID}/`} target="_blank" rel="noopener noreferrer">Complete Whop verification ↗</a>}
        {message && (
          <p className="success-inline" role="status">
            {message}
          </p>
        )}
        {invoiceLink && <a className="button secondary" href={invoiceLink} target="_blank" rel="noopener noreferrer">Open Whop invoice payment link ↗</a>}
        <button
          className="button primary full"
          disabled={busy || total <= deposit}
        >
          {busy
            ? "Processing…"
            : DEMO_MODE
              ? "Preview final balance"
              : draftId
                ? charge ? "Retry saved draft & charge" : "Retry sending saved draft"
                : charge
                ? "Issue invoice & charge saved method"
                : "Create & send invoice"}
        </button>
      </form>
    </>
  );
  return embedded ? content : <Modal title="Contractor workspace" onClose={onClose!}>{content}</Modal>;
}
