# OmniMind — Agent Routing and Safety

本文件只定义 Agent 的读取路由、歧义处理和仓库操作安全。产品宪法、完整 UI、产品事实、进程拓扑、施工顺序和 Campaign 状态各有唯一 owner，不在这里复述。

## 必读顺序

开始任何设计、代码或移植前按同一顺序读取：

1. `README.md`；
2. `architecture/README.md`，并完整读取本任务涉及的专题 owner；
3. `execution-brief.md`；
4. `missions/independent-omnimind-v1.md`（status 为 active 时），仅用于状态与证据引用；
5. 只有来源、既往裁决或潜在反证与任务相关时，才读取 `research/README.md` 与对应研究文件。

顺序不授予权威。若两个文件对同一事实给出可执行但冲突的要求，停止产品施工，先在获授权范围内修复 sole owner 与全部路由；不能修复时报告阻塞，不凭更新时间、聊天记录或 Campaign 状态选边。

## 任务路由

- UI、信息架构、视觉、交互、stream/scroll、性能或可访问性：`architecture/workbench.md`。
- Workspace、Conversation、Entry、Run、Queue、权限、receipt、恢复或产品事实：`architecture/product-state.md`。
- 进程、Host、Product Control Plane、Native/External Engine 或 ExecutionTarget：`architecture/execution.md`。
- 当前施工顺序、进入/停止条件和阶段 proof：`execution-brief.md`。
- Claim 状态与已有证据指针：active Campaign。
- 固定来源、版本、权利、构建/运行观察或结构性反证：`research/README.md` 路由的对应 evidence owner。

新会话不能用历史聊天、自动摘要或旧 handoff 补齐权威文档缺口。实现意图仍不能唯一推出时，先修 owner；当前任务未授权该修复时，停止并指出精确冲突。

## 工作与验证

- 开始前核相关入口、`git status --short` 和一个可观察成功条件；只改任务允许的路径，保留未知修改。
- 使用最小完整实现和现有模式；不创建平行架构真相、ledger、manifest、第二 Campaign 或无必要的兼容双轨。
- 开发期运行最窄、能证伪当前结论的检查；候选冻结后才在同一 SHA 运行相关 final gate。局部绿色不得扩张为未覆盖结论。
- Campaign producer 只能把受影响 claim 提交为 `candidate`，不能自证 `verified` 或整体完成；状态变更必须有对应授权和证据。
- 若 owner 缺失、证据触发条件未满足或现有失败没有新假设，不重复相同 probe，也不把旧证据改写为新结论。

## 操作安全

- 破坏性动作先解析精确目标；不对 home、仓库根、未解析变量或未知工作树执行递归删除。
- 不读取、复制或提交无关秘密。确需 live/remote 证据时遵守本机授权清单的最小请求、脱敏、硬超时与恢复要求。
- 只 stage 本任务路径；一个 commit 一个关注点。不得 force-push main/master、改写共享历史或为 reviewer/子任务创建额外 worktree。
- 来源、法定文本、凭据和用户未知修改不得因清理、重构或“重新生成”被覆盖。
- 不可逆外部副作用、权限扩张、发布、删除既有远端数据或高费用操作需要明确授权；授权不足时停止并请求方向。
