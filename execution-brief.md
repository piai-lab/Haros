# Execution brief

## 当前状态

当前唯一施工列车是 `codex/simplify-web-test-owners`：保持产品行为不变，把 Web/Browser 断言迁回 pure policy、controller、focused component 等真实 owner，并把 `ChatView.browser.tsx` 收窄为跨 owner 接线证明。没有并发 owner 冲突或其他待合并工作树。

Source candidate 已将 ChatView browser suite 从 174 项收窄到 134 项；顺序运行与固定 seed shuffled 运行均为 134/134，Web unit 4200/4200、typecheck、build 与 release legal metadata 均绿色。迁出的 owner gate 冷启动约 0.1–6 秒；保留的真正 ChatView integration 仍需约 40 秒冷 import，原因是 500KB 的生产 `ChatView.tsx`，本轮 stop-loss 明确不借测试治理拆整个产品组件。

## 下一动作

下一动作是推送精确 source SHA，从该 SHA clean clone 构建并以 fresh task-only profile 完成代表性的 Chat/Ask/Timeline packaged smoke。绿色后非 force 合并到 `main`、推送，并删除本地与远程任务分支；失败则只回滚对应 owner 迁移，不引入 timeout、串行 allowlist 或第二测试语义。

## Stop-loss

- 本文件只协调现在，不授予 source adoption、产品行为、发行或高风险动作。
- 稳定合同进入 `architecture/`；exact adoption进入 `source-adoptions.json`；固定反证进入 `research/`；claim状态进入active Campaign。
- 一项工作完成后删除其施工叙事，只保留仍真实存在的阻塞或下一动作。Git 历史承担历史，不建立第二总账。
