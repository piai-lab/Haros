# Campaign: harnessos-foundation

## 权威与环境

- Canonical status: This file is the only current Campaign state; other artifacts are evidence, not competing status documents.
- Workspace identity: `/Users/liuzaoqu/Desktop/Develop/independent/HarnessOS`, Git worktree for HarnessOS.
- Repository identity: `github.com/piai-lab/HarnessOS`
- Campaign origin revision: `f310080bfa1df72eade006d3d74143892c05f9b4`.
- Last reconciled revision: `8e8ea265ac1c7ecf8271154644ad458849fff354`.
- Worktree state: dirty only under `missions/` while this canonical Campaign reconciliation is being recorded; no product path is dirty.
- Last reconciled at: `2026-08-28T14:59:30+08:00`.
- Active branch/worktree: `codex/harnessos-foundation` at `/Users/liuzaoqu/Desktop/Develop/independent/HarnessOS`.
- Applicable instructions: user-locked HarnessOS implementation plan; root `AGENTS.md`; public architecture in `docs/architecture.md`.
- Superseded state sources: no competing state files remain; this Campaign directory is temporary and must be deleted before public push.

## 目标与边界

- Required outcome: publish a reference-grade, independently buildable HarnessOS source repository whose default bundled OA Engine and separate stock Pi Engine preserve the locked product journeys without OmniMind runtime identity or compatibility residue.
- In scope: exact repository split; Apache-2.0 root licensing and retained third-party notices; HarnessOS/OA identity; top-level Engine contract; OA/Pi state and lifecycle isolation; HostGateway and Pi-family owner cuts; Agent/Chat/Studio; bilingual UI; selected brand system; deterministic legal/build/test and unsigned packaged proofs; GitHub source-governance surface; final OmniMind README pointer.
- Out of scope: adopted-source upgrades; user-data migration; shared HarnessOS/OmniMind core or sync; dynamic Engine plugin platform; signing, notarization, public Release, updater feed or formal version tag.
- Authorized actions: edit, rename, test, build, package unsigned artifacts, commit and push this task branch; configure the exact private GitHub repository and later make it public only after every publication gate and the selected visual master are satisfied.
- Stop conditions: do not publish, merge to `main`, create a Release/feed, or alter old OmniMind user data. Stop on unresolvable source/right conflicts, unknown destructive effects or secret exposure.

## 核心阅读顺序

1. `AGENTS.md`, then E-001, E-004, E-005, E-002, and E-009.
2. Read the active Claim evidence and exact code owner; do not load retired research.

- Bootstrap probe: Run the sole exact Bootstrap command below, reconcile its result, and perform no additional mandatory action.
- Bootstrap command: `git rev-parse --show-toplevel && git remote get-url origin && git rev-parse HEAD && git rev-list --count harnessos-fork-base^{} && git status --porcelain=v1`
- Bootstrap result: PASS at revision `8e8ea265ac1c7ecf8271154644ad458849fff354`, recorded by E-002; root and private remote match, the local fork boundary has 1,193 reachable commits, and only Campaign reconciliation files are dirty.
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
| K-001 | fact | The final alpha source boundary is `f310080bfa1df72eade006d3d74143892c05f9b4` with exactly 1,193 reachable commits. It is an ancestor of the HarnessOS branch and the local annotated fork tag resolves to it. | E-002, E-003, E-009 | Remote refs stay private and are updated only after the public candidate is frozen. |
| K-002 | decision | HarnessOS and OmniMind are independent sibling products with no shared package, submodule, build dependency or sync. | Maintainer plan, 2026-08-28 | Prefer local ownership and clean removal over compatibility seams. |
| K-003 | decision | Top-level runtimes are Engines; fixed IDs are `oa`, `codex`, `claude`, `cursor`, `antigravity`, `grok`, `droid`, `kilo`, `opencode`, `pi`; OA is default. | Maintainer plan, 2026-08-28 | `Provider` remains only for model services inside OA/Pi. |
| K-004 | decision | OA is the bundled Pi-derived Engine; stock Pi remains independent with native `.pi` state. | Maintainer plan, E-005 | Share only a parameterized Pi-family adapter core; never Session/config/composition state. |
| K-005 | decision | Repository cleanliness is a public product requirement, not cosmetic cleanup. | Maintainer plan, 2026-08-28 | Remove process debris and generated artifacts after their evidence value is exhausted. |
| K-006 | decision | Concept A, the four-point constrained loop, is the selected HarnessOS visual master; OA uses its single-ring small-size projection. | Maintainer selection, 2026-08-28; E-010 | All product, Web, PWA and Desktop assets derive from one deterministic identity owner. |
| K-007 | fact | The canonical Engine contract, OA identity, HostGateway, clean persistence schema and Pi-family event/input/host projections are implemented without public compatibility aliases. | E-004; commits through `8e8ea265` | Remaining owner work is Conversation Workbench, Sidebar and lifecycle/state proof, not another registry. |

## 证据索引

| E-ID | Class | Role | Supports | Source + locator | Observed at | Reproduce/read | Freshness |
|---|---|---|---|---|---|---|---|
| E-001 | core | source | K-002, K-005, product invariants | `file:README.md#HarnessOS` | revision `8e8ea265ac1c7ecf8271154644ad458849fff354` | `sed -n '1,160p' README.md` | current until public product contract changes |
| E-002 | core | bootstrap | K-001, C-001 and bootstrap obligation | `file:missions/evidence/harnessos-foundation/E-002-bootstrap.txt#L1-L19` | revision `8e8ea265ac1c7ecf8271154644ad458849fff354`; receipt sha256 `0af92afc14923c20cace697a868a8d0e019707e52260ea6a17a7070ecf3e14f2` | `git rev-parse --show-toplevel && git remote get-url origin && git rev-parse HEAD && git rev-list --count harnessos-fork-base^{} && git status --porcelain=v1` | current until repository/root/base mismatch |
| E-003 | task | focused | C-001 | `file:missions/evidence/harnessos-foundation/E-003-fork-remote.txt#L1-L16` | revision `698d305e63a600ff00bb1873e87b2cb825a6496d`; receipt sha256 `25e4d9e3c9d3de563df612c01a076d9dbdec55b0f4cab0bdcd33e74a83bffcfa` | `git ls-remote origin refs/heads/main refs/heads/codex/harnessos-foundation refs/tags/harnessos-fork-base refs/tags/harnessos-fork-base^{}` | current until remote refs change |
| E-004 | core | source | K-003, K-004, K-007, C-003–C-006 | `file:docs/architecture.md#Architecture` | revision `8e8ea265ac1c7ecf8271154644ad458849fff354` | `sed -n '1,220p' docs/architecture.md` | current until architecture contract changes |
| E-005 | core | source | K-004, C-007 | `file:source-adoptions.json#L1-L311` | revision `8e8ea265ac1c7ecf8271154644ad458849fff354` | `node -e "JSON.parse(require('fs').readFileSync('source-adoptions.json','utf8')); console.log('valid')"` | current until adoption or source revision changes |
| E-006 | task | focused | C-002 partial package-scope cut | `file:missions/evidence/harnessos-foundation/E-006-package-scope.txt#L1-L18` | revision `5cd76f66ca5439b5d48eade3473453ae193d7767`; receipt sha256 `b32c9196fa51c132af524b134f696305d08ceb25ec6bb05df294caaff6d12db4` | `git rev-parse HEAD && test "$(rg -l -F '@omnimind/' --glob '!node_modules/**' --glob '!.git/**')" = 'bun.lock' && bun install --frozen-lockfile && bun run build:contracts && bun run typecheck && bun test test/workspace-package-identity.test.mjs scripts/lib/release-workspace-manifests.test.ts scripts/lib/release-legal-metadata.test.ts scripts/lib/packaged-legal-closure.test.ts` | current until workspace manifests, imports or vendored OA runtime identity change |
| E-007 | task | focused | C-006 supporting post-base UI update requested by maintainer | `file:missions/evidence/harnessos-foundation/E-007-alpha-ui-update.txt#L1-L17` | revision `712c829b3e768b9e6e5178997f8ec30e319fe83d`; receipt sha256 `a8fbf20a1cc01a970bbf0b1cf403b0a30106cb33a7903f76c143917df7cb8463` | `cd apps/web && bun run test:unit -- src/components/ModelServiceIcon.test.tsx src/components/chat/MessagesTimeline.test.tsx && bun run test:browser -- src/components/ModelIdentityIcon.browser.tsx src/components/settings/ModelsSettingsPanel.browser.tsx src/components/chat/MessagesTimeline.turnProcess.browser.tsx` | stale for ancestry; current only for the recorded UI behavior |
| E-008 | task | focused | C-002 partial application-namespace cut | `file:missions/evidence/harnessos-foundation/E-008-application-identity.txt#L1-L18` | revision `0ad5017020ef265901e9a61130726616b729c681`; receipt sha256 `43b325961eecabfe8fc1659ee091e6f357aff23db92bca3ebc873a2f97c98a10` | `git rev-parse HEAD && ! rg --hidden -n 'OMNIMIND_[A-Z0-9_]+' apps packages/contracts packages/shared scripts package.json turbo.json .github --glob '!apps/server/src/provider/omnimindPlanModeExtension.ts' && ! rg --hidden -n 'omnimind(-canary)?://' apps packages/contracts packages/shared scripts package.json turbo.json .github && ! rg --hidden -n 'app\.omnimind' apps packages/contracts packages/shared scripts package.json turbo.json .github && ! rg --hidden -n 'app\.harnessos\.desktop' apps packages/contracts packages/shared scripts package.json turbo.json .github && ! rg --hidden -n '\bomnimind_[a-z0-9_]+' apps packages/contracts packages/shared scripts package.json turbo.json .github && bun install --frozen-lockfile && bun run lint >/dev/null && bun run typecheck && (cd packages/shared && bun run test:unit -- src/desktopIdentity.test.ts src/loginShellEnvironment.test.ts) && (cd apps/desktop && bun run test:unit -- src/desktopUserDataProfile.test.ts src/desktopWsBridge.test.ts src/mediaPermissions.test.ts src/browserUsePipeServer.test.ts src/windowsTaskbarIcon.test.ts) && (cd apps/server && bun run test -- src/agentGateway/mcpInjection.test.ts src/auth/utils.test.ts src/codexProcessEnv.integration.test.ts src/codexHomePaths.integration.test.ts src/restoreMigrationBackup.integration.test.ts) && (cd apps/web && bun run test:unit -- src/browserStateStore.test.ts src/components/BrowserPanel.logic.test.ts src/components/EditorWorkspaceView.test.tsx src/hooks/useBrowserPanelDesktopBridge.test.ts src/lib/appSnapIconStore.test.ts src/lib/composerImageBlobStore.test.ts src/localPreferences.test.ts) && bunx vitest run scripts/dev-runner.test.ts scripts/canary.test.ts scripts/verify-packaged-desktop.test.ts scripts/build-desktop-artifact-mac-config.test.ts` | current until application identity owners or deferred OA extension contracts change |
| E-009 | task | focused | K-001, C-001 final alpha ancestry | `file:missions/evidence/harnessos-foundation/E-009-f310-ancestry.txt#L1-L20` | revision `199c0b740fba88707082b374dc98286adec5e41a`; receipt sha256 `8b5dd9c3a5e4f84f8817a7a423233463d2214db4ff72ff6cbd0b177a4e5b6c9b` | `git merge-base --is-ancestor f310080bfa1df72eade006d3d74143892c05f9b4 HEAD && git rev-list --count harnessos-fork-base^{} && git show -s --format='%H %P %s' 86eebb8cf7f5bc27769abc442e2414318dc6ee1b && git show -s --format='%H' harnessos-fork-base^{}` | current until ancestry or local tag changes |
| E-010 | task | focused | K-006, C-006 selected brand and deterministic assets | `file:missions/evidence/harnessos-foundation/E-010-brand-assets.txt#L1-L18` | revision `8e8ea265ac1c7ecf8271154644ad458849fff354`; receipt sha256 `caf5c0ea711745c9ca70430497d27ce27fdc6be550669b5ad60dd57d21678392` | `bun run brand:check && (cd apps/web && bun run typecheck && bun run test:unit -- src/components/EngineIcon.test.tsx && bun run test:browser -- src/components/HarnessOSLogoButton.browser.tsx src/components/SidebarHeaderNavigationControls.browser.tsx && bun run build) && (cd apps/server && bun run typecheck && bun run test -- src/engine/harnessosOAuthCallbackPage.test.ts) && git diff --check` | current until brand sources, generator or consuming surfaces change |

## 验收矩阵

| ID | Claim | Proof type | Status | Evidence | SHA/Version |
|---|---|---|---|---|---|
| C-001 | [required] private HarnessOS fork has the exact `f310080bfa` base, 1,193-history reachability and only intended refs | deterministic remote proof | open | E-002, E-003, E-009 | pending final remote synchronization |
| C-002 | [required] package, app, URL, env, storage and MCP identities are HarnessOS-only with one provenance exception | absence + focused build | open | pending | pending |
| C-003 | [required] canonical `Engine*` contract and sole `ENGINE_DESCRIPTORS` owner drive registration, settings and UI with OA default | contract/radius proof | open | pending | pending |
| C-004 | [required] OA and stock Pi independently satisfy lifecycle and state-isolation journeys without fallback | integration + isolated-state proof | open | pending | pending |
| C-005 | [required] HostGateway, Pi-family adapter, Conversation Workbench and Sidebar owner cuts reduce the promised modification radius | characterization + radius proof | open | pending | pending |
| C-006 | [required] selected HarnessOS/OA identity, all user surfaces and Chinese/English rendering pass real-shell visual and accessibility review | deterministic assets + browser/Electron rubric | open | E-007, E-010 partial; Electron and complete bilingual surface audit pending | `8e8ea265ac1c7ecf8271154644ad458849fff354` partial |
| C-007 | [required] Apache-2.0 root, retained third-party rights, 12 source records, docs and clean repository surface are closed | legal/source/structure proof | open | pending | pending |
| C-008 | [required] format, lint, typecheck, unit, integration, stable browser, Desktop build and legal checks pass | deterministic final gate | open | pending | pending |
| C-009 | [required] frozen SHA passes isolated macOS packaged journey and Linux/Windows unsigned startup builds | packaged/CI proof | open | pending | pending |
| C-010 | [required] protected public GitHub surface and final OmniMind README pointer are applied only after C-001–C-009 | remote governance audit | open | pending | pending |

## 当前状态

- Current checkpoint: source ancestry, HarnessOS/OA identity, Engine contract, HostGateway, clean persistence schema, Pi-family deep projections, public docs and selected constrained-loop brand are implemented locally. Public push, lifecycle/state isolation, remaining Workbench/Sidebar owner cuts and final packaged gates remain open.
- Active Claim: C-005.
- Next safe action: characterize and extract the remaining Conversation Workbench and Sidebar responsibilities into their existing domain hooks/controllers without creating a global store, manager or registry.
- Blockers: none.
- Last material change: commit `8e8ea265ac1c7ecf8271154644ad458849fff354` established the maintainer-selected constrained-loop identity, deterministic 31-asset generation and the OA small-size projection; E-010 binds the focused proof.

## 已知问题与方向

| P-ID | Type | Priority | Description | Evidence | Disposition |
|---|---|---|---|---|---|
| P-001 | proof | P0 | OA/stock runtime and state isolation still require fresh HOME/userData lifecycle evidence. | E-004 | add isolated normal/failure/cancel/restart/shutdown proof; no migration or dual read |
| P-002 | refactor | P0 | Engine identity/capability lists and the three named large UI/runtime owners have proven change amplification. | E-004, maintainer plan | consolidate into existing survivor owners; no new manager/control plane |
| P-003 | proof | P1 | Selected brand is integrated and browser-tested; final Electron light/dark and platform icon review remains. | E-010 | close only with real-shell visual evidence on the frozen candidate |
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
