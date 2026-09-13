# Stones of Vhat — rå strid och gemensamma skaderegler

Datum: 2026-09-13. Källa till kraven: Simons direkta meddelanden i utvecklingssessionen. Detta är ett tillägg till den godkända kapitelspecen, inte ett påstående om färdig implementation.

## Bindande riktning

Mystik, utforskning och fysikexperiment ska samexistera med rå, tät förstapersonsstrid. Magisk avståndsstrid, svärd/närstrid, riktad avskiljning, grafisk gore och verkligt ledad ragdoll är centrala delar av spelet. Mystiken är inte ett skäl att reducera striden till stämning eller en ren pusselupplevelse. Gore är fortsatt på för en ny profil; sparat av-val respekteras.

Simon förtydligar uttryckligen att regionala skador och funktionsförlust gäller **både spelare och NPC:er**. En träff i ett ben ska kunna ge hälta och andra relevanta rörelsebegränsningar. Lemmar kan skiljas av vid tillräckligt allvarliga, giltiga snitt; svärd ska ingå i samma träff-/skadegrund, inte en separat kosmetisk attackväg. Den äldre verktygstabellens formulering om endast Energy Slicers som avskiljningsförmåga ersätts därför av att Slicer är den första tekniska demonstrationen; kvalificerade svärdssnitt ska också kunna konsumera samma förberedda separationszoner.

Gemensamma regler betyder samma regionala skade-/funktionskontrakt och fysiska konsekvensprinciper, inte att alla varelser har identisk hälsa, rustning eller animation. Ingen generell spelarrollsimmunitet mot benskada eller avskiljning får införas som en dold genväg. Förstapersonskamera och spelarinput behöver en egen säker adapter till dessa gemensamma tillstånd.

## Implementationens konsekvenser

- Regional skada påverkar faktisk förmåga: benens rörelsefunktion och berörd arms vapen-/pareringsegenskaper. Vilka besvärjelser som kräver en särskild hand ska vara uttalade förmågedata, inte antas från animationen.
- Skadans kontaktvolym, riktning, energi/skadeprofil, region och aktuell anatomi måste vara konsekventa. Exakta trösklar är spelbalans, inte medicinska fakta. Slumpmässig amputation efter en allmän hälsominskning är inte godtagbart.
- Använd den godkända metoden med förberedda snittzoner och separerbara segment. Ingen ny utfästelse om fri godtycklig meshskärning, vävnadssimulering eller vätskemekanik.
- Ragdollövergången bevarar aktuell pose och rörelse; separerade delar behåller korrekta ägarskap, impulser och kollisionskroppar. Symmetrin omfattar spelaren vid fysisk incapacitering/död, inte bara NPC-effekter.
- Gore av ändrar presentation och ljud, inte skada, hälta, separationsgraf, fysisk blockering eller svårighetsgrad. Kameraskakning och förstapersonseffekter förblir separata tillgänglighetsinställningar.
- Behåll stridens responsivitet och läsbarhet. En skada ska kunna förstås och påverka nästa beslut; kontrollförlust får inte gömmas som ett inputfel. Återställning/kapitelomstart måste hantera spelarens skadetillstånd utan kvarvarande kommandon eller trasiga kamerareferenser.

## Kommande acceptansfall

1. Samma avgränsade regionala träffsekvens mot spelar- respektive NPC-aktör ger samma skade-/funktionsövergångar vid samma egenskapsdata.
2. Benskada sänker faktisk rörelseförmåga i både spelarstyrning och AI-rörelse; det är inte enbart en haltande animation. Testa rörelse, stopp, trappor och återställning.
3. Armens funktionsförlust påverkar det vapen/den förmåga som faktiskt använder den armen; inget dubbelt tappat vapen och ingen skadad del återkommer efter LOD/omstart.
4. Slicer respektive kvalificerat svärdssnitt använder samma anatomiska zon-/ägarskapskontroll. Glansande/felplacerad träff kan skada utan att separera.
5. Dubblettkontakt ger ingen extra skada/separation. Två skilda kontakter omprövas mot den uppdaterade anatomin.
6. Gore på/av ger identiska logiska/fysiska resultat och inga osynliga resthinder. Spelarkamera och input återhämtar sig säkert efter incapacitering/död och omstart.

Det pågående B02a-arbetet bygger först den gemensamma grunden för tidsmedvetna kontakter. Detta tillägg ändrar inte ägarskapet för Claudes parallella miljögren och innebär inte att komplett ragdoll, spelarskador, svärd eller gore redan är färdiga.
