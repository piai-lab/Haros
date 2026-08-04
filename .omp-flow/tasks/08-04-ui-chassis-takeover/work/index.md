---
type: "Work Map"
title: "UI chassis takeover implementation work"
---

# UI chassis takeover implementation work

This map decomposes the human-approved [PRD](../prd.md) and [Design](../design.md), including the
two findings from the first [QbD 1 audit](../qbd/design-audit.md), their bounded
[repair](../decisions/qbd-1-calibration.md), the scoped [PASS](../qbd/design-audit-recheck.md) and
the final [approval to proceed](../decisions/qbd-1-approval.md).

The first [QbD 2 audit](../qbd/work-map-audit.md) found one Host-placement ownership gap. Its
[human calibration](../decisions/qbd-2-calibration.md) authorized the bounded repair recorded in the
existing Host Work and this map, and the scoped [recheck](../qbd/work-map-audit-recheck.md) passed.
Later maintainer calibration merged product identity, authorized assets and the runnable source
closure into one atomic T1 Work. This reduced the catalog without changing the approved T0-T4
meanings or reopening either QbD audit.

The work preserves the approved T0–T4 meanings. Splitting one checkpoint into several Work
Concepts creates independently implementable and reviewable responsibilities; it does not create
extra product checkpoints, a machine dependency graph or permission to promote an intermediate
SHA. T1–T3 remain non-candidate construction states. The first production candidate can exist only
after every T4 replacement and deletion gate is satisfied on one frozen SHA.

## Work Concepts

- [Transplant the runnable source closure](transplant-runnable-source-closure.md) performs the
  authorized Git-native T1 move, final product identity and asset/notices closure; it preserves the
  complete icon corpus and owned public-surface capability lineage, removes the buildable donor
  mirror and guessed public exits, and records hard-green versus exact expected-red execution debt
  without claiming production readiness or an active public service.
- [Establish Product facts and typed ingress](establish-product-facts-and-typed-ingress.md) creates
  the fresh Product Store, atomic admission/outbox, single writer, typed projections and the first
  journey cutover away from donor execution routing.
- [Establish the isolated Host boundary](establish-isolated-host-boundary.md) adds the real Pi-free
  Native Host executable, authenticated bounded channel, independent Desktop supervision and
  process fault evidence required at T2.
- [Take over the Agent and Chat workbench](take-over-agent-chat-workbench.md) puts the approved UI
  mother under the real `Agent | Chat` information architecture and proves behavior, visual
  preservation, bilingual use, accessibility and performance at T3.
- [Adopt Pi native execution](adopt-pi-native-execution.md) extends the exact T2 Host boundary in
  place with Pi-native catalog, Session, acceptance, stream, controls, credentials and one real
  Chat plus folder-backed Agent journey.
- [Retire competing execution authority](retire-competing-execution-authority.md) deletes the old
  Provider/Session/accepted-queue/Package/raw-payload authority only after replacement proof and
  makes Host-external Pi dependency and unrelated identity scans green at T4.
- [Freeze the first production candidate](freeze-first-production-candidate.md) binds current
  acceptance evidence, final artifact and independent review to one clean frozen SHA without
  reinterpreting historical T0 evidence or promoting Campaign claims.

## Authored execution view

The authorized runnable source closure is first because all later work edits one final-identity
production tree rather than a second tree or a temporary branded intermediate. Product facts then
replace the first journey's durable and live writer. The isolated Host boundary follows that
Product command/fact seam and must be a real production-path executable even though it truthfully
refuses Engine execution.

The source-closure, Product-facts and Host Works are deliberately ordered rather than run
concurrently. The first touches root, Desktop, Web and Service composition; Product facts touches
Service/contracts/Web projection; Host isolation touches Desktop/contracts/Service health.
Sequential review makes their shared composition files unambiguous. At T2 exit, the first Product
journey has one writer, the old
execution route is unreachable, and the real Host can be killed and restarted, but Product Service
may still physically contain only the pre-enumerated mixed Pi dependency and donor-code debt. No
Pi acceptance or runtime-journey claim is permitted.

The Agent/Chat workbench then consumes only the T2 Product read model. Functional icon and product
identity wiring is incorporated into the source-closure Work; the maintainer has since locked the
existing OmniMind icon, colors, generation chain and platform outputs. T3 owns only material UI
surgery, not brand replacement or a final-palette exercise. It preserves a comparable baseline and
obtains same-state visual calibration before deleting an old interaction anchor. Renewed behavior
and visual proof follows surgery before deletion.

Pi adoption must extend the same Host executable identity, endpoint family, authentication,
supervisor, health and shutdown contract. Queryable Pi acceptance is its first falsifier. Only after
the real replacement journey and fault matrix pass may the authority-retirement Work remove old
execution domains and dependency debt. The two T4 Works form one checkpoint: the first cannot be
promoted while duplicate physical authority remains, and the second cannot delete before the first
has supplied normal, failure and recovery proof.

The frozen-candidate Work begins only after every implementation handoff has a current independent
review and any required visual calibration is recorded. It runs current-candidate gates on one SHA,
keeps historical T0 object evidence tied to its source SHA, and hands the immutable candidate to
Finish. A content change after freezing invalidates the candidate evidence and returns to the owning
Work; it is not repaired by widening the gate or repeating an unchanged T0 probe.

### Path ownership and intentional succession

- `apps/web` is first moved under final identity, then receives typed Product projection, T3 UI surgery,
  real T4 facts and finally raw-path deletion. Those are ordered ownership transfers, not parallel
  edits.
- `apps/service` is first moved, then receives Product single-writer state, the Host client, real
  dispatch reconciliation and finally old-authority deletion. Product-fact paths and old Engine
  paths must remain distinguishable throughout.
- `architecture/execution.md` first confirms `apps/native-host` as the physical executable workspace
  for its already approved isolated Native Host responsibility. That confirmation is owned by the
  Pi-free Host Work and is limited to placement, build target, separate Desktop supervision and the
  direct Product Service client relationship; it does not change product objects, process authority
  or topology direction.
- Only after that durable owner confirmation, `apps/native-host` is created once by the Pi-free Host
  Work and extended in place by the Pi Work. The Host handoff and reviews must prove that the owner,
  actual development and packaged process trees, and T2-to-T4 continuity agree. No later Work may
  create a second executable or transport.
- `packages/contracts` uses responsibility-scoped subpaths. Product contracts, Desktop IPC and Host
  ingress may share package metadata, so their Works are sequenced and each review checks that no
  catch-all barrel reappears.
- Root lock/build/source/adoption files are changed only by the source-closure Work and, for
  dependency deletion, the authority-retirement Work. Candidate freezing verifies them but does not
  redesign them.

## Requirement coverage

| Approved requirement or carried finding | Owning work |
| --- | --- |
| R1 immutable T0 evidence | Runnable source closure; frozen candidate |
| R2 runnable tracked dependency closure | Runnable source closure |
| R3 authorized assets, generated source and notices | Runnable source closure; frozen candidate |
| R4 single production-adoption disclosure | Runnable source closure; authority retirement verification |
| R5 Product facts, atomic outbox, single writer and typed ingress | Product facts and typed ingress; Pi native execution for real acceptance proof |
| R6 independent health and real Pi-free Host | Isolated Host boundary |
| R7 approved `Agent | Chat` mother | Agent and Chat workbench |
| R8 same Host boundary and Pi-native authority | Pi native execution; authority retirement |
| R9 truthful uncertainty and controls | Product facts and typed ingress; Pi native execution; frozen candidate fault gate |
| R10 old authority deletion after replacement | Authority retirement |
| R11 mature non-Engine behavior remains in lineage | Runnable source closure; Product facts; Agent and Chat workbench; authority retirement |
| R12 same-SHA bounded candidate verification | Frozen candidate |
| Final public-surface calibration: canonical inactive origin, capability lineage, truthful gating and separate trust boundaries | Runnable source closure |
| A-01 exact T1 scan truth | Runnable source closure |
| A-02 queryable acceptance before destructive deletion | Pi native execution; authority retirement |
| A-03 calibrated functional icons, locked brand wiring and final same-state UI verification | Runnable source closure; Agent and Chat workbench |
| A-04 historical T0 versus current candidate SHA | Runnable source closure; frozen candidate |

Every Concept below also contains a reverse trace to one or more approved requirements or Design
decisions. No Work exists only for workflow symmetry.

## Completion boundary

This work map is complete only when all implementation Concepts have linked handoffs and current
independent reviews, the maintainer has accepted every required same-state visual calibration, the
old execution authority and second-path scans are green, and the frozen-candidate Work has verified
one clean immutable SHA. Finish may then land that same reviewed commit and archive the Bundle.

This outcome is the first UI-chassis/Pi-native vertical-slice candidate, not OmniMind V1 completion.
It does not prove all Packages, Remote, external Engines, Windows/Linux packaging, installation,
updates or Campaign claims F-03 through F-18. Producers may submit affected claims only as
`candidate`; independent Campaign verification remains separate.
