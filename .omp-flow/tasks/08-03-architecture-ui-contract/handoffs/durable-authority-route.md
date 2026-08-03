---
type: "Handoff"
title: "Durable authority route implementation"
status: "DONE"
work: "../work/durable-authority-route.md"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "2211c359badf45cb990f263fdbced089"
predecessor_receipt: "574524a33aea445280778d6197bb8600"
prior_dispatch_receipt: "9e5817dc901d40269d7f74c29c2e4c0b"
---

# Durable authority route implementation

Implements [Reconcile the durable authority route](../work/durable-authority-route.md).

## Result

`DONE`. The durable files now expose one owner graph, one read route and one current next-action
sequence. This handoff does not claim independent acceptance, product implementation or Campaign
completion.

The maintainer-calibrated follow-up changed only README prose and this handoff. README now records
exactly four additional official-distribution/Pi-ecosystem requirements: bundled tuned Pi without
separate user installation/configuration; product discretion to curate, preinstall or build
Package/MCP/Skill/Prompt and make bounded maintainable Pi adaptations; no competing Agent Runtime
or Pi ecosystem code in Electron Main/renderer; and protection of credentials plus actual
license/attribution/redistribution obligations. It deliberately leaves prompt layering,
revision/digest choices, Package taxonomies, configuration directories and MCP deployment
unfixed.

## Changed files

- `AGENTS.md` — reduced to mandatory routing, ambiguity handling, focused verification and
  operational/Git safety.
- `README.md` — reduced to constitution, owner routes, non-negotiable boundaries and production
  adoption; the `source-adoptions` block is byte-identical to the input.
- `architecture/README.md` — replaced the duplicate topology/tree with a topic responsibility map.
- `architecture/product-state.md` — keeps exactly seven durable objects, makes Package generation
  receipt/activation/lease data rather than a mandated aggregate and tightens Queue transfer.
- `architecture/execution.md` — owns the sole detailed `apps/web` / `apps/desktop` /
  `apps/service` responsibility layout and accepted-operation boundary.
- `execution-brief.md` — now contains only stage order, entry/stop conditions and proof gates.
- `missions/independent-omnimind-v1.md` — now owns status/evidence pointers only; its acceptance
  matrix and every claim state are unchanged.
- `.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/durable-authority-route.md` — this
  handoff.

No Workbench, research, product/runtime source, governance script/test, legal/source tree or
Campaign claim status was changed by this Work.

## Review points

| Fact class | Sole owner after implementation | Other involved files |
| --- | --- | --- |
| Product doctrine and production adoption | `README.md` | route/summary only |
| Complete visible UI behavior | `architecture/workbench.md` | unchanged by this Work |
| Product facts, seven objects and Queue-to-Run transfer | `architecture/product-state.md` | route/summary only |
| Detailed process/target topology and accepted Engine operations | `architecture/execution.md` | route/summary only |
| Fixed evidence and revalidation triggers | `research/` | unchanged; cited only |
| Order, entry/stop conditions and proof gates | `execution-brief.md` | no topology/object catalog |
| Claim status and evidence pointers | active Campaign | no architecture/work plan |

The mandatory route is consistent where stated: README → involved architecture owners in full →
execution brief → active Campaign for status → conditional research evidence. Queue statements in
Workbench, Product State and Execution all distinguish editable intent, Product admission to
Run/receipt, Engine-owned accepted operations and `delivery_unknown` with no blind replay.

README, the brief and the Campaign cite the already-recorded exact-tree, install, build, typecheck
and unchanged macOS smoke evidence, retain its limitations and forbid rerunning the same probe
without a Source Review trigger. All three route next to contract review, F-03/F-04 rights/evidence
review, UI source-domain mapping and isolated Native Host work.

## Verification

| Check | Result |
| --- | --- |
| `source-adoptions` complete fenced-block SHA-256 before/after | unchanged: `09d58ac7e828b2e0a4834c000ae9c8de454f50ebbb539327072dbcdef1454bed` |
| `identity-denylist` / `structure-policy` complete fenced-block SHA-256 | unchanged: `5c3c8a1304d35a9daa7d1525180485c35b2e0a6708b5760ddb88daae213e10b4` / `42850ec5f065b7b63528b6584ec3ef7f8bc1e923a1f1d819c166c0f8051c43e8` |
| Maintainer-calibrated README requirements | exactly 4; all 4 semantic checks pass |
| Optional-suggestion freeze scan within the calibrated passage | 0 findings |
| Campaign acceptance-matrix SHA-256 before/after | unchanged: `34af1e50d1e12a29cdd811c07002b4e9dea354c9d0e77f8fc2c7da624fe463e3` |
| Repository-local Markdown link resolver over the seven files | 23 checked, 0 missing |
| Product-object count in Product State | 7 |
| Detailed `apps/...` topology owner scan | 1 hit, `architecture/execution.md` only |
| `PackageGeneration` scan | only Product State's explicit “not an aggregate” statement |
| Queue cross-read | Workbench/Product State/Execution aligned |
| Stale unchanged-smoke request scan | 0 findings |
| `git diff --check` on tracked allowed paths | pass |
| `git diff --no-index --check /dev/null` on three untracked architecture files | pass for all 3 |

The fenced-block hashes above use the reproducible extraction `RegExp('```' + name +
'\\n[\\s\\S]*?\\n```')` over UTF-8 README content and hash the matched bytes without an added
trailing newline. This corrects the earlier handoff's ambiguous shell-extraction checksum noted by
the independent review; no machine-block byte changed.

`test/document-contract.test.mjs` was not present when this Work completed, so its conditional
owner/read-route/topology/object/Queue/next-action cases were not runnable. The later validator
Work should run those cases against this repository fixture; no substitute green test is claimed.

The worktree was already dirty and the architecture/Bundle trees were already untracked. This
implementation preserved those unrelated changes and did not stage or commit anything.
