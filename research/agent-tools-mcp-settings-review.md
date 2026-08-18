# Agent 内置工具、Host MCP 与外部连接：Settings 与运行时执行方案复核

> 证据日期：2026-08-18
> OmniMind 源码复核基线：原始调用链锁定于 `a24653bc7b00f9632275f2960776c31c68d61968`；文档候选在独立分支跟进至 `d4be738c6c8bbabab897848fddde2130e3971733` 后修正
> 关联 Pi 证据：[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)，bundled Pi `0.84.2` / upstream `914cf147…`
> 已确认产品意图：一套 fresh 默认开放的 Built-in policy 控制所有 Agent，包括 OmniMind Agent；只有 `provider === "omnimind"` 让 AgentGateway Host tools 作为标准 Pi Extension tools 参与 Pi-native Dynamic Tool Loading，stock Pi 与其他 Engine 保持 direct/eager
> 产品范围：首版不提供第三方 MCP Settings 页面或管理生命周期
> 文档角色：当前源码事实、已确认裁决与未来 Gate B 实施/验收参考；不取代 `architecture/`、`execution-brief.md` 或 Campaign

## 0. 本文解决什么

这不是“设置里加两个菜单”的浅层任务，而是五个必须分开的责任：

1. OmniMind Host 自己拥有的 Browser、Device、Thread、Automation 等能力；
2. 一套 Built-in policy 如何控制这些能力是否提供给所有 Agent；
3. OmniMind Agent如何用Pi原生动态加载保护上下文，其他Engine如何保持各自原生direct projection；
4. 第三方MCP为何退出首版Settings与Host生命周期；
5. 独立Codex、Claude Code等外部应用如何反向连接OmniMind。

重开时按以下顺序读：

1. [`README.md`](../README.md)；
2. [`architecture/workbench.md`](../architecture/workbench.md)；
3. [`architecture/execution.md`](../architecture/execution.md)；
4. [`architecture/product-state.md`](../architecture/product-state.md)；
5. [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)；
6. [`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)；
7. 当前 [`execution-brief.md`](../execution-brief.md) 与 active Campaign；
8. 本文列出的 current source symbols。

## 1. 结论摘要

```text
OmniMind Host canonical capabilities
  └─ AgentGateway
       ├─ catalog / schema / annotations / group provenance
       ├─ execution / credential / capability / turn authority
       └─ timeout / cancellation / lifecycle

Built-in tools policy (fresh default: enabled)
  └─ applies to every Agent engine, including OmniMind Agent

provider === "omnimind"
  └─ allowed Gateway definitions → real Pi ToolDefinition
       → named hidden session-scoped inline Extension
       → Pi Tool Registry (all Host tools initially inactive)
       → Pi-native Dynamic Tool Loading
       → actual execute returns to AgentGateway

stock Pi
  └─ existing customTools direct/eager projection

Codex / Claude / OpenCode / ACP / others
  └─ each Engine's native MCP/plugin direct projection

Third-party MCP
  └─ outside first-release Settings and Host lifecycle

External connections
  └─ existing external app → OmniMind task connection
```

稳定裁决：

- 一份 AgentGateway catalog；
- 一套 all-agent Built-in policy；
- OmniMind Agent一条Pi-native dynamic projection；
- stock Pi与其他Engine保留现有direct/eager projection；
- AgentGateway继续唯一执行与call-time authority owner；
- 首版只有 `Built-in tools / 内置工具` 与 `External connections / 外部连接` 两个相关Settings入口；
- 不建立第三方MCP页面、manager、registry、secret store、状态面板、统一搜索或跨Engine自动分发；
- 不建立第二Tool Registry、active store、permission system、index或配置库。

动态加载是确定目标。eager只作当前行为、测量 comparator与临时代码rollback；exact Pi seam不足时报告blocker/upstream需要。

## 2. 产品语义：能力身份不等于传输协议

用户的设置主键是 capability group，不是MCP server或Provider：

```text
Built-in capability group → available to all Agent engines / not available
```

| 用户看到的能力                  | OmniMind Agent                 | stock Pi                   | 其他 Engine              | 设置归属       |
| ------------------------------- | ------------------------------ | -------------------------- | ------------------------ | -------------- |
| Browser                         | Pi Extension注册、原生动态加载 | `customTools` direct/eager | native MCP/plugin direct | Built-in tools |
| Device                          | 可用时注册并动态加载           | 可用时direct/eager         | 支持时native direct      | Built-in tools |
| Thread/Automation               | Pi Extension注册、原生动态加载 | direct/eager               | native direct            | Built-in tools |
| GitHub/Notion/数据库等第三方MCP | 首版不由Host管理               | 保持Engine-native owner    | 保持Engine-native owner  | 首版无入口     |

Browser给Codex时经过MCP，不等于用户应在“MCP server列表”里管理Browser。协议属于adapter，产品能力属于Built-in tools。

Enablement也不是permission：enabled只表示某Engine可以按其真实projection获得能力；每次call仍受credential、runtimeMode、真实approval、turn authority、availability、timeout与cancellation约束。

## 3. 首版 Settings 信息架构

保持现有Synara-derived taxonomy，只做必要改名与新增。

### 3.1 中文

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
└── 托管工作树

系统
└── 系统工具

归档
└── 已归档任务
```

### 3.2 English

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
└── Managed worktrees

System
└── System tools

Archived
└── Archived tasks
```

### 3.3 页面语言

| 页面       | 中文说明                                                | English description                                                      |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Agent 技能 | 管理可供 Agent 使用的技能。                             | Manage skills available to agents.                                       |
| 内置工具   | 选择可供所有 Agent 引擎使用的 OmniMind 内置工具。       | Choose which OmniMind built-in tools are available to all agent engines. |
| 外部连接   | 允许 Codex、Claude Code 等本地应用连接并使用 OmniMind。 | Let Codex, Claude Code, and other local apps use OmniMind.               |

正常产品表面不出现 Pi、MCP transport、loader、Tool Registry、active set 或动态搜索等实现心智。技术事实只进入架构、诊断、About/Licenses或用户主动展开的技术详情。

## 4. 当前源码事实与缺口

### 4.1 Settings

- `apps/web/src/settingsNavigation.ts` 已有 `personal / integrations / coding / system / archived`；
- 当前外部连接页可见名仍来自 `MCP connections` / `External agents`；
- `apps/web/src/routes/_chat.settings.tsx` 挂载 `ExternalMcpSettingsPanel`；
- `apps/web/src/settingsSearchIndex.ts`、deep link、keyboard与route-owned panel是现有母体；
- `SkillsSettingsPanel.tsx` 已提供统一catalog、真实来源与enablement展示范式；
- 尚无Built-in tools section与all-agent Host exposure policy。

仅在UI隐藏工具而不在`tools/call`实时拒绝，会形成假的安全开关。

### 4.2 AgentGateway

`apps/server/src/agentGateway/Layers/AgentGateway.ts` 组装 OmniMind/Thread/Automation、Browser、可用时Device。当前观察为普通46、Device可用时最多58；UI不得硬编码。

`apps/server/src/agentGateway/mcpTransport.ts` 当前持有静态session catalog；`tools/list`返回definitions，`tools/call`执行credential/capability/turn checks。当前没有动态list-change通知，因此“开关后立刻从所有Engine上下文消失”不能虚假承诺。

`AgentGatewaySessionIdentity.provider` 已提供可信canonical Provider identity。分支只使用`provider === "omnimind"`，不让renderer、display name或client input自报身份。

### 4.3 Engine projection

`apps/server/src/agentGateway/mcpInjection.ts` 已投影Codex、Claude SDK、ACP、OpenCode与Antigravity等native seam。`apps/server/src/provider/Layers/PiAdapter.ts` 当前把全部Gateway definitions eager转成Pi `customTools`并把call转回Gateway。

目标不是重做这些owner，而是：

- all-agent Built-in policy先过滤同一canonical catalog；
- 只有`omnimind`改成标准Pi Extension tools + native dynamic lifecycle；
- stock Pi与其他Engine保持direct/eager。

### 4.4 External connections

`apps/server/src/externalMcp/*` 与 `ExternalMcpSettingsPanel.tsx` 实际提供“外部应用 → OmniMind”任务连接，公开六个窄工具：overview、capabilities、allowed projects、create task、wait task、read task。

它已有owner-only、pairing、client-generated secret、credential hash、private file、revoke/expiry、rate/concurrency、audit、idempotency与cancellation。它不是第三方MCP manager。

当前产品缺口：命名方向含混；默认`allProjects=true`会包含未来项目；UI未准确投影runtime availability；没有heartbeat却可能被误写成“当前已连接”。

### 4.5 第三方 MCP manager不是首版缺口

第三方MCP会引入config owner、secret、OAuth、stdio/HTTP、审批、子进程、项目配置、重连、状态、审计与卸载责任。目前没有足够明确的首版用户结果证明值得承担，所以“无第三方MCP Settings”是完整终态，不是缺功能。

## 5. 唯一 owner map

| 状态/行为                          | 唯一 owner                                | Settings/adapter只做                          | 禁止复制                      |
| ---------------------------------- | ----------------------------------------- | --------------------------------------------- | ----------------------------- |
| Host name/schema/annotations/group | AgentGateway catalog                      | filter与projection                            | 每Provider一份schema          |
| Host execution                     | AgentGateway + Host service               | forward call                                  | 在Pi/MCP adapter重写实现      |
| all-agent exposure intent          | 现有ServerSettings中的一份Built-in policy | UI修改intent                                  | localStorage/per-Provider副本 |
| call permission/approval           | runtimeMode + Gateway/Engine owner        | 显示真实结果                                  | per-tool permission ledger    |
| Pi Registry/all/active/reload      | Pi AgentSession/ResourceLoader            | Extension注册owned tools、additive activation | Host第二registry/active store |
| exact callable loader              | Host inline Extension内部可替换细节       | 轻量metadata discovery                        | 产品工具/全局搜索owner        |
| stock Pi direct projection         | PiAdapter `customTools`                   | 消费filtered catalog                          | 进入OmniMind dynamic分支      |
| 其他Engine direct projection       | 对应native adapter                        | 消费filtered catalog                          | 跨Engine万能runtime           |
| third-party MCP                    | 首版无人接管；未来exact adapter owner     | 首版无UI/数据                                 | Host manager/config/secret DB |
| 外部应用进入OmniMind               | 现有External MCP Gateway                  | 管理connection与scope                         | 与内部AgentGateway合并        |
| Skills                             | Pi/Engine native owner                    | catalog与enablement投影                       | 用Host loader代替Skill loader |

新增一个Host tool时只应改canonical definition/handler与必要权限测试；若还要分别改Pi、Codex、Claude、UI、Prompt六份schema，说明边界失败。

## 6. Built-in tools 页面

### 6.1 形状

只显示真实group，不显示Engine selector或tools×engines矩阵：

```text
内置工具
选择可供所有 Agent 引擎使用的 OmniMind 内置工具。

OmniMind      runtime-derived count      [开]
任务、线程、自动化与诊断。

Browser       runtime-derived count      [开]
浏览、读取网页并与页面交互。

Device        runtime-derived count      [开/不可用]
检查并操作受支持的 iOS 模拟器。
```

计数与availability来自canonical catalog projection，不硬编码24/22/12。真实Device unavailable与用户disabled必须分开。

### 6.2 状态语义

- `available`：平台/Host service真实支持；
- `enabledForAgentEngines`：用户intent；
- `effectiveForAgentEngines = available && enabled`；
- current Session registered/active：诊断事实，不是持久设置。

### 6.3 默认与持久化

fresh默认全部开放。持久化一份disabled group intent即可；字段名服从现有schema风格，不持久化Provider维度、catalog snapshot、tool active set或permission。

要求：

- 进入现有revisioned atomic `ServerSettings`；
- 默认空disabled集合；
- 当前无旧用户，不造migration/alias/dual-read；
- unknown future disabled IDs有界保留并round-trip，或整体明确fail；不得丢弃后静默重新开放；
- rapid toggles遵循现有revision/stream，旧响应不能覆盖新intent。

## 7. End-to-end 会话与动态加载

### 7.1 新 Session

```text
Provider/session owner fixes canonical identity
  → read current Built-in policy
  → intersect platform/service availability
  → obtain one filtered AgentGateway catalog

provider === "omnimind"
  → convert definitions to real Pi ToolDefinition
  → named hidden session-scoped inline Extension registers them
  → Pi Registry owns all/active truth
  → all Gateway Host tools initially inactive
  → extension-local loader remains active

stock Pi
  → existing customTools direct/eager

other Engines
  → native MCP/plugin direct/eager
```

OmniMind path不预设Host core。current-source 已证明 `omnimind_update_tasks` 是唯一 OmniMind-exclusive、非 AgentGateway 的 custom session tool：它只在 `provider === "omnimind" && workSurface === "agent"` 时由 PiAdapter/Session owner直接注入，和 immutable Agent task policy、canonical `turn.tasks.updated` progress projection构成同一lifecycle，因此必须initially/always active。它不是AgentGateway Host tool、Host core或Host Extension loader scope，也不受Browser、Device、Thread、Automation Built-in group toggle影响。supervised `bash`、Pi built-ins与Package/Extension tools继续保留各自custom/session/native owner及active决定。当前没有第二个OmniMind-exclusive非Gateway custom session tool；未来新增项逐一按真实owner/lifecycle复核，不预留共同抽象。

### 7.2 Exact Pi loader边界

Pi `0.84.2` 原生拥有registered/all/active、additive change detection与Provider native/fallback wire，但没有默认全局callable search tool。若需要callable入口，它只是Host Extension内部的薄loader。

它只发现/激活：

```text
this Extension owns
∩ registered in this Session
∩ current Built-in policy allows
∩ current availability
∩ currently inactive
```

它只用name、短description、provenance等轻量metadata，并只做additive `setActiveTools([...active, ...matches])`。不代理执行、不返回完整schema、不连接server、不建索引/store，不接管Pi built-ins、Bash、task/session-control、其他Extension/Package、Skills/Prompts或third-party MCP。

Pi启动默认会把Extension/custom tools active，所以Host Extension在session lifecycle中只能移除自己拥有的Host names并保持loader active；不能重置其他owner active set。

### 7.3 Prompt

OmniMind Agent初始prompt只说明额外Host能力可按需发现/加载、需要时使用当前active loader、激活后下一安全turn调用、不要猜名字；不枚举inactive Browser/Device/Thread/Automation，不把全catalog或长说明搬进loader description/result。

stock Pi与其他Engine继续获得与完整filtered schema一致的直接指导；Codex静态Browser instructions随Built-in policy过滤。

### 7.4 调用

Pi在下一安全turn通过exact Provider native deferred或fallback暴露新增definitions；actual execute仍进入AgentGateway `tools/call`。

`registered != active != authorized`。每次call重新检查policy、session identity、credential、availability、runtimeMode/permission、真实approval、turn authority、timeout与cancellation。

## 8. Toggle、旧 Session 与 in-flight

### 8.1 关闭

```text
atomic settings update
  → new OmniMind Session does not register disabled group
  → old OmniMind loader live-filters it out
  → new stock Pi/other Engine Sessions do not receive definitions
  → every stale new call is denied by Gateway immediately
```

已active schema可能到reload/new Session才从上下文消失，但不能执行。已准入in-flight call不因普通exposure toggle被伪杀；cancel归turn/session owner。Browser/Device人类UI不受影响。

### 8.2 重新开启

不把创建时未注册/未投影的schema偷偷加入旧Session。按各Engine真实reload/new-session边界生效。不得为视觉一致建立全局registry或第二active store。

### 8.3 Reload/resume/fork

Pi Session/ResourceLoader拥有lifecycle与active truth；能原生恢复就复用，不能时安全重新发现。旧Extension instance/handler不得泄漏。没有Host active persistence、LKG、generation或migration。

## 9. Collision、provenance 与 empty failure

ResourceLoader已知能对Extension-Extension conflict给出diagnostic/load-order语义，但builtin/custom/inline交叉来源不能凭名字推断。Gate B必须用exact conformance证明。

Gateway内部duplicate、与Pi built-in/custom、与Package/Extension冲突都必须显式fail closed；不silent override、drop或rename。来源必须可审计，错误不泄露secret、endpoint、schema或用户参数。

Gateway不可用、filtered pool为空、discovery失败时准确unavailable；不注册空壳loader产品，也不从“无tools”推断可以跳过其他Provider lifecycle。

## 10. 第三方 MCP：首版明确退出

### 10.1 删除/延期范围

首版不实现：

- 第三方MCP server CRUD、启停或连接测试；
- credential/OAuth/write-only secret UI；
- 全局health/status/last error/tool count面板；
- Host通用MCP manager、config DB、registry、permission或recovery state machine；
- 自动投影给Codex、Claude、OpenCode等外部Agent；
- 一个统一入口搜索Host tools与所有third-party MCP tools。

这不删除MCP协议。AgentGateway MCP transport、外部Engine native Host projection与External connections都继续。

### 10.2 两类 MCP

1. **OmniMind-owned AgentGateway MCP**：Browser、Device、Thread、Automation等Host能力；AgentGateway是catalog/execution owner。
2. **Third-party MCP**：GitHub、Notion、数据库、搜索服务等；未来可能作为OmniMind Agent扩展，但首版不由OmniMind Settings管理。

### 10.3 对未来tool discovery的准确表述

只有未来采用的Pi-native MCP Extension/adapter经exact-source、isolated runtime与真实Session证明支持lazy discovery/proxy或按需activation时，它的tools才可能进入其owner自己的动态体验。不能从MCP协议推导。

其discovery只负责发现/描述/请求activation，不负责config、credential、OAuth、start/stop、reconnect、approval、permission、cancel或audit。discovered/active不等于authorized。不得为发现连接所有server、制造process/network/reconnect storm或把全量schemas塞入context。Host与third-party tools保持不同owner/provenance，不预建总registry或统一permission。

### 10.4 未来重开门

必须先回答：

- exact adapter是否有稳定headless/programmatic seam；
- 是否真实支持lazy discovery/proxy；
- config/secret/transport/approval/lifecycle各自唯一owner；
- stdio env/shell、HTTP SSRF/redirect/private network与credential forwarding；
- 如何避免连接/进程/重连风暴与context膨胀；
- 只服务OmniMind Agent还是显式分发给其他Engine；
- session-scoped状态如何不伪装成global connected；
- packaged fresh-profile startup/cancel/close/reopen/orphan cleanup；
- 用户需求是否足够明确，值得恢复Settings页面。

## 11. External connections

现有External MCP Gateway保留owner，只纠正产品方向与最小授权。

首轮要求：

1. 可见名改为`External connections / 外部连接`；
2. route/search/deep link/internal id原子改为准确命名，不留开发期alias；
3. 文案说明“外部本地应用连接并使用OmniMind”；
4. 用connection/client而不是connected agent；
5. 默认选择明确projects，不默认all/future projects；
6. backend继续owner + loopback-only，UI投影同源runtime availability；
7. 只显示paired、last used、revoked、expired等已有事实；无heartbeat不显示current connected。

暂不顺手扩张edit/test/renew/delete/last error/每client setup card。External connection的project scope、expiry、revocation、rate limit与audit继续独立，不跟随内部Built-in toggle。

## 12. 安全、隐私与故障冰山

### 12.1 Secret

- AgentGateway bearer继续由per-session Host owner签发/轮换/撤销；
- secret不进入renderer snapshot、ServerSettings、URL query、argv、日志、错误、截图、analytics、schema或loader metadata；
- External connection secret继续一次性安全交付与hash owner；
- 首版没有第三方MCP credential输入/持久化路径。

### 12.2 Permission与撤销

- enablement不替代permission；
- call path每次重验credential、turn、scope、availability与policy；
- stale call立即fail closed；
- External revoke与Built-in disable是两条独立链；
- UI“已关闭”必须用真实call falsifier证明。

### 12.3 Cancellation与late result

- loader短、进程内、无network/process；
- actual Tool继续转发Pi `AbortSignal`；
- Provider replacement/session disposal沿现有owner；
- active-set变化和普通toggle不取消in-flight；
- late response由session/turn fence拒绝或抑制。

### 12.4 用户可见错误

只回答发生了什么、影响什么、下一步是什么。技术详情可展开但不泄露command env、credential、私密路径或原始第三方response。

## 13. 数据终态

### 13.1 Built-in tools

- 现有ServerSettings新增一个小型、默认空的disabled groups intent；
- 不持久化catalog snapshot、active tools、Provider矩阵或permission；
- 当前无旧用户，不写migration/alias/dual-read；
- runtime-derived count/availability每次投影。

### 13.2 Third-party MCP

- 不增加server catalog/config/secret/status/cache/revision/fingerprint/migration；
- 不读取、导入、迁移或修改stock `.pi/.codex/.claude`与project `.mcp.json`；
- 不预留空壳service或字段。

### 13.3 External connections

- 继续现有DB、credentials、audit与transport owner；
- 开发期一次性纠正route/UI命名与fixtures；
- project scope默认收口到selected projects；
- 不为本地测试数据增加migration layer。

## 14. Gate B 实施切片

本文不授予代码施工权。获授权后按纵向结果推进。

### Slice 0：重新锁定exact source/owner

- current OmniMind HEAD与bundled Pi exact identity；
- AgentGateway counts/provenance；
- current Provider projections；
- Settings route与External public tools；
- architecture与research无冲突；
- 第三方MCP未漏回。

### Slice 1：External connections准确改名与最小授权

双语名称/search/deep link、route id、selected-project default、runtime availability与真实paired/last-used状态。继续现有backend，不新增heartbeat或manager。

### Slice 2：Built-in tools all-agent policy

- canonical catalog附唯一group provenance；
- ServerSettings一份disabled intent；
- runtime-derived group projection；
- new-session filter覆盖所有Agent；
- all-agent `tools/call` live deny；
- Codex/其他direct prompt随policy；
- 三组安静UI；
- old-session/in-flight/re-enable语义。

### Slice 3：OmniMind Agent Pi-native Dynamic Tool Loading

- 复用Gateway definition→Pi Tool与execute bridge；
- named hidden session-scoped inline Extension；
- all allowedGateway Host tools初始inactive；
- exact-version薄loader只做owned additive activation；
- prompt diet、collision、reload/resume/fork与Provider wire；
- stock Pi/其他Engine不变。

动态加载已是目标。eager baseline只用于测量schema bytes、prompt/cache、错选率、额外turn、成功率、TTFR与成本，以及作为临时rollback。若exact seam阻塞，报告upstream/blocker。

### Slice 4：focused/live/packaged closure

- contracts/default/revision；
- navigation/search/deep link/i18n/a11y；
- Gateway filter/call deny/concurrency；
- Pi lifecycle/collision/provider wire；
- direct projections回归；
- MiMo/DeepSeek最小真实journey；
- exact pushed SHA fresh packaged profile。

## 15. 验收矩阵

| 维度                 | 必须证明                                            | 主要falsifier                            |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
| Settings             | 中英名称/顺序/search/deep link一致；无第三方MCP入口 | 仍出现MCP manager或方向混淆              |
| Built-in UI          | 无Engine selector；真实group/count/availability     | 硬编码数量或矩阵                         |
| 默认                 | fresh全部enabled，关闭后才收窄                      | UI/default/runtime不一致                 |
| all-agent policy     | 同一开关影响OmniMind、stock Pi与其他Engine          | 任一路径绕过                             |
| OmniMind new Session | allowed definitions注册、全部Host tools初始inactive | eager全暴露或预留未经证据支持的Host core |
| loader scope         | 只管理本Extension owned/live/available/inactive集合 | 接管builtins/Packages/Skills/MCP         |
| direct Engines       | stock Pi与其他Engine继续direct/eager                | 被强制动态加载                           |
| prompt               | OmniMind初始prompt不直呼inactive tools              | catalog从schema搬进文字                  |
| old Session          | disabled后loader不发现，stale call立即deny          | 需重启才安全                             |
| in-flight            | 普通toggle不伪杀已准入call                          | exposure变成kill switch                  |
| reload               | 无第二active store，旧instance不泄漏                | handler/store双真相                      |
| collision            | exact conformance + fail closed                     | silent override/rename                   |
| permission           | registered/active不冒充authorized                   | enabled等于授权                          |
| Human UI             | Agent Browser/Device off不影响人类pane              | capability/exposure混合                  |
| Third-party MCP      | 无UI/CRUD/secret/status/distribution/总搜索         | 任一责任漏回                             |
| External connections | selected projects、runtime真相、无假connected       | 默认未来全部项目                         |
| Secret               | renderer/log/argv/error/schema无明文                | 任一路径泄露                             |
| Performance          | schema bytes下降、无无意义加载、无重索引            | context换位置膨胀                        |

## 16. 测试与证据落点

- Settings navigation/search/route/i18n相邻tests；
- ServerSettings decode/default/patch/rapid updates；
- AgentGateway group provenance、policy filter与call deny；
- PiAdapter/inline Extension registry、all/active、additive activation、call forwarding；
- startup/reload/resume/fork/shutdown与old-instance fence；
- builtin/custom/inline/Extension collision conformance；
- `mcpInjection` representative Codex/Claude/ACP/OpenCode configs；
- External settings default scope与runtime unavailable；
- External backend owner-only/loopback/credential regressions；
- negative static scan确保无第三方MCP Settings/config/secret/manager入口。

测试断言语义，不用snapshot冒充。security test必须真正call。Provider wire必须来自exact runtime/endpoint，不从模型名推断。

## 17. 明确拒绝的过拟合

1. Third-party MCP Settings / Capability Center / Integration Registry；
2. 跨Engine MCP配置同步器；
3. Host-owned MCP server DB或预留schema；
4. 把全部Host tools产品化为MCP；
5. 用第三方adapter回连自家AgentGateway；
6. 每工具permission矩阵；
7. tools×engines大表；
8. embedding/vector/BM25/remote tool catalog；
9. Pi core fork；
10. future MCP health monitor；
11. Skills、third-party MCP、Host tools统一大页；
12. global callable loader、第二active store或Tool Search设置页。

## 18. Rollback、stop-loss 与复验

### 18.1 Rollback

- External改名可独立回退文案，不改protocol/DB；
- Built-in policy失败可删除新增setting/UI并回到全启用projection，canonical catalog不变；
- OmniMind dynamic实现故障可临时退回现有eager `customTools`，不影响all-agent Built-in policy、stock Pi或其他Engine。

第三条只是临时代码止损，不是等价最终终态。无持久feature flag、双轨authority或数据迁移。

### 18.2 Stop-loss

若实现需要Pi core fork、第二registry/active/config/permission store、全局search、接管其他Extension、silent collision、按模型名硬编码wire、第三方MCP manager、context catalog dump或削弱credential/turn/cancel边界，立即停止并报告blocker/upstream seam；不扩张系统，也不把eager重新宣布为目标。

### 18.3 Revalidation triggers

- bundled Pi AgentSession/Extension/wire变化；
- AgentGateway catalog/listChanged/policy变化；
- Provider native MCP/dynamic refresh/permission seam变化；
- `omnimind_update_tasks` 的 Agent-only 注入、immutable task policy、initially/always-active 状态或 `turn.tasks.updated` 投影变化，或新增 OmniMind-exclusive、非 Gateway custom session tool；
- 新真实capability group；
- 用户证据证明group粒度不足；
- 明确第三方MCP用户结果触发§10.4；
- External从loopback扩展到remote/public；
- Settings母体、secret store、sandbox或packaged topology变化。

## 19. 当前决定与已证实的非 Gateway 常驻边界

### 已确定

- 使用§3中英文菜单；
- `External connections / 外部连接`，不用`External agents`；
- Coding含Agent skills与Built-in tools，不含第三方MCP Settings；
- fresh Built-in tools默认全部开放；
- 一套policy覆盖所有Agent，包括OmniMind Agent；
- 无Engine selector或Provider维度持久状态；
- 只有canonical `provider === "omnimind"`使用Pi-native Dynamic Tool Loading；
- stock Pi与其他Engine保持direct/eager；
- 所有Gateway Host tools初始inactive，不默认预留Host core；
- Pi拥有Registry/active/wire，AgentGateway拥有execution/authority；
- 第三方MCP Settings、CRUD、credential、状态、自动分发与统一搜索退出首版。

### 当前已证实

- `omnimind_update_tasks` 是唯一 OmniMind-exclusive、非 AgentGateway custom session tool；
- 它由 PiAdapter/Session owner只为 `omnimind` Agent work surface注入，并因首轮immutable task policy与canonical `turn.tasks.updated` progress lifecycle保持initially/always active；
- 它不进入Host Extension、Host core或Built-in group policy；
- supervised `bash`、Pi built-ins及Package/Extension tools继续由各自owner常驻或管理active状态；Host initial deactivation不得误伤；
- 当前没有第二个同类工具，也没有剩余实现分叉。未来只有这条注入/prompt/event lifecycle变化或新增同类工具时才重开逐项owner审查，不预留Host core或通用session-tool抽象。

## 20. 最终判断

这套方案尊重Pi，不是因为把所有东西命名成Pi插件，而是让Pi Session真正拥有Tool Registry、all/active truth、Dynamic Tool Loading、reload与Provider wire；Host只用官方Extension seam注册自己拥有的Gateway tools，并在exact版本需要时提供最薄的extension-local loader。

这套方案尊重OmniMind产品，是因为用户只需理解“技能”“内置工具”“外部连接”，并能用一套默认开放的Built-in policy控制所有Agent；第三方MCP的长期责任不因协议存在就提前产品化。

最关键的不变量是：

> **一份AgentGateway catalog，一套all-agent Built-in policy；OmniMind Agent让Host tools进入Pi原生Dynamic Tool Loading，stock Pi和其他Engine保持direct/eager；首版不产品化第三方MCP；任何“关闭”都必须在真实执行路径成立。**
