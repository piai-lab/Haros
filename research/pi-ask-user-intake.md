# `@omnimind/om-ask` 上游更新 Intake：exact-source、patch rebase 与发布门

> 初版日期：2026-08-22；Gate A 重审：2026-08-25
>
> 当前 fork lineage：[`@mrclrchtr/supi-ask-user@5.0.0`](https://www.npmjs.com/package/@mrclrchtr/supi-ask-user/v/5.0.0) / [`mrclrchtr/supi@ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user`](https://github.com/mrclrchtr/supi/tree/ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user)。减法 lineage 已 source-adopted 为 private `@omnimind/om-ask@5.0.0-omnimind.1`；禁止 direct install，也不构成自动追更授权。
>
> 当前 OmniMind source 观察起点：`14fa9f3e93048d51dc8e3d9d81812418a3590cf2`；fork feasibility commit：`a96c60256bd6e391af57f4d2994b4a12d32aa6a5`；source activation commit：`36e3bec7e789122c731028c1a8b791a68a6c1fea`
>
> 当前状态：Gate A 已重审；没有候选获准原装采用。完整 Gate B source integration 已实施：canonical contract、Composer projection、presenter lease、Host bridge、Pi barrier、同名 provenance、terminal/late/restart fencing 与唯一 bundled Tool registration均在 source 中闭合。MiMo/DeepSeek live 与 exact pushed-SHA packaged Ask continuation仍未闭合，因此当前不是 packaged candidate或 Release。
>
> 文档性质：package-specific update operating manual。它不重新定义 Ask User 的产品合同。

> [!IMPORTANT]
> 产品身份、维护者 taste、canonical contract、UI、生命周期、P1–P7 patch 含义与 required proof 的唯一认知入口是 [`omnimind-ask-user-cognition.md`](omnimind-ask-user-cognition.md)。通用 Pi ecosystem Gate A / Gate B、权利、source type、讨论与 adoption authority 继续由根 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) 拥有。本文只回答：**未来某个 exact upstream source 到来时，维护者如何看清变化、重放 patch、吸收成熟增量并证明没有倒退。**

> [!WARNING]
> 版本号更高、README 更漂亮、npm `latest`、GitHub stars、测试数量增加或 merge 无冲突，都不等于可以更新。每次 intake 必须重新固定 exact source/artifact，完成只读 Gate A，并在维护者确认当次完整 decision surface 后才能进入 Gate B。本文不能作为自动升级授权。

## 0. 零记忆执行摘要

### 0.1 目标

未来更新默认应积极吸收上游的成熟 UX、bugfix、作者测试与生命周期改进，同时保护 OmniMind 已锁定的产品不变量：无任意能力上限、永远有自由表达出口、shared canonical UI、Ask/Approval 分离、same-turn side-effect barrier、terminal fencing、provenance、no-UI fail-closed 与 restart stale。

### 0.2 当前 baseline

```yaml
product: OmniMind Ask User
fork_package: "@omnimind/om-ask"
fork_version: "5.0.0-omnimind.1"
fork_feasibility_commit: a96c60256bd6e391af57f4d2994b4a12d32aa6a5
activation_commit: 36e3bec7e789122c731028c1a8b791a68a6c1fea
fork_stage: source_integrated_packaged_pending
runtime_tool: ask_user
conditional_runtime_lineage:
  package: "@mrclrchtr/supi-ask-user@5.0.0"
  repository: https://github.com/mrclrchtr/supi.git
  commit: ce8af5f57304ad114319aa75c00920f029ceb8e7
  path: packages/supi-ask-user
  license: MIT
  artifact_legal_files: missing_LICENSE_and_NOTICE_must_be_fixed_in_fork_distribution
  npm_integrity: sha512-uBlvlXTvSrdvTvvdbpapwVwA4I3DMcIaHSGe18mtd4KdWAhd36yY1UwGvAbFXcS2NvJ18VIkaJpi112CSoabJQ==
  npm_shasum: cabb06df40ab95be1a67b4f3b32c83bc257ea38a
  tgz_sha256: d687d4d448cc115a67ceb473b8e9ceeb56dddb047901b1f2daa05d6ae0cb300e
  evidence: exact_source_matched_subtractive_lineage_adopted
  fork_shape: subtractive_not_narrow
  direct_install: forbidden
primary_donor:
  package: "@geoqiao/pi-ask@1.3.0"
  commit: 26496c809870e349429bc2cae72d61b46d0e2bc3
  ancestry: eko24ive/pi-ask
  role: ux_and_regression_only
bounded_donors:
  lifecycle: "@pi9/ask@0.4.2"
  compatibility: "pi-ask-user@0.14.0"
  correctness_tests: "@qmahyar/pi-ask@1.4.0"
  sentinel: "pi-tian-ask-user@1.0.0"
patch_inventory:
  - P1_identity_and_product_profile
  - P2_canonical_contract_and_freedom_invariants
  - P3_structured_host_seam
  - P4_canonical_workbench_projection
  - P5_lifecycle_and_same-turn_barrier
  - P6_truthful_result_and_context
  - P7_provenance_reload_and_collision
pi_barrier:
  package: "@earendil-works/pi-agent-core@0.84.2"
  patch: "patches/@earendil-works%2Fpi-agent-core@0.84.2.patch"
  patch_sha256: c63f6877299935fd9ee85c05b81d9e3f571f640704ff85a7f8e03209620e8e78
  delete_when: upstream_provides_equivalent_preflight_barrier
feasibility_slice:
  decision: go
  retained_source_modules:
    [types, normalize, controller, lock, structured_result, host_neutral_kernel]
  deleted_upstream_owners:
    [
      tui,
      transcript,
      supi_core,
      config,
      events,
      timer,
      terminal_session_helpers,
      upstream_registration,
      upstream_schema,
      upstream_prompt_guidance,
    ]
  omnimind_replacements:
    [
      product_schema,
      tool_definition,
      host_bridge,
      presenter_lease,
      canonical_composer,
      pi_barrier,
      provenance_gate,
    ]
  fork_tests: 71
  registered: presenter_and_provenance_gated_omnimind_agent_only
  model_exposed: true_only_when_registered
  canonical_contract_connected: true
  composer_projection_connected: true
  fork_shipped: pending_exact_packaged_scan
  canonical_ui_installed_candidate: true
status: gate_b_source_integrated_live_and_packaged_pending
```

当前 block 已记录 source adoption与 gated runtime registration，但不能在 MiMo/DeepSeek和 exact packaged journey闭合前填入 shipped artifact hash、packaged candidate或 released等级。

### 0.3 每轮必须产出的结论

一次完整 intake 必须给维护者一页就能回答：

1. exact source 与 exact artifact 是什么，是否可复现对应；
2. 相比当前 adopted base，用户体验、合同、生命周期、依赖和发行物变了什么；
3. 每项变化应 `adopt directly / adapt / donor only / reject / defer` 中哪一种；
4. P1–P7 哪些冲突、哪些可删除、哪些必须重写；
5. source retained、shipped bytes、runtime activated 各自有什么变化；
6. 作者测试保护了什么、删除了什么、OmniMind 还缺什么 falsifier；
7. 是否新增 owner、state、config、listener、timer、writer 或 remote authority；
8. 对用户和维护者的净收益是什么；
9. 失败如何回滚；
10. 当前只到 research candidate、source candidate、packaged candidate 还是 released。

### 0.4 当前 fork feasibility baseline

未来每轮 intake 必须从以下已证明边界出发，不能重新把删除项 merge 回来：

| Surface                 | Current fork baseline                                                                                        | Update rule                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| source ancestry         | supi exact `ce8af5f…`；feasibility `a96c60256…`；activation `36e3bec7e…`                                     | 每个 retained hunk 必须继续映射 exact upstream module/test                           |
| domain/controller       | 选择/文本正交、stable IDs/values、navigation、comments、ordered structured outcome、cancel/abort terminal    | 优先吃 upstream bugfix；若 controller/normalize 连续大面积冲突，回 Gate A            |
| recommendation          | metadata only；零默认选择、零文本预填                                                                        | 任何恢复 preselection/prefill 的更新拒绝                                             |
| text                    | 不 trim、不 Unicode rewrite、不静默归并                                                                      | blank validation 可检查但不能改写原值                                                |
| limits                  | 只保留“至少一题、choice 至少一个 authored option”的语义有效性；无 product max                                | transport/security guard 未来由 canonical contract owner 明确，不能回写 guidance cap |
| runtime shell           | Host-neutral interaction port、lease lock、pre/in-flight abort、late settlement fence                        | package不自注册；Server composition/Host bridge是唯一 consumer                       |
| result                  | deterministic JSON content +同构 structured details                                                          | Timeline receipt继续归 canonical Product owner                                       |
| dependencies            | runtime dependencies = 0                                                                                     | 不重新引入 `supi-core`、TUI 或完整 lifecycle package                                 |
| registration/activation | bundled OmniMind Agent only；compatible presenter + unique product provenance双门；stock Pi/AgentGateway均无 | 后续更新不得增加第二 Tool、Setting或activation control plane                         |
| tests                   | upstream 9/152 baseline；feasibility fork 5/61；current fork 6/71；55 preserve/adapt、9 reverse、88 delete   | fork新增测试保护OmniMind Tool/schema/result；不能用71替代作者152                     |

Feasibility GO 的 stop-loss 依据、行级保留比例和完整 module disposition 只看 [`omnimind-ask-user-cognition.md`](omnimind-ask-user-cognition.md) §13.1；本文把它转成未来 update gate，不建立第二 source decision。

## 1. 适用范围与触发条件

### 1.1 必须运行本文的变化

- `@mrclrchtr/supi-ask-user` 新 npm version、tag、commit 或 release，包括未发布 main 上的 runtime/schema/controller 变化；
- 上游 repository/package ownership、license、provenance 或发布 workflow 改变；
- 维护者考虑换用 supi 的另一 branch/fork，或 `supi-core` 依赖/打包形状变化；
- 已采用或已固定的 donor `@geoqiao/pi-ask` / `eko24ive/pi-ask` ancestry、`@pi9/ask`、`pi-ask-user`、`@qmahyar/pi-ask`、`pi-tian-ask-user` 出现值得吸收的 UX/lifecycle/test 机制；
- Pi Core 改变 Extension API、tool execution mode、batch scheduling、`ctx.ui`、RPC、sourceInfo、reload、Session replacement 或 context storage；
- OmniMind canonical User Input contract、Workbench Question UI、Product State pending lifecycle 或 Agent composition 改变；
- 安全事件、依赖漏洞、supply-chain 异常或作者测试重大删除；
- P1–P7 中任一 patch 出现持续冲突或需要新增 P8；
- 维护者主动要求重新搜索更成熟的 Ask User 生态。

### 1.2 不需要把所有普通工作变成 source intake

以下既有 owner 内、解释唯一且不改变上游 source decision 的普通修复，不必重跑完整生态搜索：

- Composer Question 的明确 a11y / CSS bug；
- 中英文 catalog 漏项；
- 已锁定 contract 下的局部 serialization bug；
- 现有 test fixture 修正；
- 不改变 public contract、owner、lifecycle 或发行物的内部整理。

但若修复暴露出上游机制理解错误、需要新增长期 patch、改变用户语义或触碰安全边界，就升级为本文 intake。

### 1.3 不适用范围

- Todo Extension：看其独立 research owner；
- Web Access：看 [`pi-web-access-intake.md`](pi-web-access-intake.md)；
- Synara exact source：只走根 `SYNARA-INTAKE.md`，不能叠两次 Gate；
- 普通 Provider native Question adapter：由其 Provider/runtime owner 处理，除非它改变 canonical Ask UI contract；
- Approval：独立语义 owner，不得借 Ask intake 合并。

## 2. Standing defaults：未来默认吸收什么，默认拒绝什么

### 2.1 默认积极吸收

在 exact source、权利、owner 与验证闭合后，优先吸收：

- 多问题、Review、Preview、recommendation、freeform 的成熟 UX 改进；
- keyboard、screen reader、IME、responsive、overflow、Markdown safety 修复；
- abort、cancel、timeout、late-answer、listener cleanup、idempotent settlement 修复；
- 更强的作者 regression tests、property tests、fuzz tests；
- 更好的 headless / Host projection seam；
- 能删除 OmniMind patch 的 upstream 功能；
- 不新增 owner 的性能改善；
- security 与 dependency hygiene 修复；
- 上游对 schema/provider compatibility 的真实修复。

“默认积极”表示 Gate A 的推荐倾向，不表示静默写入或跳过维护者 decision surface。

### 2.2 默认拒绝或改造成 product profile

- 人为题目/选项数量上限；
- 可关闭 freeform 或依赖 LLM author `自定义` sentinel；
- single/multi/preview 混成互斥 type；
- schema 接受但 TUI/RPC/Host 丢弃字段；
- Ask 替代 Approval 或从选择推断权限；
- 未解决 Ask 时并行执行兄弟副作用；
- 重启后用新 user message 伪造原 Tool Promise continuation；
- tool name 即 provenance；
- no UI 时“use best judgement”；
- process-global active request、timer、listener 或一个 Thread 清理另一个 Thread；
- 新 settings/config database、slash commands、skill、notifications、remote bus、TUI widget；
- AgentGateway/cross-engine 分发 `@omnimind/om-ask`；
- 自动追 `latest` 或运行时下载上游代码。

### 2.3 需要维护者重新裁决

- 新能力会改变 canonical contract 或 UI decision surface；
- 新 owner、state、migration、public abstraction、control plane；
- package/license/maintainer/registry 变更；
- 新 direct dependency 承担 parser/security/protocol/state-machine 责任；
- 上游移除核心成熟能力或大量作者 tests；
- upstream 提供原生 Host UI，可能替代 P3/P4；
- Pi Core 原生 sibling barrier，可能删除 P5；
- fork divergence 已大到考虑换母体；
- stock Pi support、跨 Engine tool distribution 或独立用户安装成为新目标。

## 3. Gate U0：工作区、权威与当前产品事实

开始任何写入前：

1. 确认精确 workspace、branch、HEAD 与 `git status --short`；
2. 保留用户未知修改，不覆盖 dirty paths；
3. 按根 `AGENTS.md` 必读顺序读取：README → `PI-ECOSYSTEM-INTAKE.md` → architecture owners → execution brief → active mission → relevant research；
4. 完整读取本文件与 [`omnimind-ask-user-cognition.md`](omnimind-ask-user-cognition.md)；
5. 沿真实调用链重新确认“已存在 / 部分存在 / 缺失”；
6. 确认当前 adopted upstream base 与 fork commit，不能照抄本文初始 baseline；
7. 定义一个能推翻升级结论的可观察成功条件；
8. Gate A 期间不修改 production code、依赖、lockfile、配置、默认 active set 或发行物。

若 research cognition、architecture 与 production source 对同一事实冲突，先修唯一 owner；不能在授权范围修复时停止，不按更新时间选边。

### U0 记录模板

```md
## Intake run identity

- date:
- operator:
- workspace:
- branch / HEAD:
- dirty paths preserved:
- current fork commit:
- current upstream base:
- bundled Pi exact version/source:
- product status before intake:
- falsifiable success condition:
```

## 4. Gate U1：固定 exact source、artifact 与权利

### 4.1 必须记录

| 字段                               | 证据                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------- |
| package name/version               | npm registry exact version metadata                                         |
| repository + package path          | package metadata + source tree                                              |
| exact commit                       | npm `gitHead` 或 SLSA provenance；无则必须说明 source/artifact 不能直接绑定 |
| tarball URL                        | registry exact tarball，不用 `latest` alias                                 |
| integrity / shasum                 | registry metadata                                                           |
| downloaded SHA-256                 | 本地只读 artifact hash                                                      |
| license                            | exact source 与 artifact 中法定文件                                         |
| author/maintainer                  | package/repository metadata；不能只看用户名猜身份                           |
| provenance                         | npm provenance / workflow / signing facts                                   |
| publish time                       | exact version time                                                          |
| files / unpacked size              | artifact inventory                                                          |
| direct/peer/optional deps          | exact manifest 与 lock evidence                                             |
| scripts / binaries / install hooks | exact manifest                                                              |
| tests shipped/source-only          | source/artifact 分开记录                                                    |

### 4.2 Source/artifact 无法绑定时

不得挑一个看似接近的 GitHub HEAD 当 published source。Disposition 只能是：

- 找到可证 exact source；
- 将 artifact 作为独立 source type 审查；
- 或 `defer / reject due to unverifiable provenance`。

### 4.3 权利检查

- LICENSE 是否允许 fork、修改、再分发；
- NOTICE / attribution / third-party licenses 是否完整；
- donor copied-adapted 片段是否保留 exact 来源；
- 新 demo/assets 是否有独立再分发权；
- repository license 与 npm artifact 是否一致；
- 上游更名/转移后 ancestry 是否仍可追溯。

## 5. Gate U2：结构化 diff，而不是只读 CHANGELOG

从当前 adopted base 到候选 exact source，至少按以下维度分类：

| Surface      | 必查内容                                   | 典型风险                                            |
| ------------ | ------------------------------------------ | --------------------------------------------------- |
| tool schema  | questions/options/types/required/freeform  | 人为 cap、字段假支持、provider incompatibility      |
| prompt       | usage guidance、examples                   | 1–3 题限制、模型 author sentinel、Ask/Approval 混淆 |
| domain state | selections/drafts/upstream notes/review    | 上游 note 仅作反证面；OmniMind 明确拒绝并删除       |
| result       | serialization/context rewrite              | 未选项污染、字段丢失、历史错改                      |
| UI           | TUI custom component、responsive、keyboard | 不能直接替代 Host UI，但可提供行为与 test donor     |
| RPC/headless | request/response/capability fallback       | silent downgrade、signal 缺失、one-scalar collapse  |
| lifecycle    | executionMode、signal、timeout、settlement | sibling side effect、double resolve、late answer    |
| recovery     | replay/restart/session hooks               | 伪造 vanished promise、跨 Thread cleanup            |
| registration | commands/skills/settings/listeners         | 第二入口、ambient writer/control plane              |
| dependencies | direct/transitive/peer                     | supply-chain、bundle、license、runtime mismatch     |
| packaging    | exports/files/assets/build                 | source retained ≠ shipped ≠ activated               |
| tests        | additions/deletions/coverage intent        | 作者保护网退化或只测 happy path                     |

### 5.1 每个 diff hunk 的 disposition

| Disposition | 定义 |
| `adopt directly` | 与 OmniMind product/owner 等价，可保留上游实现与测试 |
| `adapt` | 用户价值应吸收，但需经 P1–P7 某个 seam 映射到 canonical owner |
| `donor only` | 只吸收机制/测试思想，不引入上游 runtime/lifecycle |
| `reject` | 与 taste、安全或唯一 owner 冲突 |
| `defer` | 有潜在价值但证据、权利或当前 consumer 不足 |

不能用一个包级“采用/不采用”掩盖内部不同 disposition。

### 5.2 Changelog 只能导航

必须核源码与测试，因为 changelog 常遗漏：

- 默认值改变；
- timer/listener 增加；
- package exports 或 install hook；
- prompt 文案限制；
- RPC fallback 丢字段；
- 作者 test 删除；
- type/schema 与 runtime 不一致。

## 6. Gate U3：先证明上游自己，再谈 OmniMind

### 6.1 作者测试基线

- 在 exact source 的原生 package 环境运行作者完整测试；
- 记录 test file / case 数、耗时、跳过项与失败；
- 不修改测试来“适应 OmniMind”后仍称 author baseline；
- 对删除/重写的测试逐项解释保护语义是否消失；
- 如果 npm artifact 不含 tests，从 exact source 运行并记录对应关系。

### 6.2 上游真实 journey

在隔离环境观察其原生 journey，目的是理解行为冰山，不是把 TUI 当产品 UI：

- 多题导航；
- single/multiple/freeform；
- question/option notes（上游事实；OmniMind 产品差异明确删除，更新时不得重引入）；
- preview/recommendation；
- Review/edit/submit/cancel；
- signal/timeout/no UI；
- RPC/remote/recovery；
- session shutdown/reload；
- commands/settings/listeners/timers/writers。

记录“用户可见行为”和“维持它的隐藏 lifecycle”两层证据。

### 6.3 最强反证

Gate A 必须主动寻找至少一条会推翻更新建议的事实，例如：

- 新版 UI 更漂亮，但 multi + freeform serialization 退化；
- 新增 recovery，但伪造 promise continuation；
- 新增 headless RPC，但 Preview/Review silent loss；
- 新 tests 多了，但 sequential 被移除；
- dependency 简化，但 ancestry/license 断裂。

没有主动找反证的 intake 不算深度 review。

## 7. Gate U4：逐一重放 P1–P7

### P1 — Identity & product profile

检查：

- fork package identity 与 upstream base；
- bundled-only registration；
- TUI/commands/skills/settings/config/notifications/remote/recovery 是否重新激活；
- ambient listener/timer/writer 是否为零；
- source retained / shipped / activated matrix。

### P2 — Canonical contract & freedom invariants

检查：

- 是否出现 question/option cap；
- choice sentinel 是否仍由 Host 合成，且简中精确显示单选 `自定义` / `输入自己的答案`、多选 `自定义` / `补充自己的答案`；
- canonical selection、`customText` 是否两个独立字段；
- single replacement、multi coexistence、customText losslessness；
- single preset 自动进入 next/review、custom/multi 显式前进是否严格由 Product state owner 控制；
- selection cardinality 与 Preview presentation 是否正交；
- recommendation 是否仅作展示，绝不预选 choice 或预填成 text answer；
- `required` 是否真的 enforce；
- new fields 是否全链兑现；
- abnormal payload guard 是否变成产品限制。

### P3 — Structured Host seam

检查：

- rich request/answer/status 是否无损穿过 Pi → canonical event → UI → settlement；
- abort signal 是否进入 Host path；
- RPC/primitive fallback 是否被错误用于 product Ask；
- capability unavailable 是否 fail closed；
- request identity 与 opaque attempt/fence token 是否稳定，token 是否被错误暴露为模型可写字段。

### P4 — Canonical Workbench projection

检查：

- 新上游 UX 是否应映射到 shared UI；
- Codex/Claude/其他 Provider 是否也能受益或至少不退化；
- Composer 是否出现第二私有 Ask panel；
- Review、Preview、recommendation、sentinel、Cancel；
- custom 输入是否在 sentinel row 内原地展开并 autofocus，自由回答是否在 Question card 内编辑，主 Composer 是否保持非 answer owner；
- 默认是否只显示当前问题，Preview/Review 是否按显式请求或当前状态渐进出现；
- keyboard/IME/a11y/reduced motion/overflow；
- zh-CN/en catalog；
- TUI tests 中可移植的行为是否转成 Host tests。

P4 是 OmniMind 长期 owner，不能因为上游 TUI 重写就直接删除。

### P5 — Lifecycle & side-effect barrier

检查：

- `executionMode: sequential`；
- exact Pi same-turn scheduler 是否 Ask-first，Ask 前后未执行 siblings 是否作废，submitted 后是否强制新 continuation；
- submit/cancel/abort/explicit-timeout/ui unavailable/stale terminal；validation rejection 是否与用户 terminal 分离；
- late/double answer fencing；
- restart 不伪造 promise；
- two Threads 隔离；
- timers 由谁拥有、是否清理。

### P6 — Truthful result & context

检查：

- 只把 selected decisions 与 exact customText 给模型；
- unknown/unselected alternatives 不冒充答案；
- selected-only rewrite 是否精确定位 product-owned call；
- Provider serialization 是否保留 IDs 与原文；
- rewrite 失败是否 fail closed；
- token 优化没有创建第二 history owner。

### P7 — Provenance, collision & reload

检查：

- Pi Registry winner/sourceInfo；
- Product projection exact instance token；
- third-party same-name winner 不获产品 authority；
- reload / branch / resume / Session replacement 清理；
- old fence-token submission stale；
- conflict diagnostic 不让整个 Session fatal。

### 7.1 Patch disposition table

每轮填：

| Patch | upstream change | keep / rewrite / delete | reason | tests | new responsibility |
| ----- | --------------- | ----------------------- | ------ | ----- | ------------------ |
| P1    |                 |                         |        |       |                    |
| P2    |                 |                         |        |       |                    |
| P3    |                 |                         |        |       |                    |
| P4    |                 |                         |        |       |                    |
| P5    |                 |                         |        |       |                    |
| P6    |                 |                         |        |       |                    |
| P7    |                 |                         |        |       |                    |

若需要 P8，Gate A 报告必须单列：上游原行为、精确缺口、为何 P1–P7 无法承担、全链影响、长期成本、回滚方式。维护者未确认前停止施工。

## 8. Gate U5：Owner 与 lifecycle iceberg audit

### 8.1 三层矩阵

每个 upstream module/feature 必须区分：

| Feature                | source retained | shipped bytes | runtime activated | owner                     |
| ---------------------- | --------------- | ------------- | ----------------- | ------------------------- |
| core domain/validation |                 |               |                   | fork                      |
| author tests           |                 | n/a           | n/a               | source maintenance        |
| TUI component          |                 |               |                   | upstream-only / disabled  |
| slash commands         |                 |               |                   | disabled                  |
| settings/config        |                 |               |                   | disabled                  |
| notifications          |                 |               |                   | disabled                  |
| remote/RPC             |                 |               |                   | structured Host seam only |
| recovery/replay        |                 |               |                   | Product stale semantics   |
| tool definition        |                 |               |                   | fork/Pi Registry          |
| Workbench UI           | n/a             | OmniMind      | OmniMind          | canonical Workbench       |

“没有入口按钮”不能证明 runtime inactive；必须检查 imports、registration、event listener、timer、filesystem writer、network channel 与 process singleton。

### 8.2 禁止出现的 lone wolf

任何单一 adapter/module 不得同时拥有：

- tool definition；
- model prompt；
- Session registration；
- pending Product State；
- UI component；
- result authority；
- restart recovery。

发现这种形状，先把责任归还既有 owner，再谈升级。

### 8.3 依赖变化

对每个新增 dependency 记录：

- 它解决什么成熟正确性；
- 是否进入 shipped bytes；
- license/provenance/maintenance；
- bundle 与 cold-start 影响；
- 是否带 install scripts/native binary/network；
- 能否由本地小型 copied-adapted 机制替代；
- 若是 parser/security/protocol/state machine，为何应保留成熟依赖承担责任。

不能因为“零依赖好看”重写成熟 parser，也不能为一个小 helper 无脑引入完整 lifecycle package。

## 9. Gate U6：Focused proof matrix

候选冻结在同一 SHA 后，运行最窄但完整的 falsifiers。

### 9.1 Author + fork tests

- 作者完整 tests；
- P1–P7 fork tests；
- contract typecheck / schema fixtures；
- packaging/export/import smoke；
- no forbidden registration snapshot；
- dependency/license audit。

### 9.2 Contract/product fixtures

- one/many questions；
- reasonable large question/option sets，无 cap；
- single/multiple/text；
- preview + multiple；
- recommendation；
- sentinel duplicate/absence；
- single freeform replacement；
- multi preset + freeform；
- canonical selected labels/values 与 customText exact roundtrip；
- duplicate labels/stable IDs；
- required/optional/skip；
- Unicode/newlines/whitespace；
- malformed/oversized/deep/unsafe Markdown。

### 9.3 Lifecycle fixtures

- ask only；
- read sibling 在 ask 前 / 后的 batch；
- side-effect sibling 在 ask 前 / 后的 batch；两者都必须未执行；
- submitted 后原 batch 终止、新 continuation 基于答案重规划；
- cancel/abort/timeout/noUI；
- late/double/forged resolution；
- restart stale；
- reload/branch/resume/replacement；
- same-name winner/loser；
- two Threads concurrent；
- listener/timer disposal。

### 9.4 UI fixtures

- no single-select auto-submit；
- explicit Next / Review / Submit；
- draft across navigation/review/edit；
- single preset→next/review、preset→custom 与 multi preset/custom coexistence state；
- custom row inline autofocus、free-text in-card 与 Composer non-ownership；
- scoped numeric shortcuts、input digits、radio/checkbox/aria-checked/focus/announcement；
- Preview sanitization；
- background attention/no focus steal；
- 480px/desktop/stress/200% zoom；
- keyboard/VoiceOver/IME/reduced motion；
- zh-CN/en actual catalog values；
- existing Codex/Claude/OpenCode/Grok/ACP journeys。

局部绿色只能支持其覆盖结论，不能扩写成“Ask User production ready”。

## 10. Gate U7：真实 Provider 与 packaged App

### 10.1 Live provider

在 focused fixture 建立可诊断基线后，使用授权清单中的匹配资源做最少 live requests。优先：

- Xiaomi MiMo；
- DeepSeek；
- 必要时区分直连、OpenAI-compatible endpoint 与代理转换。

至少证明：

- schema 被 Provider 接受；
- 模型在真实不确定性下会调用；
- 不 author sentinel，或重复时 Host 正确处理；
- batch questions 合理；
- 简单任务不强制问；
- Ask 后基于答案 continuation；
- Ask 不替代 Approval；
- abort/timeout 的 wire 与产品状态一致。

证据只记录脱敏协议/能力、数值与 pass/fail；不记录 key、endpoint、账号、原始响应或可关联 ID。

### 10.2 Packaged journey

任何改变用户可观察行为的 update 都必须：

1. push exact candidate SHA；
2. 从该 SHA rebuild；
3. 安装/替换本机 OmniMind App；
4. 停止所有既有 OmniMind 实例；
5. 用任务专用 `userData`、home、Provider private home 启动；
6. 从进程参数/运行证据核验隔离；
7. 完成 launch → ask → preview/review → submit → continuation；
8. 验证 background Thread、cancel/abort、close/reopen stale/re-ask；
9. 正常关闭并清理任务专用进程；
10. 不触碰真实用户 `.pi` / `.omnimind`。

源码、unit test、HMR、dev Electron 或 isolated Server 通过都不能替代这一门。

## 11. Gate U8：Adoption、文档与状态闭合

### 11.1 同一关注点必须一起闭合

一次真正 adoption/update 至少同步：

- fork code / dependency / lockfile；
- exact upstream base 与 fork revision；
- license/attribution；
- P1–P7 patch table；
- cognition 文档中 source/status 的必要更新；
- 本 Intake baseline block；
- `research/README.md` 路由；
- execution brief 当前工作状态；
- active Campaign evidence pointer（若适用）；
- 根 README source-adoption（只有 production adoption 事实成立时）；
- focused/live/packaged evidence pointer。

不能 push “代码已采用、research 仍写 pending”或“文档宣布 production、package 尚未进入 build”的自相矛盾状态。

### 11.2 状态词

统一使用：

- `researched`：只读研究完成；
- `decision-complete`：维护者确认当次 decision surface；
- `local-source-candidate`：本地代码/tests，未 push；
- `pushed-source-candidate`：source 已 push，未 packaged；
- `packaged-candidate`：exact SHA build/install journey 通过，未 Release；
- `released`：正式 release/update authority 完成。

禁止使用含糊的“已完成 / 已接入 / 支持”跨越证据等级。

### 11.3 Commit/push

- 一个 commit 一个闭合关注点；
- 只 stage 当前任务路径；
- 不覆盖用户未知修改；
- 不 force-push protected branch；
- push candidate branch 不等于 Release；
- intake 纯文档更新不触发不必要 packaged build，但产品行为改动必须继续交付链。

## 12. 维护者 decision memo 模板

每轮 Gate A 最终报告按以下结构，方便管理者快速裁决：

```md
# Ask User upstream intake decision — <date>

## Outcome first

- recommendation:
- user-visible gain:
- strongest reason to reject:
- maintenance delta:
- requested maintainer decision:

## Exact identity

- current adopted upstream:
- candidate upstream:
- artifact integrity/provenance:
- license/dependency delta:

## What actually changed

| area | user result | hidden lifecycle | disposition |

## P1–P7

| patch | keep/rewrite/delete | evidence | risk |

## Owner and activation delta

- new owner/state/listener/timer/writer:
- source/shipped/activated delta:

## Falsifiers

- author tests:
- focused tests:
- live required:
- packaged required:

## Rollback

- exact rollback unit:
- persistent data impact:

## Status

- research only / source candidate / packaged candidate / released
```

报告必须说清“最强反证”和“采用的代价”，不能只列功能清单或 Git diff 行数。

## 13. Stop-loss、回滚与升级失败

### 13.1 立即停止 Gate B

- exact artifact/source 无法绑定；
- LICENSE/ownership/provenance 不清；
- 需要读写真实用户 private home；
- production owner 冲突且无法在当前授权内修复；
- 新 dependency 有 install hook/native binary/网络行为但未审计；
- author tests 无法建立 baseline 且无可解释原因；
- P1–P7 无法容纳新增长期责任；
- same-turn side-effect barrier 或 restart stale 无法证明；
- UI/contract 对新字段会 silent loss；
- 需要发布、权限扩张、高费用或不可逆动作但未获授权。

### 13.2 回滚单位

升级的最小回滚单位应是：

- fork revision 回到上一 adopted commit；
- OmniMind composition 仍只有一个 `@omnimind/om-ask` factory；
- canonical UI/store 不回滚到另一套系统；
- 新 pending interactions 按 unavailable/stale 收口；
- 无 Ask 独立数据库迁移；
- lockfile/dependency 只回滚本次相关闭包。

### 13.3 不把失败写成兼容逻辑

某个 live Provider 一次鉴权失败、代理异常、模型没调用或上游 test flaky，先归因；不得把偶然失败写成静态 Provider blacklist、schema downgrade、自动重试 daemon 或通用补偿逻辑。

## 14. 周期性维护检查表

不自动轮询 upstream；维护者触发 intake 时检查：

- [ ] current fork/base block 已更新，不是最初 `5.0.0` 的陈旧事实
- [ ] exact npm/git/provenance/license/dependency 已固定
- [ ] upstream changelog 只作导航，源码与 tests 已 diff
- [ ] 作者完整 tests 已跑，删除项已解释
- [ ] 最强反证已记录
- [ ] 每个变化有五类 disposition
- [ ] P1–P7 逐项重放
- [ ] 没有新增未裁决 P8
- [ ] source / shipped / activated 三层清楚
- [ ] 没有 TUI/commands/settings/config/remote/recovery ambient owner
- [ ] sentinel、freeform、review、preview 无损
- [ ] 无题目/选项产品 cap
- [ ] Ask/Approval 分离
- [ ] sequential + same-turn barrier 有 exact runtime 证据
- [ ] terminal/late/noUI/restart/provenance 有证据
- [ ] canonical shared UI 与 cross-provider regressions 通过
- [ ] MiMo / DeepSeek live 按风险完成
- [ ] exact pushed SHA packaged fresh-profile journey 完成
- [ ] cognition/intake/index/execution/adoption 状态一致
- [ ] 回滚可在一个 fork revision/composition seam 完成

## 15. 当前开放事项

fork placement、canonical contract、typed settlement、Host bridge、presenter lease、Pi barrier、same-name provenance、restart stale、quiet Composer projection和最终Tool activation已在 source层闭合。以下只剩 production proof，不能被 source绿色冒充关闭：

- Xiaomi MiMo与DeepSeek各一次真实 `ask_user` schema call、Composer answer、structured Tool result和模型 replan；
- 真实 Provider对 `oneOf` schema、multiple/custom与不确定性调用行为的兼容证据；
- exact pushed SHA clean-clone DMG、SBOM/LICENSE、fork与Pi core patch进入shipped bytes的扫描；
- fresh task-only `userData`、home与Provider private home下的single/multi/custom/Preview/Review/Cancel；
- pending中Stop Turn、最后presenter消失、Server终止/reopen stale、同名Extension collision、headless no-tool与零残留进程；
- Desktop/mobile几何、keyboard/VoiceOver/IME等最终运行态证据；
- 正式Release/update authority（不由普通Gate B source integration自动获得）。

这些是待验证，不是产品应被限制的理由。任何 live/package失败都先归因；不得降级canonical合同、恢复普通文本 fallback或把失败渠道写成静态Provider blacklist。

## 16. 零记忆机器摘要

```yaml
manual: pi-ask-user-intake
purpose: future_exact_upstream_update_and_patch_rebase
product_truth: research/omnimind-ask-user-cognition.md
general_gate_authority: PI-ECOSYSTEM-INTAKE.md
conditional_runtime_lineage:
  package: "@mrclrchtr/supi-ask-user@5.0.0"
  commit: ce8af5f57304ad114319aa75c00920f029ceb8e7
  evidence: exact_source_matched_subtractive_lineage_adopted
  direct_install: forbidden
  fork_shape: subtractive_not_narrow
primary_donor:
  package: "@geoqiao/pi-ask@1.3.0"
  commit: 26496c809870e349429bc2cae72d61b46d0e2bc3
  ancestry: eko24ive/pi-ask
bounded_donors:
  lifecycle: "@pi9/ask@0.4.2"
  compatibility: "pi-ask-user@0.14.0"
  correctness_tests: "@qmahyar/pi-ask@1.4.0"
  sentinel: "pi-tian-ask-user@1.0.0"
current_fork:
  package: "@omnimind/om-ask@5.0.0-omnimind.1"
  feasibility_commit: a96c60256bd6e391af57f4d2994b4a12d32aa6a5
  activation_commit: 36e3bec7e789122c731028c1a8b791a68a6c1fea
  status: source_integrated_packaged_and_live_pending
  feasibility: go
  tests: 71
  runtime_dependencies: 0
  registered: presenter_and_provenance_gated_omnimind_agent_only
  model_exposed: true_only_when_registered
  canonical_contract_connected: true
  composer_projection_connected: true
  fork_shipped: pending_exact_packaged_scan
  canonical_ui_installed_candidate: true
pi_barrier:
  package: "@earendil-works/pi-agent-core@0.84.2"
  patch_sha256: c63f6877299935fd9ee85c05b81d9e3f571f640704ff85a7f8e03209620e8e78
  delete_when: upstream_provides_equivalent_preflight_barrier
update_policy:
  mode: manual_exact-source
  latest_tracking: forbidden
  preserve: [ancestry, license, author_tests, mature_behavior]
  prefer: [ux_improvements, lifecycle_fixes, test_strengthening, patch_deletion]
  reject:
    [
      arbitrary_caps,
      freeform_disable,
      fake_fields,
      ask_as_approval,
      sibling_side_effects,
      fake_restart_recovery,
      name-only_provenance,
      no-ui_guessing,
      second_control_plane,
    ]
gates:
  - U0_workspace_authority
  - U1_exact_source_artifact_rights
  - U2_structured_diff
  - U3_author_baseline_and_counterevidence
  - U4_rebase_P1_to_P7
  - U5_owner_and_lifecycle_iceberg
  - U6_focused_proof
  - U7_live_and_packaged
  - U8_adoption_state_closure
dispositions: [adopt_directly, adapt, donor_only, reject, defer]
stop_loss:
  - unverifiable_source_or_rights
  - unresolved_owner_conflict
  - new_patch_outside_P1_to_P7_without_maintainer_decision
  - silent_contract_or_ui_loss
  - unproven_side-effect_or_restart_safety
  - retained_runtime_kernel_no_longer_maps_to_upstream_modules_and_tests
  - repeated_conflict_in_the_same_contract_or_composition_seam
rollback: one_fork_revision_plus_one_composition_factory
```
