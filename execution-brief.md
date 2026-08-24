# Execution brief

## 当前目标

Settings 状态 owner 收口已形成 `packaged-not-released` candidate：万能 `AppSettings` 与浏览器/Server 双写已退休，事实分别收回 Web local preferences、ServerSettings、ProviderCredentials 与 Desktop native runtime。旧 `omnimind:app-settings:v1` 采用 first-public clean break：生产路径零读取、零迁移、零改写、零删除，安装版 canary 证明原字节在 mutation、partial reset 与 App reopen 后保持不变。

## 当前协调与下一动作

- 实现与authority已推送到 `codex/settings-owner-boundary@bf0cd9e24b`；`SYNARA-INTAKE.md`的维护者修改以独立提交 `652ca27a9a` 纳入同一候选，没有夹入Settings实现提交。
- Source gates：Web 328 files / 4145 tests、Server Settings 27/27、Contracts Settings 7/7、root 7-package typecheck、lint（0 error）与production build通过；完整作者套件 565/565。完整Browser门唯一失败为未触达的Theme暖色期望基线，ChatView性能比例与Web Access Gemini偶发并发失败均已用精确单测复跑归因为非introduced regression。
- 从精确pushed implementation SHA的clean clone构建arm64 DMG：DMG SHA-256 `d2c80644b15a2af4cc6471faa1c7bb14b59d8fafb1c94ff30b7ca01e7d8518a3`，安装版与DMG内 `app.asar` SHA-256 `35ef6b5180646b8164d822b6c93b4609fba0413bb7c490afa1e1df267f330fb5`。
- 隔离packaged journey已通过：MiMo new Thread/first turn/continuation；DeepSeek discovery/new Thread/first turn/startup model projection；Provider Save partial、跨subscriber credential projection、Restore defaults partial、local durable-write failure、简中/英文、900px窄窗键盘、AppSnap runtime与App reopen。Main、Renderer、Helper与bundled Server均复证只使用任务profile；未读取真实用户profile。
- 当前没有新的获授权代码修改；下一动作是维护者裁决是否将该candidate合并到最新`main`。候选已安装供本机复核，但不是Release、公开发行或update feed adoption。

## Stop-loss

- 不把上述portfolio合成全仓重写，不因文件大或行数多机械拆分成熟生命周期owner。
- 不新增Settings/Command/Provider god registry、通用form/JSON DSL、第二store/writer/cache、watcher、daemon、Session Registry、runtime i18n平台或证据ledger。
- 同一事实若仍要求多个consumer手写清单、顺序、palette、schema、capability或fallback，必须继续`SIMPLIFY`；不能用`keep in sync`注释、同步清单或只加parity test供养明显可删除的第二真相。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定证据进`research/`，production adoption进根`README.md`，Campaign claim状态进`missions/independent-omnimind-v1.md`。关闭关注点时本brief应缩短或切换pointer，不再追加永久历史。
