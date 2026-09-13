# Restart point — paused 2026-09-13 11:17

> **HISTORICAL.** Superseded when work resumed at 14:07 the same day. It describes the 11:17 pause only; the current
> state is in `integration-requests.md` (receipt) and `handoff.md` (final delivery). Checks marked not passing here
> refer to the interrupted 11:17 state; final reruns are recorded in `handoff.md` once written.

Paused on Simon's request. Nothing running: browser suite and review workflow stopped, ports 4182/5175 free.

## Committed and pushed (`codex/environment-blockout`, origin sp1e/Stones-of-Vhat)

`8099b7e` plan · `6ca01db` content + provenance · `9f783c4` capsule route tests · `9f155d8` scene builder.

## Uncommitted in the worktree (preserved, NOT verified)

- `game/environment-lab.html`, `game/src/lab/environmentLab.ts`, `game/src/lab/environmentLab.css`
- `game/src/render/environment/view.ts`
- `game/browser/environmentLab.spec.mjs`
- `game/src/render/environment/materials.ts` (irregular flagstones, lighter mortar)
- `game/src/content/environment/kit.ts` (portik lintel `dark-timber` → `timber`)

## Check status

| Check | Status |
|---|---|
| `npm run check` (typecheck + native) | PASS 134/134 at 11:10, before pause |
| `node --test browser/environmentLab.spec.mjs` | **NOT PASSING — interrupted.** Earlier runs: 5/7, then the 2 fixed tests passed separately, but not on the current files |
| Screenshots in `game/.playtest/environment/` | stale: taken before the lintel, bounce-light and panel media-query fixes |
| Adversarial review workflow | **interrupted, no results** |
| `npm run build`, `git diff --check`, `handoff.md` | not done |

## Next steps

1. Re-run the full browser spec; inspect all 1440×900 and 1024×700 screenshots (portik ceiling, menu panel vs brand label at 1024×700).
2. Re-run the read-only review workflow and fix confirmed findings.
3. `npm run check`, `npm run build`, `git diff --check`, allowlist check, commit, push own branch.
4. Update `measurements.md` with renderer counts; write `handoff.md`.
