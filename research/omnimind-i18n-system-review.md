# OmniMind i18n 物理归属审计

> 角色：绑定审计快照的 source evidence；后续 catalog 分域已经实施，但当前状态不由本文拥有。
> 审计快照：`main@4acfe9763e0bcefe223920ddb91d4aa827a5d4a3`
> 稳定合同 owner：[`architecture/workbench.md`](../architecture/workbench.md)
> 当前施工状态 owner：[`execution-brief.md`](../execution-brief.md)

本文只保存 E（i18n catalog 物理分域）的可复核源码证据、反例、候选处置、证伪条件与复验触发器。它不拥有产品文案、国际化架构合同、施工顺序或 Campaign 状态，也不是 A–E 的总账。稳定裁决只看 Workbench；是否正在施工、被阻塞或已验证只看 execution brief。

## 1. 用户结果与范围

目标不是增加语言、改写文案或改变运行时，而是在保持当前用户行为不变的前提下，降低以后新增功能、补双语、改文案和删除产品域时的修改半径：一项功能的文案主要进入它所属的稳定产品域，普通 consumer 继续只通过同一 typed i18n seam 取文案，不再让所有功能长期争用一个巨型物理文件。

本关注点必须保持：

- 简体中文与英文的现有 key、值、placeholder 和 fallback 语义；
- `system / zh-CN / en` 的 locale preference 与系统语言解析；
- `translate`、`useI18n`、`I18nProvider` 和 `DocumentLocaleSync` 的运行时职责；
- 编译期 `MessageKey`、语言 key parity、placeholder parity 与真实 consumer 类型检查；
- 当前 bundling、启动与同步加载行为；
- Provider 原文、命令、法定 identity、路径和诊断等 Workbench 已定义的非产品文案边界。

本关注点不授权：新增第三种语言、运行时 locale loader、翻译服务、codegen、懒加载平台、第二 catalog、文案重写、产品 taxonomy 重排，或顺手修改 Settings、Theme、Web Access、Provider 与 Composer 的行为。

## 2. 证据分类

| 结论                                                             | 类型                              | 可复核依据                                                                             |
| ---------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| 当前 Web 产品文案由一个根 catalog 和一条 React context seam 提供 | fixed-source fact                 | `apps/web/src/i18n.tsx`                                                                |
| 当前两种语言各有 3,490 个 keyed message                          | fixed-source fact                 | 审计快照中 `EN_MESSAGES`、`ZH_CN_MESSAGES` 的键计数                                    |
| 根文件为 7,656 行、455,791 bytes，并被 152 个历史 commit 触达    | local observation                 | 对审计 SHA 的 `wc` 与 `git log -- apps/web/src/i18n.tsx`                               |
| 大约 244 个 Web source 文件直接从根 i18n seam import             | local observation                 | 对审计 SHA/工作树 import 路径的静态检索；数量只描述审计时规模，不是验收阈值            |
| 巨型物理文件已形成跨产品域 review/merge hotspot                  | inference                         | 设置、Composer、Git、Automation、Pull Request 等高频域共享同一对语言对象；历史触达面广 |
| 逻辑 catalog 保持唯一、物理上按稳定产品域切片                    | accepted architecture disposition | Workbench“语言、产品文案与技术原文”章节                                                |
| 审计快照当时 E 是否已实现                                       | false                             | 该 snapshot 仍是单一根文件；后续实现与交付不由本文维护                                 |

行数、字节数、import 数与 commit 数只是定位真实维护税的证据，不是“文件超过某个阈值就拆分”的规则。若未来消费面很小、修改不再冲突或切片反而增加同步点，应重新审判，而不是机械维持分片。

## 3. 当前真实调用链

```text
Web local locale preference + navigator.languages
  -> resolveAppLocale
  -> I18nProvider
      -> MESSAGE_CATALOGS[resolved locale]
      -> translate(key, params)
      -> useI18n().t / thinkingHints
  -> React product consumers

DocumentLocaleSync
  -> document.documentElement.lang
```

当前根 owner 同时承担四项合理职责：

1. 英文基准对象定义 `MessageKey`；
2. 中文对象以 `MessageCatalog` 做编译期完整性检查；
3. `MESSAGE_CATALOGS` 绑定 supported locale；
4. React context 解析 locale 并向 consumer 提供 `t` 与氛围提示。

问题不是这条逻辑 owner 或运行时链错误，而是 6,980 个语言条目全部物理堆在同一个 source 文件。审计快照中，单语言 key 的主要前缀已横跨多个独立产品生命周期，例如：

| 产品域前缀     | 单语言 key 数 |
| -------------- | ------------: |
| `settings`     |         1,233 |
| `composer`     |           201 |
| `git`          |           198 |
| `automation`   |           143 |
| `pullRequest`  |           121 |
| `project`      |            98 |
| `shortcuts`    |            93 |
| `conversation` |            91 |
| `device`       |            85 |
| `kanban`       |            75 |
| `updater`      |            70 |
| `workbench`    |            68 |
| `search`       |            64 |
| `common`       |            62 |
| `browser`      |            56 |
| `terminal`     |            38 |

这些数字证明物理热点由多个真实产品域共同造成；它们不冻结未来 slice 名、数量或边界。一个稳定 domain 可以包含多个 key 前缀，一个前缀也可能在 exact consumer/lifecycle 证据下被拆到不同 domain。

## 4. 已成立的保护面

当前实现并非“缺少 i18n 系统”。以下成熟部分必须保留：

- `MessageKey = keyof typeof EN_MESSAGES` 给 consumer 提供穷尽 key 类型；
- `ZH_CN_MESSAGES satisfies MessageCatalog` 阻止缺 key 或多 key；
- `i18n.test.ts` 锁定 en/zh key parity、placeholder parity、locale resolution、interpolation 与一组关键产品事实；
- `i18nProductCopy.test.ts` 对正常产品面做硬编码文案扫描，并维护有限 raw-fact allowlist；
- 生产 consumer 主要依赖 `useI18n`、`translate` 和 `MessageKey`，没有各自创建 locale runtime；
- `i18n/thinkingHints.ts` 与两份 JSON 保存 338 条 index-aligned 双语等待氛围文案，并继续经同一个 `I18nProvider` 暴露。

`PRODUCT_COPY_SOURCES` 是当前产品文案覆盖测试的输入，不自动等于 catalog registry。它是否在 E 中改为更窄的 owner projection，必须由 exact source 证明其手工同步正在制造同一维护税；不能为了“全自动”顺手建设动态扫描器或第二 source manifest。

Thinking hints 是有界、同索引语义的数据集，不是普通 keyed message map。只要它继续服从同一 supported locale、同一 provider 与确定性 parity，它可以保留专用物理格式；不得为了目录整齐把它强塞进普通 catalog，也不得让它长成第二 runtime。

## 5. 最强反例与候选处置

### 5.1 当前最强反例

新增一个 Settings 文案、Composer 错误或 Pull Request 恢复动作，即使只属于单一产品生命周期，也必须编辑同一个 455 KB 文件中的英文区和中文区。不同功能的安全审查、placeholder 变更、翻译修订与 merge conflict 被迫汇聚到同一物理热点。这个问题不会造成当前运行时错误，却会让每次功能施工承担无关全产品文案的 review 和冲突成本。

### 5.2 已接受方向

在同一个 i18n owner 内按稳定产品域组织物理 slice；root 只负责确定性组合、duplicate-key 拒绝、完整 `MessageKey` 推导、语言 key/placeholder parity 和现有 runtime exports。consumer 不知道文件边界，也不判断 domain 或 locale 文件名。

可接受的局部实现必须同时做到：

- 一个 message key 只有一个 domain owner；
- 同一 domain 的已支持语言一起闭合，缺失、额外或 placeholder 漂移立即失败；
- duplicate key 在 root 组合边界失败，不能靠后写覆盖前写；
- `MessageKey` 从真实组合结果推导，不另维护总 key union；
- production consumer 的 import/runtime seam 尽量保持稳定；
- 物理切片不改变 bundle loading、locale state、fallback 或 Settings authority。

具体目录、模块名、slice 数量、按域内合文件还是按语言分文件、组合 helper 形状与 commit 布局仍是实施候选，不是本文或 architecture 冻结的 API。施工时应贴合 exact imports、TypeScript inference 与测试边界，不能为兑现示意结构重排成熟 Web runtime。

## 6. 证伪矩阵

E 候选只有在以下反例都能由真实 owner 或测试证伪时才成立：

| 假设                                            | 必须出现的失败/证据                                          |
| ----------------------------------------------- | ------------------------------------------------------------ |
| 某语言漏掉一个 domain key                       | typecheck 或 focused parity test 失败                        |
| 某语言多出一个 key                              | typecheck 或 focused parity test 失败                        |
| 两个 domain 声明同一 key                        | root composition 明确拒绝 duplicate，不允许 silent overwrite |
| en/zh placeholder 不一致                        | placeholder parity test 指向具体 key                         |
| consumer 使用不存在的 key                       | TypeScript 在真实 consumer 处失败                            |
| 只改翻译却影响 canonical key/运行时             | focused test 或 production build 失败；实现应回到 owner 简化 |
| 切片改变 locale/fallback/interpolation          | 原有 `i18n.test.ts` 与 Browser journey 失败                  |
| Thinking hints 数量或索引漂移                   | 专用 parity test 失败，而不是混入普通 message duplicate 规则 |
| 新 domain 仍要手改多个语言总索引或 consumer map | 修改半径演练失败，继续 `SIMPLIFY`                            |
| 删除 domain 后残留 runtime loader/registry      | absence proof 失败                                           |

测试应消费真实 composition，不能复制一份 production key/member 列表来证明另一份列表。允许最小 future-member/type fixture，但不得生成永久 catalog snapshot 或翻译控制面。

## 7. 未来变更演练

候选冻结前至少演练：

1. **新增一项功能文案**：只修改其真实 domain 的 en/zh 内容；root 与 consumer 自动获得 key。
2. **只改中文或英文措辞**：只触达该 domain 对应值；canonical key、deep-link、运行时与另一语言不变。
3. **新增含 placeholder 的 key**：另一语言缺 key或 placeholder 不一致时立即失败。
4. **制造跨域重复 key**：组合边界确定性拒绝，而不是按 import 顺序覆盖。
5. **删除一个 message**：仍在使用的真实 consumer 编译失败；没有人工总表需要同步清理。
6. **整体退休一个产品域**：删除 domain 内容与最窄 composition 接线即可退出，不留下 runtime plugin、loader 或 fallback。
7. **未来准入新语言**：明确作为独立产品决定重新评估 catalog typing、fallback、翻译质量、bundle 与 UI journey；物理切片本身不自动授权。

若新增/删除一个域仍要求修改 root 的完整成员清单、语言索引、consumer registry 和测试快照中的同一事实，候选没有真正降低修改半径。

## 8. Stop-loss 与删除边界

出现以下任一情况应 `SIMPLIFY/STOP`：

- 生成第二 `MessageKey` union、第二 locale catalog 或 consumer-side domain map；
- 引入运行时动态 loader、翻译服务、codegen 平台、文件 watcher、数据库或管理后台；
- 以文件行数为理由机械切分没有独立生命周期的碎片；
- 为切片重写产品 copy、Settings IA、Theme、Provider、Web Access 或 Composer 行为；
- 把 Provider 原文、品牌 identity、命令、路径和技术诊断强行翻译；
- 用永久 snapshot/checklist 供养两套可删除的 key/member truth；
- 将本文扩成 A–E 施工账、commit ledger、handoff 或当前状态 owner。

物理切片的删除边界应当很薄：未来若收益不成立，可在不改 consumer 和 locale lifecycle 的前提下重新合并 domain source；若整体退休 i18n 产品能力，只需退出根 provider/composition 与内容，不牵动业务状态 owner。切片不得拥有持久状态、网络、进程或独立生命周期。

## 9. 复验触发器

以下变化只复验受影响结论：

- supported locale 或 fallback 政策改变；
- locale preference 从 Web local owner 迁移；
- bundler、SSR/多窗口、lazy loading 或 runtime module 机制改变；
- message key/placeholder typing 改变；
- thinking hints 等特殊数据集改变索引或生命周期；
- 产品域出现稳定新增/合并/退休，导致现有 slice 边界不再贴合 lifecycle；
- 根 catalog 规模、冲突频率或 consumer graph 明显变化，使当前 hotspot 推论不再成立。

普通文案修订、单一 domain 新增 key 或 consumer 复用既有 `t` 不应触发全系统重审。

## 10. 当前结论

当前证据足以支持一个行为保持的 i18n 物理 owner cut：保留唯一逻辑 catalog 与成熟 runtime，把内容按稳定产品域收回可独立维护的物理 slice，并在 root 组合边界继续提供完整 typing、duplicate 拒绝和 en/zh parity。

当前证据不证明 E 已实施、所有用户可见文案已通过真实 UI 复核，也不授权任何具体目录/API。只有实现、absence proof、未来变更演练、focused/full/build 与相称用户 journey 在同一候选事实点闭合后，才能把状态写成 implemented candidate。
