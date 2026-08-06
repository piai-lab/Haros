---
type: "Handoff"
title: "Frozen documentation-governance candidate integration"
status: "DONE"
work: "../work/frozen-candidate-integration.md"
actor_id: "architecture_ui_work_planner"
dispatch_receipt: "44c8988da69f447498b28ea21a44d20e"
predecessor_receipt: "b8042f07b9a94feaacb427d220527294"
base_sha: "2445acb987e443b44b7dc819de3de44c3d68b391"
candidate_sha: "8e67eaba404b1561895d2959e1e9b597e2fa12da"
candidate_ref: "refs/codex/candidates/08-03-architecture-ui-contract"
---

# Frozen documentation-governance candidate integration

Implements [Freeze and land the documentation-governance candidate](../work/frozen-candidate-integration.md)
through the implementation boundary. Finish has not landed the candidate.

## Result

`DONE`. The four current, independently accepted implementation deliverables and the accepted
pre-freeze Bundle Markdown were assembled against the unchanged branch head through a temporary
Git index. The resulting immutable one-parent formal candidate is:

| Identity | Value |
| --- | --- |
| approved base `B` | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| candidate `C` | `8e67eaba404b1561895d2959e1e9b597e2fa12da` |
| candidate tree | `a038ce553e8b7f019f419c4285af0ede2231a9ff` |
| sole parent | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| candidate ref | `refs/codex/candidates/08-03-architecture-ui-contract` |
| subject | `Freeze architecture and UI governance contract` |
| author / committer time | `2026-08-04T00:24:44+08:00` |

The candidate ref resolves to `C` after disposable-repository cleanup. It is only the required
reachability guard; `C` is the delivery identity. The shared branch remains
`refs/heads/codex/pi-native-v1` at `B`, and neither the real index nor any pre-existing worktree
byte was used to record the candidate.

## Frozen payload

`B..C` contains exactly 53 changed paths: the 20 approved repository paths below and the 33
Bundle Markdown files that existed when `C` was minted. The post-`C` Work 5 handoff and future
independent review are absent from `C`.

```text
A .omp-flow/tasks/08-03-architecture-ui-contract/brainstorm.md
A .omp-flow/tasks/08-03-architecture-ui-contract/decisions/qbd-1-evidence-remedy.md
A .omp-flow/tasks/08-03-architecture-ui-contract/decisions/qbd-1-final-calibration.md
A .omp-flow/tasks/08-03-architecture-ui-contract/decisions/qbd-1-repair.md
A .omp-flow/tasks/08-03-architecture-ui-contract/decisions/repair-replay-evidence.md
A .omp-flow/tasks/08-03-architecture-ui-contract/decisions/repair-scope-evidence.md
A .omp-flow/tasks/08-03-architecture-ui-contract/design.md
A .omp-flow/tasks/08-03-architecture-ui-contract/handoffs/bounded-document-contract-validator.md
A .omp-flow/tasks/08-03-architecture-ui-contract/handoffs/complete-workbench-contract.md
A .omp-flow/tasks/08-03-architecture-ui-contract/handoffs/declared-provenance-governance.md
A .omp-flow/tasks/08-03-architecture-ui-contract/handoffs/durable-authority-route.md
A .omp-flow/tasks/08-03-architecture-ui-contract/index.md
A .omp-flow/tasks/08-03-architecture-ui-contract/prd.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/design-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/design-repair-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/design-replay-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/frozen-candidate-gate-repair-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/frozen-candidate-payload-repair-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/frozen-candidate-whitespace-repair-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/work-map-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/qbd/work-map-repair-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/research/document-audit.md
A .omp-flow/tasks/08-03-architecture-ui-contract/reviews/bounded-document-contract-validator.md
A .omp-flow/tasks/08-03-architecture-ui-contract/reviews/complete-workbench-contract.md
A .omp-flow/tasks/08-03-architecture-ui-contract/reviews/declared-provenance-governance.md
A .omp-flow/tasks/08-03-architecture-ui-contract/reviews/durable-authority-route.md
A .omp-flow/tasks/08-03-architecture-ui-contract/task.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/bounded-document-contract-validator.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/complete-workbench-contract.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/declared-provenance-governance.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/durable-authority-route.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/frozen-candidate-integration.md
A .omp-flow/tasks/08-03-architecture-ui-contract/work/index.md
M AGENTS.md
M README.md
A architecture/README.md
A architecture/execution.md
A architecture/product-state.md
A architecture/workbench.md
D discovery-record.md
M execution-brief.md
M missions/independent-omnimind-v1.md
M package.json
A research/README.md
A research/decision-record.md
A research/source-review.md
M scripts/check-identity.mjs
M scripts/check-sources.mjs
A scripts/document-contract.mjs
M scripts/identity.mjs
M scripts/sources.mjs
A test/document-contract.test.mjs
M test/quality.test.mjs
```

The root `package.json` delta is exactly the accepted test-discovery boundary:
`node --test` becomes `node --test test/*.test.mjs`; `quality` and every other JSON value remain
unchanged. `discovery-record.md` is absent. The three byte-frozen research inputs in both the
source worktree and `C` have these SHA-256 values:

| Path | SHA-256 |
| --- | --- |
| `research/README.md` | `3e96113c88218d3cc9a7c704da666e782ee01773d3462f1a5f70146a11db88f3` |
| `research/source-review.md` | `079c3b23ce94726a1ce6d62ef74bfdebea98f51579753be8668a582f08ecee81` |
| `research/decision-record.md` | `28b9674e84ecf763301b49e5d2db4b32d562e06c285a9c4469495417e754742e` |

The unchanged `vendor/ui` tree resolves to
`630f17e61abc478114bf83c1d740977c9f68b910`. No `.DS_Store`, tool/config root,
`.obsidian`, `apps`, `packages`, or `vendor/ui` path entered the changed-path set.

## Clean verification bound to `C`

One task-specific directory was created with `mktemp -d`. A new local repository inside it
fetched the task candidate ref, checked out `C` detached, and was clean before the first command
and after the final command. The entire temporary index and repository directory were then
removed; the candidate ref remains reachable.

| Command or proof | Exit | Result |
| --- | ---: | --- |
| detached `HEAD`, one parent, candidate tree and `vendor/ui` tree checks | 0 | exact values above |
| 53-path allowlist, forbidden-path scan, research bytes, deletion and package delta | 0 | pass |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | 0 | 74/74 pass |
| `npm run check:sources` | 0 | 1 adoption / 1 exact provenance root |
| `npm run check:identity` | 0 | 6,479 source files / 0 generated / 6 rules / max depth 7 |
| `git -c core.whitespace=-blank-at-eof diff --check B C --` | 0 | pass |
| `git diff --name-only --diff-filter=ACDMRT B C --` | 0 | exactly the 53 paths above |
| `npm run quality` | 0 | identity and sources pass; root governance tests 74/74 |
| clean porcelain before and after | 0 | empty |

`npm test` in the total gate resolved to `node --test test/*.test.mjs`, so it discovered the two
root governance suites and did not execute donor tests or smoke scripts.

## Shared-state preservation

All values below were captured with optional Git locks disabled. The post-verification values
matched the pre-construction values exactly. The only intentional ref difference is the new task
candidate ref, which is excluded from the all-other-refs digest and separately proves `C`
reachable.

| Protected surface | Before | After |
| --- | --- | --- |
| symbolic branch | `refs/heads/codex/pi-native-v1` | identical |
| shared `HEAD` | `2445acb987e443b44b7dc819de3de44c3d68b391` | identical |
| real index raw bytes SHA-256 | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` | identical |
| real index entries SHA-256 | `e688e56e7ca2c35d2264a7322d82c7db71f4350bd8a4e25f7a0ebe17d6a34a43` | identical |
| all refs except candidate ref SHA-256 | `9e3a51533db72fdbb3c75da475f652e494b6636a22cc7a5420ea1b94ac087625` | identical |
| complete Git-visible dirty records SHA-256 | `afcdc6c2430e834f4edc9d4afa38d41dd2063408489c14002797aa7887a45e68` | identical |
| porcelain v2 bytes SHA-256 | `52ee6af399be0f7af235fe2fcece956371fb178087c04fe7d773aa1440e5b7b1` | identical |
| 101 unique dirty paths outside candidate payload, path-list SHA-256 | `0176ea9543086447c6784b909a7186297a7558781993acbdfd776fb5f16fac16` | identical |
| same protected paths with type/mode/absence/content SHA-256 | `837824ddb96e6c8b295598a17bc8eeb668fd658921d5b99c3ced2d6d5708569c` | identical |

The complete dirty-record fingerprint is stronger than the required outside-payload check: it
also proves that every candidate-allowed input remained byte-identical while the Git object was
assembled and verified. This handoff was authored only after that comparison and, as required,
is post-`C` evidence rather than candidate content.

## Review and Finish boundary

The next action is an independent review of this exact `C`, its complete diff, clean-gate evidence
and preservation proof. A content change requires abandoning `C`, minting and verifying a new
candidate, and obtaining a new review.

Finish may proceed only after that review is current. It must compare-and-swap fast-forward the
unchanged branch from `B` to this same `C`, synchronize only candidate-allowed real-index entries,
prove excluded state unchanged, and then remove the candidate ref. No commit, amend, cherry-pick,
squash or replacement SHA is authorized. This handoff makes no claim that landing or Campaign
completion has occurred.
