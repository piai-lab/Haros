# OmniMind — Agent Routing and Safety

本文件只定义 Agent 的读取路由、歧义处理和仓库操作安全。产品宪法、完整 UI、产品事实、进程拓扑、施工顺序和 Campaign 状态各有唯一 owner，不在这里复述。

## 必读顺序

开始任何设计、代码或移植前按同一顺序读取：

1. `README.md`；
2. 任务涉及审查、借鉴、吸收、同步或更新 Synara 时，完整读取 `SYNARA-INTAKE.md`；
3. 任务涉及审查、借鉴、吸收、同步、升级或 fork Pi Core、Pi-compatible package/extension/skill/prompt/tool/MCP 或 OmniMind Agent Core 外部来源时，完整读取 `PI-ECOSYSTEM-INTAKE.md`；
4. `architecture/README.md`，并完整读取本任务涉及的专题 owner；
5. `execution-brief.md`；
6. `missions/independent-omnimind-v1.md`（status 为 active 时），仅用于状态与证据引用；
7. 只有来源、既往裁决或潜在反证与任务相关时，才读取 `research/README.md` 与对应研究文件。

顺序不授予权威。若两个文件对同一事实给出可执行但冲突的要求，停止产品施工，先在获授权范围内修复 sole owner 与全部路由；不能修复时报告阻塞，不凭更新时间、聊天记录或 Campaign 状态选边。

## 任务路由

- UI、信息架构、视觉、交互、stream/scroll、性能或可访问性：`architecture/workbench.md`。
- canonical public origin、公共出口、激活门、反馈数据边界或发行/更新 authority separation：`architecture/public-surface.md`。
- Workspace、Conversation、Entry、Run、Queue、权限、receipt、恢复或产品事实：`architecture/product-state.md`。
- 进程、Provider Registry/adapters、runtime/Session、系统能力或 execution topology：`architecture/execution.md`。
- 当前施工顺序、进入/停止条件和阶段 proof：`execution-brief.md`。
- Claim 状态与已有证据指针：active Campaign。
- 固定来源、版本、权利、构建/运行观察或结构性反证：`research/README.md` 路由的对应 evidence owner。
- 用户主动要求审查、借鉴、吸收、同步或更新 Synara：必须完整遵循根 `SYNARA-INTAKE.md`。长期默认是尽量吸收，但不自动轮询或静默实施；每轮先完成只读研究，并用 `$converge` 消除会影响范围、产品结果、安全、权利或验证方式的不确定性，只有用户对当次明确更新集再次确认后才能修改产品。
- 用户主动要求审查、比较、跟进、吸收、同步、升级或 fork Pi Core、Pi ecosystem 或 OmniMind Agent Core 外部来源：必须完整遵循根 `PI-ECOSYSTEM-INTAKE.md`。package 热度只决定研究优先级，不替代 exact source 与真实 journey；每轮先完成 Gate A 只读 intake，只有维护者确认当次 exact source set 且当前施工顺序准入后才能进入 Gate B。
- 其他 adopted source 的更新继续先完成只读研究与人类讨论；没有对应专门手册时，参照 `SYNARA-INTAKE.md` 的两门、证据与授权边界，但不得把 Synara 的默认采用倾向自动扩张到其他来源。

新会话不能用历史聊天、自动摘要或旧 handoff 补齐权威文档缺口。实现意图仍不能唯一推出时，先修 owner；当前任务未授权该修复时，停止并指出精确冲突。

## 工作与验证

- 开始前核相关入口、`git status --short` 和一个可观察成功条件；只改任务允许的路径，保留未知修改。
- 设计或接入任何产品能力前，必须先沿真实调用链盘点现状：从用户可见入口追到 route/command、配置与激活门、API/数据 owner、外部 authority 及失败/不可用行为，并明确区分“已存在、部分存在、缺失”。优先配置、接线或补齐现有链路；未完成该盘点时，不得仅凭页面、文档、命名或理想架构新增平行入口、接口、状态或发布管道。
- 使用最小完整实现和现有模式；不创建平行架构真相、ledger、manifest、第二 Campaign 或无必要的兼容双轨。
- 任何新增或修改的 OmniMind-owned 用户可见功能必须默认在同一变更中完整交付简体中文与英文；两种已支持语言的 catalog key 必须一一对应，正常可达路径不得以硬编码或缺失 key 回退成中英混杂。原始 Provider 输出、资产身份、路径、命令与诊断等不属于产品文案的边界，以及未来语言的准入规则，唯一遵循 `architecture/workbench.md`。
- 用户可见语言的复核不能止于“已经使用翻译 key”或中英文 catalog parity。凡触达正常产品表面，必须按 `architecture/workbench.md` 同时检查 message catalog 的实际值、运行时投影的 Provider prompt/event、空态、进度、Toast、错误与恢复文案；内部 source/runtime/authority 术语只能进入该 owner 允许的技术详情。不得为消除泄漏而全局改名真实内部 API、法定 identity 或用户明确选择的 stock Pi；若普通产品文案与技术原文共用一条呈现路径，应在既有 presentation owner 内分层，而不是伪造或删除底层事实。
- 开发期运行最窄、能证伪当前结论的检查；候选冻结后才在同一 SHA 运行相关 final gate。局部绿色不得扩张为未覆盖结论。
- 一个真实闭合的关注点完成 focused 验证后，默认提交并推送当前任务分支到 GitHub；push 只同步该分支，不等于公开发行、创建 Release、修改 update feed 或合并受保护分支。用户明确暂停 push、权限不足或外部策略阻止时，必须准确标为仅本地 candidate，不能把未同步状态写成交付完成。
- 任何改变 Desktop 用户可观察行为的代码改动，交付链必须继续从该精确 pushed SHA 重建产物、安装或替换本机 OmniMind App，并使用 fresh、任务专用 profile 完成启动、真实 journey、关闭和重开验证；源码、focused test、HMR 或 dev Electron 单独通过都不能证明当前安装 App 已获得修复。纯文档、测试或不进入 shipped bytes 的变更不重复打包；构建、安装或真实 App 复验被明确暂停或阻塞时，必须标为 source-only candidate，不能宣称用户已拿到修复。安装验证不得读取、迁移或改写真实用户 `.pi`、`.omnimind` 或其他 Provider private home。
- macOS packaged journey 在任何会按 bundle id 自动启动 App 的 UI 控制器介入前，必须先停止所有现存 OmniMind 实例，显式以任务专用 `userData`、home 与 Provider private home 启动，并从主进程、Helper 和 bundled Server 的进程参数或等价 runtime 证据核验隔离路径；未完成该证明时不得操作窗口，也不得把默认 profile 的启动视为候选证据。
- `/Users/liuzaoqu/Desktop/本机AI-API资源盘点.md` 是维护者为 OmniMind 真实验证专门准备并持续投入的授权资源入口。涉及当前 Provider/Model/Thinking、Pi 行为、兼容协议、stream、tool、usage、取消、故障归因或恢复语义时，live probe 不是最后手段：在 focused fixture 建立可诊断基线后，应主动用匹配的真实资源证伪结论；不得仅因节省 token、调用费用或担心真实服务不稳定而用 mock 代替关键产品证据。
- Xiaomi MiMo 与 DeepSeek 是当前优先 real-provider 验收锚点。关键 Pi/Host/Provider 改动和 production candidate 应在资源状态、协议与待测行为匹配时优先覆盖二者，并区分直连、OpenAI-compatible endpoint 与代理转换的 wire 事实。两者用于验证跨 Provider 的真实产品行为和默认体验，不用于维护静态能力镜像，也不得把单个渠道的偶然行为写成通用补偿逻辑。
- live 验证应覆盖足以推翻产品声明的最小完整 journey；对 OmniMind Agent candidate，优先证明 discovery/auth、Chat 首轮与 continuation、folder-backed Agent、Thinking/stream/tool、abort/timeout、断连恢复及 packaged Electron 全链。资源预算充足不等于无界跑分：请求仍需有明确假设、硬超时、费用边界、脱敏结果和停止条件。
- Campaign producer 只能把受影响 claim 提交为 `candidate`，不能自证 `verified` 或整体完成；状态变更必须有对应授权和证据。
- 若 owner 缺失、证据触发条件未满足或现有失败没有新假设，不重复相同 probe，也不把旧证据改写为新结论。

## 操作安全

- 破坏性动作先解析精确目标；不对 home、仓库根、未解析变量或未知工作树执行递归删除。
- 不读取、复制或提交无关秘密。使用授权清单时只在进程内、stdin、环境变量或既有安全配置中注入凭据；不得把 key、密码、完整 endpoint、账号、原始响应或可关联标识写入 argv、聊天、Git、日志、截图、artifact、测试快照或异常文本。清单必须保持 `0600`。
- 普通、有限、可恢复的 live probe 已获持续授权，无需逐次询问。该授权不包含发布、充值、无界负载/跑分、删除远端数据、修改全局权限或防火墙、部署持久服务、轮换凭据以及扩大第三方访问；这些高风险外部动作仍需维护者明确授权。
- 只 stage 本任务路径；一个 commit 一个关注点。不得 force-push main/master、改写共享历史或为 reviewer/子任务创建额外 worktree。
- 来源、法定文本、凭据和用户未知修改不得因清理、重构或“重新生成”被覆盖。
- 不可逆外部副作用、权限扩张、发布、删除既有远端数据或高费用操作需要明确授权；授权不足时停止并请求方向。
