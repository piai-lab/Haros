---
type: "Handoff"
title: "Authoritative Product-truth complexity v6 meter"
work: "../work/product-truth-complexity-v6.md"
status: "DONE"
actor_id: "product_truth_meter_v6"
dispatch_receipt: "b480d6ba3f0a4a948c6d5d566545c7b9"
predecessor_receipt: "89ea2e8e721d4f49abb3b28fbd2297b2"
predecessor_output: "../qbd/product-truth-complexity-v6-audit.md"
---

# Authoritative Product-truth complexity v6 meter

## Result

`DONE` — the measurement-only v6 authority is frozen and pushed at immutable commit
`e14f72004d5a64f3ebd07b0842b027e137e2ca32`. Main committed exactly 122 allowed added paths: one
v6 meter, one v6 universe, one focused test and 119 v6 fixtures. The commit changes no Product
production, dependency, direct-tool implementation, Work fence, v1-v5 evidence or user-state path.

This handoff does not accept its own implementation. A different actor must review this exact
commit, the linked Work and this handoff. No B1 receipt, Product implementation or destructive
execution is authorized before a zero-finding implementation Review names the immutable SHA and
digests below.

## Operation identity

- Work: [Freeze the authoritative Product-truth v6 meter](../work/product-truth-complexity-v6.md)
- Accepted Design commit: `a8b4d52af33912258e13ab5d949629829b8f23f9`
- Accepted QbD: [v6 unified-proof audit](../qbd/product-truth-complexity-v6-audit.md), receipt
  `89ea2e8e721d4f49abb3b28fbd2297b2`, zero blocker / zero advisory
- Implementer actor: `product_truth_meter_v6`
- Dispatch receipt: `b480d6ba3f0a4a948c6d5d566545c7b9`
- Immutable meter commit: `e14f72004d5a64f3ebd07b0842b027e137e2ca32`
- Historical B0 reference: `7582170a277477ba0d71cf70f53e4e0836874a72`
- Materialized classifier overlay reference: `50deefc1f8e904805c5c990756f3048de33c7ad5`

The meter reads Git-tree bytes. It re-extracts the five exact Work boundaries and inherited
capability/owner-lock authorities from the accepted Design tree, plus the classifier-copy authority
from the v5 interface. Working-tree bytes, candidate-selected paths, fixture names and report prose
grant no authority.

## Frozen instrument and universe

```text
v6 script                  c63d8dc192244034277993142d5b231e801543cb55c79d30597ade2781579f8d
v6 config                  5b6dc528f0cdfe0bca70d833116fc6d78d73a5ce57992dfeedc3685103d22c9e
v6 focused test            8bcb27ef5072be7bd86226afb952179b3cead30699f3a06ef83142fea3b7fd71
119-fixture aggregate      225105d2def3bc817355ccd86dcf3acc1e3b8f46a748388e0e3afeb4b8210d46
boundary set               9f49e4baebaccd144e66a0edf0c6850dddb87fc7c64f959d60da5255397c4b93
frozen membership          653f89542f0cf4f36d55e06b8824a67e290668745efcd1109519138d32603b8e
frozen membership paths    1081
```

The fixture aggregate hashes the sorted relative-path/SHA-256 manifest under
`fixtures/complexity-v6`. The immutable commit contains 122 additions and no modification or
deletion. Every path is inside the Work's allowed v6 output boundary. Every inherited Work has zero
uncovered path and B0 has zero candidate-closure growth.

## Authority and shared Proof IR

```text
database capability block       adfe8f30c33747fb071328e1ce275975af5029d987b4260020e54202323dd85a
owner-lock block                 858c1546f4b790a52b8ad14ab9498fa9589bfa8326b5d2c36978b278bfd070d4
derived capability inventory     0a6e53f7d1def5d8898122784b212e27994262a6838a48c0f7904966bcb502b3
derived inventory entries        125
classifier-copy raw block        b56f8b6c6bd0d64b0d8d1002ead8ee575da62f458d2936cd1a93ab7af84b7365
classifier positive flow         cc6e4cdf323ff3ed549c8b6c457fd78dbfa842a3e75e05f298d529413eb91456
B0 unified Proof IR               c304ce4f5889399b2611cceedba2e14cbfc6803a06f439562b0f6756caa6e850
```

Classifier, owner-lock and legacy terminal proof now consume one resolved-symbol event IR. It
records exact call/construct/return/throw/branch/try/catch/join events, owner identity, loop depth,
completion region and bounded resource/task identities. The report freezes the bounds:
call-string `4`, points-to set `16`, states per node `128`, event tokens `512`, task tokens `128`
and loop epochs `2`. Overflow is an explicit proof failure, never a success widening.

The classifier proof distinguishes invocation-fresh scratch, retired source, strict-descendant
copy, database handle and cleanup events. Helper return dataflow rejects module cache and source/copy
phi. A reachable conjunctive validation must dominate every copy return; close, exact-root removal
and absence are checked across cleanup completion, and a catch cannot translate cleanup failure to
safe return. Alpha-renamed non-authority helper locals and nested unconditional cleanup remain
accepted.

The owner proof creates dynamic acquisition epochs, retains held only on the same token/binding,
and marks repeatable-loop acquisition as `many/unknown`. Resolved Promise/microtask scheduling
follows direct and literal-property closure aliases to release. The same task must be joined; a
joined release remains released, while joined non-releasing local and property controls pass.
Legacy proof enumerates all `2^N` assignments in the selected authority slice. Every present-run
terminal must retain `throw:PREBASELINE_RESET_REQUIRED` after catch/finally processing, separately
from current-sink nonreachability.

The eight immutable v5 Review counterexamples now fail their exact gate:

- module-cached scratch, source/copy return phi, post-return validation and swallowed cleanup —
  `DIRECT_TOOL_CLASSIFIER_COPY_ORIGIN_INVALID`;
- direct and captured-property Promise release plus dynamic `do...while` reacquisition —
  `OWNER_LOCK_FLOW_UNKNOWN`;
- `finally { return ... }` replacing typed reset — `LEGACY_PRESENT_TERMINAL_INVALID`.

Adjacent invocation-local, exact-copy, dominating-validation, nested-cleanup, no-schedule, joined
non-release, `do...while(false)`, `while(false)` and empty-finally controls pass. The complete v5
matrix, including the older direct-tool SQLite/DELETE, branch-token phi, detached microtask,
empty-iterable, false-rethrow, reversed-null and negated-exists cases, remains active.

## Candidate-independent overlay

The module exports exactly `analyzeVirtualCandidate(ref, virtualSources)`. The seam accepts an
in-memory exact-path-to-bytes `Map`, spawns the same analyzer with stdin bytes, resolves the mixed
virtual/ref tree without filesystem writes and returns the complete report. It rejects empty,
duplicate, non-UTF-8, non-source, non-member, authority/Work/config/dependency and missing-member
overlays before analysis. Every accepted overlay path, byte length and SHA-256 is sorted and bound
into the report; any non-empty overlay hard-enforces semantic gates even at B0.

The focused seam check accepts an alpha-renamed Web positive at B0 and an alpha-renamed classifier
positive at immutable materialized ref `50deefc...`; it rejects a validly parsed finally-return
mutation and a non-member `README.md` overlay. The API accepts no expected verdict, fixture name,
root, category, bound or gate override.

## Deterministic historical B0

Two pre-freeze runs and two post-freeze runs produced byte-identical complete JSON:

```text
B0 JSON SHA-256            c1b89a77d9e78e0dbcacc650b8dceb07d0a3e2eea99c738ce29c23ece1f04d69
B0 JSON bytes              1199800
production / steady        265736 / 265736
work-owned production      35517
direct rebuild tool        0
tests / browser / fixture  128125 / 10017 / 1459
measurement                212
resolved import edges      4276
external import sites      1129
computed / unresolved      0 / 0
candidate closure growth   0
```

Historical anchors remain exact: `ProductControlPlane.ts=5036`, literal gateway `115`, facade
methods `42`, unique Product RPC methods `36`, Product tables `21`, transaction-wrapper calls `44`,
volatile variables `3`, and production monolith importers `10`. B0 remains observational rather
than accepted behavior; its missing/invalid future owners and current persistence flows remain
visible in the complete report.

## Verification

- `bun x vitest run product-truth/measure-complexity-v6.test.ts --maxConcurrency=4` — `122/122`
  PASS in `288.50s`. The preceding full run found one focused-fixture slicing bug; after the repair,
  the exact failing positive and overlay tests passed before this clean final run.
- Two complete B0 executions before freeze and two after freeze — byte-identical; SHA and byte count
  above.
- `bun run --cwd scripts typecheck` — PASS before and after freeze.
- Candidate and immutable-commit whitespace checks — PASS.
- Frozen scope — PASS: exactly 122 allowed additions, no modification/deletion.
- V1-v5 script/config/test SHA-256 values reproduce their immutable handoffs; the frozen commit
  changes no v1-v5 path. The 14 instrument digests are also asserted by the focused test.
- Accepted five-Work boundary set, membership, capability, owner-lock, classifier and inventory
  digests reproduce exactly at the frozen SHA.
- No Product/dependency/direct-tool behavior, provider, Electron profile, filesystem state or real
  `~/.omnimind` path was read or changed.

## Decisions and caveats

The implementation intentionally preserves the historical statistical/counting layer and replaces
only the rejected semantic proof authority. B0 can contain proof-bound overflow or absent future
roots because it is observational; a non-B0 candidate or non-empty overlay hard-fails the affected
gate. The classifier overlay positive uses a ref where the frozen member exists because the
accepted seam forbids creating a missing B0 member.

No runtime, destructive or migration behavior is implemented here. No B1 state has been inspected,
deleted or authorized.

## Mandatory next stop

A different actor must review commit `e14f72004d5a64f3ebd07b0842b027e137e2ca32` and this handoff in
`reviews/product-truth-complexity-v6.md`. Only a zero-finding `PASS` may authorize a new B1 receipt
that names the Review receipt, immutable v6 SHA, authority/inventory/universe/Proof-IR digests and
candidate-independent overlay evidence. Implementation remains measurement-only; it does not
authorize deletion.
