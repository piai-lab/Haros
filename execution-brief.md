# Execution brief

## 当前目标

当前唯一施工目标是关闭 **OmniMind Agent Extension Architecture 1.0 Gate B**。本分支已经把维护者确认的目标落成source candidate；它尚未完成最终main同步、push、真实Provider与隔离packaged journey，因此不能写成已交付产品。

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

旧Host callable loader、lexical matcher、inactive pool、`session_start` deactivation、Goal/Automation activation preflight、dynamic prompt与Host search wire/live路径已经从active code删除。Goal/Automation只在同一request前核对`live tools/list ∩ 当前Pi sourceInfo真正交付的Host names`，不修改active set。

## 仍未完成的证据

- 候选冻结前重新fetch并merge最新`origin/main`，在同一exact SHA重跑全量typecheck、lint、format、document contract、licenses、full test与desktop build；
- push任务分支后，用授权资源完成MiMo Chat、DeepSeek folder-backed Agent、Todo、eager Host call、Goal continuation、Automation run/manual follow-up与abort；
- 从同一pushed code SHA构建并使用任务专用`OMNIMIND_HOME`、Electron `userData`、HOME与Provider private homes完成packaged journey；
- 证明fresh Device off、synthetic legacy explicit Device-on、toggle→new Session/native reload、旧Session stale call deny、collision局部degrade、close/reopen/resume和进程清理；
- 最后只把脱敏pass/fail、wire/schema/prompt bytes和精确artifact SHA写回research/Mission。旧dynamic live绿色只算历史source evidence。

## 不在本轮自动获批

Chat Todo、最终Built-in taxonomy、Device 12/12 full-access执行闭合、Browser download落点、approval/auto产品表面、Extension Marketplace与third-party MCP Settings都保持独立产品/安全问题。`runtimeMode`不替代这些准入。

## Stop-loss

- async inline factory若在真实product artifact的native reload不重执行，降为new Session/session replacement生效；不造mutable descriptor store或reload manager；
- cross-source collision不能用`sourceInfo`局部隔离时，只关闭对应Host capability；不默认杀Session；
- exact-turn不能沿现有ingress绑定时停止，不解析prompt、不造turn token/lease系统；
- live或packaged关键journey失败时保留未完成candidate，不用mock代替；代码修正后必须新commit、新push SHA并重建artifact。

## 权威路由

- 稳定execution owner：[`architecture/execution.md`](architecture/execution.md)
- Settings用户语义：[`architecture/workbench.md`](architecture/workbench.md)
- Extension Architecture与exact Pi/Synara证据：[`research/pi-native-host-tool-loading-review.md`](research/pi-native-host-tool-loading-review.md)
- Built-in/External connections/third-party MCP边界：[`research/agent-tools-mcp-settings-review.md`](research/agent-tools-mcp-settings-review.md)
- Todo唯一evidence owner：[`research/pi-native-todo-extension-review.md`](research/pi-native-todo-extension-review.md)
- claim状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
