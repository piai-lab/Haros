# OmniMind — Founding Agent Contract

本仓库是独立新产品，没有用户、兼容义务或需要保护的旧投入。结论先行、激进但精确；错误本体直接删除，不为迁移过程保留生产双轨。

## 必读顺序

开始任何设计、代码或移植前完整读取：

1. `README.md`
2. `execution-brief.md`
3. `discovery-record.md`
4. `missions/independent-omnimind-v1.md`（status 为 active 时）

四份文件职责互斥：README 是唯一产品/架构真相；execution brief 只定义当前施工顺序；discovery record 只保存裁决依据；mission 只保存 Campaign 验收状态。不得创建平行架构真相、ledger、manifest、handoff 或进度报告。

## 当前裁决

- OmniMind 是公开 `Powered by Pi` 的 Pi-native 桌面 Agent 产品，不是隐藏 Pi 的中立壳，也不冒充 Pi 官方 GUI。
- Pi 是 V1 唯一 bundled-native Gold Path；Provider、Model、Thinking、Session、Compaction、Branch、ResourceLoader、Extension lifecycle 和 Package 私有状态保留 Pi 权威。
- OmniMind 拥有桌面体验、Workspace、可见 Conversation、轻量 Run receipt、Package 信任/分发/current/LKG、文件/Remote、产品权限与跨 Engine 连续性。
- 外部 Agent 通过 ACP 或正式 headless 协议的薄 Bridge 接入；“一等可选”不等于与 Pi 能力齐平。
- U1 是完整 UI 物理母体；只继承 renderer、设计系统、布局、动效和经证明的桌面机制，不继承 donor Provider ontology、Agent loop、Session、server 或状态权威。
- 当前旧自研 Extension Runtime、Thread Journal/Projection、Tool Execution、Output Store 是与 Pi 竞争的错误 skeleton，应删除。
- 下一唯一入口是 `execution-brief.md` 的完整 U1 provenance baseline 和 Pi SDK isolated-worker vertical slice。

## 不可违反的工程边界

- Pi SDK/Package code 不进入 Electron Main 或 renderer；运行在可监督、可重启、按 trust/profile/generation 隔离的 Node worker/sidecar。
- SDK 是 Gold Path；RPC 只作测试、诊断、过渡或语言中立接口，不用当前 RPC 覆盖范围定义 Pi 生态上限。
- 不自研第二套 Agent loop、Session store、Compaction、ResourceLoader、Extension runtime、Provider catalog 或完整 execution journal。
- Product `Run` 只是 accepted request + actual engine receipt + visible outcome；不把 Attempt/Action/Tool chatter 提升成跨 Engine 通用本体。
- renderer 只消费强类型 view model；Pi/ACP/raw events 先进入有界证据和 typed projection，禁止 generic `payload: unknown` 状态总线。
- Package catalog 不是信任证明。Pi Extension 是任意代码；进程隔离不得宣传成沙箱。权限必须同时记录策略和 `host-enforced / engine-enforced / mixed / unverified`。
- Pi 拥有 package load/lifecycle/private state；OmniMind 拥有 source/rights、exact artifact、trust、staging、activation generation、lease、LKG 和 rollback。
- 当前 generation 不热替换；Package self-update 不得绕过 OmniMind current/LKG。
- 用户文件、Git、Remote 和外部任务保留真实权威；写入使用 observed-version 前提，dispatch 后失联保持 `outcome_unknown`。
- `Agent | Chat` 顺序固定。Agent 有 Folder/工作目录；Chat 无 Primary Folder，引用默认只读，需要修改时显式 Send to Agent。
- 对外诚实显示 Powered by Pi；Pi 名称只进入真实 runtime/integration、Engine、Package、设置、诊断、About 和来源边界，不蔓延为每个产品对象的前缀。

## 来源与 UI 接管

- 大规模搬入前扩展 identity/structure checker；生产 adoption 同一提交更新 README `source-adoptions` 与 `LICENSES/`。
- 完整固定源码树可以形成一个 exact provenance baseline commit，用于证明 unchanged build/run 和保存隐性行为；它不得承载新产品代码，也不得成为 production candidate。
- 随后在同一 Campaign 分支换脑、重命名、删除和恢复全部 gate。不得因物理搬入默认保留 donor 目录、Provider、runtime、schema 或弱事件总线。
- U1 的 LICENSE 指向 T3 Tools Inc.；采用前必须复核其原始上游、Git 历史、第三方贡献和资产权利，不以仓库 README 宣传代替法律事实。
- 洁净不能洗白来源。实际采用保留法定原文、人可读致谢、固定 revision 和更新策略。

## 命名与结构

- 生产命名描述稳定领域职责。Pi 等供应商名只用于明确 integration/runtime 边界；研究代号和 donor 身份不得进入生产 namespace。
- 文件树少、浅、单责；不用 `Manager`、`Helper`、`Utils`、`Common`、`Legacy`、`New`、`Temp`、研究波次或迁移编号。
- 坏名字直接替换并删除旧名。没有已证明的公共兼容义务时，不留 alias、wrapper、deprecated 双轨或 migration archaeology。
- 第一位普通能力消费者使用具体实现；第二位真实消费者出现后再提炼抽象。Pi-native 与 external-engine ingress 是明确不同的边界，不强迫共享 wire 或 capability shape。

## 产品完成度

- 冰山法则是实现门：表面简洁，水下必须有真实状态、回执、失败、恢复、性能和跨平台证据。
- 用户刚执行且结果可见的动作不再用 Toast/Timeline 复述；只有失败、异步等待、不可逆后果、隐藏副作用或结果不可见时才提示。
- 中英双语是首发契约；Thinking、Git、Diff、PR、Token、ACP、代码和路径保留英文更准确时不强译。
- 高频 streaming 批量投影，长 Conversation 使用增量状态、bounded DOM 和稳定滚动。性能是正确性，不是发布前装饰。
- macOS、Windows、Linux 进入同一验收矩阵；Remote 是通用 ExecutionTarget，不是默认产品模式。

## Campaign 与 Git

- 唯一 Campaign 状态写入 `missions/independent-omnimind-v1.md`。生产者只能提交 `candidate`，不能自证完成。
- 开发期运行最窄可证伪检查；候选冻结后在同一 SHA 运行一次相关 final gate，并接受 fresh-context completion audit。
- `main` 是当前唯一常驻分支。完整来源接管允许一条 Campaign branch/worktree；不创建 per-task/per-agent worktree。
- 一个 commit 一个关注点；只 stage 本任务路径。不得 force-push main/master，不改写共享历史。
- 保留用户未知修改；破坏性操作先解析精确目标。来源、法定文本和秘密不得因“深度清理”被删除或泄漏。
