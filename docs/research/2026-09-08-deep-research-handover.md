# Research-handover: Vadstena — Den åttonde klangen

Datum: 2026-09-08. Beställare: Simon / sp1e. Projekt: Game1.

Statusuppdatering samma dag, efter ursprunglig handover: Simon godkände den kontrollerade exe-starten. Befintlig uppackad Windows-app har nu klarat två testkörningar med rendering på AMD Radeon 860M, muslås, W-rörelse, paus och sparat gore-val efter processomstart. Inga nya matchande Defender-händelser observerades; detta avgör inte den äldre detektionens riktighet. Endast testharnessen korrigerades, inte spelet eller säkerhetspolicyn. Fristående portable-fil, ordinarie standardprofilstart och FPS återstår. Denna notis ersätter nedanstående äldre uppgifter om väntande startgodkännande; detaljer finns i `docs/superpowers/plans/2026-09-05-windows-portable-results.md`.

Detta dokument kan ges direkt till en separat research-session. Det är ett uppdragsunderlag och en sammanfattning av projektet, inte resultatet av en ny genomförd omvärldsresearch. Externa källor nedan är startpunkter från tidigare arbete; kontrollera dem på nytt innan du använder dem som aktuell evidens.

## 1. Ditt uppdrag som research-session

Gör djup, källkritisk och praktiskt användbar research för vårt specifika spel: ett historiskt förankrat, mystiskt förstapersonsspel i Vadstena med systemdriven magi, fysisk manipulation, närstrid, magisk avståndsstrid, riktiga ragdolls och riktad avskiljning av kroppsdelar.

Målet är att ge utvecklingssessionen ett välgrundat beslutsunderlag, inte en allmän uppslagsbok om spelutveckling. Varje större slutsats ska besvara: **Vad innebär detta för Vadstena, vad bör vi göra, varför, vilken risk återstår och hur kan vi verifiera rekommendationen?**

Undersök både teknisk genomförbarhet och vad som gör spelet roligt, begripligt, obehagligt och minnesvärt. Prioritera beslut som annars riskerar dyr ombyggnad: fysikmotor, ragdoll/rigg, projektilkontakt, assetpipeline, motorval, berättelsens systemgränser och PC/webb-distribution.

Du får ifrågasätta våra teknikval. Du får inte behandla ett motorbyte, en ambitionssänkning eller ett ändrat spelkoncept som redan beslutat. Redovisa alternativ, kostnader och evidens; implementation och ändring av godkänd omfattning beslutas separat.

Uppdraget är research och dokumentation. Ändra inte produktionskod, beroenden, säkerhetsinställningar eller hemsidan. Starta inte exe-filer, publicera inte, köp inte assets och kontakta inte arkiv eller rättighetsinnehavare utan separat uppdrag. Om ett experiment behövs: specificera en isolerad spike med acceptanskriterier för utvecklingssessionen. Skriv egna researchfiler, inte över utvecklingens `team-state.md` eller godkända spec.

## 2. Spelvision och redan fattade beslut

Arbetstitel: **Vadstena: Den åttonde klangen**. Första kapitel: **Den felaktiga klangen**.

Spelaren är en klockgjutarlärling i en stad där människor, byggnader, ljud och minnen börjar höra till olika tider. Magin är ett sätt att läsa och påverka världen, inte bara ett utbud av färgade projektiler. En trovärdig vardag gör små avvikelser skrämmande innan situationen eskalerar.

Kärnloop: iaktta en avvikelse → pröva magi → förändra en situation → hantera följden → förstå mer och fördjupa en skola.

Följande är godkänt av Simon:

- Förstaperson, PC med tangentbord och mus. Mobilutveckling är uppskjuten.
- Både en PC-webbversion för eventuell framtida publicering på sp1e.se och en körbar Windows-version i `.exe`. Ingen publicering är gjord eller automatiskt beställd här.
- Senmedeltida Vadstena som grund, arbetsår **1510**, med uttryckliga tidsbrott som tillåter senare landmärken och byggnadsfaser.
- Inga skjutvapen. Medeltida närstridsvapen och magi.
- Stor omsorg om kreativ, kombinerbar magi och dess fysiska känsla.
- Mystik och en krypande känsla av att något är fel. NPC:er kan övergå till hot, men överfall ska ha begripliga förutsättningar och förebådning.
- Verklig rigid-body-fysik, telekinesi med lyft/rotation/placering/kast, riktiga ledade NPC-ragdolls och magisk avståndsstrid.
- Energy Slicers, arbetsnamn **Skärklang**, ska kunna separera den korrekt träffade kroppsdelen. Första kapitlet använder **förberedda snittzoner**, inte godtycklig meshskärning.
- **Gore PÅ från första starten.** Ett sparat AV-val respekteras. AV ändrar presentationen, inte skada, fysik, funktionsförlust eller uppdragsutfall.
- Miljöerna mellan landmärkena är ett uttryckligt kvalitetskrav: gator, kullersten, hus, murar, träd, gränder och gårdar. De får inte reduceras till utfyllnad.

Användarens mål är hög kvalitet och trovärdighet, inte ett löfte om medicinsk vävnadssimulering eller obegränsad simulering av all materia.

## 3. Första kapitlet kontra helhetsvisionen

Första kapitlet ska ge cirka **15–20 minuters första genomspelning**. Detta är ett innehållsmål, inte uppmätt speltid eller uppskattad utvecklingstid.

Spelbart stråk: Rådhusområdet → Storgatan med sidomiljöer → S:t Per/Rödtornet. Alla fem landmärken får översiktliga platsankare, men alla fem detaljbyggs inte i första kapitlet.

Kapitlets förlopp:

1. Trovärdig vardag vid Rådhuset och en frivillig praktisk introduktion till Tyngd.
2. En avvikelse bryter ett etablerat ljud- eller beteendemönster; Klang hjälper spelaren förstå den.
3. En passage löses med fysisk manipulation eller ljudavledning.
4. En förebådad konfrontation prövar närstrid, avståndsmagi, skydd och lösa föremål.
5. Ett begränsat tidsbrott förändrar en förberedd del av kyrkomiljön utan att kapsla in spelaren eller låsa uppdraget.
6. Spelaren väljer Tyngds eller Klangs ed, prövar den exklusiva förmågan och når ett tydligt slut.

Planerat innehåll: sex vuxna humanoida NPC:er, två fientliga roller (närstrid respektive avståndsmagi), gemensam kompatibel rigg med minst två visuella varianter, sex kombinerbara hustyper, minst två gångbara sidogränder, två gårdar och en liten interiör. Fyra typer av manipulerbar rekvisita är minimikrav i miljön.

Alla fem magiskolor och alla fem landmärken finns kvar i helhetsvisionen. Full mind control, Glöd och Slöja är senare innehåll. Utanför första kapitlet ligger multiplayer, konton, alla stadsinteriörer, avancerad crafting, full byggnadsdestruktion, full vätske-/mjukvävnadssimulering, aktivt balanserande ragdoll-AI och fri meshskärning.

## 4. Magins utgångspunkt

| Skola | Grundidé | Exklusiv fördjupning | Status i visionen |
|---|---|---|---|
| Tyngd | Gripa, dra, vrida, placera och kasta; Tryckstöt med fysisk impuls | Fästpunkt: bind ett tillåtet objekt till en fri punkt inom kraftgränser | Första kapitlet |
| Klang | Lyssna efter märkta avvikelser, skapa avledande ljud, Skärklang | Återklang: lagra en kort spelgenererad ljudhändelse och återge den på annan plats | Första kapitlet |
| Vilja | Avledning och begränsad avsiktsläsning | Lånad vilja: kort kontroll av en tillåten NPC medan egen kropp är sårbar | Senare |
| Glöd | Flytta värme mellan förberedda objekt | Härdminne: lagra värme i ett sigill | Senare |
| Slöja | Avslöja falska skuggor och skapa distraherande skenbilder | Skuggbyte till en giltig förberedd destination | Senare |

Fokus begränsar aktuell ansträngning. Gensvar är ett föreslaget system för omgivningens reaktion på större ingrepp, inte en färdig implementation eller en ursäkt att straffa all experimentlust. Progression ska belöna upptäckter och lösta situationer, inte repetitiv spell-spam. En aktiv ed åt gången; spelaren ska förstå vinsten och begränsningen före sitt val.

Undersök hur skolorna får olika problemlösningsidentitet men kan dela objekt och regler. Exempel: en gripbar metallskål kan även vara resonant och senare värmeledande. Vi behöver uttryckliga material-/objektegenskaper, inte löften om att varje sak kan göra allt.

## 5. Faktiskt tekniskt nuläge och evidens

Avstämt mot lokala projektfiler och Git 2026-09-08. Senaste observerade commit: `c54cdcb`, efter `144a1ac` och desktop-implementationen `17309ce`. Arbetskopian var ren före skapandet av denna handover. Kontrollera igen i din session; utvecklingen kan fortsätta parallellt.

Aktiv arbetskopia:

`C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`

Gren: `codex/vadstena-runtime-foundation`. Spelkod ligger i underkatalogen `game/`.

De uppgivna överlämningssökvägarna direkt under `C:/Users/simon.pettersson/Claude/` gick inte att hitta 2026-09-08. Den faktiska överlämningen och exe-filen fanns i arbetskopian ovan. Utgå inte från att `Claude/` är spelrepo.

| Område | Faktiskt läge |
|---|---|
| Runtime | Fast simulering 1/60 s, inputgrind, paus/livscykel, versionerade preferenser |
| Fysik | Rapier-värld med kapselrörelse, gång/sprint/hopp/huk, trappor/ramp/väggar och dynamisk rekvisita |
| Presentation | Spelbar Three.js-teknikgård i webbläsare, muslås, meny och inställning för gore; ingen gore-grafik ännu |
| Kontrollerade tester | Typkontroll och 32/32 modul-/konfigurationstester kördes om och passerade 2026-09-08 |
| Browser | 6/6 tester rapporterade i Claudes överlämning från 2026-09-07; inte omkörda för denna handover |
| Grafikprestanda | Tidigare browserprov använde SwiftShader; ingen verifierad GPU-baserad 60-fps-prestanda |
| Windows | Electron-skal och paketering incheckade; `game/release/win-unpacked/Vadstena.exe` finns. Godkänd Windows-start/speltest och fristående portable-leverans återstår enligt överlämningen |
| Kommande spelinnehåll | Grip, magiska projektiler, NPC:er, ragdolls, avskiljning, gore-effekter, historiska slutmiljöer och full kapitelintegration är inte färdiga |
| Publicering | Ingen verifierad speldriftsättning på sp1e.se |

Låsta paket enligt läst `game/package.json`: Three.js 0.185.1, Rapier JS compat 0.20.0, TypeScript 7.0.2, Vite 8.2.2, Playwright 1.63.0, Electron 44.2.0, electron-builder 26.15.3. Node-krav: >=24.12.0 och <25. Detta är projektets observerade versionsval, inte påståenden om senaste eller rekommenderade version.

Äldre ingressrader i koncept/spec/leveranskarta anger 31 tester och fem browsertester. Det är historisk status. Researchens ursprungliga `report-source.md` säger också att inget spel finns; det dokumentet är en äldre förstudie, inte aktuell implementationsstatus.

### Windows-säkerhet: bevara osäkerheten

Defender satte tidigare den genererade exe-filen i karantän som `Trojan:Win32/Cinjo.O!cl`. Simon uppgav därefter att han själv tillåtit filerna. Överlämningen dokumenterar jämförelse med officiell Electron: 14 av 15 PE-sektioner var identiska och resurssektionen skilde sig. Det är proveniensevidens, **inte bevis på falskt positiv detektion**.

Forskningssessionen ska inte exekvera filen, återställa karantän eller ändra skydd. En fråga om kontrollerad Windows-start är ställd till Simon; denna researchbeställning är inte ett svar på den frågan. Håll säkerhetsfrågan skild från forskning om spelteknik.

## 6. Lokal läsordning och källhierarki

Läs följande relativt arbetskopians rot:

1. `docs/superpowers/plans/team-state.md` — senaste överlämning och evidens; skilj daterade tillägg från äldre statusrader.
2. `docs/superpowers/specs/2026-09-05-vadstena-chapter-design.md` — godkänd detaljerad spec och acceptansmatris.
3. `docs/VADSTENA-GAME-CONCEPT.md` — vision, skolor, historiska källor och osäkerheter.
4. `docs/superpowers/plans/2026-09-05-vadstena-delivery-map.md` — beroenden och leveransgrindar.
5. `game/package.json`, relevanta delar av `game/src/`, `game/tests/`, `game/browser/`, `game/desktop/` och `game/desktop-tests/` — faktisk kod och testtäckning.
6. `docs/superpowers/plans/2026-09-05-physical-courtyard-results.md`, `2026-09-05-playable-courtyard-results.md` och `2026-09-05-windows-portable-results.md` — uppmätta resultat och felhistorik.
7. `docs/research/report-source.md` — tidigare historisk/teknisk förstudie med källförteckning; statusen är äldre.

Användarens uttryckliga beslut gäller framför äldre formuleringar. Faktiska färska testresultat gäller framför statusetiketter. En kodfunktion, ett godkänt test och ett färdigt spelbeteende är olika sorters evidens.

Om du saknar lokal åtkomst: använd detta dokument som start, ange vad du inte kunnat kontrollera och be om specen eller relevanta filer. Låtsas inte ha läst dem.

## 7. Researchspår A — motorval och långsiktig arkitektur

Jämför den befintliga Three.js/TypeScript/Rapier-stacken med relevanta alternativ, exempelvis Godot, Unity, Unreal och andra motiverade webb-/native-lösningar. Kontrollera aktuella versioner, plattformsstöd, licenser och distributionsvillkor i primärkällor. Anta inte att alla motorer kan leverera samma webbupplevelse.

Bedöm konkret:

- Fysik, karaktärskontroll, joint-begränsningar, CCD, queries, rigg/animation, skinnade skadevarianter och ljud.
- Editor, miljöbyggande, assetimport, profilering, navigation/AI, sparning och iterationstid för ett litet AI-assisterat team.
- PC-webb kontra native Windows: visuell potential, nerladdning, minne, WASM, trådning, starttid, offline och säker paketering.
- Vad motorn faktiskt levererar färdigt och vad vi fortfarande måste implementera. Three.js är inte automatiskt en komplett speleditor, och en större motor ger inte automatiskt färdig spelkänsla.
- En kodbas kontra två runtime-spår. Hur mycket duplicering och QA uppstår om webben får en separat version?
- Kostnad, exportrestriktioner, beroenderisk, kompetensbehov och framtida underhåll. Ingen pris-/licensuppgift utan daterad källa.
- Vilken befintlig kod, data, testlogik och vilka assets kan återbrukas vid byte, och vad måste ersättas?

Leverera en kravstyrd beslutsmatris utan påhittade exakta poäng. Ge en rekommendation för nuvarande milstolpe, ett starkt alternativ och tydliga **bytestriggers**. Varken redan nedlagt arbete eller lockande funktionslistor får ensamt avgöra.

## 8. Researchspår B — fysik, telekinesi och spelkänsla

Utred kraft-/fjäder-/PD-styrt grepp av dynamiska kroppar, massberoende respons, rotationskontroll, maximalt greppavstånd, krafttak, dämpning, hinder, sikt och säkert släpp. Objekt får inte teleporteras genom väggar. Jämför fysisk trovärdighet med avsiktlig spelhjälp och redovisa kompromisserna.

Undersök instabilitetsfall: objekt mot vägg, trängda hörn, långa hävarmar, stor masskvot, låg bildfrekvens, kontakt med spelarkapseln, sovande kroppar, kast mot tunna hinder och grepp av en ledad kedja. Identifiera när CCD, delsteg eller begränsad impuls behövs och vad de inte löser.

Kapselrörelse måste fungera över visuellt detaljerad kullersten utan mikro-jitter. Skilj dekorativ geometri från rörelsekollision. Bevara fasta simuleringssteg, renderinterpolation och korrekt paus; utred replay och determinism utan att lova identiska resultat över godtyckliga plattformar.

Efterfrågad leverans: rekommenderad kontrollmodell, parametrarnas betydelse/enheter, säkra startintervall som uttryckligen är tuningshypoteser och ett testprotokoll för fysisk stabilitet och upplevd vikt. Analysera Half-Life 2 som referens för läsbar manipulation, inte som en implementation vi kan kopiera utan källkontroll.

## 9. Researchspår C — magisk strid och kontaktbestämning

Utred volymbaserad projektilsimulering, handursprung kontra kamerasikte, överlappad start, närmaste blockerande kontakt, collision layers och rörliga anatomiska mål. En stillastående raycast mot en torso är inte bevis på korrekt skärkontakt med en passerande arm.

Skärklang har horisontell eller vertikal orientering som låses vid kast i första kapitlet. Specen kräver kontakt i förberedd zon och planöverensstämmelse inom 30 grader, oberoende av normalens tecken. Föreslå implementation och tester för zonen i animerad världspose, relativa rörelser och kontaktordning. Separera fysikmotorns stöd från egen spelkod.

Utred stabila projektil-/träff-ID, återlevererade kontakter, två olika projektiler samma steg och atomär skadehantering. Samma händelse får inte dubblera skada; olika legitima projektiler ska inte felaktigt slås ihop. Första blockerande kontakt avslutar projektilen i kapitlet.

Studera samtidigt combat design: telegraphing, kasttid, återhämtning, kostnad, projektilhastighet, avstånd, skydd, vänster/högerhandsläsbarhet, träffreaktion och tydlig återkoppling när något inte går. Närstridens attack/blockering behöver samma konsekventa regler. Hur kombineras systemen utan att telekinesi blir den enda rationella lösningen?

Leverera en kontakt-/skadekedja, en liten spell-datamodell och testfall knutna till specens C01–C05. Pseudokod får föreslås men ska märkas oprövad.

## 10. Researchspår D — ragdoll, anatomi och gorepipeline

Detta är en högprioriterad teknik- och produktionsrisk. Undersök faktiska API:er för den valda språkbindningen och versionen, inte bara motorns allmänna marknadsföring. Särskilt viktigt: begränsade axel-/höftleder, cone/twist eller motsvarande konstruktion, knä-/armbågsgränser, solverstabilitet och självkontakt.

Ragdoll ska ta över aktuell animerad pose och samplade linjära/vinkelhastigheter. Animator och fysik får inte samtidigt äga samma ben. Utred bindtransformer, kropps-offset, massa/tröghet, impulsöverföring, skinnad deformation och ett reproducerbart animation-till-fysik-prov.

Godkända snittförbindelser är nio: vänster/höger axel, armbåge, höft och knä samt hals. Separation flyttar den distala kedjans ägarskap och bryter en koppling exakt en gång; ett senare snitt i en redan avskild kedja måste fungera utan dubblerad massa, mesh eller utrustning.

Utred en genomförbar authoring-pipeline för skinnade segment, slutna snittytor på båda sidor, kläder, hår, utrustning, LOD, bounds och instansierade NPC:er. Hur hindras delade material från att skada alla NPC-kopior? Hur undviks utdragna skintrianglar och återväxande lemmar vid LOD-byte?

Blodpresentation behöver begränsade partiklar, giltigt placerade dekaler, material/ljus och budgeterad livstid. Full vätskesimulering är inte krav. Fokusera på realtidsgrafik och produktionsmetod, inte medicinska skadeinstruktioner eller verkligt grafiskt skadebildmaterial.

Gore AV ska behålla samma fysiska kroppar och spelregler men använda synliga, icke-anatomiska magiska restformer och neutrala ljud/ytor. Växling ska rensa befintliga och väntande grafiska effekter före nästa bild; återaktivering får inte spela upp gamla träffar. Undersök generations-ID för pooler/callbacks och checkpoint/LOD-fall.

Leverera ett rigg-/assetkontrakt, en riskbedömning av Rapier JS för detta krav och ett minsta armseparationsprov som måste passera innan sex NPC-varianter produceras. Jämför fri runtime-skärning bara som separat framtida alternativ med tydlig merkostnad.

## 11. Researchspår E — berättande, NPC:er och systemdriven mystik

Undersök hur ett kort kapitel etablerar vardag, upptäckt, osäkerhet, konflikt och avslut utan att reducera spelaren till åskådare. Berättelsen ska tåla fysiska föremål på oväntade platser, döda informationsbärare och olika lösningsordningar.

Studera författade rutiner kontra behavior trees, utility AI eller enklare tillståndsmaskiner för sex NPC:er. Utred hörselhändelser, sikt, minne, misstanke, flykt, hjälp, fientlighet och navigering när objekt flyttas. Välj minsta modell som bär de faktiska beteendena; avancerat ramverk är inget självändamål.

En händelseregissör behöver förutsättningar, återhämtningstid, reproducerbart slumptillstånd och skydd mot överfall i menyer, spawn inne i spelaren eller staplade angrepp utan paus. Föreslå hur spelaren i efterhand kan förstå en avvikelse utan att mysteriet försvinner.

Utred miljöberättande, diegetiskt lärande, valbara journaler och fördelning mellan dialog, ljud, arkitektur och systemreaktioner. Historiska personer, klosterliv och hospitalsmiljö får inte presenteras som belägg för vår påhittade skräck eller koppla psykisk sjukdom till automatisk fientlighet.

Leverera en konkret beat sheet för 15–20 minuter, två alternativa passage-lösningar, fail-forward vid död nyckel-NPC, ett säkert tidsbrott och båda edernas korta slutprov. Märk nya idéer som förslag, inte redan godkänt manus.

## 12. Researchspår F — Vadstena, level design och historisk rekonstruktion

Landmärken: Vadstena slott, Rådhuset, Mårten Skinnares hus, Klosterkyrkan och Rödtornet/S:t Per. Varje komponent ska klassas **belagd**, **rekonstruerad** eller **fiktiv** och ha avsedd byggnadsfas. AI-bilder är aldrig historisk bevisning.

Tidigare underlag identifierar följande luckor; de ska kontrolleras, inte slätas över:

- Slottets byggstart 1545 gör det till ett framtidsintrång i 1510-världen. Skilj tidig befästning från senare palats.
- Rådhusets tidiga datering och tornfaser har motstridiga uppgifter; dagens tak och huv får inte kopieras som säker medeltid.
- Mårten Skinnares hus har institutionellt motstridiga dateringar/byggnadsfaser. Sök byggnadsarkeologi och vårdprogram, inte bara fler turisttexter.
- S:t Per var en hel kyrka runt dagens Rödtorn; dagens fristående torn är inte rätt grundmodell.
- Klosterkyrkans nuvarande tak och inredning innehåller senare förändringar. Identifierad monografi har inte lästs i sin helhet i tidigare förstudie.
- En 1642-karta, LMS D121-1:d8:15, har identifierats indirekt men originalet är inte tidigare granskat. Den är heller inte automatiskt belägg för 1510.
- Gatumått, historisk strandlinje, kullerstensutbredning, husvolymer, färger, trädarter och planteringsplatser är inte färdigbelagda.
- Dokumenterad klostermur är inte bevis för en komplett stadsmur. Placera murar utifrån kartunderlag och tidsfas.

Sök kartor, planer, sektioner, arkeologiska rapporter, bildkällor och uppmätningar. Anteckna arkivsignum, upphov, målår, skala, sid-/figurnummer, kvalitet och rättigheter. En skalmodell ger inte automatiskt säkra verkliga mått; en idealiserad gravyr är inte en inmätning.

Koppla sedan underlaget till spelbar geografi: siktlinjer, landmärkesorientering, gångavstånd, skydd, flanker, lugna rum, gränder, gårdar och återvägar. Kartkomprimering ska dokumenteras som designval. Specens fem miljövyer är Rådhusansats, marknära gata, Storgatans fasadrytm, sidogård med träd och mur/kyrkoansats.

Leverera en källstyrd rekonstruktionsplan för stråket före detaljmodellering, inte ett löfte om fullständig exakt medeltida stad.

## 13. Researchspår G — rendering, assets, ljud och gränssnitt

Bildmål: hantverksnära realism, läsbara siluetter och olika materialkänsla för kalksten, tegel, trä, järn och vax. Kallt omgivningsljus och små varma ljuspunkter är nuvarande riktning, inte ett redan färdigt ljussystem.

Utred PBR-pipeline, bakad/dynamisk belysning, skuggor, dimma, färghantering, transparens, partiklar, vegetation och detaljnivåer för faktisk PC-webb och Windows. Skilj bildmässiga vinster från CPU-/GPU-/minneskostnad. Bestäm budget genom mätning, inte genom att låna en godtycklig AAA-siffra.

Assetkedja: källmodell → export → GLB-validering/optimering → test i runtime. Meter, +Y upp, lokal figur framåt −Z, stabila pivoter/ID, material, kollision, LOD och proveniens behöver kontrakt. Undersök Blender eller andra relevanta verktyg, trim sheets, modulkit, instancing, texture compression och riggvalidering. Licensierat köpmaterial kan föreslås, inte köpas eller beskrivas som historiskt korrekt utan belägg.

Klang gör ljud till mekanik. Utred spatialisering, hinder, gränd/interiör/torgrum, respons på material, dynamisk mix och musikens roll i eskaleringen. Återklang återger spelgenererade ljudhändelser, inte mikrofoninspelningar. Skilj enkel användbar ljudpropagation från kostsam akustiksimulering.

HUD ska lämna siktytan fri. Undersök tillgänglighet: ommappning, växla/hålla grepp, textstorlek, undertexter, visuell motsvarighet till ljudledtrådar, FOV, känslighet, kameraskakning och reducerade blixteffekter. Gorevalet ska förbli oberoende av andra inställningar. Inget behov av mobil UX i denna research.

## 14. Researchspår H — tillstånd, prestanda, QA och distribution

Undersök versionerade checkpoints för entiteter, kroppar/leder, anatomi, utrustning, projektillivscykel, NPC-/uppdragstillstånd, PRNG och timers. Preferenser är separata. Återladdning får inte duplicera belöningar, behålla gamla grepp eller återaktivera rensad gore. Beständiga spel-ID ska inte vara interna Rapier-handtag.

Planera en belastningsscen som kombinerar kapitlets NPC-budget, ragdolls, rekvisita, projektiler, effekter och miljö. Mät CPU/GPU-frame time, svanslatens/stutter, fysiktid, draw calls, trianglar, minne, laddning och omstartsresurser på namngiven hårdvara, upplösning och build. Målet 60 fps är inte redan uppnått bevis.

QA ska täcka rena regler, riktig fysik, renderer/livscykel, speltest och hela kapitlets alternativa vägar. Knyt rekommendationer till specens C/P/G/E/S/U/R-acceptans-ID. Tidigare fel att bevara som regressioner: snedriktad kapselrörelse, BFCache som återställer en död vy, input efter paus, växande GPU-/fysikresurser och Vite som bevakar genererade Electron-profiler.

Webbdistribution behöver granskning av WASM, CSP, cache, komprimering, filbudget och eventuella krav för trådar. Tidigare överlämning rapporterar en global CSP på hemsidan utan `wasm-unsafe-eval`; kontrollera aktuell konfiguration. Flera CSP-policyer begränsar tillsammans. Utred både policyomstrukturering och separat ursprung om relevant, inte slentrianmässig global uppluckring. Ändra inte hemsidan inom researchuppdraget.

Windows behöver paketerad start, frånvaro av utvecklingsberoenden, säkert lokalt protokoll, sandbox/context isolation, blockerad extern navigering, preferenspersistens, uppdaterings-/signeringsstrategi och faktisk distributionstestning. Skilj `win-unpacked` med stödjande filer från en fristående portable-launcher. Ta upp Defender-historiken som olöst distributionsrisk, inte som en instruktion att kringgå skydd.

## 15. Referensspel och hur de får användas

Utgå gärna från Half-Life 2 för manipulation, Elder Scrolls Oblivion för skolor/progression och relevanta immersive sims, fysikstridsspel och mystikspel för kombinationer, tempo och miljöberättande. Välj fler referenser bara när de besvarar en konkret fråga.

För varje referens: identifiera observerat beteende, sök utvecklarnas egna tekniska föredrag/postmortems där sådana finns, skilj observation från implementation och förklara vad som kan överföras till vårt lilla PC/webb-projekt. Ett VR-spels inputmodell eller AAA-spels budget är inte direkt överförbar.

Den tidigare kodreferensen är [Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty). Gör en riktad kodgranskning av relevanta subsystem och verifiera commit/version om du använder den. Tidigare arbete är inte bevis på att hela repot redan är uttömmande analyserat. Kopiera inte dess specialbyggda fysik eller rendering utan jämförelse mot våra behov och licenskontroll.

## 16. Källor och forskningsmetod

Prioritera officiella motordokument, versionsspecifik API/source, publicerade tekniska artiklar och utvecklarnas egna presentationer. För historia: RAÄ, museer, SFV, kommunen, kyrkans inventeringar, arkiv och byggnadsarkeologi. Använd sekundärkällor för upptäckt eller tydligt markerad komplettering.

Startpunkter, inte nyverifierade slutsatser:

- [Rapier JavaScript-dokumentation](https://rapier.rs/docs/user_guides/javascript/getting_started_js/)
- [Three.js-dokumentation](https://threejs.org/docs/)
- [Electron säkerhetsguide](https://www.electronjs.org/docs/latest/tutorial/security)
- [Vadstena slott, SFV](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/vadstena-slott)
- [Rådhuset, Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/radhuset/)
- [Rödtornet, Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/rodtornet/)
- [Mårten Skinnares hus, Chalmers modellmetadata](https://odr.chalmers.se/items/f2e763aa-e008-4f6f-8ab2-2e2aeb6f825a/full)
- [Klosterkyrkans monografi, RAÄ DiVA](https://raa.diva-portal.org/smash/record.jsf?pid=diva2%3A1244203)
- [Museirapport 2007:66 med Rådhusrekonstruktioner](https://www.pdfrapporter.se/pdf/2007/2007-066.pdf)
- [Webbplatsens repository](https://github.com/sp1e/sp1e.se), åtkomst kan krävas.

För varje viktig slutsats dokumenteras: påstående, direktkälla, utgivare/författare, publiceringsdatum/version, åtkomstdatum, relevant sida/figur/API, evidensklass, osäkerhet och konsekvens för projektet. Ange uttryckligen om bara metadata/abstract eller hela dokumentet har lästs. Källor som återger samma ursprung är inte oberoende bekräftelser.

Skilj **belagt**, **härlett**, **designförslag** och **måste testas**. Markera otillgängliga källor och konflikter. Värdera rättigheter separat från faktakvalitet: en bild kan vara utmärkt referens men förbjuden att återpublicera. Skriv inte att ett asset är användbart kommersiellt utan verifierade villkor.

Gör först en bred karta, sedan fördjupning på högriskbeslut. Vid delegation enligt `codex-team-workflow`: konkreta oberoende researchfrågor, tydlig filägare, återföring av källor och begränsningar, ingen parallell produktionskod. Huvudsessionen syntetiserar motsägelser och rekommendationer; flera rapporter är inte i sig en gemensam slutsats.

## 17. Leveranser och prioriteringsordning

Föreslagen plats för researchresultat: `docs/research/deep-research/2026-09-08/` i arbetskopian, eller motsvarande export om lokal åtkomst saknas. Bevara denna handover oförändrad som beställning; skapa egna resultatfiler.

Önskade leveranser:

1. **Executive summary:** viktigaste besluten, rekommenderad riktning och vad som kan ändra slutsatsen.
2. **Engine/architecture decision:** jämförelse mot våra krav, återbruk/migrationskostnad, rekommendation och bytestriggers.
3. **Tekniskt dossier:** telekinesi, projektiler, ragdoll/anatomi, gore, dataflöden och assetkontrakt, med källstöd och testbehov.
4. **Design- och berättelsedossier:** magiskolornas identitet, kombinationsmatris, chapter beats, NPC-regler och alternativa lösningar.
5. **Historik- och miljödossier:** fas-/källmatris per landmärke, kartluckor, stråkplan, materialreferenser och rättighetsstatus.
6. **QA/prestanda/distribution:** mätplan, realistiska budgethypoteser, regressioner, PC/webb-gränser och distributionsrisker.
7. **Source ledger och riskregister:** spårbara källor, kvarvarande osäkerhet, påverkan, mitigering och vilket beslut varje risk blockerar.
8. **Implementationsnära backlog:** ett prioriterat urval konkreta spikes/uppgifter med beroenden, input, förväntad leverans och observerbar godkännandekontroll. Inte en oändlig önskelista.

Prioritera i denna ordning:

- **P0:** Ragdoll/joint-feasibility och skadeassetpipeline; snabb volymkontakt mot rörliga mål; motorbeslut för PC plus webb. Dessa kan påverka hela arkitekturen.
- **P1:** Telekinesins stabilitet/spelkänsla, skolornas samspel, kapitelstruktur och historisk kartbas före detaljproduktion.
- **P2:** Produktionspipeline för miljö/NPC/ljud, sparning, skalning, QA och distribution. Utred omedelbart tidigare om ett P0-beslut beror på dem.
- **Senare:** full mind control, övriga skolor, fri skärning och större stadsutbyggnad. Utred integrationsgränser nu, inte full implementation.

För varje föreslagen spike ange hypotes, minsta scen/data, vad som mäts, felkriterium, rekommenderad åtgärd vid misslyckande och vad som kan återbrukas. Skilj uppskattad arbetsinsats från uppmätt tid; lova inga datum utan underlag.

## 18. Kvalitetsgrind och återlämning till utvecklingen

Researchen är användbar när utvecklaren kan välja nästa steg utan att själv behöva upprepa hela sökningen. Den är inte klar bara för att den har många länkar eller många sidor.

Kontrollera före överlämning:

- Varje kritisk rekommendation har relevant evidens och en uttrycklig konsekvens för detta spel.
- Motorns dokumenterade byggstenar är separerade från vår egen återstående implementation.
- Inga användarbeslut har tyst ändrats; gore PÅ, PC-fokus, riktiga ragdolls och förberedda snittzoner består.
- Testgård, färdigt kapitel, browserstöd, native-start och offentlig distribution har separata statusar.
- Historisk osäkerhet och asseträttigheter är synliga; tidsbrott används inte för att dölja felaktiga faktapåståenden.
- Migrationsförslag beskriver konkret vinst, kostnad, risk och hur befintligt arbete hanteras.
- Resultatet slutar med de viktigaste beslut Simon behöver fatta och de första verifierbara uppgifterna för utvecklingssessionen.

Slutmålet är ett bättre Vadstena-spel: fysisk magi som känns bra, en stad man vill utforska och ett mysterium som bärs av spelvärlden. Forskningen ska tjäna den upplevelsen, inte ersätta den.
