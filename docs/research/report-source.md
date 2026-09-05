# Game1: historisk och teknisk förstudie

Intern kanonisk researchsyntes. Datum och åtkomst: 2026-09-05. Mottagare: Simon / sp1e. Leveransformat: versionshanterbart Markdown-underlag i projektet; ingen DOCX/PDF beställd. Publik arbetsleverans: docs/VADSTENA-GAME-CONCEPT.md.

## Direkt svar och avgränsning

Projektidén är genomförbar som en stegvis byggd webbaserad förstapersonsupplevelse. Ett färdigt slott passar inte en strikt medeltida tidslinje: byggstarten är 1545. Simon har därför uttryckligen valt senmedeltid med tidsbrott. Detta löser konceptkonflikten men ersätter inte källkontroll för respektive byggnadsfas. [SFV: Vadstena slott](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/vadstena-slott)

Undersökningen avser fem landmärken, tillgängliga visuella referenser och en möjlig teknisk/publiceringsmässig grund. Den omfattar inte fullständig stadsarkeologi, licensiering av en färdig assetuppsättning eller uppmätt spelprestanda. Game1 innehåller ännu inget spel. Teknikförslaget och spelkärnan i leveransen är våra rekommendationer, inte resultat av en byggd prototyp.

## Syntes

Historisk modellering behöver komponenter per fas, inte en enda nutida fotomodell som kallas medeltida. Senare byggnader kan vara avsiktliga tidsintrång; osäkra dateringar förblir osäkra även i ett fantasyspel. Första kapitlet bör bevisa fysisk magi och NPC-interaktion innan hela staden detaljmodelleras.

Den föreslagna tekniken är isolerad Three.js/TypeScript/Vite med Rapier. Det möjliggör separat rendering, fysik och domänregler. Telekinesi föreslås som dynamisk kropp plus dämpad kraft/fjäder; detta är ett prototypförslag, inte garanterat färdig spelkänsla. [Rapier: rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/)

Den befintliga webbplatsens konfiguration stödjer statiska utdata, men dess CSP kräver ett medvetet WASM-beslut. Ingen publicering eller ändring av policyn är gjord. [Repository headers vid granskad commit](https://github.com/sp1e/sp1e.se/blob/93c6d96815c15e0bbd63088a5de009c8a88f3fee/_headers), [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)

## Claim-to-source ledger och kvarvarande luckor

Källornas egna datum anges nedan; sökmotorns crawl-/uppladdningsdatum behandlas inte som publiceringsår. Alla länkar granskades 2026-09-05. Native-referenser är interna spårningsmarkörer, inte avsedda för användarleveransen.

| Påstående / användning | Källa, utgivare och källdatum | Styrka och åtkomst / kvarvarande lucka |
|---|---|---|
| Slottet startar 1545, utvecklas från borg till palats. | [Vadstena slott, SFV](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/vadstena-slott), odaterad webbsida. | Hög; huvudagent läst. Native turn5view0. Exakt senare fasmodell återstår. |
| Rådhusets sal dateras olika; senare huv och tak är inte medeltida. | [Rådhuset, Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/radhuset/), uppdaterad 2023-09-25; [RAÄ BeBR](https://www.bebyggelseregistret.raa.se/bbr2/anlaggning/visaHelaHistoriken.raa?anlaggningId=21300000009912&historikId=21000000535666), hänvisar till inventering 1981. | Hög för fasföljd; 1460 kontra omkring 1490 olöst. Kommuntext huvudläst turn28view0; RAÄ läst av researchagent. |
| Rekonstruktionsbilder före 1567 och under 1580-tal, inte originalritningar. | [Stora Torget i Linköping, Ingrid Gustin, Östergötlands länsmuseum](https://www.pdfrapporter.se/pdf/2007/2007-066.pdf), 2007:66, fig. 4–5 efter Zachrisson 2001. | Text huvudläst turn25view1, bilder visuellt granskade av researchagent. Tornets tidiga färdigställande osäkert. Återanvändningslicens ej funnen. |
| S:t Per var hel kyrka runt dagens Rödtorn. | [Rödtornet, Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/rodtornet/), uppdaterad 2023-09-25. | Hög för huvudfaser, huvudläst turn28view1. Modell visuellt granskad av researchagent; skala/upphov/underlag/licens ej angivna. Exakt plan återstår. |
| Mårten: institutionella dateringar motsäger varandra. | [Mårten Skinnares hus, Vadstena kommun](https://www.vadstena.se/kultur-fritid/kulturhistoriska-byggnader-i-vadstena/marten-skinnares-hus/), uppdaterad 2023-09-25; [SFV](https://www.sfv.se/vara-fastigheter/sverige/oestergotlands-lan/marten-skinnares-hus-och-hospitalsmuseet), odaterad. | Olöst: kommunens 1519 sten/1587 tegel kontra SFV:s 1520-tal. Båda huvudlästa turn28view2/turn25view2. Kräver byggnadsarkeologiskt underlag/vårdprogram, inte fler turisttexter. |
| Arkitekturmodell i 1:20 med angiven CC BY 4.0; rekonstruerad gavel. | [Mårten Skinnares hus, Chalmers ODR](https://odr.chalmers.se/items/f2e763aa-e008-4f6f-8ab2-2e2aeb6f825a/full), Lars Olof Kjellberg/Olof Meyer, 1969. | Metadata huvudläst turn25view0; båda JPEG visuellt granskade av researchagent. Andra filen är byggnadsfoto, inte andra modellvinkeln. |
| Klosterkyrkan invigd 1430; äldre och nutida rum skiljer sig. | [Vadstena klosterkyrka, Svenska kyrkan](https://www.svenskakyrkan.se/vadstena/klosterkyrkan), webbsidans publiceringsdatum ej säkert. | Hög för invigning. Huvudläst turn5search0. |
| Takryttare/tak och inredning har sena faser; original rumsdisposition inte säkert känd. | [Kulturhistorisk inventering, Anna Lindqvist, Östergötlands länsmuseum för Linköpings stift](https://www.svenskakyrkan.se/filer/Vadstena%20klosterkyrka%20%28pdf%29.pdf), januari 2005. | Huvudläst text turn21view1. PDF-bildverktyget gav inga bildpixlar; ingen visuell granskning påstås. |
| Senare slotts-/stadsgravyr med PD-märkning. | [Wadstena, KB](https://suecia.kb.se/F/?func=direct&doc_number=001925334&local_base=sah), Johannes van den Aveelen, 1706. | Metadata och rättighetsmärkning huvudlästa turn21view2. Ingen geometrisk uppmätning; bilden ej visuellt granskad. |
| Djupare kyrkomonografi identifierad. | [Vadstena klosterkyrka 1, Iwar Anderson m.fl., RAÄ](https://raa.diva-portal.org/smash/record.jsf?pid=diva2%3A1244203), 1991. | Katalogmetadata turn11search0, ej fulltextgenomgång: botkontroll/timeout. |
| Webbplatsens aktuella konfiguration och säkerhetspolicy. | [sp1e/sp1e.se commit 93c6d96](https://github.com/sp1e/sp1e.se/commit/93c6d96815c15e0bbd63088a5de009c8a88f3fee), läst via autentiserad GitHub API 2026-09-05. | Privat repo. Agent läst package/wrangler/PROJECT/headers och deployment-check; huvudagent har kontrollerat headers. Ingen Cloudflare-dashboardinspektion eller spelruntime på domänen. |
| Rapier-kontroller och fysikprinciper. | [Character controller](https://rapier.rs/docs/user_guides/javascript/character_controller/), [Rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/), [Colliders](https://rapier.rs/docs/user_guides/javascript/colliders/), Rapier, odaterade docs. | Första två huvudlästa turn27view0–1, colliders av agent. API-stöd verifierat, spelkänsla och prestanda ej verifierade. |
| WASM-policy och maxfilstorlek. | [MDN script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), levande dokumentation. | Huvudlästa turn27view2–3. WASM-blockering slutsats av aktuell policy; 25 MiB gäller enskild fil, inte hela spelet. |
| Separata grafiska assets och statiskt bygge. | [GLTFLoader, Three.js](https://threejs.org/docs/pages/GLTFLoader.html), [Vite static deployment](https://vite.dev/guide/static-deploy.html), odaterade docs. | GLTF huvudläst turn28view3; Vite av agent. Assetkontraktet är vårt arkitekturförslag. |

## Söklogg och stoppbeslut

Första vågen: SFV Vadstena slott 1545/1620; Vadstena kommun Rödtornet/Rådhuset/Mårten; Svenska kyrkan klosterkyrkan 1430 och restaurering; klosterkyrkan planritning/uppmätning; Vadstena 1642 karta/medeltida stadsplan; kanoniskt sp1e/sp1e.se.

Andra vågen: KB Suecia Vadstena slott och klosterkyrka; RAÄ/DiVA kyrkomonografi och slottsritningar; Asylen 2014:11-kartreferens; direktläsning av kommunens byggnadssidor, SFV, Chalmers metadata och museirapportens jämförelsefigurer; Rapier/Three/Vite/MDN/Cloudflare primärdokumentation; read-only GitHub-konfiguration och live headers.

Två separata researchagenter användes: tre stadshus/landmärken med faskonflikter och bildreferenser; respektive webbplats/teknik. Huvudagenten hanterade slott, klosterkyrka, kartspår, avstämning av avgörande uppgifter och syntes. Ingen agent skrev kod eller ändrade externa system.

Tillgänglighetsluckor: vissa kommun-/musei-PDF:er gav upprepade hämtningsfel; DiVA-fulltext gav botkontroll/timeout; tidigare KB-bygg-länk leder nu till parkerad domän och används inte som evidens. Museirapportens identifiering av 1642-kartan kommer från sökträff, inte originalkartgranskning.

Stopp: tillräckligt underlag för tidsperiodbeslut, koncept och teknisk förstudie. Dateringskonflikterna kräver mer kvalificerad arkiv-/byggnadsarkeologisk evidens. Fler likartade webbsökningar skulle inte göra en exakt rekonstruktion säker. Mått-/kartarbete och rättighetskontroll blir en separat innehållsetapp före slutlig modellering. Slutartefakten granskas strukturellt; ingen PDF/HTML-rendering beställd eller påstådd.
