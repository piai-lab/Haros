# Execution

## 核心裁决

OmniMind V1 直接使用 Synara 的多 Provider execution substrate：一个 Product Orchestration、一个 Provider Registry、一个 Session/Thread binding 路径和一套 canonical events/projections。Codex、Claude、OpenCode、stock Pi 等沿用原生 adapter；bundled OmniMind Agent 作为独立 Provider 加入同一个 Registry。

**OmniMind Agent** 是独立 `omnimind` Provider：Pi-derived、产品自有、随 OmniMind 内置发行。既有 `pi` Provider 同时保留，但正常产品旅程只呈现 OmniMind；`Pi` 只在用户主动选择 Provider、查看诊断或法定来源时出现。两个 Provider 不意味着两个 Product worlds。

```text
apps/web       inherited Product UI / Workbench
    │ typed commands, snapshots, canonical events
apps/desktop   window, menu, keychain, notifications, updater
    └── supervises apps/server
apps/server    one Orchestration + projections + Provider Registry
    ├── Codex adapter
    ├── Claude adapter
    ├── OpenCode adapter
    ├── OmniMind Agent adapter → bundled OmniMind runtime
    ├── Pi adapter             → stock Pi integration
    └── other inherited adapters
```

当前仓库中平行的 Product Control Plane、第二 event/store/projection、独立 Registry 或 Run/receipt/outbox 都是删除候选。OmniMind Agent 可以拥有自己的 runtime implementation，却不能拥有第二 orchestration、Thread model 或 Workbench。

## 继承层与 Provider 私有层

### 直接继承的共用层

- Project、Thread、Space、Home/Studio managed container；
- Composer draft、attachments、Queue 与 existing command receipt；
- canonical Timeline/Activity、attention、failure 与 recovery；
- command/event store、projection、snapshot/catch-up 与 transport；
- File、Viewer、Diff、Terminal、Git、Artifact 与 Studio Output；
- provider/model/skill discovery surfaces；
- settings、notifications、updates、legal 与 diagnostics。

### Provider 私有层

- process/SDK/wire protocol 与 authentication；
- native Session、resume cursor、transcript、compaction、branch 与 private state；
- Model option、Thinking/traits、usage 与 rate-limit 语义；
- Tool schema、approval、structured input、slash command 与 native UI；
- Extension、Skill、Plugin、Prompt、MCP 与 package lifecycle；
- raw event、native identifier、error 与 cancellation acknowledgement。

共用层只包含 Synara 已经证明稳定的最小事实。Provider-specific capability 通过现有 optional methods、capability data 与 namespaced detail 呈现；没有第二个“更统一”的 runtime contract。

## Agent、Chat 与 Spaces

`Agent | Chat` 只改变入口与用户边界：

- Agent 路由到 folder-backed Project Thread 和现有 Workbench；
- Chat 路由到 Home/Studio managed Project Thread 与 managed workspace/outbox；
- Groups 直接使用 Synara Spaces；
- `Send to Agent` 只创建/打开 folder-backed Project Thread，并携带用户选择的 prompt、attachments 与 artifact refs。

这些动作不创建新 aggregate，不复制 native Session，不承诺跨 Provider continuation，也不改变 Provider Registry。

## Provider Registry 与 adapter

Provider Registry 只做 `ProviderKind → ProviderAdapter` lookup；Provider Service/Session Directory 使用现有 Thread binding 管理 lifecycle。

V1 只向现有闭合 `ProviderKind` 增加一个 `omnimind` literal，并穷尽更新已有 descriptor、schema、settings、model discovery、usage、health 与 UI maps；不把 ProviderKind 改成动态插件系统。Pi-family implementation 只参数化真实变化的 provider ID、runtime entry、state/version/policy，不能复制整份 Pi adapter。

adapter contract 只保留 source 实际支持的操作，例如 start/stop/send/interrupt、native resume、canonical event stream 与可选 discovery。optional 就是真 optional：未实现时隐藏或显示 unavailable，不模拟成功、不 silent fallback、不由另一 Provider 接管。

Provider 切换沿用 stop-first replacement：当前 operation 结束或停止后才启动目标 Provider；目标失败时恢复上一 exact binding。Product transcript 不能替代 Provider native context。

## OmniMind Agent 与 stock Pi

OmniMind Agent runtime 拥有：

- 独立 OmniMind Agent Session、resume、branch 与 compaction；
- agent loop、model runtime、stream、usage、steer、abort 与 settlement；
- Pi-compatible PackageManager/ResourceLoader、Extensions、Skills、Prompts、Tools、MCP 与独立 private state；
- OmniMind Agent native error、raw event 与 UI request。

其首个代码与 ecosystem compatibility baseline 是 Pi stable `v0.84.1`，但产物使用 OmniMind Agent 自身 version、bundle identity、configuration 与 state root，并随应用发布。为了同时隔离 global 与 project-local state，OmniMind Agent 必须使用独立 Pi-derived build/package，或让 upstream config-dir 在 runtime instance 上显式可配置；仅传入另一 global `agentDir` 不足以证明隔离。其 global settings/session/package 与 project-local settings/resources 都使用 `.omnimind`。后续优化不受 stock Pi release cadence 约束；Pi lineage、license 与修改边界必须可追踪。

stock Pi 继续由 inherited `pi` adapter 拥有其 Session、Pi version、configuration、PackageManager/ResourceLoader 和 `.pi` native state。只有用户显式选择 stock Pi 后，该 Provider 才可按原生 contract 访问自己的 state；OmniMind Agent、产品 reset 与后台 discovery 都不得读取、迁移、同步或改写它。两者可共享窄的 Pi-family transport/event bridge，只要行为确实同构；不得共享 Provider identity、Session cursor、agentDir/state root、Package install state 或 diagnostics。

stock Pi 的“实际会话 runtime version”和“本机可选 `pi` CLI version”是两个事实。若 session 使用 bundled SDK，就不能用 `pi --version` 冒充其执行版本；local CLI 只能作为独立诊断字段显示。

## 其他 Provider

stock Pi、Codex、Claude、OpenCode 等 inherited adapters 留在 V1。产品只要求：

- discovery、binary/auth/health 事实准确；
- source 已支持的 Chat、stream、interrupt/resume 不因 OmniMind surgery 回退；
- Model、approval、usage、commands、Skills/Plugins 按 adapter truth 呈现；
- unavailable、unsupported、degraded 与 unknown 由 runtime evidence 决定；
- 不成为 OmniMind Agent 的 fallback，也不被迫获得其 Package 语义。

Gold 只表示内部验收优先级，不写进新的运行时 tier state。UI 直接显示现有 ready/warning/error、availability、auth、version/update 与 capability facts。

## Event、dispatch 与恢复

adapter 把 native event 映射到现有 canonical facts，并保留 Provider/native references。未知 payload 可进入有界 diagnostics，不能靠字符串猜测为 Tool、Question、permission 或 success。

Product command receipt 只证明外层 admission。native acceptance/turn/session reference、interrupt acknowledgement 与 settlement 必须来自当前 adapter；失联时显示 waiting、failed 或 unknown，不自动转交另一 Provider。

restart 优先使用 Provider native resume/session cursor。无法恢复时明确创建 fresh context/new lineage；不能用 Product Timeline 冒充完整 native continuation。

## 扩展与生态

Package lifecycle 不跨 Provider归一：

- OmniMind Agent UI 直接调用 bundled Pi-compatible manager/loader/settings/trust，并写入独立 OmniMind state root；
- stock Pi 继续拥有其 PackageManager/Settings/Trust/ResourceLoader，但 UI 只使用 inherited adapter 已经暴露的动作；不为了和 OmniMind Agent 对称而扩大 stock Pi adapter；
- 其他 Provider 使用各自 discovery 与其实际支持的 actions；
- 共同表面直接复用 Synara PluginLibrary、Skills 页面和 provider discovery，只负责导航、按 Provider 分组、来源/rights 展示和 diagnostics；
- curated/preinstalled OmniMind Agent 资源使用发行时 manifest 记录 source、hash、license 与 ecosystem API compatibility，不成为运行时 state store。

不得新增 `PackageActivation`、current/LKG、generation lease、跨 Provider rollback 或第二 Marketplace。Package 更新对活跃 Session 的影响完全按原生 runtime 行为呈现；若原生 contract 不足以安全暴露某动作，就暂不提供该按钮。

## First-public storage

V1 只保留 inherited orchestration 对 Project/Thread/Space command/event/projection 的一份 canonical product truth，并继续允许各 Provider 使用自己的 native/private state。OmniMind Agent 使用新的 `.omnimind` global/project-local namespace；stock Pi 的 `.pi` settings/packages/sessions 保持原样，不被产品或 OmniMind Agent 读取、迁移或写入。

不得为不同 Provider 建平行 Product databases，也不得为了清理历史发布 destructive rebuild。Provider native state 可以不同，但 Project/Thread/Space/Timeline 只有 inherited 一份。

## 本地系统能力

File、Git 与 Terminal 分别由 filesystem、Git repository 与 local process/PTY 拥有。OmniMind 直接复用 Synara 的 typed commands、viewer、save/conflict behavior、Git journey 和 per-thread terminal state。

不建设 observed-version 平台。只有现实可复现的静默覆盖风险才增加最小 precondition；外部工具或 Provider Tool 改写文件后重新观察并呈现即可。

Remote/SSH 不属于 V1；普通 Git remote、push/pull/PR 不受影响。

## 进程、安全与应用更新

进程边界按 Provider 真实实现保留。OmniMind Agent 的 bundled runtime 可以使用 product-owned worker/process 以满足 crash、更新和资源边界，但该进程只承载一个 Provider runtime，不复制 orchestration。stock Pi 保持 inherited integration 的真实 topology。

credential 使用现有 keychain/provider config 边界，不进入 Product events、Timeline 或日志。进程隔离、Package verification 和 Provider policy 都不能宣传为 OS sandbox。

应用更新直接继承 Electron updater，保持 downgrade disabled。V1 验证检查、下载、安装、重启、失败提示、重试和重新安装恢复；不建设自动 application rollback 或第二 updater pipeline。开发用 Git canary rollback 不是用户应用回滚能力。

OmniMind Desktop updater 同时拥有 bundled OmniMind Agent runtime 的版本与更新。Pi-derived CLI self-update、默认 `pi.dev` share、Pi install/update telemetry 与独立 version-check 不进入正常产品 composition；能在 adapter/composition 边界禁用时不为此 fork 整个 upstream。Provider-native manager 只更新 Extensions/Packages/Skills 等生态资源，不能替换 bundled runtime。为兼容 unchanged Pi ecosystem，可保留 `@earendil-works/pi-*` imports、`PI_SESSION_*`、`PI_CODING_AGENT` 等内部 API/env 名称，但不得把它们渲染成 OmniMind 的用户品牌。

## V2 deferred

Remote/SSH 是 V2。V1 不保留 Remote picker、ExecutionTarget branch、background daemon、transport recovery 或相关 final gate。未来重开时先重新研究届时 Synara 与各 Provider 的 native remote 能力。

## 收缩规则

1. Synara 或 Provider 是否已经拥有这项责任；
2. 用户是否真的需要跨 Provider 的共同事实；
3. 删除重复层后 normal/failure/restart journey 是否仍闭合；
4. 最小接线是否比新平台更便宜、更可靠。

已有就复用；Provider 私有就留在 adapter；重复就删除；缺真实第二消费者就不抽象。sunk cost、历史 candidate 和文档数量都不是保留理由。
