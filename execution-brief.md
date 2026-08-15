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

## 5. 施工顺序

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

## 9. 交付诚实性

“今天完成”必须按证据区分：

- **今天可完成的强目标**：Stage 0 权威冻结、Stage 1 单次 source transplant、依赖安装与相关 source gates，并在 macOS 上形成可启动的开发 candidate；若 Pi package 双实例没有 API/打包阻塞，可继续完成 Stage 2 首个 vertical。
- **今天不能提前宣称的 production 结论**：完整中英产品面、MiMo/DeepSeek 全 journey、真实 Windows/Linux 安装与 updater、macOS notarization、Windows signing、发行凭据、SBOM/legal 以及 fresh completion audit。它们只能由相应资源和同一 frozen SHA 的实证完成。
- 缺少证书、真实 runner 或 Provider 资源时，claim 标记 `blocked`，不得用 macOS 本地模拟、未签名包或 authored test 改写为 `verified`。

产品差异本身不大；时间主要花在安全删除旧 fork、恢复 source 物理拓扑和三平台发行证据。最快路线是减少代码和验证分叉，不是减少必须真实发生的发行证明。

## 10. 当前唯一下一动作

维护者于 2026-08-15 已完成原 Model services + Composer 的 completion review、必要补缝与合并，并明确选择下一轮做 **Pi-native mature capability preservation and reachability**。下一会话必须从最新 merged `main` 重新读取 exact runtime、Host seam 与 sole owners；研究 SHA 只提供反例入口，不能成为实现基线或封闭需求清单。完整边界见 [`research/pi-native-product-integration-review.md`](research/pi-native-product-integration-review.md)，未来 Pi/生态来源的重新进入遵循 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)。

用户可观察 Outcome：OmniMind Agent 不削弱锁定 Pi 已成熟的 Session、system prompt、动态工具、Extension、retry/compaction、usage/cost、fork/tree 与 package/resource 机制；真正影响用户工作、可恢复性或费用判断的 runtime truth 在现有 Product Thread、Composer、Timeline、Usage 与 Library owner 中可发现、可操作、可恢复。没有产品损失的能力只证明并保留，不因“Pi 有这个 API/TUI”复制一套 Desktop 控制台。

本轮沿 Pi 真实生命周期做差额审查，而不是机械执行功能清单：

1. Project membership 本身表示 trusted；将既有 Project/Thread/cwd 事实准确传给 Pi Session，不新增 trust store、permission broker、弹窗或独立设置；
2. 先证明 Pi system prompt rebuild 与动态 Extension tools 没被 Host 削弱，再按现有 Session owner投影 bounded `current / all / source` truth；activation、permission 与已接纳的 in-flight operation保持正交，active-set变化只影响下一 turn；
3. 无 Product mapping 的 Extension `newSession / fork / navigateTree / switchSession` 不得返回 no-op success；能保持 canonical Product Thread/Session provenance才接窄桥，否则明确 unavailable；
4. 将 Pi live `cacheWrite`、`cost` 与 reported/runtime-derived/estimated/unknown provenance 接入现有 usage/receipt owner；不建 Pi stats page、archive parser、cache service或第二 usage store；
5. 保留 native retry与auto/manual compaction，只补准确的中英文状态、取消/结算和必要可见 truth；不建设第二 retry/context平台；
6. 对 fork/tree/export、follow-up/Queue、Package/ResourceLoader与Extension UI逐项跑能区分“自然保留”和“真实能力丢失”的反例；只有真实损失成立才补 existing owner内的最窄 mapping，没有损失就记录证据并停止。

进入门：最新 `main`、pinned Pi revision、product-owned patch与生成物身份一致；完整读取 Execution/Product State/Workbench owner、Pi-native research 与 intake；冻结 passive read、Extension execution、Project/private-home、secret、Session provenance和 exact model/tool identity边界。不得从旧 Agent Core分支、旧 worktree、聊天摘要或历史 package榜恢复实现假设。

停止门：任何方案开始复制 Pi prompt builder、tool registry、Session tree、Package lifecycle、usage/cache、credential/model catalog，或新增 Router、模型池、child role default、Agent Core调度、第二 trust/permission/state owner时立即停止并回到现有owner。成熟机制可以被纳入；纳入的默认形式是 preservation、薄只读投影或有 provenance 的语义映射，不是 raw TUI parity。

完成证据按实际变更分层：focused source/contract falsifier之后，涉及 Provider/Model/Thinking、tool、usage、compaction、abort或恢复时用授权的 MiMo/DeepSeek资源做最小脱敏live journey；Desktop observable只从exact pushed SHA重建并使用任务专用 `userData`、home与Provider private home验证受影响路径。Apple signing/notary、Windows Trusted Signing与Windows/Linux原生安装旅程由工程团队统一承担，不属于本轮完成门，也不得写成已完成。

`codex/agent-core-ui-spec` 的 Full-access、bounded child与Workflow工作保持独立分支/owner；本轮不吸收、重做或静默合并它，也不让它阻塞Pi-native能力审查。Agent Core后续只消费本轮已有的exact provider/model/config/auth、Session/tool/usage事实，不复制这些authority。
