# Campaign: harnessos-foundation

## 权威与环境

- Canonical status: This file is the only current Campaign state; other artifacts are evidence, not competing status documents.
- Workspace identity: `/Users/liuzaoqu/Desktop/Develop/independent/HarnessOS`, Git worktree for HarnessOS.
- Repository identity: `github.com/piai-lab/HarnessOS`
- Campaign origin revision: `698d305e63a600ff00bb1873e87b2cb825a6496d`.
- Last reconciled revision: `712c829b3e768b9e6e5178997f8ec30e319fe83d`.
- Worktree state: dirty only in `missions/harnessos-foundation.md` and `missions/evidence/harnessos-foundation/E-007-alpha-ui-update.txt` for this Campaign reconciliation.
- Last reconciled at: `2026-08-28T11:30:19+08:00`.
- Active branch/worktree: `codex/harnessos-foundation` at `/Users/liuzaoqu/Desktop/Develop/independent/HarnessOS`.
- Applicable instructions: user-locked HarnessOS implementation plan; root `AGENTS.md`; repository authority routes in `README.md` and `architecture/README.md`.
- Superseded state sources: no competing state files were found after the recursive scan; historical tombstones remain at `execution-brief.md` and `missions/independent-omnimind-v1.md`.

## 目标与边界

- Required outcome: publish a reference-grade, independently buildable HarnessOS source repository whose default bundled OA Engine and separate stock Pi Engine preserve the locked product journeys without OmniMind runtime identity or compatibility residue.
- In scope: exact repository split; Apache-2.0 root licensing and retained third-party notices; HarnessOS/OA identity; top-level Engine contract; OA/Pi state and lifecycle isolation; HostGateway and Pi-family owner cuts; Agent/Chat/Studio; bilingual UI; selected brand system; deterministic legal/build/test and unsigned packaged proofs; GitHub source-governance surface; final OmniMind README pointer.
- Out of scope: adopted-source upgrades; user-data migration; shared HarnessOS/OmniMind core or sync; dynamic Engine plugin platform; signing, notarization, public Release, updater feed or formal version tag.
- Authorized actions: edit, rename, test, build, package unsigned artifacts, commit and push this task branch; configure the exact private GitHub repository and later make it public only after every publication gate and the selected visual master are satisfied.
- Stop conditions: do not publish, merge to `main`, create a Release/feed, alter old OmniMind user data, or integrate brand geometry before the maintainer explicitly selects its visual master. Stop on unresolvable source/right conflicts, unknown destructive effects or secret exposure.

## 核心阅读顺序

1. `AGENTS.md`, then E-001, E-004, E-005, E-002, and the active Claim evidence.
2. Read the exact owner named by the active Claim; do not load unrelated research.

- Bootstrap probe: Run the sole exact Bootstrap command below, reconcile its result, and perform no additional mandatory action.
- Bootstrap command: `git rev-parse --show-toplevel && git remote get-url origin && git rev-parse HEAD && git rev-list --count harnessos-fork-base^{} && git status --porcelain=v1`
- Bootstrap result: E-002 PASS at revision `698d305e63a600ff00bb1873e87b2cb825a6496d` with the exact HarnessOS root, canonical remote, 1,191 reachable commits and a clean pre-Campaign worktree.
- Mismatch policy: Reconcile this spec before implementation; if truth cannot be established, set the affected Claim to blocked.

## 系统模型

- Entrypoints: Electron/Web/Server monorepo and Product Orchestration inherited from Synara (E-001, E-004); Engine adapters and OA/Pi family runtime under `apps/server`; Workbench under `apps/web`; Desktop identity/packaging under `apps/desktop`.
- Control/data flow: Agent/Chat/Studio share Project/Thread/Space, Queue, Timeline and recovery; an admitted exact Engine/model/options binding enters one Engine adapter; Host system capabilities remain one HostGateway authority; OA and stock Pi own separate native Sessions, config roots, ResourceLoader composition and diagnostics.
- External dependencies: exact 12 adopted source records and legal texts (E-005); private GitHub repository; maintainer-selected visual master; platform CI/build hosts.
- Invariants: one Product Orchestration; one Engine identity/descriptor owner; no fallback across Engines; no OA/Pi state sharing; no `.omnimind` read/migration/alias; no second Registry/store/permission system; no public release authority in this Campaign.
- Environment boundary: source tests prove code contracts; isolated temporary HOME/userData proves state separation; packaged journeys prove shipped Electron/OS seams; neither proves signing, Release or updater publication.

## 知识基线

| K-ID | Kind | Statement | Evidence/authority | Consequence |
|---|---|---|---|---|
| K-001 | fact | Fork base exists with exactly 1,191 reachable commits and is remotely installed as HarnessOS `main` plus annotated fork tag. | E-002, E-003 | All conversion work starts after this immutable base; no later OmniMind commit enters. |
| K-002 | decision | HarnessOS and OmniMind are independent sibling products with no shared package, submodule, build dependency or sync. | Maintainer plan, 2026-08-28 | Prefer local ownership and clean removal over compatibility seams. |
| K-003 | decision | Top-level runtimes are Engines; fixed IDs are `oa`, `codex`, `claude`, `cursor`, `antigravity`, `grok`, `droid`, `kilo`, `opencode`, `pi`; OA is default. | Maintainer plan, 2026-08-28 | `Provider` remains only for model services inside OA/Pi. |
| K-004 | decision | OA is the bundled Pi-derived Engine; stock Pi remains independent with native `.pi` state. | Maintainer plan, E-005 | Share only a parameterized Pi-family adapter core; never Session/config/composition state. |
| K-005 | decision | Repository cleanliness is a public product requirement, not cosmetic cleanup. | Maintainer plan, 2026-08-28 | Remove process debris and generated artifacts after their evidence value is exhausted. |
| K-006 | decision | Visual identity is image-first and must not enter production before explicit master selection. | Maintainer plan and logo contract | Branding code remains blocked while identity-neutral work continues. |
| K-007 | fact | Current alpha has one Product Orchestration but public runtime identity and capability terms are still Provider/OmniMind-centered. | E-001, E-004 | Use a canonical clean break, not a dynamic plugin or alias layer. |

## 证据索引

| E-ID | Class | Role | Supports | Source + locator | Observed at | Reproduce/read | Freshness |
|---|---|---|---|---|---|---|---|
| E-001 | core | source | K-002, K-005, product invariants | `file:README.md#产品判断` | fork base `698d305e63a600ff00bb1873e87b2cb825a6496d` | `sed -n '1,132p' README.md` | current until identity-owner rewrite |
| E-002 | core | bootstrap | K-001, C-001 and bootstrap obligation | `file:missions/evidence/harnessos-foundation/E-002-bootstrap.txt#L1-L17` | revision `698d305e63a600ff00bb1873e87b2cb825a6496d`; receipt sha256 `fdafaa7dcda9287ee96e81ee6b4d3149ee8f75fbcc576f00bfec0fbd2abe73bd` | `git rev-parse --show-toplevel && git remote get-url origin && git rev-parse HEAD && git rev-list --count harnessos-fork-base^{} && git status --porcelain=v1` | current until repository/root/base mismatch |
| E-003 | task | focused | C-001 | `file:missions/evidence/harnessos-foundation/E-003-fork-remote.txt#L1-L16` | revision `698d305e63a600ff00bb1873e87b2cb825a6496d`; receipt sha256 `25e4d9e3c9d3de563df612c01a076d9dbdec55b0f4cab0bdcd33e74a83bffcfa` | `git ls-remote origin refs/heads/main refs/heads/codex/harnessos-foundation refs/tags/harnessos-fork-base refs/tags/harnessos-fork-base^{}` | current until remote refs change |
| E-004 | core | source | K-003, K-004, K-007, C-003–C-006 | `file:architecture/execution.md#核心裁决` | revision `698d305e63a600ff00bb1873e87b2cb825a6496d` | `sed -n '1,409p' architecture/execution.md` | current until execution-owner rewrite |
| E-005 | core | source | K-004, C-007 | `file:source-adoptions.json#L1-L311` | revision `698d305e63a600ff00bb1873e87b2cb825a6496d` | `node -e "JSON.parse(require('fs').readFileSync('source-adoptions.json','utf8')); console.log('valid')"` | current until adoption rewrite or source revision change |
| E-006 | task | focused | C-002 partial package-scope cut | `file:missions/evidence/harnessos-foundation/E-006-package-scope.txt#L1-L18` | revision `5cd76f66ca5439b5d48eade3473453ae193d7767`; receipt sha256 `b32c9196fa51c132af524b134f696305d08ceb25ec6bb05df294caaff6d12db4` | `git rev-parse HEAD && test "$(rg -l -F '@omnimind/' --glob '!node_modules/**' --glob '!.git/**')" = 'bun.lock' && bun install --frozen-lockfile && bun run build:contracts && bun run typecheck && bun test test/workspace-package-identity.test.mjs scripts/lib/release-workspace-manifests.test.ts scripts/lib/release-legal-metadata.test.ts scripts/lib/packaged-legal-closure.test.ts` | current until workspace manifests, imports or vendored OA runtime identity change |
| E-007 | task | focused | C-006 supporting post-base UI update requested by maintainer | `file:missions/evidence/harnessos-foundation/E-007-alpha-ui-update.txt#L1-L17` | revision `712c829b3e768b9e6e5178997f8ec30e319fe83d`; receipt sha256 `af23a6d2f387e6045ab276f9f2278aa94668d39839c95092acf42390568fa41e` | `cd apps/web && bun run test:unit -- src/components/ModelServiceIcon.test.tsx src/components/chat/MessagesTimeline.test.tsx && bun run test:browser -- src/components/ModelIdentityIcon.browser.tsx src/components/settings/ModelsSettingsPanel.browser.tsx src/components/chat/MessagesTimeline.turnProcess.browser.tsx` | current until the three affected UI owners change |

## 验收矩阵

| ID | Claim | Proof type | Status | Evidence | SHA/Version |
|---|---|---|---|---|---|
| C-001 | [required] private HarnessOS fork has the exact base, 1,191-history reachability and only intended refs | deterministic remote proof | candidate | E-002, E-003 | `698d305e63a600ff00bb1873e87b2cb825a6496d` |
| C-002 | [required] package, app, URL, env, storage and MCP identities are HarnessOS-only with one provenance exception | absence + focused build | open | pending | pending |
| C-003 | [required] canonical `Engine*` contract and sole `ENGINE_DESCRIPTORS` owner drive registration, settings and UI with OA default | contract/radius proof | open | pending | pending |
| C-004 | [required] OA and stock Pi independently satisfy lifecycle and state-isolation journeys without fallback | integration + isolated-state proof | open | pending | pending |
| C-005 | [required] HostGateway, Pi-family adapter, Conversation Workbench and Sidebar owner cuts reduce the promised modification radius | characterization + radius proof | open | pending | pending |
| C-006 | [required] selected HarnessOS/OA identity, all user surfaces and Chinese/English rendering pass real-shell visual and accessibility review | deterministic assets + browser/Electron rubric | open | pending visual-master selection | pending |
| C-007 | [required] Apache-2.0 root, retained third-party rights, 12 source records, docs and clean repository surface are closed | legal/source/structure proof | open | pending | pending |
| C-008 | [required] format, lint, typecheck, unit, integration, stable browser, Desktop build and legal checks pass | deterministic final gate | open | pending | pending |
| C-009 | [required] frozen SHA passes isolated macOS packaged journey and Linux/Windows unsigned startup builds | packaged/CI proof | open | pending | pending |
| C-010 | [required] protected public GitHub surface and final OmniMind README pointer are applied only after C-001–C-009 | remote governance audit | open | pending | pending |

## 当前状态

- Current checkpoint: workspace manifests, imports, task filters and tests use `@harnessos/*`; the clean-clone typecheck graph now builds the declaration package it consumes. The two maintainer-requested post-base UI fixes are independently replayed and browser-verified. C-002 remains open because app/env/storage/MCP identities and the vendored runtime artifact have not yet been cut.
- Active Claim: C-002.
- Next safe action: cut canonical app, bundle, URI, environment and storage identities without adding migration or compatibility reads; regenerate the vendored runtime only in the later OA artifact cut.
- Blockers: none.
- Last material change: source commits `54a87840e6` and `f310080bfa` were replayed as HarnessOS commits `40ff9387` and `712c829b`; E-007 binds the source mapping to 65 unit and 56 browser passing tests without changing the locked fork base.

## 已知问题与方向

| P-ID | Type | Priority | Description | Evidence | Disposition |
|---|---|---|---|---|---|
| P-001 | debt | P0 | Provider/OmniMind identities and state paths remain throughout the fork-base tree. | E-001, E-004 | in-scope clean break; no alias or dual read |
| P-002 | refactor | P0 | Engine identity/capability lists and the three named large UI/runtime owners have proven change amplification. | E-004, maintainer plan | consolidate into existing survivor owners; no new manager/control plane |
| P-003 | risk | P0 | Brand geometry is unresolved. | K-006 | generate 3–5 candidates; integrate only after explicit selection |
| P-004 | risk | P1 | Public governance and visibility would be premature before all baseline proofs. | maintainer plan | keep repository private until C-001–C-009 close |

## 终验

- Relevant final gate: On the frozen candidate, run the sole exact Final gate command below once; qualitative review belongs to the fresh completion audit.
- Final gate command: `bun run fmt:check && bun run lint && bun run typecheck && bun run test && bun run build:desktop && bun run licenses:check`
- Final candidate version: `pending-candidate`.
- Final gate result: not run.
- Fresh completion audit inputs: Goal, this spec, final diff/artifacts, final version and referenced raw evidence.
- Blocking finding contract: Claim ID + reproducible counterexample/evidence + material impact + revalidation condition.
- Last audit: not run; no independent evaluator is authorized in the current execution context, so Claims cannot become verified yet.

## 更新协议

- Update facts, decisions, evidence handles, Claim states, blockers and Last reconciled revision here after each material transition.
- Keep raw logs and artifacts at their source locations; link them by E-ID instead of copying narrative history here.
- Executor may create candidate, set/clear blocked, and invalidate verified to candidate; only the independent verifier/evaluator may create verified.
- On version change, return affected verified Claims to candidate unless dependency and evidence validity are demonstrated.
- Do not create a parallel ledger, progress report, handoff or completion summary.
