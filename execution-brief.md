# OmniMind 当前执行简报

Updated: 2026-08-18

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

`Project instructions` 全链退休与 bundled OmniMind 默认身份/Chat-Agent 分层已通过 exact pushed merge `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 合入并安装验证：普通 OmniMind 会话不再继承 Pi coding-assistant 身份，且用户已确认的理解、提问、拔高、执行与风险边界在启动、重载、恢复和 Provider replacement 后保持一致。

1. 只修改 `omnimind` Provider 的产品身份和行为；stock `pi` 及其他 Engine 保持原生 identity；
2. 内置不可覆盖的共同 identity/cognitive contract，并按 canonical Project kind 投影 `Agent` 或 `Chat` 行为；不从 cwd、路径名称或 Provider options 猜测工作方式；
3. `project` 映射为 Agent，`chat`/`studio` 映射为 Chat；该投影只作为现有 Provider Session binding 的恢复快照，不成为第二持久 authority；
4. canonical folder-backed Project 只在正式 Agent Session admission 后显式 trusted，Project rules 只从 Project/worktree root 到当前 cwd 读取；Chat/Studio 与无 active Session 的被动 discovery 都保持 untrusted/global-only，不执行 Project Extension；
5. 保留 Pi 原生 dynamic tools、Skills、Extensions、Prompt files、reload、compaction 与 Session lifecycle，不新增 Prompt store、设置页、隐藏文件或兼容轨；
6. 修正 product-owned default base 中错误的 Pi identity 和未随 archive 发行的 docs/examples 导航，并同步 patch/archive/adoption digest。

## 当前事实

- 本地与远端 `main` 已通过 merge commit `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 合入 Project instructions 退休及 OmniMind identity/surface/trust contract；该提交的第一父提交是当时最新 `origin/main@8066f23f9`，第二父提交是通过 final gates 的任务 head `91f2aebe3`。
- Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `8f9f60045ea652db7d4a6822e2f723dde073f40a`，等于 `origin/main`。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `3077bf253` 已直接复用现有 `ProviderIcon`、Server health 与 Composer availability 语义，补齐中英文图标/可用/登录/受限/未安装/不可用反馈，并保留未安装 Engine 的设置可达性；它是当前 merge 的既有产品基线，不再是当前安装 bytes。
- Synara `af9c36465` 有意增加了 per-Project localStorage→Thread notes seed，`bdfc332a8` 又专门通过 `thread.meta.update` 修复首次发送持久化；它是真实 notes-template 功能，但不是 Agent runtime Project rules。维护者于 2026-08-18 在知晓这项行为和损失后明确确认整体退休，并接受不再提供 Project→new-task Notepad seed。
- `Project instructions` 全链退休、默认身份与边界实现分别冻结于任务提交 `2bd0478a6`、`7f2fdd502`、`8439faeac`，并由 `91f2aebe3` 完成合并前文档/格式收口；它们现均是 `b89149f3c` 的祖先，不再是未推送 candidate。
- product-owned `@omnimind/pi-coding-agent@0.84.2` 的 default base 已改为 identity-neutral；Extension turn mutation 后只把 Host-owned OmniMind engine contract 去重、追加为 exactly once。general Host/tool guidance 保持 mutable append，不因身份改造冻结已知 Browser/Device policy 漂移；stock Pi 的 identity/default base 不变。
- Provider admission 从同一份 canonical Project snapshot 派生 surface、effective cwd 与 Project/worktree root，只为 bundled `omnimind` 随现有 binding recovery/rollback 传递，其他 Provider admission 丢弃这些字段。Chat 与无 active Session discovery 保持 untrusted/global-only，skills/commands 的 Thread/Session key 变化使用固定空 placeholder，不会短暂沿用上一 trust tuple。
- exact merge 的全量测试、typecheck、build、lint、document contract、license、Pi fixed-revision 325/325 与 deterministic archive 均闭合；macOS arm64 DMG SHA-256 为 `86857d371a0555f1e760b693993ed621335676d5da296a2f6165d262cdb4dea3`。当前 `/Applications/OmniMind.app` 的 embedded commit/lockfile 指向该 merge，fresh 隔离 profile 已完成启动、Server ready、优雅关闭、重开与再次关闭。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 管理覆盖的 engine contract；未来 Prompt 管理只管理个人指令、项目规则和模板。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销并从当前文档树删除；它们不能再阻挡母体能力采用，历史仍可从 Git 追溯。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

本次已合入范围只包含 OmniMind 默认 identity/cognitive contract、Chat/Agent overlay、Project trust/context boundary、为此必需的 Session admission/recovery 接线，以及 Project instructions 退休。没有启动 Prompt 管理 UI、Template CRUD、Host policy 全量 diet、Memory/Knowledge、Workflow、第二 Prompt loader/store 或其他 Agent Core 扩张。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。当前安装产物仍是本地未签名/未公证 candidate；GitHub Release、update feed、签名、公证及 Windows/Linux artifact/journey 未获本轮授权，发行边界保持不变。

## 下一动作

本关注点已关闭，不再扩张 discovery 或 Prompt 管理责任。MiMo Chat 与 DeepSeek folder-backed Agent 的首轮、continuation、identity、surface overlay 及 Extension replacement 已完成脱敏 live probe；request-level 与 packaged evidence 继续保护同一边界。下一产品议题是独立的 Prompt 管理决策面：只管理 OmniMind 引擎使用的个人指令、项目规则和提示词模板，在所有关键细节明确前不进入实现。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定责任：[`architecture/execution.md`](architecture/execution.md)；Pi 外部来源与验证规则：[`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
