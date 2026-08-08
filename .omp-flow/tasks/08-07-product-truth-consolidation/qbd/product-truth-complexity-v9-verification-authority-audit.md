---
type: "QbD Audit"
title: "Product-truth complexity v9 verification-authority audit"
verdict: "FAIL"
---

# Product-truth complexity v9 verification-authority audit

## Audit identity

- Bundle root: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd-auditor`
- Bounded objective: fresh QbD 1/QbD 2 audit of immutable Design/Work repair
  `120570872` for exact Product verification-path authority, its production union, retained Route B
  and B1 proof duties, and the authored Work entry transition
- Entry Concept: [`design.md`](../design.md)
- Exact audit output Concept:
  `qbd/product-truth-complexity-v9-verification-authority-audit.md`
- Actor ID: `product_truth_complexity_v9_verification_qbd`
- Dispatch receipt: `db6a3d16557a4ab18672039fa4652cb7`
- Predecessor receipt: `426365e685a249a8850101ca504209ae`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`

The assignment is mechanically complete: Bundle, role, bounded objective, entry, exact output,
actor, opaque receipt and predecessor are all supplied. The audit reads immutable Git objects and
writes only this assigned Concept. It does not implement v9 or B1 and does not modify PRD, Design,
Interface, Work, source, runtime records, human decisions or prior audits.

## Verdict

**FAIL**

- Risk: **high**
- Decision-critical blocking findings: **1**
- Advisory observations: **0**
- Total findings: **1**

The repaired production and verification authority is finite, reproducible and sufficient for the
five Product Works. The remaining failure is its entry transition: five current authority routes
still point to the immutable prior **FAIL** audit instead of this newly assigned audit Concept.
Therefore the authored Work sequence cannot satisfy its own entry stop without either bypassing the
gate or overwriting historical evidence. Neither is authorized.

## Confirmed evidence

### Exact verification and production authority

I independently decoded the `omp-flow-product-verification-paths-v1` block from immutable commit
`120570872`, reconstructed each complete row, verified every approved presence, Git mode, blob and
raw-byte SHA against approved tree `f110fb66006768074ca192bb94024632d16c09dd`, and applied the
declared unsigned-UTF-8/JCS ordering and SHA-256 procedure.

| Work | Verification rows | Done-condition coverage | Result |
| --- | ---: | --- | --- |
| `direct-first-public-b1` | 16 | checked-in verifier/generator, direct fixture, Service/Web/release tests and probes | necessary and sufficient |
| `native-host-package-root-binding` | 17 | protocol, Desktop/Host/Service process, readiness, lifecycle, health and packaged journey | necessary and sufficient |
| `product-execution-leaf` | 10 | leaf/gateway boundary, test support, Host/OpenCode imports and live probes | necessary and sufficient |
| `product-state-store` | 10 | Store/test fixture, Product/Host/OpenCode composition, crash and live probes | necessary and sufficient |
| `product-execution-coordinator-facade` | 17 | coordinator/facade, Store support, readiness/process and both live journeys | necessary and sufficient |

The derived result is exactly **70** per-Work rows (`16/17/10/10/17`), **45** unique paths and
**9** approved-absent paths. Its independently reconstructed row digest is
`c291688e134e1ea91b0905c2b8709634ecd0e5fc1cf616a0b5a656e0d6978326`.
The nine first-materializations are exact, mode `100644`, and are limited to:

- `scripts/product-truth/first-public-capability-verifier.test.ts`
- `scripts/product-truth/first-public-capability-verifier.ts`
- `apps/service/src/product/health/nativeHostHealthMonitor.test.ts`
- `apps/service/src/product/productExecutionBoundary.test.ts`
- `apps/service/src/product/testSupport/productExecutionFixture.ts`
- `apps/service/src/product/productStateStore.test.ts`
- `apps/service/src/product/testSupport/productStateFixture.ts`
- `apps/service/src/product/productExecutionCoordinator.test.ts`
- `apps/service/src/wsRpc.product.test.ts`

Every present verification row is modify-only with preserved presence and mode. Every absent path
has exactly one named first materializer; the three later shared absent rows require their prior
materialization and preserve mode. All shared rows are compatible with the strict authored order.
There is no unowned lifecycle, deletion, move or mode change.

The production authority independently reconstructs to **69** exact unique path records, with
per-Work projections `45/15/5/7/12`, **56 present** and **13 absent** at the approved tree. Exactly
four absent production paths may first materialize at `100644`:
`productExecutionBoundary.ts`, `productExecutionCoordinator.ts`, `productStateDiagnostics.ts` and
`productStateStore.ts`; the other nine absent compatibility paths remain absent. The production
state digest is
`c7790b3db167484ffaa85e4a3ad1430c29f2f7f05e952441b39ff6e08b862c82`.

The exact production-plus-verification union contains **110** paths: **88 present** and **22
absent**. All four overlaps have identical approved state and compatible lifecycle. The independently
reconstructed union state digest is
`2d189676ed940fa9299504a7e0fc47aa91f5c7eced44c115be21340d83df3ac9`.
All candidate Git paths outside the selected Work's exact production plus verification rows are
rejected by default. `measurement` and `dependency` are empty; `authorityExemptions` is empty; prose,
configuration and runtime-generated temporary homes cannot add Git paths. No generic test,
fixture, output, root, extension, category, candidate or configuration expansion remains.

### Retained bytes, Route B and B1 duties

The accepted-tree input expansion is exact: 9 manifests, 1 lockfile, 1 patch root, 15 adopted roots
and 2 license paths expand to 6,329 pre-union derivations and **6,321** unique present byte records.
The independent digests are:

- source-adoption authority:
  `2b2ae1a84d70e55076bfabf720864693536462659da8c428acf5293ce4e6babf`
- accepted-tree inputs:
  `176c47725b129d28044933c009391b9104ae7bad69aed048eb437db07a6d0faf`
- 6,321-row byte manifest:
  `6687319b0ea58643812cee677fad03b3152e8bfcb31486ddb368bc1b3cf2f599`

The five raw production-fence blocks are byte-identical to approved commit `f110fb660067...`; their
canonical digests remain, in strict Work order:

1. `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`
2. `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`
3. `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`
4. `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`
5. `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`

Route B remains the selected semantic boundary: v9 measures and separates Product ownership but
does not redefine B1 correctness, change Engine semantics or reopen Route C. The B1 verifier block
is byte-identical, with 10 owners, 146 operations, 87 states, 34 barriers, 29 kill identities, 24
convergence states, 85 expanded races and 65 expanded kills. Its fixture digest remains
`369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe` and race/kill digest remains
`d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892`.
The checked-in generator/verifier must still prove manifest/execution bijection, execute every case,
emit the full same-SHA result, replay r1-r17, retain r17 negatives and controls, and stop after r2 on
any authority, semantic, race, kill, convergence or evidence deviation.

### Candidate scope preservation

Commit `120570872` changes exactly ten Bundle documents: PRD, Design, v9 Interface, Work map, the
five Product Works and the v9 measurement Work. It changes no v1-v8 evidence, production source,
meter implementation/output, Review, handoff, prior audit or B1 fixture bytes. The three
Synara-first user documents (`README.md`, `execution-brief.md`, and
`missions/independent-omnimind-v1.md`) remain outside the candidate; their pre-existing working-tree
edits were neither read as immutable candidate truth nor modified by this audit. `git diff --check`
for the candidate is clean.

## Assumptions, counter-evidence and accepted risk

- **Confirmed rather than assumed:** all counts, modes, blobs, byte hashes, row hashes, union state,
  candidate paths and routing references above come from immutable Git objects. No missing or
  contradictory evidence prevents the decision; `NEEDS_EVIDENCE` is not appropriate.
- **Strongest counter-evidence considered:** this dispatch names a fresh unique output Concept, so a
  human could treat it as superseding the stale textual route. That does not repair the authored
  Work transition: its explicit entry stop still names another file, and that file remains a
  different actor's immutable FAIL over commit `fed86d92...`. Runtime assignment cannot silently
  mutate Design/Work authority or historical evidence.
- **Accepted risk:** opaque receipts and actor IDs provide mechanical routing, not cryptographic
  identity. Existing Route B environmental/live-provider uncertainty remains bounded by same-SHA
  full output and the post-r2 stop-loss. Neither risk absorbs the routing blocker.

## Decision-critical finding

### B1 — The fresh verification-authority audit is not linked into the v9 Work entry stop

**Cause.** Immutable commit `120570872` routes the required zero-blocker/zero-advisory QbD result to
`qbd/product-truth-complexity-v9-authority-repair-audit.md` in five authoritative places:

- [`design.md`](../design.md), line 1141
- [`interfaces/product-truth-complexity-v9.md`](../interfaces/product-truth-complexity-v9.md),
  line 452
- [`work/index.md`](../work/index.md), lines 99 and 260
- [`work/product-truth-complexity-v9.md`](../work/product-truth-complexity-v9.md), line 32

That named prior audit is immutable, has verdict **FAIL**, audits repair `fed86d92...`, carries actor
`product_truth_complexity_v9_authority_qbd` and receipt
`0d6d01fc55bb4ed094ac608758a99c81`, and records one blocker. Conversely, the exact output assigned
to this fresh actor—`qbd/product-truth-complexity-v9-verification-authority-audit.md`—has zero links
in the candidate. The candidate correctly leaves the prior audit outside its change set, so the old
FAIL cannot become a valid fresh result.

**Consequence.** Even if all 70/45/110 path authority and B1 proof checks are green, the authored v9
entry stop still reads the old FAIL. Proceeding would require bypassing the only post-repair QbD
gate, pretending a differently assigned output satisfies it, or overwriting an immutable prior
audit. Each breaks the Work's mechanical authorization and evidence lineage. The original Product
sequence therefore cannot enter implementation.

**Decision.** This is a high-risk, decision-critical blocker. The current unchanged scope may not
proceed as an ordinary accepted risk.

**Minimum repair.** Change only the five exact next-audit/entry-stop references above so they name
one new, unique assigned audit Concept—this assigned path is the smallest existing choice—and keep
the old FAIL audit byte-for-byte immutable. Preserve the 70-row verification authority, 110-path
union, 6,321-byte manifest, five production fences, Route B and B1 duties unchanged. Link the
subsequent human calibration to the newly named output.

**Why removal or safe degradation is insufficient.** Deleting, weakening or ignoring the QbD entry
stop removes the only human-calibrated preimplementation gate after the prior FAIL; relabeling or
overwriting the old audit destroys provenance. Deferring the Product sequence or stopping are safe
choices, but neither permits the original scope to proceed. There is no smaller safe degradation
that preserves both authorization and evidence history.

## Exact next decision and options

Human calibration must choose one of these directions:

1. **Repair:** authorize only the five exact routing edits described above, preserve every finite
   authority and prior audit byte, and then decide whether to request a scoped decision over that
   repaired candidate.
2. **Remove or safely degrade:** remove the affected Product/v9 execution scope while retaining the
   current Route B/B1 stop-loss; do not bypass the entry gate.
3. **Defer:** leave v9 and B1 implementation unopened until the routing authority is repaired.
4. **Stop:** end the current Product-truth consolidation direction.

This model verdict does not itself authorize implementation, routing edits, evidence mutation or
human acceptance.

## Handoff

- Output: `.omp-flow/tasks/08-07-product-truth-consolidation/qbd/product-truth-complexity-v9-verification-authority-audit.md`
- Verdict: `FAIL`
- Risk: `high`
- Blocking findings: `1`
- Advisory observations: `0`
- Actor ID: `product_truth_complexity_v9_verification_qbd`
- Receipt: `db6a3d16557a4ab18672039fa4652cb7`
- Predecessor: `426365e685a249a8850101ca504209ae`
- Exact next decision: human chooses repair, removal/safe degradation, deferral or stop; the current
  unchanged scope is not implementation-authorized.
