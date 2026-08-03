---
type: "Work"
title: "Add the bounded document-contract validator"
---

# Add the bounded document-contract validator

## Objective

Add one read-only validator and focused fixtures that fail deterministically when an approved
owner, route, high-consequence Workbench family, plugin/skill lineage or Queue boundary disappears.
It is a regression alarm over bounded files, not a Markdown schema or proof of semantic/product
completion.

## Linked inputs

- [PRD R10, R12 and AC-01 through AC-12](../prd.md)
- [Design document-contract validator interface and coverage-family table](../design.md)
- [Durable authority route](durable-authority-route.md)
- [Complete Workbench contract](complete-workbench-contract.md)
- [Accepted final calibration](../decisions/qbd-1-final-calibration.md)

## Requirement traceability

This Work directly implements R10 and preserves R12. Its sentinels mechanically guard the known
interfaces introduced by R1–R7 and R9, while semantic ownership remains with those requirements'
document Concepts. It supplies the document-contract cases in AC-01 through AC-09 and the stable
rule/path behavior and real-repository pass required by AC-12.

## In scope

- Add the approved public shape
  `validateDocumentContract({ root, read }) -> Finding[]`, where each Finding has stable `rule`,
  repository-relative `path` and concise `message`.
- Bound reads to the approved owner/routing files and the three declared plugin/skill source
  anchors. Resolve ordinary repository-local Markdown links needed by the route.
- Protect the exact consequence families from the Design: owner graph, read route, product entry,
  shared work, Workbench, onboarding/provenance, Models, Agents, Packages, permission truth,
  external no-fallback, plugin/skill lineage and mapping, Queue boundary, quality and
  adoption/deletion gate.
- Use small stable term/consequence groups with contradiction-aware cases where specified; do not
  require exact paragraphs or one editorial heading order.
- Add fixtures that remove or contradict one family at a time and assert the exact stable rule and
  path. Include missing owner, broken route, all R4 families, all three source anchors, lost
  Workbench mapping, Queue/no-replay regression and a real-repository positive fixture.
- Keep the validator read-only, deterministic and in-memory; it writes no registry, lifecycle state
  or generated output.
- Ensure the new test is discovered by the existing `npm test`/`npm run quality` path without
  creating a parallel quality command.

## Out of scope

- Parsing frontmatter, heading numbers/order, index order, QbD verdicts, Campaign statuses or
  workflow lifecycle as machine state.
- Deciding semantic completeness, rewriting owner files, generating a manifest or inspecting all
  repository Markdown.
- Implementing source-tree exactness, identity partitioning or tool-root policy; that belongs to
  declared provenance governance.
- Editing `package.json`, product code, durable owner documents or the exact source.

## Allowed repository paths

Only these new files may be created or changed:

```text
scripts/document-contract.mjs
test/document-contract.test.mjs
```

Expected handoff:
[`handoffs/bounded-document-contract-validator.md`](../handoffs/bounded-document-contract-validator.md).

## Done conditions

- The exported function returns stable, path-specific Findings and has no filesystem writes.
- Every Design coverage family has at least one focused positive/negative assertion; the R4 and
  plugin/skill families cannot pass on Settings labels or source-anchor tokens alone.
- Missing/broken local routes and Queue/no-replay contradictions fail deterministically.
- The real repository fixture passes after the two document Concepts are applied.
- Tests demonstrate that harmless heading/order/editorial changes do not become lifecycle state.
- The handoff records exact test count/results and explains sentinel limitations.

## Focused verification

Run:

```text
node --test test/document-contract.test.mjs
node --test test/document-contract.test.mjs test/quality.test.mjs
git diff --check -- scripts/document-contract.mjs test/document-contract.test.mjs
```

Review at least one failure from each family and confirm it reports the intended stable rule and
repository-relative owner path, not a generic parse error. Confirm fixture repositories and files
are temporary and leave no artifacts.

## Ordering and review

Finalize this Work after durable authority route and complete Workbench contract are available so
the positive fixture encodes accepted prose rather than an obsolete contract. It may proceed in
parallel with provenance governance and must not edit its shared quality test. Independent review
must attempt keyword-only false positives and a deleted plugin/skill domain.

