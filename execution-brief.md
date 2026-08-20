# Execution brief

## 当前目标

第六个独立 `RETIRE` 与其后暴露的 MiMo correctness defect 均已闭合。AgentGateway 不再接受 `everyMinutes`，也不再把缺失的 `mode`/`schedule` 猜成 heartbeat/五分钟；`omnimind_create_automation` 仍只接受显式执行模式和 canonical schedule。一次同 schema、同 prompt 的脱敏 raw-wire harness 证明：旧的 nested `schedule.oneOf` 会让 MiMo 在原始 Provider response 中直接把 `schedule` 生成为 JSON string，而等价的 flat object schema 会让 MiMo 与 DeepSeek 都保留 object。最早错误 owner 因而是 Agent-facing schema，不是 Gateway decoder、Pi normalization 或 Automation persistence。精确修复只把 model-facing schedule 投影压平为一个带 `type` discriminator 和可选 branch fields 的 object；canonical `AutomationSchedule` decoder、branch validation、Web 表单、scheduler、persistence 与既有定义不变，也没有加入 string coercion、Provider 特判、alias、migration、fallback 或第二 validator。

安装版 product bytes 现准确绑定 pushed product `17a79a37ee21861e7aff1503bab381614d6a4ab2`。同 SHA arm64 DMG SHA-256 为 `9fd17ebb981e0eaef5979f7a3905b9c468ad4a488506b32142dae0f43c0251f9`，DMG staged `app.asar` 与安装版 `app.asar` 均为 `228e9fc4a85268f831e21f3142f6332ab4566d0addaa0a2a628ffdfcd690fbf3`，240 个 staged legal identities 闭合；本机安装版完成 ad-hoc 重签并通过 strict deep verification。后续 source-only 状态提交不冒充 shipped bytes。

一个 fresh、任务专用 packaged profile 先由进程参数证明 Electron `userData`、OmniMind home、Provider private home 与 SQLite 全部隔离，再以环境变量引用而非明文配置发现精确 MiMo `mimo-v2.5-pro` 与 DeepSeek `deepseek-v4-pro` catalog。两者都经真实 Agent→Pi→Host tool 链创建 `mode=standalone`、`schedule={type:"daily",timeOfDay:"09:30",timezone:"Asia/Shanghai"}` 的定义；各自 Pi transcript 中 tool arguments 与 nested schedule 都保持 object。两条同线程 continuation 均完成 view→精确 revision→delete/archive。停机 SQLite 证明两个定义 disabled、archived、revision 1、iteration count 0，Automation run count 为 0；同 profile 重开后两个 thread 仍 completed、catalog 仍 ready、active definition 与 run 都为 0，再次正常退出后全部 OmniMind 进程归零。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- engine catalog warming 与 SQLite 1–100 baseline 继续 `DEFER`，前者先测收益，后者在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

前六个已退休责任没有产品阻塞。两项既有反证继续隔离在各自 owner，不能拿来给本轮加补偿层：release provenance 的全包版本一致性检查发现产品包为 `0.1.0-alpha.0`、`packages/contracts` 为 `0.7.0`；visible Browser Electron E2E fixture 缺少当前 `bindTurnAuthority` credential seam，尚未进入 pipe journey 即失败。二者都不是本轮删除产生的行为回归，需要单独裁决和修复。

本轮 packaged setup 还观察到一项独立、尚未复现归因的 UI 反证：fresh profile 的窗口落在不存在的 thread route，Server 返回 `THREAD_SNAPSHOT_NOT_FOUND`；即使 authoritative RPC 已存在 project、thread 与 ready model catalog，当前窗口的 Project/Model 投影仍未刷新。正式 Agent/Automation 验收因此直接走同一 packaged Server 的 authenticated WebSocket contract，而没有把 stale UI 当成模型或 Automation 失败。该观察尚不足以证明 route restore、Web store 或 snapshot subscription 中谁是 owner，不得在本轮顺手加 reload/fallback。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

先对 packaged fresh-profile 的 phantom thread route / stale Project-Model projection 做一次最小只读复现与真实调用链审计；若可复现，只修最早错误 owner，若不可复现则把它保留为 bounded 反证而不建立补偿层。该 correctness 问题裁决后，再按 responsibility portfolio 重新审计下一张可退休责任图；不以文件陈旧、名称像 legacy 或行数大作为删除理由。`stopOnError`、SQLite migration 1–100 与 engine catalog warming 仍保持 `DEFER`，package version mismatch 与 Browser E2E `bindTurnAuthority` seam 继续作为独立 correctness/test-assembly 任务。新的 Synara 更新仍统一按 [`SYNARA-INTAKE.md`](SYNARA-INTAKE.md) 处理。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
