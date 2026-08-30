# Haros Repository Instructions

These instructions apply to automated contributors and coding agents working in this repository.

## Start here

1. Read `README.md` and `docs/architecture.md`.
2. Read `docs/source-intake.md` and `source-adoptions.json` only when external source, copied code,
   patches, vendored artifacts, or legal text are involved.
3. Confirm the exact workspace, branch, and `git status --short` before writing.
4. Preserve unknown worktree changes and keep each commit focused on one responsibility.

## Product and architecture

- Haros is the only product identity. Normal repository and product surfaces do not advertise an
  internal runtime, donor project, or third-party product as a second brand.
- Existing machine contracts remain stable: `@harnessos/*`, `HARNESSOS_*`, `.harnessos`,
  `harnessos://`, and `ai.piai.harnessos`. They are implementation identities, not user-facing
  product names; do not add aliases, dual reads, or migrations merely to restyle them.
- Use **Engine** for a complete agent runtime. Use **Provider** only inside a model-service or search
  service domain where it is the accurate upstream concept.
- `ENGINE_DESCRIPTORS` is the sole owner of Engine identity, registration, display name, capability
  projection, and Settings discovery. Do not add parallel Engine lists.
- Product Threads and native Engine Sessions are different facts. Never fabricate continuation or
  copy native session state across Engines.
- Product state, Queue, Timeline, and recovery remain shared across Agent, Chat, and Studio.
- Local system capabilities go through HostGateway. Engine adapters must not duplicate permission,
  cancellation, timeout, idempotency, receipt, file, Git, terminal, browser, or device authority.
- Do not add compatibility aliases, dual reads, fallback namespaces, migration paths, or ambient
  activation for retired product state.

## User-visible work

- Ship Haros-owned copy in both English and Simplified Chinese in the same change.
- Keep normal product and repository surfaces focused on Haros. Runtime and third-party identities
  appear only where a functional selector, diagnostic, or legal provenance requires accuracy.
- Preserve keyboard, focus, responsive, light/dark, reduced-motion, failure, and recovery behavior
  when changing UI.
- Brand geometry is deterministic after a visual master is selected. Do not invent alternate marks
  in components or packages.

## Source and legal boundaries

- `source-adoptions.json` is the only machine-readable source-adoption authority.
- Retain exact license and notice text. Do not copy private purchase records, credentials, endpoints,
  user data, or raw service responses into the repository.
- Keep adopted-source differences narrow, auditable, and removable. Prefer deleting a local patch
  when the source exposes an equivalent stable seam.
- Source presence, shipped bytes, runtime registration, and product presentation are separate
  claims and require separate evidence.

## Verification

- Run the narrowest test that can disprove the change while developing.
- Before handing off a candidate, run formatting, lint, typecheck, and the affected unit/integration
  suites. Use browser or Desktop proof when the claim crosses those boundaries.
- Do not describe an unsigned build as a release. Do not publish, sign, notarize, create an updater
  feed, or change repository visibility without explicit maintainer authority and the relevant gate.
- Never read, migrate, rewrite, or delete real user private Engine state during tests. Use fresh,
  task-specific temporary homes and user-data directories.
