export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Összehasonlításhoz: kisbetű, ékezet nélkül, egységes szóközök és írásjelek. */
export function norm(s: string | null | undefined): string {
  if (!s) return "";
  return stripDiacritics(String(s)).toLowerCase().replace(/[^a-z0-9+]+/g, " ").trim();
}

export function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Gyártói anyagmegnevezésből anyagcsalád. Bizonytalan esetben "Egyéb". */
export function familyFromMaterial(raw: string | null | undefined): string {
  const m = stripDiacritics(String(raw ?? "")).toUpperCase();
  if (!m.trim()) return "Egyéb";
  if (/(^|[^A-Z])(CF|GF|CARBON|GLASS|KEVLAR|ARAMID)([^A-Z]|$)/.test(m) || /WOOD|METAL|MARBLE|STONE/.test(m)) return "Kompozit";
  if (/PLA\s*(\+|PLUS|PRO)|TOUGH\s*PLA/.test(m)) return "PLA+";
  if (/PLA/.test(m)) return "PLA";
  if (/PCTG/.test(m)) return "PCTG";
  if (/PETG|PET-G/.test(m)) return "PETG";
  if (/ASA/.test(m)) return "ASA";
  if (/ABS/.test(m)) return "ABS";
  if (/TPU/.test(m)) return "TPU";
  if (/TPE|TPC/.test(m)) return "TPE";
  if (/NYLON|(^|[^A-Z])(PA|PA6|PA12|PA11|PA66|PAHT|PPA)([^A-Z]|$)/.test(m)) return "PA/Nylon";
  if (/PPS/.test(m)) return "PPS";
  if (/PVA|BVOH/.test(m)) return "PVA";
  if (/PVB/.test(m)) return "PVB";
  if (/HIPS/.test(m)) return "HIPS";
  if (/(^|[^A-Z])PC([^A-Z]|$)|POLYCARBONATE/.test(m)) return "PC";
  if (/(^|[^A-Z])PP([^A-Z]|$)/.test(m)) return "PP";
  if (/(^|[^A-Z])PET([^A-Z]|$)/.test(m)) return "PET";
  return "Egyéb";
}
