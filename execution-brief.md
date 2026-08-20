# Execution brief

## 当前目标

第七个独立 `RETIRE` 已形成 source candidate：Usage History discovery cursor 现在只接受 `null` 或 canonical version 1 JSON DFS stack，首版内部标量 path reader、跳过逻辑与兼容注释已完整删除。原始 Provider archive、SQLite schema、worker protocol、parser/计数模型、event/file identity、Refresh/Reindex 与 Web UI 均未改变；非 canonical cursor 复用既有 worker failure、provider-scoped `paused`、last-good 与 Resume 恢复，不新增 migration、cleanup、error code、fallback 或第二 cursor owner。focused、完整 Server suite、typecheck、build 与构建 worker stdin probe 已通过，packaged 安装与隔离旧 cursor journey 是当前唯一未闭合动作。

安装版 product bytes 现准确绑定 pushed product `3c05e3ce3521cfd82793fa192048614fc2b581ee`。同 SHA arm64 DMG SHA-256 为 `beeca6ef5583e99465e3567364348450fc5f4b9d828e56eff76dbaa17e852f71`，DMG staged `app.asar` 与安装版 `app.asar` 均为 `d8492eb0d40a394857bc8bf1563afa739ccdc9712c759741b9e8ad6c95a74d07`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 source-only 状态提交不冒充 shipped bytes。

一个 fresh、任务专用 packaged profile 先由进程参数证明 Electron `userData`、OmniMind home、Provider private home 与 SQLite 全部隔离，再以环境变量引用而非明文配置发现精确 MiMo `mimo-v2.5-pro` 与 DeepSeek `deepseek-v4-pro` catalog。两者都经真实 Agent→Pi→Host tool 链创建 `mode=standalone`、`schedule={type:"daily",timeOfDay:"09:30",timezone:"Asia/Shanghai"}` 的定义；各自 Pi transcript 中 tool arguments 与 nested schedule 都保持 object。两条同线程 continuation 均完成 view→精确 revision→delete/archive。停机 SQLite 证明两个定义 disabled、archived、revision 1、iteration count 0，Automation run count 为 0；同 profile 重开后两个 thread 仍 completed、catalog 仍 ready、active definition 与 run 都为 0，再次正常退出后全部 OmniMind 进程归零。

route defect 有两个同一导航责任内的最早错误点：Sidebar 在当前 segment 的 remembered route 失效时只回退 Server threads，忽略既有 recent-view MRU 中仍有效的本地 draft；Agent `/` landing 又把未 promotion 的 Terminal-first draft 排除在可恢复集合之外。修复复用既有 MRU、draft persistence、project boundary 与 route resolver，没有新增 route store、snapshot retry、reload、兼容 alias、schema 或模型状态。最终安装包在隔离 profile 中完成 Terminal draft→Chat→Agent，并准确回到原 Terminal；持久化的 current route 经 LevelDB 精确读取确认后，同 profile 冷启动也直接恢复该 Terminal draft。正常退出后全部 OmniMind 进程归零。

README 已退休当前/历次安装产物、历史 journey 与施工状态叙事，只保留稳定产品身份、战略不变量、production adoption 和权威路由。当前目标、安装产物、真实阻塞与下一动作重新由本文件单独拥有；该文档切片不进入 shipped bytes，安装版仍准确绑定 `3c05e3ce3521cfd82793fa192048614fc2b581ee`。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

前六个已退休责任没有产品阻塞。两项既有反证继续隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

提交并推送当前单一 source concern；随后只从该 exact pushed SHA 重建、安装 macOS ad-hoc candidate，并以 fresh、完全隔离的任务 profile 证明 canonical indexing、旧标量 cursor 的 paused/last-good 边界、Resume 后聚合守恒、同 profile 重开与进程清理。闭合后重新读取当时的 `main` 并全局重排，不默认继续寻找删除候选。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
