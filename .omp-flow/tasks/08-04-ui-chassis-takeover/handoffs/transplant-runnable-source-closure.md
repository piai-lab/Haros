---
type: "Implementation Handoff"
title: "Authorized runnable source closure — mandatory agent route correction"
work: "../work/transplant-runnable-source-closure.md"
status: "DONE"
revision: "handoff-transplant-runnable-source-closure-20260805-r8"
actor_id: "agent_route_contract_implementer_r1"
dispatch_receipt: "843bd10a25e4467f9caadd2fbb5455b4"
predecessor_receipt: "1cec56fb8b5046c3ac758efa65ef7593"
predecessor_review: "../reviews/transplant-runnable-source-closure.md"
---

# Authorized runnable source closure

## Current outcome

Committed source `3c2d226c44530ef883964aaf81b849925cab59e9` closed the repository-level test, provenance,
legal-copy and source-disposition gaps described below, but a clean detached Freeze r3 found one document-owner
falsifier before browser/live/artifact verification: its tracked `AGENTS.md` omitted the validator-required route to
`research/source-update-intake.md`.

This bounded correction integrates only the two-line maintainer-authored adopted-source intake route. The other
observable root `AGENTS.md` edits about live-provider resources and secret-handling remain protected user-owned
working-tree changes: they are not staged, reviewed or claimed by this operation. Product source, runtime, state,
tests and assets are unchanged. The correction remains uncommitted until a different actor independently reviews
the exact staged blob and linked handoff.

The correction does not restore the retired donor execution authority. Product capability remains owned by Product
facts and the isolated Native Host. Pi executable dependencies remain exact direct dependencies of Native Host and
are absent from Electron Main, the renderer and Product Service. The old MCP CLI path, Provider log expectation,
orchestration WebSocket capabilities, `/fast` command, Provider-agent invocation syntax and orphan thread diagnostics
bus remain retired.

This handoff supersedes r7 in place. It preserves the immutable source tree, README adoption mapping, authorized
glyph corpus, test/authority closure and exact-source reconstruction already accepted by review receipt
`1cec56fb8b5046c3ac758efa65ef7593` while recording the single candidate route correction.

## Freeze r3 falsifier and correction

Freeze operation `abe2b131de554790a06a3288ec819799` tested detached candidate `3c2d226c4` in a clean disposable
clone. Frozen install (`2,185` packages), build (`5/5`), typecheck (`7/7`), quality, root test (`9/9`) and the
correctly routed nine-file boundary suite (`38/38`) passed. The first real red gate was:

```text
node --test test/document-contract.test.mjs test/quality.test.mjs && bun run brand:check
```

It exited `1`: `61/100` tests passed and `39/100` failed because one stable
`route.mandatory` finding on candidate `AGENTS.md` contaminated the exact-finding mutation fixtures. Brand did not
run, and later browser/live/artifact gates correctly did not run. A prior `bun test` invocation against Vitest files
was an invalid runner probe, not candidate evidence; the corrected Vitest command passed `38/38`.

The staged route now makes adopted-source review deterministic for a fresh agent: when the maintainer asks to review,
borrow, absorb or update Synara or another adopted source, the agent must read `research/source-update-intake.md`,
perform read-only research and human discussion first, and modify product source only after confirmation of that
exact intake set. This is routing only; it adds no new source intake, design work or runtime authority.

## Baseline failures reproduced

The first full Web run on the current source produced `12` failed files and `46` failed tests while `250` files and
`2,975` tests passed. The failures divided into four factual groups:

1. Node 25 exposed an incomplete experimental `localStorage` object before Zustand stores were imported, so four
   persisted-store suites captured an invalid implementation.
2. Tests still asserted retired `/fast`, Void/space, detail-prewarm, runtime-mode, Provider-agent mention and marker
   comment behavior.
3. runtime provenance still read the Service manifest and described Native Host as unimplemented; the public
   fixed-source MIT notice also differed from its canonical accepted bytes.
4. the React Compiler guard referenced retired modules and found two real missing stable dependencies in
   `ChatView` callbacks.

After Web was green, the first repository test run exposed `4` failed Service files and `6` failed tests:

- old MCP CLI and Provider log-directory expectations;
- old orchestration WebSocket capability expectations;
- a zero-consumer `ThreadDiagnosticsQuery` whose two tables and migrations had already been deliberately removed;
- a Windows Store editor-discovery test whose fake OS process could exceed the production `1.5s` PowerShell timeout
  under the full suite.

The next repository run exposed the same timeout artifact in the Windows Store editor-icon composition test. Both
Windows proofs passed alone; the failure was the test-owned fake subprocess, not Store discovery or icon selection.

## Implemented corrections

### Deterministic Node unit storage

- Added `apps/web/vitest.config.ts`, merging the real Vite config and installing a Node-unit-only setup file.
- Added `apps/web/src/test/setupNodeStorage.ts`, which defines a complete in-memory `Storage` before store module
  evaluation.
- Production stores, browser configuration and persisted formats are unchanged. No filesystem-backed Node global,
  jsdom fallback or production compatibility branch was introduced.

### Retired expectation and display-parser closure

- `/fast` is asserted unavailable rather than restored.
- Sidebar test language follows current location/Global truth instead of space/Void.
- The removed detail-prewarm callback and old automation `runtimeMode` assertion are gone; scheduled automation
  continues to force `requestedSelection.permissionPolicy = approval-required`.
- Unquoted mention parsing now excludes parentheses, so retired `@spark(check the UI)` syntax remains one literal
  display segment instead of becoming a false file/folder chip.
- The Product submission health proof now reads current `sendProductConversation` structure and proves Queue
  ownership occurs before the dispatch-health gate, with no Entry/Run identity minted on the queue-only path.

### Runtime provenance, legal bytes and compiler truth

- Runtime provenance reads `apps/native-host/package.json` and proves the three direct Pi packages are exact
  `0.81.1` dependencies there and absent from Desktop, Service and Web manifests.
- Product copy now states the implemented supervised isolated Native Host and accurately limits the claim:
  process isolation is a fault boundary, not a filesystem or network sandbox.
- `apps/web/public/licenses/ui-mother-MIT.txt` is byte-identical to canonical
  `LICENSES/ui-mother-MIT.txt`, including the accepted Emanuele Di Pietro attribution.
- The compiler module set now names `ProductRuntimePicker`, removes the deleted slash-command hook, and keeps a zero
  bailout allowlist.
- `ChatView` adds the stable `setProductRequestedSelection` dependency to the two callbacks that genuinely omitted
  it. Both now compile without bailout.

### Service authority and Windows Store proof closure

- Physically deleted the zero-consumer `ThreadDiagnosticsQuery` Service, Layer and test. Its migration tables were
  already removed with competing authority; they were not recreated.
- Removed the stale MCP subcommand and Provider log-directory tests. Current private state and terminal/server log
  permission checks remain.
- WebSocket compatibility now asserts the exact current `WS_SERVER_CAPABILITIES` and its Product fact/snapshot
  capabilities, never orchestration capabilities.
- Exported one precise `WindowsStorePackageLookupExecutor` seam from editor discovery and reused it in editor-list and
  editor-icon composition. Production defaults still invoke the same bounded `powershell.exe` lookup. Tests inject
  only that process boundary while still executing the real AppX family/script/output parser, editor discovery,
  package icon scoring, cache copy and final byte checks. No timeout was enlarged and no Windows capability proof was
  removed.

### Locked identity and exact source closure

- The active Work now reflects the maintainer's controlling calibration: the existing OmniMind Agent Dock icon is
  the locked first-party identity, not a temporary asset or a later Agent/Chat replacement obligation. Asset bytes,
  digest map, generated outputs and semantic product tokens are unchanged.
- The three deleted diagnostics paths belong to the immutable T0 map. Exact current disposition is therefore
  `1,496` present / `774` removed, still `6,425` total.
- The full sorted `source\0target\0disposition` SHA-256 is now
  `368f2a03465320ad28552312544b81f4ac4cbdfcc8c23c73d4f21ec1f7cb9a13`.
- The checker algorithm, immutable source tree, fifteen README mappings, fourteen public-surface records,
  exclusions and `4,014` byte-locked glyph records are unchanged. Count or digest drift still fails closed.

## Exact disposition truth

| Disposition | Current count |
| --- | ---: |
| `adapted-present` | `1,496` |
| `adapted-removed` | `774` |
| `authorized-fill-glyph` | `2,035` |
| `authorized-line-glyph` | `1,979` |
| `excluded-non-product` | `127` |
| `public-surface-lineage` | `14` |
| **Total** | **`6,425`** |

Relative to T1 implementation `5d2158974`, exactly `754` immutable-map targets are now
`adapted-present -> adapted-removed`; the earlier r6 reconstruction's `751` transitions remain unchanged and the
three additional transitions are precisely the deleted `ThreadDiagnosticsQuery` files. No target was retargeted or
reclassified into an exclusion.

## Verification

All current results below were produced after the complete combined correction in this working tree.

| Check | Result |
| --- | --- |
| Web full unit suite | PASS, exit `0`; `262/262` files, `3,022/3,022` tests |
| Service full unit/integration suite | PASS, exit `0`; `103` files passed, `1` skipped; `994` tests passed, `1` skipped |
| `bun run test` | PASS, exit `0`; Turbo `9/9` tasks successful |
| `bun run typecheck` | PASS, exit `0`; `7/7` packages |
| `bun run quality` | PASS, exit `0`; identity/structure, source, closure, glyph, legal and `28/28` quality tests |
| Advanced Settings browser proof | PASS, exit `0`; real Playwright collection/execution, `2/2` tests |
| Web focused storage/retirement cluster | PASS; `12` files, `244` tests |
| Web provenance/compiler cluster | PASS; `2` files, `15` tests; ChatView unexpected bailouts `0` |
| Service main/open/icon/WS cluster | PASS twice; `4` files, `65` tests |
| Native Host/legal focused cluster | PASS; `3` files, `14` tests |
| canonical/public MIT comparison | PASS, byte-identical |
| `licenses:check` | PASS; deterministic metadata for `230` components |
| source-closure checker | PASS; `6,425`, `1,496/774`, digest `368f2a…9a13` |
| `git diff --check` | PASS |
| exact staged-tree document contract | PASS, exit `0`; `72/72` tests |
| exact staged-tree locked-brand guard | PASS, exit `0`; `12` source/platform assets |

The repository test PASS is later than, and supersedes, the two deliberately retained failed runs described above.
Those failed runs are diagnosis evidence only and are not reported as green.

## Scope and residual gates

- The exact two-line adopted-source route in root `AGENTS.md` belongs to this correction. User-owned live-provider
  and secret-handling edits in the same working file, `.omp-flow` tooling and 08-03 audit material do not.
- No release artifact, publish, push, merge, Campaign claim promotion or production-freeze acceptance occurred.
- This implementer reports a review candidate only. A different actor must inspect the entire actual diff, rebuild
  the source map independently, verify retired authority stayed absent, and write the linked review.
- If that review passes, this correction may be committed atomically. Only then may a new Freeze run start from the exact
  clean commit and rerun install/build/typecheck/quality/test/live/UI/artifact gates without inheriting evidence.
- A successful freeze would establish the first macOS Pi-native vertical slice, not OmniMind V1 completion.

## Immutable evidence

| Evidence | Object |
| --- | --- |
| Repository checkpoint containing T0 | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| Historical runnable source tree | `630f17e61abc478114bf83c1d740977c9f68b910` |
| Fixed upstream revision | `6aca3dcc505894481430967c2acb762b3dd1b358` |
| T1 implementation baseline | `5d2158974` |
| Current committed base | `3c2d226c44530ef883964aaf81b849925cab59e9` |

The root README and `research/source-review.md` remain the source/adoption evidence owners. Git objects retain the
complete implementation history.
