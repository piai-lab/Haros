---
type: "Research Synthesis"
title: "Direct first-public Product truth consolidation"
---

# Direct first-public Product truth consolidation

The three internal research questions establish that OmniMind has no evidenced public pre-baseline
consumer and that development-era Product v1→v2, unmarked Automation→v2, Web key/envelope migrations
and the renamed Synara `0.4.2` bridge are not durable product contracts. Research originally
recommended a verified backup/export because the default local stores contain real older bytes.
The maintainer explicitly supersedes that recommendation: only default `~/.omnimind` is in scope,
all positively identified pre-baseline Product/Automation/Web-draft state may be destroyed, and no
backup, migration or restore is required. This is a human risk decision, not an inference that the
old bytes are valueless.

## Selected order

1. Canonicalize the exact default `~/.omnimind`, reject symlinks/path escapes and prove Desktop,
   Service and Native Host are stopped. No override, canary, repo-local, archived or recursively
   discovered home is in scope.
2. Positively classify exact old Product/service database files and sidecars plus exact legacy
   OmniMind Web-draft keys. Enumerate and validate each target before deletion. Unknown files,
   unexpected links/types, active owners or ambiguous current-generation markers stop the action.
3. Remove only classified legacy database main/WAL/SHM files, lifecycle locks proven stale under the
   stopped topology, legacy draft keys, and Package state proven duplicate or obsolete relative to
   the selected lane root. Never delete the home, lane directory, credential store, current canonical
   Package generation/artifacts, attachments, Pi-native state, external ResourceRefs, workspaces,
   logs, Git, source, global configuration or unrelated browser data.
4. Create fresh first-public Product and service databases and the canonical Web generation through
   current owners. No legacy converter, backup artifact, restore command, dual-read or fallback is
   created. Interruption before publication leaves either classified old state or clean absence;
   startup never guesses or resumes a partially fabricated migration.
5. Remove the full unshipped compatibility inventory and make unknown/old generations fail closed
   with a precise reset-required error rather than silently mutating them.
6. Split responsibility without splitting truth: one Product State Store owns the single SQLite
   connection, all 21 tables and every compound transaction; one Product Execution Coordinator owns
   Engine effects, catalog observation and prepared handles; `ProductControlPlane` remains the thin
   Web/RPC facade; `productExecutionBoundary` is a dependency-leaf contract. No table repository,
   per-Engine Product plane, raw shared transaction callback or second state machine is allowed.
7. Make Product Service Package lifecycle the sole Package-root owner. It resolves
   `<home>/dev/packages` for `dev` and `<home>/userdata/packages` for packaged execution and passes
   that canonical root explicitly to Native Host. Native Host only validates/loads exact children;
   it never hard-codes, discovers or selects a root. Delete the obsolete duplicate path/state after
   positive classification and keep no compatibility fallback.

## Counter-evidence and why it does not overturn the direction

The current monolith contains legitimate cross-object and Queue-to-Run transactions, which rejects a
mechanical repository split. It does not require 5,036 lines in one module: atomicity comes from one
SQLite connection and `BEGIN IMMEDIATE`, while Engine effects already occur outside transactions.
The default stores contain real old development data, so deletion is irreversible; the maintainer
accepts that loss explicitly. The inherited bridge once served real Synara users, but fixed-source
evidence and current public checks show no corresponding OmniMind release, marker producer or
consumer.

## Acceptance implications

- Destructive execution requires a dry-run inventory whose exact canonical targets are all beneath
  default `~/.omnimind`, individually typed, non-linked and positively legacy. Target ambiguity,
  active processes or a newly discovered distributed OmniMind pre-baseline build stops execution.
- Deletion is intentionally unrecoverable; no result may claim backup or migration preservation.
- Complexity success requires lower total production lines and dependency edges after rebaseline,
  not merely a smaller maximum file. Product SQL writes remain exclusive to the State Store and all
  named compound transactions retain integrated fault tests.
- The next Design must settle the exact deletion classifier, first-public markers and publication
  boundary, single package root, Package read projection, facade surface and exact before/after
  complexity metrics.

This synthesis confirms the Brainstorm anchor and is sufficient for Design. No external repository
adoption is proposed. Primary evidence remains in the three linked research Concepts.
