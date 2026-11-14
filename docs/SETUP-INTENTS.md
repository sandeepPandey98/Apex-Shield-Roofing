# Explicit deposit setup intents

The replacement checkout now uses a real Whop setup intent, not only a payment's future-usage flag.

## Sequence

1. The buyer authorizes saving their eligible payment method and pays the configured replacement deposit through Whop PaymentElement and BrandingElement. The payment retains `setup_future_usage: off_session` to provision an eligible reusable method.
2. `/api/payments` returns the receipt and a signed, expiring proof for that specific deposit. The signing secret is checked before any deposit charge. The browser retains this proof in session storage for bank redirects and unfinished-checkout recovery. No card data is stored by the application.
3. The server verifies the deposit is paid, belongs to this contractor's replacement plan, carries saving consent, and has a member and reusable payment method.
4. `/api/setup-intents` calls Whop `POST /setup_intents` with the **existing payment_method_id obtained server-side**. Whop documents this existing-method form as re-verifying and saving a method without charging. No new confirmation token or second card form is needed. Metadata links the setup to the deposit and service.
5. A processing or action-required intent is handled using Whop's `handleNextAction` and its client secret. A bank redirect returns to `/checkout/complete?flow=deposit` and resumes the saved flow.
6. `/api/setup-intents/verify` reads the setup from Whop and compares account, member, method, deposit and service. Only `status: succeeded` with the expected saved method permits the full deposit-and-card-saved confirmation.

This is a payment followed by an existing-method setup within the same checkout. It is not a setup-mode confirmation token charged as a second payment. Non-deposit services keep their ordinary checkout flow.

## Retries and customer copy

Setup creation uses a deterministic Whop idempotency key for the deposit. Setup verification retries do not call the payment-creation endpoint. A paid deposit with pending/failed setup is described as paid, with a verification retry or contact-team instruction. Returning to replacement checkout with an unfinished flow offers verification rather than another payment form. A canceled setup requires assistance rather than silently claiming success.

The proof expires after 24 hours. An initial payment whose outcome is unknown must be checked in Whop; do not start a fresh checkout merely because a network request failed. Recovery state is per browser tab. If it is lost or expired, the customer contacts the contractor. Contractor token rotation invalidates outstanding proofs.

Homeowner screens do not display receipt, setup, member or payment-method IDs. The successful setup is recorded in Whop with `deposit_payment_id` and `service_id` metadata. Authorized contractor operations can use its member and method for final-balance invoices after agreeing the balance and completing the job.

## Configuration

- `CONTRACTOR_ADMIN_TOKEN`: at least 24 characters; also signs purpose-separated deposit proofs. Required before a deposit may be charged, even in sandbox.
- `payment:charge`: create the payment and existing-method setup.
- `payment:basic:read`: verify the receipt.
- `payment:setup_intent:read`: verify the setup.
- `member:basic:read`: receive the member needed to bind the saved method to the deposit.
- Account and plan IDs must belong to the same sandbox business. Runtime secrets belong in `.env.local` for Next or `.dev.vars`/hosted secrets for the Worker, never client configuration.

## Verification scope

The tests exercise the real route handlers against the local Postman HTTP stand-in. Client orchestration tests separately cover successful setup, redirect recovery, and retry paths. They do not establish actual bank authentication or setup success in a Whop account.

A read-only sandbox check during implementation found a paid inspection, not an authorized paid replacement deposit suitable for this setup test. A new $500 sandbox replacement checkout must demonstrate the explicit setup and its succeeded status in Whop before recording the bounty walkthrough. No payment or setup was created in Whop as part of that read-only inspection.

Source of contract: [Create Setup Intent](https://docs.whop.com/api-reference/setup-intents/create-setup-intent), [Retrieve Setup Intent](https://docs.whop.com/api-reference/setup-intents/retrieve-setup-intent), and the official OpenAPI dated 2026-11-12, with the relevant paths saved in `docs/whop-api-contract.json`.
