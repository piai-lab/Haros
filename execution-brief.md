# Execution brief

## 当前目标

没有正在施工的 source adoption 或瘦身 Slice。责任级瘦身已从 `main@a63b283fb0` 依次闭合三个独立 `RETIRE`：旧 OmniMind free-form model hints、不存在发行历史的 `0.4.2` release bridge、Browser Host 旧 pipe env/API aliases；当前 source head 为 pushed `main@64acfab5607fd1485ca4c6d97362741949ff992b`。

安装版 product bytes 准确绑定 pushed product `64acfab5607fd1485ca4c6d97362741949ff992b`；隔离启动、同 profile 重开、canonical Browser Host env、旧 alias 缺席和最终进程清理已闭合。后续 docs-only main 状态提交不冒充 shipped bytes。混合多个产品结果的 AppSettings 迁移未获逐项裁决，不得从这三刀自动扩张为批量 legacy 清理。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- `0.4.2` bridge/clean lane、双 manifest 准备与旧 Browser Host env/API aliases 精确删除；不建立兼容 alias、tombstone、迁移平台或第二 release/Host owner；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

三个已退休责任没有产品阻塞。两项现存反证被隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的既有全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

等待维护者从 AppSettings 其余迁移中选择一个精确责任，再单独完成 support graph、需求裁决与 `RETIRE/KEEP`；不得把 Gemini、Appshots、local→Server 等不同结果一锅删除。新的 Synara 更新仍统一按 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) 处理。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
