<h1 align="center">Haros</h1>

<div align="center">
  <img src="../assets/brand/exports/haros-system-schematic.png" width="960" alt="十个 Engine 进入 Haros，并在同一工作台中保留统一的产品状态" />
  <p>
    <a href="guide/README.md"><strong>Guidebook</strong></a> ·
    <a href="../README.md">English</a> ·
    <a href="architecture.md">架构</a> ·
    <a href="../CONTRIBUTING.md">参与贡献</a>
  </p>
  <p>
    <img alt="Codex Engine" src="https://img.shields.io/badge/Codex-412991?style=flat-square&logo=openai&logoColor=white" />
    <img alt="Claude Engine" src="https://img.shields.io/badge/Claude-D97757?style=flat-square&logo=anthropic&logoColor=white" />
    <img alt="Cursor Engine" src="https://img.shields.io/badge/Cursor-000000?style=flat-square&logo=cursor&logoColor=white" />
    <img alt="Antigravity Engine" src="https://img.shields.io/badge/Antigravity-4285F4?style=flat-square&logo=google&logoColor=white" />
    <img alt="Grok Engine" src="https://img.shields.io/badge/Grok-000000?style=flat-square&logo=x&logoColor=white" />
    <img alt="Droid Engine" src="https://img.shields.io/badge/Droid-7C3AED?style=flat-square" />
    <img alt="Kilo Engine" src="https://img.shields.io/badge/Kilo-F97316?style=flat-square" />
    <img alt="OpenCode Engine" src="https://img.shields.io/badge/OpenCode-1F6FEB?style=flat-square&logo=gnometerminal&logoColor=white" />
    <img alt="Pi Engine" src="https://img.shields.io/badge/Pi-171321?style=flat-square" />
    <img alt="DeepSeek Engine" src="https://img.shields.io/badge/DeepSeek-4D6BFE?style=flat-square" />
  </p>
</div>

Haros 把 Codex、Claude、Cursor、Antigravity、Grok、Droid、Kilo、OpenCode、Pi 和 DeepSeek
带进同一套工作台。每轮都能选择最合适的 Engine，而不必搬走项目、重建上下文，
也不会失去统一的工作历史。

## 所有 Engine 进入同一套工作台

每个 Engine 保留自己的模型、参数、认证和原生 Session 语义。Haros 负责它们之外的产品
系统：Project、Thread、Queue、Timeline、工具、权限与恢复。

这条边界是有意设计的。Haros 会冻结每个排队任务选定的 Engine、模型和参数；它不会
伪造跨 Engine continuation，也不会在启动失败时悄悄换用另一个 Engine。

## Haros 负责什么

| Haros 的唯一 owner | 始终一致的事实                           |
| ------------------ | ---------------------------------------- |
| 工作               | Project、Thread、消息、附件与工作区      |
| 编排               | Queue、Timeline、中断与后续任务          |
| 本地工具           | 文件、Git、终端、浏览器与设备            |
| 恢复               | 可供对账和恢复的已提交 prompt 与排队任务 |

## 进入 Haros 的三种方式

| 工作面 | 最适合                     | 工作区                 |
| ------ | -------------------------- | ---------------------- |
| Agent  | 属于真实项目的工作         | 用户选择的文件夹       |
| Chat   | 无需准备项目的专注对话     | Haros 管理的工作区     |
| Studio | 围绕具体产物持续创作与迭代 | 带独立输出的隔离工作区 |

Agent、Chat 和 Studio 共用同一套产品状态。它们改变的是工作区如何开始、工作如何呈现，
而不是工作历史由谁拥有。

## 从源码运行 Haros

需要 Node.js 24.13.1 或更新的 24.x 版本，以及 Bun 1.3.9 或更新的 1.x 版本。
仓库固定使用 Bun 1.3.12，以便复现依赖安装。支持 macOS、Linux 和 Windows。

### macOS 桌面 App

1. 安装 Node.js 和 Bun，然后在终端检查 `node --version` 与 `bun --version`。
2. 如果尚未安装 Apple Command Line Tools，运行 `xcode-select --install`，等待安装完成。
   不需要完整 Xcode。运行 `xcrun swiftc --version` 和 `xcrun --sdk macosx --show-sdk-path`
   确认工具可用；原生 AppSnap helper 需要 Swift 编译器和 macOS SDK。
3. 克隆仓库，**先安装依赖，再构建**：

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dist:desktop:local-app
```

4. 打开构建好的 App（Apple Silicon）：

```bash
open apps/desktop/.electron-runtime/local-app/arm64/mac-arm64/Haros.app
```

Intel Mac 请使用 `apps/desktop/.electron-runtime/local-app/x64/mac/Haros.app`。
构建命令只生成 App，不会自动启动。重新构建前请退出 Haros。默认本地输出可以覆盖；
显式指定的 `--output-dir` 必须为空。

如果旧版源码在已选择 Command Line Tools 的情况下报错 `xcodebuild requires Xcode`，
请更新源码后重新构建。原因是构建脚本多余的 Xcode 版本检查，无需为此安装完整 Xcode。
如果 Swift 或 SDK 检查失败，请先安装或更新 Command Line Tools，再重试。

### 开发模式

克隆仓库并运行 `bun install --frozen-lockfile` 后，按需选择：

```bash
bun run dev          # 在浏览器中运行服务端与 Web 工作台
bun run dev:desktop  # 带实时重新构建的桌面开发模式
```

Haros 当前版本为 `0.1.0`。每个 Engine 是否可用，取决于对应的 CLI、账号与
本机配置。本地 App 未经 Developer ID 签名或公证，不代表正式发行；构建过程不会发布
产物或生成更新元数据。维护者可运行 Unsigned GitHub Distribution workflow，暂存未签名的
macOS 与 Windows 安装包。从该 workflow 创建 GitHub Release 必须显式选择，且只是下载通道，
不是签名、公证、自动更新源或付费支持。

首次启动默认选择 Pi，模型服务默认 DeepSeek。发送前请在设置中配置所选引擎。“设置 → 模型服务”
可配置独立 Pi 引擎的凭据和自定义模型；其他引擎使用各自的原生配置。

## 继续了解

- 从 [Haros Guidebook（英文）](guide/README.md) 开始，完整了解产品与架构。
- 阅读[架构说明](architecture.md)，了解 owner 边界与 runtime 设计。
- 提交改动前请先阅读[参与贡献](../CONTRIBUTING.md)。
- 使用[支持文档](../SUPPORT.md)获取帮助；安全问题请按[安全策略](../SECURITY.md)私下报告。

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
apps/server    产品编排、本地能力与持久化
apps/web       Agent、Chat 和 Studio 工作台
packages/      类型合同、共享逻辑与 runtime 组合
docs/          Guidebook、架构与贡献者文档
```

</details>

## 许可证

Haros 使用 [Apache License 2.0](../LICENSE)。第三方代码与资产保留原始许可证及必要
归属，详见 [NOTICE](../NOTICE) 与 [source-adoptions.json](../source-adoptions.json)。
