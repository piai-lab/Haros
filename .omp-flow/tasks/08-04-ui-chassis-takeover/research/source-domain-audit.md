---
type: "Research"
title: "UI chassis source-domain and authority audit"
actor_id: "architecture_ui_qbd_2_1"
receipt: "75df7b9e0a564abc8c231cd6e01b1177"
---

# UI chassis source-domain and authority audit

## 1. 结论

固定 `vendor/ui` 是一棵完整、可运行但**按发布拓扑而非事实权威划分**的产品源码树。它的真实
边界不是简单的 Web / Desktop / Server 三层：

- Web 同时包含获准的 Workbench 物理母体、客户端投影/恢复机制，以及 donor
  `Thread / Project / Provider` ontology；
- Electron Main 同时承担成熟的 Desktop Host、安全桥、浏览器宿主、更新与恢复，也硬编码监督整套
  Server child；
- Server 同一进程、同一 Effect Layer 图内既运行产品持久化、transport、Workspace、Git、Terminal、
  attachment、automation 等 Product Control Plane 机制，也运行 Session、native queue/steer、retry、
  Provider registry、Pi SDK 和其他 Agent adapter；
- `contracts` 与 `shared` 是跨上述边界的实际 schema/behavior packages，不是可原样继承的中性工具包；
- 构建、生成与发布链把 Web 产物复制进 Server，再把 Server 与 Electron 一起封装，因此单搬
  `apps/web` 或把 `apps/server` 整体视为 Product Service 都会丢行为或带入第二套 Engine 权威。

所以未来接管的保全单位应是**可观察行为与其依赖闭包**，最终生产边界则必须按
`Product UI / Desktop Host / Product Service / isolated Native Host / typed contracts` 重切。`preserve`
不等于字节原样进入生产，`delete` 也不等于先删后补；任何竞争本体都要在唯一新权威和正常、失败、
恢复 proof 已建立后删除。该结论支持一次可回退的完整物理 transplant checkpoint，但反对把该
checkpoint 当作 production candidate。

## 2. 范围、方法与证据等级

本审计只读检查固定树的 authored source、package/build config、generated source 和相关测试，没有
编辑或重新构建 `vendor/ui`。精确来源和 unchanged build/smoke 已由
`research/source-review.md:9-13,70-89` 记录；没有触发需要重跑基线的事实变化。本问题能由固定本地
源码直接回答，未使用外部来源。

分类约定：

- **事实**：源码、构建配置或测试直接证明；每项给出 `file:line` anchor。
- **解释**：把事实映射到当前权威架构；权威裁决来自
  `architecture/product-state.md:13-17,27-33,56-65`、
  `architecture/execution.md:10-15,45-73`。
- **候选处置**：`保留` 指保留可观察行为/机制；`改写` 指保留行为但更换身份、schema、依赖或权威；
  `删除` 指替代 proof 后移除竞争本体；`再生成` 指从生产 source/config 确定性生成，不手改、不把
  donor 产物当 author source。

这是一份 design evidence，不授权生产搬运或删除。Workbench 的不可删除能力以
`architecture/workbench.md:168-203,301-305,332-353` 为准。

## 3. 物理拓扑与隐含运行图

根 workspace 收录 `apps/*`、`packages/*` 和 `scripts`，根 build 由 Turbo 递归执行并以 `dist/**`、
`dist-electron/**` 为产物；全局环境仍是 donor `U1_*` namespace
（`vendor/ui/package.json:2-9,25-62`；`vendor/ui/turbo.json:3-31`）。这意味着根 package、lock、patch、
build/release scripts 都是可运行闭包的一部分，不是外围杂项。

```text
authored Web routes/components/stores
  -> Vite + TanStack route generation
  -> apps/web/dist (+ .br/.gz)
  -> apps/server/dist/client
  -> apps/server/dist/index.mjs serves UI + typed/untyped RPC
  -> Electron Main spawns that server and opens BrowserWindow
  -> desktop artifact stages desktop dist + server dist + resources + native helper
```

直接证据：

1. Web build 使用 TanStack Router generator、React compiler、Tailwind，并在 build 后裁剪 icon、生成
   precompressed sidecars；注释明确指向 Server static route
   （`vendor/ui/apps/web/vite.config.ts:45-102,108-180,185-203`）。
2. Server build 将 `apps/web/dist` 复制到 `apps/server/dist/client`
   （`vendor/ui/apps/server/scripts/cli.ts:122-156`）。
3. Desktop start/smoke 同时依赖 Desktop、Web、CLI build
   （`vendor/ui/apps/desktop/turbo.jsonc:5-21`）。
4. Electron Main 将 `apps/server/dist/index.mjs` 当 backend entry
   （`vendor/ui/apps/desktop/src/main.ts:1013-1021`），并以 Electron binary 的 Node mode spawn
   （`vendor/ui/apps/desktop/src/main.ts:3250-3296`）。
5. 发布脚本将 `apps/desktop/dist-electron`、Desktop resources、`apps/server/dist` 和 macOS AppSnap
   helper 装入同一 stage，再调用 Electron Builder
   （`vendor/ui/scripts/build-desktop-artifact.ts:953-1019,1021-1092`）。

**解释：** Web-only transplant 不可运行；Server-whole transplant 会把 Product 与 Engine authority
一起提升；Desktop Main 若只做路径重命名，仍会把两种 child lifecycle 混成一个 backend。首批物理
接管必须带齐构建闭包，但后续责任切割必须改变这张运行图。

## 4. Web source domains

Web package 本身依赖 contracts/shared、React/TanStack/Zustand、Lexical、Diff/PDF、virtual list 和完整
xterm stack，已经是工作台应用而非 component library
（`vendor/ui/apps/web/package.json:20-63`）。下面按真实职责映射主要 source domain。

| Source domain | Anchors 与源码事实 | 当前事实权威 / 受保护行为 | 候选处置 |
| --- | --- | --- | --- |
| route shell 与一级布局 | authored routes 包含 chat、settings、plugins、PR、kanban、automations、studio；generated tree 逐项装配这些 route（`vendor/ui/apps/web/src/routeTree.gen.ts:7-24,327-334`）。`_chat.tsx` 统一拥有 Sidebar、全局快捷键和内容 seam（`vendor/ui/apps/web/src/routes/_chat.tsx:553-611`） | 几何、row grammar、快捷键、route recovery 属 Product UI；现有 Chat/Studio/Plugin/provider-first IA 不是目标 ontology | **保留/改写** shell 几何、布局与恢复；改成固定 `Agent \| Chat`；替换 Studio/Plugin/provider 导航语义。route tree **再生成** |
| shell/detail 投影与恢复 | root route 维护 per-thread subscription lease/cursor/buffer，先 shell snapshot，再按可见 thread 订阅 detail；reconnect 时清 lease 并保留可见 detail（`routes/__root.tsx:1100-1273`）。投影 race 时只接受不落后于 live cursor 的 snapshot，并用权威 snapshot 修复客户端（`routes/__root.tsx:1432-1483`） | Product 应拥有 Workspace、visible Conversation、Entry/Run receipt 的 typed projection；现有 donor orchestration event 不是永久 ingress | **保留/改写** scoped subscription、cursor、buffer、resnapshot 和 hot-path coalescing；输入改为 typed Product facts。删除 React 直接理解 Provider/runtime event 的路径 |
| Conversation / Timeline / Composer / Queue | thread route在 single/split surface 间切换并保留 per-thread draft（`routes/_chat.$threadId.tsx:18-40,180-192`）；Timeline 使用虚拟 `LegendList` 并封装 anchor/scroll 行为（`components/chat/MessagesTimeline.tsx:1-15,184-214,2159-2165`）。反证是 renderer 当前直接创建 Thread、派发 `thread.turn.start`、按 Provider决定 steer gate，并在 live turn结束后自动派发本地 queued turn（`components/ChatView.tsx:7839-8000,8756-8807`） | Product UI 拥有 visible Conversation 与 pre-dispatch Queue；Engine 接纳后只消费 receipt/facts。Composer、Queue、Timeline 是不可删除母体；现有renderer dispatch/accepted queue不是受保护权威 | **保留/改写** UI、draft persistence、虚拟化和滚动；把 donor turn/session/queued projection 换成 `Conversation / Entry / Run / OperationReceipt`，删除renderer accepted queue/steer调度 |
| Workbench / pane graph | 单 Conversation surface 原位提供 Browser、PR、Diff、Terminal、Git、Explorer、File、Side Chat panes，并对隐藏 xterm 做休眠而不是反复 detach（`components/chat/SingleChatSurface.tsx:680-805`）；同一 surface 还提供 editor、diff、chat panel 和 right dock（同文件 `873-980`） | tabs/panes/layout 属 Product；文件、Git、PTY、Browser 等真实状态各保留其系统 authority。Workbench 全域受保护 | **保留** pane/layout/open-target behavior；**改写**数据获取和 capability truth；不得因首个 Runtime 未接通而删 Git/PR/Kanban/Automations/Browser/Side Chat/Subagents |
| feature surfaces | `components` 中 chat、terminal、pullRequest、kanban、automation、browser、settings、profile、PDF 形成独立实现与 tests；route tree 证明其中 PR/Kanban/Automation/Plugin 已是可达产品域（`routeTree.gen.ts:15-24`） | UI 本身是 Product presentation；Git/PR/file/remote truth 不能由 Thread/Provider projection 冒充 | **逐域保留/改写**；先映射 authoritative query/receipt。donor Provider Settings、Plugin permanent category、static provider model copy 在 replacement 后删除 |
| Web transport / native facade | `wsNativeApi` 在一处组合 WS RPC 与 Desktop bridge；Terminal/Workspace/Git 走 transport，folder/save/open-external 走 Desktop 或安全 fallback（`wsNativeApi.ts:430-525`）；Browser 优先使用 Desktop webview，browser-only 时有限 fallback（同文件 `741-808`） | typed service transport 属 Product；OS/Browser capability 属 Desktop Host；Engine raw wire 不应到 React | **保留/改写** facade 形状和 graceful fallback；拆 Product RPC、Desktop IPC、Engine typed projection，不把当前大而全 `NativeApi` 当永久 authority |
| Package / Skill discovery | 现有 contract静态列举九种Provider，并把Skill目录称为跨Provider portable catalog；Plugin contract镜像Codex marketplace但source只表达local path（`packages/contracts/src/providerDiscovery.ts:10-20,22-96,123-173`）。UI逐个查询九种Provider capability并自动fallback（`components/PluginLibrary.tsx:365-456`） | Product拥有source/rights/exact artifact/trust/current/LKG；Pi ResourceLoader拥有native Package load/private state。搜索、浏览、详情、Composer mention是受保护行为，`Plugin`通用类别和跨Provider parity不是 | **保留/改写** discovery presentation和失败/re-entry；替换为Packages/Agents/Composer三条目标路径与Pi runtime facts，删除portable cross-provider/fallback ontology |
| design system、theme、locale、a11y、performance | Vite 懒 chunk、diff worker、terminal、PDF/Markdown、authorized glyph corpus、theme/desktop chrome、浏览器/electron geometry tests 构成 UI 地基；stream text以rAF平滑约100ms transport clumps、限速并尊重reduced motion（`hooks/useSmoothStreamedText.ts:1-28,30-137`）；Timeline虚拟化和pane sleep是现存性能机制 | 全部属于 Product UI；其中 CJK、双语与 target IA 仍需新 proof，不能从 donor tests 推断完成 | **保留** token/geometry/interaction/perf mechanism；**改写** identity/copy/assets；补中英/a11y/100k Conversation proof |

### Web 的关键隐藏耦合

- `routes/__root.tsx` 不是普通 root component，而是客户端 stream coordinator、projection repairer 和
  subscription retention owner；只搬 components 会丢失恢复语义。
- normalized store把shell/detail分片并用sequence tombstone防止旧snapshot复活已删除对象；selector注释
  又明确指出streaming时宽selector仍会抖动（`storeState.ts:24-53`；`storeSelectors.ts:117-131`）。目标
  schema可以改，但这种性能/一致性约束不能在“简化store”时丢失。
- `SingleChatSurface` 把 Chat、Editor、Diff、Browser、Terminal、Git、PR、Explorer、Side Chat 的 pane
  lifecycle 绑在同一 per-thread workbench state 上；按视觉区块挑文件会破坏 tab/pane 恢复。
- `wsNativeApi` 同时包装 Product Service 与 Desktop Host。它是有价值的 call-site seam，但当前名字和
  breadth 掩盖多个权威，不能直接升级成所谓“通用平台 API”。
- Web 的性能不是 CSS 附件：虚拟 Timeline、cursor resume、stream buffer、xterm mount policy 和 lazy
  pane 共同决定用户可观察正确性。

## 5. Desktop Host source domains

Electron package只构建 `main.ts`、`preload.ts` 和 Browser annotation `guestPreload.ts`，并把 workspace
packages bundle 进 main（`vendor/ui/apps/desktop/tsdown.config.mts:12-39`）。这三个 entry 是明确安全边界，
但 `main.ts` 现为 4,000+ 行的多职责 composition root。

| Source domain | Anchors 与源码/测试事实 | 当前事实权威 / 受保护行为 | 候选处置 |
| --- | --- | --- | --- |
| BrowserWindow 与桌面 chrome | BrowserWindow 恢复多显示器内可见 bounds；启用 context isolation、关闭 Node integration、启用 sandbox，并只给受检 webview guest preload（`apps/desktop/src/main.ts:3874-3930`） | 窗口、menu、geometry、native chrome 属 Desktop Host；Workbench geometry 受保护 | **保留/改写**身份与 IPC 类型；安全默认不得回退 |
| preload / IPC capability | 独立 preload 和 guest preload 是 renderer 与 OS/browser host 的唯一受控桥；Web facade 会在桥缺失时降级 | OS dialogs、clipboard、notifications、keychain/browser 等 Host capability；renderer 不拥有 enforcement | **保留/收窄**为 typed Desktop IPC；拒绝把 Pi SDK、Package code 或 Product Store 放入 Main/preload |
| backend supervision | Main spawn `apps/server/dist/index.mjs`，等待 readiness，捕获有界 output，指数退避并有 circuit breaker（`main.ts:3250-3377`；`backendSupervisionPolicy.test.ts:22-133,135-225`） | 进程 supervision 属 Desktop Host；当前 child composition 不代表正确产品边界 | **保留**监督策略与可见恢复；**改写**为分别监督 Product Service 与 isolated Native Host，分别报告健康/失败 |
| renderer crash recovery | 只对可恢复 crash 进行有界 reload，其余或预算耗尽后提示用户（`main.ts:4039-4085`；`rendererCrashRecovery.test.ts:24-132`） | Desktop Host | **保留**机制，改写 identity/telemetry 文案 |
| updater、migration recovery 与 graceful quit | updater 在 migration recovery gate 前初始化；随后注册 IPC、browser pipe、启动 backend，window creation 受 readiness 控制（`main.ts:4240-4293`）；quit/install handoff 有持久 marker 防错（`main.ts:4295-4345`） | app update、process handoff 属 Desktop Host；Product DB recovery 属 Product Service，不能长期和 updater 混为同一 monolith | **保留/拆分** updater与有界 handoff；把 Product schema recovery 协议化，不让 Main 理解 Engine session schema |
| Browser host / annotation / AppSnap | browser capability 通过 child 的专用 fd 传递，缺 pipe 则杀 child并重试（`main.ts:3279-3296`）；BrowserWindow校验 annotation webview partition/preload（`main.ts:3916-3930`） | Browser process与OS capture 属 Desktop Host；自动化策略/receipt 属 Product/Engine call path | **保留/改写** typed capability；当前把 Browser capability 交给整个 Server child 是过宽耦合 |
| identity、resources、release | Main/build 使用 donor display name、env/protocol、storage paths；artifact stage仍写 `U1-desktop`、U1 description/author和 donor provenance fields（`scripts/build-desktop-artifact.ts:1021-1044`） | OmniMind Product identity / release authority | **删除替换** donor identity、brand assets、update metadata，不留 alias；保留签名、notarization、可恢复下载等机制并重新取证 |

### Desktop 的关键隐藏耦合

1. window readiness、static asset location、backend auth token、migration recovery、Browser capability fd 和
   backend restart 当前围绕**一个** Server child 编排；未来两 child 不能靠简单复制 `startBackend()` 完成，
   必须定义独立 health、restart 和 delivery-uncertainty contract。
2. Web static bytes 既经 Server HTTP 提供，又被 Desktop protocol/static snapshot 使用；换目录时需验证
   dev、packaged、update bundle swap 三种路径。
3. updater recovery 与 DB migration recovery 在 Main 启动序列相邻，说明“删 Server migration 后 Main
   应该自然工作”是未证假设。

## 6. Server 内的真实 source domains

Server entry 构造一个 Effect runtime；`serverLayers.ts` 将 orchestration、persistence、Git、Terminal、
Workspace、automation、Browser、external MCP、agent gateway 和 provider 全部合成
（`apps/server/src/index.ts:14-24`；`apps/server/src/serverLayers.ts:4-54,73-108,137-218`）。最强隐藏耦合
在 `makeServerApplicationLayers()`：注释明确说 runtime services 和 provider layer 必须围绕同一 credential
layer 组装（`serverLayers.ts:221-233`）。因此目录名 `server` 不是一个可保留的单一职责。

### 6.1 可进入 Product Service 的机制

| Source domain | 源码与测试证据 | 当前事实权威 | 候选处置 |
| --- | --- | --- | --- |
| authenticated HTTP/static/binary transport | attachment response禁 shared cache；static route防 traversal/symlink escape、协商 `.br/.gz`、ETag与 SPA fallback（`apps/server/src/http.ts:1089-1104,1107-1255`） | Product Service transport；文件本体仍属 filesystem | **保留/改写**身份、route schema与授权；与 Web precompress 保持同一 contract |
| WS admission/backpressure/resnapshot | control traffic保留独立容量，请求失败/中断精确释放 lease（`wsRequestAdmission.test.ts:7-96`）；live UI overflow保留 newest 或触发 snapshot restart（`wsStreamBackpressure.test.ts:11-67`） | Product Service transport | **保留**有界机制；RPC group按 Product/Desktop/Engine ingress 拆分，不保留一个大而全 endpoint |
| Workspace/file access | 相对路径 read、large file truncation、显式 local preview grant、拒绝 absolute/traversal/symlink escape（`workspace/Layers/WorkspaceFileSystem.test.ts:47-85,88-135,192-225`） | filesystem为外部事实；Product负责授权、observed-version与可见 receipt | **保留/改写**；write需对齐 observed-version，不能沿用隐式 Thread ownership |
| Git/checkpoint/diff/PR | checkpoint并发去重、index复用、中断清理与失败 rollback有测试（`checkpointing/Layers/CheckpointStore.test.ts:38-166,293-396`） | Git/hosting是外部权威；Product投影状态与OperationReceipt | **保留/改写** project/Conversation binding；删除用 Engine transcript 推断 Git truth 的路径 |
| Terminal/PTy | Terminal测试覆盖 lazy spawn、多 terminal、ACK backpressure、reattach mode、bounded history、SIGTERM→SIGKILL、retention、shell fallback与 env过滤（`terminal/Layers/Manager.test.ts:262-409,472-572,792-809,1005-1260`）；history按 byte/line且不切 UTF-8（`terminal/terminalHistory.test.ts:12-70,152-170`） | PTY进程属 system capability/ExecutionTarget；Product拥有可见 pane/receipt | **保留**成熟机制；从 donor Thread/Provider branding解耦，支持 local/remote target真相 |
| attachments | process-loss test覆盖 reserve/write/rename/finalize crash window并保住 claimed blob（`managedAttachmentProcessLoss.test.ts:52-168`） | Product resource/attachment lifecycle，外部文件仍有真实 authority | **保留/改写**关联到 Entry/Run/ResourceRef，不绑定 donor message ontology |
| automation scheduler/product state | repository、scheduler、settings、proposal、notification与run presentation均有独立域；当前 run reactor又依赖 orchestration/provider（`serverLayers.ts:137-151`） | schedule/definition/visible receipt属 Product；accepted execution属选定 Engine | **保留/拆分** scheduler与UI；重写 run dispatch seam，删除 provider-specific execution authority |
| auth/settings/diagnostics/lifecycle | Server layer显式组合 auth policy/secret/session credential、diagnostics、settings与lifecycle（`serverLayers.ts:116-136,186-218`） | Product Service / Desktop Host，取决于secret与OS enforcement | **逐项保留/改写**；不把 donor账号、telemetry或provider credential ontology当产品事实 |

现有 `wsRpc.ts` 同时获取 Orchestration、Provider、Git、Terminal、Workspace、PR、automation 等 service
（`apps/server/src/wsRpc.ts:305-334`），并在一个 handler map 中同时暴露 orchestration dispatch/snapshot、
provider delivery reconciliation、Workspace read/write和dev server
（`wsRpc.ts:762-853,854-1002,1004-1029`）。这证明 transport implementation有价值，也证明当前公开
schema不是目标责任边界。

### 6.2 必须从 Product Service 移出的 Engine authority

| Source domain | 直接证据 | 冲突与候选处置 |
| --- | --- | --- |
| donor Orchestration aggregate | `thread.turn.start` 同时持久化 user message并读取 live Provider Session；decider按 provider steering capability决定 queue、start或interrupt（`orchestration/decider.ts:1558-1691`），另有 dispatch-queued和interrupt command（同文件 `1694-1761`） | 与 Product 只拥有 pre-dispatch intent、Engine接受后拥有 native queue/steer/retry 冲突。**拆出** Entry/Run/receipt 与可见 projection；在 Native Host接管后**删除**server-owned accepted turn queue/session/interrupt authority |
| durable orchestration journal/projections | Engine tests证明 idempotent command receipt、append-only replay、ordered stream、transaction rollback、projection catch-up/repair（`orchestration/Layers/OrchestrationEngine.test.ts:117-343,477-779,1016-1285`） | 机制成熟不等于 aggregate正确。**保留/改写** product facts、receipt、outbox、projection repair模式；不继承 `Thread`=Conversation+Session+queue 的 aggregate |
| restart reconciliation | startup reconciliation清理 active turn、pending approval/input、open turn并生成 deterministic command id（`orchestration/startupTurnReconciliation.test.ts:59-452`） | 其中Product可见不确定性要保留，但Engine Session settlement应由Native Host/Pi authoritative fact决定。**改写**为 receipt reconciliation，不重建第二套 Engine truth |
| provider-neutral registry | runtime layer同时注册 Codex、Claude、Cursor、Antigravity、Grok、Droid、Kilo、OpenCode和Pi，并把它们合到 durable ProviderService/SessionDirectory/EventRepository（`provider/runtimeLayer.ts:11-25,46-117`） | 这是 donor provider-neutral product ontology，与 Pi-only bundled-native Gold Path冲突。**删除/替换** registry与平级 provider tabs；外部 Agent走正式 external-engine ingress |
| Pi adapter | adapter直接导入 Pi SDK SessionManager/AgentSession/Extension UI types（`provider/Layers/PiAdapter.ts:9-21`）；使用官方 services/runtime与SessionManager open/create（同文件 `2066-2128,2131-2146`），订阅session、绑定extensions、读取ResourceLoader（`2260-2331`），并调用setModel/thinking/reload/prompt/branch/reset/compact（`2410-2518,2684-2716`） | 这是高价值 native integration证据，但当前又包着U1 harness、gateway lease、canonical ProviderRuntimeEvent与Server config（同文件 `40-90`）。**迁移并重构**进isolated Native Host；保留Pi权威与typed facts，不整文件复制进Product Service/Electron |
| agentGateway / externalMcp execution | Server layer让gateway同时依赖automation、orchestration、Git、provider runtime events、Browser Host（`serverLayers.ts:152-179`） | 当前是跨所有权的执行总线。只保留经证明需要的Product capability broker/credentials；Engine工具调用与Package lifecycle留在Native Host，外部Agent走正式协议 |
| provider persistence/migrations | migration lineage同时包含ProviderSessionRuntime、runtime events、queued promotions、delivery reconciliation，也包含Product projections/auth/automation/attachments/PR pins（`persistence/Migrations/004_ProviderSessionRuntime.ts` 到 `088_ProjectionThreadsSettledAt.ts`） | 不能“整库保留”或“整库删除”。新产品无兼容义务，但需按目标objects重建schema；历史migration仅作行为/故障证据，不成为永久生产ontology |

## 7. Shared packages 与 contract 边界

### `packages/contracts`

barrel 同时导出 auth、automation、browser automation、IPC、terminal、provider、provider runtime、model、
agent gateway、external MCP、WS、settings、Git、PR、orchestration、project/studio/filesystem/RPC
（`vendor/ui/packages/contracts/src/index.ts:1-37`）。这是现有产品全 wire surface 的集合，不是一个稳定的
“shared contract”概念。

具体反证是 `NativeApi` 同一interface塞入dialogs、Terminal、Projects/filesystem/Studio、shell、Git、PR、
server/auth/provider、orchestration、automation和Browser；其orchestration dispatch只返回
`{ sequence }`（`vendor/ui/packages/contracts/src/ipc.ts:542-767`）。`OrchestrationThread`又把Model、runtime、
branch/worktree、gateway与subagent绑在同一对象，Provider union静态列出九种实现且默认Codex
（`packages/contracts/src/orchestration.ts:56-81,709-759`）。这不是足够表达
accepted/rejected/`delivery_unknown`的目标contract。

处置：

- 保留 schema-first、branded IDs、typed request/stream/error 的工程机制；
- 按 `product facts / desktop IPC / native-host ingress / external-engine ingress / system capability`
  重分 packages 或 export surfaces；
- Product核心只公开 `Workspace / Conversation / Entry / Run / EngineBinding / ResourceRef /
  OperationReceipt`；Pi/ACP raw events在各自 ingress内终止；
- 删除 donor static Provider union、generic payload和Thread aggregate进入React的路径；没有证据时不抢先造一个
  大而全 “General Engine Contract”。

### `packages/shared`

该 package 以 subpath逐文件导出，既有 `git`、logging、shell、path、text、bounded worker、Windows process
等相对稳定机制，也有 product-home helper、desktop identity、Codex config、chat/terminal Thread、Provider
usage/metadata/delivery block、automation、subagents 等产品/供应商语义
（`vendor/ui/packages/shared/package.json:6-77,79-165,167-257`）。

处置：

- 只在出现第二个真实消费者且职责稳定时保留跨 package pure module；
- `desktopChrome`、path/shell/Windows、static snapshot、bounded worker 等可随真实消费者迁移并重命名；
- donor home/identity、Thread/Provider helpers不因位于 `shared` 就享有保留权，随目标domain内联、改名或删除；
- 不建立另一个 `Common/Utils/Shared` 杂物容器。

## 8. Build、generated 与测试 source domains

| Domain | 事实 | 处置 |
| --- | --- | --- |
| package/build graph | Bun/Turbo workspace、catalog、lock、patch、Vite/tsdown、Desktop artifact共同定义可运行闭包（`vendor/ui/package.json:4-22,25-62,90-102`） | **保留/改写**确定性闭包、命令与平台矩阵；替换 package/env/path/identity，合并仓库现有quality gates |
| Web generated route tree | 文件自述由TanStack Router生成且禁止手改（`apps/web/src/routeTree.gen.ts:1-9`）；generator在Vite config注册（`apps/web/vite.config.ts:185-190`） | authored routes是source of truth；transplant时可保留基线作对照，生产变更后**再生成**并验证无donor route |
| Web build sidecars | Vite以原子rename生成 `.gz/.br` 并清 stale sidecar，Server按Accept-Encoding服务（`apps/web/vite.config.ts:108-180`；`apps/server/src/http.ts:1182-1243`） | 两端作为一个build/runtime contract **保留**；产物不提交为author source |
| Desktop/server dist | Turbo声明为outputs，CLI/artifact scripts复制这些目录（`vendor/ui/turbo.json:28-46`；`apps/server/scripts/cli.ts:145-156`） | 全部**再生成**；不得从donor dist做生产source transplant |
| tests | tests不仅验证unit logic，还记录隐藏行为：stream race、crash recovery、PTY、path containment、update security、migration repair | **按行为映射保留**；先迁移 characterization tests，再把fixture/schema改到新authority。donor test绿色不等于OmniMind contract绿色 |
| snapshots/assets | authorized glyph corpus与brand resources被build/prune/package消费；其rights由并行rights review裁决 | 只保留有权且产品实际使用的asset；brand/generated snapshot不因build依赖自动获准 |

## 9. 横跨域的切割风险

### H1 — Product projection 与 Engine projection 共用一个 `thread`

Server decider、persistence、WS stream、Web store和Composer都围绕 donor Thread ID工作。若只增加新
`Conversation` API而保留旧 stream继续写同一React state，就会形成双投影。切割必须在一个有界提交中
把某一真实journey的read/write path完整切到 Product facts，并删除该journey旧写入者。

### H2 — Desktop把“backend健康”当作一个布尔事实

当前 window readiness、Browser capability与restart都围绕单Server child。未来Product Service健康、
Native Host健康、Engine可用和Conversation只读可用是四个不同事实。若复制现有supervisor而不改UI
状态，Pi crash可能错误地让整个Workbench不可用。

### H3 — Browser跨Renderer、Desktop与Server三方

Renderer拥有pane/interaction，Desktop拥有webview/process，Server当前拥有automation host与Agent
gateway wiring。正确接管需把可见Browser state、host enforcement、Engine tool invocation和receipt
分别标注；不能把任一层叫“Browser authority”后整体迁移。

### H4 — Git/Checkpoint/Terminal按Thread绑定

底层机制多可复用，但当前生命周期跟donor Thread/archive/delete联动。目标应绑定
`Workspace/Conversation + ExecutionTarget`，并让Git/filesystem/PTY保持真实外部 authority。简单把
`threadId`改名为`conversationId`不能证明生命周期正确。

### H5 — Build identity穿透source与artifact

donor package/environment namespaces、protocol、storage path、bundle metadata、icon override、update marker贯穿根
config、Desktop、Server、Web和release scripts。身份清理必须有source+generated+artifact扫描；只改UI
文案会留下可执行donor身份。

## 10. Preserve / adapt / delete 决策摘要

### 直接保全行为，再按目标职责重命名/重连

- shell geometry、Sidebar row grammar、Conversation/Composer/Timeline/Queue visual interaction；
- Workbench panes/tabs/layout、Viewer/Diff/Terminal/Browser/Git/PR/Kanban/Automation/Side Chat/Subagent
  presentation；
- Timeline virtualization、stream batching/cursor/resnapshot、scroll anchoring、xterm mount/sleep；
- BrowserWindow安全默认、preload boundary、window state、renderer/backend crash recovery；
- WS admission/backpressure、static/attachment安全、Workspace path containment；
- Git/checkpoint、PTY、attachment、automation scheduler中不争夺Engine authority的机制；
- deterministic build、platform package、sign/notarize/update safety等工程能力。

### 必须改写权威后才能进入production candidate

- donor `Thread / Project / Studio` -> Product `Workspace / Conversation / Entry / Run / receipt`；
- root route/store从orchestration/provider event直接投影 -> typed Product facts；
- Desktop单backend supervision -> Product Service与Native Host分别监督；
- PiAdapter -> isolated Native Host native integration；
- automation/gateway/browser execution -> Product intent/permission/receipt + Engine/Host actual authority；
- shared/contracts -> 按稳定responsibility重分，不保留混合barrel；
- donor build/package/storage/protocol/update identity -> OmniMind identity；
- 现有migration aggregate -> 目标Product schema与明确Engine opaque lineage。

### replacement proof 后删除，不留双轨

- 平级donor Provider registry、Provider-first settings/tabs、静态Provider model catalogue；
- Product Service内 accepted Engine queue/steer/retry/session/compaction/branch authority；
- generic raw provider/orchestration payload进入renderer的路径；
- donor branding、U1 home/protocol/env/artifact/update namespace及未经批准asset；
- 与Pi竞争的Session store、runtime event journal、Package/Skill discovery authority；
- 临时compat translator、旧alias/wrapper与可build donor mirror。

## 11. 反证、未知项与限制

### 已记录的反证

1. **反对“Server全部是错误runtime”。** HTTP/WS backpressure、Workspace安全、Git/checkpoint、PTY、
   attachment、automation和projection repair有大量实现与failure tests。整删会直接违反Workbench和
   冰山行为保全。
2. **反对“成熟journal可原样成为Product State”。** 同一aggregate直接决定provider queue/steer、
   Session与interrupt，机制成熟但authority错误。
3. **反对“Web只是视觉层”。** root route拥有stream leases、cursor、buffer和projection repair；
   只挑components会丢恢复与性能正确性。
4. **反对“完整物理transplant等于完整采用”。** exact baseline只证明字节与launch；identity、rights、
   typed boundary、Windows/Linux、视觉、双语、a11y都未因此成立。

### 仍需设计/实施阶段回答

- Product facts首次切入时，如何在不双写同一Conversation的前提下完成旧snapshot到新schema的一次性
  bounded translation；
- Browser automation host最终位于Desktop Host还是Product Service的最小安全边界，以及Native Host
  如何只拿到scoped capability；
- 哪些checkpoint行为属于Product OperationReceipt，哪些只应由Git外部事实即时查询；
- Remote PTY/files/Git如何复用本地presentation但保持ExecutionTarget真实位置与断线语义；
- authorized icon corpus与其他resources的逐项rights结果；
- Windows/Linux package、update、webview与PTY机制在OmniMind identity后的真实证据；
- donor Web现有测试中已记录的storage mock/attachment失败，哪些是baseline defect、哪些会影响接管。

这些未知不阻止选择source-domain切割线，但会阻止对应domain被宣称为verified。

## 12. 给 Architect 的可执行约束

1. 把物理 transplant checkpoint标为non-candidate；其唯一用途是保留Git lineage、可运行闭包和回退点。
2. 目标source graph明确出现 `apps/web`、`apps/desktop`、`apps/service`、isolated Native Host及按责任划分的
   contracts；不得保留`apps/service -> vendor/ui`或第二棵buildable donor tree。
3. 第一条真实slice必须纵向贯通：一个Chat和一个folder-backed Agent的Composer -> Product admission ->
   receipt -> isolated Pi Host -> typed facts -> preserved Timeline/Workbench，并覆盖reject、Host crash和
   `delivery_unknown`。
4. 每个删除项记录：old anchor、target owner、normal/failure/recovery replacement和proof。目录已搬或类型已
   改名不算replacement。
5. Store切换采用单写者规则；禁止新Product projection和旧orchestration/provider reducer长期并存。
6. Desktop保持Pi SDK/Package code依赖扫描为零；Product Service同样不得导入Pi executable ecosystem。
7. generated route/dist/sidecar/artifact只从改写后的author source再生成；identity gate覆盖source与产物。
8. UI验收保留同状态visual review，并单独验证100k Conversation、stream/scroll、CJK/IME、keyboard、
   screen-reader、reduced motion；现有source/tests只提供候选机制，不提供OmniMind完成结论。

## 13. 研究影响

本审计没有推翻“完整母体先保全”的第一性锚点，但把它收窄为：**一次完整依赖闭包的物理接管，随后
按权威立即绞杀旧边界，任何production candidate都必须晚于typed Product ingress与isolated Native
Host。** 它同时推翻了两个较粗方案：单独提升Web，和把现有Server整体重命名为Product Service。

下一设计可以直接用本文件的domain表和H1-H5作为work Concept边界与删除门；不需要再次按文件数量或
截图相似度做一轮“哪些组件值得保留”的研究。
