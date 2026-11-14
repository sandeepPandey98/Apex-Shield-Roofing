# Estimate capture: Whop API migration (2026-11-14)

Whop's sandbox now responds to `POST /api/v1/leads` with HTTP 410 `gone`: “Creating leads is no longer available.” Its response directs new prospects to `POST /api/v1/members`. The account key, read permissions and customer resolution were working; the retired create-lead endpoint caused the homeowner error.

## Current flow

1. Validate consent, contact details, property, service area and request key.
2. Resolve/create the member using `POST /members` (existing customers are returned without changing their access).
3. Append the full request as a private customer note using `POST /members/{member_id}/notes`. Each request has its own key; unchanged retries reuse that note.
4. Retrieve the latest member and merge namespaced `roofing_*` metadata, preserving unrelated CRM fields. PATCH `/members/{id}` indexes the latest request. Notes up to the form's 2,000-character limit are split into four metadata values to respect Whop's 500-character per-value limit. The full content remains in the note.
5. Only after all writes succeed, return success and fire `estimate_requested` in the frontend.

`/api/leads` remains our own application URL for compatibility, but it no longer calls Whop's retired lead-creation API. `/admin/leads` shows the latest website estimate per member using `GET /members`, filtering by `roofing_source`. Complete request history is retained in that member's Whop notes. Pagination follows the member list; a page without website estimates can still have a Load more button. Existing legacy Lead records are left intact and are not relabeled as new native Leads.

The current key already permits the new flow: `member:manage` for customer/notes/metadata writes and `member:basic:read` for listing/retrieval. Read-only API log access was unavailable (403), but it is not required for estimate submission. No new permissions were granted.

## Verification and bounty implication

A real existing sandbox test estimate was submitted through the local application: HTTP 200, success true, storage whop_members. The authenticated admin list returned the saved estimate with its original property details. No fake success or local-only capture was used. The existing legacy lead was not duplicated or deleted; its customer now also has a note and the indexed latest estimate.

The original bounty explicitly asks for a Lead created through the Leads API. That exact legacy operation now returns 410, so the supported Members migration should be disclosed and acceptance confirmed with the bounty owner. Do not claim this creates a legacy Lead.

Official Members API and notes/metadata reference: https://docs.whop.com/api-reference/members/member
