---
type: "Implementation Work"
title: "Deliver a truthful OpenCode next Run"
revision: "work-deliver-truthful-opencode-next-run-20260806-r1.9"
---

# Deliver a truthful OpenCode next Run

## Objective

Deliver [PRD R1–R8](../prd.md) as one real external-Engine checkpoint: in the same visible Product
Conversation, an explicit next-Run OpenCode choice reaches the exact user-installed OpenCode
`1.14.40` ACP process with Engine-owned Session/model/mode/private execution, truthful capability
and permission differences, no fabricated ACK/cancel receipt, and zero replay/fallback. Pi remains
the initial/default bundled-native Gold Path with its real accepted-operation reference unchanged.

The binding technical route is the repaired [Design](../design.md), the human-approved
[QbD 1 repair](../decisions/qbd1-calibration.md), the exact
[ACP evidence](../research/opencode-acp-boundary.md) and the
[Product seam evidence](../research/product-gateway-seam.md), with candidate ordering from
[QbD 2 calibration](../decisions/qbd2-calibration.md) and persistence authority from the
[cross-store calibration](../decisions/cross-store-calibration.md).

## In scope

### Closed Product contract and concrete migration

- Increment the closed Product protocol and Store once to v2.
- Express a maximum-two composed catalog, explicit Engine choice, Engine-owned current
  model/mode choice, Service-derived enforcement, Pi ACK evidence and no-ACK observed-delivery
  evidence without synthetic operation IDs.
- Replace Product-facing Native Host fact/sequence names with stable Engine execution terms; keep
  raw ACP and Native Host wire types behind their Service boundaries.
- Implement the concrete v1 migration inventory from Design: all authoritative Queue/Run/receipt
  JSON, outbox metadata, submit-admission exact-byte identity, all 24 mutation request/response
  families, Automation definition selection, Automation Run permission-snapshot selection and
  reconstructible fact reset through the Design's startup-only two-store coordinator. Each file has
  its own transaction and matching concrete marker; mixed versions block all runtime owners and are
  never called atomic. Preserve Automation identity, schedule, enabled state, permission semantics
  and due-run behavior. No dual runtime read, third ledger, generic migration framework or deletion
  of idempotency authority.
- Bind `product_runs.requested_selection_json` to its actual production v1 codec,
  `ProductSelectedRuntime`, and apply the Design's exact preserve-not-normalize mapping. Preserve
  legacy Engine/model/thinking/policy/target/Package history byte-for-value; omit enforcement only
  from selected intent while validating/preserving independently resolved truth. Prove complete
  canonical bytes plus every named cross-row contradiction and legal unresolved receipt state.

### Literal Product gateway and Pi preservation

- Compose exactly the current Pi boundary and one concrete OpenCode boundary; route prepare,
  attempt, control and recovery only by frozen `engineId`/Run state.
- Make lineage selection Engine-scoped and force new lineage after any later admitted
  different-Engine Entry, even when it never produced a binding.
- Preserve Pi catalog, Package leases, real operation references, native controls and fact
  reconciliation. OpenCode never acquires a Package lease or drives Pi quarantine.
- Keep attempt count at the actual non-idempotent send boundary, automatic replay zero and unknown
  Runs blocking a second admission.

### Concrete OpenCode ACP process

- Resolve and verify the exact installed executable/version/digest; start `opencode acp` only from
  Product Service; implement bounded NDJSON JSON-RPC, correlation, stderr separation, timeouts and
  cleanup without copying or changing OpenCode/config/credentials.
- Prepare one external Session before admission, resolve its actual current model/mode, keep only
  an opaque lineage and short-lived local handle, and allow exactly one prompt in flight.
- Treat local write/Session/global notifications as diagnostic. First unique prompt-correlated fact
  establishes observed delivery; correlated final/error settles; the two loss windows become the
  matching unknown state with one attempt and zero replay/fallback.
- Record cancel only as requested, reject every ACP permission ask because approval UI is outside
  scope, consume late facts/final/error, and keep enforcement `unverified`.
- Use only the validated Product-private Chat scratch lifecycle specified by Design; reject
  folder-backed/resource-bearing OpenCode dispatch in this slice and never claim sandboxing.

### Workbench choice and truth

- Add a separate next-Run Engine control with Pi default. Preserve Pi Model/Thinking exactly.
- OpenCode shows Engine-current model/mode resolution, locked `approval-required`, ACP ask denial,
  Engine-owned rules and `unverified` enforcement as distinct facts; unsupported controls are
  absent/disabled truthfully.
- Preserve exact draft/Queue selection on unavailable OpenCode; make readiness selection-aware so
  Pi health does not mask/disable external truth and external failure never calls Pi.
- Show observed/running/unknown/abort-requested truth without `accepted` or `cancelled` copy the
  protocol did not prove.
- Bump composer draft persistence to an explicit v2 key/schema and migrate both inventoried
  requested-selection paths before hydration using the Design's write-reread-validate-cleanup
  sequence. Keep v1 untouched on failure, expose recovery-required truth only for the affected
  draft surface, and disable stale dispatch without default/reset/fallback or cross-store claims.
- Reject protocol-v1/stale selection again at Product admission so a UI defect invokes neither
  Engine. SQLite success remains independently valid when Web draft migration fails.

## Allowed code and output boundary

- `packages/contracts/src/product/**` and the smallest export/RPC adjustments required by Product
  protocol v2.
- `apps/service/src/product/**` for the closed Store migration, Product execution facts, literal
  gateway, routing/recovery and focused tests.
- `apps/service/src/persistence/Layers/AutomationRepository.ts`, the concrete Automation schema
  migration seam and focused repository/service tests only for the two inventoried selection
  embeddings; no Automation product redesign.
- `apps/service/src/main.ts`, `serverLayers.ts`, database lifecycle-lock/WAL helpers and the smallest
  startup coordinator/tests required to complete and close both migration connections before normal
  Product/Automation owners or Web admission start.
- `apps/service/src/native-host/executionBoundary.ts` and focused tests only for the source-neutral
  Product mapping; do not change the Native Host executable/protocol authority without a falsifier.
- new source-specific `apps/service/src/opencode/**` plus deterministic child fixtures/tests.
- `apps/service/src/serverLayers.ts`, private scratch helper and package metadata/lock only when
  required to compose the two concrete boundaries and lifecycle.
- `apps/web/src/components/product/**`, `ChatView.tsx`, Product Store/read model, selection-aware
  health, localized Workbench copy and their focused unit/browser tests.
- task-local Bundle handoff/evidence and the smallest production journey harness under existing
  test/script conventions.

No write is authorized in Desktop process supervision, `apps/native-host`, Remote, release,
marketplace/catalog, Package artifacts, credentials/configuration or a second Campaign. Any newly
proved need there is a stop-and-escalate condition, not an implied lease.

The accepted upstream-first correction adopts `@agentclientprotocol/sdk@1.3.0` as the sole ACP wire,
schema, request-ID, correlation, handler-dispatch, cancellation and error authority. OmniMind keeps
only bounded process/resource/privacy supervision and Product normalization/receipt policy. The
superseded handwritten connection and its private wire tests are deleted; no handwritten fallback,
second parser or correlation wrapper may remain. Evidence must bind the exact SDK version, Apache-2.0
license, OpenCode compatibility result, selectively adapted Synara paths and a residual
duplicate-authority scan.

## Done conditions

1. Every R1–R8 acceptance row has a named test or sanitized real receipt on the frozen candidate.
2. v1 migration covers the complete Design inventory. Two-store zero-write preflight preserves both
   v1 files on malformed/unsupported/inconsistent input; each file transaction is atomic with its
   matching revision marker; all reachable crash states block runtime and converge exactly once.
   Exact semantic v2 reopen retries for dispatch, each of 24 mutation kinds and applicable
   Automation updates return stored results without reapplying effects.
3. Pi remains default and follows its real ACK path. Explicit OpenCode follows observed delivery
   without any operationRef; pre/post-observation losses, restart, duplicate submit and cancel/late
   final preserve one attempt, zero replay and zero fallback.
4. Raw ACP/private state and credentials never enter Product persistence, Web, committed evidence
   or logs; scratch and permission copy remain honest.
5. Focused contract/type/unit/browser/process gates pass on the integrated tree.
6. Exactly one sanitized production-path OpenCode journey and one smallest changed-seam real Pi
   journey pass on the same immutable candidate; each asserts the other Engine invocation count is
   zero where required.
7. [The implementation handoff](../handoffs/deliver-truthful-opencode-next-run.md) binds the exact
   tree, changed paths, operations, test commands/results, migration/fault matrix, real receipts,
   limitations and remaining risks. It does not self-approve the Work.

## Verification inventory

- Contracts: closed v2 selection/catalog/receipt/fact/control decode and illegal-transition tests.
- Store/startup: codec-anchored full schema-1 migration, complete canonical selected-Run bytes with
  non-`pi` legacy Engine identity, exact product-model choice, enforcement omission/resolved-truth
  validation and Engine/enforcement/Package/model/target contradiction fixtures; 24
  mutation families, Automation definition/run reopen/create/update/due-run/permission behavior,
  zero-write two-file preflight, matching per-store markers, file-backed WAL/process crashes at every
  boundary, exactly-once recovery, connection/lock release, no mixed-version runtime visibility,
  foreign-key/integrity and row/byte preservation.
- Product/Native mapping: two-boundary routing, Pi ACK, observed delivery, Engine-scoped lineage,
  Package isolation, attempt/replay counts, control and restart recovery.
- ACP process: exact official SDK initialize/new/resume/prompt/update/permission rejection/cancel/
  final/error/close conformance; artifact identity; OmniMind byte/newline/mailbox/time limits;
  ignored global update, typed mapping, both EOF windows and deterministic cleanup; residual scan
  proving zero handwritten framing, request IDs, response correlation or method dispatch.
- Web: Pi default, explicit next-Run Engine, Engine-current controls, policy/enforcement copy,
  unavailable preservation, selection-aware health, both draft paths migrated to canonical v2,
  interruption/write/crash/cleanup restart boundaries, recovery-required gating, stale-admission
  rejection with zero Engine calls, SQLite independence and no noise/hot-switch.
- Real: exact installed OpenCode production gateway journey; candidate-SHA default Pi Product-v2
  gateway/Native Host journey with OpenCode invocation zero.

Run focused checks while implementing. After the integrated implementation, owner, migration, test
and pre-review Bundle bytes are complete, freeze them as one atomic **unpushed implementation
candidate commit**. Run the two real journeys and affected type/test gates on that exact commit;
do not repeat unchanged provider/Package/release matrices.

## Expected handoff and review

The producer writes
[`../handoffs/deliver-truthful-opencode-next-run.md`](../handoffs/deliver-truthful-opencode-next-run.md)
after the atomic unpushed candidate exists and its proof inventory is bound to that SHA. One
different actor then reviews that exact candidate, the Work, handoff, full diff, migration/fault
evidence and both real candidate journeys and records the single PASS/changes-requested result.

If a gate or Review requires candidate bytes to change, the unpushed candidate is superseded
immediately and never advanced. The sole writer amends/replaces it so delivery retains one atomic
implementation commit, invalidates affected old-SHA receipts/handoff/Review, re-freezes a new SHA,
and reruns only affected proof plus one different-actor Review. A pushed/shared candidate or second
writer is a stop condition; history is not rewritten.

After candidate-SHA PASS, never amend the accepted implementation commit for self-referential
SHA/Review/Campaign/archive metadata. Finish may add one strictly metadata-only closure commit over
`.omp-flow` and Campaign governance bytes when required. F-13 evidence remains bound to the reviewed
implementation candidate SHA; no product, owner, contract, test, build, lockfile, legal/source or
generated production byte may enter that closure.
