# OmniMind Agent 能力表面：最小、真实、可操作

> 证据日期：2026-08-15
>
> 角色：Agent Core 用户表面的研究规格。产品 UI owner 仍是 `architecture/workbench.md`。

## 0. 裁决

OmniMind Agent 不需要新的 Agent dashboard、Team builder、Capability Center、Mission 页面或 Workflow 画布。当前 Workbench 已有足够宿主：Composer、Subagent Strip、child Thread/detail、Timeline、Files/Diff、Browser/Device、Settings/Library。

首发 UI 的工作不是“把能力都画出来”，而是让真实活动可见、真实控制可达、失败与恢复准确，并在任务结束后退场。

```text
平时：无额外 UI
运行：现有近手控制 + 低噪声活动
结果：Thread / Files / Diff / checks / receipt
阻塞：唯一可行动介入
```

## 1. 当前 Host 事实

现有 Subagent UI、child Thread identity 和 Provider event projection来自 Synara substrate，主要服务 Engine-native child。它不是 OmniMind Pi bounded child 已交付的证明。

当前真实风险：

- `ComposerSubagentStrip` 的 stop/background 控件按行显示，但 Pi是否支持必须由adapter capability决定；
- child Thread Composer会显示“在子 Agent 工作时发送消息”，但 Pi adapter当前没有child steer；
- Strip数量、stop、background、ARIA/title与status humanizer仍含硬编码英文；
- status normalizer未准确表达 `timed_out/crashed/interrupted/unknown`。

因此未来接入Pi child时，不能只发布`providerThreadId`就复用全部控制。**identity projection与control capability是两件事。**

## 2. 出现级别

每个事实使用最低充分表面：

| 级别                  | 条件                                     | 宿主                              |
| --------------------- | ---------------------------------------- | --------------------------------- |
| 无 UI                 | 没有用户可行动信息                       | 不显示                            |
| quiet receipt         | 结果会影响判断、恢复或归因               | Timeline/Activity一行             |
| active control        | 正在运行且可停止、转后台、发送消息或打开 | Composer/Subagent Strip           |
| blocking intervention | 登录、系统授权、真实范围分叉、冲突       | 现有approval/question/Diff review |

自然成功不Toast。不可用动作不显示；诊断需要时才显示`unsupported/unavailable/unknown`，不能把假按钮留给用户试错。

## 3. Bounded child

### 3.1 列表与身份

复用现有`ComposerSubagentStrip`与child Thread/detail。每行最少显示：

- 用户能理解的role/任务短名；
- exact model（需要消歧时）；
- running/completed/failed/cancelled/timed_out/crashed/interrupted/unknown；
- foreground/background；
- 当前adapter真实支持的控制。

稳定identity来自canonical child/provider thread identity。可以继续使用现有accent/图标语法，但不预建24×8 glyph系统、avatar registry或角色专属插画。先证明现有列表在真实并发规模下不足。

### 3.2 控制能力门

| 控制               | 显示条件                          | Pi首个候选要求             |
| ------------------ | --------------------------------- | -------------------------- |
| Stop one           | adapter可按child identity精准取消 | A停止，B和Root继续         |
| Stop all/Root stop | parent owner能取消整棵tree        | 所有child与后代进程归零    |
| Background         | Host支持该child类型转后台         | writer默认不允许           |
| Message/steer      | adapter/Host有真实in-flight steer | 缺失时不显示               |
| Resume             | exact terminal/run可真实resume    | 上游内部方法不等于产品支持 |
| Open               | canonical child Thread/detail存在 | 只读导航，不制造第二state  |

对terminal/stale identity的重复控制必须fail closed或幂等，不能abort Root。

### 3.3 Status全链

Provider result/event → WorkLog → Strip/detail/Activity → SQLite → reopen必须表达同一terminal。`cancelled`要区分targeted child stop与parent stop的provenance；`interrupted`用于App/Server崩溃后的准确恢复，不伪装成可自动续跑。

## 4. Goal、Todo与动态执行

Goal是Root行为，不是用户要创建的实体：

- 当前Thread只有一个objective；
- plan/Todo复用现有task list；
- Composer只显示当前步骤与必要控制；
- complete/blocked/wait进入最终回答或现有Activity；
- 范围变化只有真正需要用户选择时才介入。

普通Root/tool/child loop不画成DAG。Implement→Review→Rewrite、并行探索、branch/join都可以存在，但默认只通过已有child活动、Todo、Diff和结果表现。只有Engine已经回报结构化phase，才保留其native workflow projection；不能从时间顺序或文案猜dependency edge。

Workflow graph、spatial detail、React Flow/X6、100+ Agent topology全部defer。重开条件是：真实任务规模与明确dependency facts证明列表、筛选和child detail无法让用户完成判断。

## 5. 写入、Review与撤回

用户需要的不是“Writer Agent”卡片，而是：

- 同一Root delegation tree内不会有两个writer同时写；
- 外部编辑或另一个Thread不会被静默覆盖；
- Files/Diff显示实际变化；
- Review引用真实文件、诊断和测试；
- partial failure后能通过现有WorkspaceFileSystem/Git/Checkpoint owner理解并有界撤回。

冲突时使用现有Diff/Review表面，不新增writer lock页面、checkpoint store或Agent changes数据库。

## 6. Economics与权限

默认UI不显示内部schema digest、prefix bytes或cache breakpoint。用户需要判断成本时，复用现有usage/receipt表面，并准确区分reported/estimated/unknown；缺失值不能显示为0。

runtime mode是唯一产品权限选择。child不能超过Root；role只是标签。普通界面显示用户能判断的“只读/可修改”与必要恢复，不展示第二permission profile或逐tool matrix。

## 7. Skills、MCP、Browser与Device

- Skills/Plugins继续使用现有Library/Settings，保持真实identity、来源、冲突与unavailable；
- MCP继续使用现有Gateway/connection owner；
- Browser/Device继续使用现有pane与Timeline activity；
- Research role默认表示local/repo research，不因名字自动获得web/network；
- 外部research只有现有Browser/Search/Gateway owner单独准入后才显示对应能力。

不建立Capability Pack入口、Pack manager或跨Engine统一生命周期。

## 8. Memory/Knowledge

首次公开不提供自动Memory/Knowledge产品表面，也不预留空导航、图标、设置或“即将推出”卡片。当前继续使用workspace files、`rg/read`、Thread与native session/compaction。

未来只有outcome harness证明独立project-context writer有净收益时才重开；即使重开，也优先回到Files、Diff、Activity和现有Workbench，不先建Memory pane或Knowledge dashboard。

## 9. 双语、可访问性与密度

所有OmniMind-owned child status、role、control、tooltip、ARIA、empty/error/recovery文案必须同时进入zh-CN/en catalog。模型名、路径、命令、Provider原始诊断和真实asset identity保持原文。

必须验证：

- keyboard与focus return；
- stop one/stop all/background的focus与快捷键；
- screen reader可感知identity、status与control结果；
- reduced motion；
- 最小侧栏/Composer宽度；
- 典型并发下列表可读，不因未来极端规模提前建设图形系统。

## 10. 实施顺序

### UI-0：能力真实性

- adapter capability决定stop/background/message/resume是否显示；
- 补齐status contract与中英catalog；
- 不改整体视觉结构。

### UI-1：精准控制全链

- A/B并发stop A；
- parent stop-all；
- stale/terminal控制；
- status/receipt/SQLite/reopen一致。

### UI-2：写入与Review

- conflict进入现有Diff/Review；
- partial failure与撤回复用现有owner；
- 不建第二changes/checkpoint表面。

### UI-3：成熟task loop

- Goal/Todo/Review-Rewrite接入现有Composer/Timeline/Files；
- 完成后运行控件退场；
- 不新增workflow平台。

## 11. Stop conditions

- UI显示Host/adapter不存在的动作；
- stop one会终止Root或sibling；
- unknown/timed_out/crashed/interrupted被错误折叠；
- 中文路径出现硬编码英文产品文案；
- 同一child在多个表面身份或状态不一致；
- 同一事实同时进入多个卡片争夺主动作；
- 为了展示Agent Core新增dashboard、team builder、workflow graph、Capability Pack或第二state；
- 为了极端规模提前实现100+ Agent视觉系统；
- 局部UI绿色被写成mature Agent或release完成。
