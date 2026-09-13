# Integration requests and coordination receipts — environment workstream

Claude-owned. Local readable receipt; it does not prove Codex has seen it.

## 2026-09-13 14:35 — receipt for `2026-09-13-claude-resume-environment.md`

- Worktree `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout`, branch
  `codex/environment-blockout`, HEAD `cf9a87711a61066d33aa0fd11c4465556c95cded` when this receipt was written.
  Historical integration base `20d9cf5c7578656f59bebfaf5b5594145971f1ff`.
- Read in full: `2026-09-13-claude-resume-environment.md` and `claude-sync.md` (both read-only in runtime-foundation),
  plus the original workstream handoff. Simon told me in chat, at 14:25, that Codex was writing updated instructions
  for me, so I am following this document.

### The three open findings (state at 14:35 — superseded by the 15:40 update below)

| # | Finding | State at this receipt |
|---|---|---|
| 1 | Chained 7 s escape sweep | Fixed in the working tree, not yet committed. Each checkpoint × heading now gets a fresh `createYard`, a 20-tick settle, then 600 fixed sprint steps. Finiteness and bounds are checked every 5 ticks, including tick 599. A permanent negative control removes `fence-approach-north` and must escape. Both tests pass (32.2 s and 0.2 s). The facade and gate removal controls are unchanged. |
| 2 | Frame failure keeps scheduling RAF | In progress. RED→GREEN browser test done: a draw call is made to throw, after which there are no more RAF calls, the world is destroyed and the canvas removed. Still to do before commit: release input and listeners while keeping the reload button working. |
| 3 | Mutation table cites an unretained scratch script | Open. Plan: retain an exact, re-runnable mutation runner under `docs/environment/`, re-run it, and label anything not re-run as author-reported. |

Independent review so far: a read-only TypeScript reviewer found one medium lab defect. A restart that finished after
a context loss overwrote "Grafiken tappades" with "Klart". It is fixed by a single idle-message precedence and covered
by a browser regression test (RED→GREEN). A separate SPEC review and then a fresh QUALITY review will run before the
final handoff.

### Ports and processes

Browser harness 4182 (strict). No preview server left running; 5175 is reserved but unused. I do not touch
Codex's 5173/4178, and I will not run a shared full browser suite across worktrees.

### Publication authority — stated explicitly

Simon gave a direct chat instruction on 2026-09-13, before the pause: *"Se till att synka allt logiskt och
non-intrusive till detta repo: https://github.com/sp1e/Stones-of-Vhat"*. Under that instruction I pushed only my own
branch `codex/environment-blockout` (commits `8099b7e`…`9f155d8`), as account **sp1e** through `gh auth
git-credential`. There was no force push, no merge, and nothing to `main` or Codex branches. That push was mine, which
answers `claude-sync.md` finding 4.

I will push reviewed commits to the same branch only, because that instruction still stands. Integration into
`main` or Codex branches stays with Codex.

## 2026-09-13 15:40 — update after resuming in the same session

Simon asked me to continue here rather than in a separate terminal. `terminal-handover.md` is therefore a historical
pause note, not a handover to another writer. I read `claude-sync.md` (12:55 UTC section).

| # | Finding | State |
|---|---|---|
| 1 | Escape matrix | **Closed** in source: `game/tests/environmentRoute.test.mjs` `sweepHeading` + negative control. |
| 2 | Terminal frame failure | **Closed** in source: `fail()` cancels RAF, bumps the generation, aborts listeners, disposes input, destroys the yard, disposes the view. Reload has its own listener. Browser test with a throwing draw call. |
| 3 | Mutation evidence | **Closed**: retained `docs/environment/mutation-check.mjs`; the 14:37 run gave 18/18 killed. It will be rerun on the final sources, with exclusive write ownership. |
| sync | Late pointer-lock rejection (`requestPlay` catch) | **Confirmed and fixed.** RED: `frame-failure: the late rejection must not replace the message`. Fix: the catch returns when `closed \|\| failed`, and both rejection paths go through `idleMessage()`, so a lost context keeps "Grafiken tappades". The context-loss variant was verified separately by mutation. Two mutations added to the runner. |

Final gates (full browser file, SPEC, QUALITY, check, build, diff check) are recorded in `handoff.md`, not here.

### Shared-interface requests

None. Everything needed so far fits the existing `createYard`/`BodyDefinition` contract.
