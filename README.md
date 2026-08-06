# OmniMind

OmniMind 是一个本地优先桌面 Agent 产品：默认用户身份是 **OmniMind Agent**，经过策展和调校的 Pi 是内置原生 Gold Path。OmniMind 把其运行时与生态做成普通用户愿意长期使用的桌面产品；其他真实 Agent 可以作为外部 Engine 接入，但不承诺虚假的能力对称。日常工作台保持产品优先；About、Licenses、运行时详情和诊断必须能发现准确的 Pi provenance 与执行权威。

> **Pi-native. OmniMind-owned. Ecosystem-first. Engine-open.**

- **Pi-native**：默认 Agent、Provider/Model/Thinking、Session 与 Package 语义来自 Pi 原生运行时。
- **OmniMind-owned**：品牌、桌面体验、用户可见工作、Package 信任与分发、系统能力、恢复和跨 Engine 连续性由 OmniMind 负责。
- **Ecosystem-first**：优先无损承接成熟能力，不重写竞争 Runtime。
- **Engine-open**：Pi 是 Gold Path，外部 Agent 是真实出口；能力差异必须诚实呈现。

## 1. 产品状态与战略

这是一个没有用户、兼容义务和发布历史的新产品仓库。产品与架构已经围绕 Pi-native 路线收敛；旧的竞争 Runtime/Journal/Tool skeleton 被判定为错误本体，不构成保留义务。

公开 Alpha 前的未发行开发状态必须可恢复，但不构成永久 runtime 兼容面；确立首个公开 schema baseline 前，必须先为全部受影响 store 创建并验证完整 backup/export，验证失败则不得 reset 或 rebaseline。

OmniMind 的价值不是“能启动 Pi”，而是上游没有义务完成的桌面产品层：世界级交互、可信 Package 分发、文件与工作台、真实权限与副作用、恢复、外部 Engine 协作以及跨平台交付。若这些价值不能独立成立，产品就只是一层可替换皮肤。

当前 production compatibility、Package 安全、跨平台、恢复和外部 Engine 声明仍须由 active Campaign 在同一 frozen SHA 上验证；本 README 不自证完成。

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
- [`architecture/product-state.md`](architecture/product-state.md) 唯一拥有产品事实、durable product objects、Queue-to-Run 转移、receipt 与恢复；
- [`architecture/execution.md`](architecture/execution.md) 唯一拥有详细进程 topology、target responsibility layout、Native/External Engine 边界与故障域。

根文档只保留宪法级后果。它不提供第二套 UI ledger、产品对象目录、物理树、研究记录、施工计划或验收状态。

## 3. 不可协商的产品边界

- OmniMind 以独立产品和 OmniMind Agent 身份面对用户，不冒充 Pi 官方 GUI，也不把 Pi 当作日常品牌口号；准确的 Pi 来源、版本和原生执行权威在 About、Licenses、运行时详情与诊断中逐层可发现。
- OmniMind 保留用户可见产品事实、桌面体验、Package source/trust/current/LKG、文件/Remote、权限表达、恢复和跨 Engine 连续性；详细事实只以 Product State 为准。
- 外部 Engine 使用真实官方协议或明确受限路径接入，不反向把 Pi Gold Path 压成最低公分母，也不允许静默 fallback。
- U1 是获准的完整 UI 物理母体和可运行底盘；采用遵守 Workbench 的逐域 preserve/adapt/delete gate，不按截图另画薄 shell，不因未接线就删除成熟表面。
- 权限策略与实际 enforcement source 必须分开表达；副作用确定性、恢复、性能、简体中文/英文和 macOS/Windows/Linux 都需要真实证据。

以下四条官方发行与 Pi 生态要求由产品维护者锁定：

1. OmniMind 官方发行版内置并针对产品体验调优 Pi；普通用户使用默认 Gold Path 时，无需另行安装或单独配置 Pi。
2. OmniMind 可以策展、预装或自建 Package、MCP、Skill 与 Prompt，也可以对 Pi 做有界、可维护的适配；这些是发行与集成选择，不转移 Pi 原生执行权威。
3. OmniMind 不建立与 Pi 竞争的 Agent Runtime；Pi runtime 与可执行生态代码不得进入 Electron Main 或 renderer，详细进程边界只由 Execution 定义。
4. 用户及 Provider/Engine credential 必须作为秘密保护，不能因内置、预装或产品配置而写入发行物或公开内容；任何 bundling、预装、修改与再分发都必须履行适用的真实 license、attribution 与 redistribution obligations。

这四条规定产品结果，不预先固定尚未由实现证据选择的内部组织或部署形态。

## 4. 来源、身份与结构

基础设施默认采用责任匹配的成熟上游实现、官方 SDK 与已证明机制；自研实现只有在上游不兼容、
不安全、法律上不可采用、实质更重或无法保持 OmniMind 产品边界时才成立，并必须记录可复核的
反证。采用必须同时满足精确责任且无竞争 authority、固定版本与可复现证据、license/Notice 与
再分发兼容、依赖和升级面有界、全生命周期复杂度低于自持五项门槛。上游或 Engine 负责协议
wire、Runtime/Session、Tool、Extension 与 Package-private 语义；OmniMind 只保留差异化的可见
Product identity、冻结选择与 dispatch、最小 receipt/replay truth、跨 Engine 恢复投影、安全边界、
策展分发和 GUI。采用 wrapper 不得重新实现已交给上游的 authority，也不得带入 donor branding、
编排、Session 状态或泛化 Runtime。

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

身份扫描只阻止 donor/旧产品身份泄漏；Pi 是公开产品依赖，不属于需要洗掉的身份。外部 Engine 名称可以出现在真实 integration 和动态来源边界，不能成为通用产品本体。

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

Stage 0–3 的 source/identity closure、UI 母体接管、Product 单写、isolated Native Host 与真实 Chat/folder-backed Agent 纵切已在 commit `248b3316651e681d9d4c78f81bec0c84a4cc822c` 形成首个本地、未签名 macOS arm64 candidate，并由 [`Freeze handoff`](.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/freeze-first-production-candidate.md) 与 [`independent review`](.omp-flow/tasks/08-04-ui-chassis-takeover/reviews/freeze-first-production-candidate.md) 记录。

首个真实 headless Pi Package checkpoint 已在 commit `16f14d188e38134f6f45c46bfcb57ff36c1e8565` 由不同 actor 独立接受；其 Work、handoff 与 PASS review 保存在 [归档 Bundle](.omp-flow/tasks/archive/2026-08/08-06-pi-package-lifecycle/)。它证明当前 exact Package 的 staged activation、active lease、LKG、fault recovery 与 Pi-native private-state boundary，不证明完整 Package Catalog/compatibility taxonomy、外部 Engine、Remote、三平台发行或 V1 完成。

唯一下一阶段是一个真实外部 Engine：证明 capability/permission difference、next-Run choice 与 no silent fallback，然后才进入 Remote/Workbench 扩展和三平台发行。

具体进入条件、停止条件和 proof gate 只见 [`execution-brief.md`](execution-brief.md)；当前 claim 状态只见 active Campaign。
