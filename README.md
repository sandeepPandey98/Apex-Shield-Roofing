# Apex Shield · Whop roofing website template

> Current estimate capture uses Whop Members + private customer notes + metadata. Whop’s former POST /leads now returns HTTP 410. See [migration evidence and bounty implications](docs/LEADS-MIGRATION.md).

A separate project for the US Roofing Website Template workforce bounty. The supplied business, reviews, license number and phone are illustrative. **The site starts in demo mode: it validates requests but never creates leads, invoices, or payments.**

## Run locally

Requires Node.js 22+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3100. No credentials are needed for the demo. For a production-style Next preview, run `npm run build` then `npm start`.

## What is included

- Responsive roofing landing page, mobile navigation, service cards, process, financing explanation, reviews, FAQs and estimate form.
- Three configured services: $149 inspection, $399 repair, $500 replacement deposit.
- Service-area ZIP validation on the client and server.
- Whop Elements checkout with PaymentElement, EmailElement and BrandingElement. Separate ExpressCheckoutElement for inspection and repair. For deposits, wallets are offered through PaymentElement where eligible; standalone express checkout is intentionally omitted because its Checkout provider does not expose the required card-saving option.
- Explicit off-session authorization on deposits, server-selected service plans, confirmation token payments, and server-side receipt verification. After the deposit is paid, an explicit Whop setup intent re-verifies the existing method; server verification must succeed before confirming card-on-file readiness. See [docs/SETUP-INTENTS.md](docs/SETUP-INTENTS.md).
- Lead capture through the current Whop `/leads` endpoint. Homeowner contact and property details are attached as metadata; the current lead schema does not have top-level name/email/phone fields. The server resolves/creates a Whop member first and passes its user ID to the lead endpoint. This requires `member:manage` in addition to the lead permissions.
- Contractor workspace with final balance calculation, authenticated live invoice creation, email delivery, and explicitly authorized saved-method billing.
- The three requested analytics events through `window.whop.track` when available. Local fallback is console/debug plus a browser event; it is not evidence of delivery to Whop.
- A second build target for Whop hosting, using the same React components and API route handlers in a Cloudflare Worker. Whop's current CLI requires this Vite/Worker format.
- 39 server/client checks plus 2 React UI regression tests, a reduced provider OpenAPI contract, a Postman HTTP simulation, setup notes, and a submission checklist.

## White labeling

Edit `config/site.ts` for company information, contact details, covered ZIPs, services, prices, reviews and FAQs. Keep public plan IDs consistent with the amounts configured in Whop. Set `demoBrand` to false only after replacing sample reviews and verifying all business claims. Check the static Whop HTML title/description in `index.html` if changing the brand.

## Connect Whop sandbox

See [docs/SETUP.md](docs/SETUP.md). Copy `.env.example` to `.env.local`, then populate account and plan IDs and a sandbox API key locally. Never paste keys into chat or put them in a `NEXT_PUBLIC_` variable. Rebuild after changing public configuration.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development, port 3100 |
| `npm run build` | Next.js production build |
| `npm run typecheck` | TypeScript check |
| `npm run test:ui` | React checkout lifecycle and error-boundary regression tests |
| `npm test` | 39 checks; starts and stops a local Postman simulation on 4110 |
| `npm run dev:whop` | Whop-compatible Vite/Worker development, port 3101 |
| `npm run build:whop` | Creates `dist/client`, `dist/server`, and `dist/whop-build.zip` |
| `npm run preview:whop` | Runs the packaged Worker locally, port 3101 |
| `npm run deploy:whop -- --app app_YOUR_ID` | Rebuilds the Whop target, then uploads using the authenticated CLI |

`npm test` requires Postman CLI 1.70+; validated here using 1.80.0. It makes HTTP calls to a local stand-in, not to Whop. It does not establish real payment, wallet, BNPL, card-saving, CRM, or invoice delivery behavior.

## Current status

Local implementation, Next production build, Whop upload packaging, and the HTTP simulation tests are working. Actual sandbox lead creation and a replacement deposit with a linked succeeded setup are verified. Invoice creation/delivery, pixel delivery and hosted deployment still need account validation. The sandbox account and all three plan IDs are now connected. Whop CLI deployment authentication remains separate. The original bounty URL has not yet been supplied, so exact acceptance criteria remain to be checked.

## Project map

- `app/`: Next.js pages and server routes.
- `components/`: landing page, estimate form, checkout, receipt and contractor workspace.
- `config/site.ts`: central contractor configuration.
- `lib/`: validation, money calculation, API transport, tracking and HTTP guards.
- `whop/`: Vite entry and Worker adapter reusing the Next handlers.
- `postman/`: local provider stand-in, simulation and verification context.
- `docs/`: setup, API contract and bounty submission checklist.

## Limits before a real contractor launch

The website is a service/commerce template, not a scheduling or job management system. A successful payment does not reserve a specific date. The contractor agrees scope, appointment, and final balance directly. Invoice tools require the operator to verify the deposit and authorized balance; there is no persistent jobs ledger. Browser receipt verification is informational; use verified Whop webhooks and durable storage before automating fulfillment. The lead rate limiter is per process and needs shared storage when running multiple instances. Do not expose a production contractor token to homeowners.

## Sources and asset

Implementation checked against the [Whop API contract](https://api.whop.com/api/v1/openapi.json), dated 2026-11-12, [Elements docs](https://docs.whop.com/elements/latest/getting-started), and [current hosting docs](https://docs.whop.com/developer/websites/hosting). A copy of the relevant API contract is in `docs/whop-api-contract.json`. Hero photograph: [Unsplash image](https://images.unsplash.com/photo-1570129477492-45c003edd2be), downloaded as `public/roofing-home.jpg`; illustrative architecture, not a claimed contractor project.

Contractor pages: `/admin/leads`, `/admin/tracking`, `/admin/invoices`. Use `CONTRACTOR_ADMIN_TOKEN` from your private env file to load Whop account records. See [workspace setup](docs/CONTRACTOR-WORKSPACE.md) for permissions, recording steps and sidebar limitations.
