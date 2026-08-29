# Haros

Haros 是一个本地优先的桌面 Agent 工作台。它用一套产品状态统一管理项目、对话、
队列、时间线、恢复和系统能力，同时让不同执行 Engine 保持可替换、可隔离。

[返回 README](../README.md) · [架构](architecture.md) ·
[参与贡献](../CONTRIBUTING.md) · [安全策略](../SECURITY.md)

> Haros 当前处于源码 alpha 阶段，尚未提供正式安装包、Release 或更新通道。

## 三个工作面，一套产品事实

| 工作面 | 适合做什么               | 工作区                 |
| ------ | ------------------------ | ---------------------- |
| Agent  | 在真实项目中持续完成任务 | 用户选择的文件夹       |
| Chat   | 无需准备项目的专注对话   | Haros 管理的工作区     |
| Studio | 围绕产物持续创作和迭代   | 带独立输出的隔离工作区 |

三个工作面共用 Project、Thread、Queue、Timeline 与恢复机制。切换工作面不会复制第二套
产品状态，也不会把一个 Engine 的原生 Session 伪装成另一个 Engine 的延续。

## 核心特点

- **默认使用 OA。** 新环境只有一个清晰起点。
- **Engine 边界真实。** Engine 管理原生 Session 和私有配置；Haros 管理产品对话、
  队列、恢复和展示。
- **系统能力只有一个授权入口。** 文件、Git、终端、浏览器和设备操作统一经过
  HostGateway，获得权限、取消、幂等和 receipt 约束。
- **本地优先。** 除非用户明确选择外部服务，项目与产品状态都保留在本机。
- **失败不会吞掉工作。** Engine 启动失败时，prompt 和 Queue 会保留，并准确指出失败边界。
- **一个事实只有一个 owner。** Engine 描述、产品状态、设置投影和 UI 文案都只有唯一来源。

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
归属，集中放在 [NOTICE](../NOTICE)、[LICENSES](../LICENSES) 和机器可读的
[source adoption record](../source-adoptions.json) 中，不进入普通产品叙事。
