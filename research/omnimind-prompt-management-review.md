# OmniMind Agent 全局提示词设置：最终研究与实施输入

> 当前复核基线：本关注点从 OmniMind `f9da96c48a274d4c2884964d9dec5d9962772fd1` 开始实施；研究源基线 `baf0174c8c7a66610c3446f9370f46bcc7c984c3` 是其祖先。bundled OmniMind Agent runtime 仍为 `@omnimind/pi-coding-agent@0.84.2`；upstream exact source `914cf1472e715297caa30db4b9535d534a9eb718`；本地 vendored artifact SHA-256 仍为 `aa47aec0a6b90e3e32385676aa444bad49f2b3efcc64275d2cd24f96f245deb9`。
>
> 当前状态：**architecture sole owners、execution brief 与 F-22 candidate 已完成准入对齐；Settings→typed RPC→Server 安全文件投影/mutation→bundled discovery→既有 exact-thread reload→next-request capture 已形成 installed candidate。** 产品代码 exact pushed SHA 为 `cf1a1e580509423a92e5334a438a3e077d376210`；focused/full source gates、MiMo/DeepSeek 最小 live、同 SHA macOS arm64 artifact、隔离 fresh-profile packaged UI 与关闭重开 journey 均已闭合。Prompt snapshot 已从错误的 expensive-read 分类恢复为 bounded standard read，UI 对 retryable load failure 提供可操作重试。F-22 仍为 `candidate`：实现者证据不替代安全 claim 的独立复核，当前本机 ad-hoc 安装也不冒充签名、公证或正式发行。本文不取代 architecture、brief 或 active Campaign。

## 0. 一页结论

OmniMind 应在：

```text
设置 → 开发 → 提示词
Settings → Development → Prompts
```

增加一个只服务 **OmniMind Agent** 的窄设置页。

页面的默认主入口是“全局个人指令”，直接编辑 OmniMind Agent 当前实际采用的全局 context candidate。没有任何候选文件时，页面保持“尚未配置”，不会因安装、启动、打开设置或 reload 自动创建文件；用户第一次保存有效内容时才创建标准 `AGENTS.md`。

高级区默认折叠，可直接编辑全局 `APPEND_SYSTEM.md` 和 `SYSTEM.md`。`SYSTEM.md` 首次创建前必须明确提醒它会替换 OmniMind 的默认基础提示词，可能移除默认工具说明和基础行为指导。

实现不得增加 Prompt DB、profile、registry、version ledger、跨 Engine 同步、第二 loader、Prompt-only reload 或动态注入框架。文件、优先级、组合、Session snapshot 与 reload 生命周期继续由 bundled runtime 的既有 owner 负责；OmniMind Host 只负责安全投影、编辑、状态解释和调用既有 reload seam。

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

## 2. 维护者已经锁定的决定

以下内容不再是开放分叉：

1. Prompt 设置主要且仅针对 OmniMind Agent，不考虑 Codex、Claude、OpenCode、stock Pi 或其他 Engine 的统一管理。
2. 其他 Engine 的调研只用于理解行业概念，不能进入 OmniMind 的产品抽象、状态或同步范围。
3. 第一性 follow bundled runtime 的原生 Prompt 发现、组合与 reload 语义；除非真实调用链和 Provider evidence 证明缺口，不修改 Core。
4. 页面位于 `设置 → 开发 → 提示词`，不放在“通用”，不新建应用一级导航，不重排 Settings taxonomy。
5. 页面管理跨项目生效的全局个人指令；不管理当前项目规则。
6. 页面不提供全局 Prompt templates、当前项目模板或模板管理。
7. 页面不展示或编辑 OmniMind Engine Contract。
8. 全局个人指令的主 owner 是 bundled runtime 当前实际选择的全局 context candidate，而不是新的 Product setting value。
9. 初始默认不创建全局 `AGENTS.md`；没有候选时首次保存有效内容才创建。
10. 已有候选时编辑 runtime 当前真正采用的 exact file；不迁移、不改名、不复制。
11. `APPEND_SYSTEM.md` 与 `SYSTEM.md` 放在默认折叠的高级区，可直接编辑。
12. `SYSTEM.md` 首次创建前需要风险确认；不提供默认正文或“一键最佳 Prompt”。
13. 保存只修改文件，不自动 reload 当前 Session；显式 reload 复用现有 `session.reload()`。
14. 不改变 Prompt 物理顺序，不做每轮动态注入，不因设置页降低既有稳定前缀和缓存表现。
15. 用户可见界面只说 OmniMind 和 OmniMind Agent；内部 lineage 只留在代码、research、About/Licenses/SBOM、来源详情和诊断边界。

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

| 内容                                                       | 责任                                                  | 当前产品策略                                   |
| ---------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| OmniMind 产品身份、共同认知、Chat/Agent 行为、安全与真实性 | OmniMind-owned immutable engine contract              | 始终存在；不进入设置页                         |
| 默认工具、guidelines、context、Skills、cwd 构造            | product-owned identity-neutral base + runtime builder | 保留动态构造；不让用户编辑大字符串             |
| 通用 Host/tool guidance                                    | mutable Host append/tool-scoped guidance              | 不冻结进 identity；后续 diet 由各自 owner 处理 |
| 用户跨项目工作习惯                                         | 全局 context candidate                                | 设置页主入口                                   |
| 项目具体约束                                               | Project context chain                                 | 文件优先；本页不管理                           |
| 特定任务方法                                               | Skill / Prompt template / Extension                   | 本页不管理                                     |
| 高级追加系统行为                                           | `APPEND_SYSTEM.md`                                    | 高级区                                         |
| 完整替换基础 Prompt                                        | `SYSTEM.md`                                           | 高级区、高风险                                 |

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
product-owned identity-neutral default base
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

设置页只允许用户修改其中三个全局文件入口，不拥有最终 Prompt，不改变上述顺序，也不构造 raw preview。

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
- 多候选时展示当前生效文件和被遮蔽文件，但不改变顺序；
- 删除 exact candidate 后重新发现下一候选，不能继续显示 stale source。

### 6.4 `APPEND_SYSTEM.md`

ResourceLoader 只选择一个来源：

1. 正式 trusted Project 当前 cwd 下的 `.omnimind/APPEND_SYSTEM.md`；
2. 否则 global agentDir 的 `APPEND_SYSTEM.md`；
3. 否则没有用户 append。

Project 文件存在时遮蔽 global 文件，二者不合并。设置页不管理 Project 文件，也不能偷偷把 global 强行追加回来；高级说明必须准确告知当前 Project 可能使用自己的附加系统指令。

### 6.5 `SYSTEM.md`

ResourceLoader 只选择一个来源：

1. 正式 trusted Project 当前 cwd 下的 `.omnimind/SYSTEM.md`；
2. 否则 global agentDir 的 `SYSTEM.md`；
3. 否则 product-owned default base。

自定义 `SYSTEM.md` 替换 default base。它仍会收到 append、context files、Skills、cwd 和 final OmniMind contract，但会绕过 default base 内动态生成的工具列表和基础 guidelines。实际 tool schema 与权限不会因此消失；可能消失的是模型如何使用工具和工作的默认指导。

因此 UI 必须叫“替换基础提示词”，放在高级区，并在首次创建前确认风险。

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
  全局个人指令                 主入口
  高级                         默认折叠
    附加系统指令
    替换基础提示词
```

首版明确不包含：

- 当前项目规则；
- Prompt templates；
- 当前最终 Prompt；
- OmniMind 默认指令/Engine Contract 预览；
- Provider selector；
- 其他 Engine 状态；
- Prompt profiles；
- Prompt history；
- Token/cache dashboard；
- Marketplace 或云同步。

### 9.2 页面布局

- 复用现有 Settings sidebar、section mounting、search、deep-link、keyboard、focus 和 message catalog；
- 不新增顶层 Tab、卡片墙或三层导航；
- 页面首屏只有一个明确视觉中心：全局个人指令；
- 编辑使用同 Settings pane 内的 full-width editor，不弹 Modal；
- 显式“保存 / 取消”，不 autosave；
- 高级区用 disclosure 展开；
- exact file name/path、candidate 遮蔽与来源细节放“技术详情”；
- `SYSTEM.md` 首次创建确认可以复用现有产品 Dialog；
- 后续实现前按 `architecture/workbench.md` 和最近同角色 Settings surface完成组件复用裁决，不能在 research 阶段预建新 component family。

### 9.3 中文产品文案

| 位置            | 中文文案                                                               |
| --------------- | ---------------------------------------------------------------------- |
| Settings 导航   | 提示词                                                                 |
| 页面标题        | 提示词                                                                 |
| 页面说明        | 为 OmniMind Agent 设置跨项目生效的个人指令，并管理高级系统提示词。     |
| 主入口标题      | 全局个人指令                                                           |
| 主入口说明      | 设置你的长期工作习惯。适用于所有 OmniMind Agent 项目。                 |
| 空态            | 尚未配置全局个人指令。                                                 |
| 创建动作        | 添加指令                                                               |
| 编辑动作        | 编辑                                                                   |
| 保存            | 保存                                                                   |
| 取消            | 取消                                                                   |
| 删除动作        | 移除文件                                                               |
| 高级区          | 高级                                                                   |
| APPEND 标题     | 附加系统指令                                                           |
| APPEND 说明     | 在 OmniMind 默认基础提示词后追加内容。仅建议熟悉提示词结构的用户使用。 |
| SYSTEM 标题     | 替换基础提示词                                                         |
| SYSTEM 说明     | 使用自定义内容替换 OmniMind 的默认基础提示词。                         |
| 技术 disclosure | 技术详情                                                               |
| reload 动作     | 重新加载当前对话资源                                                   |

推荐 placeholder 仅用于示例，不得保存：

```markdown
例如：

- 默认使用简体中文回答。
- 先给出结论，再解释关键依据。
- 修改代码后运行最相关的验证。
```

### 9.4 英文产品文案

英文必须独立自然写作，不逐字回译：

| Location             | English copy                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Settings navigation  | Prompts                                                                                                       |
| Page title           | Prompts                                                                                                       |
| Page description     | Set personal instructions that apply across OmniMind Agent projects, and manage advanced system prompts.      |
| Main title           | Global personal instructions                                                                                  |
| Main description     | Define your lasting working preferences for every OmniMind Agent project.                                     |
| Empty state          | No global personal instructions yet.                                                                          |
| Create action        | Add instructions                                                                                              |
| Edit action          | Edit                                                                                                          |
| Save                 | Save                                                                                                          |
| Cancel               | Cancel                                                                                                        |
| Remove action        | Remove file                                                                                                   |
| Advanced section     | Advanced                                                                                                      |
| APPEND title         | Additional system instructions                                                                                |
| APPEND description   | Add instructions after OmniMind's default base prompt. Recommended only if you understand prompt composition. |
| SYSTEM title         | Replace base prompt                                                                                           |
| SYSTEM description   | Replace OmniMind's default base prompt with custom content.                                                   |
| Technical disclosure | Technical details                                                                                             |
| Reload action        | Reload current conversation resources                                                                         |

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

- “全局个人指令”；
- “重新加载当前对话资源”；
- “OmniMind 的产品身份与安全边界仍会保留”；
- “当前项目有自己的附加系统指令，因此此全局文件不会用于当前对话”。

## 10. UI 状态与交互合同

### 10.1 全局个人指令来源状态

| 事实                        | UI 状态                  | 动作                                   |
| --------------------------- | ------------------------ | -------------------------------------- |
| 没有候选                    | 尚未配置                 | `添加指令`；非空保存才创建 `AGENTS.md` |
| 一个候选                    | 已配置 · `{filename}`    | 编辑 exact file                        |
| 多个候选                    | 当前使用 `{active}`      | 展示其他文件被遮蔽；不自动处理         |
| exact file 外部变化         | 文件已在其他位置修改     | 阻止覆盖；重新读取或显式解决冲突       |
| 保存成功、无 active Session | 已保存                   | 提示新对话自动使用                     |
| 保存成功、有 active Session | 已保存，待重新加载       | 提供 reload 动作                       |
| Session busy                | 当前对话正在运行         | 禁用 reload；用户稍后重试              |
| reload 成功                 | 当前对话已重新加载       | 下一轮使用新资源                       |
| reload 失败                 | 无法重新加载当前对话资源 | 显示可恢复错误；不伪装回滚             |

### 10.2 多候选提示

中文：

> OmniMind 检测到多个全局指令文件。当前使用 `{active}`；其他文件仍保留，但不会在此位置生效。

英文：

> OmniMind found multiple global instruction files. `{active}` is currently used; the others remain on disk but are not active at this location.

### 10.3 保存反馈

无 active Session：

> 已保存。新的 OmniMind Agent 对话将自动使用这些指令。

有 active idle Session：

> 已保存。重新加载当前对话资源后，后续消息将使用最新内容。

busy：

> 当前对话正在运行，暂时无法重新加载。保存的内容不会影响正在进行的任务。

reload failure：

> 文件已保存，但当前对话资源重新加载失败。请检查文件后重试，或新建对话使用最新内容。

### 10.4 `SYSTEM.md` 首次创建确认

标题：

> 替换 OmniMind 的基础提示词？

正文：

> 这会替换 OmniMind 的默认基础提示词，可能移除内置的工具使用说明和基础行为指导。实际工具与权限不会因此改变，OmniMind 的产品身份与安全边界仍会保留。仅在你清楚这些影响时继续。

动作：

- `继续创建`；
- `取消`。

不使用恐吓式全屏阻断，不要求每次保存重复确认；只在首次创建或从不存在恢复为存在时确认。

### 10.5 Project-local 遮蔽提示

本页不管理 Project 文件，但 active Session 可以存在更具体的 `SYSTEM.md` 或 `APPEND_SYSTEM.md`。若现有 runtime projection 能准确证明，显示：

> 当前项目有自己的附加系统指令，因此此全局文件不会用于当前对话。

或：

> 当前项目使用自己的基础提示词，因此此全局文件不会用于当前对话。

如果施工时没有窄、可信的 source projection，不得通过路径猜测，也不为这个提示新建第二 loader；首版可只提供静态帮助说明。

## 11. 清空、删除与候选重新发现

清空文件与删除文件在 runtime 中不是同一语义：

- 空文件仍存在，仍可能作为第一个候选遮蔽后续文件；
- 删除 active candidate 会暴露下一个候选；
- 删除 `APPEND_SYSTEM.md`/`SYSTEM.md` 会让 runtime 回退到下一原生来源或 default base。

因此：

1. 编辑器允许保存空内容到**已有**文件，表示用户明确保留空文件；
2. 没有文件时，空内容不创建新文件；
3. 删除必须使用独立 `移除文件` 动作并确认 exact filename；
4. 删除成功后立即重新发现 candidate，并显示新的文件事实；
5. 删除不自动 reload active Session；
6. UI 必须说明“移除后，另一个已有指令文件可能开始生效”；
7. 不删除 Session transcript、Project 文件、其他候选或 stock `.pi` 内容。

删除确认中文：

> 移除 `{filename}`？移除后，另一个已有的全局指令文件可能会开始生效。当前对话不会自动重新加载。

## 12. 写入、安全与并发边界

Renderer 不能提交任意绝对路径。Server 端 typed contract 应只接受：

- resource kind：`global_context`、`append_system`、`system`；
- resolved resource identity 或 candidate token；
- expected content hash/version；
- UTF-8 content；
- 明确 create/update/remove intent。

Server 必须：

- 从 `resolveOmniMindAgentDir(serverBaseDir)` 或当前唯一 owner重新解析允许路径；
- global context 只允许候选集合中的 exact filename，新建只允许 `AGENTS.md`；
- `append_system` 只允许 global `APPEND_SYSTEM.md`；
- `system` 只允许 global `SYSTEM.md`；
- 进行 realpath、no-follow、containment 和 symlink escape 检查；
- 限制 UTF-8 bytes，拒绝不可接受编码和超限内容；
- 使用 same-directory temporary file + atomic replace，并合理保留 mode；
- 使用 expected hash/version 尽可能检测并拒绝外部修改；该检查是 optimistic conflict detection，不宣称严格跨进程 CAS；
- no-op save 不写；
- 序列化同一文件并发 writer；
- 删除只作用 exact selected resource；
- Prompt 内容、private path、secret 和原始响应不进入普通日志、Timeline、telemetry、截图或测试快照；
- 不读取、迁移、同步或改写 stock `.pi`、其他 Engine private home 和未知目录。

本实现没有为 Prompt 拍脑袋新增独立的 `1 MB` 产品规则。它复用 Web 已有本地可编辑文本边界，将该边界抽为 contracts-owned `EDITABLE_TEXT_FILE_MAX_BYTES = 1,000,000`，但 **1,000,000 UTF-8 bytes 本身并不自动证明 JSON/RPC 小于 `2 MiB`**：例如 C0 控制字符会被 JSON 转义为六个字节。shared editable-text contract 因此同时拒绝 NUL 与除 tab、LF、CR 外的 C0 控制字符，并按真实 UTF-8 bytes 限额；Server read/write 与 UI 使用同一规则。focused transport test 用最大合法、最坏二倍转义的正文构造真实 Effect RPC request 与 response envelope，证明二者都低于现有 `MAX_WEBSOCKET_MESSAGE_BYTES = 2 MiB`，而不是提高全局 ceiling 或依赖口头 headroom。若传输 owner、编辑器或 runtime 可用性边界以后变化，应在 shared contract 中统一重验，而不是给 Prompt 建第二常量。

Node 当前公开 `fs` 只提供无条件原子 `rename`/`unlink`，没有将“target 仍是这个 inode/version”与 replace/remove 合成一个 syscall 的 API。现有 `beforeReplace` 和 remove 前 `safeRead` 能显著缩小并检测常见 external edit race，但检查后仍有最终 TOCTOU 窗口；严格 CAS 需要 native syscall bridge、协作锁或新协议，均超出本关注点并会形成新的长期 owner。准确合同是：OmniMind writers 在进程内串行，expected version 提供 optimistic conflict detection，检测到变化时 fail closed；极窄的非协作 external-writer race 不宣称原子消除。create 的 link/`EEXIST` 路径仍是原子 no-clobber。

Prompt snapshot 一次只懒加载一个受 shared editable-text contract 限界的本地文件，不执行 workspace search、diff、模型调用或全量 Session 投影，因此属于 standard WS read。把它列入每 client 仅两条 lease 的 expensive-read 集合会让无文件的 Settings 页面被无关长读取阻断；正确修复是恢复 standard 分类并让 UI 失败态提供显式 retry，而不是扩大全局 expensive-read limit。focused admission test 必须在两条 expensive lease 均被占用时仍能取得 Prompt snapshot lease。

snapshot 可以返回 Server 生成的安全 `displayPath`，用于本机技术详情中定位和复制真实文件；它不是 mutation 输入。mutation authority 仍只有 resource kind、allowlisted opaque source id、expected version 与 intent。该路径不得进入 Prompt、普通日志、Timeline、telemetry 或交付截图证据。

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

1. **只读 discovery projection**：返回 active global candidate、多候选与三个 global file 的存在/source facts；不读取 stock Pi。
2. **最小 typed mutation**：create/update/remove 三类 global resources，具备 containment、conflict、atomic/no-op 语义。
3. **Settings UI**：主入口、高级 disclosure、双语 catalog、错误和确认；复用现有 Settings 组件。
4. **reload 接线**：只对 exact active OmniMind Agent thread 调用既有 reload seam；busy/none/failure准确。
5. **证据闭合**：focused request capture、MiMo/DeepSeek 最小 live、packaged fresh-profile journey。

这不是五个长期模块或五个 PR。一个关注点完成后停止，不吞入 Project rules、templates、Host diet 或跨 Engine 功能。

### 13.4 复用要求

- Settings sidebar/section/search/deep-link：复用现有 Settings owner；
- 长文本编辑：复用最近同角色 editor/save-conflict owner；
- Disclosure、Dialog、Toast、Button、empty/error state：复用现有 primitive family；
- Server 文件 mutation：优先复用已有 anchored atomic writer/conflict owner；确实不足才增加窄、OmniMind-Agent-scoped seam；
- reload：直接复用 `reloadSessionResources`，不新增 Prompt reload；
- resource discovery：直接读取 bundled loader 的真实结果或补一个窄 getter；不复制候选算法。

若必须 patch product-owned runtime 才能获得安全且准确的 source projection，必须走 `PI-ECOSYSTEM-INTAKE.md` Gate，优先窄、可上游 seam；不能把 UI 需要变成第二 loader 的理由。

## 14. 验证与 falsifier

### 14.1 Discovery/default

- fresh task-specific OmniMind home 没有候选时，启动、打开页面、取消、reload 都不创建 `AGENTS.md`；
- 第一次非空保存创建 exact global `AGENTS.md`；
- 已有 `CLAUDE.md` 时页面编辑它，不创建更高优先级 `AGENTS.md`；
- 已有 `AGENTS.override.md` + `AGENTS.md` 时前者生效，UI 显示遮蔽；
- 删除 override 后重新发现 `AGENTS.md`；
- 空 active file 仍保持 active 并可遮蔽后续 candidate。

### 14.2 Composition

- default base、global context、Project context、Skills、cwd 与 active tool guidance仍按 exact source 顺序存在；
- `APPEND_SYSTEM.md` 追加而不替换 default base；
- Project APPEND 遮蔽 global，不被 UI 偷偷合并；
- `SYSTEM.md` 替换 base 但 context/Skills/cwd/final OmniMind identity仍存在；
- Extension turn mutation仍按 load order，下一轮无 mutation 时恢复 base；
- OmniMind identity exactly once；
- stock Pi identity和 private home不变。

### 14.3 Save/reload/operation

- no-op save：文件 bytes、mtime、request prompt、reload count不变；
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
- 用户自己的 exact filename/path可以在技术详情显示；
- keyboard、screen reader、focus return、content overflow、search/deep-link工作；
- 高级区默认折叠；
- `SYSTEM.md` 首次创建确认清楚但不过度恐吓；
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

- default no-file request；
- global context after create；
- no-op save；
- save without reload；
- idle reload；
- `APPEND_SYSTEM.md`；
- `SYSTEM.md`；
- candidate shadow/delete；
- Chat global-only；
- Agent global + canonical Project chain。

只保存脱敏 digest、长度、source kind 和 pass/fail，不保存完整 Prompt。

### 15.2 real Provider

按根 `AGENTS.md` 使用 `/Users/liuzaoqu/Desktop/本机AI-API资源盘点.md` 中协议匹配、状态最新的最小资源，优先 Xiaomi MiMo 与 DeepSeek。每个 Provider 最少证明：

1. fresh Session 身份回答仍为 OmniMind；
2. global personal instruction在创建/reload后真实影响下一轮；
3. no-op save不产生请求变化；
4. save without reload不误报已应用；
5. reload continuation正常；
6. usage/cache read/write真实可观测时记录脱敏数值；
7. `SYSTEM.md` 高级路径不删除 OmniMind identity。

硬超时、最少请求、明确费用边界；不做无界跑分。

### 15.3 packaged Desktop

任何改变用户可观察行为的实现必须从 exact pushed SHA 重建安装 App，并使用 task-specific fresh profile。UI 控制前先停止所有现存 OmniMind 实例，显式设置隔离 userData/home/provider private home，并从进程参数或等价证据核验隔离。验证：

- Settings 可发现；
- 初始不创建文件；
- create/edit/conflict/remove；
- advanced confirmation；
- reload busy/success/failure；
- App 关闭重开；
- 中英文与 keyboard/focus；
- stock `.pi` 不变。

源码测试或 dev HMR 单独通过不能宣称用户已拿到功能。

### 15.4 本轮实际证据

- 产品代码先以 authority `695f80baf`、安全文件能力 `7850ff878`、Settings/reload `9d3642557` 闭合，再以 hardening commit `cf1a1e580509423a92e5334a438a3e077d376210` 收窄 CAS claim、补齐读取期间 size/identity guard、C0/RPC envelope 边界、准确 global-file 文案、关键 keyboard/focus/overflow、advanced deep-link、standard WS admission 与 retry UI；exact installed product SHA 为 `cf1a1e580509423a92e5334a438a3e077d376210`。
- Contracts 257、Shared 539（另1项skip）、Desktop 575（另5项skip）、Web 4119、Server 4270（另16项skip）、Scripts 82 全量通过；全仓 typecheck/build、document contract、240项 legal closure、task-file changed-path format 与 lint 0 error 均通过。既有无关格式基线保持原样，没有以扩大格式化范围制造绿色。
- focused admission test 确定性占满同一 client 的两条 expensive-read lease，`omnimindAgentPromptsGetSnapshot` 仍取得 standard lease；focused browser test证明 retryable load failure提供真实“重试”操作。installed exact bytes 的 Prompt 页面正常打开，未复现红色 capacity failure；没有把 focused lease injection 冒充已在 packaged 进程内人工占租约。
- Xiaomi MiMo 与 DeepSeek 分别通过任务专用 loopback credential pass-through 访问各自 OpenAI-compatible endpoint。两者都返回 OmniMind、πAI-Lab 与中英文机构名。MiMo 的 no-op 与 save-without-reload continuation 保持旧 Session digest `2bb1e8e4733199d4` 且只含 LARCH；显式 reload 后下一请求切换为 digest `56c2b0a86f4d3641` 且只含 MAPLE。DeepSeek 使用同一 reload 后 digest并遵循 MAPLE，同 profile 关闭重开后下一请求仍保持该 digest。该 digest 只证明本轮 system-prompt bytes稳定，不冒充 Provider cache 命中率。
- exact product SHA 构建的 macOS arm64 DMG SHA-256 为 `131335b34cba63b64896f7ff630bc687ddc8194799dd1ffb24f0d1cbb9ff753d`，ZIP SHA-256 为 `260b4c23820f1e32165ca6390da5b42e8b70f7f2f14fbd13e65a99609be19f12`；ZIP 通过隔离 startup smoke，安装副本 app.asar SHA-256 为 `0052734e2eea60e7de6729462b7c18618428798946e823642413ce8ee6300981`。
- packaged fresh profile 证明中文“开发→提示词”正常打开、初始零创建、create/edit/no-op、保存不 reload、显式 reload 后下一请求，以及同 profile 关闭 App/重开后 exact conversation 与当前文件恢复；既有同一关注点的祖先 journey继续覆盖中英文导航与搜索/deep-link、safe displayPath、advanced 折叠、SYSTEM 首次确认、external conflict、candidate rediscovery、busy/abort。运行参数证明 Electron userData、HOME、OmniMind home 与 Agent private home均使用任务专用目录。第一次隔离尝试因 LaunchServices relaunch 回到默认 profile而作废；该次误建的真实 home `AGENTS.md` 已立即移动到任务 `/tmp` 恢复副本，随后验收前后都确认真实路径不存在。最终有效 journey先固定并核验全部 LaunchServices隔离环境，结束后恢复为 unset；真实用户 stock `.pi` 与其他 Engine private home保持不变，真实 Prompt 路径恢复为诊断前的 absent 状态。
- reload RPC failure由 focused browser tests 覆盖；初版 Prompts suite 当时没有证明窄宽、keyboard/focus 或 long-content overflow，因此不能把五项 happy-path tests 写成完整矩阵。后续收口只补本页关键风险：窄宽无横向溢出、advanced 键盘进入、SYSTEM dialog Escape/focus return、长正文 textarea 内部滚动与 C0 控制字符阻断；不建设庞大 GUI harness。Provider 未暴露可归因的 cache read/write 字段，因此没有生成 cache 命中结论。

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

### 17.1 已取代的 2026-08-15 宽方案

本文旧版本曾建议页面同时展示：

- “我的指令”=`APPEND_SYSTEM.md`；
- 当前项目规则；
- OmniMind 默认指令；
- Prompt templates；
- 当前生效来源；
- 高级完整替换。

维护者在后续深度讨论中收窄并确认：

- 主入口改为 global context candidate；
- `APPEND_SYSTEM.md` 降为高级；
- 不管理 Project rules；
- 不管理 templates；
- 不显示 Engine Contract/默认指令；
- 不做 current-effective/raw Prompt surface；
- 页面只针对 OmniMind Agent；
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
7. 只实现本页三个 global resource入口和既有 reload接线；
8. 运行 focused、live、packaged证据；
9. 同一关注点包含代码、architecture、research disposition、Campaign evidence；
10. focused闭合后按项目规则 commit/push；用户可观察变更继续完成 exact pushed SHA packaged install/journey。

不得从本文推断已经授权：发布、签名、迁移、跨 Engine 写入、Provider 配置变化、Host diet 或 Project/template 管理。

## 19. 最终研究裁决

```text
Outcome:
  用户在“设置 → 开发 → 提示词”中管理 OmniMind Agent 的全局个人指令，
  并在折叠高级区按需管理附加/替换系统提示词。

Current truth:
  bundled runtime 已拥有成熟的文件发现、Prompt 组合、Session snapshot 和 reload；
  OmniMind identity/cognitive contract 已独立且 exactly once；
  初始默认不会创建全局 AGENTS.md；当前 UI 尚未实现。

Smallest path:
  投影 exact global sources → 安全编辑真实文件 → 复用现有 Session reload
  → 用 OmniMind 产品语言解释保存、遮蔽、busy、失败和恢复。

Excess rejected:
  Prompt Plugin System、DB/profile/registry、跨 Engine 同步、Project/templates、
  raw Prompt、缓存层、Prompt-only reload、自创文件格式和第二 loader。

Decision:
  GO for the confirmed product direction after architecture owner alignment.
```

一句话交接：

> 内部第一性继承 bundled runtime，外部完整属于 OmniMind；文件是真相，设置页是安全薄投影，保存与 reload 分离，没有第二套 Prompt 系统。
