# Bounty submission worksheet

> Whop now rejects POST /leads with HTTP 410. Current capture uses Members + private notes + metadata. Confirm acceptance of this replacement with the bounty owner; see docs/LEADS-MIGRATION.md.

Status: local implementation complete; account integration and hosted acceptance pending.

## Deliverables

- [x] Separate project with Next.js, TypeScript, and central contractor configuration.
- [x] Responsive landing page with services, service area, financing explanation, sample reviews, estimate form, and contractor panel.
- [x] Supported Whop Elements integration and real REST transport paths.
- [x] Client analytics hooks for the three named events.
- [x] Validated lead requests and authenticated invoice actions.
- [x] Next production build and Whop Vite/Worker upload bundle.
- [x] Local API simulation and client recovery checks; see docs/VERIFICATION.md.
- [x] Explicit existing-method setup intent after deposit payment, with verified success and protected retry/recovery paths.
- [ ] Original bounty URL and exact eligibility/acceptance criteria reviewed.
- [x] Sandbox account, API key and three real plan IDs configured.
- [ ] Payment fields rendered with real sandbox plans; $149/$399/$500 checkouts verified.
- [x] Actual sandbox replacement deposit and linked succeeded setup verified through the API; recovered confirmation displayed in the browser.
- [x] Actual sandbox Whop lead retrieved through the API with linked user and submitted contact/property metadata.
- [x] Actual sandbox manual-payment invoice sent: native status open, payment link present, and one send-history record. Stored-method invoice settlement remains unverified.
- [ ] Actual Whop pixel/network event delivery demonstrated.
- [x] Whop deployment authenticated, uploaded and reachable at https://apex-shield-roofing-demo.whop.site (current hosting suffix differs from the original bounty).
- [ ] Hosted mobile/desktop console and layout checks completed.
- [ ] Source repository URL and walkthrough video supplied.
- [ ] Bounty submission posted by the user.

## Walkthrough outline (3–5 minutes)

1. Show the Whop-hosted URL and responsive landing page.
2. Open `config/site.ts`; explain how one contractor is rebranded.
3. Show the three service prices, ZIP success/failure, and an estimate request appearing in the Whop account.
4. Complete an eligible sandbox deposit with the card-saving disclosure, then show the receipt and saved method in Whop.
5. Use the authenticated contractor panel to invoice a remaining balance and show its real status in Whop.
6. Show all three analytics events delivered to Whop.
7. Briefly show build/test results and setup instructions. Do not show secrets.

## Submission text to complete after account checks

> Built a reusable roofing contractor website template with configurable branding, inspection/repair/replacement services, ZIP eligibility, quote capture, and Whop payments. Replacement deposits support explicit off-session payment-method saving; the authenticated contractor workspace creates and sends or issues final-balance invoices. Includes typed validation, server receipt verification, analytics hooks, a Whop hosting bundle, and setup documentation.
>
> Live URL: [fill with actual returned URL]
> Source: [fill with actual repository]
> Walkthrough: [fill with actual recording]
> Sandbox lifecycle evidence: [fill only after real verification]
>
> SDK/API differences from the pasted spec and the deposit express-checkout limitation are documented in docs/SETUP.md.

Do not claim live API, analytics, payment saving, or deployment success from a local demo or mocked test.
