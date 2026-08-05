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
- [source-update-intake.md](source-update-intake.md)：维护者主动发起 adopted source 更新时的长期 taste、只读审查、共同裁决与显式施工授权协议。
- [decision-record.md](decision-record.md)：从两个极端判断收敛到当前路线的理由、反方压力测试和复验条件。
