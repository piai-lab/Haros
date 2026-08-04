---
type: "Work"
title: "Take over the Agent and Chat workbench"
---

# Take over the Agent and Chat workbench

## Objective

Complete T3 by placing the approved physical UI mother over the real Product State seam with the
fixed `Agent | Chat` top-level model, one shared Conversation/Composer/Timeline/Queue/Workbench,
truthful unavailable states and measured visual, bilingual, accessibility and performance proof.

## Linked inputs

- [Complete Workbench owner](../../../../architecture/workbench.md)
- [Product State owner](../../../../architecture/product-state.md)
- [PRD R7, R11 and T3 exit criteria](../prd.md)
- [Design §6 and T3 verification](../design.md)
- [Web source-domain map and hidden couplings](../research/source-domain-audit.md)
- [QbD A-03 human visual gate](../qbd/design-audit.md)
- [Final approval, which is not visual approval](../decisions/qbd-1-approval.md)
- Accepted Product-facts and isolated-Host handoffs

## Requirement traceability

This Work owns R7 and the user-visible preservation portion of R11. It consumes R5/R6 typed facts
without redefining them and carries A-03 as an explicit human same-state calibration inside the
execution order. It supplies only the T3 UI proof; native execution authority remains a later T4
responsibility.

## In scope

- Freeze T0 same-machine performance measurements and comparable mother states before surgery,
  including shell/sidebar geometry, navigation rows, Composer/Queue/Timeline, pane/workbench layout,
  streaming/scroll and the source-neutral Glyph seam.
- Present the comparable baseline and proposed material deltas to the maintainer. Obtain explicit
  same-state visual calibration before deleting or materially altering a protected anchor. QbD 1
  approval cannot substitute for this decision.
- The maintainer accepted the real-mother calibration in the active execution session on
  2026-08-04 with `OK 确认！`. This authorizes the bounded Product UI surgery shown by that
  calibration; it does not turn the evidence-only overlay into production proof or accept any
  behavior, accessibility, performance or post-surgery visual result in advance.
- Preserve the existing first-party OmniMind Agent light/dark icon, colors and deterministic Web,
  Dock/Taskbar, favicon and splash outputs byte-for-byte. The maintainer explicitly withdrew the
  Orchestrated O exploration and removed brand replacement from this Work; no identity-review
  control or evidence-only asset surface may enter production.
- Make authored routes the sole source and deterministically regenerate the route tree. The only
  top-level product entries are `Agent | Chat`, in that order for visual placement, default route,
  keyboard traversal, accessibility names and automated tests.
- Give Agent a managed directory or Primary Folder path and Chat no Primary Folder with read-only
  references by default. `Send to Agent` is explicit; neither route silently changes cwd or creates
  a user-visible Chat directory.
- Use one shared renderer, Composer, Timeline, Queue and Workbench grammar. Engine/Model/Thinking
  choices affect only the next Run and create no confirmation, Toast, Timeline message or Handoff.
- Preserve shell/panel geometry, row grammar, pane lifecycle, virtual Timeline, stream smoothing,
  scroll anchoring, xterm sleep/reconnect and route/subscription recovery while replacing donor
  Provider/Studio/Home/Plugin top-level ontology.
- Preserve Projects above Groups for Agent and time-ordered recents for Chat, including one
  `aria-current`, stable row state, keyboard/menu drag alternatives and truthful archived/running/
  attention facts from Product read models.
- Map the protected plugin/skill discovery lineage to Settings › Packages, Settings › Agents and
  Composer use. If runtime capability is not connected, preserve normal/failure/re-entry behavior as
  truthful unavailable; do not leave a hidden dead route or an empty-success surface.
- Centralize stable `zh-CN` and `en` copy for first-run, Agent/Chat, Composer, Queue,
  unavailable/recovery and Settings boundaries. Preserve dynamic Engine/tool/process text as source
  facts.
- Verify roving focus, Home/End/Enter/disclosure, focus restore/visible, screen-reader names,
  keyboard equivalents, IME composition, mixed CJK/path truncation and reduced motion.
- Profile the defined 100k Conversation, burst stream, background update, Conversation switch,
  scroll anchor, top hover, split resize, hidden xterm and heap-recovery scenarios against budgets
  frozen before surgery.
- After surgery, renew behavior, same-state visual and performance proof. Delete an old UI anchor
  only after its target mapping, normal/failure/re-entry proof and applicable maintainer approval are
  recorded.

## Out of scope

- Adding Pi runtime behavior, simulating accepted operations or implementing a second Product store
  in React.
- Completing every Package, Git, PR, Kanban, Automations, Viewer, Diff, Terminal, Browser, child or
  Remote capability. Unconnected mature domains stay in lineage with truthful unavailable/re-entry.
- Redrawing the mother, adding a new decorative visual system, making Projects/Remote/Studio a third
  top-level world or splitting Agent and Chat into duplicate component/state stacks.
- Editing Product/Host contracts to compensate for a missing fact. A missing authoritative fact
  returns to its owning T2 Work for a reviewed change.

## Allowed repository paths

Only the Web product UI and its direct tests may change. Existing first-party brand source,
Web/Dock/Taskbar exports and their generation chain are protected unchanged inputs, not writable
outputs of this Work:

```text
apps/web/src/routes/**
apps/web/src/routeTree.gen.ts
apps/web/src/components/**
apps/web/src/hooks/**
apps/web/src/store/**                      (view projection/selectors only)
apps/web/src/storeState.ts                (view state only)
apps/web/src/storeSelectors.ts            (view selectors only)
apps/web/src/productProjectionCoordinator.tsx (typed Product view subscription only)
apps/web/src/productReadModel.ts           (T3 display-only presenter and tests)
apps/web/src/productReadModel.test.ts
apps/web/src/diffRouteSearch.ts            (authored Agent | Chat route search only)
apps/web/src/diffRouteSearch.test.ts
apps/web/src/settingsNavigation.ts         (Settings IA routing only)
apps/web/src/settingsSearchIndex.ts        (Settings IA search mapping only)
apps/web/src/productCutover.test.ts        (UI cutover guard only)
apps/web/src/theme/**
apps/web/src/styles/**
apps/web/src/i18n/**
apps/web/src/locales/**
apps/web/src/lib/icons.tsx                (functional presentation only)
apps/web/src/icons/**                     (functional presentation only)
apps/web/src/wsNativeApi.ts               (typed Product/Desktop facade call sites only)
apps/web/index.html                       (locale/a11y runtime metadata only)
apps/web/vite.config.ts                   (route generation/performance build only)
apps/web/package.json                     (UI test/profile scripts and concrete dependencies only)
```

Focused/e2e/profile tests colocated in `apps/web` may change. Task-local visual/performance evidence
is referenced from, not duplicated outside,
[`handoffs/take-over-agent-chat-workbench.md`](../handoffs/take-over-agent-chat-workbench.md).
No Service, Desktop code/runtime, Host or shared-contract production path belongs to this Work.
Existing brand source and platform exports are protected by the current identity guard and must
remain byte-identical; no process topology, supervision, IPC, release authority or executable
behavior change is permitted.

## Done conditions

- `Agent | Chat` is the only top-level route/navigation world, in the required order across visual,
  default, keyboard, screen-reader and test surfaces.
- Agent and Chat consume the same Product Conversation renderer, Composer, Timeline, Queue and
  Workbench; their only stable difference is workspace/write authority. No second store or duplicate
  component family exists.
- Next-Run Engine/Model/Thinking selection preserves draft, attachments and Queue and produces no
  confirmation, Toast, Timeline or Handoff noise.
- Protected mother domains retain source lineage, target owner and real normal/failure/re-entry
  behavior. Unconnected domains never show fake ready, fake data or empty success.
- The protected plugin/skill source anchors have traceable target mappings and are not deleted on the
  strength of labels or permanently unavailable surfaces alone.
- `zh-CN` and `en` critical journeys are complete; IME does not send early; CJK/Latin/path layout,
  keyboard, screen reader, contrast, focus-visible and reduced motion checks pass.
- The measured performance report records hardware, build mode, fixtures, method, absolute numbers
  and T0/target comparison. DOM growth, root/sidebar render frequency and post-GC heap remain within
  budgets frozen before surgery.
- Comparable same-state visual review after surgery has no unresolved material finding and the
  maintainer's visual calibration is linked. Source-domain deletions postdate that approval.
- The existing first-party icon source, colors, generation chain and Web/Dock/Taskbar outputs remain
  byte-identical, and no evidence-only identity-review surface enters production.
- The handoff maps every changed/deleted source anchor to target behavior and proof without claiming
  UI completion beyond this slice.

## Falsifiers and stop conditions

- Stop if the Product read model cannot support Agent/Chat without raw Engine payload or a
  renderer-local competing truth. Return to the Product facts Work.
- Stop before deletion if the maintainer does not accept material geometry/taste drift or if the
  calibrated mother cannot be recovered with bounded surgery.
- Stop if preserving a mature domain requires a fake control/state; keep it unavailable and expose a
  re-entry path instead.
- Stop if typed projection under the approved geometry cannot meet the predeclared performance
  budgets. Diagnose the subscription/render boundary before changing the visual contract.

## Focused verification

Run targeted route/store/component/e2e/profile checks for:

```text
Agent then Chat route, keyboard and accessibility order
shared Composer/Timeline/Queue/Workbench identity
next-Run choice without feedback noise or input loss
Agent folder versus Chat read-only/no-folder behavior
Queue edit/reorder/delete and pane recovery
plugin/skill unavailable/failure/re-entry mapping
zh-CN/en, CJK/IME, focus and reduced motion
100k Conversation, burst stream, scroll/resize/hover and heap recovery
```

Run affected Web typecheck/build and `git diff --check --` over allowed paths. Visual checks use the
same viewport, state, theme and font environment; screenshots alone do not replace behavior or
accessibility proof.

## Checkpoint verification

At T3, run the real route/store journey against the T2 Product Service and real Pi-free Host
unsupported state. Verify Conversation creation, Queue editing, next-Run selection, unavailable
re-entry and per-Conversation pane recovery for both entries. Run the bilingual/a11y/IME and frozen
performance suite, then obtain same-state human visual acceptance. Independent review attempts to
find duplicate UI/state paths, fake unavailable surfaces, hidden protected anchors and material
drift.

## Expected handoff

The handoff includes route and component ownership maps, protected-domain dispositions, before/after
same-state evidence, maintainer calibration reference, locale/a11y/IME results, exact performance
budgets and measurements, focused commands/results and every truthful unavailable domain reserved
for later work. It states that T3 does not prove native execution authority or full UI/V1 completion.

## Ordering and review

This Work begins only after the complete T2 Product/Host checkpoint is independently accepted. The
human visual calibration is a required execution pause, not another QbD round. One UI implementer
owns the coherent surgery; an independent reviewer verifies Product truth, mother preservation and
measured interaction quality before T4 begins.
