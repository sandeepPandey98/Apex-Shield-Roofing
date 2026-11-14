"use client";
import { useState } from "react";
import { DEMO_MODE } from "@/config/site";
import { useContractorSession } from "@/lib/use-contractor-session";
import { Modal } from "./Modal";
export function ContractorDemoPanel({ onClose, embedded = false, authenticatedSession = false, onSessionExpired }: { onClose?: () => void; embedded?: boolean; authenticatedSession?: boolean; onSessionExpired?: () => void }) {
  const session = useContractorSession(!embedded && !DEMO_MODE);
  const signedIn = authenticatedSession || session.authenticated;
  const [total, setTotal] = useState(12500),
    [deposit, setDeposit] = useState(500),
    [charge, setCharge] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
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
      if (!response.ok) throw new Error(data.error);
      setMessage(
        data.demo
          ? data.message
          : `Invoice ${data.invoice.id}: ${data.invoice.status}. Check Whop for delivery or charge status.`,
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
      <form className="admin-form" onSubmit={submit}>
        <label>
          Customer email
          <input
            name="email"
            type="email"
            placeholder="homeowner@example.com"
            required
          />
        </label>
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
          <span>Final balance</span>
          <strong>
            $
            {Math.max(
              0,
              (Math.round(total * 100) - Math.round(deposit * 100)) / 100,
            ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </strong>
        </div>
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
              : charge
                ? "Issue invoice & charge saved method"
                : "Create & send invoice"}
        </button>
      </form>
    </>
  );
  return embedded ? content : <Modal title="Contractor workspace" onClose={onClose!}>{content}</Modal>;
}
