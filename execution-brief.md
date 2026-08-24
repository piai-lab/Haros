# Execution brief

## 当前目标

Provider identity / capability projection已在独立任务分支形成`packaged-not-released`候选：重复Provider identity/schema与静态capability名单已退出，registered adapter、model、Host closure和current runtime evidence经Server窄投影共同决定steering与三种runtime mode；Thread已持久选择与effective availability保持分离。

## 当前协调与下一动作

- Settings四owner候选已通过合并终审、进入并推送`main@95ac1f1ec9`，并从该main SHA完成隔离安装版复核；其任务分支与临时资源已清理。
- 当前D任务分支为`codex/provider-capability-projection@ca69d86ee6`，local/remote一致并基于上述干净main。focused、完整unit、root typecheck、lint、production build及`git diff --check`通过；Browser剩余5项已在untouched main基线复现，不是D引入。
- exact pushed implementation SHA生成arm64 DMG SHA-256 `b402bdf084cccb5ddca976b984bbccbef4be918bc155def47bbaaf118729c37a`，DMG内`app.asar` SHA-256 `05010d7f8e8493d92b7c1b447717b2492425924132ccfa6b57e0bc2ad2bd56a4`。任务profile复证Main、Renderer、Helper和bundled Server隔离；真实MiMo OpenAI-compatible链完成首轮与continuation，DeepSeek内置service完成discovery与首轮；中文Composer及英文Composer/Automation均按loaded truth显示三种mode，App重开后模型服务与任务状态恢复。凭据只落任务profile的`0600` credential owner，日志和artifact零命中。
- `/Applications/OmniMind.app`在本轮安装后被并行工作替换；替换前的本任务安装实例及随后从同一DMG解出的临时packaged App共同提供上述证据，当前系统安装版不冒充D候选。下一动作是集成最新`origin/main`、重跑受影响门、合并并从精确main merge SHA做最终隔离复核；未完成前不写成released或当前安装版已采用。

## Stop-loss

- 不新增Provider god registry、第二health/cache/stream、runtime-mode controller、动态插件系统或capability持久副本。
- 不用Provider identity或静态`available`推断ready，不让Web/Shared继续拥有runtime capability truth，也不把identity、adapter结构能力、current health、model能力和presentation揉成一个对象。
- 不夹带Theme、Web Access Provider体系、i18n物理切片或Settings owner再重构；真实Provider-specific composition、health、model、credential和asset责任继续留在各自owner。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定来源证据按`research/README.md`路由，不新增handoff、ledger或研究总账。
