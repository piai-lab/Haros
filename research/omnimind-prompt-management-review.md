# OmniMind 提示词管理与运行时语义复核

## 0. 文档角色

本文记录 2026-08-15 对当前 `main@549952d1d1bc7eb9c7830c801febe8f363a1d307`、产品自有 OmniMind Agent runtime 与锁定 Pi `v0.84.1` 的 Prompt 专项复核，并把维护者确认的产品方向收敛为一份可推翻、可实施前复验的研究结论。

本文与 [`pi-native-product-integration-review.md`](pi-native-product-integration-review.md) 的分工是：

- Pi-native review 继续拥有 Pi 原生 system prompt rebuild、动态工具、activation/permission、operation snapshot 与 Extension mutation 的来源事实和接入边界；
- 本文负责从当前 `main` 继续回答 OmniMind 默认身份、用户可管理层、Project instructions、Prompt templates、Session reopen、Settings 信息架构与 Host prompt diet；
- 两文都属于 research evidence，不取代 `architecture/workbench.md`、`architecture/product-state.md`、`architecture/execution.md`、`execution-brief.md` 或 Campaign；
- 任何稳定产品 contract 必须先进入对应 architecture sole owner，任何代码施工仍服从当时的 `execution-brief.md` 与 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) Gate B；
- 本文不宣称下述设计已经实现，也不把当前 bug 或历史行为晋升为产品规范。

证据等级：

| 等级                | 含义                                              | 本文中的例子                                                                            |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 维护者产品方向      | 本轮已明确的目标，但尚需进入 architecture owner   | Settings 中收敛 Prompt 管理；正常产品语言去 Pi 化；stock Pi 不进入该页面                |
| 绑定 snapshot 事实  | 文档所列 exact HEAD 与当时安装 runtime 可直接复现 | 默认 Prompt 自称 Pi；Project instructions 写 localStorage/notes；模板只以 commands 投影 |
| 有证据的推断        | 调用链足以支持设计选择，仍需 focused journey 收口 | Prompt 页面应直接投影 native resource owner；Session reopen 使用当前资源重建 Prompt     |
| 待产品/运行证据确认 | 不能伪装为已确定事实                              | Prompt template CRUD 的最终 API；是否改变 project APPEND 对 global APPEND 的遮蔽语义    |

本轮是仓库内研究文档写入，不修改 runtime、Settings、adoption record、依赖或 Campaign claim。

> **2026-08-18 supersession.** 后续沿 Environment→store→草稿 promotion→`thread.meta.update`→Thread notes 的完整调用链，并复核 Synara exact `8f9f600…` 的 `af9c36465` 与 `bdfc332a8` 后，确认该能力不是死代码或“假功能”：母体有意把一段 per-Project 本地文本作为新任务 Notepad seed，并专门修复过持久化。它确实不进入 Agent runtime Prompt，也不等于 `AGENTS.md` Project rules。维护者在知晓这项真实行为及其损失后，明确决定整体退休该表面，保留 Thread-level Notepad，不改名、不改造、不迁移。本文中把它概括为“第二事实源”“假的 Project instructions”的旧措辞据此收窄；Prompt 管理产品化不能接管或迁移这批文本。

> **2026-08-18 default-identity closure.** 维护者随后确认先完成默认身份、理解/提问/拔高行为与 Chat/Agent 分层，再讨论 Prompt 管理 UI。pushed merge `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 已把以下 contract 写入 architecture 并接入 runtime：只有 bundled `omnimind` 获得不可被 `SYSTEM.md`、`APPEND_SYSTEM.md`、Skill、Extension 或未来 Prompt 管理覆盖的 OmniMind identity/cognitive engine contract；Extension 仍可按原生顺序替换 mutable base，runtime 在最终请求前只把 canonical engine contract 去重并追加为 exactly once，general Host harness/tool guidance 仍留在 mutable append 生命周期；`project → Agent`，`chat | studio → Chat`；Agent 以“目标充分对齐才进入实质执行”为边界，Chat 在不误导时先给可用起点并并行澄清；`别问，直接做` 只是低风险可逆未知的速度偏好。canonical Project/worktree root 是正式 Agent Session 的项目规则读取下界；Chat/Studio 和无 active Session 的被动 discovery 只读 global context，且不执行 Project Extension。product-owned Pi base 已改为 identity-neutral 并删除未发行 docs/examples 导航；stock Pi 不受影响。该 merge 已从 exact SHA 重建、安装，并通过 fresh-profile 启动与重开验证；这不构成签名或公证发行声明。Prompt 管理仍只允许管理个人指令、项目规则和模板，且本次未启动任何 UI/store/迁移。

> **2026-08-19 bilingual identity and live closure.** 维护者确认英文机构名 `International Academy of Phronesis Medicine (Guangdong)` 保持不变，官方中文名是“广东智慧医学国际研究院”。中文名因此进入同一份 Host-owned immutable engine contract，而不是用户 Prompt、Extension append 或 Provider adapter 补丁。request/reload/compaction 回归证明 Chat 与 Agent 都 exactly once 接收该身份，stock Pi 不接收；授权的 MiMo 与 DeepSeek OpenAI Chat-compatible 最小 live journey 又分别完成首次身份回答、resource reload 后 continuation、Host loader 激活和实际 Host tool 调用，两者都回答 OmniMind/πAI-Lab/官方中文机构名，没有把底层模型身份冒充产品身份。该 journey 同时证明 engine contract 与稳定 Host context 的请求指纹跨上述阶段不变；它不证明 Provider cache 命中率，也不为新增 Prompt framework、缓存层或跨 Engine Prompt 管理提供理由。

> **2026-08-19 Host projection supersession.** 上述`Host loader激活`只记录当时main与live journey的历史证据；维护者后来明确删除AgentGateway Host自建`search_tools`、inactive pool与dynamic guidance。当前目标是保留Pi-native Host Projection Extension并让allowed+available definitions直接active，prompt只保留跨工具不变量。现行结论见[`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)与`architecture/execution.md`；本文不得恢复search guidance或把旧live绿色扩写为当前终态。

## 1. 结论

OmniMind 应在 Settings 的现有 `Coding / 开发` 分组中增加一个独立 `Prompts / 提示词` section，把 **OmniMind Agent** 的基础指令、个人追加指令、当前 Project 规则、Prompt templates 与当前生效来源收敛到一个地方。

这个结论同时带有六个硬边界：

1. 页面只属于 bundled OmniMind Agent，不提供 Provider selector，不管理 stock Pi、Codex、Claude、OpenCode 或其他 Engine 的 native Prompt；
2. UI 直接投影 runtime 已有文件、ResourceLoader 与 Session truth，不增加 `prompts.json`、Prompt 数据库、profile store、版本 ledger 或跨 Engine Prompt authority；
3. 正常 OmniMind 默认 Prompt 与正常产品 UI 不再自称 Pi；stock Pi、第三方资产原名、license、SBOM、来源和诊断仍保持真实 identity；
4. `AGENTS.md` 才是真正的 Project rules；母体 localStorage `Project instructions` 是有意实现的 notes seeding，但维护者已确认在 OmniMind 中整体退休，不能迁移或改造成运行时指令；
5. Prompt、Tool activation、Permission 和 Extension mutation 是四个正交事实，不能合成一个开关；
6. 表层只提供用户会用到的编辑、来源、重载和恢复，底层保留完整 precedence、原子写入、冲突检测、operation snapshot 与 provenance。

这不是 Prompt 平台，也不是 Pi TUI 的 Desktop 镜像。正确产品是：

> **一个安静、可信的设置入口，背后直接连接 OmniMind Agent 已有的 native Prompt 世界。**

## 2. 当前源码真值

### 2.1 绑定 snapshot 的默认 Prompt 错误与已集成修复

本文绑定 snapshot 当时安装的 `@omnimind/pi-coding-agent` 在 `dist/core/system-prompt.js` 中仍构造：

```text
You are an expert coding assistant operating inside pi, a coding agent harness.
```

并永久附带 Pi README、docs、examples 与 TUI/extension/package 文档导航。这与根 README 已锁定的产品身份直接冲突：普通用户面对的是 OmniMind 和 OmniMind Agent，Pi lineage 只应进入 About、Licenses、诊断和显式来源详情。

这是本文绑定 snapshot 的源码事实和产品 bug，不是“是否更喜欢 OmniMind 文案”的审美选择。上方 2026-08-18 default-identity closure 已在 merge `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 中移除该错误 base，并从 exact SHA 重建、安装和完成 fresh-profile journey；它现在是已验证的产品实现事实。

正确处置不是全仓库 `Pi → OmniMind`：

- 必须修改 product-owned OmniMind Agent 的默认身份与默认文档导航；
- 必须保持 stock `pi` Provider 的真实 Pi 身份；
- 不改写第三方 Extension、Package、Skill、Prompt、MCP 的名称和内容；
- 不删除 license、SBOM、source adoption、诊断和技术 provenance 中的 Pi；
- 不通过 Host append 再说一次“你是 OmniMind”来掩盖 base Prompt 仍自称 Pi，因为相互矛盾的身份同时存在仍是错误。

### 2.2 Snapshot 中的 `Project instructions` 是真实 notes-seeding 功能，但不是运行时规则

本文绑定的 snapshot 中，`apps/web/src/projectInstructionsStore.ts`：

- 使用 `omnimind:project-instructions:v1` 写浏览器 localStorage；
- 以 Product `projectId` 保存一段自由文本；
- 只通过 `mergeProjectInstructionsIntoThreadNotes()` 合并到 Thread notes。

Environment 面板的 `EnvironmentProjectInstructionsSection` 也明确把它实现为：

- 500ms debounce autosave；
- `Copy to notepad / Append to notepad`；
- 英文硬编码标题和 placeholder；
- 与 native `AGENTS.md`、`SYSTEM.md`、`APPEND_SYSTEM.md`、Prompt templates 无直接接线。

`thread.turn.start` 的 message contract 只带 text、attachments、skills 与 mentions，不带这个 localStorage 字段。真实路径是：用户编辑 per-Project 文本后，Environment 可手动 copy/append；本地草稿首次发送和 Automation 草稿 promotion 还会通过 `thread.meta.update` 把它 best-effort 写进 Thread notes。Synara `bdfc332a8` 正是为修复此前 `thread.create` 不接收 notes 的静默 no-op 而增加该写入。这证明它是完整的 Project→new-task Notepad seed，而不是 Prompt、Project rules 或未接线的占位。

维护者在 2026-08-18 明确接受失去“每个 Project 复用一段文字并自动预填新任务 Notepad”的能力，裁决为：

1. 整体删除 Environment UI、Settings 开关/search entry、store、autosave 与手动 copy/append；
2. 删除首次发送与 Automation promotion 的隐藏 notes 写入；
3. 保留现有 Thread-level Notepad 及已有 Thread notes，不按无法证明的来源反向删除内容；
4. 不把旧 localStorage 或既有 notes 迁移到 `AGENTS.md`、Notepad 或任何 Prompt 资源；
5. 不因没有用户而建立一次性 migration/cleanup/compatibility rail；first-public source 不再注册该 key；
6. 新的 `当前项目规则` 若未来实现，只能直接投影 native `AGENTS.md` 继承链。

退休理由是产品边界：名称暗示 runtime rules，实际行为却是跨任务模板与隐藏 notes 写入，会把 Project scope 和当前任务记录混成一个心智模型。它不是对母体实现质量的否定，也不能用“功能是假的”作为删除依据。

### 2.3 native ResourceLoader 基础与当前边界修正

本文绑定 snapshot 的 product-owned runtime 已经具备：

- OmniMind Agent 全局 `agentDir` 下的 `SYSTEM.md`、`APPEND_SYSTEM.md` 与 `prompts/`；
- trusted folder-backed Project 下的 `.omnimind/SYSTEM.md`、`.omnimind/APPEND_SYSTEM.md` 与 `.omnimind/prompts/`；
- 全局 context file 与从 filesystem root 到 cwd 的 Project `AGENTS.md`/候选 context file 继承链；该起点会错误吸收 Project 之外的 ambient ancestor，merge `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 已通过 ResourceLoader 的窄输入修正为 canonical Project/worktree root → cwd，Chat/Studio 与无 Session discovery 则只读 global context；
- Extension/Package 增加的 Prompt、Skill、Tool 与资源；
- `session.reload()` 对 settings、extensions、skills、prompts、themes、tools 与 Prompt 的原生重建；
- `PiAdapter.reloadSessionResources()` 的 active-turn/busy admission，运行中不会强拆 Session。

因此不需要第二 Prompt loader 或第二文件格式。UI 只需要一个窄的 typed projection 与必要 mutation seam。

### 2.4 当前 Prompt template 能“运行”，但还不能诚实管理

`PiAdapter.listCommands()` 已把当前 Session 或 task-local ResourceLoader 发现的 Prompt templates 映射为 slash commands；Composer 可以运行它们。

但是当前公共结果只有 `name` 和 `description`，没有完整的：

- stable resource identity；
- source kind 与 exact source path；
- user/project/package/extension provenance；
- read content；
- create/update/delete capability；
- collision/diagnostic projection。

所以 V1 不能先画一个全功能 Template CRUD 再让 Server 猜路径。第一步只应展示 runtime 能证明的列表、来源、运行和打开；只有 product-owned runtime 提供窄、typed、credential-blind 的 Prompt resource API 后，才开放对应可写动作。

### 2.5 Host prompt 已成为常驻手册

`apps/server/src/agentGateway/harnessPolicy.ts` 当前把 Browser、Device、Thread、Subagent、Automation 与诊断操作说明连接成一大段稳定 Host policy，并通过 Pi `appendSystemPromptOverride` 加进 base append list。

已集成的 default-identity 实现只把 identity/cognitive/Chat-Agent/task engine contract 接入 final immutable seam；这段 general Host policy 仍属于上述 mutable append list，可被后续 Extension replacement 改写。二者不能因同由 Host 组装而合并成一个冻结面。

这里有两个问题：

1. 常驻 Prompt 包含大量只有相关工具激活时才需要的指导，持续消耗 attention 和 cache；
2. Browser download 与 Device approval 文案仍表达旧的逐次拒绝语义，与 `architecture/execution.md` 的单一 `runtimeMode` 目标不一致。

正确方向不是删除 Host truth，而是按生命周期分层：

- 永久在线：Host identity、可用性与“不能伪成功”的极小不变量；
- tool-scoped：Browser、Device、Gateway 等随 exact active tool definition 的 `promptSnippet`/`promptGuidelines` 注入；
- task-scoped：Automation authoring、复杂工作流与产品教程按需由 Skill/Prompt/command help 加载；
- runtime-enforced：permission、containment、approval、abort 与 late-effect 由代码强制，Prompt 只描述事实，不拥有安全。

## 3. Prompt 的真实组装模型

### 3.1 静态层与动态层

OmniMind Agent 的每轮 Prompt 不是一个可独立编辑的大字符串，而是一条构建链：

```text
product-owned default base
  或一个有效 SYSTEM.md
→ default base 内根据 active tools 生成 tool snippets/guidelines
→ 一个有效 APPEND_SYSTEM.md
→ OmniMind Host append
→ global + ancestor Project context files
→ Skills summary
→ current working directory
→ before_agent_start Extension mutation/messages
→ normalize and append the immutable OmniMind engine contract exactly once
→ operation admission 时冻结 systemPrompt/messages/tools snapshot
```

这条链决定 UI 不能把“系统提示词”简化成一个 textarea，也不能把最终完整 Prompt 当作可稳定预览的持久事实。

### 3.2 `SYSTEM.md` 的替换语义

ResourceLoader 只选择一个 `SYSTEM.md`：

1. trusted Project 的 `<cwd>/.omnimind/SYSTEM.md`；
2. 否则 OmniMind Agent `agentDir/SYSTEM.md`；
3. 否则 product-owned default base。

Project 文件遮蔽 global 文件，不合并。

自定义 `SYSTEM.md` 仍会收到 append、Project context、Skills 和 cwd，但会绕开 default base 中动态生成的 tool list 和基础 guidelines。实际工具 schema 仍可存在，permission 也不改变；消失的是默认 Prompt 对工具和行为的引导。

所以 UI 必须把它命名为 `完整替换`，放在高级 disclosure 中，并准确提示副作用。不能把它作为首页主编辑器或推荐路线。

### 3.3 `APPEND_SYSTEM.md` 的追加与遮蔽语义

ResourceLoader 同样只发现一个文件来源：

1. trusted Project 的 `<cwd>/.omnimind/APPEND_SYSTEM.md`；
2. 否则 OmniMind Agent `agentDir/APPEND_SYSTEM.md`。

Project 文件存在时会遮蔽 global 文件，不是二者自动合并。Host `appendSystemPromptOverride` 随后把 general OmniMind Host policy 加到 mutable append list；`APPEND_SYSTEM.md` 本身不能移除这段 append，但 `before_agent_start` Extension 仍可替换整个 mutable prompt。只有在 Extension mutation 之后 exactly-once 追加的 OmniMind engine contract 不可替换。

本文建议首版保持原生遮蔽语义，并在 UI 显示：

```text
当前项目追加已覆盖“我的指令”
```

若维护者未来要“全局永远生效 + Project 再追加”，那是对 Pi 原生 precedence 的产品改动，必须单独确认并更新 runtime contract；不能由 UI 偷偷拼接。

### 3.4 `AGENTS.md` 是 Project rules

当前 loader 会：

- 读取 OmniMind Agent `agentDir` 中的 global context candidate；
- 从 cwd 向上寻找每级 context candidate；
- 按 root → cwd 顺序组装，避免重复；
- 保留每个文件的真实 path。

因此用户界面的自然语言应为：

- section/row：`当前项目规则 / Current project rules`；
- 技术详情：显示真实 `AGENTS.md`、`AGENTS.override.md` 或其他实际 candidate 名称和路径；
- 不把 `Agent.md` 当作规范文件名；
- 不复制内容进 Product DB；
- 编辑 Project 文件时复用现有 Workbench File editor 与 save-conflict owner。

### 3.5 Extension 的 turn-time 修改

`before_agent_start` handlers 按 Extension load order 顺序执行：

- 每个 handler 收到前一个 handler 已修改的 current system prompt；
- 返回新的 `systemPrompt` 时替换 current value；
- 后执行的成功 mutation 因而覆盖/继续变换前面的结果；
- handler error 被记录，后续 handler 仍可继续；
- mutation 只能改变本次 turn 的 mutable prompt，下一轮没有返回修改时恢复 base prompt；
- 所有 Extension mutation 完成后，runtime 去重并 exactly-once 追加 immutable OmniMind engine contract，Extension 不能替换它。

所以 `当前生效` 只能准确展示：

- base/resource 层的当前 snapshot；
- 已知 Extension 与其可能的 turn-time mutation capability；
- 最近一次已接纳 operation 的实际 hash/来源摘要（若后续 contract 提供）；

不能在用户发送前声称已经知道下一轮最终 Prompt 的 exact bytes。

## 4. Tool activation、Permission 与 operation snapshot

### 4.1 四个不同问题

```text
configured tool  = registry 中存在
active tool      = 模型下一轮可选择
permission       = 某次调用是否获准、在哪个边界执行
in-flight call   = 已被当前 operation 接纳并正在执行
```

- active 不等于 allowed；
- inactive 不等于安全 deny；
- Prompt 说“允许”不能越过 runtimeMode、Host gate、OS 权限或目标 containment；
- 已运行的调用不能靠关闭 activation 自动取消，必须走 operation/tool abort owner。

### 4.2 当前 operation 不热切

Pi agent core 在 operation 开始时复制：

- `systemPrompt`；
- `messages`；
- `tools`。

因此 operation 进行中：

- Resource 文件修改不改写当前 loop；
- `setActiveToolsByName()` 更新 Session state 和 base Prompt，但只影响下一 agent turn；
- Extension 新注册/移除工具不应替换已经接纳的 tool call implementation；
- reload 必须在 idle admission 后执行，不能边 stream 边换 runner。

### 4.3 下一轮 exact tool set

下一轮的 exact set 只有在以下动作完成后才成立：

1. pending settings/resource reload 完成；
2. Extension resource discovery/registration 完成；
3. 当前 Session 最后一次成功 active-set mutation 完成；
4. `before_agent_start` 相关逻辑完成；
5. immutable OmniMind engine contract 去重并 exactly-once 追加；
6. operation context snapshot 创建。

Settings 可以显示 `当前 Session active` 和 `all configured`，也可以显示 `保存后待重新加载`，但不能把保存时的候选列表冒充下一轮 exact set。

### 4.4 同名工具与再次 mutation 谁优先

当前 registry 先放 built-ins，再放 Extension/custom tools；同名定义由后写入者覆盖。active set 则由同一 Session 中最后一次成功 mutation 决定下一 turn。

产品规则应是：

- runtime registry 与 Session 是唯一 owner；
- UI 订阅真实结果，不保存一个更高优先级的 active-tool store；
- 同名覆盖必须产生 source/collision diagnostics，不能静默隐藏；
- 若用户需要 durable deny，应进入真实 permission/policy owner，而不是把一个 activation toggle 宣传成安全控制。

## 5. Session reload、reopen 与历史可复现性

### 5.1 保存不等于当前 Session 已生效

文件保存后，当前 Session 仍持有已加载 ResourceLoader state。产品必须明确区分：

```text
已保存
当前 Session 已加载
当前 operation 已冻结
```

正确交互：

- 保存成功后显示 `已保存，当前运行中的任务不受影响`；
- Session idle 时提供 `重新加载 OmniMind`；
- active turn、stream、tool、pending user input 存在时返回/显示 `busy`；
- 首版不创建 background reload queue、generation 或 LKG；
- reload 失败保持原 Session 失败事实，不伪装保存失败，也不自动新建 Session。

### 5.2 reopen 使用当前资源，不复现历史 Prompt

Pi SessionManager 持久化 append-only conversation tree、message/custom entries、branch、compaction 等 native context。System Prompt 和 tool definitions 可用于当下 export/debug，但不是 Session JSONL 中一份版本化、可恢复的 Prompt authority。

因此 reopen 的准确语义是：

> 恢复 native conversation/session context，并用重新打开时的当前 settings、Prompt files、Project rules、Extensions、Skills 和 tools 构建运行环境。

V1 不建立 Prompt revision DB 来复现历史 exact bytes。UI 在 `当前生效` 中显示 current/reloaded facts；若未来出现审计级 reproducibility 用户任务，再以 operation receipt 的 bounded digest/provenance 评估，而不是先保存完整敏感 Prompt。

## 6. 产品信息架构

### 6.1 Settings 中增加一个窄 section

目标位置：现有 Settings sidebar 的 `Coding / 开发` 分组。

```text
Prompts / 提示词
```

- 内部 section id 候选：`prompts`；
- 图标：复用 `apps/web/public/central-icons-reversed/prompt.svg`；
- 中文标题：`提示词管理`；
- 英文标题：`Prompt management`；
- 中文说明：`管理 OmniMind 的基础指令、项目规则和提示词模板。仅影响 OmniMind。`；
- 英文说明应独立自然写作，不逐字回译；
- 继续使用现有 Settings search、deep-link、keyboard、focus、section mount 与 message catalog；
- 不新增应用一级导航，不重排其他 Settings section，不把页面扩成 `Agents / Models / Packages / Prompts` 四域重构。

当前 `architecture/workbench.md` 要求新增设置进入最近既有 section，并禁止 taxonomy rewrite。维护者现在明确要求 Prompt 相关事实收敛到一个 Settings section；施工前必须把这个窄例外写入 Workbench owner，说明它只是增加一个 `prompts` section，而不是重构整个 taxonomy。

### 6.2 页面结构：overview → focused detail，不使用顶层 tabs

首屏建议：

```text
提示词管理
管理 OmniMind 的指令和模板。仅影响 OmniMind。

指令
  我的指令                    已配置 / 未配置
  当前项目规则                AGENTS.md · 3 个来源
  OmniMind 默认指令           内置

提示词模板
  最近使用                    4 个
  查看全部                    →

当前生效
  7 个来源 · 12 个活动工具
  查看详情                    →

高级
  完整替换                    未启用
```

页面不采用三个等权 Tab，也不采用卡片墙、Prompt profile gallery、变量 builder、token 仪表盘或通用 AI Studio。原因不是功能做少，而是用户的主要任务只有两个：修改自己的稳定偏好，以及理解当前 Project 为什么这样运行。

每一行进入同一 Settings pane 内的 focused detail：

- 返回后恢复 scroll/focus；
- 长文本用 full-width editor，不弹 Modal；
- 显式 `保存 / 取消`，不对真实 Agent 指令做 500ms autosave；
- source、scope、覆盖关系与 reload state 就近显示；
- technical path 放 disclosure，不在首屏铺 badge wall；
- 空态说明下一步动作，不解释内部 Pi lineage。

### 6.3 `我的指令`

这是页面唯一视觉中心和推荐入口，owner 是 OmniMind Agent 当前 `agentDir/APPEND_SYSTEM.md`，不是一个新的 Product setting row value。

UI 语义：

- 默认追加，不替换 OmniMind base；
- 显示当前 Project 是否由 project-local APPEND 遮蔽；
- 明确 Save 与 Reload 两个状态；
- 不显示 stock Pi 路径；
- Server 写入必须 anchored 到 `resolveOmniMindAgentDir(serverBaseDir)` 的 exact root，而不是信任 renderer 传入绝对路径。

### 6.4 `当前项目规则`

这一页展示 effective context chain：

- global context candidate；
- ancestor directories root → cwd；
- exact file name/path；
- 是否被 shadow/override；
- load warning/diagnostics。

可写行为优先复用已有 Workbench 文件编辑器：

- 已存在文件：打开 exact file；
- 不存在时：用户显式选择 `创建项目规则` 后，在 canonical folder-backed Project root 创建 `AGENTS.md`；
- Chat/Studio managed workspace 是否允许创建，服从其 existing workspace owner，不从 Prompt 页面猜；
- 外部或非 canonical cwd 不提供写动作；
- 保存冲突、外部修改和 dirty buffer 继续由 File owner处理。

### 6.5 `OmniMind 默认指令`

只读展示始终存在的 product-owned engine contract 与 mutable base 的来源，不把每轮完整动态 Prompt 暴露成一大块 raw text。

页面可显示：

- engine contract 中的产品身份与不可覆盖边界，以及语言、语气、格式、详略和工作方式可服从显式个人偏好的限定；
- engine contract 的 `内置` source；
- mutable base 当前来自 product default 还是被 exact `SYSTEM.md` 完整替换；该替换不删除 engine contract；
- runtime/version 与 technical provenance 的按需链接。

动态 tool schema、Host secret/context、完整 Project instructions 和第三方 Prompt 不在普通只读预览中拼接，以免泄露、误导和制造一个伪 exact snapshot。

### 6.6 `提示词模板`

第一阶段：

- 列表、搜索、description、source/scope、collision diagnostics；
- 在 Composer 中运行；
- 对 user/project plain file 提供 `打开来源`；
- Package/Extension/bundled 模板只读；
- unsupported/unknown 直接显示，不由其他 Provider 代办。

第二阶段只有在 typed resource API 存在后才允许：

- create user/project template；
- update content/frontmatter；
- rename/delete；
- conflict-safe save；
- reload affected Session。

不建立跨 Provider模板库、Marketplace、云同步或 Product DB。

### 6.7 `当前生效`

这是低噪声、只读的解释面，不是 raw Prompt inspector。建议显示：

- engine contract：始终存在的内置 identity/cognitive/Chat-Agent/task source；
- mutable base：identity-neutral product default 或 exact `SYSTEM.md` source；
- append：global/project file 与遮蔽关系；
- mutable Host context：available/unavailable 与 policy version；
- Project rules：文件数量与列表；
- Skills：数量与来源摘要；
- tools：current active / all configured / collision count；
- Extensions：数量、load warnings、是否可 turn-time 修改；
- Session：last loaded、saved-but-pending-reload、busy/idle；
- 限定语：`Extension 可在任务开始时动态调整 mutable 指令和工具，但不能替换 OmniMind engine contract。`。

## 7. 默认 OmniMind Prompt 与 Host diet

### 7.1 default base 候选（已被当前分层实现取代）

本节此前展示的单段 `You are OmniMind, the built-in agent...` 只是 2026-08-15 的历史候选，缺少后来确认的 πAI-Lab/研究院归属，也错误地把 product identity 与可替换 base 放在同一层。它不得作为未来 Prompt UI 或 runtime 的实现输入。

当前 authority 是 `architecture/execution.md` 与 runtime constants：product-owned default base 保持 identity-neutral，只拥有 native dynamic tools/guidelines/context/skills/cwd 组装；OmniMind identity、cognitive core、Chat/Agent 与 task policy 位于始终存在的 immutable engine contract；general Host/tool guidance 仍是 mutable append。本文不复制整段 runtime Prompt，避免形成第二文本真相。

### 7.2 product-owned patch 处置

当前 production adoption 已不再是“shared runtime bytes unchanged”：仓库已经用 `patches/pi-coding-agent/0.84.2-model-config-reader.patch`、Bun stock patch 与 `scripts/vendor-omnimind-pi-runtime.mjs` 维护一个有 digest、可复算的 product-owned patch inventory。

因此默认 Prompt 修正的最小物理路径不是再建第三个 wrapper，也不是 runtime monkey patch，而是：

1. 在现有 product-owned Pi source patch inventory 中增加这一项窄差异；
2. 不把 OmniMind identity patch 应用到 stock Pi dependency；
3. 更新 patch digest、archive digest、README adoption record、legal/SBOM 受影响事实；
4. 增加 default/custom/append/AGENTS/tools/skills/Extension composition tests；
5. 重跑代表性 Pi ecosystem 与 packaged OmniMind journey。

该变更虽小，却改变 shipped runtime bytes 和 adoption statement，必须按 Gate B 交付，不能作为文案热修。

### 7.3 Host policy 收缩顺序

Host policy diet 必须以运行时真值为前提，不能为了 token 更少先删除必要约束：

1. 先修正与 `runtimeMode` 冲突的 Browser/Device facts；
2. 把 exact tool guidance 移到对应 tool definition，并证明只在 tool active 时出现；
3. 把 Automation authoring 长文迁到按需 Skill/Prompt/command help；
4. 保留最小 Host identity、gateway availability、provenance、abort 与 no-false-success invariant；
5. 用同一任务比较 task success、prompt tokens、cacheRead/cacheWrite、latency 与 recovery，不以 token 下降单独判成功。

## 8. 写入、安全与并发边界

任何 Prompt 文件 mutation 都必须由 Server owner完成，Renderer 只发送 scope、resource identity、expected version 和新内容。

最低合同：

- `user` scope 只解析到 current OmniMind `agentDir`；
- `project` scope 只解析到 canonical trusted folder-backed Project 与 `.omnimind`/`AGENTS.md` 允许位置；
- realpath/no-follow/containment 检查，拒绝 symlink escape；
- UTF-8、bounded bytes、frontmatter parse error 与 unknown fields准确处理；
- atomic temporary-write + replace，合理保留文件 mode；
- expected hash/version 冲突时不覆盖外部修改；
- secret、完整 Prompt、用户内容和 private path 不进入普通日志、Timeline 或 telemetry；
- write success、reload success 与 next-turn effect 是三个不同 receipt；
- 删除动作只作用于 exact selected resource，并说明不会删除 Session transcript；
- stock `.pi`、其他 Provider private home 与未知文件零读取、零迁移、零写入。

## 9. Disposition map

| 机制/表面                         | 当前 owner                            | Disposition              | 原因                                                                                         |
| --------------------------------- | ------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| Pi native Prompt builder          | product-owned Pi-derived runtime      | Preserve                 | 已正确重建 tools/resources/context，不复制                                                   |
| OmniMind default identity         | product-owned runtime source patch    | Adopted narrowly         | 已集成 identity-neutral Pi base 与 Host-owned immutable engine contract；stock Pi 保持原身份 |
| `SYSTEM.md` / `APPEND_SYSTEM.md`  | ResourceLoader/files                  | Preserve + project       | UI 只投影/编辑真实文件                                                                       |
| `AGENTS.md` chain                 | ResourceLoader + Workbench File owner | Preserve + route         | 真正 Project rules，不建 DB                                                                  |
| Prompt templates                  | ResourceLoader/Extension/Package      | Bridge narrowly          | 先补 typed provenance，动作按真实 capability                                                 |
| current effective view            | Session/resource projection           | Add read-only projection | 用户需要解释，不取得 lifecycle                                                               |
| Host policy                       | Agent Gateway + tool definitions      | Simplify in owner        | 常驻手册过重且已有事实漂移                                                                   |
| localStorage Project instructions | Web Store/Thread notes                | Retire confirmed         | 真实 notes-seeding 与 runtime rules 不同；维护者接受失去 Project→new-task seed，保留 Notepad |
| Prompt profile/version DB         | 不存在                                | Do not build             | 没有当前用户结果要求                                                                         |
| stock Pi Prompt management        | stock Pi Provider                     | Out of scope             | 保持独立 Engine/private home                                                                 |

## 10. 最小纵向切片

本文不改变 `execution-brief.md` 的全局顺序。若 architecture owner 接纳本设计，最小施工应拆成四个可独立停止的关注点：

### Slice A：身份与 composition correctness

- 修 product-owned default Prompt；
- 保留 dynamic builder；
- 冻结 default/custom/append/AGENTS/tools/skills/Extension precedence；
- 更新 patch/adoption/digest；
- 不做 Settings。

成功条件：OmniMind Agent normal turn 不再自称 Pi，stock Pi 和第三方 provenance不变，dynamic tool/resource behavior无回归。

### Slice B：只读 Prompt truth

- 从现有 ResourceLoader/Session 投影 sources、active/all tools、reload state 与 diagnostics；
- 补 template provenance/listing；
- 不增加 mutation、store 或 Settings taxonomy。

成功条件：Server 能准确解释 current base/append/context/templates/tools，unknown与turn-time mutation边界诚实。

### Slice C：Settings section 与错误表面收口

- Workbench owner 接纳窄 `prompts` section；
- 增加 overview/focused detail、search/deep-link、中英 catalog；
- 删除已确认退休的 Environment Project instructions 全链路；
- 先只读 + reload，不承诺 CRUD。

成功条件：用户只在一个地方理解 OmniMind Prompt，旧 notes seeding 不再冒充 Project rules，Settings未被重排成新平台。

### Slice D：最小可写资源

- 先做 `我的指令`；
- Project rules 复用 Workbench editor；
- Template CRUD 等待 typed runtime API；
- 证明 save/reload/reopen/conflict/private-home isolation。

成功条件：写入唯一 native owner，当前 operation不热切，busy/reload/reopen事实准确。

每个 Slice 完成后停止，不把下一个 Slice 作为当前完成条件。

## 11. 必须证明的反例

### Identity/composition

- default OmniMind turn 的 system identity、normal reply 与 technical provenance无 Pi 产品身份泄漏；
- stock Pi turn仍保持 Pi identity；
- global/project `SYSTEM.md` 与 `APPEND_SYSTEM.md` precedence exact；
- custom `SYSTEM.md` 不被误称为改变 permission；
- AGENTS chain、Skills、active tool snippets 与 mutable Host append 按原生 composition 存在，Extension 替换后仍保证 immutable engine contract exactly once；
- Extension turn mutation按load order生效并在下一轮恢复base。

### Operation/reload/reopen

- active turn保存文件不改变当前 Prompt/tools snapshot；
- busy reload准确拒绝且无partial runner replacement；
- idle reload后下一turn采用新资源；
- App/Session reopen使用当前资源并保持native conversation context；
- 未建立历史 Prompt复现承诺。

### Settings/taste

- 中文/英文、search/deep-link、keyboard、screen reader、focus return完整；
- 页面不出现Provider selector、Pi lineage主文案、raw Prompt dump、卡片墙或三层tabs；
- Project APPEND遮蔽global时一眼可见；
- current effective明确区分loaded/pending/dynamic；
- empty/error/conflict/busy/reload failed都有下一步动作。

### Safety/isolation

- Renderer不能提交任意绝对路径；
- symlink/path traversal不能越过agentDir/project root；
- external file conflict不被覆盖；
- stock `.pi` tree hash/mtime/size不变；
- Prompt内容与private path不进入普通日志、Timeline、screenshot evidence或telemetry；
- Extension/Package只读资源不能被UI伪造为可编辑。

## 12. Stop-loss 与被否决路线

出现以下任一情况立即停止扩张：

- 为页面新建 Prompt DB、profiles、version ledger、sync service 或 background reload state；
- UI开始复制 ResourceLoader precedence、tool registry 或 Extension lifecycle；
- 为统一其他 Engine 修改 stock Pi/Codex/Claude/OpenCode private home；
- 用一个 textarea覆盖 default、Host、Project rules、Skills和Extensions；
- 把 activation toggle宣传成permission；
- 为精确预览保存完整最终Prompt或敏感Host context；
- 在Prompt切片中顺带重写Settings taxonomy、Library、Agent Core、Memory或Workflow；
- 为去Pi痕迹删除license/source/third-party identity；
- Template CRUD需要通用filesystem manager或新的公共resource platform。

明确被否决：

- Prompt Studio；
- Prompt profile切换器；
- 跨Provider统一system prompt；
- raw prompt/schema/JSON dashboard；
- Pi TUI config selector复刻；
- 自动迁移旧Project notes为`AGENTS.md`；
- 自动在active turn后排队reload；
- 用Host append掩盖错误base identity；
- 全仓库机械改名Pi。

## 13. 尚存不确定性

1. **Project APPEND 是否应与 global 合并**：当前确切行为是Project遮蔽global。本文推荐首版保留并明示；若维护者要global永远生效，必须单独作产品裁决。
2. **Prompt template mutation API**：当前只有command listing与native file/resources，尚无足够typed CRUD/provenance contract。没有该contract前不开放完整管理动作。
3. **最终Prompt可见度**：Extension可在turn admission修改system prompt。是否保存bounded digest用于诊断，应由真实复现任务和隐私评估决定，首版不做。
4. **Chat/Studio Project rules创建**：folder-backed Project可复用File owner；managed Chat workspace是否允许用户创建`AGENTS.md`，必须由其workspace owner裁决，Prompt页面不自行放宽。
5. **Host policy diet的最终切分**：哪些guideline进入tool definition、哪些进入按需Skill，需用真实Browser/Device/Automation journey比较；不能只按文本长度决定。

这些不确定性不阻止确认本研究的核心方向，但会阻止对应可写/合并/诊断功能在无owner裁决时施工。

## 14. 最终研究裁决

```text
Outcome:
  一个只属于 OmniMind Agent、直接连接 native Prompt 世界的安静设置入口。

Current truth:
  Pi native builder/ResourceLoader 已成熟；OmniMind base 仍自称 Pi；
  母体 Project instructions 是有意实现的 localStorage→Thread notes seed，
  但维护者已确认在 OmniMind 中整体退休；模板只有 command projection；
  Host policy 过重并存在事实漂移。

Smallest path:
  修 product-owned base identity → 投影 native truth → 增加窄 Settings section
  → 只给有真实 owner 的资源开放写入。

Excess rejected:
  Prompt DB/profile/Studio、跨 Provider 统一、第二 loader、raw dashboard、
  自动迁移、全仓库 Pi 改名、通用 resource platform。

Decision:
  GO for product direction；implementation 逐 Slice 服从 architecture owner 与 Gate B。
```

本文没有发现需要维护者在本次 research 写入前回答的阻断性分叉。首个后续实现分叉是第 13.1 项；默认推荐已经明确为保留 native shadow semantics。
