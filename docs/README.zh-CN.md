# Haros

Haros 是一个本地优先的桌面 AI 工作台。项目、对话、工具、排队任务和恢复都在同一
产品中连续运转，让你可以从一次快速提问自然进入长期项目，而不必反复重建上下文。

[返回 README](../README.md) · [架构](architecture.md) ·
[参与贡献](../CONTRIBUTING.md) · [支持](../SUPPORT.md) · [安全策略](../SECURITY.md)

> Haros 当前处于源码 alpha 阶段，尚未提供正式安装包、Release 或更新通道。

## 三个工作面，一套产品事实

| 工作面 | 适合做什么               | 工作区                 |
| ------ | ------------------------ | ---------------------- |
| Agent  | 在真实项目中持续完成任务 | 用户选择的文件夹       |
| Chat   | 无需准备项目的专注对话   | Haros 管理的工作区     |
| Studio | 围绕产物持续创作和迭代   | 带独立输出的隔离工作区 |

三个工作面共用 Project、Thread、Queue、Timeline 与恢复机制。切换工作面不会复制第二套
产品状态，也不会把一个 Engine 的原生 Session 伪装成另一个 Engine 的延续。

## 为什么选择 Haros

- **一套连续工作台。** Agent、Chat 和 Studio 共用项目、Thread、Queue、Timeline 与恢复机制。
- **即时而真实的反馈。** 消息发出后立刻显示本次选择的模型；启动与对账在后台继续完成。
- **本地工具直接可用。** 文件、Git、终端、浏览器和设备工作流集中在同一个产品里。
- **本地优先。** 除非你明确使用已连接的服务，项目与产品状态都保留在本机。
- **失败不会吞掉工作。** 执行无法启动或被中断时，prompt 与排队任务仍然可以恢复。
- **执行方式可替换。** Haros 的产品状态与具体执行运行时分离，切换执行方式不会割裂工作台。

更完整的责任边界见 [架构说明](architecture.md)。

## 从源码运行

需要 Bun 1.3.12、Node.js 24.13.1，以及 macOS、Linux 或 Windows。

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dev
```

常用验证命令：

```bash
bun run fmt:check
bun run lint
bun run typecheck
bun run test
bun run build:desktop
```

当前版本为 `0.1.0-alpha.0`。构建和 unsigned packaged smoke 通过，只代表源码基线可验证，
不代表已经正式发行。

## 许可证

Haros 使用 [Apache License 2.0](../LICENSE)。第三方代码与资产保留各自许可证及必要
归属，集中放在 [NOTICE](../NOTICE) 和机器可读的
[source adoption record](../source-adoptions.json) 中，不进入普通产品叙事。
