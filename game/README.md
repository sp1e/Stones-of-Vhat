# Vadstena — spelbar teknikgård M1A

M1A är en lokalt spelbar PC-webbprototyp med Three.js-rendering och Rapier-fysik. Gården är avsiktlig prototypgeometri för rörelse, kollisioner och återstartslivscykel — inte en historisk rekonstruktion.

Krav: Node 24.12–24.x och npm. Kör från arbetskopians rot:

    rtk npm --prefix game ci
    rtk npm --prefix game run dev

Öppna sedan `http://127.0.0.1:5173/vadstena/`. Produktionsbygge och lokal preview:

    rtk npm --prefix game run build
    rtk npm --prefix game run preview

Kontroller: WASD för rörelse, mus för blick, Shift för sprint, Space för hopp, C för att huka och Esc eller Tab för paus. Startknappen begär browserns pointer lock; spelet börjar inte simulera innan låset faktiskt är aktivt. Gore-inställningen är på som standard och sparas lokalt, men M1A innehåller ännu inga gore-effekter.

Verifiering:

    rtk npm --prefix game run check
    rtk npm --prefix game run test:browser

Implementerat i M1A: förstapersonsrörelse, sprint, hopp, hukning, trappor, ramp, låg passage, fem fysiska rekvisitaobjekt, paus/fokusgrind, beständig inställning, ren återstart av fysikvärlden samt säker omladdningsåterhämtning vid WebGL-kontextförlust och återkomst från browserns sidcache.

Inte implementerat ännu: fysisk Grip, projektiler, NPC:er, strid, ragdoll, gore-grafik eller historisk spelvärld.

## Windows-paketering: byggd men ostartad

En separat Electron-wrapper, byggskript och paketeringskonfiguration finns i grenen. Det uppackade `release/win-unpacked/Vadstena.exe` är byggt och ligger på disk, men **det har aldrig startats**. Se [verifieringsresultatet](../docs/superpowers/plans/2026-09-05-windows-portable-results.md) för exakt evidens.

Bakgrund: den 5 september 2026 satte Microsoft Defender ett tidigare bygge av samma fil i karantän med detektionen `Trojan:Win32/Cinjo.O!cl`. Simon tillät därefter filerna själv och godkände fortsatt arbete, varpå ett kontrollerat ombygge genomfördes. Det är fortfarande **inte fastställt** om detektionen var falsk. Inga undantag eller karantänåterställningar har gjorts av projektets verktyg.

Den 7 september 2026 jämfördes **samtliga 15 PE-sektioner** i den genererade filen mot den officiella Electron 44.2.0-runtimen. Fjorton är bit-identiska, inklusive hela kodsektionen `.text` (192 561 152 byte). Exakt en skiljer sig: `.rsrc`, med +512 byte — resurssektionen där ikon, produktnamn och versionsinformation ligger. Hela filens differens på 512 byte förklaras alltså i sin helhet av `.rsrc`; ingen annan sektion har ändrats med en enda byte. Det visar att paketeringsverktyget inte lagt in egen körbar kod. Det bevisar inte att detektionen var falsk och ersätter inte en säkerhetsgranskning.

Tre tidigare rapporterade källfel är åtgärdade och verifierade i koden: profilkatalogen skapas synkront före `app.setPath` (`desktop/main.mjs`), ASAR-arkivet utesluter runtime-beroenden via `!node_modules/**/*` (`electron-builder.yml`), och den upprepade EPERM-omdöpningen kringgås av `electronDist: node_modules/electron/dist` tillsammans med `electron:runtime`-bootstrap.

Följande kommandon är förberedda. `pack:desktop`, `dist:desktop` och `test:desktop` är ännu inte godkända leveranskontroller:

    rtk proxy npm --prefix game run build:desktop
    rtk proxy npm --prefix game run pack:desktop
    rtk proxy npm --prefix game run test:desktop
    rtk proxy npm --prefix game run dist:desktop

Avsedd portabel fil är `game/release/Vadstena-0.1.0-win-x64-portable.exe`, en osignerad självuppackande x64-fil utan installerare. **Den är inte byggd än** — `dist:desktop` har aldrig körts. Windows kan visa säkerhetsvarningar för osignerade filer. Avsedd profil är `%APPDATA%/Vadstena`; inställningarna följer alltså inte med när programfilen flyttas, och webb- och desktopprofiler är separata.

Wrappern kör samma PC-gård offline från `app://game/`, med samma kontroller som webbversionen. Webbygget behåller `/vadstena/` och `dist/`; desktopbygget har en separat renderer i `desktop/renderer/`. Electron-fönstret är konfigurerat för sandbox, isolerad kontext, inget Node i renderern, ingen preload eller IPC, restriktiv CSP och blockerade externa sidor. Detta är **konfiguration läst i källkoden, inte verifierad i körning**. Mobilversion ingår inte.

Kvar att verifiera i körning: att fönstret startar överhuvudtaget, faktiskt muslås, GPU-renderare och bildfrekvens, att profilen skapas och består mellan starter, samt att Defender inte reagerar på nytt.

Ingen publicering eller ändring av sp1e.se ingår i M1A.
