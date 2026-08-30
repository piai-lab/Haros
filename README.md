# Haros

Haros is a local-first desktop workbench for getting real work done with AI. Projects,
conversations, tools, queued work, and recovery live in one coherent product, so you can move from
a quick question to sustained project work without rebuilding your context.

[简体中文](docs/README.zh-CN.md) · [Architecture](docs/architecture.md) ·
[Contributing](CONTRIBUTING.md) · [Support](SUPPORT.md) · [Security](SECURITY.md)

> Haros is currently a source alpha. There are no official installers, releases, or update
> feeds yet.

## Three work surfaces, one product

| Surface | Built for                                   | Workspace                                  |
| ------- | ------------------------------------------- | ------------------------------------------ |
| Agent   | Long-running work on a real project         | A folder you choose                        |
| Chat    | Focused conversations without project setup | A Haros-managed workspace                  |
| Studio  | Artifact-oriented creation and iteration    | An isolated managed workspace with outputs |

All three surfaces share the same Project, Thread, Queue, Timeline, and recovery model. Moving
between them does not create a second product state or pretend that one Engine's native session is
another Engine's continuation.

## Why Haros

- **One continuous workbench.** Agent, Chat, and Studio share the same projects, threads, queue,
  timeline, and recovery model.
- **Immediate, truthful feedback.** A submitted turn shows the selected model at once, while Haros
  continues startup and reconciliation in the background.
- **Built-in local tools.** Files, Git, terminal, browser, and device workflows are available from
  the same place instead of being scattered across helper apps.
- **Local-first state.** Projects and product state remain on the machine unless you explicitly use
  a connected service.
- **Work survives failure.** Prompts and queued work remain recoverable when execution cannot start
  or is interrupted.
- **Replaceable execution.** Haros keeps its product state independent from the selected execution
  runtime, so changing how work runs does not fragment the workbench.

The deeper ownership model is documented in [docs/architecture.md](docs/architecture.md).

## Run from source

Requirements:

- Bun 1.3.12
- Node.js 24.13.1
- macOS, Linux, or Windows

```bash
git clone https://github.com/piai-lab/Haros.git
cd Haros
bun install --frozen-lockfile
bun run dev
```

Useful checks:

```bash
bun run fmt:check
bun run lint
bun run typecheck
bun run test
bun run build:desktop
```

## Repository map

```text
apps/desktop   Desktop shell and OS integration
apps/server    Product orchestration, execution, local capabilities, and persistence
apps/web       Agent, Chat, and Studio workbench
packages/      Typed contracts, shared logic, and runtime composition
scripts/       Deterministic development, legal, and packaged-proof tooling
docs/          Stable architecture and contributor-facing documentation
```

Generated build output, caches, test artifacts, and reproducible legal reports are not committed.
A fixed runtime input is the only vendored runtime artifact in the source tree.

## Project status

The current version is `0.1.0-alpha.0`. The public-source baseline must pass formatting, lint,
typechecking, unit and integration tests, stable browser tests, desktop builds, legal checks, and
unsigned packaged smoke tests. Passing those checks does not constitute an official release.

Please use [GitHub Issues](https://github.com/piai-lab/Haros/issues) for bugs and focused
proposals, and [GitHub Discussions](https://github.com/piai-lab/Haros/discussions) for broader
questions. Security reports must follow [SECURITY.md](SECURITY.md).

## License

Haros is licensed under the [Apache License 2.0](LICENSE). Third-party code and assets retain
their original licenses and required notices; see [NOTICE](NOTICE) and the machine-readable
[source adoption record](source-adoptions.json).
