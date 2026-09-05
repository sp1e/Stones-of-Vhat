# Vadstena — leveranskarta efter godkänd design

Datum: 2026-09-05. Den detaljerade kapitelspecen är godkänd. Detta är en täcknings- och leveranskarta, inte en ersättning för respektive delsystems exekverbara TDD-plan.

## Vad godkännandet omfattar

Den fulla [kapitelspecen](../specs/2026-09-05-vadstena-chapter-design.md) gäller: 15–20 minuter, Tyngd och Klang, magisk avståndsstrid, närstrid, fysisk telekinesi, ledade NPC-ragdolls, nio förberedda snittförbindelser, gore PÅ från start med sparat AV, två problemlösningsvägar, två skolval och genomarbetade mellanmiljöer.

En delplans slutförande betyder inte att kapitlet är färdigt. Inget godkänt krav tas bort för att passa ett tidigt tekniktest. Ingen publicering eller ändring av sp1e.se sker som del av det lokala grundbygget.

## Leveransordning och utgångskrav

| Del | Leverans | Obligatoriskt bevis innan den delen räknas klar |
|---|---|---|
| M0 — runtime-grund | Körbara, rendereroberoende TypeScript-moduler för preferenser, fast tidssteg och inputgrind. [Exekverbar plan](2026-09-05-runtime-foundation.md). | Röda och gröna testresultat, typkontroll, granskad kod. Detta är ännu inte en spelbar vy. |
| M1 — mekanikgård | Vite/Three/Rapier, förstapersonskapsel, gång/sprint/hopp/huk, backar/trappor/väggar, fyra propformer, fysisk Grip med placering/vridning/kast, Tryckstöt och två orienteringar av Skärklang. Sparad preferens kopplas till pausmenyn. | Spelbar lokal vy, riktiga Rapier-kollisioner, projektilsvep inklusive blockerad start och rörligt mål, sikt-/massa-/kraftgränser, paus utan kvarhängande input, omstarts-/disposaltest. |
| M2 — anatomi och gore | En validerad vuxen humanoidrigg, animation-till-ragdoll, nio snittförbindelser, regional skada, ledgränser, slutna caps, blodpresentation och neutrala restformer. | Avsiktlig armträff separerar rätt kedja med bevarad rörelse; samtliga nio snitt och upprepade snitt testas. Gore-växling rensar även väntande effekter utan ändrad fysik. |
| M3 — Vadstenas miljö | Källstyrd kart-/landmärkesblockout, detaljbyggt Rådhus–Storgatan–S:t Per-stråk, sex hustyper, två gränder, två gårdar, murar, träd och en interiör. | Fem föreskrivna granskningsvyer och gångprov. Slutmiljöer använder granskade assets/material, inte testgårdens lådor. Fem landmärken har korrekta relationsankare och uttalad tidsfas. |
| M4 — komplett kapitel | Sex NPC:er, rutiner, avvikelser, närstrid, fiendens avståndsmagi, ljudavledning, två passagevägar, tidsbrott, båda ederna, avslutning och checkpointsystem. | Båda lösningarna och skolvalen spelas igenom; död berättelseperson låser inte spelet; checkpoint återställer anatomi/PRNG/timers/fysik; tidsbrott med blockerad yta återhämtas. |
| M5 — kapitelverifiering | Samlad speltestning, tillgänglighet, prestanda, resurs-/licensgranskning och distributionsbygge. | Hela acceptanslistan C/P/G/E/S/U/R i specen passerar med dokumenterad evidens. Uppmätt hårdvara/browser anges. Publicering hanteras separat efter verifierad webbplatsintegration. |

M1:s projektilsystem och dess rörliga testmål är en teknisk grind före anatomiarbetet. En statisk raycast får inte godtas som bevis för snabb, volymbaserad träff mot en arm i rörelse. M2:s förberedda rigg måste prövas före produktion av de sex slutliga NPC-varianterna.

## Modulgränser

All ny spelkod placeras under `game/`, med egen `game/.gitignore`. Dokumenten ligger kvar i repo-roten. Befintliga användarfiler `.github/` och rotens `.gitignore` lämnas orörda.

| Ägare | Placering | Kontrakt |
|---|---|---|
| Tid och kommandon | `game/src/runtime/`, `game/src/input/` | Fasta 1/60-sekundssteg; inputgrinden producerar logiska kommandon. UI och renderfrekvens äger inte spelregler. |
| Preferenser | `game/src/settings/` | Versionerade preferenser separata från checkpoints. Giltigt false bevaras. Lagringsfel återkopplas i UI när browseradaptern ansluts. |
| Fysik | `game/src/physics/` | Meter, Y upp, lokalt framåt −Z; Rapier äger body/collider/joint-livscykel. Telekinesi använder begränsad kraft, inte mesh-teleportering. |
| Strid och magi | `game/src/combat/`, `game/src/magic/` | Stabilt projektil-ID, första blockerande kontakt, deterministisk träffordning och idempotenta effekter. Parametrar ligger i data. |
| Anatomi | `game/src/anatomy/` | Stabil segment-/joint-identitet; sever överför befintliga kroppar och bryter en förbindelse exakt en gång. |
| Innehåll | `game/src/content/`, `game/src/chapter/`, `game/src/npc/` | Historisk evidens och fiktion separeras. Uppdrag/AI läser simuleringens tillstånd, inte material eller DOM. |
| Rendering | `game/src/render/` | Interpolerar simulerade tillstånd. Äger mesh, animation, GPU-resurser och presentation av gore. |
| UI och sparning | `game/src/ui/`, `game/src/save/` | Små DOM-HUD-ytor och pausade menyer. Checkpoints serialiserar data, aldrig Three-/Rapier-objekt. |
| Assets och diagnostik | `game/public/assets/`, `game/src/diagnostics/` | Manifest med licens/proveniens/LOD/collision och mätbar resurslivscykel. M0 tillför inga assets. |

## Spårbarhet mot hela specen

| Specavsnitt / acceptans | Ansvarig leverans |
|---|---|
| 1–2: omfattning, historisk tid, berättelse, sex NPC:er | M3 + M4; M5 mäter genomspelning och kontrollerar helheten. |
| 3: kontroller, Grip, Tryckstöt, Skärklang, närstrid, ljud och eder | M0 inputgrund; M1 rörelse/Grip/projektiler; M4 närstrid/ljud/eder. |
| 4: volymbaserad projektilkontakt, C01–C05 | M1 fysiska tester; M2 koppling till anatomi och snitt. |
| 5: ragdoll, P01–P04 | M2; M1 levererar värld och Grip. |
| 6: nio snitt, G01–G05 | M0 testar preferenskodning G01/G02 på enhetsnivå; M2 levererar grafik, rensning, pool-/LOD-livscykel och fysisk paritet. |
| 7: miljö, E01–E03 | M3. |
| 8: arkitektur, ägarskap och fast simulation | M0 grund; M1 runtime; M2–M4 anslutna delsystem. |
| 9: 3D-assetkontrakt | M2 humanoidrigg och skadevarianter; M3 miljömanifest/LOD/export; M5 rättighetskontroll. |
| 10: budget, checkpoint och återhämtning, S04–S05 | M1/M2 resurslivscykel; M4 checkpoint/tidsbrott; M5 full belastning och återstart. |
| 11: HUD, tillgänglighet och webbintegration, U01 | M0 inputgrund; M1 browser/paus/preferenser; M4 full UI; M5 kompatibilitet. Publicering separat. |
| 12–14: acceptans, leveransgrindar och granskningsstatus, S01–S03, R01–R03 | M1–M5 enligt tabellen ovan; inga enhetstester ensamma friskriver visuell kvalitet eller genomspelning. |

## Verifierad verktygsbas, 2026-09-05

Lokal miljö: Node 24.16.0, npm 11.13.0. Läsbara registerkontroller fann TypeScript 7.0.2, Vite 8.2.2, Three 0.185.1, @types/three 0.185.4 och @dimforge/rapier3d-compat 0.20.0. Dessa är exakta kandidater att låsa vid respektive installation; ingen installation eller kompilering har utförts. Om versionsläget ändrats när M1 planeras ska kompatibiliteten kontrolleras igen.

M0 använder Nodes inbyggda testkörning för rena TypeScript-moduler och separat TypeScript-typkontroll. Ingen renderer eller WASM behövs för dessa tester. Node tar bort typannoteringar men gör inte typkontroll; därför är båda kommandona obligatoriska. [Node TypeScript](https://nodejs.org/api/typescript.html), [Node test runner](https://nodejs.org/api/test.html).

M1 använder appens egen Rapier 0.20.0, inte Three-addonens Rapier-typning. Den publicerade @types/three-versionen har ett separat äldre Rapier-beroende; objekt från de två versionerna får inte blandas.

Rapier 0.20.0:s `castShape` har `targetDistance` före `maxToi`; äldre kodexempel kan förskjuta parametrarna fel. Controller-rörelse kräver att appen levererar gravitation. Three-resurser behöver explicit frigöring; borttagning ur scenen är inte disposal. Dessa detaljer ska få konkreta tester i M1-planen. [Rapier World](https://rapier.rs/javascript3d/classes/World.html#castShape), [character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/), [Three disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html).

## Exekveringsstatus

- [x] Skriven designspec godkänd av Simon; förberedda snittzoner ingår.
- [x] Leveranskarta och avgränsad M0-plan skrivna.
- [x] Befintlig arbetskopia undersökt: vanlig checkout på `codex/vadstena-chapter-design`, inte länkad worktree.
- [ ] Arbetskopia vald. `using-git-worktrees` kräver ett första samtycke innan ny worktree skapas; ingen tidigare preferens finns i uppgiften.
- [ ] M0 implementerad och granskad.
- [ ] M1:s exekverbara fysik-/browserplan skriven mot M0:s verifierade gränssnitt och genomförd.
- [ ] M2–M5 planerade och genomförda i beroendeordning.

Användarens tidigare val av subagent-driven-development gäller som exekveringssätt: en implementerare i taget, därefter separat specgranskning och separat kodkvalitetsgranskning. Inga nya designgodkännanden efterfrågas för oförändrad godkänd omfattning.

Codacy MCP saknas vid verktygsinventeringen. Lokala dokumentkontroller är möjliga, men varken Codacy-analys eller beroendeanalys via Codacy är utförd. Återställ/aktivera MCP-anslutningen för den kontrollen; installera inte Codacy manuellt som genväg.
