---
type: "Decision"
title: "B1 LevelDB dependency-lock boundary repair"
---

# B1 LevelDB dependency-lock boundary repair

## Calibration applied

The [appSettings boundary-repair PASS approval](b1-appsettings-boundary-pass-approval.md) authorized
the exact eleven-path compatibility boundary and required any further implementation-discovered
path to stop for map repair. During resumed B1 implementation, the exact Chromium LevelDB work
exposed one dependency-output gap:

- [`scripts/package.json`](../../../../scripts/package.json) is already an allowed B1 output for
  the tool's workspace dependency and the frozen meter already classifies `classic-level` as an
  expected external import;
- the current scripts workspace importer and root `bun.lock` contain no `classic-level` direct
  dependency or resolution closure, so the existing dependency graph cannot realize the tool;
- the [direct rebuild interface](../interfaces/direct-first-public-rebuild.md) requires `inspect`
  to read a stable offline private copy of each exact Chromium profile and expressly forbids
  launching Electron or a lock-taking profile helper;
- using Electron against a source profile would acquire or create profile/LevelDB state and may
  write unrelated metadata, contradicting source-read-only `inspect`, exact-key `apply` and the
  whole-profile write trace.

The explicit repair direction therefore selects the single dependency-lock addition below. It
does not change the selected tool design, permit an Electron workaround or authorize product-code
implementation in this operation.

## Exact boundary addition and purpose

B1 additionally owns only the repository-root `bun.lock`, solely to record the deterministic
resolution and integrity closure of one exact, non-range direct `classic-level` dependency declared
in the already-owned `scripts/package.json` for `scripts/product-truth/**`.

This authority is narrow:

- `scripts/package.json` may add only that one exact direct dependency for the Product-truth tool;
- `bun.lock` may change only the `scripts` workspace importer and the package-manager-produced
  `classic-level` transitive/platform closure required by that exact pin;
- no unrelated dependency, version, catalog, override, workspace importer or package-manager
  policy may drift;
- `classic-level` remains tool-only and may not be imported from `apps/**`, `packages/**`, normal
  Service/Desktop/Native Host startup or packaged runtime code.

The eleven implementation-discovered compatibility production/test paths remain exactly eleven;
`bun.lock` is a separate dependency-output boundary, not a twelfth compatibility path.

## Preserved LevelDB and safety contract

The dependency realizes the already-approved Chromium storage contract without changing it:

- `inspect` may open only a stable tool-owned private copy of the exact profile origin storage and
  must leave source profile bytes and locks unchanged;
- `apply` still obtains the two profile locks before repeating inspection and may mutate only the
  exact legacy `v1` and `v2` keys, followed by immediate absence rereads;
- neither command may launch, import as a storage adapter, or drive Electron against a real source
  profile; neither may enumerate or rewrite unrelated LevelDB keys;
- the canonical `g1` key, unknown keys and every non-target profile byte remain protected by the
  existing exclusion hashes and whole-profile operation/write trace;
- the direct tool remains network-free at execution time and gains no new target, mode, decoder,
  backup, restore, migration, profile identity or packaged-runtime surface.

The frozen `product-truth-complexity-v1` files remain byte-identical to commit
`45df49a6afde882d32c1dcd00457c7787d227e4a`. Their existing `classic-level` import classification
is sufficient; `bun.lock` is not added to the measurement universe and neither meter file may be
modified.

## Exact verification delta

The repaired B1 verification must additionally prove:

- `scripts/package.json` contains exactly one non-range direct `classic-level` pin and the root
  lock's `scripts` importer records that same version;
- a filtered lock diff contains only that importer entry and its required integrity-checked
  transitive/platform closure, with no unrelated package refresh; `bun install --frozen-lockfile`
  succeeds without changing `bun.lock`;
- the tool import resolves from the scripts workspace, while tracked imports under `apps/**` and
  `packages/**` remain zero and release/package dependency closure excludes the tool dependency;
- focused Chromium LevelDB fixtures prove read-only `inspect` from a stable private copy and locked
  `apply` deletion/reread of only the exact legacy keys, with `g1`, unknown keys and all other
  profile observations unchanged;
- process, import and network spies prove neither command launches Electron, uses a real-profile
  Electron reader/writer, or performs network access;
- `git diff` and byte/digest checks prove both frozen meter files are unchanged from the recorded
  freeze commit and the dependency lock is not added to the measurement universe.

Any second manifest dependency, unrelated lock drift, runtime importer, Electron-on-source-profile
path, broader key mutation, network requirement or meter change rejects the repaired boundary.

## Preserved Work meaning and transition

This repair changes only the B1 useful link, the exact purpose of its already-owned scripts
manifest, the single lockfile output boundary and focused dependency/LevelDB verification. It
preserves all seven B1 done conditions, A1-A15 coverage, destructive targets and exclusions,
immutable unsplit commit/evidence rules, protocol v2, g50, the eleven compatibility paths and the
literal accepted-handoff ordering.

The repaired [B1 Work](../work/direct-first-public-b1.md) must receive a fresh different-actor
scoped QbD 2 audit before implementation resumes. That audit is limited to the necessity and
sufficiency of the one `bun.lock` addition, the exact `classic-level` purpose and the verification
delta above. It carries forward every closed finding from the
[appSettings repair audit](../qbd/b1-appsettings-boundary-repair-audit.md). The prior PASS does not
approve this revised output boundary, and a new model verdict cannot restart B1 without the
applicable human calibration.
