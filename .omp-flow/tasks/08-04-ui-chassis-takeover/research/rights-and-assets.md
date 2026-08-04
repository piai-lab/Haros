---
type: "Research"
title: "Fixed-source rights and asset disposition"
---

# Fixed-source rights and asset disposition

## 1. 结论

固定源码的**代码许可与连续历史成立；后续维护者校准已关闭完整 glyph corpus 的 production clearance，former product graphics 仍须排除或逐项证明**。

- `vendor/ui` 仍与固定 revision `6aca3dcc505894481430967c2acb762b3dd1b358` 的
  tree `630f17e61abc478114bf83c1d740977c9f68b910` 完全一致；根级法定副本与固定源码中的
  MIT 文本逐字节相同。代码可以在保留 MIT notice、来源和贡献历史的前提下进入一次明确标为
  non-candidate 的 direct transplant。
- 固定仓库从 original-upstream 根提交连续演化，与当前原始上游仍有可验证 merge base；它不是删除历史后
  重新发布的干净快照。但“连续历史”不等于当前与上游同构，也不等于 T3 Tools 是唯一贡献者。
- 生产候选目前不能携带 donor 的 app icon、logo、截图、share handle 或营销素材；这些只能作为
  baseline evidence，必须替换或取得逐项证明。
- 公开仓库本身没有给出 4,014 个原始 glyph 的可继承权利证明；这是当时成立的 evidence finding。
  后续维护者明确授权固定代码与完整 corpus 在源码和产品 artifact 中保留、适配与再分发。该授权是
  当前工程 disposition，私有证明不进入仓库；不能再用旧的公开证据缺口推导 used-only pruning 或替换。
- 因而完整 corpus 按原文件名和 bytes 保留；former app icon、logo、截图、share/marketing graphics 仍排除。
  本研究不提升 Campaign claim，最终 artifact、notice/SBOM 与 adopted contents 仍需在 candidate SHA 取证。

对 brainstorm 锚点的影响是**修正而非推翻**：以成熟行为为保全单位仍成立，但 direct transplant
必须区分 former product graphics 与已授权 corpus。第一批接管应排除 donor brand，同时完整保留 glyph
corpus，并把它移动到 source-neutral `line/fill` 路径、稳定 `Glyph` API 和全量 integrity index 后再进入 author root。

> 本文是固定仓库证据与工程处置判断，不是法律意见。

## 2. 范围与方法

范围同时包含内部与外部证据：

1. 只审查根 README 锁定的 U1 revision 和当前 exact import，不把上游 `main` 的后续状态
   混入固定事实；
2. 用 Git object/history 证明 tree、根提交、merge base、license 变更和贡献者集合；
3. 只用 `git ls-tree` 清点固定 revision 跟踪的资产，不把 baseline 验证留下的 `node_modules`、
   `dist` 或 Turbo cache 当成来源文件；
4. 对有外部来源标签的资产查其官方页面，并主动寻找与“根 MIT 覆盖一切资产”相冲突的证据；
5. 不对不公开的购买记录作负面推断：缺失记录的结论是 `unverified`，不是“从未购买”。

任务只允许写本 Research Concept，因此没有另建 Reference Concept 或持久 cache。外部历史在一次性
`/tmp` clone 中核验，最终证据保留为固定 commit URL、命令与 object id，临时 clone 在收口后删除。

## 3. 固定身份与既有运行证据

| 事实 | 证据 | 判断 |
| --- | --- | --- |
| adopted URL / revision | `README.md:61-79` | 唯一固定输入是 U1 `6aca3dcc…`；更新需重新 review。 |
| historical tree | Git object `630f17e6…` at repository checkpoint `2445acb…` | T0 bytes 可从 immutable object 复核，worktree mirror 不再是证据要求。 |
| tracked source size | `git ls-tree -r --name-only 630f17e6…` -> 6,425 files | 与 `research/source-review.md:5-13` 一致。 |
| legal copy | fixed `LICENSE` blob `55ee675b…`; local legal copy SHA-256 `935d8f2a…` | 根级法定副本正确保留。 |
| existing checks | `research/source-review.md:70-89` | install/build/typecheck/desktop smoke 可复用；同时保留 lint warnings 与 Web test failures。 |
| revalidation trigger | `research/source-review.md:102-112` | revision、tree、license/history/assets、toolchain/platform 和 packaged call path 均未在本研究中改变。 |

因此没有重跑 build 或 desktop smoke。资产风险改变的是 production disposition，不会让相同 fixed-tree
probe 产生新信息；资产被替换、package closure 改变或生产路径建立后，应运行的是受影响的 renewed
proof，而不是再次证明旧 baseline。

## 4. License、lineage 与 contributors

### 4.1 已确认事实

- 固定 `LICENSE` 是 MIT，copyright 行为 `Copyright (c) 2026 T3 Tools Inc.`，并要求所有副本或
  substantial portions 保留 copyright 与 permission notice（`vendor/ui/LICENSE:1-13`）。
- 根提交是 `f194c9661c2eec85f17e972da77772a915d483cd`，作者 Theo Browne，提交信息
  `Monorepo electron init`。固定历史与 original-upstream 当前 `main` 的 merge base 是
  `bf71e0bc5eb0af9494a5969302f27f3d95b694c5`，作者 Julius Marminge，日期 2026-03-24。
- MIT 文件在共同历史的 `4916dad78ef84d6e9c605d2f75b0bd7ed25afb6d` 由 Theo Browne 加入。
  下游曾在 `09a1fdd0…` 增加 Emanuele Di Pietro 行，随后在 `6d9a1af6…` / `176c2996…`
  改为 Emanuele-only；固定 revision 前的 `a654d257…` 又恢复为 T3 Tools-only。紧接着的
  `7d7b7f47…` 与 `6aca3dcc…` 恢复/强化 original-upstream origins 说明，固定 README 明示
  “began as a clone of original-upstream”（`vendor/ui/README.md:57-59`）。
- 固定 revision 共有 2,501 个 commits、106 个去重后的 author-name 字符串。后者包含邮箱别名、
  bot 和同人多 identity，不能写成“106 位自然人”。按 commit 数量可见的主要贡献身份包括
  Emanuele Di Pietro、Julius Marminge、Theo Browne、Marve10s 与 Tyler Szakacs；完整可复核集合
  应从固定 Git history 生成，不在文档复制个人邮箱。
- 以 2026-08-04 fetch 的 upstream tip `6f04a5cffb8fcad95f709af69eb2da2605c4d472`
  为参照，merge base 之后固定分支有 1,411 个 upstream `main` 不含的 commits；该 upstream tip
  也有 1,175 个固定分支不含的 commits。结论只能是“共享连续根历史后分叉”，不能声称同步或兼容。
- 固定树没有 CLA、DCO、AUTHORS、CONTRIBUTORS 或 NOTICE 文件；`CONTRIBUTING.md:1-65` 只有
  贡献流程。GitHub 当前条款的 “Contributions Under Repository License” 说明，向已有 license
  notice 的仓库添加内容时默认按同一条款授权，并由贡献者声明有权授权。这支持常规代码的
  inbound=outbound 模型，但不会补足贡献者本来没有的第三方资产权利。

### 4.2 解释与反证

**支持采用的解释：** exact MIT 文本、共同根提交、merge base、连续 commits 和 fixed README 的
origin disclosure 相互印证。没有证据支持“洗掉 original-upstream 历史的独立原创树”这一反假设。

**不能越界的解释：** 根 MIT notice 是仓库级分发事实，不自动授予商标权，也不能证明每个后来上传的
付费/第三方图形都满足其原始许可。GitHub 条款本身也要求上传者拥有授权权利。

另一个需要纠正的展示事实是：固定 `LICENSE` 只写 T3 Tools，而 donor Electron About panel 写
`© <year> Emanuele Di Pietro`（`vendor/ui/apps/desktop/src/main.ts:1836-1844`）。这不推翻 MIT，
但证明产品 About copyright、开源 license notice、来源致谢和 contributor credit 是不同职责。
生产接管必须重做 OmniMind About；法定 MIT 文本与来源致谢应留在 Licenses/Notices，不能沿用 donor
About，也不能因 identity scan 删除法定文本。

## 5. 跟踪资产清单与 production disposition

固定树的 6,425 个文件包括 4,016 个 SVG；其中 4,014 个是 source-library 图库，另有 40 个 other
tracked graphics（28 PNG、7 ICO、1 ICNS、2 JPEG、2 SVG）。处置按来源和产品需要分类，而不是按
扩展名一刀切。

| 类别 | 固定树事实 | Production disposition |
| --- | --- | --- |
| Donor first-party identity | `assets/dev/**`, `assets/prod/**`, `apps/desktop/resources/**`, `apps/{web,marketing}/public/**` 中的 U1 logo、app/dock icon、favicon、screenshots；share export 还写死 donor social handle 与 URL | app icon、logo、splash、favicon、share card 和营销素材在首个 production build 前全部替换；docs/marketing screenshots 不进入运行包。若保留任何一项，需 item-level origin/right proof 与产品必要性。 |
| Build-coupled brand files | `scripts/lib/brand-assets.ts:1-15,41-58` 将 prod/dev icons 接入 Web publish；desktop artifact script 也消费同一 manifest | 不能仅删文件；先用 OmniMind-owned assets 替换 manifest 输入，再验证 macOS/Windows/Linux package、dock/taskbar、installer 和 Web favicon。 |
| Donor brand guard | fixed tree guard 只 digest-lock 两张相同 screenshot 并扫描 tracked files | 旧 guard 不能证明当前 product identity。README-only identity scan、former-product-asset negative scan 与 actual artifact inspection 取代它。 |
| Authorized glyph corpus | fixed fill tree 2,035 个 SVG；fixed line tree 1,979 个，总计 4,014 | 维护者已授权完整保留、适配和 source/artifact redistribution。文件名和 bytes 必须逐个保持，移动到 `apps/web/public/icons/{line,fill}`，不得 used-only pruning。 |
| Runtime glyph use | literal 与 dynamic consumer 只是行为覆盖证据，不决定发行 corpus 大小 | stable `Glyph` resolver 可以按需使用，但 build/static/package 必须携带并校验全部 4,014 个文件；unknown name 不能静默借图或文字 fallback。 |
| Embedded integration brands | corpus 含真实 Provider/service brand-named SVG | 版权授权不替代商标真实性：只在真实 Provider/Model/Engine/source 边界作 nominative use；不把第三方 mark 用作 OmniMind identity 或暗示 endorsement。 |
| Package-provided icons | 现有 `react-icons/si` 只保留真实 integration brand 用途；通用 functional icon dependency 不与 corpus 并行 | 按实际 bundle 生成 third-party notice/SBOM；保持单一 `Glyph` functional system。 |
| Fonts | `apps/web/index.html:8-12` 从 Google Fonts 加载 Cal Sans、DM Sans、Geist、Geist Mono、Inter；marketing 也加载 DM Sans；Web 依赖还声明 `@fontsource-variable/jetbrains-mono`（`apps/web/package.json:26`）。固定树本身没有跟踪 font binaries | 生产桌面不应把启动视觉依赖变成未声明网络请求。若 self-host/打包，只取真实使用字体/weight，保存对应 OFL/notice 并验证 CJK fallback；否则明确网络与隐私行为。 |
| UI/docs screenshots | 两张产品 screenshot 实际同 digest；另有四张 `docs/pr-screenshots/**` | 只作 baseline/PR evidence，不进入 runtime 或 marketing candidate。新截图在 OmniMind journey 与 identity 完成后重拍。 |

### 5.1 历史公开证据缺口与后续授权

source-library 官方页面（查阅于 2026-08-04）说明免费导出存在数量限制，之后需要购买 license。
固定树的两个 icon wave 由 Emanuele Di Pietro 在
`568dfdb92e7163f4a77226d51b770934bdbf3fbe`（1,980 files）和
`6a68fb652984be402ba684c63ef745b5f11b54d0`（2,036 files）引入，另有一项后续变更；提交信息与
仓内文件都没有写明 license、purchase scope、seat/product 范围或 raw-asset redistribution 权。

这不能证明 donor 没有合法 license；它只证明公开仓库本身不能单独支持 raw-source redistribution。
后续维护者授权已经关闭当前工程 disposition：完整 corpus 可保留、适配并随 source/artifact 再分发，
而私有 proof 不发布。该校准不反向改写历史 evidence finding，也不授权 former product graphics。

## 6. Generated artifacts 与构建产物

### 6.1 固定树内

固定 tree 只按名称标出两个 generated source files：

- `apps/web/src/routeTree.gen.ts` 明示由 TanStack Router 自动生成、禁止手改
  （`:1-9`）。接管时从真实 routes 重新生成，审核 generator/version 与 diff，不把 donor route
  identity 当产品 contract。
- `apps/web/src/theme/theme.seed.generated.ts` 自称 generated catalog（`:1-8`），但固定树未找到
  相应 generator。它在来源审计中应暂按 authored snapshot 对待；要么找到/恢复确定性 generator，
  要么去掉虚假的 generated 身份并作为普通产品 theme source 审查。不能声称可再生后直接删除。

### 6.2 当前 working tree 内但不属于固定来源

既有 baseline 安装/构建留下 106,067 个 ignored paths，集中在 `node_modules`、`dist`、`.turbo`
和 package build outputs；`git ls-files --others --exclude-standard -- vendor/ui` 为 0。它们解释了直接
filesystem `find` 会得到远大于 6,425 的假资产数量。

Production transplant 必须以 `git ls-tree`/`git archive` allowlist 为输入，绝不能复制工作目录；
dependencies 和 binaries 应从 frozen lockfile 在干净环境重建。真正 packaging 后再对最终 artifact
生成依赖 SBOM、third-party notices 和 binary/source provenance，而不是复用这批本机输出。

## 7. Production gate

以下项目全部满足前，F-03 才有进入 `candidate` 的依据；本 Research Concept 本身不能改状态：

1. 保留 `LICENSES/ui-mother-MIT.txt` 的 exact MIT text，并在 README/source adoption 与产品
   Licenses/Notices 中记录 U1 fixed revision、original-upstream original-upstream lineage 和主要贡献历史；
2. donor app icons、logo、screenshots、share handle、marketing copy 全部从 production paths 与最终
   package 消失，或每个保留项都有来源、权利、用途和复核证据；
3. 完整 4,014-file corpus 在 `line/fill` source-neutral paths 与 artifact 中逐文件保持原名和 bytes，
   path-independent registry 对 fixed Git tree、source 与 artifact 三方校验，missing/extra/changed 为零；
4. brand glyph 只出现在真实 source/provider 边界，并通过对应 trademark/brand guideline review；
5. 最终 dependency closure 生成 SBOM 与 third-party notice，覆盖 icon packages、fonts、Electron/
   native binaries 和实际打包依赖；
6. generated source 的 generator/version 可重放；无 generator 的文件明确转为 authored source；
7. clean checkout 的 identity/source/structure gate 证明 legal/research exclusions 精确、发行资产是
   allowlist，随后才运行受影响的 build/package/cross-platform 与 same-state visual proof。

当前授权已经关闭 replacement 分叉：不得删除两棵 corpus、不得裁成 used-only subset，也不得引入
第二套通用 functional icon library。T1 只改变路径/API/identity，保持 mask/currentColor、尺寸、focus、
contrast、reduced-motion 与母体几何；最终品牌 form/palette 留给后续 Agent/Chat 同状态校准。

## 8. 未知项与置信度

| 项目 | 当前状态 | 置信度 / 下一证据 |
| --- | --- | --- |
| 固定 code tree 的 MIT 分发权 | supported | 高；exact notice、连续 history、fixed public repo 与 GitHub contribution model 相互支持。 |
| fixed-source acquisition history | unknown / non-blocking | 不作否定推断；当前工程 disposition 来自维护者授权，不虚构公开 acquisition 记录。 |
| 完整 corpus 的当前采用权 | maintainer-authorized | 根 README 记录可公开的最小 rights fact；私有证明不入库。 |
| 40 个 other graphics 的逐项作者/原始文件 | mostly unknown | 产品路线本就要求全部换成 OmniMind identity；保留任一项才触发逐项 provenance。 |
| package 最终实际再分发集合 | not yet frozen | 等生产 packaging path 建立后从 artifact 自动生成 SBOM/notices。 |
| `theme.seed.generated.ts` generator | not found | 在接管前追溯生成源或改为 authored source。 |

## 9. 可复核来源

内部权威：

- `README.md:53-79,118-128`
- `research/source-review.md:5-22,70-112`
- `missions/independent-omnimind-v1.md:35-44,66-70`
- `architecture/workbench.md:332-370`

固定外部来源：

- 根 `README.md` adoption record：U1 exact source URL 与 fixed revision 的唯一披露位置
- Fixed revision: `6aca3dcc505894481430967c2acb762b3dd1b358`
- MIT license introduction evidence: `4916dad78ef84d6e9c605d2f75b0bd7ed25afb6d`
- T3 license attribution restoration evidence: `a654d2578fa5ef91e35753980f52019870080fef`
- Origins attribution restoration evidence: `7d7b7f47c436553c9e76cedcb5da07074ea513b7`
- Original-upstream verified merge base: `bf71e0bc5eb0af9494a5969302f27f3d95b694c5`
- Source-library pricing page（官方页面；2026-08-04 查阅；历史证据引用，不是 production attribution）
- [GitHub Terms of Service, D.6 Contributions Under Repository License](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)（effective 2026-04-27）

关键可重放命令：

```text
git cat-file -t 630f17e61abc478114bf83c1d740977c9f68b910
git ls-tree -r --name-only 630f17e61abc478114bf83c1d740977c9f68b910
git cat-file blob 55ee675bb1de9e580b69f3dd68684df2a4dffba7
git rev-list --max-parents=0 <fixed-revision>
git merge-base <fixed-revision> original-upstream/main
git rev-list --count <fixed-revision>
git log --format='%aN' <fixed-revision> | sort -fu
node scripts/check-source-closure.mjs
node scripts/check-glyph-corpus.mjs --artifact apps/web/dist/icons
```
