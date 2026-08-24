# Execution brief

## 当前目标

Settings 状态 owner 收口正在形成 source candidate：退休万能 `AppSettings` 与浏览器/Server 双写，把事实分别收回 Web local preferences、ServerSettings、ProviderCredentials 与 Desktop native runtime。旧 `omnimind:app-settings:v1` 采用 first-public clean break：生产路径零读取、零迁移、零改写、零删除，原字节保持不变。当前实现尚未冻结或推送，不能写成 packaged、installed 或 released。

## 当前协调与下一动作

- 已完成的 source gates：Web 328 files / 4145 tests、Server Settings 27/27、Contracts Settings 7/7、root 7-package typecheck与production build；Settings/Provider/Chat/Git/PR Browser 197项通过，唯一性能比例基准单独复跑通过，仍需最终同SHA归因与完整门确认。
- 当前下一动作：完成全diff终审与 absence/radius proof，提交并推送任务分支；再从精确 pushed candidate完成MiMo/DeepSeek最小真实跨Provider证伪与clean-clone packaged隔离journey。
- `SYNARA-INTAKE.md`是维护者明确确认的独立修改，保留原内容并单独提交；不得夹入Settings实现提交，也不得遗落。

## Stop-loss

- 不把上述portfolio合成全仓重写，不因文件大或行数多机械拆分成熟生命周期owner。
- 不新增Settings/Command/Provider god registry、通用form/JSON DSL、第二store/writer/cache、watcher、daemon、Session Registry、runtime i18n平台或证据ledger。
- 同一事实若仍要求多个consumer手写清单、顺序、palette、schema、capability或fallback，必须继续`SIMPLIFY`；不能用`keep in sync`注释、同步清单或只加parity test供养明显可删除的第二真相。
- 当前工作、阻塞和下一动作只在本文件维护；稳定合同进`architecture/`，固定证据进`research/`，production adoption进根`README.md`，Campaign claim状态进`missions/independent-omnimind-v1.md`。关闭关注点时本brief应缩短或切换pointer，不再追加永久历史。
