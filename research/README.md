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
- [../PI-ECOSYSTEM-INTAKE.md](../PI-ECOSYSTEM-INTAKE.md)：未来每轮 Pi Core、Pi-compatible package/extension/skill/prompt/tool/MCP、OmniMind Agent Core 外部来源与必要 fork 的发现、exact-source 复核、两门授权、最小接入、验证和重新进入手册；不保存当前版本榜、安装状态或第二 package registry。
- [source-update-intake.md](source-update-intake.md)：2026-08-11 已完成 intake 的历史协议兼容入口；仅供旧链接与研究上下文引用，不拥有未来操作规则。
- [interface-surface-inventory.md](interface-surface-inventory.md)：OmniMind Desktop、公共网站、反馈、发行与本地集成接口的现状清单、公开分级和复验触发器；只保存可复核观察，不取代架构 owner。
- [model-services-composer-product-design.md](model-services-composer-product-design.md)：Model services 设置中心与 Composer Engine/模型/私有选项的产品设计说明，覆盖当前实现、Proma 可借鉴机制、Pi ModelRuntime 边界、目标交互、失败语义与完整验收矩阵；保存设计依据，不取代 Workbench、Product State、Execution 或 Campaign owner。
- [model-services-composer-new-session-execution-guide.md](model-services-composer-new-session-execution-guide.md)：面向零聊天记忆新会话的实施执行指南，map/ref 前述设计说明与现有 sole owner，按 entry、纵向切片、文件 owner、focused/live/packaged proof 和 stop-loss 指导施工；不保存 Campaign 状态或第二套全局施工顺序。
- [pi-native-product-integration-review.md](pi-native-product-integration-review.md)：锁定 Pi runtime 的成熟能力、OmniMind 产品 owner、Project membership trust、system prompt、动态工具、Extension Session replacement、fork/compaction/usage/package/TUI 边界与研究 SHA 反例；明确“原 Model services 分支先 completion review/merge，Pi-native 从 merged main 开下一轮”的阶段边界，并提供发现未知成熟机制的 intake 方法；不取代 architecture、execution brief 或 Campaign。
- [omnimind-agent-core-ecosystem-orchestration-review.md](omnimind-agent-core-ecosystem-orchestration-review.md)：绑定旧 SHA `a9adf9fb9` 的历史深度研究，保留 Prompt Diet、Agentic Search、Memory/Wiki 分工、Pi package 候选矩阵、外部证据、压力测试与风险登记；其旧代码状态、时点信号和 Slice 顺序必须在当前 `main` 重验，不是现行施工入口，也不取代下列 Agent Core canonical research。
- [omnimind-agent-core-design.md](omnimind-agent-core-design.md)：OmniMind Agent Core 的研究设计与证据地图，明确 Core 只属于 Pi-derived OmniMind Agent，并与其他 Engine 的 native runtime、Product substrate/Workbench 和 additive Capability Packs 分层；记录现有 Pi/Skills/Gateway/Provider adapter 代码真值、runtime-mode/settlement/usage/Skill identity+availability/Gateway MCP identity+conflict 缺口、bounded Delegate 与 result-driven workflow、自动 Project Context（Knowledge + sparse Memory）、Context/Cache 经济学、exact-source disposition 和可证伪实验；不取代 Execution、Product State、Workbench、Campaign 或施工顺序 owner。
- [omnimind-agent-core-execution-guide.md](omnimind-agent-core-execution-guide.md)：面向零聊天记忆新会话的执行指南；每次实时读取 `execution-brief.md`，自身不复制阶段快照。它把 full-access/settlement/usage/Skill/Gateway truth repairs、bounded Delegate、result-driven workflow、基于现有 Codex/Claude SDK/OpenCode adapter 的跨 Engine Capability Pack、Goal/Todo、自动 Knowledge 对照实验、external MCP/Search、同一 Project Context owner 下的 automatic project memory，以及 Workflow Timeline/Composer/Environment/RightDock 四投影拆成互不捆绑的独立 Slice，并为每个 Slice 给出 Entry、最小改动、禁止项、focused/live/packaged proof、stop-loss、回滚和交接合同。
- [omnimind-agent-capability-surface.md](omnimind-agent-capability-surface.md)：基于当前 OmniMind 真实侧栏、header、Composer stack、Timeline、Workbench Environment card 和 right dock 的 Agent 能力投影规格；先用 host-reuse ledger 固定 Todo、子智能体、审批、Browser/Device、Files/Diff、Knowledge/Memory 与恢复的现有 owner，阻止研究原型生成第二组件树；再定义目标、Engine-native workflow、自动记忆/知识、恢复、Computer Use、Skills/Plugins 何时无 UI、何时显示结果、何时允许介入。HTML 用接近真实宿主的 integrated storyboard 验证同一 exact-task workflow snapshot 的四个互斥职责，以及顺序/并行/选择/回环四种最小结构原语、4/20/120-Agent 层级和 running→terminal result morph；Environment 只保留当前任务 latest receipt，Composer 完成后退场，RightDock 冻结为结果图。当前 Claude fixture 仍只画真实 phase order/containment；其他拓扑是独立 explicit research fixture，不反向伪造 runtime dependency。它供后续与 React Flow read-only profile 做 focused bake-off，自身不是 production component 或 renderer 结论。不取代 `architecture/workbench.md`，也不拥有实施顺序。
- [decision-record.md](decision-record.md)：已明确 superseded 的历史路线、当时的反方压力测试与被替代原因；不拥有当前执行权。
