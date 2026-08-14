# OmniMind

OmniMind 是一个本地优先、多 Provider 的桌面 Agent 产品。普通用户面对的是完整的 **OmniMind** 产品与默认内置的 **OmniMind Agent**；Synara 和 Pi lineage 只作为实现、兼容与法定来源存在，不成为日常产品语言。只有用户主动打开 Provider 选择或技术详情时，独立的 stock Pi 才以 `Pi` 显示，其他真实 Provider 同理。所有 Provider 共用一套继承的 Product Orchestration 与 Registry，但各自保留真实的 identity、版本、配置、Session、私有 state 与生态能力。

> **OmniMind-native by default. Pi-ecosystem compatible. Provider-honest. Source-first.**

- **OmniMind-native by default**：OmniMind Agent runtime 由产品内置，随 OmniMind 一起构建、签名、更新和验收；这表示无需另装 Agent runtime，不承诺在没有可用模型凭据或本地模型时伪造首次回复。
- **Pi-ecosystem compatible**：OmniMind Agent 保留可维护的 Pi Package/Extension/Skill/Prompt/Tool/MCP compatibility；Pi 技术 lineage 在 About、Licenses 与源码归属中准确披露。
- **Provider-honest**：Codex、Claude、OpenCode、Pi 等 inherited integrations 各自保留原生协议、能力和限制；共同 UI 不伪造功能齐平、跨 Provider continuation 或静默 fallback。
- **Source-first**：优先无损承接 Synara 的成熟产品能力和 Pi-compatible 生态表面，只补经真实 journey 证明的 OmniMind 差异，不把上游已解决的问题重新平台化。

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
| 施工顺序、进入/停止条件与阶段 proof                            | [`execution-brief.md`](execution-brief.md)                                   |
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

OmniMind Agent 的首个技术 lineage/生态兼容基准是 Pi stable `v0.84.1`，之后使用自己的 runtime version；它不以 Pi version 作为长期产品身份。它使用独立构建或等价的 instance-level 配置，使全局与 project-local private state 都进入 `.omnimind`。stock Pi 仅在被用户显式选择时使用自己的 `.pi` native state；产品 reset、OmniMind Agent 和后台 discovery 都不得读取、迁移、同步或改写它。stock Pi 的实际 session runtime version 与可选本机 CLI version 必须分别呈现，不能互相冒充。Synara production adoption 已从初始 responsibility baseline `02c8a6cb9948eba0afc828492764e7236965c61f` 经维护者批准的 intake 更新到 exact reviewed head `712d88f98b9afed9a4617b78dc62a8f342d93177`；选择性边界见下方唯一 adoption record。

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
      "revision": "712d88f98b9afed9a4617b78dc62a8f342d93177",
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
      "changes": "The exact physical Desktop, Web, Server, contracts, shared, patch, build and release substrate was transplanted from 02c8a6c, then the maintainer-approved 02c8a6c..712d88f intake was adopted by reviewed responsibility. Accepted mechanisms include appearance persistence/polish, reliability and scroll fixes, Pi max/model isolation, native provider forks and source context, Luna/high defaults, and the iOS Simulator Device pane. OmniMind retains its product authority, bilingual catalog, package/app/protocol/updater/profile/storage/artifact namespace and brand; excludes donor icons, version/changelog/release identity, forced settings migration and any competing approval or control plane; agent-triggered Device mutations fail closed without a verifiable approval receipt.",
      "updatePolicy": "Pinned revision; source updates begin only after a maintainer-requested read-only intake and explicit approval of that intake set.",
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
      "revision": "53fa77ccd8a279eb87e92294ef3687b03ff80112",
      "paths": ["vendor/omnimind-pi-coding-agent-0.84.1.tgz", "patches/pi-coding-agent/0.84.1-model-config-reader.patch", "scripts/vendor-omnimind-pi-runtime.mjs"],
      "sourcePaths": ["packages/coding-agent"],
      "archiveSha256": "4a737d2dabec93b515bbe9ad16936cda25d72161350a70d1dda96d1e2bae78e9",
      "upstreamPackage": "@earendil-works/pi-coding-agent@0.84.1",
      "upstreamPackageIntegrity": "sha512-ncAqFrG+iybuPGOhMiZoEHkEzTpJgz3guYD32pD+M7ucc0WeHmauP6wa7qwP8V/KWvsZDVNa5XGsdZ7fkC7w7A==",
      "generation": {
        "sharedRuntimeBytes": "patched",
        "patchPath": "patches/pi-coding-agent/0.84.1-model-config-reader.patch",
        "patchSha256": "94ca6805b1cb76f15236186db1d5883ffd1315cc91311ae3f72258ecff1f25a7",
        "generatorPath": "scripts/vendor-omnimind-pi-runtime.mjs",
        "behavioralDifferences": ["package identity", "piConfig.configDir", "injectable models.json content reader", "accepted model-config provider provenance", "credential-blind model-config projection", "typed persistent model-config provider mutation with retained-model merge, preview and safe credential-reference intent", "typed credential-blind model cost and tier editing", "typed nested editing for a closed protocol-specific compat subset", "write-only environment header-reference set/clear with value-blind metadata", "explicit generic model discovery through the configured Pi protocol and credential", "explicit reader-mode models store path remains file-backed", "request-scoped missing-package policy for resource loading", "intent-scoped package resource listing and filtering", "credential-blind public package identities and actions"],
        "archiveDisposition": "The product archive is rebuilt from exact Pi 0.84.1 source with the single committed ModelConfig reader/provenance/mutation/package-resource patch, retains the upstream LICENSE, removes standalone CLI entrypoint exposure, omits development/public documentation and example payloads, and exact-pins the Pi-family dependency closure. Pi remains the sole parser, schema, provider-composition, persistent provider-mutation and package-resource filtering authority; the product patch adds no registry, package state store or second persisted configuration."
      },
      "rights": "The fixed Pi coding-agent source and generated runtime are MIT-licensed. The shipped archive retains its upstream LICENSE, and the exact root redistribution text is LICENSES/pi-coding-agent-MIT.txt.",
      "mode": "adapt",
      "changes": "The product-owned physical module is generated from packages/coding-agent at the fixed revision. One source patch lets a caller inject raw models.json UTF-8 content into Pi's existing ModelConfig parser, read back only accepted provider IDs, request one typed provider upsert or removal through the same official schema, encode a typed environment-variable, command or clear credential-reference intent without exposing retained references, safely edit credential-blind model cost rates, tiers and a closed protocol-specific compat subset while retaining hidden fields, set or clear provider/model header environment references through a write-only typed intent while projecting only header name and source kind, explicitly discover model identities for Pi's four generic models.json protocols through the configured endpoint and effective credential, provide a request-scoped missing-package policy to ResourceLoader reloads, and manage one explicitly selected package's resource filters through Pi's existing PackageManager. Compat edits use nested public-field set/clear semantics and preserve complex routing, templates and unknown fields. Header values remain recursively redacted; imported literal and command-backed entries are only classified, preserved or cleared, new command-backed headers are rejected, and reserved request/authentication headers cannot be newly configured. Discovery is bounded, cancellable, credential-blind at its return boundary, and never mutates models.json or the catalog store. Credential and header references remain passive during projection and resolve only through explicit Pi auth/request operations. The mutation seam preserves unrelated JSONC bytes, serializes writers, validates before a private same-directory atomic replacement, and remains mutually exclusive with passive path-based reads. Create and refresh share the safe reader; an explicitly supplied modelsStorePath remains Pi FileModelsStore-backed so Settings, discovery and Session share one persisted catalog. The missing-package policy is forwarded through both trust passes and defaults to stock Pi behavior when absent. Passive package listing stays configuration-only; the product bridge receives only process-scoped opaque package IDs, credential-blind display names and capability facts. Pi rematches every action against current configuration; public install accepts only canonical npm or credential-free HTTPS Git identities, while local/private/unsupported entries remain redacted and unavailable without poisoning the list. Resource resolution requires an exact package intent, fails closed when that package is missing, and never resolves unrelated packages. Package identity and piConfig configDir/name route private state to .omnimind. Packaging metadata removes the standalone pi bin and development-only scripts/dependencies, omits unshipped docs/examples, and pins the Pi-family dependency closure.",
      "updatePolicy": "Pinned revision, upstream npm integrity, single patch digest and product archive SHA-256. Reproduction runs `node scripts/vendor-omnimind-pi-runtime.mjs --source <clean-exact-pi-checkout>`: before any source build the generator verifies the committed patch bytes against the adopted digest, rejects the wrong or dirty revision, applies the sole patch with a conflict check, restores pinned generated model data, builds and runs focused Pi reader/mutation/runtime tests with network discovery disabled, applies the recorded identity/configDir/archive closure, verifies deterministic packing and cleans its temporary tree. On every Pi intake, first remove the patch if upstream exposes equivalent safe reader/provenance/persistent-mutation/store APIs; otherwise update the one patch, its generator constant and this adoption record together, and stop loudly on any digest drift or conflict. Pi post-tag code is excluded until separately adopted. Any source, version, generation rule, dependency closure, archive digest, rights or license change requires explicit source intake and affected runtime/ecosystem revalidation before replacement.",
      "licenseFiles": ["LICENSES/pi-coding-agent-MIT.txt"]
    },
    {
      "id": "pi-ai-oauth-page-renderer",
      "url": "https://github.com/earendil-works/pi.git",
      "revision": "53fa77ccd8a279eb87e92294ef3687b03ff80112",
      "paths": ["patches/@earendil-works%2Fpi-ai@0.84.1.patch", "package.json", "bun.lock"],
      "sourcePaths": ["packages/ai/src/auth/types.ts", "packages/ai/src/auth/oauth/oauth-page.ts", "packages/ai/src/auth/oauth/openai-codex.ts", "packages/ai/src/auth/oauth/anthropic.ts", "packages/ai/src/auth/oauth/openrouter.ts", "packages/ai/src/auth/oauth/radius.ts"],
      "upstreamPackage": "@earendil-works/pi-ai@0.84.1",
      "upstreamPackageIntegrity": "sha512-wMsAdJMxuNri08vLqTyYVI201DQQezGhPSTkzYsHdw5dYX3rCNwEmSvpaAwhi7ELKI/2tE/CEgSWg/6iRxSgdQ==",
      "rights": "The fixed Pi AI source and patched dependency remain MIT-licensed under the retained Pi redistribution text. No OAuth protocol, credential store or Provider identity is adopted as OmniMind product authority.",
      "mode": "adapt",
      "changes": "A per-login optional AuthInteraction renderer may replace only the browser loopback completion/error HTML. It receives only the safe authorization-received/error state, never Provider messages, diagnostics, codes or token-exchange results. OpenAI Codex, Anthropic, OpenRouter and Radius pass the same request-scoped renderer through their existing callback servers; absent or failing renderers retain the stock Pi page. Provider authorization, state validation, token exchange, cancellation and device-code flows remain unchanged.",
      "updatePolicy": "Pinned package integrity plus Bun patchedDependencies. Every install applies the committed patch or fails on conflict; remove it when upstream exposes an equivalent request-scoped renderer. A Pi update must re-check all four browser callback providers and prove the stock default and device-code paths remain unchanged before changing the pinned package or patch. The current provider-default automation is valid only because every select prompt in pinned Pi 0.84.1 marks its first option as default/recommended; source intake must re-prove that property or fail closed to an explicit user choice rather than treating array order as a permanent API.",
      "licenseFiles": ["LICENSES/pi-coding-agent-MIT.txt"]
    },
    {
      "id": "pi-todo-headless-package",
      "url": "https://github.com/earendil-works/pi.git",
      "revision": "20be4b18d4c57487f8993d2762bace129f0cf7c6",
      "paths": ["assets/packages/pi-todo-0.81.1/todo.ts"],
      "rights": "The copied todo extension source is MIT-licensed under the retained canonical legal text. This adoption is limited to the exact selected file and does not adopt the Pi repository as OmniMind product source.",
      "mode": "transplant",
      "changes": "The selected todo.ts bytes are retained exactly from packages/coding-agent/examples/extensions/todo.ts at the fixed revision. Its V1 runtime proof must be redone against the isolated OmniMind Agent rather than inherited from the retired host.",
      "updatePolicy": "Pinned revision and exact SHA-256; any source, version, digest, rights, trust-surface or runtime-compatibility change requires a new explicit source review and revalidation before activation.",
      "licenseFiles": ["LICENSES/pi-todo-MIT.txt"]
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

当前 adopted UI mother 是 exact reviewed Synara head `712d88f…` 的选择性单一物理 substrate：`apps/desktop + apps/web + apps/server + packages/contracts + packages/shared`，实际接受与排除边界由上方 adoption record 拥有。`apps/service`、`apps/native-host`、donor profile/storage migration 与旧 Product Control Plane 不再属于生产拓扑。Pi 与其他对照项目仍只是研究来源，除非进入上述 adoption 清单；exact revision/tree、rights/lineage/assets、构建/测试/运行观察和兼容限制只以 [`research/source-review.md`](research/source-review.md) 为证据 owner，法定文本保存在 `LICENSES/`。

未来每轮 Synara 审查、辩证吸收、`$converge` 提问、实施授权与 exact-SHA 交付统一遵循根 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md)；该手册不自动轮询上游，也不取代本 README 的 production adoption authority。

## 5. 已有证据与当前下一步

Source Review 已记录 fixed source 的 exact comparison及其局限；当前 production bytes、focused/final gates 与真实 App journey 只在 active Campaign 记录 candidate evidence。局部绿色不证明视觉等价、Windows/Linux、签名 packaging 或 OmniMind V1。

旧 isolated Native Host、平行 Product Control Plane 与 Product Truth checkpoint 只作可追溯历史，不再定义生产 topology 或下一步。

首个真实 headless Pi Package checkpoint 位于 commit `16f14d188e38134f6f45c46bfcb57ff36c1e8565`。它证明 exact `todo.ts` 是可复用的 Pi-ecosystem regression input，也证明跨 Provider staged activation/lease/LKG 路线过重。V1 要证明该类 Package 能在 OmniMind Agent 的独立 Pi-compatible runtime 中运行，同时保持 stock Pi state 隔离。

当前以 exact Synara responsibility reset、Pi stable alignment、Agent/Chat mapping、原生生态、Workbench 质量和三平台发行的顺序闭合剩余证据；这不删除 Synara 已有的 OpenCode 或其他 Provider adapter。精确进入、停止和 proof 条件只见 [`execution-brief.md`](execution-brief.md)。

具体进入条件、停止条件和 proof gate 只见 [`execution-brief.md`](execution-brief.md)；当前 claim 状态只见 active Campaign。
