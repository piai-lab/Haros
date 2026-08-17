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

- [source-review.md](source-review.md)：固定 UI 母体及其原生 Engine 接入的源码、权利、构建和兼容事实；§14 保存 Synara exact `712d88f…18ff998` 96-commit intake 的逐 SHA 证据及被后续推翻的旧 disposition，§15 保存 latest local `18ff998…8f9f600` 101-commit 审计、61 项已实现责任、standing-default 采用面、已确认的固定 divergence 与 whole-tree/packaged closure；当前没有被研究文档静默冻结的待确认非采用项。
- [../SYNARA-INTAKE.md](../SYNARA-INTAKE.md)：未来每轮 Synara 审查、辩证吸收、`$converge` 提问、实施授权与 exact-SHA 交付的唯一操作手册。
- [../PI-ECOSYSTEM-INTAKE.md](../PI-ECOSYSTEM-INTAKE.md)：未来每轮 Pi Core、Pi-compatible package/extension/skill/prompt/tool/MCP、OmniMind Agent Core 外部来源与必要 fork 的发现、exact-source 复核、两门授权、最小接入、验证和重新进入手册；不保存当前版本榜、安装状态或第二 package registry。
- [source-update-intake.md](source-update-intake.md)：2026-08-11 已完成 intake 的历史协议兼容入口；仅供旧链接与研究上下文引用，不拥有未来操作规则。
- [interface-surface-inventory.md](interface-surface-inventory.md)：OmniMind Desktop、公共网站、反馈、发行与本地集成接口的现状清单、公开分级和复验触发器；只保存可复核观察，不取代架构 owner。
- [model-services-composer-product-design.md](model-services-composer-product-design.md)：Model services 设置中心与 Composer Engine/模型/私有选项的产品设计说明，覆盖当前实现、Proma 可借鉴机制、Pi ModelRuntime 边界、目标交互、失败语义与完整验收矩阵；保存设计依据，不取代 Workbench、Product State、Execution 或 Campaign owner。
- [model-services-composer-new-session-execution-guide.md](model-services-composer-new-session-execution-guide.md)：绑定 2026-08-12 source snapshot 的历史实现分解与验证参考；保留当时的 owner map、纵向结果、focused/live/packaged falsifier 和 stop-loss，但不再是新会话入口，不决定今天的切片、准入、施工顺序或完成状态。
- [pi-native-product-integration-review.md](pi-native-product-integration-review.md)：锁定 Pi runtime 的成熟能力、OmniMind 产品 owner、Project membership trust、system prompt、动态工具、Extension Session replacement、fork/compaction/usage/package/TUI 边界与研究 SHA 反例；其中“先完成原 Model services 关注点、再从 merged main 复核”的顺序只描述当时快照，不约束今天的分支、准入或施工先后，也不取代 architecture、execution brief 或 Campaign。
- [omnimind-prompt-management-review.md](omnimind-prompt-management-review.md)：从当前 merged `main` 延续 Pi-native Prompt 证据，专项复核 OmniMind 默认身份、`SYSTEM.md`/`APPEND_SYSTEM.md`/`AGENTS.md`/Prompt templates 的真实 owner 与 precedence、动态 Extension/Tool/Permission/operation snapshot、Session reload/reopen、错误的 localStorage Project instructions、Host prompt diet，以及一个克制的 Settings `Prompts / 提示词` section；给出只读投影、最小可写 seam、分 Slice proof、stop-loss 与仍待 owner裁决的分叉，不取代 Workbench/Product State/Execution、execution brief 或 Campaign。
- [omnimind-agent-core-ecosystem-orchestration-review.md](omnimind-agent-core-ecosystem-orchestration-review.md)：绑定旧 SHA `a9adf9fb9` 的历史深度研究，保留 Prompt Diet、Agentic Search、Memory/Wiki 分工、Pi package 候选矩阵、外部证据、压力测试与风险登记；其旧代码状态、时点信号和 Slice 顺序必须在当前 `main` 重验，不是现行施工入口，也不取代下列 Agent Core canonical research。
- [omnimind-agent-core-design.md](omnimind-agent-core-design.md)：OmniMind Agent Core 的研究设计与证据地图，明确 Core 只属于 Pi-derived OmniMind Agent，并与其他 Engine 的 native runtime、Product substrate/Workbench 和 additive Capability Packs 分层；记录现有 Pi/Skills/Gateway/Provider adapter 代码真值、runtime-mode/settlement/usage/Skill identity+availability/Gateway MCP identity+conflict 缺口、bounded Delegate 与 result-driven workflow、自动 Project Context（Knowledge + sparse Memory）、Context/Cache 经济学、exact-source disposition 和可证伪实验；不取代 Execution、Product State、Workbench、Campaign 或施工顺序 owner。
- [omnimind-agent-core-execution-guide.md](omnimind-agent-core-execution-guide.md)：已退休施工门的非阻塞验证参考；只保存 effective instructions、bounded child control、writer、model/terminal/economics、完整 Synara Goal/Todo、search/context、交付与 stop-loss falsifier，不定义阶段、当前状态或准入。
- [omnimind-agent-capability-surface.md](omnimind-agent-capability-surface.md)：基于当前 OmniMind 真实侧栏、header、Composer stack、Timeline、Workbench Environment card 和 right dock 的 Agent 能力投影规格；先用 host-reuse ledger 固定 Todo、子智能体、审批、Browser/Device、Files/Diff、Knowledge/Memory 与恢复的现有 owner，阻止研究原型生成第二组件树；再定义目标、Engine-native workflow、自动记忆/知识、恢复、Computer Use、Skills/Plugins 何时无 UI、何时显示结果、何时允许介入。HTML 用接近真实宿主的 integrated storyboard 验证同一 exact-task workflow snapshot 的四个互斥职责，以及顺序/并行/选择/回环四种最小结构原语、4/20/120-Agent 层级和 running→terminal result morph；Environment 只保留当前任务 latest receipt，Composer 完成后退场，RightDock 冻结为结果图。当前 Claude fixture 仍只画真实 phase order/containment；其他拓扑是独立 explicit research fixture，不反向伪造 runtime dependency。它供后续与 React Flow read-only profile 做 focused bake-off，自身不是 production component 或 renderer 结论。不取代 `architecture/workbench.md`，也不拥有实施顺序。
- [omnimind-responsive-workbench-review.md](omnimind-responsive-workbench-review.md)：以用户提供的 OmniMind/Codex 连续窗口截图、当前 `main` 的 Chat shell/Environment/Sidebar/RightDock/Composer/i18n 真实调用链、官方 Codex 产品职责说明和已冻结 `.zq-ui/responsive-workbench` storyboard 为证据，审判 Environment 固定 `312px` inset、Sidebar 仅移动断点、RightDock 固定分栏、手动偏好与自动压制混合、Environment/Workbench 同名及中英表面缺口；给出稳定主画布、辅助 inspector、真实工作台、全局导航四角色、几何不变量、最小 presentation state、冰山验证矩阵、stop-loss 与复验触发器。它不改变 Project instructions 行为，不取代 Workbench、Execution、Campaign 或施工顺序 owner。
- [decision-record.md](decision-record.md)：已明确 superseded 的历史路线、当时的反方压力测试与被替代原因；不拥有当前执行权。
