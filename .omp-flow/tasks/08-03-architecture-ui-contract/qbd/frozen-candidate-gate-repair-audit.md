---
type: "QbD Audit"
title: "Scoped QbD 2: frozen-candidate root gate repair"
entry: "../work/index.md"
verdict: "FAIL"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "f34f5721e86342d6b04512a9191d3412"
---

# Scoped QbD 2: frozen-candidate root gate repair

This is the requested re-audit of only F-01 from the prior
[frozen-candidate payload audit](frozen-candidate-payload-repair-audit.md), after the bounded root
test-discovery repair in the current [work map](../work/index.md) and
[Frozen Candidate Integration](../work/frozen-candidate-integration.md). It carries forward the
prior audit's positive judgment on the three byte-identical research owners, deletion of
`discovery-record.md`, payload allowlist, temporary-index construction and same-commit
review/Finish ordering.

## Verdict

**FAIL.** Prior F-01 is closed. Root `package.json` changes exactly one existing command from
`node --test` to `node --test test/*.test.mjs`; `npm test` and `npm run quality` both pass 74/74 in
a clean detached temporary-index candidate. An independent JUnit discovery probe attributes 51
tests to `test/document-contract.test.mjs` and 23 to `test/quality.test.mjs`, with no test or smoke
file under `vendor/ui`. Source, identity, focused and total gates are green on that same diagnostic
SHA, candidate cleanliness holds before and after, and shared branch/index/dirty/ref fingerprints
remain unchanged.

The full Work 5 candidate is nevertheless still not handoff-ready: its separately required plain
`git diff --check <B> <C> --` exits 2 on eight newly added Markdown files with blank lines at EOF.
Two are the research files whose exact existing bytes the carried payload decision forbids
integration from rewriting. This is new direct clean-candidate evidence, not a reopening of the
closed research payload or product scope. One material Work 5 gate conflict remains.

This verdict authorizes no implementation, Work edit, candidate minting, Finish transition or
human calibration by itself.

## Prior F-01 closure

### Exact authorized change

Relative to `HEAD`, [`package.json`](../../../../package.json) has a one-line `1 insertion / 1
deletion` diff:

```diff
-    "test": "node --test",
+    "test": "node --test test/*.test.mjs",
```

An independent parsed-object comparison found no other field or script change. `quality` remains
`npm run check:identity && npm run check:sources && npm test`; the source and identity commands are
unchanged. Work 5 authorizes only this exact root test-discovery edit, without adding a second
quality command, installing donor dependencies, changing donor bytes or skipping either root
governance suite.

### Clean same-SHA behavior

A task-specific temporary index was seeded from base
`2445acb987e443b44b7dc819de3de44c3d68b391`, populated with the current approved payload including
the exact `package.json` repair, and written as an isolated one-parent diagnostic commit. A
disposable local repository checked out that commit detached and was clean before and after all
commands.

Results on the same diagnostic SHA:

| Check | Result |
| --- | --- |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | pass, 74/74 |
| `npm run check:sources` | pass, 1 adoption / 1 exact provenance root |
| `npm run check:identity` | pass, 6,477 source files / 0 findings |
| exact `npm test` | pass, 74/74; command echoed `node --test test/*.test.mjs` |
| JUnit discovery attribution | 51 document-contract + 23 quality tests; exactly the two root files |
| donor/smoke discovery | 0 files under `vendor/ui`; Electron smoke not launched |
| exact `npm run quality` | pass: identity, source and bounded `npm test`, 74/74 |
| pre/post detached status | clean / clean |
| `HEAD:vendor/ui` | unchanged tree `630f17e61abc478114bf83c1d740977c9f68b910` |

The earlier Electron `ENOENT` and missing workspace/Vitest package failures do not recur. The
repair is a root governance-test discovery boundary, not a claim that donor tests pass or an
authorization to repeat unchanged donor smoke.

## New blocking finding

### F-02 — FAIL: plain candidate diff-check conflicts with byte-frozen payload files

**Cause and evidence.** Work 5 lines 63–65 and 167–178 require plain
`git diff --check <B> <C> --` on the same clean candidate. That command returned exit 2 with exactly
these findings:

```text
.omp-flow/tasks/08-03-architecture-ui-contract/decisions/qbd-1-repair.md:38: new blank line at EOF.
.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/complete-workbench-contract.md:100: new blank line at EOF.
.omp-flow/tasks/08-03-architecture-ui-contract/work/bounded-document-contract-validator.md:103: new blank line at EOF.
.omp-flow/tasks/08-03-architecture-ui-contract/work/complete-workbench-contract.md:112: new blank line at EOF.
.omp-flow/tasks/08-03-architecture-ui-contract/work/declared-provenance-governance.md:116: new blank line at EOF.
.omp-flow/tasks/08-03-architecture-ui-contract/work/durable-authority-route.md:112: new blank line at EOF.
research/README.md:18: new blank line at EOF.
research/decision-record.md:66: new blank line at EOF.
```

The first six are accepted pre-freeze Bundle history. The two research paths are explicitly
allowlisted as `(existing bytes only)`; Work 5 and the carried payload PASS require candidate bytes
to equal the pre-integration inputs and prohibit integration-time research rewriting. Therefore
the current map simultaneously requires those bytes to remain unchanged and requires a command
that rejects them.

**Concrete consequence.** Even though F-01's focused/source/identity/total gates are now green,
Work 5 cannot truthfully report the complete required gate set green on `C`. Normalizing the two
research files during integration would violate the byte-preservation proof; ignoring exit 2
would make the handoff and independent review false. Either path blocks the reviewed-C → Finish
CAS transition.

**Affected decisions.** PRD AC-13/AC-15; the Design's candidate final gate; Work 5's exact research
payload, clean verification and handoff-ready conditions; the work-map completion formula.

**Smallest remedy.** Author one explicit Work 5 verification-policy repair that runs:

```text
git -c core.whitespace=-blank-at-eof diff --check <B> <C> --
```

This exact full-candidate probe returned exit 0. It preserves the research and Bundle bytes,
disables only the harmless blank-at-EOF category and retains Git's other whitespace checks. The
Work and focused command list must name this policy rather than applying hidden local Git config.
If the human instead chooses byte normalization, the research-byte decision must be explicitly
changed and independently reviewed; integration may not make that choice silently.

**Why hiding or waiver is insufficient.** Plain `git diff --check` is currently a mandatory
command and fails deterministically. Suppressing its output, accepting exit 2, rewriting frozen
research bytes or setting an unrecorded repository/user config would break exact-SHA evidence or
make the verification irreproducible. The proposed command is a bounded authored repair, not a
waiver of the full diff check.

## Carried payload and scope checks

The prior research/deletion payload remains accepted and unchanged:

| Path | SHA-256 |
| --- | --- |
| `research/README.md` | `3e96113c88218d3cc9a7c704da666e782ee01773d3462f1a5f70146a11db88f3` |
| `research/source-review.md` | `079c3b23ce94726a1ce6d62ef74bfdebea98f51579753be8668a582f08ecee81` |
| `research/decision-record.md` | `28b9674e84ecf763301b49e5d2db4b32d562e06c285a9c4469495417e754742e` |

An independent temporary-index scope probe confirmed the candidate research blobs equal the
current inputs, `discovery-record.md` is deleted, the candidate `package.json` blob equals the
one-line repair, and no `.DS_Store`, tool/config root, `vendor/ui` change, `apps` or `packages` path
enters `B..C`. The previous 25/25 durable-link result is carried unchanged.

The root test boundary adds no product/UI/runtime behavior. Work 5 still excludes source-domain
mapping, UI takeover, Native Host, Product/Engine authority implementation, old Runtime/state
deletion, donor smoke repetition, a fourth QbD 1 audit and Campaign claim promotion.

Candidate identity and ordering also remain unchanged:

```text
B -> temporary-index C -> clean verification on C
  -> SHA-bound handoff -> independent review of C
  -> Finish CAS fast-forward B to the same C
```

No amend, cherry-pick, squash, replacement commit or evidence-only ref is authorized. F-02 blocks
the verification step but does not recreate the prior review/Finish identity cycle.

## Independent probe summary

| Probe | Result |
| --- | --- |
| Parsed `package.json` semantic diff | pass, only `scripts.test` changed |
| Clean temporary-index candidate includes current package blob | pass |
| Focused/source/identity/`npm test`/`npm run quality` on one SHA | pass, results above |
| JUnit file discovery | exactly two root suites, 74 tests; no donor/smoke file |
| Plain `git diff --check B C --` | **fail**, exit 2, eight blank-at-EOF findings |
| `git -c core.whitespace=-blank-at-eof diff --check B C --` | pass, exit 0 |
| Forbidden payload-path scan | pass, 0 findings |
| Shared symbolic branch/HEAD/index/status/refs | unchanged before/after |
| Disposable candidate directories | removed; no audit probe remains |

The diagnostic commits were isolated and automatically removed; none was a formal Work 5
candidate, ref, handoff, review or landing action.

## Human calibration options

The applicable options are:

1. authorize the single-command Work 5 diff-check policy repair above, then request a scoped
   re-audit of F-02 only;
2. explicitly authorize and independently review byte normalization, including the changed
   research preservation decision, then re-audit that payload;
3. defer or stop.

F-01 needs no further repair. This audit does not reopen the accepted research payload, QbD 1 or
product/runtime scope, and it does not authorize Execute or Finish.
