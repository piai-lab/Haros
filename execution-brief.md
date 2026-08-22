# Execution brief

## 当前目标

六组内置工具的 Agent/Chat/Studio 策略已由exact pushed code SHA `586c9661e5`实现并通过merge `d4989f5cee`进入main。该code SHA已重建Desktop/DMG、替换安装，并用任务专用`userData`、home与Provider private home完成隔离fresh-profile验收；post-merge focused gates与root typecheck均通过。当前没有未完成的Host矩阵产品施工；本交付仍是本机ad-hoc candidate，不是签名、公证或Release证据。

## 唯一 owner 与当前事实

- Contracts只拥有group ID、Settings/DTO值合同和窄`agent|chat|studio` transport vocabulary；Shared pure policy唯一拥有六组×三面的support/default矩阵，ProductSurface仍从authoritative `Project.kind`当次推导。
- ServerSettings唯一拥有用户intent、v1/v2/v3→v4迁移、bounded unknown、quarantine、整字段override replacement、revision与settings原子快照；v4单surface上限40可同时保留旧32个unknown与known intent，不存在第二settings store、migration marker或永久legacy双读。
- AgentGateway唯一拥有canonical catalog、runtime availability、Desired/Delivered projection与每次`tools/call`实时authority；Web只渲染一次原子snapshot生成的完整read model并提交完整next override map，不拥有policy。
- Web对mutation响应丢失只按回读canonical override map裁决：一致即accepted，不一致才回滚，回读失败保持“无法确认”且不自动重发；非pending cell直接消费Server的`configuredEnabled/effective`。
- Chat默认只有Browser；Goals与Automations支持但默认关，可由用户明确开启；Tasks与Diagnostics不支持，Device支持但默认关。Studio按独立Studio ProductSurface解析，而不是误用其`chat` ProviderWorkSurface。
- Host guidance与Session schema同生命周期。关闭立即拒绝旧Session的新call；重新开启只在新Session或真实native reload后提供。Todo、Engine-native tools、Skills、Prompts、Packages、Extensions、sandbox/approval和Browser/Device人类UI均不受此矩阵控制。
- Goal continuation与Automation新run在既有lifecycle admission重新消费当前surface policy；关闭Chat Goals使用既有pause，关闭Chat Automations使未admit新run进入既有failed路径，不新增状态机且不伪取消in-flight。

## 已闭合证据与剩余顺序

1. focused/full source gates、root typecheck/build、changed-path lint与Settings Browser 10/10已通过；全量并行Browser harness只保留已证实与本diff无关的baseline/负载边界，不用旁支Timeline改动刷绿。
2. exact pushed `586c9661e5` 生成DMG SHA-256 `cd97b9dd…51ece`，DMG与安装后的`app.asar`均为`3cdb313e…b784`；安装版进程使用隔离profile且bundled Server来自安装包。
3. 安装版中文/英文矩阵、Agent/Chat/Studio默认、unsupported文案、真实815px窄屏分层、Chat Goals写入`revision=1`、关闭重开恢复均通过；App最小窗口约815px，390px由浏览器组件回归覆盖。
4. merge `d4989f5cee`后的Shared/Contracts 15项、Server 412项、Settings Browser 10项及root typecheck 6/6通过；另以独立测试维护提交修正两个既有`@synara/contracts`陈旧导入。真实用户profile与并行research修改未被读取、改写或清理。

## Stop-loss

若出现Settings revision/settings错配、Web将accepted post-step failure误报为保存失败或重发mutation、后台Goal/Automation绕过surface policy、矩阵被复制到Web/Gateway/adapter/lifecycle、unknown/unsupported进入执行、Studio误吃Chat policy、per-turn Host热重载控制面、永久legacy双轨或第二settings/cache/registry，立即`SIMPLIFY`，不继续扩张。
