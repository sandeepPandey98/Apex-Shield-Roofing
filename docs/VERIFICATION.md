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

### Verified sandbox invoice send and billing address — 2026-11-14

After account verification cleared, the provider returned a different error: invoice_tax_address_required (“A billing address is required to resolve invoice tax”). The invoice form now collects a US billing street, city, state and ZIP, with editable sample details in sandbox only. New drafts include billing_address; existing matching drafts are PATCHed with the supplied address before send/issue. Address corrections retain the draft reference, and the financial fingerprint still prevents changing the amount, customer or collection method on a resumed invoice. A missing address is rejected before creating a new draft.

Retried the same saved $12,000 manual-payment sandbox invoice: application returned HTTP 200, native invoice status open, checkout_link present, and no scheduled card charge. The invoice send-history API returned exactly one send record with sent_at 2026-11-14T07:42:30.250Z. This establishes Whop accepted and recorded sending; inbox delivery was not independently inspected. No new invoice was created during that retry and no card was charged. Earlier verification-blocked findings above describe the previous account state.

Native invoice totals for the successful sandbox test: subtotal USD 12,000.00, tax USD 990.00, total/amount due USD 12,990.00. The billing calculator is now labeled Balance before tax, and the success message includes Whop's authoritative total including tax when provided.


Invoice checkout links verified against the native Whop dashboard Preview checkout action: signed pay_ receipt tokens are converted to the environment-matched /checkout/{receipt}/?token= URL. The real open invoice checkout rendered USD 12,990.00 with Whop branding and payment methods; no Pay action was performed. List, send and already-issued responses now normalize these links and reject unsafe destinations. Regression validation: TypeScript, 56 server/client checks through the local Postman simulation, and 6 React UI checks passed.

Final invoice correction deployed and approved as build apbu_ZmQpOUyoeAj8c on https://apex-shield-roofing-demo.whop.site. Deploy archive and source files checked for private API/admin credentials; none present.

### Separate embedded contractor pages — 2026-11-14

Added /embed/tracking, /embed/leads, /embed/invoices in both Next and Whop Worker builds, each without the site header or cross-page tabs. Explicit embedded login uses a secure partitioned cookie, while direct site login retains its strict cookie. All protected APIs still require a valid signed session or contractor bearer token. Added checks for shared embed authorization, forged cookies, unauthenticated bootstrap denial, embedded logout, page isolation and blocked-cookie login feedback. TypeScript, 57 workflow checks using the local Postman simulation, and 8 UI checks passed. Whop automatic user authentication is not claimed for generic Website Embed; the env token stays server-only.

Approved build apbu_KndBlcfcfhwkP includes automatic iframe layout detection for existing /admin embeds as well as the explicit /embed routes. No contractor secret is automatically delivered to visitors. Generic Whop Website Embed retains the configured URL until the owner changes it; the UI's nested Save button could not be operated reliably by the browser tool during this check, so no configuration-save success is claimed.

Live browser verification: /embed/leads rendered the real account estimates without the contractor header or tab bar, reusing the existing direct-site session; /embed/invoices rendered its distinct billing heading. The existing Whop app still points to /admin/tracking and showed its older layout after refresh, so update the app to the explicit /embed route. Cross-app partitioned-cookie reuse is covered by regression tests but has not yet been demonstrated through three separately configured Whop experiences. No invoice was sent or charged during these UI checks.

### Activity visibility and payment source — 2026-11-14

Read-only production Whop Events API verification found all three custom names in the hosting business: estimate_requested at 07:21:24 UTC, service_viewed and deposit_started at 07:17:09 UTC (plus an earlier pair). Native event filtering by pixel.custom:<name> returned all five matching records. The unfiltered account feed had 141 records across the wider diagnostic window, mostly dashboard/page views; the application previously showed only its first 100 per page. No local event was substituted for a provider-confirmed event.

Event Activity now defaults to Website actions and applies the provider's three custom-name filters before pagination. All hosting activity remains selectable. Payment records selects GET /payments using the configured sandbox account/key, its creation-time filters, and sanitized status/amount fields. It is explicitly labeled as receipt data rather than pixel events. This keeps sandbox payments separate from the production hosting pixel. No additional payment was made and no lead was submitted during these checks.

Sandbox GET /payments returned 11 records for the diagnostic window, including a paid/succeeded USD 399 receipt and open/incomplete receipts. The new display uses provider totals and finer-grained substatus, with no customer identity or payment-method data in the tracking response. TypeScript passed; 59 workflow checks through the local Postman simulation and 9 React UI checks passed. Build apbu_VzPkNWAYPs3pC approved and promoted. Configured API/admin credentials were absent from the deployment archive and publishable source.

Live deployed browser check: Website actions rendered the five provider-confirmed custom events, including all three required names. Switching to Payment records rendered SANDBOX and all 11 returned receipts, including the USD 399 succeeded payment, with incomplete and failed statuses kept distinct. Screenshots are private local verification artifacts under ignored output/. No additional lead or payment was submitted for this verification.
