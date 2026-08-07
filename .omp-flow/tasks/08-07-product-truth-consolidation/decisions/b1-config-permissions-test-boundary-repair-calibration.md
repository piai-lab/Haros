---
type: "Decision"
title: "B1 Service permissions test boundary repair"
---

# B1 Service permissions test boundary repair

## Calibration applied

The B1 implementation correctly changes `preparePrivateServerPaths` to refuse a retired
`state.sqlite` bundle before current Service startup creates or repairs state. The existing focused
permissions test still seeds that retired database and expects startup repair to continue. That
expectation now fails before the permission assertions and contradicts the already-approved direct
first-public fail-closed contract.

This is a single implementation-discovered test consumer of an in-scope production change. The
maintainer has already directed the work to continue aggressively without preserving old schema,
migration, repair or dual compatibility, so the smallest exact boundary repair is authorized
without reopening the product decision.

## Exact boundary addition

B1 additionally owns only `apps/service/src/config.permissions.test.ts`, solely to remove the
retired `state.sqlite` seed and its legacy repair expectation from the existing private-path test
while retaining its current directory/file mode, executable-bit, symlink and outside-target safety
coverage. The test must not add a migration, deletion, fallback, startup repair or direct-tool
invocation for the retired database.

No other Service configuration path is added. A further required path still stops the Work for
another exact map repair.

## Verification delta

The repaired candidate must prove that:

- the focused permissions suite passes without constructing a retired database bundle;
- a separate existing or in-scope focused assertion proves `preparePrivateServerPaths` fails
  closed when the retired bundle is present and does not mutate it;
- current Service directories and database paths retain their private mode, executable-bit and
  symlink protections;
- the scope-aware compatibility scan does not classify this test as a runtime legacy decoder,
  repair path or destructive authority.

## Preserved Work meaning and transition

This repair changes only the allowed test-path list and focused verification. It preserves every
B1 objective, destructive boundary, compatibility deletion, immutable-commit rule, accepted Work
ordering and all prior QbD findings. The repaired Work receives a fresh different-actor scoped QbD
2 audit limited to the necessity and sufficiency of this one test path before that file is edited.
