# Execution brief

## 当前目标

Model services 概览的冷启动假 loading 已在 source 修复：成功的 canonical list query 不再被独立 transport snapshot 遮挡；真实 pending 继续显示 loading，断连后的失败直接进入既有可重试错误，transport 创建时立即 replay 当前状态。修复只调整现有 Web query/transport presentation owner，不新增 timeout、静态服务目录、第二缓存或后台重试系统。

当前安装版 product bytes 仍准确绑定 pushed product `bfa8c8f84c05fff3c75216212591cc69d4e3b173`；本次用户可见修复尚未从 exact pushed SHA 重建和安装，因此当前状态是 source candidate，不冒充已交付到安装版。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- 后台 engine catalog warming 已退休；前台 exact-selection/new-thread prefetch 保留。SQLite 1–100 baseline 继续 `DEFER`，在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

Model services source gates 已闭合，尚待 exact pushed SHA 的 packaged cold-start、resolved projection、断连错误与重开 journey。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

提交并 push 当前单一修复，从 exact pushed SHA 重建、安装并用任务专用隔离 profile 闭合 Model services packaged journey。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
