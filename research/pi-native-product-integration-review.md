# Pi native capability 与 OmniMind 产品整合复核

## 0. 文档角色

本文记录 2026-08-15 对 `codex/model-services-composer@29b306f16ad56925381c7534bf002e63a4fc767c` 与锁定 Pi `v0.84.1` 的只读源码复核，以及维护者在本轮讨论中确认的产品裁决。该 SHA 只是真实历史证据，不是当前施工基线；任何后续使用都必须从当前代码重新验证相关源码事实。

它只拥有可推翻的 source fact、反例、推断、被否决路线和复验条件：

- 不取代 `architecture/workbench.md`、`architecture/product-state.md` 或 `architecture/execution.md`；
- 不保存 Campaign 状态，不把 research 判断冒充已实现；
- 主会话采用本文裁决时，必须先更新冲突的 sole owner，再修改产品；
- 原 Model services 关注点已经通过的证据，除非当前 SHA 出现新的直接反例，不应因本文重新演整轮 E0–E8；
- 在本文绑定的 2026-08-15 快照中，`codex/model-services-composer` 先完成原承诺的 completion review、必要补完、clean 与 merge；这只记录当时的分支关系，不约束今天的准入、分支或施工顺序，本文识别的扩展 Pi-native 目标也不自动成为其他关注点的阻断；
- 当时建议后续从合并后的 `main` 重验 exact runtime/Host 差额；今天是否仍需以及按何顺序施工，必须从当前代码、现行 owner、维护者决定与真实阻塞重新推出，不能把本文条目当封闭需求清单或固定路线；
- OmniMind 默认身份、Prompt 文件/模板的用户管理、当前错误的 localStorage Project instructions、Session reload/reopen 与 Settings 收敛由后续专项 [`omnimind-prompt-management-review.md`](omnimind-prompt-management-review.md) 从 merged `main` 复核；本文第 4 节继续提供其 Pi-native runtime 语义底座；
- Apple 签名/notary、Windows Trusted Signing 与 Windows/Linux 原生安装旅程由后续工程交付统一负责，不属于本文发现的产品代码缺口。

本文所有判断按证据等级分开，避免把历史 CLEAN、当前源码或产品偏好混成同一种事实：

| 等级         | 含义                                            | 本文中的例子                                                                                                              |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 产品裁决     | 维护者已经确认、后续 owner 与实现必须遵循       | Product Project membership 表示 trusted；不建立独立 Trust UI/store；外部签名与跨平台原生发行交给工程交付                  |
| 当前源码事实 | exact SHA 与 pinned Pi 可直接复现               | `PiAdapter` 未显式传 trust；Extension replacement 未绑定 `commandContextActions`；Pi 会重建 system prompt 与 active tools |
| 有证据的推断 | 由当前调用链推出，但仍需用户 journey 或反例收口 | Product fork 可能只有 visible transcript bootstrap；Pi live usage 尚未完整进入 Product receipt                            |
| 待证伪       | 不能直接开工或宣称缺失                          | 是否需要人工 active-tool selector；哪些 tree/fork action 应成为 Desktop 产品动作                                          |

本文不使用“Pi 有这个 API”直接推出“Desktop 必须有同名按钮”，也不使用“Desktop 没有按钮”推出“Pi 能力已经丢失”。判据始终是用户结果、唯一 owner 与 exact runtime 行为。

本轮关键复核入口：

- `apps/server/src/provider/Layers/PiAdapter.ts`：Session services、Host prompt append、Extension UI binding、usage projection、compaction events；
- `apps/server/src/provider/Layers/OmniMindModelServices.ts` 与 `OmniMindEcosystem.ts`：被动 Settings/Library 的 `projectTrusted:false` 与 intent-scoped runtime；
- pinned `@earendil-works/pi-coding-agent` 的 `docs/security.md`、`dist/core/agent-session.js`、`dist/core/extensions/runner.js`：Project Trust、system prompt/active tools、replacement default handlers；
- `packages/contracts/src/providerRuntime.ts` 与现有 Usage/Timeline projection：Product 当前能够表达的 usage、cost、compaction边界；
- Product Project/Thread/cwd 创建与恢复入口：membership、managed workspace、canonical Thread identity 与恢复事实。

## 1. 结论

OmniMind 不应追求“Pi TUI 的每个按钮都在 Desktop 重画一遍”，也不能把成熟 Pi 机制藏在 `optional`、`OPEN` 或 Host adapter 缺口后面。正确判据是：

> **成熟机制继续由 Pi 拥有；凡会改变用户结果、安全、恢复或明确选择的事实，OmniMind 必须保持它真实生效、可发现、可解释且不伪成功。**

这意味着：

1. Pi 的 system prompt 重建、动态 Extension tools、active tool set、retry、compaction、Session tree/fork、Package/ResourceLoader 与原生 usage 都是应该保留的成熟机制；
2. “保留”不等于为每项建立一个 Settings 面板。自动机制可以留在 Session runtime，只把影响用户选择或恢复的事实投影进现有 Composer、Timeline、Workbench、Library 或 Usage owner；
3. OmniMind 只能补 Host 边界、产品语言和跨 Engine 映射，不能复制 Pi 的 registry、Session、prompt builder、package lifecycle、usage store 或 trust store；
4. active tool 不是 permission，Project trust 不是 sandbox，Package verification 也不是 OS 隔离；共同 UI 必须保持这些边界；
5. 奥卡姆剃刀在这里是“更少 authority”，不是“更少能力”。直接复用 Pi 的成熟机制，本身通常就是最简单的方案。

### 1.1 两阶段交付顺序

本研究不改变当前分支的交付顺序：

1. **原分支收尾**：对 Model services + Composer 的原始承诺做 evidence-backed completion review；只修 current exact SHA 能复现、且属于原范围的缺口；随后 clean 并合并 `main`。
2. **当时建议后续独立复核的 Pi-native integration**：在旧分支关系下从 merged `main` 新开关注点，重新读取 sole owners 与锁定 Pi，再处理 system prompt、动态工具、usage、compaction、fork/tree/package 等成熟机制；这不是今天的施工指令。

在当时快照中，不能用旧 CLEAN 逃避原关注点的最终复核，也不能把后续研究发现倒灌成无限合并门。这里的“原关注点/后续关注点”只解释旧分支范围；当前任务边界由今天的代码、owner、维护者决定与真实冲突确定。

### 1.2 已知入口不是封闭清单

后续若重新审查这一来源，不能只实现本文已经点名的六七个功能。正确 intake 是沿当次锁定 Pi 的真实生命周期逐层核对：

```text
public/native capability
→ Pi runtime owner 与状态变更时机
→ 当前 Host bridge 是否保留、降维、误译或假成功
→ Product 现有 owner 与用户可观察结果
→ automatic preservation / read-only projection / semantic mapping / do not replicate
```

至少覆盖 Session 创建与恢复、prompt/resources、tools/Extension、message steering/follow-up、retry/compaction、branch/tree/export、usage/cache/cost、Package/ResourceLoader、Extension UI 与 replacement。每项先找当前差额和反例，再决定是否施工；没有产品损失就记录“已自然保留”并停止。

## 2. OmniMind 的核心哲学

### 2.1 两层 owner，不是两套产品

OmniMind Product 层继续拥有：

- Project、Thread、Composer、Queue、Timeline、Workbench 与用户可见恢复；
- Engine 与 exact model selection；
- 跨 Engine 的 stop-first replacement、失败恢复和 provenance；
- 本地化、可访问性、Desktop packaging 与用户旅程。

Pi/native Engine 层继续拥有：

- native Session、protocol、model request、context、transcript 与 compaction；
- tool registry、active tool set、Extension、Skill、Prompt、MCP 与 package lifecycle；
- provider-native retry、usage/cache/cost 与 Session branch/tree；
- private settings、credentials、state root 与原始诊断。

Host bridge 可以翻译、投影和路由，但不能成为第二事实源。用户不需要理解 Pi lineage，产品也不能因为隐藏 lineage 就删掉 Pi 的机制。

### 2.2 “Pi 全部细节”的准确含义

“全部”应解释为：

- 已成熟并真实参与运行结果的机制不能被 Host 无声削弱；
- 用户显式动作必须得到真实结果、真实失败或明确 unavailable；
- runtime 已支持的能力必须有合适的产品可达性；
- 不要求 raw JSON、任意内部 enum、TUI layout、所有诊断字段或每个 slash command 都成为一级 UI；
- 不要求每个模型有独立品牌图标；正确降级仍是可信模型家族图标 → 服务图标 → 中性 glyph。

### 2.3 四种纳入方式

“纳入 Pi”不是单一动作。所有成熟机制应先归入以下四类，避免把能力完整误解为 UI 数量：

| 纳入方式   | 适用机制                                                               | OmniMind 应做什么                                                                              | 不应做什么                                        |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 自动保留   | system prompt rebuild、retry、auto-compaction、Extension tool registry | 让 Pi Session 继续拥有并正确结算，在 Timeline/Context 等既有表面显示必要状态                   | 再建 Host prompt/retry/compaction engine          |
| 只读投影   | current/all tools、source、usage、cacheWrite、cost、package provenance | 投影当前 truth、来源和 unknown，供现有 Composer/Usage/Library 使用                             | 第二 registry、stats DB、cache service            |
| 语义映射   | `newSession`、fork、tree navigation、export、部分 Extension UI         | 只把能保持 Product Thread/Artifact provenance 的动作映射进现有 owner；不能映射就 fail honestly | 直接复刻 Pi TUI、返回 no-op success               |
| 明确不复刻 | 任意 terminal widget/footer/header、raw prompt/JSON、内部诊断布局      | 保留底层行为与技术诊断；真实产品任务出现时再增加有界 typed primitive                           | 通用 TUI renderer、技术仪表盘、任意内部配置编辑器 |

这张表也是停止条件：一个机制已经在第一类自动完整工作时，缺少单独 Settings 开关不构成产品缺陷；一个用户动作落入第三类却返回假成功，则即使 UI 很少也属于真实缺陷。

## 3. 已确认的 Project 语义

### 3.1 维护者最终裁决

**凡用户明确加入 OmniMind `Projects` 的 folder-backed Project，始终视为 trusted。**

具体后果：

- 本地文件夹添加、GitHub 导入、以后点击与 App 重开恢复都使用同一事实；
- 不建立独立 Project Trust 状态、`trust.json`、设置页、弹窗或“仅本次/永久”选择；
- Product 的 canonical Project membership 本身就是唯一 trust 事实；
- 添加入口只需非阻断地说明：
  - zh-CN：`项目中的 Agent 配置和扩展可能被加载并运行。请只添加你信任的项目。`
  - en：`Agent configuration and extensions in this project may be loaded and run. Add only projects you trust.`
- 不信任的目录不应加入 Project；可先在 Chat 中只读使用，或在容器/VM/其他真实隔离环境中运行；
- 这不是 sandbox，也不授予模型或 Tool 新的 OS 权限。

### 3.2 为什么不保留 Pi Trust UI

Pi 的 `ProjectTrustStore`、`defaultProjectTrust: ask|always|never` 与 session-only choice 对 CLI/TUI 是合理设计，但 OmniMind 已有一个更强且更容易理解的显式动作：把本地目录加入 folder-backed Product Project。

若同时保留 Project membership 和独立 trust decision，会产生两份长期事实：

- “这是我的 OmniMind Project”；
- “但它是否能加载自己的 Agent 资源仍由另一个 trust store 决定”。

维护者选择删除这层双轨。实现必须通过现有 Product cwd/Thread authority **显式**决定 Session trust，不能继续依赖 Pi SDK 当前默认 `projectTrusted=true` 的偶然行为：

- canonical folder-backed Product Project 因 membership 为 `projectTrusted:true`；
- Chat/Studio 的 product-managed cwd 不从 Project membership 获得 trust；产品自有 global/agent resources 继续走既有 `agentDir` owner，不能借 managed cwd 加载任意 project-local resources；
- 没有加入 Product Project 的任意 folder path 不应因被某个调用方传成 `cwd` 就获得 project-local execution；
- 被动 Settings/Library/model-service projection 始终保持 `projectTrusted:false` 与 zero-execute；
- 优先复用现有 Thread/Project/cwd 事实，不新增公共 `trusted` 字段。只有 exact 调用链证明现有 authority 无法区分上述来源时，才允许补最窄 typed input。

### 3.3 当前 exact SHA 的确定反例

Pi `createAgentSessionServices()` 在调用方未提供 `settingsManager` 时使用 `SettingsManager.create(cwd, agentDir)`；锁定 SDK 的 `SettingsManager` 默认 `projectTrusted=true`。`PiAdapter.createSdkRuntime()` 当前没有显式传入 Project membership 导出的 trust 事实，也没有传 `resourceLoaderReloadOptions.resolveProjectTrust`。

因此当前行为虽然表面上等同“自动 trusted”，却不是产品语义的显式接线，也没有证明：

- 只有 canonical folder-backed Project 才被信任；
- Chat/Studio、Settings projection、Extension discovery 不会误继承该能力；
- SDK 将来修改默认值后产品语义不会漂移；
- 中英添加项目说明已经准确呈现执行边界。

现有 Product turn-start 调用链会从 canonical Thread/Project投影workspace cwd，Home Chat也有“不把容器workspace root传给Provider”的反例，因此本文**不**把问题夸张成“任意renderer cwd已经可提权”。真正缺的是把这个已有Product authority变成Pi调用的显式、可测试语义，并保证其他skills/commands/discovery入口不绕过它。

当前任务若在最新 `main` 仍复现此差额，应在 existing Project/Thread/cwd → Provider Session owner 内最小闭合，不新增 trust store、permission broker 或第二 Project 身份。

## 4. System prompt 与动态工具

### 4.0 与 OmniMind Prompt 管理专项的关系

本节锁定 Pi 原生 Prompt rebuild、动态 Extension tools、activation/permission 与下一 turn mutation 的成熟 runtime 语义。它不回答 OmniMind 默认 Prompt 应使用什么身份、用户应在哪里管理追加指令、`AGENTS.md` 如何成为 Project rules、模板如何投影、reload/reopen 如何解释，或当前 localStorage `Project instructions` 是否是真实指令。

这些产品与当前 `main` 差额已经在 [`omnimind-prompt-management-review.md`](omnimind-prompt-management-review.md) 继续复核。后续实现必须同时满足两篇研究：保留本节的 native dynamic mechanism，同时按专项 review 消除 Pi 产品身份泄漏和第二 Prompt 事实源；不能用新的 Settings textarea 冻结或复制 Pi prompt builder。

### 4.1 Pi system prompt 重建是优点

锁定 Pi `AgentSession` 在 active tool set、Extension resources 或相关 Session 事实变化时重建 base system prompt，并把当前工具定义与资源事实交给模型。这个机制应该保留，因为它避免 Host 手工维护一份易漂移的工具/prompt 镜像。

正确分层是：

```text
Pi base system prompt
+ 当前 active tools / Pi resources / Extension contribution
+ OmniMind 稳定且真实的 Host policy append
+ 本轮必要、按需加载的 Skill / Prompt / task context
```

不应：

- 在 Host 复制 Pi prompt builder；
- 把 model catalog、package catalog、Wiki 全文或所有 tool schema 永久塞进 system prompt；
- 提供任意 raw system prompt 编辑器并让用户误以为能安全覆盖 runtime contract；
- 为了保持 cache hit 而冻结已经过期的工具或 capability truth。

### 4.2 动态 Extension tools 是优点

Pi Extension 可以注册工具、在 Session 中改变 active tool set，并由 `setActiveToolsByName()` 重建 system prompt。锁定 SDK 明确规定：变化在**下一次 agent turn**生效。

这不是需要移除的动态性，而是成熟的 Session 能力。OmniMind 应做到：

- 不拦截、不复制 Extension tool registry；
- 保留 tool source/provenance；
- 至少在技术详情或当前 Session 能力面准确查看 current active set 与 available set；
- 若以后增加人工开关，只把它描述为当前 Session 的 active set 控制，不宣传成安全 permission；
- 当前 operation 不热切。已经开始或正在执行的 tool call 不因列表改变而被伪装成取消；新的集合只决定下一 agent turn。

### 4.3 active tool 与 permission 的区别

形象例子：

```text
工具仓库里有：read、bash、browser、deploy_preview
当前 active set：read、bash
```

- `browser` 不 active：模型下一轮看不到/不能选择该工具；
- `bash` active：只表示模型可以请求调用它；不表示命令一定获准，也不表示获得了新的 OS 权限；
- Provider/Host 的 approval、运行模式、进程权限和 OS/container 才决定调用是否允许及能做什么；
- 已经在执行的 `bash` 不会因为用户随后取消 active 而自动中止；中止必须走当前 operation/Tool 的取消 owner。

因此：

```text
activation = 模型下一轮有哪些动作可选
permission = 某次动作是否获准、在什么边界执行
```

两者不能合并成一个 toggle。

### 4.4 “下一轮 exact tool set”的含义

例：第 1 轮只有 `read` 与 `bash`。Extension 根据项目类型发现 Playwright 后，把 `browser` 加入 active set。正在进行的第 1 轮不应被中途改写；第 2 轮开始时 Pi 重建 prompt，模型看到的 exact set 才是 `read + bash + browser`。

若第 2 轮开始前用户又关闭 `bash`，则第 2 轮应使用 `read + browser`。产品不能只展示安装列表或旧快照，必须区分：

- all configured tools；
- current active tools；
- 本次已接纳 operation 的 frozen/in-flight tool calls；
- 下一 turn 将采用的 active set。

### 4.5 Extension 再次改变 active set 时谁优先

Pi Session runtime 是唯一 active-set owner；同一 Session 中，最后一次成功 mutation 决定下一 turn。比如：

1. 用户在 Desktop 中暂时关闭 `deploy_preview`；
2. Extension 在 `before_agent_start` 中根据任务重新启用它；
3. 若 UI toggle 只属于 activation，它不能冒充 durable deny；runtime 的最后 mutation 会使下一 turn 再次看到该工具；
4. 若用户需要“绝不运行 deploy”，那是 permission/policy 问题，必须由对应 Engine/Host 的真实 deny owner实现，不能靠 active-set UI 假装。

所以人工 active-tool UI 若施工，必须显示它是 Session-scoped、可能被 Extension 更新的当前事实，并订阅 runtime truth；不能建立第二 active-tool store，也不能把 UI 意图永久压过 Extension。

## 5. Extension command 与 Session replacement

### 5.1 当前 false-success 反例

Pi Extension command context 支持 `newSession`、`fork`、`navigateTree` 与 `switchSession`。但锁定 `ExtensionRunner` 在没有绑定 `commandContextActions` 时，把这些动作默认实现为 `{ cancelled: false }` 的 no-op。

当前 `PiAdapter` 只执行：

```ts
runtime.session.bindExtensions({ uiContext: makePiExtensionUIContext(context) });
```

没有绑定 `commandContextActions`。因此某个 Extension command 可以收到“未取消”的返回结果，却没有发生 Session replacement。这是确定的产品真实性问题，不是“是否复刻 TUI”的偏好。

### 5.2 最小处置

先保证**不能伪成功**，再逐动作接入：

- Host 尚未拥有的 replacement action 必须明确 unavailable/failed；
- `newSession` 若映射，应遵守当前 Product Thread 与 native Session replacement owner；
- `fork` 只有在能够保持 Pi native branch/context 且建立准确 Product Thread provenance 时才接入；
- `navigateTree`/`switchSession` 不能直接把 Pi TUI tree 当成第二 Product navigation；必须定义它们对当前 Product Thread/Session 的真实影响；
- 不为这四个方法建设一套 Pi TUI renderer、第二 Thread store 或第二导航。

“先 fail honestly”是 P1 修正；“完整 map 每个 replacement action”应按现有 Product Session owner逐项施工和验证。

## 6. Session tree、fork、export 与恢复

Pi 的 branch/tree/fork/Session stats/export 是成熟能力，但它们分属不同产品层：

- native branch/context continuity 应优先复用；
- 用户可见 fork 最终必须成为 canonical Product Thread/Turn provenance，不能只藏在 Pi session file；
- `/tree` 的终端选择器不需要在 Desktop 原样复刻；Workbench 可在真实需求出现时提供更自然的分支/历史入口；
- export 是输出能力，若接入应进入既有 Artifact/Output owner，不建 Pi Export 页面；
- 在没有反例前，不因 UI 缺少 tree selector 就宣称 native fork 已丢失；先用 exact journey 检查 Product fork 是否保留 Pi compaction、custom entries、Extension state 与 native context。

研究 SHA 的 `PiAdapter` Product fork path 未明确提供 native `forkThread`，Product Reactor 可能落到 transcript bootstrap。后续任务只有在当前代码仍涉及该差额时，才建立一个能区分 native continuation 与 visible transcript bootstrap 的 falsifier，再决定是否补桥；不能从方法名推断一定丢失，也不能用可见文本相同冒充 native context 完整。

## 7. Retry、compaction、follow-up 与 Queue

### 7.1 Retry 与 compaction

Pi 已拥有 provider retry、auto-compaction、manual compaction、branch summary 与取消语义。OmniMind 的职责是：

- 保留 native retry/compaction，不建立第二 retry engine 或 context platform；
- Timeline 使用本地化的 typed status，而不是直接渲染 `Compacting context`、`Context compacted` 等 raw English title；
- Stop/abort 必须能终止当前 retry/provider I/O，并准确结算；
- context meter 可投影 auto-compaction truth，但不能把 estimate 写成 reported；
- 只有确有用户任务时，才在现有设置中渐进暴露 auto-compaction enable 或少量可靠参数，不先铺满 Pi TUI 数字面板。

当前 exact `PiAdapter.normalizeTokenUsage()` 没有把 Pi Session 的全部原生 usage/cost 事实投影出来，compaction Timeline title 仍是硬编码英文。这些是既有 owner 内的投影缺口，不需要新的 compaction 系统。

### 7.2 Follow-up 与 Product Queue

Pi steering/follow-up mode 描述 native Session 如何处理消息；OmniMind Queue 是用户可见、跨 Engine 稳定的 Product admission 事实。二者不能合并：

- QueueItem 在 admission 前冻结 exact Engine/model/options；
- native follow-up 只影响已经进入当前 Pi Session 的消息调度；
- 不把 Pi `followUpMode` 做成第二 Queue mode；
- 如果未来暴露设置，必须明确它只属于当前 Engine/native Session，并证明不会改变 Product Queue 的 once-only 与 recovery 语义。

## 8. Usage、cache 与 cost

Pi `getSessionStats()` 已给出 input、output、cacheRead、cacheWrite、cost 与 context usage。OmniMind 不应另建 Pi stats 页面或新的 usage database；应接入既有 Usage & limits owner，并保留来源强度：

```text
reported        Provider/runtime 直接报告
runtime-derived 由同一 native Session 的可验证字段计算
estimated       使用带版本的价格/估算规则
unknown         无可靠来源
```

当前 `PiAdapter.normalizeTokenUsage()` 只投影 input、output 与 cacheRead；`packages/contracts/src/server.ts` 的历史用量 provider union 仍只包含 Codex/Claude archive 路径。正确下一步不是把 Pi 塞进 archive parser，而是先把当前 live Pi Session 的 reported/runtime-derived usage 与 cost 投影进现有 Thread receipt/Usage surface，再单独裁决是否存在可授权读取的 Pi archive。

Cache 同样不是产品控制面：保持 native session identity、provider request 与 compaction cache 语义；Host 只显示真实 hit/write/cost 结果和 provenance，不建设统一 Cache Service。

## 9. Package、ResourceLoader 与 Project scope

### 9.1 已有正确边界

- 被动 Settings/Library 首屏只读已配置事实，不 resolve/load/execute Project Extension；
- 用户明确进入 Add/Manage/Install 等 intent 后，才使用 task-local Pi ResourceLoader/PackageManager；
- lifecycle 继续由 Pi owner 完成并立即退休 task-local runtime；
- public package identity 不携带 raw private path、userinfo、query credential 或 secret source；
- 不建立第二 Package Registry、cache、store、current/LKG 或 Marketplace。

### 9.2 仍需产品裁决的 project scope

当前 OmniMind ecosystem bridge 主要围绕 OmniMind Agent global/user scope；既然 folder-backed Product Project 一律 trusted，项目内 `.omnimind` resources 与 `.agents/skills` 应在该 Project 的真实 Session 中由同一 Pi loader自然生效。

是否需要 Library 中的 project-scoped 管理入口，应由真实用户任务决定：

- 可先只在当前 Project 上下文显示来源与状态；
- 需要 enable/reload/remove 时复用同一 Library detail，不新建 Project Package 页；
- 被动打开 Project/Library 不应为了展示而自动安装缺失 package；
- 任何 project resource action 只影响该 Project 的 Pi-owned配置和生命周期。

## 10. Extension UI 与 Desktop taste

Pi TUI Extension API 中 `select/confirm/input/notify/status` 等语义原语可映射到 OmniMind 已有 Dialog、Toast、Timeline 与 Workbench。`setWidget/setFooter/setHeader/custom editor` 等任意终端布局不应直接进入 Desktop renderer。

正确策略：

- 有真实 Extension 用户任务时增加一个有界、typed 的 Desktop primitive；
- 保留 Extension/Engine/Thread/Tool provenance；
- 原始 TUI layout、ANSI、任意 render callback 与长期组件实例不跨进程；
- Host 不可呈现时准确 unavailable，不 silent fallback 或假成功；
- 不建设通用 Extension widget runtime。

这是产品 taste，而不是削弱生态：保留行为语义，删除终端布局偶然性。

## 11. 与 Agent Core 的边界

本轮 Pi-native 产品整合不是 Agent Core 施工，也不应借机引入 Router、模型池、child role default、子 Agent 调度、统一 economics receipt 或新的 usage authority。

二者的正确关系只有单向消费：

- 本分支继续维护 exact provider/model/config/auth、native Session、tool 与 usage 的唯一读取/执行 seam；
- Agent Core 以后可消费这些事实，但不能复制 Provider Registry、model catalog、credential、discovery、usage 或 Project trust；
- 当前仓库没有能够表达 child-role default 的既有配置事实时，只报告 absence，不在 Model services/PiAdapter 中预埋 child policy；
- usage/cost 尚不能区分 reported/runtime-derived/estimated/unknown 时，先在现有 Product receipt owner补 provenance；不能让 Agent Core 用第二套计算补洞；
- Agent Core research、Host/Subagent UI/control 与本轮 Product/Pi 整合分别由各自 owner施工，不能因文件同时出现在共享工作树就混成同一个提交或完成声明。

因此，主会话可以把本文提供的 exact seam 与残余缺口交给后续 Agent Core 消费，但本分支不应实现 Agent Core 责任。

## 12. 研究快照内的历史分解

### 12.1 原关注点中已闭合、默认不重开

现有 source/evidence 对以下 Model services/Composer 结果已有独立 focused、packaged 或 fresh-judge 证据；没有 current counterexample 时不重做：

- OmniMind/stock Pi identity 与 `.omnimind`/`.pi` 隔离；
- Model services 的 overview/add/detail、首次 setup、runtime-catalog-only exact model selection；
- built-in/intent-scoped Extension model service projection与认证；
- 四种 generic custom API 协议、获取模型、手工模型、stored/env/command credential、test/save/reopen/edit/refresh/delete；
- safe advanced model cost、closed compat subset、write-only header reference 与 secret-blind projection；
- 模型服务图标、可信 family → service → neutral fallback；
- Package public identity、global lifecycle bridge与 Git writing/independent Engine settings 归位；
- Pi retry settlement、handled Extension command/input 与 no-double-start；
- 冷启动短暂 Model services 错误和首次 setup 的主路径。

这只表示原纵向关注点可以保持 CLEAN，不表示下面的新 Pi-native 产品目标已经完成。

### 12.2 当时识别的后续根项，不自动阻断其他关注点

以下只是研究 SHA 上可复核的历史候选。它们若与当前任务相关，必须先在最新 `main` 重新证伪；不能仅因出现在本文就重开已闭合结果或阻断其他关注点：

1. **Project membership trust 未显式接线**：当前 Product Thread 主路径看起来只把project-derived cwd交给adapter，因此现有用户行为可能恰好符合裁决；但PiAdapter仍依赖SDK default true，没有显式membership输入、添加披露和default变化反例。这是owner/长期语义问题，不应夸张成已证明的任意目录提权漏洞。
2. **Extension Session replacement false-success**：缺 `commandContextActions` 时 `newSession/fork/navigateTree/switchSession` 可返回未取消但什么也没发生。这是可直接复现的当前产品真实性P1。

在当时快照中，这两项意味着不能把候选扩张成“Pi 成熟机制已完整纳入”，但也不构成原关注点的无限阻断。今天是否处理，只看最新源码是否仍存在与当前范围相关的真实损失。

### 12.3 required reachability 缺口

1. current/all active tools 与 source provenance 没有 Desktop typed projection；动态机制本身仍在 Pi 内工作。
2. Pi live Session 的 cacheWrite、cost 与 provenance 尚未进入现有 Usage receipt/surface。
3. compaction Timeline 主文案仍有 raw English；native auto-compaction capability 与现有 `compactsAutomatically` contract的 exact接线需复核。
4. Project-scope resource/package 的上下文可见性与管理 journey 尚未形成产品证据。

这些应在 existing owner 内纵向闭合，不建立新 Registry、store 或 Settings taxonomy。

### 12.4 必须先证伪，不能直接判 bug

1. Product fork 是否因缺 native `forkThread` 丢失 Pi compaction/custom entries/Extension/native context；
2. Session tree/navigation 中哪些 action 应映射到 Product Thread，哪些只应 fail honestly；
3. active-tool 人工 selector 是否有真实用户任务，还是只需 runtime 自动机制 + 技术可见性；
4. project-scoped Package 管理除 provenance/reload 外是否需要更多 Desktop actions；
5. usage/cost 中哪些是 reported、runtime-derived、estimated 或 unknown。

### 12.5 明确不做

- 独立 Project Trust 功能或第二 trust store；
- Pi TUI 的 tree/fork/export 界面逐像素复刻；
- raw system prompt、raw tool schema、raw models.json 或任意 JSON dashboard；
- 通用 Extension widget renderer；
- 第二 Tool registry、permission broker、Package lifecycle、Usage store 或 Cache Service；
- 把 active tool toggle 宣传成安全 deny；
- 把 Pi follow-up mode升级为第二 Product Queue；
- 为“覆盖所有模型”维护静态 model slug/icon registry；
- 本轮执行 Apple signing/notary、Windows Trusted Signing 或 Windows/Linux 原生安装旅程。

## 13. 当时建议的验证次序（非当前施工顺序）

本文不拥有施工状态、准入或当前顺序。以下只解释当时为什么这样排列验证；当前任务只能复用仍相关的 falsifier，并须先重验 exact SHA、Pi revision 与 owner，不能机械执行旧研究结论或用它阻断维护者已确认的工作。

1. **先做 capability intake**：按 1.2 的生命周期路径建立 Pi baseline、Host bridge 与 Product outcome 差额；已自然保留的机制明确停止，不为全面而造 UI。
2. **再修 sole owner**：只把维护者已确认、且 current source 仍需要的裁决写入 Workbench/Product State/Execution；research 不直接拥有产品 contract。
3. **闭合确定反例**：优先处理仍可复现的 replacement 假成功与 Project Session trust 语义，不新增 trust store、Thread store 或通用 TUI bridge。
4. **证明并保留 system prompt / dynamic tools**：先建立差分反例证明 Host 没削弱 Pi；补 Session-scoped current/all/source 只读 truth，不复制 prompt builder 或 tool registry。
5. **复用现有 Usage/Timeline owner**：补 Pi live cacheWrite、cost、provenance与本地化 compaction truth，不建 Pi stats page、archive parser或第二 usage store。
6. **用 falsifier裁决 native fork/tree/package**：证明 Product 确实丢失 native context、resource provenance 或 lifecycle 才补窄桥；没有损失就停止。
7. **只复验受影响旅程**：focused → live → exact pushed packaged，范围由实际变更决定；外部签名和跨平台原生交付继续由工程团队承担。

## 14. 验收反例

### Project

- 添加包含 `.omnimind/extensions` 的 Project，风险说明可见，创建后的 OmniMind Agent Session加载一次对应资源；
- 重开 App/再次点击 Project 不需要第二 trust state，行为一致；
- 未加入 Projects 的外部目录不能仅因作为 `cwd` 被信任；Chat/Studio managed cwd不能加载任意外部Project资源；被动 Settings/Library始终不执行；
- SDK default 改为 false 的 fixture 下产品仍按 explicit Project membership工作，证明不依赖上游默认；
- 文案不宣传 sandbox或统一 permission。

### Dynamic tools

- Extension 注册工具后 all tools有 provenance，只有 active tools进入下一 turn；
- 当前 operation 中改变 active set不热切/不取消已接纳 Tool；
- 下一 turn的prompt/tool schema与runtime active set exact一致；
- UI关闭 activation后Extension可再次变更current set，界面同步真实结果而非坚持第二store；
- permission拒绝某次active tool调用时，产品显示真实拒绝，不把activation状态改成permission成功。

### Extension replacement

- 无 Host mapping 的 `ctx.newSession/fork/navigateTree/switchSession` 返回明确 unavailable，不能 `{cancelled:false}` no-op；
- 已映射 action产生准确 Product/native references；失败/取消不改变当前Thread binding；
- replacement后旧 Extension context失效，迟到调用不能修改新Session。

### Usage/compaction/fork

- reported cacheRead/cacheWrite/cost 不被估算值覆盖；未知保持unknown；
- compaction/retry主状态中英文且Stop能准确结算；
- fork exact journey区分native context continuity与visible transcript bootstrap；
- project package action只影响当前 Project，缺包fail closed，不在被动页安装或执行。

## 15. 反方压力测试

### Strategy：是不是把“Pi API parity”误当产品目标

风险是看见 Pi 有 tree、fork、active tools、widgets、follow-up、compaction settings，就把 Desktop 做成 Pi TUI 的设置镜像。这会背离 OmniMind 的核心：用户围绕 Project/Thread/Composer完成工作，而不是管理一个 runtime 控制台。

裁决：目标不是 API parity，而是**结果 parity**。自动机制必须继续生效；用户选择、失败恢复、安全与 provenance 必须可达；终端布局和内部调参没有真实任务时不进入一级产品面。

### Execution：最容易造成长期复杂度的地方

最危险的路径不是某个 UI 少一项，而是为 trust、tools、fork、packages 或 usage各建一套 Host 状态。这样短期看似“完整”，长期会与 Pi runtime分叉。

裁决：先关闭两个有确定反例的根——Project trust 显式接线和 replacement no-op假成功；其余按现有 owner纵向补 projection或mapping。一个 falsifier未证明现有owner不足前，不新增 store、registry、permission broker或通用Extension runtime。

### Adoption：怎样符合 OmniMind 的产品 taste

若用户一打开 Project/Composer 就看到 trust manager、tool矩阵、tree控制器、cache/usage仪表盘和package细节，能力虽多却更难使用。反过来，完全隐藏当前工具、compaction、费用来源与Extension失败，又会让产品失真。

裁决：默认层只展示当前任务需要的动作与状态；技术详情按需展开；高级能力放入现有 Composer、Timeline、Library、Usage、Thread/Artifact表面。首屏不展示 raw ID、raw prompt、raw schema、全量参数或TUI控件，但不可把失败、unknown或安全边界洗掉。

三项压力测试都支持同一最小方案：**Pi拥有成熟机制，OmniMind拥有产品语义；Host只接差异，不再造一个Pi。**

## 16. 决策账本

### 已确认

- 当时分支先做原 Model services + Composer completion review、必要补完、clean 与 merge；扩展 Pi-native 后续独立复核。该分支顺序现为历史事实，不约束当前施工。
- Project membership 本身表示 trusted；没有独立 Project Trust 功能或状态。
- Pi system prompt 重建与动态 Extension tools 是应保留的成熟机制。
- 当前 operation 不热切；active set变化作用于下一 agent turn。
- activation 与 permission 正交。
- Pi-first、单一 owner、能力完整与克制 Desktop UI同时成立。
- 原 Model services 已闭合结果不因本研究无证据重开。
- 外部签名与 Windows/Linux原生发行旅程移交工程交付。

### 待源码/真实 journey证明

- merged `main` 是否仍保留本文在 `29b306f16…` 观察到的所有差额；
- Product fork是否丢失Pi native context；
- 哪些Session replacement action值得完整Desktop mapping；
- active-tool人工控制是否有高价值真实任务；
- project-scoped Package UI的最小动作集合；
- Pi usage/cost各字段的provenance等级。

### 被否决

- 独立Trust store/UI；
- 第二Registry/Session/Package/Usage/permission/control plane；
- Pi TUI全量复刻；
- raw system prompt/JSON/compat dashboard；
- 用optional capability或Host缺桥把成熟Pi能力永久defer；
- 用“全部Pi细节”要求每个内部字段进入一级UI。

## 17. 复验触发器

以下变化只复验受影响部分：

- Pi revision、`SettingsManager` default、ResourceLoader trust API 或configDir变化；
- `AgentSession.bindExtensions()`、command context replacement、active tool或prompt rebuild contract变化；
- Product Project创建/恢复语义变化；
- ProviderSession/Product fork mapping变化；
- Usage receipt/provenance contract变化；
- PackageManager/ResourceLoader的scope、missing-package或execution policy变化。

未发生这些变化且没有新的falsifier时，不重复全量审计。
