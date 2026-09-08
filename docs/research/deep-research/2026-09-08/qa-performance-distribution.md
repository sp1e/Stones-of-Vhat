# QA, prestanda, sparning och distribution

**Kvalitetsgrinden är ett fungerande kapitel i de avsedda leveransformerna.** Kodinspektion, modulprov, riktig fysik, renderprov, spelobservation och paketerad start besvarar olika frågor. Ingen av dem ersätter de andra.

## 1. Nuläge efter uppdaterad handover

| Område | Senaste lästa evidens | Exakt begränsning |
|---|---|---|
| Typkontroll och modul-/konfigurationsprov | 32/32 PASS och typkontroll, omkörda av utvecklingssessionen 2026-09-08. | Ingen omkörning av researchsessionen; testerna gäller befintlig teknikgård och skal. |
| Browser | 6/6 rapporterade 2026-09-07. | Inte omkörda i Windows-tillägget eller här. Tidigare SwiftShader-prov är inte hardware-FPS. |
| Uppackad Windows-app | Två korrigerade körningar 2/2 PASS, avslutade 14:55:04 och 14:56:21 Europe/Stockholm 2026-09-08. Senaste rålogg läst. | Testad befintlig app med stödfiler och isolerad användarprofil. Inte portable-wrapper eller vanlig standardprofilstart. |
| Windows-beteende | AMD Radeon 860M via ANGLE/D3D11, muslås, W-rörelse, paus, gore OFF efter processomstart; ON i ny profil. | Ingen uppmätt FPS, full stridskontroll eller historiskt slutkapitel. |
| Windows-säkerhetsevidens | Specifika konfigurations-/policyprober passerade; inga nya matchande Defender-händelser observerade under försöken. | Ingen säkerhetsklarering eller slutsats att den äldre detektionen var falsk. |
| Portable/offline/publicering | Lokal protokollbas och paketerade resurser finns. | Fristående portable-fil saknas som accepterad leverans; värddatorn var inte nätverksfrånkopplad. Ingen verifierad speldriftsättning. |

Den uppdaterade ingressen i handovern ersätter dess äldre uppgift om väntande startgodkännande. Källor: [Windows-resultat och begränsningar](../../../superpowers/plans/2026-09-05-windows-portable-results.md), [senaste team-state](../../../superpowers/plans/team-state.md), [rålogg från sista godkända körningen](../../../../game/.playtest/desktop-20260908-145548.stdout.log). Råloggen är en lokal, ignorerad arbetsfil och följer inte automatiskt med en framtida repositoryexport.

## 2. Acceptansmatris: samtliga 26 ID

Alla rader nedan är framtida kapitelverifiering. De markeras inte godkända av denna rapport. Nya numeriska toleranser i en spike är föreslagna provgränser och ska dokumenteras före körning; de ändrar inte specens krav.

| ID | Reproducerbart prov | Evidens och passvillkor |
|---|---|---|
| C01 | Spell mot tomrum, mål och närmare mur. | Logg för flygtid, första blockerare, förbrukning och avslut; film visar samma kontakt. |
| C02 | Arm framför/bakom torso, korsande/roterande arm och rörligt skydd. | Rätt stabilt collider-/region-ID; analytiska translationsfall och nära missar jämförs, inte närmaste-ben-gissning. |
| C03 | Zoncentrum, gräns, utanför; 0°, ±30°-gräns, 90°, omvänd normal. | Bara giltig zon och plan separerar. Felaktigt plan ger vanlig regional skada. |
| C04 | Alla nio kanter; sedan andra snittet i lös arm/ben. | Förväntad komponentgraf, invariant total massa, inga extra kroppar/mesh/vapen. |
| C05 | Startöverlapp, duplicerat event, två olika projektiler nästan samtidigt. | Förstastopp, idempotens och stabil ordning; båda projektilerna prövas mot aktuell anatomi. |
| P01 | Övergång mitt i gång/armsving och vid riktad impuls. | Pose- och hastighetsdifferens mäts; ingen restpose, dubbel benägare eller NaN. |
| P02 | Fall i trappa, vägg, rekvisita och belastad led. | Led-/vinkelavvikelse, penetrering och energi loggas; stabilt förlopp visas i riktig fysik. |
| P03 | Grip/kast/släpp av lätt, tungt, långt, sovande och avskilt objekt. | Begränsad kraft, korrekt uppvaknande och massa; ingen väggteleport eller kvarvarande Grip efter paus/laddning. |
| P04 | Samma kommando-/träffsekvens med gore ON/OFF. | Identiska diskreta skador, impulskommandon, komponentgraf och questutfall; dokumenterad flyttalstolerans. |
| G01 | Helt tom preferenslagring. | ON före första bild där gore kan förekomma. |
| G02 | Spara OFF, stäng processen, starta igen. | Explicit false består; ny checkpoint får inte skriva över valet. |
| G03 | Stäng av med aktiva effekter och köade callbacks. | Alla grafiska skade-/blodkomponenter rensas före nästa bild. |
| G04 | Återaktivera, byt LOD, återanvänd pool och ladda checkpoint. | Ingen gammal effekt eller återväxt; endast nya händelser följer aktuellt val. |
| G05 | Granska båda snittsidorna nära/fjärran, med kläder och två NPC-instanskopior. | Slutna ytor, korrekta bounds/ankare och inga utdragna trianglar eller delade skademutationer. |
| E01 | Fem specificerade vyer och obruten promenad genom stråket. | Färdiga gator, hus, murar, träd, fasnoteringar och fungerande rum; blockout är inte slutmiljö. |
| E02 | Gång/huk/hopp på marktyper och avsedda trappor. | Ingen vanlig passage ger sten-jitter, kapsellåsning eller vägggenomgång. |
| E03 | Kontrollerade sikt-/kastlinjer i varje stridsrum. | Renderat skydd och fysisk blockering överensstämmer, inklusive rörlig rekvisita. |
| S01 | Fysikvägen och ljudvägen från samma startsparning. | Båda fortsätter kapitlet utan gorekrav eller förbrukad unik nyckel. |
| S02 | Varje ed och dess exklusiva prov. | Verklig unik förmåga, fungerande omförsök och ett slut utan dubbla belöningar. |
| S03 | Döda/avväpna informationsbärare före och efter ledtråden. | Konsekvens består, nödvändig information och fortsättning förblir åtkomliga. |
| S04 | Spara säkert; skär, grip, belöna, ändra preferens och ladda upprepade gånger. | Återställt PRNG-/timertillstånd, graf, kroppsrörelse och ägarskap; aktuella preferenser, inga gamla träffar/grepp eller extra belöningar. |
| S05 | Spelare, NPC och hållet objekt upptar ny fasgeometri. | Byte blockeras atomärt; gammal fas förblir spelbar och blockering kan lösas eller återhämtas. |
| U01 | Paus under kast, inställningsklick, flikbyte och återkomst. | Ingen attack från menyklick, dold skada eller uppsamlad simuleringskuld. |
| R01 | Identiska simuleringskommandon vid 30/60/144 Hz render. | Samma diskreta utfall, deklarerade numeriska avvikelser och inga renderdrivna extra event. |
| R02 | Hela budgeten i samma scen på namngiven hårdvara/build. | Registrerade resurser inom spec; CPU/GPU/frame-time/minne faktiskt mätta. |
| R03 | Tio omstarter efter uppvärmning. | Kroppar/leder återgår till baslinje; ägda GPU-resurser växer inte monotont. |

Normerande underlag: [godkänd acceptansmatris och budget](../../../superpowers/specs/2026-09-05-vadstena-chapter-design.md). Låt rena regelprov först visa att felaktig implementation underkänns. Komplettera sedan med faktisk fysik, renderer och genomspelning; mockade leder kan inte godkänna P02.

## 3. Belastningsscen och mätning

Specbudgeten står fast: sex samtidiga NPC-riggar, högst 24 kroppar per rigg inklusive hjälpare, 40 lösa vanliga föremål, åtta magiprojektiler och högst 240 registrerade dynamiska kroppar totalt. Normal gorepresentation har högst 512 blodpartiklar och 128 dekaler. Avskiljning överför kroppar. Dessa är provvillkor, inte bevisad kapacitet.

Gör en versionsmärkt, seedad scen som samtidigt innehåller kapitlets gatusektion, sex riggar i olika faser, fallande/kolliderande ragdolls, rörlig rekvisita, åtta projektiler, ljud och maximal avsedd effektmängd. Ett test med en sovande figur och en tom bakgrund är inte R02. Visa även en representativ normal promenad så att värsta fall och vardagsbelastning kan skiljas.

| Registrera | Hur / varför |
|---|---|
| Build och dator | Commit, lockfil/build-ID, release/dev, CPU, GPU, RAM, OS, drivrutin, browser/Electron-version. AMD 860M är hittills bara verifierad renderare, inte vald miniminivå. |
| Bildläge | Verklig renderstorlek, viewport, DPR och kvalitetsval. 1920×1080 och DPR 1 är ett föreslaget första jämförelseläge, inte beslutad stödspec. |
| Tidsfördelning | Frame-time p50/p95/p99, längsta frame, stutter över fördefinierad gräns; separat kall start och uppvärmt förlopp. |
| CPU och fysik | Input/AI/query/fysik/skadetransaktion/render submission var för sig. Rapportera antal querykandidater och delsteg. |
| GPU och geometri | GPU-tid när relevant timerstöds; draw calls, trianglar, skuggpass, transparent overdraw och render targets. Om GPU-tid saknas: märk saknad, härled den inte ur total frame-time. |
| Minne och resurser | JS/WASM, observerbar processnivå, texturer/geometri/render targets samt kroppar/leder; inga påhittade exakta VRAM-tal. |
| Laddning | Överförda bytes, parse/decode/WASM-init/shaderwarmup, första synliga bild och första fungerande input. Kall respektive varm cache. |
| Omstart | Baslinje efter uppvärmning och efter var och en av tio omstarter; delade cacheassets skiljs från läckta ägda resurser. |

Ett första protokoll kan använda tre uppvärmda körningar om två minuter per scen och en separat kall körning. Längden är en föreslagen jämförelsemetod, inte en statistisk garant. Behåll rå frame-serie; medel-FPS kan dölja en dålig första strid. 60 fps motsvarar ungefär 16,67 ms per bild. Sätt interna CPU-/GPU-marginaler först efter profilering; deras tider ska inte adderas som om all CPU/GPU-körning vore seriell.

Vid problem: profilera först queries, ledhjälpare, aktiv självkontakt, shaderkompilering, skuggor och transparens. Skala dekorativa effekter, texturer och skuggkostnad före spelregler. Sovande delar kan avlastas från aktivitet men får inte försvinna på timer om de fortfarande kan påverka strid, lösning eller återväg. Tio omstarter måste frigöra egna resurser utan att förstöra delade assets. [Three om explicit frigöring](https://threejs.org/manual/en/how-to-dispose-of-objects.html).

## 4. Checkpoint som logiskt tillstånd

Spara bara vid förberedda säkra ankare efter avslutade attacker. Checkpointens format behöver schema-/innehålls-/fysikbuild-version, simuleringssteg, fullständigt PRNG-tillstånd, återstående timers, fas, questflaggor, tilldelade reward-ID, hälsa/fokus/poäng/ed och NPC-livstillstånd.

Varje beständig kropp sparas med stabilt ID, komponentägare, transform, linjär-/vinkelhastighet och sovtillstånd. Spara aktuell anatomigraf och utrustningens förankring. En seed ensam återställer inte en tidigare konsumerad slumpsekvens. Sparade motorhandtag är inte beständiga identiteter.

Återställ i definierad ordning: invalidera gammal värld och presentationsgeneration, läs aktuella preferenser, skapa entiteter/kroppar, bygg kvarvarande leder, återställ ägare och utrustning, återställ timers/PRNG/quest och publicera först därefter synlig värld. Gamla Grip-kopplingar, projektiler och träffköer rensas eftersom säkra ankare inte innehåller aktiva attacker. Beständiga effekter får en uttrycklig återstående tid och följer aktuellt goreval; historiska blodträffar spelas inte upp igen.

Validera att alla refererade assets och ID finns innan ett halvt tillstånd blir aktivt. Okänd version ger ett begripligt val att börja om, inte tyst radering. Misslyckad preferenslagring ska säga att valet bara gäller aktuell session. Laddningens framgång behöver ett återupprepat spelutfall, inte bara en JSON-parse.

## 5. Browser och framtida sp1e-publicering

Live HEAD-kontroll 2026-09-08 av huvudursprunget och `/vadstena/` gav HTTP 200 men CSP utan `wasm-unsafe-eval`. Detta är headerevidens, inte kontroll av publicerat spelinnehåll. Den aktuella policyn är ett integrationshinder att verifiera med verklig WASM-laddning när publicering beställs.

Flera CSP-policyer begränsar tillsammans. Att lägga till en tillåtande policy på spelvägen upphäver inte en annan blockerande policy. W3C skiljer den smalare WASM-tillåtelsen från generell eval. Cloudflare Pages dokumenterar både hur headerregler kombineras och hur en ärvd header kan tas bort med `! Header-Name`. En korrekt lösning kan alltså vara en omstrukturerad policy per sökväg eller ett separat ursprung. Det är inte belagt att hela hemsidans policy måste lättas globalt. [CSP Level 3, WASM och flera policyer](https://www.w3.org/TR/CSP3/), [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

| Alternativ | Konsekvens | Verifiering före publicering |
|---|---|---|
| Spel under befintlig sökväg | Kräver entydig effektiv CSP för HTML, assets och eventuell worker. | Kontrollera alla returnerade policyer på rätt URL, verklig WASM-start och att övriga webbplatsens skydd består. |
| Separat spelursprung | Ger egen policy-/cachegräns, men kräver länkar, lagrings- och eventuella CORS-beslut. | Samma runtimeprov, lokala preferenser och förutsägbar övergång till/från hemsidan. |

Inför inte trådad WASM som standardåtgärd innan mätning visar behov. En sådan lösning kan kräva cross-origin isolation och kompatibla resurshuvuden. Testa vald build i den faktiska hostingmiljön; en lokal devserver är inte bevis.

Pages gräns är 25 MiB **per fil**; den är inte hela spelets nedladdningsbudget. Dela innehåll efter verkliga laddningsbehov, håll initialt nödvändiga assets små och versionsmärk cachebara filer. HTML/manifest får inte fastna på en gammal assetsammansättning. En fristående exe behöver en annan verifierad nedladdningsväg än Pages om den överskrider filgränsen; R2 är ett möjligt senare distributionsval, inte konfigurerat här. [Pages limits, uppdaterad 2026-09-05](https://developers.cloudflare.com/pages/platform/limits/).

Behåll regression för riktig Back/BFCache i full Chromium: `pagehide`/`pageshow` kan återföra ett dokument vars renderer annars har förstörts. Kontrollera också förlorat muslås, tabbbyte, kontextförlust, laddningsfel och menyklick efter paus. En headless-shell-körning är inte likvärdig med den tidigare BFCache-fixturen.

## 6. Windows: nästa prov efter godkänd uppackad start

Nuvarande Electron-skal har sandbox, context isolation, avstängd Node-integration och ett begränsat lokalt protokoll. Detta är rätt grund att bevara. De nyligen rättade testerna väntar på verklig laddning innan reload och testar CSP utan debuggerns eval-bypass. Konfigurationsproberna ska bestå när nya assettyper införs. [Lokalt skal](../../../../game/desktop/main.mjs), [uppdaterat desktop-test](../../../../game/desktop-tests/app.spec.mjs), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

**Nyckelfynd från koden:** det nuvarande filvägsfiltret nekar GLB, KTX2 och de planerade ljudformaten. MIME-tabellen saknar dessutom uttryckliga poster för dem och har en generell octet-stream-fallback. Filvägsformen är också begränsad. Utöka endast med verkliga exporterade format och nödvändiga decoderresurser. Prov ska omfatta traversal/okända filer, tillåtna bytes och rätt MIME. KTX2:s blobworkerflöde kan kräva explicit workerpolicy eller annan paketerad workerstrategi. Det är ett identifierat kompatibilitetsfall, ännu inte ett kört felprov. [Protocol policy](../../../../game/desktop/policy.mjs).

Avsaknad av `media-src` är relevant om HTML-mediaelement används. Avkodning via Web Audio och fetch styrs också av filåtkomst och `connect-src`; det är för grovt att hävda att all ljuduppspelning är blockerad enbart på grund av `media-src`. Testa den valda ljudvägen.

| Återstående leveransprov | Observerbar kontroll |
|---|---|
| Verklig portable-wrapper | Bygg av exakt release, start från sökväg med blanksteg, extraktion, omstart och städning; samma spel och policyer. `win-unpacked` är inte en enda fristående exe. |
| Vanlig start | Utan testets särskilda flaggor, med normal `%APPDATA%/Vadstena`, tom och befintlig profil samt saknad profilkatalog. |
| Verkligt offlinefall | Nätverk otillgängligt under start och spel; GLB/KTX2/audio/decoder behövs från paketet. |
| Signering/uppdatering | Verifierad signerings-/utgivarstrategi om den beställs; första distribution kan använda tydlig manuell uppdatering med hash/build-ID och preferensbevarande. |
| Defender-historik | Originaldetektionen och senare begränsad loggobservation redovisas separat; inga undantag, återställningar eller säkerhetslöften från research. |

Electron-builder skiljer unpacked/dir från portable, som har ett eget extraktions-/startförlopp. Ingen portableleverans godkänns utan det verkliga paketet. [Electron-builder targets](https://www.electron.build/docs/targets/), [build lifecycle v26](https://www.electron.build/v26/docs/features/build-lifecycle/).

## 7. Regressioner från faktisk felhistorik

Behåll riktiga prov för diagonal kapselrörelse, Back/BFCache, input efter paus, första profilkatalog, omstart av render/fysik, och Vites ignorering av `.playtest`, `release` och genererad desktop-renderer. Bevara också de nya harnessregressionerna: startup-reload får inte avbryta första `loadURL`, debuggerns CSP-bypass får inte göra en säkerhetstest falskt grön/röd, och felobservation måste omfatta både spel och processomstart. Resultat från andra sessionen används som daterad evidens, inte som nya körningar i denna research.
