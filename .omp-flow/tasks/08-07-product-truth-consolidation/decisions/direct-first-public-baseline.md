---
type: "Decision"
title: "Direct first-public baseline"
---

# Direct first-public baseline

## Decision

The maintainer accepts irreversible loss of positively classified pre-baseline development state in
the canonical default `~/.omnimind`. The rebuild therefore creates no snapshot, export, converter,
retention period, restore command, displaced generation or legacy reader. This human calibration is
recorded in the [Brainstorm](../brainstorm.md) and selected by the
[research synthesis](../research/synthesis.md); it supersedes the recovery recommendation in the
earlier store and compatibility research without pretending that the old bytes are valueless.

The only backend root is `path.join(os.homedir(), ".omnimind")`. The `dev` lane is
`~/.omnimind/dev`; the packaged lane is `~/.omnimind/userdata`. Canary, repo-local Electron homes,
environment overrides, archived homes, external drives and recursively discovered roots are not
considered.

The subsequent [QbD 1 repair calibration](qbd1-repair-calibration.md) preserves this exact boundary.
Whole-file deletion is authorized only when both file identity and fixture-specific protected-fact
absence are proved. This is not a legacy decoder or a new permission to destroy protected facts.

## First-public identities

| Authority | Canonical location | Exact marker | Fresh state |
| --- | --- | --- | --- |
| Product | `<lane>/stores/product.sqlite` | exactly one `product_meta(schema_generation)` row equal to `1`, plus the exact checked-in generation-1 DDL fingerprint | Product State Store creates all 21 tables in one transaction |
| service / Automation | `<lane>/stores/service.sqlite` | exactly one `automation_meta(schema_generation)` row equal to `1`, plus the exact checked-in generation-1 service DDL fingerprint | service persistence owner creates the complete current service schema in one transaction |
| Web drafts | key `omnimind:composer-drafts:g1` at origin `omnimind://app` | top-level JSON envelope has exactly `generation: 1` and the current strict state shape | Web draft owner writes and rereads one empty generation-1 envelope when the key is absent |

Product and service creation are independent authority-local transactions. An absent authority, or
an empty SQLite file containing no application table after an interrupted first open, is fresh. One
valid generation-1 database and one fresh authority is also a valid first start: the missing owner
creates only its own store. Any application table without the exact marker, any wrong or duplicate
marker, any DDL fingerprint mismatch, and any legacy filename or Web key produces a typed
`PREBASELINE_RESET_REQUIRED` startup failure. Runtime does not delete, upgrade, import or infer it.

The counters are technical generations, not marketing/app versions. Public data created after this
baseline has a compatibility obligation; the destructive calibration cannot be reused for a later
schema change.

## Positively classified destructive inputs

The direct-rebuild inspector recognizes only these exact classes:

1. Product database bundles named `product-state-v1.sqlite`, with optional `-wal` and `-shm`, in
   either exact lane. A present main database must match a normalized schema-and-marker fixture from
   one of the Product-producing revisions `27cd50b52606a894430492b6494687b7010d623d`,
   `ba847f51bf46e6eb2e5e2459902e05ddb4b2e345`,
   `1f09baa8bfb295ba404ab3d3354df413f7ed7000`,
   `2bfd0d6c96dd4f737b5397969604ce75fba7d81d`,
   `16f14d188e38134f6f45c46bfcb57ff36c1e8565`,
   `02979ff7488e0491b04f29876b253de3b96540b1` or the inspected base
   `7582170a277477ba0d71cf70f53e4e0836874a72`; duplicate fingerprints are stored once. An orphan
   sidecar at this retired filename is legacy debris because no first-public owner uses the path.
2. Service database bundles named `state.sqlite`, with optional `-wal` and `-shm`, in either exact
   lane. A present main database must match the complete service-schema fixture for the unmarked
   `1f09baa8bfb295ba404ab3d3354df413f7ed7000` shape, the pre-selection-v2
   `16f14d188e38134f6f45c46bfcb57ff36c1e8565` shape, or the exact
   `(schema_version=2, migration_revision='selection-schema-v2')` shape at
   `02979ff7488e0491b04f29876b253de3b96540b1` / the inspected base. The whole database
   fingerprint is required; an Automation marker alone is not classification. Orphan sidecars are
   retired-path legacy debris.
3. The exact Web keys `omnimind:composer-drafts:v1` and
   `omnimind:composer-drafts:v2` in the production (`omnimind`) and development (`omnimind-dev`)
   profiles at the exact `omnimind://app` origin. The owned key and origin positively classify the
   string value; its contents are never normalized or copied. Canary and every other key are
   excluded.
4. A Package stage child may be discarded only when its directory is a direct, non-linked child of
   the selected lane's canonical `<lane>/packages/stage`, its manifest and byte digests validate,
   and the lane's valid `state.json` references it in none of current, LKG, validated or quarantined
   generation state. A same-generation copy in the other lane is a duplicate only when all bytes and
   digests are equal and that other copy is referenced there. Unknown or partially valid Package
   state is retained and blocks Package cleanup, not database/draft classification.

The [direct rebuild interface](../interfaces/direct-first-public-rebuild.md) owns the precise path,
link, type, process and mutation protocol. Database *identity* classification uses only SQLite
metadata, marker rows, integrity checks and the normalized `sqlite_schema` fingerprint from an
ephemeral private inspection copy. Once and only once an exact fixture identity is known, the same
copy receives the following closed protected-fact preflight:

- every allowlisted Product fingerprint runs its fixture-selected aggregate queries, validates exact
  fixture columns plus one-to-one Run/receipt/outbox closure, decodes each receipt with that fixture's
  checked-in decoder and reports aggregate counts only; every fixture-defined nonterminal Package
  Run is active, including Product-v2 `sent` (which crash recovery advances to
  `delivery_unknown`), and `delivery_unknown`/`outcome_unknown` are independently uncertain Runs;
- Product receipt, generation, outbox or activity identity that is missing, duplicated,
  undecodable, inconsistent with its Run, or not covered by the exact fixture map blocks deletion;
- every allowlisted service fingerprint proves the fixture-declared columns and aggregate-counts
  `managed_attachment_blobs`, `managed_attachment_cleanup_jobs`, `auth_pairing_links`,
  `auth_sessions` and `automation_settings`. Any attachment/cleanup metadata, pairing credential,
  auth-session identity or global configuration row blocks deletion;
- absence of a protected table is accepted only when its absence is part of the exact DDL fixture.
  An extra/missing protected table, unknown schema identity, decode failure, join cardinality
  mismatch, contradictory state or any nonzero protected count blocks the entire apply.

Unknown fingerprint/registry identity is reported as `DATABASE_FINGERPRINT_UNKNOWN` before any
protected query. `PROTECTED_IDENTITY` is reserved only for a nonzero auth-session identity count.

The preflight's public result is only aggregate presence/count plus the bounded blocker codes in the
rebuild interface. It never returns or logs a row value, identifier, JSON payload, generation,
credential, attachment path or workspace path. Product `product_resource_refs`, Product workspace
rows and Pi-private paths are not part of this guard: deleting Product history does not mutate their
external targets, and the tool never follows them. Query-spy tests forbid every column/table not
declared by the selected fixture. This narrow read is the only exception to the rule against
business-row reads; it cannot transcode, normalize, copy or preserve old state.

## Package-root authority

Product Service Package lifecycle is the sole root selector and lifecycle writer. It resolves
`~/.omnimind/dev/packages` for `dev` and `~/.omnimind/userdata/packages` for packaged execution.
Service passes the canonical root and lane in the closed Native Host protocol-v2 handshake. One
canonical bidirectional HMAC transcript binds protocol version, Service instance, a single-use
challenge and the exact lane/root; Host proof commits to and echoes the accepted binding. Native
Host validates the pair against Desktop's launch-lane assertion and canonical product home,
atomically binds the first accepted root for its lifetime, and validates/loads only exact stage
children. It never derives `userdata`, searches a sibling root, accepts a renderer path or writes
Package lifecycle state. Version 1, field omission/duplication, tamper, replay, competing binding or
lane/root mismatch has no compatibility path. The typed contract is in
[Package-root handoff](../interfaces/package-root-handoff.md).

## Frozen complexity evidence

The complexity proof uses the single `product-truth-complexity-v1` script/config and fixed path and
import universe defined by the [Design](../design.md). `B0` is the immutable
`7582170a277477ba0d71cf70f53e4e0836874a72` commit. `B1` must be a dedicated clean commit containing
the green direct first-public/compatibility deletion while the responsibility split remains
unsplit. Its full 40-hex commit SHA is recorded in the checked-in metrics evidence before any
Store/Coordinator extraction work is handed off. `C` is the later frozen split candidate. No branch,
dirty tree, candidate-selected path list, reconstructed patch or substitution of `B0` for `B1`
satisfies this decision.

## Consequences

- Deletion is intentionally unrecoverable. A successful apply receipt is evidence of classification
  and deletion, not evidence of preservation.
- Interruption is handled by recomputing the same plan. Remaining retired-path files/keys still block
  normal startup; already absent targets remain absent. There is no resume marker or migration phase.
- Transactional outbox recovery, delivery/outcome unknown, Automation scheduler recovery, Web
  flush/attachment safeguards, Package current/LKG/lease/fault behavior and Pi-native continuation
  remain. They are current product behavior, not schema compatibility.
- Root `README.md`, `architecture/product-state.md`, `architecture/execution.md` and
  `execution-brief.md` now record this same maintainer decision. The direct rebuild and Service-owned
  Package-root policy therefore have one consistent owner graph before implementation.

## Rejected alternatives

| Alternative | Reason |
| --- | --- |
| Preserve any old bytes before deletion | contradicts the explicit destructive calibration and adds recovery work the maintainer rejected |
| Convert old Product, Automation or Web data | makes pre-baseline shapes an input contract and retains the very compatibility being removed |
| Keep old names but replace marker rows | cannot distinguish old/interrupted bytes from first-public state and encourages shape guessing |
| One Package root for both lanes | couples dev and packaged lease/current/LKG truth |
| Native Host selects the root | creates a second Package lifecycle authority and repeats the current hard-coded mismatch |

## Provenance

This decision consumes the [selected synthesis](../research/synthesis.md),
[development-store evidence](../research/development-store-surface.md),
[unshipped compatibility inventory](../research/unshipped-compatibility.md), and
[control-plane responsibility map](../research/product-control-plane-map.md). It is consumed by the
[PRD](../prd.md), [Design](../design.md), and the two linked interfaces above.
