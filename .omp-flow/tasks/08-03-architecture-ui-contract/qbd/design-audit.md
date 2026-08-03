---
type: "QbD Audit"
title: "QbD 1: Authority graph and UI-contract preservation"
entry: "../design.md"
verdict: "FAIL"
actor_id: "architecture_doc_qbd_1"
dispatch_receipt: "d5cefba709ee4b73ad23855653a369ff"
predecessor_receipt: "bf6f8fae21894e7bacd61d2dbfa66515"
---

# QbD 1: Authority graph and UI-contract preservation

This is an independent challenge of the accepted [Design](../design.md), its
[PRD](../prd.md), and the repository owners they cite. The audit used repository files only. It
did not modify product, governance, source, architecture, research, execution, Campaign, or tool
configuration files.

## Verdict

**FAIL.** The owner-and-reference model is directionally sound, all bounded local Markdown links
resolve, and the Queue transfer boundary is coherent. However, three unresolved blocking findings
remain:

1. Workbench is not yet the sole complete UI contract it claims to be; approved Package,
   provenance, permission, and external-Engine behaviors remain normative only outside it.
2. `AGENTS.md` and `execution-brief.md` still act as imperative product/architecture owners,
   including a competing physical topology and product-entity list.
3. AC-10 requires a full gate that demonstrably cannot pass while the exact provenance baseline is
   preserved under the current identity/structure policy.

The first two findings can authorize destructive divergence by a fresh implementer. The third
makes a required exit path unrealizable without either an unapproved governance change, deletion
or mutation of the fixed baseline, or a deliberate change to the acceptance criterion. Feature
gating, hiding a surface, or merely labelling it unavailable does not close these findings.

This verdict is advice to the human calibrator. It authorizes no repair, decomposition, Campaign
transition, or re-audit by itself.

## Audit identity and scope

- Entry: [Authority graph and UI-contract preservation design](../design.md)
- Requirements: [Document authority and UI-contract preservation PRD](../prd.md)
- Selected evidence: [document audit](../research/document-audit.md),
  [source review](../../../../research/source-review.md), and
  [decision record](../../../../research/decision-record.md)
- Promised output: `qbd/design-audit.md`
- Actor: `architecture_doc_qbd_1`
- Dispatch receipt: `d5cefba709ee4b73ad23855653a369ff`
- Completed predecessor receipt: `bf6f8fae21894e7bacd61d2dbfa66515`

The counter-cases tested were missing approved UI behavior, competing fact authority, misleading
routes, current-versus-superseded language, unwired-source deletion authority, hidden Runtime /
Package / process-topology changes, stale next actions, durable naming ambiguity, and acceptance
criteria without executable proof.

## Blocking findings

### F-01 — FAIL: the declared complete UI owner omits approved user-visible contracts

**Cause and evidence.** The Design says the root contains only a UI summary and that
[Workbench](../../../../architecture/workbench.md) owns complete UI behavior (Design lines 44-69).
Workbench does contain all eleven preservation families enumerated by the Design at a high level,
but its Package contract is only the three-line `Models / Agents / Packages` Settings taxonomy
(Workbench lines 182-190). Its explicit protected-domain list does not preserve a Package catalog,
compatibility presentation, install/activation/update/fault path, onboarding, provenance display,
or enforcement-source presentation (Workbench lines 221-256).

Those are not speculative additions:

- The root constitution makes Package distribution a core product surface and normatively defines
  `Catalog / Curated / Verified`, `Native / Bridged UI / PTY / Unsupported`, compatibility-report
  content, immutable activation, LKG rollback, and Package failure behavior
  ([README](../../../../README.md), lines 160-190 and 300-311).
- The root also requires first-run Pi disclosure, real Engine source in the selector, Pi truth on
  the Package page, and source/version disclosure in About, Licenses, and diagnostics (README
  lines 217-226).
- Permission policy and actual `host-enforced / engine-enforced / mixed / unverified` enforcement
  must be shown separately, not reduced to generic “permission truth”
  ([Product State](../../../../architecture/product-state.md), lines 89-92; README lines 262-271).
- The active Campaign treats these as required product outcomes in F-11, F-12, F-13, and F-16
  ([Campaign](../../../../missions/independent-omnimind-v1.md), lines 157-162), rather than optional
  craft detail.
- The fixed mother already has a distinct `/plugins` route and route-level plugin/skill discovery
  screen ([route registration](../../../../vendor/ui/apps/web/src/routes/_chat.plugins.tsx), lines
  1-11; [route tree](../../../../vendor/ui/apps/web/src/routeTree.gen.ts), lines 11-49;
  [PluginLibrary](../../../../vendor/ui/apps/web/src/components/PluginLibrary.tsx), lines 1-76).
  The current contract never classifies that physical surface as the Package-catalog lineage to
  preserve/adapt or as an expressly superseded source domain.

**Concrete consequence.** A fresh worker can follow the mandatory Workbench route, retain the word
`Packages` in Settings, delete the fixed `/plugins` mother surface as donor Provider ontology, and
still satisfy every proposed Package/UI sentinel. The product would later have to redraw its core
Package discovery and trust surface, contrary to complete-source parity and direct transplant.
The same loophole permits a UI that never distinguishes enforcement truth or Engine provenance
while the document validator remains green.

**Affected decisions.** PRD R2, R3, R7, and R9; AC-03, AC-07, and AC-09; Design components 1, 2,
and 5; the Workbench adoption/deletion gate.

**Smallest remedy.** Add only the missing user-visible consequences to Workbench, linking state and
process semantics back to Product State and Execution rather than copying their state machines.
At minimum, classify the fixed plugin/skill discovery surface; specify Package discovery, trust,
compatibility, activation/update/rollback and failure presentation; specify Pi/source disclosure;
and specify policy-versus-enforcement and external-Engine capability/no-fallback presentation.
Then extend R3's acceptance inventory and the bounded sentinel/semantic cases to cover these
families.

**Why safe degradation is insufficient.** A truthful `unavailable` state can defer Runtime wiring,
but it still needs a preserved surface, lineage, source/trust explanation, and re-entry path. Hiding
or deleting the domain removes a locked V1 product surface rather than safely degrading it.

### F-02 — FAIL: router/order documents are still competing architecture authorities

**Cause and evidence.** The PRD and Design assign `AGENTS.md` to routing/working rules and the
execution brief to construction order only (PRD lines 46-54; Design lines 83-94). The current files
do more:

- [`AGENTS.md`](../../../../AGENTS.md) calls itself the “Founding Agent Contract,” then states
  current product decisions and non-violable execution, Package, permission, IA, Settings,
  adoption, completion, and topology rules in imperative language (lines 27-74). It is therefore
  operationally authoritative to every fresh Agent despite saying that architecture owns those
  facts.
- [`execution-brief.md`](../../../../execution-brief.md) defines a “final physical boundary” with
  `apps/desktop` containing both renderer and Electron desktop host and no `apps/service` entry
  (lines 72-87). The architecture index separately presents `apps/desktop`, `apps/service`, and
  `apps/web` as the approximate target responsibility tree
  ([Architecture index](../../../../architecture/README.md), lines 58-84).
- The same execution brief mandates a product-entity list that includes `PackageGeneration` and a
  concrete Host shape (lines 113-139). Product State's owned product-object list does not define a
  `PackageGeneration` object and explicitly says responsibilities need not become independent
  aggregates, tables, or packages (Product State lines 25-35).

The duplication is not made safe by present agreement. `AGENTS.md` is read before topical owners,
and the execution brief is the mandatory next-work route. Neither the proposed validator nor the
Design's migration section removes or mechanically reconciles their duplicated contracts.

**Concrete consequence.** A fresh implementer can choose the imperative physical tree/entity list
from the execution brief over the architecture owners, collapse or omit the Product Service entry,
or materialize a premature `PackageGeneration` aggregate. A later architecture correction can
remain ineffective because an older command in `AGENTS.md` still constrains work. This is exactly
the two-plausible-authorities condition that the owner graph claims to eliminate.

**Affected decisions.** PRD R1, R5, and R6; AC-01 and AC-06; Design authority interface and fresh
implementation flow.

**Smallest remedy.** Keep operational safety and routing in `AGENTS.md`, but replace duplicated
product decisions with owner links plus narrow fail-closed instructions. Keep sequencing and stop
conditions in the execution brief, but move the effective physical topology to Execution and any
durable product object to Product State; the brief should refer to those owner sections instead of
declaring a final tree or entity set. Reconcile the `apps/desktop` / `apps/service` / `apps/web`
shape at its one owner.

**Why safe degradation is insufficient.** These files cannot be hidden or marked unavailable:
repository instructions require every Agent to read them. Leaving them as “mirrors” without a
declared and verified reconciliation mechanism preserves the competing authority.

### F-03 — FAIL: AC-10's required candidate gate is not executable on the preserved baseline

**Cause and evidence.** Design lines 324-338 and AC-10 require one `npm run quality` on the frozen
documentation candidate while also forbidding mutation of the imported baseline. The command was
run against the audited repository. It stopped at `check:identity` with:

```text
identity check failed with 16066 finding(s)
```

The failures are structural and identity findings throughout `vendor/ui`, including the
unapproved `vendor` author root, donor names in the exact tree, and generated output. This follows
from the current policy: the root `structure-policy` does not admit `vendor` as an author root
(README lines 365-385), while `scanStructure` applies author-root and forbidden-name rules to the
repository inventory and the gate fails on every finding
([identity policy](../../../../scripts/identity.mjs);
[quality entry](../../../../scripts/check-identity.mjs)). At the same time, README's
`source-adoptions` and the Design require the exact `vendor/ui` provenance baseline to remain
unchanged.

**Concrete consequence.** A later documentation implementer cannot meet AC-10 within the approved
document/check scope. It must either change governance/tool policy, mutate or delete the exact
baseline, or report a failing required gate. Therefore the Design exit claim that every acceptance
criterion has a proof path is false even before the proposed document validator is written.

**Affected decisions.** AC-10; Design focused implementation checks and migration constraints; the
fixed-source preservation boundary.

**Smallest remedy.** Choose and design one coherent gate boundary. Either add an explicit bounded
governance change that treats an exact adopted `vendor` tree as provenance evidence rather than
production author structure while continuing to validate adoption, rights, exactness, and leakage
into production/generated surfaces; or make the documentation candidate use a focused document
gate and defer the production identity/structure total gate until the transplanted candidate has
actually left the donor boundary. Clear or deliberately classify ignored generated artifacts so
the same command has stable semantics.

**Why safe degradation is insufficient.** Waiving or ignoring a required red gate supplies no
evidence. Deleting the source to make the gate green destroys the very baseline this task is meant
to protect.

## Material missing evidence

### E-01 — NEEDS_EVIDENCE: design-stage scope attribution is not recoverable from repository state

AC-10 and Design lines 318-322 require proof that the architect diff was confined to Bundle paths.
The audited worktree contains tracked modifications to `AGENTS.md`, `README.md`,
`execution-brief.md`, the Campaign, identity/test code, and untracked architecture/research/Bundle
paths. The repository contains no task-start SHA, actor patch, or linked handoff that can attribute
those changes to or exclude them from the architect operation. The runtime receipt is intentionally
not copied into the Bundle, while this audit is explicitly constrained to repository evidence.

This is material because the criterion is meant to exclude hidden product/governance mutation.
The smallest evidence remedy is an immutable base SHA plus an actor-scoped changed-path/diff
receipt that the QbD reviewer is authorized to read, or a clean committed predecessor from which
the Bundle-only patch is directly derivable. A prose assertion of output ownership is not the same
proof. This missing evidence does not supersede the three FAIL findings above.

## Advisory observations

### A-01 — stale next-action wording can cause prohibited re-probing

The fixed-source review already records passing install, build, typecheck, and unchanged desktop
smoke evidence, including the limits of that smoke
([source review](../../../../research/source-review.md), lines 70-90). README still says the first
next step is to complete unchanged desktop launch/smoke, and the Campaign repeats it (README lines
415-426; Campaign lines 172-179). The research rules forbid repeating the same probe without a new
falsifier. The route should state the exact missing act—such as independent evidence review,
candidate promotion, or a still-unproved platform/package path—rather than inviting the same smoke
run again. This is currently wasteful and potentially looping, but not itself destructive enough
to change the verdict.

### A-02 — mandatory read order is inconsistent

`AGENTS.md` routes a fresh worker through the Campaign before conditional research, matching PRD
R6. The Campaign's own Authority section places research before Campaign status (Campaign lines
23-33). All paths exist and scopes are described, so this is not a broken link, but the declared
single route is not singular. Use one order everywhere or state explicitly that authority is
independent of read order.

## Counter-case results

| Counter-case | Result | Evidence |
| --- | --- | --- |
| Doctrine, architecture/UI, evidence, order, and status owners can be found | PASS with blocking qualification | Root and both indexes expose the five classes, but F-02 shows router/order files still own duplicated facts |
| Canonical repository-local Markdown routes resolve | PASS | A bounded resolver checked 17 routed/owner/Bundle Markdown files and found `missing=0` |
| PRD R3's named preservation rows have Workbench anchors | PASS mechanically, FAIL semantically | Agent/Chat, shared grammar, rows, Queue, child, workbench/viewers, Settings, visual, performance, locale/access, and deletion gates all have text anchors; F-01 identifies approved families omitted by R3 itself |
| High-risk Settings and hierarchy language is singular and current | PASS | `Models / Agents / Packages`, `Agent | Chat`, and Projects above Groups are affirmative in Workbench; `Pi / Engines` and `Groups | Projects` occur only in explicit rejection/superseded history outside the fixed source |
| Queue handoff and unknown delivery agree | PASS | Workbench lines 108-125, Product State lines 54-63 and 77-87, and Execution lines 15-24/42-53 agree on editable pre-dispatch intent, Run/receipt conversion, Engine-owned accepted operations, `delivery_unknown`, and no blind replay |
| Fixed-source evidence stays non-normative and records limitations | PASS | Source review pins revision/tree, rights, build/test/smoke observations, unsupported Host UI APIs, compatibility classes, and revalidation triggers while explicitly denying production authority |
| A thin-shell rewrite or deletion of an unwired protected domain is impossible to justify | FAIL | Workbench protects many mother domains, but F-01 leaves the Package discovery/trust surface outside its complete owner and sentinel coverage |
| Runtime, Package, and process topology remain unchanged by order/routing documents | FAIL | F-02 identifies a final physical tree, `PackageGeneration`, and Host shape in the execution brief plus duplicated imperative contracts in `AGENTS.md` |
| Every acceptance criterion has an executable proof path | FAIL | Focused link/sentinel fixtures are designable, but F-03 makes the mandatory full gate impossible and E-01 leaves design-stage mutation attribution unavailable |

## Acceptance-criterion judgment

| Criterion | QbD judgment | Reason |
| --- | --- | --- |
| AC-01 | FAIL | `AGENTS.md` and the execution brief remain plausible owners for facts assigned elsewhere |
| AC-02 | PASS | Mandatory UI routing reaches Workbench and every bounded local Markdown link resolves |
| AC-03 | FAIL | R3's own rows are anchored, but approved Package/provenance/enforcement behaviors remain outside Workbench |
| AC-04 | PASS | No simultaneous current `Pi / Engines` or reversed Groups/Projects decision was found |
| AC-05 | PASS | Queue admission, acceptance, and unknown-delivery semantics align across all three owners |
| AC-06 | FAIL | The execution brief defines topology and entities rather than order only |
| AC-07 | PASS as a design-level proof path | Missing-owner, broken-route, and missing-sentinel fixtures are executable after the bounded validator is implemented; they do not close F-01 |
| AC-08 | PASS as a design-level proof path | The proposed implementation can remain bounded text/link inspection without parsing Markdown lifecycle state |
| AC-09 | FAIL | This independent audit found material findings |
| AC-10 | FAIL plus NEEDS_EVIDENCE | The required total gate currently fails by construction, and repository-only actor-diff attribution is unavailable |

## Human calibration options

Under the QbD semantics, the unchanged design cannot proceed to decomposition under an
accepted-risk label because the active scope still contains an incomplete sole-owner claim,
competing imperative authorities, and an unrealizable required gate. The human options are:

1. request the smallest documentation/governance repair described above and, after substantive
   change, request a scoped independent re-audit;
2. remove or safely narrow the affected claims and acceptance scope, then re-audit that narrower
   design;
3. defer or stop the task.

Any proposal to change the locked Package surface, the one-owner doctrine, or the exact-source
preservation boundary is a product-scope change and should return to Design rather than be hidden
inside implementation.
