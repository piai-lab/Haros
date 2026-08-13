# Model services 与 Composer 新会话实施执行指南

Observed: 2026-08-12

Source snapshot: `a9adf9fb9a30f6b0a9fb43fc3349c8d2fdfd5a9d`

Status: new-session implementation guide；不是架构 sole owner、全局施工顺序、Campaign 状态、Pi source adoption 或完成证明

## 0. 这份文档解决什么

本文件面向一个**没有历史聊天记忆的新会话**。它不再解释产品设计，而是回答：

```text
新会话从哪里开始？
先验证哪些事实？
按什么顺序改？
每个切片触达哪些 owner？
每一步如何证明完成？
遇到什么必须停？
如何避免把 Pi、Engine、Composer 和 Settings 做成第二套平台？
```

产品设计、代码观察、ASCII、状态机、失败语义和完整验收矩阵见
[`model-services-composer-product-design.md`](model-services-composer-product-design.md)，下文简称“设计说明”。本文件使用 `设计说明 §N` 引用它，不复制其全部论证。

本指南不是 ledger。实施会话不得在这里记录 `open/candidate/verified`、临时 SHA、测试流水或个人进度；Claim 状态只进入 active Campaign，稳定需求只进入 architecture sole owner。

## 1. 权威顺序与冲突处理

新会话必须按仓库根 `AGENTS.md` 的顺序读取：

1. [`../README.md`](../README.md)；
2. [`../architecture/README.md`](../architecture/README.md)；
3. 完整读取 [`../architecture/workbench.md`](../architecture/workbench.md)、[`../architecture/product-state.md`](../architecture/product-state.md)、[`../architecture/execution.md`](../architecture/execution.md)；
4. [`../execution-brief.md`](../execution-brief.md)；
5. status 为 active 时读取 [`../missions/independent-omnimind-v1.md`](../missions/independent-omnimind-v1.md)；
6. 读取设计说明；
7. 最后回到本指南选择当前可进入的最小切片。

权威关系：

| 事实                                                      | 唯一 owner                      | 本指南如何使用               |
| --------------------------------------------------------- | ------------------------------- | ---------------------------- |
| 产品身份、Pi adoption、品牌边界                           | `README.md`                     | 只消费，不改写来源事实       |
| Composer、Settings、普通展示名、双语、a11y                | `architecture/workbench.md`     | 决定用户结果                 |
| draft、Thread、Queue、receipt、恢复                       | `architecture/product-state.md` | 决定绑定和恢复语义           |
| Registry、adapter、Session、ModelRuntime、`.omnimind/.pi` | `architecture/execution.md`     | 决定执行 topology            |
| 仓库全局施工顺序和阶段门                                  | `execution-brief.md`            | 决定本任务能否进入           |
| Claim 状态和证据指针                                      | active Campaign                 | 只由授权 reviewer 更新       |
| 设计依据和 source observation                             | 设计说明                        | 用于定位和证伪，不凌驾 owner |

若 owner 与设计说明或本指南给出两个可执行答案：

1. 停止产品代码施工；
2. 用当前代码、固定 Pi package 或真实运行证据确认冲突；
3. 在当前授权覆盖时先修 sole owner，再同步设计说明和本指南引用；
4. 授权不覆盖时报告精确冲突，不凭更新时间或本文细节选边。

## 2. 当前任务的可观察结果

完整纵向结果是：

```text
用户在 Model services 中为 OmniMind 连接 Pi 支持的模型服务，
完成真实 API Key/OAuth 认证或使用真实 ambient auth，
按服务实例从供应商获取并保留模型目录；

用户回到任意空或已开始 Thread，
在 Context meter 右侧通过 Engine icon 选择执行引擎，
相邻的 Model + options 入口只展示该 Engine/Model 的真实能力；

选择只影响下一次发送，当前 turn 不热切，
发送时只 dispatch 一次，跨 Engine 走 stop-first replacement，
失败恢复上一 exact binding，不 silent fallback、不 replay，
Timeline 保留每个 turn 的 Engine/Model provenance。
```

执行顺序不要求一次提交完成全部结果。每个切片必须闭合一个可观察纵向结果，再进入下一切片。

## 3. 已锁定决定：不要在新会话重新发明

### 3.1 用户语言与身份

| 场景                                                               | 名称             |
| ------------------------------------------------------------------ | ---------------- |
| Composer、Engine menu、Model services 普通 UI、tooltip、aria-label | `OmniMind`       |
| runtime、技术详情、诊断、About、Licenses、source/provenance        | `OmniMind Agent` |
| 内部 Provider identity                                             | `omnimind`       |
| 独立 stock Provider                                                | `pi` / `Pi`      |

普通 UI 不显示 `Synara`、`Pi-derived`、adapter、Host、native state 等实现词。`OmniMind` 与 `Pi` 是两个可区分 Engine，不合并 identity。

### 3.2 Engine 图标（既有 owner）

- 直接复用 `apps/web/src/components/ProviderIcon.tsx`；
- 当前十个 Engine 已有完整 `Record<ProviderKind, Icon>` 映射；
- Codex、Cursor、Grok、Droid、Kilo、Pi 的官方单色语言保持原样；
- 不下载、不重绘、不重新着色、不建第二 icon registry；
- 只在实际渲染证明 size/alignment/a11y 有缺口时改共享 owner。

这组规则只约束 OmniMind、Codex、Pi 等 **Engine**，不拥有 OpenAI、Anthropic、DeepSeek、Xiaomi、Google 等 **模型服务**的视觉资产。

### 3.2.1 模型服务图标（E7 presentation）

维护者已选择 [LobeHub Icons](https://github.com/lobehub/lobe-icons) 作为模型服务/模型品牌视觉资产来源。实施必须：

- 使用精确锁定版本的 `@lobehub/icons`，显式按需导入，随 Desktop App 本地打包；不得使用 CDN、`latest` URL 或运行时远程请求；
- 默认使用彩色品牌图标，但颜色只帮助识别，不代表 connected/error/selected；文本、check、状态摘要与 accessible name 仍是 authority；
- 在 Web presentation owner 中建立一个薄的 model-service icon resolver；resolver 只把已知的稳定 runtime identity 映射为本地组件，不向 Server contract回写 icon slug/URL，也不参与 auth、catalog、capability、default 或 send gate；
- overview、添加搜索、详情页与 Composer model-service 分组复用同一 resolver；同品牌多实例共享品牌图标，以用户命名和非敏感实例标签消歧，不展示完整 UUID；
- 未命中的 builtin/model 使用统一模型服务 glyph或所属 service 图标；custom API 使用中性 API/连接 glyph；Extension 没有既有 trusted 本地资产时使用统一 Extension glyph；
- model-specific icon 只在 runtime model identity 与已打包 asset精确匹配时使用，绝不维护静态 model-slug catalog来追求覆盖率；
- 同一 implementation commit 同步 package/lock、MIT license/legal/SBOM、tree-shaking/bundle-size 与 packaged offline proof。

LobeHub 不是 Provider/Model authority，也不是新的产品 Registry。图标缺失必须安全退化为中性视觉，不能让真实 Pi service/model 从 UI 消失。

### 3.3 产品结构

```text
Engine
  └─ Model
      └─ 当前 Engine + Model 真实支持的 options
```

禁止重新引入：

- 通用“推理策略”；
- 常驻“Engine 特有能力”区域；
- 第三个 Fast 入口；
- Engine 菜单中的嵌套模型树；
- 跨 Engine capability matrix；
- 跨 Engine Session continuation。

### 3.4 Settings 边界

```text
Model services
  └─ OmniMind
       └─ bundled OmniMind Agent 的 Pi ModelRuntime

Agent engines
  ├─ Codex native setup
  ├─ Claude native setup
  ├─ OpenCode native setup
  └─ stock Pi / other Engine-native setup
```

`Model services` 不接管 Codex、Claude、OpenCode 或 stock Pi 的 credential/config。`Agent engines` 不复制 OmniMind 的模型服务表单。

### 3.5 Pi 跟随策略

- production baseline 当前是 Pi stable `v0.84.1`；
- `pi-coding-agent`、`pi-ai`、`pi-agent-core` 必须对齐；
- 模型服务、auth、catalog、refresh 和 provider 语义优先调用 Pi API；
- 不复制供应商 enum、默认 URL、静态模型镜像、`/models` fetcher 或 Proma Channel store；
- “比 Pi 更好”指更清楚、更安全、更可恢复、更适合桌面与多 Engine，不等于维护更多模型体系。

## 4. 新会话启动：15 分钟内完成的 preflight

### 4.1 精确工作区和 dirty state

```bash
pwd
git branch --show-current
git rev-parse HEAD
git status --short
```

要求：

- 必须位于 OmniMind 精确仓库；
- 记录但不覆盖未知修改；
- 若目标文件已有用户修改，先读 diff 并在同一内容上继续；
- 不为此任务创建第二 worktree、Mission、ledger 或临时架构文档。

### 4.2 Owner 漂移检查

```bash
rg -n "Model services|OmniMind Agent|OmniMind|Provider 与 Composer|Composer、Queue" \
  architecture README.md execution-brief.md missions/independent-omnimind-v1.md
```

确认至少满足：

- Settings section 名称是 `Model services / 模型服务`；
- 普通 Engine label 是 `OmniMind`，技术实体名是 `OmniMind Agent`；
- Model services 只属于 OmniMind 的 Pi ModelRuntime；
- Engine selection 只影响下一次发送；
- 跨 Engine 使用 inherited stop-first replacement；
- stock `.pi` 与 `.omnimind` 隔离。

### 4.3 Pi 版本漂移门

先读本地固定版本：

```bash
rg -n "pi-(coding-agent|agent-core|ai).*0\.84\.1|omnimind-pi-coding-agent" \
  apps/server/package.json bun.lock README.md execution-brief.md
```

确实需要判断上游是否变化时，使用官方 npm/GitHub 信息核对，但不要在 argv、日志或文档中携带任何 credential。

若本地 pinned version、vendor archive、README adoption、设计说明 snapshot 任一不一致：停止使用本文的 Pi API 断言。

若 npm latest 已高于本地 baseline：

1. 不在 Composer/Settings feature diff 中顺手升级；
2. 按根 adoption policy 发起独立 source intake；
3. 复验 ModelRuntime auth、refresh、custom-provider persistence 和 package isolation；
4. owner、README adoption、lock/vendor 和设计说明同步后再回到本任务。

### 4.4 代码事实复验

```bash
rg -n "ProviderKind|PROVIDER_DISPLAY_NAMES" packages/contracts/src
rg -n "PROVIDER_ICON_COMPONENT_BY_PROVIDER" apps/web/src/components/ProviderIcon.tsx
rg -n "useProviderModelCatalog|ProviderModelPicker|ComposerModelEffortPicker|TraitsPicker" apps/web/src
rg -n "ModelRuntime\.create|listModels|registerProvider|login\(|logout\(|refresh\(" apps/server/src/provider
rg -n "lockedProvider|ensureSessionForThread|thread\.turn\.start|thread\.meta-updated" apps/web/src apps/server/src
```

目标不是复制输出进文档，而是确认设计说明 §4 的 observation 尚未漂移。

### 4.5 基线检查

使用仓库脚本，不用临时 `bunx tsc` 替代锁定工具链：

```bash
bun test apps/web/src/components/ProviderIcon.test.tsx
bun run --cwd apps/web typecheck
```

然后按当前准备进入的切片运行最窄 baseline。旧测试可能锁定旧产品行为，例如 started Thread 禁止换 Engine；这类绿色只证明现状可复现，实施前必须先改测试意图。

## 5. 实施总图与依赖

```text
E0  Authority + characterization
 │
 ├── E1  Model services read-only projection
 │     └── E2  API Key + provider-scoped refresh
 │
 └── E3  Composer Engine icon + stable Model/options structure
       └── E4  next-turn cross-Engine replacement + Queue/failure

E2 ──┬── E5  OAuth typed interaction
     └── E6  custom provider + multi-instance  [hard entry gate]

E2 + E3 + E4 + E5/E6 required scope
       └── E7  Settings cleanup, search, i18n, a11y
             └── E8  live + packaged exact-SHA proof
```

默认优先闭合 `E1 -> E2`，再完成 `E3 -> E4`；这是优先级，不是把依赖图改写成数字串行。某一 slice 命中 stop 后，只能进入依赖图中不依赖它的边；因此 E1 stop 不允许 E2，但不阻塞 `E0 -> E3 -> E4`。原因见设计说明 §12：默认 OmniMind 没有可用模型服务时，漂亮的 Composer selector 仍是空壳。

每个切片单独满足：

```text
明确 entry
→ 一个可观察结果
→ 最小 owner 内修改
→ focused falsifier
→ exit 或 stop
```

## 6. E0 — Authority 与行为基线

### Outcome

不改视觉，先证明后续实现不会建立第二状态或推翻 Queue/rollback 语义。

### 设计映射

- 设计说明 §1–§3：产品目标和术语；
- §4：当前代码事实；
- §6–§8：selection、切换和 options；
- §14.1–§14.3：测试矩阵；
- §17：stop-loss。

### 必须钉住的行为

1. 空 Thread 与 started Thread 最终使用同一 Composer 控件结构；
2. Engine menu selection 只更新 desired next-turn selection；
3. 当前 running turn 不热切；
4. Queue item 的 selection 绑定时点与 owner 一致；
5. target failure 后 runtime binding 与 Footer projection 不分叉；
6. Pi discovery 保持 intent-gated；
7. 目标 Engine 无可用模型时 fail closed，不回落 Codex 字符串。

### Queue hard question

检查实际 Queue command/admission path：

- 若 Queue item 在 admission 时已携带 exact `ModelSelection`，后续 Composer 修改不得重写它；
- 若当前 owner 明确定义 dispatch 时才绑定，测试应表达该事实；
- 若代码和 `product-state.md` 无法唯一推出绑定时点，停止 E4，先修 Product State owner。

不得通过新增 Queue ledger、binding store 或 `pendingEngine` 解决歧义。

### Exit

- focused tests 能表达上述七项目标；
- owner 无冲突；
- 没有新持久化 schema；
- 旧绿色不再被误作目标绿色。

## 7. E1 — Model services 只读真实投影

### Outcome

Settings 中的 `Model services / 模型服务` 显示 OmniMind 当前真实模型服务、auth 状态以及 known/available 模型数量；打开页面除物理隔离所需的 stock `.pi` root metadata 解析外，不枚举、打开或读取 stock `.pi` 内的任何 state，不执行 credential command，不联网刷新。

### 设计映射

- 设计说明 §9；
- §10.2–§10.9；
- §10.16–§10.17；
- §11；
- §14 与 §15。

### 复用裁决

- `direct-import`：`SettingsPanelPrimitives.tsx` 的 section/row/list/overlay 行为；
- `direct-import`：现有 Settings route、search、deep-link 和 `section=models`；
- `mechanism-only`：Proma 的列表→详情→返回任务流；不复制其组件或 Channel backend；
- Pi `ModelRuntime` 是 provider/auth/model truth；renderer 不建静态镜像。

### Server 最小面

新增一个 OmniMind-scoped typed projection owner，名称按仓库 RPC 风格确定。只读阶段只需要：

```text
list services
get service detail
```

返回非敏感字段：

```text
serviceId/providerId
displayName
origin
authMethods metadata
safe auth status/source label
knownModelCount
availableModelCount
supportsNetworkRefresh
safe stale/error summary
```

禁止返回：

- key/token/完整 credential；
- 展开的 env/command credential；
- 任意 filesystem path；
- 完整敏感 endpoint/header；
- raw provider response。

### ModelRuntime 生命周期

- 每个 Settings 查询使用精确 `.omnimind` agentDir；
- 不接受 renderer 传任意路径；
- 使用 task-local runtime 或已有等价 isolation owner；
- 不把一个全局可变 ModelRuntime 注入所有 Thread；
- 不触碰 `.pi`；
- 页面 mount 只读取静态/last-good state，不 `allowNetwork: true`。
- 同一个 physically-contained、no-follow、hard-byte-bounded、caller-cancellable reader 拥有 config/cache read；禁止 preflight 后让 runtime reopen、含 secret 的临时副本与第二套 `models.json` parser/schema；
- 被动 mount 不加载/执行 extension；extension provenance 只来自已经由显式 intent scope 加载的 Pi runtime；
- OAuth 静态 access expiry 只映射 `refresh_required`，不能称 `sign_in_expired`。

### Web

优先改造现有 `ModelsSettingsPanel.tsx`，不要平行新建第二 Models 页面。首个只读版本包含：

- title `Model services / 模型服务`；
- 普通描述使用 `OmniMind`；
- 已配置/保存过的服务列表；只有 Product State 提供 exact stable service id 时才 join 被引用服务，否则延后到 E3，不从默认模型或 model slug 推导；
- setup-required、checking、stale/error、empty；
- 已知/可用模型数量口径；
- 不渲染 Git writing default；底层字段保留，新归属由调用功能 owner 在 E7 单独确定。

不要把 Pi 所有 built-in provider 平铺成几十条资产。

### Focused proof

- list/get contract schema tests；
- `.omnimind` physical agentDir、directory/leaf symlink fail-closed tests；
- 隔离 fake `.pi` root 的 symlink/junction alias falsifier：candidate 等于 alias target 或其子树时 typed fail；
- 隔离 fake `.pi` 的 credential/config/catalog/package/Session zero-open、zero-content-read、zero-write trace falsifier；只允许精确 root containment metadata probe，而不是 lexical mock 断言；
- oversized `models.json` 与 abort-during-read falsifier；
- secret redaction tests；
- `ModelsSettingsPanel` loading/empty/connected/stale/error tests；
- zh-CN/en key parity。

### Exit

在无 mutation 的情况下，页面已能准确回答：OmniMind 当前有哪些服务、认证是否可用、已知与当前可用模型各有多少。

## 8. E2 — API Key 与“从供应商获取”

### Outcome

用户能通过 Pi 原生 auth interaction 保存/替换/移除 API Key，并只刷新目标 service 的网络目录；刷新失败保留 last-good，当前 turn 不热切，下一次 send 使用刷新后的 runtime snapshot。

### 设计映射

- 设计说明 §10.5–§10.7.2；
- §10.10、§10.13、§10.15、§10.19；
- §10.23 验收矩阵。

### Typed auth bridge

必须桥接 Pi 的真实 interaction：

```text
prompt: text | secret | select | manual_code
event: info | auth_url | device_code | progress
```

每个 request：

- 使用不可猜测、短生命周期 id；
- 绑定 Desktop client、service id、auth type；
- cancel/timeout 传递同一个 AbortSignal；
- renderer 不能自行宣告成功；
- secret 不进 URL、query cache、draft、Timeline、toast 或日志。

持久 API Key 必须走：

```text
ModelRuntime.login(serviceId, "api_key", interaction)
ModelRuntime.logout(serviceId)
```

`setRuntimeApiKey/removeRuntimeApiKey` 只能用于明确的未保存预览，不能显示为已保存/已删除。

### Provider-scoped refresh

真实“从供应商获取”必须调用等价于：

```text
refresh({ providers: [serviceId], allowNetwork: true, force: true, signal })
```

完成后重新读取该 service 的 known/available models，再计算数量。普通 React Query refetch 不等于网络刷新。

状态必须区分：

```text
fetching
success
refresh failed + last-good retained
cancelled
unsupported
auth updated but local synchronization failed
```

### Session reconcile

Settings mutation 完成后：

1. 失效 Model services projection；
2. 失效 OmniMind model catalog query；
3. 递增或复用 agentDir-scoped process-local mutation revision；
4. 当前 turn 不变；
5. 下一次 OmniMind send admission 前，Session 自己的 runtime 以 `allowNetwork: false` 应用 last-good auth/catalog snapshot；
6. reconcile 失败则阻止 send，不拿旧 snapshot 猜测。

该 revision 不是持久化产品事实，不进入数据库。

### Focused proof

- API Key 重启后仍由 Pi credential store 识别；
- renderer 永不收到 secret 明文；
- 多 prompt 顺序、cancel、timeout 正确；
- refresh 只命中目标 service；
- refresh fail/cancel 不清空 last-good；
- static provider 不显示假按钮；
- `CredentialSynchronizationError` 重读 metadata，不重复提交；
- active turn 不热切，下一 turn 前 runtime reconcile；
- `.pi` 不变。

### Exit

一个真实 Pi-supported API-key provider 能在隔离 profile 中完成：连接→获取模型→Composer 可选择→关闭/重开仍可用。

## 9. E3 — Composer Engine icon 与稳定 Model/options 结构

### Outcome

Context meter 右侧始终有可访问的 Engine icon；右侧相邻入口只管理当前 Engine 的 Model + options。空 Thread 与 started Thread 结构不变。

### 设计映射

- 设计说明 §1–§5；
- §6；
- §8；
- §11；
- §14.1–§14.2。

### 组件复用

优先路径：

1. 复用 `ProviderIcon.tsx`；
2. 从现有 `ProviderModelPicker` 提取 Engine menu content，或在无法保持职责时新增局部 `ComposerEnginePicker.tsx`；
3. 保留 `ComposerModelEffortPicker.tsx` 作为当前 Engine 的 Model + options popup；
4. 保留 `TraitsPicker.tsx` / `composerTraits.ts` 的 capability-driven controls；
5. 保留 `composerFooterLayout.ts` 的真实测量降级；
6. 使用现有 menu/tooltip/focus primitive，不引入新 UI 库。

若新增 `ComposerEnginePicker`，它只能：

- render current Engine icon；
- 展开 Registry-driven menu；
- 展示真实 status；
- 调用现有 per-Engine draft selection；
- 触发被选择 Engine 的 intent-gated discovery。

它不能拥有 registry、default model、auth、Session replacement、持久化或 traits schema。

### Footer 结构

```text
Context meter | Engine icon | Model + current options | Mic | Send/Stop
```

窄宽降级顺序：

1. Context meter；
2. option summary；
3. model name；
4. 保留 Engine icon；
5. 保留 Send/Stop。

### Engine menu

- trigger icon-only；
- tooltip、aria-label、菜单行使用普通展示名 `OmniMind`；
- 当前项有 check，不只靠颜色；
- status 真实显示 checking/auth/unavailable/not-installed；
- 打开菜单不触发 `.pi` discovery；
- 用户主动选择/浏览 Pi 后才触发 Pi intent gate；
- 不嵌套模型树。

### Default resolver

选择 Engine 后按设计说明 §6 恢复该 Engine 的最佳有效 selection。删除最终 `getDefaultModel("codex")` 跨 Engine fallback。无有效候选时：

```text
No available model
Send disabled
Refresh / Open Model services / Open engine settings
```

### Options

- Codex Fast 保留在 Model/options popup，不新增常驻按钮；
- 评估并删除 `ComposerExtrasMenu` 中重复 Fast；
- Pi/OmniMind 显示 `thinkingLevel`；
- OpenCode/Kilo 显示 `Variant/Agent/Mode`；
- 没有 options 时不显示空 section；
- 不把这些字段统一翻译为 Effort。

### Focused proof

- `ProviderIcon` mapping；
- 空/started Thread 同结构；
- icon-only tooltip/aria/keyboard/focus；
- Engine select 自动恢复有效 selection；
- Pi intent gate；
- 无模型 fail closed；
- capability-specific sections；
- 窄 Footer 仍保留 Engine + Send；
- zh-CN/en。

### Exit

不改 runtime replacement 的前提下，Composer 已形成稳定、准确、可访问的 desired selection UI。

## 10. E4 — next-turn 跨 Engine replacement

### Entry

- E0 已明确 Queue binding；
- E3 desired selection UI 已稳定；
- `ProviderService` 的 stop-first + exact restore 基线测试通过。

### Outcome

用户能在 started Thread 为下一次发送选择其他 Engine；当前 turn 不受影响，发送只 dispatch 一次，失败恢复 exact old binding，不 replay、不 silent fallback。

### 设计映射

- 设计说明 §4.11–§4.13；
- §7；
- §8；
- §14.3。

### 最小代码路径

继续使用：

```text
Composer draft ModelSelection
  -> thread.turn.start(modelSelection)
  -> ProviderCommandReactor.ensureSessionForThread
  -> ProviderService stop/start/restore
  -> adapter dispatch
```

不新增 `engine.switch` RPC、第二 binding store 或跨 Engine resume contract。

### Commit boundary

推荐：menu selection 只写 desired selection，`thread.turn.start` 才是 replacement commit point。

```text
select target
  -> keep old runtime Session
send
  -> validate target
  -> stop old
  -> start target
  -> bind exact generation/session
  -> dispatch once
```

若保留 idle `thread.meta-updated -> ensureSessionForThread` eager path，必须额外证明选择菜单没有启动/停止/auth 副作用，且失败时 UI 与 runtime 同步 rollback；否则删除 eager ensure 是更小路径。

### Failure

target start 失败后恢复：

- Engine/provider；
- model；
- provider-private options；
- generation；
- Session/native handle；
- resume cursor（真实支持时）；
- pending ownership。

不得把 prompt 自动发送给恢复后的旧 Engine。Footer 对已 commit 失败选择应回滚到旧 exact binding，并保留 draft/attachments 供用户重试。

### Focused proof

- idle Codex→Claude：stop old→start target→dispatch once；
- running Codex 时选 Claude：当前 turn 仍为 Codex；
- admitted Queue item 不被后续选择改写；
- target validation failure 不 dispatch；
- target start failure exact restore；
- restore failure 显示 terminal/unknown，不伪造 recovered；
- late old generation event 不能夺回 active ownership；
- same-Engine in-session/restart-session 分别按 capability；
- 跨 Engine 不携带 native resume cursor；
- Timeline provenance 正确。

### Exit

started Thread 的真实往返切换可用，失败语义、Queue 和 provenance 都有自动化证据。

## 11. E5 — OAuth

### Entry

E2 typed auth bridge 已稳定；Pi provider metadata 明确暴露 OAuth capability。

### Outcome

用户能完成 Pi provider-owned browser/device/manual-code OAuth，cancel/timeout/logout 和 catalog refresh 分别准确呈现，token 永不进入 renderer/cache/log。

### 设计映射

- 设计说明 §10.6；
- §10.10；
- §10.14；
- §10.23。

### 规则

- 只对真实 capability 显示 OAuth；
- auth URL 校验 scheme，显示目标域，由用户主动打开；
- OAuth 成功与 refresh 失败是两个事实；
- pending instance 的创建/清理必须有明确生命周期；
- 同品牌 built-in 支持 OAuth，不代表任意 custom id 自动支持；
- logout 只影响目标 service instance；
- stock Pi OAuth 不进入此页面。
- browser loopback completion/error 使用亮色 OmniMind品牌与OmniMind图标，并通过同一request-scoped renderer覆盖真实接线的browser callback providers；不为OpenAI或其他单一供应商复制页面；
- callback收到授权只显示“已收到授权/Authorization received”，Pi完成token exchange和credential commit前不得声称“登录成功/已连接”；App中的同一typed login outcome仍是唯一成功authority；
- renderer只接收安全展示状态，不接收code、token、Provider message/details或原始诊断；缺失/失败时保留stock页面，device-code、state validation、token exchange与callback server保持Pi owner。

### Exit

至少一个真实 OAuth provider 在隔离 profile 中完成 login→catalog→reopen→logout；无 token 泄漏，无 `.pi` 变化。

## 12. E6 — custom provider 与同供应商多实例

### Entry decision（已满足）

维护者于 2026-08-13 明确要求并授权真实的 custom-provider 持久配置；“无法保存”、禁用占位或永久隐藏都不是可接受产品结果。锁定 Pi 尚无公开 persistent mutation API，因此本轮只能在既有 product-owned Pi source adoption 内，为 Pi 自己的 ModelConfig/ModelRuntime owner增加一个窄、typed、可删除的持久 mutation seam。stock Pi保持原样；上游出现等价 API 后删除补丁，不保留双轨。

这项授权不允许 Host 自建 `models.json` parser/writer、第二配置 store、Provider Registry、catalog fetcher或数据库。Pi继续唯一拥有 comments/JSON/schema/composition/validation、unknown-field preservation、locking、atomic replace、reload validation与错误；Host只负责typed输入、physical containment、secret边界和mutation后的runtime/catalog reconcile。实现若无法保持这个边界，E6仍应停止并报告精确 blocker，而不是退化成假入口。

### Outcome

同一商业供应商可存在多个 Pi 可表达的稳定 service instance，credential/config/catalog/model identity 隔离，Composer 能消歧；不新建 Channel runtime 或第二 catalog truth。

产品入口必须保持分层：搜索/选择 Pi runtime 真实服务是主路径；列表尾部“没有找到？通过 API 地址连接”是弱一级补充。普通 API 地址配置只允许 Pi `models.json` 官方支持的 `openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai`；非标准 API 只来自 Pi Extension。次路径必须完成“填写 → 测试 → 保存 → 重开仍存在 → 编辑/重新测试/刷新/删除”的完整旅程；精确build尚未拥有capability时不显示入口，不能显示“尚未开放”的死操作，也不能把隐藏当成E6完成。

### 设计映射

- 设计说明 §9.3；
- §10.7.3；
- §10.10–§10.12；
- §10.16–§10.18；
- §10.22 Slice 4。

### Identity

```text
provider brand != service instance id

deepseek
deepseek-proxy
deepseek-research
```

- providerId 创建后稳定；
- rename 只改 display name；
- model identity 携带 instance providerId；
- credential、endpoint、catalog 分实例；
- built-in identity 不删除，只移除 credential；
- custom instance 可删除，但先处理 selection 引用。

### 不得伪造

- 新 id 不自动继承 built-in OAuth；
- 没有 dynamic catalog implementation 时不显示“从供应商获取”；
- Pi 没有通用 provider/model enabled flag，不添加 toggle/checkbox；
- 不按品牌名复制 stream、compat 或 thinking behavior；
- renderer 不直接写 `models.json`；
- 不建立 `model-services.json`。

### Pi-owned persistent mutation seam

- seam 位于既有 product-owned Pi adoption 的 ModelConfig/ModelRuntime owner，不位于 React、Host service 或另一个配置包；
- 只对目标 `providers[providerId]` 做 typed upsert/remove，并保留根和其他 provider全部未知字段；
- locked read-modify-write、temp file、Pi reload validation与atomic replace由同一Pi owner完成；
- credential继续遵循Pi credential store/reference语义，不把明文secret写进renderer、日志或Host产品配置；
- 不格式化重写无关内容；stock Pi默认行为不变；
- Pi上游API adopted后删除该seam，不保留永久兼容双轨。

### Exit

两个同供应商实例能独立连接、获取/定义模型、在 Composer 中消歧、重启恢复；删除一个不会修改另一个、stock `.pi` 或 Conversation。

## 13. E7 — Settings 归位与产品收口

### Outcome

旧 `Models & writing` 身份和跨 Engine custom slug 混杂消失；Settings search/deep-link、双语、a11y 和普通展示名全部一致。

### 设计映射

- 设计说明 §10.2–§10.4；
- §10.20–§10.22；
- §15。

### 必做

- `settingsNavigation.ts`：label/description 改为 Model services，section id 仍为 `models`；
- i18n：简中/英文 key 与 placeholder 一一对应；
- search index：API Key、OAuth、从供应商获取、自定义服务、服务实例等可搜索；
- Git writing default 退出 Model services；底层字段保留，搜索/deep-link 在调用功能新归属确定后迁移，不能继续指向不存在 row；
- Git writing default 的精确新归属可以在本slice内后定，但 E7 Exit 前必须二选一：迁移到真实调用功能并恢复可达搜索/deep-link，或由维护者明确退休该产品能力；不能以 `defer` 静默删除唯一入口；
- 独立 Engine custom slug 控件归 `Agent engines` 对应 detail，底层 storage 不迁移；
- Pi Extension 模型服务是 V1 必达能力：被动 Settings 页面不得执行 Extension；用户显式进入添加流程后，复用 Pi 既有 ResourceLoader/Session provenance owner 做 intent-scoped 加载，并让真实 Extension provider 可搜索、可进入 detail，origin准确为 `extension`；
- 锁定 OmniMind Agent runtime 已暴露的 manager/loader/settings/trust 与 install/update/remove/reload/enable lifecycle 必须通过既有 Agent skills/Engine detail owner可发现、可操作、可恢复；只有runtime确实未暴露的动作才隐藏，不复制package manager、不建立跨Provider共享Package state；
- legacy `customOmniMindModels` 不再由新 UI 创建，既有值无损读取并提供显式转化/移除；
- 普通 UI `OmniMind`，技术 detail `OmniMind Agent`；
- 不用可翻译 title 当稳定 anchor；
- service deep-link 只携带非敏感 id。
- overview、添加、详情在同一 Settings pane 内互斥；概览只列configured/recoverable/currently-blocking实例，添加页以搜索和紧凑键盘列表为主，详情替换列表并在返回时恢复query/scroll/focus；禁止四十项卡片墙或把详情追加到长列表底部；
- 模型服务视觉使用 §3.2.1 的单一 presentation resolver：彩色 LobeHub 资产随 App 本地打包，Engine `ProviderIcon` 不改，unknown/custom/Extension 安全降级；正常 UI 不暴露完整 service UUID；
- overview、添加搜索、详情页与 Composer service group 的 icon/name/status保持一致；logo缺失不影响真实service/model可见性，状态不只靠颜色；

### A11y/响应式

- action 不依赖 hover；
- keyboard 打开/选择/Escape/return focus；
- secret show/hide、login、refresh、remove、delete 有 accessible name；
- OAuth progress 不重复播报；
- 窄宽列表保留 service identity；
- destructive confirm 返回原 action；
- technical raw error 只在展开详情。

### Exit

Settings 中不存在两个页面管理同一 credential/model-service lifecycle，旧名称无正常可达残留，中英文与搜索/deep-link 真实可用。

## 14. E8 — 验证与 packaged 交付

### 14.1 Focused automatic gates

按触达范围选择，不机械跑全部：

```bash
# Web unit
bun test \
  apps/web/src/components/ProviderIcon.test.tsx \
  apps/web/src/components/ModelServiceIcon.test.tsx \
  apps/web/src/components/composerFooterLayout.test.ts \
  apps/web/src/composerDraftStore.models.test.ts \
  apps/web/src/hooks/useProviderModelCatalog.test.tsx \
  apps/web/src/components/settings/ModelsSettingsPanel.test.ts

# Browser picker/settings
bun run --cwd apps/web test:browser -- \
  src/components/chat/ComposerModelEffortPicker.browser.tsx \
  src/components/chat/ProviderModelPicker.browser.tsx \
  src/components/chat/TraitsPicker.browser.tsx \
  src/components/settings/ProvidersSettingsPanel.browser.tsx

# Server owner tests
bun test \
  apps/server/src/orchestration/Layers/ProviderCommandReactor.test.ts \
  apps/server/src/provider/Layers/ProviderService.test.ts \
  apps/server/src/provider/Layers/PiAdapter.test.ts

# Relevant area gate
bun run --cwd apps/web typecheck
bun run --cwd apps/server typecheck
bun run --cwd packages/contracts typecheck
```

新增 Model services contract 后同步 contracts/Web/Server schema tests。候选冻结后再按 `execution-brief.md` 和 Campaign 跑相关 full gate。

### 14.2 Live provider

涉及 auth/model/refresh/thinking/stream/tool/abort/recovery 时，在 focused fixture 后使用仓库授权资源做最小真实证伪：

- 优先 Xiaomi MiMo 与 DeepSeek；
- 区分直连、OpenAI-compatible 和代理转换；
- 请求有硬 timeout、费用边界和停止条件；
- 只报告脱敏 capability/result；
- 不把 key、完整 endpoint、账号、原始响应写进 argv、聊天、日志、截图、artifact 或 Git；
- 单个渠道偶然行为不进入通用补偿逻辑。

最小 journey：

```text
Model services connect
  -> provider-scoped refresh
  -> Composer select valid model
  -> first turn + continuation
  -> thinking/stream/tool
  -> abort/timeout
  -> next-turn Engine switch
  -> failure/restore where safe
```

### 14.3 Packaged Desktop

任何改变 Desktop 用户可观察行为的 candidate 都必须：

1. 从精确 pushed SHA 重建产物；
2. 安装/替换本机 OmniMind App；
3. 停止所有现存 OmniMind 实例；
4. 以任务专用 `userData`、home、Provider private home 启动；
5. 从 Main、Helper/Renderer、bundled Server runtime 证据确认隔离路径；
6. 完成启动→真实 journey→关闭→重开；
7. 不读取、迁移或修改真实用户 `.pi`、`.omnimind`。

Packaged journey：

```text
fresh launch
  -> Model services connect/refresh
  -> new Thread
  -> choose Engine icon
  -> verify automatic valid model
  -> choose real option
  -> send
  -> choose another Engine for next turn
  -> verify provenance/no replay
  -> close/reopen
  -> verify service/catalog/selection/Thread recovery
```

### 14.4 Claim honesty

- producer 只提交 `candidate` evidence；
- typecheck/unit/browser 绿色不证明 packaged/live；
- macOS 本机不证明 Windows/Linux；
- unsigned local artifact 不证明 release；
- 本任务不得顺手解除 Campaign 已冻结的 signing/runner blocker。

## 15. 文件触达地图

实际 diff 保持最小；下表是 owner map，不是要求全部修改。

| 结果                  | 首要文件                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| 普通显示名 `OmniMind` | `packages/contracts/src/model.ts`、明确的 UI-only hardcoded consumers、i18n/tests |
| Engine icon           | `apps/web/src/components/ProviderIcon.tsx`（通常不改）                            |
| Model service icon    | Web presentation 内局部 `ModelServiceIcon`/resolver、`@lobehub/icons` explicit imports；不进入 Server Registry/contract |
| Engine picker         | `ChatView.tsx`、`ProviderModelPicker.tsx` 或局部 `ComposerEnginePicker.tsx`       |
| Model + options       | `ComposerModelEffortPicker.tsx`、`TraitsPicker.tsx`、`composerTraits.ts`          |
| Footer 响应式         | `composerFooterLayout.ts`                                                         |
| selection/default     | `composerDraftModels.ts`、draft actions/domain/store tests                        |
| catalog               | `useProviderModelCatalog.ts`、provider discovery query owner                      |
| Model services UI     | `ModelsSettingsPanel.tsx`、Settings primitives、navigation/search/i18n            |
| 独立 Engine 设置      | `ProvidersSettingsPanel.tsx`                                                      |
| Host contract         | contracts IPC/WS schema、Web native API、Server RPC handler                       |
| Pi runtime routing    | `PiAdapter.ts` 或提取的 agentDir/task-runtime factory                             |
| replacement           | `ProviderCommandReactor.ts`、`ProviderService.ts`（优先只复用）                   |

不要把 `PROVIDER_DISPLAY_NAMES.omnimind = "OmniMind"` 机械扩张到 Server technical `displayName`；先按 consumer 语境区分普通 UI 与 runtime diagnostics。

## 16. Commit 与交付边界

遵循仓库 `AGENTS.md`：

- 一个真实闭合关注点一个 commit；
- 只 stage 当前任务路径；
- 不覆盖未知修改；
- focused 绿后默认 push 当前任务分支；
- push 不等于公开发行；
- 用户可见代码必须从 exact pushed SHA 做 packaged proof；
- 文档-only 改动不重复打包。

建议关注点边界：

```text
1. owner/naming/document routes
2. Model services read-only contract + UI
3. API-key auth + refresh + runtime reconcile
4. Composer Engine/Model-options composition
5. cross-Engine next-turn replacement
6. OAuth
7. custom provider/multi-instance（若 entry gate 满足；主/次入口层级与四种 generic API 固定）
8. Settings cleanup + i18n/a11y
```

不要把所有切片压成一个不可评审 commit，也不要为每个小文件制造独立 commit。

## 17. Stop-loss

出现任一情况立即停止当前切片：

1. owner、设计说明和当前代码对同一行为给出不同答案；
2. Pi version/source/API 已漂移，固定 0.84.1 结论不再适用；
3. 需要新持久化 schema，但现有 draft/state 的具体反例尚未证明；
4. 为 Engine picker 准备新增 Registry、default model table 或 switch RPC；
5. 为 Model services 准备增加通用 ProviderAdapter CRUD/auth；
6. 开始维护静态供应商 enum、URL、模型镜像或 `/models` parser；
7. query invalidation 被当成 active Session runtime 同步；
8. custom provider 实现需要越出已授权的 Pi-owned typed seam，转而新增 Host parser/writer、第二配置 store、Registry 或 catalog fetcher；
9. Queue binding 时点无法从 owner/代码唯一推出；
10. failure 后 UI 与 runtime rollback 语义不唯一；
11. 测试为了方便迫使生产增加第二状态/接口；
12. packaged journey 使用默认 profile，无法证明 private-home isolation；
13. UI diff 扩张成 Settings taxonomy 或视觉系统重做；
14. 为图标覆盖开始维护第二 Provider/Model Registry、静态 model-slug 目录、远程 CDN/URL、运行时下载或 Server icon authority；缺失图标必须用本地中性 glyph fail soft；
15. 同一失败重复且没有新假设；
16. 锁定 Pi runtime 对 `models.json` 只有 path-based direct reopen，无法注入 physically-contained、bounded、cancellable reader；此时不得 patch vendor、落 secret-bearing temp copy或复制 Pi schema。E1 保持 blocked，可按依赖图转入 E3；E2 仍 gated；
17. Pi intake 后 `provider_default` 仍依赖 select prompt 首项；只有该首项继续由上游明确标为 default/recommended 时才可自动采用，否则 fail closed 到显式用户选择，不新增 Host auth Registry。

停止后只允许：

- `GO`：新证据证明当前最小路径成立；
- `SIMPLIFY`：删除重复层、回到既有 owner；
- `RE-SCOPE`：返回 sole owner 或维护者裁决。

## 18. 新会话第一次输出应是什么

新会话读完 owner、设计说明和本指南后，不应先写一篇新方案。第一次实质输出应简洁说明：

```text
Current snapshot: <HEAD / dirty paths / Pi baseline>
Current slice: <E0–E8 中唯一一个>
Observable outcome: <这个切片完成后用户能做什么>
Reuse decision: <直接复用哪些现有 owner，仅新增什么薄接线>
Proof: <focused tests / live / packaged 中本切片需要哪些>
Stop condition: <本切片最可能触发的真实门>
```

然后直接从当前切片施工。不要重新讨论已经锁定的 Engine/Model/options 心智模型、图标颜色、Settings taxonomy 或 Pi 跟随原则。

## 19. 最终完成判定

本任务完整 candidate 必须同时满足设计说明 §15 的完成定义，并且：

- 普通 UI 使用 `OmniMind`，技术语境保留 `OmniMind Agent`；
- 所有 Engine 复用唯一 icon registry；
- 模型服务视觉复用唯一、本地打包的 LobeHub presentation resolver；Engine icon owner 不变，unknown/custom/Extension 有本地 fallback，图标不参与 identity/capability；
- Model services 真实调用 Pi ModelRuntime，不复制供应商实现；
- API Key/OAuth/refresh/custom instance 只按 Pi capability 出现；
- `.omnimind` 与 `.pi` 隔离；
- Engine icon + Model/options 在空/started Thread 结构稳定；
- Codex Fast、Pi Thinking、OpenCode/Kilo Variant/Agent 等原生优势保留；
- selection 只影响下一次发送；
- Queue、replacement、failure restore、provenance 有证据；
- 无跨 Engine resume、silent fallback、prompt replay；
- search/deep-link/i18n/a11y/响应式完整；
- focused、live、packaged exact-SHA 证据与声明强度匹配；
- Campaign reviewer 独立裁决 verified，producer 不自证完成。

一句话执行原则：

> 先让 Pi ModelRuntime 的真实能力通过最薄 Host surface 成为 OmniMind 的 Model services，再让 Composer 只选择真实 Engine、真实模型和真实私有选项；所有发送、替换、恢复与 provenance 继续走 inherited Product Orchestration。
