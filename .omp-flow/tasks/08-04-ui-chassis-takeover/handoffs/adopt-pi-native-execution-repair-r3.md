---
type: "Implementation Handoff"
title: "Repair orphaned Pi pending receipt semantics"
work: "../work/adopt-pi-native-execution.md"
status: "DONE"
revision: "handoff-adopt-pi-native-execution-repair-20260805-r4"
actor_id: "pi_native_execution_implementer_r3"
dispatch_receipt: "d008355646d24f21aded8afaf57f40f5"
predecessor_receipt: "592701d059f54e12a6302cc00964fd34"
predecessor_handoff: "./adopt-pi-native-execution-repair.md"
predecessor_review: "../reviews/adopt-pi-native-execution-recheck.md"
review_receipt: "194bfbc8c551466c98cd82bd2c8f46e1"
---

# Repair orphaned Pi pending receipt semantics

## Outcome

本轮只修复 predecessor review `194bfbc8c551466c98cd82bd2c8f46e1` 的唯一 P1：没有 native entry，
也没有 accepted/rejected typed resolution 的 `pi-pending:*` orphan 不再被改写为
`outcome_unknown`。Service native boundary 在第一次得到无证据的 `status=unknown` 后静默停止本次观察；
Product receipt 保持 `delivery_unknown`、原 reconciliation hint、`attemptCount=1` 与
`automaticReplayCount=0`。

公共合同同时恢复为唯一的 accepted-context `outcome_unknown`：它必须携带 `operationRef`、
`engineBinding`、`resolvedSelection`，且 `lastConfirmedBoundary` 只能是 `accepted`。此前错误增加的
`DispatchDeliveryOutcomeUnknown` 已删除。ProductControlPlane 也在消费边界防御性忽略
`delivery_unknown -> outcome_unknown` observation；`accepted/running -> outcome_unknown` 保持不变。

该 bounded repair 已完成，仍需不同 actor 独立 review；本 handoff 不自证 Work 或 T4 整体通过。

## Receipt transition decisions

| Current durable fact | Reconciliation / observation | Result |
| --- | --- | --- |
| `delivery_unknown` + `pi-pending:*` hint | typed accepted resolution | 进入携带 native operation/binding/selection 的 `accepted`，随后观察 accepted operation |
| `delivery_unknown` + `pi-pending:*` hint | typed rejected resolution | 进入 `rejected` |
| `delivery_unknown` + `pi-pending:*` hint | `resolution=null`, `status=unknown`, 无 facts/snapshot | 保持原 `delivery_unknown` 与 hint；静默停止本次 observer；不 replay |
| `accepted` 或 `running` | accepted-side outcome 无法再确认 | 进入携带完整 accepted context 的 `outcome_unknown` |

active pending 若仍返回 `status=running`，会继续调和；本轮没有改变 late accepted/rejected 路径。未来 Service
重启仍可从持久化 hint 发起一次新的 reconciliation，但不会重新 execute。

## Package crash proof

Package-kills-Host 联合测试现在直接记录 restart 后 Host 对 orphan hint 的真实调和结果：

- Host PID 改变并重新完成 authenticated readiness；
- Host 返回 `status=unknown`、`resolution=null`；
- Product receipt 继续是 `delivery_unknown`，保留
  `pi-pending:dispatch-package-crash-proof`；
- 第二个 Queue item 保留；
- outbox 为 `terminal / sent / attemptCount=1 / automaticReplayCount=0`；
- Product database 与 result file 保持 0600，secret/redaction assertions 保持不变。

这证明进程隔离、Host restart、Product Store/Queue continuity 与零重放机制没有依赖错误的
pre-acceptance `outcome_unknown` 终态。

## Files changed by this repair actor

Production contracts and boundaries:

- `packages/contracts/src/product/state.ts`
- `apps/service/src/native-host/executionBoundary.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/service/src/native-host/packageCrashProbe.ts`

Focused verification:

- `packages/contracts/src/product/state.test.ts`
- `apps/service/src/native-host/executionBoundary.test.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/desktop/src/process/nativeHostProcess.integration.test.ts`

Workflow output:

- `.omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/adopt-pi-native-execution-repair-r3.md`

共享工作树中的 predecessor candidate、08-03 文档、omp-flow 配置/wiki 与其余 T4 路径均在本 dispatch 前
存在。本 actor 没有清理或覆盖它们；没有修改 Work、Review、architecture、Campaign、runtime/session records
或 Harness 配置。

## Verification

以下检查均在本轮最后一次 production source 变更后运行：

| Command / inspection | Result |
| --- | --- |
| `bun run --filter @omnimind/contracts typecheck` | PASS；exit 0；仅两个既有 Effect JSON advisory |
| `bun run --filter @omnimind/contracts test -- src/product/state.test.ts --reporter=dot` | PASS；1 file / 3 tests |
| `bun run --filter @omnimind/service typecheck` | PASS |
| `bun run --filter @omnimind/service test -- src/native-host/executionBoundary.test.ts src/product/ProductControlPlane.test.ts --reporter=dot` | PASS；2 files / 27 tests |
| `bun run --filter @omnimind/desktop typecheck` | PASS |
| `bun run --filter @omnimind/desktop test -- src/process/nativeHostProcess.integration.test.ts -t "contains a Package-killed Host" --reporter=dot` | PASS；1 passed / 1 skipped |
| `bun run --filter @omnimind/service build` | PASS；production bundle refreshed |
| build 后在 `apps/service/dist` 搜索 package probe 名称、result 字段与固定 orphan 文案 | PASS；零命中，source-only probe 未进入 artifact |
| scoped `git diff --check --` over the eight repair code/test paths | PASS；无输出 |
| contract and source inspection for `DispatchDeliveryOutcomeUnknown` | PASS；零命中；只剩 accepted-context `DispatchOutcomeUnknown` |

没有运行 repository-root full suite，也没有把这些 focused checks 外推为 packaged Electron Window、实际
Keychain onboarding、全平台发行或 Campaign 完成。predecessor handoff 的 same-source live Pi evidence 未被本轮
代码路径改变，本轮按 review 的窄边界没有重跑 live harness。

## Scope decisions and caveats

- 没有改变 native first-Session acceptance、pending journal、credential digest/restart fail-closed、live journey
  harness、Web/UI copy 或 presentation。
- 没有改变 replay、旧 execution authority、closed mechanisms、Work 6 或其他 Work 的范围。
- 没有增加人工解除 unknown 的 resolution policy；若产品需要该能力，应以独立且诚实的状态策略设计。
- 本轮 bounded done conditions 已有直接测试覆盖；没有新发现的未证 done condition。implementation 仍需独立 review。

## Dispatch identity

- actorId: `pi_native_execution_implementer_r3`
- receipt: `d008355646d24f21aded8afaf57f40f5`
- predecessor receipt: `592701d059f54e12a6302cc00964fd34`
- predecessor output: `./adopt-pi-native-execution-repair.md`
- reviewed predecessor receipt: `194bfbc8c551466c98cd82bd2c8f46e1`
- output: `./adopt-pi-native-execution-repair-r3.md`

未 stage、commit、push 或 merge。
