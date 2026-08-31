<div align="center">
  <img src="assets/brand/exports/app-icon-256.png" width="112" alt="Haros app icon" />
  <h1>Haros</h1>
  <p><strong>Ten Engines. One local-first Harness OS.</strong></p>
  <p>Choose the right Engine for each turn without splitting your projects, tools, or history across ten products.</p>
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
    <a href="docs/README.zh-CN.md">简体中文</a> ·
    <a href="docs/architecture.md">Architecture</a> ·
    <a href="CONTRIBUTING.md">Contributing</a> ·
    <a href="SUPPORT.md">Support</a> ·
    <a href="SECURITY.md">Security</a>
  </p>
</div>

> [!IMPORTANT]
> Haros is currently a source alpha. There are no official installers, releases, or update feeds
> yet. Engine availability depends on the corresponding CLI, account, and local setup.

## Every Engine enters the same workbench

Haros currently registers ten complete agent runtimes. Each Engine keeps its own models, options,
authentication, and native session semantics. Haros gives them one product around the work: the
same Project, Thread, Queue, Timeline, tools, permissions, and recovery model.

Pick Codex for one task and Claude, Cursor, OpenCode, or another Engine for the next. Haros freezes
the exact Engine, model, and options admitted to each queued turn. It never fabricates continuation
between Engines and never hides a launch failure by silently choosing a different one.

## What the Harness OS owns

| Responsibility       | One Haros owner                                                             |
| -------------------- | --------------------------------------------------------------------------- |
| Work identity        | Projects, Threads, messages, attachments, and workspace state               |
| Turn admission       | The exact Engine, model, options, and runtime mode selected for a turn      |
| Local capabilities   | Files, Git, terminal, browser, and device access through one trust boundary |
| Orchestration        | Queue, Timeline, current activity, interruption, and follow-up work         |
| Failure and recovery | Submitted prompts and queued work that remain available for reconciliation  |

The Engine can change without fragmenting the product history because Haros, not an Engine's
private session, owns that history. An Engine adapter receives a narrow projection of the current
turn; it does not acquire a parallel permission system or product store.

The full ownership model is documented in [docs/architecture.md](docs/architecture.md).

## Three ways into the Harness OS

| Surface | Use it when                                             | Workspace                                  |
| ------- | ------------------------------------------------------- | ------------------------------------------ |
| Agent   | The work belongs to a real project                      | A folder you choose                        |
| Chat    | You want a focused conversation without project setup   | A Haros-managed workspace                  |
| Studio  | You are creating and iterating on concrete deliverables | An isolated managed workspace with outputs |

Agent, Chat, and Studio share the same product state. They change the workspace lifecycle and the
way work is presented, not the owner of Project, Thread, Queue, Timeline, or recovery.

## Run Haros from source

You need Bun 1.3.12, Node.js 24.13.1, and macOS, Linux, or Windows.

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dev
```

Haros is currently version `0.1.0-alpha.0`. A successful local build is still an unsigned source
build, not an official release.

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
apps/server    Product orchestration, execution, local capabilities, and persistence
apps/web       Agent, Chat, and Studio workbench
packages/      Typed contracts, shared logic, and runtime composition
scripts/       Deterministic development, legal, and packaged-proof tooling
docs/          Architecture and contributor documentation
```

Generated build output, caches, test artifacts, and reproducible legal reports are not committed.
A fixed runtime input is the only vendored runtime artifact in the source tree.

</details>

## Contributing

Use [GitHub Issues](https://github.com/piai-lab/Haros/issues) for reproducible bugs and focused
proposals. Use [GitHub Discussions](https://github.com/piai-lab/Haros/discussions) for broader
questions. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and report security issues through
[SECURITY.md](SECURITY.md).

## License

Haros is licensed under the [Apache License 2.0](LICENSE). Third-party code and assets retain their
original licenses and required notices; see [NOTICE](NOTICE) and the machine-readable
[source adoption record](source-adoptions.json).
