# Agent 内置工具、MCP 与外部连接：Settings 与运行时执行方案复核

> 证据日期：2026-08-18
> OmniMind 证据快照：`main@cd2f6fce47a72d04ed018a651a8155a1585aff18`，写入前工作树 clean
> 关联 Pi 证据：[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md) 及其锁定的 bundled Pi `0.84.2` / upstream `914cf147…`
> 维护者已确认的产品意图：Settings 最终菜单采用本文 §2；一套内置工具开关统一控制所有非 OmniMind Agent 引擎，OmniMind Agent 自身不受该外部暴露开关影响
> 产品阶段：开发期、无旧用户、无已发布配置或连接需要兼容；实施应直接收口到干净终态，不做 alias、dual-read、弃用期或迁移层
> 文档角色：当前源码事实、产品裁决、架构建议与未来实施/验收参考；它不取代 `architecture/` 的稳定 contract、`execution-brief.md` 的当前施工入口或 Mission 的状态真相

## 0. 任何时候从零重启，先读这里

本文解决的不是“设置里加两个菜单”这么浅的问题，而是以下五个容易混淆、却必须分开的产品与运行时责任：

1. OmniMind Host 自己拥有的 Browser、Device、Thread、Automation 等能力；
2. 这些能力是否统一交给非 OmniMind Agent 引擎，以及不同引擎用什么原生协议交付；
3. 用户给 OmniMind Agent 接入的第三方 MCP server；
4. 独立运行的 Codex、Claude Code 等外部应用如何反向连接 OmniMind；
5. Skills、MCP、Tools 在 Settings 中如何平级、清楚、可关闭，又不暴露运行时术语。

重开本议题时，不依赖历史聊天，按以下顺序恢复事实：

1. 根 [`README.md`](../README.md)：产品身份、母体纪律和 production adoption；
2. [`architecture/workbench.md`](../architecture/workbench.md)：Settings 信息架构、交互与视觉品味；
3. [`architecture/execution.md`](../architecture/execution.md)：AgentGateway、Provider、Pi-family、MCP 与权限的稳定 owner；
4. [`architecture/product-state.md`](../architecture/product-state.md)：持久化与状态权威；
5. [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)：Pi Core、Package、Extension、Skill、Tool、MCP 的来源准入；
6. [`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)：Pi 官方工具注册、动态激活、tool search 与 Host 投影的 fixed-source 结论；
7. 当前 [`execution-brief.md`](../execution-brief.md) 与 active Mission：只判断现在是否获准施工，不从本文推断“已实现”；
8. 本文 §4 的源码 owner map，并重新运行 §16 的复验条件。

若当前 HEAD、Pi revision、Provider SDK、AgentGateway topology、Settings 母体或 External MCP transport 已变化，只重验受影响结论。不要把本文旧数字或旧文件名当永恒 API。

### 0.1 结论摘要

最终模型是一份能力真相、三种清楚的产品入口、两类 Engine-native 投影：

```text
OmniMind Host canonical capabilities
  └─ AgentGateway：catalog / execution / permission / cancellation / credential
       ├─ Pi-family（OmniMind Agent、Pi）
       │    └─ Pi 官方 Extension / Tool Registry seam
       └─ 非 Pi Engine（Codex、Claude、OpenCode、ACP…）
            └─ 各 Engine 原生支持的 MCP / plugin projection

用户接入的第三方 MCP
  └─ OmniMind Agent 的 Pi-native MCP Extension / Package owner

外部应用连接 OmniMind
  └─ 现有 External MCP Gateway（方向与上面相反）
```

三个设置入口分别是：

- **内置工具 / Built-in tools**：管理 OmniMind 自带能力是否统一交给所有非 OmniMind Agent 引擎。底层可能是 MCP，也可能是 Pi Tool，但产品身份始终是内置工具；OmniMind Agent 自身继续走自己的 Pi-native 机制。
- **MCP**：管理 OmniMind Agent 要消费的第三方 MCP server。它不是 Host 原生工具总表，也不是承诺替所有外部 Engine 管理其私有 MCP 配置。
- **外部连接 / External connections**：让独立 Codex、Claude Code 等本地应用把 OmniMind 当任务与编排后端。连接方向与上一项相反。

`zq-dev-rules` 紧凑裁决：

```text
Outcome:
  用户能看懂三种能力方向，并用一套开关控制所有非自有引擎是否获得 OmniMind 内置工具；
  OmniMind Agent 按 Pi 官方机制接第三方 MCP；外部应用仍能安全连接 OmniMind。

Current truth:
  AgentGateway 已是一份 Host tool catalog；非 Pi Engine 已经原生 MCP 投影；
  Pi 当前 eager 接收 Gateway tools；External MCP Gateway 已有窄而完整的六工具闭环；
  Settings 没有 Built-in tools 页面，也没有真正的 OmniMind Agent MCP manager。

Smallest complete path:
  保留所有现有 owner；只增加一套 external-engine capability policy、真实 catalog projection、
  External connections 改名与安全默认值，以及经独立 Gate A 证明的 Pi-native MCP lifecycle bridge。

Excess rejected:
  第二 Tool Registry、通用 Integration Registry、跨 Engine MCP 总管、58×N 开关矩阵、
  Host MCP 配置副本、每工具权限账本、Pi core fork、用第三方 adapter 回连自家 AgentGateway。

Decision:
  SIMPLIFY 后 GO；MCP adapter 的具体采用仍受 exact-source Gate A 约束。
```

## 1. 最重要的语义：能力身份不等于传输协议

维护者补充的关键要求是：

> 当用户使用 Codex 等非 OmniMind Agent 内核时，必须能够决定 OmniMind 是否把某组内置工具交给这些外部引擎；不需要为 Codex、Claude 等分别配置。

这意味着“是否可插拔”的主键不是 MCP server，也不是某个 Provider，而是一个简单的产品边界：

```text
Built-in capability group → exposed to all non-OmniMind engines / not exposed
```

例如：

| 用户看到的能力 | Codex 获得它的底层方式 | OmniMind Agent 获得它的底层方式 | 设置归属 |
| --- | --- | --- | --- |
| Browser | OmniMind 私有、per-session MCP projection | Pi 官方 Tool / Extension seam | 内置工具 |
| Device | Engine 支持时的原生投影 | Pi 官方 Tool / Extension seam | 内置工具 |
| OmniMind task/thread/automation tools | Engine-native MCP/plugin projection | Pi 官方 Tool / Extension seam | 内置工具 |
| GitHub、数据库或用户自建 MCP | 不由本轮统一接管；保留 Engine-native ownership | Pi-native MCP Extension/Package | MCP |

因此不得把 Browser 因为“给 Codex 时走 MCP”就显示到 MCP server 列表里。MCP 是传输/生态协议，Browser 是用户认知中的产品能力。设置页应以能力身份组织，adapter 才处理协议差异。

这个开关表达的是**能力可用性**，不是权限：

- disabled：所有非 OmniMind Agent 引擎的新会话都不应看见该组工具，旧外部引擎会话中的新调用也必须被 Gateway 拒绝；
- enabled：允许所有非 OmniMind Agent 引擎通过各自原生 projection 获得工具定义，但某次调用仍受 `runtimeMode`、turn authority、项目范围、凭据和真实 Engine permission owner 约束；
- OmniMind Agent 自身不受这套“向外部引擎提供”开关影响，仍按 Pi-native Tool/Extension 机制使用 Host 能力；
- Browser/Device 的人类 UI 不因 Agent 工具关闭而失效；
- External MCP 对外暴露的六个任务工具是独立 public surface，不自动跟随内部工具开关。

## 2. 已确认的最终 Settings 菜单

这是面向用户的最终信息架构。保留当前 Synara-derived 分组与顺序，只做必要改名和新增，不为了“架构整齐”重排整个 Settings。

### 2.1 中文

```text
个人
├── 通用
├── 个人资料
├── 外观
├── 通知
├── Chat 行为
├── 快捷键
└── 用量与限额

集成
├── AppSnap
└── 外部连接

开发
├── Agent 引擎
├── 模型服务
├── Agent 技能
├── 内置工具
├── MCP
└── 托管工作树

系统
└── 系统工具

归档
└── 已归档任务
```

### 2.2 English

```text
Personal
├── General
├── Profile
├── Appearance
├── Notifications
├── Chat behavior
├── Keybindings
└── Usage & limits

Integrations
├── AppSnap
└── External connections

Coding
├── Agent engines
├── Model services
├── Agent skills
├── Built-in tools
├── MCP
└── Managed worktrees

System
└── System tools

Archived
└── Archived tasks
```

### 2.3 命名与方向

| 页面 | 一句话问题 | 中文说明 | English description |
| --- | --- | --- | --- |
| Agent 技能 | Agent 会遵循哪些可复用说明和工作流？ | 管理可供 Agent 使用的技能。 | Manage skills available to agents. |
| 内置工具 | OmniMind 自带哪些能力可以交给其他 Agent 引擎？ | 选择可供其他 Agent 引擎使用的内置工具；不会影响 OmniMind Agent。 | Choose which OmniMind built-in tools are available to other agent engines. This does not affect OmniMind Agent. |
| MCP | OmniMind Agent 可以连接哪些外部工具与服务？ | 为 OmniMind Agent 连接外部 MCP 服务。 | Connect external MCP services to OmniMind Agent. |
| 外部连接 | 哪些独立应用可以进入 OmniMind？ | 允许 Codex、Claude Code 等本地应用连接并使用 OmniMind。 | Let Codex, Claude Code, and other local apps use OmniMind. |

英文 `External connections` 比 `External agents` 更准确：后者会与 `Agent engines` 冲突，也把“客户端应用”误写成一种运行内核。

## 3. 当前源码事实与缺口

### 3.1 Settings 当前事实

- `apps/web/src/settingsNavigation.ts` 已有 `personal / integrations / coding / system / archived` 五个 group；当前 `integrations` section 的可见名称是 `MCP connections`，eyebrow 是 `External agents`。
- `apps/web/src/routes/_chat.settings.tsx` 在 `integrations` section 挂载 `ExternalMcpSettingsPanel`。
- `apps/web/src/i18n.tsx` 已有 Agent engines、Model services、Agent skills、MCP connections、System tools 的中英文词条。
- `apps/web/src/settingsSearchIndex.ts`、深链、键盘行为和 route-owned panel 是现有 Settings 母体的一部分，新增页面必须进入同一机制。
- `SkillsSettingsPanel.tsx` 已证明一个可复用交互模式：统一 catalog、真实来源、OmniMind-owned toggle 与 engine-managed 状态分开表达。

缺口：

1. 当前“`MCP connections`”其实是**外部应用连接 OmniMind**，名称方向含混；
2. 没有 `Built-in tools` section，也没有统一控制“是否向非 OmniMind Agent 引擎暴露”的 Host capability policy；
3. 没有真正管理“OmniMind Agent 消费外部 MCP”的页面或 lifecycle owner；
4. 如果只在 UI 隐藏工具而不在 `tools/call` 做实时拒绝，会形成假的安全开关。

### 3.2 AgentGateway 当前事实

`apps/server/src/agentGateway/Layers/AgentGateway.ts` 组合以下真实工具来源：

- OmniMind read / diagnostics / thread mutations / automations；
- Browser tools；
- 平台与服务可用时的 Device tools。

当前 canonical catalog 通常为 46 个工具，Device 可用时最多 58 个：

- `omnimind_*`：24；
- `browser_*`：22；
- `device_*`：12。

数字是当前观察，不是公共 API。UI 必须从 catalog projection 读取计数和 availability，不得硬编码。

`apps/server/src/agentGateway/mcpTransport.ts` 当前持有静态 `tools` / `toolsByName`，`tools/list` 返回全部 definitions，`tools/call` 再执行 session capability 与 active-turn authority。当前没有动态 list-change notification，因此“运行中立刻从某 Engine 的 schema 消失”不能被产品虚假承诺。

区分自有/外部引擎不需要新增身份系统：`AgentGatewaySessionIdentity` 已在 `apps/server/src/agentGateway/Services/AgentGatewaySessionRegistry.ts` 持有受信任的 `provider: ProviderKind`，credential 由 Host 在 session 创建时签发并在请求入口验证。实施应直接使用 `provider === "omnimind"` 这一现有 canonical identity，而不是让 renderer 或 MCP client 自报身份。

### 3.3 Engine 投影当前事实

`apps/server/src/agentGateway/mcpInjection.ts` 已把同一 AgentGateway 连接投影到 Codex TOML、Claude SDK `mcpServers`、ACP HTTP/stdio、OpenCode remote MCP、Antigravity plugin 等原生 seam；凭据按 session/env 传递，不写入普通配置。

`apps/server/src/provider/Layers/PiAdapter.ts` 当前通过 `buildPiAgentGatewayCustomTools()` 调 `tools/list`，把所有 Gateway definitions eager 转成 Pi `customTools`，调用再回到 `tools/call`。

所以当前不是“没有插件机制”，而是：

- Host tool 的 canonical owner 已存在；
- 非 Pi Engine 的原生投影已存在；
- Pi 路径仍是 eager tools，尚未实现此前已接受但未获施工授权的 owned additive tool search；
- 非 OmniMind Agent 路径尚未接入统一的外部暴露开关。

### 3.4 External MCP 当前事实

现有 `apps/server/src/externalMcp/*` 与 `ExternalMcpSettingsPanel.tsx` 提供的是“外部应用 → OmniMind”连接，公开且仅公开六个工具：

1. `omnimind_overview`
2. `omnimind_capabilities`
3. `omnimind_list_allowed_projects`
4. `omnimind_create_task`
5. `omnimind_wait_for_task`
6. `omnimind_read_task`

它已有 owner-only 管理、pairing、client-generated secret、credential hash、private file、revoke/expiry、rate/concurrency、audit、idempotency、cancellation，以及默认 managed worktree + approval-required。它是一个窄而真实的任务后端，不是通用 MCP 管理器。

当前产品缺口：

- 名称没有表达连接方向；
- project scope 默认 `allProjects=true`，还会包含未来项目，不符合最小授权默认值；
- loopback/public URL 不可用时，管理 RPC 与 UI 可能仍允许创建实际不可连接的配置；
- “paired”“connected”“last used”“failed”需要基于真实证据区分；
- lifecycle 目前主要是 create/list/revoke/refresh pairing，尚无完整 edit/test/renew/delete/last error；但这些不是首轮改名必须顺手扩张的范围。

### 3.5 真正的 OmniMind Agent MCP manager 当前不存在

Pi Core 有意不内置 MCP。Pi 官方文档给出的方向是 Extension/Package，而不是在 core 中塞一个固定 MCP runtime。因此新 `MCP` 页面不能先造 Host 通用管理器，再让 Pi 被动服从；应先证明并采用 Pi 官方 public seam 上的成熟 Extension/Package，或只做最窄 bridge。

## 4. 唯一 owner map

| 状态/行为 | 唯一 owner | Settings/adapter 只做什么 | 禁止复制什么 |
| --- | --- | --- | --- |
| Host tool name/schema/annotations/group provenance | AgentGateway catalog assembly | 读取、筛选、投影 | 每个 Provider 一份 schema |
| Host tool execution | AgentGateway + 对应 Host service | 转发 call | 在 Pi/MCP adapter 重写 Browser/Device |
| 哪些内置能力组向非 OmniMind Agent 引擎开放 | OmniMind ServerSettings 中一份 external-engine user-intent policy | UI 修改 intent；Gateway 对所有非自有引擎在 list/call 应用 | UI localStorage、按 Provider 私有副本 |
| 某次调用的权限 | `runtimeMode` + Gateway/Engine permission owner | 显示真实拒绝 | 新的 per-tool permission ledger |
| Pi session Tool Registry 与 active set | Pi AgentSession / Extension seam | 注册 owned tools、additive activation | Host 第二 registry |
| 非 Pi Engine 的投影 transport | 对应 Provider adapter/native MCP | 从同一 filtered catalog 生成会话配置 | 一个跨 Engine “万能 MCP runtime” |
| 第三方 MCP 的 transport/config/lifecycle | 经 Gate A 采用的 Pi-native MCP Extension/Package | OmniMind 做 typed intent/projection | Host DB 与 `.omnimind` 双写 |
| 外部应用访问 OmniMind | 现有 External MCP Gateway | UI 管理连接与 scope | 与内部 AgentGateway 合并 |
| Skills | 现有 Skill/native owner | catalog 与 enablement 投影 | 用 tool search 代替 Skill loader |

所有新增都必须满足一个判据：新增一个 Host tool 时，只在 canonical owner 定义一次，其他 Engine 自动通过既有 projection 获得；若需要分别改 Pi、Codex、Claude、UI、Prompt、权限六份清单，架构即失败。

## 5. `内置工具`页面：干净、真实、用一套开关控制所有外部引擎

### 5.1 信息结构

页面直接显示三组真实能力，不放 Agent Engine 选择器。标题下用一句话说清开关范围：

```text
内置工具
选择可供其他 Agent 引擎使用的内置工具；不会影响 OmniMind Agent。

OmniMind                         24 个工具        [开]
任务、线程、自动化与诊断。

Browser                          22 个工具        [开]
浏览、读取网页并与页面交互。

Device                           12 个工具        [开]
使用受支持设备的相机、位置等能力。
```

关闭任一组后，Codex、Claude、OpenCode、stock Pi 等所有非 OmniMind Agent 引擎都不再获得该组；OmniMind Agent 自身仍按 Pi 原生 Tool/Extension 使用它。正常页面不展示 MCP/Pi transport 差异，必要时仅在“详细信息”中说明“外部 Agent 引擎通过其原生连接使用这些工具”。

### 5.2 为什么不用矩阵

不做 `58 tools × 10 providers` 的 checkbox 墙，也不提供 Engine selector：

- 维护者的真实意图是“不要向任何外部引擎提供 Device/Browser”，不是维护十份 Provider 例外；
- 横向矩阵在中文、窄窗口和未来 100 工具时都会崩；
- 三行组开关把认知负荷固定在 O(groups)，持久状态也只有一份；
- 如需审计，展开一组可只读显示真实工具名、短描述和可用性，不默认提供 58 个细粒度开关。

只有真实用户证据证明组粒度不够，才讨论 per-tool exception；届时仍应是组详情里的少量例外，而不是第二权限系统。

### 5.3 状态语义

每组必须区分：

- `available`：平台与 Host service 真实支持该组；
- `exposedToExternalEngines`：用户是否允许把这组能力统一交给非 OmniMind Agent 引擎；
- `effectiveForExternalEngines`：外部引擎的新会话实际会获得；只由 `available && exposedToExternalEngines` 派生；
- `active in current session`：会话是否已经加载/激活，属于诊断信息，不是持久设置。

Device 在当前平台不可用时显示“此设备不支持”，开关 disabled；不能伪装成用户关闭。某个 Provider 没有可证明的安全 projection 是该 Provider adapter 的诊断事实，不需要为此把页面重新变成逐 Engine 配置。

### 5.4 默认值与持久化

为了让第三方 Agent 引擎开箱即用，三组默认都向外部引擎开放。建议只持久化被关闭的组：

```ts
type BuiltInToolGroupId = "omnimind" | "browser" | "device"

type BuiltInToolsServerSettings = {
  disabledForExternalEngines: BuiltInToolGroupId[]
}
```

这是意图草图，不是要求照抄字段名。关键是不持久化 Provider 维度；运行时直接复用现有 `AgentGatewaySessionIdentity.provider`，以 canonical `provider === "omnimind"` 区分自有 Agent 与其他引擎，不能通过可编辑 display name 或 client input 推断。

约束：

- 字段进入现有 revisioned、atomic `ServerSettings`；不建新表、不用 localStorage；
- 默认空数组；当前没有旧用户，不增加迁移、兼容 alias 或 dual-read；
- normalize 时去重、丢弃未知 group、限制键和值长度；
- UI 从 server projection 获取真实 group、计数和 availability，不硬编码 Provider 全集或 24/22/12；
- rapid toggles 使用现有 settings revision/stream，避免最后写入被旧响应覆盖。

### 5.5 运行时强制

开关必须同时影响 definition 与 execution：

1. 新 session 建立时先判断它是否为 OmniMind Agent；非自有引擎按一份 external policy 过滤 catalog，自有引擎不套用该外部暴露开关；
2. 非自有引擎的 `tools/list` / native projection / stock Pi registration 不包含 disabled groups；
3. 非自有引擎的 `tools/call` 在真正执行前重新读取当前 policy，并按 tool provenance 拒绝已禁用组；
4. 拒绝错误应稳定、可本地化、不可泄露 schema/credential；
5. 给模型的 Host policy、tool-search catalog 与诊断说明必须从同一 filtered catalog 派生，不能提示它使用已关闭的工具；
6. 如果三组对外都关闭，且当前源码复核确认没有其他独立控制面依赖，应完全跳过外部引擎的 AgentGateway MCP/plugin 注入、credential 与 stdio proxy，而不是挂一个空 server；
7. 不依赖模型“自觉不调用”，也不只依赖旧 session 的静态 tool list。

由于部分 Engine 不支持动态 tool-list refresh：

- 关闭后，安全效果必须立即生效：旧 session 的 stale call 被 Gateway 拒绝；
- schema 从模型上下文消失可能只在 next safe reload / new session 生效；
- UI 应写“外部引擎的新会话将不再提供；当前外部会话中的调用会立即被阻止”，除非对应 Engine 已有可证明的安全热刷新；
- 不为追求即时消失强杀用户正在执行的会话。

### 5.6 catalog provenance

不要到处用 name prefix 推断组。`AgentGateway.ts` 组装时已经分别持有 OmniMind、Browser、Device arrays，应在这一处附加内部 provenance，然后 flatten 给 transport。projection 可以返回：

```text
group id / localized label key / description key / available / reason / tool count
```

tool schema 仍只有一份。group metadata 是 catalog 的内部组织信息，不应演化成公开 Plugin Registry。

## 6. `MCP`页面：只管理 OmniMind Agent 消费的外部 MCP

### 6.1 首版边界

首版页面标题可保持极简 `MCP`，副文案必须限定方向：

> 为 OmniMind Agent 连接外部 MCP 服务。

它不承诺：

- 替 Codex 修改 `~/.codex`；
- 替 Claude Code 修改其用户配置；
- 把同一 server 强行同步给全部 Agent Engine；
- 接管第三方 Engine 自己的 MCP authentication、marketplace 或 lifecycle；
- 把 AgentGateway 自家 Host tools 绕一圈接回 Pi。

未来若有确凿需求让用户把同一个第三方 MCP 显式分发给多个 Engine，应先做独立 owner/compatibility review。不能从“UI 看起来对称”推导跨 Engine 配置写入权。

### 6.2 必须先过的 exact-source Gate A

`pi-mcp-adapter` 或同类项目只是候选，不因名字合理就自动采用。实现前必须锁定 exact artifact、version、source commit、dependency tree 与 license，并证明：

1. 使用 Pi 官方 Extension/Package public seam，不 patch Pi core；
2. 有可嵌入的 headless/programmatic API，不依赖 TUI 点击或修改 stock `.pi`；
3. config、credential、server lifecycle、tool registration 各有清晰唯一 owner；
4. 精确支持哪些 transport：stdio、Streamable HTTP；legacy SSE 只在实证支持时出现；
5. 是否支持 lazy tool discovery/proxy，而不是启动时把所有 server 的全部 schema塞进模型；
6. resources、prompts、OAuth、reconnect、shutdown、cancellation 的真实支持边界；
7. local command 是否使用 structured `command + args + env`，绝不经 shell interpolation；
8. remote URL 是否有 SSRF、redirect、DNS rebinding、private network 与 credential forwarding 防线；
9. 多 server tool-name collision、server provenance、错误隔离与 deterministic order；
10. 配置能放在 OmniMind Agent 自己的 `.omnimind` lifecycle，不污染 stock Pi 用户目录；
11. 不产生 ambient daemon、僵尸 child process、无限 reconnect 或无界日志；
12. 能在 fresh profile、headless server、桌面 packaged 环境中确定性启动和关闭。

采用优先级固定为：

1. Pi 官方 public Extension/Package seam；
2. 配置/裁剪成熟 adapter；
3. 最窄 bridge；
4. 不 fork Pi core。

若候选失败，不以“先自己写一个完整 MCP 框架”补洞。回退为页面暂不开放或仅支持已证明的窄 transport。

### 6.3 owner 与配置

若 exact adapter 通过 Gate A：

- adapter/Extension 拥有 MCP transport、server config、connection、reconnect、tool registration；
- OmniMind Host 只暴露 typed list/add/update/test/remove intents 给 Settings；
- 配置保存在 OmniMind Agent 已有 `.omnimind` lifecycle 下；
- secret 用现有 OS/keychain/secret owner 或 adapter 已证明的安全 store，renderer 只拿 `configured: true`；
- 不在 `ServerSettings`、Host DB 与 adapter config 三处保存同一 server；
- `omnimind_search_tools` 只拥有 Host Gateway tools，不吞并第三方 MCP tools；第三方工具由 MCP Extension 自己以 Pi-native lazy semantics 注册。

### 6.4 页面结构

沿用 Model services 的“总览 → 添加 → 详情”，不做卡片墙：

```text
MCP
为 OmniMind Agent 连接外部 MCP 服务。                  [添加]

GitHub                     已连接      18 个工具
Local Postgres             已关闭       6 个工具
Research server            连接失败                ›
```

总览只显示：名称、enabled、真实连接状态、tool count、最后错误的短状态。详情页才提供：

- 开启/关闭；
- 测试连接；
- 编辑非秘密配置；
- 替换 credential；
- reconnect；
- 只读查看工具名/描述/provenance；
- 删除。

添加流程只呈现 exact adapter 已证明的 transport。stdio 输入应拆成 command、args、env；HTTP 输入 URL 与认证方式。secret 输入永不回显，不进入 URL query、日志、错误、timeline 或复制文本。

### 6.5 10 / 100 / 1000 server 与工具规模

规模治理从 lifecycle 和上下文开始，不从向量库开始：

- App 启动或被动打开 Settings 时只读轻量 configured metadata；不连接全部 server；
- 明确 test、当前 session 需要或用户打开详情时才连接；
- bounded concurrency、指数退避上限、idle shutdown、hard timeout、取消与 child cleanup；
- 初始 model context 不携带全部 MCP tool schema；使用 adapter 已证明的 lazy proxy/search；
- UI 搜索只过滤 connection metadata，不为了 100 个 server 引入 embedding、remote recommendation service 或第二索引；
- tool detail 长列表需要虚拟化/分页，但仅在实际数量越过现有组件性能边界时启用；
- 单个 server 失败不拖垮其他 server，也不阻塞新 session；
- 冷启动预算、首个 tool 调用延迟、idle memory 与 child process 数必须有测量上限。

Cache 只能缓存可失效的 discovery metadata，不缓存授权结论：

- key 至少包含 server identity、config revision、adapter version 和 transport fingerprint；
- credential 变化、server `listChanged`、reconnect generation 或 explicit refresh 使缓存失效；
- tool call 前仍走实时 connection/permission；
- 不把 stale tool schema 静默当成功，错误需指明“连接已变化，请刷新”。

## 7. `外部连接`页面：保留 owner，纠正方向与最小授权

现有 External MCP Gateway 不重写，只把产品定义说对并修复明显安全/可用性缺口。

### 7.1 首轮必须做

1. 可见名称从 `MCP connections` 改为 `External connections / 外部连接`；
2. 把内部 `integrations` section id 一次性改成语义准确的 `externalConnections`（最终精确命名服从现有 id 风格），同步 route、search、tests 与 deep link；当前无旧用户，不保留 alias；
3. 说明文案改为：
   - EN：`Let Codex, Claude Code, and other local apps use OmniMind.`
   - ZH：`允许 Codex、Claude Code 等本地应用连接并使用 OmniMind。`
4. 用 connection/client 命名替代 connected agent，避免与 Agent engines 冲突；
5. 创建时默认选择明确项目，不默认 `allProjects`，更不能默认包含未来新项目；
6. backend 与 UI 共同投影 runtime availability：loopback/public URL 不可用时不能创建“看似成功、实际不可用”的连接；
7. paired、connected/last used、revoked、expired、failed 只根据真实审计/transport 证据显示。

### 7.2 暂不顺手扩张

edit、renew、delete、test、last error、不同 client setup card 都有价值，但应在首轮改名/安全闭环后按实际痛点排优先级。不要为了让页面“看起来完整”扩大 External MCP 协议和 DB 状态机。

### 7.3 与内部开关隔离

External MCP 暴露的是外部任务 API，不是 AgentGateway 的全部 Browser/Device 工具。因此：

- 关闭“Codex → Browser”不影响外部 Codex 通过 External connection 创建 OmniMind task；
- 关闭 `omnimind` 内置能力组也不自动撤销已有 External connection；
- External connection 的 project scope、expiry、revocation、rate limit 继续独立执行；
- 若未来要改变 External MCP tool surface，必须走 public-surface contract，不偷用内部 group toggle。

## 8. 端到端运行时设计

### 8.1 会话创建

```text
Composer 选择 Agent Engine
  → Provider/session owner 固定 canonical engine identity
  → 如果是 OmniMind Agent：走完整 canonical catalog 与 Pi-native Tool/Extension seam
  → 如果是其他引擎：读取 ServerSettings 的 disabledForExternalEngines
  → external catalog 按 availability + 一份共享 policy 过滤
  → stock Pi：注册到 Pi session Tool Registry / Extension
  → 其他非 Pi Engine：生成各自 native MCP/plugin session projection
  → credential、turn authority、cancellation 仍留在 Gateway
```

不得让 renderer 决定最终 tool list，也不得把用户可编辑的 engine label 当自有/外部身份判据。

### 8.2 设置改变

```text
用户关闭“向外部 Agent 引擎提供 Browser”
  → atomic settings update + revision stream
  → Gateway execution policy 立即看到新 revision
  → 已运行的 Codex / Claude / stock Pi 等外部 session 再调用 browser_*：稳定拒绝
  → 所有新外部 session：不再收到 Browser definitions
  → OmniMind Agent：不受该外部暴露开关影响
  → 若某 Provider adapter 未来支持安全 list refresh，再做非破坏性热更新
```

开启时不应把工具偷偷注入已经稳定运行的旧上下文，除非该 Engine 明确支持动态更新且测试覆盖 context/permission 一致性。默认“下一安全会话生效”比伪热更新更可靠。

### 8.3 Pi Tool Search 的边界

此前研究建议的 `omnimind_search_tools` 只搜索同一 hidden inline Extension 明确拥有的 Host Gateway tools，并 additive 激活。它：

- 不搜索 Skill 正文；
- 不安装 Package；
- 不搜索未连接 MCP server；
- 不擅自激活其他 Extension 刻意 inactive 的 tools；
- 不管理第三方 MCP connection lifecycle；
- 不成为第二权限系统。

第三方 MCP adapter 如果有自己的 proxy/search tool，由它拥有其 MCP tools。两个搜索面可以在 Pi Tool Registry 中共存，但 provenance 与名称必须无冲突；不要为了“一次搜索所有东西”提前造统一向量 catalog。

### 8.4 碰撞与命名

- Host tools 保留 canonical `omnimind_* / browser_* / device_*` names；
- 第三方 MCP tools 应保留 server provenance；具体 namespace 规则服从 exact adapter 的已证明机制；
- 同名冲突必须 deterministic fail 或显式 namespace，不能 last-write-wins；
- UI 可显示友好名称，但调用名、source 与 server identity 必须可审计；
- tool call name 是运行时 contract，不应由 Settings 自由修改；开发期若确需重命名，应在同一变更中一次性更新全部 owner、tests 与 fixtures，不留双名兼容层。

## 9. 安全、隐私与故障冰山

### 9.1 权限与撤销

- enablement 只控制 exposure，不替代 permission；
- call path 每次重验 session credential、active turn、project scope 与当前 enablement revision；
- 关闭组后 stale session 的调用立即 fail closed；
- revoke External connection 与关闭内部 capability 是两条独立撤销链；
- 任何 UI “已关闭”都必须能用真实 call falsifier 证明。

### 9.2 secret

- secret 不进入 renderer state snapshot、ServerSettings、URL query、CLI argv、日志、错误详情、截图、analytics 或 tool schema；
- setup 只展示 client-generated secret 的一次性、安全交付流程；
- MCP credential 更新使用 write-only replace，列表只返回 configured/last verified；
- child process env 只传目标 server 必需变量，并在退出后释放引用。

### 9.3 本地进程与网络

- stdio 不经 shell，不接受一段任意 shell script 作为“command”；
- command/args/env 分离校验，明确 cwd owner，禁止继承无关 secrets；
- child 有 startup timeout、call timeout、cancel、graceful close、hard kill fallback 和 zombie proof；
- HTTP MCP 校验协议、redirect、DNS/host change、loopback/private ranges 与 auth forwarding；
- reconnect 有 jitter、上限和 circuit break，设置页打开不能触发 reconnect storm；
- app shutdown、session cancel、server remove 都有确定性 cleanup。

### 9.4 错误与恢复

用户可见错误只回答：发生了什么、影响什么、下一步是什么。技术详情可展开，但不泄露 command env、credential、绝对私密路径或原始第三方响应。

必须覆盖：

- adapter/package 缺失或版本不兼容；
- server 不存在、启动慢、启动后立刻退出；
- schema 无效、tool list 巨大、重复名称；
- auth 过期、OAuth 取消；
- settings rapid toggle、并发 session、关闭时正在调用；
- network flap、redirect 变化、server `listChanged`；
- app crash/restart 后不遗留 child、不把旧 connection 状态显示为 connected。

## 10. 数据、终态收口与开发期清理

### 10.1 Built-in tools

- 在现有 `ServerSettings` 增加一个小型、默认空的 `disabledForExternalEngines` groups 字段；
- default empty 等于全部开启；当前无旧用户，直接更新 schema/default/fixtures，不写数据迁移脚本；
- schema decode 对未来未知 Engine/group fail safe：未知值不扩大权限；具体是忽略并记录诊断，还是保留 round-trip，实施时按现有 Settings compatibility policy 统一；
- 不把实际 catalog snapshot 持久化；计数与 availability 每次由当前 runtime projection 生成。

### 10.2 MCP

- 配置 owner 跟随经 Gate A 采用的 Pi-native Extension/Package；
- OmniMind 只保存其无法由 native owner表达、且确有产品价值的最小偏好；默认不保存第二份 server catalog；
- 若 native config 没有 revision/change notification，Host bridge 可以做只读 fingerprint 与 explicit refresh，不因此建数据库镜像；
- secret storage 必须在采用前定案，不以 plaintext JSON 暂存过渡。

### 10.3 External connections

- 继续复用现有 External MCP DB、credentials、audit 与 stdio/http owner，因为职责正确，不是因为存在旧用户兼容义务；
- 一次性清理错误的 Settings route key、UI 命名与测试；不做 `integrations` alias 或双路由；
- MCP protocol/tool names 若语义正确可继续使用；若 exact review 发现命名错误，开发期直接原子重命名 contracts、backend、setup 与 fixtures；
- 当前开发数据、integration IDs 与 pairing records 不承诺保留，可按 schema 终态清理或重建；不得为本地测试数据增加 migration layer；
- project scope 默认直接收口到 selected projects；若未来提供 edit scope，应产生 audit event 并对扩权重新确认。

## 11. 详细实施切片

本文不授予施工权。获得 Gate B 后，按“一个切片交付一个可验证用户结果”推进；不要先建抽象再等 UI 来用。

### Slice 0：重新锁定来源与同步稳定 contract

目标：在代码变化前确认 owner 没漂移。

1. 记录当前 OmniMind HEAD、bundled Pi exact version/commit、候选 MCP adapter exact source；
2. 重跑 `PI-ECOSYSTEM-INTAKE.md` 对应 Gate A；
3. 复核 AgentGateway tool counts、Provider projection、Settings route 与 External MCP public tools；
4. 把维护者已经确认的“用一套开关控制所有非 OmniMind Agent 引擎”和三页面方向同步到 `architecture/workbench.md` / `architecture/execution.md` 的唯一 owner；
5. 本文只保留证据与参考，不让 research 成为第二 architecture。

退出条件：owner map 无冲突；没有未知 dirty paths；MCP adapter disposition 明确为 adopt/configure/bridge/reject 之一。

### Slice 1：把现有页面准确改名为 External connections

用户结果：设置菜单和页面方向不再误导，创建连接默认最小授权。

最小触点：

- `apps/web/src/settingsNavigation.ts`
- `apps/web/src/settingsSearchIndex.ts`
- `apps/web/src/routes/_chat.settings.tsx`
- `apps/web/src/i18n.tsx`
- `apps/web/src/components/settings/ExternalMcpSettingsPanel.tsx`
- `packages/contracts/src/externalMcp.ts`
- `apps/server/src/externalMcp/httpRoute.ts`
- `apps/server/src/wsRpc.ts`

实现：双语改名与搜索关键词；section id 原子改为 `externalConnections`；默认 selected projects；runtime availability；paired/connected 状态校正。继续使用现有 backend owner，但不保留旧 route alias。

退出条件：代码、tests、fixtures 中不再有误导性的 Settings `integrations`/`MCP connections` 命名；不可用 runtime 无法创建假连接；连接不默认未来所有项目；英文和中文同轮交付。

### Slice 2：Built-in tools 端到端

用户结果：分别开关 OmniMind / Browser / Device 是否提供给所有非 OmniMind Agent 引擎，并且开关真的控制曝光和调用。

最小触点：

- `packages/contracts/src/settings.ts`
- `apps/server/src/serverSettings.ts`
- `apps/server/src/agentGateway/Layers/AgentGateway.ts`
- `apps/server/src/agentGateway/mcpTransport.ts`
- `apps/server/src/agentGateway/mcpInjection.ts`（应只消费过滤结果，不复制 policy）
- `apps/server/src/provider/Layers/PiAdapter.ts`
- 新的窄 `BuiltInToolsSettingsPanel.tsx`
- Settings navigation/search/route/i18n

实施顺序：

1. 在 catalog assembly 附加唯一 group provenance；
2. 增加只读 group projection contract；
3. 增加一份 `disabledForExternalEngines` groups 设置；
4. 所有非自有引擎的 `tools/list` / native projection / stock Pi registration 使用同一过滤结果；
5. `tools/call` 做实时 fail-closed policy check；
6. 做无 Engine selector 的三组安静行 UI；
7. 明确 current session / next session 生效文案。

退出条件：关闭 Browser 后，Codex、Claude、stock Pi 等所有外部引擎的新 session schema 都不含 Browser、旧 session call 被拒绝；OmniMind Agent 仍可使用；Browser 人类 UI 不受影响；Device unavailable 真实显示。

### Slice 3：MCP adapter exact-source Gate A

用户结果：无 UI 变化；团队获得能否可靠接入的事实结论。

只读审判 §6.2 全部条件，做最小隔离 probe：fresh `.omnimind`、stdio/HTTP、list/call/cancel/shutdown、collision、auth failure、100-tool synthetic server、restart。不能读取或修改用户 stock `.pi`，不能建立长期兼容层。

退出条件：exact disposition 与 falsifier 写入 research；失败则停止 Slice 4，不现场重写完整 adapter。

### Slice 4：OmniMind Agent MCP lifecycle bridge + UI

前提：Slice 3 通过且采用已获 Gate B。

用户结果：可以在 MCP 页面添加、测试、启停、编辑、替换凭据和删除 OmniMind Agent 的 MCP server。

owner 落点优先靠近现有 OmniMind/Pi ecosystem lifecycle，例如 `apps/server/src/provider/Layers/OmniMindEcosystem.ts` 或一个被它拥有的窄 service；只有当前代码证明该 owner 不合适时才新建模块。不要先创建 `GenericIntegrationManager`。

实现：typed intents、redacted view、native config write、connection lifecycle、Pi Extension registration、总览/添加/详情 UI、双语、错误/empty/loading/retry、清理。

退出条件：fresh profile 配置一次即可；restart 后一致；secret 不泄露；disable/remove 后新 session 不见工具；失败 server 不阻塞其他 server。

### Slice 5：Pi-owned lazy composition

前提：此前 `pi-native-host-tool-loading-review.md` 的 inline Extension 实现另获 Gate B，且 MCP adapter 的 lazy semantics 已证明。

用户结果：工具规模增长时，模型初始上下文仍小而准确；Host tools 与第三方 MCP tools 各由自己的 Extension 搜索/代理，不相互抢 owner。

验证 tool activation additive、cache/key 变化、third-party inactive tools 不被误激活、prompt economics、collision/provenance。若收益不超过 current eager baseline 的复杂度，保持现状，不为“理论优雅”施工。

### Slice 6：focused、live 与 packaged closure

按风险比例验证，不做无界 benchmark：

- contracts/schema/default/migration；
- navigation/search/deep-link/i18n/a11y；
- Gateway catalog、filter、call deny、concurrency；
- Codex/Claude/ACP/Pi representative projections；
- adapter conformance、process cleanup、network failure；
- fresh profile、restart、packaged desktop；
- 真实 Engine journey 只用最小请求证明 wire behavior，不把模型名当协议证据。

完成状态只能进入当前 Campaign/代码/测试/Git，不回写成本文的“已完成故事”。

## 12. 验收矩阵

| 维度 | 必须证明 | 主要 falsifier |
| --- | --- | --- |
| 菜单 | 中英菜单顺序、名称、搜索、深链一致 | MCP/外部连接方向仍混淆 |
| Built-in UI | 不选 Engine，只见真实组、计数、可用性和清楚的外部范围 | 硬编码 24/22/12、出现 Workspace Files 假能力或 Provider 矩阵 |
| 产品默认 | fresh settings 下三组对外 enabled，用户关闭后才收窄 | 默认值与 UI 文案或 runtime 不一致 |
| 新会话曝光 | disabled group 不在任何外部引擎的新 session schema | 只在 UI 关掉，模型仍看到 |
| 旧会话安全 | disabled 后 stale call 立即被 Gateway 拒绝 | 需重启才真正禁用 |
| 自有/外部隔离 | 一份开关一致影响全部外部引擎，但不影响 OmniMind Agent | 按 Provider 漂移，或外部开关误伤自有引擎 |
| 人类 UI 隔离 | Agent Browser off 不影响 Browser 面板 | 能力与 Agent exposure 混成一件事 |
| 权限 | enablement 不绕过 runtimeMode/turn authority | enabled 被误当为自动授权 |
| MCP owner | config/secret/lifecycle 只有一份 owner | Host DB 与 adapter JSON 双写漂移 |
| MCP 规模 | 100 server metadata 不触发全连接；大量 tools 不全塞 prompt | Settings mount 产生进程/网络风暴 |
| MCP failure | 单 server fail/cancel/restart/cleanup 可恢复 | zombie、无限重连、全局阻塞 |
| 外部连接 | 默认选定项目、runtime 可用、状态真实 | 默认未来所有项目或假 connected |
| Secret | renderer/log/argv/error/snapshot 无明文 | 任一路径可复现 secret |
| 性能 | Settings 交互即时；长列表有边界；无主线程长任务 | 每次 render 重做全 schema/连接探测 |
| 可访问性 | 键盘、focus、label、disabled reason、screen reader | 仅靠颜色/tooltip 表达状态 |
| packaged | fresh packaged profile 行为与开发态一致 | 只在源码/dev home 可用 |

## 13. 测试与证据落点

建议 focused tests 随 owner 放置：

- Settings navigation/search/route/i18n：现有相邻 test；
- `ServerSettings` decode/default/patch/rapid updates；
- AgentGateway catalog group projection、external-engine policy filter、call-time deny；
- `mcpInjection` 的 Codex/Claude/ACP/OpenCode representative config；
- `PiAdapter` / inline Extension 的 registry、activation、call forwarding；
- `ExternalMcpSettingsPanel` default scope 与 runtime unavailable；
- External MCP HTTP/RPC owner-only、loopback/public URL 与 existing credentials regression；
- MCP adapter conformance：stdio、HTTP、cancel、shutdown、collision、secret redaction、fresh profile。

不要用 snapshot 代替语义断言。tool list 测试至少断言 group provenance、enabled/disabled、所有外部引擎一致和 OmniMind Agent 隔离；security tests 必须真正 call，而不是只看 UI。

## 14. 明确拒绝的过拟合与第二系统

以下路线除非出现新的强证据，否则不进入实现：

1. **通用 Capability Center / Integration Registry**：三个现有 owner 足够，没有真实用户结果要求第四个总管。
2. **跨 Engine MCP 配置同步器**：会写多个用户目录、吞掉各 Engine 原生差异，责任与回滚不可控。
3. **Host-owned MCP server database**：若 Pi-native adapter 已拥有 config，这是第二真相源。
4. **全部 Host tools 都“变成 MCP 产品”**：传输细节污染用户心智，Pi 路径也不应被迫绕 MCP。
5. **`pi-mcp-adapter` 回连 OmniMind AgentGateway**：自家 Gateway 已有 Pi custom tool/Extension seam，回环只增加 transport、credential 与 lifecycle。
6. **每工具权限矩阵**：首版三组 enablement 足够；permission 继续由 runtimeMode 与真实 owner 管。
7. **58 个 toggle 或 tools × engines 大表**：维护与认知成本随规模平方增长。
8. **Embedding / vector tool marketplace**：10/100 规模先用轻量 metadata 与 native lazy discovery；无 outcome 证据不加服务。
9. **Pi core fork**：public seam 不足时先 bridge/upstream；不能把局部不足变成永久维护分叉。
10. **把 Settings mount 当 health monitor**：打开页面不应启动全部 server 或持续轮询。
11. **把 Skills、MCP、Tools 合成“插件”大页**：实现层可共享扩展 seam，用户任务和 lifecycle 仍不同。

## 15. 回滚与删除策略

每个切片必须可独立回退：

- External connections 改名失败：恢复文案，不改 protocol/DB；
- Built-in tools policy 失败：删除新增 settings 字段与 UI，默认回到当前全启用 projection；canonical catalog 不受损；
- MCP candidate 失败：不进入生产依赖，删除隔离 probe artifacts；
- MCP bridge 失败：禁用/删除 Extension registration 和 Settings section，保留 Pi core、AgentGateway 与外部 Engine 原生配置不变；
- lazy tool search 经济性不成立：退回当前 eager Pi customTools，不影响 external-engine policy 与非 Pi projections。

禁止用迁移脚本把用户 stock `.pi/.codex/.claude` 配置搬进 OmniMind 后再声称“可回滚”。首版不能写这些 owner 的用户目录。

## 16. 复验触发器

只有以下事实变化才重新打开对应结论：

- bundled Pi version、Tool Registry/Extension/Package API 或官方 MCP stance 变化；
- exact MCP adapter revision、依赖、license、transport 或 storage owner 变化；
- AgentGateway 从静态 catalog 改为动态 list notifications；
- Provider SDK 新增/移除 native MCP、dynamic tool refresh 或 permission seam；
- Host 新增第四类真实 capability group；
- 用户证据显示组粒度不足或需要跨 Engine 分发第三方 MCP；
- External MCP 从 loopback-only 扩展到 remote/public deployment；
- Settings 母体 section/deep-link/search contract 变化；
- packaged runtime、platform、secret store 或 process sandbox 变化。

没有新 falsifier 时，不重复做同一来源、同一调用路径的 probe。

## 17. 精确文件与 symbol 导航

重启实现前优先从这些现有 owner 搜索，不凭本文猜路径：

| 关注点 | 当前入口 |
| --- | --- |
| Settings sections/groups | `apps/web/src/settingsNavigation.ts` |
| Settings search | `apps/web/src/settingsSearchIndex.ts` |
| Settings route/panel mount | `apps/web/src/routes/_chat.settings.tsx` |
| 双语 | `apps/web/src/i18n.tsx` |
| Skill 页面范式 | `apps/web/src/components/settings/SkillsSettingsPanel.tsx`、`skillsSettingsModel.ts` |
| External connections UI/setup | `ExternalMcpSettingsPanel.tsx`、`externalMcpSetup.ts` |
| Server settings schema/default/patch | `packages/contracts/src/settings.ts` |
| Server settings persistence/revision | `apps/server/src/serverSettings.ts` |
| Gateway catalog assembly | `apps/server/src/agentGateway/Layers/AgentGateway.ts` |
| Gateway 受信任的 Provider session identity | `apps/server/src/agentGateway/Services/AgentGatewaySessionRegistry.ts` |
| Gateway MCP list/call | `apps/server/src/agentGateway/mcpTransport.ts` |
| 非 Pi Engine projection | `apps/server/src/agentGateway/mcpInjection.ts` |
| Pi projection | `apps/server/src/provider/Layers/PiAdapter.ts` |
| OmniMind/Pi ecosystem lifecycle candidate owner | `apps/server/src/provider/Layers/OmniMindEcosystem.ts` |
| External MCP contracts | `packages/contracts/src/externalMcp.ts` |
| External MCP backend | `apps/server/src/externalMcp/*`、`apps/server/src/wsRpc.ts` |

## 18. 已确定与仍需证据决定的事项

### 已由维护者确定

- 使用 §2 的中英文菜单；
- `External connections / 外部连接`，不用 `External agents`；
- Agent skills、Built-in tools、MCP 在 Coding 中平级；
- Workspace Files 不是一个可伪造的内置工具组；
- OmniMind Host 原生工具可由用户决定是否向外部 Agent 引擎提供；
- 只有一套外部引擎开关：关闭某组后，Codex、Claude、OpenCode、stock Pi 等所有非 OmniMind Agent 引擎都关闭；
- 不提供 Engine selector，不持久化 Provider 维度；OmniMind Agent 自身不受该外部暴露开关影响；
- 自有/外部判据复用现有 `AgentGatewaySessionIdentity.provider`，canonical `omnimind` 是自有 Agent；
- 尊重 Pi 官方设计，不用 Host 发明一套替代 Pi 的插件/工具生命周期。

### 仍由证据决定，不应让用户提前猜技术答案

- exact `pi-mcp-adapter` 或其他候选是否满足 Gate A；
- MCP 首版能安全支持哪些 transport、OAuth/resources/prompts；
- 哪些 Provider 支持运行中 tool-list 热刷新；
- Pi lazy tool search 的真实效果/经济性是否值得从 eager bridge 演进；

这些是实现证据问题，不是新的产品分叉。候选失败时遵循 stop-loss，不把失败变成用户必须理解的复杂设置。

## 19. 最终判断

这套方案尊重 Pi 的地方，不是把所有东西都命名为 Pi Plugin，而是尊重它真正的边界：Pi session 内的 Package、Extension、Tool Registry 与 active tools 由 Pi 机制拥有；OmniMind Host 只通过官方 seam 注入自己唯一拥有的能力。非 Pi Engine 继续走其原生 MCP/plugin seam，不被迫模拟 Pi。

这套方案尊重 OmniMind taste 的地方，是把复杂度沉到底层：用户只需要理解“技能”“内置工具”“MCP”“外部连接”四个日常概念，并能在内置工具页直接关闭三组真实能力对所有外部引擎的暴露。底层再负责 catalog、transport、session、permission、secret、cache、reconnect、stale schema、cleanup 和可维护性。

最关键的不变量是：

> **一份能力真相；一套开关统一控制所有非自有引擎；每个 Engine 使用自己的原生 seam；OmniMind Agent 保持自身机制；任何设置中的“关闭”都必须在真实执行路径上成立。**
