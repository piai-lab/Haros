---
type: "Review"
title: "Declared provenance governance independent review"
verdict: "PASS"
work: "../work/declared-provenance-governance.md"
handoff: "../handoffs/declared-provenance-governance.md"
actor_id: "architecture_doc_qbd_3"
dispatch_receipt: "1d33da8a2aba4712ae27cbbbf0d2d370"
predecessor_receipt: "1359582f0abd4360867b2bc7db467273"
---

# Declared provenance governance independent review

## Verdict and findings

**PASS. No findings.** The first-level dependency exclusion defect from review receipt
`136d2eef7ceb4172a62169780f966303` is closed without reopening the ignored-source bypass or
broadening generic inventory. The current implementation satisfies the linked Work, all focused
and total tests pass, both production entry points are green, the real imported tree remains
immutable, and independent adversarial fixtures found no unresolved acceptance blocker.

## Dependency, build and ignored-source boundary

An independent temporary Git repository used a tracked `.gitignore` containing `vendor/` and the
following ignored paths:

```text
vendor/node_modules/p/index.js
vendor/.pnpm/p/index.js
vendor/.yarn/p/index.js
vendor/dist/bundle.js
vendor/other/node_modules/p/index.js
vendor/other/.pnpm/p/index.js
vendor/other/.yarn/p/index.js
vendor/other/dist/bundle.js
vendor/other/copied.js
```

The production helpers produced these non-overlapping results:

- generic `repositoryFiles` stayed bounded to the two tracked fixture files, `.gitignore` and
  `README.md`;
- `ignoredVendorSourceFiles(root, ["dist"])` returned only
  `vendor/other/copied.js`; first-level and nested dependency/build paths were absent;
- source validation rejected that copied source as
  `undeclared vendor content vendor/other` and returned no exact root;
- generated discovery returned both `vendor/dist/bundle.js` and
  `vendor/other/dist/bundle.js`, while dependency paths remained excluded;
- identity scanning emitted `undeclared vendor generated content` for both discovered `dist`
  files.

This verifies both halves of the intended partition: ignored dependencies/build output cannot be
misclassified as ordinary adopted source, while ignored generated output outside exact/tool roots
remains visible to the generated-output identity gate. The revised Git pathspec covers the first
level below `vendor/`, and the in-memory fallback now examines that same first-level segment.

## Carried adversarial checks

- With the real README adoption and repository objects, `url: "https://"` and
  `revision: "main"` each returned `exactRoots: []` with bounded metadata findings.
- Ordinary and exact adoption fixtures rejected equality, adoption-under-tool and
  tool-under-adoption. A disjoint sibling passed in both cases.
- Ordinary and exact attempts to adopt `.obsidian` returned no exact root and an
  `adopted source path and tool root overlap` finding. Repository inspection confirms `.obsidian`
  appears only in the explicit `toolRoots` classification; tool roots are used for path exclusion
  and adoption disjointness, not as adoption records or trust assertions.
- A tracked broad ignore could not hide `vendor/other/copied.js`; the copied path was the sole
  ignored-source supplement entry and caused source validation to fail.
- The source validator still fails closed before identity scanning, returns exact roots only after
  successful ordinary/provenance validation, and emits bounded paths/status rather than source
  text.
- Both baseline commit `2445acb987e443b44b7dc819de3de44c3d68b391` and current `HEAD`
  resolve `vendor/ui` to tree `630f17e61abc478114bf83c1d740977c9f68b910`. The object is a Git
  tree; the working subtree has no tracked or non-ignored untracked difference.

## Review identity and linkage

- Work: [Govern declared exact provenance zones](../work/declared-provenance-governance.md)
- Handoff: [Declared provenance governance implementation](../handoffs/declared-provenance-governance.md)
- Reviewer actor: `architecture_doc_qbd_3`
- Review receipt: `1d33da8a2aba4712ae27cbbbf0d2d370`
- Implementation actor: `architecture_ui_work_planner`
- Implementation receipt: `1359582f0abd4360867b2bc7db467273`
- Predecessor failing review receipt: `136d2eef7ceb4172a62169780f966303`
- Reviewed repository HEAD: `2445acb987e443b44b7dc819de3de44c3d68b391`, with the linked
  shared-worktree candidate diff and current handoff.

The reviewer differs from the implementer, the handoff links to the same Work, and its dispatch
receipt matches the supplied completed predecessor. Shared predecessor and user changes remain
outside this Work's attribution.

## Independent verification

| Command or proof | Result |
| --- | --- |
| `node --test test/quality.test.mjs` | pass, 23/23 |
| `npm test` | pass, 74/74 across the shared document and quality suites |
| `npm run check:sources` | pass, 1 adoption and 1 exact provenance root |
| `npm run check:identity` | pass, 6580 source files, 0 generated files, 6 identity rules, max depth 7 |
| `git diff --check -- README.md scripts/sources.mjs scripts/check-sources.mjs scripts/identity.mjs scripts/check-identity.mjs test/quality.test.mjs` | pass |
| `git rev-parse 2445acb987e443b44b7dc819de3de44c3d68b391:vendor/ui` | `630f17e61abc478114bf83c1d740977c9f68b910` |
| `git rev-parse HEAD:vendor/ui` | `630f17e61abc478114bf83c1d740977c9f68b910` |
| `git cat-file -t 630f17e61abc478114bf83c1d740977c9f68b910` | `tree` |
| `git diff --quiet HEAD -- vendor/ui` plus `git ls-files --others --exclude-standard -- vendor/ui` | pass, no difference/output |
| Independent first-level/nested ignore matrix | all dependency/build paths absent from ignored-source supplement; copied source present and rejected |
| Independent generated-output probe | direct and nested `dist` files discovered and rejected by identity generated partition |
| Independent metadata and tool-root probes | empty-host/moving revision and all overlap attacks rejected; disjoint controls passed |
| Independent `.obsidian` probe | ordinary and exact adoption attempts rejected with no exact root |

No implementation, product, provenance, legal, research or tool-content file was changed by this
Review. Only this linked Review Concept was updated.
