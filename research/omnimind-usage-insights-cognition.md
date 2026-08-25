# OmniMind 使用洞察：从 Composer 圆环到 Settings 洞察页的产品认知

状态：`maintainer-converged / production-contract / implementation-candidate`

收敛日期：2026-08-25

原始认知核对基线：`main@67813a35575cd89382101b45dd9aca9418ecb6ae`。生产 shipped-code 基线为 `origin/main@17f0fb314c` 上的 `codex/usage-insights@e21307fddced082dfc4144b871430c8bdabf5fa4` candidate；该 exact pushed SHA 已完成 clean packaged journey，但尚未合并或发行。当前分支、后续提交与交付状态仍只看 Git、`execution-brief.md` 和 active Campaign 的 exact evidence，不能从本文标题或更新时间推断。

适用范围：OmniMind Composer 上下文圆环中的缓存信息，以及 Settings 中原 `Profile / 个人资料` 表面向 `Usage insights / 使用洞察` 的产品收敛。

## 0. 零记忆入口与权威边界

新会话在动设计或代码前，必须依次读取根 `README.md`、`architecture/README.md`、`architecture/workbench.md`、`execution-brief.md`、active Campaign、`research/README.md`，再读本文。本文把本轮维护者已确认的 taste、视觉判断、信息架构和源码反证沉淀为可复核认知，但不取代以下 owner：

- 稳定 UI、Settings、主题、响应式和双语合同只由 `architecture/workbench.md` 拥有；
- 当前工作与准入只看 `execution-brief.md`；
- 当前实现状态只看真实源码、Git 和 Campaign evidence，不能从本文推断“已经实现”；
- Provider/runtime 的 Token 语义只由 typed contract 与 adapter 事实拥有，前端不能根据图稿补猜。

本文中的证据类别：

| 标记                 | 含义                                                 |
| -------------------- | ---------------------------------------------------- |
| `DECISION`           | 维护者在本轮明确确认，后续不得以“更像仪表盘”为由反转 |
| `SOURCE FACT`        | 2026-08-25 当前源码的可复核事实，源码变化后需重验    |
| `PROTOTYPE EVIDENCE` | HTML 候选已验证的视觉或交互，不等于生产合同          |
| `INFERENCE`          | 为保持现有 owner、最小修改半径而得出的实现判断       |
| `OPEN`               | 仍缺维护者裁决；当前本文没有遗留 `OPEN` 项           |

## 1. 一句话结论

`DECISION`：不要把缓存率硬塞进现有圆环，也不要把 Settings 改造成可切换的 SaaS 数据大盘。圆环继续只表达当前上下文压力；缓存率作为低噪声的“最近一轮”详情留在圆环原浮层。长期回顾则把原 `个人资料` 的可见身份收敛为 `使用洞察`，完整保留五项统计条与年度活动热力图，再向下自然增加始终可见的 `模型使用` 和 `Token 使用` 两个独立区块；Token 图明确呈现缓存命中率、缓存输入、未缓存输入和输出，不呈现费用。

这不是一次视觉重做。它是把同一组事实放回正确时间尺度：

- Composer 圆环：回答“这一轮、此刻，上下文还有多少空间”；
- 圆环浮层：补充“最近一轮输入有多少命中缓存”；
- Settings 使用洞察：回答“过去一段时间，我如何使用 OmniMind”；
- Settings 用量与限额：继续回答“账户还剩多少，以及授权索引后的详细历史用量”。

## 2. 已锁定的产品决策

### 2.1 名称与页面身份

1. `DECISION`：用户可见名称从 `个人资料` 改为 `使用洞察`。
2. `DECISION`：目标不是建立头像、用户名或社交身份，而是让用户理解自己的 OmniMind 使用方式。
3. `DECISION`：页头标题为 `使用洞察`。
4. `DECISION`：简体中文副标题精确为 `了解你如何使用 OmniMind`，末尾没有句号。
5. `DECISION`：删除副标题中的 `所有统计都仅保存在此设备上`。这句话不应常驻占据首屏，也不能在没有逐数据源证明时笼统承诺。
6. `INFERENCE`：内部 section ID 保持 `profile`。`architecture/workbench.md` 要求 Settings taxonomy 的稳定 ID 与可见文案解耦；改可见名称不构成新 route、迁移或 deep-link 破坏的理由。
7. `DECISION`：导航使用现有中央 icon owner的洞察/图表图标，不手绘页面专属图标。

### 2.2 不可打乱的页面顺序

`DECISION`：目标页沿用旧结构，信息只能向下自然延展。主序列固定为：

1. 页头：`使用洞察` + `了解你如何使用 OmniMind`；
2. 现有五项统计条；
3. 现有 `活动` 年度热力图；
4. 新增、独立、默认可见的 `模型使用`；
5. 新增、独立、默认可见的 `Token 使用`；
6. `工作重心` + `工作方式`；
7. `技能与 Agents`（英文为 `Skills & Agents`）。

以下行为被明确否决：

- 不把 `活动 / 模型 / Token` 做成 tab、segmented control、carousel 或互斥 panel；
- 不让活动区参与任何切换；
- 不默认折叠或隐藏模型图、Token 图；
- 不用“首屏更像仪表盘”作为重做顶部的理由；
- 不把模型或 Token 信息挤进五项统计条；
- 不以一个缓存率圆环替换完整 Token 趋势。

响应式允许两个新增区块在真实宽度下改变内部排版或纵向堆叠，但“始终存在、向下滚动即可看到”是不变量。

### 2.3 五项统计条

`DECISION`：五项与顺序保持：

1. `累计 token`
2. `峰值日期`
3. `提示词总数`
4. `当前连续天数`
5. `最长连续天数`

视觉要求：

- 仍是一整条克制的分段容器，不拆成五张浮卡；
- 每项数值与标签都在自己的分栏内水平居中；
- 数字使用 tabular numerals；
- 边界与圆角服从 Settings 现有 token 和节奏，不提高装饰等级；
- HTML `dl/dd/dt` 实现必须显式清除浏览器默认 `dd` margin。原型中“看起来没有居中”的直接原因正是默认 `dd` 外边距；只写父元素 `text-align:center` 不足以证明几何居中。

`SOURCE FACT`：当前 `ProfileSettingsPanel.tsx` 第二格 label 已是 `峰值日期`，合同也已有 `peakDay`，但 UI 实际渲染的是 `peakDayTokens` 的紧凑数值。这是现存 label/value 不一致。目标实现必须渲染本地化日期，不能继续用峰值 Token 数冒充日期。

原型中的 `8.6M / 8 月 20 日 / 2,714 / 6 天 / 14 天` 只是假数据，不是默认值、验收 fixture 或业务阈值。

### 2.4 活动热力图

`DECISION`：保留现有年度活动热力图的外观、信息密度、位置和单色强度逻辑，不因为新增图表重画它。

具体不变量：

- 约一年、按周 × 星期排列；
- 空单元格低对比，活跃程度只用同一主题 accent 的强度变化；
- 月份标签、单元格密度、间距和当前 Tooltip 行为不为“统一图表风格”而改变；
- 不套新的 card surface，不追加 tab，不变成面积图或柱状图；
- Token 数据可用时沿用当前 Token/day，Token telemetry 不可用时沿用 prompts/day fallback；不能为了匹配原型文案而删除真实 fallback。

`SOURCE FACT`：当前 `ActivityHeatmap` 已有 fill、底部月份、0–4 intensity、即时 Tooltip 和不横向滚动的实现；`selectProfileHeatmap` 在 `ProfileTokenStats.available` 时选择 tokens，否则选择 prompts。优先复用，不能另造第二热力图组件。

`PROTOTYPE EVIDENCE`：原型出现的 `过去一年 · 按 Token 活动` 可作为 tokens 模式的辅助文案候选，但不是取消 prompts fallback 的授权。

### 2.5 模型使用

`DECISION`：活动下方新增独立的 `模型使用`，让用户一眼看出自己主要喜欢或常用哪些模型。

目标表达：

- 采用横向排名条，而非饼图、圆环或密集竖柱。模型标识通常较长，横向条能同时保留完整身份与比较关系；
- 排名、模型名和占比是主信息；来源/Engine 是次级事实；
- Provider/model 的真实品牌身份保持原文，不为“中文一致”翻译模型名；普通中文文案用 `来源`，不把内部 `Provider` 术语暴露为页面主标签；
- 条形颜色消费主题 accent 的语义角色，不使用通用 SaaS 蓝；
- Tooltip 可给出模型名、占比、精确 Token 或使用次数、来源和统计范围，但必须与实际 metric 一致。

`DECISION`：范围固定为包含今天在内的最近30个本地自然日，metric固定为真实user-origin运行轮次/模型选择次数，不使用Token占比。展示前五个已知模型；其余已知模型聚合为`其他模型`，无法确定模型的轮次独立为`未知模型`。百分比由同一owner计算并精确合计100%；legacy删除记录缺少逐轮日期或unknown模型时coverage为partial，而不是伪造归因。

### 2.6 Token 使用与缓存率

`DECISION`：活动和模型使用之后，新增独立 `Token 使用` 图。它只呈现 Token 消耗，不引入费用。

最低信息合同：

- 头部直接呈现缓存命中率；
- 图中始终区分 `缓存输入`、`未缓存输入`、`输出`；
- 图例常驻可见，不要求用户先 hover 才理解颜色；
- 日级堆叠柱是当前优选，因为它同时表达每日总量、输入结构与趋势；
- Tooltip 头部显示日期与当日总 Token，明细逐行显示缓存输入、未缓存输入、输出；
- 不出现人民币、美元、估算费用、价格版本、API list price 或订阅费用。

#### 2.6.1 展示口径

UI 需要一个跨 Provider 归一后的互斥桶合同：

- `C`：真正命中既有缓存而读取的输入 Token；
- `U`：没有命中既有缓存的输入 Token；缓存创建/写入若单独报告，也属于未命中输入，不得算作命中；
- `O`：输出 Token。若 Provider 把 reasoning output 独立报告，owner 必须根据该 Provider 的真实语义确保其进入输出一次且只进入一次；
- `I = C + U`：可比较的总输入；
- `R = C / I`：缓存命中率；当 `I = 0` 时显示不可用，不显示 `0%`；
- `T = C + U + O`：图表的展示总量。任何额外 bucket 必须先明确是否已包含在上述字段中，不能重复相加。

输出 Token 不进入缓存命中率分母。缓存写入不等于缓存命中。Provider 未提供可比较拆分时，不得把未知值当成零缓存；跨 Provider 聚合只对可比较输入计算命中率，并用克制的 Tooltip/辅助说明披露覆盖不足。

#### 2.6.2 当前数据缺口

`DECISION`：runtime合同已收敛为互斥`TokenUsageBreakdown`，session累计值只在`totalTokenBreakdown`，最近已结算请求只在`lastTokenBreakdown`；旧含义不一致的input/cache/output/reasoning scalar退出合同。Codex、Pi、Claude和OpenCode的精确归一口径由`architecture/execution.md`拥有，ACP/其他无法证明拆分时省略。Profile按同一客户端UTC offset导出补齐的30天日级C/U/O、cache ratio、coverage和unsupported Provider；重复累计快照、counter reset与模型切换均在owner做delta，不在React修补。

### 2.7 费用边界

`DECISION`：使用洞察页没有费用。用户明确指出原版没有费用，并要求这里是 Token 消耗。

不得因为现有 `Usage history` 合同已有 `estimatedCostMicros`，就把它顺手带入使用洞察。也不得显示“当前约节省多少钱”“缓存节省费用”等衍生指标。

`SOURCE FACT`：`Usage & limits / 用量与限额` 是另一个既有 section，含账户额度和经授权索引的历史用量；后者可以按 Provider/模型/工作区/日期查看 Token 与带定价版本的费用估算。它与使用洞察的职责不同。

职责边界：

| 表面       | 用户问题                         | 数据/交互特征                                                  | 不应接管                           |
| ---------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------- |
| 使用洞察   | 我平时怎样使用 OmniMind          | 低操作性、固定概览、活动/模型/Token 行为回顾                   | 账户余额、索引控制、费用、复杂筛选 |
| 用量与限额 | 还剩多少；授权后的详细历史是什么 | 账户 capacity、授权、索引进度、range/group、恢复动作、费用估算 | 个人画像式首屏或年度活动身份       |

两页可能共享底层 Token 事实，但不能共享模糊文案、互相接管控制面，或通过复制 store 形成两套真相。

## 3. 圆环方案的最终定位

### 3.1 为什么不把缓存率编码进圆环

`DECISION`：现有圆环继续只表示上下文占用/压力。一个 16px 左右的圆环如果同时表达“上下文已用百分比”和“缓存命中百分比”，会出现两个数值竞争同一形状、颜色和方向，用户无法在不读说明的情况下知道它到底代表什么。

缓存率与上下文占用还属于不同时间尺度：

- 上下文占用是当前 Session/Composer 的即时容量状态；
- 缓存命中是一次请求或一段历史的输入复用效率。

把二者放进同一个圆环会让形状语义不稳定，也会逼迫 Composer 增加颜色、双环或标签，破坏现有密度。

### 3.2 圆环处允许的最小增强

`DECISION`：Composer 外观和圆环尺寸不因缓存率改变。圆环浮层可以在原“上下文窗口”信息下补一行最近一轮缓存命中：

`缓存命中 86% · 42k / 49k 输入`

要求：

- 数值必须是最近一轮真实可比输入，不是 lifetime 平均；
- `42k / 49k` 分别是缓存命中输入与总可比输入；
- 无真实缓存字段时整行不显示，不能显示 `0%`；
- 圆环本身、上下文占用主值、剩余量与累计处理量仍保持原语义；
- trigger 的 accessible name 同时准确描述上下文占用与最近一轮缓存命中；
- 不新增第二圆环、双色环、常驻大号百分比或费用信息。

`PROTOTYPE EVIDENCE`：旧 HTML 候选验证了高缓存、低缓存、无数据三种状态，以及浮层中缓存行的最小占位。它是 Composer 微增强候选，不是长期洞察页的替代品。

## 4. 视觉 taste：什么才是 OmniMind

### 4.1 总体气质

`DECISION`：旧 Settings 节奏优先。新增内容应像原生长在页面里，而不是换成一套“数据产品模板”。关键词是：低 chrome、低装饰、克制边界、真实层级、足够留白、信息直接。

应当：

- 用字号、字重、间距、分隔线和主题色强度建立层级；
- 图表直接落在开放 section 中；
- 保留大面积安静背景；
- 让数据本身成为主体，交互只在需要时浮现；
- 使用现有 Button、Tooltip、focus ring、divider 和 surface primitive。

不应：

- 大片灰底卡墙、每个指标一个 card；
- 通用 SaaS 亮蓝、渐变、玻璃、霓虹或营销式阴影；
- 多个 pill/badge、切换器和筛选器挤在 section header；
- 为“丰富”增加无决策价值的说明、图标或装饰；
- 把参考截图的橙色、蓝色、卡片灰底直接搬进 OmniMind。

### 4.2 颜色

`DECISION`：所有生产 React DOM 表面只消费 Appearance owner 发布的语义 tokens；业务组件不检查 `omnimind` preset ID，不硬编码 light/dark palette，不维护 chart 专用品牌色表。

`SOURCE FACT`：2026-08-25 OmniMind preset seed 为：light accent `#526fff`、dark accent `#6073cc`、light surface `#fcfcfc`、dark surface `#0e0e0e`。原型用它们校准出更适合文字与图表的派生角色；这些 hex 只证明原型没有手配通用蓝，不是生产组件的硬编码合同。

图表角色建议：

- 缓存输入：最强 accent；
- 未缓存输入：同一 accent 的较低强度；
- 输出：中性 foreground 混合色；
- 空热力格/轨道/grid：elevated-secondary、muted 或 border 语义角色；
- hover/focus：共享 Tooltip/focus token。

颜色不能是唯一识别手段；Token 图例和 Tooltip 文本必须常在或可达。

### 4.3 Hover Tooltip

`DECISION`：维护者认可参考图中“hover 时出现不透明长方形白底框”的信息承载形式，但明确要求不要着相。

真正应吸收的是：

- 信息在 hover/focus 时集中出现，不污染静态图；
- 日期/对象与总量在头部，分项名称和值左右对齐；
- 容器不透明、边界清楚、可从图表背景上稳定读取；
- 密度紧凑但不拥挤。

不应机械复制的是固定白色、参考站圆角、阴影、颜色或尺寸。正确实现是 light theme 使用当前 elevated surface 的浅色不透明面，dark theme 使用当前 elevated surface 的深色不透明面，并服从同一 border/shadow token。它不是透明玻璃。

Tooltip 必须同时支持 pointer 与键盘焦点；触摸/窄屏需要 click/tap 或可达的替代详情，位置必须 clamp 在图表内，不能溢出窗口。

## 5. 几何、宽度与响应式

### 5.1 生产宽度真相

`SOURCE FACT`：当前 Settings route 对 `profile` 使用：

```tsx
className = "mx-auto w-full px-6 py-8 max-w-3xl";
```

Tailwind `max-w-3xl` 为 48rem，即 768px；左右 `px-6` 各 24px，因此最大内容宽约 720px。目标实现应沿用这条 route owner，不新增页面级 830px 宽度。

`PROTOTYPE EVIDENCE`：最终 HTML 候选 `.om-page` 是 `width: min(100%, 830px)` 且左右 padding 各 42px，最大内容宽约 746px，比生产 Settings 内容宽约宽 26px。维护者发现的“宽度不太对”是真实问题。此前 360px 截图还曾来自残留测试 wrapper，不能作为桌面宽度证据。

结论：

- 原型外壳的 1120px window、218px 假 sidebar 只用于看整体气质；
- 生产以现有 Settings shell 和 `max-w-3xl` 为准；
- 实现时先在真实 route 里验证，不把原型 CSS 原样搬运；
- 不能通过扩大整个 Settings 宽度给图表让路。

### 5.2 480px 下界

`SOURCE FACT`：OmniMind Desktop 支持连续缩窄到 480×620。使用洞察必须是同一 mounted surface 的响应式变化，不能另建 mobile route/store。

最低要求：

- 页面无横向 overflow；
- 五项统计可从五列自然变为两列，最后一项可以跨满一行，但阅读顺序不变；
- model label 不被百分比挤掉，必要时换行或截断并提供完整可达名称；
- 图表缩窄或内部降密度，不用横向页面滚动；
- Tooltip 保持在可见边界内；
- 模型和 Token 区块仍默认可见，不能以“移动端空间不足”为由变成 tab；
- 简中/英文、CJK、键盘、读屏、reduced motion 一起验证。

原型中的 `<520px` 两列统计、第五项跨列、隐藏导出按钮等只证明可行性；除“无 overflow、内容不隐藏”外，具体 breakpoint 和动作降级没有被维护者逐项锁定。

## 6. 当前真实调用链：已有、部分已有、缺失

以下绑定 2026-08-25 源码快照，动工前必须重验。

### 6.1 已有

- Settings descriptor：`apps/web/src/settingsNavigation.ts` 的 stable `id: "profile"`；
- route dispatch：`apps/web/src/routes/_chat.settings.tsx` → `ProfileSettingsPanel`；
- profile 最大宽度：route-owned `max-w-3xl`；
- core stats RPC：提示词、连续天数、活动、轮次型模型/Provider/Skill 数据；
- token stats RPC：累计总 Token、峰值日期/峰值 Token、年度 Token heatmap、按 Token 的 Provider/model 排名；
- web selectors：Token 可用时优先 Token metric，否则用 turns/prompts fallback；
- `ActivityHeatmap`：现有生产组件；
- Profile activity 本地 export/copy/save 能力；
- 中英 message catalog owner。

### 6.2 candidate 已完成的生产实现

- stable `profile` ID下的双语`Usage insights / 使用洞察`与精确无句号副标题；
- 身份UI和localStorage读取退出，五项统计条保持一体式并修正真实峰值日期与`dd`几何居中；
- 现有ActivityHeatmap原位复用；
- 30天user-origin模型排名、30天日级C/U/O与缓存命中、coverage和单一roving chart focus；
- lifetime工作重心、工作方式、可展开Skills/Agents；
- 1200×1600 identity-free完整摘要、固定文件名与local copy/save；
- canonical runtime breakdown、四类Provider normalization、Profile delta和删除归档migration/测试。

### 6.3 已闭合的交付证据与剩余边界

- exact shipped-code commit `e21307fddced082dfc4144b871430c8bdabf5fa4` 已推送到 `codex/usage-insights`；
- MiMo 与 DeepSeek 的真实重复前缀均提供可证明 cache detail；第二轮 cache read 已进入 Pi stats 与 canonical breakdown。ACP 或其他未提供可信互斥拆分的来源继续是 unknown，不显示伪造的 `0%`；
- 该 exact pushed SHA 已从 clean clone 构建 arm64 packaged App，并在 fresh、任务专用的 `userData`、home 与 Provider private home 中证明主进程、Helper、Server 均使用隔离路径；
- packaged journey 已闭合真实 DeepSeek 两轮请求、Composer 最近一轮缓存行与 accessible name、先访问空洞察后立即返回的 RPC 刷新、中文/英文、浅色/深色、480px 最小窗口、1200×1600 PNG copy/save、关闭重开与数据持久化；
- 自动化覆盖 200% zoom、reduced motion、长模型名、极大数值、Token 图 pointer/键盘/触摸与 Tooltip；focused、Web/Server 全量、typecheck、lint、scoped format、production build 均通过。并行工作区中的 Ask User 修改未被 stage、覆盖或混入提交；
- DMG SHA-256 为 `dfc634da44d546b2b72c4c96cc4156521a1b5ac5478cc6e116d88cfe8b596495`，packaged `app.asar` SHA-256 为 `390c1cb62bfd852f303ba2f1d4dec60e272ec63c17d01250563257466fb048a5`。这些是 candidate evidence，不等于合并 `main`、公开 Release 或修改 update feed。

### 6.4 不应复用为捷径的链路

`Usage history` 的 archive indexer 已有 input/output/cache/cost rows，但它需要用户授权，只覆盖其支持的外部 session archives，并拥有 indexing/partial/paused/stale 生命周期。不能为快速画图把它静默变成使用洞察的唯一数据源，也不能打开使用洞察时触发归档扫描。若未来要共享派生事实，必须先证明 source coverage、同意边界和 owner 合同一致。

## 7. 最小完整实现路径

以下已成为production implementation合同，而不是原型建议。

1. 保留 `profile` stable ID、route、query owner 与 `max-w-3xl`；只改双语 label/description 和 panel presentation。
2. 移除或退出首屏 identity-centric header；建立正常 Settings 页头：标题、副标题和真实 export action。
3. 原样保留五项统计条与 `ActivityHeatmap`，修正 `peakDay` value 和 `dd` centering。
4. 由Profile owner固定投影最近30天user-origin模型选择，活动下方以横向排名条显示。
5. 在 runtime usage projection/profile-stats owner 中保留 canonical component deltas；扩展现有 `ProfileTokenStats`，不新建平行 RPC/store。
6. 在同一 panel 内新增 Token 图，消费 typed daily buckets 和 coverage；缓存率只由 owner 给出的 comparable totals 计算或直接由 owner 导出。
7. 复用共享 Tooltip/Button/Icon/semantic token；不要复制原型 palette、SVG state machine 或假 sidebar。
8. 同一变更闭合 en/zh-CN catalog、loading/empty/partial/error、Tooltip、ARIA 和日期/数字格式。
9. focused tests 先证明 adapter normalization、日界线、增量重置、model switching、deleted-thread lifetime semantics；再做真实 Settings browser journey。

## 8. 空态、部分数据与失败语义

页面不能用漂亮图形掩盖数据不完整。

- core stats 失败：沿用当前整页 retry，不伪造零值；
- token stats pending：统计值与 Token-dependent 区块使用稳定 skeleton，不让五项宽度跳动；
- lifetime Token unavailable：累计 Token/峰值日期显示不可用；活动继续使用 prompts fallback；
- model Token telemetry unavailable：允许按 turn count fallback，但必须准确标注 metric；
- Token breakdown 全部不可用：不显示 0% 缓存命中；区块显示克制的“尚无可比较的缓存数据”，活动与模型区不受影响；
- 只有部分 Provider 支持 breakdown：画已知数据并披露 coverage，不把 unknown 归入未缓存；
- 某日无输入只有输出：该日可画输出，缓存率该日不可用；
- 日界线使用 client 传入的固定 UTC offset，与现有 profile heatmap 一致；不能一张图按 UTC、另一张按本地日。

`DECISION`：部分覆盖统一使用克制的`部分较早的本机历史未计入 / Some earlier local history is not included.`；完全无可比拆分显示缓存命中率不可用/尚无可比较缓存数据，不暴露adapter、payload或telemetry术语。

## 9. 原型中哪些被接受，哪些不能继承

### 9.1 可作为目标证据

- `使用洞察` 页名与无句号副标题；
- 顶部五项分段统计、全部居中；
- 活动 → 模型使用 → Token 使用的纵向顺序；
- 模型横向条；
- Token 日级堆叠柱和常驻图例；
- 不透明、紧凑、主题化 Tooltip；
- 无 tab、无费用、低 chrome；
- light/dark 与窄宽 clamp 的视觉可行性。

### 9.2 仍然只是 fixture

- 所有数字、日期、模型、百分比、项目、Skill/Agent 排名；
- `286 次模型选择`等具体数值；范围本身已固定为最近30天；
- 示例中的具体项目、思考强度、时段与Skill/Agent名称；下半区存在、命名和顺序已锁定；
- 原型toast的具体动效；生产动作已锁定为`导出摘要`且产物必须是完整摘要；
- 830px page width、假 window/sidebar、具体 breakpoint；
- 原型 CSS 中成对 light/dark hex 与手写 SVG/JS；
- Tooltip 的固定像素尺寸、圆角与 shadow。

后续会话若把这些 fixture 当成需求，即为误读本文。

## 10. 交互与可访问性验收

### 10.1 静态结构

- DOM 顺序与视觉顺序一致：header → stats → activity → model → token；
- 页面不存在 `role=tablist` 或把三块内容互斥的状态；
- 图标题与 meta 是真实文本，不只存在于 SVG `<title>`；
- Tooltip 内容有键盘或触摸等价路径；
- 图例不依赖 hover；
- Provider/model identity 保持事实原文。

### 10.2 键盘与读屏

- 每个可交互 bar/day 可通过合理的聚合方式聚焦，不能制造数百个无序 Tab stop；
- focus-visible 清楚且来自主题 token；
- Tooltip trigger 有对象、日期、总量和分项的可理解 accessible name/description；
- pointer 离开、Escape、focus 转移时关闭，焦点不丢失；
- SVG 有标题/描述或等价的隐藏数据摘要；
- reduced-motion 下不依赖动画理解数据。

### 10.3 视觉矩阵

- OmniMind light、dark、System 两槽；
- 简体中文、英文；
- 480、典型 Settings 宽、宽屏；
- empty、loading、partial、full、极端长模型名、单一模型 100%、超大 Token；
- hover/focus Tooltip 在左缘、右缘、首柱、末柱不溢出；
- 200% zoom 和 CJK 字体下无关键内容裁切；
- 色彩对比、图例、焦点和非颜色识别通过。

## 11. 数据与回归验收矩阵

| 场景                                     | 必须证明                                                     |
| ---------------------------------------- | ------------------------------------------------------------ |
| Codex cached input 是 input subset       | 归一后 C/U 互斥，总量不重复                                  |
| Pi/OpenCode cache 字段与 input 分列      | 不错误执行 `input - cache` 导致负数或漏计                    |
| cache creation/write                     | 不冒充 cache hit；按真实语义进入 U 或明确不可比              |
| reasoning output                         | 进入 O 一次，不与 output 重复                                |
| 同 Thread 切换 model/Provider            | 日级 Token 和模型排名归因到真实处理该 turn 的选择            |
| cumulative counter reset/compact/restart | delta 不变负、不重复累计                                     |
| Provider 只发 usedTokens                 | 活动总量可 fallback，cache rate 保持 unknown                 |
| 部分 Provider 无 telemetry               | 模型/热力 fallback 真实，综合 cache rate 不把 unknown 视为 0 |
| 删除 Thread/Project                      | 继续服从现有 lifetime archive 语义，不因 UI 改造改变统计历史 |
| local timezone                           | 峰值日期、heatmap、Token 日柱使用同一日界线                  |
| I = 0                                    | cache rate 不显示 0% 或 NaN                                  |
| C > I 的畸形输入                         | owner fail/normalize 并记录测试，UI 不自行掩盖               |

## 12. 压力测试与 stop-loss

### 12.1 Strategy 压力测试

反对意见：使用洞察与用量历史都显示 Token，是否重复？

裁决：允许共享事实，不允许共享职责。使用洞察是固定、低操作性的行为回顾；用量历史是经授权索引、可筛选、可恢复且含费用估算的诊断/账户表面。若实现开始把 range/group/index controls 搬到使用洞察，说明边界已失守。

### 12.2 Execution 压力测试

反对意见：现有 `cachedInputTokens` 已存在，前端直接减一下即可。

裁决：不成立。adapter 对 input/cache write/read 的包含关系不同；前端计算会把协议差异固化成展示 bug。必须在 owner 附近归一，并用跨 Provider fixture 证明互斥桶。

### 12.3 Adoption 压力测试

反对意见：长页面信息太多，做 tab 更清爽。

裁决：维护者已明确拒绝。该页面的价值就是无需切换即可看到活动、模型偏好和 Token 结构。用 spacing、section divider 和滚动组织，而不是隐藏内容。

### 12.4 Stop-loss

出现任一情况必须停止候选并回到 owner/设计判断，不得继续堆补丁：

- 新建第二 usage database、profile store、history indexer 或 chart palette；
- 为改名迁移 `profile` section ID 或另建顶层导航；
- 模型/Token 与活动变成互斥 panel；
- 为适配图表扩大整个 Settings shell 或绕过 `max-w-3xl`；
- 前端猜测 cache/input 包含关系；
- unknown cache telemetry 被显示成 `0%`；
- cache write 被计作命中；
- 使用洞察出现费用；
- 普通 DOM 硬编码 OmniMind preset hex 或通用 SaaS 蓝；
- 原有 ActivityHeatmap 被复制或视觉重做；
- 只验证 mock HTML，没有真实 route、数据和 packaged App 证据，却宣称生产完成。

## 13. 未来修改半径演练

- 新增一个 Provider：只需该 adapter 投影 canonical usage 或准确标为 unsupported；Profile/Token 图不新增 Provider 特判。
- Provider 修改 cache schema：只改 adapter normalization 与 focused fixture；React chart 不改。
- 新增/删除一个模型：现有 model usage owner 自动投影；UI 不维护模型清单。
- 换主题 preset：图表自动消费 resolved semantic tokens；Usage Insights 不改。
- 改可见名称或翻译：只改同一 message slice；stable `profile` ID/deep-link 不改。
- 退休 Token breakdown：删除 typed fields 和两个 consumer projection 即可，不遗留第二 store、migration 或 chart registry。
- 未来加入账户同步：必须先替换 profile stats 的唯一 authority 和冲突语义；本文不授权在 local profile 与云端双写。

任一演练若要求同时手改多个 Provider 映射、Settings palette、Usage History store 和 Profile chart，说明 seam 仍不够窄，候选冻结前必须简化。

## 14. 新会话的施工前检查单

1. 重读当前 `architecture/workbench.md` 的 Settings、Usage & limits、主题、480px、i18n 条款。
2. 重验 `settingsNavigation.ts`、`_chat.settings.tsx`、`ProfileSettingsPanel.tsx`、`profileSelectors.ts`、`profileStats.ts`、`packages/contracts/src/stats.ts` 和 runtime token snapshot；不要依赖本文的行号。
3. 明确列出当前每个 Provider 的 input/cache-read/cache-write/output 包含关系；无法证明的标 unsupported/partial。
4. 先冻结 canonical `C/U/O` 合同和日级 delta fixture，再画图。
5. 保留 `profile` internal ID、现有 route、max width、heatmap owner 和 query owner。
6. 实现顺序严格保持 stats → activity → model → token；不创建 tab。
7. 简中标题/副标题/section/Tooltip/空态与英文同变更闭合。
8. 在真实 Settings route 验证几何；原型只作视觉参照。
9. 完成 focused data tests、browser matrix、production build；若改变 Desktop 用户可见字节，再按仓库规则从 exact pushed SHA 做 fresh isolated packaged journey。
10. 报告时区分 source candidate、browser evidence、packaged evidence 和 release；不把 HTML 原型或局部测试写成已交付。

## 15. 最终不可变判断

如果后续只记住五件事，应当是：

1. 圆环只管上下文压力；缓存率不抢占圆环语义。
2. `使用洞察` 是原 Profile 可见身份的收敛，内部 `profile` ID 不动。
3. 五项统计条和年度活动热力图先保持原样，模型与 Token 只向下新增且始终可见。
4. Token 图的核心不是“更好看的图”，而是可信的缓存命中率与 `缓存输入 / 未缓存输入 / 输出` 互斥事实；没有真实数据就准确显示未知。
5. OmniMind taste 是克制、原生、低 chrome、语义 token 驱动；没有费用、没有通用 SaaS 蓝、没有卡墙、没有 tab 化重做。
