---
type: "Review"
title: "Frozen documentation-governance candidate independent review"
verdict: "PASS"
work: "../work/frozen-candidate-integration.md"
handoff: "../handoffs/frozen-candidate-integration.md"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "f1a127e7f82e445bb589920159525535"
predecessor_receipt: "44c8988da69f447498b28ea21a44d20e"
base_sha: "2445acb987e443b44b7dc819de3de44c3d68b391"
candidate_sha: "8e67eaba404b1561895d2959e1e9b597e2fa12da"
candidate_ref: "refs/codex/candidates/08-03-architecture-ui-contract"
---

# Frozen documentation-governance candidate independent review

## Verdict and findings

**PASS. No findings.** Candidate `8e67eaba404b1561895d2959e1e9b597e2fa12da` is the exact
one-parent, allowlisted documentation/governance commit described by the handoff. Independent
verification on a clean disposable repository detached at that SHA passed every focused and total
gate. The shared branch, real index, non-candidate refs and protected dirty state remained
preserved; the handoff and this Review are correctly outside the immutable candidate as post-`C`
evidence. The candidate is ready for the identity-preserving Finish compare-and-swap route defined
by Work 5.

## Immutable candidate identity

| Property | Independently observed value |
| --- | --- |
| approved base `B` | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| candidate `C` | `8e67eaba404b1561895d2959e1e9b597e2fa12da` |
| candidate object type | `commit` |
| candidate tree | `a038ce553e8b7f019f419c4285af0ede2231a9ff` |
| sole parent | `2445acb987e443b44b7dc819de3de44c3d68b391` |
| subject | `Freeze architecture and UI governance contract` |
| author / committer time | `2026-08-04T00:24:44+08:00` |
| candidate ref | resolves exactly to `C` |
| shared symbolic branch / `HEAD` | `refs/heads/codex/pi-native-v1` / `B` |

`git merge-base --is-ancestor B C` passed. Neither review inspection nor clean verification moved
the candidate ref, branch or commit identity.

## Complete payload and scope

`git diff --name-status --no-renames B C --` contains exactly 53 paths: 20 fixed repository
allowlist paths and 33 pre-freeze Markdown files under the exact Bundle root. Every status is
`A`, `M` or the approved deletion of `discovery-record.md`; no path falls outside the Work 5
union. The set contains no `.DS_Store`, tool/config root, `.obsidian`, `apps`, `packages` or
`vendor/ui` change.

The candidate-specific checks also established:

- all 53 candidate paths in the current worktree have the exact candidate blob and mode, with
  `discovery-record.md` absent;
- the three research owners have identical source-worktree and candidate SHA-256 values:
  `3e96113c…`, `079c3b23…` and `28b9674e…` as recorded in the handoff;
- `package.json` changes only `scripts.test`, from `node --test` to
  `node --test test/*.test.mjs`; `quality` and every other top-level value remain unchanged;
- both `B:vendor/ui` and `C:vendor/ui` resolve to immutable tree
  `630f17e61abc478114bf83c1d740977c9f68b910`;
- the four implementation Reviews in `C` are `PASS` and link to their current implementation
  receipts; the accepted QbD-2 repair audits are present;
- neither the Work 5 handoff nor this Review exists in `C`. They are evidence about `C`, not a
  reason to create another delivery SHA.

## Clean same-SHA verification

A task-specific directory under `/tmp` was created with `mktemp -d`. A new local Git repository
fetched only the candidate ref, checked out `C` detached and reported zero porcelain bytes before
the first gate. The following commands all ran against that same detached SHA:

| Command or proof | Result |
| --- | --- |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | pass, 74/74 |
| `npm run check:sources` | pass, 1 adoption and 1 exact provenance root |
| `npm run check:identity` | pass, 6479 source files, 0 generated files, 6 rules, max depth 7 |
| `git -c core.whitespace=-blank-at-eof diff --check B C --` | pass |
| `git diff --name-only --diff-filter=ACDMRT B C --` | exactly 53 paths |
| `npm run quality` | pass: identity, sources and bounded root tests 74/74 |
| detached status before / after | clean / clean |
| detached `HEAD` before / after | `C` / `C` |

The total gate invoked `node --test test/*.test.mjs`, covering exactly the root governance suites
without executing donor tests or smoke scripts. The disposable repository was then removed; no
persistent review worktree, ref or candidate object was created.

## Shared-state and post-candidate boundary

The handoff records identical before/after construction fingerprints, including the complete
dirty-record and protected type/mode/absence/content digests. Independent read-only recomputation
before and after the detached verification reproduced the directly observable values:

| Protected surface | Recomputed value |
| --- | --- |
| real index raw bytes SHA-256 | `5845331292004b230c9e2fe293c62c70cb8971a922086ef49d360b82d49b7440` |
| real index entries SHA-256 | `e688e56e7ca2c35d2264a7322d82c7db71f4350bd8a4e25f7a0ebe17d6a34a43` |
| all refs except candidate ref SHA-256 | `9e3a51533db72fdbb3c75da475f652e494b6636a22cc7a5420ea1b94ac087625` |
| baseline porcelain-v2 SHA-256 | `52ee6af399be0f7af235fe2fcece956371fb178087c04fe7d773aa1440e5b7b1` |
| protected paths outside candidate payload | 101 unique paths |
| protected path-list SHA-256 | `0176ea9543086447c6784b909a7186297a7558781993acbdfd776fb5f16fac16` |

The baseline porcelain and protected-path values are recovered by excluding only the exact Work 5
post-candidate evidence outputs. Before this Review was written, the handoff was the sole such
extra path; after Review creation the allowed post-`C` evidence set is exactly the handoff and
this Review. All candidate payload bytes already match `C`, and `git diff --cached --quiet`
confirms the real index remains the unchanged `B` index.

## Finish compare-and-swap readiness

The current state satisfies the Work 5 preconditions for Finish:

- shared `HEAD` and `refs/heads/codex/pi-native-v1` remain at `B`;
- the task candidate ref remains at the reviewed `C`, whose sole parent is `B`;
- candidate-allowed worktree bytes and modes already equal `C`;
- the real index is unchanged and has no staged delta against `B`;
- excluded index entries, non-candidate refs and the 101 protected pre-existing dirty paths retain
  their recorded baseline identity;
- the only post-`C` additions are the required SHA-bound handoff and Review evidence.

Finish may therefore perform only the authored atomic compare-and-swap fast-forward from `B` to
this exact `C`, synchronize candidate-allowed index entries to `C`, preserve excluded state and
then remove the task candidate ref. This Review does not authorize a commit, amend, cherry-pick,
squash, replacement SHA or broader cleanup, and it does not claim that landing has already
occurred.

## Review identity and non-mutation

- Work: [Freeze and land the documentation-governance candidate](../work/frozen-candidate-integration.md)
- Handoff: [Frozen documentation-governance candidate integration](../handoffs/frozen-candidate-integration.md)
- Reviewer actor: `architecture_doc_qbd_3`
- Review receipt: `f1a127e7f82e445bb589920159525535`
- Implementer actor: `architecture_ui_work_planner`
- Implementation receipt: `44c8988da69f447498b28ea21a44d20e`

The reviewer differs from the implementer and the handoff links to the same Work with the supplied
completed predecessor receipt. No candidate, ref, branch, index or protected worktree content was
changed. Only this required post-`C` Review Concept was added.
