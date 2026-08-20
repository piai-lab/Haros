# Execution brief

## 当前目标

第六个独立 `RETIRE` 已闭合：AgentGateway 不再接受 `everyMinutes`，也不再把缺失的 `mode`/`schedule` 猜成 heartbeat/五分钟；`omnimind_create_automation` 现在只接受显式执行模式和 canonical schedule。Synara heartbeat-only 创建合同、后续兼容桥、当前调用面和可接受 break 已完成只读审计，维护者于 2026-08-20 明确批准 clean break。实现不改 canonical `AutomationCreateInput`、Web 创建表单、Automation persistence/scheduler、既有定义、memory 工具或 stop policy，也未增加 coercion、alias、migration、fallback 或第二 validator。

安装版 product bytes 现准确绑定 pushed product `0202d9a4411658b2b2b662b6694798dcc4de2bda`。同 SHA arm64 DMG SHA-256 为 `be4a4d060c9d465d07dff40b538ba9ddfd35060978c569ee403eacab989f55a9`，DMG staged `app.asar` 与安装版 `app.asar` 均为 `da45356dbad163a2dc9f94e6a3c4694b6dc81cbd45645e896183fccccaba6fa6`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 source-only 状态提交不冒充 shipped bytes。

一个 fresh、任务专用 packaged profile 先由进程参数证明 Electron `userData`、OmniMind home 与 SQLite 全部隔离，再以环境变量引用而非明文配置发现 MiMo `mimo-v2.5-pro` 与 DeepSeek `deepseek-v4-pro`。DeepSeek 用显式 `mode=standalone` 与 `schedule={type:"interval",everySeconds:86400}` 完成真实创建；停机后 SQLite 保留同一 canonical object、定义已由 continuation 精确归档、run count 为 0，同 profile 重开显示“还没有自动化”。MiMo 能完成真实首轮并获得工具失败反馈，但五次调用在最早可见的 Pi 会话 transcript 中都已把嵌套 `schedule` 写成 JSON 字符串，因此 Gateway 按严格合同拒绝且没有创建定义。该反证不被重写成通过，也不构成恢复字符串 coercion 的理由。一次更早的 UI 控制器误启动默认 profile 在任何 Provider send、设置修改或 Automation 创建前即被停止并排除；最终全部 OmniMind 进程归零。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

前六个已退休责任没有产品阻塞。两项既有反证继续隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

本轮 live 新发现一项独立产品反证：同一个 Agent tool schema 下，DeepSeek 能提交 nested object，MiMo 的 persisted Pi transcript 却在 Gateway 执行前已把 `schedule` 字段保存为 JSON string。当前证据只把故障界定在 MiMo 原始响应至 Pi message normalization 之间，尚不能把责任归给 Provider wire、Pi harness 或 OmniMind adapter；不得凭模型自述下结论，也不得在 Server 端放宽 canonical contract。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

暂停继续删除 compatibility surface。下一动作是对 MiMo 与 DeepSeek 运行同 schema、同 prompt 的最小脱敏 tool-call harness，逐层捕获原始 Provider arguments、Pi normalized message 与 Gateway call，找出 `schedule` 首次从 object 变成 string 的精确 owner；只修最早错误 owner，并用另一 Provider 作为不回归对照。禁止给 Gateway 增加 JSON-string coercion、schema alias、Provider 特判或兼容双轨。该反证闭合后再重新审计下一张责任图；`stopOnError`、SQLite migration 1–100 与 engine catalog warming 仍保持 `DEFER`，package version mismatch 与 Browser E2E seam 继续作为独立 correctness/test-assembly 任务。新的 Synara 更新仍统一按 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) 处理。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
