# Execution brief

## 当前目标

Settings stable identity / search / deep-link owner cut 已形成 `packaged-candidate / not-released`。实现提交为任务分支 `codex/settings-stable-identity` 的 `a6e4503166`，本次安装版从已推送任务 SHA `aa8ac31bff61d9592d02345cc80b8e09e6595ec3` 干净构建；section identity、row/panel search metadata、URL target 与真实 DOM anchor 已与可见文案解耦，Sidebar/Search只消费owner投影。当前尚未合并、发行或修改update feed。

## 当前协调与下一动作

- focused Settings合同、受影响Browser、Web 326-file unit suite、root 7-package typecheck、root lint与Web production build已通过；changed-file lint为0 warning。全Browser中本任务触达的Settings文件全部通过，剩余确定性失败只出现在本任务未触达的Theme/Timeline基线；两个并发时失败的Composer/ChatView用例单文件复跑通过。
- arm64 DMG SHA-256为 `882188a27a764c854b590821aa9bce9b9c32d99457a91865f77ca29ea743d596`，构建产物与安装版 `app.asar` SHA-256均为 `8b129cb73202b17f88e8639b52df43d142035e1608a3b7eb4005a09fcb3c694f`。任务专用HOME、userData与Provider private home隔离已从Main、Renderer、Helper与bundled Server参数复证。
- 安装版已通过简中/英文搜索同一稳定target、跨locale URL、刷新、Enter/Escape与焦点、720px窄窗、panel-only无假target、既有Theme/Engine/Provider updates/Environment/Prompt target，以及关闭重开后直接链接定位；测试结束后候选进程为零。
- 下一动作：等待维护者决定是否合并；不新增research总账，不自动合并main、创建Release或修改update feed。

## Stop-loss

- 不把上述portfolio合成全仓重写，不因文件大或行数多机械拆分成熟生命周期owner。
- 不新增Settings/Command/Provider god registry、通用form/JSON DSL、第二store/writer/cache、watcher、daemon、Session Registry、runtime i18n平台或证据ledger。
- 同一事实若仍要求多个consumer手写清单、顺序、palette、schema、capability或fallback，必须继续`SIMPLIFY`；不能用`keep in sync`注释、同步清单或只加parity test供养明显可删除的第二真相。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定证据进`research/`，production adoption进根`README.md`，Campaign claim状态进`missions/independent-omnimind-v1.md`。关闭关注点时本brief应缩短或切换pointer，不再追加永久历史。
