# OmniMind 当前执行简报

Updated: 2026-08-18

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

在已经闭合的 Synara exact `8f9f60045ea652db7d4a6822e2f723dde073f40a` adoption 上，完成一项已获维护者明确裁决的下游产品收口：整体退休 `Project instructions`，保留 Thread-level Notepad。

1. 删除 Environment UI、Settings 开关/search、localStorage store、autosave、手动 copy/append 与全部专属中英文 catalog；
2. 删除本地草稿首次发送和 Automation 草稿 promotion 对 Thread notes 的隐藏预填；
3. 不改名、不改造成说明或 Prompt 管理，不迁移旧文本，不扫描或重写既有 Thread notes；
4. 保留 Notepad 的 Thread metadata、command/event/projection、保存失败与恢复路径；
5. 记录为对 Synara 母体的已确认下游 divergence，防止未来 intake 静默带回。

## 当前事实

- OmniMind 工作区：`/Users/liuzaoqu/Desktop/Develop/independent/OmniMind`，当前分支 `main`；原 Synara adoption 分支已删除，历史 authority closure 仍可由 `72eaf86219e369ea8227639f71a5a1b634667d25` 追溯。
- 本地与远端 `main` 已在不改写历史的前提下合入 Thinking-status 更新、维护者已有的 scoped-adoption 文档提交与 exact pushed product `3077bf253`。
- Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `8f9f60045ea652db7d4a6822e2f723dde073f40a`，等于 `origin/main`。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `3077bf253` 已直接复用现有 `ProviderIcon`、Server health 与 Composer availability 语义，补齐中英文图标/可用/登录/受限/未安装/不可用反馈，并保留未安装 Engine 的设置可达性。当前安装版及 arm64 ad-hoc DMG 均来自该 exact pushed product；fresh 隔离 profile 已证明图标、状态、可用数量、未安装 Engine 可发现性和关闭重开。
- Synara `af9c36465` 有意增加了 per-Project localStorage→Thread notes seed，`bdfc332a8` 又专门通过 `thread.meta.update` 修复首次发送持久化；它是真实 notes-template 功能，但不是 Agent runtime Project rules。维护者于 2026-08-18 在知晓这项行为和损失后明确确认整体退休，并接受不再提供 Project→new-task Notepad seed。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销；它们不能再阻挡母体能力采用。`research/omnimind-agent-core-execution-guide.md` 只保留验证参考。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

本轮只退休 Project instructions 全链路并保护 Notepad；不启动 Prompt manager、OmniMind 默认身份改造或其他 Agent Core/Workbench/Provider 工作，不重开其余 Synara adoption。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。维护者要求本项工作停留在独立分支/隔离 worktree，暂不 merge、push 或删除分支；因此当前交付边界是本地 source candidate，不冒充 pushed-SHA packaged/installed product。既有签名、公证、Windows/Linux artifact/journey、GitHub Release 与 update feed 边界不变。

## 下一动作

完成本地 source candidate 的提交后等待维护者决定何时 push；只有获准 push 后，才更新 README production adoption/evidence SHA，并从该 exact pushed SHA 重建、安装和执行 fresh-profile/reopen journey。Prompt 管理产品化继续停在独立决策面，不随本次退休顺带启动。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定 falsifier：[`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
