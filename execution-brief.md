# Execution brief

## 当前目标

没有正在施工的 source adoption 或瘦身 Slice。责任级瘦身已从 `main@a63b283fb0` 闭合四个独立 `RETIRE`：旧 OmniMind free-form model hints、从未获得消费者的发行兼容双轨、Browser Host 旧 pipe identity 及其构建输入，以及 private contracts 中无消费者的 ProviderRuntime 兼容类型表面。canonical `ProviderRuntimeEvent` schema、wire、JSON/persistence 与 Claude terminal result 均未改变；当前 shipped product head 仍为 pushed `main@822af96fc0e0ba0ecd853beacf9b2a94543157b2`，本次 source-only 类型责任退休未重新打包。

安装版 product bytes 准确绑定 pushed product `822af96fc0e0ba0ecd853beacf9b2a94543157b2`；isolated fresh launch、Browser 打开/导航/截图/关闭、同 profile 重开、旧 identity 缺席和最终进程清理已闭合。后续 source-only main 状态提交不冒充 shipped bytes。混合多个产品结果的 AppSettings 迁移未获逐项裁决，不得从这四刀自动扩张为批量 legacy 清理。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

四个已退休责任没有产品阻塞。两项现存反证被隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的既有全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

下一轮不得沿用本次删除惯性；必须重新读取届时的 `main`，再从独立责任候选中只裁决一刀。Automation 的 `content` alias、`everyMinutes` shorthand 与默认 heartbeat 会改变 Agent tool contract，必须另开责任切片；SQLite migration 1–100 在首次公开发行冻结前不压缩，engine catalog warming 在出现性能反证前保留。新的 Synara 更新仍统一按 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) 处理。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
