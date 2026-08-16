# OmniMind 响应式 Workbench 与环境信息：全局 UI 审查

> 证据日期：2026-08-15
> 研究基线：`main@fce4cb89f3f73f3f08d980de94d1ed6f95e20265`
> 角色：保存可复核事实、观察、推论、反证、最小候选与复验条件。唯一 UI contract 仍是 [`architecture/workbench.md`](../architecture/workbench.md)，当前施工入口仍是 [`execution-brief.md`](../execution-brief.md)，验收状态只进入 active Mission。

## 0. 结论

当前截图中的主要问题不是“面板样式不像 Codex”，而是 OmniMind 的四个产品角色没有在同一套空间策略中闭合：

1. Timeline 与 Composer 本应是稳定主画布，Environment 打开时却被固定增加 `312px` 右内边距；
2. Environment 实际是任务上下文检查器，却被命名为 Workbench，并在正常桌面态改变主画布几何；
3. RightDock 才承载 Files、Diff、Terminal、Browser、Device 等真实工作面板，但它每次打开按约 50/50 分栏，缺少空间不足时的单面板退场；
4. 左侧 Sidebar 只在 `<768px` 进入移动抽屉，没有在桌面窗口持续缩窄时按空间压力自动让路；
5. Environment、Sidebar、RightDock 各自有状态和动画，却没有一个共同的 presentation priority，因此窗口拖动只能触发彼此独立的局部规则。

最小充分方向不是复制 Codex，也不是新建全局响应式平台，而是保留现有状态 owner，只增加一层可推导、无持久化的 presentation policy：

```text
稳定锚点：Timeline + Composer
辅助检查：Environment（悬浮检查器；窄宽度为临时侧页）
实际工作：RightDock / Workbench（宽屏分栏；受限时单面板）
全局导航：Sidebar（空间压力时自动压制；手动偏好不被改写）
```

该方向符合奥卡姆剃刀：删除 Environment 的固定 inset，复用现有 Sidebar/Sheet/RightDock/Composer owner，在 route/surface 内派生 presentation tier；不新增 layout database、全局 store、迁移、兼容双轨或第二控制面。

## 1. 范围与证据纪律

### 1.1 本轮范围

- OmniMind Desktop 的 Chat shell、Sidebar、Timeline、Composer、Environment 与 RightDock 在连续窗口缩放中的空间关系；
- Environment 的产品角色、可见命名、双语闭合、键盘/focus/reduced-motion 责任；
- Workbench 与 Environment 的职责分离；
- 当前 HTML storyboard 对目标方向的验证能力；
- production 候选的最小代码 seam、验证矩阵、停止条件与回退边界。

### 1.2 明确隔离

- 不改变 Project instructions 的存储、自动保存、Prompt 注入、复制到记事本或产品语义；
- 不借本轮降低 Electron `minWidth: 840`；`480px` 只作为未来全产品压力测试，不是当前发布承诺；
- 不重写 Settings IA，不创建新 WorkbenchLayout aggregate；
- 不把 Codex 的品牌、皮肤、尺寸或某个版本的断点复制成 OmniMind 规范；
- 不改变 Files、Diff、Terminal、Browser、Device、Git、stream、scroll、draft、pane keep-mounted state 的事实 owner；
- 不触碰 Agent Core、Provider runtime、权限、持久化产品状态或 release authority。

### 1.3 证据类型

| 类型                | 本轮材料                                                                                            | 能证明什么                                                   | 不能证明什么                                           |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| 用户截图            | OmniMind Environment 关闭/打开；Codex 宽、中、窄窗口                                                | 可见几何变化、信息层级、连续缩放后的呈现结果                 | 对方内部实现、精确断点、状态 owner                     |
| 当前源码            | `ChatView`、`EnvironmentPanel`、`RightDock`、`SingleChatSurface`、`_chat`、`sidebar`、i18n 与 tests | OmniMind 当前真实决策链、常量、状态与测试缺口                | 安装 App 已获得未来修复                                |
| 当前原型            | `.zq-ui/responsive-workbench/`                                                                      | 单一方向的可交互几何、响应优先级与视觉 taste                 | production runtime、长会话、真实 Electron/webview 行为 |
| 当前 Codex App 资源 | 本机已安装 App 的中英文资源与用户截图                                                               | 词义已在成熟桌面产品中真实使用                               | OmniMind 必须机械照抄                                  |
| 官方公开资料        | [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)                    | 线程、worktree、diff/editor 与多任务的产品职责是正式产品事实 | Environment 面板的内部布局算法                         |
| 推论                | 由以上证据共同推出的目标状态机                                                                      | 可形成可证伪候选                                             | 未经 production proof 的完成状态                       |

## 2. 用户问题与 taste 约束

### 2.1 用户真正指出的问题

用户不是只嫌“图 1 不好看”。连续反馈集中在：

- 打开 Environment 后，主对话和输入框明显左移；
- 窗口拖动时，Codex 能按空间自动改变 Sidebar、Environment 与主内容的关系，而且过程连续、克制、没有突然把对话挤成窄条；
- OmniMind 当前像把右侧信息面板硬塞进布局，主画布失去重心；
- 需要先把可拖动 HTML 做准，再进入生产实现；
- 最终视觉必须是 OmniMind 自己，而不是 Codex 换 logo 或一套脱离真实组件的假 Shell。

### 2.2 本任务中可稳定观察到的 taste

以下只作为本任务的 scoped taste，不外推为用户所有产品的永久审美定律：

- **稳定重心**：辅助信息出现时，主工作对象不应重新排版或横向跳动；
- **自动但不越权**：系统可因空间临时压制辅助表面，但不能改写用户手动偏好；
- **克制密度**：专业桌面工具应紧凑、安静、有层级，拒绝大卡片、胶囊泛滥、装饰性状态墙；
- **真实产品感**：复用 OmniMind 当前 shell、字体、图标、分隔、surface 与交互，不做概念演示页；
- **词义准确**：文案必须按产品角色命名，不能因“右边有个面板”就都叫工作台；
- **连续拖动**：绝大多数帧由浏览器原生布局直接跟手，只有 presentation tier 跨越时做一次短促过渡；
- **借鉴机制，不复制皮肤**：学习 Codex 的角色退让与主画布保护，不复制其品牌、视觉资产或任意像素。

## 3. 四个产品角色必须拆开

| 角色                   | 用户任务                                                | 当前真实 owner                                       | 正确呈现                               | 不应承担                                         |
| ---------------------- | ------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Timeline + Composer    | 阅读、输入、继续、监督任务                              | `ChatView` / `MessagesTimeline` / Composer stack     | 稳定居中主画布                         | 为辅助检查器永久让出固定宽度                     |
| Environment / 环境信息 | 快速检查仓库、分支、变更、来源、摘要、记事等上下文      | `EnvironmentPanel` + Branch/Git/notes/recap sections | 桌面悬浮 inspector；极窄时临时侧页     | Files/Diff/Terminal 的操作工作台；改变主画布几何 |
| Workbench / 工作台     | 实际操作 Files、Diff、Terminal、Browser、Device、Git 等 | `RightDock` / panes / Editor workspace               | 宽屏并列；空间不足时与 Chat 单面板切换 | 冒充 Environment；在不足宽度把 Chat 压成窄条     |
| Sidebar / 全局导航     | 切换 Agent/Chat、项目、任务、全局入口                   | `_chat` + `ui/sidebar` + `Sidebar`                   | 宽屏常驻；压力时自动压制并可临时覆盖   | 把自动压制写回用户手动偏好                       |

这不是术语美容。角色一旦混合，布局就无法回答“谁先退、谁覆盖、谁必须保留宽度、谁拥有持久状态”。

## 4. 截图可见事实

### 4.1 OmniMind 关闭 Environment

用户截图中，左侧 Sidebar 约占 `226px`；Timeline 与 Composer 在剩余主区域居中，Composer 宽度舒适，主内容重心稳定。Environment 关闭时，整体并不需要重画。

### 4.2 OmniMind 打开 Environment

同一窗口打开 Environment 后：

- 右上角出现约 `288px` 的卡片；
- Timeline 和 Composer 同时向左缩进；
- Composer 宽度显著缩小，底部控件密度变差；
- Environment 虽然视觉上像 overlay，主内容却按 docked layout 让出空间，视觉语义与几何语义矛盾；
- 面板标题“工作台”与真实 RightDock/Editor 工作面板角色冲突；
- 中英文混杂削弱了完成度和产品可信度。

### 4.3 Codex 参考行为

用户提供的 Codex 截图只用于行为观察：

- 宽窗口：Sidebar、稳定主对话、右侧环境信息可以同时存在；
- 约 `1009px`：Sidebar 自动退场，主对话仍保留舒适宽度，Environment 继续悬浮；
- 更窄窗口：Environment 自动退场，主对话和 Composer 继续占据主视图；
- 打开 Environment 时，主内容没有因检查器开关而整体横跳；
- 拖动窗口时，退让顺序表现为连续的角色优先级，而不是多个固定宽度同时争抢空间。

不能从截图推断 Codex 的精确断点、内部 store 或算法；可学习的是“主画布稳定、辅助表面按职责退场”的机制。

## 5. 当前源码责任链

### 5.1 Environment 可见性与偏好

2026-08-16 的维护者裁决进一步收窄了 open/close 语义：Environment 是按需检查器，每次 App 启动必须关闭；聊天标题栏的手动 toggle 只影响当前运行中的 shell，不写成跨启动偏好。旧的 `environmentPanelDefaultOpen` 配置不再进入 schema、Settings、搜索或渲染决策。

当前 `ChatView` 只保留一个 session-local boolean，并通过 `resolveEnvironmentPanelVisible` 叠加 `environmentEnabled`。这消除了“临时打开一次却在以后每次启动自动出现”的隐式持久化，也删除了 landing first-send、constrained default-open 与 Settings 写回的平行分支。

### 5.2 Environment 为什么让主内容左移

`apps/web/src/components/ChatView.tsx` 当前规则：

```ts
environmentUsesFloatingOverlay =
  isTerminalEnvironmentContext || isMobileViewport || rightDockOpen || surfaceMode === "split";

environmentAppliesContentInset = environmentPanelVisible && !environmentUsesFloatingOverlay;
```

正常 desktop single-chat 恰好不满足 floating 条件，因此进入 `docked`。随后：

- `MessagesTimeline.contentInsetRightPx` 接收固定 `312px`；
- Composer overlay wrapper 获得 `paddingRight: 312px`；
- `EnvironmentPanel` 本身仍用 absolute overlay 固定在右上角。

`apps/web/src/components/chat/environment/EnvironmentPanel.tsx` 定义：

```ts
ENVIRONMENT_DOCKED_CONTENT_INSET_PX = 312;
```

它由 `w-72`（`288px`）加外围 `p-3` 推导。由此可知，截图中的左移是明确的产品策略，不是随机 CSS 回归。

### 5.3 Environment 表面与动作

当前 Environment 已真实聚合：

- Changes / Diff 入口与统计；
- Local/Worktree 与 branch；
- Git actions；
- Local servers；
- Repository/GitHub；
- Editor / Open in editor；
- Automations、Pull Request；
- Usage、Studio Output；
- Recap、Pinned messages、Markers；
- Project instructions；
- Notepad。

因此它不是“假面板”；它是已有任务上下文聚合器。错误是角色命名和 presentation，不应借 UI 修复删除其功能。

### 5.4 Sidebar 当前响应逻辑

`apps/web/src/hooks/useMediaQuery.ts` 的 `useIsMobile()` 只匹配 `<768px`。`apps/web/src/components/ui/sidebar.tsx` 在 mobile 时切成 Sheet，否则使用 desktop offcanvas。`apps/web/src/routes/_chat.tsx` 只维护一个 `sidebarOpen`：

```ts
const [sidebarOpen, setSidebarOpen] = useState(true);
const resolvedSidebarOpen = isEditorView ? false : sidebarOpen;
```

当前没有“用户偏好”和“空间自动压制”两个维度。Electron 当前 `minWidth` 是 `840px`，所以用户在真实 App 可达到的 `840–1100px` 桌面区间仍会保留至少 `208px`、默认 `368px` 的 Sidebar，与主画布和右侧表面争抢空间。

### 5.5 RightDock 当前布局

`apps/web/src/components/chat/RightDock.tsx`：

- 单 pane 最小宽度 `26rem = 416px`；
- 每次打开会测量 shell，并把 dock 宽度设为约一半；
- device pane 可使用 `38rem` preferred width；
- 中途拖拽由 `canComposerHandlePanelWidth` 通过真实 DOM overflow probe 限制；
- 使用与 Sidebar 相同的 `300ms cubic-bezier(0.32,0.72,0,1)` drawer motion；
- keep-mounted pane 只隐藏不卸载，保护 Terminal/Browser 等生命周期。

这些能力应该保留。缺口是当 Chat + Workbench 无法同时舒适存在时，当前只有“阻止继续拖窄”，没有“转成单面板 presentation”。

### 5.6 Desktop 最小宽度

`apps/desktop/src/main.ts` 与 `windowState.test.ts` 共同固定 `minWidth: 840`、`minHeight: 620`。本轮可以在 Web 层验证 `480px` 的结构压力，但不能据此降低原生最小宽度；降低必须覆盖全部 route、Settings、PR、Editor、Browser/Device、dialog 与 packaged journey。

## 6. 根因矩阵

| 表象                       | 直接原因                               | 更深 owner 问题                              | 最小修复                                                    |
| -------------------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| Environment 打开后对话左移 | Timeline/Composer 固定加 `312px` inset | inspector 被当作半 docked layout participant | Environment 一律不改变主画布几何                            |
| 面板像浮层却挤压内容       | absolute card + docked inset 混用      | 视觉语义与布局语义冲突                       | 保留单一 overlay/sheet presentation                         |
| 约 1000px 窗口显得拥挤     | Sidebar 仍 desktop 常驻                | mobile breakpoint 被误当空间适配策略         | 增加 local auto-suppression，不改手动偏好                   |
| RightDock 可把 Chat 压窄   | 打开固定约 50/50、pane floor 416px     | 缺少 split→single presentation               | 受限宽度进入 Chat/Workbench 互斥单面板                      |
| 拖动不丝滑                 | 三套局部状态各自响应                   | 没有统一优先级和滞回                         | 派生有限 tier，并在阈值两侧使用 hysteresis                  |
| “工作台”概念混乱           | `workbench.environment` 用于 inspector | namespace/产品角色同名                       | 新增 `environment.*`；`workbench.*` 留给操作区              |
| 中文仍夹英文               | Environment 多数组件硬编码             | i18n scan 覆盖面不足                         | catalog parity + 扩大 hardcode source scan                  |
| Git 行语义不准             | 菜单入口复用 `Commit and push`         | 动作与入口未区分                             | 菜单用 `Commit or push`；真实连续动作保留 `Commit and push` |
| 测试绿色但截图仍错         | logic test 只测开关，不测几何/组合     | shell-level regression 缺口                  | 增加真实 shell 组合与 geometry tests                        |

## 7. 最小目标状态机

### 7.1 状态与呈现必须分开

每个表面至少区分：

```text
manual preference：用户明确希望打开/关闭什么
auto suppression：当前空间是否暂时不允许常驻
transient reveal：被自动压制后，用户是否临时覆盖查看
presentation：visible / overlay / split / exclusive / hidden
```

自动 suppression 是可推导 presentation，不持久化，不调用手动 `setOpen`，不写回 Settings、cookie 或 pane store。Sidebar 当前 route 只用 `useState(true)` 建立手动状态；primitive 虽会写 `sidebar_state` cookie，但仓库没有对应读取/rehydrate 路径。因此 W1 只保证同一 mounted shell 内的手动 intent 跨自动压制保持，不擅自新增跨启动持久化。窗口恢复空间后：

- 用户原本手动打开的表面可以恢复；
- 用户原本手动关闭的表面不能被系统“复活”；
- 临时 overlay/sheet 在 Escape、外部点击、打开更高优先级表面或再次跨入更窄 tier 后退出；
- draft、scroll、focus target、RightDock pane state 与 Environment data 不因 presentation 变化而被重建。

`PlanSidebar` 是另一项必须纳入压力预算的现存消费者：`apps/web/src/components/PlanSidebar.tsx` 固定 `w-[340px]`，并会在 proposed plan/active task flow 中自动打开，保存 per-turn dismiss 与跨 thread handoff intent。W1 不把它升级为第五个全局 responsive owner；它应作为 Chat 内现有详情表面进入组合 proof，确保 Sidebar auto suppression、Environment overlay 与 Workbench split/exclusive 不会同它共同挤毁 Composer，同时保留其现有 task/plan 行为。

### 7.2 退让优先级

| 空间状态 | Sidebar                    | Timeline + Composer | Environment              | Workbench                                 |
| -------- | -------------------------- | ------------------- | ------------------------ | ----------------------------------------- |
| 宽       | 按手动偏好常驻             | 稳定                | 按手动偏好悬浮           | 打开时可 split                            |
| 压力     | 先自动压制，可临时 overlay | 稳定                | 仍可悬浮，不改几何       | 若已打开，按可读性决定 split 或 exclusive |
| 紧凑     | 默认压制，可临时 sheet     | 唯一主画布          | 自动压制；用户临时 sheet | 打开时 exclusive                          |

Environment 与 Workbench 不应同时争夺紧凑视图。打开 Workbench 可以临时关闭 Environment presentation，但不能抹掉用户长期偏好。

### 7.3 阈值不是产品 contract

storyboard 用 `1100/1180`、`760/840` 做可视化 hysteresis，证明机制而非冻结生产常量。production 应按现有最小职责推导：

- Sidebar 当前最小 `208px`；
- 主内容 contract 当前最小 `640px`；
- Workbench pane 最小 `416px`；
- Environment 卡片 `288px`，但作为 overlay 不进入主画布宽度预算；
- Composer 必须通过真实 overflow probe。

若实现只需少量可解释 breakpoint，可使用 media/container query；只有真实 shell 宽度、Sidebar 用户 resize 或 RightDock 动态宽度使 CSS 无法唯一判断时，才使用 ResizeObserver。Observer 只在 tier 改变时 set state，不逐像素驱动 React 重渲染。

## 8. 几何不变量

Environment 开关的 hard invariant：

```text
abs(Timeline.x_after - Timeline.x_before) <= 1px
abs(Timeline.width_after - Timeline.width_before) <= 1px
abs(Composer.x_after - Composer.x_before) <= 1px
abs(Composer.width_after - Composer.width_before) <= 1px
```

例外只允许由同一时刻的外部事实导致，例如窗口宽度、Sidebar presentation 或 Workbench presentation 同时改变。单独点击 Environment 时不得触发这些外部变化。

其他几何要求：

- Environment overlay 不能遮住 Chat header 的关键控制；
- Timeline 滚动条仍位于 chat viewport 边缘，不因 Environment inset 移位；
- Composer 的 send、权限、Engine/model 仍可达，不出现横向 overflow；
- Environment 高度由 viewport 限制，内部独立滚动，不能把整个 App 撑高；
- 紧凑 sheet 具有明确关闭、Escape、focus trap 与 focus return；
- RightDock exclusive 时 Chat 不在视觉上被压成窄条；隐藏可用 `inert/aria-hidden`，但需要按 pane lifecycle 决定是否保留 DOM。

## 9. Motion 与连续拖动

### 9.1 应保留

- 已有 `300ms cubic-bezier(0.32,0.72,0,1)` 可作为 Sidebar、RightDock、Environment 的共享 drawer token；
- `motion-reduce:transition-none`；
- 首次 mount、thread 切换或 remount 时 suppression，避免从旧几何飞入；
- CSS grid/flex/container 自然响应，不对每个 resize event 做 JS tween。

### 9.2 不应做

- 不在 `resize`/ResizeObserver 每个像素回调里更新多个 React store；
- 不同时动画 width、left、padding、transform 导致重排与视觉不同步；
- 不为“丝滑”引入 GSAP、motion runtime 或第二动画系统；
- 不使用弹簧、overshoot、scale-heavy panel 动画；
- 不把 breakpoint 抖动暴露给用户。

### 9.3 Hysteresis

窗口在临界值附近来回拖动时，如果 hide 与 restore 用同一阈值，surface 会反复闪烁。最小 hysteresis 是两个邻近阈值或等价稳定策略：缩窄到下界后压制，放宽到更高上界才恢复。差值只用于稳定 presentation，不成为新的持久状态。

## 10. 专业命名与双语闭合

### 10.1 目标词义

| English              | 简体中文         | 角色说明                                    |
| -------------------- | ---------------- | ------------------------------------------- |
| Environment          | 环境信息         | 辅助检查器标题                              |
| Environment panel    | 环境信息面板     | Settings 中的表面名称                       |
| Workbench            | 工作台           | Files/Diff/Terminal/Browser/Device 等操作区 |
| Changes              | 变更             | 面板/集合名词；句子中的一般动作仍可用“更改” |
| Local                | 本地             | 环境模式                                    |
| Worktree             | 工作树           | Git worktree 模式                           |
| New worktree         | 新建工作树       | 创建动作                                    |
| Commit or push       | 提交或推送       | 打开包含多种 Git 动作的菜单入口             |
| Commit and push      | 提交并推送       | 真实连续执行 commit+push 的动作             |
| Compare branch       | 比较分支         | 分支比较入口                                |
| Repository           | 代码仓库         | 仓库信息                                    |
| Local servers        | 本地服务         | 当前本机开发服务                            |
| Editor               | 编辑器           | section 标题                                |
| Built-in editor      | 内置编辑器       | OmniMind 内部编辑器                         |
| Open in Cursor       | 在 Cursor 中打开 | 品牌保留原文                                |
| Usage                | 用量             | Engine/provider 用量                        |
| Outputs              | 产出             | Studio/任务产出                             |
| Recap                | 摘要             | 自动生成的任务摘要                          |
| Pinned messages      | 置顶消息         | checklist                                   |
| Text markers         | 文本标记         | 高亮/下划线标记                             |
| Sources              | 来源             | 任务来源                                    |
| Subagents            | 子智能体         | 运行中的 child 集合                         |
| Notepad              | 记事本           | 当前任务临时笔记                            |
| Project instructions | 项目指令         | 保留现有功能，仅规范可见文案                |

Notepad placeholder：

- `Add notes for this task…`
- `记录当前任务的临时信息…`

Local servers 状态：

- `Refresh local servers` / `刷新本地服务`
- `Scanning local ports…` / `正在扫描本地端口…`
- `Couldn’t scan local ports` / `无法扫描本地端口`
- `No servers running` / `没有正在运行的本地服务`
- `Local dev servers will appear here.` / `正在运行的本地开发服务会显示在这里。`

### 10.2 当前真实缺口

- `workbench.environment` 当前值为 `Workbench / 工作台`；
- `settings.environmentPanel` 当前值为 `Workbench panel / 工作台面板`；
- Environment sections 中 `Usage`、`Output`、`Recap`、`Pinned`、`Markers`、`Notepad`、`Type here`、`Project instructions` 大量硬编码；
- Local servers 的 refresh、stop、loading、error、empty、recovery 文案部分硬编码；
- `BranchToolbar` 中 `Continue in`、`New worktree`、handoff、rate limit 文案部分硬编码；
- `threadEnvironment.ts` 把 presentation labels 写成英文 literal；
- Git actions 菜单入口复用 `git.action.commitPush`；
- `i18nProductCopy.test.ts` 只扫描少量 Environment 文件，未覆盖整个 environment directory、BranchToolbar、threadEnvironment、notes、servers、markers、instructions；
- RightDock 的 tab close label、多个 loading/coming-soon/toast 仍有硬编码英文，若本轮触达正常可达路径，需要同变更闭合。

### 10.3 Namespace 边界

- `environment.*`：标题、section、状态、错误、恢复、tooltip、ARIA、placeholder；
- `threadEnvironment.*`：Local/Worktree/New worktree/Continue in 等跨表面模式词；
- `workbench.*`：Files/Diff/Terminal/Browser/Device 与真实操作区；
- `git.*`：真实 Git 操作。

不能全局重命名全部 `workbench.*`，也不能把所有中文“更改”机械替换为“变更”。事实值如 branch `main`、repo/path、URL、命令、Cursor、Engine/model、原始诊断不翻译。

## 11. Project instructions 边界

当前 `EnvironmentProjectInstructionsSection` 真实存在：

- per-project textarea；
- `500ms` debounce autosave；
- project 切换/unmount/blur flush；
- 可复制或追加到 thread notepad；
- 当前已有上层存储与 send path 关系需要独立调用链审计。

因此本轮不得称其为“假功能”。本轮只允许：

- 可见标题、placeholder、动作、ARIA 的中英闭合；
- 保留现有数据、autosave、copy 和 Prompt 行为；
- 不删除、不迁移、不重定义，不依据 `research/omnimind-prompt-management-review.md:67` 改产品行为。

若未来要裁决其 Prompt 语义，必须沿真实 route→store/API→dispatch→Provider prompt/event→reopen 链路另立证据并重新授权。

## 12. 可访问性、focus 与输入连续性

### 12.1 Environment

- toggle 使用真实 `aria-expanded/aria-controls` 或等价 pressed 语义，开关 label 随状态本地化；
- overlay 不强制抢焦点；用户仅点击 toggle 打开时，可保持当前焦点或把焦点送到第一个有意义控件，但行为必须一致；
- sheet 必须 focus trap，关闭后返回 toggle；
- hidden surface 应 `aria-hidden` 且不可 tab；
- Escape 关闭当前最上层临时表面，不串行清掉多个长期偏好。

### 12.2 Sidebar

- 自动 suppression 后，header 中仍有可发现的导航入口；
- 临时 overlay 使用 modal/sheet 语义与 scrim；
- 自动隐藏不能写 cookie/Settings；手动 toggle 继续写现有 owner；
- route/thread 切换时不产生意外 reopen。

### 12.3 Workbench

- split→exclusive 不丢 active pane、open files、terminal/browser lifecycle；
- Chat 与 Workbench 的切换控制可键盘访问并准确表达当前面板；
- inactive surface 是否 keep-mounted 由现有 pane runtime policy 决定，不用统一 `display:none` 粗暴卸载；
- Browser/webview、Terminal PTY 与 Device stream 的可见性/occlusion 通知必须继续准确。

### 12.4 Composer 与 Timeline

- IME composition、draft、attachments、voice、queued action、pending approval 不因 tier 改变而清空；
- stream 期间缩放不打断 tail anchor，不制造 scroll jump；
- Environment 开关不改变 timeline virtual/estimated width；
- Composer footer 在中文/英文、不同 model/permission label 下不 overflow。

## 13. 性能与冰山法则

视觉问题背后的不可见责任包括：

- ResizeObserver/React render 频率；
- Electron BrowserWindow 最小尺寸；
- Sidebar 用户 resize storage；
- RightDock webview/Terminal keep-mounted 与 native occlusion；
- MessagesTimeline tail anchor、stream 与 width-dependent height estimate；
- Composer overlay 的 ResizeObserver、bottom inset 与真实 DOM overflow probe；
- split/editor/terminal primary 等已有 surface modes；
- locale、CJK/IME、screen reader、reduced motion；
- thread 切换、reload、reopen 与 Settings default-open；
- packaged App 的 fresh profile 与主/Helper/Server 隔离。

因此只删除 `312px` 能修截图的主问题，但不能单独证明“完整响应式 Workbench 已完成”。同样，也不能因为冰山存在就建设一个全局 Layout Engine。最小候选只应沿现有 seam 补齐必要 presentation derivation 与 proof。

## 14. HTML storyboard 证据

`.zq-ui/responsive-workbench/` 先产生过说明型 `adaptive-inspector` 候选，但维护者于 2026-08-15 明确否决该版本，并确认后来更贴近当前 OmniMind 产品 Shell 的 `omnimind-shell-v2` 才是唯一选中方向。旧候选只保留为被拒绝的比较证据，不得进入 production。最新方向具备：

- 真实使用 OmniMind logo、Agent/Chat、项目/任务、现有 header/Composer/Environment/Workbench 语言；
- Environment 标题为“环境信息”，与 Workbench 分离；
- Timeline/Composer 不因 Environment toggle 改变几何；
- Sidebar 的 manual preference 与 auto suppression 分开；
- Environment 与 Sidebar 的 presentation 使用 hysteresis；
- Workbench 宽屏 split、受限时 exclusive；
- light/dark、full/reduced motion、`480/840/1100/1536` 已生成浏览器审计截图；
- axe-core 无 violation；static/browser audit 无 blocker。

补充的直接 Playwright 几何测量在 `1009px` 下得到：

```text
conversation: x=140.5, width=728
composer:     x=136.5, width=736
Environment toggle 前后四项 delta 均为 0
```

连续宽度序列 `1440 → 1009 → 840 → 695 → 465 → 1009 → 1440` 验证了：

- Sidebar 在压力区自动退场，放宽后按原偏好恢复；
- Environment 在更窄区自动压制，放宽后按原偏好恢复；
- 手动关闭状态不会被自动恢复覆盖；
- Workbench 在宽屏 split、受限区 exclusive；
- console 无 error，页面无横向 overflow。

这些是 design proof，不是 production proof。原型中的 `1100/1180/760/840` 是候选参数，必须由真实 Shell/Composer/RightDock 测量校准。

## 15. 最小生产 seam

### 15.1 必须修改

1. `ChatView` / Environment presentation：去除正常 desktop single-chat 的固定 content inset，使 Environment open/close 不改变 Timeline/Composer 几何；
2. `_chat` / Sidebar presentation：在现有手动 `sidebarOpen` 外派生 auto-suppressed 与临时 overlay，不写回用户偏好；
3. `SingleChatSurface` / RightDock presentation：保留 pane store 和 mounted lifecycle，在空间不足时从 split 转为 exclusive；
4. i18n：按角色拆 key，闭合 Environment/Thread environment/Git menu/Settings/search/ARIA/placeholder/error/recovery；
5. tests：补 pure state resolution、geometry、shell combinations、locale parity/hardcode scan、focus/reduced-motion；
6. packaged proof：从精确 pushed SHA 重建并以 fresh profile 验证连续拖动、toggle、split/exclusive、reload/reopen。

### 15.2 应优先删除或复用

- 删除 `ENVIRONMENT_DOCKED_CONTENT_INSET_PX` 及其 transcript/composer padding 责任；
- `EnvironmentPanel` 若不再需要两种相同 surface，可把 `docked|floating` 收敛为真实 presentation 名，而非保留伪差异；
- 复用 `useMediaQuery`、现有 Sidebar Sheet/offcanvas、RightDock pane store、`canComposerHandlePanelWidth`、motion token；
- presentation resolver 优先写成 pure function 并 focused test，不创建全局 store。

### 15.3 只有出现证据才允许增加

- 若 CSS/media query 无法观察用户 resized Sidebar + dynamic RightDock 的真实剩余宽度，可在最靠近 shell 的 owner 使用一个 ResizeObserver；
- 若临界区真实抖动，再加入局部 hysteresis；
- 若 exclusive 需要保留 Chat DOM 才能维持 stream/scroll，使用现有 inert/visibility/activation seam；
- 若 840px 仍无法容纳必要控制，优先收敛 header/secondary action disclosure，不降低 Composer 可读性。

## 16. 验收矩阵

### 16.1 状态组合

至少覆盖：

- Sidebar manual open/closed × auto allowed/suppressed × temporary overlay；
- Environment startup closed × session manual toggle × action-close × auto suppressed × temporary reveal；
- RightDock closed/split/exclusive × pane kind Files/Diff/Terminal/Browser/Device；
- PlanSidebar closed/open/auto-open/dismissed-for-turn × Environment/Workbench presentation；
- Chat single/split/editor/terminal-primary；
- fresh thread/normal thread/temporary thread；
- streaming/idle/pending approval/queued turn；
- reload/reopen/thread switch。

### 16.2 Viewport

- production minimum `840×620`；
- `1009/1050/1100` 问题区；
- `1280/1440/1536` 宽屏；
- `480` 仅作为 Web 压力测试，不作为降低 BrowserWindow minWidth 的证据；
- 高度受限状态，确保 Environment/menus/composer 不越界。

### 16.3 语言与辅助模式

- `zh-CN`、`en` catalog key parity；
- 中文长标签、英文长错误、路径/branch/URL；
- keyboard-only、screen reader、focus return；
- full/reduced motion；
- light/dark；
- CJK IME composition。

### 16.4 几何与性能

- Environment toggle 四项 delta ≤ `1px`；
- 连续缩放无横向 overflow、header overlap、Composer control clipping；
- tier 不在阈值附近抖动；
- ResizeObserver 不形成 loop；
- stream/tail anchor 不跳；
- Browser/Terminal/Device pane 不因 presentation 误卸载或后台持续占用不该持有的资源。

### 16.5 真实 App

按仓库规则从精确 pushed SHA：

1. 重建 Desktop artifact；
2. 停止既有 OmniMind 实例；
3. 用任务专用 `userData`、home、Provider private home 启动；
4. 从主进程、Helper、bundled Server 参数证明隔离；
5. 完成 Environment toggle、连续窗口拖动、Sidebar temporary overlay、PlanSidebar open/dismiss、Workbench split/exclusive、Terminal/Browser keep-state、language/reduced-motion journey；
6. 关闭并重开，核对 Environment 恢复为关闭且现有 pane state 不退化；Sidebar 的跨启动 rehydrate 不在 W1 contract，不能把当前不存在的行为写成通过条件；
7. 不读取、迁移或改写真实用户 `.pi`、`.omnimind`。

## 17. 反证与 stop-loss

出现任一项即停止扩张并回到最小 seam：

- 为响应式布局新增全局 store、数据库、migration、layout registry 或第二 Workbench state；
- Environment toggle 仍改变 Timeline/Composer x/width；
- 自动 suppression 写回用户手动偏好；
- RightDock exclusive 导致 terminal/browser/device 生命周期丢失或后台资源错误；
- resize 期间 React 按像素重渲染、Observer loop、明显掉帧或 stream/scroll 跳动；
- 为了对齐 Codex 重画 OmniMind Shell、复制视觉品牌或加入无产品职责的卡片/控件；
- 以 storyboard 的 breakpoint 代替 production 测量；
- 为本轮翻译全局改名内部 API 或 Project instructions 行为；
- 只跑 logic/unit 后宣称真实 Desktop 已完成；
- 480px Web 能渲染就直接降低 Electron `minWidth`；
- hardcoded 产品文案、placeholder、tooltip、ARIA、empty/error/recovery 仍在正常中英路径泄漏。

## 18. 不做与未来重开条件

### 当前不做

- 新响应式 framework；
- 全产品移动端重构；
- 多窗口/跨 route layout database；
- 环境信息中的新功能、Prompt manager 或 Project instructions 重定义；
- Workflow graph、Agent dashboard、第二状态面板；
- Codex 风格视觉复刻；
- 任意全局 i18n namespace 重构。

### 未来只有满足证据才重开

- 真实多 pane 组合证明 breakpoints 无法覆盖，需要 container-measured solver；
- 多 route 对同一 presentation state 有第二真实消费者，才考虑共享 resolver；
- 480px 下全部 route、dialog、webview、IME、a11y 与 packaged journey 通过，才讨论降低原生最小宽度；
- Environment 内容规模/任务证明 288px inspector 不足，才讨论可 resize；
- 用户研究证明 split/exclusive 切换难理解，才增加更明显的 panel switcher，而不是预先加导航层。

## 19. 复验触发器

以下变化只复验受影响结论：

- `ChatView`、`EnvironmentPanel`、Composer overlay 或 MessagesTimeline geometry 改动；
- Sidebar width/default/min、mobile breakpoint、Sheet/offcanvas primitive 改动；
- RightDock min/default/preferred width、pane activation/keep-mounted 改动；
- Electron `minWidth/minHeight` 改动；
- Environment startup/session-only open 语义改动；
- i18n catalog、Environment components 或 product-copy scan 改动；
- Browser/Device/Terminal native surface visibility/occlusion 改动；
- upstream Synara shell/layout intake；
- 当前 Codex 版本 UI 变化只影响参考观察，不自动推翻 OmniMind contract。

## 20. 最终可证伪裁决

候选只有同时满足以下条件才可称为“响应式 Workbench UI 完成”：

1. Environment 是环境信息检查器，Workbench 是真实操作区，命名和行为一致；
2. Environment 开关不改变 Timeline/Composer 几何；
3. Sidebar 手动偏好与自动空间压制分离；
4. Workbench 宽屏分栏、受限时单面板，且 pane/runtime state 不丢；
5. 连续拖动跟手，无阈值抖动、overflow、scroll jump、stream interruption；
6. 中英产品表面、Settings/search、placeholder、tooltip、ARIA、empty/error/recovery 完整闭合；
7. Project instructions 行为未被本轮偷改；
8. focused、browser、a11y、reduced-motion、packaged fresh-profile journey 均由同一 exact SHA 证明；
9. 没有新增第二 layout authority，也没有把 Codex 皮肤误当 OmniMind taste。

在这些证据之前，HTML 是已选 design proof，production 只能标记为 candidate，不能提前宣称用户已经拿到修复。
