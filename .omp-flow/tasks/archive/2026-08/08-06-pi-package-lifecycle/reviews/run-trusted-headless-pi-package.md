---
type: "Implementation Review"
title: "Review: Run one trusted headless Pi Package"
work: "../work/run-trusted-headless-pi-package.md"
handoff: "../handoffs/run-trusted-headless-pi-package.md"
verdict: "PASS"
revision: "review-run-trusted-headless-pi-package-20260806-r1"
actor_id: "pi_package_lifecycle_reviewer_g1_r1"
dispatch_receipt: "94adff8b4df642f298e81b7dc534e1d1"
predecessor_receipt: "cc06aa2574cd486aacffca619584a689"
predecessor_output: "../handoffs/run-trusted-headless-pi-package.md"
work_revision: "e2585182b7d23a64399ceaaa4d71398cca97a2eea9283ade0e5fb8c9eda267ec"
base_sha: "0ee1061c63ec55539600707270b3187f02aa1952"
---

# Review: Run one trusted headless Pi Package

## Findings

No material or advisory finding within this bounded Work.

## Verdict

`PASS`. The dirty working-tree Package candidate based on
`0ee1061c63ec55539600707270b3187f02aa1952` satisfies this Work's bounded source, authority,
lease/recovery, native lifecycle, fault and release-staging conditions. It may return to the owning
flow for integration. This review does not commit, publish, finish the operation, promote Campaign
claims, or declare V1 complete.

The predecessor operation is completed, resolves to the linked handoff above and uses implementer
actor `pi_package_lifecycle_implementer_g1_r1`, distinct from this reviewer. The Work SHA-256 is
exactly `e2585182b7d23a64399ceaaa4d71398cca97a2eea9283ade0e5fb8c9eda267ec`, matching the dispatch.

## Source, rights and trust

- The adopted file is exactly 8,848 bytes with SHA-256
  `e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2`. It is byte-identical to
  the locally installed `@earendil-works/pi-coding-agent@0.81.1` npm artifact's
  `examples/extensions/todo.ts`; the pinned lock entry carries the recorded npm integrity.
- The reviewed Source Review and handoff bind that artifact to repository revision
  `20be4b18d4c57487f8993d2762bace129f0cf7c6`, upstream path
  `packages/coding-agent/examples/extensions/todo.ts` and tarball SHA-256
  `420113c0282160e6181656fd16cf18742f76bf9040ee3dfb9cb67e3e6ad5641c`.
- `LICENSES/pi-todo-MIT.txt` and `assets/licenses/pi-MIT.txt` are byte-identical 1,070-byte MIT
  notices with raw SHA-256
  `4f6a1985796db5225e3b1e59972bd47e07a27a0748427cb3d3c8fbf39f9311f0`. The root adoption record
  names only the copied executable and the retained legal path; it does not adopt the Pi repository
  or claim general Package compatibility.
- Direct inspection of the executable finds only the declared Pi AI/coding-agent/TUI and TypeBox
  imports. The native tool owns its in-memory Todo data and reconstructs it from Pi Session
  `toolResult.details` on `session_start` and `session_tree`. `/todos` explicitly requires TUI mode,
  so the Product truthfully supports the headless tool while leaving the interactive command
  unsupported. The manifest records no reviewed credential/network/process/filesystem use and says
  `process-boundary-not-sandbox`.

## Product, Host and recovery authority

- The Native Host protocol exposes only `package.validate.request` and a generation-specific
  validation/load report. Host code constrains the absolute stage beneath
  `<product-home>/userdata/packages/stage`, rejects links and digest/byte drift, loads the selected
  source through Pi `DefaultResourceLoader`, binds the resulting extensions to the Pi Session and
  keeps only a process-local validation cache. There is no Host activate/current/LKG/quarantine or
  lease contract or field.
- Product Service alone verifies curated source/manifest/legal/trust facts, creates the immutable
  stage, records validation, activates current generation, retains LKG/quarantine, and publishes the
  current generation in the Product runtime catalog. Existing SQLite `product_runs` and committed
  operation receipts remain the only durable Run/lease facts; no Package Run/lease/Todo table or
  second Runtime/Session/Queue was introduced.
- The active-lease projection explicitly includes `pending`, `accepted`, `running`,
  `delivery_unknown` and `outcome_unknown`. Admission calls Product preflight inside the same
  transaction, so a quarantined/stale generation cannot acquire a committed new lease. Unknown
  delivery/outcome retains the existing generation lease, and the outbox keeps
  `automaticReplayCount = 0`.
- Product transaction commit precedes lifecycle mutation. Succeeded settlement promotes LKG only
  after Product accepts the fact. A committed `PI_PACKAGE_LIFECYCLE_UNAVAILABLE`/
  `PI_PACKAGE_VALIDATION_FAILED`/immutable-generation conflict or accepted native
  `package.failed` quarantines the exact generation and moves new selection to LKG. Generic
  Session construction, credential/provider failure and Host process loss do not quarantine.
  The redelivery test proves that a listener failure before Product acceptance does not mutate LKG
  or quarantine early.
- Missing explicit application-root assets fail Package execution/catalog closed while Product
  Store access stays available. Cwd drift is removed by Desktop's absolute `OMNIMIND_APP_ROOT`:
  repository root in development and `app.getAppPath()` when packaged. A present candidate that
  fails staging/native validation leaves current and LKG unchanged.

## Package, release and real-provider evidence boundary

The reviewer independently reran the real Pi loader/Session path with the exact curated executable
and a fixture provider: native `todo add`, Host restart/revalidation, continuation lineage and
`todo list` reconstructed the prior private item from the Pi Session file, while Product facts did
not contain the private payload. The production child fault test separately used a test-only
Package to `SIGKILL` Host after the send boundary and proved reauthentication, retained
`delivery_unknown`, one active generation lease, zero replay, no quarantine and a surviving second
Queue item. These are different evidence classes and are not represented as real-provider or
spontaneous curated-Package faults.

The linked handoff records one actual unsigned macOS arm64 ZIP/ASAR inspection and sanitized bounded
MiMo and DeepSeek production Host + Desktop credential broker + Product Service journeys. For each
provider it records native Todo add followed by continued Todo list, a folder-backed read, three
settled Runs, Thinking/usage/tool/settlement observations, one attempt per Run, zero automatic
replay and negative credential/endpoint persistence checks. It also records exact ASAR placement:
only `manifest.json` and `todo.ts` below the curated Package directory plus the exact
`assets/licenses/pi-MIT.txt` notice.

Per control amendment r1.2, candidate bytes were unchanged and this reviewer did not duplicate the
MiMo/DeepSeek, ZIP/ASAR, performance or final gates. Their results above remain handoff-bound
producer evidence rather than a second reviewer live/artifact run. This review independently
checked that the tracked probe, release staging and digest guards implement those stated
observables and fail-closed paths; it does not broaden them into packaged Window UI, Keychain
onboarding, signing/notarization, Windows/Linux, arbitrary Packages, Marketplace, External Engine
or Remote proof.

## Independent verification

| Command or inspection | Result |
| --- | --- |
| predecessor/reviewer operation records; Work/handoff links; Work SHA-256; `git rev-parse HEAD`; changed/untracked path inspection | PASS; completed predecessor, exact output, different actor, matching Work revision, base/HEAD `0ee1061c...` |
| `bun run --cwd packages/contracts typecheck` | PASS |
| `bun run --cwd apps/native-host typecheck` | PASS |
| `bun run --cwd apps/native-host build` | PASS; current production `dist/index.mjs` rebuilt |
| `bun run --cwd apps/service typecheck` | PASS |
| `bun run --cwd apps/desktop typecheck` | PASS |
| `bun run --cwd scripts typecheck` | PASS |
| `bun run --cwd packages/contracts test -- src/native-host/protocol.test.ts --reporter=dot` | PASS; 1 file / 5 tests |
| `bun run --cwd apps/native-host test -- src/piRuntime.test.ts src/responseFrame.test.ts --reporter=dot` | PASS; 2 files / 26 tests |
| `bun run --cwd apps/service test -- src/native-host/packageLifecycle.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/product/ProductControlPlane.test.ts --reporter=dot` | PASS; 4 files / 55 tests |
| `bun run --cwd apps/desktop test -- src/process/serviceApplicationRoot.test.ts src/process/nativeHostProcess.integration.test.ts --reporter=dot` | PASS; 2 files / 4 tests |
| `bun run --cwd scripts test -- lib/curated-package-assets.test.ts --reporter=dot` | PASS; 1 file / 2 tests |
| local installed npm file versus curated `todo.ts`: `shasum -a 256` and `cmp`; both legal paths: `shasum -a 256` and `cmp` | PASS; executable and both role-specific notices are byte-identical at the declared digests |
| curated-directory enumeration and manifest/legal digest inspection | PASS; exactly two files under `assets/packages/pi-todo-0.81.1` and the exact separate release notice path |
| scoped Host-authority, Pi-loader/private-state, second-ledger/table and Todo-payload negative scans | PASS; no competing authority or private payload mirror found; renderer Pi names are provenance-only |
| `git diff --check` | PASS; no whitespace error |

`bun run check:sources`, `bun run licenses:check`, the actual ZIP/ASAR build, MiMo/DeepSeek live
journeys, performance and repository final gates were not duplicated after amendment r1.2. The
handoff records each applicable producer command as PASS; this review does not relabel those results
as independently rerun.

## Scope and limitations

- Fixture evidence proves exact Package/Pi lifecycle, deterministic failure attribution and
  recovery invariants; handoff-bound live evidence proves the two named current provider journeys.
  Neither proves a sandbox, every Provider, every Package or general TUI compatibility.
- The artifact boundary is one local unsigned macOS arm64 ZIP. Packaged Electron Window UI,
  signing/notarization and Windows/Linux remain unproved here.
- No real installed Keychain onboarding was exercised. No Marketplace, arbitrary install/update,
  External Engine, Remote or V1 completion is accepted.
- Campaign F-11/F-12 remain owned by the active Campaign; this reviewer did not edit or promote
  them. Historical SHA `248b3316651e681d9d4c78f81bec0c84a4cc822c` remains prior Stage 0–3
  evidence, not this dirty Package candidate.

The only repository write by this reviewer is this Review Concept. No product, test, Work,
handoff, research, Campaign, runtime/session record or evidence ledger was modified; nothing was
staged, committed, pushed, merged or finished.

## Dispatch identity

- role: `reviewer`
- actorId: `pi_package_lifecycle_reviewer_g1_r1`
- receipt: `94adff8b4df642f298e81b7dc534e1d1`
- predecessor: `cc06aa2574cd486aacffca619584a689`
- predecessor output: `../handoffs/run-trusted-headless-pi-package.md`
- verdict: `PASS`
