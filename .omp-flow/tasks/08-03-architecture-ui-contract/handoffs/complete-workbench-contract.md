---
type: "Handoff"
title: "Complete Workbench contract implementation"
status: "DONE_WITH_CONCERNS"
actor_id: "architecture_ui_work_planner"
dispatch_receipt: "174cb03c0cec47b5a3e1dfd1ff0a8a9b"
---

# Complete Workbench contract implementation

Implements [Complete the sole Workbench contract](../work/complete-workbench-contract.md).

## Result

`architecture/workbench.md` remains the sole complete UI owner and retains its existing 18-section
mother contract. The repair adds the previously approved missing consequences in place:

- first-run independent `Powered by Pi` disclosure, real Provider/Model or local setup and truthful
  cancel/expiry/offline/runtime/model/version re-entry;
- calm but complete Engine, Package, Agent, About, Licenses and diagnostic provenance;
- runtime-backed Models, capability-truthful Agents and the complete Package discovery,
  compatibility, review, activation, lease, update, current/LKG, rollback and fault surface;
- visible separation of permission policy from `host-enforced / engine-enforced / mixed /
  unverified`, without sandbox claims;
- External Engine capability differences, pre-acceptance no-silent-fallback and post-dispatch
  no-blind-replay behavior;
- all three fixed Plugin/Skill discovery anchors, their Packages/Agents/Composer mapping and the
  proof-before-deletion rule;
- an extended completion gate that explicitly distinguishes a complete authored contract from real
  UI/product/Campaign completion.

The contract describes visible consequences only. It does not add a Product State transition,
Execution topology, Package loader or persistent runtime object, and it does not promote later
calibration suggestions into new public ontology.

## Changed files

- [`architecture/workbench.md`](../../../../architecture/workbench.md) — sole durable change.
- `handoffs/complete-workbench-contract.md` — this implementation handoff.

No other durable owner, product source, fixed source, governance implementation, test, research,
legal or Campaign file was edited by this operation.

## Requirement coverage

| Requirement | Implemented consequence |
| --- | --- |
| R2 | Workbench remains ordinary readable Markdown and the sole complete normative UI owner |
| R3 | Existing Agent/Chat, shared work, workbench domains, visual, performance, bilingual and accessibility families remain affirmative |
| R4 | Onboarding, provenance, Models, Agents, Packages, permission truth and External Engine each include normal plus unavailable/failure/recovery behavior |
| R5 | Three exact source anchors, preserved behaviors, target mapping and replaceable donor ontology are explicit |
| R7 | Visible pre-dispatch intent, Run/receipt handoff and delivery/outcome uncertainty remain consistent without copying the fact state machine |
| R12 | The final gate says authored contract completeness is not UI/product/Campaign completion |

## Verification

Focused coverage script over `architecture/workbench.md`:

- result: pass;
- checked 10 consequence groups: mother entry, shared work, workbench domains, quality,
  onboarding, provenance, Models/Agents/Packages, permission, external no-fallback and
  non-completion;
- checked all 3 contract anchor strings and confirmed all 3 source files exist.

Targeted section and adversarial-term scans:

- result: pass;
- confirmed the new onboarding, provenance, Models, Agents, Packages, permission, External Engine
  and Plugin/Skill sections;
- confirmed explicit no-Pi fallback, no cross-Engine automatic replay, unverified enforcement,
  non-sandbox Package failure and truthful-unavailable/deletion wording.

Formatting and scope:

- `git diff --check -- architecture/workbench.md` — exit 0;
- explicit Markdown trailing-whitespace/final-newline check — pass;
- scoped status before writing this handoff showed only `?? architecture/workbench.md` in the
  durable target set.

Automated test count: 0. `test/document-contract.test.mjs` did not yet exist when this Work ran, so
the dependent `node --test test/document-contract.test.mjs` command was not runnable and is not
reported as green.

## Decisions and caveats

- New behavior was inserted under existing Information Architecture, Settings, takeover/deletion
  and completion sections; the mother section order and approved families were not reorganized.
- The exact Plugin/Skill paths were verified against the imported source, but no file under
  `vendor/ui` was changed.
- The missing document-contract suite is the only concern. Once its independent Work lands,
  integration must run that suite against this final Workbench and reject any missing consequence
  family or source anchor.
- This handoff is an implementation result, not independent acceptance. The next operation must
  review the entire Workbench rather than infer completeness from sentinel terms.

## Output

Handoff path:
`.omp-flow/tasks/08-03-architecture-ui-contract/handoffs/complete-workbench-contract.md`.

