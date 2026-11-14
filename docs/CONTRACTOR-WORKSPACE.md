# Contractor workspace

> **2026-11-14 API update:** Whop retired lead creation (HTTP 410). The estimate form now saves prospects and request history through Whop Members, notes and metadata. See [the migration and verification](LEADS-MIGRATION.md). Earlier lead-specific setup below describes the former endpoint.

Three reusable pages work in both Next.js and the Whop Worker build:

- `/admin/tracking`: account-wide events received by Whop in the last 24 hours. Refresh restarts the window; Load more retains the original window and uses the provider cursor. Time, event name, path and value come from Whop, never generated sample rows or localhost diagnostics.
- `/admin/leads`: account leads, newest first, including website property/service metadata. Other leads on the same account are also included.
- `/admin/invoices`: existing account invoices, payment links and the final-balance form. Creation and sending/charging are explicit actions. Opening the page or refreshing the list creates nothing.

The footer links to all three. Pages themselves show no customer data until a contractor supplies `CONTRACTOR_ADMIN_TOKEN`. Every read endpoint authenticates on the server even in demo mode, returns no-store responses, and fixes the account from server configuration. Enter the contractor token once to establish a signed, HttpOnly, SameSite=Strict cookie session lasting up to four hours (Secure over HTTPS). The raw token is cleared after sign-in and is never written to localStorage or sessionStorage. All three pages and invoice creation share this session across navigation and refreshes. Lock workspace clears the session cookie; expiry or token rotation requires signing in again. Never use the Whop API key in this form. Invoice creation retains its existing idempotency and customer authorization requirements.

## API contract

These use current `/api/v1` endpoints, not the legacy `/api/v5/company` examples in the reference text:

- `GET /api/tracking` → Whop `GET /events?account_id=…&from=…&to=…&first=100&direction=desc`. Required range is exactly 24 hours. No app-ID query is invented: this is an account-wide list. Pixel identities/contact information are omitted from our response.
- `GET /api/leads` → Whop `GET /leads?account_id=…&first=100`.
- `GET /api/invoices` → Whop `GET /invoices?account_id=…&first=100`.
- Existing invoice POST creates a draft then sends or issues it. The returned Whop HTTPS checkout link is available in the form and invoice list. Amounts use the API's major units.

Read permissions from the current OpenAPI: Events accepts company basic read, member basic read or member journey read. Leads requires lead basic read, member email read, access pass basic read and member basic read. Invoices requires payment basic read. Missing permissions produce a visible configuration error.

## Tracking and recording

The three custom events already fire at service selection, deposit checkout opening, and successful real lead creation. Each call now carries a fresh event_id to deduplicate that action. Whop hosting injects the pixel; localhost does not prove delivery. Deploy the website, perform the actions, wait about a minute, then refresh `/admin/tracking`. Empty responses stay empty. The API describes these as identity-linked events, so this view is evidence of records returned by Whop, not a guarantee that every anonymous click is available.

Read-only sandbox verification on 2026-11-13: Events HTTP 200, zero records; Leads HTTP 200, one record; Invoices HTTP 200, zero records. Creating/sending an actual final invoice, hosted pixel ingestion and deployment remain separate verification steps.

## Whop sidebar

These routes are ready to use as destinations. No Whop app experiences or sidebar entries have been created by this code change. If the app dashboard supports experience URLs and admin-only visibility, use these paths with the deployed site origin and restrict those entries to admins. Dashboard labels and available experience types depend on the app. The site's server token authentication remains required regardless of sidebar visibility. Do not treat a lock icon or hidden sidebar link as access control.

Invoice send/issue may require business verification even in sandbox. The Home page has a Verify now banner, and the billing form links directly to the Whop verification screen when that specific error occurs. The draft remains in Whop. Keep the form open and retry the saved draft after completing verification; navigating away discards only the form's draft reference, not the provider record. Existing drafts remain visible in Whop. Matching retries never create another draft, and already-issued invoices are not resent or charged again by the resume flow.

Invoice issuing also requires the customer billing address for tax. Enter street, city, state and ZIP (US). Sandbox prefills are illustrative and editable; production starts blank. An address correction updates a saved draft instead of creating another invoice. The balance shown in the calculator is before any tax Whop resolves at issue time.

## Separate Website Embed destinations

Create one Website Embed instance per route:
- Event Activity: `https://apex-shield-roofing-demo.whop.site/embed/tracking`
- Estimate Requests: `https://apex-shield-roofing-demo.whop.site/embed/leads`
- Project Billing: `https://apex-shield-roofing-demo.whop.site/embed/invoices`

These routes omit the website link and contractor navigation; Whop supplies the surrounding sidebar. Existing /admin routes retain full navigation. Keep the apps unassigned to customer products.

The contractor token remains server-only. One explicit unlock sets a four-hour HttpOnly, Secure, SameSite=None, Partitioned cookie for HTTPS embeds, shared by the three routes under the same top-level Whop site. Normal website sessions continue using SameSite=Strict. The login verifies that the browser actually retained the cookie before showing account data; blocked-cookie errors do not falsely report success. Browser support/settings can still prevent embedded sessions. Direct and embedded sessions can occupy different cookie partitions. Lock the workspace in the context where you signed in.

An env secret cannot establish a visitor's identity by itself. Generic Website Embed is not treated as verified Whop admin authentication. Automatic sign-in would require a custom Whop app identity integration with signature/audience validation plus an account-level admin authorization check; neither referrer nor iframe visibility grants access. No secret is passed in embed URLs or bundled client code.

## Event Activity views

Website actions is the default. It queries Whop for estimate_requested, service_viewed and deposit_started before pagination, so dashboard/page-view traffic cannot bury them. All hosting activity shows the unfiltered hosting-account feed. Payment records reads actual checkout-account receipts (sandbox in this demo) and shows their returned statuses and totals; it does not present those receipt rows as pixel delivery evidence. Only actions on the deployed website can demonstrate its hosted pixel tracking. Refresh after Whop's indexing delay; an empty response is not proof that a form or payment failed.
