# OmniMind

OmniMind 是一个 **Powered by Pi** 的本地优先桌面 Agent 产品：Pi 获得唯一 Gold Path，OmniMind 把它的运行时、Provider、Model、Thinking、Skill、Extension 与 Package 生态做成普通用户也愿意长期使用的最佳 GUI；其他真实 Agent 作为可切换 Engine 接入，但不承诺与 Pi 虚假的能力对称。

这不是 Pi 的皮肤，也不是把所有 Agent 压成最低公分母的聊天壳。产品关系是：

> **Pi-native. OmniMind-owned. Ecosystem-first. Engine-open.**

- **Pi-native**：默认 Agent、Provider/Model/Thinking、Session 和 Package 语义来自 Pi 原生运行时。
- **OmniMind-owned**：品牌、桌面体验、用户可见工作、Package 信任与分发、文件/Remote、权限表达、恢复和跨 Engine 连续性由 OmniMind 负责。
- **Ecosystem-first**：优先无损承接成熟 Pi 能力，不在产品里重写一套竞争 Runtime。
- **Engine-open**：Pi 是 Gold Path，外部 Agent 是真实出口；能力差异必须诚实呈现。

## 1. 当前状态

这是一个没有用户、兼容义务和发布历史的新产品仓库。

- 产品与架构已经围绕 Pi-native 路线重新收敛；
- 旧的自研 Extension Runtime、Thread Journal、Tool Execution 和 Output skeleton 已被判定为错误本体，应删除而不是迁移；
- U1 的完整固定源码已进入 Campaign branch 的 provenance baseline；它尚未成为 production candidate，其 Provider ontology、Agent loop、状态权威和服务端本体不自动获得继承权；
- 下一入口是 `execution-brief.md` 的完整来源接管与 Pi SDK worker 垂直 slice；
- production compatibility、Package 安全、跨平台、恢复和外部 Engine 等声明在真实证据出现前一律为 `open`。

`README.md` 是唯一产品与架构真相。`execution-brief.md` 只定义施工顺序，`discovery-record.md` 只保存裁决依据，`missions/independent-omnimind-v1.md` 只保存 Campaign 验收状态。

## 2. 战略裁决

### 2.1 产品赌注

OmniMind 明确押注 Pi 会成为重要的开源 Agent Harness 与生态。这个赌注意味着：

- Pi 新 Provider、Model、Thinking level 和 Package 能力应尽可能自然进入 OmniMind；
- OmniMind 不为“未来也许换掉 Pi”而复制 Pi 的 Session、Compaction、Branch、ResourceLoader、Extension lifecycle 或完整执行日志；
- 与 Pi 的关系对外诚实，在 onboarding、Engine、Package、诊断、About 和来源边界明确 `Powered by Pi`；
- OmniMind 保持独立品牌、产品状态和外部 Engine 出口，不冒充 Pi 官方产品。

### 2.2 真正的护城河

“能够启动 Pi”不是护城河。OmniMind 必须赢在 Pi 上游没有义务替桌面用户完成的部分：

1. 极致顺滑的跨平台桌面体验；
2. Package 发现、精确版本、信任、兼容、审查、启停、更新与回滚；
3. 文件、Git、Diff、Terminal、Artifact、Remote 和长任务工作流；
4. 清晰而不夸大的权限与副作用表达；
5. 原生 Session 延续、崩溃恢复和用户可见历史；
6. Pi 与其他真实 Engine 的可理解协作；
7. 对 Pi 上游持续贡献，而不是长期维护一套影子内核。

如果上游未来发布优秀 GUI，OmniMind 仍必须凭这些能力成立；否则它只是一层可替换皮肤。

## 3. 一件事实只有一个权威

### 3.1 Pi 拥有的事实

Pi 原生 Host 唯一拥有：

- Agent loop 与模型调用；
- Provider、Model catalog 和 Thinking 语义；
- Pi Session 的 transcript、compaction、branch tree 与 runtime state；
- Skill、Prompt、Extension、Tool 与 Package 的发现、加载和生命周期；
- Pi 原生 queue、steer、follow-up、abort、retry 和 usage 事实；
- Package 私有的 Todo、Team、Workflow、Memory 与其他状态。

OmniMind 可以投影这些事实，但不得复制后宣称自己拥有更权威的一份。

### 3.2 OmniMind 拥有的事实

OmniMind 只持久化产品必须拥有的事实：

- `Workspace`：用户选择的位置、桌面布局和产品级设置；
- `Conversation`：用户长期可见的对话容器，与某个 Engine Session 解耦；
- `Entry`：用户输入、Assistant 可见输出、附件、结构化问答和可见系统结果；
- `Run`：一次已接纳发送的选择快照、实际 Engine receipt、结果和可见失败；
- `EngineBinding`：Conversation 与 Pi Session 或外部 Session 的不透明关联；
- `ResourceRef`：文件、Diff、Terminal、Artifact、图片、报告和外部任务引用；
- `OperationReceipt`：产品实际批准、发起或观察到的副作用及其确定性；
- Package 的来源、信任、精确 artifact、兼容报告、激活 generation 和 LKG；
- 外部 Engine 的安装、能力、版本、权限真实性和来源。

`Run` 是轻量产品接纳记录，不是第二套 Agent Runtime。Engine 内部的 Attempt、Action、Tool chatter、Reasoning 和完整事件流不会被提升为 OmniMind 通用本体。只有用户可见、恢复必需或涉及权限/副作用的事实进入产品存储。

### 3.3 外部权威

- 用户文件由其所在文件系统拥有；
- Git 只拥有 Git 已提交或索引的事实；
- Remote 文件与进程由远程主机拥有；
- Scheduler、云任务和外部服务拥有自己的任务状态；
- 外部 Agent 拥有其私有 Session 与原生日志。

OmniMind 保存引用、观察和回执，不伪造控制权。

## 4. 运行拓扑

```text
Renderer
   │ typed view models / commands
Desktop Host ── OS windows, menu, keychain, notifications, process supervision
   │
Product Service ── workspace, visible conversation, trust, artifacts, projections
   ├── Pi Host Worker(s) ── Pi SDK / native ResourceLoader / native Session
   └── External Engine Process(es) ── ACP or a thin official-protocol bridge
```

硬边界：

- Pi SDK 不进入 Electron Main，也不与 renderer 同进程；
- 第三方 Package 不与窗口和 OS 控制平面共享崩溃域；
- 初期按 profile/trust/package generation 隔离 Pi Host，必要时可退到 per-Conversation；
- Electron Main 只做桌面原生能力和监督，不承载 Agent loop、Package 代码或产品数据库；
- renderer 不解析 Pi、ACP 或其他 Engine 的 wire event；
- raw evidence 只在有界、脱敏、可追踪的诊断层保存，随后映射为强类型事实和增量投影；
- 未来稳定的 `pi-client` / `pi-protocol` / `pi-server` 可以替换内部传输，但不能反向改变产品边界。

### 4.1 为什么使用 SDK worker

OmniMind 要承接 Pi 的完整成熟生态，因此 Gold Path 采用固定版本的官方 SDK/Harness 能力，而不是把 RPC 当前可见能力误当成生态上限。SDK worker 同时提供：

- 对 native Session、ResourceLoader、Extension lifecycle 和状态的完整访问；
- 进程隔离与可监督重启；
- 与 Electron Main 解耦；
- 将来切换到官方 client/server 的传输自由。

RPC 可以作为测试、诊断、语言中立或过渡接口，但不再是产品宪法。实验中的 AgentHarness v2 是重要上游方向，不在其生命周期和持久语义稳定前把 provisional shape 焊进 OmniMind。

## 5. Pi Gold Path

### 5.1 原生优先

V1 只有一个 bundled-native Engine：Pi。

- 使用 exact Pi version/revision；
- Provider、Model catalog、认证能力和 Thinking level 从 Pi 能力读取，不在产品维护静态镜像；
- Session、Compaction、Branch、Queue 和 Package 状态由 Pi 原生实现；
- 产品需要而上游缺失的接口，顺序是：提出上游接口 → 维护有界补丁/fork → 最后才考虑局部重写；
- fork 必须有固定 upstream、差异预算、自动变更发现、人工合并和退出条件；
- 不把 Pi TUI 当作产品 UI，但允许真实 PTY 作为无法结构化呈现的兼容舱。

### 5.2 Session 与跨 Engine 连续性

Pi Session 是强事实，不是“随时可丢的 cache”；但它也不是 OmniMind Conversation。

- 同一 Conversation 可以绑定、分支、重建或失去一个 Pi Session；
- Pi Session 存在且 lineage 兼容时，优先原生继续；
- 用户切换 Engine 只影响下一次发送，不改写当前 Run；
- 从其他 Engine 返回 Pi 时，不恢复已与可见 Conversation 分叉的陈旧 Session；产品从当前可见 Entry、资源和 workspace revision 构造 continuation input，创建新 lineage；
- Session 缺失时 Conversation 仍可读，但原生 compaction、extension state 或隐藏上下文的损失必须明确降级。

### 5.3 接纳与派发

一次发送使用小型 transactional outbox：

1. 产品原子保存用户 Entry、用户选择和待派发请求；
2. Host 解析实际 Pi/runtime/package generation，形成 execution receipt；
3. Engine 接受后记录 opaque Session/Run ref；
4. 无法证明是否送达时标记 `delivery_unknown`，绝不盲目重放可能产生副作用的请求；
5. 流式内容和活动只更新投影，最终可见 Entry 与 receipt 才进入长期事实。

这解决崩溃边界，不需要发明第二套 AgentHarness。

## 6. Package 是核心产品面

Pi Package 目录是供给池，不是质量证明。OmniMind 的目标不是宣称“全部 Package 都安全可用”，而是成为最可信、兼容性最清楚的 Pi 桌面发行层。

### 6.1 三个分发层级

- **Catalog**：发现 Pi 生态，展示来源、版本、发布时间和未验证状态；
- **Curated**：OmniMind 做过来源、许可证、依赖、安装脚本、Native code、权限和基本行为检查；
- **Verified**：对 exact Pi/OmniMind/platform generation 跑过真实兼容矩阵和关键场景。

任何层级都不把第三方代码称为沙箱。一个被信任运行的 Pi Extension 可以拥有用户进程的完整权限。

### 6.2 兼容等级

| Level | 含义 | GUI 行为 |
| --- | --- | --- |
| Native | Headless/structured Pi capability，无需改包 | 原生 Activity、Tool、Output 与设置投影 |
| Bridged UI | 包使用 OmniMind 已验证的结构化 UI contract | 使用受控组件呈现 |
| PTY | 依赖交互式 TUI，结构化覆盖不足 | 在隔离真实终端舱运行 |
| Unsupported | 依赖无法提供的 Host 行为、平台或危险变更 | 激活前拒绝并解释 |

兼容报告至少包含：来源与 rights、exact artifact digest、Pi/Node/platform 要求、install scripts、native dependencies、网络/文件/命令权限、UI 要求、状态位置、首次加载结果、已知降级和最后验证 generation。

### 6.3 运行与更新分权

- Pi 拥有 Package format、解析、ResourceLoader、Extension lifecycle 和私有状态；
- OmniMind 拥有下载来源、artifact digest、审批、staging、当前 generation、lease、LKG 和回滚；
- 当前运行使用不可变 generation；
- 更新只在安全边界激活，不能热替换活跃 Run；
- Package 自更新不得绕过 OmniMind 的 current/LKG；
- 失败后停止新租约并恢复 LKG，不修改用户原始 Package 源。

## 7. 外部 Engine

外部 Engine 是产品能力，不是架构中心。

- 原生支持 ACP 的 Agent 直接接入；
- 有稳定 headless/app-server/SDK/RPC 的 Agent 使用薄 Bridge；
- 没有可靠协议的只进入明确受限的 PTY/guest 路径；
- 外部 Engine 的认证、Model、Session、权限和升级由其自身契约决定；
- OmniMind 只归一化可见 Entry、Run receipt、ResourceRef、OperationReceipt 和少量通用控制；
- Engine 特有能力通过 namespaced capability renderer 增强，不扩张成核心字段；
- 不可用的 Engine/Model 不静默 fallback 到 Pi 或其他来源。

Pi 的 Gold Path 可以拥有更深的 Package、Thinking、Branch、Compaction 和队列体验。所谓“一等可选”只保证用户可以真实选择、理解能力和得到可靠结果，不保证所有 Engine 功能齐平。

## 8. 产品与交互

### 8.1 一级心智

一级入口保持 `Agent | Chat`，Agent 在左、Chat 在右：

- **Agent**：有 Primary Folder 或独立工作目录，允许在清晰权限下修改文件和运行工具；
- **Chat**：无 Primary Folder，默认不把用户原始路径交给 Engine；文件/文件夹引用保持只读，真正需要修改时显式 `Send to Agent`；
- 二者都默认由 Pi 提供 Engine、Model、Thinking 和对话能力；
- 外部 Engine 可以在 Composer 中选择，但不打断普通用户的默认路径。

### 8.2 Powered by Pi 的表达

- 首次 onboarding 清楚说明 Pi 是默认运行时；
- Composer 默认不反复展示无意义的品牌徽章，但 Engine 选择器显示真实来源；
- Settings › Pi 管理原生 Runtime、Provider、Model、Thinking、Package 与诊断；
- Settings › Engines 管理外部 Agent；
- Package 页明确说明它运行在 Pi Runtime 中；
- About、Licenses 和诊断保留完整来源与版本；
- 不把 Pi 品牌涂进每个用户对象、文件名或产品文案，也不刻意隐藏它。

### 8.3 UI 母体

U1 是已批准的物理 UI 母体。采用方式是固定完整源码树、保留可运行 baseline 和权利链，再进行换脑；不是按截图重画，也不是手工挑几个组件。

默认保留候选：

- renderer、design tokens、布局、动效和交互节奏；
- Conversation、Composer、文件、Diff、Terminal、Artifact 和设置表面；
- 流式输出、滚动、后台状态、键盘和跨平台桌面手感。

必须删除或替换：

- donor Provider/Agent ontology 与静态 Model 表；
- donor Agent loop、Session authority、runtime router 和 server authority；
- 把所有 Engine 做成并列 adapter 分支的扩散结构；
- donor 品牌、T3 来源 UI 身份和迁移兼容层；
- generic event payload 直达 React；
- 与 Pi Session、Package 或 OmniMind 产品存储竞争的状态。

### 8.4 冰山法则

表面必须克制、准确、丝滑；水下必须有真实状态和失败语义。

- 用户已经触发且结果立即可见的动作，不重复 Toast 或 Timeline 复述；
- 只有失败、异步等待、不可逆后果、隐藏副作用或无法自然看见的结果才额外提示；
- 进度来自 Engine/Host 实际事件，不伪造百分比；
- cancel、interrupt、abort、stop 和未知结果使用不同语义；
- 高频 stream 在 Host 批量合并，renderer 不按 token 触发全局状态更新；
- 长 Conversation 使用增量投影、窗口化 DOM 和稳定滚动锚点；
- 中英文关键路径同等可用，Thinking、Git、Diff、PR、Token、ACP、路径和代码保留英文更准确时不强译。

## 9. 权限与信任

产品可以显示 `Approval required / Auto / Full access`，但必须同时显示真实强制来源：

- `host-enforced`
- `engine-enforced`
- `mixed`
- `unverified`

Pi Extension 是任意代码执行能力，进程隔离不自动等于文件或网络沙箱。未经拒绝副作用测试，不得声称 host-enforced。Package 运行至少按 trust profile、workspace grant、execution target 和 generation 分离；Secret 进入 OS Secret Store，经受控 backend 注入，不能把明文 credential file 变成 OmniMind 的产品权威。

文件写入使用 observed-version/CAS 前提；恢复不能依赖用户 Git，也不得偷偷 reset、checkout 或覆盖并发修改。外部副作用在 dispatch 后失联时保持 `outcome_unknown`。

## 10. Local、Remote 与文件

Remote 是通用 ExecutionTarget，不是独立产品模式。Local 与 Remote 共用 Conversation、ResourceRef、权限和 OperationReceipt；真实差异保留在能力与来源层。

- 默认使用系统 OpenSSH 与可审计 host-key 流程；
- Remote credential 只进 Secret Store；
- helper 只承担 PTY、文件、进程、watch、hash 和结构化 transport；
- 文件浏览、编辑、生成与恢复必须区分 source、working copy、generated artifact 和 remote authority；
- 长任务使用真实外部 job/process receipt，不靠 UI 心跳假装存活；
- 首版至少证明一个真实 SSH 目标和断线恢复，但 Remote 不支配默认桌面导航。

## 11. 可维护性纪律

- 生产代码只围绕稳定领域职责命名；Pi 等供应商名只进入明确 integration/runtime 边界和来源 UI；
- 第一位普通消费者使用具体实现，第二位出现后才提炼通用抽象；
- 不创建 `Manager`、`Helper`、`Utils`、`Common`、`Legacy`、`New`、`Temp` 等模糊容器；
- 不为坏名字、错误本体或没有用户的旧 schema 保留 alias、wrapper、deprecated 双轨；
- 一个 capability 只有一个实现权威；
- 上游更新只产生候选 diff 和检查结果，不自动合入；
- 性能优化必须来自 profile，但 stream batching、bounded DOM、增量 projection 和 watcher backpressure 从第一条 slice 就是正确性约束；
- macOS、Windows、Linux 的路径、进程、PTY、安装、更新和窗口行为进入同一验收矩阵；
- 任何 adoption 同时记录来源、rights、固定 revision、实际路径、主要修改和更新策略。

## 12. V1 成功定义

一个新用户可以：

1. 安装并完成 Pi Provider/Model 登录或本地连接；
2. 在 Chat 中无文件夹开始对话，在 Agent 中选择 Folder 开始工作；
3. 选择 Pi Model 与 Thinking level，发送、排队、steer、cancel 并看到真实进度；
4. 重启应用后继续兼容的 Pi Session，或明确从可见 Conversation 重建；
5. 从 Package Catalog 安装一个 exact Package，理解权限与兼容等级，安全更新并回滚；
6. 查看文件、Diff、Terminal、图片和大输出，不被内部协议淹没；
7. 在同一 Conversation 的下一次发送切换到一个外部 Engine，并看到真实能力差异；
8. 连接一个真实 Remote target，运行耐久任务并在断线后恢复观察；
9. 在简体中文或英文下完成全部关键路径；
10. 遇到崩溃、Package 故障、Engine 丢失或副作用不确定时得到准确、可恢复的状态。

完成不能由截图、README、单元测试数量、Package 数量或“成功启动”自证，必须以 Campaign 同一 final SHA 的真实场景、故障注入、跨平台证据和独立 completion audit 收口。

## 13. 明确否决

- 把 Pi SDK 嵌入 Electron Main；
- 用 RPC 当前覆盖范围定义 Pi 生态上限；
- 把 Pi 经 ACP Bridge 再接回 OmniMind 作为 bundled 主链；
- 自研与 Pi 竞争的 Extension Loader、Agent loop、Session store 或完整 execution journal；
- 所有 Engine 完全平权和最低公分母 UI；
- 隐藏 Pi 来源，或反过来冒充 Pi 官方 GUI；
- 复制 U1 的 Provider ontology、runtime 和状态权威；
- 把 Package Catalog 数量当作成熟度；
- 默认静默安装、自动信任、热更新或静默 fallback；
- 把 Package 进程隔离宣传成安全沙箱；
- 把 raw Engine event、generic `payload: unknown` 或 TUI 字符串变成 React 状态协议；
- 为研究波次、迁移或旧产品保留生产 namespace；
- 重型默认知识库、固定 DAG/YAML Workflow 或领域专用模式进入通用核心。

## 14. 来源、身份与结构

下列机器块是当前生产采用清单。研究候选不等于采用；只有代码、资源或法定材料实际进入仓库时，才在同一提交增加记录和 `LICENSES/` 原文。

```source-adoptions
{
  "adopted": [
    {
      "id": "ui-mother",
      "url": "https://github.com/Emanuele-web04/synara.git",
      "revision": "6aca3dcc505894481430967c2acb762b3dd1b358",
      "paths": ["vendor/ui"],
      "rights": "MIT at the fixed revision; continuous original-upstream history retained in the source repository; branded assets are baseline evidence only and are not approved for the production candidate",
      "mode": "adapt",
      "changes": "No donor-file changes in the provenance baseline; repository-level disclosure and an exact legal copy were added outside the imported tree",
      "updatePolicy": "Pinned revision; upstream changes may be discovered automatically but require manual review and a new compatibility decision",
      "licenseFiles": ["LICENSES/ui-mother-MIT.txt"]
    }
  ]
}
```

身份扫描只阻止 donor/旧产品身份泄漏；Pi 是公开产品依赖，不属于需要洗掉的身份。外部 Engine 名称可以出现在真实 integration 和动态来源边界，不能成为通用产品本体。

```identity-denylist
synara
t3-code
proma
weknora
sogen
omni-harness
```

```structure-policy
{
  "authorRoots": ["apps", "assets", "packages", "scripts", "test", "missions", "LICENSES"],
  "generatedDirectoryNames": ["build", "coverage", "dist", "out", "release"],
  "maxDirectoryDepth": 7,
  "forbiddenNameTokens": [
    "adapter2",
    "common",
    "helper",
    "legacy",
    "manager",
    "misc",
    "migration",
    "new",
    "old",
    "temp",
    "utils"
  ]
}
```

### 14.1 Pi

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/pi`
- 上游：`https://github.com/earendil-works/pi.git`
- 当前研究 revision：`c6eb6281a806a9c5d7ec41d2850692f7f7ebcb59`
- 当前研究版本：`0.83.0`
- 角色：唯一 bundled-native Engine、Provider/Model/Thinking 与 Package 生态 Gold Path。
- 候选采用：固定官方 packages；必要时有界 governed fork。
- 未采用：当前 `source-adoptions` 为空，尚无 Pi 代码或 artifact 进入生产树。

当前源码事实：Pi 已包含 coding agent、agent core、AI/provider、TUI、client、protocol、experimental server 与正在演化的通用 AgentHarness；后者的 durable harness 设计仍在变化，必须通过固定 API 和真实测试决定采用点，不能把设计文档当成已稳定契约。

### 14.2 U1：UI 母体

- 本地研究镜像：`/Users/liuzaoqu/Desktop/Develop/πCode/synara`
- 上游：`https://github.com/Emanuele-web04/synara.git`
- 当前固定候选 revision：`6aca3dcc505894481430967c2acb762b3dd1b358`
- 仓库 LICENSE：MIT，版权文本指向 T3 Tools Inc.；实际采用前必须复核完整 Git 历史、原始 T3Code 来源、第三方贡献和资产权利。
- 角色：完整 UI/desktop 物理母体，不是 Runtime 或产品 ontology。
- 候选采用：exact provenance baseline → 保持 runnable → 换脑、重命名、删除和结构净化。
- 当前采用状态：固定 revision 的 6425 个 tracked files 已完整导入 `vendor/ui` 作为 provenance baseline；该路径是短期审计边界，不是最终生产结构。
- 权利事实：固定 revision 的 LICENSE 与原始上游均为 MIT，版权声明为 T3 Tools Inc.；U1 历史连续包含原始上游和后续多人贡献。曾出现的新版权声明已在固定 revision 前由 U1 维护者恢复为原始声明。
- 资产边界：现有图标、截图和名称只为 unchanged baseline 保留，进入 production candidate 前全部替换或逐项证明权利与产品需要。

### 14.3 其他研究来源

Proma、Pi Desktop、OpenPi、Pi Web 和其他 Pi GUI/集成项目只作为进程拓扑、Package UI、隔离和失败模式证据。它们没有默认 adoption 权，任何实际采用都必须单独固定 revision、rights 和路径。

## 15. 当前下一步

唯一执行入口是：

1. 冻结并披露 U1 的 exact revision、完整权利链和法定文本；
2. 在唯一 Campaign branch 上导入完整源码树，形成不承载新产品代码的 runnable provenance baseline；
3. 建立 Pi SDK isolated worker，证明 native Session、Provider/Model/Thinking、一个真实 Package、stream、tool、cancel 和 restart；
4. 将 UI 母体的 runtime/provider/state 换成 OmniMind product facts + Pi projections，删除 donor 双轨；
5. 完成 `Agent | Chat` 第一条真实垂直 slice；
6. 再接一个外部 ACP Engine，证明开放性而不污染 Pi Gold Path。

具体施工顺序、停止条件和验收命令见 `execution-brief.md`。
