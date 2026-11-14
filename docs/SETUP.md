# Account setup, sandbox verification, and Whop hosting

> **2026-11-14 API update:** Whop retired lead creation (HTTP 410). The estimate form now saves prospects and request history through Whop Members, notes and metadata. See [the migration and verification](LEADS-MIGRATION.md). Earlier lead-specific setup below describes the former endpoint.

## 1. Confirm the actual bounty

Review the original bounty URL before submission. The pasted implementation document does not match the current public Whop SDK, APIs, CLI, or default hosting domain exactly. Ask the bounty owner whether the current supported equivalents are accepted if literal component names or a `*.whop.app` URL are mandatory.

| Pasted specification | Current implementation / evidence |
| --- | --- |
| `@whop/react/elements`, `WhopCheckoutProvider` | Supported `@whop/elements-react` 1.10.0 with `WhopElements` and `Payments` |
| Payment `onComplete` on each field | Confirmation token → server `/payments` → handleNextAction → server verification |
| `ExpressCheckoutElement` on a deposit provider | Current `Checkout` has no `setupFutureUsage`; deposit uses `Payments` with the actual off-session option and server attestation. Standalone express is offered on inspection and repair. |
| `/api/v5/company/leads` | Current `/api/v1/leads` uses `account_id` and metadata; no top-level name/email/phone |
| Invoice line amount in cents | Current invoice `items[].variant.initial_price` is currency units. Internal balance arithmetic uses integer cents, then converts to dollars once. |
| Create an invoice with `collection_method` | Create draft with `payment_method_id` for saved-card billing; issue to charge, or send for manual payment. It is asynchronous: do not label an issued invoice paid. |
| `whop init` / `whop deploy` | `whop apps init` / `whop apps deploy`; Next build alone is not the accepted hosting bundle. |
| Default `*.whop.app` | Current CLI/docs show `*.whop.site`. Actual returned URL must be recorded after deployment. |

Sources checked 2026-11-13: [API](https://api.whop.com/api/v1/openapi.json), [Payments Elements](https://docs.whop.com/elements/latest/payments/overview), [Checkout Elements](https://docs.whop.com/elements/latest/checkout/overview), [Leads](https://docs.whop.com/api-reference/leads/create-lead), [Invoices](https://docs.whop.com/api-reference/invoices/create-invoice), [CLI website setup](https://docs.whop.com/developer/websites/quickstart).

## 2. Create sandbox resources

Use [Whop sandbox](https://sandbox.whop.com/dashboard/developer) for payment tests. Sandbox and production accounts, keys, products, and IDs are separate. The current Whop CLI explicitly reports production-only behavior, so do not use its resource creation commands as a sandbox shortcut.

Create three one-time USD variants/plans in the sandbox dashboard:

| Service | Amount | Public environment variable |
| --- | --- | --- |
| 21-point drone & attic inspection | $149 | `NEXT_PUBLIC_PLAN_INSPECTION` |
| Emergency leak & flashing tune-up | $399 | `NEXT_PUBLIC_PLAN_FLAT_RATE` |
| Roof replacement deposit | $500 | `NEXT_PUBLIC_PLAN_DEPOSIT` |

Collect the owning `biz_` account ID and plan IDs. Confirm all three belong to the same account. The merchant may need additional configuration for wallets, eligible BNPL methods, and domain verification. Providers decide availability at checkout; the UI makes no guarantee all providers appear.

Create a sandbox API key with the permissions the endpoints require, including lead creation/management, payment creation/charging and reading, invoice creation/issuing/sending, and member/email reads as applicable. Inline final-balance variants may require `plan:create`. Use the exact permission names in your account and the saved API contract; insufficient scopes must be fixed in the sandbox dashboard.

## 3. Local configuration

```sh
cp .env.example .env.local
```

Edit `.env.local` locally:

- Set `NEXT_PUBLIC_DEMO_MODE=false`.
- Set `WHOP_ENVIRONMENT=sandbox` and `NEXT_PUBLIC_WHOP_ENVIRONMENT=sandbox`.
- Fill `WHOP_API_KEY`, `NEXT_PUBLIC_WHOP_ACCOUNT_ID`, and the three plan IDs.
- Set `CONTRACTOR_ADMIN_TOKEN` to a random secret of at least 24 characters. It is required for signed deposit-setup verification as well as contractor invoice authentication. For example, generate one locally with `openssl rand -hex 32` and keep it out of source control.
- Set `APP_URL` to the local or hosted origin.

For local Worker secrets, create an ignored `.dev.vars` file with `WHOP_API_KEY`, `WHOP_ENVIRONMENT`, `CONTRACTOR_ADMIN_TOKEN`, and `APP_URL`. Vite's `.env.local` supplies the public build-time variables; `.dev.vars` supplies local Worker runtime secrets. Hosted secrets are set in Whop's deployment environment. They must not be embedded into client code.

Restart the server/rebuild after configuration changes. For the Next app: `npm run dev`. For the Worker: `npm run dev:whop`.

## 4. Verify the real lifecycle

1. Open each service. Check Whop-owned payment fields and branding, actual sandbox prices, loading states and error handling.
2. Complete an inspection and repair sandbox payment. Verify the server confirms a paid receipt for the expected account and plan.
3. Open the $500 replacement, agree to off-session saving, and pay with an eligible sandbox card. Verify the actual saved method in Whop. BNPL may not produce a reusable card.
4. Submit a quote using synthetic homeowner data. Check the actual lead and metadata in the owning Whop account. Company API keys require a real user identity for lead creation. The server first resolves or creates a member using the homeowner email, then passes its user ID to the Leads API. Enable `member:manage` as well as the lead permissions.
5. In the contractor workspace, enter the admin token, customer email, actual job total and actual deposit received. Send an invoice link first. Verify the draft and send event in the dashboard.
6. For an authorized sandbox saved-method charge, retrieve the real `mber_` and `payt_` IDs from Whop. Confirm they refer to that customer and review the exact balance before issuing. Check the final payment state asynchronously; a created/open invoice is not a paid invoice.
7. Verify `service_viewed`, `deposit_started`, and `estimate_requested` in the installed Whop pixel, not merely the local fallback. Estimate tracking only runs after a real lead success, never a demo validation.

Do not use a real card for these tests. Use the sandbox payment details specified by Whop for your environment.

## 5. Build and publish on Whop

The Next source is retained as requested. Whop hosting uses `vite.config.ts`, `wrangler.jsonc`, `whop/main.tsx`, and `whop/worker.ts` to compile the same components/handlers into the documented `dist/client` and `dist/server` layout. `whop()` produces `dist/whop-build.zip`.

Sign in yourself using the project-local CLI:

```sh
npm run whop -- login
npm run whop -- auth status
```

Create a website in your Whop dashboard and obtain its `app_` ID, or use the official `whop apps init --app_type website` flow in a separate temporary directory to register a new website. Do not scaffold over this finished project. Set public variables before building and server secrets in the owning app's settings. Keep both payment environments on sandbox for a hosted test site.

```sh
npm run build:whop
npm run preview:whop
# After confirming the account, app, environment, and intended public domain:
npm run deploy:whop -- --app app_YOUR_ACTUAL_ID
```

The deploy script rebuilds the Worker target, then invokes `whop apps deploy --skip_build true` so the CLI uploads the Vite archive instead of running the separate Next build command. Record the literal live URL returned by Whop. Do not substitute an assumed domain.

At the hosted origin, configure `APP_URL`, validate the three public plan IDs and account ID, and repeat all end-to-end sandbox checks. Test mobile/desktop layouts and actual wallet eligibility. Store no API keys in the submission repository, screenshots, or walkthrough video.

## 6. Before operating a real business

Replace sample business facts, contact information, reviews, license and warranty wording with verified contractor details. Agree cancellation/refund and final-balance terms. A persistent jobs/payment ledger and verified webhook processing are needed for automatic scheduling or fulfillment; those are not implemented here. Use a shared rate limiter for multiple server instances and proper staff authentication if expanding beyond this private contractor demo tool.

## Explicit setup-intent implementation

The deposit flow now creates an explicit setup intent using the paid deposit’s existing payment method, verifies it server-side, and recovers after bank redirects without creating another payment. See [SETUP-INTENTS.md](SETUP-INTENTS.md) for the exact sequence and required sandbox evidence.

## Estimate error diagnosed in sandbox

The original metadata-only lead request was rejected with HTTP 400, `user_id is required`. It was corrected to resolve/create the account member through `POST /members`, then create the lead with `member.user.id`. Customer and lead requests have separate stable idempotency keys. The sandbox key was also confirmed to return HTTP 403 for `POST /members` because it lacks `member:manage`. Add that permission to the existing key before retrying. A new key is not required. `lead:basic:read` is separately needed for a custom lead-list view; it does not fix customer resolution.

## Estimate confirmation emails (Resend)

Quote capture and transactional email are separate. After Whop saves the estimate and its index, the server optionally requests a branded customer confirmation through Resend. The screenshot example used Resend; the Whop member save alone does not invoke that external sender.

1. Create your own account at https://resend.com/signup and complete its sign-in/terms yourself.
2. In API Keys, create a Sending access key. Store it privately as RESEND_API_KEY in .env.local. Never prefix it NEXT_PUBLIC_, paste it into chat, commit it, or put it in an embed URL.
3. For a first demo, set ESTIMATE_EMAIL_FROM to `Apex Shield Roofing <onboarding@resend.dev>`. Resend's default domain only sends to the email address associated with your Resend account. Enter that address into the estimate form for the first delivery test.
4. For general homeowner addresses, add a domain you own at https://resend.com/domains, apply its DNS records, wait for verification, and use a sender on that domain instead. The whop.site address is not automatically a verified Resend sending domain.
5. Optionally set ESTIMATE_EMAIL_REPLY_TO to your real contractor inbox. The demo site's .example contact address is not a working inbox.
6. Add the same private values to the hosting app with Whop encrypted runtime secrets; local env changes do not activate the deployed site. Restart local development after env changes.
7. Submit one estimate with the permitted recipient. Inspect Resend's email record and your inbox/spam. API acceptance is not independent proof of inbox delivery.

No email configuration means estimates still save normally. A configured sender failure leaves the estimate saved and shows that email confirmation was unavailable; do not resubmit just to resend an email. The provider call uses an idempotency key derived from the saved request ID. Resend retains idempotency keys for 24 hours; this is not a permanent deduplication guarantee. This implementation does not send a separate contractor inbox alert or backfill emails for old estimates.

References: https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/knowledge-base/403-error-resend-dev-domain .
