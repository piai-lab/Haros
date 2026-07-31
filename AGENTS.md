# OmniMind — Founding Agent Contract

本仓库是独立新产品，不是旧产品的重构分支。

## 必读顺序

开始任何设计、代码或移植以前，完整读取：

1. `README.md`
2. `execution-brief.md`
3. `discovery-record.md`
4. `missions/independent-omnimind-v1.md` when its status is active

`README.md` 是唯一产品与架构真相。另两份文件只提供施工顺序与纠偏背景。

## 当前状态

- 仓库只有创立文档与一个 active Campaign spec；
- 生产实现尚未开始；
- 不存在需要兼容的用户、状态或 API；
- Campaign 状态只写入 `missions/independent-omnimind-v1.md`，不得创建平行 ledger、handoff 或进度报告；
- 第一轮工作应完成仓库外研究冻结、身份洁净检查器和三个可丢弃探针；
- 探针冻结以前不得大规模搬入旧代码。

## 身份洁净

- 外部产品、供应商、前代产品和模型家族名称只允许出现在根 `README.md` 的披露区；
- 法定版权和许可证原文只允许进入 `LICENSES/`；
- 其他源码、注释、测试、fixture、配置、schema、事件、日志、错误、UI 文案和说明文件必须保持零外部产品身份；
- 外部来源在研究附件中只用根 README 定义的中性代号；
- 中性代号不得进入生产 namespace；
- 运行时显示名必须来自用户配置或外部数据，不能成为静态产品本体。

## 工程判断

- 激进删除错误概念，不保护旧功能和旧投入；
- 允许 package、fork、整目录移植、显著改造或重写；
- README、包页面、作者宣传、截图、stars 和下载量只能发现候选，不能证明能力；重要结论必须落到固定 revision 的实际源码、依赖、失败路径和测试；
- 受治理 fork 是一等工程路径：主体优秀、必要差异可界定且长期维护成本低于重写时可以果断接管；错误本体不得靠无限分叉掩盖；
- 上游自动化只负责发现变化、生成候选差异和运行检查，不得把未经审阅的上游更新自动合入产品；生产使用固定 revision；
- fork 必须保留诚实来源、历史和法定文本；OmniMind 作者区仍按中性领域职责命名，不让 donor 身份进入产品本体；
- fork、package、transplant、adapt 与 mechanism-only rewrite 的完整裁决门以 `README.md`“移植原则”为唯一真相；
- 搬入前核实来源和权利，搬入后切除宿主概念；
- 一件事实只有一个权威；
- 第一位真实消费者使用具体实现，第二位出现后再提炼抽象；
- 极小领域内核不等于弱工作台；
- Remote、恢复、文件原生 Wiki 和科研重任务属于早期验收；
- 科学能力使用统一 capability 入口，不进入通用核心；
- 不建立兼容双轨、重型默认知识库或虚假安全边界。

## Git

- `main` 是当前唯一分支；
- 一个提交一个关注点；
- 不引入来源不明的文件；
- 每次生产移植都在同一提交更新根 README 的来源披露和必要法定文本；
- 不添加 AI attribution 或生成声明；
- 发布、远端创建、旧仓改名和许可证选择由维护者明确决定。
