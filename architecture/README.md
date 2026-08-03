# Architecture

本目录保存已经接受、会长期约束实现的产品架构。它展开根 `README.md` 的产品宪法，但不复制研究过程、施工顺序或 Campaign 状态。

## 信息权威

| Fact class | Sole owner | 其他文件如何使用 |
| --- | --- | --- |
| 产品身份、战略不变量与 production adoption | 根 [`README.md`](../README.md) | 架构只实现其边界，不复制来源清单 |
| 稳定职责、产品事实、进程边界与完整 UI 契约 | 本目录的专题 owner | 根与施工文件只摘要并链接 |
| 固定来源事实、失败、反例与复验触发器 | [`research/`](../research/README.md) | 证据不直接变成当前设计 |
| 施工顺序、进入/停止条件与阶段 proof | [`execution-brief.md`](../execution-brief.md) | 消费架构，不发明 topology 或对象 |
| Campaign claim 状态与证据指针 | [`missions/independent-omnimind-v1.md`](../missions/independent-omnimind-v1.md) | 状态不定义需求或施工计划 |

架构文件只描述当前有效设计，不保存 `open / candidate / verified`。若新证据命中复验条件并推翻设计，应在一次获授权变更中修复 sole owner 和所有路由；不得追加兼容叙事制造双重真相。

## 专题责任图

| Topic owner | 完整负责 | 不负责 |
| --- | --- | --- |
| [`workbench.md`](workbench.md) | 所有用户可见行为、UI source-domain preserve/adapt/delete gate、失败/恢复呈现、性能与可访问性 | 持久事实目录、Engine 私有语义或进程 topology |
| [`product-state.md`](product-state.md) | 产品事实、七个 durable product objects、Queue-to-Run 转移、receipt/恢复与权限真实性 | 详细进程布局或完整 UI 行为 |
| [`execution.md`](execution.md) | 完整进程 topology、target responsibility layout、Native/External Engine 权威和故障边界 | Campaign 状态、来源结论或第二套产品对象目录 |

一个任务涉及多个 topic 时必须逐个完整读取；本索引不是它们的缩写，也不提供第二套物理文件树或对象清单。

## 共同设计准则

- 用户可见产品事实、Engine 私有事实和外部系统事实各有唯一权威。
- wire evidence 先转成强类型事实，再形成增量 projection 和局部 view model。
- 进程隔离缩小崩溃域，不自动构成文件、网络或系统调用沙箱。
- 产品表面保持克制；状态、进度、权限、恢复和动效必须由真实回执与失败语义支撑。
- 第一位普通消费者先使用具体实现；第二位真实消费者出现后再提炼最小公共合同。
