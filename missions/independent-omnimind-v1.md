# Independent OmniMind V1 Campaign

Status: active

Owner: maintainer

Canonical path: `missions/independent-omnimind-v1.md`

Updated: 2026-08-10

## 1. Objective

交付 production-grade OmniMind V1：以 exact Synara product substrate 为唯一产品基座，保留其多 Provider 与完整桌面产品；内置独立、Pi-derived 的 **OmniMind Agent** 作为默认、最深验收路径，并同时保留 stock Pi Provider。普通产品旅程只呈现 OmniMind；Synara/Pi lineage 仅在 About、Licenses、诊断和用户主动展开的 Provider detail 中出现。

V1 保留 `Agent | Chat`，但 Agent/Chat/Groups 直接复用 Projects/Threads/Spaces/Home/Studio。OmniMind Agent 与 stock Pi 分别拥有原生 package lifecycle 和 state；前者开箱内置并兼容 Pi 生态，后者保持独立 Provider。V1 不交付 Remote/SSH、第二 Product Control Plane/Registry、跨 Provider Package lifecycle、generic plugin runtime 或自动应用 rollback。

完成必须满足：required claims 在同一 frozen SHA verified、blocked = 0、相关 final gate 通过、fresh-context completion audit 无 material finding。

## 2. Authority

本文件只拥有 Claim 状态和 evidence pointer。产品、UI、topology、施工顺序与来源结论分别由 README、architecture、execution brief 和 research owners 持有。

状态只允许 `open -> candidate -> verified`，另有 `blocked`。producer 只能提交 candidate；final SHA、source baseline 或 Pi version 变化后，受影响 evidence 重新建立。

## 3. Acceptance matrix

| ID   | Claim                                                                                                                                                                                                                             | Proof type                                   | Status    | Evidence                                                                                                                                                               | SHA                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| F-01 | sole owners、旧 decision、source re-entry 与 executable document contract 对 single substrate、OmniMind-only 普通 UI、Agent/Chat、Provider-native ecosystem、Remote V2 无矛盾                                                     | structural contract + fresh document audit   | candidate | document contract 13/13；Engine native + additive ecosystem、Agent/Chat 一级模式与 Agent 域 Kanban 二级控制台均进入 sole owner；fresh-context completion audit pending | `967610397bc84bf45e2de32dc064770ac6d61b0d` |
| F-02 | Repository 只有一个 Product Orchestration、Provider Registry 与 Project/Thread/Space product-truth authority；平行 ProductControlPlane/Run/outbox/adapter 被删除                                                                  | source/tree/responsibility audit             | candidate | inherited Registry 同时承载 `omnimind`/`pi`；`apps/service`/`apps/native-host` 与旧 product-truth/control-plane 仍不存在；真实 Electron 进程只有 Desktop→Server | `bcede0cb632dee22e999d1f5f041dfa210fe2734` |
| F-03 | Synara exact baseline `02c8a6c…` 的 source、lineage、rights、selected paths 与 OmniMind differences 可追踪                                                                                                                        | source/legal audit                           | candidate | sole README adoption record 锁定 Synara `02c8a6c…`；Pi runtime adoption 锁定 `53fa77c…`、`packages/coding-agent`、npm integrity 与归档 SHA-256 `16b3ae81…ba934a9`；shared runtime bytes 对 exact 0.84.1 artifact 不变；Pi-family 0.84.1 exact manifest digest、root MIT revision/text digest 与 private archive 内 LICENSE 进入 fail-closed target-derived legal closure；document contract 13/13 | `1e3d465940c70dab297ddce5e56289de0d3f39e1` |
| F-04 | source alignment 只使用一个 exact Synara baseline，不维护 `stable + HEAD patches` 双轨                                                                                                                                            | source/tree reproducibility audit            | candidate | Synara `02c8a6c…` 单次物理 transplant；frozen install/typecheck/unit/browser/build/release smoke 绿                                                                    | `a54ef5ba49ac496604cd05eeaad0646f37faca8e` |
| F-05 | `Agent｜Chat` 按 `architecture/workbench.md` 成为侧栏顶部同时可见、Agent 左/Chat 右、一次激活的唯一一级工作模式；Kanban 保持 Agent 域二级控制台；Agent=folder-backed Project Thread，Chat=Home/Studio managed Thread，Groups=Spaces；无第二 durable objects/panel/navigation authority | source audit + minimum-width/dual-locale/a11y create/reopen/switch journeys | candidate | 当前 route/restore/prewarm 上的直接双按钮取代 dropdown；browser 4/4 证明 Agent 左/Chat 右、`aria-current=page`、一次鼠标/键盘激活、13rem 中英文无溢出、无 Menu/Popover/伪 tabpanel，隐藏 Chat 时仅静态 Agent。隔离 macOS Electron 完成 Agent→Chat→Agent、隐藏/恢复、中文/英文及关闭重开，任务 profile 未生成 `.pi`；Workbench IA contract 13/13 锁定 Kanban 仍属 Agent 域二级控制台 | `57b4aec02efcb4ce0b581764ef6a57c7feecf6e0` |
| F-06 | inherited Provider Registry/Session binding 唯一路由到 native adapters；切换 stop-first、失败恢复 exact binding                                                                                                                   | adapter contract + journey matrix            | candidate | Registry/Session contract tests 绿；默认、folder Project 与重启 projection 均保持 `omnimind/deepseek/deepseek-chat`，失败不改绑 Codex                        | `bcede0cb632dee22e999d1f5f041dfa210fe2734` |
| F-07 | bounded `omnimind` 与 stock `pi` 均进入 inherited Registry；OmniMind Agent 以 Pi `v0.84.1` 为 lineage，使用 `.omnimind` global/project-local state；stock Pi 显式选择时才使用 `.pi`，identity/version/config/session/state 不混用 | source/API + real-provider journeys          | candidate | bundled 双包路径/构造器/configDir 独立，dist 保留双 literal import；既有隔离 Electron 创建/Chat/重开与 global/project/session/package proof 保留为输入；从 exact pushed `96a37dd…` 构建并安装的 App 中，根模型选择器未触发 stock Pi discovery，显式展开 Pi 后显示本机 `mimo` 的 `MiMo V2.5 Pro`/`MiMo V2.5` 并可选择；受控 discovery 前后 `.pi` auth/models 的 SHA-256、mtime、atime、size 均不变 | `96a37dd31a5580eceb1ceebe91074d553c530e31` |
| F-08 | command admission、native acceptance、interrupt、settlement 与 unknown 准确；OmniMind Agent 与 stock Pi 之间无 cursor/state/replay/fallback 混用                                                                                  | recovery/failure matrix                      | candidate | 真实 Electron：无凭据在 `sendTurn` 前准确拒绝且无 fallback；abort 即时投影 `interrupted`，timeout 产生准确 tool error 后可 resume；同 profile 重启恢复 V4 Pro/High 并 continuation；quarantine recovery focused 118/118，stock `.pi` 未变 | `3556f51188c89f2db8fa59e533298ff397b62667` |
| F-09 | stream、reasoning、tool、structured request、usage/error 进入 existing Timeline 且保留 Provider provenance                                                                                                                        | event replay + UI/profile                    | candidate | DeepSeek V4 Pro/High 真实 Electron turn：25 reasoning + 9 assistant deltas、reasoning item 与 usage/settlement 入 journal，Reasoning trace 在 Workbench 可展开；folder Agent 5/5 command tools 与 timeout error 入既有 Timeline | `3556f51188c89f2db8fa59e533298ff397b62667` |
| F-10 | Synara Workbench、Settings、File/Viewer/Diff/Terminal/Git、stream/scroll、a11y/perf 在 surgery 后无 material regression；OmniMind-owned 一级入口和 first-party public exits 不因 source transplant 回退 | e2e/visual/a11y/profile + bounded product-surface falsifier | candidate | `9ce368f…` 的 File/Viewer/Diff/Terminal/Git/Artifact、Send to Agent、save-conflict、IME/a11y/stream/perf 与 `57b4aec…` 的 direct-entry/public-surface gate 保留为输入；exact pushed `f4f7acc…` 的安装 App 以任务专用 profile 在当前 Agent/Thread 保留 route、Timeline 与 composer，并把 Pi 原生短命 web surface 呈现在右侧 Browser；工具行显示等待筛选并可在收起面板后重新打开，系统 Chrome 窗口数未增加；正常关闭、重开后 Agent｜Chat、Kanban、Thread、Desktop→bundled Server 恢复且无 service/native-host，短期页面未被恢复 | `f4f7acc408377e417fd508e4f828c1167418b86d` |
| F-11 | representative unchanged Pi Package、Extension、Skill、Prompt、Tool、MCP 在 OmniMind Agent 的 Pi-compatible runtime 中运行；不宣称 TUI-only surface 无损兼容                                                                      | real ecosystem journeys + source audit       | candidate | 隔离 macOS Electron 的 folder-backed OmniMind Agent 以 DeepSeek 完成一类一个 unchanged journey：package `todo.ts`、extension `hello`、skill、prompt、built-in `read` tool 与 `omnimind_context` MCP 均由 Pi 0.84.1 原生 ResourceLoader/session 执行并完成 Timeline lifecycle；source probe 保留 project/package/builtin provenance，失败 warning 准确；frozen SHA 再验 full unit/browser/build，运行前后 global/project `.pi` 各只有原 sentinel 且 SHA-256、mtime、size 未变 | `9ce368fbdc6eba34dbe6a714be2d9290db2a8839` |
| F-12 | Synara PluginLibrary/Skills/provider discovery 恢复；用户选择 Engine 后按 `architecture/execution.md` 组合完整 native ecosystem、兼容的 OmniMind Library 与 Workbench，保留 provenance/identity、private home 与准确 unavailable；无 shared PackageActivation/current/LKG 或跨 Engine durable state | native + additive ecosystem UI/journeys + home/isolation/conflict fault tests | candidate | 既有隔离 Electron native/additive ecosystem 与 frozen gate evidence 保留为输入；`3777c4c…` 让 Codex usage 继续由 native app-server 返回；exact pushed `f4f7acc…` 的安装 App 显式展开 stock Pi 后真实发现 MiMo models，并由未修改的 `pi-web-access` 原生能力完成搜索与 curator lifecycle；OmniMind 只承接当前 Pi/Thread/Tool provenance 的 presentation intent，不改插件 bytes/配置或 private home，验证前后真实 `.pi` 整树 hash、文件数均一致；没有 shared activation/LKG、private-home migration、广域 localhost 拦截或 silent replacement | `f4f7acc408377e417fd508e4f828c1167418b86d` |
| F-14 | Chat managed workspace/artifact 与外部文件只读边界真实；Send to Agent 显式进入 folder-backed Project；文件/Git 不静默覆盖                                                                                                         | filesystem/Git/product journeys              | candidate | File/Viewer/save-conflict 与 Git 责任链保持 Synara exact source：真实 Electron 中 Project save 成功，外部变更触发冲突且保留 dirty buffer 与磁盘内容；Diff/Git、Terminal 与 Artifact 可达；`Send to Agent` 选择现有 Project 后创建 fresh folder-backed draft，只复制未发送 prompt/attachments/references，原 Chat draft 保留且无 message/Session/operation replay；frozen Chromium stable 276/276 与 full unit/build 绿 | `9ce368fbdc6eba34dbe6a714be2d9290db2a8839` |
| F-16 | approval/permission 只按 Provider/Host 实际请求与能力呈现；未实现能力不宣传，process isolation 不冒充 sandbox                                                                                                                     | source/UI + focused capability tests         | candidate | pending-interaction derivation 与 approval UI 保持 Synara exact source，只投影 Provider 实际 request/scope/result；真实 Electron permission 菜单只显示实际 `Ask for approval` / `Full access`，无请求不渲染，未实现 Pi approval 不造假；无凭据在发送前准确阻止且不 fallback；frozen full unit/browser/build 绿，source/tree 无 permission broker、跨 Provider policy state 或 sandbox 宣称 | `9ce368fbdc6eba34dbe6a714be2d9290db2a8839` |
| F-17 | 一套 OmniMind message catalog 覆盖正常用户可达产品面；中文/英文、IME、keyboard、screen reader、reduced motion、真实 long thread/burst/large output 达到可用质量；不把 source 零散文案冒充完整 i18n                                | catalog coverage + dual-locale/a11y/profile  | candidate | `1e3d465…` 的唯一 catalog、AST source falsifier、packaged 双启动与 Kanban/Settings 全面 evidence 仍为输入；`8e951f6…` 的更新失败摘要/ANSI diagnostics 分离 focused proof 保留；exact pushed `96a37dd…` 的安装 App 在中文 UI 中真实显示右下角 compact OpenCode 成功 toast，正文不倾倒命令输出；关闭重开后 `lang=zh-CN` 与 catalog-owned shell copy 保持准确。真实 update 成功，因此本轮没有伪造 packaged failure toast | `96a37dd31a5580eceb1ceebe91074d553c530e31` |
| F-18 | 同一 SHA 的 macOS/Windows/Linux artifacts 可安装、启动、更新、失败重试/重新安装恢复，legal/SBOM/signing 与 fresh audit 通过                                                                                                       | release matrix + completion audit            | blocked   | exact pushed `96a37dd…` 生成 macOS arm64 本地候选 `/Users/liuzaoqu/Downloads/OmniMind-0.1.0-alpha.0-arm64-local-candidate-96a37dd31.dmg`（244,457,058 bytes，SHA-256 `ad541a35d93da2178a724b5b13cf465e1c9934afa382a3e4384cbbfcf4cd37a7`）；DMG read-only mount 后安装到 `/Applications/OmniMind.app`，ASAR provenance 锁定 source SHA/lock digest，243 项 legal inventory 与实际组件闭合；两个任务 profile 完成启动及同 profile 关闭/重开，Desktop→Server、无 service/native-host/donor UI，且未触碰真实 OmniMind userData。该 artifact 仅 ad-hoc/local unsigned，未 notarize/staple，Gatekeeper 不接受；Apple signing/notary、Windows Trusted Signing、Windows/Linux 原生 runner journey 与独立 fresh-context completion audit 仍 blocked，并按维护者要求暂停；未公开 Release、未改 feed | `96a37dd31a5580eceb1ceebe91074d553c530e31` |
| F-19 | shipped inherited Provider 保持 discovery/health 和 source 已支持的 core journeys；ready/warning/error/auth/version/capability truth 准确；stock Pi session runtime 与 optional local CLI version 不混淆                          | provider smoke + source audit                | candidate | `9ce368f…` 的 inherited Provider smoke、`3777c4c…` 的 Codex native auth/usage 与 `507318f…` 的 Pi intent gate 保留为输入；exact pushed `f4f7acc…` 的安装 App 真实选择 Pi/MiMo 并完成首轮与 continuation native `web_search` journey；当前 Engine web surface 只在 OmniMind Browser 呈现，Chrome 窗口数前后不变；完成后 `state.sqlite` 与 Desktop/Server logs 无 `curatorUrl` 或短期 bearer marker，重启未恢复短期 URL，provider session 与真实 `.pi` 仍隔离 | `f4f7acc408377e417fd508e4f828c1167418b86d` |

F-13 与 F-15 保留为历史 ID，不复用。Remote/SSH 继续 V2。

## 4. Internal acceptance priority

- OmniMind Agent 接受最完整的 core、ecosystem、recovery、quality 与三平台验证；
- stock Pi 与其他 inherited Provider 按 source 已有能力和可用资源做 focused smoke；
- 无 binary/auth/evidence 时记录 unavailable/unknown，不阻塞 OmniMind Agent 主路线，也不宣称 supported；
- 该优先级不进入 runtime schema 或新的 UI tier。

## 5. Retired scope

- 平行 OpenCode/Product-control-plane checkpoint 只作 falsifier；不恢复其 architecture；
- Product Truth destructive rebuild、v2–v9 semantic meter、巨型 reports 与 race/kill Cartesian matrix 退出 acceptance formula；
- 自建 Package staged activation/current/LKG/generation 证据只作历史，不定义 V1；
- Remote/SSH、ExecutionTarget 与远端 daemon 延后到 V2；
- provider native state、credentials、user workspace、Git 与旧预发布 bytes 保持原地不读不碰。

## 6. Current route

唯一施工顺序由 [`execution-brief.md`](../execution-brief.md) 定义：

0. authority reset：移除旧架构执行权并冻结当前边界，不提前实现 production source reset；
1. exact Synara physical-source responsibility reset：一次性恢复 production/build/release 拓扑并删除重复控制面；
2. bundled OmniMind Agent vertical：参数化 Pi-family adapter、双物理模块实例、Agent/Chat 与 `.omnimind/.pi` 隔离；
3. product surface and quality：PluginLibrary、OmniMind brand、一套中英 message catalog、Workbench/a11y/perf 与 inherited Provider smokes；
4. three-platform release and completion audit。

## 7. Blockers

F-18 保留以下由维护者明确暂停的外部门：Apple signing/notary、Windows Trusted Signing、Windows/Linux 原生 install/open journey，以及独立 fresh-context completion audit。当前只记录，不施工、不追问；恢复时优先走既有 GitHub Actions build-only runner，且不得把 Actions artifact 上传误记为公开发行。

## 8. Done

Not done. 当前不存在可发布 V1 candidate。
