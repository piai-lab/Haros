# Research

本目录保存可推翻、可复核的证据：固定来源审判、实验、失败、反例、被替代路线和复验条件。它不拥有产品 doctrine、架构 contract、施工顺序或 Campaign 状态。

## 规则

- 外部项目、作者、仓库、revision、package 和模型名称应真实记录，不能用中性代号牺牲可审计性。
- 每项结论区分 fixed-source fact、local observation、external evidence、inference 和 assumption。
- README、截图、stars、下载量和作者宣传只能发现候选，不能证明能力。
- 同一输入和调用路径没有新 falsifier 时不重复 probe；revision、artifact、toolchain、platform、protocol 或真实调用路径变化时，只复验受影响结论。
- 被接受的稳定职责进入 `architecture/`；真实生产 adoption 进入根 README 的机器披露；验收状态只进入 Campaign。
- research 文件可以保留历史错误，但必须明确 superseded，不能倒改成今天看起来正确的故事。

## 索引

- [source-review.md](source-review.md)：固定 UI 母体及其原生 Engine 接入的源码、权利、构建和兼容事实。
- [../SYNARA-INTAKE.md](../SYNARA-INTAKE.md)：未来每轮 Synara 审查、辩证吸收、`$converge` 提问、实施授权与 exact-SHA 交付的唯一操作手册。
- [source-update-intake.md](source-update-intake.md)：2026-08-11 已完成 intake 的历史协议兼容入口；仅供旧链接与研究上下文引用，不拥有未来操作规则。
- [interface-surface-inventory.md](interface-surface-inventory.md)：OmniMind Desktop、公共网站、反馈、发行与本地集成接口的现状清单、公开分级和复验触发器；只保存可复核观察，不取代架构 owner。
- [decision-record.md](decision-record.md)：已明确 superseded 的历史路线、当时的反方压力测试与被替代原因；不拥有当前执行权。
