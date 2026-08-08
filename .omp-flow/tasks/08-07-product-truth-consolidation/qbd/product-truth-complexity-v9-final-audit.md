---
type: "QbD Audit"
title: "Product-truth complexity v9 final Route B audit"
verdict: "PASS"
---

# Product-truth complexity v9 final Route B audit

## Audit identity

- Bundle root: `.omp-flow/tasks/08-07-product-truth-consolidation`
- Role: `qbd-auditor`
- Bounded objective: final independent QbD 1/QbD 2 challenge of immutable repaired Design tree
  `f110fb66006768074ca192bb94024632d16c09dd`, both Route-B Decisions, v9 Interface/measurement
  Work, B1, four downstream Product Works and authored Work map
- Entry Concept: [`design.md`](../design.md)
- Audit output Concept: `qbd/product-truth-complexity-v9-final-audit.md`
- Actor ID: `product_truth_complexity_v9_qbd_final`
- Dispatch receipt: `3dce1351cebd4a5e9f40a9c32583ae17`
- Predecessor receipt: `451bdf0b5012406ab539f0b5c60d65b5`
- Predecessor output: `.omp-flow/tasks/08-07-product-truth-consolidation`

The assignment contains the required Bundle, role, objective, entry, exact output, actor, receipt and
predecessor. Repository `HEAD` is exactly the assigned tree. `design.md` is clean at Git blob
`af747aaa7a17bbcbb4f4d5fad2a0693024cea514`. This audit changed no PRD, Design, Decision,
Interface, Work, source, production code, runtime record or protected user document.

## Verdict

**PASS**

- Risk: **medium residual** — v9 is still unimplemented and deliberately cannot prove runtime effect
  safety. That consequence is fail-closed behind human calibration, immutable-meter Review and the
  separate same-SHA B1 verifier/enumerator/source Review; it is not an unresolved Design defect.
- Decision-critical blocking findings: **0**
- Advisory observations: **0**
- Total findings: **0**

The repaired authority is internally realizable and no decision-critical consequence remains
unresolved. Both prior safe-degradation blockers reproduce as closed. The model verdict itself
authorizes no v9 implementation, B1 assignment, destructive execution, Product edit or forward
transition. A linked human decision remains mandatory.

## Confirmed evidence

### 1. Both prior blockers are closed mechanically

1. The v9 authority JSON parses and its recursively sorted-key JCS SHA-256 is
   `b8ffbdb58b17322d1e35835071c3458eba51c3913b0d05de50162219ae803920`.
   Independent TypeScript-AST inspection at exact B0
   `7582170a277477ba0d71cf70f53e4e0836874a72` reproduces all 11 declaration rows: nine are absent
   and two are present with the exact authored declaration kind and exported/module-private
   disposition. In particular,
   `apps/web/src/composerDraftStore.ts#readOrCreateComposerDraftEnvelope` and
   `#writeAndVerifyComposerDraftEnvelope` are both B0-absent; their only authored first
   materialization is `direct-first-public-b1`, as module-private `const` arrow declarations
   ([Interface lines 49-70](../interfaces/product-truth-complexity-v9.md)). There are zero pinned
   emitted-signature rows; candidate-emitted or inferred type shape is observational. The former
   declaration/signature blocker is therefore closed without restoring semantic type vocabulary.
2. Independent reconstruction of the literal graph starts from the exact five-fence union, keeps
   every duplicate literal `import` and `export ... from` record, JCS-encodes each
   `{form,source,specifier}` record and sorts with raw UTF-8 byte comparison. It reproduces 69
   universe members, 56 present parsed B0 sources and 578 records. JCS SHA-256 of the byte-sorted
   multiset is exactly
   `9594b2c2d1562d9d546ece89e699156d1e6708b0817ac0a2bf5b62ea6ba66869`, not the retired
   locale-collated value ([Interface lines 83-100](../interfaces/product-truth-complexity-v9.md)).
   The B0 data itself distinguishes byte ordering from `localeCompare`; a conforming meter can
   reproduce the pinned result without choosing comparator semantics.

### 2. Five production fences and the finite verifier universe reproduce

The five `omp-flow-production-boundary-v1` blocks are byte-identical across the original Route-B
tree `c7715ed0d85c7efdbb976a1a139960dc635d64b3`, the prior repaired tree
`c66c9944bc729c7ae26679c7f5ad5a3201f63cd3` and the assigned tree. Their canonical SHA-256 values
in authored order are:

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

Their production-only union has 69 members and canonical path-array digest
`f771ad1803e65a65e6077687d0f923d41c826d17cbcfdfb11dee73d1b3787caa`.

Independent execution of the inherited verifier-universe validator over the exact
`omp-flow-b1-verifier-universe-v1` block reproduces:

- 10 owners, 146 operations, 34 barrier identities and 29 durable kill identities;
- 87 fixture states and 24 convergence states;
- 85 expanded concrete-ordinal race cases and 65 expanded concrete-ordinal kill cases;
- fixture-catalog digest
  `369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe`;
- race/kill case-identity digest
  `d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892`.

Candidate selection remains `none`; ordinal counts, terminal EOF cases, writer bindings and
kill-to-convergence assertions derive only from the frozen catalog.

### 3. V9 returns no grammar or semantic hard verdict

The machine authority contains seven mechanical hard-fact families only: authority/config,
membership/lifecycle, outside mode/blob, official evidence tuple/blob/ancestry, dependency bytes,
declaration identity/disposition and report determinism. It contains zero allowed graph deltas,
`hardGateEnabled=false`, zero signature pins, and explicitly classifies graph/SCC, physical/semantic
counters and domain ownership as observations. Raw/global terminals, wrapper/selector
normalization, alias propagation, callback inheritance, RHS/subtrees, per-use ownership, public raw
non-leak, Native Host lifecycle writes, Web/RPC/gateway ownership and runtime convergence are exact
non-authorities ([Interface lines 122-155](../interfaces/product-truth-complexity-v9.md)).

The measurement Work independently makes those exclusions executable: it owns only five new v9
meter/config/test/fixture/handoff destinations, owns no existing file, requires a source-level
negative scan for forbidden classifiers, and labels graph/count output observational in every mode
([measurement Work lines 27-107](../work/product-truth-complexity-v9.md)). Thus config, candidate,
branch or working tree cannot promote a v9 observation into a semantic gate.

### 4. Displaced safety has a replayable, candidate-independent B1 owner

At the identical immutable B1 SHA, a different actor owns the raw-reference enumerator and must
retain the fully expanded command, Bun/runtime and enumerator versions, enumerator source
bytes/blob/SHA-256, candidate and QbD-approved Design SHAs, the fixed 69-member universe digest,
complete canonical records, record count and JCS digest. Candidate production, meter/config and
tests cannot provide, subtract or filter the universe, reference kinds, dispositions or cases
([Interface lines 189-219](../interfaces/product-truth-complexity-v9.md)). `unexplained = 0`, public
raw non-leak, mediated effects and zero forbidden lifecycle writes are hard B1 outcomes, not v9
labels.

The full r1-r16 derivation also reproduces from immutable Git objects. Every one of the 16 named
repair commits has its table-named failed Review as its direct parent; their complete
`scripts/product-truth/fixtures/complexity-v8/**` deltas contain 93 path+blob records: 92 additions,
one modification and zero deletions. The immutable Reviews distinguish the negative and adjacent
positive/control disposition. R17 contributes the four exact callback-global negatives and five
exact controls recorded by its Review. Before execution the reviewer must materialize all 102
derived records/cases as one sorted manifest with case ID, source Review/blob, expected
`reject`/`pass`, oracle, count and JCS digest; every negative rejects and every adjacent positive
passes ([Interface lines 221-249](../interfaces/product-truth-complexity-v9.md)). Sampled prose and
focused authored tests cannot substitute.

B1 repeats the same obligations as hard done conditions: full manifest/execution bijection, complete
traces, zero unexplained references, no candidate/config filtering and rejection of public leakage,
forbidden lifecycle writes, unmediated effects, incomplete enumeration or any escaping negative
mutation ([B1 Work lines 278-308](../work/direct-first-public-b1.md); [verification lines
331-354](../work/direct-first-public-b1.md)).

### 5. Candidate boundary and ordering are closed

The v9 measurement candidate may create only its script, data-only config, focused test, bounded v9
fixtures and one new handoff. V1-v8 artifacts, production, dependencies, existing meters, Reviews,
handoffs and prior audits are outside that candidate. The committed Route-B repair from `c7715ed0d`
to the assigned tree changes only Bundle governance/audit Concepts; a path-limited comparison finds
no change under `apps/**`, `packages/**`, `scripts/**`,
`package.json`, `bun.lock`, existing Reviews or handoffs. The shared working-tree edits in
`README.md`, `execution-brief.md` and `missions/independent-omnimind-v1.md` are likewise outside the
candidate and were preserved unchanged by this audit.

The authored order is exact and serial:

```text
human-calibrated QbD PASS
-> accepted immutable v9 meter/B0 report
-> accepted unsplit B1
-> accepted Native Host v2 Package-root binding
-> accepted execution leaf
-> accepted sole Product State Store
-> Coordinator/thin-facade C
```

Each transition has one exact Interface row and requires one Main/human-selected full evidence
commit, exact handoff/Review/report blobs, strict reviewed-candidate→evidence→next-candidate
first-parent ancestry and later blob immutability. Candidate/config/repository/report/receipt/history
cannot select the evidence; receipts and Git metadata explicitly authenticate no human or reviewer
([Interface lines 101-120 and 159-172](../interfaces/product-truth-complexity-v9.md)). Overlapping
production Works remain sequential and no Store/Coordinator/leaf scaffold can precede accepted B1
([Work map lines 77-109 and 161-184](../work/index.md)).

## QbD 1 challenge

- **Problem and synthesis.** Repeated v4-v6 semantic-analyzer failures and v8 r1-r17 expression
  growth are concrete falsifiers for keeping combination semantics in a governance meter. Route B
  reuses the accepted mechanical base and assigns behavior to the already finite real owner/verifier
  boundary. It does not change the Product problem, destructive allowlist or protected exclusions.
- **Requirements and architecture.** PRD R11/A14, Design, both Decisions and the Interface now agree
  that v9 owns repository facts only. Product State and Execution remain sole owners for durable
  Product truth and process/Package authority. No competing runtime, migration authority, state
  object or public raw capability is introduced.
- **Boundary and alternative.** Route A remains the strongest alternative, but would require a new
  closed TypeScript grammar and generated exhaustive matrix after 17 adjacent failures. Route B is
  smaller only because B1's private ports, fixed verifier and same-SHA source Review are mandatory.
  The exact falsifier is retained: any new bypass preserving every v9 hard fact and escaping the
  fixed enumerator, verifier and source Review returns to Design and may not become another v9
  syntax/alias/callback/wrapper/RHS rule ([Interface lines 251-253](../interfaces/product-truth-complexity-v9.md)).

No QbD 1 blocker or advisory remains.

## QbD 2 challenge

- The measurement Work is bounded, independently reviewable and incapable of touching Product or
  historical meters. Its done conditions cover every hard authority family plus adjacent positives
  and deterministic double-run evidence.
- B1 remains deliberately indivisible until destructive tool, direct first-public creation,
  compatibility deletion, fixed verifier, raw-reference inventory and r1-r17 outcomes are jointly
  green. Its evidence-recording commit is distinct from immutable B1.
- Native Host, execution-leaf, Store and Coordinator/facade Works each have exact production fences,
  predecessor rows, entry stops, done conditions and different-actor Review gates. Shared paths are
  ordered rather than assigned concurrently.
- Acceptance coverage maps every PRD A1-A15 claim to a Work and preserves semantic hard gates in B1
  or the applicable later Product Review. V9 success alone cannot authorize effect safety.

No QbD 2 blocker or advisory remains.

## Assumptions, strongest counter-evidence and accepted risk

- **Confirmed evidence:** all counts, hashes, declaration phases, fence bytes, Git ancestry for
  r1-r16 repairs, r17 cases, candidate exclusions and ordering above were recomputed from immutable
  repository objects, not inherited from the prior verdict.
- **Assumption rejected:** a deterministic literal graph or declaration name does not prove public
  non-leak, lifecycle ownership or runtime mediation. The repaired authority no longer makes that
  inference.
- **Strongest counter-evidence:** a raw bypass can preserve every v9 hard fact. It is not accepted as
  ordinary residual risk: B1 must reject it through the fixed enumerator, verifier or same-SHA source
  Review; if all three miss it, Route B is falsified and the scope returns to Design.
- **Accepted residual trust boundary:** Main/human selects the official evidence SHA; actor strings,
  receipt strings and Git metadata do not authenticate identity. The Interface discloses this and a
  later different actor checks the exact invocation. This does not self-authorize a candidate.
- **Accepted human risk outside this transition:** pre-baseline deletion is irreversible. The
  maintainer's earlier decision accepts only the exact classified loss; this PASS neither expands
  that scope nor authorizes execution.
- **Why `NEEDS_EVIDENCE` does not apply:** implementation and B1 evidence are intentionally future
  transition gates. No missing or contradictory evidence prevents judging whether the current
  Design/Work map contains a decision-critical defect.

## Findings

- Decision-critical findings: none.
- Advisory observations: none.

## Exact next decision and options

Human calibration must choose one linked direction:

1. **Record PASS and authorize only the measurement-only v9 Work.** Its immutable candidate, B0
   report, official invocation and handoff must then receive a separate zero-finding different-actor
   implementation `PASS` before B1 can be assigned.
2. **Defer.** Preserve `f110fb66006768074ca192bb94024632d16c09dd` and this audit without assigning
   v9 or B1.
3. **Stop.** Abandon Route B or the Product-truth sequence.

This audit does not select among those options and does not authorize B1, destructive execution or
Product implementation.

## Handoff

- Output: `qbd/product-truth-complexity-v9-final-audit.md`
- Verdict: `PASS`
- Risk: `medium residual`
- Blocking count: `0`
- Advisory count: `0`
- Actor ID: `product_truth_complexity_v9_qbd_final`
- Receipt: `3dce1351cebd4a5e9f40a9c32583ae17`
- Predecessor: `451bdf0b5012406ab539f0b5c60d65b5`
- Exact next decision: human records PASS for measurement-only v9, defers, or stops.
