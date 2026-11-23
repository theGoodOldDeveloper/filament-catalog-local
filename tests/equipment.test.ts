import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { tFor } from "@/i18n/core";
import { translateError } from "@/i18n/errors";
import { computeFit } from "@/lib/fit";
import { clearDryer, clearPrinter, getEquipment, saveDryer, savePrinter } from "@/server/equipment";
import { getSetting, setSetting, storedT } from "@/server/settings";

const errorsOf = (fn: () => unknown, lang: "hu" | "en" = "hu"): string[] => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ZodError);
    return translateError(e, tFor(lang));
  }
  return [];
};

beforeEach(() => {
  clearPrinter();
  clearDryer();
});

describe("felszerelés-profil", () => {
  it("alapból nincs megadva semmi", () => {
    expect(getEquipment()).toEqual({ printer: null, dryer: null });
  });

  it("mentés és visszaolvasás: az űrlap szöveges értékeiből, a hiányzó mező NULL", () => {
    savePrinter({ name: "  Példa nyomtató ", maxNozzleC: "300", maxBedC: "110,5", enclosed: "yes", heatedChamber: "no", heatedToolheads: "1", hardenedNozzle: "" });
    expect(getEquipment().printer).toEqual({
      name: "Példa nyomtató", maxNozzleC: 300, maxBedC: 110.5, enclosed: true, heatedChamber: false, maxChamberC: null, heatedToolheads: 1, hardenedNozzle: null, buildVolume: null,
    });
    saveDryer({ name: "Példa szárító", minC: 45, maxC: 70, zones: 1, capacitySpools: 2, powerW: 110 });
    expect(getEquipment().dryer).toEqual({ name: "Példa szárító", minC: 45, maxC: 70, zones: 1, capacitySpools: 2, powerW: 110 });
  });

  it("egyetlen aktív profil: az új mentés felülírja a régit", () => {
    savePrinter({ name: "A", maxNozzleC: 260 });
    savePrinter({ name: "B", maxBedC: 100 });
    expect(getEquipment().printer).toMatchObject({ name: "B", maxNozzleC: null, maxBedC: 100 });
  });

  it("következetesség: kamrahőfok ⇒ fűtött kamra ⇒ zárt; fűtött kamra nélkül nincs kamrahőfok", () => {
    expect(savePrinter({ maxChamberC: 65 })).toMatchObject({ heatedChamber: true, enclosed: true, maxChamberC: 65 });
    expect(savePrinter({ heatedChamber: "no", maxChamberC: 65, enclosed: "no" })).toMatchObject({ heatedChamber: false, enclosed: false, maxChamberC: null });
    expect(savePrinter({ heatedChamber: true, enclosed: false })).toMatchObject({ heatedChamber: true, enclosed: true });
  });

  it("törlés; a teljesen üres mentés is törli a profilt", () => {
    savePrinter({ name: "A" });
    saveDryer({ maxC: 70 });
    clearPrinter();
    expect(getEquipment()).toMatchObject({ printer: null, dryer: { maxC: 70 } });
    expect(saveDryer({ name: " ", maxC: "" })).toBeNull();
    expect(getEquipment().dryer).toBeNull();
  });

  it.each([
    [() => savePrinter({ maxNozzleC: 100 }), "Max. fúvóka-hőmérséklet: legalább 150", "Max. nozzle temperature: at least 150"],
    [() => savePrinter({ maxBedC: 400 }), "Max. asztalhőmérséklet: legfeljebb 250", "Max. bed temperature: at most 250"],
    [() => savePrinter({ maxNozzleC: "sok" }), "Max. fúvóka-hőmérséklet: számot adj meg", "Max. nozzle temperature: enter a number"],
    [() => savePrinter({ heatedToolheads: 1.5 }), "Fűthető fejek száma: egész számot adj meg", "Number of heated toolheads: enter a whole number"],
    [() => savePrinter({ enclosed: "talán" }), "Zárt nyomtatótér (ajtó, burkolat): érvénytelen érték", "Enclosed build space (door, housing): invalid value"],
    [() => saveDryer({ minC: 80, maxC: 60 }), "A szárító legkisebb hőfoka nem lehet nagyobb a legnagyobbnál", "The dryer's minimum temperature cannot be higher than its maximum"],
  ])("érvénytelen adat → lefordítható hibaüzenet (%#)", (fn, hu, en) => {
    expect(errorsOf(fn, "hu")).toEqual([hu]);
    expect(errorsOf(fn, "en")).toEqual([en]);
    expect(getEquipment()).toEqual({ printer: null, dryer: null });
  });

  it("a mentett profil közvetlenül átadható a computeFit-nek", () => {
    savePrinter({ maxNozzleC: 300, maxBedC: 110, enclosed: "yes", heatedChamber: "no" });
    saveDryer({ minC: 45, maxC: 70 });
    const res = computeFit({ nozzle: [240, 270], bed: [90, 110], chamber: [55, 65], chamberMode: "required", hardened: false, dryTempC: 80 }, getEquipment());
    expect(res.fit).toBe("limit");
    expect(res.dryerWarnings.map((w) => w.key)).toEqual(["fit.reason.dryer.tooCool"]);
  });
});

describe("beállítások", () => {
  it("kulcs/érték tárolás felülírással", () => {
    expect(getSetting("nincs.ilyen")).toBeNull();
    setSetting("language", "en");
    expect(getSetting("language")).toBe("en");
    expect(storedT()("spoolStatus.open")).toBe("Open");
    setSetting("language", "hu");
    expect(getSetting("language")).toBe("hu");
    expect(storedT()("spoolStatus.open")).toBe("Nyitott");
  });
});
