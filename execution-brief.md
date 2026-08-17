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
| Pi     | stable `v0.84.2`, `914cf1472e715297caa30db4b9535d534a9eb718` | OmniMind Agent 当前技术 lineage / ecosystem compatibility baseline；不是长期产品 identity |

Pi post-tag head `086c32e74530564922d011ade23ff582c9d63116` 只作 API/fix discovery，不进入 production。Synara exact baseline 尚未实际吸收的代码不能提前写成 README production adoption；实现完成时再更新唯一 adoption record、rights 和 source paths。

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
| 2    | Bundled OmniMind Agent vertical   | source Registry/Orchestration/PiAdapter/PluginLibrary + Pi stable `v0.84.2`                               | 一个参数化 Pi-family adapter；stock Pi 保持原 package identity/configDir/state/catalog，仅允许一份 exact-hashed、可删除的 typed prompt-outcome compiled patch；OmniMind Agent 从同一 pinned source payload 生成第二物理模块实例并保留产品拥有的 package metadata/configDir；Agent/Chat/Groups 映射；去 silent fallback                            | fork 整份 Pi、泛化修改 stock Pi、第二 Registry/Product state/native-host RPC、共享 `.pi`/Session/package state、动态 Provider 平台                                  | runtime 零安装/auth readiness；MiMo/DeepSeek V4/continue/folder/stream/tool/abort/resume；`.omnimind/.pi` 隔离；Pi ecosystem artifact                                                          |
| 3    | Product surface and quality       | source Workbench、Settings、File/Viewer/Diff/Terminal/Git/PR、stream/scroll、a11y/perf、Provider adapters | OmniMind-only 正常 UI；一套轻量中英 message catalog；恢复 PluginLibrary/Skills；把 OmniMind Agent 已有 native lifecycle 全部接入，缺失动作才隐藏；修真实 adapter/quality regression；恢复侧栏顶部 `Agent` 左/`Chat` 右同时可见、一次激活的一级入口并保留当前 route/restore/prewarm；从 sole owner 读取 public-surface denylist 做窄泄漏 falsifier | Remote、new FS/Git client、settings taxonomy rewrite、shared Package state、generic plugin platform、假齐平、旧 retained-panel/tabpanel 架构、generic identity gate | Agent/Chat/Send to Agent；双入口在最小侧栏宽度、中英文、键盘/screen reader 下真实切换；普通旅程无 donor 术语或禁用 URL；双语/IME/a11y/profile；File/Git/PTY；inherited Provider focused smokes |
| 4    | Three-platform release            | source Electron build/package/updater/platform adapters                                                   | OmniMind artifact、bundled runtime、legal/SBOM、signing/notarization、update failure/retry/reinstall recovery                                                                                                                                                                                                                                     | second updater、Pi self-update、自动应用 rollback、Remote                                                                                                           | 同一 SHA 的 macOS/Windows/Linux install/open/update/retry/reinstall；core journeys；fresh completion audit                                                                                     |

Stage 1 是一次受控替换，不是长期 diff 项目：先冻结精确来源与保留列表，再把 source 对应物理树作为一个整体落入当前仓库。默认保留 `.git`、`AGENTS.md`、`README.md`、`architecture/`、`research/`、`execution-brief.md`、active Campaign、`LICENSES/`、OmniMind brand assets，以及 `scripts/document-contract.mjs` / `test/document-contract.test.mjs` 这一条最小文档检查；默认替换 production apps/packages、build/release scripts、root toolchain configs 与 source CI。旧 `quality.test`、source-closure/identity governance 和 product-truth meter/fixtures 不随 transplant 保留。source 构建需要的品牌文件在同一阶段映射到 OmniMind 资产，不能为了先绿 build 暂时提交 donor 图标。source 中读取 Synara profile/storage 的迁移入口必须删除或从 composition 彻底断开；bundle ID、userData/home、protocol、storage key、updater channel 和 artifact identity 使用新的 first-public OmniMind namespace。当前 OmniMind 自有 workspace package 已一次性硬切到 `@omnimind/*`，不保留 `@synara/*` alias；真正承载上游或 Provider compatibility 的 API/env 名仍按其真实语义保留。任何其他 current-only production 文件都必须有一个已经写入 owner 的窄产品差异，否则删除。

Stage 2 不 fork Pi 源码树。构建过程从 exact pinned Pi source payload 生成第二个可复现的物理模块实例，只改变产品拥有的 package identity/configDir，使 Pi 内部 module-level project state 常量分别落到 `.pi` 和 `.omnimind`；原始 source payload digest 与生成差异必须可复算。stock Pi 的 identity、configDir、state 与 catalog 必须保持原样；唯一例外是同 revision product source 已证明的 typed prompt-outcome compiled patch，用于让已公开的 command/input handled 路径在共同 Pi-family adapter 中可结算。该例外必须 exact-hashed、由 Bun 安装时 fail-loud 应用，并在 upstream 提供等价 typed API 后删除；不得据此泛化修改 stock Pi。若该双实例在三平台不能被相同 lockfile、source digest 与 packaged artifact 证明，立即停止并改为窄 upstream instance-configuration patch；不得退回 Native Host 或第二控制面。

Stage 2 最初先把 inherited stock Pi adapter 单独升级到 `v0.84.1`，随后按独立 intake 更新到 `v0.84.2`；每次都先使 stock Pi tests/journey 通过，再验证参数化 provider identity/SDK loader 与 `omnimind` 双实例。这把“SDK 版本兼容”和“双实例隔离”拆成两个可证伪 checkpoint，避免在同一失败里猜测来源；不产生第二条长期 adapter 分支。

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
- bundled OmniMind Agent 以自身 identity/version 免安装运行，在模型未配置时准确阻止发送并引导 auth；Pi `v0.84.2` lineage 可追踪，代表性 Pi ecosystem 与 real-provider journey 通过；
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

W1 当时的唯一代码 Slice 是 **Responsive Workbench presentation correctness**，现已完成；它只闭合：

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

### W2 Codex resize continuity calibration（已完成）

W1 已完成主画布、Sidebar/Workbench presentation、i18n 与 packaged 基线。维护者随后于 2026-08-16 提供两段当前 Codex App 连续缩放/开关录屏，并明确要求 OmniMind 实际 follow 其空间连续性；这项新授权重新打开 W1 当时明确隔离的 Desktop 最小宽度与 Environment 自动退场，但不重开 Codex 皮肤复制、移动端重构或第二布局 authority。

W2 只闭合：

1. Environment 每次启动仍默认关闭；用户本次运行中手动打开后，Chat surface 受压时自动退场、恢复空间后恢复，受压主动查看走临时 overlay，且不改写手动 intent；
2. 默认宽度 Sidebar 在 `1000–1100px` 继续常驻，只有会把 Chat 压到紧凑生存宽度以下时才退场；缩窄/恢复保留 hysteresis、同一 mounted surface 与既有 `300ms cubic-bezier(0.32,0.72,0,1)` motion token；
3. Electron 最小窗口宽度从 `840` 下调到 `480`，但只有 Chat、Settings、PR、Editor、RightDock/Browser/Device、Plan、dialog、CJK/IME、focus、stream/scroll 与 light/dark/reduced-motion 的真实 route 矩阵闭合后才可形成 candidate；
4. 从精确 pushed SHA 重建安装包，以 fresh 隔离 profile 真实连续拖动 `1536→1280→840→684→564→480→…→1536`，验证退场顺序、几何、状态、关闭与重开。

W2 不新增全局 layout store/database/migration/registry、第二动画 runtime、移动端导航、Project instructions 语义、Settings taxonomy、Agent Core、Provider、release 或任何 Codex 品牌视觉。阈值只存在于既有 local resolver/route/surface owner；若 `480px` 的全路由或 packaged native surface 不能闭合，必须 fail-loud 并保留旧原生下界，不能用 Chat 单页或 storyboard 假绿。

W2 已在 exact pushed `0eec65ac93615bb752a3e2f68e45da0b4a30b943` 完成 focused、安装 App、480px route matrix、退出与重开证据。维护者随后明确要求在 W2 收口后直接更新 Pi 内核；该决定只准入下述独立 **P1 Pi stable baseline refresh**，不自动授予 C1 Gate B。

### P1 Pi stable baseline refresh（已完成）

本轮 exact source set 只包含 Pi stable `v0.84.2`、commit `914cf1472e715297caa30db4b9535d534a9eb718` 及其 exact `0.84.2` Pi-family npm artifacts；post-tag `main` 与其他 Pi ecosystem package 不进入 production。当前 `v0.84.1` 产品 patch 只允许按相同 owner 语义重放或在 upstream 已提供等价 seam 时删除，不得借升级扩大 Host、Agent Core、UI 或 package lifecycle。

P1 只闭合：

1. stock Pi 与 bundled OmniMind Agent 的 Pi-family closure、lockfile、vendor archive、source/compiled patches、generator digest、legal/provenance 与 adoption facts 一致升级到 exact `0.84.2`；
2. 逐项复核并语义 rebase 当前 ModelConfig reader/mutation/package-resource/prompt-outcome 与 OAuth callback renderer patch；旧 patch 不能按偏移机械套用，冲突或 digest 漂移必须 fail-loud；
3. 保留 `pi` / `omnimind` identity、`.pi` / `.omnimind`、Session、catalog、Package state 与 diagnostics 隔离；不激活新的 SQLite Session backend、Agent Harness、TUI surface 或第二 owner；
4. focused source/package/adapter/lifecycle/legal gates通过后，优先以 MiMo 与 DeepSeek 做最小真实 Provider 反例；从 exact pushed SHA 重建、安装，并以 fresh 任务 profile 完成启动、首轮/continuation、tool/stream、退出与重开验证。

P1 stop conditions：patch 进入上游 executor/session terminal/recovery state machine；stock Pi 与 OmniMind Agent 隔离无法保持；typed prompt outcome、OAuth default path 或 safe ModelConfig owner不能语义重放；真实 Provider或packaged journey出现无法归因的P0/P1。命中后停止升级并保留 `v0.84.1`，不加兼容双轨。

P1 已在 exact pushed product `d88edd3dbfb88bb4dd1791bb0f7994b52740898f` 完成 source、MiMo/DeepSeek 与 fresh installed-App 证据。维护者随后提供 OmniMind/Codex Sidebar rail 对照录屏并于 2026-08-16 明确授权继续施工，因此当时施工入口改为下述 **W3 Sidebar gesture continuity**；本段仍不自动授予 C1 Gate B。

### W3 Sidebar gesture continuity（已完成）

W3 只闭合：

1. Sidebar rail 从正常 resize 连续进入越阈值 off-canvas dismissal，反向拖回与 `pointercancel` 可逆；热路径不逐像素 React render/持久化，最终收起不覆盖最后有效展开宽度；
2. 手动关闭且空间允许时，窗口左缘 pointer hot zone 可临时展示同一 Sidebar；进入面板保持、移出自动收回，且不修改 manual intent、width storage、cookie 或 Settings；
3. pointer peek 明确为非模态，不抢焦点、不 inert 主画布、无 scrim/focus trap；header/键盘显式 compact overlay 继续沿既有 modal、Escape、focus return owner；
4. Sidebar drag/retreat/peek 期间 Timeline 与 Composer 保持稳定锚点，row hover card、tooltip 与行操作浮层静默；stream/scroll/draft/IME/focus、RightDock/Plan/Environment lifecycle 不退化；
5. Environment 每次 App 冷启动默认关闭；本轮不得把 session 手动打开或自动 presentation 写成跨启动偏好；
6. focused route/browser proof 覆盖 resize→dismiss、reverse、cancel、重复 peek、focus/inert、cookie/storage、主画布 geometry、EN/ZH、light/dark、full/reduced motion；候选从 exact pushed SHA 重建并以 fresh 隔离 profile完成真实 rail 拖动、hover、关闭与重开。
7. 维护者对 2026-08-16 14:06 installed 录屏的复核推翻了此前 `18rem` 舒适硬下界：`23rem` 只作 authored default，Sidebar 可连续缩窄到既有 `13rem` 物理下界，`208–287.99px` 的合法持久宽度必须保留，不再强制迁回默认值；pointer peek 可见时，toggle/真实快捷键的显式动作必须提升为常驻展开，不能再次收回。toggle hover 继续显示动作与当前真实快捷键；左缘热区 `12px`，pointer peek 进入意图延迟 `90ms`、离开 grace `60ms`，常规进入使用 `240ms cubic-bezier(0.32,0.72,0,1)`，pointer exit 使用可中断的 `180ms` 收回并保持 reduced-motion 语义。上述数值属于 W3 当前交互校准，不成为新 database/layout owner。

W3 只复用 `_chat`、Sidebar primitive、现有 Sidebar surface/off-canvas token 与当前 hover presentation owner。不得新增全局 layout/focus store、第二 Sidebar DOM、第二动画 runtime、Project instructions/Settings taxonomy、Agent Core、Provider 或 release；不得复制 Codex 视觉皮肤。实现与证据边界见 [`architecture/workbench.md`](architecture/workbench.md#chat-shell环境信息与响应式-workbench) 和 [`research/omnimind-responsive-workbench-review.md`](research/omnimind-responsive-workbench-review.md)。W3 完成前 C1 继续 deferred。

W3 已在 exact pushed `a5bae33aef7c068e0ee8700605ac58cb40e157b5` 完成 rail 连续 resize→dismiss、反向拖回、pointercancel、非模态 edge peek、显式 toggle 提升为常驻、`208px` 合法最小持久宽度、Environment 冷启动默认关闭及 fresh isolated packaged 证据。维护者随后明确授权首次启动纠偏，因此当时的下一代码 Slice 是下述 **W4 First-run three-step readiness**；C1 继续 deferred。

### W4 First-run three-step readiness（已完成）

W4 只闭合：

1. 真正零配置、全产品无可发送 exact Engine/model binding 且 authoritative facts 已 settled 时，shell 级单例自动打开已选 `focus-flow` 三步向导；loading/unknown/transport/read failure 不伪装首次，真实既有配置或选择失效进入 recovery；
2. 三步固定为选择 Engine、准备 Engine、选择 authoritative exact model。OmniMind 第 2 步复用现有 Model services/auth/custom API；其他 Engine 复用原生 setup owner；完成摘要不是第 4 步；
3. 删除 Composer 上方 `Agent 引擎需要处理 / 查看 Agent 引擎 / 模型设置` setup/recovery 横条及布局占位。延期只写 versioned local presentation preference，冷启动不重复 modal，继续入口复用 Composer 控件与 Settings；
4. Settings `概览 → 添加 → 详情`、Provider Registry/health、Pi ModelRuntime、typed bridge、credential/catalog、Composer draft 与 Dialog 继续是唯一 owner；不新增 backend、DB、Registry、credential store、静态 service/model mirror、全局默认或平行状态机；
5. `960×720`、`1440×900` 按已选 oracle 精确复核，`480×620` 使用同一 Dialog DOM 收缩；简中/英文、light/dark、full/reduced motion、keyboard/focus/ARIA、draft/附件/Thread/route 与 W3 Sidebar 连续性全部闭合；
6. 候选从 exact pushed SHA 重建并替换本机 App，用 fresh、任务专用 HOME/userData/`OMNIMIND_HOME`/Provider homes 证明隔离后，完成首次、延期→重开→继续、已有其他 Engine、恢复、真实 MiMo/DeepSeek、退出与重开 journey。

W4 的施工顺序严格为：先纠正 Workbench/research/本 brief 的 sole owner；再写纯 classifier 与 table-driven falsifiers；先 characterization Settings Model services 后只提取必要 seam；再挂载三步 Dialog、删除旧 banner、闭合视觉与 packaged 证据。若实现需要第二套持久化/auth/catalog owner、复制 Pi schema/credential lifecycle、静态猜默认模型或破坏 W3，立即停止。详细执行清单由维护者确认的 `omnimind-first-run-three-step-wizard-execution-plan.md` 提供，但稳定产品合同只看 [`architecture/workbench.md`](architecture/workbench.md)。

W4 已在 exact pushed `bde90d56e0d515bb39e5f4891779dadf6c8d0f0a` 闭合：三步 first-run readiness、Model services seam、首次/延期/恢复入口、完整中英文 catalog 与 fresh isolated packaged journey 均已进入 `main`。这项完成证据不授予 C1，也不把当前 installed macOS candidate 扩张成 V1 release。

### S1 Synara v0.7.2 source alignment（当前唯一代码 Slice）

维护者在 W4 完成后明确授权从 latest clean `main` 继续吸收 Synara 更新。当前入口绑定 `RUN SYNARA-072-INTAKE-2026-08-16-01`、`SPINE_REVISION=1`、`SPINE_ID=SYNARA-072@main-bde90d56+upstream-18ff9985`；source set 固定为 adopted `712d88f98b9afed9a4617b78dc62a8f342d93177` 到 tag `v0.7.2` exact `18ff99857d5b84adab2019c2839fa4f6df761b7c`。Spine 只负责本次运行的目标、边界和验收，不成为第二 Campaign、adoption record 或产品事实 owner。

S1 的第一个有界关注点只闭合四个底层、解释唯一的缺口：

1. projector replay 始终保留 `orchestration_events` integer primary-key range scan，并为 file-backed SQLite 设置有界 page cache 与 mmap window；不启用可能把历史量级 temp b-tree 搬进无界 native RSS 的 `temp_store=MEMORY`；
2. Provider `item.*` lifecycle 的 `detail` 接受原始首尾空白，避免合法多行 tool output 在 durable journal encode 时被隔离；title、ID 与其他产品字符串的 trimmed contract 不放宽；
3. deferred storage flush 在 partial DOM/SSR target 缺少 `addEventListener` 时安全 no-op，不新增第二 persistence owner；
4. 超限 Provider runtime event 先按 UTF-8 边界递归收缩 canonical payload 的 string leaves，再以 OmniMind identity 压缩 raw diagnostics；raw 与 raw-less 两条路径都保留 canonical event identity，仍无法安全收口的非字符串洪泛继续 fail closed。

本关注点必须补 query-plan、pragma、原始空白、partial DOM、UTF-8、raw/no-raw 与不可收缩 payload 回归测试，并通过相关 focused test、typecheck、format 与 diff check 后独立 commit/push。它不准入 projection recovery、text-segment migration、Automation、Workspace/UI/Git/PR/model picker/streaming 或 release/feed，也不提前更新 README 的 adopted Synara head。其余 v0.7.2 disposition 只有在本关注点形成 pushed candidate 且经过独立复核后才能继续。

上述第一个关注点已在 exact pushed `85889edb57d31c03b3032b3e93a25cd22973638b` 闭合。projection reliability 随后在 exact pushed `4c93bc3f37361f9ba4982ab9c9231f3520da3e4a` 闭合：由 server durable truth 判定空 Project shell 是否需要一次修复，保护真正 fresh `[]/[]` onboarding；projector bootstrap 以有界 batch 原子推进 tail cursor；snapshot fence 对缺失/停滞状态提供 typed fault、按 subscriber 有界升级与不中断整条 socket 的慢速重试；健康端点只暴露 snapshot-fence 范围内的 lag/missing 与 `hasFailure`，不暴露原始 failure。Chat remembered-route 的第二自动修复入口又在 exact pushed `78368b702905638c915a255c71b72001350f0f94` 以同一 server flag 闭合，fresh/deleted 空 shell 不再读取或修复陈旧 full projection。

Provider lifecycle reliability 的首个 source candidate 已在 exact pushed `facc827e5bc0facfb68b3f286731cb71b7747c0d` 进入 `main`：stale nonterminal 不进入 canonical journal 或 Product projection，旧 terminal 只凭 durable binding 精确证明同一 provider、event generation 与 active turn/session 后结算；recovery-capable send 不快路由进 generation-mismatch live adapter，显式 stop 保留 zombie cleanup authority，interrupt 不在缺少 physical-generation proof 时越过既有 guard。

该 candidate 的锁序 follow-up 已在 exact pushed `daf11de83889cd60b7fcb51defca7ec1680e3adf` 进入 `main`：binding-affecting runtime event 不再进入 lifecycle `runCurrent`，而是在 per-thread binding lock 内读 durable binding 与 current generation；current mismatch 的 nonterminal 仍拒绝，exact terminal 可在 current 已不同或未定义时结算旧 durable owner，new binding/provider/turn 继续 fail closed。canonical journal 与 binding update 同锁，update 失败让同一 event 重试，live publish 与 recovery 在锁外且仅发生一次；native fork 的 target binding commit 与 queued early binding event 共用同一线性化点。Reconciler、`stopAll` 与 compact 等非 physical-owner mutation 不扩张为同锁 writer。

`clearSessionResumeCursor` 的 pump-drain follow-up 已在 exact pushed `198d8ab6a3de47379af261927341111b2c6e38d4` 进入 `main`：adapter stop 返回不再被误作 runtime-event pump 已 drain；cursor clear 在锁外 stop、锁内重读同一 provider/physical generation 后，只清 cursor 并标记 stopped，保留该 generation、尚未结算的 active turn 与最新 runtime facts，再由 queued exact terminal 正常清理；真正的新 physical owner 一旦提交仍按 generation/provider/turn guard 拒绝旧事件。

R5 text↔tool causal interleave 的首个 source candidate 已在 exact pushed `6d4ba0f876313250c4668dc5679eba4c1437c49f` 进入 `main`：assistant text boundary 由 canonical Provider runtime journal sequence 排序；Migration `092` 在现有 `090`/`091` lineage 后增加 derived `message_text_segments`；SQLite/in-memory/snapshot/repository、normalization、WorkLog 与 MessagesTimeline 已接入 optional ordered segments，streaming 仍是单一 live row。该 SHA 只证明首个 candidate，不把 retained-message parity、runtime retry transactionality 或 mixed-order comparator 的后续审计缺口改写为完成。

R5 follow-up 已在 exact pushed `2c3dd0b8fb5f56a00ee45ae120fbc91074230202` 闭合 retained/pruned parity、可见 activity boundary、streaming/buffered/spill retry transactionality 与 mixed-order total order；其三个窄 falsifier随后在 exact pushed `91f7b6596c2bbe4d0d8d24f968501ce1ed11d8a0` 闭合另一 Thread 不切段、已有 split boundary 的双类重试与 in-memory rollback parity。上述 R5 历史不再是当前准入。

R7 Automation backend durability 的首个 source candidate 已在 exact pushed `a618f44e4f8ff3e01383803241480270f1d0b592` 进入 `main`：Migration `093` 保留 legacy failure policy，terminal accounting 与 definition revision CAS 已进入既有 repository/service/Web/Agent owners。该 SHA 不把 disabled transition side effects、deferred one-shot schedule ownership、misfire existing occurrence、dedicated attach owner fence 或 settled cache invalidation 的后续审计缺口改写为完成。

R7 deferred-one-shot follow-up 已在 exact pushed `08402ce87e97cdd4365d987513a15e4a0a75b546` 闭合 Migration `094` 的 exact owner pointer、scheduled/deferred DB fence、双 worker、crash/reopen、supersession、misfire pending-only 与 dedicated attach owner fence；manual/interval 不进入该 owner。

R7 final durability follow-up 已在 exact pushed `da1a107f8042d91f68105087633112ea33a69422` 闭合 legacy one-shot cleanup、scheduled/deferred hard fence、manual dispatch、misfire pending-only、隐式 terminal run 单次发布、最终 disabled pointer 归零与 threshold lowering failure-disable；不新增 migration、公共 event、UI 文案或第二状态 owner。

R7 disabled-cursor follow-up 已在 exact pushed `f780a0b88e5a6452a00aa62469582a04444b4627` 闭合：任何 full save 的最终 `enabled=false` 都把 `next_run_at` 归零，暂停期间窄字段保存不重生 cursor；重新启用 interval/cron 只从当次 resume time 与当前 schedule 计算未来 occurrence。持久化 terminal reason 仍留在后续。上述 R7 历史不再是当前准入。

S1 当时只准入 **R8 branch/draft/worktree continuity**：settled local Thread 与 detail-pending Thread 不得被共享 checkout 的 branch query 静默改写，Thread 切换必须重置 selector 的 optimistic state；resume send 先 fresh-read Git，但 branch 只能在 exact durable turn projection 解除 settled 后沿既有 sync owner更新，RPC reject 或 ACK ambiguity不得触发补偿反写。Home New chat 的所有入口与 fallback 复用既有 project+chat draft mapping，Studio 继续显式 fresh；不得新增 draft store。worktree setup 的确凿 pre-turn cancel 必须等待 late creation 与 cleanup，已 promotion 的 draft 先得到 durable `thread.delete` 成功，existing Thread 先得到 durable workspace detach 成功，此后才物理 remove 并更新本地；durable failure/unknown 不得 remove，remove failure不得显示完成，已经尝试 `thread.turn.start` 的 reject 不得进入 cleanup。branch mismatch notice 只复用现有 Composer surface，并同步闭合简中/英文 actual values；不得改变 W3/W4 geometry、scroll、tail、IME 或 focus。partial DOM 保留现有更强实现与回归测试，不重复移植。message fork、model prefetch、README adopted head、package/install/live 与其他 source 项不在本关注点。

R8 的 source gate 由 branch sync 纯判定、late-create 与 durable-before-physical cleanup 次序、project+chat draft/blob 隔离、Home/Studio caller 分流以及实际中英文 notice 回归共同证明；browser falsifier另外覆盖 settled mismatch 的长 branch 布局、attempted `thread.turn.start` reject 零 delete/detach/remove 且保留 draft/blob、promoted delete happens-before remove、remove reject 不显示完成，并复跑既有 Composer focus/IME/geometry/tail 与 partial-DOM persistence。上述证据只形成 source candidate；package/install/live 仍明确未准入。

R8 的首个 source candidate 已在 exact pushed `feba68da0ac017ac1922cae61b2e9639518cc3c6` 进入 `main`：branch selector、Home draft mapping、detached notice 与 pre-turn durable-before-physical cleanup 已落入既有 Web owners。该 SHA 不把 local-draft promotion 的 ACK ambiguity、后续 metadata failure cleanup 或 Work locally remove failure 的完成呈现改写为闭合。

R8 当时的 follow-up 只闭合上述 promotion/cleanup ownership：`thread.create` 只在 exact command receipt/replay 证明后取得 delete authority，pre-existing Thread 与 transport-unknown 均 fail closed；exact-owned draft 的后续 metadata failure以同一 delete command bounded replay，确认 durable absence 后才允许物理 remove。Work locally 只在 exact detach receipt 后进入物理 remove，remove failure保留 setup/error、不得开始 turn；空 Thread 的 active setup 不切回 centered landing。不得新增 server ledger、字符串 not-found 判定、第二 draft owner或 package/install/live。

R8 promotion/cleanup follow-up 已在 exact pushed `2378481e95fe27df556fb2f10612abb7cc08d67c` 闭合：create/delete receipt replay、confirmed-existing/transport-unknown fail-closed、metadata failure 的 exact-owned cleanup 与 Work locally detach→remove→turn 次序均已进入既有 Web owner。上述 R8 历史不再是当前准入。

S1 当时只准入 **R9 selected-only new-thread provider discovery**：Sidebar mount、idle、hover 与 focus 不得启动任何 Engine 的 model/agent discovery；真实 chat new-thread intent 只为 exact selected Engine 预热，并保持 provider override、target draft、sticky、Project default、App default 的既有优先级。discovery cwd 必须与 thread bootstrap 共用 explicit worktree（含 `null`）、fresh/temporary、local、stored draft、Project、Server 的同一裁决；query key继续由现有 React Query owner构造，disabled selected零调用，hidden 或 health absence不得换 Engine。fresh W4 的 OmniMind readiness 只消费 credential-blind Model services 与 server facts，不执行 Pi Extension；stock Pi、OmniMind 与 Droid只在既有显式 intent路径发现。不得新增 registry、scheduler、cache policy、availability fallback、README adopted head 或 package/install/live。

R9 source candidate 已在 exact pushed `907fbceb3875640fe11b029f6b039a46218324aa` 把预热收回真实 chat new-thread handler，并在既有 bootstrap plan 决定 target draft 后只启动 exact selected Engine；Sidebar mount/hover/focus、fresh W4 与普通 picker browse不再形成 Pi/Droid/OmniMind ambient discovery。query key继续复用 provider React Query owner，Claude binary、cwd precedence、disabled selected 与同 intent in-flight dedupe均有 focused unit/browser 证据；First-run 的 OmniMind eligibility只读取 credential-blind Model-services 投影。仓库 typecheck 6/6、R9 focused browser 4/4、partial-DOM 1/1通过。Web unit 全量为 306/307 files、3991/3993 tests通过；唯一 React Compiler guard 的 3 个 ChatView try/catch throw 与 1 个 `useComposerSlashCommands` memo bailout 已用 exact pre-R9 `2378481e` blob复现。Browser 全量为 75/77 files、454 tests通过；并发运行中的 Logo animation timing 与 Sidebar overlay click为首因，随后同一 ChatView runner出现级联，两个首因分别独立复跑均通过。该证据不被写成全绿，也不扩张到 package/install/live。

R9 override follow-up 已在 exact pushed `6b612293a0bd232fe111714a36748db0d02c6ca2` 修正 stored/current-route draft 恢复与显式 Engine override 的最终次序：任何旧 Composer 恢复完成后再次应用同一个 override，最终 active Provider 与已预热的 exact Provider 保持一致；无 override 时仍是纯 no-op，prompt、attachments 与原 draft/sticky/project/app 裁决不变。author-equivalent `chat.newClaude` browser journey 同时覆盖 stored draft 与 current-route draft，均证明只请求 Claude catalog、最终 active Provider 为 Claude 且草稿内容未丢失。上述 R9 历史不再是当前准入。

S1 随后准入并完成 **R10 streaming render isolation and bounded recovery backoff**：streaming assistant text 沿既有 Smooth reveal owner 以至少 `40ms` 的 React commit 间隔渐进呈现，settle、non-append repair、reduced motion 与 emoji surrogate boundary 必须准确；同一 streaming tail 的纯增长继续由 LegendList `maintainScrollAtEnd` 持有，不重复触发 Chat 显式 re-stick，新消息、empty→content、settle、completion 与 settled repair仍触发；settled tail以无缓存的双 `32-bit` 全内容 fingerprint区分等长内容/空白修复，不把 text length或 WeakMap变成第二事实。message-trail preview/entries 只以 immutable object/array identity做 WeakMap memo，scroll 的 `isAtEnd` 同步交付而 highlight 合并到 animation frame，overlap guard 只有 exact unique bottom-most grow 才跳过 layout measurement。

R10 的 normalized store/projection 只补既有 owner 中的 identity 与 hot path：Project persistence 仅在 immutable projects reference改变时重算；message update 从 tail 向后找；detail/textSegments 必须先落地，已有 pinned sidebar summary 才可避免重建 Thread；Split 只消费 module-stable shell selector并 memo sort。10k deterministic harness 只验证 affected message notification、unaffected message/id/project/activity/summary reference，不设 wall-clock阈值、不建立永久 benchmark world。activity 只在 normalized ids/maps已存在、调用者未要求刷新 Sidebar summary、整批为 turnless、无 pending interaction、每个 id均为新值且 append后不跨 `2000` cap时走同一 projection owner中的 append-only path；duplicate tail、same-id richer replacement、turn-aligned、pending interaction、Sidebar refresh与 cap crossing全部回到既有 accumulator/dedupe/prefer-richer语义。usage、threadSummary、caps、R5 comparator 与 W3/W4 owner不新增第二 cache或语义。

R10 recovery 只在现有 EventRouter 内保留 bounded replay/projection no-op backoff：new turn shell/detail event一到即清除旧 turn streak并把 projection gate恢复到 base cadence；applied event、pending dispatch、terminal/draft repair与 request failure同样回到 base cadence；confirmed no-op有界拉长；superseded stale projection保留既有 streak。每个 replay RPC捕获 exact subscription generation/lease，late nonempty response在 release/reacquire、reconnect或 cleanup后均为 zero apply/zero backoff mutation；in-flight finally只可清除自己 generation 的 guard，不能删除新 lease owner。候选必须覆盖 generation/release/supersede/failure、R5 interleave、smooth/scroll/overlap/composer stress、typecheck/unit/browser/format/lint/document/diff；不得新增 query/cache/registry、package/install/live、README adopted head或 release。

R10 source candidate 的 pre-commit 证据为：focused unit `10 files / 560 tests`、shared thread-summary `11/11` 及 activity normalization/projection/reducer `3 files / 134 tests` 通过；root typecheck `6/6 packages` 通过；smooth/overlap/tail-anchor browser `3 files / 12 tests`、Chat auto-follow + `60` delta IME/draft/attachment/focus `2/2`、EventRouter 完整 `19/19` 与 near-cap composer代表项 `1/1` 通过。Web unit 全量为 `307/308 files`、`4002/4004 tests` 通过；唯一失败仍是已用 exact pre-R9 `2378481e` blob复现的 React Compiler guard：ChatView try/catch throw三项与 `useComposerSlashCommands` memo bailout一项。

ChatView browser 不能写成全绿：首轮为 `113 passed / 30 failed / 12 skipped`；收窄旧 tail-expansion wheel takeover断言并让 browser fixture只预置 stale-known public catalog、显式 picker/Engine intent仍走真实 query owner后，第二轮为 `132 passed / 11 failed / 12 skipped`。随后 route/Plan/task count/model cycle/explicit picker与 current-Engine discovery代表项均 focused通过；这些只关闭旧 fixture/locator债，不恢复 ambient discovery。Cross-Engine recovery巨型测试在 immutable exact `2378481e95fe27df556fb2f10612abb7cc08d67c` archive上约 `7s` 首败于 Claude 切换后的 `No available model`；当前 candidate以显式 selected Claude intent越过该首因，但整条 journey仍触发 `90s` test timeout，因此准确保留为未绿的 browser test debt，不归因为 R10 production反例。该 source-only candidate不自动准入 package/install/live。

R10 source candidate 已在 exact pushed `bf9a8eb4d4fb360ab822cf0b23c7fb6bd379931c` 进入 `main`；generation/lease replay fence、settled-tail 等长内容 identity 与 new-turn projection backoff reset 的 Judge follow-up 随后在 exact pushed `c59d544269f93f9702ffbd0033e76a02738413cb` 闭合。上述 R10 历史不再是当前准入。

S1 随后准入并完成 **Phase-9a Workspace filename + content search**：现有 `WorkspaceSearchSidebar` / `WorkspaceExplorerSidebar` 仍是唯一入口与结果面，filename 继续使用既有 Workspace index/ranking，content 只在同一输入达到两字符后并行检索，并以 filename rank在前、content path/line在后的单一扁平列表投影；snippet 只打开文件，不宣称行定位。不得新增 command palette、快捷键、全局 store、第二 index/cache、ripgrep/runtime dependency 或 W3 layout owner。

Phase-9a 的 server 路径只扩现有 `WorkspaceEntries`：复用 git-aware index，content scan 必须跳过 hidden/ignored、binary、非法 UTF-8 与超过 `512KiB` 的文件；每文件最多 `5` 条、最多 `2000` 文件、server contract最多 `100` 条、UI最多 `80` 条、并发 `8`、总 budget `4s`。workspace/candidate 必须 physical realpath containment；打开后在读取前后以 handle/path/root identity与 `dev/ino` 再验，外部或置换 symlink为零内容、root内 symlink保留。TanStack query signal必须穿过 NativeApi/WebSocket/Effect，Web RPC以 `5s` ceiling fail loud；file-change同时 invalidates filename/content query，新旧 query不得交叉投影。

Phase-9a 验收必须覆盖 author-equivalent基础/短 query/binary/per-file/global limit，以及 hidden/ignored/oversize/fatal UTF-8、root内与外部 symlink、open期间置换、active abort、总预算、2000-file cap、file-change invalidation、RPC admission/ceiling；真实 DOM/browser还需证明单列表顺序、stale/late response、Arrow/Home/End/Enter/Space/Escape、focus、ARIA live/busy、简中/英文 actual values和 `480/960/1440` 无横向 overflow。W3 Sidebar `13–23rem`、Editor/RightDock同一 mounted surface、package/install/live、README adopted head与 C1均不得改变。

Phase-9a source candidate 的 pre-commit 证据为：server WorkspaceEntries/admission owner `3 files / 36 tests`，web query/transport/i18n/navigation/Editor owner `5 files / 72 tests`，真实 Chromium workspace search + relocation owner `2 files / 7 tests`，新增 contracts/RPC targeted `2 files / 6 tests`，root typecheck `6/6`、root lint `0 errors`、changed-path format与 `git diff --check`通过。contracts 全包仍有旧 automation proposal fixture缺少 `expectedDefinitionRevision` 的 `1` 个失败；该首因已在 immutable exact `c59d544269f93f9702ffbd0033e76a02738413cb` 同一 `ws.test.ts` 复现，不能写成 Phase-9a 全包绿色，也不扩修无关 automation owner。按本 Slice 明确边界不运行 package/install/live，因此这里只是 exact pushed source candidate，不能宣称当前安装 App 已获得该功能。

Phase-9a 首个 source candidate 已在 exact pushed `c0038039015fa6c623289a08b77421e35c15d709` 进入 `main`。Judge HOLD follow-up 只在既有 `WorkspaceEntries` owner 内补齐 index build 的 identity-token lease：每个 caller 的 signal/deadline 独立结算，最后一个 lease 释放才中止 shared build；clear 先移除 exact identity 再 abort，旧 build 的 then/finally 不得回填 cache 或删除 replacement。Git subprocess、git-ignore 与 non-Git scan均消费同一 build signal；root identity 只比较 canonical realpath 与 `dev/ino`，普通目录 metadata 变化不误判，root replacement返回 incomplete。content 每次打开前后都以当前 index path set重新验证 canonical target，visible symlink指向 hidden、`.omnimind` 或 gitignored target均拒绝；non-Git只索引 root内 regular-file symlink，不遍历 directory symlink。canonical Provider `file_change` 在活动投影前沿既有 Thread→Project→workspace cwd链清除 exact server cache，Web cached rows在 current query `isFetching` 期间不展示也不可键盘激活。该 follow-up 不新增 watcher、index、cache、palette、layout owner、package/install/live 或 README 更新；旧 automation contracts baseline仍不在本关注点。

Judge HOLD follow-up 的同一 pre-commit tree 证据为：Workspace index/content `2 files / 40 tests`、Provider runtime ingestion `2 files / 111 tests`、web query `1 file / 4 tests`、真实 Chromium search/relocation `2 files / 8 tests`通过；root typecheck `6/6 packages`、root lint `0 errors`、changed-path format、`git diff --check`与旧 build停止后零额外目录工作/content handle闭合断言通过。root lint仍报告仓库既有 `478 warnings`，changed paths中 `ProviderRuntimeIngestion.ts` 的三条既有 warning未扩修；不能写成 lint零 warning。

同一 Judge 的 current-policy P1 follow-up 从 exact pushed `48da69e7876ddbd47eccd5fc2f3fb3cfd4f85906` 继续，只修正 warm index 不能授权当前 gitignore 的缺口：content scan在读取前有界解析最多 `2000` 个 alias到 canonical relative path，继续以 containment、hidden/default ignore与当前 index identity为前置条件；Git workspace复用既有 hardened `git check-ignore --stdin` chunk owner做一次批量 current-policy gate，只读取当下 unignored target。实际产生 match后，再对最终 canonical targets批量复核；mid-scan新增 root/nested `.gitignore`时 direct path与visible symlink均不得返回，unexpected或truncated `check-ignore`结果 fail closed为明确 search error，budget耗尽保持 empty + truncated。non-Git继续只用既有 hidden/default ignore。该闭合不新增 per-file subprocess、index、watcher、cache、fingerprint或公共合同；focused Workspace owner为 `2 files / 43 tests`通过。

同一 Judge 的 candidate-pair/source-mode follow-up 从 exact pushed `e70bf0e4f6ad6d1bb22d525c35486524a5b7ebbd` 继续：Workspace index record只携带本次 build 已裁定的 `git/default` policy mode，不新增 cache truth。build与current gate均先用 physical root向上查找 `.git` directory/file metadata；确认为无 metadata的 true non-Git直接沿 default policy，Git executable缺失也不执行 subprocess；存在 metadata或已记录 Git mode时，Git policy无法执行必须 fail closed，不能降级为 non-Git。两阶段 batch gate都以 `(lexical relativePath, canonicalRelativePath)` candidate pair为单位，任一侧被当前 policy ignore只移除该 alias；post gate继续按完整 pair identity过滤，不把 allowed canonical target错误扩张给ignored alias。warm root/nested alias ignore、mid-scan alias-only policy change、no-Git/no-binary与recorded-Git policy unavailable均由 focused Workspace `2 files / 45 tests`覆盖；不新增 index、watcher、cache或per-file subprocess。

最终 one-condition follow-up 从 exact pushed `3875bca24f307368e49908b04f2a3bea7fe91bc6` 只把 recorded Git mode 的 current `false/null` 固定为 fail closed、zero open；仅显式 clear 后的 fresh build 可重新裁定 true non-Git/default，focused Workspace `2 files / 46 tests`通过。

Phase-9a 的最终 source candidate 已在 exact pushed `c4e8e7bcaf85b2c60da46dd3f878a587a65530de` 进入 `main`；上述 Workspace search/current-policy 历史不再是当前准入。

S1 上一独立代码 Slice 是 **Phase-9b Chat file-link context menu**：只吸收 Synara `bf07024a` 的真实 author 语义，让 assistant/openable file link 复用既有 `fileReferenceContextMenu`；position-free absolute local path在 Desktop提供平台原生 Reveal，relative path或 browser只保留 Copy，assistant link明确不提供 `Reference in Chat`。共享菜单既有 Reference/Ask与新增 Reveal/Copy、失败 toast全部使用同一简中/英文 catalog；`Shift+F10`/Menu key 的零坐标按 focused target rect定位并保持焦点。不得新增 `readFile` purpose、内容附件、draft/persistence、turn contract、Provider prompt、surface、store或 schema。

Phase-9b pre-commit source-candidate 证据：shared-menu helper与现有 caller focused unit `3 files / 54 tests`、Chromium assistant/Workspace/Preview `3 files / 15 tests`、monorepo typecheck `6/6`、document contract `21/21`、changed-path format与 diff check通过；全仓 lint `0 errors / 478 warnings`，本轮路径 `0 errors / 4` 条未改旧行 warning。此次按 menu-only Gate 未重建或安装 packaged App，因此只主张 source-only candidate，不主张已安装产品验证。

Phase-9b menu slice及其 fallback focus follow-up 已在 exact pushed `857fef191d729573ed2c359c5b3184c7acd87f79` 进入 `main`；上述菜单历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9b legacy compacted reasoning anchor**：只吸收 Synara `c4a82e0e` 的单一 author 语义，让连续 legacy reasoning group 的可见内容、最新状态与其他字段继续来自 latest update、group identity继续锚定 first id，但 `createdAt`与durable `sequence`同时锚定 first update。最终 Timeline 中 compacted reasoning不得因 latest timestamp或sequence越过其间的 assistant text或 tool row；不得改变 canonical reasoning item、compaction边界、排序 owner、字段 schema、stream或 Timeline surface。

该 Slice 的 pre-commit source-candidate 证据：agent activity compaction与最终 Timeline排序 owner `2 files / 107 tests`、monorepo typecheck `6/6`、changed-path lint `0 warnings / 0 errors`、format与 diff check通过；Judge follow-up以reasoning `sequence 10/30`、assistant text segment `20/21`与tool `40`证明display row同时保留first sequence/createdAt且不越过assistant，latest status/native/detail等字段继续保留。本 Slice 不新增 surface、dependency或长期 owner，未重建安装 App，只主张上述 source-level legacy排序修复。

Phase-9b legacy compacted reasoning anchor及其sequence Judge follow-up已在 exact pushed `646094d6808d3a612825cb62d3db0c928dc24538` 进入 `main`；上述 reasoning 历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9c Git selected diff render identity A1**：只吸收 Synara `00ff2f45442c365c1fc96671b4546065ebf4f9bb` 的单一 author 语义，在既有 `GitPanel` selected diff seam复用 `buildFileDiffRenderKey(selectedFileDiff) + theme` 作为React identity。staged/unstaged同形patch的A→B切换、同文件内容刷新与light/dark切换必须remount并显示当前diff，同时不得改变selection owner、stage/unstage mutation、Pull/Commit/PR/stack、server/contracts/catalog、W3/W4 geometry、focus或keyboard语义。

该 Slice 的 pre-commit source-candidate 证据：现有 diff identity owner `1 file / 23 tests`与真实 Chromium GitPanel `2 files / 5 tests`通过，其中mount-time harness `1 file / 3 tests`覆盖staged→unstaged同形patch及其exact clicked-row focus、same-path内容刷新与light→dark remount/render；refresh/theme路径不扩张声称焦点连续性。monorepo typecheck `6/6`、changed-path lint `0 warnings / 0 errors`、format与diff check通过。本 Slice不改变用户文案、layout、query/mutation或外部Git authority，按准入不做package/install/live/README。

Phase-9c Git A1及其证据边界follow-up已在 exact pushed `e3afdc56b7cd7176942379616838cefc7c7542cd` 进入 `main`；上述selected diff历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9c Git behind-only header Pull A2**：只吸收 Synara `bcf7f1f1c90c4e8a3f5346b89f9fda3ee8dcc0e0` 的用户语义，按当前 Omni owner在Environment模式Header新增一个thin Pull control。它复用既有branches/status query、exact-cwd pull mutation与success/failure toast presentation；只有repo/status可用、branch与upstream明确、`behindCount > 0 && aheadCount === 0`时显示，non-repo、loading/error、up-to-date、ahead、diverged、no/unknown-upstream、detached均为零，运行中的exact cwd例外保持本地化Pulling并禁用。不得挂第二个完整`GitActionsControl`、dialog、commit shortcut、store、server/contracts、Commit/PR/stack或layout owner。

该 Slice 的 pre-commit source-candidate 证据：Git availability/既有action与Header owner `2 files / 132 tests`，真实Chromium thin control `1 file / 9 tests`覆盖root checkout/managed worktree exact cwd、无dialog/menu、running、键盘/focus/ARIA、现有英中`git.action.pull/pulling` actual values及`480/960/1440`横向geometry；既有ChatView Environment geometry `1 file / 8 tests`、monorepo typecheck `6/6`、format与diff check通过。changed-path lint为`0 errors / 1 warning`，唯一warning是exact base已存在的`renderProviderIcon` function-scoping行，本Slice不扩修。按准入不做package/install/live/README。

Phase-9c Git A2 已在 exact pushed `172d7cfb384e6e29de73480a606833ab67a7dc31` 进入 `main`；上述 thin Pull 历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9c Git Commit dialog action matrix A3**：在既有 `GitActionsControl` query、mutation、presentation 与 Base UI Dialog/state owner内，把 Commit 对话框收口为 Commit on new branch、Commit、Commit & Push、Create/View PR 四行紧凑 action matrix；共享 resolver 必须以 `item.dialogAction ?? item.id` 裁决真实动作。pure Push 不受 file selection gate；dirty 且零选择时所有会生成 commit 的动作 fail closed；Create PR 只在 include-local-changes 且确实需要 commit 时转交 trimmed commit message 与 exact nonempty selected file subset，关闭该选项则忽略；existing PR 直接走既有 external open。disabled row保持可聚焦，以 `aria-disabled`、可描述的英中原因和 Enter/Space 零副作用表达不可用。

该 Slice 必须保护 A2 thin Pull、rich PR/default-branch confirmation、exact-cwd、既有 toast/focus 与 query invalidation；不得新增第二 Git control、dialog chrome、server/contracts、stack、layout owner或 whole-port donor。候选只以 logic matrix、真实 Chromium handoff/View PR/keyboard/narrow geometry、英中文案、typecheck、lint、format、document contract与diff证明；按准入不做package/install/live/README。

Phase-9c Git A3 的 pre-commit source-candidate 证据为：Git action/availability logic与英中 catalog `2 files / 146 tests`、真实 Chromium Commit action matrix `1 file / 5 tests`、A2 thin Pull Chromium回归 `1 file / 9 tests`、monorepo typecheck `6/6 packages`与document contract `21/21`通过；changed-path lint为`0 warnings / 0 errors`，root lint为`0 errors / 478 warnings`，changed-path format与diff check通过。全局 product-copy guard仍有`workspaceExplorer.tsx`两条未触碰path/line raw-fact attribute的既有`1`个失败，本Slice不扩修该owner，也不把catalog parity扩张为全局copy全绿。按准入未运行package/install/live/README，故只主张source-only candidate。

A3 Judge HOLD P1 follow-up 只修正 default branch clean-ahead 的 `id=push / dialogAction=commit_push` 不代表真实会生成 commit：selection gate与Commit-dialog authoring handoff现在同时以当前 working-tree changes为准；clean-ahead 保持既有 `commit_push` action和default-branch confirmation，但不携带commit message/file paths，dirty counterpart仍在零选择时fail closed并在有选择时保留authoring。focused logic为`1 file / 138 tests`、真实Chromium matrix为`1 file / 6 tests`通过；不改变A2、PR、server/contracts、dialog chrome、layout或其他owner。

Phase-9c Git A3 及其 P1 follow-up 已在 exact pushed `66c548369418bc5eed6a99b6b7368da4c88cd226` 进入 `main`；上述 Commit dialog action matrix 历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9c Git stacked pull request read-only B1**：只吸收 Synara `57eacdb897193a7eac5820060371d99ee4699a0b` 的权威只读投影语义。既有 GitHubCli 通过 GitHub GraphQL `stackEntry` / `stack` 字段投影列表 position/count summary 与详情完整 bottom-to-top entries；不得以 branch 命名、本地 Git 拓扑或持久化数据猜 stack。列表 enrichment 是 progressive enhancement，失败时保留原 PR 主行且只隐藏 stack badge；详情只有在 cursor、count、连续 position、跨页 identity 与 selected PR 全部自洽时才提供前后导航，任一 incomplete/mismatch 都保留 PR 详情但 fail closed 为无导航。

B1 只复用既有 PR list/detail contracts、PullRequestService、wsNativeApi/TanStack query、`PullRequestRow`、`PullRequestDetailPanel` 与 route URL selection owner：列表只增加中性 `2/3` 紧凑 badge，详情内部 previous/next 切换同仓库 PR，并在 selection remount 后把键盘焦点交给仍可用的 stack control；内部导航不得使用 external-link glyph。英中实际 catalog、ARIA group/label、Enter/Space 与 `480/960/1440` 几何必须闭合。不得引入第二 store/palette/route/dialog、merge mutation/confirmation/expected target-set、local persistence/product DB、GitHub 写 probe、Commit dialog/A2/search/package/install/live/README。

B1 的 pre-commit source-candidate 证据为：contracts、GitHub GraphQL、PullRequestService、详情 fail-close 与 web projection logic focused unit `7 files / 127 tests`，英中 actual catalog focused `1 file / 10 tests`，真实 Chromium list badge + detail keyboard/focus/ARIA/`480/960/1440` `2 files / 15 tests`，monorepo typecheck `6/6 packages`与document contract `21/21`、changed-path format与diff check通过。changed-path lint为`0 errors / 4 warnings`，均是未触碰旧行的i18n test `sort()`与route `selectedInput` exhaustive-deps；root lint为`0 errors / 478 warnings`。该 Slice 不改变任何 GitHub mutation、merge/Commit owner或发行面，按准入只主张 source-only candidate。

B1 Judge HOLD focus follow-up 只收窄详情导航的焦点交接条件：初次详情挂载或鼠标从列表打开、没有明确 `preferredFocus` 时，导航组件不设置任何 `autoFocus` target，外部/PR 行触发器焦点保持不变；只有 previous/next 选择造成的详情 remount 才优先恢复同方向控制，若该方向到达 stack 边界则退到另一仍可用控制。真实 Chromium stack focused `1 file / 3 tests`、与既有 PR 行合跑 `2 files / 16 tests`，同时覆盖初次挂载零抢焦点、双向同方向恢复、双侧边界 fallback 与既有窄视口 geometry；monorepo typecheck `6/6 packages`、document contract `21/21`、changed-path lint `0 warnings / 0 errors`、format 与 diff check通过。不改变 server、contracts、route、query/data 或其他 Git owner。

Phase-9c Git B1 及其 focus follow-up 已在 exact pushed `968b54126f311bf820ba1561ddc69d1ad7b7313b` 进入 `main`；上述 stacked pull request 只读投影历史不再是当前准入。

S1 当前唯一代码 Slice 是 **Phase-9c Git stacked pull request merge safety B2**：merge action 必须携带由 fresh complete详情确认的 standalone expectation，或 stack number、size、selected position、ultimate base 与本次实际 merge 范围内 exact ordered PR numbers。既有详情 Dialog 明示 merge method、base 与 exact targets；stack metadata incomplete、详情刷新或 stack expectation变化时确认键保持可聚焦并以 `aria-disabled` 与英中原因 fail closed，必须关闭后重新确认。

server 在同一 mutation owner 内串行化 merge，并在每次 mutation 前 fresh读取详情与 authoritative GitHub stack projection；任何读取失败、null/stack形态、number、size、position、base、member/order/selected target不一致均返回 typed conflict、零 mutation。已确认 standalone 继续单次 `gh pr merge`；stack优先使用 GitHub documented asynchronous merge endpoint，JSON只经 stdin 传递。只有 endpoint明确 HTTP 404 unavailable 时才进入既有逐 target fallback，且每一项都必须 fresh确认 `MERGED`，任何 unknown/partial result均失败且不得投影 merged success。成功或失败后的 detail cache按 exact target set收敛，不扩张到 stack范围外成员。

B2 不新增第二 store、dialog、route、local topology推断或产品数据库，不做真实 GitHub write probe、package/install/live/README；它只允许在现有 contracts、GitHubCli、PullRequestService、ws RPC、TanStack mutation与详情 presentation owner内最小扩展。source gate必须覆盖 expectation decode、fresh conflict矩阵、double-confirm race、async stdin、404/non-404、legacy partial unknown、all-target invalidation、Dialog stale/incomplete keyboard语义、英中 actual values、typecheck、lint、format、document contract与diff check。

B2 的 pre-commit source-candidate 证据为：contracts expectation decode `1 file / 8 tests`，server GitHub async/legacy、fresh preflight、conflict与mutation serial owner `3 files / 61 tests`，web expectation/cache/英中 actual unit `4 files / 46 tests`，真实 Chromium stale/incomplete/cached-error confirmation `1 file / 3 tests`，monorepo typecheck `6/6 packages`与document contract `21/21`通过；root lint为`0 errors / 478 warnings`，changed-path lint为`0 errors / 3 warnings`且三条均是未触碰的 i18n test `sort()`旧行。GitHub async endpoint与 response status/UUID/poll schema只以 2026-03-10 official API docs和 author-equivalent fixtures证明，本轮明确不执行真实 GitHub写入；changed-path format与diff check通过，package/install/live/README均未运行，因此只主张 source-only candidate。

B2 Judge HOLD identity follow-up 只收紧 async poll 的 request identity：首次 `pending` 必须给出 standard、path-safe UUID，后续 GET 永远只使用该 accepted UUID；任何后续 `pending` 或 terminal response 携带非法/不同 UUID 都立即 fail closed，不访问漂移路径、不投影成功。直接 `merged` / `enqueued` 继续不要求伪造 UUID，merge method/action strict check保持不变。focused GitHubCli `1 file / 38 tests`覆盖 A→B pending drift、terminal drift、只 GET A、零 GET B 与 unsafe UUID零 poll；不改变 contracts、service、UI、fallback或其他 Git owner。

Phase-9c Git B2 及其 async identity follow-up 已在 exact pushed `78701868bc8c8ee1c79664aaf8b5937e85c9a354` 进入 `main`；上述 stacked pull request merge safety 历史不再是当前准入。

S1 当前唯一代码 Slice 是 **R11-1 OpenCode running tool title normalization**：只吸收 Synara `9a42dc9c256f696f0efc4aa71676b09a5a77b5b1` 的单一 author 语义，在既有 OpenCode adapter item-lifecycle title owner 内把 running tool 的 provider title 收为 trimmed nonempty 值，否则回退 exact tool name。纯空白或换行 title 不得越过 durable `TrimmedNonEmptyString` contract并隔离整条 item event；completed item 继续使用 tool name，`detail` 继续保留 Synara `5bae5420` 已准入的原始首尾空白字节。

本 Slice 只补 OpenCode adapter/lifecycle author-equivalent tests，证明换行 title 精确 trim、纯空白 fallback、completed title语义与后续 consumer连续性、untrimmed tool detail byte preservation；不得改变 contracts、journal schema、其他 Provider、UI、package/install/live、README或建立第二 normalization owner。候选只以最窄 focused owner、monorepo typecheck、changed-path format/lint、document contract与 diff check证明。

R11-1 OpenCode running tool title normalization 已在 exact pushed `ef83481cf2ed8cc9c06a713859ce8e58cca3a439` 进入 `main`；上述 title durability 历史不再是当前准入。

S1 当前唯一代码 Slice 是 **R11-2 app-owned `/fork` collision policy**：只吸收 Synara `08da8c3ac2e555c43459750a408a6ee4e781b29f` 的单一 author 语义，沿现有 Composer slash-command discovery、filter与execute链保证 OmniMind `/fork` 在 Claude、Codex、OpenCode 等 Provider 同时暴露 native `fork` 或 `branch` 时仍唯一显示并执行现有 Product fork handler。Claude native `/branch` 保留自身语义，不再 alias为 `/fork`；只有当前 surface 确实提供 app `/fork` 时才隐藏 literal native `/fork`，app action不可用时不得误藏 provider fallback。

本 Slice 复用现有 command menu、keyboard selection、fork target picker与执行 owner，不新增 command store、route、Dialog、contract或 message-level fork入口；不改变布局。focused proof必须覆盖 Provider matrix、native collision、app-unavailable fallback与真实键盘选择进入现有 fork target picker；现有英中 catalog actual values保持。候选只以相关 unit/browser、monorepo typecheck、changed-path format/lint、document contract与diff check证明，不做 package/install/live/README。

R11-2 的首个 candidate `f6b9f2dcaf9ae15436683c7df81cd235ed30ada1` 已建立 menu collision policy，但 ChatView 的真实 `canOfferForkCommand` 尚未贯通 standalone command availability：app fork不可用时，literal provider `/fork` 虽能出现在菜单，提交仍会被 app handler误消费。当前窄 follow-up 只沿既有 ChatView → `useComposerSlashCommands` → Provider turn链传递同一availability，证明native fallback真实提交且不打开fork target picker，同时保持app available collision仍唯一进入picker；不扩张上述边界。

R11-2 已在 exact pushed `94d7442cfa6bfc97e53540441f9257782fe1e80f` 闭合；上述 slash-command collision不再是当前准入。

S1 当前唯一代码 Slice 是 **R11-3 per-turn task snapshot row**：只吸收 Synara `aa551a90962096287f7053cb5a3a704218ed73cc` 的成熟 task-snapshot投影语义，并按当前R5 causal ordering与中英文产品文案加强。现有 `turn.tasks.updated` 全量快照在同一turn折为一行：id、createdAt、sequence锚定首个有效snapshot，计数与in-progress detail取最新有效snapshot；空或不可读snapshot不得抹去已知进度，下一turn与turnless未知边界保持独立。Composer task card与Timeline复用 `workLog` 唯一parser，Timeline复用现有 `taskList.progress`英中catalog，并绕过只适用于tool lifecycle suffix的heading normalizer。

本 Slice 只改现有 `workLog`、`session-logic`、`TimelineWorkEntryRow`及相关tests/brief，不新增Goal/Todo/store/route/contract、第二parser或折叠状态，不改变R5排序、Timeline collapse/scroll/focus与布局。focused proof必须覆盖多snapshot、invalid/empty守恒、首个有效sequence锚点、跨turn边界、complete heading、中英actual与现有Composer parser consumer；候选只做source unit/browser、typecheck、i18n parity、format/lint/document/diff，不做package/live/README。

R11-3 已在 exact pushed `66745de284d429b975d72be56b43ffb14286fc2a` 闭合；上述 task snapshot 投影历史不再是当前准入。

S1 当前唯一代码 Slice 是 **R11-4 provider rate-limit window labels**：只吸收 Synara `8868394c47d9e8ab2557afe07c6f36a8556c0026` 的窗口命名语义，在现有 `rateLimits` normalization 与共享 `ProviderUsageLimitRows` presentation owner 内将 `seven_day_overage_included` 等同义值收为稳定 `Weekly (overage)` identity，并固定紧随 `Weekly`；未知窗口先确定性人类化，再由共享行投影为英中产品级 generic label，不能泄漏 raw snake_case，也不能因 generic copy 破坏 distinct id、dedupe 或排序。

本 Slice 复用现有 Settings/popover 行、catalog 与 `UsageProgressTrack`，同步本地化可见 label 与 progressbar accessible name；不得新增 usage owner、组件、store或数据源，不改变 Provider capacity、pacing、reset 与百分比语义。focused proof必须覆盖 overage alias/order、未知窗口 humanization/distinct/dedupe/stable sort、英中 actual visible/ARIA、catalog parity、monorepo typecheck、format/lint/document/diff；仅交付 source candidate，不做 package/live/README。

R11-4 的 pre-commit source-candidate 证据为：rate normalization 与 catalog parity focused unit `2 files / 18 tests`，真实 Chromium 英中 ordered visible label、raw snake_case exclusion与 matching progressbar accessible name `1 file / 2 tests`，monorepo typecheck `6/6 packages`、document contract `21/21`、changed-path format/lint与 diff check通过；root lint为`0 errors / 478 warnings`。全局 product-copy scanner 仍命中未触碰的 `workspaceExplorer.tsx:475/477` 两条既有动态 search-result ARIA 字符串，本 Slice 不把该 baseline 改写为绿色。未改变 Desktop shipped bytes，package/install/live/README均未运行，因此只主张 source-only candidate。

R11-4 已在 exact pushed `0e0ee9ca118e9b4bf81b01aaa1e2ea9de5fc5d72` 闭合；上述 rate-limit window label投影不再是当前准入。

S1 当前唯一代码 Slice 是 **R11-5 Windows runtime taskbar icon refresh**：语义吸收 Synara `6fbed3a9e1f08a46a42967d5dbc39c8c1439248d` 的 Explorer taskbar icon cache刷新机制，并加强连续更新的generation守恒。现有 `desktopAppIcon` owner在valid resource已由BrowserWindow `setIcon`应用后，只对Windows可见、未销毁main window恰好detach taskbar一次，250ms后仅由latest generation reattach一次；null、destroyed、hidden、macOS与Linux均不得产生taskbar churn，timer到期前window销毁或后续generation到达时旧timer不得reattach。

本 Slice 只允许修改现有Desktop icon owner、`main.ts`现有apply路径、author-equivalent tests与brief；不改变初始BrowserWindow icon、durable preference、hydration去重、IPC/preload/contracts、assets、Web picker、macOS dock/cache或Linux语义，不新增timer registry、window owner、持久化、文案或日志。source proof必须覆盖author normal/null/destroyed/hidden/destroy-before-delay、rapid `true,true,false`与旧timer零`false`、non-Windows零schedule、Desktop typecheck、format/lint/document/diff。macOS上的注入式source tests不能证明Windows Explorer真实重读taskbar icon；exact pushed SHA的Windows packaged fresh-profile可见窗口切换、退出重开仍是明确pending evidence，本 Slice不得虚报该平台journey。

R11-5 的 pre-commit source-candidate 证据为：现有Desktop icon owner focused `1 file / 12 tests`覆盖author五类生命周期、darwin/linux零taskbar churn与rapid latest-generation fence；Desktop typecheck、document contract `21/21`、changed-path lint `0 warnings / 0 errors`、format与diff check通过。该证据只证明注入式调度与平台分支，不证明Explorer实际刷新；本轮按准入不做package/install/Windows live/README，因此Windows packaged journey继续pending且只主张source-only candidate。

W4 完成后，维护者若明确授权 C1，必须从当时 latest `main` 开始，只闭合：

1. child 继承 canonical Root effective instructions、cwd 与适用 project instructions；第一 falsifier 是 Root 不重复规则时 child 仍遵守作用域内 `AGENTS.md`；
2. targeted child control：stop A 不影响 sibling B 或 Root；parent stop-all、stale/terminal control、writer stop 与 crash/reopen各有准确语义；Pi 没有真实 message/steer 时 UI 不显示；
3. 同一 Root delegation tree 内 Root 或一个 foreground child 写；跨 Thread/外部编辑复用现有 `WorkspaceFileSystem.expectedVersion`/atomic conflict truth，不能静默覆盖，不建全局 Writer DB；
4. exact model 补齐“explicit → role default → inherit”，不可用准确失败；child ceiling 在 bind 后按 Root ∩ role ∩ per-call 收口；
5. `completed / failed / cancelled / timed_out / crashed / interrupted` 从 Provider event 到 WorkLog、UI、SQLite、reopen一致，并同步闭合简中/英文与ARIA。

C1 明确不包含 Goal/Todo、economics平台、search/LSP/RepoMap、Memory/Knowledge、Workflow VM/graph、Team/Fleet/Mission、模型Router、三平台发行。后续顺序是：C2 request economics + Root-only/child paired outcome；C3 mature Root task loop；C4 search/context quality；C5同一frozen SHA三平台发行。完整进入/退出与stop-loss见 [`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)。

Pi成熟能力继续按 [`research/pi-native-product-integration-review.md`](research/pi-native-product-integration-review.md) 做preservation输入：C1不能复制Pi prompt builder、tool registry、Session tree、Package lifecycle、usage/cache、credential/model catalog，也不能用旧分支实现覆盖latest main owner。gotgenes exact source重新进入仍遵循 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)；source retained、shipped bytes/exports与runtime activation必须分别证明。

STATE：**W2 complete at `0eec65ac…`；P1 Pi stable `v0.84.2` refresh complete at product `d88edd3db…`；W3 Sidebar gesture continuity complete at `a5bae33ae…`；W4 First-run three-step readiness complete at `bde90d56…`；R10 complete at `c59d5442…`；S1 Synara v0.7.2 source alignment active with R11-5 Windows runtime taskbar icon refresh as the sole current code Slice；C1 deferred and not admitted；first-public mature Agent incomplete；V1 release blocked。**
