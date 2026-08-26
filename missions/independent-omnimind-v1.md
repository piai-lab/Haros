# Independent OmniMind V1 Campaign

Status: active

Owner: maintainer

Canonical path: `missions/independent-omnimind-v1.md`

Updated: 2026-08-25

## Objective

交付 production-grade OmniMind V1：以 Synara product substrate 为产品母体，保留真实多 Provider 能力；内置独立、Pi-derived 的 OmniMind Agent，并保留 stock Pi。普通旅程只呈现 OmniMind，来源 lineage 在 About、Licenses、诊断与显式技术详情中准确披露。

## Authority

本文件只回答“哪项 claim 处于什么状态，以及去哪里找证据”。产品事实、UI、execution topology、source adoption 和当前工作分别由 [`README.md`](../README.md)、[`architecture/`](../architecture/README.md)、[`source-adoptions.json`](../source-adoptions.json) 与 [`execution-brief.md`](../execution-brief.md) 拥有。

状态只有 `open / candidate / verified / blocked`。`candidate` 表示已有相称证据但尚不足以覆盖 claim 的全部范围；它不能被某次 focused、live、browser 或 packaged 绿色自动升级。

## Claims

| ID   | Claim                                                                                                                   | Status    | Evidence owner                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| F-01 | sole owners、读取路由与文档合同无执行矛盾                                                                               | candidate | `README.md`; `architecture/`; document contract                                                                             |
| F-02 | 只有一套 Product Orchestration、Provider Registry 与 Project/Thread/Space truth                                         | candidate | `architecture/product-state.md`; `architecture/execution.md`                                                                |
| F-03 | exact source、rights、adoption 与 OmniMind differences 可追踪                                                           | candidate | `source-adoptions.json`; `research/source-review.md`                                                                        |
| F-04 | Synara alignment 只有一个 adopted head，不维护 `stable + patches` 双轨                                                  | candidate | `source-adoptions.json`; `SOURCE-INTAKE.md`; `SYNARA-INTAKE.md`; `research/source-review.md`                                |
| F-05 | Agent、Chat、Studio、Projects/Groups、Kanban 与标题/Terminal 复用 inherited substrate                                   | candidate | `architecture/workbench.md`; `architecture/product-state.md`                                                                |
| F-06 | Provider binding 唯一路由到 native adapters；replacement、失败与恢复保持 exact truth                                    | candidate | `architecture/product-state.md`; `architecture/execution.md`                                                                |
| F-07 | `omnimind` 与 stock `pi` 的 identity、state、Session 与 lifecycle 隔离                                                  | candidate | `architecture/execution.md`; `source-adoptions.json`                                                                        |
| F-08 | admission、acceptance、interrupt、settlement、unknown 与 replay/fallback 语义准确                                       | candidate | `architecture/product-state.md`; `architecture/execution.md`                                                                |
| F-09 | stream、reasoning、Tool、User Input、usage 与 error 通过 canonical Timeline 投影且保留 provenance                       | candidate | `architecture/workbench.md`; `research/omnimind-tool-ui-projection-cognition.md`; `research/omnimind-ask-user-cognition.md` |
| F-10 | Workbench、Settings、File/Viewer/Diff/Terminal/Git、responsive、a11y 与 performance 无 material regression              | candidate | `architecture/workbench.md`; task-specific research evidence                                                                |
| F-11 | 代表性 Pi Package/Extension/Skill/Prompt/Tool/MCP 可在 OmniMind Agent 中真实运行                                        | candidate | `SOURCE-INTAKE.md`; `PI-ECOSYSTEM-INTAKE.md`; package-specific research                                                     |
| F-12 | native ecosystem 与 compatible OmniMind assets 组合真实，无 shared PackageActivation                                    | candidate | `architecture/execution.md`; Pi ecosystem research                                                                          |
| F-14 | Chat workspace/artifact、只读外部文件与 Send to Agent 边界真实                                                          | candidate | `architecture/product-state.md`; `architecture/workbench.md`                                                                |
| F-16 | approval/permission 只按真实 Provider/Host 能力呈现，process isolation 不冒充 sandbox                                   | candidate | `architecture/product-state.md`; `architecture/execution.md`                                                                |
| F-17 | 一套中英 catalog 覆盖正常产品面，IME、keyboard、screen reader 与 reduced motion 可用                                    | candidate | `architecture/workbench.md`; `research/omnimind-i18n-system-review.md`                                                      |
| F-18 | 同一 exact SHA 的 official cross-platform release、签名与 update authority                                              | open      | `architecture/public-surface.md`; release pipeline evidence                                                                 |
| F-19 | inherited Providers 保持 native discovery、health、core journeys、capability 与 version truth                           | candidate | `architecture/execution.md`; `research/source-review.md`                                                                    |
| F-20 | OmniMind Agent 具备 effective instructions、bounded child control、完整 terminal、exact model、Goal/Todo 与成本 truth   | candidate | `architecture/execution.md`; `architecture/product-state.md`; Pi research                                                   |
| F-21 | AgentGateway catalog、Host policy 与 Engine projection 保持一个 authority；Tool provenance/collision fail closed        | candidate | `architecture/execution.md`; Host-tool research                                                                             |
| F-22 | OmniMind Agent 的 default prompt 与 global custom rules 由 provider-global owner闭合                                    | candidate | `architecture/product-state.md`; `architecture/workbench.md`; prompt research                                               |
| F-23 | canonical User Input 是跨 Provider 一级公民：唯一交互、真实 terminal、无损 answer、no-UI/restart/provenance fail closed | candidate | `architecture/product-state.md`; `architecture/workbench.md`; Ask User research                                             |

F-13 与 F-15 是退休历史 ID，不复用。Remote/SSH 属于 V2。

## Current blockers

- F-18 是未来 official release claim；它不阻塞普通本地开发、source adoption 或 ad-hoc packaged evidence。
- 当前没有其他已知全局 blocker。具体任务的真实冲突只写入 [`execution-brief.md`](../execution-brief.md)。

证据细节、旧 SHA、artifact hash、测试计数与完整 journey 留在 Git 或对应 fixed research owner，不追加到本表。
