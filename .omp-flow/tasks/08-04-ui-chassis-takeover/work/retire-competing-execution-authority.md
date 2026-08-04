---
type: "Work"
title: "Retire competing execution authority"
---

# Retire competing execution authority

## Objective

Complete T4 by physically removing the unreachable donor Provider/Session/accepted-operation/
Package/raw-payload authority and all temporary compatibility paths after the real Pi Host
replacement has passed normal, failure and recovery proof. Preserve mature Product-control and
system-capability mechanisms under their correct owners, and make Host-external Pi dependency,
second-Host and unrelated donor-identity scans green without exceptions.

## Linked inputs

- [Execution source-adoption and contraction rules](../../../../architecture/execution.md)
- [Product State authority map](../../../../architecture/product-state.md)
- [Workbench deletion gate](../../../../architecture/workbench.md)
- [PRD R8, R10, R11 and T4 exit criteria](../prd.md)
- [Design §7.7, migration rules and deletion verification](../design.md)
- [Complete source-domain preserve/adapt/delete audit](../research/source-domain-audit.md)
- [QbD A-02 and A-03](../qbd/design-audit.md)
- [Approved T4 no-exception boundary](../decisions/qbd-1-approval.md)
- Accepted handoff from [Pi native execution](adopt-pi-native-execution.md)

## Requirement traceability

This Work owns R10, completes the dependency/authority half of R8 and carries R11 through every
delete decision. It uses A-02 as a hard prerequisite for destructive authority deletion and A-03
for any user-visible anchor removal. It also verifies the T1/T2 expected-red debt becomes fully green
instead of being renamed or hidden.

## In scope

- Expand each Design deletion row in the handoff with old source anchor, current conflict/value,
  target owner/interface, normal replacement proof, failure/recovery proof, applicable visual proof,
  deletion change and post-delete proof. The handoff is implementation evidence, not a permanent
  second ledger.
- Delete the donor Provider registry/static union/provider-first runtime routes, Provider Session
  directory/runtime event journal, accepted turn queue/steer/retry/interrupt authority, donor Pi
  gateway wrapper and model/provider static authority from Product Service and shared contracts.
- Delete or reduce `agentGateway` and execution parts of `externalMcp` so Engine invocation and
  Package/Extension lifecycle exist only in Native Host. Keep only concrete Product/Desktop system
  capabilities with scoped commands, permission/receipt semantics and real consumers; do not leave
  a general execution bus.
- Delete donor mixed migrations and runtime schema readers/writers. The fresh Product Store remains;
  Engine lineage stays opaque and no donor importer or compatibility schema survives.
- Delete React raw orchestration/provider reducers, generic payload renderer, renderer turn
  dispatcher/accepted queue and any hidden donor execution route after typed Product behavior and
  visual proof are current.
- Remove Product Service/Web/Desktop dependencies on Pi SDK/runtime/executable ecosystem from
  source imports, package manifests, lock graph and built artifact. Only `apps/native-host` may own
  these dependencies.
- Remove temporary translator, alias, wrapper, alternate Host/transport, feature-flagged old route,
  donor protocol/storage/env/update namespace and any residual buildable donor mirror.
- Preserve and, where needed, relocate mature HTTP/WS admission/backpressure/resnapshot, static and
  attachment safety, Workspace containment, Git/checkpoint, PTY, attachments, automation scheduler,
  diagnostics and Desktop update/recovery mechanisms. Preserve tested behavior, not donor aggregate
  names or Engine authority.
- Re-run the relevant normal/failure/recovery and visual checks after each domain deletion. A source
  location is not removed merely because its route is disabled; a value mechanism is not retained
  merely because its current directory is convenient.
- Update the existing root source-adoption record only if needed to describe the actual final
  material change class or current path disposition. Do not create a second registry or claim an
  adapted root is exact.

## Out of scope

- Changing the approved Product objects, Host topology, Agent/Chat IA or Pi native semantics.
- Deleting mature non-Engine workbench/system mechanisms because they are hard to disentangle.
- Retaining old authority for rollback, data migration or hypothetical external compatibility;
  rollback is Git and there are no old users.
- Completing Package marketplace, Remote, external Engine, Windows/Linux release or unrelated
  Workbench activation.

## Allowed repository paths

Only the superseded domains, their concrete retained mechanisms and direct dependency/check files
may change:

```text
apps/service/src/orchestration/**
apps/service/src/provider/**
apps/service/src/agentGateway/**
apps/service/src/externalMcp/**
apps/service/src/persistence/Migrations/**
apps/service/src/persistence/**                 (remove donor schema composition only)
apps/service/src/serverLayers.ts
apps/service/src/index.ts
apps/service/src/wsRpc.ts
apps/service/src/http.ts                       (preserved transport regression only)
apps/service/src/workspace/**                  (authority decoupling only)
apps/service/src/checkpointing/**              (authority decoupling only)
apps/service/src/terminal/**                   (authority decoupling only)
apps/service/src/attachments/**                (authority decoupling only)
apps/service/src/automation/**                 (dispatch seam only)
apps/service/package.json
apps/web/src/routes/__root.tsx
apps/web/src/components/ChatView.tsx
apps/web/src/components/chat/**                (raw/generic execution presentation only)
apps/web/src/components/PluginLibrary.tsx      (obsolete provider execution/discovery path only)
apps/web/src/wsNativeApi.ts
apps/web/src/store/**                          (raw donor reducer deletion only)
apps/web/package.json
packages/contracts/src/orchestration.ts
packages/contracts/src/provider*.ts
packages/contracts/src/ipc.ts
packages/contracts/src/index.ts
packages/contracts/package.json
packages/shared/**                             (donor Thread/Provider/identity helpers only)
apps/desktop/src/main.ts                       (old monolithic backend/alternate path deletion only)
apps/desktop/src/preload.ts                    (obsolete bridge deletion only)
apps/desktop/package.json
package.json
bun.lock
turbo.json
scripts/**                                     (dependency/source/identity/second-path checks only)
test/quality.test.mjs                          (final negative fixtures only)
README.md                                      (existing source-adoptions machine block only, if required)
LICENSES/**                                    (actual final notice corrections only)
```

Colocated characterization/regression tests for the listed domains may change. The handoff may be
written only to
[`handoffs/retire-competing-execution-authority.md`](../handoffs/retire-competing-execution-authority.md).
If a valuable mechanism must move to a new concrete Service domain, the reviewer must accept that
target path and responsibility before deletion; no `common`, `utils`, `manager` or generic broker
container may be introduced.

## Done conditions

- Every mandatory Design deletion row has current replacement and post-delete proof. No row is
  satisfied by rename, disabled feature flag, dead import, hidden route or unreachable-but-buildable
  source alone.
- Product Service contains admission/outbox/Product projection and scoped system capabilities but
  no accepted-operation queue, native retry/steer/interrupt, Provider Session directory, runtime
  journal, static Provider/model authority or Package private-state loader.
- Native Host remains the only Pi SDK/runtime/Package executable dependency in source, package
  manifests, lock graph and built artifact. Web, Main, preload and Service scans are zero with no
  expected-red exception.
- Source/runtime scans find no donor Provider registry, Pi gateway wrapper, raw React reducer,
  generic payload renderer, compatibility translator, alternate Host/transport, donor mirror or
  unrelated donor identity.
- Product persistence reads/writes only the fresh Product schema and opaque EngineBinding; donor
  migrations and runtime schema are absent from the production graph.
- HTTP/WS projection repair, Workspace/file safety, Git/checkpoint, PTY, attachment, automation and
  Desktop recovery behavior still passes its characterization and fault checks after old authority
  leaves.
- User-visible deletions have target mapping, normal/failure/re-entry proof and current human visual
  approval. Protected Package/Skill discovery and other unconnected mature domains remain truthful,
  reachable or explicitly re-enterable rather than dead.
- The existing source-adoption disclosure and legal notices match the final adapted paths and actual
  redistributed closure; there is no declared missing exact root or parallel manifest.
- The handoff records exact deletion commits, post-delete commands/results and residual out-of-scope
  capabilities without claiming full V1 or Campaign verification.

## Falsifiers and stop conditions

- Stop deletion if queryable Pi acceptance or any normal/failure/recovery replacement proof from the
  prior Work is missing, stale or no longer matches the current source.
- Stop if removing an Engine domain also removes a mature Product/system behavior without a concrete
  owner and regression proof. Move the mechanism first; do not keep the mixed aggregate wholesale.
- Stop if Host-external Pi dependency cannot be removed from source, lock or artifact without moving
  Pi code into Main/renderer or introducing a second transport.
- Stop if a user-visible anchor lacks the required visual calibration or truthful unavailable/
  re-entry replacement.

## Focused verification

For each domain, run its pre-delete characterization, delete/relocate it, then repeat the same
normal/failure/recovery checks plus targeted negative scans. The focused matrix includes:

```text
no accepted-operation writer in Product Service
no Provider registry/runtime route/static catalog
no donor Session/runtime journal/migration access
no general execution bus or Package private-state loader outside Host
no raw/generic Engine payload in Product/React
no renderer dispatcher or accepted queue
no second Host/transport/translator/alias
no Pi executable dependency outside apps/native-host
no buildable vendor mirror or unrelated donor identity
preserved WS/workspace/Git/PTY/attachment/automation/Desktop failure behavior
```

Run affected builds/typechecks/tests and `git diff --check --` over allowed paths after each coherent
deletion group. Use source, lock and built-artifact scans; package-manifest greenness alone is not
sufficient.

## Checkpoint verification

At T4 exit, rerun the real Pi Chat and folder-backed Agent journey plus the complete process/
dispatch/uncertainty fault matrix after all deletions. Then run Host-external dependency,
second-path, source, identity, structure, generated and artifact scans with no exception set.
Independent review compares every deletion row to the accepted Pi replacement handoff and challenges
both over-deletion and hidden retained authority.

## Expected handoff

The handoff contains the expanded deletion table, exact changed/deleted paths, preserved mechanism
locations, pre/post behavior and fault results, source/lock/artifact dependency scans, identity/
second-path negatives, current legal/source disclosure and any visual approval reference. It states
that T4 implementation is ready for candidate freezing but no Campaign claim is self-verified.

## Ordering and review

This Work starts only after the real Pi replacement handoff and its independent review establish
normal, failure, recovery and A-02 acceptance truth. Deletion proceeds by coherent domain, not one
large unreviewable purge. A separate reviewer must accept the final production graph before the
frozen-candidate Work begins.
