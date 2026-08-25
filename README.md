# OmniMind

OmniMind 是一个本地优先、多 Provider 的桌面 Agent 产品。普通用户面对的是完整的 **OmniMind** 与默认内置的 **OmniMind Agent**；Synara 与 Pi 是产品母体、运行时 lineage 和法定来源，不是普通旅程中的品牌负担。

> **OmniMind-native by default. Pi-ecosystem compatible. Provider-honest. Source-first.**

## 产品判断

OmniMind 的产品味道不是“功能多”，而是让复杂系统以最少概念、最少动作和最真实的边界交付结果：

- **用户表面极静，内部合同极强。** UI 只展示此刻必须理解或操作的内容；复杂度留在 typed contract、状态机、恢复与测试中。
- **一个事实只有一个 owner。** 同一状态、配置、身份、失败语义或生命周期不能由两个 store、registry、writer、adapter 或文档共同决定。
- **奥卡姆，但不删事实。** 一个词、字段、步骤、入口或 owner 若删除后既不损失真实选择，也不损失必须区分的系统事实，就删除；取消、失败、不可用、未知等真实差异不能为了画面简单而混成一种状态。
- **成熟、好用优先。** 优先继承 Synara、Pi 和成熟生态已经证明的机制、作者测试与失败模型；本次 diff 小、包体小或组件漂亮都不是采用理由。
- **产品拥有 UI，来源拥有其生命周期。** 第三方 TUI、Provider 私有状态和 package UI 不能定义 OmniMind 的产品上限；共同能力进入 canonical contract，再由同一 Workbench 投影。
- **用户表达权不可丢。** 用户输入、文本、选择和结构化结果在 owner 边界内原样保留；presentation 可以有界折叠，但不能反向 trim、猜测、拼接或重写模型收到的事实。
- **能力必须是真的。** schema、设置或 UI 一旦公开某项能力，normal、failure、cancel、restart、shutdown 与 packaged journey 都要真实闭合；没有证据就准确 unavailable，不能用 fallback 伪装支持。
- **维护成本按未来修改半径计算。** 可以为收回唯一 owner 大动代码，但不为想象中的未来建立第二平台、兼容双轨、通用 manager、永久 ledger 或同步清单。
- **证据强度等于声明强度。** source test、真实 Provider wire、浏览器交互、packaged App、签名与公开发行是不同层级，任何一层绿色都不能冒充更高层完成。
- **来源身份诚实，产品身份统一。** 普通旅程只说 OmniMind；Provider、Synara、Pi 与 donor identity 在选择器、诊断、About、Licenses、research 和 provenance 中按事实出现，不泄漏也不洗白。

最常用的裁决句是：**如果删除它不会删掉用户的真实选择，也不会删掉系统必须保留的事实，就删掉。**

## 产品边界

- `Agent | Chat | Studio` 是三个一级工作面，共用一套 Product Orchestration、Project/Thread/Space truth 与 Workbench，不是三套产品状态。
- OmniMind Agent 是默认、内置、Pi-derived 的独立 Provider；stock Pi 与其他 Provider 保持各自真实 identity、Session、version、private state、capability 和失败边界。
- Agent 使用 folder-backed Project；Chat 使用受管 Home workspace；Studio 复用 Synara 的 managed Studio lifecycle。跨工作面动作必须通过现有 canonical Product facts，不复制 Provider Session。
- Provider 原生生态继续由各 Provider 拥有。OmniMind 只策展、投影或窄桥接，不建立跨 Provider Package/Tool/Prompt/Memory 的第二运行时。
- Ask 与 Approval、产品输入与危险操作授权、Composer draft 与 Provider acceptance、Product Thread 与 native Session 始终分离。
- first-public namespace 不读取、迁移、修复或删除 Synara、DP Code、stock Pi 或其他 Provider 的旧私有状态。credential、workspace、Git 与未知用户字节保持原样。
- Remote/SSH 不属于 V1。公开发行、签名、公证、Release 与 update feed 也不能由本地 ad-hoc packaged evidence冒充。

## 唯一权威

| 事实 | Sole owner |
| --- | --- |
| 产品身份、战略不变量与本页 taste | 本 `README.md` |
| exact adopted source、revision、rights、路径、digest 与更新策略 | [`source-adoptions.json`](source-adoptions.json) |
| 稳定产品事实、UI、公共出口与执行拓扑 | [`architecture/`](architecture/README.md) 的专题 owner |
| Synara 持续 intake 方法与人工决策边界 | [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) |
| Pi Core、Pi ecosystem、Extension、Package 与 fork intake 方法 | [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md) |
| 当前唯一目标、真实冲突、阻塞与下一动作 | [`execution-brief.md`](execution-brief.md) |
| Campaign claim 状态与最短 evidence pointer | [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md) |
| 固定来源观察、反证、历史失败与复验触发器 | [`research/`](research/README.md) |

权威按事实类型分工，不按更新时间竞争。research、Git 历史、聊天、截图、测试名称和 package README 都不能覆盖 architecture 或当前状态 owner；两个 sole owner 对同一事实冲突时先修 authority，再施工。

## 架构入口

- [`architecture/product-state.md`](architecture/product-state.md)：Project、Thread、Space、Conversation、Queue、receipt、canonical User Input、恢复与权限事实。
- [`architecture/execution.md`](architecture/execution.md)：Product Orchestration、Provider Registry/adapters、OmniMind Agent、进程、Session、系统能力、failure/restart/shutdown。
- [`architecture/workbench.md`](architecture/workbench.md)：信息架构、Composer、Timeline、Settings、Workbench、双语、响应式、性能与可访问性。
- [`architecture/public-surface.md`](architecture/public-surface.md)：公共 origin、反馈、发布出口、激活门、数据边界与 authority separation。

修改前只读与任务有关的 owner。不要为了“了解全局”把全部 research 当作必读上下文。

## 来源与再分发

[`source-adoptions.json`](source-adoptions.json) 是唯一机器可读 source-adoption authority。它记录 source retained、intended shipped paths、rights、license、patch identity 与更新策略；研究候选只有进入该文件才成为 adopted source。进入清单不证明当前安装 App、packaged journey、公开发行或每条 runtime activation 已完成，这些层级仍需各自证据。法定文本保存在 [`LICENSES/`](LICENSES/)，安全问题的私密报告边界见 [`SECURITY.md`](SECURITY.md)。

OmniMind 是 Synara product platform 的 downstream distribution，同时内置经过固定来源与补丁审计的 Pi-derived runtime。来源采用的长期规则：

1. exact source、artifact、dependency closure 与 rights 必须可复核；
2. source retained、shipped bytes/exports 与 runtime activated 分别举证；
3. 尽量保留 ancestry、作者测试与成熟生命周期；
4. 产品差异集中在窄、可删除的 seam；
5. 上游出现等价能力时优先删除本地 patch；
6. 未进入清单的项目只是 donor、comparator 或 research source；进入清单也不自动获得更高层交付声明。

身份扫描只阻止退休 donor/旧产品身份进入普通产品面；真实 Provider 与法定 lineage 不能被洗成中性名称。

```identity-denylist
t3-code
proma
weknora
sogen
omni-harness
```

```structure-policy
{
  "authorRoots": ["apps", "architecture", "assets", "packages", "patches", "research", "scripts", "test", "missions", "LICENSES"],
  "toolRoots": [".agents", ".claude", ".codex", ".cursor", ".obsidian", ".snow"],
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

## 工作方式

开始任务时：

1. 核对工作区、适用指令、分支、HEAD 与 dirty paths；
2. 从用户入口沿 route/command、owner、writer、normal/failure/restart/shutdown 追真实链路；
3. 区分已存在、部分存在、缺失和只是文档声称；
4. 在唯一 owner 内完成最小完整结果，删除被替代的 truth、fallback、测试与文档残留；
5. 用最窄但能推翻声明的证据验证；用户可见 Desktop 行为必须从 exact pushed SHA 构建 fresh isolated packaged journey；
6. 一个 commit 一个关注点，只 stage 任务路径，不把历史证据、研究候选或局部绿色写成更高层完成。

没有当前任务时，`execution-brief.md` 应明确写“无活动施工”，而不是保留上一列车的 SHA、DMG、测试计数和下一动作。历史 artifact 与长 journey 留在 Git 或对应 fixed evidence owner，不进入根入口。

## 新会话的最小理解

```text
先读 README：理解产品 taste 与 authority
  ↓
按任务读一个 architecture owner
  ↓
读 execution-brief：确认当前是否有冲突或活动施工
  ↓
只有做 source intake 才读对应 Intake
  ↓
只有需要来源反证时才读 research 中的精确文件
```

新会话不需要继承聊天记忆。若仅凭这些 owner 仍不能唯一推出产品结果，应修文档 owner 或向维护者指出真实分叉，不能靠猜。
