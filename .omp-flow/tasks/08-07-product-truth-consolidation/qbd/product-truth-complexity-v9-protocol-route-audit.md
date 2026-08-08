---
type: "QbD Audit"
title: "Product-truth complexity v9 byte-protocol and Review-route audit"
verdict: "PASS"
---

# Product-truth complexity v9 byte-protocol and Review-route audit

## Audit identity

- Bundle root: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd-auditor`
- Bounded objective: independently audit commit `64f59718993731d67d1790e6142019a3ed28504b`
  after the binding v9 protocol/route stop-loss; challenge the exact raw Git changed-path byte
  protocol, candidate-independent official Git-object controls, unique future Review route,
  unchanged finite authority and Route B semantic degradation, and the terminal one-attempt stop
- Entry Concept:
  [`decisions/product-truth-complexity-v9-protocol-route-stop-loss.md`](../decisions/product-truth-complexity-v9-protocol-route-stop-loss.md)
- Exact audit output Concept:
  `qbd/product-truth-complexity-v9-protocol-route-audit.md`
- Actor ID: `product_truth_complexity_v9_protocol_route_qbd`
- Dispatch receipt: `954837db7e934fa8ba87c2966e0818fe`
- Predecessor receipt: `1e07cf4d3605423583af31055172c50b`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`

The assignment supplies the required Bundle, role, bounded objective, entry, exact output, actor,
opaque receipt and predecessor. This audit writes only this assigned Concept. It does not modify
PRD, Design, Decisions, Interface, Work, source, user documents, runtime records, prior audits,
handoffs or Reviews.

## Verdict

**PASS**

- Risk: **medium residual** — the protocol/route realization and its implementation Review do not
  yet exist; runtime effect safety remains intentionally outside v9 and must be proved by the
  already-authored B1 evidence triad.
- Decision-critical blocking findings: **0**
- Advisory observations: **0**
- Total findings: **0**

The revised Design closes both P1 defects in the immutable
[final-authority Review](../reviews/product-truth-complexity-v9-final-authority.md) without reviving
the rejected candidate, weakening Route B or creating a second evidence path. This model verdict
authorizes no implementation, B1 assignment, destructive execution, Product change or forward
transition. A linked human decision remains mandatory.

## Confirmed evidence

### 1. The raw Git byte protocol is closed and implementable

The [Interface authority object](../interfaces/product-truth-complexity-v9.md) and the corresponding
[Design](../design.md) freeze one exact command:
`git diff --name-status -z --no-renames <official-evidence> <candidate> --`. Successful stdout stays
a raw Buffer; the general text/no-NUL decoder is outside this path. Zero bytes mean zero records.
Non-empty output must terminate with the final path NUL and, after removal of only the terminal
empty segment, contain a positive even sequence of non-empty status/path fields.

The per-record contract is exact:

- the status field is one byte and only `A`, `D`, `M` or `T` is accepted;
- only the path slice receives fatal UTF-8 decoding and byte-for-byte UTF-8 re-encoding;
- the decoded path is non-empty and relative, with no leading/trailing slash and no empty, `.` or
  `..` slash component;
- Unicode normalization is forbidden, while TAB, LF, CR, backslash and other valid UTF-8 remain
  path data because only NUL delimits fields;
- `A/D/M/T` are cross-checked respectively as absent→present, present→absent, same-kind
  present→present and entry-kind-changing present→present states in the two Git trees;
- duplicate exact paths fail before policy; and
- success preserves Git order and must enter the existing selected-Work lifecycle and accepted-tree
  classifiers. Parser success grants no membership or lifecycle authority.

Every failure disposition is fixed and non-echoing: command, unterminated, cardinality, status,
empty-path, path-UTF-8, path-form, status-state and duplicate-path. Record-specific errors expose
only the zero-based ordinal; raw and decoded path bytes are never interpolated.

I independently probed a temporary, branchless Git-object graph. Real
`git diff --name-status -z --no-renames` output ended in NUL, yielded alternating non-empty status
and path fields, preserved paths containing non-ASCII, TAB, LF and backslash bytes, exposed a move
as `D+A`, reported an executable-mode drift as `M`, and reported a blob-to-symlink entry-kind
change as `T`. This confirms the frozen grammar matches real two-tree Git behavior rather than a
fixture format.

### 2. Candidate-independent controls close the fixture-only escape

The [v9 Work](../work/product-truth-complexity-v9.md) requires two independent verification layers.
Direct raw-Buffer cases cover zero output, terminal/cardinality/empty-field faults, every
disallowed status, invalid UTF-8, invalid relative forms, duplicate paths and valid
non-ASCII/TAB/LF/CR/backslash bytes. Separately, fixture-free official invocations must create real
Git objects without changing a branch or working tree and exercise the actual command/parser/policy
path.

Those official controls cover both accepted lifecycle families—selected existing-blob `M` and the
exact authored first-materialization `A`—and require unlisted `A/M`, selected `D`, selected mode
drift, selected `T`, a no-renames `D+A` move and adopted-byte drift to reach their existing
downstream lifecycle or accepted-tree dispositions. Together they exercise all four allowed status
bytes, default rejection, presence/mode/type lifecycle, move decomposition and accepted-tree byte
authority. Any parser/text failure in a real-Git control is itself a hard failure. The prior
`fixtureName` escape therefore cannot satisfy the revised done conditions or the later independent
Review.

### 3. The future Review route is singular and serial

The one future implementation Review path is
`reviews/product-truth-complexity-v9-protocol-route.md`. It is consumed literally by:

- the Interface's `acceptedMeterReviewRoute` and first authored predecessor row;
- the v9 Work's expected handoff and acceptance stop;
- the B1 Work's entry stop and B1 handoff expectation;
- the Design's meter authority/verification plan; and
- the authored Work map and Bundle index.

Selection forbids inference, aliases, fallbacks, directory scans, “latest” rules, candidate/config
overrides and old-path overwrite. The new path is absent at `64f597189`, so it can be created once
by the future assigned different actor. The commit changes eight Bundle documents (`1 A + 7 M`)
and changes zero existing Review or handoff paths. All ten current implementation Reviews whose
recorded verdict is `FAIL` have the same Git blob at `64f597189^` and `64f597189`; the rejected
final-authority Review remains blob `1e0dbd3cdd6f6032653402b9a6e0f048258e7dfd`. A scan of 212
relative Markdown links across the eight changed Concepts found zero missing targets.

### 4. Finite authority and five fences remain unchanged

I independently parsed the five strict `omp-flow-production-boundary-v1` blocks and the
Design-owned verification table, resolved every approved state from Git commit
`f110fb66006768074ca192bb94024632d16c09dd`, rehashed raw blobs and reconstructed the sorted JCS
records.

- Production rows per Work remain `45/15/5/7/12`, with **69** unique paths: `56` present and `13`
  absent. The state digest is
  `c7790b3db167484ffaa85e4a3ad1430c29f2f7f05e952441b39ff6e08b862c82`.
- Verification remains **70** per-Work rows, distributed `16/17/10/10/17`, with **45** unique paths
  and `9` absent first materializations. The complete-row digest is
  `c291688e134e1ea91b0905c2b8709634ecd0e5fc1cf616a0b5a656e0d6978326`.
- Their union remains **110** paths: `88` present and `22` absent, with digest
  `2d189676ed940fa9299504a7e0fc47aa91f5c7eced44c115be21340d83df3ac9`.
- The revised recursively unique-key authority object independently JCS-hashes to its new pinned
  digest `9313f74f3d0d76c858bea53b6e4aeb06bf2ec7bfeb3dff5922091270e1b2d0b0`.

The accepted-tree reconstruction independently parsed the approved `source-adoptions` block,
verified its digest `2b2ae1a8…`, verified the authored input digest `176c4772…`, expanded `6,329`
derivations and deduplicated them to exactly **6,321** Git-object records. The complete record
digest remains
`6687319b0ea58643812cee677fad03b3152e8bfcb31486ddb368bc1b3cf2f599`.

All five production fences are byte-equivalent to the approved tree and retain their canonical
digests:

1. B1 — `0e1551ebcdb8a47310e3ef56f9f7558ada452f5590d166551296eb359dd8faae`
2. Native Host — `c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5`
3. Execution leaf — `dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4`
4. Product State Store — `2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a`
5. Coordinator/facade — `124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9`

### 5. Route B semantic non-authority is preserved

The Interface's twelve-item `explicitNonAuthority` array is byte-equivalent to the parent
authority. V9 still cannot decide public-raw non-leak, raw/global/wrapper/selector/alias/callback/
RHS/per-use semantics, Native Host Package lifecycle writes, Web/RPC or gateway ownership,
forbidden compatibility semantics, or CFG/ICFG/SSA/points-to/order/lifetime/race/crash convergence.
Graph/SCC/count output remains observational.

The [safe-degradation Decision](../decisions/product-truth-complexity-v9-safe-degradation-calibration.md)
still assigns those consequences to B1's fixed verifier, reviewer-owned complete raw-reference
enumeration and same-SHA source Review with the full r1-r17 negative/adjacent-positive manifest. A
raw bypass that preserves every v9 fact but escapes that evidence falsifies Route B and returns to
Design; it cannot be answered by another v9 grammar patch.

### 6. Rejection, authorization and terminal stop-loss are unambiguous

Candidate `558de08f897e2131c9159d118944272191f48359` and its recorded handoff commit remain rejected
evidence. The historical final-authority human PASS is explicitly superseded for implementation,
repair and B1. The binding Decision, PRD, Design, Interface, v9 Work, B1 Work and Work map all require
this QbD to reach `0 blocker / 0 advisory` and then require a new linked human PASS before the one
bounded protocol/route realization may start.

That later realization has one terminal disposition: a zero-finding different-actor Review only at
the new literal path may release B1; any material implementation or Review failure ends v9 and
routes to stop/alternate authority. No r4/r5 repair, same-path overwrite, Review alias, grammar
extension or B1 dispatch is available. The one-attempt stop-loss is therefore explicit and cannot
be softened into ordinary accepted risk.

## QbD 1 challenge

- **Problem and synthesis:** the two P1 findings are treated as Design defects, not implementation
  risk. The repair is confined to the real byte protocol and evidence route that failed; it does
  not reopen v8's falsified semantic-interpreter direction.
- **Requirements and architecture:** PRD R11/A14, Design, all three Route B/stop-loss Decisions and
  the Interface agree on byte ownership, validation order, downstream authority, unchanged finite
  counts and semantic non-authority. No Product state, destructive scope, public interface,
  dependency or runtime authority is added.
- **Alternatives and boundaries:** whole-buffer text decoding is invalid for `-z`; fixture-only
  validation cannot prove the official path; reusing an immutable failed Review creates split
  predecessor authority. The selected raw parser, real-Git controls and one new literal Review path
  are the smallest closed repair. Removal or disabling is not needed because the bounded route is
  realizable and remains fail-closed.

No QbD 1 blocker or advisory remains.

## QbD 2 challenge

- The v9 Work owns only its existing meter/config/test/fixture boundary and later handoff; it owns
  no Product or dependency path and cannot modify prior Reviews.
- Direct Buffer tests isolate protocol faults, while fixture-free official Git-object controls
  cross the exact command/parser/lifecycle/accepted-tree boundary that the failed candidate never
  reached.
- Interface predecessor authority, v9 handoff expectation, B1 entry/handoff, Work map and terminal
  disposition all consume the same one-time Review path.
- The serial sequence remains accepted v9 → B1 → Native Host → execution leaf → Product State Store
  → Coordinator/facade C. V9 acceptance alone cannot authorize B1 behavior or destructive execution.
- Done conditions remain mechanically falsifiable: exact counts/digests, no path exemption, no
  parser error in real controls, unchanged historical bytes, path-limited diff and different-actor
  zero-finding Review.

No QbD 2 blocker or advisory remains.

## Assumptions, strongest counter-evidence and accepted risk

- **Confirmed evidence:** commit/object identity, changed paths, protocol bytes, real Git status
  behavior, route occurrences, Review blobs, link targets, authority JCS, production/verification/
  union states, accepted-tree expansion and fence digests were independently reconstructed from
  Git objects.
- **Assumption rejected:** authored fixtures or parser success alone do not prove the official
  Product comparison. The revised Work requires fixture-free official invocations and downstream
  dispositions.
- **Strongest counter-evidence:** the rejected candidate proved that a green 83-test fixture suite
  could hide a universal real-Git false reject, and that an assigned Review path could be unused by
  predecessor authority. Both are now direct hard controls. Recurrence is terminal, not accepted
  risk.
- **Accepted residual trust boundary:** Main/human still selects the full official evidence commit;
  actor/receipt strings and Git metadata do not authenticate identity. This is unchanged and does
  not let a candidate self-select evidence.
- **Accepted future evidence boundary:** implementation bytes and their Review do not yet exist.
  That is an explicit future gate, not missing evidence for judging this Design and Work map.
- **Why `NEEDS_EVIDENCE` does not apply:** no missing or contradictory evidence prevents judging a
  decision-critical consequence in the present protocol/route design. Future implementation
  failure is already routed to terminal stop.

## Findings

- Decision-critical findings: none.
- Advisory observations: none.

## Exact next decision and options

Human calibration must record one linked direction:

1. **PASS:** authorize only one bounded v9 byte-protocol/Review-route realization. Its immutable
   candidate and handoff must receive a separate zero-finding different-actor `PASS` exactly at
   `reviews/product-truth-complexity-v9-protocol-route.md` before B1 can be assigned.
2. **Defer:** preserve the rejected candidate, repaired Design and this audit without assigning an
   implementation or B1.
3. **Stop / alternate authority:** end v9 or choose a different authority design. No repair or B1
   proceeds under the current route.

This audit does not select among those options.

## Handoff

- Output:
  `.omp-flow/tasks/08-07-product-truth-consolidation/qbd/product-truth-complexity-v9-protocol-route-audit.md`
- Verdict: `PASS`
- Risk: `medium residual`
- Blocking count: `0`
- Advisory count: `0`
- Actor ID: `product_truth_complexity_v9_protocol_route_qbd`
- Receipt: `954837db7e934fa8ba87c2966e0818fe`
- Predecessor: `1e07cf4d3605423583af31055172c50b`
- Exact next decision: human records PASS for the one bounded realization, defers, or stops/selects
  alternate authority.
