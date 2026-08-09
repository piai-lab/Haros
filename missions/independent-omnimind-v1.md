# Independent OmniMind V1 Campaign

Status: active

Owner: maintainer

Canonical path: `missions/independent-omnimind-v1.md`

Updated: 2026-08-09

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
| F-01 | sole owners、旧 decision、source re-entry 与 executable document contract 对 single substrate、OmniMind-only 普通 UI、Agent/Chat、Provider-native ecosystem、Remote V2 无矛盾                                                     | structural contract + fresh document audit   | candidate | document contract 11/11；Engine native + additive ecosystem 已进入 sole owner；fresh-context audit pending                                                            | `295e185c9f1255af0ba161efbc14dacfddeb7036` |
| F-02 | Repository 只有一个 Product Orchestration、Provider Registry 与 Project/Thread/Space product-truth authority；平行 ProductControlPlane/Run/outbox/adapter 被删除                                                                  | source/tree/responsibility audit             | candidate | inherited Registry 同时承载 `omnimind`/`pi`；`apps/service`/`apps/native-host` 与旧 product-truth/control-plane 仍不存在；真实 Electron 进程只有 Desktop→Server | `bcede0cb632dee22e999d1f5f041dfa210fe2734` |
| F-03 | Synara exact baseline `02c8a6c…` 的 source、lineage、rights、selected paths 与 OmniMind differences 可追踪                                                                                                                        | source/legal audit                           | candidate | sole README adoption record 锁定 Synara `02c8a6c…`；Pi runtime adoption 锁定 `53fa77c…`、`packages/coding-agent`、npm integrity 与归档 SHA-256 `16b3ae81…ba934a9`；shared runtime bytes 对 exact 0.84.1 artifact 不变，archive closure 差异、tar/root MIT 与复现/更新门已披露；document contract 12/12 | `177384284fe267a366b546a81f1b67537c7f7d0f` |
| F-04 | source alignment 只使用一个 exact Synara baseline，不维护 `stable + HEAD patches` 双轨                                                                                                                                            | source/tree reproducibility audit            | candidate | Synara `02c8a6c…` 单次物理 transplant；frozen install/typecheck/unit/browser/build/release smoke 绿                                                                    | `a54ef5ba49ac496604cd05eeaad0646f37faca8e` |
| F-05 | Agent=folder-backed Project Thread；Chat=Home/Studio managed Thread；Groups=Spaces；无第二 durable objects                                                                                                                        | source audit + create/reopen/switch journeys | candidate | 隔离 macOS Electron：创建 `workspace` Agent shell、切换 `New Chat` 无 project、关闭重开后 project 恢复；Desktop→Server 且无 service/native-host                        | `cf40dc607047cf01fa4629de86e2bb760d218a15` |
| F-06 | inherited Provider Registry/Session binding 唯一路由到 native adapters；切换 stop-first、失败恢复 exact binding                                                                                                                   | adapter contract + journey matrix            | candidate | Registry/Session contract tests 绿；默认、folder Project 与重启 projection 均保持 `omnimind/deepseek/deepseek-chat`，失败不改绑 Codex                        | `bcede0cb632dee22e999d1f5f041dfa210fe2734` |
| F-07 | bounded `omnimind` 与 stock `pi` 均进入 inherited Registry；OmniMind Agent 以 Pi `v0.84.1` 为 lineage，使用 `.omnimind` global/project-local state；stock Pi 显式选择时才使用 `.pi`，identity/version/config/session/state 不混用 | source/API + real-provider journeys          | candidate | bundled 双包路径/构造器/configDir 独立，dist 保留双 literal import；隔离 Electron 创建/Chat/重开与 global/project/session/package proof 绿；纵切与重启后两个 `.pi` sentinel hash 未变，任务 HOME 无 `.pi` | `3556f51188c89f2db8fa59e533298ff397b62667` |
| F-08 | command admission、native acceptance、interrupt、settlement 与 unknown 准确；OmniMind Agent 与 stock Pi 之间无 cursor/state/replay/fallback 混用                                                                                  | recovery/failure matrix                      | candidate | 真实 Electron：无凭据在 `sendTurn` 前准确拒绝且无 fallback；abort 即时投影 `interrupted`，timeout 产生准确 tool error 后可 resume；同 profile 重启恢复 V4 Pro/High 并 continuation；quarantine recovery focused 118/118，stock `.pi` 未变 | `3556f51188c89f2db8fa59e533298ff397b62667` |
| F-09 | stream、reasoning、tool、structured request、usage/error 进入 existing Timeline 且保留 Provider provenance                                                                                                                        | event replay + UI/profile                    | candidate | DeepSeek V4 Pro/High 真实 Electron turn：25 reasoning + 9 assistant deltas、reasoning item 与 usage/settlement 入 journal，Reasoning trace 在 Workbench 可展开；folder Agent 5/5 command tools 与 timeout error 入既有 Timeline | `3556f51188c89f2db8fa59e533298ff397b62667` |
| F-10 | Synara Workbench、Settings、File/Viewer/Diff/Terminal/Git、stream/scroll、a11y/perf 在 surgery 后无 material regression                                                                                                           | e2e/visual/a11y/profile                      | open      | exact-source alignment 后统一复核                                                                                                                                      | —                                          |
| F-11 | representative unchanged Pi Package、Extension、Skill、Prompt、Tool、MCP 在 OmniMind Agent 的 Pi-compatible runtime 中运行；不宣称 TUI-only surface 无损兼容                                                                      | real ecosystem journeys + source audit       | candidate | 隔离 macOS Electron 的 folder-backed OmniMind Agent 以 DeepSeek 完成一类一个 unchanged journey：package `todo.ts`、extension `hello`、skill、prompt、built-in `read` tool 与 `omnimind_context` MCP 均由 Pi 0.84.1 原生 ResourceLoader/session 执行并完成 Timeline lifecycle；source probe 保留 project/package/builtin provenance，失败 warning 准确；运行前后 global/project `.pi` 哨兵内容与 SHA-256 均未变；focused adapter/harness 25/25、server typecheck/build 绿 | `9a46b4f477b335929eadaaf3584e72706942ee0e` |
| F-12 | Synara PluginLibrary/Skills/provider discovery 恢复；用户选择 Engine 后按 `architecture/execution.md` 组合完整 native ecosystem、兼容的 OmniMind Library 与 Workbench，保留 provenance/identity、private home 与准确 unavailable；无 shared PackageActivation/current/LKG 或跨 Engine durable state | native + additive ecosystem UI/journeys + home/isolation/conflict fault tests | candidate | 隔离 Electron：fresh profile 可从 Search 首次进入 Library；默认 OmniMind 在 `.pi` 不可读时仍工作，同名 native/OmniMind 显示双 provenance 且真实路径别名不重复；unsupported Plugins 不切 Engine；显式选择 Pi 后才出现 `.pi` native skill + OmniMind Library；Settings 仅 OmniMind copy 可切换、Codex native 为 Engine managed；native/catalog partial failure 保留可用结果并在 Library 显示分侧脱敏 warning，unsupported 不冒充 failed；真实 OmniMind Agent session 保留 Pi 原生 Prompt/Skill/Extension/Tool 并增量加载 `omnimind_context`，MCP discovery 失败时仍保留 native tools 且发出脱敏 warning；focused discovery 13/13、adapter/harness 25/25、server/web/contracts typecheck 绿 | `9a46b4f477b335929eadaaf3584e72706942ee0e` |
| F-14 | Chat managed workspace/artifact 与外部文件只读边界真实；Send to Agent 显式进入 folder-backed Project；文件/Git 不静默覆盖                                                                                                         | filesystem/Git/product journeys              | open      | 复用 source save/conflict，不建 observed-version platform                                                                                                              | —                                          |
| F-16 | approval/permission 只按 Provider/Host 实际请求与能力呈现；未实现能力不宣传，process isolation 不冒充 sandbox                                                                                                                     | source/UI + focused capability tests         | open      | 不建 permission broker 或跨 Provider deny matrix                                                                                                                       | —                                          |
| F-17 | 一套 OmniMind message catalog 覆盖正常用户可达产品面；中文/英文、IME、keyboard、screen reader、reduced motion、真实 long thread/burst/large output 达到可用质量；不把 source 零散文案冒充完整 i18n                                | catalog coverage + dual-locale/a11y/profile  | open      | source reset 后实现真实产品差异，不重写 Workbench                                                                                                                      | —                                          |
| F-18 | 同一 SHA 的 macOS/Windows/Linux artifacts 可安装、启动、更新、失败重试/重新安装恢复，legal/SBOM/signing 与 fresh audit 通过                                                                                                       | release matrix + completion audit            | open      | 复用 Electron pipeline；不要求自动 rollback                                                                                                                            | —                                          |
| F-19 | shipped inherited Provider 保持 discovery/health 和 source 已支持的 core journeys；ready/warning/error/auth/version/capability truth 准确；stock Pi session runtime 与 optional local CLI version 不混淆                          | provider smoke + source audit                | open      | bundled OmniMind Agent health 与无凭据状态真实；stock Pi 仍纯投影 bundled `0.84.1` 且默认不 discovery；App updater 独占 runtime 更新；其余 Provider 仍 open        | `bcede0cb632dee22e999d1f5f041dfa210fe2734` |

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

None currently. 若 exact Synara Registry 无法同时承载独立 OmniMind Agent 与 stock Pi，或 OmniMind Agent 无法在不读取 stock Pi state 的情况下保持所需生态兼容，停止并重新 convergence。

## 8. Done

Not done. 当前不存在可发布 V1 candidate。
