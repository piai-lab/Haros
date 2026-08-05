---
type: "Implementation Handoff"
title: "Retire competing execution authority"
work: "../work/retire-competing-execution-authority.md"
status: "CANDIDATE"
revision: "handoff-retire-competing-execution-authority-20260805-r5"
actor_id: "retire_competing_execution_authority_implementer_r5"
dispatch_receipt: "aee22d5ec855416da1bcc24182202f15"
predecessor_receipt: "0a8729dd4f414cd29b5de90451542eae"
predecessor: "../reviews/retire-competing-execution-authority.md"
supersedes_revision: "handoff-retire-competing-execution-authority-20260805-r4"
---

# Retire competing execution authority

## Outcome

`CANDIDATE` for renewed independent review, not self-accepted T4 completion.

The accepted Product/system command-surface predecessor closed the r2 stop condition. On the coherent shared candidate,
the donor Service execution buses, static Provider/model contracts, renderer orchestration dispatcher, provider-first
composer/discovery surfaces, donor migrations and Product-external Pi runtime ownership are now physically absent.
Product Queue/Run and scoped system capabilities remain the only Product-side command path; Native Host remains the only
executable Pi owner.

The final side-review gap is also closed: donor `ProviderInteractionMode` is historical-only. Current composer draft state
uses the Web-local `ConversationInteractionMode`; Product conversations force the effective mode to `default`, clear a
persisted donor-era mode at the Product route boundary, ignore Shift+Tab as an execution-mode switch, and never write
`plan` into Product draft/queue admission. A real route-backed full `ChatView` browser test proves the visible and stored
behavior. `RuntimeMode` remains intentionally separate because Product `permissionPolicy` is a real typed admission fact.

The r1 review's four findings are repaired. Chat runtime selection now uses one exact
`available && auth === "configured"` predicate for picker and mutation. A prior explicit selection
whose auth becomes missing remains durably `auth-missing` with its original runtime-model id rather
than silently falling back. The seven donor Provider/model commands are absent from the public
contract, defaults, route handling and help, while startup drops their persisted legacy bindings.
Historical source ids remain opaque, and missing source identity remains `null`/`Runtime` rather
than being guessed as Codex. Current Web view/draft/bootstrap types use local source-neutral
interaction types; `ProviderInteractionMode` remains only in decoded conversation history.

The r2 review's sole remaining P1 is repaired without changing validators or runtime behavior.
The existing legal generator rewrote the checked-in Web inventory, CycloneDX SBOM and notices from
the current development-host graph: all three now describe 230 components, the eight retired donor
dependencies are absent, and `licenses:check` passes. Because these public source bytes changed,
the macOS arm64 ZIP and isolated packaged Service/Native Host startup were rebuilt from this r5 tree.

No compatibility alias, fallback execution path, second transport or warning suppression was added.

## Expanded deletion and preservation table

| Old anchor | Conflict or retained value | Final owner / interface | Deletion and post-delete proof | Residual |
| --- | --- | --- | --- | --- |
| `apps/service/src/{orchestration,provider,providerUsage,agentGateway,externalMcp,browserAutomation}/**` | General accepted-operation, Provider Session/runtime journal, package/extension and alternate Browser execution authority | Product Queue/Run + scoped Product/system RPC; Native Host for Engine/Package execution; Desktop for Browser ownership | Trees are absent; `execution-authority-boundary` proves absence and no Service composition; r4 Service preservation plus keybinding matrix is 11 files / 189 tests | Post-delete real-provider checkpoint journey not rerun in this operation |
| `packages/contracts/src/{orchestration,provider,providerRuntime,providerDiscovery,model,agentGateway,externalMcp}.ts` and tests | Static Provider/model registry and general execution contracts | Product state/RPC and Native Host protocol | Exact files absent; production scan has zero `ProviderKind`, `ModelSelection`, static registry and `api.orchestration`; contracts tests 4 files / 27 and typecheck pass | Historical presentation schemas remain in `threadHistory.ts`, with no Product/Host writer or command consumer |
| Web raw orchestration/provider graph | Renderer dispatcher, accepted queue, provider discovery/status/default/model authority, import/handoff execution paths and generic raw projections | Typed Product projection, Queue/Run controls, source-neutral search and truthful unavailable/re-entry | Web affected suite is 14 files / 353 tests; exact negative boundary test and provider/import scans are zero | Human visual approval for the final deletion surface is not recorded here |
| Chat runtime selection | Picker and mutation could disagree with Host auth and catalog refresh could silently replace an explicit unavailable choice | Product requested-selection reconciliation from the exact Host catalog | One shared selectable predicate gates display/mutation; browser disagreement fixture proves `available + auth-missing` stays `auth-missing`, cannot select/admit and preserves the draft | This proves local catalog disagreement behavior, not a new live-provider journey |
| Donor key commands | Provider-specific create commands and dead model/reasoning controls remained public/default/help-visible | Product runtime picker and source-neutral create commands only | Seven commands removed from contract/defaults/help/route; service startup test drops direct and old alias spellings from loaded and persisted config; boundary scan covers every public surface | Existing user custom bindings are deleted on next startup; no replacement alias is retained |
| Historical source and interaction residue | Unknown/null sources were coerced to Codex; current Web types imported a donor history interaction type; rename accepted ignored donor fields | Opaque historical source presentation; Web-local conversation interaction type; title-only Product rename | Direct normalizer regression preserves `future-runtime` and `null`; boundary rejects `toLegacyProvider` and current-Web `ProviderInteractionMode`; rename creation arguments/path removed | `threadHistory` and `historicalConversation` remain contract history only |
| Provider composer façade | Empty plugin/native-command/skill/model/agent registries could still imply executable authority | App slash commands, historical thread mentions, local roots and path references only | Composer menu hook and callers no longer accept empty provider façades; provider-native aliases/collision logic and static capability files are deleted; focused Web suite passes | Historical skill/mention references are non-executable presentation data |
| Donor migrations and runtime schema readers/writers | Old Product/Provider runtime lineage competing with fresh Product Store | Fresh Product/System capability/Automation schemas and opaque Engine binding | Donor migration tree and orchestration/provider persistence layers are absent; Product/HTTP/WS/workspace/checkpoint/attachment preservation suites pass | Fresh packaged-store recovery was not rerun as a packaged Electron journey |
| Automation execution seam and provider-shaped definition fields | Scheduler/definition/memory/notification are Product value; old reactor and static provider/runtime/interaction fields were execution authority | Management-only Automation RPC/repository; Product admission is required for future execution | Run reactor deleted; definition/repository/UI no longer persist provider/model/runtime/interaction authority; contracts 27, Service preserved matrix and focused Automation tests pass | `runNow` remains truthfully unavailable until Product admission exists; no hidden fallback |
| Desktop donor migration/alternate backend assumptions | Update, startup, supervision, AppSnap and Browser are mature Desktop mechanisms | Existing Desktop supervisor and one Native Host topology | Donor migration recovery removed; Desktop 9 files / 138 and Native Host 2 files / 23 pass; boundary test proves one Host/transport direction | Packaged Electron startup/fault journey remains unproven here |
| Host-external Pi/Claude runtime dependencies | Executable SDK ownership outside Host | `apps/native-host` only | Native Host boundary 4/4 plus final-source mac/arm64 ZIP build prove production ownership, one socket direction, 230 exact packaged dependency identities and staged Host inclusion; packaged isolated startup proves exactly the Service/Native Host topology | Artifact is unsigned/unpublished local verification only |
| Checked-in Web legal closure | Public Settings-linked metadata still described the deleted 238-component donor graph | Existing deterministic release legal generator and the three canonical Web legal files | r5 regeneration produces inventory/SBOM/notices for 230 components; eight retired dependency IDs have zero hits; `licenses:check` passes; Web and Service-client build copies are byte-identical; same-source ZIP and packaged startup pass | Requires renewed independent review; no validator or parallel manifest was added |
| `packages/contracts/src/threadHistory.ts` donor fields | Persisted old conversations still need lossless read presentation, but must not become command authority | Read-only historical schema owner | Command-like defaults were removed; current Web uses `ConversationInteractionMode`; named boundary permits `ProviderInteractionMode` only in `historicalConversation.ts` | Schema/type export remains for lossless history decoding; it is not a Product admission input |
| Current Product `plan` control | Shift+Tab and composer persistence advertised a mode absent from `ProductRequestedSelection` / `queuePut` | No Product execution mode; historical Conversation presentation only | Current composer uses local `ConversationInteractionMode`; Product route forces default, clears stale mode and blocks writer/toggle; real full-route browser test focuses the actual editor, sends Shift+Tab and proves no Plan UI/state | Historical donor Conversation rows may still display their recorded plan state |

## Changed and deleted paths

The coherent candidate includes the following exact retired roots and entrypoints (their colocated tests are deleted with
the source unless a retained test is named):

```text
apps/service/src/agentGateway/**
apps/service/src/browserAutomation/**
apps/service/src/externalMcp/**
apps/service/src/orchestration/**
apps/service/src/provider/**
apps/service/src/providerUsage/**
apps/service/src/persistence/Migrations/**
apps/service/src/persistence/Layers/{Orchestration*,Projection*,Provider*,QueuedTurnPromotions*}
apps/service/src/persistence/Services/{Orchestration*,Projection*,Provider*,QueuedTurnPromotions*}
apps/service/src/automation/{Layers,Services}/AutomationRunReactor.ts
apps/desktop/src/desktopMigrationRecovery*
packages/contracts/src/{agentGateway,externalMcp,model,orchestration,provider,providerDiscovery,providerRuntime}.{ts,test.ts}
packages/shared/src/{agentMentions,migrationRecovery,model,providerDeliveryBlock,providerMetadata,providerUsage,runtimeMode,serverSettings,threadSummary}*
apps/web/src/hooks/useProvider*
apps/web/src/hooks/{useComposerSlashCommands,useThreadHandoff,useThreadUnblock}.ts
apps/web/src/lib/provider*
apps/web/src/{cursorModelVariants,providerModelOptions,providerOrdering,providerUpdates}*
apps/web/src/lib/{codexReasoningEffort,runtimeMode}.ts
apps/web/src/components/settings/skillsSettingsModel*
```

Direct retained files changed to detach those imports and reconnect existing Product/Host/system ownership include:

```text
apps/service/src/{main,effectServer,http,wsRpc,serverLayers,serverRuntimeState}.ts
apps/service/src/automation/Layers/AutomationService.ts
apps/service/src/persistence/{AutomationSchema,SystemCapabilitySchema}.ts
apps/service/src/persistence/Layers/{AutomationRepository,Sqlite}.ts
apps/service/src/{checkpointing,workspace,terminal}/**
apps/desktop/src/{main,backendStartupBlock,backendSupervisionPolicy,appSnapManager}.ts
apps/native-host/src/{piRuntime,credentialBroker,responseFrame}.ts
packages/contracts/src/{automation,index,ipc,rpc,stats,threadHistory,ws,wsCompatibility}.ts
packages/contracts/src/product/{rpc,state}.ts
apps/web/src/components/{ChatView,Sidebar,BranchToolbar,ProviderIcon}.tsx
apps/web/src/components/chat/{ComposerCommandMenu,ComposerPromptEditor,SingleChatSurface}.tsx
apps/web/src/{composerDraftActions,composerDraftDomain,composerDraftPersistence,composerDraftStore,composerSlashCommands}.ts
apps/web/src/hooks/useComposerCommandMenuItems.ts
apps/web/src/lib/{automationDraft,automationForm,composerAutomation,searchRanking,threadModelSummary}.ts
apps/web/src/routes/{__root,_chat,_chat.$threadId,-automations.shared}.tsx
apps/web/src/productReadModel.ts
```

Verification additions are exact:

```text
scripts/execution-authority-boundary.test.ts
apps/web/src/components/ProductRoutePerformance.browser.tsx
apps/web/vitest.browser.performance.config.ts
```

The r4 repair additionally changed these bounded current-authority surfaces and colocated tests:

```text
packages/contracts/src/{keybindings,keybindings.test,threadHistory}.ts
apps/service/src/{keybindings,keybindings.test}.ts
apps/web/src/{keybindings,keybindings.test,shortcutsSheet,storeNormalization,types}.ts
apps/web/src/routes/_chat.tsx
apps/web/src/components/{ChatView,ChatView.logic,ProductChatJourney.browser}.tsx
apps/web/src/components/product/ProductRuntimePicker.tsx
apps/web/src/{historicalSourcePresentation,historicalSourcePresentation.test}.ts
apps/web/src/lib/{threadBootstrap,threadRename,threadRename.test}.ts
scripts/execution-authority-boundary.test.ts
```

The same shared candidate already contained the isolated-Host release dependency/legal-stage repair
in `scripts/build-desktop-artifact.ts`, `scripts/lib/{resolve-catalog,release-legal-metadata}.ts`, their
tests, package metadata and lockfile. r4 retained rather than re-authored it, then verified it through
focused tests and a real final-source packaged artifact.

The r5 repair changed only the existing generated legal sources and this handoff:

```text
apps/web/public/licenses/release-dependencies.json
apps/web/public/licenses/sbom.cdx.json
apps/web/public/licenses/THIRD-PARTY-NOTICES.txt
.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/retire-competing-execution-authority.md
```

The repository is intentionally uncommitted by this implementer. Because the shared tree also contains the accepted
predecessor and concurrent integration changes, independent review must use current `git diff --name-status` as the exact
per-file candidate inventory; this handoff does not misattribute all dirty paths to this receipt.

## r5 legal-source repair verification

| Command / inspection | Result |
| --- | --- |
| pre-generation checked-in inventory inspection | Reproduced r2 finding: 238 declared/listed components |
| `bun run licenses:generate` | PASS; existing generator wrote deterministic metadata for 230 components |
| inventory/SBOM/notices parse and eight-ID negative scan | PASS; inventory count/list 230, SBOM components 230, zero retired donor IDs in all three files |
| `bun run licenses:check` | PASS, exit 0; deterministic 230-component development-host metadata verified |
| source-to-build `cmp` over all three files in `apps/web/dist/licenses` and `apps/service/dist/client/licenses` | PASS; both build outputs are byte-identical to checked-in source; Service-client inventory is 230 |
| `node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 --output-dir <isolated r5 temp>` | PASS, exit 0 from r5 source; 230-component legal closure, 230 packaged identities, AppSnap arm64 and validated ZIP |
| `node scripts/verify-packaged-desktop-startup.ts --assets-dir <isolated r5 temp> --platform mac --arch arm64 --version 0.1.0-alpha.0 --timeout-ms 90000` | PASS, exit 0; isolated packaged Service/Native Host process tree |
| scoped `git diff --check` and changed-path inspection | PASS; only the three generated legal files plus this handoff belong to r5 |

## Verification retained from the r4 runtime-source repair

| Command / inspection | Result |
| --- | --- |
| `bun test scripts/execution-authority-boundary.test.ts scripts/native-host-boundary.test.ts scripts/lib/release-legal-metadata.test.ts scripts/lib/resolve-catalog.test.ts` | PASS; 4 files / 19 tests / 75 assertions; public donor-command/type/coercion negatives plus isolated Host and legal-stage closure |
| Web affected Vitest matrix including `productCutover`, keybindings, opaque history, rename, composer and automation/search | PASS; 14 files / 353 tests; localStorage warning only |
| `bun run test:browser -- src/components/ProductChatJourney.browser.tsx` in `apps/web` | PASS; 1 file / 7 tests; `available=true + auth=missing` is labelled, disabled, reconciled to durable `auth-missing`, not admitted and draft text is retained |
| `bunx vitest run --config vitest.browser.performance.config.ts src/components/ProductRoutePerformance.browser.tsx` in `apps/web`, after the final reconciliation edit | PASS; 1 file / 2 tests; real Product workspace/detail + full retained `SingleChatSurface`/`ChatView`, 40 switches, p95 within 80 ms, zero Long Tasks and heap within 24 MiB |
| complete Web performance config before the final narrow reconciliation edit | PASS; 3 files / 7 tests; not relabelled as post-edit evidence; the affected real Product route was rerun above |
| Contracts matrix including keybindings, Automation, Product state, RPC and WS | PASS; 5 files / 35 tests |
| Service preservation matrix plus keybinding migration | PASS; 11 files / 189 tests |
| `bun run --cwd apps/desktop test -- src/backendSupervisionPolicy.test.ts src/backendStartupBlock.test.ts src/backendStartupReadiness.test.ts src/backendReadiness.test.ts src/backendShutdown.test.ts src/appSnapManager.test.ts src/browserManager.test.ts src/browserAutomation/desktopBrowserAutomationHost.test.ts src/updateMachine.test.ts` | PASS; 9 files / 138 tests |
| `bun run --cwd apps/native-host test -- src/piRuntime.test.ts src/credentialBroker.test.ts src/responseFrame.test.ts src/server.test.ts` | PASS; runner collected 2 files / 23 tests |
| Typechecks for Contracts, Web and Service; final repair also reran Web, Scripts and Native Host | PASS; all named checks exit 0; Desktop/Shared were not changed by r4 and retain prior candidate evidence |
| `node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 --output-dir <isolated temp>` | PASS on final source; 230-component locked legal closure, 230 packaged identities, AppSnap arm64, rebuilt/validated ZIP, stale blockmap removed |
| `node scripts/verify-packaged-desktop-startup.ts --assets-dir <isolated temp> --platform mac --arch arm64 --version 0.1.0-alpha.0 --timeout-ms 90000` | PASS; packaged mac/arm64 startup and isolated Service/Native Host process tree |
| final-source DeepSeek real-provider Pi journey | PASS, exit 0 on Pi `0.81.1`; `packageGenerationMatched=true`; 3 dispatches with `attempt=[1,1,1]` and `automaticReplay=[0,0,0]`; Chat new, continued continuation and Agent new each settled with one assistant result plus thinking, usage and settlement; Agent tool start and settle observed; credential persistence and output leakage both false |
| Scoped `git diff --check` plus trailing-whitespace scan over new r4 files | PASS; no output |

The first full-route attempt exposed two invalid test assumptions rather than being hidden: the fixture lacked
`QueryClientProvider`/`SidebarProvider`, and a shell-only snapshot mounted the route wrapper without the composer. The final
test supplies production-required providers plus Product workspace/detail state. The initial back-to-back microtask loop
also produced one synthetic 77ms Long Task; separating committed switches by animation frames models distinct user actions
and makes the zero-Long-Task claim honest while preserving the 40 measured commits.

## Decisions and preserved boundaries

- Historical schemas are retained only for lossless display. No Product/Host writer, dispatcher or admission type imports
  them.
- An explicit runtime-model id is durable Product intent. Catalog or auth disagreement degrades that exact id to an
  unavailable requested selection; only a genuinely empty initial selection may choose the first configured Host model.
- Retired donor commands are dropped rather than aliased because no current Product behavior implements their promise.
  Source-neutral `chat.new*` and Product runtime picker controls remain the supported surface.
- Product conversation presentation may project `permissionPolicy` through the retained runtime-mode UI because this is a
  real `ProductRequestedSelection` fact. It does not project or invent a `plan` execution mode.
- Search ranking is source-neutral (`searchRanking.ts`); provider discovery names and static registries are deleted rather
  than aliased.
- Automation remains management/scheduling/memory/notification state. Execution is explicitly unavailable until a
  Product-owned admission exists.
- Desktop Browser automation remains under Desktop; only the orphan Product Service bridge was removed.
- Generated legal/provenance references were not blindly deleted because they may describe redistributed Native Host
  closure rather than executable ownership.

## Caveats and unproven done conditions

- No commit, deletion SHA, stage, push or merge was produced. The Work's exact deletion-commit and final-SHA conditions are
  therefore unproven and must be closed by the root integration operation.
- The r4 final runtime-bearing source DeepSeek real-provider Chat continuation/folder-Agent/tool journey is proven by the
  retained verification row above. r5 changes only public legal metadata and does not relabel or replay that secret-bearing
  traffic. The Xiaomi MiMo probe still settled with usage/lineage but produced no assistant/tool result; this remains a
  provider-specific empty-settlement residual, not a cross-provider PASS and not a production fallback requirement.
- Final-source packaged ZIP, exact legal closure and isolated startup/process topology are proven. Broader packaged fault,
  update, signing, notarization and publishing journeys are outside this local unsigned verification.
- Current human visual approval for all user-visible Provider/import/plan-control deletions is not recorded.
- Source-adoption disclosure was preserved; the final legal closure was mechanically regenerated/verified but not
  independently reviewed by this implementer.
- Repository-wide tests/builds and the Campaign final gate were not run. Focused green checks are not generalized beyond
  their named boundaries.
- Independent review must still challenge over-deletion, historical-schema isolation, Product admission truth and the
  exact current dirty-tree inventory. Implementation success is not independent acceptance.

## Dispatch identity

- role: `implementer`
- actorId: `retire_competing_execution_authority_implementer_r5`
- receipt: `aee22d5ec855416da1bcc24182202f15`
- predecessor receipt: `0a8729dd4f414cd29b5de90451542eae`
- predecessor review: `../reviews/retire-competing-execution-authority.md`
- promised output: `../handoffs/retire-competing-execution-authority.md`
- operation conclusion: implementation candidate ready for independent review; no Campaign claim self-verified

## Bounded typecheck-closure correction — 2026-08-05

### Outcome

`CANDIDATE` for independent review. The Freeze attempt identified four tracked ACP-only Service
scripts that remained inside the Service TypeScript compilation boundary after
`@agentclientprotocol/sdk` had been removed from Service ownership. The amended Work explicitly
authorizes retiring exactly those orphan fixture/benchmark files. This correction physically
deletes them; it does not restore the SDK, exclude `scripts` from TypeScript, add a shim, or change
the current Product/Native Host mechanism.

The existing handoff history above is preserved. This appended correction is linked to the same
[`Retire competing execution authority`](../work/retire-competing-execution-authority.md) Work and
addresses the typecheck blocker recorded by
[`Freeze the first production candidate`](freeze-first-production-candidate.md).

### Exact changed paths

Deleted by this correction:

```text
apps/service/scripts/acp-conformance-agent.ts
apps/service/scripts/acp-mock-agent.ts
apps/service/scripts/acp-wire-benchmark.ts
apps/service/scripts/compare-acp-wire-benchmarks.ts
```

Appended only:

```text
.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/retire-competing-execution-authority.md
```

The Work allowlist amendment was already present when this operation began and is not attributed
to this implementer. No package manifest, lockfile, tsconfig, runtime/session record, review,
Harness configuration, stage, commit, push or merge was changed.

### Verification

| Command / inspection | Result |
| --- | --- |
| tracked-path/status inspection plus repository reference scan before deletion | PASS; all four files were tracked and unmodified; no runtime entrypoint, package script or other code consumer referenced them; three imported the removed SDK and the fourth was only the orphan benchmark companion |
| physical absence plus scoped negative scan excluding task history: `rg` for all four script names and `@agentclientprotocol/sdk` | PASS; zero current source hits |
| manifest/lock scan for all four script names and `agentclientprotocol` | PASS; zero hits across root/workspace package manifests and `bun.lock` |
| `bun run typecheck` in `apps/service` | PASS, exit 0; `tsc --noEmit` |
| `bun test scripts/execution-authority-boundary.test.ts` | PASS, exit 0; 1 file / 6 tests / 32 assertions |
| two focused `ProductControlPlane.test.ts` cases: reopen seven Product responsibilities without donor migrations; reconcile `delivery_unknown` without replay | PASS, exit 0; 1 file / 2 tests, 30 skipped |
| root `bun run typecheck` | PASS, exit 0; 7/7 workspace tasks, cache bypassed |
| before/after SHA-256 plus `git diff --exit-code -- apps/service/package.json package.json bun.lock` | PASS; hashes stayed `14134aed...`, `bb9fe997...`, `789bc579...`; dependency owners and lock graph are byte-unchanged |
| scoped `git diff --check` and deletion stat | PASS; four script deletions only, 1,330 lines removed, no whitespace error |

### Decisions and caveats

- These scripts encoded superseded Service-side ACP execution/conformance authority and had no
  current owner or consumer after the accepted Native Host/Product authority cutover. Physical
  deletion closes the buildable residue without inventing compatibility state.
- Focused current-mechanism checks prove the authority boundary and two directly relevant Product
  recovery/persistence behaviors only. No live Provider journey, UI/visual gate, package build,
  repository-wide test/quality gate, final-SHA gate or Campaign completion audit was run here.
- This producer does not self-accept the correction. Freeze must select and verify a new coherent
  candidate after independent review and integration.

### Correction dispatch identity

- role: `implementer`
- actorId: `authority_retirement_typecheck_closure_implementer_r1`
- receipt: `cde4f34e307e4f8a88c5e178aa62f92e`
- predecessor receipt: `c8e3de64aeda4b3a87b45927af8590fe`
- predecessor review: `../reviews/align-product-completion-signals.md`
- promised output: `../handoffs/retire-competing-execution-authority.md`
- operation conclusion: bounded correction candidate ready for independent review; no Work or Campaign claim self-verified


## Bounded Product-owned Plugin/Skill anchor correction — 2026-08-05

### Outcome

`CANDIDATE` for independent review. The protected `PluginLibrary.tsx` document-contract anchor
still required the donor Provider marketplace/discovery implementation after that authority had
been physically retired. The validator now recognizes the executable current source: the
route-backed Packages/Skill re-entry remains reachable, current discovery is truthfully
unavailable, runtime capabilities come from the Native Host, no Provider marketplace or
cross-Provider fallback is queried, and future discovery/trust/compatibility/activation is
explicitly Product-owned.

This correction does not restore discovery, change `PluginLibrary.tsx`, create a catalog, or modify
any Product/runtime code. The route and generated route-tree anchors, fixed read boundary, stable
rule/path/message, and `executableSource` rejection of comments and quoted inert source remain
unchanged. Seven exact retired donor discovery identifiers now fail the same protected-anchor rule
if executable source reintroduces them; generic future Product query names are not denied.

### Exact changed paths

Changed by this correction:

```text
scripts/document-contract.mjs
test/document-contract.test.mjs
.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/retire-competing-execution-authority.md
```

The existing Work allowlist amendment for `test/document-contract.test.mjs` was present when this
operation began and is preserved without further editing. No product source, route, route-tree,
runtime/session record, Harness configuration, package manifest, lockfile, stage, commit, push or
merge was changed.

### Verification

| Command / inspection                                                                            | Result                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --check scripts/document-contract.mjs` and `node --check test/document-contract.test.mjs` | PASS, both files parse                                                                                                                                                                                                                                                                                                                         |
| `node --test test/document-contract.test.mjs`                                                   | PASS, 70/70; real repository green; fixed read/non-mutation behavior retained; token-only and quoted-inert anchors fail; removal and contradiction of each of four truthful current clauses fail; seven exact donor symbols and a restored donor component fail                                                                                |
| `node --test test/document-contract.test.mjs test/quality.test.mjs`                             | PASS, 98/98; document and governance quality fixtures are jointly green                                                                                                                                                                                                                                                                        |
| `bun run test`                                                                                  | FAIL, exit 1 in the existing shared Web candidate: 7/9 Turbo tasks succeeded, Web reported 46 failures across stale retired-authority expectations, storage fixtures, runtime provenance and compiler coverage; no failure references the two changed validator/test files, so this broader red is reported rather than modified outside scope |
| `bunx oxfmt --check scripts/document-contract.mjs test/document-contract.test.mjs`              | PASS                                                                                                                                                                                                                                                                                                                                           |
| scoped `git diff --check` and changed-path inspection                                           | PASS before handoff append; final scoped check repeated after this append                                                                                                                                                                                                                                                                      |

### Decisions and caveats

- The component anchor requires executable React structure plus four truthful consequences; it does
  not accept a bag of labels or an inert source-shaped string.
- The negative authority scan names only confirmed retired donor discovery symbols. It intentionally
  does not reject generic `pluginsQuery`/`skillsQuery` identifiers that a future Product-owned
  catalog may legitimately use.
- The repository-wide test red is not caused by this bounded document-contract change and remains a
  shared candidate blocker for its owning Works. This producer does not relabel the root suite green
  or broaden scope to repair those product tests.
- No independent acceptance, candidate SHA, Freeze gate or Campaign status is claimed here.

### Correction dispatch identity

- role: `implementer`
- actorId: `document_contract_product_anchor_implementer_r1`
- receipt: `b46fc8372aa54166b343def2d8f60236`
- predecessor receipt: `9085da975bde4724b77182c8a4f9a721`
- work: `../work/retire-competing-execution-authority.md`
- promised output: `../handoffs/retire-competing-execution-authority.md`
- operation conclusion: bounded correction candidate ready for independent review; no Work or Campaign claim self-verified

## Bounded Plugin/Skill anchor contradiction-boundary correction r2 — 2026-08-05

### Outcome

`CANDIDATE` for renewed independent review. Review receipt
`54a6b547974d4b819f5fa7adb8e21240` found one fail-open boundary in the r1 contradiction predicate:
an otherwise truthful component could add `<p>Provider marketplace is queried.</p>` as a standalone
executable JSX text node and still pass because the old negative regex recognized only source or
punctuation boundaries, not the opening-element `>` boundary.

The validator now uses one local `hasExecutableTextStatement` predicate for the two exact retired
discovery statements. It normalizes sentence whitespace, escapes the exact statement, recognizes
source, sentence and JSX opening-element boundaries, and requires an end-of-source or JSX closing
element boundary. It still operates only on `executableSource`, so comments and quoted inert source
remain unavailable as proof. Both standalone reviewer-form counterexamples now fail with the same
stable `ui.plugin-skill-anchor` rule, path and message.

### Exact changed paths

This r2 correction changes only:

```text
scripts/document-contract.mjs
test/document-contract.test.mjs
.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/retire-competing-execution-authority.md
```

No Product component, route, generated route tree, fixed input list, other validator family,
runtime/session record, Harness configuration, manifest, lockfile, stage, commit, push or merge was
changed.

### Verification

| Command / inspection | Result |
| --- | --- |
| `node --check scripts/document-contract.mjs` and `node --check test/document-contract.test.mjs` | PASS; both files parse |
| `node --test test/document-contract.test.mjs` | PASS, 72/72; includes direct `<p>Provider marketplace is queried.</p>` and `<p>cross-Provider fallback is queried.</p>` regressions while retaining all r1 fixtures |
| `node --test test/document-contract.test.mjs test/quality.test.mjs` | PASS, 100/100; document and governance quality fixtures are jointly green |
| `bunx oxfmt --check scripts/document-contract.mjs test/document-contract.test.mjs` | PASS |
| scoped `git diff --check` and changed-path inspection | PASS before this handoff append; repeated after append |

The repository-wide `bun run test` was not repeated because r2 changes only the bounded validator
and its Node fixture. The r1 handoff and FAIL review already record the same shared Web candidate as
red with 46 failures; this correction neither causes nor relabels that integration blocker.

### Decisions and caveats

- The fix is statement- and boundary-specific. It does not add generic marketplace, query, Provider
  or JSX token matching that could block a future Product-owned catalog.
- Route/routeTree predicates, fixed 14-file reads, source-literal filtering, seven retired-symbol
  negatives and all affirmative Product-owned surface clauses are byte-unchanged by r2.
- This producer does not self-accept the repair or claim a candidate SHA, Freeze gate or Campaign
  status.

### r2 correction dispatch identity

- role: `implementer`
- actorId: `document_contract_product_anchor_implementer_r2`
- receipt: `bceb0f3021304d29ac6988ebf2c1ce6a`
- mechanical predecessor receipt: `b46fc8372aa54166b343def2d8f60236`
- triggering review receipt: `54a6b547974d4b819f5fa7adb8e21240`
- work: `../work/retire-competing-execution-authority.md`
- promised output: `../handoffs/retire-competing-execution-authority.md`
- operation conclusion: bounded r2 candidate ready for renewed independent review; no Work or Campaign claim self-verified
