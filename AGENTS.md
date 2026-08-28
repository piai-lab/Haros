# OmniMind — Agent Routing and Safety

本文件只定义 Agent 的读取路由、歧义处理和仓库操作安全。产品宪法、完整 UI、产品事实、进程拓扑、施工顺序和 Campaign 状态各有唯一 owner，不在这里复述。

## 用户体验与必要风险

- 极致、流畅、省心的用户体验是 OmniMind 的默认目标。安全只取完成真实用户结果所需的最小值，不独立追求最大化；想象中或低概率的风险与正常 journey 冲突时，默认选择用户体验。
- 新增保护必须有具体、可信、影响重大且难以恢复的风险证据，并证明现有边界不足。“最佳实践”“更安全”或未来可能发生，不能单独成为增加确认、限制、状态、隔离或验证成本的理由。
- 用户已经明确表达、范围清楚且可恢复的动作默认直接完成，不二次确认；优先用可撤销设计消除风险。确需授权时只取得完成结果所需的最窄范围，并避免重复询问。
- 保护应尽量无感、局部且有恢复出口。局部风险不得升级成全局失败；`fail closed`、`no fallback` 或额外打断只有在能避免真实错误结果时才成立，同时必须提供最短的继续路径。
- 任何安全设计若新增长期 owner、持久状态、进程、公共合同、后台生命周期、重复确认或显著验证负担，都是需要证据和维护者明确授权的产品分叉。验证只与真实损失相称，不建设第二安全系统或仪式化门禁。
- 本节只约束风险判断，不拥有具体产品行为。功能事实仍由对应 architecture sole owner 和维护者裁决唯一决定，`AGENTS.md` 不扩写第二份安全规范。

## 必读顺序

开始任何设计、代码或移植前按同一顺序读取：

1. `README.md`；
2. 任务涉及任何外部 source review/adoption/update/fork 时，读取 `source-adoptions.json` 与公共 `SOURCE-INTAKE.md`；Synara 再完整读取 `SYNARA-INTAKE.md`，Pi Core/ecosystem/Agent donor 再读取 `PI-ECOSYSTEM-INTAKE.md` 的核心和当轮命中的风险附录；
3. `architecture/README.md`，并完整读取本任务涉及的专题 owner；
4. `execution-brief.md`；
5. `missions/independent-omnimind-v1.md`（status 为 active 时），仅用于状态与证据引用；
6. 只有来源、既往裁决或潜在反证与任务相关时，才读取 `research/README.md` 与对应研究文件。

顺序不授予权威。若两个文件对同一事实给出可执行但冲突的要求，停止产品施工，先在获授权范围内修复 sole owner 与全部路由；不能修复时报告阻塞，不凭更新时间、聊天记录或 Campaign 状态选边。

## 任务路由

- UI、信息架构、视觉、交互、stream/scroll、性能或可访问性：`architecture/workbench.md`。
- canonical public origin、公共出口、激活门、反馈数据边界或发行/更新 authority separation：`architecture/public-surface.md`。
- Workspace、Conversation、Entry、Run、Queue、权限、receipt、恢复或产品事实：`architecture/product.md`。
- 进程、Provider Registry/adapters、runtime/Session、系统能力或 execution topology：`architecture/execution.md`。
- 当前工作目标、冲突协调、阻塞和下一动作：`execution-brief.md`。它不能推翻维护者对完整 source decision surface 的明确决定，也不能以历史阶段或 stale Slice 形成第二准入门。
- exact adopted source、revision、rights、paths、digest 与更新策略：`source-adoptions.json`。README、research、package README 与测试不得复制一份可独立修改的 adoption 清单。
- Claim 状态与已有证据指针：active Campaign。
- 固定来源、版本、权利、构建/运行观察或结构性反证：`research/README.md` 路由的对应 evidence owner。
- 所有 source intake 的 intent、freshness、Gate A/B、disposition、claim-driven proof、状态与 stop conditions 只由根 `SOURCE-INTAKE.md` 拥有；source profile 和 package research 不复制第二套通用 Gate。
- 用户主动要求审查、借鉴、吸收、同步或更新 Synara：必须遵循 `SOURCE-INTAKE.md` 与根 `SYNARA-INTAKE.md`。长期默认尽量吸收，但不自动轮询；母体内可安全吸收且不越过 fixed divergence 的机制按 standing default 进入。现有 owner 已交付同等或更强结果且保留上游 falsifier 时记为 `Adopt via existing owner`，不是待确认的“不采用”。只有 material defer/decline/exclusion、fixed divergence 变化、新长期 owner/默认副作用或高风险变化需要向维护者说明损失并确认。
- 用户主动要求审查、比较、跟进、吸收、同步、升级或 fork Pi Core、Pi ecosystem 或 OmniMind Agent Core 外部来源：必须遵循 `SOURCE-INTAKE.md` 与根 `PI-ECOSYSTEM-INTAKE.md`。package 热度只决定研究优先级，不替代 exact source、source type 与真实 journey；每轮读取核心规则和命中的风险附录，不把所有 package 专项风险变成固定上下文税。
- exact source 是 Synara commit 时，即使 diff 内含 Pi adapter、Tool、MCP 或 Agent 行为，也只走专用 `SYNARA-INTAKE.md`；只有 exact source 本身来自 Pi Core/package/extension/skill/prompt/tool/MCP 或其他 Agent Engine donor 时才走 `PI-ECOSYSTEM-INTAKE.md`，不得对同一 Synara source set 叠两次 Gate。
- 其他 adopted source 的更新遵循 `SOURCE-INTAKE.md`；没有专用 profile 时不得把 Synara 的母体默认采用倾向自动扩张到 donor。

新会话不能用历史聊天、自动摘要或旧 handoff 补齐权威文档缺口。实现意图仍不能唯一推出时，先修 owner；当前任务未授权该修复时，停止并指出精确冲突。

## 工作与验证

- 开始前核相关入口、`git status --short` 和一个可观察成功条件；只改任务允许的路径，保留未知修改。
- 设计或接入任何产品能力前，必须先沿真实调用链盘点现状：从用户可见入口追到 route/command、配置与激活门、API/数据 owner、外部 authority 及失败/不可用行为，并明确区分“已存在、部分存在、缺失”。优先配置、接线或补齐现有链路；未完成该盘点时，不得仅凭页面、文档、命名或理想架构新增平行入口、接口、状态或发布管道。
- 使用最小完整实现和现有模式；不创建平行架构真相、ledger、manifest、第二 Campaign 或无必要的兼容双轨。
- 维护者视角的“省力”不是少动代码或追求本次 diff 最小，而是让未来变更只进入真实 owner、沿窄合同自动投影，并能用一组明确测试证伪。若现有 globals、分散 cache、重复清单、跨层分支或万能 adapter 会迫使以后反复手改，应在当前获准范围内一次性收回对应 owner、删除重复真相并动透；不能为了眼前少改而保留已举证的长期修改税，也不能借机全面重写成熟实现。
- 代码按**可独立替换的生命周期责任**组织，不按页面、功能名或临时 Goal 预建抽象。定义、配置、执行、状态与展示各自保持单向依赖：owner 导出窄 typed contract，Settings、Browser、Timeline 等 consumer 只消费投影，不反向解析或接管内部实现。同一事实若需要在 owner 之外手改多个 consumer 才能保持一致，合并前必须 `SIMPLIFY`，不能用文档提醒或同步 checklist 掩盖设计失败。
- 对新增或改造的 seam，在冻结候选前做一次与任务相称的“未来变更演练”：至少检查新增/删除一个成员、上游协议或 schema 改变、展示或资产替换、能力整体退休时，修改是否集中、测试是否能定位漂移、回滚或删除是否不牵连无关 owner。演练用于暴露修改半径，不要求建设通用 framework、代码生成器、永久兼容层或复制生产语义的验证平台。
- 每项采用、fork、adapter、配置服务和 UI 接入都必须保留清楚的替换/删除边界：上游 ancestry 与作者测试尽量保留，产品差异集中在少量可审计 seam，Host/Settings/Product State 不得为可替换 package 建立反向生命周期依赖。未来出现更成熟等价能力时，应能删除 composition、窄投影和产品入口后退出，而不是被第二 store、迁移平台、全局 registry 或跨模块特判绑死。
- 采用成熟上游时，默认追求**相对该上游的最小必要偏离**，不能因架构洁癖把成熟产品或组件降格为少数源码后重建其生命周期。裁决同时最小化上游语义/源码改动、重复产品 owner、默认 runtime/prompt/tool/state 激活面、用户认知和长期同步成本；优先配置、接线、公开 host seam 与 upstream patch。尽量保留 upstream ancestry、目录结构和作者测试，并明确区分“源码保留”“发行物导出”“运行时实际注册”；源码存在不等于产品必须激活，入口关闭也必须证明没有 ambient writer、listener、timer、进程或第二控制面。
- 当新增第三方依赖只为使用其中一个小型、稳定、需产品化定制且可清晰隔离的实现片段时，先比较完整依赖的长期成本与本地最小提取成本。仅当许可证允许、提取边界明确、能保留上游版本、来源与许可证声明，并可用回归测试防止漂移时，优先以 `copied-adapted` 方式本地拥有最小实现；提取必须删除包内无消费者能力，不得复制整个包、无出处改写或重建上游无关生命周期。安全、协议、加密、解析、复杂状态机等需要成熟实现持续承担正确性与维护责任的能力，不适用本规则。
- 对 Synara 的默认规则是完整继承母体；任何 OmniMind 增强必须窄、可证伪、复用既有 owner，并用具体用户结果或风险证据说明收益及新增长期责任。不得借同步新增第二 Goal/Todo/control plane、通用同步 framework、兼容双轨、ledger/manifest、新 package、并行 UI/store/API 或逐 commit wrapper。
- 任何重大自创或相对上游的偏离，只要会新增 owner、state、lifecycle、public contract、control plane 或长期兼容责任，施工前必须用新手也能理解的语言向维护者说明：上游原本怎样工作、当前精确缺口、拟议偏离、对全局调用链和维护成本的影响、以及如何回滚，并获得明确授权。既有 owner 内不增加长期责任的普通局部实现无需逐变量请示。Pi Extension 接入时必须按 [`PI-ECOSYSTEM-INTAKE.md`](PI-ECOSYSTEM-INTAKE.md) 明确是 OmniMind 自有随附、Host 投影、fork 后维护还是直接安装，并分别写清 source/maintenance/registration/execution/state/distribution owner；不得由一个 adapter 静默把第三方 Extension 变成第一方或 Host capability。单一 adapter/module 不得静默横跨 definition、prompt、lifecycle、authority、event projection 等多项责任形成“独行侠”。
- 候选来源在产品哲学和唯一 owner 边界内由真实效果与风险相称的 harness 决胜，不能仅因 package 更小、接口更整齐或功能更多而采用。验证应同时保护作者已经覆盖的生命周期冰山与 OmniMind 的路径、模型、权限、隔离、成本和用户 journey，但不得演化成复制生产语义的永久验证平台。需要物理分包时按可独立替换的生命周期责任拆分并保持窄公共合同，不按 Goal、Review、Workflow 等功能名称预建 package 或抽象。
- 任何新增或修改的 OmniMind-owned 用户可见功能必须默认在同一变更中完整交付简体中文与英文；两种已支持语言的 catalog key 必须一一对应，正常可达路径不得以硬编码或缺失 key 回退成中英混杂。原始 Provider 输出、资产身份、路径、命令与诊断等不属于产品文案的边界，以及未来语言的准入规则，唯一遵循 `architecture/workbench.md`。
- 用户可见语言的复核不能止于“已经使用翻译 key”或中英文 catalog parity。凡触达正常产品表面，必须按 `architecture/workbench.md` 同时检查 message catalog 的实际值、运行时投影的 Provider prompt/event、空态、进度、Toast、错误与恢复文案；内部 source/runtime/authority 术语只能进入该 owner 允许的技术详情。不得为消除泄漏而全局改名真实内部 API、法定 identity 或用户明确选择的 stock Pi；若普通产品文案与技术原文共用一条呈现路径，应在既有 presentation owner 内分层，而不是伪造或删除底层事实。
- 先写本轮要证明的 claim，再选择最便宜且足以推翻它的证据；开发期运行最窄 focused proof，候选冻结后才在同一 SHA 运行相关 final gate。文档/rights、纯 presentation、state/lifecycle、Provider wire、packaged App 与 Release 是不同证据域，局部绿色不得扩张为未覆盖结论。具体矩阵见 `SOURCE-INTAKE.md`。
- 一个真实闭合的关注点完成 focused 验证后，默认提交并推送当前任务分支到 GitHub；push 只同步该分支，不等于公开发行、创建 Release、修改 update feed 或合并受保护分支。source intake 的闭合关注点至少同时包含对应代码、adoption authority、research disposition 与当前状态，允许用一组有序 commits 实现，但不得把相互冲突的“代码已进 main / 权威仍称 pending”状态当成交付边界推送。用户明确暂停 push、权限不足或外部策略阻止时，必须准确标为仅本地 candidate，不能把未同步状态写成交付完成。
- 只有 claim 穿过 shipped bytes、Electron/OS seam、profile 隔离、安装或关闭/重开边界时，才从冻结的 exact pushed SHA 重建，并对 fresh 任务 profile 完成一次相称的 packaged proof。纯文档、测试、普通 Web presentation 或不进入 shipped bytes 的变化不例行打包；缺少 packaged proof 时只不得声称“安装 App 已获得修复”，不妨碍更窄 source/UI claim 成立。安装验证不得读取、迁移或改写真实用户 `.pi`、`.omnimind` 或其他 Provider private home。
- macOS packaged proof 在任何会按 bundle id 自动启动 App 的 UI 控制器介入前，必须先停止所有现存 OmniMind 实例，显式以任务专用 `userData`、home 与 Provider private home 启动，并从主进程、Helper 和 bundled Server 的参数或等价 runtime 证据核验隔离路径。Computer Use 默认不进入证据链；只有 OS surface 无程序化证据、且人工也无法可靠确认时才作为 fallback。
- 确需人工视觉复核时，只在 ignored 的 `apps/web/test-results/manual-verification/<sha>/` 生成本次候选清单并引用 canonical 测试与产品 owner；不得把清单扩张成第二 case registry，也不得为没有视觉变化的候选伪造 case。
- `/Users/liuzaoqu/Desktop/本机AI-API资源盘点.md` 是维护者授权的真实 Provider 资源入口。只有 claim 涉及当前 Provider/Model/Thinking、Pi wire、兼容协议、stream、tool、usage、取消、故障归因或恢复语义时，才在 focused fixture 建立可诊断基线后用匹配资源做最小 live probe；纯 UI、文档和非 Provider owner 不调用。
- Xiaomi MiMo 与 DeepSeek 是跨 Provider、关键 Pi/Host/Provider wire 或默认 OmniMind Agent 体验的优先锚点，不是所有 production candidate 的固定双门。若 claim 只针对一种协议或渠道，只验证匹配资源并准确限定结论；不得把单个渠道的偶然行为写成通用补偿逻辑。
- live 验证覆盖足以推翻当前 claim 的最小 journey，区分直连、OpenAI-compatible endpoint 与代理转换的 wire 事实，并设置明确假设、硬超时、费用边界、脱敏输出和停止条件。只有 claim 同时包含 discovery/auth、continuation、folder-backed Agent、Thinking/stream/tool、abort/timeout、恢复与 packaged Electron 时才跑完整 Agent 全链；资源充足不等于授权跑分。
- 普通、focused、可逆的 source adoption 可由执行者在 owner、测试与交付证据闭合后关闭对应 claim；发行、签名、安全、迁移、权限、秘密或其他高风险 claim 仍需要独立裁决后才能标为 `verified`。任何角色都不得用自己的实施事实替代缺失的高风险证据或把局部完成扩写成整体完成。
- 若 owner 缺失、证据触发条件未满足或现有失败没有新假设，不重复相同 probe，也不把旧证据改写为新结论。

## 操作安全

- 破坏性动作先解析精确目标；不对 home、仓库根、未解析变量或未知工作树执行递归删除。
- 不读取、复制或提交无关秘密。使用授权清单时只在进程内、stdin、环境变量或既有安全配置中注入凭据；不得把 key、密码、完整 endpoint、账号、原始响应或可关联标识写入 argv、聊天、Git、日志、截图、artifact、测试快照或异常文本。清单必须保持 `0600`。
- 普通、有限、可恢复的 live probe 已获持续授权，无需逐次询问。该授权不包含发布、充值、无界负载/跑分、删除远端数据、修改全局权限或防火墙、部署持久服务、轮换凭据以及扩大第三方访问；这些高风险外部动作仍需维护者明确授权。
- 只 stage 本任务路径；一个 commit 一个关注点。不得 force-push main/master、改写共享历史或为 reviewer/子任务创建额外 worktree。
- 来源、法定文本、凭据和用户未知修改不得因清理、重构或“重新生成”被覆盖。
- 不可逆外部副作用、权限扩张、发布、删除既有远端数据或高费用操作需要明确授权；授权不足时停止并请求方向。
