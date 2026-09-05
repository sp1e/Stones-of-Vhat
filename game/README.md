# Vadstena — spelbar teknikgård M1A

M1A är en lokalt spelbar PC-webbprototyp med Three.js-rendering och Rapier-fysik. Gården är avsiktlig prototypgeometri för rörelse, kollisioner och återstartslivscykel — inte en historisk rekonstruktion.

Krav: Node 24.12–24.x och npm. Kör från arbetskopians rot:

    rtk npm --prefix game ci
    rtk npm --prefix game run dev

Öppna sedan `http://127.0.0.1:5173/vadstena/`. Produktionsbygge och lokal preview:

    rtk npm --prefix game run build
    rtk npm --prefix game run preview

Kontroller: WASD för rörelse, mus för blick, Shift för sprint, Space för hopp, C för att huka och Esc eller Tab för paus. Startknappen begär browserns pointer lock; spelet börjar inte simulera innan låset faktiskt är aktivt. Gore-inställningen är på som standard och sparas lokalt, men M1A innehåller ännu inga gore-effekter.

Verifiering:

    rtk npm --prefix game run check
    rtk npm --prefix game run test:browser

Implementerat i M1A: förstapersonsrörelse, sprint, hopp, hukning, trappor, ramp, låg passage, fem fysiska rekvisitaobjekt, paus/fokusgrind, beständig inställning, ren återstart av fysikvärlden samt säker omladdningsåterhämtning vid WebGL-kontextförlust och återkomst från browserns sidcache.

Inte implementerat ännu: fysisk Grip, projektiler, NPC:er, strid, ragdoll, gore-grafik, historisk spelvärld eller Windows `.exe`. Webbarkitekturen är hållen browser- och wrapper-kompatibel inför separat framtida paketering.

Ingen publicering eller ändring av sp1e.se ingår i M1A.
