# Magi, berättelse, NPC:er och Klang

**Designförslag:** låt spelaren förstå hur en handling fungerar medan orsaken till stadens förändring förblir ett mysterium. Första kapitlet behöver en trovärdig vardag, en undersökbar avvikelse, två användbara sätt att lösa ett hinder och en följd som spelaren kan knyta till sitt val.

Följande beats, namn på vardagsroller och tuningsvärden är nya förslag. De ersätter inte den godkända specen och är inte speltestade. Historiska personer och vårdmiljöer används inte som dokumentära förklaringar till påhittad skräck.

## 1. Referenser som besvarar konkreta frågor

| Referens och läst material | Överförbar princip | Vad vi inte kan sluta oss till |
|---|---|---|
| Valve, *Physical Gameplay in Half-Life 2*, GDC 2006, föredragsslides. | Etablera fysiska möjligheter i låg risk, återanvänd samma kunskap i nya situationer. | Föredraget beskriver inte en komplett kopierbar Grip-regulator. |
| Worch/Harvey Smith, *What Happened Here?*, GDC 2010, slides med anteckningar. | Miljöspår kan bära en orsakskedja som spelaren själv tolkar; spelarens förändringar behöver bestå. | Miljödetaljer skapar inte automatiskt förståelse; de måste observeras i speltest. |
| Mike Booth, *The AI Systems of Left 4 Dead*, AIIDE 2009, slides. | Tillstånd, tydliga övergångar och återhämtningsperioder kan ge läsbar systemdriven rytm. | Detta är inte ett recept på slumpmässiga överfall eller en anledning att kopiera ett stort hordspel. |
| Kelsey Beachum, *Sparking Curiosity… Outer Wilds*, GDC 2021, endast abstract. | En relevant designfråga är hur en upptäckt väcker nästa fråga. | Vi har inte läst fullföredraget och använder inga påståenden om dess implementation. |
| Colantonio/Smith, *Empowering the Player in a Story-Rich World*, GDC 2013, endast abstract. | Systemisk handlingsfrihet är ett användbart granskningsperspektiv. | Abstractet belägger ingen särskild NPC-/questarkitektur. |

Direktkällor: [HL2](https://cdn.cloudflare.steamstatic.com/apps/valve/2006/GDC2006_PhysicalGameplayInHL2.pdf), [miljöberättande](https://media.gdcvault.com/gdc10/slides/Smith_Harvey_WhatHappenedHereWeb_Notes.pdf), [L4D AI](https://cdn.cloudflare.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf), [Outer Wilds-abstract](https://www.gdcvault.com/play/1027368/Independent-Games-Summit-Sparking-Curiosity), [Dishonored-abstract](https://www.gdcvault.com/play/1018062). Oblivion kvarstår som visionens referens för skolidentitet; ingen ny teknisk slutsats bygger på en obelagd tolkning av dess implementation.

## 2. Skolorna delar objekt, men löser olika problem

Tyngd förändrar fysisk placering och kraft. Klang förändrar vad som går att uppfatta eller hur ett ljudförlopp kan återges. En skola ska ge en egen fråga till spelaren: ”vad behöver flyttas?” respektive ”vilket mönster och vilken ljudväg betyder något?”. Skärklang är Klangs stridsuttryck, men får inte bli hela skolans identitet.

| Objekt med uttryckliga förmågor | Tyngd nu | Klang nu | Framtida integration, inte kapitelinnehåll |
|---|---|---|---|
| Lös metallskål: gripbar, resonant | Placera, kasta eller bära som distraktion. | Skapa/återge ett märkt klangförlopp; hör skillnad i platsens respons. | Glöd kan få en authorad värmeegenskap. |
| Trälåda: gripbar, solid, trämaterial | Röj passage eller skapa tillfälligt skydd som faktiskt kolliderar. | Avled använder dess plats/materialljud utan att flytta den. | Brännbarhet endast om den senare implementeras. |
| Port/beslag: ledad eller fast, märkt mekanism | Tryck eller dra inom definierad mekanik; inget löfte om allmän destruktion. | Lyssna identifierar en förberedd avvikelse; återgiven sekvens kan pröva en resonator. | Vilja kan påverka en tillåten operatör via annat system. |
| Kyrkovägg: statisk blockerare, akustisk gräns | Stoppar objekt och kast. | Ljud når en öppning genom rums-/portalmodellen. | Slöja kan få ett eget märkt illusionslager. |
| Avskild komponent: dynamisk, stabilt segment-ID | Samma massa, kast och hinderregler med båda gorevalen. | Material-/magisk ljudpresentation följer aktuellt presentationsval. | Ingen uppdragsnyckel kräver anatomisk gore. |

Representera egenskaper som data: `grippable`, `massClass`, `resonanceProfile`, `soundMaterial`, `questRole`, `phaseSet` och `allowedAnchor`. Undvik ett enda allmänt ”interactable”-fält som lovar alla skolors funktioner. Senare skolor använder stabila mål-ID och auktoriserade kommandon; de skriver inte direkt över fysik eller questflaggor.

Fokus begränsar samtidig ansträngning. Belöning knyts till stabila upptäckts-/lösnings-ID, inte antalet kast. Gensvar kan senare reagera på stora, tydligt märkta ingrepp; första kapitlet behöver inte en generell bestraffningsmätare som gör experimentlust olönsam.

## 3. Föreslaget förlopp, mål 15–20 minuter

Tiderna anger innehållsrytm, inte uppmätt speltid. En första målsekvens är cirka 18 minuter med utrymme för kort utforskning. Ovana och försiktiga spelare kan ta längre tid; detta måste mätas.

| Ungefärligt intervall | Spelbar situation | Vad spelaren får lära/upptäcka | Återhämtning och alternativ |
|---|---|---|---|
| 0–3 min | En hantverkare arbetar vid rådhusområdet. Några lösa objekt kan ordnas med Grip. | Vardaglig ljud-/rörelserytm och skillnaden mellan lyfta, rotera och släppa. | Frivilligt prov, ingen farlig unik rekvisita. |
| 3–5 min | Ett igenkännbart slag hörs innan den synliga rörelsen som brukar orsaka det. Lyssna gör mönstret tydligare. | Något avviker från etablerad vardag; en riktning kan undersökas. | Samma information finns som visuell rytm. Ingen obligatorisk dialogmonolog. |
| 5–9 min | En blockerad huvudpassage och en ljudmässigt förbunden sidogränd. | Fysisk röjning eller medveten ljudavledning. | Båda vägarna leder vidare; återväg och relevant rekvisita består. |
| 9–12 min | En tidigare synlig NPC varnar, byter beteende och närmar sig. En magisk motståndare ansluter först efter en läsbar signal. | Närstrid, avstånd, verkligt skydd och prioritering av händer/fokus. | Reträtt till föregående rum, paus mellan angreppsperioder. |
| 12–15 min | Kyrkomiljön visar ett förberett tidsbrott med samma plats i två byggnadsfaser. | Arkitektur och ljud ger en ny ledtråd; spelaren initierar övergången. | Blockerat byte lämnar gammal fas spelbar och anger undanröjbar orsak. |
| 15–18 min | Val mellan Tyngds och Klangs ed följt av ett aktivt prov. | Exklusiv förmåga gör något grundverktyget inte gör. | Omförsök utan nyckelförlust. Tydligt kapitelavslut och sparankare. |

Använd sex vuxna NPC:er med separata vardagsroller, till exempel hantverkare, varubärare, handlande, budbärare och två vakthållande roller. Det är fiktionens rollfördelning, inte identifierade historiska personer. Två fientliga funktioner räcker: närstrid respektive magisk distans. Alla ska inte växla till fiender samtidigt.

## 4. Två verkliga passage-lösningar och fail-forward

**Fysikvägen:** flytta flera vanliga lådor från en fastklämd passage. Placera eller kasta med samma regler som resten av världen. Passagebredd och kollisionsvolymer avgör om det går att passera; en dold trigger får inte godkänna en fortfarande blockerad väg. Det finns fler användbara objekt än minimibehovet och ingen unik, förbrukningsbar nyckellåda.

**Ljudvägen:** skapa en Avled-händelse vid en synlig öppning i sidogränden. Den vaksamma NPC:n undersöker den hörda vägen och lämnar tillfälligt utrymme. Spelaren kan först observera dess vardagsrutin och hörselreaktion. NPC:n reagerar på en semantisk ljudhändelse, även när användaren har stängt av ljudet; captions gör orsak och riktning begripliga.

**Död informationsbärare:** nödvändig information återfinns även i en beständig miljöledtråd eller ett återaktiverbart spelgenererat ljud. Dialog kan förtydliga, men questgrafen kräver inte att en viss NPC fortfarande lever. Dödsfallet, tappad utrustning och världens reaktion består. Ingen osynlig återuppståndelse eller återställd lem används som räddning. Granska grafen genom att ta bort varje informationskälla var för sig och spela fortsatt väg, inklusive gore AV.

## 5. Eder som prövar sin exklusiva förmåga

**Fästpunkt:** fäst en tillåten resonator vid en fri, markerad punkt inom kraftgränsen och under begränsad tid. Den hålls medan spelaren lämnar Grip och utför nästa handling med fria händer. Detta skiljer eden från vanligt kamerabundet grepp. När tiden löper ut eller belastningen blir för hög frigörs objektet säkert och begripligt; det kan hämtas och försöket göras om. Ingen teleport genom vägg och ingen oändlig kraft ingår.

**Återklang:** lagra en kort, specifik sekvens från en återaktiverbar miljöresonator och återge den på en annan tillåten plats. Provets mekanism skiljer en identifierbar rytm från ett generiskt avledande ljud. Källan är spelgenererad och finns kvar oberoende av NPC-liv. Ingen mikrofon behövs. Rytmen har en likvärdig visuell representation.

Före valet visar vardera provplatsen vilken förmåga som tillkommer och att en aktiv ed gäller. Varje prov ger belöning med ett stabilt ID högst en gång. Båda leder till samma tydliga kapitelgräns och får lämna en egen, bestående detalj i världen.

## 6. Strid som ger skäl att växla verktyg

Använd förvarning → kast/slag → återhämtning som synligt förlopp. Ton, handpose, siluett och effekt ska säga samma sak. En fiende som byter till fientlighet behöver en observerbar orsak eller föraning. Minska risken för billiga bakhåll genom etablerad plats och ljud, inte genom en obligatorisk pil till varje fiende.

Ett första tuningprov kan pröva fiendeförvarning 0,7–1,2 s, återhämtning 0,5–1,0 s och projektilfart 8–16 m/s på de faktiska avstånden. Detta är designhypoteser. Mät upptäcktstid, möjlig sidoförflyttning, missförstånd och om spelaren hinner välja skydd. Oavsett värden ska aktuell kollision styra utfallet.

Grip upptar uppmärksamhet och hållkapacitet; lätta objekt är snabba men ger begränsad impuls, tunga tar längre tid och kan överskrida krafttaket. Skärklang kräver läge och korrekt plan; vanlig regional skada ger begriplig återkoppling vid fel vinkel. Tryckstöt ger en begränsad impuls vid projektilens första blockerande träff och kan då skapa avstånd. Skydd bryter projektilbanan men kan begränsa sikt. Denna kombination ger olika styrkor utan att alla fiender behöver godtycklig telekinesiresistens.

Närstrid behöver svept vapenvolym och explicita aktiva attackfaser. Bestäm enhetlig kontaktordning för blockering, vapen och kroppsregion. Ett slag-ID får inte skada samma avsedda mottagare upprepade gånger bara för att vapnet överlappar flera renderbilder. Vilken uppföljningsskada en ny attack får ge är en egen regel. Visa vänster/höger hands aktuella uppgift och begränsning utan att fylla mittfältet.

## 7. Minsta NPC-modell som bär kapitlet

**Förslag:** en hierarkisk tillståndsmaskin med en skild livs-/anatomi-status. Vardagsrutin, undersökning, varning, strid, återhämtning, flykt/hjälp och oförmåga/död är begripliga tillstånd. Händelser har explicit prioritet; livstillstånd övertrumfar avsikt. Fysisk förflyttning och navigation är egna tjänster.

Behavior trees är motiverade om ett valt editorflöde gör komplexa beteenden lättare att författa och felsöka. Utility AI är motiverat om många verkliga konkurrerande behov kräver mjuk prioritering. För sex NPC:er finns ännu ingen evidens för att något av detta uppväger ett mindre explicit system. Detta är en projektspecifik enkelhetsbedömning, inte en allmän rangordning av AI-metoder.

Hörselminne lagrar händelse, uppfattad plats/väg, tid och osäkerhet; det ger inte exakt kunskap genom väggar. Syn kräver räckvidd och faktisk ocklusion. Uppdatera navigationens lokala hinder när rekvisita flyttas, med versionerad invalidation och timeout för fastnade agenter. Bygg inte om hela navigationsunderlaget varje fysiksteg.

En liten händelseregissör lagrar förutsättningar, konsumerade händelse-ID, cooldown och fullständigt PRNG-tillstånd. Den får inte utlösa överfall under meny, skapa en figur i spelaren, ersätta döda NPC:er tyst eller stapla nya attacker innan återhämtningsvillkoren är uppfyllda. Intensitet är ett författarstöd för rytm; mer tryck behöver inte betyda högre skada.

## 8. Säker tidsfas

Förbered båda fasernas mesh, collider, navigation och ljudrum innan bytet. Kontrollera occupancy för spelare, NPC:er, rekvisita och hela hållen komponent. Om nya solida volymer skulle omsluta något stoppas bytet innan mutation; den gamla fasen förblir spelbar. Visa blockeringen och låt spelaren flytta föremålet, lämna området eller välja checkpointåtergång.

När villkoren är uppfyllda sker kollisions-, navigations-, ljud- och synlighetsbytet i en samordnad övergång. Historisk metadata anger vilka delar som är senare intrång. Spelaren ska uppleva samma plats som förändrats, inte att en godtycklig kuliss ersatt ett rum utan följd.

## 9. Klang som semantiska ljudhändelser

Skapa `SoundEvent` med stabilt ID, källa, simulerad starttid, material, kategori, styrka, rumsankare, inspelningsbarhet och eventuell rytmsekvens. AI-hörsel, hörbar mix, captions och Återklang läser samma händelse men har olika presentation. Användarvolym eller bortprioriterad ljudröst får inte avgöra om en vakt hör händelsen.

Web Audio tillhandahåller spatialisering, filter och konvolution; det beräknar inte stadens väggar åt spelet. För kapitlet föreslås en liten rums-/portalgraf för torg, gränd, träinteriör och kyrkoansats, med dämpning och lågpass via öppningar samt ett fåtal delade efterklangsbussar. Detta är spelbar akustisk approximation, inte uppmätt kyrkoakustik. [W3C Web Audio Recommendation, 2021, Panner/BiquadFilter/Convolver](https://www.w3.org/TR/2021/REC-webaudio-20210617/).

Captions och visuella ljudledtrådar filtreras efter spelarens perceptuella åtkomst före användarens volym/mute: räckvidd, möjlig ljudväg och hur väl källan går att identifiera. De hämtas inte direkt från alla SoundEvent eller från vad NPC:erna kan höra. Riktning bör utgå från ljudets uppfattade väg vid en öppning när väggen skymmer källan. Caption eller visuell puls får inte avslöja exakt dold emitterposition när ljudet inte gör det. Prioritera avgörande ledtrådar och hot i mixen, sänk dekorativ musik under dessa och håll efterklangen kort nog för rytmläsning. Spelstartens aktiva användarhandling återupptar AudioContext; paus hanterar schemalagda röster och generations-ID så att gammalt ljud inte börjar efter laddning.

## 10. Tillgänglighet och speltest

Kritiska ljudledtrådar behöver caption, riktning och visuell rytm. Separata volymer, monoalternativ, textstorlek, ommappning, växla/hålla Grip, känslighet, FOV, minskad kamerarörelse och reducerade blixteffekter bör provas med faktisk interaktion. Gorevalet är oberoende. En inställning för färre blixtar är inte i sig en garanti om hela scenens kombinerade effekter. [Xbox Accessibility Guidelines 103](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), [104](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104), [105](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/105), [107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), [117](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117), [118](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/118).

Gör först små kvalitativa prov med exempelvis 5–8 förstagångsspelare; antalet är ett praktiskt förslag, inte en statistisk powerberäkning. Observera första upptäckten, felgrepp, reträtter, självständigt vald väg och förståelse för edens skillnad. Fråga efteråt vad som var normalt, vad som förändrades och varför hotet uppstod. Skilj utebliven förståelse från ovilja att följa en viss väg. Pröva båda passagerna och ederna, inklusive mono och ljud av med visuella ledtrådar. Ingen sådan studie är genomförd här. [Valves Approach to Playtesting, GDC 2009](https://cdn.fastly.steamstatic.com/apps/valve/2009/GDC2009_ValvesApproachToPlaytesting.pdf).
