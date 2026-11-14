"use client";
import { useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { DEMO_ESTIMATE, DEMO_MODE } from "@/config/site";
import { trackCustomEvent } from "@/lib/tracking";
export function EstimateForm() {
  const sample = DEMO_MODE || process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "sandbox" ? DEMO_ESTIMATE : undefined;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const body = {
        ...Object.fromEntries(fields),
        consent: fields.get("consent") === "on",
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.demo)
        trackCustomEvent("estimate_requested", {
          service_type: fields.get("serviceType"),
          zip_code: fields.get("zipCode"),
        });
      setSuccess(
        data.demo
          ? "Demo complete. Your request was validated; nothing was sent or saved. Live requests will appear in the contractor’s Whop account."
          : `Request received. Our team will contact you to discuss your property and next steps.${data.emailStatus === "accepted" ? " Your confirmation email has been submitted for delivery." : data.emailStatus === "failed" ? " Email confirmation is currently unavailable, but your request is saved. No need to submit it again." : ""}`,
      );
      form.reset();
      setKey(crypto.randomUUID());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="estimate-form" onSubmit={submit}>
      <div className="form-title">
        <span className="eyebrow">LET’S TALK ABOUT YOUR ROOF</span>
        <h3>Tell us a little about your project.</h3>
      </div>
      {success && (
        <div className="success-inline" role="status">
          <CheckCircle2 size={22} />
          <p>{success}</p>
        </div>
      )}
      <div className="form-grid">
        <label>
          Full name
          <input
            name="fullName"
            defaultValue={sample?.fullName}
            autoComplete="name"
            placeholder="Jamie Miller"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            defaultValue={sample?.email}
            type="email"
            autoComplete="email"
            placeholder="jamie@example.com"
            maxLength={254}
            required
          />
        </label>
        <label>
          Phone number
          <input
            name="phone"
            defaultValue={sample?.phone}
            type="tel"
            autoComplete="tel"
            placeholder="(512) 555-0123"
            minLength={10}
            maxLength={25}
            required
          />
        </label>
        <label>
          Service needed
          <select name="serviceType" defaultValue="Replacement">
            <option>Inspection</option>
            <option>Repair</option>
            <option>Replacement</option>
          </select>
        </label>
        <label className="span-two">
          Property address
          <input
            name="address"
            defaultValue={sample?.address}
            autoComplete="street-address"
            placeholder="123 Oak Street, Austin, TX"
            minLength={5}
            maxLength={250}
            required
          />
        </label>
        <label>
          ZIP code
          <input
            name="zipCode"
            defaultValue={sample?.zipCode}
            autoComplete="postal-code"
            inputMode="numeric"
            pattern="[0-9]{5}"
            placeholder="78701"
            maxLength={5}
            required
          />
        </label>
        <label className="span-two">
          Anything else? <span className="muted">(optional)</span>
          <textarea
            name="notes"
            defaultValue={sample?.notes}
            placeholder="Tell us what you’re noticing, or what you have in mind."
            rows={3}
            maxLength={2000}
          />
        </label>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Leave this blank
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="check-label">
        <input name="consent" type="checkbox" required />
        <span>
          I agree to be contacted about my roofing request. No payment is
          required to request an estimate.
        </span>
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary full" disabled={busy}>
        {busy ? "Sending your request…" : "Request my free estimate"}
        <ArrowUpRight size={18} />
      </button>
      <p className="form-footnote">
        Your details are used only to respond to your project inquiry.
      </p>
    </form>
  );
}
