# Execution brief

## 当前目标

后台 Engine catalog warming 已退休。exact packaged A（`c22ae327cda056586d3e3acc364195995cfc607c`，保留 warming）与 B（`bfa8c8f84c05fff3c75216212591cc69d4e3b173`，退休 warming）在同一隔离 profile 中用真实 Claude/MiMo 与 OmniMind/DeepSeek 交错完成 40 次冷启动测量。菜单停留 1 秒时，Claude 的 click-to-catalog-ready 中位数由 B 的 939ms 降到 A 的 65ms，并在 5/5 次消除持续至少 300ms 的 loading；但 OmniMind 只由 378ms 降到 64ms，改善 314ms，且 A/B 均未出现持续 loading。立即选择时 Claude 只改善 78ms、双方均 5/5 出现 loading，OmniMind 只改善 305ms、双方均无持续 loading。A 的 20/20 Engine 组都产生未选择的 OpenCode catalog 请求，B 为 0/20。锁定的 `KEEP` 门要求至少两个真实 Engine 分别获胜，因此只赢 Claude 不足以购买整套后台生命周期；打开 Engine 菜单与历史 model binding 不再 fan-out 非当前 Engine，新 Thread 当前 Engine、用户实际选择的 exact Engine、OmniMind 与 stock Pi 显式 discovery 继续复用 canonical React Query owner。

安装版 product bytes 现准确绑定 pushed product `bfa8c8f84c05fff3c75216212591cc69d4e3b173`。同 SHA arm64 DMG SHA-256 为 `44f2ce9c4e73f3d372a9b162ac4c0ceb59594565d48f3177dd4a7f7dfe8aace7`，DMG staged `app.asar` 与安装版 `app.asar` 均为 `bfbb35d42fe520d73f6bd2fb271e2f84cc14c6cde0fec6135f9341d630562397`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 docs-only 状态提交不冒充 shipped bytes。

一个 fresh、任务专用 packaged profile 先由主进程与 Helper 参数证明 Electron `userData`、OmniMind home、Codex/Claude private home 与任务 workspace 全部隔离。OmniMind 内置服务真实连接 DeepSeek，runtime catalog 精确投影 DeepSeek V4 Flash / V4 Pro；Claude 使用授权的 MiMo Anthropic-compatible 资源后从“登录”收敛为可用，只有实际选择 Claude 后才投影 Mimo V2.5 Pro catalog。MiMo 与 DeepSeek 分别完成精确模型首轮和同 Session continuation；关闭重开后当前 OmniMind Engine、DeepSeek V4 Pro、历史消息与按需 catalog 均稳定。最终全部 OmniMind 与 A/B 临时进程归零；旧 App、任务 profile、artifact 与临时 baseline clone 均移入 Trash，可恢复，真实用户 `.codex`、`.claude`、`.pi`、`.omnimind` 和 profile 未读取或改写。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- 后台 engine catalog warming 已退休；前台 exact-selection/new-thread prefetch 保留。SQLite 1–100 baseline 继续 `DEFER`，在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

当前已退休责任没有产品阻塞。Browser Electron E2E fixture 的 exact-turn credential seam、release provenance 的全包产品版本一致性与后台 warming 的 exact-SHA packaged journey 均已闭合。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

停止继续寻找删除候选。后续只由真实用户结果、故障或首次公开发行冻结触发新的局部裁决；SQLite migrations 1–100 继续 `DEFER`。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
