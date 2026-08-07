---
type: "Interface"
title: "Direct first-public rebuild"
---

# Direct first-public rebuild

## Operator surface

The repository-owned pre-release tool has two commands and no other mode:

```text
bun run product-truth -- inspect --home ~/.omnimind
bun run product-truth -- apply \
  --home ~/.omnimind \
  --confirm-destroy-prebaseline-state ~/.omnimind
```

`inspect` is literally source-read-only: it does not create, acquire, reap, rename or remove a
database lifecycle lock or Desktop profile single-instance lock. Its only filesystem writes are
private ephemeral scratch copies outside every source/profile root, and they are removed before the
command returns. `apply` is destructive and intentionally unrecoverable. There is no
snapshot, export, convert, install, resume, rollback, restore, prune or alternate-root command.
Neither command starts normal Desktop, Product Service, Native Host, provider, update or network
activity. A non-empty `OMNIMIND_HOME` override is rejected even when it happens to spell the default.

## Inspection contract

Both commands perform the same complete classification; `apply` does not consume a prior report.
`inspect` performs the source-read-only observation below. `apply` first obtains the declared
exclusive locks, then repeats every path/process/copy/database/protected-fact/Web/Package check from
fresh source bytes while those locks remain held.

1. Resolve the OS account home without shell expansion and derive exactly
   `path.join(os.homedir(), ".omnimind")`. The argument and confirmation must resolve to that path.
   Every existing component from the account home through a target is `lstat`-checked. Symlink,
   junction, reparse point, hard-linked regular file (`nlink != 1`), case/realpath mismatch, path
   escape or group/other-writable lane blocks the command.
2. Enumerate only the literal `dev` and `userdata` lane entries and the two exact Desktop identities
   `omnimind-dev` and `omnimind`. No recursive home/profile discovery is allowed.
3. Prove the Product Service, Desktop and Native Host topology stopped. The platform adapter rejects
   a current-user process whose executable/argv matches the OmniMind Desktop bundle, Service entry,
   Native Host entry or dev runner; it reports only component and PID. During `inspect`, observe
   database lifecycle-lock and profile single-instance-lock identity/liveness without mutating them.
   A live, unknown, malformed, linked or changing owner blocks; a well-formed dead database owner is
   reported as `stale-observed` but is neither reaped nor renamed. Read each exact profile through a
   stable offline private copy of its origin storage, with source identities compared before/after;
   do not launch Electron or a lock-taking profile helper.
4. For a present database bundle, copy main/WAL/existing-SHM into a private `0700` `mkdtemp`
   directory with `0600` files, re-stat source identity before and after the copy, and inspect only
   the copy. Run `integrity_check`, `foreign_key_check`, read the marker table, and hash normalized
   `(type,name,tbl_name,sql)` rows from `sqlite_schema`. Once an exact checked-in fixture identity is
   selected, run only that fixture's protected-fact queries described below. The scratch directory
   is removed before returning; failure to remove it stops `apply`.
5. Read only Package `state.json`, exact stage manifests and bytes needed for digest/type/link
   validation. Read only the two legacy Web keys at `omnimind://app`; never enumerate or emit other
   localStorage entries.

The sorted JSON report is written to stdout only:

```text
format: "omnimind-direct-first-public-plan-v1"
canonicalHome
quiescence: { desktop, service, nativeHost, profiles }
lanes[]: { lane, product, service, package }
profiles[]: { identity, origin, v1, v2, g1 }
targets[]: { kind, laneOrProfile, relativePathOrKey, classification, action }
protectedFacts[]: { lane, storeKind, activeLeaseCount, uncertainRunCount,
                    attachmentMetadataCount, credentialCount,
                    identityCount, globalConfigurationCount }
blockers[]: { code, laneOrProfile, targetKind }
```

It contains no rows, draft values, prompts, credentials, Engine-private bytes, endpoints or
workspace paths stored inside a database. `inspect` returns success only when `blockers` is empty;
an entirely absent home is a valid empty plan.

### Protected-fact preflight

The classifier registry is keyed by the exact Product/service DDL fingerprint already required by
the baseline decision. Each registry entry fixes the table/column allowlist, receipt decoder version,
join/cardinality invariants and zero-count predicates. It is not a generic schema walker.

Every allowlisted Product fingerprint runs its fixture-selected aggregate queries. The preflight
reads only Run ID, receipt identity/JSON, Package generation, outbox send/attempt identity and
Package activity fields needed to establish closure, then validates each receipt with the exact
fixture decoder. Every fixture-defined nonterminal Run with a Package generation is active; the v2
`sent` state is explicitly active because crash recovery advances it to `delivery_unknown`. The
uncertain-Run count includes every `delivery_unknown`/`outcome_unknown` receipt.
Missing/duplicate Run↔receipt↔outbox identity, impossible send/attempt state, invalid generation,
undecodable receipt/activity or an unclassified state is contradictory closure and blocks the whole
plan.

Every allowlisted service fingerprint declares the exact columns and runs aggregate counts over
`managed_attachment_blobs`, `managed_attachment_cleanup_jobs`, `auth_pairing_links`,
`auth_sessions` and `automation_settings`. Any attachment/cleanup metadata, pairing credential,
auth-session identity or global-configuration row is protected and blocks. An unexpected/missing
declared table or undecodable semantics is not treated as zero. Product `product_resource_refs`,
Product workspace rows and Pi-private paths are intentionally not queried: they are authorized
Product history or external targets that the tool never follows, not co-resident protected rows in
this preflight.

Only these bounded blocker codes may represent this preflight:

| Code | Meaning |
| --- | --- |
| `PROTECTED_IDENTITY` | at least one auth-session identity exists |
| `PROTECTED_ACTIVE_PACKAGE_LEASE` | at least one active Package lease exists |
| `PROTECTED_UNCERTAIN_RUN` | at least one delivery/outcome-unknown Run exists |
| `PROTECTED_ATTACHMENT_METADATA` | attachment or cleanup metadata exists |
| `PROTECTED_CREDENTIAL` | a pairing credential exists |
| `PROTECTED_GLOBAL_CONFIGURATION` | service global configuration exists |
| `PROTECTED_FACT_UNDECODABLE` | an allowlisted protected value cannot be decoded exactly |
| `PROTECTED_FACT_CLOSURE_CONTRADICTORY` | join/cardinality/state closure is inconsistent |

No matching fingerprint/registry entry is the separate identity-classification blocker
`DATABASE_FINGERPRINT_UNKNOWN`; it never aliases to `PROTECTED_IDENTITY` and no protected query runs
until a single exact fixture is selected.

The internal reader may decode only the listed fields on the private copy. Its return type contains
the aggregate fields shown in the report and blocker codes only; logging, errors and snapshots must
not contain any selected row value, identifier, JSON, generation, credential, attachment path or
workspace path. Query-spy fixtures fail on any undeclared table or column.

### Apply exclusivity

Before its repeated inspection, `apply` obtains the two profile single-instance locks and the four
database lifecycle locks in this order: dev Product, dev service, userdata Product, userdata
service. It may use the existing token-safe algorithm to reap a well-formed dead database owner, but
never a live/unknown/malformed/changing owner. It records invocation tokens in memory, accepts only
those invocation-owned lock mutations during the repeat, and releases/removes only locks whose
identity and token still match. Any acquisition/reap/profile-lock failure occurs before destructive
writes. The final source inspection remains under all locks.

## Apply contract and allowlist

After the second inspection succeeds and all locks remain held, `apply` may mutate only:

- `<lane>/product-state-v1.sqlite`, `-wal`, `-shm`;
- `<lane>/state.sqlite`, `-wal`, `-shm`;
- `<database>.lifecycle-lock` directories created or token-safely acquired by this invocation;
- the exact `v1` and `v2` composer keys in the two named profiles/origin;
- Package stage directories classified disposable by the
  [baseline decision](../decisions/direct-first-public-baseline.md).

Package cleanup first atomically renames an allowed stage child out of `stage/` into the private
tool-owned sibling `.discarding/`, rechecks that the canonical stage path is absent, then deletes the
tombstone without following links. Native Host never loads `.discarding`. An interruption after the
rename leaves an inert tombstone; a later `inspect` reports it separately and `apply` may finish its
deletion only after validating its direct-child name, original generation/digest classification and
link-free remaining tree. `.discarding` is removed when empty and is never a recovery source.

Legacy database bundles may be unlinked in any order because every retired filename and sidecar is
independently classified; first-public owners never use those paths. Web key removal is followed by
an immediate reread proving absence. The tool releases its lifecycle/profile locks and emits a final
stdout receipt only after the whole allowlisted set is absent. It does not create first-public
state. The Product State Store, service persistence owner and Web draft owner create their own fresh
generation on the next normal start.

The following are never targets: the home/lane/profile directory itself; `stores/`; current `g1`;
Package `state.json`, licenses, current/LKG/validated/quarantined generations or unknown stage
children; attachments or composer blob storage; `pi-native`; secrets/credentials; settings,
keybindings, identity, logs, caches or server-runtime files; workspaces, worktrees, Git or source;
external `ResourceRef` targets; canary/repo-local/override homes; unrelated browser data; release or
update state.

## Interruption and runtime behavior

- Before the first unlink/remove, all old state remains and startup reports
  `PREBASELINE_RESET_REQUIRED`.
- During apply, every remaining retired file/key and any `.discarding` tombstone is visible to the
  next inspection. Normal startup never resumes or cleans it and remains fail-closed.
- After the final target disappears, the live state is clean absence. Normal owners create exact
  generation 1; they do not read a tool receipt.
- A crash during fresh SQLite creation leaves either no application table or a transactionally
  complete marker/fingerprint. The former is fresh and may be initialized; any partial application
  schema is `FIRST_PUBLIC_CREATION_INCOMPLETE`. Web creation accepts only absent or exact `g1`.
- Re-running `apply` is idempotent with respect to already absent targets. It never broadens a
  classification to make progress.

## Result classes

| Exit | Code | Meaning |
| ---: | --- | --- |
| 0 | `PLAN_SAFE` / `REBUILD_APPLIED` | inspection is closed, or every allowed target is absent after apply |
| 2 | `DEFAULT_ROOT_INVALID` | argument, confirmation, override, path/link/type/mode or scope guard failed |
| 3 | `OWNER_NOT_STOPPED` | process, lifecycle owner or profile owner is live/unknown/ambiguous |
| 4 | `CLASSIFICATION_BLOCKED` | unknown database fingerprint, any bounded protected-fact blocker, current contradiction, unknown Package state or distributed-consumer evidence |
| 5 | `INSPECTION_UNSAFE` | scratch copy, stable-stat, SQLite, integrity/FK, digest or scratch cleanup failed |
| 6 | `DESTRUCTION_INCOMPLETE` | an allowed unlink/remove/reread/fsync failed; stop and re-inspect without stronger primitives |

No failure automatically retries with broader permissions, kills a process, deletes a malformed
lock, follows a link or treats an unknown target as obsolete.

## Consumers

The [PRD](../prd.md) and [Design](../design.md) bind this interface. It is pre-release repository
tooling only and is absent from packaged runtime imports and Web/RPC surfaces.
