---
type: "QbD Audit"
title: "Scoped QbD 1: immutable repair replay evidence"
entry: "../decisions/repair-replay-evidence.md"
verdict: "PASS"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "b0bd71136c66451fb8aa4f86da28f973"
predecessor_receipt: "066a07d7d815410795dc46311da15d09"
---

# Scoped QbD 1: immutable repair replay evidence

This is an independent audit limited to the previously open E-01 actor-attribution evidence. It
evaluates the human-approved clean replay in [repair replay evidence](../decisions/repair-replay-evidence.md),
carrying the first audit's [`FAIL`](design-audit.md), the scoped re-audit's
[`NEEDS_EVIDENCE`](design-repair-audit.md), and the human
[evidence-remedy decision](../decisions/qbd-1-evidence-remedy.md). It does not reopen the closed
substantive design findings or audit the future documentation/governance implementation.

## Verdict

**PASS.** No unresolved blocking finding remains in this narrow scope. The dedicated evidence ref
contains a repository-complete predecessor and candidate lineage that an ordinary repository-only
reviewer can reconstruct from the recorded base, blobs, tree inputs and fixed commit metadata. The
candidate differs from its predecessor at exactly the approved four Bundle paths; every other
repository path and the imported `vendor/ui` tree are identical. The protected current branch,
real index, Bundle-external worktree and non-target refs have matching before/after fingerprints,
and the independently recomputed current values match the recorded post-operation values.

This closes E-01 by the exact remedy the human selected: a clean immutable reproduction of the
bounded repair. It does not retroactively claim visibility into the original dirty-worktree
actor's unrecorded actions. The historical `FAIL` and `NEEDS_EVIDENCE` dispositions remain
unchanged records of the evidence available at those gates. The three substantive design findings
remain closed only at design level by the prior re-audit; they were not reconsidered here.

The verdict is advice to the human calibrator. It authorizes no durable repair, implementation,
decomposition, Campaign transition or claim promotion.

## Audit identity and boundary

- Entry: [QbD 1 repair replay evidence](../decisions/repair-replay-evidence.md)
- Prior blocking challenge: [first QbD 1 audit](design-audit.md), E-01
- Prior evidence judgment: [scoped repair re-audit](design-repair-audit.md)
- Human authorization: [QbD 1 evidence remedy](../decisions/qbd-1-evidence-remedy.md)
- Promised output: `qbd/design-replay-audit.md`
- Actor: `architecture_doc_qbd_3`
- Dispatch receipt: `b0bd71136c66451fb8aa4f86da28f973`
- Completed predecessor receipt: `066a07d7d815410795dc46311da15d09`

The audit used repository files and Git objects only. It changed no product, architecture,
research, execution, Campaign, governance, source, legal, prior evidence, prior decision or tool
configuration file.

## Immutable lineage reconstruction

The persisted ref `refs/omp-flow/evidence/architecture-ui-qbd1-repair` resolves to the stated
candidate. Starting from the recorded repository base and applying the recorded cache entries in
an isolated temporary index reproduced all four object IDs exactly:

| Object | Recorded and reconstructed OID | Relationship |
| --- | --- | --- |
| Repository base | `2445acb987e443b44b7dc819de3de44c3d68b391` | predecessor parent; zero task-path entries |
| Replay predecessor tree | `e932380d64484d2fe06db74a25cff1f0ed6c7641` | complete base plus eight predecessor Bundle blobs |
| Replay predecessor commit | `8d2bec777e37ec15b402590a96cc5a70fd7d6581` | parent is the repository base |
| Replay candidate tree | `1cabd1f208d30d3469ec09022a3cb384d2a06c49` | predecessor tree plus the approved repair delta |
| Replay candidate commit/ref target | `dcd92717d819252a68005d0c95add86eaf498af2` | parent is the replay predecessor |

The commit messages, author/committer identity and timestamp in the objects match the recorded
creation inputs. Re-hashing those inputs produced the same commit OIDs; no working-tree file or
runtime-private record was needed. The current Bundle index has legitimately gained later links,
so replay validation used the frozen `32816b1f...` candidate blob rather than confusing the current
working file with the historical candidate.

## Exact candidate delta

`git diff --name-status predecessor candidate --` returned exactly:

| Status | Path | Predecessor blob | Candidate blob |
| --- | --- | --- | --- |
| A | `decisions/repair-scope-evidence.md` | absent | `75b7bec8e6aff23996b1ead220269705a4075cff` |
| M | `design.md` | `8455929993f475a52449bb44dd3a74a5363333c6` | `34ab63ed36df4e5a57fee67915a2d4eb9c490cec` |
| M | `index.md` | `fe67e5bfcade6ea6c5a41a2ca6143ccb048b2dbe` | `32816b1fa2ba4571e3f5648821c7b182b5ad35cc` |
| M | `prd.md` | `415b8b58c6232491d6665283143ea6c451087797` | `a1e1c1092121544424e911c7467d44145d3fc181` |

All five unchanged predecessor Bundle blobs retain their exact OIDs. An excluded-path diff over
the complete commits returned zero paths, and `git diff --check` returned success. Thus the replay
is a whole-repository bounded transition, not a loose Bundle snapshot.

## Imported UI and protected current state

The base, predecessor and candidate each resolve `vendor/ui` to
`630f17e61abc478114bf83c1d740977c9f68b910`. The current subtree also resolves to that tree, has an
empty porcelain-v2 digest, contains the recorded 6,425 Git-visible files and has no diff from
current `HEAD`.

The evidence records identical before/after values for every protected-state class. Read-only
recomputation after the operation matched the recorded values:

| Protected state | Recomputed value | Judgment |
| --- | --- | --- |
| Symbolic branch | `refs/heads/codex/pi-native-v1` | matches both recorded sides |
| `HEAD` | `2445acb987e443b44b7dc819de3de44c3d68b391` | matches both recorded sides |
| Real index SHA-256 | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` | byte fingerprint matches |
| Real index tree | `8cb3eecfef8704dd756eb4bbc90c182d19ab1029` | matches |
| Bundle-external porcelain-v2 SHA-256 | `0468022fe2801aa3c4f080257a46739b413f68a46fc956a383141c844868e38a` | matches |
| `vendor/ui` porcelain-v2 SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | empty and matches |
| All-ref inventory excluding the evidence ref | `4afc7e4d340ccb60f09f12e0b60919da8fa9dc75774caf0e057d9fa778f0ac03` | matches; no other ref changed |

The separately recorded protected-content digest covers 128 durable/product/tool files and is
equal before and after. That digest corroborates the directly recomputable branch, index,
worktree, ref and immutable-commit evidence; the verdict does not depend on treating a prose hash
as stronger than the complete predecessor/candidate lineage.

## Carried implementation condition

The prior non-blocking exact-zone/tool-root advisory is now explicit in the linked replay evidence
and must remain attached to any later human-approved governance implementation. After
repository-relative normalization, each exact provenance root and each configured `toolRoot` must
be ancestry-disjoint. The validator must reject:

1. equality between an exact root and a tool root;
2. an exact root below a tool root;
3. a tool root below an exact root.

Focused negative fixtures must cover all three relationships plus one disjoint-sibling control.
Disjointness does not merge their authority: exact roots still require exactness and rights checks,
while tool roots receive neither adoption privilege nor product authority. This is a future
implementation condition, not a claim that the current checker already enforces it.

## Prior disposition and next gate

| Carried item | Scoped disposition |
| --- | --- |
| Initial QbD 1 `FAIL` | Preserved as historical; substantive F-01 through F-03 were not reopened |
| Repair re-audit `NEEDS_EVIDENCE` | Preserved as the correct prior judgment; its sole open E-01 gap is closed by the approved replay |
| E-01 actor attribution | **Closed for the human-selected clean-reproduction remedy** |
| Exact-root/tool-root ancestry | Non-blocking implementation condition carried explicitly forward |

The only next governance action is human calibration of this scoped verdict. A human `PASS` may
then authorize the normal transition; absent that recorded decision, the task does not advance.
