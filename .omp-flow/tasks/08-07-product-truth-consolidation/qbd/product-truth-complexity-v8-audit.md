---
type: "QbD Audit"
title: "Product-truth complexity v8 predecessor-delta authority audit"
verdict: "FAIL"
---

# Product-truth complexity v8 predecessor-delta authority audit

## Audit identity

- Bundle: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd`
- Bounded objective: independently challenge immutable v8 authority commit
  `83a62893ba81bf2e828ede2792e339dcef9b2a6e` across the PRD, Design, v8 interface,
  v8 measurement Work, B1 plus four downstream Product Works, and authored Work map.
- Entry Concept: [`interfaces/product-truth-complexity-v8.md`](../interfaces/product-truth-complexity-v8.md)
- Audit output Concept: `qbd/product-truth-complexity-v8-audit.md`
- Immutable audited commit: `83a62893ba81bf2e828ede2792e339dcef9b2a6e`
- Actor ID: `product_truth_complexity_v8_qbd`
- Dispatch receipt: `b74f9bf6f09a4c508073e4dd53db57af`
- Predecessor receipt: `e227012a8f134ff0b7de29dce9ed9259`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`

## Verdict

**FAIL**

- Risk: **critical** — the proposed meter can select an unauthoritative predecessor or accept a
  wrong declaration/new raw occurrence while reporting the core predecessor-delta gate green.
- Decision-critical blocking findings: **2**
- Advisory observations: **0**
- Total findings: **2**

The v8 direction is materially smaller and safer than the rejected semantic analyzers: it keeps
CFG/runtime behavior in B1, preserves v7 as historical B0 evidence, closes outside-Work bytes and
derived identities, and adds only one justified B1 production path. Two machine-authority gaps
remain. They prevent an implementation from satisfying the candidate-independent predecessor and
exact ingress claims without choosing semantics in meter code or configuration.

This verdict authorizes no v8 implementation, B1 receipt, destructive execution, Product Work
transition, or Campaign change.

## Confirmed evidence and passed checks

1. `HEAD` equals the assigned immutable commit and the worktree was clean at audit start. The
   commit changes ten linked PRD/Design/interface/Work documents only; it changes no production,
   dependency, v1-v7 meter, fixture, report, or user-state byte. `git diff --check` and Git object
   validation pass.
2. The v8 authority contains exactly one valid JSON block with no duplicate key. SHA-256 is
   `86ed9bbc10796605d338228c055fcf4a571af9762aa5a2d870204741b6a00ea8` over the
   canonical sorted-key JSON (`52a50b4c06e2d56189d1044ac3a9292f2eb15183678a80d1c9932b06a6ad8d87`
   over the literal JSON payload).
3. All five Work blocks parse as JSON with no duplicate keys. The B1 canonical fence changes from
   `926cc4a5b92459213d3e4de5880c463576af2f6a60f9078752a24e5e263c8a4e` to
   `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae` by exactly
   one production entry, `scripts/release-smoke.ts`; nothing is removed and its measurement and
   dependency arrays are unchanged. The other four canonical fences remain exactly:
   `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`,
   `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`,
   `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`, and
   `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.
4. Historical diff inspection confirms `scripts/release-smoke.ts` is the sole missing release
   production caller changed by failed B1; its change removes only `.lane` assertions. The only
   affected release-policy test is the already authorized `scripts/release-update-policy.test.ts`.
   No second release test path is required by that change.
5. Two independent v7 B0 executions are byte-identical with full report SHA-256
   `aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c` and reproduce
   812 ingress sites / 107 paths, 712 violations / 93 paths, ingress digest
   `d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a`, and
   violation digest `a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43`.
   Running v7 against failed B1 `50deefc1f8e904805c5c990756f3048de33c7ad5` reproduces exit 1 at
   `RAW_EFFECT_INGRESS_INVALID` / `RAW_EFFECT_OWNER_INVALID` before candidate acceptance.
6. Current v7 script/config/test hashes reproduce the accepted handoff values
   `d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2`,
   `79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712`, and
   `01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90`; all 64 v7
   fixture files remain present. The inherited Git reader rejects non-regular source modes, while
   v8 explicitly requires exact outside presence, mode, blob, import, ingress, and violation
   equality. No mode/symlink or outside-dependency relaxation was found in the authored scope.
7. Existing-target Markdown links in the changed documents resolve. Missing link targets are only
   explicitly promised future handoffs/reviews, not pre-existing evidence silently referenced as
   present.

## Blocking finding 1 — predecessor acceptance has no unambiguous evidence commit or machine mapping

**Cause.** The machine block requires one `predecessor-full-sha`, a handoff path/blob, Review
path/blob, receipt and `reviewed-candidate` (`interfaces/product-truth-complexity-v8.md:70-82`),
while prose says the meter loads the handoff and Review “from an immutable Git commit”
(`:118-124`). It never names a distinct full SHA for that evidence-bearing commit or defines which
required SHA is it. Those identities cannot be the same in the established workflow: the
implementation candidate exists first, then its handoff and Review are committed later. The
accepted v7 chain is a concrete witness: reviewed candidate
`5c3e61999e1d406873c957dd9dbb6847cc2487b9` does not contain the later handoff/PASS Review; those
are present in evidence commit `3d84708749ebeb1784b3243e2898de5623a89720`, whose parent is the
reviewed candidate.

The authored Work map gives a human-readable sequence (`work/index.md:73-90,145-168`) but no
machine block mapping each selected Work to its exact predecessor Work, handoff path, Review path,
report derivation and evidence commit. Meter config and candidate input are forbidden from adding
that mapping. “Branch forbidden” likewise does not state the required ancestor relations among
reviewed candidate, evidence commit and candidate under test. Review paths are reused across failed
and repaired attempts, so path text plus a receipt cannot select the correct historical blob.

**Concrete consequence.** A v8 implementation must either obtain the evidence commit/path mapping
from candidate/config authority, guess it from prose or filename convention, or read the handoff
and Review from the candidate under test. The first two violate `candidateMayChooseOrReplace=false`;
the third permits a candidate-authored PASS/report chain. An old green Review, failed/overwritten
Review, non-ancestor report, or report/blob mismatch can therefore become the comparison baseline,
and all later exact outside/inside comparisons can be internally deterministic but against the
wrong tree.

**Affected decision.** The v8 meter cannot yet be the sole candidate gate or authorize B1 and the
four sequential Product Works. This is a false-authority boundary, not missing routine test
evidence.

**Smallest repair.** Add one candidate-independent machine predecessor table owned by the authored
Work map or a linked interface. For each Work, freeze the predecessor Work ID, comparison report
derivation/path, handoff path and Review path. Require two distinct full SHAs:
`reviewedCandidateSha` and `evidenceCommitSha`; bind exact handoff/Review blob IDs, report SHA-256,
review receipt and actors. Require the reviewed candidate to be the handoff and Review candidate,
the evidence commit to contain those exact blobs and descend from the reviewed candidate, and the
candidate under test to descend from the accepted evidence commit. For B1, explicitly bind the v8
Review evidence commit to the immutable B0 report while marking historical `50deefc1...` comparison
as verification-only, never an eligible accepted predecessor.

**Why removal or safe degradation is insufficient.** Disabling one candidate or hiding a report
does not establish which remaining report is authoritative. Removing ancestry/blob binding leaves
the meter free to compare destructive work against a self-selected baseline; narrowing the claim
would abandon the central predecessor-delta decision rather than safely degrade runtime behavior.

## Blocking finding 2 — ingress identity cannot enforce exact declarations or “no new occurrence”

**Cause.** The canonical ingress identity stores only path, the text-like
`nearest-named-declaration-symbol`, terminal, source form, classes and a same-tuple ordinal
(`interfaces/product-truth-complexity-v8.md:61-69`). Neither that block nor inherited v7 authority
defines a qualified declaration identity or a unique resolution algorithm. The prose adds partial
rules for module imports, named helpers and anonymous callbacks (`:139-144`), but leaves
decision-critical cases unresolved:

- a nested declaration can reuse the traced top-level function name and produce the same
  path/symbol/class tuple;
- class methods and constructors are not qualified by declaring class;
- overload signatures versus their implementation declaration are not distinguished;
- named and anonymous default exports and re-export aliases have no frozen owner disposition; and
- local aliases of a raw import/terminal are not explicitly bound to the lexical owner of every use.

The same identity also cannot enforce its own nontraced promise. If a candidate deletes one raw
site and adds the same terminal/form/classes under the same named declaration elsewhere, the
same-tuple ordinals are renumbered to the same multiset. A single site can be relocated with no
observable delta at all; two identical sites can be reordered while retaining ordinals
`0..n-1`. Thus the required “new raw occurrence fails” negative (`:146-150,162-164`) is not
representable by the proposed comparison.

**Strongest counter-evidence considered.** All ten current traced authorities are intended as
ordinary named capability functions, v7 already has finite lexical alias handling, and anonymous
callbacks inheriting their enclosing owner is a reasonable structural rule. Those facts make a
small repair possible, but they do not select the missing top-level declaration, alias or
predecessor-site semantics. Letting the v8 implementer choose them would make meter code the
authority that the interface expressly forbids.

**Concrete consequence.** A raw reference moved into an undeclared same-name helper can be accepted
as the traced capability. Separately, a selected-Work nontraced path can spend an existing tuple
count at a new source location or anonymous callback and still pass the sub-multiset gate. The
meter can therefore miss exactly the wrong-symbol/private-helper and new-occurrence mutations that
its Work lists as mandatory negatives, including movement of a raw effect into destructive B1
control flow.

**Affected decision.** PRD A14's closed raw-effect ingress and the v8 Work's exact traced/nontraced
partition are not implementable or independently verifiable from the frozen authority. A green v8
result would not establish the claimed owner boundary.

**Smallest repair.** Freeze a finite lexical-owner model in the machine authority. Resolve each
declared owner to exactly one module-scope declaration symbol and record declaration kind plus a
qualified identity; reject zero or multiple matches. State explicit fail-closed dispositions for
default exports, class members/constructors, overload groups and re-export aliases. Named nested
declarations must always have distinct identities even when their text matches the top-level
owner; anonymous callbacks inherit the nearest resolved owner; every local/module raw alias use is
classified at its use-site owner. For nontraced ingress, add a predecessor-anchored structural site
identity (qualified lexical ancestry plus stable AST child path/source fingerprint) so deletion is
allowed but relocation/replacement is not silently treated as preservation. Add single-cause
negatives for all six declaration/alias forms and for delete-plus-relocate/reorder with an unchanged
tuple count.

**Why removal or safe degradation is insufficient.** Falling back to path/class or tuple counts is
the v7 defect v8 exists to replace. Omitting symbol or site enforcement would permit an unreviewed
raw path in the destructive Work; runtime unavailability, hiding output or a later source Review
cannot turn the meter's false structural claim into a candidate-independent gate.

## Assumptions, accepted risk and observations

- Confirmed evidence is limited to immutable Git objects, current v7 execution, linked Concepts and
  deterministic document/machine-block checks. No real `~/.omnimind`, credential, provider,
  network or user-state resource was read or changed.
- Assumption challenged: prose ordering and symbol spelling are sufficient machine authority. The
  two findings show where that assumption fails.
- Accepted risk: none applies to these blockers. Prior v7 PASS accepted the finite grammar and B0
  evidence, not candidate-selected predecessor or ambiguous v8 declaration/site semantics.
- Advisory observations: none. Outside equality, deletion/materialization/move intent, global
  forbidden/unknown rules, v7 immutability and the sole B1 release-smoke addition otherwise survive
  this audit.

## Exact next decision and options

Human calibration is required. The available directions are:

1. **Repair both blockers (smallest scope):** add only the machine predecessor/evidence mapping and
   the finite declaration/site identity rules above; preserve v7 bytes, B0 counts/digests, all five
   Work meanings, the exact B1 one-path addition, runtime Occam boundary and destructive exclusions.
2. **Remove or safely degrade the gated scope:** do not use v8 to authorize B1; remove the
   predecessor-delta/exact-owner claim and keep all Product Works stopped until another bounded
   authority is selected.
3. **Defer:** retain commit `83a6289...` as rejected design evidence and postpone Product truth
   consolidation and Remote transition.
4. **Stop:** abandon this Work sequence.

The unchanged v8 scope cannot proceed under an accepted-risk label because both findings affect
the core authority used to admit destructive Product candidates.

## Dispatch identity

- role: `qbd`
- actorId: `product_truth_complexity_v8_qbd`
- receipt: `b74f9bf6f09a4c508073e4dd53db57af`
- predecessor: `e227012a8f134ff0b7de29dce9ed9259`
- predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation/interfaces/product-truth-complexity-v8.md`
- verdict: `FAIL`
