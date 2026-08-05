---
type: "Implementation Review"
title: "Final review: Establish the Product and system command surface"
work: "../work/establish-product-system-command-surface.md"
handoff: "../handoffs/establish-product-system-command-surface.md"
verdict: "PASS"
revision: "review-establish-product-system-command-surface-20260805-r3"
actor_id: "product_system_command_surface_reviewer_r3"
dispatch_receipt: "f14ab9803b334bab8fdc4bd702ce47ad"
predecessor_receipt: "1cb59479cc5b4efe9f9fe13888d11526"
predecessor_output: "../handoffs/establish-product-system-command-surface.md"
reviewed_failure_receipt: "13432f53ad0c4a4c89de6546f3862cc9"
---

# Final review: Establish the Product and system command surface

## Findings

No blocking or non-blocking finding within this bounded final re-review.

## Verdict

`PASS`。The r2 review's sole remaining P1 is closed. Both Kanban Product Queue send entries and the New Task
execution picker/status now consume current `ProductRuntimeCatalog` plus an explicit Product selection. Legacy Provider
status/discovery/default facts cannot select, advertise, enable or block a Kanban execution target. Catalog/model/auth/
thinking failure remains truthful, preserves the draft and does not admit execution. Donor Provider status retained for
Codex voice transcription is isolated from the execution path.

This verdict accepts the bounded Work candidate. It does not declare authority retirement, the T4 candidate, release gates
or the OmniMind Campaign complete.

## Sole P1 resolution

### Host-only exact selection and presentation

`kanbanRuntimeSelection` accepts only an already-explicit `provider: "pi"` draft envelope whose `model` exactly names a
catalog entry satisfying `id === provider + "/" + modelId`. It supplies no first-model, settings or donor fallback and
requires `available`, `auth === "configured"` and a catalog-declared thinking level
(`apps/web/src/components/kanban/kanbanRuntimeSelection.ts:15-80`).

`KanbanRuntimePicker` renders only sanitized catalog models, disables malformed/unavailable/unauthenticated entries, keeps a
historical missing selection visibly unavailable, and emits the exact catalog model plus thinking level
(`apps/web/src/components/kanban/KanbanRuntimePicker.tsx:22-129`). The scratch draft fixes its temporary envelope to
`provider: "pi"`, stores the full Host model id, preserves only an explicit sticky Product choice, and no longer synthesizes
a donor/default model (`apps/web/src/components/kanban/useKanbanTaskScratchDraft.ts:35-86`). The shared Pi draft contract
also retains the Host-observed `max` thinking level (`packages/contracts/src/model.ts:20-29`;
`apps/web/src/composerDraftModels.ts:382-392`).

### Both real send gates

Board drag resolves the card's explicit draft/thread/project Product selection against the current Product store runtime
catalog before invoking dispatch (`apps/web/src/components/kanban/useKanbanDraftDispatchAdmission.ts:13-31`;
`apps/web/src/components/kanban/KanbanProjectBoardView.tsx:71-102`). New Task derives `canCreate` and send-now admission from
the same catalog resolver; missing catalog/model/auth/thinking keeps the dialog/draft in place and never calls
`createAndSendKanbanTask` (`apps/web/src/components/kanban/useKanbanTaskSubmit.ts:47-112`). Send-as-draft may preserve an
existing explicit Product selection but does not manufacture one.

The shared dispatch path fetches a current shell snapshot and repeats exact model/auth availability before Queue put; the
requested selection carries the exact Host runtime id and original thinking level
(`apps/web/src/lib/kanbanDispatch.ts:414-449`). Product admission independently validates current catalog engine/package,
model, auth and thinking before creating a Run/outbox, so a changed thinking catalog fails before execution admission while
the Queue item remains editable (`apps/service/src/product/ProductControlPlane.ts:941-1006,3007-3063`).

### Legacy isolation

The two execution entry paths contain zero references to Provider status refresh, Provider model discovery, donor model
picker or donor traits picker. `KanbanNewTaskDialog` still reads Codex Provider status only for
`useComposerVoiceController.activeProviderStatus` and `refreshVoiceStatus`; it does not feed model selection, default,
`canCreate` or `handleCreate` (`apps/web/src/components/kanban/KanbanNewTaskDialog.tsx:119-120,169-175,274-286`). Retained
slash/skill/plugin discovery has empty `searchableModelOptions` and `dynamicAgents` and cannot alter execution selection or
admission (`apps/web/src/components/kanban/useKanbanTaskComposerDiscovery.ts:174-198`).

## Prior closure continuity

The previous receipt-truth closure remains present: `product_submit_admissions` is created, atomically populated with
Run/receipt/outbox admission, and byte-exact retry is checked before dispatch
(`apps/service/src/product/ProductControlPlane.ts:298-301,3117-3119,3399-3428`). Kanban still creates an In Progress overlay
only after identity-exact `accepted/running`, while pending/delivery-unknown preserves the draft.

The Workspace deadline closure also remains present: read-only inspection owns the pre-admission deadline, and admitted
`mkdir` plus postconditions run uninterruptibly instead of returning a false timeout
(`apps/service/src/workspace/Layers/WorkspacePaths.ts:68-137`). Per dispatch, these prior closures were confirmed by source
continuity only; their already-passing Service suites and route/performance gate were not rerun in this final sole-P1 review.

## Predecessor and review boundary

Reviewer operation `f14ab9803b334bab8fdc4bd702ce47ad` resolves completed implementation predecessor
`1cb59479cc5b4efe9f9fe13888d11526`. Both point to
`work/establish-product-system-command-surface.md`; predecessor output is the linked r5 handoff, which links the same Work
and prior failed r2 Review. Implementer actor `product_system_command_surface_implementer_r4` differs from reviewer actor
`product_system_command_surface_reviewer_r3`.

This review inspected only the sole remaining P1 and confirmed the two earlier closures by source continuity. It did not
open new audit scope, rerun route/performance, reopen QbD, or inspect unrelated dirty-tree work. Reviewer made no product
repair and did not modify runtime/session records, Work, handoff, architecture, Campaign or Evidence.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| reviewer/predecessor operation JSON, r5 handoff and same Work linkage | PASS; completed predecessor, exact output, back-link and actor separation |
| `bun run --cwd apps/web test -- src/components/kanban/kanbanRuntimeSelection.test.ts src/lib/kanbanDispatch.test.ts src/components/kanban/KanbanNewTaskDialog.logic.test.ts src/composerDraftStore.test.ts` | PASS; 4 files / 52 tests |
| `bun run --cwd apps/web test:browser -- src/components/kanban/KanbanRuntimePicker.browser.tsx src/components/kanban/KanbanDispatchAdmission.browser.tsx src/components/kanban/useKanbanTaskSubmit.browser.tsx` | PASS; 3 files / 7 tests |
| `bun run --cwd packages/shared test -- src/model.test.ts` | PASS; 1 file / 88 tests |
| contracts, shared and Web package typechecks | PASS; all exit 0; contracts emitted the two existing Effect JSON advisories |
| execution-entry scan over `KanbanProjectBoardView.tsx`, `useKanbanDraftDispatchAdmission.ts`, `useKanbanTaskSubmit.ts` for legacy Provider status/discovery/pickers | PASS; zero matches |
| Dialog Provider-status source inspection | PASS; every match terminates at Codex voice status/refresh and none reaches execution selection/default/admission |
| composer discovery scan for model options/static provider options/searchable models/runtime agents | PASS; zero authority sources; encoded `searchableModelOptions` and `dynamicAgents` are both empty |
| receipt/deadline implementation continuity inspection | PASS; durable admission identity/no-replay and pre-admission deadline/postcondition regions remain intact |
| `find apps/web/.vitest-attachments -type f` plus scoped Kanban image scan | PASS; zero generated artifacts |
| `git diff --check` | PASS; no output |

No live provider/API probe was run. This bounded issue concerned the Web authority graph before execution, and current source
plus the real browser disagreement cases are sufficient to prove the cut. No result above is generalized to the unrun
repository-wide suite or later Work.

## Dispatch identity

- actorId: `product_system_command_surface_reviewer_r3`
- receipt: `f14ab9803b334bab8fdc4bd702ce47ad`
- predecessor receipt: `1cb59479cc5b4efe9f9fe13888d11526`
- predecessor output: `../handoffs/establish-product-system-command-surface.md`
- reviewed failure receipt: `13432f53ad0c4a4c89de6546f3862cc9`
