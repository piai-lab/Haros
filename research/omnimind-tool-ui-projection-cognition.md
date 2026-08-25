# OmniMind Tool UI Projection Cognition

Status: `selected-research-candidate / production-not-yet-updated`

Source snapshot: `main@ed9813ed18492e166ba60a7f35f4216f7284b2cb` · 2026-08-25

Visual companion: [omnimind-tool-ui-projection.html](omnimind-tool-ui-projection.html)

## 1. 本文负责什么

本文记录 OmniMind Timeline 如何把不同 Provider、Host、MCP 与动态工具投影成稳定、低噪声的用户可见 UI。它回答四个问题：

1. 一个原始工具调用先归入哪种用户语义；
2. 该语义使用哪个 leading icon；
3. running、completed、failed、cancelled 如何表达；
4. 品牌、surface identity 与普通动作语义冲突时谁优先。

本文是可复核的研究认知与已选视觉候选，不是 Tool Registry、runtime schema、执行 authority 或已完成生产实现的声明。稳定 UI 合同仍由 [`architecture/workbench.md`](../architecture/workbench.md) 拥有；真实运行映射仍由代码 owner 决定。配套 HTML 是本文的可视化 projection，不得被 runtime 读取或反向成为第二张工具清单。

## 2. 核心认知

工具图标不是“给每个函数起一个 logo”，而是把机器调用压缩为用户能快速扫读的视觉语法。

- **读取**表示已经知道对象，正在消费内容；使用开卷图标。
- **搜索**表示尚未知道对象或位置，正在定位目标；使用放大镜。
- **编辑**表示改变文件；使用铅笔。
- **命令**表示在终端执行一般程序；使用终端。
- **品牌或产品 surface**表示“通过谁、在哪里执行”；当它比普通动词更有辨识价值时，优先显示品牌或 surface 图标。
- **状态**回答“现在怎样”，不重写“这是什么”。普通工具在 running、completed、failed、cancelled 中保持同一 identity icon，状态由文案、tone、轻量 motion 与详情表达。

因此 `Read` 与 `Search` 不应继续共用放大镜。维护者已选择第一版 `Lucide Book Open` 作为 Read family 的目标图标：无页内文字、默认描边、Timeline 工作尺寸 14px。放大镜只保留给搜索、查找、定位与目录检查语义。

## 3. 投影优先级

同一调用可能同时命中“动作类别”“产品 surface”“品牌”和“生命周期状态”。Timeline leading icon 按以下顺序裁决：

1. **明确的特殊回执**：`skill.instructions.failed` 使用 warning；`skill.instructions.delivered` 使用 Skill 图标。
2. **精确品牌或 surface identity**：GitHub MCP → GitHub；OmniMind Browser → globe；OmniMind Gateway → OmniMind mark；其余 MCP → MCP mark。
3. **结构化工具类别**：file read、file change、command、web search、image view、image generation、child agent、dynamic tool。
4. **有界 identifier 识别**：`Read` / `read_file` / `view_file` 等常见 Provider 名称；WebFetch URL；wrapped `git` / `gh` / `hub` 与 inspect shell command。
5. **tone fallback**：error、thinking、info、tool 仅在没有更强 identity 时使用兜底图标。

这意味着：

- `omnimind_read_thread` 虽然包含 `read`，仍显示 OmniMind mark；它的主要辨识是 OmniMind Gateway，不是本地文件读取。
- `browser_logs` 虽然读取诊断，仍显示 globe；它属于 Browser surface。
- GitHub MCP 的“读取 PR”仍显示 GitHub mark。
- 普通第三方 `Read` 才进入 Read family，显示开卷。

## 4. 目标 UI 映射

| 用户语义 | 原始 identifier / 结构事实 | 目标 icon | 资产或组件 | 备注 |
| --- | --- | --- | --- | --- |
| 文件读取 | `Read`, `read_file`, `view_file`, `file-read` | 开卷 | `Lucide Book Open` | 已选候选；14px，默认 stroke |
| shell 文件读取 | `cat`, `nl`, `head`, `tail`, `sed`, `less`, `more` | 开卷 | `Lucide Book Open` | 需要从现有 inspect 合并分类中拆出 |
| 文本搜索 | `Search`, `rg`, `grep`, `ag`, `ack` | 放大镜 | Central `magnifying-glass` | 定位内容 |
| 文件/目录定位 | `find`, `fd`, `ls` | 放大镜 | Central `magnifying-glass` | 定位对象，不表达阅读 |
| 文件编辑 | `file-change`, `file_change`, `apply_patch` 及 typed edit | 铅笔 | Central `pencil` | 写入、替换、补丁均归入编辑 |
| 一般命令 | command request、`command_execution`、其他 shell | 终端 | Central `console` | 不从命令英文猜业务语义 |
| Git / GitHub CLI | wrapped `git`, `gh`, `hub` | GitHub mark | Simple Icons `SiGithub` | 当前代码把 git 与 GitHub CLI 统一成 GitHub identity |
| Web search | `itemType=web_search` | 地球 | Central `globe` | 网络能力级图标固定为 globe |
| Web fetch | `WebFetch`, `fetch`, `urlfetch`, `fetchurl`, `httpfetch` + http(s) URL | 目标站 favicon | `LinkChipIcon` | 无可用 favicon 时走既有网站 fallback，不强行显示放大镜 |
| 图片查看 | `itemType=image_view` | 眼睛 | Tabler `IconEye` | 表达查看既有视觉内容 |
| 图片生成 | `itemType=image_generation` | 闪电 | Tabler `IconBolt` | 当前真实映射，不把研究偏好冒充已改设计 |
| 子智能体任务 | `itemType=collab_agent_tool_call` | 机器人 | Central `robot` | 有 routed child metadata 时主要进入 Composer child surface |
| 普通动态工具 | `itemType=dynamic_tool_call` | 锤子 | Central `hammer` | 无更强 identity 时使用 |
| 普通 MCP | `itemType=mcp_tool_call` | MCP mark | VS Code `VscMcp` | 不把 transport prefix 暴露为普通标题 |
| GitHub MCP | `mcp__codex_apps__github*` | GitHub mark | Simple Icons `SiGithub` | 品牌优先于 generic MCP |
| OmniMind Gateway | `omnimind_*`, `mcp__omnimind__*` | OmniMind mark | `OmniMindLogo` | 产品 surface 优先于内部动词 |
| OmniMind Browser | 22 个 `browser_*` action | 地球 | Central `globe` | 全部动作共享 Browser surface identity |
| Skill 投递成功 | `skill.instructions.delivered` | 积木 | Central `building-blocks` | 回执只证明 Host 已投递 |
| Skill 投递失败 | `skill.instructions.failed` | 警告圆 | Tabler `IconAlertCircle` | 特殊失败回执覆盖 Skill identity |

## 5. 生命周期与状态

普通 Tool lifecycle 的规则是“identity 稳定，状态另行表达”：

| 状态 | icon | 视觉 | 文案责任 |
| --- | --- | --- | --- |
| running | 保持类别/品牌 icon | muted tone；允许克制的 breathe/spinner，但不得改成另一个能力 glyph | 进行时动词，必要时显示 elapsed/progress |
| completed | 保持类别/品牌 icon | 普通 settled tone；不依赖绿色才能理解 | 完成时动词或稳定结果标题 |
| failed | 保持类别/品牌 icon | danger tone；详情保留可操作错误 | 明确失败与恢复动作 |
| cancelled | 保持类别/品牌 icon | 降低强调，不伪装成功 | 明确已停止/取消 |

以下不是普通 Tool lifecycle，必须保留独立语义：Reasoning 使用 Central `brain-2`；等待用户回答使用 `circle-questionmark`；已提交回答使用 `arrow-up-circle`；转入后台使用 `arrow-down-wall`；混合类别汇总使用 `hammer`。

## 6. 汇总规则

连续、settled、可汇总的 tool rows 才能折叠。单条不折叠，running group 不得冒充 settled。当前汇总类别及 homogeneous icon 为：

| 汇总类别 | 计数语义 | homogeneous icon |
| --- | --- | --- |
| command | 调用次数 | 首条 command icon |
| edit | distinct files | 铅笔 |
| read | distinct files | 开卷（目标） |
| search | 调用次数 | globe / 真实首条 search icon |
| agent | agent task 次数 | 机器人 |
| tool | MCP/dynamic 次数 | 真实首条 tool icon |
| image_view | 图片次数 | 眼睛 |
| image_generation | 图片次数 | 闪电 |
| mixed | 多种类别 | 锤子 |

品牌图标仍可由首条精确 entry 提供；混合组不能借第一条图标伪装成单一类别。

## 7. 当前源码事实与目标差异

### 已存在

- Timeline 已有 `workEntryLeftIcon → workEntryIcon → workToneIcon` 的单向 fallback 链。
- GitHub MCP、OmniMind Browser、OmniMind Gateway、generic MCP 已有高优先级 identity override。
- WebFetch 已按目标 URL 投影 favicon。
- `Read` / `read_file` / `view_file` 已被有界识别为 file-read family。
- running/completed/failed/cancelled 已有 typed tool status 与详情文案。
- 22 个 Browser action 和 28 个非 Browser OmniMind Gateway action 已由 canonical source descriptor/映射拥有。

### 尚未进入生产实现

- `requestKind=file-read` 与 `Read` family 当前仍返回 `SearchIcon`。
- shell inspection 当前只有一个 `inspect` visual kind，`cat/sed/head/...` 与 `rg/grep/find/ls/...` 都返回放大镜；目标语义要求拆成 `read` 与 `search/list` 两类。
- collapsed read group 当前借用首条 entry icon，因此在生产代码更新前仍可能显示放大镜。

这三个差异必须在一次真实 UI 实现中由现有 presentation owner 收口，并以 focused tests 保护。本文和 HTML 不构成“代码已经改好”的证据。

## 8. Canonical catalog 边界

HTML 明细列出当前 22 个 Browser action 与 28 个非 Browser OmniMind Gateway action，是为了证明覆盖范围和 icon precedence，不是复制执行 schema。未来增删成员时：

- Browser 名称仍只来自 `packages/contracts/src/browserAutomationToolCatalogue.ts`，普通标题来自 `packages/shared/src/browserAutomationPresentation.ts`；
- OmniMind Gateway presentation 仍只来自 `apps/web/src/lib/toolCallLabel.ts`；
- Timeline icon precedence 仍只来自 `apps/web/src/components/chat/TimelineWorkEntryRow.tsx`；
- 汇总类别仍只来自 `apps/web/src/components/chat/toolCallGroup.logic.ts`；
- 图标组件/资产仍只来自 `apps/web/src/lib/icons.tsx` 与现有品牌、Central assets。

研究文件随 snapshot 过期时应更新观察或明确 superseded，不能让它抢走上述 owner。

## 9. 修改半径演练

- **新增一个 Browser action**：只更新 Browser canonical descriptor/presentation；因 Browser surface override，共享 globe，无需在 Timeline 新增 icon 分支。HTML 可在下一次研究同步时补明细。
- **新增一个普通动态 Tool**：若没有稳定品牌/surface identity，自动落到 hammer；不为每个 identifier 增加 glyph。
- **新增一个一等产品类别**：只有在连续 Timeline 中有真实可读性收益，才扩展现有 presentation classifier 与同一组 focused tests；不得创建平行 registry。
- **替换 Read 资产**：只替换 Read family 的窄 icon owner；搜索、Browser、Gateway、MCP 与状态逻辑不动。
- **退休一个 Tool**：从 canonical runtime/descriptor 删除后，UI 通过现有 fallback 安全退化；不得为旧 identifier 永久保留空壳。

## 10. 复验触发器与证伪条件

以下任一变化需要复验本文受影响部分：

- `TimelineWorkEntryRow.tsx` 的 icon precedence 或 identifier normalization 改变；
- `toolCallGroup.logic.ts` 的类别、计数或 first-entry icon 规则改变；
- Browser 或 OmniMind Gateway canonical tool catalog 增删；
- Central、Tabler、Simple Icons、MCP 或 OmniMind 品牌资产替换；
- Timeline 基准尺寸、字体、leading column 或主题 token 改变；
- 新 Provider 产生无法被现有结构事实或有界名称识别的 Read/Search 调用。

目标方案被下列证据推翻时必须重开，而不是维护第二套映射：开卷在 14px/480px/暗亮主题下无法稳定辨识；Read 与 Knowledge/Docs 等相邻产品入口发生不可消除的冲突；实际多 Provider journey 中 file read 无法可靠归类；或品牌/surface override 导致用户无法判断真实动作且详情也不能补足。

## 11. 实现前的最小验收

- `Read`, `read_file`, `view_file`, `file-read` 与七种 shell read 命令显示同一开卷；
- `rg`, `grep`, `ag`, `ack`, `find`, `fd`, `ls` 继续显示放大镜；
- wrapped shell、`git -C`、`env gh`、MCP prefix 与 Provider 名称变体不破坏分类；
- 暗色、亮色、14px Timeline、480px、中文、英文、hover/focus、reduced motion 无 material finding；
- live → completed/failed/cancelled 不替换 identity icon、不重排 Timeline；
- homogeneous read group 使用开卷，mixed group 使用 hammer；
- Browser、OmniMind Gateway、GitHub MCP 继续保持 surface/品牌优先；
- unknown/dynamic tool 安全回退，不显示 raw transport prefix，不误读敏感参数。
