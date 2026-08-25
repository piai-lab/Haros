# OmniMind Ask User：一级公民、运行时母体与长期维护认知

> Gate A 重审 / Gate B fork feasibility 日期：2026-08-25
>
> 状态：`source-matched / Gate-B-feasibility-GO / pushed-source-candidate / not-registered / not-adopted`
>
> 当前裁决不是“安装某个 npm 包”，而是：**无候选可原装采用；`@mrclrchtr/supi-ask-user@5.0.0` 的 exact-source lineage 已通过减法 fork 可行性门，`@geoqiao/pi-ask@1.3.0` 连同 `eko24ive/pi-ask` 历史仍是首要 UX/test donor。该 GO 只证明母体值得继续，不代表 Tool、schema、UI 或产品接入获准。**
>
> Gate A exact runtime candidate：[`mrclrchtr/supi@ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user`](https://github.com/mrclrchtr/supi/tree/ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user)
>
> 首要 UX/test donor：[`geoqiao/pi-tools@26496c809870e349429bc2cae72d61b46d0e2bc3/packages/pi-ask`](https://github.com/geoqiao/pi-tools/tree/26496c809870e349429bc2cae72d61b46d0e2bc3/packages/pi-ask)
>
> 未来更新程序：[`pi-ask-user-intake.md`](pi-ask-user-intake.md)

本文是 Ask User 的 package-specific 研究与 source decision owner。稳定产品合同仍由 `architecture/` 拥有，施工准入仍由根 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) 与维护者 Gate B 决定。当前仓库只有 [`packages/om-ask`](../packages/om-ask) 的未注册、Host-neutral feasibility kernel；本文不表示 `ask_user` 已注册、模型已能调用、canonical schema 已公开、Composer 已接线、App 已打包或产品已发布。

## 0. 先给结论

### 0.1 一句话裁决

OmniMind 应把 `ask_user` 做成与 Todo 同等级的 bundled Pi-native Session Extension 和跨 Engine canonical User Input 能力；Composer Question UI 独立拥有全部展示。现阶段没有一个第三方包可以原装成为产品 runtime。`supi-ask-user@5.0.0` 仅因其 **stable question ID / option value、choice/text 正交 domain、structured result、controller terminal state、one-form lock、sequential、Abort/Cancel 与 no-UI throw** 在运行时骨架上领先；本轮减法切片进一步证明，删掉 TUI 与 ambient lifecycle 后，真正可继承的是 domain/controller/normalize 核心，而不是它的完整 Pi/TUI runtime。

### 0.2 旧结论如何被降级

“优先 fork `@mrclrchtr/supi-ask-user@5.0.0`”不再是既定事实，而是本轮重新证明后的条件性结论：

- 不是 direct dependency 结论；
- 不是“upstream 很成熟”的背书；
- 不是“几处窄 patch 就能产品化”；
- 不是未来自动追 `latest` 的授权；
- 不是完整 Gate B 产品接入授权；已获授权并完成的只有 fork feasibility slice；
- 若下文 stop-loss 被触发，必须重新选型，而不是为保住旧判断继续堆 adapter。

### 0.3 最重要的反直觉

候选的 TUI 功能越厚，对本轮母体选择的加分越接近零。OmniMind 已有 canonical Composer Question projection；第三方 TUI 只能作为交互行为与测试 donor。真正决定母体的是：它是否提供一套可保留、可测、可切掉 presentation 的运行时状态机，而不是能否在终端里画出一个完整问卷。

### 0.4 最终分工

| 职责 | 当前裁决 | 为什么 |
|---|---|---|
| Product/contract owner | OmniMind canonical User Input | 跨 Codex、Claude、Pi 与未来 Engine，共用一种产品语义 |
| UI owner | Composer Question / Workbench | 第三方 TUI 不得定义能力上限或建立第二 UI |
| Pi runtime fork lineage | 条件性选择 `supi-ask-user@5.0.0` exact source | runtime/domain 骨架最接近硬门；必须减法式 fork |
| UX/test donor | `@geoqiao/pi-ask@1.3.0` + `eko24ive/pi-ask` ancestry | 最完整的 stable ID/value、freeform、notes、Review 与响应式行为测试 |
| lifecycle donor | `@pi9/ask@0.4.2` | 无 UI 时从 active tools 移除、deadline、selected-only context、172 项测试 |
| compatibility donor | `pi-ask-user@0.14.0` | 最长公开使用史、最多下载/社区 issue、Provider-friendly flat schema、signal/sequential |
| correctness/test donor | `@qmahyar/pi-ask@1.4.0` | 证明 supi 的 shutdown/late/dispose 缺口可修，并提供 362 项测试；自身过新，不能冒充成熟母体 |
| sentinel donor | `pi-tian-ask-user@1.0.0` | 拒绝模型重复 author “Other”的测试思路 |
| 直接安装 | 全部拒绝 | 没有候选通过完整运行时硬门，也都会造成双 UI 或双 lifecycle |

## 1. 产品本质与维护者 taste

Ask User 不是“弹一个问题”。它是 Agent 在信息不足、存在多条合理路线或必须取得用户偏好时，暂停自主执行、交还决策权、等待真实回答，再基于回答重新规划的认知刹车。

它成为一级公民意味着：

- 由 Session runtime 正式注册并参与模型 tool surface，而不是靠 prompt 提醒模型发普通文本；
- 有 canonical request/result contract、状态、取消、恢复和 provenance；
- 由统一 Composer Question UI 投影，不按 Provider 或 package 分裂；
- Timeline 能解释“为什么暂停、用户回答了什么、为什么继续”；
- Settings 只消费 owner 的窄投影，不接管 package 内部状态；
- 能整体替换或退休，不把 package 私有 store、命令和配置扩散到产品。

维护者 taste 是硬约束：

1. 成熟、好用优先于包小、diff 小或本次施工省事。
2. 当前代码/UI/Provider 不是产品能力天花板。
3. 不人为限制题目数或选项数；只允许异常 payload 的性能/安全 guard。
4. 每道选择题由 Host 合成固定最后一项“其他 / 自行输入……”，不依赖 LLM author sentinel。
5. 单选自由文本可以完全替代预设项；多选自由文本可与已选预设项共存。
6. 选择预设项后仍能补充说明；自由文本与补充说明原样、无损返回模型。
7. Preview、Notes、Review、推荐项等一旦进入 schema，就必须 UI 与结果链真实兑现。
8. Ask 与 Approval 分离；无 UI fail closed；Abort/Cancel/late answer、重启与同名 provenance 必须诚实。

## 2. OmniMind 不是从零开始

### 2.1 已存在

- Composer 已有 Question UI projection 起点；
- canonical `user-input.requested` / `user-input.resolved` 事件链已存在；
- Workbench 已经是跨 Engine 的用户可见 UI owner；
- Pi runtime 已物理固定在 `0.84.2`，并支持 Session Extension、Tool provenance 与 per-tool `executionMode`；
- Todo 已证明 bundled Pi-native first-class capability 的 owner 模式。

### 2.2 部分存在但不能冒充完成

- Composer Question 当前形状不等于未来合同上限；
- RPC/primitive UI fallback 不等于 structured Host seam；
- Tool 名叫 `ask_user` 不等于产品 Ask 已交付；
- `executionMode: "sequential"` 不等于同轮副作用屏障；
- session 中有冲突诊断不等于 provenance 已 fail closed；
- 能在重启后重新显示问题不等于原 Tool Promise 被恢复。

### 2.3 真正缺失

- 唯一 bundled `ask_user` Extension；
- canonical schema/result 与 Composer Question 的完整无损映射；
- Ask-first、同批终止、answer-after-replan；
- Host request correlation、Abort/Cancel/late-answer fencing；
- exact source provenance assertion；
- restart stale 语义；
- product-owned limits、i18n、telemetry 与 packaged journey。

## 3. Gate A 方法：什么算证据

### 3.1 证据等级

| 等级 | 可证明什么 | 不能证明什么 |
|---|---|---|
| exact source/artifact | 实际 schema、代码、依赖、许可证、hash、发布内容 | 用户 journey 成熟 |
| 作者测试 | 作者已意识到并保护的行为 | OmniMind Host 路径和真实 Session |
| 真实 Pi 0.84.2 Session | 注册、active set、provenance、no-UI、batch 顺序 | 未实现的 Composer bridge |
| issue/release history | 维护反应、真实 bug、发布稳定性 | 任一 bug 已在目标版本修复 |
| stars/downloads | 发现优先级与使用信号 | 正确性、安全或兼容性 |
| README/demo/TUI | 作者意图和 UX donor 线索 | runtime hard gate |

### 3.2 本轮实际做了什么

- 固定 npm artifact、integrity、tarball SHA-256、Git commit、repository 与 license；
- 读取候选实际 schema、controller、Extension hooks、result 与测试；
- 对能绑定公开 commit 的候选运行 exact source 作者测试；无法从公开 history 取回 npm `gitHead` 的候选明确降级证据，不拿邻近 snapshot 冒充 artifact exact；
- 使用 OmniMind 当前 stock Pi `0.84.2` 创建真实 `DefaultResourceLoader` + `AgentSession`；
- 验证 tool 注册、active set、sourceInfo、无 UI 调用、同名 collision；
- 使用真实 Pi agent loop 发出 `[side_effect, ask_user]` 与 `[ask_user, side_effect]` 批次；
- 检查 GitHub release、issue/PR、commit 与 npm 最近下载；
- 把 runtime 母体与 UX/test donor 分开裁决。

### 3.3 本轮 focused 结果

| 候选 | 作者测试 | Pi 0.84.2 注册 | `executionMode` | no-UI 真实结果 |
|---|---:|---|---|---|
| supi 5.0.0 | 9 files / 152 tests，全部通过 | 注册且 active | sequential | 执行时抛错 |
| qmahyar 1.4.0 | 15 / 362，全部通过 | 注册且 active | sequential | 执行时抛错 |
| pi9 0.4.2 | 公开 repo 的同版本 snapshot：11 / 172，全部通过；npm `gitHead` 未能从公开 history 取回，非 artifact-exact 证据 | 注册，但 print Session 主动从 active set 移除 | sequential | 不向模型暴露工具 |
| geoqiao 1.3.0 | 220 tests，全部通过 | 注册且 active | **缺失** | 返回 cancelled 结果并提示模型改用普通文本提问 |
| pi-ask-user 0.14.0 | exact source，Bun 1.3.14：2 files / 82 tests，全部通过 | 注册且 active | sequential | 返回 `isError` fallback，内容仍提示普通文本提问 |
| tian 1.0.0 | 12 tests，全部通过 | 注册且 active | sequential | 返回 cancelled fallback，要求普通文本再问 |

## 4. 真实 Pi 语义：候选不能替 Host 解决的事

### 4.1 Sequential 不是 Ask-first

Pi `0.84.2` 实测：一批中只要有一个 sequential tool，整批按模型给出的 source order 串行执行。

```text
[side_effect, ask_user] => side:start -> side:end -> ask:start -> ask:end
[ask_user, side_effect] => ask:start -> ask:end -> side:start -> side:end
```

即使 `ask_user` result 带 `terminate: true`，第二种情况下 sibling side effect 仍已执行；Pi 的 batch early termination 不是“某一个结果要求终止就立刻停”。因此产品必须增加：

1. preflight 识别含 canonical Ask 的 batch；
2. Ask-first：Ask 前面的 sibling side effect 也不得先执行；
3. batch termination：Ask settle 后不执行同批任何 sibling；
4. answer-after-replan：把回答加入真实 Tool result 后重新请求模型；
5. 模型在新 turn 重新决定是否执行原 sibling，而不是自动续跑旧计划。

这个责任属于 OmniMind/Pi composition seam，不属于某个问卷 TUI。

### 4.2 同名 Tool provenance

Pi `0.84.2` 实测同名 `ask_user` 是 first registration wins；后注册者只产生冲突 diagnostic。换顺序就会换 winner。没有任何候选在产品 Session 暴露前断言 winner provenance。

OmniMind 必须在 Session tool surface 出现前检查：

- name 恰为 canonical `ask_user`；
- sourceInfo 指向 bundled OmniMind Extension identity；
- foreign winner、重复注册、reload 漂移均使 canonical Ask unavailable；
- prompt guidance 只能描述真实 winner；
- 不允许悄悄改名成第二个 Ask，也不允许“先用 foreign 顶着”。

### 4.3 无 UI fail closed

正确语义不是“告诉模型改用普通文本提问”。那会绕过 canonical request、取消、provenance、Timeline 与 answer correlation。

正确行为是：

- 没有 canonical Host projection 时，工具不进入 active surface；或
- execute 在任何副作用前返回明确不可用错误并终止本轮；
- 不让模型自行降级到非结构化追问；
- 不伪造 cancelled/answered；
- 不将 package TUI 的 `hasUI` 判断直接当成 OmniMind Host availability。

pi9 的 active-set removal 是最好的 donor 机制，但仍需替换成 canonical Host capability detection。

### 4.4 进程重启

进程死亡后，原 Extension instance、controller、AbortSignal 与 Tool Promise 都已消失。任何 package 都不能“恢复同一个 Promise”。

重启后允许：

- 将 unresolved request 标记 `stale/restarted`；
- 向用户展示历史问题与“重新发起”动作；
- 由新 turn 产生新的 request ID/toolCallId；
- 清理旧 UI、listener、timer、lock 与 response channel。

禁止：

- 把新答案 append 成普通 user message，声称原 tool 已恢复；
- 给消失的 toolCallId 补一个伪造 result；
- 自动重开并触发 agent continuation；
- 让旧 request 的 late answer 命中新 Session。

geoqiao 的自动 recovery 正是反例：它有用户价值，但语义上是新 user follow-up，不是原 Tool Promise continuation。

## 5. 候选池与犀利裁决

### 5.1 核心矩阵

| 候选 | 维护/供应信号 | runtime 优点 | 关键反证 | Disposition |
|---|---|---|---|---|
| `@mrclrchtr/supi-ask-user@5.0.0` | repo 2026-04 创建；76 stars；发布活跃；npm SLSA；单 maintainer | stable IDs/values、choice/text、structured result、controller、lock、sequential、signal、cancel/abort、no-UI throw | 明称 pre-release；短期快速 major；发布后继续重构；依赖并捆绑 supi-core；tgz 缺 LICENSE；TUI-only；预选推荐；trim；1–10/2–12 caps | **条件性 fork 母体；禁止直装** |
| `@qmahyar/pi-ask@1.4.0` | 2026-08 才建 repo；0 stars/forks/issues；无 npm SLSA | supi 派生；standalone；shutdown lock、dispose/late 测试更强；362 tests；artifact 有法律文件 | 无保留 Git ancestry；一次大导入；同样 TUI/caps/trim/preselect；仍带 config/events/labels；历史太短 | correctness/test donor，不作母体 |
| `@geoqiao/pi-ask@1.3.0` | 新 namespace/repo，但明确保留 eko 历史；npm SLSA；220 tests | stable IDs/values、多题、freeform、notes、Review、RPC、响应式行为最完整 | 无 sequential；无 UI 退回模型；fake restart；commands/settings/skill/notifications/remote bus/replay；trim；TUI 状态深 | **首要 UX/test donor** |
| `@eko24ive/pi-ask@1.2.0` | 2026-03 起、46 stars/15 forks、持续到 8 月；作者说明 chill maintenance | geoqiao 的真实成熟 ancestry | 与 geoqiao 已形成独立 continuation；母体更新 authority 分裂；同样 runtime 硬缺口 | lineage/evidence donor |
| `@pi9/ask@0.4.2` | repo 2026-05；4 stars；172 tests；ask 线 7–8 月 | sequential、no-UI deactivation、deadline、signal、selected-only context、shutdown cleanup | tool 名是 `ask`；单问题；index-based selection；trim；domain 扩展会重写核心 | lifecycle donor |
| `pi-ask-user@0.14.0` | 2026-02 起；142 stars/30 forks；最近月约 10k 下载；真实 issue/PR 最多 | `ask_user`、sequential、signal、Provider-friendly schema、广泛兼容 | 单问题、约 2k 行 TUI 单文件、stable IDs/values 弱、trim、primitive fallback；batch questions 仍是开放 PR | compatibility donor；不是母体 |
| `pi-tian-ask-user@1.0.0` | 新、单 maintainer、测试少 | sequential、signal、内建 Other、拒绝重复 sentinel | choice-only；1–5/2–5 hard caps；label 作为结果；trim；fallback | sentinel donor |
| `@d3ara1n/pi-ask-user@2.4.3` | 活跃 monorepo；12 stars；SLSA；仅少量 tests；artifact 缺 LICENSE | 多题/multi+freeform/notes/review/preview/Other | 无 sequential、忽略 signal、无 shutdown、生成 ID、label answer、2–4 schema guidance、TUI 单文件 | UX donor only |
| `@nativepi/ask-user@1.0.0` | 新平台包 | sequential、NativePi UI connection | 被 NativePi 平台/React/icons 绑定；单题；推荐必填；生命周期不独立 | 拒绝 |
| `@nguyenquangthai/pi-ask@0.1.14` | 新；有公开 crash issue 与待合 fix | 有基本交互 | 已知 multiline result 触发 terminal crash；版本与维护史不足 | 拒绝 |
| `@zhushanwen/pi-ask-user@7.0.14` | 高版本号但无可核 repo/provenance | 表面功能多 | headless 会继续、不 sequential、caps、global handshake、无法审计 source | 拒绝 |
| `@xynogen/pix-ask@0.2.22` | 新 | 多题 | 1–4/2–4 caps；multi 禁 freeform；依赖较多 | 拒绝 |
| `@juicesharp/rpiv-ask-user-question@2.7.1` | suite 使用信号 | 丰富 TUI | 无 sequential/忽略 signal；prewarm/control plane/caps；owner 过宽 | 拒绝 |

### 5.2 Primary source 路由

复核时不要从本文数字反推今天的状态，直接回 exact source：

- supi：[`5.0.0` release](https://github.com/mrclrchtr/supi/releases/tag/v5.0.0)、[`ce8af5f…` package source](https://github.com/mrclrchtr/supi/tree/ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user)、[发布后 TUI-only registration fix `4bb63fa7`](https://github.com/mrclrchtr/supi/commit/4bb63fa7ee4f2d2e9c2e08f51a757d2b332401e0)、[开放的 6.0 release PR](https://github.com/mrclrchtr/supi/pull/331)；
- qmahyar：[`QMahyar/pi-ask`](https://github.com/QMahyar/pi-ask)、[`1.4.0` npm artifact](https://www.npmjs.com/package/@qmahyar/pi-ask/v/1.4.0)；
- geoqiao/eko lineage：[`geoqiao/pi-tools`](https://github.com/geoqiao/pi-tools)、[`@geoqiao/pi-ask@1.3.0` release](https://github.com/geoqiao/pi-tools/releases/tag/%40geoqiao%2Fpi-ask%401.3.0)、[`eko24ive/pi-ask`](https://github.com/eko24ive/pi-ask)；
- pi9：[`Chase-C/pi9/packages/ask`](https://github.com/Chase-C/pi9/tree/main/packages/ask)；
- pi-ask-user：[`edlsh/pi-ask-user`](https://github.com/edlsh/pi-ask-user)、[开放的 batch-question PR #39](https://github.com/edlsh/pi-ask-user/pull/39)、[公开 issues](https://github.com/edlsh/pi-ask-user/issues)；
- Pi execution semantics：以 OmniMind 锁定的 `@earendil-works/pi-agent-core@0.84.2` exact local source与本轮真实 Session probe 为准；公开 Pi example 只作导航，可看 [`question.ts`](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/question.ts)。

### 5.3 补搜但未翻盘的候选

`@hank-warren/pi-ask-user-question` 的 manifest 指向无法核验的 repository；`@arhen/pi-core-ask` artifact 过大且公开描述仍限制题数；`@henryqw/pi-ask-question`、`@itc-steve/pi-ask-complete`、`@pixu1980/pi-ask`、`@yassimba/pi-ask-user` 等都更短命、更窄或只是旧包再分发。它们可作为未来 intake 的 discovery leads，当前没有证据跨过核心候选。

### 5.4 为什么下载最多的 `pi-ask-user` 不是母体

成熟信号不能机械相加。`pi-ask-user` 的真实用户量、issue 与兼容历史是宝贵证据，但 OmniMind 若采用它，需要重写多问题 domain、stable IDs/values、structured result、canonical Host seam 与大部分单文件 TUI。最终保留的主要是 tool 名和少量 signal glue；这不叫继承成熟母体，而是借流行度为自研背书。

### 5.5 为什么 geoqiao/eko 仍不是 runtime 母体

它们在 UX 与测试上最成熟，但 runtime 有三个主动反语义：缺 sequential、无 UI 时鼓励模型普通文本追问、重启后用 user message 模拟恢复。再加 commands/config/skill/notifications/remote/replay 生命周期，若以它为 runtime 母体，OmniMind 实际会删除其最厚的部分，只留下 domain 和测试。它更适合 donor；把它叫 runtime 母体会再次让“功能表最厚”偷换“运行时最正确”。

### 5.6 为什么 supi 仍获条件性第一

排除 TUI 加分后，supi 仍保留四组其他候选难以同时提供的骨架：

1. stable question IDs 与 stable option values，不靠 label/index 解释答案；
2. choice/text 正交，single/multi 是选择 cardinality，不把 Preview 混成答案类型；
3. 可独立测试的 controller terminal state、one-form lock 与 structured result；
4. sequential、signal、Cancel/Abort internal result、no-UI throw 已在 execute 边界存在。

但这只是“最适合 fork 的内核”，不是成熟包背书。它的风险必须原样写进方案。

## 6. 对 supi 的最强反证

### 6.1 Pre-release 与快速 major

上游 README 明确把 SuPi 称为 pre-release。repo 虽活跃，但 v4.7、4.8、4.9、4.10、5.0 在 8 天内连续发布，5.0 后又已开放 6.0 release PR。版本号不能替代稳定期；这里的 major 更像高速重构节奏，而不是长期兼容承诺。

### 6.2 5.0.0 发布后仍在修注册语义

5.0.0 之后，`packages/supi-ask-user` 又发生目录迁移、UI 修复与 `4bb63fa7` “register ask_user only in TUI sessions”。这条修复说明：

- 5.0.0 在无 TUI Session 中仍注册、执行时才失败；
- 上游当前方向是 TUI-only discovery；
- OmniMind 需要的是 Host-capability discovery，不能直接跟随该修复；
- fork 的 registration seam 会持续与 upstream product profile 冲突。

这不是致命否决，但它证明 future update 只能逐 hunk intake，不能定期 merge whole package。

### 6.3 `supi-core` 不是无害小依赖

5.0.0 artifact 直接依赖并捆绑 `@mrclrchtr/supi-core@5.0.0` source。Ask 实际导入：

- prompt-surface config/resolution/diagnostics；
- session name tracker；
- terminal title/attention helpers。

其中 prompt-surface resolver 自身约 363 行，还继续依赖 SuPi config/trust 规则。它们会建立第二 prompt/config/session/terminal owner；OmniMind fork 不应保留该依赖。

### 6.4 法律 artifact 不完整

source repo 是 MIT，但 npm tgz 未包含 `LICENSE`/`NOTICE`，同时捆绑了 supi-core source。OmniMind 不能原样再分发。fork 必须：

- 固定 exact commit/artifact/hash；
- 携带 upstream MIT 全文、copyright 与变更说明；
- 对每个 donor 保留单独 attribution；
- 验证 shipped artifact 真含法律文件，而不是只看 repo。

### 6.5 推荐预选与文本预填

recommendation 在 UI 中会成为初始选择或文本。推荐项是 presentation metadata，不是用户回答。默认预选会把“用户未操作”伪造成“用户选择”。必须改为视觉推荐、零默认答案。

### 6.6 Trim 与 hard caps

supi normalize 会 trim 文本，并把题目限制为 1–10、选项限制为 2–12。对 OmniMind：

- display labels 可做 blank validation，但用户自由文本/supplement 不得 trim 后冒充原文；
- schema 不写产品题数上限；
- 只在 transport/renderer 前做字节、深度、总节点等异常 payload guard；
- guard 触发时明确报错，不静默截断。

### 6.7 TUI 与 runtime 的真实比例

supi 5.0.0 `supi-ask-user` 自身约 3,200 行生产 TypeScript；直接的 UI/render 部分约 1,950 行。相对可保留的 types/schema/normalize/controller/lock/result/guidance 约 1,000 行，而且 schema、normalize、result 仍需因 sentinel、无损文本与 canonical contract 修改。

所以正确表述是：**保留 ancestry 与作者测试的减法式 fork**。把它写成“narrow patch”会严重低估长期分叉。

## 7. Fork 方案：保留什么，删除什么

### 7.1 保留的母体资产

- exact Git ancestry 与 `ce8af5f…` baseline；
- stable question IDs / option values；
- choice/text 正交 domain；
- controller 的导航、选择、terminal/idempotence 思路；
- one-form/one-request lock，但改成 instance/request token ownership；
- structured result builder 的基本分层；
- 与 retained behavior 对应的作者测试；
- signal、Cancel/Abort internal outcome 的边界。

### 7.2 明确删除或不激活

- 全部 upstream TUI/renderers；
- `supi-core` dependency 与 bundled source；
- SuPi prompt-surface config；
- terminal title/bell/working visibility；
- `supi:*` event bus；
- deferred `tool_result` label timer；
- session name tracker；
- upstream settings/commands/skills/notifications/replay/recovery；
- recommendation preselection/text prefill；
- product hard caps 与 trim；
- upstream package identity、branding 与安装入口。

源码保留、shipped export、runtime registration 必须分别列账；“目录还在”不等于产品激活。

### 7.3 OmniMind-owned seams

| Seam | 唯一责任 |
|---|---|
| identity/composition | bundled package identity、唯一注册、active intent、sourceInfo assertion |
| canonical contract | request/result schema、sentinel、无损文本、version/capability |
| Host bridge | request correlation、Composer projection、terminal settlement、late fencing |
| Workbench projection | 多题/多选/freeform/Preview/Notes/Review/i18n/a11y |
| Pi barrier | Ask-first、batch terminate、answer-after-replan |
| lifecycle | Abort/Cancel/timeout/reload/branch/resume/restart stale |
| result/context | 只返回真实答案，不把 recommendation/unselected metadata 伪造成决定 |

任何单个 adapter 同时拥有四项以上责任都视为 lone wolf，Gate B 必须拆回 owner。

为让未来 intake 有稳定 diff 语言，fork patch 继续固定为 P1–P7；这不是第二套架构 owner：

| Patch | 含义 | 删除条件 |
|---|---|---|
| P1 Identity & product profile | OmniMind identity、bundled-only、禁用 upstream TUI/config/events/commands | 上游提供不建立第二 owner 的正式 Host-neutral product profile |
| P2 Canonical contract | stable IDs/values、sentinel、无损文本、无产品 caps、正交 schema/result | 上游合同逐项满足 canonical invariants |
| P3 Structured Host seam | request correlation、capability discovery、terminal settlement、late fencing | Pi 提供等价、versioned、Host-neutral seam |
| P4 Workbench projection | Composer Question 的完整 en/zh UI、Review/Preview/Notes/a11y | 不删除；这是 OmniMind 产品 owner，不属于 fork runtime |
| P5 Lifecycle & barrier | sequential 之外的 Ask-first、batch terminate、replan、Abort/Cancel/restart stale | Pi Core 原生提供并由 exact tests 证明 |
| P6 Truthful result/context | selected-only、custom/supplement 无损、recommendation 不进答案 | upstream result 与 context 完全等价 |
| P7 Provenance/reload | same-name winner、sourceInfo、instance generation、reload/branch/resume | Pi 暴露稳定 product provenance primitive并由 Session 验证 |

若未来出现 P8，Gate A 必须先说明为什么 P1–P7 和既有 architecture owner 都不能承担，再请求维护者裁决；不能用编号扩张掩盖 fork 失控。

### 7.4 从 qmahyar 吸收什么

只把它视为 supi lineage 的反证和测试 donor：

- session_shutdown 释放 lock 的 generation/token 语义；
- stale release no-op；
- UI dispose 后忽略 input 与移除 abort listener；
- pre-aborted / in-flight abort 测试；
- artifact 法律文件与 standalone dependency 形状；
- schema/provider compatibility tests。

不继承其 config、events、labels、TUI、caps、trim 或无 ancestry 的发布形状。

## 8. Canonical contract

### 8.1 原则

- versioned、可演进；
- input 与 presentation metadata 分离；
- IDs/values 稳定；
- choice cardinality 与 Preview/Review 正交；
- 用户文本无损；
- sentinel 由 Host 合成；
- schema 只宣称 UI/result 已完整实现的能力。

### 8.2 目标 request 形状

以下是认知模型，不是当前已发布 API：

```ts
type AskUserRequest = {
  version: 1;
  requestId: string;
  title?: string;
  context?: string;
  questions: Array<
    | {
        kind: "choice";
        id: string;
        header?: string;
        prompt: string;
        cardinality: "single" | "multiple";
        options: Array<{
          value: string;
          label: string;
          description?: string;
          preview?: string;
          recommended?: boolean;
          recommendationReason?: string;
        }>;
        allowSupplement?: boolean;
        presentation?: { preview?: boolean; review?: boolean; notes?: boolean };
      }
    | {
        kind: "text";
        id: string;
        header?: string;
        prompt: string;
        placeholder?: string;
        suggestedText?: string;
        presentation?: { review?: boolean; notes?: boolean };
      }
  >;
};
```

`suggestedText` 与 `recommended` 永远不是 answer 初值。

### 8.3 目标 result 形状

```ts
type AskUserResult = {
  version: 1;
  requestId: string;
  status: "answered" | "cancelled" | "aborted" | "timed_out" | "unavailable" | "stale";
  answers?: Array<{
    questionId: string;
    selectedValues?: string[];
    customText?: string;
    supplement?: string;
    notes?: Array<{ target: "question" | "option"; optionValue?: string; text: string }>;
  }>;
};
```

不返回“看起来合理”的合成答案；不把 option label 代替 stable value；不把 recommendation、未选 option、placeholder 或 preview 当成用户决定。

### 8.4 固定 Other sentinel

每道 choice question 的 projection 最后一项必须是 Host 合成 sentinel：

- LLM schema/guide 明确禁止 author sentinel；
- normalize 拒绝或去歧义化与 sentinel identity 冲突的模型选项；
- sentinel 使用保留 internal identity，不占用模型 option value；
- single：customText 完全替代预设 selection；
- multiple：customText 与 selectedValues 共存；
- selectedValues 仍可带 supplement；
- sentinel 文案本地化，但 identity 不随语言变化；
- result 不把 sentinel label/value 返回模型，只返回 customText 原文。

### 8.5 无损文本

用户输入的 customText、supplement、notes：

- 不 trim、不 normalize Unicode、不自动改换行；
- 不合并、不总结、不解释；
- 允许空格本身是内容，但提交空字符串与未填写必须有明确 UI 区分；
- display 可做视觉折行，storage/result 保持原文；
- transport 编码后 round-trip 必须 byte-equivalent（约定的 JSON 编码除外）。

### 8.6 数量与安全

不设置“最多 4/5/10 题”一类产品限制。可以设置并明确命名为安全 guard：总序列化字节、嵌套深度、总节点、单字段异常字节、renderer 虚拟化阈值、请求 TTL。guard 只处理异常 payload，不作为模型 guidance，也不静默截断。

## 9. UI projection

Composer Question 是唯一 owner，第三方 UI 只提供 donor 行为。目标 journey：

1. Agent 发 canonical request；
2. Workbench 将当前 Run 标为 waiting for user；
3. Composer 进入 Question mode，保持同一 conversation/thread；
4. 用户逐题选择、自由输入、补充、预览或写 notes；
5. Review 汇总真实答案，可回到任意题修改；
6. Submit 原子提交一个 result；
7. UI 退场，Timeline 留下可读 receipt；
8. Pi 收到真实 Tool result 并重新规划。

多题导航、Preview、Review、Notes、推荐理由、required policy、键盘操作、屏幕阅读器与中英 catalog 都是可演进能力，不由当前截图或 package TUI 上限决定。若某字段未被 UI/result 完整支持，就不能先公开进 schema。

## 10. Ask 与 Approval

| 维度 | Ask User | Approval |
|---|---|---|
| 目的 | 获取偏好、信息、决策 | 授权高风险动作 |
| 默认结果 | 答案内容 | allow/deny/limited authority |
| 可否用普通答案替代 | 可以自由表达 | 不可以把模糊文本当授权 |
| 超时/无 UI | unavailable/cancelled，停止依赖它的执行 | fail closed，动作不得执行 |
| 生命周期 | 回答后 replan | 授权范围内才可继续动作 |

同一 UI shell 可以复用 presentation primitive，但合同、authority、receipt、审计与 result type 必须分离。

## 11. 生命周期状态机

### 11.1 状态

```text
created -> projected -> waiting -> answered
                           |-> cancelled
                           |-> aborted
                           |-> timed_out
                           |-> unavailable
                           |-> stale
```

每个 request 只能从非 terminal 状态 settle 一次。settlement 由 `{sessionInstanceId, runId, toolCallId, requestId, generation}` fencing；任何字段不匹配都拒绝 late response。

### 11.2 Cancel 与 Abort

- Cancel 是用户主动关闭问题；
- Abort 是 run/session/engine 主动终止；
- 两者都不能伪造成 answered；
- 是否终止当前 agent turn 由产品策略明确决定；
- listener、timer、controller、lock 与 UI 必须在 finally/dispose 收敛；
- AbortSignal 已触发时不得先投影 UI；
- settle 后任何 onUpdate/answer callback 都是 no-op 并可诊断。

### 11.3 Reload/branch/resume

- reload 重新注册后必须重新断言 provenance；
- branch/resume 不能把另一 branch 的 pending request 投影到当前 branch；
- Session replacement 使旧 generation 全部失效；
- source reload 不自动恢复旧 Tool Promise；
- history 可以显示，但不能产生 ambient writer/listener/timer。

## 12. 运行时与发行 owner

| Owner | 责任 |
|---|---|
| source owner | exact upstream commit/artifact、license、ancestry、donor attribution |
| maintenance owner | fork patch、upstream intake、author tests、stop-loss |
| registration owner | bundled discovery、active intent、same-name winner、reload |
| execution owner | Pi Session execute、barrier、Abort/Cancel、result |
| state owner | canonical request/result、Timeline receipt、restart stale |
| UI owner | Workbench/Composer projection |
| distribution owner | OmniMind build、SBOM/license、packaged verification |

`@omnimind/om-ask` 已作为 monorepo private feasibility package 创建，但没有 `pi.extensions`、ToolDefinition、runtime dependency、composition consumer 或 shipped activation。只有未来完整 Gate B 通过后，它才可能随 OmniMind Agent distribution；它不能被一个 adapter 静默包装成 AgentGateway tool，也不能让第三方 package 自己拥有 Settings、Product State 或 release cadence。

## 13. Gate B 施工顺序

维护者已授权并完成前两步的 fork feasibility slice；第 3–10 步仍未获授权：

1. 固定 fork exact source、artifact、license 与作者测试 baseline；
2. 建立 subtractive product profile，先切掉 TUI/supi-core/ambient lifecycle；
3. 冻结 canonical request/result 与 sentinel/无损 invariants；
4. 建立 structured Host bridge 与 request fencing；
5. 接 Composer Question 完整 UI 和 en/zh；
6. 在 Pi seam 完成 Ask-first/batch terminate/replan；
7. provenance、reload、branch/resume、restart stale；
8. focused fixtures；
9. Xiaomi MiMo + DeepSeek 真实 Provider journey；
10. exact pushed SHA rebuild/install，fresh isolated profile packaged journey。

禁止先把 Tool 暴露给模型、以后再补 UI/result。那会公开假能力。

### 13.1 Fork feasibility slice：GO

exact source、artifact 与法律基线已固定：

| 项 | 固定事实 |
|---|---|
| npm | `@mrclrchtr/supi-ask-user@5.0.0` |
| source | `mrclrchtr/supi@ce8af5f57304ad114319aa75c00920f029ceb8e7/packages/supi-ask-user` |
| provenance | npm SLSA resolved dependency 指向同一 commit |
| integrity / shasum | `sha512-uBlvlXTvSrdvTvvdbpapwVwA4I3DMcIaHSGe18mtd4KdWAhd36yY1UwGvAbFXcS2NvJ18VIkaJpi112CSoabJQ==` / `cabb06df40ab95be1a67b4f3b32c83bc257ea38a` |
| tarball SHA-256 | `d687d4d448cc115a67ceb473b8e9ceeb56dddb047901b1f2daa05d6ae0cb300e` |
| rights | source MIT；fork 保留 Marcel Richter 2026 exact license text；npm tgz 缺 LICENSE/NOTICE 的发行缺口已在 fork source 修复 |
| author baseline | exact source，Vitest 4.1.10，9 files / 152 tests passed |
| fork source commit | `a96c60256bd6e391af57f4d2994b4a12d32aa6a5` |

切片是 monorepo private package，不包含 `pi.extensions`、ToolDefinition、TypeBox schema、prompt guidance、composition consumer 或 runtime dependency。它既不注册 `ask_user`，也不向模型或 UI 宣称能力。

#### Retained / deleted module

| 上游模块 | 处置 | fork 模块 | 行级证据与真实价值 |
|---|---|---|---|
| `src/types.ts` | adapt | `src/types.ts` | 131 行中约 94 行原样；保留 choice/text、stable ID/value 与 structured outcome，recommendation 改为纯 metadata |
| `src/normalize.ts` | adapt | `src/normalize.ts` | 266 行中约 120 行原样；保留 identity/shape/recommendation validation，删除 trim、Unicode 改写与数量上限 |
| `src/session/controller.ts` | retain/adapt | `src/controller.ts` | 314 行中约 223 行原样；导航、single/multi、comments、unanswered、ordered result、cancel/abort 主状态机仍是上游实现；删除所有预选/预填并补 terminal late-mutation fence |
| `src/session/lock.ts` | strengthen | `src/lock.ts` | 保留 one-active 责任，boolean 改成 lease token，stale release 不再误解锁新 interaction |
| `src/render/result.ts` | subtract/rebuild | `src/result.ts` | 只保留 structured details builder；Pi summary、英文拼接、unselected narrative 与 truncation owner 全删 |
| `src/ask-user.ts` | subtract/rebuild shell | `src/kernel.ts` | 保留 validation → availability → lock → signal → interaction → result → cleanup 顺序；Pi registration、TUI、core、event、timer、terminal/session 全删，并补 pre/in-flight abort 与 late settlement fence |
| `src/ui/**`（1,715 行） | delete | 无 | canonical Composer Question 已拥有 UI；保留会制造第二 UI owner |
| `src/render/transcript.ts` | delete | 无 | Timeline/Workbench 未来统一投影，不继承 TUI transcript |
| `src/schema.ts` / `tool/guidance.ts` / `extension.ts` | delete | 无 | 当前不公开 schema/prompt、不注册 Tool，不制造假能力 |
| `supi-core` bundled dependency | delete | 无 | prompt/config/session/terminal 是第二 owner；fork runtime dependencies 为零 |

上游 production source 共 3,164 行；feasibility kernel source 共 778 行，缩减约 75%。六个映射模块的新 fork code 中约 473/745 行仍是上游原行（约 63%）；最关键 controller 约 71% 原样。这个比例不能证明正确性，但能反驳“只借 fork 名义自研”：问卷主状态机和大部分 domain 仍清楚映射到 exact upstream。

#### 作者测试 disposition

152 个 upstream cases 没有被整体复制后冒充保留：

| Disposition | Cases | 含义 |
|---|---:|---|
| preserve/adapt | 55 | controller 34、normalize 14、execute lifecycle 7；保持同一用户/状态语义，必要时换成 Host-neutral fixture |
| intentionally reverse | 9 | 推荐预选/文本预填、trim、空白丢弃、literal Unicode 重写、trim 后 identity collapse；都有相反断言 |
| delete | 88 | 81 个 TUI/transcript、6 个 registration/config/event/terminal、1 个 Pi summary truncation |

fork 自身 5 files / 61 tests 通过，覆盖 retained semantics、无产品 caps、文本无损、推荐零默认答案、lease、pre/in-flight abort、late answer、no-UI fail closed 与 forbidden-owner snapshot；`typecheck`、独立 JS/declaration build、built-package import、Oxlint 0 warning 和 Oxfmt check 均通过。

#### Stop-loss 裁决

| Stop-loss | 证据 | 裁决 |
|---|---|---|
| 保留实质过少 | fork 映射源码约 63% 是上游原行；controller 约 71% 原样 | 未触发 |
| 作者测试大量失去意义 | 55 保留/适配，9 有意反转且有 replacement，88 删除项全部属于明确拒绝的 presentation/ambient owner | 未触发 |
| 仍需重建主要状态机 | questionnaire controller 未重建；重写的是必须被替换的 Pi/TUI execute shell 与 trivial result presentation | 未触发 |
| 为 lineage 保留第二 owner | source test 断言无 TUI、`supi-core`、config、event、timer、terminal/session hook、registration 或 runtime dependency | 未触发 |

**结论：GO。** `supi@ce8af5f…` 足以作为 domain/controller fork lineage 继续进入下一次维护者授权；但它不再被描述成“成熟完整 runtime”。OmniMind 仍需完整拥有 canonical contract、Host bridge、Composer projection、Ask-first barrier、provenance、restart stale 与 distribution proof。若未来这些责任被塞回单一 fork adapter，或连续 intake 破坏 controller/normalize 的 ancestry/test 映射，立即回 Gate A。

## 14. Required proof

### 14.1 Source/supply

- exact commit、npm integrity、tarball SHA-256、provenance；
- source/artifact diff；
- shipped LICENSE/NOTICE/attribution；
- direct/transitive/bundled dependencies；
- source present / shipped / activated 三层清单；
- upstream author tests retained/adapted disposition。

### 14.2 Contract

- duplicate IDs/values；
- LLM-authored sentinel collision；
- single custom replacement；
- multi selected + custom coexistence；
- selected + supplement；
- Preview/Notes/Review round-trip；
- whitespace/newline/Unicode losslessness；
- abnormal payload guard 不静默截断。

### 14.3 Runtime

- real Session registration/call；
- same-name foreign-first/product-first；
- Ask before/after sibling side effect；
- multiple Ask in one batch；
- pre-abort/in-flight abort/cancel/timeout；
- double submit与 late answer；
- reload/branch/resume/session replacement；
- no UI unavailable；
- process restart stale，且不伪造 result/user continuation。

### 14.4 UI

- single/multi/text；
- Other 始终最后；
- custom 与 supplement 区分；
- recommendation 不预选；
- 多题导航与 Review 编辑回跳；
- narrow/wide、keyboard、focus、screen reader；
- zh/en key/value parity；
- Cancel/Abort/unavailable/stale copy；
- Timeline receipt 不泄漏内部 runtime 术语。

### 14.5 Live/packaged

- MiMo/DeepSeek 真实 tool call schema、stream、answer continuation；
- Provider 重复/畸形 sentinel；
- abort/disconnect/recovery；
- fresh isolated profile 的 packaged App 启动、Ask、回答、继续、关闭、重开；
- 明确核验没有读取或改写真实 `.pi`/`.omnimind` home。

## 15. 管理与更新

### 15.1 一个 runtime、多个有界 donor

产品只有一个 runtime 和一个 UI。Donor 不安装、不注册、不建立第二 release cadence。只有实际吸收的 exact hunk/test 才进入维护队列。

### 15.2 更新方式

supi 高速变化使“定期 merge upstream main”不成立。未来更新必须：

1. fixed exact source；
2. 只读 diff；
3. 分 runtime kernel、presentation、shared-core、ambient lifecycle、tests、supply；
4. 对 adopted modules 逐 hunk disposition；
5. 先跑作者基线，再跑 OmniMind falsifiers；
6. relevant change 可 cherry-pick/adapt；
7. TUI/config/session owner 变化默认不吸收；
8. 若 conflict 连续扩大，触发重新选型。

完整程序见 [`pi-ask-user-intake.md`](pi-ask-user-intake.md)。

### 15.3 Dashboard

维护者每轮只需要看到：

- current fork base exact commit/artifact；
- upstream latest considered exact source；
- adopted modules 与 deleted modules；
- donor exact sources；
- patch conflict count/changed LOC；
- author/fork/contract/runtime/UI/live/packaged tests；
- license/provenance status；
- open falsifiers；
- rollback unit；
- `candidate / adopted / verified / blocked` 状态。

### 15.4 Stop-loss

任一触发就停止继续堆 patch，回到 Gate A：

- retained runtime kernel 已无法映射到清楚 upstream modules/tests；
- 连续两轮 upstream update 都需重写同一 composition/contract seam；
- `supi-core` 或 TUI 重新渗入 shipped runtime；
- fork 相对上游的运行时代码已主要为 OmniMind 自研，却仍宣称能低成本吃上游；
- provenance/license/artifact 无法固定；
- another candidate 在真实 Pi journey 上显著胜出；
- package lineage/maintainer ownership 改变；
- 新增第二 store、第二 request channel、第二 UI 或第二 recovery control plane。

## 16. 犀利反例

### “supi 功能最全，所以选它”

错。TUI 功能已从母体评分里剔除。它胜出的只是 runtime/domain kernel，而且是条件性胜出。

### “supi 只需要几处 patch”

错。TUI/render 占生产代码的大头，core dependency 与 schema/normalize/result 也要改。它是减法式 fork。

### “geoqiao 测试最多，所以该当母体”

错。220 项测试是强 donor 证据，但没覆盖 sequential，而且它主动实现了不符合产品语义的 no-UI 与 restart fallback。

### “pi-ask-user 下载最多，最成熟”

只对市场使用和兼容 bug 成立。若 canonical domain/result 几乎全重写，成熟性不能转移到新实现。

### “sequential 已经防止同轮副作用”

错，真实 Pi 0.84.2 已反证。它只按模型顺序串行，并不 Ask-first 或 answer-after-replan。

### “无 UI 时让模型普通文本再问就行”

错。这绕过 canonical owner、result correlation、取消、provenance 与 Timeline。

### “重启后重新显示并发 user message 就算恢复”

错。原 Promise 已不存在；只能 stale + 新 request。

### “限制 4/5/10 题更安全”

错。安全应表达为异常 payload guard，不能把当前渲染方便写成产品能力上限。

### “有一个 Other 文案就完成自由表达”

错。还必须覆盖 single replacement、multi coexistence、supplement、无损返回、sentinel identity 与重复 author 防御。

## 17. 零记忆机器摘要

```yaml
status: gate_b_fork_feasibility_go_pushed_source_candidate_not_adopted
date: 2026-08-25
product:
  capability: canonical_user_input
  pi_tool: ask_user
  first_class: true
  ui_owner: composer_question_workbench
  agent_gateway_tool: false
runtime_mother:
  disposition: feasibility_proven_subtractive_fork_lineage
  package: "@mrclrchtr/supi-ask-user@5.0.0"
  commit: ce8af5f57304ad114319aa75c00920f029ceb8e7
  direct_install: forbidden
  claim: runtime_kernel_only
  fork_shape: subtractive_not_narrow
  fork_package: "@omnimind/om-ask@5.0.0-omnimind.feasibility.0"
  fork_commit: a96c60256bd6e391af57f4d2994b4a12d32aa6a5
  registered: false
  model_exposed: false
  public_schema: false
  risks: [pre_release, rapid_majors, short_history, supi_core, missing_artifact_license, tui_coupling, preselection, trim, hard_caps]
donors:
  ux_tests:
    package: "@geoqiao/pi-ask@1.3.0"
    commit: 26496c809870e349429bc2cae72d61b46d0e2bc3
    ancestry: eko24ive/pi-ask
  lifecycle: "@pi9/ask@0.4.2"
  compatibility: "pi-ask-user@0.14.0"
  correctness_tests: "@qmahyar/pi-ask@1.4.0"
  sentinel: "pi-tian-ask-user@1.0.0"
hard_invariants:
  - ask_approval_separation
  - host_synthesized_other_sentinel
  - single_custom_replaces_preset
  - multi_custom_coexists_with_presets
  - supplements_and_user_text_lossless
  - no_product_question_or_option_caps
  - ask_first_batch_terminate_answer_after_replan
  - abort_cancel_timeout_late_fencing
  - no_ui_fail_closed
  - restart_is_stale_not_fake_resume
  - exact_same_name_provenance
  - no_public_fake_capability
gate_b:
  feasibility_slice: go
  product_integration: requires_maintainer_confirmation
update_manual: research/pi-ask-user-intake.md
```
