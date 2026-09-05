# Vadstena — runtime-grund

M0 innehåller testade TypeScript-moduler för preferenser, fast simuleringstakt och logisk input. Detta är inte ännu ett spelbart kapitel eller en renderad testgård.

Krav: Node 24.12–24.x och npm. Kör från arbetskopians rot (mappen som innehåller `game/`):

    rtk npm --prefix game ci
    rtk npm --prefix game run check

Första profilen har gore PÅ. Ett giltigt sparat false bevaras av preferenskodningen. Browserlagring, pausmeny och grafisk rensning ansluts i kommande delar.

Simuleringen använder 1/60 sekund och högst åtta steg per bildanrop. Paus rensar ackumulerad tid. Inputgrinden rensar hållna och väntande handlingar. Renderern och browseradaptern måste använda dessa kontrakt; de finns inte här ännu.

Nästa leverans är mekanikgården: Three.js, Rapier, förstapersonsrörelse, fysisk Grip och magiska projektiler. Full omfattning och kvalitetsgrindar finns i [leveranskartan](../docs/superpowers/plans/2026-09-05-vadstena-delivery-map.md).

Ingen publicering eller ändring av sp1e.se ingår i M0.
