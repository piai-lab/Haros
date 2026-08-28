# Architecture

本目录保存已经接受、会长期约束实现的产品架构。它展开根 `README.md` 的产品宪法，但不复制研究过程、施工顺序或 Campaign 状态。

## 信息权威

| Fact class                                 | Sole owner                                                                      | 其他文件如何使用                   |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------- |
| 产品身份、战略不变量与产品 taste           | 根 [`README.md`](../README.md)                                                  | 架构只实现其边界，不复制来源清单   |
| exact source adoption                      | 根 [`source-adoptions.json`](../source-adoptions.json)                          | 架构不复制 revision、digest 或权利 |
| 稳定职责、产品事实、进程边界与完整 UI 契约 | 本目录的专题 owner                                                              | 根与施工文件只摘要并链接           |
| 固定来源事实、失败、反例与复验触发器       | [`research/`](../research/README.md)                                            | 证据不直接变成当前设计             |
| 当前工作目标、并发协调、真实阻塞与下一动作 | [`execution-brief.md`](../execution-brief.md)                                   | 消费架构，不发明 topology 或对象   |
| Campaign claim 状态与证据指针              | [`missions/independent-omnimind-v1.md`](../missions/independent-omnimind-v1.md) | 状态不定义需求或施工计划           |

架构文件只描述当前有效设计，不保存 `open / candidate / verified`。若新证据命中复验条件并推翻设计，应在一次获授权变更中修复 sole owner 和所有路由；不得追加兼容叙事制造双重真相。

## 专题责任图

| Topic owner                              | 完整负责                                                                                              | 不负责                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`workbench.md`](workbench.md)           | 所有用户可见行为、UI source-domain preserve/adapt/delete gate、失败/恢复呈现、性能与可访问性          | 持久事实目录、Engine 私有语义或进程 topology       |
| [`public-surface.md`](public-surface.md) | canonical public origin、Public Surface Registry、激活门、不可用行为、反馈数据边界与发行/更新权威分离 | 网站视觉/内容实现、Runtime topology 或产品状态对象 |
| [`product.md`](product.md)               | 继承的 Project/Thread/Space 产品事实、Conversation/native Session 边界、Queue admission 与恢复真实性  | 详细进程布局、完整 UI 行为或 Provider 私有生态     |
| [`execution.md`](execution.md)           | 单一 Product Orchestration、Provider Registry/adapters、进程 topology、OS capability 与故障边界       | Campaign 状态、来源结论或第二套产品对象目录        |

一个任务涉及多个 topic 时必须逐个完整读取；本索引不是它们的缩写，也不提供第二套物理文件树或对象清单。

## 共同设计准则

- 用户只需要理解 OmniMind。Synara/Pi 作为 source/runtime/compatibility lineage 留在实现、About、Licenses、诊断和用户主动打开的 Provider detail，不进入普通产品语言。
- 用户可见产品事实、各 Provider 私有事实和外部系统事实各有唯一权威。
- wire evidence 先转成强类型事实，再形成增量 projection 和局部 view model。
- 进程隔离缩小崩溃域，不自动构成文件、网络或系统调用沙箱。
- 共用产品层只承载 Synara 已经证明需要跨 Provider 稳定的用户事实；native Session、protocol、capability、permission 与 ecosystem 保持 Provider-specific。
- Host-owned capability 保持一个 Host catalog、execution 与 authority owner；进入某个 Engine 时优先通过该 Engine 官方的 Extension、Tool、MCP 或等价组合机制投影，不用跨 Engine Host 抽象取代 native registry、active set、Provider 编码或 lifecycle。
- 产品名词优先映射到既有 Project、Thread、Space、Studio 与 Provider discovery；没有第二个真实 owner 时，不创建新的 aggregate、registry 或生命周期。
- 产品表面保持克制；状态、进度、权限、恢复和动效必须由真实回执与失败语义支撑。
- 删除一个字段、步骤、入口或 owner 若不会删掉真实用户选择，也不会删掉必须区分的系统事实，就应删除。
- 公共合同只在已证明的稳定变化轴上建立；消费者数量不是机械门槛，想象中的未来也不是准入证据。
