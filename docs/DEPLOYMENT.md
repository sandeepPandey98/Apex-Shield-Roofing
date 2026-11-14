# Whop deployment

Live website: https://apex-shield-roofing-demo.whop.site

Hosting app: `app_ia5nxx6iughWGz`, owned by Apex Shield Roofing (`biz_SRlOlfuv1Ps0p9`). The initial approved production build is `apbu_l2rSnME4OjkLB`.

The CLI now publishes at whop.site. It does not offer sandbox deployment or the older `link`, `env push`, and root `deploy` workflow. The bounty's whop.app domain wording needs acceptance clarification. No custom paid domain was purchased.

## Future updates

From this directory, use `npm run deploy:whop` (or `npm run deploy`). This builds the Vite/Worker target before uploading; the separate Next.js build remains available for local use. `whop.app.json` links this directory to the hosting app.

## Configuration

Frontend NEXT_PUBLIC settings are compiled from the private `.env.local` at build time. Its app ID now refers to the hosting app; account and plan IDs continue to refer to the sandbox merchant. This demo does not enable live-money checkout.

Encrypted runtime bindings stored through `whop apps secrets set`:

- `ROOFING_WHOP_API_KEY`: the sandbox company key; `WHOP_API_KEY` is reserved by the hosting runtime.
- `ROOFING_WHOP_ENVIRONMENT=sandbox`.
- `CONTRACTOR_ADMIN_TOKEN`: shared contractor sign-in and deposit proof signing.
- `APP_URL=https://apex-shield-roofing-demo.whop.site`.
- `ROOFING_HOSTED_TRACKING=true`.
- `ROOFING_TRACKING_ACCOUNT_ID=biz_SRlOlfuv1Ps0p9`.

Server requests for payments, setups, estimates and invoices send the supplied sandbox credential and `x-whop-inject-key: none`. This prevents the host from replacing it with its production company key. Pixel events belong to the hosting business instead: Event activity uses the production Events API and Whop's automatically injected hosting credential, without exposing that credential to the application.

Private environment files remain ignored and are excluded from the CLI's source archive. Build/source preflight scanned for configured private credentials. Customer screenshots in output/ are excluded from source publication.
