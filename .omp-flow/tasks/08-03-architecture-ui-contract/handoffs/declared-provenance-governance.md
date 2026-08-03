---
type: "Handoff"
title: "Declared provenance governance implementation"
status: "DONE"
work: "../work/declared-provenance-governance.md"
actor_id: "architecture_ui_work_planner"
dispatch_receipt: "1359582f0abd4360867b2bc7db467273"
predecessor_receipt: "136d2eef7ceb4172a62169780f966303"
prior_dispatch_receipt: "524c046eed844652ab1a55621999f6b7"
---

# Declared provenance governance implementation

Implements [Govern declared exact provenance zones](../work/declared-provenance-governance.md).

## Result

`DONE`. Complete `source-adoptions` metadata is now the only route to an exact
provenance-zone exemption. The `ui-mother` entry binds `vendor/ui` to repository commit
`2445acb987e443b44b7dc819de3de44c3d68b391` and tree
`630f17e61abc478114bf83c1d740977c9f68b910`. Source validation fails closed before returning exact
roots, resolves baseline and candidate Git objects, compares the non-ignored working tree, checks
tracked legal text, rejects undeclared `vendor` content and emits bounded path/status findings
without source text.

The independent review's three code P1 findings are closed in this candidate:

- source URLs are parsed and must use HTTPS with a non-empty valid host; Git sources require a
  40-character immutable Git OID, while non-Git sources accept only a Git OID, content digest or
  exact semantic version. `https://` and the moving revision `main` receive no exact root;
- every normalized adoption path is compared with every normalized tool root before provenance is
  considered, so equality, adoption-under-tool and tool-under-adoption all fail for ordinary and
  exact adoptions;
- the two production entry points add a narrow ignored-vendor source inventory. It discovers
  ignored undeclared source such as `vendor/other/copied.js` without changing generic repository
  inventory or reclassifying configured build/dependency directories.

The subsequent review's single P2 finding is also closed. Ignored-vendor discovery now excludes
known dependency directories and configured generated-directory names at every directory depth
below `vendor/`, including the immediate-child layouts `vendor/node_modules/**`,
`vendor/.pnpm/**`, `vendor/.yarn/**` and `vendor/dist/**`. Both the Git pathspec and the in-memory
fallback enforce the same boundary. Ordinary ignored source such as `vendor/other/copied.js`
remains visible, while ignored `dist` files remain available to generated-output discovery rather
than being classified as source.

Identity and structure checks now consume only exact roots returned by the successful source
validator. Exact roots and configured tool roots are separately excluded from production scans;
tool roots gain no adoption authority; README, `LICENSES/` and `research/` retain their narrow
identity-evidence exception; author source and generated output outside those boundaries remain
scanned.

The implementation and focused fixtures are green. During this rework the main session separately
added `.obsidian` to the configured `toolRoots`; the repository-level identity command is therefore
now green. This operation did not edit, delete, ignore, inspect for identity content or classify
`.obsidian`, and does not attribute that policy decision to the provenance implementation.

## Current P2 rework changed files

- `scripts/sources.mjs` — makes ignored-vendor dependency/generated exclusions cover both
  immediate-child and nested directory layouts in the Git pathspec and in-memory fallback.
- `test/quality.test.mjs` — retains all prior attacks and adds first-level
  `node_modules/.pnpm/.yarn/dist` exclusions plus generated-discovery assertions.
- `.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/declared-provenance-governance.md` —
  this handoff.

The existing README provenance object, production entry wiring and `scripts/identity.mjs`
partition remain part of the overall Work but were not edited by this P2 rework. No byte under
`vendor/ui`, `LICENSES/`, `research/`, `.obsidian`, tool content, product source or package.json was
changed by this operation. The shared worktree already contained unrelated predecessor,
main-session and user changes; nothing was staged or committed.

## Rules proven by fixtures

- Missing ordinary fields, non-HTTPS source, inexact revision form, empty rights/change/update
  text, unsupported mode, invalid/root paths and missing tracked legal text fail.
- Parsed HTTPS requires a real host. Git sources reject moving names such as `main`; invalid
  ordinary metadata fails before `exactRoots` is returned.
- Missing/malformed commit or tree metadata, path/tree-key mismatch, normalized duplicate tree
  keys, missing Git objects/trees, wrong baseline tree and candidate tree drift fail.
- Modified, non-ignored added and deleted exact-zone files fail with adoption ID, exact path,
  expected tree and bounded `M`/`A`/`D` path evidence.
- Duplicate, equal, nested and overlapping exact roots fail; disjoint exact roots pass.
- The required exact-root/tool-root relations are explicit:
  - equality: `vendor/source` versus `vendor/source` — rejected;
  - exact-under-tool: `vendor/source` versus `vendor` — rejected;
  - tool-under-exact: `vendor/source` versus `vendor/source/tools` — rejected;
  - disjoint sibling/control: `vendor/source` versus `.omp-flow` — passed.
- The same equality, adoption-under-tool and tool-under-adoption relations are rejected for an
  ordinary adoption with no provenance, so tool content cannot acquire production-adoption
  authority through the machine block.
- Exact and tool source/generated paths are not scanned as production content, but only a valid
  exact declaration receives exactness/adoption authority. Disclosure, legal and research evidence
  remain allowed. Donor identity in author paths/text and generated output remains rejected.
- Undeclared `vendor` source and generated content fail; an adoption lacking complete provenance
  receives no exact root.
- A tracked `.gitignore` hiding `vendor/other/` cannot conceal `vendor/other/copied.js` from the
  source gate. In the same fixture, `vendor/other/node_modules/**` and `vendor/other/dist/**` remain
  dependency/build exclusions, and generic `repositoryFiles` remains unchanged.
- The same fixture proves immediate-child `vendor/node_modules/**`, `vendor/.pnpm/**`,
  `vendor/.yarn/**` and `vendor/dist/**` are excluded from ignored-source evidence. Both
  `vendor/dist/bundle.js` and nested `vendor/other/dist/bundle.js` are still returned by generated
  discovery, preserving the generated-output identity partition.

## Verification

| Command or proof | Result |
| --- | --- |
| `node --test test/quality.test.mjs` | pass, 23/23 |
| `npm test` | pass, 74/74 |
| `npm run check:sources` | pass, 1 adoption and 1 exact provenance root |
| `npm run check:identity` | pass, 6579 source files, 0 generated files, 6 identity rules, max depth 7; green after the separately attributed main-session `.obsidian` classification |
| `git diff --check -- README.md scripts/sources.mjs scripts/check-sources.mjs scripts/identity.mjs scripts/check-identity.mjs test/quality.test.mjs` | pass |
| `git rev-parse 2445acb987e443b44b7dc819de3de44c3d68b391:vendor/ui` | `630f17e61abc478114bf83c1d740977c9f68b910` |
| `git rev-parse HEAD:vendor/ui` | `630f17e61abc478114bf83c1d740977c9f68b910` |
| `git cat-file -t 630f17e61abc478114bf83c1d740977c9f68b910` | `tree` |
| `git diff --quiet HEAD -- vendor/ui` plus non-ignored untracked inventory | pass, no difference/output |

Complete fenced-block SHA-256 values after this Work are:

- `source-adoptions`: `a63a667a6a35232af10c84ec3f7efce856d285529f331d1696f58050045031d1`;
- `identity-denylist`: unchanged at
  `5c3c8a1304d35a9daa7d1525180485c35b2e0a6708b5760ddb88daae213e10b4`;
- `structure-policy`: current shared-worktree value
  `4cfb78142366f7b636452a5f6db0a985384e432a7ee3e814e5106ebffdc1140a`; its `.obsidian`
  classification was made outside this rework.

## Caveat and review boundary

Ignored-vendor discovery is intentionally narrow: it supplements source governance only under
`vendor/`, excludes configured build directories and known dependency directories at every depth,
and does not change the generic repository inventory used elsewhere. It is not a general
ignored-file scanner. Configured exclusion names are accepted as literal safe directory segments;
other names are not converted into Git pathspecs.

The current identity gate reflects the main session's separate `.obsidian` classification. This
handoff records the observed green command but does not review or approve that decision.
Independent review should challenge privilege broadening and exactness gaps and must not treat this
handoff as Campaign acceptance.
