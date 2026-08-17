# Independent OmniMind V1 Campaign

Status: active

Owner: maintainer

Canonical path: `missions/independent-omnimind-v1.md`

Updated: 2026-08-17

## Objective

交付 production-grade OmniMind V1：以 exact Synara product substrate 为唯一产品母体，保留其完整桌面产品和多 Provider 能力；内置独立、Pi-derived 的 OmniMind Agent，并保留 stock Pi。普通产品旅程只呈现 OmniMind，来源 lineage 在 About、Licenses、诊断和显式技术详情中准确披露。

## Authority

本文件只记录 claim 状态与 evidence pointer。产品事实、UI、execution topology、source disposition 和当前工作分别由 README、`architecture/`、`research/` 与 `execution-brief.md` 拥有。本文件不保存实现日志、阶段门或施工顺序。

状态为 `open / candidate / verified / blocked`。普通 focused adoption 可在 owner 与证据闭合后验证；发行、签名、安全、迁移、权限、秘密及其他高风险 claim 需要独立裁决。

## Acceptance matrix

| ID | Claim | Status | Evidence pointer |
| --- | --- | --- | --- |
| F-01 | sole owners、source re-entry 与文档合同无执行矛盾 | candidate | `AGENTS.md`; `README.md`; `architecture/`; document contract |
| F-02 | 只有一个 Product Orchestration、Provider Registry 与 Project/Thread/Space product truth；无平行 ProductControlPlane/Run/outbox | candidate | `architecture/product-state.md`; `architecture/execution.md`; source tree |
| F-03 | Synara exact source、rights、逐责任采用与 OmniMind differences 可追踪 | open | `research/source-review.md` §14–15；维护者已确认 upstream/downstream 根定义与五类偏离；README adopted head 仍为 `18ff998…`，`8f9f600…` adoption set 实施与 authority closure pending |
| F-04 | source alignment 只有一个 exact adopted head，不维护 `stable + patches` 双轨 | open | README `source-adoptions`; `research/source-review.md` §15；Goal 全链已进入本地 candidate，但尚未完成 pushed-SHA packaged/live 闭合，不能把 candidate head 写成完整 adopted |
| F-05 | Agent｜Chat、Projects/Groups、Kanban 与标题/Terminal 映射使用 inherited substrate | candidate | `93f979c4f`; `architecture/workbench.md` |
| F-06 | Provider Registry/Session binding 唯一路由到 native adapters；切换 stop-first、失败恢复 exact binding | candidate | `de869f3ab`; Provider journey evidence in Git/research |
| F-07 | `omnimind` 与 stock `pi` identity/state/session 隔离；Pi lineage 为 stable `v0.84.2` | candidate | `d88edd3db`; `README.md`; Pi intake evidence |
| F-08 | admission、native acceptance、interrupt、settlement 与 unknown 准确，无跨 Provider replay/fallback | candidate | `de869f3ab`; `c8bac8add`; runtime recovery tests |
| F-09 | stream、reasoning、tool、structured request、usage/error 进入现有 Timeline 并保留 provenance | candidate | `3556f5118`; Provider runtime tests/journeys |
| F-10 | Workbench、Settings、File/Viewer/Diff/Terminal/Git、stream/scroll、a11y/perf 无 material regression | candidate | `dda13f957`; Workbench research/e2e |
| F-11 | representative Pi Package/Extension/Skill/Prompt/Tool/MCP 在 OmniMind Agent 中运行 | candidate | `9ce368fbd`; ecosystem journey evidence |
| F-12 | PluginLibrary/Skills/provider discovery 与 native + compatible OmniMind assets 组合真实，无 shared PackageActivation | candidate | `f4f7acc40`; `architecture/execution.md` |
| F-14 | Chat workspace/artifact、外部文件只读与 Send to Agent 边界真实；文件/Git 不静默覆盖 | candidate | `9ce368fbd`; filesystem/Git journeys |
| F-16 | approval/permission 只按真实 Provider/Host 能力呈现，process isolation 不冒充 sandbox | candidate | `9ce368fbd`; capability tests |
| F-17 | 一套中英 catalog 覆盖正常产品面，IME/keyboard/screen reader/reduced motion 可用 | candidate | `1bce5b690`; `architecture/workbench.md` |
| F-18 | 同一 SHA 的 macOS/Windows/Linux artifact、签名、更新、失败恢复与 fresh audit | blocked | macOS local candidates exist；Apple signing/notary、Windows signing、Windows/Linux native journeys 与 public release pending |
| F-19 | inherited Providers 保持 native discovery/health/core journeys 与真实 capability/version | candidate | `de869f3ab`; provider source/live smokes |
| F-20 | OmniMind Agent 达到成熟基线：effective instructions、bounded child control、无静默覆盖、完整 terminal、exact model、独立 Goal/Todo、task loop、review 与 economics truth | open | `e0ee9cfe2` 只闭合 Todo/task projection；Synara ThreadGoal 全链现为未推送 candidate，focused continuation/auto-pause 与 browser 已通过，仍缺 pushed-SHA packaged failure/reopen proof。验证参考见 `research/omnimind-agent-core-execution-guide.md` |

F-13 与 F-15 为退休历史 ID，不复用。Remote/SSH 继续属于 V2。

## Current blockers

- Synara `18ff998…8f9f600` 与 reopened earlier choices 的完整 decision surface 已获维护者确认；Goal 必须按母体全链实施，Todo 不能冒充 Goal。
- F-18 的真实三平台发行、签名和 public update authority 尚未闭合。

当前目标、范围与下一动作只看 [`execution-brief.md`](../execution-brief.md)。历史 artifact、测试计数和长篇 journey 保留在 Git 与 `research/`，不再追加到本文件。
