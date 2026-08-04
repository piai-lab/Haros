---
type: "Implementation Review"
title: "Final review: Adopt Pi native execution inside the established Host"
work: "../work/adopt-pi-native-execution.md"
handoff: "../handoffs/adopt-pi-native-execution-repair-r3.md"
verdict: "PASS"
revision: "review-adopt-pi-native-execution-final-20260805-r3"
actor_id: "pi_native_execution_reviewer_r3"
dispatch_receipt: "3ca9666d371e4b35b1694d6ac0cb6862"
predecessor_receipt: "d008355646d24f21aded8afaf57f40f5"
predecessor_output: "../handoffs/adopt-pi-native-execution-repair-r3.md"
reviewed_failure_receipt: "194bfbc8c551466c98cd82bd2c8f46e1"
---

# Final review: Adopt Pi native execution inside the established Host

## Findings

No blocking or non-blocking finding within this bounded re-review.

## Verdict

`PASS`。failed review `194bfbc8c551466c98cd82bd2c8f46e1` 的唯一剩余 P1 已关闭：没有 native
entry、没有 typed accepted/rejected resolution 的 `pi-pending:*` orphan 现在保持 durable
`delivery_unknown` 与原 reconciliation hint；observer 在一次无证据的 `status=unknown` 后停止，不发布
`outcome-unknown`、不调用 execute、也不 replay。此前错误的 pre-acceptance `outcome_unknown` contract variant
已经删除。

本 verdict 接受当前 T4 Work candidate，可供主线程进入同源 commit gate及后续已排定 Work。它不代表 Work 6、
packaged Electron Window、实际 Keychain onboarding、全平台发行或 OmniMind Campaign 完成。

## P1 resolution

### Durable orphan truth

`makeNativeHostExecutionBoundary` 只把不以 `pi-pending:` 开头的 accepted operation ref 归入 accepted-side
`outcome-unknown`。pending hint 得到 `resolution=null`、无 facts/snapshot 且 `status!=running` 时直接结束 observer；
catch/retry exhaustion 同样不会对 pending ref 发布 fabricated outcome。observer 的 promise 在 `finally` 中从
active map 删除，因此未来 Service restart 可以从 Product 持久 hint 发起新的查询，但当前观察不会常驻循环或提交
第二次 execute（`apps/service/src/native-host/executionBoundary.ts:63-70,107-124,133-181`）。

Product subscription 只允许 `delivery-accepted` / `delivery-rejected` 修改当前 `delivery_unknown`；收到通用
`outcome-unknown` 时，只有当前 receipt 已是 `accepted` 或 `running` 才持久化 accepted-context
`outcome_unknown`。所以即使 boundary 出现 stale/out-of-order observation，pre-acceptance receipt 也保持原值
（`apps/service/src/product/ProductControlPlane.ts:1953-2029`）。Product startup 仍会消费持久化的 pending hint，
但不会重新 dispatch（`:2032-2051`）。

### Contract closure

`ProductDispatchReceipt` 现在只有一个 `outcome_unknown` variant：必须携带 `operationRef`、`engineBinding`、
`resolvedSelection`，且 `lastConfirmedBoundary="accepted"`。原
`DispatchDeliveryOutcomeUnknown` 已从 schema/source 删除；contract test 明确拒绝
`{ state: "outcome_unknown", lastConfirmedBoundary: "sent", reconciliationHint: ... }`
（`packages/contracts/src/product/state.ts:143-194`；`packages/contracts/src/product/state.test.ts:140-173`）。

### Valid convergence remains intact

- pending typed accepted resolution 仍先发布 `delivery-accepted`，随后只观察 resolved `pi-op:*`；Product 保存
  operation/binding/selection，accepted-side失联才转完整 `outcome_unknown`；execute count保持0。
- pending typed rejected resolution 仍发布 `delivery-rejected`；Product 收敛为 rejected；execute count保持0。
- `observeRun` 与 runtime subscription 都要求当前 receipt 是 `accepted | running` 才生成
  `outcome_unknown`，并保留完整 accepted context。

对应 Service tests 同时覆盖 late accepted、late rejected、orphan静默停止、Product defensive ignore、startup hint
resume、accepted/running context与 attempt/replay invariants。

### Package SIGKILL proof remains truthful

reviewer 用当前源码重新生成 production Native Host dist，再执行指定 Package crash test。Host-owned Extension在
ResourceLoader 初始化窗口 `SIGKILL` Host；Desktop supervisor以不同 PID重新完成 authenticated readiness。真实
Service probe观察到 Host 对 pending ref 返回 `status=unknown`、`resolution=null`，Product receipt从提交到恢复后
始终为 `delivery_unknown`，hint仍是 `pi-pending:dispatch-package-crash-proof`；第二 Queue item保留，outbox为
`terminal/sent`、`attemptCount=1`、`automaticReplayCount=0`。Product DB/result仍为0600，credential与两类 auth
material未出现在持久字节中。

## Predecessor and review boundary

predecessor operation `d008355646d24f21aded8afaf57f40f5` 为 completed implementer
`pi_native_execution_implementer_r3`，entry 指向同一 Work，output 与本 review linked handoff一致；implementer与
reviewer actor不同。handoff revision为 `handoff-adopt-pi-native-execution-repair-20260805-r4`，明确链接 failed
review receipt `194bfbc8c551466c98cd82bd2c8f46e1`。

本 review 检查了当前实际相关 diff、contracts、Service boundary/Product persistence与Desktop联合测试。依照
dispatch边界，没有重开已关闭的 first-Session acceptance、exact credential restart、real-provider journeys、
UI方向、QbD或 Work 6。共享树中的 08-03、omp-flow配置/wiki、历史 handoff/review与其他 T4 candidate文件不归入
本次新增 verdict，也未被 reviewer修改。

## Independent verification

| Command / inspection | Result |
| --- | --- |
| predecessor/reviewer operation records、Work、r4 handoff、failed r2 Review、Product State/design语义与当前相关 diff | PASS；receipt、output、同一 Work、actor separation与单一 P1范围成立 |
| `DispatchDeliveryOutcomeUnknown` source scan；accepted-context `outcome_unknown` schema/consumer inspection | PASS；错误 variant零命中；唯一 variant要求 operation/binding/selection + accepted boundary |
| `bun run --filter @omnimind/contracts test -- src/product/state.test.ts --reporter=dot` | PASS；1 file / 3 tests |
| `bun run --filter @omnimind/service test -- src/native-host/executionBoundary.test.ts src/product/ProductControlPlane.test.ts --reporter=dot` | PASS；2 files / 27 tests |
| `bun run --filter @omnimind/native-host build` | PASS；当前 production Host dist refreshed |
| `bun run --filter @omnimind/desktop test -- src/process/nativeHostProcess.integration.test.ts -t 'contains a Package-killed Host' --reporter=dot` | PASS；1 passed / 1 skipped；reauth、Queue retention、truthful delivery unknown、attempt 1 / replay 0全部成立 |
| contracts/service/desktop package typecheck | PASS；全部 exit 0；contracts仅两个既有 Effect JSON advisory |
| `bun run --filter @omnimind/service build` 后 production probe exclusion scan | PASS；Service bundle refreshed；probe名称、字段、env与固定文案零命中 |
| scoped `git diff --check --` over八个 repair code/test paths | PASS；无输出 |

未运行 repository-root full suite；本次改动没有触及 Web presentation，且 dispatch明确要求只跑受影响 gates。

## Scope and handoff

Reviewer 未实施产品修复，未修改 architecture、Campaign、runtime records或 implementer handoff；唯一 repository
write是本 linked Review Concept。未 stage、commit、push或 merge。

## Dispatch identity

- actorId: `pi_native_execution_reviewer_r3`
- receipt: `3ca9666d371e4b35b1694d6ac0cb6862`
- predecessor receipt: `d008355646d24f21aded8afaf57f40f5`
- predecessor output: `../handoffs/adopt-pi-native-execution-repair-r3.md`
- reviewed failure receipt: `194bfbc8c551466c98cd82bd2c8f46e1`
