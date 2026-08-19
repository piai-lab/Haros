# OmniMind Agent 提示词设置：研究与实施输入

> 当前复核基线：本关注点从 OmniMind `f9da96c48a274d4c2884964d9dec5d9962772fd1` 开始实施；研究源基线 `baf0174c8c7a66610c3446f9370f46bcc7c984c3` 是其祖先。bundled OmniMind Agent runtime 仍为 `@omnimind/pi-coding-agent@0.84.2`；upstream exact source `914cf1472e715297caa30db4b9535d534a9eb718`；本轮按同一 exact source 增加并闭合 native factory-default input seam 后，vendored artifact SHA-256 为 `b57b866dff4917eb24432a8292ee927139c34dd137208f5fcdff71cc337d37a7`，product patch SHA-256 为 `499b1257c2bc8f98beab1c799bcf669b3b1836f61a06349a2b52247ea1a873af`。
>
> 当前状态：维护者已用新的“两卡片”产品决定 supersede `cf1a1e580509423a92e5334a438a3e077d376210` 的三文件 Settings 模型，后续 `584045a291a91e57ec50ce0e91cee29253334ef1` 又被真实 Provider journey 证伪为 service-based initial Session 漏传 customized default。祖先 product `db25a5b91343a4ddbf70fedd98ea3583bd020317` 已完成窄 runtime 修复、fixed-source generator、deterministic request capture、full gates、MiMo/DeepSeek 与隔离 packaged journey；当前 merge-ready exact pushed product 为 `61bb9e471625186c7693c5b74588e4f6b0e4f956`，并已完成合并前 hardening 与隔离安装复验，`/Applications/OmniMind.app` app.asar 为 `55391e52…`。F-22 仍保持 `candidate`，等待维护者独立裁决。

## 0. 一页结论

OmniMind 应在：

```text
设置 → 开发 → 提示词
Settings → Development → Prompts
```

增加一个只服务 **OmniMind Agent** 的窄设置页。

页面只保留两张主卡片。“默认提示词”展示当前安装版本 bundled runtime 导出的 factory instruction segment 或用户定制值；定制只替换 native builder 的这个稳定输入，不写 `SYSTEM.md`、不经 Host append、不保存展开后的 effective prompt。“自定义规则”继续编辑 OmniMind Agent 当前实际采用的 global context candidate；无候选时为空，首次非空保存才创建标准 `AGENTS.md`，已有候选时编辑 exact active source。

`APPEND_SYSTEM.md`、`SYSTEM.md`、候选/遮蔽 dashboard 与高级文件区全部移出 Settings。高级用户手工文件的 native precedence、Project shadow 和 reload 语义保持不变，OmniMind 不接管或迁移它们。自定义规则卡片底部只显示安全 `displayPath` 与“打开”动作。

实现不得增加 Prompt DB、profile、registry、version ledger、跨 Engine 同步、第二 loader/composer、Prompt-only reload 或动态注入框架。factory text 与 builder 属于 bundled runtime，customized value 属于既有 Server settings，global rules 属于 native file/discovery，Session snapshot 与 reload 继续由既有 owner 负责。

用户面对的是 **OmniMind**。正常设置页文案、Toast、空态、错误和帮助文本不得出现 Pi、Pi-compatible、ResourceLoader、Engine Contract、Host append、upstream、fork 等内部词。内部研究、代码、诊断、许可证、SBOM 和来源详情必须继续准确记录 lineage，不能为了产品语言干净而伪造来源。

## 1. 文档角色与权威边界

### 1.1 本文拥有的内容

本文集中保存：

- exact-source Prompt 发现、组合、覆盖、reload 与 operation snapshot 事实；
- 已完成的 OmniMind identity/cognitive contract 事实与 live evidence；
- 维护者在 2026-08-19 最终确认的 Prompt 设置范围；
- 用户可见产品语言与内部实现语言的防火墙；
- 最小 Settings 信息架构、交互、状态、错误和双语文案；
- 文件 mutation 的安全、并发、冲突和私有目录隔离要求；
- 缓存保护不变量、focused/live/packaged 验证矩阵；
- 已否决路线、历史 supersession 与新会话施工前置条件。

### 1.2 本文不拥有的内容

- OmniMind identity、Chat/Agent work surface、cognitive core 与安全边界的最终 product contract，唯一 owner 是 `architecture/execution.md`；
- Settings 整体信息架构、组件与用户语言规则，唯一 owner 是 `architecture/workbench.md`；
- Workspace、Conversation、Run、Queue 与恢复事实，唯一 owner 是 `architecture/product-state.md`；
- 当前施工准入、并发与阻塞，唯一 owner 是 `execution-brief.md`；
- Pi ecosystem source adoption、fork 与 Gate，唯一 owner 是 `PI-ECOSYSTEM-INTAKE.md`；
- Campaign claim 状态与交付证据，唯一 owner 是 active Campaign。

新会话不能把本文当作跳过 architecture owner 或 Gate 的理由。本文的作用是让后续会话无需重新猜测本轮产品决定和 source facts。

### 1.3 证据分类

| 类型              | 含义                                          | 本文示例                                                                             |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| 维护者确认决定    | 已确认目标，施工前仍须进入 architecture owner | 页面只针对 OmniMind Agent；主入口用全局 context candidate；不做项目规则和模板        |
| exact-source fact | 可从锁定 artifact 与当前调用链复验            | candidate 顺序；SYSTEM/APPEND 遮蔽；`session.reload()` 重建资源                      |
| 已验证产品事实    | 已合入、重建并完成 focused/live journey       | OmniMind identity exactly once；MiMo/DeepSeek 身份回答；stock Pi 不受影响            |
| 实施建议          | 当前最小路径，代码前仍需核现状                | 复用既有 Settings section/editor、typed server mutation、现有 reload API             |
| 非承诺            | 当前证据不支持，不能宣传                      | Provider cache 命中率不下降的绝对保证；reload 失败自动回滚；历史 Prompt exact replay |

## 2. 维护者已经锁定的决定（2026-08-19 最新）

以下内容不再是开放分叉：

1. Prompt 设置主要且仅针对 OmniMind Agent，不考虑 Codex、Claude、OpenCode、stock Pi 或其他 Engine 的统一管理。
2. 其他 Engine 的调研只用于理解行业概念，不能进入 OmniMind 的产品抽象、状态或同步范围。
3. 第一性 follow bundled runtime 的原生 Prompt 发现、组合与 reload 语义；当前 builder 没有 stable editable segment，因此只在 product-owned exact runtime 内增加这个窄输入 seam，不复制 composer。
4. 页面位于 `设置 → 开发 → 提示词`，不放在“通用”，不新建应用一级导航，不重排 Settings taxonomy。
5. 页面只管理 native default 的 factory/custom segment 与跨项目 global custom rules；不管理当前项目规则。
6. 页面不提供全局 Prompt templates、当前项目模板或模板管理。
7. 页面不展示或编辑 OmniMind Engine Contract。
8. customized default 是唯一 Server setting value；global custom rules 的主 owner 仍是 bundled runtime 当前实际选择的 global context candidate。
9. 初始默认不创建全局 `AGENTS.md`；没有候选时首次保存有效内容才创建。
10. 已有候选时编辑 runtime 当前真正采用的 exact file；不迁移、不改名、不复制。
11. `APPEND_SYSTEM.md` 与 `SYSTEM.md` 不进入 Settings；手工文件继续由原生 runtime 管理。
12. fresh profile 必须展示 factory default；恢复默认只移除 customized value，不创建或修改 Prompt 文件。
13. 保存只修改文件，不自动 reload 当前 Session；显式 reload 复用现有 `session.reload()`。
14. 不改变 Prompt 物理顺序，不做每轮动态注入，不因设置页降低既有稳定前缀和缓存表现。
15. 用户可见界面只说 OmniMind 和 OmniMind Agent；内部 lineage 与文件机制只留在代码、research、About/Licenses/SBOM、来源详情和诊断边界。

> 下文关于 exact-source `SYSTEM.md` / `APPEND_SYSTEM.md`、candidate precedence、Session 与 operation 的事实仍有效；其中把三类文件作为 Settings IA、按钮或验收项的旧产品建议均被本节 supersede，只作为历史证据保留。

## 3. 最重要的概念分层

### 3.1 “可插拔”是用户结果，不是新技术类型

维护者希望 Prompt 像 Todo Extension 一样容易安装、替换和维护。对 Prompt 而言，最小且正确的“可插拔”结果是：

```text
不存在 → 显式创建 → 编辑 → 保存 → 显式重新加载 → 清空/删除 → runtime 重新发现
```

不需要把所有可选内容都实现成 Extension，也不需要发明 `PromptPlugin`、Prompt package manifest 或另一套 registry。bundled runtime 已经把不同责任分成 Extension、Skill、Prompt template、context file、system prompt file 和 Package；OmniMind 应复用这些差异，而不是用“一切皆插件”的口号抹平生命周期。

准确结论：

> Prompt 在产品体验上可插拔；在内部实现上仍是 bundled runtime 的原生文件资源。

### 3.2 产品 Prompt、用户 Prompt、项目规则和任务方法不是一层

| 内容                                                       | 责任                                     | 当前产品策略                                   |
| ---------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| OmniMind 产品身份、共同认知、Chat/Agent 行为、安全与真实性 | OmniMind-owned immutable engine contract | 始终存在；不进入设置页                         |
| 稳定默认基础指令                                           | product-owned factory/custom segment     | 设置页“默认提示词”；仍由 native builder组合    |
| 默认工具、guidelines、context、Skills、cwd 构造            | runtime builder                          | 保留动态构造；不展示或保存 effective prompt    |
| 通用 Host/tool guidance                                    | mutable Host append/tool-scoped guidance | 不冻结进 identity；后续 diet 由各自 owner 处理 |
| 用户跨项目工作习惯                                         | 全局 context candidate                   | 设置页“自定义规则”                             |
| 项目具体约束                                               | Project context chain                    | 文件优先；本页不管理                           |
| 特定任务方法                                               | Skill / Prompt template / Extension      | 本页不管理                                     |
| 高级追加系统行为                                           | `APPEND_SYSTEM.md`                       | 手工原生能力；设置页不管理                     |
| 完整替换基础 Prompt                                        | `SYSTEM.md`                              | 手工原生能力；设置页不管理                     |

把产品身份预写入用户 `AGENTS.md` 会导致用户内容与产品内容混合、升级困难、重复 Token、删除歧义和迁移责任，因此被否决。

### 3.3 “跨项目”不等于“跨 Engine”

本页的“全局”只表示：

> 对 OmniMind Agent 的所有 Project、Chat 和新 Session 适用的用户级资源。

它不表示一次设置同步到其他 Engine。跨 Engine 统一会要求写入其他 Engine private home、建立 overlay、处理冲突和更新兼容，是完全不同且未授权的控制面。

## 4. 用户产品语言与内部实现语言防火墙

### 4.1 正常产品表面必须使用的语言

允许并推荐：

- OmniMind；
- OmniMind Agent；
- 全局个人指令；
- 附加系统指令；
- 替换基础提示词；
- 当前对话；
- 重新加载当前对话资源；
- 文件；
- 技术详情；
- 已保存、待重新加载、已加载、加载失败。

### 4.2 正常产品表面禁止出现的内部词

以下词不得进入正常页面标题、说明、空态、Toast、确认框或恢复文案：

- Pi；
- Pi-compatible；
- Pi-derived；
- ResourceLoader；
- AgentSession；
- Host append；
- Engine Contract；
- immutable/mutable prompt；
- upstream/fork/patch；
- stock Pi；
- provider adapter；
- operation snapshot。

### 4.3 可以保留真实 lineage 的边界

以下内部或法定边界必须准确保留来源，不做机械改名：

- research 与 architecture；
- source adoption record；
- About、Licenses、SBOM；
- 第三方 Package/Extension/Skill 的真实名称；
- 开发者诊断和显式技术 provenance；
- 代码标识、测试和日志中为定位问题所必需的 source facts。

技术详情可以显示用户自己的 exact file name/path，但不需要解释 upstream lineage。例如可以显示 `~/.omnimind/.../AGENTS.md`，不能写“由 Pi ResourceLoader 加载”。

## 5. 当前已实现的 OmniMind 身份与认知层

### 5.1 已完成事实

merge `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 已把 bundled OmniMind Agent 的 default base 改为 identity-neutral，并将 OmniMind identity/cognitive/work-surface contract 放入不可被 `SYSTEM.md`、`APPEND_SYSTEM.md`、Skill 或 Extension 删除的 final seam。

identity 至少明确：

```text
You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong).
The academy's official Chinese name is 广东智慧医学国际研究院.
```

同一 contract 还拥有：

- 把用户首个表述视为线索而非完整规格；
- 先调查能从上下文与工具获得的事实；
- 只为会实质改变结果且只有用户知道的分叉提问，并给出推荐；
- 不假设用户是专家，也不降低结果上限；
- Chat 在不误导时先给可用起点并并行澄清；
- Agent 在 outcome、边界、约束和成功标准充分对齐后再进入实质执行；
- “别问，直接做”只放宽低风险可逆未知，不跨越 material fork 或高风险边界；
- 保持独立判断、识别盲点、不迎合错误前提、不伪造验证结果；
- 用户可以覆盖语言、语气、格式和工作偏好，但不能覆盖产品身份、真实性、安全和任务完成边界。

### 5.2 已完成证据

2026-08-19 的 request/reload/compaction 回归证明 Chat 与 Agent 都 exactly once 接收 identity，stock Pi 不接收。授权的 MiMo 与 DeepSeek OpenAI Chat-compatible focused live journey 分别完成首次身份回答、reload 后 continuation、Host loader 激活和实际 Host tool 调用；两者均回答 OmniMind、πAI-Lab、英文机构名和官方中文名，没有把底层模型身份冒充产品身份。

该证据证明 identity 与稳定 Host context 在这些阶段的请求指纹不变；它不证明所有 Provider 的 cache 命中率，也不授权建立 Prompt 缓存层。

### 5.3 对本设置页的直接约束

- 不在用户 `AGENTS.md` 预置产品身份；
- 不在设置页展示完整 Engine Contract；
- 不让 `SYSTEM.md` 删除 OmniMind 产品身份和安全边界；
- 不把“你首先是某模型，现在作为 OmniMind”写成默认用户文件；底层模型身份与产品身份的区分由内部 contract 和 Provider facts 负责；
- 用户问“你是谁”时，应回答 OmniMind 产品身份；只有相关时再说明底层模型，不让底层模型自报覆盖产品身份。

## 6. exact-source Prompt 组合模型

OmniMind Agent 每轮 system prompt 不是一个可持久编辑的大字符串，而是构建链：

```text
product-owned factory/custom default segment
  或一个有效 SYSTEM.md
→ active tools 的 snippets/guidelines
→ 一个有效 APPEND_SYSTEM.md
→ mutable OmniMind Host guidance
→ global context candidate
→ canonical Project root → cwd 的 Project context chain（正式 Agent Session）
→ Skills summary
→ current working directory
→ before_agent_start Extension mutation/messages
→ normalize and append OmniMind engine contract exactly once
→ operation admission 时冻结 systemPrompt/messages/tools
```

设置页只允许用户修改 factory/custom default segment 与 global context candidate；不拥有最终 Prompt，不管理 `SYSTEM.md` / `APPEND_SYSTEM.md`，不改变上述顺序，也不构造 raw preview。

### 6.1 全局 context candidate

锁定 runtime 在 `agentDir` 中按以下顺序选择每个目录里的第一个候选：

```text
AGENTS.override.md
AGENTS.md
AGENTS.MD
CLAUDE.md
CLAUDE.MD
```

事实与产品后果：

- 全局候选存在时首先进入 context chain；
- Project 中的规则继续在其后叠加，全局文件不会因项目文件存在而整体消失；
- 同一目录只有第一个候选生效，其余候选被遮蔽；
- 文件即使为空，只要存在，仍可能遮蔽后续候选；
- global candidate 在 runtime 包装中仍属于 context instructions，不是 system prompt 的最终最高层；
- UI 可以称“全局个人指令”，但不能宣传为“最高优先级”或“覆盖所有项目规则”。

### 6.2 默认不创建 `AGENTS.md`

exact source 只执行 `exists → read`，没有首次启动、安装、reload 或 agentDir 初始化时生成 `AGENTS.md` 的逻辑。因此 OmniMind 必须保持同样行为：

- 打开设置页不创建；
- 进入编辑器不创建；
- 点击取消不创建；
- reload 不创建；
- 没有候选且第一次保存非空内容时才创建标准 `AGENTS.md`；
- 不保存 placeholder；
- 不为产品身份或“最佳实践”写默认正文。

### 6.3 已有候选的编辑规则

- 始终编辑 runtime 当前真正选中的 exact candidate；
- 不发现 `CLAUDE.md` 后又创建更高优先级的 `AGENTS.md`；
- 不自动把 `AGENTS.MD` 改名；
- 不合并多个候选；
- 不复制到 Product DB；
- 多候选时仍只编辑 bundled runtime 选中的 active source，普通 UI 不建立候选/遮蔽 dashboard；
- 删除 exact candidate 后重新发现下一候选，不能继续显示 stale source。

### 6.4 `APPEND_SYSTEM.md`

ResourceLoader 只选择一个来源：

1. 正式 trusted Project 当前 cwd 下的 `.omnimind/APPEND_SYSTEM.md`；
2. 否则 global agentDir 的 `APPEND_SYSTEM.md`；
3. 否则没有用户 append。

Project 文件存在时遮蔽 global 文件，二者不合并。设置页不管理任何 `APPEND_SYSTEM.md`，也不能偷偷把 global 强行追加回来；该事实只用于保护原生 composition 回归，不进入普通页面。

### 6.5 `SYSTEM.md`

ResourceLoader 只选择一个来源：

1. 正式 trusted Project 当前 cwd 下的 `.omnimind/SYSTEM.md`；
2. 否则 global agentDir 的 `SYSTEM.md`；
3. 否则 product-owned default base。

自定义 `SYSTEM.md` 替换 default base。它仍会收到 append、context files、Skills、cwd 和 final OmniMind contract，但会绕过 default base 内动态生成的工具列表和基础 guidelines。实际 tool schema 与权限不会因此消失；可能消失的是模型如何使用工具和工作的默认指导。

这仍是高级用户可手工使用的原生 replacement seam；Settings 不读取、创建、编辑、迁移或确认它。默认提示词卡编辑的是 native builder 的稳定 factory/custom segment，不能用 `SYSTEM.md` 模拟。

### 6.6 Extension turn-time mutation

`before_agent_start` handlers 按 load order 依次处理 mutable system prompt：

- 每个 handler 接收前一个 handler 的结果；
- 成功返回 `systemPrompt` 时替换/继续变换当前值；
- handler error 被记录，后续 handler 可继续；
- mutation 只属于当轮；下一轮未返回修改时恢复 base；
- 所有 mutation 后，OmniMind engine contract 去重并 exactly once 追加。

因此设置页不能在用户发消息前声称知道下一轮 final exact prompt，也不提供“完整最终提示词预览”。

## 7. Session、保存、reload、reopen 与 operation

### 7.1 三个必须分开的事实

```text
文件已保存
Session 已重新加载
当前 operation 已冻结
```

它们不是一个状态。

### 7.2 保存

- 保存只修改 exact file；
- 保存不自动调用 reload；
- active operation 不因文件写入改变；
- 内容字节未变化时不写文件、不更新 mtime、不 reload；
- 成功写入后可显示“已保存，待当前对话重新加载”；
- 没有 active OmniMind Agent Session 时，新 Session 会自然加载当前文件。

### 7.3 reload

现有 Host seam `PiAdapter.reloadSessionResources()` 已按 exact thread 使用 bundled runtime 的 `session.reload()`，并在以下任一状态返回 `busy`：

- active turn；
- streaming；
- active tool items；
- pending user inputs。

`session.reload()` 不是 Prompt-only reload。它会关闭并失效旧 Extension runner，reload settings 和全部 resources，重建 runtime，再发出 reload session start。因此用户按钮必须叫“重新加载当前对话资源”或等价 OmniMind 文案，不能暗示只刷新当前文本。

重要非承诺：exact `0.84.2` reload 在资源加载前已经 invalidates old runner。当前没有证据支持“reload 失败会完整保留旧可用 runner”或“原子回滚”。UI 必须准确显示失败并给出恢复动作，不能宣传不存在的 LKG/rollback。确定性恢复路径可以是修复文件后重试，或新建对话；首版不自动创建 Session、不排 background reload queue。

### 7.4 operation snapshot

operation 开始时复制：

- `systemPrompt`；
- `messages`；
- `tools`。

因此：

- 文件修改不改变 in-flight loop；
- active tool set 更新只影响后续 turn；
- 已接纳 tool call 不因文件保存而换 implementation；
- reload 只能在 idle admission 后执行；
- UI 不得显示“已应用到当前运行任务”。

### 7.5 reopen

SessionManager 持久化 conversation tree、messages、branch、compaction 等 native context，不把历史 system prompt exact bytes 作为版本化恢复 authority。reopen 的准确语义是：

> 恢复会话上下文，并使用重新打开时的当前设置、Prompt 文件、Project rules、Extensions、Skills 和 tools 重建运行环境。

首版不建立历史 Prompt revision DB，不承诺历史回答可用当时 exact Prompt 重放。

## 8. 缓存保护原则

### 8.1 目标

维护者的核心要求不是为当前几百 Token 波动新建缓存框架，而是：

> 不要因为 OmniMind 增加设置页，降低 bundled runtime 原本优质的缓存稳定性。

生态规模不变量仍是：

> Large ecosystem, small effective surface.

安装大量扩展不应自动产生 Prompt 成本；单轮成本应由当前 Session 真正暴露和使用的能力决定。该全局原则由其他 owner 负责，本设置页不得新增 ambient writer 或动态注入破坏它。

### 8.2 设置页必须保护的不变量

- 不改变现有 Prompt 物理顺序；
- 不把 global instructions 移到自创 finalizer；
- 不通过每轮 Hook 注入设置内容；
- 不把同一内容复制到 `AGENTS.md`、`APPEND_SYSTEM.md` 或 Host guidance；
- 不添加时间戳、保存时间、随机 ID、generation、UI metadata；
- 不因打开页面或无变化保存而 reload；
- 不建立 Prompt DB 后每轮再序列化；
- 内容与来源相同必须尽量产生相同 system prompt bytes；
- Extension、Skill、Tool 的确定性行为继续由原有 runtime owner负责，本页不复制排序。

### 8.3 有意义与无意义的缓存变化

有意义：

- 用户真正修改文件；
- 用户显式 reload；
- Project/context/Skill/Tool/Extension active surface 真正改变；
- Provider 或 runtime 合法改变请求。

无意义且必须消除：

- no-op save 改 mtime 并触发 reload；
- UI 将路径标签、状态或版本写进 Prompt；
- 仅进入 Settings 就重建 Session；
- 相同内容因非确定序列化或临时 ID 改变；
- OmniMind 再包一层 Prompt composer。

### 8.4 Provider 证据边界

不同 Provider 可能使用前缀缓存、显式 block cache 或兼容代理转换。不能从模型名推断 wire 语义。后续实施只需证明设置页没有引入新的无意义变化，并在 MiMo、DeepSeek 等授权资源上读取真实 usage/cache read/write 数据；不能承诺所有 Provider 的命中率数值完全相同。

首版不需要 Prompt fingerprint DB、缓存仪表盘或 benchmark 平台。测试可以在进程内 capture exact request bytes/digest，但不得把完整用户 Prompt、秘密 Host context 或 private path写入 artifact、日志或快照。

## 9. Settings 最终信息架构

### 9.1 页面范围

```text
提示词
  默认提示词                   native factory/custom segment
  自定义规则                   global personal rules
  当前对话资源                 explicit reload
```

首版明确不包含：

- 当前项目规则；
- Prompt templates；
- 当前最终 Prompt；
- raw effective Prompt / Engine Contract 预览；
- Provider selector；
- 其他 Engine 状态；
- Prompt profiles；
- Prompt history；
- Token/cache dashboard；
- Marketplace 或云同步。

### 9.2 页面布局

- 复用现有 Settings sidebar、section mounting、search、deep-link、keyboard、focus 和 message catalog；
- 不新增顶层 Tab、卡片墙或三层导航；
- 页面只有“默认提示词”和“自定义规则”两个主卡片；
- 编辑使用同 Settings pane 内的 full-width editor，不弹 Modal；
- 显式“保存 / 取消”，不 autosave；
- 默认卡提供独立“恢复默认”；自定义规则卡底部以淡色显示安全路径；
- Open 只在真实 Desktop bridge存在时显示；
- 不呈现 candidate dashboard、advanced files 或技术详情面板；
- 后续实现前按 `architecture/workbench.md` 和最近同角色 Settings surface完成组件复用裁决，不能在 research 阶段预建新 component family。

### 9.3 中文产品文案

| 位置          | 中文文案                                     |
| ------------- | -------------------------------------------- |
| Settings 导航 | 提示词                                       |
| 页面标题      | 提示词                                       |
| 页面说明      | 自定义 OmniMind Agent 的默认指令与个人规则。 |
| 默认卡标题    | 默认提示词                                   |
| 默认卡说明    | 决定 OmniMind Agent 的基础工作方式。         |
| 恢复动作      | 恢复出厂默认                                 |
| 规则卡标题    | 自定义规则                                   |
| 规则卡说明    | 用于所有 OmniMind Agent 项目的个人偏好。     |
| 无规则来源    | 首次保存非空内容后会创建 AGENTS.md。         |
| 保存          | 保存                                         |
| 取消          | 取消                                         |
| 删除动作      | 删除自定义规则                               |
| 打开动作      | 打开                                         |
| reload 动作   | 重新加载当前对话资源                         |

推荐 placeholder 仅用于示例，不得保存：

```markdown
例如：

- 默认使用简体中文回答。
- 先给出结论，再解释关键依据。
- 修改代码后运行最相关的验证。
```

### 9.4 英文产品文案

英文必须独立自然写作，不逐字回译：

| Location            | English copy                                                        |
| ------------------- | ------------------------------------------------------------------- |
| Settings navigation | Prompts                                                             |
| Page title          | Prompts                                                             |
| Page description    | Customize OmniMind Agent's default instructions and personal rules. |
| Default card        | Default prompt                                                      |
| Default description | Sets the basic way OmniMind Agent works.                            |
| Restore action      | Restore factory default                                             |
| Rules card          | Custom rules                                                        |
| Rules description   | Personal preferences used across all OmniMind Agent projects.       |
| No rules source     | AGENTS.md will be created on the first non-empty save.              |
| Save                | Save                                                                |
| Cancel              | Cancel                                                              |
| Remove action       | Delete custom rules                                                 |
| Open action         | Open                                                                |
| Reload action       | Reload current conversation resources                               |

### 9.5 用户绝不能看到的错误文案示例

以下写法禁止进入产品：

- “编辑 Pi 全局 AGENTS.md”；
- “Pi-compatible Prompt”；
- “调用 ResourceLoader reload”；
- “Engine Contract 不会被覆盖”；
- “stock Pi 不受影响”；
- “修改 mutable base”；
- “Pi Project APPEND shadows global”。

对应产品化表达应是：

- “默认提示词”与“自定义规则”；
- “重新加载当前对话资源”；
- “OmniMind 的产品身份与安全边界仍会保留”；
- “自定义规则无法在此编辑，请使用下方位置进行修改”。

## 10. UI 状态与交互合同

### 10.1 两资源状态

| 事实                          | UI 状态                        | 动作                              |
| ----------------------------- | ------------------------------ | --------------------------------- |
| factory default               | OmniMind 内置默认              | 编辑、保存 customized value       |
| customized default            | 已自定义                       | 编辑、取消、保存、恢复默认        |
| 没有 custom rules candidate   | 空编辑器                       | 非空保存才创建 `AGENTS.md`        |
| active custom rules可安全编辑 | 显示正文与淡色安全路径         | 编辑 exact active source          |
| active source超限/非安全文本  | 该卡 unavailable，默认卡仍可用 | Desktop 可用时打开所在位置恢复    |
| exact value/source 外部变化   | 这项设置已在其他位置变化       | 阻止覆盖；重新载入或显式保留草稿  |
| 保存成功                      | 已保存                         | 不自动 reload                     |
| Session busy                  | 当前对话正在运行               | reload拒绝；不取消 operation      |
| reload 成功                   | 当前对话已重新加载             | 下一轮使用新 snapshot             |
| reload 失败                   | 已保存但无法重新加载           | 可重试或新建对话；不伪装 rollback |

### 10.2 来源路径与 Open

候选数量、遮蔽关系和文件名不成为主信息架构。自定义规则卡底部只显示 Server 生成的安全 `displayPath`；无文件时显示首次非空保存会创建 `AGENTS.md`。`revealPath` 只用于真实 Desktop bridge 的本机打开动作，普通 Web surface 不显示无效按钮，路径也不成为 mutation authority。

### 10.3 保存反馈

无 active Session：

> 已保存。新的 OmniMind Agent 对话将自动使用这些指令。

有 active idle Session：

> 已保存。重新加载当前对话资源后，后续消息将使用最新内容。

busy：

> 当前对话正在运行，暂时无法重新加载。保存的内容不会影响正在进行的任务。

reload failure：

> 修改已经保存，但当前对话资源重新加载失败。请重试，或新建一个对话。

### 10.4 默认状态与恢复

默认卡的淡色说明必须依据 `customized` 准确显示“OmniMind 内置默认”或“已为 OmniMind Agent 自定义”，两者都提醒保存后需要显式 reload。恢复默认提交该编辑器实际基于的 version；另一资源 mutation 带回的新 snapshot 不能替换这个 CAS base，否则会越过用户旧草稿冲突。两张卡各自把 draft、base version、正文状态与来源详情绑定到同一个 resource snapshot slice；一次 mutation 只刷新对应 slice，不能让另一卡出现旧正文配新路径或新状态的混合视图。

### 10.5 不可编辑 custom rules

现存 active candidate 若超过 8 KiB、含不支持控制字符或不是合法 UTF-8，snapshot 返回 resource-level unavailable而不是让整页失败。正文与 version 不投影，编辑/删除禁用；安全 `displayPath` 仍显示，Desktop bridge可用时提供 Open。真正的 transport/snapshot failure 才进入整页 error + Retry。手工 `SYSTEM.md` / `APPEND_SYSTEM.md` 与 Project-local shadow继续原生工作，但本页不读取、展示或管理。

## 11. 恢复默认、清空与删除

两个资源的恢复语义不同：

- 默认提示词的“恢复默认”只移除 Server settings 中的 customized value，使 native builder 回到当前安装版本的 factory segment；它不写文件，也不创建 `SYSTEM.md`。
- 自定义规则的空文件与删除仍遵循 runtime 原生语义：保存空内容到已有 active source 会保留该 source 及其遮蔽；删除 exact active source 后重新调用 bundled discovery，下一候选可能生效。
- 无候选时保存空内容不创建 `AGENTS.md`；页面访问、取消与 no-op 也不创建、不写、不 reload。
- 普通 UI 只说“删除自定义规则”，不把候选、遮蔽或文件管理提升为信息架构；确认文案可以准确提醒另一个已有规则来源可能随后生效。
- Settings 不删除或修改手工 `SYSTEM.md`、`APPEND_SYSTEM.md`、Project 文件、Session transcript、其他 Engine home 或 stock `.pi`。

## 12. 写入、安全与并发边界

Renderer 不能提交任意绝对路径。公共 Prompt contract 只投影两个资源：

- `defaultPrompt`：当前 factory/custom正文、是否已定制、opaque version；
- `customRules`：active source 的正文、opaque source id/version、安全 `displayPath`/revealPath，以及 `absent | available | unavailable` 状态。

mutation 只接受 `setDefault`、`restoreDefault`、`createCustomRules`、`updateCustomRules`、`removeCustomRules` 的 tagged intent、必要的 expected version/source id 与 UTF-8 content；Renderer 不提交路径。

Server 必须：

- 从 `resolveOmniMindAgentDir(serverBaseDir)` 或当前唯一 owner重新解析允许路径；
- default customized value 只保留在 server-internal `ServerSettings`，从公共 `ServerSettingsView`、普通 settings stream 与 `ServerSettingsPatch` 删除；专用 Prompt service 通过 Server settings 同一 write semaphore 内的窄 compare/no-op/write seam 修改，不能建立第二 writer；
- custom rules 只允许候选集合中的 exact active filename，新建只允许 `AGENTS.md`；
- 进行 realpath、no-follow、containment 和 symlink escape 检查；
- 限制 UTF-8 bytes，拒绝不可接受编码和超限内容；
- 使用 same-directory temporary file + atomic replace，并合理保留 mode；
- 使用 expected hash/version 尽可能检测并拒绝外部修改；该检查是 optimistic conflict detection，不宣称严格跨进程 CAS；
- no-op save 不写；
- 序列化 OmniMind Prompt writers；default 的 compare 与写入在 settings owner 同一锁内完成，自定义规则仍使用 expected-version optimistic conflict；
- 删除只作用 exact selected resource；
- Prompt 内容、private path、secret 和原始响应不进入普通日志、Timeline、telemetry、截图或测试快照；
- 不读取、迁移、同步或改写 stock `.pi`、其他 Engine private home 和未知目录。

`EDITABLE_TEXT_FILE_MAX_BYTES = 1,000,000` 只继续拥有通用本地可编辑文本上限，并作为调用 bundled discovery 前的 allocation guard，不是 Prompt 可用性边界。bundled helper 选定 active source 后，只有 active source 应用 contracts-owned `OMNIMIND_AGENT_PROMPT_MAX_BYTES = 8 KiB`（每个可编辑 segment）；因此被遮蔽的 9 KiB 候选不会压过一个更高优先级、可编辑的 active source。active 超限或不是安全文本时，只把 `customRules` 投影为 unavailable，保留安全定位/打开恢复，`defaultPrompt` 仍正常显示。当前支持模型的最小 context window 为 32k tokens，两段最大合法正文合计 16 KiB；按保守的一 byte 至多对应一 token 的工程估计，它们最多占用最小窗口的一半，为 native builder、tools、Project context、Skills 与 conversation 留下另一半。这个取值是跨 tokenizer 的保守工程边界，不是对任意 tokenizer 的数学 token 保证，也不承诺其他原生动态资源永不造成 context pressure。

Prompt-specific predicate 同时拒绝 NUL 与除 tab、LF、CR 外的 C0 控制字符，并按真实 UTF-8 bytes 执行 `8 KiB` 上限；contracts、server-internal persisted default、Server safe read/write 与 UI 共用这一规则。focused tests 以多字节 emoji 证明 code-unit 长度不能绕过 byte limit，并以最大合法、最坏二倍 JSON 转义的两段正文构造真实 Effect RPC request 与 response envelope，证明低于现有 `MAX_WEBSOCKET_MESSAGE_BYTES = 2 MiB`，而不提高全局 ceiling。若最小模型窗口、传输或编辑器边界变化，应在这个 contracts owner 中统一重验。

Node 当前公开 `fs` 只提供无条件原子 `rename`/`unlink`，没有将“target 仍是这个 inode/version”与 replace/remove 合成一个 syscall 的 API。现有 `beforeReplace` 和 remove 前 `safeRead` 能显著缩小并检测常见 external edit race，但检查后仍有最终 TOCTOU 窗口；严格 CAS 需要 native syscall bridge、协作锁或新协议，均超出本关注点并会形成新的长期 owner。准确合同是：OmniMind writers 在进程内串行，expected version 提供 optimistic conflict detection，检测到变化时 fail closed；极窄的非协作 external-writer race 不宣称原子消除。create 的 link/`EEXIST` 路径仍是原子 no-clobber。

Prompt snapshot 一次只懒加载一个受 shared editable-text contract 限界的本地文件，不执行 workspace search、diff、模型调用或全量 Session 投影，因此属于 standard WS read。把它列入每 client 仅两条 lease 的 expensive-read 集合会让无文件的 Settings 页面被无关长读取阻断；正确修复是恢复 standard 分类并让 UI 失败态提供显式 retry，而不是扩大全局 expensive-read limit。focused admission test 必须在两条 expensive lease 均被占用时仍能取得 Prompt snapshot lease。

snapshot 可以返回 Server 生成的安全 `displayPath`，用于自定义规则卡底部定位和复制真实来源；它不是 mutation 输入。只有真实 Desktop bridge 支持 reveal 时才显示“打开”，普通 Web surface 不呈现静默 no-op。路径不得进入 Prompt、普通日志、Timeline、telemetry 或交付截图证据。

write receipt、reload receipt 与 next-turn request evidence 必须分开；API 不得返回“已应用”作为模糊布尔值。

## 13. 最小实现路径

### 13.1 先修 owner，再施工

代码前必须更新：

1. `architecture/workbench.md`：接纳 `开发 → 提示词` 窄 section，锁定用户产品语言、页面范围和不管理 Project/templates；
2. `architecture/execution.md`：只在必要处补充 global user Prompt projection 不改变 runtime owner、identity 或 reload；不得复制本文全部实现细节；
3. `execution-brief.md`：只协调该关注点当前是否可进入、真实并发与阻塞；不能重新否决维护者已确认的完整 decision surface；
4. active Campaign：只在本任务确实进入施工时增加/更新对应 claim 与 evidence pointer。

### 13.2 沿真实调用链盘点

新会话施工前必须从真实入口追踪：

```text
Settings route/section
→ current Settings layout/editor/dialog/i18n owners
→ Web API contract
→ wsRpc admission
→ server Prompt resource projection/mutation
→ resolveOmniMindAgentDir
→ bundled ResourceLoader getters/discovery
→ active Thread/session lookup
→ reloadSessionResources
→ AgentSession.reload
→ next request capture
```

每一层标记“已存在、部分存在、缺失”，先复用现有 owner。未完成该盘点前不得增加新 store、manager 或公共抽象。

### 13.3 最小纵向切片

建议一个关注点内按以下顺序闭合，但不要为每步建立第二状态系统：

1. **native default segment**：product-owned bundled runtime 导出 factory text，并让同一个 builder 接受可选 customized segment；不走 `SYSTEM.md`、Host append 或第二 composer。
2. **唯一 persistence owner**：customized default 留在 server-internal settings，通过同一 settings write semaphore 的窄 CAS seam读写；公共 settings view/stream/patch不投影正文。
3. **custom rules projection/mutation**：bundled discovery 决定 active source；Host 只安全读取 exact active、create/update/remove，并把不可编辑 active 局部降级为 unavailable。
4. **两卡片 Settings UI**：默认提示词、自定义规则、双语 catalog、独立 draft/save/cancel/restore/delete、准确状态与 Desktop-only Open；没有 advanced files。
5. **reload 接线**：只对 exact active OmniMind Agent thread 调用既有 reload seam；busy/none/failure准确。
6. **证据闭合**：focused request capture、MiMo/DeepSeek 最小 live、packaged fresh-profile journey。

这不是五个长期模块或五个 PR。一个关注点完成后停止，不吞入 Project rules、templates、Host diet 或跨 Engine 功能。

### 13.4 复用要求

- Settings sidebar/section/search/deep-link：复用现有 Settings owner；
- 长文本编辑：复用最近同角色 editor/save-conflict owner，每段使用稳定的 8 KiB byte boundary；
- Disclosure、Dialog、Toast、Button、empty/error state：复用现有 primitive family；
- Server settings mutation：default 只用既有 settings owner 内同锁的窄 internal compare/no-op/write seam；
- Server 文件 mutation：custom rules 复用已有 anchored atomic writer/conflict owner；确实不足才增加窄、OmniMind-Agent-scoped seam；
- reload：直接复用 `reloadSessionResources`，不新增 Prompt reload；
- resource discovery：直接读取 bundled loader 的真实结果或补一个窄 getter；不复制候选算法。

若必须 patch product-owned runtime 才能获得安全且准确的 source projection，必须走 `PI-ECOSYSTEM-INTAKE.md` Gate，优先窄、可上游 seam；不能把 UI 需要变成第二 loader 的理由。

## 14. 验证与 falsifier

### 14.1 Discovery/default

- fresh profile 首次打开即显示 bundled factory default；保存 customized value 不创建 `SYSTEM.md`，restore 后回到当前安装版本 factory bytes；
- default customized value 不出现在公共 settings view/stream/patch，并发同 expected version只有一个 changed、另一个 typed conflict；
- fresh task-specific OmniMind home 没有候选时，启动、打开页面、取消、reload 都不创建 `AGENTS.md`；
- 第一次非空保存创建 exact global `AGENTS.md`；
- 已有 `CLAUDE.md` 时页面编辑它，不创建更高优先级 `AGENTS.md`；
- 已有 `AGENTS.override.md` + `AGENTS.md` 时前者生效，但普通 UI 不建立遮蔽 dashboard；
- 删除 override 后重新发现 `AGENTS.md`；
- 空 active file 仍保持 active 并可遮蔽后续 candidate。
- active source 超过 8 KiB或不是安全文本时，自定义规则卡 unavailable而默认卡仍可编辑；被遮蔽的 9 KiB候选不得阻断更高优先级的可编辑 active；超过通用 1 MiB allocation guard 时不调用 bundled reader。

### 14.2 Composition

- default base、global context、Project context、Skills、cwd 与 active tool guidance仍按 exact source 顺序存在；
- customized default 只替换稳定 factory segment，同一 native builder继续组合动态内容；
- `APPEND_SYSTEM.md` 追加而不替换 default base；
- Project APPEND 遮蔽 global，不被 UI 偷偷合并；
- `SYSTEM.md` 替换 base 但 context/Skills/cwd/final OmniMind identity仍存在；
- Extension turn mutation仍按 load order，下一轮无 mutation 时恢复 base；
- OmniMind identity exactly once；
- stock Pi identity和 private home不变。

### 14.3 Save/reload/operation

- view/cancel/空保存/no-op：settings revision、文件 bytes/mtime、request prompt、reload count不变；
- default save/restore 与 custom rules save/delete都不自动 reload；
- content change + no reload：active Session next request仍使用旧 loaded resource；若真实 runtime path不同，以 request capture为准并更新 owner，不靠猜；
- active operation保存不改变其 systemPrompt/messages/tools snapshot；
- busy reload准确拒绝，不中断 active turn；
- idle reload成功后下一轮使用新内容；
- reload failure不被 UI宣称已回滚；
- reopen用当前文件重建，不承诺历史 exact Prompt。

### 14.4 Cache/request stability

- 相同 files + 相同 Session resources + 相同 active surface 生成相同 system prompt bytes；
- 页面 visit、read、cancel、no-op save 不改变下一请求；
- Settings state、filename label、save timestamp不进入 prompt；
- 只有真正内容/reload/resource变化改变 request digest；
- MiMo 与 DeepSeek 的真实 usage/cache read/write 数据脱敏记录，区分 direct、compatible endpoint 与 proxy；
- 不因单个 Provider 偶然结果新增通用补偿。

### 14.5 UI/product language

- 中英文 catalog key 一一对应；
- 正常页面、空态、Toast、Dialog、error/recovery 全部只使用 OmniMind 产品语言；
- 用户可见路径不出现 Pi、Pi-compatible、ResourceLoader、Engine Contract 等内部词；
- 只有 custom rules 卡底部显示安全 `displayPath`；Open 仅在 Desktop bridge真实可用时出现；
- factory/customized淡色状态准确切换；两张卡不重复标题；unavailable只禁用 custom rules编辑并保留恢复路径；
- keyboard、screen reader、focus return、content overflow、search/deep-link工作；
- 页面没有 Provider selector、Project rules、templates、raw Prompt、profile gallery、Token dashboard或卡片墙。

### 14.6 Security/isolation

- Renderer 任意绝对路径、path traversal、symlink escape全部失败；
- external edit conflict不被覆盖；
- OmniMind writers串行；external writers使用 expected-version optimistic conflict detection，检测到变化时准确冲突，但不宣称最终 TOCTOU 被原子消除；
- Prompt内容与private path不进入普通日志/telemetry/screenshot artifact；
- fresh task profile 的 stock `.pi` tree hash/mtime/size不变；
- 其他 Engine private home零读取、零写入；
- packaged App 使用隔离 userData/home/provider private home完成启动、编辑、reload、关闭和重开验证。

## 15. Live 与 packaged 证据计划

### 15.1 focused fixture

先用 deterministic request capture 建立以下 baseline：

- factory default request与稳定 segment；
- customized default save without reload / reload / restore / reopen；
- custom rules after create；
- no-op save；
- save without reload；
- idle reload；
- manual `APPEND_SYSTEM.md` / `SYSTEM.md` 原生 precedence不回归，但它们不经过 Settings；
- active candidate/delete/empty shadow；
- unavailable active 与 shadowed oversized candidate；
- Chat global-only；
- Agent global + canonical Project chain。

只保存脱敏 digest、长度、source kind 和 pass/fail，不保存完整 Prompt。

### 15.2 real Provider

按根 `AGENTS.md` 使用 `/Users/liuzaoqu/Desktop/本机AI-API资源盘点.md` 中协议匹配、状态最新的最小资源，优先 Xiaomi MiMo 与 DeepSeek。每个 Provider 最少证明：

1. fresh Session 身份回答仍为 OmniMind；
2. customized default保存后未 reload 保持旧 snapshot，reload 后真实影响下一轮；
3. custom rules在创建/reload后真实影响下一轮；
4. no-op save不产生请求变化；
5. busy/reload continuation与 reopen正常；
6. usage/cache read/write真实可观测时记录脱敏数值；
7. 手工 `SYSTEM.md` 原生路径不删除 OmniMind identity，但 Settings 不创建或管理它。

硬超时、最少请求、明确费用边界；不做无界跑分。

### 15.3 packaged Desktop

任何改变用户可观察行为的实现必须从 exact pushed SHA 重建安装 App，并使用 task-specific fresh profile。UI 控制前先停止所有现存 OmniMind 实例，显式设置隔离 userData/home/provider private home，并从进程参数或等价证据核验隔离。验证：

- Settings 可发现；
- 初始不创建文件；
- factory显示、customize/no-op/restore；
- custom rules create/edit/conflict/remove/unavailable与Desktop-only Open；
- reload busy/success/failure；
- App 关闭重开；
- 中英文与 keyboard/focus；
- stock `.pi` 不变。

源码测试或 dev HMR 单独通过不能宣称用户已拿到功能。

### 15.4 本轮实际证据

- `695f80baf`、`7850ff878`、`9d3642557` 与 installed `cf1a1e580509423a92e5334a438a3e077d376210` 属于已被维护者新产品决定 supersede 的旧“三文件 Settings”历史证据。其 source、artifact hash、隔离与 Provider 观察只保留 provenance，不能给当前“两卡片”candidate背书，也不能据此把 F-22 标为 verified。
- `584045a291a91e57ec50ce0e91cee29253334ef1` 的两卡 installed journey 证明 Settings/custom rules 路径可用，但 MiMo Chat 首轮没有 customized-default marker。随后 deterministic request capture 把 customization 放在全新 Session `startSession` 之前，仍得到 factory default，排除了“保存后未 reload”的正确 snapshot语义；根因是 bundled `createAgentSessionFromServices` 接收方没有把 Host 已传入的 `defaultPrompt` 继续转交 native `createAgentSession`。修复只增加这一窄转发及上游/Host回归，并证明 V1 在全新 Chat 首轮出现、保存V2但不reload仍为V1、explicit reload后才为V2；没有按work surface过滤或另建composer。旧digest或旧installed bytes不得冒充新产品结果。
- runtime 修复祖先冻结为 exact pushed product SHA `db25a5b91343a4ddbf70fedd98ea3583bd020317`。macOS arm64 DMG SHA-256=`9a62e2384bb5a917a460679928e67fea2ce0733de61eb67fba06d59d1e28aaef`，ZIP=`43d446891944749d2647a2bec5bc5fabd5d8c02c6932a6bf067f899d90d5966b`，installed app.asar=`95937e7f95237917556151afb6324392704d9f44af3d7cd9e506643dd0389aea`；asar 内嵌 commit 一致，240 项 legal identities 闭合。它继续拥有下条 MiMo/DeepSeek 与完整 reload/remove 证据，但不再是当前安装 bytes。
- 合并前 deep review 将最新 main 合入任务分支，并修复 Settings section 切换覆盖未保存草稿、Prompt 接受孤立 UTF-16 surrogate 后持久化静默替换、worktree status 过期 DOM 断言与 TraitsPicker 菜单初始 focus race；current exact pushed product 为 `61bb9e471625186c7693c5b74588e4f6b0e4f956`。macOS arm64 DMG SHA-256=`b3604c655750cf894923f6efdf78ff90d36cbd1a6c7b3323c5fe154de337943c`，installed app.asar=`55391e5206248c6746445f910d7978feeb5f81ca3a6a5e2a1282bea1bc7e7b62`；asar 内嵌 commit 一致，240 项 legal identities 闭合。本轮未生成 current-SHA ZIP，旧 ZIP 不作为证据。task-specific root 中主进程收到显式 `--user-data-dir`，Helper userData、Server state/log 与 Provider agent dir 均保持同根隔离；fresh UI、跨 Settings 分区双草稿、cancel/no-create、save/customized notice、safe display path/Desktop Open、view/reopen hash/mtime 稳定及 restore factory 通过。当前 journey 无 active thread，未把 reload/next-request 冒充为本轮 packaged 证据；相关 runtime 事实继续由 deterministic fixture 与上一条祖先 live journey 支撑。
- packaged UI控制前，主进程显式接收task-specific `--user-data-dir`；Helper实际userData、Server cwd/state/log、Provider agent dir均从argv与open handles证明位于同一task root。MiMo全新Chat首轮同时遵循V1与custom rules，save V2 without reload仍保持V1，explicit reload后以排除历史消息干扰的新问题确认V2；DeepSeek全新Agent首轮同时遵循V2与custom rules，并保持OmniMind/πAI-Lab及中英文机构identity。相同内容页面visit/cancel前后settings与rules hash/mtime完全相同；同profile关闭重开保留值；restore factory与remove rules回到empty state。重复同一句的MiMo输出曾沿历史assistant文本复述V1，随后明确询问current system instruction得到V2；wire/session正确性以deterministic request capture为主，不用模型服从性代替。
- 一次`--version`探测被Electron当作正常默认启动，未进入UI、未作为journey证据且立即停止。按维护者要求只读复核真实`~/.omnimind/agent`的`AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md`、`CLAUDE.MD`、`SYSTEM.md`、`APPEND_SYSTEM.md`仍全部absent；未读取正文或无关用户数据。

## 16. 明确否决与 stop-loss

### 16.1 当前明确不做

- Prompt Plugin System；
- Prompt Profile/版本切换；
- Prompt DB/registry/ledger；
- Prompt Studio；
- raw final Prompt inspector；
- Prompt fingerprint 数据库；
- 缓存仪表盘或自建缓存层；
- 全局模板/当前项目模板管理；
- 当前项目 `AGENTS.md` 编辑；
- Engine Contract 展示或编辑；
- 跨 Engine 同步；
- 写入其他 Engine private home；
- `ROLE.md`、`PREPEND_SYSTEM.md`、自创 finalizer；
- Prompt-only reload 或 background reload queue；
- 自动迁移旧 Project instructions/Thread notes；
- 全仓库把 Pi 名称机械替换为 OmniMind；
- 为 UI 复制 ResourceLoader、Tool Registry 或 Extension lifecycle。

### 16.2 Stop-loss

出现以下任一情况停止并回到 owner/维护者裁决：

- 需要第二个候选文件算法才能做页面；
- 需要 Prompt DB 才能完成保存；
- 需要修改其他 Engine private home；
- 需要把 Settings state写入每轮 Prompt；
- 需要保存完整最终 Prompt 才能解释状态；
- 需要新的 package/manager/public resource platform；
- reload 失败处理开始催生 LKG/generation/rollback子系统；
- Project rules/templates/Host diet 被顺带吞入；
- 为消除内部词开始伪造 license、diagnostic 或 third-party identity；
- 文档、checker、fixture增长但用户 journey没有更接近完成。

## 17. 历史路线与 supersession

### 17.1 已取代的宽方案与三文件方案

本文旧版本曾建议页面同时展示：

- “我的指令”=`APPEND_SYSTEM.md`；
- 当前项目规则；
- OmniMind 默认指令；
- Prompt templates；
- 当前生效来源；
- 高级完整替换。

随后曾形成“global context 主入口 + advanced `APPEND_SYSTEM.md` / `SYSTEM.md`”三文件 candidate，并完成一次历史 installed journey。维护者最终再次收敛为当前两资源模型：

- “默认提示词”编辑 native builder 的 stable factory/custom segment，不是 `SYSTEM.md`；
- “自定义规则”继续编辑 exact active global context source；
- `APPEND_SYSTEM.md` / `SYSTEM.md` 全部移出 Settings，只保留手工原生能力；
- 不管理 Project rules、templates、Engine Contract、effective/raw Prompt或其他 Engine；
- 用户产品语言不得出现 Pi lineage。

旧方案不得作为实施输入。

### 17.2 Environment `Project instructions`

Synara exact source 的旧 `Project instructions` 是真实 per-Project localStorage → new-task Thread notes seed，不是死代码，也不是 runtime Prompt。维护者已知情接受失去该能力并确认整体退休：保留 Thread-level Notepad 和已有 notes，不迁移、不扫描、不删除，不改造成 `AGENTS.md` 或 Prompt 设置。当前全局 Prompt 页面不得接管这些历史内容。

### 17.3 identity 历史候选

旧单段 `You are OmniMind, the built-in agent...` 候选已经被 identity-neutral default base + immutable OmniMind contract 的分层实现取代。本文不得复制完整 runtime constants成为第二文本真相；后续如改 identity，先改 `architecture/execution.md` 与 runtime exact owner，再更新研究证据。

### 17.4 外部产品调研的正确用途

Codex、Claude Code、Gemini CLI、OpenCode、VS Code/Copilot 的调研只证明行业普遍存在“用户级长期指令”和“项目级指令”的概念；它们的文件名、目录和 Settings 设计不是 OmniMind contract。OmniMind 不建立跨产品映射，也不以外部实现覆盖 bundled runtime exact facts。

## 18. 新会话执行清单

新会话在开始实现前必须按根 `AGENTS.md` 读取：

1. `README.md`；
2. `PI-ECOSYSTEM-INTAKE.md`；
3. `architecture/README.md`；
4. `architecture/workbench.md`；
5. `architecture/execution.md`；
6. `architecture/product-state.md`（涉及 Session/恢复时）；
7. `execution-brief.md`；
8. active Campaign；
9. 本文；
10. `pi-native-product-integration-review.md` 与 `pi-native-host-tool-loading-review.md` 中与 Prompt/reload 直接相关的 exact evidence。

然后：

1. 核 `git status --short`，保留未知修改；
2. 复验 current HEAD、vendored artifact 与 runtime source是否仍为本文基线；
3. 若版本或调用链变化，只重验受影响事实；
4. 先把已确认稳定决定写入 architecture sole owner，删除/修正冲突路由；
5. 完成 Settings→RPC→server→runtime→request 的真实调用链盘点；
6. 形成一句最小复用裁决；
7. 只实现 native factory/custom default、自定义规则与既有 reload接线；
8. 运行 focused、live、packaged证据；
9. 同一关注点包含代码、architecture、research disposition、Campaign evidence；
10. focused闭合后按项目规则 commit/push；用户可观察变更继续完成 exact pushed SHA packaged install/journey。

不得从本文推断已经授权：发布、签名、迁移、跨 Engine 写入、Provider 配置变化、Host diet 或 Project/template 管理。

## 19. 最终研究裁决

```text
Outcome:
  用户在“设置 → 开发 → 提示词”中编辑 OmniMind Agent 的默认提示词，
  并设置跨项目的自定义规则；页面不管理高级 Prompt 文件。

Current truth:
  bundled runtime 导出稳定 factory segment，并继续拥有 Prompt 动态组合；
  Server settings唯一持久化 customized default，global context文件继续由原生 discovery拥有；
  OmniMind identity/cognitive contract 已独立且 exactly once；
  fresh profile显示 factory default，但不会因访问页面创建 AGENTS.md。

Smallest path:
  native builder stable segment + private settings CAS → 安全编辑 exact active custom rules
  → 复用现有 Session reload → 用 OmniMind 产品语言解释保存、busy、失败和恢复。

Excess rejected:
  Prompt Plugin System、DB/profile/registry、跨 Engine 同步、Project/templates、
  raw Prompt、advanced file UI、缓存层、Prompt-only reload、自创文件格式和第二 loader。

Decision:
  GO for the confirmed product direction after architecture owner alignment.
```

一句话交接：

> 默认正文是同一 native builder 的稳定输入，自定义规则继续服从原生文件发现；设置页只投影这两项，保存与 reload 分离，没有第二套 Prompt 系统。
