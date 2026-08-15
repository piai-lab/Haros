# OmniMind Agent Core：零历史执行指南

> 证据日期：2026-08-15
>
> 角色：告诉一个没有聊天历史的新 Agent 如何定位、实施、验证、停止和维护。
> 权威：本文不是当前施工许可；是否能写代码只看 `execution-brief.md`。

## 0. 一页结论

当前状态必须准确表述为：

```text
Agent execution foundation donor candidate：有
latest main 上的 OmniMind bounded child：无
first-public mature OmniMind Agent：未完成
same-SHA macOS/Windows/Linux release：blocked
```

不要合并 `codex/agent-core-ui-spec`。它只提供 gotgenes Host、focused tests、process harness 和反证入口。所有未来实现从最新 `main` 开始，按责任选择性移植。

若这些层次逐项获得准入，依赖顺序是：

1. C0 truth convergence：文档和唯一 owner 对齐；
2. C1 Agent correctness：指令继承、精准 child control、无静默覆盖、完整终态与 role default；
3. C2 economics truth：request receipt 与 Root-only/child paired outcome；
4. C3 mature Root task loop：Goal/Todo/settled continuation/test-fix-retest/review-rewrite；
5. C4 search/context quality：complete/truncated/incomplete，只有被证伪才加更重检索；
6. C5 同一 frozen SHA 的三平台 packaged/signing/update/fresh audit。

前一层没有形成 candidate，不横向铺开后一层；**哪一层是当前 next action 只看 `execution-brief.md`。**

## 1. Preflight

每次开始按仓库 `AGENTS.md` 读取：

1. `README.md`；
2. `PI-ECOSYSTEM-INTAKE.md`；
3. `architecture/README.md` 及 Execution/Product State/Workbench owner；
4. `execution-brief.md`；
5. active Mission；
6. 本设计与相关 exact-source evidence。

然后记录：

```text
workspace / branch / HEAD / origin:
dirty paths and owner:
current execution admission:
exact source/artifact/profile:
current main integration symbol or explicit absence:
one user-visible outcome:
primary falsifier:
forbidden paths/actions:
```

若 dirty 文件来源不明，保留并绕开。不得把旧分支、聊天摘要、旧 worktree 或研究日期当实现基线。

## 2. 当前状态矩阵

| 分类            | 项目                                                                                                                   | 当前事实                                | 证据/owner                               | 最小 falsifier                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| Done，勿重做    | Product Thread/runtimeMode、Provider Registry、Pi model/auth/config、Workbench、Gateway、Workspace/Git/Diff/Checkpoint | latest `main` 已有唯一 owner            | architecture + current code              | 是否出现第二 owner                              |
| Done，勿重做    | Synara Subagent UI、child Thread/event projection                                                                      | 已服务 Engine-native能力                | current `ChatView`/Provider runtime path | 不能据此声称 Pi child 已存在                    |
| Donor candidate | gotgenes Host read-only/parallel/background/writer                                                                     | 旧分支 focused evidence存在             | `05c0bed2f…ee6c17c09`                    | 在 latest main 重放边界是否仍成立               |
| Donor candidate | Windows/Linux process-tree cleanup                                                                                     | focused harness 四类归零                | B5 commits                               | packaged App、uncatchable crash 未证明          |
| Partial         | exact model                                                                                                            | donor 实现 explicit→inherit             | old Host                                 | role default missing                            |
| Partial         | writer safety                                                                                                          | 只证明 same Root tree unique writer     | old Host local `writerActive`            | 双 Thread/外部编辑能否静默覆盖                  |
| Missing/P0      | child effective instructions                                                                                           | old assembler忽略 parent prompt/cwd/env | old Host call chain                      | Root 不重复规则时 child 是否违反 `AGENTS.md`    |
| Missing/P0      | targeted child stop                                                                                                    | old PiAdapter忽略 `providerThreadId`    | UI→Service→Adapter path                  | stop A 是否误杀 Root/B                          |
| Missing/P1      | child message/steer                                                                                                    | UI 可达，Pi adapter无实现               | current capability path                  | unavailable action是否仍显示                    |
| Missing/P1      | structured terminal/reopen                                                                                             | crashed/interrupted及完整投影缺失       | contracts/UI/persistence                 | crash/reopen是否准确且无重复副作用              |
| Missing/P1      | conflict-aware mutation                                                                                                | Pi edit/write未证明接现有 FS guard      | WorkspaceFileSystem owner                | external edit是否被覆盖                         |
| Missing         | economics                                                                                                              | unknown折叠为 zero，未跑paired corpus   | usage owner                              | 0 与 unknown能否区分                            |
| Missing         | mature task loop                                                                                                       | child primitive不等于成熟 Agent         | first-public baseline                    | 多步任务能否主动推进并正确停止                  |
| Correct defer   | Memory/Knowledge、VM、workflow graph                                                                                   | first-public不需要                      | architecture/research                    | raw files+rg/read真实失败才重开                 |
| Release blocker | three-platform distribution                                                                                            | focused CI不等于发行                    | Mission/release owner                    | same SHA install/open/task/cancel/reopen/update |

producer 只能提交 candidate。旧分支各自绿色与 latest main 的绿色不能相加成 merged candidate；合流后必须按受影响范围重放。

## 3. C0 — Truth convergence

### Outcome

零历史 Agent 只读 architecture、execution brief、Mission 和本研究，就能准确回答：完成了什么、没完成什么、下一 Slice 是什么、何时停止。

### 必须收口

- 删除 Capability Pack 产品层、自动 Memory/Knowledge first-public承诺、Team/Fleet/Mission/Workflow平台和100+ Agent图形施工假设；
- 明确 source retained / shipped bytes+exports / runtime activation；
- B0 从“outcome harness完成”降级为 structural/boundary selection；
- B4 改为 tree-local unique writer + cross-owner no-silent-overwrite；
- B5 改为 focused process safety，不是三平台发行；
- `codex/agent-core-ui-spec` 标成 donor only；
- execution brief 只准入一个后续 correctness Slice，不准入 Goal+economics+release 全家桶。

### Exit

文档 contract/links 通过，`git diff` 没有非 Markdown 实现。C0 自身不证明 C1 已实现。

## 4. C1 — Agent correctness

这是第一个代码 Slice，但只有 `execution-brief.md` 和维护者明确授权后才能开始。

### 4.1 Effective instructions（第一个 falsifier）

建立任务专用 repo：

1. 在作用域内放一份有可观察效果、无危险副作用的 `AGENTS.md`；
2. 规则禁止修改某文件，并要求 marker 或指定测试；
3. Root 的 delegate task 不重复规则；
4. Implement 与 Review child分别执行；
5. 观察 child actual system prompt/trace与行为；
6. 核 stable prefix bytes/cache identity。

若失败，修复只能走 canonical Root effective-instruction projection。`noContextFiles:true` 可以保留以避免双 owner，但必须真的把 Root effective instructions、cwd 与安全 env/git facts传入；不能同时让 child自行扫描第二遍。

Exit：Root/child同 scope遵守同一指令；权限/工具描述不矛盾；前缀稳定且无不必要上下文复制。

### 4.2 Targeted child control

最小控制矩阵：

| 场景                      | 必须结果                                          |
| ------------------------- | ------------------------------------------------- |
| 单 child完成              | completed，Root继续                               |
| A/B并发，stop A           | A cancelled；B继续完成；Root继续综合              |
| stop terminal/stale child | fail closed/idempotent，不 abort Root             |
| parent stop               | 所有 active child停止，整棵进程树归零             |
| writer stop               | 只停止 writer，late write被抑制，Root收到准确终态 |
| child message             | 只有 adapter/Host能力存在时显示并准确送达         |
| App/Server crash          | reopen为 interrupted，无 orphan/重复副作用        |

最小实现复用 Host 已有 record/controller identity，按 `providerThreadId/toolCallId` 暴露窄 control seam；不得新建第二 task registry/queue/control plane。

在能力闭合前，隐藏或禁用 Pi不可用的 per-row stop/message 比显示假功能更诚实。长期目标仍是精准控制，不是永久删按钮。

准确区分：

- Root turn steer：现有路径；
- child in-flight steer/message：需单独实现/证明；
- targeted child abort：需单独实现/证明；
- parent stop-all：另一语义；
- completed child resume：上游内部存在不等于产品支持；
- crash 后 mid-flight 自动续跑：明确不要求。

### 4.3 Writer 与并发修改

合同：同一 active Root delegation tree 中 Root 或一个 foreground child写；不同 Thread/外部编辑器允许并存，但不能静默覆盖。

Falsifier：

- 两个 Product Thread 指向同一 workspace；
- child读文件后，另一 Thread/用户编辑器修改；
- child尝试 edit/write；
- 必须通过现有 `WorkspaceFileSystem.expectedVersion`/atomic path得到 conflict/deleted，而不是覆盖；
- partial writer failure后 Files/Diff/Git/Checkpoint能说明当前状态并有界撤回。

先复用现有 owner。只有乐观冲突检测被真实反例证明不足，才讨论 workspace lease；禁止预建全局 Writer DB。

### 4.4 Model、权限与 terminal

- 模型解析补齐 explicit → role default → inherit；role default读取同一 `.omnimind` Model/Auth owner；
- exact unavailable准确失败，禁止 fallbackModels；
- child ceiling = Root ∩ role ∩ per-call，并在bind后收口；
- terminal至少含 completed/failed/cancelled/timed_out/crashed/interrupted；
- Root根据每个终态显式决定下一步；
- usage字段保留unknown，不在C1复制Model Services economics owner。

### 4.5 产品投影

Provider event → WorkLog → Subagent Strip/detail/Activity → SQLite → reopen 对每个 terminal逐项一致。Pi只显示真实 supported control。所有新增/修改的status、role、control、ARIA/title同时交付简中/英文；exact model/path/command/diagnostic保持原文。

C1 Exit：上述falsifier通过、无第二owner、没有开始Goal/economics/search/release。

## 5. C2 — Economics truth

### Outcome

用事实回答“什么时候委派更好、更快或更便宜”，并防止默认增加token。

### Request receipt

复用Model Services/Provider usage owner，保存或可重建：

- exact model及解析来源；
- ordered tool manifest digest与provider-encoded schema bytes；
- stable prefix digest/bytes；
- input/output/cacheRead/cacheWrite的reported/estimated/unknown；
- billed/estimated/unknown cost；
- child duplicated context；
- TTFR、total、settlement/recovery/abort-to-idle。

数字缺失是unknown，不是0。

### Paired outcome

同一小型代表性corpus比较Root-only和gotgenes child：任务质量、用户修改保护、恢复真实性、wall-clock、token/cache/cost与维护税。nicobailon/Direct Pi仅在结论需要时作隔离 comparator。

默认delegate必须同时满足：质量不下降，并在时间、成本或上下文隔离至少一项有真实净收益。否则简单任务继续Root-only。

## 6. C3 — Mature Root task loop

### Outcome

不是“有subagent”，而是能把真实软件任务推进到完成、阻塞或等待。

最小语义：

- 当前Thread一个objective + Todo/plan；
- true settlement后继续；
- complete/blocked/wait；
- stale goal ID、supersession、pending/queued input、no-progress、compaction guards；
- child terminal后Root明确选择下一步；
- test→fix→retest；
- bounded reviewer引用真实file/diagnostic/test；
- Implement→Review→Rewrite有界回环。

donor只取机制/测试：pi-goal settled guards、Qwen late-write/resume-blocked、Codex plan/child wait-resume、OpenCode Todo/Task/compaction、moonpi Plan→Act。不要采用它们的Goal DB、daemon、UI或product defaults。

不默认Workflow VM、DAG、best-of-N或不同child model。后两者只有C2证明净收益才启用。

## 7. C4 — Search/context quality

先闭合简单工具的真相：

- bounded read/search；
- complete/truncated/incomplete；
- output cap与诊断；
- repo instruction scope；
- 最小source packet；
- native session/compaction。

只有代表性任务证明当前路径在发现率、定位或token经济上失败，才比较OpenCode LSP contract、Qwen reliability corpus、Aider RepoMap等donor。Memory/Knowledge继续defer。

## 8. C5 — Frozen three-platform release

同一frozen SHA必须证明：

- macOS、Windows、Linux install/open/真实Agent task/cancel/close/reopen/update；
- macOS Developer ID/notarization/staple；
- Windows signing；
- public artifacts/update manifest；
- update失败retry、authority-owned手动下载、reinstall恢复；
- uncatchable crash/reopen；
- fresh independent completion audit。

focused Windows/Linux process-tree tests只是C1/C5输入，不能关闭release gate。

## 9. Upstream harness与维护

三层、克制的harness：

1. upstream：尽量原样保留作者 cancellation/parallel/FIFO/listener/late-result/abort/wait/dispose等测试；
2. OmniMind boundary：`.pi`零读写、`.omnimind` scope、双Thread隔离、exact model、child≤Root、instruction inheritance、targeted control、no orphan、prompt/schema成本；
3. outcome：Root-only/selected child在小型真实corpus比较结果与经济性。

不要建设永久benchmark平台。

source evidence集中记录exact base、integrity、license、patch inventory、source touch points、upstream tests保留率、adjacent-version冲突率/sync耗时、upstreamable状态、rollback/deleteability。若patch进入executor/session terminal/recovery state machine，立即重新Gate A。

## 10. 全局停止条件

- current execution brief未准入；
- child丢Root effective instructions；
- targeted stop误杀Root/sibling；
- UI承诺adapter不存在的control；
- 静默覆盖用户/外部修改；
- secret进入argv/log/宽env；
- `.pi`读写或第二Model/Auth/Permission owner；
- Mission/Fleet/Schedule/VM/Workflow DB/Router进入默认runtime；
- 为了测试重做上游lifecycle；
- paired outcome不优于Root-only；
- 同一失败无新假设重复；
- 局部绿色被扩大为mature Agent或三平台release。

## 11. 单Slice交接

```text
Exact main SHA / source identity:
Admitted slice:
User outcome:
Existing owners reused:
Changed paths:
Primary falsifier and result:
Real-provider/packaged evidence level:
Unsupported higher claims:
Rollback/deleteability:
Next slice: not admitted | exact owner reference
```

完成一个Slice即停止。新发现若不阻断当前结果，记录为下一独立Slice，不能吞入当前施工。
