# Agent tools、Built-in policy、Extensions 与 MCP Settings 全链路复核

> 证据日期：2026-08-19
>
> current-source基线：`main@849730c508be0dde9570529431395acc7be2943b`；本任务分支在此基础上实现Architecture 1.0 source candidate，尚待最终push/live/packaged closure
>
> 文档角色：Settings、AgentGateway、Engine projection与MCP产品边界的证据owner；稳定UI与运行时合同分别由[`architecture/workbench.md`](../architecture/workbench.md)和[`architecture/execution.md`](../architecture/execution.md)拥有。

## 0. 结论先行

首版只保留三个不会互相吞并的产品概念：

1. **Built-in tools / 内置工具**：控制OmniMind Host capabilities是否暴露给所有Agent Engine；
2. **External connections / 外部连接**：管理外部应用如何连接OmniMind；
3. **Extensions（未来独立表面）**：投影Pi原生ResourceLoader/package truth，不在本轮建设Manager或Marketplace。

首版不提供第三方MCP Settings、server CRUD、credential/OAuth UI、连接测试、全局状态面板、统一工具搜索或自动跨Engine分发。

Host运行时目标也已改变：

- 一份AgentGateway canonical catalog；
- 同一全局Built-in policy覆盖所有Agent；
- OmniMind Agent通过named hidden Pi Host Projection Extension注册allowed+available definitions，并在当前方案中直接active；
- stock Pi与其他Engine继续各自native direct/eager projection；
- 删除Host-owned callable loader、inactive pool与activation preflight；
- future dynamic只属于具体Extension owner。

基线main仍实现旧Host dynamic方案；本任务分支已经单轨删除该责任并改为eager Host Projection。两者必须分开：旧main只提供历史source evidence，本分支在完成最终同步、push、live与packaged前也只能称source candidate。

## 1. 产品问题不是“MCP页面放哪里”

MCP是协议，不是一个天然产品页面。必须先问用户结果和direction：

| 用户结果                                     | 正确入口                     | direction                          |
| -------------------------------------------- | ---------------------------- | ---------------------------------- |
| 控制Agent能否使用OmniMind内置能力            | Built-in tools               | OmniMind → Agent                   |
| 让Codex、Claude等外部应用连接OmniMind        | External connections         | external app → OmniMind            |
| 安装/启用Pi生态Extension                     | future Extensions projection | package/Extension → OmniMind Agent |
| 管理GitHub、Notion、数据库等第三方MCP server | 首版不产品化                 | external server → OmniMind Agent   |

把四者合并成“MCP Settings”会立刻引入错误owner：credential、OAuth、process、reconnect、approval、project config、audit、status与跨Engine分发都会变成Host长期责任。

## 2. 两类MCP必须分开

### 2.1 OmniMind-owned AgentGateway MCP

AgentGateway是OmniMind自己的Host capability transport：

- OmniMind/Thread/Diagnostics/Goal/Automation；
- Browser；
- Device；
- 未来同一Gateway owner下的canonical tools。

外部Engine继续通过各自原生MCP/plugin seam使用这些能力。OmniMind Agent可以通过Pi inline Extension投影同一definitions，但execute仍回到Gateway。这条链路不是第三方MCP管理。

### 2.2 third-party MCP

GitHub、Notion、数据库、搜索服务等MCP server未来可能成为某个Pi Extension或adapter的能力来源，但首版不提供OmniMind专属Settings来管理。

即使未来adapter支持lazy discovery/proxy：

- discovery不负责server config、secret、OAuth、process、reconnect、approval或audit；
- discovered/active不等于authorized；
- 不为搜索自动连接所有servers；
- 不把全量schemas注入context；
- 不建立Host+third-party总Registry或统一权限系统；
- 是否分发给其他Engine必须单独证明用户结果。

## 3. 强Host平权

```text
Desired Host Surface
= canonical Gateway catalog
∩ global Built-in policy
∩ machine/service availability

Delivered Host Surface
= Desired Host Surface
∩ thread-scoped Engine projection successfully installed
```

所有健康、正式支持Engine应获得同一Desired Host Surface。Provider identity只决定如何投影，不决定长期Host等级：

| Engine                | projection                                                  |
| --------------------- | ----------------------------------------------------------- |
| OmniMind Agent        | named hidden Pi Host Projection Extension，当前eager-active |
| stock Pi              | Pi `customTools` direct/eager                               |
| Codex                 | native MCP config                                           |
| Claude                | native MCP server seam                                      |
| OpenCode/Kilo         | native remote MCP                                           |
| ACP/Cursor/Grok/Droid | native ACP/HTTP/proxy seam                                  |
| Antigravity           | supported plugin/MCP seam                                   |

projection失败、partial collision或service unavailable必须准确呈现为运行事实，并修adapter；不能把少一组工具固化为该Engine的正常产品等级。

平权只覆盖Gateway Host surface、global exposure policy与Gateway call-time authority，不统一各Engine的Bash、read/edit/write、sandbox、approval、Todo、context、resume或Package。

## 4. Built-in policy的唯一语义

### 4.1 policy是用户intent，不是runtime快照

Settings只持久化用户disabled/enabled intent。以下状态不得混写：

| 状态                | owner                         | 是否持久化               |
| ------------------- | ----------------------------- | ------------------------ |
| fresh default       | ServerSettings schema/default | 仅用于无显式选择的新配置 |
| explicit choice     | revisioned ServerSettings     | 是                       |
| availability        | Host service/platform         | 否                       |
| registration/active | 当前Engine Session            | 否                       |
| call authorization  | AgentGateway admission        | 否                       |
| in-flight/cancel    | turn/session owner            | 否                       |

未知group ID可以有界round-trip以保留前向兼容，但不产生运行效果。UI数量与availability必须来自canonical catalog/runtime，不能硬编码。

### 4.2 已确认fresh defaults

brand-new且没有settings文件时：

- OmniMind：enabled；
- Browser：enabled；
- Device：disabled。

该裁决不自动冻结最终六组taxonomy，也不覆盖已有用户明确选择。这里不能依赖当前decoded settings猜来源：`disabledBuiltInGroups`使用decoding default `[]`，因此raw字段缺失与显式`[]`在`decodeSettingsFromJson()`后已经不可区分。

### 4.3 Gate B migration contract

不新增store、marker或第二migration framework；复用现有settings文件存在事实、revisioned envelope与`migrationVersion`，并在schema decoding default抹掉字段存在性之前判定：

| raw输入                            | 目标intent                                | 升级结果                                                                 |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| settings文件不存在                 | brand-new；Device disabled                | 仅在内存使用fresh default；启动不ambient write                           |
| existing legacy snapshot，字段缺失 | 保留legacy decoded intent；Device enabled | 当前版本物化为不含`device`                                               |
| existing snapshot，显式`[]`        | 保留显式Device enabled                    | 当前版本保持不含`device`                                                 |
| existing snapshot，显式`[device]`  | 保留Device disabled                       | 当前版本保持`device`                                                     |
| existing snapshot，含unknown IDs   | 保留已知与unknown IDs                     | normalize后有界round-trip                                                |
| corrupt snapshot                   | 无法证明任何显式选择                      | 沿现有quarantine/diagnostic，使用当前安全默认；不得称为fresh或“保留选择” |

迁移必须是一次有界的existing→current版本转换。它不授权新的用户迁移数据库、LKG、双读或长期compat marker。若未来维护者选择pre-public reset，必须在sole owner明确接受覆盖损失后替换本合同，不能让实现自行决定。

### 4.4 disable与re-enable

disable某组：

1. 新Session的Desired Host Surface排除该组；
2. OmniMind Agent不注册该组；
3. 其他Engine不投影该组；
4. 旧Session stale schema可以暂时可见；
5. 所有旧Session新call由Gateway按当前policy即时deny；
6. 已admitted in-flight不被普通toggle伪取消。

re-enable：

- 只有policy允许且availability成立时才effective；
- 只按目标Engine真实reload/new Session边界投影；
- OmniMind Agent注册后直接active；
- 不向稳定旧Session偷偷注入未注册schema；
- 不建per-turn active controller或第二store。

Device disabled不是“注册为inactive”。没有activator的inactive tool不可发现；exposure policy必须在projection/registration边界表达。

### 4.5 partial availability

同组部分能力不可用时，UI显示ephemeral degraded与真实可用数量。degraded不是用户选择，不能写回Settings。Device enabled也不等于所有handler都具有可执行闭包；availability必须覆盖service、platform和真实execution prerequisites。

## 5. Settings信息架构

### 5.1 Built-in tools

正常产品语言只表达：

- 这组能力是什么；
- 当前是否允许Agent使用；
- 当前机器/服务是否可用；
- 更改何时对新会话生效；
- 旧会话中的新调用会被拒绝；
- human Browser/Device UI不受影响。

不出现：

- Pi；
- MCP transport；
- Tool Registry或active set；
- loader/search；-具体工具数量硬编码；
- Engine selector；
- 逐tool权限矩阵。

### 5.2 External connections

页面表达“外部应用连接OmniMind”，保留既有pairing、project scope、credential、revoke、expiry与last-used facts。没有heartbeat时不能显示“当前在线”。

新连接默认选定Projects而不是未来所有Projects；至少有一个Project才能创建。内部section id可继续保留`integrations`以兼容deep link，但普通产品表面不称其为MCP manager。

### 5.3 future Extensions

未来若提供Extensions表面，只能投影Pi ResourceLoader/package truth：

- product-bundled；
- team；
- user/third-party；
- source、version、provenance、availability与原生lifecycle。

它不能创建第二安装DB、Registry、排序器、cache或统一loader。它也不自动把Pi Extensions分发给Codex/Claude。

## 6. OmniMind Agent Host Projection

本任务分支source形状：

```text
current policy
∩ availability
∩ AgentGateway canonical catalog
  → trusted descriptors
  → named hidden Host Projection Extension
  → Pi Tool Registry
  → registered + active
  → model calls ToolDefinition
  → AgentGateway tools/call
```

Host Extension拥有projection、collision/provenance与Pi Session wiring，不拥有Gateway execution、credential、permission或其他Extensions。

当前物理上保留一个Host Projection Extension，因为各Host组共享同一catalog、execute、credential、scope/cancel与Session投影生命周期。Settings分组不等于物理Extension分包。未来某组只有在独立source/package/version/install/lifecycle或具体dynamic证据成立时才抽取。

## 7. Dynamic Tool Loading边界

Pi原生支持Extension owner-local Dynamic Tool Loading，但没有默认全局callable search tool。官方loader只是Extension-local示例pattern，不是产品级总搜索。

当前Host不采用dynamic，原因见[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)。未来判断规则：

- 少量/常用：eager；
- 大量/稀疏且有真实schema/attention证据：该Extension自带loader；
- loader只管理自身；
- 没loader不得inactive；
- upstream有全局机制时优先upstream；
- 永不恢复Host/global search manager。

这与Built-in policy正交：Device不注册是用户exposure选择，不是dynamic activation。

## 8. Prompt truth

Prompt必须与实际Delivered Host Surface一致：

- direct/eager Engine只收到其实际filtered definitions对应的简短跨工具指导；
- OmniMind Agent不再出现“先search/activate”的dynamic guidance；
- ToolDefinition描述普通用法与参数；
- generic harness只保留authority、Automation run-only、Browser human interruption/abort、untrusted page/file/device content等不变量；
- 不把完整catalog、schema或长Browser/Device手册搬进system prompt；
- partial collision或projection failure时不承诺不存在的Host能力。

Goal/Automation prompt可以描述真实职责，但不再承担activation preflight。其依赖的canonical capability必须已经位于Delivered Host Surface；缺失时对应dispatch fail closed并准确unavailable。

## 9. Collision、authority与生命周期

### 9.1 collision

- Gateway内部duplicate：拒绝不可信catalog；
- foreign Pi Extension同名winner：按Pi precedence继续运行；
- Host只claim`sourceInfo`证明由exact Host inline source赢得的names；
- foreign winner不获得Gateway provenance、Host prompt承诺或事件投影；
- collided capability局部unavailable，依赖它的dispatch fail closed；
- Session其余能力继续；
- owned delivered set只在当前Session派生，不持久化。

### 9.2 call authority

`registered != active != exposed != available != authorized != executed`。

`runtimeMode`只决定一个已exposed、当前available且属于任务意图的具体能力是否再收普通approval。它不证明Device每个entry都属于普通能力，不证明12/12 executable closure或产品准入，也不替Browser download决定artifact落点、receipt或恢复。Settings enablement、逐entry availability/安全分类、runtimeMode和最终execute必须分别验证。

每次Provider-facing真实`tools/call`必须重新检查：

- current policy；
- session identity与credential；
- capability/scope；
- runtime permission与真实存在的approval；
- exact active turn；
- availability；
- timeout/cancellation。

`tools/list`可以在有效Session、turn外用于初始化。read、wait与diagnostics也不能因“只读”绕过Provider exact-turn call authority。应扩展既有ingress gate，不创建per-turn token/lease manager。

### 9.3 races

- rapid Settings mutations串行化或generation-fenced；
- stale response不能覆盖新intent；
- failure后回读Server truth；
- toggle不取消in-flight；
- explicit cancel/timeout继续传播；
- Session replacement后旧handler/late result不污染新turn。

## 10. Todo与其他Extensions

Todo是独立、product-bundled Pi Session Extension，不属于Host/MCP/Built-in policy。它当前只在OmniMind Agent work surface注册并initial-active；Chat Todo是否采用仍是独立产品决定，本文不批准。唯一证据owner是[`pi-native-todo-extension-review.md`](pi-native-todo-extension-review.md)。

Pi built-ins、supervised Bash、团队/第三方Extensions、Skills与Packages也保持各自owner。Host不得盘点、保留、移除或搜索它们。

## 11. External connections与External MCP authority

外部应用→OmniMind使用`ExternalClientPrincipal`、pairing scope、credential、revoke与audit。这条authority与Provider Session不同：

- 不套Provider active-turn规则；
- 不进入Built-in group；
- 不进入Pi Host Projection；
- 不与Host catalog合并；
- 不因“连接存在”推断在线；
- 不因未来third-party MCP adapter而共享credential或process owner。

## 12. 基线、分支实现与证据成熟度

### 12.1 基线main的历史source evidence

已合入main的旧Gate B证明：

- revisioned all-agent policy与Settings UI；
- Host inline Extension、sourceInfo、collision与reload seam；
- Todo独立Extension；
- Gateway execute bridge与call-time checks；
- Pi dynamic/deferred wire与MiMo/DeepSeek compatible endpoint journey；
- isolated packaged startup。

但它也仍包含被新裁决否决的Host loader、inactive pool、preflight与dynamic prompt。旧绿色测试证明旧实现自洽，不证明它仍是正确产品方向。

### 12.2 architecture-confirmed target

- 删除Host search/dynamic责任；
- Host Projection eager-active；
- strong Host parity；
- product-bundled composition seam；
- PiAdapter瘦身；
- fresh OmniMind/Browser on、Device off；
- prompt/context diet；
- exact-turn覆盖所有Provider calls；
- partial collision局部degrade。

### 12.3 本任务分支implementation evidence

本任务分支已经完成并通过focused source验证：raw settings migration与Device fresh default、统一Gateway→Pi投影、显式有限composition、async Host factory在native ResourceLoader reload重读实时catalog、eager active、collision局部降级、lease/Delivered capability分离、prompt diet、所有Provider `tools/call`的ingress exact-turn，以及一个非Host的owner-local dynamic wire conformance。当前未完成的是最终main同步、push、MiMo/DeepSeek live与同一pushed code SHA的隔离packaged journey；这些门关闭前不能宣称已交付、已安装或已发布。

## 13. Gate B剩余交付切片

source切片已经在任务分支用独立commits闭合。剩余只允许：再次merge最新`origin/main`并在最终SHA跑full gates；push该任务分支；随后完成MiMo/DeepSeek与隔离packaged journey；最后把脱敏结果和精确artifact SHA写回evidence。任何live/packaged代码修正都必须产生新commit、新push SHA并重建，不能在旧artifact上补文档宣称完成。

## 14. 验收矩阵

| 场景                         | 期望                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| fresh config                 | OmniMind/Browser enabled，Device disabled                            |
| legacy missing field         | 保留legacy Device enabled并物化current snapshot                      |
| existing explicit Device on  | 不被fresh default覆盖                                                |
| existing explicit Device off | 保持disabled                                                         |
| unknown IDs                  | 有界round-trip，不产生运行效果                                       |
| corrupt settings             | quarantine/diagnostic + safe default，不伪称fresh或preserved         |
| Device off new Session       | 所有Engine不投影；OmniMind不注册                                     |
| Device on + available        | reload/new Session后所有健康Engine获得同一surface                    |
| old stale schema             | 可见不等于可执行；Gateway新call deny                                 |
| in-flight toggle             | 不伪取消                                                             |
| OmniMind Host                | named hidden Extension，definitions registered+active，无Host loader |
| stock Pi/other Engine        | 原生direct/eager pipe不变                                            |
| collision                    | foreign winner继续；Host不claim；局部unavailable                     |
| prompt                       | 无search guidance/全catalog；只承诺实际definitions                   |
| authority                    | read/write/browser/device/diagnostics均exact-turn                    |
| External connections         | pairing/scope/revoke准确，无在线伪装                                 |
| third-party MCP              | 无V1 Settings/CRUD/credential/status/unified search                  |
| Todo                         | 独立owner；不进入Host policy/search                                  |

## 15. 明确拒绝

- Host-owned callable loader或改名alias；
- Host/global跨Extension搜索；
- inactive Host pool；
- Goal/Automation activation preflight；
- Engine × group权限矩阵；
- 第二Registry、active store、catalog snapshot、dependency graph；
- Extension Marketplace/Manager；
- 第三方MCP Settings、CRUD、OAuth/credential、全局状态或自动分发；
- 把Todo、Bash、Pi built-ins或第三方Extension并入Host；
- 用Device default-off掩盖availability/execution缺口；
- 从decoded `[]`猜测fresh或explicit intent；
- 用模型名猜Provider wire；
- 用旧source测试冒充新target或packaged delivery。

## 16. 最终原则

> **Built-in tools管理一份all-agent Host exposure intent，External connections管理外部应用连接，未来Extensions只投影Pi原生生态真相。AgentGateway拥有一份canonical Host catalog与逐call authority；OmniMind Agent用Pi-native Host Projection Extension注册并直接激活当前允许且可用的definitions，其他Engine通过原生管道获得同一Host surface。Host不再拥有搜索器，third-party MCP不进入V1管理面。**

复验触发器：Settings schema/default或真实用户迁移事实变化；Gateway catalog/group/availability变化；Pi Registry/sourceInfo/reload变化；Engine projection变化；External connection authority变化；具体Extension出现dynamic实证；target代码实际落地或回滚。
