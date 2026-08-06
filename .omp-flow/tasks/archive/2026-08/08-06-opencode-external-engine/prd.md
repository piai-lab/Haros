---
type: "PRD"
title: "One real OpenCode external Engine"
---

# One real OpenCode external Engine

## Selected direction

Continue the exact OpenCode `1.14.40` `opencode acp` slice under the maintainer's r1.3 no-ACK
owner amendment. The source/protocol facts and the minimal repository seam are fixed by
[the Research synthesis](research/synthesis.md),
[the ACP boundary](research/opencode-acp-boundary.md), and
[the Product gateway seam](research/product-gateway-seam.md).

The product outcome is one explicit OpenCode choice for the next Run in an existing visible
Conversation. Pi remains the initial/default Engine and keeps its native Model, Thinking, Package
and accepted-operation semantics. OpenCode remains an independently installed process and owns its
Session, auth, provider/model/mode, tools, upgrade and private execution state.

## Observable requirements

### R1 — Exact external Engine and distribution truth

- Product availability is derived from the already installed OpenCode executable, its resolved
  path, version `1.14.40`, exact SHA-256, ACP v1 initialize response and process health.
- OmniMind does not vendor, install, update, patch, redistribute or alter OpenCode or its global
  configuration. It does not copy credentials or private Session contents.
- Missing executable, digest/version/protocol mismatch, initialize failure and auth-required state
  are distinct unavailable reasons. They preserve the OpenCode selection and draft/Queue input and
  invoke neither Pi nor another Engine.

### R2 — Same Conversation and explicit next-Run Engine choice

- The Composer exposes Engine separately from Pi's Model and Thinking controls. Pi is selected by
  default for a new or unmodified next Run.
- Selecting OpenCode affects only the next Run/Queue item. It does not change the Conversation,
  mutate the active Run, emit a Timeline/Toast event or erase Pi selection facts.
- A submitted OpenCode Run is stored in the same Product Conversation and visibly identifies its
  frozen Engine choice. A later Pi Run still uses the Pi Gold Path.

### R3 — Honest catalog, capability, policy and enforcement

- The Product catalog can represent the concrete Pi and OpenCode choices concurrently without a
  plugin registry or generic Engine framework. The Pi entry preserves its existing exact catalog.
- OpenCode capability, Session/model/mode and availability facts originate from the real ACP path.
  Values returned by one Session are not persisted as a global static mirror or claimed universally
  authenticated.
- OpenCode Thinking-level selection, structured Question, steer/follow-up, Product Terminal,
  Package and namespaced UI controls remain unavailable unless the exact protocol proves them.
- Product freezes the user permission policy separately from enforcement truth. OpenCode
  enforcement is `unverified` until a real denied side effect is proved; UI never calls ACP or
  process isolation a sandbox or `host-enforced`.
- For this slice OpenCode supports only a locked `approval-required` Product policy: any ACP
  permission request is rejected because no approval UI is in scope. `auto` and `full-access` are
  unavailable for OpenCode rather than displayed as controls that do nothing. OpenCode's own
  allow/deny rules remain external and keep enforcement `unverified`.

### R4 — Product admission and exact dispatch routing

- Product admission atomically turns the editable Queue item into one Run, frozen requested
  selection, dispatch receipt and outbox attempt before external prompt dispatch.
- The frozen `engineId` routes preflight, attempt, control and recovery. Opaque Session/operation
  references are never parsed for routing. Pi lineage is never passed to OpenCode and OpenCode
  lineage is never passed to Pi.
- The OpenCode prompt crosses stdio at most once. Any OpenCode unavailability or failure invokes Pi
  zero times and never silently substitutes a different model or Engine.

### R5 — No-ACK delivery and settlement truth

- Local stdio write, PID/process liveness, `session/new`, `session/load`, `session/resume`, scheduled
  notifications and `available_commands_update` are diagnostic only.
- The first fact causally and uniquely correlated to the exact in-flight prompt/Run records
  observed delivery and Engine execution authority. Product does not fabricate an acceptance ACK or
  opaque operation reference for that transition.
- A correlated final/error settles the Run. A disconnect/process loss before any correlated fact is
  `delivery_unknown`; loss after at least one correlated fact and before final/error is
  `outcome_unknown`.
- Both unknown states retain the exact input, requested selection and immutable attempt evidence,
  with `attemptCount = 1`, automatic replay `= 0`, fallback `= 0`. Neither returns to editable Queue.
- Pi's existing distinct accepted-operation receipt and recovery semantics remain unchanged.

### R6 — Stream, external lineage and persistence

- Only allowlisted ACP message/thought/tool/plan/usage/permission/final facts enter Product
  projection. Raw ACP payloads, hidden reasoning, credentials, config, full tool input/output and
  private transcript do not enter durable Product state or renderer contracts.
- Product stores an opaque OpenCode Session lineage reference and the actual resolved Engine facts
  needed for the visible Run. Session load/resume may restore lineage after process restart but can
  never settle or replay an ambiguous prompt.
- Engine-scoped lineage, receipt and fact sequence survive Product Service restart. Recovery routes
  by the Run/receipt Engine identity and preserves the same unknown/no-replay result.

### R7 — Cancellation and late truth

- Product cancellation sends `session/cancel` at most once and records `abort_requested`; neither
  the notification write nor a process signal proves cancellation.
- Until OpenCode supplies an explicit cancellation acknowledgement, UI never shows `cancelled` or
  `abort confirmed`. Late prompt-correlated facts and correlated final/error remain authoritative.
- An observed `end_turn` after cancellation settles truthfully as settled-after-abort-request with
  cancellation unconfirmed; it is not rewritten to cancelled.

### R8 — Focused and decisive proof

- Closed contract tests prove two concrete Engine choices, preserved unavailable OpenCode intent,
  Engine-derived enforcement and rejection of raw/unknown wire fields.
- Product tests prove Engine-scoped routing/lineage/control/recovery, OpenCode attempt count one, Pi
  invocation zero, pre-observation `delivery_unknown`, post-observation `outcome_unknown`, restart
  no-replay and late-final-after-cancel reconciliation.
- Web browser tests prove Pi default/Gold Path, explicit OpenCode next-Run choice, capability/control
  differences, preserved draft/selection on unavailability and selection-aware health gating.
- Deterministic child-process tests cover NDJSON framing, malformed/bounded input, stderr separation,
  send boundary, prompt correlation, final/error, cancel and both disconnect windows.
- The smallest production-path real journey uses the exact installed binary and records only
  sanitized version/digest/protocol/timing/count/result evidence. It proves the same Conversation →
  OpenCode selection → real process → visible stream/final → opaque Session lineage path.
- One different actor reviews the frozen candidate. The implementation is one atomic commit; F-13
  advances at most to `candidate`; the Bundle finishes and archives with a clean worktree.

## Constraints and non-goals

- No Remote target, marketplace/catalog completion, release/signing or future distribution policy.
- No generic multi-Engine SDK/registry, no duplicate Product runtime/control plane and no
  OpenCode-branded durable Product ontology.
- No lowest-common-denominator Pi rewrite. Existing Pi native behavior and accepted Package proof
  remain predecessor evidence unless a changed path creates a specific falsifier.
- No Product ownership of OpenCode credentials, global configuration, provider availability,
  Session transcript, model execution, tool semantics or upgrade lifecycle.
- No transcript heuristic, PID inference, Session resume or synthetic operation ID may substitute
  for per-prompt correlation.

## Acceptance matrix

| ID | Claim | Proof |
| --- | --- | --- |
| A1 | Pi remains initial/default and its current Model/Thinking path works unchanged | Contract + browser + affected Pi boundary tests |
| A2 | Existing Conversation dispatches one explicitly selected OpenCode next Run | Service/browser journey plus one sanitized real production-path journey |
| A3 | OpenCode unavailable/auth/incompatible state preserves exact intent and dispatches no fallback | Contract, Service and browser tests with Pi call count zero |
| A4 | Catalog/capability/permission/enforcement truth comes from exact ACP/process evidence | Exact source/version/digest receipt, boundary tests and visible browser assertions |
| A5 | First correlated fact is observed delivery without fabricated ACK/reference | Contract/state-machine tests and deterministic child fixture |
| A6 | Pre-observation and post-observation losses become the correct unknown state with one attempt and no replay | Deterministic process fault matrix plus restart Product tests |
| A7 | Cancel remains request-only and late `end_turn`/error reconciles truthfully | Deterministic fixture plus smallest safe real cancel observation already bound in Research |
| A8 | External Session/auth/model/config/private execution stay external | Persistence inspection, closed schema tests and independent review |
| A9 | Frozen candidate passes focused type/unit/browser/process gates and one different-actor review | Linked check receipts and accepted Review Concept |

## Product decisions

No unresolved product decision blocks Design. r1.3 selects the no-ACK observed-delivery rule,
retains OpenCode `1.14.40`, preserves Pi semantics and forbids fallback. Design may choose the
smallest stable schema/interface expression, but it may not weaken or rename these observable
truths.
