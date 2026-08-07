---
type: "Handoff"
title: "Authoritative Product-truth complexity v3 meter"
work: "../work/product-truth-complexity-v3.md"
status: "DONE"
actor_id: "root_product_truth_meter_v3"
dispatch_receipt: "6be57cfc35c54ceba64e002032eae363"
predecessor_receipt: "fb5fc8557e1c484a8059d17b91679a5a"
predecessor_output: "../qbd/product-truth-complexity-v3-pass-audit.md"
---

# Authoritative Product-truth complexity v3 meter

## Result

`DONE` — the v3 meter is frozen in dedicated commit
`ee980e5c304943f856df74f364f6464996652bef`. That commit contains only the v3
script, config, focused test and 33 bounded adversarial fixtures. It changes no Product runtime,
direct-rebuild behavior, dependency, Work Concept, Campaign state or user state. The required next
stop is a different-actor Review; no B1 production receipt is authorized before that Review passes.

## Identity and authority

- Work: [Freeze the authoritative Product-truth v3 meter](../work/product-truth-complexity-v3.md)
- Accepted Design commit: `103e1b434ec9c995702b2ff5dd2e004528e78520`
- Accepted QbD: [v3 PASS audit](../qbd/product-truth-complexity-v3-pass-audit.md), receipt
  `fb5fc8557e1c484a8059d17b91679a5a`, `0` blocker / `0` advisory
- Implementer actor/receipt: `root_product_truth_meter_v3` /
  `6be57cfc35c54ceba64e002032eae363`
- Immutable meter commit: `ee980e5c304943f856df74f364f6464996652bef`
- B0 tree: `7582170a277477ba0d71cf70f53e4e0836874a72`

The config re-extracts the five closed `omp-flow-production-boundary-v1` blocks from the accepted
Design Git tree on every run. It does not read Work authority from B0/B1/C, a working-tree diff or a
candidate-selected list.

## Frozen authority digests

```text
boundary set       9f49e4baebaccd144e66a0edf0c6850dddb87fc7c64f959d60da5255397c4b93
path membership    b4cd414a351e6316464ee66dc0874384c2459f6467c571f9c7bfd328d8355d55
v3 script          670f8a0e5498d7b69f83f40d68d0119dea7e18114096dd48dd8dab9cdb0b12f5
v3 config          973d18b102ed42cb6815bb09899368857618b1f80e4250d2833c20f2fd590159
B0 complete JSON   fa167943151b22960353d2da7155f863df4f93fa3dd2b6febe0ff9288fb7d5fe
B0 JSON bytes      1,130,678
```

Per-Work normalized block digests:

| Work | Production / measurement / dependency rules | SHA-256 |
| --- | ---: | --- |
| direct-first-public-b1 | 44 / 1 / 1 | `d65975b3213b538e5723a55e505935930f58a5c510ffe7fc7d70d00f104b2f7c` |
| native-host-package-root-binding | 15 / 0 / 0 | `77f5710f27b6d3fb76591f9fb843d78a0c01ae9c86dede86fd03aad0e72dee88` |
| product-execution-leaf | 5 / 0 / 0 | `c6a413a5a75acf86f374920871b9ec6116f6c3402f5fd98fa1860d0730b25884` |
| product-state-store | 7 / 0 / 0 | `d4529603b430d75acd9a62f85b175daa0361f86ba8b05cd97674c3bdd5e0a121` |
| product-execution-coordinator-facade | 12 / 0 / 0 | `c2cf5a0120c1ebe7a8e779b5b7840184a72db2e0b82f4595ffb50249956335d2` |

The frozen membership has `1,079` paths. B0 materializes `1,063` and reports the other `16` with
zero lines. The design-time resolved-edge snapshot is diagnostic only (`4,258` edges,
`fc1ac7057c38322e8f4f968051e737e655ab15c9f425a46e3b75a23eb3c7714e`); every measured tree is
resolved again and any edge crossing the frozen membership fails.

## Deterministic B0

Two post-freeze executions produced byte-identical complete JSON. Core totals:

```text
production / steady-state lines       265736 / 265736
work-owned production / steady lines   35517 / 35517
direct-tool lines                           0
test / browser / fixture / measurement 128125 / 10017 / 1459 / 212
resolved production edges                4276
external import sites                     1129
multi-node SCCs                               3
computed / unresolved / forbidden external 0 / 0 / 0
candidate closure growth                     0
```

All historical anchors are exact: `ProductControlPlane.ts=5036`, literal gateway `115`, facade
methods `42`, unique Product RPC methods `36`, Product tables `21`, transaction-wrapper calls `44`,
volatile variables `3`, production monolith importers `10`.

Per-Work B0 coverage:

| Work | Materialized | Missing future/first-public exact paths | Uncovered |
| --- | ---: | ---: | ---: |
| direct-first-public-b1 | 38 | 6 | 0 |
| native-host-package-root-binding | 15 | 0 | 0 |
| product-execution-leaf | 4 | 1 | 0 |
| product-state-store | 6 | 1 | 0 |
| product-execution-coordinator-facade | 10 | 2 | 0 |

B0 is deliberately historical, so it reports rather than passes future B1/C semantic gates:
Product DB construction modules/sites `2/3`; SQL writer modules/sites/unknown `2/72/2`; Product
tables `21`; durable state machines `1`; Native Host filesystem writes `18`, Package lifecycle
writes `0`; raw transaction callback exports `0`; Product databases `1`; literal gateway `1`;
Product database sinks/canonical/noncanonical `10/0/10`; required sentinels `8`; forbidden legacy
occurrences `23`; generic Product abstractions `0`. The B0 dependency snapshot also truthfully
reports historical `bun.lock` mismatch; dependency integrity becomes conjunctive outside B0.

## Semantic implementation

- A TypeScript `Program` and `TypeChecker` run over immutable Git-tree bytes with resolved internal
  module edges. Literal `require`, computed/unresolved imports and newly externalized imports are
  included in the same closed gate.
- Candidate membership is fixed independently from candidate content. Future exact paths may
  materialize and add edges only when both endpoints are already frozen; outside importer, target,
  sink or responsibility move fails.
- Product database sinks are dynamically rediscovered. Imported aliases use compiler symbol
  identity; local/wrapper/branch dataflow is closed and bounded. A sink must be inside membership
  and derive solely from the canonical `resolveProductDatabasePath` declaration.
- Legacy identities are partitioned into tool-only, exact presence sentinel or forbidden use.
  Sentinel outputs may only drive presence comparison and typed `PREBASELINE_RESET_REQUIRED`.
- Core import direction, SCC, SQL writer, DB construction, durable state machine, literal gateway,
  Native Host Package write, raw transaction export and generic Product abstraction evidence are
  emitted explicitly.
- Production/direct-tool LOC remains membership-bound. Tests, browser tests, fixtures and
  measurement evidence are classified separately across the immutable candidate tree and cannot
  expand production authority.

## Adversarial proof

Focused verification passes `35/35`. It includes positive future Store + canonical sink and exact
Web/Product-bundle presence sentinels, plus independent failures for:

- omitted Work rule or membership, changed Design SHA/digest and class overlap;
- candidate-created glob, outside importer/target/`require`, computed/unresolved/new external
  import and responsibility move;
- dependency drift and new generic Product manager;
- outside/unclassified/competing Product DB sink, spoofed resolver, ignored resolver, aliased or
  templated path and wrapper/branch mixed provenance;
- sentinel decode, log, return, mutation, alias, helper escape and non-dominating branch.

Each negative fixture exits nonzero with its bounded diagnostic and emits no JSON report.

## Historical immutability and verification

V1 and rejected v2 bytes remain unchanged:

```text
v1 script  cf5e096cb69e584573bde307cf8677de9bca9ed7705b2f31fa3fb5783a18fd4f
v1 config  2bcbf41aa0a5f56be2da892caf4af4be583c45ece18fe3d1e627fdda86c9d79f
v2 script  4e64f425e60051155c722769133894919fe82944a79e236ed5ff59ba0b47217f
v2 config  1c4864cb3096d3d4d3fea090feecea06db3ff6d095bb01ef3c4fe8e5e6d5ddfc
v2 test    c5d12cff989ae0f518c84ff97c73c14d45bcb6931a1be6af30a99c0dde42496c
```

- `bun run --cwd scripts test -- product-truth/measure-complexity-v3.test.ts` — `35/35` PASS.
- `bun run --cwd scripts typecheck` — PASS.
- two full B0 runs plus `cmp -s` — byte-identical.
- `git diff --check` — PASS.
- immutable commit path audit — exactly the 36 allowed v3 meter/config/test/fixture paths.
- branch checkpoint pushed to `origin/codex/pi-native-v1` without force or `main` mutation.

No destructive command, direct-rebuild apply, Electron profile, provider, live store or real
`~/.omnimind` state was read or run.

## Mandatory next stop

A different actor must review the immutable meter commit and this handoff in
`reviews/product-truth-complexity-v3.md`. A `PASS` with no material finding is required before Main
may issue a repaired B1 production receipt naming the Review receipt and these v3 digests.
