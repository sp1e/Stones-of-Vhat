# Fysik, kontakt, anatomi och assetkontrakt

**Det avgörande provet är en animerad, skinnad figur som blir fysisk i aktuell pose, träffas korrekt i rörelse och kan förlora en distal kedja utan duplicerade kroppar eller trasiga ytor.** Implementationsförslagen nedan är oprövade i Vadstena. API-fakta kommer från installerad Rapier compat 0.20.0 och riktat granskade primärkällor. Testprotokollen ska avgöra om förslagen håller.

## 1. Fast simulation och en tydlig ägare

Behåll 1/60 s som auktoritativt steg. Samla in kommandon, uppdatera rörelse/AI, beräkna målkrafter, genomför fysik och kontakt-/skadetransaktioner i en dokumenterad ordning och publicera sedan ett tillstånd för renderinterpolation. Exakt underindelning måste väljas i kontaktprovet. Menyer och browserpaus stoppar simulerad tid; återkomst får inte spela upp en kö av gamla attacker.

Tre verktyg ska hållas isär: fler solveriterationer förbättrar vissa constraintlösningar, fysikdelsteg minskar tiden mellan fysikuppdateringar, och querydelsteg förbättrar vår kollisionsuppskattning utan att i sig ändra solvern. Rapiers CCD kan hantera kroppars linjära och angulära rörelse men garanterar inte korrekt egen zonlogik. Motion clamping kan förlora rörelsetid; fler CCD-delsteg är en kostnad att mäta. [Rapier CCD](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/#continuous-collision-detection).

Kräv samma diskreta utfall på 30/60/144 Hz rendering med identiska kommandon i simuleringssteg. Rapiers determinismanspråk förutsätter bland annat samma version, initialdata och skapandeordning. Extern beräkning med exempelvis `Math.sin`/`Math.cos` kan bryta plattformsidentitet; sådana funktioner förekommer redan i gårdskoden. Lova därför inte generell bitidentisk replay över olika byggen. [Rapier determinism](https://rapier.rs/docs/user_guides/javascript/determinism/), [lokal gård](../../../../game/src/physics/yard.ts).

## 2. Grip: begränsad kraftstyrning med fysisk återkoppling

**Förslag:** håll objekt dynamiska och styr en greppunkt mot ett filtrerat mål med begränsad kraft och vridmoment. Flytta inte kroppen med `setTranslation` som normalt grepp. Svep målvolymen mot hinder, begränsa målets hastighet/acceleration och släpp säkert vid för stort fel eller förlorad räckvidd. Ett blockerat mål stannar framför väggen medan objektet reagerar fysiskt.

En utgångsmodell är:

```text
e = x_mål - x_grepp
v_grepp = v_COM + omega × (x_grepp - x_COM)
F = k e + c (v_mål - v_grepp) - eta m g
F = begränsa_total_kraft(F, krafttak, accelerationstak)

rotationsfel = kortaste_rotationsvektor(q_mål * invers(q_kropp))
tau = K_rot * rotationsfel + D_rot * (omega_mål - omega)
tau = begränsa_vridmoment(tau)
```

Alla positioner och hastigheter är i världssystem. `k` har enheten N/m, `c` N·s/m, kraft N, vridmoment N·m och kastimpuls N·s. `eta` är avsiktlig gravitationshjälp, 0–1. Krafter vid en förskjuten greppunkt ger också vridning. Rotationsregulatorn måste ta hänsyn till tröghet och långa hävarmar. Samla alla systems krafter centralt och återställ ackumulatorn en gång; ett Grip-system får inte nollställa andra effekters krafter. Kroppar måste väckas när de påverkas. [Rapier krafter och impulser](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/#forces-and-impulses).

| Parameter | Startintervall för isolerad tuning | Vad som måste observeras |
|---|---|---|
| Gripbara vanliga objekt | 0,5–15 kg | Ansluten kedjas massa och tröghet räknas; en arm på en hel figur är inte ett löst lätt objekt. |
| Föredraget målavstånd | 0,8–3 m; preliminärt räckviddstak 4 m | Sikt, kontakt med spelarkapseln, meningsfull placering i trång gränd. |
| Referensfrekvens | 2–4 Hz vid referensmassa 2 kg | Ger ungefär k = 316–1 263 N/m via k = m_ref(2πf)². Inte en universellt stabil inställning. |
| Dämpningskvot | 0,8–1,2; c = 2ζ√(k m_eff) | Översläng, återhämtning, kontaktjitter och tungt objekts eftersläpning. |
| Krafttak | 150–450 N inklusive eventuell gravitationshjälp | Ingen genomträngning eller okontrollerad uppsamling av energi vid vägg. |
| Extra accelerationstak | 20–40 m/s² | Lätta objekt får inte bli oavsiktliga högenergivapen. |
| Vridmomenttak | 5–40 N·m | Långa objekt och kedjor behöver separat inertia-/kontaktprov. |
| Kast | Undersök 6–14 m/s som önskad fart, med impulsbudget 20–60 N·s | Högre massa ger lägre fart när budgeten nås; bevara befintlig rörelse. |

Intervallen är **tuningshypoteser**, inte uppmätt säkra värden. Börja lågt. Att välja `k = mω²` för varje objekt gör fri respons mer likformig mellan massor; det kan förbättra styrbarhet men försvaga viktkänslan. Välj denna hjälp medvetet. Använd inte integralverkan i första provet: blockering kan annars bygga upp reglerfel som frigörs plötsligt.

Tan, Liu och Turk visar varför hög gain i vanlig PD kan vara instabil och föreslår en stabilare, nästa-steg-baserad modell. Artikeln bevisar inte stabilitet för vår egen klippta regulator med kontakter. Börja med begränsad, väl dämpad styrning och använd SPD som ett avgränsat alternativ om det mätta behovet kvarstår. [Stable Proportional-Derivative Controllers, 2011](https://faculty.cc.gatech.edu/~turk/my_papers/stable_pd.pdf).

Testa vägg, hörn, trappa, lång planka, stor masskvot, sovande kropp, spelarkapsel, snabb kamera, tappat fokus och ledad kedja. Logga mål-/greppavstånd, hastighet, krafttakets aktivering, kontaktpenetration, ledavvikelse och energi efter släpp. Fråga testspelaren vilket av två likadana objekt som känns tyngst; mät beteende och upplevelse separat. HL2-föredraget ger stöd för tydliga objektmöjligheter och säker inlärning, inte källkod till dess greppregulator. [Physical Gameplay in Half-Life 2, GDC 2006](https://cdn.cloudflare.steamstatic.com/apps/valve/2006/GDC2006_PhysicalGameplayInHL2.pdf).

## 3. Projektilkontakt mot rörliga mål

### Vad API:et faktiskt ger

`World.castShape` sveper en form mot scenen i dess querypose. `Shape.castShape` tar två former med varsin linjärhastighet. Varken det senare anropet eller en extra raycast representerar automatiskt en arm som roterar mellan två poser. Installerade `ShapeCastHit` använder `time_of_impact`; vittnespunkter och normaler från form-till-form-resultatet anges i respektive forms lokala system. Transformera med rätt forms pose vid kontakttiden. Blanda inte ihop dessa med världspunkter från andra kontakt-API:er. [World API](https://rapier.rs/javascript3d/classes/World.html), [Shape API](https://rapier.rs/javascript3d/classes/Shape.html), [installerad TOI-definition](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/geometry/toi.d.ts).

Om `shapeVel` är m/s ska `maxToi` vara tidsintervallet i sekunder. Om parametern i stället är hela förflyttningen ska maxintervallet vara 1. Samma variabelnamn får inte växla mellan konventionerna. Definiera projektilens kollisionsvolym uttryckligen; en synlig bred Slicer ska inte testas som en punkt.

### Oprövad kontaktkedja

```text
1. Skapa projectileId = (worldEpoch, casterId, castSequence).
2. Kameran bestämmer siktriktning; verklig handpose bestämmer ursprung.
3. Testa hela startvolymens överlapp mot blockerande geometri.
4. Samla rörelsehistorik/predikterade delposer för alla relevanta blockerare.
5. Broad phase: konservativa svepta höljen för projektil och mål.
6. Narrow phase: tvåkroppssweep på avgränsade delintervall;
   hantera rotation med konservativ felgräns och kontaktförfining.
7. Sortera globala kandidater efter TOI, projectileId, stabilt colliderId.
8. Revalidera kandidaten mot aktuell anatomi och redan applicerade händelser.
9. Första blockerande kontakt avslutar projektilen.
10. Pröva region, förberedd zon och zonplan vid kontakttiden.
11. Applicera en atomär skade-/ägarskapstransaktion.
12. Publicera presentationshändelse med aktuell generationsidentitet.
```

Rörelseunderlaget ska även omfatta rörliga skydd, vapen, rekvisita och redan avskilda delar. Collision layers skiljer rörelsekapsel från träffbara kroppsvolymer; den stora navigationskapseln får inte vinna före en synlig arm. En zon är ett ytterligare villkor på den första kroppskontakten, inte en sensor bakom en arm som tillåter genomslag. Definiera också om varje utrustningsdel blockerar, kan skadas eller ignoreras.

För en punkt högst `r` från rotationscentrum är `r |omega| Δt/N` en användbar övre båglängdsuppskattning per delintervall vid den antagna vinkelhastigheten. Den är inte ensam ett korrekt rotations-CCD. Animerad icke-linjär translation behöver också ett avvikelsemått. Använd expansion för att hitta möjliga kontakter och förfina sedan mot verkliga poser; en säkerhetsmarginal får inte ensam orsaka en falsk avskiljning vid ett nära missat slag.

Välj en kontakt-/fysikordning som är möjlig att genomföra utan att flytta en enstaka kropp bakåt till gammal TOI efter att världen redan löst kontakter. Logiskt träffbeslut kan använda samplad kontaktpose medan fysisk övergång sker på en definierad delstegsgräns. Om fördröjningen blir synlig eller ger fel kontakt måste fysikintervallet förfinas. Efter ett tidigare snitt behöver återstående kandidater omprövas mot ändrat ägarskap och vid behov ändrad rörelse; en fryst lista med gamla kroppshandtag räcker inte.

### Zon och orientering

Zonvolym och normal lagras relativt ett namngivet anatomiskt segment och transformeras till kontaktposen. Slicerns horisontella/vertikala plan låses vid kast. Med normaliserade normaler gäller det godkända villkoret:

```text
abs(dot(n_slicer, n_zone_at_contact)) >= cos(π/6) ≈ 0,8660254
```

Normalens tecken ändrar inte planet. Pröva 0°, strax under/över 30°, 90°, omvänd normal och kontakt strax utanför zonen. Vid fel vinkel eller zon ges vanlig regional skada. Toleransen för flyttal ska dokumenteras och vara liten i förhållande till den godkända vinkelgränsen; förbjud icke-uniform skala på fysikstyrda ben.

### Identitet och transaktion

Dupliceringsskyddet använder stabilt träff-/projektil-ID, inte `(NPC, tick)`. Två projektiler samma steg är två händelser; samma återlevererade händelse är en. Ordna lika tider med stabila ID. En transaktion ändrar hälsa, funktionsförlust, avskiljningskant, kroppskomponenter, utrustningsägarskap och renderdelta som en helhet. En redan bruten kant bryts aldrig igen, men en annan kant i den lösa kedjan kan brytas senare.

```ts
// Dataskiss; inte kompilerad eller implementerad.
type SpellSpec = {
  id: string; school: 'tyngd' | 'klang';
  windupS: number; recoveryS: number; focusCost: number;
  projectile?: {
    shapeId: string; speedMps: number; lifetimeS: number;
    orientation: 'locked-at-cast'; stop: 'first-blocker';
  };
  damageProfileId?: string;
  semanticSoundId?: string;
  requiredCapabilities: string[];
};
```

C01–C05 ska innehålla analytiskt lösbara translationsfall, roterande korsande arm, matchade nästan-missar, tunn vägg, arm framför torso, startöverlapp och två projektiler. En tät offline-sampling kan vara referens för rotation men är inte ett matematiskt bevis; kombinera den med kända enkla lösningar och en deklarerad felgräns. Rapportera även falska positiva träffar, inte bara missade träffar.

## 4. Ragdoll och faktiska ledmöjligheter

I den installerade bindningen finns `UnitImpulseJoint.setLimits`, sfäriska motorer med axelparameter samt `revoluteWithAxes` för olika lokala axlar. `GenericImpulseJoint` saknar motsvarande högnivåmetoder. Det lägre `RawImpulseJointSet.jointSetLimits(handle, axis, min, max)` är åtkomligt via ledmängdens `raw`. En descriptor med `limits` ger inte automatiskt sfäriska gränser: den distribuerade source map visar att spherical/generic-konstruktionen inte använder fältet på det sättet. [Installerade leder](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/dynamics/impulse_joint.d.ts), [ledmängd](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/dynamics/impulse_joint_set.d.ts), [WASM-deklarationer](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/rapier_wasm3d.d.ts).

**Härledd prioritet:** testa raw-adapterns faktiska koordinater och koppling mellan axlar innan en komplex hjälprigg byggs. Per-axelgränser är inte automatiskt en anatomiskt rimlig elliptisk swingkon. Håll adaptern versionslåst, gör gränsprov i båda riktningar och kräv tydligt fel om bindningen ändras. Jolt JS:s granskade IDL exponerar normal-/plane-half-cone och twist min/max samt motorer och lokala axlar. Det är starkare API-evidens för denna konstruktion, men ingen körd stabilitetsjämförelse. [Jolt JS swing/twist](https://github.com/jrouwe/JoltPhysics.js/blob/3e3b5ff0bae3db323395d72fe1ae1ca693dedc17/JoltJS.idl).

En minimal kroppsgraf kan ha 11 kroppar: bäcken, bröst, huvud och två segment per arm/ben. En icke-avskiljbar ryggradslänk kompletterar de nio snittkanterna. Tre seriella enaxelleder i stället för en treaxelled tillför två hjälpkroppar. Om båda axlarna, båda höfterna och halsen får sådana hjälpare blir det 21 kroppar. Det ryms aritmetiskt inom 24, men säger inget om stabilitet, gimbalproblem eller visuella gränser. Hjälpkropparnas massa/tröghet måste ingå i totalen; extrema små massor kan skapa nya problem. Använd bitvis `|` för axelflaggor, inte logiskt `||`.

Filtrera normalt angränsande kroppars självkontakt där jointen redan håller ihop dem. Behåll testad kontakt mellan icke-grannar, miljö och lösa delar. Definiera interaktion efter avskiljning uttryckligt; ett gammalt filter får inte göra en lös hand genomsläpplig för resten av världen.

### Pose och hastighet utan restposesnapp

```text
T_world_body = T_world_bone * B_bone_to_body
T_world_bone = T_world_body * inverse(B_bone_to_body)
T_local_bone = inverse(T_world_parent_bone) * T_world_bone
```

`B` är en authorad och versionsmärkt bindtransform. Sampla två fysikposer, beräkna COM:s världshastighet och kortaste kvaterniondifferens för vinkelhastighet; hantera att `q` och `-q` beskriver samma rotation. Använd inte bara figurrotens hastighet för en svingande arm. Överför aktuell pose och hastighet, byt auktoritativ ägare från animator till fysik och lägg därefter på träffimpulsen vid kontaktpunkten. Återberäkna inte inverse-bind-matriser från skadeposen.

Riggen får gärna behålla en sammanhängande renderhierarki där fysiken skriver varje bens lokala transform, även när fysiska komponenter separerats. Scenhierarki och kroppsgraf behöver inte vara samma sak. Reparenting av SkinnedMesh eller ben kräver egna bindprov; den får inte ge en dubbel transform. glTF beskriver skin joints och inverse bind matrices, men vårt damage-/body-offsetkontrakt är eget. [glTF 2.0, skins](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins).

## 5. Anatomi och skinnade segment

Varje figur har stabila segment-ID, ursprungliga snittkanter och aktuella sammanhängande komponenter. Vid snitt tas alla fysikleder som representerar just kanten bort atomärt, även eventuella helperleder. Distala kroppar flyttas till en ny logisk ägare; de skapas inte på nytt. Utrustning följer sitt förankrade segment eller släpps enligt en uttrycklig regel.

| Assetfält | Kontrakt och validering |
|---|---|
| Skala och axlar | Meter, +Y upp och projektets figurframåt −Z. Tillämpade transformer, inga speglade eller icke-uniforma fysikskalor. −Z är projektets avtal, inte en universell glTF-figurstandard. |
| Anatomi | Elva baskroppar eller annan motiverad graf inom specbudget; nio namngivna avskiljningskanter. Stable IDs över alla LOD. |
| Fysik | Form, massa, tröghet, COM, bone-to-body-transform, ledankare/-axlar, gränser och collision policy per segment. |
| Skinn | Segmenterade ytor med kontrollerade vikter. Inga trianglar eller vikter som dras över en öppnad snittförbindelse. |
| Snittytor | Förberedda, slutna caps på båda nya sidor, korrekt lokal anknytning, normaler, UV, material och LOD. |
| Kläder/hår | Sömmar och accessoarer följer avskiljningsgränsen. Inga plagg som fortsatt broar mellan separerade kroppar. |
| Instanser | Skadeflagga, caps och uniforms är per NPC. Delad immutable geometri tillåts; mutation av delat material görs inte oavsiktligt. |
| Bounds/LOD | Konservativa bounds för aktuella komponenter; skadegraph väljer synliga segment före LOD. En LOD får inte återställa en saknad lem. |
| Proveniens | Källfil, exportverktyg/version, tillgångens licens/upphov, referenser och revisions-ID. |

`SkeletonUtils.clone` hjälper till att knyta klonade ben korrekt, men återanvänder geometri och material. Testa därför två identiska NPC-kopior samtidigt: en skadas, den andra förblir oförändrad. Använd per-instansdata eller kontrollerad kopiering av muterbara material. [Three SkeletonUtils](https://threejs.org/docs/pages/SkeletonUtils.html).

Nio kanter ger upp till 512 bitmasker, men kräver inte 512 kompletta karaktärsmodeller. Återanvänd segment och caps och låt grafen bestämma synlighet. Första armprovet ska ändå följas av alla nio kanter och ett nytt snitt i redan lös arm/ben. Räkna total massa, kroppar, leder, meshinstanser och vapen före och efter.

Valves föredrag om L4D2 visar nyttan av särskild sårgeometri och konsekvent djup-/skuggpass. Deras posebaserade shaderklippning och begränsade sårbudget är en annan metod än vår fysiska avskiljning. Det stöder att pipeline måste designas tillsammans med renderern, inte att nio snitt är gratis. [Rendering Wounds in Left 4 Dead 2, GDC 2010](https://cdn.fastly.steamstatic.com/apps/valve/2010/gdc2010_vlachos_l4d2wounds.pdf).

Fri runtime-skärning kräver robust snittopologi, triangulering av caps, nya skinvikter, klädhantering, materialkoordinater och fysikformer med ny massa/tröghet. Den kan också påverka sparformat, LOD och determinism. Den utreds därför endast som framtida separat system; första kapitlets förberedda kanter står fast.

## 6. Gore är en presentationsvy av samma simulation

Gore PÅ gäller när preferensen saknas; explicit `false` får inte ersättas av ett sanningsbaserat standarduttryck. AV behåller fysisk graf, skada, funktionsförlust och uppdragsutfall. Avskilda kroppar har då synliga icke-anatomiska magiska restformer med begriplig storlek och placering. Osynliga fysiska hinder är inte en acceptabel ersättning.

Vid AV, omstart och relevant laddning ökas presentationsgenerationen. Rensa blodpartiklar, dekaler, synliga skadevarianter, ljud, väntande emissioner och återanvändbara poolposter innan nästa bild. En callback får bara publicera om både världens, entitetens och presentationens generation fortfarande stämmer. AV→PÅ spelar inte upp en gammal träff. Simulationshändelsen får ha ägt rum utan att en grafisk historik köas för senare uppspelning.

Dekaler placeras på verifierade mottagarytor med giltig normal och lokal anknytning till eventuellt rörligt objekt. Undvik svävande projektion över hörn och frikoppla objektlivslängd från blodets livslängd. Normalbudgeten är högst 512 blodpartiklar och 128 dekaler; färska relevanta träffar prioriteras. Neutral presentation omfattas också av en effektbudget. Inga fysiska delar tas bort för att effektpoolen är full.

G01–G05 och P04 behöver en och samma kommandosekvens på båda gorevalen, jämförelse av logisk/fysisk state samt visuell granskning vid cap, LOD-byte och sen callback. Kontrollera även sparning med AV, laddning av äldre checkpoint, ny träff efter återaktivering och poolåteranvändning på annan NPC.

## 7. Export, rendering och första riktiga asset

Bygg kedjan Blender-källa → versionslåst GLB-export → glTF-validering → projektets kontraktvalidator → runtimeprov → paketerat prov. glTF-validering hittar formatfel, men känner inte våra snitt-ID, kroppsmassor eller felaktiga klädvikter. [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator), [Blender 4.5 glTF-export](https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html).

Håll färgtexturer i sRGB och data som normal/roughness/metalness i rätt linjär behandling. Ljusberäkning ska inte få dubbla gammaomvandlingar. Blender-material med godtyckliga noder överförs inte automatiskt som samma bild i glTF; baka och kontrollera representativa material i spelets ljus. [Three färghantering](https://threejs.org/manual/en/color-management.html).

Utgå från bakad indirekt belysning för statisk stad och ett litet, mätt antal dynamiska skuggljus för spelbara objekt. Trim sheets och instancing lämpar sig för återkommande husdelar; varierade proportioner, dörrar, spår av bruk och ljussättning skapar skillnad. Transparens, vegetation och överlappande partiklar behöver overdrawmätning. Dimma får binda ihop djup, men inte dölja oavslutad kollisionsgeometri.

GLTFLoader kan kopplas till komprimerings-/decoderstöd. KTX2Loader väljer GPU-format efter stödkontroll och använder transcoder/worker-flöden. Den lokalt lästa versionen skapar blobworkers. Gör ett tidigt GLB+KTX2+ljudprov i Electron: filfilter, MIME, CSP, worker och paketerade decoderfiler måste fungera ihop. Exakt policyändring behöver ett konkret assetfall och regressioner. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), [nuvarande desktop-policy](../../../../game/desktop/policy.mjs).
