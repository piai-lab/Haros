# Product state

## 核心原则

OmniMind 直接继承 Synara 的 Project、Thread、Space、Studio 与单一 Product Orchestration。`Agent | Chat` 是两种用户工作方式，不是两套持久对象，也不授权创建第二个 Workspace、Conversation、Run、Group、Handoff 或 Package 生命周期。

产品层只保存已经由继承 substrate 证明必须跨 Provider 稳定、恢复和解释的用户事实。Provider adapter/runtime 继续拥有 native Session、protocol、transcript、Tool、permission 和私有生态语义；filesystem、Git 与 PTY 继续拥有各自真实状态。

## 产品语言到既有事实的映射

| 用户语言            | 直接复用的事实                                                                                    | 明确不新增                                              |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Agent               | folder-backed Synara Project + Thread + Workbench                                                 | `AgentWorkspace`、第二 Conversation/Run store           |
| Chat                | Synara Home/Studio managed Project + Thread + managed workspace/outbox                            | 用户 Primary Folder、平行 Chat database                 |
| Groups              | Synara Space 的产品标签与交互                                                                     | 新 `Group` aggregate 或 membership ledger               |
| Send to Agent       | 创建或打开普通 folder-backed Project Thread，并带入用户选择的 prompt、attachment 与 artifact refs | Handoff protocol、跨对象 replay、隐藏 cwd 切换          |
| Conversation        | Synara Thread 的用户可见身份                                                                      | Provider Session 的复制品                               |
| Agent/Provider 选择 | 现有 Provider binding 与 adapter registry；独立 `omnimind` 与 `pi` identities                     | 第二 Provider Registry 或跨 Provider Session            |
| Extensions / Skills | 既有 PluginLibrary/Skills discovery；有原生 API 时显示 Provider-scoped lifecycle                  | 顶层 Package aggregate、跨 Provider lifecycle authority |

命名映射只允许改变产品呈现，不改变底层唯一 owner。若现有 Synara 类型已经表达同一事实，OmniMind 必须直接复用或最小改名，不能再包装一层“更通用”的状态。

## Agent 与 Chat

### Agent

Agent 是 folder-backed 工作方式：使用现有 Project、Thread、File/Viewer/Diff/Terminal/Git 与 per-thread Workbench state。文件写入发生在用户明确打开的 folder-backed Project 中，仍受 filesystem、Git 和当前 Provider 的真实能力约束。

Agent 不是 durable entity。Provider 默认是 bundled OmniMind Agent，也可以选择 stock Pi、Codex、Claude、OpenCode 等；产品中的 “Agent” 顶层入口不等于 runtime 中的 Provider 或 Session。

### Chat

Chat 复用 Synara 的 managed Home/Studio container。它没有用户选择的 Primary Folder，但可以把生成内容写到 OmniMind-owned managed workspace/outbox 并展示为 Artifact。用户上传或引用的外部文件默认只读；Chat 不默认修改既有用户 Project。

需要进入真实项目修改时，用户显式使用 `Send to Agent`：选择或创建 folder-backed Project Thread，带入当前 prompt、选择的 attachments 和 artifact references。该动作不复制原生 Session、不 replay 旧 operation、不保证跨 Provider continuation，也不在后台改变原 Chat 的 cwd。

### Groups

产品可把 Synara Spaces 呈现为 Groups，但 identity、排序、membership、恢复和持久化全部沿用 Space。Groups 只组织 Project/Thread，不拥有 Folder、Provider Session、Run、permission、File 或 Git。

## Conversation 与 Provider Session

Conversation/Thread 不是 Provider Session。一条可见 Thread 可以按 turn 保留不同 Provider provenance，但任一 native operation 只能属于一个 Provider Session。

用户改变 Provider 时：

1. 选择只作用于下一次发送，当前 native operation 不热换；
2. draft、attachments 与尚未接纳的 Queue 保持原样；
3. dispatch 使用继承的 stop-first replacement；
4. 目标启动失败时恢复上一 exact Provider binding；
5. 跨 Provider 不复用 resume cursor，也不把可见历史伪装成 native continuation；
6. unknown operation 不 replay、不 silent fallback。

OmniMind Agent 使用独立 `omnimind` Provider identity；stock Pi 保持 `pi` identity。二者可以共享经过证明同构的 Pi-family adapter core，但各自拥有 Session、version、configuration、state root、Package install state 与 diagnostics。OmniMind Agent 的全局和 project-local private state 都属于 `.omnimind`；stock Pi 的对应 native state 属于 `.pi`。任何 binding、resume cursor、native reference 或 filesystem state 都不能跨两者复用。

## Composer、Queue 与 receipt

Composer draft/QueueItem 在 Product Orchestration 接纳前可编辑、删除和排序；接纳后沿用现有 command/event/receipt 与 Provider acceptance 路径。外层 receipt 只证明产品命令边界，native acceptance/settlement 仍由当前 adapter 证明。

不能为了“更确定”再创建 Run ledger、outbox 或 receipt store。acceptance 不确定时保持 unknown，不退回 editable Queue、不自动换 Provider、不自动 replay。

## Timeline 与 Workbench

Timeline 继续消费继承的 canonical events，并保留 Provider、Model 与必要 native references。只长期显示用户输入、Assistant 可见结果、结构化请求、重要 Activity/Tool，以及 File、Diff、Terminal、Artifact 等引用；raw event 只进入有界 diagnostics。

Workbench state 沿用 Synara 已有的 per-thread tabs、panes、viewer、terminal 和 layout state。File、Git、Terminal 不成为 Product database 的副本；重新观察外部变化并按现有机制提示即可。

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

## 恢复与结果真实性

Product Orchestration 恢复 command/event/projection；Provider adapter 恢复 native Session。两者通过现有 binding/native refs 汇合，不能互相伪造。

- Product event 已 durable、Provider 未接受：按 adapter 的 exact admission contract 处理；
- Provider acceptance 未知：禁止 replay 或切换 Provider；
- Provider 已接受、settlement 未观察：等待 native reconciliation 或显示 unknown；
- native Session 丢失：Thread 仍可读，新 Session 明确为 fresh/rebuilt；
- cancel/interrupt request 只证明已请求，native acknowledgement/terminal event 才证明结果。

## 权限真实性

OmniMind 不建设统一 permission broker，也不维护跨 Provider deny-side-effect matrix。共同 UI 只呈现当前 Provider/Host 实际发出的 approval、scope、consequence 与 result；Provider-native policy 保持 namespaced。

Pi adapter 当前没有暴露 Synara approval/user-input request 时，产品就不声称 Pi 具备该交互。进程隔离、Package verification 或 Provider 自述都不等于 OS sandbox；只有真实 call path 能证明的限制才进入产品文案和验收。
