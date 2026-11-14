import { createHash } from "node:crypto";
import { SITE_CONFIG } from "@/config/site";

type Estimate = {fullName:string; email:string; serviceType:string};
export type EstimateEmailStatus = "accepted" | "not_configured" | "failed";
const escapeHtml = (value:string) => value.replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function estimateEmailContent(input:Estimate) {
  const company=SITE_CONFIG.companyName;
  const greeting=`Thanks, ${input.fullName} — we got your request.`;
  const message=`We received your ${input.serviceType.toLowerCase()} estimate request. Our team will contact you to discuss your roof and next steps. No payment is required to request an estimate.`;
  const subject=`We got your roofing estimate request — ${company}`;
  const text=`${company}\n\n${greeting}\n\n${message}\n\nNeed to talk? Call ${SITE_CONFIG.phone}.\n\n${company}\n${SITE_CONFIG.tagline}`;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f4ed;color:#153f35;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce3d7;border-radius:12px;overflow:hidden"><tr><td style="padding:28px 32px;background:#153f35;color:#f8f5e9;font-size:19px;font-weight:bold">${escapeHtml(company)}</td></tr><tr><td style="padding:36px 32px"><p style="font-size:11px;letter-spacing:2px;color:#627269">ESTIMATE REQUEST RECEIVED</p><h1 style="font-size:25px;line-height:1.3;margin:16px 0">${escapeHtml(greeting)}</h1><p style="font-size:16px;line-height:1.7;color:#50645a">${escapeHtml(message)}</p><p style="font-size:15px;line-height:1.7;margin-top:26px">Need to talk? <a href="tel:${escapeHtml(SITE_CONFIG.phoneHref)}" style="color:#153f35">Call ${escapeHtml(SITE_CONFIG.phone)}</a>.</p></td></tr><tr><td style="padding:24px 32px;border-top:1px solid #e6eadf;font-size:12px;line-height:1.8;color:#627269"><strong>${escapeHtml(company)}</strong><br>${escapeHtml(SITE_CONFIG.tagline)}<br>This confirms your estimate request; it is not an appointment or payment receipt.</td></tr></table></td></tr></table></body></html>`;
  return {subject,text,html};
}

/** Email failure must never turn an already-saved Whop estimate into a failed form. */
export async function sendEstimateConfirmation(input:Estimate, requestId:string):Promise<EstimateEmailStatus> {
  const key=process.env.RESEND_API_KEY;
  const from=process.env.ESTIMATE_EMAIL_FROM;
  if (!key && !from) return "not_configured";
  if (!key || !from || /[\r\n]/.test(from)) {
    console.warn("[estimate email]",{reason:"configuration"});return "failed";
  }
  const base=process.env.NODE_ENV === "test" && process.env.RESEND_TEST_BASE_URL ? process.env.RESEND_TEST_BASE_URL : "https://api.resend.com";
  try {
    const response=await fetch(`${base}/emails`,{
      method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`estimate-confirmation-${createHash("sha256").update(requestId).digest("hex")}`},
      body:JSON.stringify({from,to:[input.email],...estimateEmailContent(input),...(process.env.ESTIMATE_EMAIL_REPLY_TO ? {reply_to:process.env.ESTIMATE_EMAIL_REPLY_TO} : {})}),
      signal:AbortSignal.timeout(8000),
    });
    const data=await response.json();
    if (!response.ok || typeof data.id !== "string" || !data.id) {
      console.warn("[estimate email]",{reason:"provider_rejected",status:response.status});return "failed";
    }
    return "accepted";
  } catch {
    console.warn("[estimate email]",{reason:"delivery_unconfirmed"});return "failed";
  }
}
