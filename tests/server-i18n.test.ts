import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { MESSAGES, makeT, tFor, tk } from "@/i18n/core";
import { AppError, appMsg, translateError } from "@/i18n/errors";
import { exportJson, exportProfilesCsv, exportSpoolsCsv, importJsonExport, importProfilesCsv } from "@/server/export";
import { createProfile, deleteProfile, fieldSchema, getProfileFull } from "@/server/profiles";
import { setSetting } from "@/server/settings";
import { addSpool, createPurchase, deletePurchase, deleteSpool } from "@/server/stock";
import { saveUpload } from "@/server/uploads";
import { FIELD_BY_KEY } from "@/lib/fields";
import { profile } from "./helpers";

// Egy próba-nyelv: az angol szótár néhány kulcsa tényleg angol, a többi a magyarra esik vissza.
const EN_SAMPLE = {
  "stock.error.spoolNotFound": "The spool was not found",
  "profile.error.hasStock": "The profile has {spools} spools and {items} purchase items – delete those first.",
  "validation.min": "{field}: at least {min}",
  "field.nozzleTempMinC": "Min. nozzle temperature",
  "upload.error.empty": "Empty file",
  "import.error.row": "Row {row}: {message}",
};
const noSpool = { initialWeightG: null, remainingG: null, remainingOrigin: null, receivedAt: null, openedAt: null, location: null, storageMethod: null, moistureState: null, notes: null };
const tHu = tFor("hu");
const tEn = makeT("en", { ...MESSAGES.en, ...EN_SAMPLE });

describe("szerveroldali hibák: AppError / appMsg → translateError", () => {
  it("ugyanaz a hiba magyarul és angolul is lefordul, a paraméterek behelyettesítődnek", () => {
    const e = new AppError("profile.error.hasStock", { spools: 2, items: 1 });
    expect(translateError(e, tHu)).toEqual(["A profilhoz 2 tekercs és 1 vásárlási tétel tartozik – előbb azokat kell törölni."]);
    expect(translateError(e, tEn)).toEqual(["The profile has 2 spools and 1 purchase items – delete those first."]);
    expect(translateError(new AppError("stock.error.spoolNotFound"), tHu)).toEqual(["A tekercs nem található"]);
    expect(translateError(new AppError("stock.error.spoolNotFound"), tEn)).toEqual(["The spool was not found"]);
  });

  it("Zod-üzenet: a mezőnév kulcs-paraméter, ezért a határon a felhasználó nyelvén jelenik meg", () => {
    const res = fieldSchema(FIELD_BY_KEY.nozzleTempMinC).safeParse(-5);
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(translateError(res.error, tHu)[0]).toMatch(/^Fúvóka.*: legalább /);
    expect(translateError(res.error, tEn)[0]).toMatch(/^Min\. nozzle temperature: at least /);
    expect(translateError(new Error(appMsg("validation.min", { field: tk("field.nozzleTempMinC"), min: 1 })), tEn)).toEqual(["Min. nozzle temperature: at least 1"]);
  });

  it("a szolgáltatások már nem magyar szöveget adnak vissza: kulcsot (deleteProfile, saveUpload)", async () => {
    const id = createProfile(profile({ sku: "I18N-DEL", colorName: "Teal" }));
    addSpool(id, noSpool);
    const r = deleteProfile(id);
    expect(r.ok).toBe(false);
    expect(r.error).toBeInstanceOf(AppError);
    expect(r.error?.key).toBe("profile.error.hasStock");
    expect(translateError(r.error, tEn)[0]).toContain("The profile has 1 spools and 0 purchase items");
    expect(deleteProfile(987654).error?.key).toBe("profile.error.notFound");

    const up = await saveUpload(id, new File([], "x.png"), "photo");
    expect(up.ok).toBe(false);
    if (!up.ok) {
      expect(translateError(up.error, tHu)).toEqual(["Üres fájl"]);
      expect(translateError(up.error, tEn)).toEqual(["Empty file"]);
    }
  });

  it("minden, a szerveren használt kulcs létezik mindkét szótárban", () => {
    for (const k of Object.keys(EN_SAMPLE)) expect(MESSAGES.en[k] ?? MESSAGES.en[`${k}_other`], k).toBeDefined();
  });
});

describe("export: a visszaolvasás nyelvfüggetlen", () => {
  let profiles = 0;
  let spoolCount = 0;
  beforeAll(() => {
    const a = createProfile(profile({ sku: "EXP-A", colorName: "Piros", nozzleTempMinC: 200 }), { nozzleTempMinC: { origin: "estimate" } });
    const b = createProfile(profile({ sku: "EXP-B", colorName: "Kék", materialFamily: "Kompozit" }));
    createPurchase({ purchasedAt: null, seller: "Teszt Bolt", orderReference: null, currency: "EUR", shippingTotal: null, discountTotal: null, orderTotal: null, sourceKind: "manual", sourceReference: null, notes: null, receivedAt: null, location: null, items: [{ profileId: a, quantity: 2, unitPrice: 20, variant: null, shippingShare: null, discountShare: null }] });
    addSpool(b, noSpool);
    profiles = 2;
    spoolCount = 3;
  });

  it("a JSON-kulcsok, mezőnevek és gépi azonosítók a nyelvtől függetlenek; csak a leíró egységszöveg fordul", () => {
    const hu = exportJson(tHu);
    const en = exportJson(makeT("en", { ...MESSAGES.en, "export.unit.purchaseCurrency": "in the purchase currency" }));
    expect(hu.units.unit_price).toBe("a vásárlás pénznemében");
    expect(en.units.unit_price).toBe("in the purchase currency");
    const strip = (x: typeof hu) => JSON.stringify({ ...x, exported_at: null, units: { ...x.units, unit_price: null } });
    expect(strip(en)).toBe(strip(hu));
    // minden profilmező snake_case gépi kulcs
    for (const k of Object.keys(hu.profiles[0].fields)) expect(k).toMatch(/^[a-z0-9_]+$/);
  });

  it("a CSV-fejlécek gépi azonosítók (nyelvfüggetlenek), és a saját CSV visszaolvasható", () => {
    const head = exportProfilesCsv().split("\r\n")[0];
    expect(head).toMatch(/^﻿?id,manufacturer,/);
    expect(head).not.toMatch(/[áéíóöőúüű]/i);
    expect(exportSpoolsCsv().split("\r\n")[0]).not.toMatch(/[áéíóöőúüű]/i);
    // a fejléc egy másik nyelven futó importban is ugyanúgy értelmeződik
    for (const t of [tHu, tEn]) {
      const rep = importProfilesCsv("manufacturer,product_name,material_family\nCsvLang,Nyelv PLA,PLA\n,,\n", t);
      expect(rep.errors).toEqual([]);
    }
  });

  it("az angolul exportált fájl magyar importban is, és fordítva, ugyanazt építi vissza", () => {
    for (const exportLocale of ["en", "hu"] as const) {
      const t = exportLocale === "en" ? tEn : tHu;
      const json = JSON.parse(JSON.stringify(exportJson(t)));
      const before = json.profiles.map((p: { fields: unknown }) => p.fields);
      // minden törlése, majd visszaolvasás a másik nyelvi beállítással
      const db = getDb();
      for (const p of json.purchases) deletePurchase(p.ref, db);
      for (const p of json.profiles) {
        const full = getProfileFull(p.ref, db);
        for (const s of full?.spools ?? []) deleteSpool(s.id, db);
        deleteProfile(p.ref, db);
      }
      setSetting("language", exportLocale === "en" ? "hu" : "en");
      const rep = importJsonExport(json, exportLocale === "en" ? tHu : tEn);
      expect(rep.errors).toEqual([]);
      expect(rep.created).toBe(json.profiles.length);
      expect(rep.created).toBeGreaterThanOrEqual(profiles);
      expect(rep.spools).toBe(json.spools.length);
      expect(json.spools.length).toBeGreaterThanOrEqual(spoolCount);
      const after = exportJson(tHu).profiles.map((p) => p.fields);
      expect(after).toEqual(before);
    }
    setSetting("language", "hu");
  });
});
