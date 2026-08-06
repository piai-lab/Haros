---
type: "QbD Review"
title: "Challenge the OpenCode external-Engine design"
---

# Challenge the OpenCode external-Engine design

## Audit assignment

- Bundle: `.omp-flow/tasks/08-06-opencode-external-engine`
- Role: independent QbD 1
- Bounded objective: challenge the current PRD and Design against the linked architecture owners,
  Task and Research, with particular attention to pre-admission Session preparation, private Chat
  scratch, composed catalog, Engine-scoped lineage, no-ACK receipts, cancellation, permission truth,
  persistence migration, Pi preservation and production-path proof.
- Evaluated entry: [`design.md`](../design.md), with [`prd.md`](../prd.md) as its requirement entry.
- Output: this Concept only.
- Actor ID: `opencode_qbd1_g2`
- Dispatch receipt: `f24729981a9a4c638446a8be4b16cb68`
- Predecessor receipt: `1a047b8fad5947c89d96ebfd692dd6a8`

## Verdict

**FAIL**

Risk: **high / decision-critical**. Blocking findings: **2**.

The no-ACK execution design is materially truthful: it does not promote stdio write, process
liveness, Session preparation or scheduled notifications to acceptance; it separates
`delivery_unknown` from `outcome_unknown`; it preserves late final/error truth after cancel; and it
does not claim that private scratch or a locked permission policy is a sandbox. The literal
two-boundary gateway is also bounded enough not to be a generic Engine registry.

The candidate cannot proceed unchanged, however. The persistence migration omits durable
idempotency records that contain v1 closed-wire JSON, and the proof plan reuses predecessor Pi live
evidence even though the design changes the shared Product/Native-Host path on which that evidence
depends. Those gaps respectively make upgrade recovery incorrect and Pi preservation unverifiable.

## Evidence separation

### Confirmed evidence

- The fixed OpenCode `1.14.40` ACP path has no prompt acceptance reference and no cancellation ACK;
  its first prompt-correlated fact can prove observed delivery, while correlated final/error proves
  settlement ([ACP research](../research/opencode-acp-boundary.md), especially its Prompt and Cancel
  sections; [`architecture/execution.md`](../../../../architecture/execution.md) lines 45-53).
- Product admission already owns the durable Queue/Run/outbox/receipt boundary, but its current
  catalog, lineage lookup, fact ingress, control/recovery and Web readiness are Pi/singular-boundary
  assumptions ([gateway research](../research/product-gateway-seam.md), Confirmed repository facts).
- The current store persists closed-wire JSON not only in Queue, Run and receipt tables, but also in
  `product_submit_admissions.request_json` and
  `product_mutations.request_json/response_json`
  (`apps/service/src/product/ProductControlPlane.ts`, current schema and the
  `readRecordedMutation`/`submitQueueItem` exact-byte comparisons). The corresponding request and
  result schemas embed literal `PRODUCT_PROTOCOL_VERSION = 1`
  (`packages/contracts/src/product/state.ts`, current protocol constant and mutation/submit shapes).
- The Design changes the closed Product protocol, catalog, Product Control Plane routing, Native
  Host fact/snapshot mapping and Web selection/readiness path, while its only new real gateway
  journey is OpenCode ([Design](../design.md) lines 58-112, 133-157 and 819-844).

### Assumptions to be proved by implementation

- A prepared OpenCode process and Session can remain stable between pre-admission preparation and
  the first prompt attempt, or fail before `markSent` without losing the admitted Run.
- The production boundary can prove prompt correlation with one in-flight prompt per Session while
  dropping scheduled/global updates and raw ACP payloads.
- A Conversation-scoped `0700` scratch directory can be created, validated and reclaimed without
  exposing a user folder or being described as containment.

### Strongest counter-evidence considered

- Existing Pi live and Package checkpoints prove the predecessor SHA, and deterministic mapping
  tests can strongly constrain the new gateway. They do not execute the new protocol-v2 catalog,
  gateway, Product projection and Web selection path against a real Pi Native Host on the candidate
  SHA.
- `product_facts` is reconstructible projection data and may be reset with a forced resnapshot. The
  submit-admission and mutation records are different: they are durable exactly-once identity and
  response evidence, not disposable projection history.
- A maximum-two catalog and a literal switch still use shared shapes, but they have no registration,
  factory, plugin or installation surface. That is the smallest common Product boundary justified
  by the second real Engine, not a blocking generic framework.

### Accepted or bounded risk already expressed by the design

- An empty pre-admission OpenCode Session may survive a lost Queue race because ACP has no delete.
- A no-ACK unknown Run may remain unresolved and block that Conversation.
- Cross-Engine private context is not transferred; a switch starts a visibly new lineage with only
  the current Entry.
- Permission enforcement remains `unverified`; all ACP `ask` requests are rejected in this slice,
  while OpenCode/OS access is not represented as host containment.

These are conservative, visible degradations and are not blockers for the bounded text-only Chat
checkpoint.

## Blocking findings

### B1 — The v1-to-v2 transaction omits persisted idempotency JSON

**Cause -> consequence -> decision.** The migration enumerated in Design lines 681-704 transcodes
Queue/Run choices, receipts, outbox rows and runtime sequences, then resets reconstructible facts.
It does not transcode `product_submit_admissions.request_json` or
`product_mutations.request_json/response_json`. Those records contain v1 request/result shapes with
literal protocol version `1`, and current Product code compares the stored request bytes exactly
against a newly encoded request before returning the stored response. After the atomic switch to
v2, a retry of an already admitted dispatch or recorded mutation can therefore become an identity
conflict, and a stored v1 response cannot be decoded as the sole accepted v2 shape. This breaks the
durable exactly-once/retry authority that the migration claims to preserve and makes an existing
Conversation's upgrade/recovery path incorrect. The affected decision is whether the v2 Product
Store migration is safe enough to admit the external-Engine candidate.

**Minimum repair.** Add an exhaustive persisted-JSON inventory to the Design and transcode every
schema-version-bearing submit/mutation request and response into its canonical v2 representation
inside the same rollback-safe transaction. Seed migration fixtures with an admitted dispatch and
each mutation response family, then prove same-identity retry after restart returns the original v2
result without reapplying the mutation; also prove malformed rows roll back the entire migration.

**Why removal or safe degradation is insufficient.** Deleting these ledgers discards deduplication
authority and can allow an offline/reconnecting client to reapply a mutation. Keeping them as v1
creates the forbidden dual decoder or the conflicts above. Refusing every populated v1 store makes
the existing durable Conversation path unavailable. The safe alternatives are to repair the
migration, remove/defer the schema-v2 external scope, or stop; the unchanged migration cannot be
accepted as residual risk.

### B2 — The verification plan does not prove Pi on the changed candidate path

**Cause -> consequence -> decision.** The Design inserts a new gateway into every Product
execution, changes the closed runtime catalog and receipt/fact shapes, maps the Pi Native Host into a
new Product execution interface, and changes Web selection/readiness. Yet Design lines 777-779 reuse
the old MiMo/DeepSeek/Package/ZIP checkpoint unless the lower native request/client changes, and the
only real post-change production-gateway journey in lines 819-839 selects OpenCode. The accepted
owner route explicitly treats a Native Host boundary or structured UI bridge change as a
revalidation trigger (`execution-brief.md`, Current evidence entry), and predecessor evidence is
bound to a different SHA. Split mock/fixture tests can all pass while the real Pi default path fails
at the new catalog, gateway, mapping or projection seam. The non-negotiable Pi Gold Path is therefore
unverifiable on the proposed candidate, affecting the decision to accept F-13 while claiming Pi
preservation.

**Minimum repair.** Add one smallest affected real Pi journey on the frozen candidate through the
same post-change production path: Pi default selection -> Product v2 admission -> composed gateway
-> real Native Host accepted-operation reference -> typed visible stream/final -> settled receipt,
with OpenCode invocation zero. This is not a repeat of the full predecessor matrices; it is a
focused changed-seam falsifier. If the eventual diff truly avoids every real Pi path named above,
the handoff must instead anchor that narrower diff and prove why the revalidation trigger did not
fire.

**Why removal or safe degradation is insufficient.** Hiding or disabling OpenCode after these
shared changes does not restore the predecessor Pi path; Pi still traverses protocol v2, the composed
catalog/gateway and the new mapping. Mock success and evidence from the predecessor SHA cannot
establish real behavior on the candidate SHA. The safe alternatives are to add the focused real Pi
proof, remove the shared-path change with the external scope, defer, or stop.

## Advisory observations

1. Tighten lineage divergence to visible Product chronology, not only “a later proved binding from
   another Engine.” If a different-Engine Run can become terminal before binding, its admitted Entry
   still makes the old Session stale. The conservative rule is that any later admitted
   different-Engine Run/visible Entry forces a new lineage; add that fixture or prove the state is
   unreachable.
2. Remove `acceptance-ack` from the proposed `delivery_unknown.lastConfirmedBoundary` unless a
   concrete legal transition requires it. Under the amended owner, loss after a real ACK has proved
   Engine authority and belongs to `outcome_unknown`; leaving the impossible state in the closed
   union invites a future false transition.
3. The scratch design should state stable base ownership, mode verification for pre-existing
   directories, symlink/path containment checks, orphan cleanup and restart behavior. `0700` cwd is
   privacy hygiene, not proof that OpenCode cannot access other OS paths.
4. Keep the permission copy explicit: `approval-required` is the frozen user policy, ACP asks are
   denied because approval UI is unavailable, OpenCode allow/deny rules remain external, and actual
   enforcement remains `unverified`. Do not shorten this to an “approval required” badge that implies
   all effects will ask.

## Exact next decision and options

Human calibration is required. The original scope may not continue unchanged under an accepted-risk
label.

1. **Repair:** amend the Design to cover all durable v1 JSON/idempotency records and add the focused
   real Pi candidate-path proof, then route the repaired design through the recorded human decision.
2. **Remove or safely degrade:** remove/defer the schema-v2 external-Engine scope or remove the
   shared Pi-path changes; a fresh-store-only or mock-only F-13 candidate is not the current Task.
3. **Defer:** retain the Bundle and postpone this checkpoint until migration and Pi proof can be
   supplied.
4. **Stop:** abandon the selected OpenCode checkpoint and leave the current Pi path unchanged.

Output: `.omp-flow/tasks/08-06-opencode-external-engine/qbd/design-audit.md`
Verdict: `FAIL`
Risk: `high / decision-critical`
Blocking count: `2`
Actor ID: `opencode_qbd1_g2`
Receipt: `f24729981a9a4c638446a8be4b16cb68`
