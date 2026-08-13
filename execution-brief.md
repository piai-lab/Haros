# OmniMind V1 execution brief

## 1. 目标

以 Synara 当前成熟产品 substrate 为唯一产品基座，交付 OmniMind V1：保留多 Provider、Project/Thread/Space/Studio、Workbench、Settings 与三平台桌面能力；新增 bundled、product-owned `omnimind` Provider，并保留 Synara 原有 stock `pi` Provider。

OmniMind Agent 是 Pi-derived 独立 runtime，随 App 开箱发行；它可以与 stock Pi 共享窄的技术基础，但普通用户只感知 OmniMind，不需要理解 Synara/Pi lineage。V1 不创建第二套产品对象或控制面。Remote/SSH 延后到 V2。

## 2. 不变量

1. 一个 Product Orchestration、Provider Registry、Project/Thread/Space command/event/projection authority 和 Provider binding path；
2. `Agent | Chat` 直接映射到 inherited Project/Thread/Space/Home/Studio；Groups 复用 Space identity/lifecycle，并由 Thread metadata 保存会话多分组事实；
3. 正常 UI 只呈现 OmniMind；`omnimind` 与 `pi` 是同一 Registry 中两个真实 identity，stock Pi 只在用户主动选择 Provider 或查看详情时显示；
4. OmniMind Agent 使用 `.omnimind` global/project-local state；stock Pi 仅在被显式选择时使用自己的 `.pi`，二者不迁移、同步或共享；
5. 恢复 Synara PluginLibrary/Skills/provider discovery；Engine capability composition 以 [`architecture/execution.md`](architecture/execution.md#扩展与生态) 为唯一语义 owner；只有 OmniMind Agent 原生 API 已提供时补 provider-scoped lifecycle，不追求 stock Pi/其他 Provider 功能齐平；
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

| 顺序 | 阶段                              | 默认复用                                                                                                  | 只做的差异                                                                                                                                                                                                                                                                                                            | 明确不做                                                                                                                                                            | 完成证据                                                                                                                                                                                       |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Authority reset                   | 当前 sole owners 与最小结构性文档检查                                                                     | 标记旧 decision 为 superseded；修 source re-entry；删除旧 semantic keyword oracle；冻结品牌、`.omnimind/.pi`、auth、双语与 updater 边界                                                                                                                                                                               | 为通过旧测试恢复 ProductControlPlane、Package LKG、permission broker 或 PluginLibrary 占位方案                                                                      | 新 owner/route/contract 通过；fresh document audit 无旧架构执行权                                                                                                                              |
| 1    | Exact-source responsibility reset | Synara `02c8a6c…` 的完整 production/build/release 物理拓扑，以及已批准的 `02c8a6c…712d88f` source intake  | 一次性恢复 substrate，再按责任吸收 approved update；保留 OmniMind 权威/品牌/法定资产；删除重复控制面；建立 first-public profile/storage/protocol/update identity，移除 donor migration entry                                                                                                                          | 保留 path translation、读取/迁移/删除 donor 或旧预发布状态、引入第二 approval/control plane、导入 donor release/brand identity                                      | source/tree disposition；install/typecheck/unit/browser/build；fresh/reopen/restart；旧 bytes untouched                                                                                        |
| 2    | Bundled OmniMind Agent vertical   | source Registry/Orchestration/PiAdapter/PluginLibrary + Pi stable `v0.84.1`                               | 一个参数化 Pi-family adapter；stock Pi 使用原模块；OmniMind Agent 从同一 pinned source payload 生成第二物理模块实例，只改产品拥有的 package metadata/configDir；Agent/Chat/Groups 映射；去 silent fallback                                                                                                            | fork 整份 Pi、第二 Registry/Product state/native-host RPC、共享 `.pi`/Session/package state、动态 Provider 平台                                                     | runtime 零安装/auth readiness；MiMo/DeepSeek Chat/continue/folder/stream/tool/abort/resume；`.omnimind/.pi` 隔离；Pi ecosystem artifact                                                        |
| 3    | Product surface and quality       | source Workbench、Settings、File/Viewer/Diff/Terminal/Git/PR、stream/scroll、a11y/perf、Provider adapters | OmniMind-only 正常 UI；一套轻量中英 message catalog；恢复 PluginLibrary/Skills；只给 OmniMind Agent 做原生 lifecycle；修真实 adapter/quality regression；恢复侧栏顶部 `Agent` 左/`Chat` 右同时可见、一次激活的一级入口并保留当前 route/restore/prewarm；从 sole owner 读取 public-surface denylist 做窄泄漏 falsifier | Remote、new FS/Git client、settings taxonomy rewrite、shared Package state、generic plugin platform、假齐平、旧 retained-panel/tabpanel 架构、generic identity gate | Agent/Chat/Send to Agent；双入口在最小侧栏宽度、中英文、键盘/screen reader 下真实切换；普通旅程无 donor 术语或禁用 URL；双语/IME/a11y/profile；File/Git/PTY；inherited Provider focused smokes |
| 4    | Three-platform release            | source Electron build/package/updater/platform adapters                                                   | OmniMind artifact、bundled runtime、legal/SBOM、signing/notarization、update failure/retry/reinstall recovery                                                                                                                                                                                                         | second updater、Pi self-update、自动应用 rollback、Remote                                                                                                           | 同一 SHA 的 macOS/Windows/Linux install/open/update/retry/reinstall；core journeys；fresh completion audit                                                                                     |

Stage 1 是一次受控替换，不是长期 diff 项目：先冻结精确来源与保留列表，再把 source 对应物理树作为一个整体落入当前仓库。默认保留 `.git`、`AGENTS.md`、`README.md`、`architecture/`、`research/`、`execution-brief.md`、active Campaign、`LICENSES/`、OmniMind brand assets，以及 `scripts/document-contract.mjs` / `test/document-contract.test.mjs` 这一条最小文档检查；默认替换 production apps/packages、build/release scripts、root toolchain configs 与 source CI。旧 `quality.test`、source-closure/identity governance 和 product-truth meter/fixtures 不随 transplant 保留。source 构建需要的品牌文件在同一阶段映射到 OmniMind 资产，不能为了先绿 build 暂时提交 donor 图标。source 中读取 Synara profile/storage 的迁移入口必须删除或从 composition 彻底断开；bundle ID、userData/home、protocol、storage key、updater channel 和 artifact identity 使用新的 first-public OmniMind namespace。当前 OmniMind 自有 workspace package 已一次性硬切到 `@omnimind/*`，不保留 `@synara/*` alias；真正承载上游或 Provider compatibility 的 API/env 名仍按其真实语义保留。任何其他 current-only production 文件都必须有一个已经写入 owner 的窄产品差异，否则删除。

Stage 2 不 fork Pi 源码树。构建过程从 exact pinned Pi source payload 生成第二个可复现的物理模块实例，只改变产品拥有的 package identity/configDir，使 Pi 内部 module-level project state 常量分别落到 `.pi` 和 `.omnimind`；原始 source payload digest 与生成差异必须可复算。若该双实例在三平台不能被相同 lockfile、source digest 与 packaged artifact 证明，立即停止并改为窄 upstream instance-configuration patch；不得退回 Native Host 或第二控制面。

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

维护者于 2026-08-12 明确启动 Stage 3 内的 **Model services + Composer Engine/Model/Engine-native options** 纵向工作。当前唯一实施入口是 [`research/model-services-composer-new-session-execution-guide.md`](research/model-services-composer-new-session-execution-guide.md)，产品依据与 source observation 见 [`research/model-services-composer-product-design.md`](research/model-services-composer-product-design.md)；两者只消费本 brief 与 architecture sole owners，不形成第二套状态或全局施工顺序。

本轮按指南的 E0–E8 依赖图推进：先在 E0 钉住 authority、Queue binding、next-turn selection、failure rollback、Pi intent gate 与无跨 Engine default fallback；每个 slice 只有在自己的 DAG predecessor 已 exit 时才可进入，不能把编号误作无条件串行，也不得把 E0–E8 当作并行清单。

E1 的锁定 Pi `v0.84.1` public-API blocker 已由维护者单独授权的窄 source adoption 解除：stock `@earendil-works/pi-coding-agent` 保持原样，既有 product-owned `@omnimind/pi-coding-agent` 只增加 caller-owned `models.json` content reader、官方 parser 接受后的 provider-id provenance，以及 reader 模式下显式 `modelsStorePath` 继续使用 Pi `FileModelsStore`。Host 的唯一 reader 负责 physical containment、no-follow、4 MiB hard bound、64 KiB cancellation、same-handle identity、fatal UTF-8 与 observed-present 后状态变化 fail-closed；Settings、discovery、Session create/refresh 共用该 source，Pi 仍是 comments/JSON/schema/composition/error 与 catalog-store authority。唯一 generator 验证 exact revision 与 committed patch digest，patch conflict 会在构建前失败，普通产品 build 继续离线消费固定 tgz。

E1 已在 exact product `9956e16c0…` / evidence `427ee020d…` 完成 fresh independent completion audit 并 **Exit**：judge 独立复现 initial missing、同 inode refresh、删除、atomic replacement 与真实 `ModelRuntime.refresh()`，确认后两者固定 fail closed；Server 3 files/54 tests、typecheck、document contract 17/17、243-component legal/SBOM、patch/tgz/lock digest、stock/product Pi authority与 installed ASAR provenance均复核通过，无 P0/P1。producer 的 live Provider、installed-App journey 与 DMG 仍只按各自 candidate/proof 边界引用，不把 E1 Exit扩张为 F-18或完整V1 verified。

E2 已在 exact product `4b3c038a8…` / evidence `8c5193d60…` 完成 fresh independent completion audit 并 **Exit**：typed begin-login contract只接受 `api_key`，Server在任何 Pi mutation前用同一 task-local ModelRuntime证明目标是 builtin 且真实提供 `apiKey.login`，唯一 `runtime.login` 调用固定为 `api_key`；OAuth-only、models.json/custom与unknown id均 fail closed。judge 独立复核4 files/87 tests与Contracts/Server/Web typecheck，无P0/P1；producer的DeepSeek、packaged App与DMG证据仍保持candidate边界。

E5 OAuth typed interaction、取消/timeout/logout、proxy correction 与 request-scoped callback presentation 已形成 pushed candidate，fresh independent E5 completion audit仍是其 Exit 门。随后维护者对 Model services IA 的 root review 已在 exact product `043f7c284…` 收口：页面只管理 OmniMind service connection/auth/catalog/model/status-recovery；Git writing退出该页且底层字段不迁移，独立 Engine custom slug则薄迁到既有Agent engines detail并保留新增/删除/reset能力；fresh profile概览不再平铺全部Pi built-in，`添加模型服务`进入可键盘搜索的runtime service列表，detail使用单独页面并可返回保留查询，API地址入口弱一级展示且E6前disabled；旧`setting-installed-clis` target字节继续指向更名后的`引擎详情`。OmniMind/Pi/Droid历史custom slug字段继续兼容保存但不再暴露无效editor或驱动自动展开；OmniMind/Pi从静态默认表移除，Project/Terminal/Kanban/direct resolver无 exact model时null/fail closed，Server settings拒绝provider-only跨到runtime-catalog Engine以避免hybrid binding。sole owner machine block与document contract固定这组边界，未来Pi intake还必须重证`provider_default`首项被上游明确标为default/recommended，否则回到显式选择。

当前唯一下一动作是：冻结product `043f7c284…` 与本brief/Campaign evidence SHA，请求fresh independent审计，审计只覆盖本次owner/static-default/Settings职责迁移与packaged evidence delta；不得借此重开E3/E4或扩成Settings taxonomy。exact-SHA source gates已通过Web typecheck、83个logic/unit与23个Chromium browser tests；arm64 DMG为244,763,767 bytes、SHA-256 `32a8f0d9d026d95a3c6ca7b29927db3f66ff0a73b26cde0e3807206928b98f80`，installed ASAR为241,360,854 bytes、SHA-256 `6db54485c5e625c6d19c7764b77473c3032ef5448f0d7f13ffa0ea9fe440dd3c`且embedded commit精确为`043f7c2841fbda51bf7b016eea58341784913ea7`。fresh isolated profile已从Main/Helper/Renderer/bundled Server证明task-specific HOME/OMNIMIND_HOME/Provider homes/userData，真实journey覆盖overview→添加→搜索DeepSeek→键盘detail→返回保留查询、旧stable target搜索跳转、Codex custom slug保存/重开/删除与Pi无假editor。测试期间发现/误启动的默认profile实例均在任何设置、凭据或其他产品mutation前终止且该轮证据作废；只观察进程/窗口状态，未读取、迁移或清理默认profile数据。纯Extension provider尚未进入Settings只读projection，必须先裁决执行用户Extension code的安全边界后复用Pi owner，明确OPEN；ChatView仍以non-null Thread presentation contract为local no-model draft构造synthetic空model，durable/direct consumer fallback已闭合但该presentation debt保持OPEN，不新增逐消费者guard。E6 custom-provider persistent mutation仍未获授权且hard-gated；不新增models.json writer、Host Registry/store/fetcher。E5本体仍等待自己的fresh completion audit，不能由本delta自动Exit；当前App仍为ad-hoc且strict codesign失败，F-18不变。

进入门是：`Model services / 模型服务`、普通展示名 `OmniMind`、Pi ModelRuntime authority、`.omnimind/.pi` 隔离和 next-turn/stop-first 语义已在 Workbench、Product State 与 Execution sole owner 中唯一；当前 snapshot 与 Pi stable `v0.84.1` 仍匹配。停止门是任何方案需要第二 Provider/Model Registry、静态供应商能力镜像、通用推理策略、跨 Engine Session continuation、新 switch RPC、未举证的持久化，或在 Pi 没有公开持久 mutation API且没有维护者独立授权时写 custom-provider 配置。

2026-08-11 的 Usage quality 纵向切片不再是当前 next action；其既有 candidate/blocked 证据与架构边界保持原样，后续恢复必须再次成为本节唯一答案，不能与本轮并行维护两个施工入口。

Stage 4/F-18 的已冻结本地证据继续有效；Apple signing/notary、Windows Trusted Signing、Windows/Linux runner journey 与独立 fresh-context completion audit仍按维护者此前决定暂停，不因本轮 Model services/Composer 施工被伪装为已闭合。

后续显式恢复跨平台验收时，优先直接运行现有 `.github/workflows/release.yml` 的手动 build-only 模式（`publish_release=false`）：GitHub-hosted `windows-2022` 与 `ubuntu-24.04` lane 构建 artifact、执行 packaged startup smoke 并只保存 Actions artifact，不创建 GitHub Release、不上传 updater feed。Windows 未配置 Trusted Signing 时只能形成未签名构建/启动证据，不能闭合签名或 production release claim。不得以本地未签名 DMG、Docker arm64、authored test 或本 Runner 自审改写为三平台 candidate/verified。

任何继续扩充 Product Truth semantic meter、平行 Product Control Plane、跨 Provider Package lifecycle、Remote 或 settings taxonomy 重写的工作都应停止。
