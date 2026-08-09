# Decision record

> **Status: superseded in full on 2026-08-09.** This file preserves historical reasoning only. It has no authority over current product, UI, execution topology, work order or acceptance. Current decisions live in [`README.md`](../README.md), [`architecture/`](../architecture/README.md), [`execution-brief.md`](../execution-brief.md) and the active Campaign. In particular, Product Control Plane, external Engine gateway, cross-Engine continuity, Product-owned Package lifecycle and Remote are not current V1 requirements.

## Problem corrected

Two attractive but incompatible shortcuts were rejected:

1. Treat the fixed source as UI-only and rewrite its Product Runtime.
2. Treat its mature Runtime as the permanent Agent Harness and let it own native Engine execution.

The first discards years of product behavior and creates a large speculative rewrite. The second creates two state machines that can both accept, queue, retry, cancel and recover the same native operation.

## Historical synthesis — superseded

> Complete product chassis adoption + OmniMind Product Control Plane + isolated native execution authority + external Engine gateway.

This synthesis was later rejected because the exact Synara source already owns one mature Product Orchestration and Provider Registry. Adding a second Product Control Plane, generic Engine gateway or cross-Provider Package authority duplicated responsibility and made the product harder to finish. The current synthesis is one OmniMind product substrate, one inherited Registry, a bundled `omnimind` Provider and an independently selectable stock `pi` Provider. Ordinary UI exposes only OmniMind product language; source lineage remains available in legal and technical detail.

The product chassis remains valuable for renderer, desktop behavior, transports, receipts, projections, persistence infrastructure, reconciliation, files, Git and terminal. The native Engine remains authoritative for its Session, agent loop, models, tools, package lifecycle and accepted operations. Adoption proceeds by responsibility and proof, not by top-level directory or file count.

The UI contract is normative only in `architecture/workbench.md`. This record preserves why choices changed; it is not a parallel UI ledger.

## Superseded decisions

- The historical move from `Settings › Pi / Engines` to `Models / Agents / Packages` is also superseded; current V1 preserves Synara's mature settings taxonomy and adds only the nearest provider-specific fields.
- A second `Groups | Projects` pill/tab control is superseded by native stacked disclosures with Projects above Groups.
- `quiet-inline / balanced-tabs` and screenshot-redrawn shells are rejected as failed visual directions.
- “Delete the whole donor Server Runtime” is superseded by a product-fact and authority audit.
- “Keep the whole donor Runtime” is rejected because native execution must have one authority.
- “Engine Session is only a disposable cache” is too weak: it is not product identity, but while compatible it remains authoritative for native continuation and private state.
- “Using the Pi SDK means complete Package compatibility” is rejected by explicit unsupported Host UI APIs.

## Stable UI decisions retained

- the complete physical mother, source lineage and parity-before-surgery rule;
- `Agent | Chat`, in that order;
- Projects above Groups as independent disclosures;
- shared Composer, Timeline, Queue, Activity and workbench grammar;
- Chat without Primary Folder and explicit `Send to Agent` for writes;
- no duplicate Toast/Timeline feedback for naturally visible actions;
- native structured questions and child Conversation UI;
- Files, Viewer, Diff, Terminal, Git, PR, Kanban and Automations lineage;
- visual geometry, density, motion, streaming, scrolling, bilingual, CJK and accessibility requirements;
- performance and failure paths as UI correctness.

## Historical devil's advocate

### Strategy

At the time, the concern was that embedding alone could become commodity and OmniMind would need a combined workbench, Package trust/distribution, Remote, cross-Engine continuity and product taste. Current evidence narrowed that conclusion: Synara already supplies the mature workbench and multi-Provider product substrate; V1 differentiates through OmniMind taste, bundled OmniMind Agent, curated compatibility and release quality without taking ownership of every underlying lifecycle. Remote remains V2.

### Execution

The main risk is simultaneously changing a large product chassis and a fast-moving native runtime. The containment strategy is a fixed chassis revision, exact native runtime pins, a narrow isolated Host boundary, conformance tests and responsibility-by-responsibility deletion instead of a big-bang rewrite.

### Adoption

Existing native-runtime users will reject a GUI that breaks profiles or packages; other users will reject a product that pretends all Agents are identical. The product must import compatible profiles honestly, expose true source and capability differences, and never silently fallback.

## Historical reopen conditions

These conditions belong to the superseded synthesis and cannot reopen it automatically. New evidence must enter the current sole owners through the source-update and convergence routes rather than reviving this record.

- the fixed source rights chain blocks the intended adoption;
- the native SDK cannot support a useful mature Package through an isolated Host;
- Product Control Plane and native Harness responsibilities cannot be separated without duplicate execution authority;
- the approved UI mother cannot meet measured performance or accessibility budgets without material geometry change;
- a new Settings domain is required by a real user journey rather than implementation convenience.
