---
type: "QbD Audit"
title: "Scoped QbD 2: frozen-candidate payload repair"
entry: "../work/index.md"
verdict: "FAIL"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "508357c64461481f8a77cf910ff78b8f"
---

# Scoped QbD 2: frozen-candidate payload repair

This audit is limited to the Work 5 payload repair in the current
[work-map entry](../work/index.md) and
[Frozen Candidate Integration](../work/frozen-candidate-integration.md). It carries the prior
[scoped QbD 2 PASS](work-map-repair-audit.md) for the temporary-index, immutable-candidate and
Finish compare-and-swap design. It asks only whether adding the three existing canonical research
owners and deleting the replaced tracked discovery record yields a reconstructable clean
candidate without broadening scope, and whether the same-SHA verification/review/landing route
remains executable.

## Verdict

**FAIL.** The payload repair itself is sound: a temporary-index reconstruction from current base
`2445acb987e443b44b7dc819de3de44c3d68b391` produced a clean detached diagnostic candidate with
all three research files byte-identical, `discovery-record.md` absent, all durable local routes
resolved, no dirty/tool/runtime path admitted, and the focused, source and identity gates green.
The shared branch, real index, status and refs remained unchanged and the disposable repository
was removed.

However, the required total gate on that clean candidate is not executable as authored.
`npm run quality` reaches root `npm test`, whose current command is unbounded `node --test`.
It recursively discovers the exact adopted `vendor/ui` donor's smoke scripts and TypeScript tests.
The clean candidate deliberately contains neither donor `node_modules` nor generated Electron
artifacts, so the run fails on Electron `ENOENT` and many missing workspace/Vitest packages. This
prevents the candidate from reaching the handoff-ready condition and therefore prevents current
independent review and Finish CAS landing. One blocking finding remains.

This verdict does not reopen QbD 1, change the accepted product boundary, reject the three-file
research payload, or authorize any repair.

## Blocking finding

### F-01 — FAIL: the frozen clean candidate cannot pass its required total quality gate

**Cause and evidence.** Work 5 lines 63–65 and 167–178 require one `npm run quality` in a clean
repository detached at candidate `C`. Root [`package.json`](../../../../package.json) lines 12–13
defines:

```text
test    = node --test
quality = npm run check:identity && npm run check:sources && npm test
```

The diagnostic candidate was constructed through a separate temporary index and object directory,
then checked out detached in a disposable local repository. Before the total gate it was clean;
the focused document/quality suites passed 74/74, source validation passed with one exact root,
and identity/structure passed over 6,476 source files with zero findings. `npm run quality` repeated
those two green gates, then `node --test` traversed `vendor/ui` and failed. Representative failures
were:

- `vendor/ui/apps/desktop/scripts/smoke-test.mjs`: missing
  `apps/desktop/node_modules/.bin/electron` (`ENOENT`);
- donor Desktop/Web/package `.test.ts` files: missing `@synara/contracts`, `vitest` and other
  workspace dependencies.

This is not shared-worktree contamination: `.obsidian`, tool roots and every non-allowlisted dirty
path were absent from the clean candidate. It is also not caused by the new research payload. It
is a direct mismatch between the mandatory root quality command and the exact adopted source tree
that command recursively discovers.

**Concrete consequence.** Work 5 cannot truthfully satisfy its handoff-ready condition that the
same immutable `C` passes focused checks plus one total quality gate. Without that evidence an
independent Work 5 review cannot accept `C`, and Finish cannot perform the ordered CAS landing.
Proceeding would require waiving a human-required gate, misreporting a red command as green, or
adding unreviewed dependency/generated state to the clean repository.

**Affected decisions.** Final QbD 1 delivery item 5; PRD AC-15; the Design's candidate final gate;
Work-map completion; Frozen Candidate Integration's clean same-SHA verification, handoff-ready and
ordering conditions.

**Smallest remedy.** Add one bounded, independently reviewed root-quality discovery repair so the
existing `npm run quality` runs only OmniMind's root governance tests, for example by explicitly
scoping root `test` to `test/*.test.mjs` or an equivalent deterministic allowlist. Because
`package.json` is currently outside all five Work allowlists, the map must explicitly authorize
that exact governance change and its focused negative proof before a new candidate is minted.
Alternatively, a human-approved scoped Design/Work change may replace the total command with an
equivalent bounded gate; Work 5 may not silently do so during integration.

**Why safe degradation is insufficient.** A green frozen-candidate quality result is an explicit
delivery condition. Marking donor tests unavailable, ignoring the exit code, installing ad hoc
dependencies, or reporting only the 74 focused tests cannot establish that `npm run quality`
passed on delivered SHA `C`. Re-running the unchanged donor desktop smoke is also expressly out of
scope and would not fix root test discovery.

## Payload-repair judgment

No material defect was found in the three-file research/deletion repair itself.

### Canonical research and durable-route reconstruction

The diagnostic candidate contained current files with matching source/candidate SHA-256:

| Path | SHA-256 |
| --- | --- |
| `research/README.md` | `3e96113c88218d3cc9a7c704da666e782ee01773d3462f1a5f70146a11db88f3` |
| `research/source-review.md` | `079c3b23ce94726a1ce6d62ef74bfdebea98f51579753be8668a582f08ecee81` |
| `research/decision-record.md` | `28b9674e84ecf763301b49e5d2db4b32d562e06c285a9c4469495417e754742e` |

`discovery-record.md` was absent. The bounded validator's real-repository fixture passed in the
clean candidate, and an independent resolver checked 25 local links across AGENTS, root,
architecture, execution, Campaign and the three research owners with zero missing targets. The
research index routes fixed-source evidence to `source-review.md` and prior/superseded reasoning to
`decision-record.md`; the durable owner files no longer require the replaced root record.

### Scope and byte preservation

The current allowlist adds exactly the three research owner paths with `(existing bytes only)` and
`discovery-record.md` with `(deletion only)`. Work 5 separately requires pre-integration versus
candidate byte identity, makes rewrite a semantic change that returns to the owning Work, and
requires those hashes in the SHA-bound handoff. That is sufficient to stop integration from using
the new allowance as research-edit authority.

The reconstructed `B..C_probe` diff contained only the reviewed documentation/governance paths,
the three research owners, deletion of the old record and pre-freeze Bundle Markdown. A forbidden
path scan found none of `.DS_Store`, `.agents`, `.claude`, `.codex`, `.cursor`, `.obsidian`, `.omp`,
`.snow`, `vendor/ui`, `apps` or `packages`. The Bundle glob admitted Markdown only; its local
`.DS_Store` did not enter the tree. No source, runtime or tool configuration allowance was added.

### Candidate identity, review and Finish order

The repair does not disturb the previously accepted acyclic sequence:

```text
B -> temporary-index C -> clean detached verification on C
  -> SHA-bound Work 5 handoff -> independent review of C
  -> Finish CAS fast-forward B to the same C
```

The diagnostic construction proved the temporary-index and clean-checkout portions preserve the
shared symbolic branch, `HEAD`, real-index digest, dirty-status digest and refs digest. Work 5 still
forbids amend/cherry-pick/squash/reconstruction and requires a fresh candidate/review after any
content change. F-01 blocks the verification arrow; it does not revive the earlier commit/review
cycle or authorize Finish to create a new SHA.

## Independent checks

| Probe | Result |
| --- | --- |
| Temporary-index candidate construction from current `B` | pass; shared branch and real index were not moved/written |
| Detached candidate cleanliness before verification | pass, empty porcelain |
| Three research source/candidate byte comparisons | pass, hashes above |
| `discovery-record.md` absence | pass |
| Forbidden dirty/tool/runtime payload scan | pass, 0 findings |
| Durable local-link resolver | pass, 25 checked, 0 missing |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | pass, 74/74 |
| `npm run check:sources` | pass, 1 adoption / 1 exact provenance root |
| `npm run check:identity` | pass, 6,476 source files / 0 findings |
| `npm run quality` | **fail**, root `node --test` discovers donor smoke/tests without their runtime/workspace dependencies |
| Shared branch/HEAD/index/status/refs before-versus-after | pass, all digests unchanged |
| Disposable candidate directory cleanup | pass, no `omnimind-qbd-payload.*` directory remains |

The diagnostic commit was an isolated, automatically removed probe, not a formal Work 5
candidate, reachability ref, handoff or landing action.

## Scope preservation and calibration options

The repaired Work still explicitly excludes source-domain mapping, UI takeover, Native Host,
Product/Engine runtime authority, old Runtime/state deletion, unchanged desktop-smoke repetition,
a fourth QbD 1 audit and Campaign claim promotion. No first-four Work requirement or product
decision is reopened by this audit.

The applicable human options are:

1. authorize the smallest bounded root-quality discovery repair, review it, then request a scoped
   re-audit of only F-01 and the resulting Work 5 gate;
2. authorize an equivalent bounded replacement for the total gate through the normal Design/Work
   decision path, then re-audit that exact change;
3. defer or stop.

The three research files and discovery deletion need no further repair on the evidence observed.
This FAIL does not authorize Execute, candidate minting, Finish, implementation edits or another
QbD 1 audit.
