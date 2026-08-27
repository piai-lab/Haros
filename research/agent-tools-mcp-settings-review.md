# OmniMind Agent 常驻工具、Built-in policy、Extensions 与 MCP Settings 全链路复核

> 首次证据日期：2026-08-19；当前清单复核：2026-08-21
>
> 当前清单 source snapshot：`main@e36b189e0c85c9b38069c492e8200e198aef296c`，与 `origin/main` 一致；该提交把 Built-in Host taxonomy 从历史三组正式拆为六组。
>
> 历史 Architecture 1.0 证据：`main@849730c508be0dde9570529431395acc7be2943b`；exact pushed code SHA `9c05e09027be374cc2e858536aad5ab79a394c45` 已完成 source/full/live/isolated-packaged closure，并通过 merge `5e22dd916ccba0dbc383fb0a9495f4888a69594b` 进入 main。历史证据用于解释 owner、生命周期和边界，不得覆盖 `e36b189e0c` 的六组当前事实。
>
> 文档角色：Settings、AgentGateway、Engine projection与MCP产品边界的证据owner；稳定UI与运行时合同分别由[`architecture/workbench.md`](../architecture/workbench.md)和[`architecture/execution.md`](../architecture/execution.md)拥有。
>
> 范围：本文主体保存“该source snapshot中有哪些常驻工具、何时实际进入模型调用面、设置变化后怎样生效”的历史证据。Chat/Studio产品面见[`chat-work-surface-contract-review.md`](chat-work-surface-contract-review.md)；当前六组×三工作面目标与source candidate见[`host-tools-product-surface-policy-review.md`](host-tools-product-surface-policy-review.md)。

> **2026-08-22 supersession：** 六组catalog数量与`e36b189e0c`历史source observation继续有效；全局`disabledBuiltInGroups`、fresh五组全开及Chat Browser-only不再是目标合同。三工作面explicit override、ProductSurface policy与Session-scoped guidance的最终合同只见Host策略研究和`architecture/execution.md`；本文不维护后续交付状态。

## 固定清单与术语

### “常驻”必须拆成五个不同事实

“代码里有这个工具”“Pi Registry 里注册了”“模型这轮看得到”“当前机器能执行”“这次调用被授权”不是一回事。本文使用以下精确定义：

| 术语                  | 准确定义                                                                           | 能否直接算进“当前模型可调用工具数”     |
| --------------------- | ---------------------------------------------------------------------------------- | -------------------------------------- |
| canonical/catalogued  | 某 owner 定义了稳定名称、schema 和 handler/projection                              | 不能                                   |
| registered/configured | 当前 Pi Session 的 Tool Registry 有这个名字和 definition                           | 不能；它可能 inactive 或被同名来源覆盖 |
| active                | definition 已进入当前模型请求的 tool surface                                       | 可以，但仍不代表调用会成功             |
| available/effective   | 设置允许，且平台、服务、投影与依赖当前可用                                         | 只说明具备执行前提                     |
| authorized/executed   | 当前 Session、Thread、Turn、scope、runtime mode 与调用参数通过最终检查，并实际执行 | 这是一次调用事实，不是常驻事实         |

因此，本文把“常驻工具”定义为：**产品默认组装、在一个 fresh OmniMind Agent 的正常 Agent Session 中 initial-active，并持续进入模型 tool schema 的工具**。另外单列“已注册但默认 inactive”的 Pi built-ins，以及用户/Project Extension 动态加入的非固定增量。

### 一句话结论

在 `main@e36b189e0c`、fresh 设置、Browser 服务可用、Device 保持 fresh default 关闭、没有同名冲突且不计用户/Project Extensions 时：

```text
默认 initial-active 常驻 = Pi 核心 4 + Todo 1 + Host 46 = 51
当前已注册/可配置基线 = Pi built-ins 7 + Todo 1 + Host 46 = 54
```

若用户显式开启 Device，且当前 macOS/Xcode/Simulator 服务真实支持全部 12 项：

```text
最大 product-bundled initial-active = 4 + 1 + 58 = 63
最大 product-bundled registered      = 7 + 1 + 58 = 66
```

这里的 `51 / 54 / 63 / 66` 都是**当前 snapshot 的可复核基线，不是公共 API，也不是任意机器、任意旧 Session 或任意用户安装状态的永恒常数**。

### 三个真实来源，而不是一个“大工具箱”

| 来源                               | 当前 owner                                                                                                               | 默认 Agent Session                         | Settings 的六组开关是否控制 | 当前固定数量               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | --------------------------- | -------------------------- |
| Pi/OmniMind Agent native built-ins | bundled `@omnimind/pi-coding-agent@0.84.3` Session/Tool Registry；`bash` 由 OmniMind process supervisor 提供同名受管实现 | 7 个注册，4 个 active                      | 否                          | active 4；registered 7     |
| Product Todo Session Extension     | `omnimind-agent-task-list` hidden inline Extension                                                                       | Agent surface 注册并 active                | 否                          | 1                          |
| AgentGateway Host Projection       | AgentGateway canonical catalog + hidden Pi Host Projection Extension                                                     | 当前允许且可用的 definitions 注册并 active | 是                          | fresh 常见 46；理论上限 58 |

用户级、团队级或 Project-local Pi Extension 也可能注册并默认激活自己的工具；它们由 ResourceLoader、Project trust、source precedence 和当前安装事实决定，所以不能写进 product-bundled 固定数量。Skill、Prompt、Package、MCP server 和 Timeline 展示分类也不能仅因“能影响 Agent”就混入这张工具清单。

## Pi native built-ins：7 个注册，默认只激活 4 个

bundled runtime 的 `createAllToolDefinitions()` 固定建立 7 个 base definitions；没有 `baseToolsOverride` 时，`defaultActiveToolNames` 只有 `read / bash / edit / write`。因此 `grep / find / ls` 是随 runtime 常备的注册能力，但不是当前默认模型调用面的“常驻四件套”。

| 工具    | registered | fresh initial-active | 核心职责                          | 关键边界                                                                                               |
| ------- | ---------- | -------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `read`  | 是         | 是                   | 读取文本、图片等受支持文件内容    | 路径与可读性由 native tool/cwd/进程权限决定；不是 Host Browser                                         |
| `bash`  | 是         | 是                   | 执行 shell 命令、测试与本地工作流 | OmniMind 传入 process-supervisor-backed 同名 definition；高风险仍受 runtime mode 与调用 authority 约束 |
| `edit`  | 是         | 是                   | 对现有文件做精确文本替换          | 不是自由补丁平台；匹配和写入失败必须如实返回                                                           |
| `write` | 是         | 是                   | 创建或完整写入文件                | 会改变工作区；不能因 active 推断已获越界写入授权                                                       |
| `grep`  | 是         | 否                   | 内容搜索                          | 可由 native active-set 机制启用；默认不占模型 schema                                                   |
| `find`  | 是         | 否                   | 按名称/模式发现文件               | 同上                                                                                                   |
| `ls`    | 是         | 否                   | 列目录                            | 同上                                                                                                   |

这 7 个 definition 和 Project/Chat/Studio 产品 surface 不是同一个概念。对 OmniMind Agent 的正式 Agent Session，cwd、Project trust 与 project-local resources 由 Product admission 提供；工具本身不会创造 Project authority。

## Product Todo：1 个独立常驻 Extension 工具

| 工具                    | 当前 Agent 状态                                   | 职责                                   | 数据合同                                                                           | 不是什么                                                                       |
| ----------------------- | ------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `omnimind_update_tasks` | `workSurface === "agent"` 时注册并 initial-active | 用完整快照替换当前 turn 的可见任务列表 | 1–50 项；`pending / in_progress / completed`；最多一个进行中；可带简短 explanation | 不是 Host tool、不是 Settings 六组之一、不是 durable Todo DB、不是自动必须调用 |

它只在非平凡工作确实受益于可见进度时使用。简单问答不应为了“工具存在”而强制调用。可信成功结果薄投影为 canonical `turn.tasks.updated`；如果 Pi precedence 选择了第三方同名工具，OmniMind 不得把第三方结果伪装为产品 Todo，产品 Todo 应准确降级为 unavailable。

## AgentGateway Host：六组、58 个最大 catalog entries

### 六组总表

| 顺序 | group ID      | 中文职责         | 工具数 | fresh default | availability 来源                        | capability 主边界                  |
| ---: | ------------- | ---------------- | -----: | ------------- | ---------------------------------------- | ---------------------------------- |
|    1 | `tasks`       | 任务与多会话协作 |     12 | enabled       | Server/Orchestration 常驻                | `thread:read` / `thread:write`     |
|    2 | `diagnostics` | 诊断             |      4 | enabled       | durable/projected/runtime evidence owner | `diagnostics:read`                 |
|    3 | `goals`       | 目标             |      1 | enabled       | Server/Orchestration 常驻                | `thread:write`                     |
|    4 | `automations` | 自动化           |      7 | enabled       | Automation owner                         | `thread:read` / `automation:write` |
|    5 | `browser`     | 浏览器           |     22 | enabled       | integrated Browser host                  | `browser:control`                  |
|    6 | `device`      | 设备             |     12 | **disabled**  | supported macOS/Xcode/Simulator service  | `device:control`                   |

六组是用户可理解的 global exposure policy 和 catalog provenance；**不是六个物理 Extension、package、进程、Registry 或 lifecycle owner**。OmniMind Agent 仍通过一个 named hidden Host Projection Extension 把当前 allowed + available definitions 注册进 Pi，并直接 active；执行永远回到 AgentGateway 对应 owner。

### Tasks：12 个

| 工具                           | 做什么                                                                                 | 关键语义/风险                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `omnimind_context`             | 读取当前 harness、caller Thread/Turn 与获准的协调能力                                  | 只读；是自我定位，不是授权生成器                                                  |
| `omnimind_capabilities`        | 列出 canonical Engine/model target、option keys、示例和 Gateway 限制                   | 创建子任务前应以此为准，不猜 Provider/model/options                               |
| `omnimind_list_projects`       | 列出普通 folder-backed Projects 的 id、标题与 workspace root                           | 排除 Chats/Studio managed containers                                              |
| `omnimind_list_threads`        | 按 Project、层级、Engine、模型、状态、标题、来源或时间发现任务                         | archived 默认隐藏；这是 discovery，不启动工作                                     |
| `omnimind_read_thread`         | 分页读取一个任务的状态和近期消息                                                       | 返回 newest-last、内容有界截断；旧消息用 cursor 继续                              |
| `omnimind_wait_for_threads`    | 等待 1–20 个已固定目标任务的当前 Turn，并按输入顺序返回进展/结果                       | timeout 只报告进度，不重试、不替换、不取消、不创建工作                            |
| `omnimind_create_threads`      | 一次原子计划创建 1–20 个独立任务，可选 local/worktree 与精确 Engine target             | preflight 失败不应部分创建；`requestId` 保证同一计划重试语义；可能创建分支/工作树 |
| `omnimind_create_thread`       | 创建恰好一个独立任务                                                                   | 两个及以上应使用 batch；同样受 Project、target 与 runtime mode 校验               |
| `omnimind_send_message`        | 给既有任务发送 follow-up；`queue` 等当前 Turn，`steer` 在 Engine 支持时转向运行中 Turn | 需要 caller 有权驱动目标；不把 Provider 不支持的 steer 伪装成功                   |
| `omnimind_interrupt_thread`    | 请求中断某任务当前运行 Turn                                                            | 返回的是 interrupt requested/当时是否有 active turn，不等于已经 settled           |
| `omnimind_set_thread_title`    | 重命名任务                                                                             | 需要驱动目标 Thread 的权限                                                        |
| `omnimind_set_thread_archived` | 归档或取消归档；省略 threadId 时可作用于自身                                           | 归档可能触发 managed worktree retention 清理；不是删除原始对话                    |

### Diagnostics：4 个

| 工具                                  | 做什么                                                                                                    | 证据边界                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `omnimind_read_thread_activity`       | 分页读取投影后的 Thread Activity                                                                          | stable page、newest-last、opaque cursor            |
| `omnimind_read_thread_events`         | 分页读取 durable orchestration event journal                                                              | 同消息连续更新可合并，但不跨越中间事件             |
| `omnimind_read_thread_runtime_events` | 读取保留的 Provider runtime events                                                                        | 有全局 retention cap；“没看到”前必须先检查覆盖范围 |
| `omnimind_diagnose_thread`            | 组合状态、消息、Activity、durable events、delivery blocker 与 stream incident，形成有界 forensic snapshot | 是诊断快照，不是第二 event store，也不替代原始证据 |

### Goals：1 个

| 工具                       | 做什么                                                    | 必须遵守的门                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `omnimind_set_thread_goal` | 设置/清除持久目标，或把 active goal 标为 achieved/blocked | 只有用户明确要求目标或明确创建追求该目标的任务时才能设置；不得从普通任务推断。achieved 只在真的完成时使用；blocked 只在同一外部阻塞连续三次阻止有意义进展后使用 |

### Automations：7 个

| 工具                                | 做什么                                                                          | 关键一致性/权限语义                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `omnimind_create_automation`        | 创建 heartbeat、standalone 或 dedicated 自动化，指定 execution mode 与 schedule | 默认应 `suggested:true`，除非用户明确要求直接创建                                                      |
| `omnimind_list_automations`         | 列出现有自动化的 identity、mode、schedule、target、enabled 与 next run          | 只读发现                                                                                               |
| `omnimind_view_automation`          | 查看完整 definition、recent runs、next run 与 memory excerpt                    | 修改前必须先读，取得最新 definition revision                                                           |
| `omnimind_update_automation`        | 完整替换 mutable configuration                                                  | 不是 partial patch；必须带 `expectedDefinitionRevision` 并重发所有未变字段；stale revision fail closed |
| `omnimind_cancel_automation`        | disable 保留历史，或 delete 归档自动化                                          | 需要最新 revision；已知停止条件优先写进 completion policy                                              |
| `omnimind_update_automation_memory` | 完整替换 DB-backed persistent memory，最大 32 KiB UTF-8                         | 省略 automationId 只允许 canonical run envelope；普通“继续”不继承 run authority                        |
| `omnimind_report_automation_result` | 仅在 canonical automation run Turn 上报 structured result                       | manual follow-up 不得冒充 run；`silent` 只用于成功且无需注意，失败始终可见                             |

### Browser：22 个

Browser 控制的是**当前 Thread scope 内共享、可见的 OmniMind integrated Chromium/WebView**：同一 DOM、cookies 和 session；不是独立无痕浏览器，也不是 desktop computer-use。`tools/list` 存在不代表 Browser host 可用；所有真实调用仍绑定 provider Session 与 active Turn。

| 工具                 | 做什么                                                                   | schema annotation / 关键边界                                                                                                     |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `browser_status`     | 查询 Browser host 可用性与当前分配                                       | read-only local；不创建或切换 tab                                                                                                |
| `browser_tabs`       | 列出当前 Thread scope 的 tabs                                            | read-only local；不改变 focus/assignment                                                                                         |
| `browser_open`       | 打开或复用 session-affined scoped tab                                    | mutating open-world；是否显示 surface 由 `show` 等参数决定                                                                       |
| `browser_navigate`   | 导航到 http/https URL 或本地解析的 annotationId                          | mutating open-world；拒绝 tool-input `file:`；导航后应重新 snapshot                                                              |
| `browser_back`       | 在真实 Chromium history 后退                                             | mutating open-world；可能执行页面 lifecycle handlers                                                                             |
| `browser_forward`    | 在真实 Chromium history 前进                                             | mutating open-world；结果需重新观察                                                                                              |
| `browser_reload`     | 重载，cache bypass 需显式请求                                            | mutating open-world；可能重复网络请求/页面副作用                                                                                 |
| `browser_resize`     | 改变 guest viewport                                                      | idempotent local；会使旧 geometry 失效                                                                                           |
| `browser_snapshot`   | 读取有界 WAI-ARIA semantics、可见文本、action refs，可选 PNG/diagnostics | read-only open-world；元素动作优先使用带 snapshotId 的 fresh ref                                                                 |
| `browser_screenshot` | 截取 viewport 或有界 full-page PNG                                       | read-only open-world；像素确有必要时再用，优先 snapshot                                                                          |
| `browser_logs`       | 读取有界 console/exception 与 request/response/failure metadata          | read-only open-world；不返回 headers、request body 或 response body                                                              |
| `browser_click`      | 点击一个精确目标                                                         | destructive/open-world annotation；可能导航、提交或触发外部效果；OAuth popup 要停下让用户完成                                    |
| `browser_hover`      | 把可信 pointer 移到目标上                                                | mutating open-world；可能展开菜单/tooltip，使旧 snapshot 过时                                                                    |
| `browser_drag`       | 在共享 WebView 内做一次受限 drag                                         | destructive/open-world annotation；可能重排、上传或触发页面效果                                                                  |
| `browser_type`       | 替换或 append editable target 的值                                       | destructive/open-world annotation；不得把秘密写进日志或 evaluate 输出                                                            |
| `browser_select`     | 对一个 select 选择精确 option values                                     | destructive/open-world annotation；普通 select 只能一个 value                                                                    |
| `browser_upload`     | 向 enabled file input 附加 regular files                                 | destructive/open-world annotation；只接受 workspace-relative，拒绝 traversal、目录和越过 root 的 symlink；无明确意图不得上传秘密 |
| `browser_press`      | 向页面发送规范化 key chords                                              | destructive/open-world annotation；拒绝 privileged OS/app/browser/clipboard chords                                               |
| `browser_scroll`     | 按方向、pixel 或 page 模式滚动 viewport/target                           | mutating open-world；新内容重要时重新 snapshot                                                                                   |
| `browser_wait`       | 等待 1–8 个闭合条件，或做有界 delay                                      | read-only open-world；timeout 不是后台无限等待，之后仍需 snapshot 验证                                                           |
| `browser_evaluate`   | 在同一页面 main world 执行一个有界表达式并返回 JSON                      | destructive/open-world annotation；优先 semantic actions，不能用来绕过 navigation/network/native-surface policy                  |
| `browser_close`      | 永久关闭当前或精确 scoped tab                                            | destructive local；会使全部 refs 失效，工具本身不可撤销                                                                          |

### Device：12 个

Device 当前只表示 OmniMind 的 iOS Simulator 能力。fresh profile 默认关闭；即使用户开启，也必须有受支持的 macOS/Xcode/Simulator service 才会进入 effective catalog。开启分组不证明每个 entry 已通过所有产品准入，也不把 Agent 操作等同于人类 Device pane 操作。

| 工具                       | 做什么                                                                | 关键边界                                                                          |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `device_list`              | 列出可驱动 Simulator、runtime、boot state 与 boot owner               | 只读；其他 device 工具前先拿精确 udid                                             |
| `device_boot`              | 启动 Simulator                                                        | 有 OmniMind 自启动数量上限；`boot-limit-reached` 是应转告用户的拒绝，不是重试错误 |
| `device_install`           | 向已启动 Simulator 安装构建好的 `.app`                                | OmniMind 不负责 build；必须传现成 bundle path                                     |
| `device_launch`            | 按 bundle id 启动已安装 app                                           | 可带 launch arguments                                                             |
| `device_open_url`          | 打开 URL/deep link                                                    | **始终需要用户明确批准**；属于 open-world mutation                                |
| `device_tap`               | 按 accessibility label/role 或 device point 点击                      | 优先 label；坐标是 device points 不是 screenshot pixels；按 label 时会自行滚动    |
| `device_swipe`             | 在两个 device points 间滑动                                           | duration 有界                                                                     |
| `device_type`              | 向已聚焦 field 输入文本                                               | 本工具不会自己 focus，必须先 tap                                                  |
| `device_press_button`      | 按 home、lock、volume-up/down                                         | 真实设备状态变更                                                                  |
| `device_screenshot`        | 采集 PNG                                                              | 只读；定位元素优先 `device_describe_ui`                                           |
| `device_describe_ui`       | 读取 accessibility roles、labels、values、frames 与 activation points | canonical 元素定位方式；可用复读 tree 验证 toggle 状态                            |
| `device_scroll_to_element` | 迭代滚动并重读 tree，直到目标进入 tappable band                       | 找内容时替代手写 swipe loop；`device_tap(label)` 已内置此能力                     |

## 数量公式与典型场景

对正式 OmniMind Agent 的一个 Agent Session：

```text
Product registered
= 7 Pi base definitions
 + bundled Todo（若 exact product source 赢得同名 precedence）
 + 当前 policy ∩ availability ∩ projection 成功的 Host definitions

Product initial-active
= 4 Pi default-active built-ins
 + bundled Todo active
 + delivered Host definitions active

Actual active
= Product initial-active
 + 当前 global / trusted Project Extensions 的 active tools
 - 所有同名 collision、加载失败、surface admission 或 projection failure
```

| 场景                                        |   Host effective | product registered | product initial-active | 说明                                               |
| ------------------------------------------- | ---------------: | -----------------: | ---------------------: | -------------------------------------------------- |
| fresh；Browser 可用；Device 默认关闭        |               46 |                 54 |                 **51** | 当前最有代表性的默认基线                           |
| Device 显式开启且 12 项可用                 |               58 |                 66 |                 **63** | 当前 product-bundled 理论上限                      |
| Browser 不可用；其余前四组可用；Device 关闭 |               24 |                 32 |                 **29** | Browser enabled intent 不会伪造 availability       |
| 六组全部 disabled                           |                0 |                  8 |                  **5** | 仍有 Pi 7 registered + Todo；active 为 Pi 4 + Todo |
| Todo 被 foreign same-name source 覆盖       | 上述 Host 数不变 |   产品 Todo 不可用 |     上述 active 再减 1 | 第三方 winner 不能污染 canonical task projection   |

“Host 46”由 `tasks 12 + diagnostics 4 + goals 1 + automations 7 + browser 22` 得出。“Host 58”再加 `device 12`。如果 Browser service unavailable，它的 22 个 canonical entries 可以仍有 catalog identity，但不会进入 exposed/delivered Host surface；Device service unsupported 时当前 assembly 甚至不会构造其 12 个 Tool entries。UI 必须读 runtime projection 的 `toolCount / availableToolCount / availability / enabled / effective`，不能硬编码这里的数字。

## 设置、Session 与调用生命周期

### Fresh default 与 v3 迁移

- 只有从未存在有效 ServerSettings 文件才叫 fresh；fresh 默认前五组 enabled，Device disabled，且启动不为此 ambient write。
- 当前 settings migration version 是 `3`。
- 旧 aggregate `omnimind` 若 disabled，一次展开为 `tasks / diagnostics / goals / automations` 全部 disabled；若旧 aggregate 没禁用，四组全部 enabled。
- 旧 `browser`、`device` 与有界 unknown IDs 原样保留。
- migration 后退休旧 `omnimind` group ID；不保留 runtime alias、双轨或隐藏兼容开关。
- corrupt snapshot 无法证明用户意图，必须沿现有 quarantine/diagnostic 与安全默认处理，不能伪称“保留了选择”。

### Toggle 的真实效果

1. Settings 只持久化用户的 disabled/enabled intent，不持久化 availability、active set、authorization 或 in-flight 状态。
2. disable 后，新 Session 不投影/注册该组；旧 Session 可能暂时仍显示 stale schema，但新 call 必须由 Gateway 按当前 policy fail closed。
3. 普通 toggle 不伪取消已经 admitted 的 in-flight call；cancel/timeout 仍归 Turn/Session owner。
4. re-enable 只有在 service available 时 effective，并只沿目标 Engine 的真实 reload/new Session seam 生效；不向稳定旧 Session 偷偷注入 schema。
5. Built-in policy 是所有正式 Agent Engine 的全局 Host exposure 上限，不是 OmniMind Agent 私有设置，也不影响 Browser/Device 的人类 UI。

### 每次 Host call 仍要重新过门

Host tool 已 active 也不构成长期通行证。每次真实 `tools/call` 至少重新检查：current policy、Session identity/credential、caller Thread/Turn、required capability/scope、exact active Turn、runtime permission/真实 approval、service availability、timeout/cancellation。read、wait、diagnostics 也不能因为“只读”绕过 exact-turn admission。

## Collision、provenance 与故障语义

- AgentGateway 自己的 catalog 内同名：construction 直接失败，不能静默后者覆盖前者。
- Pi native / bundled / user / Project Extension 同名：继续服从 Pi ResourceLoader/Tool Registry precedence；OmniMind 只 claim `sourceInfo` 能证明属于 exact product inline source 的 winner。
- Host partial collision：只让对应 capability unavailable；Session 其余能力继续，不能把 foreign winner 当作 Host tool，也不能为“保持数量”建立 alias。
- projection/discovery/service failure：准确减少 Delivered Host Surface；不能让 adapter 模拟成功或由另一 Engine 代办。
- Prompt guidance 只能描述实际 delivered groups，不得保留旧 dynamic search/activate 指南，也不得承诺已经被 collision/availability 裁掉的工具。

## 明确不计入“产品常驻工具”的能力

| 能力                                                             | 为什么不计入固定清单                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `grep / find / ls`                                               | 是 Pi base registered definitions，但 fresh 默认 inactive；本文已经作为“常备但非默认 active”单列                             |
| user/team/Project Extensions 的 tools                            | 数量与 identity 由安装、trust、scope、precedence 和当前 Session 决定，不是 product fixed baseline                            |
| Skills / Prompts / Packages                                      | 是不同生命周期资源，不是 ToolDefinition                                                                                      |
| third-party MCP servers                                          | 首版没有 OmniMind 统一 MCP Settings/总 Registry；只有通过真实 Engine/Extension seam 投递后，具体 tool 才可能进入当前 Session |
| External connections tools                                       | 外部 app → OmniMind 的 principal、scope、credential 与 public surface，和 Provider Session Host tools 是不同 authority       |
| Timeline 的 command/edit/read/search/agent/tool/image categories | 只是 UI 汇总分类，不是工具来源、注册或 Settings taxonomy                                                                     |
| 已删除的 Host search/dynamic loader                              | 当前没有 `search_tools` / `omnimind_search_tools` 应计入 Host；future dynamic 只能由具体 Extension owner 自己拥有            |
| Browser/Device 人类 UI actions                                   | 人类界面可用性不由 Agent Built-in policy 开关控制                                                                            |

## 当前状态、证据边界与复验触发器

- `e36b189e0c` 已提交并推送到 `main/origin/main`，六组 contract、Gateway assembly、v3 settings migration、Settings UI/i18n、harness guidance 与相关 tests 同关注点闭合。
- 本文只证明该 source snapshot 的 current product baseline；不凭 Git SHA 推断任意用户机器当前打开的旧 Session、实际 settings、Extension 安装、Browser/Device service 或安装包一定一致。
- 当前工作树另有一个尚未完成的多 Engine Host 管理审计 candidate；在它形成提交、测试和 owner 同步前，本文不把其未提交 diff 晋升为稳定产品事实。
- 以下变化才触发相应重验：bundled Pi runtime/version、default active base tools、Session Extension composition、AgentGateway group/catalog/count、Browser catalogue、Device service entries、settings migration/default、Pi precedence/sourceInfo、Engine projection、exact-turn authority，或用户/Project Extension 的实际安装事实。

主要 current-source 入口：

- Pi base registry/default active：`vendor/omnimind-pi-coding-agent-0.84.3.tgz` 内 `package/dist/core/agent-session.js` 与 `package/dist/core/tools/index.js`
- OmniMind Session composition：[`apps/server/src/provider/omnimindSessionExtensions.ts`](../apps/server/src/provider/omnimindSessionExtensions.ts)
- Todo definition/provenance：[`apps/server/src/provider/omnimindTaskListExtension.ts`](../apps/server/src/provider/omnimindTaskListExtension.ts)
- 六组 contract：[`packages/contracts/src/agentTools.ts`](../packages/contracts/src/agentTools.ts)
- Host catalog assembly：[`apps/server/src/agentGateway/Layers/AgentGateway.ts`](../apps/server/src/agentGateway/Layers/AgentGateway.ts)
- group exposure projection：[`apps/server/src/agentGateway/toolCatalog.ts`](../apps/server/src/agentGateway/toolCatalog.ts)
- v3 migration：[`apps/server/src/serverSettings.ts`](../apps/server/src/serverSettings.ts)
- Browser canonical catalogue：[`packages/shared/src/browserAutomationCatalogue.ts`](../packages/shared/src/browserAutomationCatalogue.ts)
- Device tools：[`apps/server/src/agentGateway/deviceTools.ts`](../apps/server/src/agentGateway/deviceTools.ts)

下文保留 Settings、跨 Engine projection、External connections 与 MCP 的深层历史/边界证据。若只需要回答“目前 OmniMind Agent 有哪些常驻工具”，读到这里已经完整；下文不能用旧三组叙述覆盖上面的 `e36b189e0c` 当前清单。

## 0. 结论先行

首版只保留三个不会互相吞并的产品概念：

1. **Built-in tools / 内置工具**：控制OmniMind Host capabilities是否暴露给所有Agent Engine；
2. **External connections / 外部连接**：管理外部应用如何连接OmniMind；
3. **Extensions（未来独立表面）**：投影Pi原生ResourceLoader/package truth，不在本轮建设Manager或Marketplace。

首版不提供第三方MCP Settings、server CRUD、credential/OAuth UI、连接测试、全局状态面板、统一工具搜索或自动跨Engine分发。

Host运行时目标也已改变：

- 一份AgentGateway canonical catalog；
- 同一全局Built-in policy覆盖所有Agent；
- OmniMind Agent通过named hidden Pi Host Projection Extension注册allowed+available definitions，并在当前方案中直接active；
- stock Pi与其他Engine继续各自native direct/eager projection；
- 删除Host-owned callable loader、inactive pool与activation preflight；
- future dynamic只属于具体Extension owner。

历史基线main实现旧Host dynamic方案；当前main已单轨删除该责任并改为eager Host Projection。两者必须分开：旧main只提供历史source evidence；`9c05e0902`是已完成Gate B证据、并由`5e22dd916`合入main的production candidate，但不是Release或真实安装。

## 1. 产品问题不是“MCP页面放哪里”

MCP是协议，不是一个天然产品页面。必须先问用户结果和direction：

| 用户结果                                     | 正确入口                     | direction                          |
| -------------------------------------------- | ---------------------------- | ---------------------------------- |
| 控制Agent能否使用OmniMind内置能力            | Built-in tools               | OmniMind → Agent                   |
| 让Codex、Claude等外部应用连接OmniMind        | External connections         | external app → OmniMind            |
| 安装/启用Pi生态Extension                     | future Extensions projection | package/Extension → OmniMind Agent |
| 管理GitHub、Notion、数据库等第三方MCP server | 首版不产品化                 | external server → OmniMind Agent   |

把四者合并成“MCP Settings”会立刻引入错误owner：credential、OAuth、process、reconnect、approval、project config、audit、status与跨Engine分发都会变成Host长期责任。

## 2. 两类MCP必须分开

### 2.1 OmniMind-owned AgentGateway MCP

AgentGateway是OmniMind自己的Host capability transport：

- Tasks；
- Diagnostics；
- Goals；
- Automations；
- Browser；
- Device；
- 未来同一Gateway owner下的canonical tools。

外部Engine继续通过各自原生MCP/plugin seam使用这些能力。OmniMind Agent可以通过Pi inline Extension投影同一definitions，但execute仍回到Gateway。这条链路不是第三方MCP管理。

### 2.2 third-party MCP

GitHub、Notion、数据库、搜索服务等MCP server未来可能成为某个Pi Extension或adapter的能力来源，但首版不提供OmniMind专属Settings来管理。

即使未来adapter支持lazy discovery/proxy：

- discovery不负责server config、secret、OAuth、process、reconnect、approval或audit；
- discovered/active不等于authorized；
- 不为搜索自动连接所有servers；
- 不把全量schemas注入context；
- 不建立Host+third-party总Registry或统一权限系统；
- 是否分发给其他Engine必须单独证明用户结果。

## 3. 强Host平权

```text
Desired Host Surface
= canonical Gateway catalog
∩ ProductSurface support
∩ configured intent/default
∩ machine/service availability

Delivered Host Surface
= Desired Host Surface
∩ thread-scoped Engine projection successfully installed
```

所有健康、正式支持Engine应获得同一Desired Host Surface。Provider identity只决定如何投影，不决定长期Host等级：

| Engine                | projection                                                  |
| --------------------- | ----------------------------------------------------------- |
| OmniMind Agent        | named hidden Pi Host Projection Extension，当前eager-active |
| stock Pi              | Pi `customTools` direct/eager                               |
| Codex                 | native MCP config                                           |
| Claude                | native MCP server seam                                      |
| OpenCode/Kilo         | native remote MCP                                           |
| ACP/Cursor/Grok/Droid | native ACP/HTTP/proxy seam                                  |
| Antigravity           | supported plugin/MCP seam                                   |

projection失败、partial collision或service unavailable必须准确呈现为运行事实，并修adapter；不能把少一组工具固化为该Engine的正常产品等级。

平权只覆盖Gateway Host surface、global exposure policy与Gateway call-time authority，不统一各Engine的Bash、read/edit/write、sandbox、approval、Todo、context、resume或Package。

## 4. Built-in policy的唯一语义

### 4.1 policy是用户intent，不是runtime快照

Settings只持久化用户disabled/enabled intent。以下状态不得混写：

| 状态                | owner                         | 是否持久化               |
| ------------------- | ----------------------------- | ------------------------ |
| fresh default       | ServerSettings schema/default | 仅用于无显式选择的新配置 |
| explicit choice     | revisioned ServerSettings     | 是                       |
| availability        | Host service/platform         | 否                       |
| registration/active | 当前Engine Session            | 否                       |
| call authorization  | AgentGateway admission        | 否                       |
| in-flight/cancel    | turn/session owner            | 否                       |

未知group ID可以有界round-trip以保留前向兼容，但不产生运行效果。UI数量与availability必须来自canonical catalog/runtime，不能硬编码。

### 4.2 已确认fresh defaults

brand-new且没有settings文件时：

- Tasks：enabled；
- Diagnostics：enabled；
- Goals：enabled；
- Automations：enabled；
- Browser：enabled；
- Device：disabled。

六组 taxonomy 已由 `e36b189e0c` 冻结进当前 contracts、Gateway、Settings UI 与 architecture，不再是待定命名。该裁决不覆盖已有用户明确选择。这里不能依赖当前 decoded settings 猜来源：`disabledBuiltInGroups` 使用 decoding default，因此 raw 字段缺失与显式 `[]` 在 decode 后不可区分。

### 4.3 Gate B migration contract

不新增store、marker或第二migration framework；复用现有settings文件存在事实、revisioned envelope与`migrationVersion`，并在schema decoding default抹掉字段存在性之前判定：

| raw输入                              | 目标 intent                                | v3 升级结果                                                                            |
| ------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| settings 文件不存在                  | brand-new；前五组 enabled、Device disabled | 仅在内存使用 fresh default；启动不 ambient write                                       |
| existing legacy snapshot，字段缺失   | 保留旧三组全部 enabled                     | Tasks/Diagnostics/Goals/Automations/Browser/Device 全部 enabled                        |
| existing snapshot，显式 `[]`         | 保留显式旧三组全部 enabled                 | 六组全部 enabled                                                                       |
| existing snapshot，显式 `[omnimind]` | 保留旧 aggregate disabled                  | 展开为 Tasks/Diagnostics/Goals/Automations 全部 disabled；Browser/Device 仍按旧 intent |
| existing snapshot，显式 `[device]`   | 保留 Device disabled                       | 当前版本保持 `device`                                                                  |
| existing snapshot，含 unknown IDs    | 保留已知与 unknown IDs                     | normalize 后有界 round-trip；unknown 不产生运行效果                                    |
| corrupt snapshot                     | 无法证明任何显式选择                       | 沿现有 quarantine/diagnostic，使用当前安全默认；不得称为 fresh 或“保留选择”            |

迁移必须是一次有界的existing→current版本转换。它不授权新的用户迁移数据库、LKG、双读或长期compat marker。若未来维护者选择pre-public reset，必须在sole owner明确接受覆盖损失后替换本合同，不能让实现自行决定。

### 4.4 disable与re-enable

disable某组：

1. 新Session的Desired Host Surface排除该组；
2. OmniMind Agent不注册该组；
3. 其他Engine不投影该组；
4. 旧Session stale schema可以暂时可见；
5. 所有旧Session新call由Gateway按当前policy即时deny；
6. 已admitted in-flight不被普通toggle伪取消。

re-enable：

- 只有policy允许且availability成立时才effective；
- 只按目标Engine真实reload/new Session边界投影；
- OmniMind Agent注册后直接active；
- 不向稳定旧Session偷偷注入未注册schema；
- 不建per-turn active controller或第二store。

Device disabled不是“注册为inactive”。没有activator的inactive tool不可发现；exposure policy必须在projection/registration边界表达。

### 4.5 partial availability

同组部分能力不可用时，UI显示ephemeral degraded与真实可用数量。degraded不是用户选择，不能写回Settings。Device enabled也不等于所有handler都具有可执行闭包；availability必须覆盖service、platform和真实execution prerequisites。

## 5. Settings信息架构

### 5.1 Built-in tools

正常产品语言只表达：

- 这组能力是什么；
- 当前是否允许Agent使用；
- 当前机器/服务是否可用；
- 更改何时对新会话生效；
- 旧会话中的新调用会被拒绝；
- human Browser/Device UI不受影响。

不出现：

- Pi；
- MCP transport；
- Tool Registry或active set；
- loader/search；
- 具体工具数量硬编码；
- Engine selector；
- 逐tool权限矩阵。

### 5.2 External connections

页面表达“外部应用连接OmniMind”，保留既有pairing、project scope、credential、revoke、expiry与last-used facts。没有heartbeat时不能显示“当前在线”。

新连接默认选定Projects而不是未来所有Projects；至少有一个Project才能创建。内部section id可继续保留`integrations`以兼容deep link，但普通产品表面不称其为MCP manager。

### 5.3 future Extensions

未来若提供Extensions表面，只能投影Pi ResourceLoader/package truth：

- product-bundled；
- team；
- user/third-party；
- source、version、provenance、availability与原生lifecycle。

它不能创建第二安装DB、Registry、排序器、cache或统一loader。它也不自动把Pi Extensions分发给Codex/Claude。

## 6. OmniMind Agent Host Projection

本任务分支source形状：

```text
current policy
∩ availability
∩ AgentGateway canonical catalog
  → trusted descriptors
  → named hidden Host Projection Extension
  → Pi Tool Registry
  → registered + active
  → model calls ToolDefinition
  → AgentGateway tools/call
```

Host Extension拥有projection、collision/provenance与Pi Session wiring，不拥有Gateway execution、credential、permission或其他Extensions。

当前物理上保留一个Host Projection Extension，因为各Host组共享同一catalog、execute、credential、scope/cancel与Session投影生命周期。Settings分组不等于物理Extension分包。未来某组只有在独立source/package/version/install/lifecycle或具体dynamic证据成立时才抽取。

## 7. Dynamic Tool Loading边界

Pi原生支持Extension owner-local Dynamic Tool Loading，但没有默认全局callable search tool。官方loader只是Extension-local示例pattern，不是产品级总搜索。

当前Host不采用dynamic，原因见[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)。未来判断规则：

- 少量/常用：eager；
- 大量/稀疏且有真实schema/attention证据：该Extension自带loader；
- loader只管理自身；
- 没loader不得inactive；
- upstream有全局机制时优先upstream；
- 永不恢复Host/global search manager。

这与Built-in policy正交：Device不注册是用户exposure选择，不是dynamic activation。

## 8. Prompt truth

Prompt必须与实际Delivered Host Surface一致：

- direct/eager Engine只收到其实际filtered definitions对应的简短跨工具指导；
- OmniMind Agent不再出现“先search/activate”的dynamic guidance；
- ToolDefinition描述普通用法与参数；
- generic harness只保留authority、Automation run-only、Browser human interruption/abort、untrusted page/file/device content等不变量；
- 不把完整catalog、schema或长Browser/Device手册搬进system prompt；
- partial collision或projection failure时不承诺不存在的Host能力。

Goal/Automation prompt可以描述真实职责，但不再承担activation preflight。其依赖的canonical capability必须已经位于Delivered Host Surface；缺失时对应dispatch fail closed并准确unavailable。

## 9. Collision、authority与生命周期

### 9.1 collision

- Gateway内部duplicate：拒绝不可信catalog；
- foreign Pi Extension同名winner：按Pi precedence继续运行；
- Host只claim`sourceInfo`证明由exact Host inline source赢得的names；
- foreign winner不获得Gateway provenance、Host prompt承诺或事件投影；
- collided capability局部unavailable，依赖它的dispatch fail closed；
- Session其余能力继续；
- owned delivered set只在当前Session派生，不持久化。

### 9.2 call authority

`registered != active != exposed != available != authorized != executed`。

`runtimeMode`只决定一个已exposed、当前available且属于任务意图的具体能力是否再收普通approval。它不证明Device每个entry都属于普通能力，不证明12/12 executable closure或产品准入，也不替Browser download决定artifact落点、receipt或恢复。Settings enablement、逐entry availability/安全分类、runtimeMode和最终execute必须分别验证。

每次Provider-facing真实`tools/call`必须重新检查：

- current policy；
- session identity与credential；
- capability/scope；
- runtime permission与真实存在的approval；
- exact active turn；
- availability；
- timeout/cancellation。

`tools/list`可以在有效Session、turn外用于初始化。read、wait与diagnostics也不能因“只读”绕过Provider exact-turn call authority。应扩展既有ingress gate，不创建per-turn token/lease manager。

### 9.3 races

- rapid Settings mutations串行化或generation-fenced；
- stale response不能覆盖新intent；
- failure后回读Server truth；
- toggle不取消in-flight；
- explicit cancel/timeout继续传播；
- Session replacement后旧handler/late result不污染新turn。

## 10. Todo与其他Extensions

Todo是独立、product-bundled Pi Session Extension，不属于Host/MCP/Built-in policy。当前 source 只在 OmniMind Agent work surface 注册并 initial-active。其他 work surface 的目标策略不属于本文，见 [`chat-work-surface-contract-review.md`](chat-work-surface-contract-review.md)；Todo 的 bounded 证据 owner 是 [`pi-native-todo-extension-review.md`](pi-native-todo-extension-review.md)。

Pi built-ins、supervised Bash、团队/第三方Extensions、Skills与Packages也保持各自owner。Host不得盘点、保留、移除或搜索它们。

## 11. External connections与External MCP authority

外部应用→OmniMind使用`ExternalClientPrincipal`、pairing scope、credential、revoke与audit。这条authority与Provider Session不同：

- 不套Provider active-turn规则；
- 不进入Built-in group；
- 不进入Pi Host Projection；
- 不与Host catalog合并；
- 不因“连接存在”推断在线；
- 不因未来third-party MCP adapter而共享credential或process owner。

## 12. 基线、分支实现与证据成熟度

### 12.1 基线main的历史source evidence

已合入main的旧Gate B证明：

- revisioned all-agent policy与Settings UI；
- Host inline Extension、sourceInfo、collision与reload seam；
- Todo独立Extension；
- Gateway execute bridge与call-time checks；
- Pi dynamic/deferred wire与MiMo/DeepSeek compatible endpoint journey；
- isolated packaged startup。

但它也仍包含被新裁决否决的Host loader、inactive pool、preflight与dynamic prompt。旧绿色测试证明旧实现自洽，不证明它仍是正确产品方向。

### 12.2 architecture-confirmed target

- 删除Host search/dynamic责任；
- Host Projection eager-active；
- strong Host parity；
- product-bundled composition seam；
- PiAdapter瘦身；
- Tasks/Diagnostics/Goals/Automations/Browser/Device 六组 taxonomy；
- fresh 前五组 on、Device off；
- legacy `omnimind` aggregate 一次展开并退休；
- prompt/context diet；
- exact-turn覆盖所有Provider calls；
- partial collision局部degrade。

### 12.3 已合入实现证据

`9c05e0902` 已完成 raw settings migration 与 Device fresh default、统一 Gateway→Pi 投影、显式有限 composition、async Host factory native reload、eager active、collision 局部降级、lease/Delivered capability 分离、prompt diet、所有 Provider `tools/call` 的 ingress exact-turn，以及一个非 Host owner-local dynamic wire conformance。六组 taxonomy 与 v3 migration 后续由 `e36b189e0c` 合入并推送到 `main/origin/main`。两者共同构成本文当前源码清单的历史机制证据与 current taxonomy 证据；都不能单凭 source 状态证明任意本机安装包或旧 Session 已同步。

## 13. Gate B最终交付证据

以下是 `9c05e0902` Architecture 1.0 的历史 final gates、live 与 packaged 结果；它证明 owner/投影/authority 基线，不证明后续六组 artifact：

- no-file fresh profile在内存显示OmniMind/Browser on、Device off且没有ambient settings write；显式开启Device后保存`disabledBuiltInGroups: []`，同隔离profile关闭/重开仍为on；source矩阵另覆盖legacy missing field、explicit off、unknown、corrupt、migration写失败与并发revision；
- MiMo Token Plan CN和DeepSeek V4 Pro均真实调用同一Host catalog中的`omnimind_list_projects`；DeepSeek还完成Goal achieved与Automation result上报；
- provider identity错误的首次MiMo probe得到401，而同一凭据direct token-plan endpoint为200；改用Pi精确`xiaomi-token-plan-cn`后通过。该诊断没有变成model-name猜测、alias或生产补偿；
- packaged process参数证明Electron Helper、Renderer与bundled Server均使用任务专用home/userData；优雅退出后无存活owner；
- exact code SHA `9c05e0902`对应DMG SHA-256为`8357594e71dc4c2b212b7ea84910a8752b5eb28a40d3ee942deabd9d1db31f64`，没有安装、发布或合并。

任何后续shipped-code修正都必须产生新commit、新push SHA并重建artifact；不能在旧artifact上补文档宣称完成。docs-only evidence SHA不得冒充新shipped bytes。

## 14. 验收矩阵

| 场景                         | 期望                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| fresh config                 | Tasks/Diagnostics/Goals/Automations/Browser enabled，Device disabled |
| legacy missing field         | 保留旧三组全部 enabled intent 并物化当前六组 snapshot                |
| legacy `omnimind` disabled   | 展开为 Tasks/Diagnostics/Goals/Automations 全部 disabled；旧 ID 退休 |
| existing explicit Device on  | 不被fresh default覆盖                                                |
| existing explicit Device off | 保持disabled                                                         |
| unknown IDs                  | 有界round-trip，不产生运行效果                                       |
| corrupt settings             | quarantine/diagnostic + safe default，不伪称fresh或preserved         |
| Device off new Session       | 所有Engine不投影；OmniMind不注册                                     |
| Device on + available        | reload/new Session后所有健康Engine获得同一surface                    |
| old stale schema             | 可见不等于可执行；Gateway新call deny                                 |
| in-flight toggle             | 不伪取消                                                             |
| OmniMind Host                | named hidden Extension，definitions registered+active，无Host loader |
| stock Pi/other Engine        | 原生direct/eager pipe不变                                            |
| collision                    | foreign winner继续；Host不claim；局部unavailable                     |
| prompt                       | 无search guidance/全catalog；只承诺实际definitions                   |
| authority                    | read/write/browser/device/diagnostics均exact-turn                    |
| External connections         | pairing/scope/revoke准确，无在线伪装                                 |
| third-party MCP              | 无V1 Settings/CRUD/credential/status/unified search                  |
| Todo                         | 独立owner；不进入Host policy/search                                  |

## 15. 明确拒绝

- Host-owned callable loader或改名alias；
- Host/global跨Extension搜索；
- inactive Host pool；
- Goal/Automation activation preflight；
- Engine × group权限矩阵；
- 第二Registry、active store、catalog snapshot、dependency graph；
- Extension Marketplace/Manager；
- 第三方MCP Settings、CRUD、OAuth/credential、全局状态或自动分发；
- 把Todo、Bash、Pi built-ins或第三方Extension并入Host；
- 用Device default-off掩盖availability/execution缺口；
- 从decoded `[]`猜测fresh或explicit intent；
- 用模型名猜Provider wire；
- 用旧source测试冒充新target或packaged delivery。

## 16. 最终原则

> **Built-in tools 以 Tasks、Diagnostics、Goals、Automations、Browser、Device 六组管理一份 all-agent Host exposure intent；OmniMind Agent 的默认常驻面还包含 Pi `read/bash/edit/write` 与独立 Todo Extension。AgentGateway 拥有一份 canonical Host catalog 与逐 call authority；OmniMind Agent 用 Pi-native Host Projection Extension 注册并直接激活当前允许且可用的 definitions。External connections 与 third-party MCP 仍是另一条 authority，Host 不再拥有搜索器。**

复验触发器：Settings schema/default或真实用户迁移事实变化；Gateway catalog/group/availability变化；Pi Registry/sourceInfo/reload变化；Engine projection变化；External connection authority变化；具体Extension出现dynamic实证；target代码实际落地或回滚。
