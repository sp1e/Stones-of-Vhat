# Rekommenderad riktning

**Behåll den gemensamma Three.js/TypeScript-arkitekturen för nästa milstolpe, men lås inte slutlig fysikbindning eller NPC-produktion innan tre små, avgörande prov passerar.** Prova begränsade leder och animation-till-ragdoll, korrekt volymkontakt mot rörliga mål samt en skinnad arm som kan avskiljas utan grafik- eller ägarskapsfel. Dessa prov ska köras med riktiga assets, i både PC-webb och Windows-skalet.

Detta är en villkorad rekommendation. Nuvarande fungerande teknikgård visar att runtime och paketeringsgrund finns. Den bevisar inte att hela kapitlets fysik, assets eller prestanda fungerar. Ett motorbyte ska bedömas mot samma spelprov, inte mot funktionslistor eller redan nedlagd tid.

## Fynd som ändrar nästa steg

1. **Rapier JS 0.20.0 har sfäriska motorer, men saknar ett motsvarande bekvämt publikt API för sfäriska vinkelgränser.** Den installerade bindningen skiljer sig från den äldre publika TypeDoc-sidan. `world.impulseJoints.raw.jointSetLimits` finns på lägre nivå. Därför är slutsatsen en bindnings- och stabilitetsrisk, inte att Rapier saknar varje möjlighet. Prova en liten adapter; jämför med Jolt JS:s uttryckliga swing/twist-API om den inte håller. [Installerade API-filer](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/dynamics/impulse_joint.d.ts), [Jolt JS, versionslåst IDL](https://github.com/jrouwe/JoltPhysics.js/blob/3e3b5ff0bae3db323395d72fe1ae1ca693dedc17/JoltJS.idl).

2. **En sweep mot scenens frysta pose räcker inte för en arm som korsar projektilbanan mellan simuleringssteg.** Rapiers form-till-form-query kan ta två linjärhastigheter; rotation måste hanteras och verifieras separat. Första blockerande kontakt behöver bestämmas före anatomisk zon- och vinkelprövning. [Rapier Shape API](https://rapier.rs/javascript3d/classes/Shape.html), [kontaktdefinition i installerat paket](../../../../game/node_modules/@dimforge/rapier3d-compat/dist/geometry/toi.d.ts).

3. **Skadeassets är en del av fysikarkitekturen.** Stabil anatomi, bindtransformer, båda snittsidorna, klädsömmar, LOD, utrustning och per-instansmaterial måste fungera tillsammans. En lyckad fristående cylinderkapning säger lite om en skinnad, animerad figur. Fri meshskärning tillför en stor egen produktionskedja och ligger fortsatt utanför kapitlet. Assetkontraktet och armprovet finns i [tekniska dossiern](technical-dossier.md).

4. **1510 kräver en annan stadsbild än dagens.** Stora Torget och Kyrktorget hör till senare regleringar. S:t Per ska ha kyrkobyggnad, inte bara dagens Rödtorn. Klosterkyrkans takfas behöver rekonstrueras separat; dess medeltida klocktorn är också relevant för Klangs ljudvärld. Rådhusets torn och Mårten Skinnares hus har kvarstående dateringskonflikter. [Hasselmo, Medeltidsstaden 36](https://raa.diva-portal.org/smash/get/diva2:1714803/FULLTEXT01.pdf), [Klosterkyrkans monografi](https://raa.diva-portal.org/smash/record.jsf?pid=diva2%3A1244203), [fasmatris och begränsningar](history-environment.md).

5. **Windows-grunden har ny positiv evidens, men asset- och distributionskedjan är inte färdig.** Senaste lokala resultat redovisar två godkända uppackade starter med AMD-hårdvara. Skalet tillåter ännu inte de planerade GLB-, KTX2- och ljudformaten i sitt filfilter. Texturworkers kan dessutom kräva en avsiktlig CSP-lösning. Fristående portable-fil och vanlig profilstart återstår. [Windows-resultat](../../../superpowers/plans/2026-09-05-windows-portable-results.md), [nuvarande protokollpolicy](../../../../game/desktop/policy.mjs).

6. **Mysteriet bör växa ur begripliga regler och förändrad vardag.** Lär spelaren en enkel rutin, låt ett ljud bryta den och ge möjlighet att undersöka före strid. Hot behöver förutsättningar och pauser. Magins konsekvenser ska vara läsbara även när deras större betydelse är oklar. Detta är vår syntes av utvecklarföredrag, inte ett bevisat recept på rädsla. [Miljöberättande, GDC 2010](https://media.gdcvault.com/gdc10/slides/Smith_Harvey_WhatHappenedHereWeb_Notes.pdf), [L4D:s AI-system, AIIDE 2009](https://cdn.cloudflare.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf).

## Ordning och villkor

| Nu | Resultat som behövs | Om det misslyckas |
|---|---|---|
| Led- och poseprov | Begränsade axlar/höfter, stabila armbågar/knän, korrekt rörelseöverföring inom 24 kroppar per rigg. | Prova Jolt i samma scen. Fullt motorbyte först om bredare verktygs-/exportproblem kvarstår. |
| Kontaktprov | Rörlig arm, tunn vägg, överlappad start och två projektiler ger rätt kontaktordning. | Förbättra relativ rörelse och felgränser; godta inte kosmetisk träffgissning. |
| Skinnat armprov | Rätt kedja, slutna snitt, två instanser, LOD och goreväxling fungerar i båda leveransformerna. | Ändra segment-/riggkontrakt före fler NPC-assets. |
| Grip- och miljöprov | Vikt, hinder och rörelse känns bra; historiskt motiverad gatusektion fungerar i ögonhöjd. | Justera styrning, kollisionsyta och rumsgeometri före dekoration. |
| Kapitelprov | Båda passagerna, båda ederna, död informationsbärare och blockerad tidsfas når fungerande fortsättning. | Reparera orsakskedja och återhämtning före mer innehåll. |

## Vad som kan ändra motorrekommendationen

Ett verifierat Jolt-prov som löser ledkraven med rimlig livscykel och utan orimlig querykostnad kan motivera byte av fysikmotor. Godot blir starkt om miljö-/NPC-produktion och iteration fortfarande är för dyr i nuvarande verktyg, samtidigt som Godots verkliga webexport klarar rigg, Klang och den valda belastningen. Unity är ett möjligt kommersiellt alternativ, men dess webbljud och export behöver samma prövning. Unreal ger stark native-produktion men saknar här verifierad officiell UE5-export som kör hela spelet lokalt i webbläsaren; Pixel Streaming ändrar driftsmodellen. [Kravjämförelse och daterade villkor](engine-architecture.md).

Rapporten fastställer inte 60 fps, exakt utvecklingstid, säkerhetsklarering av exe-filen eller en exakt rekonstruktion av Vadstena 1510. Återstående frågor har konkreta slutpunkter i [backlogen](implementation-backlog.md), och samtliga 26 accepterade prov är spårade i [QA-planen](qa-performance-distribution.md).
