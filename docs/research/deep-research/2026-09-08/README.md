# Vadstena: Den åttonde klangen — forskningsunderlag

**Beslutsunderlag för Simon och utvecklingssessionen · 8 september 2026**

Rekommendationen är att behålla Three.js/TypeScript och den gemensamma spelkoden för webb och Windows genom ett avgränsat teknikprov. Avgör fysikbindning, rörlig skärkontakt och skadeassetpipeline innan slutliga NPC-assets produceras. Godot är det starkaste hela motoralternativet; Jolt är ett mer avgränsat alternativ om just lederna fäller Rapier.

Detta är en avslutad researchleverans. Rekommenderade implementationer och nya testgränser är förslag, inte redan godkända spelbeteenden eller genomförda experiment. Den godkända omfattningen består: PC, riktiga ragdolls, nio förberedda snittförbindelser, gore PÅ som standard, samma regler med gore AV, två skolor i första kapitlet och en grundvärld omkring 1510.

## Läs efter beslut

| Dokument | Beslut som dokumentet hjälper till med |
|---|---|
| [Executive summary](executive-summary.md) | Rekommenderad riktning, viktigaste fynden och vad som kan ändra slutsatsen. |
| [Motor och arkitektur](engine-architecture.md) | Kravjämförelse, migration, gemensam runtime och bytestriggers. |
| [Tekniskt dossier](technical-dossier.md) | Grip, volymkontakt, leder, poseöverföring, anatomi, gore och assetkontrakt. |
| [Design, berättelse och ljud](design-story.md) | Spelbara beats, skolornas samspel, NPC-regler, två lösningar och två edsprov. |
| [Historia och miljö](history-environment.md) | Byggnadsfaser, kartunderlag, stråkplan och kvarvarande originalkällor. |
| [QA, prestanda och distribution](qa-performance-distribution.md) | Alla 26 acceptans-ID, mätprotokoll, checkpoints och leveransgränser. |
| [Riskregister](risk-register.md) | Vilka beslut som blockeras, hur riskerna minskas och hur de stängs. |
| [Prioriterad backlog](implementation-backlog.md) | Avgränsade uppgifter med input, mätning, felkriterium och nästa åtgärd. |
| [Käll- och påståenderegister](sources.md) | Direktkällor, versioner, läsomfattning, konflikter och åtkomstbegränsningar. |

## Så ska evidensen läsas

**Belagt** betyder att en läst källa eller lokal fil stöder det avgränsade påståendet. **Härlett** betyder en slutsats som dras från dessa byggstenar. **Designförslag** är ett nytt val för spelet. **Måste testas** betyder att källor inte kan ersätta en körd implementation, mätning eller spelobservation. Historiska objekt klassas dessutom belagda, rekonstruerade eller fiktiva per komponent och tidsfas.

Kodgranskningen utgick från `codex/vadstena-runtime-foundation`, commit `c54cdcb93aa26af5efda937a3b2bc3df7d881fbe`. Under forskningen tillkom andra sessionens Windows-test- och statusändringar samt en pausad Grip-plan. Slutkontrollens HEAD är `b4c6a06ba241491f5f69dbdd13e4c525b1358f47`; versionsskillnaden omfattar dokument och testharness, inte produktionsspelkod eller beroenden. Den senaste daterade resultattexten och en rå testlogg har lästs: den befintliga uppackade Windows-appen klarade två prov på AMD Radeon 860M. Portable-start, vanlig standardprofil och FPS är fortfarande separata, öppna frågor. Inga speltester har körts av researchsessionen.

Beställningen är [research-handovern](../../2026-09-08-deep-research-handover.md). Den godkända [kapitelspecen](../../../superpowers/specs/2026-09-05-vadstena-chapter-design.md) har företräde framför rapportens nya förslag. Rapporten ändrar inte produktionskod, beroenden, spec, handover, hemsida eller säkerhetsinställningar. Ingen publicering eller exe-start ingår.

## Leveranskontroll

De tio Markdown-dokumentens struktur och lokala länkar har kontrollerats, och QA-matrisen innehåller samtliga 26 ID från specen i samma ordning. Avgränsad sakgranskning av motor/distribution, design/ljud, historia och Rapier-API är genomförd; upptäckta preciseringar är införda. Ingen fullständig visuell layoutgranskning av Markdown-leveransen har gjorts. Källornas utvalda historiska kart-/planbilder har granskats separat enligt läsomfattningen i källregistret.
