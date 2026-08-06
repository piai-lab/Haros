---
type: "Implementation Handoff"
title: "Run one trusted headless Pi Package"
work: "../work/run-trusted-headless-pi-package.md"
status: "CANDIDATE"
revision: "handoff-run-trusted-headless-pi-package-20260806-r1"
actor_id: "pi_package_lifecycle_implementer_g1_r1"
dispatch_receipt: "cc06aa2574cd486aacffca619584a689"
base_sha: "0ee1061c63ec55539600707270b3187f02aa1952"
---

# Run one trusted headless Pi Package

## Outcome

`DONE` for the bounded producer implementation. The candidate runs the exact Pi `0.81.1` todo
extension through native `DefaultResourceLoader`, explicit Session extension binding and the existing
isolated Native Host. Product owns exact source/trust evidence, immutable stage, validation before
activation, current/LKG/quarantine state and generation selection; active leases remain a projection
of existing committed Product Run/receipt facts. Package executable/private todo state never enters
Electron Main, renderer, Product Service or a second Product Store object.

This handoff records a dirty working-tree candidate based on
`0ee1061c63ec55539600707270b3187f02aa1952`. There is no candidate commit SHA because this actor did
not stage or commit. Implementation success is not independent acceptance.

## Exact adopted source, rights and trust

- Copied executable: `assets/packages/pi-todo-0.81.1/todo.ts`, 8,848 bytes, raw SHA-256
  `e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2`.
- Fixed source: `earendil-works/pi` revision
  `20be4b18d4c57487f8993d2762bace129f0cf7c6`, repository path
  `packages/coding-agent/examples/extensions/todo.ts`, npm artifact
  `@earendil-works/pi-coding-agent@0.81.1`, tarball SHA-256
  `420113c0282160e6181656fd16cf18742f76bf9040ee3dfb9cb67e3e6ad5641c`.
- Product manifest: `assets/packages/pi-todo-0.81.1/manifest.json`, raw SHA-256
  `e172b7144253e1187e00758c46fd7468c70cd4f5c4fa22e8045824f459c49548`.
- The root adoption legal path `LICENSES/pi-todo-MIT.txt` and release-retained staging input
  `assets/licenses/pi-MIT.txt` are byte-identical responsibilities for the same exact MIT text.
  Each has raw SHA-256
  `4f6a1985796db5225e3b1e59972bd47e07a27a0748427cb3d3c8fbf39f9311f0`; normalized digest is
  `0457f5bcec3b3b211605dfb5d1a49042fd638f3686a410fe099c24a25af13c48`.
- Reviewed executable permissions are credential/network/process/filesystem false. Process isolation
  contains faults but is explicitly not represented as a sandbox. Only native headless tool behavior
  is supported; the Pi TUI `/todos` command remains outside the Product surface.
- README adoption declares only the copied `todo.ts`, fixed revision, rights, transplant mode and
  re-review policy. It does not adopt the Pi repository or claim arbitrary Package compatibility.

## Product and Host boundary

1. Product verifies the manifest, executable, legal text and trust/compatibility record, writes the
   exact bytes into a Product-owned immutable generation directory, and sends only the exact artifact
   descriptor to Host validation.
2. Host independently constrains the stage beneath `<product-home>/userdata/packages/stage`, rejects
   links/digest drift, loads exactly one selected file through Pi `DefaultResourceLoader`, and reports
   only extension/tool/command/lifecycle counts and names. The protocol deliberately has no Host
   activate/current/LKG/lease command or field.
3. Product records validation, refuses generation replacement while the current generation has a
   committed active Run lease, and leases a generation through the existing
   `product_runs.package_generation` plus receipt states. It adds no Package Run ledger/table.
4. A successful committed settlement promotes current to LKG. A Product-committed Package-fatal
   rejection or accepted native `package.failed` fact quarantines that generation and selects LKG for
   new leases. A failed first use falls back to the fixed empty generation.
5. Host restart clears its validation cache. Every non-empty generation is revalidated before a new
   execute. Existing uncertain work is reconciled and never automatically replayed.
6. Desktop supplies an absolute stable `OMNIMIND_APP_ROOT`: repository root in development and
   `app.getAppPath()` in packaged Electron. Missing root assets fail Package capability closed;
   present candidate validation failure leaves current and LKG unchanged.

## Distinct normal and fault evidence

### Real curated Package with real Providers

A temporary runner outside the repository used the authorized mode-0600 inventory, wrote only
provider endpoint/model metadata to a disposable private Pi root, and provided each credential only
through the established Desktop `NativeHostCredentialBroker`. Product Service did not inherit the
credential or endpoint. The runner, provider roots, Product homes and result files were deleted after
each bounded run.

MiMo and DeepSeek each passed the same production Host + Desktop broker + Service Product journey on
Pi `0.81.1`:

- activated/requested curated generation matched;
- first Chat Run used native `todo add`; continuation had lineage `continued`, used native `todo
  list`, and observed the exact prior canary, proving Package-private Session-backed reconstruction;
- folder-backed Agent used its native read tool;
- all three Runs settled with assistant, Thinking, usage, tool and settlement observations;
- attempt counts were `[1, 1, 1]`; automatic replay counts were `[0, 0, 0]`;
- persisted credential, captured-output credential and captured-output endpoint checks were all
  false. No raw response, credential, endpoint or account identifier is retained here.

### Host process loss: unknown lease, zero replay, no quarantine

The Desktop integration test stages a test-only exact artifact, validates and Product-activates it,
then its Pi `before_agent_start` hook sends `SIGKILL` only after the Product send boundary. Production
Host dist, real supervisor, authenticated broker, Service client, Product SQLite/Queue and restart
path are used. This test does not use ambient extension auto-scan.

Observed result: Host PID changed and reauthenticated; the Run stayed `delivery_unknown`; pending
reconciliation returned unknown with no resolution; its exact generation retained one active lease;
quarantine remained empty; a second Queue intent remained queued; outbox was
`terminal/sent/attemptCount=1/automaticReplayCount=0`. Process loss is therefore containment and
uncertain delivery evidence, not a reportable Package fault.

### Reportable Package fatal and generic failure attribution

- A selected Package bind/lifecycle failure returns `PI_PACKAGE_LIFECYCLE_UNAVAILABLE`. Product first
  commits the rejected receipt, then quarantines current and routes new leases to LKG. An async
  `package.failed` fact likewise quarantines only after the Product listener accepts the fact; a
  deliberately throwing first listener proves redelivery without premature lifecycle mutation.
- Generic Settings/Session construction failures return `PI_SESSION_UNAVAILABLE`, which is excluded
  from the Product Package-fatal policy and does not quarantine or change current/LKG.
- Provider/credential failures and Host process loss are also excluded. Fatal policy is limited to
  the explicit Package lifecycle/validation and immutable-generation conflict codes covered by the
  Product tests.

## Release and packaged proof

Release staging pre-reads and digest-validates exactly these three inputs before it writes anything:

- `assets/packages/pi-todo-0.81.1/manifest.json`;
- `assets/packages/pi-todo-0.81.1/todo.ts`;
- `assets/licenses/pi-MIT.txt`.

The focused ASAR test proves only those two files exist under the curated Package directory and all
three staged bytes are readable by exact path. Missing or changed root evidence fails before an
`assets` destination is created.

An actual unsigned macOS arm64 ZIP was then built with:

```text
node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 --output-dir <private-temp>
```

The build verified 230 disclosed dependencies and completed successfully. Inspection of the actual
ZIP's `OmniMind.app/Contents/Resources/app.asar` found exactly two entries below
`assets/packages/pi-todo-0.81.1/` and matched the pinned manifest, executable and release notice
digests. The temporary ZIP and extracted ASAR were deleted after inspection.

## Files changed

Source, legal and workflow Concepts:

- `README.md`
- `research/source-review.md`
- `LICENSES/pi-todo-MIT.txt`
- `assets/packages/pi-todo-0.81.1/manifest.json`
- `assets/packages/pi-todo-0.81.1/todo.ts`
- `.omp-flow/tasks/08-06-pi-package-lifecycle/work/run-trusted-headless-pi-package.md`
- `.omp-flow/tasks/08-06-pi-package-lifecycle/handoffs/run-trusted-headless-pi-package.md`

Protocol, Product, Host, Desktop and release implementation:

- `packages/contracts/src/native-host/protocol.ts`
- `apps/service/src/native-host/client.ts`
- `apps/service/src/native-host/executionBoundary.ts`
- `apps/service/src/native-host/packageLifecycle.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/native-host/src/index.ts`
- `apps/native-host/src/piRuntime.ts`
- `apps/desktop/src/main.ts`
- `apps/desktop/src/process/serviceApplicationRoot.ts`
- `scripts/build-desktop-artifact.ts`
- `scripts/lib/curated-package-assets.ts`

Focused tests and source-only probes:

- `packages/contracts/src/native-host/protocol.test.ts`
- `apps/service/src/native-host/client.integration.test.ts`
- `apps/service/src/native-host/executionBoundary.test.ts`
- `apps/service/src/native-host/packageLifecycle.test.ts`
- `apps/service/src/native-host/liveJourneyProbe.ts`
- `apps/service/src/native-host/packageCrashProbe.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/native-host/src/piRuntime.test.ts`
- `apps/native-host/src/responseFrame.test.ts`
- `apps/desktop/src/process/nativeHostProcess.integration.test.ts`
- `apps/desktop/src/process/serviceApplicationRoot.test.ts`
- `scripts/lib/curated-package-assets.test.ts`

`.omp-flow/tasks/08-06-pi-package-lifecycle/index.md`, the Work map/index and the initial source-gate
text in `research/source-review.md` existed in the shared dirty tree at dispatch. This actor preserved
them; it changed only the Work's final legal-responsibility wording and the source review's rights
row where later supervisor amendments required it. No Campaign, review, runtime/session record or
Harness configuration was edited.

## Verification

All commands below ran against the final implementation unless explicitly identified as a bounded
live or disposable packaged-artifact probe.

| Command / inspection | Result |
| --- | --- |
| `bun run --cwd packages/contracts typecheck` | PASS |
| `bun run --cwd packages/contracts test -- src/native-host/protocol.test.ts --reporter=dot` | PASS; 1 file / 5 tests |
| `bun run --cwd apps/native-host typecheck` | PASS |
| `bun run --cwd apps/native-host test -- src/piRuntime.test.ts src/responseFrame.test.ts --reporter=dot` | PASS; 2 files / 26 tests |
| `bun run --cwd apps/native-host build` | PASS; production `dist/index.mjs` refreshed |
| `bun run --cwd apps/service typecheck` | PASS |
| `bun run --cwd apps/service test -- src/native-host/packageLifecycle.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/product/ProductControlPlane.test.ts --reporter=dot` | PASS; 4 files / 55 tests |
| final `packageLifecycle.test.ts` rerun after the last implementation cleanup | PASS; 1 file / 9 tests plus Service typecheck |
| `bun run --cwd apps/desktop typecheck` | PASS |
| `bun run --cwd apps/desktop test -- src/process/serviceApplicationRoot.test.ts src/process/nativeHostProcess.integration.test.ts --reporter=dot` | PASS; 2 files / 4 tests |
| `bun run --cwd scripts typecheck` | PASS |
| `bun run --cwd scripts test -- lib/curated-package-assets.test.ts --reporter=dot` | PASS; 1 file / 2 tests |
| actual macOS arm64 ZIP build and direct ASAR digest inspection | PASS; exact two curated Package entries and three exact staged digests |
| MiMo live journey | PASS; 3/3 settled, todo private continuation, folder tool, Thinking/usage, attempt=1 each, zero replay, leakage checks false |
| DeepSeek live journey | PASS; same bounded observations and leakage result |
| `cmp` plus `shasum -a 256` over both Pi legal paths | PASS; byte-identical, raw digest `4f6a1985…11f0` |
| `bun run check:sources` | PASS; 2 adopted sources / 0 exact provenance roots |
| `bun run licenses:check` | PASS; deterministic metadata for 230 components |
| `bun run check:identity` | PASS; identity and structure hard-green |
| `bun run check:closure` | PASS; source closure unchanged and valid |
| `bun run test:quality` | PASS; 28/28 tests |
| targeted `oxfmt --check` | PASS; 23 files, then final Package lifecycle file |
| targeted `oxlint --report-unused-disable-directives` | Diagnostic exit 0 with 0 errors and 25 warnings across whole changed files; one newly exposed unused local was removed. Existing whole-file style advisories were not suppressed or widened into unrelated cleanup. |
| `git diff --check` | PASS; no whitespace errors |
| authority/private-state scans | Host has request-generation/load authority only; Product/private surfaces contain no todo payload mirror or Package loader |

## Decisions and caveats

- Product, not Host, is the sole current/LKG/quarantine/activation/lease authority. Host validation
  cache is deliberately process-local and generation-specific.
- The package lifecycle JSON contains only Product Package governance state. Existing Product SQLite
  remains the sole durable Run/receipt/Queue/active-lease source.
- Startup replays only committed successful settlements, explicit Product Package-fatal rejected
  receipts and committed `package-failed` activities. Unknown delivery/outcome retains its lease and
  is never replayed or converted into quarantine.
- Root assets missing is fail-closed. A present candidate that fails validation cannot silently
  replace or invalidate current/LKG.
- Live proofs used in-memory broker credentials, not a real installed Keychain leaf; credential
  onboarding remains outside this Work.
- The actual artifact proof covers one unsigned macOS arm64 ZIP and ASAR contents. Packaged Electron
  Window UI, signing/notarization and Windows/Linux builds were not run and are outside this Work.
- Only the exact curated headless todo Package is supported here. Arbitrary install/update,
  Marketplace, Package UI/TUI, External Engine, Remote and multiplatform Package behavior remain
  outside the Bundle.
- The process-kill fixture proves containment/restart/unknown lease/zero replay/no quarantine. The
  reportable Package-fatal fixture separately proves quarantine/LKG. Neither is misrepresented as a
  spontaneous fault from the real curated todo source.

## Unproven done conditions

No producer implementation condition is knowingly left without focused evidence. The required
different-actor review has not yet run, so the candidate is not independently accepted and no
Campaign claim is marked `verified`.

## Dispatch identity

- actorId: `pi_package_lifecycle_implementer_g1_r1`
- opaque receipt: `cc06aa2574cd486aacffca619584a689`
- predecessor: none supplied
- base SHA: `0ee1061c63ec55539600707270b3187f02aa1952`
- output: `./run-trusted-headless-pi-package.md`

No finish operation, review operation, stage, commit, push or merge was performed.
