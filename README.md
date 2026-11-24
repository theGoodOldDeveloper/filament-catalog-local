# Filament Catalog

**Helyben futó filament-leltár és tudástár 3D-nyomtatáshoz.** Az adataid csak a te gépeden vannak: nincs fiók, nincs felhő, és nem kell hozzá internet. Ingyenes.

Ebben a leírásban megtalálod, hogyan telepítsd és használd. A magyar rész után jön az angol.

- [Telepítés](#telepítés)
- [Használati útmutató](#használati-útmutató)
- [Kávé és PRO](#kávé-és-pro)
- [Fejlesztőknek](#fejlesztőknek)

---

## Telepítés

Rendszerkövetelmény: **Windows 10 vagy 11, 64 bites**. Nem kell telepítő, nem kell Node vagy npm, és rendszergazdai jog sem kell.

1. **Töltsd le** a legfrissebb csomagot a Releases oldalról: `https://github.com/theGoodOldDeveloper/filament-catalog-local/releases/latest`. A fájl neve `FilamentCatalog-<verzió>-win-x64.zip`, kb. 40 MB.
2. **Tiltás feloldása (ajánlott, lásd lent):** jobb gomb a ZIP-en → *Tulajdonságok* → pipa a **Tiltás feloldása** mellett → *OK*.
3. **Kicsomagolás:** jobb gomb a ZIP-en → **Az összes kibontása**. Válassz egy mappát, amit meg is tartasz (pl. `Dokumentumok`). A kicsomagolt mappa kb. 109 MB. A ZIP-en belülről az app nem indítható, az indító ezt ki is írja.
4. **Indítás:** a kicsomagolt mappában kattints duplán a `start.bat` fájlra. Egy rövid ablak megjelenik és bezárul, majd magától megnyílik a böngésző (a cím `http://127.0.0.1:3210`).
5. **Nyelv:** az első indításkor felugró ablakban válaszd ki a nyelvet (magyar vagy angol). Ez lesz az alapértelmezett minden induláskor.

**Kilépés:** kattints az alkalmazás bal oldali menüjének alján a **„Kilépés”** gombra. Az app a háttérben fut, ezért a böngészőlap bezárása nem állítja le; ilyenkor a `start.bat` újra megnyitja, a `stop.bat` pedig leállítja.

Az app csak a saját gépeden figyel (`127.0.0.1`), ezért a tűzfal nem kérdez, és más nem éri el. Ha a 3210-es port foglalt, vagy már fut egy másik példány, a következő szabad portot használja; a pontos címet megnyitáskor a böngésző mutatja.

### Windows-figyelmeztetés (SmartScreen)

A csomag nincs digitálisan aláírva, ezért az első indításkor megjelenhet a „A Windows megvédte a számítógépet” üzenet. Ez nem jelent hibát, a Windows így szól minden ismeretlen, letöltött programra.

- **Megelőzés:** a kicsomagolás előtt oldd fel a tiltást a ZIP-en (2. lépés).
- **Ha mégis megjelenik:** kattints a **További információ** feliratra, majd a **Futtatás mindenképpen** gombra.
- Ha a víruskereső blokkolja a `node.exe` fájlt, az indító egy üzenettel megáll, és nem tűnik el az ablak. A `node.exe` hivatalos, az OpenJS Foundation által aláírt Node.js. Engedélyezd a víruskeresődben, vagy tedd a mappát kivételek közé.

### Hová kerülnek az adataid?

A programmappában nincs adat. Az adataid ide kerülnek:

```
%LOCALAPPDATA%\FilamentCatalog
```

Ez általában `C:\Users\<neved>\AppData\Local\FilamentCatalog`. A mappát az app az első indításkor magától létrehozza. Itt van az adatbázis (`filament-catalog.db`) és a feltöltött dokumentumok (`uploads` mappa). A pontos útvonalat az app **Adatkezelés** oldala is mutatja („Itt vannak az adataid”).

### Mentés

- **Gyors mentés:** **Adatkezelés → Biztonsági mentés letöltése**. Ez az adatbázis teljes másolata (filamentek, tekercsek, vásárlások, beállítások), futás közben is biztonságos. A feltöltött dokumentumokat **nem** tartalmazza.
- **Teljes mentés:** lépj ki az appból (Kilépés gomb), majd másold az adatmappát (`%LOCALAPPDATA%\FilamentCatalog`) egy biztonságos helyre, például pendrive-ra.
- **Visszaállítás:** zárd be az appot. Töröld az adatmappából a `filament-catalog.db` kezdetű fájlokat, majd másold oda a mentést `filament-catalog.db` néven. Teljes mentésnél cseréld le a mappa teljes tartalmát.

### Frissítés

1. Töltsd le az új ZIP-et, és csomagold ki egy **új mappába**.
2. Indítsd onnan az `start.bat` fájlt.
3. A régi programmappát törölheted.

Az adataid megmaradnak, mert az adatmappa a programmappán kívül van.

### Eltávolítás

Töröld a programmappát. Ha az adataidat is törölni szeretnéd, töröld a `%LOCALAPPDATA%\FilamentCatalog` mappát is. Az app nem ír a rendszerbe: nincs regisztrációs bejegyzés, szolgáltatás vagy Start menü-ikon.

---

## Használati útmutató

Egy gyors áttekintés a bal oldali menüről: **Dashboard**, **Katalógus**, **Vásárlások**, **Összehasonlítás**, **Tuttirial**, **Felszerelés**, **Adatkezelés**. A jobb felső sarokban van a nyelvváltó és a **PRO** gomb.

### 1. Első indítás és nyelv

Az első indításkor a „Válassz nyelvet” ablak jelenik meg. Ez lesz az alapértelmezett nyelv minden induláskor. Később a jobb felső sarokban lévő nyelvváltóval bármikor átállíthatod.

<!-- kép: a „Válassz nyelvet” ablak -->

### 2. Állítsd be a felszerelésedet

A **Felszerelés** oldalon megadhatod a nyomtatód és a szárítód adatait. Ebből számolja az app a **Tuttirial** címkéit: minden filamenttípusnál látod, mennyire illik a géped hozzá. Minden mező elhagyható. Amit nem tudsz, hagyd üresen, az app nem talál ki értéket. Az adatok csak a gépeden tárolódnak.

**Nyomtató:**

| Mező | Mit írj ide? |
| --- | --- |
| Nyomtató típusa (neve) | A gép típusneve. Csak tájékoztató. |
| Max. fúvóka-hőmérséklet | A fúvóka legmagasabb hőfoka. A gyártó adatlapján „Max. nozzle temperature”; a legtöbb gépnél 260–300 °C. |
| Max. asztalhőmérséklet | A fűtött asztal legmagasabb hőfoka. Gyakori érték: 100–120 °C. |
| Zárt nyomtatótér (ajtó, burkolat) | Van-e ajtó vagy burkolat a nyomtatótér körül. |
| Fűthető kamra | A kamra aktív fűtése. Ha csak az asztal fűti a zárt teret, válaszd: nem. |
| Max. kamrahőmérséklet | Csak fűtött kamránál töltsd ki. Gyakori érték: 45–65 °C. |
| Fűthető fejek száma | Hány fúvóka fűthető egymástól függetlenül. A legtöbb gépnél 1. |
| Edzett (kopásálló) fúvóka | Szén- és üvegszálas anyagokhoz kell. Ha nem tudod, hagyd a „nem tudom” értéken. |
| Tárgytér | A nyomtatható tér mérete. Csak tájékoztató. |

**Szárító:**

| Mező | Mit írj ide? |
| --- | --- |
| Szárító típusa (neve) | A szárító típusneve. Csak tájékoztató. |
| Legkisebb hőfok / Legnagyobb hőfok | A beállítható hőfoktartomány. Ha csak egy hőfokon működik, a kettő megegyezik. |
| Zónák száma | Hány tekercset lehet külön hőfokkal szárítani. Egyszerű szárítónál 1. |
| Kapacitás (tekercs) | Hány tekercs fér be egyszerre. |
| Teljesítmény | Wattban. Csak tájékoztató. |

Az értékeket a gép dobozán, a típustáblán vagy a gyártó adatlapján találod. A **Mentés** gombbal mented el őket. Ha minden mezőt üresen hagysz, a mentés törli az adatokat (az **Adatok törlése** gomb is ezt teszi).

A Tuttirial a beállításod alapján négy címke egyikét adja minden anyagra:

- **Ideális a géphez**: kényelmesen belefér a gép adataiba.
- **Jól megy**: megy, de kisebb kompromisszummal.
- **Határeset**: a gép a határán jár, vagy valamelyik adat hiányzik.
- **Nem nyomtatható**: a gépeddel nem nyomtatható.

A címke mellett a **Miért?** gombbal indoklást is látsz. Ha a szárítód hőfoktartománya nem éri el egy anyag javasolt szárítási hőfokát, azt is jelzi.

<!-- kép: a Felszerelés oldal kitöltve -->

### 3. Új vásárlás hozzáadása

A vásárlás két részből áll: előbb kell egy **filament** (anyagprofil), majd erre rögzíted a **vásárlást**.

1. **Filament felvétele:** kattints a **+ Új filament** gombra. Töltsd ki, amit tudsz (gyártó, terméknév, anyagcsalád, szín…), majd **Filament létrehozása**. Ha hasonló filamentet már felvettél, az adatlapján a **Másolás** gomb egy új változatot indít a régi adataiból.
2. **Vásárlás rögzítése:** kattints a **+ Új vásárlás** gombra. Add meg az eladót, a dátumot és a pénznemet. A **+ Tétel** gombbal annyi tételt vehetsz fel, ahány terméket vettél. Minden tételnél válaszd ki a filamentet, a darabszámot és az egységárat.
3. Az ár, a szállítás és a kedvezmény megadása nem kötelező. Ami nem ismert, maradjon üresen.
4. **Vásárlás rögzítése**: minden darabból külön tekercs jön létre „Bontatlan” állapotban, saját azonosítóval.

Ha egy tekercset vásárlás nélkül szeretnél felvenni, a filament adatlapján a **Tekercs felvétele vásárlás nélkül** résznél megteheted.

A **Vásárlások** oldalon visszanézheted az eddigi vásárlásaidat, a **Katalógus** oldalon a filamentjeidet.

<!-- kép: az Új vásárlás űrlap -->

### 4. A filament paramétereinek kézi kitöltése

A filament adatlapját a **Szerkesztés** gombbal nyithatod meg. A mezők csoportokban vannak: azonosítás, szín, fizikai adatok, gyártói nyomtatási ajánlás (fúvóka-, asztal-, kamrahőfok, sebesség…), szárítás és tárolás, és így tovább.

- **Ismeretlen érték = hagyd üresen.** Az app nem tölti ki találgatással. Egy üres mezőt később is kitölthetsz.
- Minden mező mellett megadhatod az **adat eredetét**: gyártói adat, bolt, másodlagos webes forrás, saját mérés vagy becslés. Ez segít később eldönteni, mennyire bízhatsz az értékben.
- **„≈ becslés”**: a becsült értékeket az app minden helyen külön jelöli. Például a tekercs maradéka akkor lesz becslés, ha nem lemérted, hanem a használatból számolod.
- Az adatlapon a **Saját megjegyzések és tapasztalatok** részbe leírhatod, mit tapasztaltál (pl. „215 °C-on a legszebb”), a **Fotók és dokumentumok** résznél képet vagy PDF-et tölthetsz fel (JPEG, PNG, WebP vagy PDF, legfeljebb 10 MB).

### 5. A készlet csökkentése használat után („Használtam”)

Amikor nyomtattál, írd be, mennyi filamentet használtál el:

1. Nyomtatás után a szeletelő megmutatja a darab becsült tömegét grammban.
2. Keresd meg a tekercset: a filament adatlapján, vagy a **Katalógus** „Tekercsek” nézetében (a nézetet a Kártyák / Táblázat / **Tekercsek** kapcsolóval váltod).
3. Kattints a tekercs sorában a **Használtam** gombra.
4. A „Mennyit használtál fel?” ablakban írd be a **Felhasznált (g)** mezőbe a szeletelő becslését (pl. 42). A dátumot és egy megjegyzést (pl. „tartókonzol, 3 db”) is megadhatsz, de ez nem kötelező.
5. **Rögzítés**.

A maradék ekkor **becslésként (≈)** csökken. Ha a tekercs bontatlan volt, „Nyitott” állapotra vált.

**Mikor érdemes lemérni a tekercset?** A szeletelő becslése idővel eltérhet a valóságtól (kidobott anyag, sikertelen nyomtatás). Ha a készlet megbízhatóságát fontosnak tartod, időnként mérd le a tekercset konyhai vagy postai mérlegen:

1. Mérd le a tekercset filamenttel együtt.
2. Vond ki belőle az **üres tekercs tömegét**. Ezt a gyártó adatlapján találod, vagy lemérheted egy már elfogyott tekercsen. Ha felvetted, a filament adatlapján az „Üres tekercs tömege” mezőben is megvan.
3. Az eredmény a tekercs **mért maradéka**. Az adatlapon a tekercsnél az **Esemény rögzítése** résznél válaszd a „Mérés” típust, írd be a **Mért maradék (g)** mezőbe, és kattints a **Rögzítés** gombra.

Ettől kezdve a maradék mért értékként szerepel, nem becslésként.

Ugyanitt rögzíthetsz „Szárítás” és „Állapotváltás” eseményeket is, és az adatlap alján a **Változásnapló** mutatja, mi történt a profillal.

<!-- kép: a Használtam ablak -->

### 6. A Tuttirial használata és a keresés

A **Tuttirial** egy beépített filament-tudástár: minden filamenttípusról (PLA, PETG, ABS, nylon, szénszálas anyagok és még sok más) megtudhatod, mire jó, milyen paraméterekkel érdemes nyomtatni és szárítani, és mik a buktatói.

- A tudástár értékei **általános, tipikus kiinduló tartományok**, nem gyártói adatok. Konkrét tekercsnél mindig a gyártó adatlapja az elsődleges.
- A **Gépemre** oszlopban a címkék (Ideális a géphez / Jól megy / Határeset / Nem nyomtatható) a **Felszerelés** oldalon megadott adataidból számolódnak. Ha még nem adtál meg felszerelést, nincs címke, helyette egy felszólítás látszik a beállításra, és a **Szerkesztés** hivatkozás odavisz.
- **Keresés:** a keresőmezőbe névre, rövidítésre, felhasználásra vagy tulajdonságra is kereshetsz (pl. „kültér uv”, „fogaskerék”, „cf”).
- **Szűrők:** a gépre illeszkedés, a fúvóka (sima vagy edzett kell-e), a kamra (kér-e fűtött kamrát), a hőfok szerint, vagy a **csak ami van a saját készletemben** pipával.
- **Rendezés:** például **Gépre illeszkedés**, **Legkönnyebb elöl**, **Legerősebb elöl**.
- A kártyán a **Részletek** gombbal nyitod ki a nyomtatási és szárítási tippeket, a hátrányokat és a paramétereket. Ha van ilyen anyagból készleted, a **Saját … filamentjeim →** hivatkozás a katalógusba visz.

<!-- kép: a Tuttirial a címkékkel -->

### 7. Összehasonlítás

Az **Összehasonlítás** oldalon legfeljebb hat anyagot (filamentet) hasonlíthatsz össze egymás mellett.

1. Az „Anyagok kiválasztása” listában jelöld be a kívánt anyagokat. A listát a „Szűkítés” mezőben szűkítheted.
2. A táblázatban az eltérő értékek ki vannak emelve, a becslések jelölve vannak.
3. A **csak az eltérők** és az **üres sorok elrejtése** kapcsolóval átláthatóbbá teheted. A táblázat sorai között külön is kereshetsz (pl. „kamra”, „szárítás”).
4. A „Saját készlet” sorban a tekercseid mennyisége is látszik.

### 8. A katalógus nézetei és szűrői

A **Katalógus** három nézetben mutatja a filamentjeidet: **Kártyák**, **Táblázat** és **Tekercsek** (tekercsenként, tényleges árral, töltöttséggel és maradékkal). A nézetet az oldal tetején váltod.

- **Keresés:** gyártóra, névre, SKU-ra, anyagra, színre, leírásra, megjegyzésre. A keresés szótöredékre és ékezet nélkül is működik. A bal oldali menüben is van gyorskereső.
- **Szűrők:** anyag, gyártó, állapot (pl. „Készleten”, „Elfogyóban”, „Van bontatlan (zárt)”), fúvókahőfok, asztalhőfok, szárítás, kamra és más. A **További szűrők** kibontja a többit (szín, átmérő, dátum, eladó, tárhely…). A **Szűrők törlése** gombbal egy kattintással alaphelyzetbe állsz.
- **Rendezés:** például név, készlet, legutóbbi vásárlás szerint.
- Az **Elfogyóban** jelzés azokra a tekercsekre vonatkozik, amelyekből 200 g alatt maradt.

A **Dashboard** a készletedről ad pillanatképet: hány tekercs van, mennyi anyagtípusonként, mi fogy el és mik a legutóbbi beszerzések.

### 9. Adatkezelés: export, import, mentés

Az **Adatkezelés** oldalon:

- **Mentés és visszaállítás:** itt a **Biztonsági mentés letöltése** gomb és a leírás a teljes mentésről és a visszaállításról (lásd a Telepítés részt is).
- **Export:** „Anyagprofilok – CSV”, „Tekercsek / készlet – CSV” és „Teljes export – JSON”. A CSV Excelben közvetlenül megnyitható.
- **Visszaolvasás (JSON / CSV):** a fenti exportokat itt olvashatod vissza a **Fájl importálása** gombbal. A pontosan egyező profilokat nem duplikálja, tehát biztonságosan újra lefuttathatod.
- **Változásnapló:** az utolsó 60 esemény.

### 10. Demo adatok betöltése és törlése

Ha az app még üres, és szeretnéd kipróbálni, kattints a **Demo adatok betöltése** gombra. Kitalált mintatételek jönnek létre, mindegyik **DEMO** jelölést kap. Ha végeztél, az **Adatkezelés** oldalon a **Demo adatok törlése** gombbal egy kattintással eltávolítod őket. A saját adataidhoz ez nem nyúl hozzá.

A katalógus szűrői között a **DEMO rekordok elrejtése** is megtalálható.

### Gyakori kérdések

**Miért nem látok címkét (Ideális a géphez, Határeset…) a Tuttirialban?**
Mert még nem adtad meg a felszerelésed. Nyisd meg a **Felszerelés** oldalt, add meg legalább a nyomtatód max. fúvóka- és asztalhőmérsékletét, és mentsd el. A címkék ezután megjelennek.

**Elfogyott a tekercs. Mit csináljak?**
Nyisd meg a filament adatlapját, és az **Esemény rögzítése** résznél válaszd az „Állapotváltás” típust, majd az új állapot legyen „Kiürült” (vagy „Selejtezett”). A tekercs nem számít bele az aktív készletbe, de a története megmarad.

**Hova lettek az adataim?**
Az adatmappában vannak: `%LOCALAPPDATA%\FilamentCatalog`. Ha új ZIP-ből indítottad az appot, az adatok akkor is megvannak, mert az adatmappa a programmappán kívül van. A pontos útvonalat az **Adatkezelés** oldalon látod.

**A „Használtam” gombot nem találom.**
Az adatlapon a tekercseknél és a katalógus „Tekercsek” nézetében van. A Kártyák és a Táblázat nézetben nincs, mert ott egy filamenthez több tekercs is tartozhat.

**Bezártam a böngészőt, de az app fut még?**
Igen. Az app a „Kilépés” gombig (vagy a `stop.bat` futtatásáig) a háttérben fut. A böngészőt újra megnyithatod a `start.bat` fájllal, vagy a címen (alapesetben `http://127.0.0.1:3210`).

**Szükség van internetre?**
Nem. Az app semmit nem küld el magától.

---

## Kávé és PRO

Az app ingyenes. Ha tetszik, és szeretnéd támogatni, a felső sáv közepén található gomb a Ko-fi oldalamra visz: [ko-fi.com/photovegh](https://ko-fi.com/photovegh). Köszönöm!

Készül egy **PRO** verzió is (a jobb felső sarokban a **PRO** gomb mutatja, mi lesz benne, és onnan érhető el a feliratkozás egy külső űrlapon). Az ingyenes, helyi verziót nem váltja ki.

Szerző: [TheGoodOldDeveloper](https://thegoodolddeveloper.com/)

---

## Fejlesztőknek

Forrásból futtatás (Windows, macOS és Linux is így megy; Node 22 kell):

```bash
npm ci
npm run build
npm start
```

Az app a `127.0.0.1` címen indul (alapértelmezett port: 3000). Fejlesztői módban: `npm run dev`. Ha az `npm ci` fordítási hibával áll meg (nincs C++ fordító a gépen), használd az `npm ci --ignore-scripts` parancsot: az adatbázis-modul előre lefordított változata benne van a csomagban.

Egyéb parancsok:

```bash
npm test                # tesztek (vitest)
npm run typecheck       # típusellenőrzés
npm run lint            # kódstílus
npm run i18n:check      # a fordítások ellenőrzése (hiányzó kulcsok)
npm run package:win     # Windows-csomag készítése (dist/), Windows x64-en
```

A csomagkészítéshez használd az `npm ci --ignore-scripts` parancsot, majd `npm run package:win`. A kiadási sablon a [docs/RELEASE-NOTES.md](docs/RELEASE-NOTES.md) fájlban van.

Technika dióhéjban: Next.js (App Router), React, TypeScript, SQLite (`better-sqlite3` + Drizzle). Forrásból futtatva az adatok a `data/` mappába kerülnek (a `DATABASE_URL` és az `UPLOAD_DIR` környezeti változóval átirányíthatók). A Windows-csomag indítója az adatmappát a `FILAMENT_CATALOG_DATA_DIR` változóval állítja.

**Licenc:** [MIT](LICENSE) – szabadon használható, módosítható és terjeszthető, garancia nélkül.


<!-- ENGLISH-SECTION-BELOW -->

# English

**A local, offline filament inventory and knowledge base for 3D printing.** Your data stays on your computer: there is no account, no cloud, and no internet connection is needed. It is free.

This guide shows you how to install and use it. The English part follows the Hungarian one.

- [Installation](#installation)
- [User guide](#user-guide)
- [Coffee and PRO](#coffee-and-pro)
- [For developers](#for-developers)

---

## Installation

Requirements: **Windows 10 or 11, 64-bit**. No installer is needed, you don't need Node or npm, and you don't need administrator rights.

1. **Download** the latest package from the Releases page: `https://github.com/theGoodOldDeveloper/filament-catalog-local/releases/latest`. The file name is `FilamentCatalog-<version>-win-x64.zip`, about 40 MB.
2. **Unblock (recommended, see below):** right-click the ZIP → *Properties* → tick **Unblock** next to the checkbox → *OK*.
3. **Extract:** right-click the ZIP → **Extract All**. Choose a folder you will keep (e.g. `Documents`). The extracted folder is about 109 MB. The app cannot be started from inside the ZIP; the launcher tells you so.
4. **Start:** in the extracted folder, double-click `start.bat`. A short window appears and closes, and then the browser opens by itself (the address is `http://127.0.0.1:3210`).
5. **Language:** on the first start, choose your language (Hungarian or English) in the pop-up window. This becomes the default every time you start the app.

**Quitting:** click the **"Quit"** button at the bottom of the app's left menu. The app runs in the background, so closing the browser tab does not stop it; `start.bat` then just reopens it, and `stop.bat` stops it.

The app only listens on your own computer (`127.0.0.1`), so the firewall will not ask, and nobody else can reach it. If port 3210 is busy, or another copy is already running, the app uses the next free port; the browser shows the exact address when it opens.

### Windows warning (SmartScreen)

The package is not digitally signed, so on the first start you may see the message “Windows protected your PC”. This is not an error: Windows shows it for every unknown, downloaded program.

- **Prevention:** before extracting, unblock the ZIP (step 2).
- **If it still appears:** click **More info**, then **Run anyway**.
- If your antivirus blocks `node.exe`, the launcher stops with a message and the window does not disappear. `node.exe` is the official Node.js, signed by the OpenJS Foundation. Allow it in your antivirus, or add the folder to its exclusions.

### Where is your data?

The program folder holds no data. Your data is stored here:

```
%LOCALAPPDATA%\FilamentCatalog
```

This is usually `C:\Users\<your name>\AppData\Local\FilamentCatalog`. The app creates the folder by itself on the first start. It holds the database (`filament-catalog.db`) and the uploaded documents (the `uploads` folder). The **Data** page also shows the exact path (“Your data is here (this folder is on your computer)”).

### Backup

- **Quick backup:** **Data → Download backup**. This is a full copy of the database (filaments, spools, purchases, settings), and it is safe to do while the app is running. It does **not** include uploaded documents.
- **Full backup:** quit the app (Quit button), then copy the data folder (`%LOCALAPPDATA%\FilamentCatalog`) to a safe place, for example a USB stick.
- **Restore:** close the app. Delete the `filament-catalog.db` files from the data folder, then copy your backup into it and name it `filament-catalog.db`. For a full backup, replace the entire contents of the folder.

### Update

1. Download the new ZIP and extract it into a **new folder**.
2. Start `start.bat` from there.
3. You can delete the old program folder.

Your data is kept, because the data folder is outside the program folder.

### Uninstall

Delete the program folder. If you also want to delete your data, delete the `%LOCALAPPDATA%\FilamentCatalog` folder too. The app does not write to the system: there is no registry entry, no service, and no Start menu icon.

---

## User guide

A quick overview of the left-hand menu: **Dashboard**, **Catalog**, **Purchases**, **Compare**, **Tuttirial**, **Equipment**, **Data**. The language switcher and the **PRO** button are in the top-right corner.

### 1. First start and language

On the first start, the “Choose your language” window appears. This becomes the default language every time you start the app. You can change it later at any time with the language switcher in the top-right corner.

<!-- image: the “Choose your language” window -->

### 2. Set up your equipment

On the **Equipment** page you can enter the details of your printer and your dryer. The app uses them to calculate the **Tuttirial** labels: for every filament type you can see how well it suits your machine. Every field is optional. If you don't know a value, leave it empty; the app never makes up a value. The data is stored only on your computer.

**Printer:**

| Field | What to enter? |
| --- | --- |
| Printer model (name) | The model name of the machine. For reference only. |
| Max. nozzle temperature | The highest temperature of the nozzle. On the manufacturer's spec sheet it is called “Max. nozzle temperature”; on most machines it is 260–300 °C. |
| Max. bed temperature | The highest temperature of the heated bed. A common value is 100–120 °C. |
| Enclosed build space (door, housing) | Whether the build area has a door or a housing around it. |
| Heated chamber | Active heating of the chamber. If only the bed heats the enclosed space, choose: no. |
| Max. chamber temperature | Fill in only for a heated chamber. A common value is 45–65 °C. |
| Number of heated toolheads | How many nozzles can be heated independently. On most machines this is 1. |
| Hardened (wear-resistant) nozzle | Needed for carbon-fibre and glass-fibre materials. If you don't know, leave it at the “don't know” value. |
| Build volume | The size of the printable area. For reference only. |

**Dryer:**

| Field | What to enter? |
| --- | --- |
| Dryer model (name) | The model name of the dryer. For reference only. |
| Minimum / Maximum temperature | The adjustable temperature range. If it only works at one temperature, the two are the same. |
| Number of zones | How many spools can be dried at different temperatures. For a simple dryer, 1. |
| Capacity (spools) | How many spools fit in at the same time. |
| Power | In watts. For reference only. |

You can find the values on the machine's box, on its rating plate, or on the manufacturer's spec sheet. Save them with the **Save** button. If you leave every field empty and save, the data is deleted (the **Clear details** button does the same).

Based on your settings, the Tuttirial gives every material one of four labels:

- **Ideal for your printer**: fits comfortably within your machine's data.
- **Prints well**: it prints, with a small compromise.
- **Borderline**: your machine is at its limit, or some data is missing.
- **Not printable**: your machine cannot print it.

Next to the label, the **Why?** button shows the reasons. If your dryer's temperature range does not reach a material's recommended drying temperature, it also tells you.

<!-- image: the Equipment page filled in -->

### 3. Add a new purchase

A purchase has two parts: first you need a **filament** (a material profile), then you record the **purchase** for it.

1. **Add a filament:** click **+ New filament**. Fill in what you know (manufacturer, product name, material family, colour…), then click **Create filament**. If you have already added a similar filament, the **Copy** button on its data sheet starts a new version from the old data.
2. **Record a purchase:** click **+ New purchase**. Enter the seller, the date and the currency. With **+ Item** you can add as many items as you bought. For each item, choose the filament, the quantity and the unit price.
3. Entering the price, shipping and discount is optional. What you don't know can stay empty.
4. **Record purchase**: each piece becomes a separate spool in “Sealed” state, with its own ID.

If you want to add a spool without a purchase, you can do so in the **Add spool without a purchase** section on the filament's data sheet.

On the **Purchases** page you can look back at your past purchases, and on the **Catalog** page at your filaments.

<!-- image: the New purchase form -->

### 4. Fill in the filament parameters by hand

You can open a filament's data sheet with the **Edit** button. The fields are grouped: identification, colour, physical properties, manufacturer print recommendation (nozzle, bed and chamber temperature, speed…), drying and storage, and so on.

- **Unknown value = leave it empty.** The app does not fill it in by guessing. You can fill in an empty field later.
- For every field you can record the **origin of the data**: manufacturer data, shop, secondary web source, your own measurement, or an estimate. This helps you decide later how much you can trust the value.
- **“≈ estimate”**: the app marks estimated values separately everywhere. For example, a spool's remaining amount is an estimate if you calculate it from usage instead of weighing it.
- On the data sheet, you can describe what you experienced in the **Your own notes and experience** section (e.g. “best at 215 °C”). In the **Photos and documents** section you can upload an image or a PDF (JPEG, PNG, WebP or PDF, up to 10 MB).

### 5. Reduce the stock after use (“I used some”)

When you have printed something, enter how much filament you used:

1. After printing, your slicer shows the estimated weight of the part in grams.
2. Find the spool: on the filament's data sheet, or in the **Catalog** “Spools” view (you switch views with the Cards / Table / **Spools** toggle).
3. Click the **I used some** button in the spool's row.
4. In the “How much did you use?” window, enter the slicer's estimate in the **Used (g)** field (e.g. 42). You can also add a date and a note (e.g. “holder bracket, 3 pcs”), but this is optional.
5. Click **Log it**.

The remaining amount then goes down as an **estimate (≈)**. If the spool was sealed, it changes to “Open”.

**When is it worth weighing the spool?** The slicer's estimate can drift from reality over time (discarded material, failed prints). If you want your stock to be reliable, weigh the spool from time to time on a kitchen or postal scale:

1. Weigh the spool together with the filament.
2. Subtract the **empty spool weight**. You can find it on the manufacturer's data sheet, or weigh an empty spool yourself. If you have entered it, it is also on the filament's data sheet in the “Empty spool weight” field.
3. The result is the spool's **measured remaining amount**. On the data sheet, in the **Record event** section for the spool, choose the “Measurement” type, enter the value in the **Measured remaining (g)** field, and click **Record**.

From then on, the remaining amount is shown as a measured value, not as an estimate.

Here you can also record “Drying” and “Status change” events, and at the bottom of the data sheet the **Change log** shows what has happened to the profile.

<!-- image: the I used some window -->

### 6. Using the Tuttirial and searching

The **Tuttirial** is a built-in filament knowledge base: for every filament type (PLA, PETG, ABS, nylon, carbon-fibre materials and many more) you can learn what it is good for, which settings work best for printing and drying, and what the pitfalls are.

- The values in the knowledge base are **general, typical starting ranges**, not manufacturer data. For a specific spool, the manufacturer's data sheet always comes first.
- In the **My printer** column, the labels (Ideal for your printer / Prints well / Borderline / Not printable) are calculated from the details you entered on the **Equipment** page. If you have not entered any equipment details yet, there is no label, and instead a prompt to set them up appears, with an **Edit** link that takes you there.
- **Search:** in the search box you can search by name, abbreviation, use or property (e.g. “outdoor uv”, “gear”, “cf”).
- **Filters:** fits my machine, nozzle (whether it must be hardened or not), enclosure (whether it needs a heated chamber), by temperature, or the **only what's in my own stock** tick box.
- **Sorting:** for example **Fits my machine**, **Easiest first**, **Strongest first**.
- On the card, the **Details** button opens the printing and drying tips, the drawbacks and the parameters. If you have stock of that material, the **My … filaments →** link takes you to the catalog.

<!-- image: the Tuttirial with labels -->

### 7. Compare

On the **Compare** page you can compare up to six materials (filaments) side by side.

1. In the “Choose materials” list, tick the materials you want. You can narrow the list in the “Filter” field.
2. In the table, differing values are highlighted, and estimates are marked.
3. With the **differences only** and **hide empty rows** switches, you can make the table easier to read. You can also search among the table rows separately (e.g. “chamber”, “drying”).
4. In the “My stock” row, you can see how many spools you have.

### 8. Catalog views and filters

The **Catalog** shows your filaments in three views: **Cards**, **Table** and **Spools** (spool by spool, with the actual price, fill level and remaining amount). You switch the view at the top of the page.

- **Search:** by manufacturer, name, SKU, material, colour, description or note. The search works with word fragments and without accents. There is also a quick search in the left-hand menu.
- **Filters:** material, manufacturer, state (e.g. “In stock”, “Running low”, “Has sealed (unopened) spools”), nozzle temperature, bed temperature, drying, chamber and more. **More filters** expands the rest (colour, diameter, date, seller, location, …). The **Clear filters** button resets everything with one click.
- **Sorting:** for example by name, stock or latest purchase.
- The **Running low** label applies to spools with less than 200 g left.

The **Dashboard** gives you a snapshot of your stock: how many spools you have, how much of each material type, what is running low, and your latest purchases.

### 9. Data management: export, import, backup

On the **Data** page:

- **Backup and restore:** here you find the **Download backup** button and the description of full backup and restore (see also the Installation section).
- **Export:** “Material profiles – CSV”, “Spools / stock – CSV” and “Full export – JSON”. The CSV files can be opened directly in Excel.
- **Import (JSON / CSV):** you can import the exports above back here with the **Import file** button. Exactly matching profiles are not duplicated, so it is safe to run the import again.
- **Change log:** the last 60 events.

### 10. Load and remove demo data

If the app is still empty and you want to try it out, click the **Load demo data** button. Invented sample items are created, and each one is marked **DEMO**. When you are done, use the **Remove demo data** button on the **Data** page to remove them with one click. Your own data is not touched.

In the catalog filters you will also find **Hide DEMO records**.

### Frequently asked questions

**Why don't I see labels (Ideal for your printer, Borderline…) in the Tuttirial?**
Because you haven't entered your equipment yet. Open the **Equipment** page, enter at least your printer's max. nozzle and bed temperature, and save. The labels will then appear.

**The spool has run out. What should I do?**
Open the filament's data sheet, and in the **Record event** section choose the “Status change” type, then set the new state to “Empty” (or “Discarded”). The spool no longer counts towards your active stock, but its history is kept.

**Where did my data go?**
It is in the data folder: `%LOCALAPPDATA%\FilamentCatalog`. If you started the app from a new ZIP, your data is still there, because the data folder is outside the program folder. You can see the exact path on the **Data** page.

**I can't find the “I used some” button.**
It is on the spool rows of the filament data sheet and in the **Spools** view of the catalog. It is not in the Cards and Table views, because there one filament can have several spools.

**I closed the browser, but is the app still running?**
Yes. The app runs in the background until you click "Quit" (or run `stop.bat`). You can reopen the browser with `start.bat`, or at the address (usually `http://127.0.0.1:3210`).

**Do I need internet?**
No. The app does not send anything on its own.

---

## Coffee and PRO

The app is free. If you like it and want to support it, the button in the middle of the top bar takes you to my Ko-fi page: [ko-fi.com/photovegh](https://ko-fi.com/photovegh). Thank you!

A **PRO** version is also in the works (the **PRO** button in the top-right corner shows what it will include, and from there you can sign up via an external form). It does not replace the free, local version.

Author: [TheGoodOldDeveloper](https://thegoodolddeveloper.com/)

---

## For developers

Running from source (works on Windows, macOS and Linux; Node 22 required):

```bash
npm ci
npm run build
npm start
```

The app starts on the address `127.0.0.1` (default port: 3000). For development mode: `npm run dev`. If `npm ci` stops with a compile error (no C++ compiler on the machine), use `npm ci --ignore-scripts`: the prebuilt version of the database module is included in the package.

Other commands:

```bash
npm test                # tests (vitest)
npm run typecheck       # type checking
npm run lint            # code style
npm run i18n:check      # check translations (missing keys)
npm run package:win     # build the Windows package (dist/), on Windows x64
```

To build the package, use `npm ci --ignore-scripts`, then `npm run package:win`. The release template is in [docs/RELEASE-NOTES.md](docs/RELEASE-NOTES.md).

The stack in brief: Next.js (App Router), React, TypeScript, SQLite (`better-sqlite3` + Drizzle). When run from source, the data goes to the `data/` folder (you can redirect it with the `DATABASE_URL` and `UPLOAD_DIR` environment variables). The Windows package launcher sets the data folder with the `FILAMENT_CATALOG_DATA_DIR` variable.

**Licence:** [MIT](LICENSE) – free to use, modify and distribute, without warranty.

