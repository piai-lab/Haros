# Execution brief

## 当前目标

Composer 在 Desktop 重启后约 10 秒才恢复模型目录的问题已形成 source candidate。根因是当前/刚选中的 Engine 目录发现被上次运行持久化的 Provider health/auth 结果提前阻断，直到全局 Provider update coordinator 的 10 秒 live refresh 才重新启用；目录与发送权限因此被错误耦合。

当前实现让 exact selected Engine 立即进入既有 canonical `provider.listModels` query，目录继续决定“有哪些模型”，Provider health 继续独立决定“能否发送”。未选中的 Engine 不恢复后台 warming，stock Pi 仍只在明确选择后读取，OmniMind 仍要求现有 binding/model hint/显式 intent；没有新增 timeout、静态模型、第二缓存、重试系统或并行 owner。浏览器完整 `ChatView` suite 170/170、相关 unit 17/17、Web typecheck 与 focused lint 已通过；packaged Desktop 重建、隔离 profile journey 与本机安装尚待从本 candidate 的 pushed SHA 完成。

当前安装版 product bytes 准确绑定 pushed code `17355073cbc203c347f92ebac6884b564ed91011`：arm64 DMG SHA-256 为 `b278a5df78f93f59f4d8b0b2044c3e967fefea08dbc57f85edc66c41e3554504`，staged/installed `app.asar` SHA-256 均为 `78e2ab7621bf1e427f53f6e149e506b00f294bda645a2836d8372e9756dd0823`。240 个 legal identities 已闭合；本机安装 App 已 ad-hoc 重签并通过 strict deep verification。

完全隔离的 fresh packaged profile 在 Model services 首次进入约 362ms 后呈现准确空态；植入无凭据、无网络调用的任务本地 `models.json` 后约 821ms 呈现非空服务投影，没有假 loading。将该隔离实例的 bundled Server 连续终止至既有五次重启止损后，Desktop 准确给出恢复对话框，`Try again` 恢复同一服务投影；完整关闭重开后约 663ms 再次呈现，未读取真实用户 Provider home。最终任务进程归零，隔离 profile 与旧安装版均已移入 Trash，可恢复。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- 后台 engine catalog warming 已退休；前台 exact-selection/new-thread prefetch 保留。SQLite 1–100 baseline 继续 `DEFER`，在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

Composer 冷启动 candidate 没有 source 阻塞，但在完成 pushed-SHA packaged Desktop 重建、隔离 profile journey 与本机安装前，只能称 source candidate，不能宣称用户已拿到修复。

上一个 Model services 冷启动修复没有剩余产品阻塞：focused Model services browser tests 为 42/42，WebSocket transport focused tests 为 92/92，Web unit tests 为 4173/4173；Web build/typecheck、root lint/format、document contract 与 release provenance 通过。

完整 browser suite 的 6 个失败分布于既有 Sidebar、ResizeObserver、MessagesTimeline geometry 与 rerender benchmark；临时撤回本修复唯一可能影响全局 transport 初态的 replay 行后，ResizeObserver 与 3 个 geometry baseline 仍原样失败，Sidebar/benchmark 的 focused 重跑通过。因此它们没有被归因或混入本修复，也不能据此声称完整 browser suite 全绿。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

提交并推送 Composer 冷启动 candidate；从该精确 SHA 重建 arm64 Desktop artifact，停止所有现存 OmniMind 实例后安装，使用任务专用 `OMNIMIND_HOME`、HOME 与 Provider private homes 证明进程隔离，并验证冷启动当前 Engine 模型目录在 10 秒 Provider refresh 前恢复、关闭重开仍成立。若 packaged 证据推翻 source harness，回到同一目录/健康 owner 局部修正，不恢复全 Engine warming。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
