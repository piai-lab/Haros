# Execution brief

## 当前状态

Synara adopted head `a93c47e2` 的代码、focused/live/packaged evidence、architecture、research disposition 与 `source-adoptions.json` 已闭合；候选代码 exact SHA 为 `dbe793d35accbd81484201e5376c772ba9ed94ea`，没有合并受保护分支、创建 Release 或修改 update feed。

当前唯一活动施工仍在 `codex/synara-073-adoption`，但已经切换到维护者正式授权的两个相邻产品结果：一是 Chat 的 `Send to Agent` 必须经用户明确选择或创建 Project，再建立新的 folder-backed Agent Thread，携带产品可见历史、references、可用附件与 draft，原 Chat 不变且不自动执行；二是用户保存的 LLM API Key 在现有 credential owner 下提供与 Web Search Provider 共用规则的隐藏、主动 reveal/copy、replace、clear 与离开即清理，不能进入普通 Product State、事件、缓存、日志、诊断或恢复记录。

主线是唯一工作基线。当前安装版、历史 DMG、测试计数、Provider probe 与 packaged journey 只在精确证据需要时从 Git 或对应 research owner 查找，不在本文件维护镜像。

## 下一动作

沿真实 UI → command → Project/Thread/credential owner 逐段盘点两条现有调用链，先证明“已存在、部分存在、缺失”，再在原 owner 内补齐最窄 typed seam、双语 UI 与 focused tests。Chat/Agent/Project 边界不得模糊；LLM secret 不得进入第二 store 或普通投影。与这两条链直接相邻的重复确认或 exact-binding 失败死路只做最小完整修正，历史用量、local/remote auth policy、`.omnimind`/`.pi` 隔离与发行门不改变。

## Stop-loss

- 本文件只协调现在，不授予 source adoption、产品行为、发行或高风险动作。
- 稳定合同进入 `architecture/`；exact adoption进入 `source-adoptions.json`；固定反证进入 `research/`；claim状态进入active Campaign。
- 一项工作完成后删除其施工叙事，只保留仍真实存在的阻塞或下一动作。Git 历史承担历史，不建立第二总账。
