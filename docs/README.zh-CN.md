<div align="center">
  <img src="../assets/brand/exports/app-icon-256.png" width="112" alt="Haros 应用图标" />
  <h1>Haros</h1>
  <p><strong>十个 Engine，一套本地优先的 Harness OS。</strong></p>
  <p>每轮任务都可以选择最合适的 Agent，不必把项目、工具和历史拆进十个产品。</p>
  <p>
    <code>Haros built-in</code>
    <code>Codex</code>
    <code>Claude</code>
    <code>Cursor</code>
    <code>Antigravity</code>
    <code>Grok</code>
    <code>Droid</code>
    <code>Kilo</code>
    <code>OpenCode</code>
    <code>Pi</code>
  </p>
  <p>
    <a href="../README.md">English</a> ·
    <a href="architecture.md">架构</a> ·
    <a href="../CONTRIBUTING.md">参与贡献</a> ·
    <a href="../SUPPORT.md">支持</a> ·
    <a href="../SECURITY.md">安全策略</a>
  </p>
</div>

> [!IMPORTANT]
> Haros 当前处于源码 alpha 阶段，尚未提供正式安装包、Release 或更新通道。每个 Engine
> 是否可用，取决于对应的 CLI、账号和本机配置。

## 所有 Engine 进入同一套工作台

Haros 当前注册了十个完整的 Agent runtime。每个 Engine 保留自己的模型、参数、认证和
原生 Session 语义；Haros 在它们外面提供同一套产品系统，包括 Project、Thread、Queue、
Timeline、工具、权限和恢复机制。

一项任务可以用 Codex，下一项可以换 Claude、Cursor、OpenCode 或其他 Engine。Haros 会
冻结每个排队任务选定的 Engine、模型和参数。它不会伪造跨 Engine 的 continuation，也
不会在启动失败时悄悄换一个 Engine。

## Harness OS 负责什么

| 责任       | Haros 中的唯一 owner                                 |
| ---------- | ---------------------------------------------------- |
| 工作身份   | Project、Thread、消息、附件和工作区状态              |
| 任务准入   | 每轮选定的 Engine、模型、参数和 runtime mode         |
| 本地能力   | 文件、Git、终端、浏览器和设备能力，共用一个信任边界  |
| 产品编排   | Queue、Timeline、当前活动、中断和后续任务            |
| 失败与恢复 | 已提交的 prompt 和排队任务，失败后仍然可以对账和恢复 |

Engine 可以改变，产品历史不会跟着碎裂，因为这些历史由 Haros 掌管，而不是某个 Engine 的
私有 Session。Engine adapter 只获得当前任务所需的窄投影，不会接管另一套权限系统或产品
状态。

完整的责任边界见 [架构说明](architecture.md)。

## 进入 Harness OS 的三种方式

| 工作面 | 适合什么时候使用           | 工作区                 |
| ------ | -------------------------- | ---------------------- |
| Agent  | 任务属于一个真实项目       | 用户选择的文件夹       |
| Chat   | 想专注对话，不想先准备项目 | Haros 管理的工作区     |
| Studio | 围绕具体产物持续创作和迭代 | 带独立输出的隔离工作区 |

Agent、Chat 和 Studio 共用同一套产品状态。它们改变的是工作区生命周期和工作呈现方式，
不是 Project、Thread、Queue、Timeline 或恢复机制的 owner。

## 从源码运行 Haros

需要 Bun 1.3.12、Node.js 24.13.1，以及 macOS、Linux 或 Windows。

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dev
```

Haros 当前版本为 `0.1.0-alpha.0`。本机构建成功仍然只是 unsigned source build，不代表
已经正式发行。

<details>
<summary>开发检查与仓库结构</summary>

```bash
bun run fmt:check
bun run lint
bun run typecheck
bun run test
bun run build:desktop
```

```text
apps/desktop   桌面壳与操作系统集成
apps/server    产品编排、执行、本地能力与持久化
apps/web       Agent、Chat 和 Studio 工作台
packages/      类型合同、共享逻辑与运行时组合
scripts/       可复现的开发、法律与打包验证工具
docs/          架构与贡献者文档
```

生成后的构建输出、缓存、测试产物和可复现法律报告不会提交到仓库。源码树中只保留一个
固定的 vendored runtime 输入。

</details>

## 参与贡献

可复现的缺陷和边界清楚的提案请提交到
[GitHub Issues](https://github.com/piai-lab/Haros/issues)，更开放的问题请放在
[GitHub Discussions](https://github.com/piai-lab/Haros/discussions)。参与前请先阅读
[CONTRIBUTING.md](../CONTRIBUTING.md)；安全问题请按 [SECURITY.md](../SECURITY.md)
中的方式报告。

## 许可证

Haros 使用 [Apache License 2.0](../LICENSE)。第三方代码与资产保留各自许可证及必要
归属，集中记录在 [NOTICE](../NOTICE) 和机器可读的
[source adoption record](../source-adoptions.json) 中。
