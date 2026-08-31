# Haros Guidebook Campaign Goal

## 目标

在 `/Users/liuzaoqu/Desktop/Develop/independent/Haros` 完成英文 Haros Guidebook：50 章、8 个附录、Markdown 唯一内容源、140 个规划生成图槽位、160–220 张表格、18–24 张可复现真实界面证据图，并从同一 Markdown 派生网站、独立 HTML、PDF 与 EPUB。该目标未缩减并已完成：C-001–C-007 在共享 Git product version `6b1f34540c451dc438553f38ca93517e73064114` 与 content `sha256:ac8ebba19cbc7b6570dbbaaf1c7e8bea8c9cff8229a6b9731c38d228c3709d2f` verified，checkpoint COMPLETE，blocked=0。

## 范围与边界

- In scope（范围内）：`docs/haros-guidebook-plan.md`、未来 `docs/guide/`、被接受的媒体及 sidecar、最小出版脚本和 Campaign 证据。
- Out of scope（范围外/排除）：Haros 产品行为、UI、API、持久化、安全或发布状态；真实用户 Engine 状态、秘密、生成 UI、生成代码、生成 Haros 标志；现有 `.gitignore` 修改；push、发布、签名以及第二导航、内容或状态真相。
- Authorized actions（授权动作）：Run 5 已按用户授权使用 built-in `imagegen` 完成 24 个槽位并封闭生成；可用既有 fresh synthetic capture fixture 回归，写入范围内文档、sidecar、验证与本地候选产物并运行相称检查；不得再为已通过槽位调用生成器。
- Stop boundary（停止边界）：命中 canonical spec 的任一 Stop condition 立即停止并报告，不以扩大范围消除阻塞。

## 零记忆启动

你处于 fresh、零记忆会话，不得依赖聊天记忆。任何写操作前必须：

1. 解析绝对工作区、Git 根、branch、HEAD、适用指令与 dirty paths；
2. 按 spec Core Read Order 读取全部 core Evidence；
3. 原样运行 `bash missions/haros-guidebook/scripts/bootstrap.sh`，与 Last reconciled revision、worktree state 和 Active Claim 对账；
4. 在当前上下文给出一次不落盘的 Orientation Receipt：根目录与版本、权威 spec、Active Claim、关键不变量、证据缺口或冲突；
5. 路径缺失、版本失配、证据不可读或核心事实未知时先更新 spec，无法建立事实则将受影响 Claim 标为 blocked，不得猜测实施。

第一安全动作：读取 E-070–E-073 并核对 canonical spec 的 COMPLETE 状态；没有新的 material finding 或用户授权时不得恢复生产、重跑 focused/final 或改动已验证 candidate。

## 执行协议

先加载适用领域 Skill。完整 Campaign 使用 `zq-goal` 保存唯一状态；每个真实长时程里程碑才叠加 `zq-orchestrate`。一名 canonical Executor 集成，当前四槽环境最多两名短命且写入互斥的 Workers；不建平行状态 owner；Workers 停止后才创建一名 fresh、只读 Judge。

Active Claim: none — C-001–C-007 verified on product commit 6b1f34540c451dc438553f38ca93517e73064114.

当前无 bounded evidence wave。新会话先核对 E-070 final gate、E-071 completion audit、E-072 product mapping 与 E-073 clean control transition；没有新 finding 时只报告 COMPLETE，不重跑终验。只有 material transition 更新 canonical spec。

## 验收与完成权

C-001–C-007 均为 `[required]` Claims。C-001 的 focused proof 与里程碑 final gate 是 `bash missions/haros-guidebook/scripts/final-gate.sh`；冻结 candidate 后必须由未参与生产的 fresh Judge 按 spec 和计划 R1–R8 裁决，生产者无权把自己的 candidate 标为 verified。后续 Claims 依 spec 顺序推进。若版本变化，受影响 verified Claims 退回 candidate。Campaign 完成仅当 C-001–C-007 在同一版本全部 verified、blocked 为 0、相关 final gate 通过且 fresh completion audit 无 material finding。否则只能报告真实的 candidate、blocked 或 stopped 状态，不能用进度措辞替代终态。E-070、E-071、E-072 与 E-073 已满足完成条件；当前 Campaign 状态为 COMPLETE。

详见：missions/haros-guidebook.md
