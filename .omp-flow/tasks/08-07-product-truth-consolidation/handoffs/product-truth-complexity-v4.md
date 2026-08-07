---
type: "Handoff"
title: "Authoritative Product-truth complexity v4 meter"
work: "../work/product-truth-complexity-v4.md"
status: "DONE"
actor_id: "product_truth_meter_v4"
dispatch_receipt: "5e9c3d3ebce44c5bb6a159c7163c8c9e"
predecessor_receipt: "83ebaaf9491b4409b64e929680648174"
predecessor_output: "../qbd/product-truth-complexity-v4-final-audit.md"
---

# Authoritative Product-truth complexity v4 meter

## Result

`DONE` — the v4 measurement authority is frozen at immutable commit
`70eb77da3512f5aa91b420302623bc91efa56f0b`. That commit contains exactly 91 allowed v4 code
paths: one script, one config, one focused test and 88 fixtures. It changes no production,
dependency, direct-tool, Work/Design/decision/Review, Campaign or user-state path. Main pushed the
commit to `origin/codex/pi-native-v1`; the frozen commit was clean when this handoff was produced.

A different actor must now review this immutable commit and handoff. No repaired B1 receipt or
Product production work is authorized before that Review returns zero-finding `PASS` and names
this exact SHA and the v4 digests below.

## Operation identity and authority

- Work: [Freeze the authoritative Product-truth v4 meter](../work/product-truth-complexity-v4.md)
- Accepted Design commit: `2d8fc8c9fcfff6fec33b433bbb449099bd8826dd`
- Accepted QbD: [v4 final audit](../qbd/product-truth-complexity-v4-final-audit.md), receipt
  `83ebaaf9491b4409b64e929680648174`, zero blocker / zero advisory
- Implementer actor: `product_truth_meter_v4`
- Dispatch receipt: `5e9c3d3ebce44c5bb6a159c7163c8c9e`
- Immutable meter commit: `70eb77da3512f5aa91b420302623bc91efa56f0b`
- B0 tree: `7582170a277477ba0d71cf70f53e4e0836874a72`

The meter reads immutable Git-tree bytes. It re-extracts the five exact Work blocks and both strict
authority blocks from the accepted Design tree on every run. Working-tree content,
candidate-selected paths and B0/B1/C prose do not grant authority.

## Frozen instrument and universe

```text
v4 script                 40a37ed772ee50770ce7cd12a260c9ad18b950db7ff155aaa4bb1101b72e9cac
v4 config                 a45907fa6c7a270a6508b2a6bf0ac9f4efa063dfbfd58dcce470edbd5f08036d
v4 focused test           a9362a73205e08f51606f9b341609c54fe0ba4c3bb8ea1b84d4860fc3c0731fc
88-fixture aggregate      116868e49d14a6eea815feb073d81cb8a3d051e45e636a286d49e436b6a9632d
boundary set              9f49e4baebaccd144e66a0edf0c6850dddb87fc7c64f959d60da5255397c4b93
frozen membership         653f89542f0cf4f36d55e06b8824a67e290668745efcd1109519138d32603b8e
frozen membership paths   1081
```

Normalized Work authority:

| Work | Production / measurement / dependency | SHA-256 |
| --- | ---: | --- |
| direct-first-public-b1 | 44 / 1 / 1 | `d65975b3213b538e5723a55e505935930f58a5c510ffe7fc7d70d00f104b2f7c` |
| native-host-package-root-binding | 15 / 0 / 0 | `77f5710f27b6d3fb76591f9fb843d78a0c01ae9c86dede86fd03aad0e72dee88` |
| product-execution-leaf | 5 / 0 / 0 | `c6a413a5a75acf86f374920871b9ec6116f6c3402f5fd98fa1860d0730b25884` |
| product-state-store | 7 / 0 / 0 | `d4529603b430d75acd9a62f85b175daa0361f86ba8b05cd97674c3bdd5e0a121` |
| product-execution-coordinator-facade | 12 / 0 / 0 | `c2cf5a0120c1ebe7a8e779b5b7840184a72db2e0b82f4595ffb50249956335d2` |

B0 materializes respectively `38/44`, `15/15`, `4/5`, `6/7` and `10/12` declared production
paths. Every Work has zero uncovered path and zero closure growth. The five resolved internal
closure digests are, in the same order:

```text
a5e651c86bb0f4ac95aaac56b608f11ef6bc669a6f774855db1e13d9071d1c74
19db6792550a71fa459af57cd08b9f2778293c04e8bf8175cc7df730467e1c69
812fb271a6467eaf1ba8fcad533b6f04d2525d2064aded9c21ffd1865f2a6e87
4c073e8f002a6a443d826d36922f807ece39c11de0fc71c0ccedb98970450abd
ad497c14b3006696968388571f8aa68f91882ce049e81abf6bf16df6daef1bf6
```

## Capability and owner-lock authority

```text
database capability block adfe8f30c33747fb071328e1ce275975af5029d987b4260020e54202323dd85a
owner-lock block           858c1546f4b790a52b8ad14ab9498fa9589bfa8326b5d2c36978b278bfd070d4
derived inventory          0a6e53f7d1def5d8898122784b212e27994262a6838a48c0f7904966bcb502b3
derived inventory entries  125
```

The only primitive terminals are `bun:sqlite#Database` and
`node:sqlite#DatabaseSync`. The exact approved origins are the canonical Product resolver,
canonical service `deriveServerPaths(...).dbPath`, the declaration-owned read-only/finally-cleaned
classifier scratch copy and the three declaration-scoped `:memory:` origins in the authority
block. Absence of Product-looking text never proves non-Product origin.

The independently derived inventory contains:

| Kind | Count |
| --- | ---: |
| primitive | 2 |
| terminal-invocation | 5 |
| callable | 22 |
| callable-flow | 18 |
| closure-flow | 10 |
| dynamic-loader | 2 |
| receiver | 66 |

Accepted dependency bytes:

| Kind | Path | SHA-256 |
| --- | --- | --- |
| source | `src/SqliteClient.ts` | `da19c2b9c598a762210fe46cdf395fe073e6b8edfc6c07cde7a68b3267f82a42` |
| emitted JS | `dist/SqliteClient.js` | `d2e9cc0a04f995daa6c3ec60fb13a002a347aac1f38c961e2312812f0b93d3d1` |
| declaration | `dist/SqliteClient.d.ts` | `3c935cf536bacf24abe1d8c334e2ca1c88109b72a4f4ae9ad6cb5ea3da62cf8b` |
| package | `package.json` | `eeac5072ed815447accf007861eb2173416cb1aea97658e7258f35d3f97c1b0d` |

The exact lock authorities are
`apps/service/src/persistence/DatabaseLifecycleLock.ts#acquireDatabaseLifecycleLock` and
`#releaseDatabaseLifecycleLock`. The Product owner is
`ProductControlPlane.ts#makeProductControlPlaneLayer` with `canonical-product`; the service owner
is `Layers/Sqlite.ts#makeSqlitePersistenceLive` with `canonical-service`. The retired direct-tool
lock at `scripts/product-truth/database-lock.ts` is explicitly excluded from runtime proof.

## Semantic implementation

- Capability discovery starts only from the two primitive terminals, then derives repository and
  locked dependency callables, dynamic loaders, layer/factory/tag chains, wrappers, flow edges and
  handle receivers before applying any Product predicate.
- Candidate openers are resolved by symbol identity and contextual path slots. Parameter/caller,
  local alias, return, conditional merge, object spread and last-write provenance are propagated;
  canonical Product, raw Product, canonical service, approved scratch/memory and unknown remain
  distinct. New path/handle-carrying external capability is unresolved and fails closed.
- Product/service/Web current-generation sinks are discovered before refusal ordering. The runtime
  model records legacy probe/decision/typed-throw nodes, current sinks, exact acquire/release and
  lock state at sinks. Product/service require both pre-mutation and post-lock complete cuts plus
  the same definitely-held handle/binding; Web requires its complete v1/v2 cut.
- Guard conditions are truth-interpreted: target-present and all-present assignments must take the
  typed-throw successor, while all-absent must advance. Reversed-null and negated-exists guards
  cannot manufacture a certificate. Unsupported callbacks, Effect interpretation, loops,
  recursion, finalizer ordering or lock flow fail closed.
- Release aliases, early/finally release, sibling handles, same-path reacquisition with a new
  handle, wrong binding, dropped acquire and nested Effect finalizer uncertainty cannot satisfy
  same-binding must-hold.

## Deterministic historical B0

Two executions after freezing `70eb77da3512f5aa91b420302623bc91efa56f0b` produced byte-identical
complete JSON:

```text
B0 JSON SHA-256           fa5d8a01437ce5e3396621112d6d42a30fa4deb4235c7783e18f03d43a0c505a
B0 JSON bytes             1178725
production / steady       265736 / 265736
work-owned production     35517
direct rebuild tool       0
tests / browser / fixture 128125 / 10017 / 1459
measurement               212
resolved import edges     4276
external import sites     1129
computed / unresolved     0 / 0
candidate closure growth  0
```

All historical anchors remain exact: `ProductControlPlane.ts=5036`, literal gateway `115`, facade
methods `42`, unique Product RPC methods `36`, Product tables `21`, transaction-wrapper calls `44`,
volatile variables `3`, production monolith importers `10`.

B0 is deliberately observational, not green. It reports 23 database sinks: 0 canonical Product,
7 noncanonical Product and 15 unknown persistent sites; no candidate unresolved capability or
outside-membership sink. It reports 8 required sentinels, 0 exact and 23 forbidden legacy
occurrences. Product has 3 current sinks, 1 acquire, 2 releases and 4 violations; its recorded
post-lock state is held only under raw/unknown binding and therefore fails binding. Service has 2
current sinks, 1 acquire, 1 release and 3 violations; its held state has unknown binding. The Web
entry is historically absent and reports `CONTROL_FLOW_UNKNOWN`. These findings are evidence of the
work B1 must repair; only the configured B0 SHA may report them without weakening authority,
inventory, membership or dependency failures.

## Complete adversarial proof

The frozen suite passes `90/90` in `188.40s`: two instrument/determinism/immutability tests, seven
positive fixtures and 81 negative fixtures. All 88 fixtures are executed.

Positive coverage includes future exact Store materialization, exact legacy sentinels, canonical
Product direct resource, service interpreted Effect resource, Web refusal and a canonical neutral
wrapper. Negative coverage includes all inherited authority/universe/import/legacy/provenance
cases plus:

- every primitive and approved origin, every owner-lock identity/owner/exclusion, source/JS/d.ts/
  package drift and a 125-entry exhaustive inventory omit/mutate sweep;
- canonical/raw mixed callers, neutral constructors, branch/alias/template flow, object-spread
  overwrite, custom Effect tag/layer/Promise/spread and newly reachable `SqliteMigrator`;
- Product/service/Web sink-before-cut, bypass/conditional helper, missing sidecar, present
  fallthrough, catch/finally/deferred path, unsupported Effect, recursion and zero-iteration loop;
- reversed-null Web refusal and negated Product/service `existsSync`, which fail present-successor
  interpretation rather than passing from source order;
- dropped/wrong acquire, early/aliased/finally release, sibling handle, release/reacquire of the
  same path under a different handle and nested Effect finalizer LIFO uncertainty.

Every negative exits nonzero, emits no JSON report and exposes its bounded closed failure code.

## Historical immutability and final verification

```text
v1 script  cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f
v1 config  2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f
v2 script  4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f
v2 config  1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc
v2 test    c5d12cff989ae0f518c84ff97c73c14d45bcb6931a1be6af30a99c0dde42496c
v3 script  670f8a0e5498d7b69f83f40d68d0119dea7e18114096dd48dd8dab9cdb0b12f5
v3 config  973d18b102ed42cb6815bb09899368857618b1f80e4250d2833c20f2fd590159
v3 test    78f022b986d1916c67020b995a48f08d00bec9eceaa0e369d13d107749ebeeb4
```

- Frozen SHA/path audit — PASS; exactly 91 allowed v4 code paths.
- `vitest run ...measure-complexity-v4.test.ts --maxConcurrency=4` — `90/90` PASS.
- `bun run --cwd scripts typecheck` — PASS.
- Two full frozen-meter B0 runs plus `cmp -s` — byte-identical.
- `git diff --check`, untracked pre-freeze path checks and historical hash comparisons — PASS.
- No real `~/.omnimind`, provider, Electron profile, live store, dependency, production or
  direct-rebuild apply path was read or changed.

## Mandatory next stop

A different actor must review commit `70eb77da3512f5aa91b420302623bc91efa56f0b` and this handoff in
`reviews/product-truth-complexity-v4.md`. Only zero-finding `PASS` may authorize a new repaired B1
receipt naming that Review receipt plus the immutable v4 SHA, script/config, boundary/membership,
capability/owner-lock and inventory digests above.
