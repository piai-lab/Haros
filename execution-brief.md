# Execution brief

## 当前目标

正在实施并面向合并验收三工作面产品接线：`/ → Agent`、`/chat → Chat`、`/studio → Studio`。Chat 没有 Project/cwd，只接受明确引用并复用 managed outputs；Studio 默认继承 Synara 当前 lifecycle；Chat→Agent 使用服务端权威 contextual fork 带入完整产品可见历史、mentions 与受限的 target-owned attachments，且不自动执行。产品代码、测试和 canonical 文档已进入任务分支；当前动作是收口 focused/full gates、同步最新 main、按关注点提交并 push，再从 exact pushed SHA 构建 Desktop/DMG、隔离安装验收，候选通过后合并 main 并清理本任务分支/worktree。

## 唯一 owner 与施工边界

- Project.kind 是 product surface、Provider work surface、Skill trust 与 Host admission 的唯一事实；只新增纯值映射，不建立万能 resolver、registry、SDK 或 surface store。
- route/Sidebar/Composer/RightDock/Toast/Timeline 复用现有 Web owner；Studio restore 默认沿用当前算法，后续必要优化必须先证明具体缺口，并在既有 owner 内保持最小、可回退且不产生第二恢复 owner。
- `thread.fork.create` 拥有 Chat→Agent contextual fork；`thread.handoff.create` 继续只表达同 Project 跨 Provider handoff。
- imported message 是历史文本、mentions 与成功附件的唯一内容 owner；fork scope 只表达 kind/bootstrap 状态，不复制 references。
- ManagedAttachmentStore 继续拥有附件 reserve/finalize/claim/path/cleanup；单次 fork 以既有 principal staging 数量/字节上限为确定性上限，逐附件部分成功。
- AgentGateway 继续拥有 Host catalog、Settings/availability 投影和逐 `tools/call` 精确 turn 复验；Chat 只暴露 Browser，Agent/Studio 使用全局启用且可用集合。Session credential 只认证 identity/turn，不形成第二 capability truth。
- Pi ResourceLoader 继续拥有 Skills/Prompts/Extensions；无 Thread 的 Chat draft 与 chat Project 都是 global-only。Todo Session Extension 对两种 Provider work surface 注册。

## 验收顺序

1. contracts/纯 policy/decider/projector focused tests；
2. route、Sidebar、Chat first-send、fork/attachment partial-success 与 i18n Web tests；
3. Gateway、Skill、Todo、Provider bootstrap Server tests；
4. 相关全量 typecheck/lint/build/test、性能 falsifier 与文档闭环；
5. commit/push 精确 SHA，从该 SHA 重建 App 和 DMG；使用隔离 fresh profile 证明启动、三面切换、Chat 引用、Send to Agent、部分失败、关闭重开，并在资源匹配时覆盖 MiMo/DeepSeek 最小真实 journey。

## 明确不创建

不创建三份 restore state、Chat Project/cwd、第二 attachment 状态机、Resource registry、adapter capability registry、Host snapshot/cache、Studio 重写、Provider handoff 扩展、附件迁移中心、整轮 Retry、自动执行开关、新 package 或 SDK。
