# Source review

> Nature: fixed-source research evidence. It does not grant production authority or Campaign status.

> Sections 1–9 preserve the evidence and decisions available at their original review dates. Where their former next-step language conflicts with the 2026-08-09 Occam reset, it is superseded by §10 and the current architecture/execution owners; it must not be executed as backlog. Section 10 owns only the current research comparison inputs, not production adoption.

## 1. Fixed input

- Repository: U1（exact source URL 只由根 `README.md` 的 adoption record 持有）
- Revision: `6aca3dcc505894481430967c2acb762b3dd1b358`
- Imported baseline: `vendor/ui`
- Tracked files at the fixed revision: 6,425
- Adoption mode: complete runnable provenance baseline, followed by responsibility-based surgery

The imported tree was compared against a separate `git archive` extraction at the same revision with no difference. This proves physical baseline exactness, not product adoption or compatibility.

## 2. Rights and lineage

- The fixed revision contains an MIT license with copyright attributed to T3 Tools Inc.
- Git history continuously includes the original original-upstream lineage and later contributors.
- A temporary downstream copyright change was later reverted before the fixed revision.
- The complete 4,014-file icon corpus is maintainer-authorized for retention, adaptation and redistribution in source and product artifacts. Screenshots, former product identity and other graphics remain excluded or require item-level rights and product-need review before a production candidate.

Legal text is preserved at `LICENSES/ui-mother-MIT.txt`. Source cleanliness must never erase authorship or legal provenance.

## 3. Product chassis facts

The source is not merely a renderer. It includes:

- Desktop lifecycle and process supervision;
- Web renderer and design system;
- Product server and transport;
- command admission and receipts;
- orchestration and projection pipelines;
- startup reconciliation and SQLite persistence;
- file, Git, terminal and attachment capabilities;
- external Agent gateways and provider processes.

Non-test TypeScript/TSX at the fixed revision, using one consistent filename filter:

| Area                            | Files |   Lines |
| ------------------------------- | ----: | ------: |
| `apps/server/src/provider`      |    95 |  47,097 |
| `apps/server/src/orchestration` |    47 |  24,679 |
| `apps/server/src/persistence`   |   141 |  16,848 |
| `apps/server/src/agentGateway`  |    33 |   8,748 |
| `apps/web/src`                  |   765 | 205,087 |
| `apps/desktop/src`              |    68 |  24,470 |

The Pi adapter alone is 2,944 lines. Fixed-source plan 006 explicitly records an intention to make the source product an authoritative Agent Harness. That design ambition is useful evidence, but it cannot become OmniMind authority merely because the code is mature.

Therefore “keep only UI and delete the whole server Runtime” is unsupported. The correct adoption unit is a responsibility: mature Product Control Plane mechanisms may survive when they preserve product facts and single authority; Engine-specific execution authority must be replaced when it competes with the native runtime.

## 4. Native Pi integration facts

`apps/server/src/provider/Layers/PiAdapter.ts` directly uses native Pi SDK capabilities, including:

- `createAgentSessionServices()`;
- `createAgentSessionFromServices()`;
- `createAgentSessionRuntime()`;
- `SessionManager.create/open()`;
- ResourceLoader-backed services;
- ExtensionRunner registered commands;
- model, Thinking, session, steer, abort and compaction paths.

This disproves the claim that the source can only reach Pi through a shallow RPC bridge. It already reaches the execution core and a substantial headless extension surface.

The same file also explicitly degrades or rejects important Host UI capabilities: terminal input hooks, widgets, header/footer, editor text/component APIs and autocomplete providers. Plugin mentions and plugin discovery are reported false. Native SDK use therefore does not prove complete Package UX compatibility.

### 4.1 Representative Package source gate

The first Package checkpoint selects exactly one executable source: `todo.ts` shipped in npm
artifact `@earendil-works/pi-coding-agent@0.81.1`. It is a representative stateful headless tool,
not a universal compatibility sample.

| Fact                        | Frozen value and observation                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm identity                | `@earendil-works/pi-coding-agent@0.81.1`; author `Mario Zechner`; repository `earendil-works/pi`; `gitHead` `20be4b18d4c57487f8993d2762bace129f0cf7c6`                                                                                                                                                                                                                                                                                          |
| npm artifact                | registry integrity `sha512-r6ovAsZOgAqbC/aU6s+/dPnv/sGZBuWyZNvi3pXjpbuX5wvp3XvGkQI7/VLvX2o9XpmpFaPUxKNym1WfkN/P8A==`, equal to `bun.lock`; fetched tarball SHA-256 `420113c0282160e6181656fd16cf18742f76bf9040ee3dfb9cb67e3e6ad5641c`                                                                                                                                                                                                           |
| executable source           | upstream path `packages/coding-agent/examples/extensions/todo.ts`; npm tarball path `package/examples/extensions/todo.ts`; installed, tarball and exact-revision upstream bytes all SHA-256 `e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2` and length 8,848 bytes                                                                                                                                                           |
| rights                      | package manifest declares MIT and the upstream revision's `LICENSE` normalized SHA-256 is `0457f5bcec3b3b211605dfb5d1a49042fd638f3686a410fe099c24a25af13c48`; root adoption path `LICENSES/pi-todo-MIT.txt` and release-retained Package-staging input `assets/licenses/pi-MIT.txt` are byte-identical responsibilities for the same exact legal text, each with raw SHA-256 `4f6a1985796db5225e3b1e59972bd47e07a27a0748427cb3d3c8fbf39f9311f0` |
| reviewed executable surface | imports only pinned Pi AI/coding-agent/TUI packages plus `typebox`; registers `todo`, `/todos`, `session_start` and `session_tree`; no network, process, filesystem or credential access appears in the selected file                                                                                                                                                                                                                           |
| Pi `0.81.1` load proof      | real `DefaultResourceLoader` from the sole Pi-owning `apps/native-host` workspace loaded the exact installed source with 1 extension, 0 errors, tool `todo`, command `todos`, and lifecycle handlers `session_start`/`session_tree`                                                                                                                                                                                                             |

The trust decision permits this exact source and reviewed surface only. `todo` is mature enough for
the checkpoint because its native tool owns mutable todo state and reconstructs it from Pi Session
branch tool-result details on `session_start` and `session_tree`; it therefore falsifies a second
Product todo store. Its `/todos` command depends on Pi TUI component APIs and is deliberately not a
supported Product surface in this headless checkpoint. The file still loads unchanged so its
tool/lifecycle semantics remain Pi-owned; Product simply does not expose the interactive command.
Process isolation contains faults but is not represented as a sandbox.

Reproduction on 2026-08-06 used a fresh npm pack, exact-revision raw source/legal reads with
20-second network bounds, byte digests, and a 20-second real loader probe. No provider credential,
response body or user resource was involved. Re-run this gate on source byte, npm integrity, Pi
version, ResourceLoader contract, legal override or selected-permission change.

At the fixed revision, Pi packages resolve to `0.81.1` through caret declarations. The exact npm artifacts for the four installed `@earendil-works/pi-*` packages identify upstream Git revision `20be4b18d4c57487f8993d2762bace129f0cf7c6`; their installed manifest bytes and that revision's MIT legal text are digest-bound in `assets/licenses/release-legal-overrides.json`. This proves package/source/legal provenance for the current generation, not production runtime compatibility. The separately inspected local Pi research tree is newer (`0.83.0`), which remains evidence of version-tracking pressure and the need for a conformance matrix.

Release legal output is target-derived rather than a static cross-platform catalogue. The checked-in Web files identify themselves as a development-host platform/arch snapshot. During Desktop packaging, inventory, CycloneDX SBOM and notices are regenerated from that target's staged production closure; the build then compares disclosed `name@version` identities bidirectionally with the actual ASAR. A missing packaged legal file is accepted only through an exact override locked to package ID, installed manifest digest, declared license, source revision and legal-text digest. This mechanism is packaging evidence for one target, not evidence that another platform has the same closure.

## 5. Local baseline results

Environment: macOS, Bun 1.3.14; the donor declares Bun ^1.3.9 / packageManager 1.3.12 and Node ^24.13.1, while the local Node used for repository work is newer.

| Check                                        | Result               | Interpretation                                                         |
| -------------------------------------------- | -------------------- | ---------------------------------------------------------------------- |
| `bun install --frozen-lockfile`              | pass                 | lockfile installs at the fixed revision                                |
| `bun run build`                              | pass                 | complete monorepo builds; warnings remain                              |
| `bun run typecheck`                          | pass                 | 7/7 tasks passed                                                       |
| `bun run lint`                               | exit 0, 364 warnings | not a clean lint baseline                                              |
| `bun run test`                               | fail                 | 5 files failed; 38 failed and 3,413 passed Web tests                   |
| `bun run test:desktop-smoke`                 | pass                 | Electron launched and the fixed desktop smoke completed                |
| migration lineage check in original Git tree | pass                 | released migration identifiers/names preserved across 77 tags          |
| donor brand check                            | fail                 | checker flags legal LICENSE and origin attribution as retired identity |

Most Web test failures share a storage-mock error (`storage.setItem is not a function`) across pinned, split-view and workflow UI stores. Three observed attachment-state failures do not share that single explanation. These failures are baseline defects or environment-sensitive tests until independently diagnosed; they must not be rewritten as “all upstream tests pass.”

The brand-check failure is not permission to alter legal text. It demonstrates that identity checks require explicit legal and research evidence boundaries.

The desktop smoke proves the unchanged fixed tree can launch through its upstream Electron smoke path on this macOS host. It does not prove product adoption, visual parity, Windows/Linux behavior or production packaging.

## 6. Compatibility conclusion

Current evidence supports four compatibility classes:

1. Native headless capabilities that can run unchanged through the official SDK.
2. Structured GUI bridges for select/confirm/input/status/progress-style interactions.
3. Real PTY capsules for packages dependent on raw TUI or custom terminal components.
4. Unsupported packages whose platform, lifecycle, native mutation or Host API requirements cannot be met honestly.

No evidence supports “all Gallery packages are mature,” “all TUI can become React,” “process isolation is a sandbox,” or “SDK integration automatically yields 100% ecosystem compatibility.”

## 7. Revalidation triggers

Re-run only the affected review when any of these changes:

- source revision or imported tree digest;
- license, contribution history or branded assets;
- Pi exact version, SDK surface or package format;
- Bun/Node/platform or packaged Electron path;
- native Host process boundary;
- structured UI bridge contract;
- a previously unsupported Package produces a reproducible counterexample.

## 8. Maintainer-initiated Synara v0.6.7 intake

### 8.1 Exact review boundary

This is a maintainer-initiated Gate A review and explicit Gate B decision under
[`source-update-intake.md`](source-update-intake.md). It does not replace the production adoption
record or claim that the full upstream range enters OmniMind.

- Production UI-mother baseline: `6aca3dcc505894481430967c2acb762b3dd1b358`.
- Reviewed source: the same repository URL owned by the root `README.md` adoption record.
- Frozen review candidate: `be6dcad3f63fa121fbe3180f257ba1ff128696c4`, tag `v0.6.7`, resolved
  from `origin/main` on 2026-08-05.
- Exact range: 26 commits, 223 changed files, 14,241 insertions and 1,550 deletions.
- The separately inspected local source tree was at `93545c979a0da74365e4134b361f4556f473d46f`
  and contained an unrelated untracked `.codegraph/`; it was not modified. Remote inspection used a
  disposable clone that was removed after review.
- Upstream `v0.6.7` release notes report its own full build/release/test gates green. This is an
  upstream claim useful for confidence and discovery, not OmniMind compatibility or acceptance
  proof. No OmniMind product gate was run during the read-only review.
- The candidate retains the MIT license and adds Emanuele Di Pietro to its copyright notice.
  OmniMind must preserve applicable attribution for actual copied or substantial adapted portions;
  it must not import Synara identity or release history.

The candidate is frozen for this intake even if upstream moves again. A future maintainer-initiated
review starts change discovery after `be6dcad3`, carries the deferred decisions below and reopens
them only when their trigger holds. `reviewed through` is not `adopted through`: production adoption
changes only after accepted implementation, provenance, legal closure and review.

### 8.2 Author-intent reconstruction and decision

The review separated source code form, mechanism/failure model, and underlying product judgment.
Incompatible donor nouns or deleted authority therefore caused semantic translation or a trigger,
not automatic rejection. Conversely, upstream quality did not authorize assumptions that are false
in OmniMind.

| Upstream change                                            | Problem and strongest insight                                                                                                                                                                               | Current OmniMind owner/evidence                                                                                                                                                          | Proposed disposition                                                                                                             | Cost or risk                                                                                                         | Required proof                                                                                                                     | Maintainer decision                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `28ca8dc`, `8c032e0`, `3da77360`                           | A deferred chat must never wait forever; detached favourite models need provider identity; guest-page annotation cards cannot rely on translucent composer glass                                            | Workbench; current deferred mount has only double-rAF, favourites lack provenance, annotation surface still uses `--composer-surface`                                                    | Direct/locally semantic adoption in active Workbench Work                                                                        | Shared Chat lifecycle and accessibility regressions if copied mechanically                                           | Exact-once fallback/cleanup, equal-name model a11y, opaque guest overlay                                                           | Accepted                                          |
| Selected `bb0ebf57` active UI mechanisms                   | Re-entry must not replay completed scroll/collapse motion; activity and latest Project must follow user work; native browser bounds require CSS-to-DIP zoom conversion                                      | Workbench and Desktop system capability; current tree has partial working-day/gutter logic but lacks live-only collapse watch, user-activity Project ranking and browser rect conversion | Semantic/direct adoption in active Workbench Work                                                                                | Large mixed commit also contains deleted AgentGateway/browser authority                                              | Per-mechanism tests, real zoom geometry, unchanged route/performance budgets, negative authority scan                              | Accepted only for enumerated active UI mechanisms |
| `325bfdf`, `92b77fe`, terminal portion of `93545c97`       | Terminal selection belongs to the exact adjacent Composer; unavailable capability must disappear; natural exit is not a destructive user close and must not issue a second `exit`                           | Workbench Terminal/system capability; current dock passes a no-op `Add to chat` target and lacks explicit exited lifecycle                                                               | Direct/semantic adoption in active Workbench Work                                                                                | Global callback could leak across split/dock; exit cleanup can destroy placeholders or resurrect tabs                | Pane-scoped target, no-target action absence, natural-exit process proof, final-dock replacement                                   | Accepted                                          |
| `e2efe48`, `210d6df`, notification portion of `93545c97`   | Completion identity must be stable across timestamp/status wobble; failure is not success; visible/focused product and native browser should not notify redundantly                                         | Product State owns Conversation/Run/receipt; Desktop owns system notification and focus truth                                                                                            | Translate to Product facts in separate completion-signal Work                                                                    | Direct Thread/Turn port would restore donor authority or miss Product unknown states                                 | Product Run identity/outcome matrix, resnapshot dedupe, route/dock visibility, renderer+Desktop focus defense, unread preservation | Accepted                                          |
| Browser runtime portion of `bb0ebf57`                      | Agent browser execution must not depend on a visible panel; hidden runtimes need bounded LRU, in-flight protection, popup safety and explicit human-takeover epochs                                         | Desktop system capability; current T4 deletes AgentGateway and no Pi browser tool path is accepted                                                                                       | Defer with trigger: real Pi/system browser capability wiring                                                                     | Direct port now would restore deleted invocation authority or advertise an inactive capability                       | Same visible runtime, max-budget/restore, human takeover, popup/download and cancellation proof under Pi path                      | Deferred, insight retained                        |
| `33bc59fc` Mic/Voice                                       | Avoid merged/resampled peak allocations; make start/cancel generation-safe; cancel on identity change; prewarm; admit uploads before buffering; constrain outbound transport                                | Workbench plus scoped Service capability; current recorder still merges arrays and has startup/provider-switch gaps, but first slice has no accepted active Pi voice contract            | Defer with trigger: truthful first-party voice capability is activated                                                           | Provider-specific prewarm/auth can become false Pi capability; upstream still uses deprecated ScriptProcessor        | Encoder parity/benchmark, startup cancel, identity switch, admission/transport, real capability truth                              | Deferred, mechanism accepted in principle         |
| `7529084`, sidechat/detail parts of `425a2d5`              | Sidechat creation is one deduplicated lifecycle with immediate activation, retained detail and prompt-failure isolation; only actually visible embedded chats lease detail; lease identity should be stable | Product State lacks accepted Product-owned sidechat fork/origin lifecycle; old orchestration is deleted                                                                                  | Defer with trigger: Product Conversation fork/origin and Run admission exist                                                     | Direct code calls donor orchestration and would create a competing navigation/state model                            | Concurrent create/dedupe, fork-before-prompt, retention/recovery, visible-only detail and stable subscription proof                | Deferred, insight retained                        |
| `115144a`, `877b66`, `3a58f51`, `1fa1c61`                  | External Engine discovery/interaction/update must use registry truth, containment, generation identity, provider acknowledgement, live version evidence and exact install-source updater                    | Execution assigns External Engines and Package private lifecycle outside Product Service; these paths are not in the first slice                                                         | Defer to External Claude/OpenCode Engine and Package Works                                                                       | Direct import would recreate Provider authority or mislabel Claude plugins as Pi Packages                            | Exact registry precedence/containment, stale-settlement rejection, acknowledgement race, live-refresh/update-source matrix         | Deferred, exact falsifiers retained               |
| `4db2587` GitHub Project import                            | Clone only into owned staging, lock destinations, bound concurrency/output, verify origin, promote atomically, cancel safely and recover a checkout when registration fails                                 | Product Workspace/Project plus scoped Git capability; feature is not in the first candidate                                                                                              | Defer with trigger: GitHub source is added to Create Project                                                                     | External side effects, auth, disk and recovery expand product scope; old input includes donor model selection        | Real clone cancellation, conflict/race, recovery, credential-safe errors and atomic Product registration                           | Deferred, design retained                         |
| File relocation and pending-interaction parts of `6c4153c` | Agents may emit ancestor-relative paths; durable interactions need reclaimable claim states without letting stale resolutions win                                                                           | Workspace containment and future Product structured interaction owner                                                                                                                    | Split disposition: interaction invariants defer to structured Question/approval; file lookup defers to privacy/permission design | Ancestor search can discover files outside workspace; current preview grant is not strong evidence of human approval | Explicit scope/consent, symlink/home containment and replacement-generation tests                                                  | Deferred, high caution                            |
| `e96845a` runtime quarantine                               | Unreplayable or externally claimed work must be quarantined and reconciled, never reconsidered blindly after restart                                                                                        | Product outbox/receipt/unknown-delivery path already forbids automatic replay and requires reconciliation                                                                                | Already covered semantically; keep upstream cases as falsifiers                                                                  | Reintroducing donor runtime would create a second writer                                                             | Existing Product crash/send-boundary/concurrent-claim/unknown tests remain green after deletion                                    | Accepted as already covered; no code port         |
| `95db14f` temporary-thread bubbles                         | Ephemerality should be visible rather than surprising                                                                                                                                                       | OmniMind local draft becomes a durable Product Conversation on send; no equivalent leave-and-disappear thread contract is accepted                                                       | Decline exact dashed-bubble code; reopen for a future scratch Conversation and express at the most truthful boundary             | Dashed sent bubbles would communicate a false lifetime and add visual noise                                          | A real ephemeral Conversation contract plus same-state visual review                                                               | Exact code declined; product insight retained     |
| `29f8ed8`, `e5ae7d4`, `3ccaa8e`, `8f8258f`, `be6dcad3`     | Use consistent icons, permit legal attribution, publish accurate release metadata                                                                                                                           | Source-neutral Pointer glyph and root legal/adoption owners already exist                                                                                                                | Pointer change already covered; apply only actual MIT attribution; do not import brand/release identity                          | Identity leakage or false claim that the whole release was adopted                                                   | Source/identity/legal checks against actual changed bytes                                                                          | Accepted only as provenance/legal obligation      |

### 8.3 Authorized implementation boundary

The maintainer explicitly approved this table on 2026-08-05. Implementation is limited to two
new bounded Works after the accepted authority-retirement commit and before Freeze:

1. [`Harden active Workbench mechanisms`](../.omp-flow/tasks/08-04-ui-chassis-takeover/work/harden-active-workbench-mechanisms.md).
2. [`Align completion signals with Product facts`](../.omp-flow/tasks/08-04-ui-chassis-takeover/work/align-product-completion-signals.md).

Every deferred row remains evidence with a concrete trigger, not current backlog, public ontology or
permission to widen either Work. Every direct or translated adoption must bind its actual source
commit/file, preserve required MIT attribution, pass its current OmniMind normal/failure/recovery
proof and receive a different-actor review. The root `revision` remains the immutable physical
baseline until the existing production adoption disclosure is deliberately updated to describe
actual selectively adopted bytes; it must never be changed to `be6dcad3` as if the whole range had
been merged.

## 9. Historical ACP SDK intake for the retired parallel OpenCode slice

This section records exact historical evidence only. The maintainer retired OmniMind's separately
built OpenCode/Product-control-plane slice on 2026-08-09. That decision does not remove the adopted UI
mother's existing OpenCode adapter or other Provider integrations from V1. Nothing below authorizes
restoring the parallel slice, and none of its old evidence proves the inherited adapter; it remains a
falsifier and protocol reference for the single-substrate implementation.

The F-13 wire owner is the direct dependency `@agentclientprotocol/sdk@1.3.0` from
`https://github.com/agentclientprotocol/typescript-sdk.git`. The exact npm artifact resolves with
integrity `sha512-i3h/efaeuMUFAO1HSfo97QZQnnvMd7wWBYtBsdL6UMZg3a78sk3Ffya5Xu7C7tYsXomXoDXJBAzQF2PcFKAhIQ==`;
its package license is Apache-2.0, its installed `LICENSE` SHA-256 is
`6ed4f049cce59e05197d585bdf8a39980b45d546d6ea718ee344555f3a867c3a`, and the package contains no
NOTICE file. The exact legal text is retained at
`LICENSES/agentclientprotocol-sdk-Apache-2.0.txt`. One isolated compatibility probe against exact OpenCode 1.14.40 passed initialize,
new/resume, prompt/update, typed cancel with a late update, correlated error and deterministic close;
the real probe did not emit a permission request, so permission rejection remains official-SDK
conformance-fixture evidence rather than relabelled live evidence. Version 1.2.1 was not probed.

Revalidation is triggered by any change to the SDK version, npm artifact or integrity; ACP schema or
behavior; the exact supported OpenCode version; a relevant security advisory or reproducible SDK
defect; or a product requirement for a newer protocol capability. An upgrade remains pinned to a
reviewed OmniMind release and must repeat the affected compatibility, conformance, resource-failure,
Pi-regression and packaged legal/SBOM proofs. The application never auto-updates or hot-replaces the
SDK at runtime, and incompatibility never authorizes a handwritten protocol path or silent Engine
fallback.

The production adapter delegates NDJSON/JSON-RPC framing and parsing, request IDs, response
correlation, schema validation, handler dispatch, cancellation and error responses exclusively to
the SDK. OmniMind retains only reduced-environment process supervision, byte/newline/mailbox/time
bounds, deterministic process-tree and scratch cleanup, exact binary identity, typed Product fact
normalization and no-ACK/no-replay/no-fallback receipt policy. Narrow process/resource/conformance
patterns were adapted from Synara tree `630f17e61abc478114bf83c1d740977c9f68b910` files
`apps/server/src/provider/acp/AcpSdk.ts`, `AcpSessionRuntime.ts` and
`apps/server/scripts/acp-conformance-agent.ts`; donor registry, gateway, Session/transcript/tool
authority, provider orchestration and branding were not adopted.

## 10. Maintainer-initiated current Pi/Synara baseline review

### 10.1 Exact boundary

The maintainer approved an Occam reset after the Gate A review: use one exact current Synara commit as
the responsibility and behavior comparison baseline, while using the latest stable Pi release as the
first technical lineage and ecosystem-compatibility baseline for the independent OmniMind Agent. This avoids a permanent `stable + selected HEAD fixes`
three-way model. It still does not claim that the Synara baseline bytes have already entered OmniMind's
production adoption record.

The local sub-repositories were inspected without modification. The dirty parent
`/Users/liuzaoqu/Desktop/Develop/πCode` was not used as source authority.

| Source           | Previous OmniMind anchor                                      | Selected V1 input                                               | Status                                                                                                                  |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Synara           | reviewed `v0.6.7`, `be6dcad3f63fa121fbe3180f257ba1ff128696c4` | exact current commit `02c8a6cb9948eba0afc828492764e7236965c61f` | sole responsibility/UI comparison baseline; implementation and adoption disclosure pending                              |
| Pi               | packages `0.81.1`                                             | stable `v0.84.1`, `53fa77ccd8a279eb87e92294ef3687b03ff80112`    | OmniMind Agent first technical lineage/ecosystem compatibility baseline; stock Pi remains a separate inherited Provider |
| Pi post-tag main | —                                                             | `936aff00918de1187f085f123c2812d8f2d67745`                      | read-only API/fix discovery only                                                                                        |

The selected Pi `todo.ts` remains byte-identical from the accepted `0.81.1` checkpoint to stable
`v0.84.1` (`SHA-256 e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2`).
This retains the artifact as a useful compatibility regression for the bundled OmniMind Agent; it
does not retain OmniMind's former staged activation/LKG platform or merge OmniMind Agent with stock Pi.

### 10.2 Structural evidence and accepted disposition

| Area                         | Exact observed source evidence                                                                                                                                                                                                               | V1 disposition                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-Provider execution     | Synara `ProviderAdapterRegistry`, `ProviderService` and native adapters already cover Pi, Codex, Claude, OpenCode and other providers with stop-first binding replacement                                                                    | Preserve the inherited substrate; remove competing Product/Provider paths                                                                                                                   |
| OmniMind Agent               | Pi stable provides a mature SDK/Session/Package ecosystem; Synara proves the shared Provider contract can host Pi-family runtimes                                                                                                            | Create a distinct bundled `omnimind` Provider derived from the Pi `v0.84.1` lineage, with its own version/config/session/state/package lifecycle                                            |
| Pi-family state isolation    | Pi `config.ts` derives `CONFIG_DIR_NAME` from package `piConfig`; `SettingsManager` and `ResourceLoader` use that module-level value for project-local settings/resources, so changing only a global `agentDir` cannot isolate project `.pi` | Use a distinct OmniMind Agent build/package or make config-dir instance-configurable; both global and project-local state use `.omnimind`, while stock Pi alone owns `.pi`                  |
| Stock Pi                     | Synara already has a direct Pi adapter and user-visible Pi Provider                                                                                                                                                                          | Preserve `pi` as a separate selectable Provider; never relabel or reuse its native state for OmniMind Agent                                                                                 |
| Agent / Chat                 | `projectContainers.ts` distinguishes ordinary folder-backed projects from Home/Studio containers; Studio routes and `studio.ts` already own managed workspace/output behavior                                                                | Map Agent to Project Thread and Chat to Home/Studio Thread; no new workspace/Conversation ontology                                                                                          |
| Groups                       | `spacesUiStore.ts`, store projections and Space contracts already own organization and restoration                                                                                                                                           | Present Spaces as Groups if desired; no `Group` aggregate                                                                                                                                   |
| Workbench                    | per-thread `terminalStateStore`, project/editor state, Explorer, viewer, Diff and Git journeys already exist                                                                                                                                 | Preserve source mechanisms; fix only reproduced regression                                                                                                                                  |
| Settings                     | `settingsNavigation.ts` already has a mature searchable taxonomy across Personal, Integrations, Coding, System and Archived groups                                                                                                           | Keep the taxonomy; do not replace it with a new four-domain settings architecture                                                                                                           |
| Bilingual UI                 | Exact source has locale-aware timestamp formatting but no product message catalog, locale switch or complete translation corpus                                                                                                              | Add one lightweight OmniMind message catalog after source reset; preserve source DOM/interaction and do not claim i18n inheritance                                                          |
| Provider ecosystem discovery | `providerDiscovery` contracts, Skills settings and PluginLibrary already expose provider-native resources; current PluginLibrary silently chooses the first discovery-capable Provider when selection lacks support                          | Restore the source discovery surface, remove the silent fallback, and add lifecycle actions only where the selected Provider already exposes them; no generic plugin runtime or parity work |
| Pi ecosystem                 | Pi `DefaultPackageManager`, `DefaultResourceLoader`, package CLI, settings, trust, cache and reload define the mature compatibility surface                                                                                                  | Reuse/adapt this surface inside OmniMind Agent under an independent state root; keep stock Pi lifecycle separate; remove cross-Provider PackageActivation/current/LKG                       |
| Desktop updates              | Synara Electron updater explicitly sets `allowDowngrade = false`; `canary:rollback` is a developer Git workflow                                                                                                                              | Verify update/failure/retry/reinstall; do not claim automatic application rollback                                                                                                          |
| Remote/SSH                   | No V1 prerequisite for preserving local Provider integrations                                                                                                                                                                                | Defer the whole product journey to V2                                                                                                                                                       |

This evidence changes the burden of proof. A divergence must identify a concrete OmniMind journey that
the exact baseline cannot support. The mere existence of current OmniMind code, tests or prior Campaign
evidence is not a reason to keep a duplicate responsibility.

### 10.3 Mechanism anchors inside the exact baseline

The commits below remain useful falsifier anchors, but they are no longer a cherry-pick backlog. They
are already part of the single exact Synara comparison baseline and should be restored or adapted by
responsibility where current OmniMind regressed.

| Commit                                                                                 | Mechanism                                       | Occam consequence                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| `84fe193d4382d090becb88a91830c35e4a017e6f`                                             | editable/saveable Explorer files                | Reuse; no observed-version platform                    |
| `f1782beee18788f2c7a2231ec23eca8d890d6ca3`                                             | long-thread Composer/activity latency           | Use real profile evidence; no arbitrary size benchmark |
| `b4f3aeb864bc9311bb6807c6d4e6e0a4069569a9`                                             | Windows Terminal activity polling               | Restore platform fix in the existing Terminal lineage  |
| `8bacc7475bc2b8efaba454d38de42148577e6c10`                                             | runtime polling/thread subscription performance | Reuse in the inherited Provider substrate              |
| `8f87cf5eaf8aa0f028097c14eb66f2959a12f7db`                                             | slow startup and late events                    | Keep as Pi startup/recovery falsifiers                 |
| `306494f892efdb884a1bff3013f4a77154253402`, `ed320bb4d634b9d1781e83d6a55a23ac36cda351` | commit→push→PR and serialized Git refresh       | Preserve the mature Git product journey                |

### 10.4 Adoption and revalidation

Implementation must compare current OmniMind to Synara `02c8a6c…` by stable responsibility and choose
only Restore source / Keep a narrow evidenced OmniMind difference / Delete duplicate. After actual
source bytes are accepted, the root `source-adoptions` block must record the resulting exact revision,
paths, rights and changes; this research decision cannot pre-authorize that production fact.

Pi stable `v0.84.1` is the first code-lineage and ecosystem compatibility baseline for OmniMind Agent,
not its permanent product identity or release cadence. The root adoption record must eventually disclose
the exact Pi-derived source paths, rights, modifications and bundled artifact. Synara's stock Pi Provider
remains distinct. Pi post-tag main is discovery only. Donor branding, blind merge, Remote/SSH, competing
Product/Provider authority, shared Package lifecycle, settings rewrite and semantic flattening remain out.

Synara `02c8a6c…` still declares `@earendil-works/pi-coding-agent` `^0.81.1`; the selected Pi baseline is
`v0.84.1`. That is an explicit compatibility port, not unchanged inheritance. The Pi-family adapter must
compile against the exact `0.84.1` SDK and re-run its session/model/stream/tool/interrupt/discovery tests
before the second module instance is introduced. A successful `0.81.1` source test cannot be reused as
evidence for `0.84.1`, and post-tag Pi main fixes cannot be silently mixed into the stable payload.

Re-run this review when either exact selected input changes, rights/security facts change, or a focused
OmniMind journey disproves the accepted disposition.

## 11. Maintainer-approved Synara `02c8a6c…712d88f` intake

On 2026-08-11 the maintainer approved adopting every change from exact baseline
`02c8a6cb9948eba0afc828492764e7236965c61f` through exact reviewed head
`712d88f98b9afed9a4617b78dc62a8f342d93177` that did not displace OmniMind's existing product
authority. The local Synara worktree was reviewed read-only and remained at the exact head. Gate B
approval was explicit; implementation then preserved the existing Product Orchestration, Provider
Registry, bilingual catalog, brand, first-public storage/update identities and settings ownership.

| Responsibility               | Adopted result                                                                                                                                              | Deliberate boundary                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance and Workbench     | App icon preference/layout, translucent sidebar, font-scale propagation, toast visibility accounting, transcript scroll takeover and focused UI regressions | Retain OmniMind icons and catalog; no donor brand asset or parallel theme/settings owner                                                                       |
| Provider/session reliability | Codex imported-history fork, Windows Bun PTY, updater quit intent, queue replay safety, ChatView recovery, Pi `max`, malformed-model isolation              | Preserve existing OmniMind skills/model composition and first-public updater authority                                                                         |
| Fork/source context          | Native Codex/Claude/ACP forks, source context and localized continuation affordance                                                                         | No generic cross-Provider durable fork authority; adapters keep native truth                                                                                   |
| Defaults                     | Luna/high defaults for fresh settings                                                                                                                       | No forced migration of an explicit existing model selection                                                                                                    |
| Device                       | iOS Simulator manager/helper, typed RPC/events/frame transport, right-dock pane, capture and user controls                                                  | Existing system-capability owner only; no second permission broker; Agent mutation fails closed without an exact approval receipt; helper sandbox fails closed |
| Release/identity             | No product behavior adopted                                                                                                                                 | Donor icons, changelog, version, release metadata and release identity excluded                                                                                |

The Device HID bridge adapts the Indigo layout/delivery mechanism from facebook/idb exact revision
`dd0cb550510331f2d11e9130cb003d2425688e28`; the canonical MIT text is retained at
`LICENSES/facebook-idb-MIT.txt` and beside the packaged helper source. This section is research
evidence only; the root `source-adoptions` block remains the production adoption authority.
