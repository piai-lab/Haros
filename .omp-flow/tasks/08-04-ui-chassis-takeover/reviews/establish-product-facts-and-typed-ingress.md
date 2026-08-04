---
type: "Implementation Review"
title: "Review: Establish Product facts and typed ingress"
work: "../work/establish-product-facts-and-typed-ingress.md"
handoff: "../handoffs/establish-product-facts-and-typed-ingress.md"
verdict: "PASS"
revision: "review-product-facts-20260804-r4"
actor_id: "product_facts_reviewer_final"
dispatch_receipt: "e6d73e6be8ce4a16bda59e8328e9608d"
predecessor_receipt: "8638fa665ae3437ca556d7a91b69f4db"
predecessor_output: "../handoffs/establish-product-facts-and-typed-ingress.md"
---

# Review: Establish Product facts and typed ingress

## Verdict

`PASS`。本次严格限定为 `handoff-product-facts-20260804-r4` 的 terminal race-only recheck；没有
unresolved finding。

Predecessor operation `8638fa665ae3437ca556d7a91b69f4db` 已解析为 completed executor
`product_facts_rework_round3`，输出为本 Review 链接的 handoff。该 handoff 状态为 `DONE`、revision 为
`handoff-product-facts-20260804-r4`，并反链同一 Work；implementation actor 与 reviewer actor 不同。

## Findings

无。

## Terminal race result

- marker staging 后，deferred put 尚未 resolve 时把 prompt 从 `repeat` 改为 `different` 再改回
  `repeat`，marker 已同步失效。resolve 后 Composer CAS 返回 `false`，没有产生 Composer write，当前 draft
  与失效 marker 保持为 `repeat` / `null`；Product Queue item 已发布一次。
- 无 mutation 的配对 control 保持 exact marker。resolve 后 Composer CAS 返回 `true`，以一次 Zustand write
  同时清除 draft 与 marker；Product Queue item 已发布一次。
- 实现检查确认 cleanup 只调用既有 Composer store 的 exact-transfer CAS；association 仍位于既有
  `ComposerThreadDraftState` 并复用 `ProductPutQueueItemInput`。本轮没有增加第二个 Queue store、Product
  Service schema、contracts public aggregate 或其他公共 Product state。
- 前序已关闭的 Product-ID donor isolation、closed/raw ingress 与 Composer marker focused suites 均未回归。

## Independent verification

| Command | Result |
| --- | --- |
| `bunx vitest run apps/web/src/productQueueReconciliation.test.ts -t 'preserves a draft mutated away and back\|clears draft and marker through CAS' --maxWorkers=1 --no-file-parallelism` | PASS，exit 0；1 file，2 passed / 8 skipped。 |
| 下方 independent deferred-put / success-control probe（从 `apps/web` 执行） | PASS，exit 0。race：CAS `false`、resolve 期间 0 Composer writes、draft=`repeat`、marker=`null`、published=1；control：CAS `true`、resolve 期间 1 Composer write、draft 不存在、published=1。 |
| `bunx vitest run packages/contracts/src/product/state.test.ts apps/service/src/product/ProductControlPlane.test.ts apps/web/src/store/productStore.test.ts apps/web/src/productQueueReconciliation.test.ts apps/web/src/productCutover.test.ts apps/web/src/wsNativeApi.test.ts --maxWorkers=1 --no-file-parallelism` | PASS，exit 0；6 files / 72 tests。 |
| `bunx vitest run apps/web/src/productQueueReconciliation.test.ts apps/web/src/composerDraftStore.test.ts apps/web/src/composerDraftStore.persistence.test.ts --maxWorkers=1 --no-file-parallelism` | PASS，exit 0；3 files / 65 tests。 |
| `bun run --cwd apps/web typecheck` | PASS，exit 0。 |
| `git diff --check -- apps/web/src/composerDraftActions.ts apps/web/src/composerDraftDomain.ts apps/web/src/productQueueReconciliation.ts apps/web/src/productQueueReconciliation.test.ts apps/web/src/components/ChatView.tsx .omp-flow/tasks/08-04-ui-chassis-takeover/handoffs/establish-product-facts-and-typed-ingress.md` | PASS，exit 0。 |

Exact independent probe：

```bash
bun -e 'import {ThreadId as T} from "@omnimind/contracts";import{useComposerDraftStore as S}from"./src/composerDraftStore.ts";import{resetComposerDraftStore as R}from"./src/composerDraftStoreTestFixtures.ts";import{confirmProductQueueOwnershipBeforeDraftClear as C}from"./src/productQueueReconciliation.ts";const id=T.makeUnsafe("c"),s={engineId:"e",modelId:null,thinking:null,permissionPolicy:"approval-required",enforcement:"unverified",executionTarget:null,packageGeneration:"g"},a={protocolVersion:1,conversationId:"c",itemId:"q",text:"repeat",requestedSelection:s,resources:[],expectedRevision:null},i={id:"q",conversationId:"c",text:"repeat",requestedSelection:s,resources:[],position:0,revision:1,createdAt:"x",updatedAt:"x"};async function run(mutate){R();let resolvePut;const pending=new Promise(r=>resolvePut=r);let published=0;let casResult=null;S.getState().setPrompt(id,"repeat");const confirmation=C({attempted:a,stageTransferMarker:v=>S.getState().stageProductQueueTransfer(id,v),putQueueItem:()=>pending,getConversationSnapshot:async()=>{throw new Error("unexpected snapshot")},publishQueueItem:()=>{published+=1},publishSnapshot:()=>{},clearDraftIfTransferMatches:v=>{casResult=S.getState().clearComposerContentForProductQueueTransfer(id,v);return casResult}});if(mutate){S.getState().setPrompt(id,"different");S.getState().setPrompt(id,"repeat")}const before=S.getState().draftsByThreadId[id];let writesOnResolve=0;const unsubscribe=S.subscribe(()=>{writesOnResolve+=1});resolvePut(i);await confirmation;unsubscribe();const after=S.getState().draftsByThreadId[id];return{beforeResolve:{prompt:before?.prompt??null,marker:before?.productQueueTransfer??null},afterResolve:{prompt:after?.prompt??null,marker:after?.productQueueTransfer??null,draftExists:after!==undefined},casResult,published,writesOnResolve}}console.log(JSON.stringify({race:await run(true),control:await run(false)}))'
```

Output：

```json
{"race":{"beforeResolve":{"prompt":"repeat","marker":null},"afterResolve":{"prompt":"repeat","marker":null,"draftExists":true},"casResult":false,"published":1,"writesOnResolve":0},"control":{"beforeResolve":{"prompt":"repeat","marker":{"protocolVersion":1,"conversationId":"c","itemId":"q","text":"repeat","requestedSelection":{"engineId":"e","modelId":null,"thinking":null,"permissionPolicy":"approval-required","enforcement":"unverified","executionTarget":null,"packageGeneration":"g"},"resources":[],"expectedRevision":null}},"afterResolve":{"prompt":null,"marker":null,"draftExists":false},"casResult":true,"published":1,"writesOnResolve":1}}
```

## Boundary

本 Review 不判断 Host、Pi、T3、完整 T2/T4、浏览器 checkpoint、Campaign claim 或 overall completion。
Reviewer 未修改 implementation、architecture、Campaign、runtime/session records 或 Evidence ledger；未应用
任何 fix，唯一写入是本 linked Review Concept。

## Dispatch identity

- actorId: `product_facts_reviewer_final`
- receipt: `e6d73e6be8ce4a16bda59e8328e9608d`
- predecessor receipt: `8638fa665ae3437ca556d7a91b69f4db`
- predecessor output: `../handoffs/establish-product-facts-and-typed-ingress.md`
