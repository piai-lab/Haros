# Product state

## 核心原则

OmniMind 对用户可见、跨 Engine、需要恢复和解释的产品事实负责；Engine 对自己的原生执行语义负责；文件系统、Git、Remote 和外部服务继续拥有其真实副作用。

产品状态不能复制一份 Engine transcript、queue 或 Tool log 后宣称自己更权威，也不能因为依赖 Engine 就放弃可见 Conversation、派发回执和失败恢复。

## 权威映射

| Fact | Authority | OmniMind responsibility |
| --- | --- | --- |
| Workspace and workbench layout | Product | folder/location references, tabs, panes and display preferences |
| Visible Conversation and Timeline | Product | durable user entries, visible assistant results and attention states |
| Run selection and dispatch | Product | freeze requested choices, resolve actual runtime and record receipt |
| Native Session, transcript and branch | Native Engine | preserve native continuation, compaction and private state |
| Pre-dispatch Composer Queue | Product | editable ordered user intent with frozen next-Run choices |
| Accepted Engine operations | Engine | native queue, steer, follow-up, retry, abort and settlement |
| Package source and activation | Product | rights, trust, exact artifact, generation, lease and rollback |
| Package loading and private state | Native Engine / Package | format, lifecycle, tools, extensions and private data |
| Files and directories | Owning filesystem | observe versions; mutate only through proved writer admission |
| Git state | Git repository | show and operate Git facts without using Git as recovery fiction |
| Remote process or external job | Remote host / service | retain references, receipts and visible observations |

## 七个产品对象

- `Workspace`：产品位置、布局和桌面偏好的容器；不吞并真实文件、Git 或 Engine Session。
- `Conversation`：用户长期可见的工作身份，可跨多个 Run 与 Engine。
- `Entry`：用户输入、Assistant 最终可见内容、结构化问答和必要系统结果。
- `Run`：一次发送的请求快照、实际执行回执、可见结果和失败确定性。
- `EngineBinding`：Conversation 与一个原生或外部 Session 的不透明 lineage 引用。
- `ResourceRef`：文件、Diff、Terminal、Artifact、图片、报告或外部任务引用。
- `OperationReceipt`：产品批准、派发或观察到的副作用及其确定性。

这些是产品职责，不要求全部成为独立 aggregate、数据库表或 package。真实实现应使用最少结构维护不变量。

Package 的来源、权利、信任、exact artifact、兼容报告、current/LKG generation 与 lease 仍由 Product 负责，但不增加第八个 durable product object。Package generation 是 activation、lease 和 Run receipt 中冻结的值，不是本文要求实现的独立 `PackageGeneration` aggregate。若未来实现证据证明需要新对象，只能由本文重新作出架构裁决，不能由施工文件顺手创建。

## Conversation、Run 与 Session

Conversation 不是 Engine Session。Session 存在且 lineage 兼容时，优先原生继续；Session 丢失时，Conversation 仍可读，但 compaction、隐藏上下文、Extension 私有状态等损失必须准确说明。

一次 Run 在派发前冻结：

- Engine；
- Model；
- Thinking/Reasoning；
- permission policy 与 enforcement truth；
- ExecutionTarget；
- ResourceRef；
- workspace observation；
- Package generation。

Composer 中切换选择只影响下一次发送，不热换当前 Run，不创建 Conversation，不生成 Handoff、Toast 或 Timeline 消息。从其他 Engine 返回旧 Engine 时，若原 lineage 已与可见 Conversation 分叉，应从当前可见事实建立新 lineage，而不是恢复陈旧 Session。

## Queue 的唯一分界

“产品 Queue”和“Engine queue”不能同时拥有同一条消息：

1. 用户尚未派发的消息由 Composer Queue 拥有，可编辑、删除、排序，并冻结下一次 Run 选择。
2. Product Control Plane 接纳后，该项从可编辑 intent 转为 `Run` 和 dispatch receipt，再派发给选定 Engine。
3. Engine 接受后，native queue、steer、follow-up、retry、abort 与 settlement 由 Engine 原生语义拥有；OmniMind 只投影能力、回执和可见状态。
4. 无法证明 Engine 是否接受时保留原用户输入并记录 `delivery_unknown`；不得把它偷偷放回可编辑 Queue，也不得经原 Engine 或其他 Engine 自动重放。

这条边界既保留优秀 Queue UI，也避免两套 Harness 都认为自己可以继续执行。

## Timeline 与 Activity

Timeline 是规范的用户可见历史，不是 wire event log。长期保存仅限：

- 用户输入与 Assistant 可见结果；
- 结构化问题及回答；
- 重要 Activity 摘要；
- 文件、Diff、Terminal、Output 和外部任务引用；
- 必要的失败、中断、恢复和 `outcome_unknown`。

原始 Engine event、隐藏 reasoning、逐 token 更新和内部 Tool chatter 只能作为有界、脱敏、带版本的诊断证据。它们必须先转成 typed facts，再聚合成稳定 Activity；React 不消费永久 `payload: unknown` 总线。

## 接纳、派发与恢复

发送遵循小型 transactional outbox：

1. 原子保存用户 Entry、选择和待派发请求；
2. Host 解析 exact runtime、Session 和 Package generation；
3. Engine 接受后记录 opaque operation/session reference；
4. 流式事实更新增量 projection；
5. 最终写入可见结果与 settlement receipt。

崩溃、断连或 timeout 发生在 dispatch 之后时，不能推断副作用未发生。只有外部 authority 或 Engine receipt 能把 `outcome_unknown` 收敛为 settled。恢复不得盲目重放非幂等动作，也不得用用户 Git 的 reset、checkout 或 stash 代替产品恢复。

## 权限真实性

`Approval required / Auto / Full access` 描述用户策略；`host-enforced / engine-enforced / mixed / unverified` 描述真实强制来源。后者必须由实际调用路径和拒绝副作用测试得出，不能由 renderer 回传或由协议名称推断。
