# Pi-native Session tools：Todo owner、provenance 与生命周期复核

> 证据日期：2026-08-18
>
> 状态：IMPLEMENTED AS LOCAL CANDIDATE；尚未push、合并、打包或交付
>
> 唯一职责：记录OmniMind Agent中非AgentGateway、由Pi Session lifecycle拥有的工具事实。稳定产品合同属于[`architecture/execution.md`](../architecture/execution.md)；AgentGateway Host动态加载属于[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)。

## 1. 裁决

`SIMPLIFY → GO`：保留现有Todo的逐回合三态全量快照和canonical `turn.tasks.updated`结果，只把owner从PiAdapter内的独立`customTools`定义迁到产品随附的named、hidden Pi-native inline Extension。

- 只在canonical `provider === "omnimind" && workSurface === "agent"`的Pi Session注册；OmniMind Chat、stock Pi和其他Engine不注册；
- 在该Session首个模型请求前initial-active。active只表示schema当轮可选择，不表示首轮必须调用、自动执行、已经授权或跨应用常驻；
- Agent按真实不确定性判断时机：理解不足时先调查；理解足够、任务确实非平凡且进度投影有帮助时才创建或修订Todo；简单任务不用；
- Todo是可修订的当前快照，记录用户目标与重要成果，不记录loader、tool activation、函数名等内部plumbing。只有能力调查本身是用户要求的实质结果时，才用用户语言记录“确认可用能力与约束”；
- 不进入AgentGateway Host Extension、Host动态加载或Built-in Host exposure policy，不建立第二state、registry、Settings、Package install state、migration或control plane。

未来只有真实wire schema成本或误调用证据显示该小型工具造成显著产品损失时，才在Todo自身owner内重新评估activation；AgentGateway Host Extension永不接管。

## 2. 当前工具责任地图

| 工具类别                        | registered owner                                        | active truth                     | authorization / safety                                                                    | execution / result owner                                |
| ------------------------------- | ------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Pi `read/edit/write`等built-ins | Pi AgentSession                                         | Pi Session/settings              | Pi runtime与Host既有workspace边界                                                         | Pi built-in definitions                                 |
| supervised Bash replacement     | 现有PiAdapter session wiring                            | Pi Session                       | OmniMind process supervisor、turn abort/timeout与process-tree teardown                    | Pi SDK Bash definition + process supervisor             |
| OmniMind Agent Todo             | 产品Todo inline Extension                               | Pi Session；注册时initial-active | 纯快照schema校验；active不等于外部权限                                                    | Extension execute；可信结果薄投影到`turn.tasks.updated` |
| AgentGateway Host tools         | AgentGateway canonical catalog + 独立Host Extension投影 | Pi-native Dynamic Tool Loading   | Built-in policy、identity、credential、runtime permission、turn authority、timeout/cancel | AgentGateway `tools/call`                               |

这些类别不是一个新“Session Tool Manager”。每个owner只管理自己的名字和生命周期，不为跨类别协调建立inventory、特殊保留逻辑或控制面。

## 3. 为什么必须拆出 PiAdapter lone wolf

迁移前，`PiAdapter.ts`同时承担了：

1. Todo tool name、schema、validation与execute；
2. Todo专属prompt policy；
3. `provider/workSurface`注册例外；
4. 从通用`tool_execution_end`按名字推断`turn.tasks.updated`；
5. Agent/Chat/stock Pi、reload与projection测试。

这形成downstream-only lone wolf：同一个大adapter横跨definition、prompt、registry lifecycle、事件authority与测试。直接后果是Host工具研究把Todo误分类为需要Host“保留”的custom tool，active-set判断漂移，prompt与Registry owner分裂，同名工具仅凭名称获得projection authority，后续Pi/Synara同步必须在一个大文件里重复维护多种责任。

迁移后的最小调用链是：

```text
Product Session admission (omnimind + agent)
  → resourceLoaderOptions.extensionFactories
  → named hidden Todo inline Extension
  → pi.registerTool(existing three-state snapshot definition)
  → Pi Registry / initial active tool surface
  → product tool execute validates one complete snapshot
  → Extension-instance WeakSet marks the exact returned details object
  → tool_execution_end accepts only that object identity once
  → PiAdapter callback projects canonical turn.tasks.updated
```

PiAdapter只保留Session选择、Extension装配和canonical event桥；Todo definition、prompt、validation和结果provenance由独立模块拥有。

## 4. Exact Pi `0.84.2` 证据

锁定artifact为bundled `@omnimind/pi-coding-agent@0.84.2`，对应upstream `914cf147…`：

- public `DefaultResourceLoaderOptions.extensionFactories`接受`InlineExtension`；named input得到`<inline:name>` path并可`hidden`；
- `AgentSession`在初始`_buildRuntime({ includeAllExtensionTools: true })`中把Extension tools加入active set；reload保留active names、重载ResourceLoader、使旧runner失效并创建新Extension实例；
- `getAllTools()`返回Pi Registry winner的`sourceInfo`；inline来源为`source: "inline"`、`scope: "temporary"`、`origin: "top-level"`；
- ResourceLoader保留全部同名Extensions并产生conflict diagnostics；`ExtensionRunner.getAllRegisteredTools()`按加载顺序选择first registration，user/project/global来源先于inline factory，因此同名外部工具可以成为native winner；
- `tool_execution_end`没有sourceInfo，不能用tool name作为Product Todo projection authority；
- wrapper只在纯additive active变化时浅拷贝外层result并保留nested `details`对象身份。真实Session focused test同时证明产品execute返回的details可被Extension实例识别并投影。

因此collision不是Session安全authority：遵循Pi precedence，不改Pi core priority，不阻止第三方winner，也不kill Session。产品definition未获winner时，ResourceLoader diagnostics通过既有`runtime.warning`投影一次Todo unavailable；第三方tool可正常执行，但没有产品Extension创建的WeakSet capability，不能产生`turn.tasks.updated`。reload重新执行同一判定。

## 5. Synara 母体与责任模式

只读核验的Synara为clean exact `c79fab498de1a911a14ff8b05bf83d0528ec54fa`；OmniMind adopted `8f9f60045…`是其ancestor，相差40 commits。对PiAdapter、各Engine task projection、provider-runtime contract、Orchestration/Web task消费的相关paths比较，`8f9f600… → c79fab4…` byte-identical。

- Synara stock Pi不自建Todo，只把supervised Bash与Gateway definitions交给Pi `customTools`，并保留ResourceLoader、ExtensionRunner与reload；
- Codex plan、Claude TodoWrite/TaskCreate/TaskUpdate、OpenCode `todo.updated`与ACP `update_todos`各留在native adapter owner，只在边界投影canonical `turn.tasks.updated`；
- Synara `7c32e880…`“Add Claude task tracking and resume coverage”把复杂task逻辑从ClaudeAdapter拆到`claudeTaskTracker.ts`，没有建立通用Task Manager。

OmniMind Agent Todo因此是允许的窄downstream Provider增强，不是声称Synara stock Pi已有同一功能。我们follow母体的责任模式：共享逻辑离开大adapter、native owner保留、adapter只做canonical projection、diagnostic可降级且失败可预测。

## 6. Prompt、schema成本与调用时机

Todo guidance只留在ToolDefinition自身：一句短guideline说明“进度可见有帮助时记录用户目标与重要成果；必要时先调查；不写内部tool/loading步骤”。immutable cognitive contract不再重复Todo流程，也不规定“第一轮规划”“必须先搜索”、复杂度分类器、回合计数、自动触发或workflow state machine。

当前exact OpenAI function envelope（name + description + parameters）序列化为754 UTF-8 bytes，`promptGuidelines` JSON为154 bytes；focused real-Session wire test证明Todo只出现在OmniMind Agent的首个、branch rollback后、reload后与resume后的请求，不出现在Chat或stock Pi。这个数字是当前candidate probe，不是长期API阈值；Provider-native encoding仍应按exact wire分别测量。

删除initial-active的触发条件不是“形式上所有工具都要动态化”，而是重复真实journey同时证明：schema成本或误调用造成实质损失，并且Todo自身的独立activation策略在任务成功、额外round trip、prompt/cache、恢复和维护成本上净胜。没有该证据时保留当前可观察行为。

## 7. Snapshot、branch、resume、reload 与失败语义

- 每次成功调用提交1–50个非空task的完整当前快照；状态仅`pending / in_progress / completed`，最多一个`in_progress`；空数组、非法状态、过长文本/说明和多个进行中项拒绝；
- Todo不持久化独立数据库。Product既有`turn.tasks.updated`/WorkLog消费逐回合快照；Goal继续由ThreadGoal持久owner拥有；
- branch rollback留在同一Pi Session/Extension实例；resume通过现有Session cursor创建新runtime和新Extension实例；reload使旧runner/handler失效并重建实例；
- per-instance WeakSet是易失capability，不是state store。只接受真实product execute返回的同一details对象一次；伪造、clone、replay或第三方同名result均不投影；
- Extension缺失、加载错误或同名precedence使产品definition未获winner时，Todo准确unavailable，其余Session、第三方Extension与Agent能力继续；不把可选进度投影失败升级为Session fatal。

## 8. 为什么不引入第三方 Todo 套件

Pi官方`examples/extensions/todo.ts`及pi-todotools、avtc、armory等候选只能作为Extension/session lifecycle证据。本轮不安装、不copied-adapt，也不引入phases、drop/abandoned、widget、slash command、额外prompt、Settings、migration或Package状态。

原因不是第三方实现质量差，而是当前产品已经有明确的三态全量快照与Workbench投影。完整引入会额外拥有mutable Todo history/session-entry replay、命令/UI、状态迁移和同步责任；copied-adapt则会重复现有小型validation与event contract。除非真实用户结果要求这些能力且现有owner无法窄补齐，否则净复杂度为负。

## 9. 验证矩阵与 revalidation triggers

| falsifier                                  | 必须结果                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| OmniMind Agent first request               | 产品Extension注册，winner时Todo initial-active；可用不等于must-call                            |
| Chat / stock Pi / other Engine             | 不注册产品Todo Extension                                                                       |
| valid full snapshot                        | canonical三态、trim、最多一个in-progress，可信结果先于turn terminal投影                        |
| empty / invalid / competing in-progress    | execute拒绝，不投影                                                                            |
| forged/replayed details                    | WeakSet identity不匹配或已消费，不投影                                                         |
| same-name global/project Extension         | Pi native winner可执行；Product Todo unavailable warning；Session不失败；无task projection污染 |
| reload introduces collision                | reload成功、Session继续；Product Todo降级且第三方结果不投影                                    |
| branch / resume / reload without collision | tool surface与projection保持；旧Extension handler不泄漏                                        |
| prompt/context                             | 无重复Todo policy；Todo不描述Host loader/activation；简单任务不被强制调用                      |
| Host dynamic loading                       | 只操作Host owned names；不识别、激活、移除或“保留”Todo                                         |

以下变化触发重审本文，而不是扩张Host研究：Pi inline Extension/sourceInfo/precedence或result identity语义变化；Todo schema/prompt/三态snapshot变化；work-surface admission变化；canonical `turn.tasks.updated`合同变化；真实schema成本/误调用出现显著反证；新增另一个OmniMind-exclusive Pi-native Session tool。未来新增项逐一按自身owner/lifecycle审查，不预建通用manager。

## 10. Agent Core composition 与 Extension 来源

Todo Extension 是 OmniMind 自行构建、随产品发行并长期维护的 first-party Session Extension。它属于 OmniMind Agent Core 的默认 composition，但 Agent Core 只组合它，不因此变成所有 Extension 的状态或业务 owner。

未来把第三方 Pi Extension 纳入 Agent Core 时只有两种可审计的主路径：

- **fork + modify**：保留 exact upstream ancestry、license/notice 和作者测试，只维护有界 patch。OmniMind 明确承担安全修复、兼容性、upstream sync、发行与回滚/退出；不得去掉来源后冒充从零自创，也不得因为 fork 就自动变成 AgentGateway Host tool。
- **直接安装**：保留上游 package identity、version、provenance 和原生语义，使用 Pi 现有 Package/Extension install、update、remove、reload 与 private-state lifecycle。OmniMind 只是 Host 与产品投影者，不静默接管第三方业务状态，不自动预装、修改、改名、分发给其他 Engine 或纳入 Host search。

直接安装与fork是不同的长期责任，不是两个打包开关。任何切换都要按 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) 重新锁定 exact source、rights、patch/dependency closure、更新/卸载、失败、回滚与 packaged journey。这些责任只记录在来源证据和原生 Provider lifecycle 中，不新建 Agent Core extension manifest、总 registry、Settings 或 control plane。
