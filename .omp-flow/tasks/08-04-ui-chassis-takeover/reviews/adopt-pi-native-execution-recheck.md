---
type: "Implementation Review"
title: "Recheck: Adopt Pi native execution inside the established Host"
work: "../work/adopt-pi-native-execution.md"
handoff: "../handoffs/adopt-pi-native-execution-repair.md"
verdict: "FAIL"
revision: "review-adopt-pi-native-execution-recheck-20260805-r2"
actor_id: "pi_native_execution_reviewer_r2"
dispatch_receipt: "194bfbc8c551466c98cd82bd2c8f46e1"
predecessor_receipt: "592701d059f54e12a6302cc00964fd34"
predecessor_output: "../handoffs/adopt-pi-native-execution-repair.md"
---

# Recheck: Adopt Pi native execution inside the established Host

## Finding

### P1 — 无 acceptance 证据的 pending orphan 被错误改写为 `outcome_unknown`

本轮已经把 `pi-pending:*` 变成可持久消费的 reconciliation hint，也能在 restart 后返回 late accepted 或
durable rejected；这部分修复成立。但第三条 orphan 分支违反已冻结的 receipt 语义。

权威契约明确区分：无法证明 Engine 是否接受时必须保留 `delivery_unknown`
（`architecture/product-state.md:60-63`）；send 后无 ack 且无法 query 是 `delivery_unknown`，只有 accepted 后失联
才是 `outcome_unknown`（`design.md:264-272`）。fault matrix 同样把 native acceptance 前/ack 前的不确定性保留为
pending 或 `delivery_unknown`，把 `outcome_unknown` 限定在 accepted 后、side effect 后无法收敛的窗口
（`design.md:489-498`）。

当前实现却新增了一个不含 `operationRef`、`engineBinding` 或 accepted boundary 的
`DispatchDeliveryOutcomeUnknown`（`packages/contracts/src/product/state.ts:178-200`）。当 Host 对 pending ref
返回 `resolution=null`、`status!=running` 且没有 native facts/snapshot 时，Service 发布通用
`outcome-unknown`（`apps/service/src/native-host/executionBoundary.ts:107-123`）；Product 随后把当前
`delivery_unknown` 持久改写为 `outcome_unknown`，但仍只保留 `sent`/`acceptance-ack` boundary
（`apps/service/src/product/ProductControlPlane.ts:2015-2029`）。对应测试甚至把“pending reconciliation has no
proof”固定为这一结果（`apps/service/src/product/ProductControlPlane.test.ts:494-539`）。

这不是 harmless label。`outcome_unknown` 向 Product/UI 表示“accepted operation 的结果未知”，而这里唯一可证明的
事实恰好是 acceptance 仍未知；Web 也会把它呈现为 request outcome 无法确认，而不是 delivery 无法确认
（`apps/web/src/productReadModel.ts:251-260`）。Package-kills-Host proof 因此以错误的 durable receipt 作为预期
成功：Host 在 ResourceLoader 窗口被杀、没有 user entry/accepted resolution，却断言最终
`outcome_unknown`（`apps/desktop/src/process/nativeHostProcess.integration.test.ts:246-257`）。

修复边界很窄：orphan 必须继续保持 `delivery_unknown` 与 reconciliation hint，禁止 replay；只有 typed accepted
resolution 建立 operation/binding 后，后续失联才能转 `outcome_unknown`。如果产品需要人工解除永不收敛的
unknown，那是另一个显式、诚实的 resolution policy，不能通过伪造 accepted-after 语义实现。本 review 不要求
重开 Converge/QbD、增加公共本体或扩大到 Work 6。

## Verdict

`FAIL`。四项原 P1 中，首 Session durable acceptance、restart exact-credential fail-closed 与真实
Package-kills-Host/Product Store/Queue 机制均已实质关闭；same-source real-provider Chat、continuation、folder
Agent 也有可复核的脱敏证据。但 pending reconciliation 的 orphan 终态仍违反 Product State 与冻结 fault matrix，
所以当前 T4 candidate 不能被接受，也不能授权下一 Work 删除竞争 execution authority。

## 已关闭的原 P1

- **首 Session acceptance：关闭。** 新 Session 通过 Pi public `SessionManager.create` 分配路径，以 0600 `wx`
  创建空文件，再由 `SessionManager.open` 初始化 native header。Pi 0.81.1 的 empty-existing-file 分支进入 flushed
  manager；真实 Pi Session 测试证明 assistant 被 gate 阻塞时 user entry 已可 reopen 查询，restart 又能从同一
  pending record 得到 accepted resolution。没有用 timeout、本地 UUID 或 `prompt(): Promise<void>` 冒充接纳。
- **exact credential restart projection：关闭。** 正常 settlement 同步保存由 live exact redactor 形成的
  `pi-redacted-stream` snapshot；snapshot 缺失时，restart 只有在重新 broker 的当前 credential 与 private digest
  constant-time match 后才读取 native assistant 并做 exact redaction，不匹配/缺失则返回
  `native-outcome-unknown` 且不投影 assistant。无前缀 opaque canary 覆盖 rotated/original credential 两条路径。
- **Package process crash + Product continuity：机制关闭。** 当前源码重新 build 的 production Host dist 在
  Host-owned Extension initializer 中被 `SIGKILL`；Desktop supervisor 使用新 PID 重新完成认证，真实
  `NativeHostClient`、execution boundary 与 ProductControlPlane SQLite/Queue 保留第二 Queue item，outbox
  `attempt=1`、`automaticReplay=0`，Product persistence/result 不含 credential 或 auth material。这个 proof 的
  orphan receipt 断言仍受上述 P1 影响，但进程隔离、重启、Store/Queue continuity 与零重放机制本身成立。
- **real Pi journeys：关闭。** linked r3 handoff 记录在最后一次 production source 变更后运行同源
  Pi 0.81.1 live harness：Chat new、同 Conversation continuation continued、folder-backed Agent read tool 三次
  dispatch 全部 settled，attempt 均 1、automatic replay 均 0，并观察到 thinking/usage/settlement，Agent 还观察到
  tool started/settled；持久层与 Host 输出 secret scan 为 false。reviewer 检查了 harness 的隔离 root、0600
  result、脱敏摘要和 production build exclusion。该证据不证明 packaged Electron Window UI 或实际 Keychain
  onboarding，handoff 也没有这样宣称。

## Predecessor and subject resolution

predecessor `592701d059f54e12a6302cc00964fd34` 为 completed implementer
`pi_native_execution_implementer_r2`，entry 指向同一 Work，output 为本 review 的 linked r3 repair handoff；actor
与 reviewer 不同。reviewer 检查了完整当前 T4 dirty tree及 repair 文件，而不只依赖 handoff 的 changed-files 列表。
共享树中的 08-03 文档、omp-flow 配置/wiki、历史 handoff/review 与已接受 T3 记录不归入本 verdict，也未被改写。

## Independent verification

| Command / inspection | Result |
| --- | --- |
| Work、repair handoff、predecessor/reviewer operation records、Execution/Product/Workbench owner、当前 T4 diff与 linked design | PASS；receipt、output、同一 Work 与 actor separation 成立；发现本 review 的 receipt semantic P1 |
| Pi 0.81.1 `SessionManager` empty existing-file/open/persistence 分支、OmniMind first-Session acceptance顺序与 blocked-assistant/restart tests | PASS；durable user entry 是 native acceptance observable |
| `bun run --filter @omnimind/contracts test -- src/native-host/protocol.test.ts src/product/state.test.ts --reporter=dot` | PASS；2 files / 7 tests |
| `bun run --filter @omnimind/native-host test -- src/piRuntime.test.ts src/responseFrame.test.ts --reporter=dot` | PASS；2 files / 19 tests |
| `bun run --filter @omnimind/service test -- src/product/ProductControlPlane.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/native-host/serviceProcess.integration.test.ts --reporter=dot` | PASS；4 files / 30 tests；其中 orphan assertions 固化了本 review 指出的错误语义 |
| `bun run --filter @omnimind/web test -- src/productReadModel.test.ts src/store/productStore.test.ts src/i18n/workbenchCopy.test.ts --reporter=dot` | PASS；3 files / 17 tests |
| `bun run --filter @omnimind/web test:browser -- src/components/ChatView.browser.tsx -t 'route-backed Agent and Chat\|hidden retained completion\|real Chat health state\|Product Chat message' --reporter=dot` | PASS；4 passed / 86 skipped；route-backed Chat p95 52.5ms、Agent p95 43.6ms、0 long task，低于 80ms budget |
| `bun run --filter @omnimind/desktop test -- src/process/nativeHostCredentialBroker.test.ts src/process/nativeHostProcess.integration.test.ts --reporter=dot` | PASS；2 files / 5 tests |
| 当前源码 `bun run --filter @omnimind/native-host build` 后复跑 `nativeHostProcess.integration.test.ts` | PASS；production Host dist refreshed；1 file / 2 tests，含 Package `SIGKILL` 联合 proof |
| contracts/native-host/service/web/desktop 五个 package typecheck | PASS；全部 exit 0；contracts 仅两个既有 Effect JSON advisory |
| production `apps/service/dist` / `apps/native-host/dist` probe-name、env-name与固定文案 exclusion scan | PASS；零命中，两个 source-only probe 未进入 production dist |
| scoped `git diff --check --` over affected contracts/Host/Service/Product/Desktop/Web paths | PASS；无输出 |

未运行 repository-root full suite，也未把 focused green、source-only live harness或 Bun Service probe外推为 packaged
Electron Window、实际 Keychain onboarding、全平台发行或 Campaign 完成。

## Scope and next review boundary

下一次 re-review 只需复核：无 accepted evidence 的 pending orphan 保持 `delivery_unknown`；late accepted/rejected 与
accepted-after outcome unknown 仍能收敛；Package crash proof、Product Queue、zero replay及 affected Web
presentation没有回归。无需重新审计本轮已关闭的 first-Session、exact credential、real journey、Package process
mechanism，也不得制造第四轮 evidence audit。

Reviewer 未实施产品修复，未修改 architecture、Campaign、runtime records或 handoff；唯一 repository write 是本
linked Review Concept。未 stage、commit、push或 merge。

## Dispatch identity

- actorId: `pi_native_execution_reviewer_r2`
- receipt: `194bfbc8c551466c98cd82bd2c8f46e1`
- predecessor receipt: `592701d059f54e12a6302cc00964fd34`
- predecessor output: `../handoffs/adopt-pi-native-execution-repair.md`
