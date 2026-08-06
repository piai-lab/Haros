---
type: "Implementation Work"
title: "Run one trusted headless Pi Package"
revision: "work-run-trusted-headless-pi-package-20260806-r1"
---

# Run one trusted headless Pi Package

## Objective

Deliver the single checkpoint required by [`execution-brief.md` §9](../../../../execution-brief.md):
one exact, representative headless Pi Package runs through Pi `0.81.1`'s native `ResourceLoader`
and Extension lifecycle while Product owns source, rights, trust, immutable stage, current/LKG
generation and active-generation leases. Package executable code, lifecycle semantics and private
state remain owned by Pi/Package inside the existing Native Host.

The selected source is Pi's shipped `todo` example extension from exact npm artifact
`@earendil-works/pi-coding-agent@0.81.1`, upstream revision
`20be4b18d4c57487f8993d2762bace129f0cf7c6`, path
`packages/coding-agent/examples/extensions/todo.ts`, SHA-256
`e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2`. The executable bytes
must remain exact; a Product-owned manifest may only govern them. The source decision and its
limits are fixed in [`research/source-review.md` §4.1](../../../../research/source-review.md).

## Linked authority and evidence

- [Product constitution and source disclosure](../../../../README.md)
- [Product-owned Package facts](../../../../architecture/product-state.md)
- [Native Host and ResourceLoader boundary](../../../../architecture/execution.md)
- [Current checkpoint and proof gates](../../../../execution-brief.md)
- [Pi source/legal evidence owner](../../../../research/source-review.md)
- [Active Campaign evidence owner](../../../../missions/independent-omnimind-v1.md)
- [Bundle scope and stop conditions](../task.md)

The accepted UI/Pi-native Freeze SHA `248b3316651e681d9d4c78f81bec0c84a4cc822c`
remains historical Stage 0–3 product evidence and is not Package proof.

## Source decision gate

The source review records machine-checkable evidence for:

1. exact upstream repository revision, source path, byte digest and exact npm `0.81.1` artifact;
2. publisher/artifact identity and MIT rights applying to the executable and retained notice;
3. reviewed permissions, trust decision and a truthful statement that process isolation is not a
   sandbox;
4. actual `ResourceLoader` loadability, Extension lifecycle hooks, headless tool behavior and the
   unsupported TUI surface on the repository's pinned Pi version;
5. maturity/representativeness: a real stateful tool and Session-backed reconstruction, not a test
   fixture, while making no claim that all Pi Packages are supported.

The gate selected `todo` because all five items reproduced. Any later mismatch blocks staging and
requires revalidation here; it does not permit silently replacing the source or widening support.

## Implementation boundary

- `README.md` and `research/source-review.md` only for exact adopted-source disclosure/evidence.
- `assets/packages/**` for the immutable curated executable and Product-owned manifest.
- `LICENSES/pi-todo-MIT.txt` is the adopted-source legal path required by root source governance;
  the existing `assets/licenses/pi-MIT.txt` is the release-retained Package-staging input. These
  are byte-identical repository responsibilities for the same exact legal text, not divergent
  legal authorities.
- `packages/contracts/src/native-host/**` for typed Package commands and facts.
- `apps/service/src/**` for Product-owned stage/current/LKG/lease state, activation admission,
  generation quarantine, new-lease fallback and rollback decisions plus Native Host integration.
- `apps/native-host/src/**` only for generation-specific native ResourceLoader validation,
  lifecycle execution and native fault observation/report in the existing executable.
- `apps/desktop/src/process/**` only if the existing supervisor needs a bounded LKG recovery seam.
- `scripts/**` and focused tests only for source, boundary, packaged-runtime and fault proof.
- [Implementation handoff](../handoffs/run-trusted-headless-pi-package.md).

No Package/Extension executable may enter Electron Main, renderer or Product Service. Do not add a
second Runtime, Session, Queue, Todo, Workflow, Campaign, Product Store object or Package loader.

## Required behavior

1. Product stage is immutable; Native Host validates the exact artifact through Pi's native
   ResourceLoader before Product activation.
2. Digest, rights/trust, compatibility or load/lifecycle failure leaves current and LKG unchanged.
3. Every accepted Run acquires one generation lease. Activation is refused while that generation
   is leased; no filesystem rescan or hot replacement changes it.
4. The real Package tool executes through Pi. Reconstruction after restart/continuation comes from
   Pi Session entries; Product evidence contains only typed generation/receipt/count facts and no
   Package-private payload mirror.
5. Product Service quarantines a generation from native fault observations and selects LKG for new
   leases without replaying an uncertain Run or giving Engine queue state Product authority.
6. Electron Main, renderer, Product Service and durable Product Store remain alive and free of
   executable Package/private-state ownership across invalid and crashing generations.

## Verification and handoff

During implementation run the narrowest source/identity, contract, Service, Native Host,
supervision, packaged-runtime and boundary checks able to falsify the current change. The handoff
must bind base and changed paths, exact source/legal/trust facts, generation transitions, native
ResourceLoader/lifecycle observations and exact normal/failure/recovery/fault commands, separating
fixtures from the real Package journey.

After a producer candidate exists, a different actor must inspect Work, handoff, diff and exact
artifact; independently run the matrix and the bounded live provider proof needed for the real
Package/private-state journey. Live credentials remain in memory, with hard timeout and sanitized
evidence only. The producer cannot record `PASS`, mark Campaign claims `verified` or declare V1
complete; no commit occurs before that independent review passes.

## Expected handoff

[`../handoffs/run-trusted-headless-pi-package.md`](../handoffs/run-trusted-headless-pi-package.md)
records actor ID, opaque dispatch receipt, evidence, limitations and the frozen candidate tree.
