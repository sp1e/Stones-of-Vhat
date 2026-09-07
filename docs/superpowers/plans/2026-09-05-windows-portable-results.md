# Windows portable packaging — verification in progress

Date: 2026-09-05, Europe/Stockholm. Branch: `codex/vadstena-runtime-foundation`.

Status: **Verification resumed; no portable executable delivered yet.** Microsoft Defender initially detected and quarantined the locally built unpacked `Vadstena.exe`. Work stopped on confirmation. The user then reported allowing these files in Defender and authorized continuation. The coordinator independently checked the runtime provenance before resuming one controlled rebuild. No quarantine restoration, exclusion, security-setting change, certificate use, upload or publishing was performed by this task. The original detection has not been established as a false positive.

## Resumed verification

The official GitHub Electron 44.2.0 `SHASUMS256.txt`, the cached Windows x64 ZIP and Electron's packaged checksums agreed on SHA256 `4021363e3090d67a144ebedb90765cf193b0e61f300c519c83f0174502a481da` (158,199,548 bytes), independently checked by the coordinator. The installed and extracted base runtime both had whole-file SHA256 `07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1`; coordinator measured its `.text` section SHA256 `5f886a6a215947a50097991314ec54f60bde33387a429eff0bc5c417e5d024d3`, offset 1,536, size 192,561,152. These provenance checks do not prove a Defender detection is false.

After user authorization, the first-profile ordering was corrected by creating the directory synchronously before `app.setPath`, and explicitly routing `sessionData` to it. The archive exclusion `!node_modules/**/*` was added after the retained archive failed its assertion. Reproducible `electron:runtime` bootstrap and `electronDist: node_modules/electron/dist` now avoid dependence on a stale release temp directory. Exact script assertions failed before this change and passed afterward.

A real Vite watcher regression failed with `desktop/renderer must not be watched` before generated-directory exclusions were added. It subsequently passed with a positive control that production source remains watched. `npm run check` passed strict TypeScript and 32 native tests; `npm run test:browser` passed all six tests; web build passed. The coordinator restarted the user preview on port 5173 as session 60329 after this watcher fix.

The single controlled `npm run pack:desktop` rebuild passed with the committed configuration. Its unpacked executable was 246,202,368 bytes, SHA256 `386e91ab57d7162c5809a2e681ce1185891083462d3d5ed506ab5e03c27c6d2d`. Archive-only acceptance passed 1/1 with no runtime node_modules and the exact intended top-level files. Launch is paused for the coordinator's independent PE comparison. The sections below preserve the initial attempts and blocker evidence; later results in this section supersede their pending statuses.

## Scope and source changes

Added a separate Electron shell (`game/desktop/main.mjs`, `policy.mjs`, `package.json`), a separate Vite desktop build (`game/scripts/build-desktop.mjs`), builder configuration, pinned Electron 44.2.0 / electron-builder 26.15.3 development dependencies, package scripts, ignores, policy tests and executable/archive acceptance tests. Updated the exact dependency/script contract and game README. Existing browser production code, rendering, physics and web base `/vadstena/` were not changed. The user preview server was not deliberately stopped; the coordinator subsequently confirmed that it had exited independently with the generated-file watcher error described below.

The shell uses a privileged `app://game/` scheme, exact URL-component validation, a flat asset allowlist, restrictive CSP, sandbox/context isolation, disabled renderer Node integration, no preload/IPC/webviews/updater, denied new windows and outside navigation/requests, and permission handlers restricted to pointer lock from the owned main frame. These are source configurations; executable security and gameplay acceptance did not complete.

The intended persistent profile is `%APPDATA%/Vadstena`, separate from browser storage. The intended artifact is `game/release/Vadstena-0.1.0-win-x64-portable.exe`, unsigned and self-extracting rather than an installer. Profile data does not travel with the binary. Neither the portable artifact nor profile persistence is currently verified.

## Test-first evidence and completed checks

All commands were run through `rtk proxy` from `game/` unless noted. Exit codes below are the raw process exit codes, not filtered summaries.

| Check | Exit | Result |
| --- | --- | --- |
| `node --test tests/desktopPolicy.test.mjs`, before policy implementation | 1 | 0/1; explicit assertion `desktop policy must exist` |
| `node --test desktop-tests/app.spec.mjs`, before shell/build implementation | 1 | 0/1; explicit assertion `packaged Vadstena.exe must exist`; Playwright import succeeded |
| Exact dependency assertion, before installing Electron/builder | 1 | 5/6; mismatch was the two missing approved dependencies |
| `npm install --save-dev --save-exact electron@44.2.0 electron-builder@26.15.3` | 0 | Installed 280 packages; transitive deprecation notices for inflight, rimraf, glob and boolean |
| Immediate `npm audit` | 0 | 0 reported vulnerabilities; this does not establish that an executable is safe |
| Exact script assertion, before adding desktop package scripts | 1 | 5/6; mismatch was exactly the four missing desktop scripts |
| `node --test tests/desktopPolicy.test.mjs`, after policy implementation | 0 | 1/1 |
| `npm run check` | 0 | Strict TypeScript and 32/32 native tests passed |
| `npm run build` | 0 | Web production build passed; bundled chunk-size advisory remains (3.39 MB JS) |
| `npm run test:browser` | 0 | 5/5: movement/lifecycle/preferences, rejected pointer lock, WebGL loss, nested production base/stripped diagnostics, actual BFCache restoration |
| `npm run pack:desktop`, first attempt and one retry | 1 each | Renderer built; Electron extraction completed; directory rename failed with EPERM |
| Builder diagnostic override using already extracted Electron | 0 | Unpacked app produced; resource editing ran; log explicitly said signing skipped via `signExecutable` |
| `npm run test:desktop` on that unpacked app | 1 | Native Error dialog; `page.reload` timed out after 30 seconds; test ended after owned process tree cleanup |
| `npm run test:desktop`, subsequent check | 1 | Missing executable assertion; read-only investigation then confirmed quarantine |
| `node --test --test-name-pattern 'desktop archive' desktop-tests/app.spec.mjs` | 1 | Explicit assertion: archive must not copy runtime npm dependencies; retained archive contains `node_modules` |
| `npm run dist:desktop` | Not run | Stopped after confirmed Defender quarantine |

Policy, shell and build files were written only after the corresponding missing-feature assertions failed. The final added archive and first-profile/storage assertions are pending acceptance; no passing executable result is claimed. There are now two desktop acceptance tests (archive and app), and the retained archive is intentionally known to fail the new contract.

## Exact packaging failure and local diagnostic

The ordinary pack command failed twice in electron-builder's `extractArchive` (`app-builder-lib/out/util/electronGet.js`, underlying source `src/util/electronGet.ts:249`) at its final `fs.rename`:

```text
EPERM: operation not permitted, rename
C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\runtime-foundation\game\release\win-unpacked.tmp
-> C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\runtime-foundation\game\release\win-unpacked
```

The source existed, the target was absent, the source had Directory attributes and inherited full-control ACLs for the current user. A newly created empty directory could be renamed within the same `release` parent. A scoped PowerShell rename of the extracted runtime also failed with access denied. These checks do not prove the cause. Defender later showed file-analysis activity for the extracted `ffmpeg.dll`, but causation between that activity and EPERM was not established.

Before the quarantine was known, a one-off diagnostic command succeeded:

```text
rtk proxy node node_modules/electron-builder/cli.js --config electron-builder.yml --config.electronDist=release/win-unpacked.tmp --win --x64 --dir --publish never
```

This copied already extracted files and avoided the failing rename; it is not a reproducible clean-build solution and was not committed into configuration. A preceding attempt to use `node_modules/electron/dist` failed because it was absent. Electron 44's package has no postinstall script; running its provided `node node_modules/electron/install.js` subsequently succeeded before the security block was known. No further runtime installation or build was attempted after confirmation. Research identified a possible reproducible installer-plus-`electronDist` approach, but it remains unapplied and unverified.

## Defender evidence

Read-only source: Windows event log `Microsoft-Windows-Windows Defender/Operational`. Query was restricted to the recent task interval and messages mentioning Vadstena, win-unpacked or electron.exe. Only this task's relevant records are summarized here.

| Local time, 2026-09-05 | Event | Relevant evidence |
| --- | --- | --- |
| 19:02:41 | 1122 | Exploit Guard **audit**, rule `01443614-CD74-433A-B99E-2ECDC07BFC25`, launching unpacked Vadstena with Playwright inspection flags and an isolated test profile |
| 19:03:48; 19:04:03; 19:04:28; 19:04:40 | 1116 | Detection `Trojan:Win32/Cinjo.O!cl`, threat ID `2147765393`, category Trojan, severity Allvarlig, source System, type FastPath |
| 19:04:40 | 1117 | Quarantine (`Karantän`) applied successfully, error `0x00000000`, no additional actions required according to Defender |

Detected file:

```text
C:\Users\simon.pettersson\.config\superpowers\worktrees\Game1\runtime-foundation\game\release\win-unpacked\Vadstena.exe
```

Security intelligence: `1.459.59.0`; engine: `1.1.26080.3`. Detection records identify the same process tree as the test: main PID 60728 and children 37364, 43256 and 26200. The renderer command line showed `--enable-sandbox`; this alone is not a completed sandbox acceptance result. The owned test process tree was ended with `taskkill /PID 60728 /T /F` after the native modal prevented clean shutdown. A final process query returned no remaining `Vadstena.exe` processes. No unrelated Electron/Chrome processes were stopped.

The main Error dialog's text was not captured; only its native title `Error` and failed `page.reload` were observed. The contemporaneous quarantine is confirmed, but the dialog's exact cause is not independently established. The bounded CDP diagnostic also timed out and exited. An extra PowerShell process inventory initially had quoting errors, then was corrected; it made no system changes.

## Remaining artifacts and verification limits

After quarantine, both `release/win-unpacked/Vadstena.exe` and `release/Vadstena-0.1.0-win-x64-portable.exe` were absent. Consequently, there is no deliverable executable size, SHA256, signature or version verification. Do not present the retained runtime binary as the requested game artifact.

| Retained local file, relative to `game/` | Bytes | SHA256 |
| --- | ---: | --- |
| `release/win-unpacked/resources/app.asar` | 28,542,412 | `173b3f435e45664712e87b95538e77be5626ffd325f0f859efbb0acad8d2b1f1` |
| `node_modules/electron/dist/electron.exe` | 246,201,856 | `07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1` |
| `release/win-unpacked.tmp/electron.exe` | 246,201,856 | `07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1` |

Retained generated files remain ignored. No executable menu/game screenshots were produced by this acceptance run. Existing `.playtest/desktop-menu.png` and `desktop-play.png` predate this executable test and are not evidence for the `.exe`. Actual GPU vendor/renderer, native pointer lock, settled idle/W view change, Escape pause, clean initial resources, no Node/eval/network exposure, and full-process preference persistence remain unverified. `--enable-unsafe-swiftshader` merely permits a fallback and is not evidence that SwiftShader was selected or that an FPS target was met.

## Pending source defects and next decision

1. First-run profile creation: installed Electron declarations say `app.setPath` requires an existing directory. Current shell calls it before its asynchronous `mkdir`. The acceptance test now uses an absent child profile and checks `userData`, `sessionData` and default-session storage path, but the fix and GREEN execution are deferred.
2. ASAR content: the retained archive has 847 paths and top-level `node_modules`, `main.mjs`, `package.json`, `policy.mjs`, `renderer`. Builder falls back from the dependency-free desktop manifest to the parent game package and copies Three/Rapier runtime packages. The explicit no-node-modules archive assertion failed. An exclusion is a proposed fix, not an implemented or verified one.
3. Normal Windows packaging: repeatable EPERM requires a reproducible resolution, not reliance on stale generated runtime folders. No workaround has been applied to package scripts/configuration.
4. Defender quarantine: requires an authorized security/IT review or other direction before more executable work. No claim of a false positive, safe executable or finished Windows support is justified.
5. Vite file watching: coordinator observed that preview session 68031 had already exited with `EBUSY` while watching `game/.playtest/desktop-profile-HC0BG8/DevToolsActivePort`. Its output also recorded reloads for `desktop/renderer/index.html` and `release/win-unpacked(.tmp)/LICENSES.chromium.html`. Excluding generated desktop renderer, release and test-profile directories from Vite watching is a pending integration fix. Watcher involvement in the directory rename error is a possibility, not an established cause. The preview was not restarted after the confirmed security block.

Codacy MCP tools were unavailable in this session, as checked by the coordinator. No Codacy/Trivy tool was installed manually. `npm audit` is supplementary dependency evidence and does not replace code scanning or resolve Defender's executable detection.

## 2026-09-07: launch gate closed by PE comparison

Measured by Claude Code after Codex was paused for token exhaustion. Read-only: no process was started, no security setting touched, no quarantine action taken.

Two statements in the sections above are superseded and must not be read as current. "Pending source defects" items 1, 2 and 5 are fixed — the profile directory is created synchronously before `app.setPath` with `sessionData` routed explicitly, `!node_modules/**/*` excludes runtime dependencies from the archive, and the Vite watcher excludes generated directories. Item 3's EPERM is avoided by `electronDist: node_modules/electron/dist` with the `electron:runtime` bootstrap. "Remaining artifacts and verification limits" states both executables were absent; the unpacked `release/win-unpacked/Vadstena.exe` exists again from the controlled rebuild described in "Resumed verification". The portable single-file artefact is still absent because `dist:desktop` has never run.

The gate this document was waiting on — the coordinator's independent PE comparison before launch — is now satisfied. Rather than checking `.text` alone, **all 15 PE sections** of `release/win-unpacked/Vadstena.exe` were parsed from the section table and hashed against `node_modules/electron/dist/electron.exe`. Fourteen are byte-identical. Exactly one differs:

| Section | Size, generated | Size, base | Result |
| --- | ---: | ---: | --- |
| `.text` | 192,561,152 | 192,561,152 | identical, `5f886a6a215947a50097991314ec54f60bde33387a429eff0bc5c417e5d024d3` |
| `.rdata` | 45,329,408 | 45,329,408 | identical, `41714b23b3d0c6375cff6149ad9191bdbf9356eb6f8c0fe54639d5dcd57d8bb8` |
| `.pdata` | 5,583,872 | 5,583,872 | identical |
| `.data` | 1,384,960 | 1,384,960 | identical |
| `.reloc` | 1,225,216 | 1,225,216 | identical |
| `.rodata`, `LZMADEC` | 4,608 | 4,608 | identical |
| `.tls` | 2,560 | 2,560 | identical |
| `malloc_h` | 2,048 | 2,048 | identical |
| `.eh_fram`, `.fptable`, `CPADinfo`, `_RDATA`, `prot` | 512 | 512 | identical |
| **`.rsrc`** | **99,840** | **99,328** | **differs, +512** |

The `.text` digest reproduces the base measurement recorded on 2026-09-05 exactly, from an independent parse. Whole-file digests are `386e91ab57d7162c5809a2e681ce1185891083462d3d5ed506ab5e03c27c6d2d` at 246,202,368 bytes for the generated executable and `07b043bf9b0a0ac14a82fac0b612b7b7ed13cde727d706d74e41a45278ab51f1` at 246,201,856 bytes for the base. The whole-file delta of +512 bytes is fully accounted for by `.rsrc` alone — the resource section electron-builder rewrites for icon, product name and version metadata. No other section changed by a single byte.

Conclusion and its limit: electron-builder introduced no executable code of its own, so a Trojan classification of this file's machine code is not supported by its contents. That is **not** a determination that the Defender detection was false. Heuristic detections on large unsigned executables are not refuted by provenance, the base runtime itself is `NotSigned`, and no authorized security review has been performed. The executable remains unlaunched pending the user's decision.

Verification counts re-measured the same day, from `game/`: `npm run typecheck` exit 0; `npm test` 32/32 pass; `npm run test:browser` 6/6 pass. Earlier "31 native" and "five browser" figures in this and other documents predate `tests/desktopPolicy.test.mjs` and the watcher regression test.

The desktop increment was untracked until this date and is now committed as 17309ce, with generated artefacts confirmed excluded by `git check-ignore`.
