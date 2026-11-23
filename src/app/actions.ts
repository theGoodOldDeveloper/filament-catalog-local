"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AppError, appMsg, translateError } from "@/i18n/errors";
import { getT } from "@/i18n/server";
import { FIELDS, ORIGINS, type Origin } from "@/lib/fields";
import { loadDemo, removeDemo } from "@/server/demo";
import { importJsonExport, importProfilesCsv } from "@/server/export";
import {
  addNote, addSource, clearProvenance, createProfile, deleteNote, deletePrintProfile, deleteProfile, deleteSource, parseSettingsText,
  savePrintProfile, specInputSchema, updateProfile, type ProfileValues, type ProvenanceMap, type SpecInput,
} from "@/server/profiles";
import { addSpool, addSpoolEvent, createPurchase, deletePurchase, deleteSpool, updateSpool } from "@/server/stock";
import { deleteDocument, saveUpload, type DocKind } from "@/server/uploads";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const int = (fd: FormData, k: string) => {
  const n = Number(str(fd, k));
  if (!Number.isInteger(n) || n <= 0) throw new AppError("error.invalidId");
  return n;
};
/** A HATÁR: az elkapott hibát itt fordítjuk a felhasználó nyelvére (AppError, Zod appMsg). */
const zmsg = async (e: unknown) => translateError(e, (await getT()).t);
const back = (path: string, kind: "ok" | "err", msg: string, hash = ""): never =>
  redirect(`${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}${hash}`);

/** Kis űrlapok közös hibakezelése: hiba esetén visszairányít az üzenettel. `okKey`: a sikerüzenet szótári kulcsa. */
async function guard(path: string, hash: string, okKey: string, fn: () => void) {
  const { t } = await getT();
  let err: string | null = null;
  try {
    fn();
  } catch (e) {
    err = (await zmsg(e)).join(" · ");
  }
  revalidatePath("/", "layout");
  back(path, err ? "err" : "ok", err ?? t(okKey), hash);
}

// ---- anyagprofil ------------------------------------------------------------------------

export interface FormState { errors: string[]; values?: Record<string, string> }

export async function saveProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") raw[k] = v;
  const idRaw = str(fd, "id");
  const values: ProfileValues = {};
  const prov: ProvenanceMap = {};
  for (const f of FIELDS) {
    values[f.key] = str(fd, `f.${f.key}`);
    const o = str(fd, `o.${f.key}`);
    if ((ORIGINS as readonly string[]).includes(o)) prov[f.key] = { origin: o as Origin };
  }
  let id: number;
  try {
    let specs: SpecInput[] = [];
    const parsedSpecs = z.array(specInputSchema).max(80).safeParse(JSON.parse(str(fd, "specs") || "[]"));
    if (!parsedSpecs.success) return { errors: [(await getT()).t("profile.error.invalidSpecs")], values: raw };
    specs = parsedSpecs.data;
    if (idRaw) {
      id = Number(idRaw);
      updateProfile(id, values, prov, { specs });
      // az űrlapon „nincs megadva”-ra állított eredetjelölést töröljük
      clearProvenance(id, FIELDS.filter((f) => !prov[f.key]).map((f) => f.key));
    } else {
      id = createProfile(values, prov, { specs });
    }
  } catch (e) {
    return { errors: await zmsg(e), values: raw };
  }
  revalidatePath("/", "layout");
  redirect(`/filaments/${id}?ok=${encodeURIComponent((await getT()).t("profile.saved"))}`);
}

export async function deleteProfileAction(fd: FormData) {
  const id = int(fd, "id");
  const { t } = await getT();
  const r = deleteProfile(id);
  revalidatePath("/", "layout");
  if (!r.ok) back(`/filaments/${id}`, "err", r.error ? translateError(r.error, t)[0] : t("profile.error.notDeletable"));
  back("/catalog", "ok", t("profile.deleted"));
}

export async function addNoteAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#jegyzetek", "note.added", () => addNote(id, { body: str(fd, "body"), notedAt: str(fd, "notedAt") || new Date().toISOString().slice(0, 10) }));
}
export async function deleteNoteAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#jegyzetek", "note.deleted", () => deleteNote(id, int(fd, "noteId")));
}

export async function addSourceAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#forrasok", "source.added", () =>
    addSource(id, {
      url: str(fd, "url"), title: str(fd, "title"), sourceType: str(fd, "sourceType") as "manufacturer",
      retrievedAt: str(fd, "retrievedAt"), excerpt: str(fd, "excerpt"),
      fields: str(fd, "fields").split(",").map((s) => s.trim()).filter(Boolean),
    }));
}
export async function deleteSourceAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#forrasok", "source.deleted", () => deleteSource(id, int(fd, "sourceId")));
}

export async function savePrintProfileAction(fd: FormData) {
  const id = int(fd, "profileId");
  const ppId = str(fd, "printProfileId") ? int(fd, "printProfileId") : undefined;
  await guard(`/filaments/${id}`, "#profilok", "printProfile.saved", () =>
    savePrintProfile(id, {
      name: str(fd, "name"), slicer: str(fd, "slicer"), printer: str(fd, "printer"), nozzleDiameterMm: str(fd, "nozzleDiameterMm"),
      nozzleMaterial: str(fd, "nozzleMaterial"), version: str(fd, "version"), notes: str(fd, "notes"),
      origin: (str(fd, "origin") || "own") as Origin, settings: parseSettingsText(str(fd, "settings")),
    }, ppId));
}
export async function deletePrintProfileAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#profilok", "printProfile.deleted", () => deletePrintProfile(id, int(fd, "printProfileId")));
}

// ---- tekercsek --------------------------------------------------------------------------

const spoolFields = (fd: FormData) => ({
  status: (str(fd, "status") || "sealed") as "sealed", initialWeightG: str(fd, "initialWeightG"), remainingG: str(fd, "remainingG"),
  remainingOrigin: str(fd, "remainingOrigin"), receivedAt: str(fd, "receivedAt"), openedAt: str(fd, "openedAt"),
  location: str(fd, "location"), storageMethod: str(fd, "storageMethod"), moistureState: str(fd, "moistureState"), notes: str(fd, "notes"),
});

export async function addSpoolAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#keszlet", "spool.added", () => addSpool(id, spoolFields(fd)));
}
export async function updateSpoolAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#keszlet", "spool.updated", () => updateSpool(int(fd, "spoolId"), spoolFields(fd)));
}
export async function deleteSpoolAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#keszlet", "spool.deleted", () => deleteSpool(int(fd, "spoolId")));
}
/** A katalógusból indított űrlap oda tér vissza (csak /catalog és szűrő-paraméterei engedettek). */
const SAFE_RETURN = /^\/catalog(\?[A-Za-z0-9_=&%.,+-]*)?$/;

export async function addSpoolEventAction(fd: FormData) {
  const id = int(fd, "profileId");
  const ret = str(fd, "returnTo");
  const toCatalog = SAFE_RETURN.test(ret);
  await guard(toCatalog ? ret : `/filaments/${id}`, toCatalog ? "" : "#keszlet", "spool.eventAdded", () =>
    addSpoolEvent(int(fd, "spoolId"), {
      type: str(fd, "type") as "measure", at: str(fd, "at") || new Date().toISOString().slice(0, 10), remainingG: str(fd, "remainingG"), usedG: str(fd, "usedG"),
      isEstimate: str(fd, "isEstimate"), dryTempC: str(fd, "dryTempC"), dryHours: str(fd, "dryHours"), newStatus: str(fd, "newStatus"), note: str(fd, "note"),
    }));
}

// ---- vásárlás ---------------------------------------------------------------------------

export async function createPurchaseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") raw[k] = v;
  try {
    const items = z.array(z.object({ profileId: z.coerce.number().int().positive(appMsg("purchase.error.pickProfile")), variant: z.string(), quantity: z.string(), unitPrice: z.string(), shippingShare: z.string(), discountShare: z.string() })).parse(JSON.parse(str(fd, "items") || "[]"));
    createPurchase({
      purchasedAt: str(fd, "purchasedAt"), seller: str(fd, "seller"), orderReference: str(fd, "orderReference"), currency: str(fd, "currency") || "HUF",
      shippingTotal: str(fd, "shippingTotal"), discountTotal: str(fd, "discountTotal"), orderTotal: str(fd, "orderTotal"), sourceKind: "manual", sourceReference: null,
      notes: str(fd, "notes"), receivedAt: str(fd, "receivedAt"), location: str(fd, "location"), items,
    });
  } catch (e) {
    return { errors: await zmsg(e), values: raw };
  }
  revalidatePath("/", "layout");
  redirect(`/purchases?ok=${encodeURIComponent((await getT()).t("purchase.created"))}`);
}

export async function deletePurchaseAction(fd: FormData) {
  await guard("/purchases", "", "purchase.deleted", () => deletePurchase(int(fd, "id")));
}

// ---- dokumentumok -----------------------------------------------------------------------

export async function uploadAction(fd: FormData) {
  const id = int(fd, "profileId");
  const { t } = await getT();
  const file = fd.get("file");
  let err: string | null = null;
  if (!(file instanceof File)) err = t("common.noFile");
  else {
    const r = await saveUpload(id, file, str(fd, "kind") as DocKind);
    if (!r.ok) err = translateError(r.error, t)[0];
  }
  revalidatePath(`/filaments/${id}`);
  back(`/filaments/${id}`, err ? "err" : "ok", err ?? t("upload.done"), "#dokumentumok");
}
export async function deleteDocumentAction(fd: FormData) {
  const id = int(fd, "profileId");
  await guard(`/filaments/${id}`, "#dokumentumok", "document.deleted", () => deleteDocument(id, int(fd, "documentId")));
}

/** Saját JSON export vagy CSV visszaolvasása. */
export async function importFileAction(fd: FormData) {
  const { t } = await getT();
  const file = fd.get("file");
  let msg = "";
  let kind: "ok" | "err" = "ok";
  if (!(file instanceof File) || file.size === 0) {
    kind = "err";
    msg = t("common.noFile");
  } else if (file.size > 20 * 1024 * 1024) {
    kind = "err";
    msg = t("data.import.tooLarge");
  } else {
    const text = await file.text();
    try {
      const r = /\.csv$/i.test(file.name) ? { ...importProfilesCsv(text, t), spools: 0, purchases: 0 } : importJsonExport(JSON.parse(text), t);
      const counts = { created: r.created, purchases: r.purchases, spools: r.spools, skipped: r.skipped };
      msg = r.errors.length ? t("data.import.summaryWithErrors", { ...counts, count: r.errors.length, list: r.errors.slice(0, 3).join(" | ") }) : t("data.import.summary", counts);
      if (r.created === 0 && r.errors.length) kind = "err";
    } catch {
      kind = "err";
      msg = t("data.import.unreadable");
    }
  }
  revalidatePath("/", "layout");
  back("/data", kind, msg);
}

// ---- DEMO adatok -------------------------------------------------------------------------

/** Demo adatok betöltése az üres állapotból (kitalált, DEMO jelölésű tételek). */
export async function loadDemoAction() {
  await guard("/catalog", "", "demo.loaded", () => void loadDemo());
}

/** Az összes DEMO tétel törlése (a saját adatokhoz nem nyúl). */
export async function removeDemoAction() {
  await guard("/data", "", "demo.removed", () => removeDemo());
}
