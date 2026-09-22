<h1 align="center">Haros</h1>

<div align="center">
  <img src="assets/brand/exports/haros-system-schematic.png" width="960" alt="Ten Engines enter Haros, which keeps shared product state in one workbench" />
  <p>
    <a href="docs/guide/README.md"><strong>Guidebook</strong></a> ·
    <a href="docs/README.zh-CN.md">简体中文</a> ·
    <a href="docs/architecture.md">Architecture</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
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

Haros is an open-source workbench for agent Harnesses. Use Codex, Claude Code, and other Harnesses
in the same conversation, choose the right tool for each task, and keep your projects and work
history in one place. As new Harnesses emerge, Haros aims to bring them into the workflow you already use.

## Why Haros?

- **Switch Harnesses within a conversation.** Continue with another Harness using prior conversation
  context, without moving your project or manually copying the discussion.
- **Keep the tools you already use.** Harnesses retain their native models, authentication, and
  configuration. Haros brings them into a shared desktop interface.
- **Keep your work together.** Projects, conversations, queued tasks, and work history stay in Haros
  as you change Harnesses.

A Harness is a complete agent runtime, not just a model. Haros also calls these runtimes **Engines**.
Availability depends on each Harness's installation, authentication, and platform requirements.

## Get started

Haros supports macOS, Windows, and Linux. Check [Releases](https://github.com/piai-lab/Haros/releases)
for available downloads and their installation notes. If an installer is not available for your
platform, run from source below.

### Run from source

All platforms use the same Node.js and Bun versions: **Node.js 24.13.1+ within Node 24**,
**Bun 1.3.9+ within Bun 1.x**, and Git. The repository pins Bun 1.3.12 for reproducible installs.
Run these commands in a terminal on the platform where you want to use Haros:

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run build:desktop
bun run start:desktop
```

#### macOS

Install Apple's Command Line Tools with `xcode-select --install` and wait for installation to finish.
The desktop helper needs Swift and the macOS SDK; full Xcode is not required.

#### Windows

Run the commands in PowerShell or Windows Terminal. The desktop launcher resolves the Windows
Bun environment automatically. If a Harness is CLI-based, install and authenticate its Windows CLI
before configuring it in Haros.

#### Linux

Run the commands in your distribution's terminal. The packaged desktop target is x64 AppImage;
make sure your desktop environment can run Electron AppImages. Harness CLIs and their credentials
must be installed separately.

### Your first task

1. Open Settings and configure the Harness you want to use. For CLI-based Harnesses, install and
   authenticate the matching CLI on your machine first.
2. Fresh installs select Pi. Before using Pi or another API Engine, add a service and its credentials
   in **Settings → Model services**. Other Harnesses retain their native configuration.
3. Add a project in **Agent**, then start a conversation. Use **Chat** for work without an existing
   project, or **Studio** for deliverables in a separate output workspace.

## How context works when switching

You can switch Harnesses in the same Haros conversation. Haros passes prior user and assistant
messages to the new Harness as context. Long histories are shortened to fit the context budget;
this does not transfer another Harness's private native session state or guarantee that every
previous detail fits. Your conversation history remains in Haros.

Workspace data is stored locally. Prompts and relevant context may still be sent to the model
services used by your selected Harness.

## Development

After installing dependencies, run the desktop with live rebuilds:

```bash
bun run dev:desktop
```

For the browser workbench and server, use `bun run dev`. See [Contributing](CONTRIBUTING.md)
for checks and contribution guidelines. Improvements to Harness integrations, platform support,
documentation, and the workbench are welcome.

<details>
<summary>Build a standalone desktop app</summary>

Run these commands from the repository root after installing dependencies, on the target platform:

| Platform | Command                          | Output format      |
| -------- | -------------------------------- | ------------------ |
| macOS    | `bun run dist:desktop:local-app` | Local `.app`       |
| Windows  | `bun run dist:desktop:win`       | x64 NSIS installer |
| Linux    | `bun run dist:desktop:linux`     | x64 AppImage       |

On Apple Silicon, open the local macOS app with:

```bash
open apps/desktop/.electron-runtime/local-app/arm64/mac-arm64/Haros.app
```

On Intel Macs, use `apps/desktop/.electron-runtime/local-app/x64/mac/Haros.app`.
Quit Haros before rebuilding. The default local output can be replaced; an explicit `--output-dir`
must be empty. Local builds are unsigned; macOS builds are not notarized.

The repository includes native packaged-app CI jobs for all three platforms. Platform-specific
integrations and individual Harnesses can have different requirements; a successful build on one OS
does not validate the others.

</details>

<details>
<summary>Updating and troubleshooting source builds</summary>

After pulling changes, run `bun install --frozen-lockfile` if dependencies or the lockfile changed.
For a built desktop, run `bun run build:desktop` again and restart it; for a standalone app, rerun
its packaging command. Development mode rebuilds source changes while it is running.

If macOS reports a Swift or SDK error, check:

```bash
xcrun swiftc --version
xcrun --sdk macosx --show-sdk-path
```

Install or update Command Line Tools if these checks fail. An older checkout may fail on an
unnecessary `xcodebuild -version` probe; update the source before retrying.

For other problems, see [Support](SUPPORT.md). Include your OS, Haros commit or version, and the
error output when reporting a bug.

</details>

## Contributing

Haros welcomes improvements to Harness integrations, platform support, documentation, and the workbench.
For a small change, install dependencies, make the change, and run the relevant checks:

```bash
bun install --frozen-lockfile
bun run fmt:check
bun run lint
bun run typecheck
```

Run `bun run test` for behavior changes and `bun run build:desktop` when the change affects the
Desktop app or packaged bytes. Start with [Contributing](CONTRIBUTING.md) for issue reports,
architecture boundaries, pull request expectations, and source or license requirements.

## Documentation

- [Guidebook](docs/guide/README.md) — walkthroughs, concepts, and runtime architecture.
- [Architecture](docs/architecture.md) — system design and contributor reference.
- [Contributing](CONTRIBUTING.md) — development checks and contribution guidelines.
- [Security](SECURITY.md) — report a vulnerability privately.

## License

Haros is licensed under the [Apache License 2.0](LICENSE). Third-party code and assets retain their
original licenses and notices; see [NOTICE](NOTICE) and [source-adoptions.json](source-adoptions.json).
