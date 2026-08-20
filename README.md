# OmniMind

OmniMind 是一个本地优先、多 Provider 的桌面 Agent 产品，也是 Synara upstream product platform 的 downstream distribution。普通用户面对的是完整的 **OmniMind** 产品与默认内置的 **OmniMind Agent**；Synara 和 Pi lineage 只作为实现、兼容与法定来源存在，不成为日常产品语言。只有用户主动打开 Provider 选择或技术详情时，独立的 stock Pi 才以 `Pi` 显示，其他真实 Provider 同理。所有 Provider 共用一套继承的 Product Orchestration 与 Registry，但各自保留真实的 identity、版本、配置、Session、私有 state 与生态能力。

> **OmniMind-native by default. Pi-ecosystem compatible. Provider-honest. Source-first.**

- **OmniMind-native by default**：OmniMind Agent runtime 由产品内置，随 OmniMind 一起构建、签名、更新和验收；这表示无需另装 Agent runtime，不承诺在没有可用模型凭据或本地模型时伪造首次回复。
- **Pi-ecosystem compatible**：OmniMind Agent 保留可维护的 Pi Package/Extension/Skill/Prompt/Tool/MCP compatibility；Pi 技术 lineage 在 About、Licenses 与源码归属中准确披露。
- **Provider-honest**：Codex、Claude、OpenCode、Pi 等 inherited integrations 各自保留原生协议、能力和限制；共同 UI 不伪造功能齐平、跨 Provider continuation 或静默 fallback。
- **Source-first**：优先无损承接 Synara 的成熟产品能力和 Pi-compatible 生态表面，只补经真实 journey 证明的 OmniMind 差异，不把上游已解决的问题重新平台化。
- **Better without bloat**：默认完整继承母体；增强必须窄、可证伪、复用既有 owner，并用用户结果、安全或性能证据说明收益，不新增第二权威或不成比例的同步责任。

## 1. 产品状态与战略

这是一个没有用户、兼容义务和发布历史的新产品仓库。产品与架构围绕“一个 OmniMind 产品、多个真实 Provider、bundled OmniMind Agent”收敛。正常旅程不要求用户理解 Synara 或 Pi；stock Pi 只在用户主动选择 Provider、查看诊断或法定来源时出现。仓库后来新增的平行 Product Control Plane、重复 Run/Journal/Tool authority 与重复 Registry 被判定为错误本体，不构成保留义务。

公开 Alpha 前没有用户数据兼容义务，但这不构成删除本机旧字节的产品价值。V1 的每个 owner 使用唯一、全新的 first-public canonical namespace；旧开发 Product、Automation/service、Web draft 与 Package 状态不再读取、推断、迁移、修复或删除。若旧路径与当前 owner 冲突，当前 owner 一次性选择新的最终路径或 key，而不是发布 destructive rebuild 工具。credential、Pi-native state、attachments、用户 workspace、Git、全局配置和任何未知路径始终保持原样。公开发行后的 schema 变更才进入有证据的 migration/recovery。

OmniMind 的价值不是“能启动 Pi”，也不是“再造一个多 Engine 平台”，而是用 `Agent | Chat` 提供清晰默认路线，把成熟 Synara Workbench、多 Provider substrate 与 Pi 生态交付为一个完整桌面产品。OmniMind 不需要拥有每个内部 lifecycle 才能形成产品价值；可信来源、策展、体验和发行可以建立在上游原生 authority 之上。Remote/SSH 推迟到 V2。

已采用的 Synara UI mother 与仓库中已经运行的成熟机制是默认施工基座。一个 Campaign claim 为 `open`，只表示 OmniMind 对该产品语义的验收证据尚未闭合，不表示对应 File、Viewer、Diff、Terminal、Conversation、accessibility、performance、packaging 或 updater 基座不存在。替换既有机制前必须同时指出唯一 owner、可复现冲突，以及为什么接线、authority 收口或局部修复不能解决；否则保持既有实现并补齐 OmniMind 差异与 proof。

双语是例外，不得被“source-first”口号虚构为现成能力。Synara `02c8a6c…` 没有覆盖完整产品面的消息目录或 locale 切换；浏览器 locale、零散文案表和英文 UI 不构成可继承的完整 i18n。OmniMind 只新增一套轻量消息目录并覆盖首发可达产品面，不借此重写 source 组件树或建设通用 localization platform。

当前 production compatibility、Package 安全、跨平台与恢复仍须由 active Campaign 在同一 frozen SHA 上验证；本 README 不自证完成。

## 2. 唯一权威与架构入口

每类耐久事实只有一个 owner：

| Fact class                                                     | Sole owner                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 产品身份、战略不变量与 production adoption                     | 本 `README.md`                                                               |
| 稳定职责、产品事实、完整 UI 与进程边界                         | [`architecture/`](architecture/README.md) 的专题 owner                       |
| canonical public origin、公共出口、激活与独立 trust boundaries | [`architecture/public-surface.md`](architecture/public-surface.md)           |
| 固定来源事实、失败、反例与复验触发器                           | [`research/`](research/README.md)                                            |
| Synara 持续 source intake 方法与人工确认边界                   | [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md)                                       |
| Pi Core、Pi ecosystem 与 Agent Core 外部来源的持续 intake 方法 | [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)                           |
| 当前工作目标、并发协调、真实阻塞与下一动作                     | [`execution-brief.md`](execution-brief.md)                                   |
| Campaign claim 状态与证据指针                                  | [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md) |

专题 owner 必须完整读取：

- [`architecture/workbench.md`](architecture/workbench.md) 是用户可见行为、UI 母体接管门、性能与可访问性的完整契约；
- [`architecture/public-surface.md`](architecture/public-surface.md) 唯一拥有公共 origin、Registry、激活门、不可用行为、反馈数据边界与发行/更新权威分离；
- [`architecture/product-state.md`](architecture/product-state.md) 唯一拥有 inherited 产品事实、Agent/Chat 映射、Queue admission、receipt 与恢复边界；
- [`architecture/execution.md`](architecture/execution.md) 唯一拥有 Product Orchestration、Provider Registry/adapters、详细进程 topology、OS capability 与故障域。

根文档只保留宪法级后果。它不提供第二套 UI ledger、产品对象目录、物理树、研究记录、施工计划或验收状态。

## 3. 不可协商的产品边界

- App shell、导航、Agent/Chat、设置、错误、更新和默认生态入口只使用 OmniMind 产品语言。Synara 不作为用户概念；OmniMind Agent 不以 Pi 命名或解释自身。准确的 Pi lineage、采用版本、改动边界与 license 只在 About、Licenses、诊断和源码归属中按需可发现。
- `Agent | Chat` 是唯一一级工作入口：正常 shell 在侧栏顶部同时呈现 `Agent`（左）与 `Chat`（右），一次激活即可切换；不得把另一入口隐藏进菜单或溢出项。用户显式隐藏 Chat 是唯一例外。Agent 复用 folder-backed Project Thread，Chat 复用 Home/Studio managed Thread；Groups 复用 Space identity/name/order，并以既有 Thread metadata 保存会话的多分组 membership，不给 Project 打标签，也不创建第二套 Group aggregate、tabpanel state 或 restore authority。
- 生态生命周期属于各 Provider。V1 恢复并复用 Synara 既有 Plugin/Skill discovery；OmniMind Agent 对锁定 runtime 已真实提供的 provider-scoped install/update/remove/reload 必须保持用户可达，缺失的动作才不显示。API/capability gate 只决定某个 Provider 显示哪些动作，不把已存在的 Pi 能力降为产品可选项。stock Pi 与其他 Provider 不为视觉对称而补造不存在的生命周期 API，共同 UI 不保存跨 Provider current/LKG/generation。
- V1 在 inherited Registry 中增加一个有界的 `omnimind` identity，并保留 `pi` 与其他既有 adapters；不把 ProviderKind 改成动态插件平台。OmniMind Agent 是默认、内置和最深验收路径；stock Pi 只在用户主动选择 Provider 或查看详情时以 `Pi` 显示。UI 使用每个 runtime 的 ready、auth、version、capability 与 diagnostics，不新增 support-tier 状态。
- U1 是获准的完整 UI 物理母体和可运行底盘；采用遵守 Workbench 的逐域 preserve/adapt/delete gate，不按截图另画薄 shell，不因未接线就删除成熟表面。
- 权限请求和限制只能按当前 Provider/Host 的真实行为表达；副作用确定性、恢复、性能、简体中文/英文和 macOS/Windows/Linux 都需要真实证据。

以下四条官方发行、Provider 与 Pi 生态要求由产品维护者锁定：

1. OmniMind 官方发行版内置 OmniMind Agent runtime；普通用户无需另行安装 Pi 或 Agent runtime。首次模型请求仍以真实的 model/provider auth readiness 为准，不静默 fallback。
2. OmniMind Agent 是 Pi-derived、产品自有的 runtime，可以策展、预装或自建兼容的 Package、MCP、Skill 与 Prompt；stock Pi 仍作为独立 Provider 保留。
3. OmniMind Agent 与 Pi 必须进入 inherited Provider Registry，而不是建立竞争的 Registry、Product Control Plane 或跨 Provider runtime。二者可共享窄的 Pi-family adapter core，但 identity、version、configuration、Session、state root、Package install state 和 diagnostics 必须隔离；可执行 runtime 不进入 Electron renderer。
4. 用户及 Provider credential 必须作为秘密保护，不能因内置、预装或产品配置而写入发行物或公开内容；任何 bundling、预装、修改与再分发都必须履行适用的真实 license、attribution 与 redistribution obligations。

这四条规定产品结果。`omnimind` 与 `pi` 是两个真实 Provider identity，但仍服从同一个 inherited orchestration；这与重建通用多 Engine 平台不同。

OmniMind Agent 当前技术 lineage/生态兼容基准是 Pi stable `v0.84.2`，之后使用自己的 runtime version；它不以 Pi version 作为长期产品身份。它使用独立构建或等价的 instance-level 配置，使全局与 project-local private state 都进入 `.omnimind`。stock Pi 仅在被用户显式选择时使用自己的 `.pi` native state；产品 reset、OmniMind Agent 和后台 discovery 都不得读取、迁移、同步或改写它。stock Pi 的实际 session runtime version 与可选本机 CLI version 必须分别呈现，不能互相冒充。production-adopted Synara head 是 exact `57f48ef1a3354ae7967d4a8f9f83a1105691ede6`；当前安装的 OmniMind product bytes 来自 exact pushed product commit `14c54d5a23e5a40d183b508d2eae51ec49080964`。它继承母体的 Thread/Product Orchestration、Chat/Agent、Project trust、Provider 与 Workbench 生命周期，同时保留 OmniMind 的 first-public namespace、双语、品牌、Group 语义翻译和更强安全边界。Project Instructions 已按维护者决定退休，不再被旧 adoption 文案复活；Thread Notepad 与稳定 Host context 继续由现有 owner 承担。官方中文机构名“广东智慧医学国际研究院”仍由同一 immutable engine contract 保证，stock Pi 保持原生身份。持久 ThreadGoal 与逐回合 Todo 是两条独立责任：Goal 继续属于 inherited Thread/Product Orchestration；Todo 是 OmniMind-authored、product-bundled 的 Pi Session Extension，只向既有 canonical turn event 做薄投影。

## 4. 来源、身份与结构

基础设施默认采用责任匹配的成熟上游实现、官方 SDK 与已证明机制；自研实现只有在上游不兼容、
不安全、法律上不可采用、实质更重或无法保持 OmniMind 产品边界时才成立，并必须记录可复核的
反证。采用必须同时满足精确责任且无竞争 authority、固定版本与可复现证据、license/Notice 与
再分发兼容、依赖和升级面有界、全生命周期复杂度低于自持五项门槛。每个 Provider runtime 负责
自己的 protocol、Session、Tool、capability 与私有生态语义；OmniMind Agent 与 stock Pi 分别拥有各自
的 Session、ResourceLoader-compatible lifecycle 和 Package-private state。OmniMind 只保留跨 Provider 仍稳定的产品事实、默认与策展、
最小 receipt/recovery truth、安全边界、分发和 GUI。采用 wrapper 不得重新实现已交给上游的
authority，也不得带入 donor branding、竞争编排、第二 Session 状态或泛化 Runtime。

下列机器块是 production adoption、身份与结构治理的唯一根级输入。研究候选不等于采用；实际采用必须在同一提交记录 fixed source、rights、路径、更新策略与法定文本。

```source-adoptions
{
  "adopted": [
    {
      "id": "ui-mother",
      "url": "https://github.com/Emanuele-web04/synara.git",
      "revision": "57f48ef1a3354ae7967d4a8f9f83a1105691ede6",
      "paths": [
        ".github",
        ".gitattributes",
        ".gitignore",
        ".mise.toml",
        ".oxfmtrc.json",
        ".oxlintrc.json",
        "apps/desktop",
        "apps/web",
        "apps/server",
        "packages/contracts",
        "packages/shared",
        "patches",
        "scripts",
        "package.json",
        "bun.lock",
        "bunfig.toml",
        "tsconfig.base.json",
        "turbo.json",
        "vitest.config.ts"
      ],
      "rights": "The fixed source is MIT-licensed under the retained exact legal text. The maintainer has authorized retention, adaptation and redistribution of the reviewed code. Former product identity assets, release identity and release history are not adopted.",
      "mode": "adapt",
      "changes": "OmniMind is a downstream distribution of the exact Synara product platform. The Desktop, Web, Server, contracts and shared substrate semantically adopt exact 57f48ef through pushed OmniMind product 14c54d5a23: the durable ThreadGoal lifecycle remains distinct from per-turn Todo; bounded unmapped-event diagnostics, debug/default modes, 480/960/1440 chat widths, OmniMind-owned default/alternate/dark icons, local profile PNG copy/save, streaming performance harnesses, Thread Group translation and different-name owner parity are retained with author-equivalent tests. The latest range also adopts Grok model/usage expansion, Cursor model preservation, Antigravity child/stream settlement, cross-Provider sidechat targeting, projection/approval/terminal recovery fences, managed-worktree cleanup, multi-Provider native limits, directory search reveal, Windows path/WSL and redaction regressions, Windows shell icon refresh and Windows/Linux custom-titlebar behavior through existing owners. Engine picker identity and localized readiness reuse the existing Provider icon, health and availability owners while preserving setup reachability for unavailable Engines instead of copying upstream installed-only filtering. Whole-tree accounting closes 99 Synara-only paths and 1,621 modified shared paths by responsibility, existing owner and test evidence rather than a parallel ledger. OmniMind owns truthful bilingual branding, package/app/protocol/updater/profile/storage/artifact namespace, stock-Pi isolation and its distribution authorities; Synara release/account/public identity, website and headless release-tarball bytes remain outside OmniMind facts. The maintainer confirmed that no predecessor user population exists, so Synara/DP Code legacy storage migrations are permanently excluded rather than allowed to inspect unrelated identity paths. Automation uses a consecutive-failure policy with a default of three and explicit one/three/five/keep-running choices. The installed macOS candidate is ad-hoc and does not claim an official signed/notarized release.",
      "updatePolicy": "Pinned production revision. Each maintainer-triggered update begins with an exact read-only intake; safe mother mechanisms enter by standing default, while every proposed non-adoption, defer, current-stronger disposition, identity divergence or new high-risk change must state its loss and receive contextual maintainer confirmation before the fact-closed adoption set is pushed.",
      "licenseFiles": ["LICENSES/ui-mother-MIT.txt"]
    },
    {
      "id": "device-helper-hid-reference",
      "url": "https://github.com/facebook/idb.git",
      "revision": "dd0cb550510331f2d11e9130cb003d2425688e28",
      "paths": ["apps/server/native/device-helper/Sources/HIDBridge.h", "apps/server/native/device-helper/Sources/HIDBridge.m"],
      "sourcePaths": ["PrivateHeaders/SimulatorApp/Indigo.h", "FBSimulatorControl/HID/FBSimulatorIndigoHID.swift"],
      "rights": "The selected HID message layout and delivery mechanism are adapted from facebook/idb under its retained MIT license. No idb binary, service, product identity or unrelated source is adopted.",
      "mode": "adapt",
      "changes": "Namespaced Objective-C bridge for OmniMind's locally built iOS Simulator helper; packaged artifacts must retain the exact license notice.",
      "updatePolicy": "Pinned revision; re-review private API compatibility and rights before changing the reference revision.",
      "licenseFiles": ["LICENSES/facebook-idb-MIT.txt", "apps/server/native/device-helper/LICENSE.facebook-idb"]
    },
    {
      "id": "bundled-omnimind-agent-runtime",
      "url": "https://github.com/earendil-works/pi.git",
      "revision": "914cf1472e715297caa30db4b9535d534a9eb718",
      "paths": ["vendor/omnimind-pi-coding-agent-0.84.2.tgz", "patches/pi-coding-agent/0.84.2-model-config-reader.patch", "patches/@earendil-works%2Fpi-coding-agent@0.84.2.patch", "scripts/vendor-omnimind-pi-runtime.mjs"],
      "sourcePaths": ["packages/coding-agent"],
      "archiveSha256": "b57b866dff4917eb24432a8292ee927139c34dd137208f5fcdff71cc337d37a7",
      "upstreamPackage": "@earendil-works/pi-coding-agent@0.84.2",
      "upstreamPackageIntegrity": "sha512-l4E+B7hgXKWddRo8bC/eSue2aWZjEgJ9xIpf5p0Og+lq8a2TArCwJ0HCoCPCgaBP/tN4zbYH/wOwvx9pJpeLCA==",
      "generation": {
        "sharedRuntimeBytes": "patched",
        "factoryDefaultSeam": "The product runtime exports its stable identity-neutral default instruction segment and accepts one caller-supplied replacement as an input to the same native builder. Dynamic tools, guidelines, context, Skills, cwd, manual SYSTEM replacement and Extension mutation remain native; no second composer or Prompt registry is introduced.",
        "patchPath": "patches/pi-coding-agent/0.84.2-model-config-reader.patch",
        "patchSha256": "499b1257c2bc8f98beab1c799bcf669b3b1836f61a06349a2b52247ea1a873af",
        "stockPatchPath": "patches/@earendil-works%2Fpi-coding-agent@0.84.2.patch",
        "stockPatchSha256": "7acead23cba0ac9243b85150049c8ab98a0f1d5d9ed05e133a17afd20165cc77",
        "generatorPath": "scripts/vendor-omnimind-pi-runtime.mjs",
        "behavioralDifferences": ["package identity", "piConfig.configDir", "identity-neutral default system prompt without unshipped docs navigation", "bounded project context root or global-only context projection", "host-owned immutable engine contract appended after extension turn mutation", "injectable models.json content reader", "accepted model-config provider provenance", "credential-blind model-config projection", "typed persistent model-config provider mutation with retained-model merge, preview and safe credential-reference intent", "typed credential-blind model cost and tier editing", "typed nested editing for a closed protocol-specific compat subset", "write-only environment header-reference set/clear with value-blind metadata", "explicit generic model discovery through the configured Pi protocol and credential", "typed prompt outcomes for handled extension commands and input hooks, including current-session Agent work started through sendUserMessage or sendMessage triggerTurn", "explicit reader-mode models store path remains file-backed", "request-scoped missing-package policy for resource loading", "intent-scoped package resource listing and filtering", "credential-blind public npm package identities and actions"],
        "archiveDisposition": "The product archive is rebuilt from exact Pi 0.84.2 source with one committed product patch, retains the upstream LICENSE, removes standalone CLI entrypoint exposure, omits development/public documentation and example payloads, and exact-pins the Pi-family dependency closure. Its default prompt base is identity-neutral and contains no navigation to omitted docs/examples; OmniMind identity remains in a separate immutable engine contract that is normalized and appended exactly once after Extension turn mutation, while general Host/tool guidance stays in the mutable native append lifecycle. ResourceLoader remains the sole context owner while accepting either a canonical Project root boundary for an admitted Agent Session or global-only mode for Chat and passive discovery. Passive discovery never obtains Project trust or executes Project Extension factories. The stock Pi dependency receives only the compiled typed prompt-outcome behavior through the separately hashed Bun patch; its package identity, default prompt, config, state and catalog remain stock. The product patch adds no registry, trust store, Prompt store or second persisted configuration."
      },
      "rights": "The fixed Pi coding-agent source and generated runtime are MIT-licensed. The shipped archive retains its upstream LICENSE, and the exact root redistribution text is LICENSES/pi-coding-agent-MIT.txt.",
      "mode": "adapt",
      "changes": "The product-owned physical module is generated from packages/coding-agent at the fixed revision. Its default base is identity-neutral, preserves dynamic tools/guidelines/context/skills/cwd assembly and removes Pi identity plus navigation to docs/examples that the product archive intentionally omits. A narrow ResourceLoader input constrains context candidates to global agent-dir context plus canonical Project root through cwd for an admitted Agent Session, or to global-only context for Chat and passive discovery; containment uses physical paths without changing the loader's existing lexical path projection. Passive discovery stays untrusted, does not execute Project Extension factories and cannot expose pre-session project-local Skills or Prompt commands; the first real Agent Session loads those trusted resources before its request. A narrow AgentSession seam lets Extensions keep replacing the mutable prompt in their native order, then removes any duplicate canonical engine contract and appends the frozen engine contract exactly once before each model request; general Host/tool guidance remains in the native mutable append order. The same source patch lets a caller inject raw models.json UTF-8 content into Pi's existing ModelConfig parser, read back only accepted provider IDs, request one typed provider upsert or removal through the same official schema, encode a typed environment-variable, command or clear credential-reference intent without exposing retained references, safely edit credential-blind model cost rates, tiers and a closed protocol-specific compat subset while retaining hidden fields, set or clear provider/model header environment references through a write-only typed intent while projecting only header name and source kind, explicitly discover model identities for Pi's four generic models.json protocols through the configured endpoint and effective credential, and distinguish a normal Agent run from a handled extension command or input hook without an Agent run. For those two handled paths only, current-session Agent work started through `sendUserMessage` or `sendMessage({ triggerTurn: true })` is owned through settlement rather than inferred from timing; this does not adopt TUI-only actions, session replacement or general Extension UI parity. The same narrow prompt-outcome behavior is applied to the stock coding-agent dependency as a compiled patch so Desktop-exposed commands settle identically without sharing OmniMind config, state, identity or Project trust. It also provides a request-scoped missing-package policy to ResourceLoader reloads and manages one explicitly selected package's resource filters through Pi's existing PackageManager. Compat edits use nested public-field set/clear semantics and preserve complex routing, templates and unknown fields. Header values remain recursively redacted; imported literal and command-backed entries are only classified, preserved or cleared, new command-backed headers are rejected, and reserved request/authentication headers cannot be newly configured. Discovery is bounded, cancellable, credential-blind at its return boundary, and never mutates models.json or the catalog store. Credential and header references remain passive during projection and resolve only through explicit Pi auth/request operations. Prompt outcomes contain only the handling kind and success bit; extension error text remains on Pi's diagnostic channel. The mutation seam preserves unrelated JSONC bytes, serializes writers, validates before a private same-directory atomic replacement, and remains mutually exclusive with passive path-based reads. Create and refresh share the safe reader; an explicitly supplied modelsStorePath remains Pi FileModelsStore-backed so Settings, discovery and Session share one persisted catalog. The missing-package policy is forwarded through both trust passes and defaults to stock Pi behavior when absent. Passive package listing stays configuration-only; the product bridge receives only process-scoped opaque package IDs, credential-blind display names and capability facts. Pi rematches every action against current configuration; public install accepts only canonical npm identities. Git, local, private and unsupported entries remain redacted and unavailable without poisoning the list. Resource resolution requires an exact package intent, fails closed when that package is missing, and never resolves unrelated packages. Package identity and piConfig configDir/name route private state to .omnimind. Packaging metadata removes the standalone pi bin and development-only scripts/dependencies, omits unshipped docs/examples, and pins the Pi-family dependency closure.",
      "updatePolicy": "Pinned revision, upstream npm integrity, exact product-source and stock dependency patch digests, and product archive SHA-256. Reproduction runs `node scripts/vendor-omnimind-pi-runtime.mjs --source <clean-exact-pi-checkout>`: before any source build the generator verifies both committed patch identities, rejects the wrong or dirty revision, applies the sole product source patch with a conflict check, restores pinned generated model data, builds and runs focused Pi reader/mutation/runtime tests with network discovery disabled, applies the recorded identity/configDir/archive closure, verifies deterministic packing and cleans its temporary tree. Bun applies the separately hashed stock dependency patch or fails on conflict. On every Pi intake, first remove the patches if upstream exposes equivalent safe reader/provenance/persistent-mutation/store/prompt-outcome APIs; otherwise update the affected patch, its digest owner and this adoption record together, and stop loudly on any digest drift or conflict. Pi post-tag code is excluded until separately adopted. Any source, version, generation rule, dependency closure, archive digest, rights or license change requires explicit source intake and affected runtime/ecosystem revalidation before replacement.",
      "licenseFiles": ["LICENSES/pi-coding-agent-MIT.txt"]
    },
    {
      "id": "pi-ai-oauth-page-renderer",
      "url": "https://github.com/earendil-works/pi.git",
      "revision": "914cf1472e715297caa30db4b9535d534a9eb718",
      "paths": ["patches/@earendil-works%2Fpi-ai@0.84.2.patch", "package.json", "bun.lock"],
      "sourcePaths": ["packages/ai/src/auth/types.ts", "packages/ai/src/auth/oauth/oauth-page.ts", "packages/ai/src/auth/oauth/openai-codex.ts", "packages/ai/src/auth/oauth/anthropic.ts", "packages/ai/src/auth/oauth/openrouter.ts", "packages/ai/src/auth/oauth/radius.ts"],
      "upstreamPackage": "@earendil-works/pi-ai@0.84.2",
      "upstreamPackageIntegrity": "sha512-6MzsrYIYNVlE7SfpbL2yYb67Qo58p/7Q+xWG1RZvoX1P80aRCHSod2/13aFpxkow1lPO2LEh3c495J0Gwmyjig==",
      "rights": "The fixed Pi AI source and patched dependency remain MIT-licensed under the retained Pi redistribution text. No OAuth protocol, credential store or Provider identity is adopted as OmniMind product authority.",
      "mode": "adapt",
      "changes": "A per-login optional AuthInteraction renderer may replace only the browser loopback completion/error HTML. It receives only the safe authorization-received/error state, never Provider messages, diagnostics, codes or token-exchange results. OpenAI Codex, Anthropic, OpenRouter and Radius pass the same request-scoped renderer through their existing callback servers; absent or failing renderers retain the stock Pi page. Provider authorization, state validation, token exchange, cancellation and device-code flows remain unchanged.",
      "updatePolicy": "Pinned package integrity plus Bun patchedDependencies. Every install applies the committed patch or fails on conflict; remove it when upstream exposes an equivalent request-scoped renderer. A Pi update must re-check all four browser callback providers and prove the stock default and device-code paths remain unchanged before changing the pinned package or patch. The current provider-default automation is valid only because each OAuth select prompt it can consume in pinned Pi 0.84.2 marks its first option as default/recommended; source intake must re-prove that property or fail closed to an explicit user choice rather than treating array order as a permanent API.",
      "licenseFiles": ["LICENSES/pi-coding-agent-MIT.txt"]
    },
    {
      "id": "thinking-orbs-composing-20px",
      "url": "https://github.com/Jakubantalik/thinking-orbs.git",
      "revision": "bd204b73c9b6660fad7210b1ad48d9dc2adbb89d",
      "paths": ["apps/web/src/components/chat/ComposingOrb.tsx", "apps/web/src/components/chat/composingOrbPainter.ts", "apps/web/src/components/chat/composingOrbPainter.test.ts", "apps/web/src/components/chat/ThinkingStatus.browser.tsx"],
      "sourcePaths": ["src/ThinkingOrb.tsx", "src/theme.ts", "src/presets.ts", "src/engine/core.ts", "src/engine/profiles.ts", "src/engine/ribbon.ts"],
      "upstreamPackage": "thinking-orbs@0.3.1",
      "upstreamPackageIntegrity": "sha512-3BG1aeB1RUTxItCml/BBuIz5JRM4kZqGuyx+vouv0fXTtcR9ZNoKjWGneHPx94y74GxgArwJZ1qbJR5dt54kSw==",
      "upstreamTarballSha256": "f561ab192d0f80a367c2cf56d9fd409f3dc0570521c08300c3bbf232ede79296",
      "rights": "The fixed source is MIT-licensed under the retained exact legal text. Adoption is limited to the Composing/Ribbon 20px painter and the runtime guards needed by OmniMind's single live-status consumer; no package binary or unrelated state is shipped.",
      "mode": "copied-adapted",
      "changes": "The official Composing 20px preset is resolved to one fixed local painter with the exact 208-mark geometry, projection, depth ink, dot sizing and speed. A product-local canvas wrapper retains DPR cap 2, requestAnimationFrame, offscreen and hidden-document pause, reduced-motion static frame and the existing OmniMind theme authority. The other eight states, 64px presets, registries, generic React API, package dependency and unused configuration were deliberately removed. Fixed geometry and Chromium pixel baselines prevent drift.",
      "updatePolicy": "Pinned package version, Git revision, npm integrity and tarball SHA-256. Do not tune or rewrite the painter from memory. Any source, preset, rights or lifecycle change requires exact upstream comparison plus affected geometry, pixel, theme, visibility and reduced-motion revalidation before replacement.",
      "licenseFiles": ["LICENSES/thinking-orbs-MIT.txt"]
    },
    {
      "id": "bitfun-thinking-hints-motion",
      "url": "https://github.com/GCWing/BitFun.git",
      "revision": "f9aebc102b21d6d4ac3ffd4088defebf7f4baff1",
      "catalogReferenceRevision": "142d7e38729b3d646ae305c162e6848d0d44fff9",
      "paths": ["apps/web/src/components/chat/ThinkingStatus.tsx", "apps/web/src/components/chat/ThinkingStatus.browser.tsx", "apps/web/src/i18n/thinking-hints.en-US.json", "apps/web/src/i18n/thinking-hints.zh-CN.json", "apps/web/src/i18n/thinkingHints.ts", "apps/web/src/index.css"],
      "sourcePaths": ["src/web-ui/src/flow_chat/components/modern/ProcessingIndicator.tsx", "src/web-ui/src/flow_chat/components/modern/ProcessingIndicator.scss", "src/web-ui/src/locales/en-US/flow-chat/processing-hints.json", "src/web-ui/src/locales/zh-CN/flow-chat/processing-hints.json"],
      "catalogInputSha256": {"en-US": "54faf3727ef54e1d3a4dea4e3ef1002cfb596a28683ae73d319701476dd598b3", "zh-CN": "f5249bbd0b49f20c038a0be2d4839ed18c8c96aa48cd139bf99d201c4b9d1135"},
      "rights": "The selected historical motion and upstream catalog lineage are MIT-licensed under the retained BitFun legal text. The maintainer supplied and approved the final index-aligned 338-item Chinese and English catalog inputs for OmniMind.",
      "mode": "copied-adapted",
      "changes": "OmniMind retains the reviewed 400ms -4px entry, 1.6s opacity 1-to-.25 breathe and five-second keyed replacement. The initial hint is randomized, later hints advance without changing on ordinary renders, trailing static ellipses are replaced by the approved three-dot symmetric tide, and reduced-motion freezes all decorative motion. The presentation stays inside OmniMind's existing transient Timeline row; it creates no runtime-status store, transcript item, reasoning claim or progress authority. The original one-second blank delay and BitFun dot-matrix icon are not adopted because OmniMind preserves immediate feedback with its selected Composing orb.",
      "updatePolicy": "Pinned historical motion revision, catalog reference revision, exact catalog-input digests and retained legal text. Catalog edits must preserve bilingual count/index parity and uniqueness; motion edits require focused Timeline, reduced-motion, truncation, stream/scroll and pixel review.",
      "licenseFiles": ["LICENSES/bitfun-MIT.txt"]
    }
  ]
}
```

身份扫描只阻止 donor/旧产品身份进入普通产品表面；OmniMind 自有 workspace package 统一使用私有 `@omnimind/*` 作用域，不保留 `@synara/*` alias。Synara 名称只在本 adoption record、research、法定文本和明确的 About/Licenses/provenance 中准确保留。Pi 与实际 shipped Provider 是公开产品依赖，不属于需要洗掉的身份。Provider 名称可以出现在真实 integration、选择器、详情、诊断、About 与 Licenses 中，但不得作为虚假能力或 donor 品牌泄漏。

```identity-denylist
t3-code
proma
weknora
sogen
omni-harness
```

```structure-policy
{
  "authorRoots": ["apps", "architecture", "assets", "packages", "patches", "research", "scripts", "test", "missions", "LICENSES"],
  "toolRoots": [".agents", ".claude", ".codex", ".cursor", ".obsidian", ".snow"],
  "generatedDirectoryNames": ["build", "coverage", "dist", "out", "release"],
  "maxDirectoryDepth": 7,
  "forbiddenNameTokens": [
    "adapter2",
    "common",
    "helper",
    "legacy",
    "manager",
    "misc",
    "migration",
    "new",
    "old",
    "temp",
    "utils"
  ]
}
```

当前 production-adopted baseline 是 exact reviewed Synara head `57f48ef…` 的单一物理 substrate：`apps/desktop + apps/web + apps/server + packages/contracts + packages/shared`。产品关系是 Synara upstream platform → OmniMind downstream distribution，不是 selective donor 拼装；上方 adoption record 只描述已完成 evidence invariant 的 revision 与固定 divergence。`apps/service`、`apps/native-host` 与旧 Product Control Plane 不属于生产拓扑；维护者已确认不存在前代用户，Synara/DP Code legacy profile/storage migration 因 first-public identity safety 永久排除，不读取或改写这些无关身份路径。Pi 与其他对照项目仍只是研究来源，除非进入上述 adoption 清单；exact revision/tree、rights/lineage/assets、构建/测试/运行观察和兼容限制只以 [`research/source-review.md`](research/source-review.md) 为证据 owner，法定文本保存在 `LICENSES/`。

未来每轮 Synara 审查、辩证吸收、`$converge` 提问、实施授权与 exact-SHA 交付统一遵循根 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md)；该手册不自动轮询上游，也不取代本 README 的 production adoption authority。

## 5. 已有证据与当前下一步

Source Review 已记录 fixed source 的 exact comparison、全树 disposition 及其局限。Synara source adoption 的最终证据只覆盖当前产品范围；维护者已明确把签名、公证、Windows/Linux artifact/journey、GitHub Release 与 update feed 排除出本轮，而不是把它们列为 adoption 阻塞。

当前 `/Applications/OmniMind.app` 来自 exact pushed product commit `64acfab5607fd1485ca4c6d97362741949ff992b`；macOS arm64 DMG SHA-256 为 `114434d00e97df39ce2062d5369fb60ba72319b9c4c26e565c79a51a7a91a907`，安装副本 app.asar SHA-256 为 `43ed077ccc322942410e3ceeb9fd544a4854265e76446685e6f90729bd3a84ae`，内嵌 commit 与 source 一致，240 项 staged legal identities 闭合。任务专用 HOME、OMNIMIND_HOME、XDG、显式 Electron userData 与 Provider private home 证明 Main、Helper、Renderer 和 bundled Server 全部隔离；fresh 启动与同 profile 重开均完成，bundled Server 只收到 canonical Browser Host pipe 与 capability FD，旧 Browser Host env/API alias 未进入进程环境或安装版 app.asar。全部实例正常退出后进程树归零，临时 launch 环境已恢复；上一安装副本和任务 profile 已移入废纸篓，可恢复。

该 descendant 未改动 `d120b394d50248472ed294068cd1791198e943e6` 已闭合的 model-hint runtime 链；相关 live 与 legacy-profile 证据仍精确绑定该祖先产品 SHA，而不冒充在 `64acfab…` 重跑：其 DMG SHA-256 为 `dea7b9bbf752b39e904e3ed4ecface1c4ac4a1d7c155d002a2fa0cb6787de69e`，app.asar SHA-256 为 `2f8612c3b0a637f031e4bf2edad6c8e5914dfbab21f455ce421bd6db24bbddbc`。该安装版从 authoritative runtime catalog 显示 DeepSeek 2 个、Xiaomi 6 个模型，精确选择 `DeepSeek V4 Pro` 完成首轮与 continuation，关闭重开后同一 Chat、两轮结果和模型选择恢复；人工植入旧 OmniMind `customModels` 的第二隔离 profile 证明启动读取不会改盘且旧条目、转换入口和发送候选均不可见，一次无关 streaming 设置保存只让 revision `4→5` 并自然丢弃该字段，其他哨兵设置逐项保持，重开结果稳定。当前产物仍是未签名、未公证的本地 ad-hoc candidate，没有创建 Release、生成 current-SHA ZIP 或修改 update feed；后续 docs-only SHA 不冒充 installed product bytes。

上一安装基线 `/Applications/OmniMind.app` 来自 exact pushed product commit `14c54d5a23e5a40d183b508d2eae51ec49080964`；macOS arm64 DMG SHA-256 为 `24e4800c32f29c6dbce29e0166f39925365ca3fad89b26ab1af31756f2fb762d`，DMG 内与安装副本 app.asar 均为 `0333cfaa3445390fe000026dde8459b19d069cc9d50e6849eda5d443be10f23f`，240 项 staged legal identities 闭合。本轮未生成与该 SHA 对应的 ZIP，目录中的旧 ZIP 不属于当前证据。全新任务专用 HOME、OMNIMIND_HOME、XDG、显式 Electron userData 与 Provider private home 下的安装版 journey 证明：主进程、Helper 与 bundled Server 都使用隔离路径；十个 Engine 均显示身份图标与双语“可用/登录/未安装”状态；扩展用量页、托管工作树页、`/debug`、480/960/1440 宽度、OmniMind 深色图标、Profile PNG copy/save 均真实可达；本地 PNG SHA-256 为 `513c13b7b1a1d35cb9bd0e764deaca2675e077fe87dd13e0a4c0cde5ed53f4f3`。同 profile 正常退出重开后安全回到根页，项目、宽屏与深色图标偏好保持，迁移 1–100 首启成功且重开无需新增迁移。一次在新建临时 Terminal 后立即跨 Agent/Chat 的 renderer snapshot 请求返回 `THREAD_SNAPSHOT_NOT_FOUND`，服务端没有对应持久 Thread；同 profile 重开清理失效路由，随后相同步骤未复现，也没有 Goal continuation 错误。Goal failure/interrupt/reopen、Todo 独立、目录 reveal 与跨平台 source-only 行为由同一 shipped-code SHA 的作者等价 focused/browser 与完整仓库回归承担；隔离 profile 未配置模型凭据，因此本轮没有伪造真实 Provider 成功 turn。祖先 product `db25a5b91343a4ddbf70fedd98ea3583bd020317` 的 deterministic request capture、MiMo/DeepSeek、Session snapshot、底层 native reload 与 cache-stable digest 证据仍覆盖本轮未改动的 runtime 链。该产物是本地 ad-hoc candidate，不冒充 official release，也没有创建 GitHub Release 或修改 update feed；F-22 保持 `candidate`，后续纯文档 SHA 不冒充 installed product bytes。

Extension Architecture 1.0的shipped-bytes证据锁定exact pushed code SHA `9c05e09027be374cc2e858536aad5ab79a394c45`：Device fresh default与legacy intent migration、统一Gateway→Pi投影、显式有限composition、eager Host inline Extension/native reload、partial collision、prompt diet以及all-provider exact-turn已经通过focused/full gates；旧Host-owned loader链已从active code删除。MiMo Token Plan CN与DeepSeek V4 Pro完成真实Host、continuation、abort、folder-backed Agent、Goal与Automation/manual-follow-up journeys；同SHA隔离packaged profile完成fresh Device off、explicit Device-on重开保持与进程清理。DMG SHA-256为`8357594e71dc4c2b212b7ea84910a8752b5eb28a40d3ee942deabd9d1db31f64`。该code已通过merge commit `5e22dd916ccba0dbc383fb0a9495f4888a69594b`并入`main`，但未创建Release、未修改update feed，也没有替换上一段记录的本机真实安装；后续docs-only证据SHA不冒充shipped bytes。精确状态只见[`execution-brief.md`](execution-brief.md)与active Campaign。

旧 isolated Native Host、平行 Product Control Plane 与 Product Truth checkpoint 只作可追溯历史，不再定义生产 topology 或下一步。

首个真实headless Pi Package checkpoint位于commit `16f14d188e38134f6f45c46bfcb57ff36c1e8565`。它只证明historical `todo.ts`可作为Pi-ecosystem lifecycle/compatibility regression input，也证明跨Provider staged activation/lease/LKG路线过重；它不是当前Todo adoption。当前Todo是OmniMind-authored、product-bundled Pi Session Extension，具体owner与证据只看[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)。第三方或团队Extension继续按Pi原生source/provenance/lifecycle进入，不能因能被Pi加载就变成Host capability。

当前剩余工作、并发、真实阻塞与下一动作只见 [`execution-brief.md`](execution-brief.md)；这不删除 Synara 已有的 OpenCode 或其他 Provider adapter。当前 claim 状态与 evidence pointer 只见 active Campaign，历史路线不得形成新的施工准入门。
