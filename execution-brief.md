# Execution brief

## 当前目标

private release workspace 的 OmniMind 产品版本已统一为 `0.1.0-alpha.0`：root、Desktop、Server、Web 与 Contracts 现在共享既有 release version owner，Contracts 不再携带继承自 Synara 的 `0.7.0` 产品身份。未建立独立 Contracts semver、版本映射、兼容声明或 release migration；`packages/shared` 不属于当前 release package set，保持原有 package 身份。

安装版 product bytes 现准确绑定 pushed product `8dfdd7310f984956de8e3b513f497c8a30700761`。同 SHA arm64 DMG SHA-256 为 `70fff3aeb24809521a3738eb3a9ac4df6fbf7882af2320d205d27e9453b77c43`，DMG staged `app.asar` 与安装版 `app.asar` 均为 `7d46bf8644099993c5d06ce4cc9b32c343ae10148935956cee57b706bbd084d2`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 docs-only 状态提交不冒充 shipped bytes。

一个 fresh、任务专用 packaged profile 先由进程参数证明 Electron `userData`、OmniMind home、Codex/Claude private home 与 SQLite 全部隔离，再从本地 Codex fixture 建立 1 个会话、80 input、8 output 的 ready last-good。停机后只向任务 SQLite 植入旧标量 cursor；同 profile 重开准确收敛为 `paused`，last-good 聚合不变，现有“继续”动作恢复 canonical 重扫且聚合不重不漏。停机 SQLite 证明两 Provider 均 `ready`、cursor `NULL`、discovery complete、restart 归零、detail 清空；同 profile 冷重开仍为 ready 与 80/8，最终全部 OmniMind 进程归零。旧 App 与任务 profile 已移入 Trash，可恢复；真实用户 profile、Provider archive 与凭据均未读取或改写。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

当前已退休责任没有产品阻塞。Browser Electron E2E fixture 的 exact-turn credential seam 与 release provenance 的全包产品版本一致性均已闭合。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

在当前 pushed `main` 上以隔离、交错的真实 A/B 审判后台 engine catalog warming；只有至少两个真实 Engine 出现明确、可重复的用户收益才保留，否则完整退休后台生命周期。SQLite migrations 1–100 继续 `DEFER`。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
