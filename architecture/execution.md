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

## 账户容量与历史索引故障域

Provider usage 分为两个不相互降级的执行边界：

```text
Account capacity A
  Web → Server Provider-usage fetcher → Provider native account/rate-limit source
  never reads Provider archives or OpenUsage

Usage history B
  Web → Server UsageHistory coordinator → existing state.sqlite derived tables
                                      └── bounded child reader → approved Provider roots
```

账户容量 A 保留 Provider 专属 fetcher、single-flight、健康/降级 TTL、last-good 与单 Provider 错误隔离。A 的失败不能改写历史索引状态；B 的 last-good、估算或 transcript token 也不能成为 A 的 fallback。

历史索引 B 是 Server 内一个具体产品能力，不是第二 Orchestration 或通用 worker platform：

- Server 是唯一控制与数据库 writer；隔离 child 只做 Provider-specific discovery/stream parse，经有界 IPC 返回规范化 batch，不打开 `state.sqlite`，不拥有 consent、checkpoint 或重试 authority；
- child 有独立 heap 上限、批次 IO/时间预算和显式 kill；异常、timeout、OOM、SIGKILL 或格式变化只把对应 provider/file 标为 partial/paused/stale，并保留 last-good aggregate，不能退出 Server、重启 Desktop 或影响 Provider Session；
- discovery 按 Provider root 分批并保存 cursor，不把全部路径常驻内存；文件读取保存 identity、size、mtime、complete-line offset、parser version 与必要聚合，后续只读新增字节；
- 文件截断、替换、inode 变化、删除与 parser upgrade 由 Server 事务性撤销旧贡献并重算。checkpoint 先提交数据库再确认 batch，App 关闭或 child 被杀后从最后提交点恢复；
- 同一 Server 只允许一个索引任务，多窗口与多表面共享该状态。自动重试有上限；手动刷新只做增量 discovery，明确“重新索引”才失效现有派生贡献；
- 未 consent 时不读取 `.codex/sessions`、`.claude/projects` 等 archive。启动、Header、普通对话和 A 查询对这些目录读取为零；已 consent 后只允许低优先级、debounced 的增量维护，不做 15/30 秒全量轮询或每文件 watcher；
- OpenUsage 若保留，只能作为 B 的显式可选 connector/import source，不能进入 A 或内置 archive index 的核心 hook、权威或失败边界。

进程隔离只证明 crash/resource failure containment，不宣传为 OS sandbox。允许的 Provider roots 由现有 Provider settings/environment authority 解析；reader 对 symlink、realpath 与相对路径做 containment 检查，不能越过已确认 root。

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

## Agent、Chat 与 Groups

`Agent | Chat` 只改变入口与用户边界：

- Agent 路由到 folder-backed Project Thread 和现有 Workbench；
- Chat 路由到 Home/Studio managed Project Thread 与 managed workspace/outbox；
- Groups 直接使用 Synara Space identity/name/order/lifecycle，并由同一 Thread command/event/projection 的 `groupIds` 表达多对多 membership；
- `Send to Agent` 只创建/打开 folder-backed Project Thread，并携带用户选择的 prompt、attachments 与 artifact refs。

Projects 不再按 Space 过滤或归组；Group 删除只从 Thread metadata 移除其 identity，不删除/移动 Thread。上述动作不创建新 aggregate、join ledger 或第二恢复状态，不复制 native Session，不承诺跨 Provider continuation，也不改变 Provider Registry。

## Provider Registry 与 adapter

Provider Registry 只做 `ProviderKind → ProviderAdapter` lookup；Provider Service/Session Directory 使用现有 Thread binding 管理 lifecycle。

V1 只向现有闭合 `ProviderKind` 增加一个 `omnimind` literal，并穷尽更新已有 descriptor、schema、settings、model discovery、usage、health 与 UI maps；不把 ProviderKind 改成动态插件系统。Pi-family implementation 只参数化真实变化的 provider ID、runtime entry、state/version/policy，不能复制整份 Pi adapter。

adapter contract 只保留 source 实际支持的操作，例如 start/stop/send/interrupt、native resume、canonical event stream 与可选 discovery。optional 表示不同 Provider 可以不存在该能力；不表示 Host 可以省略当前 runtime 已暴露且属于 V1 产品面的能力。存在时必须由既有 adapter/provenance owner投影并保持用户可达，不存在时才隐藏或显示 unavailable；不模拟成功、不 silent fallback、不由另一 Provider 接管。

Provider 切换沿用 stop-first replacement：当前 operation 结束或停止后才启动目标 Provider；目标失败时恢复上一 exact binding。Product transcript 不能替代 Provider native context。

ProviderService 在任何当前 adapter 可发出 runtime event 之前，必须先持久化带 lifecycle generation 的 `starting` binding；journal row 只能投影到同 Thread、同 Provider、同 generation 的 durable binding。无 binding 的 row 一律只推进消费 cursor 并跳过 Product 投影；generation-less row 只能兼容仍明确标为 `legacy` 的同 Provider binding，不能进入 UUID generation，也不能由 Ingestion 猜测或补写为当前 generation。该兼容只处理既有诊断尾部，不授权 adapter、测试注入或新调用方省略 generation。

## OmniMind Agent 与 stock Pi

OmniMind Agent runtime 拥有：

- 独立 OmniMind Agent Session、resume、branch 与 compaction；
- agent loop、model runtime、stream、usage、steer、abort 与 settlement；
- Pi-compatible PackageManager/ResourceLoader、Extensions、Skills、Prompts、Tools、MCP 与独立 private state；
- OmniMind Agent native error、raw event 与 UI request。

其首个代码与 ecosystem compatibility baseline 是 Pi stable `v0.84.1`，但产物使用 OmniMind Agent 自身 version、bundle identity、configuration 与 state root，并随应用发布。为了同时隔离 global 与 project-local state，OmniMind Agent 必须使用独立 Pi-derived build/package，或让 upstream config-dir 在 runtime instance 上显式可配置；仅传入另一 global `agentDir` 不足以证明隔离。其 global settings/session/package 与 project-local settings/resources 都使用 `.omnimind`。后续优化不受 stock Pi release cadence 约束；Pi lineage、license 与修改边界必须可追踪。

stock Pi 继续由 inherited `pi` adapter 拥有其 Session、Pi version、configuration、PackageManager/ResourceLoader 和 `.pi` native state。只有用户显式选择 stock Pi 后，该 Provider 才可按原生 contract 访问自己的 state；OmniMind Agent、产品 reset 与后台 discovery 都不得读取、迁移、同步或改写它。两者可共享窄的 Pi-family transport/event bridge，只要行为确实同构；不得共享 Provider identity、Session cursor、agentDir/state root、Package install state 或 diagnostics。

stock Pi 的“实际会话 runtime version”和“本机可选 `pi` CLI version”是两个事实。若 session 使用 bundled SDK，就不能用 `pi --version` 冒充其执行版本；local CLI 只能作为独立诊断字段显示。

### OmniMind Agent Model services authority

`Model services / 模型服务` 只配置 OmniMind Agent 内置 Pi ModelRuntime 的 provider、authentication、model catalog 与 Pi-compatible custom provider；它不是跨 Engine credential center。Codex、Claude、OpenCode、stock Pi 等独立 Engine 继续由各自 adapter/native configuration 拥有登录、目录和 Session，凭据不得迁入 OmniMind Agent 的 private home。

Server 通过 OmniMind-Agent-scoped typed surface 把 Pi 的 provider/auth/catalog capability 安全投影给 Web，authority 仍是锁定 Pi package 与 `.omnimind` 下的 Pi-compatible state：

- provider、auth method/status、known/available model 与 network-refresh capability 来自 Pi ModelRuntime，不由 OmniMind 维护静态供应商/模型 capability 镜像；
- Model-service discovery 的主入口只消费 Pi runtime 已暴露的 built-in/extension metadata；built-in 与经用户显式 intent、由 Pi 既有 ResourceLoader/Session owner 安全加载的 Extension provider 都是 V1 必达结果。被动页面不执行第三方 Extension，“通过 API 地址连接”只是低频 presentation 分支，Host 不为任何一条路径建立另一套 discovery、registry 或 catalog authority；
- generic `models.json` 配置只允许 Pi 官方支持的 `openai-completions`、`openai-responses`、`anthropic-messages` 与 `google-generative-ai` 四种协议；其他 protocol/auth/discovery/stream/tool/usage 只能来自真实 Pi Extension，不能由 Host 按品牌或 URL 猜测；
- 持久 API key 与 OAuth 走 Pi `login()`/`logout()` credential-store lifecycle；runtime API-key override 只用于明确的一次性/未保存操作，不得显示为已保存；
- Pi `AuthInteraction` 的 text/secret/select/manual-code prompt 与 info/auth-url/device-code/progress event 通过短生命周期、可取消的 typed bridge 呈现，secret/token 不进入 Product state、query cache、Timeline 或日志；
- provider-scoped network refresh、last-good catalog 与 cache 语义由 Pi models store/provider implementation 拥有；普通 model-list refetch 不得冒充网络刷新；
- Settings operation 使用 task-local ModelRuntime，不能把一个全局可变 runtime 注入所有 Thread。credential/config/catalog mutation 不热切当前 turn；每个隔离 Session 在下一次 send admission 前按同一 agentDir 的 process-local mutation revision 刷新自身 runtime snapshot。该 revision 只做失效通知，不是第二持久化真相；
- 同一商业供应商可用不同稳定 Pi provider id 表达多个服务实例，但只呈现 Pi config/extension 对该 identity 真实支持的 auth、catalog 与 stream 能力；不能按品牌名复制 built-in OAuth 或动态 fetcher；
- custom provider 持久化优先采用 Pi 公开的 provider-config mutation API。锁定版本尚无该 API，维护者已授权在既有 product-owned Pi ModelConfig/ModelRuntime owner 内增加窄、typed、可删除的 mutation seam；它必须保证 locked read-modify-write、unknown-field preservation、原子替换和 Pi reload validation，待上游 API adopted 后删除。该授权不允许建立 `model-services.json`、Channel store、renderer/Host 文件写入或第二 parser/schema authority。
- OmniMind model identity 只来自 exact user selection 或当前 Pi runtime catalog。Project、Terminal、Kanban、Automation 与其他 direct consumer 在没有 exact selection 时必须保持 null/fail closed；不得用 `DEFAULT_MODEL_BY_PROVIDER`、供应商品牌或退役 slug 合成 OmniMind binding。

被动 Settings 投影还有更窄的安全门：Server 必须解析并证明 `.omnimind` agent root 的物理 containment，也必须把存在的 stock `.pi` root 解析为物理路径并拒绝 candidate 与该 root 或其子树重合；只比较 lexical `~/.pi` 不能排除 symlink/junction alias。这个隔离检查只允许读取 root path metadata，不得枚举、打开或读取 `.pi` 内的 credential、config、catalog、package 或 Session。所有 `.omnimind` 本地 config/cache read 都由同一个 no-follow、hard byte bound、caller-cancellable reader 完成；字符串路径正确或先检查再让 runtime 重新打开文件都不构成证明。不得用含 credential/header 的临时副本或 OmniMind 自建 `models.json` parser/schema 绕开此门。锁定 Pi API 无法注入该 reader 时，受影响的 projection 必须 typed fail，不能偷偷降级或读取。被动 mount 不加载/执行 extension；`origin: extension` 只可来自已经由显式 intent scope 加载并提供 provenance 的 Pi runtime。

Model-service projection 不拥有 Composer/Project reference。需要把被引用但未配置的 service 加入列表时，只接受 Product State owner 给出的 exact stable service id，不能从品牌、产品默认或 model slug 推导。离线观察到 OAuth access token 到期只能投影 `refresh_required`；只有 provider-owned login/refresh 的明确失败证据才能称 `sign_in_expired`。

Model-service mutation 只能失效 OmniMind Agent 的 service/catalog projection 与相关 Session snapshot，不能改写 Conversation transcript、Project facts、其他 Engine state 或 stock Pi `.pi`。当前 selection 失效时要求用户重选，不 silent fallback 到另一 provider/Engine。

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

用户显式选择某个 Engine（即当前 Provider runtime）后，其有效能力集合是 **该 Engine 的完整 native ecosystem + 与该 Engine 真实兼容的 OmniMind Library assets + OmniMind Workbench**。Codex、Pi、OpenCode 等 Engine 自己的 Skill、MCP、Tool、configuration、authentication 与 Session 能力不得因进入 OmniMind 而被替换、裁掉或伪装成 OmniMind 能力。

OmniMind-owned Skill/MCP 的生命周期归 OmniMind，通过现有 adapter 或 Session projection 注入/挂载；不得复制、覆盖或迁移到 `~/.codex`、`.pi` 或其他 Engine private home。native 与 OmniMind asset 的 provenance、identity 始终保留；同名冲突不得静默覆盖，只有经实际 capability 检查兼容的资产才进入有效集合，不兼容时准确显示 unavailable。OmniMind Agent 可以消费可移植的 Codex/Pi assets，但 Codex/Pi 专属 runtime semantics 仍只属于相应 Engine，不能因资产可读而冒充支持。

Engine native tool/extension 在当前 Session 产生的短时 Web UI 保留原生能力，由 OmniMind Host 负责桌面呈现：只有 adapter 已观察到、带 Engine/Thread/Tool provenance、仍在有效期内的 exact intent，才默认进入当前 Thread 的 OmniMind Browser/Workbench；不覆盖当前 route、不抢 Composer focus。系统浏览器只由用户在 Browser 中显式选择“Open externally”后打开。不得拦截普通 localhost、开发服务器或任意 URL，也不得修改 Engine private home 或插件字节来偷改语义；短时 bearer URL 只在内存中完成 Host handoff，不进入 Product facts、Timeline raw payload、日志、Campaign 或证据截图。Host 不可用时准确显示 unavailable，不 silent fallback 到系统浏览器。

Package lifecycle 不跨 Provider归一：

- OmniMind Agent UI 直接调用 bundled Pi-compatible manager/loader/settings/trust，并写入独立 OmniMind state root；
- stock Pi 继续拥有其 PackageManager/Settings/Trust/ResourceLoader，但 UI 只使用 inherited adapter 已经暴露的动作；不为了和 OmniMind Agent 对称而扩大 stock Pi adapter；
- 其他 Provider 使用各自 discovery 与其实际支持的 actions；
- 共同表面直接复用 Synara PluginLibrary、Skills 页面和 provider discovery，只负责导航、按 Provider 分组、来源/rights 展示和 diagnostics；
- curated/preinstalled OmniMind Agent 资源使用发行时 manifest 记录 source、hash、license 与 ecosystem API compatibility，不成为运行时 state store。

上述动作列表以每个 Provider 的真实 capability 为条件，但“有能力才显示”只控制逐 Provider 的 UI，不控制产品是否接线。OmniMind Agent 在锁定 Pi-compatible runtime 中已经存在的 manager/loader/settings/trust 与 lifecycle 操作必须进入共同表面；若某个动作因 native contract 不足而暂缓，必须记录精确安全反例和恢复条件，不能用 optional method 或 OPEN 标签无限期替代。

不得新增 `PackageActivation`、current/LKG、generation lease、跨 Provider rollback 或第二 Marketplace。Package 更新对活跃 Session 的影响完全按原生 runtime 行为呈现；若原生 contract 不足以安全暴露某动作，就暂不提供该按钮。

上述组合不产生 shared `PackageActivation`/current/LKG、generic plugin platform、permission broker 或跨 Engine durable state；PluginLibrary/Registry 只投影 native + additive 能力事实，不接管 Engine 私有运行时责任。

```engine-capability-composition
{
  "effectiveCapabilities": [
    "engine-native-ecosystem",
    "compatible-omnimind-library",
    "omnimind-workbench"
  ],
  "nativeEcosystemDisposition": "preserve",
  "nativeCapabilityReachability": "required-when-runtime-exposes",
  "omnimindAssetDelivery": "adapter-or-session-mount",
  "enginePrivateHomeMutation": "forbidden",
  "identityConflict": "explicit",
  "crossEngineDurableState": "forbidden",
  "temporaryWebSurfacePresentation": "current-thread-omnimind-browser",
  "temporaryWebSurfaceProvenance": "engine-thread-tool-required",
  "externalBrowserActivation": "explicit-user-only",
  "temporaryWebSurfaceDurability": "memory-only"
}
```

## First-public storage

V1 只保留 inherited orchestration 对 Project/Thread/Space command/event/projection 的一份 canonical product truth，并继续允许各 Provider 使用自己的 native/private state。OmniMind Agent 使用新的 `.omnimind` global/project-local namespace；stock Pi 的 `.pi` settings/packages/sessions 保持原样，不被产品或 OmniMind Agent 读取、迁移或写入。

不得为不同 Provider 建平行 Product databases，也不得为了清理历史发布 destructive rebuild。Provider native state 可以不同，但 Project/Thread/Space/Timeline 只有 inherited 一份。

## 本地系统能力

File、Git 与 Terminal 分别由 filesystem、Git repository 与 local process/PTY 拥有。OmniMind 直接复用 Synara 的 typed commands、viewer、save/conflict behavior、Git journey 和 per-thread terminal state。

iOS Simulator Device 是同一 Desktop→Server 系统能力链的一部分，不是 Provider runtime 或第二控制面。`DeviceService`/`DeviceManager` 唯一拥有设备枚举、boot ownership、每 Thread attachment、helper lifecycle、frame transport 与操作结果；Web 只消费 typed RPC/event/frame contract，native helper 只负责 CoreSimulator/SimulatorKit 桥接。helper 源码随 macOS App 物理打包，并在用户机器上按当前 Xcode build 编译到 `~/Library/Caches/omnimind/device-helper/<xcode-build>/`；缓存、binary、环境变量、Unix socket 与临时路径全部使用 OmniMind namespace，打包必须同时保留 facebook/idb 精确 MIT notice。

Device 的 read-only discovery、screen、UI tree 与 screenshot 可作为现有 Agent Gateway 的 system tools 暴露；tap、swipe、key、text、hardware button、boot、shutdown、install、launch 与 open-url 等 mutation 只有在同一精确 invocation 存在可验证 approval receipt 时才执行。当前 Host 没有 receipt bridge，因此 Agent mutation 默认 fail-closed，并引导用户在 Device pane 显式操作；不得从 Provider 名称、full-access 标签、历史批准或 pane 可见性推断授权，也不得为 Device 建第二 permission broker。macOS helper 的 sandbox profile 缺失或不可读时启动失败；仅显式 development opt-out 可运行 unconfined helper，且不得包装成 production sandbox 保证。

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
