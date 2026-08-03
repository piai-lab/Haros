---
type: "Replay Evidence"
title: "QbD 1 repair replay evidence"
---

# QbD 1 repair replay evidence

This Concept supplies the immutable clean-lineage evidence required by the human
[evidence-remedy decision](qbd-1-evidence-remedy.md) after the scoped
[repair re-audit](../qbd/design-repair-audit.md) returned `NEEDS_EVIDENCE`. It reproduces the
already-approved Bundle-only architect repair; it does not approve that repair, implement the
future durable documentation/governance design, change a prior audit or decision, or authorize
decomposition.

## Assignment identity and boundary

- Actor: `architecture_doc_evidence_reproducer`
- Dispatch receipt: `066a07d7d815410795dc46311da15d09`
- Predecessor receipt: `956d3412cbca4b1bb6ed13d44b5d462f`
- Predecessor output: `qbd/design-repair-audit.md`
- Authorized output boundary: `.omp-flow/tasks/08-03-architecture-ui-contract`
- Persisted Git ref:
  `refs/omp-flow/evidence/architecture-ui-qbd1-repair`
- Protected state: current branch, real Git index, every Bundle-external durable/product/tool
  file, and `vendor/ui`

The only Git ref added by this operation is the evidence ref above. No product branch, tag,
worktree or real-index entry was created. The two evidence commits were built with an isolated
temporary index and are reachable as one parent/child lineage from that ref.

## Immutable lineage

| Object | Git OID | Relationship |
| --- | --- | --- |
| Repository base | `2445acb987e443b44b7dc819de3de44c3d68b391` | parent of replay predecessor; actor-start HEAD recorded by the original repair |
| Replay predecessor tree | `e932380d64484d2fe06db74a25cff1f0ed6c7641` | base tree plus all eight recorded pre-repair Bundle blobs |
| Replay predecessor commit | `8d2bec777e37ec15b402590a96cc5a70fd7d6581` | parent is the repository base |
| Replay candidate tree | `1cabd1f208d30d3469ec09022a3cb384d2a06c49` | predecessor tree with exactly the approved four-path repair delta |
| Replay candidate commit | `dcd92717d819252a68005d0c95add86eaf498af2` | parent is the replay predecessor |
| Evidence ref | `refs/omp-flow/evidence/architecture-ui-qbd1-repair` | resolves to the replay candidate |
| Imported UI tree | `630f17e61abc478114bf83c1d740977c9f68b910` | identical at base, predecessor and candidate |

The predecessor is a complete repository commit, not a loose Bundle snapshot. The base had zero
entries below this task path, so the isolated index started from the complete base tree and added
the eight recorded predecessor files before writing the predecessor commit. The candidate then
changed only the three repaired document blobs and added the original repair-scope evidence blob.

The replay intentionally does not include the later `qbd/design-repair-audit.md`,
`decisions/qbd-1-evidence-remedy.md` or this Concept. Those artifacts postdate the repair under
review. Including them would no longer reproduce the exact transition challenged by E-01.

## Blob binding

| Bundle-relative path | Predecessor blob | Candidate blob | Result |
| --- | --- | --- | --- |
| `brainstorm.md` | `e9430925cde88d50b3d6f20a687a07d4dbd92f95` | `e9430925cde88d50b3d6f20a687a07d4dbd92f95` | unchanged |
| `decisions/qbd-1-repair.md` | `5382a28c49b39b283de205926efc55f57a99927e` | `5382a28c49b39b283de205926efc55f57a99927e` | unchanged |
| `design.md` | `8455929993f475a52449bb44dd3a74a5363333c6` | `34ab63ed36df4e5a57fee67915a2d4eb9c490cec` | changed |
| `index.md` | `fe67e5bfcade6ea6c5a41a2ca6143ccb048b2dbe` | `32816b1fa2ba4571e3f5648821c7b182b5ad35cc` | changed |
| `prd.md` | `415b8b58c6232491d6665283143ea6c451087797` | `a1e1c1092121544424e911c7467d44145d3fc181` | changed |
| `qbd/design-audit.md` | `6e050cc4da342f517469ebffbfd9e462f01dba5d` | `6e050cc4da342f517469ebffbfd9e462f01dba5d` | unchanged |
| `research/document-audit.md` | `eb14b714e4fc90f9e48ead2f28a50de29a60a97d` | `eb14b714e4fc90f9e48ead2f28a50de29a60a97d` | unchanged |
| `task.md` | `790804c630c86040bb7e98e07c42137d6ca9ab01` | `790804c630c86040bb7e98e07c42137d6ca9ab01` | unchanged |
| `decisions/repair-scope-evidence.md` | absent | `75b7bec8e6aff23996b1ead220269705a4075cff` | added |

The candidate changed-path output is exactly:

```text
.omp-flow/tasks/08-03-architecture-ui-contract/decisions/repair-scope-evidence.md
.omp-flow/tasks/08-03-architecture-ui-contract/design.md
.omp-flow/tasks/08-03-architecture-ui-contract/index.md
.omp-flow/tasks/08-03-architecture-ui-contract/prd.md
```

Because this is the complete `predecessor..candidate` diff, every other repository path is
identical between the two immutable commits. `git diff --check` returned success with no output.

## Reconstructable creation commands

The following is the command sequence used. Fixed commit identity, timestamps, messages, parent
links and tree inputs make the commit IDs reproducible. The all-zero old OID makes ref creation
fail closed if the target ref already exists.

```sh
set -euo pipefail
export GIT_OPTIONAL_LOCKS=0

OMNIMIND_EVIDENCE_BASE=2445acb987e443b44b7dc819de3de44c3d68b391
OMNIMIND_EVIDENCE_REF=refs/omp-flow/evidence/architecture-ui-qbd1-repair
OMNIMIND_EVIDENCE_TASK=.omp-flow/tasks/08-03-architecture-ui-contract
OMNIMIND_ZERO_OID=0000000000000000000000000000000000000000
OMNIMIND_EVIDENCE_TEMP=$(mktemp -d "${TMPDIR:-/tmp}/omnimind-architecture-ui-qbd1.XXXXXX")
OMNIMIND_EVIDENCE_INDEX=$OMNIMIND_EVIDENCE_TEMP/index
export GIT_INDEX_FILE=$OMNIMIND_EVIDENCE_INDEX

git read-tree "$OMNIMIND_EVIDENCE_BASE"
git update-index --add --cacheinfo "100644,e9430925cde88d50b3d6f20a687a07d4dbd92f95,$OMNIMIND_EVIDENCE_TASK/brainstorm.md"
git update-index --add --cacheinfo "100644,5382a28c49b39b283de205926efc55f57a99927e,$OMNIMIND_EVIDENCE_TASK/decisions/qbd-1-repair.md"
git update-index --add --cacheinfo "100644,8455929993f475a52449bb44dd3a74a5363333c6,$OMNIMIND_EVIDENCE_TASK/design.md"
git update-index --add --cacheinfo "100644,fe67e5bfcade6ea6c5a41a2ca6143ccb048b2dbe,$OMNIMIND_EVIDENCE_TASK/index.md"
git update-index --add --cacheinfo "100644,415b8b58c6232491d6665283143ea6c451087797,$OMNIMIND_EVIDENCE_TASK/prd.md"
git update-index --add --cacheinfo "100644,6e050cc4da342f517469ebffbfd9e462f01dba5d,$OMNIMIND_EVIDENCE_TASK/qbd/design-audit.md"
git update-index --add --cacheinfo "100644,eb14b714e4fc90f9e48ead2f28a50de29a60a97d,$OMNIMIND_EVIDENCE_TASK/research/document-audit.md"
git update-index --add --cacheinfo "100644,790804c630c86040bb7e98e07c42137d6ca9ab01,$OMNIMIND_EVIDENCE_TASK/task.md"

OMNIMIND_PREDECESSOR_TREE=$(git write-tree)
export GIT_AUTHOR_NAME='OMP-Flow Evidence'
export GIT_AUTHOR_EMAIL='evidence@localhost'
export GIT_AUTHOR_DATE='2026-08-03T12:00:00+08:00'
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"
OMNIMIND_PREDECESSOR_COMMIT=$(printf '%s\n' \
  'OMP-Flow evidence: architecture UI QbD1 repair predecessor' |
  git commit-tree "$OMNIMIND_PREDECESSOR_TREE" -p "$OMNIMIND_EVIDENCE_BASE")

OMNIMIND_REPAIR_EVIDENCE_BLOB=$(git hash-object -w \
  "$OMNIMIND_EVIDENCE_TASK/decisions/repair-scope-evidence.md")
test "$OMNIMIND_REPAIR_EVIDENCE_BLOB" = 75b7bec8e6aff23996b1ead220269705a4075cff
git update-index --add --cacheinfo "100644,a1e1c1092121544424e911c7467d44145d3fc181,$OMNIMIND_EVIDENCE_TASK/prd.md"
git update-index --add --cacheinfo "100644,34ab63ed36df4e5a57fee67915a2d4eb9c490cec,$OMNIMIND_EVIDENCE_TASK/design.md"
git update-index --add --cacheinfo "100644,32816b1fa2ba4571e3f5648821c7b182b5ad35cc,$OMNIMIND_EVIDENCE_TASK/index.md"
git update-index --add --cacheinfo "100644,$OMNIMIND_REPAIR_EVIDENCE_BLOB,$OMNIMIND_EVIDENCE_TASK/decisions/repair-scope-evidence.md"

OMNIMIND_CANDIDATE_TREE=$(git write-tree)
OMNIMIND_CANDIDATE_COMMIT=$(printf '%s\n' \
  'OMP-Flow evidence: architecture UI QbD1 repair candidate' |
  git commit-tree "$OMNIMIND_CANDIDATE_TREE" -p "$OMNIMIND_PREDECESSOR_COMMIT")

git diff --check "$OMNIMIND_PREDECESSOR_COMMIT" "$OMNIMIND_CANDIDATE_COMMIT" --
git diff --name-only --diff-filter=ACDMRT \
  "$OMNIMIND_PREDECESSOR_COMMIT" "$OMNIMIND_CANDIDATE_COMMIT" --
test "$(git rev-parse "$OMNIMIND_PREDECESSOR_COMMIT:vendor/ui")" = \
  630f17e61abc478114bf83c1d740977c9f68b910
test "$(git rev-parse "$OMNIMIND_CANDIDATE_COMMIT:vendor/ui")" = \
  630f17e61abc478114bf83c1d740977c9f68b910
git update-ref "$OMNIMIND_EVIDENCE_REF" "$OMNIMIND_CANDIDATE_COMMIT" \
  "$OMNIMIND_ZERO_OID"

unlink "$OMNIMIND_EVIDENCE_INDEX"
rmdir "$OMNIMIND_EVIDENCE_TEMP"
```

An ordinary repository-only reviewer can inspect the frozen result without using the working
tree:

```sh
OMNIMIND_EVIDENCE_REF=refs/omp-flow/evidence/architecture-ui-qbd1-repair
git log --format=fuller -3 "$OMNIMIND_EVIDENCE_REF"
git diff --name-status "$OMNIMIND_EVIDENCE_REF^" "$OMNIMIND_EVIDENCE_REF" --
git diff --check "$OMNIMIND_EVIDENCE_REF^" "$OMNIMIND_EVIDENCE_REF" --
git ls-tree -r "$OMNIMIND_EVIDENCE_REF^" -- \
  .omp-flow/tasks/08-03-architecture-ui-contract
git ls-tree -r "$OMNIMIND_EVIDENCE_REF" -- \
  .omp-flow/tasks/08-03-architecture-ui-contract
git rev-parse "$OMNIMIND_EVIDENCE_REF^^" \
  "$OMNIMIND_EVIDENCE_REF^" \
  "$OMNIMIND_EVIDENCE_REF" \
  "$OMNIMIND_EVIDENCE_REF^:vendor/ui" \
  "$OMNIMIND_EVIDENCE_REF:vendor/ui"
```

## Current repository non-mutation proof

Before creating the lineage, the working repository was already dirty and the Bundle was
untracked. The proof therefore compares exact state fingerprints before and after this operation
while excluding only this authorized task directory from Bundle-external worktree fingerprints.
All read-only Git commands used `GIT_OPTIONAL_LOCKS=0`.

| Protected state | Before | After | Result |
| --- | --- | --- | --- |
| Symbolic branch | `refs/heads/codex/pi-native-v1` | `refs/heads/codex/pi-native-v1` | unchanged |
| `HEAD` | `2445acb987e443b44b7dc819de3de44c3d68b391` | `2445acb987e443b44b7dc819de3de44c3d68b391` | unchanged |
| Real index SHA-256 | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` | byte-identical |
| Real index tree | `8cb3eecfef8704dd756eb4bbc90c182d19ab1029` | `8cb3eecfef8704dd756eb4bbc90c182d19ab1029` | unchanged |
| Bundle-external porcelain-v2 SHA-256 | `0468022fe2801aa3c4f080257a46739b413f68a46fc956a383141c844868e38a` | `0468022fe2801aa3c4f080257a46739b413f68a46fc956a383141c844868e38a` | unchanged |
| Protected durable/product/tool content SHA-256 (128 files) | `72c5913dc785d417b3e38dc68c9832afa5ead39522c8ada59bde1aa666c17639` | `72c5913dc785d417b3e38dc68c9832afa5ead39522c8ada59bde1aa666c17639` | unchanged |
| `vendor/ui` porcelain-v2 SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | empty before and after |
| `vendor/ui` Git-visible files | `6425` | `6425` | unchanged |
| `HEAD:vendor/ui` and working diff | tree `630f17e61abc478114bf83c1d740977c9f68b910`; clean | same tree; clean | unchanged |
| All-ref inventory with target ref removed | `4afc7e4d340ccb60f09f12e0b60919da8fa9dc75774caf0e057d9fa778f0ac03` | `4afc7e4d340ccb60f09f12e0b60919da8fa9dc75774caf0e057d9fa778f0ac03` | no other ref changed |

The Bundle-external status fingerprint covers all tracked and non-ignored untracked paths outside
this task directory. The protected content fingerprint covers the durable owners, governance
scripts/tests and configured tool roots while excluding only this task directory and ignored
runtime/cache data. The separately checked UI status is empty, has no non-ignored untracked path,
and has no worktree diff from `HEAD`.

## Later governance rule carried forward

The re-audit's non-blocking advisory is now explicit for the later approved governance
implementation: after repository-relative normalization, every exact provenance root and every
configured `toolRoot` must be ancestry-disjoint. The validator must reject all three forms of
cross-partition overlap:

1. exact root equals tool root;
2. exact root is a descendant of a tool root;
3. tool root is a descendant of an exact root.

Disjoint siblings remain valid and retain their distinct rules: an exact root receives mandatory
exactness/rights checks, while a tool root receives no adoption privilege or product authority.
Focused negative fixtures must cover all three rejected relationships plus one disjoint control.
This Concept records the requirement only; no durable document, checker, fixture or tool
configuration was changed by this evidence operation.

## Interpretation and next gate

The clean commit lineage closes the narrow reconstructability question that the dirty worktree
left open: the exact repair can exist as a four-path candidate delta with every other repository
path and the imported UI tree identical to the predecessor. It does not retroactively assert what
the original actor did outside its recorded Bundle blobs; instead, it supplies the human-approved
clean reproduction that the prior audit named as the smallest available remedy.

The next authorized action is a fresh independent audit limited to E-01, this exact replay delta
and the cross-partition ancestry advisory. Even a `PASS` remains advice and requires a new human
calibration before Decompose.
