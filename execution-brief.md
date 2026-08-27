# Execution brief

## 当前状态

`codex/web-search-agent-native`正在把既有`@omnimind/om-web-access`收敛为Agent-native搜索链：增加有界`broad`路由和多query并发，统一结果/来源投影，并恢复adopted上游的文档流尾部summary。exact上游已重新收口到最新稳定`pi-web-access@0.25.0` / `08e347f4…`，新增的Provider、proxy、current-model search与fetch/extraction修复均翻译进现有P1–P6 seam。既有Provider协议、免费路径、Artifact惰性读取、自动摘要、显式review、Session/Run/call隔离与package fork边界保持不变；不新增Store、调度服务、控制面或迁移平台。

## 下一动作

按`路由/并发 → 唯一结果投影 → Curator/Settings → focused/full/live/isolated packaged proof`闭合当前候选；冻结前更新package-specific research与adoption patch inventory。Provider benchmark、正式签名/公证、Release 和 update feed 变更不在本轮范围内。

## Stop-loss

- 本文件只协调现在，不授予 source adoption、产品行为、发行或高风险动作。
- 稳定合同进入 `architecture/`；exact adoption进入 `source-adoptions.json`；固定反证进入 `research/`；claim状态进入active Campaign。
- 一项工作完成后删除其施工叙事，只保留仍真实存在的阻塞或下一动作。Git 历史承担历史，不建立第二总账。
