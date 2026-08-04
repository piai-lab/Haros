---
type: "Implementation Handoff"
title: "Repair the Pi native execution P1 findings"
work: "../work/adopt-pi-native-execution.md"
status: "CANDIDATE"
revision: "handoff-adopt-pi-native-execution-repair-20260805-r3"
actor_id: "pi_native_execution_implementer_r2"
dispatch_receipt: "592701d059f54e12a6302cc00964fd34"
predecessor_receipt: "0a50a2c07602464ea005a857f0bcbdac"
predecessor_handoff: "./adopt-pi-native-execution.md"
predecessor_review: "../reviews/adopt-pi-native-execution.md"
review_receipt: "4e7b6d9c65e44ca581622a80fad0e50f"
---

# Repair the Pi native execution P1 findings

## Outcome

本轮只修复 predecessor review `4e7b6d9c65e44ca581622a80fad0e50f` 的四项 P1：首个 Pi
Session 的 assistant 前持久 acceptance、`pi-pending:*` 的跨进程调和、Host restart 的 exact credential
投影边界，以及 Package 真杀 Host 与真实 Product SQLite/Queue 的联合机制证明。没有删除旧 execution
authority，没有改变 established Host executable/endpoint/auth/supervisor seam，也没有扩张到 credential
onboarding、permission enforcement 或 Question 产品设计。

当前代码与本地机制门已冻结为 repair candidate。真实 provider Chat、同 Session continuation 与
folder-backed Agent 已由主线程在同一冻结 source 上完成脱敏 live 验证；本 actor 仍未读取秘密清单或接触
credential。实现与生产探针排除门均已闭合，现进入不同 actor 的独立复核；本 handoff 不自证 PASS。

## Closed P1 findings

| Review finding | Repair | Frozen proof |
| --- | --- | --- |
| 新 Session acceptance 等待 assistant | 新 Session 先用 Pi public `SessionManager.create` 分配路径，创建 0600 空文件，再由 `SessionManager.open` 写入并 reopen 原生 header；其后 user entry 可在 assistant 阻塞时同步持久查询，仍不使用 timeout/local ID 冒充 accepted | faux provider assistant gate 保持阻塞时，`execute` 已返回 `session-manager-reopen` acceptance；restart 对 pending ref 返回同一 native entry resolution |
| pending hint 不可消费且 faux settlement 可误收 accepted | Host 在 prompt 前原子持久化 private pending-dispatch record；accepted/rejected 都是 typed resolution，orphan 才是 unknown。Service 在首次 indeterminate 与 Product startup 都观察 hint，从不再次 execute；Product 允许 `delivery_unknown → accepted/rejected/outcome_unknown` | Host restart accepted/rejected tests；Service late accepted/rejected/orphan tests；Product startup、accepted→outcome unknown、sent→outcome unknown tests；outbox始终 attempt=1/replay=0 |
| restart 丢 exact redaction 后可能回流 native transcript secret | 正常 Run 同步写 `pi-redacted-stream` Product-safe snapshot。若 snapshot 缺失，Host 只持久化 credential 的 SHA-256 base64url digest；restart 重新向 broker取当前 credential，并仅在 constant-time digest match 时读取/脱敏 native assistant；不匹配或缺失时 fail closed 为 `native-outcome-unknown`，不投影 assistant | 无前缀 opaque canary 覆盖 assistant persisted→删 safe snapshot→restart；轮换 credential 得到 null snapshot 且两值均不泄漏；原 credential digest match 才恢复 `[redacted]` |
| 无 Package 进程 crash + 真实 Store/Queue 联合证明 | Desktop test 运行生产 Host dist、真实 supervisor 与 authenticated credential broker；Service Bun probe 使用真实 `NativeHostClient`、execution boundary、ProductControlPlane SQLite/Queue；Host-owned Pi extension 在 `createAgentSession`/ResourceLoader 窗口 `SIGKILL` Host | Host PID 改变并重新认证；submit 首先 `delivery_unknown`，restart 后 orphan 收口 `outcome_unknown`；第二 Queue item 保留；真实 outbox `terminal/sent`, attempt=1, replay=0；Product DB/result 无 credential或两类auth |

## Acceptance, pending and crash ordering decisions

1. `SessionManager.create` 只负责公共路径分配；OmniMind 不读取 Pi private fields。精确路径以 `wx`、0600 创建后，
   `SessionManager.open` 负责生成/写入 Pi native header 并进入 flushed manager。失败时只 unlink 该精确新文件。
2. pending journal 在 `createAgentSession` 与 ResourceLoader 之前写入；字段只含 opaque ids、Session定位、resolved
   selection、pre-prompt entry count、phase 和 credential digest，不含 prompt、assistant 或 raw credential。
3. native user entry 是唯一 late acceptance 证据。accepted journal 前先持久 session index；若任一步崩溃，restart
   仍能从 pending record + Session reopen 重做 promotion。prompt 确认结束且无 user entry 才 durable rejected。
4. active pending 返回 `status=running` 并继续调和；Host restart 后无 accepted/rejected 证据的 orphan 返回
   `status=unknown`，Service 将 Product `delivery_unknown` 收口为 pre-acceptance `outcome_unknown`，保留 hint 与
   `lastConfirmedBoundary`，但绝不 replay。
5. safe snapshot 从已经过 streaming exact redactor 的本 Run assistant facts 同步形成，并有独立 source
   `pi-redacted-stream`。超出 snapshot bound 时不伪造截断完整结果。native Session restart projection仍要求 exact
   digest match。

## Real process proof result

组合测试的真实进程为：Desktop `NativeHostProcessSupervisor` → 生产 `apps/native-host/dist/index.mjs` →
Desktop `NativeHostCredentialBroker` → Service Bun probe → `NativeHostClient` →
`makeNativeHostExecutionBoundary` → `ProductControlPlane` SQLite/Queue。Pi regular-file Extension 的 default
initializer 在 Host 内调用 `SIGKILL`；它不是 import-throw fixture。

最终观察：

- initial Host PID 与 restart PID 不同；restart 后 Service 完成 authenticated liveness；
- submit 返回 `delivery_unknown` 与确定性 `pi-pending:<dispatchId>`；restart 后没有 entry/resolution 的 orphan
  转为 `outcome_unknown`，没有第二次 execute；
- 第二个 durable Queue item仍是唯一 queued intent；
- outbox是 `terminal / sent / attemptCount=1 / automaticReplayCount=0`；
- result file与 Product database均为0600；test-owned temporary root在 cleanup中递归删除；
- failure diagnostic在进入 assertion前替换 dummy credential、Host auth、broker auth、host instance与endpoint；
  持久 bytes也断言不含三类秘密材料。

两个 probe 都是 source-only verification entry：Service production build仍只有既有 `src/index.ts` 与
`src/restoreMigrationBackup.ts` entries。最终 build 后对 `apps/service/dist` 搜索 probe 名称和固定错误文案为零
命中；probe没有进入最终 Service artifact或运行时 import graph。

## Injectable live journey harness

`apps/service/src/native-host/liveJourneyProbe.ts` 只消费 established Host 已有的
`OMNIMIND_NATIVE_HOST_ENDPOINT/AUTH/INSTANCE` 环境，不读取 Keychain、不读取本机秘密清单、不接受 raw
credential。调用者还需提供一个隔离临时根与该根内的 result path：

```text
OMNIMIND_PI_LIVE_PROBE_ROOT=<isolated-temp-root>
OMNIMIND_PI_LIVE_PROBE_RESULT=<isolated-temp-root>/result.json
bun apps/service/src/native-host/liveJourneyProbe.ts
```

可选 `OMNIMIND_PI_LIVE_PROBE_MODEL` 选择 catalog 中一个 authenticated provider-qualified model；可选 timeout
被限制在 10–180 秒。harness 通过真实 Product admission 顺序运行 Chat、同 Conversation continuation、
folder-backed Agent（要求 read tool读取隔离目录内 fixture），只输出 receipt state、lineage、assistant entry数、
thinking/tool/usage/settlement布尔值、dispatch/attempt/replay计数；不输出 prompt、assistant、credential、endpoint或
原始 provider response。result强制留在显式 probe root并以0600写入。

## Same-source real provider result

主线程在本 repair 最后一次 production source 变更后，以授权秘密清单中的一个当前可用
OpenAI-compatible provider 运行上述 harness。credential 仅以内存方式注入 established Desktop broker
protocol；未写入 argv、日志、result、Product database或仓库。隔离 probe root在读取0600 result后已清理。

脱敏观察如下：

```json
{
  "liveProductPi": "PASS",
  "runtimeVersion": "0.81.1",
  "dispatchCount": 3,
  "attemptCounts": [1, 1, 1],
  "automaticReplayCounts": [0, 0, 0],
  "chat": {
    "receiptState": "settled",
    "assistantEntryCount": 1,
    "lineage": "new",
    "thinkingObserved": true,
    "toolStarted": false,
    "toolSettled": false,
    "usageObserved": true,
    "settlementObserved": true
  },
  "continuation": {
    "receiptState": "settled",
    "assistantEntryCount": 1,
    "lineage": "continued",
    "thinkingObserved": true,
    "toolStarted": false,
    "toolSettled": false,
    "usageObserved": true,
    "settlementObserved": true
  },
  "agent": {
    "receiptState": "settled",
    "assistantEntryCount": 1,
    "lineage": "new",
    "thinkingObserved": true,
    "toolStarted": true,
    "toolSettled": true,
    "usageObserved": true,
    "settlementObserved": true
  },
  "persistedSecretLeak": false,
  "hostOutputSecretLeak": false
}
```

这证明真实 Product admission 连续三次 dispatch 均由 Pi 0.81.1 收口：首轮 Chat 创建 native Session、第二轮
复用同一 lineage、folder-backed Agent 实际启动并完成 read tool；三次 attempt均为1、automatic replay均为0。
它不等价于实际 macOS Keychain item或 packaged Electron Window UI proof：本次使用的是 established broker
protocol的内存 credential leaf，credential onboarding writer仍不在本 Work。

## Files changed by this repair actor

Production/protocol：

- `packages/contracts/src/native-host/protocol.ts`
- `packages/contracts/src/product/state.ts`
- `apps/native-host/src/index.ts`
- `apps/native-host/src/piRuntime.ts`
- `apps/service/src/native-host/executionBoundary.ts`
- `apps/service/src/product/ProductControlPlane.ts`
- `apps/web/src/productReadModel.ts`
- `apps/web/src/i18n/workbenchCopy.ts`

Focused tests and source-only probes：

- `packages/contracts/src/native-host/protocol.test.ts`
- `packages/contracts/src/product/state.test.ts`
- `apps/native-host/src/piRuntime.test.ts`
- `apps/native-host/src/responseFrame.test.ts`
- `apps/service/src/native-host/executionBoundary.test.ts`
- `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/service/src/native-host/packageCrashProbe.ts`
- `apps/service/src/native-host/liveJourneyProbe.ts`
- `apps/desktop/src/process/nativeHostProcess.integration.test.ts`

共享工作树中的 08-03 文档、omp-flow配置/wiki、predecessor handoff/review以及其余 T4 candidate paths均在本
dispatch 前存在。本 actor 未清理或覆盖它们，未修改 Work、Review、architecture、Campaign、runtime/session
records或Harness配置。

## Frozen verification

以下最终命令均在最后一次 production source 变更后运行：

| Command / inspection | Result |
| --- | --- |
| `bun run --filter @omnimind/contracts typecheck` | PASS；exit 0；仅两个既有 Effect JSON advisory |
| `bun run --filter @omnimind/contracts test -- src/native-host/protocol.test.ts src/product/state.test.ts --reporter=dot` | PASS；2 files / 7 tests |
| `bun run --filter @omnimind/native-host typecheck` | PASS |
| `bun run --filter @omnimind/native-host test -- src/piRuntime.test.ts src/responseFrame.test.ts --reporter=dot` | PASS；2 files / 19 tests |
| `bun run --filter @omnimind/service typecheck` | PASS |
| `bun run --filter @omnimind/service test -- src/product/ProductControlPlane.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/native-host/serviceProcess.integration.test.ts --reporter=dot` | PASS；4 files / 30 tests |
| `bun run --filter @omnimind/web typecheck` | PASS |
| `bun run --filter @omnimind/web test -- src/productReadModel.test.ts src/store/productStore.test.ts --reporter=dot` | PASS；2 files / 14 tests |
| `bun run --filter @omnimind/web test:browser -- src/components/ChatView.browser.tsx -t "Product Chat message\|authenticated Pi picker\|unknown Product Runs\|Product stop" --reporter=dot` | PASS；4 passed / 86 skipped |
| `bun run --filter @omnimind/desktop typecheck` | PASS |
| `bun run --filter @omnimind/desktop test -- src/process/nativeHostCredentialBroker.test.ts src/process/nativeHostProcess.integration.test.ts --reporter=dot` | PASS；2 files / 5 tests；含完整 Package-kills-Host联合场景 |
| `bun run --filter @omnimind/native-host build` | PASS；生产 `dist/index.mjs` refreshed |
| `bun run --filter @omnimind/service build` | PASS；Service/Web bundle refreshed |
| build后 `rg` 搜索两 probe 名称/固定文案于 `apps/service/dist` | PASS；零命中，probe未进入artifact |
| scoped `git diff --check --` over Host/Service/Product/Desktop/contracts/Web repair paths | PASS；无输出 |
| 同源 real-provider `liveJourneyProbe.ts` | PASS；Pi 0.81.1；3 dispatch；Chat new + continuation continued + Agent read tool；3/3 settled；attempt均1、automatic replay均0；持久层/Host输出无 credential命中 |
| `bun run --filter @omnimind/web test -- src/i18n/workbenchCopy.test.ts --reporter=dot` | PASS；1 file / 3 tests；Queue/执行边界 copy 在 English与zh-CN同时成套 |
| 受影响 browser回归：Product Chat health owner、Queue move/edit/cancel/re-entry、retained activity commit、route-backed切换 | PASS；2 files / 4 tests（87 skipped）；Chat p95 43.5ms、Agent p95 45.9ms、0 long task，均低于冻结80ms |

没有运行 repository-root full suite，也没有把 focused green或 real-provider harness外推为未执行的 packaged
Electron Window UI结果。

## Remaining concerns and unproven conditions

1. **packaged Electron完整 UI journey仍未执行。** 本轮联合测试使用 production Host dist + Desktop supervisor和
   真实 Product Store，但 Service是隔离 Bun probe，不宣称已点击 packaged Window UI。
2. **实际 Keychain leaf未用于本次 provider live。** live journey通过 established credential broker协议以内存
   方式注入授权 credential；它证明Host不会直接读取credential和broker调用链可用，不证明尚未实现的 onboarding
   writer或安装后Keychain写入体验。
3. **predecessor已有的非四项 P1边界未扩大。** credential onboarding writer、native Question journey、permission
   enforcement与旧 execution authority物理删除仍按原 Work/后续 Work处理；本 repair没有伪称关闭这些条件。
4. **implementation不是 independent review。** 四项 P1需由不同 actor在当前 dirty candidate和live result上重审。

## Dispatch identity

- actorId: `pi_native_execution_implementer_r2`
- receipt: `592701d059f54e12a6302cc00964fd34`
- predecessor receipt: `0a50a2c07602464ea005a857f0bcbdac`
- predecessor output: `./adopt-pi-native-execution.md`
- reviewed predecessor receipt: `4e7b6d9c65e44ca581622a80fad0e50f`
- output: `./adopt-pi-native-execution-repair.md`

未 stage、commit、push或merge。
