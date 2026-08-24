# OmniMind 主题系统：零记忆全局审计与扩展地图

> 更新时间：2026-08-24
>
> 角色：固定源码事实、反例、管理判断、变更演练与复验入口。
>
> 权威边界：稳定用户合同只看 [`architecture/workbench.md`](../architecture/workbench.md#主题与换肤)；跨进程投影只看 [`architecture/execution.md`](../architecture/execution.md)；当前施工/证据状态只看 [`execution-brief.md`](../execution-brief.md)。本文不能推翻它们，也不建立第二 Theme Registry、roadmap 或完成状态。

## 1. 零记忆结论

OmniMind 已经有一套值得保留的主题内核，不应重写：

- 一个 renderer-owned `ThemeState` 保存模式、明暗两个主题槽、自定义色、字体、对比度与窗口材质意图；
- 一个纯 `theme.logic.ts` 负责normalization、主题预设、导入导出、派生色与CSS token；
- `useTheme.ts` 是唯一运行时投影与writer，负责local profile持久化、system appearance订阅、DOM token与Electron明暗同步；
- Shell、Settings、Terminal、Diff、Browser annotation已经大体消费语义token或窄resolved projection；
- `light|dark`应继续只是color-scheme/对比基槽，未来新增主题不应继续膨胀这个枚举。

2026-08-24审计证明的主要问题不在核心，而在外围修改半径：

1. `@omnimind/om-web-access` 的内部Curator/observer只收到`light|dark`，又维护一套固定黑白palette；自定义暖色或未来主题会在这里静默失效。
2. 主题seed catalog已经拥有实际预设字节，但另有手写预设列表及按preset ID分叉的字段应用metadata，重复声明ID、顺序、明暗槽与字体/对比度/窗口材质套用语义；新增rich主题需要同步多份事实。
3. UI把整套App palette预设称为“代码主题”，但Shiki与Pierre Diff实际只根据`light|dark`选择固定GitHub syntax theme；用户语言和代码概念不诚实。
4. 全仓存在大量硬编码颜色，但不能用“全部替换成token”处理：其中混合了产品chrome、品牌identity、内容、截图/导出、设备bezel、图片遮罩、状态语义、第三方页和首帧fallback。机械清理会破坏真实边界。

本轮采用`SIMPLIFY / CONSOLIDATE`而非重建：主题preset identity、variant、seed与选择时字段应用语义从同一catalog descriptor派生；普通UI改称“主题预设”；新的分享串归一为`omnimind-theme-v1`，旧`codex-theme-v1`只作为有界reader输入；OmniMind-owned Engine Web Surface消费appearance owner生成的credential-blind resolved snapshot。Appearance owner同时把原始身份/装饰色与可读文本角色分开派生，避免在页面逐个修正不合格对比度。上游/default profile仍可保留作者fallback。

## 2. 维护者 taste：什么才叫“主题完整”

主题不是“页面背景随明暗变化”，而是用户选择一次后，所有**OmniMind自己拥有的chrome**自然一致；同时所有**不属于OmniMind的内容**保持原貌。

必须做到：

- 颜色来自语义角色，不来自“当前主题叫A/B/C”；
- 新增主题主要是增加数据，不是增加组件分支；
- 明亮主题不允许右侧Browser、内部搜索页、弹层或Terminal突然掉回黑色；
- 深色、暖色、高对比或未来品牌主题都应沿同一解析链自动投影；
- UI、读屏、focus、loading/error/recovery和terminal状态一起换肤，不只静态截图；
- 原色Provider/品牌mark不反色、不统一单色、不被主题accent替代；
- 网页、PDF、图片、设备屏幕和用户内容不被App强制滤镜；
- 同一renderer内的主题变化只重绘presentation，不重启Run、Session、Tab、Terminal或Browser lifecycle；隔离页面在完整surface生命周期内保持创建时snapshot，关闭Tab后的exact reopen仍复用该snapshot，只有新surface才取当前主题，不为换肤增加持续同步控制面；
- 普通用户看到“主题预设”，而不是内部字段、seed、codeThemeId或实现来源；
- 未来修改一个主题时，修改半径小、测试定位明确、删除可回滚。

明确拒绝：

- 第二套`ThemeManager`、Server Theme store、Browser palette registry或云端双写；
- 每个主题一组`.theme-x` / React variant / Tailwind `dark:`分叉；
- 把`light/dark`扩成所有命名主题；
- 让Curator、Browser、Terminal、Diff各自维护完整palette；
- 运行时下载主题CSS、字体、图标或favicon；
- 为了“统一”重染品牌、内容、截图或第三方页面；
- 用全仓硬编码颜色lint取代owner和surface判断。

## 3. 当前真实调用链

```text
Appearance UI / Sidebar search / import
  → useTheme (唯一writer、local profile persistence、system listener)
    → ThemeState
      → resolveThemeVariant(system|light|dark)
      → resolveThemePack(light slot | dark slot)
      → buildResolvedThemeTokens / buildThemeCssVariables
        ├─ documentElement semantic CSS variables
        ├─ data-theme-variant / data-theme-preset-id / window material
        ├─ Electron nativeTheme.themeSource (只投影system/light/dark)
        ├─ Terminal resolved ANSI palette
        ├─ Diff/Markdown syntax light|dark projection
        ├─ Browser annotation bounded numeric colors
        └─ App/appearance composition发布Engine Web Surface bounded presentation snapshot
             → Desktop Browser转交
             → Server presenter转交
             → Curator/observer只渲染
```

### 3.1 唯一状态与writer

| 责任                                                 | 当前owner                                                          | 事实                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| 模式、两槽ThemePack、字体、对比度、材质意图          | `apps/web/src/theme/theme.logic.ts`                                | `ThemeState`归一化，pure functions负责派生 |
| 本地持久化、system media query、storage同步、DOM写入 | `apps/web/src/hooks/useTheme.ts`                                   | key为`omnimind:theme`；没有Server/DB副本   |
| Appearance交互                                       | `_chat.settings.tsx`、`ThemeModePicker.tsx`、`ThemePackEditor.tsx` | consumer，不拥有palette                    |
| Electron原生主题                                     | `apps/desktop/src/main.ts`                                         | 只接收OS可表达的`system/light/dark`        |
| 内部Engine网页呈现                                   | Root appearance composition → Contracts → BrowserManager → PiAdapter → package presenter | Contracts唯一拥有snapshot字段与bounded parser；App根组合发布locale、variant与resolved snapshot，feature页面不拥有；其余层只转交或渲染 |

当前localStorage不是“低级实现错误”。在单本地profile、单renderer产品事实下，它是最窄owner。未来若要账号同步/跨设备/多窗口，真正待裁决的是authority、conflict、offline和隐私，不是先加一个Server副本。正确升级是替换writer或建立明确单向同步owner；错误升级是localStorage与Server双写。

### 3.2 数据模型的正确理解

- `ThemeMode = system | light | dark`：用户如何选择对比变体。
- `ThemeVariant = light | dark`：CSS `color-scheme`、OS chrome与可读性算法的两个基槽。
- `ThemePack`：一个槽中的preset identity、chrome palette、字体、语义色和代码显示选择。
- `ChromeTheme`：surface、ink、accent、contrast、fonts、window material、diff/skill语义色。
- `ResolvedThemeTokens`：消费者真正应该读取的语义结果。

源码中的`codeThemeId/codeThemeIds`是继承的持久字段名，当前语义实际是**App主题预设ID**；正常UI不得照搬该名字。是否在未来schema中物理改名，应由一次独立、证据充分的持久化演进决定，不能为了目录整齐临时造双写。当前新share payload使用`presetId`，旧字段仅由有界parser读取。

### 3.3 主题目录

`apps/web/src/theme/theme.seed.generated.ts`包含实际bundled preset descriptor。2026-08-24以前，`theme.logic.ts`另有`CODE_THEME_OPTIONS`手写ID/顺序/variants，以及按九个preset ID维护字体、对比度和窗口材质套用规则的第二metadata表；两者可漂移。当前候选将`THEME_PRESET_OPTIONS`与选择时patch都从同一descriptor派生，只有少量纯展示label override，不再重复成员、variant或rich seed应用事实。

这里的preset是**可编辑模板**，不是live-linked theme：选择preset时把seed合并进当前槽，之后`chromeThemes`持久化完整palette并允许用户继续修改；`resolveThemePack`读取持久值，不会因为未来同ID seed变化而覆盖已有profile。因此“只改seed”的修改半径只描述实现、新profile和用户下一次明确套用的结果，不代表无迁移地更新全部既有用户。若维护者未来要求linked preset，必须单独裁决自定义覆盖、版本、迁移、冲突与回滚，不能把当前normalizer偷偷改成远端/catalog authority。

新增一个主题预设的理想修改面：

1. 在唯一seed catalog加入stable ID、一个或两个variant的真实seed，以及该模板确需套用的可选字体、对比度与窗口材质字段；
2. 如品牌大小写不能可靠从ID派生，只在同一owner补label override；
3. 增加focused rich-preset、全catalog 4.5:1文本对比、快照测试和必要视觉journey；
4. 不手改Settings、侧栏搜索、Browser、Curator、Terminal、Diff或Provider图标表。

若第4步失败，说明出现第二owner，必须先收口再合并。

## 4. Surface所有权地图

分类不是文档标签，而是未来实现的依赖门：A不需要专用接线，B只接resolved snapshot，C只接OS可表达的variant，D明确拒绝全局重染。

| 类别 | Surface                                                             | 当前机制/证据                                                         | 边界与审计结论                                                                        |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A    | Shell、Sidebar、Chat、Composer、Settings、Timeline                  | DOM root CSS variables + shared primitives                            | 完整resolved semantic tokens；业务组件不读preset ID                                   |
| A    | Dialog、Popover、Toast、loading/error/recovery、focus               | shared primitives与语义roles                                          | 少量历史`dark:`仍需按“领域对比/真实第二palette”分类，不能仅按字面量机械迁移           |
| A    | Browser pane chrome、local home/empty/loading/error                 | `BrowserPanel`语义tokens                                              | 网页viewport本身是D，不随chrome重染                                                   |
| A    | Terminal                                                            | `terminalRuntimeAppearance.ts`从resolved CSS读取surface/text/ANSI     | ANSI是领域语义；固定值只作DOM不可用时fallback                                         |
| A/C  | Diff与代码块                                                        | 外壳/added/removed消费tokens；Pierre/Shiki syntax只消费light/dark     | “主题预设”不冒充独立syntax theme                                                      |
| B    | Browser annotation closed shadow root                               | `BrowserAnnotationTheme` bounded numeric snapshot                     | guest不继承宿主CSS；snapshot拒绝`var()`、URL与任意CSS                                 |
| B    | Curator/observer与未来loopback/internal Web Surface                 | typed Engine Web Surface snapshot                                     | bundled缺snapshot时fail closed；完整surface生命周期冻结（含exact reopen），只有新surface读取当前主题；upstream/default profile保留有界fallback |
| C    | Electron titlebar/menu/window首帧、native dialog、Dock/平台图标变体 | `nativeTheme.themeSource`、OS appearance、light/dark resource variant | OS不支持完整App palette，不伪造；不得反向创建Server ThemeState                        |
| C    | React挂载前boot、pairing、signed-out、无可信App context的OAuth callback | `startupSurface.ts`或平台variant                                   | 只提供中性light/dark可读性，不复制preset catalog；同一Web启动owner服务pairing/signed-out，OAuth回调保留Server有界en/zh-CN边界 |
| D    | Provider/Engine/品牌图标                                            | 本地exact-pinned identity assets                                      | 可按contrast选择官方变体，但不invert、不accent染色                                    |
| D    | 第三方网页与OAuth登录网站                                           | Chromium/WebView/source page                                          | 只换Browser chrome和OmniMind overlay                                                  |
| D    | PDF、图片、视频、Device Screen、用户文件与截图                      | viewer/device/content owner                                           | 不套全局filter；selection/toolbar仍属A                                                |
| D    | ShareCard、打印、导出模板                                           | 明确输出合同                                                          | 可固定白底或目标色；预览容器忠实展示，不把输出palette复制回App                        |
| D    | 沉浸式遮罩、设备bezel                                               | 场景物理语义                                                          | fixed black/white有内容/可读性理由，不是普通chrome捷径                                |

## 5. 硬编码颜色审计：不能一刀切

2026-08-24候选静态扫描在`apps/web/src`、`apps/desktop/src`与`packages`发现746个hex与320个`rgb/rgba`匹配；其中包含测试、fallback、生成seed、内容与品牌，这个数字本身没有质量含义，也不是需要归零的KPI。正确分类如下：

### A. 普通产品chrome：应收回token

特征：Settings/Dialog/菜单/空态/工具栏/普通卡片，在当前theme下应与宿主一致。发现此类字面量时，优先消费现有语义token；没有合适角色时才由theme owner增加一个语义角色。禁止组件直接根据preset name切换。

### B. 领域语义：保留但由窄owner投影

success/warning/danger、diff added/removed、skill、Terminal ANSI、focus和selection属于可读语义。它们可以由ThemePack提供锚点，再由Terminal/Diff等领域owner生成完整palette；不能把所有状态统一成accent，也不能让组件各自发明整套状态色。

### C. 内容与identity：必须保留原貌

Provider mark、Engine logo、图片、PDF、视频、网页、设备屏幕、用户代码、截图和导出卡片不属于主题。固定黑/白、图片渐变遮罩或品牌色可能完全正确。

### D. 隔离surface fallback：允许但不得成为OmniMind正常路径

guest preload、Curator upstream/default profile、首帧bootstrap、无法联系Host的error page可以保留有界fallback。必须有清楚触发条件；正常renderer已提供resolved snapshot时不得继续使用它。

### E. 测试fixture与可视化reference：不是生产owner

测试中的RGB、research prototype和截图fixture只锁证据。它们不得被生产代码import，也不能因为“看起来一致”升级为主题registry。

## 6. 已确认的强项与本轮收口

### 保留

- `ThemeState → normalize → resolve → semantic tokens`单向链；
- system media query和storage事件只由`useTheme`监听；
- ThemePack颜色只接受bounded hex，字体经过normalization，分享串不接受任意CSS/JS；
- Terminal从resolved CSS读取ANSI与搜索装饰，而不是主题名switch；主题变化时已打开的搜索会以新resolved options重绘，不重建PTY或Terminal；
- Browser annotation已经使用resolved numeric snapshot；
- Browser local chrome/empty state已经从固定黑色收回语义token；
- Provider图标保持原色；
- Diff背景、字体与added/removed使用宿主tokens，syntax保持独立领域边界。

### 本轮应闭合

- seed catalog成为preset ID/order/variant的唯一来源；
- 正常UI统一称“主题预设”，不再称“代码主题”；
- 新分享串使用`omnimind-theme-v1`与`presetId`，legacy输入只读；
- Engine Web Surface context携带credential-blind resolved theme snapshot；
- Curator/observer将snapshot映射到自身既有CSS roles，不接收ThemeState或preset ID；
- snapshot字段结构只由`@omnimind/contracts`拥有，fork的presenter type直接引用该合同；Server在bundled profile缺snapshot时fail closed，防止pre-effect启动落回固定黑白；
- Workbench与Execution写明theme owner、跨进程seam、content边界和stop-loss。

### 当前不应扩张

- 不把Shiki/Pierre变成任意主题市场；当前固定GitHub light/dark是明确、可读且低维护的syntax选择；
- 不把ThemeState搬入Server；
- 不增加云同步、定时主题、主题商店、远程字体或远程CSS；
- 不为每个现存硬编码颜色建lint例外清单；
- 不重写约4000行Curator状态机，只替换presentation输入。

## 7. 未来变更演练

### 7.1 新增一个暖色明亮主题

只增加light preset seed与label（必要时），自动进入Settings/搜索；Theme owner生成surface/ink/accent/semantic tokens；Browser home、annotation、Terminal和Curator snapshot自动收到暖色。需要手改Curator CSS色值或Browser条件分支即判失败。

### 7.2 新增一个semantic token

先证明现有role不能表达新的用户结果；然后只在`ThemeDerivedTokens/buildThemeCssVariables`增加派生与CSS alias，由真正拥有该视觉角色的primitive消费。普通页面不新增主题参数，B类surface也不自动扩协议；只有隔离页面确实需要该role时才同步扩展contracts snapshot与package-facing结构，并由跨进程parity测试锁定。若多个页面分别计算同一颜色，演练失败。

### 7.3 新增一个普通Settings或工具页面

页面只复用现有layout/UI primitives和semantic tokens，不调用`useTheme`、不接`resolvedTheme`、不增加theme-specific props。测试在明显暖色根tokens下渲染页面即可；若页面需要为每个preset加适配，说明primitive或token owner有缺口。

### 7.4 新增同名明暗双槽主题

同一stable preset ID提供light/dark seeds；System mode按OS选择槽。两个槽可以分别被用户二次编辑。不得新增`theme="foo"`全局mode，也不得让nativeTheme接收`foo`。

### 7.5 新增高对比主题

若只是更高contrast/ink/surface与状态色，仍是light或dark preset；验证focus、disabled、muted text、ANSI、Diff和WCAG。如果未来要响应OS forced-colors或独立accessibility mode，那是新的用户结果和平台合同，必须重新裁决，不能偷偷塞进preset name。

### 7.6 新增一个内部loopback/guest surface

先问它能否直接继承DOM CSS vars；能则不加协议。不能则消费现有bounded presentation snapshot或证明需要新增一个语义字段。consumer不得接收ThemeState、seed catalog或mutation API。

### 7.7 替换/删除一个主题

删除catalog seed后，normalizer把已失效ID回退到对应槽default；不保留空壳option、远程下载或第二registry。若产品正式发行后需要保留用户自定义值，另行裁决schema兼容；不能由UI自行迁移。

替换palette的实现与新选择只修改同一seed；所有A/B/C/D surface的责任不变。已有profile持久化的完整palette保持原值，除非用户再次套用或未来另行购买了有迁移/冲突语义的linked行为。整体退休preset与新增相反：删除seed与必要label override、更新focused证据，consumer不得保留品牌特判、隐藏option或迁移表；失效ID由normalizer有界回退，但不借退休名义覆盖用户保存的其他自定义字段。

### 7.8 增加多窗口、账号同步或主题市场

这是authority变化，不是Settings小功能。必须先回答：窗口之间谁发布revision、谁是writer、跨设备冲突怎么呈现、离线修改如何合并、远程资产和版权如何准入、删除账户后本地状态如何处理。未回答前维持本地单owner；允许同一authority的只读窗口投影，不在localStorage、Server与云端双写。

## 8. 验证冰山

### Pure/focused

- ThemeState旧/损坏/partial形状normalization；
- seed catalog identity/order/variant与实际bytes parity；
- share export/import、legacy reader、variant mismatch和恶意输入拒绝；
- 自定义surface/ink/accent/semantic colors的derived tokens；
- bounded Engine Web Surface snapshot不含ThemeState/preset/secret；
- Terminal ANSI、Diff added/removed、Browser annotation projection；
- 原色品牌asset不被CSS invert/filter。

### Browser/UI

- System/light/dark mode与两个主题槽；
- 新preset、手工暖色、自定义字体、contrast、opaque/translucent；
- Settings/Sidebar search/Dialogs/Popover/Toast/Composer/Timeline；
- Browser local home、empty/loading/error、annotation；
- Curator observer/review、loading/partial/error/replay/terminal；
- 480px最窄窗口、light/dark、简中/英文、keyboard/focus/screen reader/reduced motion；
- 切换主题不丢draft、scroll、selection、Tab、Terminal或pending review。

### 当前候选证据边界

截至2026-08-24，本分支已有pure warm snapshot、preset catalog、typed RPC transport、bundled missing-snapshot fail-closed、Curator HTML映射、普通primitive与Terminal resolved颜色的focused证据；完整作者与OmniMind package runner为561/561，Web为4190/4190，Server为4405/4405，Contracts为264/264，Shared为575通过/1跳过，root production build为5/5。开发期Server全量曾暴露OAuth callback由仅亮色改为`light dark`后仍断言旧meta值的本轮陈旧测试，修正同一用户合同后完整Server套件通过；随后第一次root全量唯一失败为untouched `pi-web-access` GitHub SIGTERM-resistant process-tree竞态，精确用例与完整package复跑均通过，第二次root全量10/10绿色，因此没有把该竞态归为主题回归。

exact pushed implementation SHA `9c4740da87a894913f30f4b3648340a8d2ef3cdc`现已取得相称的代表性运行证据：独立clean clone构建的DMG SHA-256为`8da30689b1393df6ec462ae19b3656739b17851b8a18d7a039b316fbf08d1451`，DMG内与安装版`app.asar` SHA-256均为`c30750bd7727480865ca13aa2fee583def5e6aef09d1b444779b55cbfb05d220`。隔离profile中的明显暖色light/dark palette贯穿真实Shell、Composer、Appearance Settings、Browser chrome/local state、annotation overlay和Terminal；第三方网页保留青/珊瑚/黄原色，Terminal在换肤与renderer reload前后保持同一PTY，简中/英文、1100×760窄窗、键盘focus与App关闭重开成立。正式Curator Server和实际页面在390×740、reduced-motion下证明中文observer与英文review消费完整暖色snapshot、结果键盘折叠、无水平溢出且Provider资产不被filter。Diff/code由同一SHA的warm browser tests与production build保护；安装App只到达暖色Diff框架，没有真实彩色hunk，因此此项保持为source/browser证据，不冒充packaged hunk。结合A/B/C/D分类、唯一owner、第二palette/schema收口、本文路由与第7节变更演练，当前可以准确称`global-theme-system-candidate`；仍不能称所有未来surface天然完成、签名发行或整个产品packaged-proven。

### Packaged

任何进入Desktop shipped bytes的主题改动，都从精确pushed SHA clean clone构建，并用任务专用HOME、userData、OMNIMIND_HOME和Provider private home验证。至少覆盖：

1. fresh profile的System/light/dark；
2. 一组明显可辨识的custom warm-light palette；
3. Browser local home与真实第三方页边界；
4. Engine Web Surface observer/review继承custom palette；
5. Terminal/Diff/品牌图标；
6. 关闭重开保持选择且无真实profile读取。

源码测试、HMR或旧安装版不能证明安装产品已经换肤。

## 9. 管理止损

出现任一迹象立即`SIMPLIFY`或重新提问：

- 新主题需要在Theme owner之外手改两个以上consumer色表；
- Curator/Browser/Terminal/Settings出现preset-name switch；
- `light/dark`开始承载主题catalog identity；
- Renderer、Server和Browser同时保存ThemeState；
- theme snapshot携带CSS、脚本、远程URL、secret或完整ThemeState；
- 品牌/内容被统一invert、grayscale或accent染色；
- 为减少硬编码数量而建立巨型全局颜色registry；
- 一个主题变更触发Session/Run/Tab/Terminal重建；
- Theme seed、Settings option、搜索option和分享validator再次形成平行清单；
- 测试复制完整token算法或视觉治理材料增长快于真实surface改进。

## 10. 新会话最短读取路径

涉及任何主题、明暗模式、换肤、颜色、字体、ThemePack、Browser/Curator样式、Terminal/Diff配色、Provider图标反色或native appearance时：

1. 先读根`AGENTS.md`和`README.md`；
2. 完整读`architecture/workbench.md`的“主题与换肤”及相关surface合同；
3. 跨进程/内部网页时读`architecture/execution.md`的Engine Web Surface段；
4. 再读本文取得源码地图、边界、反例和复验矩阵；
5. 现场核对`git status`、当前`ThemeState → resolved tokens → consumer`调用链与`execution-brief.md`；
6. 不从旧聊天、截图或本文的历史状态推断当前完成度。

唯一成功标准不是“多了一个主题选项”，而是：**新增主题只进入真实Theme owner，所有OmniMind-owned surface自动、诚实地获得它；内容与品牌保持原貌；生命周期不变；删除时修改半径同样小。**
