# Execution brief

## 当前目标

Settings stable identity / search / deep-link owner cut 已合并、验证并清理为 `packaged-candidate / not-released`。任务分支最终tip为`2546b77cf4a839def5c7f655b208f4b6309d4ebd`，进入安装版并被测试的main merge SHA为`56af65ef671a3f527240e1ffa3e2ab202852da1c`；仅记录证据的main提交为`e191c082b5265c5c357fcc469407a16e8d71417a`，不属于被测试的安装字节。section identity、row/panel search metadata、URL target与真实DOM anchor已与可见文案解耦，Sidebar/Search只消费owner投影。当前未创建Release、未修改update feed。

## 当前协调与下一动作

- focused Settings合同、Settings Browser 13-file/91-test suite、Web 326-file/4196-test unit suite、root 7-package typecheck、root lint与production build通过；lint为0 error，既有warning未扩张。合并终审修复了重复 exact target，以及 Web Search 子页面/折叠配置入口的假定位反例。
- 从已推送main merge SHA干净构建的arm64 DMG SHA-256为`57ede8d8bd10b83b5da4402cfb534b524d859060b4494182b1491fcada92c367`；DMG内与当前安装版`app.asar` SHA-256均为`5cdc393d361797b6fc22064e14ff101edd65a63caf3486999a3c409b5cbc3c6b`。
- 安装版使用任务专用HOME、userData、Provider private home和XDG目录；Main、Renderer、Helper、bundled Server均复证隔离。简中/英文搜索同一target、跨locale URL、Enter/Escape与焦点、720px窄窗、panel-only无假target、47/47个唯一exact target、Web Search subview/disclosure生命周期及关闭重开后的直接链接均通过；候选进程已归零。
- 本关注点已闭合：本地与远端任务分支、任务临时资源和挂载均已清理，main工作树干净且候选进程为零。当前没有获授权的后续代码任务；不新增research总账，不创建Release或修改update feed。

## Stop-loss

- 不把上述portfolio合成全仓重写，不因文件大或行数多机械拆分成熟生命周期owner。
- 不新增Settings/Command/Provider god registry、通用form/JSON DSL、第二store/writer/cache、watcher、daemon、Session Registry、runtime i18n平台或证据ledger。
- 同一事实若仍要求多个consumer手写清单、顺序、palette、schema、capability或fallback，必须继续`SIMPLIFY`；不能用`keep in sync`注释、同步清单或只加parity test供养明显可删除的第二真相。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定证据进`research/`，production adoption进根`README.md`，Campaign claim状态进`missions/independent-omnimind-v1.md`。关闭关注点时本brief应缩短或切换pointer，不再追加永久历史。
