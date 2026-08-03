# OmniMind V1 — Execution Brief

本文件只回答“接下来按什么顺序施工”。产品与架构裁决以 `README.md` 为唯一真相，验收状态以 active Campaign 为唯一真相。

## 1. 当前基线

- 仓库没有用户和兼容义务；
- `source-adoptions` 记录 1 个 U1 provenance baseline；Pi 仍是研究来源，尚未进入生产树；
- U1 固定 revision 已完整导入短期 `vendor/ui` 审计边界，尚未成为 production candidate；
- 旧的自研 Extension Runtime、Thread Journal/Projection、Tool Execution 和 Output Store 已被新裁决否决；
- 旧 M1 probe 只存在于 Git 历史，不再约束生产结构；
- production claims 全部保持 `open`，直到当前路线在固定 SHA 上形成真实证据。

本轮重构完成后，仓库应只剩：产品/架构真相、Campaign、来源与身份检查，以及尚未开始的干净生产入口。

## 2. 施工原则

1. **先保住完整行为，再换脑。** U1 使用 exact full-tree provenance baseline，不按截图重写，也不手工漏拣。
2. **Pi SDK 在隔离 Host。** 不嵌入 Electron Main；不把 RPC 或 ACP 作为 bundled Gold Path。
3. **先一条完整垂直 slice。** 不同时铺开 Package 商店、Remote、Wiki、Team 和多个外部 Engine。
4. **不建立竞争权威。** Pi 保留 native Session/Package 事实，OmniMind 只存产品必需事实。
5. **能力不强行齐平。** Pi 先做深，外部 Engine 后证明可接，不让最低公分母反向定义架构。
6. **来源和法律与代码同日落地。** adoption commit 缺少 revision、rights 或法定文本即失败。
7. **每个阶段可运行、可回退、可证伪。** 激进删除不等于无目标破坏。

## 3. Phase 0 — Doctrine reset

目标：让仓库只表达一个方向。

必须完成：

- 根 README 明确 Powered by Pi、Pi Gold Path、OmniMind 产品权威和 external Engine 出口；
- 删除 direct-RPC-first、Pi-through-ACP、Engine 平权、隐藏 Pi 和自研 Extension Runtime 的冲突表述；
- 删除旧 skeleton 与只验证旧本体的测试；
- Campaign、AGENTS、discovery 与本文件完全对齐；
- identity policy 允许真实 Pi integration，继续阻止 donor/旧产品身份泄漏；
- `npm run quality` 通过。

停止条件：仍存在任何文档要求复制 Pi ResourceLoader、把 Pi SDK 放入 Electron Main、让 renderer 解析 Engine wire、或把所有 Engine 做成同深度 adapter。

## 4. Phase 1 — U1 provenance baseline

### 4.1 进入条件

- 当前 doctrine reset 已提交且工作树 clean；
- 唯一 Campaign branch/worktree 已建立；
- U1 revision 固定为 `6aca3dcc505894481430967c2acb762b3dd1b358`，或维护者明确批准更新后的 exact revision；
- 已核上游 URL、完整 Git history、LICENSE、原始上游 lineage、第三方贡献和资产来源；
- 已定义源码映射、法定文件和 baseline build/run 命令。

### 4.2 Baseline commit

把 U1 完整源码树导入，不夹带 OmniMind 新产品代码。该 commit 只证明：

- 源码和固定 revision 一致；
- 权利与 attribution 可追踪；
- install/build/test/dev launch 在本机按上游方式成立；
- 关键 renderer 与桌面路径未因复制丢失；
- 完整树保住隐性耦合。

这一 baseline 可以暂时不满足最终 identity/structure policy，但绝不能进入 main 或成为 production candidate。

### 4.3 Baseline evidence

- source tree manifest 与 digest；
- fixed revision、remote、license、history/asset review；
- exact install command 和 lockfile；
- build/test/dev-launch exit；
- baseline screenshot 只作行为对照，不作产品批准；
- README `source-adoptions` 与 `LICENSES/` 在同一提交完整记录。

## 5. Phase 2 — Foundation surgery

目标：保持 UI 母体可运行，同时一次性建立正确宿主边界。

### 5.1 最终物理边界

```text
apps/desktop        renderer + Electron desktop host
packages/product    Workspace / Conversation / Entry / Run / ResourceRef
packages/native     Pi host lifecycle and typed projection contract
packages/engines    external-engine ingress contract, initially empty
packages/storage    product facts and transactional outbox
packages/ui         shared product view models and design primitives
```

目录名只是目标职责，不要求机械套用。如果 U1 的现有结构更短、更准确，可以在不形成 donor mirror 的前提下收敛；禁止为了匹配本文制造空 package。

### 5.2 先删除的 donor 本体

- Provider-first navigation 与静态 model/provider tables；
- donor Agent loop、Session store、runtime router、server authority；
- 一个 Engine 一个大型 adapter 的并列分支；
- raw/generic events 直达 renderer；
- donor branding、T3 产品身份、迁移兼容和重复设置；
- 与 Product Service 或 Pi Session 竞争的数据库和队列。

删除必须发生在替代路径可运行之后，但同一阶段不得留下长期双轨。

### 5.3 先建立的产品事实

只建立第一条 slice 必需的实体：

- `Workspace`
- `Conversation`
- `Entry`
- `Run`
- `EngineBinding`
- `ResourceRef`
- `OperationReceipt`
- `PackageGeneration`

不要创建通用 Attempt、Action、Tool、Workflow、Team、Memory 或 Engine Event 聚合。Pi 投影需要的事件保持在 integration 层；第二个真实消费者出现前不抽象。

## 6. Phase 3 — Pi native host vertical slice

### 6.1 Host 形态

- Electron Main 监督一个独立 Node worker/utility process；
- worker 使用固定官方 Pi SDK packages；
- 进程以 profile/trust/package generation 为隔离单元；
- renderer 只能通过 typed command/view-model contract 访问；
- crash、hang、protocol mismatch 和 version mismatch 都有明确启动失败；
- Host generation 和 Package generation 进入每次实际 execution receipt。

不得先造通用 Engine interface 再实现 Pi。先写具体 `native` 路径；直到外部 ACP slice 暴露真实公共面以后再提取最小共享合同。

### 6.2 第一条真实用户旅程

1. 启动 OmniMind，显示真实 Pi runtime/version 健康状态；
2. 从 OS Secret Store 或 Pi 支持的 OAuth 流程配置一个 Provider；
3. 从 Pi catalog 读取 Model 和 Thinking levels；
4. 创建一个 folderless Chat Conversation；
5. 原子保存 Entry 与 dispatch outbox；
6. 创建/恢复 Pi native Session，记录 opaque binding 和实际 receipt；
7. 发送 prompt，显示文本 streaming、thinking 状态和 usage；
8. 运行一个内置 read-only tool，显示结构化 Activity 与 Output；
9. steer、follow-up、queue、cancel 各走真实 Pi 语义；
10. 重启 desktop/worker，恢复可见 Conversation，并原生继续兼容 Session；
11. 删除或破坏 Session 后，明确从可见 Conversation 重建而不是伪装无损继续。

### 6.3 同 slice 的 Agent 路径

- 从 Chat 显式创建/发送到 Agent；
- Agent 选择 Primary Folder；
- 写入前显示真实权限和 enforcement source；
- 文件写使用 observed-version precondition；
- Diff 和 Terminal 在 workbench 中原生呈现；
- crash after dispatch 时 OperationReceipt 保持 outcome unknown，不盲重放。

### 6.4 最小测试矩阵

- Provider auth success/failure/expiry；
- invalid model、unsupported thinking level、provider unavailable；
- Host 启动、崩溃、hang、restart、version mismatch；
- Session create/resume/branch/rebuild/corrupt tail；
- prompt accepted before/after crash；
- stream burst、slow renderer、100k+ visible conversation；
- tool before dispatch failure、after dispatch disconnect、cancel race；
- Chat no-folder/read-only 与 Agent write grant；
- macOS first; Windows/Linux 路径不能被硬编码封死。

## 7. Phase 4 — First real Package

只选一个成熟、headless、能产生真实用户价值的 Package，不先做 Package 商店大而全 UI。

必须证明：

- exact source/artifact/version 和 rights；
- 使用 Pi native ResourceLoader，无 OmniMind parallel loader；
- Catalog、Curated、Verified 三种状态可区分；
- install scripts/native dependency/network/filesystem 权限进入报告；
- Package 在 Agent native lane 原生运行；
- Chat/constrained lane 准确支持、降级或拒绝；
- Package private state 由 Pi/Package 拥有；
- active generation 不热更新；
- staged update、lease、LKG rollback 和 restart 成立；
- Package fault 只击穿对应 Host，不击穿 Electron Main 和产品数据库。

同阶段再验证一个依赖 raw TUI/UI 的 Package：有真实 PTY 兼容舱就运行，否则在激活前明确 unsupported。禁止用 no-op/fake UI 冒充支持。

## 8. Phase 5 — External Engine escape hatch

Pi Gold Path 成立以后，只接一个真实外部 ACP Engine。

目标不是 parity，而是证明：

- 用户能在同一 Conversation 的 next Run 选择外部 Engine；
- Product Entry、Run receipt、ResourceRef 和 OperationReceipt 可复用；
- 外部 Session 与 Pi Session 各自保留私有权威；
- engine capability、model、permission 和 failure 差异真实可见；
- 返回 Pi 时不恢复与当前可见历史分叉的陈旧 Session；
- 无静默 fallback；
- 没有为第二个 Engine 引入 `switch` 蔓延或 generic payload 总线。

只有完成这条 slice 后，才能从 native 和 external 两条具体实现中提炼最小 engine ingress contract。

## 9. Phase 6 — Product moat

按依赖顺序推进：

1. Package Catalog/Curated/Verified 与自动兼容矩阵；
2. 文件、Diff、Terminal、Artifact、大文件/未知二进制查看；
3. 真正的 background/notification/recovery；
4. 一个真实 SSH Remote target 与耐久任务；
5. Pi child Agent/Team/Workflow 的原生投影与写入 owner；
6. 文件原生知识能力；
7. 第二个外部 Engine，检验抽象没有围绕第一个特例冻结；
8. 三平台安装、更新、回滚和性能门。

Wiki、固定 Workflow designer、公共 OmniMind SDK、完整 Package marketplace 和更多 Engine 都不能抢在第一条 Pi-native slice 之前。

## 10. 质量门

### 每次局部改动

- 运行最窄类型检查/单测；
- 运行受影响的 source/identity gate；
- 不重复跑无关总门。

### 每个阶段候选

- 固定 exact SHA；
- worktree clean；
- source rights 与 lockfile 完整；
- relevant unit/integration/e2e 通过；
- 真实进程/Package/Provider 场景通过；
- fault injection 覆盖当前新增副作用；
- mission 只更新受影响 claim 为 `candidate`；
- 生产者不自证 verified。

### V1 final candidate

- 所有 required claims 在同一 final SHA verified；
- blocked 为 0；
- macOS/Windows/Linux 相关 final gate 各运行一次；
- fresh-context completion audit 无 material finding；
- 没有 donor identity、双 runtime、平行 Package loader、静默 fallback、虚假权限或不可恢复 migration。

## 11. 当前唯一下一动作

Doctrine reset 通过后，不再继续写架构文档。下一执行者必须：

1. 在 clean main 上创建唯一 Campaign branch/worktree；
2. 完成 U1 rights/history/asset 审计；
3. 导入完整 exact source，形成 runnable provenance baseline commit；
4. 立即开始 Phase 2/3，先交付 Pi SDK worker 的第一条真实 Chat vertical slice；
5. 不恢复已删除的旧 skeleton，不并行铺开 Package 商店、Remote、Wiki 或多 Engine framework。
