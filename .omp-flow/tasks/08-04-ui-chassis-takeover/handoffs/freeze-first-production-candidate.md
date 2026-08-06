---
type: "Implementation Handoff"
title: "Freeze the first production candidate"
work: "../work/freeze-first-production-candidate.md"
status: "DONE"
revision: "handoff-freeze-first-production-candidate-20260806-r6"
actor_id: "freeze_first_production_candidate_implementer_r6"
dispatch_receipt: "a8b3caa97ef94900a401e8694701bd21"
predecessor_receipt: "f1212bd91ba347feace09330f26ad614"
predecessor_review: "../reviews/freeze-first-production-candidate.md"
predecessor_review_receipt: "be8529b58b404168b865107089123292"
supersedes_revision: "handoff-freeze-first-production-candidate-20260806-r5"
---

# Freeze the first production candidate

## Outcome

`DONE`. Exact candidate `248b3316651e681d9d4c78f81bec0c84a4cc822c` remains unchanged. The r5
source/browser boundaries accepted by the predecessor reviewer remain the candidate record, while
this bounded r6 correction regenerates the evidence that reviewer could not accept and closes the
sole `CHANGES_REQUESTED` finding: the actual ZIP, artifact-bound
legal/identity/secret proof, sanitized live/fault/process receipts and digest manifest now remain
available to the different-actor reviewer instead of being deleted before review.

This producer does **not** independently accept the Freeze, run Finish, publish an artifact, promote
a Campaign claim or declare OmniMind V1 complete. A different-actor Freeze review is still required.
The artifact is local and unsigned; signing, notarization, update publication, Windows/Linux and the
full V1 surface remain outside this proof.

## r6 evidence custody correction

- Preserved review bundle: `/tmp/omnimind-freeze-evidence-r6.4O3L9a`.
- Directory permissions are `0700`; every retained file is `0600`.
- Manifest: `/tmp/omnimind-freeze-evidence-r6.4O3L9a/MANIFEST.sha256`.
- Manifest SHA-256: `bda3c20abbd9147cfbbb7896871c2dbf52fbd4253c260572922ca8c1e17a09fc`.
- `shasum -a 256 -c MANIFEST.sha256`: PASS, exit 0; all 11 listed materials verified.
- Final bundle custody scan: PASS over 11 files / 170,976,406 bytes; MiMo and DeepSeek credential
  matches `0/0`, matching endpoint literals `0/0`, raw provider responses stored `false`.
- The bundle contains the exact ZIP and builder metadata, extracted inventory/SBOM/notices,
  `artifact-audit.json`, `live-summary.json`, `verification-summary.json`, `source-identity.json`,
  `custody-audit.json` and a reviewer README. It contains no provider root or probe result body.
- Keep this bundle until the independent Freeze review completes; delete it only after that review.

The r6 correction did not repeat root source/build/typecheck/quality/test, browser, performance,
Electron browser e2e or human visual calibration. The predecessor reviewer explicitly accepted
those r5 candidate facts as internally consistent; only the missing-custody gates were regenerated.

## Candidate identity and reviewed chain

- Base: `8e67eaba404b1561895d2959e1e9b597e2fa12da`.
- Candidate `C`: `248b3316651e681d9d4c78f81bec0c84a4cc822c`, checked out detached by full SHA.
- Range: 6,778 files, 125,284 insertions, 353,226 deletions. The dominant deletion is the reviewed
  `vendor/ui/**` retirement.
- `git diff --check <base> <C> --`: PASS. Commit/range inspection and source-closure routing found no
  dirty-tree byte in `C`.
- r4's stale archived-settings proof is superseded by source-closure review
  `b57d3ac797084f8ea196e643869895d0` and candidate commit `248b3316`.
- The entry gate is current: Workbench hardening `7431d8b4` and Product completion alignment
  `2bfd0d6c` both have different-actor PASS and precede `C`.

Candidate commits after the base, in authored order:

| Commit | Concern |
| --- | --- |
| `5d215897` | runnable OmniMind product closure |
| `27cd50b5` | Product facts and typed ingress |
| `8db0ba3e` | isolated Native Host boundary |
| `c0c0cc88` | Agent and Chat workbench takeover |
| `ba847f51` | Pi-native execution |
| `1f09baa8` | competing execution authority retirement |
| `7431d8b4` | active Workbench hardening |
| `2bfd0d6c` | Product completion signals |
| `013dd43d` | retired ACP tooling removal |
| `f9503726` | identity and structure closure |
| `43e6a9c9` | exact source-closure reconciliation |
| `02252351` | current Freeze entry gate |
| `a29e2e5c` | Product package proof alignment |
| `3c2d226c` | runnable source candidate proof |
| `ba96b074` | adopted-source intake routing |
| `248b3316` | ordinary/performance browser proof ownership |

## Historical T0 and adopted-source boundary

Historical evidence remained separate and was not relabelled as candidate proof:

- T0 commit `2445acb987e443b44b7dc819de3de44c3d68b391` resolves;
- its `vendor/ui` tree is exactly `630f17e61abc478114bf83c1d740977c9f68b910`;
- fixed UI-mother revision `6aca3dcc505894481430967c2acb762b3dd1b358` remains disclosed in
  `README.md` and `research/source-review.md`;
- selective-intake revision `be6dcad3f63fa121fbe3180f257ba1ff128696c4` remains separately
  disclosed;
- the canonical/public UI-mother MIT copies are byte-identical.

An initial attempt to resolve the foreign upstream revision through this repository's Git object
database failed mechanically and was discarded; document disclosure and the reviewed source-closure
contract are the applicable proof. It is not recorded as a candidate failure.

## Environment and isolation

- Apple M4 Pro, arm64, 64 GiB RAM.
- macOS 26.5.2 build 25F84; Darwin 25.5.0.
- Bun 1.3.14, Node 25.9.0, Turbo 2.10.5, Vite 8.1.5.
- Playwright Headless Chrome 145.0.7632.6 / revision 1208, standard cache, no executable override.
- r6 correction verification ran in task-scoped `/tmp/omnimind-freeze-clone-r6.JGWWPq/repo`, created with
  `git clone --no-local --no-checkout` and detached at exact `C`.
- The r6 clone was initially clean and remained clean. Final `git status --short
  --untracked-files=all` and `git diff --check` were empty; tree identity was
  `5ef3093e2cf1755ea25727dc2680df1bae7c0efc`.
- The exact clone root was deleted after evidence capture. The separate review bundle above was
  intentionally retained.
- No worktree, stash, reset, `git clean`, stage, commit, push or merge was used.

## Deterministic source gates retained from r5

| Command / proof | Actual result |
| --- | --- |
| `bun install --frozen-lockfile` | PASS, exit 0; 2,185 packages |
| `bun run build` | PASS, exit 0; 5/5 tasks; Web 2,558 modules and 1,995 precompressed files |
| `bun run typecheck` | PASS, exit 0; 7/7 tasks |
| `bun run quality` | PASS, exit 0; identity/structure 0; one adopted source; 6,425 exact-source records, digest `368f2a03465320ad28552312544b81f4ac4cbdfcc8c23c73d4f21ec1f7cb9a13`; 4,014 glyphs; 230 legal components; 28/28 tests |
| `bun run test` | PASS, exit 0; 9/9 tasks. Web 262 files/3,022 tests; Service 103 passed + 1 skipped files / 994 passed + 1 skipped tests; Desktop 66 passed + 1 skipped files / 555 passed + 5 skipped tests; Contracts 125; Shared 368 passed + 1 skipped; Native Host 23; scripts 95 |
| `node --test test/document-contract.test.mjs test/quality.test.mjs && bun run brand:check` | PASS, exit 0; 100/100 tests and 12 locked identity assets |
| focused response-frame, execution-authority, Native Host, brand, legal, packaged-closure, provenance, mac-config and packaged-startup suites | PASS, exit 0; 9 files / 40 tests |

## Browser, Electron and Workbench gates retained from r5

| Profile / observable | Actual result |
| --- | --- |
| `vitest.browser.stable.config.ts` | PASS, exit 0; 55/55 files, 150/150 tests; all ordinary Chromium proofs collected |
| `vitest.browser.performance.config.ts` | PASS, exit 0; 3/3 files, 7/7 tests |
| real retained Agent↔Chat route switch | p95 8.2 ms, 0 long tasks; heap growth 2,748,472 bytes |
| Workbench interaction profile | switch 18.4 ms, scroll 23.3 ms, hover 27.2 ms, resize 16.6 ms p95; 0 long tasks |
| 100k / 400k Conversation | DOM 157 / 57; update 9.2 ms; post-GC heap growth 842,196 bytes |
| hidden burst / CJK IME | background heap growth 819,828 bytes; hidden terminal unchanged; composition preserved with 0 commands |
| `bun run --cwd apps/web test:electron:e2e` | PASS, exit 0; 1/1 real Electron guest continuous-annotation journey |

The geometry profile intentionally collected zero matching tests: all 55 files / 150 tests were
skipped because the configured name filter is `[geometry:linux]`. It is recorded as a non-gate
diagnostic, not a PASS. The ordinary profile did run and pass the current BrowserPanel geometry
proof. Linux geometry remains unproven and is not a blocker for this first macOS slice.

The maintained post-surgery visual direction was not reopened. The accepted human same-state
calibration is recorded in `handoffs/take-over-agent-chat-workbench-repair.md` (2026-08-05 explicit
`接受`), and the final bounded T3 review is `reviews/take-over-agent-chat-workbench-final.md` with
different-actor PASS. Current dual-locale, a11y, CJK/IME, real-route and performance behavior was
renewed by the browser profiles above; no new brand, icon, palette or visual candidate was created.

## Real Pi and failure/recovery proof

The authorized inventory remained mode `0600`. A temporary runner outside the repository parsed
credentials in memory, put only provider endpoint/model metadata in a disposable private Pi root,
and supplied credentials only through the Native Host credential broker. No key appeared in argv,
environment, repository, persisted provider root or captured Host/probe output. All provider roots
were removed after each run.

| Real journey | Actual result |
| --- | --- |
| MiMo on Pi `0.81.1` | PASS; new Chat, continuation and folder-backed Agent all settled; one attempt each; zero automatic replay; thinking, usage and settlement observed; Agent tool start/settle observed |
| DeepSeek on Pi `0.81.1` | PASS; same three journeys and observations; one attempt each; zero automatic replay |
| Package generation | PASS; requested and activated generation matched for both providers |
| Live leakage assertions | PASS; persisted secret, Host output and probe output all false for both providers |
| Service fault matrix | PASS, exit 0; 4 files / 41 tests (`ProductControlPlane`, execution boundary, client integration, service-process integration) |
| Native Host failure/recovery | PASS, exit 0; 2 files / 23 tests |
| Desktop process/broker boundary | PASS, exit 0; 3 files / 6 tests; broker recovery, Host SIGKILL, renderer/Host/Service process separation |

These are bounded live proofs, not provider benchmarks or a claim that every Provider/model behavior
is identical.

## Actual macOS artifact

Build command:

```text
node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 --output-dir <evidence>/final-artifacts
```

| Artifact / closure | Actual result |
| --- | --- |
| ZIP | `final-artifacts/OmniMind-0.1.0-alpha.0-arm64.zip`; 168,752,127 bytes; SHA-256 `6835affbc29006fd7cd737c1535f20567617234dc47654ffa2cfebc7c546e531` |
| builder metadata | `builder-debug.yml`; 929 bytes; SHA-256 `637031fa8da85f6231912b4942d191c8610a2b5cd7a84476b9b13764ced57c05` |
| packaged startup | PASS; actual ZIP launched with disposable state and exposed independent Electron, Service and Native Host process tree |
| bundle identity | `app.omnimind.desktop`, product `OmniMind`, version/build `0.1.0-alpha.0`, arm64; local ad-hoc signature, no Team ID |
| Native Host production tree | exactly one file: `apps/native-host/dist/index.mjs`; no second packaged Host/runtime path |
| Pi dependency identity | exactly `@earendil-works/pi-agent-core`, `pi-ai`, `pi-coding-agent`, `pi-tui`, all `0.81.1` |
| packaged legal closure | PASS; actual ASAR package identities equal release inventory, 230/230 components |
| release inventory | target `release-target/mac/arm64`, 230 components; SHA-256 `3cb504e193493d44dd0513453ee6b51ec3b58c2b4c8f302ecdafadb3de5af2a4` |
| CycloneDX SBOM | 230 components; SHA-256 `ace07fdb4220fb81afdacc6636aa86c1131a9e0ed791c5d4151341251fd48049` |
| THIRD-PARTY-NOTICES | present and non-empty; SHA-256 `130c49d2d0e048fa968223e34a3248c66663d009a6d1d2f7949c860a7d54331b` |
| packaged glyph corpus | PASS; line 1,979 + fill 2,035 = 4,014 exact source bytes |
| retired/secret path scan | zero `AgentGateway`, `BrowserAutomationHost` or probe `models.json` path in packaged production apps |

The r6 exact credential scan read the authorized MiMo/DeepSeek values only in process memory and
examined 28,901 extracted ASAR files / 202,234,654 bytes. Both credential values had zero matches.
The two corresponding public base endpoints each matched four files, all confined to the bundled
Pi `pi-ai` provider data/runtime/source-map paths (`deepseek` and `xiaomi-token-plan-cn`). This is the
curated Pi runtime catalog already present in the candidate, not credential persistence or live-probe
injection. No raw credential or live response entered the repository, handoff or artifact.

Artifact identity is anchored by construction from the clean detached `C`, tree
`5ef3093e2cf1755ea25727dc2680df1bae7c0efc`, the ZIP digest above,
the actual packaged startup proof and the ASAR closure checks. The local unsigned build does not
claim Apple notarization or release-channel provenance.

## Protected shared state

The task modified only this allowed handoff. All pre-existing shared dirty/untracked paths were
preserved. Before/after values are identical:

| Protected path | SHA-256 before and after |
| --- | --- |
| `.omp-flow/tasks/08-03-architecture-ui-contract/qbd/frozen-candidate-payload-repair-audit.md` | `527fc31aeaff22b35e58abff8cbcc553296f17463b582d2d1d039b9d9168b3c1` |
| `AGENTS.md` | `a62370b525a57636c6d4d07cafa9f1223d6e20ae53b3edd9eca1e4a44e51d4a5` |
| `.omp-flow/.gitignore` | `c3fe57714c54b988cc4966d929516840ca458072d092ae5bf231cc258f6b0951` |
| `.omp-flow/config.json` | `e81df47afb01463495759566f7e82083052a80e6721c73ddbfe55ea42f36b43a` |
| `.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/frozen-candidate-integration.md` | `f89ec0c60d20da2b753bab85e96793282c67bfc31887a9e072aeb4eb70d946d3` |
| `.omp-flow/tasks/08-03-architecture-ui-contract/reviews/frozen-candidate-integration.md` | `355b1fb0a87ced1a51cf179a921b884819a8b09a4e029ce21eca004fc2557c89` |
| `.omp-flow/tasks/08-04-ui-chassis-takeover/reviews/freeze-first-production-candidate.md` | `68842660327707e4d5386d7f609acda43167158fab2db28cec5b45c0b1be7e73` |
| `.omp-flow/wiki/` sorted content manifest | `5c871fcb0b1a718584503fae4d6f76c24ffbbd4136e2e99552717fd863dc6816` |
| `.omp-flow/workflow.md` | `b6c3338b67e00f2dc38d32da08dc6c02a8652dbda17be3e7d9f04d80ef422eaa` |

The prior r5 handoff is intentionally superseded and is not part of the unchanged assertion. The
validated disposable clone and all transient provider roots were deleted with exact paths. The
permission-restricted evidence bundle was deliberately not copied into Git and remains at the path
above for the next reviewer.

## Residual boundary and next action

The next action is one different-actor, bounded Freeze review over this Work, handoff, candidate SHA
and evidence claims. A PASS may authorize Finish according to the linked Bundle; a failed material
claim returns to its owner. No fourth evidence-audit loop, new Converge/QbD round or unrelated source
work is implied.

Even after independent acceptance, this candidate proves only the first local macOS arm64 Pi-native
vertical slice. It does not prove signed/notarized distribution, updater publication, Windows/Linux,
full Package/Remote/external-Engine coverage or OmniMind V1 completion.

## Dispatch identity

- role: `implementer`
- actorId: `freeze_first_production_candidate_implementer_r6`
- receipt: `a8b3caa97ef94900a401e8694701bd21`
- predecessor receipt: `f1212bd91ba347feace09330f26ad614`
- predecessor review receipt: `be8529b58b404168b865107089123292`
- predecessor output: `../reviews/freeze-first-production-candidate.md`
- promised output: `../handoffs/freeze-first-production-candidate.md`
- conclusion: `DONE`; exact candidate ready for independent Freeze review
