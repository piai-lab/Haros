# Source Intake Core

> 本文是 OmniMind 所有外部来源研究、采用、更新与 fork 的公共合同。它只拥有公共机械规则；来源为何默认采用、哪些领域归谁、有哪些专项风险，分别由来源 profile 拥有。

## 1. 目标

Source intake 要同时做到三件事：不漏掉来源事实，不制造第二产品 owner，不让验证成本超过本轮声明。深度来自判断密度，不来自固定篇幅、固定测试阶梯或重复安装。

以下事实必须分开：

- **source retained**：仓库或依赖闭包中保留了哪些来源字节；
- **shipped bytes / exports**：构建产物实际带出了什么；
- **runtime activated**：运行时注册、监听、写入、计时、进程或外部副作用实际启用了什么；
- **product adopted**：稳定产品 owner 已承接哪些可观察保证；
- **released**：签名、公证、Release、feed 与公开分发另有独立证据和授权。

其中任何一项成立都不能自动推出下一项。

## 2. 两种意图、两个门

### 2.1 Scoped source review

只读研究维护者指定的 source、机制或责任域，输出来源身份、理解、反证、风险与建议。它不修改产品、adoption authority、依赖锁、Campaign 状态或发行配置，也不取得实施授权。

### 2.2 Adopted-head advancement

目标是让一个 exact candidate 成为新的 production-adopted source。它先完成 Gate A；只有完整 decision surface 已清楚、来源 profile 的授权条件已满足，才进入 Gate B。

### Gate A：只读 intake

允许检索、下载到隔离临时目录、解包、读源码、运行无产品写入的 focused probe。必须回答：

1. exact source / artifact / revision / digest / rights 是什么；
2. 它真实拥有的用户 journey、状态、进程、网络、权限和失败边界是什么；
3. 与当前 OmniMind 真实调用链相比，哪些已存在、部分存在、缺失或冲突；
4. 每个可独立裁决的 observable guarantee 应怎样 disposition；
5. 哪些建议会造成 material loss、固定 divergence 变化、新 owner 或高风险；
6. 什么证据足以推翻每项建议。

Gate A 不得 cherry-pick、merge、patch 产品文件、更新 `source-adoptions.json`，或把研究写成“已采用”。

### Gate B：实施候选

只实现已决定的 surface：在真实 owner 内接线，保留或重放作者回归，闭合 rights、来源记录、research disposition 与当前状态。实施发现 materially 改变产品结果、权限、安全、迁移、owner 或未纳入项时，只把变化部分退回 Gate A；其余已确定部分不重问。

Gate B 不授权发布、签名、创建 Release、修改 feed、迁移真实用户数据或扩大第三方访问。

## 3. Freshness seal

每轮 intake 在开始、进入 Gate B 前、冻结候选前各记录一次临时 freshness seal：

```text
workspace:
HEAD:
origin relation: ahead / behind / diverged
dirty paths:
adopted revision:
candidate revision:
observed at:
```

seal 是当轮证据元数据，不是需要长期维护的新 ledger。Git 或 source 在期间变化时，只重开受影响的结论：

- candidate、merge-base 或 changed paths 变化：重开对应 source accounting；
- owner 或调用链变化：重开对应 disposition 与 proof；
- rights、artifact 或 dependency closure 变化：重开来源与法律结论；
- 无关 dirty path 不使整个 intake 失效，但必须保持不覆盖。

未知不能写成“仍然最新”。若无法固定 exact identity，停在 review。

## 4. Gate A 的最小完整研究

### 4.1 先写可证伪问题

不要以“这个项目有什么值得学”开场。先写真实用户结果、当前最简单基线、候选可能改善的精确缺口，以及最强反证。热度、README、版本号和接口美观只用于导航。

### 4.2 固定来源与权利

按适用范围记录 repository、commit/tag、package version、artifact integrity、subpath、license/notice、依赖闭包、资产来源和 redistribution 约束。source 与 artifact 无法绑定时，不得把仓库审计外推为发布物审计。

只有进入 [`source-adoptions.json`](source-adoptions.json) 的 exact source 才是 adopted source；research 与 package README 不复制可独立修改的 adoption 清单。

### 4.3 沿真实 journey 读源码

从用户入口追到 route/command、definition、registration/activation、execution、state writer、permission、external authority、normal/failure/cancel/restart/shutdown。明确区分：

- 源码存在但未导出；
- 已导出但未注册；
- 已注册但当前不可用；
- 有 UI/schema 声明但底层没有真实能力；
- 有底层能力但产品没有承诺该 journey。

### 4.4 以保证为裁决原子

Commit 和 changed paths 用来证明 source range 没有遗漏；它们不是 disposition 的原子。一个 commit 可以混合多种责任，一个行为也可能跨多个 commits。

每个 disposition 单元必须能写成：

```text
observable guarantee
→ canonical owner
→ normal / failure / cancel / restart boundary
→ relevant author regression or source evidence
→ proposed disposition and falsifier
```

不要求人为制造“左右 change-unit 数量相等”。完整性由 commit/path coverage、行为责任覆盖和未分类项为零共同证明。revert、binary asset、lockfile、generated/release 文件也必须有明确归类，不能被平均进一个笼统结论。

### 4.5 Decision surface

默认进入项可以按稳定责任合并汇报。必须单列：

- material defer、decline 或 exclusion；
- 固定 divergence 的新增或实质变化；
- 新 owner、state、lifecycle、public contract、control plane 或长期兼容责任；
- 权利、安全、权限、迁移、秘密、发布或高费用风险；
- 仍无证据区分的真实产品分叉。

Agent 应先自行查清可搜索事实、现状和最强方案；只把会改变产品结果或风险承担的选择交给维护者。

## 5. Disposition 词汇

每个保证只能有一个最终 disposition：

### Adopt directly

保留来源语义、owner 和作者生命周期，做必要的 identity、构建与接线适配。

### Adopt via existing owner

当前 canonical owner 已交付同等或更强的可观察结果，且相关作者回归或等价 falsifier 被保留。它是**采用结果**，不是“因为已有所以不纳入”。必须说明 source insight 进入哪个 owner、哪条证据防止未来回退。

### Translate semantically

保留用户结果和失败语义，但映射到 OmniMind 已有 canonical contract。翻译 seam 必须窄、typed、可删除，不能成为平行状态或兼容平台。

### Defer with trigger

价值成立但当前 prerequisite、rights、资源或验证条件不足。写出 material loss 和精确 reopen trigger；不记为 adopted，也不形成永久 backlog。

### Decline, retain evidence

明确拒绝进入产品，保留为什么拒绝、失去什么、什么反证会改变决定。不得把个人偏好伪装成安全规则。

### Exclude identity / legal / release bytes

只排除不应进入产品表面或发行物的 identity、法定冲突、artifact 或 release surface；不得顺带抹掉合法 lineage、Provider identity 或可采用机制。

`already covered` 不再作为最终 disposition。若结果确实更强，使用 `Adopt via existing owner`；若选择不承接来源保证，使用 defer 或 decline 并承担相应确认。

## 6. Gate B 的实现原则

1. 优先配置、接线、公开 seam、upstream patch；成熟生命周期不因本地架构更整齐而被拆碎重建。
2. 相对来源最小化语义/源码偏离、重复 owner、runtime activation、用户概念和同步成本，而不是机械追求小 diff。
3. 同一获准责任内若已有第二 truth、分散 consumer 特判或待退休兼容轨，应选择幸存 owner、切完当前 consumer、删除旧支持图。
4. fork/adapter/配置服务/产品入口都必须有替换与删除边界；不能由一个模块同时接管 definition、prompt、lifecycle、authority、state 与 presentation。
5. 新增或修改的 OmniMind 用户文案同轮交付简体中文与英文；原始来源身份、路径、命令和诊断保持事实。
6. 候选冻结前做一次未来变化演练：新增/删除成员、schema 或协议改变、展示替换、能力整体退休时，修改是否集中、测试能否定位、删除是否不牵连无关 owner。

## 7. 声明驱动的验证

验证不走固定的 unit → live → packaged 阶梯。先写要证明的 claim，再选择最便宜且足以推翻它的证据：

| Claim                                        | 默认充分证据                                                   | 何时升级                                               |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| 文档路由、source identity、rights、digest    | 文档合同、exact diff、license/artifact 校验                    | source/artifact 无法绑定或法律边界变化                 |
| 纯 presentation、布局、文案、交互策略        | focused unit/component/browser/pixel proof；需要时人工视觉确认 | Electron/OS 独有 seam、安装产物或重开语义是 claim 本身 |
| owner、schema、state、cancel/restart 语义    | focused contract/integration fixture，覆盖失败与终态           | 真实进程或打包边界会改变语义                           |
| Provider wire、stream、Thinking、tool、usage | 先用可诊断 fixture，再用匹配协议的最小 live probe              | claim 是跨 Provider 一致性时才覆盖多个真实 Provider    |
| shipped bytes、profile 隔离、安装、关闭/重开 | exact candidate 的一次 fresh isolated packaged harness         | release/signing/public distribution 仍走独立 gate      |
| Release、签名、公证、feed                    | 对应发行 owner 的独立证据与明确授权                            | 不得由本地 DMG 或 packaged journey替代                 |

补充规则：

- MiMo 与 DeepSeek 只在本轮 claim 涉及真实跨 Provider、Pi/Host/Provider wire 或默认 Agent 体验时作为优先锚点；纯 UI、文档和非 Provider owner 不例行调用。
- Computer Use 默认不进入证据链。只有 OS surface 无程序化证据、且人工也无法可靠确认时才作为 fallback；使用前先证明任务 profile 隔离。
- 开发中运行最窄 focused proof；冻结同一 SHA 后最多完成一次与 claim 相称的 packaged candidate proof，不因每次局部修订重复安装。
- live probe 必须有明确假设、硬超时、费用边界、脱敏输出和停止条件。资源充足不等于授权跑分。
- 局部绿色只能支持局部 claim。没有 packaged claim 就不要为了“更完整”制造 packaged 结论。

## 8. 权威收口与完成定义

Adopted-head advancement 的同一事实闭包按需更新：

- [`source-adoptions.json`](source-adoptions.json)：exact adopted identity、rights、paths、digest、mode 与 update policy；
- 对应 [`architecture/`](architecture/README.md) owner：稳定产品事实；
- [`research/README.md`](research/README.md) 路由的 exact evidence owner：固定来源观察、反证、disposition 与 reopen trigger；
- [`execution-brief.md`](execution-brief.md)：仅在有活动施工、真实冲突或下一动作时更新；
- active [`missions/independent-omnimind-v1.md`](missions/independent-omnimind-v1.md)：只写 claim 状态与最短证据指针。

完成至少要求：freshness seal 仍有效；source/path/behavior accounting 无未知项；rights 可复核；disposition 唯一；owner 与 activation 边界清楚；required proof 与 claim 匹配；未把 review 写成 adoption，也未把 packaged candidate 写成 release。

## 9. Stop conditions

出现以下任一项时停止晋级，只研究受影响部分：

- exact source、artifact、rights、license 或资产来源无法确认；
- candidate 历史改写或不是预期 descendant，却仍按线性 range 推理；
- normal/failure/cancel/restart/shutdown 有未知写入、权限、进程或第二 authority；
- 需要新增长期 owner、迁移、权限、秘密、发布或高费用外部动作而没有明确授权；
- 作者测试失败且原因未知，或现有失败没有新假设；
- 实施事实 materially 改变已展示的 decision surface；
- 工作区变化使 freshness seal 的相关结论失效。

## 10. 三个校准例

1. **一个 Synara commit 同时改 Provider 图标和 installed-only filtering。** Commit/path 全覆盖；图标状态可 `Adopt via existing owner`，filtering 若触及固定 divergence 则单独 defer/decline 并说明损失。不能给整条 commit 一个 disposition。
2. **只审查一个 Pi MCP adapter。** 完成 exact source、transport/secret/process/rights 与建议即可停在 scoped review；不修改 manifest，不跑无关 Provider，也不安装 App。
3. **升级 bundled Pi runtime 的 stream/tool 协议。** 读取 Pi profile 及命中的风险附录；focused fixture 后用匹配协议的 live Provider，若 shipped runtime 是 claim，再对同一 candidate 做一次 isolated packaged journey。
