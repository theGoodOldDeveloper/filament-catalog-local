FILAMENT CATALOG {{VERSION}} – Windows (64 bit)
==================================================

MAGYARUL
--------
Indítás
  1. Csomagold ki a teljes ZIP-et egy mappába (jobb gomb > Az összes kibontása).
  2. Kattints duplán az start.bat fájlra.
  3. Egy rövid ablak megjelenik, majd bezárul, és megnyílik a böngésző. Az
     alkalmazás a háttérben fut, csak a saját gépeden (127.0.0.1), internet
     és telepítés nélkül.
  4. KILÉPÉS: kattints az alkalmazás bal oldali menüjének alján a „Kilépés”
     gombra. (Ha a böngészőt csak bezárod, az alkalmazás a háttérben tovább
     fut; ilyenkor a start.bat újra megnyitja, a stop.bat leállítja.)

A Windows figyelmeztet?
  Az első indításkor megjelenhet „A Windows megvédte a számítógépet”
  (SmartScreen), mert a csomag nincs digitálisan aláírva.
  Kattints: További információ > Futtatás mindenképpen.
  Megelőzés: a kicsomagolás ELŐTT jobb gomb a ZIP-en > Tulajdonságok >
  Tiltás feloldása > OK.

Hol vannak az adataim?
  %LOCALAPPDATA%\FilamentCatalog
  (írd be ezt az Intéző címsorába; a pontos útvonalat az alkalmazás
  Adatkezelés oldala is mutatja). A programmappában nincs adat.

Mentés
  Az Adatkezelés oldalon: „Biztonsági mentés letöltése”. Teljes mentéshez
  (a feltöltött dokumentumokkal) zárd be az alkalmazást, és másold le a
  fenti mappát.

Frissítés
  Töltsd le az új ZIP-et, csomagold ki, és indítsd onnan. A régi programmappa
  törölhető; az adataid megmaradnak.

Eltávolítás
  Előbb lépj ki az alkalmazásból (vagy futtasd a stop.bat-ot), majd töröld a programmappát. Ha az adataidra sincs szükség, töröld a
  %LOCALAPPDATA%\FilamentCatalog mappát is. Más nyomot nem hagy a gépen.

Ha nem indul
  Az indító ablak kiírja az okot (a napló: %LOCALAPPDATA%FilamentCataloglauncher.log). A port foglaltsága nem gond: az alkalmazás
  magától a következő szabad portot választja ({{PORT}}-től felfelé).


ENGLISH
-------
Starting
  1. Extract the whole ZIP into a folder (right-click > Extract All).
  2. Double-click start.bat.
  3. A short window appears and closes by itself, and your browser opens. The
     app runs in the background, only on your own computer (127.0.0.1), with
     no internet connection and no installation.
  4. TO QUIT: click the "Quit" button at the bottom of the app's left menu.
     (If you only close the browser, the app keeps running in the background;
     start.bat then just reopens it, and stop.bat stops it.)

Windows shows a warning?
  On first start you may see "Windows protected your PC" (SmartScreen),
  because the package is not digitally signed.
  Click: More info > Run anyway.
  To avoid it: BEFORE extracting, right-click the ZIP > Properties >
  Unblock > OK.

Where is my data?
  %LOCALAPPDATA%\FilamentCatalog
  (paste this into the File Explorer address bar; the exact path is also
  shown on the app's Data page). The program folder holds no data.

Backup
  On the Data page: "Download backup". For a full backup (including uploaded
  documents) close the app and copy the folder above.

Updating
  Download the new ZIP, extract it and start it from there. The old program
  folder can be deleted; your data stays.

Uninstalling
  First quit the app (or run stop.bat), then delete the program folder. If you do not need your data either, also delete
  %LOCALAPPDATA%\FilamentCatalog. Nothing else is left on the computer.

If it does not start
  The launcher window tells you why (log: %LOCALAPPDATA%FilamentCataloglauncher.log). A busy port is not a problem: the app
  picks the next free port by itself (from {{PORT}} upwards).


Technikai / Technical
  Licenc / licence: MIT (LICENSE.txt). A beépített összetevők licencei /
  licences of bundled components: LICENSES-third-party.txt.
  Beépített futtató / bundled runtime: Node.js {{NODE}} (runtime\node.exe,
  licenc / license: runtime\LICENSE-node.txt).
  Haladó / advanced: FILAMENT_CATALOG_DATA_DIR, FILAMENT_CATALOG_PORT
  környezeti változók / environment variables.
