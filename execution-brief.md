# OmniMind 当前执行简报

Updated: 2026-08-19

本文件只拥有当前目标、范围、真实冲突/阻塞与下一动作。历史 Slice、构建日志、测试计数和 artifact 证据属于 Git、`research/` 与 active Mission，不在这里追加。它不能推翻维护者对完整 source decision surface 的明确采用决定。

## 当前目标

当前目标是把已确认的 **OmniMind Agent Extension Architecture 1.0** 从文档裁决推进为后续唯一Gate B方向。现有main已经合入一套可运行的Host Dynamic Loading实现，但维护者已明确否决其Host-owned `search_tools`、inactive pool与activation preflight；这些只能作为历史source evidence，不再是目标终态。

1. Pi `AgentSession` / `ResourceLoader` / Tool Registry是OmniMind Agent runtime内唯一Extension注册、sourceInfo、registered/active、Session、reload与Provider wire真相；AgentGateway继续唯一拥有Host canonical catalog、execution、credential、capability、exact-turn authority、timeout与cancel；
2. 当前Host物理形状是一份named hidden AgentGateway Host Projection Extension；policy与availability允许的definitions注册后直接active，不附加Host search、inactive pool或dynamic双轨；
3. 所有健康、正式支持Engine获得同一Desired Host Surface；OmniMind Agent、stock Pi与其他Engine只在投影管道上不同，不形成Host能力等级；
4. Built-in policy覆盖所有Agent。fresh profile在没有既有显式选择时默认开放OmniMind与Browser、关闭Device；已有显式选择不被覆盖；
5. Todo继续是独立product-bundled Pi Session Extension，当前仅OmniMind Agent work surface initial-active；Chat Todo不是本轮已批准结论；
6. Settings只拥有Built-in tools与External connections。future Extensions表面只能投影Pi原生truth；第三方MCP Settings继续退出首版。

## 当前事实

- 旧Agent tools Gate B由merge `e7137c7dc873400d9a801f333f41e278e544e001`锚定：它证明all-agent policy、Todo、External connections、Pi inline Extension、Gateway bridge、collision/reload与exact provider wire等可复用seam，也证明旧dynamic方案自身可运行。维护者后来明确推翻“Host dynamic是确定终态”；旧绿色证据不能阻止删除loader，也不能冒充Architecture 1.0已经实现。
- 当前candidate的focused/full gates通过：Server 362个test files/4251项通过（另3 files/16项skip），Web 322 files/4108项通过；document contract 20/20、typecheck、lint（0 error，保留482条既有warning）、licenses与changed-file format通过。全仓`fmt:check`仍命中83个既有无关文件，未扩大格式化范围。
- MiMo与DeepSeek曾以OpenAI Chat-compatible endpoint完成旧`loader → activated Host tool`两请求链、stream abort、identity、resource reload continuation与实际Host call。该证据只证明当时source路径，不再证明目标投影形状；未来eager target必须在新exact SHA重新捕获initial wire、prompt、调用与abort。exact OpenAI Responses/Anthropic/Kimi/fallback仍按真实serializer/wire区分，不按endpoint品牌猜。
- `d3cf632c7`已生成macOS arm64 DMG/ZIP，闭合240项staged legal identities，并通过隔离HOME/OMNIMIND_HOME/userData的packaged startup smoke。仓库没有现成packaged交互journey harness；Settings toggle、Todo/Host交互与reopen语义当前由source integration覆盖，不能把startup冒充完整journey。
- 本地与远端 `main` 已通过 merge commit `b89149f3c4b3316fa6ff8f7f0546c6e5b02bff13` 合入 Project instructions 退休及 OmniMind identity/surface/trust contract；该提交的第一父提交是当时最新 `origin/main@8066f23f9`，第二父提交是通过 final gates 的任务 head `91f2aebe3`。
- production-adopted Synara仍为`8f9f60045ea652db7d4a6822e2f723dde073f40a`；只读对照目录`/Users/liuzaoqu/Desktop/Develop/πCode/synara`当前为clean detached `c79fab498de1a911a14ff8b05bf83d0528ec54fa`，前者是后者ancestor。两者身份不得混写。
- `58f76446d` 已推送完整 adoption product set：ThreadGoal contract/migrations、`/goal`、Composer Goal panel/timer、achievement、Goal prompt injection、`omnimind_set_thread_goal`、terminal-driven continuation、startup recovery、Goal race fences、Debug、bounded raw events、chat width、暗色 icon、Profile local PNG export、perf harness、Group/PR/不同名 owner parity 与作者等价回归；其最后一轮改动只关闭 Automation 测试时钟/隔离和 Web compiler 回归，没有增加平行产品 owner。
- `3077bf253` 已直接复用现有 `ProviderIcon`、Server health 与 Composer availability 语义，补齐中英文图标/可用/登录/受限/未安装/不可用反馈，并保留未安装 Engine 的设置可达性；它是当前 merge 的既有产品基线，不再是当前安装 bytes。
- Synara `af9c36465` 有意增加了 per-Project localStorage→Thread notes seed，`bdfc332a8` 又专门通过 `thread.meta.update` 修复首次发送持久化；它是真实 notes-template 功能，但不是 Agent runtime Project rules。维护者于 2026-08-18 在知晓这项行为和损失后明确确认整体退休，并接受不再提供 Project→new-task Notepad seed。
- `Project instructions` 全链退休、默认身份与边界实现分别冻结于任务提交 `2bd0478a6`、`7f2fdd502`、`8439faeac`，并由 `91f2aebe3` 完成合并前文档/格式收口；它们现均是 `b89149f3c` 的祖先，不再是未推送 candidate。
- product-owned `@omnimind/pi-coding-agent@0.84.2` 的 default base 已改为 identity-neutral；Extension turn mutation 后只把 Host-owned OmniMind engine contract 去重、追加为 exactly once。general Host/tool guidance 保持 mutable append，不因身份改造冻结已知 Browser/Device policy 漂移；stock Pi 的 identity/default base 不变。
- 当前source仍把dynamic Host projection mode写入generic Host block并运行loader。目标将删除这段search guidance与activation责任，同时保留Pi Registry/Extension provenance；ToolDefinition承担普通用法，generic harness只保留跨工具不变量。当前source事实与已确认target必须保持明确区分。
- Provider admission 从同一份 canonical Project snapshot 派生 surface、effective cwd 与 Project/worktree root，只为 bundled `omnimind` 随现有 binding recovery/rollback 传递，其他 Provider admission 丢弃这些字段。Chat 与无 active Session discovery 保持 untrusted/global-only，skills/commands 的 Thread/Session key 变化使用固定空 placeholder，不会短暂沿用上一 trust tuple。
- exact merge 的全量测试、typecheck、build、lint、document contract、license、Pi fixed-revision 325/325 与 deterministic archive 均闭合；历史 macOS arm64 DMG SHA-256 为 `86857d371a0555f1e760b693993ed621335676d5da296a2f6165d262cdb4dea3`。当前 `/Applications/OmniMind.app` 已替换为 exact pushed `f943f0a1f033fbd221f8e076ab43811ec26f5c27` 的本机 ad-hoc candidate，DMG SHA-256 为 `bb64765aa7dd476f1b06ca92e522eb1a30566ec2bb9720b69cfeba90456df040`；其DMG/ZIP闭合240项staged legal identities，ZIP通过无ambient credentials的隔离startup smoke，安装副本又以任务专用HOME、OMNIMIND_HOME与Electron userData完成启动、Server ready、优雅关闭、同profile重开与再次关闭。该证据不冒充正式签名、公证、Release或packaged真实Provider交互journey。
- 维护者已确认：OmniMind identity、Chat/Agent 边界、Agent alignment/risk contract 属于不可被 Prompt 管理覆盖的 engine contract；未来 Prompt 管理只管理个人指令、项目规则和模板。
- OmniMind engine contract 同时冻结英文机构名 `International Academy of Phronesis Medicine (Guangdong)` 与官方中文名“广东智慧医学国际研究院”；这只是既有身份 owner 的双语闭合，不增加 Prompt registry、Settings 表面、缓存控制面或跨 Engine 注入。
- `e0ee9cfe2` 的逐回合 `omnimind_update_tasks` Todo/task-list 投影仍与持久 Goal 分离；Todo 不是 Goal 的缩水替代。
- Synara Goal 与 Todo 是两条独立责任。ThreadGoal 位于 OmniMind 已继承的同一 Product Orchestration/Thread authority 内，不是第二产品控制面。
- 历史 C0–C5 / C1–C3 阶段门已被维护者撤销并从当前文档树删除；它们不能再阻挡母体能力采用，历史仍可从 Git 追溯。
- Goal 文件从未进入过 OmniMind 历史，准确状态是“此前未移植/错误延期”，不是“移植后删除”。
- baseline 全树为 129 Synara-only、1,580 同路径分叉、4,785 byte-identical 与 154 OmniMind-only；exact `3077bf253` 对 exact Synara `8f9f600…` 为 94 Synara-only、1,602 同路径分叉、4,798 byte-identical 与 176 OmniMind-only。相对 `58f76446d`，Thinking-status 组合及 Engine picker 回归新增 9 个 OmniMind-only 路径，但没有改变 Synara-only、同路径分叉或 byte-identical 数量。最终树用 NUL-safe Git tree map 独立复核；普通 locale 下直接 `comm/join` 会因排序规则误报，不得采用。剩余差异已按行为 owner、固定 divergence 与作者测试分组闭合，不用逐路径 ledger 取代行为审计。

## 当前工作范围

当前文档工作只收口Architecture 1.0唯一真相，不修改产品代码。后续Gate B范围是删除Host search责任、简化Host Projection、显式product-bundled Extension composition、PiAdapter瘦身、强Host平权、prompt diet、all-agent Built-in policy与相称的exact/live/packaged验证。Todo保持独立，不借机改变Chat surface。不实施第三方MCP manager、通用Tool Search、第二registry/active store、Extension Manager/Marketplace、Prompt管理、Memory/Knowledge或Workflow。

## 保留边界

- OmniMind 品牌、发行版本、Changelog、账号与 publication identity 独立；
- stock Pi `.pi` 与 OmniMind Agent `.omnimind`、Session、Package state 和 diagnostics 隔离；
- secret、license、权限、用户数据、双语与 exact-source/author-tests 边界不降低；
- failure、abort、cancel、timeout、recovery、Queue/approval/user-input priority、stale/race fences 和 packaged fresh-profile journey 必须真实验证；
- 只有真正出现并行数据库、writer、command path、timer/recovery authority 时才按第二 owner 阻断。

## 当前阻塞

当前没有Host/Extension架构产品阻塞。独立产品问题仍不得被本目标自动批准：Chat Todo、最终六组taxonomy、Device full-access 12/12、Browser download落点、approval/auto表面与Extension Marketplace。packaged交互自动化缺少既有harness是证据限制，不授权永久E2E平台。当前安装产物仍是此前本地未签名/未公证candidate；GitHub Release、update feed、签名、公证及Windows/Linux artifact/journey边界不变。

## 下一动作

本轮只完成文档收口。后续工程Gate B从当前main开始，单轨删除Host `search_tools`、inactive pool、preflight、dynamic prompt/wire专属责任，保留并简化Host inline Extension；随后闭合composition、PiAdapter、Host平权、Device fresh default、exact-turn与真实eager wire/packaged evidence。不得保留feature flag或双轨，不得重建第二registry、active store、MCP manager或global search。

## 证据入口

- Source intake 与逐责任 disposition：[`research/source-review.md`](research/source-review.md)
- Extension Architecture 1.0、Host投影与旧dynamic supersession：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Settings、all-agent policy 与 MCP 边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo Extension bounded owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- Project instructions 母体调用链、退休边界与 Prompt 分工：[`research/omnimind-prompt-management-review.md`](research/omnimind-prompt-management-review.md)
- Agent Core 稳定责任：[`architecture/execution.md`](architecture/execution.md)；Pi 外部来源与验证规则：[`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md)
- Claim 状态与 evidence pointer：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
- 产品事实：[`architecture/`](architecture/README.md)
