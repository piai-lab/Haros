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

## Agent、Chat、Studio 与 Groups

`Agent | Chat | Studio` 只改变入口与用户边界；Provider 仍只有两种 work-surface 投影：

- Agent 路由到 folder-backed Project Thread 和现有 Workbench；
- Chat 路由到 Home managed Project Thread，无 Primary Folder；
- Studio 默认沿用 Synara 当前 Studio container 与 managed workspace/outputs，Provider 继续投影为 `chat`；后续只有在具体缺口证据成立时，才在既有 owner 内作最小必要偏离；
- Groups 直接使用 Synara Space identity/name/order/lifecycle，并由同一 Thread command/event/projection 的 `groupIds` 表达多对多 membership；
- `Send to Agent` 通过既有 fork owner 创建新的 folder-backed Project Thread，导入完整产品可见历史、明确 mentions 与受限克隆的 target-owned attachments；不使用 provider handoff、不复制 native Session、不自动执行。

Projects 不再按 Space 过滤或归组；Group 删除只从 Thread metadata 移除其 identity，不删除/移动 Thread。上述动作不创建新 aggregate、join ledger 或第二恢复状态，不复制 native Session，不承诺跨 Provider continuation，也不改变 Provider Registry。

## Provider Registry 与 adapter

Provider Registry 只做 `ProviderKind → ProviderAdapter` lookup；Provider Service/Session Directory 使用现有 Thread binding 管理 lifecycle。

Provider identity与runtime capability必须沿同一单向责任链投影。Contracts/provider identity owner唯一给出合法ProviderKind及稳定identity；已注册adapter/runtime owner唯一给出其真实capability与当前health，Server据此组装credential-blind capability snapshot供Composer、Settings、profile stats与runtime-mode consumer使用。Shared或Web不得再维护“支持turn steering的Provider”“可用auto mode的Provider”或完整ProviderKind白名单等手写镜像。若某个启动前或编译期路径确实必须使用静态capability descriptor，该descriptor必须同时驱动adapter registration与外部projection，并以确定性parity gate防止漂移；不能只靠`keep in sync`注释。这里不授权把identity、assets、models、credentials、Settings与executor揉成巨型Provider registry。

这条链严格区分五类事实：Contracts只拥有合法identity；adapter/runtime拥有结构能力；runtime evidence拥有当前health、auth与version；model descriptor拥有model级能力；Workbench presentation拥有普通用户名称、图标、说明和恢复文案。identity存在不能推导registered、ready或available，结构支持也不能推导此刻可执行。Server只组合与请求Provider/model identity绑定的credential-blind projection；unknown、未注册、错配或畸形输入fail closed。全量Discovery schema必须直接复用canonical ProviderKind；真正有不同成员语义的domain subset必须具名并从identity owner派生，不能匿名复制完整literal集合。

通用ServerSettings只接收和持久化非秘密Server事实；Provider server password等credential由ProviderCredentials唯一写入，不能出现在通用Settings patch或settings JSON。credential mutation成功后，ServerSettings/view owner必须复用现有write semaphore或等价串行边界，基于fresh非秘密settings snapshot重算credential-blind configured projection并沿既有settings stream发布；该动作不写settings JSON、不增加settings revision，也不新建锁、stream或cache。这样credential mutation与普通Settings update并发时，subscriber最终同时看到最新非秘密字段与最新configured状态，不会由旧snapshot倒灌其他字段。Web只消费该projection，不能缓存secret或自行推断configured。

V1 只向现有闭合 `ProviderKind` 增加一个 `omnimind` literal，并让既有schema、settings、model discovery、usage、health与UI consumer通过上述identity/capability owner的窄projection获得它；不把 ProviderKind 改成动态插件系统，也不要求consumer各自增加完整Provider清单。Pi-family implementation 只参数化真实变化的 provider ID、runtime entry、state/version/policy，不能复制整份 Pi adapter。

adapter contract 只保留 source 实际支持的操作，例如 start/stop/send/interrupt、native resume、canonical event stream 与可选 discovery。optional 表示不同 Provider 可以不存在该能力；不表示 Host 可以省略当前 runtime 已暴露且属于 V1 产品面的能力。存在时必须由既有 adapter/provenance owner投影并保持用户可达，不存在时才隐藏或显示 unavailable；不模拟成功、不 silent fallback、不由另一 Provider 接管。

runtime Token拆分只有一个Provider-neutral合同：`TokenUsageBreakdown { cachedInputTokens, uncachedInputTokens, outputTokens }`；`ThreadTokenUsageSnapshot.totalTokenBreakdown`是当前runtime session累计、可做单调delta的canonical值，`lastTokenBreakdown`是最近一次已结算请求。三桶互斥：cache read进入cached input，cache write/creation进入uncached input，reasoning只在上游独立于output报告时进入output一次。Codex把cached视为input子集；Pi使用`cacheRead / input+cacheWrite / output`；Claude使用`cache_read / base input+cache_creation / output`；OpenCode使用`cache.read / input+cache.write / output+独立reasoning`。ACP及其他来源无法证明拆分时省略breakdown；负数、非整数或相互矛盾的字段在adapter边界fail closed，Web不得补猜。旧含义不一致的input/cache/output/reasoning scalar不再是runtime合同。

Profile只从canonical累计breakdown做有序delta：重复快照不累计，counter reset以当前值作为新基线，产生delta的真实turn selection拥有模型归因。最近30天按客户端传入的同一固定UTC offset补齐无活动日期；unknown拆分不进入缓存率分母，coverage准确为complete/partial/unavailable。此projection复用现有Profile RPC、SQLite writer与projection event，不建立前端累计store、第二usage数据库或借用需另行授权的Usage History indexer。

Provider 切换沿用 stop-first replacement：当前 operation 结束或停止后才启动目标 Provider；目标失败时恢复上一 exact binding。Product transcript 不能替代 Provider native context。

ProviderService 在任何当前 adapter 可发出 runtime event 之前，必须先持久化带 lifecycle generation 的 `starting` binding；journal row 只能投影到同 Thread、同 Provider、同 generation 的 durable binding。无 binding 的 row 一律只推进消费 cursor 并跳过 Product 投影；generation-less row 只能兼容仍明确标为 `legacy` 的同 Provider binding，不能进入 UUID generation，也不能由 Ingestion 猜测或补写为当前 generation。该兼容只处理既有诊断尾部，不授权 adapter、测试注入或新调用方省略 generation。

## OmniMind Agent 与 stock Pi

OmniMind Agent runtime 拥有：

- 独立 OmniMind Agent Session、resume、branch 与 compaction；
- agent loop、model runtime、stream、usage、steer、abort 与 settlement；
- Pi-compatible PackageManager/ResourceLoader、Extensions、Skills、Prompts、Tools、MCP 与独立 private state；
- OmniMind Agent native error、raw event 与 UI request。

其当前代码与 ecosystem compatibility baseline 是 Pi stable `v0.84.2`，但产物使用 OmniMind Agent 自身 version、bundle identity、configuration 与 state root，并随应用发布。为了同时隔离 global 与 project-local state，OmniMind Agent 必须使用独立 Pi-derived build/package，或让 upstream config-dir 在 runtime instance 上显式可配置；仅传入另一 global `agentDir` 不足以证明隔离。其 global settings/session/package 与 project-local settings/resources 都使用 `.omnimind`。后续优化不受 stock Pi release cadence 约束；Pi lineage、license 与修改边界必须可追踪。

stock Pi 继续由 inherited `pi` adapter 拥有其 Session、Pi version、configuration、PackageManager/ResourceLoader 和 `.pi` native state。只有用户显式选择 stock Pi 后，该 Provider 才可按原生 contract 访问自己的 state；OmniMind Agent、产品 reset 与后台 discovery 都不得读取、迁移、同步或改写它。两者可共享窄的 Pi-family transport/event bridge，只要行为确实同构；不得共享 Provider identity、Session cursor、agentDir/state root、Package install state 或 diagnostics。

stock Pi 的“实际会话 runtime version”和“本机可选 `pi` CLI version”是两个事实。若 session 使用 bundled SDK，就不能用 `pi --version` 冒充其执行版本；local CLI 只能作为独立诊断字段显示。

OmniMind Agent Core 是上述 Pi-compatible runtime 与多个独立 Extension owner 的组合宿主，不是所有工具的业务或状态 owner。进入同一 Pi Registry 只表示共用 `ToolDefinition`/registered/active 运行时语义，不会合并 source、maintenance、registration、execution、state、authorization 或 cross-Engine distribution authority。产品随附的自有 Session Extension、AgentGateway Host 投影 Extension、OmniMind 维护的上游 fork 与用户直接安装的上游 Extension 必须保留各自 provenance 与 lifecycle；具体采用方式只由 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) 定义，不在运行时另建来源 registry 或控制面。只有 AgentGateway canonical Host tools 可根据目标 Engine 的官方 seam 跨 Engine 投影；其他 Pi-native Extension 不因为被 OmniMind Agent Core 组合就自动成为 Host capability。

### OmniMind identity、work surface 与 project context

bundled `omnimind` Provider 的 engine contract 由 Host 作为不可被 `SYSTEM.md`、`APPEND_SYSTEM.md`、Skill、Extension 或未来 Prompt 管理覆盖的稳定层注入。Pi 继续按原生顺序组合、替换和修改 mutable base，包括现有 general Host harness/tool guidance 与每回合执行的 `before_agent_start` Extension；在最终模型请求前，runtime 只删除其中已有的同一 canonical engine contract，再把当前 Session 冻结的 engine contract 追加到末尾，保证 exactly once。它直接声明：`You are OmniMind, created by πAI-Lab at the International Academy of Phronesis Medicine (Guangdong). The academy's official Chinese name is 广东智慧医学国际研究院.`；模型应按用户语言自然回答，不在每次回复重复来源。stock `pi` 和其他 Engine 不接收这段 identity，继续保留原生身份。general Host harness/tool guidance 不属于 immutable engine contract，仍服从原生 mutable append/Extension 顺序；其中 Browser、Device 等已知 runtimeMode 事实漂移必须由后续 Host diet 在各自 owner 修正，不能借身份冻结扩大为不可覆盖产品合同。

同一 engine contract 包含共同 cognitive core 与按 work surface 选择的行为：

- 共同层把用户首个表述视为线索而非完整规格；先调查模型能够从上下文和工具获得的事实，对只有用户知道且会实质改变结果的目标、偏好、约束或质量要求积极提问，并附带推荐理解；不假设用户具有当前领域的专业知识，也不因此降低结果上限；
- Chat 在不误导时先给可用起点并并行澄清，只有方向会反转、产生实质风险或大量浪费时才先问；它侧重理解、探索、判断、学习与产出，不获得修改现有 Project 的隐含授权；
- Agent 只有在 outcome、material boundaries、important constraints 与 success criteria 已充分对齐、且不存在会实质改变结果的未决分叉后才进入实质执行；对齐前可继续安全只读调查和可逆准备，对齐后在范围内主动完成、验证和收口；不可逆、付费、权限扩张、外部发送/发布、安全边界变化或超范围动作仍须事前确认；
- 用户明确要求“别问，直接做”时，低风险、可逆且不造成 material divergence 的未知可以说明关键假设后推进；该偏好不跨越 material intent fork 或高风险边界；
- 共同层保持独立判断、给出推荐主路径、主动识别盲点与更高路径，不迎合错误前提，不声称未实际执行或验证的结果。
- 共同层中的语言、语气、格式、详略与工作方式只定义默认值；用户或未来个人指令可以显式覆盖这些表达偏好，只要不与 identity、work-surface、alignment/task completion、truthfulness 或 safety 边界冲突。

work surface 只由 Product Orchestration 在 bundled `omnimind` Session admission 时从 canonical Project kind 派生：`project → agent`，`chat | studio → chat`。它只为该 Provider 随现有 Session binding 保存为恢复快照，model switch、Provider replacement rollback、Server restart 与 native resume 必须继续传递；ProviderService 对其他 Provider 的同名输入不传递也不持久化。不得新建 mode store、从 cwd 猜测或在 turn 文本中注入。Resource reload、compaction 与 branch 使用当前 Session 已冻结的同一 contract；Project kind 变化通过新的 Product Thread/Session表达，不做运行中热切。

OmniMind Agent 的逐回合任务快照由一个产品随附、named、hidden 的 Pi-native Session Extension 拥有。它在 OmniMind Agent 的 `agent` 与 `chat` 两种 frozen work surface 中注册，因此 Agent、Chat 与 Studio 默认共享；active 只表示当轮可选择，不表示自动调用、已经授权或跨应用常驻。stock Pi 与其他 Engine 不注册该 Extension。Extension 拥有definition、最短tool guidance、三态全量快照校验和实例级结果provenance；PiAdapter只负责Session wiring，并把可信成功结果薄投影为既有canonical `turn.tasks.updated`。工具名不是authority：同名user/project Extension继续遵循Pi原生precedence；若产品definition未被选中，只将Product Todo准确降级为unavailable并保留Session其余能力，第三方结果不得污染任务投影。该Session Extension不属于AgentGateway Host tools，不受Built-in Host exposure policy控制，也不进入Host动态加载。

Ask User只允许一个product-owned、bundled Pi-native `ask_user` Tool；多题、自由回答与Preview都是同一request/result的能力，不增加Tool，也不存在独立Review/Notes能力。每题 answer 只包含 authored preset selections 与可选 `customText`；单选需要条件、理由或解释时，用户以 `customText` 写出完整答案，不建立平行注释字段。其fork只拥有Tool definition、validation、structured result与窄interaction port，canonical request/result、Host capability、状态settlement、跨Engine projection与Composer UI仍由OmniMind owner拥有。OmniMind Session始终composition受provenance约束的bundled Extension；compatible presenter lease只决定active Tool exposure，send/continuation前重算，execute再次检查以关闭schema-to-execute竞态。registration/reload枚举全部同名Extension并断言唯一bundled source provenance。foreign winner、重复loser、无canonical UI、reload漂移或缺失lifecycle barrier时fail closed，不改名注册第二Ask，也不以普通文本追问降级。Ask与Approval始终分离，User Input answer不改变runtimeMode或授权。intentional Desktop shutdown必须先调用每次启动凭据保护的loopback shutdown route并等待bundled Server真实退出，POSIX信号只作为有界force fallback；Server先seal presenter registration并等待当前/晚到`unavailable` handoff，再quiesce command admission、关闭Provider producers、drain subscribers与engine。quiesce只允许Server内部Provider Runtime标记的在途事实继续落盘，Web可发送的普通`thread.activity.append`不得借此获得shutdown准入；seal后新presenter不能复活旧request。

Pi的`executionMode: sequential`只是历史必要条件，不是充分屏障。OmniMind在pinned `@earendil-works/pi-agent-core@0.84.2`增加默认惰性的`executionMode: "barrier"`：batch在任何sibling prepare/hook/execute前找到source-order第一个barrier，只执行它，其余sibling生成blocked result；answered进入新的模型continuation重新规划，terminal/error结束当前loop。没有barrier Tool的stock parallel/sequential路径不变。每个waiting request以Session generation、turn、toolCall、request identity fencing，submit/cancel/abort/timeout/unavailable只能settle一次，late/double/foreign answer拒绝。App/Server退出或Session replacement后旧Tool Promise不可恢复，Product State只标stale；新Session必须创建新request。若presenter/provenance任一门不成立，Tool从active surface移除或execute race返回unavailable。

Project resource trust 同样来自 Product authority，而非 Pi SDK 默认值：canonical folder-backed Project 及其 materialized worktree 只在正式 Agent Session admission 后显式 trusted；规则读取边界是对应 Project/worktree root → 当前 cwd，并继续保留 OmniMind/Pi 各自 global agent-dir context。Chat/Studio 不获得 project-local trust，也不扫描 managed cwd 的 project resources。没有 active Session 时，OmniMind 的 Skills、Prompt commands 与 model discovery 一律使用 untrusted/global-only loader，不执行 Project Extension；首轮前 project-local autocomplete/template picker 不属于本轮 contract，真实首轮 Agent 请求仍在发送前通过正式 Session 加载可信 Project 资源。Skills/commands 查询按 Thread 与“物理 Session 可能仍存在”隔离缓存：可恢复 `error` 仍使用 active tuple，只有 `closed` 才切回 global-only；key 变化时必须先呈现固定空结果，不能把上一 Thread/Session 的资源作为 placeholder，Session admission 或关闭后也不能复用另一 trust tuple 的名称/描述。被动 model discovery 不绑定 Thread 或 Session，也不借机加载 Project Extension。Pi ResourceLoader 继续唯一拥有 context candidate precedence、Settings、Extensions、Skills、Prompts 与 reload；Host 只传递 canonical surface/root，不复制 loader、Trust store 或规则数据库。

OmniMind Agent 提示词设置包含两个不同且唯一的持久 authority。默认基础指令的 factory text 由 product-owned bundled runtime 导出，用户定制值由既有 Server settings owner 保存；该私有正文不得进入公共 `ServerSettingsView`、普通 settings stream 或通用 `ServerSettingsPatch`。Prompt service 只能调用 Server settings owner 内同一 write semaphore 下完成 compare-current、no-op 与持久化的窄 internal mutation seam，不能建立第二 settings writer；并发编辑必须有且仅有一个成功，旧 expected value 返回 typed conflict。定制值只作为同一个 native `buildSystemPrompt` 的稳定 instruction segment 输入，不能映射为 `customPrompt`/`SYSTEM.md`，不能经 Host append 注入，也不能复制 builder。builder 仍唯一组合 dynamic tools、guidelines、append、context files、Skills 与 cwd；Extension mutation 后的 immutable OmniMind contract 仍 exactly once。恢复默认只移除用户定制值，使 builder 重新采用当前安装版本 factory text。

这两项设置属于 canonical `provider === "omnimind"`，因此对该 Engine 的 Chat 与 Agent Session 同样进入 Session snapshot；`workSurface` 只选择 Chat/Agent contract、Project trust 与工具投影，不过滤 default/custom rules。其他 Provider 一律不读取这些值。初始 Session 必须在首个 request 前把当前 customized default 传入 service-based native creation；保存只更新 provider-global 持久事实，不解析或操作任何 Thread。已经存在的 Session 保持创建时的旧 snapshot，新的或由正常 Provider 生命周期重建的 Session 才读取当前值。底层 resource reload seam 继续归 Session/Extension 生命周期使用，但 Prompt Settings 不暴露逐对话 reload，也不在保存后批量重建 Session。

自定义规则继续在既有 `.omnimind/agent` owner 上使用安全文件投影与 mutation seam。Host 必须复用 bundled runtime 的公开 discovery 来确定五个 global context candidate 中当前实际选中的 source，并继续让该 runtime 唯一拥有 precedence、`SYSTEM.md` / `APPEND_SYSTEM.md` 组合、Project shadow、Session resource snapshot 与 reload；Host 不复制选择或组合算法，不做每轮动态注入，不建立 Prompt registry/profile/history/cache、第二 loader 或跨 Engine 同步。固定候选 allowlist 只用于 typed contract、安全校验和选择 exact active source，不能反向成为 precedence authority。Settings 不再投影或 mutate `SYSTEM.md` / `APPEND_SYSTEM.md`，但高级用户手工文件的原生 discovery、replacement/append 与 Project shadow 语义保持不变。

Renderer 对自定义规则只提交 opaque source id、expected version 与 create/update/remove intent；绝对路径或 `displayPath` 不能成为写入 authority。Server 从唯一 `resolveOmniMindAgentDir` 根解析目标，只对 global context candidate 执行 containment、symlink/regular-file/identity、UTF-8、bounded-size 与并发版本检查，再以现有 atomic-write owner 完成 mutation。通用 editable-text 的 1 MiB 只作为调用 bundled discovery 前的 allocation guard；bundled helper 决定 active source 后，只有 active source 应用 contracts-owned 8 KiB/segment Prompt 编辑边界与文本规则。active 不可编辑时 snapshot 返回该资源 unavailable 和安全路径，默认提示词仍可用；被遮蔽的 9 KiB 候选不得阻断更高优先级的可编辑 active source。两段最大设置正文合计 16 KiB，按保守一 byte 至多一 token 的工程估计不超过当前最小 32k context window 的一半；这是为 native builder/tools/context/skills/messages 留余量的稳定跨模型边界，不是任意 tokenizer 的数学保证。读取 snapshot 不创建文件；no-op 不写、不 reload。OmniMind 进程内 mutation 串行化，update/remove 在 commit 前重新检查 source、identity 与 expected version；这是对非协作外部 editor 的乐观冲突检测，不是严格的跨进程 compare-and-replace/remove。Node 公开 `fs` 没有把 inode/version 条件与 `rename` 或 `unlink` 组成单个原子操作的 seam，最终检查与 commit 之间仍有极窄 TOCTOU 窗口；不得以 native addon、第二 writer、协作锁或 rollback 子系统填补。首次 create 继续由 shared atomic writer 的 link/`EEXIST` no-clobber 语义保证不覆盖 raced target。若未来 Node 或既有 owner 暴露真实 CAS，只在保持既有调用方行为不变时重新评估。

默认定制 setting、自定义规则文件与 active Session 是不同 authority。保存成功不热切当前 Session；Prompt Settings 不调用、包装或排队 `omnimindEcosystem.reload({ threadId })`。该 exact-thread seam 继续归 Extension、Skill、Package、Plugin Library 和高级 `/reload` 等既有原生生命周期入口，busy 时拒绝且不取消 in-flight operation；其成功或失败都不是 Prompt Settings receipt。当前 operation 在 admission 时已经冻结的 system prompt、messages 与 tools 不因同时发生的 save 或其他入口的 reload 改变。Settings visit/cancel、absent-empty 与 no-op 必须保持 setting revision、文件 bytes/mtime、request bytes、system-prompt digest、reload count 与原生 cache 可用性稳定。

Prompt snapshot 是一次最多懒加载一个 bounded local editable-text resource 的 standard WS read，不与全量 workspace/search/diff 等 expensive read 共用两条 lease；即使同一 client 的 expensive-read capacity 已满，Settings 仍必须可读取该 snapshot。transport 或其他 retryable admission 失败时 UI 保留无 mutation 事实并提供显式重试，不以提高全局 expensive-read limit 掩盖分类错误。

product-owned OmniMind Pi build 的默认 base 必须删除 Pi coding-assistant identity 和未随 archive 发行的 Pi docs/examples 导航，并导出一个身份中立、稳定、可编辑的 factory instruction segment；没有用户定制时 builder 使用该 factory bytes，有定制时只替换该 segment。它必须继续保留原生 dynamic tools、guidelines、custom `SYSTEM.md` replacement、append、context files、Skills、Extension turn mutation、cwd 与 operation snapshot。手工 `SYSTEM.md` 仍按原生语义替换整个 default base，因此也替换 factory/custom segment，但不能删除最终 immutable contract。错误 base 被真正移除，不能只靠后置 Host 文案掩盖；factory/custom segment、mutable Host harness guidance 与 immutable engine contract 是三个不同责任。

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

## Runtime mode：一个任务只有一个自动化边界

Product Thread 的 `runtimeMode` 是 Engine adapter 与 OmniMind Host capability 的共同输入，不是只约束 Provider command 的装饰标签。它由 Product state 持久化、由每次 dispatch 携带，并在子 Thread/child capability 创建时沿现有 privilege rule 继承；Browser、Device、Gateway 和 future Host tool 不能再各自发明一层默认拒绝或 approval ledger。

| Mode                | Engine adapter                                            | OmniMind Host                                                            | UI truth                                                               |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `full-access`       | 映射到该 Engine 可证明的 unrestricted/no-ask 语义         | 当前任务已经表达的普通 Browser、Device、文件、命令、网络和下载直接执行   | 不出现普通操作 approval；成功只留必要结果                              |
| `auto`              | 只在 exact Engine/model 有真实 reviewer/classifier 时提供 | 只在 Host 也有可验证的自动裁决路径时覆盖 Host mutation；否则该组合不可选 | 仅真实高风险分类结果可介入                                             |
| `approval-required` | 只在 adapter 有 request/response path 时提供              | 只在 Host 有可完成的 approval bridge 时提供                              | 显示 exact scope/consequence；没有 bridge 时不可选而不是运行时一律拒绝 |

`runtimeMode`只回答一个已经enabled、当前available且属于用户任务意图的具体能力，是否还需要普通approval；它不证明每个Device entry都属于普通能力，不证明其service/platform/executable closure成立，也不授予Device 12/12产品准入。Device exposure default、逐entry availability与安全分类、12/12执行闭合仍是独立事实。Browser任务内下载在`full-access`下不重复收取普通approval，也不替Product/Artifact owner决定下载落点、receipt或恢复语义。

登录、2FA、系统原生权限面板、物理设备到场以及用户没有表达过的发布、付费或远端删除，是“需要人完成或需要扩张任务意图”，不应伪装成普通工具权限。相反，测试、依赖安装、工作区写入、网页点击、模拟器输入和任务内下载不能因为底层换成 Host tool 就重新收费一次确认。

`acceptForSession` 是 wire decision 名，不拥有用户语义。当前实现若会把持久 Thread mode 改为 `full-access`，UI 必须表达“此任务始终允许”；若未来要提供真正的 process-session override，应由 adapter 保存为易失 native state，不能与 Thread mode 同名。

Engine/Host 对某一 mode 没有真实实现时，capability projection 必须返回 unavailable/unsupported，并由 Composer 隐藏该选项。尤其 Pi-family adapter 当前只保存 `runtimeMode`、没有 OmniMind approval request path；在实现真实 gate 之前不能把 `approval-required` 宣称为可用。

运行模式有三个不能互相覆盖的事实层：Product State持久保存用户选择；Engine + exact model + Host closure决定结构支持；结构支持再叠加当前health/auth/version才决定此刻能否执行。永久`unsupported`与暂时`unavailable/degraded`必须分别投影。重启、CLI降级、adapter/model/Host变化或临时故障不得由consumer静默改写持久选择；恢复后原选择自然重新可执行，用户也可主动选择替代模式。

turn steering参与同一次command admission的确定性决策。Server拥有一份同时驱动loaded adapter capability与admission projection的结构描述；Orchestration在接纳前从该owner读取一次bounded snapshot并作为显式输入交给pure decider。该次operation采用native steer或queue-interrupt-redispatch的结果随canonical command/event事实传递，reactor、runtime ingestion与Web只消费该结果，不在不同时间重新按Provider ID判断。能力在admission后变化只影响后续command；restart随当前Server composition重建，不持久化第二份全局capability state。若某Provider未注册，面向consumer的execution projection仍必须fail closed。

## 扩展与生态

用户显式选择某个 Engine（即当前 Provider runtime）后，其有效能力集合是 **该 Engine 的完整 native ecosystem + 与该 Engine 真实兼容的 OmniMind Library assets + OmniMind Workbench**。Codex、Pi、OpenCode 等 Engine 自己的 Skill、MCP、Tool、configuration、authentication 与 Session 能力不得因进入 OmniMind 而被替换、裁掉或伪装成 OmniMind 能力。

OmniMind 内置 Tasks、Diagnostics、Goals、Automations、Browser 与 Device 六组 Host capability 继续由对应 Host service 与 `AgentGateway` 唯一拥有 canonical tool catalog、schema、execution、credential、capability、turn authority、cancellation 与 lifecycle。Engine adapter只能无损投影同一 catalog并把调用转回同一 Gateway；不得逐 Engine复制 schema、handler、permission或credential state，也不得建立跨 Engine Tool/Plugin Registry。六组只是用户可理解的全局 exposure policy 与 catalog provenance，不是六个物理 Extension、package、执行进程或 lifecycle owner。

一份 shared pure policy 穷举六组 × Agent/Chat/Studio 三个 ProductSurface 的 `supported/defaultEnabled`，ProductSurface 每次从 authoritative `Project.kind` 派生且不持久化。Agent 与 Studio 的 Tasks、Diagnostics、Goals、Automations、Browser 默认开启，Device 默认关闭；Chat 的 Browser 默认开启，Goals、Automations、Device 支持但默认关闭，Tasks、Diagnostics 不支持。Studio 即使继续使用 `chat` ProviderWorkSurface，也必须按 Studio ProductSurface 解析 Host policy。最终 Desired Host Surface 是 `canonical catalog ∩ ProductSurface support ∩ configured intent/default ∩ runtime availability`；Web、adapter、Goal 与 Automation lifecycle 都不能复制这张矩阵。

ServerSettings 只持久化有界的 `agentTools.builtInGroupOverrides.{agent|chat|studio}[groupId]=boolean`：缺失表示 canonical default，存在表示用户明确 intent，unknown bounded key可 round-trip 但没有运行效果，unsupported cell恒为false且不接受新增或改变。旧合同最多容纳32个unknown group id；v4单surface map上限为40，足以在迁移时同时保留全部legacy unknown与六个known group intent，而不建立新quota或兼容store。该字段在现有 settings patch owner 内使用整字段 replacement，其他字段继续 deep merge；Reset只删除known overrides。一次性v4迁移在schema default抹掉raw presence前读取旧`disabledBuiltInGroups`：Agent与Studio supported cells保留旧全局effective intent，Chat只保留旧Browser intent，Chat新支持的Goals/Automations/Device采用default off，unknown disabled IDs有界保留为fail-closed。迁移后旧字段退出运行时合同，不永久双读；fresh/no-file不ambient write，corrupt继续quarantine，原子写失败不能先发布内存成功。

Settings的`revision`与settings正文必须在现有write semaphore内作为同一快照读取和提交；Built-in groups RPC只从一次原子快照与同一canonical catalog生成页面完整read model，不形成第二enabled truth。Goal continuation与Automation新run在各自既有dispatch admission重新消费当前surface policy：关闭Chat Goals使用既有pause语义停止新continuation；关闭Chat Automations使尚未admit的新run进入既有failed路径，已admitted in-flight不伪取消。Agent与Studio按各自cell独立，不受Chat override影响。

OmniMind Agent 是 Pi-native multi-Extension composition host。Pi `AgentSession`、`ResourceLoader`与Tool Registry是OmniMind Agent runtime内唯一的Extension注册、`sourceInfo`、registered/active、Session、reload与Provider wire真相；这不取代AgentGateway的canonical Host catalog，也不把Gateway升级成Extension Registry。Extension是注册与Session生命周期单元，execute backend是另一维度：每个Extension必须分别明确source、maintenance、registration、activation、execution/state与distribution owner，不能因为都进入Pi Registry就合并业务责任。

产品随附Extension只通过一份显式、有限的Session composition seam接线。该seam接受创建当前Session所需的窄依赖并返回当前产品随附的inline Extensions；它不扫描、安装、排序、缓存或管理第三方资源，不是Plugin/Extension Manager。团队、用户与第三方Extension继续由Pi `ResourceLoader`按各自原生package/extension lifecycle加载。新增产品随附Extension可以修改这份显式composition list，但不能迫使PiAdapter重写核心Session流程。

投影必须尊重目标Engine的原生组合机制：

- canonical `provider === "omnimind"`把当前policy允许且平台/服务可用的AgentGateway definitions无损转换成Pi `ToolDefinition`，由一个named、hidden、session-scoped AgentGateway Host Projection Extension注册。当前Host Projection选择eager：这些definitions注册后直接active，不附加Host-owned callable loader，不维护lexical matcher、inactive Host pool、activation preflight、第二索引或active store。没有明确activator的tool不得设为inactive。
- stock Pi继续通过现有Pi `customTools` seam direct/eager获得同一filtered Host surface；Codex、Claude、OpenCode、ACP与其他正式支持Engine继续使用其native MCP/plugin/adapter seam。adapter只改变投影管道，不能把Provider identity固化为Host权限等级。
- 所有健康、正式支持且thread-scoped Gateway接线成功的Engine追求同一Desired Host Surface：`canonical Gateway catalog ∩ ProductSurface support ∩ configured intent/default ∩ machine/service availability`。Delivered Host Surface还必须与该Engine本次thread-scoped projection实际安装成功相交；缺失是准确的unavailable、collision或adapter defect，不是该Engine的正常低配等级。Engine-native Bash、read/edit/write、sandbox、approval、Todo、context、resume与Package不参与Host平权。
- 两条投影共享同一AgentGateway definition与call owner，但不共享Engine私有配置、Package、Session、registry或credential lifecycle。Gateway内部duplicate必须拒绝。cross-source同名时，Host只把当前Pi `ResourceLoader`的`sourceInfo`证明由该Host inline source赢得的name视为Delivered Host Surface；foreign winner继续按Pi precedence运行，但不得获得Gateway provenance、Host prompt承诺、canonical dependency身份或事件投影。冲突默认只使对应Host capability局部unavailable并发出既有diagnostic，依赖它的dispatch fail closed；Session其余能力继续。这个owned delivered set只是当前Session的派生事实，不持久化，也不形成第二registry。

Host inline factory通过Pi公开的async `ExtensionFactory`在初载及native ResourceLoader reload时实时重读当前`tools/list`，不闭包固定descriptor snapshot，也不建立mutable descriptor store或reload controller。Gateway connection lease随当前Provider Session存续，不能因某次catalog为空、读取失败或全部collision而提前释放；lease只是下次原生reload可重试的transport事实，不等于Delivered Host capability。reload后仍从当前Session真实`sourceInfo`重新派生交付集合，旧runner/handler不得继续投影结果。

Host guidance只描述当前Session实际Delivered groups，并与Session schema同生命周期；它不是per-turn热更新控制面。关闭某组后旧Session可能仍看见stale schema，但Gateway在每次新`tools/call`前按当前Thread/ProductSurface、settings、availability、exact-turn与capability实时复验并立即拒绝；重新开启只在新Session或Engine已有的真实native reload后获得schema。普通toggle不伪取消已admit的in-flight call，Session credential也不成为第二permission authority。

Host eager是当前AgentGateway Host Projection的已确认选择，不是所有Extension的永久规则。稳定不变量是：loading lifecycle归具体Extension owner；没有activator就不能inactive。未来某个Browser、Device、团队或第三方Extension只有在拥有独立source/package/version/install/lifecycle，或真实schema体积与稀疏使用证据证明净收益时，才可由该Extension按Pi官方模式携带只管理自身tools的loader。不得恢复Host/global search manager；如果未来Pi upstream提供真正的全局发现机制，优先采用upstream owner而不是在OmniMind重造。

Built-in关闭某组后，新Session不投影、不注册该组。旧Session中的stale schema可以暂时可见，但Gateway必须在每次新调用admission前按当前policy与availability拒绝；普通exposure toggle不伪取消已经准入的in-flight call。重新开启只按目标Engine真实reload/new Session边界注册并active，不能把未注册schema偷偷注入旧Session，也不能建立per-turn removal controller或第二active truth。若Goal、Automation等当前职责依赖的Host capability被policy、availability或collision排除，必须阻止或暂停对应dispatch并准确投影unavailable，不能绕过policy或伪造完成。

Prompt只承诺当前实际投影成功的definitions。ToolDefinition负责普通用法、参数与错误，generic Host harness只保留跨工具不变量，例如exact authority、Automation run-only duty、Browser人类接管/中止以及网页、文件、Device文本不可信；不得重复完整catalog或schema。当前eager Host不需要搜索/激活指导，也不需要Goal/Automation activation preflight；canonical Goal/Automation dispatch只在同一request前检查实时policy/availability与当前Pi `sourceInfo`确认为Host winner的bounded dependency，缺失则局部拒绝，不修改active set。`registered != active != exposed != available != authorized != executed`：每次真实调用仍按当前Built-in policy、session identity、credential、availability、runtime mode/permission、真实存在的approval、exact turn authority、timeout与cancellation重新判定。

Provider MCP transport在HTTP ingress把整个request/batch绑定到当时同一个immutable exact turn；batch内每个`tools/call`仍在handler admission前独立复验，不按数组顺序继承新turn，也不为此串行化batch。检查顺序是provider-session identity → ingress exact turn → live policy/availability → capability → handler。`tools/list`、initialize与ping只需有效Provider Session，可在无active turn时工作；read、wait与diagnostics同样属于真实`tools/call`，不能绕过exact-turn。terminal tombstone、explicit cancel与timeout只处理已经注册的in-flight request，普通Built-in toggle不是kill switch。External connections继续使用独立external-client principal/transport，不套Provider turn authority。

PiAdapter只负责创建Pi Session、组装明确的product-bundled inline Extensions、接入supervised Bash与Gateway connection，并把可信Pi事件薄投影为canonical events。它不拥有Extension definition、全局搜索、Built-in group policy、permission、Todo validation、Goal/Automation lifecycle、collision策略、active set或完整prompt catalog。Pi built-ins、Todo、supervised Bash、团队/第三方Extension及Skills/Packages始终是非Host owner；Host Projection不得盘点、保留、移除或控制它们。

`@omnimind/om-web-access`是bundled OmniMind Agent专用的Pi-native Extension，不是第七组Host capability，也不进入AgentGateway或跨Engine投影。它保留自己的source、maintenance、configuration、Provider routing、Tool、Curator与Session cleanup责任；Pi `ResourceLoader`、Tool Registry / active set仍唯一拥有registered/active与Session lifecycle。产品不安装、注册、测试或承诺该fork对stock Pi可用，stock Pi继续使用上游package及其原生生命周期。

该fork集中内置为OmniMind monorepo私有workspace package，不建立独立GitHub fork、npm发布或第二tgz/sync控制面。来源管理记录exact upstream commit/version/license、保留原目录与作者测试，并以独立untouched baseline和可重复P1–P6 diff证明修改；不得把这种可追溯性写成不存在的GitHub fork ancestry。

Web Access的canonical默认workflow只属于OmniMind bundled profile并固定为`auto-summary`：新配置显式写入该值，OmniMind配置缺失workflow时也按同一默认解析；保留的upstream/default export继续遵循作者原始默认，不能被OmniMind产品决定全局改写。日常自然语言联网沿`search → canonical routing/fallback → 保存完整结果与responseId → background summary → same-run continuation`完成，不创建waiting-for-user、不等待用户批准。`summary-review`只在用户于Settings明确选择、单次tool call明确覆盖，或Agent已自动补搜、交叉验证与`source_check`后仍确实需要人判断来源取舍时进入；任务标签本身不能机械触发review。`none`继续直接返回raw results。已有文件中显式保存的workflow保持原值，不因默认变化被改写，也不为尚未发行的默认调整新增迁移平台。

workflow与Right Dock展示是两个独立维度。OmniMind Settings提供默认关闭的“自动显示搜索过程”：`auto-summary`或`none`在该项开启时可为owning foreground Thread创建dedicated ephemeral观察Tab，实时展示完整结果、Provider、来源、进度、错误与恢复，但tool call不进入waiting-for-user、不要求Approve且继续按各自workflow自动完成；关闭Tab/Right Dock只隐藏，不取消搜索。`summary-review`无论该展示项是否关闭都必须提供可操作审查界面并保持pending。这个展示选择优先复用作者已有auto-open intent，由package config owner解释为OmniMind typed Right Dock presentation，不能形成第二workflow、第二状态owner或系统浏览器/manual-token fallback。

Web Access的runtime Provider定义是服务stable ID、参与`auto/all/explicit-only`、配置前提、连接角色与routing eligibility的唯一来源。供Settings、Curator、Timeline和技术详情使用的presentation字段必须与这些exact定义同源并由Server做credential-blind投影，不能在Web、AgentGateway或另一个manifest中平行枚举服务；presentation字段缺失只触发中性UI fallback，绝不能改变路由、可用性或active set。新增、删除或重命名上游Provider时，同一fork revision必须同时闭合runtime定义、presentation覆盖、品牌资产准入和作者/OmniMind回归，不能让UI冻结在某个历史“26家”快照。

Web Access canonical配置只由fork package导出的config read/mutation service拥有；Settings在没有Pi Session/Extension instance时调用同一服务，Session内Provider也消费它，不能各自解析、缓存或写入第二份配置。`web-search.json`只在首次进入Web Search Settings或首次启动OmniMind Agent Session时由先发生的一方原子创建；App启动、普通页面和被动readiness不ambient write，Settings也不得为读取配置实例化Session或执行Extension。package同时唯一拥有`schemaVersion`、known-schema解析与有界迁移：读取不因版本旧而ambient rewrite，已知旧版本只在显式mutation的原子提交内升级并保留unknown fields；损坏JSON或高于当前实现的schema必须fail closed并保留原文件，不能自动覆盖、降级或另建Host migration平台。

Web Access的不可用收缩按工具真实依赖执行，而不是整包开关。普通Settings不提供master enable switch，但OmniMind profile尊重canonical文件中作者原有的`webSearch.enabled`及`tools.webSearch/sourceCheck/fetchContent/getSearchContent.enabled`细粒度开关：用户显式关闭哪个工具，Pi注册时就不注册哪个工具；这不是Host policy或新的activation owner。App与Session启动不发health/search probe；Session init只根据配置、credential source、endpoint和native auth投影structurally possible。Settings的主状态必须由package按当前`auto/named/array/all`选择与同一descriptor prerequisite计算：named缺少或部分配置不能显示可用；array/all只要作者真实语义下仍有结构候选即可继续显示可尝试；file-level关闭必须显示关闭。Web只能渲染该projection，不能自己从字段或workflow猜。第一次真实搜索沿canonical route惰性获得availability证据；用户显式“重新检查”才主动运行同一最小真实route，可能消耗Provider额度，也不生成永久connected truth；同一显式动作pending期间必须single-flight，不能因连点、重渲染或超时恢复重复计费。只有当前configured/default search candidate set被可靠穷尽时，Extension才从当前Pi Session active set移除自己拥有的`web_search`与`source_check`；`fetch_content`与`get_search_content`仍可依赖direct URL、本地解析或已有结果而保留。单个named Provider失败或只有transient/network错误只能投影degraded，不能证明全局unavailable。Settings原子保存或显式刷新成功后，package config service只发布process-local revision invalidation；每个live Extension instance自行重读并只恢复自己曾移除的两个工具，listener随Session shutdown清理。这个signal不是持久真相，也不维护全局Session registry；外部文件编辑由Settings刷新、native reload或新Session重新发现，不增加file watcher、后台timer、健康daemon或AgentGateway协调器。

同一package runtime descriptor还必须导出三类窄、credential-blind projection，而不是让consumer重新猜：Provider prerequisite完整性、file-level四工具effective enablement、以及Agent-facing canonical ID/auto/all/explicit-only顺序。prerequisite evaluator必须表达多必填字段、替代credential groups、key-or-Session的unknown/session-dependent状态、Gemini API key/gateway pair/browser cookie等真实可行路径；Settings不得实例化Pi Session，也不得把session-dependent路径谎报为缺失或ready。Provider的Settings分组由descriptor附着的稳定connection role投影，不能用“存在可选endpoint字段”等UI heuristic重新推断。Settings、Curator合法Provider校验与tool schema/description只消费这些projection；新增Provider不能要求手改Server、Web、Curator、Timeline或第二logo表。Provider测试结果携带request identity，Renderer只向同一Provider详情投影该结果。Curator切换Provider时，正式endpoint必须等待package config service的expected-revision mutation并返回credential-blind typed persistence outcome；重搜与持久默认是两个可分别成功/失败的事实，multi-query partial success与无query也必须准确投影，Curator Server与页面均不得成为第二writer。Browser presentation请求携带locale snapshot对应标题；invalid/expired session、read-only observer mutation、invalid Provider、config conflict与fatal settlement使用有界typed code，由Curator双语catalog负责普通文案。

Web Access的typed搜索页面有两种产品语义：`summary-review`是pending tool call的短时交互面；`auto-summary/none`在用户显式开启自动展示时只是非阻塞观察面。二者第一次呈现都通过Browser owner内部typed seam创建独立ephemeral Tab，绝不能复用并导航用户当前Tab；只有review的pending handle进入Timeline waiting/reopen合同。观察面terminal时立即释放server/stream/timer/token与presentation handle，已加载页面可保留静态结果并明确“摘要已发送给Agent，Run正在继续”或“结果已发送给Agent”，但Timeline不得留下reopen，App/Thread reopen不得恢复过期协议。只有owning Thread位于前台时才自动呈现；后台review只使用既有waiting-for-user activity/attention，后台observer不切route、不抢Right Dock。这个内部seam不得扩张Agent可见`browser_open` schema，也不得建立Curator tab store、Product fact或第二Browser lifecycle。

关闭Curator Tab、Right Dock或Browser pane只关闭展示，不取消tool call。单个tool call terminal只清理该call自己的Curator server、stream、timer、request、presentation handle和临时资源；Run abort只中止该Run拥有的in-flight calls；`session_start/session_tree`保留上游语义但只作用于当前Extension instance和对应branch；`session_shutdown`才清理整个instance、全部剩余请求、cache、storedResults、listener与临时资源。可恢复presentation失败保持pending并允许retry；Curator server/protocol或Host handoff不可恢复失败必须typed-error settle并按call scope cleanup。Curator控制台是internal-only surface：隐藏`Open externally`、raw-link copy和raw token地址；其中的来源链接打开为普通OmniMind Browser Tab，之后遵循普通Browser的外部打开合同。ephemeral Tab从第一次投影起就必须排除Browser recent history、localStorage与tab restore；loopback response禁用cache/referrer传播，token不得进入Product event、Timeline raw payload、log、diagnostics或截图。Curator创建时使用当前OmniMind locale、resolved light/dark变体与appearance owner生成的credential-blind resolved theme tokens短时presentation snapshot；Renderer只在App/appearance composition层发布这一全局presentation context，Chat、Settings或其他feature consumer不得成为其生命周期owner。Browser/Server/package只转交或渲染，不解释主题预设、不从OS/browser默认猜测，也不持久化第二份locale/theme/palette状态。跨进程边界必须验证snapshot字段完整、长度有界且不含CSS变量、URL、声明或markup；partial/畸形payload与缺snapshot一样在bundled OmniMind路径fail closed，不能部分落回固定黑白palette。无typed snapshot的upstream/default profile可保留作者fallback。snapshot在internal surface创建时冻结，并覆盖该短时surface的完整生命周期；关闭Tab后的exact reopen继续呈现同一surface、同一server/page与同一snapshot，只有创建新的surface才读取当前snapshot。已打开或重开的surface不因App换肤重启协议或增加持续同步listener。

OmniMind-owned Skill/MCP 的生命周期归 OmniMind，通过现有 adapter 或 Session projection 注入/挂载；不得复制、覆盖或迁移到 `~/.codex`、`.pi` 或其他 Engine private home。native 与 OmniMind asset 的 provenance、identity 始终保留；同名冲突不得静默覆盖，只有经实际 capability 检查兼容的资产才进入有效集合，不兼容时准确显示 unavailable。OmniMind Agent 可以消费可移植的 Codex/Pi assets，但 Codex/Pi 专属 runtime semantics 仍只属于相应 Engine，不能因资产可读而冒充支持。

本轮 Composer Skill 选择的投递边界固定如下：OmniMind 显式多 Skill 选择走 Host inline seam；Pi ResourceLoader 仍唯一负责 Pi 原生发现、precedence、主动调用与 reload，Host 不 fork 或 patch Pi。原生支持 Skill reference 的 Provider 继续沿其 native reference/mention 路径，回执只证明 Provider 已接受 Host 交给本轮的引用。inline 投递必须完整可读并能完整放入预算才算成功；不可读、单项超限与预算不足按项返回稳定失败原因，后续项继续尝试。Provider 接受 turn 后，现有 `thread.activity.append` 为每项写入稳定幂等的 `skill.instructions.delivered`/`skill.instructions.failed` activity；接受前整体失败不写成功回执，回执写入失败不重发已接受的 turn，只记录脱敏诊断。payload 只含安全 Skill 名称、状态、方式、失败枚举与关联 id，不含路径、正文或凭据。

Engine native tool/extension 在当前 Session 产生的短时 Web UI 保留原生能力，由 OmniMind Host 负责桌面呈现：只有 adapter 已观察到、带 Engine/Thread/Tool provenance、仍在有效期内的 exact intent，才默认进入当前 Thread 的 OmniMind Browser/Workbench；不覆盖当前 route、不复用并改写用户当前Browser Tab、不抢 Composer focus。系统浏览器只由用户在 Browser 中显式选择“Open externally”后打开。不得拦截普通 localhost、开发服务器或任意 URL，也不得修改 Engine private home 或插件字节来偷改语义；短时 bearer URL 只在内存中完成 Host handoff，不进入 Browser历史/restore、Product facts、Timeline raw payload、日志、Campaign 或证据截图。Host 不可用时准确显示 unavailable，不 silent fallback 到系统浏览器。

Package lifecycle 不跨 Provider归一：

- OmniMind Agent UI 直接调用 bundled Pi-compatible manager/loader/settings/trust，并写入独立 OmniMind state root；
- stock Pi 继续拥有其 PackageManager/Settings/Trust/ResourceLoader，但 UI 只使用 inherited adapter 已经暴露的动作；不为了和 OmniMind Agent 对称而扩大 stock Pi adapter；
- 其他 Provider 使用各自 discovery 与其实际支持的 actions；
- 共同表面直接复用 Synara PluginLibrary、Skills 页面和 provider discovery，只负责导航、按 Provider 分组、来源/rights 展示和 diagnostics；
- curated/preinstalled OmniMind Agent 资源使用发行时 manifest 记录 source、hash、license 与 ecosystem API compatibility，不成为运行时 state store。

上述动作列表以每个 Provider 的真实 capability 为条件，但“有能力才显示”只控制逐 Provider 的 UI，不控制产品是否接线。OmniMind Agent 在锁定 Pi-compatible runtime 中已经存在的 manager/loader/settings/trust 与 lifecycle 操作必须进入共同表面；若某个动作因 native contract 不足而暂缓，必须记录精确安全反例和恢复条件，不能用 optional method 或 OPEN 标签无限期替代。

不得新增 `PackageActivation`、current/LKG、generation lease、跨 Provider rollback 或第二 Marketplace。Package 更新对活跃 Session 的影响完全按原生 runtime 行为呈现；若原生 contract 不足以安全暴露某动作，就暂不提供该按钮。

上述组合不产生 shared `PackageActivation`/current/LKG、generic plugin platform、permission broker 或跨 Engine durable state；PluginLibrary/Registry 只投影 native + additive 能力事实，不接管 Engine 私有运行时责任。

这里禁止的是复制 Engine-native Session、resume、memory store 或 plugin lifecycle，不是禁止普通 OmniMind-owned workspace artifacts。下方 `omnimindWorkspaceArtifacts` 只表示当前 Files/Artifacts 等 additive、single-owner、按需读取的普通文件能力，不授权 automatic project context、Memory 或 Knowledge writer；后者必须经过本文件后述的独立 Gate。

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
  "omnimindWorkspaceArtifacts": "additive-single-owner-jit",
  "temporaryWebSurfacePresentation": "current-thread-omnimind-browser",
  "temporaryWebSurfaceProvenance": "engine-thread-tool-required",
  "externalBrowserActivation": "explicit-user-only",
  "temporaryWebSurfaceDurability": "memory-only"
}
```

## First-public storage

V1 只保留 inherited orchestration 对 Project/Thread/Space command/event/projection 的一份 canonical product truth，并继续允许各 Provider 使用自己的 native/private state。OmniMind Agent 使用新的 `.omnimind` global/project-local namespace；stock Pi 的 `.pi` settings/packages/sessions 保持原样，不被产品或 OmniMind Agent 读取、迁移或写入。

不得为不同 Provider 建平行 Product databases，也不得为了清理历史发布 destructive rebuild。Provider native state 可以不同，但 Project/Thread/Space/Timeline 只有 inherited 一份。

## Project context：first-public 使用普通文件，自动 Memory/Knowledge 延后

首次公开发行以用户 workspace files、`rg/read`、Product Thread 与 Engine-native session/compaction 作为上下文事实。当前没有已准入的 OmniMind automatic Memory/Knowledge writer；Thread Recap 仍只是 Web UI recap，不升级为 durable memory。

自动 Project Context 会新增长期 writer、scope、provenance、correction/forget、staleness、并发与恢复责任。只有代表性重复任务证明最小 source packet 或 derived Markdown 相对 raw files 在任务质量、token/latency/cost 或恢复上有明确净收益，并由维护者确认这项新增持久责任时，才能重开；`execution-brief.md` 只记录当前是否正在施工及真实冲突，不能单独授予或否决。

未来若准入，边界预先锁定为：

- Knowledge、Memory、Thread Recap 与 Engine-native resume/memory 保持不同语义；
- 最多一个 project-local writer；无 personal/global vault、vector/graph DB、常驻 daemon 或第二 scheduler；
- 只保存可审查的 project facts/evidence，不保存完整 transcript、raw reasoning、secret 或 subagent 中间猜测；
- 不读取、迁移或镜像 `.codex`、`.claude`、`.pi` 等 Engine private home；
- provenance、correction、forget、source deletion、conflict、stale 与 crash recovery 在默认自动开启前闭合；
- 正文 JIT，不把 wiki/memory 塞进稳定大前缀。

在该独立 Gate 通过前，不预建路径、索引、设置、后台 job、图标、writer queue 或 UI pane。

## 本地系统能力

File、Git 与 Terminal 分别由 filesystem、Git repository 与 local process/PTY 拥有。OmniMind 直接复用 Synara 的 typed commands、viewer、save/conflict behavior、Git journey 和 per-thread terminal state。

iOS Simulator Device 是同一 Desktop→Server 系统能力链的一部分，不是 Provider runtime 或第二控制面。`DeviceService`/`DeviceManager` 唯一拥有设备枚举、boot ownership、每 Thread attachment、helper lifecycle、frame transport 与操作结果；Web 只消费 typed RPC/event/frame contract，native helper 只负责 CoreSimulator/SimulatorKit 桥接。helper 源码随 macOS App 物理打包，并在用户机器上按当前 Xcode build 编译到 `~/Library/Caches/omnimind/device-helper/<xcode-build>/`；缓存、binary、环境变量、Unix socket 与临时路径全部使用 OmniMind namespace，打包必须同时保留 facebook/idb 精确 MIT notice。

Device的discovery、screen、UI tree、screenshot与mutation继续由现有Device/Gateway owner暴露，并继承caller Thread的`runtimeMode`。只有已经通过逐entry产品准入、安全分类、service/platform与executable-closure验证，且属于当前任务意图的普通操作，才在`full-access`下免除重复approval；本文不据此批准tap、swipe、key、text、hardware button、boot、shutdown、install、launch、open-url等全部entry 12/12直接执行。`approval-required`只有在Host已有真实request/response bridge时才可选，`auto`只有在Host有可验证reviewer时才覆盖对应mutation；不满足的entry准确unavailable/unsupported，不用默认关闭或mode名称掩盖。不得从Provider名称或pane可见性推断mode，也不得为Device建第二permission broker。macOS helper的sandbox profile缺失或不可读仍属于运行条件错误：production启动失败；仅显式development opt-out可运行unconfined helper，且不得包装成sandbox保证。

Browser的导航、点击、输入、上传和任务内下载使用同一mode语义：已准入、当前可用且属于任务意图的普通操作在`full-access`下不重复弹approval。Browser download落current project/workspace还是OmniMind managed artifact/download root、采用何种receipt与恢复，仍由Browser/Product Artifact owner独立裁决；runtimeMode不替它选路径。系统原生选择器、OAuth/2FA或用户实际接管继续进入human-presence flow。现有`BrowserDownloadApprovalRequired`无条件取消是current-source缺口，但本文不预先固定替代实现。

不建设第二 observed-version 平台。Agent structured mutation 必须复用现有 filesystem `expectedVersion`/atomic conflict truth；同一 Root delegation tree 内只允许 Root 或一个 foreground child 写，不同 Thread 与外部编辑器可以并存，但冲突必须 fail closed，不能静默覆盖。只有现实反例证明乐观冲突检测不足时才考虑更重 lease。

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
