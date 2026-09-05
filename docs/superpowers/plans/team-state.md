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
| Playable Three view/input/menu | playable_courtyard (gpt-5.6-sol/high) | Complete 6d92691 + BFCache fix 7ca88a0; 31 native, 5 browser tests and production build pass |
| Integrated browser QA and visual checks | Coordinator, browser_spec (gpt-5.6-terra/high), browser_quality (gpt-6-astra/high) | Spec PASS; quality P2 resolved and independently rechecked with real BFCache; no remaining important findings |
| Windows portable .exe packaging | windows_portable (gpt-6-astra/high); prior read-only research complete | Implementing secure shell, exact dependencies, build and actual executable tests; sole production writer, owns desktop files/package/README/results |

## Team workflow decisions

User invoked codex-team-workflow on this turn. Native subagents stay inside this task; no separate user-owned tasks. Four live slots are available, and there is no need to fill all of them. One implementation owner at a time respects the already selected subagent-driven-development workflow and shared configuration. Reviewer work is read-only. Small reversible controller-owned documentation fixes are done directly.

Significant allocation: physics builder uses gpt-6-astra/high with fresh bounded context. Real controller behavior, shape queries and lifecycle correctness justify deeper reasoning; reassess from test trajectories/API mismatches rather than repeated blind retries. Browser integration can use gpt-5.6-sol/high for the concrete prepared module contracts; final reviewer uses gpt-6-astra/high for cross-module lifecycle and physics risk. Prior agents inherited the coordinator configuration; no retrospective model-switch claim.

Retain the two ordered review gates explicitly required by the earlier selected subagent workflow (spec then quality); codex-team-workflow's single-pass default does not require extra repeated rounds. Material findings receive fixes and targeted rechecks. A nonblocking missing regression case is being added without another full review cycle.

## Checks, limitations and next action

- Browser foundation: strict types and 22 tests PASS after coverage follow-up, npm audit zero vulnerabilities; both independent reviewers verified the initial 21-test implementation and coordinator inspected the small follow-up.
- Codacy MCP unavailable. npm audit is supplementary; no Codacy/Trivy scan is claimed and no manual scanner install attempted. Reset the MCP connection to restore that check.
- Plan whitespace check found two extra blank EOF lines after commit 41a0a46; coordinator removed them and will verify the follow-up diff.
- Browser view is now rendered and tested; magic, NPC, ragdoll, gore effects and hardware performance remain unimplemented/unmeasured.
- Browser test runtime installed: Chromium 153.0.8010.12, WebGL2 available, observed renderer ANGLE/SwiftShader (software). This is only a harness smoke check, not gameplay/performance validation.
- Rapier import revealed missing Symbol.dispose typings. Coordinator added a failing bootstrap assertion, then ESNext.Disposable to tsconfig lib. Bootstrap and strict types pass; target remains ES2022 and declaration checking is not skipped.
- Historical finding: the initial 0.002 normal nudge only fixed yaw-zero movement; independent yaw-grid diagnostics then found stalls at 22.5/45 degrees. The replacement support classification in 6389f15 is now independently approved for browser integration.
- Coordinator also walked the actual five-step staircase through the physics API: maximum capsule-center height 1.9663 m, traversed to z=-6.0501, 21 bodies/colliders. This is a read-only trajectory diagnostic, not a rendered playtest.
- Physics spec review allocation uses gpt-5.6-terra/high for bounded contract/test comparison. The subsequent deeper quality review will use gpt-6-astra/high for ownership and controller edge cases.
- Correction uses a short centre-foot support ray for adhesion classification, not movement collision. Full capsule sweeps and stand clearance remain. The 0.002 nudge override was removed. Expanded 272-world/32,640-tick regression passes, plus actual descending stairs/ramp, ledge fall and steep sliding; maximum observed vertical tick change is 7.391mm, not zero jitter.
- PC scope update sent to the browser builder: remove mobile UI/branch/test; preserve PC resize/accessibility, add Windows packaging only in a separate owned task. Research agent is read-only, so there is still only one implementation owner active.
- User paused development, then explicitly resumed. Browser owner resumed from its preserved uncommitted files; no edits were discarded. Coordinator prepares the desktop plan while browser implementation finishes.
- User reiterated codex-team-workflow on resumption. Continue native assignment-based delegation, one production writer, ordered independent reviews and this coordinator-owned status file. Browser spec review uses Terra/high for bounded contract comparison; reassess on uncovered behavioral requirements, not elapsed time alone. Windows plan is written at b5f7415, with a follow-up exact dependency assertion; packaging awaits browser review closure.
- Browser quality review uses Astra/high for async teardown, input-state and cross-module resource ownership. Reassess on reproducible lifecycle findings. Coordinator's executable self-check of the Windows plan's policy snippet passed syntax and encoded path-boundary examples; this is plan evidence, not a production implementation test.
- Local user preview is running at http://127.0.0.1:5173/vadstena/ (coordinator-owned server session 68031). Test servers remain separately scoped to 4173/4174. Do not terminate the user preview during test cleanup.
- Actual full Chromium with BFCache enabled restored a disposed document after Back: persisted pagehide/pageshow, canvas=0, enabled but dead Start. Original owner is adding a real navigation regression before the smallest recovery fix. Standard headless shell disables BFCache and its passing tests were not evidence for this case. Windows implementation remains gated on this material fix; no other important review findings.
- BFCache gate is now closed: 7ca88a0 reloads persisted restores via a durable pageshow listener while retaining pagehide disposal. Full suite 5/5 and independent focused BFCache 1/1 pass; fresh paused canvas, saved false and actual pointer lock verified.
- Windows allocation: fresh Astra/high implementer receives the complete task contract/code/tests, exclusive desktop/package ownership and no delegation capacity. Electron permission/path security plus native packaging justify this allocation; reassess on actual API/schema/build failures or unavoidable SDK requirements. Coordinator continues documentation and independent artifact verification. No second production writer is active.
- Packaging research corrections: builder 26.15.3 uses win.signExecutable=false (not win.sign=false), retaining executable resources. Validate app URLs by protocol/host/port/credentials, never WHATWG origin equality. Native pointer lock requires a visible focused Windows test; hidden startup cannot establish that evidence.
- Next: integrate and test the PC browser view, inspect actual screenshots and review; then build and verify the requested portable Windows .exe using the same game code.
