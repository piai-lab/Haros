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
    <img alt="Claude Code Harness" src="https://img.shields.io/badge/Claude_Code-D97757?style=flat-square&logo=anthropic&logoColor=white" />
    <img alt="Cursor Engine" src="https://img.shields.io/badge/Cursor-000000?style=flat-square&logo=cursor&logoColor=white" />
    <img alt="Antigravity Engine" src="https://img.shields.io/badge/Antigravity-4285F4?style=flat-square&logo=google&logoColor=white" />
    <img alt="Grok Engine" src="https://img.shields.io/badge/Grok-000000?style=flat-square&logo=x&logoColor=white" />
    <img alt="Droid Engine" src="https://img.shields.io/badge/Droid-7C3AED?style=flat-square" />
    <img alt="Kilo Engine" src="https://img.shields.io/badge/Kilo-F97316?style=flat-square" />
    <img alt="OpenCode Engine" src="https://img.shields.io/badge/OpenCode-1F6FEB?style=flat-square&logo=gnometerminal&logoColor=white" />
    <img alt="Pi Engine" src="https://img.shields.io/badge/Pi-171321?style=flat-square" />
    <img alt="DeepSeek Harness" src="https://img.shields.io/badge/DeepSeek_Harness-4D6BFE?style=flat-square" />
  </p>
</div>

Haros 是一个开源的智能体 Harness 工作台。你可以在同一段对话中使用 Codex、Claude Code 等
Harness，为不同任务选择合适的工具，并把项目和工作历史保留在一起。我们会持续接入新的
Harness，让你沿用熟悉的工作方式。

## News

- **2026-09-22 — Haros 正式开源。** 从今天起，任何人都可以使用、查看、改进 Haros，
  也可以为它接入新的 Harness。

## 为什么使用 Haros？

- **在同一段对话中切换 Harness。** 新的 Harness 可以接着已有对话继续工作，无需迁移项目或手动复制聊天内容。
- **沿用熟悉的工具。** 各个 Harness 保留自己的模型、登录方式和配置，通过 Haros 的桌面界面统一使用。
- **把工作留在一起。** 切换 Harness 时，项目、对话、排队中的任务和工作历史仍然保留在 Haros 中。

Harness 指完整的智能体运行环境，而不只是一个模型。Haros 也将它们称为 **Engine**。
具体可用性取决于对应 Harness 的安装、认证和平台要求。

## 开始使用

Haros 支持 macOS、Windows 和 Linux。请前往 [Releases](https://github.com/piai-lab/Haros/releases)
查看可下载的安装包及安装说明。如果暂时没有适合你所在平台的安装包，可以按下面的步骤从源码运行。

### 从源码运行

先安装 Bun，再安装 **Node.js 24.13.1 及以上的 24.x 版本**和 Git。Haros 需要
**Bun 1.3.9 及以上的 1.x 版本**，仓库固定使用 Bun 1.3.12，以便复现依赖安装。

**macOS 或 Linux**（Linux 安装脚本需要 `unzip`）：

```bash
curl -fsSL https://bun.sh/install | bash
```

如果要直接安装仓库固定的 Bun 版本：

```bash
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.12"
```

**Windows PowerShell：**

```powershell
irm bun.sh/install.ps1 | iex
```

如果要在 Windows 安装固定版本：

```powershell
iex "& {$(irm https://bun.sh/install.ps1)} -Version 1.3.12"
```

安装 Bun 后请重新打开终端，再在准备使用 Haros 的目标平台中运行：

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run build:desktop
bun run start:desktop
```

#### macOS

运行 `xcode-select --install` 安装 Apple Command Line Tools，并等待安装完成。桌面辅助程序需要
Swift 和 macOS SDK，不需要安装完整的 Xcode。

#### Windows

在 PowerShell 或 Windows Terminal 中运行上述命令。桌面启动器会自动处理 Windows 的 Bun 环境。
如果使用 CLI 类型的 Harness，请先安装对应的 Windows CLI 并完成认证，再在 Haros 中配置。

#### Linux

在发行版的终端中运行上述命令。独立桌面包是 x64 AppImage，请确认桌面环境可以运行 Electron
AppImage。Harness 的 CLI 和凭据需要另行安装。

### 开始第一个任务

1. 打开设置，配置准备使用的 Harness。对于通过 CLI 运行的 Harness，请先在本机安装对应 CLI 并完成认证。
2. 首次安装默认选择 Pi。使用 Pi 或其他 API Engine 前，请先在**设置 → 模型服务**中添加服务并填写凭据。
   其他 Harness 使用各自的原生配置。
3. 在 **Agent** 中添加项目，然后开始对话。没有现成项目时可以使用 **Chat**；需要在独立输出目录中制作交付物时可以使用 **Studio**。

## 切换 Harness 时，上下文如何衔接？

你可以在同一个 Haros 会话中切换 Harness。Haros 会把此前的用户消息和助手回复作为上下文传给新的
Harness。较长的历史会按上下文预算截短，因此不能保证每个细节都完整传入，也不会转移另一个
Harness 内部的原生会话状态。完整的对话记录仍然保留在 Haros 中。

工作区数据保存在本机。根据所选 Harness 的配置，提示词和相关上下文仍可能发送到其使用的模型服务。

## 参与开发

安装依赖后，运行支持实时重新构建的桌面开发环境：

```bash
bun run dev:desktop
```

如果需要在浏览器中运行工作台和服务端，使用 `bun run dev`。开发检查和贡献要求见
[贡献指南](../CONTRIBUTING.md)。欢迎一起完善 Harness 接入、平台适配、文档和工作台体验。

<details>
<summary>构建独立桌面应用</summary>

安装依赖后，在目标平台的仓库根目录运行：

| 平台    | 命令                             | 产物格式        |
| ------- | -------------------------------- | --------------- |
| macOS   | `bun run dist:desktop:local-app` | 本地 `.app`     |
| Windows | `bun run dist:desktop:win`       | x64 NSIS 安装包 |
| Linux   | `bun run dist:desktop:linux`     | x64 AppImage    |

Apple Silicon Mac 构建完成后，运行：

```bash
open apps/desktop/.electron-runtime/local-app/arm64/mac-arm64/Haros.app
```

Intel Mac 对应路径为 `apps/desktop/.electron-runtime/local-app/x64/mac/Haros.app`。
重新构建前请退出 Haros。默认本地产物目录可被替换；显式指定的 `--output-dir` 必须为空。
本地构建没有代码签名，macOS 产物也未经过公证。

仓库为三个平台分别配置了原生打包应用的 CI 检查。不同平台的系统集成和各个 Harness 可能有不同要求，
某个平台构建成功并不代表其他平台也已通过验证。

</details>

<details>
<summary>更新与源码构建排错</summary>

拉取代码后，如果依赖或锁文件有变化，运行 `bun install --frozen-lockfile`。
已构建的桌面程序需要重新执行 `bun run build:desktop` 并重启；独立应用需要重新执行对应的打包命令。
开发模式运行期间会自动重新构建源码改动。

如果 macOS 提示 Swift 或 SDK 错误，检查：

```bash
xcrun swiftc --version
xcrun --sdk macosx --show-sdk-path
```

检查失败时，请安装或更新 Command Line Tools。旧版代码可能因为不必要的 `xcodebuild -version`
检查失败，请先更新源码再重试。

其他问题见[支持说明](../SUPPORT.md)。反馈问题时请附上操作系统、Haros 提交号或版本，以及报错信息。

</details>

## 参与贡献

欢迎改进 Harness 接入、平台适配、文档和工作台。小型改动可以按下面的流程开始：

```bash
bun install --frozen-lockfile
bun run fmt:check
bun run lint
bun run typecheck
```

行为改动请运行 `bun run test`；涉及桌面应用或打包产物时，再运行 `bun run build:desktop`。
提交 Issue 或 Pull Request 前，请阅读[贡献指南](../CONTRIBUTING.md)，其中包含问题复现、架构边界、
审查要求以及源码和许可证要求。

## 文档

- [Guidebook](guide/README.md)：使用教程、核心概念和运行时架构。
- [架构说明](architecture.md)：系统设计与开发参考。
- [贡献指南](../CONTRIBUTING.md)：开发检查与贡献要求。
- [安全说明](../SECURITY.md)：私下报告安全漏洞。

## 许可证

Haros 使用 [Apache License 2.0](../LICENSE)。第三方代码和资源保留其原始许可证及声明，
详见 [NOTICE](../NOTICE) 和 [source-adoptions.json](../source-adoptions.json)。
