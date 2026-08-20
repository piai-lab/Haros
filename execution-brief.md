# Execution brief

## 当前目标

第五个独立 `RETIRE` 已闭合：AgentGateway Automation memory 工具的旧 `content` 输入 alias 已删除，`memory` 是唯一调用合同。Synara 原始 `content`→`memory` 过渡、当前零消费者、schema/handler 双重真相和可接受 break 已完成只读审计，维护者于 2026-08-20 明确批准 clean break。实现不改 `AutomationMemory.content` 持久字段、既有 Automation 数据、隐式 `automationId` 解析、run envelope 或 AutomationService，也未增加 migration、tombstone、fallback 或第二 validator。

安装版 product bytes 现准确绑定 pushed product `06496f86ca9a4ba939b1331f6da4a30aa4dbe663`。同 SHA arm64 DMG SHA-256 为 `708da78557ed94800e94adae9ed2ae8909a9095aa1a64fc6eadb1b40dff3f56e`，DMG 与安装版 `app.asar` 均为 `0971711b6f518a3cdbb4c4cdb1119a3c1ede35b3cc2ab6ed58caaf2a8fd45fc9`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 source-only 状态提交不冒充 shipped bytes。

两个独立 packaged profiles 分别以 MiMo `mimo-v2.5-pro` 与 DeepSeek `deepseek-v4-pro` 完成真实 create→canonical memory write→view→continuation delete。停机后的 SQLite 逐字保存 `MEMORY_CANONICAL_MIMO_06496`（27 bytes）与 `MEMORY_CANONICAL_DEEPSEEK_06496`（31 bytes），两个定义均 archived、active count 均为 0；DeepSeek 同 profile 重开显示“还没有自动化”，最终 OmniMind 进程归零。采信证据均先从 Helper 参数和 Server 日志证明 Electron `userData`、baseDir、stateDir 与 SQLite 位于任务目录。一次更早的拒绝装配因 UI 控制器自行拉起默认 profile 而立即停止，未发送 Provider 请求、未修改设置，也不计入本轮证据。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

前五个已退休责任没有产品阻塞。两项既有反证继续隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

重新读取届时的 `main`，把已获维护者批准的 `everyMinutes` shorthand + 默认 heartbeat/五分钟作为另一个完整的“隐式 Automation 创建合同”责任单独退休；不得沿用本轮 working tree、顺手改 memory、Automation persistence、scheduler 或 UI。SQLite migration 1–100 在首次公开发行冻结前不压缩，engine catalog warming 在出现性能反证前保留。新的 Synara 更新仍统一按 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) 处理。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
