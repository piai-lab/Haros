# Research

`research/` 只保存可复核的固定证据：exact source、实验、失败、反例、候选比较、被拒绝路线与复验触发器。它不拥有当前产品设计、实施顺序、准入状态或下一动作。

## 使用规则

- 先读根 [`README.md`](../README.md) 与相关 [`architecture/`](../architecture/README.md) owner；只有确实需要来源证据或反证时才打开本目录。
- 每份文件都应被视为绑定其记录的 source/revision/环境的 snapshot。出现“当前、下一步、pending、candidate”时，除非顶部明确声明仍有效，否则只描述当时观察。
- 接受的稳定职责进入 `architecture/`；真实 source adoption 进入 [`source-adoptions.json`](../source-adoptions.json)；当前交付状态进入 [`execution-brief.md`](../execution-brief.md) 或 active Campaign。
- research 可以保留历史错误及 donor 原能力，但必须写明最终 disposition；不能把历史能力表、原型或测试计划重新当成产品要求。
- Git 保存完整历史。一个文件若不再拥有独特证据或重开触发器，就从当前树删除，不建立 `archive/` 垃圾场。

## 路由

### Synara 与产品母体

| 文件                                                               | 只在什么问题下读取                                                   |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [`source-review.md`](source-review.md)                             | Synara exact-source、rights、range disposition、母体机制与复验触发器 |
| [`interface-surface-inventory.md`](interface-surface-inventory.md) | 需要复核 2026-08-10 历史 public/interface surface snapshot           |

未来 Synara review/adoption 的操作方法只见根 [`SYNARA-INTAKE.md`](../SYNARA-INTAKE.md)。

### Pi、OmniMind Agent 与生态

| 文件                                                                                                             | 只在什么问题下读取                                                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`pi-native-product-integration-review.md`](pi-native-product-integration-review.md)                             | Pi runtime、Project trust、prompt、compaction、package/TUI 边界的 fixed review                                |
| [`omnimind-agent-core-ecosystem-orchestration-review.md`](omnimind-agent-core-ecosystem-orchestration-review.md) | Agent Core、异构协作、Workflow、Search、Memory/Wiki、Prompt/Cache 经济学与 package 候选的 2026-08-12 固定研究 |
| [`pi-native-host-tool-loading-review.md`](pi-native-host-tool-loading-review.md)                                 | Pi Extension Registry 与 AgentGateway Host projection 的 owner 证据                                           |
| [`pi-native-todo-extension-review.md`](pi-native-todo-extension-review.md)                                       | product-bundled Todo Extension 的 bounded source evidence                                                     |
| [`agent-tools-mcp-settings-review.md`](agent-tools-mcp-settings-review.md)                                       | Host tool/MCP Settings 的历史基线与反证                                                                       |
| [`host-tools-product-surface-policy-review.md`](host-tools-product-surface-policy-review.md)                     | 六组 Host capability 在 Agent/Chat/Studio 的 policy evidence                                                  |
| [`chat-work-surface-contract-review.md`](chat-work-surface-contract-review.md)                                   | ProductSurface 与 Provider execution/trust surface 的历史对照                                                 |
| [`model-services-composer-product-design.md`](model-services-composer-product-design.md)                         | Model services/Composer 的完整设计来源与旧 snapshot；不按其中阶段表施工                                       |
| [`omnimind-prompt-management-review.md`](omnimind-prompt-management-review.md)                                   | default prompt + custom rules 的 source precedence 与失败证据                                                 |
| [`pi-web-access-intake.md`](pi-web-access-intake.md)                                                             | `@omnimind/om-web-access` exact lineage、P1–P6、rights、更新与删除边界                                        |
| [`omnimind-ask-user-cognition.md`](omnimind-ask-user-cognition.md)                                               | canonical Ask User 产品裁决、fork decision、生命周期反证与证据                                                |
| [`pi-ask-user-intake.md`](pi-ask-user-intake.md)                                                                 | `@omnimind/om-ask` 的 upstream update/replay 手册                                                             |

通用 Pi/package/fork intake 方法只见根 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)。

### Workbench、视觉与用户表面

| 文件                                                                                     | 只在什么问题下读取                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`omnimind-agent-capability-surface.md`](omnimind-agent-capability-surface.md)           | Agent capability 如何复用 Composer、Timeline、child Thread、Files/Diff 等真实宿主 |
| [`omnimind-responsive-workbench-review.md`](omnimind-responsive-workbench-review.md)     | 响应式 Workbench、Sidebar/RightDock/Environment 角色与几何反证                    |
| [`omnimind-usage-insights-cognition.md`](omnimind-usage-insights-cognition.md)           | context pressure、usage stats、heatmap 与 export 的口径和视觉 taste               |
| [`omnimind-theme-system-review.md`](omnimind-theme-system-review.md)                     | Theme owner、semantic tokens、跨 Web/Browser/Terminal/native surface 边界         |
| [`omnimind-i18n-system-review.md`](omnimind-i18n-system-review.md)                       | catalog 分域、placeholder、normal surface language 与修改半径证据                 |
| [`omnimind-mermaid-presentation-evidence.md`](omnimind-mermaid-presentation-evidence.md) | Mermaid 精确依赖、安全反证、donor disposition、性能与 packaged 复验证据           |
| [`omnimind-tool-ui-projection-cognition.md`](omnimind-tool-ui-projection-cognition.md)   | canonical Activity/Tool identity、icon、density 与 Timeline projection taste      |

原型、HTML、截图和设计候选只证明相应文件声明的视觉或交互问题，不证明生产 owner、runtime correlation、packaged App 或发布状态。

## 写入准则

一份新的 research 文件只有在现有 evidence owner 无法承载独立来源或独立重开触发器时才成立。它必须在开头写清：

1. 绑定的 exact source/artifact/环境；
2. 它拥有的证据与明确不拥有的事实；
3. 最强反证与最终 disposition；
4. 什么变化才需要重读或复验；
5. 接受后的稳定合同位于哪个 architecture owner。

不要把施工 checklist、当前分支、最新 SHA、测试流水、packaged 状态或“新会话从这里开始”写进 research；这些内容会把证据 snapshot变成第二状态 owner。
