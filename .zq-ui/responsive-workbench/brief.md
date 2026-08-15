# UI brief

## User and job

OmniMind 的维护者正在把现有桌面 Agent 产品的响应式布局提升到 Codex 级别的连续窗口体验。用户的核心工作是在拖动窗口、打开环境信息、打开工作台和持续对话时，始终知道“主对话在哪里”，且不丢失草稿、滚动、焦点或工作台状态。

## Product truth

- OmniMind 是本地优先、多引擎的桌面 Agent 产品；视觉语言继续来自 OmniMind/Synara 基座，不复制 Codex 皮肤。
- 当前 Desktop 原生最小宽度是 840px；480px 是独立的第二阶段全产品目标。
- 当前 Environment 虽然视觉上是浮层，但 `docked` 模式会给 Timeline 和 Composer 固定增加 312px 右内边距，导致打开面板时主对话整体左移。
- Environment 是轻量“环境信息”检查器；RightDock 才是承载文件、Diff、终端、浏览器和设备的真实 Workbench。
- 左侧导航、Environment、RightDock、PlanSidebar 和 Split Chat 都已经有各自状态 owner；方案只能改变 presentation，不能创建第二份持久状态。
- 用户已明确选择单一方向：保护 Chat + Composer；左栏先自动退场；Environment 浮动并在窄宽变侧页；RightDock 从宽屏 split 变为窄屏单面板。

## Constraints

- Environment 打开/关闭前后，Timeline 和 Composer 的 x/width 变化不超过 1px。
- 自动退场不能改写手动偏好：手动关闭的栏位不会因窗口重新变宽而复活；仅自动压缩的栏位可在空间恢复时回来。
- 连续拖动必须直接跟手；只有跨越 presentation tier 时发生一次克制的 transform/opacity 过渡。
- 视觉适配优先 CSS/container behavior；只有交互分支需要 ResizeObserver，且仅在 tier 变化时更新。
- 宽屏 RightDock 可以占据 split；空间不足时 Chat 与 Workbench 互斥显示。
- 需要覆盖 light/dark、full/reduced motion、中文长文案与 1536/1100/840/480。

## What may change

- Environment 的 docked/inset 逻辑和面板位置。
- 左栏的自动呈现方式。
- RightDock 的 split / single-panel presentation。
- 辅助面板在不同高度、宽度下的 max-height、内部滚动和 sheet behavior。
- 本地 presentation tier 推导和相关 focused tests。

## What must survive

- Agent｜Chat、Project/Thread/Space、Composer、Timeline、Provider/Model、权限和 Queue 的既有语义。
- File/Viewer/Diff/Terminal/Git/Browser/Device 的真实工作台能力与 keep-mounted state。
- stream/scroll、长对话、输入法、键盘、screen reader、focus-visible、双语与 reduced motion。
- Project Instructions 保持当前状态，本任务完全不触碰。

## Evidence gaps

- 目前只有截图与源码责任链，没有当前安装 App 的连续拖拽测量。
- 现有浏览器测试覆盖 ChatView 的若干宽度，但没有覆盖完整 Shell + 左栏 + Environment + RightDock 的组合。
- 480px 还没有全路由证据；不能从本故事板直接推导可降低原生 `minWidth`。
- 本故事板是交互与几何审批材料，不是 production authorization。
