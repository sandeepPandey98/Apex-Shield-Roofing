/** Whop invoices can return a signed receipt token instead of an absolute URL.
 * Route verified against the sandbox dashboard's “Preview checkout” action.
 */
export function invoiceCheckoutLink(value: unknown, environment = process.env.ROOFING_WHOP_ENVIRONMENT || process.env.WHOP_ENVIRONMENT || "sandbox"): string | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  const signed = /^(pay_[A-Za-z0-9]+)\.([A-Za-z0-9+/=_-]+--[a-fA-F0-9]+)$/.exec(value);
  if (signed) {
    if (!["sandbox", "production"].includes(environment)) return null;
    const url = new URL(`/checkout/${signed[1]}/`, environment === "production" ? "https://whop.com" : "https://sandbox.whop.com");
    url.searchParams.set("token", signed[2]);
    return url.href;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "whop.com" || url.hostname.endsWith(".whop.com") || url.hostname.endsWith(".whop.app") || url.hostname.endsWith(".whop.site")) ? url.href : null;
  } catch { return null; }
}
