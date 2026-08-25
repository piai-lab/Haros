# Execution brief

## 当前目标

当前没有获授权的后续代码任务。Tool/Reasoning Timeline 修复与 E（i18n 物理 domain slices）均已进入并推送 `main`，最新包含用户可观察代码的 integration SHA 为 `4e23564a07`；同 SHA 已完成隔离 packaged journey，状态为 `packaged-not-released`，不是签名、公证、Release 或 update feed。

## 当前协调与下一动作

- E 通过 merge `4e23564a07` 收口：实现提交 `2b6932218e` 将根 catalog 组合为 21 个稳定产品 domain slice，合同提交 `636d5476d0` 锁定双语 exact key/value/placeholder 与跨 domain duplicate 拒绝；`3,492 × 2` canonical catalog 在迁移和集成 `cab8a9ab5b` 两项 Timeline 文案后保持零差异。固定源码证据由 [`research/omnimind-i18n-system-review.md`](research/omnimind-i18n-system-review.md) 拥有。
- Tool/Timeline repair 通过 merge `b4871621b3` 进入 main；`cab8a9ab5b` 完成 active reasoning 有界贴尾、正文区域无符号展开/收回、选择/滚动/链接保护与 settled 默认折叠。责任归因、Synara `dd290…` 持续保证和 exact repair commits 由 [`research/source-review.md`](research/source-review.md) §21 拥有。
- `main@4e23564a07` 通过 Web unit 330 files / 4,160 tests、Reasoning Browser 15/15、catalog 3/3、root typecheck、lint（0 errors）、Web production build与Desktop DMG build；fresh 安装态的 live、settled、关闭重开均保持 Assistant→Reasoning→Read→Reasoning→Read→Assistant 的视觉、DOM source order 与 Chromium accessibility tree 顺序，中文、英文、480px、长内容、焦点和横向溢出已覆盖。
- `/Applications/OmniMind.app` 已替换为该 exact code SHA 的 ad-hoc build，DMG SHA-256 为 `94ad19f936f2bc24fcdf28ef58775bf9a2ac7573134a09410fdc2d475531278c`。后续纯文档收口不进入 shipped bytes，不把文档 HEAD 冒充重打包证据。
- 完整 stable Browser 仍有 5 项历史 Worked-for、Terminal/theme 与 tail-anchor 失败，代表项已在改动前基线复现；不能报告为全绿，也不归因给本轮 Tool/Reasoning 或 E。验证准备阶段曾误启动一次默认 profile App 并立即停止，其持久影响无法证明为零；accepted journey 只使用后来核验完整隔离路径的任务 profile。
- 当前没有新的产品施工入口。若维护者另行授权处理 stable Browser 基线失败，应按各自 owner 单独复现和收口，不能借本轮结果顺手改语义。

## Stop-loss

- 不新增runtime locale loader、lazy locale chunk、codegen、翻译平台、第二catalog、第三语言或consumer-side domain map。
- 不重新引入按正文/Tool/reasoning二次分桶、settlement后重排、raw `x_y`普通标签、无详情first-party Tool或缺失theme snapshot时的静默fallback。
- 不以当前focused和packaged绿色覆盖stable Browser的既有失败，也不把ad-hoc本机安装称为公开发行。
- 当前状态只在本文件维护；稳定合同进`architecture/`，固定source证据按`research/README.md`路由，不新增handoff、ledger或研究总账。
