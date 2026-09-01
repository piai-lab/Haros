## 目标

在 `/Users/liuzaoqu/Desktop/Develop/independent/Haros-omnimind-absorption` 完整吸收 OmniMind 固定 revision `b5a966bb9de09861c98a1d7ac3936b092614fed3` 最近 47 个已审实现提交的用户效果、故障不变量和维护约束。实现必须归入 Haros 既有唯一 owner，最终覆盖 Session admission、终止投递、Ask 草稿、Engine Web Surface/Curator/删除回收、Timeline/工具/Diff/Transcript/Send to Agent、确定性 unsigned Desktop 构建和来源记录。

## 范围与边界

纳入：canonical spec 中 C-001–C-008 及其直接代码、迁移、测试、双语文案、构建脚本和 source adoption。保留 Haros 十个 Engine、Agent/Chat/Studio、`ProductSurface`、`ENGINE_DESCRIPTORS`、HostGateway、Product/native Session 分界和 migration lineage。

排除：OmniMind 产品/发布身份、Chat/Agent 合并、第二状态机或 registry、兼容双读、永久原始工具结果库、跨 Engine 原生 Session 伪延续、真实用户私有 Engine 状态、签名、notarize、发布、updater feed 与 push。用户已授权本地合并并在成功后删除 `codex/omnimind-absorption` 及其 worktree；原始工作树中的 `.gitignore` 与 Guidebook evidence 受保护。

Stop boundary：命中 spec 任一 Stop condition、需要未授权外部副作用/秘密/破坏性用户数据操作、或发生真正产品分叉时立即停止并回写准确 blocker；不得扩张权限消除阻塞。

## 零记忆启动

你处于 fresh、零记忆会话，不得依赖未外置聊天记忆。任何写操作前必须：

1. 解析上述绝对工作区、Git 仓库、`AGENTS.md` 和当前版本；
2. 按 canonical spec 的 Core Read Order 读取全部 core evidence；
3. 原样运行 spec 的 exact Bootstrap command，把结果与 Last reconciled revision、worktree state、Active Claim 对账；
4. 在当前上下文给出一次不落盘 Orientation Receipt：根目录与版本、权威 spec、Active Claim、关键不变量、证据缺口或冲突；
5. 路径缺失、证据不可读、版本失配或核心事实 unknown 时，先更新 spec 重新对账或把受影响 Claim 标为 blocked，不得带猜测实施。

第一安全动作：完成上述只读对账；若 E-006 尚不存在，运行唯一 bootstrap 并持久化其脱敏 receipt，然后继续 C-001。

## 执行协议

Canonical Executor 只更新 `missions/omnimind-absorption.md` 这一份状态真相。按 C-001→C-002→C-003→C-004→C-005→C-006→C-007/C-008 的依赖顺序推进；每个 owner cut 后运行能证伪该 Claim 的最窄 focused proof，记录独占证据 receipt，并把证据与状态迁移更新 spec 后才可 `open → candidate`。不建第二份 plan、ledger、handoff 或进度状态；不以 donor 文件布局覆盖 Haros owner。

Active Claim: C-008, with C-007 final path audit.

当前实现 cut：产品候选已冻结为 `62590a6179750c69a72be143338891124466ce0e`，本地终验与来源路径审计结果见 E-009。C-001–C-005 与 C-007 已到 frozen candidate；C-006/C-008 仍受 native Linux/Windows 证据、origin 既有门禁失败、聚合浏览器时序波动和 fresh evaluator 缺失约束。下一执行者不得重做已通过工作，也不得用生产补偿逻辑消除环境/测试债；本次用户已授权完成本地 main 合并并删除对应 feature branch/worktree。

UI 复用规则：直接 import Haros 现有 CodeBlock、FileDiff、Dock/Split、Timeline primitives；仅对精确 donor 机制做 copied-adapted 或 mechanism-only，并记录实际 source/target paths。所有新用户文案同时交付英文与简体中文，键盘、focus、响应式、light/dark、reduced-motion、失败与恢复不得退化。

候选变化后立即使旧 proof 失效。无法取得真实 fresh evaluator provenance 时，Campaign 最高只能到 candidate。禁止发布、签名、notarize、创建 updater feed 或读写真实用户私有 Engine 状态。

## 验收与完成权

Focused proof 以 spec 每个 Claim 的 Proof type 为准。最终冻结不可变 candidate 后，原样运行唯一 Final gate command；随后由 fresh、只读、未继承 Producer 上下文的 evaluator 对 C-001–C-008 逐项裁决。只有同一版本、同一 SHA 上所有 `[required]` Claims 均 verified、blocked=0、final gate PASS 且 audit 无 material finding 才是 DONE。Producer 不得自证完成；Linux/Windows 主产物没有对应 runner 原始证据时，C-006 不得 verified。

详见：missions/omnimind-absorption.md
