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
- `Agent | Chat` 是产品入口：Agent 复用 folder-backed Project Thread，Chat 复用 Home/Studio managed Thread，Groups 复用 Spaces；不创建第二套 durable objects。
- 生态生命周期属于各 Provider。V1 恢复并复用 Synara 既有 Plugin/Skill discovery；OmniMind Agent 只在其原生 API 已存在时提供 provider-scoped install/update/remove/reload。stock Pi 与其他 Provider 不为视觉对称而补造生命周期 API，共同 UI 不保存跨 Provider current/LKG/generation。
- V1 在 inherited Registry 中增加一个有界的 `omnimind` identity，并保留 `pi` 与其他既有 adapters；不把 ProviderKind 改成动态插件平台。OmniMind Agent 是默认、内置和最深验收路径；stock Pi 只在用户主动选择 Provider 或查看详情时以 `Pi` 显示。UI 使用每个 runtime 的 ready、auth、version、capability 与 diagnostics，不新增 support-tier 状态。
- U1 是获准的完整 UI 物理母体和可运行底盘；采用遵守 Workbench 的逐域 preserve/adapt/delete gate，不按截图另画薄 shell，不因未接线就删除成熟表面。
- 权限请求和限制只能按当前 Provider/Host 的真实行为表达；副作用确定性、恢复、性能、简体中文/英文和 macOS/Windows/Linux 都需要真实证据。

以下四条官方发行、Provider 与 Pi 生态要求由产品维护者锁定：

1. OmniMind 官方发行版内置 OmniMind Agent runtime；普通用户无需另行安装 Pi 或 Agent runtime。首次模型请求仍以真实的 model/provider auth readiness 为准，不静默 fallback。
2. OmniMind Agent 是 Pi-derived、产品自有的 runtime，可以策展、预装或自建兼容的 Package、MCP、Skill 与 Prompt；stock Pi 仍作为独立 Provider 保留。
3. OmniMind Agent 与 Pi 必须进入 inherited Provider Registry，而不是建立竞争的 Registry、Product Control Plane 或跨 Provider runtime。二者可共享窄的 Pi-family adapter core，但 identity、version、configuration、Session、state root、Package install state 和 diagnostics 必须隔离；可执行 runtime 不进入 Electron renderer。
4. 用户及 Provider credential 必须作为秘密保护，不能因内置、预装或产品配置而写入发行物或公开内容；任何 bundling、预装、修改与再分发都必须履行适用的真实 license、attribution 与 redistribution obligations。

这四条规定产品结果。`omnimind` 与 `pi` 是两个真实 Provider identity，但仍服从同一个 inherited orchestration；这与重建通用多 Engine 平台不同。

OmniMind Agent 的首个技术 lineage/生态兼容基准是 Pi stable `v0.84.1`，之后使用自己的 runtime version；它不以 Pi version 作为长期产品身份。它使用独立构建或等价的 instance-level 配置，使全局与 project-local private state 都进入 `.omnimind`。stock Pi 仅在被用户显式选择时使用自己的 `.pi` native state；产品 reset、OmniMind Agent 和后台 discovery 都不得读取、迁移、同步或改写它。stock Pi 的实际 session runtime version 与可选本机 CLI version 必须分别呈现，不能互相冒充。本轮 responsibility comparison 使用 exact Synara `02c8a6cb9948eba0afc828492764e7236965c61f`；实际 source bytes 和 Pi-derived runtime 进入 production 后，才更新本文件唯一 adoption record。

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
      "revision": "6aca3dcc505894481430967c2acb762b3dd1b358",
      "paths": [
        "apps/web",
        "apps/desktop",
        "apps/service",
        "packages/contracts",
        "packages/shared",
        "patches",
        "scripts",
        "package.json",
        "bun.lock",
        "bunfig.toml",
        "turbo.json",
        "tsconfig.base.json",
        "vitest.config.ts",
        ".oxfmtrc.json",
        ".oxlintrc.json"
      ],
      "rights": "The fixed source is MIT-licensed under the retained legal text. The maintainer has authorized retention, adaptation and redistribution of the fixed code and the complete 4,014-file icon corpus in source and product artifacts. Former product identity assets are not adopted.",
      "mode": "adapt",
      "changes": "The immutable T0 tree was transplanted into stable Web, Desktop, Product Service, contract, shared, patch and build-tool responsibilities; package, product, environment, protocol and storage identity were replaced; the authorized icon corpus was moved byte-for-byte to source-neutral line/fill paths behind the Glyph API; former product identity, marketing implementation/content and fake release history were removed while public-surface capability lineage retained explicit Product re-entry anchors; existing OmniMind brand assets replace first-party graphics.",
      "updatePolicy": "Pinned revision; upstream review starts only when the maintainer explicitly requests it, remains read-only through discussion, and requires explicit approval of the current intake set before implementation",
      "licenseFiles": ["LICENSES/ui-mother-MIT.txt"],
      "provenance": {
        "repositoryCommit": "2445acb987e443b44b7dc819de3de44c3d68b391",
        "historicalTrees": {
          "vendor/ui": "630f17e61abc478114bf83c1d740977c9f68b910"
        },
        "origins": {
          "apps/web": {
            "sourcePath": "vendor/ui/apps/web",
            "changes": "Adapted product identity, brand and icon paths/API; removed false public destinations and product history while retaining runnable UI plus fail-closed Docs, Changelog and Feedback re-entry anchors."
          },
          "apps/desktop": {
            "sourcePath": "vendor/ui/apps/desktop",
            "changes": "Adapted package, bundle, protocol, profile, static-client and platform-brand resource identity."
          },
          "apps/service": {
            "sourcePath": "vendor/ui/apps/server",
            "changes": "Moved the server package into the stable Product Service responsibility and adapted package, environment, profile and static-client paths."
          },
          "packages/contracts": {
            "sourcePath": "vendor/ui/packages/contracts",
            "changes": "Adapted package and product identity without changing its current mixed execution semantics."
          },
          "packages/shared": {
            "sourcePath": "vendor/ui/packages/shared",
            "changes": "Adapted package identity and renamed the product-home responsibility."
          },
          "patches": {
            "sourcePath": "vendor/ui/patches",
            "changes": "Retained only dependency patches required by the transplanted workspace."
          },
          "scripts": {
            "sourcePath": "vendor/ui/scripts",
            "changes": "Adapted required build, development, package and release checks; retained repository-owned governance checks and added deterministic glyph validation."
          },
          "package.json": {
            "sourcePath": "vendor/ui/package.json",
            "changes": "Adapted the workspace graph, package identity and quality gates."
          },
          "bun.lock": {
            "sourcePath": "vendor/ui/bun.lock",
            "changes": "Regenerated from the adapted workspace with the pinned package manager."
          },
          "bunfig.toml": {
            "sourcePath": "vendor/ui/bunfig.toml",
            "changes": "Retained required workspace package-manager configuration."
          },
          "turbo.json": {
            "sourcePath": "vendor/ui/turbo.json",
            "changes": "Adapted workspace task inputs and package responsibility names."
          },
          "tsconfig.base.json": {
            "sourcePath": "vendor/ui/tsconfig.base.json",
            "changes": "Retained the required TypeScript workspace baseline."
          },
          "vitest.config.ts": {
            "sourcePath": "vendor/ui/vitest.config.ts",
            "changes": "Retained the required workspace test configuration."
          },
          ".oxfmtrc.json": {
            "sourcePath": "vendor/ui/.oxfmtrc.json",
            "changes": "Retained and reviewed formatter configuration for the adapted roots."
          },
          ".oxlintrc.json": {
            "sourcePath": "vendor/ui/.oxlintrc.json",
            "changes": "Retained and reviewed lint configuration for the adapted roots."
          }
        },
        "selectiveIntakes": [
          {
            "evidence": "research/source-review.md",
            "mode": "adapt",
            "rights": "The selectively adopted mechanisms remain covered by the source repository's MIT license; the retained legal text now includes both copyright notices present at the reviewed source revision.",
            "sourcePaths": [
              "apps/web/src/components/chat/ChatThreadSurfacePrimitives.tsx",
              "apps/web/src/components/chat/deferredChatMount.ts",
              "apps/web/src/components/chat/ProviderModelOptionGroupList.tsx",
              "apps/web/src/providerModelOptions.ts",
              "apps/web/src/components/BrowserPanel.logic.ts",
              "apps/web/src/components/BrowserPanel.tsx",
              "apps/web/src/components/chat/MessagesTimeline.tsx",
              "apps/web/src/components/Sidebar.tsx",
              "apps/web/src/components/SidebarActivityView.logic.ts",
              "apps/web/src/components/SidebarActivityView.tsx",
              "apps/web/src/components/ui/toastRouteVisibility.ts",
              "apps/web/src/notifications/taskCompletion.logic.ts",
              "apps/web/src/notifications/taskCompletion.tsx",
              "apps/web/src/lib/desktopZoom.ts",
              "apps/web/src/lib/projectShortcutTargets.ts",
              "apps/web/src/storeSelectors.ts",
              "packages/shared/src/desktopChrome.ts",
              "apps/web/src/components/ChatView.tsx",
              "apps/web/src/components/ThreadTerminalDrawer.tsx",
              "apps/web/src/components/chat/DockTerminalPane.tsx",
              "apps/web/src/components/chat/useChatTerminalController.ts",
              "apps/web/src/components/terminal/terminalRuntime.ts",
              "apps/web/src/components/terminal/terminalRuntimeTypes.ts",
              "apps/web/src/components/terminal/terminalSession.ts",
              "apps/web/src/hooks/useTerminalSurfaceController.ts",
              "apps/web/src/lib/terminalContextComposerRegistry.ts",
              "apps/web/src/terminalStateStore.ts",
              "apps/desktop/src/main.ts",
              "packages/contracts/src/ipc.ts"
            ],
            "sourceRevision": "be6dcad3f63fa121fbe3180f257ba1ff128696c4",
            "summary": "Adapted the approved v0.6.7 Workbench and completion-signal mechanisms into current OmniMind owners: bounded exact-once Conversation mounting, live model provenance, opaque browser annotation presentation and zoom-correct native bounds, non-replaying transcript recovery and user-activity Project ranking, pane-scoped terminal Composer routing and natural-exit cleanup with fresh dock replacement, plus Product Conversation/Run/receipt completion identity, rendered-route suppression and Desktop-owned foreground defense. Donor Thread/Turn completion authority, execution authority, identity and deferred capabilities were not adopted.",
            "targetPaths": [
              "apps/web/src/components/BrowserPanel.logic.ts",
              "apps/web/src/components/BrowserPanel.tsx",
              "apps/web/src/components/product/ProductRuntimePicker.tsx",
              "apps/web/src/components/Sidebar.tsx",
              "apps/web/src/components/SidebarActivityView.logic.ts",
              "apps/web/src/components/SidebarActivityView.tsx",
              "apps/web/src/components/ThreadTerminalDrawer.tsx",
              "apps/web/src/components/chat/DockTerminalPane.tsx",
              "apps/web/src/components/chat/MessagesTimeline.tsx",
              "apps/web/src/components/chat/deferredChatMount.ts",
              "apps/web/src/components/chat/useChatTerminalController.ts",
              "apps/web/src/components/chat/useRetainedConversationBoundary.ts",
              "apps/web/src/components/ui/toastRouteVisibility.ts",
              "apps/web/src/notifications/productCompletion.logic.ts",
              "apps/web/src/notifications/productCompletion.tsx",
              "apps/web/src/notifications/taskCompletion.logic.ts",
              "apps/web/src/notifications/taskCompletion.tsx",
              "apps/web/src/components/terminal/terminalRuntime.ts",
              "apps/web/src/components/terminal/terminalRuntimeTypes.ts",
              "apps/web/src/components/terminal/terminalSelectionActions.ts",
              "apps/web/src/components/terminal/terminalSession.ts",
              "apps/web/src/hooks/useTerminalSurfaceController.ts",
              "apps/web/src/lib/desktopZoom.ts",
              "apps/web/src/lib/projectShortcutTargets.ts",
              "apps/web/src/lib/terminalContextComposerRegistry.ts",
              "apps/web/src/routes/__root.tsx",
              "apps/web/src/routes/_chat.tsx",
              "apps/web/src/storeSelectors.ts",
              "apps/web/src/terminalStateStore.ts",
              "packages/shared/src/desktopChrome.ts",
              "apps/desktop/src/main.ts",
              "packages/contracts/src/ipc.ts"
            ]
          },
          {
            "evidence": "research/source-review.md",
            "mode": "adapt",
            "rights": "The selected Synara ACP process/connection/conformance patterns are MIT-licensed under the retained ui-mother legal text. The official ACP SDK is consumed separately as the exact Apache-2.0 npm dependency recorded by Service and the release legal inventory.",
            "sourcePaths": [
              "apps/server/src/provider/acp/AcpSdk.ts",
              "apps/server/src/provider/acp/AcpSessionRuntime.ts",
              "apps/server/scripts/acp-conformance-agent.ts"
            ],
            "sourceRevision": "630f17e61abc478114bf83c1d740977c9f68b910",
            "summary": "Adapted only bounded process supervision, resource limits and official-SDK conformance fixture patterns. OmniMind retains Product receipt and normalization policy; the official @agentclientprotocol/sdk owns ACP framing, schema, request IDs, correlation, handler dispatch, cancellation and errors. Donor registry, gateway, Session authority, transcript, tool journal, provider orchestration and branding are excluded. The SDK stays pinned to an exact version, artifact integrity and lockfile closure; upgrades occur only in a reviewed OmniMind release after source/license, exact supported-Engine compatibility, ACP conformance/resource-failure, Pi regression, packaged legal/SBOM and one different-actor Review. Runtime auto-update, hot replacement, handwritten protocol fallback and silent Engine fallback are forbidden.",
            "targetPaths": [
              "apps/service/src/opencode/acpSdkConnection.ts",
              "apps/service/src/opencode/acpSdkConnection.test.ts",
              "apps/service/src/opencode/test-fixtures/acp-child.mjs"
            ]
          }
        ]
      }
    },
    {
      "id": "pi-todo-headless-package",
      "url": "https://github.com/earendil-works/pi.git",
      "revision": "20be4b18d4c57487f8993d2762bace129f0cf7c6",
      "paths": ["assets/packages/pi-todo-0.81.1/todo.ts"],
      "rights": "The copied todo extension source is MIT-licensed under the retained canonical legal text. This adoption is limited to the exact selected file and does not adopt the Pi repository as OmniMind product source.",
      "mode": "transplant",
      "changes": "The selected todo.ts bytes are retained exactly from packages/coding-agent/examples/extensions/todo.ts at the fixed revision. OmniMind adds a separate Product-owned manifest and release staging around the unchanged executable.",
      "updatePolicy": "Pinned revision and exact SHA-256; any source, version, digest, rights, trust-surface or runtime-compatibility change requires a new explicit source review and revalidation before activation",
      "licenseFiles": ["LICENSES/pi-todo-MIT.txt"]
    }
  ]
}
```

身份扫描只阻止 donor/旧产品身份泄漏；Pi 与实际 shipped Provider 是公开产品依赖，不属于需要洗掉的身份。Provider 名称可以出现在真实 integration、选择器、详情、诊断、About 与 Licenses 中，但不得作为虚假能力或 donor 品牌泄漏。

```identity-denylist
synara
t3-code
proma
weknora
sogen
omni-harness
```

```structure-policy
{
  "authorRoots": ["apps", "architecture", "assets", "packages", "patches", "research", "scripts", "test", "missions", "LICENSES"],
  "toolRoots": [".agents", ".claude", ".codex", ".cursor", ".obsidian", ".omp", ".omp-flow", ".snow"],
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

当前 adopted UI mother 已进入本地适配后的 author roots，并随首个本地、未签名 macOS arm64 Pi-native 纵切候选完成独立复核。该候选只证明当前纵切，不等于签名发行物、跨平台候选或 OmniMind V1。`historicalTrees` 只证明 T0 固定输入，`origins` 记录当前适配边界；两者不得互相冒充。Pi 与其他对照项目仍只是研究来源，除非它们进入上述 adoption 清单。exact revision/tree、rights/lineage/assets、构建/测试/运行观察和兼容限制只以 [`research/source-review.md`](research/source-review.md) 为证据 owner；法定文本保存在 `LICENSES/`。

## 5. 已有证据与当前下一步

Source Review 已记录 imported tree 与 fixed source 的 exact comparison，以及同一固定树上的 frozen install、build、typecheck 和 unchanged macOS desktop-smoke 结果及其局限。它们不证明 production adoption、视觉等价、Windows/Linux 或 packaging。除非 Source Review 的复验触发器发生变化，不重复相同 unchanged probe。

Stage 0–3 的 source/identity closure、UI 母体接管、Product 单写、isolated Native Host 与真实 Chat/folder-backed Agent 纵切已在 commit `248b3316651e681d9d4c78f81bec0c84a4cc822c` 形成首个本地、未签名 macOS arm64 candidate，并由 [`Freeze handoff`](.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/freeze-first-production-candidate.md) 与 [`independent review`](.omp-flow/tasks/08-04-ui-chassis-takeover/reviews/freeze-first-production-candidate.md) 记录。该 checkpoint 证明当时的纵切，不证明 isolated Native Host 是最终 topology；single-substrate reset 必须重新裁决其责任是否已由 inherited PiAdapter 承担。

首个真实 headless Pi Package checkpoint 位于 commit `16f14d188e38134f6f45c46bfcb57ff36c1e8565`。它证明 exact `todo.ts` 是可复用的 Pi-ecosystem regression input，也证明跨 Provider staged activation/lease/LKG 路线过重。V1 要证明该类 Package 能在 OmniMind Agent 的独立 Pi-compatible runtime 中运行，同时保持 stock Pi state 隔离。

平行 OpenCode checkpoint 和 Product Truth destructive route 现只作历史证据，均不再定义 V1 下一步；这不删除 Synara 已有的 OpenCode 或其他 Provider adapter。当前以 exact Synara responsibility reset、Pi stable alignment、Agent/Chat mapping、原生生态、Workbench 质量和三平台发行的顺序闭合剩余证据；精确进入、停止和 proof 条件只见 [`execution-brief.md`](execution-brief.md)。

具体进入条件、停止条件和 proof gate 只见 [`execution-brief.md`](execution-brief.md)；当前 claim 状态只见 active Campaign。
