# Execution brief

## 当前目标

E（i18n 物理 domain slices）正在`codex/i18n-domain-slices`收口。唯一逻辑 catalog、locale runtime与公共入口保持不变；现有`3,490 × 2`个message的key、value与placeholder已完成零差异迁移。当前是`source-candidate / packaged-pending`，不是Release或当前安装版已采用。

## 当前协调与下一动作

- 实现提交`2b6932218e`把根catalog收为21个稳定产品domain slice；合同提交`636d5476d0`锁定双语精确key与跨domain duplicate拒绝；固定源码证据仍由[`research/omnimind-i18n-system-review.md`](research/omnimind-i18n-system-review.md)拥有。
- 迁移前后canonical SHA-256同为`ff18c412a0df82a841dfa80c7d98b1576b6c158363de62202633b73e99774a41`。Web unit 330 files / 4,160 tests、root typecheck 7/7、lint（0 errors）与Web production build通过；focused Browser 9/9通过。
- 完整stable Browser的7项失败均已归因于E外基线：5项是既有ChatView Tool Activity折叠时序，2项Terminal暖色断言已在untouched E基座同值复现。E introduced regression当前为0。
- 下一动作：推送任务分支，集成当时最新`origin/main`及已进入main的并行文案，重跑受影响门；面向合并终审通过后合入main，并从精确pushed main merge SHA完成任务profile隔离的packaged locale smoke。

## Stop-loss

- 不新增runtime locale loader、lazy locale chunk、codegen、翻译平台、第二catalog、第三语言或consumer-side domain map。
- 不改文案bytes、key taxonomy、locale preference/fallback、Thinking Hints、`PRODUCT_COPY_SOURCES`、Settings、Theme、Web Access、Provider或Composer行为。
- 当前状态只在本文件维护；稳定合同进`architecture/`，固定source证据按`research/README.md`路由，不新增handoff、ledger或研究总账。
