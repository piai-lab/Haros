# Pi-native Todo Extension：owner、provenance 与生命周期复核

> 证据日期：2026-08-18
>
> 状态：责任方向已确认；exact-source事实已核验；本地代码仅为可丢弃candidate，尚未push、合并、打包、真实journey验证或产品交付
>
> 唯一职责：记录OmniMind Agent Todo Extension。稳定运行时合同属于[`architecture/execution.md`](../architecture/execution.md)；AgentGateway Host动态加载属于[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)。

## 1. 已确认的产品与 owner 结论

`SIMPLIFY → GO`：保留现有Todo逐回合三态全量快照与canonical `turn.tasks.updated`结果，但让Todo成为一个独立、OmniMind-authored、product-bundled、named、hidden的Pi-native Session Extension。

- 只在canonical `provider === "omnimind" && workSurface === "agent"`的Pi Session注册；OmniMind Chat、stock Pi和其他Engine不注册；
- 在该Session首个模型请求前initial-active。active只表示schema当轮可选择，不表示首轮必须调用、自动执行、已经授权或跨应用常驻；
- Agent按真实不确定性决定时机：理解不足时先调查；理解足够、任务确实非平凡且进度投影有帮助时才创建或修订Todo；简单任务不用；
- Todo是可修订的当前快照，只记录用户目标与重要成果，不记录loader、tool activation、函数名等内部plumbing；
- Todo不进入AgentGateway Host Extension、Host动态加载、third-party MCP或Built-in Host exposure policy，不建立第二state、registry、Settings、Package install state、migration或control plane。

Pi built-ins、supervised Bash、AgentGateway Host tools与其他Extensions均不由本文编目或协调；它们继续服从各自唯一owner。新增其他session tool也必须建立自己的bounded owner/evidence，不得把本文扩成Session Tool Manager。

## 2. 当前事实与本地候选必须分开

当前公共产品基线把Todo definition、prompt、`provider/workSurface`分支与event projection集中在`PiAdapter.customTools`路径。这个downstream-only lone wolf横跨definition、prompt、Session lifecycle例外和事件authority，导致Host研究误分类、active-set判断漂移，并让同名tool仅凭名字接近Product projection authority。

本地任务分支已有一个未push代码candidate（`779b6d759…`），尝试把definition、prompt、validation与实例级result provenance迁到独立inline Extension，PiAdapter只保留Session装配和canonical event桥。该commit是可丢弃、可重构的验证草图，不是已采用产品事实；本文只记录其假设和falsifier，不授予继续施工或交付权。

## 3. Exact Pi `0.84.2` 事实

锁定artifact为bundled `@omnimind/pi-coding-agent@0.84.2`，对应upstream `914cf147…`：

- public `DefaultResourceLoaderOptions.extensionFactories`接受named/hidden `InlineExtension`，并形成可检查的`<inline:name>` source path；
- `AgentSession`初始`_buildRuntime({ includeAllExtensionTools: true })`会让Extension tools进入active set，因此Todo保持initial-active不需要另建loader或激活控制器；
- reload重载ResourceLoader、使旧runner失效并创建新Extension实例；resume/branch仍必须按exact Session行为分别证明；
- `getAllTools()`返回Pi Registry winner的`sourceInfo`；ResourceLoader保留同名Extension并报告conflict diagnostics，ExtensionRunner按原生加载顺序选择first registration；
- user/project/global来源先于inline factory时，第三方同名tool可以成为native winner；Product不能改Pi priority、阻止winner执行或把冲突升级为整个Session fatal；
- `tool_execution_end`不携带sourceInfo，所以tool name本身不能成为Product Todo projection authority；
- current wrapper在纯additive active变化时浅拷贝外层result并保留nested `details`对象身份。对象身份能否作为长期provenance seam仍须受exact版本与真实Session回归保护。

这些事实只证明Pi公开seam和冲突/生命周期约束，不自动证明本地candidate已经具备packaged可靠性。

## 4. 候选实现形状与待实证问题

候选调用链是：

```text
Product Session admission (omnimind + agent)
  → resourceLoaderOptions.extensionFactories
  → named hidden Todo inline Extension
  → pi.registerTool(existing three-state snapshot definition)
  → Pi Registry / session initial-active tool surface
  → candidate execute validates one complete snapshot
  → candidate provenance marks its exact result details
  → trusted tool_execution_end callback
  → PiAdapter projects canonical turn.tasks.updated
```

候选当前使用Extension-instance WeakSet识别exact returned `details`对象。focused source tests支持真实Session中的对象身份、同名冲突降级、reload与event order，但进入已采用实现前仍必须证明：

- Agent首个请求、branch、resume、reload与Session replacement下Todo surface和旧handler fence准确；
- Chat、stock Pi与其他Engine无Product Todo Extension；
- 同名global/project Extension遵循Pi winner、正常执行且不获得`turn.tasks.updated`authority；
- Product Extension失去winner或加载失败时只让Todo unavailable，Session其余能力继续，并复用既有diagnostic surface；
- packaged runtime没有clone/serialization破坏provenance；若对象身份不稳定，只能采用最小、实例内、可删除的fail-closed seam，不能扩张成全局provenance framework。

## 5. Todo语义与上下文成本

- 每次成功调用提交1–50个非空task的完整当前快照；状态仅`pending / in_progress / completed`，最多一个`in_progress`；
- 空数组、非法状态、过长文本/说明和多个进行中项拒绝；
- Todo不持久化独立数据库。Product既有`turn.tasks.updated`/WorkLog消费逐回合快照；Goal继续由ThreadGoal持久owner拥有；
- guidance只需一句自然原则：进度可见有帮助时记录用户目标与成果，必要时先调查，不写内部tool/loading步骤；不规定第一轮规划、必须先搜索、复杂度分类器、回合计数或自动触发；
- 当前candidate测得OpenAI function envelope约754 UTF-8 bytes、`promptGuidelines`约154 bytes。这是probe，不是长期阈值，也不能替代exact Provider wire与误调用journey。

只有真实wire schema成本或误调用造成显著产品损失，并且Todo自身的独立activation策略在成功率、额外round trip、prompt/cache、恢复与维护成本上净胜，才重审initial-active；Host loader永不接管Todo。

## 6. Synara 与第三方来源证据

只读核验的Synara为clean exact `c79fab498de1a911a14ff8b05bf83d0528ec54fa`；OmniMind adopted `8f9f60045…`是其ancestor，相差40 commits。相关PiAdapter、Engine-native task projection、Provider runtime contract、Orchestration与Web task消费paths在该range内byte-identical：Synara stock Pi不自建Todo；Codex、Claude、OpenCode与ACP各保留native task owner，只在adapter边界投影canonical `turn.tasks.updated`。`7c32e880…`把Claude task逻辑抽到`claudeTaskTracker.ts`，没有建立通用Task Manager。

Pi官方`examples/extensions/todo.ts`及pi-todotools、avtc、armory只能作为Extension lifecycle证据。本轮不直接安装、不fork、不copied-adapt，也不引入phases、drop/abandoned、widget、slash command、额外prompt、Settings、migration或Package状态。Todo的来源结论只有一个：OmniMind-authored、product-bundled、Agent-surface Session Extension；通用fork/直接安装规则只由[`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)拥有。

## 7. 验证矩阵

| falsifier                               | 当前要求                                                                               | 成熟度                   |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------ |
| OmniMind Agent first request            | Product Extension注册，winner时Todo initial-active；可用不等于must-call                | confirmed direction      |
| Chat / stock Pi / other Engine          | 不注册Product Todo Extension                                                           | confirmed direction      |
| valid full snapshot                     | canonical三态、trim、最多一个in-progress，可信结果先于turn terminal投影                | candidate focused proof  |
| empty / invalid / competing in-progress | execute拒绝，不投影                                                                    | candidate focused proof  |
| forged/replayed details                 | candidate provenance不匹配或已消费，不投影                                             | candidate focused proof  |
| same-name global/project Extension      | Pi native winner可执行；Product Todo unavailable；Session不失败；无task projection污染 | candidate focused proof  |
| branch / resume / reload                | tool surface与projection保持，旧Extension handler不泄漏                                | focused + journey needed |
| prompt/context                          | 无重复Todo policy；不描述Host loader/activation；简单任务不被强制调用                  | candidate focused proof  |
| packaged real journey                   | fresh isolated App中Agent/Chat、重开与warning呈现准确                                  | open                     |

## 8. Revalidation triggers

只在以下事实变化时重审本文：Pi inline Extension/sourceInfo/precedence/result identity语义变化；Todo schema/prompt/三态snapshot变化；work-surface admission或canonical `turn.tasks.updated`合同变化；真实schema成本/误调用出现显著反证；本地candidate被重构或丢弃。

新增其他Pi-native Session tool按自身owner/lifecycle独立审查，不路由到本文，也不预建通用manager、inventory或控制面。
