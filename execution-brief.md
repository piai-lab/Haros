# OmniMind 当前执行简报

Updated: 2026-08-19

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

当前闭合关注点是 OmniMind Agent 提示词设置：在 `Settings → Development / 开发 → Prompts / 提示词` 中只提供“默认提示词”和“自定义规则”两张卡片。默认提示词把一个稳定、身份中立的 factory/custom instruction segment 接入同一个 bundled native builder；自定义规则继续使用 global context active-candidate discovery 和安全 mutation。页面不管理 `SYSTEM.md`、`APPEND_SYSTEM.md`、候选/遮蔽面板、Project rules、模板、其他 Engine 或 raw effective Prompt，也不建立第二 Prompt runtime、composer、registry/profile/history/cache。

1. 一份 AgentGateway canonical catalog 同时拥有 name/schema/group、availability、execution 与 call-time policy；
2. fresh 默认开放的 Built-in tools policy 覆盖所有 Agent，新 Session 过滤、旧 Session 新调用实时拒绝；
3. OmniMind Host Extension 只注册和 additive 激活自己的 Gateway names，不识别其他 Extension、Todo、Bash、Skills、Packages 或第三方 MCP；
4. Goal continuation 与 Automation envelope 在同一 request 前只 additive ensure 其明确要求的 bounded closure，职责结束不卸载 schema；
5. Todo 继续是独立的 product-bundled Pi Session Extension，只在 OmniMind Agent work surface initial-active；
6. Settings 只新增 Built-in tools，并把现有连接页准确呈现为 External connections；第三方 MCP Settings 继续退出首版。

## 当前事实

- Agent tools Gate B 的 source integration 由 merge commit `e7137c7dc873400d9a801f333f41e278e544e001` 锚定：`f08872595`到`d3cf632c7`依次闭合authority、Todo、External connections、Built-in policy、prompt diet、Host Extension、OmniMind-only dynamic loading、call-time/lifecycle矩阵、产品词汇与exact provider wire；`8186e5245`与`f6d9465bb`完成合并前产品文案、可访问性和证据状态审查。安装、签名、公证与Release仍是独立交付边界。
- 当前 Prompt candidate 的两卡 UI、settings/file owner、安全边界与 runtime Session 创建修复已通过 focused/full gates：bundled fixed-revision generator 7 files / 291 tests，Prompts browser 9 tests，当前 Server full 363 files / 4274 tests passed（另3 files / 16 tests按平台跳过），全仓8个test tasks、typecheck、build、document contract、240项 legal closure 与 changed-file format通过；merge 后同一棵 `main` 再次通过全量 tests、typecheck、build、document contract、licenses，lint 为 0 error 并保留 483 条既有 warning。首次 full run 的 legal ASAR fixture 曾在并发中读到临时 NUL archive 后失败；该 fixture 独立复跑与随后完整 full run均通过，不把首次异常隐去或当作产品失败。既有无关格式基线保持原样，未扩大格式化范围。
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
- exact `cf1a1e580509423a92e5334a438a3e077d376210` 的三文件 UI 与 `584045a291a91e57ec50ce0e91cee29253334ef1` 的 initial Session 漏传都只保留历史证据。runtime 修复在同一 exact upstream `914cf147…` 上产生 patch `499b1257…` 与 vendored artifact `b57b866d…`，祖先 product `db25a5b91343a4ddbf70fedd98ea3583bd020317` 已闭合 deterministic request capture、MiMo/DeepSeek、save/no-reload/reload、cache、remove 与完整 packaged journey。exact pushed product `61bb9e471625186c7693c5b74588e4f6b0e4f956` 补齐草稿生命周期、UTF-8 无损边界及浏览器回归，并经任务证据 head `351989f455e4cbed9c8642b8a38103e0a64313e9` 由 no-ff merge `6ad09c111500a60deb8618927ff07a7911a3535d` 安全并入当时最新 `main@849730c508be0dde9570529431395acc7be2943b`；已重建并安装 DMG `b3604c65…`、installed app.asar `55391e52…`，asar 内嵌 product commit 一致，240 项 legal identities 闭合。本轮未生成当前 SHA 的 ZIP；隔离 packaged review 复验 fresh/default、跨分区草稿、cancel/no-create、save/display path/Open、no-op hash/mtime、close/reopen 与 restore factory。F-22 仍保持 candidate。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 设置覆盖的 engine contract；本关注点只管理 native default 的稳定 factory/custom segment 与 global custom rules。手工 `SYSTEM.md` / `APPEND_SYSTEM.md` 继续原生工作，但 Settings 不接管、投影或迁移它们。
- OmniMind engine contract 同时冻结英文机构名 `International Academy of Phronesis Medicine (Guangdong)` 与官方中文名“广东智慧医学国际研究院”；这只是既有身份 owner 的双语闭合，不增加 Prompt registry、Settings 表面、缓存控制面或跨 Engine 注入。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销并从当前文档树删除；它们不能再阻挡母体能力采用，历史仍可从 Git 追溯。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

当前只实施 OmniMind Agent factory/custom default + global custom rules → save receipt → explicit exact-thread reload → next request → restore/remove/reopen 闭环，以及相称的 bundled builder seam、Server settings/file safety、双语 Settings、request stability、MiMo/DeepSeek focused live 和 exact pushed SHA packaged fresh-profile journey。既有 AgentGateway/Built-in/Todo owner 保持不变。不实施 `SYSTEM.md` / `APPEND_SYSTEM.md` Settings 管理、第三方 MCP manager、通用 Tool Search、第二 registry/active store/composer、Prompt Plugin System、Prompt profile/history/cache、Project rules、模板、跨 Engine 同步、Memory/Knowledge 或 Workflow。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有待裁决的产品阻塞。受影响 Pi intake 已按 exact source 复核；维护者已明确授权在 product-owned bundled runtime 内增加窄 factory instruction seam。若实现只能借 `SYSTEM.md`、Host append、复制 builder、第二 loader/atomic writer/composer/registry 或修改 installed bytes 才能成立，立即停止。不得读取或改写 Project/stock `.pi`/其他 Engine private home。packaged 交互只保留任务专用 journey，不创建永久 E2E 平台。GitHub Release、update feed、签名、公证及 Windows/Linux artifact/journey未获本轮授权。

## 下一动作

architecture/brief、source、exact pushed product SHA `61bb9e471625…`、installed bytes、隔离 live/packaged evidence 与 merge `6ad09c111…` 现已互相一致；任务分支只在确认 merge 可达、`main` 已推送且工作区 clean 后删除。F-22 仍由维护者独立裁决，实施者不自行升为 verified。Node 公共 fs seam 仍只提供进程内 writer 串行与 expected-version optimistic conflict detection，不能原子消除最终极窄的非协作 external-writer TOCTOU。一次历史 `--version` 探测被 Electron 当正常默认启动，未进入 UI 且立即停止；真实 `~/.omnimind/agent` 7 个 Prompt leaf 当时复核仍全部 absent，该次探测不计入 journey。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Host dynamic loading exact evidence：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Settings、all-agent policy 与 MCP 边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo Extension bounded owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定责任：[`architecture/execution.md`](architecture/execution.md)；Pi 外部来源与验证规则：[`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
