# Stones of Vhat

A PC-first, first-person medieval mystery game in development, set in Vadstena, Sweden. The historical baseline is circa 1510, with explicit time fractures allowing later landmarks to appear. This is an early prototype, not a finished chapter or a fully reconstructed historical town.

## Current playable prototype

- Three.js rendering and Rapier physics in a keyboard-and-mouse courtyard.
- Capsule movement, physical props and impulse-driven Grip telekinesis.
- A separate development lab for a two-segment physical arm, animation-to-physics handoff and measured native-step history.
- Gore preference defaults on, but NPCs, anatomical severing and gore effects are **not implemented** in the current playable prototype.

Historical environments, NPC routines, ranged magic, melee and the complete 15–20-minute chapter remain in development. The arm lab is technical test geometry, not a finished humanoid ragdoll.

## Run locally

Use Node.js 24.12–24.x and the checked-in lockfile:

```sh
cd game
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/vadstena/` in a desktop browser. The development-only arm lab is at `/vadstena/arm-lab.html`. The legacy `/vadstena/` URL and package names are intentionally retained while **Stones of Vhat** is the working title.

On the project's Windows development machine, shell commands use the `rtk proxy` prefix. See [game setup and controls](game/README.md).

## Validation

```sh
cd game
npm run check
npm run build
npm run test:browser
```

Browser tests manage local test servers; avoid running overlapping suites from multiple worktrees at once. Browser, Windows executable and real-hardware performance acceptance are separate. Source availability is not a release, clean malware-scan result or a claim that the existing Windows build matches current source.

## Parallel development

`main` contains published checkpoints. Codex continues on `codex/vadstena-runtime-foundation`; the proposed Claude environment branch is `codex/environment-blockout`, in a separate worktree. The [Claude handoff](docs/handoffs/2026-09-13-claude-environment-workstream.md) pins an available historical commit and defines non-overlapping ownership. Local paths in that handoff are specific to the project owner's machine; other machines must adapt workspace paths, not copy them literally.

See the [research dossier](docs/research/deep-research/2026-09-08/README.md), [approved chapter design](docs/superpowers/specs/2026-09-05-vadstena-chapter-design.md) and [current continuation](.continue-here.md). Dated records preserve earlier results and limitations; they are not all current-status claims.

## Publication and rights

The repository contains source, tests and project documentation. Dependencies, generated builds, executables, screenshots and the local research working cache are not included. Reference images, maps and models are not automatically licensed for reuse just because their sources are publicly accessible. No new open-source license is granted by making this repository public.
