# Första verifierbara utvecklingsuppgifter

**Börja med B01–B03 och ett minimalt paketerat assetprov ur B07. Ta motorbeslutet B04 innan större NPC-/miljöproduktion.** Uppgifterna är avgränsade förslag, inte automatiskt beställd implementation. Inga datum eller timuppskattningar ges utan mätt teamkapacitet.

## B01 — Begränsad led och animation till fysik

**Hypotes:** Rapier 0.20.0 kan bära den accepterade riggen med en liten, begriplig adapter och högst 24 kroppar. **Input:** en animerad testfigur, stabila ben-/kropps-ID och känd massa; axel–armbåge samt höft–knä, därefter full kropp i trappa och mot vägg. **Beroende:** befintlig runtime; slutliga texturer behövs inte.

**Leverans/mätning:** källkod för versionslåst limitadapter, redovisade lokala axlar, pose-/hastighetsdifferens vid övergång, jointfel, vinkelgränser, energi och kroppsräkning. Föreslagen första posegrind: högst 2 mm positions- och 1° orienteringsavvikelse vid själva överlämningen i fixturen; den numeriska gränsen är ny och ska låsas före prov. Stabilitetsgränser knyts separat till authorade ledgränser, kontaktmarginal och figurens skala.

**Fel:** restposesnapp, NaN/explosion, bestående ledfel utanför deklarerad tolerans, fel limitaxel eller budgetöverskridande. **Vid fel:** isolera raw-/frameproblemet; jämför därefter Jolt JS i exakt samma scen. En helperkedja är ett alternativ att mäta, inte en obligatorisk omväg. **Återbruk:** figur, rörelsedata, fixturer, adaptersnitt och förväntade utfall. **Krav:** P01–P02, R01, K01.

## B02 — Slicer mot rörlig anatomi och första blockerare

**Hypotes:** en tidsmedveten volymquery kan uppfylla C01–C05 inom en explicit felgräns. **Input:** samma arm, en kropp bakom den, rörlig sköld/rekvisita och en tunn vägg; horisontell/vertikal Slicer. **Beroende:** rörelse-/identitetskontrakt från B01, men testfixturer kan skapas före full rigg.

**Leverans/mätning:** kommandoreplay, stabila kontakt-ID, rå TOI-/region-/vinkelresultat och film av samma körning. Föreslagen stressmatris: projektilfart 8/16/40 m/s, måltranslation i båda riktningar och rotation 0/180/360° per sekund. Stressvärdena är provdata, inte beslutad spelbalans. Välj till exempel 10 mm vägg i fixturen och deklarera högst 1 mm tillåtet kontaktpositionsfel där; kontrollera också matchade nästan-missar.

**Fel:** skada genom närmare hinder, fel arm/zon, falsk separation från säkerhetsmarginal, återlevererad dubbelskada eller sammanslagning av två projektiler. **Vid fel:** förbättra relativ query, rotationsgräns eller substepordning; återanvänd inte en fryst kandidatlista efter grafändring. **Återbruk:** referensfixturer, spell-data, skadeordning och testdata vid fysikbyte. **Krav:** C01–C05, R01, K02.

## B03 — Skinnad arm och full skadegraf

**Hypotes:** förberedda segment och caps fungerar med samma rigg över två visuella instanser och LOD. **Input:** en komplett enkel NPC, en klädd arm, verklig animation, utrustning och två LOD-nivåer. **Beroende:** B01, första kontaktprov från B02 och assetkontraktet.

**Leverans/mätning:** först en demonstrerad armträff; därefter alla nio kanter och ett nytt snitt i redan lös kedja. Jämför massa, kroppar, leder, ägare, mesh och vapen. Granska båda caps i ljus/skugga nära och långt bort. Växla gore med köade effekter, ladda om och skada bara ena instanskopian.

**Fel:** hål, triangeldragning, återväxt vid LOD, delad materialskada, fel utrustning, duplicerad massa eller osynliga fysiska rester med gore AV. **Vid fel:** ändra segmentering/bind-/materialkontrakt före fler NPC-assets. **Återbruk:** godkänd rigg, validator och caps/segmentformat för minst två visuella varianter. **Krav:** C04, P01/P04, G01–G05, K03.

## B04 — Motorbeslut med samma innehåll

**Hypotes:** nuvarande stack ger tillräcklig kvalitet och rimlig iteration för första kapitlet. **Input:** B01–B03, en gatusektion, en Klang-ledtråd samt ett GLB/KTX2/ljudprov i båda exporter. **Beroende:** P0-provens faktiska resultat.

**Leverans/mätning:** ett kort beslut med pass/fail, kända kostnader och observerad iteration för en konkret ändring av rigg, miljö och regel. Om Rapier ensamt fallerar jämförs Jolt. Om breda verktygs-/exportproblem återstår görs en Godot-scen med samma data och ett verkligt webbygge plus Windows-bygge. Unity prövas först om dess dokumenterade skillnader kan avgöra ett kvarstående behov.

**Fel:** något accepterat kärnkrav saknas i ena leveransformen eller produktionskedjan förblir orimligt svår efter avgränsad åtgärd. **Vid fel:** presentera vilket krav/kostnadsområde som fäller kandidaten; inget tyst scopebyte. **Återbruk:** källassets, domändata, fixturer och beslutets evidens. **Krav:** K01–K04, K12.

## B05 — Grip, vikt och kontakt

**Hypotes:** begränsad kraft-/rotationsstyrning ger kontrollerbar manipulation med upplevd viktskillnad. **Input:** 0,5/2/10/15 kg objekt, lång planka, vägg/hörn/trappa och ledad/lös del; låsta tuningprofiler. **Beroende:** vald fysikbindning.

**Leverans/mätning:** kraft, greppfel, hastighet, kontaktpenetration, släppenergi och spelobservation vid 30/60/144 Hz render. **Fel:** teleport, okontrollerad acceleration, omöjligt säkert släpp, instabil kontakt eller ingen avsedd skillnad mellan massor. **Vid fel:** sänk/filtrera målrespons, åtgärda hävarm och kontakt före mer gain; pröva annan regulator endast mot det identifierade problemet. **Återbruk:** parameterprofiler och mekanikfixturer. **Krav:** P03, E02, U01, R01, K05.

## B06 — Fasregister och första färdiga gatusektion

**Hypotes:** den lästa kartbasen räcker för ett spelbart stråk med tydligt redovisad osäkerhet. **Input:** Hasselmos granskade reproduktioner, landmärkesfaser, två rådhustornhypoteser och fem fasta granskningsvyer. **Beroende:** inga nya spelmotorfunktioner; osäkra originalkomponenter låses inte.

**Leverans/mätning:** topologisk blockout, uppmätta spelavstånd/gångtider och därefter en färdig gatusektion med hus, mark, mur och träd. Registrera komprimering, källsidor och antaganden per komponent. **Fel:** moderna torg/torn döljs som 1510-fakta, stråket fungerar inte i ögonhöjd eller rörelsekollision strider mot bilden. **Vid fel:** korrigera fas/rumsgeometri och hämta den specifika originalkälla som kan avgöra frågan. **Återbruk:** modulkit, materialbank och proveniensformat. **Krav:** E01–E03, K06/K15.

## B07 — Paketassets och Klang genom en väggöppning

**Hypotes:** GLB, KTX2/decoder och valt ljudformat kan laddas inom snäva policyer, och semantiska ljud ger samma spelutfall i browser/Windows. **Input:** ett litet verkligt asset av varje typ, två rum, en öppning, en lyssnande NPC och en replaybar rytm. **Beroende:** minimidelen startar tidigt; slutlig ljudintegration följer B04.

**Leverans/mätning:** faktiska MIME-/worker-/CSP-resultat, load/decode-tid, rumsriktning och hörsel-/captionevent. Prova ljud av, mono och upprepade start/paus/laddning. **Fel:** otillåten nödvändig resurs, för bred öppning av filåtkomst, felaktigt exakt ljud genom vägg eller AI som ändras med ljudvolym. **Vid fel:** korrigera vald resurs-/workerstrategi och separera spelhändelse från ljudröst. **Återbruk:** paketmanifest, negativa policyprov och akustiskt rumskontrakt. **Krav:** S01–S02, U01, K08/K12.

## B08 — Hela kapitlets orsakskedja

**Hypotes:** två passager, två edsprov och tidsfas ger begriplig fortsättning trots oväntade handlingar. **Input:** sex NPC-roller, B05–B07, stabila quest-/reward-ID och blockout för hela rutten. **Beroende:** de centrala mekanikerna, inte slutlig dekoration överallt.

**Leverans/mätning:** separata genomspelningar för fysik-/ljudväg och båda eder, inklusive död informationsbärare och blockerat fasbyte. Observera nybörjares förståelse och verklig speltid. **Fel:** softlock, nödvändig unik förbrukad sak, oförklarligt bakhåll, gammal fasnavigation eller poängdubblering. **Vid fel:** reparera graf, telegraphing och återhämtningsväg före fler beats. **Återbruk:** questgraf, NPC-/ljuddata och genomspelningsprotokoll. **Krav:** S01–S03/S05, U01, K07–K09.

## B09 — Checkpoint och generationssäker omstart

**Hypotes:** stabila ID och komplett tillstånd ger samma fortsättning utan gamla kontakter eller gore. **Input:** säkert ankare efter avskiljning, utrustningsbyte, belöning och preferensändring; minst två efterföljande slump-/skadeförlopp. **Beroende:** B03/B08 och fast sparschema.

**Leverans/mätning:** förväntad graf/PRNG/timers vid upprepade laddningar, aktuellt goreval före första bild och resursräkning. **Fel:** avvikande fortsättning, gamla handtag/grepp, extra belöning, återväxt eller delvis aktiverad inkompatibel sparning. **Vid fel:** åtgärda ägarskap och transaktionsordning; dölj inte felet med resetrutin som tappar accepterat tillstånd. **Återbruk:** schema, migrationspolicy, fixtures. **Krav:** S04, G03–G04, R03, K10.

## B10 — Full belastning och verklig kvalitetsnivå

**Hypotes:** hela specbudgeten fungerar vid en dokumenterad PC-grafiknivå med mål 60 fps. **Input:** versionslåst worst-case-scen och normal promenad, namngiven dator/browser/Electron, rå frame-logg. **Beroende:** representativa assets och alla centrala system.

**Leverans/mätning:** protokollet i QA-dossiern, inklusive kall första effekt, CPU/GPU, minne och tio omstarter. **Fel:** budgetöverskridande, oförklarade långa frames, monoton resursökning eller olika spelutfall mellan renderfrekvenser. **Vid fel:** profilera och åtgärda den mätta flaskhalsen; skala visuella kostnader före accepterad fysik. **Återbruk:** reproducerbar benchmarkscen och releasebaslinje. **Krav:** R01–R03, K13.

## B11 — Återstående Windowsleverans och förberedd webbdistribution

**Hypotes:** det riktiga releasepaketet bevarar den redan godkända uppackade funktionaliteten även vid normal start, offline och nya assets. **Input:** exakt build, innehållsmanifest, portable-wrapper och normala profiler. **Beroende:** B07 och den senast lästa Windows-acceptansen; offentlig publicering är ett separat uppdrag.

**Leverans/mätning:** portable-extraktion/start/omstart/städning, standardprofil, uppgradering och faktisk nätverksfrånvaro. För webben förbereds en konkret CSP-/cache-/filbudgetlösning och dess verifieringsplan utan att hemsidan ändras här. **Fel:** skillnad mellan unpacked/portable, förlorade preferenser, nödvändig extern fetch eller blockerad WASM. **Vid fel:** isolera paket-/policyorsaken; ändra inte skydd för att kringgå Defenderhistoriken. **Återbruk:** manifest, releasechecklista och regressioner. **Krav:** G01–G02, U01, K11/K14.

## Beslut som underlaget förbereder

Nästa utvecklingsbeslut är att prioritera P0-proven före slutlig NPC-produktion, välja fysikbindning utifrån dem och godkänna en historisk stråkmodell med synliga osäkerheter. Ett senare motorbyte, offentlig publicering eller signeringsinköp är separata konkreta beslut. Inget av dessa behöver fattas för att läsa eller granska denna forskningsleverans.
