# OmniMind 当前执行简报

Updated: 2026-08-18

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

在保留已完成的 `Project instructions` 退休候选之上，完成 bundled OmniMind Agent 的默认身份与 Chat/Agent 行为分层：普通 OmniMind 会话不再继承 Pi coding-assistant 身份，且用户已确认的理解、提问、拔高、执行与风险边界在启动、重载、恢复和 Provider replacement 后保持一致。

1. 只修改 `omnimind` Provider 的产品身份和行为；stock `pi` 及其他 Engine 保持原生 identity；
2. 内置不可覆盖的共同 identity/cognitive contract，并按 canonical Project kind 投影 `Agent` 或 `Chat` 行为；不从 cwd、路径名称或 Provider options 猜测工作方式；
3. `project` 映射为 Agent，`chat`/`studio` 映射为 Chat；该投影只作为现有 Provider Session binding 的恢复快照，不成为第二持久 authority；
4. canonical folder-backed Project 只在正式 Agent Session admission 后显式 trusted，Project rules 只从 Project/worktree root 到当前 cwd 读取；Chat/Studio 与无 active Session 的被动 discovery 都保持 untrusted/global-only，不执行 Project Extension；
5. 保留 Pi 原生 dynamic tools、Skills、Extensions、Prompt files、reload、compaction 与 Session lifecycle，不新增 Prompt store、设置页、隐藏文件或兼容轨；
6. 修正 product-owned default base 中错误的 Pi identity 和未随 archive 发行的 docs/examples 导航，并同步 patch/archive/adoption digest。

## 当前事实

- 当前隔离工作区：`/Users/liuzaoqu/.codex/worktrees/retire-project-instructions/OmniMind`，分支 `codex/retire-project-instructions`；已于 2026-08-18 无冲突重放到当时最新 `origin/main@8066f23f9`，用户要求继续在该分支完成默认身份改造并保持不推送。
- 本地与远端 `main` 已在不改写历史的前提下合入 Thinking-status 更新、维护者已有的 scoped-adoption 文档提交与 exact pushed product `3077bf253`。
- Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `8f9f60045ea652db7d4a6822e2f723dde073f40a`，等于 `origin/main`。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `3077bf253` 已直接复用现有 `ProviderIcon`、Server health 与 Composer availability 语义，补齐中英文图标/可用/登录/受限/未安装/不可用反馈，并保留未安装 Engine 的设置可达性。当前安装版及 arm64 ad-hoc DMG 均来自该 exact pushed product；fresh 隔离 profile 已证明图标、状态、可用数量、未安装 Engine 可发现性和关闭重开。
- Synara `af9c36465` 有意增加了 per-Project localStorage→Thread notes seed，`bdfc332a8` 又专门通过 `thread.meta.update` 修复首次发送持久化；它是真实 notes-template 功能，但不是 Agent runtime Project rules。维护者于 2026-08-18 在知晓这项行为和损失后明确确认整体退休，并接受不再提供 Project→new-task Notepad seed。
- `Project instructions` 全链退休已在当前分支提交为 `2bd0478a6`，focused Web tests、typecheck、lint 与 document contract 已闭合；该提交尚未 push/merge，因此仍是本地 source candidate。
- baseline product-owned `@omnimind/pi-coding-agent@0.84.2` 的 default base 写着 `You are an expert coding assistant operating inside pi` 并引用 archive 中没有发行的 docs/examples；当前本地 candidate 已把 base 改为 identity-neutral，并在 Extension turn mutation 后把 Host-owned OmniMind contract 去重、追加为 exactly once。stock Pi 的 identity/default base 不变。
- baseline Provider start/recovery 没有携带 work surface 或 trusted Project root，Pi-family 依赖 SDK 默认 `projectTrusted=true` 并从 filesystem root 扫描 context files；当前本地 candidate 已从同一份 canonical Project snapshot 派生 surface、effective cwd 与 Project/worktree root，随现有 binding recovery/rollback 传递，并让 Chat 与无 active Session discovery 保持 untrusted/global-only。该 candidate 尚未 push，也未从 exact pushed SHA 打包或安装。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 管理覆盖的 engine contract；未来 Prompt 管理只管理个人指令、项目规则和模板。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销；它们不能再阻挡母体能力采用。`research/omnimind-agent-core-execution-guide.md` 只保留验证参考。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

本轮只完成 OmniMind 默认 identity/cognitive contract、Chat/Agent overlay、Project trust/context boundary 与为此必需的 Session admission/recovery 接线；保留当前分支已完成的 Project instructions 退休。明确不启动 Prompt 管理 UI、Template CRUD、Host policy 全量 diet、Memory/Knowledge、Workflow、第二 Prompt loader/store 或其他 Agent Core 扩张。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。维护者要求本项工作继续停留在同一独立分支/隔离 worktree，暂不 merge、push 或删除分支；因此即使 source、live 与本机 packaged journey 通过，当前交付边界仍是本地 candidate，不冒充 pushed-SHA official release。既有签名、公证、Windows/Linux artifact/journey、GitHub Release 与 update feed 边界不变。

## 下一动作

冻结已经闭合的最小实现，不再扩张 discovery 或 Prompt 管理责任；MiMo Chat 与 DeepSeek folder-backed Agent 的首轮、continuation、identity、surface overlay 及 Extension replacement 已完成脱敏 live probe。继续完成剩余 final gate；由于维护者明确暂停 push，不能从 exact pushed SHA 执行正式 packaged/install journey，交付时必须准确标为本地 source candidate。随后提交本地候选，等待维护者决定何时 push；Prompt 管理产品化继续停在独立决策面。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定 falsifier：[`research/omnimind-agent-core-execution-guide.md`](research/omnimind-agent-core-execution-guide.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
