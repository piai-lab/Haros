# OmniMind 当前执行简报

Updated: 2026-08-19

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

Agent tools Gate B 已完成 source integration：AgentGateway Host tools 只在 canonical `omnimind` Provider 中作为 named hidden Pi Extension 参与原生 Dynamic Tool Loading，同时保留 stock Pi 与其他 Engine 的 direct/eager projection。当前职责是维持该 owner 边界与证据门槛，不再保留并行候选路线。

1. 一份 AgentGateway canonical catalog 同时拥有 name/schema/group、availability、execution 与 call-time policy；
2. fresh 默认开放的 Built-in tools policy 覆盖所有 Agent，新 Session 过滤、旧 Session 新调用实时拒绝；
3. OmniMind Host Extension 只注册和 additive 激活自己的 Gateway names，不识别其他 Extension、Todo、Bash、Skills、Packages 或第三方 MCP；
4. Goal continuation 与 Automation envelope 在同一 request 前只 additive ensure 其明确要求的 bounded closure，职责结束不卸载 schema；
5. Todo 继续是独立的 product-bundled Pi Session Extension，只在 OmniMind Agent work surface initial-active；
6. Settings 只新增 Built-in tools，并把现有连接页准确呈现为 External connections；第三方 MCP Settings 继续退出首版。

## 当前事实

- Agent tools Gate B 的 source integration 由 merge commit `e7137c7dc873400d9a801f333f41e278e544e001` 锚定：`f08872595`到`d3cf632c7`依次闭合authority、Todo、External connections、Built-in policy、prompt diet、Host Extension、OmniMind-only dynamic loading、call-time/lifecycle矩阵、产品词汇与exact provider wire；`8186e5245`与`f6d9465bb`完成合并前产品文案、可访问性和证据状态审查。安装、签名、公证与Release仍是独立交付边界。
- 当前candidate的focused/full gates通过：Server 362个test files/4251项通过（另3 files/16项skip），Web 322 files/4108项通过；document contract 20/20、typecheck、lint（0 error，保留482条既有warning）、licenses与changed-file format通过。全仓`fmt:check`仍命中83个既有无关文件，未扩大格式化范围。
- MiMo与DeepSeek只以OpenAI Chat-compatible endpoint完成脱敏最小live journey：两者均完成`loader → activated Host tool`两请求链并观察到stream abort；exact OpenAI Responses/Anthropic/Kimi/fallback wire由安装的Pi `0.84.2` serializer tests证明，不把endpoint品牌当wire事实。
- `d3cf632c7`已生成macOS arm64 DMG/ZIP，闭合240项staged legal identities，并通过隔离HOME/OMNIMIND_HOME/userData的packaged startup smoke。仓库没有现成packaged交互journey harness；Settings toggle、Todo/Host交互与reopen语义当前由source integration覆盖，不能把startup冒充完整journey。
- 本地与远端 `main` 已通过 merge commit `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 合入 Project instructions 退休及 OmniMind identity/surface/trust contract；该提交的第一父提交是当时最新 `origin/main@8066f23f9`，第二父提交是通过 final gates 的任务 head `91f2aebe3`。
- Synara source：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`，clean exact `8f9f60045ea652db7d4a6822e2f723dde073f40a`，等于 `origin/main`。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `3077bf253` 已直接复用现有 `ProviderIcon`、Server health 与 Composer availability 语义，补齐中英文图标/可用/登录/受限/未安装/不可用反馈，并保留未安装 Engine 的设置可达性；它是当前 merge 的既有产品基线，不再是当前安装 bytes。
- Synara `af9c36465` 有意增加了 per-Project localStorage→Thread notes seed，`bdfc332a8` 又专门通过 `thread.meta.update` 修复首次发送持久化；它是真实 notes-template 功能，但不是 Agent runtime Project rules。维护者于 2026-08-18 在知晓这项行为和损失后明确确认整体退休，并接受不再提供 Project→new-task Notepad seed。
- `Project instructions` 全链退休、默认身份与边界实现分别冻结于任务提交 `2bd0478a6`、`7f2fdd502`、`8439faeac`，并由 `91f2aebe3` 完成合并前文档/格式收口；它们现均是 `b89149f3c` 的祖先，不再是未推送 candidate。
- product-owned `@omnimind/pi-coding-agent@0.84.2` 的 default base 已改为 identity-neutral；Extension turn mutation 后只把 Host-owned OmniMind engine contract 去重、追加为 exactly once。general Host/tool guidance 保持 mutable append，不因身份改造冻结已知 Browser/Device policy 漂移；stock Pi 的 identity/default base 不变。
- OmniMind Provider的dynamic Host projection mode现作为创建前已知的稳定Engine事实进入generic Host block；Gateway registration/active availability仍由Pi Registry与Extension拥有。首轮、loader activation、rollback、resource reload、resume与Chat的request-capture证明同一Host block保持一致，不再出现“active loader”与“MCP unavailable”并存，也没有增加第二次reload、Registry、active store或Pi patch。
- Provider admission 从同一份 canonical Project snapshot 派生 surface、effective cwd 与 Project/worktree root，只为 bundled `omnimind` 随现有 binding recovery/rollback 传递，其他 Provider admission 丢弃这些字段。Chat 与无 active Session discovery 保持 untrusted/global-only，skills/commands 的 Thread/Session key 变化使用固定空 placeholder，不会短暂沿用上一 trust tuple。
- exact merge 的全量测试、typecheck、build、lint、document contract、license、Pi fixed-revision 325/325 与 deterministic archive 均闭合；macOS arm64 DMG SHA-256 为 `86857d371a0555f1e760b693993ed621335676d5da296a2f6165d262cdb4dea3`。当前 `/Applications/OmniMind.app` 的 embedded commit/lockfile 指向该 merge，fresh 隔离 profile 已完成启动、Server ready、优雅关闭、重开与再次关闭。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 管理覆盖的 engine contract；未来 Prompt 管理只管理个人指令、项目规则和模板。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销并从当前文档树删除；它们不能再阻挡母体能力采用，历史仍可从 Git 追溯。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

当前只实施 AgentGateway catalog/Built-in exposure、OmniMind Host Pi projection、Todo Extension 收口、prompt truth、Settings 两个既定入口和相称的 exact/live/packaged 验证。不实施第三方 MCP manager、通用 Tool Search、第二 registry/active store、Prompt 管理、Memory/Knowledge 或 Workflow。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。packaged交互自动化缺少既有harness，是证据覆盖限制而不是新增产品决定；本轮不为它创建永久E2E平台。当前安装产物仍是此前本地未签名/未公证candidate；GitHub Release、update feed、签名、公证及Windows/Linux artifact/journey未获本轮授权，发行边界保持不变。

## 下一动作

Gate B 当前没有待执行的工程动作。未来只有在Pi revision、Gateway catalog/authority、Provider wire、Settings policy或packaged journey harness发生实质变化时，才按对应owner重开focused conformance；不得重建第二registry、active store、MCP manager或跨Engine动态加载路线。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Host dynamic loading exact evidence：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Settings、all-agent policy 与 MCP 边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo Extension bounded owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定责任：[`architecture/execution.md`](architecture/execution.md)；Pi 外部来源与验证规则：[`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
