---
type: "Implementation Handoff"
title: "Authorized runnable source closure — v4"
work: "../work/transplant-runnable-source-closure.md"
status: "DONE"
actor_id: "source_closure_rework_round3"
dispatch_receipt: "6f3bdf4d62a2401ea2998a30e12aeadc"
predecessor_receipt: "1a08b741085c46459a5a485de85afc8b"
---

# Authorized runnable source closure — v4

## Outcome

T1 source/identity closure 已完成并可交给独立 reviewer。完整 runnable Web、Desktop、Product Service、
contracts/shared、patch 与 required root tooling 已从 immutable U1 Git object 移入稳定 OmniMind paths；
buildable `vendor/ui` mirror 已删除，回滚与取证只依赖 Git object 和根 README adoption record。

本 Work 同时关闭了 T1 product identity 与 asset seam：4,014-file authorized icon corpus 全量进入
source-neutral `line/fill` paths，原 filename 与 bytes 未变化；functional UI 使用 `Glyph` API；temporary
OmniMind Agent Dock light/dark assets 驱动 Web/Desktop outputs；former product brand、marketing
implementation/content/assets、share implementation 和虚假 release-history surfaces 已退出 author/build paths，
但 Public Surface capability responsibility 与 Product re-entry anchors 均保留。默认第一方身份是 OmniMind Agent；About/Licenses
准确披露 bundled Pi packages、固定版本、来源与当前 execution boundary。Pi 目前仍在 Product Service 中执行；
isolated Native Host 尚未实现，因此本 Work 不声称 process isolation，也不把 Pi 变成日常品牌口号。

这仍是 local non-candidate checkpoint。Product facts、isolated Native Host、`Agent | Chat` surgery、最终
brand form/palette 和旧 execution authority 删除属于后续 Work；本 handoff 不提升 Campaign claim。

## Round 3 review rework — v4

Review receipt `1a08b741085c46459a5a485de85afc8b` 的唯一 blocking finding 已关闭。
`release-smoke.ts` 不再对 Bun v1 文本锁文件直接执行严格 `JSON.parse`；它调用 focused
`readBunV1WorkspaceImporters` reader。该 reader 只在 JSON string 之外识别 Bun 当前生成格式的尾随逗号，
防止 `{,}`、`[, ]` 一类非法结构被误修复，然后仍以严格 JSON parser 解析，并 fail closed 地要求
`lockfileVersion: 1`、object-shaped `workspaces` / `packages` 以及 object-shaped importer entries。没有新增
依赖、fallback state 或第二套 package authority。

回归夹具复制当前 `bun.lock:8-14` 的真实 object trailing-comma 形态，并额外证明 string 内的 `,}` / `,]`
不被改写；malformed trailing comma、错误 workspaces shape 与缺失 packages section 均保持红色。改动前
`bun run release:smoke` 在 `bun.lock:13` 以 strict-JSON syntax error exit 1；改动后同一命令 exit 0，完成
temporary workspace 的 lockfile-only install（1,282 packages）并输出 `Release smoke checks passed.`。

Focused release 组合为 3 files / 20 tests：新增 reader 3/3，既有 mac update / Desktop artifact config
17/17；scripts typecheck 与三文件 format check 也通过。根 `bun run test` 未重复，因为本轮没有改变 Web
runtime/test surface，且 Execution Brief 禁止无触发器重复 unchanged baseline；v3 的真实 expected-red
结果继续保留为 5 failed / 276 passed files、38 failed / 3,438 passed tests，不把局部 release green 扩张
为 inherited Web test green。

## Round 2 review rework — v3

第二轮 `CHANGES_REQUESTED` 的三个 material finding 已在原有职责中关闭；没有借机引入第二套 Runtime、
公共 Package 本体或新的架构文档。真实 artifact gate 又揭示并关闭了两个集成缺陷：Node ESM import 扩展
遗漏，以及 legal generator 将安装在 stage 中、但 packager 不随包交付的 peer-only closure 误计为 artifact
closure。最终实现保持 fail-closed 和双向 exact equality，没有把验证降级为“至少披露”。

| Finding                                      | v3 closure                                                                                                                                                                                                                                                                                                                                                                                                                         | Focused/current proof                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 Feedback runtime schema、取消与网络边界 | 网络边界逐字段重建 diagnostics/context：只接受受界字符串、已知枚举、有限非负数字、真实 boolean 与合法 control-free 文本；summary 只从 normalization 后对象重算。caller `AbortSignal` 与内部 timeout 组合，Dialog 在发送中提供显式 Cancel、保留 draft。fetch 固定 `credentials: omit`、`referrerPolicy: no-referrer`、`redirect: error`，redirected response 也失败                                                                 | mutation tests 覆盖每个 runtime field 的 object/array/sentinel 注入、超界/control、取消、request flags 与 redirect；Feedback unit/provenance/legal focused suite 49/49，Feedback/Licenses browser proof 见下方最终表                                                                                                              |
| F-02 Desktop disposable smoke profile        | `smoke-environment.mjs` 从正向 allowlist 构造 child env；HOME、USERPROFILE、APPDATA/LOCALAPPDATA、XDG、CODEX_HOME、Claude/Pi/OmniMind homes 与 temp 全部指向一次性 root。Desktop 只在已声明 disposable root 内禁止 login-shell/registry hydration，不能用该开关扩大生产行为                                                                                                                                                        | child/grandchild 注入未知 secret 与 real-home sentinel tests 5/5；shell environment tests 17/17；真实 `bun run test:desktop-smoke` exit 0，5/5 tasks，Electron 4,213 ms ready 后整棵 process tree 由 SIGTERM 清空                                                                                                                 |
| F-03 artifact-derived inventory/SBOM/notices | 单一 generator 从 installed production `dependencies + optionalDependencies` closure 派生；peer 只有同时为 root/required dependency 时才进入。每项必须有声明 license 与真实 legal text，少量 exact override 绑定 package ID、manifest digest、license、revision 与 vendored text digest。输出 deterministic inventory、CycloneDX SBOM 与 notices，Licenses UI 暴露三项，Pi revision 与四包绑定 Service manifest/lockfile/inventory | dev snapshot/check 为 238 components；legal/ASAR tests 9/9；`licenses:check` 与 quality PASS。当前真实 unsigned/unpublished mac/zip/arm64 artifact exit 0：release-target `{platform: mac, arch: arm64}` 为 238 components；最终 ASAR package IDs 238、inventory IDs 238、双向 equality，三份 legal files 与四个 Pi 0.81.1 均存在 |

当前 artifact 不是旧证据复用。它在 v3 verifier 生效后重新完成 frozen production-only stage、AppSnap arm64
helper、patched dependency verification、electron-builder、ASAR equality、macOS update zip repack 与 stale
blockmap removal。独立从最终 zip 提取复验同样得到 238/238 exact equality。artifact、inspection copy 和唯一
debug stage 均已移入系统废纸篓，可恢复；没有签名、notarize、上传或发布。

正式 browser proof 只使用当前锁定环境，不继承此前 system-Chrome override。官方 95,530,994-byte Headless
Shell zip 的 MD5 为 `d5b0b83c5ce40105470d2ac0f12cf82e`，标准 revision-1208 cache 的 17 个文件与
zip 逐文件 SHA-256 相等；binary 自报 `Google Chrome for Testing 145.0.7632.6`。测试配置已删除 executable
override，effective Playwright executable/browser env 均为空。exact Feedback command exit 0、1 file / 3 tests；
同一锁定环境下本轮重新运行的 Feedback + Licenses 组合为 2 files / 5 tests。下载临时文件已移入废纸篓。

全量 `bun run test` 仍是**如实 expected-red**，不是绿色总门：Web 为 5 files failed / 276 passed，
38 failed / 3,438 passed。其失败集合与 `research/source-review.md` 固定源基线类别一致：35 项集中于
pinned/split/workflow storage mock 的 `storage.setItem is not a function`，另有 3 项 attachment-state 失败。
本 Work 新增或改写的 focused suites、quality、typecheck、build、browser、Desktop smoke、release smoke 与真实
artifact gates 均独立记录，不把它们扩张成“所有 inherited tests pass”。

## Round 1 review rework

上一轮 `CHANGES_REQUESTED` 的五项 material finding 已逐项关闭；没有吸收新的产品范围或提前实施 Native Host。

| Finding                             | Closure                                                                                                                                                                                                                                         | Focused proof                                                                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 Desktop smoke 无界挂起         | smoke 现在等待真实 Service readiness 与 renderer load，使用 disposable `OMNIMIND_HOME` 和 Electron `--user-data-dir`；POSIX detached process group 按 `SIGTERM -> grace -> SIGKILL` 有界清理，parent 有 45 秒 hard deadline，并验证整组进程消失 | process-policy tests 3/3；Desktop profile/readiness tests 12/12；`bun run test:desktop-smoke` exit 0，5/5 tasks，真实 launch 5,922 ms 后由 `SIGTERM` 清空进程树 |
| F-02 release/artifact stale edges   | 删除不存在的 marketing manifest 与虚假 workflow assertion；local build 显式禁用 publish guessing。macOS zip 始终重打包并验证 framework symlink/签名形态；只有真实 GitHub/mock update source 才要求 update manifest，发布路径默认仍 fail closed  | release tests 17/17；scripts typecheck；`bun run release:smoke` exit 0；真实 arm64 artifact exit 0，zip 243,614,700 bytes，临时输出随后移入废纸篓               |
| F-03 disposition 可漂移             | 唯一 source-closure checker 绑定完整排序 disposition record digest 与精确计数；target loss、origin loss、未授权 exclusion 与 Public Surface reclassification 全部 mutation-tested fail closed                                                   | 6,425 records；digest `7d253b77485d827eea593eef54dcdb63762bcf3729d224ed4735c81da2097106`；quality 27/27                                                         |
| F-04 source-specific icon semantics | 公共类型改为 `GlyphComponent`，删除 source-library variant/comments/config，负向扫描覆盖 authored Web source/tests/build metadata；integration brands 仍保持真实身份                                                                            | authored glyph scan PASS；MessagesTimeline 50/50；Web typecheck；两份 built artifact 均为 4,014 glyphs                                                          |
| F-05 Pi provenance 缺失             | About/Licenses 呈现固定 Pi package generation、source、authority 与真实边界；公开 MIT notice bytes 与 Service/lockfile 契约绑定。页面明确声明 Pi 仍在 Product Service、isolated Native Host 未实现                                              | provenance contract 3/3；v3 已用仓库锁定的 Playwright 1.58.2 / Chromium Headless Shell revision 1208 完成真实 browser proof                                     |

F-02 的真实 artifact 证明是本轮最后一次 package rerun：`OmniMind-0.1.0-alpha.0-arm64.zip` 完成 staged
frozen dependency install、patched dependency verification、Electron packaging、native zip repack、framework
symlink verification 和 unsigned-local signature-shape handling；stale zip blockmap 被删除。该产物未签名、
未发布，且证明后已从临时目录移入废纸篓。

## Work v6 Public Surface calibration

最终 Public Surface 校准已吸收到 sole architecture authorities、现存 Product re-entry anchors 与现有 gate，
没有创建 endpoint registry、第二套状态本体或平行验证器，也没有建设 website/backend、改 DNS/TLS、发布
artifact 或改变 Pi/Runtime topology。

- `architecture/public-surface.md` 是唯一 owner：canonical origin 仍为
  `https://omnimind.wisdomeyes.cn`，但截至 2026-08-04 保留且未激活；public site、Feedback endpoint 与
  release/update authority 是三条独立 trust boundary。
- Registry 使用固定八列 `Surface | Canonical route | Product entry | Direction | Data | Activation gate |
Unavailable behavior | Authority/owner`，覆盖 Home、Docs、Changelog、Download、Privacy、Support、
  Feedback、Share/social、Update discovery 与 Future deep link。Feedback 仅是 future reserved candidate
  `POST /api/v1/feedback`，不是当前 public API。
- Docs/Changelog 只在 production build、显式 canonical origin 配置同时成立时返回固定 route；否则入口保留、
  disabled、解释 unavailable，且没有 URL 或 external open。
- Feedback 必须由 production gate 与独立的 approved canonical endpoint 配置共同激活；它不能从 public-site
  origin 推导。inactive UI 首次渲染即说明 unavailable 并禁用 Submit。激活后的显式提交最多一次 request，
  失败保留 draft、不关闭 dialog、不显示 success、不重试。
- Feedback context 与 wire payload 都逐字段 allowlist；category 在边界重新校验，summary 从清洗后的字段重新
  生成，caller 注入的 derivative、path、messages、credential 等字段不会出网。details 为 5,000 字符硬上限，
  最终 UTF-8 body 为 64 KiB 硬上限；这两条都不依赖 textarea 行为。
- 产品文案按 activation 条件披露 recipient 与发送/不发送内容；未激活时不声称 receiver 已存在。prompt、
  message、code/file content/path、workspace、terminal、environment variable、credential、log、screenshot 与
  attachment 均不发送。
- `scripts/document-contract.mjs` 继续是单一 bounded document validator；它现在读取 Public Surface owner，
  保护 owner/routes、精确 Registry 列、future Feedback candidate、fail-closed 行为与 Workbench 可见契约。
- identity gate 从 Public Surface owner 的单一 machine block 读取三个 destination rules，只扫描 `apps/**`
  authored/generated product surfaces。重新构建 Web 与 Service client 后，旧 bundle 中的猜测 domain 已归零；
  evidence/authority 文本仍可真实保存这些 deny rules。

固定 public lineage 只包含以下 14 条 `apps/marketing/**` path，全部指向
`architecture/public-surface.md`；Sidebar、Feedback 与 release anchors 维持原有 adapted disposition：

```text
apps/marketing/astro.config.mjs
apps/marketing/package.json
apps/marketing/public/apple-touch-icon.png
apps/marketing/public/favicon-16x16.png
apps/marketing/public/favicon-32x32.png
apps/marketing/public/favicon.ico
apps/marketing/public/icon.png
apps/marketing/public/screenshot.jpeg
apps/marketing/src/components/PlatformIcon.astro
apps/marketing/src/layouts/Layout.astro
apps/marketing/src/lib/releases.ts
apps/marketing/src/pages/download.astro
apps/marketing/src/pages/index.astro
apps/marketing/tsconfig.json
```

## Git and immutable source identity

| Evidence                            | Value                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Working base before T1              | `8e67eaba404b1561895d2959e1e9b597e2fa12da`                                           |
| Repository checkpoint containing T0 | `2445acb987e443b44b7dc819de3de44c3d68b391`                                           |
| Fixed upstream revision             | `6aca3dcc505894481430967c2acb762b3dd1b358`                                           |
| Historical source tree              | `630f17e61abc478114bf83c1d740977c9f68b910`                                           |
| Historical tracked paths            | 6,425                                                                                |
| Fixed legal blob                    | `55ee675bb1de9e580b69f3dd68684df2a4dffba7`                                           |
| T1 implementation commit            | assigned by integration after independent review; no SHA is fabricated before commit |

The root README now has one adoption record with `historicalTrees` for immutable T0 evidence and `origins` for
15 current adapted roots. The checker resolves every historical tree/origin from Git, treats no current adapted root
as an exact-zone exemption, and reports `0 exact provenance root(s)`.

## Complete tracked-path disposition

`node scripts/check-source-closure.mjs --json` maps every historical path to target/disposition from the immutable
tree and the root adoption record. The non-JSON gate reports:

| Disposition                                               |     Paths |
| --------------------------------------------------------- | --------: |
| excluded non-product/legal-evidence/former graphics       |       127 |
| public-surface lineage → `architecture/public-surface.md` |        14 |
| adapted target present                                    |     2,250 |
| adapted target deliberately removed/replaced              |        20 |
| authorized fill glyph → `apps/web/public/icons/fill`      |     2,035 |
| authorized line glyph → `apps/web/public/icons/line`      |     1,979 |
| **Total**                                                 | **6,425** |

The checker binds the complete sorted `path → origin → target → disposition` record to SHA-256
`7d253b77485d827eea593eef54dcdb63762bcf3729d224ed4735c81da2097106`; any missing, extra or reclassified
record fails before the aggregate count can pass.

The 20 removed/replaced adapted inputs are three former product graphics, four former identity-named source
anchors, nine fake release-history files, three share/export surfaces and the old source-branded icon resolver.
No alias or compatibility wrapper remains. The 127 excluded paths are plans/audits/docs/screenshots/CI
policy/editor/contributor material and the historical legal file already represented by the exact local legal copy;
the 14 marketing paths formerly inside this aggregate are now explicit public-surface lineage.

## Runnable responsibility closure

| Historical responsibility | Current responsibility                     | Material T1 changes                                                                                                    |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Web                       | `apps/web`                                 | final package/product identity; source-neutral glyph API; full corpus; temporary brand; false product surfaces removed |
| Desktop                   | `apps/desktop`                             | final app/bundle/protocol/profile identity; Service path; platform resources and About identity                        |
| Server                    | `apps/service`                             | stable Product Service package/path/environment identity; current mixed execution code deliberately not redesigned     |
| contracts/shared          | `packages/contracts`, `packages/shared`    | `@omnimind/*` packages; product-home responsibility rename                                                             |
| root closure              | root configs/lock/patches/required scripts | OmniMind workspace graph, Service filters, source/identity/closure/brand/glyph gates                                   |

Root dependency, import, document-contract and runtime/build-path scans have no production reference to the deleted
mirror. `scripts/document-contract.mjs` now protects the live `apps/web` Plugin/Skill source anchors rather than the
historical mirror.

## Authorized icon corpus and stable API

| Proof                                      | Result                                                  |
| ------------------------------------------ | ------------------------------------------------------- |
| fixed line tree                            | `08fd7dfc4631902bf6d9a2415573e4a4d0e02873`, 1,979 files |
| fixed fill tree                            | `932c44605d556210fdfb1b663807a921f590d8f0`, 2,035 files |
| source total                               | 4,014                                                   |
| fixed → source filename delta              | 0                                                       |
| fixed → source byte delta                  | 0                                                       |
| source → Web/Service static artifact delta | 0                                                       |

`scripts/check-glyph-corpus.mjs` uses one `git cat-file --batch` read of both immutable trees, computes per-file
SHA-256, compares the complete source corpus and generated JSON/TypeScript registry, and optionally compares an
artifact root. Vite no longer prunes unused files.

Production consumers use `apps/web/src/ui/icons/Glyph.tsx` and registry helpers with `line | fill`, `currentColor`,
title/label/a11y and stable slot behavior. Generic functional icons route through this resolver; the remaining
`react-icons/si` imports are truthful integration brands, not a second generic icon system.

Provider/Model selection uses Provider identity; a Model without its own mark inherits Provider. Unknown Provider
identity renders neutral `BrandMark`. No pure-text or lookalike brand fallback was introduced. No standalone Engine
row exists in the current T1 UI, so no fake Engine surface was invented.

## Temporary OmniMind brand

The previously authored light/dark source assets were copied byte-for-byte:

| Asset        | SHA-256                                                            |
| ------------ | ------------------------------------------------------------------ |
| light source | `c7f97d279356a6cf35b6eb8583b93449fd3082cb4e261c6f3fd9724fb69dd7aa` |
| dark source  | `469171d55f39005f4eef1e1783105460b15c37aa0f392b5d184bcf1d4bd6e560` |

They drive `BrandMark`, boot/React splash, Web favicon/apple-touch outputs, Desktop app/Dock/Windows/macOS resources
and default first-party fallback. `scripts/check-brand-identity.ts` locks 12 source/platform outputs. The rejected
new mark and rejected vermilion/orange-red treatment are absent; temporary icon colors were not promoted into
interaction, status, diff or semantic palette tokens. Final brand calibration remains explicitly assigned to the
later Agent/Chat Work.

## Product and package identity closure

- Workspace packages use `@omnimind/*`; backend responsibility and scripts use Product Service naming.
- App protocol, environment, profile/storage, update and bundle identifiers use stable OmniMind identity with no
  old alias or dual registration.
- The root README is the sole allowed donor-product disclosure. The root denylist is the only source of donor/product
  identity rules; authored source, tests, comments, Bundle, research, generated Web/Service output and artifact scans
  are hard-green for all six rules. Public Surface destination rules come only from the machine block in the sole
  `architecture/public-surface.md` owner and apply to authored/generated `apps/**` product surfaces.
- Former logos/screenshots/share cards/social handle, marketing implementation/content/assets and fake release history
  are removed; Public Surface capability responsibility and its Product re-entry anchors remain.
- Mandatory MIT legal text and truthful Provider/service identities remain; no fake repository/release URL was added.

## Exact expected-red debt

The hard-green identity result is deliberately separate from inherited source-structure and execution debt.

### Product Service Pi executable dependency

The exact expected package set remains:

```text
@earendil-works/pi-agent-core@0.81.1
@earendil-works/pi-ai@0.81.1
@earendil-works/pi-coding-agent@0.81.1
@earendil-works/pi-tui@0.81.1
```

The exact source/lock path set remains:

```text
apps/service/package.json
apps/service/src/provider/Layers/PiAdapter.test.ts
apps/service/src/provider/Layers/PiAdapter.ts
apps/service/src/provider/Layers/ProviderHealth.ts
bun.lock
```

This mixed dependency is allowed only for isolated T1 local proof and must become Host-external zero in the later
authority-retirement Work.

### Mechanically inherited structure naming debt

The exact current set is 53 `forbidden name token` findings with sorted-record SHA-256
`b8d8d1a7c8454c2cfe7bea32c362a9b680df7d50a4c467fe719ceab0d6d2521f`:

- Desktop: 10 findings across build helper, app/browser manager and storage/migration recovery files;
- Product Service: 26 findings across generic utils/managers and retained migration lineage;
- Web: 12 findings across `New*`, generic utils and storage migration names;
- contracts/shared: 3 findings (`Common` plus migration recovery pair);
- required root checks: 2 migration-lineage filenames.

`check-identity.mjs` cryptographically binds count+digest. Any additional, changed or silently removed finding fails;
the scan prints this exact set as expected-red while donor-product/path/content/generated identity remains hard-green.
This Work does not rename those execution-adjacent files because Work v6 explicitly assigns semantic Product/Host
replacement and deletion to later responsibilities.

## Verification

| Command                                                                                                     | Outcome                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`                                                                             | PASS, 1,114 installs checked with no lock or install changes                                                                |
| `bun run typecheck`                                                                                         | PASS, 6/6 tasks                                                                                                             |
| `bun run build`                                                                                             | PASS, 4/4 build tasks; Web and Service static client built                                                                  |
| `node scripts/check-sources.mjs`                                                                            | PASS, 1 adoption, 0 exact roots                                                                                             |
| `node scripts/check-source-closure.mjs`                                                                     | PASS, all 6,425 paths classified                                                                                            |
| `node scripts/check-glyph-corpus.mjs --artifact apps/web/dist/icons`                                        | PASS, 1,979/2,035/4,014                                                                                                     |
| `node scripts/check-glyph-corpus.mjs --artifact apps/service/dist/client/icons`                             | PASS, 1,979/2,035/4,014                                                                                                     |
| `node scripts/check-brand-identity.ts`                                                                      | PASS, 12 temporary source/platform files                                                                                    |
| `node scripts/check-identity.mjs`                                                                           | PASS: 6,403 source + 17,283 generated files; 3 Public Surface rules; exact 53-finding expected-red structure set            |
| `bun run quality`                                                                                           | PASS, including deterministic 238-component legal snapshot and quality 27/27                                                |
| `node --test test/document-contract.test.mjs`                                                               | PASS, 53/53                                                                                                                 |
| `bunx vitest run apps/web/src/publicSurface.test.ts apps/web/src/feedback.test.ts`                          | PASS, 19/19                                                                                                                 |
| `bun run --cwd apps/web typecheck`                                                                          | PASS                                                                                                                        |
| `bun run --cwd apps/web test:browser -- src/components/FeedbackDialog.browser.tsx`                          | PASS, exit 0, 3/3 on Playwright 1.58.2 official Chromium Headless Shell revision 1208; no executable override               |
| Feedback + Licenses browser files                                                                           | PASS, exit 0, 5/5 across 2 files on the same locked browser                                                                 |
| `bun run --cwd apps/desktop smoke-process-test`                                                             | PASS, 3/3 bounded process-tree policy tests                                                                                 |
| `bun run --cwd apps/desktop test -- src/serverListeningDetector.test.ts src/desktopUserDataProfile.test.ts` | PASS, 12/12 readiness/profile tests                                                                                         |
| `bun run test:desktop-smoke`                                                                                | PASS, exit 0, 5/5 build+smoke tasks; Electron ready in 4,213 ms; process tree stopped after `SIGTERM`                       |
| `bun run --cwd scripts test -- lib/bun-text-lockfile.test.ts mac-update-zip.test.ts build-desktop-artifact-mac-config.test.ts` | PASS, exit 0 in v4, 3 files / 20 tests; actual trailing-comma fixture plus existing release tests                 |
| `bun run --cwd scripts typecheck`                                                                           | PASS, exit 0 in v4                                                                                                          |
| `bun run release:smoke`                                                                                     | PASS, exit 0 in v4 after pre-change exit 1 at Bun trailing comma; lockfile-only staging resolved 1,282 packages             |
| `bun run --cwd scripts test -- mac-update-zip.test.ts build-desktop-artifact-mac-config.test.ts`            | PASS, 17/17                                                                                                                 |
| legal metadata + ASAR verifier focused tests                                                                | PASS, 9/9, including peer-only exclusion, legal fail-closed and equality mutations                                          |
| current macOS arm64 zip artifact proof                                                                      | PASS, exit 0; release-target mac/arm64; ASAR IDs = inventory IDs = 238; Pi four + three legal files; Trash-cleaned          |
| `bun run --cwd apps/web test -- src/runtimeProvenance.test.ts`                                              | PASS, 3/3 package/source/license/boundary contracts                                                                         |
| `bun run test`                                                                                              | EXPECTED-RED, exit 1: Web 38 failed / 3,438 passed across 5 failed / 276 passed files; matches recorded baseline categories |
| `git diff --check`                                                                                          | PASS                                                                                                                        |

Final reviewer should repeat only gates affected by review changes and record actual exit codes. A final integration
commit must update the command table if any result differs; no current result is promoted to Campaign verification.

## Files and decisions handed to review

Changed production scope is exactly the allowed T1 roots: `apps/{web,desktop,service}`, `packages/{contracts,shared}`,
`assets/brand`, `patches`, required root workspace/config/lock/scripts, `README.md`, `AGENTS.md`,
`architecture/{README,workbench,public-surface}.md`, `execution-brief.md`, `research/source-review.md`,
source/identity/document tests, the current Bundle, and deletion of `vendor/ui`. Root `.gitignore` excludes dependency
links, caches, local profiles and generated build/test/package output; it does not hide authored Bundle evidence.

Independent review must challenge: 6,425-path completeness, immutable tree/origin resolution, full corpus bytes in
both artifacts, temporary brand wiring, Provider/Model fallback truth, README-only identity, package/storage/protocol
renames, and the exact hard-green/expected-red split. It must not treat this handoff as Product State, Native Host,
Agent/Chat, final brand, production candidate or OmniMind completion.
