# Source review

> Nature: fixed-source research evidence. It does not grant production authority or Campaign status.

> Every section preserves evidence and decisions at its recorded review date. Former next-step language is historical and must not be executed as backlog. Current product contracts, adoption and work state are owned only by architecture, `source-adoptions.json` and `execution-brief.md`.

> Vocabulary normalization: historical `already covered` / `current-stronger` labels below are evidence snapshots, not valid future final dispositions. A new intake must map them through [`SOURCE-INTAKE.md`](../SOURCE-INTAKE.md): use `Adopt via existing owner` when the observable guarantee and upstream/equivalent falsifier are retained; otherwise use defer/decline and expose the material loss. This prevents a mixed commit from losing adoptable behavior merely because another part is a fixed divergence.

## 1. Fixed input

- Repository: U1（exact source URL 只由根 `source-adoptions.json` 持有）
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

| Fact                        | Frozen value and observation                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm identity                | `@earendil-works/pi-coding-agent@0.81.1`; author `Mario Zechner`; repository `earendil-works/pi`; `gitHead` `20be4b18d4c57487f8993d2762bace129f0cf7c6`                                                                                                                                                                                                                                                                                    |
| npm artifact                | registry integrity `sha512-r6ovAsZOgAqbC/aU6s+/dPnv/sGZBuWyZNvi3pXjpbuX5wvp3XvGkQI7/VLvX2o9XpmpFaPUxKNym1WfkN/P8A==`, equal to `bun.lock`; fetched tarball SHA-256 `420113c0282160e6181656fd16cf18742f76bf9040ee3dfb9cb67e3e6ad5641c`                                                                                                                                                                                                     |
| executable source           | upstream path `packages/coding-agent/examples/extensions/todo.ts`; npm tarball path `package/examples/extensions/todo.ts`; installed, tarball and exact-revision upstream bytes all SHA-256 `e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2` and length 8,848 bytes                                                                                                                                                     |
| rights                      | package manifest declares MIT and the upstream revision's `LICENSE` normalized SHA-256 is `0457f5bcec3b3b211605dfb5d1a49042fd638f3686a410fe099c24a25af13c48`; the historical checkpoint verified raw legal-text SHA-256 `4f6a1985796db5225e3b1e59972bd47e07a27a0748427cb3d3c8fbf39f9311f0`. The former root Todo transplant/license paths were retired when this source ceased to be a product adoption; Git retains their exact history. |
| reviewed executable surface | imports only pinned Pi AI/coding-agent/TUI packages plus `typebox`; registers `todo`, `/todos`, `session_start` and `session_tree`; no network, process, filesystem or credential access appears in the selected file                                                                                                                                                                                                                     |
| Pi `0.81.1` load proof      | real `DefaultResourceLoader` from the sole Pi-owning `apps/native-host` workspace loaded the exact installed source with 1 extension, 0 errors, tool `todo`, command `todos`, and lifecycle handlers `session_start`/`session_tree`                                                                                                                                                                                                       |

The trust decision permits this exact source and reviewed surface only. `todo` is mature enough for
the checkpoint because its native tool owns mutable todo state and reconstructs it from Pi Session
branch tool-result details on `session_start` and `session_tree`; it therefore falsifies a second
Product todo store. Its `/todos` command depends on Pi TUI component APIs and is deliberately not a
supported Product surface in this headless checkpoint. The file still loads unchanged so its
tool/lifecycle semantics remain Pi-owned; Product simply does not expose the interactive command.
Process isolation contains faults but is not represented as a sandbox.

This checkpoint remains historical Pi Extension lifecycle and compatibility evidence; it is not the
lineage of the current OmniMind Agent Todo. The current Todo is an OmniMind-authored,
product-bundled Session Extension with a smaller three-state full-snapshot contract and canonical
`turn.tasks.updated` projection. OmniMind neither directly installs nor forks/copies the upstream
`todo.ts`, `pi-todotools`, `avtc`, or `armory` implementations. Any future direct installation or
fork/modification is a new source decision under `PI-ECOSYSTEM-INTAKE.md`, not an inference from this
historical checkpoint.

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

This is a maintainer-initiated Gate A review and explicit Gate B decision under the protocol now
owned by [`SYNARA-INTAKE.md`](../SYNARA-INTAKE.md). It does not replace the production adoption
record or claim that the full upstream range enters OmniMind.

- Production UI-mother baseline: `6aca3dcc505894481430967c2acb762b3dd1b358`.
- Reviewed source: the same repository URL owned by the root `source-adoptions.json` record.
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

1. **Harden active Workbench mechanisms**.
2. **Align completion signals with Product facts**.

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

| Area                         | Exact observed source evidence                                                                                                                                                                                                               | V1 disposition                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-Provider execution     | Synara `ProviderAdapterRegistry`, `ProviderService` and native adapters already cover Pi, Codex, Claude, OpenCode and other providers with stop-first binding replacement                                                                    | Preserve the inherited substrate; remove competing Product/Provider paths                                                                                                                                                                   |
| OmniMind Agent               | Pi stable provides a mature SDK/Session/Package ecosystem; Synara proves the shared Provider contract can host Pi-family runtimes                                                                                                            | Create a distinct bundled `omnimind` Provider derived from the Pi `v0.84.1` lineage, with its own version/config/session/state/package lifecycle                                                                                            |
| Pi-family state isolation    | Pi `config.ts` derives `CONFIG_DIR_NAME` from package `piConfig`; `SettingsManager` and `ResourceLoader` use that module-level value for project-local settings/resources, so changing only a global `agentDir` cannot isolate project `.pi` | Use a distinct OmniMind Agent build/package or make config-dir instance-configurable; both global and project-local state use `.omnimind`, while stock Pi alone owns `.pi`                                                                  |
| Stock Pi                     | Synara already has a direct Pi adapter and user-visible Pi Provider                                                                                                                                                                          | Preserve `pi` as a separate selectable Provider; never relabel or reuse its native state for OmniMind Agent                                                                                                                                 |
| Agent / Chat                 | `projectContainers.ts` distinguishes ordinary folder-backed projects from Home/Studio containers; Studio routes and `studio.ts` already own managed workspace/output behavior                                                                | Map Agent to Project Thread and Chat to Home/Studio Thread; no new workspace/Conversation ontology                                                                                                                                          |
| Groups                       | Synara exact source has `spacesUiStore.ts` plus Space UI/controllers; OmniMind HEAD does **not** have that file, but does have its own Thread `groupIds`, `ProjectionSpaces`, `GroupEditorDialog` and `ConversationGroupPickerDialog` owners | Translate upstream Space behavior into OmniMind Thread Groups and prove icon/suggestion, order/route restore, search/bulk selection, empty/void states and author-test parity; do not create a `Group` aggregate or copy Project membership |
| Workbench                    | per-thread `terminalStateStore`, project/editor state, Explorer, viewer, Diff and Git journeys already exist                                                                                                                                 | Preserve source mechanisms; fix only reproduced regression                                                                                                                                                                                  |
| Settings                     | `settingsNavigation.ts` already has a mature searchable taxonomy across Personal, Integrations, Coding, System and Archived groups                                                                                                           | Keep the taxonomy; do not replace it with a new four-domain settings architecture                                                                                                                                                           |
| Bilingual UI                 | Exact source has locale-aware timestamp formatting but no product message catalog, locale switch or complete translation corpus                                                                                                              | Add one lightweight OmniMind message catalog after source reset; preserve source DOM/interaction and do not claim i18n inheritance                                                                                                          |
| Provider ecosystem discovery | `providerDiscovery` contracts, Skills settings and PluginLibrary already expose provider-native resources; current PluginLibrary silently chooses the first discovery-capable Provider when selection lacks support                          | Restore the source discovery surface, remove the silent fallback, and add lifecycle actions only where the selected Provider already exposes them; no generic plugin runtime or parity work                                                 |
| Pi ecosystem                 | Pi `DefaultPackageManager`, `DefaultResourceLoader`, package CLI, settings, trust, cache and reload define the mature compatibility surface                                                                                                  | Reuse/adapt this surface inside OmniMind Agent under an independent state root; keep stock Pi lifecycle separate; remove cross-Provider PackageActivation/current/LKG                                                                       |
| Desktop updates              | Synara Electron updater explicitly sets `allowDowngrade = false`; `canary:rollback` is a developer Git workflow                                                                                                                              | Verify update/failure/retry/reinstall; do not claim automatic application rollback                                                                                                                                                          |
| Remote/SSH                   | No V1 prerequisite for preserving local Provider integrations                                                                                                                                                                                | Defer the whole product journey to V2                                                                                                                                                                                                       |

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
source bytes are accepted, the root `source-adoptions.json` must record the resulting exact revision,
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
evidence only; the root `source-adoptions.json` remains the production adoption authority.

## 12. Adopted provider-usage archive OOM follow-up

A maintainer-supplied packaged-App diagnostic bundle exposed thirteen Server-child `SIGABRT`
failures with V8 heap exhaustion while the Desktop process remained alive. Native crash stacks and
Server logs were consistent with asynchronous whole-file reads completing during local Provider
usage collection; renderer, GPU and macOS resource termination were not the cause.

Read-only comparison against adopted Synara head
`712d88f98b9afed9a4617b78dc62a8f342d93177` established the provenance:

- Synara `7360b55bff675cf4879bd196bf81916d4d53bce1` introduced 30-second local archive
  polling, up to 2,000 JSONL files, and whole-file `readFile("utf8")` plus line splitting.
- Synara `48d16d1e8e5d2656e687c60112d8ca54916b674d` increased archive reads to sixteen-way
  concurrency without adding byte, line or transient-memory bounds.
- Synara `3f579d74d66916e4c3128b4987bd47cacc755f57` kept local usage collection active in a
  header surface that explicitly hid the resulting usage lines.
- Synara `0e21939e4fac51ae8f03f4c5a76b694ef76996ef` restored shared batch polling under the
  assumption that request coalescing made the operation cheap; the batch still enriched live
  snapshots by scanning local archives.
- OmniMind transplanted these mechanisms unchanged in `a54ef5ba49ac496604cd05eeaad0646f37faca8e`;
  later namespace adaptation did not alter the usage behavior. Neither source contained a large
  archive regression test.

Historical hotfix disposition: Codex archive reads were changed to bounded tail reads; Claude
transcripts were chunked; reads gained concurrency, line and total-byte ceilings; live Provider
snapshots stopped owning local archive enrichment. Desktop automatic lifecycle starts retained the
existing give-up latch. That source-only reader and its focused tests were intentionally removed by
the final indexed-history replacement below; commit `efb8f3833bc082cccb496d1cde30bb614ccc5d00`
remains the provenance and safety-baseline evidence, not the current product contract.

### Maintainer follow-up: hotfix baseline versus final product contract

On 2026-08-11 the maintainer confirmed that `efb8f3833bc082cccb496d1cde30bb614ccc5d00`
is a required safety baseline, not the final archive product. The permanent design keeps both
Provider-native account capacity and complete local history analysis, but separates their queries,
UI state and failure domains. The 2,000-file/128 MiB/null behavior is retained only until the
incremental index replaces the request-time scanner; it is not accepted long-term completeness
semantics.

The approved replacement uses the existing OmniMind database as the sole writer-owned home for a
rebuildable derived index and consent/checkpoint state. A memory-limited child process reads only
explicitly approved Provider roots and returns bounded normalized batches; it never opens the
database or owns retries. Revalidate with checkpoint resume, append-only byte counts, file
replacement rollback, parser-version invalidation, symlink containment, worker kill/OOM isolation,
dual-locale UI and an exact-SHA packaged journey before describing the history feature as complete.
Focused source proof is now owned by `apps/server/src/usageHistory/indexerProcess.test.ts`,
`apps/server/src/usageHistory/UsageHistory.test.ts`,
`apps/server/src/providerUsage/index.test.ts`, `apps/web/src/hooks/useAccountCapacity.test.tsx`
and `apps/desktop/src/backendSupervisionPolicy.test.ts`.

## 13. Pi stable `v0.84.2` intake and candidate

The accepted source set is Pi stable tag `v0.84.2`, exact revision
`914cf1472e715297caa30db4b9535d534a9eb718`, and the exact `0.84.2` Pi-family npm
artifacts. The official coding-agent and AI package metadata points back to the same Git revision;
the coding-agent integrity is
`sha512-l4E+B7hgXKWddRo8bC/eSue2aWZjEgJ9xIpf5p0Og+lq8a2TArCwJ0HCoCPCgaBP/tN4zbYH/wOwvx9pJpeLCA==`
and the AI integrity is
`sha512-6MzsrYIYNVlE7SfpbL2yYb67Qo58p/7Q+xWG1RZvoX1P80aRCHSod2/13aFpxkow1lPO2LEh3c495J0Gwmyjig==`.
The exact family closure remains MIT-licensed and is locked at `0.84.2`. Post-tag revision
`086c32e74530564922d011ade23ff582c9d63116` was reviewed only for discovery and is excluded
from production bytes.

The relevant upstream delta preserves the existing public AgentSession lifecycle while fixing
programmatic prompt-template expansion, `sendMessage(..., { triggerTurn: false })`, custom system
prompt/current-working-directory handling, Provider retry and several Provider-specific stream/tool
edges. OmniMind adopts those stable fixes directly. The new SQLite Session backend, Agent Harness,
TUI surface and any new package or product control plane remain inactive and outside this slice.

The three existing OmniMind differences were semantically rebased without widening their owners:

- the generated product runtime keeps its isolated package identity/config directory and the bounded
  ModelConfig reader, mutation, package-resource and typed prompt-outcome seams;
- stock Pi keeps only the exact compiled typed prompt-outcome seam required by the shared adapter;
- Pi AI keeps only the request-scoped safe OAuth callback page renderer for OpenAI Codex,
  Anthropic, OpenRouter and Radius. The only OAuth select prompts consumed automatically are OpenAI
  Codex and Radius, and both still explicitly mark the first choice as default/recommended.

The strongest counterevidence was patch mechanics, not a product API conflict: the former
zero-context source patch could silently land across a shifted upstream lockfile, while the compiled
OAuth patch conflicted after upstream output moved. Both were replaced by contextual, source-matched
semantic rebases. The pushed product evidence below used the then-current reproducible archive
SHA-256 `a08d63bcfb691d936cea4a822b3e4c25b9152fd3f59ee5a5c13a04ab12525514`; its source,
stock and OAuth patch SHA-256 values were respectively
`c2233003a1c313488e09bf0a2e8fc1c293ab3ba9392226e637d09f592489895f`,
`7acead23cba0ac9243b85150049c8ab98a0f1d5d9ed05e133a17afd20165cc77` and
`ade36ccb1486d21504fd32cccdddc06810a179958fb4b0b32343a2708f6f4240`.
Clean-source generation, upstream lifecycle tests, frozen dependency installation, adapter/isolation,
OAuth, document and legal checks form the source/package candidate. Exact pushed product
`d88edd3dbfb88bb4dd1791bb0f7994b52740898f` subsequently passed direct Pi MiMo first-turn and
continuation plus DeepSeek first-turn probes, then produced and installed an arm64 App whose embedded
revision and four Pi package manifests report the same candidate and `0.84.2`. A fresh isolated
profile showed stock Pi `v0.84.2`, accurate zero-model-service setup, complete exit and same-profile
reopen. This is now product-level candidate evidence, not Campaign verification or release evidence.

On 2026-08-18 the then-unpushed `codex/retire-project-instructions` candidate kept the same exact Pi
revision and stock/OAuth patches while extending the sole product source patch to remove the false
Pi coding-assistant identity and navigation to docs/examples omitted from the archive, and to give
Pi's existing ResourceLoader an explicit canonical Project-root boundary or global-only context
mode. The same narrow seam preserves native per-turn Extension mutation, then normalizes and appends
the Host-owned immutable engine contract exactly once at final request composition; general
Host/tool guidance remains in Pi's mutable append lifecycle. Project trust is only
admitted by a real Agent Session; passive model/Skill/command discovery remains untrusted and
global-only, so it neither executes Project Extension factories nor exposes project-local resources
before admission. The regenerated product patch is
`4a6e091990c7d6fe89c21da40d7866c4b5a6311e3c3797a76a4152e9cc21d506`; the deterministic archive
is `aa47aec0a6b90e3e32385676aa444bad49f2b3efcc64275d2cd24f96f245deb9`. Its fixed-revision offline
build and 325 focused Pi tests pass. A 2026-08-18 live probe then exercised the product adapter
through credential-in-memory loopback pass-throughs to the official MiMo and DeepSeek
OpenAI-compatible endpoints: MiMo Chat and DeepSeek folder-backed Agent both completed first turn
and continuation, identified OmniMind and πAI-Lab, and returned the correct Chat/Agent overlay label;
the DeepSeek Agent probe retained that identity after a Project Extension replaced the mutable
system prompt. The pass-through only avoided persisting secret endpoints and did not translate the
upstream protocol. The maintainer subsequently authorized integration: merge
`b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` was pushed, rebuilt from that exact revision and installed
from the resulting arm64 DMG (`SHA-256 86857d371a0555f1e760b693993ed621335676d5da296a2f6165d262cdb4dea3`).
Two fresh-profile installed-App launches, including same-profile reopen, completed startup and clean
shutdown. This replaces the earlier installed-product evidence for this scope, but is not a signed or
notarized release claim.

On 2026-08-19 the Prompt Settings product decision required one further bounded change to the same
exact `914cf147…` product source: the native builder now exports its stable identity-neutral default
instruction segment and accepts a caller-supplied replacement for that segment. This remains an
input to the existing builder; dynamic tool snippets, guidelines, context, Skills, cwd, manual
SYSTEM replacement, Extension mutation and the final immutable OmniMind contract keep their native
owners and order. The focused upstream suite passes 328 tests. The current product patch is
`499b1257c2bc8f98beab1c799bcf669b3b1836f61a06349a2b52247ea1a873af`; the deterministic archive is
`b57b866dff4917eb24432a8292ee927139c34dd137208f5fcdff71cc337d37a7`. This source evidence does not
by itself prove a pushed or installed product candidate.

Rollback for this integrated slice is its first parent
`8066f23f92a8dbe35c052fc9bcdbd71d347f2c0a`, which already uses the product-owned Pi `v0.84.2`
baseline. No compatibility dual track is authorized or needed, and no maintainer choice remains open
for this exact source set.

## 14. Implemented Synara `712d88f…18ff998` intake; non-adoption decisions reopened

### 14.1 Exact boundary and counting rule

The fixed source is the same repository identified by the root adoption record. The read-only source
worktree was clean at exact head `18ff99857d5b84adab2019c2839fa4f6df761b7c`. The reviewed range is
exactly `712d88f98b9afed9a4617b78dc62a8f342d93177..18ff99857d5b84adab2019c2839fa4f6df761b7c`:
96 commits, comprising 80 non-merge commits and 16 merge carriers, across 337 changed files. The root
MIT text has the same SHA-256 at both endpoints,
`305724dd050ca7ded99c662de813d755bc4ec3887c4543a37159c6662ca36d1b`; no new rights exception or
release identity is inferred.

A 2026-08-17 audit of Codex task `01a00869-0192-7083-a024-919ff2b085b3` found no explicit maintainer
confirmation of the revised full decision surface. The maintainer authorized later direct work on
`main`, but that execution-location authorization did not approve the proposed defer/decline/covered
set. The 45 accepted non-merge commits were nevertheless implemented and remain factual current-code
evidence; the other 35 non-merge dispositions below and the treatment of 16 merge carriers were
reopened as proposals pending maintainer confirmation at that audit point. Section 15 records their
later corrected disposition and confirmation. `18ff998…` was the exact reviewed and implemented
source boundary at this historical checkpoint, not a claim that its whole tree, brand, version or
release bytes were merged or that all non-adoption decisions were then approved.

### 14.2 Accepted responsibility map — 45/45 closed

The evidence column names immutable OmniMind commits whose current descendants remain in exact product
`05782e94923242e2176a215ea74b2eee129584ae`. Where several upstream commits form one lifecycle, the same
stronger OmniMind evidence intentionally closes them together.

| Exact Synara commit                        | Accepted responsibility                                                                             | Current OmniMind owner                                                                    | Immutable implementation evidence                                                                                                                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2386d6a4c00661bb26f82137a3464dd0f974ad60` | Preserve the projector replay primary-key range scan and large-database SQLite bounds.              | `OrchestrationEventStore` / `Sqlite`                                                      | `85889edb57d31c03b3032b3e93a25cd22973638b`                                                                                                                                                                                 |
| `57eacdb897193a7eac5820060371d99ee4699a0b` | Authoritative stacked-PR projection/navigation plus conflict-safe merge expectations.               | `GitHubCli` → `PullRequestService` → existing PR list/detail/action owners                | `d97f3ad6e6c048c1788d0f09e592b64682704481`, `968b54126f311bf820ba1561ddc69d1ad7b7313b`, `7a285624abe87930c9daabf8ce68bbfcf2429bdd`, `78701868bc8c8ee1c79664aaf8b5937e85c9a354`                                             |
| `5bae54201969fdafb070a673ce17f488ac0a534d` | Preserve untrimmed tool-detail bytes while keeping title/name contracts strict.                     | provider-runtime item lifecycle contract and adapter consumers                            | `85889edb57d31c03b3032b3e93a25cd22973638b`, `ef83481cf2ed8cc9c06a713859ce8e58cca3a439`                                                                                                                                     |
| `bf07024a94f3b8f3eebc104216e80f2b1dc0cd51` | File-link Reveal/Copy context actions with localized, focus-safe fallback.                          | `fileReferenceContextMenu` and existing Chat/Workspace callers                            | `c4161b41f233c8a7e90af97882a8ff7fcd999a4c`, `857fef191d729573ed2c359c5b3184c7acd87f79`                                                                                                                                     |
| `c4a82e0efbc2d71e10c499dd606e04027fb6bc49` | Anchor compacted reasoning identity, time and durable sequence to the first update.                 | `agentActivity.logic` / Timeline ordering                                                 | `31ffc099518e827206b2305bb97d93073f8d0b95`, `646094d6808d3a612825cb62d3db0c928dc24538`                                                                                                                                     |
| `4fbc2f8dedde30fe4f77b2f0f179d84f60805436` | Treat a valid empty first-run snapshot as empty, not projection corruption.                         | `ProjectionSnapshotQuery`, desktop/chat-route recovery                                    | `4c93bc3f37361f9ba4982ab9c9231f3520da3e4a`, `78368b702905638c915a255c71b72001350f0f94`                                                                                                                                     |
| `7d59309428ba2a1ad53a8672486c93be914b9934` | Preserve exact local branch/worktree intent across thread switch and resume.                        | `ChatView`, BranchToolbar and draft/thread bootstrap                                      | `feba68da0ac017ac1922cae61b2e9639518cc3c6`, `2378481e95fe27df556fb2f10612abb7cc08d67c`                                                                                                                                     |
| `19902076b09b55205a95474fd7dc2d1fb0cb115d` | Deterministic cancellation proof for the same worktree lifecycle.                                   | branch/worktree browser regression owner                                                  | `feba68da0ac017ac1922cae61b2e9639518cc3c6`                                                                                                                                                                                 |
| `aff4c314303594e7239fbf8f3c45de4e86f0e6cc` | Make storage flush hooks safe in partial DOM environments.                                          | shared Web storage / persisted draft owner                                                | `85889edb57d31c03b3032b3e93a25cd22973638b`                                                                                                                                                                                 |
| `f9da8e841958dc9dfc473f6bdfceca79b21bb19d` | Bound stalled projection-cursor recovery and prevent permanent resnapshot loops.                    | projection pipeline, snapshot/RPC transport and Web recovery                              | `4c93bc3f37361f9ba4982ab9c9231f3520da3e4a`                                                                                                                                                                                 |
| `dd29079747eaeee096558a56275ce9a97b6f1879` | Preserve causal interleave of assistant text segments and tool rows.                                | runtime ingestion/projector → WorkLog/Timeline                                            | `6d4ba0f876313250c4668dc5679eba4c1437c49f`, `2c3dd0b8f992b9f501e8cba21335632a2f4d8f70`, `91f7b6596c2bbe4d0d8d24f968501ce1ed11d8a0`                                                                                         |
| `9c95c33dd80425b452270344d7c9ebff26152eeb` | Restore the settled branch and draft after a failed send.                                           | Chat branch/draft continuity                                                              | `feba68da0ac017ac1922cae61b2e9639518cc3c6`, `2378481e95fe27df556fb2f10612abb7cc08d67c`                                                                                                                                     |
| `00ff2f45442c365c1fc96671b4546065ebf4f9bb` | Refresh selected diff identity across staged/unstaged, content and theme changes.                   | `GitPanel` selected-diff render owner                                                     | `7f22b0b65b214d103f148b23181f6bf8aed48cd4`, `e3afdc56b7cd7176942379616838cefc7c7542cd`                                                                                                                                     |
| `8868394c47d9e8ab2557afe07c6f36a8556c0026` | Humanize unknown rate windows and place weekly overage deterministically.                           | `rateLimits` / `ProviderUsageLimitRows`                                                   | `0e0ee9ca118e9b4bf81b01aaa1e2ea9de5fc5d72`                                                                                                                                                                                 |
| `aa551a90962096287f7053cb5a3a704218ed73cc` | Collapse full task snapshots to one per-turn progressing row.                                       | `workLog`, session logic and `TimelineWorkEntryRow`                                       | `66745de284d429b975d72be56b43ffb14286fc2a`                                                                                                                                                                                 |
| `7fef8fbf9351faabbc31110d418fe7511785d6e2` | Preserve new-chat drafts across thread switches.                                                    | Composer draft and thread-promotion owner                                                 | `feba68da0ac017ac1922cae61b2e9639518cc3c6`, `2378481e95fe27df556fb2f10612abb7cc08d67c`                                                                                                                                     |
| `bcf7f1f1c90c4e8a3f5346b89f9fda3ee8dcc0e0` | Show a thin exact-cwd Pull only for behind-only branches.                                           | Header presentation reusing Git query/mutation owner                                      | `172d7cfb384e6e29de73480a606833ab67a7dc31`                                                                                                                                                                                 |
| `caf4123c17b66e2b2b2fcf3aa812a64233a0c99b` | Durable, race-safe automation failure/editing behavior.                                             | `AutomationService`, repository and existing automation UI                                | `a618f44e4f8ff3e01383803241480270f1d0b592`, `08402ce87e97cdd4365d987513a15e4a0a75b546`, `da1a107f8042d91f68105087633112ea33a69422`, `f780a0b88e5a6452a00aa62469582a04444b4627`                                             |
| `9a42dc9c256f696f0efc4aa71676b09a5a77b5b1` | Trim running OpenCode titles; blank titles fall back to exact tool name.                            | `OpenCodeAdapter` lifecycle title owner                                                   | `ef83481cf2ed8cc9c06a713859ce8e58cca3a439`                                                                                                                                                                                 |
| `0f5cbea31aa4cc617f6527f081c8babadee87538` | Keep branch mismatch warning attached to the Composer surface.                                      | `ComposerBranchMismatchNotice` / Chat branch owner                                        | `feba68da0ac017ac1922cae61b2e9639518cc3c6`                                                                                                                                                                                 |
| `79d263ac39640402d8c5e39f138a924611249ba2` | Preserve the branch-warning component shape while integrating the same lifecycle.                   | `ComposerBranchMismatchNotice`                                                            | `feba68da0ac017ac1922cae61b2e9639518cc3c6`                                                                                                                                                                                 |
| `d7e5b0684fc66caaeb908f979810fd15b1774dc0` | Close automation deferred-owner and saved-draft races.                                              | automation durability plus Composer draft promotion                                       | `da1a107f8042d91f68105087633112ea33a69422`, `feba68da0ac017ac1922cae61b2e9639518cc3c6`, `2378481e95fe27df556fb2f10612abb7cc08d67c`                                                                                         |
| `34fdede909a509aed9b131a8e3b1b9475a06e462` | Warm eligible provider catalogs for a new thread without changing selection truth.                  | `providerModelPrefetch` / new-thread bootstrap                                            | `907fbceb3875640fe11b029f6b039a46218324aa`, `6b612293a0bd232fe111714a36748db0d02c6ca2`                                                                                                                                     |
| `4097d84b7fc9f658ea27b8337c578a8cc2057e47` | Keep the prefetch resolver and tests inside that same owner.                                        | `providerModelPrefetch`                                                                   | `907fbceb3875640fe11b029f6b039a46218324aa`                                                                                                                                                                                 |
| `87a7ad161c97679fbfcc7d7f43ff3ebb5c011ac2` | Truncate oversized provider-runtime payloads rather than poison/quarantine the stream.              | provider-runtime event contract and persistence                                           | `85889edb57d31c03b3032b3e93a25cd22973638b`                                                                                                                                                                                 |
| `c589d69fa1abafe670f7fe77f6263afd5083dd7d` | Resolve prefetch cwd from exact worktree intent and actual availability.                            | `providerModelPrefetch` / thread bootstrap                                                | `907fbceb3875640fe11b029f6b039a46218324aa`, `6b612293a0bd232fe111714a36748db0d02c6ca2`                                                                                                                                     |
| `ac68608d7c540cd95c1e819c81dc988140569b69` | Preserve cwd/Droid/availability parity as hard tests.                                               | new-thread catalog-prefetch tests                                                         | `907fbceb3875640fe11b029f6b039a46218324aa`                                                                                                                                                                                 |
| `76b2925be278f24c1317d293f959142c6b048c6b` | Place the one settled assistant footer after recap and settled changes.                             | `MessagesTimeline` settled block                                                          | `2affc04a348b3ebaae81a7c15ca2f8e750078143`                                                                                                                                                                                 |
| `e3538b98a819602585e76e3b82f7c040a33f4a5a` | Preserve footer ordering as an author-equivalent regression.                                        | `MessagesTimeline` tests                                                                  | `2affc04a348b3ebaae81a7c15ca2f8e750078143`                                                                                                                                                                                 |
| `6fbed3a9e1f08a46a42967d5dbc39c8c1439248d` | Refresh the Windows runtime taskbar icon with a latest-generation fence.                            | `desktopAppIcon` / existing `main.ts` apply seam                                          | `a55b2cab7bebf27df46f3aef05855de304d40715`                                                                                                                                                                                 |
| `7e2e6ded3f4663382f9d6889fa27e8966691df16` | Add bounded filename/snippet search in the existing Workspace surface.                              | `WorkspaceEntries` → existing search sidebar/query                                        | `c0038039015fa6c623289a08b77421e35c15d709`, `48da69e7876ddbd47eccd5fc2f3fb3cfd4f85906`, `e70bf0e4f6ad6d1bb22d525c35486524a5b7ebbd`, `3875bca24f307368e49908b04f2a3bea7fe91bc6`, `c4e8e7bcaf85b2c60da46dd3f878a587a65530de` |
| `99ceea809833d53879fab6c4d2611f635298846e` | Keep search physically scoped and current-policy checked.                                           | `WorkspaceEntries` containment/ignore owner                                               | `48da69e7876ddbd47eccd5fc2f3fb3cfd4f85906`, `e70bf0e4f6ad6d1bb22d525c35486524a5b7ebbd`, `3875bca24f307368e49908b04f2a3bea7fe91bc6`, `c4e8e7bcaf85b2c60da46dd3f878a587a65530de`                                             |
| `0e477deb7c1f5030c48813f84f9aab0781d32d46` | Keep the search UI as one low-noise list, not a second palette owner.                               | existing Workspace search sidebar                                                         | `c0038039015fa6c623289a08b77421e35c15d709`                                                                                                                                                                                 |
| `bd68de26ae0483c62c5da20c548d51b487dce50b` | Offer persisted middle-message history-only forks with authoritative exact-prefix replay.           | `thread.fork.create`, orchestration projection/Reactor and existing message footer action | `47613073877c733d2585865e9ad65413d7a0a125`, `28bafbfd84712200e2e8cf389364f25218035168`, `05782e94923242e2176a215ea74b2eee129584ae`                                                                                         |
| `165e04ab3fa9eb6bad617b9fb7b71cc8874dd813` | Keep durable worktree cancellation as a branch-continuity regression.                               | branch/worktree browser test owner                                                        | `feba68da0ac017ac1922cae61b2e9639518cc3c6`                                                                                                                                                                                 |
| `a530530e0e34f3683ad8e202731e062f0f38c9fb` | Consolidate Commit dialog actions in the existing Git control.                                      | `GitActionsControl` and shared action resolver                                            | `895c526c2d6ff9dbe2e87820667fd155da9e17c4`, `66c548369418bc5eed6a99b6b7368da4c88cd226`                                                                                                                                     |
| `0162b5c298991365aaf65f64ad1c1827c5fc4ea7` | Preserve accessible disabled reasons for commit/push actions.                                       | Commit dialog action-row owner                                                            | `895c526c2d6ff9dbe2e87820667fd155da9e17c4`, `66c548369418bc5eed6a99b6b7368da4c88cd226`                                                                                                                                     |
| `2c72393ac64255594f7768de165523ad140b40d0` | Refine the message footer action glyph, including fork, within current optical geometry.            | `MessagesTimeline` footer and message-fork action                                         | `2affc04a348b3ebaae81a7c15ca2f8e750078143`, `47613073877c733d2585865e9ad65413d7a0a125`                                                                                                                                     |
| `a191dd8eb62c87bb09b801e0586bd6c8fe25ebe8` | Settle stale-generation terminal events exactly once instead of dropping them.                      | `ProviderService` terminal-settlement owner                                               | `facc827e5bc0facfb68b3f286731cb71b7747c0d`, `daf11de83889cd60b7fcb51defca7ec1680e3adf`, `198d8ab6a3de47379af261927341111b2c6e38d4`                                                                                         |
| `3616d7141705c581fa38f0b7978c00defc47e7ee` | Isolate streaming updates and bound catch-up work.                                                  | Web store/event router, streamed text and Timeline tail/overlap owners                    | `bf9a8eb4d4fb360ab822cf0b23c7fb6bd379931c`, `c59d544269f93f9702ffbd0033e76a02738413cb`                                                                                                                                     |
| `3e337e9f460d0816ede174932f33de07fa123157` | Close streaming-performance lifecycle findings without a second renderer.                           | same Web streaming owners                                                                 | `bf9a8eb4d4fb360ab822cf0b23c7fb6bd379931c`, `c59d544269f93f9702ffbd0033e76a02738413cb`                                                                                                                                     |
| `4979b6dd3737df7cc5a9a864ef68553f542b6d07` | Preserve backoff for superseded projections while fencing stale recovery.                           | EventRouter/projection recovery generation owner                                          | `bf9a8eb4d4fb360ab822cf0b23c7fb6bd379931c`, `c59d544269f93f9702ffbd0033e76a02738413cb`                                                                                                                                     |
| `558baee5c3fae3f2426ab067f3c33ddf2787935c` | Format message metadata by local calendar day without future-weekday lies.                          | pure `timestampFormat` used by Timeline                                                   | `2affc04a348b3ebaae81a7c15ca2f8e750078143`                                                                                                                                                                                 |
| `08da8c3ac2e555c43459750a408a6ee4e781b29f` | Keep the app `/fork` unique across native provider commands, with native fallback when unavailable. | Composer slash-command discovery/filter/execute                                           | `f6b9f2dcaf9ae15436683c7df81cd235ed30ada1`, `94d7442cfa6bfc97e53540441f9257782fe1e80f`                                                                                                                                     |
| `f8841ee659cd7fac9fa76a0a6bdd84746a9dff07` | Optically align the first footer action while retaining the current hit target.                     | `MessagesTimeline` footer geometry                                                        | `2affc04a348b3ebaae81a7c15ca2f8e750078143`                                                                                                                                                                                 |

### 14.3 Historical disposition map — superseded where §15.4 differs

This table preserves the exact commit accounting from the earlier review. Its defer/decline language
is not a current gate: §15.4 replaces every Goal, raw-event, debug, width and icon disposition with
standing-default adoption, and §15.5 is the sole list of proposed downstream divergences.

| Exact Synara commit                        | Disposition and reason                                                                                                                                                                                                                                                           | Revalidation trigger                                                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0c73c961fc5ccba55cf28ec34eabcab09dece1fd` | No-code: donor test formatting only; no independent product semantics.                                                                                                                                                                                                           | The corresponding current Settings fixture changes shape or fails formatting/type gates.                                                                                 |
| `66acd8c3bb017b51a2d27c4734e9b02aa0fcb3fc` | Merge carrier for projector replay; responsibility is already recorded under `2386d6a4…`.                                                                                                                                                                                        | A merge conflict introduces bytes not attributable to its parents.                                                                                                       |
| `c8e15cb0784a2a91415d2128bf70265f8b920495` | Superseded: adopt the bounded, sanitized unmapped-event diagnostic surface under §15.4.                                                                                                                                                                                          | Revalidate redaction, bounded retention and typed Timeline separation.                                                                                                   |
| `78a311969a0d05594b6f1cdd9fc08876d936e768` | Superseded: adopt appearance switching with OmniMind-owned light/dark assets.                                                                                                                                                                                                    | Prove the packaged macOS appearance-switch journey.                                                                                                                      |
| `65bbbe3d5899d32b05122217c8db90c270b16293` | No-code/current-covered: donor Windows CI dependency-install workaround is not part of OmniMind’s frozen release lane.                                                                                                                                                           | The current Windows frozen install reproduces the same dependency failure.                                                                                               |
| `40cb5e1a3e3ef7af460f71d2256cd7f94d65983f` | Superseded: adopt the evidence-first debug mode through existing permission, receipt and redaction owners.                                                                                                                                                                       | Revalidate bilingual presentation and secret-safe output.                                                                                                                |
| `129fed58297fd755f26be5d734130b6d860d1df0` | Current-stronger/no production adoption: OmniMind’s build-only lane strips ambient publication authority; upstream release-token policy does not authorize OmniMind release.                                                                                                     | Official release workflow/signing is admitted and its least-privilege token matrix is reviewed.                                                                          |
| `877d9778b7ba37a2aa5345a63f99b3012a334d44` | No-code: donor release checklist and clean-lane prose do not own OmniMind release truth.                                                                                                                                                                                         | OmniMind admits an official signed release and updates its own public-surface/release owner.                                                                             |
| `c7131c650145cd88c99e29633a4beb45c78fec34` | Semantically adopted: keep upstream Engine identity icons, localized availability feedback and status summary, while narrowly retaining OmniMind's stronger recovery policy that keeps unavailable-but-configurable Engines discoverable instead of filtering or disabling them. | A real picker journey loses an Engine icon/status, hides a recoverable Engine, or exposes availability that disagrees with the canonical local-config health projection. |
| `f3eff079db7f52895cf4647fa7dc8ebb83adcb4c` | Superseded: adopt standard/wide/full width preferences through the existing Workbench preference owner.                                                                                                                                                                          | Revalidate responsive fallback, persistence and bilingual labels.                                                                                                        |
| `0a1aa5c765a3f903c23c9ef00f8292789f162be3` | Merge carrier for branch continuity/OpenCode; no independent responsibility.                                                                                                                                                                                                     | A merge conflict introduces independent behavior.                                                                                                                        |
| `33ac3fd30b8f16df746d9189fd2c8352af2597ca` | Superseded: adopt ThreadGoal contract, persistence and projection in the inherited Product Orchestration.                                                                                                                                                                        | Revalidate migration, replay and reopen.                                                                                                                                 |
| `82487f12959b228853e0b5522c7b4eccc3de0b99` | Superseded: adopt `/goal` command and indicator.                                                                                                                                                                                                                                 | Revalidate command round-trip and bilingual presentation.                                                                                                                |
| `dd5f92fd6eac2bf242e6671a17c05533a2417900` | Superseded: adopt the Goal MCP mutation contract with explicit user intent and existing thread-write authority.                                                                                                                                                                  | Revalidate capability and privilege boundaries.                                                                                                                          |
| `701be6693110afc2ad1816a2f0693f5436e93d6c` | No-code/current-covered: donor browser-CI synchronization only.                                                                                                                                                                                                                  | The same current Chromium fixtures reproduce the timing failure.                                                                                                         |
| `d265e95888a6163acd6d06f79454e75105ba5d69` | Superseded: adopt Goal panel, pause/resume, timer and persistence migrations as one lifecycle.                                                                                                                                                                                   | Revalidate one projection/timer owner and packaged reopen.                                                                                                               |
| `91acd83853d6d525ba2d5ab4445995545f34c095` | No-code: removes donor-only CI workarounds that are absent here.                                                                                                                                                                                                                 | An equivalent workaround enters OmniMind and becomes harmful.                                                                                                            |
| `838ea204066c7687a26e9da9156555e44cb1017c` | Superseded: adopt Goal achievements and terminal-turn footer projection.                                                                                                                                                                                                         | Revalidate outcome truth, elapsed time and low-noise layout.                                                                                                             |
| `21a64cf70c13d93cdf6c0201eba8d5d920d08843` | Superseded: adopt the Goal timing snapshot fix with the lifecycle.                                                                                                                                                                                                               | Revalidate pause/resume elapsed-time accounting.                                                                                                                         |
| `b069b40b004acf573459342ba5c1b3b8a695b1f3` | Adopt the author test follow-up with the Goal schema.                                                                                                                                                                                                                            | Revalidate type and migration compatibility.                                                                                                                             |
| `346d0b7ccd565efc43a76806f7f6b0befdb5a79c` | Merge carrier for Goal work; no independent responsibility.                                                                                                                                                                                                                      | A merge conflict introduces independent behavior.                                                                                                                        |
| `c88b7608fcf39b5d3b2295a69ade068bddba41ab` | Merge carrier for footer ordering; responsibility is under `76b2925…` / `e3538b98…`.                                                                                                                                                                                             | A merge conflict introduces independent behavior.                                                                                                                        |
| `9f2513fe8f0ec7595d18225ccd01c891c0a10e17` | Merge carrier for footer/provider payload work; no independent responsibility.                                                                                                                                                                                                   | A merge conflict introduces independent behavior.                                                                                                                        |
| `67275d4000f271cd75d6913868324fda22e5f72a` | Merge carrier inside branch-preservation history; no independent responsibility.                                                                                                                                                                                                 | A merge conflict introduces independent behavior.                                                                                                                        |
| `776b3142668129e3a9be374d74d93c6c7262a300` | Merge carrier for Windows icon refresh.                                                                                                                                                                                                                                          | A merge conflict introduces independent behavior.                                                                                                                        |
| `685c33973f8c7cc5a04e886bde62e8536bec47a8` | Merge carrier for Workspace search.                                                                                                                                                                                                                                              | A merge conflict introduces independent behavior.                                                                                                                        |
| `28a3ed5b0d1a3539e8ab014052b909beb373e6db` | Superseded: adopt the Goal icon with the real command/panel.                                                                                                                                                                                                                     | Revalidate affordance and accessibility name.                                                                                                                            |
| `f34c3f51b9e2ebb4425e77743cbb9b975ffbf33a` | Superseded: adopt staged Goals and slash chips in the same Goal owner.                                                                                                                                                                                                           | Revalidate keyboard, IME, draft and round-trip behavior.                                                                                                                 |
| `859830ac4a6d71afa6df0a2551fb8fa6e6a56526` | Merge carrier combining branch and Workspace-search lines; no independent responsibility.                                                                                                                                                                                        | A merge conflict introduces independent behavior.                                                                                                                        |
| `e07e4fc84853f3ec9ddfaff935457067498b90c2` | Merge carrier for branch preservation; no independent responsibility.                                                                                                                                                                                                            | A merge conflict introduces independent behavior.                                                                                                                        |
| `d3d64ded15bb3921cdc85031707ce82e74d9a995` | Merge carrier for model-catalog warming; no independent responsibility.                                                                                                                                                                                                          | A merge conflict introduces independent behavior.                                                                                                                        |
| `0b0b15086d8817c93552890ca31954dcd1f42ece` | Merge carrier for Commit dialog actions; no independent responsibility.                                                                                                                                                                                                          | A merge conflict introduces independent behavior.                                                                                                                        |
| `84c3436a6eed6cfbc20e25f9916919279ae7be5f` | Superseded: adopt automatic Goal continuation inside the inherited Reactor/Ingestion lifecycle.                                                                                                                                                                                  | Revalidate settlement, queue priority, stop and recovery.                                                                                                                |
| `8d52c68885030b1f448c9c32513c93b4fb9b4247` | Adopt the formatting follow-up with Goal continuation.                                                                                                                                                                                                                           | Revalidate the author suite.                                                                                                                                             |
| `c1649c9ccb8948d537def5d8e47819bf4e14bfdc` | Adopt the type follow-up with Goal UI.                                                                                                                                                                                                                                           | Revalidate the author suite.                                                                                                                                             |
| `e187172845ce14cc1f04b8609254430b99b099be` | Superseded: adopt the continuation payload correction.                                                                                                                                                                                                                           | Revalidate event round-trip.                                                                                                                                             |
| `0f473550b98d4ce4d4fbec659cf8306a0cac83bf` | Superseded: adopt the Goal review fixes.                                                                                                                                                                                                                                         | Revalidate their exact race and lifecycle cases.                                                                                                                         |
| `0dfb3c03c24058ea0a4f0f632c72f1b46ed0b4a0` | Superseded: adopt passive Goal edits.                                                                                                                                                                                                                                            | Revalidate that edits do not start or reset work incorrectly.                                                                                                            |
| `f7164d3037e0af21e650cd4398d7132f0064041a` | Superseded: adopt the Goal continuation concurrency owner.                                                                                                                                                                                                                       | Revalidate stale fences, blocked retries and reopen.                                                                                                                     |
| `b10bd4a9698d85a3c48363ff3bd8057269e846ac` | Adopt the test typing follow-up with Goal continuation.                                                                                                                                                                                                                          | Revalidate the author suite.                                                                                                                                             |
| `b6890e5be8f9fa9d7f20469458c3c100d8a32ced` | Adopt the formatting follow-up with Goal continuation.                                                                                                                                                                                                                           | Revalidate the author suite.                                                                                                                                             |
| `3c2a138a5abb97d6f32b37292ad0eb8b2459d00a` | Superseded: adopt Goal continuation after eligible Terminal settlement.                                                                                                                                                                                                          | Revalidate priority, retry, stop and accurate outcome semantics.                                                                                                         |
| `661908cfde5e5d4ff9ccdc2c88f1c0e904f92983` | Merge carrier for Goal continuation; no independent responsibility.                                                                                                                                                                                                              | A merge conflict introduces independent behavior.                                                                                                                        |
| `ed6006456a2ff8ab10445ae84947548efa3035a1` | Superseded: adopt the upstream icon treatment while retaining OmniMind brand marks.                                                                                                                                                                                              | Revalidate user recognition, keyboard and accessibility behavior.                                                                                                        |
| `a17ebcb6df4362f3abea87c8c9484098dc8aea3c` | No-code: donor formatter output only.                                                                                                                                                                                                                                            | A corresponding current source change is adopted and requires formatting.                                                                                                |
| `9a9883b96c5a3c372e6d803b0c9897895e742995` | Current-stronger: request-time Codex archive tail scanning was a historical safety hotfix; the indexed usage-history owner replaced that scanner and separates capacity from history.                                                                                            | The indexed owner regresses or intentionally reintroduces request-time archive reads.                                                                                    |
| `b071abdf7235b489dc22a405ca9a4d0d82042d53` | Merge carrier for stale terminal settlement.                                                                                                                                                                                                                                     | A merge conflict introduces independent behavior.                                                                                                                        |
| `a4799f96297b0646554db8196c39cd2ff9d7f091` | Merge carrier for bounded Codex usage reads; no independent responsibility.                                                                                                                                                                                                      | A merge conflict introduces independent behavior.                                                                                                                        |
| `1d425f6600d88e25184714e5b43e94bfbc87cdad` | Merge carrier for streaming performance; no independent responsibility.                                                                                                                                                                                                          | A merge conflict introduces independent behavior.                                                                                                                        |
| `411082d31c3e53979630d9b4a07b4797e1099650` | Declined release identity: Synara `v0.7.2`, changelog, package versions and What’s New are not OmniMind product or release facts.                                                                                                                                                | Maintainer explicitly authorizes an OmniMind release with its own version/signing/publication evidence.                                                                  |
| `18ff99857d5b84adab2019c2839fa4f6df761b7c` | Current-covered: its macOS artifact traversal guard already exists in OmniMind’s build owner with the same directory-only safety, while release identity remains independent.                                                                                                    | The current helper validation regresses on mixed directory/archive output.                                                                                               |

### 14.4 Closure and revalidation

The 45 implemented semantic responsibilities remain factual current-product evidence. The former 51
“non-adopted/no-code” dispositions are not a valid closure: §15.4 now places Goal, debug, width,
raw-event and icon mechanisms under standing-default adoption, while §15.5 isolates the smaller set of
real downstream divergences that still needs maintainer confirmation. The Windows runtime icon
mechanism is source-closed but its real Explorer/taskbar packaged journey remains externally pending.

Re-run only the affected rows when the exact Synara head changes, rights/security facts change, an
explicit trigger above fires, or a focused current-product journey disproves the claimed implementation.
Do not turn this table into a cherry-pick backlog or infer acceptance from ancestry alone.

## 15. Synara `18ff998…8f9f600` adoption closure

### 15.1 Exact boundary and count closure

The read-only source is the maintainer-provided local checkout
`/Users/liuzaoqu/Desktop/Develop/πCode/synara`. On 2026-08-17 it is clean and detached at
`8f9f60045ea652db7d4a6822e2f723dde073f40a`, exactly equal to `origin/main`; its local `main` ref is the
older `661908cfde5e5d4ff9ccdc2c88f1c0e904f92983`. The prior OmniMind adopted boundary
`18ff99857d5b84adab2019c2839fa4f6df761b7c` is an ancestor of this exact reviewed head.

The range contains 101 commits: 78 non-merge commits in 23 PR/responsibility groups and 23 merge
carriers. It changes 63 files by `+4686/-438`. The previous accounting was `61 semantic-adopt + 2
current-stronger + 5 decline-exact/retain-insight + 10 donor-doc/no-code + 23 merge-carrier = 101`.
The 61 semantic responsibilities first entered through `22bbd70a6` and `d86d5766b`. The later atomic
adoption set through pushed product `3077bf253` closes the remaining
product mechanisms, whole-tree responsibility surface, author-equivalent tests and packaged journey;
the README adopted head therefore advances only with this authority closure.

A whole-tree comparison changes the governing interpretation. Across `apps/**` and `packages/**`,
OmniMind and exact Synara `8f9f600…` have 6,365 common paths: 4,785 are byte-identical blobs and
1,580 are modified at the same path. Synara has only 129 upstream-only paths and OmniMind 154
downstream-only paths. OmniMind Git currently has no Synara remote and contains none of the exact
Synara baseline commits, so there is no usable common merge ancestry despite the tree being a deep
downstream fork. Treating this relationship as an unfamiliar donor and manually cherry-picking every
mother commit created permanent synchronization tax and left complete upstream features such as
ThreadGoal never ported.

The historical verb matters. `goalMode.ts`, `threadGoal.ts` and `ComposerGoalHeader.tsx` never entered
OmniMind's commit history; there was no OmniMind commit that first contained and then deleted them.
Synara added the lifecycle through `33ac3fd`, `82487f1` and `d265e95`. OmniMind commit `fce4cb89f`
introduced the C0–C5 route and explicitly proposed not adopting Goal DB/UI/defaults; `bdfa8c18f`
later generalized ThreadGoal as a second control plane; `1809c36c9` reopened the choice after finding
no explicit maintainer confirmation. Git author configuration does not prove those route choices came
from the maintainer. The accurate status is **never ported / wrongly deferred**, not deleted.

On 2026-08-17 the maintainer explicitly confirmed the root definition: **Synara is the upstream
product platform; OmniMind is its downstream distribution, owning brand/bilingual
presentation, OmniMind Agent/Provider additions, stock-Pi isolation, release/account/public identity
and demonstrably stronger security differences.** Safe upstream mechanisms enter by standing default;
only proposed non-adoption, defer, current-stronger or high-risk divergence requires confirmation.

### 15.2 Implemented semantic responsibilities — 61 non-merge commits

| Synara group                               | Count | Pre-implementation gap and implemented destination                                                                                                                                                                                                                                            |
| ------------------------------------------ | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#709` restricted OpenAI credentials       |     1 | Restricted Provider children can still inherit unclassified `OPENAI_API_KEY`/Docker auth or later-registered credential names. Semantically adopt into the existing child-process classification and credential owner.                                                                        |
| `#712` duplicate Origin headers            |     1 | Trusted-origin parsing currently accepts the first duplicated value. Adopt fail-closed duplicate rejection in the existing origin gate.                                                                                                                                                       |
| `#715` malformed Claude auth JSON          |     2 | Malformed JSON can be recorded as “not attempted” and fall through when the subprocess exits zero. Adopt fail-closed auth classification and regression tests.                                                                                                                                |
| `#716` Codex prerelease hyphens            |     2 | `split("-", 2)` drops later prerelease components. Adopt full prerelease preservation in the existing version parser.                                                                                                                                                                         |
| `#705` UTF-8 stream truncation             |     1 | Byte truncation can cut a multibyte code point and emit replacement characters. Adopt boundary-safe truncation.                                                                                                                                                                               |
| `#708` multi-dot attachments               |     2 | Current extension extraction rejects names with multiple dots. Adopt the bounded filename fix and MIME regression.                                                                                                                                                                            |
| `#710` process-output UTF-8 boundaries     |     1 | Decoding each process chunk independently can corrupt split code points. Adopt one streaming decoder in the existing process runner.                                                                                                                                                          |
| `#711` Windows path casing                 |     3 | Current normalization only lowercases a drive letter; later Windows/UNC segments can compare case-sensitively. Adopt platform-bounded case-insensitive comparison without weakening POSIX behavior.                                                                                           |
| `#697` route-restore sequence fence        |     1 | Shell/full/repaired snapshots can bypass EventRouter sequence fencing. Adopt a coordinator through the existing router while preserving OmniMind's `requiresEmptyProjectShellRepair` semantics.                                                                                               |
| `#700` Provider adapter conformance        |     1 | Current adapters lack one shared capability-contract regression. Adopt a narrow conformance helper/test, not a second Provider registry.                                                                                                                                                      |
| `#704` server status CLI and runtime proof |     6 | Current `/health` does not give operators a failure-safe, identity-verified local runtime proof. Adapt as an OmniMind-branded status command using existing health/private runtime owners; do not widen public authority.                                                                     |
| `#707` private scratch workspaces          |    11 | Current scratch directories are plain OS-temp recursive directories without the donor's ownership, no-follow, reuse and mode checks. Adopt the security mechanism into OmniMind private state. Do not read or silently migrate donor-branded legacy paths and do not delete unknown old data. |
| `#706` secret env-assignment redaction     |    12 | Current argument redaction covers only a small set of flags/Bearer/token patterns and can leak shell/env assignments, encodings or substitutions. Adopt bounded, fail-closed redaction in the existing diagnostics owner.                                                                     |
| `#713` Provider env diagnostic redaction   |    16 | Structured/raw/truncated/nested Provider diagnostics still lack the latest bounded traversal and URL-authority protections. Adopt the hardening without logging raw secrets or copying donor fixtures into artifacts.                                                                         |
| `#692` OpenCode raw text deltas            |     1 | The current suffix-prefix overlap heuristic can discard legitimate repeated streamed text. Adopt explicit snapshot/delta state tracking in the existing adapter.                                                                                                                              |

These 61 responsibilities are implemented on `main` by `22bbd70a6` and `d86d5766b`. Their focused
tests and bounded live/runtime evidence close the listed defects at source level; they do not close the
whole `8f9f600…` upstream sync, advance the root adoption truth or authorize the non-adoption rows below.

### 15.3 Disposition of the remaining responsibilities in `18ff998…8f9f600`

| Synara group                                  | Count | Standing-default disposition              | Remaining work or deliberate difference                                                                                                                                                                     |
| --------------------------------------------- | ----: | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#714` normalized command-not-found           |     2 | `confirmed current-stronger`              | OmniMind keeps the structured `_tag`/`reason`/`code`/`cause` walk and imports the upstream regression case rather than replacing it with narrower string matching. Loss is exact code parity, not behavior. |
| `#698` sanitized Provider event fixtures      |     5 | `adopted`                                 | The author sanitizer/fixture lifecycle is retained with namespace and secret-safe artifact adaptation. It remains a test authority, not a second product owner.                                             |
| `#701/#702/#703/#696/#693/#699` upstream docs |    10 | `translated into sole owners`             | Verified mechanism, build and runtime facts enter OmniMind owners; Synara product name, release/account/public-origin claims and parallel instruction structure do not become OmniMind facts.               |
| 23 merge commits                              |    23 | `confirmed no independent implementation` | Parent/tree comparison found no separately attributable behavior. The later ancestry experiment must reclassify any independent conflict-resolution bytes it exposes.                                       |

### 15.4 Reopened `712d88f…18ff998` product choices — corrected disposition

The prior 51-row map in §14.3 remains the exact audit record, but its material choices require a new
disposition because the old map treated inherited mother capabilities as donor control planes. Under
the standing default, all safe product mechanisms below enter the current adoption set without a second
approval ritual:

| Reopened choice                                      | Corrected standing-default disposition                                                                                                                                                                                                                                                                                         | Adaptation boundary                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete Synara Goal lifecycle                       | Adopt the durable `ThreadGoal` contract/storage, `/goal`, Composer panel, pause/resume/timer, achievements, Provider prompt projection, MCP goal mutation, terminal-settlement continuation, Queue/approval/user-input priority, failure/interrupt auto-pause and stale/race fences. Goal remains distinct from per-turn Todo. | Reuse the inherited Thread/Product Orchestration and adapt namespace plus bilingual presentation. `e0ee9cfe2` is Todo projection only and is not a Goal substitute. |
| Raw unmapped Provider events                         | Adopt the upstream bounded, sanitized diagnostic event surface.                                                                                                                                                                                                                                                                | Keep untrusted raw bytes redacted/bounded and outside normal typed Timeline claims; do not discard the recovery mechanism.                                          |
| Evidence-first debug mode                            | Adopt the mode and its author lifecycle.                                                                                                                                                                                                                                                                                       | Adapt visible identity and bilingual copy; preserve existing permission, receipt and redaction owners.                                                              |
| `480/960/1440` chat-width presets                    | Adopt standard/wide/full preferences and responsive fallback.                                                                                                                                                                                                                                                                  | Store through the existing Workbench preference owner; no second settings store.                                                                                    |
| Dark icon autoswitch                                 | Adopt appearance switching.                                                                                                                                                                                                                                                                                                    | Replace Synara-branded image bytes with OmniMind-owned light/dark assets and prove the packaged macOS journey.                                                      |
| Global icon updates                                  | Adopt the upstream icon treatment and author interaction/AX expectations.                                                                                                                                                                                                                                                      | Preserve any OmniMind-specific branded mark; do not substitute unrelated donor identity assets.                                                                     |
| Sanitized author harnesses and follow-up tests       | Adopt with the upstream lifecycle they protect.                                                                                                                                                                                                                                                                                | Namespace/path adaptation is allowed; deleting mature author tests to avoid a local harness is not.                                                                 |
| Product mechanisms inside mixed release/docs commits | Adopt independently.                                                                                                                                                                                                                                                                                                           | Release identity does not make adjacent runtime or test behavior donor-only.                                                                                        |

### 15.5 Only proposed downstream divergences requiring confirmation

The following are the complete proposed exceptions to mother-default adoption. Each row states the
loss rather than silently treating “covered” or “no code” as approval:

| Proposed downstream divergence                                                                                                                                                                                                | Reason to keep it                                                                                                                                                                                                    | User-visible or maintenance loss                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Provider picker keeps recoverable uninstalled/sign-in setup routes instead of upstream installed-only filtering                                                                                                               | OmniMind Agent setup can make those services usable; hiding them would make recovery unreachable.                                                                                                                    | The picker is not exact upstream UI parity and needs its own availability regression.                                                    |
| Indexed Codex usage-history owner replaces upstream request-time bounded archive-tail scanning                                                                                                                                | The current owner separates capacity from history and avoids scanning session archives on every request.                                                                                                             | Exact implementation/test parity is lost; upstream regressions must be translated into indexed-owner tests.                              |
| Structured missing-command classifier and current macOS build traversal guard remain instead of narrower upstream patches; Windows/browser CI workarounds enter only when their failure reproduces in OmniMind's frozen lanes | Current implementations are equal or stronger and copying weaker/irrelevant fixes would duplicate code.                                                                                                              | Exact patch parity is lost; every upstream regression case still has to be imported or explicitly shown inapplicable.                    |
| Retire Synara's Project instructions localStorage/Thread-notes seeding surface while preserving Thread Notepad                                                                                                                | Its real behavior is a reusable Project→new-task notes template with manual and hidden writes, not runtime Project rules; keeping both scopes under “instructions/Notepad” creates a misleading second mental model. | OmniMind loses the per-Project textarea, manual copy/append and automatic Notepad prefill for first-send and Automation draft promotion. |
| Synara brand, release version/changelog/What's New, account/public-origin, marketing, signing/publication and prose identity bytes remain excluded                                                                            | Those bytes would make false claims about the OmniMind distribution and external authorities. Verified mechanism facts still enter the matching OmniMind owner.                                                      | OmniMind cannot copy donor release/docs verbatim and must maintain truthful bilingual distribution documents and assets.                 |
| Merge/format-only carriers receive no separate product implementation until ancestry proof exposes independent conflict-resolution behavior                                                                                   | No independent bytes are currently attributable to them.                                                                                                                                                             | Git topology remains absent, so future sync stays more expensive until the ancestry experiment succeeds.                                 |

The recommended root relationship is one product decision, not another stage gate: **Synara is the
upstream product platform; OmniMind is the downstream distribution.** After exact `8f9f600…` product
parity/dispositions close, configure a read-only Synara remote and test an isolated integration baseline
that records `8f9f600…` as a second parent while preserving the verified OmniMind tree, then attempt the
next upstream increment as a three-way merge. Until that experiment passes, do not claim common Git
ancestry or use a synthetic merge to hide unresolved product differences.

On 2026-08-17 the maintainer confirmed this root relationship and the original five divergence rows
after their losses were presented. On 2026-08-18, after a separate full route/store/dispatch/reopen
audit and exact Synara commit review, the maintainer also confirmed the Project instructions
retirement row and explicitly accepted loss of the reusable Project→new-task Notepad seed. The
remaining mother mechanisms are authorized for the current fact-closed adoption set and do not wait
for another execution-brief admission.

### 15.6 Whole-tree path/behavior closure surface

The baseline head-to-head inventory is 129 Synara-only paths, 1,580 modified shared paths, 4,785
byte-identical shared paths and 154 OmniMind-only paths. The exact pushed product
`3077bf253` against exact Synara `8f9f600…` has 94 Synara-only paths, 1,602 modified shared paths,
4,798 byte-identical shared paths and 176 OmniMind-only paths. Relative to `58f76446d`, the integrated
Thinking-status work and Engine picker regression add nine OmniMind-only paths without changing the
Synara-only, modified-shared or byte-identical counts. A NUL-safe Git tree map reproduces the final
counts; a locale-mismatched plain `comm/join` probe is not evidence. Raw count
is diagnostic only: namespace, bilingual copy and valid downstream owners can increase the diff.
Closure therefore uses the grouped product owner, behavior and author-test evidence below rather than
a 1,602-row parallel ledger.

| Responsibility/path group                                                                                | Current disposition                                                                                                                                                                              | Required closure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ThreadGoal, `/goal`, Composer Goal UI, prompt/MCP, continuation/recovery/race fences                     | Adopted in the inherited Thread/Orchestration owner; these files were never previously ported                                                                                                    | Unit/projection/reactor and browser regressions plus fresh packaged DeepSeek Goal→continuation→interrupt auto-pause→reopen→resume; Todo remains a separate 2/2 projection                                                                                                                                                                                                                                                                                                                                                   |
| Debug mode, bounded raw Provider events, 480/960/1440 width, global/dark icon behavior                   | Adopted with OmniMind namespace/catalog/assets and existing security/settings owners                                                                                                             | Sanitizer/negative regressions and author-equivalent browser cases pass; fresh packaged `/debug`→badge→`/default`, full-width and dark-icon settings persist across reopen                                                                                                                                                                                                                                                                                                                                                  |
| Profile `ShareCard`/`ShareDialog`/`shareCardExport`                                                      | Adopted local deterministic PNG render/copy/save only                                                                                                                                            | Bilingual local card copied successfully and saved as a verified 1720×880 PNG; no Synara social handles/domain/X/LinkedIn/Reddit links                                                                                                                                                                                                                                                                                                                                                                                      |
| External social sharing/public origin                                                                    | Confirmed identity/public-surface divergence: not activated                                                                                                                                      | Loss: no one-click social posting. Reason: OmniMind has no truthful public origin/handle evidence; re-open only with real OmniMind identity and explicit high-risk confirmation                                                                                                                                                                                                                                                                                                                                             |
| Web streaming `perf/**` harness                                                                          | Adopted under OmniMind namespace with no production runtime owner added                                                                                                                          | Real event→reducer→store→selector→timeline workload passes 19 streaming batches with exact final text, no page error and no long task                                                                                                                                                                                                                                                                                                                                                                                       |
| Space UI/controllers and `spacesUiStore.ts` family                                                       | Semantically translated into existing Thread Groups; no second Space store                                                                                                                       | Icon editor, order, sidebar expansion/route restore, search/bulk selection and empty states use Group/Sidebar owners; focused tests plus fresh packaged Group creation prove the path. `space.projects.assign` is intentionally translated to Thread `groupIds`                                                                                                                                                                                                                                                             |
| PR stack, workspace search, Git dialogs, automation risk/draft/edit, branch mismatch and Thread creation | Different-name owner parity audited and adopted in existing owners                                                                                                                               | Outcomes remain in `PullRequestStackNavigation`, explorer/`SidebarSearchPalette`, `GitActionsControl`, automation owners and `ComposerBranchMismatchNotice`; focused browser and author-equivalent regressions pass                                                                                                                                                                                                                                                                                                         |
| Provider fixture and missing-command regressions                                                         | Fixture adopted; confirmed stronger classifier retained                                                                                                                                          | Sanitized fixture author tests and the upstream missing-command case pass without replacing the stronger classifier                                                                                                                                                                                                                                                                                                                                                                                                         |
| Provider picker identity and readiness                                                                   | Semantically adopted in the existing Settings/Composer availability owners; the previous blanket `current-stronger` classification incorrectly swallowed the compatible icon and status behavior | `3077bf253` directly reuses `ProviderIcon`, local-config-normalized Server health and existing availability states; bilingual Chromium coverage proves available/sign-in/limited/not-installed/unavailable states, 480px containment and continued setup reachability for an uninstalled Engine. The exact pushed product was rebuilt, installed and reopened with a fresh isolated profile; the real Settings surface retained all ten icons, localized statuses, the availability summary and enabled setup reachability. |
| Release history / What's New                                                                             | Generic mechanism may be adapted, activation remains identity-gated                                                                                                                              | Loss: current Release history stays unavailable. Activate only from real OmniMind version/changelog/publication evidence; never copy Synara entries                                                                                                                                                                                                                                                                                                                                                                         |
| Synara/DP Code storage-origin and desktop-storage migrations                                             | Confirmed non-adoption                                                                                                                                                                           | Loss: OmniMind will not migrate data from Synara/DP Code legacy homes. The maintainer confirmed there is no predecessor user population; those identities are unrelated to OmniMind's first-public namespace, so running them could only risk reading or rewriting unrelated data.                                                                                                                                                                                                                                          |
| Automation consecutive-failure policy                                                                    | Confirmed semantic adoption: default `3`, with explicit `1`/`3`/`5`/keep-running choices                                                                                                         | A three-failure threshold can permit two more attempts than fail-fast, so side-effect-sensitive automations can explicitly choose `1`. Any success resets the consecutive-failure count; contract, migration, bilingual UI and author-equivalent tests share the same policy.                                                                                                                                                                                                                                               |
| Project instructions→Thread notes seed                                                                   | Confirmed downstream retirement; Thread-level Notepad remains                                                                                                                                    | Remove Environment UI, Settings/search, store/autosave, manual copy/append and first-send/Automation hidden `thread.meta.update`; do not migrate old text or delete existing Thread notes. Re-open only if a real per-Project notes-template outcome is required and can remain clearly distinct from runtime rules and task notes.                                                                                                                                                                                         |
| Synara marketing/assets/logo/handle/domain/release/account/signing/publication bytes                     | Confirmed identity divergence                                                                                                                                                                    | Keep truthful OmniMind assets, bilingual copy and distribution evidence; mixed commits must still contribute their product mechanisms                                                                                                                                                                                                                                                                                                                                                                                       |
| Indexed Codex usage, missing-command classifier and macOS build traversal guard                          | Confirmed current-stronger divergence                                                                                                                                                            | Retain each upstream regression test or show it inapplicable; Windows/browser workarounds enter only after reproduction                                                                                                                                                                                                                                                                                                                                                                                                     |

The 94 Synara-only paths close under the responsibility groups above: identity/marketing and release
facts remain confirmed divergences; legacy-identity migrations are permanently excluded by the
maintainer; the Project instructions paths are an explicitly confirmed retirement with Notepad kept
in the existing Thread owner; migrations that carry product semantics are renumbered/translated;
Space paths map to Thread Groups; usage, Git, search, automation, branch mismatch, PR stack and
creation behavior reuse their existing OmniMind owners; author tests are retained or equivalently
adapted. The 1,602
same-path differences group under Web/Workbench, Server Provider/Orchestration/Persistence,
AgentGateway, contracts/shared, Desktop integration and the fixed downstream divergence categories.
For each group the table points to the behavioral owner and author-equivalent evidence; absence is no
longer treated as silent non-adoption or closed merely by a matching filename.

Full adoption validation on exact pushed ancestor `58f76446d` passed the complete repository test graph (Server
4,207 passed/16 skipped across 358 passed/3 skipped files; Web 4,107 passed across 320 files, with the
remaining packages green), all six package typechecks and all four package builds. The final closure
also preserves the earlier document-contract 20/20, Goal, migration/backup/replay, slash/browser,
Group/PR/icon and streaming-performance evidence. A newly built macOS arm64 DMG has SHA-256
`fbaa5500be5db54436ae8e40406c9a80f89075b31829146723546612d3006a0a`; `app.asar` embeds the full
product SHA. Its ad-hoc installed App used fresh profile `/tmp/omnimind-final-58f76446d` with isolated
HOME, XDG roots, OmniMind home and Provider private home, and runtime process arguments proved that
the main process, Helpers and bundled Server all used those roots.

The final packaged journey proved a real DeepSeek `/debug` turn, Goal set→automatic continuation,
manual pause/resume, a separate two-item Todo projection while Goal was paused, running-turn interrupt
auto-pause, persistence across close/reopen, and a deliberately induced recoverable credential-read
failure that left Goal paused before the credential permission was restored to `0600`; the following
reopen rediscovered DeepSeek without fallback. It also proved wide `72rem` CSS projection, durable
dark-icon selection, local Profile PNG rendering/copy and local Thread Group creation. The previous
exact candidate had already proved the unchanged `/default` and Profile native-save path (1720×880
PNG); author-equivalent tests retain save/copy failure feedback and Automation default 3 with explicit
1/3/5/keep-running choices. Migrations 1–100 succeeded; the only packaged error was the intentional
credential-unavailable failure, which surfaced honestly and recovered without touching real user
state. Earlier bounded live probes also returned valid 2xx response shapes from MiMo and DeepSeek.

The current exact pushed product `3077bf253` additionally passed the focused Provider picker unit and
bilingual Chromium graph (47 unit tests plus six browser cases), Web typecheck, touched-file lint,
production Web build and document contract. Its arm64 ad-hoc DMG has SHA-256
`fae7e7a6b42907f36aa0f1e235eddef7f14d3d0ddbdb1a9cecf47f3d4d7950ea`; a new fresh profile proved
main/Helper/bundled-Server isolation, all ten Engine icons, localized readiness, availability summary,
continued uninstalled-Engine setup reachability and close/reopen. Together with the unchanged ancestor
journeys above, these satisfy the adopted-head invariant for exact Synara `8f9f600…`; they do not claim
an official signed/notarized release.

## 16. OmniMind live-status visual adoption

### 16.1 Fixed sources and rights

The maintainer selected two bounded MIT sources for one existing Timeline presentation owner:

- `thinking-orbs@0.3.1`, npm `gitHead` / Git revision
  `bd204b73c9b6660fad7210b1ad48d9dc2adbb89d`, registry integrity
  `sha512-3BG1aeB1RUTxItCml/BBuIz5JRM4kZqGuyx+vouv0fXTtcR9ZNoKjWGneHPx94y74GxgArwJZ1qbJR5dt54kSw==`
  and tarball SHA-256 `f561ab192d0f80a367c2cf56d9fd409f3dc0570521c08300c3bbf232ede79296`;
- BitFun historical motion commit `f9aebc102b21d6d4ac3ffd4088defebf7f4baff1`, with the later catalog
  reference snapshot `142d7e38729b3d646ae305c162e6848d0d44fff9` and maintainer-supplied final
  inputs SHA-256 `54faf372…598b3` (English) / `f5249bbd…6b9d1135` (Chinese).

The exact upstream legal texts are retained as `LICENSES/thinking-orbs-MIT.txt` and
`LICENSES/bitfun-MIT.txt`. The root README machine record owns production adoption; this section
records only the review evidence and bounded disposition.

### 16.2 Existing owner and selected result

The real call chain is unchanged: `ChatView` derives `isWorking` from local dispatch, connecting,
turn and recovery facts; `ChatTranscriptPane` forwards it; `MessagesTimeline.logic.ts` creates the
single transient `working` row and lets worktree setup temporarily replace it; `MessagesTimeline.tsx`
renders that row inside the existing LegendList/tail-anchor lifecycle. Provider reasoning, tool work,
approval, error and terminal settlement remain separate canonical rows. No new state or event owner is
needed.

The selected visual result is the official Thinking Orbs **Composing/Ribbon 20px preset at its original
density**, BitFun's historical 400ms entry plus 1.6s strong text breathe, the maintainer-approved
five-second keyed hint replacement, and OmniMind's symmetric three-dot tide shifted upward. The
user explicitly selected the original Composing density after direct prototype comparison; density
retuning is therefore not an open implementation choice.

### 16.3 Copied-adapted boundary

Installing the complete `thinking-orbs` package would make OmniMind own eight unused states, a 64px
design family, state/mode registries and a general React API for one fixed consumer. The accepted
boundary instead resolves only the official Composing 20px preset into a local painter and retains the
minimal runtime obligations: depth projection/ink, DPR cap, requestAnimationFrame, hidden/offscreen
pause, reduced-motion static frame and the existing OmniMind light/dark owner. The frame contains the
same 8 ghost dots plus 10×20 ribbon marks as upstream. Direct comparison against the package engine at
times `0`, `0.6`, `1.872` and `4.25` produced 208 marks and maximum numeric difference `0` at every
time. The other states, 64px profiles, registry, package dependency and unused options are excluded.

The BitFun adaptation retains only the selected timing and catalog lineage. OmniMind deliberately does
not adopt BitFun's separate runtime-status store, footer slot, one-second blank delay or dot-matrix icon:
the existing Timeline row already owns immediate feedback, and the selected Composing orb fills that
role. The 338 Chinese and 338 English hints remain index-aligned and unique; the first index is random,
later replacements advance every five seconds, locale switches preserve the aligned index, and trailing
static ellipses are removed before the animated symmetric dots. Hints are atmosphere only and never
become transcript, reasoning or progress evidence.

### 16.4 Revalidation and current evidence

Fixed geometry SHA-256 baselines cover the reduced-motion frame and a moving frame. A Chromium 2×
40×40 pixel-buffer baseline covers the dark and light static frame; browser coverage also checks the
three-element DOM, five-second replacement and reduced-motion freeze. i18n coverage fixes count,
uniqueness, index parity and the 40-character English bound. Re-run the affected evidence when source
revision, catalog digest, canvas engine, Chromium baseline, theme owner, DPR behavior, motion policy,
Timeline virtualization or stream/tail anchoring changes.

Focused Timeline/browser checks, all-package typecheck/build gates, the complete Web unit suite, and an
exact pushed-SHA macOS arm64 packaged build with isolated fresh-state startup are closed at integration
commit `0c0b22960`. This visual adoption does not by itself revalidate or advance the separate Synara
claims in §15, and it does not claim a signed/notarized public release.

## 17. Synara `8f9f600…c79fab4` session-tool responsibility check

On 2026-08-18 the maintainer supplied a final correction for the OmniMind Agent Todo owner and
authorized the corresponding local candidate. The read-only donor was clean at exact Synara
`c79fab498de1a911a14ff8b05bf83d0528ec54fa`; adopted Synara
`8f9f60045ea652db7d4a6822e2f723dde073f40a` is its ancestor by 40 commits.

The relevant PiAdapter, Engine-native task projection, Provider runtime contract, Orchestration and Web
task-consumer paths are byte-identical across that range. Synara still does not create a stock-Pi Todo:
it leaves supervised Bash and Gateway definitions on the existing Pi seams, keeps Codex, Claude,
OpenCode and ACP task state in their native adapters, and projects only canonical
`turn.tasks.updated` at each adapter boundary. Exact commit `7c32e880…` further demonstrates the
responsibility pattern by extracting Claude task logic into `claudeTaskTracker.ts` instead of creating a
generic Task Manager.

Disposition: there are no new Synara Todo bytes to port and no unresolved non-adoption decision in this
range. OmniMind Agent's existing three-state turn snapshot remains a narrow downstream Provider
enhancement. The confirmed responsibility direction is a named hidden Pi-native Todo Extension with
PiAdapter retaining only Session wiring and canonical event projection; that source direction was later
integrated by Agent-tools merge `e7137c7…`, while packaged Todo interaction remains a separate evidence
boundary. Same-name precedence
must follow Pi and degrade only the optional Product Todo projection, never the Session or a third-party
winner. No third-party Todo package, second state, registry, Settings surface or control plane is
adopted. Bounded evidence and candidate falsifiers live in
[`pi-native-todo-extension-review.md`](pi-native-todo-extension-review.md); stable runtime responsibility
remains in [`architecture/execution.md`](../architecture/execution.md). This disposition does not
advance Synara's adopted revision or any packaged-product claim.

## 18. Synara Host-surface parity and Pi projection check

On 2026-08-19 the maintainer requested an exact-source recheck after the OmniMind Host loader had been
treated as a stable target. The source set was production-adopted Synara
`8f9f60045ea652db7d4a6822e2f723dde073f40a` and the clean read-only local Synara
`c79fab498de1a911a14ff8b05bf83d0528ec54fa`. The latter is 40 commits ahead. The relevant
`harnessPolicy.ts`, `mcpInjection.ts`, `PiAdapter.ts`, and the core Codex, Claude, OpenCode, Cursor and
Droid adapter paths do not change across this range. Later Antigravity and Grok changes preserve the
same Gateway ownership pattern.

The exact Synara shape is one canonical AgentGateway catalog plus `tools/list`, `tools/call`,
credential, thread/scope, active-turn and cancellation authority. Every formally supported Engine with
a successfully installed thread-scoped Gateway projection targets the same filtered Host surface.
Adapters only translate the pipe: Codex uses native MCP configuration, Claude uses its MCP server seam,
OpenCode/Kilo uses remote MCP, ACP-family Engines use their supported HTTP/proxy seam, and stock Pi
maps every `tools/list` descriptor into a `ToolDefinition` placed directly in `customTools`. Synara
stock Pi has no Host-owned callable loader, lexical matcher, inactive Host pool or dynamic activation
preflight.

The exact user-result formula is:

```text
Desired Host Surface
= canonical Gateway catalog
∩ global Built-in policy
∩ machine/service availability

Delivered Host Surface
= Desired Host Surface
∩ the thread-scoped Engine projection that actually installed
```

The second intersection is runtime health, collision or adapter failure, not a Provider-specific
capability tier. This parity does not normalize Engine-native Bash, file tools, sandbox/approval, Todo,
context, resume or Package semantics.

Disposition: follow the Synara responsibility pattern. OmniMind Agent may keep a narrow named hidden Pi
inline Extension to preserve Pi Registry, sourceInfo, collision, Session and reload semantics, but the
current Host projection target is eager-active and contains no Host-owned loader. AgentGateway remains
the Host definition/execution/authorization owner. Pi remains the sole Extension/Tool Registry and
active/session truth inside the OmniMind Agent runtime. Future dynamic loading is decided only by a
concrete Extension owner with a credible activator and measured benefit; it does not justify a
Host/global search manager.

This evidence supersedes the product-direction claim in the earlier merged dynamic Host Gate B without
erasing its historical source, test or wire evidence. The baseline `main@849730c…` still contains that
old implementation. Task-branch exact pushed code SHA `9c05e0902` implements the Architecture 1.0
candidate and has completed focused/full conformance, MiMo/DeepSeek live journeys and an isolated
same-SHA packaged journey. It remains unmerged and unreleased and did not replace the installed App.
The bounded decision, falsifiers and Gate B evidence live in
[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md). This section does not
approve Chat Todo, final Settings taxonomy, Device full-access, Browser download handling,
approval/auto UI or Extension Marketplace.

## 19. Synara exact `57f48ef…` adoption audit

### 19.1 Source and relationship

The maintainer requested another complete sync on 2026-08-20. The read-only local upstream was clean at
exact `57f48ef1a3354ae7967d4a8f9f83a1105691ede6`. It is 107 commits after the previously adopted
`8f9f60045ea652db7d4a6822e2f723dde073f40a`: 83 non-merge commits and 24 merge carriers. OmniMind is
still the downstream distribution of this product platform, so applicable product mechanisms enter by
standing default; the review did not treat the range as an unrelated donor patch list.

The pushed product `14c54d5a23` and exact upstream have 6,433 common `apps/` + `packages/` paths:
4,812 byte-identical and 1,621 modified at the same path. There are 99 Synara-only and 201
OmniMind-only paths. These numbers are produced from Git tree object IDs, not locale-sensitive text
`comm`, and must be recomputed after any shipped-code change.

### 19.2 Commit-range disposition

| Responsibility                                                                 | Disposition and evidence owner                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grok model ladders, custom models and usage                                    | Adopted through the existing Grok ACP/model/usage owners and their author-equivalent adapter, picker and parser tests.                                                                                                                                      |
| Cursor fast/auto/model preservation                                            | Adopted in the current Cursor options owner with the upstream model-switch regressions.                                                                                                                                                                     |
| Antigravity stream, tool settlement, child-thread routing and background turns | Adopted without a second runtime owner; ACP/adapter and subagent tests retain the lifecycle.                                                                                                                                                                |
| `/side` cross-Provider targeting                                               | Adopted in the existing Composer + sidechat creation owner, with provider-keyed single-flight, truthful bilingual unavailable/retry states and no second sidechat store.                                                                                    |
| Projection repair, approval idempotency and terminal reply fences              | Adopted with the stricter shell-sequence, receipt and post-settlement assistant-reply invariants; recovery tests cover catch-up, repair, duplicate response and late reply races.                                                                           |
| Windows paths, UNC, WSL cwd, WebSocket origin and sensitive-flag redaction     | Adopted in existing path/transport/redaction owners with the upstream Windows and security regressions.                                                                                                                                                     |
| Managed worktree cleanup                                                       | Adopted with a stronger no-data-loss fence: only product-owned, provably clean worktrees are reclaimed; dirty worktrees are retained and reported.                                                                                                          |
| Provider usage expansion                                                       | Adopted in the existing account-capacity and history-index boundaries. Every signed-in supported Provider can expose native limits without letting archive history become a fallback or second usage authority.                                             |
| Workspace search and reveal                                                    | Adopted into the existing unified Explorer search owner. Files and directories share one palette; directory activation expands ancestors and reveals in the existing tree. No upstream parallel palette/store was added.                                    |
| Desktop icon refresh                                                           | Adopted using OmniMind assets. Windows uses a shell-visible ICO, AppUserModel/shortcut synchronization and serialized rapid changes; the obsolete second refresh owner was removed. macOS dark icon behavior remains in its native owner.                   |
| Windows/Linux custom titlebar                                                  | Adopted with persisted preference, restart/rollback and existing Desktop window controls. macOS remains native. This round requires source tests, not Windows/Linux release artifacts.                                                                      |
| Workbench/landing/chat/sidebar visual tuning                                   | Adopted in existing theme and layout tokens; regression updates lock the intentional opaque surface and keep normal product copy free of internal Composer vocabulary.                                                                                      |
| Xcode 27 SimulatorKit relocation                                               | Adopted as a narrow capability lookup update with fallback tests.                                                                                                                                                                                           |
| DeepSeek Harness add/revert, noop/format/CI carriers                           | Net-zero or no independent product behavior after parent/tree comparison; no parallel implementation was created.                                                                                                                                           |
| Synara website/docs, release smoke and headless release tarball                | Explicitly excluded by the maintainer. Loss: OmniMind does not inherit Synara's website, release automation or server tarball distribution. Reason: those bytes assert Synara identity/publication authority and the user explicitly selected non-adoption. |

### 19.3 Whole-tree responsibility closure

The 99 upstream-only paths close by responsibility rather than a 99-row ledger:

| Group                                                                       | Paths | Disposition / proof pointer                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Synara identity, marketing, release/What's New and identity-specific assets |    31 | Product mechanisms are adapted where applicable, but Synara names, logo bytes, website, changelog and publication facts remain the user's explicit identity divergence. OmniMind icon/titlebar assets and unavailable Release History remain truthful.                                                             |
| Upstream-numbered migrations                                                |    11 | Goal and automation semantics are adopted in OmniMind's existing deterministic lineage (`093`, `096`–`100`) and migration replay tests. Synara/DP Code storage-origin migrations are excluded because there is no predecessor user population and reading unrelated identity homes would add risk without benefit. |
| Space implementation files                                                  |    21 | Semantically translated into the existing Thread Group owner: `groupIds`, editor/picker, icon suggestion, order/route restore, search/bulk and empty/void behavior. `space.projects.assign` and a parallel `spacesUiStore` are not copied.                                                                         |
| Project Instructions                                                        |     4 | Confirmed retirement remains in force; Thread Notepad stays. Loss and reopening condition remain documented in §15.6 and `architecture/workbench.md`.                                                                                                                                                              |
| Upstream usage/OpenUsage owners                                             |     6 | Account capacity is adopted through the current multi-Provider fetcher; history uses the stronger indexed UsageHistory owner. Upstream regression outcomes are retained without installing a second query/cache authority.                                                                                         |
| Different-name UI/test owners                                               |    26 | Git dialogs, Workspace palette/reveal, PR stack, automation draft/risk UI, branch mismatch, Thread creation, External MCP, diff stat, App Icon and shared hook harness outcomes are covered by current owners and focused/browser tests. Same outcome does not justify duplicate files or stores.                  |

The 1,621 modified shared paths are grouped by physical owner: Desktop 104, Server 640, Web 777,
contracts 39 and shared 61. Their evidence is the corresponding package suites plus focused author
regressions above; the review does not create a second 1,621-row manifest. OmniMind-only paths remain
downstream branding/bilingual, OmniMind Agent/Provider/Group, safety and evidence additions and do not
authorize unrelated refactors.

### 19.4 Maintainer decisions and remaining proof

The maintainer explicitly selected: adopt managed worktree cleanup; adopt expanded Provider usage;
exclude Synara identity/release/headless-tarball bytes; and adopt custom titlebar source behavior while
limiting this round to a local macOS packaged candidate. Official signing, notarization, GitHub Release,
update feed and Windows/Linux artifacts are outside scope.

Focused author-equivalent suites and the complete repository suite pass on the shipped code contained
by pushed product `14c54d5a23`: Web 4,173 tests, Server 4,361, and all
Desktop/Contracts/Shared/Scripts tasks are green. Typecheck is 6/6, lint reports zero errors, the legal
closure verifies 240 packaged components and the document contract is 20/20.

That exact pushed product was rebuilt into the installed macOS arm64 ad-hoc App. The DMG SHA-256 is
`24e4800c32f29c6dbce29e0166f39925365ca3fad89b26ab1af31756f2fb762d`; the DMG and installed
`app.asar` SHA-256 is `0333cfaa3445390fe000026dde8459b19d069cc9d50e6849eda5d443be10f23f`.
A brand-new task-specific HOME, OMNIMIND_HOME, XDG, Electron userData and Provider-private home proved
main/Helper/bundled-Server isolation. The installed UI showed all ten Engine icons plus bilingual
readiness, the expanded Provider usage and managed-worktree surfaces, `/debug`, wide-chat projection,
durable OmniMind dark-icon selection and local Profile PNG copy/save. The generated PNG SHA-256 was
`513c13b7b1a1d35cb9bd0e764deaca2675e077fe87dd13e0a4c0cde5ed53f4f3`.

The same isolated profile exited cleanly and reopened at the safe root with its project, wide-chat and
dark-icon preferences intact; migrations 1–100 ran on first start and no migration reran. A first,
immediate Terminal→Chat→Agent switch emitted one renderer `THREAD_SNAPSHOT_NOT_FOUND` for a transient
route with no durable Thread. Reopen removed the stale route and the same switch did not reproduce it;
no Goal-continuation error was observed. This is recorded as bounded recovery evidence, not relabeled
as a Goal failure. Goal failure/interrupt/reopen, Todo independence, directory reveal, Windows icon and
Windows/Linux titlebar remain protected by the same shipped-code SHA's focused/browser/complete suites;
the fresh profile deliberately contained no model credentials, so the packaged pass does not invent a
real Provider turn. These results close the adopted-head invariant for exact `57f48ef…`; signing,
notarization, official Release and Windows/Linux artifacts remain outside the maintainer-selected scope.

## 20. AgentGateway Automation compatibility retirement

The exact source history distinguishes product capability from compatibility debt. Synara PR `#291`
introduced a heartbeat-only Agent Gateway where `everyMinutes`, the caller thread and a five-minute
default were the complete creation contract. Commit `f084e94e8edb8a66f8a01d37773dc5d806b857f7`
later added explicit modes and the canonical schedule shape while deliberately retaining those old
calls. Commit `8ed0da893f0666e601639033413f0d9f18649273` then renamed the memory-tool input
from `content` to `memory` and explicitly kept `content` as an alias. OmniMind inherited those exact
bridges through `a54ef5ba49`; current tracked consumers use `memory`, and persisted
`AutomationMemory.content` is a different canonical database field.

On 2026-08-20 the maintainer explicitly approved both compatibility breaks after reviewing their
effects, but also approved responsibility-level sequencing. Exact pushed source
`06496f86ca9a4ba939b1331f6da4a30aa4dbe663` first retired only the memory-tool `content` alias:
`memory` remains byte-preserving, an omitted `automationId` still resolves from the active Automation
turn, existing definitions/memory are untouched, and no migration, tombstone, fallback or generic
schema validator was added. The later independent Slice at
`0202d9a4411658b2b2b662b6694798dcc4de2bda` then retired `everyMinutes` and implicit
heartbeat/five-minute creation. Its AgentGateway schema now requires `mode` plus canonical `schedule`;
the underlying Automation contract, Web form, scheduler, persistence and existing definitions are
unchanged, and no string coercion or compatibility alias was introduced.

The retirement shipped in exact pushed source `06496f86ca9a4ba939b1331f6da4a30aa4dbe663`.
Focused AgentGateway, AutomationService-memory and run-envelope tests passed; the complete Server
suite passed 4,362 tests with 16 skipped, Server typecheck passed, and lint reported no errors. The
same SHA produced an arm64 DMG with SHA-256
`708da78557ed94800e94adae9ed2ae8909a9095aa1a64fc6eadb1b40dff3f56e`; its staged and installed
`app.asar` SHA-256 was `0971711b6f518a3cdbb4c4cdb1119a3c1ede35b3cc2ab6ed58caaf2a8fd45fc9`,
and all 240 packaged legal identities were accounted for. The local installed candidate was ad-hoc
signed and passed strict deep verification; this is not official signing, notarization, Release or
update-feed activation.

Two separately isolated packaged profiles then proved the real Agent journey with MiMo
`mimo-v2.5-pro` and DeepSeek `deepseek-v4-pro`. Each Provider created a 24-hour standalone
automation, called the canonical `memory` input, viewed the exact persisted excerpt, and used a
continuation turn to archive the definition before its first run. After clean shutdown, SQLite held
the exact 27-byte `MEMORY_CANONICAL_MIMO_06496` and 31-byte
`MEMORY_CANONICAL_DEEPSEEK_06496` values, with both definitions disabled/archived and zero active
automations. DeepSeek's same profile reopened with no active Automation UI entry, and all OmniMind
processes exited. Accepted runs first proved task-specific Electron `userData` from Helper arguments
and Server base/state/database paths from runtime logs. An earlier rejected setup caused the UI
controller to launch the default profile; it was detected before any Provider send or settings
mutation, stopped immediately, and is excluded from the evidence set.

The second Slice passed 90 focused AgentGateway tests, Server typecheck, targeted format/lint with no
errors, `git diff --check`, and the complete Server suite with 4,363 tests passed and 16 skipped. The
exact pushed source produced an arm64 DMG with SHA-256
`be4a4d060c9d465d07dff40b538ba9ddfd35060978c569ee403eacab989f55a9`; staged and installed
`app.asar` SHA-256 was `da45356dbad163a2dc9f94e6a3c4694b6dc81cbd45645e896183fccccaba6fa6`,
all 240 packaged legal identities were accounted for, and the ad-hoc installed App passed strict deep
verification. This remains a local candidate, not official signing, notarization, Release or update
feed activation.

One fresh isolated packaged profile then provided a deliberate cross-Provider contrast. Both model
services resolved from environment-backed task configuration without storing plaintext credentials.
DeepSeek `deepseek-v4-pro` submitted `mode=standalone` and an object-valued 24-hour interval schedule,
created the definition, and used a continuation to archive it before execution. Stopped-state SQLite
preserved `{"type":"interval","everySeconds":86400}`, `mode=standalone`, archived/disabled state and
zero runs; the same profile reopened with no active Automation entry. MiMo `mimo-v2.5-pro` completed a
real turn and received explicit tool failures, but five create attempts in the earliest persisted Pi
session transcript already contained an object-valued top-level `arguments` whose nested `schedule`
was text. The Gateway correctly rejected every attempt and persisted no MiMo definition. DeepSeek's
corresponding `tool_execution_start` retained an object-valued `schedule`, so canonical Automation
creation and the packaged Server path survive; current evidence narrows the MiMo defect to the raw
Provider-response-to-Pi-normalized-message interval but does not yet identify which side first changed
the type. The next investigation must capture those two boundaries with an equivalent harness. It
must not add Gateway JSON parsing, a schema alias or a Provider-specific compatibility lane.

That boundary investigation is now closed by exact pushed source
`17a79a37ee21861e7aff1503bab381614d6a4ab2`. A one-time redacted harness sent MiMo and DeepSeek the
same prompt and isolated only the model-facing schedule schema. With the previous nested
`schedule.oneOf`, MiMo's raw wire response already contained a string-valued schedule and Pi preserved
that string; with one flat discriminator object, MiMo's raw response and Pi-normalized call both
contained an object. DeepSeek retained object arguments in both cases. The faulty owner was therefore
the Agent-facing schema shape, not Pi normalization, Gateway decoding or Automation persistence.
The fix flattened only that projection; the canonical `AutomationSchedule` decoder and branch-specific
validation remain strict, with no JSON-string coercion, Provider branch, alias or compatibility lane.

Focused AgentGateway tests passed 91/91, Pi projection/adapter tests passed 59/59, Server typecheck
passed, targeted format and diff checks passed, and the complete Server suite passed 4,364 tests with
16 skipped. Lint reported zero errors and one unrelated pre-existing warning. The exact pushed product
produced an arm64 DMG with SHA-256
`9fd17ebb981e0eaef5979f7a3905b9c468ad4a488506b32142dae0f43c0251f9`; staged and installed
`app.asar` SHA-256 was `228e9fc4a85268f831e21f3142f6332ab4566d0addaa0a2a628ffdfcd690fbf3`,
all 240 packaged legal identities were accounted for, and the locally ad-hoc-signed App passed strict
deep verification. This remains a local candidate, not official signing, notarization, Release or
update-feed activation.

One isolated fresh packaged profile then proved both real Provider journeys through the shipped
Agent→Pi→Host-tool path. MiMo `mimo-v2.5-pro` and DeepSeek `deepseek-v4-pro` each created exactly one
standalone daily Automation for 09:30 Asia/Shanghai; their persisted Pi transcripts retained
object-valued tool arguments and object-valued schedules. On the same threads, continuation turns
viewed each definition and archived it with the exact revision before execution. Stopped-state SQLite
held both definitions as disabled, archived, revision 1 and iteration count 0, with zero Automation
runs. The same profile reopened with both model catalogs ready, both threads completed, both schedules
preserved and no active definition or run; a second normal quit left no OmniMind process. During setup,
the fresh window also remained on a nonexistent thread route and did not project authoritative
Project/Model state already present over authenticated packaged RPC. That bounded stale-UI observation
is kept separate for reproduction and owner diagnosis; it is not attributed to this schema fix and did
not trigger a reload shim or fallback.

## 21. Timeline and Web Access regression responsibility audit

### 21.1 Source ancestry and fault ownership

The 2026-08-25 review was prompted by five user-visible symptoms: raw underscore tool labels, an
OmniMind Web Access language/theme error, tool rows without useful detail, reasoning duplication or
misstated lifecycle, and live Assistant text appearing above later Tool rows before terminal settlement
reordered the transcript. The review covered the complete user path rather than assigning ownership by
similar appearance.

Synara had historically encountered the causal-order class, but exact upstream commit
`dd29079747eaeee096558a56275ce9a97b6f1879` fixed it by persisting Assistant text segments and
interleaving them with Tool rows. Commit `c4a82e0efbc2d71e10c499dd606e04027fb6bc49` separately anchored
compacted reasoning identity and durable sequence to its first update. OmniMind had already translated
those guarantees through `6d4ba0f876`, `2c3dd0b8f9` and `91f7b6596c`. Later downstream semantic
alignment at `5b47a4cd10` grouped Timeline content across engines without preserving the complete segment
boundary through live batching, reducer projection and final consumer compaction. The old symptom
therefore reappeared in OmniMind after adoption; it is an OmniMind regression, not an unresolved Synara
defect.

The other symptom classes are downstream-only:

| Symptom                                                                 | Fault owner                                                  | Evidence-based reason                                                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw `Web_search`, `Fetch_content` and similar labels                    | OmniMind Timeline presentation                               | Runtime identifiers reached ordinary product copy without the central readable/bilingual projection.                                                                                              |
| Web Access said it could not resolve language/theme                     | OmniMind cross-process presentation wiring                   | Renderer produced a bounded theme snapshot, but the Desktop/Server Browser Automation path did not preserve the required typed field. Synara does not own this OmniMind bilingual/theme contract. |
| Tool rows had no inspectable input, output or source detail             | OmniMind activity projection                                 | Canonical events retained more data than the Timeline preview consumed; fallback merge/truncation dropped presentation facts before the disclosure.                                               |
| Reasoning repeated, looked successful on failure, or truncated silently | OmniMind ingestion/projection lifecycle                      | Completion replay, grouping boundaries, failure tone and structured truncation were not carried by one canonical reasoning activity contract.                                                     |
| Live order differed from settled/reopened order                         | OmniMind preservation failure of an adopted Synara guarantee | Runtime sequence, Assistant segment boundaries, batch coalescing, consumer grouping and virtualized DOM order did not remain one end-to-end invariant.                                            |

The systemic cause was not that `SYNARA-INTAKE.md` lacked a strong one-time Gate A/B review. It was that
the repository did not make an adopted behavioral guarantee a mandatory re-entry dependency for later
downstream work in the same owner. A locally reasonable “align activity semantics” change could modify
the live reducer and second-stage Timeline grouping, update tests to the new grouped result, and never
re-read the exact upstream interleave regression. The missing control was durable preservation across
future owner changes, plus a journey falsifier that traversed live batching, settlement, virtualization
and reopen. Section “已采用保证的持续 re-entry” in `SYNARA-INTAKE.md` now owns that method; this section
only records why it was added.

### 21.2 Implemented closure and bounded residuals

The Tool/Timeline repair set entered `main` through merge `b4871621b3`. The relevant exact commits are
`8793e7fd55` for readable labels, typed Web Access context and inspectable details; `7791fb0df3`,
`98d64d1681`, `a05d58fcd1` and `fffd1bcf7d` for public reasoning projection and lifecycle; `90ac3c455f`,
`9177db61ed` and `c9f17dfe4c` for causal segments across live ingestion, batching and reduction; and
`e269e06067` for same-frame virtualized DOM order. Later interaction commit `cab8a9ab5b` kept active
public reasoning open in a bounded, tail-following viewport, made the body itself toggle bounded/full
height without a visible second control, protected selection/scroll/links, and preserved manual
disclosure intent. The subsequent i18n owner merge did not change those semantics; current shipped-code
integration was revalidated at exact `main@4e23564a072690666784ff029f2d6e12d89a756f`.

That exact pushed SHA passed 330 Web unit files / 4,160 tests, 15/15 focused reasoning browser cases,
3/3 catalog composition tests, TypeScript, lint, production Web build and Desktop DMG build. Its
fresh isolated installed journey observed the canonical sequence
Assistant → Reasoning → Read → Reasoning → Read → Assistant in visual position, DOM source order and
Chromium accessibility tree during live output, after settlement and after App reopen. Both live
reasoning groups were bounded and tail-following, body click expanded and restored height, settled
groups defaulted closed, manual disclosure choice survived ordinary rerender, and Chinese, English,
480px and overflow cases were covered. The ad-hoc DMG SHA-256 was
`94ad19f936f2bc24fcdf28ef58775bf9a2ac7573134a09410fdc2d475531278c`; this is packaged-not-released,
not official signing, notarization, Release or update-feed activation.

Two boundaries remain explicit. The complete stable browser suite still has five failures in historical
Worked-for, Terminal/theme and tail-anchor cases; representative failures reproduce on the untouched
pre-change baseline, so they are not evidence against this repair but the suite must not be reported as
globally green. During setup, one default-profile App was accidentally launched and stopped before the
accepted isolated journey; its durable impact cannot be proven zero. The accepted evidence therefore
uses only the later verified task profile and records the earlier impact as unknown.

Future changes to engine event normalization, Assistant segmentation, reasoning lifecycle, live batch
coalescing, store reduction, Timeline grouping, LegendList/virtualization, Tool schemas, Browser
Automation presentation context or i18n catalog composition must rerun the corresponding focused
regressions. Any causal-order change must additionally prove live, settled and reopen order in visual,
DOM and accessibility projections; any first-party Tool or B-class Web Surface change must prove typed
detail/context round trips and fail-closed malformed-input behavior.

## 22. OmniMind Agent Plan / Debug compatibility closure

This Slice keeps the adopted Synara source authority at exact commit
`57f48ef1a3354ae7967d4a8f9f83a1105691ede6`; `source-adoptions.json` is intentionally unchanged. The
Product interaction-mode owner, Composer, PlanSidebar, Refine/Implement journey and SQLite projection
were already present and were not forked. Exact capability implementation
`f939e34e919b204d827ca93681284093ce1144eb` instead makes the existing Server execution structure own
`default / plan / debug` support and protects final `sendTurn/steerTurn` admission. stock Pi and
Antigravity now explicitly reject Plan; bundled OmniMind Agent and the already-compatible native
adapters expose it only through the same health-aware capability projection.

Exact OmniMind Agent implementation `8b7ea057e9e2894e31f8d28442a091ebd32bd5f4` uses the pinned Pi
`@earendil-works/pi-coding-agent@0.84.2` Extension seam rather than a Host permission system. Pi's
ResourceLoader loads user/package Extensions before supplied inline factories, and its `tool_call`
runner visits handlers in order and returns immediately on the first `{ block: true }`. Earlier user
handlers may inspect or mutate input, but cannot reverse the later Product guard's rejection. The
bundled hidden guard therefore fail-closes every tool except Pi read tools, canonical Ask User,
OmniMind task projection and the four canonical Web Access read tools; the latter names are exported by
their existing package owner instead of copied into adapter policy.

Plan mode is frozen per turn, wrapped before Pi command dispatch, and retained across active steering
and interrupt until settlement. The wrapper prevents `/reload`, prompt/skill templates and Extension
commands from bypassing the Agent loop. `agent_end` only replaces an in-memory final-plan candidate;
`agent_settled` emits at most one canonical `turn.proposed.completed` before `turn.completed`, then
clears the candidate and guard. Prompt rejection, reload, disposal and Session replacement clear the
same controller. Debug remains the existing evidence-first ProviderCommandReactor prompt policy and
does not alter permissions or add a state machine.

Focused evidence covers the ten-Provider matrix, RPC decode, stale-client Server rejection, the fixed
allow/deny tool set, composition order, Plan prompt exactly once, slash-command neutralization,
canonical event ordering, tagged Default non-projection, reload/Plan-to-Default cleanup, Debug initial
and native-steer exactly-once injection, Composer unavailable/pending fail-closed behavior and the
bilingual preserved-intent exit journey. This is a bounded compatibility closure, not an overall F-20
verification: the Campaign remains `candidate`, and release signing, notarization and update-feed
activation remain outside this Slice.

## 23. Synara `57f48ef1` → `a93c47e2` adopted-head closure

The 2026-08-26 intake reviewed every one of the 17 commits after the previously adopted
`57f48ef1a3354ae7967d4a8f9f83a1105691ede6` through exact candidate
`a93c47e275870f34ec7aa8cd72f2a0ff6246db7c`. The resulting product candidate is the pushed OmniMind
commit `dbe793d35accbd81484201e5376c772ba9ed94ea`; this section records source disposition and bounded
evidence, not a second adoption manifest.

| Synara commit                                  | Disposition                                     | OmniMind result                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c34a5f73`                                     | Adopt applicable remainder                      | The Antigravity fixture correction was already present; only the still-applicable scratch-symlink cleanup was retained.                                                                                                                                                                                                |
| `e1750550`                                     | Direct adoption plus existing-owner translation | Canonical Claude ordering and readable Provider/Model picker geometry preserve unknown live models and custom entries, with a 480px viewport bound.                                                                                                                                                                    |
| `80e683a0`                                     | Selective direct adoption                       | Git statistics use a guarded `--numstat -z` path and runtime hot paths remove repeated work without clearing bounded raw diagnostics. Any semantic mismatch falls back to the established correct implementation.                                                                                                      |
| `881ed0d5`, `604bb157`                         | Direct adoption                                 | Codex discovery idle grace is 15 seconds and resets after every discovery request; active turns are unaffected.                                                                                                                                                                                                        |
| `ba82253`                                      | Direct adoption                                 | Thread spinner uses the 1.3-second, 24-step motion and pauses for reduced motion or hidden Sidebar presentation.                                                                                                                                                                                                       |
| `79e38c04`, `7f21a7e5`, `594af5e8`             | Merge carriers                                  | Ancestry only; no independent product behavior.                                                                                                                                                                                                                                                                        |
| `377f8edd`                                     | Excluded fixed divergence                       | Floating Browser is not adopted. The only Browser remains the current Conversation's RightDock runtime, store, partition and cookie session.                                                                                                                                                                           |
| `b679bc98`, `aedd6284`, `ca998bf9`, `ac32b620` | Semantic translation                            | Normal-quit recovery is owned by the protected Desktop shutdown route and Product Orchestration, not a public WebSocket RPC. The bilingual confirmation, default-on local preference, one-shot private record, exact binding and ordinary-user-message resume retain existing Queue, permission and failure semantics. |
| `97ef2306`                                     | Excluded identity material                      | README and product/release identity changes are not adopted.                                                                                                                                                                                                                                                           |
| `e443f21d`                                     | Direct adoption within fixed topology           | Browser tab strip consumes the existing Thread Browser state, activates new tabs immediately, scrolls only itself and suppresses programmatic address suggestions.                                                                                                                                                     |
| `a93c47e2`                                     | Excluded release carrier                        | Synara 0.7.3 versioning, changelog/What's New, screenshots/assets, server tarball and release configuration are not OmniMind product changes.                                                                                                                                                                          |

The same adoption also enables Electron scheme code caching and a bounded Shiki-only streaming
throttle: first change is immediate, one trailing update is retained, settlement flushes exact content,
and the maximum interval reaches one second only above 80,000 characters. The proposed stepped working
shimmer did not obtain independent proof on OmniMind's translucent Composer surface, so the established
visual remains. Provider-runtime persistence now uses conflict-safe insertion with identity validation;
UTF-8 sizing, JSON-tree reuse, Claude tool-input parsing and Codex ANSI handling reduce duplicate work
without changing event content, causal sequence, terminal reserve or diagnostic retention.

Focused Server, Desktop, Web, contracts, Git, Provider, Browser and performance regressions passed before
packaging. Minimal authorized MiMo and DeepSeek probes each completed a streamed tool journey with exact
model binding and no observed loss, duplication, reordering or silent fallback. From exact pushed SHA
`dbe793d35accbd81484201e5376c772ba9ed94ea`, the production DMG and ZIP had SHA-256
`73f425c104ef0cefb058b675f8222c6d14c8895505c3f588bf1fc57fc7268cef` and
`0044123c43b095f337b983cf0ef4451e8bafbe8d171b0f145e403976cb9c7e67`; 541 production dependency
identities were verified and two isolated packaged startup attempts passed.

The packaged journey found and closed two real recovery defects before final evidence: exact binding had
initially compared admission events with an in-memory session timestamp, and restart reconciliation's
`interrupted` terminal state had initially been mistaken for business completion. Regression tests now
fence binding by the causal turn-start admission and permit only reconciled interruption, never a later
completion/error. A separate packaged presentation check found an English blank-tab title in Chinese;
the catalog now localizes only genuinely blank tabs while preserving real page titles equal to “New tab”.

The final isolated macOS journey proved one new record produced exactly one additional localized
continuation with the selected DeepSeek model and Thinking Off, then atomically disappeared after claim.
The current Conversation's Browser created and focused a second RightDock tab with Chinese labels and no
Floating Browser entry. A subsequent exact-process `SIGKILL` left no recovery record; reopening the same
isolated profile added no continuation and started no turn. These artifacts are packaged-not-released:
they do not assert signing, notarization, Release creation, update-feed activation or installation into a
real user profile.

## 24. Percho startup splash copied-adapted intake

The 2026-08-26 intake fixed Percho at exact commit
`575216c2690c7e2b30d9ad10b773f424b469c163`, verified the clean local checkout against
`https://github.com/Jaxton07/percho.git`, and retained the exact MIT notice by Jaxton07. The adopted
source set is limited to `splash-dom.ts`, `splash.ts` and `styles/splash.css`; their donor SHA-256
digests and exact product paths are owned only by `source-adoptions.json`.

Disposition is `copied-adapted`. OmniMind keeps Percho's synchronous first-frame construction,
64-particle golden-angle geometry, breathe/light-rotation and particle-scatter exit, theme-first
surface, `content-visibility` isolation and reduced-motion branch. It replaces the donor identity and
fixed colors with canonical `OmniMind` and the existing Theme owner, compresses normal Desktop
presentation to a roughly 2–3 second envelope, omits the decorative horizontal sweep, persistent sonar
rings, radial exit waves and slow-start status copy because they carry no authoritative progress and
compete with the particle composition, and lets the Desktop process grant one full presentation
followed by brief presentations without persistence or a second window.

Two donor completion mechanisms are explicitly rejected. `Promise.allSettled` cannot establish model
catalog authority because a failed request also settles, and a maximum display timeout cannot become a
readiness fact. OmniMind therefore completes presentation only after transport open, settled Settings
and Provider snapshots, and the focused Composer Engine reaching ready, authoritative empty, usable
stale or deterministic recovery. Typed startup failure remains on the existing React Query retry path;
the splash neither sleeps over the race nor owns retry state. `/pair`, `/signed-out` and browser builds
do not inherit the cinematic residency.
