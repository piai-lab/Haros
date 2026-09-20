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

Haros brings Codex, Claude, Cursor, Antigravity, Grok, Droid, Kilo, OpenCode, Pi, and DeepSeek into one
coherent workbench. Pick the right Engine for each turn without moving the project, rebuilding
context, or giving up a shared history.

## Every Engine enters the same workbench

Each Engine keeps its own models, options, authentication, and native session semantics. Haros owns
the product around them: Projects, Threads, Queue, Timeline, tools, permissions, and recovery.

That boundary is deliberate. Haros freezes the exact Engine, model, and options admitted to every
queued turn. It never invents continuation across Engines and never hides a launch failure by
silently choosing another one.

## What Haros owns

| One Haros owner | What stays consistent                                    |
| --------------- | -------------------------------------------------------- |
| Work            | Projects, Threads, messages, attachments, and workspaces |
| Orchestration   | Queue, Timeline, interruption, and follow-up work        |
| Local tools     | Files, Git, terminal, browser, and devices               |
| Recovery        | Submitted prompts and queued work remain recoverable     |

## Three ways into Haros

| Surface | Best for                                   | Workspace                    |
| ------- | ------------------------------------------ | ---------------------------- |
| Agent   | Work attached to a real project            | A folder you choose          |
| Chat    | Focused conversation without project setup | A Haros-managed workspace    |
| Studio  | Iterating on concrete deliverables         | An isolated output workspace |

Agent, Chat, and Studio share the same product state. They change how a workspace begins and how
work is presented—not who owns its history.

## Run Haros from source

Use Node.js 24.13.1 or newer within Node 24 and Bun 1.3.9 or newer within Bun 1.x.
The repository pins Bun 1.3.12 for reproducible installs. macOS, Linux, and Windows are supported.

### macOS desktop app

1. Install Node.js and Bun, then check `node --version` and `bun --version` in your terminal.
2. Install Apple's Command Line Tools with `xcode-select --install` if they are missing, and wait
   for installation to finish. Full Xcode is not required. Verify `xcrun swiftc --version` and
   `xcrun --sdk macosx --show-sdk-path`; the native AppSnap helper needs Swift and the macOS SDK.
3. Clone the repository and install dependencies **before** building:

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dist:desktop:local-app
```

4. Open the built app (Apple Silicon):

```bash
open apps/desktop/.electron-runtime/local-app/arm64/mac-arm64/Haros.app
```

On an Intel Mac, use `apps/desktop/.electron-runtime/local-app/x64/mac/Haros.app`.
The build command creates the app; it does not launch it. Quit Haros before rebuilding. The default
local output is replaceable; an explicit `--output-dir` must be empty.

If an older checkout fails with `xcodebuild requires Xcode` while Command Line Tools are selected,
update to the latest source and rebuild. That failure came from an unnecessary Xcode version probe;
installing full Xcode is not needed to fix it. If Swift or SDK checks fail, install or update
Command Line Tools before retrying.

### Development mode

After cloning and running `bun install --frozen-lockfile`, choose one:

```bash
bun run dev          # Server and web workbench in the browser
bun run dev:desktop  # Desktop development with live rebuilds
```

Haros is currently `0.1.0-alpha.0`. Engine availability depends on the matching CLI, account, and
local setup. The local app is not Developer ID signed or notarized and is not an official release.
The local build does not publish artifacts or create updater metadata.

## Go deeper

- Start with the [Haros Guidebook](docs/guide/README.md) for the complete, junior-friendly tour.
- Read [Architecture](docs/architecture.md) for ownership boundaries and runtime design.
- See [Contributing](CONTRIBUTING.md) before proposing a change.
- Use [Support](SUPPORT.md) for help and [Security](SECURITY.md) for private reports.

<details>
<summary>Development checks and repository map</summary>

```bash
bun run fmt:check
bun run lint
bun run typecheck
bun run test
bun run build:desktop
```

```text
apps/desktop   Desktop shell and OS integration
apps/server    Product orchestration, local capabilities, and persistence
apps/web       Agent, Chat, and Studio workbench
packages/      Typed contracts, shared logic, and runtime composition
docs/          Guidebook, architecture, and contributor documentation
```

</details>

## License

Haros is licensed under the [Apache License 2.0](LICENSE). Third-party code and assets retain their
original licenses and notices; see [NOTICE](NOTICE) and [source-adoptions.json](source-adoptions.json).
