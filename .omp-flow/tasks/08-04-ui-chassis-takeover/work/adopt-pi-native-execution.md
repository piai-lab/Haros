---
type: "Work"
title: "Adopt Pi native execution inside the established Host"
---

# Adopt Pi native execution inside the established Host

## Objective

Extend the exact T2 Native Host boundary in place with the pinned Pi runtime and deliver one real
Chat plus one folder-backed Agent journey through Product admission, truthful acceptance, Pi-native
Session/catalog/Thinking/Tool/control facts and preserved T3 UI. This Work proves the replacement
path but does not yet declare T4 complete while old physical authority remains.

## Linked inputs

- [Execution owner](../../../../architecture/execution.md)
- [Product State owner](../../../../architecture/product-state.md)
- [Workbench execution presentation](../../../../architecture/workbench.md)
- [PRD R5, R8, R9 and T4 requirements](../prd.md)
- [Design §7.1–§7.6 and Native Host verification](../design.md)
- [Fixed Pi integration facts](../../../../research/source-review.md)
- [Pi adapter and authority source audit](../research/source-domain-audit.md)
- [QbD A-02 acceptance falsifier](../qbd/design-audit.md)
- [Scoped QbD Host-continuity closure](../qbd/design-audit-recheck.md)
- Accepted T2 Host and T3 workbench handoffs

## Requirement traceability

This Work supplies real runtime evidence for R5, owns the replacement half of R8 and closes the real
dispatch/control/fault behavior in R9. It carries A-02 by making queryable Pi acceptance the first
implementation falsifier before destructive deletion. R10 and final Host-external dependency
cleanliness remain assigned to the following authority-retirement Work.

## In scope

- Pin the exact Pi revision/version and place Pi SDK/runtime plus executable Package/Extension code
  only in `apps/native-host` and its build target.
- Extend the existing Host protocol without changing executable identity, endpoint family,
  authentication, supervision, health or shutdown semantics. Add only versioned runtime catalog,
  Session, dispatch, typed fact, control and reconciliation message families.
- Make acceptance truth the first proof: identify a queryable Pi-native Session/operation fact that
  distinguishes accepted from rejected/indeterminate. A returned `Promise<void>`, local UUID or
  donor turn id is not acceptance.
- If strong acceptance cannot be observed, return `indeterminate` and let Product Service persist
  `delivery_unknown`; do not fabricate a receipt or allow blind replay. Stop if the product would
  require guessing plus automatic replay.
- Resolve runtime-backed Provider/Model/Thinking capability and actual selection in Host. Product
  may recommend/display choices but may not maintain a competing static capability catalog.
- Use Pi-native Session create/open/continue, compaction/branch and ResourceLoader behavior. Product
  stores only opaque `EngineBinding`/operation references and visible facts; it does not copy the
  native transcript or Package private state.
- Translate native events at Host ingress into bounded versioned typed facts with run/operation
  identity, sequence or snapshot semantics, size limits and redaction. React continues to consume
  only Product read models.
- Implement real Chat and folder-backed Agent sends, assistant stream, Thinking, structured
  Question when natively available, Tool activity/result summaries, usage and settlement through
  the preserved Composer/Timeline/Queue/Workbench.
- Map steer/follow-up/abort/cancel only from current Pi capability and operation state. Unsupported,
  too-late and unknown are distinct typed results; Product Service does not create an accepted
  Engine queue or retry policy.
- Continue a compatible Session; when missing or divergent, preserve readable Conversation and
  create a truthful new lineage with visible context/private-state loss. Host restart queries native
  facts before any reconciliation.
- Broker only the selected Run's credential from the system keychain using the minimum viable
  one-shot material or handle. Redact keys/source and keep secrets out of argv, ordinary env dumps,
  Product DB, renderer, logs, diagnostics, crash files and artifacts.
- Run the complete dispatch/process fault windows through the real Host and real Pi path, including
  before/after acceptance, during stream, after side effect, Host crash idle/running and Service
  crash. Resume facts/Session where supported; never re-execute an uncertain effect.
- Exercise one real headless Package/ResourceLoader boundary only to prove executable ecosystem code
  and private state stay in Host and Package/Host crash does not kill Desktop/Product Store. This is
  not broad Package compatibility or marketplace work.

## Out of scope

- Creating a second Host, alternate transport, Pi-through-ACP path, product static Model mirror or
  generic Engine Harness.
- Physically deleting the moved Provider registry, PiAdapter wrapper, accepted queue, migrations or
  raw reducer; the next Work owns deletion after this proof is accepted.
- Claiming all Pi Packages, TUI/bridged UI, external Engines, Remote or cross-platform release work.
- Claiming `host-enforced` without deny-side-effect evidence; process isolation alone proves only
  crash containment.

## Allowed repository paths

Only the existing Host boundary, Product dispatch/projection consumer and real journey wiring may
change:

```text
apps/native-host/**
packages/contracts/src/native-host/**
packages/contracts/src/product/**              (receipt/fact variants actually consumed)
packages/contracts/src/index.ts                (scoped exports only)
packages/contracts/package.json
apps/service/src/native-host/**
apps/service/src/product/**                    (dispatch, receipt, projection and reconciliation only)
apps/service/src/serverLayers.ts               (Host runtime client composition only)
apps/service/src/wsRpc.ts                      (typed Product command/read-model transport only)
apps/service/package.json                      (no Pi dependency)
apps/desktop/src/main.ts                       (keychain/secret broker and existing supervisor only)
apps/desktop/src/preload.ts                    (no raw runtime fact or credential)
apps/desktop/package.json                      (no Pi dependency)
apps/web/src/routes/__root.tsx                 (typed fact subscription only)
apps/web/src/components/chat/**                (typed fact/control presentation only)
apps/web/src/components/ChatView.tsx           (Product commands/receipts only)
apps/web/src/store/**                          (typed Product projection only)
apps/web/package.json                          (no Pi dependency)
package.json                                   (workspace/test scripts only)
bun.lock
turbo.json
scripts/**                                     (runtime boundary/dependency/leak checks only)
```

Focused/integration/e2e tests colocated with these paths may change. The handoff may be written only
to [`handoffs/adopt-pi-native-execution.md`](../handoffs/adopt-pi-native-execution.md). Any need to
edit old execution modules is recorded for, and deferred to, the authority-retirement Work unless a
non-destructive characterization seam is strictly required.

## Done conditions

- `apps/native-host` uses the same executable/endpoint/auth/supervisor/health/shutdown seam proved at
  T2. Scans find no second Host, alternate runtime transport or permanent translator.
- The exact Pi revision is pinned and runtime-backed Provider/Model/Thinking facts drive both a real
  Chat and folder-backed Agent without a Product static mirror or silent fallback.
- Acceptance is tied to a queryable native fact. Accepted/rejected/indeterminate and Product
  accepted/rejected/`delivery_unknown` are correctly separated; a local id or returned void cannot
  produce accepted.
- Real tests prove compatible Session continuation, missing/divergent Session rebuild, Host restart
  reconciliation and preservation of visible Conversation without a second transcript authority.
- Stream/Thinking/Tool/Question/usage/settlement facts are typed, sequenced, bounded and redacted;
  raw Pi/provider payload never reaches Product core or React.
- Queue ownership and controls remain truthful. Unsupported/too-late/unknown results are distinct;
  no Product accepted queue, native retry simulation or uncertain automatic replay exists.
- Every Design fault window has a deterministic durable receipt/UI/replay result and the measured
  uncertain replay/effect re-execution count is zero.
- Credential leak scans are clean. Permission policy and enforcement source remain distinct; any
  unproved enforcement is shown as engine-enforced/mixed/unverified.
- A representative headless Package boundary runs in Host, retains native private-state ownership
  and can crash without taking down Window or Product Store, without extrapolating broad Package
  compatibility.
- The handoff expands the old-anchor replacement rows with normal/failure/recovery proof sufficient
  for the next Work to decide deletion, while explicitly stating the old physical debt still blocks
  a production candidate.

## Falsifiers and stop conditions

- First, stop if Pi acceptance can only be guessed and correct behavior would require blind replay.
  Preserve `delivery_unknown`; do not delete old authority or invent an ack.
- Stop if Pi SDK/runtime/Package code must enter Electron Main, preload, renderer or Product Service,
  or if T4 requires replacing the T2 Host/transport.
- Stop if Session continuity requires Product to copy native transcript/private state or if real
  controls require a second Product accepted-operation queue.
- Stop if a credential can only be delivered through a user-visible/global environment or leaks into
  persistent/log/artifact surfaces without a bounded redaction path.

## Focused verification

Run focused checks for:

```text
exact Pi dependency and Host-only import boundary
runtime-backed Model/Thinking catalog and no static mirror
queryable acceptance versus rejected/indeterminate
Chat and folder-backed Agent real sends
Session continue, loss, divergence and rebuild
typed stream/Thinking/Tool/Question/usage/settlement facts
steer/follow-up/abort/cancel capability results
all dispatch crash windows and zero uncertain replay
Host/Service crash and resnapshot/reconciliation
credential/log/argv/DB/renderer/artifact leakage
representative Package isolation and crash containment
```

Run affected package typechecks/builds and `git diff --check --` over allowed paths. Live Provider
probes use the smallest authorized resource, hard timeouts and redacted evidence; no secret or raw
response enters the handoff.

## Checkpoint verification

On the replacement-path commit, run the real Desktop→Service→established Host→Pi journey for one
Chat and one folder-backed Agent, then execute the process/dispatch fault matrix. Confirm the old
Product Service route remains unreachable but still physically present only as declared debt.
Independent review must attack acceptance truth, Session ownership, replay, credential boundaries,
Host continuity and capability honesty before deletion is authorized.

## Expected handoff

The handoff records exact Pi/runtime/package versions, unchanged Host seam identity, acceptance
evidence type, redacted real-journey results, Session lineage cases, typed fact/control coverage,
fault injections, replay/effect counts, credential/permission evidence, Package-boundary limitation
and completed deletion-row replacement proof. It contains no secret, broad compatibility claim,
Campaign promotion or assertion that T4 is complete before old authority leaves the graph.

## Ordering and review

This Work follows accepted T3 UI proof. It reuses the T2 Host and T2 Product seam; it may not replace
either. Its independent reviewer must accept the real replacement path and A-02 acceptance evidence
before the authority-retirement Work can delete any competing execution domain.
