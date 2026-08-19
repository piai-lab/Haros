# Product state

## 核心原则

OmniMind 直接继承 Synara 的 Project、Thread、Space、Studio 与单一 Product Orchestration。`Agent | Chat` 是两种用户工作方式，不是两套持久对象，也不授权创建第二个 Workspace、Conversation、Run、Group aggregate、Handoff 或 Package 生命周期。

产品层只保存已经由继承 substrate 证明必须跨 Provider 稳定、恢复和解释的用户事实。Provider adapter/runtime 继续拥有 native Session、protocol、transcript、Tool、permission 和私有生态语义；filesystem、Git 与 PTY 继续拥有各自真实状态。

## 产品语言到既有事实的映射

| 用户语言            | 直接复用的事实                                                                                      | 明确不新增                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Agent               | folder-backed Synara Project + Thread + Workbench                                                   | `AgentWorkspace`、第二 Conversation/Run store           |
| Chat                | Synara Home/Studio managed Project + Thread + managed workspace/outbox                              | 用户 Primary Folder、平行 Chat database                 |
| Groups              | Synara Space identity/name/order + Thread 的 `groupIds` metadata                                    | 新 `Group` aggregate、Project 标签或 membership ledger  |
| Send to Agent       | 创建或打开普通 folder-backed Project Thread，并带入用户选择的 prompt、attachment 与 artifact refs   | Handoff protocol、跨对象 replay、隐藏 cwd 切换          |
| Conversation        | Synara Thread 的用户可见身份                                                                        | Provider Session 的复制品                               |
| Agent/Provider 选择 | 现有 Provider binding 与 adapter registry；独立 `omnimind` 与 `pi` identities                       | 第二 Provider Registry 或跨 Provider Session            |
| Extensions / Skills | 既有 PluginLibrary/Skills discovery；有原生 API 时显示 Provider-scoped lifecycle                    | 顶层 Package aggregate、跨 Provider lifecycle authority |
| 运行模式            | Thread 上既有 `runtimeMode`，随下一次 dispatch 进入当前 Engine 与 Host capability                   | Provider 外再叠一套 permission profile 或逐工具授权账本 |
| Goal                | Synara Thread 内的持久 objective、计时/暂停/achievement、prompt injection 与 continuation lifecycle | 用逐回合 task list 代替 Goal、另建 Goal DB/daemon       |
| Todo / 当前步骤     | Provider runtime 的逐回合 `turn.tasks.updated` 全量快照与现有 Composer/Timeline 投影                | 持久 Goal、第二 Todo store 或跨回合成功 authority       |
| Notepad / 记事本    | 当前 Thread 的既有 `notes` metadata、command/event/projection 与恢复路径                            | Project 级笔记模板、Prompt/规则含义或独立 localStorage  |

命名映射只允许改变产品呈现，不改变底层唯一 owner。若现有 Synara 类型已经表达同一事实，OmniMind 必须直接复用或最小改名，不能再包装一层“更通用”的状态。

Goal 与 Todo 是两条互补事实。Goal 保存用户明确设定、可跨 turn 继续追求的完整 objective；Todo 只解释当前 turn 内正在做什么。Todo 完成不能自行清除 Goal，Goal 继续也不能伪造 Todo 已完成。Synara ThreadGoal 已在本产品继承的同一 Orchestration 内，不是竞争控制面；OmniMind 只做品牌、双语、Provider 与安全适配，并保留作者的持久化、恢复和竞态语义。

## Agent 与 Chat

### Agent

Agent 是 folder-backed 工作方式：使用现有 Project、Thread、File/Viewer/Diff/Terminal/Git 与 per-thread Workbench state。文件写入发生在用户明确打开的 folder-backed Project 中，仍受 filesystem、Git 和当前 Provider 的真实能力约束。

Agent 不是 durable entity。Provider 默认是 bundled OmniMind Agent，也可以选择 stock Pi、Codex、Claude、OpenCode 等；产品中的 “Agent” 顶层入口不等于 runtime 中的 Provider 或 Session。

OmniMind Agent 可以在当前 Root turn 内创建 bounded child Session；Root 始终对最终任务负责。child identity、状态和结果通过既有 Provider runtime event/Thread projection进入产品，不形成第二 Agent/Run registry。child 默认继承 Root exact model，也可明确选择同一 `.omnimind` Model/Auth authority 中已配置的 exact provider/model；不可用时准确失败，不 silent fallback。App/Server crash 后 active child 只恢复为 `interrupted` truth，不自动 mid-flight replay。

### Chat

Chat 复用 Synara 的 managed Home/Studio container。它没有用户选择的 Primary Folder，但可以把生成内容写到 OmniMind-owned managed workspace/outbox 并展示为 Artifact。用户上传或引用的外部文件默认只读；Chat 不默认修改既有用户 Project。

需要进入真实项目修改时，用户显式使用 `Send to Agent`：选择或创建 folder-backed Project Thread，带入当前 prompt、选择的 attachments 和 artifact references。该动作不复制原生 Session、不 replay 旧 operation、不保证跨 Provider continuation，也不在后台改变原 Chat 的 cwd。

### Provider work surface projection

`Agent | Chat` 不是新的持久化 mode。bundled `omnimind` Session admission 只从当前 Thread 所属 canonical Project kind 派生一个窄的 work-surface snapshot：`project → agent`，`chat | studio → chat`。该值只在该 Provider 的现有 binding 中保存，用于 restart/recovery 重建同一 Session 环境；其他 Provider admission 丢弃这两个 OmniMind-only 字段。Project kind 始终是唯一 authority，runtime payload 不能被独立编辑，也不能反向改写 Project。

不得从 cwd 是否存在、路径名称、Workbench pane、Provider、模型或 `providerOptions` 猜测 work surface。Home Chat 可以没有 provider cwd，Studio 可以有 managed cwd，folder-backed Agent 也可以在 Project 子目录或 worktree 中运行；只有 Project kind 能稳定区分产品语义。`Send to Agent` 创建/打开新的 folder-backed Thread，因此不热切或复用原 Chat Session。

### Groups

产品把 Synara Space 收窄呈现为 Group：Space 继续拥有 identity、name、order 与 lifecycle；membership 则是既有 Thread 上的去重 `groupIds` metadata。一条 Thread 可以属于多个 Group，未分组用空数组表达，并且只在 Projects 完整列表中出现；Project 自身没有 Group membership。

上游以 Project membership 表达的 `space.projects.assign` 不能原样复制。OmniMind 必须把相同用户结果翻译为 Thread `groupIds` 的既有 command/event/projection path；icon suggestion、switch/order/route restore、search/bulk selection 与 empty/void states 也在现有 Group UI owners 中证明，不新增 `spacesUiStore` 平行真相。

删除 Group 时，所有 Thread 对该 identity 的 membership 一并移除，但 Thread、Project、Folder、Provider Session、Run、permission、File 与 Git 均不删除、不移动。这个最小字段属于既有 Thread command/event/projection authority，不授权 join-table ledger、`Group` aggregate、Project-space 双轨或第二恢复状态。

## Conversation 与 Provider Session

Conversation/Thread 不是 Provider Session。一条可见 Thread 可以按 turn 保留不同 Provider provenance，但任一 native operation 只能属于一个 Provider Session。

用户改变 Provider 时：

1. Composer 保存的是下一次发送的 desired `ModelSelection`，它可以暂时不同于 active runtime binding；选择菜单本身不启动、停止或热切 native Session；
2. draft、attachments 与尚未接纳的 Queue 保持原样；
3. 下一次发送被 Product Orchestration 接纳时，以该 Entry 携带的 exact Engine、Model 与 provider-private options 作为 replacement/dispatch binding，使用继承的 stop-first replacement；
4. 目标启动失败时恢复上一 exact Provider binding，并把已经 commit 的 Composer/Footer selection 回滚到同一旧 binding；prompt、attachments 与未接纳 Queue 保持可恢复，绝不把该 prompt 自动发给旧 Provider；
5. 跨 Provider 不复用 resume cursor，也不把可见历史伪装成 native continuation；
6. unknown operation 不 replay、不 silent fallback。

Provider runtime 启动成功后，Product 对该次接纳所拥有的 Session 投影、exact `ModelSelection`、runtime mode 与 interaction mode 必须由同一个 internal Orchestration command 在同一 SQLite transaction 中提交；不得先单独提交 Session 再以多个 command 补写 binding metadata。事务内任一 event/projection/receipt 失败时整组保持旧值，safe retry 可重新提交整组但不得重复启动 runtime 或发送 prompt。Provider native Session 的启动/恢复与 Product SQLite transaction 属于两个不同 authority，无法伪装成跨进程原子事务；若进程在两者之间退出，只能按既有 unknown/quarantine 与 no-replay 边界恢复，不能把 native 成功推断为 Product binding 已提交。

OmniMind Agent 使用独立 `omnimind` Provider identity；stock Pi 保持 `pi` identity。二者可以共享经过证明同构的 Pi-family adapter core，但各自拥有 Session、version、configuration、state root、Package install state 与 diagnostics。OmniMind Agent 的全局和 project-local private state 都属于 `.omnimind`；stock Pi 的对应 native state 属于 `.pi`。任何 binding、resume cursor、native reference 或 filesystem state 都不能跨两者复用。

OmniMind Agent 全局提示词设置必须区分三层事实：文件 mutation receipt 只证明当前 global file 已创建、更新、保持不变或删除；Session reload receipt 只证明指定 OmniMind Agent Thread 的原生资源重载结果；已准入 operation 的 system prompt、messages 与 tools snapshot 已冻结，不能被前两者追溯热切。产品不保存 `pending prompt`、generation、LKG、history、rollback 或 cache dashboard 来把三层伪装成一个事务。文件是持久真相，Session 是 runtime snapshot，operation 是单次执行冻结面。

关闭并重开 App、停止并恢复 Thread 或 native Session 不承诺重放历史 exact Prompt。恢复继续沿用既有 binding/native refs；需要重建 Session 环境时读取当时磁盘上的当前原生资源。删除 active global candidate 后，后续 discovery 可以暴露下一候选；保留一个空的 active 文件仍保留其原生遮蔽语义。保存成功而 reload 失败时，文件事实保持成功，用户可以重试 reload 或开始新对话，产品不得声称自动回滚。

## Composer、Queue 与 receipt

Composer draft/QueueItem 在 Product Orchestration 接纳前可编辑、删除和排序。Renderer 把用户消息加入本地 Queue 时，QueueItem 即冻结当时 effective `ModelSelection`；后续 Composer 改选 Engine、Model 或 options 不得重写既有 QueueItem。QueueItem 被发送到 Product Orchestration 时，admission command/event 必须再次携带并 durable 保存该 exact selection；非 Composer caller 若省略 selection，Orchestration 必须在 admission 当下解析 Thread 的 effective selection 并冻结，promotion/dispatch 不得重新读取届时可能已变化的 Thread metadata。

接纳后沿用现有 command/event/receipt 与 Provider acceptance 路径，并保持原 Queue order。外层 receipt 只证明产品命令边界，native acceptance/settlement 仍由当前 adapter 证明。Queue 绑定不授权新增 Queue ledger、binding store、`pendingEngine` 或第二套 desired/runtime state。

不能为了“更确定”再创建 Run ledger、outbox 或 receipt store。acceptance 不确定时保持 unknown，不退回 editable Queue、不自动换 Provider、不自动 replay。

## Timeline 与 Workbench

Timeline 继续消费继承的 canonical events，并保留 Provider、Model 与必要 native references。只长期显示用户输入、Assistant 可见结果、结构化请求、重要 Activity/Tool，以及 File、Diff、Terminal、Artifact 等引用；raw event 只进入有界 diagnostics。

Workbench state 沿用 Synara 已有的 per-thread tabs、panes、viewer、terminal 和 layout state。File、Git、Terminal 不成为 Product database 的副本；重新观察外部变化并按现有机制提示即可。

## 账户额度与历史用量

账户额度与历史用量是两个独立事实域，不共享 fallback、刷新或失败状态：

- **账户额度**来自当前 Provider 的原生账户/rate-limit authority，只表达服务端可证明的容量、剩余额度、重置时间、套餐与 Credits。没有可靠来源时保持 `unsupported`、`unavailable` 或 `unknown`；不得从本地 transcript、Thread activity 或费用估算反推额度。
- **历史用量**来自用户明确授权读取的 Provider 私有 archive。原始 archive 始终是 source authority；OmniMind 只在现有 `state.sqlite` 中保存可删除、可重建的派生索引、file cursor、parser/pricing version、最小去重 identity 与聚合，不复制 prompt、回复正文、凭据或原始 JSONL。

历史索引不是第二 Conversation、Session、event store 或 transcript authority。它不进入 Orchestration replay，也不能被 Provider adapter 当作 native resume/usage truth。索引表只由 Server 的单一 SQLite writer 更新；隔离 reader process 不打开数据库。文件替换、截断、删除或 parser version 变化时，Server 在事务中撤销对应派生贡献并定向重算；清除索引只删除派生行，绝不删除 Provider archive。

用户 consent、暂停、checkpoint、last-good、partial/stale 与 provider-scoped failure 属于同一历史索引 owner。未确认前 archive 零读取；确认后允许低优先级、可取消的增量维护。启动、Header、普通对话恢复与账户额度查询只读各自现有状态，不触发 archive discovery 或扫描。

## 扩展与生态边界

V1 没有跨 Provider Package authority：

- OmniMind Agent 的 install/remove/update、settings、trust、cache/reload、loader 与 private state 由 bundled runtime 的 Pi-compatible native implementation 拥有，并使用独立 OmniMind state root；
- stock Pi 的对应生命周期继续由其 `DefaultPackageManager`、`DefaultResourceLoader` 与原生配置拥有，但 V1 UI 只暴露 inherited adapter 已真实提供的动作，不为与 OmniMind Agent 对称而扩展 contract；
- Codex、Claude、OpenCode 等只暴露其 adapter 已有的 Skill/Plugin/Command discovery 与真实可执行动作；
- OmniMind 直接复用既有 PluginLibrary、Skills 页面与 provider discovery；这些共同入口不是共同 lifecycle，也不得把不同 Provider 的 artifact 归一成可互换 Package；
- OmniMind-curated 或预装资源可以有发行时 manifest，记录 source、artifact/hash、license、经过验证的 Pi ecosystem compatibility range 和策展说明；该 manifest 不记录运行时 current、LKG、generation、enablement 或 native install state。

任何 install、enable、update、retry、remove 或 reload 按钮都必须直接调用对应 Provider 的原生能力；Provider 没有该能力时不发明通用动作。

## First-public lifecycle

公开 Alpha 前，旧开发状态不是 migration input，也不是 deletion target。外层 inherited orchestration 使用新的 first-public namespace；旧 Product/service/draft 与此前自建 Package product state 保持原样、零读取、零修改。

Provider native state、credentials、stock Pi settings/packages/session files、用户 workspace、Git、global config 与未知路径始终不动。OmniMind Agent 使用新的 `.omnimind` 全局与 project-local namespace，不读取或写入 `.pi`。只有用户显式选择 stock Pi Provider 后，stock Pi 自己才可按其原生 contract 使用 `.pi`；这不构成 OmniMind Agent 的迁移、同步或共享。若当前未发布 namespace 与旧字节碰撞，改变当前 namespace。

已退休的 Synara `Project instructions` 不属于 first-public 产品状态：不再有 Project 级 store、reader、writer、autosave、手动 copy 或新 Thread/Automation promotion 预填。Notepad 仍由当前 Thread 的既有 notes authority 拥有；由于历史 notes 没有可证明的来源标记，退休动作不扫描、不删除也不重写已有 Thread notes。旧 Project instructions 不迁移到 `AGENTS.md`、Notepad 或其他 Prompt 资源，产品也不为没有用户的开发期 key 保留 migration/cleanup rail。

## 恢复与结果真实性

Product Orchestration 恢复 command/event/projection；Provider adapter 恢复 native Session。两者通过现有 binding/native refs 汇合，不能互相伪造。

- Product event 已 durable、Provider 未接受：按 adapter 的 exact admission contract 处理；
- Provider acceptance 未知：禁止 replay 或切换 Provider；
- Provider 已接受、settlement 未观察：等待 native reconciliation 或显示 unknown；
- native Session 丢失：Thread 仍可读，新 Session 明确为 fresh/rebuilt；
- cancel/interrupt request 只证明已请求，native acknowledgement/terminal event 才证明结果。
- targeted child interrupt 必须引用 exact child identity；只停止目标 child，不能借已有 Root interrupt path 误杀 parent 或 sibling。Root stop-all 与 child stop 是两种不同语义。

## 权限真实性

Thread 的 `runtimeMode` 是用户对该任务自动化程度的唯一产品级选择。它不是 OS sandbox 声明，也不抹平各 Engine 的 native permission 模型；adapter 和 Host 只能把它翻译到真实可执行的底层语义：

- `full-access`：当前任务范围内的普通文件、命令、网络、Browser、Device 与工具副作用不再逐项询问；只有登录、2FA、系统原生授权或用户尚未表达的不可逆外部结果确实需要人完成时才介入；
- `auto`：仅在当前 Engine/Host 有可验证的自动裁决路径时可选；没有真实 reviewer/classifier 就不显示，不得退化成每步询问；
- `approval-required`：仅在当前 Engine/Host 有可完成的 approval request/response path 时可选；没有 bridge 就显示该模式不可用，不能先让用户选择再在运行时一律拒绝。

共同 UI 不建设第二 permission broker，也不维护跨 Provider deny-side-effect matrix。一次 `acceptForSession` 若实际会把持久 Thread 切换为 `full-access`，产品文案必须准确写成“此任务始终允许”，不能声称只影响易失 runtime session。Provider-native permission set、macOS/Windows 系统授权、OAuth/2FA 与不可逆外部发布继续保留自己的真实名称、scope、结果和取消语义。

Pi adapter 当前没有暴露 OmniMind approval request 时，`approval-required` 对该 Engine 就不是可用产品能力；记录一个未执行的 mode 不构成支持。进程隔离、Package verification、Provider 自述或“完全访问”标签都不等于 OS sandbox；只有 exact call path 能证明的自动执行、拒绝或介入行为才进入产品文案和验收。
