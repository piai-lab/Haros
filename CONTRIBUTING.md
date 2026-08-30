# Contributing to Haros

Thanks for helping improve Haros. Keep each contribution focused on one user-visible result or
one clear lifecycle responsibility.

## Before you start

- Search existing Issues and Discussions.
- For a bug, include a minimal reproduction and the exact Haros commit or version.
- For a larger change, open a focused proposal describing the user result, the existing owner, and
  the smallest complete change.
- Do not include credentials, private endpoints, user data, generated build output, caches, or test
  artifacts.

## Development

```bash
bun install --frozen-lockfile
bun run dev
```

Before opening a pull request:

```bash
bun run fmt:check
bun run lint
bun run typecheck
bun run test
```

Run `bun run build:desktop` when the change crosses Desktop packaging or shipped bytes.

## Change boundaries

- Keep one fact under one owner. Do not add parallel registries, stores, compatibility aliases, or
  fallback paths to avoid changing the real owner.
- Preserve Engine isolation. Product Threads and native Engine Sessions are different facts.
- Route system capabilities through HostGateway instead of reproducing file, Git, terminal,
  browser, device, permission, or receipt logic in an Engine adapter.
- User-visible Haros copy must ship in both English and Simplified Chinese.
- Keep runtime and third-party identities accurate only where a functional selector, diagnostic,
  or legal provenance requires them. Haros remains the only identity on normal surfaces.
- Treat `@harnessos/*`, `HARNESSOS_*`, `.harnessos`, `harnessos://`, and `ai.piai.harnessos` as
  stable machine contracts. Do not create cosmetic aliases or user-state migrations for them.
- Source adoption changes must update `source-adoptions.json`, required license text, deterministic
  artifact checks, and focused evidence together.

## Pull requests

Explain:

1. the user result;
2. the owner that changed;
3. failure, cancellation, restart, or shutdown behavior when relevant;
4. the exact verification performed;
5. source and license changes, if any.

Do not claim packaged, release, security, or live-service behavior unless the pull request includes
evidence at that boundary.

By submitting a contribution, you agree that it is licensed under the repository's Apache-2.0
license.
