---
type: "Implementation Review"
title: "Re-review: Freeze the first production candidate"
work: "../work/freeze-first-production-candidate.md"
handoff: "../handoffs/freeze-first-production-candidate.md"
verdict: "PASS"
revision: "review-freeze-first-production-candidate-20260806-r6"
actor_id: "freeze_first_production_candidate_reviewer_r6"
dispatch_receipt: "c2237734c2fe487cbd6f44e5b454fb8e"
predecessor_receipt: "a8b3caa97ef94900a401e8694701bd21"
predecessor_output: "../handoffs/freeze-first-production-candidate.md"
supersedes_revision: "review-freeze-first-production-candidate-20260806-r5"
---

# Re-review: Freeze the first production candidate

## Verdict

`PASS`. No material finding remains. Exact candidate
`248b3316651e681d9d4c78f81bec0c84a4cc822c` is unchanged, the r5 source/review-chain/browser/
performance boundary remains accepted, and the bounded r6 correction closes the sole custody P1:
the actual macOS arm64 ZIP, artifact-bound legal files and sanitized live/fault/process receipts were
retained in a permission-restricted bundle until this different-actor review could inspect and
independently exercise them.

This PASS accepts the first local, unsigned macOS arm64 Pi-native vertical-slice candidate for
omp-flow Finish. It does not publish or sign the artifact, promote Campaign claims to `verified`,
prove Windows/Linux, updater/install/rollback, full Package/Remote/external-Engine coverage, full UI
completion or OmniMind V1 completion. Finish must use the same candidate SHA; any production content
change invalidates this review.

## Findings

None.

## Closed r5 finding — evidence custody

Review bundle `/tmp/omnimind-freeze-evidence-r6.4O3L9a` existed throughout this review with root mode
`0700` and every retained file mode `0600`. Its `MANIFEST.sha256` digest is
`bda3c20abbd9147cfbbb7896871c2dbf52fbd4253c260572922ca8c1e17a09fc`; independent
`shasum -a 256 -c MANIFEST.sha256` verified all 11 listed materials before and after review.

The bundle contains the exact ZIP and builder metadata, artifact-extracted dependency inventory,
CycloneDX SBOM and notices, source/artifact/custody audits, a sanitized live summary and executable
command/result receipts. It contains no provider root, raw provider response, prompt/response body,
credential or secret endpoint. An independent exact-value scan used the authorized `0600` inventory
only in process memory: six secret-like credential candidates had zero matches across the final
bundle and all 28,901 extracted ASAR files. The four current MiMo/DeepSeek public endpoint forms had
zero bundle matches; the two endpoints present in the curated Pi runtime appeared only in the eight
expected `@earendil-works/pi-ai` provider data/runtime/source-map paths. No value was printed or
persisted by this reviewer.

The disposable detached clone `/tmp/omnimind-freeze-clone-r6.JGWWPq` is deleted and all reviewer
smoke/extraction roots were cleaned. The evidence bundle must now be deleted by the main thread,
because the different-actor review has completed; it must not be copied into Git or retained as a
secret-bearing product artifact.

## Candidate and preceding chain

- Reviewer operation `c2237734c2fe487cbd6f44e5b454fb8e` points to completed implementer operation
  `a8b3caa97ef94900a401e8694701bd21`; both resolve the same Freeze Work/handoff and the actor IDs
  differ.
- Current `HEAD`, r6 source identity, handoff and embedded artifact provenance all resolve to
  `248b3316651e681d9d4c78f81bec0c84a4cc822c`, tree
  `5ef3093e2cf1755ea25727dc2680df1bae7c0efc`. The artifact ASAR `package.json` embeds that exact SHA
  as `omnimindCommitHash`.
- Base remains `8e67eaba404b1561895d2959e1e9b597e2fa12da`; the range remains exactly 6,778 paths,
  125,284 insertions and 353,226 deletions with a clean `git diff --check`.
- Every current preceding Work review remains `PASS` with a completed different-actor predecessor.
  The accepted Synara intake Works and same-state human visual calibration precede the candidate.
- Historical T0 commit/tree, fixed and selective source revisions, source closure and byte-identical
  MIT copies remain tied to their own evidence boundaries; no T0 smoke was relabelled as candidate
  proof.
- r5 review hash `68842660327707e4d5386d7f609acda43167158fab2db28cec5b45c0b1be7e73`
  matched the r6 handoff's protected-state record before this authorized superseding review was
  written. All other protected user/tool hashes remain outside this verdict and unchanged.

## Artifact, legal and process review

- ZIP `OmniMind-0.1.0-alpha.0-arm64.zip` is exactly 168,752,127 bytes with SHA-256
  `6835affbc29006fd7cd737c1535f20567617234dc47654ffa2cfebc7c546e531`.
- Builder metadata is 929 bytes with SHA-256
  `637031fa8da85f6231912b4942d191c8610a2b5cd7a84476b9b13764ced57c05`.
- Independent launch of the retained ZIP passed the packaged macOS startup observable and found
  exactly one Service, one Native Host and a renderer in the Electron process group, using isolated
  disposable state.
- The app is `app.omnimind.desktop`, product `OmniMind`, version/build `0.1.0-alpha.0`, thin arm64;
  the local signature is ad hoc with no Team ID, exactly as scoped.
- Independent ASAR closure found 230/230 disclosed package identities, exactly one Native Host file
  (`apps/native-host/dist/index.mjs`), zero retired execution-path matches and 4,014 glyphs.
- The ASAR's exact legal files are byte-identical to the retained copies: inventory SHA-256
  `3cb504e193493d44dd0513453ee6b51ec3b58c2b4c8f302ecdafadb3de5af2a4`, SBOM
  `ace07fdb4220fb81afdacc6636aa86c1131a9e0ed791c5d4151341251fd48049`, notices
  `130c49d2d0e048fa968223e34a3248c66663d009a6d1d2f7949c860a7d54331b`.
  Inventory and CycloneDX each contain 230 components for `release-target/mac/arm64` and the SBOM
  points back to the exact inventory digest.
- The only bundled Pi dependency identities are `pi-agent-core`, `pi-ai`, `pi-coding-agent` and
  `pi-tui`, all under `@earendil-works` at `0.81.1`.

## Real Pi and fault evidence

The retained sanitized receipt records two bounded, real Pi `0.81.1` journeys, one each for MiMo and
DeepSeek. For each provider: new Chat, same-Conversation continuation and folder-backed Agent settled;
the continuation lineage is `continued`; thinking, usage and settlement were observed; the Agent
observed tool start/settle; all three dispatch attempts equal one; automatic replay counts are zero;
requested and active Package generation match; persisted state, Host output and probe output report
no credential leak. The summary contains no prompt or response content and makes no benchmark or
cross-provider parity claim.

The tracked journey probe implements those exact Product/Host observables. Independent reruns of the
retained candidate's bounded fault suites also passed: Service acceptance/uncertainty/recovery
4 files / 41 tests, Native Host runtime/response boundary 2 files / 23 tests, and Desktop broker/
Host/process separation 3 files / 6 tests. Together with the independent packaged startup above,
these results preserve `delivery_unknown`/`outcome_unknown`, zero blind replay, broker recovery,
Host crash containment and the separate Electron/Service/Native Host topology.

## Retained r5 verification boundary

The r5 reviewer already accepted as internally consistent the exact candidate/diff, current review
chain, T0/legal references, protected-state hashes, root install/build/typecheck/quality/test results,
55 ordinary browser files / 150 tests, 3 performance files / 7 tests, real route and 100k/400k
budgets, CJK/IME, Electron browser e2e and the prior human visual calibration. r6 correctly did not
repeat those unchanged gates. This re-review did not reinterpret the Linux geometry diagnostic as a
PASS; Linux remains outside the first macOS slice.

## Independent verification

| Command / inspection | Result |
| --- | --- |
| operation/predecessor records, r6 handoff, Freeze Work and r5 review | PASS; same Work/output, completed predecessor, different actor; correction is limited to the sole custody P1 |
| bundle mode/file inventory; `shasum -a 256 MANIFEST.sha256`; `shasum -a 256 -c MANIFEST.sha256` before and after review | PASS; root `0700`, all files `0600`, manifest digest exact, 11/11 entries verified |
| ZIP/builder `stat` and SHA-256 | PASS; 168,752,127-byte ZIP and both claimed digests exact |
| retained ZIP extraction; app plist, Mach-O and `codesign -dv --verbose=2` inspection | PASS; OmniMind identity/version, arm64 and scoped ad-hoc signature agree |
| `verifyPackagedLegalClosureArchive(<retained ZIP app.asar>)` | PASS; 230 packaged identities |
| direct ASAR inventory and legal-file extraction/digest comparison | PASS; one Native Host path, zero retired paths, 4,014 glyphs, 230 inventory/SBOM components, retained legal bytes exact |
| `node scripts/verify-packaged-desktop-startup.ts --assets-dir <bundle>/final-artifacts --platform mac --arch arm64 --version 0.1.0-alpha.0 --timeout-ms 90000` | PASS, exit 0; independent packaged Electron/Service/Native Host startup/process-tree proof |
| in-memory exact secret/endpoint scan over final bundle and extracted ASAR | PASS; credential matches 0/0; bundle endpoint matches 0; only expected public Pi runtime endpoint paths in ASAR |
| structural validation of `live-summary.json` against tracked `liveJourneyProbe.ts` observables | PASS; both providers, three settled journeys each, continuation/tool/thinking/usage/generation/attempt/replay/leak claims present and sanitized |
| Service fault command from `verification-summary.json` | PASS, exit 0; 4 files / 41 tests |
| Native Host fault command from `verification-summary.json` | PASS, exit 0; 2 files / 23 tests |
| Desktop broker/process command from `verification-summary.json` | PASS, exit 0; 3 files / 6 tests |
| clone/reviewer-temp cleanup and final candidate/status inspection | PASS; clone and reviewer temp roots absent; candidate unchanged; protected shared dirty/untracked state preserved |

No production source, Work, handoff, Campaign state, Git index, commit or protected user file was
modified. The sole authored repository output is this superseding Review Concept.

## Dispatch identity

- role: `reviewer`
- actorId: `freeze_first_production_candidate_reviewer_r6`
- receipt: `c2237734c2fe487cbd6f44e5b454fb8e`
- predecessor receipt: `a8b3caa97ef94900a401e8694701bd21`
- predecessor output: `../handoffs/freeze-first-production-candidate.md`
- conclusion: `PASS`; exact candidate may proceed to Finish, then the retained evidence bundle must be deleted
