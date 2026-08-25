# Execution brief

## 当前状态

当前没有活动中的产品施工列车、并发 owner 冲突或待续分支。新任务从维护者的最新请求开始，先读取根 [`README.md`](README.md) 与对应 [`architecture/`](architecture/README.md) owner；不要续跑历史 Ask User、Usage Insights、Tool/Timeline、i18n、Model services 或 Synara adoption 的旧阶段计划。

主线是唯一工作基线。当前安装版、历史 DMG、测试计数、Provider probe 与 packaged journey 只在精确证据需要时从 Git 或对应 research owner查找，不在本文件维护镜像。

## 下一动作

等待维护者提出新的具体目标。开始后只在这里记录：

- 当前唯一用户结果；
- 正在修改的 sole owner；
- 真实并发或同文件冲突；
- 会阻止继续施工的外部依赖、安全或产品分叉；
- 一个可观察的下一动作。

没有这些事实时保持本文件简短，不把已完成工作、SHA、artifact hash、测试流水或长期架构复制回来。

## Stop-loss

- 本文件只协调现在，不授予 source adoption、产品行为、发行或高风险动作。
- 稳定合同进入 `architecture/`；exact adoption进入 `source-adoptions.json`；固定反证进入 `research/`；claim状态进入active Campaign。
- 一项工作完成后删除其施工叙事，只保留仍真实存在的阻塞或下一动作。Git 历史承担历史，不建立第二总账。
