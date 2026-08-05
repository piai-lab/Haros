---
type: "Implementation Review"
title: "Review: candidate test, authority and exact-source closure"
work: "../work/transplant-runnable-source-closure.md"
handoff: "../handoffs/transplant-runnable-source-closure.md"
verdict: "PASS"
actor_id: "root_test_candidate_closure_reviewer_r1"
dispatch_receipt: "1cec56fb8b5046c3ac758efa65ef7593"
predecessor_receipt: "381c26df65184dc1a862875cb475e18c"
---

# Review: candidate test, authority and exact-source closure

## Verdict

`PASS`. No material finding remains in the complete bounded candidate diff described by r7. The
repository-level test correction is real, retired execution authority was not restored, the
isolated Native Host provenance and accepted legal bytes are truthful, and the exact source map
closes against the current working tree.

Implementation operation `381c26df65184dc1a862875cb475e18c` is completed and resolves to the
linked r7 handoff. It was authored by `root_test_candidate_closure_implementer_r1`, which differs
from reviewer `root_test_candidate_closure_reviewer_r1`. Review operation
`1cec56fb8b5046c3ac758efa65ef7593` uses the completed implementation receipt as its predecessor and
this file as its sole semantic output.

This verdict accepts only the uncommitted source/test/authority closure based on committed source
`a29e2e5c1b3c967b80ceffe5357bc88d2b2cdb5d`. It does not freeze a production SHA, accept an
artifact, promote a Campaign claim, or declare the first Pi-native vertical slice or OmniMind V1
complete. Freeze must still start from the later exact clean commit and rerun its own gates without
inheriting this review as artifact evidence.

## Findings

None.

## Reviewed boundary

The reviewer inspected the actual current working diff rather than relying on the handoff's file
list. The accepted candidate contains these bounded groups:

1. Node-unit-only Web storage setup and its formerly failing persisted-store suites;
2. current assertions for retired `/fast`, Void/space, detail-prewarm, donor runtime mode,
   Provider-agent mention and source-marker behavior;
3. parenthesized mention display parsing, Product submission health source proof, runtime
   provenance, accepted MIT public bytes and React Compiler dependencies;
4. zero-consumer `ThreadDiagnosticsQuery` deletion, current WebSocket capabilities, stale MCP and
   Provider-log expectation deletion, and a narrow Windows Store process-boundary test seam;
5. locked identity wording in the active Work, r7 handoff truth and the exact source-disposition
   rebaseline.

The existing root `AGENTS.md` change, 08-03 audit change, untracked `.omp-flow` tooling/wiki files,
old freeze handoff and 08-03 integration handoff/review are observable in the shared working tree
but are not part of this candidate or this verdict. They were not edited, staged or used as proof.

## Correctness and authority review

### Deterministic Node unit storage

- `apps/web/vitest.config.ts` merges the real Web Vite config and adds only a Vitest setup file.
  Browser suites continue to use their explicit browser configs, so the Node double is not loaded
  into real Playwright execution or production builds.
- `setupNodeStorage.ts` installs a complete `Storage` implementation before store imports. It does
  not change any production store, persisted shape, browser fallback or filesystem state. Vitest
  executes setup per test file, so each file receives a new in-memory map rather than sharing one
  hidden repository-wide persistence instance.
- The formerly failing pinned-project, pinned-thread, split-view and workflow suites execute their
  real Zustand persistence paths. Their assertions were not replaced with mocks of the stores.

### Retired behavior and Product truth

- `/fast` is now proved absent; no command implementation or alias was restored.
- Location/Global and scheduled Product `requestedSelection.permissionPolicy` assertions match the
  current product types. The automation proof starts from `full-access` and confirms the scheduled
  draft is forced to `approval-required`, so the change is not a weaker null assertion.
- The removed detail-prewarm callback is absent from the current controller input. Existing split
  focus, selection and navigation assertions remain.
- Product health proof scopes itself between the real `sendProductConversation` and `onSend`
  functions, proves durable Queue ownership precedes the dispatch-health gate, and proves the
  queue-only branch mints no Product Entry, Run, Dispatch or OperationReceipt identity.
- Unquoted mention grammar now agrees with the existing formatter contract: paths containing
  parentheses require quoted mention form. Consequently retired `@spark(...)` syntax remains
  literal text rather than becoming a false path chip, while ordinary, quoted, thread, file and
  Skill mention tests remain green.

### Native Host provenance, legal bytes and compiler coverage

- The provenance test reads `apps/native-host/package.json`; the three executable Pi packages are
  exact direct `0.81.1` dependencies there and absent from Desktop, Service and Web manifests.
  A production-source scan also found no Pi SDK import outside Native Host.
- Settings copy accurately states the implemented supervised isolated Native Host and explicitly
  limits process isolation to a fault boundary rather than a filesystem/network sandbox.
- `apps/web/public/licenses/ui-mother-MIT.txt` is byte-identical to
  `LICENSES/ui-mother-MIT.txt`; both have SHA-256
  `305724dd050ca7ded99c662de813d755bc4ec3887c4543a37159c6662ca36d1b`.
- The compiler guard replaces deleted `TraitsPicker` with current `ProductRuntimePicker` and removes
  only the deleted slash-command hook. The allowlist remains empty. The two changed `ChatView`
  callbacks now include the stable `setProductRequestedSelection` dependency and compile with zero
  unexpected bailout.

### Service cleanup and Windows Store seam

- Repository-wide production scans found no `ThreadDiagnosticsQuery`,
  `projection_thread_activities` or `operational_diagnostics` consumer/table/migration. Deleting its
  Service, Layer and isolated test therefore removes an unreachable buildable bus rather than a
  current Product capability.
- The Service CLI has no MCP subcommand and creates no Provider-log directory. Removing those two
  stale assertions does not remove the still-green private state, server log and terminal log
  permission coverage.
- WebSocket bootstrap asserts exact `WS_SERVER_CAPABILITIES`; current Product cursor-safe facts,
  Conversation snapshot and typed error capabilities remain, while orchestration capabilities are
  not advertised.
- `WindowsStorePackageLookupExecutor` is the exact synchronous PowerShell lookup boundary. Its
  default remains `execFileSync`, the production timeout remains 1.5 seconds, and injected executors
  bypass the production AppX lookup cache. Both editor-list and icon tests still execute the real
  family-name/script construction, stdout parsing, installation lookup, icon candidate scoring,
  cache materialization and final byte comparison. No Windows timeout or product capability was
  weakened to make the suite pass.
- Source scans found no Service `AgentGateway`, orphan `BrowserAutomationHostLive`, Pi adapter,
  Provider registry/process or advertised orchestration capability. Historical presentation types,
  Desktop-owned browser mechanisms and security redaction patterns were not misclassified as live
  execution authority.

### Locked identity wording

The active Work now matches `architecture/workbench.md`: the existing OmniMind Agent light/dark icon
is the locked first-party identity, its bytes and generation chain remain unchanged, its colors do
not become semantic product tokens, and no later Agent/Chat Work implicitly owns a replacement.
The rejected bar-chart/vermilion/Orchestrated-O directions remain excluded. This documentation
correction does not alter any asset or palette byte.

## Independent exact-source reconstruction

The reviewer rebuilt the map without importing or trusting the changed expected counts or digest:

1. enumerated `6,425` paths directly from immutable tree
   `630f17e61abc478114bf83c1d740977c9f68b910`;
2. parsed all fifteen origin mappings from the root README adoption record;
3. independently resolved the immutable `central-icons-reversed` and `central-icons-fill` prefixes
   into current `line` and `fill` targets;
4. independently enumerated the immutable `apps/marketing` subtree, which contains exactly the
   fourteen public-surface lineage records;
5. classified mapped targets by current worktree existence, sorted every
   `source\0target\0disposition` record and computed SHA-256.

The independently reproduced result is:

| Disposition | Count |
| --- | ---: |
| `adapted-present` | 1,496 |
| `adapted-removed` | 774 |
| `authorized-fill-glyph` | 2,035 |
| `authorized-line-glyph` | 1,979 |
| `excluded-non-product` | 127 |
| `public-surface-lineage` | 14 |
| **Total** | **6,425** |

The independent sorted-record digest is
`368f2a03465320ad28552312544b81f4ac4cbdfcc8c23c73d4f21ec1f7cb9a13`.

Relative to T1 commit `5d2158974`, exactly `754` immutable targets transition from
`adapted-present` to `adapted-removed`; there are no other transition kinds. Relative to committed
HEAD, exactly three targets transition, all and only:

- `apps/service/src/diagnostics/Layers/ThreadDiagnosticsQuery.test.ts`;
- `apps/service/src/diagnostics/Layers/ThreadDiagnosticsQuery.ts`;
- `apps/service/src/diagnostics/Services/ThreadDiagnosticsQuery.ts`.

No immutable target was retargeted, converted to an exclusion, or washed out of the public-surface
or glyph disposition classes. The checker algorithm, historical tree, README mappings, glyph
rules, public-surface population and path total are unchanged; only the exact current counts and
full-record digest changed.

## Independent verification

| Command / proof | Result |
| --- | --- |
| independent Node reconstruction from immutable T0, README and current worktree | PASS; 6,425 records, 1,496/774, exact `368f2a…9a13` digest |
| independent T1/HEAD transition comparison | PASS; 754 T1 transitions; exactly three new ThreadDiagnosticsQuery removals from HEAD; zero retarget/reclassification |
| Web focused unit command over storage, retirement, parser, health, provenance and compiler files | PASS, exit 0; 14 files, 259 tests |
| Service focused `main/open/editorAppIcons/wsCompatibility` command | PASS, exit 0; 4 files, 65 tests |
| Native Host full package unit command | PASS, exit 0; 2 files, 23 tests |
| `bun run --cwd apps/web test:browser -- src/components/settings/AdvancedSettingsPanel.browser.tsx` | PASS, exit 0; real Playwright collection/execution, 1 file, 2 tests |
| `bun run typecheck` | PASS, exit 0; Turbo 7/7 packages |
| `bun run quality` | PASS, exit 0; identity/structure, source, exact closure, 4,014 glyphs, 230-component legal metadata and 28/28 quality tests |
| `bun run test` | PASS, exit 0; Turbo 9/9 tasks; Web 262 files/3,022 tests; Service 103 passed + 1 skipped files/994 passed + 1 skipped tests; Desktop 66 passed + 1 skipped files/555 passed + 5 skipped tests |
| canonical/public MIT `cmp` plus SHA-256 | PASS; byte-identical, exact digest recorded above |
| production authority, Pi dependency and diagnostics table/reference scans | PASS; no forbidden live Service/Web authority or Host-outside Pi executable dependency found |
| candidate-scoped `git diff --check` | PASS, exit 0 |

The repository total gate verifies the current source/test candidate only. It is deliberately not
reported as a clean-SHA install, build, packaged Electron, live Provider, UI acceptance, release
artifact or Freeze proof.

No implementation, handoff, Work, runtime/session record, Evidence ledger, Campaign status or user
file was modified by this reviewer. The only authored output is this Review Concept.
