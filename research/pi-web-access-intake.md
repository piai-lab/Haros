# `pi-web-access` → OmniMind Web Access：exact-source intake

> 观察日期：2026-08-27
>
> Exact source：[`nicobailon/pi-web-access@08e347f4fe6bea807882c2363527118cce6eb539`](https://github.com/nicobailon/pi-web-access/tree/08e347f4fe6bea807882c2363527118cce6eb539)
>
> Exact artifact：[`pi-web-access@0.25.0`](https://www.npmjs.com/package/pi-web-access/v/0.25.0)
>
> Disposition：`Fork narrowly`

## 1. Scope、authority 与阅读规则

本文只保存 `pi-web-access` / `@omnimind/om-web-access` 的 package-specific 固定证据：

- exact source、artifact、rights 与 provenance；
- 为什么采用 narrow fork，而不是 Host capability、原装接入或重写；
- P1–P6 六个必要 divergence 的来源冲突、最小 seam 与删除条件；
- `source_check` 来源史、已知失败、品牌与权利异常等 research-only 事实；
- 上游升级、重新 intake、替换和退休触发器。

本文不拥有当前产品合同、采用 pin、施工状态或验证总账：

| 事实类型                                                       | 唯一 owner                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| 当前 adopted source、revision、rights 与路径                   | [`source-adoptions.json`](../source-adoptions.json)              |
| 搜索路由、并发、配置、Artifact、summary、active set 与生命周期 | [`architecture/execution.md`](../architecture/execution.md)      |
| Settings、Curator、Right Dock、语言、主题、焦点与可访问性      | [`architecture/workbench.md`](../architecture/workbench.md)      |
| 当前施工、阻塞与下一动作                                       | [`execution-brief.md`](../execution-brief.md) 或 active Campaign |
| 公共 source intake Gate 与 proof 规则                          | [`SOURCE-INTAKE.md`](../SOURCE-INTAKE.md)                        |
| Pi ecosystem source type 与专项风险                            | [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md)            |

下文的版本、数量与行为只描述 2026-08-27 的 exact observation。当前采用版本只能查 `source-adoptions.json`；Git 保存完整实施与验证历史，本文不复制分支、候选、DMG、测试计数或发布状态。

## 2. Exact dated source observation

### 2.1 身份、artifact 与权利

| 字段                     | 2026-08-27 exact observation                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| package                  | `pi-web-access@0.25.0`                                                                            |
| repository               | `https://github.com/nicobailon/pi-web-access.git`                                                 |
| gitHead                  | `08e347f4fe6bea807882c2363527118cce6eb539`                                                        |
| author                   | Nico Bailon                                                                                       |
| license                  | MIT                                                                                               |
| npm integrity            | `sha512-DYOEIMEPwpC6pHElexBy3XuaYPnfMxH0ZBaGrILFsLNQzhhHJ3kJLrCQU4fnKXYXV6OEwxsLt2pBP76koK4hHg==` |
| npm shasum               | `8b6cab44e86f6d134a25f8a3e31d241d4b92c1ec`                                                        |
| downloaded tgz SHA-256   | `06b3cb2b9d3118f66cd2fe84e5453dc0a8b8feaf099ae05e543ff9ebe80ae103`                                |
| source/artifact relation | npm `gitHead` 指向 exact commit；发布物 runtime TypeScript 与 exact source 对应文件逐字节一致     |

OmniMind fork 必须保留 upstream repository、exact base、作者、MIT LICENSE 与修改边界。仓库内法定副本位于 [`packages/om-web-access/LICENSE`](../packages/om-web-access/LICENSE) 和 [`LICENSES/pi-web-access-MIT.txt`](../LICENSES/pi-web-access-MIT.txt)。产品改名为 OmniMind Web Access 不抹掉 lineage，也不把上游代码伪装成从零第一方原创。

### 2.2 发布物与依赖形态

观察时 npm tgz 为 6,576,926 bytes，unpacked metadata 为 7,592,590 bytes。`banner.png` 与 demo video 占发布物的大部分体积；它们可作为 source lineage 保留，但不应因此进入 OmniMind shipped bytes。源码保留、发行物导出与 runtime 激活是三个独立事实。

0.25.0 的主要 runtime dependency 仍由成熟解析、DOM、PDF、HTTP 与并发库承担，包括 Readability、Defuddle、Linkedom、Turndown、UnPDF、Undici 与 `p-limit`。Pi peer dependencies 使用 wildcard；上游 README 的 Pi 范围不是 OmniMind 支持合同，bundled runtime compatibility 必须由 OmniMind 自己验证。

### 2.3 0.24.1 → 0.25.0 关键 delta

0.25.0 相对此前观察的 0.24.1 有 48 个 commits，且变化与 OmniMind fork 热区重叠。稳定 release 新增或修复：

- Codex/current-model 条件下优先使用适配的 OpenAI Hosted Search；
- config-level proxy，以及 `web_search`、`source_check`、`fetch_content` 的 per-call proxy transport；
- Kimi Code Plan explicit-only Provider；
- Gemini ADC、浏览器 profile 与相关可用性路径；
- GitHub PR/issue 专用读取；
- Defuddle extraction fallback；
- `get_search_content` bridge-default 与错误指引；
- routing、fetch、extraction、错误语义、取消与作者测试的配套修复。

这些稳定能力原则上跟随作者，并通过 P1–P6 翻译进现有 OmniMind owner。Proxy 不构成产品分叉：保留上游 config/per-call 参数、redaction、SSRF 与 cancellation 语义，不新增确认、Settings 状态或第二代理 owner。

观察时 upstream main 比 0.25.0 多 9 个未发布 commits，主要是 XCrawl。维护者已裁决长期跟随单位是最新稳定 release，不自动追 main；因此 XCrawl 不属于本次 exact baseline，待其进入稳定 release 后再 intake。

## 3. Adoption rationale 与最强反证

### 3.1 为什么采用 narrow fork

用户需要的不是一个同名 API，而是一整套已经成熟的网络研究能力：多 Provider 搜索、内容读取、PDF/视频/GitHub、来源审查、结构化 evidence、取消、缓存、Session branch 恢复和 Curator 生命周期。

0.25.0 在 exact source 中已经承担这些水下责任：

- 多种 search route、credential source、proxy、SSRF 与 Provider-specific error；
- HTML extraction、blocked/JS page fallback、PDF、GitHub、视频和图片读取；
- response ID、Session custom entries、bounded retrieval 与 branch restore；
- Curator SSE、摘要/原始结果 settlement、idle timeout 与 abort cleanup；
- 作者测试覆盖的协议和失败边界。

完整重写会把成熟 package 降格成几段 API 调用，并让 OmniMind 接管上述全部维护责任。最小长期成本是保留上游目录、实现、作者测试与 ancestry，只在六个宿主冲突处做可审计 patch。

### 3.2 为什么不是 Host capability

Browser 作为 Host capability 能补许多 Engine 欠缺的可接管执行面；Web Search 不同，多数现代 Engine 已有 native search。把它放进 AgentGateway 或跨 Engine Host catalog 会制造重复工具、同名冲突、第二 Provider routing owner 和虚假的跨 Engine 平权。

因此它只作为 bundled OmniMind Agent 的 Pi-native Extension 受支持：

- Pi `AgentSession`、ResourceLoader、Tool Registry / active set 继续拥有执行生命周期；
- 不进入 AgentGateway，不增加 Host Built-in 分组；
- 不承诺 stock Pi 或其他 Engine 的 fork compatibility；
- 移除 composition 即可退出，不迁移 Host store 或跨 Engine state。

### 3.3 为什么不能原装接入

Exact upstream 的默认宿主是假定单 Pi TUI 进程、process-global config 与 Pi-owned UI。OmniMind 同一 Server 可承载多个 Thread / Pi Session，使用 product-private config，并在 Right Dock 呈现 Web surface。若原装接入：

- 一个 Session event 可能清理另一个 Thread 的请求、Curator、结果或 cache；
- process-global path 与分散 config cache 可能触碰 stock `.pi` 或继续使用旧配置；
- `ctx.hasUI === false` 会把可由 Host 呈现的 review 错判为无 UI；
- Glimpse、系统浏览器、slash commands、TUI shortcuts/widget 会形成第二呈现面；
- Provider route exhaustion 无法准确投影到当前 Pi active set。

### 3.4 最强反证与退出方向

以下事实若成立，应删除 patch 或退出 fork，而不是保护既有投入：

1. 上游提供等价的 instance config、per-session state、Host-presentable Curator 与统一 config reader，足以删除 P1/P2/P4。
2. Bundled OmniMind Agent 的 native ecosystem 在真实 journey 中以更低维护成本达到 search + fetch + evidence + review 的同等或更好结果。
3. 六个 seam 外持续出现新的长期 owner，作者测试必须大面积删除，或每次稳定升级都需要重写大片页面/Provider 实现。
4. Provider/Curator 已不再是产品差异，移除 Extension composition 后可由既有 owner 无迁移替代。

## 4. Upstream capability 与关键 falsifier

### 4.1 四个 canonical tools

Exact 0.25.0 提供 `web_search`、`source_check`、`fetch_content` 和 `get_search_content`。OmniMind 保留 canonical names，因为 Timeline、Curator provenance、active-set 管理与模型提示都依赖稳定 identity；产品 profile 不暴露上游 `toolNames` override。

其边界不是“只有搜索”：`fetch_content` 与 stored-result retrieval 可以在搜索 Provider 不可用时继续工作。任何 availability 实现若把一个 route 的失败扩张成整包 inactive，就是反例。稳定工具注册、路由、Artifact 与 summary 合同见 Execution owner，本文不再复制。

### 4.2 Provider 与 routing 的固定观察

0.25.0 exact source 解析出 27 个 Provider identities，并区分 auto-eligible 与 explicit-only。多条路径可能无需独立 API key，但“结构上存在路径”不等于“真实可用或有额度”。特别是：

- Exa keyless MCP 的 availability 不能证明实际额度；
- Gemini 的自动可用性路径与严格 named executor 并不天然等价；
- Kimi、AnySearch、DuckDuckGo、Parallel MCP 等 explicit-only 路径不能因存在而静默进入默认聚合；
- named route 的失败不能被解释为整个 Web Access 不可用；
- Provider inventory 会随 runtime 漂移，当前目录由 runtime descriptor 拥有，research 不维护第二张全量表。

这组观察直接要求 P3/P5，但不规定当前 `auto`、`broad`、`all` 或 query 并发数；稳定产品语义只见 Execution owner。

### 4.3 Session、Artifact 与 cache 的水下事实

上游通过 Pi Session custom entries 保存 search/fetch/research result，可随 branch 恢复；full content 使用有界 cache；GitHub clone、pending request、Curator 与 activity 也有各自 cleanup。`session_start`、`session_tree`、`session_shutdown` 的意图本身正确，问题是 exact source 中部分 mutable maps/caches 是 module-global。

因此 fork 应继续消费原生 Session events，只把 mutable state 收进 Extension instance。把这些生命周期搬到 Product Thread manager、PiAdapter 或第二 Artifact store，都是比原问题更大的分叉。

### 4.4 Curator 的固定观察

上游 Curator 是一次 `web_search` 的来源选择与摘要 settlement 页面，不是搜索引擎、长期结果库或独立产品 route。它已经包含结果流、补充搜索、选源、原始结果提交、摘要生成/编辑/重新生成/预览/批准、timeout 与 cancellation。

OmniMind 的必要差异只在宿主与 presentation seam：上游的 Pi TUI/Glimpse 假设不能直接成为 Right Dock 合同。当前 UI、workflow 与信息顺序由 Workbench owner 决定；research 只保留“不要重建成熟 Curator 生命周期”和“不要让 token URL 进入持久 Browser history”的反证。

## 5. P1–P6 bounded divergence inventory

新增第七类长期 patch 前，必须证明它不能归入下列 seam，也不能通过上游公开边界解决。

| Seam                              | 上游原行为                                                                                                                      | OmniMind 冲突                                                                                    | 必要 seam                                                                                                                          | Falsifier / 删除条件                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| P1 Per-Session instance state     | pending request、Curator、stored results、activity、clone/cache 等部分 mutable state 为 module-global，并由 Session events 清理 | 同一 Server 的 Thread/Session 会互相取消、清理或恢复                                             | mutable state 移入每个 Extension factory instance；继续使用 Pi Session events                                                      | 上游完整 instance-scope；或 OmniMind 不再并发承载多个 Pi Session                            |
| P2 Instance config + single owner | config path 依赖 process env；多个模块各自 cache 同一 JSON                                                                      | private home 隔离失败，Settings 热编辑后各模块可能看到不同版本                                   | 注入 exact path；package-owned reader/writer/snapshot；移除 module-local config truth                                              | 上游支持 injected path、统一 reader 与可靠 invalidation，且不读取 `.pi`                     |
| P3 Product runtime profile        | 默认注册 TUI commands/shortcuts/widget、Glimpse/system-browser fallback，并保留上游任务级 route/result语义                      | OmniMind 已有自然语言、Settings、Timeline、Right Dock；重复入口和 presentation owner 会泄漏      | 只关闭不适配入口；搜索执行、Provider、fetch、storage 与作者测试继续跟随上游；Agent-native route/result差异集中在 package 内窄 seam | 上游提供等价 host profile；或 OmniMind 改用 stock Pi TUI 作为唯一产品宿主                   |
| P4 Host-presentable Curator       | `ctx.hasUI === false` 可降级 review；页面与 token lifecycle 假定 Pi UI/Glimpse                                                  | OmniMind 无 Pi TUI，但有 typed Right Dock surface、多 Thread provenance、双语与短时 Browser 边界 | 保留上游 Curator协议与 review能力，通过既有 engine-web-surface/Browser seam 呈现；presentation adapter 与上游页面主体分离          | 上游提供可注入 Host presenter、locale/theme 与 token-safe lifecycle；或产品不再提供 Curator |
| P5 Availability → Pi active set   | Provider availability/route failure 不直接等于 OmniMind 当前 Session 的工具可用性                                               | 错误地永久隐藏整包，或保留已证实不可用的 search tools                                            | 只根据结构候选与真实 route evidence调整本 Extension 的 search-dependent tools；不建 daemon/store                                   | Pi/upstream原生提供等价 scoped active projection；或 Web Search 不再动态收缩                |
| P6 Honest `source_check`          | hard evidence 与 English-centric heuristic assessment 同时输出                                                                  | 中文可能无证据，heuristic 容易被误解为事实裁决                                                   | 保留 artifact/passages/hash/span；补 Unicode；明确 assessment 是 heuristic                                                         | 上游完成 Unicode 与诚实语义；或删除 heuristic 判断只保留 hard evidence                      |

### P1 的水下边界

Instance state 至少包括会被 Session lifecycle 清理的 pending fetch/search、Curator handle/server、stored results、activity/widget、clone cache 和其他 mutable cache。Call terminal 只清该 call，Run abort 只中止该 Run，Session shutdown 才清整个 instance；这些稳定语义由 Execution owner 维护。

P1 不授权新建 OmniMind Session manager、全局 request registry 或搜索历史数据库。它只把原本属于 Extension instance 的状态从 module global 收回。

### P2 的水下边界

Exact source 曾有约 30 个模块各自持有 `cachedConfig`，只有少数暴露 reset。单纯让 Settings 写 JSON，不能保证正在运行的 Provider 使用同一事实。

最小修复是 package 自己拥有 schema/read/mutation/snapshot，并由 Settings 和 Extension 共同消费；Host 只注入路径和调用 typed service。Unknown fields、atomic write 与损坏/未来 schema 处理属于该 owner，但具体合同只见 Execution。P2 不授权数据库副本、Host migration platform、file watcher 或 process env 改写。

### P3 的水下边界

OmniMind profile 可以不注册 slash commands、TUI shortcuts/widget、remote Curator、系统浏览器 fallback 与 tool-name override，但不得因此删除 upstream search/fetch/provider/storage 模块或作者测试。

Agent-native 搜索覆盖、query fan-out、summary 输入、完整来源投影和 Artifact 惰性读取属于同一 package seam，因为它们消费上游现有结果与 storage；它们不是第二 Store、队列或调度服务。当前数值和完整行为只见 Execution。

### P4 的水下边界

Host presentation 必须按 exact Thread/tool call 关联短时 surface，不能靠扫描任意 tool-result 字符串成为长期接口。Review 与 observer 的 settlement 不同，但不应为此创建第二 Curator 协议或 Host 状态机。

Token URL 不能进入 recent history、tab restore、Product payload、日志或截图；关闭 Tab 是隐藏，不自动取消底层 call。页面的语言、主题、布局、焦点、Markdown 安全和 review 动作完全由 Workbench owner 维护，本文只保留这个来源冲突。

### P5 的水下边界

“结构上可能可用”“一次 transient failure”“configured candidate set 已穷尽”是三种不同证据。Availability 必须按真实 route 依赖收缩：search-dependent tools 与 content/retrieval tools 不能绑成一个整包布尔值。

P5 不授权启动时探测、后台 health daemon、cooldown 数据库、永久 connected 状态、全局 Session registry 或付费探测循环。恢复只通过既有 config revision、显式检查、native reload 或新 Session。

### P6 的水下边界

`source_check` 最有价值的是 machine-readable evidence，不是自动判真伪。Exact source 的 tokenizer、marker 与 passage extraction 对英文有明显偏置；修复目标是让中文能被找到，并让 Agent 知道 judgement 仍是 heuristic，而不是增加第二 verification model 或 consensus engine。

## 6. `source_check` 独特来源史与已知限制

### 6.1 来源史

`source_check` 最初由 Clark Everson（GitHub `gr3enarr0w`）在 [issue #108](https://github.com/nicobailon/pi-web-access/issues/108) 提议：更丰富的 search/RAG 应进入同一个 package，workflow/accountability 需要稳定 JSON、provenance、exact passages、hash、rank 与 response/session retrieval，不能抓 terminal 文本。

[PR #111](https://github.com/nicobailon/pi-web-access/pull/111) 提交首版但未 merge。Nico Bailon 后来通过 replacement [PR #156](https://github.com/nicobailon/pi-web-access/pull/156) 落地，并修复 execution context、configured-provider semantics、cancellation、query/fetch errors、empty passage、真实 SHA-256 与 substring polarity。

### 6.2 Hard evidence 与 heuristic 的边界

值得保留的 hard evidence 包括 URL/title/rank/snippet、fetch timestamp/error、content 与 passage SHA-256、exact passage、extraction span、stable passage ID、filters、Provider/error 与 bounded response ID retrieval。

Exact heuristic 的限制包括：

- tokenizer 只保留英文/数字长 token，中文 claim 容易变成 `missing-evidence`；
- source quality 主要是 hostname/path regex，不验证内容真实性或机构质量；
- supported/contradicted 依赖英文 marker 与词项 overlap；
- confidence 是固定规则计数，不是语义模型置信度；
- passage extraction 偏向英文句界与 snippet hint；
- 无法判断研究设计、来源独立性、时间因果、数字口径或复杂条件句。

因此 `claims[].status/rationale/confidence` 只能作为 heuristic compatibility output。最终判断由 Agent 结合 passages 与来源完成；不得在 tool description 或 UI 中把它写成事实裁决。

## 7. Rights、品牌与已知异常

### 7.1 Provider assets 不自动继承 MIT

上游代码的 MIT 许可不自动覆盖 Provider logo、app icon 或 favicon。随 App 分发的品牌文件需要固定 source snapshot、hash、已知 license/trademark 约束与 shipped path；官网可访问不等于获授权、合作或背书。

0.25.0 source observation 对应 27 个 runtime identities。原有 26 个 identities 在 OmniMind 使用 25 份本地品牌资产，Parallel 与 Parallel MCP 共享 mark；新增 Kimi 在独立品牌资产准入前使用中性 fallback。这个数量只记录当时 source delta，不是 runtime inventory owner。

Bright Data 的官方 [Trademark Usage Guidelines](https://media.brightdata.com/2022/12/Permitted-Use-of-Bright-Datas-Trademark-Name.pdf)把 logo 使用置于书面同意之下。维护者已明确接受该已知约束，不把书面许可作为当次视觉交付阻塞门；记录约束不等于声称已经取得许可。

### 7.2 身份映射异常

2026-08-27 仍需在未来 asset/source 更新中复核的异常：

- runtime `xai` 的固定 glyph/title 使用 Grok 产品身份；
- Searchinfinity 资产来自其 BytePlus 关联页面；
- Parallel 与 Parallel MCP 是两个 runtime IDs，但共享一份品牌 mark；
- Kimi 是 0.25.0 新增 explicit-only route，品牌资产未随旧 26-provider 批次自然获得准入。

这些事实不能通过改写 runtime ID、热取 favicon 或另建 Web logo table 来消失。Runtime descriptor 是 current inventory owner；presentation 只消费其稳定 identity 和已准入本地资产。

## 8. Compact fixed evidence 与已知反例

以下仅是能证明 package-specific claim 的历史锚点，不是当前状态总账，也不能跨 SHA 拼接成“最新全绿”：

- Exact upstream artifact/source 校验确认 0.25.0 npm `gitHead`、runtime bytes、integrity、shasum 与下载 tgz hash一致；这支持 source provenance，不证明 OmniMind shipped behavior。
- `8a663b2c27d0a2aeacd308a74ea7a1e631ba494e` 是 0.25.0 Agent-native implementation 的历史 proof anchor：它证明 broad 的真实多源局部成功、零配置无幽灵 Gemini 失败、完整来源、Artifact 继续读取、inline-tail observer/review 与隔离 packaged journey 曾在同一 exact SHA 闭合。该记录不拥有今天的 adoption、main、Release 或安装状态。
- `286df13768de943a2db4df033180251c2f353aca` 只证明过 13 个品牌 asset + 13 个中性 fallback；维护者随后提高为原有 26 identities 使用 25 份品牌资产，因此这条旧视觉证据是明确反例，不能被重新当作准入标准。
- Untouched/upstream-style browser handoff 曾允许复用用户 Tab、通用展开 Browser pane 与 token URL 进入 recent history；它证明“能打开页面”不足以证明 P4 Host presentation。
- 真实 Provider probe 曾证明结构候选、keyless 路径与实际额度可能分离；因此启动时或 descriptor-only“已连接”状态不能替代真实 route evidence。

代码、测试、packaged 产物、任务分支与合并状态一律由 Git 和对应执行 owner 承担。若未来 claim 需要重验，按 `SOURCE-INTAKE.md` 从新的 exact SHA 生成新证据，不在本文追加流水账。

## 9. Upstream sync、reopen 与 retirement

### 9.1 稳定 release 同步

维护者触发更新时，以最新稳定 release 为单位：

1. 锁定 tag、commit、npm artifact、integrity、hash、dependency 与 license；
2. 对比 source/artifact、install scripts、发布物和作者测试；
3. 先保留并运行上游作者测试，再把变化映射到 P1–P6；
4. 上游已解决的 seam 直接删除，冲突只在现有 owner 内翻译；
5. 更新 `source-adoptions.json` 的唯一 pin，并只在本文更新 dated observation、delta、反证与 divergence disposition；
6. 未发布 main 不自动进入 baseline。

禁止为同步建立第二 GitHub fork、自动追 main、兼容双轨、同步 control plane 或按 commit 堆 wrapper。OmniMind monorepo内保留 exact upstream 结构、作者测试、license 与窄 diff 即可。

### 9.2 Reopen triggers

出现以下任一变化，重新执行公共 source intake：

- 新稳定 release，或 source/artifact/dependency/license/provenance 改变；
- bundled Pi runtime 发生 material 升级；
- upstream 能删除 P1–P6 任一 seam；
- Provider routing、proxy、Curator 协议、ResearchArtifact 或 cache format 改变；
- 发生 secret leak、SSRF、跨 Session cleanup、错误付费、orphan server 或触碰 stock `.pi`；
- Engine-native search + Browser 在真实 journey 中达到同等或更好结果；
- OmniMind 不再以 Pi AgentSession、private config 或 Right Dock 作为相关 owner。

仅修改 Curator 布局、翻译或主题时不重开 research；只改 Workbench owner。仅修改稳定路由合同而未推翻来源结论时只改 Execution owner。新增 Provider 不更新本文第二张全量目录；只有新稳定 source delta、rights 异常或 P1–P6 disposition 改变时才更新 research。

### 9.3 Replacement / retirement triggers

下列情况应优先替换或退休，而不是扩大 fork：

- 六个 seam 以外出现新长期 owner、Store、control plane 或迁移责任；
- Upstream 升级长期无法保留作者测试/ancestry，或需持续重写大块 Provider/Curator 实现；
- 现有 OmniMind owner 提供更成熟的等价能力，删除 Extension composition 与窄 presentation/config seam 即可退出；
- 用户结果不再明显优于 Engine-native search + Browser 基线；
- 权利、供应链或 Provider 政策变化带来无法接受且难以隔离的真实损失。

退休边界应保持可删除：从 bundled Extension composition 移除该 package，保留用户配置与 cache 原字节，不迁移、不删除，也不影响 AgentGateway、其他 Engine、Host Browser 或其他 Pi Extensions。

### 9.4 修改半径演练

本文件通过以下演练才算继续符合 research owner：

- 新增/删除 Provider：只改 runtime descriptor、实现、测试与必要 asset admission；research 不维护全量表。
- Curator 改布局：只改 Workbench owner 与对应实现；除非推翻 P4 来源冲突，否则 research 不动。
- 路由、summary 或 Artifact 合同变化：只改 Execution owner 与实现；除非需要新增/删除 P3 seam，否则 research 不动。
- 新稳定 release：更新 exact dated observation、delta、反证、P1–P6 disposition 与 rights，不追加施工/测试状态总账。
- 整体退休：删除 composition、窄 Host projection 与产品入口即可，不应牵连第二 Store、迁移平台或跨 Engine registry。

这组边界比保留一份完整产品合同更重要：Research 负责解释“为什么曾经需要 fork、什么能推翻它”，Architecture 负责“产品现在怎样工作”，Git 和 Execution 负责“这次做到哪一步”。
