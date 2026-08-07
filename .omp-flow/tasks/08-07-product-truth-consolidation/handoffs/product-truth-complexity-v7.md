---
type: "Handoff"
title: "Authoritative Product-truth complexity v7 meter"
work: "../work/product-truth-complexity-v7.md"
status: "DONE"
actor_id: "product_truth_meter_v7_r5"
dispatch_receipt: "10dd37a4714e4fed913d3863fe0166d1"
predecessor_receipt: "4286c6cd27b04b3d8a0fdf020c18f9bc"
predecessor_output: "../handoffs/product-truth-complexity-v7.md"
---

# Authoritative Product-truth complexity v7 meter

## Result

`DONE` — the measurement-only v7 authority is frozen and pushed at immutable commit
`5c3e61999e1d406873c957dd9dbb6847cc2487b9`. This r5 candidate repairs the sole P0 in the
[failed r4 Review](../reviews/product-truth-complexity-v7.md): finite right-associative simple
assignment chains now preserve accepted wrapper, global-root and terminal identities across every
eligible lexical LHS. An unresolved nested LHS fails closed. R5 preserves r4's scope-correct
single-assignment alias closure and all earlier frozen inventory, CommonJS and declaration-alias
repairs. The r5 commit changes only the allowed v7 meter, focused test and two bounded structural
fixtures. It changes no Product
production, dependency, direct-rebuild implementation, five Work fence, config authority, v1-v6
evidence or user-state path.

This handoff does not accept its own implementation. A different actor must review this exact SHA,
the linked [v7 Work](../work/product-truth-complexity-v7.md) and this handoff. No B1 receipt,
production implementation or destructive execution is authorized before a zero-finding Review.

## Operation identity

- Accepted Design commit: `1e6d80a2cf0edd67084a1f5dc20e996acc326bd6`.
- Accepted QbD: [v7 PASS audit](../qbd/product-truth-complexity-v7-pass-audit.md), receipt
  `eb833755ad934c1faae5148b5bf09b1d`, zero blocker / zero advisory.
- Failed r1 Review receipt: `73111f8bee7241e19912909c070af9b1`; r2 closed its frozen-member
  inventory P0.
- Failed r2 Review receipt: `8ca1fad594a343328e006b369b080903`; r3 closed its direct
  CommonJS/global-destructure P0.
- Failed r3 Review: [product-truth-complexity-v7](../reviews/product-truth-complexity-v7.md), receipt
  `04c8dca6c3284781a994bd286586429a`, P0 assignment-alias omission.
- Failed r4 Review: [product-truth-complexity-v7](../reviews/product-truth-complexity-v7.md), receipt
  `135c539ca5f84e3182560bb314ce3497`, P0 assignment-chain omission.
- Superseded rejected r4 candidate: `4c1e33d411d9b7b2a5332e5f5211545fc1c721a1`.
- Implementer actor: `product_truth_meter_v7_r5`.
- Dispatch receipt: `10dd37a4714e4fed913d3863fe0166d1`.
- Predecessor implementation receipt: `4286c6cd27b04b3d8a0fdf020c18f9bc`.
- Immutable meter commit: `5c3e61999e1d406873c957dd9dbb6847cc2487b9`.
- Historical B0 reference: `7582170a277477ba0d71cf70f53e4e0836874a72`.

The meter reads Git-tree bytes only. Five exact Work blocks and the raw-effect, effect-ingress and
B1-verifier blocks are re-extracted from the accepted Design tree and matched against their
canonical SHA-256 pins. Candidate bytes, fixture names and report prose cannot add a path, owner,
operation, state, effect class, selector, dependency disposition or expected verdict.

## Frozen instrument and authority

```text
v7 script                     d2ee14dbe4be887d5e01efa76e57ae87cf435ba2ece5cb0280baf2e5e4682ad2
v7 config                     79832f82fe60e66cb8ba3f2bb0ed10e91d3557980795732c14ce81a9ff3a8712
v7 focused test               01b98f4adbece5ff14a31862d923b2b625f97c2b69fb1d985ec66870facc7a90
64-fixture aggregate          b35b0b57891ba7033c893dfe6a504bcb5edc31e286fa5e04e44846f692369036
frozen membership             3add77daab3e57ad284e4d7924db9a9b0598befd26f1dc4fed7d21eef886a7ef
frozen membership paths       1093
v1-v6 aggregate manifest      73fb340a92e2eb516deff9b423650155bd9929a377bffeec555ef01a4b466492
```

The fixture aggregate hashes the sorted relative-path/SHA-256 manifest under
`fixtures/complexity-v7`. Post-freeze `git diff --name-status SHA^ SHA` reports only four allowed r5
paths: the script and focused test modified, plus two added fixtures. The config is byte-identical
to r4 and the full v7 fixture universe is 64 files. The script remains executable; all
fixture/config/test files are regular non-executable blobs.

The five accepted Work boundary digests are:

```text
direct-first-public-b1                    926cc4a5b92459213d3e4de5880c463576af2f6a60f9078752a24e5e263c8a4e
native-host-package-root-binding          c85e1d66b3945573e86d5cdc7c2499bb1dc3136d810d02913be6e4a04c5d6de5
product-execution-leaf                    dec2eea264a3e638753fae7a548f1bb249f6f21bf5bc4a7011de05ddde5d3ca4
product-state-store                       2f3a862745d5edb40b9bcf793dde7d66d048b0094276655e4223eccad5c5a36a
product-execution-coordinator-facade      124e32d7478469dd9973977573619371f5af863ed8f67d75fc2cc7d3643e79d9
```

The accepted machine authorities reproduce exactly:

```text
raw-effect universe             35ce67d0e9d09d48cb8f4fe8c8bbc49a1c70b69c2b5a175c44c1c353ca8c7849
effect-ingress authority        68321678a2f8c9ee36b03700486e35d3873d3e759fd3332ffe32ecdf28b86d5c
B1 verifier universe            b1cfa235988b54090e7807d518f8e67864e69aed80b6d84664a2fa3d7e7fc371
fixture catalog                 369381e5b06db8e32a68d6e6daebc408afea4b9780b54180c3089c147ca2f3fe
race/kill case identities       d09aadf1e78994ad65a4804de4d791f79762066e9da864c435ec126cf860f892
state-ID array                  53df95249fe8514114bdb0e45c16c079340b169da1aa92f132e9c173cc14b4d5
operation-ID array              074df92009c19f7672060e323e57b5525eae2c05df0414213388842c9b4c4e36
```

The verifier validator recomputes all ten owner-state definitions and the ordered catalog digest,
then derives the exact cardinalities: 10 owners, 146 operations, 34 barrier identities, 29 kill
identities, 87 fixture states including `apply.package-empty`, 24 convergence states, 85 expanded
race cases and 65 expanded kill cases. JCS object-key reordering is the adjacent positive; removal,
merge-equivalent omission, cardinality shrink, terminal-ordinal change, barrier/kill omission and
case-digest mutation fail before materialization.

## Structural scope

V7 resolves the accepted-tree bidirectional static import closure once, freezes exact membership,
and resolves the candidate independently. The graph includes static ESM/import-type forms and
literal internal/external bare `require`, `module.require` and structurally bound `createRequire`
result calls. A candidate edge may not expand the set in either direction. Computed/unresolved
targets, unknown workspace/package exports, manifest/lock byte drift, accepted dependency identity
drift and a new native-addon target fail mechanically.

The raw-effect inventory scans every present frozen member categorized as production or direct-tool
and rejects an unparseable source. It implements only the accepted finite syntax: static and
CommonJS imports, namespace/destructure/alias/re-export, `module.require`, `createRequire` result calls,
`process.getBuiltinModule`, dynamic import, Node/Bun/global terminals, exact global wrappers,
literal/nonliteral computed selectors and `.node` targets. It records path, line, source form,
resolved symbol, enclosing declaration and class. Exact owner/class containment, raw export/public
type escape and the Product B1-to-C owner overlap are structural failures. Fixtures cover
`Bun.spawnSync`, Bun `$`, `process.dlopen`, `globalThis`/`self`/`window`, literal and nonliteral
computed selectors, repeated/shadowed wrappers, raw re-export/public type, new owner and dependency
export/digest mutations. R2 adds a closure-only raw negative, an adjacent internal-require positive,
three outside-frozen CommonJS edge escapes and a computed CommonJS target negative. B0 regressions
bind ingress in `atomicWrite.ts`, `attachmentStore.ts` and `browserUsePipeServer.ts`, the closure-only
paths independently identified by the failed Review.

R3 adds direct literal bare `require`/`module.require` terminal recording across root return,
member call, constructor, destructure and namespace forms; structurally bound `createRequire`
results reuse the same exact module/export classification. A lexical scope table for source,
function, block, loop and catch bindings prevents an unrelated local declaration from hiding a real
global root elsewhere, while a truly shadowed local `process`/`Bun` is not classified. Scoped
wrapper/root aliases and dot, literal-computed and destructured roots normalize through the accepted
grammar; an immediate computed selector on `process`/`Bun`, including through a wrapper alias,
fails mechanically. This remains AST binding/syntax analysis, not a control-flow or points-to model.

R4 accepts only a simple `Identifier = expression` assignment whose left identifier resolves to an
existing lexical binding and whose right expression resolves to an accepted wrapper, global root or
raw terminal. Hoisted `var` uses the same function/source scope table. Any second or unresolved write
to that raw alias, or a compound, update, destructuring or property write, emits
`RAW_ALIAS_WRITE_UNKNOWN`; standalone compound/destructuring writes with a raw RHS also fail closed.
Benign local assignments and truly shadowed local-root assignments remain adjacent positives. The
meter records this finite syntactic binding fact without interpreting branch order or runtime value.

R5 recursively unwraps only finite right-associative simple `Identifier = expression` chains. Each
left identifier must resolve to an existing current or ancestor lexical binding; every eligible LHS
receives the same accepted wrapper, global-root or terminal identity for subsequent syntactic uses.
An unresolved nested binding, non-identifier LHS, mixed operator, duplicate write or unknown raw
write remains `RAW_ALIAS_WRITE_UNKNOWN`. A three-level raw chain in a closure-only frozen member is
the negative witness; an adjacent three-level ordinary-object chain is the positive. This adds no
branch/order claim, CFG, SSA, points-to or runtime value interpretation.

The script contains no candidate verdict input and no CFG/ICFG, SSA, points-to, Promise/task,
Effect, catch/finally, scheduler, resource-lifetime or semantic-overlay interpreter. It does not
claim cleanup, refusal order, path provenance, lock lifetime, scheduling, exception identity, race
freedom or crash convergence. Those remain owned by the separately frozen B1 capability/trace/
fault/race/kill verifier and source Review.

## Deterministic historical B0

Two distinct post-freeze temporary outputs are byte-identical:

```text
B0 JSON SHA-256               aa114aeb6239dffdc10ef8023ea3399bb9e8705f5960560e5766d80abe06b16c
production / steady           266070 / 266070
direct rebuild tool           0
measurement                   212
resolved internal edges       4276
multi-member SCCs             3
present / frozen members      1063 / 1093
raw ingress count             812
raw ingress digest            d1b60f2ed12a9cdca75752d94fd7a69c055d865d4fe5397f61550bbc2fe82d3a
observed violation count      712
observed violation digest     a3f10097eeaa387fddba512addbe386c2a5b01be5e04021a1a12a4d3a168ce43
```

B0 remains observational, not accepted behavior. Its exact historical manifest/lock bytes are hard
bound separately from the accepted current dependency bytes. `classic-level` and `node-gyp-build`
are correctly reported unavailable at B0; the pinned Effect SQLite dependency is present. The
Product owner has two observed B0 ingress references and the future Store has zero, so the frozen
move is exclusive without claiming lifecycle behavior.

Historical anchors reproduce exactly: `ProductControlPlane.ts=5036`, literal gateway `115`, facade
methods `42`, unique Product RPC methods `36`, Product tables `21`, transaction-wrapper calls `44`,
volatile variables `3`, and production monolith importers `10`.

## Verification

- `bunx vitest run scripts/product-truth/measure-complexity-v7.test.ts` — `67/67` PASS post-freeze
  in `130.98s`; all 64 fixture files are referenced.
- Two complete post-freeze B0 executions in distinct `mktemp` files — byte-identical; report digest
  above.
- `bun run --cwd scripts typecheck` — PASS post-freeze.
- `git diff --check` — PASS before and after freeze.
- Frozen r5 scope — PASS: exactly two allowed v7 modifications and two allowed fixture additions;
  no config, production, dependency, v1-v6, Work, verifier or user-state path changed.
- V1-v6 script/config/test SHA-256 values match their immutable expected values; the focused test
  asserts every individual digest.
- Accepted Work, raw-effect, ingress, verifier, dependency, universe and counter digests reproduce
  from immutable Git objects.
- No production/dependency/direct-tool behavior, provider, Electron profile, filesystem state or
  real `~/.omnimind` path was read or changed.

## Decisions and caveats

The meter deliberately reports B0 raw-effect nonconformance instead of relabelling it green. Only
the exact B0 SHA selects that observational inventory; a later B1/C candidate hard-fails structural,
dependency, raw-ingress, owner-allocation or stable-count violations. Dependency source-closure
digests and export classes are accepted Design authority; the exact manifests and lock bytes bind
the candidate resolution universe.

No runtime or destructive behavior is implemented here. No first-public, Package or user state was
opened, inspected, deleted or migrated.

## Mandatory next stop

A different actor must re-review commit `5c3e61999e1d406873c957dd9dbb6847cc2487b9` and this handoff in
`reviews/product-truth-complexity-v7.md`. Only a zero-finding `PASS` may authorize B1 to consume the
immutable v7 SHA and digests. The reviewer must reject any claim that v7 statically proved cleanup,
refusal, locking, scheduling, fault, race or crash-convergence behavior.
