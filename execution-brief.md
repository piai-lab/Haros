# OmniMind 当前执行简报

Updated: 2026-08-19

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

当前闭合关注点是 OmniMind Agent 全局提示词设置：在 `Settings → Development / 开发 → Prompts / 提示词` 中提供全局个人指令与折叠高级文件的真实文件入口，复用 bundled runtime 的原生 discovery、precedence、composition、Session snapshot 与 exact-thread reload，并以 Host 的窄安全投影/mutation seam 防止越界和静默覆盖。它不建立第二 Prompt runtime、registry/profile/history/cache，也不管理 Project rules、模板、其他 Engine 或 raw effective Prompt。

1. 一份 AgentGateway canonical catalog 同时拥有 name/schema/group、availability、execution 与 call-time policy；
2. fresh 默认开放的 Built-in tools policy 覆盖所有 Agent，新 Session 过滤、旧 Session 新调用实时拒绝；
3. OmniMind Host Extension 只注册和 additive 激活自己的 Gateway names，不识别其他 Extension、Todo、Bash、Skills、Packages 或第三方 MCP；
4. Goal continuation 与 Automation envelope 在同一 request 前只 additive ensure 其明确要求的 bounded closure，职责结束不卸载 schema；
5. Todo 继续是独立的 product-bundled Pi Session Extension，只在 OmniMind Agent work surface initial-active；
6. Settings 只新增 Built-in tools，并把现有连接页准确呈现为 External connections；第三方 MCP Settings 继续退出首版。

## 当前事实

- Agent tools Gate B 的 source integration 由 merge commit `e7137c7dc873400d9a801f333f41e278e544e001` 锚定：`f08872595`到`d3cf632c7`依次闭合authority、Todo、External connections、Built-in policy、prompt diet、Host Extension、OmniMind-only dynamic loading、call-time/lifecycle矩阵、产品词汇与exact provider wire；`8186e5245`与`f6d9465bb`完成合并前产品文案、可访问性和证据状态审查。安装、签名、公证与Release仍是独立交付边界。
- 当前candidate的focused/full gates通过：Server 362个test files/4251项通过（另3 files/16项skip），Web 322 files/4108项通过；document contract 20/20、typecheck、lint（0 error，保留482条既有warning）、licenses与changed-file format通过。全仓`fmt:check`仍命中83个既有无关文件，未扩大格式化范围。
- MiMo与DeepSeek只以OpenAI Chat-compatible endpoint完成脱敏最小live journey：两者均完成`loader → activated Host tool`两请求链并观察到stream abort；2026-08-19 又分别完成 OmniMind/πAI-Lab/“广东智慧医学国际研究院”身份回答、resource reload 后 continuation、Host loader 激活及实际 Host tool 调用，engine contract 与稳定 Host context 指纹跨请求不变，且没有把底层模型身份冒充产品身份。该结构证据不冒充 Provider cache 命中率；exact OpenAI Responses/Anthropic/Kimi/fallback wire仍由安装的Pi `0.84.2` serializer tests证明，不把endpoint品牌当wire事实。
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
- exact merge 的全量测试、typecheck、build、lint、document contract、license、Pi fixed-revision 325/325 与 deterministic archive 均闭合；历史 macOS arm64 DMG SHA-256 为 `86857d371a0555f1e760b693993ed621335676d5da296a2f6165d262cdb4dea3`。其后的 exact pushed `f943f0a1f033fbd221f8e076ab43811ec26f5c27` 曾作为本机 ad-hoc candidate 完成240项 legal closure、ZIP 隔离 startup smoke、安装副本优雅关闭与同 profile 重开；它现在只是历史安装证据，不再是 `/Applications/OmniMind.app` 的当前 bytes，也不冒充 packaged 真实 Provider 交互 journey。
- OmniMind Agent 全局提示词产品代码已推送为 exact `9d3642557c0ab16faf48eeb06812b218027b4800`。该 SHA 的 focused/full gates、MiMo/DeepSeek 脱敏 request capture、macOS arm64 DMG/ZIP、隔离 startup smoke、packaged Settings create/edit/conflict/remove/reload/busy/abort、同 profile reopen 与下一请求已闭合；当前 `/Applications/OmniMind.app` 已替换为该 ad-hoc installed candidate。DMG SHA-256 为 `3c58808a1bd71231f642156e47518d9db0cb5e74667b6d3edbb0b0a569bd3322`，ZIP SHA-256 为 `2b7ede9308b9c9ee998047af34ab350fecf6293c7055a5df91dd21b26f95b545`。它不冒充签名、公证、GitHub Release、update feed 或跨平台发行，后续 evidence-only commit 也不冒充 installed product bytes。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 管理覆盖的 engine contract；本关注点只管理 OmniMind Agent 的 global context candidate 与全局 `APPEND_SYSTEM.md` / `SYSTEM.md`，不接管 Project rules 或模板。
- OmniMind engine contract 同时冻结英文机构名 `International Academy of Phronesis Medicine (Guangdong)` 与官方中文名“广东智慧医学国际研究院”；这只是既有身份 owner 的双语闭合，不增加 Prompt registry、Settings 表面、缓存控制面或跨 Engine 注入。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销并从当前文档树删除；它们不能再阻挡母体能力采用，历史仍可从 Git 追溯。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

当前只实施上述 OmniMind Agent global prompt file → save receipt → explicit exact-thread reload → next request → remove/reopen 闭环，以及相称的 contracts、Server 安全边界、双语 Settings、request stability、MiMo/DeepSeek focused live 和 exact pushed SHA packaged fresh-profile journey。既有 AgentGateway/Built-in/Todo owner 保持不变。不实施第三方 MCP manager、通用 Tool Search、第二 registry/active store、Prompt Plugin System、Prompt profile/history/cache、Project rules、模板、跨 Engine 同步、Memory/Knowledge 或 Workflow。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。若实现必须复制 bundled candidate precedence、建立第二 loader/atomic writer、patch bundled runtime、读取或改写 Project/stock `.pi`/其他 Engine private home，立即停止并回到 owner/source intake。packaged交互自动化缺少既有 harness 是证据覆盖限制，本轮只保留任务专用 journey，不创建永久 E2E 平台。GitHub Release、update feed、签名、公证及 Windows/Linux artifact/journey 未获本轮授权，发行边界保持不变。

## 下一动作

typed `omnimindAgentPrompts` contract、单一 Server file service、Settings 组合面板、现有 reload seam、真实 Provider 与 exact pushed SHA packaged fresh-profile journey 已闭合为 installed candidate。Campaign 在 architecture/brief 准入后使用下一个未占用 claim `F-22` 记录 evidence，不授予施工准入；下一步仅是安全 mutation claim 的独立复核与维护者裁决，在此之前保持 `candidate`，不由实施者越权标为 `verified`。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Host dynamic loading exact evidence：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Settings、all-agent policy 与 MCP 边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo Extension bounded owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定责任：[`architecture/execution.md`](architecture/execution.md)；Pi 外部来源与验证规则：[`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
