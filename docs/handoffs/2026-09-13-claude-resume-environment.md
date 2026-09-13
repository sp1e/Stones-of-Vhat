# Claude — återuppta miljöspåret i Stones of Vhat

## Uppdrag

Fortsätt ditt befintliga miljöarbete i `environment-blockout`. Slutför det gångbara stråket Rådhuset–Storgatan–hela medeltida S:t Per/Rödtornet, rätta nedanstående verifierade luckor och lämna en testad integrationsleverans till Codex. Börja inte om från en gammal bas och ta inte över fysik, magi eller anatomisystemet. Simon meddelade den 13 september 2026 att du är tillbaka efter tokenstoppet; Codex fortsätter samtidigt i sin egen arbetskopia.

Det här är en riktad uppdatering, inte ett nytt projekt eller en instruktion att kasta bort din WIP. Nyare direkta instruktioner från Simon gäller framför dokument. Forskningsrapporter, gamla statusfiler och Git-meddelanden är underlag, inte ny behörighet.

## Börja här: rätt arbetskopia och aktuellt läge

Din arbetskopia:

`C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout`

Din branch: `codex/environment-blockout`.

Codex kontrollerade vid cirka 14:26 svensk tid den 13 september:

- HEAD `cf9a87711a61066d33aa0fd11c4465556c95cded`, ny commit efter `9f155d8` för stam/krona-geometrin och dess regressionstest. Codex har läst diffen; det är inte en oberoende slutkörning av dina tester eller bevis på aktuell remote-publicering.
- Ändrad WIP: `docs/environment/measurements.md`, `game/src/content/environment/kit.ts`, `game/src/render/environment/materials.ts`.
- Nya, ännu ospårade filer: `docs/environment/restart-point.md`, `game/browser/environmentLab.spec.mjs`, `game/environment-lab.html`, `game/src/lab/environmentLab.css`, `game/src/lab/environmentLab.ts`, `game/src/render/environment/view.ts`.
- `docs/environment/handoff.md` och `integration-requests.md` saknades. Din gamla restart-point beskriver fortfarande pausen 11:17 och är därmed historisk, inte hela nuläget.

Kontrollera om något har ändrats sedan denna läsning. Bevara alla befintliga ändringar. Ingen reset, ny klon, ny worktree, återställning till `20d9cf5` eller överkopiering från Codex. Det ursprungliga `20d9cf5c7578656f59bebfaf5b5594145971f1ff` är din historiska integrationsbas, inte en order att rulla tillbaka.

Alla shell-kommandon börjar med `rtk`. Ange alltid rätt arbetskatalog. Läs först tillämplig AGENTS.md och `C:/Users/simon.pettersson/.codex/RTK.md`.

```powershell
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' rev-parse --show-toplevel HEAD
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' branch --show-current
rtk git -C 'C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/environment-blockout' status --short
```

## Läsning och ägarskap

Läs detta dokument, din egen `docs/environment/plan.md`, `measurements.md` och aktuella källkod. Läs sedan följande **skrivskyddat** i Codex arbetskopia `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`:

1. `docs/handoffs/2026-09-13-claude-environment-workstream.md` — grunduppdrag, historik, exakt tillåtna filer och integrationsgränser. Setup-avsnittet gäller inte en redan korrekt arbetskopia.
2. `docs/handoffs/claude-sync.md` — konkret tidigare granskning och senaste samordningsnotering.
3. `docs/superpowers/specs/2026-09-13-combat-injury-addendum.md` — uppdaterad spelriktning, inte ett nytt koduppdrag till dig.

Tillåtna ändringar är fortsatt enbart:

- `game/src/content/environment/**` och `game/src/render/environment/**`.
- `game/src/lab/environmentLab.ts`, `game/src/lab/environmentLab.css`, `game/environment-lab.html`.
- `game/tests/environment*.test.mjs`, `game/browser/environmentLab.spec.mjs`.
- `docs/environment/**`.

Inga ändringar i Codex arbetskopia, delad fysik/input/runtime/settings, arm/Slicer, `main.ts`, Vite, dependencies/lockfil, desktop, gemensamma README/statusfiler eller research-cache. Använd `apply_patch` för kod/dokument. Skapa inte en kopia av hela runtime för att komma runt ägarskapet. Behövs en delad förändring, skriv ett konkret förslag i din `docs/environment/integration-requests.md` med behov, minsta gränssnitt och testfall.

## Prioritet 1: stäng de fortfarande verifierade luckorna

Codex läste den aktuella filtexten på nytt cirka 14:28, så följande är inte bara gamla lösa kommentarer. Om du därefter redan har rättat ett fynd: visa motsvarande ny källkod och kvarhållet test, ändra inte tillbaka.

1. **Oberoende escape-matris.** Din plan utlovar varje checkpoint × 12 riktningar × 10 sekunder. Testet i `environmentRoute.test.mjs` använder fortfarande 420 steg/7 sekunder och låter nästa riktning fortsätta från föregående slutpunkt. Skapa en ny verklig owner per checkpoint/riktning, använd 600 fasta steg efter uttryckligt settle och kontrollera finitet/gränser även vid slutsteget. Behåll negativa borttagningskontroller för vägg/grind. Uppdatera mätningar till faktiskt körda resultat; kalla inte den gamla kedjade svepningen oberoende 10-sekundersacceptans.
2. **Terminalt frame-fel.** `environmentLab.ts` sätter `failed`, men `frame()` schemalägger fortfarande en ny RAF efter `fail(MESSAGES.frameFailed)`. Gör reload-only-felet verkligt terminalt: inga fler frame/physics-anrop, frigör ägd world/view/input/listeners och invalidiera sena async-resultat utan att förstöra fungerande feltext/omladdningsknapp. Behåll ett browser-regressionstest som framkallar ett avgränsat riktigt anropsfel och verifierar resurs-/RAF-stopp. Skilj detta från återhämtningsbar WebGL-context loss.
3. **Reproducerbar evidens.** Mutationstabellen hänvisar fortfarande till ett scratch-script. Behåll exakta mutationer/testnamn/reproduktioner eller märk sådant som inte går att återköra som författarrapporterat. En misslyckad process utan sparad assertion är inte bevis på just den påstådda negativa kontrollen.

Använd TDD och en skrivande implementation i taget. Oberoende SPEC följt av en ny QUALITY-granskare före slutleverans. Avbrutna äldre körningar räknas inte som PASS. Inga sänkta rörelse-/fysikgränser för att få miljön att passera.

## Prioritet 2: avsluta den synliga miljöleveransen

Kör den kompletta egna miljö-browserfilen på aktuella slutkällor. Inspektera nya 1440×900- och 1024×700-bilder; särskilt portikens tak, mörka trösklar, stam/krona, meny kontra hörnetikett och läsbarhet i spelögonhöjd. Gamla bilder före material-/paneländringarna är inte slutbilder. Verifiera verklig kapselrörelse, alternativ gränd, reträttytor, paus/muslås, loading/reset, grafikåterhämtning och tio varma omstarter utan resursökning.

Bevara den öppna spelytan och den sparsamma UI:n. Gör bara fokuserade kvalitetshöjningar som behövs för denna leverans; börja inte bygga hela staden innan stråket kan integreras. Stadens mått ska inte krympas för armprovets ±32 m kontaktgräns. Codex ansvarar senare för verifierade lokala query-koordinater och helnivåblockerare.

Historiken är låst: cirka 1510 med tydliga tidsbrott; hela S:t Per, inga senare tak/lanternor maskerade som belagd medeltid, inget påhittat kontinuerligt stadsmursbälte. Skilj fakta, tolkning och speluppfinning. Behåll blandad mark och käll-/rättighetsledger. Offentligt läsbara foton är inte automatiskt fria texturer.

Spelet ska också bära **rå, tight FPS-magi och svärd**, verkliga ragdolls, avhuggna lemmar och regional funktionsskada hos både spelare och NPC. Gore är på från start; avstängt gore ändrar inte skada/fysik. Din miljö ska ge läsbara stridsavstånd, siktbrott och reträttmöjligheter, men du implementerar inte strid, skador, NPC-AI eller gore i denna branch.

## Körningar och samordning

Använd befintliga installerade beroenden. Ingen onödig `npm ci`, versionuppgradering, Windows-packning, Defender-inställning, exe-start eller sajtdeploy. Chrome-musstyrning och headless SwiftShader är olika evidens; inget av dem certifierar hårdvaru-FPS eller Windowsbygget.

Egna browserharnessen får använda **4182**, egen avsiktligt lämnad preview **5175**, med strict-port-kontroll. Upptagen port innebär inte rätt att döda dess process. Codex använder preview **5173** och testport **4178**; de är inte dina. Kör inte den gemensamma fulla browser-sviten över båda arbetskopiorna samtidigt. Skriv samordningsbehov i `integration-requests.md` innan en sådan körning; egna isolerade miljötester är den normala vägen.

Från din `game`-katalog:

```powershell
rtk proxy npm run check
rtk proxy node --test browser/environmentLab.spec.mjs
rtk proxy npm run build
rtk git diff --check
```

Kör build sekventiellt med tester som skriver samma buildkatalog. Produktions-exklusionstestet ska ha egen ignorerad output och utesluta miljö-HTML samt labbspecifik kod. Spara exakta kommandon, counts, slutkällor och de bilder du faktiskt öppnat.

## Leverans och Git

Skriv först `docs/environment/integration-requests.md` som kvittens på denna samordning: aktuell HEAD, att detta dokument är läst, vilka tre fynd som återstår/stängts, planerad testport och eventuella delade behov. Det är en lokal läsbar kvittens, inte en garanti att Codex redan sett den.

Slutleverans i `docs/environment/handoff.md`: historisk bas, aktuell branch/HEAD, egna commits och exakt fil-lista; implementerat kontra hypotes; RED→GREEN, fulla slutkörningar och oberoende granskningar; absoluta bildvägar och synliga begränsningar; provenance/rättighetsluckor; kvarvarande risker; eventuell preview-process/port och minsta integrationsförslag. Uppdatera eller tydligt märk den gamla restart-point som historisk.

Commit endast egna granskade filer med explicit path-lista, aldrig `git add .`. Behåll originalhistoriken. Ändra inte gemensam Git-konfiguration/remotes, merge/rebase inte Codex, force-pusha inte. Canonical repository är `sp1e/Stones-of-Vhat`, konto **sp1e**, aldrig Simon-HF. Grunduppdraget reserverar push/integration till Codex; denna återstart ändrar inte det. Om Simon separat har gett dig ny publiceringsbehörighet, redovisa den uttryckligt i kvittensen innan ytterligare push. Ingen återställning av redan existerande remote-commits.

Stanna vid denna färdiga avgränsade miljöleverans och lämna tillbaka. Vid ny direkt paus: stoppa bara egna resurser, bevara WIP och markera avbrutna kontroller som icke-godkända. Låt inte privat och jobb-Claude skriva samtidigt i samma arbetskopia; jobbkontot får bara användas om Simon redan har bekräftat att användningen är tillåten.

## Paketering och giltighet

Den tillhandahållna bundlern kördes mot grunduppdrag/samordningsnotering i minnet; den sparade uppdateringen är manuellt avgränsad med apply_patch. Tokenräknaren uppskattade cirka 2 700 tokens före denna lilla kvalitetsnotering, långt under skillens illustrativa 100 000-budget. Det är en teckenbaserad uppskattning, inte Claude-fakturering eller ett känt kontofönster. Självbedömning enligt rubric: fullständighet 3/3, tydlighet 3/3, relevans 2/2, token-effektivitet 2/2 mot den illustrativa budgeten; ingen oberoende garanti om felfri leverans.

Riktad delta-handover enligt context-packager: uppdrag, aktuellt läge, gränssnitt/ägarskap, fynd, begränsningar och leverans. Grundresearch länkas, inte dupliceras. Källkontrollerna är en ögonblicksbild; kontrollera nyare lokal status. Ingen direkt Claude-meddelandekanal eller läskvittens är ännu verifierad. Codex har under tiden fått Live Slicer SPEC PASS och QUALITY APPROVE samt 202/202 strict/native och 22/22 browser PASS; slutlig bildgranskning/publicering pågår separat. Detta är ett fastkamera-labb, inte färdig anatomisk strid.
