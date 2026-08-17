# OmniMind 当前执行简报

Updated: 2026-08-18

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

以 Synara exact `8f9f60045ea652db7d4a6822e2f723dde073f40a` 为当前产品母体完成一次事实闭合的 intake：

1. 保留已有 runtime/security/recovery 更新；
2. 把 Goal 与 Todo 重新分开；
3. 完整吸收 Synara ThreadGoal、Debug、bounded raw events、width/icon、Profile local export、perf harness，并闭合 Group 与不同名 owner parity；
4. 同时完成 commit-range、whole-tree path/behavior 与作者测试 accounting；
5. 代码、README adoption、research disposition、Mission 状态与 exact pushed/packaged evidence 同步收口。

## 当前事实

- OmniMind 工作区：`/Users/liuzaoqu/Desktop/Develop/independent/OmniMind`，当前 adoption 分支 `codex/synara-8f9f600-adoption`；exact pushed product SHA 为 `58f76446d3d7061b7fe18e140fe56676269497c3`。
- Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `8f9f60045ea652db7d4a6822e2f723dde073f40a`，等于 `origin/main`。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销；它们不能再阻挡母体能力采用。`research/omnimind-agent-core-execution-guide.md` 只保留验证参考。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `58f76446d` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 167 OmniMind-only。相对 `056f2835e`，最后的 Web compiler/cleanup 修正使 5 个原本相同的 shared blobs 成为有意分叉；路径集合未变。此前的 168 统计发生在删除无消费者的 `ComposerGoalBanner.tsx` 之前。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会把排序误报为 505/578，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

正在进行：只剩 README、Source Review、Mission 与当前简报的 authority truth-convergence，以及 adoption 分支进入 `main`。产品代码、focused/final gates 与 exact pushed-SHA packaged fresh-profile journey 已闭合。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。维护者已确认永久排除 Synara/DP Code legacy storage migration；Automation 采用连续失败策略，默认 `3`，并提供 `1`/`3`/`5`/持续运行选项。维护者也明确将签名、公证、Windows/Linux artifact/journey、GitHub Release 与 update feed 排除出本轮；本机产物只如实称为 macOS arm64 ad-hoc candidate。

## 下一动作

1. 提交并推送 README+research+Mission+brief 的 authority closure；
2. fast-forward `main` 到完整 adoption set；
3. adoption 闭合后再另行在隔离分支验证 Git ancestry 恢复方案，不把该实验冒充本轮采用证据。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Agent Core 稳定 falsifier：[`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
