---
type: "QbD Audit"
title: "Product-truth complexity v9 authority-repair audit"
verdict: "FAIL"
---

# Product-truth complexity v9 authority-repair audit

## Audit identity

- Bundle root: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd-auditor`
- Bounded objective: fresh QbD 1/QbD 2 challenge of immutable post-r2 Design repair
  `fed86d92a29395c236eae9588968f7c80587353c`, with independent reconstruction of the
  69-row changed-path authority and 6,321-row accepted-tree byte authority, preservation of Route B
  safe degradation/B1 proof duties, and the authored Work map
- Entry Concept: [`design.md`](../design.md)
- Audit output Concept:
  `qbd/product-truth-complexity-v9-authority-repair-audit.md`
- Actor ID: `product_truth_complexity_v9_authority_qbd`
- Dispatch receipt: `0d6d01fc55bb4ed094ac608758a99c81`
- Predecessor receipt: `36cbe9631a3347958ad2f92b4d7bc03c`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`

The runtime operation record is active and matches the assigned Bundle, `design.md` entry, exact
output, `qbd-auditor` role, actor and completed predecessor. The predecessor is a different actor
and records the repaired Bundle as output. This audit modifies only this assigned Concept. It does
not modify the PRD, Design, Decisions, Interface, Work, source, runtime records or the three
pre-existing shared-tree user-document edits.

## Verdict

**FAIL**

- Risk: **high**
- Decision-critical blocking findings: **1**
- Advisory observations: **0**
- Total findings: **1**

The repaired finite authority is reproducible and closes the r2 false-accept family, but it makes
the authored Product Work sequence unrealizable: every Git changed path outside the selected
Work's exact 69-member production universe is now rejected, while all five Product Works require
same-candidate changes to test, fixture, generator or test-support paths that are not members of
that universe. The unchanged scope cannot proceed as ordinary accepted risk.

## Confirmed evidence

### 1. The 69-row accepted boundary state reproduces exactly

I parsed the one strict `omp-flow-production-boundary-v1` block from each of the five Work blobs at
approved commit `f110fb66006768074ca192bb94024632d16c09dd`, required every production row to be
exactly `{kind:"exact",path}`, and resolved every path against that Git tree. The authored arrays
contain respectively 45, 15, 5, 7 and 12 production rows. Their exact-path union contains 69
members; repeated membership identifies the same Git path.

The complete accepted state contains 56 present rows, all mode `100644`, and 13 absent rows. The
absent rows are:

- the four authored future materializations
  `productExecutionBoundary.ts`, `productStateStore.ts`,
  `productExecutionCoordinator.ts` and `productStateDiagnostics.ts`; and
- the nine already-absent retired compatibility paths
  `desktopStorageUpgrade.ts`, `desktopUserDataProfile.ts`,
  `automationSelectionTranscode.ts`, `selectionSchemaCoordinator.ts`,
  `schema1ProductMutationFixtures.ts`, `schema1ProductTranscode.ts`,
  `schema1SelectionTranscode.ts`, `composerDraftV2Transcode.ts` and
  `storageOriginUpgrade.ts`.

For every present blob I independently hashed raw Git object bytes, emitted exactly
`{path,presence,mode,gitBlob,sha256}`, JCS-encoded each row, sorted those bytes by unsigned raw
UTF-8 and hashed the JCS array. The result is exactly
`c7790b3db167484ffaa85e4a3ad1430c29f2f7f05e952441b39ff6e08b862c82`; the 69-path source-universe
digest is exactly `f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa`.

The five canonical fence digests also reproduce unchanged:

- `direct-first-public-b1` —
  `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`;
- `native-host-package-root-binding` —
  `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`;
- `product-execution-leaf` —
  `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`;
- `product-state-store` —
  `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`;
- `product-execution-coordinator-facade` —
  `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`.

### 2. Default rejection and lifecycle authority are closed

The repaired [Interface](../interfaces/product-truth-complexity-v9.md),
[Design](../design.md), [PRD](../prd.md),
[measurement Work](../work/product-truth-complexity-v9.md) and
[Work map](../work/index.md) agree on the following hard rule:

1. compare the official predecessor-evidence full SHA to the candidate with
   `git diff --name-status -z --no-renames`;
2. reject every valid changed Git path by default;
3. replace rejection only for an exact `production` member of the one selected Work;
4. let an approved-present member change only its blob while retaining presence and mode;
5. keep every approved-absent member absent except the four named `100644` materializations in
   their named Works; and
6. permit no deletion or move.

`measurement` and `dependency` rows grant no Product mutability. Config, meter, fixture, test,
extension, root, directory, handoff, Review, report and current-output labels grant no path or
lifecycle exemption. A move is exposed as an independently rejected deletion and addition. The
authority block's recursively canonical JCS digest is
`0565b962a0e71a9761aab42455a600395c754250a91540f1a00af90476634a59`.

This closes the exact false accepts in immutable
[Review r2](../reviews/product-truth-complexity-v9-r2.md): adopted Package bytes, a manifest,
patch, root build input, arbitrary extension/root path, test/fixture/output-shaped path and newly
adopted path no longer receive a skip disposition.

### 3. The source-adoption and dependency byte expansion reproduces exactly

I extracted exactly one recursively unique-key `source-adoptions` JSON block from
`README.md` at `f110fb66006768074ca192bb94024632d16c09dd`. Its JCS digest is exactly
`2b2ae1a84d70e55076bfabf720864693536462659da8c428acf5293ce4e6babf`.
It contains the exact adoption IDs `ui-mother` and `pi-todo-headless-package`. The repaired
Interface's adopted-source, patch and legal rows are a complete bijection with every declared
`paths` and `licenseFiles` row for those two adoptions; there is no missing or extra adoption row.
JCS of the complete Design-authored input object is exactly
`176c47725b129d28044933c009391b9104ae7bad69aed048eb437db07a6d0faf`.

Git-object expansion contributes nine exact manifests, one lockfile, the one-file `patches` tree,
6,316 adopted-source derivations and two legal files before duplicate union. It binds, in
particular:

- `assets/packages/pi-todo-0.81.1/todo.ts` and its separately authored `manifest.json`;
- `patches/@effect%2Fplatform-node-shared@8881a9b.patch`;
- root `package.json`, `bun.lock`, `bunfig.toml`, `turbo.json`, `tsconfig.base.json`,
  `vitest.config.ts`, `.oxfmtrc.json` and `.oxlintrc.json`; and
- every recursive regular blob under the six adopted source trees, plus the two legal texts.

Only modes `100644` and `100755` occur. Duplicate derivations identify the same object. After exact
path union, raw-byte SHA-256 calculation, per-record JCS encoding, unsigned raw-UTF-8 record sorting
and complete-array JCS hashing, the independent result is exactly 6,321 rows and
`6687319b0ea58643812cee677fad03b3152e8bfcb31486ddb368bc1b3cf2f599`.
Candidate-side discovery contributes no input.

### 4. Route B safe degradation and B1 proof ownership remain intact

The repaired authority retains zero signature pins, zero hard graph deltas and
`hardGateEnabled=false`. Literal graph/SCC/count output remains observational. Public raw non-leak,
raw/global/wrapper/selector/alias/callback/RHS/per-use interpretation, Native Host lifecycle-write,
Web/RPC/gateway ownership and runtime order/lifetime/convergence remain explicit v9
non-authorities. No CFG/ICFG, SSA, points-to or expression grammar was restored.

The inherited `omp-flow-b1-verifier-universe-v1` bytes are identical at the approved Design, r2
Review and repaired Design commits; their raw block SHA-256 is
`1cceb1838a8177816f93f7820f59f0b8871e65fa79173d8ef495f2fd5449ac5a`.
Independent parsing reproduces 10 owners, 146 exact operations, 34 barriers, 29 durable kill
identities, 87 fixture states, 24 convergence states, 85 concrete-ordinal race cases and 65
concrete-ordinal kill cases. The fixture-catalog digest remains
`369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe`; the race/kill case digest
remains `d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892`.

B1 still requires same-SHA, reviewer-owned raw-reference enumeration with complete canonical
records and `unexplained = 0`, the full candidate-independent r1-r17 negative/adjacent-positive
manifest, owner-private real/verifier ports, generated-case/execution bijection, full event prefix,
terminal disposition, exact writes, post-state, exclusions, sanitized output and hidden mutations.
A raw bypass escaping the fixed enumerator, verifier and source Review still falsifies Route B.

### 5. Historical artifacts, user documents and stop-loss are preserved

`git diff --name-status 9ab90b18762612811d7cbab270b97c50251d06eb
fed86d92a29395c236eae9588968f7c80587353c` contains exactly six modified Bundle authority/map
documents: the stop-loss Decision, PRD, Design, v9 Interface, v9 measurement Work and Work map. It
contains no Product code, dependency, v1-v8 artifact, current v9 meter/config/test/fixture,
production fence, prior QbD result, Review or handoff change.

The committed blobs of root `README.md`, `execution-brief.md` and
`missions/independent-omnimind-v1.md` are byte-identical between r2 Review HEAD and the repaired
Design. Their three pre-existing shared working-tree edits remain present and untouched. Those
documents continue to require Synara-first reuse and prohibit treating an open Campaign claim as
proof that an adopted capability is absent.

The post-r2 [stop-loss Decision](../decisions/product-truth-complexity-v9-stop-loss-calibration.md)
also records the required hard stop: if the later immutable implementation Review finds another
membership/changed-path/lifecycle/accepted-tree-expansion bypass, Main may not dispatch another
implementation repair; the sequence returns to Design/stop. The earlier v9 PASS authorizes only
the failed r1/r2 line and cannot authorize this repaired meter.

## QbD 1 challenge

The problem diagnosis and Route B synthesis remain justified. R2 demonstrates a finite
membership/changed-path false accept rather than a reason to restore expression semantics. The
all-path default-reject rule and accepted-tree expansion are candidate-independent, reproducible
and narrower than another grammar. Product State, Execution and the destructive/protected-data
boundaries are unchanged. Route A remains the stronger alternative only if Route B's real B1 proof
owner is abandoned.

No separate QbD 1 blocker or advisory was found. The blocking contradiction below arises in the
authored realization map.

## QbD 2 challenge

Ordering is otherwise explicit and serial: human-calibrated v9 measurement acceptance precedes
unsplit B1; accepted B1 precedes Native Host; accepted Native Host precedes execution leaf; accepted
leaf precedes Store; accepted Store precedes Coordinator/facade C. Exact predecessor rows, handoff,
Review, report and first-parent evidence requirements remain authored. Shared production paths are
ordered rather than concurrent.

However, the new exact changed-path authority and the unchanged Work outputs cannot both be
satisfied. This is a core-path realization defect, not missing future implementation evidence.

## Finding

### B1 — All-path default rejection forbids the same-SHA verification changes required by every Product Work

**Cause.** The repaired selected-Work rule enumerates the complete candidate Git diff and gives
mutability only to exact `production` members of the selected five-fence Work. The 69-member union
contains no test, fixture, generator or test-support path, and the Interface explicitly gives those
categories zero exemption. Yet the unchanged authored Works require such paths to change in the
candidate being proved:

- [Direct first-public B1](../work/direct-first-public-b1.md) requires checked-in verifier
  generation, generated-home fixtures, manifest/execution bijection and extensive focused/kill/
  race tests; its allowed code prose includes `scripts/product-truth/**`, while its exact production
  block omits `direct-first-public.test.ts` and every verifier fixture/support path.
- [Native Host](../work/native-host-package-root-binding.md) requires protocol, client, runtime,
  Desktop and process-test changes in both dev and packaged lanes, but its block lists only the 15
  production paths.
- [Execution leaf](../work/product-execution-leaf.md) explicitly creates a focused test and one new
  test-support module; neither path is in its five-member production block and neither is one of the
  four allowed materializations.
- [Product State Store](../work/product-state-store.md) explicitly creates Store-focused tests and a
  shared fixture builder and changes exact composition tests; none is in its seven-member production
  block.
- [Coordinator/facade C](../work/product-execution-coordinator-facade.md) explicitly creates or
  updates Coordinator, Product, Store and composition tests/support; none is in its twelve-member
  production block.

The machine rule says prose cannot grant an unlisted mutable path. Therefore each required test or
support change is an unlisted Git changed path and hard-rejects before v9 can observe the Product
candidate.

**Concrete consequence.** Implementing the mandatory verification paths makes every Product Work
fail the hard membership gate. Omitting or leaving those paths outside the immutable candidate
makes the Work fail its own same-SHA done conditions and removes the exact verifier/test evidence
needed for destructive deletion, runtime refusal, race/kill convergence and sole-authority
extraction. No B1 or later C candidate can simultaneously satisfy the repaired v9 authority and
the authored Work map, so the core Route B realization is unverifiable and cannot reach its next
accepted Product checkpoint.

**Affected decision.** The human cannot authorize the current measurement-only v9 implementation
as the governing meter for the unchanged B1/C sequence. Doing so would freeze an instrument whose
required successor candidates are rejected for carrying their mandatory proof.

**Minimum repair.** At Design authority—not meter/config/fixture implementation—enumerate every
exact per-Work verification path required in the immutable candidate, freeze its approved
presence/mode/blob and exact first-materialization lifecycle, and define how an overlapping
accepted-tree row follows that exact lifecycle. Keep the set path-exact and candidate-independent;
do not add a generic test, fixture, extension, root or output category. Reconcile all five Work
boundaries/done conditions and recompute the resulting boundary count/digests. The human must also
decide whether that revision is permitted by the recorded membership-family stop-loss.

**Why removal or safe degradation is insufficient.** Removing, externalizing or leaving the
verification changes uncommitted would discard the Design-required identical-SHA verifier,
generated-case bijection, fault/race/kill proof and Product regression evidence for an irreversible
destructive path. A broad `tests/**` or output exemption would recreate the very category-based
authority bypass the repair rejects. Disabling all Product Works is safe only as explicit deferral
or stop; it does not let the original checkpoint continue.

## Assumptions, strongest counter-evidence and accepted risk

- **Confirmed:** both authoritative digests, complete Git-object expansions, all-path rule, Work
  requirements, preservation diff, verifier counts and stop-loss above were independently derived
  from immutable repository objects.
- **Assumption rejected:** a Product Work can commit required test/support changes merely because
  its prose says those paths are in scope. The repaired machine authority explicitly denies that
  implication.
- **Strongest counter-evidence:** the execution-leaf and Store Works require newly materialized test
  or test-support files, while the authority permits only four different production
  materializations. This fails without relying on a future implementation choice.
- **Previously accepted risk:** the maintainer has accepted irreversible loss only for the exact
  classified pre-baseline targets. This audit neither changes nor reopens that human risk decision;
  it also cannot convert the current realization blocker into accepted risk.
- **Why `NEEDS_EVIDENCE` does not apply:** no missing runtime observation prevents judgment. The
  contradictory machine rule and Work done conditions are already immutable evidence.

## Exact next decision and options

Human calibration must choose one linked direction:

1. **Repair the Design authority.** Add only exact, lifecycle-bound verification members needed by
   the five Works, reconcile the Work map and decide explicitly whether this pre-implementation
   Design repair is allowed under the membership-family stop-loss. Do not implement v9 or B1 from
   the current failed authority.
2. **Remove or safely degrade the Product sequence.** Limit the Bundle to non-governing
   measurement/provenance and explicitly defer B1/C; the current meter must not govern the omitted
   Product Works.
3. **Defer.** Preserve `fed86d92a29395c236eae9588968f7c80587353c` and this audit without
   assigning v9 or B1.
4. **Stop.** Abandon Route B or the Product-truth sequence.

The unresolved blocker cannot be accepted while the unchanged Product scope proceeds. This audit
does not select an option, authorize a repair, command another audit, authorize v9/B1, or authorize
destructive execution.

## Handoff

- Output: `qbd/product-truth-complexity-v9-authority-repair-audit.md`
- Verdict: `FAIL`
- Risk: `high`
- Blocking count: `1`
- Advisory count: `0`
- Actor ID: `product_truth_complexity_v9_authority_qbd`
- Receipt: `0d6d01fc55bb4ed094ac608758a99c81`
- Predecessor: `36cbe9631a3347958ad2f92b4d7bc03c`
- Exact next decision: human selects exact Design repair, Product-scope removal/safe degradation,
  deferral or stop; the current v9/B1 sequence does not proceed.
