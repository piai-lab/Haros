# OmniMind Agent Core 验证参考（已退休施工门）

> 证据日期：2026-08-17
>
> 角色：保存 Agent Core 的稳定 falsifier、proof protocol 与 stop-loss。
>
> 非权威：本文不定义阶段、施工顺序、当前状态或准入。历史 C0–C5 路线已被维护者撤销；维护者确认完整 source decision surface 后，不需要本文或 `execution-brief.md` 再次批准。

## 1. 当前产品基线

- OmniMind 直接继承 Synara 的 Product Orchestration、Thread、Queue、Workbench 与 Provider substrate。
- Synara ThreadGoal 是该同一 Orchestration 内的成熟产品能力，不是外部 Goal DB 或第二控制面。
- Goal 与 Todo 分离：Goal 是用户明确设定、跨 turn 持久追求的 objective；Todo 是 Provider 逐回合 task snapshot。
- bundled OmniMind Agent 与 stock Pi 共用窄 Pi-family adapter core，但 identity、Session、state root、Package state 与 diagnostics 隔离。
- `codex/agent-core-ui-spec` 与 gotgenes 只作 bounded-child donor/evidence，不整体合并。

当前实现与 source adoption 状态只看代码、README、`research/source-review.md`、active Mission 和精简的 `execution-brief.md`，不能从本文推断。

## 2. Effective instructions

代表性 falsifier：

1. 在任务作用域放置一份有可观察效果、无危险副作用的 `AGENTS.md`；
2. Root 委派时不重复规则；
3. Implement 与 Review child 分别运行；
4. child 必须使用 canonical Root effective instructions、cwd 与适用 project instructions；
5. prefix bytes/cache identity 保持稳定，不出现第二 instruction discovery owner。

若 `noContextFiles:true`，Root 必须已经准确投影 instructions；不得让 child 再扫描一遍制造双 owner。

## 3. Bounded child control

| 场景 | 必须结果 |
| --- | --- |
| 单 child 完成 | `completed`，Root 继续 |
| A/B 并发，stop A | A cancelled；B 与 Root 不受影响 |
| stop stale/terminal child | fail closed 或 idempotent，不 abort Root |
| parent stop-all | active children 停止，进程树归零 |
| writer stop | late write 被抑制，Root 收到准确 terminal |
| child message/steer | 只有真实 adapter/Host 能力存在时显示 |
| App/Server crash | reopen 为 `interrupted`，无 orphan 或重复副作用 |

Root steer、child steer、targeted child abort、parent stop-all、completed-child resume 和 crash recovery 是不同语义，不能用一个绿色路径替代其余路径。

## 4. Writer 与并发修改

同一 active Root delegation tree 内只允许 Root 或一个 foreground child 写。不同 Product Thread 与外部编辑器可以并存，但结构化修改必须复用 `WorkspaceFileSystem.expectedVersion`/atomic conflict truth。

最小反例：child 读文件后，另一 Thread 或用户编辑器修改；child 随后写入必须得到 conflict/deleted，而不是覆盖。只有该 owner 被真实反例证明不足时才讨论更重 lease；不预建 workspace-global Writer DB。

## 5. Model、权限、terminal 与 economics

- exact model：本次显式选择 → 已配置角色默认 → inherit Root；不可用准确失败，禁止 silent fallback。
- child capability：Root ceiling ∩ role ceiling ∩ per-call allowlist，并在 Extension/Skill/MCP bind 后再次收口。
- terminal 至少区分 `completed / failed / cancelled / timed_out / crashed / interrupted`，并在 event、WorkLog、UI、SQLite 与 reopen 一致。
- usage 缺失是 `unknown`，不是 0；若要声称委派更快或更便宜，必须用同条件 Root-only/child paired outcome 比较质量、修改保护、恢复、wall-clock、token/cache/cost 与维护税。

## 6. Goal 与 Todo

Goal 应尽量 follow Synara 母体全链，并在同一 Thread/Orchestration owner 内验证：

- bounded contract、command/event/projection、SQLite/reopen；
- `/goal` set/show/edit/pause/resume/clear 与 Composer stacked panel/timer；
- achievement 记录、elapsed time 与 terminal-turn footer；
- Provider prompt injection 把 objective 当 untrusted user data；
- MCP set/achieved/blocked，要求显式用户 Goal intent；
- clean terminal 后 continuation；startup recovery；plan-mode release；
- user Queue、approval、user input 优先；blocked continuation 有界重试；
- stale goal/timestamp、pause/stop race 与 accepted-turn interrupt fence；
- failed/aborted/cancelled/interrupted/start-timeout 自动暂停；
- Todo 继续作为逐回合 task projection，不承担 Goal persistence 或 achievement。

OmniMind 只做品牌、双语、namespace、Provider 与安全适配；不得把这条成熟生命周期降格成提示词或单次 task-list 工具。

## 7. Search/context 与三平台交付

Search/context 先证明 bounded read/search、`complete / truncated / incomplete`、output cap、instruction scope 和 native compaction；只有真实 outcome 缺口才引入 LSP/RepoMap/Memory 等更重责任。

改变 Desktop 用户可观察行为的最终候选仍要从 exact pushed SHA 构建，并在任务专用 fresh profile 证明启动、真实 journey、失败/取消、关闭和重开。macOS、Windows、Linux、签名/notary、update 与 public release 各自只由真实平台证据关闭。

## 8. 全局 stop-loss

- child 丢失 Root effective instructions；
- targeted stop 误杀 Root/sibling；
- UI 承诺 adapter 不存在的 control；
- 静默覆盖用户或外部修改；
- secret 进入 argv、log、宽 env、cache 或模型上下文；
- `.pi` 被 OmniMind Agent 读取/写入；
- 真正出现与 inherited Product Orchestration 并行的第二 owner；
- abort/timeout/retry/settlement 没有唯一 terminal truth；
- 为追绿色重做上游生命周期或把局部证明扩写成完整产品/发行结论；
- 同一失败没有新假设仍重复 probe。

这些条件约束实现质量，不构成固定阶段或对维护者已确认采用决定的二次否决。
