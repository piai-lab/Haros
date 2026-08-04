---
type: "Implementation Handoff"
title: "Adopt Pi native execution inside the established Host"
work: "../work/adopt-pi-native-execution.md"
status: "CANDIDATE"
revision: "handoff-adopt-pi-native-execution-20260805-r1"
actor_id: "pi_native_execution_implementer"
dispatch_receipt: "0a50a2c07602464ea005a857f0bcbdac"
predecessor_receipt: "136dfc1e5bd24f268499a18508e6ce01"
predecessor: "../reviews/take-over-agent-chat-workbench-final.md"
---

# Adopt Pi native execution inside the established Host

## Outcome

本轮在 T2 的同一个 Native Host executable、endpoint、认证、Desktop supervisor、健康和关闭 seam 内加入了
Pi `0.81.1` runtime path，没有创建第二个 Host 或替代 transport。Host 现在拥有 runtime-backed catalog、
Provider/Model/Thinking 解析、Pi-native Session、可查询 acceptance、typed facts、control、reconcile、Package
generation 和每 Run credential consumption；Product Service 只接收 resolved selection、opaque operation/lineage
引用和有界可见事实，React 继续只消费 Product read model。

候选同时把 Product admission/outbox 收紧为 Queue-first、零自动重放：`delivery_unknown` 或
`outcome_unknown` 会阻止新 Run；缺失 Model 不会在事务外留下半成品；事实应用失败会从同一 cursor 重投而不
提前确认。Product Chat 的 Pi picker 由 Host catalog 驱动，默认选第一个 authenticated model；没有可用模型、
已有 active/unknown Run 时都只保留 Queue。首条 Queue item 由明确的 `Run next` 用户动作提交，stop 和 runtime
activity 只呈现 typed/localized truth，不显示 Host 原始诊断。

这是可供独立攻击的 replacement-path 候选，不是 T4 完成声明。真实 live provider、packaged Desktop 完整
Chat/Agent journey、Package 触发的 Host 进程退出/重启、真实 Product Store 联合连续性，以及凭据 onboarding
writer 尚未证明；旧 Service execution authority 也仍按 Work 要求物理存在，必须由下一 Work 决定删除。

## Exact runtime and authority boundary

- `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`,
  `@earendil-works/pi-coding-agent` 在 `apps/native-host/package.json` 精确固定为 `0.81.1`；新增生产 Pi import
  仅位于 `apps/native-host`。`bun.lock` 对应更新。
- Service 中原有的 Pi dependencies、`PiAdapter`、Provider registry 和 donor execution modules 是本 Work 明确
  延后的 physical debt；本轮没有移动、包装或删除它们，也不把 dependency scan 扩张为“仓库只有 Host 有 Pi”。
- Desktop Main 只启动既有 Host supervisor并建立一个独立、认证的本地 credential-broker socket；Service、
  preload、renderer 都拿不到 broker authentication 或 secret。
- Product durable writer 仍只有 `ProductControlPlane`。Web 的 `productStore` 仍只是 typed live projection；
  `productReadModel.ts` 是无缓存、无持久化、无 writer 的 presenter。
- folder-backed workspace 默认以 Pi `SettingsManager(..., { projectTrusted: false })` 打开；未经显式信任的
  `cwd/.pi/extensions` 不执行。显式 workspace trust activation 不在本 Work 内。

## Acceptance and Session truth

- Host 在 `session.prompt()` 周围观察 native user `message_end`，随后用 `SessionManager.open(sessionFile)` 重新读取
  entries；只有能在 reopen 后找到本 Run 新 user entry 才返回 `execution.accepted`。
- accepted receipt 带 `sessionId`, native `entryId` 和固定 query kind `session-manager-reopen`；operation reference
  为 `pi-op:<sessionId>:<entryId>`。本地 UUID、returned `void` 或仅看到 callback 均不能产生 accepted。
- prompt 先 reject 但 durable entry 已写入、callback 超时但 durable entry 已写入，都仍按 native truth accepted；
  timeout 时先 abort 再 reopen，只有最终确认无 entry 才 rejected 并删除 pending facts；仍无法确认则
  `execution.indeterminate`。
- compatible lineage 继续原 Session；missing/divergent lineage 创建新 Session并以 typed
  `continued/new/missing/divergent` 可见化，不复制 native transcript到 Product。
- Host restart 从 native Session和持久化、已脱敏 snapshot重建结果；完整结果不依赖 bounded fact retention。
  accepted operation无法在 native truth中确定终局时返回 outcome unknown，Service不会 re-execute。

## Catalog, Package and credential decisions

- catalog 由 `ModelRuntime` 产生 provider-qualified models、reasoning/thinking capability及每 provider auth
  availability；authenticated models在 128 项有界 cutoff 前稳定排序。生产 Keychain availability轮询缓存 5 秒，
  显式 catalog refresh绕过缓存。
- generation 是 Pi runtime version加 `agentDir/extensions` 中 regular file path/content bytes 的稳定 digest；
  empty generation为 `pi-runtime-0.81.1-package-empty`。选择在 dispatch前及 Session准备后各校验一次。
- `agentDir/extensions` 根或其子项出现 symlink时，Host在 ResourceLoader/Session创建前返回
  `PI_PACKAGE_INPUT_UNSUPPORTED`，不加载 target；因此 generation claim只覆盖这个 Work 的 regular-file
  Extension slice，不覆盖 marketplace、workspace packages或全部 Pi resources。
- representative regular-file headless Extension在 Host中执行并持有 private state；一个 import-time throw被
  Pi ResourceLoader记为 `package.failed`，原始异常未进入 Product facts。该测试不是 Host process crash proof。
- Desktop Keychain lookup只用 macOS `security find-generic-password`：catalog availability不读取 secret，选定 Run
  才使用 `-w` 一次性取值。provider id有严格字符边界；secret不进 argv、普通环境、Product request或 renderer。
- selected credential只注入该 Run 的内存 `InMemoryCredentialStore`。assistant/thinking使用精确值加通用模式的
  streaming redactor，覆盖任意 chunk 边界及 EOF partial-prefix fail-closed；settlement时持久化的 Product-safe
  snapshot再次按 exact value脱敏后才清除 Run redactor。
- 本轮只有 read-only Keychain broker，没有 Desktop-owned upsert/delete onboarding writer。正式用户目前没有
  产品内方式创建/轮换凭据，这是 production-candidate blocker，不能用环境变量 fallback掩盖。

## Typed facts, controls and Product behavior

| Area | Candidate behavior | Proof boundary |
| --- | --- | --- |
| stream | `assistant.delta`, `thinking.delta` 按字符上限拆分且不切 surrogate；response frame再按 encoded bytes分页 | faux provider + worst-case Unicode tests |
| activity | session lineage、package loaded/failed、tool start/settle、usage、settlement均为 versioned typed fact | Host tests + Product mapping + en/zh browser |
| Question | protocol和Product projection有 `question.requested` variant | 本轮没有找到/证明 Pi 0.81.1 native Question event，不能宣称真实 Question journey |
| retention | 内存保留 2048 facts；overflow期间append，按256条周期原子 compact，disk窗口2048..2303；high-water单调 | overflow/restart tests |
| recovery | restarted/compacted/cursor-ahead走 native snapshot/reconcile；Service会排空全部分页至 terminal | Host snapshot test + boundary multi-page test |
| fact delivery | Product apply抛错时cursor不前移，同一 facts从cursor 0重投；Product transaction保持幂等 | boundary redelivery test |
| controls | Pi `steer`, `followUp`, `abort`映射为 applied；distinct cancel为 unsupported；unknown/too-late/unsupported/applied均 typed | Host implementation + Product control codes；UI仅对 stop/steer路径有 browser proof |
| replay | Product outbox schema固定 `automatic_replay_count = 0`；unknown receipt阻止后续 admission | Product fault tests |
| permission | selection保留 requested policy，resolved enforcement固定为 `unverified` | 没有 deny-side-effect证据，不宣称 host-enforced |

Product UI没有新增一个明确的 follow-up button；`follow-up`目前只是 protocol/Host capability seam。Queue 的
`Run next` 是显式新 Run admission，`Move next` 只重排且不 dispatch。不能把当前 browser proof写成四种 control
都有完整 UI journey。

## Changed paths

### Native Host and protocol

- `apps/native-host/package.json`, `bun.lock`
- `apps/native-host/src/index.ts`
- `apps/native-host/src/credentialBroker.ts`
- `apps/native-host/src/piRuntime.ts`, `apps/native-host/src/piRuntime.test.ts`
- `apps/native-host/src/responseFrame.ts`, `apps/native-host/src/responseFrame.test.ts`
- `packages/contracts/src/native-host/protocol.ts`
- `packages/contracts/src/product/rpc.ts`
- `packages/contracts/src/product/state.ts`

### Desktop, Service and Product

- `apps/desktop/src/main.ts`
- `apps/desktop/src/process/nativeHostCredentialBroker.ts`
- `apps/desktop/src/process/nativeHostCredentialBroker.test.ts`
- `apps/service/src/native-host/client.ts`, `apps/service/src/native-host/client.integration.test.ts`
- `apps/service/src/native-host/executionBoundary.ts`, `apps/service/src/native-host/executionBoundary.test.ts`
- `apps/service/src/native-host/serviceProcess.integration.test.ts`
- `apps/service/src/product/ProductControlPlane.ts`, `apps/service/src/product/ProductControlPlane.test.ts`
- `apps/service/src/product/health/nativeHostHealthMonitor.ts`
- `apps/service/src/serverLayers.ts`, `apps/service/src/wsRpc.ts`

### Product presentation

- `apps/web/src/wsNativeApi.ts`
- `apps/web/src/store/productStore.ts`, `apps/web/src/store/productStore.test.ts`
- `apps/web/src/productReadModel.ts`, `apps/web/src/productReadModel.test.ts`
- `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/ChatView.browser.tsx`
- `apps/web/src/components/chat/ComposerQueuedHeader.tsx`
- `apps/web/src/components/chat/QueuedComposerActions.tsx`
- `apps/web/src/i18n/workbenchCopy.ts`

`apps/web/src/wsNativeApi.ts` 是 Main 明确授权的 scope exception，用于把 typed Product catalog/control RPC接到
现有 Web transport；`productReadModel*` 和 `workbenchCopy.ts` 是现有 Product presentation/locale seam 的最小
同行修改。没有修改 runtime/session records、Harness配置、architecture、Campaign状态或旧 execution modules。

## Old-anchor replacement rows for the next Work

| Old physical anchor | Replacement candidate now present | Normal/failure/recovery evidence | Deletion decision |
| --- | --- | --- | --- |
| Service PiAdapter/static selection | Host runtime catalog + per-Run ModelRuntime | authenticated cutoff/cache tests；typed unavailable rejection | old modules仍存在；需 independent review + live journey后才能删除 |
| donor accepted execution route | Product admission → established Host acceptance | native reopen acceptance races；accepted/rejected/indeterminate separation | old route仍存在；本轮未证明它在 packaged app完全 unreachable |
| donor accepted queue/retry | Product Queue + outbox | active/unknown admission block；automatic replay固定0 | old accepted queue/migrations由下一 Work物理删除 |
| raw provider/runtime reducer | Host typed facts → Product projection | bounded/redacted facts、pagination、multi-page reconcile、redelivery | old reducer仍存在；Question/live provider coverage不足 |
| provider credential/config path | Desktop Keychain broker → one Run | authenticated broker、availability/selected credential tests、exact redactor | onboarding writer缺失，不能删除所有旧 credential UX |
| React provider/runtime state | Product read model/catalog/activity/control | Queue-first/default picker/unknown/stop en/zh browser cases | donor Agent surface仍保留；仅 Product Chat replacement candidate |

## Frozen verification

以下命令均在当前 frozen source上运行；没有 repository-root全量 test，也不把 focused green外推为未覆盖结论。

| Command | Result |
| --- | --- |
| `bun run typecheck` in `apps/native-host` | PASS |
| `bun test apps/native-host/src/piRuntime.test.ts apps/native-host/src/responseFrame.test.ts` | PASS，17/17；含 acceptance races、Session lineage/recovery、retention、credential redaction、regular Extension、untrusted workspace、symlink rejection、Unicode framing |
| `bun run typecheck` in `packages/contracts` | PASS，exit 0；仅两个既有 Effect JSON advisory messages |
| `bun run typecheck` in `apps/service` | PASS |
| `bun run typecheck` in `apps/web` | PASS |
| `bun run typecheck` in `apps/desktop` | PASS |
| `bun run build` in `apps/native-host`, then `bun run build` in `apps/service` | PASS；先刷新 Host `dist/index.mjs`，再刷新包含 Web client的 Service dist |
| `bun run test -- src/product/ProductControlPlane.test.ts src/native-host/executionBoundary.test.ts src/native-host/client.integration.test.ts src/native-host/serviceProcess.integration.test.ts` in `apps/service` | PASS，4 files / 24 tests；dist process integration在上述build后通过 |
| `bun run test -- src/productReadModel.test.ts src/store/productStore.test.ts` in `apps/web` | PASS，2 files / 14 tests |
| `bun run test:browser -- src/components/ChatView.browser.tsx -t "Product Chat message\|authenticated Pi picker\|unknown Product Runs\|Product stop"` in `apps/web` | PASS，4 passed / 86 skipped；Queue编辑/取消/删除/重排、picker默认、显式Run next、unknown Queue-only、stop及en/zh typed activity |
| `bun run test -- src/process/nativeHostCredentialBroker.test.ts src/process/nativeHostProcess.integration.test.ts` in `apps/desktop` | PASS，2 files / 4 tests；证明broker和既有Host supervisor重启/circuit，后者的Product snapshot只是静态fixture |
| scoped `git diff --check --` over all changed implementation paths | PASS，无输出 |

曾尝试把真实 `ProductControlPlane` 直接import到 Desktop supervisor integration以形成单一联合测试；Desktop
composite TypeScript project以 `TS6307` 正确拒绝跨包源码import。该尝试已完整撤回，最终 Desktop typecheck恢复
PASS；没有为测试增加跨层依赖或新 seam。因此“spawned Host crash后真实Product SQLite/Queue仍在且零replay”仍是
未证明项，而不是绿色结果。

## Unproven done conditions and blockers

1. **没有 live provider evidence。** 未读取/使用本机秘密清单，未向真实 provider发请求；因此没有真实
   Desktop→Service→Host→Pi Chat与folder-backed Agent结果、live credential canary或provider-specific fault数据。
2. **没有真实 packaged Desktop完整 journey。** 本轮只跑 source/unit/browser和production dist child tests；没有
   packaged Electron中从Product UI创建、排队、显式Run next、stream、settle、restart的端到端证据。
3. **Package crash proof不完整。** 已证明Extension import throw由ResourceLoader收敛且Product-safe facts不含异常，
   也证明symlink/workspace code fail-closed；没有让Package实际终止Host进程并观察Desktop supervisor重启、Window与
   真实Product Store/Queue存活。
4. **真实Host crash + Product Store联合连续性未证明。** supervisor process test会真实SIGKILL/restart Host，但
   Product snapshot是静态对象；Product tests证明SQLite重开与零replay，但不是同一进程故障场景。
5. **credential onboarding writer缺失。** Desktop只读Keychain。正式设置流程需要Desktop-owned typed
   upsert/delete，renderer只能一次提交新secret且不能读回，设置页只显示metadata，并触发catalog refresh；这必须
   在后续Work实现和审计。
6. **完整 fault matrix未完成。** focused tests覆盖pre-send/accepted/unknown、facts redelivery、restart reconcile、
   process restart；没有真实provider side effect during-stream/after-effect、真实Service SIGKILL和全矩阵的测量报告。
7. **Question journey未证明。** contract/Product projection已就位，但无Pi 0.81.1 native Question事件证据。
8. **permission enforcement未证明。** 当前truth为`unverified`；没有deny-side-effect证据。
9. **production candidate仍被旧authority阻塞。** Service Pi dependencies、PiAdapter/registry、old accepted queue、
   migrations/raw reducer等按本 Work out-of-scope仍在物理图中。独立review和后续authority-retirement Work之前，
   不得宣称T4、生产候选、Campaign或OmniMind V1完成。

## Dispatch identity

- actorId: `pi_native_execution_implementer`
- receipt: `0a50a2c07602464ea005a857f0bcbdac`
- predecessor receipt: `136dfc1e5bd24f268499a18508e6ce01`
- predecessor output: `../reviews/take-over-agent-chat-workbench-final.md`
- output: `../handoffs/adopt-pi-native-execution.md`

本 handoff 是 implementer候选记录，不是独立review。未 stage、commit、push或merge。
