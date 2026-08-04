---
type: "Brainstorm"
title: "Brainstorm: Qualify and map the UI chassis"
---

# Brainstorm: Qualify and map the UI chassis

OmniMind 已完成 durable contract freeze。当前可观察问题不是缺少 UI 方向，而是固定
`vendor/ui` 母体仍只是一棵 exact provenance baseline：它包含完整可运行产品行为，也包含
尚未逐项处置的品牌资产、宿主命名和与 Pi 原生执行权威竞争的 Agent Harness 机制。继续停留在
`vendor/ui` 会把研究底盘误当 production；直接整树改名又可能在没有 rights/domain proof 时把风险
和双权威一起搬进产品。

第一性锚定是：**以成熟行为和用户可见契约为保全单位，以权利、事实权威和可执行 proof 为删除
单位。** 首先证明哪些源码、贡献历史、法定文本和资产可以进入 production；随后建立完整
source-domain map，把每个获准域绑定到稳定产品职责、正常/失败/恢复行为和验证入口；最后选择一个
可运行的首批接管切片。目录归属、来源文件数量和截图相似度都不能替代这一判断。

主要矛盾是完整母体保全与精确切除之间的张力：

- 过早重写或挑组件会丢失 shell、layout、stream/scroll、viewer、desktop bridge 和恢复等冰山行为；
- 整体照搬宿主 Runtime 会让 Product Control Plane 与 Pi 同时拥有 Session、queue、retry、Package
  lifecycle 和恢复；
- 保留品牌资产或权利不明内容会阻断 production adoption；
- 长期把 `vendor/ui` 当运行产品会形成 donor mirror，而不是 OmniMind source lineage。

不可退让的结果已经由维护者和权威文档确认：

- `Agent | Chat`、完整 Workbench 母体和中英双语地基不得退回薄 shell；
- Pi 是唯一 bundled-native Gold Path，Pi executable ecosystem code 不进入 Electron Main/renderer；
- Product、Native Engine 与外部系统事实各有唯一权威；
- 未有替代行为与 failure/recovery proof 的源域不得删除；
- 生产采用必须同时披露 exact source、contributors、rights、legal text 和实际资产处置；
- 当前工作不得把文档绿色冒充 UI、Runtime、跨平台或 Campaign 完成。

最强反假设是“先把整棵母体原样提升到根 `apps/`，再边跑边清理”。它可能最能保全隐性行为，
但若品牌资产、根构建拓扑、生成文件或 Agent authority 的耦合比预期更深，会把未经批准的身份与双
Runtime 直接变成 production candidate。相反，永远留在 `vendor/ui` 上开发虽更安全，却会固化
donor namespace 和双树。研究必须决定可回退的 exact transplant baseline 与逐域换脑之间的正确
提交边界，而不是凭偏好选边。

下列证据会修正或推翻锚定：固定 revision 的 license/history 无法支持预期采用；关键视觉资产没有
可替换或可授权路径；完整构建依赖无法在保持行为的前提下从 donor 身份解耦；首批域无法通过 typed
Product State/Execution 边界接管；或真实运行证明母体几何无法满足性能/可访问性契约。

本轮研究分成三个可独立证伪的问题：

1. fixed revision 的 lineage、contributors、license、品牌/第三方资产和 production disposition 是否
   足以让 F-03/F-04 进入候选，而不重跑未触发的 unchanged build/smoke；
2. `vendor/ui` 的 Web、Desktop、Server、shared packages 和生成/构建根实际形成哪些 source domains、
   依赖和事实权威，哪些是首批接管必保或必须隔离的机制；
3. 哪个最小但完整的 source-domain slice 能建立真实 `Agent | Chat` 入口、共享 UI 地基和 typed product
   boundary，同时保持母体可运行并为 isolated Native Host 留出唯一权威。

研究输出只用于选择 takeover design 与 proof；不在研究阶段改 donor bytes、提升 Campaign claim、
创建空 `apps/` 占位或实现 Native Host。

## Research resolution

三项证据没有推翻完整母体保全，但对原锚点作了两个 material 收窄：

1. 固定 code tree 的 MIT 与连续历史支持 non-candidate direct transplant。当时公开材料未证明 4,014-file
   corpus 的 raw-source redistribution；后续维护者授权已 supersede 当时的 used-only/delete disposition。
   当前 binding direction 是完整 corpus、source-neutral line/fill/Glyph API 和 fixed/source/artifact exact proof。
2. `vendor/ui` 按发布拓扑而不是事实权威切分。Web-only 不可运行；Server-whole 会把 Product
   Control Plane 与旧 Engine Session/queue/retry/Package authority 一起搬入。正确路线是一次完整可运行
   依赖闭包的直接接管，随后在同一施工链用 typed Product ingress 与 isolated Native Host 绞杀旧权威。

因此最强反假设“整棵母体原样提升后长期边跑边清理”被否决；“按组件逐个挑选”同样被否决。现有
exact baseline 只保留为 T0 证据，不复制第二棵母体。下一阶段可以直接进入 Design，不需要第二轮
同类研究。
