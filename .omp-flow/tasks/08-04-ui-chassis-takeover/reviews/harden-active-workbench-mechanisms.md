---
type: "Implementation Review"
title: "Review: Harden active Workbench mechanisms"
work: "../work/harden-active-workbench-mechanisms.md"
handoff: "../handoffs/harden-active-workbench-mechanisms.md"
verdict: "PASS"
revision: "review-harden-active-workbench-mechanisms-20260805-r2"
actor_id: "active_workbench_mechanisms_reviewer_r2"
dispatch_receipt: "08e05ad3b1d34b51930ee123244d43f7"
predecessor_receipt: "bfa41e76c98e4a4da2f0766db6f3a56f"
predecessor_output: "../handoffs/harden-active-workbench-mechanisms.md"
reviewed_revision: "handoff-harden-active-workbench-mechanisms-20260805-r2"
---

# Review: Harden active Workbench mechanisms

## Findings

No material findings.

The r1 findings are closed. The root selective-intake record now lists individual target files
rather than three directory-wide claims; the current Electron proof mounts the production
`BrowserPanel`, adopts its renderer-owned guest through the typed Desktop browser boundary, observes
the real guest overlay, and records the renderer bounds delivered to `DesktopBrowserManager`; and
the handoff explicitly discloses both the retained-Conversation integration and the native-boundary
repair as bounded allowlist exceptions.

## Verdict

`PASS`.

The reviewed r2 repair satisfies the previously blocking provenance, native-boundary-proof and
handoff-disclosure conditions without restoring donor execution authority or a generic command bus.
The attach-ready repair is bounded and independently green, and the current Product Composer keeps
donor plan mode historical rather than exposing or persisting it. No implementation repair was
applied by the reviewer.

## Focused recheck

### Exact selective-intake and retained-boundary disclosure

- `README.md` identifies source revision
  `be6dcad3f63fa121fbe3180f257ba1ff128696c4`, exact upstream source files, and individual OmniMind
  target files. The former `components/chat`, `components/terminal`, and `lib` directory-wide target
  claims are absent.
- The target list includes the actual direct consumers outside the literal Work allowlist:
  `ProductRuntimePicker.tsx`, `ProductChatJourney.browser.tsx`, `_chat.tsx`, and
  `useRetainedConversationBoundary.ts`. The handoff names each dependency and proof rather than
  implying adjacent scope.
- The native annotation protocol/coordinator/manager changes and source-neutral Electron fixture are
  separately disclosed as a proof-driven boundary repair, not misrepresented as upstream source
  bytes. The retained MIT notice includes both applicable copyright lines.

### Real Electron guest/native proof

The Electron test no longer imports the retired MCP/AgentGateway harness. Its main-process fixture
uses the production `DesktopBrowserManager` and `registerBrowserIpcHandlers`; its renderer fixture
mounts the production `BrowserPanel`; its preload exposes the typed browser API; and the actual
renderer-owned `<webview>` receives the hardened annotation preload. The passing journey observes:

- an opaque computed guest annotation surface;
- real pointer/keyboard annotation commit, redaction, invalid/stale/collapsed target recovery,
  navigation recovery, marker reprojection and cancellation behavior;
- the exact bounds published by `BrowserPanel` through Desktop IPC at zoom factors `0.8`, `1.25`
  and `1`, compared with the live CSS viewport after CSS-to-DIP conversion.

This crosses the boundary that the r1 helper-level tests could not prove.

### Attach-ready correctness, admission and cleanup

- `request-ready` is a versioned, one-way discriminated command with no arbitrary payload,
  document token, execution target or reply channel. The guest parser rejects the wrong protocol
  version and retains the existing bounded parsers for every stateful command.
- `DesktopBrowserManager.attachWebview` first proves the guest type, exact host window, browser
  partition and active logical tab, installs the renderer-owned runtime, and only then asks the
  coordinator to request readiness. The coordinator re-resolves the exact
  `threadId + tabId + webContentsId` tuple and refuses missing, mismatched or destroyed runtimes.
- Guest messages back to Main remain admitted only from the sender's main frame. A `ready` message is
  accepted only for the attached renderer runtime and only when the sender URL matches its sanitized
  source URL.
- The guest initializes once. A readiness request before initialization relies on the same
  initialization path's single announcement; a request after initialization emits one fresh
  announcement. Repeated requests do not install a second overlay/listener set.
- Runtime detach/destroy/replacement removes the document affinity and active session for that exact
  web contents. Stale detach remains guarded by `webContentsId`, so it cannot erase a replacement
  runtime. The focused manager test reproduces ready-before-attach, proves annotation admission is
  initially rejected, then proves the post-attach request repairs it.

### Product Composer plan-mode boundary

The real Product `ChatView` route fixes `interactionMode` to `default`, clears any restored donor-era
draft value, refuses interaction-mode handlers and Shift+Tab toggling, and supplies an empty Product
app-command inventory so `/plan` and `/default` are absent. Product Queue contracts persist only
typed requested selection/resources and contain no interaction-mode field; the Queue presentation
uses `default` only as a non-authoritative compatibility view value.

The focused real-route browser test seeds persisted `plan`, mounts the current Product `ChatView`,
waits until the store value is cleared, exercises Shift+Tab, and observes both that no Plan control
exists and that `plan` is not restored. The focused command-inventory test independently proves that
the Product closed-world surface returns no app slash commands.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| reviewer operation `08e05ad3b1d34b51930ee123244d43f7`, predecessor operation `bfa41e76c98e4a4da2f0766db6f3a56f`, Work and handoff linkage | PASS; completed predecessor, exact promised output, mutual Work/handoff link, receipt match, and different implementer/reviewer actors |
| current diff and r2 production/proof files for the three r1 findings plus attach-ready and Product plan-mode boundaries | INSPECTED; scope and current owners match the Work and r2 handoff |
| `bunx vitest run src/browserManager.test.ts src/browserAnnotations/coordinator.test.ts src/browserAnnotations/protocol.test.ts` in `apps/desktop` | PASS, exit 0; 3 files / 28 tests |
| `bunx playwright test --config playwright.electron.config.ts e2e/browserAnnotations.e2e.ts` in `apps/web` | PASS, exit 0; 1/1 real Electron journey |
| `bunx vitest run --config vitest.browser.performance.config.ts src/components/ProductRoutePerformance.browser.tsx -t 'keeps donor interaction modes historical'` in `apps/web` | PASS, exit 0; 1 passed / 1 skipped; real Product route clears seeded plan mode and exposes no Plan control |
| `bunx vitest run src/hooks/useComposerCommandMenuItems.test.ts -t 'does not manufacture app commands'` in `apps/web` | PASS, exit 0; 1 passed / 7 skipped; Product closed-world inventory contains no app slash command |
| `bun run typecheck` in `apps/web` | PASS, exit 0 |
| `bun run typecheck` in `apps/desktop` | PASS, exit 0 |
| `bun run check:sources` | PASS, exit 0; 1 adopted source; exact-file disclosure was also inspected because this checker alone does not prove target precision |
| `bun run licenses:check` | PASS, exit 0; deterministic legal metadata for 230 components |
| scoped retired MCP/AgentGateway/BrowserUsePipeServer scan over the r2 browser/native proof and Product model-picker paths | PASS; zero hits |
| `git diff --check` | PASS; no output |
| post-test `apps/web/.playwright` and `apps/web/test-results` inspection | PASS; only this review run's empty/output-marker artifacts were created, then removed; no baseline or screenshot was retained |

The predecessor r1 review already independently covered the broader mechanism, route,
accessibility and performance matrices. This repair review intentionally did not reopen those
accepted green areas or the architecture/QbD rounds. The known pre-existing subagent-mention failure,
historical tail-anchor timing observation and repository-wide identity debt remain classified as in
r1; none is converted into evidence for or against this bounded r2 repair.

## Review boundary and dispatch identity

Reviewer operation `08e05ad3b1d34b51930ee123244d43f7` resolves completed implementer operation
`bfa41e76c98e4a4da2f0766db6f3a56f`, whose exact output is
`../handoffs/harden-active-workbench-mechanisms.md`. That handoff identifies
`../work/harden-active-workbench-mechanisms.md`, carries the predecessor receipt, and is revision
`handoff-harden-active-workbench-mechanisms-20260805-r2`. Implementer actor
`active_workbench_mechanisms_implementer_r2` differs from reviewer actor
`active_workbench_mechanisms_reviewer_r2`.

- actorId: `active_workbench_mechanisms_reviewer_r2`
- receipt: `08e05ad3b1d34b51930ee123244d43f7`
- predecessor receipt: `bfa41e76c98e4a4da2f0766db6f3a56f`
- predecessor output: `../handoffs/harden-active-workbench-mechanisms.md`
- explicitly allowed fix: none

The reviewer did not edit production code, the handoff, runtime/session records or an Evidence
ledger, and did not stage, commit, push or merge. This Review Concept is the only repository output.
