# Vadstena: Den åttonde klangen — första kapitlets designspec

Datum: 2026-09-05. Projekt: Game1. Status: **godkänd av Simon 2026-09-05** genom svaret ”Ser grymt ut!” på frågan om den uppdaterade specen och förberedda snittzoner. M0:s runtime-grund är nu lokalt implementerad med preferenskodning, fast klocka och inputgrind; 16 modul-/konfigurationstester och typkontroll passerar. Spelbar vy, fysik, magi, färdig grafik och uppmätt spelprestanda återstår.

## 1. Beslut och omfattning

Simon har godkänt ett cirka 15–20 minuter långt systemdrivet kapitel kring Rådhuset och Rödtornet, i senmedeltida Vadstena med uttryckliga tidsbrott. Alla fem landmärken och fem magiskolor kvarstår i helhetsvisionen. Tillägg som ingår i kapitlet, inte skjuts till en senare vision:

- Full magisk avståndsstrid utöver telekinesi och närstrid.
- Verklig ledad ragdoll-fysik för kapitlets NPC:er och fiender.
- Träffbaserad avskiljning av kroppsdelar med en Energy Slicers-besvärjelse.
- Grafisk gore med blod och snittytor som kan stängas av i inställningarna.
- **Gore är PÅ från första starten.** Ett sparat användarval AV respekteras vid senare starter.
- Genomarbetade kullerstensgator, murar, tidsenliga hus, träd och mellanrum mellan landmärkena.

Detta är ett större kapitel än den ursprungliga telekinesiprototypen. Det delas därför i verifierbara delsystem enligt avsnitt 13, utan att presentera en testgård som slutleverans. 15–20 minuter är önskad första genomspelningstid, inte utvecklingstid.

## 2. Spelfantasi, plats och berättelse

Spelaren är en klockgjutarlärling i ett Vadstena där ljud, människor och byggnader börjar höra till olika tider. Undersökning och fysisk experimentlust föregår eskalerande strid. Berättelsen och magin är vår fiktion, inte autentiska sägner eller påståenden om verkliga invånare.

Arbetsdatering för grundvärlden: **1510**, en precisering av konceptets ”omkring 1500”. Senare byggnadsfaser är märkta tidsintrång. Datumet är ett designval, inte ett påstående att varje återgiven fas säkert fanns 1510. Historiska konflikter för Rådhuset och Mårten Skinnares hus kvarstår enligt [konceptets källunderlag](../../VADSTENA-GAME-CONCEPT.md).

Den geografiska ryggraden är Rådhusområdet–Storgatan–området vid S:t Per/Rödtornet. Kartläggning ska fastställa gångstråk, kvartersrelationer och siktlinjer före slutlig miljömodellering. Inga exakta gatumått eller medeltida beläggningsgränser är redan verifierade. Alla fem landmärken placeras i en översiktlig blockout; första kapitlets detaljbyggda och spelbara område koncentreras till stråket och dess sidomiljöer.

Kapitlets förlopp:

1. **Vardag:** spelaren anländer till Rådhusområdet och lär sig rörelse och Tyngd genom en frivillig praktisk situation.
2. **Avvikelse:** ljud och NPC-beteende bryter ett nyss etablerat mönster; Klang avslöjar ledtråden.
3. **Valfri metod:** en passage kan öppnas genom fysisk manipulation eller kringgås med ljudavledning. Ingen väg kräver kroppsskada eller gore.
4. **Konfrontation:** en tydligt förebådad fiende ger tillfälle till närstrid, Tryckstöt, Energy Slicers och användning av lösa föremål. Flyktsikt och skydd finns.
5. **Tidsbrott:** en förberedd övergång förändrar ett begränsat område vid kyrkomiljön; kontroll av upptaget utrymme och återhämtningsväg förhindrar fastlåsning.
6. **Ed och slut:** välj Tyngd eller Klang, pröva den exklusiva förmågan och nå en tydlig avslutning. Därefter går kapitlet att starta om.

Sex vuxna humanoida NPC:er planeras, inklusive två fientliga roller, på ett gemensamt kompatibelt grundskelett med minst två visuella varianter. En fientlig roll använder närstrid och en använder magisk avståndsattack, så att skydd, avstånd och projektilundvikande faktiskt prövas. Alla kan övergå till samma ragdollsystem. Berättelsepersoners död får konsekvenser men inte permanent låsa kapitlet: nödvändig information och uppdragsföremål har en tillgänglig alternativ väg. Hospitalsanknytning eller psykisk sjukdom används inte som automatisk förklaring till fientlighet.

## 3. Förmågor och kontroller

Tyngd och Klang bär kapitlets samtliga besvärjelser. Vilja, Glöd och Slöja samt full besittning ingår i senare kapitel.

| Verktyg | Funktion i första kapitlet | Gräns |
|---|---|---|
| Tyngd: Grip | Lyft, dra, vrid, placera och kasta dynamiska föremål och tillåtna ragdolldelar. | Begränsad räckvidd, massa, kraft och sikt; aldrig fri positionssättning genom vägg. |
| Tyngd: Tryckstöt | En riktad magisk projektil som orsakar skada och en fysisk impuls vid träff. | Projektilens volym och första blockerande kontakt styr; ingen automatisk amputation. |
| Klang: Lyssna / Avled | Avslöja märkta tidsavvikelser och skapa en ljudkälla som NPC:er kan undersöka. | Ingen allvetande fiendesyn; hinder och hörselregler gäller. |
| Klang: Energy Slicers, arbetsnamn Skärklang | En synlig, rörlig energiklinga med ett tunt snittplan; riktad träff kan separera en förberedd anatomisk zon. | Ingen obegränsad genomskärning av världen eller fri skärning av varje triangel. |
| Kortsvärd | Attack, blockering, tydlig återhämtning och avståndskrav. | Samma skade-/träffzonssystem. Energy Slicers är första kapitlets förmåga för avskiljning. |
| Tyngds ed: Fästpunkt | Bind ett tillåtet föremål till en vald fri punkt under begränsad tid. | Kraftgräns, säker frigöring och synligt mål. |
| Klangs ed: Återklang | Lagra en kort spelgenererad ljudhändelse och spela upp den på annan plats. | Ingen mikrofoninspelning eller återspolning av hela fysikvärlden. |

Fokus förbrukas av besvärjelser och återhämtas enligt balanseringsdata. Avståndsmagi måste ha kostnad, tydlig kast-/återhämtningstid, räckvidd, hastighet och livstid. Dessa värden är tuningsdata som sätts i mekanikprovet, inte historiska eller fysiologiska storheter. Tom fokus, ogiltigt mål och blockerad avfyrning har läsbar återkoppling. NPC-fiender använder samma träff- och skaderegler, inte en separat osynlig hitscan-genväg.

Standardinmatning som går att mappa om: WASD rörelse, mus kamera, Shift spring, Space hoppa, C huka, E interagera, 1–5 verktygsval, vänster mus primär handling, höger mus sekundär handling/grepp/blockering, Q växla klingans horisontella eller vertikala orientering före kast, R rotationsläge under grepp, mushjul gripavstånd, Tab journal och Esc paus. Lägen separeras så att samma knapp inte både byter menyval och avfyrar. Släppt greppknapp släpper föremålet; primär handling under grepp kastar det. Tillgänglighetsinställning erbjuder grepp som växling i stället för hållning.

## 4. Projektiler och anatomisk träffbestämning

Avståndsmagi är en projektilsimulering, inte bara en effekt med ett efterhandsvalt offer. Varje projektil har stabilt ID, avsändare, föregående/aktuell transform, volym, hastighet, återstående räckvidd och skadeprofil. Skärklangs orientering låses vid avfyrning i första kapitlet; klingan roterar inte under flykten.

Målsiktet anger avsikt. Avfyrningskontrollen går från handens faktiska ursprung mot målpunkten och hanterar redan överlappande geometri. Spelaren ska inte kunna skjuta genom en mur för att kameran ser förbi den.

Ett svep mellan simuleringspositionerna prövar världshinder, utrustning och aktuella anatomiska hitvolymer tillsammans. Närmaste blockerande kontakt vinner. Ägarens kropp filtreras bort; en NPC:s rörelsekapsel får inte skymma dess detaljerade träffzoner. Träffzon väljs via kontaktens collider-ID, inte genom att leta närmaste ben efter en godtycklig torsoträff. En projektil avslutas vid första blockerande kontakt i kapitlet; ingen genomträngning eller rikoschett ingår.

Rapier erbjuder linjära shape casts och kontaktinformation, men en sådan fråga löser inte automatiskt roterande klingor eller snabbt korsande mål. Mekanikprovet måste verifiera relativa mål-/projektilrörelser och vid behov använda uppdelade svep. Ett test där en arm korsar projektilbanan mellan två slutpositioner måste passera innan systemet är godkänt. [Rapier: shape casting](https://rapier.rs/docs/user_guides/javascript/scene_queries_shape_casting/), [scene queries](https://rapier.rs/docs/user_guides/javascript/scene_queries/)

Träffen registreras en gång med projektil-ID, NPC-/objekt-ID, region, kontaktpunkt, normal, riktning och simuleringssteg. Återleverans av samma träff-ID får inte ge ny skada. Två olika projektiler är däremot två legitima kontakter: ordna dem efter kontakttid inom steget och därefter stabilt projektil-ID, och pröva varje kontakt mot det anatomiska ägarskap som gäller efter föregående transaktion. Samma förbindelse kan separeras högst en gång. Skada, stagger, avväpning, död och eventuell avskiljning beslutas av spelreglerna. Väggträff, glansande träff och träff utanför en tillåten snittzon får inte avlägsna en godtycklig kroppsdel.

## 5. Verklig ragdoll och övergång från animation

Ragdollen består av flera fysiska kroppar med massa, tröghet, kollisionsformer och sammanbindande leder. Minst bäcken, bröstkorg, huvud, över-/underarmar och lår/underben representeras; händer och fötter kan ingå i distala segment. Hudmodellen följer den simulerade posen. Ett roterande helt NPC-objekt eller en förinspelad fallanimation räknas inte som ragdoll.

NPC-tillstånd: rutin → misstanke/fientlig handling → träffreaktion → fysisk incapacitering eller död. Mindre träffar ger animation/reaktion; tillräcklig impuls, död eller avskiljning aktiverar ragdoll. Första kapitlet kräver inte en aktivt balanserande ragdoll som kan resa sig och återgå till strid. En avskild arm innebär funktionsförlust, tappat vapen om relevant och incapacitering; halsavskiljning är dödlig enligt spelets regler. Kroppsdelar kan påverkas ytterligare efter fallet.

Vid handoff tas varje segments aktuella animerade världstransform och samplade linjära/vinkelhastighet. Därefter upphör animatorns skrivning till de simulerade benen. Träffimpuls appliceras på träffad kropp. Restposen får inte återställas under övergången. Benens föräldra-/bindtransformer och kropparnas lokala offset ingår i assetkontraktet. [Three.js: SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html), [Rapier: RigidBody](https://rapier.rs/javascript3d/classes/RigidBody.html)

Armbågar/knän får testade rörelsebegränsningar. Axlar/höfter kräver ett verifierat begränsat constraint-upplägg; en obegränsad sfärisk led får inte marknadsföras som anatomiskt korrekt. Den granskade JS-klassens sfäriska joint exponerar inte automatiskt de cone/twist-inställningar som man annars lätt antar finns. Denna teknikrisk ska lösas i riggprovet före låsning av slutliga NPC-assets. [Rapier: joints](https://rapier.rs/docs/user_guides/javascript/joints/), [SphericalImpulseJoint API](https://rapier.rs/javascript3d/classes/SphericalImpulseJoint.html)

Kroppar ska kollidera trovärdigt med trappor, murar och föremål. Närliggande segment filtreras där det behövs för stabilitet; relevanta självkontakter behålls. Flygande delar använder lämplig CCD. Sovande kroppar kan väckas av ny fysisk påverkan eller Tyngd. Avskilda delar får ingen duplicerad massa.

## 6. Avskiljning och gore — vald metod och ärlig ambitionsnivå

**Godkänd metod: förberedda anatomiska snittzoner, separerbara skinnade segment och slutna snittytor.** Målbilden är övertygande realtidsgrafik med riktad träff, sammanhängande övergång och fysisk rörelse. Det är inte medicinsk vävnadssimulering.

Det bredare alternativet är fri runtime-skärning i valfritt plan genom valfria delar av en skinnad modell. Det kräver egen meshdelning, nya skinvikter, snittytor och kollisioner. Det är en separat forsknings-/utvecklingsgren, inte utlovat i detta kapitel. Förberedda zoner prioriterar kvalitet och verifierbar precision inom webbplatsens budget. Slumpmässig amputation efter en allmän kroppsträff är inte en accepterad ersättning.

Kapitlets humanoidrigg förbereds för vänster/höger arm vid axel, underarm vid armbåge, ben vid höft, underben vid knä samt hals: nio avskiljningsförbindelser. För varje förbindelse finns en godkänd kontaktvolym och visuell snittlinje med lokal plannormal. En giltig Slicer-kontakt inom zonen kan separera motsvarande distala kedja om klingans plan överensstämmer med zonens aktuella plan inom 30 grader, oberoende av normalens tecken. Valet horisontellt/vertikalt påverkar alltså både svepvolym och skärbarhet. Sned/glansande träff eller träff längre från zonen ger vanlig regional skada. Dessa förberedda snitt ligger på fasta ställen, inte exakt vid varje möjlig punkt på en lem.

Den första kvalitetsdemonstrationen är en avsiktligt träffad arm: rätt arm skiljs av från aktuell pose, flyger vidare med bibehållen rörelse och träffimpuls, kolliderar med miljön och går att påverka med Tyngd. Vid senare snitt i samma redan avskilda kedja delas bara återstående anslutning. Händelser måste vara idempotenta: ingen dubbel arm, dubbelt vapen eller dubbelt dödsutfall.

Anatomiskt tillstånd, fysisk koppling och renderad mesh ändras som en sammanhängande transaktion vid en simuleringsgräns. En joint kan tas bort via Rapier, men detta skär inte automatiskt upp Three.js-modellen. Assetvarianter och kroppsdelarnas ägarskap är vårt ansvar. [Rapier: removeImpulseJoint](https://rapier.rs/javascript3d/classes/World.html#removeImpulseJoint)

Med gore på ingår korrekt placerade, slutna snittytor, tidsbegränsad blodemission från båda sidor av en ny separation, träffmärken och kontaktplacerade bloddekaler på giltiga ytor. Färg, material, ljus och rörelse ska stämma ihop med miljön. Dekaler får inte läcka genom väggar eller sväva i luften. Partiklar och begränsad ansamling gestaltar effekten; full vätske-/mjukvävnadssimulering ingår inte.

### Gore-inställningen

| Situation | Krav |
|---|---|
| Ny profil | `goreEnabled = true`. Inget extra godkännande krävs för standardläget; spelet anger sakligt att det innehåller grafiskt våld. |
| Sparat AV | Starta fortsatt utan gore. Standardvärdet får inte ersätta ett giltigt sparat false-värde. |
| PÅ → AV i paus | Rensa alla befintliga blodpartiklar, dekaler, skärm-/modellblod och väntande emissioner före nästa spelbild. Byt snittytor och separerade delars presentation till icke-grafiska varianter. |
| AV → PÅ | Tillåt grafiska effekter för nya träffar. Spela inte om tidigare träffar och återuppliva inte rensade blodobjekt. |
| Ladda checkpoint/sparning | Applicera aktuell inställning innan första renderingen; sparfilen får inte åsidosätta gore-valet. |
| Grafiknivå ändras | Mängden effekter får ändras, men gore-valet ändras inte automatiskt. |

Gore är en presentationsinställning, inte en annan svårighetsgrad. Skada, funktionsförlust, ragdoll, fysik och uppdragsutfall är oförändrade. När gore är av används slutna neutrala skadeövergångar och **icke-anatomiska magiska restformer** för separerade delar. Dessa restformer är synliga och följer samma fysiska kroppar; inga osynliga kollisionshinder får lämnas kvar. Grafiska skadeljud ersätts av neutrala träffljud. Menyn beskriver detta så att ”av” inte felaktigt lovar ett helt våldsfritt spel.

Befintliga grafiska ytor neutraliseras när gore stängs av och får inte börja blöda igen vid påslag utan en ny träff. Effektpooler och uppskjutna callbacks använder en presentationsgeneration så att gamla effekter inte återkommer efter växling, omstart eller sparladdning.

## 7. Miljön mellan landmärkena är leveransinnehåll

Stråket delas i tre sammanhängande karaktärer: Rådhusområdets handel och rörelse, Storgatans tätare fasader med sidogränder/gårdar, samt det tystare mötet med kyrka och mur. Variation ska komma från rum, material, användning och ljus, inte från godtycklig dekor.

**Kullersten och mark:** synliga variationer i stenstorlek, slitage, fogar, sättningar, grus och fukt; tydlig kontakt vid trösklar och murfötter. Närgeometri prioriteras där siluetten syns. Kollisionsytan följer gatans verkliga makronivåer och trappsteg utan att varje dekorativ sten skakar spelarkameran. Exakt utbredning av kullersten år 1510 är ännu inte belagd; tills sådan evidens finns märks vår markgestaltning som historiskt informerad rekonstruktion, inte verifierad kopia. En uppgift om Storgatan i en Linköpingsrapport får inte överföras till Vadstena.

**Murar:** verklig tjocklek vid krön, hörn, portöppningar och skador; varierat tegel-/stenförband, fogbruk och vattenpåverkan. Kommunen beskriver en utvidgad tegelmur från 1506 och återanvända husväggar med igenmurade öppningar. Det är en särskilt användbar lokal referens, men den dokumenterade muren placeras bara där kartunderlaget stöder den. Vi hittar inte på en komplett ringmur runt staden. [Vadstena kommun: Klostermuren med Beginernas hus](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/klostermuren-med-beginernas-hus/)

**Hus och gårdar:** minst sex kombinerbara fasad-/hustyper med variation i volym, gavel, tak, dörrar, små öppningar, sockel och tillbyggnad. Tidstypiska detaljer ska beläggas eller märkas som rekonstruktion. Minst två sidogränder och två gårdsrum ska vara verkligt gångbara och läsbara. Inga moderna skyltfönster, asfalt, gatlyktor, teater-/skolbyggnader från 1800-talet eller dagens fasader maskerade med smuts för att kallas medeltida.

**Träd och växtlighet:** markkontakt, rimliga rötter/stambaser, grenvariation, återhållen vind och säsongsmässigt sammanhållen vegetation. Träd placeras i motiverade gårds-/trädgårdsrum, inte jämnt längs gatan utan källstöd. Exakta arter och historiska planteringsplatser ska inte beskrivas som belagda där de är konstnärliga val. Stam/huvudgrenar har rimliga kollisionsproxies; varje löv är inte en rigid body.

**Liv och spelbarhet:** minst fyra typer av manipulerbar rekvisita, exempelvis kärl, lådor, tunnor och lösa brädor. Ljudmiljön förändras mellan öppet torg, smal gränd, träinteriör och mur. Geometri erbjuder verkligt skydd och siktlinjer för avståndsstrid, men varje gata ska också tåla att granskas utan fiender eller effekter som täcker den.

För miljögodkännande tas fem jämförbara vyer: Rådhusansats, marknära gatuparti, Storgatans fasadrytm, sidogård med träd och mur/kyrkoansats. Varje vy kontrolleras även under gång i ögonhöjd. Bilder ska visa färdiga material, fungerande skala och sammanhängande rum; enbart blockout eller otexturerade lådor klarar inte denna leveransgrind.

## 8. Teknik och ägarskap

Separat Game1-projekt: Three.js, TypeScript, Vite och Rapier. Inga ramverksuppgraderingar i sp1e.se ingår här. Beroendeversioner låses när implementationsplanen övergår i verifierat bygge.

Simulation kör fast 1/60-sekundssteg med renderinterpolation. Paus och dold flik stoppar tidsskulden; återgång får inte spela upp en lång serie skador. Input omvandlas till kommandon, inte direkt mutation från DOM. Projektil-/träffprovet fastställer ytterligare kollisionsdelsteg för snabba eller korsande mål. Återuppspelning verifieras för samma build/seed/kommandon, inte som ett löfte om identiska GPU-pixlar över plattformar.

| Delsystem | Äger | Gräns mot andra system |
|---|---|---|
| Runtime / input | Klocka, kommandon, paus och livscykel. | UI skickar handlingar; inga skaderegler i DOM. |
| World / content | Stadsceller, assetnycklar, byggnadsfaser och källmetadata. | Levererar statisk geometri och gameplay-ankare. |
| Physics | Kroppar, leder, kollisionsfilter och frågor. | Exponerar stabila spel-ID; interna fysikhandtag sparas inte som beständiga ID. |
| Combat | Projektiler, kontaktordning, regional skada och funktionsförlust. | Producerar idempotenta skadehändelser; skapar inga blodmeshar. |
| Anatomy / ragdoll | Kroppsdelarnas graf, avskiljning och poseövergång. | Har ensam rätt att växla ben mellan animation och fysik. |
| Magic / progression | Fokus, förmågor, eder och poäng. | Använder fysik-/stridskommandon och sparbar regeldata. |
| NPC / chapter | Rutiner, avvikelser, uppdrag och alternativ vid död. | Tar emot ljud/skada; ingen fientlighet enbart genom dold slump varje bildruta. |
| Presentation / settings | Render, ljud, gorefilter, effektpooler och HUD. | Speglar simulationen; goreinställning kan inte ändra skaderegler. |
| Save | Versionerade checkpoints och separata preferenser. | Återskapar speldata; serialiserar inte Three.js-objekt. |

Ändringskedja: **kommando → verifierad kontakt → regelbeslut → atomär anatomi/fysik-ändring → filtrerad bild och ljud**. Varje led kan testas utan att hela staden laddas.

## 9. 3D-assetkontrakt

GLB är leveransformat; källmodeller hålls separata. Enheten är meter, världens uppaxel +Y och lokal figur framåt -Z. Exportkonvertering från DCC utförs med kontrollerade transformtester. Varje asset har stabil nyckel, version, ursprung/licens, skala, pivot, material, kollision, detaljnivå och avsedd användning. Miljödelar har dessutom byggnadsfas och klassen belagd/rekonstruerad/fiktiv.

NPC-paketet innehåller skelett, ben-till-kropp-offset, hitvolymer, leddefinitioner, separeringsgraf, intakta/avskilda varianter, grafiska och neutrala snittytor, gorefria restformer, sårankare och bounds. LOD-varianter måste behålla samma anatomiska ID och aktuella skadetillstånd; avskilda lemmar får inte dyka tillbaka på avstånd. Kläder får inte brygga över en avskild del som en utdragen triangel.

Varje NPC får egen skelettinstans. Delade material och geometrier får inte muteras så att en träff skadar alla kopior. Skinnad deformation, fysikpose och frustum-bounds prövas tillsammans. [Three.js: SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html)

Miljöassets får instansiering, återanvända material och detaljnivåer där det hjälper; landmärkenas särdrag får inte försvinna. Export valideras och optimeras, med avsiktlig mesh-/texturkomprimering. Dynamiska föremål använder primitives/konvexa sammansättningar; detaljerade byggnadsmeshar blir inte automatiskt dynamiska kollisionskroppar. Blodmaterial ersätter aldrig korrekt underliggande geometri.

## 10. Resurser, sparning och felhantering

Inledande innehållsbudget för mekanik-/kapitelprovet: sex samtidiga NPC-riggar, högst 24 fysikkroppar per rigg inklusive eventuella ledhjälpare, 40 lösa vanliga föremål, åtta samtidiga magiprojektiler och högst 240 registrerade dynamiska kroppar totalt. Avskilda segment överför befintliga kroppar; de dupliceras inte. Budgeten är ett provvillkor, inte en uppmätt kapacitetsgaranti.

Effektbudget vid normalnivå: högst 512 aktiva blodpartiklar och 128 bloddekaler, med prioritet för färska närträffar. Effekter utanför budget ersätts/avslutas kontrollerat. Grafisk kvalitetsnivå får skala effekttäthet, texturer och skuggor utan att byta till kosmetisk ragdoll eller ta bort korrekta träffar.

Stillastående kroppar får sova. Kroppar och föremål som kan påverka pågående strid, fysiklösningen eller en framtida återbesöksväg får inte försvinna enbart på en timer. Avlastning sker först när en stadscell inte längre är tillgänglig under kapitlet; relevant logiskt tillstånd bevaras. Återstart frigör ägda resurser och återanvänder delade assets säkert. [Three.js: resource disposal](https://threejs.org/manual/en/how-to-dispose-of-objects.html)

Checkpoints skapas bara vid förberedda säkra ankare, efter att pågående attacker avslutats; kapitlet har ingen fri snabbsparning mitt i strid. De lagrar inte bara seed utan hela PRNG-tillståndet, simuleringssteg, återstående kapitel-/NPC-timers, världsfas, uppdragsflaggor, redan tilldelade belönings-ID, poäng, aktiv ed, fokus/hälsa, NPC-livstillstånd, avskiljningsgraf och utrustning. För varje beständig dynamisk kropp, inklusive varje ragdollsegment och avskild komponent, sparas stabilt ID/ägare, transform, linjär/vinkelhastighet och sovtillstånd. Representationen versionsmärks tillsammans med innehålls-/fysikbuild.

Vid återställning skapas den sparade kropps-/ledgrafen utan gamla handtag eller gripförbindelser. Aktiva projektiler och väntande träffleveranser rensas, då de inte förekommer i checkpointens säkra starttillstånd; beständiga effekters återstående tid återställs uttryckligen. Aktuellt gore-val appliceras innan någon bild visas och gamla grafiska effekter återspelas inte. Preferenser sparas separat från kampanjdata så att en gammal checkpoint inte återställer gore till PÅ om spelaren stängt av det. Varken dödsfall eller avskiljningar försvinner ur logiken bara för att en effektpool rensas.

Okänd sparversion, misslyckad asset-/WASM-laddning, saknat grafikstöd och kontextförlust får tydligt fel-/återställningsläge. Användaren får välja ny start vid inkompatibel sparfil; ingen tyst radering. Misslyckad lagring visar att valet bara gäller aktuell session. Tidsbrott som blockeras erbjuder undanröjbar blockering eller checkpointåtergång, aldrig evig väntan.

## 11. HUD, inställningar och webbpublicering

En kompakt statusgrupp visar hälsa/fokus/valt verktyg; kort mål och tillfälliga interaktionsledtrådar kompletterar. Mittfältet lämnas fritt för siktning och fysisk läsbarhet. Menyer är DOM-baserade med tangentbordsfokus, läsbar typografi och tydliga val. Paus släpper muslås och blockerar kamera, kast och skada.

Inställningar omfattar gore PÅ/AV, grafiknivå, textstorlek, undertexter/visuella ljudledtrådar, känslighet, FOV, inverterad mus, kameraskakning och reducerade blixteffekter. Tillgänglighetsval får inte automatiskt ändra gore; inställningarna är oberoende. Mobil får fungerande information och kompatibilitetsvy; mobil FPS-styrning ingår inte i kapitlet.

Publiceringsformen förblir ett separat statiskt spelbygge, senare exempelvis på `/vadstena/`. Föregående förstudie identifierade en WASM/CSP-fråga i hemsidans konfiguration. Den måste kontrolleras mot då aktuell konfiguration vid integration; ingen policy eller hemsidefil ändras i specarbetet. Filstorleks- och leveranskrav återfinns i konceptunderlaget. Ingen automatisk push eller driftsättning ingår i detta godkännandesteg.

## 12. Acceptansmatris

Alla nedanstående är framtida verifieringar. De får inte markeras godkända utifrån denna text. Regeltester skrivs och observeras misslyckas före motsvarande implementation; fysik och render verifieras även genom riktiga integrationstester och speltest.

| ID | Prov | Godkänt beteende |
|---|---|---|
| C01 | Avståndsmagi mot mål, tomt utrymme och mur. | Flygtid, träff, förbrukning och avslut är riktiga; ingen skada genom närmare hinder. |
| C02 | Synlig arm framför/bakom kroppen, skyddat mål och passerande arm. | Korrekt första collider och region även vid mål som korsar banan mellan steg. Ingen närmaste-ben-gissning. |
| C03 | Slicer träffar en förberedd armzon med rätt plan, ett 90 grader felvridet plan respektive strax utanför zonen. | Rätt arm separeras en gång vid giltig kontakt/vinkel; övriga ger vanlig regional skada utan felaktig separation. |
| C04 | Alla nio förbindelser och ett andra snitt i avskild kedja. | Rätt distal kedja, inga dubblerade delar, korrekta ägarskap och vapen. |
| C05 | Slicer startar intill/inuti hinder; samma träff levereras två gånger; två olika projektiler träffar samma zon nästan samtidigt. | Ingen genomväggsskjutning. Samma träff-ID gör skada en gång; två skilda projektiler löses var för sig i definierad ordning mot aktuell anatomi. Högst en separation per förbindelse, inga dubblerade delar eller vapen. |
| P01 | Påkörd eller dödad NPC mitt i rörelse. | Ragdoll startar i aktuell pose/hastighet utan restposesnapp; animation och fysik slåss inte om ben. |
| P02 | Ragdoll faller i trappa, mot vägg och över rekvisita. | Flera ledade segment reagerar; leder håller definierade begränsningar utan explosion/NaN. |
| P03 | Grip, kasta och väck sovande föremål/avskild del. | Fysisk massa och kollision består; begränsningar och säkert släpp fungerar. |
| P04 | Jämför samma skadehändelse med gore PÅ/AV. | Samma hälsa, funktionsförlust, impuls, kropps-/ledgraf och uppdragsutfall. |
| G01 | Starta med tomma preferenser. | Gore är PÅ från första spelbilden där gore kan förekomma. |
| G02 | Stäng av, avsluta och starta igen. | AV består och ersätts inte av standardvärdet PÅ. |
| G03 | Stäng av medan blodobjekt och väntande emissioner finns. | Alla grafiska blod-/skadekomponenter filtreras före nästa spelbild; inga gamla callbacks återaktiverar dem. |
| G04 | Slå på igen, byt LOD, återanvänd pooler och ladda sparning. | Gamla blodobjekt återkommer inte; nya träffar följer nuvarande inställning. |
| G05 | Granska båda nya snittsidorna nära och på avstånd. | Slutna ytor, rätt ankare, inga ihåliga skal, utdragna skintrianglar eller försvinnande delar. |
| E01 | Fem miljövyer samt promenad genom hela stråket. | Läsbara rum, material, markkontakt, tidshänvisningar, färdiga gator/murar/hus/träd; inga synliga blockoutsubstitut i slutleveransen. |
| E02 | Gå/huka/hoppa på gata och avsedda trappor. | Ingen stenorsakad kamerajitter, genomväggsrörelse eller fastlåsning vid vanlig passage. |
| E03 | Siktlinjer och skydd i samtliga stridsrum. | Renderad mur/hus motsvarar faktisk kollisions-/skottblockering. |
| S01 | Lös passagen med fysik respektive ljudavledning. | Båda vägarna når fortsatt kapitel utan goreberoende eller förbrukad unik nyckel. |
| S02 | Välj vardera eden och genomför dess prov. | Båda exklusiva förmågorna fungerar och leder till avslut; ingen poängdubblering. |
| S03 | Döda/avväpna en informationsbärande NPC. | Konsekvens bevaras, men nödvändig uppdragsinformation/föremål förblir åtkomliga. |
| S04 | Dö/återställ efter avskiljning, grepp, belöning och inställningsbyte; ladda samma checkpoint flera gånger efter nya slump-/skadehändelser. | Samma logiska fortsättning från sparat PRNG-/timertillstånd, korrekta segmentpositioner/hastigheter och ägarskap, utrustning och aktuella preferenser; inga gamla grepp, träffar, extra belöningar eller läckta kroppar/leder. |
| S05 | Blockera tidsövergången med NPC eller hållet föremål. | Ingen överlappande ny geometri; spelaren kan lösa blockeringen eller återhämta säkert. |
| U01 | Pausa under kast, växla inställning, återgå och växla flik. | Ingen menyklicksattack, dold skada eller ackumulerad tidsexplosion. |
| R01 | 30/60/144 Hz rendering med samma fasta simuleringskommandon. | Samma diskreta spelutfall och begränsade dokumenterade flyttalsavvikelser. |
| R02 | Belastningsscenario med hela innehållsbudgeten. | Registrerade resurser håller budget; frame-time/minne mäts på namngiven maskin/browser. |
| R03 | Tio omstarter efter uppvärmning. | Kropps-/ledantal återgår till baslinje; ägda GPU-resurser växer inte monotont. |

Målbild för prestanda är 60 fps vid en dokumenterad lämplig grafiknivå. Maskin, upplösning, browser, build och scen måste anges vid mätning. Om fysikprovet inte klarar stabilitet eller vald budget stoppas detaljproduktionen för riktad åtgärd; systemet får inte i tysthet ersättas med fallanimationer eller kosmetisk avskiljning.

## 13. Leveransordning och avgränsningar

1. **Grund och mekanikprov:** start/paus/input, fast simulation, kapselrörelse, telekinesi, projektiler och vägg-/målträffar i liten gård.
2. **Rigg-/skadeprov:** en komplett NPC med riktig ragdoll, testade leder, anatomiska träffzoner, nio avskiljningsförbindelser och gore PÅ/AV. Armträffen och stråkets trappkontakt demonstreras visuellt innan alla figurer produceras.
3. **Miljöprov:** fem landmärkesankare samt ett färdigt gatusegment med kullersten, hus, mur och träd, granskat i ögonhöjd. Historiska antaganden följer med modellen.
4. **Kapitelintegration:** sammanhängande stråk, NPC-rutiner, stridsrum, alternativa lösningar, tidsbrott, båda eder och sparning.
5. **Slutprov:** hela acceptansmatrisen, ljud/bild/inställningar, prestanda, asseträttigheter och separat publiceringskontroll.

Ingen implementation får kallas färdigt kapitel efter bara steg 1–2. Under implementationen används färska avgränsade subagentuppgifter med specgranskning före kodkvalitetsgranskning; TDD gäller nya spelregler och regressioner.

Utanför kapitlet: multiplayer, konton, hela stadens interiörer, aktivt återhämtande ragdoll-AI, fri godtycklig meshskärning, full vätske-/mjukvävnadssimulering, full byggnadsdestruktion, crafting och mobil FPS. Dessa avgränsningar är tekniska scopebeslut, inte en nedgradering av det uttryckliga kravet på riktig ragdoll, riktad avskiljning och genomarbetade miljöer.

## 14. Granskningsstatus

Primärdokumentation för Rapier/Three.js och kompletterande kommunal miljökälla kontrollerades under specarbetet. Specen gör skillnad mellan motorns byggstenar och våra egna system. Separat specgranskning fann ingen blockerare för användargranskning; preciseringar av checkpointens tillstånd, oberoende kontra duplicerade träffar och klingans vinkelkrav infördes före godkännandet. M0:s modul-/konfigurationstester är nu körda, men kapitlets browser-, fysik-, grafik- och prestandaprov är inte utförda. Codacy MCP-verktyg är inte tillgängliga; ingen sådan analys påstås utförd.

Simon godkände den skrivna specen 2026-09-05, inklusive fasta anatomiska snittzoner och gorefri presentation. Designgrinden är därmed passerad. [Leveranskartan](../plans/2026-09-05-vadstena-delivery-map.md) och [runtime-grundens implementationsplan](../plans/2026-09-05-runtime-foundation.md) styr nästa arbete; ingen ytterligare designgranskning krävs för oförändrad omfattning.
