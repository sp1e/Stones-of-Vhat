# Game1 team state

Updated 2026-09-08. Coordinator owns this file. Latest Windows acceptance is in the dated section at the end; older chronological entries retain their original status.

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
| Windows portable .exe packaging | Coordinator; windows_acceptance_review (gpt-6-astra/high), read-only review | Existing unpacked exe accepted twice on 2026-09-08 after harness-only fixes; actual AMD hardware rendering, pointer lock, movement, pause and isolated-profile persistence. Portable artifact, ordinary/default-profile launch and FPS remain unverified |

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
- Local user preview was opened at http://127.0.0.1:5173/vadstena/ (session 68031), but subsequently exited with EBUSY while Vite watched an Electron test profile. It is not currently running. Generated release, desktop renderer and test-profile paths need watcher exclusions before restart; browser QA retains separate test ports.
- Actual full Chromium with BFCache enabled restored a disposed document after Back: persisted pagehide/pageshow, canvas=0, enabled but dead Start. Original owner is adding a real navigation regression before the smallest recovery fix. Standard headless shell disables BFCache and its passing tests were not evidence for this case. Windows implementation remains gated on this material fix; no other important review findings.
- BFCache gate is now closed: 7ca88a0 reloads persisted restores via a durable pageshow listener while retaining pagehide disposal. Full suite 5/5 and independent focused BFCache 1/1 pass; fresh paused canvas, saved false and actual pointer lock verified.
- Windows allocation: fresh Astra/high implementer receives the complete task contract/code/tests, exclusive desktop/package ownership and no delegation capacity. Electron permission/path security plus native packaging justify this allocation; reassess on actual API/schema/build failures or unavoidable SDK requirements. Coordinator continues documentation and independent artifact verification. No second production writer is active.
- Windows native32/browser5/build gates pass; immediate npm audit reports zero vulnerabilities. Packaging encountered repeatable EPERM renaming extracted win-unpacked.tmp despite full-control ACL and a missing destination. Empty-directory rename succeeds. Builder tests documented electronDist copy override while read-only windows_packaging_research (Terra/high) investigates missing installed Electron dist and a reproducible build path; this separates installation diagnosis from executable QA without overlapping writes. No permission or security settings changed.
- Coordinator resolved a diagnostic-shell issue locally: Windows PowerShell was autoloading Codex runtime Security type data twice. Explicitly importing C:/Windows/System32/WindowsPowerShell/v1.0/Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1 permits native ACL/signature inspection without modifying global environment settings.
- Security stop: Defender events 1116/1117 on 2026-09-05 19:03:48–19:04:40 detected/quarantined generated win-unpacked/Vadstena.exe as Trojan:Win32/Cinjo.O!cl, threat ID 2147765393. Coordinator independently read scoped Defender events. All builds/launches stopped and task-owned app processes were closed; no assistant restored quarantine or changed security settings.
- Simon then explicitly reported allowing the files himself. Generated exe still absent. Independent read-only provenance checks matched cached Electron Windows x64 ZIP to official GitHub SHASUMS: 4021363e3090d67a144ebedb90765cf193b0e61f300c519c83f0174502a481da. Base .text SHA-256 is 5f886a6a215947a50097991314ec54f60bde33387a429eff0bc5c417e5d024d3. Base Electron is also NotSigned. This does not prove a false positive.
- Controlled resumption authorized by the user's changed state: owner fixes first-run profile order, ASAR dependency exclusion, reproducible local Electron bootstrap and Vite generated-path watcher exclusion through RED/GREEN checks, then builds unpacked once. Coordinator must verify generated .text against the known base before launch. Any renewed Defender detection/quarantine stops execution again. Results retain all history and uncertainty.
- Packaging research corrections: builder 26.15.3 uses win.signExecutable=false (not win.sign=false), retaining executable resources. Validate app URLs by protocol/host/port/credentials, never WHATWG origin equality. Native pointer lock requires a visible focused Windows test; hidden startup cannot establish that evidence.
- Next: integrate and test the PC browser view, inspect actual screenshots and review; then build and verify the requested portable Windows .exe using the same game code.

## 2026-09-07 handover: Codex paused, Claude Code continuing

The user ran out of Codex tokens on 2026-09-06 and asked Claude Code to take over until they are restored on 2026-09-12. Codex is expected to resume after that, so this file and the results documents remain the handover contract. Anything Claude Code changes is committed on the same branch, with the same evidence standard.

Independently re-measured on 2026-09-07 before any change, from `game/`:

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0, strict TypeScript |
| `npm test` | **32/32 pass**, 0 fail |
| `npm run test:browser` | **6/6 pass**, 0 fail |

These counts correct a stale claim repeated across the earlier documents. Every prior status line saying "31 native tests" or "five browser tests" predates `tests/desktopPolicy.test.mjs` and the generated-directory watcher regression in `browser/yard.spec.mjs`. The historical entries above are left unedited as a record of what was true when written.

The whole desktop increment was uncommitted until 2026-09-07: `desktop/`, `desktop-tests/`, `scripts/`, `electron-builder.yml`, `tests/desktopPolicy.test.mjs` and this results document were untracked, and seven tracked files were modified. It is now committed as 17309ce. Generated artefacts stay ignored; `check-ignore` confirms `release/`, `desktop/renderer/` and `.playtest/` are excluded, so no Electron runtime entered history.

The launch gate recorded above — "Coordinator must verify generated .text against the known base before launch" — is now closed, and closed more broadly than the gate asked. All 15 PE sections of `release/win-unpacked/Vadstena.exe` were compared against `node_modules/electron/dist/electron.exe`, not `.text` alone. Fourteen are byte-identical: `.text` (192,561,152 bytes, `5f886a6a…5d024d3`), `.rdata` (45,329,408 bytes, `41714b23…d57d8bb8`), `.pdata`, `.data`, `.reloc`, `.rodata`, `.tls`, `LZMADEC`, `malloc_h`, `.eh_fram`, `.fptable`, `CPADinfo`, `_RDATA` and `prot`. Exactly one differs: `.rsrc`, 99,840 against 99,328 bytes, +512.

Whole-file SHA-256 is `386e91ab57d7162c5809a2e681ce1185891083462d3d5ed506ab5e03c27c6d2d` at 246,202,368 bytes for the generated executable, against `07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1` at 246,201,856 bytes for the base. The whole-file delta of +512 bytes is therefore fully accounted for by `.rsrc` — the resource section electron-builder rewrites for icon, product name and version metadata. The `.text` digest also reproduces the 2026-09-05 base measurement exactly, from an independent parse. Executable code is byte-identical to official Electron 44.2.0 and the packaging tool injected none of its own. **This does not establish that the Defender detection was false**, and no exclusion, quarantine restoration or security-setting change has been made.

The executable has still **not been launched**. That decision belongs to the user, not to any agent, because of the quarantine history. Remaining unverified: window startup, native pointer lock, GPU vendor/renderer, frame rate, first-run profile creation and persistence across restarts, and whether Defender reacts to the rebuilt file.

Publishing blocker verified on 2026-09-07 against the current website configuration, not the 2026-09-05 snapshot: the site's `_headers` applies `script-src 'self' 'unsafe-inline' https://unpkg.com` on the `/*` rule, with no `'wasm-unsafe-eval'`. Rapier is WebAssembly and will fail to instantiate under that policy. A path-scoped `/vadstena/*` rule cannot fix it: two Content-Security-Policy headers are enforced as their intersection, so the restrictive one still applies. The fix has to add `'wasm-unsafe-eval'` to the global `script-src`. The Electron shell is unaffected because it serves its own CSP, which already includes `'wasm-unsafe-eval'`.

Backup posture, measured rather than assumed. No git remote is configured: `git remote -v` returns nothing. An earlier draft of this entry concluded from that alone that no off-machine copy exists. That was wrong. This is a linked worktree whose `.git` file points at `Dokument/Game1/.git/worktrees/runtime-foundation`, so the object database lives inside the OneDrive-synced Documents folder, and every file under that `.git` carries a `ReparsePoint` attribute — the OneDrive Files On-Demand marker. The repository is therefore replicated to OneDrive. It measures 906 KB with 310 objects across 2 packs, and `git fsck` reports no errors.

That is a real off-machine copy, but it is not a remote and should not be treated as one. OneDrive replicating a live `.git` is a known source of corruption and sync conflicts when two processes touch the object database, it offers no branch protection or review flow, and file-version retention is not a substitute for reachable history. Whether to add an actual remote is the user's decision and remains open; it has been raised, not resolved.

## 2026-09-08: authorized unpacked Windows acceptance

Simon explicitly approved starting/testing the existing Windows build without Defender-setting changes and with immediate stop on a new warning. Coordinator verified the existing exe SHA256 against the recorded build (`386e91ab…c6d2d`), and checked packaged main/policy/renderer bytes against local desktop inputs. No rebuild, restoration, exclusion, signing, publication or game-code change was performed.

Allocation under codex-team-workflow: independent acceptance review -> Astra/high -> security/test-lifecycle reasoning while coordinator owns execution and documentation -> reassess on concrete harness defects. Reviewer remained read-only. Game-playtest required actual screenshot inspection, fulfilled for the packaged menu and active courtyard; PC-only scope retained.

The first run exposed a harness race: immediate reload after firstWindow cancelled the shell's pending loadURL with ERR_ABORTED. The second exposed an invalid CSP probe: debugger evaluation permits unsafe eval by default. Only `game/desktop-tests/app.spec.mjs` changed: strict app-URL/load readiness before reload, CDP evaluation with debugger CSP bypass disabled and positive control, and phase-separated error checks through gameplay and relaunch. Independent review approved the final diff. These were test corrections, not changes to the packaged application.

Two consecutive corrected runs passed **2/2 desktop tests**, ending 14:55:04 and 14:56:21 Europe/Stockholm. Strict types and **32/32 module/configuration tests** passed again. Actual renderer: AMD Radeon(TM) 860M Graphics via ANGLE Direct3D11. This establishes hardware rendering in the test, not an FPS result. Browser tests were not rerun in this increment.

Task-scoped monitor polled Defender Operational events during each run, with stop-on-detection and executable-disappearance checks. No new matching event was observed. User's earlier allowance means absence of a new detection is not a clean-scan result or a false-positive verdict. No Vadstena process is intentionally left running. Full evidence and remaining limits: [Windows results](2026-09-05-windows-portable-results.md).

Next Windows work: build/validate the actual single-file portable artifact, ordinary startup and default-profile behavior, retaining the security boundary. M1B magic remains the next gameplay increment. Neither the full chapter nor all Windows distribution acceptance is complete. Research handover: `docs/research/2026-09-08-deep-research-handover.md`.
