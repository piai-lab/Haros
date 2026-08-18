# OmniMind Agent Core：窄内核、成熟执行冰山与按需组合（已弃用）

> 证据日期：2026-08-15
>
> 状态：**已弃用（2026-08-18，维护者决定）**。本文只保留历史研究、来源处置与反证，不再描述当前产品方向、缺口、施工候选或准入条件；不得据此启动 bounded child、Delegate、Workflow、Memory/Knowledge、Prompt Diet 或其他 Agent Core 工作。当前产品事实只按 `architecture/*`，当前工作只按 `execution-brief.md` 与 active Mission。
>
> 文档角色：Agent Core 的研究设计、来源处置与反证地图。
> 权威边界：产品事实属于 `architecture/*`，维护者决定 source adoption 与新增产品责任，`execution-brief.md` 只协调当前工作、并发与真实阻塞，Campaign 状态属于 active Mission。本文不授权施工。

## 0. 总体裁决

OmniMind 第一阶段是 **Task-first personal agent workbench**。用户选择它的首要理由不是“多 Agent 平台”，而是：在本地真实项目中，使用自己可获得、可替换的模型，以更快、更便宜、更缓存友好的方式完成可检查的软件任务。

OmniMind Agent 与 Workbench 同等重要。正确路线不是从零正面重做 Codex、Claude Code 或 Cursor，也不是把社区 package 的全部产品世界塞进 Desktop，而是：

```text
现有 OmniMind Product/Workbench owner
  + bundled Pi ModelRuntime/AgentSession
  + 一个 bounded child-session primitive
  + 普通 tools / skills / prompts
  = 成熟、可替换、可维护的个人 Agent
```

当前结论是 **REVISE**：

- `codex/agent-core-ui-spec` 只作 donor/evidence branch，绝不整体合并到 `main`；
- `@gotgenes/pi-subagents@19.2.2` 的 manager/session component 仍是 selected lineage 候选，但旧 Host seam 不能原样移植；
- nicobailon `pi-subagents@0.48.0` 保留为 recovery/process/control donor，Direct Pi 保留为 comparator；
- 首先闭合 child 指令、精准控制和写入冲突真实性，再谈 Goal、动态工作流和默认委派策略；
- 不建立 Capability Pack、Team/Fleet/Mission、Workflow DB/DAG、模型 Router 或自动成本路由。

奥卡姆与冰山法则同时成立：**删架构，不删用户价值；删重复 owner，不删成熟 lifecycle；删常驻成本，不删按需能力。**

## 1. 产品合同

### 1.1 Root 与 child

- Root 始终对最终任务、最终写入判断和最终回答负责。
- child 是同一个 OmniMind Agent 中的独立 bounded `AgentSession`，用于 Explore、local Research、Implement、Review 等有界任务。
- child 默认继承 Root exact model，也可明确选择 `.omnimind` 中已配置的另一个 exact provider/model。
- child 可以有独立内存 `ModelRuntime` 实例；硬要求是共享同一 OmniMind config/auth authority、`.omnimind` namespace 和 exact model truth。
- child 的终态必须准确交回 Root；Root 决定调整、重试、换 exact model、自己完成或停止。

模型解析只有一条合同：

```text
本次明确指定 → 已配置的角色默认 → inherit Root exact model
```

指定模型不可用时准确失败；不静默跨 Provider fallback，不预设“强 Root → 便宜 Child”，不建立模型池、评分或预算治理控制面。

### 1.2 Primitive 与组合行为

内建 runtime primitive 只拥有：session 创建/销毁、admission、权限 ceiling、exact model、foreground/background、并发上限、取消/超时、终态、usage、进程清理和 projection identity。

Goal、Todo、dynamic workflow、Implement→Review→Rewrite、best-of-N 是 primitive + ordinary tool loop 的组合行为，不是新的 runtime、package tier 或数据库。

“Capability Pack”不再作为产品名、安装单元、runtime type、registry、导航或控制面。Browser、Device、Skills、MCP、转换器等继续由现有 owner 或可独立替换的 component 提供。

### 1.3 三层事实必须分开

| 层级                  | 可以保留什么                                                                             | 不能据此声称什么               |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| source retained       | 上游 ancestry、目录、作者测试、未激活的 Mission/Fleet/Schedule/VM 源码                   | 产品已提供这些功能             |
| shipped bytes/exports | exact package、license、完整发布物及必要 patch                                           | 所有 export 都被 OmniMind 调用 |
| runtime activation    | OmniMind product code 实际 import、注册的 Host seam、tools、listeners、timers、processes | 未注册源码会影响用户           |

当前 narrow-package 目标不是物理大删上游，而是证明 OmniMind product import/runtime activation 只进入最小 Host surface；入口关闭还要证明没有 ambient writer、listener、timer、process 或第二 owner。

## 2. 当前真实状态

### 2.1 `main`

当前 `main` 已有：

- Synara 继承的 Subagent Strip、child Thread identity/projection、Provider runtime events 和相关 Product surface；
- bundled Pi ModelRuntime、AgentSession、model/auth/config authority、Pi bash process supervisor；
- Product Thread `runtimeMode`、Workspace/Files/Diff/Git/Checkpoint 等既有 owner；
- Model services + Composer 的 exact model/config/auth 事实。

当前 `main` 没有：

- gotgenes bounded-child Host；
- OmniMind Pi child 的 `delegate`/`delegate_implement` tool；
- Pi child 的 targeted stop/steer/status 全链。

因此现有 Subagent UI 主要服务 Engine-native 能力。它不是 Model Services 临时发明的 Agent Core，也不能反向证明 OmniMind Pi child 已存在。

### 2.2 donor branch 已证明什么

`codex/agent-core-ui-spec` 的 B0–B5 producer evidence 证明：

- narrow gotgenes manager/session Host seam 可以运行；
- read-only foreground、最多三个并行 child、explicit/inherit exact model、background read-only、Full Access foreground writer 可以形成 focused candidate；
- 同一 Host/Root turn 的第二 writer 可被拒绝；
- supervised shell/process tree 在 focused Ubuntu/Windows harness 的 natural completion、cancel、timeout、owned teardown 后可归零。

这些是有价值的 execution foundation evidence，但不是独立 verified 的 first-public Agent，也不是三平台 packaged release。

### 2.3 donor branch 没有证明什么

| 缺口                   | 精确反证                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| effective instructions | Host 捕获 `context.getSystemPrompt()`，但自定义 `buildAgentPrompt` 只返回 generic role prompt；同时 `noContextFiles:true`，child 可能丢失 `AGENTS.md`/project instructions/cwd/git env |
| targeted child stop    | UI/ProviderService 传 `providerThreadId`，旧 PiAdapter `interruptTurn(threadId, turnId)` 忽略第三参数并 abort Root AgentSession                                                        |
| child steer/message    | 上游内部有 steer/resume，但 OmniMind Host/PiAdapter 未导出产品控制 seam；现有 child Composer 文案会过度承诺                                                                            |
| writer conflict        | `writerActive` 是单 Host 局部变量，只证明同一 Root delegation tree 内唯一 writer                                                                                                       |
| external edit safety   | writer 的 Pi built-in edit/write 没有证明使用现有 `WorkspaceFileSystem.expectedVersion`/atomic conflict path                                                                           |
| terminal truth         | DTO 只有 running/completed/failed/cancelled/timed_out；缺 crashed/interrupted 及完整 projection                                                                                        |
| role default           | 只实现 explicit exact → inherit Root                                                                                                                                                   |
| economics              | usage 缺失值被 `?? 0`；无法区分 reported zero 与 unknown，真实 outcome/cost paired harness 未完成                                                                                      |
| UI closure             | Strip/status 有硬编码英文，缺 timed_out/crashed/interrupted 映射与 adapter-capability gate                                                                                             |

B4 的成功 journey 把“只改指定文件”等约束写进了 delegate task，因此绕过了最关键的仓库指令继承 falsifier。

## 3. 首次公开成熟能力基线

以下是用户结果，不是竞品内部架构 checklist。OmniMind 自有硬能力必须 PASS；依赖用户配置、Provider、OS 或 human presence 的能力可以在具体环境准确 UNAVAILABLE，但产品能力必须在可用环境取得代表性 PASS。

| 能力                | 首发结果                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| repo instructions   | Root 与 child 准确遵守作用域内 `AGENTS.md`/项目指令，来源唯一                                           |
| search/read         | bounded，明确 complete/truncated/incomplete，不把遗漏冒充无结果                                         |
| scoped context      | 稳定而瘦的前缀；正文 JIT；native compaction/resume 真实                                                 |
| edit/write          | Agent-safe、原子、冲突感知；用户或外部修改不能被静默覆盖                                                |
| shell/process       | supervised、输出有界、cancel/timeout/App shutdown 后整棵树无残留                                        |
| Git/Diff/Checkpoint | 变化可见、可复核，partial failure 后能用现有 owner 有界撤回                                             |
| task loop           | test→fix→retest；Root 读取真实结果后再结算                                                              |
| review              | bounded reviewer 引用真实 file/diagnostic/test evidence                                                 |
| Goal/Todo           | 当前 Thread 一个 objective + plan；complete/blocked/wait 与 no-progress guard                           |
| dynamic composition | 结果驱动的串行、并行、branch/join、review-rewrite；简单任务默认 Root-only                               |
| control/recovery    | targeted child stop、parent stop-all、abort、reopen；crash 后 interrupted、无 orphan/重复副作用         |
| permission          | child ≤ Root；角色名不是权限；post-bind tool ceiling                                                    |
| exact model         | explicit → role default → inherit；unavailable fail closed；无 silent fallback                          |
| Skills/MCP          | identity、冲突、JIT、真实 unavailable；不复制 catalog/credential owner                                  |
| economics           | request receipt 区分 reported/estimated/unknown，包含 schema/prefix/token/cache/cost/latency            |
| packaged release    | 同一 frozen SHA 的 macOS、Windows、Linux install/open/task/cancel/close/reopen/update 与签名/发行 proof |

## 4. 最小 runtime 设计

### 4.1 一个 delegation tree

Root turn 创建一个短生命周期 Host。Host 管理本次 delegation tree 的 child records/controller，并在 Root settlement、abort、timeout、Session shutdown 时统一 dispose。

Host 只需要窄合同：

```text
spawn(task, role, exactModel?, mode)
stop(childIdentity)
steer(childIdentity, message)?
background(childIdentity)?
snapshot(childIdentity)
dispose()
```

optional method 只有真实实现时才投影给 UI。completed child resume、child steer 等不因上游内部存在就自动成为产品能力。

### 4.2 指令组装

child 不应自己重新扫描一套 context files，也不能只得到 generic role prompt。正确组装是：

```text
canonical Root effective instructions（稳定前缀）
  + 真实 cwd/git/env 的安全投影
  + child role/权限/任务边界（短尾部）
```

如果 Root prompt 包含仅适用于 Root 的工具声明或 UI 能力，Host 必须通过现有 prompt owner做窄翻译，不能原样制造“prompt 说能用、tool ceiling 却禁止”的矛盾。

### 4.3 权限与写入

有效 ceiling：

```text
Root capability ceiling ∩ role ceiling ∩ per-call allowlist
```

并在 Extension/Skill/MCP bind 后再次收口。Explore、Research、Review 是意图标签，不是权限证明。当前 Research 先准确表示 local/repo evidence research；外部 web research 只有通过现有 Browser/Search/Gateway owner独立准入后才开放。

写入合同不是“整个 App 同 workspace 只能有一个 writer”：

- 同一 active Root delegation tree：Root 或一个 foreground child 写，不能两个；
- 不同 Thread、用户编辑器和外部工具可并存；
- structured mutation 使用现有 observed version + atomic replacement；冲突 fail closed 并进入 Diff/Review；
- 只有 falsifier 证明乐观冲突检测不足，才考虑 workspace-scoped lease。

### 4.4 终态与恢复

至少保留：`completed / failed / cancelled / timed_out / crashed / interrupted`。App/Server 崩溃后不要求复杂 mid-flight 自动续跑；重开时准确 interrupted、无 orphan、无重复副作用，由 Root/用户决定重试。

## 5. 上游处置

### 5.1 gotgenes `19.2.2`

Exact identity：`@gotgenes/pi-subagents@19.2.2`，tag commit `4a9c57307b711e2b0694d86ad0e0b74cc13ce7e8`，integrity `sha512-EJgGb+NfSp7bEqCyy+N1e6zfTpkb3kLtR5HlPfpyEsWV9BRXWWpF4q6vs41flmRz3Uvlc22iqq9mmcSmByGn4g==`，shasum `ffe9453ace5438a46a48cb305ae458d38a3805b2`，MIT。旧 Gate A 证明 artifact/source matched、原样及 Pi `0.84.1` 兼容下 typecheck 与 `1175/1175` tests通过；这些证据重进 latest main 前仍需按变化范围复验。

**Fork/bridge narrowly candidate**。保留 manager/session/FIFO、listener teardown、late-result suppression、steer/resume/result consumption、retention、abort/wait/dispose 等作者已处理的冰山；不采用 root extension 产品入口。

最小 upstream delta 只允许：公开 Host entrypoint、post-bind tool ceiling、Host-owned/disabled retention timer，以及 OmniMind launcher/path/model/permission 注入。若修改扩散进 executor/session terminal/recovery state machine，立即重新 Gate A。

### 5.2 nicobailon `0.48.0`

Exact identity：`nicobailon/pi-subagents@0.48.0`，commit `56f9723416a6a3833a98de1cce7095f309a15574`，integrity `sha512-/hefBGVzwYqn8hEIhNjwkAuK3G57DbIPEgwlcxq86lF2p4VTF6mEx5SRCezeYA5xt+TjzhYzQZHadMtShyMoYQ==`，shasum `ce0f70e6ddf10774abff9e17d5effd5d9122a1cf`，MIT。旧 Gate A 为 typecheck、integration `757/757`、unit `1850 pass / 1 fail / 2 skip`；唯一 unit差异与 Node 25 malformed LSP timeout相关，产品/packaged未证明。

**Donor/challenger**。它的 lease、atomic state、recovery、process-terminal proof、budget/worktree/workflow mechanisms 有研究价值，但默认 root extension 同时带 Mission/Fleet/Schedule/TUI/installer/share、global state、`.pi` namespace和 stock Pi CLI launcher，不进入 OmniMind product runtime。

### 5.3 Direct Pi

**Comparator/defer**。Pi 最新 AgentHarness/SessionRepo/JSONL conformance 降低未来 session/tool injection 成本，但尚未提供完整 bounded-child manager/control/terminal runtime。只有 public harness 真正实现 prompt/abort/steer/resume/wait/lane/run-to-completion 及 admission/late-result/crash conformance 时重开。

### 5.4 明确排除的上游表面

- Fleet：可保留 runtime facts/DTO，禁用 FleetView/TUI/Herdr/Inspector/Project panes；
- Mission：只保留不建立第二产品事实的内部 recovery机制；无 Product Mission、global index、receipt；
- Schedule：不进入 Agent Core；Automations 已拥有 schedule owner；
- Workflow VM：源码可随 ancestry 保留，默认不注册、不进 schema/prompt；仅 native Root/child composition 被 outcome harness 证伪时重开；
- Worktree：候选保留、首发非默认，启用时复用现有 Git/worktree owner；
- Watchdog：首发非默认，review 先用普通 reviewer；
- installer/self-update、share/Gist、management commands：不发行、不执行、不进入 model-facing surface。

## 6. 经济性与默认策略

“Pi 简洁”不自动推出 OmniMind 更快、更便宜。每个 request receipt 至少保存或可重建：

- exact model resolution origin；
- ordered tool manifest digest、provider-encoded schema bytes；
- stable prefix digest/bytes；
- input/output/cacheRead/cacheWrite 的 reported/estimated/unknown provenance；
- billed/estimated/unknown cost；
- child duplicated context；
- TTFR、总延迟、settlement/recovery/abort-to-idle。

用同一小型代表性 corpus 比较 Root-only 与 child；nicobailon/Direct Pi 只在需要时作隔离 comparator。child/parallel/额外模型只有在质量不下降，并在 wall-clock、成本或上下文隔离至少一项产生真实收益时，才进入默认策略。简单任务必须保留 Root-only 低成本路径。

## 7. UI 原则

用户只看到 OmniMind、普通工具和 Workbench，不需要理解 Core、Pack、Fleet、Mission 或 Workflow。

bounded child 复用现有 `ComposerSubagentStrip`、child Thread/detail、Timeline、Files/Diff：

- 只显示 adapter 实际支持的 stop/background/message；
- status、role、控制、ARIA/title 全部进入同一中英 catalog；模型、路径、命令和诊断保持原文；
- `timed_out/crashed/interrupted/unknown` 不折叠成虚假的 completed/failed；
- 不新增 Team builder、Agent dashboard、24×8 glyph system、workflow graph 或 Capability Center。

只有真实 dependency facts、规模和用户判断需求证明现有列表/详情不足时，才重开图形 renderer。

## 8. Source 可持续性

唯一 source evidence owner 必须集中记录：

- upstream URL/version/commit/npm integrity/license；
- shipped package/exports 与 product import/runtime activation 的区别；
- patch inventory：原因、owner、测试、upstreamable、删除条件；
- patch LOC/files、真实 source touch points（生成 d.ts 单列）；
- upstream tests保留率与 OmniMind delta tests；
- adjacent-version conflict rate、一次 sync 耗时、packaged reproducibility；
- accepted/rejected upstream collaboration；
- rollback/deleteability。

当前原则是保留 ancestry 与完整 package bytes/exports，OmniMind product code 只 import/activate Host。不得为了字面“干净”物理大删，也不得让窄 patch 一年后变成本地孤儿。

## 9. Stop conditions

出现任一情况停止 Agent Core 扩张：

- child 丢失 effective instructions 或形成第二 instruction discovery owner；
- targeted child control 会误杀 Root/sibling，或 UI 显示不可用动作；
- 写入可静默覆盖用户/外部修改；
- secret 经 argv/log/宽 env 传播；
- `.pi` 被 OmniMind Agent 读写；
- silent model fallback、第二 Provider/credential/model owner；
- 第二 permission、scheduler、Mission/Fleet/UI/Workflow owner；
- patch 扩散进 executor/session terminal/recovery state machine；
- real outcome/economics 不优于 Root-only；
- Windows/Linux/macOS 任一平台的进程树或 packaged journey无法闭合。

## 10. 新会话的正确理解

1. Agent execution foundation 有 donor candidate；first-public mature Agent 尚未完成。
2. 先读最新 `main`，不要从旧分支恢复实现假设。
3. 第一 falsifier 是 child effective instructions，其次是 targeted control 和 no-silent-overwrite。
4. gotgenes 选择是 structural/boundary selection，不是已完成 outcome benchmark。
5. B4 只证明 tree-local writer；B5 只证明 focused process cleanup。
6. Goal、workflow、economics、search/context 和 release 都不能被“已经有 subagent”替代。
