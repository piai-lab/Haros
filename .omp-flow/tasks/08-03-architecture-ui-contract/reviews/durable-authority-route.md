---
type: "Review"
title: "Durable authority route independent review"
verdict: "PASS"
entry: "../work/durable-authority-route.md"
handoff: "../handoffs/durable-authority-route.md"
actor_id: "architecture_ui_work_planner"
dispatch_receipt: "c7ad045fe1fa43e5bc50240dda5e946a"
predecessor_receipt: "2211c359badf45cb990f263fdbced089"
prior_dispatch_receipt: "574524a33aea445280778d6197bb8600"
---

# Durable authority route independent review

Subject: [Reconcile the durable authority route](../work/durable-authority-route.md), its
[implementation handoff](../handoffs/durable-authority-route.md), and the current seven-path
implementation.

## Verdict

**PASS.** No blocking or substantive finding remains. The final files express one discoverable
owner graph and read route; detailed topology and the seven product objects have one architecture
owner each; Queue ownership transfers once; README, execution brief and Campaign share the same
evidence/next-action route; `source-adoptions` and every Campaign claim row are unchanged from
`HEAD`.

The maintainer-calibrated README follow-up also passes. Lines 48–55 contain exactly four numbered
official-distribution/Pi-ecosystem requirements and explicitly state that they constrain product
results without fixing unevidenced internal organization or deployment. Prompt layering,
revision/digest choices, Package taxonomies, configuration directories and MCP deployment remain
unselected engineering choices.

The repository remains a shared dirty worktree, so this review does not mistake global porcelain
for actor attribution or candidate cleanliness. It inspected the four tracked allowed diffs and
the three added architecture owners directly, while treating the other dirty paths as excluded
state for later frozen-candidate integration.

## Findings

No finding was identified. The prior review's checksum advisory is closed: the updated handoff
defines the exact UTF-8 fenced-block extraction, and independent recomputation reproduces its
source, identity and structure hashes. No machine-block byte changed.

## Scope and diff review

The updated implementation predecessor is valid and independent: the handoff actor is
`architecture_doc_qbd_3`, its current receipt equals the supplied predecessor receipt, it carries
the prior implementation/review receipts, and it links back to the reviewed Work.

The real delivery surface is exactly the seven Work paths:

- tracked modifications: `AGENTS.md`, `README.md`, `execution-brief.md`,
  `missions/independent-omnimind-v1.md`;
- architecture owners added relative to current `HEAD`: `architecture/README.md`,
  `architecture/product-state.md`, `architecture/execution.md`.

The tracked diff is a deliberate contraction: AGENTS, root, brief and Campaign lose duplicated
contract/order prose. The three architecture files hold the corresponding topic ownership. No
fixed source, Workbench, research, legal, product/runtime or governance path is part of this Work's
reviewed delivery surface.

The calibrated follow-up is bounded to README prose and the updated handoff. Within README, the new
passage is outside all three machine blocks and adds no topology, product object, Package lifecycle
or deployment mechanism. Re-running every prior invariant found no semantic drift in the other six
durable Work paths.

## Semantic acceptance

| Review target | Independent result |
| --- | --- |
| Owner graph | README owns doctrine/adoption; architecture topic files own UI/product facts/topology; research owns evidence; brief owns order/gates; Campaign owns status/evidence pointers |
| Mandatory route | AGENTS, execution brief and Campaign use README → involved architecture owners → brief → active Campaign/status → conditional research; sequence explicitly grants no authority |
| Root constitution | Product-level invariants and owner links remain; there is no object catalog, detailed physical tree, exhaustive UI ledger, research history or Campaign status mirror |
| Four calibrated requirements | Official distribution bundles/tunes Pi without separate default-path install; OmniMind may curate/preinstall/build ecosystem assets and bounded Pi adaptations; no competing Agent Runtime or executable ecosystem code in Main/renderer; credentials and real license/attribution/redistribution duties are protected |
| Optional engineering choices | No prompt-layering order, revision/digest policy, Package taxonomy, configuration-directory layout or MCP deployment is made normative |
| Architecture index | Concise topic map only; it contains neither an alternate topology/tree nor the seven-object list |
| Product State | Exactly `Workspace`, `Conversation`, `Entry`, `Run`, `EngineBinding`, `ResourceRef`, `OperationReceipt`; Package generation is receipt/activation/lease data, not an eighth aggregate |
| Execution | Sole detailed `apps/web` / `apps/desktop` / `apps/service` responsibility layout, with isolated Native Host and External Engine boundaries; no other reviewed file duplicates that tree |
| Queue | Workbench visible behavior, Product State fact transition and Execution authority agree: editable intent → Run/receipt → Engine-owned accepted operation; `delivery_unknown` retains input and forbids return/replay |
| Evidence and next action | README, brief and Campaign cite existing exact-tree/install/build/typecheck/unchanged-smoke evidence and limits; all prohibit an unchanged rerun absent a Source Review trigger |
| Ordered work | All three route through F-03/F-04 rights/assets review, UI source-domain mapping and isolated Native Host; none promotes product completion |
| Campaign preservation | Acceptance matrix is byte-identical to `HEAD`; F-01/F-02 remain `candidate`, F-03–F-18 remain `open`, blockers remain none |

## Independent verification

Commands and results:

- `git branch --show-current && git rev-parse HEAD` — `codex/pi-native-v1` at
  `2445acb987e443b44b7dc819de3de44c3d68b391`.
- `git diff --name-status/--numstat HEAD -- <tracked Work paths>` — exactly four tracked Work-path
  modifications; the three architecture owners do not exist at `HEAD` and are present as current
  files.
- independent parsing of the maintainer-calibrated passage — exactly 4 numbered requirements; all
  required semantic clauses present; 0 matches across the five optional-suggestion families.
- reproducible complete-fence extraction over current README — hashes match the updated handoff:
  `source-adoptions` `09d58ac7e828b2e0a4834c000ae9c8de454f50ebbb539327072dbcdef1454bed`,
  `identity-denylist` `5c3c8a1304d35a9daa7d1525180485c35b2e0a6708b5760ddb88daae213e10b4`,
  `structure-policy` `42850ec5f065b7b63528b6584ec3ef7f8bc1e923a1f1d819c166c0f8051c43e8`.
- independent source-block and Campaign-matrix comparison with `git show HEAD` — source adoption
  and every claim row are byte-identical; Campaign matrix SHA-256 remains
  `34af1e50d1e12a29cdd811c07002b4e9dea354c9d0e77f8fc2c7da624fe463e3`.
- repository-local Markdown resolver over the seven files — 23 checked, 0 missing.
- independent owner/route/object/topology/Queue/next-action check — pass: 7 product objects, 1
  detailed topology owner, aligned Queue and next action.
- `git diff --check HEAD -- AGENTS.md README.md execution-brief.md
  missions/independent-omnimind-v1.md` — pass.
- `git diff --no-index --check /dev/null` for each of the three architecture owners — pass.
- focused `rg` cross-read for `apps/web|apps/desktop|apps/service|PackageGeneration|
  delivery_unknown|unchanged smoke|F-03/F-04|rights/assets|source domain|Native Host` — expected
  ownership and next-action hits only.

`test/document-contract.test.mjs` was still absent during this review, so its conditional suite
could not run; zero automated test cases are claimed. This is not blocking for this Work because
the validator is a separate accepted Work and frozen-candidate integration requires the combined
suite. The independent checks above all passed, and no failed test was waived.

## Review boundary

This updated PASS accepts only Durable Authority Route and the four calibrated README product
requirements as implemented. It does not accept the Workbench, provenance-governance or validator
Works, does not promote a Campaign claim, and does not claim a clean or frozen candidate. The later
README machine-block edit must still receive integrated whole-file review as authored in the work
map.
