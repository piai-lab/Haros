# Pi Ecosystem Intake Profile

> 本文只拥有 Pi Core、Pi-compatible package/extension/skill/prompt/tool/MCP、OmniMind Agent Core 外部来源的运行时默认、source-type 裁决和风险附录。公共 Gate、freshness、disposition、实施、验证与状态规则唯一见 [`SOURCE-INTAKE.md`](SOURCE-INTAKE.md)。

## 1. 核心立场

OmniMind Agent 以 exact bundled Pi 为运行时 lineage。目标不是拥有更多“类似 Pi”的本地抽象，而是尽量保留 Pi 已成熟的 ModelRuntime、AgentSession、agent loop、context/compaction、ResourceLoader、PackageManager、Tool Registry/active set、reload、Provider wire 与作者生命周期。

当现有 adapter、自建机制、其他 Engine donor、第三方 package 或新抽象与 exact bundled Pi 的公开 seam 和生命周期冲突时，**Pi 在上述运行时机制域默认胜出**。只有维护者已明确批准并进入稳定 owner 的 fixed OmniMind divergence 可以覆盖。

这个默认不转移业务 owner：

- AgentGateway 唯一拥有 Host canonical catalog、schema、execution、credential、permission/turn authority、timeout 与 cancel；
- Product Thread、Timeline、Workbench、Product Orchestration、Queue/receipt 与跨 Provider 用户事实听 Synara 产品 owner；
- third-party Extension/MCP 拥有自己的 config、secret、transport、server/process lifecycle 与 business state；
- 进入 Pi Registry 不会把第三方能力静默变成 Pi、Host 或 OmniMind 第一方能力。

不能唯一归类时，不建立折中双轨；先展示真实 owner 分叉给维护者。

## 2. 触发与最小阅读

用户主动要求审查、比较、跟进、采用、升级或 fork 以下 exact source 时触发：Pi Core；Pi-compatible package、extension、skill、prompt、tool、MCP；其他 Agent Engine donor；OmniMind Agent Core 的外部来源。

exact source 是 Synara commit 时，即使其中有 Pi adapter、Tool 或 MCP，也只走 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md)，不叠两次 Gate。

每轮完整读取以下**核心**：

1. 根 [`README.md`](README.md) 与 [`architecture/README.md`](architecture/README.md) 路由的相关专题 owner；
2. 公共 [`SOURCE-INTAKE.md`](SOURCE-INTAKE.md)；
3. 本文第 1–8 节；
4. [`source-adoptions.json`](source-adoptions.json) 中相关 exact adoption；
5. [`execution-brief.md`](execution-brief.md)；
6. 只读取本轮命中的第 9 节风险附录，以及 [`research/README.md`](research/README.md) 路由的 package-specific evidence。

不要为了“完整”例行读取所有风险附录和所有 package 手册。package-specific manual 只能保存该来源的固定事实、patch inventory、反证和 revalidation trigger，不能重定义公共 Gate。

先声明本轮是 scoped source review 还是 adopted-head advancement，并按公共规则记录 freshness seal。package 热度、下载量、stars、npm `latest`、README 和接口美观只决定研究优先级，不构成采用证据。

## 3. 基本单位：source type + 真实 journey

先把候选归入一个 source type；不能用单一 adapter 模糊多个维护模式。

| Source type                           | Source / maintenance owner                        | Registration / execution owner          | State / distribution owner                             | 默认边界                                                    |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| **Bundled Pi Core**                   | exact upstream + OmniMind 可审计 patch            | Pi ModelRuntime / AgentSession          | Pi private state；OmniMind 只拥有 bundled distribution | 深度对齐 upstream，偏离需固定理由与删除条件                 |
| **OmniMind 自有随附 Extension**       | OmniMind                                          | Pi public registration/active lifecycle | 业务 state 归真实 capability owner；OmniMind 发行      | 只在明确 Provider/Session surface 注册，不冒充 Host catalog |
| **Host projection Extension**         | OmniMind 窄 projection                            | Pi 注册与 wire；AgentGateway 执行       | Host state/credential/permission 仍归 AgentGateway     | definition 与 execution 不得被 projection 复制              |
| **Forked upstream package**           | exact upstream lineage + OmniMind patch inventory | 依来源 public lifecycle                 | 明确 fork state、rights、distribution 与 rollback      | 证明 direct/config/seam 不足，补丁集中且可删除              |
| **Direct-installed upstream package** | upstream identity/version                         | Pi 原生 install/update/remove/reload    | upstream/private state；不自动随 OmniMind 分发         | 不静默修改、预装、承诺兼容或变第一方                        |
| **Donor / comparator**                | 原作者                                            | 不注册                                  | 不分发、不激活                                         | 只吸收 insight/test；不能写成 adopted source                |

同一 Extension 不能同时被描述为“直接安装的第三方”“OmniMind 随附一等能力”和“Host Built-in”。若确需转换 source type，必须说明 rights、安全、更新、注册、state、分发与长期维护变化，并取得维护者决定。

然后沿真实 journey 追：discovery/auth → load → definition/prompt → registration/active set → model wire → execution → state/event → failure/cancel/reload/restart/shutdown → package/update/remove。README 中列出功能不等于这些环节已闭合。

## 4. Gate A 的 Pi 专项输出

公共 Gate A 之外，至少回答：

### 4.1 Exact identity

- repository commit/tag、package version、artifact integrity 与 subpath 是否能相互绑定；
- manifest、export map、dist/source map、postinstall/build scripts 和 dependency closure 实际包含什么；
- license、notice、copied/adapted 文件与资产再分发是否完整；
- candidate 是否匹配当前 bundled Pi version、Node/Electron/platform 条件。

### 4.2 Runtime owner map

分别写清 source、maintenance、registration、execution、state、distribution 六个 owner。特别检查：

- definition 是谁生成，prompt 是谁注入；
- tool 是否真正进入当前 Session active set；
- execution 是否绕过 Host permission/turn authority/cancel；
- reload/remove 后 listener、timer、process、cache、credential 或 tool state 是否消失；
- package UI/TUI 是否被误当 Product Workbench；
- source retained、shipped bytes 和 runtime activated 是否被混写。

### 4.3 Prompt / Tool / Context / Cache

只要候选影响模型输入，就检查精确 schema、description、prompt 注入顺序、context budget、compaction/replay、cache key/invalidation、result truth、usage 和 continuation。不能只因 tool call 成功就宣称 Session 语义正确。

### 4.4 Author lifecycle iceberg

先运行与本轮 claim 相关的作者测试，理解它们覆盖的隐含生命周期；再决定需要保留、移植或以等价 falsifier 替换哪些回归。若删掉 package UI 或命令，不能顺带失去 tool state reconstruction、reload、collision 或 branch/session 语义。

### 4.5 最强基线

与以下最简单方案比较：Pi 原生配置；公开 seam/extension；直接安装；Host 窄 projection；本地 copied-adapted 小实现；bounded fork；完全自建。必须按用户结果、失败模型、rights、owner 数、runtime activation、同步税和退出成本比较，不能以“代码更整齐”取胜。

### 4.6 Decision surface

输出一张紧凑表：

| Guarantee / risk | Current owner and evidence | Candidate delta | Proposed disposition | Required proof | Decision needed |
| ---------------- | -------------------------- | --------------- | -------------------- | -------------- | --------------- |

只把 material loss、新 source type、新 owner/default activation、fork 责任、高风险和真实产品分叉交给维护者。Scoped review 到此停止；adopted-head advancement 按公共规则进入 Gate B。

## 5. 最小采用阶梯

按顺序尝试，不能为了少写当前 diff 而跳过成熟 owner：

1. **Use Pi as-is**：配置或 stock lifecycle 已满足；
2. **Use public seam**：Extension/Package/Tool API 或 Host projection 足够；
3. **Direct install**：上游 package identity、更新和私有状态应保持上游所有；
4. **Copied-adapted small implementation**：只适用于小型、稳定、许可允许、可清晰隔离且不需要上游持续承担正确性的片段；保留来源/版本/license/回归并删除无消费者能力；
5. **Bounded fork**：真实产品缺口无法由配置或 seam 解决，patch inventory、作者测试、rights、同步与删除边界都可审计；
6. **OmniMind-owned implementation**：只有现有来源不能承接且新增 owner 已获明确授权。

安全、协议、加密、复杂解析和复杂状态机默认不走 copied-adapted；这些能力需要成熟依赖持续承担正确性和维护责任。

## 6. Gate B 的 Pi 实施合同

在公共 Gate B 规则上补充：

1. 尽量保留 upstream ancestry、目录结构、作者测试和 public lifecycle；产品差异集中在少量 seam 或 patch。
2. definition、prompt、registration、execution、state、event projection 和 distribution 必须单向依赖真实 owner；一个 adapter 不得成为“独行侠”。
3. Host projection 只把 canonical definitions 投影进 Pi registration/wire；不复制 credential、permission、timeout、cancel 或 execution。
4. 关闭入口必须同时证明没有 ambient writer、listener、timer、process 或第二 control plane；未显示 UI 不等于未激活。
5. Package capability 若只在特定 Provider/Session/Presenter/permission 条件成立时可用，active set 和用户表面都必须准确反映，不用 silent fallback 伪装。
6. Fork 必须记录 exact upstream、patch inventory、每项 patch 的用户结果/风险、作者回归、删除条件、同步方式和回滚单位。
7. 新增 dependency 时证明它是运行时 owner，而不是只为一个可本地拥有的小函数引入整套 lifecycle；反之也不能为省依赖重写成熟协议或状态机。

物理分包按可独立替换的生命周期责任拆，不按 Goal/Review/Workflow 等功能名预建抽象。需要删除时，应能移除 composition、窄 projection 和产品入口后退出，而不是被第二 store、全局 registry 或迁移平台绑死。

## 7. Claim-driven proof

沿用公共验证矩阵。Pi 场景常见路由：

| Claim                                   | 默认 proof                                               | 不需要自动追加                                |
| --------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| package/source/rights/export            | exact artifact + author tests + source/adoption contract | live Provider、DMG                            |
| registration/active/reload/collision    | real Pi loader/session focused integration               | 多 Provider、完整 Workbench                   |
| prompt/schema/context/compaction        | focused wire/context fixture + author regressions        | packaged App，除非 Electron 边界改变输入      |
| Provider stream/tool/usage/continuation | matching protocol fixture → 最小 live probe              | 与 claim 无关的第二 Provider                  |
| cross-provider default Agent experience | MiMo 与 DeepSeek 等匹配资源的最小对照                    | 全量 provider matrix                          |
| shipped bundled runtime/profile/reopen  | frozen exact SHA 的一次 fresh isolated packaged journey  | Release/signing/feed                          |
| package UI/Product projection           | focused browser/component/a11y + 必要时人工视觉          | Computer Use，除非 OS-only surface 无替代证据 |

Live 与 packaged 不是 Pi intake 的固定尾巴。只有 claim 穿过这些边界时才运行；production candidate 也只对冻结的同一 SHA 做一次与声明相称的 packaged proof。真实 Provider probe 必须区分直连、OpenAI-compatible endpoint 与代理转换的 wire 事实。

## 8. 更新与长期维护

- 不自动追 `latest`；每轮固定 exact source/artifact，并重新记录 freshness seal。
- 只在相关触发器变化时重读 package-specific evidence 与风险附录。
- upstream 新增等价 public seam 时，优先删除 patch、fork seam 或自建机制。
- patch inventory 增长到跨多个 owner、需要永久 rebase 平台、或作者测试大面积失效时，停止增补并重新比较 direct/public seam/replacement/retirement。
- ordinary preservation work 只维护已采用保证，不自动重开 intake；source 前移、source type 改变、rights/activation/owner 变化或现有 proof 失效时重进 Gate A。

## 9. 风险附录：按命中读取

本节不是每轮必读清单。先在 Gate A 标记 risk tags，只读命中的附录。

### R1 — Subprocess / subagent / remote execution

检查进程树、working directory、environment allowlist、credential inheritance、stdin/stdout/backpressure、timeout/cancel、child cleanup、restart、concurrency、费用与 remote identity。subagent 不是自动授权的新 control plane；若单一 Agent 能完成，不因“更完整”引入编排。

### R2 — MCP / network tool / external side effect

检查 transport/server identity、endpoint 与 proxy 语义、auth/secret owner、network allowlist、request budget、retry/idempotency、cancel、response size、content trust、logging/redaction、process cleanup、离线/不可用行为。默认外部写入、删除或高费用动作需要单独授权。

### R3 — Knowledge / Memory / persistent state

检查数据来源、写入触发、scope、retention、delete/export、cross-project/session 泄漏、embedding/index owner、migration、schema version、恢复与用户可见性。不得因 package 自带 store 就建立第二 Product truth。

### R4 — Engine-native capability / Host projection

检查 capability 是否已由 Engine 原生拥有、投影是否只复用 Host canonical definition/execution、同名工具冲突、active set、permission/turn authority、timeout/cancel、result/usage/event correlation。不要为“跨 Engine 一致”制造假平权。

### R5 — User-visible package UI / TUI / Workbench projection

检查 package UI 是否应保留、隐藏或翻译到 canonical Workbench；双语、keyboard、focus、scroll、empty/error/recovery、responsive、a11y、theme 与 state ownership 必须落在 `architecture/workbench.md`。删除 TUI surface 时保留其背后的成熟 lifecycle，不把界面代码当状态 owner。

### R6 — Prompt / Skill / Tool / Context / Cache

检查发现优先级、命名冲突、prompt injection order、schema fidelity、自由表达边界、context budget、compaction/replay、cache identity/invalidation、reload 与 provenance。静态文件存在不等于当前 Session 已加载；loaded 也不等于模型真实收到。

### R7 — Fork / patch / package lifecycle

检查 upstream ancestry、patch inventory、author tests、install/update/remove/reload、version compatibility、private state、distribution、rollback 和 upstream equivalent seam。补丁若无法按单一责任解释或删除，fork 已超出 bounded。

### R8 — Rights / assets / distribution

检查 repository 与 artifact license 差异、NOTICE、transitive dependencies、copied/adapted headers、icons/fonts/model assets、trademark、source map 和 packaged byte scan。能研究不等于能再分发；source adoption 不等于 shipped 或 released。

## 10. 完成与 stop

除公共完成定义外，Pi adopted-head advancement 还要求：

- source type 唯一，六类 owner 清楚；
- Pi runtime、AgentGateway、Product owner 与 third-party business state 没有相互夺权；
- author lifecycle regression 被保留或有等价 falsifier；
- registration、activation、reload/remove/shutdown 与 unavailable 语义真实；
- fork/patch 有 exact lineage、rights、删除边界和可承担的同步成本；
- proof 只覆盖实际 claim，但足以推翻关键产品声明。

以下情况停止晋级：exact artifact/source/rights 无法绑定；候选要求 adapter 横跨多项生命周期责任；direct install/fork/first-party source type 无法唯一决定；隐藏入口后仍有 ambient activation；真实 Provider 行为被错误外推为协议通则；作者测试失败原因未知；补丁增长已证明需要第二平台；实施 materially 改变已决定的 owner、风险或产品结果。
