# Execution brief

## 当前目标

六组内置工具的 Agent/Chat/Studio 策略已由exact pushed code SHA `586c9661e5`实现并通过merge `d4989f5cee`进入main。该code SHA已重建Desktop/DMG、替换安装，并用任务专用`userData`、home与Provider private home完成隔离fresh-profile验收；post-merge focused gates与root typecheck均通过。当前没有未完成的Host矩阵产品施工；本交付仍是本机ad-hoc candidate，不是签名、公证或Release证据。

`pi-web-access@0.24.1` → `@omnimind/om-web-access`已形成`candidate/pending-packaged` candidate：exact upstream baseline、P1–P6、bundled Agent composition、唯一config owner、Pi active-set、typed Curator/Browser/Timeline lifecycle、Settings与credential-blind Provider projection均已进入任务分支。维护者已把Provider视觉标准提升为26个runtime identity全部使用身份准确、保持原色的本地品牌资产；当前26→25 source candidate已通过descriptor/hash、Settings Browser、typecheck与Web production build，且dist包含全部25份物理文件。旧pushed SHA `286df13768`的13品牌+13中性packaged视觉证据因此失效，必须从新的exact pushed SHA重建并完成fresh隔离复验。它仍只属于bundled OmniMind Agent，不是AgentGateway/第七组Host/stock Pi能力；授权真实Provider、MiMo/DeepSeek及search→Curator→continuation完整packaged journey尚未完成，因此不能称`packaged-product-proven`、已发行或已进入main。

## 唯一 owner 与当前事实

- Contracts只拥有group ID、Settings/DTO值合同和窄`agent|chat|studio` transport vocabulary；Shared pure policy唯一拥有六组×三面的support/default矩阵，ProductSurface仍从authoritative `Project.kind`当次推导。
- ServerSettings唯一拥有用户intent、v1/v2/v3→v4迁移、bounded unknown、quarantine、整字段override replacement、revision与settings原子快照；v4单surface上限40可同时保留旧32个unknown与known intent，不存在第二settings store、migration marker或永久legacy双读。
- AgentGateway唯一拥有canonical catalog、runtime availability、Desired/Delivered projection与每次`tools/call`实时authority；Web只渲染一次原子snapshot生成的完整read model并提交完整next override map，不拥有policy。
- Web对mutation响应丢失只按回读canonical override map裁决：一致即accepted，不一致才回滚，回读失败保持“无法确认”且不自动重发；非pending cell直接消费Server的`configuredEnabled/effective`。
- Chat默认只有Browser；Goals与Automations支持但默认关，可由用户明确开启；Tasks与Diagnostics不支持，Device支持但默认关。Studio按独立Studio ProductSurface解析，而不是误用其`chat` ProviderWorkSurface。
- Host guidance与Session schema同生命周期。关闭立即拒绝旧Session的新call；重新开启只在新Session或真实native reload后提供。Todo、Engine-native tools、Skills、Prompts、Packages、Extensions、sandbox/approval和Browser/Device人类UI均不受此矩阵控制。
- Goal continuation与Automation新run在既有lifecycle admission重新消费当前surface policy；关闭Chat Goals使用既有pause，关闭Chat Automations使未admit新run进入既有failed路径，不新增状态机且不伪取消in-flight。
- Web Access的runtime Provider定义、canonical `.omnimind/agent/web-search.json`与credential-blind presentation projection是三个通过stable ID汇合但互不接管的owner；Web/Curator不得复制26家清单，品牌资产命中不得决定routing/availability。搜索全局不可用只收缩该Extension自己的`web_search/source_check`，不整包移除两个content tools。
- fork package-owned config service必须同时服务Settings与Extension，Settings不能为读写配置启动Session；App/Session启动不发Provider health probe。Provider测试与重新检查都是用户显式触发的最小真实请求，可能消耗额度。
- Provider测试允许使用当前完整未保存draft作为request-scoped candidate snapshot；不保存、不改routing/active-set或永久状态，并按显式request identity single-flight。单call terminal、Run abort、session tree与session shutdown必须按各自scope清理，fatal Curator/Host失败typed-error settle，不能把全实例cleanup挂在任意terminal上。
- config service唯一拥有schema与known migration，保存/刷新后只发process-local revision invalidation；live Extension实例各自恢复自己移除的工具，不建全局Session registry、file watcher或第二持久状态。测试/重新检查pending期间single-flight，避免重复计费。
- untouched baseline的三个P4反例是`browser_open reuse:true`导航当前Tab、Timeline假重开与token URL进入recent-history；当前source candidate已以Browser owner内部typed dedicated-tab seam、per-call ephemeral handle、exact pending reopen与non-history projection闭合，focused tests证明三个反例不再出现在候选路径。packaged journey尚未完成，不能把source修复升级成安装产品证据。
- Curator ephemeral Tab已裁决为internal-only：隐藏`Open externally`、raw-link copy与raw token地址；来源链接打开普通OmniMind Browser Tab，之后遵循一般Browser合同。只在owning Thread前台时自动呈现；后台Thread用既有waiting activity/attention，不抢route或Right Dock。

## 已闭合证据与剩余顺序

1. focused/full source gates、root typecheck/build、changed-path lint与Settings Browser 10/10已通过；全量并行Browser harness只保留已证实与本diff无关的baseline/负载边界，不用旁支Timeline改动刷绿。
2. exact pushed `586c9661e5` 生成DMG SHA-256 `cd97b9dd…51ece`，DMG与安装后的`app.asar`均为`3cdb313e…b784`；安装版进程使用隔离profile且bundled Server来自安装包。
3. 安装版中文/英文矩阵、Agent/Chat/Studio默认、unsupported文案、真实815px窄屏分层、Chat Goals写入`revision=1`、关闭重开恢复均通过；App最小窗口约815px，390px由浏览器组件回归覆盖。
4. merge `d4989f5cee`后的Shared/Contracts 15项、Server 412项、Settings Browser 10项及root typecheck 6/6通过；另以独立测试维护提交修正两个既有`@synara/contracts`陈旧导入。真实用户profile与并行research修改未被读取、改写或清理。
5. Web Access作者套件现有544项；同一full run中542项通过，失败为untouched baseline已复现的GitHub SIGTERM进程树竞态和一个并发负载下的Gemini command-aborted瞬态，后者随即用focused `config-path` 7/7证明非稳定回归。root typecheck 7/7、Web Settings Browser 2/2、双语catalog 22/22以及focused Server/P1–P6/Curator/Browser/Provider-asset gates通过。
6. 历史pushed SHA `286df13768`生成DMG SHA-256 `228796d58d64d3f2e3544e0a340fc6115db75b87fa8786e5152fa64de458b0c9`，安装版与构建候选`app.asar`均为`4f4abbefef2b7011da70bdac57eccb48b3071053798783f0ab66967a23bbfadb`。该fresh隔离实例曾证明13个品牌asset与13个中性mark可渲染、canonical默认配置为`0600`，但已被26家全部原色品牌asset的新标准取代，不能继续作为当前视觉交付证据。

## Stop-loss

若出现Settings revision/settings错配、Web将accepted post-step failure误报为保存失败或重发mutation、后台Goal/Automation绕过surface policy、矩阵被复制到Web/Gateway/adapter/lifecycle、unknown/unsupported进入执行、Studio误吃Chat policy、per-turn Host热重载控制面、永久legacy双轨或第二settings/cache/registry，立即`SIMPLIFY`，不继续扩张。Web Access若出现Web/Curator独立Provider或logo清单、AgentGateway/第七组Host接入、整包availability布尔值、后台Provider健康daemon、全局Session registry/file watcher、运行时favicon/CDN热取、token进入Browser历史/restore、Curator复用当前Tab、后台Thread抢route/Right Dock、Curator暴露外部打开或raw token、Timeline假重开、为Provider字段建立通用form DSL、品牌资产缺少准确identity/source snapshot/hash记录或stock Pi兼容profile，同样立即停止。
