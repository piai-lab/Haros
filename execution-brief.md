# OmniMind V1 execution brief

## 1. 目标

以 Synara 当前成熟产品 substrate 为唯一产品基座，交付 OmniMind V1：保留多 Provider、Project/Thread/Space/Studio、Workbench、Settings 与三平台桌面能力；新增 bundled、product-owned `omnimind` Provider，并保留 Synara 原有 stock `pi` Provider。

OmniMind Agent 是 Pi-derived 独立 runtime，随 App 开箱发行；它可以与 stock Pi 共享窄的技术基础，但普通用户只感知 OmniMind，不需要理解 Synara/Pi lineage。V1 不创建第二套产品对象或控制面。Remote/SSH 延后到 V2。

## 2. 不变量

1. 一个 Product Orchestration、Provider Registry、Project/Thread/Space command/event/projection authority 和 Provider binding path；
2. `Agent | Chat` 直接映射到 inherited Project/Thread/Space/Home/Studio；Groups 复用 Space identity/lifecycle，并由 Thread metadata 保存会话多分组事实；
3. 正常 UI 只呈现 OmniMind；`omnimind` 与 `pi` 是同一 Registry 中两个真实 identity，stock Pi 只在用户主动选择 Provider 或查看详情时显示；
4. OmniMind Agent 使用 `.omnimind` global/project-local state；stock Pi 仅在被显式选择时使用自己的 `.pi`，二者不迁移、同步或共享；
5. 恢复 Synara PluginLibrary/Skills/provider discovery；Engine capability composition 以 [`architecture/execution.md`](architecture/execution.md#扩展与生态) 为唯一语义 owner；OmniMind Agent 锁定 runtime 已提供的 provider-scoped lifecycle 必须接入，缺失动作才不显示；不追求 stock Pi/其他 Provider 的假功能齐平；
6. File、Git、Terminal 直接复用现有实现，不建新 client 或 observed-version platform；
7. Settings IA、performance、a11y、packaging 与 updater 优先保全 source；双语是明确的 OmniMind 产品差异，不虚构为 source 已有能力；
8. 只补可复现的 OmniMind 差异；未证明缺口时不得重写；
9. 旧预发布字节零读取、零迁移、零删除；
10. 不以统一为理由压平 capability、permission、usage、Session 或 ecosystem。
11. Agent runtime 内置不等于 model credential 内置；无可用模型时准确引导配置，不能 silent fallback。

## 3. 固定来源基准

本轮 source alignment 只使用两个输入：

| Source | Exact baseline                                               | Role                                                                                      |
| ------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Synara | `712d88f98b9afed9a4617b78dc62a8f342d93177`                   | 当前唯一 reviewed/adopted head；`02c8a6c…` 仅是本轮已完成 intake 的起点，不再形成第二基线 |
| Pi     | stable `v0.84.1`, `53fa77ccd8a279eb87e92294ef3687b03ff80112` | OmniMind Agent 首个技术 lineage / ecosystem compatibility baseline；不是长期产品 identity |

Pi post-tag head `936aff00918de1187f085f123c2812d8f2d67745` 只作 API/fix discovery，不进入 production。Synara exact baseline 尚未实际吸收的代码不能提前写成 README production adoption；实现完成时再更新唯一 adoption record、rights 和 source paths。

## 4. Occam 比较规则

对当前 OmniMind 与 exact Synara baseline 的每个责任只允许三种 disposition：

- **Restore source**：OmniMind 删除、改坏或重复实现了 source 能力；
- **Keep narrow OmniMind difference**：有明确产品差异与 focused falsifier；
- **Delete duplicate**：同一责任已由 source 或 Provider 原生实现承担。

不创建第四类“以后可能有用”的 abstraction。没有真实第二消费者时，不提炼 common platform。

## 5. V1 substrate 路线（历史基座与长期完成门）

本节保留 V1 product substrate 的责任顺序与长期 final gate，不再定义当前 Agent Core 的代码准入。Stage 0–3 的 exact candidate/evidence 以 active Mission 为准，不因 Agent Core 重开而重做；Stage 4 仍是完整 V1 的发行门。**当前唯一下一动作只看第 10 节。**

| 顺序 | 阶段                              | 默认复用                                                                                                  | 只做的差异                                                                                                                                                                                                                                                                                                                                        | 明确不做                                                                                                                                                            | 完成证据                                                                                                                                                                                       |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Authority reset                   | 当前 sole owners 与最小结构性文档检查                                                                     | 标记旧 decision 为 superseded；修 source re-entry；删除旧 semantic keyword oracle；冻结品牌、`.omnimind/.pi`、auth、双语与 updater 边界                                                                                                                                                                                                           | 为通过旧测试恢复 ProductControlPlane、Package LKG、permission broker 或 PluginLibrary 占位方案                                                                      | 新 owner/route/contract 通过；fresh document audit 无旧架构执行权                                                                                                                              |
| 1    | Exact-source responsibility reset | Synara `02c8a6c…` 的完整 production/build/release 物理拓扑，以及已批准的 `02c8a6c…712d88f` source intake  | 一次性恢复 substrate，再按责任吸收 approved update；保留 OmniMind 权威/品牌/法定资产；删除重复控制面；建立 first-public profile/storage/protocol/update identity，移除 donor migration entry                                                                                                                                                      | 保留 path translation、读取/迁移/删除 donor 或旧预发布状态、引入第二 approval/control plane、导入 donor release/brand identity                                      | source/tree disposition；install/typecheck/unit/browser/build；fresh/reopen/restart；旧 bytes untouched                                                                                        |
| 2    | Bundled OmniMind Agent vertical   | source Registry/Orchestration/PiAdapter/PluginLibrary + Pi stable `v0.84.1`                               | 一个参数化 Pi-family adapter；stock Pi 保持原 package identity/configDir/state/catalog，仅允许一份 exact-hashed、可删除的 typed prompt-outcome compiled patch；OmniMind Agent 从同一 pinned source payload 生成第二物理模块实例并保留产品拥有的 package metadata/configDir；Agent/Chat/Groups 映射；去 silent fallback                            | fork 整份 Pi、泛化修改 stock Pi、第二 Registry/Product state/native-host RPC、共享 `.pi`/Session/package state、动态 Provider 平台                                  | runtime 零安装/auth readiness；MiMo/DeepSeek V4/continue/folder/stream/tool/abort/resume；`.omnimind/.pi` 隔离；Pi ecosystem artifact                                                          |
| 3    | Product surface and quality       | source Workbench、Settings、File/Viewer/Diff/Terminal/Git/PR、stream/scroll、a11y/perf、Provider adapters | OmniMind-only 正常 UI；一套轻量中英 message catalog；恢复 PluginLibrary/Skills；把 OmniMind Agent 已有 native lifecycle 全部接入，缺失动作才隐藏；修真实 adapter/quality regression；恢复侧栏顶部 `Agent` 左/`Chat` 右同时可见、一次激活的一级入口并保留当前 route/restore/prewarm；从 sole owner 读取 public-surface denylist 做窄泄漏 falsifier | Remote、new FS/Git client、settings taxonomy rewrite、shared Package state、generic plugin platform、假齐平、旧 retained-panel/tabpanel 架构、generic identity gate | Agent/Chat/Send to Agent；双入口在最小侧栏宽度、中英文、键盘/screen reader 下真实切换；普通旅程无 donor 术语或禁用 URL；双语/IME/a11y/profile；File/Git/PTY；inherited Provider focused smokes |
| 4    | Three-platform release            | source Electron build/package/updater/platform adapters                                                   | OmniMind artifact、bundled runtime、legal/SBOM、signing/notarization、update failure/retry/reinstall recovery                                                                                                                                                                                                                                     | second updater、Pi self-update、自动应用 rollback、Remote                                                                                                           | 同一 SHA 的 macOS/Windows/Linux install/open/update/retry/reinstall；core journeys；fresh completion audit                                                                                     |

Stage 1 是一次受控替换，不是长期 diff 项目：先冻结精确来源与保留列表，再把 source 对应物理树作为一个整体落入当前仓库。默认保留 `.git`、`AGENTS.md`、`README.md`、`architecture/`、`research/`、`execution-brief.md`、active Campaign、`LICENSES/`、OmniMind brand assets，以及 `scripts/document-contract.mjs` / `test/document-contract.test.mjs` 这一条最小文档检查；默认替换 production apps/packages、build/release scripts、root toolchain configs 与 source CI。旧 `quality.test`、source-closure/identity governance 和 product-truth meter/fixtures 不随 transplant 保留。source 构建需要的品牌文件在同一阶段映射到 OmniMind 资产，不能为了先绿 build 暂时提交 donor 图标。source 中读取 Synara profile/storage 的迁移入口必须删除或从 composition 彻底断开；bundle ID、userData/home、protocol、storage key、updater channel 和 artifact identity 使用新的 first-public OmniMind namespace。当前 OmniMind 自有 workspace package 已一次性硬切到 `@omnimind/*`，不保留 `@synara/*` alias；真正承载上游或 Provider compatibility 的 API/env 名仍按其真实语义保留。任何其他 current-only production 文件都必须有一个已经写入 owner 的窄产品差异，否则删除。

Stage 2 不 fork Pi 源码树。构建过程从 exact pinned Pi source payload 生成第二个可复现的物理模块实例，只改变产品拥有的 package identity/configDir，使 Pi 内部 module-level project state 常量分别落到 `.pi` 和 `.omnimind`；原始 source payload digest 与生成差异必须可复算。stock Pi 的 identity、configDir、state 与 catalog 必须保持原样；唯一例外是同 revision product source 已证明的 typed prompt-outcome compiled patch，用于让已公开的 command/input handled 路径在共同 Pi-family adapter 中可结算。该例外必须 exact-hashed、由 Bun 安装时 fail-loud 应用，并在 upstream 提供等价 typed API 后删除；不得据此泛化修改 stock Pi。若该双实例在三平台不能被相同 lockfile、source digest 与 packaged artifact 证明，立即停止并改为窄 upstream instance-configuration patch；不得退回 Native Host 或第二控制面。

Stage 2 必须先把 inherited stock Pi adapter 单独升级到 `v0.84.1` 并使原 Pi tests/journey 通过，再参数化 provider identity/SDK loader 并加入 `omnimind`。这把“SDK 版本兼容”和“双实例隔离”拆成两个可证伪 checkpoint，避免在同一失败里猜测来源；不产生第二条长期 adapter 分支。

前一阶段没有形成 candidate 时，不提前开始下一阶段的大范围重构。只读 source inspection 和最小 probe 不算抢跑。

## 6. 阶段一删除门

删除按责任，不按文件年代：

- retained source 有同一 owner 且 normal/failure/restart journey 闭合，删除重复实现；
- current fix 有 source 未覆盖的可复现反例，保留最小 fix 和 regression test；
- bespoke ProductControlPlane、parallel OpenCode/ACP path、shared Package lifecycle state、destructive tooling、`apps/service` path translation 与 `apps/native-host` 默认删除；OmniMind Agent 直接走 inherited Provider boundary；
- provider native state、credentials、user workspace、Git 和 global config 不动。

禁止为保住 sunk cost 创建 wrapper 或兼容双轨。

## 7. Provider 验收

OmniMind Agent 是内部最深验收路线。stock Pi 与其他 shipped Provider 只按其真实 adapter 能力做 discovery、health 与必要 smoke；缺 binary/auth/evidence 时保留 source 已有的 unavailable/unknown diagnostics。

不要建立 runtime support-tier ontology。UI 使用现有 ready/warning/error、availability、auth、version/update 与 capability facts。任何 Provider 都不能 silent fallback 到另一 Provider。

## 8. Final gate

同一 frozen SHA 必须满足：

- Campaign required claims 全部 verified，blocked = 0；
- only one inherited Product Orchestration/Registry and Project/Thread/Space product-truth authority；
- Agent/Chat/Groups 无平行 durable object；Group membership 只存在于 inherited Thread command/event/projection；
- 普通产品旅程只呈现 OmniMind；实现来源只在 About/Licenses/诊断/显式 Provider 详情中出现；
- bundled OmniMind Agent 以自身 identity/version 免安装运行，在模型未配置时准确阻止发送并引导 auth；Pi `v0.84.1` lineage 可追踪，代表性 Pi ecosystem 与 real-provider journey 通过；
- stock Pi 独立可选，实际 runtime version 与 optional local CLI version 分离，`.pi` 不与 OmniMind Agent 的 `.omnimind` 混用；
- inherited Providers 未因 surgery 回退，状态和能力准确；
- PluginLibrary/Skills/provider discovery 恢复；OmniMind Agent lifecycle 可用，stock Pi 与其他 Provider 不被迫功能齐平，无 shared Package state；
- File/Git/Terminal、Settings、双语、a11y 与真实性能可用；
- macOS/Windows/Linux artifact 通过 install/open/update/failure-retry/reinstall；
- legal/SBOM/signing requirements 满足；
- 无 donor identity、第二 control plane、跨 Provider loader/state、silent fallback、fake parity/permission/progress；
- fresh-context completion audit 无 material finding。

## 9. 交付诚实性（历史阶段规则）

本节记录 substrate 阶段形成时采用的证据纪律，不是“今天”的 current admission；当前状态与下一 Slice 只看第 10 节。

“今天完成”必须按证据区分：

- **今天可完成的强目标**：Stage 0 权威冻结、Stage 1 单次 source transplant、依赖安装与相关 source gates，并在 macOS 上形成可启动的开发 candidate；若 Pi package 双实例没有 API/打包阻塞，可继续完成 Stage 2 首个 vertical。
- **今天不能提前宣称的 production 结论**：完整中英产品面、MiMo/DeepSeek 全 journey、真实 Windows/Linux 安装与 updater、macOS notarization、Windows signing、发行凭据、SBOM/legal 以及 fresh completion audit。它们只能由相应资源和同一 frozen SHA 的实证完成。
- 缺少证书、真实 runner 或 Provider 资源时，claim 标记 `blocked`，不得用 macOS 本地模拟、未签名包或 authored test 改写为 `verified`。

产品差异本身不大；时间主要花在安全删除旧 fork、恢复 source 物理拓扑和三平台发行证据。最快路线是减少代码和验证分叉，不是减少必须真实发生的发行证明。

## 10. 当前唯一下一动作

当前精确状态：

- latest `main` 已拥有 Model services + Composer、Pi ModelRuntime/AgentSession、Product Thread/runtimeMode、Workbench、Workspace/Git/Diff/Checkpoint 与 Engine-native Subagent projection；
- `codex/agent-core-ui-spec` 的 B0–B5 是 donor/evidence branch，绝不整体合并；它证明 execution foundation 可行，但没有证明 first-public mature Agent；
- latest `main` 尚无 gotgenes bounded-child Host，也没有 OmniMind Pi child 的精准 control/terminal 全链；
- 维护者于 2026-08-15 明确否决 `.zq-ui/responsive-workbench` 早期说明型 `adaptive-inspector`，选择并验收后来更贴近当前产品 Shell 的 `omnimind-shell-v2`，随后授权从 UI 研究、唯一 owner 到 production 实现继续推进，并要求直接在 `main` 施工；该授权只覆盖下述 W1，不扩张到 Agent Core、Project instructions 语义或降低 Desktop 最小宽度；
- C0 对 Agent Core 仍只负责收敛文档与 owner，不授权任何 Agent Core 代码、依赖、lockfile、patch、test、vendor、build 或安装 App 写入。

当前唯一代码 Slice 是 **W1 Responsive Workbench presentation correctness**。它只闭合：

1. Environment 作为 `Environment / 环境信息` 辅助检查器悬浮呈现；删除正常 desktop single-chat 的固定 `312px` Timeline/Composer inset，并以真实几何测量证明单独开关 Environment 时二者 `x/width` 变化不超过 `1px`；
2. Sidebar 手动 intent 与空间自动压制分离：自动压制不调用手动 `setOpen`，不写回 cookie、Settings 或当前 mounted shell 的用户 intent；受压时可临时 overlay/sheet，空间恢复后只恢复原本手动打开的状态；W1 不新增当前源码不存在的 cookie rehydrate 或跨启动持久化；
3. RightDock 继续作为 Files/Diff/Terminal/Browser/Device 等真实 `Workbench / 工作台`，保留 pane store、keep-mounted runtime 与 native occlusion；宽屏分栏，空间不足时进入 Chat/Workbench 单面板 presentation，不把 Composer 压成窄条；
4. Environment、Thread environment、Workbench、Git 与 Settings/search 的可见命名、placeholder、loading/empty/error/recovery、tooltip、keyboard hint 和 ARIA 同步闭合 `en/zh-CN`；菜单入口使用 `Commit or push / 提交或推送`，真实连续动作继续使用 `Commit and push / 提交并推送`；
5. focused pure/DOM/browser proof 覆盖 manual intent、auto suppression、hysteresis、Environment geometry、固定 `340px` PlanSidebar 的 open/auto-open/dismiss preservation、RightDock split/exclusive、stream/scroll/draft/focus、CJK/IME、a11y、light/dark 与 reduced motion；候选必须从精确 pushed SHA 重建并用 fresh、隔离 profile 完成 packaged Desktop 连续拖动、关闭与重开 journey。

W1 明确不包含：Project instructions 的存储/Prompt/注入/复制语义变更、Electron `minWidth` 下调、移动端全产品重构、新全局 layout store/database/migration/registry、Settings taxonomy rewrite、Agent Core、Goal/Todo、Memory/Knowledge、Workflow graph 或发行。实现从现有 Sidebar/Sheet、ChatView、EnvironmentPanel、RightDock、Composer overflow probe 与 i18n owner 做最小手术；不得复制 Codex 皮肤。详细证据、允许 seam、验证矩阵与 stop-loss 见 [`research/omnimind-responsive-workbench-review.md`](research/omnimind-responsive-workbench-review.md)，稳定 contract 只看 [`architecture/workbench.md`](architecture/workbench.md#chat-shell环境信息与响应式-workbench)。

### W1 orchestration registration

本段只冻结本次 `$zq-orchestrate` 的 review identity 与执行边界；产品事实仍由上述 sole owner 持有，不建立第二 Campaign、ledger 或 layout authority。

```text
RUN: W1-RESPONSIVE-WORKBENCH-2026-08-15-01
SPINE_REVISION: 1
SPINE_ID: W1-RW-01@main-fce4cb89+ui-da5f544e
EXPECTED_DELIVERY_BASE: main@fce4cb89f3f73f3f08d980de94d1ed6f95e20265
ALLOWED_PREFLIGHT_DIFF: architecture/workbench.md; execution-brief.md; research/README.md; research/omnimind-responsive-workbench-review.md; .zq-ui/responsive-workbench/**
CANDIDATE_TARGET: maintainer-authorized main descendant containing one closed W1 concern
UI_DECISION: omnimind-shell-v2; decision da5f544ea4fdd252ff010a5303e992d189af14f5299aff7d40279ce5b509eb38
DELIVERY_GATE: unavailable by maintainer's explicit main-direct decision
ORCHESTRATION_MODE: advisory only
ACCEPT_FINAL: forbidden
SELF_PREFERENTIAL_BIAS_CLAIM: forbidden
SENTINEL: /root/w1_sentinel; read-only live collaboration monitor; escalate executor stall/failure/authority drift to Main
FINAL_PROOF_RUNNER: Executor authors and runs proof; Supervisor checks coverage; a fresh Judge performs advisory exact-candidate review
```

Acceptance IDs：

- `W1-A01`：唯一 UI selection/approval 是 `omnimind-shell-v2`；旧 `adaptive-inspector` 明确被否决且不进入 production；
- `W1-A02`：Environment toggle 前后 Timeline/Composer `x/width` 四项 delta 均不超过 `1px`；
- `W1-A03`：Sidebar current-mounted-shell manual intent 与 auto suppression 分离，auto 路径不调用手动 `setOpen`、不写 cookie/Settings，也不新增跨启动 rehydrate；
- `W1-A04`：RightDock/Workbench 宽屏 split、受限时 exclusive，pane store、Terminal/Browser/Device lifecycle 与 native occlusion 不丢；
- `W1-A05`：固定 `340px` PlanSidebar 的 active task/proposed plan、auto-open、per-turn dismiss 与 handoff intent 保留，且不成为第五个响应式 owner；
- `W1-A06`：Environment、Thread environment、Workbench、Git、Settings/search 的 `en/zh-CN` 标签、placeholder、loading/empty/error/recovery、tooltip、keyboard hint 与 ARIA 闭合，Project instructions 行为未改；
- `W1-A07`：连续拖动无 threshold 抖动、横向 overflow、Composer clipping、stream/scroll/draft/focus/IME 回退；light/dark、full/reduced motion、keyboard/screen reader 通过；
- `W1-A08`：同一 exact pushed SHA 完成 focused/browser checks，并重建、安装到任务专用 fresh profile，证明启动、真实 journey、关闭与重开；不把 source/HMR 当 packaged proof。

Source coverage IDs：

- `W1-S01`：当前 `main` 的 `_chat`、Sidebar primitive、ChatView、EnvironmentPanel、RightDock、SingleChatSurface、PlanSidebar、Composer/Timeline、i18n 与现有 tests；
- `W1-S02`：维护者提供的 OmniMind Environment 关闭/打开与 Codex 连续缩放截图；截图只证明可见行为，不推断对方内部实现；
- `W1-S03`：`.zq-ui/responsive-workbench` 的 latest真实 Shell storyboard、selection、approval、static/browser/axe audit；
- `W1-S04`：官方 Codex 产品资料只验证 thread/worktree/diff/editor 的公开职责，不拥有 OmniMind 视觉或 breakpoint。

Betrayal conditions：

- `W1-B01`：Executor 使用被否决的说明型 candidate、复制 Codex 皮肤或重画一套假 OmniMind Shell；
- `W1-B02`：新增全局 layout store/database/migration/registry、第二 Workbench state、第二 animation runtime 或无第二消费者的公共抽象；
- `W1-B03`：改变 Project instructions 行为、Agent Core、Desktop `minWidth`、Settings taxonomy 或 release；
- `W1-B04`：auto suppression 改写 manual intent，或 presentation tier 导致 draft/scroll/focus/pane/runtime state 丢失；
- `W1-B05`：用 storyboard、unit、HMR 或未安装 build 冒充 packaged Desktop 完成；
- `W1-B06`：因 main 直施工而输出 `ACCEPT_FINAL`，或宣称本次编排解决了 self-preferential bias。

Supervisor、Executor 与 Sentinel 必须在每次状态更新中携带 `RUN / SPINE_REVISION / SPINE_ID`；revision 不一致、source coverage 未闭合或触发 betrayal 时立即停写并升级 Main。

### W2 Codex resize continuity calibration（当前 UI follow-up）

W1 已完成主画布、Sidebar/Workbench presentation、i18n 与 packaged 基线。维护者随后于 2026-08-16 提供两段当前 Codex App 连续缩放/开关录屏，并明确要求 OmniMind 实际 follow 其空间连续性；这项新授权重新打开 W1 当时明确隔离的 Desktop 最小宽度与 Environment 自动退场，但不重开 Codex 皮肤复制、移动端重构或第二布局 authority。

W2 只闭合：

1. Environment 每次启动仍默认关闭；用户本次运行中手动打开后，Chat surface 受压时自动退场、恢复空间后恢复，受压主动查看走临时 overlay，且不改写手动 intent；
2. 默认宽度 Sidebar 在 `1000–1100px` 继续常驻，只有会把 Chat 压到紧凑生存宽度以下时才退场；缩窄/恢复保留 hysteresis、同一 mounted surface 与既有 `300ms cubic-bezier(0.32,0.72,0,1)` motion token；
3. Electron 最小窗口宽度从 `840` 下调到 `480`，但只有 Chat、Settings、PR、Editor、RightDock/Browser/Device、Plan、dialog、CJK/IME、focus、stream/scroll 与 light/dark/reduced-motion 的真实 route 矩阵闭合后才可形成 candidate；
4. 从精确 pushed SHA 重建安装包，以 fresh 隔离 profile 真实连续拖动 `1536→1280→840→684→564→480→…→1536`，验证退场顺序、几何、状态、关闭与重开。

W2 不新增全局 layout store/database/migration/registry、第二动画 runtime、移动端导航、Project instructions 语义、Settings taxonomy、Agent Core、Provider、release 或任何 Codex 品牌视觉。阈值只存在于既有 local resolver/route/surface owner；若 `480px` 的全路由或 packaged native surface 不能闭合，必须 fail-loud 并保留旧原生下界，不能用 Chat 单页或 storyboard 假绿。

W2 完成后，当前施工入口才返回 **C1 Agent correctness**；本段仍不自动授予 C1 Gate B。维护者届时明确授权 C1 后，必须从当时 latest `main` 开始，只闭合：

1. child 继承 canonical Root effective instructions、cwd 与适用 project instructions；第一 falsifier 是 Root 不重复规则时 child 仍遵守作用域内 `AGENTS.md`；
2. targeted child control：stop A 不影响 sibling B 或 Root；parent stop-all、stale/terminal control、writer stop 与 crash/reopen各有准确语义；Pi 没有真实 message/steer 时 UI 不显示；
3. 同一 Root delegation tree 内 Root 或一个 foreground child 写；跨 Thread/外部编辑复用现有 `WorkspaceFileSystem.expectedVersion`/atomic conflict truth，不能静默覆盖，不建全局 Writer DB；
4. exact model 补齐“explicit → role default → inherit”，不可用准确失败；child ceiling 在 bind 后按 Root ∩ role ∩ per-call 收口；
5. `completed / failed / cancelled / timed_out / crashed / interrupted` 从 Provider event 到 WorkLog、UI、SQLite、reopen一致，并同步闭合简中/英文与ARIA。

C1 明确不包含 Goal/Todo、economics平台、search/LSP/RepoMap、Memory/Knowledge、Workflow VM/graph、Team/Fleet/Mission、模型Router、三平台发行。后续顺序是：C2 request economics + Root-only/child paired outcome；C3 mature Root task loop；C4 search/context quality；C5同一frozen SHA三平台发行。完整进入/退出与stop-loss见 [`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)。

Pi成熟能力继续按 [`research/pi-native-product-integration-review.md`](research/pi-native-product-integration-review.md) 做preservation输入：C1不能复制Pi prompt builder、tool registry、Session tree、Package lifecycle、usage/cache、credential/model catalog，也不能用旧分支实现覆盖latest main owner。gotgenes exact source重新进入仍遵循 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)；source retained、shipped bytes/exports与runtime activation必须分别证明。

STATE：**W1 Responsive Workbench production work admitted on `main`；C1 deferred and not admitted；first-public mature Agent incomplete；V1 release blocked。**
