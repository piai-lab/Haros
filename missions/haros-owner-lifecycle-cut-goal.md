## 目标

在 `/Users/liuzaoqu/Desktop/Develop/independent/Haros-owner-lifecycle-cut` 完成 Campaign `HAROS-OWNER-CUT-2026-08-30`：把 Health 与 Usage 各自手写的 `EngineKind → EngineChildKind` 安全 profile 映射收回现有 `buildEngineChildEnvironment` owner，删除两个 consumer truth，并在同一不可变 candidate 上证明凭据隔离/失败语义不变、修改半径缩小且没有新 owner。当前 Active Claim 是 `C-002`；`C-001` 已有 producer candidate，仍待 fresh Judge 终验。

## 范围与边界

只纳入所选责任直接涉及的代码、测试、必要配置、唯一 canonical spec/Goal 和专属 proof receipts。排除第二个 owner cut、全仓治理/inventory、用户可见行为或文案、公共合同、持久数据/真实用户状态、兼容/迁移/alias/dual track、权限安全、发布签名、真实外部服务、依赖/框架替换、猜测式性能优化、广域格式化及 `docs/**`。共享 checkout、Guidebook task `01a05090-be0d-7af1-9f26-0df1c3cdb468`、`.gitignore`、Guidebook plans/outputs 和全部未知修改受保护；不得读入 branch、修改、暂存或提交。授权仅限本分支/worktree内的范围写入、focused checks 和聚焦 commits；不得 push、merge、rebase 共享分支、发布或产生外部副作用。停止条件：任何行为、公共合同、兼容、数据、安全、权限、发布分叉，或工作区/证据冲突，都必须进入 `BLOCKED`。

## 零记忆启动

你处于 fresh、零记忆会话，不得依赖未外置聊天记忆。任何写操作前必须：

1. 解析上述绝对工作区、仓库、适用 `AGENTS.md`、branch、HEAD 和 `git status --short`；
2. 按 canonical spec 的 Core Read Order 读取全部 core evidence；
3. 原样运行 exact Bootstrap command `bun run public-surface:check`，与 Last reconciled revision、worktree state 和 Active Claim 对账；
4. 在当前上下文给出一次不落盘的 Orientation Receipt：根目录/版本、权威 spec、Active Claim、关键不变量、证据缺口或冲突；
5. 路径、证据、版本或状态失配时先更新 spec 对账；无法建立事实则把受影响 Claim 标为 `blocked`，不得猜测实施。

第一安全动作：读取 E-007–E-013 完成 owner/security/orchestration 对账，然后调用 `zq-orchestrate` 的入口裁决。

## 执行协议

按 E-011/E-012 执行已冻结的 `CONSOLIDATE`：让现有深模块直接接受产品 `EngineKind` 并在内部私有地解析 child profile；保留 `acp` 等直接 child-kind 输入；删除 Health/Usage 两个映射和多余类型 import。不得导出浅 helper、创建 registry/manager/cache、改变 grants/过滤策略/错误语义，或触碰 P-003–P-005。

调用 E-013 的 `zq-orchestrate` 后应选择 `DIRECT_EXECUTION`：本 fresh task 是唯一 writer/integrator，不建 Worker、Supervisor、第二 Goal Spine/ledger 或语义 Sentinel；宿主任务本身提供连续执行。普通可逆工程判断直接做；K-017 反证、行为/合同/兼容/数据/安全策略/权限/发布分叉进入 `BLOCKED`。每次只跑能推翻当前 Claim 的最窄 focused proof：`bun run test:focused -- apps/server/src/engine/engineChildEnvironment.integration.test.ts apps/server/src/engineUsage/index.test.ts apps/server/src/engine/Layers/EngineHealth.integration.test.ts`。candidate 未变化不重复终验。完整 owner cut 后立即停止，不寻找第二项。

每次 material transition 都把事实、证据句柄、Claim 状态、blocker 和 Last reconciled revision 更新回唯一 canonical spec；不得另建进度文件。Focused proof 后 Executor 可把匹配 Claims 从 open 推到 candidate，但不能写 verified。

## 验收与完成权

受影响 Claims 为 `C-001`–`C-009`，均为 `[required]`。最终 candidate 只运行一次 exact Final gate：`bun run fmt:check && bun run lint && bun run typecheck && bun run build:desktop && bun run test:focused -- apps/server/src/engine/engineChildEnvironment.integration.test.ts apps/server/src/engineUsage/index.test.ts apps/server/src/engine/Layers/EngineHealth.integration.test.ts`，并执行 spec 的 residue（两个 `engineChildKind` 消失）、radius、no-new-owner 与重复调用/Health/Usage lifecycle proof。Executor 只能把 Claims 推到 `candidate` 并冻结聚焦 commit。之后最多创建一位未参与生产的 fresh、只读 Judge；只有它可在同一完整 commit SHA（同一版本）上置为 `verified`。DONE/COMPLETE 要求 `C-001`–`C-009` 全部 verified、blocked=0、Final gate PASS、fresh audit 无 material finding、reviewed candidate 与交付 candidate 一致且所有角色/进程关闭；否则只能是 CANDIDATE_WITH_OPEN、BLOCKED 或 STOPPED。没有明确性能前后数据就不声称变快；未测 packaged bytes、真实服务和平台边界必须标为 unknown。

详见：missions/haros-owner-lifecycle-cut.md
