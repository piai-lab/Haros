# Campaign: HAROS-OWNER-CUT-2026-08-30

## 权威与环境

- Canonical status: This file is the only current state for Campaign `HAROS-OWNER-CUT-2026-08-30`; other artifacts are raw evidence, not competing status documents.
- Workspace identity: `/Users/liuzaoqu/Desktop/Develop/independent/Haros-owner-lifecycle-cut`, Git worktree for Haros.
- Repository identity: `git@github.com:piai-lab/Haros.git`
- Campaign origin revision: `29b2b39c49ebba20aa38f95d76acd2284e91b1cc`
- Last reconciled revision: `315dbfc5e7df94c037b4d0c572c693628d041214`
- Worktree state: scoped owner-cut implementation is present in four product/test files; no protected or unrelated paths are modified. Last reconciled revision follows the zq-goal control-file self-reference rule.
- Last reconciled at: `2026-08-30T15:43:22+08:00`
- Active branch/worktree: `codex/haros-owner-lifecycle-cut` at `/Users/liuzaoqu/Desktop/Develop/independent/Haros-owner-lifecycle-cut`
- Applicable instructions: root `AGENTS.md`, then the user's Campaign authority recorded in K-004 through K-011.
- Superseded state sources: none for this Campaign after repository and shared-checkout scan. `/Users/liuzaoqu/Desktop/Develop/independent/Haros/missions/haros-guidebook.md` is a separate active Campaign and is protected, not superseded.

## 目标与边界

- Required outcome: select one evidence-backed, high-lifetime-benefit, controllable-risk responsibility through read-only PORTFOLIO; then close exactly one `CONSOLIDATE`, `RETIRE`, or `DIFF` owner cut and prove preserved behavior/lifecycle, complete old-graph removal, reduced change radius, boundary correctness, and no new owner on one immutable candidate.
- In scope: one selected lifecycle responsibility; its directly involved code, tests, necessary configuration, this canonical spec, Goal, and dedicated proof receipts.
- Out of scope: repository-wide cleanup; a second owner cut; user-visible behavior/copy/product strategy; public-contract, persisted-data, compatibility, permission, security, release, signing, publishing, real-provider, external-data, dependency-upgrade, framework-replacement, speculative performance, compatibility-layer, migration, alias, dual-read/write, fallback-namespace, broad formatting, and unrelated `docs/**` work.
- Authorized actions: read-only portfolio evidence; one task branch/worktree; scoped code/test/config/spec/evidence writes; focused commands; scoped commits. No push, merge, shared-branch rebase, force-push, publication, signing, notarization, updater, visibility change, or real user/private Engine state access.
- Stop conditions: any unresolved user-visible behavior, public contract, compatibility, persistence/data disposition, security/permission, release/external side effect, two materially different survivor outcomes, missing core evidence, workspace mismatch, or direct overlap with protected shared-checkout work sets affected Claims to `blocked`.

## 核心阅读顺序

1. `AGENTS.md` — E-001.
2. `README.md` — E-002.
3. `docs/architecture.md` — E-003.
4. This canonical spec, then E-004.
5. Repository command contract — E-005.
6. Baseline bootstrap — E-006.
7. Survivor owner — E-007.
8. Health consumer — E-008.
9. Usage consumer — E-009.
10. Existing security characterization — E-010.
11. `zq-simplify` — E-011.
12. `zq-dev-rules` — E-012.
13. `zq-orchestrate` — E-013.

- Bootstrap probe: Run the sole exact Bootstrap command below, reconcile its result, and perform no additional mandatory action.
- Bootstrap command: `bun run public-surface:check`
- Bootstrap result: E-015 passed at the reconciled Executor orientation revision; it proves the existing dependency-free repository probe runs in the isolated worktree, not structural correctness.
- Mismatch policy: reconcile this spec before implementation; if truth cannot be established, set the affected Claim to `blocked`.

## 系统模型

- Entrypoints: `EngineHealth` builds an environment before Engine health/maintenance CLI processes; `engineUsage` builds an environment before each usage fetcher/credential probe (E-008, E-009).
- Control/data flow: product `EngineKind` or direct `acp` → `buildEngineChildEnvironment` → private child security-profile resolution → static credential grant selection + Haros/native-capability filtering → per-call child environment → health/maintenance process or usage fetcher. The survivor owns no process: it builds a fresh object per call; only the registered credential-key set is mutable (E-007–E-010, E-018).
- External dependencies: none authorized for candidate selection or ordinary implementation; local Git, Bun/Node, and repository dependencies only.
- Invariants: Haros is sole product identity; `ENGINE_DESCRIPTORS` remains sole Engine identity/registration/capability/Settings authority; Product Threads differ from native Engine Sessions; product state/Queue/Timeline/recovery stay shared; local capabilities stay behind HostGateway; retired namespaces and compatibility dual tracks are forbidden.
- Environment boundary: local source/tests/build can prove repository behavior and static/runtime-local lifecycle only; packaged bytes, dynamic external consumers, real services, and platform-specific behavior remain unknown unless the selected cut directly crosses them and the minimum corresponding proof is run.

## 知识基线

| K-ID | Kind | Statement | Evidence/authority | Consequence |
|---|---|---|---|---|
| K-001 | fact | Origin is Haros `main` at `29b2b39c…`; this isolated branch starts from that exact revision. | E-001, E-006 | Portfolio compares against a fixed baseline and does not import shared dirty state. |
| K-002 | fact | Haros defines owner boundaries, including sole `ENGINE_DESCRIPTORS` authority and HostGateway authority. | E-001, E-003 | A candidate cannot create parallel registries or adapter-owned capability authority. |
| K-003 | fact | Repository exposes formatting, lint, typecheck, build, focused/related, unit, integration, browser, and desktop checks. | E-005 | Candidate proof must select real commands from these entries. |
| K-004 | decision | The Campaign has exactly one finite owner cut after one read-only PORTFOLIO; adjacent value never gains implementation authority. | User authority | C1 must select one closable responsibility and stop after its terminal state. |
| K-005 | decision | Protected Guidebook task/thread and all shared-checkout unknown changes are excluded. | User authority | No read/write/stage/commit against their paths; direct overlap blocks. |
| K-006 | decision | Taste priority is fewer semantic owners/states/writers/entries/compatibility obligations, deeper/narrower interfaces, direct control flow, closed lifecycle, and smaller future change radius. | User authority | LOC, file count, naming, directory shape, wrappers, or added abstractions are not simplification evidence. |
| K-007 | decision | Required behavior and failure semantics must remain; no user-visible, public-contract, persistence, compatibility, security, permission, or release decision is delegated. | User authority | Any such fork is `ASK`/`blocked`, not implementation judgment. |
| K-008 | decision | Tests use task-specific temporary homes/data; no real private Engine state or live Provider is accessed by default. | User authority, E-001 | Proof commands must isolate state and avoid secrets/external side effects. |
| K-009 | decision | The survivor must be an existing definition/config/runtime owner or mature public seam; no manager/registry/control plane may be invented to find ownership. | User authority | C2 and C6 reject shallow facades and new parallel truth. |
| K-010 | fact | `EngineHealth` and `engineUsage` each define the same product-Engine-to-child-security-profile projection, including the internal `oa → pi` rule. | E-008, E-009 | Two consumers currently own security profile knowledge that belongs with the credential-environment owner. |
| K-011 | decision | Disposition is `CONSOLIDATE`: make existing `buildEngineChildEnvironment` accept product `EngineKind` and resolve the profile internally; delete both consumer-local projections and type imports. | E-007–E-010, user taste authority | No new facade, registry, state, writer, process, contract, or compatibility path is permitted. |
| K-012 | decision | Required result: health/maintenance probes and usage fetches receive byte-for-byte equivalent environment policy; `oa` retains the permissive `pi` profile; named Engines retain existing grants; Haros control-plane and ungranted native/credential keys remain absent. | E-007–E-010 | Any environment-policy or observable failure change falsifies the cut. |
| K-013 | decision | Evolution: adding or retargeting an Engine security profile must change only the Engine definition/new implementation and `engineChildEnvironment` owner, never Health or Usage consumer mapping code. | E-003 change-radius rule, user authority | This is the radius scenario for C-005. |
| K-014 | fact | Current graph has no mapping-specific writer, cache, listener, timer, recovery, or shutdown owner; environments are rebuilt per invocation. The owner has one mutable credential-key set, while grants are static. | E-007–E-010 | Restart/shutdown proof is stateless repeated-call behavior plus existing Health/Usage lifecycle tests; no background lifecycle may be added. |
| K-015 | decision | Survivor: `apps/server/src/engine/engineChildEnvironment.ts#buildEngineChildEnvironment`, because it already owns child credential grants and filtering. | E-007 | Mapping stays private inside the deep owner rather than becoming a public helper/facade. |
| K-016 | fact | Tax evidence: the two local projections are semantically identical and both expose the internal `pi` implementation identity to unrelated consumers. | E-008, E-009 | Both copies must disappear; retaining either fails C-003/C-005. |
| K-017 | decision | Strongest falsifier: a current consumer requires a different Engine→security-profile rule, or direct non-product child kinds such as `acp` cannot coexist with product Engine inputs. Current sources show identical rules and the survivor can preserve direct child kinds. | E-007–E-009 | If implementation evidence contradicts this, set C-001/C-002 blocked and do not alter policy. |
| K-018 | decision | Proof scenario: introduce a hypothetical new Engine profile. After consolidation, only Engine identity/new implementation and `engineChildEnvironment` require edits; Health and Usage compile and consume the projection unchanged. | E-003, E-007–E-009 | Any remaining consumer mapping/list requires further consolidation before candidate freeze. |
| K-019 | decision | Orchestration entry is expected to choose `DIRECT_EXECUTION`: one fresh task is the sole writer/integrator; no Worker, Supervisor, or semantic Sentinel is justified. One fresh read-only Judge appears only after candidate freeze. | E-013, user authority | Continuity comes from the independent task; orchestration cannot create a second state owner or expand scope. |
| K-020 | fact | The scoped implementation has one private `oa → pi` profile resolution in `engineChildEnvironment`; Health and Usage pass product `EngineKind` directly, and direct `acp` remains admitted. | E-017, E-018 | C-002/C-003/C-005/C-006 are producer candidates; final gate and fresh audit remain required. |

Taste rubric: positive evidence is one survivor, fewer writers/entries/state, consumer use of a narrow projection, complete old support-graph removal, and a real radius scenario. Forbidden evidence substitutes are LOC decrease, zero references alone, renamed/moved files, shallow facades, parallel registries, checklists as owner, compatibility dual tracks, speculative caching, or tests that copy production truth. Conflict priority is user authority → preserved observable effect → project ownership rules → implementation convenience.

## 证据索引

| E-ID | Class | Role | Supports | Source + locator | Observed at | Reproduce/read | Freshness |
|---|---|---|---|---|---|---|---|
| E-001 | core | source | K-001, K-002, K-005, K-008, invariants | `file:AGENTS.md#Product and architecture` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,220p' AGENTS.md` | current until file or applicable instruction changes |
| E-002 | core | source | required product context, K-003 | `file:README.md#Run from source` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,220p' README.md` | current until file changes |
| E-003 | core | source | K-002, K-013, K-018, C-001, invariants | `file:docs/architecture.md#Change-radius rule` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,220p' docs/architecture.md` | current until file changes |
| E-004 | core | source | K-001, branch isolation | `file:.git#gitdir` | product origin `29b2b39c49ebba20aa38f95d76acd2284e91b1cc`; `2026-08-30T15:25:19+08:00` | `git branch --show-current && git rev-parse HEAD && git status --short` | current while later revisions contain only this Campaign's control files; expires on product or unrelated worktree change |
| E-005 | core | source | K-003 | `file:package.json#scripts` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `node -e "const p=require('./package.json'); console.log(p.scripts)"` | current until package scripts change |
| E-006 | core | bootstrap | bootstrap obligation | `file:missions/evidence/haros-owner-lifecycle-cut/E-006-bootstrap.txt#L1-L10` | candidate `29b2b39c49ebba20aa38f95d76acd2284e91b1cc`; receipt `sha256:1f14cf1bf096cee97a50964354296ed16258a4096f6ec269739638e6eebb1841`; `2026-08-30T15:25:19+08:00` | `bun run public-surface:check` | current until candidate, command, or relevant source changes |
| E-007 | core | source | K-010–K-017, C-001–C-006 | `file:apps/server/src/engine/engineChildEnvironment.ts#buildEngineChildEnvironment` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,180p' apps/server/src/engine/engineChildEnvironment.ts` | current until file changes |
| E-008 | core | source | K-010, K-014, K-016–K-018, C-001 | `file:apps/server/src/engine/Layers/EngineHealth.ts#engineChildKind` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '120,145p' apps/server/src/engine/Layers/EngineHealth.ts` | current until file changes |
| E-009 | core | source | K-010, K-014, K-016–K-018, C-001 | `file:apps/server/src/engineUsage/index.ts#engineChildKind` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,75p' apps/server/src/engineUsage/index.ts` | current until file changes |
| E-010 | core | source | K-012, K-014, C-004 | `file:apps/server/src/engine/engineChildEnvironment.integration.test.ts#buildEngineChildEnvironment` | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` | `sed -n '1,220p' apps/server/src/engine/engineChildEnvironment.integration.test.ts` | current until file changes |
| E-011 | core | source | K-011, K-015, K-018, C-002–C-006 | `file:/Users/liuzaoqu/Desktop/Develop/solvinglab-skill-internal/skills/agent/zq-simplify/SKILL.md#CONSOLIDATE：一次收回真实 owner` | `sha256:90ad7e34b4dc678bac8e44974f626d1a285ce18166b64b7ae3b4b1228ef54347`; `2026-08-30` | `sed -n '1,360p' /Users/liuzaoqu/Desktop/Develop/solvinglab-skill-internal/skills/agent/zq-simplify/SKILL.md` | current while SHA matches |
| E-012 | core | source | K-012, K-017, C-004, security risk gate | `file:/Users/liuzaoqu/Desktop/Develop/solvinglab-skill-internal/skills/agent/zq-dev-rules/SKILL.md#执行锚点` | `sha256:c026e50dc00c7d09b498b839d8a970796b4e0225b45961a87e7da4fcc7e2d7d1`; `2026-08-30` | `sed -n '1,360p' /Users/liuzaoqu/Desktop/Develop/solvinglab-skill-internal/skills/agent/zq-dev-rules/SKILL.md` | current while SHA matches |
| E-013 | core | source | K-019, execution continuity | `file:/Users/liuzaoqu/.codex/skills/zq-orchestrate/SKILL.md#先决定是否拒绝编排` | `sha256:5a156d8d848a59aa6f82835596e8e397931b36d88f3ca4e054f075608d0ab295`; `2026-08-30` | `sed -n '1,420p' /Users/liuzaoqu/.codex/skills/zq-orchestrate/SKILL.md` | current while SHA matches |
| E-014 | task | focused | C-001, K-010, K-016 | `file:missions/evidence/haros-owner-lifecycle-cut/E-014-candidate-selection.txt#L1-L10` | candidate `29b2b39c49ebba20aa38f95d76acd2284e91b1cc`; receipt `sha256:2e44193e7c83109e1a14479c4f397cbdbdf86b8ad20fdccd71788ffd5f5112b3`; `2026-08-30T15:31:47+08:00` | `test "$(git grep -n 'const engineChildKind' -- apps/server/src/engine/Layers/EngineHealth.ts apps/server/src/engineUsage/index.ts | wc -l | tr -d ' ')" = 2` | current only at origin revision before consolidation |
| E-015 | task | bootstrap | zero-memory orientation | `file:missions/evidence/haros-owner-lifecycle-cut/E-015-bootstrap-orientation.txt#L1-L10` | candidate `b2d4dea080aead5d84c7dd929ad56c273cdcad69`; receipt `sha256:c7169c4587b7469863ae78323aa4ae681e8d118f27185e5d778d336b5a39f005`; `2026-08-30T15:38:53+08:00` | `bun run public-surface:check` | current until candidate, command, or relevant source changes |
| E-016 | task | focused | proof environment diagnosis | `file:missions/evidence/haros-owner-lifecycle-cut/E-016-focused-environment-failure.txt#L1-L10` | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214`; receipt `sha256:eb8d5ca476b5ce894af460b6d8d1357fad42f63080afb0bb7451454815f9fec2`; `2026-08-30T15:40:42+08:00` | exact focused proof command | failed before EngineUsage/EngineHealth collection; not Claim evidence |
| E-017 | task | focused | C-004 | `file:missions/evidence/haros-owner-lifecycle-cut/E-017-focused-pass.txt#L1-L10` | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214`; receipt `sha256:57de1da651e1162a49e76f9ea9c36992b1f8775a8bd7199f5aa7d92e729026b3`; `2026-08-30T15:41:30+08:00` | exact focused proof command | current until product/test candidate changes |
| E-018 | task | structural | C-002, C-003, C-005, C-006, C-008 | `file:missions/evidence/haros-owner-lifecycle-cut/E-018-structural-proof.txt#L1-L10` | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214`; receipt `sha256:d2ec0472ddf080803479d93f6a0148ce26fdda948a6ebf9114d63b5717cf6ac8`; `2026-08-30T15:43:22+08:00` | consumer residue + owner mapping + direct-call + scoped diff audit | current until product candidate changes |

## 验收矩阵

| ID | Claim | Proof type | Status | Evidence | SHA/Version |
|---|---|---|---|---|---|
| C-001 | [required] Candidate selection: one highest-value closable lifecycle responsibility is selected from real call/lifecycle evidence; seven construction facts and strongest falsifier are frozen without an unresolved product fork. | read-only portfolio evidence + independent audit at final candidate | candidate | E-003, E-007, E-008, E-009, E-014 | `29b2b39c49ebba20aa38f95d76acd2284e91b1cc` |
| C-002 | [required] Sole survivor: one semantic owner holds the selected fact/state/lifecycle and every current consumer uses its narrowest contract. | focused source/call-graph proof + tests | candidate | E-017, E-018 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-003 | [required] Complete removal: old owner/writer/listener/cache/registry/fallback/adapter/config/test/script/doc/artifact support graph is absent. | residue search + lifecycle graph proof | candidate | E-018 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-004 | [required] Lifecycle preservation: relevant normal, failure, cancellation, concurrency, restart, recovery, and shutdown semantics remain. | focused unit/integration/journey proof selected by C-001 | candidate | E-017 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-005 | [required] Radius reduction: a real change scenario touches only the survivor and genuinely new implementation/assets, not parallel consumer truth. | reproducible radius scenario + diff/source audit | candidate | E-018 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-006 | [required] No new owner: no competing state/registry/writer/control plane/cache lifecycle/permanent dual track or compatibility obligation was added. | source/diff audit + residue search | candidate | E-018 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-007 | [required] Boundary correctness: affected format, lint, typecheck, build, unit/integration tests, and one representative journey pass on one candidate. | deterministic final gate + focused proof | open | pending | pending |
| C-008 | [required] Performance honesty: no global speed claim without same-basis data; if no performance path changes, relevant proofs show no known regression only. | diff inspection; benchmark only if a performance claim is made | candidate | E-018 | worktree based on `315dbfc5e7df94c037b4d0c572c693628d041214` |
| C-009 | [required] Independent completion: C-001–C-008, final gate, and one fresh read-only completion audit bind the same immutable candidate with no material finding. | host-provenanced fresh evaluator audit | open | pending | pending |

## 当前状态

- Current checkpoint: owner cut implemented; exact focused proof and structural proof PASS; C-002–C-006 and C-008 are producer candidates.
- Active Claim: C-007.
- Next safe action: freeze the scoped product candidate commit, then run the exact Final gate once on that immutable product candidate.
- Blockers: none. Any falsifier in K-017, protected-work overlap, or policy/behavior change blocks C-001/C-002 before further writes.
- Last material change: residue/radius/no-new-owner audit passed: consumer mappings are absent, the owner holds the sole private projection, direct `acp` remains supported, and the product diff adds no owner/state/process/performance path; recorded as E-018.

## 已知问题与方向

| P-ID | Type | Priority | Description | Evidence | Disposition |
|---|---|---|---|---|---|
| P-001 | refactor | P1 | Duplicate Engine→child-security-profile projection in Health and Usage. | E-007–E-010 | `CONSOLIDATE`; selected owner cut |
| P-002 | risk | P0 | Shared checkout contains protected Guidebook/unknown work that must never enter this branch. | K-005 | excluded; direct overlap blocks |
| P-003 | refactor | P2 | Git text-generation eligibility/routing is spread across server and web, but Cursor's runtime support versus Settings omission is a product-semantic counterexample. | source inspection during PORTFOLIO | deferred adjacent value; no implementation authority |
| P-004 | refactor | P3 | Engine usage presentation metadata and server fetcher registry contain overlapping membership, but one owns credential-blind presentation and the other runtime implementation composition. | E-003 and source inspection during PORTFOLIO | keep; distinct facts, no consolidation proof |
| P-005 | refactor | P3 | Editor labels/launch metadata are already owned by `packages/contracts/src/editor.ts`; web icon mapping is presentation-specific. | source inspection during PORTFOLIO | keep; no competing semantic owner shown |

## 终验

- Relevant final gate: On the frozen candidate, run the sole exact Final gate command below once; qualitative review belongs to the fresh completion audit.
- Final gate command: `bun run fmt:check && bun run lint && bun run typecheck && bun run build:desktop && bun run test:focused -- apps/server/src/engine/engineChildEnvironment.integration.test.ts apps/server/src/engineUsage/index.test.ts apps/server/src/engine/Layers/EngineHealth.integration.test.ts`
- Final candidate version: not frozen.
- Final gate result: not run.
- Fresh completion audit inputs: Goal, this spec, final diff/artifacts, final version, and referenced raw evidence.
- Blocking finding contract: Claim ID + reproducible counterexample/evidence + material impact + revalidation condition.
- Last audit: not run.

## 更新协议

- Update facts, decisions, evidence handles, Claim states, blockers, and Last reconciled revision here after each material transition.
- Keep raw logs and artifacts at source locations; link them by E-ID instead of copying narrative history here.
- Executor may create candidate, set/clear blocked, and invalidate verified to candidate; only an independent verifier/evaluator may create verified.
- On version change, return affected verified Claims to candidate unless dependency and evidence validity are demonstrated.
- Do not create a parallel ledger, inventory, progress report, handoff, completion summary, or second architecture truth.
