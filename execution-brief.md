# Execution brief

## 当前目标

`codex/host-tools-product-surface-policy` 正在从已合并的三工作面 `main@5451e22ce8` 实施并验收六组内置工具的 Agent/Chat/Studio 策略。代码已完成 Contracts、pure policy、ServerSettings v4 migration/atomic snapshot、AgentGateway read/list/call、Goal/Automation admission 与三列表格 UI 的主链路；当前动作是闭合文档、全量门禁、exact pushed-SHA Desktop/DMG与隔离fresh-profile journey。尚未完成packaged验收、合并main或分支清理，不得把本brief当成已发行证据。

## 唯一 owner 与当前事实

- Contracts只拥有group ID、Settings/DTO值合同和窄`agent|chat|studio` transport vocabulary；Shared pure policy唯一拥有六组×三面的support/default矩阵，ProductSurface仍从authoritative `Project.kind`当次推导。
- ServerSettings唯一拥有用户intent、v1/v2/v3→v4迁移、bounded unknown、quarantine、整字段override replacement、revision与settings原子快照；v4单surface上限40可同时保留旧32个unknown与known intent，不存在第二settings store、migration marker或永久legacy双读。
- AgentGateway唯一拥有canonical catalog、runtime availability、Desired/Delivered projection与每次`tools/call`实时authority；Web只渲染一次原子snapshot生成的完整read model并提交完整next override map，不拥有policy。
- Web对mutation响应丢失只按回读canonical override map裁决：一致即accepted，不一致才回滚，回读失败保持“无法确认”且不自动重发；非pending cell直接消费Server的`configuredEnabled/effective`。
- Chat默认只有Browser；Goals与Automations支持但默认关，可由用户明确开启；Tasks与Diagnostics不支持，Device支持但默认关。Studio按独立Studio ProductSurface解析，而不是误用其`chat` ProviderWorkSurface。
- Host guidance与Session schema同生命周期。关闭立即拒绝旧Session的新call；重新开启只在新Session或真实native reload后提供。Todo、Engine-native tools、Skills、Prompts、Packages、Extensions、sandbox/approval和Browser/Device人类UI均不受此矩阵控制。
- Goal continuation与Automation新run在既有lifecycle admission重新消费当前surface policy；关闭Chat Goals使用既有pause，关闭Chat Automations使未admit新run进入既有failed路径，不新增状态机且不伪取消in-flight。

## 当前验收顺序

1. contracts/shared/server/web focused tests、typecheck、i18n与changed-path lint；
2. AgentGateway、Goal、Automation完整受影响测试与Web browser matrix测试；
3. 相关全量test/build及一次有目的Browser gate，既有flaky只按稳定性和diff相关性处置，不抽奖式刷绿；
4. 同步最新main，按policy/settings、Gateway/lifecycle、Web/i18n、docs/evidence分关注点commit并push；
5. 只从exact pushed SHA构建Desktop与DMG，停止现存App，以任务专用userData/home/Provider private home安装启动并证明隔离；
6. fresh profile验证三面矩阵、四种状态、保存/刷新异常、Chat Goal/Automation、旧Session disable、关闭重开；资源匹配时用MiMo与DeepSeek做最小真实证伪；
7. packaged candidate通过后合并并push main，记录exact证据，确认clean/no-unpushed后只删除本任务分支与worktree。

## Stop-loss

若出现Settings revision/settings错配、Web将accepted post-step failure误报为保存失败或重发mutation、后台Goal/Automation绕过surface policy、矩阵被复制到Web/Gateway/adapter/lifecycle、unknown/unsupported进入执行、Studio误吃Chat policy、per-turn Host热重载控制面、永久legacy双轨或第二settings/cache/registry，立即`SIMPLIFY`，不继续扩张。
