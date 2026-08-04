---
type: "Implementation Review"
title: "Review: Adopt Pi native execution inside the established Host"
work: "../work/adopt-pi-native-execution.md"
handoff: "../handoffs/adopt-pi-native-execution.md"
verdict: "FAIL"
revision: "review-adopt-pi-native-execution-20260805-r1"
actor_id: "pi_native_execution_reviewer"
dispatch_receipt: "4e7b6d9c65e44ca581622a80fad0e50f"
predecessor_receipt: "0a50a2c07602464ea005a857f0bcbdac"
predecessor_output: "../handoffs/adopt-pi-native-execution.md"
---

# Review: Adopt Pi native execution inside the established Host

## Findings

### P1 — 首轮 Pi acceptance 证明依赖 assistant 到达，真实 provider 已将其击穿

当前实现把 `SessionManager.open(sessionFile)` 后能查询到新 user entry 作为 accepted 的唯一强证据
（`apps/native-host/src/piRuntime.ts:1049-1079`）。但是锁定的 Pi 0.81.1 在
`message_end(user)` 中先向订阅者发事件、随后才调用 `SessionManager.appendMessage`
（`apps/native-host/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js:350-365`）；对于
新 Session，`SessionManager` 又明确延迟创建/写入文件，直到出现首条 assistant message
（`apps/native-host/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js:730-749`）。

OmniMind 虽用 `setImmediate` 把查询延迟到 user message 已追加进内存之后
（`apps/native-host/src/piRuntime.ts:1085-1099`），但此时新 Session 文件仍可能不存在或不含 user entry。
因此，首轮真实请求在 assistant 尚未完成时无法通过 reopen 证明；它不是一个与 dispatch acceptance 同步的
native durable fact。现有 faux provider 在 callback 运行前已经生成并持久化 assistant，所以
`accepts only after SessionManager reopen` 以及 acceptance race tests 形成了不真实的时间顺序。

这一点已有同源 live falsifier。主线程在 frozen source/dist 上使用授权的兼容 provider，经过真实 established
Host、Desktop credential broker protocol、Service `NativeHostClient` 与 Pi 0.81.1：catalog 返回
`runtime.catalog.response`，所选 model 为 `available=true`；首个 Chat execute 却返回
`execution.indeterminate`，probe 随即以 exit 1 停止，没有第二次 execute，也没有自动重放。probe 没有保存
boundary/hint/provider request count，因此本 review 不把这些值写成实测事实。

这直接击中 Work 的第一 falsifier：当前 candidate 尚未建立真实的 queryable Pi acceptance，不能据此授权后续
旧执行 authority 删除。修复必须改正 native durability/acceptance observable 或明确停在安全的 unknown；不得
靠增加 timeout、让 faux provider 变慢/变快、把 `prompt(): Promise<void>` 或本地 operation id 改名为 accepted。

### P1 — `delivery_unknown` 的 reconciliation hint 当前不可达，且 pending settlement 不能证明 accepted

Native Host 在 indeterminate 时返回 `pi-pending:*` hint，但 Service execution boundary 只对
`execution.accepted` 调用 `observe(...)`；indeterminate 分支只是把 hint 返回 Product
（`apps/service/src/native-host/executionBoundary.ts:161-183`）。Product 把它持久化为 terminal
`delivery_unknown`（`apps/service/src/product/ProductControlPlane.ts:1238-1257`），启动恢复又只对
`accepted | running` receipt 调用 `resumeFacts`，完全跳过 `delivery_unknown`
（`apps/service/src/product/ProductControlPlane.ts:1966-1979`）。当前也没有另一条 Product command 消费该 hint。

所以，首轮 live 请求即使稍后在 Pi 中形成 assistant/Session 事实，Product 仍会永久停在
`delivery_unknown`；它既不会盲重放，也不会真正 reconcile。零自动重放是正确的，但“永不解析 unknown”不满足
本 Work 要求的 queryable acceptance、Host restart reconciliation 和完整 fault-window result。

更危险的是，acceptance callback 无法确认 entry 的分支会先制造一条 failed settlement，再把已 settle 的对象
保存为 `pi-pending:*`（`apps/native-host/src/piRuntime.ts:1185-1201`）；`reconcile()` 又把任何有持久 settlement
的 pending ref 报为 `settled`（`:1387-1398`）。这只能证明本地 prompt path 已结束，不能证明某个 native user
entry 曾被接受。若后续只把现有 hint 接上线，便可能把 delivery uncertainty 错收成 accepted-operation settlement。
修复需要给 pending dispatch 建立不伪造 acceptance 的持久调和语义，并证明 late acceptance、durable rejection、
Host/Service restart 与 outcome unknown 各自的状态转换；仍不得自动重放不确定 effect。

### P1 — Host 重启恢复会丢失 exact credential redaction，Pi Session 内容可能回流到 Product

实时 operation 的 assistant/thinking redactor 持有本次 credential exact value；正常 `#markSettled` 会用该值
从 Pi Session 生成 redacted snapshot，然后立即清空敏感值
（`apps/native-host/src/piRuntime.ts:761-778`）。但 Host restart、cursor ahead 或 history compaction 走
`#queryNativeOperation(operationRef)`，没有传入 exact value
（`:1255-1269`、`:1380-1391`）。该函数会直接从 native Session 拼接 assistant text，只用空 exact list 和
`sk-` / `token-` 等启发式前缀做脱敏，再把 snapshot 交给 Product
（`:653-715`；通用 redactor 位于 `:242-259`）。

因此在“Pi 已持久化 final assistant，但 Host 在写安全 snapshot 前崩溃”的窗口中，如果 provider 回显的是不带
已知前缀的普通 opaque credential，重启后的 resnapshot 可以把它写入 Product DB/read model，进而到 renderer。
这违反 Work 的 credential stop condition；0600 session/fact 文件不能保护跨进程投影后的内容。

现有测试没有反证该路径。full-runtime case 使用 `token-secretfixturevalue`，命中的是通用 `token-` 正则而非本次
broker credential；exact-value unit 只测独立 `StreamingContentRedactor`。restart tests 则使用无 secret 的
完成结果，并在已经正常结算后人工删除 snapshot。需要加入任意无前缀 canary 的真实 broker run，并覆盖
assistant persisted → safe snapshot 未写 → Host crash → reconcile；在无法证明 restart redaction 时必须
fail closed 为 unknown，不能恢复未经证明安全的 assistant payload。

### P1 — Work 明确要求的真实 journey、fault matrix 与 Package 进程隔离 proof 尚未完成

handoff 已诚实列出这些缺口，但它们属于当前 Work 的 In scope、Done conditions 与 Checkpoint verification，
不是可以留给 authority-retirement Work 的可选收尾：

- live Chat 已被上述 falsifier 阻断，folder-backed Agent 因零重放原则没有发出；因此没有 real Chat + Agent
  native result、Session continuation、真实 stream/tool/usage/settlement 或 credential canary；
- 没有 packaged Desktop 中 UI → Product → Service → established Host → Pi 的完整 journey；
- 没有真实 Service kill、during-stream/after-effect/provider-side-effect 窗口及其 replay/effect 计数；
- Package test 只证明 `ResourceLoader` 收敛 import throw。它没有让 Package 真正终止 Host process，也没有在
  同一场景证明 Desktop Window、真实 Product SQLite/Queue 存活且 supervisor 恢复；
- Desktop supervisor SIGKILL test 使用静态 Product snapshot，Product SQLite restart test 又没有真实 Host
  process failure，两者不能拼接成联合 crash-containment 证明。

17/17 native、24/24 Service、14/14 Web、4 browser 和 4 Desktop focused checks 都有价值，但只证明对应的 faux/
component/process mechanism。它们不能替代 Work 冻结的真实 provider、真实进程故障与同一路径 checkpoint，
也不能授权下一 Work 删除竞争 authority。

## Verdict

`FAIL`。当前 candidate 已经形成了值得保留的 Host-only Pi replacement skeleton，但其 acceptance 核心 observable
与 Pi 0.81.1 的真实持久化语义冲突，并已被最小 live Chat 直接击穿；indeterminate 又没有可达且安全的调和路径。
此外，Host restart exact-secret redaction 存在持久泄漏窗口，Work 自身要求的真实 fault/Package/process proof
尚未完成。

这不是要求扩大架构、重开 Converge/QbD 或提前删除旧 authority。最小修复顺序应是：先建立真实 Pi 首轮
acceptance/late-reconciliation truth，再关闭 crash-safe credential projection，随后用同一 candidate 跑一条 real
Chat、一条 folder-backed Agent 与冻结 fault matrix。只有这些 finding 关闭后，才适合独立 re-review，并由后续
Work 判断旧 execution authority 的物理删除。

## 已核对且方向正确的部分

- Pi `0.81.1` 依赖精确锁定在 `apps/native-host` replacement path；本轮新增 runtime/Package imports 未进入
  Electron Main、renderer 或 Product Service。
- established Host endpoint/auth/supervisor seam 被复用，没有创建第二 Host 或 alternate transport。
- Product Queue/outbox 当前仍保持 `automaticReplayCount = 0`；unknown admission 会阻止下一 Run，没有发现盲重放。
- runtime facts、response frame pagination、sequence/size bounds、typed control results 与 Product-only presentation
  的 focused checks 通过。
- permission policy 与 enforcement truth 保持分离，当前返回 `unverified`，没有伪称 `host-enforced`。
- Desktop broker 使用独立认证连接并只读系统 Keychain；renderer 没有 credential readback seam。缺失 onboarding
  writer 与 Question/live enforcement 证据仍应保留为后续明确工作，不能在本 review 中伪装为已完成。

## Predecessor and subject resolution

predecessor operation `0a50a2c07602464ea005a857f0bcbdac` 解析为 completed implementer
`pi_native_execution_implementer`，entry 为同一 `work/adopt-pi-native-execution.md`，output 为
`.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/adopt-pi-native-execution.md`。handoff revision 为
`handoff-adopt-pi-native-execution-20260805-r1`，状态为 `CANDIDATE`，且明确声明未 stage/commit/merge。reviewer actor
与 implementer actor 不同。

本 review 检查了当前实际 T4 dirty tree，而不只依赖 handoff 路径列表。共享树中的 08-03 文档、omp-flow 配置/wiki
杂项与已接受 T3 文件不归入本 verdict，也没有被 reviewer 修改。

## Independent verification

| Command / inspection                                                                                                                                                                                                    | Result                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| predecessor/reviewer operation records、完整 Work、handoff、Execution/Product/Workbench owner、T4 design/source evidence 与实际 changed/untracked tree                                                                  | PASS；receipt、同一 Work、output 与 actor separation 成立。                                                                                                                                      |
| 锁定 Pi 0.81.1 的 `AgentSession` event/persistence 与 `SessionManager` new-session flush 源码，结合 OmniMind `queryPersistedAcceptance` 顺序审查                                                                        | FAIL acceptance falsifier；首轮 user entry 在 assistant 前不具备当前所需的 reopen durability。                                                                                                   |
| 同源最小 live probe：established Host + Desktop broker protocol + Service client + Pi 0.81.1                                                                                                                            | FAIL，exit 1；catalog response / selected model available，首个 Chat execute 为 `execution.indeterminate`；随后停止，无第二 execute、无自动重放。未记录的 boundary/hint/request count 未被外推。 |
| `bun test apps/native-host/src/piRuntime.test.ts apps/native-host/src/responseFrame.test.ts`                                                                                                                            | PASS，exit 0；2 files / 17 tests。该结果不覆盖慢速真实首轮 acceptance 或 restart exact-secret canary。                                                                                           |
| `bun run test -- src/product/ProductControlPlane.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/native-host/serviceProcess.integration.test.ts`（cwd `apps/service`） | PASS，exit 0；4 files / 24 tests。                                                                                                                                                               |
| `bun run test -- src/productReadModel.test.ts src/store/productStore.test.ts`（cwd `apps/web`）                                                                                                                         | PASS，exit 0；2 files / 14 tests。                                                                                                                                                               |
| `bun run test:browser -- src/components/ChatView.browser.tsx -t 'Product Chat message\|authenticated Pi picker\|unknown Product Runs\|Product stop'`（cwd `apps/web`）                                                  | PASS，exit 0；4 passed / 86 skipped。                                                                                                                                                            |
| `bun run test -- src/process/nativeHostCredentialBroker.test.ts src/process/nativeHostProcess.integration.test.ts`（cwd `apps/desktop`）                                                                                | PASS，exit 0；2 files / 4 tests。后者不是 Package-kills-Host + real Product Store 联合 proof。                                                                                                   |
| scoped `git diff --check` over T4 Host/Desktop/Service/Product/Web/contracts paths                                                                                                                                      | PASS，exit 0，无输出。                                                                                                                                                                           |

未运行 repository-root full suite，也未把 focused green 外推为未覆盖的 live、packaged、fault-matrix 或 Campaign
结论。由于上述 P1 已直接 falsify candidate，没有重复运行 handoff 已记录的全部 package typecheck/build。

## Scope and next review boundary

本 `FAIL` 只否决当前 `Adopt Pi native execution inside the established Host` candidate 的接受，不否定 T1–T3，
不授权删除旧 authority，也不宣称 OmniMind V1/Campaign 完成。下一次有界 review 应只复核本轮四项 P1 及受影响
gate；不需要第四轮证据审计、平行文档或新公共状态本体。

Reviewer 未实施任何产品修复，未修改 architecture、Campaign、runtime records 或 handoff；唯一 repository write
是本 linked Review Concept。未 stage、commit、push 或 merge。

## Dispatch identity

- actorId: `pi_native_execution_reviewer`
- receipt: `4e7b6d9c65e44ca581622a80fad0e50f`
- predecessor receipt: `0a50a2c07602464ea005a857f0bcbdac`
- predecessor output: `../handoffs/adopt-pi-native-execution.md`
