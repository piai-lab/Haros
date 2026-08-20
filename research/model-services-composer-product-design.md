# Model services 与 Composer Engine/模型选择产品设计说明

Observed: 2026-08-12

Source snapshot: `a9adf9fb9a30f6b0a9fb43fc3349c8d2fdfd5a9d`

Status: local source observation + maintainer-confirmed product direction + implementation design reference；不是架构合同、全局施工顺序、Campaign 状态或完成证明

## 0. 阅读方式与权威边界

本文解释两个不可分割的问题：

1. OmniMind 应如何把内置 Pi ModelRuntime 的能力产品化为 **Model services / 模型服务** 设置中心，而不是继续使用含混的 `Models & writing / 模型与写作`；
2. Composer 应如何让用户选择 **Engine、模型和该 Engine/模型真实支持的选项**，既保留 Codex Fast、Pi Thinking、OpenCode Variant 等优秀能力，又不把界面做成一套虚假的“万能 AI 参数面板”。

两者共享 catalog 和 selection 结果，但不共享职责：Settings 配置 OmniMind Agent 能看见哪些真实模型服务，Composer 只选择下一次发送使用哪个 Engine/Model/options。

本文是产品设计与事实依据。它保存：

- 当前代码到底已经具备什么；
- 当前 Settings 为什么只露出了很小一部分底层能力；
- Proma 的模型配置体验哪些应借鉴、哪些实现绝不能复制；
- 页面为什么没有完整表达底层能力；
- 已确认的产品方向；
- 仍需实现或证伪的缺口；
- 最小、可维护的施工依据；
- 每个行为应由什么证据验收。

当时的实现分解与验证方法保存在 [`model-services-composer-new-session-execution-guide.md`](model-services-composer-new-session-execution-guide.md)。该文件现已退休为历史参考，不是新会话入口，不决定当前切片、准入、施工顺序或完成状态。

本文不拥有稳定产品事实。发生冲突时，按以下 sole owner 裁决：

- Composer、Chat、Workbench、可访问性、响应式和双语：[`../architecture/workbench.md`](../architecture/workbench.md)；
- Conversation、Thread、Entry、Run、Queue、draft、receipt、恢复和 Provider 切换事实：[`../architecture/product-state.md`](../architecture/product-state.md)；
- Product Orchestration、Provider Registry、adapter、Session 和执行拓扑：[`../architecture/execution.md`](../architecture/execution.md)；
- 当前目标、真实并发、依赖与阻塞：[`../execution-brief.md`](../execution-brief.md)；它不决定维护者授权或另设准入；
- 当前 claim 状态：[`../missions/independent-omnimind-v1.md`](../missions/independent-omnimind-v1.md)。

如果本文与上述 owner 冲突，不能凭本文“更详细”而选本文。应先修正 owner 或更新本文的过期观察。本文不得演变成第二份产品规范、第二份 Provider Registry 或第二份 Campaign。

### 0.1 当时的 Owner 与 candidate 快照

维护者已明确选择设置页名称 **`Model services / 模型服务`**，并要求它成为 OmniMind Agent 的模型服务配置中心。该 UI 裁决已写入 [`../architecture/workbench.md`](../architecture/workbench.md#6-settings)，runtime/Host/private-state authority 已写入 [`../architecture/execution.md`](../architecture/execution.md#omnimind-agent-model-services-authority)，不再与 sole owner 冲突。Owner 同时固定以下最小边界：

- 保留现有 Settings route、section id `models`、搜索、deep-link、group 与 keyboard behavior；
- 只重写这个 section 的产品职责和文案，不发起整个 Settings taxonomy 重构；
- `Agent engines` 继续是独立 Engine 的安装、认证和原生配置入口；
- `Model services` 主要配置 OmniMind Agent 的 Pi ModelRuntime；
- Git writing default 已退出 Model services，底层字段与兼容仍保留；E7 Exit 前必须迁入真实调用功能并恢复搜索/deep-link，或由维护者明确退休，不能把当前无入口状态永久化；
- “添加模型服务”以搜索/选择 Pi runtime 真实服务为主路径，以列表尾部弱一级的“通过 API 地址连接”为低频补充；后者在当时快照中已形成 E6 typed mutation 与 packaged-journey candidate，今天的完成状态只能由当前代码、现行 claim 与相称证据判断；
- 普通 UI、Composer、Engine menu、Model services、tooltip 与 aria-label 使用 `OmniMind`；`OmniMind Agent` 只作为技术实体全称进入 runtime、技术详情、诊断、About、Licenses 与来源语境。

在本文的旧快照中，cumulative candidate 已覆盖 Model services 职责收缩、built-in 搜索/详情、独立 Engine custom slug 归位、OAuth 与 custom API 主旅程、双实例消歧和正常产品语言；这些历史状态不能证明今天仍完成或仍缺失。新任务先读当前 owner、代码、claim 与 `execution-brief.md` 中的真实并发/阻塞，再决定是否需要复验；不得按本文旧 source snapshot 重复施工 E5/E6，也不得把旧 E7 缺口自动升级为当前任务。

## 1. 设计结论

### 1.1 最终产品心智模型

Composer 不应出现：

```text
上下文 -> Engine -> Model -> 推理策略 -> Engine 特有能力 -> 发送
```

这条链错误地暗示 OmniMind 拥有一层跨 Engine 的“推理策略”，然后再额外挂一层“特有能力”。真实结构是：

```text
Engine
  └─ Model
      └─ 这个 Engine + Model 实际暴露的选项
```

因此，Composer 的最小、正确结构是：

```text
上下文状态 | Engine | 当前模型及其可用选项 | 发送
```

视觉上应落成：

```text
┌────────────────────────────────────────────────────────────────────┐
│ 写消息…                                                            │
│                                                                    │
│ ＋   @                                           ◔ 42%  [◉] [GPT-5.6 Sol · Max · ⚡]  🎙  ↑ │
│                                                    │          │
│                                              Engine icon   Model + options
└────────────────────────────────────────────────────────────────────┘
```

- Context ring 只表示当前可观测的上下文占用；没有可靠数据时不伪造。
- Engine 是独立、紧凑的 icon-only 入口，但 tooltip、可访问名称和弹层内全名不可省略。
- Model 与当前可用选项继续共用一个入口；不拆成一排长期占宽的小按钮。
- Fast、Effort、Thinking、Variant、Agent、Mode、Context 等只在当前 Engine/Model 的 capability 数据支持时出现。
- 发送按钮作用于这次发送快照，不热切正在运行的 operation。

### 1.2 关键裁决

| 问题                                        | 裁决                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| 是否增加独立 Engine 入口                    | 是，位于 Context meter 右侧，默认只显示 icon/logo                            |
| Engine 名称是否永远隐藏                     | 否；tooltip、aria-label、菜单行和错误状态必须显示全名                        |
| Engine 与 Model 是否仍放在同一个深层菜单    | 否；Engine 独立选择，Model 菜单只处理当前 Engine                             |
| Model、Effort、Fast 是否全部拆成独立按钮    | 否；Model + 当前 Engine/Model 的可用选项保留在一个组合入口                   |
| 是否建立通用“推理策略”抽象                  | 否；只有 Provider-private capability 与 dispatch normalization               |
| 是否建立“Engine 特有能力”常驻区域           | 否；它会重复表达 capability，并制造空状态和响应式负担                        |
| Codex Fast 是否保留                         | 是；作为 Codex capability 保留，不伪装成所有 Engine 都有的通用能力           |
| 是否再加一个 Composer 常驻 Fast 按钮        | 否；当前已有成熟入口，再加会形成第三入口                                     |
| 切换 Engine 是否修改正在运行的 turn         | 否；只影响下一次发送                                                         |
| 是否跨 Engine 续接原生 Session              | 否；Conversation 连续，Provider Session 不连续                               |
| 切换失败是否自动回放到旧 Engine             | 否；恢复旧 binding，但不静默 fallback、不重放 prompt                         |
| 模型服务是否等于 Engine                     | 否；模型服务属于 OmniMind Agent/Pi 模型运行时的供应商配置，Engine 是执行后端 |
| 是否复制各模型供应商 API 和模型目录维护逻辑 | 否；OmniMind Agent 应复用、跟随 Pi 的 ModelRuntime 生态                      |
| 是否增加新的持久化 selection schema         | 暂不需要；现有 per-thread/per-provider draft 与 sticky state 足够            |

### 1.3 奥卡姆剃刀审计

**Outcome**：Composer 在所有 Thread 阶段维持同一结构；用户能一眼知道正在使用哪个 Engine，能在一个相邻入口里选当前 Engine 的模型和真实选项，发送时得到确定的 next-turn binding。

**Current truth**：模型发现、Engine 图标、per-Engine draft、Provider-private options、跨 Provider stop-first replacement 和失败恢复的多数基础能力已经存在；主要缺口是 UI 结构不一致和中途 Engine 切换被上层 guard 锁死。

**Smallest path**：重组现有 Engine menu、`ProviderIcon`、`ComposerModelEffortPicker`、`TraitsPicker` 和 draft action；解除与架构 owner 冲突的 cross-provider guard；复用现有 `ProviderService` replacement，不新增平行 runtime/control plane。

**Excess rejected**：通用推理策略、Engine 特有能力区、第三个 Fast 入口、新 Provider 配置体系、跨 Engine Session 迁移、静默 fallback、为 UI 新建持久化控制面。

**Decision**：对旧的多段控制方案是 `SIMPLIFY`；对本文的两入口组合方案是 `GO`，前提是先用自动化测试钉住 next-turn、Queue 和失败回滚语义。

## 2. 术语：必须先消除的混淆

### 2.1 Engine

面向用户的 **Engine / 引擎** 是“谁来执行这个 Agent turn”。当前 registry 的普通展示包含：

- OmniMind（内部 `omnimind`，技术实体全称为 OmniMind Agent）；
- Codex；
- Claude；
- Cursor；
- Antigravity；
- Grok；
- Droid；
- Kilo；
- OpenCode；
- Pi。

代码内部仍可使用 `ProviderKind`、Provider adapter、Provider Session 等技术术语，但产品界面不应把“Provider”作为用户主概念。`packages/contracts/src/orchestration.ts` 拥有当前 literal 集合，`packages/contracts/src/model.ts` 拥有展示名，`apps/web/src/components/ProviderIcon.tsx` 已拥有相应图标映射。

### 2.2 Model

Model 是某个 Engine 可选择的模型标识。它不是独立于 Engine 的全局对象：同样的模型名在不同 Engine 下可能有不同 wire 语义、鉴权、目录来源和可用选项。

因此模型选择必须始终携带：

```text
ModelSelection = Engine/Provider + model slug + provider-private options
```

不能只保存一个模型字符串，再猜测它属于哪个 Engine。

### 2.3 模型服务 / Model services

“模型服务”是模型/API 供应来源及其凭据、OAuth、endpoint、catalog 和自定义 Provider 配置。它主要服务于内置 OmniMind Agent 的 Pi ModelRuntime。

示意：

```text
OmniMind Agent (Engine)
  └─ Pi ModelRuntime
      ├─ Anthropic (model service/provider)
      ├─ OpenAI-compatible service
      ├─ DeepSeek
      ├─ MiMo
      ├─ custom provider instance
      └─ models discovered from those services
```

Codex、Claude、OpenCode 等独立 Engine 仍拥有自己的原生登录、配置、模型目录和 Session 语义。Composer 选择 Engine 时，绝不能把这些独立 Engine 的模型供应商扁平化进 OmniMind Agent 的 Model services。

### 2.4 Engine-private options

这些选项可能都与“思考”有关，但并不构成一个统一业务对象：

- Codex：`reasoningEffort`、`fastMode`；
- Claude：`thinking`、`effort`、`fastMode`、`autoCompactWindow`；
- Cursor：`reasoningEffort`、`fastMode`、`thinking`、`contextWindow`；
- Antigravity / Grok / Droid：`reasoningEffort`；
- Kilo / OpenCode：`variant`、`agent`；
- Pi / OmniMind Agent：`thinkingLevel`。

OmniMind 可以把这些值规范化为各 adapter 所需的 dispatch payload，但不能因此宣称它们语义等价。公共 UI 的一致性来自布局和交互模式，不来自伪造一个统一参数模型。

## 3. 已确认的产品目标

### 3.1 用户要解决的不是“多一个下拉框”

用户的真实任务是：

1. 在发消息前快速确认当前执行 Engine；
2. 一次点击切换 Engine；
3. 切换后立即得到可用的默认/记忆模型，不被迫完成第二个阻塞步骤；
4. 在相邻入口中调整该模型真实支持的思考强度、Fast、Variant 等；
5. 不因第一轮发出后页面结构突然改变；
6. 不因 OmniMind 做了多 Engine 就损失 Codex、Claude、Pi、OpenCode 的原生优势；
7. 不需要理解 Provider、adapter、Session replacement、catalog source 等内部概念。

### 3.2 体验原则

- **短路径**：常用行为最多两次点击；Engine 一次，模型/选项一次。
- **能力诚实**：没有 capability 就不显示；不可用就解释，不伪造 disabled parity。
- **结构稳定**：空 Thread、已开始 Thread、运行中和窄宽度下，控件的语义位置不跳变。
- **记忆而不猜测**：优先恢复用户对该 Engine 的最后有效选择；只有无历史时才用可靠默认。
- **先选择、后承诺**：浏览菜单不触发敏感目录扫描；发送才形成执行承诺。
- **失败可恢复**：draft、附件和 Queue 不因 Engine 启动失败丢失；旧 binding 能恢复。
- **来源归属清楚**：Timeline 每一 turn 保留 Engine/Model provenance；Conversation 连续不等于 Session 续接。

## 4. 当前代码事实

以下均为 source snapshot 上的 local observation，不是“目标已经交付”的声明。

### 4.1 Engine registry 与图标已经存在

- `packages/contracts/src/orchestration.ts` 定义十种 `ProviderKind`。
- `packages/contracts/src/model.ts` 定义 `PROVIDER_DISPLAY_NAMES`。
- `apps/web/src/components/ProviderIcon.tsx` 已映射各 Engine logo。

结论：新 UI 不应创建第二套 Engine 枚举、名字表或 logo registry。

### 4.2 统一模型发现 Hook 已经存在

`apps/web/src/hooks/useProviderModelCatalog.ts` 已为 Composer 汇聚：

- 每个 Engine 的模型选项；
- discovery loading；
- runtime descriptor；
- effort、fast、thinking、context 等 capability；
- Kilo/OpenCode agent/mode 等目录；
- selected Engine 与预取 Engine 的按需发现。

它能发现 OmniMind Agent、Codex、Claude、Cursor、Antigravity、Grok、Droid、Kilo、OpenCode 和 Pi 的真实目录。但当前公开返回值并不暴露 query error、auth status 或 catalog provenance 状态；它返回的是 options、loading 与 runtime descriptors。因此 Model services 需要复用同一 query key/catalog owner，却不能把这个 Composer projection 当成完整设置页状态 API。

还有一个必须守住的边界：runtime-catalog-only Engine 的空 runtime 结果不能回退到 Host 静态/default/custom 候选。否则没有 credential 的历史 slug 仍可能出现在 picker，看起来像可用模型，而 Pi `listModels()` 实际只返回 authenticated `getAvailable()`。目标行为必须区分：

```text
static/model hint = 可识别候选
runtime available descriptor = 当前可发送证据
```

动态空态、错误态、last-good 与 cold start 不得都折成同一静态列表。Composer 可以在恢复既有 selection 时显示 unavailable hint，但 send gate 必须要求真实 available descriptor/经 adapter 验证的 selection；Model services 则直接使用 known/available/auth 的服务级 projection。

Pi 发现有一个重要隐私边界：打开整个 Engine 菜单不等于同意读取 `.pi`。只有用户主动选择或浏览 Pi 时才应触发 Pi intent-gated discovery。拆出 Engine 入口时必须保留这一点。

### 4.3 Composer 已有组合选择器

`apps/web/src/components/chat/ComposerModelEffortPicker.tsx` 的当前职责已经接近正确答案：

- trigger 显示 Provider icon；
- 显示模型名；
- 显示当前 trait summary；
- Fast 激活时显示标记；
- popup 内组合 traits 与 model submenu。

正确改法不是废掉它并重做三个控件，而是：

1. 把 Engine 选择从它/`ProviderModelPicker` 中独立出来；
2. 让组合选择器只负责当前 Engine 的 Model + options；
3. 保持现有菜单、焦点、搜索和响应式 primitives。

### 4.4 当前首轮与后续轮的结构不一致

`apps/web/src/components/ChatView.tsx` 当前以：

```text
isLocalDraftThread && !hasThreadStarted
```

决定是否使用 split controls：

- 空的本地 draft：`ProviderModelPicker` + `TraitsPicker`；
- 已开始 Thread 或其他状态：`ComposerModelEffortPicker`。

这会导致第一条消息发送后 Footer 的信息架构改变。用户需要重新学习控件，也使中途 Engine 切换看似不是产品能力。

目标应是所有正常 Chat 状态都使用同一结构：

```text
EnginePicker + ComposerModelOptionsPicker
```

仅 loading、无可用 Engine、只读/不可发送等状态按真实 capability 退化。

### 4.5 Context meter 的位置与响应式逻辑已经存在

`ChatView.tsx` 把 Context meter 放在 Composer 右侧 action cluster、picker 之前。`apps/web/src/components/composerFooterLayout.ts` 使用实际测量结果按顺序降级：

1. 隐藏 Context meter；
2. 隐藏 trait label，但保留入口；
3. 隐藏 model name，只保留 Provider icon；
4. relocation leading controls。

新增 Engine icon 后必须把它纳入同一测量模型，不能另写 viewport breakpoint 猜宽度，也不能一溢出就把整个入口藏掉。

建议新的优先级是：

1. Context meter 可先隐藏；
2. Model options trigger 先隐藏 trait summary；
3. 再缩短/隐藏 model name；
4. Engine icon 始终保留，因为它是执行身份；
5. mic 等次要入口按现有 footer plan 决定 relocation；
6. send/stop 永远保留。

### 4.6 traits 已经是 capability-driven

`apps/web/src/components/chat/composerTraits.ts` 和 `TraitsPicker.tsx` 已完成大部分正确抽象：

- 从 runtime descriptor 生成可见 controls；
- `thinkingLevel`、`effort`、`reasoningEffort`、`variant` 分别 dispatch；
- Fast 是 boolean capability；
- Thinking、Context/Auto-compact、Agent/Mode 条件显示；
- per-Provider sticky options 经 `commitTrait` 保存；
- unsupported option 在模型变化时按现有 reconciliation 规则清理。

这说明“Engine 私有能力”不需要一个新 panel；能力已经有 owner，只需在组合 picker 中正确呈现。

### 4.7 Fast 当前已经重复

当前至少有两个入口：

- `TraitsPicker.tsx`：Effort header 中的紧凑 Fast toggle；
- `ComposerExtrasMenu.tsx`：`+` 菜单中的 Fast。

若再在 Footer 常驻一个闪电按钮，将形成第三个入口。目标应是保留 traits popup 中最贴近模型语义的入口，并评估移除 `+ > Fast`。不应新增第三入口。

### 4.8 per-Engine draft 与 sticky state 已经存在

`apps/web/src/composerDraftDomain.ts` 和相关 store/action 已保存：

- `activeProvider`；
- `modelSelectionByProvider`；
- `stickyActiveProvider`；
- `stickyModelSelectionByProvider`。

已有测试证明：

- 切到另一个 Engine 后再切回，会恢复该 Engine 的模型/选项；
- Codex effort 不会错误传给 Cursor；
- 第一次切换到没有历史的 Engine，会使用目标 Engine 默认值。

因此，不应再增加 `pendingEngine`、`enginePreferencesV2` 或另一个持久化表。若现有字段不能满足某个边界，先给出最小反例，再决定是否扩 schema。

### 4.9 当前模型解析有一个危险 fallback

`apps/web/src/composerDraftModels.ts` 的解析顺序大体已经覆盖 active draft、Thread、Project、当前 Engine 可用目录和静态默认，但最后仍存在：

```text
getDefaultModel("codex")
```

作为跨 Provider 兜底。

这会在目标 Engine 没有有效模型时，把 Codex 模型字符串投影到其他 Engine，破坏 Engine/Model 绑定。实现独立 Engine picker 前必须删除这种跨 Engine 猜测。

正确失败状态是：

```text
当前 Engine 没有可发送模型
```

然后提供刷新、登录或前往 Model services/对应 Engine 设置的动作；绝不能偷偷塞一个其他 Engine 的默认模型。

### 4.10 Pi/OmniMind Agent 的底层模型能力确实来自 Pi

当前锁定版本是：

- `@earendil-works/pi-coding-agent@0.84.1`；
- `@earendil-works/pi-agent-core@0.84.1`；
- `@earendil-works/pi-ai@0.84.1`。

`apps/server/src/provider/Layers/PiAdapter.ts` 使用 `ModelRuntime.create()`，为每个明确的 Agent directory 配置 `auth.json` 和 `models.json`，再通过 `ModelRegistry` 暴露模型目录。`listModels` 会加载 Pi SDK、project extensions 和 registry，而不是由 OmniMind 维护一张静态供应商镜像。

锁定包的 `ModelRuntime` 类型声明实际提供：

- `getProviders()` / `getProvider()`；
- `getModels()` / `getModel()`；
- `checkAuth()` / `getProviderAuthStatus()`；
- `hasConfiguredAuth()`；
- `setRuntimeApiKey()` / `removeRuntimeApiKey()`，但它们只管理当前 ModelRuntime 的临时 override，明确不落盘；
- `login(providerId, "api_key" | "oauth", interaction)` / `logout()`，由 Pi credential store 持久化到 `auth.json`；
- `refresh()`；
- `registerNativeProvider()` / `registerProvider()` / `unregisterProvider()`；
- credential metadata listing；
- file-backed auth 与 models store；
- 可选的 network catalog refresh。

这证明底层“冰山”比当前 Settings 页面强。但必须区分：

```text
Pi SDK 能力存在 ≠ OmniMind 已有完整 Model services 产品界面
```

当前 `apps/web/src/components/settings/ModelsSettingsPanel.tsx` 仍主要负责 Git writing model 和除 Droid 外各 Engine 的自定义 slug；只有 Git writing 的动态发现预取集中在 Codex/Kilo/OpenCode。未来 Model services 应接 Pi ModelRuntime/Host 暴露的真实能力，不应复制 Proma 或每个供应商的请求实现。

### 4.11 当前中途 Engine 切换被 UI/command guard 锁死

当前代码存在与架构 owner 冲突的实现：

- `ChatView.tsx` 在 Thread 有 message/session 后计算 `lockedProvider`；
- `onProviderModelSelect` 拒绝选择不同 Provider；
- `ProviderModelPicker` 的 browser test 明确断言 started Thread 只显示当前 Provider 模型；
- `ProviderCommandReactor.ts` 在 requested selection 的 Provider 不同于 Thread Provider 时拒绝执行。

但更底层的 `ProviderService.ts` 已经具备跨 Provider replacement：

1. 停止旧 binding；
2. 尝试启动目标 binding；
3. 若失败，恢复旧 generation、session、model、options 和 resume cursor。

所以问题不是“系统完全不会切 Engine”，而是上层 guard 阻断了已存在的 replacement path。

### 4.12 dispatch 链已经携带 ModelSelection

当前主链是：

```text
Composer draft
  -> thread.meta.update / thread.turn.start(modelSelection)
  -> ProviderCommandReactor.ensureSessionForThread(...modelSelection)
  -> ProviderService start/replace session
  -> adapter-specific model/options normalization
  -> native Engine turn
```

`ChatView.tsx` 在 `thread.turn.start` 中发送 `selectedModelSelectionForSend`。Reactor 也缓存每个 Thread 的 session model selection。

结论：不需要为 Engine picker 新建 `engine.switch` RPC 或第二套控制面。应修复现有 `ModelSelection` 链，让它真正允许不同 Provider 的 next-turn selection。

### 4.13 当前 `thread.meta-updated` 可能过早触发 runtime ensure

当前 Reactor 在 metadata 变化时：

- 没有 active session 或已停止时缓存；
- active turn 时推迟 ensure；
- idle session 时可能立即 `ensureSessionForThread`。

这需要在实现前做一次明确裁决。本文建议：

- UI 选择立即写入 Composer/Thread 的“下一次发送选择”；
- 单纯浏览或选择不应创建新 Session、停止旧 Session 或触发鉴权副作用；
- `thread.turn.start` 是真正 commit replacement 的边界；
- 同 Engine 的 idle model switch 若保留 eager apply，也必须证明它不会改变已记录 turn，且失败时 UI 与 runtime 不分叉。

这是比“点击 Engine 就马上重启后台”更简单、更符合“只影响下一次发送”的路径。若维护者选择保留 idle eager ensure，必须补足 selection projection rollback 和清晰的 loading/error UX，不能让 Footer 显示目标 Engine、runtime 却悄悄恢复旧 Engine。

## 5. 目标交互设计

### 5.1 默认 Footer

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Ask anything, @ mention context, or drop files…                         │
│                                                                         │
│  ＋   @                                     ◔ 42%  [Codex logo] [GPT-5.6 Sol · Max · ⚡⌄]  🎙  ↑ │
└─────────────────────────────────────────────────────────────────────────┘
                                               │              │
                                               │              └─ Model + current options
                                               └─ Engine
```

状态含义：

- `[Codex logo]`：点击打开 Engine menu；
- `[GPT-5.6 Sol · Max · ⚡]`：点击打开当前 Codex 的模型与 options；
- trigger summary 只显示非默认或最有辨识度的值，避免堆成参数日志；
- `⌄` 可在 hover/focus 或有空间时显示，不应比模型名更抢眼。

### 5.2 Engine menu

```text
┌──────────────────────────────────┐
│ Engines                          │
│                                  │
│ ✓  ◉  OmniMind                   │
│    ◌  Codex                      │
│    ◇  Claude                     │
│    ◫  Cursor                     │
│    ✦  OpenCode                   │
│    π  Pi                         │
│    …  Other installed engines    │
│                                  │
│ ──────────────────────────────── │
│ Manage engines / 管理引擎        │
└──────────────────────────────────┘
```

菜单规则：

- trigger 只显示 logo，菜单行必须显示 logo + 全名；
- 当前项有 check，不只依赖颜色；
- unavailable、not installed、needs auth、checking 必须使用真实 status；
- 对无法在 Composer 内修复的状态，提供一个明确动作，不提供多个相互竞争的设置入口；
- 打开菜单只读取非敏感 registry/status，不主动扫描 Pi private home；
- 选择 Pi 后才触发 Pi 的 intent-gated catalog discovery；
- 不在 Engine menu 内再嵌套模型树，否则重新制造深层导航。

### 5.3 Model + options menu：Codex 示例

```text
┌──────────────────────────────────────┐
│ GPT-5.6 Sol                          │
│                                      │
│ 思考强度 / Effort               ⚡ Fast│
│   Low                                │
│   Medium                             │
│   High                               │
│   Extra High                         │
│ ✓ Max                                │
│   Ultra                              │
│                                      │
│ ──────────────────────────────────── │
│ 模型 / Model                         │
│   GPT-5.6 Sol                     ✓  │
│   GPT-5.6 Terra                      │
│   GPT-5.6 Luna                       │
│   …                                  │
└──────────────────────────────────────┘
```

这保留截图中优秀的相邻操作：用户打开一次 popup，就能调整 effort、Fast 或进入模型列表。Fast 是 Effort header 的紧凑 toggle，不再成为 Composer 第三个常驻按钮。

### 5.4 Pi / OmniMind Agent 示例

```text
┌──────────────────────────────────────┐
│ anthropic/claude-opus-4-8            │
│                                      │
│ 思考强度 / Thinking level            │
│   Off                                │
│   Minimal                            │
│   Low                                │
│ ✓ Medium                             │
│   High                               │
│   Extra High   (only if supported)   │
│   Max          (only if supported)   │
│                                      │
│ ──────────────────────────────────── │
│ 模型 / Model                         │
│   Anthropic                          │
│     Claude Opus 4.8               ✓  │
│     Claude Fable 5                   │
│   DeepSeek                           │
│     …                                │
│                                      │
│ Refresh models                       │
│ Model services…                      │
└──────────────────────────────────────┘
```

Pi/OmniMind Agent 的模型应按上游 provider/model service 分组，因为这一层有真实 provenance。分组只用于可读性，不把 model service 提升成 Engine。

### 5.5 OpenCode / Kilo 示例

```text
┌──────────────────────────────────────┐
│ openai/gpt-5                         │
│                                      │
│ Variant                              │
│ ✓ Default                            │
│   High                               │
│                                      │
│ Agent                                │
│ ✓ Build                              │
│   Plan                               │
│                                      │
│ Model                                │
│   …                                  │
└──────────────────────────────────────┘
```

不能把 `Variant` 翻译成 Effort，也不能把 Agent/Mode 塞进“更多能力”。它们就是该 Engine 的一等模型选项。

### 5.6 无 options 的模型

如果当前 Engine/Model 只有模型可选：

```text
[Engine icon] [Model name⌄]
```

popup 直接展示模型列表，不渲染空的 Effort、Advanced 或 Engine-specific section。

### 5.7 没有可用模型

```text
[Engine icon] [No model configured⌄] [Send disabled]
```

popup：

```text
No available models
Sign in, add an API key, or refresh this engine's catalog.

[Refresh]  [Open Model services / Open engine settings]
```

动作取决于 Engine：

- OmniMind 的 model-service 问题进入 Model services；
- Codex/Claude/OpenCode 原生 Engine 问题进入该 Engine 的设置/登录；
- 不把所有问题都导向同一供应商表单；
- 不自动换到另一个 Engine；
- 不用 Codex 默认模型字符串填补空缺。

## 6. 默认模型与记忆规则

选择 Engine 后必须立即得到确定状态。建议复用并收紧现有 resolver，按以下优先级解析目标 Engine：

1. 当前 Thread draft 中该 Engine 的有效 selection；
2. 当前 Thread 已持久化且 Provider 匹配的 selection；
3. 当前 Project 默认且 Provider 匹配的 selection；
4. 已保存的该 Engine sticky selection；
5. 该 Engine 声明的默认模型，前提是当前目录仍可选择；
6. 当前 live catalog 的第一个可用模型，前提是目录顺序由 Engine/上游明确拥有；
7. 没有可靠候选时进入“无可用模型”，发送 disabled。

规则：

- 任何候选都必须经过目标 Engine 当前 catalog 和 capability validation；
- 不能用另一个 Engine 的模型作为最后 fallback；
- Pi 没有静态默认时，优先使用其 live registry 的有效/可用模型；
- catalog 尚在加载时显示 checking skeleton，不短暂闪出错误 Engine 的默认模型；
- sticky selection 失效时可降级到目标 Engine 默认，但应在 UI 中反映真实结果；
- options 只与同一 Provider/Model 一起恢复；unsupported option 必须清理。

“选择 Engine 自动选择默认模型”的用户承诺，应解释为“自动恢复该 Engine 的最佳有效 selection”，而不是每次强制覆盖用户上一次选择。

## 7. Engine 切换状态机

### 7.1 核心状态

```text
composer desired binding
  = selected Engine + selected Model + provider-private options

active runtime binding
  = 当前正在运行或可继续的 Provider Session
```

两者在用户为“下一次发送”改选时可以暂时不同。UI 必须明确哪个是下一次发送选择，不能拿 active runtime provider 覆盖 draft selection。

### 7.2 空 Thread

```text
Select Engine
  -> restore/default target model
  -> update Composer draft
  -> do not create Session
  -> Send commits target binding
```

### 7.3 已开始但当前 idle

推荐最小语义：

```text
Select new Engine
  -> update next-turn draft selection
  -> keep old Session untouched until Send
  -> Send: stop old binding -> start target -> dispatch turn
```

这样选择菜单本身没有高成本/鉴权副作用，也不会在用户只是比较模型时销毁可恢复 Session。

### 7.4 当前 turn 正在运行

```text
Current turn: Codex / GPT-X (continues unchanged)
Composer selection: Claude / Sonnet (next send)
```

- 不热切当前 operation；
- stop/cancel 仍作用于当前 operation；
- Timeline 的当前 turn provenance 仍是 Codex；
- 新 selection 只作用于下一次被 admission 的 Entry；
- 若 UI 需要提示，只用紧凑的“下一条消息”说明，不增加新的模式条。

### 7.5 Queue

Queue 是最容易被遗漏的边界。实施必须明确并测试：

- 已 admission 的 Queue item 应保留其入队时的 Engine/Model/options 快照；
- 改 Composer selection 不能悄悄改写已经排队的 item；
- 尚未 admission 的 draft/附件继续跟随当前 Composer selection；
- 若产品 owner 当前定义 Queue 在 dispatch 时才绑定，则必须在 owner 中明确，不能由 UI 猜测；
- Engine replacement 不得绕过 Queue order 或 receipt。

### 7.6 target start 成功

```text
turn.start(target selection)
  -> validate target adapter/catalog/options
  -> stop old binding
  -> start target binding
  -> bind exact target generation/session
  -> dispatch once
  -> append turn provenance
```

禁止：先把同一 prompt 发给旧 Engine，再尝试新 Engine；也禁止 start target 后因迟到事件把旧 Session 重新认成 active。

### 7.7 target start 失败

```text
stop old binding
  -> target start fails
  -> restore exact old binding
  -> do not dispatch prompt to old binding
  -> preserve draft/attachments/unadmitted Queue
  -> surface target-specific error and recovery action
```

必须证明恢复的是：

- Provider/Engine；
- model；
- provider-private options；
- generation；
- Session/native handle；
- resume cursor（若 adapter 支持）；
- pending operation ownership。

还必须裁决并测试 Footer projection：失败后是回滚到旧 selection，还是继续显示未生效的 target selection。本文推荐回滚已 commit 的 selection 到旧 binding，并保留用户 prompt 供修改/重试；否则 UI 会展示一个实际未绑定的 Engine。无论选择哪条，不能出现 runtime 已回滚、UI 却无错误地显示 target 的分叉状态。

### 7.8 无跨 Engine resume、无静默 fallback

Conversation 可以包含：

```text
Turn 1  Codex / GPT-X
Turn 2  Claude / Sonnet
Turn 3  OmniMind / DeepSeek
```

但每个 Engine 的原生 Session 都是自己的。切换不意味着把 Codex native session cursor 交给 Claude，也不意味着把失败 prompt 自动发给旧 Engine。连续性来自 OmniMind Conversation/Timeline，不来自伪造的跨 Engine Session。

## 8. Model 与 options 的变更规则

### 8.1 同 Engine、同 Model

只修改 options：

- 立即更新 Composer draft；
- 下一次发送携带新 options；
- 当前 operation 不变；
- 若 adapter 支持 in-session option/model update，可在 next-turn ensure 时使用；
- 不支持时按 adapter capability restart session。

### 8.2 同 Engine、换 Model

现有 adapter capability 已区分 `in-session` 与 `restart-session`。UI 不需要暴露这个内部差异，但必须保证：

- 选择结果在 send 前可见；
- unsupported options 被清理；
- restart 不丢 draft/Queue；
- Timeline 记录实际 model provenance；
- 失败不伪装成成功切换。

### 8.3 跨 Engine

跨 Engine 必须走 replacement，不走 same-session model switch。`provider` 不同就是执行边界不同，不能因为 model slug 相似而省略 adapter replacement。

### 8.4 summary 文案

trigger 应按 capability 生成最小摘要，例如：

- `GPT-5.6 Sol · Max · ⚡`；
- `Claude Opus 4.8 · High`；
- `DeepSeek V4 Pro · Thinking`；
- `GPT-5 · Build`。

默认值可省略，异常/显式值优先显示。不要显示：

```text
reasoningEffort=max, fastMode=true, thinking=false
```

也不要把所有值都翻译成“推理策略”。

## 9. Model services 与独立 Engine 的关系

### 9.1 一个设置中心，不等于一个 runtime

OmniMind 可以在 Settings 中提供统一的发现入口和一致的卡片/状态语言，但底层 authority 仍分开：

```text
Settings
  ├─ Model services
  │    └─ OmniMind
  │         └─ Pi ModelRuntime owns provider/auth/catalog/custom registration
  └─ Agent engines
       ├─ Codex native setup/status
       ├─ Claude native setup/status
       ├─ OpenCode native setup/status
       └─ stock Pi / other Engine-native setup
```

统一的是用户找到配置的入口、状态呈现和返回 Composer 的路径，不是把所有 Engine credential 搬进 Pi `auth.json`。

### 9.2 跟随 Pi 的含义

OmniMind Agent 的模型服务能力应遵循：

- Pi 上游支持的 provider/auth/catalog/custom-provider 语义，OmniMind 原则上跟随；
- 调用锁定 Pi package 暴露的 API，而不是复制供应商请求；
- 上游升级时以 package source、类型、fixture 和 live probe 复验；
- OmniMind 只补产品化：信息架构、引导、错误、双语、可访问性、实例管理和安全边界；
- 不维护一张声称比上游更全的静态模型能力镜像；
- 不因某个兼容 endpoint 的偶然行为写通用补偿。

“只能比 Pi 更好”在这里指：更容易理解、更容易配置、更稳定恢复、更适合多 Engine 工作流；不等于重新实现 Pi 已拥有的模型体系。

### 9.3 多个模型服务实例

同一上游供应商允许多个服务实例时，identity 不能只用 provider name。未来 Model services owner 至少需要区分：

```text
service instance id
provider kind
display name
auth/config source
base URL / protocol identity（不在日志和 UI 泄露秘密）
catalog provenance
availability/auth state
default、priority 或 enabled（只有 Pi 上游/owner 真有此语义时）
```

Composer 仍选择由 ModelRuntime 暴露的模型 identity，不直接编辑 endpoint。多实例的消歧应由 catalog descriptor/Model services 提供稳定、非敏感的展示名，不能让 Composer 猜测。

Pi 0.84.1 的 provider identity 是字符串，`models.json.providers` 也是按 provider id 索引。因此同一商业供应商的多个实例应映射为不同、稳定的 Pi provider id，例如内置 `deepseek` 与用户命名的 `deepseek-proxy`，而不是在 OmniMind 另建一套 Channel runtime。`ModelRuntime.registerProvider()` 只修改当前 runtime；持久化仍要写 Pi `models.json` 所理解的 provider config，并让后续 runtime 重新加载。

Pi 当前没有通用的 provider `enabled` 开关。不能因为 Proma Channel 有开关就在 OmniMind 复制一个。未配置 auth、移除 credential、删除 custom provider 或上游 capability 才能决定可用性；若未来 Pi 原生增加 enable/disable，再直接跟随。

## 10. Model services Settings 完整产品设计

### 10.1 上一版交接缺失了什么

上一版本文对 Model services 只覆盖了概念边界和 Pi API 事实，没有覆盖下面这些产品/执行内容：

- Settings section 的正式命名、描述与原有 `Models & writing` 如何收口；
- Model service 列表页、添加页、详情页的完整信息架构；
- 同一供应商多个实例的 identity、显示和删除影响；
- API Key、OAuth、ambient auth、custom endpoint 的差异化流程；
- “从供应商获取”如何映射到 Pi `refresh()`，以及 loading、last-good、错误和取消；
- Proma 哪些体验应借鉴、哪些静态 provider 请求实现绝不能复制；
- 当前 Host 只有 `provider.listModels`，为什么页面不能只靠前端完成；
- Model services、Agent engines、Composer 三者如何路由而不重复配置；
- credential、`.omnimind` / `.pi` 隔离、active Session 和 catalog invalidation；
- Settings 的测试、live provider 与 packaged journey。

因此，本节保存当时需要核对的安全语义；当前任务仍须以现行 owner 和代码复验相关部分。

### 10.2 页面名称与定位

正式名称：

```text
简体中文：模型服务
English: Model services
```

建议页面描述：

```text
简体中文：配置 OmniMind 使用的模型服务、凭据与可用模型。
English: Configure the model services, credentials, and models used by OmniMind.
```

这比“模型与写作”准确，因为页面主任务是让 OmniMind Agent 获得可用模型，不是管理调用方的功能默认值。Git writing model 属于 Git text generation 的功能设置，不属于服务连接/catalog 控制面。

保持：

- route 仍是现有 Settings route；
- query/deep-link section id 仍为 `models`；
- 仍处于现有 Coding group；
- Settings search 仍能搜索旧的“模型”“写作”“自定义模型”相关词，并把用户带到新位置；
- 不创建新的顶级 `AI`、`Providers` 或 `Models` taxonomy。

### 10.3 与 Agent engines 的边界

两个 Settings section 不合并：

| 页面           | 面向用户的问题                                               | 底层 owner                                |
| -------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Model services | OmniMind 从哪里获得模型、如何认证、目录有哪些                | bundled OmniMind Agent 的 Pi ModelRuntime |
| Agent engines  | Codex、Claude、OpenCode、Pi 等独立执行引擎是否安装/登录/可用 | 各 Engine adapter/native CLI/config       |

路由规则：

- Composer 当前是 OmniMind 且没有模型：进入 `Model services`；
- Composer 当前是 Codex/Claude/OpenCode 等且不可用：进入 `Agent engines` 的对应 Engine detail；
- stock Pi 的 `.pi` credential/config 不在 OmniMind Agent Model services 中展示或修改；
- `Model services` 不列出 Codex/Claude/OpenCode 作为模型服务实例；
- `Agent engines` 不复制 OmniMind Agent 的供应商 credential 表单。

用户仍能从统一 Settings 搜索中找到两者，但这只是共同导航，不是共同 lifecycle。

### 10.4 当前页面现状

当前 `ModelsSettingsPanel.tsx` 只有两块：

```text
Generation defaults
  └─ Git writing model

Custom models
  └─ 拥有独立 custom slug 合同的 Engine；OmniMind 明确排除
```

这里还需纠正一个容易被表面 UI 隐藏的事实：Git writing 的动态目录当前只预取 Codex、Kilo、OpenCode，但这不定义各 Engine 的 custom-model 合同。OmniMind 已退出 free-form custom slug：它只消费 authoritative runtime catalog。Codex、Claude、Cursor、Antigravity、Grok、Kilo、OpenCode 等独立 Engine 继续使用各自 custom slug owner；stock Pi 的既有字段保持 Provider-owned，不迁入 OmniMind；Droid 的 ACP catalog 仍拒绝未知 slug。

当前 `ProvidersSettingsPanel.tsx` 负责：

- Engine 可见性和排序；
- CLI 安装/升级状态；
- binary/home/server endpoint 等 Provider-specific fields；
- 独立 Engine 文档和 diagnostics。

目标不是继续向 `ModelsSettingsPanel` 堆输入框，而是把它改成 OmniMind Agent ModelRuntime 的真实投影，同时把现有次级设置重新归位：

- `Git writing model` 退出 Model services；底层字段暂时保留，UI 新归属由调用功能的 sole owner 在 E7 单独裁决；
- Codex、Claude、Cursor、Antigravity、Grok、Kilo、OpenCode 等 custom slug 属于独立 Engine，应在不迁移现有 storage 字段的前提下由 `Agent engines` 对应 detail 渲染；
- stock Pi custom slug 继续属于 stock Pi Engine detail，不能迁入 OmniMind Agent 的 `.omnimind`；
- **已被 2026-08-20 clean-break 裁决取代**：旧 OmniMind free-form model hint 不属于 first-public 产品能力，也不再由 Settings、Composer 或转换 UI 读取。旧 JSON 字段按通用 schema 解码规则忽略，并在下一次正常 Settings 保存时自然不再写回；不建立 alias、迁移、清理任务或静态模型 fallback。OmniMind 选择只来自 Pi ModelRuntime 的 authoritative catalog；
- 若首个实现为控制风险暂不移动 custom slug，必须放在折叠的“独立引擎模型”区并明确“由引擎管理”，不能继续与 OmniMind Agent 模型服务混为同一列表；
- 不改变现有 settings storage 字段即可完成 UI 归位，不为改位置创建 migration。

### 10.5 当前底层能力与 Host 暴露缺口

锁定 Pi 0.84.1 的 `ModelRuntime` 已提供：

- provider/model list；
- auth check/status；
- set/remove runtime API key，且只在当前 runtime 内生效；
- OAuth/API-key login 与 logout，且 login/logout 才是 Pi 的持久 credential 写路径；
- provider-scoped model refresh；
- persisted model catalog store；
- custom/native provider registration；
- `models.json` provider configuration；
- `auth.json` credential storage。

但 OmniMind 当前 renderer RPC 只观察到：

```text
provider.listModels
```

该 RPC 还不是 Model services 列表 API。`PiAdapter.listModels()` 使用 `ModelRegistry.getAvailable()`，因此只返回当前认证条件下可用的模型；它不会返回所有未配置 provider，也不足以区分“Pi 支持但尚未连接”与“provider 不存在”。另外 `checkOmniMindAgentProviderStatus()` 当前固定报告 bundled/ready 且 `authStatus: unknown`，这是 Engine runtime health，不是某个模型服务的 credential readiness。Model services 不能复用这个粗粒度状态冒充服务级认证状态。

`ProviderAdapter` 也只把 `listModels` 作为 optional discovery method 暴露。仓库里没有 Settings 可调用的：

```text
持久 API-key/OAuth login / logout
临时 runtime API-key override
refresh selected model service
upsert/delete custom model service
list credential metadata
```

所以真实状态是：

```text
Pi 能力已存在
  + OmniMind session/list-model integration 已存在
  - Model services Host contract 尚未接线
  - Model services 产品页面尚未交付
```

这不是“复制 Proma 后端”的理由。最小路径是建立一个 **OmniMind-Agent-scoped、Pi-ModelRuntime-backed** 的 typed Host surface，只做薄路由和安全投影。

### 10.6 最小 Host contract

不能把这些动作塞进所有 Engine 的通用 `ProviderAdapter`，因为 Codex/Claude/OpenCode 没有同构的模型服务生命周期。建议由 Server 中一个 namespaced owner 暴露，例如：

```text
omnimindModelServices.list()
omnimindModelServices.get(serviceId)
omnimindModelServices.beginLogin(serviceId, authType)
omnimindModelServices.answerLogin(authRequestId, promptId, value)
omnimindModelServices.cancelLogin(authRequestId)
omnimindModelServices.logout(serviceId)
omnimindModelServices.refresh(serviceId, force)
omnimindModelServices.upsertCustom(config)
omnimindModelServices.removeCustom(serviceId)
```

名称可以按现有 RPC 风格调整，但职责必须保持：

- 只操作 `omnimind` identity 的 `.omnimind` agentDir；
- 不接受任意 filesystem path；
- 不读写 stock Pi `.pi`；
- 不成为第二 ModelRuntime；
- 不维护静态 provider/model capability registry；
- 不拥有 Composer selection；
- 不进入 Product events/Timeline；
- mutation 后只失效相应 model-service/catalog query；
- 原始 Pi error 保留在技术详情，本地化摘要由 UI 投影。

`beginLogin` 不能退化成一个假通用 `setApiKey(secret)`。Pi 的 `AuthInteraction` 允许 provider 连续发出 `text`、`secret`、`select`、`manual_code` prompt，并通过 `info`、`auth_url`、`device_code`、`progress` event 通知进度。Cloudflare 等 API-key provider 会在 secret 之外继续询问 account/gateway id；OAuth 也可能是浏览器、device code 或手动 code。Host 应桥接这套 typed interaction，而不是在 OmniMind 再维护供应商表单。简单单-key provider 可以在 UI 上看起来像一个输入框，但底层仍走 `ModelRuntime.login(providerId, "api_key", interaction)`。

Auth bridge 还必须满足：

- 每个 auth request 有不可猜测、短生命周期 id，并绑定当前 Desktop client、service id 与 auth type；
- prompt response 通过 mutation/ephemeral channel 发送，尤其 `secret` 不进入 URL、React Query cache、持久 draft 或日志；
- cancel/timeout 真实 abort 同一个 Pi `AbortSignal`；
- `auth_url` 只允许经过校验的安全 URL scheme；custom provider/extension 给出的外链仍显示目标域并由用户主动打开；
- event/prompt 顺序由 Server authority 驱动，renderer 不能伪造 login success；
- Server 只回传 credential metadata、auth source 和最终状态，绝不回传 credential body。

`list()/get()` 的 renderer projection 至少需要下面这些非敏感字段，且字段来自 Pi runtime 而不是品牌猜测：

```text
serviceId / providerId
displayName
origin: builtin | models_json | extension
authMethods[]: api_key | oauth（含 Pi 提供的 label）
authStatus: configured | setup_required | refresh_required | unavailable + source + safe label
knownModelCount / availableModelCount
supportsNetworkRefresh
configurableFields（只表示 UI capability，不含值或 secret）
catalogError/stale summary（若 Pi 有真实证据）
```

不得返回 stored key/token、完整 credential、任意 command 展开结果或未经脱敏的 headers。`ServerProviderStatus` 的 Engine-level `ready/authStatus: unknown` 不能填充这些 service-level 字段。

这里的 `origin` union 是最终 provenance contract，不是允许 Settings mount 执行 extension 的授权。`extension` 只能来自已经由显式 intent scope 加载的 Pi runtime/provenance；被动只读页面不能为了补齐一行而运行第三方 extension。但 Extension provider 的产品可达性是 V1 必达结果，不是 optional enhancement：用户进入添加流程后应复用 Pi 既有 ResourceLoader/Session owner完成安全加载和来源投影。静态发现 OAuth access token 已到期只证明需要 refresh/check，不能证明 refresh token 或登录整体已经失效，因此此时只能投影 `refresh_required`，`sign_in_expired` 保留给 Pi provider-owned auth/refresh 的明确失败证据。

### 10.7 ModelRuntime 生命周期与持久化

当前 Pi adapter 会按 Session/operation 创建隔离的 ModelRuntime，防止 project extension provider 注册泄漏到其他 Thread。Settings 不能为了方便把一个全局可变 ModelRuntime 注入所有 Session。

被动 Settings operation 还必须以同一个 physically-contained、no-follow、byte-bounded、caller-cancellable reader 完成所有 config/cache 读取，且不加载 extension。物理 containment 同时解析存在的 stock `.pi` root metadata，拒绝 `.pi` symlink/junction target 与 candidate root 或其子树重合；该检查不得枚举、打开或读取 `.pi` 内的任何 state。Pi `v0.84.1` 的公开 `ModelRuntime`/`ModelConfig` 只接收 `modelsPath`，随后直接重新打开文件，没有 reader/content/max-bytes/signal 注入点；Host 预读无法消除 TOCTOU，临时副本可能复制 literal apiKey/header，自建 parser 又会形成第二 schema authority。因此完整 `models_json` 只读投影在采用独立上游 loader API 前是明确 stop：`modelsPath: null` 的 built-in characterization 不是本 Slice 的 Exit。

建议：

```text
Settings operation
  -> resolve exact .omnimind agentDir
  -> create/load a task-local Pi ModelRuntime
  -> perform one provider-scoped auth/refresh operation
  -> persistent auth uses Pi login/logout credential-store path
  -> preview-only secret may use runtime API-key override
  -> catalog persists through Pi models store
  -> dispose operation runtime
  -> publish model-service mutation generation
  -> invalidate OmniMind Agent catalog/model-service queries

New/continued Agent Session
  -> creates its own isolated runtime
  -> before the next turn, reconciles a stale mutation generation
  -> refreshes auth/models.json/catalog snapshot without hot-switching an active turn
```

Custom provider config 是例外：Pi 的 `registerProvider()` 只修改当前 runtime，不自动持久化。因此 Host 必须原子更新 Pi 所理解的 `models.json.providers[providerId]`，随后创建新 runtime 验证 schema/加载结果；不能另建 `model-services.json` 与其双写。

写入规则：

- 一个 agentDir 内的 credential/config mutation 串行化；
- 先保留上一可读配置，写入后重新加载验证；
- schema/写入失败不发布半成品；
- auth credential 只由 Pi credential store 修改，不复制进 App settings；
- model catalog 继续由 Pi models store 持久化；
- renderer 永远不获得已保存 secret 的明文；
- diagnostics 不包含 key、token、完整敏感 endpoint 或原始 auth response。

#### 10.7.1 不能把 query invalidation 当成 Session 同步

Pi `ModelRuntime` 保存自己的 provider composition 和 availability snapshot。虽然 `AuthStorage` 与 `FileModelsStore` 会按文件 revision 读取其他 runtime 写入的新数据，但当前 OmniMind session 在发送前还会用本 runtime 的 `hasConfiguredAuth()` 快照做 gate；新 models.json provider 也不会凭前端 query invalidation 自动出现在已创建 runtime 中。因此：

```text
Settings 保存成功
  ≠ active session runtime 已同步
  ≠ Composer query invalidation 已同步执行 runtime
```

最小正确机制是 Server 维护 **process-local、agentDir-scoped mutation generation**，而不是新增持久化数据库：

1. 每次 credential/config/catalog mutation 完成后递增 generation；
2. 每个 OmniMind Agent session 记录自己最后应用的 generation；
3. 正在运行的 turn 不热切、不重建、不更换 credential；
4. 下一次 send 前若 session generation 落后，先调用该 session 自己的 `ModelRuntime.refresh({ allowNetwork: false })`，重建 provider/auth/available snapshot；
5. 只在用户显式“从供应商获取”时由 task runtime 网络刷新，session reconcile 只读 last-good store，不重复联网；
6. reconcile 失败则阻止该次 send 并给可恢复错误，不带旧 snapshot 继续猜测；
7. session 关闭后无需保留 generation，新的 session 直接从 Pi files/store 建立最新 snapshot。

该 generation 不是新的产品事实或 catalog owner，只是跨隔离 runtime 的本进程失效信号。若现有 adapter/service lifecycle 已有等价 revision/invalidation hook，应复用它，不再创建第二套。

#### 10.7.2 CredentialSynchronizationError 的提交边界

Pi 明确规定：`login()`、`logout()` 或 runtime override 可能已经完成 credential mutation，但在本地 provider/catalog/availability 同步阶段失败并抛出 `CredentialSynchronizationError`。此时不能把整个操作显示成“未保存”，也不能自动重发登录，否则可能重复 OAuth 或覆盖刚写入的 key。正确处理是：

1. 显示“凭据已更新，但本地状态同步失败”；
2. 重新创建一个 task-local runtime，读取非敏感 credential metadata 与 auth status；
3. 若 credential 已存在，提供“重新同步/刷新”而不是“再次保存”；
4. 只有重新读取证明未提交时，才恢复到输入态；
5. 技术详情保留 provider id、operation 与脱敏 cause，不包含 Pi error 携带的 credential body。

#### 10.7.3 Custom provider 持久化是当前真实上游缺口

Pi 0.84.1 的公开 `ModelRuntime.registerProvider()/unregisterProvider()` 只修改当前 runtime；`ModelConfig` 是 immutable load，公开面没有 `upsertProviderConfig()`、`removeProviderConfig()` 或 models.json transaction API。也就是说：

```text
Pi 能运行 custom provider
Pi 能读取 models.json provider config
Pi 当前没有公开的持久 custom-provider mutation API
```

因此 `omnimindModelServices.upsertCustom/removeCustom` 不能假装只是“薄调用一个现成 Pi 方法”。按维护成本从优到劣：

1. **优先向 Pi 上游补最小持久 mutation API**：由 Pi 拥有 schema、locking、unknown-field preservation、atomic write 和 reload validation；OmniMind 只调用。这最符合无条件跟随上游和长期免维护目标。
2. 在上游 API 可用前，built-in provider 的 auth、OAuth、catalog refresh 和只读 custom-provider 投影仍可独立交付，但不能把缺少 custom edit 说成 Model services 完成。
3. 维护者已于 2026-08-13 明确要求提前交付 custom edit，并授权在既有 product-owned Pi source adoption 内给 ModelConfig/ModelRuntime owner增加一个极窄、typed、可删除的持久 mutation seam。该 seam 对单个 `providers[providerId]` 做 locked read-modify-write，保留根级及其他 provider的全部未知字段，写临时文件后以Pi新runtime验证，再原子替换；删除也只删目标key。它不能变成Host parser/writer、不能格式化重写用户无关内容、不能处理明文credential，并应在Pi上游API adopted后删除。

这是一个明确 stop-loss：授权已经满足，但round-trip、unknown-field、locking、atomic replace与reload fixture仍是进入条件；不能从React或Host service直接编辑models.json，也不能建立`model-services.json`绕开缺口。真实产品结果必须包括test/save、packaged restart后仍存在、edit/retest/refresh/delete；禁用占位或永久隐藏不能替代这条旅程。

### 10.8 列表页 IA

```text
┌─────────────────────────────────────────────────────────────────┐
│ 模型服务                                           [＋ 添加服务] │
│ 配置 OmniMind 使用的模型服务、凭据与可用模型。                   │
│                                                                 │
│ OmniMind                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ◆  DeepSeek API                              已连接          │ │
│ │    DeepSeek · 3 个可用模型                    ›              │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ ◆  DeepSeek Proxy                            已连接          │ │
│ │    自定义实例 · 2 个可用模型                  ›              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 可连接的服务                                                     │
│ 小米 MiMo、OpenAI、Anthropic 等                         [查看]  │
│                                                                 │
│ [＋ 添加模型服务]                                                │
│   搜索/选择模型服务                                             │
│   没有找到？通过 API 地址连接 →                                 │
└─────────────────────────────────────────────────────────────────┘
```

每行只显示决策所需信息：

- provider/service logo；
- 用户可区分的 instance name；
- upstream provider name 或“自定义实例”；
- auth/availability 状态；
- 当前可用模型数量；
- disclosure chevron。

这不是“给现有页面加 Logo”的装饰性修改，而是固定的信息层级：

- 概览、添加、详情在同一 Settings pane 中互斥呈现，不纵向拼成一个超长页面；
- 概览只有已配置/可恢复/当前阻塞的实例和一个主 CTA，不展示完整 supported-provider catalog；
- 添加页以搜索为第一焦点，结果是紧凑、可键盘导航的 service rows，不是四十张同权大卡片；API 地址入口只在尾部以较弱文本动作出现；
- 详情页替换添加/概览内容，返回时恢复搜索 query、scroll 与触发项 focus；不能把登录或配置表单追加在长列表尾部，再靠测试直接查询 DOM 假装用户能看见；
- 单行只设一个明确的点击目标。图标与名称负责身份，文字状态负责可用性，模型数/来源负责补充判断；不同时堆叠“已连接”“内置”“OAuth”“API Key”“可用”等 badge；
- 复用现有 Settings typography、spacing、divider、surface 和 focus token。默认保持轻、平、克制，用分组与留白表达层级，不增加每服务一张重边框/渐变/阴影卡片的视觉噪声；
- 窄宽度下名称和主动作优先，次要元数据换行或下沉；不能横向滚动、截断恢复动作或把状态只压成颜色点。

主列表不应把 Pi 的全部 built-in provider 都铺成几十条“需要配置”，那会把“Pi 支持范围”误作用户资产并制造噪声。主列表只包含：

- 已有 stored/runtime/environment/models-json auth 的 service；
- 用户保存过的 custom instance，即使它当前需要修复；
- 当前 Composer/Project 通过 Product State owner 给出 exact stable service id、但尚未配置的 service，便于解除阻塞；此 join 在 E3 前不存在时必须延后，不能从 `DEFAULT_MODEL_BY_PROVIDER`、品牌或 model slug 推导。

其余 Pi-supported provider 放在“可连接的服务 / 添加服务”入口中搜索。是否“已连接”必须来自 `getProviderAuthStatus()`/`checkAuth()` 的安全投影，不能只看 auth.json：环境变量、AWS/ADC 等 ambient auth、models.json fallback 都可能令 service 可用。

Logo 不是 provider identity 的前提。Pi provider metadata 当前保证 id/name/auth/model 行为，不保证完整品牌图标。维护者已选择 [LobeHub Icons](https://github.com/lobehub/lobe-icons) 作为 Model services 的品牌视觉资产来源。E7 使用精确锁定、零运行时依赖的官方 `@lobehub/icons-static-svg`、显式导入实际资产并随 App 本地打包；不得为图标引入 `@lobehub/ui`、Ant Design、CDN、`latest` URL、远程图片或未知 Extension URL，也不把 package 的品牌集合复制成 OmniMind Provider Registry。

实现上只允许一个 Web-owned、presentation-only 的 model-service icon resolver：输入是 Pi 已投影的稳定 service/provider identity与origin，输出是已打包的图标组件或中性 fallback。resolver 不决定服务是否存在、display name、认证、catalog、模型、capability或send gate，不进入 Server contract，不把品牌命中当 identity 证明。OpenAI、Anthropic、DeepSeek、Xiaomi、Google 等已知服务默认使用彩色资产；custom API 使用中性 API/连接 glyph；Extension 仅在既有 trusted provenance owner提供安全本地资产时采用，否则使用统一 Extension glyph。状态仍用文字/check/结构表达，不能只靠颜色。

模型专属图标是有界增强：只有 runtime model identity 与本地已打包 LobeHub asset精确匹配时显示，否则继承所属服务图标。不得为每个新 model slug 扩一张 Host 静态镜像，也不得让 icon miss 隐藏模型。同品牌多个实例共享品牌图标，以用户命名和稳定、非敏感的实例标签消歧；完整 UUID 只进入主动展开的技术详情。overview、添加搜索、详情页与 Composer 的model-service分组复用同一resolver，避免每个consumer各建一套品牌判断。

不默认显示：

- Base URL；
- credential source 细节；
- models.json path；
- provider id；
- raw error；
- refresh timestamp（除非 Pi/Host 有可靠证据）；
- enabled toggle（Pi 当前无此通用语义）。

状态至少区分：

```text
已连接 / Connected
需要配置 / Setup required
登录已过期 / Sign-in expired
需要刷新 / Refresh required
正在检查 / Checking
目录刷新失败但保留上次结果 / Refresh failed, using last known models
不可用 / Unavailable
```

### 10.9 空状态

OmniMind Agent 即使有 Pi built-in providers，也可能没有 configured credential。空态不是“系统没有供应商”，而是“没有可用模型服务”：

```text
还没有可用的模型服务
连接模型服务并选择可用模型后，OmniMind 才能发送消息。

[添加模型服务]
```

若 built-in provider 可列出但都未认证，可显示少量 quick-connect 候选；候选只来自 Pi runtime metadata、当前 Composer 阻塞引用或维护者明确的产品默认，不创建 OmniMind 静态供应商排行榜。`getProviders()` 返回“支持”，`getAvailable()` 返回“当前可用”，两者不能混用。

### 10.10 添加服务流程

沿用 Proma “列表 -> 全页/内页编辑 -> 返回列表”的清晰结构，复用 OmniMind 现有 Settings primitives，而不是套多步 modal wizard。入口不平权：高频的 runtime 服务搜索是主路径，API 地址连接只在列表尾部作为清楚但弱一级的补充。

```text
┌─────────────────────────────────────────────────────────────┐
│ ‹ 模型服务                         添加模型服务              │
│                                                             │
│ [搜索模型服务…]                                              │
│ DeepSeek · OpenAI · Anthropic · Xiaomi MiMo · …              │
│ （built-in 与已加载 extension 均来自 Pi runtime metadata）   │
│                                                             │
│ 没有找到你的服务？通过 API 地址连接 →                        │
└─────────────────────────────────────────────────────────────┘
```

选择 runtime service 后：

- 使用 Pi `getProviders()` 的真实列表和 auth capability；
- built-in/extension provider 使用自身稳定 id，Host 不维护厂商 enum、模型镜像或认证 Registry；
- 同时支持 API Key 与 OAuth 的 provider 先显示两种真实 auth method；选择一种后才渲染 Pi prompt，不把二者同时伪装成必填；
- ambient credential provider 只显示检测状态和说明；
- API-key provider 的 secret 只向 Server 发送一次，保存后不回显；
- 用户可以在保存前登录/验证/获取模型，因为这最能降低配置失败成本；
- 若 OAuth 登录本身会持久化 credential，关闭未完成表单时必须说明 credential 是否保留，不能制造幽灵登录。

未保存预览必须区分认证类型：

- API Key/custom config 预览使用 task-local、in-memory credential/config runtime；其中一次性 API key 可用 `setRuntimeApiKey()`，因为它明确不落盘。用户确认保存后必须重新走 `login(providerId, "api_key", interaction)` 写正式 credential store，不能把 preview runtime 当持久层；
- OAuth 登录若 provider flow 必须持久化 credential，则登录成功视为明确创建意图：先创建目标 service instance，再登录，成功后自动保存并刷新；失败/取消时清理尚未形成有效配置的 pending instance；
- 不允许把 secret 临时写进 `models.json` 再删除，也不允许 renderer 保存未提交 secret。

### 10.11 多实例规则

维护者已确认同一模型服务商允许多个服务实例。产品规则：

```text
brand/provider kind != service instance identity
```

示例：

```text
DeepSeek API       -> providerId: deepseek
DeepSeek Proxy     -> providerId: deepseek-proxy
DeepSeek Research  -> providerId: deepseek-research
```

- `providerId` 在创建后稳定，重命名只改 display name；
- identity 冲突在保存前显示；
- credential、base URL、catalog cache 都按 instance/providerId 隔离；
- Composer model slug 必须携带 instance providerId，不能只显示/保存 `deepseek/model` 后再猜 endpoint；
- UI 在同名模型旁显示足够的 service label 以消歧；
- 删除 instance 前检查当前 Composer/project/thread/sticky selection 是否引用它；
- 删除后相关 selection 进入明确 unavailable/reselect 状态，不 silent fallback；
- built-in provider identity 不允许删除，只能移除 credential；custom instance 可删除。

不要照搬 Proma 的 `Channel` aggregate。这里只使用 Pi provider id/config/credential/catalog 的真实 identity；只有 Pi schema 无法表达维护者已确认的实例字段时，才在 architecture owner 中举证一个最薄的 display metadata sidecar，且不能复制 secret/model catalog。

“允许多实例”也不能被误实现成“任意 built-in provider 一键浅克隆”。Pi 0.84.1 的真实边界是：

- `models.json.providers` 可以用不同 provider id 保存不同 name/baseUrl/api/headers/models，从而形成多个独立 API-key/custom-compatible instance；
- 新 provider id 不会自动继承另一个 built-in id 的动态 catalog fetcher、stream 特例或 OAuth identity；没有 extension/provider config 时，单改 id/baseUrl 不等于完整克隆；
- `models.json` 可持久表达的动态 OAuth 当前只有 `oauth: "radius"`；任意 extension OAuth 可以在 runtime 注册，但它的安装、加载和持久 lifecycle 仍属于该 Pi extension；
- 因而 UI 只在 Pi runtime/config/extension 能完整表达时提供“复制/新建同类实例”。不能把官方 OAuth 登录按钮复制到一个新 id，然后假装该 id 拥有同一 OAuth client/redirect/session；
- API-compatible proxy 若没有动态 catalog implementation，仍可作为独立实例，但模型来自 models.json 手动定义/导入，不显示无效的“从供应商获取”。

产品承诺是“同一模型服务商可以存在多个实例，并按 Pi 可表达的能力分别工作”，不是“所有上游 provider 的每种认证方式都能无条件克隆”。这个限制来自 Pi 真实能力，正符合“跟随 Pi、不发明第二生态”。

### 10.12 详情页 IA

```text
┌─────────────────────────────────────────────────────────────┐
│ ‹ 模型服务                         DeepSeek Proxy   已连接    │
│                                                             │
│ 连接                                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 服务名称                         DeepSeek Proxy          │ │
│ │ 模型服务商                       DeepSeek                │ │
│ │ API Key                          已配置  [替换] [移除]   │ │
│ │ 请求地址                         https://…        [编辑] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 模型                                      [从供应商获取]     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DeepSeek V4 Flash                          可用          │ │
│ │ DeepSeek V4 Pro                            可用          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 高级设置                                                    │
│   Provider ID、API/protocol、headers、模型覆盖…              │
│                                                             │
│ [删除此自定义服务]                                          │
└─────────────────────────────────────────────────────────────┘
```

详情页使用 progressive disclosure：日常只见连接和模型；协议、headers、compat、完整 model definition 只对 custom provider 展开。不能让普通用户先理解 Pi `api`、`compat`、thinking map 才能连接官方服务。

### 10.13 API Key 流程

```text
未配置
  -> 输入 secret
  -> Server: ModelRuntime.login(serviceId, "api_key", typed interaction)
  -> Pi credential store writes auth.json
  -> ModelRuntime 同步 auth/catalog snapshot
  -> UI 只收到 configured/auth source/result
  -> 自动或显式 refresh catalog
```

规则：

- 不提供“查看已保存 API Key 明文”；
- 替换 key 使用新的 secret input；
- “保存 API Key”绝不能调用 `setRuntimeApiKey()`：该 API 只建立 runtime override，进程/runtime 结束即丢失，只适合未保存预览或一次性请求；
- 移除持久 API Key 走 Pi `logout()`/credential-store delete；`removeRuntimeApiKey()` 只移除临时 override，也不能冒充删除 auth.json；
- 移除 key 是 destructive credential mutation，需要确认；
- 删除 credential 不删除 custom provider config 或 catalog cache，除非 Pi 原生 contract 如此；
- 移除 stored credential 后，service 仍可能因环境变量、AWS/ADC ambient auth 或 models.json fallback 而可用；UI 应显示真实剩余 auth source，不能无条件显示“已断开”；
- 移除后当前正在运行的 operation 不热切；后续请求先按 §10.7.1 刷新 session snapshot，再根据 Pi 真实 auth status 发送或要求配置；
- `CredentialSynchronizationError` 可能表示 credential 已提交而本地同步失败；先重新读取 metadata/status，禁止自动重复提交 secret；
- error summary 本地化，原始 Provider error 放技术详情；
- secret 不进入 URL、argv、log、toast、React Query cache 或 diagnostics。

### 10.14 OAuth 流程

```text
选择支持 OAuth 的 service
  -> [使用浏览器登录]
  -> Server calls ModelRuntime.login(providerId, "oauth", interaction)
  -> user completes provider-owned flow
  -> credential persisted by Pi
  -> refresh provider catalog
  -> UI shows account-safe status, never tokens
```

必须覆盖：

- popup/browser/device flow 由 Pi provider capability决定；
- cancel、timeout、用户关闭窗口、expired refresh token；
- login 重入和 per-provider mutation serialization；
- logout 只影响该 service instance；
- OAuth 成功但 catalog refresh 失败时保留“已登录 + 目录刷新失败”的两个事实，不把它合成登录失败；
- credential 同步失败使用 Pi `CredentialSynchronizationError` 的真实阶段信息恢复/提示；
- stock Pi OAuth 仍由 stock Pi 自己拥有，不能借 OmniMind Agent 页面改 `.pi`。

多实例 OAuth 还必须尊重 §10.11：只有该 instance 的有效 Pi provider/extension 真正暴露 OAuth capability 才显示登录；不能因为同品牌 built-in id 支持 OAuth，就把能力按品牌名复制给自定义 id。

浏览器 loopback callback 页面属于同一 E5 产品旅程，但不拥有登录成功事实。OpenAI Codex、Anthropic、OpenRouter、Radius 等真实接线 provider共用一个request-scoped、default-preserving presentation seam；页面使用亮色 OmniMind视觉与OmniMind图标，不复制成单供应商品牌页。callback server 收到 authorization code 时只显示“已收到授权/Authorization received，请返回 OmniMind 完成连接”，因为部分Pi flow会在响应页面之后才进行token exchange。只有 App 内 `ModelRuntime.login()` 的最终typed outcome才能显示登录成功；exchange失败时页面历史文案不得被解释成已连接。

renderer输入必须收窄为安全展示状态，例如`authorization_received | error`，不得接收code、token、Provider message/details或原始诊断。renderer缺失或失败时回到stock Pi页面；不得移动、复制或旁路Pi的callback server、state validation、token exchange、cancel与device-code owner。

### 10.15 “从供应商获取”

Proma 最值得借鉴的是这个用户动作，但 OmniMind 的实现必须更薄：

```text
Click 从供应商获取
  -> ModelRuntime.refresh({
       providers: [serviceId],
       allowNetwork: true,
       force: true,
       signal
     })
  -> re-read provider models/available models
  -> invalidate Composer catalog query
```

当前 `PiAdapter.listModels()` 每次创建 `ModelRuntime` 时没有传 `allowModelNetwork: true`；Pi 的 create-time 默认是 cache/static refresh。因此对现有 `provider.listModels` 做 React Query `refetch()` **不等于“从供应商获取”**，它通常只是重新读取当前 Pi built-in/config/cache/extension 结果。真实按钮必须调用本节新的 provider-scoped Host mutation，并显式允许网络；完成后再失效只读 catalog query。

UI 状态：

```text
Idle
Fetching…        button disabled + inline spinner
Success          “已获取 N 个模型”
Partial/filtered “获取 N 个，其中 M 个当前可用”
Failure          保留上一目录，显示“刷新失败，仍使用上次获取的模型”
Cancelled        回到上一稳定状态，不清空列表
Unsupported      不显示按钮，说明目录由服务内置/手动配置
```

首次成功保存 API Key、OAuth 登录完成或 custom endpoint 明确提交后，自动执行一次 provider-scoped refresh；“从供应商获取”按钮继续作为用户主动重试和更新目录的入口。输入字段每次变化不自动联网，避免费用、速率限制和把半成品 endpoint 当真实配置。

规则：

- 不要求先保存完整表单才能获取，前提是安全地把临时 config/credential 交给 Server；
- 不把拉取失败解释为 credential 必然错误；按 auth/network/provider error 分类；
- 不在失败时用空数组覆盖 last-good；Pi models store 已拥有持久化策略；
- Host 不维护逐供应商 `/models` URL、响应 parser 或 catalog fetcher。已有动态 provider 继续由 Pi provider `refreshModels` 决定；Pi `models.json` 官方支持的四种 generic 协议，则由 product-owned Pi ModelConfig/ModelRuntime 的窄 typed discovery seam 统一解析、校验、限流和取消。两条路径都不得把协议解析复制到 Host；
- 不伪造 last synced timestamp；只有 runtime/store 暴露可靠 `checkedAt` 时显示；
- 可取消请求必须真实传递 AbortSignal，不能只隐藏 spinner；
- 成功后 Composer 当前 selection 若仍有效则保持；失效时明确要求重新选择。

`refresh()` 对未知 provider 和 static provider 会忽略，且返回值只有 `aborted` 与 provider error map，不直接给模型数。因此 Host/UI 必须在 refresh 后重新读取该 provider 的 known/available models，再计算 N/M；不能用“RPC resolve 了”推断真的发起过网络请求，也不能给 static provider显示成功 toast。首次保存后自动 refresh 是 OmniMind 的 UX 决策，不是 Proma 行为或 Pi 默认行为；只有 provider 暴露真实 dynamic refresh capability 时才执行。

### 10.16 模型列表与手动模型

Proma 将模型分为“已启用/可用”，但 Pi 0.84.1 没有通用 per-model enabled flag。OmniMind 不应照抄这一层。

默认 Model services 详情只展示：

- 当前 service 的完整已知模型；
- 当前 credential 下可用的模型；
- model name/id；
- reasoning/input/context 等只有用户决策需要时才显示的 capability；
- catalog source 或 stale/error 状态。

`known` 与 `available` 必须并列建模：`ModelRuntime.getModels(serviceId)` 可用于完整已知目录，`getAvailable(serviceId)`/auth status 决定当前可发送目录；当前通用 `provider.listModels` 只返回 available，不能直接复用为详情页的完整数据源。模型数的口径必须写进 accessible label，例如“已知 12 个，当前可用 8 个”，不能只显示一个含混数字。

搜索在模型数超过阈值时出现，使用现有 combobox/input primitives。不要为模型列表增加复选框，除非 Pi 上游拥有 scoped-model/enabled 语义。

手动添加模型只在 Pi custom provider/models.json schema 能真实承载时显示。它需要的字段按 progressive disclosure 分两层：

```text
Basic: id, display name
Advanced: api, baseUrl override, reasoning, thinkingLevelMap,
          input, contextWindow, maxTokens, cost, headers, compat
```

这里的“可达”不等于把 Pi 原始对象完整送进 Renderer。当前 product-owned typed seam 应按三类处理：

- `cost` 与按 effective `api` 判别的通用标量 `compat` 可逐字段投影和编辑；恢复默认只清这些公开字段，Pi 必须继续保留未公开的 routing、template、session/cache 与未来字段；
- `google-generative-ai` 当前没有真实 compat consumer，不显示假开关；改变数据保留、会话亲和或外发 identity 的 compat 必须另行裁决；
- `headers` 保持 secret-blind。当前 Pi-owned typed seam 只投影 header 名称与来源类别，并允许在 provider/model scope 定向新增或替换环境变量引用、清除既有项；普通读取不返回值、环境变量名或 command。导入的 literal/template/command 只可保留或清除，新建 command-backed header 仍不开放；Pi 继续拒绝与认证/传输 owner 冲突的 reserved header。Host 不得用 raw JSON、第二 parser 或 Renderer 侧 secret state 补洞。

因此“hidden rich fields 无损保留”和“用户可编辑”是两个不同 claim。已安全公开的字段必须可 set/clear/reopen；未公开字段必须继续准确标为未交付，不能以 round-trip 测试冒充产品可达。

不要为官方 built-in provider 默认开放一整张兼容参数表，也不要猜测 reasoning/context capability。

### 10.17 第三方 endpoint 风险

Proma 对非官方 Base URL 有明确风险确认，这个机制值得保留，但文案和判断必须由 OmniMind 自己拥有：

- 只有用户将 built-in provider 改为非官方地址或创建 custom endpoint 时触发；
- 展示凭据泄露、内容中转、协议兼容和隐私风险；
- 确认只授权当前 endpoint/config mutation，不成为永久全局豁免；
- 取消后不测试、不刷新、不保存；
- endpoint 在普通列表页脱敏/隐藏；
- 不夹带商业推广；
- 不声称本地优先可以消除第三方服务风险。

Pi models.json 的 `apiKey`/header 值还支持 literal、环境变量插值和前导 `!command`。这不是普通“连接 URL”字段：

- 打开 Model services、列出服务、搜索或显示 auth metadata 时不得解析 secret、执行 command 或触发外部进程；
- 普通 API Key 保存使用 Pi credential store，不把明文复制到 models.json；
- imported config 中已有的 env/command 表达式必须 round-trip 保留，但默认只显示“由环境/命令提供”，不回显展开结果；
- command-backed credential 只在高级技术入口创建，并明确说明命令会在 test/discovery/send intent 中由 Pi 执行；不得自行增加 TTL、shell 包装或静默 last-good。header command 因当前执行不可取消且错误可能包含原命令，只对 imported 配置提供来源类别、保留与清除，不提供新建入口；
- “测试连接”和“从供应商获取”是用户显式网络/command intent，页面 mount 不是。

### 10.18 删除与断开

区分三种动作：

| 动作                             | 影响                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Logout / Remove saved credential | 删除 auth.json 中该 service credential，保留 provider config/catalog cache；ambient/fallback auth 可能仍可用 |
| Remove custom service            | 删除 custom provider config，并处理其 credential/catalog/selection 引用                                      |
| Hide from Composer               | 当前 Pi 无通用语义，不提供                                                                                   |

删除 custom service 前确认页至少显示：

- service name；
- 是否为当前 Composer selection；
- 是否被 Thread draft/persisted selection、Project default 或 per-Engine sticky selection 引用；
- credential 是否同时删除；
- catalog cache 是否可重建。

删除不能修改 stock Pi、其他 Engine、Conversation transcript 或 native Session history。若 active operation 正在使用该 service，默认延迟到 operation 结束或要求先停止；不能热删 runtime 依赖。删除 custom instance 时，credential 与该 provider 的 catalog cache 是否一并清理由用户确认和 Pi store contract 决定；不能只删 models.json 行而遗留不可见 credential，也不能在没有确认时扩大为清理其他 provider。

### 10.19 与 Composer 的闭环

```text
Model services mutation
  -> increment agentDir-scoped runtime mutation generation
  -> invalidate omnimind model-service queries
  -> invalidate ["provider-discovery", "models", "omnimind"] query prefix
  -> reconcile current/sticky/project selections
  -> keep valid selection
  -> mark invalid selection unavailable
  -> Composer disables next send until a valid model is selected
```

Composer popup 中的 `Refresh models` 和 `Model services…`：

- 只在当前普通展示为 OmniMind 的 `omnimind` Engine 且 capability 支持时显示；
- `Refresh models` 调用同一个 Host owner，不复制逻辑；
- `Model services…` deep-link 到 `section=models`，必要时携带非敏感 service id/target；
- 返回 Chat 后保留 draft、附件和 selection；
- 当前 operation 不受 Settings mutation 热切；
- 同一 Thread 的下一次 OmniMind Agent send 在 admission 前应用 §10.7.1 runtime reconcile，不能只刷新 renderer 菜单；
- stock Pi/独立 Engine 显示自己的 engine settings action。

### 10.20 Proma 借鉴裁决

Proma 检查范围：

- `ChannelSettings.tsx`；
- `ChannelForm.tsx`；
- `packages/shared/src/types/channel.ts`；
- `channel-manager.ts` 的 `fetchModels`；
- Settings primitives 与 model logo mapping。

复用分类：**reference-only + mechanism-only**，不是代码复用。

应借鉴：

- 列表 -> 添加/编辑详情 -> 返回列表的低认知路径；
- 同一供应商允许多个命名配置；
- 连接信息、认证、已知模型按 section 分组；
- 保存前可以测试/获取模型；
- “从供应商获取”的清晰 CTA、progress 和结果反馈；
- refresh 失败保留旧模型；
- 手动模型与 fetched 模型不互相误删的产品意识；
- custom endpoint 风险确认；
- 密钥默认遮蔽、删除确认、dirty navigation guard。

绝不能复制：

- Proma 的静态 `ProviderType` 大枚举；
- `PROVIDER_DEFAULT_URLS`、预设模型表与品牌 capability 镜像；
- `channel-manager.ts` 针对每个供应商手写 `/models` 请求和 parser；
- Proma 自己的 OAuth service；
- `Channel` credential/schema 作为 OmniMind 第二模型真相；
- per-model enabled 语义；
- 以 URL 域名猜 provider identity；
- provider-specific compat 补偿；
- Proma 的静态 model/provider logo mapping和由logo推断provider能力；品牌视觉只按§10.8使用LobeHub的本地presentation resolver，Pi仍是identity/capability owner；
- 硬编码中文、缺少统一 i18n 的实现方式。

OmniMind 要复制的是 **任务流质量**，不是 Proma 的维护负担。

### 10.21 Settings 响应式、可访问性与双语

- 列表行在窄宽度把状态和模型数折到第二行，不隐藏 service identity；
- action 不依赖 hover 才可达；触摸/键盘路径始终显示 disclosure 或 overflow；
- secret show/hide、remove、login、refresh、delete 都有 aria-label 和 focus-visible；
- OAuth popup/等待状态向 screen reader 公告，但不重复播报 spinner；
- model list 使用可键盘搜索/滚动的现有 primitives；
- destructive confirm return focus 到原 action；
- zh-CN/en key 一一对应；
- Provider/model/brand/error 原文不翻译，OmniMind-owned label/description/action/error summary 翻译；
- “模型服务商”用于 OpenAI、DeepSeek、MiMo 等；“引擎”用于 Codex、Pi、OpenCode、OmniMind；`OmniMind Agent` 只用于技术详情、runtime、诊断与来源语境；
- 不把内部 `Provider` 直接显示成普通中文页面主词。

进入“通过 API 地址连接”后才显示连接名称、API 格式、API 地址、secret 输入、获取模型/手工添加与“测试并保存”。普通配置只列 Pi `models.json` 官方可表达的四种通用协议：OpenAI Chat Completions、OpenAI Responses、Anthropic Messages、Google Generative AI；不承诺自动猜协议。任意非标准 API、私有 OAuth/SSO 或自定义 discovery/stream/tool/usage 必须由真实 Pi Extension 注册。该持久 mutation 仍属于 E6 hard gate；当前只固定产品层级和 authority，不实现 Host writer/store/fetcher。

#### 10.21.1 Settings 搜索与 deep-link 迁移

保留 section id `models` 还不够。当前搜索索引只有 `models:git-writing-model` 和 `models:saved-model-slugs`，且 section label/description 仍是旧文案。实施必须同时处理：

- `settingsNavigation.ts`：label 改为 `Model services`，description/eyebrow 使用普通展示名 OmniMind；内部 id 仍为 `models`；
- `i18n.tsx`：`settings.models`、`settings.modelsDescription` 及新增状态/动作完整简中/英文对齐；
- `settingsSearchIndex.ts`：新增“连接模型服务、API Key、OAuth、从供应商获取、自定义服务、服务实例”等可搜索入口；
- 旧“Git writing model / Git 写作模型”搜索结果不能继续指向 Model services 的不存在 row；E7 在调用功能的新归属确定后迁移或 alias 到该真实位置，本切片不猜目的地；
- 独立 Engine 的 saved custom slug 搜索结果迁移到 `providers` detail，旧 id/target 若曾形成外部 deep-link，应通过 alias 重定向而不是静默失效；
- 不用可翻译 title 作为新稳定 identity；新 row 使用显式 target，避免改文案后 anchor 漂移；
- 搜索结果若直接进入某个 service detail，只携带非敏感 provider/service id，不把 endpoint、account 或 credential source 放进 URL。

#### 10.21.2 默认模型的奥卡姆裁决

本轮不在 Model services 添加“OmniMind Agent 全局默认模型”。当前已有 Thread/Provider draft、Project default 与 per-Engine sticky selection；OmniMind/Pi 这类 runtime-catalog-only Engine 没有 Host 静态默认。再加一层 Settings default 会制造优先级冲突。

Composer 与所有 direct consumer 都必须先按现有优先级解析 exact selection，再由 authoritative runtime catalog/admission 证明；无 exact model 时返回 null、进入 setup/reselect，并在任何 Thread/Project/command 持久化前 fail closed。Settings 的 provider-only patch 也不得沿用旧 Engine 的 model 形成 hybrid；切到 runtime-catalog-only Engine 必须同时携 authoritative exact model。只有未来证据证明现有 Project/sticky 无法表达明确用户需求，才在 Product State owner 中新增持久 default。

### 10.22 Settings 最小施工 Slice

#### Settings Slice 0：Owner 已修正，先钉住测试目标

1. `architecture/workbench.md` 已更新为 `Model services` 并保留 `models` section id/IA；
2. 以该 owner 钉住 Model services 与 Agent engines 的职责边界；
3. 钉住 `.omnimind` / `.pi` 隔离；
4. 添加当前 Host API 缺口测试，避免 UI 先造 mock service。

#### Settings Slice 1：只读服务目录

1. Host 以 Pi ModelRuntime 暴露 provider、auth status、known/available model count；
2. renderer 建 Model services 列表页；
3. 重命名 Settings label/description；
4. 不渲染 Git writing default；底层字段保留；新归属可以延后到 E7，但 E7 Exit 前必须迁移到真实调用功能或由维护者明确退休，不能静默失去唯一入口；
5. 不做 mutation，先证明真实数据、空态、错误和隔离。

锁定 Pi `v0.84.1` 尚无 physically-contained、bounded、cancellable 的 `models.json` loader，因此本 Slice 当前只能安全 characterization built-in/auth metadata，并对存在 `models.json` 的 projection typed fail；不得把它称为 Slice 1 完成。恢复条件是一次独立授权并 adopted 的 Pi source/API intake，不能在本 UI diff 中 patch vendor、写 secret-bearing temp copy 或复制 Pi schema。

#### Settings Slice 2：API Key 与 refresh

1. 桥接 Pi typed auth interaction，持久 API Key 走 `login(..., "api_key")` / `logout()`；
2. `setRuntimeApiKey` / `removeRuntimeApiKey` 只用于未保存预览并在 operation 结束清理；
3. 接 provider-scoped `refresh`；
4. 实现“从供应商获取”；
5. 证明 failure 保留 last-good；
6. catalog query invalidation 与 active-session generation reconcile 同时闭环。

#### Settings Slice 3：OAuth

1. 只对 Pi provider auth capability 支持的 service 展示；
2. typed interaction/cancel/timeout；
3. login/logout 后同步 status 与 catalog；
4. tokens 永不进入 renderer/cache/log。

#### Settings Slice 4：custom provider 与多实例

进入条件：维护者已授权 §10.7.3 的 Pi-owned typed mutation seam；施工前仍须具备 unknown-field/locking/atomicity/reload fixture。若Pi上游先提供受支持API，直接采用上游并删除补丁。

1. 主入口仍是搜索/选择 runtime 服务；API 地址入口在列表尾部弱一级呈现；
2. generic API 只允许 `openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai`；非标准协议只来自 Pi Extension；
3. 使用唯一 Pi providerId；
4. 通过 Pi 上游 API或已授权的 product-owned Pi typed mutation seam 原子更新 `models.json.providers`；
5. 支持 display name、base URL、api 和真实 model definitions；高级 compat 只开放 §10.16 的安全 typed subset；headers 使用同节的 Pi-owned write-only environment-reference set/clear 与 value-blind metadata，不回传原值，也不开放新 command header；
6. 只对 Pi config/extension 真能表达的 instance 显示 auth/refresh capability；
7. 删除/重命名/selection impact；
8. custom endpoint 风险确认；
9. 不增加平行 Channel store。

#### Settings Slice 5：独立 Engine 设置归位

1. 所有独立 Engine custom slugs 由 `Agent engines` 对应 detail 呈现，stock Pi 与 OmniMind Agent 不混用 private home；
2. 不迁移底层 settings 字段；
3. **已被 2026-08-20 clean-break 裁决取代**：OmniMind Agent legacy custom model hints 不再只读兼容，不提供转化/移除路径，也不伪造 Pi model definition；
4. Composer 的 Engine-specific config link 指向正确 section；
5. 移除 `Models & writing` 遗留文案；
6. 完成 Settings search/deep-link/i18n/a11y。

### 10.23 Settings 验收矩阵

| Case                      | 预期                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 打开 Model services       | 物理 no-follow 读取 `.omnimind`；`.pi` 只做 root metadata 非别名证明，内部 state zero-open/read/write；symlink/junction 逃逸 typed fail |
| 未配置任何 credential     | 显示 setup-required，不把 provider 误报为不存在                                                                                         |
| 同供应商两个实例          | 行、credential、catalog、model slug 可独立区分                                                                                          |
| API Key 保存              | 走 Pi api-key login 并在 packaged restart 后仍存在；renderer 不回读明文                                                                 |
| runtime API key preview   | operation 内可验证，取消/重启后不残留，且不冒充“已保存”                                                                                 |
| API Key 移除              | 仅删除目标实例 stored credential；若 ambient/fallback 仍有效则准确显示                                                                  |
| 多字段 API-key login      | Cloudflare 类 secret + account/gateway prompt 顺序、取消与脱敏正确                                                                      |
| OAuth success             | auth 成功与 catalog refresh 分别呈现                                                                                                    |
| OAuth cancel/timeout      | 不产生假成功或半登录 UI                                                                                                                 |
| 从供应商获取成功          | 仅刷新目标 service，显示真实模型数                                                                                                      |
| 从供应商获取失败          | last-good 保留，Composer 仍能使用有效旧目录                                                                                             |
| refresh cancel            | 不清空列表、不留下永久 loading                                                                                                          |
| static provider           | 不显示无效 refresh CTA                                                                                                                  |
| custom endpoint           | 风险确认后才 test/refresh/save                                                                                                          |
| command/env credential    | 打开/搜索页面不执行、不展开；只有显式 test/send 按 Pi 语义解析                                                                          |
| custom provider reload    | 新 Session 从 Pi models.json 读到同一配置                                                                                               |
| active Session reconcile  | 当前 turn 不热切；下一次 send 前读到最新 auth/config/catalog                                                                            |
| sync-after-commit failure | 重读 credential metadata，不重复提交 key/OAuth                                                                                          |
| 删除被引用实例            | 明确影响并使 selection unavailable；不 silent fallback                                                                                  |
| Git writing default       | 不出现在 Model services；底层字段保留，等待调用功能 owner 确定新归属                                                                    |
| 独立 Engine custom slug   | 在 Agent engines detail 可达，storage 无迁移                                                                                            |
| zh-CN / en                | title、description、state、action、error key 一一对应                                                                                   |
| keyboard/screen reader    | list/detail/login/refresh/confirm/focus return 完整                                                                                     |
| packaged restart          | service config、auth metadata、catalog 和 Composer selection 恢复                                                                       |

### 10.24 Settings 完成定义

- [x] 唯一 UI owner 已从 `Models & writing` 修正为 `Model services`；
- [x] Execution owner 已写入 Pi-backed Host、auth、refresh、session invalidation 与 custom-provider 持久化边界；
- [ ] section id、search、deep-link、group 与 keyboard behavior 保留；
- [ ] 页面普通文案主要描述 OmniMind，而非 Git writing；技术详情准确标识 OmniMind Agent runtime；
- [ ] Agent engines 继续管理独立 Engine，不被合并；
- [ ] Host 直接路由 Pi ModelRuntime，不复制 provider API；
- [ ] provider/auth/model/custom-instance 状态来自 `.omnimind`；
- [ ] stock Pi `.pi` 未被后台读取/写入；
- [ ] 支持同供应商多个稳定实例；
- [ ] API Key、OAuth、ambient auth 只按 capability 呈现；
- [ ] 持久 API Key 走 Pi `login("api_key")`，runtime override 仅用于预览；
- [ ] typed auth bridge 覆盖 text/secret/select/manual_code 与 info/auth_url/device_code/progress；
- [ ] “从供应商获取”使用 provider-scoped Pi refresh；
- [ ] refresh 失败保留 last-good；
- [ ] custom provider 持久化使用 Pi models.json schema；
- [ ] 不存在第二 Channel/provider/model catalog truth；
- [ ] credential 不回显、不进日志/cache/Timeline；
- [ ] Model services mutation 与 Composer catalog/selection 闭环；
- [ ] active session 在下一 turn 前应用 agentDir mutation generation，不把 query invalidation 当 runtime 同步；
- [ ] Git writing default 从 Model services 移除；新归属未定前不新建 taxonomy；
- [ ] independent Engine custom slugs 准确归位；
- [x] 旧 OmniMind free-form model hint 已 clean break：合同、writer、UI 与发送候选归零；旧字段只被通用 Settings 解码安全忽略，不迁移、不转换、不清理其他数据；
- [ ] 双语、响应式、键盘、screen reader 和 packaged restart 通过。
- [ ] 模型服务彩色品牌图标来自单一、本地打包的LobeHub presentation resolver；Engine图标owner不变，unknown/custom/Extension安全fallback，状态不只靠颜色，legal/SBOM与offline package闭合。

## 11. 组件与 owner 复用决策

### 11.1 应直接复用

| 现有 owner                         | 继续承担的职责                                          |
| ---------------------------------- | ------------------------------------------------------- |
| `ProviderIcon.tsx`                 | Engine logo；不建第二图标表                             |
| `useProviderModelCatalog.ts`       | 动态 catalog、status、runtime descriptor、intent gating |
| `composerProviderRegistry.tsx`     | Provider-private option normalization/dispatch          |
| `composerTraits.ts`                | capability -> visible controls/current summary          |
| `TraitsPicker.tsx`                 | Effort/Fast/Thinking/Context/Variant/Agent/Mode 内容    |
| `ComposerModelEffortPicker.tsx`    | 当前 Engine 的 Model + options 组合 popup               |
| `composerDraftDomain.ts` / actions | per-Engine draft 与 sticky selection                    |
| `ProviderService.ts`               | stop-first replacement 与 exact restore                 |
| `composerFooterLayout.ts`          | measured overflow degradation                           |
| `SettingsPanelPrimitives.tsx`      | Settings section、row、list、popup 与现有视觉/键盘契约  |
| `settingsNavigation.ts`            | section id、搜索与 deep-link；保留 `models` identity    |
| Pi `ModelRuntime`                  | provider/auth/catalog/refresh/custom-provider 真实能力  |
| Pi `auth.json` / `models.json`     | credential/config 持久化；不建第二份 Channel store      |

### 11.2 可以新增的最小组件

如现有 `ProviderModelPicker` 无法在不扭曲职责的情况下只输出 Engine list，可新增一个局部组件：

```text
ComposerEnginePicker.tsx
```

它只能做：

- render current Engine icon；
- 打开 registry-driven Engine menu；
- 展示 status/tooltip/aria；
- 调用现有 draft selection action；
- 触发目标 Engine 的必要 intent-gated discovery。

它不能拥有：

- 第二套 Engine registry；
- 默认模型表；
- auth API；
- Provider Session replacement；
- 独立持久化；
- 模型菜单或 traits schema。

Model services 可以新增页面内的局部 list/detail/form composition，但它们只消费 typed Host projection。认证、catalog refresh、custom provider persistence 和 secret redaction 必须留在 Server/Pi owner，不能放进 React component。

E7 可以新增一个局部 `ModelServiceIcon`/resolver，精确锁定并显式导入 `@lobehub/icons-static-svg`。它只服务overview、添加搜索、detail与Composer service-group presentation；Engine `ProviderIcon`保持原owner，Server contract不增加icon slug/URL，unknown/custom/Extension按§10.8本地fallback。同一提交必须闭合lockfile、MIT legal/SBOM、静态资产裁剪与packaged offline证据。

### 11.3 不应新增

- `UniversalReasoningStrategy`；
- `EngineCapabilitiesPanel`；
- `EngineModelBindingV2`；
- `PendingEngineStore`；
- `ModelServiceProviderAdapter` 之上的另一个“统一 Provider”；
- 新的 engine-switch RPC；
- UI 私有的静态 Engine/Model capability matrix；
- Proma-style `Channel` aggregate、provider enum、default URL 表或 `/models` fetcher；
- 读取/写入 stock Pi `.pi` 的 OmniMind Agent Settings bridge。

## 12. 历史实施依据与分解

以下顺序只解释当时的设计依赖，不取代现行 owner，也不作为新会话 runbook。历史验证方法见
[`model-services-composer-new-session-execution-guide.md`](model-services-composer-new-session-execution-guide.md)；该文件已退休为非阻塞参考。当前任务必须从当前 HEAD、dirty state、现行 owner、维护者决定与真实阻塞独立推出最小路径。

### 联合优先顺序

| 顺序 | 闭合结果                                                                              | 原因                                                   |
| ---- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | 已修正 Workbench/Execution owner；钉住 Model services / Agent engines / Composer 边界 | 架构冲突已解除，后续实现按 sole owner 施工             |
| 2    | Model services 只读目录 + API Key + provider-scoped refresh                           | 先让默认 OmniMind Agent 真正获得可配置、可发现的模型   |
| 3    | Composer Engine icon + Model/options 稳定结构                                         | 消费同一真实 catalog，不做假 UI                        |
| 4    | next-turn cross-Engine replacement、Queue、failure restore                            | 在控件稳定后闭合执行语义                               |
| 5    | OAuth、custom provider 与同供应商多实例                                               | 继续复用同一 Pi Host owner，补齐维护者已确认的完整范围 |
| 6    | 独立 Engine custom controls 归位、双语、a11y、packaged proof                          | 删除旧混淆并完成真实交付                               |

这个顺序回答“是否应该抓紧模型配置”：**是。Model services 的最小纵向闭环应早于 Composer 的完整多 Engine 切换**，因为默认 OmniMind Agent 无可用模型时，再漂亮的 Engine/Model selector 也只是空壳。但不要先做一个全供应商管理平台；先闭合 Pi-backed API Key + refresh + Composer 可用模型。

### Slice 0：先钉行为，不改视觉

新增/调整测试，明确：

1. 空 Thread 和 started Thread 的 Composer 控件结构相同；
2. Engine 选择只更新 next-turn desired selection；
3. running turn 不被热切；
4. Queue item 的 binding snapshot 不被后续选择改写；
5. target failure 的 runtime/UI rollback 语义唯一；
6. Pi discovery 仍是 intent-gated；
7. 无跨 Engine default fallback。

若这七项中任何一项无法从 owner 唯一推出，先修 owner，停止 UI 施工。

### Slice 1：抽出 Engine 入口

1. 从现有 `ProviderModelPicker` 的 provider list 提取可复用 menu content，或建立局部 `ComposerEnginePicker`；
2. 复用 `ProviderIcon`、display names、status 和 menu primitives；
3. trigger 默认 icon-only；
4. 完成 tooltip、aria-label、keyboard navigation、focus-visible；
5. 保留 Pi intent gate；
6. 选择 Engine 后调用现有 per-provider draft/default resolver。

此 slice 不碰 Session replacement，只证明 draft selection 与 UI。

### Slice 2：统一 Footer 结构

1. 删除以首轮/后续轮决定 split vs combined picker 的分叉；
2. 所有正常状态渲染 `EnginePicker + ModelOptionsPicker`；
3. `ComposerModelEffortPicker` 锁定为当前 selected Engine，只显示其模型；
4. Context meter 保持在 Engine 左侧；
5. 接入 measured footer plan；
6. 无 options 时不显示空 section。

### Slice 3：解除错误的 mid-thread lock

1. 将 `active runtime provider` 与 `composer desired provider` 分离命名和使用；
2. 移除 `ChatView` 对 started Thread 的不同-Provider UI 拒绝；
3. 改写 `ProviderCommandReactor` 的 cross-provider validation guard，让合法目标进入 `ProviderService` replacement；
4. 不增加新 command；继续使用 `ModelSelection`；
5. 保留同 Engine `sessionModelSwitch` capability；
6. 跨 Engine 一律走 replacement；
7. 证明 stale generation/native events 不能夺回 active ownership。

### Slice 4：确定 commit 与 rollback

推荐以 `thread.turn.start` 为 replacement commit point：

1. menu selection 只更新 draft/next-turn metadata；
2. send snapshot exact selection；
3. ProviderService stop-first；
4. target success 后才把 runtime binding 视为 committed；
5. failure 恢复 old binding；
6. UI selection、draft、receipt 和 error projection 同步到唯一状态；
7. 不自动重放。

若保留 idle `thread.meta-updated -> ensureSessionForThread`，必须额外证明无副作用浏览、rollback projection 和 race safety；否则删除 eager ensure 是更小路径。

### Slice 5：收口 options 与重复入口

1. 保留 capability-driven traits；
2. Fast 留在 Model + options popup；
3. 移除或降级 `ComposerExtrasMenu` 中重复 Fast；
4. trigger summary 只显示当前 Engine/Model 有意义的非默认值；
5. 所有 Engine-specific label 使用真实语义；
6. 模型切换时 reconcile unsupported options。

### Slice 6：双语、响应式与 packaged proof

1. 新增/修改用户可见字符串必须 zh-CN/en key 一一对应；
2. 清理触达路径中的硬编码英文：Effort、Variant、Speed、Default、Fast、Agent、Mode、Checking、Sign in、Unavailable、Coming soon 等；
3. 按§10.8接入锁定、按需、本地打包的LobeHub彩色模型服务图标，保持Engine `ProviderIcon` owner不变并完成fallback/legal/SBOM；
4. browser test 覆盖overview/add/detail/Composer图标一致性、窄宽、键盘、focus和非颜色状态；
5. 完成 focused server/web tests；
6. 按项目规则从 exact pushed SHA 重建 packaged App；
7. 使用 fresh、任务专用 profile 验证启动、真实 journey、关闭和重开；
8. 不读取或迁移真实用户 `.pi`、`.omnimind`。

## 13. 预计触达文件

这不是必须全部修改的清单，而是当时的 owner map。当前实际 diff 应从现行 owner 推出并保持最小。

### Web / Composer

- `apps/web/src/components/ChatView.tsx`
- `apps/web/src/components/chat/ComposerModelEffortPicker.tsx`
- `apps/web/src/components/chat/ProviderModelPicker.tsx`
- `apps/web/src/components/chat/TraitsPicker.tsx`
- `apps/web/src/components/chat/ComposerExtrasMenu.tsx`
- `apps/web/src/components/ProviderIcon.tsx`（仅在 a11y/size contract 真有缺口时）
- `apps/web/src/components/composerFooterLayout.ts`
- `apps/web/src/composerDraftModels.ts`
- `apps/web/src/composerDraftActions.ts`
- `apps/web/src/composerDraftDomain.ts`（优先不改 schema）
- `apps/web/src/hooks/useProviderModelCatalog.ts`（只补发现/默认证据缺口，不改成第二 registry）
- `apps/web/src/i18n.tsx` 或当前 catalog owner

### Web / Model services Settings

- `apps/web/src/routes/_chat.settings.tsx`
- `apps/web/src/settingsNavigation.ts`
- `apps/web/src/components/settings/ModelsSettingsPanel.tsx`
- `apps/web/src/components/settings/ProvidersSettingsPanel.tsx`（只归位独立 Engine custom model controls）
- `apps/web/src/components/settings/SettingsPanelPrimitives.tsx`
- `apps/web/src/lib/providerDiscoveryReactQuery.ts` 或新建的窄 Model services query owner
- `apps/web/src/wsNativeApi.ts`
- `apps/web/src/i18n.tsx`

### Server / orchestration

- `apps/server/src/orchestration/Layers/ProviderCommandReactor.ts`
- `apps/server/src/provider/Layers/ProviderService.ts`（优先只复用；只有现有 restore 证据暴露缺口时才改）
- `apps/server/src/provider/Layers/PiAdapter.ts`（抽取/复用 agentDir 与 ModelRuntime factory，不扩大 generic adapter contract）
- 一个 Server-owned、OmniMind-Agent-scoped 的 Model services service/layer
- `apps/server/src/wsRpc.ts` 或当前 RPC handler owner
- 各 adapter capability/test（只在真实行为不符合 contract 时改）

### Contracts

Composer Engine 切换原则上不需要新公共 schema。Model services Settings 当前没有 Host contract，因此需要最小的 typed request/response/method；它必须 namespaced 到 OmniMind Agent，不得扩成所有 Engine 的假统一 lifecycle。新增 contract 时同步 Web API、WS methods、Server handler、fixtures 与版本兼容义务。

## 14. 验证矩阵

### 14.1 纯函数与 draft tests

| Case                                       | 预期                                                           |
| ------------------------------------------ | -------------------------------------------------------------- |
| 首次选 Engine，有 declared default         | 选择有效 default                                               |
| 首次选 Pi，无静态 default，有 live catalog | 选择 registry 中有效候选                                       |
| 目标 Engine 有 sticky selection 且仍有效   | 恢复 sticky                                                    |
| sticky model 已下线                        | 退到目标 Engine 有效 default/目录首项                          |
| 目标 Engine 无模型                         | `selectedModel = null` 或明确不可发送状态；绝不返回 Codex 模型 |
| Codex Max + Fast -> Cursor                 | 不携带 Codex-only option                                       |
| Cursor -> Codex -> Cursor                  | 恢复 Cursor 自己的 selection                                   |
| model 不支持当前 effort                    | 清理/回落到 capability default                                 |

### 14.2 Browser component tests

| Case                     | 预期                                         |
| ------------------------ | -------------------------------------------- |
| 空 Thread                | Engine icon + Model/options trigger          |
| 第一轮发送后             | 控件结构不变                                 |
| Engine trigger icon-only | tooltip 与 aria-label 含全名                 |
| 键盘打开 Engine menu     | focus 顺序、选择、Escape、return focus 正确  |
| Engine menu statuses     | checking/auth/unavailable/installed 真实显示 |
| 只打开 Engine menu       | 不触发 Pi private discovery                  |
| 选择 Pi                  | 才触发 Pi catalog discovery                  |
| 选择新 Engine            | Model trigger 自动更新为目标有效 selection   |
| 当前 Engine 无 traits    | popup 不显示空标题                           |
| Codex effort + fast      | Fast 只有一个主入口，summary 正确            |
| OpenCode/Kilo            | 展示 Variant/Agent/Mode，不显示伪 Effort     |
| 窄宽度                   | 按 measured plan 降级，Engine 与 Send 保留   |
| zh-CN / en               | key 一一对应，无正常路径中英混杂             |

### 14.3 Reactor / ProviderService tests

| Case                                   | 预期                                             |
| -------------------------------------- | ------------------------------------------------ |
| idle Thread 从 Codex 切 Claude 后 send | stop old -> start target -> dispatch once        |
| running Codex turn 时选择 Claude       | 当前 turn 继续；selection 只影响下一次 admission |
| 已排队 item 后改 Engine                | 旧 item binding 不被改写                         |
| target adapter validation 失败         | 不停旧 binding或按明确阶段恢复；不 dispatch      |
| target start 在 stop old 后失败        | 恢复 exact old binding                           |
| restore 本身失败                       | 明确 terminal/error state，不伪造 recovered      |
| late old event                         | generation fence 拒绝夺回 ownership              |
| same Engine in-session switch          | 不无故 restart                                   |
| same Engine restart-session adapter    | restart 后只 dispatch 一次                       |
| cross Engine                           | 不使用 native resume cursor 跨接                 |
| failure                                | 不 silent fallback、不 replay prompt             |

### 14.4 已运行的基线测试

在本观察 snapshot 上运行：

```text
cd apps/web
bun run test:browser -- \
  src/components/chat/ComposerModelEffortPicker.browser.tsx \
  src/components/chat/ProviderModelPicker.browser.tsx \
  src/components/chat/TraitsPicker.browser.tsx
```

结果：3 个文件、42 个测试通过，耗时约 5.52 秒。

这只证明当前 picker/traits 行为可复现，其中包括“started Thread 锁 Provider”的旧行为；它不是本文目标已经实现的证明。实施时应先改测试意图，再改代码，不能把旧绿色当目标绿色。

### 14.5 Live provider evidence

涉及 Provider/Model/Thinking/Fast、stream、tool、abort、恢复的 production candidate，按项目规则在 focused fixture 后使用真实资源证伪：

- OmniMind Agent 优先覆盖 Xiaomi MiMo 与 DeepSeek；
- 区分直连、OpenAI-compatible endpoint 和代理转换；
- 如本机资源允许，至少验证一次 OmniMind Agent 与一个独立 Engine 的往返切换；
- 验证首轮、continuation、thinking/stream/tool、abort/timeout、断连恢复；
- 所有输出脱敏，不记录 key、完整 endpoint、账号、原始响应或可关联标识；
- 真实资源失败按鉴权/协议/渠道归因，不写进生产补偿逻辑。

### 14.6 Packaged Desktop journey

用户可见变更不能只靠 HMR/dev Electron 证明。候选需从 exact pushed SHA 构建并安装本机 App，以任务专用：

- `userData`；
- home；
- Provider private home；

启动并核验主进程、Helper、bundled Server 都指向隔离路径，再执行：

```text
fresh launch
  -> new Thread
  -> choose Engine
  -> verify automatic model
  -> choose effort/fast if supported
  -> send
  -> switch Engine for next turn
  -> verify provenance and no replay
  -> close
  -> reopen
  -> verify persisted selection and Thread recovery
```

## 15. 完成定义

只有全部满足，才能把此项标为 candidate：

- [ ] Settings section 已正式命名为 `Model services / 模型服务`；
- [ ] `models` section id、搜索、deep-link 与既有 Settings IA 保持兼容；
- [ ] Model services 真实投影 OmniMind Agent 的 Pi ModelRuntime；
- [ ] API Key、OAuth、provider-scoped refresh 与 custom provider 使用同一 Host/Pi owner；
- [ ] 同一模型服务商多个实例可稳定区分；
- [ ] “从供应商获取”不复制任何供应商请求实现，失败保留 last-good；
- [ ] Model services 与 Agent engines 各自管理正确对象；
- [ ] `.omnimind` / `.pi` credential、config 和 catalog 保持隔离；
- [ ] Settings mutation 能正确刷新 Composer catalog/selection；
- [ ] Context meter 右侧存在可访问的 Engine icon picker；
- [ ] Engine menu 使用唯一 registry/display/icon source；
- [ ] Model services 使用唯一、本地打包的LobeHub presentation resolver；overview/add/detail/Composer分组一致，Engine icon owner不变，unknown/custom/Extension安全fallback，logo不参与identity/capability；
- [ ] 打开菜单不会越过 Pi intent gate；
- [ ] 选择 Engine 后恢复/选择目标 Engine 的有效模型；
- [ ] 无模型时 fail closed，不跨 Engine 猜默认；
- [ ] Model + options 仍为一个紧凑入口；
- [ ] Codex Fast 保留且没有第三个重复入口；
- [ ] Pi/OmniMind、Claude、Cursor、Kilo/OpenCode 等只展示真实 capabilities；
- [ ] 空 Thread 与 started Thread 的 Footer 结构一致；
- [ ] 中途可以为下一 turn 改 Engine；
- [ ] 当前 operation 不热切；
- [ ] Queue binding 语义有自动化证明；
- [ ] cross-Engine replacement 复用 ProviderService；
- [ ] target failure 恢复 exact old binding；
- [ ] 不跨 Engine resume、不 silent fallback、不 replay；
- [ ] Timeline 保留每 turn Engine/Model provenance；
- [ ] 响应式按 measured overflow 降级；
- [ ] icon-only trigger 有 tooltip、aria、keyboard、focus proof；
- [ ] zh-CN/en catalog key 一一对应；
- [ ] focused tests、live provider probe 和 packaged fresh-profile journey 都通过；
- [ ] Campaign reviewer 独立裁决 verified；producer 不自证完成。

## 16. 明确非目标

本任务不授权：

- 重做整个 Settings taxonomy、route 或视觉系统；
- 自研一套替代 Pi ModelRuntime 的 provider/auth/catalog 框架；
- 把 Codex、Claude、OpenCode 等独立 Engine credential 搬进 OmniMind Agent Model services；
- 复制 Proma 的 Channel schema、供应商枚举、默认 URL、模型预设或 fetcher；
- 为所有 Engine 追求虚假功能对齐；
- 把 Codex Fast 推广成所有 Engine 的通用速度参数；
- 让不同 Engine 共用 native Session；
- 为 UI 新建长期兼容层或 migration；
- 修改公共网站、发行、update feed 或公共 API；
- 自动安装 Engine/package/plugin；
- 在未获得当次授权时同步或吸收新的外部 source revision；
- 因“更完整”而把所有 provider 设置塞进 Composer。

## 17. Stop-loss 条件

出现以下任一情况，停止扩张并回到 owner/证据：

1. 需要新持久化 schema 才能继续，但无法给出现有 draft state 的具体反例；
2. 需要新 RPC，但现有 `ModelSelection -> ensureSession -> ProviderService` 链尚未证明不足；
3. 为统一 UI 开始维护静态跨 Engine capability matrix；
4. 为默认模型开始复制 Pi/provider catalog；
5. Engine 选择、runtime binding 和 Thread provenance 出现三个不同真相；
6. Queue item 是否绑定 selection 无法从 owner 推出；
7. failure 后 UI 与 runtime 的 rollback 语义不唯一；
8. 测试只能证明 mock，真实 Provider 关键路径未验证；
9. packaged App 使用默认 profile，无法证明没有读取真实用户 private home；
10. UI diff 顺手扩张到整个 Settings 重构。
11. 为 Model services 开始给 generic `ProviderAdapter` 增加所有 Engine 都无法兑现的 CRUD/auth lifecycle。
12. 为支持多实例另建一份 secret、provider config 或 model catalog truth。
13. “从供应商获取”绕过 Pi，开始维护供应商 endpoint/parser。

## 18. 当前任务如何使用本文

新的实现会话不得把本文或历史实现参考当作 runbook。按根 `AGENTS.md` 读取当前 owner，以当前代码、维护者决定、任务范围和真实阻塞选择最小路径；只有旧结论与当前变更相关时，才复用本文的 source evidence 或 falsifier。

若当前代码、Pi package revision、owner contract 或 Campaign 状态已变化，只局部复验受影响结论；不能机械照抄本文行号、旧测试断言、E0–E8 顺序或旧 package 结论。

## 19. 证据锚点

| 结论                                          | Source anchor                                                                                              | 分类                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Engine literal 与展示名                       | `packages/contracts/src/orchestration.ts`, `packages/contracts/src/model.ts`                               | local observation              |
| Engine logo registry                          | `apps/web/src/components/ProviderIcon.tsx`                                                                 | local observation              |
| 动态模型发现与 Pi intent gate                 | `apps/web/src/hooks/useProviderModelCatalog.ts`                                                            | local observation              |
| 当前组合 picker                               | `apps/web/src/components/chat/ComposerModelEffortPicker.tsx`                                               | local observation              |
| provider/model menu 与 started lock           | `apps/web/src/components/chat/ProviderModelPicker.tsx`、对应 browser test                                  | local observation              |
| capability-driven traits                      | `composerTraits.ts`, `TraitsPicker.tsx`, `composerProviderRegistry.tsx`                                    | local observation              |
| Fast 重复入口                                 | `TraitsPicker.tsx`, `ComposerExtrasMenu.tsx`                                                               | local observation              |
| 首轮/后续结构分叉                             | `apps/web/src/components/ChatView.tsx`                                                                     | local observation              |
| measured footer degradation                   | `apps/web/src/components/composerFooterLayout.ts`                                                          | local observation              |
| per-Engine draft/sticky                       | `composerDraftDomain.ts`, `composerDraftActions.ts`, tests                                                 | local observation              |
| cross-Provider fallback                       | `apps/web/src/composerDraftModels.ts`                                                                      | local observation              |
| Pi ModelRuntime integration                   | `apps/server/src/provider/Layers/PiAdapter.ts`                                                             | local observation              |
| Pi 0.84.1 runtime API                         | locked package `.d.ts` under `node_modules/.bun/...pi-coding-agent@0.84.1.../dist/core/model-runtime.d.ts` | fixed-package fact             |
| Pi custom provider config/persistence         | locked `model-config.d.ts`, `provider-composer.d.ts`, `model-runtime.js`                                   | fixed-package fact             |
| 当前 Model services 页面现状                  | `ModelsSettingsPanel.tsx`, `settingsNavigation.ts`, `i18n.tsx`                                             | local observation              |
| 当前 Host 只暴露 model discovery              | `ProviderAdapter.ts`, `packages/contracts/src/ipc.ts`, `ws.ts`                                             | local observation              |
| Proma 配置交互与独立 fetch 实现               | Proma `ChannelSettings.tsx`, `ChannelForm.tsx`, `channel.ts`, `channel-manager.ts`                         | reference-source observation   |
| mid-thread guard                              | `ChatView.tsx`, `ProviderCommandReactor.ts`, picker tests                                                  | local observation              |
| stop-first + exact restore                    | `apps/server/src/provider/Layers/ProviderService.ts`                                                       | local observation              |
| stable product behavior                       | architecture owner files listed in §0                                                                      | architecture contract          |
| `Model services` 命名、多实例与两入口组合方向 | maintainer discussion accepted on 2026-08-12                                                               | maintainer-confirmed direction |

## 20. 复验触发器

以下变化只复验受影响结论：

- Pi package 版本、vendor tarball 或 `ModelRuntime` API 变化；
- `ProviderKind`、display name、icon registry 变化；
- `@lobehub/icons-static-svg` version/export/license、model-service resolver或packaged asset closure变化；
- `ModelSelection` schema 或 draft persistence 变化；
- `useProviderModelCatalog` discovery/prefetch/intent gating 变化；
- `ProviderService` replacement/generation/restore 变化；
- Queue admission/binding owner 变化；
- `sessionModelSwitch` capability 变化；
- Composer footer layout 或 responsive measurement 变化；
- `architecture/workbench.md` 的 `Model services` owner 裁决变化；
- `architecture/execution.md` 的 Model services runtime authority 变化；
- Pi auth/provider/model config/persistence API 变化；
- OmniMind Model services Host contract 或 `.omnimind` agentDir 解析变化；
- 新 Engine 被 adopted；
- packaged Electron profile/launch topology 变化。

复验时应记录新的 exact revision、受影响断言和 falsifier，不要把历史观察倒改成“从来如此”。

## 21. 维护者决策覆盖审计

| 已明确的认知/决定                                                                 | 本文位置                 | 覆盖状态                                                                        |
| --------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| 页面正式名称使用 `Model services / 模型服务`                                      | §0.1、§10.2              | 已覆盖；Workbench sole owner 已同步，产品代码尚未同步                           |
| 普通 UI 显示 `OmniMind`，技术语境保留 `OmniMind Agent`                            | §0.1、§2.1、§5、§10.2    | 已覆盖；Workbench sole owner 已同步，产品代码尚未同步                           |
| 不再让“模型与写作”定义整页                                                        | §10.2、§10.4             | 已覆盖；Git writing 退出 Model services，新归属明确 defer                       |
| OmniMind Agent 内置 Pi，模型体系无条件跟随 Pi                                     | §4.10、§9.2、§10.5–10.7  | 已覆盖；以 locked 0.84.1 source 为证据                                          |
| Pi 支持什么，OmniMind Agent 原则上就支持什么                                      | §9.2、§10.13–10.18       | 已覆盖；只做 Host/UX 产品化，不做能力镜像                                       |
| 只能比 Pi 更好，但不等于比 Pi 更多                                                | §9.2、§10.20             | 已覆盖；“更好”落在 IA、反馈、恢复、双语和多 Engine 协作                         |
| 不复制 Proma 的供应商请求实现                                                     | §10.15、§10.20、§16      | 已覆盖；明确禁止 enum/URL/preset/fetcher/Channel store                          |
| 借鉴 Proma 的“从供应商获取”                                                       | §10.10、§10.15           | 已覆盖；映射 Pi provider-scoped `refresh()`                                     |
| 首次配置/登录后自动获取，仍保留手动刷新                                           | §10.10、§10.15           | 已覆盖；字段输入期间不自动联网                                                  |
| 同一模型服务商允许多个实例                                                        | §9.3、§10.11             | 已覆盖；使用稳定 Pi providerId，不另建 Channel runtime                          |
| ModelRuntime 已有 provider/model/auth/API key/OAuth/refresh/cache/custom provider | §4.10、§10.5             | 已覆盖；区分 upstream 能力与 OmniMind Host 暴露现状                             |
| 当前 OmniMind Host 并未把完整 ModelRuntime mutation 暴露给 Settings               | §10.5–10.7               | 已覆盖；这是不能只做前端的关键缺口                                              |
| `setRuntimeApiKey` 不持久，持久 API Key 必须走 Pi api-key login                   | §4.10、§10.7、§10.13     | 已覆盖；修正了会导致重启后丢 key 的旧表述                                       |
| Pi auth 可能多 prompt/device/manual-code，不是一张固定 key 表单                   | §10.6、§10.10、§10.14    | 已覆盖；Host 必须桥接 typed interaction                                         |
| 当前 listModels 只返回 available，空动态目录会退回静态 UI options                 | §4.2、§10.5、§10.16      | 已覆盖；Settings/Composer 不再把静态候选当可发送证据                            |
| query invalidation 不会自动刷新 active Session ModelRuntime snapshot              | §10.7、§10.19            | 已覆盖；下一 turn 前按 agentDir mutation generation reconcile                   |
| Pi 当前没有公开的 models.json 持久 custom-provider mutation API                   | §10.7.3、§10.22          | 已覆盖；维护者已授权既有product-owned Pi内的窄typed seam，上游等价API出现后删除 |
| Codex/Claude/OpenCode 等独立 Engine 怎么办                                        | §9.1、§10.3              | 已覆盖；保留 Agent engines/native owner，不塞进 Model services                  |
| 现有统一模型发现 Hook 应复用                                                      | §4.2、§10.19、§11.1      | 已覆盖；mutation 后失效同一 catalog query                                       |
| Composer Context ring 右侧增加 Engine icon                                        | §1.1、§5.1–5.2           | 已覆盖                                                                          |
| 选 Engine 后自动选择目标默认/记忆模型                                             | §3.1、§6                 | 已覆盖；不跨 Engine 猜 fallback                                                 |
| Engine 右侧选择模型和 effort/思考强度                                             | §5.3–5.5、§8             | 已覆盖；Model + options 保持组合入口                                            |
| Codex Fast 等好能力必须保留                                                       | §1.2、§4.6–4.7、§5.3     | 已覆盖；不做第三个 Fast 入口                                                    |
| 不制造“通用推理策略 -> Engine 特有能力”两层                                       | §1.1–1.3、§2.4           | 已覆盖；使用 Engine -> Model -> real options                                    |
| 切换只影响下一次发送，不破坏当前 turn                                             | §7                       | 已覆盖；包含 Queue、stop-first、失败恢复和 provenance                           |
| 奥卡姆剃刀与未来维护成本                                                          | §1.3、§11–§12、§16–§17   | 已覆盖；复用现有 owner 并写明 stop-loss                                         |
| 页面必须真正用户化、详细、双语、可访问                                            | §5、§10.8–10.21、§14–§15 | 已覆盖；含 ASCII、状态、错误、响应式和 packaged journey                         |
| 模型服务使用LobeHub彩色品牌图标，但不建立第二identity/capability authority        | §10.8、§11、§15          | 已覆盖；本地锁定、按需导入、fallback、legal/SBOM与offline边界                   |

审计结论：**修订后的本文已经同时覆盖 Model services Settings 与 Composer 两条主线；上一版“只深写 Composer、浅写 Settings”的问题已纠正。Workbench 与 Execution sole owner 均已完成同步；仍未生效的是后续产品实现与真实验收。**

## 22. 一句话交接

不要给 OmniMind 再造一套模型体系：**Model services 用 Pi ModelRuntime 管理 OmniMind Agent 的服务、认证与目录；Agent engines 保留 Codex/Claude/OpenCode 等原生配置；Composer 用一个 Engine icon 决定“谁执行”，用一个组合 picker 决定“该 Engine 用哪个模型以及它真实支持什么”；发送边界负责 stop-first、exact binding、failure restore 和 provenance。**

## 23. 2026-08-16 首次可用性纠偏：锁定三步聚焦向导

维护者在 2026-08-13 已明确只选择 `focus-flow`：`我肯定要那个三步向导式，其他两个就不考虑了`。选择证据为本机 `.zq-ui/first-run-readiness/selection.json`，视觉基准为 `onboarding/directions/focus-flow/index.html` 与 `onboarding/focus-flow.png`。`readiness-studio` 和 `composer-launchpad` 均不是实现输入。后续把全新 profile 写成 Composer 上方的“克制就地 setup surface”，并实现“Agent 引擎需要处理 / 查看 Agent 引擎 / 模型设置”横条，没有更新的人类裁决支持，属于 sole-owner 同步和交接漂移。

纠偏后的产品合同由 [`../architecture/workbench.md`](../architecture/workbench.md#6-settings) 唯一持有：真正零配置且 authority facts 已稳定时，shell 只挂载一个可延期的三步向导——选择 Engine、准备 Engine、选择 authoritative exact model。OmniMind 的第 2 步直接复用本文已经闭合的 Model services overview/add/detail、typed auth、custom API、refresh 与 catalog owner；独立 Engine 复用各自真实 setup owner。Settings 的 `概览 → 添加 → 详情` 仍是长期管理 IA，不是 onboarding 的三个步骤，也不因向导存在而重排。

资格判断必须先区分事实：任意可发送 exact binding 表示 ready；真实 durable 配置或明确选择当前不可用表示 recovery；loading、unknown、transport 与 passive read error fail closed；只有全产品无 binding、无 durable 配置/记忆、被动投影明确为空且 facts settled 才是 first-run。仅安装存在、auth unknown、runtime 内置目录或由 `getDefaultModel()` 合成的候选都不是恢复 intent，也不是可发送 authority。

关闭和“稍后设置”只保存 versioned local presentation preference，不保存完成态。延期后冷启动不重复 modal，Composer 上方保持零 setup/recovery banner；继续入口复用现有 Engine/model 控件和 Settings。ready 仍完全由可发送 exact binding 派生。原型中的 deferred Composer card 因后续维护者裁决被排除，只保留 modal 的几何、密度、步骤层级、资产与 motion 作为视觉 oracle。

2026-08-16 的 installed App 复核又暴露了两处不应进入长期产品的 authored subset。第一，向导第 1 步只手写 Codex、Claude、Cursor、Pi，会漏掉当前已采用的 Antigravity、Grok、Droid、Kilo、OpenCode，也会让未来 Engine 必须在第二份列表补登记；正确边界是直接消费 Composer 已使用的 canonical Provider descriptors、`ProviderIcon` 与 live status。第二，第 2 步虽然写着“向上拉”，实际只渲染前六项，必须点击提示行才把其余 runtime 服务放进 DOM；这不是自然手势。正确行为是完整有序结果从一开始就在同一个有限高度滚动区中，滚轮、触控板、触摸与键盘无需解锁即可浏览，搜索和详情返回继续复用 Model services 原 owner。两项都属于 presentation/registry 投影修正，不新增 catalog、gesture state 或第二个 Engine owner。

复验触发器新增：首次资格 classifier、Composer draft/exact selection owner、Model services passive facts、Provider health/auth、shell Dialog mount、local preference schema、Settings setup seam、Composer readiness banner 或 `focus-flow` oracle 任一变化。复验必须同时证明 fresh、deferred、ready、recover、unknown，且不得用 dev/HMR 或 authored static service snapshot代替 exact installed App。
