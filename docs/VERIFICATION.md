# Verification record — 2026-11-13

> **2026-11-14 API update:** Whop retired lead creation (HTTP 410). The estimate form now saves prospects and request history through Whop Members, notes and metadata. See [the migration and verification](LEADS-MIGRATION.md). Earlier lead-specific setup below describes the former endpoint.

- `npm run typecheck`: passed.
- `npm run build`: Next.js production compilation and route generation passed.
- `npm run build:whop`: Worker, client assets and Whop upload archive produced successfully.
- `npm test`: 15/15 passed against the local Postman HTTP simulation; 41 request entries observed including controls.
- Browser: inspected 1440px and 375px layouts; opened replacement checkout preview, validated covered ZIP 78701, submitted a synthetic demo estimate, and calculated a $12,000 final balance from a $12,500 total and $500 deposit. Demo success explicitly states no external action occurred.
- Browser console: no warnings/errors observed in the tested Worker demo flow.
- No real Whop request, saved card, invoice delivery, pixel delivery, or deployment has been verified. CLI authentication is absent.

The temporary responsive frame page is an internal QA artifact and is not part of source or the upload archive. The screenshot in `output/playwright/responsive-preview.png` shows the local demo.

## Explicit setup-intent update

- TypeScript, Next.js production build, and Whop Vite/Worker build passed after the update.
- `npm test`: 27/27 checks passed. The Postman run observed 115 request log entries including controls; these establish route behavior against the stand-in, not actual bank behavior.
- New checks cover proof tampering/expiry, wrong receipt/service/account/customer/method, consent and reusable-method requirements, pending/action-required/canceled setup states, setup idempotency, redirect recovery, no new charge on setup retry, and failure before charging when the signing secret is missing.
- Both new endpoints were exercised through the running local Worker with an invalid proof and returned HTTP 403 before contacting Whop.
- Read-only sandbox lookup found a paid $149 inspection; it did not find a paid replacement deposit with the required card-saving consent. The actual $500 deposit plus setup-intent lifecycle is still pending verification.
- Checked the Whop upload archive: it excludes `.dev.vars` and `.env` files.

## Estimate identity fix

Real sandbox diagnostics showed that a company-key lead request containing only metadata fails with HTTP 400 (`user_id is required`). Customer resolution through `POST /members` then returned HTTP 403 explicitly naming the missing `member:manage` scope. No diagnostic member or lead was created. The route now resolves a customer first, validates the returned account/user identity, then submits the lead. The API stand-in was tightened to reject leads without a user ID; permission, missing/foreign identity, and retry tests were added. Actual end-to-end lead success remains pending the scope change.

Estimate fix validation: TypeScript passed; 31/31 checks passed with 138 Postman simulation request entries including controls; Whop build passed.

## Actual lead verified — 2026-11-13

After the permission update and user form submission, the sandbox Leads API returned one website-origin Replacement lead. The record has a linked Whop user and contact email, property address, and ZIP metadata. No contact values or credentials are recorded here. Setup-intent listing succeeded but returned no records, so the real replacement deposit/setup test is still outstanding.

## Failed billing-address recovery

A real sandbox deposit receipt was `open` with substatus `failed` because its US billing state and ZIP did not match. No setup intent could begin for that failed payment. Verification now distinguishes confirmed terminal failures from pending outcomes and returns sanitized, actionable billing guidance. Confirmed failures clear the failed recovery state, discard the old confirmation token, and rotate the idempotency key so corrected details can be submitted; paid/pending outcomes do not reset. TypeScript and 37 checks passed (142 simulation request entries including controls). The running Worker also returned the correct retryable billing-mismatch response for the real failed receipt.

## Checkout success display recovery

The user's replacement deposit and its linked setup intent were both verified in the actual sandbox as paid/succeeded. The blank page was a React failure reported in the Whop Email/Branding components during checkout state transitions. Hosted widgets now retain stable identity and sibling order through the paid phase and remain mounted, hidden, behind the success message until checkout closes. Scoped and root error boundaries prevent a widget exception from leaving an empty website.

Confirmed bookings are retained per tab and re-verified server-side, including account/member/method/deposit linkage for the setup. Confirmation can be recovered after refresh without charging or creating another setup. Verified confirmation strips receipt/setup references from the address bar and does not render them in customer copy.

Validation: 39 server/client checks passed with 163 Postman request entries including controls; two React UI regression tests passed for exclusive hosted-widget lifecycle and error containment. The real existing sandbox payment/setup pair returned paid=true and setupVerified=true. Browser confirmation rendered without errors, survived refresh, and returned to a populated homepage. No new payment was created during these checks.

### Contractor admin screens — 2026-11-13

Added /admin/tracking, /admin/leads and /admin/invoices for both build targets. Server-authenticated GET endpoints query current Whop v1 account APIs with cursor pagination; tracking requests the mandatory from/to range, and returns only time, name, path and value (no pixel identity data). No local dispatch or sample records are represented as delivered events. Three custom track calls now include event_id. Invoice results expose validated Whop HTTPS payment links.

Read-only sandbox API checks: events 200 (0 records), leads 200 (1 record), invoices 200 (0 records). Browser verified the one real website lead, tracking empty state and invoice form/list. Existing lead creation/payment behavior retained. Actual invoice issuance and hosted pixel delivery remain unverified. Sidebar experience configuration was not modified.

### Shared contractor session — 2026-11-14

Added POST/GET/DELETE /api/admin/session in both runtimes. Successful bearer-token sign-in returns a purpose-signed four-hour HttpOnly SameSite=Strict cookie (Secure on HTTPS); raw token is cleared from the input and not persisted in browser storage. Existing requireAdmin accepts this session for all three account views and invoice POSTs. Expired, forged and cross-purpose signatures do not authenticate. Lock clears the cookie. Browser navigation across Event activity, Estimate requests and Project billing confirmed that no second token is required, including the invoice form. Tests cover shared cookie authorization for every route, invoice authorization, expiry/tampering, cookie flags, invalid credentials, cross-origin login and sign-out, plus UI navigation/login/expiry. No real invoice created during verification.

### Initial Whop deployment — 2026-11-14

Authenticated the CLI through user-completed OAuth. Created a free platform domain and website app on the existing production Apex Shield Roofing business. Build apbu_l2rSnME4OjkLB was approved and promoted; https://apex-shield-roofing-demo.whop.site renders the roofing website and its sandbox deposit PaymentElement/BrandingElement in a browser. Python urllib requests receive the host's client-signature 403, so browser verification is used. Payment/estimate operations remain sandbox-configured through an explicitly supplied private key; hosted pixel reads use the production hosting business and injected credential. See DEPLOYMENT.md for the current runtime binding names and domain/bounty limitation.

Hosted verification: shared contractor sign-in succeeded with encrypted bindings; Estimate requests displayed the existing sandbox records. Event activity returned actual production hosting-account events. These account records are not proof that the three custom website pixel events have all arrived; that remains to be verified in the walkthrough. No new payment or invoice was created during deployment checks.

### Invoice issue/send verification requirement — 2026-11-14

Actual sandbox invoice draft creation succeeds (201), but POST /invoices/{id}/send returns 400 with code invoice_account_verification_required and the message “Complete account verification before issuing an invoice.” This is an issuing-business requirement, not a card decline, invalid email or missing invoice record. The sandbox account Home page displays “Complete your identity verification” above the balance, with Verify now leading to https://sandbox.whop.com/verify-identity/biz_lW97jyIrsV1qds/ . The user must complete that flow directly; no identity data was entered by the agent.

The application now maps that provider code to an actionable verification message and preserves the created draft reference for retry while the form remains open. The admin invoice list refreshes after draft creation even when sending is blocked. Resume reads the draft, validates its account and server-recorded billing fingerprint, and skips issuing/sending again if the invoice is already open/paid/pending/authorized. Edited billing details start a new request. Account/balance mismatches cannot reuse a draft. A temporary diagnostic draft created during investigation was removed; original user drafts were retained. No invoice email or card charge succeeded during these checks.

Invoice recovery improvements deployed as approved build apbu_oIEepegyUORDw. After the user reported completing verification, one retry of the same saved manual-payment draft still returned invoice_account_verification_required. Invoice count stayed 4 before/after the retry. The application did not create another invoice, send a successful email, or charge a stored method. Verification approval or activation in the issuing sandbox account remains required; completing a form is not treated as proof of approval.
