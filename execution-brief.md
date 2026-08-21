# Execution brief

## 当前目标

闭合 OmniMind Timeline 的全链路语义一致性：Reasoning、显式 Skill 投递、Tool 分类/计数/icon 与中英文文案必须由 canonical activity facts 驱动，不能因 Engine 投影、未知事件或首条 icon 不同而出现不同产品语义。当前实现不新增 Provider/Pi 公共 API、数据库迁移、第二 Skill owner 或平行 UI/store。

已完成的 source candidate：服务端将可读 Reasoning 投影为 `reasoning.completed`/`info` 非 Tool activity，并保留 Provider item、turn 与顺序；Web 对新旧记录统一按 turn 合并、默认折叠、Bot icon、精确旁白去重。Skill 注入返回逐项 delivered/failed 结构化结果；OmniMind 明确走 Host inline seam，失败项不阻塞后续项，Provider 接受后写入确定性幂等 `skill.instructions.delivered`/`skill.instructions.failed` 回执。Tool 汇总只按结构化八类分类，混合类别使用通用执行 icon，未知事件不计入 Tool，正常产品文案和时长完成中英文 catalog parity。

截至当前 pushed SHA `5b47a4cd10e7a7e523d6709fe46b5aad8b400efb`，Web 全量 `326` files / `4177` tests、Server 全量 `373` files / `4367` tests（另 3/16 skipped）通过，双方 typecheck 通过；Reasoning projection/ingestion、Skill injection focused tests 通过（ingestion `111/111`）。从该 SHA 重建的 arm64 DMG 已完成 240 项 legal closure，SHA-256 为 `ae8363e76b4c08a901493f468239d4021b6bcf4eeccdc028874129ee4feb5b59`；通过任务专用隔离环境的 packaged startup smoke。完整 fresh-profile Timeline 交互 journey（选择 Aihot、回执、Reasoning/command/mixed、关闭重开）尚未在 packaged App 上闭合，因此仍不能宣称安装版已完成全链路验收。

完全隔离的 installed-App profile 使用任务专用 `HOME`、`OMNIMIND_HOME`、`CODEX_HOME`、`CLAUDE_CONFIG_DIR` 与 `PI_CODING_AGENT_DIR`，并由主进程、Helper 与 bundled Server 的运行参数/环境证明隔离。植入无凭据、无网络调用的任务本地 catalog 后，将持久化 OmniMind Provider 状态改成 `available: false` 的旧缓存；关闭重开 installed App 后，7.616 秒即可打开模型按钮，8.717 秒已呈现 `Restart Fixture / Instant Model`，早于 10 秒 Provider refresh。真实用户 Provider home 未被读取或改写，最终任务进程归零；旧安装版已移入 Trash，可恢复。

## 已确认范围

- `providers.omnimind.customModels` 精确丢弃；不扫描、迁移或清理其他数据，不触碰 stock Pi custom models、`models.json`、凭据、Workspace 或 SQLite；
- 历史 release bridge/clean lane、双 manifest 准备、自定义 updater channel 与旧 Browser Host env/API/build aliases 精确删除；updater 回到标准 `latest-mac.yml`、`latest.yml`、`latest-linux.yml`，不建立兼容 alias、feed adapter、迁移平台或第二 release/Host owner；
- 官网继续是唯一用户入口，独立发行仓库继续是机器发行 authority；二者不合并责任；
- Provider 原生差异、恢复安全、Synara 作者生命周期、WS generation negotiation、migration recovery 与 Provider adapters 保留；
- 后台 engine catalog warming 已退休；前台 exact-selection/new-thread prefetch 保留。SQLite 1–100 baseline 继续 `DEFER`，在首次公开发行冻结时再审；
- 不实施签名、公证、GitHub Release、update feed 或 official cross-platform release；本轮只安装本机 macOS ad-hoc candidate。

## 当前阻塞

Timeline source 已完成 commit/push、packaged App 重建与隔离启动 smoke；剩余证据缺口只有 packaged App 内的完整 fresh-profile Timeline 交互 journey，因此当前不能宣称已安装版全链路验收完成。除此之外没有已知产品语义阻塞；若最终 journey 因环境或资源不可用，应准确保留为 source + startup-smoke candidate，不把 focused tests 扩写成安装证据。

上一个 Model services 冷启动修复没有剩余产品阻塞：focused Model services browser tests 为 42/42，WebSocket transport focused tests 为 92/92，Web unit tests 为 4173/4173；Web build/typecheck、root lint/format、document contract 与 release provenance 通过。

完整 browser suite 的 6 个失败分布于既有 Sidebar、ResizeObserver、MessagesTimeline geometry 与 rerender benchmark；临时撤回本修复唯一可能影响全局 transport 初态的 replay 行后，ResizeObserver 与 3 个 geometry baseline 仍原样失败，Sidebar/benchmark 的 focused 重跑通过。因此它们没有被归因或混入本修复，也不能据此声称完整 browser suite 全绿。

official signing、notarization、Windows/Linux artifacts、GitHub Release 与 update feed 仍在维护者明确排除的本轮范围之外，不是遗留阻塞。

## 下一动作

本轮无需继续施工；保持模型目录与发送准入分离的既有 owner 边界，后续若出现特定 Engine 的真实目录失败，沿该 Engine 的 canonical `provider.listModels` 链路单独归因，不恢复全 Engine warming。

## 权威路由

- 产品 adoption：[`README.md`](README.md)
- 稳定 UI 与行为：[`architecture/workbench.md`](architecture/workbench.md)
- exact source 与 disposition：[`research/source-review.md`](research/source-review.md)
- claim 状态：[`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)
