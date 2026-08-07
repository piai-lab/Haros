---
type: "Implementation Review"
title: "Review: Authoritative Product-truth complexity v6 meter"
work: "../work/product-truth-complexity-v6.md"
handoff: "../handoffs/product-truth-complexity-v6.md"
verdict: "FAIL"
revision: "review-product-truth-complexity-v6-r1"
actor_id: "product_truth_meter_v6_review"
dispatch_receipt: "9c0aff3da0cf4c638da4dc7ae17c7a71"
predecessor_receipt: "b480d6ba3f0a4a948c6d5d566545c7b9"
predecessor_output: "../handoffs/product-truth-complexity-v6.md"
reviewed_candidate: "e14f72004d5a64f3ebd07b0842b027e137e2ca32"
reviewed_parent: "2621b086e50f9daa256f9d194ebe8a7d670c41cc"
accepted_design: "a8b4d52af33912258e13ab5d949629829b8f23f9"
---

# Review: Authoritative Product-truth complexity v6 meter

## Verdict

`FAIL` / changes requested for immutable meter candidate
`e14f72004d5a64f3ebd07b0842b027e137e2ca32`.

The predecessor handoff matches the assigned Work and receipt, binds the accepted Design and names
the immutable meter candidate. Reviewer actor `product_truth_meter_v6_review` is different from
implementer actor `product_truth_meter_v6`. The candidate is mechanically reproducible: all 122
authored tests pass, two B0 reports are byte-identical, scripts typecheck, the commit contains
exactly 122 allowed additions, and the v6 bytes remain unchanged in the later handoff commit.

The candidate-independent seam nevertheless accepted nine independently derived unsafe overlays:
five classifier origin/validation/cleanup bypasses, three release-capable scheduler/resource flows,
and one non-exact reset code. It also rejected two mandatory safe controls: exact rethrow of the
same reset object and a release after `continue` inside exact `while(false)`. A changed non-source
`package.json` overlay was also accepted even though the seam contract excludes non-source and
dependency paths. Each semantic overlay was derived from an authored positive by one bounded
change; the report received no expected verdict or fixture identity. These are material failures of
the claimed shared event/resource ICFG authority, so this Review authorizes no B1 receipt,
destructive execution or Product implementation.

No repair was made. V6 remains immutable rejected evidence; correction requires a new meter
version, immutable candidate, B0 handoff and different-actor Review.

## Findings

### P0 — classifier validation is token counting in source order, not a value-bound reachable must-fact

**Cause.** `measure-complexity-v6.mjs:2828-2853` recognizes any `if` whose nested throw text contains
`copy identity mismatch`, counts five equality operators and two `stringify` calls on arbitrary
operands, then calls the guard “dominating” solely when `guard.end <= return.start`. The emitted
event list at `:2564-2614` is not used to establish branch reachability, operand provenance,
validation-success edges or domination of the later SQLite open.

**Consequence.** Two hidden copier overlays returned the exact strict-descendant copy yet were
accepted with `directToolClassifierCopyAuthority.derived.status = exact` when:

- the authored identity/hash/manifest guard was nested under `if (false)`; or
- the guard compared unrelated constants and stringified unrelated constant objects.

Neither path establishes source identity stability, copy byte/digest equality or repeated manifest
equality. The meter can therefore approve an unvalidated private copy before the destructive tool
uses its classification.

**Smallest repair.** Represent each required validation as a resolved event whose operands carry the
specific source/copy/manifest resource identities. Propagate only the validation-success successor,
and require that fact on every reachable predecessor of both copy return and SQLite open. Literal
false/unreachable guards and unrelated values must contribute no fact; unknown helper/control flow
must fail closed.

### P0 — scratch freshness, escape and all-completion cleanup remain syntactic local checks

**Cause.** Scratch escape rejection at `:2805-2812` only notices assignment to an outer bare
identifier. It does not model writes through a module object/property. Cleanup at `:2873-2914`
finds calls by symbol/text and checks only conditional-expression/`if` ancestors and catches nested
inside the selected `finally`; it does not execute short-circuit truth edges or propagate cleanup
failure through an outer catch. Database close is likewise reduced to presence plus an ancestor
check at `:2916-2924`.

**Consequence.** Three independent hidden overlays still reported the exact classifier flow when:

- `invocationScratchRoot` escaped into a module-level object's property;
- an outer `try/catch` swallowed any close/remove/absence failure and returned a safe value; or
- both remove and absence calls appeared only as `false && call(...)`.

The first makes invocation-private lifetime untrue; the latter two allow retained scratch and a
normal safe disposition after cleanup never ran or failed.

**Smallest repair.** Give scratch, database and copy concrete resource tokens and track property,
parameter, return, closure and global/module escapes. Run close → exact-root remove → exact absence
through the same completion graph for every normal, return and business-throw path. Model
short-circuit/switch truth and cleanup throws across enclosing catches/finally; only propagated
fail-closed abrupt cleanup failure may omit a safe completion.

### P0 — scheduler and owner-lock proof ignores callback identifiers, event registration and real reachability

**Cause.** Scheduler collection at `:3586-3611` examines only inline function-like arguments to a
small terminal-name list. It therefore skips a local function identifier and a literal-object
property passed as the callback, and the list does not include event registration. The later bounded
executor at `:3704-3744` has no `pendingTasks` component at all; it only poisons a scheduler call if
the separately populated global `detachedReleaseSites` list is nonempty. Conversely, the final
source-position scan at `:4079-4084` treats any textual prior release as reachable, even when the
bounded CFG proves its loop executes zero times.

**Consequence.** Three release-capable overlays were accepted as analyzed/held after scheduling
`releaseDatabaseLifecycleLock(lock)` through:

- `Promise.resolve().then(releaseLater)` where `releaseLater` is a local function;
- `Promise.resolve().then(callbacks.releaseLater)` where the callback is a literal-object property;
- a Node `EventEmitter.once(...)` handler.

The first two are unjoined Promise tasks that can release before the later Product database sink;
the event registration is an unresolved release-capable pending resource and must fail closed under
the accepted interface. Beside them, an exact same-chain joined non-releasing Promise control
passed, while an unreachable release after `continue` inside exact `while(false)` was incorrectly
rejected as `OWNER_LOCK_RELEASE_PRECEDES_CURRENT_IO`.

**Smallest repair.** Put resolved local/property/parameter/return/closure callback points-to flow and
event/timer/Promise/Effect scheduling into `State.pendingTasks`. Join/discharge only the identical
task/chain; merge conditional predecessors conservatively. Derive release reachability from CFG
states rather than text position, so exact zero-iteration and post-`continue` code contributes no
release while an unjoined or unresolved release-capable task makes the lock unknown.

### P0 — reset terminal identity is substring-based and exact rethrow loses identity

**Cause.** Throw classification at `:3768-3775` uses `throwText.includes(errorCode)`. Catch execution
at `:3827-3843` erases the thrown disposition to `normal`; rethrowing the caught binding is then
classified from its identifier text as `throw:other`. There is no exception-object identity in the
state.

**Consequence.** Replacing the required code with
`PREBASELINE_RESET_REQUIRED_NOT_EXACT` was unexpectedly accepted for all present assignments. The
adjacent safe control `catch (error) { throw error; }`, which rethrows the exact same reset object,
was incorrectly rejected with `LEGACY_PRESENT_TERMINAL_INVALID`. The meter thus accepts a different
error contract while rejecting identity-preserving control flow.

**Smallest repair.** Allocate an exception token carrying the exact configured code only at the
resolved reset construction/throw, preserve that token through catch bindings and exact rethrow,
and require the identical token/code at every present terminal. Never infer typed identity from a
substring of source text.

### P1 — virtual overlay admission includes non-source dependency/configuration members

**Cause.** Overlay admission at `:257-266` treats `.json` as a source extension and relies on broad
Work production membership. It does not reject dependency or package-manifest paths as required by
the interface.

**Consequence.** Both root `package.json` and `scripts/package.json` were accepted as virtual source
overlays. A byte-changed root `package.json` (one additional newline, new bound digest) also produced
a successful report. The reviewer seam therefore does not have the advertised source-only,
authority-preserving input boundary.

**Smallest repair.** Build the overlay allowlist from frozen TypeScript/JavaScript production and
direct-tool source identities only, then explicitly subtract every authority, Work, universe,
dependency/lock/manifest and policy/configuration identity before decoding bytes. Add changed-byte
non-source negatives, not only an out-of-membership README case.

## Independent checks

Hidden review used only in-memory overlays against frozen members and disposable `/tmp` scripts;
it did not alter the candidate or repository production paths. The unsafe cases were single-change
mutations of authored positives, while the exact same-chain non-releasing Promise control remained
accepted. The two safe-control false rejections demonstrate that the FAIL is not a request for a
blanket reject-all analyzer.

The implementation's object named `unifiedProofIr` is a serialized event inventory plus per-owner
reports; the material gates above still use category-specific AST scans, source-position checks and
independent callback lists. The hidden outcomes are therefore consistent with the inspected cause,
not unexplained test flakiness.

## Mechanical verification

- `bun x vitest run product-truth/measure-complexity-v6.test.ts --maxConcurrency=4` — PASS, one file /
  122 tests in 307.56 s.
- Two runs of `node scripts/product-truth/measure-complexity-v6.mjs --ref 7582170a...` plus byte
  comparison — PASS; 1,199,800 bytes, SHA-256
  `c1b89a77d9e78e0dbcacc650b8dceb07d0a3e2eea99c738ce29c23ece1f04d69`.
- `bun run --cwd scripts typecheck` — PASS.
- Candidate script/config/test SHA-256 reproduce the handoff:
  `c63d8dc192244034277993142d5b231e801543cb55c79d30597ade2781579f8d`,
  `5b6dc528f0cdfe0bca70d833116fc6d78d73a5ce57992dfeedc3685103d22c9e`,
  `8bcb27ef5072be7bd86226afb952179b3cead30699f3a06ef83142fea3b7fd71`.
- Candidate scope — PASS mechanically: parent `2621b086...`, exactly 122 additions, zero
  modification/deletion, every path under the Work's four allowed v6 outputs; `git diff --check`
  passed.
- The authored test independently reproduces every v1-v5 instrument digest. Direct comparison from
  candidate to the later handoff commit found no v6 byte change.
- No real `~/.omnimind`, Product/user state, runtime, provider or network resource was read or
  changed.

## Required return

Return the Work to design/implementation and replace the category-specific semantic shortcuts with
the accepted shared completion-aware resource analysis: value-bound classifier validations,
property/global escape, all-completion cleanup, callback/event pending-task flow, CFG-reachable
lock transitions and exact exception identity. Add every unexpected success and both safe-control
false rejections to the next immutable version's matrix. Freeze a new meter candidate and repeat
deterministic B0 plus different-actor Review; do not edit or relabel v6.

## Dispatch identity

- role: `reviewer`
- actorId: `product_truth_meter_v6_review`
- receipt: `9c0aff3da0cf4c638da4dc7ae17c7a71`
- predecessor: `b480d6ba3f0a4a948c6d5d566545c7b9`
- predecessor output: `../handoffs/product-truth-complexity-v6.md`
- verdict: `FAIL`
- explicitly allowed fix: none
