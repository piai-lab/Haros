# OmniMind Agent 提示词设置：固定来源证据与产品裁决

> 当前复验基线：bundled OmniMind Agent runtime `@harnessos/pi-coding-agent@0.84.3`，upstream exact source `4e58f324fae8ebfa98a3d45181fb248072a2afac`。exact artifact、patch 与 rights 只见根 [`source-adoptions.json`](../source-adoptions.json)。
>
> 本文只保存 prompt discovery/composition 的 source evidence、被拒绝路线、维护者裁决和复验触发器。稳定合同只见 [`architecture/product.md`](../architecture/product.md)、[`architecture/execution.md`](../architecture/execution.md) 与 [`architecture/workbench.md`](../architecture/workbench.md)。当前施工或交付状态不由本文拥有。

## 最终裁决

Settings 只提供两个 OmniMind Agent 的 provider-global 入口：

```text
默认提示词
  factory default（bundled runtime truth）
  或用户明确保存的 customized default（Server settings truth）

自定义规则
  Pi native global context candidate（file truth）
```

不提供第三张卡、不提供 Conversation target、不显示 raw effective prompt，也不在 Settings 中管理 `SYSTEM.md`、`APPEND_SYSTEM.md`、Project rules、模板、其他 Engine 或历史版本。

这项裁决同时保护两种简洁：

- 用户只需要理解“默认行为”和“我的规则”；
- runtime 继续拥有真实 prompt composition、Extension mutation、Session snapshot 与 request cache，不被 Settings复制。

## 三类真实输入

| 输入 | Sole owner | Settings 能做什么 | 不能宣称什么 |
| --- | --- | --- | --- |
| factory default | bundled runtime artifact | 只读展示；恢复默认时重新使用它 | 不是普通文件，不由Web重写 |
| customized default | Server-owned provider-global setting | 显式保存、清除、验证 | 不热切已创建Session，不等于完整effective prompt |
| global custom rules | Pi native global context candidate | 通过窄typed seam读取、保存或删除当前候选 | 不接管Pi precedence，不同步Project/private home |

已创建 Session 与已准入 operation 使用冻结的 prompt/messages/tools snapshot。保存设置只影响之后新建或正常重建的 OmniMind Agent Session；不提供“应用到当前对话”、Prompt-only reload、generation/LKG、history 或 rollback dashboard。

## 为什么拒绝旧三文件 UI

早期候选把 `AGENTS.md`、`APPEND_SYSTEM.md` 与 `SYSTEM.md` 全部暴露给用户，并把 `SYSTEM.md` 解释为可替换基础系统提示词。该路线被拒绝，不是因为 Pi 没有这些语义，而是因为它把 runtime implementation details升级成产品概念：

1. 用户必须先理解 append、replace、context precedence 与 Session reload；
2. Settings 会成为 Pi文件组合的第二解释器；
3. 同一规则可能同时被“自定义规则”和多个原生文件表达；
4. 页面很容易把保存成功误报成当前 Session 已切换；
5. 未来 Pi precedence变化会迫使Web同步。

保留 Pi 原生文件支持不等于把每个文件做成产品设置。高级用户仍可按 Pi 的 native lifecycle管理其私有资源；OmniMind Settings只拥有已裁决的两个入口。

## 运行时边界

- OmniMind Agent 与 stock Pi 的 state root、配置、Session 和资源发现互相隔离；Settings 不读写 `.pi`。
- factory/custom default 只替换 native builder中已经证明稳定且identity-neutral的default segment；dynamic tools、guidelines、context、Skills、cwd、manual native replacement与Extension mutation继续走原生builder。
- immutable engine contract由Host-owned seam在最终request前保证exactly once；用户内容、Extension prompt与默认提示词都不能覆盖它。
- global custom rules继续服从Pi native candidate discovery、precedence、空文件遮蔽与reload语义；Host不创建第二loader或候选排序。
- passive Settings读取不能执行Project Extension、启动Agent Session、触发模型请求或ambient创建文件。
- custom rules首次写入只由用户显式保存触发；无候选时显示未配置，不因打开页面自动创建。
- 保存、删除、读取失败必须保留原字节与真实状态；不以缓存、Toast或optimistic UI冒充持久化成功。

## 产品语言

普通页面只使用：

- `默认提示词 / Default prompt`
- `自定义规则 / Custom rules`
- `恢复默认 / Restore default`
- `保存 / Save`

`Pi`、`ResourceLoader`、`SYSTEM.md`、`APPEND_SYSTEM.md`、`engine contract`、`Host append`、fork 和upstream只属于源码、research、诊断、About、Licenses或用户主动打开的技术详情。

所有正常可达文案同时进入英文与简体中文catalog。Provider原始错误可以保留技术事实，但恢复建议必须用产品语言解释。

## 证据与反证

固定 source review 证明：

- Pi prompt不是一个可由Web安全拼接的字符串，而是factory、context、Extension与request-time mutation组成的生命周期；
- Settings若直接读写多个原生文件，会复制precedence与reload truth；
- 现有 product patch提供窄factory-default输入与typed outcome，不需要Host重建builder；
- Session创建之后保存全局值不会自动改变既有request snapshot。

会推翻当前裁决的证据只有：

- Pi upstream提供一个更成熟、明确面向GUI产品的单一prompt profile owner，并能替代当前两个入口；
- 用户任务反复证明只靠默认提示词和自定义规则无法表达必要结果，且新增入口的认知与生命周期成本被真实journey覆盖；
- 当前typed seam无法保持原始字节、原生precedence或失败关闭。

仅仅“Pi支持更多文件”“高级用户可能需要”或“页面还有空间”不能重开产品表面。

## 未来更新

Pi revision、builder、ResourceLoader precedence、context candidate、Extension prompt mutation、Session snapshot或当前patch变化时：

1. 按 [`PI-ECOSYSTEM-INTAKE.md`](../PI-ECOSYSTEM-INTAKE.md) 固定exact source；
2. 先证明upstream是否已提供等价public seam，能删除patch就优先删除；
3. 复验factory/custom default、global rules、empty/missing/corrupt、save/delete/reopen与Session冻结；
4. 确认stock Pi/private home仍未被读写；
5. 只有稳定产品结果变化时才更新architecture。

不要把新source结果、分支、SHA、test count或packaged状态追加到本文；它们属于source adoption、Git、execution brief或Campaign。

## Stop-loss

- 不新增Prompt DB、profile、registry、version ledger、跨Engine同步、第二loader或Prompt-only reload。
- 不把raw effective prompt、secret、路径或完整native错误写进普通UI、Timeline、日志或证据。
- 不为兼容旧未发布候选保留三文件alias、hidden字段或迁移双轨。
- 如果实现需要Settings重新解释Pi prompt composition，停止并回到runtime owner，而不是继续加adapter。
