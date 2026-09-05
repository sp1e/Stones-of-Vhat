# Game1 — research- och designarbete

Datum: 2026-09-05. Mottagare: Simon / sp1e. Status: koncept och detaljerad spec godkända; M0:s rendereroberoende runtime-grund är implementerad, testad och slutgranskad. Spelbar vy och kapitel återstår.

## Avgränsning

Beslutsfråga: hur kan ett fysikdrivet magispel i första person förena ett historiskt underbyggt Vadstena med de fem önskade landmärkena och publicering på sp1e.se?

Geografi: Vadstenas historiska stadskärna. Tidsfönster som ska jämföras: senmedeltid och 1500–1600-tal. Historiska fakta skiljs uttryckligen från föreslagen fiktion och från obekräftad rekonstruktion. Första leveransen är ett källbelagt beslutsunderlag; inte en färdig stad eller ett färdigt spel.

Källprioritet: byggnadsförvaltare, museum, kommun, Riksantikvarieämbetet, arkiv/arkeologiska rapporter; därefter sakkunniga sekundärkällor. Tekniska påståenden kontrolleras mot projektets repository och officiell dokumentation. Bilder/ritningar är referenser, inte automatiskt licensierade spelassets.

Planverktyget update_plan finns inte tillgängligt i denna session. Denna fil håller arbetsstatus i stället.

## Research

- [x] Första upptäckt — kronologi för fem landmärken, kart-/ritningskällor, tillståndet i Game1 och publiceringsrepo.
- [x] Riktad uppföljning — verifierade slottets byggstart, klosterkyrkans förändringar, ritnings-/modellreferenser och webbplatsens CSP. Dateringskonflikter för Rådhuset och Mårten Skinnares hus dokumenteras öppet.
- [x] Syntes — historiskt ramverk, fem magiskolor, systemdrivet första kapitel, assetkrav och test-/publiceringsrisker dokumenterade.
- [x] Leveranskontroll — källor och avgränsning avstämda; filer återlästa, UTF-8 kontrollerat och rubrik-/platshållarkontroll utförd. Separat konceptgranskning fann inga blockerande problem; tre förbättrade acceptanskrav införda. Ingen spelruntime eller grafisk slutrendering testad.

## Designflöde enligt valda skills

1. Utforska projektkontext och historiska förutsättningar.
2. Erbjud visuell companion när vi går vidare till visuella jämförelser; nu behandlas koncept och tidsperiod i text.
3. Klargör en avgörande fråga i taget; tidsperiod först.
4. Jämför två–tre angreppssätt med rekommendation.
5. Presentera designen för godkännande.
6. Skriv godkänd designspec i docs/superpowers/specs/.
7. Granska spec för motsägelser, luckor och scope.
8. Låt användaren granska skriven spec.
9. Skapa implementationplan, därefter TDD och separata subagentgranskningar (spec först, kodkvalitet sedan).

Inga produktionsfiler, beroenden eller publicering innan designgrinden är passerad. Ingen ändring av sp1e.se ingår i denna förstudie.

## Bekräftat användarbeslut

2026-09-05: Simon valde **senmedeltid med tidsbrott**, så att alla önskade landmärken kan ingå. Detta godkänner det historiska ramverket, inte ännu hela speldesignen eller en implementationsspec.

Förstudien är levererad i docs/VADSTENA-GAME-CONCEPT.md. Simon har därefter godkänt spelriktningen och första kapitlet med tillägg: full magisk avståndsstrid, verklig NPC-ragdoll, träffbaserad amputation och valbar gore, samt genomarbetade gator, murar, hus och träd mellan landmärkena. Efterföljande uttryckligt beslut: **gore ska vara PÅ från första starten**; spelarens senare avstängning sparas.

## Specarbete efter konceptgodkännande

- [x] Läs aktuellt koncept och inför användarens utökade omfattning utan att behandla den som redan implementerad.
- [x] Kontrollera primärdokumentation för projektilsvep, joints, skinnade modeller och livscykel; kontrollera lokalt miljöunderlag.
- [x] Skriv detaljerad spec, uppdatera konceptet och granska konsekvenskedjan träff → skada → ragdoll → avskiljning → presentation. Separat granskning genomförd; checkpoint-/träff-/vinkelkrav preciserade.
- [x] Verifiera dokument: UTF-8 utan ersättningstecken, inga arbetsplatshållare, konsekvent gore PÅ/sparat AV och godkänd git diff --cached --check. Endast fyra uppgiftsägda dokument är valda för lokal versionshantering på codex/vadstena-chapter-design.
- [x] Simon godkände den skrivna specen 2026-09-05 med ”Ser grymt ut!”, uttryckligen efter frågan om förberedda snittzoner. Ingen ytterligare designbekräftelse behövs för denna omfattning.
- [x] Skapa en leveranskarta och en separat exekverbar plan för runtime-grunden i docs/superpowers/plans/.
- [x] Simon godkände separat worktree. Arbetet sker på `codex/vadstena-runtime-foundation` i `C:/Users/simon.pettersson/.config/superpowers/worktrees/Game1/runtime-foundation`; originalets konfiguration lämnas orörd.
- [x] Runtime-grund M0 implementerad med TDD, separata spec-/kvalitetsgranskningar och oberoende slutgranskning. 16/16 tester och typkontroll passerar.
- [ ] Bygg mekanikgården enligt leveranskartan och dess kommande delplaner.

Codacy MCP-analysverktyg saknas i denna session. Ingen Codacy-analys eller installation påstås utförd; dokument kontrolleras lokalt. Befintliga .github/.gitignore lämnas orörda och hemsidan ändras inte.
