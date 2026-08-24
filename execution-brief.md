# Execution brief

## 当前目标

OmniMind Web Access 深度安全复核已闭合，当前为`packaged-candidate / not-released`；没有获授权的后续代码任务。实现已直接进入并推送`main@62814532f6fbb0977866d7019637cf665583d656`，在既有package/config/Session availability owner内修复四项边界：GitHub子进程不再继承无关Provider秘密；`source_check`取消不再写artifact/entry；`source_check`与`web_search`共享route可用性；配置读取固定目录与文件身份、同FD限界读取并以1 MiB上限fail closed。后续证据提交只记录状态，不属于该安装版shipped bytes；未创建Release、未修改update feed。

## 当前协调与下一动作

- Source gates通过：`@omnimind/om-web-access`完整565/565、focused 36/36、Server Settings 6/6、Web双语catalog 22/22、root 7-package typecheck与root lint；lint为0 error，601个warning是未触达基线。最小keyless Exa live `source_check`为1来源、0错误、1条entry。
- 从已推送的`62814532f6…`构建arm64 DMG并核验241个disclosed component identity；DMG SHA-256为`d61b7da52eee918332e83cb8be31c01df73f8de0ca7b248a0d6b20437facb1c4`，安装版`app.asar` SHA-256为`0519ca390c3454255afcb7f094608cc0dc0a3c9f213fdf3b9c41c830ff55b0e7`。
- `/Applications/OmniMind.app`已替换为该候选。任务专用HOME、显式userData、OmniMind home、Pi Agent目录和XDG配置下，Main、Renderer、GPU/Network Helper与bundled Server隔离成立；默认Web Search Settings为可用/自动路由/自动摘要，1 MiB+1配置进入双语typed recovery且原hash不变，恢复有效文件后关闭重开仍可用。
- 当前alpha产物严格codesign核验失败，因此不能声称已签名或公证。旧App和纯测试profile已移入Trash，可分别从`OmniMind.app.pre-62814532f6`与`omnimind-webaccess-62814532f6-test-profile`恢复；隔离进程已停止、DMG已卸载。下一步仅在新授权到来时切换本brief的当前目标。

## Stop-loss

- 不把上述portfolio合成全仓重写，不因文件大或行数多机械拆分成熟生命周期owner。
- 不新增Settings/Command/Provider god registry、通用form/JSON DSL、第二store/writer/cache、watcher、daemon、Session Registry、runtime i18n平台或证据ledger。
- 同一事实若仍要求多个consumer手写清单、顺序、palette、schema、capability或fallback，必须继续`SIMPLIFY`；不能用`keep in sync`注释、同步清单或只加parity test供养明显可删除的第二真相。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定证据进`research/`，production adoption进根`README.md`，Campaign claim状态进`missions/independent-omnimind-v1.md`。关闭关注点时本brief应缩短或切换pointer，不再追加永久历史。
