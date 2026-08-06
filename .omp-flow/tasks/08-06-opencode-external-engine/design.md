---
type: "Design"
title: "One real OpenCode external Engine"
---

# One real OpenCode external Engine

## Design decision

Implement one literal two-Engine composition in Product Service: the existing Pi Native Host
boundary and one concrete OpenCode `1.14.40` ACP boundary. Product keeps one Conversation, Queue,
Run, outbox, receipt and projection authority. The composition is not an Engine registry, protocol
plugin system or second runtime.

The Design implements the [PRD](prd.md) under the maintainer's r1.3 owner amendment and retains
provenance from the [Research synthesis](research/synthesis.md), the
[exact ACP boundary](research/opencode-acp-boundary.md) and the
[current Product seam](research/product-gateway-seam.md). The durable owner rules remain
[`Product State`](../../../architecture/product-state.md),
[`Execution`](../../../architecture/execution.md) and
[`Workbench`](../../../architecture/workbench.md); this task-local Design does not replace them.

The decisive protocol rule is:

```text
Pi:       pre-send -> accepted(operationRef) -> running -> settled | outcome_unknown
OpenCode: pre-send -> sent(local write only) -> running(observed delivery, no operationRef)
                                              -> settled | outcome_unknown
                                     \-> delivery_unknown before observed delivery
```

`sent` is not accepted. For OpenCode, only the first fact causally unique to the single in-flight
prompt proves observed delivery and Engine execution authority. The design never manufactures an
operation reference, cancellation acknowledgement or Pi fallback.

## Scope and invariant map

| PRD outcome | Binding design invariant |
| --- | --- |
| R1 exact external artifact | Product Service resolves the selected executable, checks version `1.14.40`, exact installed digest and ACP v1 identity before advertising it as ready; it never installs, updates, authenticates or changes configuration |
| R2 next-Run choice | Web owns a draft/Queue Engine choice; Product freezes it on admission; Pi remains the catalog default and active Runs never hot-switch |
| R3 truthful differences | The composed catalog holds two concrete Engine entries with per-Engine availability, selection authority, capabilities and enforcement; it does not flatten OpenCode into Pi Model/Thinking/Package semantics |
| R4 exact routing | `engineId` frozen in the Run/outbox selects prepare, attempt, control and recovery; opaque lineage and operation references are never parsed for routing |
| R5 no-ACK truth | OpenCode local write, observed delivery and settlement are distinct; the two disconnect windows produce distinct non-replayable unknown states |
| R6 projection and lineage | ACP is mapped at the Service edge into closed Product execution facts; Product stores only opaque Session lineage and visible/diagnostic facts, never transcript/config/credentials/raw payloads |
| R7 cancellation | ACP cancel produces durable `abort_requested`; only a future explicit Engine acknowledgement could confirm cancellation; late facts/final/error still settle the Run |
| R8 proof | Contract, migration, Product, process, Web and one sanitized real Service-gateway journey each falsify a different claim |

The current checkpoint supports a text-only OpenCode Run from Chat using a private Service-owned
scratch directory. OpenCode remains visible but non-dispatchable for folder-backed Agent and
resource-bearing prompts in this slice; those paths are held for F-14 rather than implicitly
selecting user folders as cwd or prompt resources. The scratch path is not a sandbox: the process's
ordinary OS access remains `unverified`. ACP-advertised image and embedded-context support is
reported as protocol capability, not Product-bridge availability.

The scratch base is owned by Product Service inside its existing private application-data root,
never inside a user Workspace. Service creates the base and per-Conversation leaf with mode `0700`,
uses `lstat`/realpath-prefix checks to reject symlinks or path escape, and accepts a pre-existing
leaf only when it is a directory owned by the current uid with no group/other permission bits. A
prepared handle owns one leaf while its child is live. Settlement, pre-send rejection, boundary
close and unknown classification terminate the child and remove the exact validated leaf; startup
removes only validated orphan leaves in this dedicated base. Cleanup never follows symlinks and a
mode/owner/path mismatch makes OpenCode unavailable instead of broadening permissions. These rules
are privacy hygiene and lifecycle cleanup, not OS containment.

## Components and code ownership

### Closed Product contracts

`packages/contracts/src/product/state.ts` continues to own Product wire types. Its protocol version
increments once from `1` to `2`; Service and Web change atomically and no v1 alias or dual decoder is
kept.

The contract changes are bounded to:

1. a composed catalog containing the Pi and OpenCode entries concurrently;
2. an Engine-explicit requested selection that cannot accept renderer-supplied enforcement;
3. exact resolved Model/mode facts;
4. a receipt representation that distinguishes acknowledged transfer from observed delivery; and
5. source-neutral execution fact/sequence names at the Product edge.

RPC method names and the existing Product submit/read/control transport remain unchanged.
`packages/contracts/src/product/rpc.ts`, WebSocket RPC and Desktop IPC do not gain an OpenCode
method.

### Product execution gateway

Add a single composition point under `apps/service/src/product/`, named for its stable Product
responsibility, that receives exactly two concrete boundaries:

```ts
makeProductExecutionGateway({ native, external })
```

Its implementation contains an explicit switch over the two catalog entries delivered by those
arguments. It has no registration API, discovery callback, priority list, protocol factory or
third-party loading surface. It performs four responsibilities only:

- compose availability/capability snapshots without allowing one Engine failure to erase the other;
- route `prepare`, `attempt`, `control` and `recover` by the frozen Product `engineId`;
- reject an unknown or unavailable Engine before prompt send without invoking the other boundary;
- map both concrete boundaries into the one closed Product execution interface.

`apps/service/src/serverLayers.ts` installs this literal composition. Desktop continues to
supervise Product Service and Native Host as separate children; it does not proxy ACP frames.

### Pi Native Host boundary

`apps/service/src/native-host/executionBoundary.ts` keeps the existing Native Host client,
accepted-operation reference, Package generation validation/lease, fact reconciliation and native
controls. It changes only at the Product-facing seam:

- map `NativeHostRuntimeFact`/`NativeHostRuntimeSnapshot` to the stable Product execution
  fact/snapshot before Product Control Plane sees them;
- publish `engineSequence`, not `nativeSequence`, at the Product edge;
- accept only Pi-scoped prior lineage selected by Product;
- route controls and recovery through the gateway with the same native `operationRef`;
- run Package lifecycle hooks only when the frozen Engine is Pi.

Pi still follows `pending -> accepted(operationRef)`. It never passes through the OpenCode `sent`
or observed-delivery path.

### Concrete OpenCode boundary

Add only source-specific modules under `apps/service/src/opencode/`:

- installation evidence: resolve the configured/installed executable, real path, version, digest
  and process identity without changing it;
- ACP stdio connection: bounded newline-delimited JSON-RPC framing, request correlation, stderr
  separation, hard timeouts and process cleanup;
- execution boundary: initialize, `session/new`/`session/resume`, prompt, allowlisted updates,
  permission rejection, cancel request and connection-loss classification.

Source-specific names are correct within this integration directory. They do not enter durable
Product object names. The Product catalog contains the truthful dynamic display identity
`OpenCode`; there is no `OpenCodeRun`, `OpenCodeConversation`, `OpenCodeReceipt` or public
OpenCode-specific RPC.

The boundary launches the exact user-installed process as a Product Service child. It neither
copies the binary nor calls install/update/auth/config commands. stdout is reserved for ACP JSON;
stderr is bounded diagnostic input and is never parsed as protocol or persisted raw.

### Web next-Run presentation

`ProductRuntimePicker` gains a separate Engine control ahead of the existing Pi Model and Thinking
controls.

- Pi is initially selected from `defaultEngineId` and its current Model/Thinking UI remains
  unchanged.
- OpenCode selection hides Pi Model/Thinking and shows a concise “current Engine model/mode is
  resolved when sending” state plus capability/permission reasons from the selected catalog entry.
- OpenCode locks the Product permission policy to `approval-required` and explains that this slice
  rejects every ACP permission request because it has no approval UI. `auto` and `full-access` are
  unavailable for this Engine; OpenCode's own allow/deny rules remain external and enforcement stays
  `unverified`.
- This slice does not expose an OpenCode Model or mode picker. ACP reports those options per
  Session; turning one Session's 261 observed values into a global Product list would be false.
  The exact current values are frozen during dispatch preparation and appear in Run/runtime detail.
- Unsupported/degraded controls are absent only when omission is unambiguous; otherwise they are
  disabled with localized reason text.
- The choice is part of Composer/Queue next-Run state. Switching it emits no confirmation, Toast,
  Timeline item or Conversation mutation.

Submission readiness becomes selection-aware. Service availability is common. Pi additionally
requires its Native Host entry; OpenCode requires its own ready entry and supported Chat/text
target. A Pi failure cannot globally disable ready OpenCode, and a ready Pi can never mask
unavailable OpenCode.

## Stable contract shapes

The names below describe the required closed shapes; implementation may retain existing exported
names where their stable responsibility remains accurate.

### Composed catalog

```ts
type ProductRuntimeCatalog = {
  defaultEngineId: string; // composition asserts the Pi entry
  packageGeneration: string | null;
  engines: readonly ProductEngineCatalogEntry[]; // exactly the two composed entries in this slice
};

type ProductEngineUnavailableReason =
  | "missing"
  | "version-mismatch"
  | "artifact-mismatch"
  | "protocol-mismatch"
  | "initialize-failed"
  | "auth-required"
  | "process-unavailable";

type ProductEngineAvailability =
  | { state: "available" }
  | {
      state: "unavailable";
      reason: ProductEngineUnavailableReason;
    };

type ProductModelSelectionAuthority =
  | {
      kind: "product-model";
      models: readonly ProductRuntimeModel[];
      thinking: "product-selectable";
    }
  | {
      kind: "engine-session";
      model: "resolved-on-prepare";
      mode: "resolved-on-prepare";
      thinking: "unsupported";
    };

type ProductCapabilityTruth = {
  state: "available" | "unavailable" | "unsupported" | "degraded" | "unknown";
  reason: string; // bounded reason code, localized by Web
};

type ProductEngineCatalogEntry = {
  engineId: string;
  displayName: string;
  distribution: "bundled-native" | "user-installed";
  runtimeVersion: string | null;
  protocol: { name: "native" | "acp"; version: string };
  availability: ProductEngineAvailability;
  modelSelection: ProductModelSelectionAuthority;
  capabilities: {
    continuation: ProductCapabilityTruth;
    rebuild: ProductCapabilityTruth;
    thinkingStream: ProductCapabilityTruth;
    thinkingLevel: ProductCapabilityTruth;
    structuredQuestion: ProductCapabilityTruth;
    queue: ProductCapabilityTruth;
    steer: ProductCapabilityTruth;
    followUp: ProductCapabilityTruth;
    cancel: ProductCapabilityTruth;
    permissionPolicy: ProductCapabilityTruth;
    packages: ProductCapabilityTruth;
    filesRead: ProductCapabilityTruth;
    filesWrite: ProductCapabilityTruth;
    terminal: ProductCapabilityTruth;
    namespacedUi: ProductCapabilityTruth;
  };
  enforcement: "host-enforced" | "engine-enforced" | "mixed" | "unverified";
};
```

The Service composition enforces unique `engineId`s, exactly one default, and a maximum of two
entries for this protocol revision. This is a bounded representation of two real choices, not a
promise that arbitrary Engine packages can register.

Pi retains its runtime-provided Model list and Thinking levels. The OpenCode entry is available
after executable/version/digest/initialize checks, but “available” does not claim that every
provider or model is authenticated. `auth-required` is learned during preparation and refreshes
only the OpenCode entry.

OpenCode capability truth for this artifact is:

| Capability | State and reason |
| --- | --- |
| Session continuation | `available`; `session/resume` with an opaque Session ID |
| Cross-Engine rebuild | `degraded`; a new external lineage starts with the current Entry only in this slice, and prior private context is not transferred |
| Thinking stream | `available` when emitted; hidden/private reasoning is not durably copied |
| Thinking level | `unsupported`; no independent ACP config option |
| Structured Question | `unsupported`; no typed handler/capability in the fixed mapper |
| Queue, steer, follow-up | `unsupported`; Product owns only pre-dispatch Queue and permits one in-flight prompt per Session |
| Cancel/abort | `degraded`; request can be written but is not acknowledged |
| Product permission policy | `degraded`; only `approval-required` is selectable and all ACP asks are rejected because this slice has no approval UI; `auto`/`full-access` are unavailable |
| Packages and namespaced UI | `unsupported`; OpenCode plugins/MCP/private state remain external |
| Product Terminal | `unsupported`; OpenCode tool execution is not a Product PTY contract |
| Files read/write | `degraded`; the Engine has ordinary OS/tool access, while this bridge supplies only private Chat cwd and no user `ResourceRef`; containment is unproved |
| Enforcement | `unverified`; Engine rules and process isolation are not host containment |

### Requested and resolved selection

Renderer-owned next-Run intent removes `enforcement` entirely:

```ts
type ProductRuntimeChoice =
  | { kind: "product-model"; runtimeModelId: string; thinking: string | null }
  | { kind: "engine-session-current" };

type ProductSelectedRuntime = {
  state: "selected";
  engineId: string;
  runtimeChoice: ProductRuntimeChoice;
  permissionPolicy: "approval-required" | "auto" | "full-access";
  executionTarget: ProductExecutionTarget | null;
  packageGeneration: string | null;
};

type ProductUnavailableRuntime = {
  state: "unavailable";
  requestedEngineId: string;
  requestedRuntimeChoice: ProductRuntimeChoice | null;
  reason:
    | ProductEngineUnavailableReason
    | "target-unsupported"
    | "model-not-selected"
    | "model-unavailable"
    | "thinking-unsupported";
  permissionPolicy: "approval-required" | "auto" | "full-access";
  executionTarget: ProductExecutionTarget | null;
  packageGeneration: string | null;
};

type ProductResolvedSelection = {
  engineId: string;
  runtimeModelId: string;
  thinking: string | null;
  engineModeId: string | null;
  permissionPolicy: "approval-required" | "auto" | "full-access";
  enforcement: "host-enforced" | "engine-enforced" | "mixed" | "unverified";
  executionTarget: ProductExecutionTarget | null;
  packageGeneration: string | null;
};
```

`engine-session-current` is a discriminated choice, not the string sentinel `default`, `none` or a
fake Pi model ID. OpenCode preparation resolves the exact current model and mode from the same
Session that will receive the prompt. Product persists that `ProductResolvedSelection` before the
stdio prompt write. Web can never promote enforcement because only Service constructs the resolved
shape. For the OpenCode entry Service accepts only `permissionPolicy = approval-required`;
renderer attempts to submit `auto` or `full-access` fail closed before preparation.

The top-level Product Package generation remains explicitly frozen for every Run. It is the exact
generation for Pi and `null` when no native Package lease applies. The gateway creates an active
Package lease and invokes Package fault hooks only for Pi. OpenCode catalog capability stays
`unsupported`; the Product field must not be presented as OpenCode Package integration.

### Receipt evidence

Keep Pi's current `accepted` state and `operationRef`. Introduce only the evidence needed by the
no-ACK path:

```ts
type ProductExecutionEvidence =
  | { kind: "accepted-operation"; operationRef: string }
  | { kind: "observed-delivery"; observedAt: string };

type ProductDispatchReceipt =
  | { state: "pending"; lastConfirmedBoundary: "pre-send" }
  | {
      state: "sent";
      lastConfirmedBoundary: "local-write";
      resolvedSelection: ProductResolvedSelection;
      abort: null | { requestedAt: string; confirmed: boolean };
    }
  | { state: "rejected"; code: string; message: string; retryable: boolean }
  | {
      state: "accepted"; // Pi ACK path only in this composition
      operationRef: string;
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
      abort: null | { requestedAt: string; confirmed: boolean };
    }
  | {
      state: "running";
      evidence: ProductExecutionEvidence;
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
      abort: null | { requestedAt: string; confirmed: boolean };
    }
  | {
      state: "settled";
      evidence: ProductExecutionEvidence;
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
      outcome: "succeeded" | "failed" | "cancelled";
      settledAt: string;
      abort: null | { requestedAt: string; confirmed: boolean };
    }
  | {
      state: "delivery_unknown";
      lastConfirmedBoundary: "local-write" | "acceptance-ack";
      abort: null | { requestedAt: string; confirmed: boolean };
    }
  | {
      state: "outcome_unknown";
      evidence: ProductExecutionEvidence;
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
      abort: null | { requestedAt: string; confirmed: boolean };
    };
```

`accepted` cannot be constructed without a real Engine `operationRef`. An OpenCode receipt can
enter `running` only with `evidence.kind = observed-delivery`; it never carries a JSON-RPC request
ID, PID, dispatch ID or synthetic ref in the `operationRef` field. A correlated final/error may
transition directly from `sent` to `settled` with observed-delivery evidence when it is the first
prompt-specific fact.

The no-ACK OpenCode path can construct `delivery_unknown` only with
`lastConfirmedBoundary = local-write`. The shared `acceptance-ack` literal is retained solely for
the existing Native Host indeterminate observation, which has a real ACK boundary but may lose the
accepted operation reference needed for control/reconciliation; it is never inferred from ACP,
Session state or a scheduled notification.

Control results no longer require an operation reference. They identify the Product Run and expose
`applied | requested | unsupported | too-late | unknown`. Pi can still return `applied` against its
native operation. OpenCode cancel returns `requested`; its receipt records
`abort.confirmed = false` until an explicit acknowledgement exists. `end_turn` after cancel is
`outcome = succeeded` with the unconfirmed abort record, not `cancelled`.

### Product execution facts

Replace Product Control Plane's direct dependency on Native Host protocol types with closed
source-neutral shapes:

```ts
type ProductExecutionFact = {
  engineSequence: number; // positive, strictly increasing within one Run
  emittedAt: string;
} & (
  | { kind: "assistant.delta"; text: string }
  | { kind: "thinking.delta"; text: string }
  | { kind: "session.bound"; lineage: "continued" | "new" | "missing" | "divergent" }
  | { kind: "package.loaded" | "package.failed"; count: number }
  | { kind: "question.requested"; question: string }
  | { kind: "control.applied"; control: "steer" | "follow-up" | "abort" | "cancel"; text: string | null }
  | { kind: "plan.updated"; summary: string }
  | { kind: "tool.started"; toolCallId: string; toolName: string }
  | { kind: "tool.settled"; toolCallId: string; toolName: string; outcome: "succeeded" | "failed"; summary: string }
  | { kind: "permission.requested"; toolCallId: string; title: string }
  | { kind: "permission.rejected"; toolCallId: string; reason: "approval-ui-unavailable" }
  | { kind: "usage"; input: number; output: number; cacheRead: number; cacheWrite: number; total: number }
  | { kind: "settlement"; outcome: "succeeded" | "failed" | "cancelled"; message: string | null }
);

type ProductExecutionSnapshot = {
  version: 1;
  highWaterEngineSequence: number;
  assistant: string;
  settlement: {
    outcome: "succeeded" | "failed" | "cancelled";
    message: string;
    settledAt: string;
  };
};
```

The exact union remains bounded by Product-visible consumers. It is not a generic ACP event
envelope and has no `payload: unknown`. OpenCode assigns an in-memory monotonic sequence in read
order for the one prompt; Pi maps its native sequence unchanged. Durable/public
`nativeSequence`/`native_sequence` names become `engineSequence`/`engine_sequence` without aliases.

OpenCode mapping accepts only:

- prompt-correlated message/thought chunks with Engine message identity;
- tool and permission updates with a tool-call identity;
- plan summaries after bounded Product mapping;
- finite non-negative usage counters; and
- the matching JSON-RPC final/error response.

`available_commands_update`, other Session/global notifications, raw tool input/output, hidden
reasoning, `_meta`, provider responses, config, credentials and unrecognized fields never become a
Run fact. Malformed or oversized input closes the affected boundary and enters the appropriate
unknown state according to whether observed delivery already occurred.

### Product execution boundary

The shared interface is the smallest contract both concrete boundaries need. It is internal to
Product Service and is not a registration surface:

```ts
type ProductPreparedExecution = {
  engineId: string;
  resolvedSelection: ProductResolvedSelection;
  preparedLineageRef: string | null;
  lineage: "continued" | "new" | "missing" | "divergent";
  handle: string; // short-lived Service-local token; never persisted or sent to Web
};

type ProductPrepareExecutionInput = {
  dispatchId: ProductDispatchId;
  conversationId: ProductConversationId;
  workspace: ProductWorkspace;
  text: string;
  resources: readonly ProductResourceRef[];
  requestedSelection: ProductSelectedRuntime;
  priorBinding: ProductEngineBinding | null; // already filtered by selected Engine/divergence
};

type ProductEngineControlInput = {
  runId: ProductRunId;
  receipt: ProductDispatchReceipt;
  control: "steer" | "follow-up" | "abort" | "cancel";
  text: string | null;
};

type ProductEngineRecoveryInput = {
  run: ProductRun;
  receipt: ProductDispatchReceipt;
  outboxBoundary: "pre-send" | "sent" | "accepted" | "observed";
};

type ProductAttemptObservation =
  | { kind: "pre-send-failure"; code: string; message: string; retryable: boolean }
  | { kind: "rejected"; code: string; message: string; retryable: boolean }
  | {
      kind: "accepted";
      operationRef: string;
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
    }
  | { kind: "sent"; resolvedSelection: ProductResolvedSelection };

type ProductExecutionUpdate =
  | {
      kind: "delivery-observed";
      engineBinding: ProductEngineBinding;
      resolvedSelection: ProductResolvedSelection;
      firstFact: ProductExecutionFact;
    }
  | { kind: "facts"; facts: readonly ProductExecutionFact[] }
  | { kind: "snapshot"; snapshot: ProductExecutionSnapshot }
  | { kind: "settled"; fact: Extract<ProductExecutionFact, { kind: "settlement" }> }
  | { kind: "connection-lost" }
  | { kind: "delivery-accepted"; operationRef: string; lineageRef: string; resolvedSelection: ProductResolvedSelection }
  | { kind: "delivery-rejected"; code: string; message: string; retryable: boolean };

interface ProductExecutionBoundary {
  readonly engineId: string;
  catalog(): Effect<ProductEngineCatalogEntry>;
  prepare(input: ProductPrepareExecutionInput): Effect<ProductPreparedExecution>;
  attempt(input: {
    dispatchId: ProductDispatchId;
    run: ProductRun;
    prepared: ProductPreparedExecution;
    text: string;
    markSent(): Effect<void>;
  }): Effect<ProductAttemptObservation>;
  subscribe(listener: (runId: ProductRunId, update: ProductExecutionUpdate) => void): () => void;
  control(input: ProductEngineControlInput): Effect<ProductControlRunResult>;
  recover(input: ProductEngineRecoveryInput): void;
  close(): Promise<void>;
}
```

The concrete gateway calls `prepare` before admission, persists only its Engine ID, resolved
selection and opaque prepared lineage, and keeps `handle` in Service memory. If the handle is lost
before a prompt write, the same concrete boundary may reopen/resume the prepared Session from the
persisted lineage and is still on its first prompt attempt. It may never do so after `markSent`.

`delivery-observed` carries the first correlated fact so Product can persist binding, evidence and
fact in one transaction. A later fact cannot arrive through the generic `facts` member while the
receipt is merely `sent`; that is a boundary protocol violation and closes the affected Engine.
Pi returns `accepted` exactly as today. OpenCode returns `sent` after local write and uses updates
for observed delivery and settlement.

## Preparation, admission and dispatch

### Preparation outside the database transaction

Product must preserve the editable Queue item when OpenCode is missing, incompatible or
auth-required. Therefore selected-boundary preparation happens before the atomic Queue-to-Run
transaction and is revalidated inside that transaction.

For Pi, preparation is the current catalog/Package/model validation and does not alter native
acceptance semantics. For OpenCode it performs, with hard timeouts:

1. resolve and compare executable real path, `1.14.40`, exact digest and ACP v1 identity;
2. create a `0700` Service-owned Conversation scratch directory and reject non-Chat or
   resource-bearing input for this slice;
3. inspect the latest proved binding in this Conversation using an Engine predicate;
4. start `opencode acp --cwd <scratch>` and call `initialize`;
5. `session/resume` only when the latest compatible binding is OpenCode and no later different
   Engine binding has diverged the visible Conversation; otherwise call `session/new`;
6. read the actual Session current model/mode, construct `ProductResolvedSelection` with
   `enforcement = unverified`, and retain the opaque Session ID as prepared lineage; and
7. return a short-lived prepared handle keyed by `dispatchId` to the concrete boundary.

`session/new`/`resume` is lineage preparation, not prompt acceptance. It never advances the
receipt beyond `pending`. `available_commands_update` scheduled during this sequence is discarded
for delivery correlation.

If any step fails, no Run/Entry/outbox is admitted, the Queue row and revision remain unchanged,
and the OpenCode catalog entry receives the exact unavailable reason. `auth-required` presents the
external `opencode auth login` re-entry instruction; OmniMind does not call the broken ACP
`authenticate`, read credentials or execute the login command.

### Atomic admission

The existing transaction rechecks Queue identity/revision, current catalog generation, target and
prepared handle, then atomically:

- writes the exact user Entry and Run in the same Conversation;
- freezes requested Engine choice, permission policy, Product Package generation, workspace and
  resources;
- writes the pending receipt and outbox row with `engine_id`, prepared opaque lineage and exact
  `resolved_selection_json`;
- records attempt count `0`, automatic replay count `0`; and
- removes the editable Queue row.

No Engine prompt is written while this transaction is open. If the recheck loses a race, the Queue
remains and the prepared process is closed. OpenCode advertises no Session delete, so a newly
prepared empty external Session may remain in OpenCode private state; it contains no Product prompt
or credential and is not treated as a Product binding.

### Attempt and correlation

The outbox claim reserves the row while `attempt_count` remains `0`. `markSent` atomically changes
the boundary and increments it to `1`, so a pre-write crash is not counted as a prompt attempt. The
gateway selects the concrete boundary using the outbox/Run `engine_id`. For OpenCode:

1. ensure the prepared process/session still matches the persisted resolved selection;
2. call `markSent` immediately before the first byte of the one `session/prompt` JSON-RPC frame can
   enter stdin;
3. complete the bounded write and persist receipt `sent/local-write` without creating a binding;
4. keep exactly one prompt in flight for that Session and consume updates asynchronously;
5. on the first allowed prompt-correlated update, atomically create the opaque
   `ProductEngineBinding`, persist observed-delivery evidence and apply the fact; and
6. apply later facts incrementally until the correlated final/error settles the Run.

There is no automatic second call to `session/prompt` in any branch. A duplicate submit with the
same admission identity reads the existing Run; a conflicting identity fails closed.

## Lineage, control and recovery

### Engine-scoped lineage

Lineage selection queries by `conversation_id` and selected `engine_id`; it never takes an
unfiltered latest row. Continuation additionally requires that no later admitted Run/visible Entry
used a different Engine, whether or not that Run ever produced a binding. A rejected,
`delivery_unknown` or otherwise terminal different-Engine Run still diverges the visible Product
chronology because the old Session did not observe that admitted Entry.

- same Engine, compatible latest binding: pass only that Engine's opaque lineage;
- different Engine latest binding: pass no lineage and create a new selected-Engine Session;
- missing selected-Engine Session: create a new lineage and record `missing/new`, never pretend to
  resume;
- unresolved delivery/outcome in the Conversation: block admission before any new prepare/send.

This slice does not inject or replay prior visible transcript into a new external Session. The Run
detail states that the Engine Session is new after a switch and only the current Entry was sent.
That is a truthful same-Product-Conversation experience without copying Pi/OpenCode private
history. A future bounded visible-context rebuild requires a separate Product decision and proof.

### Engine-addressed control

Control accepts Product `runId`, loads the current receipt and dispatches on its frozen
`engineBinding.engineId` (or requested `engineId` for the pre-observation `sent` state). It never
parses `operationRef`, `lineageRef`, reconciliation hints or JSON-RPC IDs.

- Pi delegates unchanged using its accepted `operationRef`.
- OpenCode `steer` and `follow-up` return `unsupported`.
- OpenCode `abort`/`cancel` send one `session/cancel` notification only while the live boundary
  owns that in-flight `runId`; they record `abort_requested` and return `requested`.
- If the process is gone, OpenCode control returns `unknown`; it does not spawn a new process,
  signal a guessed PID or replay the prompt.

If OpenCode sends an ACP permission request, it is prompt-correlated and may establish observed
delivery. This slice converts only bounded title/tool identity, replies `reject_once`, and records
the typed rejection because no Product permission-approval UI is in scope. It never sends
`allow_always`. OpenCode's own allow/deny rules can act before ACP; this is why Run enforcement
remains `unverified` even under the one supported Product policy.

### Restart and connection loss

Startup recovery is deterministic from persisted Engine identity and receipt evidence:

| Persisted state | Recovery action |
| --- | --- |
| outbox `sending/pre-send` | return to pre-send pending; the prompt attempt count is still zero and a new prepared connection may be made |
| OpenCode `sent/local-write` with no correlated fact | set `delivery_unknown`, preserve input/selection/prepared lineage evidence, `attemptCount = 1`, replay/fallback `= 0` |
| OpenCode running with observed-delivery evidence and no final/error | set `outcome_unknown`, preserve visible partial facts and effect receipts, replay/fallback `= 0` |
| OpenCode settled | no action |
| Pi accepted/running | use the existing Native Host fact reconciliation with its real `operationRef` |
| any unknown state | block a second admission in the Conversation; never return the Entry to editable Queue |

OpenCode `session/load`/`session/resume` may be used for a later new Run after a settled binding. It
is never used to decide whether an ambiguous prior prompt was delivered or settled because ACP
exposes no prompt operation identity.

An EOF, EPIPE, timeout, malformed frame, signal exit or non-zero exit invokes the same table. The
classification depends solely on persisted receipt evidence, not on exit reason or PID state.

## Persistence and migration

Both the closed Product wire protocol and SQLite Product Store move to version `2` in the same
atomic implementation. Version `2` is the only accepted shape after migration.

### Store changes

- rebuild `product_outbox` so `send_boundary` accepts
  `pre-send | sent | accepted | observed`; add non-null `engine_id` and nullable
  `prepared_lineage_ref`/`resolved_selection_json` used only as dispatch evidence;
- rebuild `product_runs` so `package_generation` is nullable: existing Pi rows retain their exact
  generation, new OpenCode rows store `NULL`, and the public Run schema uses the same explicit
  null/not-applicable meaning;
- rebuild `product_runtime_activities` and `product_runtime_fact_cursors` with
  `engine_sequence` replacing `native_sequence` while preserving values and uniqueness;
- keep `product_engine_bindings.engine_id` and opaque `lineage_ref`; create a binding only after
  acknowledged or observed transfer, not on Session creation;
- encode v2 requested/resolved selection and receipt JSON; no raw ACP data or process handle is
  stored;
- keep `attempt_count` and the `automatic_replay_count = 0` database constraint; outbox
  `engine_id` is the recovery router;
- Package lease queries filter to Pi Runs so OpenCode never acquires a native Package lease.

### v1 to v2 transaction

Initialization reads `product_meta` before applying any v2 DDL. The migration owns one exhaustive
inventory of JSON-bearing columns in the concrete current schema:

| Table / column | v1 schema and authority | v2 action |
| --- | --- | --- |
| `product_workspaces.access_json` | `ProductWorkspaceAccess`; authoritative, not protocol-versioned | decode, validate and canonically re-encode unchanged |
| `product_runs.requested_selection_json` | v1 `ProductSelectedRuntime`; authoritative selected Run facts, encoded/decoded by `ProductControlPlane` | apply the normative preserve-not-normalize transform below; historical enforcement is cross-row validation input, not v2 selected intent; null Package generation remains legal only for newly admitted OpenCode rows |
| `product_runs.workspace_observation_json` | `ProductWorkspaceObservation`; authoritative, not protocol-versioned | decode, validate and canonically re-encode unchanged |
| `product_resource_refs.resource_json` | `ProductResourceRef`; authoritative, not protocol-versioned | decode, validate and canonically re-encode unchanged |
| `product_operation_receipts.receipt_json` | v1 `ProductDispatchReceipt`; authoritative | transcode every state to the v2 evidence/abort shape; existing accepted/running/settled/outcome-unknown Pi receipts retain exact operation/binding/resolved-selection facts |
| `product_runtime_activities.summary` | `ProductRuntimeActivityDetail`; authoritative visible summary, not protocol-versioned | validate/re-encode and copy while renaming the sequence column only |
| `product_queue_items.requested_selection_json` | v1 `ProductRequestedSelection`; authoritative editable intent | transcode to an explicit Pi request, including `requestedEngineId = pi` for unavailable intent |
| `product_queue_items.resources_json` | array of `ProductResourceRef`; authoritative | decode, validate and canonically re-encode unchanged |
| `product_outbox` | no v1 JSON; authoritative attempt/replay evidence | rebuild with `engine_id = pi`; preserve exact state, boundary, attempt count and zero-replay count; new prepared/resolved fields remain null for migrated rows |
| `product_submit_admissions.request_json` | v1 `ProductSubmitQueueItemInput`; exact-byte dispatch identity | decode as the concrete v1 shape, set only `protocolVersion = 2`, encode canonically with the v2 schema, and retain the same dispatch identity |
| `product_mutations.request_json` / `response_json` | exact-byte mutation identity plus original response | dispatch by the closed 24-kind table below; decode with the exact v1 input/result schemas, transcode all nested Product shapes, then canonically encode v2 bytes |
| `product_facts.shell_change_json` / `detail_change_json` | reconstructible incremental projection, not mutation authority | delete after all authoritative rows and ledgers validate; reset shell/detail cursors so Web must resnapshot |
| `automation_definitions.requested_selection_json` | v1 `ProductRequestedSelection`; authoritative Automation definition choice | canonically transcode to v2 while preserving Automation identity, schedule, enabled state, requested Engine/model/thinking/permission/target/resources and due-run behavior |
| `automation_runs.permission_snapshot_json -> $.requestedSelection` | v1 `AutomationPermissionSnapshot` containing the exact admitted selection | canonically transcode only the nested selection while preserving Run identity, permission/enforcement snapshot semantics, trigger and execution state |

The exhaustive production-storage inventory found no other SQLite column whose closed schema embeds
`ProductRequestedSelection`. `product_runs.requested_selection_json` is adjacent but decodes the
already-narrowed `ProductSelectedRuntime`, not the request union; it remains in the approved Product
Run transcode. `product_meta`, Conversation/Entry identities, bindings and annotations are scalar
relational authority and are copied under their existing constraints. The concrete mutation ledger
inventory is:

#### Normative historical selected-Run transform

For each v1 `product_runs.requested_selection_json`, decode only the production
`ProductSelectedRuntime` codec and emit exactly one canonical v2 selected object:

| v1 field | Required validation | Canonical v2 field/action |
| --- | --- | --- |
| `state` | exactly `selected` | `state: "selected"` |
| `engineId` | valid nonempty legacy string; consistent with every same-Run migrated binding, receipt and resolved-selection fact | preserve the exact string byte-for-value as historical Engine identity; never hard-code/alias `pi`, infer from `defaultEngineId`, or require current-catalog membership |
| `runtimeModelId` + `thinking` | nonempty model; preserve null/non-null thinking; consistent with same-Run resolved facts when present | `runtimeChoice: { kind: "product-model", runtimeModelId: <exact>, thinking: <exact> }`; historical Pi never becomes `engine-session-current` |
| `permissionPolicy` | valid v1 value and consistent with same-Run resolved facts when present | copy exactly |
| `executionTarget` | valid v1 target/null and consistent with same-Run resolved facts when present | copy exactly, including nested identity and null |
| `packageGeneration` | valid non-null v1 value; equal to the Run's duplicate authoritative package-generation column and same-Run Package/resolved evidence | preserve exactly in selected intent and Run field; null is forbidden for migrated Runs and legal only for newly admitted OpenCode Runs |
| `enforcement` | valid v1 value; for states with resolved truth, equal to migrated `ProductResolvedSelection.enforcement` | omit from v2 selected intent by schema rule; never default, normalize, promote or synthesize resolved truth |

Accepted, running, settled and outcome-unknown v1 receipts require independently resolved selection
and must preserve its exact Engine/model/thinking/policy/enforcement/target/Package facts in the v2
resolved location. Pending, rejected and delivery-unknown receipts legitimately carry no resolved
selection under the v1 receipt schema; for those states enforcement is explicitly omitted from v2
selected intent and no resolved selection is fabricated. Any state required to carry resolved truth
but missing it, or any contradiction among Run, receipt, binding, resolved selection, outbox and
Package facts, fails zero-write preflight. Current catalog availability never rewrites historical
bytes or makes settled history undecodable. New Pi admissions use the current composed Pi catalog
entry independently of migrated legacy IDs.

| `mutation_kind` | v1 request schema | response schema / v2 action |
| --- | --- | --- |
| `workspace-title-update` | `ProductUpdateWorkspaceTitleInput` | `ProductWorkspaceSummary`; validate/re-encode |
| `workspace-pinned-set` | `ProductSetWorkspacePinnedInput` | `ProductWorkspaceSummary`; validate/re-encode |
| `workspace-run-command-update` | `ProductUpdateWorkspaceRunCommandInput` | `ProductWorkspaceSummary`; validate/re-encode |
| `workspace-delete` | `ProductDeleteWorkspaceInput` | `ProductDeleteWorkspaceResult`; bump nested protocol version |
| `group-update` | `ProductUpdateGroupInput` | `ProductGroupSummary`; validate/re-encode |
| `groups-reorder` | `ProductReorderGroupsInput` | `ProductGroupSummary[]`; validate/re-encode |
| `group-delete` | `ProductDeleteGroupInput` | `ProductDeleteGroupResult`; bump nested protocol version |
| `conversation-groups-set` | `ProductSetConversationGroupsInput` | `ProductGroupMembershipResult`; bump nested protocol version |
| `conversation-groups-add` | `ProductAddConversationGroupsInput` | `ProductGroupMembershipResult`; bump nested protocol version |
| `conversation-title-update` | `ProductUpdateConversationTitleInput` | `ProductConversationSnapshot`; transcode protocol and all nested Run/Queue/receipt/activity shapes |
| `conversation-archive` | `ProductArchiveConversationInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `conversation-restore` | `ProductRestoreConversationInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `conversation-pinned-set` | `ProductSetConversationPinnedInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `conversation-notes-update` | `ProductUpdateConversationNotesInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `conversation-board-state-set` | `ProductSetConversationBoardStateInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-pin-add` | `ProductAddEntryPinInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-pin-remove` | `ProductRemoveEntryPinInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-pin-done-set` | `ProductSetEntryPinDoneInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-pin-label-set` | `ProductSetEntryPinLabelInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-marker-add` | `ProductAddEntryMarkerInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-marker-remove` | `ProductRemoveEntryMarkerInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-marker-done-set` | `ProductSetEntryMarkerDoneInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `entry-marker-label-set` | `ProductSetEntryMarkerLabelInput` | `ProductConversationSnapshot`; same complete snapshot transcode |
| `conversation-delete` | `ProductDeleteConversationInput` | `ProductDeleteConversationResult`; bump nested protocol version |

The implementation may keep exact v1 decoders only in a source-named schema-1 migration module.
They run only when the sole meta row is `1`; normal reads accept v2 only, and the migration code is
not a permanent dual-read compatibility path or reusable migration framework.

### Startup-only two-store coordinator

Product and Automation occupy separate files: `product-state-v1.sqlite` and `state.sqlite`. They do
not share a physical transaction. A startup coordinator runs before `ProductControlPlane`,
`AutomationRepository`, HTTP/Web admission or either normal database owner opens. It is sequenced
at the config-first outer `LayerLive` composition seam: an outer `Layer.unwrap` awaits the complete
coordinator Effect and its connection/lock cleanup before returning the normal application layers.
Adding a sibling to `Layer.mergeAll` is forbidden because sibling acquisition order is not an owner
contract. Product receives the same lifecycle-lock exclusion as `state.sqlite`; the coordinator
temporarily owns both locks/connections and releases them before normal owners acquire.

The coordinator uses no third ledger. Each existing store owns one concrete marker for the same
stable migration revision `selection-schema-v2`:

- Product extends its sole `product_meta` row with `schema_version = 2` and
  `migration_revision = selection-schema-v2`;
- Automation owns a sole `automation_meta` row with the same two values.

Both-v1 startup performs a zero-write preflight over every inventoried row in both files, binds each
transform to its production encoder/decoder, validates cross-row invariants and canonical target
bytes, and closes read statements before any write. Malformed/unsupported/inconsistent input leaves
both files byte-for-byte v1 and blocks startup with a recoverable non-secret error.

After successful preflight the coordinator migrates Product first, then Automation. Each file uses
its own deterministic `BEGIN IMMEDIATE`; that file's complete data transform and marker commit
atomically together. Every transaction preserves identities/counts/timestamps, validates canonical
bytes, foreign keys and integrity before setting its marker last. A transaction-local failure rolls
back only that still-v1 file. A crash/I/O failure after Product commits does not roll Product back:
startup stays blocked/retryable and no runtime owner opens until Automation finishes.

Recovery validates the concrete marker and canonical contents before acting:

| Product marker | Automation marker | Startup action |
| --- | --- | --- |
| v1 | v1 | repeat zero-write two-file preflight, then fixed-order migrations |
| v2 complete | v1 | validate Product v2, preflight Automation v1, migrate Automation once |
| v1 | v2 complete | validate Automation v2, preflight Product v1, migrate Product once |
| v2 complete | v2 complete | require matching revision and canonical state, then start owners |
| unknown/mismatched/invalid | any | fail closed; no downgrade, mutation or runtime owner |

Mixed versions are durable recovery states but never runtime-observable Product/Automation states.
The coordinator releases all handles and both lifecycle locks before constructing normal owner
layers. Web admission is downstream of full layer acquisition; application handlers therefore
cannot dispatch during migration. Tests do not treat readiness or sibling Layer order as the gate.

The coordinator preserves existing WAL durability. It handles and repairs private WAL/SHM state
under the lifecycle locks, verifies journal/locking results instead of assuming them, and uses real
file-backed process-crash fixtures. It never infers crash behavior from `:memory:` tests.

A v2 Store is idempotently opened and any other version is rejected. There is no alias for
`native_sequence`, no v1 runtime decoder and no dual receipt state.

Migration proof seeds one admitted dispatch, a Run selection fixture whose v1 bytes use a
fixture-only legacy Engine ID different from `pi` and are valid `ProductSelectedRuntime` but fail or
materially differ under the request-union decoder,
one row for each of the 24 mutation kinds, an enabled
and disabled Automation definition, and Automation Runs with permission snapshots. After upgrade
and process reopen, an exact semantic v2 retry must byte-match the migrated request and return the
stored v2 result without incrementing revision, appending facts or reapplying an effect. Focused
Automation fixtures prove reopen/get/list, canonical create/update, due-run selection/admission,
permission-snapshot enforcement fields and same-identity/no-reapply behavior. The selected-Run
fixture includes non-null thinking, a legal non-default permission policy, concrete target, non-null
Package generation and resolved receipt/binding facts, and asserts the complete canonical v2 JSON
bytes. Contradiction fixtures for Engine ID, resolved enforcement, Package generation, model and
target each fail zero-write preflight. A pending/rejected/delivery-unknown fixture proves legal
absence of resolved selection omits enforcement without promotion/defaulting. Separate fixtures
corrupt each Product and Automation JSON family, use an unsupported mutation kind and create a
cross-row inconsistency. Preflight failures preserve both v1 stores. File-transaction failures roll
back the active file; post-first-commit failures preserve validated Product v2, block startup and
later finish Automation without reapplying Product.

### Web draft persistence authority

Renderer composer drafts are a separate durable authority and never participate in the SQLite
transaction. Replace `omnimind:composer-drafts:v1` with an explicit v2 key/schema and migrate these
two exact paths before hydration:

- `draftsByThreadId[*].productQueueTransfer.requestedSelection`;
- `draftThreadsByThreadId[*].requestedSelection`.

The bounded migration follows one deterministic order:

1. If canonical v2 exists, reread and validate it, hydrate only v2, then remove a leftover v1 key
   only after that validation succeeds.
2. If v2 is absent and v1 exists, read v1 without modifying it, parse/transcode both paths fully in
   memory, validate the complete v2 payload, write canonical v2, reread and validate the stored v2,
   and only then delete v1.
3. A crash after v2 write and before v1 cleanup resumes from validated v2. Normal persistence writes
   v2 only. The v1 decoder exists solely in this one-time migration and is not a runtime fallback or
   permanent dual-read path.

Before-write interruption, quota/write failure, malformed/unsupported v1 or malformed v2 never
hydrate or dispatch the stale selection. Original v1 bytes remain untouched and recoverable where
present. Only the affected persisted draft surface reports `recovery-required`/unavailable and has
dispatch disabled; Product/SQLite state and other Conversation surfaces remain readable. No Pi or
OpenCode invocation, silent default, reset, destructive cleanup or raw-v1 editing is allowed.
Retrying the same deterministic migration is safe.

SQLite and localStorage expose two independently committed migration receipts. Copy distinguishes
“Product store migrated” from “local draft recovery required” and never claims cross-store
atomicity. Product protocol/admission is the final fail-closed boundary: protocol-v1 or otherwise
stale selection bytes are rejected even if a UI defect attempts dispatch, invoking neither Engine.

Focused Web proof covers both v1 paths, canonical v2 flush and v2-only reopen, interruption before
write, write failure, crash after v2 write/before v1 delete, cleanup/restart, malformed/unsupported
v1, malformed v2, original-byte preservation, no stale admission/Engine invocation, and successful
SQLite reopen while Web draft migration is recovery-required.

Web receives the protocol-version mismatch as a fail-closed resnapshot/unavailable condition. RPC
method identity remains stable, so no second transport or migration RPC is created.

## Error and unavailable behavior

| Failure | Product result |
| --- | --- |
| executable missing | OpenCode entry `missing`; Queue/draft/selection retained; Pi calls `0` |
| version or digest mismatch | `version-mismatch` or `artifact-mismatch`; no launch/prompt/fallback |
| initialize/protocol mismatch | exact unavailable reason; bounded diagnostics; no prompt |
| `session/new/resume` auth-required | Queue remains editable, catalog becomes `auth-required`, external login re-entry shown, no credential copy |
| target/resource unsupported | admission fails before Run with `target-unsupported`; exact choice/input retained |
| failure before `markSent` | no prompt attempt; prepared child closes; Queue remains if preparation failed, or pre-send outbox is retryable if failure followed admission |
| local write fails or process is lost before correlated fact | `delivery_unknown`; one attempt, no requeue/replay/fallback |
| loss after correlated fact and before final/error | `outcome_unknown`; partial visible facts retained, no replay/fallback |
| correlated JSON-RPC error | settled `failed`; sanitized code/message only |
| cancel write succeeds, then `end_turn` | settled according to actual final with `abort_requested`, `confirmed = false` |
| malformed/oversized ACP frame | close only that external boundary; classify by the current receipt evidence; Pi and Product Store remain alive |
| OpenCode child crash | does not terminate Product Service, Native Host, renderer or window; only selected Run/catalog entry changes |

Diagnostics may retain bounded reason codes, timings, counts, verified version/digest and process
exit class. They must not retain the response body, opaque Session/message/tool identifiers in
shared logs, complete paths beyond the dedicated runtime detail, stderr bodies, credentials,
configuration, raw request/response frames or tool input/output.

## Verification strategy

### Contract and migration

Run the focused Contracts tests and add fixtures proving:

- one closed v2 catalog decodes exactly the two concrete entries, unique IDs and Pi default;
- OpenCode unavailable intent retains `requestedEngineId` and the discriminated
  `engine-session-current` choice;
- renderer input cannot contain enforcement and unknown/raw ACP fields fail closed;
- Pi accepted receipts require `operationRef`; observed-delivery receipts cannot contain one;
- all legal/illegal receipt transitions, direct final-as-first-fact and abort metadata;
- one v1 fixture Store containing an admitted dispatch and all 24 concrete mutation kinds migrates
  every authoritative/ledger byte into canonical v2, resets only reconstructible fact projections,
  and passes `foreign_key_check`/`integrity_check`;
- after process close/reopen, the same semantic v2 dispatch and each mutation request return their
  stored v2 result without revision/fact/effect changes;
- Automation definitions/Runs reopen through get/list, create/update persist canonical v2, due-run
  admission retains the exact selection, and permission snapshots retain truthful enforcement;
- malformed JSON in each inventoried family, unknown mutation kind, inconsistent row set and unknown
  schema version fail zero-write preflight, retain both v1 files plus all original bytes and reopen
  through schema-1 fixture readers;
- file-backed process fixtures crash before/during preflight, after preflight, within each store
  transaction, after Product commit/before Automation, after Automation commit/before runtime, and
  during marker validation; every reachable marker pair resumes exactly once and no application
  owner observes mixed versions;
- transient/permanent Automation-file I/O failure after Product commit remains startup-blocked,
  preserves Product v2, and later completes without reapplying its transform;
- coordinator tests prove config-first outer composition, temporary connection/lifecycle-lock
  release, normal-owner acquisition only after matching validated markers, and WAL-aware reopen.

Focused command:

```text
bun run --cwd packages/contracts test -- src/product/state.test.ts --reporter=dot
```

### Product/gateway and Pi preservation

Focused Service tests prove:

- explicit OpenCode selection invokes the OpenCode boundary once and Pi zero times;
- missing/incompatible/auth/target failure preserves Queue revision and exact selection;
- Pi -> OpenCode -> Pi never crosses lineage; any later admitted different-Engine Entry forces new
  lineage even when its Run was rejected or reached an unknown state without a binding; same-Engine
  continuation uses only its own latest compatible non-divergent binding;
- `prepare`, `attempt`, `control` and startup recovery all route by Engine identity, not ref text;
- local write -> correlated fact -> final follows the OpenCode state path, while Pi remains
  pending -> accepted with the existing operation reference;
- both disconnect windows, restart and duplicate submit retain attempt `1`, replay `0`, fallback
  `0`;
- OpenCode cannot invoke Package lifecycle hooks or obtain a Pi generation lease;
- selection enforcement is derived in Service and remains `unverified` for OpenCode;
- an OpenCode process exit leaves the Native Host boundary/catalog usable.

Focused commands:

```text
bun run --cwd apps/service test -- src/product/ProductControlPlane.test.ts --reporter=dot
bun run --cwd apps/service test -- src/native-host/executionBoundary.test.ts --reporter=dot
```

The Pi tests assert the unchanged accepted-operation request/response and fact mapping. Because this
Design changes the shared v2 catalog, gateway, Native Host projection and Web selection seam, the
frozen candidate must also run exactly one smallest real Pi production-path journey described
below. The predecessor MiMo/DeepSeek/Package/ZIP matrices remain predecessor proof and are not
repeated because their lower Provider/Package triggers did not change.

### Deterministic ACP child process

A test child executable exercises the production framing/process code without user configuration:

1. valid initialize and Session current model/mode;
2. bounded/malformed/partial/multiple NDJSON frames and stderr noise;
3. exact `markSent` ordering before the first prompt byte;
4. scheduled `available_commands_update` ignored for correlation;
5. message, thought, tool, plan, usage, permission and final mapping with raw fields rejected;
6. final/error as the first correlated response;
7. EOF before correlation and after correlation;
8. cancel request with late facts and `end_turn`;
9. process spawn/initialize/session failure and cleanup; and
10. one in-flight prompt enforcement.

Tests inspect Product facts/persistence to prove no raw ACP object, config, credential, full tool
payload or private transcript crosses the boundary.

### Web behavior

Extend the existing stable browser journey to prove:

- Pi is initially selected and its Model/Thinking behavior is unchanged;
- selecting OpenCode affects only the next Queue item and produces no Toast/Timeline/Conversation
  mutation;
- Queue and Run distinguish their frozen Engine without becoming a diagnostics panel;
- OpenCode Thinking-level, steer/follow-up, Question, Package and Terminal parity is not shown;
- enforcement says `unverified` separately from the chosen user policy;
- OpenCode unavailable/auth/target state preserves draft, attachments and explicit choice and does
  not submit Pi;
- both v1 draft selection paths migrate before hydration, canonical v2 reopens without consulting
  v1, and crash/write/quota/cleanup boundaries resume without losing recoverable v1 bytes;
- malformed/unsupported v1 or malformed v2 reports draft recovery-required, disables only stale
  draft dispatch and cannot invoke Pi/OpenCode, while a successfully migrated SQLite Product Store
  remains readable;
- Native Host failure blocks Pi but not a ready OpenCode Chat choice; Service failure blocks both;
- switching back to Pi restores its exact controls and does not reuse external lineage.

Focused commands are the existing Product browser journey plus narrow Product Store/read-model and
selection-aware health tests. A new full visual gate is triggered only if the Engine control causes
material Composer geometry drift under Workbench; truthful state wiring alone uses the existing
geometry.

### Sanitized real checkpoints

After deterministic fixtures pass, execute one minimal OpenCode journey through the production
Service gateway, not the raw ACP helper:

```text
existing Product Chat Conversation
-> explicit OpenCode next-Run choice
-> exact installed 1.14.40 process and ACP v1 initialize
-> private Chat scratch + external Session
-> one text prompt
-> typed visible stream/final
-> opaque EngineBinding
-> settled Run
```

Evidence records only resolved version/digest match, protocol/capability keys, transition order,
timing, fact counts, settlement class, `attemptCount = 1`, automatic replay `= 0` and Pi invocation
`= 0`. It does not record response text, credentials, configuration, opaque IDs, raw frames or
complete stderr. The prior real cancel observation remains source evidence; destructive disconnect
and cancel matrices use the deterministic child rather than issuing extra live prompts.

On the same frozen post-repair candidate SHA, execute exactly one smallest affected real Pi journey
through the changed shared path:

```text
new or existing Product Chat Conversation
-> untouched default Pi selection
-> Product protocol-v2 admission
-> literal composed gateway selects Pi
-> real Native Host returns an accepted-operation reference
-> typed visible stream/final
-> settled Product receipt
```

The sanitized receipt binds the exact candidate/source, Pi/native protocol identity, transition
order, accepted-reference presence, visible fact count, settlement class and asserts OpenCode child
spawn/prompt invocation count `= 0`. Use the smallest currently authorized healthy real Pi resource
only if the native journey requires a Provider call; do not repeat the unchanged predecessor
provider/package matrices or expose credentials, endpoints, model response text or opaque IDs.

Finish with focused Contracts/Service/Web typechecks, the affected tests, identity/source checks
required by changed paths and `git diff --check`. Root packaging, Remote, marketplace, three
platforms, full performance and unchanged live Pi gates are outside this checkpoint unless a
specific changed-path falsifier appears.

## Rejected alternatives

### Treat stdio write or Session creation as acceptance

Rejected because the fixed protocol has no prompt ACK/operation reference. It would collapse the
two unknown windows and make blind replay possible.

### Put a synthetic operation ID on OpenCode receipts

Rejected because a Product dispatch ID or JSON-RPC request ID is not Engine acceptance authority.
Product controls route by Run/Engine, so no fake ref is needed.

### Replace the Pi catalog with OpenCode or merge all Models into one list

Rejected because it erases Pi default semantics and turns one Session's temporal OpenCode values
into a false global/authenticated mirror.

### Prebuild a generic Engine registry/SDK

Rejected because only two concrete consumers exist and neither needs dynamic registration,
installation, protocol factories or plugin lifecycle. The literal gateway is the smallest shared
contract justified by evidence.

### Route ACP through Native Host, Desktop or renderer

Rejected because External Engine supervision belongs to Product Service. The alternatives enlarge
credential/crash domains or expose raw wire to UI while competing with native Pi authority.

### Route control/recovery by reference prefix

Rejected because opaque refs must remain opaque, can collide or change, and cannot prove Engine
authority. Frozen `engineId` is already the correct Product fact.

### Automatically retry, requeue or fall back to Pi

Rejected because prompt delivery/effects can be ambiguous. It would duplicate non-idempotent work
and violate the explicit next-Run choice.

### Infer settlement from `session/load/resume` or transcript text

Rejected because ACP exposes no prompt operation identity. Session survival proves lineage only;
content heuristics copy private truth and can match the wrong Run.

### Copy prior transcript into the new Engine Session

Rejected for this checkpoint because no bounded, loss-visible context mapping is approved. The UI
shows a new lineage after an Engine switch and sends only the current Entry.

### Use ACP `authenticate` or mutate OpenCode config for tests

Rejected because the fixed method fails and the task has no authority to copy credentials or
change user configuration. Auth-required remains a truthful external re-entry state.

### Claim permission containment or allow asked actions by policy name

Rejected because no deny-side-effect proof exists. The bridge rejects asked actions in this slice
and reports `unverified`; neither `Full access` nor process isolation becomes “sandbox”.

## Residual risks and bounded consequences

- The exact installed Mach-O digest, npm/release metadata and source revision are known, but no
  reproducible build binds those bytes cryptographically. Runtime detail must not claim more.
- Auth can be proven only while preparing a real Session. Preparation occurs before admission so
  the Queue survives; a lost race can leave an empty OpenCode-owned Session because ACP advertises
  no delete. It contains no sent prompt and never becomes a Product binding.
- A no-ACK unknown Run cannot be reconciled by this protocol and blocks another Run in that
  Conversation. That loss of convenience is safer than replay or guessed settlement.
- Cross-Engine semantic context is deliberately not transferred. The Product Conversation remains
  continuous, while the Engine detail makes new lineage and current-Entry-only context explicit.
- Enforcement remains `unverified`; this slice does not prove safe user-folder writes. Restricting
  dispatch to private Chat scratch prevents F-13 from silently claiming F-14.
- OpenCode model/mode options are temporal and provider-dependent. Only the actual resolved values
  for the prepared Session enter the Run receipt; no completeness claim is made for the observed
  list.

None of these risks blocks the bounded checkpoint because each has a fail-closed behavior and an
observable verification path. A newer OpenCode artifact, host-enforced deny path, Product
permission UI, bounded cross-Engine context transfer, Agent-folder support or distribution policy
requires a new evidence/design decision rather than expansion inside this slice.
