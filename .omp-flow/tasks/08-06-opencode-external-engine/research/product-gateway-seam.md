---
type: "Research"
title: "Locate the minimal Product gateway seam"
actor_id: "product_gateway_research_g2"
dispatch_receipt: "8e7e69bc7a2e4604ad83ef963e009fc6"
repository_revision: "986c3ce6d7e091d9d59e50e83f355274de621884"
---

# Locate the minimal Product gateway seam

## Research question and scope

At repository revision `986c3ce6d7e091d9d59e50e83f355274de621884` (2026-08-06), what is the
smallest complete Product/Service/Web seam that can dispatch exactly one explicit next Run to the
selected OpenCode process while preserving Pi as the default Gold Path, keeping lineage opaque and
Engine-owned, and retaining typed `delivery_unknown` / `outcome_unknown` recovery with zero silent
fallback?

This Concept is the answer to that bounded question and informs the locked framing in
[`brainstorm.md`](../brainstorm.md). The research mode is **Internal**: repository owners, current
code, tests and accepted predecessor evidence are sufficient to decide the integration seam. The
project Wiki index contains no applicable topic beyond its empty root
(`.omp-flow/wiki/index.md:1-7`). Exact OpenCode source/protocol/process facts are intentionally owned
by the parallel [`opencode-acp-boundary.md`](opencode-acp-boundary.md), so this work did not clone an
external repository, duplicate its provenance, or create a Reference Concept.

## Conclusion

The minimal safe seam is **not** a second Product runtime and is **not** an OpenCode client dropped
directly into the current `ProductExecutionBoundary`. It is one Engine-addressed Product execution
gateway inside `apps/service` that composes the existing Pi Native Host boundary with one concrete
OpenCode ACP boundary, while reusing the existing Product Queue, transactional outbox, Run,
`EngineBinding`, typed receipt, fact projection, RPC and Web Product Store.

The current outbox/receipt path already supplies the hard safety invariant: admission persists the
Entry/Run/receipt/outbox before dispatch, `markSent` durably crosses the send boundary, post-send
failure becomes `delivery_unknown`, and startup only retries pre-send rows
(`apps/service/src/product/ProductControlPlane.ts:3134-3284`, `3376-3528`, `3664-3685`,
`4232-4256`). The current contracts also retain accepted operation context through running,
settled and `outcome_unknown` states (`packages/contracts/src/product/state.ts:203-264`). Those are
stable Product mechanisms and should not be replaced.

However, a direct second-Engine hookup is unsafe today. Runtime discovery is singular; unavailable
selection loses the requested Engine; Product ingress imports Native-Host-only fact/snapshot types;
control and restart recovery are not Engine-addressed; late acceptance manufactures a `pi-binding`;
the latest Conversation lineage is selected without filtering by Engine; and Web has no Engine
selector and globally blocks submission when Native Host health is unavailable. Therefore the
evidence **confirms the first-principles anchor but revises the implementation assumption**: the
existing Product transaction is reusable, while the edge between Product Control Plane and its one
current Native Host must become minimally Engine-addressed before OpenCode can be truthful.

No Brainstorm return is warranted from repository evidence alone. The problem, principal
contradiction and locked OpenCode choice remain correct. Return to Brainstorm only if the linked ACP
research proves that no protocol observation can distinguish a truthful accepted operation from an
ambiguous stdio write, or that the journey requires Product-owned OpenCode credentials/configuration.

## Confirmed repository facts

### 1. Product already owns the correct durable safety boundary

- `ProductRequestedSelection`, `ProductRun`, `ProductEngineBinding` and the complete dispatch receipt
  union are closed typed contracts; accepted-side receipts retain opaque `operationRef`, lineage and
  the resolved selection (`packages/contracts/src/product/state.ts:152-264`, `309-320`).
- Queue admission is atomic: it validates a frozen selection, stores the visible user Entry, Run,
  resources, pending receipt, zero-replay outbox and replay-safe admission identity, then removes the
  editable Queue item (`apps/service/src/product/ProductControlPlane.ts:3134-3284`).
- `markSent` is called before a non-idempotent boundary crossing; an exception after it becomes
  `delivery_unknown`, while an exception before it returns the row to pre-send pending
  (`apps/service/src/product/ProductControlPlane.ts:3376-3528`).
- Startup converts interrupted post-send rows to `delivery_unknown`, retries only pre-send rows and
  never replays accepted/unknown rows (`apps/service/src/product/ProductControlPlane.ts:3664-3685`,
  `4232-4256`).
- The Product RPC and Web transport already carry snapshots, Queue mutations, submit, control and
  incremental facts without an Engine-specific public method
  (`packages/contracts/src/product/rpc.ts:56-92`, `apps/service/src/wsRpc.ts:253-324`,
  `apps/web/src/wsNativeApi.ts:472-483`). No new OpenCode RPC is needed.
- Web projection copies closed Product shell/detail snapshots and runtime-catalog facts rather than
  consuming raw Engine wire payloads (`apps/web/src/store/productStore.ts:20-47`, `410-425`).

### 2. The present edge is singular and Pi/Native-Host-specific

| Current assumption | Repository evidence | Consequence for a second Engine |
| --- | --- | --- |
| one catalog equals one Engine | `ProductRuntimeCatalog` has one `engineId`, version, model list and capabilities; ingress is the literal `typed-native-host` (`packages/contracts/src/product/state.ts:478-522`) | Pi and OpenCode availability/capability cannot coexist truthfully; making OpenCode replace the catalog would make Pi disappear instead of remain default |
| unavailable intent is Model-only | `ProductUnavailableRuntime` retains `requestedRuntimeModelId` but has no requested Engine (`packages/contracts/src/product/state.ts:162-183`) | an unavailable OpenCode choice cannot be preserved exactly, so the current type cannot prove no fallback |
| Product validates against one Native Host | selection must match the singular in-memory catalog and errors explicitly name Native Host (`apps/service/src/product/ProductControlPlane.ts:1062-1127`) | the Product cannot admit an OpenCode selection without either replacing Pi or weakening validation |
| Product ingress is a Native Host protocol projection | `ProductExecutionBoundary.subscribeFacts` accepts `NativeHostRuntimeFact` / `NativeHostRuntimeSnapshot` (`apps/service/src/product/ProductControlPlane.ts:413-462`); Product tables and public activity use `native_sequence` (`apps/service/src/product/ProductControlPlane.ts:249-273`, `3744-3947`) | re-labelling ACP notifications as Native Host facts would lie about source and weld Pi vocabulary into the external path |
| latest lineage is universal | preflight and dispatch select the latest `lineage_ref` for the Conversation without an `engine_id` predicate (`apps/service/src/product/ProductControlPlane.ts:3247-3259`, `3440-3447`) | the first OpenCode Run can receive a Pi Session ref; a later Pi Run can receive an OpenCode Session ref. This falsifies safe opaque lineage unless fixed |
| one boundary handles every accepted operation | control forwards only `operationRef`, control and messages say “native”, and startup resumes every receipt through one `resumeFacts` callback (`apps/service/src/product/ProductControlPlane.ts:2934-2983`, `4141-4161`) | routing by parsing opaque ref prefixes would violate opacity; restart and abort need the frozen Engine identity |
| late acceptance is Pi | delivery reconciliation creates `pi-binding:${run.id}` inside Product code (`apps/service/src/product/ProductControlPlane.ts:4062-4097`) | Product would forge Pi identity for an OpenCode acceptance |
| Package hooks apply to the only boundary | the Native Host boundary owns Package generation binding, quarantine and catalog composition (`apps/service/src/native-host/executionBoundary.ts:114-183`, `307-503`) | external observations must not acquire Pi Package loading/private-state authority or drive Pi quarantine |
| runtime selection means Pi Model selection | the picker exposes Model + Thinking only, its accessible name is `Pi Models`, and selection always copies `catalog.engineId` (`apps/web/src/components/product/ProductRuntimePicker.tsx:44-102`, `110-196`) | there is no explicit Engine next-Run choice and no honest way to omit unsupported OpenCode Model/Thinking controls |
| renderer supplies enforcement | selection accepts `enforcement` from Web; the send path hard-codes it to `unverified` rather than deriving it from the selected catalog (`packages/contracts/src/product/state.ts:146-159`, `apps/web/src/components/ChatView.tsx:5724-5787`) | capability/permission differences cannot be authoritative if a renderer field becomes the receipt truth |
| Native Host health gates all dispatch | `canDispatchProductSubmission` requires Service, Native Host and one global Engine-selection status (`apps/web/src/store/systemHealthStore.ts:9-14`) | a healthy Service-owned OpenCode process remains unusable whenever Pi Native Host is down, contradicting independent Engine failure domains |
| production composition installs only Native Host execution | the runtime layer directly installs `NativeHostProductControlPlaneLive` (`apps/service/src/serverLayers.ts:17-23`, `87-100`) | the composition point, not Desktop or Web transport, is where the one OpenCode boundary belongs |

### 3. Current tests corroborate, but do not yet prove, the external slice

On the inspected revision the existing narrow baseline passed:

- `bun run --cwd packages/contracts test -- src/product/state.test.ts --reporter=dot` — 1 file / 4
  tests;
- `bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts --reporter=dot` — 1
  file / 35 tests;
- `bun run --cwd apps/web test:browser:stable -- src/components/ProductChatJourney.browser.tsx` —
  1 file / 8 browser tests.

The tests prove current contract closure, unavailable Model preservation, one-attempt unknown-delivery
behavior, startup no-replay, Queue ownership, exact Pi Model/Thinking selection and typed abort
presentation (`packages/contracts/src/product/state.test.ts:106-178`,
`apps/service/src/product/ProductControlPlane.test.ts:611-657`, `1272-1409`, `1705-1796`,
`2171-2221`, `apps/web/src/components/ProductChatJourney.browser.tsx:311-561`). They do **not** prove
an Engine choice, Engine-scoped lineage, Engine-addressed control/recovery, OpenCode capability truth
or absence of Pi fallback.

The accepted predecessor checkpoints already cover the unchanged Pi vertical slice and Package path:
the current execution brief binds the prior candidate and Package proof at
`execution-brief.md:13-21`; the different-actor Package review records the relevant Product/Native
Host focused suites at
`.omp-flow/tasks/archive/2026-08/08-06-pi-package-lifecycle/reviews/run-trusted-headless-pi-package.md:118-131`.
Those results must be used as predecessor evidence, not rerun as an unchanged MiMo/DeepSeek or
packaged-release gate for this research.

## Strongest counter-evidence and its impact

The strongest repository counter-hypothesis is that the current “generic-looking” names already make
the boundary multi-Engine-ready because selection, receipt and binding carry string `engineId`s. That
hypothesis is falsified by behavior, not naming: one catalog controls validation, lineage ignores the
Engine column, one boundary handles all control/recovery, Product imports Native Host fact types, late
acceptance hard-codes Pi, and Web cannot choose an Engine. String IDs alone are not a routed authority
boundary.

A second counter-hypothesis is that the Product Control Plane must be duplicated per Engine to avoid
those assumptions. The durable schema and outbox disprove that need: Run and receipt already freeze an
Engine identity, Product Store already persists per-Run bindings, and all public RPCs are Engine-neutral.
Duplicating Product state would create the competing Conversation/Queue/receipt authority prohibited by
`architecture/product-state.md:5-7`, `56-65`, `79-89`.

A third counter-hypothesis is that an all-purpose Engine SDK/registry is needed first. The repository's
accepted architecture says the first consumer is concrete and the second real consumer extracts only
the smallest common contract (`architecture/README.md:28-34`), while the current stage explicitly
forbids a generic multi-Engine framework (`execution-brief.md:108-112`). Exactly two concrete boundaries
justify a small Product gateway and a composed catalog; they do not justify plugin discovery,
installation, arbitrary protocol registration, provider parity or a permanent `Manager`/`Adapter`
hierarchy.

## Recommended bounded design seam

### A. Keep the Product transaction and public RPC; make only its execution edge Engine-addressed

1. Preserve `ProductSubmitQueueItemInput`, Queue admission identity, outbox state machine,
   `ProductExecutionObservation`, `ProductDispatchReceipt`, `ProductEngineBinding`, fact batching and
   existing Product RPC method names.
2. Replace the one-Engine catalog shape with one Product-composed runtime catalog containing:
   - explicit `defaultEngineId` fixed to the live Pi catalog when Pi is available;
   - a bounded list of concrete Engine catalog entries for Pi and OpenCode, each with exact Engine
     identity, runtime version, protocol/ingress, availability reason, model-selection authority,
     capability and enforcement truth;
   - Product Package generation kept at Product scope, not advertised as OpenCode Package support.
   This is a representation of the two real choices, not a discoverable Engine framework.
3. Add the requested Engine identity to the unavailable selection variant. An unavailable OpenCode
   choice must retain `requestedEngineId = opencode` even if its model/auth/catalog is absent. Do not
   encode unavailable OpenCode as an unavailable Pi Model.
4. Keep Pi's Product-selected Model/Thinking path exact. If the ACP evidence confirms that OpenCode
   owns Model/mode selection and does not expose a Product-selectable value, use a discriminated
   Engine-owned model selection rather than a fake model ID. The exact discriminator belongs to
   Design after the ACP result; a sentinel such as `default`, `none` or a Pi model is not acceptable.
5. Remove `enforcement` as renderer authority. Web sends the user permission policy; Product Service
   resolves and freezes enforcement from the selected Engine catalog/actual call path. A stale or
   malicious renderer must be unable to promote `unverified` to `host-enforced`.
6. Decouple Product projection from `NativeHostRuntimeFact` / `NativeHostRuntimeSnapshot`. Define the
   smallest Product execution fact/snapshot shape actually consumed by `ProductControlPlane`, map Pi
   Native Host frames to it inside the existing native boundary, and map only proved ACP updates to it
   inside the OpenCode boundary. Rename Product-facing `nativeSequence`/`native_sequence` to stable
   Engine execution sequence terminology; do not keep aliases in this unreleased schema.
7. Address `preflight`, `attempt`, `control`, `resumeFacts` and late reconciliation by frozen Engine
   identity. Product must never route by parsing an opaque `operationRef`, `lineageRef` or
   reconciliation hint. Product-generated binding IDs must be source-neutral; the binding's
   `engineId` carries the actual source.

These contract changes alter a closed Product protocol (`PRODUCT_PROTOCOL_VERSION = 1` at
`packages/contracts/src/product/state.ts:9-12`). Design must either complete one atomic version bump
through Contracts/Service/Web or demonstrate that a changed field is not on the closed wire. It must
not accept two shapes indefinitely.

### B. Compose exactly two concrete Service boundaries

1. Leave `apps/native-host` and Pi's native protocol, Session, catalog, Package and stream ownership
   unchanged. Refactor only the Service-side return type needed for Product composition.
2. Add one source-named module under `apps/service/src/opencode/` for executable discovery/version
   evidence, bounded JSON-RPC/stdio framing, process lifetime and the ACP-to-Product mapping. Source-
   specific naming is accurate here; do not name it `GeneralEngine`, `ProviderAdapter`, `Manager` or
   add a protocol registry.
3. Add one stable Product execution gateway composition point under `apps/service/src/product/` that
   knows exactly the native Pi boundary and this OpenCode boundary. It selects by the frozen
   `engineId`; missing/unavailable OpenCode returns a typed pre-send failure/rejection and never calls
   Pi. `apps/service/src/serverLayers.ts` installs this composed Product layer.
4. OpenCode process supervision remains in Product Service, matching
   `architecture/execution.md:9-23`, `79-90`, `109-116`. No Desktop process proxy or Native Host
   command forwarding is needed. Desktop continues to supervise Product Service and Native Host as
   separate children.
5. OpenCode preflight may inspect already-cached discovery/version/capability facts but must not spawn
   a prompt while the Product database transaction is open. `attempt` calls `markSent` immediately
   before the first non-idempotent prompt bytes can cross stdio. Exact acceptance mapping is gated by
   the ACP research; successful `stdin.write`, PID existence, process spawn or session creation alone
   must not become an accepted receipt.
6. A Chat cwd, if ACP requires one, must use a Product/Service-owned private scratch path rather than
   a user folder. The repository has an existing contained scratch helper
   (`apps/service/src/scratchWorkspaces.ts:17-31`), but it is currently Thread-typed and creates no
   explicit `0700` mode. Reuse/strengthen it only if the ACP contract requires cwd; do not create a
   second OpenCode-only scratch authority.

### C. Make lineage and recovery explicitly Engine-scoped

For a new Run, inspect the most recent accepted binding in the visible Conversation:

- if that binding belongs to the selected Engine and no other Engine has since diverged the visible
  Conversation, pass only that Engine's opaque lineage for native continuation;
- if the most recent binding belongs to another Engine, pass no stale lineage. Create a new lineage;
  any bounded visible-context rebuild is a separate explicit mapping and must not pretend to resume
  the old Session;
- never pass Pi lineage to OpenCode or OpenCode lineage to Pi.

On restart, route a `delivery_unknown` reconciliation using the Run's requested Engine and route an
accepted/running operation using the receipt binding's Engine. If the Service-owned OpenCode stdio
process is gone and ACP exposes no reconnectable authority, converge an accepted Run to
`outcome_unknown`; do not spawn a replacement prompt. Keep current Product behavior that blocks a
second admission while a delivery/outcome is unresolved
(`apps/service/src/product/ProductControlPlane.ts:3137-3174`).

### D. Add one explicit Web Engine choice without flattening Pi

1. Extend `ProductRuntimePicker` with a separate Engine selector. Default to the catalog's Pi
   `defaultEngineId`; show Pi Model and Thinking exactly as now when Pi is selected.
2. When OpenCode is selected, show only ACP-proved Model/mode controls. Unsupported controls remain
   absent or disabled with a reason, and capability/permission/enforcement differences come from the
   selected Engine entry. Do not copy Pi's Package, Thinking, queue/steer or structured-question
   controls to manufacture parity.
3. Keep the Engine choice in next-Run state and freeze it into the Product Queue item. Changing it
   creates no Conversation, Toast, Timeline entry or current-Run mutation. A later unavailable catalog
   preserves draft, attachments, Queue item and requested Engine.
4. Replace the global Native-Host submission gate with selection-aware readiness: Service readiness
   is common; Pi additionally requires Native Host/Native Engine availability; OpenCode requires its
   own Service catalog status. Product Service remains the final admission authority. This change can
   stay in Web/System Health consumption; it does not require Desktop to supervise OpenCode.

## Bounded changed-path recommendation

Required existing paths:

- `packages/contracts/src/product/state.ts` and `state.test.ts` — composed catalog, unavailable
  Engine identity, authoritative policy/enforcement split, stable Product execution names;
- `apps/service/src/product/ProductControlPlane.ts` and `ProductControlPlane.test.ts` — Engine-scoped
  validation, lineage, control, recovery, late binding and unchanged outbox invariants;
- `apps/service/src/native-host/executionBoundary.ts` and its focused test — map existing Pi protocol
  into the stable Product execution edge without changing Pi authority;
- `apps/service/src/serverLayers.ts` — install the composed Product gateway;
- `apps/web/src/components/product/ProductRuntimePicker.tsx`,
  `apps/web/src/components/ChatView.tsx`, `apps/web/src/productReadModel.ts`,
  `apps/web/src/store/productStore.ts`, `apps/web/src/store/systemHealthStore.ts` and their focused
  tests — explicit next-Run Engine, frozen Queue presentation, partial catalog projection and
  selection-aware health/no-fallback behavior;
- the existing Workbench copy owner under `apps/web/src/i18n/` only for new truthful status/reason
  strings.

New paths should be limited to the concrete OpenCode client/boundary/process tests under
`apps/service/src/opencode/` and, if separation materially improves ownership, one Product gateway
composition module under `apps/service/src/product/`. `packages/contracts/src/product/rpc.ts`,
`apps/service/src/wsRpc.ts`, `apps/web/src/wsNativeApi.ts`, Desktop process supervision,
`apps/native-host`, Package lifecycle, Remote, marketplace/catalog discovery and release code are
outside the expected changed path. Touching those paths needs a concrete falsifier, not architectural
symmetry.

## Narrowest falsifying proof inventory

### Contract and Product transaction

1. `bun run --cwd packages/contracts test -- src/product/state.test.ts --reporter=dot`
   - two concrete Engine catalog entries decode under one closed snapshot;
   - Pi remains the explicit default;
   - unavailable OpenCode retains its requested Engine;
   - renderer-supplied enforcement is rejected/ignored by contract;
   - raw ACP/provider payloads and unknown protocol fields still fail closed.
2. `bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts --reporter=dot`
   - explicit OpenCode selection invokes OpenCode once and Pi zero times;
   - unavailable/incompatible/auth-missing OpenCode leaves the exact Queue intent and performs zero
     Engine attempts;
   - Pi -> OpenCode and OpenCode -> Pi never cross lineage refs; same-Engine continuation uses only
     its own immediately compatible binding;
   - pre-send failure may retry only pre-send; disconnect after `markSent` is
     `delivery_unknown`, attempt count 1, automatic replay 0 across duplicate submit and restart;
   - accepted external disconnect is `outcome_unknown`, not a Pi retry;
   - abort/control and startup resume route by Engine identity, not ref prefix;
   - Product derives enforcement and Package hooks remain Pi-owned.

### Deterministic Service/ACP process boundary

3. Add focused OpenCode framing/process tests with a test child process, then run them together with
   `apps/service/src/native-host/executionBoundary.test.ts`. Cover bounded frame size, malformed JSON,
   stdout/stderr separation, first-send boundary, stream-to-typed-fact mapping, final settlement,
   permission request mapping, cancel/abort, process exit before send, ambiguous exit after send,
   accepted-process loss and cleanup. Assert no raw ACP object reaches Product facts or persisted
   visible entries.
4. Add one Service composition/process test proving both concrete boundaries coexist, Pi remains
   default, OpenCode is independently unavailable, and killing/closing the OpenCode child neither
   calls nor terminates Native Host.

### Web behavior

5. `bun run --cwd apps/web test:browser:stable -- src/components/ProductChatJourney.browser.tsx`
   - Pi is the default Engine and retains current Model/Thinking behavior;
   - selecting OpenCode affects only the next Queue item and produces no Toast/Timeline noise;
   - unsupported OpenCode controls and enforcement difference are truthful;
   - making the selected OpenCode entry unavailable preserves the draft and explicit selection and
     does not submit Pi;
   - a Native Host failure blocks Pi but does not globally block a catalog-confirmed OpenCode
     selection; Service failure blocks both;
   - Queue rows expose the frozen Engine sufficiently to distinguish intent without turning the row
     into a diagnostics panel.
6. Run focused Web unit tests for Product Store catalog projection, read-model identity and the
   selection-aware submission health gate. A full 55-file browser profile, geometry profile or new
   founder visual gate is unnecessary unless the Engine control causes material Composer geometry
   drift under `architecture/workbench.md:360-381`.

### Real checkpoint evidence

7. Run the exact bounded real-process journey required by `task.md:35-49` through the production
   Service Product gateway, not only the raw ACP client: existing Conversation -> explicit OpenCode
   next-Run -> exact installed process -> typed visible stream/final -> opaque OpenCode binding ->
   settlement, with sanitized version/digest/protocol evidence, attempt count 1 and replay count 0.
8. Use deterministic process fixtures for destructive disconnect/cancel matrices. Do not mutate the
   user's OpenCode installation/configuration or repeat the predecessor MiMo/DeepSeek/package/ZIP
   matrices. If implementation changes the native request/client path rather than only mapping and
   composition, that is a new Pi falsifier and triggers the smallest affected native process/live
   check; otherwise the accepted predecessor evidence plus the focused two-boundary routing tests is
   the proportional Pi-authority proof.
9. Finish the candidate with focused Contracts/Service/Web typechecks and `git diff --check`. Root
   full-build, packaging, Remote, marketplace and three-platform gates are outside F-13 unless a
   changed path creates a specific trigger.

## Unresolved questions handed to Design

- Which exact ACP notification/response is the earliest externally provable accepted boundary, and
  can an accepted session be reattached after Product Service restart? This is owned by
  [`opencode-acp-boundary.md`](opencode-acp-boundary.md).
- Does OpenCode expose a stable current Model/mode identity that can populate resolved selection, or
  must Product represent Engine-owned selection with no Product-selectable Model? Do not decide by
  display-name inference.
- Does ACP require an absolute cwd for Chat? If yes, use the bounded private scratch route; if no,
  avoid touching scratch ownership.
- What permission requests are emitted and what actually enforces denial? Until a deny-side-effect
  path proves otherwise, OpenCode enforcement remains `unverified`; process isolation alone is not a
  sandbox.
- Does the one checkpoint need a bounded visible-context rebuild on the first Pi -> OpenCode switch,
  or only a shared visible Timeline with a fresh external Session? Repository owners forbid stale
  cross-Engine continuation but do not specify an unbounded transcript transfer. Design must keep any
  context mapping explicit and bounded rather than silently copying Engine-private transcript.

## Decision impact

The evidence **confirms** the locked anchor that one Product Conversation and one
admission/receipt/recovery truth can cross into an independently owned OpenCode Session. It
**falsifies** the narrower implementation idea that existing string `engineId` fields make the
current boundary ready for a second Engine. The next Architect can proceed without reframing by
designing one composed, Engine-addressed Service gateway; preserving the current outbox/RPC/store;
fixing Engine-scoped lineage/control/recovery; and adding one explicit Web Engine choice. Any proposal
that duplicates Product state, parses opaque refs, routes external work through Native Host, lets Web
assert enforcement, or dispatches Pi after an OpenCode failure contradicts this evidence.
