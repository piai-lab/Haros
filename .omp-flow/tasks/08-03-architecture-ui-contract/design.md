---
type: "Design"
title: "Authority graph and UI-contract preservation design"
---

# Authority graph and UI-contract preservation design

This is the repaired design for the [PRD](prd.md), based on the selected
[document-authority synthesis](research/document-audit.md). The first design received an
independent [`FAIL`](qbd/design-audit.md). The human explicitly chose
[full repair followed by a scoped fresh QbD 1 audit](decisions/qbd-1-repair.md). The prior audit is
not superseded, softened or converted to approval; it remains the challenge record for the earlier
revision.

This design closes the findings at design level only. It does not edit product code, durable
owners, governance code, the exact source tree, Campaign state or tool configuration, and it does
not authorize implementation or decomposition.

## Repair delta

| Prior finding | Repaired design consequence |
| --- | --- |
| F-01: Workbench omitted approved Package, provenance, permission and external-Engine UI | Workbench's future required contract now includes onboarding, provenance, complete Models/Agents/Packages behavior, policy-versus-enforcement truth, capability/no-fallback behavior and exact plugin/skill source lineage |
| F-02: AGENTS and execution brief competed with architecture | AGENTS is reduced to routing/safety; the brief is reduced to order/gates; Execution becomes the sole detailed topology owner; Product State remains the sole product-object owner and no separate `PackageGeneration` aggregate is mandated |
| F-03: exact baseline made the total gate impossible | Exact provenance zones are derived from machine adoption entries, verified by immutable Git commit/tree objects and exempted only from production author/identity checks; rights, exactness and zone-external leakage remain mandatory |
| E-01: actor scope could not be reconstructed | This repair records the immutable repository base plus predecessor Bundle Git blob IDs and final actor path/blob evidence in [repair scope evidence](decisions/repair-scope-evidence.md); later implementation uses a committed base and candidate SHA |
| A-01: next action repeated completed smoke | Future README/execution/Campaign wording cites the recorded smoke and revalidation triggers, then routes to evidence review, domain mapping and Native Host work |
| A-02: read order differed | All routing declares README → involved architecture → execution → active Campaign → conditional research; authority remains independent of order |

## Design summary

The repository uses an owner-and-reference graph. A later or more frequently read file never
silently overrides an owner:

```text
AGENTS (routing + safety only)
      │
      v
README (doctrine + production adoption)
      │
      v
architecture index
      ├── workbench     complete user-visible contract
      ├── product-state product facts and product-object ownership
      └── execution     process and target-responsibility topology
      │
      ├── execution brief  order and stage gates only
      ├── active Campaign  status and evidence pointers only
      └── research         conditional fixed evidence and superseded reasoning
```

Mechanical regressions are caught by two bounded read-only governance components:

1. a document-contract validator for owners, links and high-consequence UI/interface anchors;
2. adoption/identity checks that treat only declared, exact Git subtrees as provenance evidence
   while continuing to scan production and generated surfaces outside those subtrees.

Neither mechanical layer declares semantic completeness. A fresh independent reviewer challenges
the full owner graph before the human decides whether decomposition may begin.

## Target owner repair

### 1. Root constitution and adoption disclosure

[`README.md`](../../../README.md) remains the product constitution and machine adoption owner. The
future repair keeps only product-level consequences and non-negotiable boundaries, then links to
the topical owner for detail.

It must not provide an exhaustive UI deletion list, a physical target tree or a product-object
catalog. Its process-topology section may state only constitutional invariants—native code outside
Desktop/renderer, Product versus Engine authority and external Engine independence—and must route
the exact topology to Execution.

The existing `source-adoptions` entry is extended in place rather than mirrored in another
manifest. For the exact `ui-mother` baseline it gains machine-verifiable provenance metadata:

```json
{
  "provenance": {
    "repositoryCommit": "2445acb987e443b44b7dc819de3de44c3d68b391",
    "trees": {
      "vendor/ui": "630f17e61abc478114bf83c1d740977c9f68b910"
    }
  }
}
```

The object is part of the existing adoption record. It does not create a second source registry.
An adoption without this complete metadata receives no exact-zone exemption.

The root current-next-action section is corrected to state that exact-tree comparison, install,
build, typecheck and unchanged macOS desktop smoke already exist as bounded evidence. It routes to
independent review of F-03/F-04 evidence and rights/assets gaps, UI domain mapping, then isolated
Native Host work. It names Source Review's revalidation triggers instead of demanding the same
probe again.

### 2. Architecture index

[`architecture/README.md`](../../../architecture/README.md) becomes a concise responsibility map:

- Workbench: complete user-visible behavior and source-domain preserve/adapt/delete gate;
- Product State: durable product facts, product-object catalog and Queue-to-Run transition;
- Execution: complete process topology, target responsibility tree and Engine boundaries.

The index may show relationships but does not carry a second detailed file tree or object list. A
reader opens every involved topical owner in full.

### 3. Future Workbench contract

[`architecture/workbench.md`](../../../architecture/workbench.md) remains the sole complete UI
owner. The future repair preserves every existing section and adds the missing consequences below.
Section names and ordering are editorial; the contract is identified by meaning, not headings.

#### 3.1 Onboarding

The first-run journey has five observable steps:

1. disclose that OmniMind is an independent product `Powered by Pi` and that Pi is the default
   bundled-native Engine;
2. explain the stable Agent/Chat distinction without presenting Remote or Package setup as a
   prerequisite;
3. connect a supported Provider/Model or select a supported local route using real runtime
   capability and authentication state;
4. explain that user permission policy and actual enforcement are separate facts before the first
   material file/command action;
5. land in a usable Chat or an accurate no-Model/no-runtime state with a Settings/retry path.

Cancel, auth expiry, offline, missing runtime, no compatible Model and version mismatch preserve
user progress. Onboarding may be postponed; postponement does not fabricate readiness or block
read-only access to existing Conversations. It never implies that all Packages are safe or that
all Engines share Pi capabilities.

#### 3.2 Provenance presentation

Source truth appears where it changes user understanding:

- Composer/Engine selector: real source and availability for the next Run;
- Package detail: source, rights, exact artifact and the fact that native Packages run in Pi;
- Agent detail: implementation/source, version, protocol and capability evidence;
- About, Licenses and diagnostics: complete product/runtime versions, upstream attribution and
  evidence quality.

Ordinary Conversation rows do not repeat brand badges. Missing or unverifiable source/version is
shown as unknown/unverified, never inferred from a display name. Diagnostics may be detailed; the
default view remains calm.

#### 3.3 Settings › Models

Models presents runtime-backed connections, Providers, Models, Thinking/Reasoning choices,
authentication and health. It supports connect, re-authenticate, disconnect where safe, select for
the next Run and open diagnostics.

The UI distinguishes:

- authenticated, expired, unavailable and misconfigured connection;
- available, temporarily unavailable and unsupported Model;
- supported, unsupported and unknown Thinking level;
- requested next-Run choice from the actual choice frozen into a current Run receipt.

No static product catalog silently outranks the runtime. Changing a selection follows the existing
no-confirmation/no-Toast/no-Timeline next-Run rule.

#### 3.4 Settings › Agents

Agents separates the bundled native Agent from installed/connected external Agents without
claiming parity. Each detail can show source, version, status, protocol, Model/session constraints,
capabilities, permission policy, enforcement source and diagnostics.

Capability presentation is positive and negative. At minimum, next-Run support for Thinking,
structured questions, queue/steer/follow-up/cancel, Package integration, files/write, Terminal and
namespaced UI can be `available`, `unavailable`, `unsupported`, `degraded` or `unknown`, with an
evidence/reason detail. Missing process, offline connection, protocol mismatch and version mismatch
have distinct recovery paths.

#### 3.5 Settings › Packages

Packages is a full product surface rather than a label. It supports:

- Catalog/Curated/Verified discovery and search;
- source, rights, publisher, exact artifact digest, release time and verification generation;
- Native/Bridged UI/PTY/Unsupported compatibility with Pi/Node/platform/UI requirements;
- install-script, native dependency, network/file/command permission and private-state review;
- install/stage, approve, activate at a safe boundary, inspect active lease, update, retry and
  rollback to LKG;
- contained Skill/Extension capability detail, License and last verification evidence;
- loading/install/update/fault diagnostics.

`Catalog` is not trust. `Curated` and `Verified` describe recorded review, never a sandbox. An
Unsupported Package is refused before activation with the concrete reason. A staged failure leaves
the current generation intact. Active Runs keep their leased generation; no hot replacement occurs.
A fault stops new leases and exposes recovery/LKG status without claiming that process isolation
blocked filesystem or network effects.

Package private state and loading lifecycle remain native-runtime facts. Workbench projects them
through Product State/Execution interfaces; it does not define a competing loader or state store.

#### 3.6 Permission policy versus enforcement truth

Where permission affects a Run, Agent, Package or material action, the UI keeps two fields separate:

| User policy | Meaning |
| --- | --- |
| `Approval required` | ask before the covered action |
| `Auto` | follow the configured automatic policy |
| `Full access` | user policy permits broad action; this is not a sandbox claim |

| Enforcement source | Meaning |
| --- | --- |
| `host-enforced` | a tested host path denied the disallowed effect |
| `engine-enforced` | the Engine contract enforces it and host enforcement is absent |
| `mixed` | responsibility is split and the detail identifies which side enforces what |
| `unverified` | the product cannot prove enforcement; it must not imply containment |

The enforcement label is derived from actual call paths and deny-side-effect evidence, not
renderer input, protocol names or process isolation. A denied action, approval cancellation and
post-dispatch uncertainty use their distinct existing receipt semantics.

#### 3.7 External Engine capability and no fallback

The Engine selector and relevant controls use real capability data. Unsupported controls are
hidden only when omission cannot mislead; otherwise they appear disabled/unavailable with reason.
Engine-specific capabilities use namespaced typed presentation and do not become generic core
fields merely to imitate parity.

Before acceptance, if the chosen Engine or Model becomes unavailable:

- no Run is dispatched under another source;
- the input, resources and explicit selection remain recoverable;
- the UI explains what failed and lets the user retry or deliberately choose another source.

After dispatch, uncertainty follows `delivery_unknown`/`outcome_unknown`; the item is not blindly
replayed through Pi. Returning to Pi after another Engine uses the existing lineage rule and never
silently resumes a stale divergent Session.

#### 3.8 Fixed plugin/skill source lineage

The exact mother contains a protected discovery domain at:

```text
vendor/ui/apps/web/src/routes/_chat.plugins.tsx
vendor/ui/apps/web/src/routeTree.gen.ts                  (/plugins registration)
vendor/ui/apps/web/src/components/PluginLibrary.tsx
```

The lineage preserves browse/search, plugin-versus-skill distinction where meaningful,
installed/enabled presentation, capability-driven availability, loading/empty/error states,
source/marketplace failures and skill working-directory constraints. The product mapping is:

```text
donor /plugins discovery
  -> Settings › Packages discovery/trust/compatibility/activation
  -> Package detail for contained Skills/Extensions and source evidence
  -> Settings › Agents for Engine discovery capability truth
  -> Composer for enabled Skill use where the Engine actually supports it
```

Donor provider tabs, branding, `Plugin` as the permanent generic package name and provider-specific
wire APIs are not protected ontology. They may be replaced only after the mapped behavior has a
direct transplant or explicit replacement, normal/failure proof and the applicable same-state
visual review. Until then the domain may be truthfully unavailable but cannot be deleted.

#### 3.9 Workbench completion delta

The existing Workbench completion gate is extended so UI preservation cannot pass unless:

- onboarding and provenance normal/failure/re-entry paths are present;
- Models, Agents and Packages expose the behavior above;
- permission policy and enforcement truth are visibly separate;
- external capability differences and no-fallback behavior are proved;
- the plugin/skill lineage has source anchors and a mapped destination;
- absence of wiring produces truthful unavailable states without deleting the domain.

These are UI consequences only. Persistent facts remain Product State-owned and process behavior
remains Execution-owned.

### 4. Product State owner

[`architecture/product-state.md`](../../../architecture/product-state.md) is the only product fact
and product-object catalog. Its durable objects remain:

```text
Workspace
Conversation
Entry
Run
EngineBinding
ResourceRef
OperationReceipt
```

Package source, rights, trust, exact artifact, compatibility report, current/LKG generation and
leases remain Product responsibilities in the authority table. They do not require a new public
aggregate. A Package generation is frozen data in activation/lease and Run receipts, not a
separately mandated `PackageGeneration` object. If future implementation evidence proves a new
aggregate is necessary, Product State—not the execution brief—must make that architecture change.

Product State also remains the sole owner of permission policy/enforcement facts and the
Queue-to-Run transfer. Workbench describes their visible consequences; it does not duplicate their
transition model.

### 5. Execution owner

[`architecture/execution.md`](../../../architecture/execution.md) becomes the sole detailed owner
of both process topology and target responsibility layout:

```text
apps/web       Renderer / Product UI
    │ typed commands and view models
apps/desktop   Desktop Host: windows, menu, keychain, notifications, supervision
    │
apps/service   Product Service: product facts, outbox, projection, system capabilities
    ├── isolated Native Host worker(s): native SDK, Session, Package code
    └── External Engine process/connection(s): ACP or official thin protocol
```

The names express target responsibilities, not a command to manufacture empty directories.
Shared `packages/` appear only for real reusable responsibilities. Execution retains the detailed
Host isolation, failure boundary, typed ingress and external Gateway contract. Architecture index
and root may summarize; no other file owns an alternative physical tree.

### 6. AGENTS routing and safety

[`AGENTS.md`](../../../AGENTS.md) is replaced in place with only:

- the single mandatory read order;
- task-to-topic routing (UI → Workbench, facts → Product State, processes → Execution, fixed-source
  questions → Research);
- fail-closed behavior when owner documents conflict or intent is not uniquely recoverable;
- operational safety: preserve unknown changes, bounded/destructive action rules, secret handling,
  focused-versus-final verification, Campaign producer limits and Git history safety.

It removes `当前裁决`, `不可违反的工程边界`, `来源与 UI 接管`, product naming/structure,
product completeness and process/package rules as local contracts. It may link to those owner
sections and state “do not proceed when the owner is missing”; it may not restate their decisions.

### 7. Execution brief

[`execution-brief.md`](../../../execution-brief.md) retains only sequence, entry conditions, stop
conditions, proof required at each stage and the current next action. It links to Workbench,
Product State and Execution for what the product/process must be.

It removes:

- `最终物理边界` and any replacement file tree;
- `先建立的产品事实` and the `PackageGeneration` entity list;
- concrete Host/product semantics already owned by architecture;
- current facts that belong in Source Review or Campaign status.

Stage text may say “establish the Execution-owned Native Host boundary” or “implement the
Product-State-owned Queue transfer”; it may not redefine either. The current stage acknowledges
the existing baseline evidence and does not re-run unchanged smoke absent a revalidation trigger.

### 8. Campaign and research

The active Campaign keeps claims, status, evidence references and blockers only. Its authority/read
section adopts the single route and its next-action section matches README/execution without
restating architecture. Existing F-03/F-04 evidence is reviewed; no status is promoted by this
design.

Research remains unchanged unless new evidence appears. Source Review already owns exact revision,
tree comparison, rights, build/test/smoke results, limitations and revalidation triggers. The
future document repair cites it rather than copying or re-running it.

## Governance interfaces

### Document-contract validator

A later approved implementation adds:

```text
scripts/document-contract.mjs
test/document-contract.test.mjs
```

with the narrow public shape:

```text
validateDocumentContract({ root, read }) -> Finding[]

Finding = {
  rule: stable rule name,
  path: repository-relative path,
  message: concise failure explanation
}
```

It checks only bounded owner/routing files and ordinary Markdown links/text. Its coverage families
are:

| Family | Minimum protected consequence |
| --- | --- |
| Owner graph | Root, architecture, evidence, order, Campaign and routing/safety scopes remain singular |
| Read route | README → involved architecture → execution → active Campaign → conditional research |
| Product entry | `Agent | Chat`, Projects above Groups, location/write distinction |
| Shared work | Composer, Queue, Timeline, Activity, structured Question and child UI |
| Workbench | files/viewers/Diff/Terminal/Git/PR/Kanban/Automations and failure behavior |
| Onboarding/provenance | Powered by Pi disclosure, real Engine source, Package runtime source, About/Licenses/diagnostics |
| Models | connections, Provider/Model/Thinking/auth availability and failures |
| Agents | native/external source, version, capabilities, permissions and diagnostics |
| Packages | tiers, compatibility, exact artifact, trust, install/activate/update/LKG/fault behavior |
| Permission | policy labels separate from four enforcement-source labels |
| External Engine | capability difference plus explicit no-silent-fallback behavior |
| Plugin/skill lineage | all three fixed source anchors plus Workbench preserve/adapt mapping |
| Queue boundary | editable intent → Run/receipt → Engine operation; unknown delivery has no blind replay |
| Quality | stream/scroll/bounded DOM, bilingual/CJK/IME, keyboard/screen reader/reduced motion |
| Adoption/deletion | source anchor, direct transplant/replacement proof, unavailable state and deletion gate |

Sentinels are stable term groups, not exact paragraphs. Fixtures remove or contradict one family at
a time and expect a stable rule/path. The validator does not parse frontmatter, heading number,
heading order, index order, verdict or Campaign status as machine state; it generates no manifest.

### Exact provenance-zone interface

The source/identity implementation consumes the existing parsed adoption entries. For each entry:

```text
if provenance.repositoryCommit and provenance.trees[path] both exist:
    path is an exact provenance root
else:
    path receives no provenance-zone exemption
```

Validation rules are exact:

1. every `trees` key equals one normalized entry in that adoption's `paths`;
2. every path is repository-relative, non-root, non-overlapping and non-nested across all exact
   zones;
3. the repository commit exists and `commit:path` resolves to the declared tree OID;
4. the candidate commit resolves the same path to the same tree OID;
5. the working repository inventory has no non-ignored added/deleted path under the zone;
6. ordinary adoption fields and every tracked legal text still validate;
7. a `vendor/` path not covered by one exact zone is ordinary repository content and fails the
   current unapproved-author-root rule unless separately designed as production structure.

Production scanning partitions repository content without overlap:

| Partition | Structure/name scan | Donor identity path/text scan | Exactness/rights scan |
| --- | --- | --- | --- |
| Declared exact provenance root | no | no | yes, mandatory |
| Configured `toolRoots` | no | no; installed workflow content is not product | no adoption privilege |
| README, `LICENSES/`, `research/` evidence | normal applicable structure | narrow identity evidence exception | adoption/legal checks where applicable |
| All other author source | yes | yes | n/a |
| Generated output outside exact/tool roots | applicable generated classification | yes | n/a |

Ignored dependencies such as `node_modules` remain dependency exclusions. Build/generated output
inside an exact provenance root inherits non-production provenance classification and is not used
as product cleanliness evidence. Non-ignored unexpected files inside the root fail the working
inventory exactness check. Generated output outside exact/tool roots remains scanned even when Git
ignores it.

This replaces the current accidental behavior in which `classifyPath("vendor/…")` labels content
metadata while `scanStructure` still rejects it. No hard-coded `vendor` skip is introduced.

## Authority interfaces

| Producer | Consumer | Valid interface | Invalid flow |
| --- | --- | --- | --- |
| README | All work | Doctrine, adoption records and owner links | Root summary used as detailed UI/topology/object owner |
| Architecture index | Implementer/reviewer | Topic map | Parallel file tree or object catalog |
| Workbench | UI/source surgery | Complete visible behavior, lineage and completion gate | Runtime convenience deletes an unwired domain |
| Product State | UI/Control Plane | Product facts, objects, Queue transition and permission truth | Execution brief invents entities or UI owns Engine facts |
| Execution | Hosts/UI projection | Complete topology, accepted-operation authority, typed process boundaries | AGENTS/brief defines another tree or renderer consumes raw wire |
| Research | Maintainer/architecture change | Provenance, limitations, counterevidence and triggers | Evidence silently becomes current design |
| Execution brief | Implementer | Ordered references and stage gates | Order text creates architecture |
| Campaign | Reviewer/maintainer | Status and evidence pointers | Status defines requirements or topology |
| AGENTS | Every Agent | Routing, ambiguity stop and operational safety | Product doctrine or package/UI contract duplication |
| Validators | Developer/CI | Precise read-only findings | Green output claims semantic/product completion |

## Data and decision flows

### Fresh task route

```text
AGENTS task classification
  -> README doctrine/adoption
  -> architecture index + every involved topic owner in full
  -> execution brief for current order
  -> active Campaign for status only
  -> research only for provenance, prior decision or possible falsifier
  -> bounded work and proof
```

If intent is still ambiguous or two owners conflict, product work stops and the owner graph is
repaired first. Sequence does not grant authority.

### UI source-domain adoption

```text
exact declared source root
  -> source-domain anchor (including plugin/skill discovery)
  -> direct transplant or explicit behavior replacement
  -> typed Product State / Execution integration
  -> normal + failure + recovery behavior proof
  -> same-state visual review and human gate where material
  -> renewed performance/accessibility proof
  -> delete only superseded donor route/ontology after mapped behavior survives
```

A truthful unavailable state preserves the destination, lineage and re-entry path. It is not
permission to delete the source domain.

### Package presentation flow

```text
native runtime/package evidence
  -> typed Execution fact
  -> Product-owned adoption/activation/receipt fact where needed
  -> Workbench Package/Agent/Composer projection
  -> user action through Product admission
  -> native lifecycle remains native authority
```

This flow keeps Workbench complete without making it a loader or private-state owner.

### Unavailable external Engine

```text
selected next-Run Engine becomes unavailable before acceptance
  -> no fallback dispatch
  -> retain input/resources/selection
  -> explicit reason + retry/change-source action

dispatch certainty lost after acceptance boundary
  -> delivery_unknown/outcome_unknown
  -> no automatic replay through any Engine
```

### Documentation/governance repair

```text
committed immutable repair base
  -> edit only approved owners/checks
  -> focused document/source/identity fixtures
  -> candidate commit
  -> immutable changed-path + exact-tree proof
  -> git diff --check
  -> clean candidate worktree
  -> one npm run quality on that candidate SHA
  -> independent scoped QbD / review as required
```

## State ownership

This design adds no runtime or product persistence.

- Markdown owners keep authored doctrine, contract, evidence, order or status according to their
  role.
- `source-adoptions` remains the single adoption disclosure; provenance metadata points to
  immutable Git objects and is not a mutable runtime state.
- Validators compute findings in memory and write no generated registry.
- Tests use temporary fixtures/repositories and leave no repository artifacts.
- The Package/UI presentation consumes existing authority facts; it introduces no second loader,
  Package store, Engine session or queue.
- OMP-Flow receipts remain runtime data; the linked repair evidence records only repository proof
  needed by a repository-only auditor.

## Error behavior

### Missing owner, route or UI family

The document validator exits non-zero with stable rule, repository-relative owner path and concise
message. It does not create a replacement file or fall back to historical text. A sentinel change
requires semantic owner review before the fixture is updated.

### Competing authority

The semantic review reports both paths, the fact in conflict and the destructive consequence. The
sole owner and every affected route/summary are repaired together. File order is never a tie-break.

### Provenance metadata incomplete

The source gate fails closed. The path receives no identity/structure exemption. It does not infer
exactness from `vendor`, `mode: adapt`, `changes` prose or a remote URL.

### Exact provenance mismatch

Missing commit/tree, added/deleted/modified path, overlapping root or candidate tree mismatch fails
with adoption ID, path, expected tree and observed state. The gate never rewrites the subtree,
updates the expected tree or deletes legal/brand evidence automatically.

### Donor leakage outside exact roots

Identity scanning reports path/surface/rule without printing source text. A donor term in author or
generated output outside exact/tool/evidence boundaries fails even when the exact baseline itself
is valid.

### Tool-root content

Only roots explicitly declared by `structure-policy.toolRoots` receive tool content/path exemption.
This prevents installed workflow code from failing product naming rules while preventing arbitrary
dot directories from becoming an escape. A tool root cannot confer source adoption or product
authority.

### Package/Engine truth unavailable

Workbench shows `unknown`, `unverified`, `unsupported`, `degraded` or unavailable with source and
recovery detail as applicable. It does not synthesize a capability, trust level, enforcement source
or fallback result.

### Source evidence changes

Only the affected research conclusion is revalidated when a listed trigger changes. Accepted
architecture stays current until new evidence actually falsifies it and a human-approved design
change updates the owner.

## Migration and compatibility

The repository has no external documentation or schema compatibility duty, so the later repair is
direct:

- remove duplicated product/architecture rules from AGENTS and execution brief; do not leave
  aliases or legacy sections;
- move the one detailed topology into Execution and keep only links/summaries elsewhere;
- remove the brief's product entity list; keep Product State's seven objects and Package
  responsibility wording;
- add missing visible behavior directly to Workbench, not to a parallel UI requirements file;
- extend the existing source-adoptions entry in place and update existing source/identity checks;
- preserve `vendor/ui`, legal text and Source Review unchanged;
- correct read order and next-action wording in place;
- add one document validator to the existing Node test/quality path, not a parallel command.

No compatibility wrapper, generated manifest, second adoption registry, source copy, topology file
or UI ledger is introduced.

## Approved later implementation scope

After a fresh QbD 1 human approval, the documentation/governance repair may change only:

```text
AGENTS.md
README.md
architecture/README.md
architecture/workbench.md
architecture/product-state.md
architecture/execution.md
execution-brief.md
missions/independent-omnimind-v1.md
scripts/document-contract.mjs
scripts/identity.mjs
scripts/check-identity.mjs
scripts/sources.mjs
scripts/check-sources.mjs
test/document-contract.test.mjs
test/quality.test.mjs
```

The implementation may use fewer paths. Any additional path requires a new bounded decision before
editing. `vendor/`, `apps/`, `packages/`, `research/`, `LICENSES/`, product configuration and tool
configuration are outside this candidate.

## Verification strategy

### Architect repair evidence

The [repair scope evidence](decisions/repair-scope-evidence.md) records:

- immutable repository base `2445acb987e443b44b7dc819de3de44c3d68b391`;
- predecessor Git blob IDs for every pre-repair Bundle file;
- actor ID/receipt and the only files this actor changed;
- final Git blob IDs and focused check results.

This makes the author revision reconstructable even though the Bundle was untracked at repository
HEAD. The design author does not use that evidence to pass QbD.

Focused design checks are:

1. resolve every repository-local Markdown link in this Bundle;
2. reject `TBD`, placeholder or unresolved-product-decision language in PRD/Design;
3. compare current Bundle blobs to the recorded predecessor blobs and verify only PRD, Design,
   index and repair-evidence Concept changed/appeared;
4. run `git diff --check --` on Bundle paths;
5. verify `git diff --quiet 2445acb987e443b44b7dc819de3de44c3d68b391 -- vendor/ui`.

No total quality gate is claimed for this architect-only repair; the known gate contradiction is
the thing the later approved governance implementation must repair.

### Focused implementation gates

On a later committed candidate, using task-specific variables:

```sh
OMNIMIND_REPAIR_BASE=<approved-40-character-base-sha>
OMNIMIND_REPAIR_CANDIDATE=<candidate-40-character-sha>

node --test test/document-contract.test.mjs test/quality.test.mjs
npm run check:sources
npm run check:identity
git diff --check "$OMNIMIND_REPAIR_BASE" "$OMNIMIND_REPAIR_CANDIDATE" --
git diff --name-only --diff-filter=ACDMRT \
  "$OMNIMIND_REPAIR_BASE" "$OMNIMIND_REPAIR_CANDIDATE" --
```

The changed-path output must be a subset of the approved list above. The focused fixtures must
prove all of these failures:

1. missing owner and broken local route;
2. missing onboarding, provenance, Settings, permission, no-fallback or plugin/skill family;
3. missing/altered baseline commit or tree OID;
4. changed, added or deleted file under `vendor/ui`;
5. undeclared `vendor/other` subtree;
6. donor identity in `apps/` author source and in generated output outside exact/tool roots;
7. toolRoots content is exempt from product path/text rules but cannot act as adoption evidence;
8. legal/research/disclosure evidence remains allowed;
9. real repository fixture passes all focused checks with the exact baseline preserved.

### Candidate final gate

After focused checks are green:

1. resolve candidate SHA and prove the worktree has no tracked or non-ignored untracked change;
2. verify the adoption checker resolves the candidate's `vendor/ui` tree to
   `630f17e61abc478114bf83c1d740977c9f68b910`;
3. inspect the immutable changed-path output against the allowlist;
4. run one `npm run quality` on that same candidate SHA.

`npm run quality` is required and designed to pass because source exactness and production
identity/structure are now complementary partitions. A green command applies only to the SHA where
it ran and promotes no Campaign claim by itself.

### Scoped independent QbD 1 re-audit

The next auditor receives this Design, the prior audit, human repair decision and repair-scope
evidence. It must:

1. trace every prior finding to an exact repair and acceptance proof;
2. compare the future Workbench requirements with all approved README/Campaign UI consequences;
3. verify Package/provenance/permission/external-Engine normal, failure and recovery completeness;
4. test that the three plugin/skill anchors cannot be deleted while checks remain green;
5. verify topology and objects have only the architecture owners;
6. challenge the declared-zone/tool-root partition for over-broad exemption and exactness gaps;
7. verify read order, next action and immutable path proof;
8. identify any acceptance criterion without an executable path.

The auditor is independent. Its verdict is advice; only a new recorded human decision can authorize
decomposition.

### Later product truth

Document/governance acceptance only establishes the preservation boundary. UI/product completion
still requires source-domain maps, real runtime behavior, Package and external-Engine scenarios,
deny-side-effect tests, fault/recovery tests, profiling, bilingual/accessibility proof and
same-state visual review at the applicable frozen SHA.

## Rejected alternatives

### Narrow or defer Package/UI scope

Rejected by the human decision. An unavailable state still needs lineage, source/trust truth and a
re-entry path; hiding the surface would preserve the original F-01.

### Leave AGENTS or execution as mirrors

Rejected because mandatory operational files remain plausible authorities even when called
summaries. They route/link; architecture owns the facts.

### Hard-code `vendor/` as ignored

Rejected because it hides undeclared source and proves neither exactness nor rights. Exemption is
derived only from a complete adoption entry bound to immutable Git trees.

### Add `vendor` to authorRoots

Rejected because an exact evidence baseline is not production author structure. This would allow
unreviewed donor trees and weaken leakage rules.

### Scan the exact baseline as production identity

Rejected because honest provenance necessarily contains donor names and legal history. Exactness,
rights and zone-external leakage are the correct controls.

### Waive the failing total gate

Rejected because a red required gate is not evidence. The source/identity partition is repaired so
the existing total gate becomes executable.

### A second UI/adoption/topology manifest

Rejected because it creates another owner. Workbench, source-adoptions and Execution are extended
in place.

### Make `PackageGeneration` a mandated aggregate

Rejected because generation is currently a value needed by activation/lease and Run receipts, not
an independently evidenced aggregate. Product State can revisit only after real implementation
pressure.

### Repeat unchanged desktop smoke

Rejected because Source Review already records its result and limitations. Re-run only when a
listed revision/artifact/toolchain/platform/protocol/Host trigger changes.

### Keyword checks as completion proof

Rejected because text can contain every token while remaining contradictory or incomplete.
Sentinels are deletion alarms; the fresh semantic review remains mandatory.

## Risks and controls

| Risk | Control | Residual risk |
| --- | --- | --- |
| Workbench becomes a second state machine while being made complete | Specify visible consequences only; link Product State and Execution facts | Implementation may still over-copy state detail; semantic review must reject it |
| Provenance metadata is edited to bless a changed donor tree | Immutable baseline commit/tree plus review of adoption change and exact source evidence | A deliberate malicious history rewrite is outside ordinary repository gates |
| Exact-zone exemption hides copied donor output | Exemption ends at declared path; scan all author/generated surfaces outside; reject undeclared vendor roots | Semantically copied but renamed code needs source review beyond identity tokens |
| ToolRoots becomes a generic escape | Only explicit configured roots; no adoption/product authority; outside roots scanned | A malicious tool can still affect local execution; this gate classifies repository authorship, not sandboxing |
| Sentinels make prose brittle | Consequence families and small term disjunctions; no heading schema | Intentional rewording requires fixture update plus semantic review |
| Fixed plugin route is preserved literally after ontology changes | Protect behavior/lineage, explicitly allow mapped destination and donor ontology deletion | Visual review must ensure the replacement retains quality, not just tokens |
| This Bundle is cited as durable truth | Repeated non-authoritative labels and owner links | Search may still surface it; implementation entry must always be architecture |
| Documentation candidate is reported as product completion | PRD R12, Campaign separation and later real proof | Review discipline remains necessary |

## Design exit

The repaired PRD and Design contain no placeholder, unresolved product choice or acceptance
criterion without a proof path. They explicitly carry the prior `FAIL` and human repair decision,
and they define a full-scope future repair without changing an owner or entering implementation.

They are ready only for the requested scoped independent QbD 1 re-audit. No work Concept or product
change is authorized until that audit is recorded and the human makes a new decision.
