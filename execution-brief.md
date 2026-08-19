# Execution brief

## 当前目标

**OmniMind Agent Extension Architecture 1.0 Gate B**已经在任务分支闭合为未合并、未发布的production candidate。shipped bytes对应exact pushed code SHA `9c05e09027be374cc2e858536aad5ab79a394c45`；同SHA已完成最终main同步、full gates、MiMo/DeepSeek live与隔离packaged journey。随后只允许补充不改变shipped bytes的证据文档，不得把该分支状态写成main、Release、本机真实安装或用户已交付产品。

最终形状只有一条：

1. Pi `AgentSession` / `ResourceLoader` / Tool Registry是OmniMind Agent runtime内唯一Extension注册、`sourceInfo`、registered/active、Session、reload与Provider wire真相；
2. AgentGateway继续唯一拥有Host canonical catalog、execution、credential、global exposure policy、capability、exact-turn authority、timeout与cancellation；
3. OmniMind Agent通过一个named hidden Host Projection Extension注册当前policy与availability允许的Gateway definitions；当前Host采用eager，definition由该inline source赢得后直接active；
4. stock Pi与其他Engine继续用各自native direct/eager管道获得同一Desired Host Surface；adapter只换管道，不形成Engine权限等级；
5. Todo、supervised Bash、Pi built-ins、团队/用户/第三方Extensions保持独立owner。具体Extension可以按证据自带owner-local dynamic loader，但没有Host/global loader或第二Registry。

## 当前分支已实现

以下source关注点已经在任务分支形成独立commits并通过focused测试：

- `066d62035`：brand-new无settings文件时Device默认关闭；valid legacy snapshot在decode前保留既有Device intent；corrupt走quarantine与安全默认；不因启动ambient write；
- `39109b033`：Gateway typed descriptor到Pi `ToolDefinition`与`tools/call` bridge集中到一份窄投影；transport JSON-RPC decoding仍只归`mcpInjection`；
- `923a8cc18`、`be8e494ed`：显式有限的product-bundled composition、async Host inline factory、native ResourceLoader reload重读`tools/list`、eager active、sourceInfo collision局部降级、lease与Delivered capability分离、Host-owned窄inspection handle；
- `924babb00`：删除Host dynamic guidance与完整catalog手册，harness只保留跨工具安全不变量；
- `c30a439c3`：所有Provider-facing `tools/call`统一绑定ingress exact turn；`tools/list`/initialize/ping仍可在有效Session、无active turn时使用；External connections继续独立principal/transport；
- `289eb4949`：删除Host-specific dynamic wire fixture，只保留一个owner-neutral Extension additive-loading conformance；
- `527e1bedd`：补齐settings migration并发、写失败不发布内存成功与revision单调证据。
- `93488abdc`、`4df34ad7e`：Host reload恢复、Pi source winner与prompt provenance闭合；
- `972ea8f7e`：canonical catalog只在唯一inventory test固定`24/22/12`，adapter parity继续动态使用同一filtered expected set；
- `9c05e0902`：修复Settings browser fixture对Device fresh default的错误假设，并证明fresh Device-off与enabled-but-unavailable是两个不同UI事实。

旧Host callable loader、lexical matcher、inactive pool、`session_start` deactivation、Goal/Automation activation preflight、dynamic prompt与Host search wire/live路径已经从active code删除。Goal/Automation只在同一request前核对`live tools/list ∩ 当前Pi sourceInfo真正交付的Host names`，不修改active set。

## 已关闭的最终证据

- 最终freeze前再次fetch并正常merge`origin/main@849730c508be0dde9570529431395acc7be2943b`；同SHA通过server/web typecheck、lint（0 errors，保留482个基线warning）、task-changed formatting、document contract 20/20、licenses 240项、full test 8/8 workspace tasks与desktop build。全仓`fmt:check`仍被83个任务外既有文件阻塞，本分支没有批量改写它们；
- exact code SHA `9c05e0902`已push到`origin/codex/omnimind-extension-architecture-docs`，remote与local一致；
- MiMo `xiaomi-token-plan-cn/mimo-v2.5-pro`完成Chat首轮、`omnimind_list_projects`真实Host调用、continuation与abort；首次错误选择通用Xiaomi identity得到401，而同一凭据direct token-plan probe为200，改用Pi精确provider identity后通过，未产生产品补偿逻辑；
- DeepSeek `deepseek/deepseek-v4-pro`完成folder-backed Agent的`read + omnimind_list_projects`；同SHA source/wire identity tests证明Todo schema属于Agent首轮工具面，packaged live则证明它没有被强制调用，但没有完成Todo真实execute/provenance journey；active Goal在continuation中读取真实文件并调用`omnimind_set_thread_goal`标记achieved；Automation run调用`omnimind_list_projects + omnimind_report_automation_result`，manual follow-up未继承run-only completion duty；
- packaged profile证明fresh Device off；显式开启写成`disabledBuiltInGroups: []`并在同profile关闭/重开后保持on；Helper与bundled Server参数全部落入任务专用隔离路径，最终优雅退出且无存活owner；
- shipped DMG来自同一code SHA，SHA-256为`8357594e71dc4c2b212b7ea84910a8752b5eb28a40d3ee942deabd9d1db31f64`。它没有替换`/Applications/OmniMind.app`，没有Release、update feed或main merge。

Live Session上报的初始input约35.9k–37.9k tokens；MiMo后续turn命中约38.9k cache-read，DeepSeek后续turn命中约35.8k–36.6k cache-read。可见完成时间为MiMo Host首轮16s、continuation 9.4s、DeepSeek folder-backed 7.3s、Automation 7.9s；当前telemetry没有可靠first-token timestamp，因此不把这些总时长伪称TTFR。未保存原始wire或credential。

## 不在本轮自动获批

Chat Todo、最终Built-in taxonomy、Device 12/12 full-access执行闭合、Browser download落点、approval/auto产品表面、Extension Marketplace与third-party MCP Settings都保持独立产品/安全问题。`runtimeMode`不替代这些准入。

## Stop-loss

- async inline factory若在真实product artifact的native reload不重执行，降为new Session/session replacement生效；不造mutable descriptor store或reload manager；
- cross-source collision不能用`sourceInfo`局部隔离时，只关闭对应Host capability；不默认杀Session；
- exact-turn不能沿现有ingress绑定时停止，不解析prompt、不造turn token/lease系统；
- 未来若改动shipped code，旧artifact证据立即失效，必须新commit、新push SHA并重建；docs-only证据收口不得冒充新shipped bytes。

## 权威路由

- 稳定execution owner：[`architecture/execution.md`](architecture/execution.md)
- Settings用户语义：[`architecture/workbench.md`](architecture/workbench.md)
- Extension Architecture与exact Pi/Synara证据：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Built-in/External connections/third-party MCP边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo唯一evidence owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- claim状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
