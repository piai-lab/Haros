## 目标

在 `/Users/liuzaoqu/Desktop/Develop/independent/Haros-owner-lifecycle-cut` 核验 Campaign `HAROS-OWNER-CUT-2026-08-30` 的 durable terminal truth。被测试和独立终验的产品 candidate 固定为 `7f0979fb747d9bba1781a83b2d991cfd09ed147a`；其 clean control-only 后代只承载 Goal、canonical spec 与首次新增的 E-025/E-026 receipts。当前 owner cut 已把 Health 与 Usage 手写的 `EngineKind → EngineChildKind` 安全 profile 映射收回唯一幸存 owner `buildEngineChildEnvironment`，并由同一 candidate 上的真实 gate 与唯一 fresh Judge 证明。

## 范围与边界

范围内授权：只读 Goal、canonical spec、core evidence、candidate/control diff 和工作区现实，确认 durable 状态仍匹配。范围外：修改或重跑产品代码、测试、build、Final gate 或审计，寻找第二个 owner cut，创建 Executor/Supervisor/Sentinel/第二位 Judge，以及 push、merge、rebase、发布、签名或外部副作用。`docs/**`、`.gitignore`、`packages/oa-web-access/**`、Guidebook task `01a05090-be0d-7af1-9f26-0df1c3cdb468` 及未知修改受保护。若 candidate、control-only 边界、证据字节、clean 状态或产品/合同/安全事实失配，必须停止并把准确终态视为 `BLOCKED` 或 `CANDIDATE_WITH_OPEN`，不得修饰成完成。

## 零记忆启动

你处于 fresh、零记忆会话，不得依赖聊天记忆。任何写操作前（本 Goal 默认不授权写入）以及任何终态结论前必须：

1. 解析上述绝对工作区、仓库、适用 `AGENTS.md`、branch、HEAD 与 `git status --short`；
2. 按 canonical spec 的 Core Read Order 读取全部 core evidence；
3. 原样运行 exact Bootstrap command `bun run public-surface:check`，与 Last reconciled revision、clean control-only worktree 和 Active Claim 对账；
4. 给出不落盘 Orientation Receipt：workspace、产品 candidate、control HEAD、Active Claim、关键不变量、证据缺口或冲突；
5. 核验 `candidate..HEAD` 仅含 Goal、spec、E-025、E-026，产品/测试/依赖/配置无 post-candidate 漂移；
6. 路径、版本、状态或证据失配时不得实施补偿性产品修改，也不得沿用 verified 结论。

第一安全动作：按 canonical spec 的 Core Read Order 完成只读对账，再运行修复后 zq-goal checker；任何 material drift 立即停止。

## 执行协议

Active Claim: none — all required Claims are verified and no Claim remains active.

这是 terminal verification launcher。不得调用 `zq-orchestrate` 启动施工，也不得重复 Final gate 或 fresh audit。产品 candidate 始终是 `7f0979fb747d9bba1781a83b2d991cfd09ed147a`，当前 HEAD 只可为该 candidate 本身或其 clean control-only 后代。focused proof E-014/E-017/E-018/E-023 可按 spec 的祖先证据规则继承；E-025 Final gate 与 E-026 audit 必须直接绑定产品 candidate。E-022 是 immutable historical FAIL，不进入当前 Claim 证明图。

任何 material transition 都必须先把事实、证据句柄、Claim 状态、blocker 与 Last reconciled revision 更新回唯一 canonical spec；本 Goal 不授权创建第二状态文件或产品写入。若只读核验通过，立即停止；若不通过，精确报告失配项和唯一安全重启动作。

## 验收与完成权

`C-001`–`C-009` 均为 `[required]`。`COMPLETE` 仅在同一版本、同一 SHA 的产品 candidate 上保持：逐 Claim 真实证据映射、E-025 Final gate PASS、唯一 Judge E-026 无 material finding、blocked=0、Goal/spec 均无 Active Claim、worktree clean、post-candidate 无产品/测试/依赖/配置漂移、受保护路径未触碰。只有符合 canonical spec 的独立 evaluator 可以写 `verified`；Producer/Executor 不能自证完成。packaged bytes、真实服务、动态外部 consumer 与额外平台边界仍为 unknown。没有同口径性能数据，不声称全局变快。

详见：missions/haros-owner-lifecycle-cut.md
