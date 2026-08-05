---
type: "Work"
title: "Establish the Product and system command surface"
---

# Establish the Product and system command surface

## Objective

Close the concrete ownership gap exposed by the failed
[authority-retirement handoff](../handoffs/retire-competing-execution-authority.md) before that
deletion Work resumes. Replace every still-live Web dependency on the donor orchestration command
bus and static Provider catalog with the smallest complete combination of:

1. durable, typed Product mutations owned by the Product Control Plane;
2. already-existing or narrowly restored system capabilities owned by their concrete Service
   domains;
3. sanitized runtime facts observed from the isolated Native Host; and
4. truthful unavailable or re-entry states where no replacement capability exists in this release.

This Work is a bounded predecessor to authority retirement. It is not a new checkpoint, a second
Runtime, a compatibility project or permission to redesign the approved Product objects, Host
topology or Agent/Chat workbench.

## Why this Work exists

The accepted Pi-native Work proves real execution through the isolated Host. The first
authority-retirement attempt then physically deleted most donor Provider/orchestration authority,
but found that the mature Web mother still contains live non-Engine behavior coupled to the donor
aggregate:

- the authoring snapshot found 71 direct `api.orchestration` references across 25 production Web
  files, including 34 generic dispatches and 14 donor shell reads; and
- the static Provider/Model contract still has more than one thousand production Web/shared type
  references. A compile experiment that merely opened those closed unions failed broadly and was
  fully reverted.

Those numbers are evidence for this Work's entry condition, not frozen acceptance counts. The exit
condition is zero live donor authority, with preserved behavior proved through its real owner.

## Linked inputs

- [Workbench behavior-preservation and deletion contract](../../../../architecture/workbench.md)
- [Product State ownership, mutation and uncertainty contract](../../../../architecture/product-state.md)
- [Execution and scoped-system-capability authority](../../../../architecture/execution.md)
- [PRD T4 replacement/deletion requirements](../prd.md)
- [Design migration and authority-retirement rules](../design.md)
- [Accepted Pi-native execution review](../reviews/adopt-pi-native-execution-final.md)
- [Blocked authority-retirement evidence](../handoffs/retire-competing-execution-authority.md)
- [Authority-retirement Work to resume after this Work passes](retire-competing-execution-authority.md)

## Requirement traceability

This Work is the minimum replacement proof required by R10 before destructive deletion can finish.
It carries R11 by preserving mature non-Engine behavior under concrete owners, and completes the
Web-facing replacement half of R8 without moving Engine authority out of the isolated Native Host.
It does not change T4 semantics or authorize a new QbD round.

## Authority model

Implementation must keep four surfaces distinct. A convenient shared transport or package does not
merge their authority.

### 1. Durable Product mutations

The Product Control Plane is the sole durable writer for Product objects and their organization.
Add only the mutations required by current production consumers:

- Conversation title, archive/restore/delete, draft promotion and bounded metadata used by pins,
  markers or notes;
- Conversation continuity actions whose result is another Product Conversation, such as fork or
  handoff, when the existing UI has enough current facts to perform them truthfully;
- Workspace/Project creation, naming and archive state as visible Product location facts, plus
  Product Group name, color, order and Conversation many-to-many membership as visible topic
  organization facts; and
- Kanban/task admission as Product Queue intent, never as an accepted Engine operation.

Each mutation must use a closed typed input, validate current Product identity/membership, apply an
explicit expected revision or equivalent compare-and-set where concurrent edits matter, commit
atomically in the Product Store, advance the authoritative sequence and return the smallest current
Product snapshot needed by the caller. Do not route these mutations through
`ProductOperationReceipt`: that receipt remains execution acceptance/outcome truth, not a generic
CRUD receipt.

Prefer several responsibility-named RPCs over a generic patch document. Do not expose
`dispatchCommand`, `{ type, payload }`, arbitrary event append, aggregate names or donor Thread
schemas through a new namespace.

### 2. Scoped system capabilities

Git, worktree, checkpoint/diff, pull-request, file import/export, storage cleanup, diagnostics,
filesystem and external integration management are not Product Store mutations and not Engine
commands. Reuse the existing concrete `SystemRpcGroup` and its current Project/Git/Terminal/
Filesystem implementations where they already satisfy the behavior. Restore or relocate from the
pre-deletion source only the smallest concrete mechanism needed for a protected current consumer.

Any new system RPC must have a responsibility-specific name and schema, a concrete Service owner,
bounded input/output, typed errors, cancellation or timeout where work can block, workspace/path
containment, and explicit permission/enforcement truth. It must not accept an Engine prompt,
provider selection, arbitrary shell command or generic operation payload.

Checkpoint and diff reads may retain opaque identifiers required for display, but they must not
restore donor Provider Session or orchestration journal authority. External MCP settings may expose
management facts and explicit re-entry only; Engine-side MCP execution and Package/Extension
lifecycle remain Native Host responsibilities.

### 3. Native Host runtime facts

Provider, model, thinking level, Agent profile and Package availability must be derived from the
current isolated Host observation. Extend the existing sanitized `ProductRuntimeCatalog` only when
real Host evidence supports the added fact. Product may own recommendation, default selection,
source/trust/activation presentation and the user's requested selection; it may not reconstruct a
second capability catalog.

Replace static `ProviderKind`, provider-specific `ModelSelection`, status maps and hard-coded picker
authority with Product runtime facts plus local presentation types. A local Web presenter may adapt
runtime facts to an existing visual component during this Work, but it must be view-only, must not
be exported as a compatibility contract, must not encode a closed provider union and must have a
named deletion point in the handoff. Runtime-absent and auth-missing are real states, not reasons to
fall back to the donor catalog.

### 4. Truthful unavailable and re-entry

Not every donor affordance needs a replacement mutation in this release. Advanced slash actions,
compact/review/export/sidechat, per-turn rewind, provider maintenance or integration operations that
cannot be implemented from current Product facts and concrete system capabilities must stay
visible only where the mother requires them and return a precise unavailable state or safe re-entry.

Unavailable must not report success, mutate only renderer state as if durable, enqueue an unrelated
Run, blindly retry an unknown operation, or call a hidden donor path. The UI must preserve the
user's draft/Queue and explain the next truthful action. Existing Pi-native submit/control behavior
must continue to use Product Queue/Run and Native Host acceptance.

## Consumer migration groups

The implementation handoff must enumerate every migrated production consumer under exactly one of
these groups and record its new owner/proof. One file may use several groups, but no call may remain
owned by the donor aggregate.

### A. Conversation lifecycle and metadata

Migrate rename, archive/restore/delete, temporary Conversation promotion, recovery/resnapshot,
pins, markers/notes, unblock and continuity/handoff. Product Conversation identity and typed Product
snapshots are authoritative. A missing deep link must not create data implicitly; the canonical New
Chat path may still create its already-approved local draft and promote it through a Product
mutation.

### B. Workspace, Project and Groups

Migrate Workspace/Project create, rename, archive and selected-workspace recovery without treating
Groups as locations. Migrate Product Group create, rename, color, order and Conversation
many-to-many membership without adding `spaceId`, Void, project assignment or active-Space route
state. Product owns these organization facts; concrete filesystem/project inspection remains a
scoped system capability. Do not infer workspace truth from renderer route state or the old
orchestration shell.

### C. Git, branch, checkpoint and pull request

Reconnect `BranchToolbar`, `GitActionsControl`, PR/handoff/checkpoint and diff consumers to the
existing typed Git/System RPCs or a narrowly restored concrete checkpoint capability. Preserve
progress, cancellation, error and recovery presentation. Text generation or accepted Agent work
must not be smuggled into Git capability code.

### D. Kanban and task admission

Card/task actions that express new Agent work must create or update a Product Queue item. UI-only
organization may use Product mutations. No action may claim accepted/running until the Product Run
receipt records Native Host acceptance.

### E. Settings, diagnostics, storage and external MCP management

Keep credential, onboarding, storage safety, diagnostics and settings behavior under their current
concrete owner. Expose a typed management command only when a retained implementation exists;
otherwise render an explicit unavailable/re-entry state. Never restore the deleted general
`externalMcp` execution gateway or store credentials in Product facts.

### F. Advanced Composer actions

Derive option visibility from Product/Host facts. Implement only actions expressible as a Product
mutation, Product Queue intent or concrete system capability. Preserve the mature Composer,
attachments, IME, keyboard, split/workbench and draft behavior when an action is unavailable.

### G. Engine, Model, Agent and Package discovery

Use current Host catalog observations and Product selection facts for all execution-facing pickers,
defaults and status. Do not maintain a static capability mirror or interpret provider labels as wire
semantics. Agent and Package entries without current Host evidence must be unavailable or absent,
not synthesized from old settings.

## In scope

- Extend Product state/RPC/Control Plane only for the durable mutations above.
- Extend the sanitized Host catalog/health observation only for evidenced runtime facts required by
  current pickers and capability decisions.
- Reuse or narrowly restore concrete system mechanisms required by the protected Web consumers.
- Migrate all live Web calls away from `api.orchestration`, donor shell/read-model snapshots and
  static Provider execution authority.
- Remove Web transport filtering, rejection shims and donor/Product registries that exist only to
  keep both execution worlds alive once their last consumer is migrated.
- Add focused contract, Product Store, Service capability, transport and real browser tests for
  normal, failure and recovery behavior.
- Update the Work map and the linked authority-retirement Work only to record ordering and the new
  accepted predecessor; do not create another design or status document.

## Out of scope

- Reopening Converge, QbD, PRD, architecture owners or the approved Product/Host topology.
- Replacing the Synara-derived workbench mother, deleting mature UI because its backing call is
  inconvenient, or redesigning Agent/Chat navigation.
- Adding a generic command/event bus, compatibility `orchestration` facade, open-ended payload,
  second durable/live writer or Product-side Engine Session/Package lifecycle.
- Completing marketplace, Remote, external Engines, Windows/Linux packaging or unrelated UI.
- Claiming authority retirement complete; this Work supplies replacement proof, after which the
  separate deletion Work must resume and pass.

## Allowed repository paths

The implementation may change the existing Product/Host/system seams and their direct consumers:

```text
packages/contracts/src/product/**
packages/contracts/src/{rpc,ws,index}.ts
packages/contracts/src/{git,project,filesystem,automationRpc}.ts   (scoped capability only)
packages/shared/src/**                       (remove direct donor Provider/Thread contract use only)
apps/native-host/src/**                      (sanitized catalog observation only)
apps/service/src/product/**
apps/service/src/native-host/**              (catalog/health client only)
apps/service/src/git/**                      (concrete capability only)
apps/service/src/checkpointing/**            (concrete capability only)
apps/service/src/pullRequests/**             (concrete capability only)
apps/service/src/workspace/**                (concrete capability only)
apps/service/src/automation/**               (Product admission seam only)
apps/service/src/{wsRpc,serverLayers,effectServer,main}.ts
apps/web/src/wsNativeApi.ts
apps/web/src/product/**
apps/web/src/store/product*.ts
apps/web/src/chatRouteRecovery.ts
apps/web/src/threadMarkers.ts
apps/web/src/pinnedMessages.ts
apps/web/src/components/{BranchToolbar,GitActionsControl,Sidebar,ChatView}.tsx
apps/web/src/components/kanban/useKanbanCardContextMenu.tsx
apps/web/src/components/settings/{AdvancedSettingsPanel,ConversationStorageSettingsPanels,ExternalMcpSettingsPanel}.tsx
apps/web/src/components/useSpacesController.ts
apps/web/src/hooks/{useComposerSlashCommands,useSidebarProjectRunController,useSidebarThreadActions,useTemporaryThreadLifecycle,useThreadHandoff,useThreadUnblock}.ts
apps/web/src/lib/{activeThreadDelete,chatProjects,kanbanDispatch,projectCreation,providerReactQuery,spaces,studioProjects,threadCreatePromotion,threadRename}.ts
apps/web/src/**                              (static Provider direct-consumer migration only)
```

Colocated focused tests and fixtures may change. The broad final Web line is not general UI
authorization: an additional file may change only if it directly consumes the static Provider/
Model contract or one of the migrated helpers, and its diff must be limited to runtime-fact/local
presentation migration. The handoff must enumerate such files by responsibility group.

The Work may write only
[`handoffs/establish-product-system-command-surface.md`](../handoffs/establish-product-system-command-surface.md).
It must not stage, commit, revert or split the already-dirty authority-retirement implementation.
Implementation must build on that tree and preserve its coherent deletions.

## Done conditions

### Contract and authority

- No production Web source references `api.orchestration`, `ORCHESTRATION_WS_METHODS`,
  `ORCHESTRATION_WS_CHANNELS`, `dispatchCommand`, donor orchestration snapshots or raw donor
  orchestration events.
- No new generic dispatch, aggregate/event append, compatibility orchestration facade or arbitrary
  payload contract exists.
- Every new durable Product mutation is handled by the Product Control Plane, persisted atomically,
  projected through typed Product facts and covered by revision/conflict tests.
- Every retained system action names and calls a concrete capability owner; it cannot invoke an
  Engine or Package lifecycle.
- Execution-facing Web code no longer treats a static Provider union/status map as capability
  truth. Current Host catalog absence/auth failure remains truthful and does not activate fallback
  options.

### Behavior preservation

- Conversation rename/archive/restore/delete, draft promotion and the retained metadata actions
  survive Service restart and resnapshot without a second writer.
- Workspace/Project changes preserve location identity, while Product Group changes preserve
  order and Conversation many-to-many membership; both recover from a stale revision or
  disconnected response without duplicate mutation.
- Git/branch/checkpoint/diff/PR consumers preserve their existing normal, cancellation/error and
  refresh/re-entry behavior through scoped system RPCs.
- Kanban/task and advanced Composer actions either create exact Product intent or display truthful
  unavailable; none reports a fake accepted/running operation.
- Settings/storage/diagnostic/integration surfaces keep their mature non-Engine behavior or an
  explicit truthful boundary. Credentials never enter Product snapshots, logs or fixtures.
- Agent/Chat route, split/pane, Composer, attachments, Queue, Terminal/Diff/Browser, scroll,
  bilingual critical path, IME, keyboard and accessibility lineage remains intact.

### Failure and recovery

- Lost response after a committed Product mutation reconciles by authoritative snapshot/sequence;
  retry with the same mutation identity is safe or explicitly rejected without duplicate state.
- Stale revision, unknown Product identity, Host unavailable, auth missing, capability unavailable,
  system timeout/cancellation and transport reconnect each have focused proof.
- Unknown Engine delivery/outcome semantics remain exactly those accepted in the Pi-native Work;
  this Work does not add replay or weaken uncertainty.

### Verification

- Contracts, Product Control Plane, affected Service/Web/shared typechecks and focused unit tests
  pass on the current source.
- Real browser tests cover at least Conversation lifecycle, one Workspace mutation, one Product
  Group membership mutation, Product Queue admission, one scoped Git/diff action, runtime-catalog
  unavailable/auth state and one advanced-action unavailable/re-entry path.
- The current candidate reruns the route/performance and mother-preservation checks affected by
  Provider/picker and Sidebar/Chat consumer migration; thresholds are not widened.
- Scoped source scans and `git diff --check` pass. Generated screenshots or browser attachments are
  either intentional evidence named in the handoff or removed.

## Stop conditions

Stop and return a factual blocked handoff if any protected behavior can only be preserved by:

- restoring donor Provider Session/orchestration journal/accepted-operation authority;
- introducing a generic compatibility facade or second Product writer;
- inventing Host capability not present in current runtime evidence;
- broadening Product objects, public ontology or architecture owners; or
- deleting a mature workbench/system behavior instead of reconnecting its concrete owner.

A red focused test is not by itself a stop condition; diagnose and repair it within this Work. A
true owner conflict is.

## Handoff requirements

Write one implementation handoff containing:

1. a table of every protected production consumer, responsibility group, old dependency, new
   Product/system/Host owner and exact proof;
2. all new RPC/fact names and why each is durable Product, scoped system or Host observation;
3. any mechanism restored or relocated from pre-deletion source, with the deleted aggregate
   dependency removed;
4. any local Web presenter, its non-authoritative boundary and deletion point;
5. exact negative scans, focused gates and real browser results, including collection/test counts;
6. the remaining dirty-tree boundary and explicit statement that authority retirement is not yet
   complete; and
7. residuals that must be owned by the resumed authority-retirement Work.

Expected independent review:

- reject generic buses, fake success, hidden donor fallback, static capability mirrors, lost mature
  behavior and Product/System/Host authority mixing;
- inspect all changed production consumers rather than trusting typecheck alone; and
- rerun a bounded representative normal/failure/recovery/browser matrix from current source.

After independent PASS, resume
[`retire-competing-execution-authority.md`](retire-competing-execution-authority.md) on the same
coherent tree. Do not freeze or promote a candidate between these two T4 Works.
