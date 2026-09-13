# Stones of Vhat — Grip-prototyp och fysisk armtestmiljö

Arbetsnamnet är **Stones of Vhat** sedan 2026-09-13. Tekniska namn och sökvägen `/vadstena/` är tills vidare oförändrade. Armens verkliga interna fysikgränser spelas nu in i en atomiskt publicerad, begränsad rörelsehistorik med en separat pausad inspektionsvy. Senaste verifiering: **116/116 native-tester, 14/14 webbläsartester samt strikt typkontroll och produktionsbygge PASS**. Se [historikprovets resultat och begränsningar](../docs/superpowers/plans/2026-09-13-native-motion-trace-results.md) och [Claude-överlämningen för parallellt miljöarbete](../docs/handoffs/2026-09-13-claude-environment-workstream.md).

En lokal PC-webbprototyp med Three.js-rendering, Rapier-fysik och fysisk telekinesi. Gården är avsiktlig prototypgeometri för rörelse, kollisioner och magins grundmekanik — inte den historiska Vadstenamiljön.

Grip är implementerat och godkänt i separata spec- och kodgranskningar. Den nya rörelsegrunden bevarar kroppsidentitet, masscentrum och hastighet när animation lämnar över till fysik. Se [Grip-resultatet](../docs/superpowers/plans/2026-09-08-grip-telekinesis-results.md), [rörelsegrunden](../docs/superpowers/plans/2026-09-08-body-motion-results.md) och [armprovets verifiering](../docs/superpowers/plans/2026-09-08-arm-lab-results.md). Ett klart delprov betyder inte att hela M1B, en fullständig ragdoll eller kapitlet är färdigt.

## Kör lokalt

Krav: Node 24.12–24.x och npm. Kör från arbetskopians rot:

    rtk proxy npm --prefix game ci
    rtk proxy npm --prefix game run dev

Öppna [PC-prototypen](http://127.0.0.1:5173/vadstena/). Beroendena behöver bara installeras när de saknas eller den låsta installationen behöver återskapas. Produktionsbygge och lokal preview:

    rtk proxy npm --prefix game run build
    rtk proxy npm --prefix game run preview

Startknappen begär webbläsarens muslås; simuleringen börjar först när låset faktiskt är aktivt.

## Kontroller

| Kontroll | Funktion |
| --- | --- |
| WASD / mus | Rörelse / blick |
| Shift / Space / C | Sprint / hopp / huka |
| Höger musknapp | Håll för Grip; släpp knappen för att släppa objektet fysiskt |
| Mushjul | Flytta greppets önskade avstånd |
| R + mus | Rotera ett hållet objekt utan att vrida kameran |
| Vänster musknapp | Kasta ett hållet objekt |
| Esc / Tab | Pausa och släpp greppet direkt |

Pausmenyn erbjuder även högerklick för att **växla** Grip. Det valet gäller endast den aktuella sessionen och återställs när sidan laddas om; paus släpper alltid objektet. Gore är **på från första start**, med ett separat sparat av-val. Prototypen har ännu inga NPC:er eller gore-effekter.

## Separat armprov för utveckling

Med utvecklingsservern igång: öppna [armprovet](http://127.0.0.1:5173/vadstena/arm-lab.html). Starta animationen, pausa vid önskad pose och välj **Överlämna + impuls**. **Fortsätt fysik** låter armen falla och träffa golv/vägg; **Återställ provet** ger en ny isolerad fysikvärld. Överlämning fungerar även medan animationen kör. Turkosa markörer visar masscentrum, röda visar ledankare.

De två segmenten behåller sina kroppar, massa och omedelbara pose; korrekt samplad masscentrums- och rotationshastighet överförs före impulsen. Vyn visar ledavstånd och kontaktpenetration från verklig Rapier-fysik. Detta är avsiktlig teknisk boxgeometri och diagnostiska ledkoordinater, inte anatomiska ledgränser eller en färdig människoarm. Armprovet har egna fysikinställningar och påverkar inte gården. HTML och labbkod ingår inte i det vanliga produktionsbygget.

Efter några steg: pausa och öppna **Inspektera senaste delstegen**. Reglaget visar de uppmätta gränserna i det senaste intervallet (0–8 i fysikläge). Kropp, animationsram och collider får separata koordinataxlar. Bannern anger att posen är historisk; ledavstånd och övriga huvudvärden visar fortfarande den aktuella fysikgränsen. Reglaget ändrar inte fysiken eller simuleringstiden. **Visa aktuell pose** återgår direkt; fortsättning, återställning och grafikförlust rensar också valet. Ett vanligt fönsterbyte medan provet redan är pausat bevarar ditt val. Inspelningen beskriver inte en kontinuerlig solverbana eller interna CCD-delsteg.

## Verifiering och omfattning

    rtk proxy npm --prefix game run check
    rtk proxy npm --prefix game run test:browser

Implementerat: förstapersonsrörelse, sprint, hopp, hukning, trappor/ramp/låg passage, fem fysiska rekvisitaobjekt, fysisk Grip med begränsad kraft och vridmoment, sikt-/massa-/avståndsgränser, placering genom fysisk sänkning/släpp, kast, markerat hållet objekt och en diskret magitråd. Paus, fokusförlust, muslåsförlust och omstart rensar input/grepp. WebGL-kontextförlust och sidcache-återkomst har återhämtning.

De automatiska webbläsartesterna använder Chromium/SwiftShader. De är funktions- och resurskontroller, inte uppmätt hårdvaruprestanda eller mänsklig bedömning av spelkänslan. Den stora befintliga Rapier/Three-bunten ger fortfarande Vites storleksvarning.

Senaste samlade kontroll: **strikt typkontroll, 104 modultester, 13 webbläsartester och webbbygget passerar**, med separata godkända spec- och kvalitetsgranskningar. Armprovet använder åtta interna fysikdelsteg per ordinarie 60 Hz-steg efter överlämning; animationen behåller sin vanliga takt. De 59 fasfallen i modultesterna kompletterades med en oberoende tät kontroll: 759 olika överlämningstidpunkter och 3 643 200 mellanliggande fysikmätningar. Största uppmätta ledavståndet var **0,52 mm** mot provgränsen 5 mm. Misslyckade tidigare inställningar och reproduktionskod är sparade i resultatdokumentet. Detta är verifiering av en avgränsad testarm, inte bevis för fullkroppsstabilitet, alla tänkbara förlopp eller prestandabudget.

Inte implementerat ännu: Focus, magiska projektiler, NPC:er, närstrid, ragdolls, anatomisk avskiljning/gore-grafik, historisk spelmiljö och kapitlets berättelse. Mobilutveckling är uppskjuten.

De [adopterade researchbesluten](../docs/superpowers/plans/2026-09-08-research-adoption.md) styr nästa etapp. [Nästa avgränsade steg](../docs/superpowers/plans/2026-09-08-moving-contact-next-slice.md) är tidsmedveten Slicer-kontakt: rörlig arm, sköld och tunn vägg, med första blockerare och tydlig kontaktposition. Det dokumentet är en fortsättningsbrief; projektilsystemet är ännu inte implementerat.

## Windows: tidigare uppackat bygge, inte den nya Grip-versionen

Det befintliga `game/release/win-unpacked/Vadstena.exe` innehåller den tidigare M1A-gården. **Det har inte byggts om med Grip.** Enligt [Windows-protokollet](../docs/superpowers/plans/2026-09-05-windows-portable-results.md) godkände Simon en kontrollerad start, och den 8 september passerade det befintliga bygget två på varandra följande körningar med 2/2 desktoptester: faktisk start, muslås, rörelse, paus och inställningspersistens i isolerad testprofil. AMD Radeon 860M/ANGLE Direct3D11 observerades; ingen FPS-mätning hävdas.

Defender satte ett tidigare bygge i karantän den 5 september som `Trojan:Win32/Cinjo.O!cl`. Simon tillät filerna själv. Inga nya matchande händelser observerades under de kontrollerade starterna, men tillåtelsen och filernas verifierade ursprung **bevisar inte en falsk positiv träff eller säkerhetsklarering**. Projektverktygen har inte ändrat Defender-inställningar, lagt till undantag eller återställt karantän. En ny varning stoppar fortsatt körning.

Bygg- och testkommandon finns nedan som dokumentation; de har inte körts som del av Grip- eller arm-etappen:

    rtk proxy npm --prefix game run build:desktop
    rtk proxy npm --prefix game run pack:desktop
    rtk proxy npm --prefix game run test:desktop
    rtk proxy npm --prefix game run dist:desktop

Den avsedda portabla filen är `game/release/Vadstena-0.1.0-win-x64-portable.exe`. **Den är ännu inte byggd och accepterad.** Vanlig start utan testflaggor, standardprofilen `%APPDATA%/Vadstena`, paketerade framtida assets och FPS återstår att verifiera. Webb- och desktopprofiler är separata.

Electron-wrappern är konfigurerad för lokalt `app://game/`, sandbox, isolerad kontext, inget Node i renderern, ingen preload/IPC och begränsad CSP/navigering. Separera verifierade kontroller i Windows-protokollet från sådant som endast lästs i källkoden. Nytt Windows-bygge och distributionsacceptans är separata arbetssteg.

Ingen publicering eller ändring av sp1e.se har gjorts.
