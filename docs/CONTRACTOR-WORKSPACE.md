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
