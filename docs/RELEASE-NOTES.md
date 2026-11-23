# Kiadási jegyzet – sablon / Release notes – template

Kiadás készítése / Making a release:

1. `package.json` → `version` (pl. `0.2.0`), commit, címke / tag: `v0.2.0`.
2. `npm ci --ignore-scripts && npm run package:win` (Windows x64 gépen / on a Windows x64 machine).
3. A GitHub Release-hez csatolandó fájlok / files to attach to the GitHub Release:
   - `dist/FilamentCatalog-<verzió>-win-x64.zip`
   - `dist/FilamentCatalog-<verzió>-win-x64.zip.sha256`
4. Az alábbi szöveget másold a Release leírásába, a `<…>` helyeket töltsd ki.
   Copy the text below into the Release description and fill in the `<…>` parts.

---

## Filament Catalog v<verzió>

### 🇭🇺 Magyarul

**Letöltés:** `FilamentCatalog-<verzió>-win-x64.zip` (kb. 40 MB) – Windows 10/11, 64 bit.
Nem kell telepíteni semmit: csomagold ki, és kattints duplán az `indito.bat` fájlra.

**Újdonságok**
- <…>

**Javítások**
- <…>

**Frissítés korábbi verzióról:** csomagold ki az új ZIP-et egy új mappába, és indítsd onnan.
Az adataid (`%LOCALAPPDATA%\FilamentCatalog`) megmaradnak; a régi programmappa törölhető.
Frissítés előtt érdemes az Adatkezelés oldalon biztonsági mentést letölteni.

**Windows-figyelmeztetés:** a csomag nincs digitálisan aláírva, ezért az első indításkor
megjelenhet „A Windows megvédte a számítógépet”. Kattints: *További információ → Futtatás mindenképpen*.

**Ellenőrző összeg (SHA256):** `<a .sha256 fájl tartalma>`

### 🇬🇧 English

**Download:** `FilamentCatalog-<version>-win-x64.zip` (about 40 MB) – Windows 10/11, 64-bit.
Nothing to install: extract it and double-click `indito.bat`.

**What's new**
- <…>

**Fixes**
- <…>

**Updating from an earlier version:** extract the new ZIP into a new folder and start it from there.
Your data (`%LOCALAPPDATA%\FilamentCatalog`) is kept; the old program folder can be deleted.
Before updating, consider downloading a backup on the Data page.

**Windows warning:** the package is not digitally signed, so on first start you may see
"Windows protected your PC". Click *More info → Run anyway*.

**Checksum (SHA256):** `<contents of the .sha256 file>`

macOS / Linux: nincs kész csomag, forrásból futtatható (lásd README, fejlesztői rész).
No prebuilt package; run from source (see the developer section of the README).
