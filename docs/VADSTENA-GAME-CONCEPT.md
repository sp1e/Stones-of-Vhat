# Vadstena: Den åttonde klangen

**Spelkoncept och historiskt beslutsunderlag · 2026-09-05 · för Simon / sp1e**

Arbetstitel. Simon har godkänt **senmedeltid med tidsbrott** och den systemdrivna första etappen, med tillägg om magisk avståndsstrid, verklig NPC-ragdoll, riktad avskiljning, valbar gore och genomarbetade mellanmiljöer. **Gore ska vara PÅ från första starten.** Sparad avstängning respekteras. Den detaljerade [kapitelspecen](superpowers/specs/2026-09-05-vadstena-chapter-design.md), inklusive förberedda snittzoner, godkändes 2026-09-05. [Leveranskartan](superpowers/plans/2026-09-05-vadstena-delivery-map.md) visar byggordningen. M0:s runtime-grund är nu implementerad och granskad; någon spelbar vy eller färdigt kapitel finns ännu inte.

## Spelet vi vill göra

Ett stämningsdrivet förstapersonsspel där du utforskar ett igenkännbart Vadstena, löser problem med fysisk magi och försöker förstå varför människor, byggnader och minnen inte längre tillhör samma tid.

Du kommer in på ett torg som fortfarande lever: handel, smågräl, steg och vagnshjul. En klocka slår. En köpman fortsätter arbeta, men hans skugga stannar. När nästa klang kommer minns han ett samtal ni aldrig haft. Långt bort framträder ett slott som ännu inte borde finnas.

Detta är **vår fiktion**, inte lokalhistoriska uppgifter eller en påstådd Vadstenasägen. Spelaren föreslås vara en klockgjutarlärling som upptäcker hur stadens ting kan bindas till varandra. Ingen utvald allsmäktig hjälte från start: du lär dig att läsa världen genom att ingripa i den.

Kärnloopen är: **iaktta en avvikelse → pröva magi → förändra situationen → hantera följden → förstå mer och fördjupa en skola**. Strid, smygande och problemlösning ska använda samma system. Inga skjutvapen; närstridsvapen är ett medvetet komplement till magin.

## Historiskt kontrakt

Tidsbrotten ger oss konstnärlig frihet, inte rätt att kalla alla byggnadsformer medeltida. Varje byggnadsdel ska kunna skiljas som **belagd**, **rekonstruerad** eller **fiktiv**. I en frivillig journal kan spelaren läsa vad vi vet och vad vi har hittat på.

Grundvärlden ligger omkring **1500**, preciserat till arbetsåret **1510** i den skrivna specen, medan tydligt gestaltade intrång kommer från senare byggnadsfaser. Årtalet är ett designval och gör inte osäkra byggnadsdateringar säkra. Byggnadernas verkliga inbördes lägen ska styra kartan. Gångavstånd får komprimeras först efter att vi granskat en kartbas, och sådan komprimering redovisas som speldesign.

| Landmärke | Vad underlaget faktiskt säger | Konsekvens för vår rekonstruktion |
|---|---|---|
| **Vadstena slott** | Byggstart 1545; först en befästning, därefter omvandling till renässanspalats. [Statens fastighetsverk](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/vadstena-slott) | Ett uttryckligt framtidsintrång. Tidig borg och senare palats är olika modelleringsfaser, inte samma slott med olika texturer. |
| **Rådhuset** | Kommunen daterar salen till 1460; RAÄ anger försiktigare omkring 1490. Dagens tornhuv är från 1691 och brutna tak från 1776. [Kommunen](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/radhuset/), [RAÄ](https://www.bebyggelseregistret.raa.se/bbr2/anlaggning/visaHelaHistoriken.raa?anlaggningId=21300000009912&historikId=21000000535666) | Separera sal, torn, tillbyggnad, trappor och tak. Exakt tidig datering och tornets färdigställande hålls öppna; kopiera inte dagens siluett som säker medeltid. |
| **Mårten Skinnares hus** | SFV anger 1520-tal. Kommunen skiljer en stenbyggnadsdel 1519 från tegelhuset 1587; nuvarande tak anges till 1748. [SFV](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/marten-skinnares-hus-och-hospitalsmuseet), [kommunen](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/marten-skinnares-hus/) | Dateringskonflikten är olöst. Huset är ett senare intrång i en grundvärld omkring 1500 oavsett vilken datering som visar sig riktig. |
| **Klosterkyrkan** | Invigd 1430. Dagens takresning/takryttare hör till 1890-talets restaurering; inredningen har också förändrats. Den medeltida rumsdispositionen är inte fullständigt säker. [Församlingen](https://www.svenskakyrkan.se/vadstena/klosterkyrkan), [kulturhistorisk inventering, 2005](https://www.svenskakyrkan.se/filer/Vadstena%20klosterkyrka%20%28pdf%29.pdf) | Utgå från den historiska hallkyrkan och byggnadsfaserna, inte en oförändrad kopia av dagens interiör eller tak. |
| **Rödtornet / S:t Per** | Omkring 1460 uppfördes en 42 meter lång treskeppig kyrka; den revs huvudsakligen 1829. Skolan kom senare. [Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/rodtornet/) | Återskapa den fullständiga kyrkan kring tornet i grundvärlden. Dagens ensamma torn och skolbyggnad är inte en medeltida miljö. |

### Faktiska bild- och ritningsreferenser

- **Rådhusets äldre byggnadsfaser:** figur 4–5 i Ingrid Gustins museirapport *Stora Torget i Linköping* (2007:66), tryckta sidor 5–6. Rapporten använder Vadstena som jämförelse. Bilderna är moderna rekonstruktionsförslag efter Zachrisson, inte samtida ritningar; den första visar även en plan. [Öppna vid figur 4](https://www.pdfrapporter.se/pdf/2007/2007-066.pdf#page=7). Återpubliceringsrätt för illustrationerna är inte verifierad.
- **Mårten Skinnares hus:** Chalmers modell 1969-12, skala 1:20, av Lars Olof Kjellberg och Olof Meyer. Posten anger CC BY 4.0 och identifierar trappgaveln som rekonstruktion. [Metadata och licens](https://odr.chalmers.se/items/f2e763aa-e008-4f6f-8ab2-2e2aeb6f825a/full), [modell med synlig takkonstruktion](https://odr.chalmers.se/bitstreams/964b7b5d-9dc9-4b83-a397-911c1827af00/download), [foto av entré/karnap](https://odr.chalmers.se/bitstreams/fa3b12dc-1555-4f0c-8faa-9ebdaf2466a6/download). Modellens mått är inte automatiskt uppmätta byggnadsmått.
- **S:t Pers hela kyrka:** kommunens galleri innehåller en modellbild, foto Björn Andersson. Modellens upphovsperson, skala, historiska målår och rekonstruktionsunderlag anges inte. Användbar för volymstudier, otillräcklig som exakt ritning. [Källa och modellbild](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/rodtornet/).
- **Slottet och stadsbilden:** Kungliga bibliotekets *Wadstena*, gravyr av Johannes van den Aveelen från 1706, signum KoB Dahlb. III:10 Ex. I. KB anger PD. Detta är en senare bildkälla, inte belägg för staden år 1500 eller en måttriktig ritning. [KB:s katalogpost](https://suecia.kb.se/F/?func=direct&doc_number=001925334&local_base=sah).
- **Klosterkyrkans fördjupning:** Iwar Anderson m.fl., *Vadstena klosterkyrka. 1, Kyrkobyggnaden*, Sveriges kyrkor 213, 1991, identifierad i RAÄ:s DiVA. Kataloguppgifter lästa; hela monografin kunde inte hämtas i denna omgång och är inte genomgången. [RAÄ:s post](https://raa.diva-portal.org/smash/record.jsf?pid=diva2%3A1244203).

Granskningen omfattade visuellt de två Chalmersbilderna, kommunens kyrkomodell och Rådhusets två rekonstruktionsfigurer. Övriga bildkällor är här verifierade via text/metadata, inte fullständigt visuellt kontrollerade. Inga externa bilder har lagts in som spelassets.

Kartbas, historisk strandlinje, gatubeläggningar, husmått och flera fasader återstår att belägga. En 1642-karta, LMS D121-1:d8:15, identifierades genom en museirapports sökträff men originalkartan granskades inte. Den får inte behandlas som en redan kontrollerad medeltida karta. Researchen räcker för ett ärligt konceptbeslut, inte för att kalla staden en vetenskapligt exakt rekonstruktion.

## Fem skolor som förändrar hur man spelar

Det här är föreslagen originaldesign. Grundtanken är **få starka verb som går att kombinera**, inte en lång lista färgade projektiler.

| Skola | Grundmagi | Exklusiv fördjupning | Ett exempel i världen |
|---|---|---|---|
| **Tyngd** | Gripa, dra, vrida, placera och kasta fysiska föremål. | **Fästpunkt:** bind ett föremål till en markerad punkt i rummet, inom mass- och kraftgränser. | Håll en dörr öppen med en bänk, bygg ett skydd av en vagn eller rikta om ett hängande föremål. |
| **Klang** | Lyssna efter tidsavvikelser; skapa eller dämpa ljud hos märkta föremål. | **Återklang:** lagra och återge en kort ljudhändelse från en ny plats. Det återspolar inte hela fysikvärlden. | Ett falskt steg leder bort en vakt; resonans avslöjar en passage som annars ser ut som en vägg. |
| **Vilja** | Avleda uppmärksamhet och känna en persons aktuella avsikt i begränsade situationer. | **Lånad vilja:** kortvarigt styra en tillåten NPC medan din egen kropp står oskyddad. | Få tillgång till en bevakad mekanism genom någon som redan är innanför grinden. |
| **Glöd** | Flytta värme mellan förberedda objekt: tända, släcka, värma, kyla. | **Härdminne:** lagra värme i ett sigill och utlösa den senare. | Släck belysning för att smyga, eller värm en märkt metallmekanism tills den går att röra. |
| **Slöja** | Avslöja felaktiga skuggor och skapa en distraherande skenbild. | **Skuggbyte:** förflytta dig till din förberedda skenbild om vägen och destinationsutrymmet är giltiga. | Passera en bevakad siktlinje, men inte en solid vägg eller en låst berättelsegräns. |

Alla skolor kan ge enklare verktyg. En **ed till en skola** öppnar dess exklusiva förmåga; bara en sådan ed är aktiv åt gången. Valet ska beskriva både vinst och begränsning innan spelaren bekräftar det. Första versionen föreslås tillåta byte vid en fristad, inte mitt i strid. Spelaren får utvecklingspoäng genom upptäckter och lösta situationer, inte genom att kasta samma besvärjelse mot en vägg hundra gånger.

**Fokus** begränsar aktuell ansträngning. **Gensvar** beskriver hur omgivningen reagerar på stora magiska ingrepp. Vanlig experimentlust ska vara billig; kraftfulla kombinationer lämnar tydliga spår. Ingen osynlig straffmätare som gör varje användning av spelets bästa verktyg till ett misstag.

Exempel på kombination: gripa en metallskål med Tyngd, få den att klinga med Klang och skicka den bakom en vakt. Vakten söker efter ljudets verkliga position. Senare kan Glöd påverka samma föremål. Dessa kopplingar förutsätter uttryckliga egenskaper som gripbar, resonant och värmeledande; inte en utlovad simulering av all materia.

Mind control behöver egna gränser: kort varaktighet, läsbart motstånd, avbrott vid skada samt en säker återgång till spelarkroppen. En besatt eller bortförd nyckelperson får aldrig permanent låsa huvuduppdraget.

## Oro med regler

En lugn vardag måste först vara trovärdig. NPC:er behöver igenkännbara rutiner och små mänskliga beteenden innan något bryts.

En föreslagen eskalering: en blick varar för länge; en ljudkälla befinner sig på fel plats; en person svarar med en annans röst; en välbekant väg får fel slut; först därefter ett plötsligt hot. Vissa NPC:er kan angripa, andra fly, ingripa eller hjälpa. Överraskningen ska kunna förstås i efterhand utan att alla invånare är slumpmässiga fiender.

Ett begränsat händelsesystem väljer avvikelser med förutsättningar, återhämtningstid och reproducerbart slumptal. Det får inte skapa en fiende inne i spelaren, skada under menyer eller stapla överfall utan paus. Tidsbrott som ändrar solid geometri sker endast vid förberedda övergångar med kontroll av upptaget utrymme. En nödvändig övergång som blockeras ska ge en tydligt undanröjbar blockering eller säker checkpointåtergång; den får inte vänta för evigt och låsa uppdraget.

Historiska personer och institutioner är inte belägg för vår skräckfiktion. Hospitalsmiljön får inte reduceras till att patienter automatiskt är monster. Det främmande hotet är vårt påhitt.

## Första spelbara kapitlet: Den felaktiga klangen

**Godkänd riktning: en systemdriven etapp på cirka 15–20 minuter**, först för dator med tangentbord och mus. Det är ett innehållsmål, inte en uppmätt speltid eller en leveranstidsuppskattning.

Vi jämförde tre sätt att börja:

1. **Systemdrivet kapitel — rekommenderas.** En genomarbetad del av staden, fysisk magi, ett mysterium och en avslutning. Ger tidig kunskap om det faktiskt är roligt att spela.
2. **Staden först.** Alla fem landmärken som utförlig promenadmiljö. Prioriterar igenkänning, men skjuter magikänslan och NPC-problemen framför oss.
3. **Berättelsen först.** En hårt regisserad skräcksekvens. Starkare kontroll över tempot, men mindre frihet och svagare bevis på att fysiksystemen fungerar tillsammans.

Den rekommenderade etappen innehåller:

- En enkel översiktsblockout där **alla fem landmärken har avsedda platser**. Detta är planeringsgeometri, inte fem färdiga monument.
- Ett spelbart stråk kring **Rådhuset och Rödtornet/S:t Per**, med genomarbetade kullerstensgator, murar, tidsenliga hus, träd, gränder, gårdar och en liten spelanpassad interiör. Mellanmiljöerna är eget kvalitetsbedömt leveransinnehåll. Klosterkyrkan fungerar som riktmärke där siktlinjerna tillåter det. Slottets och Mårten-husets egna spelområden byggs i följande etapper.
- Tyngds grundförmåga med grip/rotation/placering/kast och en riktad Tryckstöt, samt Klangs lyssnande, avledande ljud och Energy Slicers/Skärklang. Fullt fungerande magisk avståndsstrid och ett kortsvärd med attack och blockering.
- Verklig ledad NPC-ragdoll, anatomiska träffzoner och fysiskt separerbara kroppsdelar. Energy Slicers ska kunna träffa rätt armzon och frigöra armen med bibehållen rörelse, kontaktimpuls och blod-/snitteffekter. Gore är PÅ som standard men kan stängas av och valet sparas.
- Ett fåtal invånare med rutiner, ett tydligt förebådat överfall och ett problem som kan lösas med fysik eller ljudavledning.
- Ett första tidsbrott och en avslutande ed mellan Tyngd och Klang, med ett kort prov på vald exklusiv förmåga.
- Start, paus, inställningar, kontrollhjälp, återstart, checkpoint, förlust och ett tydligt slut. Ingen evig testsandlåda utan mål.

Det allra första interna speltestet är mindre: en gård där gående, trappor, telekinesi och riktad avståndsmagi känns rätt. Ett separat rigg-/skadeprov verifierar riktig ragdoll och avskiljning innan kapitlet integreras. Dessa prov är inte slutleveransen. **Mind control, Glöd och Slöja är senare innehåll**, men entitets- och magigränssnitten utformas så att de kan tillkomma utan att ersätta grunden.

Föreslagen goremetod är förberedda anatomiska snittzoner och segment, med slutna snittytor och lokala effekter. Det ger faktisk fysisk avskiljning men inte godtycklig meshskärning var som helst på kroppen. Ragdoll och skadeutfall består när gore är av; blod och grafiska skadeformer ersätts med icke-grafisk presentation. Specen anger även omedelbar rensning vid avstängning och skydd mot att gamla effekter återkommer.

Utanför första kapitlet: multiplayer, konton, en hel öppen stad med alla interiörer, full byggnadsdestruktion, vätskesimulering, avancerad crafting och mobil FPS-styrning. Mobilbesökare ska få en fungerande presentations-/kompatibilitetsvy, inte en trasig spelstart. Touchstyrning blir ett separat beslut.

## Fysiken är en central del av spelet

Förslag: **Three.js + TypeScript + Vite + Rapier**, som ett självständigt projekt. Rapier sköter rigid-body-fysik; Three.js sköter presentation. Spelaren får kapselkollision och en kontrollerad rörelselösning. Rapier har stöd för kinematisk karaktärskontroll, men hopp och gravitationslogik behöver fortfarande byggas i spelet. [Rapier: character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/)

Ett gripet föremål förblir dynamiskt. En dämpad fjäder eller kraftregulator drar det mot ett kollisionskontrollerat handmål; det flyttas inte genom att dess position skrivs över varje bildruta. Kast använder impuls. Räckvidd, massa, skymd sikt, maximal kraft, väggkontakt och säkert släpp måste ingå från början. Rapier varnar för positionssättning som teleporterar kroppar och erbjuder CCD för snabba kast. [Rapier: rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)

Statiska byggnader och dynamiska föremål får olika kollisionsrepresentationer. Flyttbara möbler använder förenklade konvexa/formbaserade kollisionskroppar. [Rapier: colliders](https://rapier.rs/docs/user_guides/javascript/colliders/)

Arkitekturen delas i tydliga ansvar:

- **Simulation:** fast tidssteg, kommandon, entitets-ID och händelser.
- **Fysik:** kroppar, kontakter, frågor mot världen och gripförbindelser.
- **Spelregler:** magi, progression, skada och uppdragsvillkor, oberoende av DOM.
- **Befolkning och avvikelser:** NPC-tillstånd och den begränsade händelseregissören.
- **Presentation:** renderer, animation, ljud och lågmäld DOM-baserad HUD.
- **Innehåll:** stadsdelar, källbelagda byggnadsfaser och återanvändbara GLB-assets.

Från Claude-of-Duty-referensen behåller vi idén om separerade system och reproducerbara tester. Vi föreslår inte att kopiera dess specialbyggda fysikmotor eller hela renderingskedja. Vår prövosten är observerat spelbeteende, bildkvalitet och uppmätt prestanda i den faktiska scenen.

## Bild, ljud, gränssnitt och assets

Föreslagen art direction: hantverksnära realism med tydliga siluetter; kalksten, tegel, trä, järn och vax som känns olika. Blygrått vatten och kallt omgivningsljus mot små varma ljuspunkter. Magin känns i handen genom rörelse, motstånd och ljud, inte bara genom partiklar. Historiska färger och markmaterial behöver separata belägg innan de betecknas som autentiska.

HUD: en liten statusgrupp, en kort målangivelse och tillfälliga interaktionsledtrådar. Mittfältet lämnas fritt. Journal, skolor, karta och långa texter finns i pausmenyn. Paus ska släppa muslås och stoppa spelinmatning. Textstorlek, undertexter, känslighet, FOV, kameraskakning och reducerade effekter ska gå att anpassa. Ljudledtrådar får en valbar visuell motsvarighet.

Assetkontrakt enligt valda Game Studio-skills: källmodell → GLB-export → validering/optimering → test i spelet. Bestäm meter, axlar, pivotpunkter, namn, material, animationer, kollision och detaljnivåer. Three.js GLTFLoader stödjer separata glTF/GLB-scener och relevanta komprimeringsutökningar; fysik kopplas genom vårt eget kontrakt. [Three.js: GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)

Varje landmärkes komponenter får källhänvisning, avsedd byggnadsfas, osäkerhetsklass och rättighetsstatus. Trappgavlar som rekonstruerats i en modell märks just som rekonstruktion. AI-genererade stämningsbilder får aldrig bli historisk bevisning.

## Tester och publicering

Den valda TDD-processen blir först ett meningsfullt misslyckat test, sedan minsta implementation och därefter granskning. Subagentarbetet får separat kontroll av specuppfyllelse före kodkvalitet. Detta är planerade kontroller; inga speltester är genomförda ännu.

Prioriterade acceptanstester:

1. Spelaren kan röra sig, klara avsedda trappor, kollidera, pausa och återgå utan oavsiktlig attack.
2. Lätta och tunga föremål reagerar olika; förbjudet/tungt mål ger begriplig återkoppling. Gripning genom vägg nekas.
3. Ett hållet föremål respekterar väggen, kan släppas säkert och kastas med ändlig hastighet; snabba kast prövas mot tunna hinder.
4. Besvärjelser och progression ger samma regelutfall vid samma kommandon/simuleringsteg trots olika renderingsfrekvens. Vi lovar inte identiska GPU-pixlar mellan datorer.
5. NPC-övergångar, vilomellanrum och checkpointåterställning kan återspelas med känd seed. Återställ objektpositioner, uppdragsflaggor, tilldelade poäng, skolval och relevanta effekter till checkpointens tillstånd. Aktiv gripförbindelse tas bort vid återställning; spelet återupptas utan aktivt grepp. Testa död under gripning och efter belöning/skolval: inga gamla förbindelser, dubbla belöningar, förlorad sparad progression eller dubblerade kroppar/fiender.
6. Kapitlet kan startas, spelas till slut, förloras och återstartas. Slutför problemet separat med fysikvägen respektive ljudavledning; nå slutet med vardera eden och genomför dess exklusiva förmågeprov. Framtida besittning får ett separat testpaket för kroppsåtergång och uppdragslåsning.
7. Assetfel, misslyckad WASM-laddning och saknat grafikstöd ger begriplig återkoppling. Tidsbyte blockerar eller väntar om destinationens geometri är upptagen, med fungerande återhämtningsväg. Testa särskilt ett hållet föremål och en NPC som korsar övergången.
8. Bildfrekvens, frame-time, laddning, minne och antal aktiva kroppar mäts i verklig körning på en dokumenterad referensmaskin. Preliminärt mål: 60 fps med skalbara kvalitetsnivåer; ännu ingen prestandagaranti.
9. Magiprojektiler respekterar första hinder och träffar rätt kroppsregion även på rörliga mål. Ragdoll överför aktuell pose/rörelse; avskiljning skapar inga dubblerade delar eller felaktiga skintrianglar.
10. Ny profil börjar med gore PÅ; sparat AV består. Avstängning rensar befintliga och väntande grafiska effekter, även över omstart, LOD-byte och poolåteranvändning. Skada och fysik förändras inte av inställningen.
11. Fem definierade miljövyer och hela gångstråket kontrolleras för färdiga gator, murar, hus, träd, markkontakt, skala och historisk transparens enligt kapitelspecen.

`sp1e/sp1e.se` har granskats läsande på commit `93c6d96815c15e0bbd63088a5de009c8a88f3fee`. Det är en statisk webbplats med Cloudflare Pages-konfiguration. Förslag: publicera bara Game1:s byggda utdata på en separat direktadress, exempelvis `/vadstena/`, och håll spelkällkod/verktyg utanför webbplatsens publicerade rot. [Verifierad webbplatskonfiguration](https://github.com/sp1e/sp1e.se/blob/93c6d96815c15e0bbd63088a5de009c8a88f3fee/wrangler.toml), [Vite: static deployment](https://vite.dev/guide/static-deploy.html)

En konkret integrationsrisk är redan känd: webbplatsens CSP saknar tillåtelse för WASM och förbjuder iframe-inbäddning. Rapier kräver att den effektiva policyn på speladressen tillåter WebAssembly. En extra tillåtande CSP kan inte upphäva en samtidigt gällande restriktiv policy. Detta är en slutsats från headergranskning och dokumentation, inte ett redan utfört Rapier-test på hemsidan. [Webbplatsens headers](https://github.com/sp1e/sp1e.se/blob/93c6d96815c15e0bbd63088a5de009c8a88f3fee/_headers), [MDN: script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)

Cloudflare Pages anger högst 25 MiB per statisk fil. Staden bör därför levereras i separata stadsdels-/assetpaket. [Cloudflare: limits](https://developers.cloudflare.com/pages/platform/limits/). Ingen webbplatsfil, säkerhetspolicy eller deployment har ändrats.

## Beslutet härnäst

Spelriktningen, första etappen och den skrivna [kapitelspecen](superpowers/specs/2026-09-05-vadstena-chapter-design.md) är godkända med användarens tillägg. M0:s runtime-grund är färdig och nästa steg är mekanikgården enligt [leveranskartan](superpowers/plans/2026-09-05-vadstena-delivery-map.md). Alla fem landmärken och fem skolor ligger kvar i helhetsvisionen. Ingen publicering är genomförd.
