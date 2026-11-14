# Simulation context — roofing

Generated 2026-11-13 from mocks: `postman/mocks/whop`.
This file is how the next session starts without redoing the setup. Fill in each
@todo as you work, and update it when something you relied on turns out wrong.

## Purpose

Mocks HTTP dependencies: whop (whop).
Endpoints covered are in each handler under `postman/mocks/whop`.

<!-- @todo Once you've worked here, replace the line above: what this stands in
     for, and what work it unblocks. Needs hindsight — leave it until last. -->
<!-- @todo Add the origin host each mock above stands in for. -->

## Execution

```sh
# start the simulation first
postman simulation run postman/simulations/roofing.sim.yaml \
  --port 3000 --output ndjson > /tmp/roofing-simulation.log 2>&1 &

# @todo start the service pointed at the simulation — command and env

# @todo prove it's up — a request and the response that confirms it

# what actually got called
grep '^{' /tmp/roofing-simulation.log \
  | jq -r 'select(.event=="request") | [.routeKey, .method, .path, .statusCode] | @tsv' \
  | sort | uniq -c

# stop
pkill -INT -f "simulation run .*roofing.sim.yaml"
```

<!-- @todo To intercept real hostnames instead of routing by routeKey, run with
     --proxy and a simulation.yaml (see `postman simulation run --help`). An
     intercepted HTTPS host is TLS-terminated with a CA minted for that run and
     deleted on exit, so record how to read its path, never the path itself:
     export NODE_EXTRA_CA_CERTS=$(grep -o '/[^ ]*/certs/ca\.pem' <log> | head -1) -->
<!-- @todo Add anything else needed to work here: how to authenticate and as
     whom, how to run the test suites, any setup they need. -->

## Assumptions

<!-- @todo Add every precondition you had to discover, the seeded test data
     worth reusing, and anything this simulation cannot reproduce — so nobody
     reads a green run as proof. Pair each claim with its consequence, like
     the generated ones below. -->

- **Under `--proxy`, a request to a hostname no mock declares reaches the real host.**
  A passing run may have hit production. Check what got called for destinations
  you didn't expect and treat them as unmocked. On a one-port run nothing is
  forwarded: a call the mock doesn't model answers 501, or 404 from a generated one.

- **Mocks do not hot-reload.**
  Restart the simulation after editing a handler. Restarting the service is not enough.

- **Only HTTP dependencies are simulated.**
  Databases, caches and queues must run as real local instances.

- **Port 3000 must be free, and only one simulation runs at a time.**
  Startup fails, or the service reaches the wrong proxy.

## Observations

<!-- @todo After each run, add a dated line to the top of the section below:
     which mocks got traffic, which got none, and anything surprising —
     unexpected statuses, unmocked destinations, behaviour the assumptions
     didn't predict. One line per run, newest first, keeping the five most
     recent; a summary, not a request log. -->

<!-- begin:observations -->
_No runs yet._
<!-- end:observations -->

## Verified run — 2026-11-13

The authoritative structured findings are now in `roofing.context.yaml`. This initial generated Markdown scaffold is retained for continuity.

Run `npm test`: the runner starts the one-port simulation on 4110, invokes the real TypeScript route handlers with `WHOP_TEST_BASE_URL=http://127.0.0.1:4110/whop/api/v1`, and stops the simulation afterwards. The override is ignored outside NODE_ENV=test. No real credentials are used.

15 tests passed; 41 request log entries were observed, including the simulation control/read requests. Tests inspect actual upstream request bodies and ordering as well as caller responses. Whop endpoint behavior remains unverified in a real account. The mock derives its covered request shapes from the saved official OpenAPI; its success/failure states are synthetic. Postman owner lookup was skipped because the CLI was signed out. Orbit discovery returned 403; direct Whop documentation was used instead.

## Setup-intent update — 2026-11-13

Added existing-method setup create/retrieve paths from the official contract and synthetic pending/canceled/mismatch cases. `npm test` now passes 27 checks with 115 request log entries including controls. See `roofing.context.yaml` for the scoped finding. Read-only sandbox inspection found no paid replacement deposit with saving consent, so no real setup intent was created during verification.

## Contractor account read views — 2026-11-13

Expanded the existing official v1 snapshot with GET events/leads/invoices and referenced schemas. Simulation now covers their required account/range queries, empty lists, cursor continuation and read-permission denial. Admin route tests assert authentication before upstream calls, no-store responses, suppression of pixel identity fields, safe invoice link protocols and exact 24-hour ranges. Actual sandbox read-only checks independently returned HTTP 200 for all three (0/1/0 records). This does not establish live hosted pixel delivery or invoice issuance.

## Shared contractor session — 2026-11-14

Admin session exchange is local application authentication; it never sends the contractor token to Whop. Session-authenticated GETs and invoice POST were exercised against the same Postman HTTP simulation. The raw token is absent from issued cookies. Cookie tampering, expiry, missing/invalid bearer and cross-origin session creation fail before upstream access. UI tests independently cover one login across three page mounts, shared invoice form login, logout and expiry.

## Lead creation retired — 2026-11-14

Actual sandbox POST /leads returned 410 gone with an explicit migration to POST /members. Replaced creation with existing-member resolution, a stable idempotent member note, a fresh member read and PATCH of merged namespaced metadata. Current contract includes members and notes paths from the official live OpenAPI. Stand-in now returns 410 for lead creation; tests assert the application never calls it. Added metadata preservation, 2,000-character notes, repeat submission, partial indexing failure and edited-form keys coverage. Actual local application returned 200 against sandbox and the authenticated estimate list returned the saved property data. Original bounty's legacy Lead criterion requires owner clarification.

## Hosted credential routing — 2026-11-14

Whop hosting replaces outbound Authorization unless x-whop-inject-key: none is sent. Explicit sandbox calls now opt out and read the custom ROOFING_WHOP_API_KEY binding, because the native WHOP_API_KEY secret name is reserved. Hosted pixel reads opt into the automatically injected company credential and scope to the hosting business instead of the sandbox merchant. Simulation tests distinguish both paths and assert the explicit credential is absent from hosted tracking requests. Fifty API/workflow checks pass.

## Invoice account verification — 2026-11-14

Actual draft create returned 201; send returned 400 invoice_account_verification_required. Stand-in reproduces the issue-stage failure. Route tests verify that a 409 response retains the draft, subsequent retry GETs and sends that same record without a second create, already-open records are not reissued, and foreign-account or changed-balance references fail. UI checks retain invoiceId across the retry and show a direct verification link. Sender verification remains an external prerequisite, never bypassed by tests or template code.

## Invoice tax address and successful send — 2026-11-14

Once verification cleared, real send failed with invoice_tax_address_required. Added validated US billing_address to create and PATCH on resumed drafts; missing address fails before upstream draft creation. Tests cover provider tax errors, correcting address without changing draft identity, and client retry retaining the reference through billing-field edits. The same actual sandbox draft was subsequently issued/sent: HTTP 200, open, checkout link returned, one native send-history record. No payment charge and no second draft. Fifty-four workflow tests and six UI tests pass.


Invoice checkout links verified against the native Whop dashboard Preview checkout action: signed pay_ receipt tokens are converted to the environment-matched /checkout/{receipt}/?token= URL. The real open invoice checkout rendered USD 12,990.00 with Whop branding and payment methods; no Pay action was performed. List, send and already-issued responses now normalize these links and reject unsafe destinations. Regression validation: TypeScript, 56 server/client checks through the local Postman simulation, and 6 React UI checks passed.
