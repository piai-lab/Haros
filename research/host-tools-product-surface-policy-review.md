# Host 工具三工作面策略、设置矩阵与长期维护边界

> 认知冻结日期：2026-08-22
>
> 原始源码基线：`main@9a99d5ccf5ca5fd8c2cf25528fe05f3ec6b05374`。三工作面前置工作已通过`5451e22ce8`进入main。
>
> **2026-08-22 implementation disposition：** 本文锁定的矩阵正在`codex/host-tools-product-surface-policy`实现：pure policy、v4 override migration/atomic snapshot、Gateway read/list/call、Goal/Automation admission与Web三列表格已形成source candidate。exact pushed SHA、packaged journey、main merge与安装证据尚待最终门禁，状态只看`execution-brief.md`和Campaign；下文“当前源码仍是旧全局开关”只描述上述原始基线，不是当前分支事实。
>
> 文档角色：记录本轮从当前调用链、三工作面裁决、Settings UI 候选和长期维护审查得出的完整认知，使新会话可以零记忆恢复方案。稳定 UI 与运行时合同在实施时仍须分别进入 [`architecture/workbench.md`](../architecture/workbench.md) 与 [`architecture/execution.md`](../architecture/execution.md)；当前施工状态只由 [`execution-brief.md`](../execution-brief.md) 拥有。
>
> 相关现状证据：六组 Host catalog、当前全局 Settings、Engine projection、availability、旧 Session 与 call-time authority 继续由 [`agent-tools-mcp-settings-review.md`](agent-tools-mcp-settings-review.md) 拥有；Chat/Agent/Studio 产品面、Provider trust 与 Chat→Agent 边界见 [`chat-work-surface-contract-review.md`](chat-work-surface-contract-review.md)。

## 0. 一句话结论

OmniMind 应把六个 Host 工具组投影成一张 **工具组 × Agent/Chat/Studio** 的设置矩阵；但它不是十八个彼此独立的权限真相。最终 exposure 只能由一个纯策略 owner 统一计算：

```text
产品是否支持该工作面
× 用户是否启用
× 当前运行时是否可用
× 当前 Session 是否真实投影成功
× 本次 tools/call 是否通过实时 authority
= 当前 Engine 能否真正调用
```

Chat 不再被永久焊死为 Browser-only。Goals 与 Automations 在 Chat 中真实支持但默认关闭，用户可以明确开启；Tasks 与 Diagnostics 仍因跨 Thread 编排、内部执行证据与信任边界不适合 Chat 而保持不支持。Agent 与 Studio 继承当前 Host 面，Device 三面均支持但默认关闭。

本轮不建立 SDK、动态规则引擎、per-Engine allowlist、全局总开关叠加 surface override、逐 Tool 权限矩阵或跨 Engine 热重载控制面。

## 1. 用户需求、结果与产品 taste

### 1.1 Demand

- 设置页对六个现有 Host 工具组分别提供 Agent、Chat、Studio 三个工作面控制。
- Chat 可以使用未来适合它的 Host 工具；不是因为当前只开放 Browser 就永久成为 Browser-only。
- Chat 中可以使用 Goal，Automation 也可以按需开启；默认保持克制，不因能力存在而主动变重。
- Settings 仍然简单、可理解，不能为了“高级”变成权限管理后台。
- 面向未来开发：新增 Tool、Host group、Engine 或产品工作面时，从一个 canonical policy 自然继承，不在 Web、Gateway 和 adapter 多处补条件。

### 1.2 Effect

用户应直接看到：

- 一张六行三列的矩阵；
- 每个单元格准确区分“此工作面不支持”“用户关闭”“当前运行时不可用”；
- Chat 的 Goals/Automations 默认关闭，但打开后能在真实 Session 生命周期允许时使用；
- 关闭某组对所有旧 Session 的新调用立即生效；
- 重新启用后在新 Session 或既有安全 reload seam 中出现，不伪造旧 Session 已动态获得 schema；
- 不同 Engine 对相同 Thread/ProductSurface 得到相同 Desired Host Surface，差异只来自真实 projection、collision 或 runtime availability。

### 1.3 Philosophy

- 一个事实一个 owner。
- 产品工作面、Provider 执行/信任面、用户 intent、runtime availability、Session projection 和 call authority 必须分开。
- 简单不是把规则藏进特判；简单是把规则集中成一个可穷举、可测试的矩阵。
- 模块化只用于删除重复判断、缩小变更半径和形成窄稳定契约，不创建新 package、SDK、Manager 或 Registry。
- UI 只投影事实，不成为权限 owner。
- Provider identity 只决定如何投影，不决定长期 Host 权限等级。
- 未来可能性不能制造当前没有消费者的动态控制面。

### 1.4 Open decisions

`none`。支持矩阵、默认值、UI 方向、Session 时效和明确非目标均已由维护者确认。

## 2. 当前源码事实：已存在、部分存在、缺失

### 2.1 已存在

当前 contracts 已定义六个固定 `BuiltInToolGroupId`：

```text
tasks
diagnostics
goals
automations
browser
device
```

当前唯一 Host catalog 与执行 owner 是 AgentGateway：

- `packages/contracts/src/agentTools.ts`：六组 ID 和 Settings/UI DTO；
- `apps/server/src/agentGateway/Layers/AgentGateway.ts`：catalog 组装、Settings/availability 投影和执行入口；
- `apps/server/src/agentGateway/toolCatalog.ts`：当前 enablement 与 project-kind filter；
- `apps/server/src/agentGateway/harnessPolicy.ts`：Session-scoped Host guidance；
- `apps/server/src/serverSettings.ts`：revisioned settings、raw migration、quarantine 与原子写；
- `apps/web/src/components/settings/BuiltInToolsSettingsPanel.tsx`：当前 Settings 投影和串行 mutation queue。

`packages/shared/src/productSurface.ts` 已拥有非持久化产品工作面映射：

```text
Project.kind=project → ProductSurface=agent
Project.kind=chat    → ProductSurface=chat
Project.kind=studio  → ProductSurface=studio
```

Provider execution/trust 仍是两值：

```text
Agent ProductSurface       → agent ProviderWorkSurface
Chat ProductSurface        → chat ProviderWorkSurface
Studio ProductSurface      → chat ProviderWorkSurface
```

Studio 共享 Chat 的无 Project trust，不等于 Studio 与 Chat 是同一个产品工作面，也不意味着两者必须得到相同 Host policy。

### 2.2 当前真实行为

Settings 目前只保存：

```ts
agentTools: {
  disabledBuiltInGroups: string[]
}
```

`apps/server/src/agentGateway/toolCatalog.ts` 先按全局 setting 与 availability 过滤，再追加：

```text
ProductSurface === chat
  → 只保留 Browser
其他 ProductSurface
  → 保留全局 enabled + available 集合
```

因此当前实际语义是：

- Agent：全局启用且可用的六组；
- Chat：Browser-only；
- Studio：全局启用且可用的六组；
- Settings 页面：每组只有一个“对所有 Agent”开关；
- `BuiltInToolGroup` 同时带 `enabled/effective`，把 catalog metadata 与某次 settings projection 混在一个 DTO 中。

### 2.3 当前 Session 生命周期

Host guidance 不是每 turn 动态注入。`takeOmniMindHarnessPolicyForSession` 对一个 Provider Session 只交付一次；OmniMind Pi Host Projection Extension 在 initial load 或 native ResourceLoader reload 时重新读取 descriptors。

当前稳定语义：

- disable：旧 Session 可能仍显示 stale schema，但所有新 `tools/call` 必须按最新 setting 实时拒绝；
- re-enable：只有新 Session 或真实 adapter/native reload 后才会注册/投影；
- 已 admitted in-flight call 不因普通 toggle 被伪取消；
- cancel、timeout、turn settlement 继续归原 owner。

所以本方案不能对用户承诺“打开开关后，所有正在运行的 Engine 立即看到新工具”。

### 2.4 缺失

- 没有三工作面 Host 支持/default matrix；
- 没有 per-surface 用户 intent；
- Chat admission 仍是 `tool.group === "browser"` 的硬编码特判；
- Settings UI 无法表达 Chat Goal/Automation opt-in；
- 现有 DTO 的 `enabled/effective` 只有单一全局视角；
- 当前 canonical Architecture 与 execution brief 仍准确描述 Browser-only 现状，实施时必须同关注点更新，不能只改代码或只改 research。

## 3. 先分清三类工具，避免 Settings 越权

本方案只控制 **AgentGateway Host 工具**。

它不控制：

- Pi/OmniMind Agent native `read/bash/edit/write/grep/find/ls`；
- Todo Session Extension；
- 用户、团队或 Project-local Pi Extensions；
- Skills、Prompts、Packages；
- Engine-native shell、文件、sandbox、approval 或 private tool registry；
- Browser/Device 的人类 UI；
- External connections 与 third-party MCP server 生命周期。

准确关系：

```text
Host 设置矩阵
  └─ 只控制 AgentGateway catalog 的 Desired Host Surface

Engine-native tools / Pi Extensions / Todo
  └─ 各自保留原生 owner、trust、Session 与 lifecycle
```

所以“Chat 默认只读意图”不能通过 Host 设置页伪装成 OS 沙箱；Engine-native 剑继续存在，外部引用只是不升级为 cwd/Project/trust root。

## 4. 已锁定的支持与默认矩阵

| Host 工具组 | Agent            | Chat             | Studio           | 裁决依据                                                                                                                                         |
| ----------- | ---------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tasks       | 支持，默认开     | **不支持**       | 支持，默认开     | Tasks 包含跨 Project/Thread 发现、创建、驱动、中断、归档等编排；Chat 开放会绕过显式 Send to Agent 与 Project boundary。Studio 保留当前 Host 面。 |
| Diagnostics | 支持，默认开     | **不支持**       | 支持，默认开     | Durable/runtime events、forensic snapshot 与执行诊断属于执行空间；Chat 不应默认取得内部执行证据面。Studio 保留当前行为。                         |
| Goals       | 支持，默认开     | 支持，**默认关** | 支持，默认开     | Chat Thread 也可以有持久目标；用户明确想在 Chat 使用时应允许，不要求先转 Agent。默认关闭保持通用对话轻量。                                       |
| Automations | 支持，默认开     | 支持，**默认关** | 支持，默认开     | Chat 可以按用户明确意图创建或管理自动化，但不应因普通对话默认得到常驻 Automation 面。                                                            |
| Browser     | 支持，默认开     | 支持，默认开     | 支持，默认开     | 当前 Chat 的核心 Host 能力；三面共享 thread-scoped integrated Browser。                                                                          |
| Device      | 支持，**默认关** | 支持，**默认关** | 支持，**默认关** | 高条件、平台相关、availability 复杂；支持不等于默认暴露，更不等于 12/12 executable closure。                                                     |

两个必须长期保留的区分：

```text
Chat / Goals = supported + default off
Chat / Tasks = unsupported
```

前者用户可打开；后者设置再怎样篡改也不能暴露。

## 5. 最终 exposure 的五层事实

### 5.1 支持策略

由产品策略决定某个 group 是否适用于某个 ProductSurface。这是稳定产品事实，不是用户偏好。

### 5.2 默认值

只在用户没有明确选择时生效。默认值与支持策略在同一穷举矩阵中声明，但语义不同。

### 5.3 用户 intent

只保存用户明确修改过的 supported cell，不保存 runtime 状态，不写入 Engine Session。

### 5.4 Runtime availability 与 projection

AgentGateway/service/platform 决定当前 entry 是否 available；Engine adapter 决定本 Session 是否真实安装 descriptors。它们是短时派生事实，不写回 Settings。

### 5.5 Call-time authority

每次真实 `tools/call` 继续独立复验：

```text
provider-session identity
→ exact active turn
→ current ProductSurface support
→ latest user intent/default
→ current availability
→ capability/scope/runtime mode/approval
→ handler
```

`registered != active != exposed != available != authorized != executed` 继续成立。

## 6. 唯一架构主线

```text
Composer/Thread
  → authoritative Thread → Project.kind
  → pure ProductSurface mapping

ServerSettings user overrides ─┐
Host support/default matrix ───┼→ pure exposure resolver
AgentGateway availability ─────┤
canonical Host catalog ────────┘

pure exposure resolver
  ├→ Settings read projection
  ├→ initialize / tools/list
  ├→ Session descriptor + Host guidance projection
  └→ every tools/call live admission
```

### 6.1 Contracts owner

Contracts 只拥有：

- `BuiltInToolGroupId`；
- `ProductSurface` 可跨边界使用的值合同（如现有依赖方向需要）；
- Settings override 数据形状；
- Settings read projection DTO。

Contracts 不拥有数据库读取、Project lookup、adapter、availability 或 UI copy。

### 6.2 纯 Host surface policy owner

在现有 shared 责任内增加一个窄纯模块，唯一拥有：

- 六组 × 三工作面的 `supported`；
- supported cell 的 `defaultEnabled`；
- `support × override/default × availability` 的纯解析。

推荐形状：

```ts
type HostGroupSurfacePolicy = {
  readonly supported: boolean;
  readonly defaultEnabled: boolean;
};

const HOST_GROUP_SURFACE_POLICY = {
  tasks: {
    agent: { supported: true, defaultEnabled: true },
    chat: { supported: false, defaultEnabled: false },
    studio: { supported: true, defaultEnabled: true },
  },
  // ...其余五组，必须 exhaustive
} satisfies Record<BuiltInToolGroupId, Record<ProductSurface, HostGroupSurfacePolicy>>;
```

该模块只能接受普通值，不能：

- 查 Thread/Project/数据库；
- 读 Settings 文件；
- 调 Provider；
- 维护 cache、watcher 或 registry；
- 注册工具；
- 生成用户文案。

它是 pure mapping，不是万能 resolver、SDK 或 platform。

### 6.3 ServerSettings owner

继续唯一拥有用户 intent、revision、normalize、raw migration、quarantine、原子写和并发更新。

### 6.4 AgentGateway owner

继续唯一拥有 catalog、availability、projection input、call-time authority 和 handler。所有 Engine 只投影同一 filtered catalog，不拥有 surface policy。

### 6.5 Web owner

Web 只渲染 server projection、收集用户操作和提交完整 next intent；不复制支持矩阵、默认值、availability 算法或 exposure 规则。

## 7. Settings 数据模型：保存“明确选择”，不复制三份禁用列表

不采用：

```ts
disabledBuiltInGroupsBySurface: {
  agent: string[];
  chat: string[];
  studio: string[];
}
```

原因：新增 group 时，“不在 disabled list”会被误解为 enabled；每次新增默认关闭的 group 都需要迁移已有用户，并容易把缺失字段与明确选择混在一起。

最终使用有界、partial、显式 boolean override：

```ts
agentTools: {
  builtInGroupOverrides: {
    agent?: Record<string, boolean>;
    chat?: Record<string, boolean>;
    studio?: Record<string, boolean>;
  }
}
```

精确语义：

- cell 不存在：采用 canonical default；
- cell 存在：这是用户明确选择，未来 default 改变也不覆盖；
- 用户切换某格：写入显式 `true/false`；
- “恢复推荐默认”：删除全部 known overrides，而不是复制当前 default；
- unsupported cell：永远不接受用户 mutation，resolver 也无条件 false；
- unknown bounded group key：可有界 round-trip，但当前版本无运行效果；即使值为 true 也不能绕过 policy；
- normalize 限制 surface、key 长度、key 数量和 boolean 类型，拒绝无界对象。

这使未来演进自然成立：

```text
新增第七组
→ 在唯一 policy 声明三面的支持/default
→ 老用户没有该 cell override，自动采用新 default
→ 无需为“字段缺失”建立新迁移平台
```

如果用户曾明确操作该 cell，则保留 boolean override；点击恢复默认才删除。

## 8. 一次性迁移

迁移必须在 schema decoding default 抹掉 raw 字段存在性前完成，复用现有 settings 文件存在事实、envelope `migrationVersion`、revision 和原子写，不新增 marker/store。

从当前一维 `disabledBuiltInGroups` 升级：

| 目标 cell                         | 迁移语义                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Agent supported groups            | 保留旧全局有效状态；只有与新 default 不同的已证明状态才写 override。                   |
| Studio supported groups           | 保留旧全局有效状态，避免把当前 Studio Host 面静默改变。                                |
| Chat / Browser                    | 当前 Chat 已真实支持，保留旧 Browser 的全局 enabled/disabled intent。                  |
| Chat / Goals、Automations、Device | 当前 Chat 没有这些能力，旧全局开关不能证明 Chat intent；采用本轮锁定的新 default off。 |
| Chat / Tasks、Diagnostics         | unsupported，不创建可启用 override。                                                   |
| unknown legacy disabled IDs       | 有界保留为 fail-closed unknown false intent，当前版本不产生 exposure。                 |
| corrupt snapshot                  | 继续 quarantine/diagnostic + safe defaults；不得称为 fresh 或“保留用户选择”。          |

迁移成功后：

- 当前格式成为唯一 authority；
- 退休旧 `disabledBuiltInGroups`；
- 不保留永久双读、alias 或 compat fallback；
- 原子写失败时不得先在内存宣称升级成功；
- 并发 startup 仍只完成一次 migration，revision 单调。

fresh profile：

- 内存采用 policy defaults；
- 不因单纯启动 ambient write；
- 用户第一次修改时才持久化对应 override。

## 9. Settings read projection

Settings UI 不应自己导入 policy。Server 的 built-in groups read model 对每组返回 catalog/runtime facts与三面投影：

```ts
type BuiltInToolGroupSurfaceView = {
  supported: boolean;
  defaultEnabled: boolean;
  configuredEnabled: boolean;
  effective: boolean;
};

type BuiltInToolGroupView = {
  id: BuiltInToolGroupId;
  toolCount: number;
  availableToolCount: number;
  availability: "available" | "degraded" | "unavailable";
  surfaces: Record<ProductSurface, BuiltInToolGroupSurfaceView>;
};
```

`configuredEnabled` 是 Settings + default 的 server projection，不是第二 authority；`effective` 只是 `supported && configuredEnabled && availableToolCount > 0` 的展示值。真正 call admission仍实时计算。

若现有 Settings query 与 group query 同时保留，必须以 ServerSettings revision/generation 防止旧 group response 覆盖新 mutation；更简单的目标是让 group RPC成为这张页面的完整 read model，Web 不再用两份异步 truth自行重算 policy。

## 10. Session projection 与时效

### 10.1 Disable

```text
保存 false override
→ 新 Desired Host Surface 立即排除该组
→ 所有旧 Session 的新 tools/call 立即被 Gateway deny
→ 旧 schema 可以暂时可见，但不再可执行
→ 已 admitted in-flight 不被普通 toggle 伪取消
```

### 10.2 Re-enable

```text
保存 true override
→ policy 已允许
→ availability 成立
→ 新 Session 或真实 native reload 重新读取 descriptors
→ projection 成功后才进入 Delivered Host Surface
```

不允许为了 Settings 的“即时感”新建：

- 跨 Provider hot-reload bus；
- Session 强制重建器；
- per-turn schema injection；
- mutable descriptor store；
- 第二 capability cache。

普通 UI 应准确说明：

> 关闭会立即生效。重新启用的工具会在新会话或重新加载后提供。

如果未来某个 adapter 原生支持安全 reload，可复用该 seam；不能因此承诺所有 Engine 同步热更新。

### 10.3 Host guidance

Host guidance 必须只描述当前 Session 实际投影成功的 descriptors。当前 Session-scoped delivery guard 保留；本轮不把 Host guidance 扩成 per-turn mutable Prompt 工程。

Settings 改变后：

- call-time authority 立即使用新 policy；
- 新 Session/reload 使用新的 enabled groups guidance；
- stale guidance 不授予权限；
- projection/collision 失败的 group 不进入 Delivered guidance。

## 11. 跨 Engine 一致性

所有正式支持 Engine 使用同一 Desired Host Surface：

```text
canonical catalog
∩ ProductSurface support
∩ configured setting/default
∩ runtime availability
```

Delivered Host Surface再与该 Engine 本 Session 的真实投影成功集合相交。

Engine 差异只允许来自：

- native MCP/plugin/Extension 投影机制；
- collision；
- projection failure；
- Engine 原生 Session reload 能力；
- Engine-native tools 与 approval/sandbox。

禁止：

- Codex/Claude/Pi/OpenCode 各维护一份 surface allowlist；
- ProviderKind 决定 Host 等级；
- Web 为某个 Engine 单独隐藏开关；
- adapter 在 policy 外偷偷补回被 surface 禁止的 group。

## 12. 已批准的 Settings UI

审批级 decision-candidate：

- HTML：`/Users/liuzaoqu/.codex/visualizations/2026/08/22/01a02710-bb8d-7b51-aca5-fade889d075c/index.html`
- Desktop screenshot：`/Users/liuzaoqu/.codex/visualizations/2026/08/22/01a02710-bb8d-7b51-aca5-fade889d075c/settings-tools-occam-desktop.png`
- 已检查：1100px、815px、390px；无横向溢出、控制台错误，键盘可操作。

该 artifact 是视觉/交互基准，不是数据语义 owner。原型中 Studio / Tasks 与 Studio / Diagnostics 被画成“不可用”，与本轮最终裁决和当前 Studio Host 面冲突；正式实现必须纠正为支持且默认开启，不得照抄错误 fixture。

### 12.1 页面结构

```text
内置工具                                      恢复推荐默认
选择每类 Host 工具可以在哪些工作面使用……

工具组                         Agent     Chat     Studio
Tasks                            on       locked     on
Diagnostics                      on       locked     on
Goals                            on       off        on
Automations                      on       off        on
Browser                          on       on         on
Device                           off      off        off
```

只保留一个 panel，不新增 overview card、inspector、filter、capability mixer、权限模式选择器或全局 master switch。

### 12.2 复用裁决

生产实现直接复用当前产品的：

- `SettingsSection`；
- `SettingsRow` 或其同角色布局 primitive；
- `Switch`；
- Disclosure/Chevron；
- Toast；
- focus、keyboard、motion 与 i18n owner。

只新增产品特有的三列组合与状态投影；不创建新的 Settings component family，不引入第三方 dependency。

### 12.3 单元格状态语言

必须明确区分：

| 状态                                            | 控件                             | 普通文案                               |
| ----------------------------------------------- | -------------------------------- | -------------------------------------- |
| supported + configured on + available           | on switch                        | 已开启                                 |
| supported + configured off                      | off switch                       | 已关闭                                 |
| supported + configured on + runtime unavailable | on switch仍可修改                | 已开启，当前不可用                     |
| supported + configured on + degraded            | on switch                        | 已开启，部分工具当前可用               |
| unsupported                                     | locked/non-interactive           | 此工作面不可用                         |
| mutation pending                                | 保持最新 intent，必要时局部 busy | 正在保存，不锁整页                     |
| mutation failed                                 | 回读 server truth                | 一次 Toast，不重复 banner/inline error |

“当前不可用”不能清除用户 intent。服务恢复后，在真实 Session lifecycle允许时重新 effective。

### 12.4 行信息

每行只显示：

- group 名称；
- 一句普通职责描述；
- canonical catalog 动态工具数量；
- Agent/Chat/Studio 三个格子；
- 可选的现有 Disclosure，展开一句用途/默认原因。

不在首屏列出几十个工具名，不把内部 adapter、MCP transport、ProductSurface、authority 等术语暴露给普通用户。

### 12.5 Reset

“恢复推荐默认”只删除 known user overrides：

- 没有 override 时 disabled；
- 点击后可撤销与否继续服从现有 Settings mutation/Toast 习惯，不为此建 history；
- 不把 runtime unavailable 写成 default；
- 不把当前默认值物化成十八个 boolean；
- unknown bounded keys按兼容策略保留或由 server normalization精确处理，Web 不自行删除。

### 12.6 响应式与可访问性

- Desktop：工具信息列 + 三个窄而等宽的 surface 列；
- 窄屏：第一行名称/描述/数量，第二行三等分 surface controls；
- 不能把三列压成不可读的十八个无标签 switch；
- 每个 switch 的 accessible name 必须包含 group + surface；
- locked cell 需要可读原因，不能只靠灰色和锁 icon；
- keyboard 顺序按行、再 Agent→Chat→Studio；
- focus ring 使用既有 token；
- reduced motion 保留状态变化但去除非必要过渡；
- 中英文 catalog key/value parity，并检查真实 390px 中文长度。

## 13. 并发、失败与恢复

保留当前 `BuiltInToolsSettingsPanel` 的串行 mutation/generation fence 思路，但状态从单数组变成完整 next override map：

```text
用户快速切换多个 cell
→ 本地展示最新 intent
→ mutation queue按顺序提交
→ stale response不能覆盖更新一代
→ 失败后invalidate Settings + group projection
→ 只有当前 generation显示一次错误Toast
```

要求：

- 一个 cell 失败不伪造其他已成功 cell 回滚；
- unsupported cell 不产生 RPC；
- Server 原子校验整个 next map，避免 partial merge 歧义；
- availability 在 mutation期间变化时，以 Server 最终 read projection 为准；
- settings revision与 UI generation不得形成第二持久状态；
- App 重开只从 ServerSettings恢复，不从 Web draft/local storage重建矩阵。

## 14. 性能与维护成本

当前规模是 6 groups、18 cells、最多约 58 个 Host catalog entries。正确实现只需要：

- 每次 read projection 对 catalog 做一次有界线性聚合；
- 每个 tools/list/session projection 对当前 ProductSurface 做一次过滤；
- 每个 tools/call 对目标 group做常数级 policy lookup；
- Project.kind 在现有 authoritative request/session scope解析，不逐 cell查 DB。

不需要：

- watcher；
- per-surface catalog copy；
- materialized capability snapshot；
- settings cache；
- background sync；
- rules engine；
- dynamic registry。

### 14.1 新增 Tool

Tool 加入语义一致的现有 group后自动继承三面 policy。若该 Tool 与 group 其他成员拥有不同信任边界，不得藏一个 per-tool exception；应证明是否需要拆成新的、用户可理解的 coherent group。

### 14.2 新增 Group

新增 group 时，exhaustive matrix强制一次性提供：

- 三面的 supported/default；
- 中英文名称、描述、状态文案；
- catalog counts/availability；
- 18-cell等价测试中的新增行；
- Settings UI行。

未声明的 group fail closed。新增 group不需要修改每个 Engine adapter。

### 14.3 新增 Engine

新 Engine只接入现有 AgentGateway filtered descriptors 与 call bridge；不复制 surface policy。若该 Engine 无安全、thread-scoped projection seam，准确标为 Host unavailable，不通过降低其他 Engine policy 来求视觉一致。

### 14.4 新增 ProductSurface

只有真实第四工作面出现时，才扩 `ProductSurface` 与 exhaustive policy matrix。ProviderWorkSurface是否扩展是独立 trust/API裁决，不能因为 Settings多一列就自动扩公共 Provider mode。

## 15. 验证矩阵

### 15.1 Pure policy

- 六组 × 三面共18个 `supported/defaultEnabled`；
- override absent、true、false；
- unsupported + malicious true仍false；
- available/degraded/unavailable；
- unknown group fail closed；
- exhaustive compile-time coverage。

### 15.2 Settings 与 migration

- no-file fresh不ambient write；
- current global Agent/Studio intent保留；
- Chat Browser intent保留；
- Chat Goals/Automations/Device采用新default off；
- unknown disabled ID有界保留、无运行效果；
- corrupt quarantine；
- migration atomic write failure；
- concurrent start/revision；
- Reset删除known overrides；
- rapid cross-cell toggles、stale response、failure rollback。

### 15.3 Gateway 与 Session

- Agent/Chat/Studio Desired Host Surface；
- Chat Goal/Automation opt-in成功；
- Chat Tasks/Diagnostics在UI、tools/list与tools/call三层均不能绕过；
- Device supported但default off；
- disable后旧 Session stale schema call即时deny；
- re-enable只在new Session/native reload投影；
- in-flight不伪取消；
- Host guidance只含Delivered groups；
- projection collision/failure局部degrade；
- initialize/list/call使用同一 policy resolver。

### 15.4 跨 Engine

- OmniMind Agent、stock Pi及一个非Pi代表Engine对同一ProductSurface得到相同Desired Host Surface；
- projection差异准确显示，不形成永久Provider等级；
- Engine-native tools、Todo、Skills/Extensions不受本设置误控；
- 不建立全Engine排列平台。

### 15.5 UI

- 1100px、815px、390px；
- 简中/英文；
- default、modified、unsupported、unavailable、degraded、pending、error；
- keyboard、visible focus、screen reader name、reduced motion；
- 无横向溢出、无console error；
- Studio Tasks/Diagnostics正式fixture为supported/on，不复制原型错误语义；
- Reset状态和一次Toast。

### 15.6 真实交付

改变Desktop可观察行为后：

1. focused tests、相关typecheck/lint/source build；
2. 同步最新main并重跑受影响gate；
3. 按关注点commit/push任务分支，确认exact remote SHA；
4. 只从exact pushed SHA构建Desktop/DMG；
5. 停止现有OmniMind实例，使用任务专用userData/home/Provider private home启动；
6. 验证三面矩阵、Chat Goal/Automation、关闭/重开与旧Session deny；
7. 资源匹配时用Xiaomi MiMo与DeepSeek做最小代表性证伪；
8. packaged问题必须新commit/push并从新SHA重做受影响gate；
9. 合并main、post-merge gate/push、clean/no-unpushed后才清理任务分支/worktree。

## 16. Canonical 文档闭环

实施不能只改 research。与代码同一关注点更新：

- `architecture/execution.md`：从“一套global Built-in policy + Chat narrow special-case”改为三ProductSurface纯policy、per-surface override、Session/call-time时效；
- `architecture/workbench.md`：Settings六行三列UI、状态语义、Reset、响应式和i18n；
- `execution-brief.md`：当前切片、真实阻塞和交付证据；
- `research/agent-tools-mcp-settings-review.md`：绑定新source snapshot，更新current settings/runtime evidence；
- 本文：实施后在顶部增加supersession/current-code disposition，但不得倒改本轮“尚未实施”的历史事实。

根 README只有当该变化改变宪法级产品边界时才更新；本轮不应为了显得完整复制设置细节。

## 17. 明确拒绝

- 一份全局 master switch再叠三面override；
- 每个Tool一个开关；
- 每个Engine一套Host设置；
- Chat Browser-only硬编码继续作为第二policy；
- ProviderKind决定Host等级；
- ProductSurface持久化进Session/DB；
- 把Studio映射成Chat ProductSurface；
- 动态权限规则编辑器；
- Host capability SDK/Manager/Registry；
- per-surface catalog副本；
- 第二Settings store/cache；
- 跨Engine hot-reload bus；
- per-turn schema removal/injection controller；
- 把availability写回用户设置；
- permanent legacy双读/alias；
- 为未来group建立migration platform；
- 用UI灰态代替Server/Gateway authority；
- 用多Engine全排列测试复制生产语义。

## 18. Stop-loss

实施中出现以下任一项，停止扩张并返回 `SIMPLIFY`：

- Web、Settings schema和Gateway各自拥有一份支持/default矩阵；
- policy module开始查Thread、DB、Provider或维护cache；
- 为了立即enable给所有Engine建立新Session控制面；
- unsupported cell可以被persisted true绕过；
- Studio因ProviderWorkSurface=chat而误用Chat Host policy；
- Tool group内部出现隐藏per-tool surface例外且没有重新审视group语义；
- migration演化成永久双格式；
- Settings UI需要新component family、权限模式或overview dashboard；
- 测试要求生产增加第二capability snapshot或debug contract；
- research候选被描述成当前已交付事实。

## 19. 最终裁决

```text
Demand:
六个Host组按Agent/Chat/Studio管理；Chat可按需开启Goal与Automation。

Effect:
Settings简单明确；所有Engine共享同一Desired Host Surface；
新增Tool/Group/Engine不扩散条件判断。

Philosophy:
一个事实一个owner；工作面、设置、availability、projection、call authority分层；
克制默认不等于永久拆掉能力。

Open decisions:
none

Current truth:
全局disabled list + Chat Browser-only特判 + Session-scoped guidance + live call deny。

Smallest path:
一个pure exhaustive policy、一份per-surface explicit override、
一个Gateway resolver、一张六行三列表格。

Excess rejected:
SDK、Registry、rules engine、per-Engine policy、master+override、
逐Tool矩阵、热重载控制面、第二cache与永久兼容双轨。

Decision:
GO；但只能在当前三工作面任务完成并同步latest main后进入生产实施。
```
