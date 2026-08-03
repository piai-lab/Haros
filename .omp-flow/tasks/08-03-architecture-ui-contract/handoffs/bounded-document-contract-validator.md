---
type: "Handoff"
title: "Bounded document contract validator implementation"
status: "DONE"
work: "../work/bounded-document-contract-validator.md"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "44cf61e57e74489190ca0643c4d3306a"
predecessor_receipt: "cca6eadd5f504e60b05bc3279a89577d"
prior_implementation_receipt: "a21dbe59fef8476ab768e066044c1269"
---

# Bounded document contract validator implementation

Implements [Add the bounded read-only document contract validator](../work/bounded-document-contract-validator.md).

## Result

`DONE`. `validateDocumentContract({ root, read })` now reads only the nine approved durable
documents and three protected Plugin/Skill source anchors. It returns deterministic
`{ rule, path, message }` findings and performs no writes, traversal, manifest parsing, lifecycle
parsing or Campaign mutation.

The rules cover the owner graph and mandatory routes; product entry and shared work language;
Workbench, onboarding, provenance, Models, Agents, Packages, permission and external Engine
contracts; protected Plugin/Skill lineage and product mapping; Queue ownership/no replay; UI
quality; and source adoption/deletion gates. Affirmative term groups are paired with bounded
consequences or explicit contradiction checks rather than heading/frontmatter/index state.

The latest independent review's two P1 findings are closed in this candidate. Models, Agents,
Packages and permission truth retain all approved consequence checks and additionally require
their distinctive relationship groups to span respectively 3, 2, 3 and 4 blank-line-delimited
prose blocks. A single content block containing every consumed sentinel therefore cannot pass,
while frontmatter, wholesale heading rename and section reorder remain irrelevant.

Each Plugin/Skill anchor is now checked against an executable lexical skeleton. A bounded scanner
removes line/block comments and masks complete single-quoted, double-quoted and template literals;
only the seven exact route/tab literals needed by the protected executable shapes survive as
literal values. Source-specific structural regexes run on that skeleton, so a syntactically valid
quoted string containing every regex-shaped pseudo-code signature produces the exact anchor
finding rather than impersonating executable code.

## Changed files

- `scripts/document-contract.mjs` — the fixed-input read-only validator, distinct-block
  relationship checks and bounded executable-source lexical recognizer.
- `test/document-contract.test.mjs` — 51 focused fixtures covering every approved family,
  path-specific failures, contradictions, keyword/anchor-only negatives, all three protected
  anchors, the prior seven isolated attacks, four complete-current-sentinel single-block Settings
  attacks, three complete-regex quoted-source attacks, lost product mapping, Queue replay,
  harmless editorial changes and the real repository.
- `.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/bounded-document-contract-validator.md`
  — this handoff.

No durable contract document, schema, manifest, lifecycle parser, product/runtime source,
Campaign state, legal/source tree or shared test outside the allowed focused suite was changed by
this Work.

## Verification

| Command | Result |
| --- | --- |
| `node --test test/document-contract.test.mjs` | pass, 51/51 |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | pass, 74/74; the shared quality suite contained 23 tests at this run |
| `node --check scripts/document-contract.mjs` and `node --check test/document-contract.test.mjs` | pass |
| `git diff --check -- scripts/document-contract.mjs test/document-contract.test.mjs` | pass |
| Full-file `git diff --no-index --check /dev/null <file>` | 0 whitespace diagnostics for both untracked implementation files |
| Real repository `validateDocumentContract({ root })` | pass, `[]` |

The test suite also records the exact 12-path read set and compares every input before/after the
run, proving the validator does not widen its read boundary or mutate those inputs. Missing owner
and missing-anchor fixtures assert complete stable finding objects; family fixtures assert stable
rule/path identity. Each of the seven reviewer-equivalent complete attacks leaves all other inputs
valid and asserts the complete single expected finding, so unrelated failures cannot mask the
target rule.

## Caveats

- The validator intentionally checks only the bounded contract frozen by this Work. It is not a
  Markdown semantic parser and does not claim product implementation, UI completion or Campaign
  acceptance.
- Distinct-block checks are intentionally bounded to the current authored consequence structure;
  they do not parse headings or a Markdown schema. A legitimate rewrite that collapses every
  relationship into one paragraph must update the bounded sentinel and its negative fixtures in
  the same semantic review.
- Source-anchor checks recognize the currently protected route registration, generated route
  mapping and PluginLibrary discovery behaviors after lexical masking. They are not a TypeScript
  parser or general dead-code/control-flow analyzer; a legitimate source refactor must update the
  bounded recognizer and its fixtures in the same reviewed change.
- The worktree was already dirty with predecessor and user changes. This Work preserved them and
  did not stage or commit anything.
