# Game1 team state

Updated 2026-09-05. Coordinator owns this file.

## Outcome and scope

Continue the approved Vadstena chapter in the existing linked worktree, beginning with a playable M1A physics courtyard. User update 2026-09-05: focus PC, defer all dedicated mobile work, and also deliver a Windows .exe. Keep PC web build; first desktop packaging target is a local portable executable. M1B magic, M2 ragdolls/severing, M3 historical environment and later chapter systems remain in scope for subsequent milestones. No website changes, public deployment or signing claim in this increment.

Worktree: C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation
Branch: codex/vadstena-runtime-foundation

## Work and ownership

| Work | Owner | Status |
| --- | --- | --- |
| M0 foundation | Existing implementers and final reviewer | Complete, 16 tests, final review PASS; closeout 86ab5a9 |
| Browser dependencies and preference storage | browser_foundation | Complete a979018 + 3ef23d5; spec and quality PASS; getItem failure regression added, 22 tests pass |
| M1A plans and shared integration decisions | Coordinator | Three executable plans written and self-reviewed; plan commit 41a0a46 |
| Real courtyard/capsule physics | physical_courtyard (gpt-6-astra/high) | Complete 6389f15, 31 tests pass; physics_quality independently confirms its important finding resolved and approves integration |
| Playable Three view/input/menu | playable_courtyard (gpt-5.6-sol/high) | Implementing the browser contract after reviewed physics; owns browser files/tests/README/results only |
| Integrated browser QA and visual checks | Coordinator and fresh reviewer | Pending actual playable build |
| Windows portable .exe packaging | Coordinator planning; windows_packaging_research (gpt-5.6-terra/high) complete | Electron 44.2.0 / builder 26.15.3 researched; secure custom origin and portable target selected; no executable built yet |

## Team workflow decisions

User invoked codex-team-workflow on this turn. Native subagents stay inside this task; no separate user-owned tasks. Four live slots are available, and there is no need to fill all of them. One implementation owner at a time respects the already selected subagent-driven-development workflow and shared configuration. Reviewer work is read-only. Small reversible controller-owned documentation fixes are done directly.

Significant allocation: physics builder uses gpt-6-astra/high with fresh bounded context. Real controller behavior, shape queries and lifecycle correctness justify deeper reasoning; reassess from test trajectories/API mismatches rather than repeated blind retries. Browser integration can use gpt-5.6-sol/high for the concrete prepared module contracts; final reviewer uses gpt-6-astra/high for cross-module lifecycle and physics risk. Prior agents inherited the coordinator configuration; no retrospective model-switch claim.

Retain the two ordered review gates explicitly required by the earlier selected subagent workflow (spec then quality); codex-team-workflow's single-pass default does not require extra repeated rounds. Material findings receive fixes and targeted rechecks. A nonblocking missing regression case is being added without another full review cycle.

## Checks, limitations and next action

- Browser foundation: strict types and 22 tests PASS after coverage follow-up, npm audit zero vulnerabilities; both independent reviewers verified the initial 21-test implementation and coordinator inspected the small follow-up.
- Codacy MCP unavailable. npm audit is supplementary; no Codacy/Trivy scan is claimed and no manual scanner install attempted. Reset the MCP connection to restore that check.
- Plan whitespace check found two extra blank EOF lines after commit 41a0a46; coordinator removed them and will verify the follow-up diff.
- No rendered browser, magic, NPC, ragdoll, gore effects or hardware performance claim yet.
- Browser test runtime installed: Chromium 153.0.8010.12, WebGL2 available, observed renderer ANGLE/SwiftShader (software). This is only a harness smoke check, not gameplay/performance validation.
- Rapier import revealed missing Symbol.dispose typings. Coordinator added a failing bootstrap assertion, then ESNext.Disposable to tsconfig lib. Bootstrap and strict types pass; target remains ES2022 and declaration checking is not skipped.
- Historical finding: the initial 0.002 normal nudge only fixed yaw-zero movement; independent yaw-grid diagnostics then found stalls at 22.5/45 degrees. The replacement support classification in 6389f15 is now independently approved for browser integration.
- Coordinator also walked the actual five-step staircase through the physics API: maximum capsule-center height 1.9663 m, traversed to z=-6.0501, 21 bodies/colliders. This is a read-only trajectory diagnostic, not a rendered playtest.
- Physics spec review allocation uses gpt-5.6-terra/high for bounded contract/test comparison. The subsequent deeper quality review will use gpt-6-astra/high for ownership and controller edge cases.
- Correction uses a short centre-foot support ray for adhesion classification, not movement collision. Full capsule sweeps and stand clearance remain. The 0.002 nudge override was removed. Expanded 272-world/32,640-tick regression passes, plus actual descending stairs/ramp, ledge fall and steep sliding; maximum observed vertical tick change is 7.391mm, not zero jitter.
- PC scope update sent to the browser builder: remove mobile UI/branch/test; preserve PC resize/accessibility, add Windows packaging only in a separate owned task. Research agent is read-only, so there is still only one implementation owner active.
- User paused development, then explicitly resumed. Browser owner resumed from its preserved uncommitted files; no edits were discarded. Coordinator prepares the desktop plan while browser implementation finishes.
- Packaging research corrections: builder 26.15.3 uses win.signExecutable=false (not win.sign=false), retaining executable resources. Validate app URLs by protocol/host/port/credentials, never WHATWG origin equality. Native pointer lock requires a visible focused Windows test; hidden startup cannot establish that evidence.
- Next: integrate and test the PC browser view, inspect actual screenshots and review; then build and verify the requested portable Windows .exe using the same game code.
