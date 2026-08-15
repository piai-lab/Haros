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

维护者于 2026-08-12 明确暂停此前的 Usage Stage 3 切片；它不再构成当前准入，也不得阻塞 Agent Core/自动化体验的权威收口。当前唯一准入是一个可独立闭合的 **Full-access end-to-end truth repair**：让 Composer 中的任务运行模式真实贯穿 Engine adapter、Agent Gateway、Browser、Device 与 approval UI。

用户可观察 Outcome：当任务显示 `完全访问 / Full access` 时，普通文件、命令、测试、依赖、网络、Browser、Device 和任务内下载不再请求二次批准；不支持 approval 的 Engine 不显示虚假的 `需要时询问`；需要登录、2FA、系统原生授权或真正扩张到用户未表达的不可逆外部结果时，才准确要求人介入。

实施必须从现有 owner 原位修复，不新增 permission broker、Host approval ledger 或第二 runtime-mode store：

1. 以 `packages/contracts/src/orchestration.ts` 的 `RuntimeMode` 和 Product Thread 持久字段为唯一产品事实；沿当前 Provider dispatch 与 Agent Gateway caller context 传递，不复制 mode；
2. 复验 Codex、Claude、OpenCode 的现有 mapping，保持其 native semantics；Pi-family 当前没有 approval request path 时，只提供能真实执行的 mode，不允许 UI 选择后运行时一律拒绝；
3. 删除 Device Gateway “无 receipt 永远拒绝”的生产死路，使 mutation 继承 caller Thread mode；`full-access` 直接执行，其他 mode 只有在 exact bridge/reviewer 存在时才可用；
4. 将 Browser download 的无条件 `BrowserDownloadApprovalRequired` 取消路径改为 mode-aware：`full-access` 落到当前 workspace 或 OmniMind managed artifact/download root 并产生真实 file/artifact result；OAuth/2FA 与系统选择器保持 human-presence flow；
5. 修正 approval UI 的文案与持久语义：当前 `acceptForSession` 会把 Thread 切到 `full-access` 时显示“此任务始终允许 / Always allow for this task”，并把全部新增/修改文案接入唯一 zh-CN/en catalog；
6. 更新 Harness policy，使模型看到的 Browser/Device 行为与运行时一致，不再要求用户去 Device pane 手工完成本可自动执行的操作。

进入门：当前 HEAD 复现并冻结三个 falsifier——`full-access` Device mutation 被 `DeviceApprovalRequired` 拒绝、Browser 下载被无条件取消、Pi-family UI 可选择底层无法响应的 approval mode；同时证明 Codex/Claude/OpenCode 的 full-access mapping 现状没有回归。

停止门：任何方案需要第二 permission/state owner、用 Provider 名称猜权限、把 `full-access` 降成工作区沙箱、让 `approval-required` 在无 bridge 时继续可选，或用无条件 allow 绕过 Thread mode/active-turn/target containment。登录、2FA、OS 授权与用户未表达的发布/付费/远端删除不属于本切片的自动批准范围。

完成证据：focused contract/adapter/UI tests；Device normal/failure/abort、Browser download/cancel/OAuth、approval copy/persistence 与 child privilege inheritance；Codex/Claude/OpenCode/Pi-family capability matrix；zh-CN/en、keyboard/focus；从 exact pushed SHA 打包后以任务专用 `userData`、home 与 Provider private home 运行一次 `full-access` Browser + Device 真实 journey，并证明无普通 approval、无默认 profile I/O、无 late effect。只通过 source test 只能称 source candidate。

该 slice 完成后停止。Settlement、usage/cache、Skill identity、Gateway MCP conflict、Delegate、Workflow、自动 Project Context（Memory/Knowledge）均按 [`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md) 的独立 Slice 重新取得本文准入；不得在本次 permission repair 中顺带实现。此前 Usage 设计和已冻结证据保留为暂停研究，不自动恢复 next action。

Stage 4/F-18 的已冻结本地证据继续有效；Apple signing/notary、Windows Trusted Signing、Windows/Linux runner journey 与独立 fresh-context completion audit继续暂停。任何继续扩充 Product Truth semantic meter、平行 Product Control Plane、跨 Provider Package lifecycle、Remote 或 settings taxonomy 重写的工作都应停止。
