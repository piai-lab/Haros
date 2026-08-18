# Pi-native Host 工具动态加载、投影与生态所有权复核

> 证据日期：2026-08-18
> OmniMind 源码复核基线：原始调用链锁定于 `a24653bc7b00f9632275f2960776c31c68d61968`；文档候选在独立分支 `codex/review-pi-host-tool-mcp-settings` 上跟进至 `d4be738c6c8bbabab897848fddde2130e3971733` 后修正
> Bundled Pi 基线：`@earendil-works/pi-coding-agent@0.84.2`，upstream exact commit `914cf1472e715297caa30db4b9535d534a9eb718`
> 维护者裁决：OmniMind Agent 的 AgentGateway Host tools 必须进入 Pi 原生 Extension、Tool Registry 与 Dynamic Tool Loading 生命周期；dynamic 是目标架构，不再与 eager 共同参与产品方向表决
> 文档角色：Gate A exact-source 证据、已确认架构的实现约束与未来 Gate B 参考；不取代 `architecture/`、`execution-brief.md`、代码或 Campaign 状态

## 0. 本文回答什么

第一目标不是建立一个 OmniMind 自有的工具搜索系统，而是：

> 让 OmniMind Agent 在保留全部可用 Host 能力的同时，不在首轮上下文中承受几十个完整 schema，减少工具选择注意力噪声，并把 registered/all/active、reload 与 Provider wire 语义留给 Pi 原生 owner。

Owner、权限、MCP、reload、collision 与 prompt 都是保证这个用户结果不失控的冰山，不是新的产品能力。

从零重开时按以下顺序读取：

1. [`README.md`](../README.md)；
2. [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)；
3. [`architecture/README.md`](../architecture/README.md) 与 [`architecture/execution.md`](../architecture/execution.md)；
4. [`execution-brief.md`](../execution-brief.md) 与 active Campaign；
5. 本文锁定的 Pi artifact/source 与 OmniMind current symbols；
6. [`agent-tools-mcp-settings-review.md`](agent-tools-mcp-settings-review.md) 的 Settings 与 all-agent Built-in policy 边界。

若 Pi revision、AgentGateway topology、Provider SDK、Settings policy 或稳定 owner 改变，只重验受影响结论。

### 0.1 Gate A 摘要

```text
Workspace / branch / writer:
  /Users/liuzaoqu/Desktop/Develop/independent/OmniMind-wt-review-pi-host-tool-mcp-settings
  codex/review-pi-host-tool-mcp-settings
  one isolated writer; main workspace remains untouched

Exact source:
  Pi coding-agent 0.84.2 / upstream 914cf147...
  OmniMind AgentGateway + PiAdapter current integration path

Confirmed product result:
  provider === "omnimind" registers allowed Gateway tools as standard Pi Extension tools;
  all Gateway Host tools start inactive and load through Pi-native dynamic semantics;
  actual execution still returns to AgentGateway.

Non-goals:
  no global search subsystem, second registry, active store, ranking platform,
  third-party MCP manager, cross-Engine dynamic loading, Pi core fork or product settings.

Evidence maturity:
  Pi core/wire mechanics: artifact-verified + source-matched
  current eager OmniMind bridge: current-source-observed
  target integration: architecture-confirmed, implementation not yet product-journey-proven

Disposition:
  Bridge narrowly through Pi's existing Extension and AgentSession owners.
```

## 1. 结论先行

稳定架构只有三层：

1. **Pi 原生机制**：Tool Registry、registered/all/active truth、Dynamic Tool Loading、reload/session lifecycle、Provider-native deferred representation 与安全 fallback；
2. **Host 接入**：AgentGateway definitions 转成标准 Pi `ToolDefinition`，由一个 named、hidden、session-scoped inline Extension 注册；
3. **可替换细节**：若 exact runtime 没有可直接复用的 callable loader，Host Extension 内提供一个极薄、无持久状态的 extension-local loader，调用 `getAllTools()`、`getActiveTools()`、`setActiveTools()` 请求纯 additive activation。

因此：

- 只有 canonical `provider === "omnimind"` 使用这条 dynamic projection；
- stock Pi 继续通过现有 `customTools` direct/eager；
- Codex、Claude、OpenCode 等继续使用各自 native MCP/plugin seam direct/eager；
- 一套 fresh 默认开放的 Built-in policy 控制所有 Agent，包括 OmniMind Agent；
- 允许且可用的 AgentGateway Host tools 全部注册、初始全部 inactive，不凭感觉预留 Host core；
- Pi Registry 是 all/active truth，不另建 Host registry、active store、resume store 或索引；
- extension-local loader 不是稳定产品工具、不是 OmniMind 全局工具搜索，也不固定名称、ranking、limit 或算法；
- actual tool execution 始终进入 AgentGateway `tools/call`；
- `registered != active != authorized`。

动态加载是维护者已确定的目标。eager 仅保留为当前行为基线、测量 comparator 与实现故障时的临时代码 rollback。如果 exact Pi seam 无法满足目标，应报告 blocker 或 upstream seam 需求；不能把 eager 重新包装为等价终态。

## 2. Exact Pi 0.84.2：三层事实必须分开

### 2.1 Pi Core / AgentSession 原生拥有的事实

锁定 artifact/source 已验证：

- Extension 使用 `pi.registerTool()` 注册工具；
- Session 提供 `getAllTools()`、`getActiveTools()` 与 `setActiveTools()`；
- Pi 拥有 registered/all/active truth；
- Extension wrapper 比较 loader 执行前后的 active set；
- 只有纯 additive 变化会形成 `addedToolNames`；
- Session/ResourceLoader 拥有 startup、reload、resume、fork 与 shutdown 生命周期；
- Pi 根据新增 active definitions 选择 Provider-native deferred representation 或安全 fallback。

`dist/core/agent-session.js` 的关键反例是：启动构建 runtime 时会包含全部 Extension tools，Extension/custom tools 默认 active。Host Extension 因而必须在自己的 session lifecycle 中只移除自己注册的 Host tool names，同时保持 loader 与其他 owner 已有 active tools。绝不能用一个全局 reset 接管 Session。

`dist/core/extensions/wrapper.js` 识别的信号不是 loader 名称，而是：

```text
activeBefore → loader executes → activeAfter
no removals + one or more additions → addedToolNames
```

所以 Pi 不依赖某个 magic tool name，也不要求 Host 手写 Provider-specific reference。

### 2.2 Provider / wire 层原生拥有的事实

锁定 `@earendil-works/pi-ai@0.84.2` 已验证：

- OpenAI Responses completed client 处理 `tool_search_call` / `tool_search_output`，并处理 `additional_tools`；
- Anthropic Messages 处理 `tool_reference`；
- Kimi/OpenAI-compatible 路径存在已验证的 deferred handling；
- `supportsToolSearch` 表达 Provider wire compatibility，不表达“Session 已经注册一个全局 callable search tool”。

因此 native/fallback 必须由 exact Provider/model/endpoint 的真实 wire evidence 区分。DeepSeek、MiMo、OpenAI-compatible proxy 或其他渠道不能按模型名、品牌或 API 外形推断。未知就保持 unknown，并使用 Pi 的安全 fallback；Host 不模拟 Provider payload。

### 2.3 Exact source 没有的东西

Pi `0.84.2` 没有默认注册到每个 Session、自动搜索所有 Extensions 的 turnkey global callable search tool。

官方 `docs/extensions.md` 与 `examples/extensions/kimi-deferred-tools.ts` 中的 `search_tools` / `tool_search` 是 Extension 自己 `registerTool()` 的 pattern/example：searchable owned name set 与 metadata matching 由该 Extension实现，loader 调用 `setActiveTools()`，Pi只观察active set的纯additive变化并负责后续wire encoding。

准确表述是：

> Pi 原生拥有动态工具加载与 Provider tool-search wire 机制；exact `0.84.2` 的 callable loader 是 Extension-local pattern/example，而非默认全局产品工具。

“Pi 完全没有 Tool Search”和“Pi 已提供一个可直接调用的全局 Search Tool”都不准确。

## 3. 当前 OmniMind 调用链

### 3.1 AgentGateway 是唯一 Host capability owner

`apps/server/src/agentGateway/Layers/AgentGateway.ts` 的 `makeAgentGateway` 当前组装 Thread read/diagnostics/mutation、Automation、Browser，以及仅在平台与服务真实支持时加入的 Device tools。当前观察通常为 46 个工具、支持 Device 时最多 58 个；数字只是证据快照，不是稳定 API。

`apps/server/src/agentGateway/mcpTransport.ts` 继续拥有 `tools/list` canonical definitions、`tools/call` execution、session-bound bearer、required capability、exact active-turn write authority、token revoke、Provider replacement、timeout 与 cancellation。Dynamic loading 不能复制这些责任。

### 3.2 其他 Engine 已有正确的 direct projection

`apps/server/src/agentGateway/mcpInjection.ts` 从同一 Gateway connection 生成 Codex、Claude SDK、ACP、OpenCode、Antigravity 等原生配置。外部 Engine 拥有其 Session、MCP client、cache、tool namespace 与错误语义；OmniMind 只投影当前 thread-scoped connection。

stock Pi 不走这条 MCP injection，但已有 `PiAdapter customTools` direct/eager projection。它的产品身份不是 OmniMind Agent，不承担本轮 attention governance。

### 3.3 当前 OmniMind Agent 是 eager customTools

`apps/server/src/provider/Layers/PiAdapter.ts` 当前从 `tools/list` 取得 definitions，通过 Pi `defineTool()` 转为 `ToolDefinition`，`execute()` 调回 Gateway `tools/call`并转发`AbortSignal`，最后通过 `createAgentSessionFromServices({ customTools })` 注入。Gateway tools与supervised Bash、task tool一起默认active。

这是官方 seam，不是错误 hack；缺口是 OmniMind Agent 初始上下文与 provenance/collision，而不是 Gateway execution。

### 3.4 Pi ecosystem lifecycle 已有 owner

`apps/server/src/provider/Layers/OmniMindEcosystem.ts` 已复用 Pi `SettingsManager`、`DefaultPackageManager`、`ResourceLoader`、package resource enable/disable 与 reload。本文不创建第二 package manager，也不让 Host Extension接管Package、Skill、Prompt或third-party MCP。

## 4. 目标架构

```mermaid
flowchart LR
    H["OmniMind Host services<br/>Browser / Device / Thread / Automation"]
    G["AgentGateway<br/>canonical catalog + execution + authority"]
    H --> G
    G --> I{"canonical provider identity"}
    I -->|omnimind| X["named hidden session-scoped<br/>Host inline Extension"]
    X --> T["register allowed Gateway tools<br/>all Host tools initially inactive"]
    X --> L["thin extension-local loader<br/>owned metadata + additive activation"]
    T --> R["Pi Tool Registry<br/>registered / all / active truth"]
    L --> R
    R --> W["Pi Provider layer<br/>native deferred or safe fallback"]
    W --> E["activated ToolDefinition execute"]
    E --> G
    I -->|stock Pi| P["existing customTools<br/>direct / eager"]
    G --> N["other Engine adapters<br/>native direct projection"]
    Q["Other Pi Extensions / Packages"] --> R
    S["Pi Skills / Prompts"] --> U["Pi ResourceLoader / prompt owner"]
```

图中 loader 位于 Host Extension 内部，只是 exact-version glue；它不是 Gateway 旁边的新子系统。

## 5. 唯一 owner map

| 事实或行为                           | 唯一 owner                             | Host Extension 可以做                      | 禁止做                         |
| ------------------------------------ | -------------------------------------- | ------------------------------------------ | ------------------------------ |
| Host name/schema/annotations/group   | AgentGateway catalog                   | 无损转成 Pi `ToolDefinition`               | 维护第二 schema 清单           |
| Host execution/credential/capability | AgentGateway + Host service            | closure 转发 call                          | 搬进 Extension 或 Package      |
| Pi registered/all/active truth       | Pi AgentSession                        | 注册 owned tools、请求 additive activation | 建第二 registry/active store   |
| Pi reload/resume/fork                | Pi Session/ResourceLoader              | 在 lifecycle 内重建本 Extension            | 持久化 parallel resume truth   |
| Provider deferred/fallback wire      | Pi Provider adapter                    | 消费 exact evidence                        | 按模型名猜或手写 payload       |
| Built-in exposure intent             | OmniMind ServerSettings policy         | session-start 与 live filter               | per-Provider 副本              |
| 某次 call 是否授权                   | Gateway/Engine runtime authority       | 传递 exact Session/turn context            | 把 active 当 permission        |
| Package/Extension/Skill/Prompt       | Pi ecosystem owner                     | 保留其 tools 与 active state               | 统一搜索或接管 lifecycle       |
| third-party MCP                      | 首版无人接管；未来 exact adapter owner | 本轮无动作                                 | Host loader 扩张为 MCP manager |

## 6. OmniMind Agent 端到端生命周期

### 6.1 新 Session

```text
canonical provider === "omnimind"
  → read current Built-in policy
  → intersect platform/service availability
  → obtain allowed AgentGateway definitions
  → validate names/provenance/collisions
  → convert each definition to a real Pi ToolDefinition
  → register through one named hidden session-scoped inline Extension
  → keep extension-local loader active
  → remove only this Extension's owned Host names from active set
  → preserve every other owner's active tools
```

所有允许的 AgentGateway Host tools 初始 inactive，不预留 Host core。current-source 盘点已经闭合非 Gateway 常驻工具边界：

- `omnimind_update_tasks` 是当前唯一 OmniMind-exclusive、非 AgentGateway 的 custom session tool。`OMNIMIND_AGENT_TASK_POLICY` 要求非简单多步骤 Agent 请求从首轮维护任务列表；`buildOmniMindTaskListTool()` 提供真实 definition；`createSdkRuntime()` 只在 `provider === "omnimind" && workSurface === "agent"` 时把它直接注入 `customTools`；成功调用经同一 frozen work surface 投影为 canonical `turn.tasks.updated`。请求与投影测试证明它存在于 OmniMind Agent 首轮和后续请求，不进入 OmniMind Chat 或 stock Pi；
- 它属于现有 PiAdapter/Session owner 的 work-surface session-control/progress lifecycle，必须 initially/always active。它不是 AgentGateway Host tool、不是 Host core、不是 Host Extension loader scope，也不受 Browser、Device、Thread、Automation Built-in group toggle 影响；否则 immutable task policy 会与首轮工具面矛盾，canonical turn task projection也无法及时建立；
- supervised `bash` 继续由 Pi SDK definition 与 OmniMind process supervisor 的 custom/session owner 常驻；Pi `read`、`edit`、`write` built-ins由Pi拥有；Package/Extension tools由各自owner拥有。Host Extension initial deactivation必须保留这些owner的active决定；
- 全面扫描没有第二个OmniMind-exclusive、非Gateway custom session tool。未来新增项只按自身真实owner、work surface、prompt与事件lifecycle审查，不预留抽象或Host core。

如果 Gateway 不可用、过滤后集合为空或 discovery 失败，应准确 unavailable，不注册空壳 loader 产品。是否还能启动 identity-only Session 由现有 Provider owner决定，不能从“没有 Host tools”擅自推出。

### 6.2 Extension-local loader

候选集合每次由以下交集产生：

```text
this Extension's immutable owned names
∩ Pi getAllTools()
∩ current Built-in policy
∩ current availability
− Pi getActiveTools()
```

它只用 name、短 description 与明确 provenance 等轻量 metadata；不得把完整 JSON Schema、全 catalog 或长 prompt 编成另一份上下文。

执行只允许：

```text
current = getActiveTools()
matches = bounded deterministic matches in this owned inactive set
setActiveTools(unique(current + matches))
```

稳定合同不规定模型可见名称、lexical 权重、默认命中数或长期 ranking 算法。首个实现应沿官方最薄 pattern，确定性、有界、无外部依赖；具体参数只是可替换 probe 参数。

loader 不代理执行、不返回完整schemas、不连接server、不启动进程/timer/watcher/network、不建索引/cache/active store/resume store，也不搜索Pi built-ins、supervised Bash、task/session-control tools、其他Extensions/Packages、Skills、Prompts、third-party MCP或未连接MCP server。

`getAllTools()` 能看到别人的工具不等于 Host 有权激活它们。其他 Extension若需要 dynamic loading，由其 owner负责。

### 6.3 下一安全 turn 与实际调用

纯 additive active-set change 后，Pi记录新增tool names；下一安全agent turn由Pi选择native deferred representation或fallback；完整schema此时才进入真实工具面；模型调用ToolDefinition；execute bridge进入AgentGateway `tools/call`。不会热切已经admitted的模型请求或正在执行的call。

## 7. Prompt 与上下文合同

当前 `apps/server/src/agentGateway/harnessPolicy.ts` 会直接枚举/要求调用 Browser、Device、Thread、Automation 等 Host tools。如果这些 definitions 初始 inactive，旧 prompt 会制造“说明存在、工具面不存在”的矛盾。

OmniMind Agent 初始 guidance 必须只表达：额外Host能力可按需发现和加载；需要时使用当前active的加载入口；激活后在下一安全turn调用；不要猜工具名；发现或active不等于授权。

不得枚举inactive Host names，不得在loader description/result列出全catalog，不得把完整schema放进system prompt，不得用长`promptSnippet`/`promptGuidelines`重建稳定前缀，也不得把stock Pi/外部Engine的direct-tool instructions反向套给OmniMind Agent。

权限、停止、人类接管和数据边界等调用前必须知道的跨工具安全约束仍保留；tool-specific guidance 优先跟随激活后的 canonical ToolDefinition。stock Pi与其他Engine继续获得与其完整filtered schema一致的直接工具指导；Codex静态Browser instructions同样受Built-in policy过滤。

## 8. Built-in policy 与 availability

Built-in tools fresh 默认开放，并控制所有 Agent，包括 OmniMind Agent。

### 8.1 关闭

- 新 OmniMind Session：disabled/unavailable group 不注册；
- 旧 OmniMind Session：loader live-filter 不再返回或激活该组；
- stale call：Gateway 按当前 policy 立即拒绝；
- schema 已 active：可能到安全 reload/new Session 才从模型上下文消失，但不能再执行；
- 已准入 in-flight call：普通 exposure toggle 不伪装成 emergency kill；cancel 仍归 turn/session owner；
- Browser/Device 人类 UI：不受 Agent exposure 设置影响。

### 8.2 重新开启

创建时已经注册但后来被live policy屏蔽的tool，只在Pi当前lifecycle允许时重新可发现；创建时没有注册的tool不得静默注入旧Session；按exact reload/new-session边界生效；不为抹平Engine差异新增全局registry或第二active store。

### 8.3 Availability

平台与服务真实不可用先从注册池排除。Device unsupported 不是“用户关闭”；UI 与 diagnostics 必须区分 unavailable 与 disabled。

## 9. Authorization、permission 与 cancellation

每次真实 call 重新检查：current Built-in policy、exact session identity、credential/lease、platform/service availability、runtimeMode与真实permission、approval bridge（仅在真实存在时）、exact turn authority、timeout、cancellation/abort、Provider replacement与late-result fence。

注册只表示 Session 知道 definition；active只表示下一request可选择；两者都不是授权。loader自身应是短、进程内、无外部副作用的discovery/activation操作。实际Tool execute继续转发Pi `AbortSignal`；reload或active变化不取消in-flight call。

## 10. Reload、resume、fork 与 instance replacement

Pi Session 是 active truth owner：reload创建新Extension instance与owned set；旧instance/handler不能继续mutation；resume/fork使用exact Pi lifecycle；Pi原生能保留active truth就复用；exact版本不能保持时安全重新发现；不建Host active persistence、LKG、generation或migration；compaction继续由Pi拥有transcript/tool result/summary truth。

需要重点做 conformance，而不是先承诺：Pi `0.84.2` 各 lifecycle event 对 inline Extension 的精确触发顺序、Session replacement 后旧 closure 是否释放、active definitions 在 resume/fork 中如何恢复。

## 11. Collision 与 provenance

`dist/core/resource-loader.js` 对 Extension-Extension tool conflict 产生 diagnostics，并有加载顺序/priority语义。它不自动证明 built-in、SDK custom、inline Extension 等所有交叉来源的安全结果。AgentSession最终Map composition存在last-set风险；因此不能只靠命名猜测或“有 diagnostic”宣称安全。

以下必须fail closed：Gateway内部duplicate；Gateway与Pi built-in/supervised/custom session tool冲突；Gateway与其他Extension/Package tool冲突；inline Extension identity/source无法唯一证明；cross-source exact winner不能由conformance稳定证明。

不得silent override、silent drop或自动rename。错误只报告必要canonical names与provenance，不泄露bearer、endpoint、完整schema或用户参数。

Provenance目标：Gateway tools与loader属于named inline Host Extension；Bash/task custom tools保留SDK/custom source；user/project Package tools保留Pi sourceInfo；Timeline继续记录实际tool name、Provider、Thread与call identity。UI若显示provenance，只投影现有真相，不建立第二表。

## 12. Provider wire 验证

每个 exact Provider/endpoint只允许三种结论：

- `native`：wire真实接受并完成deferred references；
- `fallback`：Pi在下一request发送当前active tool definitions；
- `unknown`：证据不足。

验证至少记录脱敏的初始/激活后真实wire tool-schema bytes、compatibility path、native reference或fallback definitions、prompt/cache/input/output usage、额外round trip与TTFR。不把代理转换、兼容endpoint与直连混为同一证据。

## 13. 性能与 outcome：证明实现，不重投产品方向

维护者已经选择 dynamic architecture。benchmark只验证exact provider native/fallback、量化schema bytes与prompt/cache变化、调优轻量metadata matching、发现错误搜索/漏召回/额外turn，并证明任务成功率、TTFR、总成本与无回归。它不再决定“是否值得采用dynamic”。eager只作current baseline/comparator/temporary rollback。

代表性 OmniMind Agent journeys：

| Journey                     | 关键观测                                                       |
| --------------------------- | -------------------------------------------------------------- |
| 普通代码任务，无 Host需求   | 初始schema bytes、错误加载率、TTFR、成功率、成本               |
| Browser任务                 | metadata召回、additive activation、下一turn schema、执行与停止 |
| Thread协调                  | 精确工具选择、write authority、target identity                 |
| Automation任务              | 召回充分性、长说明是否泄漏到初始prompt                         |
| Device unsupported          | 不注册、不发现、不产生幽灵schema                               |
| Stop in-flight Gateway call | abort-to-idle、无late副作用                                    |
| reload/resume/fork          | instance replacement、重新发现成本、无第二truth                |

MiMo与DeepSeek使用协议匹配的最小真实journey；报告区分直连、兼容endpoint与代理。外部Engine只做direct projection、Built-in过滤、prompt和call deny回归，不建立通用动态工具benchmark。

## 14. Scale、Package、Skill 与 MCP

当前几十个Host tools足以证明初始schema需要治理，但不授权embedding、BM25、远端服务或持久索引。首个loader线性扫描短metadata；只有profile真实证伪后才在Extension内部替换有界算法，owner与Registry不变。

Pi Skills已使用progressive disclosure；Package install/update/remove/enable/reload继续由PackageManager/ResourceLoader拥有。Host loader不搜索Skill正文、不安装Package、不管理Package tools。

首版不提供第三方MCP Settings、CRUD、credential/OAuth、连接测试、全局状态面板、跨Engine自动分发或统一搜索。未来只有某个exact Pi-native MCP Extension/adapter经source match、isolated runtime与真实Session证明支持lazy discovery/proxy或按需activation时，它才能拥有自己的加载体验；MCP协议本身不证明lazy语义。

即使未来成立，adapter仍拥有config、secret、transport、server lifecycle与its tools；Host Extension不接管；工具被发现/active不代表授权；不能为发现连接所有servers、制造process/network/reconnect storm或把全量schemas塞回上下文；不建立Host+third-party总registry或统一permission system。

## 15. 最小 Gate B 实施切片

### Slice 1：冻结 exact baseline 与 conformance falsifier

- 记录OmniMind Agent与stock Pi all/active/sourceInfo；
- 记录Gateway 0/普通/Device可用tool count；
- 记录initial prompt与wire schema bytes；
- fixture覆盖普通Extension、自有dynamic loader与name collision；
- 证明Pi启动默认active Extension/custom tools与cross-source composition。

### Slice 2：只迁移 OmniMind Agent 的注册 owner

- 复用现有definition→`ToolDefinition`与execute bridge；
- 只有`provider === "omnimind"`注入named hidden inline Extension；
- Gateway tools从该Provider的eager `customTools`移出；
- stock Pi保持direct/eager；
- Bash/task tools留在真实owner；
- filter、duplicate、collision与empty failure先闭合。

### Slice 3：接入 Pi-native Dynamic Tool Loading

- Extension注册必要的极薄loader；
- session start只移除owned Host names；
- 全部Gateway Host tools初始inactive；
- loader只做owned/live/available/inactive交集与additive `setActiveTools`；
- 同步修正OmniMind Agent prompt；
- 不固定公共名称/ranking/limit。

### Slice 4：focused lifecycle 与 wire proof

- exact bundled Pi `0.84.2`；
- startup/reload/resume/fork/shutdown；
- collision/provenance；
- Built-in disable/re-enable；
- Browser/Thread/Automation representative calls；
- Device unavailable；
- turn authority、AbortSignal、timeout、Provider replacement；
- native/fallback wire。

### Slice 5：outcome/economics 与 packaged closure

- MiMo/DeepSeek最小真实journeys；
- schema bytes、prompt/cache、错选率、额外turn、成功率、TTFR、成本；
- exact pushed SHA fresh isolated packaged profile；
- close/reopen与private-home隔离。

本文是纯文档修正，不触发产品打包或live probe。

## 16. 验收矩阵

### 16.1 Registry 与加载

- allowed Gateway definitions以真实Pi `ToolDefinition`注册；
- disabled/unavailable definitions不注册；
- 所有Gateway Host tools初始inactive；
- loader active且只管理owned集合；
- other-owner active set保持不变；
- activation纯additive；
- 下一安全turn出现完整definitions；
- actual execute回到同一Gateway handler。

### 16.2 Prompt 与上下文

- 初始prompt不枚举inactive tools；
- loader description/result不包含全catalog或完整schemas；
- ordinary task不错误加载Host tools；
- schema bytes显著低于eager baseline；
- native/fallback有exact wire证据。

### 16.3 Policy 与权限

- Built-in fresh默认开放且覆盖所有Agent；
- 关闭后新Session不注册、旧loader不发现、stale call deny；
- in-flight不被普通toggle伪杀；
- re-enable遵循reload/new-session边界；
- registered/active不冒充authorized；
- credential、permission、approval、turn、timeout、cancel全部保留。

### 16.4 Lifecycle 与 collision

- reload/resume/fork无第二active store；
- old Extension instance/handler不泄漏；
- no Gateway/empty/error准确unavailable；
- duplicate/cross-source collision fail closed；
- 无silent override/rename；
- `.pi`与`.omnimind`隔离。

### 16.5 Scope

- stock Pi仍direct/eager；
- 其他Engine仍native direct；
- Host loader不接管built-ins、Bash、task/session、Packages、Skills或third-party MCP；
- 无新registry、settings、permission system、index、process或持久状态。

## 17. Rollback、stop-loss 与重开

### 17.1 临时代码 rollback

实现故障时可移除OmniMind Provider的inline Extension injection，临时把Gateway definitions放回该Provider现有`customTools`，恢复与eager schema一致的prompt，同时保持Gateway、Built-in policy、stock Pi与其他Engine不变。

这条路径无数据迁移，但只是临时止损，不是等价最终架构。不得用永久feature flag或双轨配置让两种authority长期并存。

### 17.2 Stop-loss

出现任一条件即停止扩张并报告blocker/upstream需要：必须fork Pi core才能获得基本registered/active/additive seam；需要第二Registry/active/resume/search store；必须接管其他Extension active set；collision只能靠silent override/rename；需要按模型名硬编码wire；需要全局搜索、embedding/BM25/远端索引；权限/credential/turn/timeout/cancel/secret边界被削弱；prompt只是把全catalog从schema搬到文字；相同失败没有新假设仍重复补丁。

命中后只允许简化实现或请求exact upstream seam，不能把eager宣布为终态。

### 17.3 Revalidation triggers

- bundled Pi revision或AgentSession/Extension API变化；
- Provider tool-search wire变化；
- AgentGateway catalog/listChanged/policy/lifecycle变化；
- Package collision/load order变化；
- `omnimind_update_tasks` 的 Agent-only 注入、immutable task policy、initially/always-active 状态或 `turn.tasks.updated` 投影变化，或出现第二个 OmniMind-exclusive、非 Gateway custom session tool；
- Host tool规模使有界metadata扫描被profile证伪；
- future third-party MCP产品scope被维护者重新开启；
- 真实泄密、orphan、late side effect或resume失败。

## 18. Gate A 最终 disposition

```text
Exact identity:
  Pi 0.84.2 / upstream 914cf147...; OmniMind integration path as recorded above.

Confirmed architecture:
  AgentGateway Host definitions become standard Pi Extension tools for provider === "omnimind";
  Pi owns Registry/active/wire; Gateway owns execution/authority.

Replaceable detail:
  exact 0.84.2 may need one thin extension-local callable loader;
  its name, ranking, limit and algorithm are not stable contracts.

Dynamic status:
  required target, not an eager-vs-dynamic product experiment.

Loader scope:
  only this Host Extension's registered, live-policy-allowed, available, inactive Gateway tools.

Third-party MCP:
  out of first release; no settings, manager, unified search or cross-Engine distribution.

Current non-Gateway always-active boundary:
  omnimind_update_tasks is the only OmniMind-exclusive non-Gateway custom session tool;
  PiAdapter/Session owns it as an initially/always-active Agent progress control,
  outside AgentGateway, Host Extension, Host core and Built-in group policy.

Revalidation trigger:
  its Agent-only injection, immutable prompt, active lifecycle or canonical task projection changes,
  or a second OmniMind-exclusive non-Gateway custom session tool is introduced.
```

最终原则：

> **让AgentGateway Host tools真正进入Pi原生Extension与Dynamic Tool Loading生命周期；Pi拥有Registry、active set与Provider wire，Host Extension只注册并按需激活自己的工具，AgentGateway始终拥有执行与授权。**
