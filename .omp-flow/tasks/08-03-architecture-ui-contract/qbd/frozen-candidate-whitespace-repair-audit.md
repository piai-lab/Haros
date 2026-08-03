---
type: "QbD Audit"
title: "Scoped QbD 2: frozen-candidate whitespace repair"
entry: "../work/index.md"
verdict: "PASS"
actor_id: "architecture_ui_qbd_2_1"
dispatch_receipt: "54592efa9209408f8ec8abdc3a126838"
---

# Scoped QbD 2: frozen-candidate whitespace repair

This is the requested final re-audit of only F-02 from the prior
[root gate repair audit](frozen-candidate-gate-repair-audit.md). It evaluates the explicit
full-candidate whitespace policy now authored in the current [work map](../work/index.md) and
[Frozen Candidate Integration](../work/frozen-candidate-integration.md). It carries forward the
prior PASS judgments on the research/deletion payload, temporary-index construction, bounded root
test discovery, candidate scope and reviewed-commit/Finish identity.

## Verdict

**PASS.** F-02 is closed and there is no unresolved blocking finding. Work 5 now explicitly runs:

```text
git -c core.whitespace=-blank-at-eof diff --check B C --
```

The exact command passed on a clean detached diagnostic candidate containing the current approved
payload. A separate object-only negative-control candidate changed only `README.md` line 1 by
adding trailing spaces; the same configured command returned exit 2 and reported
`README.md:1: trailing whitespace.` Thus the repair excludes only Git's blank-at-EOF category
that conflicts with byte-frozen inputs; it does not turn off ordinary whitespace detection.

Focused, source, identity, bounded `npm test` and total `npm run quality` checks are all green on
the same clean candidate. The three research owners remain byte-identical, the imported UI tree
is unchanged, no forbidden path enters the candidate, and the shared branch, real index, dirty
state and refs remain unchanged. Work 5's review/Finish CAS ordering and its product, runtime and
QbD 1 exclusions are unchanged.

This audit does not itself authorize Execute, mint a formal candidate, advance Finish or replace
the required human work-map calibration.

## F-02 closure

### Authored policy is exact and reproducible

Both the work map and Work 5 name the configured command rather than relying on local Git config
or an undocumented waiver. They explain that `-blank-at-eof` preserves the already-accepted
research and Bundle bytes while every other `diff --check` whitespace category remains fatal.
The command appears in Work 5's clean-candidate procedure, focused verification list and done
condition.

No competing plain full-candidate `git diff --check B C --` remains in the Work 5 route. The
focused checks owned by Works 1-4 are unchanged and remain scoped to their writable paths.

### Positive and negative evidence

A task-specific temporary index was seeded from base
`2445acb987e443b44b7dc819de3de44c3d68b391`, populated only with the current approved payload and
written as isolated diagnostic candidate `309673303ec88c3b2cbd242626546ac6d43b437f`. A disposable
local repository checked out that commit detached and was clean before and after the probes.

| Probe | Result |
| --- | --- |
| exact configured full-candidate `diff --check` | pass, exit 0 |
| object-only control with trailing spaces at `README.md:1` | fail as required, exit 2; `trailing whitespace` |
| good candidate tree before/after the control | identical, `524913843166879cda856de523b9962b9fd1e4a4` |
| focused document-contract + quality tests | pass, 74/74 |
| `npm run check:sources` | pass, 1 adoption / 1 exact provenance root |
| `npm run check:identity` | pass, 6,478 source files / 0 generated findings / 6 rules |
| exact bounded `npm test` | pass, 74/74 |
| JUnit discovery attribution | exactly the two root test files; no donor or smoke file |
| exact `npm run quality` | pass, 74/74 after identity and source checks |
| detached candidate status | clean before and after |

The negative control was a separate temporary commit whose README blob alone contained the
deliberate non-EOF defect. It was never checked out, never changed the good candidate object and
never touched the shared worktree. Its failure demonstrates that the authored setting is a narrow
category repair, not a blanket suppression.

The two diagnostic commits and their object store were ephemeral. Cleanup removed the disposable
repository, indexes and objects; no ref, worktree or audit probe remains. Neither diagnostic SHA
is a formal Work 5 candidate, handoff, review or landing action.

## Carried gate and payload evidence

The prior F-01 PASS remains valid. Root `package.json` still changes only the existing `test`
command from unbounded `node --test` to bounded `node --test test/*.test.mjs`; its diagnostic
candidate blob equals the current input, and its base-to-candidate delta remains exactly one
insertion and one deletion. `quality` remains
`npm run check:identity && npm run check:sources && npm test`. No source/identity command, donor
dependency, donor byte or second quality route was added.

Current source and candidate SHA-256 values match for every byte-frozen research owner:

| Path | Source and candidate SHA-256 |
| --- | --- |
| `research/README.md` | `3e96113c88218d3cc9a7c704da666e782ee01773d3462f1a5f70146a11db88f3` |
| `research/source-review.md` | `079c3b23ce94726a1ce6d62ef74bfdebea98f51579753be8668a582f08ecee81` |
| `research/decision-record.md` | `28b9674e84ecf763301b49e5d2db4b32d562e06c285a9c4469495417e754742e` |

`discovery-record.md` is absent from the candidate. The forbidden-path scan found no `.DS_Store`,
tool/config root, `.obsidian`, `vendor/ui`, `apps` or `packages` change. Candidate
`vendor/ui` remains exact tree `630f17e61abc478114bf83c1d740977c9f68b910`.

During the complete probe, the shared fingerprints were equal before and after:

| Surface | Before / after |
| --- | --- |
| symbolic branch / HEAD | `codex/pi-native-v1` / `2445acb987e443b44b7dc819de3de44c3d68b391` |
| real index SHA-256 | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` |
| porcelain-status SHA-256 | `a18f16c26a1a5b1d8ad1a16b25519889692ef89d4a20a004f7a104047f6d8d8f` |
| refs SHA-256 | `a87c5dce8325e98aa356fd8a588d6fbc306f296a8632b00171cf1cc96bd36692` |

## Scope and identity remain bounded

The repair changes only the explicit Work 5 whitespace policy. Candidate construction still
includes the reviewed implementation allowlist, the three existing research owners without byte
changes, deletion of the replaced discovery record and accepted pre-freeze Bundle Markdown. It
still excludes source-domain mapping, UI takeover, Native Host implementation, Product/Engine
runtime authority, old Runtime/state deletion, donor smoke repetition, a fourth QbD 1 audit and
Campaign claim promotion.

The identity-preserving sequence remains:

```text
B -> temporary-index C -> clean verification on C
  -> SHA-bound handoff -> independent review of C
  -> Finish CAS fast-forward B to the same C
```

No amend, cherry-pick, squash, replacement commit, evidence-only ref or integration-time research
normalization is authorized. The repair therefore closes the only prior material conflict without
reopening the accepted payload, product scope or review/Finish decision.

## Human calibration options

The applicable options are:

1. accept this PASS and authorize the authored work map to proceed to Execute;
2. request a bounded clarification or another audit if genuinely new material evidence exists;
3. defer or stop.

F-01 and F-02 need no further repair on the evidence reviewed here. Human calibration remains the
authority for the forward transition.
