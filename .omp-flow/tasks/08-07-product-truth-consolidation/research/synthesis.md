---
type: "Research Synthesis"
title: "Backup-gated first-public Product truth consolidation"
---

# Backup-gated first-public Product truth consolidation

The three internal research questions select one bounded direction. OmniMind has no evidenced public
pre-baseline consumer, so development-era Product v1→v2, unmarked Automation→v2, Web key/envelope
migrations and the renamed Synara `0.4.2` bridge are not durable product contracts. They may be
removed after—not before—a verified backup/export and isolated restore. Operational recovery for
dispatch uncertainty, Automation leases/runs, current Web drafts, lifecycle locks and Package/Engine
authority remains; those are current product semantics rather than old-schema compatibility.

## Selected order

1. Require an explicit canonical list of development `OMNIMIND_HOME` roots. Include standard dev,
   Electron-dev, packaged/userdata and canary lanes when present; do not recursively guess across the
   home directory. Inventory both current Service and Native Host package-stage paths until Design
   establishes one owner.
2. With each home quiesced, acquire the Product then service lifecycle locks and create WAL-aware
   logical snapshots of both SQLite authorities. Copy existing packages, attachments and Pi-native
   dependent closure without interpreting Engine-private state. Refuse symlinks, incomplete pairs,
   unreadable bytes, insufficient space or unknown active owners.
3. Bind one private manifest to canonical roots, source revision, SQLite version, hashes, modes,
   schema metadata, structural/cardinality invariants and dependent closure. Run integrity and
   foreign-key checks plus application-level structural decoding without emitting records.
4. Restore the complete set into an isolated home, prove the pinned pre-rebaseline reader can read
   it, then exercise the candidate transform/import and startup. A snapshot without restore proof
   cannot authorize rotation.
5. Install one explicit first-public Product, Automation and Web generation while stopped. Keep the
   verified prior snapshot and an explicit operator restore path; steady-state runtime has one
   canonical decoder/writer and fails closed on unknown generations.
6. Remove the development compatibility inventory only after rotation proof. Preserve the
   coordinator's full preflight, fixed lock order and crash convergence as bounded offline-transform
   properties, not a permanent runtime migration platform.
7. Split responsibility without splitting truth: one Product State Store owns the single SQLite
   connection, all 21 tables and every compound transaction; one Product Execution Coordinator owns
   Engine effects, catalog observation and prepared handles; `ProductControlPlane` remains the thin
   Web/RPC facade; `productExecutionBoundary` is a dependency-leaf contract. No table repository,
   per-Engine Product plane, raw shared transaction callback or second state machine is allowed.

## Counter-evidence and why it does not overturn the direction

The current monolith contains legitimate cross-object and Queue-to-Run transactions, and the current
migration protects real local development bytes. This rejects a mechanical file split or immediate
deletion. It does not require 5,036 lines in one module: atomicity comes from one SQLite connection
and `BEGIN IMMEDIATE`, while Engine effects already occur outside transactions. Likewise, the
inherited origin/profile bridge once served real Synara users, but fixed-source evidence and current
public checks show no corresponding OmniMind release, marker producer or consumer.

## Acceptance implications

- Live stores remain byte-untouched until every declared root has a complete verified snapshot and
  isolated restore.
- A missing root declaration, incomplete database pair, failed hash/integrity/foreign-key/decoder
  check, restore failure or newly discovered distributed OmniMind pre-baseline build stops rotation.
- Complexity success requires lower total production lines and dependency edges after rebaseline,
  not merely a smaller maximum file. Product SQL writes remain exclusive to the State Store and all
  named compound transactions retain integrated fault tests.
- The next Design must settle the single package root, first-public markers, offline converter and
  restore command, backup retention input, Package read projection, facade surface and exact
  before/after complexity metrics.

This synthesis confirms the Brainstorm anchor and is sufficient for Design. No external repository
adoption is proposed. Primary evidence remains in the three linked research Concepts.
