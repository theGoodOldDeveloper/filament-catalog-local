// Tuttirial – filament-tudástár. Általános, tipikus KIINDULÓ értékek – nem gyártói adatok;
// a konkrét tekercs gyártói adatlapja mindig elsődleges.
//
// Ez a fájl a MAGYAR FORRÁS. A követelmények (nozzle, bed, chamber, chamberMode, hardened, dry) adatok;
// a gépre illeszkedés NEM itt van, hanem számított: computeFit(requirementsOf(e), felszerelés) – src/lib/fit.ts.
// Angol szöveg: src/data/tuttirial.en.json (overlay), nyelv szerinti nézet: src/data/tuttirial-i18n.ts.
// A szövegek gépfüggetlenek: nem hivatkoznak konkrét nyomtatóra vagy szárítóra, hanem feltételesen fogalmaznak
// („fűtött kamrás gépen…”, „zárt, de fűtetlen gépben…”, „ha a szárítód eléri…”).

import type { ChamberMode, FitRequirements } from "@/lib/fit";

export const GROUPS = [
  { id: "basic", label: "Alapvető és kezdőbarát filamentek", short: "Alap", color: "#4ade80", blurb: "PLA, PETG és változataik – a legtöbb nyomat ezekből készül. Fűtött kamra nélkül, nyitott ajtóval mennek a legjobban." },
  { id: "engineering", label: "Mérnöki és nagy teherbírású filamentek", short: "Mérnöki", color: "#ff8a3d", blurb: "ABS/ASA, nylonok, polikarbonát, szálerősített kompozitok. Itt számít igazán a fűtött kamra és a szárító." },
  { id: "flexible", label: "Rugalmas és speciális filamentek", short: "Rugalmas / spec.", color: "#f472b6", blurb: "TPU-k, oldható és letörhető támaszanyagok, különleges célanyagok. A több önálló fej itt adja a legtöbbet." },
] as const;
export type GroupId = (typeof GROUPS)[number]["id"];

export type { ChamberMode };
export const CHAMBER_LABEL: Record<ChamberMode, string> = {
  open: "Kamrafűtés KI, ajtó/fedél nyitva",
  off: "Kamrafűtés KI, ajtó zárva lehet",
  optional: "Kamrafűtés opcionális",
  recommended: "Fűtött kamra ajánlott",
  required: "Fűtött kamra kötelező",
};

export interface TutEntry {
  id: string;
  name: string;
  aliases: string[];
  group: GroupId;
  sub: string;
  /** a saját katalógus anyagcsaládja (készlet-hivatkozáshoz) */
  family: string;
  summary: string;
  uses: string[];
  props: string[];
  cons: string[];
  nozzle: [number, number];
  bed: [number, number];
  chamber: [number, number] | null;
  chamberMode: ChamberMode;
  fan: [number, number];
  speed: string;
  /** javasolt szárítás: hőfok (°C), min–max idő (óra); 0 óra = nem kell szárítani */
  dry: [number, number, number];
  hardened: boolean;
  nozzleDia: string;
  plate: string;
  hdt: string;
  /** 1–5: könnyű nyomtathatóság, szilárdság, hőállóság, rugalmasság, nedvességérzékenység */
  r: [number, number, number, number, number];
  /** nyomtatási tippek – gépfüggetlenül, feltételesen fogalmazva */
  printTips: string;
  /** szárítási tippek – gépfüggetlenül */
  dryTips: string;
  tags: string[];
}

type Extra = Pick<TutEntry, "summary" | "uses" | "props" | "cons" | "speed" | "plate" | "hdt" | "printTips" | "dryTips" | "tags"> & { aliases?: string[]; nozzleDia?: string };

const PEI = "Texturált PEI";
const E: TutEntry[] = [];
function add(
  group: GroupId, sub: string, id: string, name: string, family: string,
  nozzle: [number, number], bed: [number, number], chamber: [number, number] | null, chamberMode: ChamberMode,
  fan: [number, number], dry: [number, number, number], hardened: boolean, r: TutEntry["r"], x: Extra,
) {
  E.push({ group, sub, id, name, family, nozzle, bed, chamber, chamberMode, fan, dry, hardened, r, aliases: x.aliases ?? [], nozzleDia: x.nozzleDia ?? (hardened ? "0,4 mm edzett (ajánlott 0,6)" : "0,2–0,8 mm"), ...x });
}

const PLA_OPEN = "Zárt gépben a PLA könnyen megszorul a hidegoldalon (heat creep): kamrafűtés KI, ajtó és felső fedél nyitva, a kamra maradjon 35 °C alatt.";
const DRY_PLA = "50 °C – ennél melegebben a tekercs meglágyulhat. Ha a szárítód legkisebb fokozata 50 °C fölött van, rövidebb ideig, felügyelettel szárítsd. Kétzónás szárítóban a másik zónában mehet mellette melegebbet kérő anyag.";
const HARD = "Abrazív: csak edzett acél (vagy keményebb) fúvókával és fogaskerékkel – ellenőrizd, hogy a használt fúvóka és fogaskerék edzett-e.";
const MULTI = "Ha a gépnek több önálló feje van, öblítési hulladék nélkül kombinálható más anyaggal; egyfejes gépen váltáskor öblítés kell.";

// ───────────────────────── 1. ALAPVETŐ ÉS KEZDŐBARÁT ─────────────────────────
let S = "Alap anyagok";
add("basic", S, "pla", "PLA", "PLA", [190, 230], [45, 65], null, "open", [80, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["PLA Basic", "rPLA", "politejsav", "polylactic acid"],
  summary: "A legkönnyebben nyomtatható, méretpontos, szagtalan alapanyag. Merev, de rideg és hőre érzékeny.",
  uses: ["prototípusok, makettek", "dísztárgyak, játékok", "beltéri tartók, szervezők", "sablonok, mérőidomok"],
  props: ["nagyon kis zsugorodás, alig vetemedik", "éles részletek, szép felület", "merev (kb. 50–60 MPa szakítószilárdság)", "biológiai eredetű alapanyag"],
  cons: ["kb. 55 °C fölött lágyul (autóban, napon deformálódik)", "rideg, ütésre törik", "kültéren, UV-ben öregszik"],
  speed: "60–300 mm/s (külső fal 60–200)", plate: `${PEI} vagy sima PEI`, hdt: "≈ 55 °C",
  printTips: "Nyitott gépen gond nélkül megy. Zárt gépben könnyen megszorul a hidegoldalon (heat creep): a kamrafűtés maradjon KI, az ajtó és a felső fedél legyen nyitva, a belső tér maradjon 35 °C alatt. Asztal 55–60 °C, az első réteg után 100% hűtés.",
  dryTips: "50 °C, 4–6 óra – ennél melegebben a tekercs meglágyulhat. Ha a szárítód legkisebb fokozata 50 °C fölött van, rövidebb ideig, felügyelettel szárítsd. Többzónás szárítóban a másik zónában mehet mellette melegebbet kérő anyag.",
  tags: ["kezdőbarát", "beltér", "olcsó", "részletgazdag"],
});
add("basic", S, "petg", "PETG", "PETG", [230, 260], [70, 85], null, "off", [30, 60], [65, 6, 8], false, [4, 3, 2, 2, 3], {
  aliases: ["PET-G", "rPETG", "kopoliészter"],
  summary: "Szívós, vegyszer- és nedvességálló hétköznapi funkcionális anyag; a PLA és az ABS közötti arany középút.",
  uses: ["funkcionális alkatrészek, konzolok", "kültéri kisebb elemek", "folyadékkal érintkező tárgyak, kaspók", "gépburkolatok"],
  props: ["jó rétegtapadás, szívós (nem rideg)", "kb. 70 °C-ig hőálló", "jó vegyszerállóság", "kis zsugorodás"],
  cons: ["szálazásra hajlamos, nedvesen különösen", "sima PEI-re túl erősen tapadhat", "puhább, karcolódik", "hidak, túlnyúlások gyengébbek, mint PLA-val"],
  speed: "50–200 mm/s", plate: `${PEI}; sima PEI-n ragasztóstift LEVÁLASZTÓKÉNT`, hdt: "≈ 68–72 °C",
  printTips: "Nyitott gépen huzatmentes helyen gond nélkül megy. Fűtött kamrás gépen a kamrafűtés maradjon KI; zárt gépben csukott ajtóval is mehet, de ha a belső tér 45 °C fölé melegszik, nyiss rá. Hűtés 30–60%, hidaknál több.",
  dryTips: "65 °C, 6–8 óra – a szálazás legtöbbször nedvesség, nem beállítási hiba. Ha a szárítód nem éri el a 65 °C-ot, a legnagyobb fokozatán szárítsd tovább.", tags: ["kezdőbarát", "funkcionális", "kültér", "vegyszerálló"],
});
add("basic", S, "pctg", "PCTG", "PCTG", [240, 270], [70, 90], null, "off", [30, 60], [65, 6, 8], false, [4, 4, 2, 2, 3], {
  aliases: ["kopoliészter PCTG"],
  summary: "A PETG szívósabb, tisztábban átlátszó rokona – jobb ütésállóság és rétegtapadás, hasonlóan könnyű nyomtatás.",
  uses: ["ütésnek kitett burkolatok", "átlátszó alkatrészek", "szerszámtartók, pattintós kötések"],
  props: ["a PETG-nél jóval nagyobb ütőszilárdság", "jó átlátszóság", "kevésbé szálaz", "jó vegyszerállóság"],
  cons: ["drágább, kisebb színválaszték", "hőállósága a PETG-vel azonos (~75 °C)"],
  speed: "50–200 mm/s", plate: `${PEI}; sima PEI-n leválasztó`, hdt: "≈ 75 °C",
  printTips: "Mint a PETG: kamrafűtés KI, közepes hűtés. Vastag falnál lassíts az átlátszóságért.", dryTips: "65 °C, 6–8 óra.", tags: ["funkcionális", "ütésálló", "átlátszó"],
});

S = "Mechanikailag erősített és ipari PLA-változatok";
add("basic", S, "pla-plus", "PLA+ / Tough PLA", "PLA+", [205, 235], [50, 65], null, "open", [70, 100], [50, 4, 6], false, [5, 3, 1, 2, 2], {
  aliases: ["PLA Plus", "PLA Pro", "Tough PLA", "ePLA", "PLA Impact"],
  summary: "Adalékokkal szívósított PLA: kevésbé rideg, jobban bírja az ütést és a csavarozást, miközben ugyanolyan könnyen megy.",
  uses: ["terhelt beltéri alkatrészek", "pattintós kötések, zsanérok", "szerszámnyelek, tartók"],
  props: ["nagyobb ütésállóság és nyúlás", "jobb rétegtapadás", "ugyanolyan könnyű nyomtatás"],
  cons: ["hőállósága nem jobb a PLA-nál", "gyártónként nagyon eltérő receptúra – nincs szabvány"],
  speed: "60–250 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " A sima PLA-nál 5–10 °C-kal melegebb fúvókát szeret.", dryTips: DRY_PLA, tags: ["kezdőbarát", "szívós", "funkcionális"],
});
add("basic", S, "hs-pla", "High-Speed PLA", "PLA", [210, 240], [50, 65], null, "open", [90, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["HS-PLA", "Hyper PLA", "Rapid PLA", "PLA HF", "nagy sebességű PLA"],
  summary: "Nagy folyóképességű PLA gyors gépekre: nagyobb térfogatáram mellett is tisztán olvad, így a gyors profil nem megy a minőség rovására.",
  uses: ["nagy darabszám, gyors prototípus", "nagy térfogatú nyomatok", "vázlatmodellek"],
  props: ["25–30 mm³/s térfogatáramig stabil", "gyorsabb hűlés, élesebb sarkok", "alacsony viszkozitás"],
  cons: ["a nagyon gyors nyomat felülete mattabb, gyengébb a rétegtapadás", "szálazhat, ha túl meleg"],
  speed: "150–500 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Itt használható ki a gép gyorsulása: kalibráld a max. térfogatáramot (több fejnél fejenként).", dryTips: DRY_PLA, tags: ["gyors", "kezdőbarát"],
});
add("basic", S, "pla-cf", "PLA-CF", "Kompozit", [210, 240], [50, 65], null, "open", [50, 100], [55, 6, 8], true, [4, 3, 2, 1, 2], {
  aliases: ["szénszálas PLA", "carbon PLA"],
  summary: "Aprított szénszállal töltött PLA: merevebb, méretstabilabb, matt, „műszaki” felülettel – a rétegvonalak szinte eltűnnek.",
  uses: ["merev tartók, keretek, drónalkatrészek", "szerelősablonok", "matt, prémium hatású burkolatok"],
  props: ["nagy merevség, kis vetemedés", "matt, karcálló felület", "könnyen nyomtatható kompozit"],
  cons: ["ridegebb a sima PLA-nál", "hőállósága alig jobb", HARD],
  speed: "50–200 mm/s", plate: PEI, hdt: "≈ 55–60 °C", nozzleDia: "0,4 mm edzett (0,6 ajánlott); 0,2 mm NEM",
  printTips: PLA_OPEN + " " + HARD, dryTips: "55 °C, 6–8 óra.", tags: ["merev", "matt", "abrazív", "kompozit"],
});
add("basic", S, "ht-pla", "HT-PLA (hőálló PLA)", "PLA", [210, 240], [55, 65], null, "open", [60, 100], [55, 4, 6], false, [4, 3, 3, 1, 2], {
  aliases: ["High-Temp PLA", "HTPLA", "kristályosítható PLA", "PLA HT"],
  summary: "Hőkezeléssel (annealing) kristályosítható PLA: nyomtatás után kb. 80–100 °C-on kezelve 100 °C fölötti hőállóságot ér el.",
  uses: ["autóba, napra kerülő beltéri alkatrészek", "meleg közelében lévő tartók", "kávégép-, lámpaalkatrészek"],
  props: ["hőkezelés után HDT 100 °C fölött", "PLA-szerű könnyű nyomtatás", "merev"],
  cons: ["hőkezelés közben zsugorodik/vetemedik (1–3%) – előre kompenzálni kell", "hőkezelés nélkül sima PLA"],
  speed: "60–200 mm/s", plate: PEI, hdt: "≈ 55 °C → hőkezelve 100–140 °C",
  printTips: PLA_OPEN + " Hőkezelni NEM a nyomtató kamrájában érdemes (a kamra hőfoka kevés).", dryTips: "Szárítás 55 °C. Hőkezelés 80–85 °C-on, 1–2 óra, lassú kihűléssel – szárító annealing módjában, ha eléri ezt a hőfokot, egyébként sütőben (a gyártó 90–100 °C-ot kérhet – akkor sütő kell).", tags: ["hőálló", "hőkezelhető"],
});

S = "Esztétikai és felületi hatású változatok";
add("basic", S, "silk-pla", "Silk PLA", "PLA", [205, 235], [50, 65], null, "open", [60, 100], [50, 4, 6], false, [4, 2, 1, 1, 2], {
  aliases: ["selyem PLA", "selyemfényű PLA", "Shiny PLA"],
  summary: "Magasfényű, selyemhatású dekor PLA – a rétegvonalakat a csillogás szinte elrejti.",
  uses: ["vázák, szobrok, figurák", "ajándék- és dísztárgyak", "ékszer, trófea"],
  props: ["erős selyemfény", "szép felület nagy rétegmagasságnál is"],
  cons: ["gyenge rétegtapadás, rideg – nem funkcionális anyag", "gyorsan nyomtatva elveszti a fényét", "hajlamos dugulásra, ha túl hideg"],
  speed: "40–100 mm/s (a fényért lassan)", plate: `${PEI} vagy sima PEI`, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Külső fal 40–60 mm/s és 220–230 °C adja a legszebb fényt.", dryTips: DRY_PLA, tags: ["dekor", "fényes"],
});
add("basic", S, "matte-pla", "Matte PLA", "PLA", [200, 230], [45, 60], null, "open", [80, 100], [50, 6, 8], false, [5, 2, 1, 1, 3], {
  aliases: ["matt PLA", "PLA Matte"],
  summary: "Ásványi adalékkal mattított PLA: bársonyos, tükröződésmentes felület, amely elrejti a rétegvonalakat.",
  uses: ["makettek, építészeti modellek", "festésre szánt figurák", "fotózásra kerülő tárgyak"],
  props: ["matt, „prémium” felület", "nagyon jól takarja a rétegeket", "jól festhető"],
  cons: ["gyengébb rétegtapadás, ridegebb", "nedvességre érzékenyebb a sima PLA-nál", "az ujjlenyomat meglátszik a sötét színeken"],
  speed: "60–200 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN, dryTips: "50 °C, de inkább 6–8 óra – a matt töltőanyag több vizet köt meg.", tags: ["dekor", "matt", "kezdőbarát"],
});
add("basic", S, "multicolor-pla", "Dual / Tri-Color PLA", "PLA", [205, 235], [50, 65], null, "open", [60, 100], [50, 4, 6], false, [4, 2, 1, 1, 2], {
  aliases: ["kétszínű PLA", "háromszínű PLA", "co-extruded PLA", "Dual-Color Silk", "Tri-Color Silk", "Magic PLA"],
  summary: "Két vagy három szín egymás mellett, egyetlen szálba koextrudálva: a tárgy nézőponttól függően más színű.",
  uses: ["szobrok, sárkányok, vázák", "látványos dísztárgyak"],
  props: ["színváltó hatás egyetlen fejjel", "általában selyemfényű"],
  cons: ["a hatás a szál elfordulásától függ – a tekercsről csavarodás nélkül kell futnia", "mechanikailag gyenge (silk alap)"],
  speed: "40–100 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Egy fej elég hozzá; a színek állását a modell asztalon való elforgatásával hangolhatod.", dryTips: DRY_PLA, tags: ["dekor", "többszínű", "fényes"],
});
add("basic", S, "rainbow-pla", "Rainbow / Gradient PLA", "PLA", [200, 230], [50, 65], null, "open", [80, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["szivárvány PLA", "színátmenetes PLA", "gradient PLA", "multicolor PLA"],
  summary: "A szál hosszában változó színű PLA: a nyomat magasság mentén fokozatosan vált színt.",
  uses: ["vázák, nagy dísztárgyak", "lámpaernyők"],
  props: ["színátmenet többfejes nyomtatás nélkül", "sima PLA-ként nyomtatható"],
  cons: ["kis tárgyon alig látszik az átmenet (hosszú a színciklus)", "az eredmény nem tervezhető pontosan"],
  speed: "60–200 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Nagy, magas tárgyaknál mutat a legjobban.", dryTips: DRY_PLA, tags: ["dekor", "többszínű"],
});
add("basic", S, "translucent-pla", "Áttetsző / Crystal PLA", "PLA", [205, 230], [50, 65], null, "open", [50, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["Translucent PLA", "Transparent PLA", "Crystal PLA", "Jelly PLA"],
  summary: "Áttetsző PLA lámpákhoz, fényvezetőkhöz, litofánokhoz.",
  uses: ["lámpaburák, LED-diffúzorok", "litofánok", "üveghatású dísztárgyak"],
  props: ["jó fényáteresztés", "vázamódban a legszebb"],
  cons: ["valódi víztisztaság FDM-mel nem érhető el", "a belső kitöltés átlátszik"],
  speed: "40–150 mm/s", plate: "Sima PEI (fényes alj)", hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Az átlátszósághoz: vastag rétegek, 5–10 °C-kal melegebb fúvóka, lassú fal, kevesebb hűtés.", dryTips: DRY_PLA, tags: ["dekor", "átlátszó"],
});
add("basic", S, "sparkle-pla", "Sparkle / Galaxy / Marble PLA", "PLA", [200, 230], [50, 65], null, "open", [80, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["Glitter PLA", "csillámos PLA", "Galaxy PLA", "márvány PLA", "Marble PLA", "Stone PLA"],
  summary: "Csillám- vagy kőhatású szemcsékkel töltött PLA: szemcsés, csillogó vagy márványos felület, amely jól takarja a rétegeket.",
  uses: ["dísztárgyak, kaspók", "kő- vagy fémhatású makettek", "társasjáték-elemek"],
  props: ["látványos felület utómunka nélkül", "jól takarja a hibákat"],
  cons: ["a szemcsék enyhén koptatják a sárgaréz fúvókát", "0,2 mm-es fúvókát eltömheti"],
  speed: "60–200 mm/s", plate: PEI, hdt: "≈ 55 °C", nozzleDia: "0,4 mm vagy nagyobb; tartós használatra edzett",
  printTips: PLA_OPEN + " Rendszeres használatnál edzett fúvókás fejbe tedd.", dryTips: DRY_PLA, tags: ["dekor", "effekt"],
});

S = "Speciális adalékos és effekt PLA-k";
add("basic", S, "wood-pla", "Wood PLA", "Kompozit", [190, 220], [45, 60], null, "open", [70, 100], [45, 4, 6], false, [3, 2, 1, 1, 3], {
  aliases: ["fa PLA", "fatöltésű PLA", "bambusz PLA", "parafa PLA", "Wood-filled"],
  summary: "Fa-, bambusz- vagy parafaliszttel töltött PLA: fa tapintás és illat, csiszolható, pácolható felület.",
  uses: ["fahatású dísztárgyak, keretek", "makettek, játékfigurák", "csiszolt-pácolt tárgyak"],
  props: ["valódi fa hatás, csiszolható, pácolható", "a fúvókahőfokkal a színárnyalat sötétíthető", "matt felület"],
  cons: ["könnyen dugul: a farost megég, ha áll a meleg fúvókában", "szálaz, a retract érzékeny", "rideg, gyenge", "nedvszívó"],
  speed: "40–100 mm/s", plate: PEI, hdt: "≈ 50–55 °C", nozzleDia: "0,6 mm ajánlott (0,4 a minimum)",
  printTips: PLA_OPEN + " Nyomtatás után azonnal fűzd ki: ne hagyd a meleg fejben. Többfejes nyomatnál a várakozó fej hőfokát vedd le.", dryTips: "45–50 °C, 4–6 óra – a farost miatt ne menj feljebb.", tags: ["dekor", "effekt", "csiszolható"],
});
add("basic", S, "glow-pla", "Glow-in-the-Dark PLA", "Kompozit", [210, 230], [50, 65], null, "open", [80, 100], [50, 4, 6], true, [4, 2, 1, 1, 2], {
  aliases: ["foszforeszkáló PLA", "sötétben világító PLA", "Luminous PLA"],
  summary: "Stroncium-aluminát pigmenttel töltött PLA, amely fény hatására feltöltődik, és sötétben világít.",
  uses: ["jelölők, kapcsolókeretek", "játékok, halloween-dekoráció", "éjszakai tájékozódási pontok"],
  props: ["hosszan tartó utánvilágítás (zöld a legerősebb)", "vastag falnál erősebb fény"],
  cons: ["ERŐSEN abrazív – sárgaréz fúvókát pár száz gramm alatt tönkretesz", "ridegebb"],
  speed: "50–150 mm/s", plate: PEI, hdt: "≈ 55 °C", nozzleDia: "0,4 mm edzett vagy nagyobb",
  printTips: PLA_OPEN + " " + HARD + " A fényerőhöz több fal és nagyobb kitöltés kell.", dryTips: DRY_PLA, tags: ["effekt", "abrazív", "dekor"],
});
add("basic", S, "lw-pla", "Lightweight / Foaming PLA", "PLA", [200, 260], [50, 60], null, "open", [30, 80], [50, 4, 6], false, [2, 1, 1, 1, 3], {
  aliases: ["LW-PLA", "PLA Aero", "habosodó PLA", "könnyített PLA", "Foaming PLA"],
  summary: "Hőre habosodó PLA: 230 °C fölött a szál felhabzik, így ugyanaz a térfogat fele-harmad tömegű.",
  uses: ["RC repülők, drónburkolatok", "cosplay kellékek", "úszó tárgyak"],
  props: ["sűrűség akár ~0,5 g/cm³", "a habosodás a hőfokkal szabályozható", "matt, jól festhető"],
  cons: ["külön kalibrációt kér: flow 45–65% a hőfok függvényében", "erősen szálaz – a retract nem segít", "puha, gyenge"],
  speed: "30–80 mm/s", plate: PEI, hdt: "≈ 50 °C",
  printTips: PLA_OPEN + " Kalibrálj hőfok–flow tornyot; retract helyett „avoid crossing walls”, egyfalú (vázaszerű) szerkezetek.", dryTips: DRY_PLA + " Nedvesen kiszámíthatatlanul habzik.", tags: ["könnyű", "RC", "haladó"],
});
add("basic", S, "metal-pla", "Fémtöltésű PLA", "Kompozit", [195, 225], [50, 65], null, "open", [60, 100], [50, 4, 6], true, [3, 2, 1, 1, 2], {
  aliases: ["Metal-filled PLA", "bronz PLA", "réz PLA", "Copper PLA", "Bronze PLA", "vas PLA"],
  summary: "Valódi fémporral (bronz, réz, vas) töltött PLA: nehéz, polírozható, patinázható.",
  uses: ["szobrok, érmék, ékszerek", "súlyosabb dísztárgyak", "patinázott/rozsdásított makettek"],
  props: ["fémes súly és tapintás", "polírozható, oxidálható", "jó hővezetés"],
  cons: ["rideg, a szál könnyen törik a tekercsen", "abrazív és nehéz", "a nagy sűrűség miatt drága grammra"],
  speed: "30–80 mm/s", plate: PEI, hdt: "≈ 55 °C", nozzleDia: "0,6 mm edzett ajánlott",
  printTips: PLA_OPEN + " " + HARD + " Rövid, egyenes szálút kell – a rideg szál éles kanyarban eltörik.", dryTips: DRY_PLA, tags: ["effekt", "abrazív", "dekor"],
});
add("basic", S, "colorchange-pla", "Hőre / UV-ra színváltó PLA", "PLA", [200, 220], [50, 60], null, "open", [80, 100], [50, 4, 6], false, [5, 3, 1, 1, 2], {
  aliases: ["Thermochromic PLA", "UV color change PLA", "kaméleon PLA", "Temperature Color Change"],
  summary: "Hőmérsékletre (kb. 30–45 °C) vagy UV-fényre színt váltó pigmenttel készült PLA.",
  uses: ["bögrealátétek, játékok", "hőmérséklet-jelzők", "oktatási demonstrációk"],
  props: ["visszafordítható színváltás", "sima PLA-ként megy"],
  cons: ["a pigment idővel, erős UV-ben kifárad", "túl forró fúvóka tönkreteheti a hatást"],
  speed: "60–150 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " Maradj a hőfoktartomány alsó felében.", dryTips: "45–50 °C – ne szárítsd melegebben, a pigment érzékeny.", tags: ["effekt", "dekor"],
});
add("basic", S, "conductive-pla", "Vezetőképes PLA", "Kompozit", [210, 230], [50, 60], null, "open", [70, 100], [50, 4, 6], true, [3, 2, 1, 1, 2], {
  aliases: ["Conductive PLA", "ESD PLA", "elektromosan vezető PLA"],
  summary: "Korommal vagy grafittal töltött PLA: kis áramú áramkörökhöz, érintésérzékelőkhöz, antisztatikus tárgyakhoz.",
  uses: ["kapacitív érintőgombok", "kisáramú vezetősávok, szenzorok", "antisztatikus tálcák"],
  props: ["mérhető elektromos vezetés (nagy ellenállással)", "többfejes nyomatba ágyazható"],
  cons: ["nem huzalpótló: az ellenállás nagy", "rideg, abrazív"],
  speed: "30–80 mm/s", plate: PEI, hdt: "≈ 55 °C",
  printTips: PLA_OPEN + " " + MULTI + " Így a vezetősáv közvetlenül a szigetelő PLA-testbe nyomtatható.", dryTips: DRY_PLA, tags: ["speciális", "elektronika", "abrazív"],
});

S = "PETG-változatok";
add("basic", S, "petg-hf", "PETG HF (High-Flow)", "PETG", [230, 270], [70, 85], null, "off", [40, 80], [65, 6, 8], false, [4, 3, 2, 2, 3], {
  aliases: ["High-Speed PETG", "Rapid PETG", "PETG High Flow", "Hyper PETG"],
  summary: "Nagy folyóképességű PETG gyors gépekre – a PETG szívóssága a PLA-hoz közeli sebességgel.",
  uses: ["nagyobb funkcionális alkatrészek gyorsan", "sorozatgyártott tartók"],
  props: ["20+ mm³/s térfogatáram", "kevesebb szálazás", "jó felület nagy sebességnél"],
  cons: ["a legnagyobb sebességnél gyengébb rétegtapadás"],
  speed: "100–300 mm/s", plate: `${PEI}; sima PEI-n leválasztó`, hdt: "≈ 68–70 °C",
  printTips: "Kamrafűtés KI. Kalibráld a max. térfogatáramot; nagy sebességnél 250–260 °C.", dryTips: "65 °C, 6–8 óra.", tags: ["gyors", "funkcionális"],
});
add("basic", S, "petg-cf", "PETG-CF", "Kompozit", [240, 270], [70, 85], null, "off", [20, 60], [65, 8, 10], true, [4, 3, 2, 1, 3], {
  aliases: ["szénszálas PETG", "carbon PETG"],
  summary: "Szénszállal merevített PETG: matt, méretstabil, a PLA-CF-nél hő- és ütésállóbb műhelyanyag.",
  uses: ["gépalkatrészek, konzolok", "szerszámtartók, befogók", "kültéri merev elemek"],
  props: ["merev, kis vetemedés", "matt felület, alig látszó rétegek", "jó vegyszerállóság"],
  cons: ["a sima PETG-nél ridegebb", HARD],
  speed: "50–200 mm/s", plate: PEI, hdt: "≈ 74 °C",
  printTips: "Kamrafűtés KI vagy legfeljebb 40 °C. " + HARD, dryTips: "65 °C, 8–10 óra.", tags: ["merev", "matt", "abrazív", "kompozit", "funkcionális"],
});

// ───────────────────────── 2. MÉRNÖKI ÉS NAGY TEHERBÍRÁSÚ ─────────────────────────
S = "Sztirol alapú műszaki anyagok";
const STY = "Sztirol-emisszió: csukott ajtóval, a gép szűrőjével nyomtasd, és szellőztess.";
add("engineering", S, "abs", "ABS", "ABS", [240, 270], [90, 110], [55, 65], "required", [0, 30], [80, 4, 6], false, [3, 3, 4, 2, 2], {
  aliases: ["ABS+", "akrilnitril-butadién-sztirol"],
  summary: "Klasszikus műszaki műanyag: szívós, hőálló, acetonnal simítható és ragasztható. Zárt, meleg térben megbízhatóan megy.",
  uses: ["gépházak, burkolatok", "autós beltéri alkatrészek", "acetonnal simított prototípusok", "nyomtatóalkatrészek"],
  props: ["kb. 95–100 °C-ig hőálló", "jó ütésállóság", "jól megmunkálható, csiszolható, ragasztható", "acetongőzzel fényesre simítható"],
  cons: ["erősen zsugorodik – kamra nélkül vetemedik, reped", "szagos, sztirolt bocsát ki", "UV-ben sárgul, ridegedik"],
  speed: "50–250 mm/s", plate: `${PEI}; nagy alapterületnél ragasztó + perem (brim)`, hdt: "≈ 95–100 °C",
  printTips: "Fűtött kamrás gépen: kamra 60–65 °C, asztal 100–105 °C, 10–15 perc előmelegítés. Zárt, de fűtetlen gépben csukott ajtóval, 100–110 °C-os asztallal 15–20 percig melegítsd elő a belső teret, és kisebb darabokkal kezdd. Nyitott gépen nagy eséllyel vetemedik és reped. Hűtés csak hidakra. " + STY,
  dryTips: "80 °C, 4–6 óra. Ha a szárítód nem éri el a 80 °C-ot, a legnagyobb fokozatán szárítsd tovább; az ABS kevésbé nedvességérzékeny, frissen bontva szárítás nélkül is mehet.", tags: ["hőálló", "funkcionális", "simítható", "kamrás"],
});
add("engineering", S, "asa", "ASA", "ASA", [240, 270], [90, 110], [55, 65], "required", [0, 30], [80, 4, 6], false, [3, 3, 4, 2, 2], {
  aliases: ["akrilészter-sztirol-akrilnitril"],
  summary: "Az ABS UV- és időjárásálló rokona: kültéri alkatrészek első számú anyaga.",
  uses: ["kültéri burkolatok, érzékelőházak", "autós külső alkatrészek", "kerti, tetőre kerülő tartók", "antennatartók"],
  props: ["kiváló UV- és időjárásállóság, nem sárgul", "kb. 95–100 °C-ig hőálló", "mechanikailag az ABS-hez hasonló"],
  cons: ["vetemedésre hajlamos kamra nélkül", "sztirol-emisszió, szag", "az ABS-nél kicsit drágább"],
  speed: "50–250 mm/s", plate: `${PEI}; nagy darabnál perem (brim)`, hdt: "≈ 95–100 °C",
  printTips: "Fűtött kamrás gépen kamra 55–65 °C, asztal 100 °C, előmelegítéssel indíts. Zárt, de fűtetlen gépben csukott ajtóval, előmelegített belső térrel nyomtasd; nyitott gépen vetemedni fog. " + STY, dryTips: "80 °C, 4–6 óra.", tags: ["kültér", "UV-álló", "hőálló", "kamrás", "funkcionális"],
});
add("engineering", S, "abs-gf", "ABS-GF / ASA-CF", "Kompozit", [250, 280], [90, 110], [55, 65], "required", [0, 30], [80, 6, 8], true, [3, 4, 4, 1, 2], {
  aliases: ["üvegszálas ABS", "szénszálas ASA", "ABS-CF", "ASA-GF"],
  summary: "Üveg- vagy szénszállal erősített ABS/ASA: merevebb, és sokkal kevésbé vetemedik, mint a töltetlen változat.",
  uses: ["nagy, lapos műszaki alkatrészek", "gépvázelemek, tartók", "kültéri merev szerkezetek (ASA-CF)"],
  props: ["nagy merevség és méretstabilitás", "kisebb zsugorodás", "matt felület"],
  cons: ["ridegebb, kisebb ütésállóság", HARD, "sztirol-emisszió"],
  speed: "50–200 mm/s", plate: PEI, hdt: "≈ 100–105 °C",
  printTips: "Fűtött kamrás gépen kamra 55–65 °C; zárt, de fűtetlen gépben csukott ajtóval, előmelegítve. " + HARD + " " + STY, dryTips: "80 °C, 6–8 óra.", tags: ["merev", "abrazív", "kompozit", "kamrás", "hőálló"],
});
add("engineering", S, "pc-abs", "PC-ABS", "PC", [260, 285], [100, 110], [60, 65], "required", [0, 20], [85, 6, 8], false, [2, 4, 4, 2, 3], {
  aliases: ["PC/ABS", "polikarbonát-ABS keverék"],
  summary: "Polikarbonát és ABS keveréke: az ABS-nél hő- és ütésállóbb, a tiszta PC-nél könnyebben nyomtatható.",
  uses: ["ipari burkolatok, elektronikai házak", "autóipari beltéri elemek", "ütésnek kitett szerkezetek"],
  props: ["HDT ≈ 110 °C", "kiváló ütésállóság", "jó méretstabilitás"],
  cons: ["vetemedik – a kamra felső hőfoktartományát igényli", "nedvességre érzékeny"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó (PC-hez való)", hdt: "≈ 105–115 °C",
  printTips: "Fűtött kamrás gépen kamra a lehető legmelegebb (60–65 °C), asztal 105–110 °C, hosszú előmelegítés, perem (brim); fűtetlen, zárt gépben csak kisebb darabokkal próbáld. Nagy alapterületű darabnál kerekítsd a sarkokat. " + STY, dryTips: "85 °C, 6–8 óra; nyomtatás közben is maradjon a szárítóban. Ha a szárítód nem éri el a 85 °C-ot, a legnagyobb fokozatán szárítsd tovább.", tags: ["hőálló", "ütésálló", "kamrás", "haladó"],
});
add("engineering", S, "hips", "HIPS", "HIPS", [230, 250], [90, 100], [45, 60], "recommended", [0, 40], [65, 4, 6], false, [3, 2, 3, 2, 2], {
  aliases: ["ütésálló polisztirol", "High Impact Polystyrene"],
  summary: "Könnyű, jól csiszolható polisztirol; önálló anyagként és az ABS d-limonénben oldható támaszaként is használják.",
  uses: ["ABS/ASA oldható támasza", "könnyű makettek, festhető modellek", "prototípus burkolatok"],
  props: ["d-limonénben oldódik", "könnyű (≈1,04 g/cm³), jól csiszolható és festhető", "az ABS-sel azonos hőfokon megy"],
  cons: ["a limonén kezelése körülményes", "sztirol-emisszió", "gyengébb az ABS-nél"],
  speed: "50–200 mm/s", plate: PEI, hdt: "≈ 85–90 °C",
  printTips: MULTI + " Többfejes gépen egyik fejben ABS, a másikban HIPS támasz – azonos kamrahőfokon (55–60 °C). " + STY, dryTips: "65–70 °C, 4–6 óra.", tags: ["támaszanyag", "kamrás", "oldható"],
});
add("engineering", S, "asa-aero", "ASA Aero / LW-ASA", "ASA", [240, 280], [90, 100], [45, 60], "recommended", [0, 30], [80, 4, 6], false, [2, 1, 3, 1, 2], {
  aliases: ["habosodó ASA", "Lightweight ASA", "LW-ASA"],
  summary: "Habosodó ASA: az LW-PLA könnyűsége az ASA hő- és UV-állóságával – napon álló RC gépekhez.",
  uses: ["RC repülők, szárnyak", "kültéri könnyű burkolatok"],
  props: ["alacsony sűrűség", "UV- és hőálló (nem lágyul meg a napon)"],
  cons: ["külön flow-kalibráció kell", "szálaz, gyenge", "sztirol-emisszió"],
  speed: "30–80 mm/s", plate: PEI, hdt: "≈ 90 °C",
  printTips: "Fűtött kamrás gépen kamra 45–55 °C; fűtetlen, zárt gépben csukott ajtóval. Hőfok–flow kalibráció, egyfalú szerkezetek. " + STY, dryTips: "80 °C, 4–6 óra.", tags: ["könnyű", "RC", "kültér", "haladó"],
});

S = "Poliamidok (nylon)";
const PA_DRY = "Nyomtatás közben is a szárítóból fusson – a nylon órák alatt visszanedvesedik.";
add("engineering", S, "pa6", "PA6 (Nylon 6)", "PA/Nylon", [260, 290], [80, 100], [50, 65], "required", [0, 20], [85, 8, 12], false, [2, 4, 3, 3, 5], {
  aliases: ["nylon", "poliamid 6", "PA", "PA66", "CoPA"],
  summary: "Szívós, kopásálló, önkenő műszaki anyag fogaskerekekhez és csúszó alkatrészekhez. Nagyon nedvszívó.",
  uses: ["fogaskerekek, csapágyperselyek", "zsanérok, bilincsek, kábelkötegelők", "kopó, csúszó alkatrészek"],
  props: ["kiváló szívósság és fáradásállóság", "alacsony súrlódás, jó kopásállóság", "jó vegyszer- és olajállóság"],
  cons: ["erősen nedvszívó: nedvesen pattog, habos és gyenge", "vetemedik", "nedvességfelvétel után puhul és változik a mérete"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó (PA-hoz való) vagy Garolite", hdt: "≈ 60–80 °C (szárazon; terheléstől függ)",
  printTips: "Fűtött kamrás gépen kamra 55–65 °C, asztal 90 °C, ragasztó kötelező; zárt, de fűtetlen gépben csukott ajtóval, előmelegítve, kisebb darabokkal. Hűtés 0–20%.", dryTips: "85 °C, 8–12 óra. Ha a szárítód nem éri el a 85 °C-ot, a legnagyobb fokozatán szárítsd tovább. " + PA_DRY, tags: ["szívós", "kopásálló", "kamrás", "haladó", "nedvszívó"],
});
add("engineering", S, "pa12", "PA12 (Nylon 12)", "PA/Nylon", [250, 280], [80, 100], [45, 65], "recommended", [0, 30], [80, 8, 10], false, [3, 3, 3, 3, 3], {
  aliases: ["poliamid 12", "PA11", "PA612"],
  summary: "A PA6-nál jóval kevesebb vizet vesz fel, méretstabilabb és könnyebben nyomtatható – cserébe kicsit puhább.",
  uses: ["méretpontos műszaki alkatrészek", "üzemanyag-, olajálló elemek", "pattintós kötések"],
  props: ["alacsony nedvességfelvétel a nylonok között", "jó vegyszerállóság", "rugalmasan szívós"],
  cons: ["drágább", "kisebb merevség és hőállóság, mint a PA6"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó", hdt: "≈ 55–95 °C (típustól függ)",
  printTips: "Fűtött kamrás gépen kamra 50–60 °C, asztal 80–90 °C; zárt, fűtetlen gépben csukott ajtóval is megy, nyitott gépen vetemedhet.", dryTips: "80 °C, 8–10 óra. " + PA_DRY, tags: ["szívós", "vegyszerálló", "kamrás"],
});
add("engineering", S, "pa-cf", "PA6-CF / PA12-CF", "Kompozit", [270, 300], [80, 100], [50, 65], "recommended", [0, 30], [85, 8, 12], true, [3, 5, 5, 1, 4], {
  aliases: ["szénszálas nylon", "PA-CF", "nylon carbon", "PA6-CF", "PA12-CF", "PA612-CF"],
  summary: "A hobbiszinten elérhető egyik legerősebb, legmerevebb anyag: szénszálas nylon fém kiváltására, 150 °C fölötti hőállósággal.",
  uses: ["terhelt gépalkatrészek, konzolok", "befogók, készülékek, szerszámok", "motortér-közeli alkatrészek", "drónvázak"],
  props: ["nagyon nagy merevség és szilárdság", "HDT 150–190 °C", "a szál miatt alig vetemedik", "matt, professzionális felület"],
  cons: [HARD, "szárítás nélkül használhatatlan", "drága", "rétegirányban gyengébb"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó", hdt: "≈ 150–190 °C", nozzleDia: "0,4 mm edzett (0,6 ajánlott)",
  printTips: "Fúvóka 280–300 °C, asztal 90–100 °C – olyan gép kell hozzá, amelynek a fúvókája legalább 300 °C-ot tud. Fűtött kamrás gépen kamra 55–65 °C; zárt, de fűtetlen gépben csukott ajtóval, előmelegített belső térrel nyomtasd. Abrazív: csak edzett acél (vagy keményebb) fúvókával és fogaskerékkel.",
  dryTips: "85 °C, 10–12 óra – szárítás nélkül használhatatlan. Ha a szárítód nem éri el a 85 °C-ot, a legnagyobb fokozatán jóval tovább szárítsd, és nyomtatás közben is a szárítóból vagy szárazdobozból fusson.", tags: ["nagyon erős", "merev", "hőálló", "abrazív", "kompozit", "kamrás"],
});
add("engineering", S, "pa-gf", "PA6-GF", "Kompozit", [270, 300], [80, 100], [50, 65], "recommended", [0, 30], [85, 8, 12], true, [3, 4, 5, 2, 4], {
  aliases: ["üvegszálas nylon", "PA-GF", "PA12-GF"],
  summary: "Üvegszálas nylon: a CF-változatnál szívósabb és olcsóbb, kissé kevésbé merev; elektromosan szigetel.",
  uses: ["ütésnek kitett szerkezeti elemek", "elektromosan szigetelő tartók", "gépburkolatok"],
  props: ["jobb ütésállóság, mint a PA-CF", "HDT 150 °C fölött", "szigetelő (a CF vezet)"],
  cons: ["az üvegszál még a szénszálnál is koptatóbb", "érdesebb felület", "nedvszívó"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó", hdt: "≈ 150–180 °C",
  printTips: "Fűtött kamrás gépen kamra 55–65 °C; zárt, de fűtetlen gépben csukott ajtóval, előmelegítve. " + HARD, dryTips: "85 °C, 8–12 óra. " + PA_DRY, tags: ["erős", "ütésálló", "hőálló", "abrazív", "kompozit", "kamrás"],
});
add("engineering", S, "ppa-cf", "PAHT-CF / PPA-CF", "Kompozit", [290, 320], [90, 110], [60, 65], "required", [0, 20], [85, 12, 16], true, [2, 5, 5, 1, 3], {
  aliases: ["PAHT-CF", "PPA-CF", "PA6T-CF", "magas hőmérsékletű nylon", "HTN-CF", "PPA-GF"],
  summary: "Magas hőmérsékletű (félaromás) szénszálas poliamid: kevesebb vizet vesz fel, 190–230 °C-ig hőálló, alumíniumot válthat ki.",
  uses: ["motortéri, kipufogó-közeli alkatrészek", "nagy terhelésű befogók", "fémkiváltás"],
  props: ["kiemelkedő szilárdság és merevség", "HDT 190–230 °C", "a PA6-nál sokkal kisebb nedvességfelvétel"],
  cons: ["300–320 °C-os fúvókát kér – nem minden gép éri el", "nagyon drága", HARD],
  speed: "40–120 mm/s", plate: "PEI + ragasztó", hdt: "≈ 190–230 °C",
  printTips: "Csak olyan géppel, amelynek fúvókája eléri a 300–320 °C-ot; válassz olyan típust, amelynek ajánlott tartománya 300–310 °C körül van. Fűtött kamrás gépen kamra 60–65 °C, asztal 100–110 °C.", dryTips: "A gyártók 100–120 °C-ot kérnek; ha a szárítód csak 85 °C-ig megy, hosszabb, 12–16 óra kell, és nyomtatás közben is maradjon bent.", tags: ["nagyon erős", "hőálló", "abrazív", "kompozit", "kamrás", "haladó"],
});

S = "Polikarbonát, poliészter és poliolefin";
add("engineering", S, "pc", "PC (polikarbonát)", "PC", [260, 300], [100, 120], [60, 65], "required", [0, 20], [85, 8, 12], false, [2, 4, 5, 2, 4], {
  aliases: ["polycarbonate", "PC-FR", "égésgátolt PC"],
  summary: "Rendkívül ütésálló, 110–130 °C-ig hőálló, akár átlátszó műszaki anyag. Erősen zsugorodik, ezért kamrát és türelmet kér.",
  uses: ["védőburkolatok, átlátszó fedelek", "hőálló elektronikai házak", "nagy igénybevételű szerkezeti elemek"],
  props: ["kiemelkedő ütésállóság", "HDT 110–130 °C", "átlátszó változatban is", "FR (égésgátolt) típusa is van"],
  cons: ["erős vetemedés és rétegszétválás – az ideális kamra 80–100 °C lenne", "nagyon nedvszívó", "UV-ben sárgul"],
  speed: "40–120 mm/s", plate: "PEI + PC-hez való ragasztó; perem (brim) kötelező", hdt: "≈ 110–130 °C",
  printTips: "Egy 60–65 °C-ig fűthető kamra kis és közepes darabokra elég; nagy, lapos alkatrésznél vetemedni fog. Fűtött kamrás gépen kamra a lehető legmelegebb, asztal 110–115 °C, 20+ perc előmelegítés, hűtés 0%. Kezdésnek „könnyen nyomtatható” PC-keveréket válassz.", dryTips: "A gyártói ajánlás gyakran 100–120 °C; ha a szárítód csak 85 °C-ig megy, 8–12 óra, és nyomtatás közben is maradjon a szárítóban.", tags: ["ütésálló", "hőálló", "átlátszó", "kamrás", "haladó", "nedvszívó"],
});
add("engineering", S, "pc-cf", "PC-CF", "Kompozit", [270, 300], [100, 120], [60, 65], "required", [0, 20], [85, 8, 12], true, [3, 5, 5, 1, 3], {
  aliases: ["szénszálas polikarbonát"],
  summary: "Szénszállal stabilizált PC: a szál megfogja a zsugorodást, ezért könnyebben megy, mint a töltetlen PC, és még merevebb.",
  uses: ["hőálló, merev szerkezeti elemek", "készülékek, sablonok meleg környezetbe"],
  props: ["nagy merevség, HDT ≈ 130 °C fölött", "a tiszta PC-nél jóval kisebb vetemedés"],
  cons: ["elveszti a PC ütésállóságának egy részét", HARD],
  speed: "40–120 mm/s", plate: "PEI + ragasztó", hdt: "≈ 130–140 °C",
  printTips: "Fűtött kamrás gépen kamra 60–65 °C, asztal 110 °C; a szál miatt ez itt már a legtöbb méretre elég. Fűtetlen, zárt gépben előmelegítve, kisebb darabokkal próbáld. " + HARD, dryTips: "85 °C, 8–12 óra.", tags: ["merev", "hőálló", "abrazív", "kompozit", "kamrás"],
});
add("engineering", S, "pet-cf", "PET-CF", "Kompozit", [270, 300], [80, 100], [45, 60], "optional", [0, 40], [85, 8, 10], true, [3, 5, 4, 1, 2], {
  aliases: ["szénszálas PET", "PET-GF", "Carbon PET"],
  summary: "Szénszálas PET: a nylon-kompozitok merevsége nedvességre érzékeny méretváltozás nélkül – kültéri és nedves környezetbe.",
  uses: ["méretstabil műszaki alkatrészek", "kültéri, nedves környezetű szerkezetek", "merev tartók, vázak"],
  props: ["nagyon nagy merevség", "alig vesz fel vizet, méretstabil", "hőkezelve 150 °C fölötti HDT", "kiváló rétegfelület"],
  cons: ["rideg, kis ütésállóság", HARD, "a teljes hőállósághoz hőkezelni kell"],
  speed: "40–150 mm/s", plate: "PEI + ragasztó", hdt: "≈ 80 °C → hőkezelve 150–200 °C",
  printTips: "Kamra opcionális (45–60 °C segít nagy darabnál), asztal 80–100 °C. " + HARD, dryTips: "85 °C, 8–10 óra (a gyártói ajánlás lehet 100–120 °C). A hőkezelést is 100–120 °C-ra írják elő – ahhoz sütő kell, ha a szárítód legfeljebb 85 °C-ot tud, csak részleges eredményt ad.", tags: ["merev", "méretstabil", "abrazív", "kompozit", "kültér"],
});
add("engineering", S, "pp", "PP (polipropilén) / PP-GF", "PP", [220, 260], [80, 100], [40, 60], "recommended", [0, 30], [65, 4, 6], false, [1, 2, 3, 4, 1], {
  aliases: ["polipropilén", "PP-GF", "PP-CF"],
  summary: "Vegyszerálló, fáradásálló, könnyű anyag „élő zsanérokhoz” és vegyszeres tartályokhoz. A legnehezebben tapadó, erősen vetemedő filamentek egyike.",
  uses: ["élő zsanéros dobozok", "vegyszer-, élelmiszer-közeli tárolók", "laboreszközök"],
  props: ["kiváló vegyszerállóság", "szinte törhetetlen hajtogatásra", "nagyon könnyű (0,9 g/cm³), nem nedvszívó"],
  cons: ["csak PP-re tapad: PP ragasztószalag vagy speciális lap kell", "erős vetemedés", "PP-GF változata abrazív"],
  speed: "30–80 mm/s", plate: "PP csomagolószalag vagy PP-hez való tapadólap/ragasztó", hdt: "≈ 60–100 °C",
  printTips: "Nehéz a tapadás miatt, nem a hőfok miatt. Fűtött kamrás gépen kamra 45–60 °C, széles perem (brim) vagy raft, lassú első réteg. A PP-GF sokkal kezelhetőbb – ahhoz edzett fúvóka kell.", dryTips: "Alig nedvszívó: 60–65 °C, 4 óra elég.", tags: ["vegyszerálló", "hajlékony", "haladó", "kamrás"],
});

S = "Csúcskategóriás (high-performance) anyagok";
add("engineering", S, "pps-cf", "PPS / PPS-CF", "PPS", [310, 340], [100, 120], [60, 65], "required", [0, 20], [85, 12, 16], true, [2, 5, 5, 1, 1], {
  aliases: ["polifenilén-szulfid", "PPS-GF"],
  summary: "Szinte minden vegyszernek ellenálló, önkioltó, 200 °C fölött is stabil anyag. Nagyon magas fúvókahőfokot igényel.",
  uses: ["vegyipari, szivattyú- és motortéri alkatrészek", "magas hőmérsékletű szigetelők"],
  props: ["HDT 200 °C fölött (hőkezelve 260 °C)", "kiemelkedő vegyszerállóság, önkioltó (V0)", "nem nedvszívó"],
  cons: ["310–340 °C-os fúvókát kér – nem minden gép éri el", "az ideális kamra 80 °C fölötti", "nagyon drága, rideg", HARD],
  speed: "30–100 mm/s", plate: "PEI + magas hőmérsékletű ragasztó", hdt: "≈ 200–260 °C",
  printTips: "Csak olyan géppel, amelynek fúvókája eléri a 310–320 °C-ot, és olyan típussal, amelynek tartománya 310–320 °C-nál kezdődik; lassan, kis darabokkal. Fűtött kamrás gépen kamra 60–65 °C (a kelleténél kevesebb), asztal 110–120 °C. A teljes kristályossághoz utólagos hőkezelés kell (sütőben).", dryTips: "Gyártói ajánlás 120–130 °C; ha a szárítód csak 85 °C-ig megy, 12+ óra. Szerencsére alig vesz fel vizet.", tags: ["vegyszerálló", "hőálló", "abrazív", "kompozit", "kamrás", "haladó"],
});
add("engineering", S, "peek", "PEEK / PEKK / PEI (ULTEM)", "Egyéb", [360, 420], [120, 160], [90, 150], "required", [0, 0], [85, 12, 24], true, [1, 5, 5, 1, 2], {
  aliases: ["poliéter-éter-keton", "ULTEM", "PEI 9085", "PEKK", "PAEK", "PSU", "PPSU"],
  summary: "Repülőgépipari és orvostechnikai csúcsanyagok. Tájékoztatásul szerepelnek: a szokásos asztali gépeken NEM nyomtathatók.",
  uses: ["repülőgépipar, űripar", "orvosi implantátumok, sterilizálható eszközök", "fémkiváltás extrém környezetben"],
  props: ["folyamatos üzem 170–250 °C-on", "kiemelkedő szilárdság és vegyszerállóság", "önkioltó, alacsony füstképződés"],
  cons: ["360–420 °C fúvóka, 120–160 °C asztal, 90–150 °C kamra kell", "kilónként több százezer forint"],
  speed: "20–60 mm/s", plate: "Speciális (PEI lap / Garolite, magas hőfokú ragasztó)", hdt: "≈ 160–260 °C",
  printTips: "Szokásos asztali gépen NEM megy: a 360–420 °C-os fúvóka, 120–160 °C-os asztal és 90–150 °C-os kamra meghaladja a hobbigépek határait. Ha ilyen tulajdonság kell: PPA-CF vagy PPS-CF a reális felső határ, afölött bérnyomtatás.", dryTips: "150 °C-os szárítást igényelnek – a szokásos szárítók erre nem alkalmasak.", tags: ["nem nyomtatható", "ipari", "hőálló"],
});

// ───────────────────────── 3. RUGALMAS ÉS SPECIÁLIS ─────────────────────────
S = "Rugalmas filamentek";
const TPU_FEED = "Puha szál: rövid, egyenes, kis súrlódású szálút kell. Ha a gép automata adagolója nem viszi, külső tekercstartóról közvetlenül a fejbe fűzd.";
add("flexible", S, "tpu-95a", "TPU 95A", "TPU", [215, 240], [30, 55], null, "open", [50, 100], [70, 6, 8], false, [3, 3, 2, 4, 4], {
  aliases: ["termoplasztikus poliuretán", "flexibilis filament", "TPU 98A", "Flex"],
  summary: "A „standard” rugalmas anyag: gumiszerű, szinte elszakíthatatlan, kopásálló – még viszonylag könnyen nyomtatható.",
  uses: ["telefontokok, védőburkolatok", "tömítések, rezgéscsillapítók, lábak", "kerekek, szíjak, markolatok"],
  props: ["Shore 95A – keménygumi-szerű", "kiváló kopás- és szakadásállóság", "nagyon erős rétegtapadás", "olaj- és zsírálló"],
  cons: ["lassan nyomtatható", "szálaz, a retract korlátozottan segít", "nedvszívó: nedvesen hólyagos és szálas"],
  speed: "20–60 mm/s (térfogatáram 3–5 mm³/s)", plate: `${PEI} (sima PEI-re túl erősen tapad – leválasztó kell)`, hdt: "≈ 60–80 °C (lágyul, nem törik)",
  printTips: "Kamrafűtés KI, ajtó nyitva. " + TPU_FEED + " Retract kicsi (0,4–0,8 mm) és lassú. " + MULTI + " Pl. kemény váz + TPU tömítés egy nyomatban.", dryTips: "70 °C, 6–8 óra; hosszú nyomatnál fusson a szárítóból.", tags: ["rugalmas", "kopásálló", "ütésálló"],
});
add("flexible", S, "tpu-soft", "TPU 85A és lágyabb", "TPU", [220, 245], [30, 50], null, "open", [50, 100], [70, 6, 8], false, [1, 2, 2, 5, 4], {
  aliases: ["TPU 85A", "TPU 80A", "TPU 75A", "TPU 70A", "soft TPU", "TPE 85A"],
  summary: "Valóban puha, gumiszalag-szerű anyag. A szál annyira lágy, hogy az extruderben könnyen összegyűrődik.",
  uses: ["puha tömítések, párnák", "hordható eszközök, pántok", "puha robotika, fogók"],
  props: ["Shore 70–85A – nagyon puha, nyúlékony", "kiváló rezgés- és ütéscsillapítás"],
  cons: ["nagyon lassú (15–30 mm/s)", "csak direkt hajtással, vezetett szálúttal megy", "erősen szálaz"],
  speed: "15–30 mm/s (térfogatáram 1,5–3 mm³/s)", plate: PEI, hdt: "≈ 50–70 °C",
  printTips: "Nehéz az adagolás miatt: " + TPU_FEED + " Retract kikapcsolva vagy minimális, a szálfeszítő nyomását vedd lejjebb.", dryTips: "65–70 °C, 6–8 óra, nyomtatás közben is a szárítóból.", tags: ["rugalmas", "puha", "haladó"],
});
add("flexible", S, "tpu-hf", "TPU HF / kemény TPU (64D)", "TPU", [220, 250], [30, 55], null, "open", [60, 100], [70, 6, 8], false, [4, 3, 2, 3, 4], {
  aliases: ["High-Flow TPU", "High-Speed TPU", "TPU 95A HF", "TPU for AMS", "TPU 64D", "TPU 60D", "Rapid TPU"],
  summary: "Gyorsan nyomtatható vagy keményebb (60–64D) TPU-k, amelyek automata adagolórendszeren is átmennek.",
  uses: ["ütésálló burkolatok, lökhárítók", "félmerev zsanérok, pántok", "gyorsan gyártott rugalmas alkatrészek"],
  props: ["8–12+ mm³/s térfogatáram", "az adagolórendszerekkel kompatibilis keménység", "szívós, kopásálló"],
  cons: ["a 64D már inkább szívós műanyag, mint gumi", "nedvszívó"],
  speed: "40–150 mm/s", plate: PEI, hdt: "≈ 70–90 °C",
  printTips: "Kamrafűtés KI. Többanyagos nyomathoz ez a legkényelmesebb rugalmas típus. " + MULTI, dryTips: "70 °C, 6–8 óra.", tags: ["rugalmas", "gyors", "ütésálló"],
});
add("flexible", S, "tpe-peba", "TPE / TPC / PEBA", "TPE", [220, 260], [30, 60], null, "open", [30, 100], [70, 6, 8], false, [1, 2, 2, 5, 3], {
  aliases: ["TPEE", "TPC", "kopoliészter elasztomer", "PEBA", "PEBA 90A", "sportcipő talp anyag", "TPS"],
  summary: "Különleges elasztomerek: a TPC vegyszer- és hőállóbb a TPU-nál, a PEBA pedig nagyon könnyű, és kiemelkedően visszaadja az energiát.",
  uses: ["sporteszközök, talpbetétek, rugózó elemek (PEBA)", "vegyszerálló tömítések (TPC)", "hordható, bőrrel érintkező eszközök"],
  props: ["PEBA: nagy energia-visszaadás, hidegben is rugalmas, könnyű", "TPC: jobb hő- és UV-állóság"],
  cons: ["drágák, nehezen beszerezhetők", "lassú, kényes adagolás", "anyagonként erősen eltérő beállítás"],
  speed: "15–50 mm/s", plate: PEI, hdt: "típusfüggő",
  printTips: "Nehéz az adagolás miatt, a hőfok nem gond. " + TPU_FEED, dryTips: "65–70 °C, 6–8 óra.", tags: ["rugalmas", "speciális", "haladó"],
});

S = "Támaszanyagok";
add("flexible", S, "pva", "PVA", "PVA", [190, 220], [45, 60], null, "open", [80, 100], [50, 8, 12], false, [2, 1, 1, 2, 5], {
  aliases: ["polivinil-alkohol", "vízben oldódó támasz", "water soluble support"],
  summary: "Vízben teljesen feloldódó támaszanyag PLA-hoz: bonyolult belső üregek, tökéletes alsó felületek.",
  uses: ["PLA oldható támasza", "belső csatornák, zárt üregek, mozgó szerelvények", "támasz-érintkezőréteg (interface)"],
  props: ["langyos vízben nyom nélkül feloldódik", "PLA-hoz jól tapad"],
  cons: ["a legnedvszívóbb filament: órák alatt tönkremegy a levegőn", "a meleg fúvókában állva megég, dugít", "drága"],
  speed: "30–80 mm/s", plate: "(támaszként a főanyagra kerül)", hdt: "—",
  printTips: "Önálló fejjel ideális. " + MULTI + " Csak érintkezőrétegnek használd, a támasz törzse legyen PLA – így töredékannyi fogy. A várakozó PVA-fej hőfokát vedd le.", dryTips: "50 °C, 8–12 óra, és KIZÁRÓLAG a szárítóból nyomtasd. Tárolás: légmentesen, szárítószerrel.", tags: ["támaszanyag", "oldható", "nedvszívó"],
});
add("flexible", S, "bvoh", "BVOH", "PVA", [200, 225], [45, 70], null, "off", [60, 100], [55, 6, 10], false, [3, 1, 1, 2, 5], {
  aliases: ["buténdiol-vinil-alkohol", "oldható támasz", "BVOH support"],
  summary: "A PVA továbbfejlesztett rokona: gyorsabban oldódik, kevésbé dugít, és PETG-hez, ABS-hez is tapad.",
  uses: ["PLA, PETG, TPU és (korlátozottan) ABS oldható támasza"],
  props: ["a PVA-nál gyorsabb oldódás", "stabilabb nyomtatás, kevesebb dugulás", "több főanyaggal kompatibilis"],
  cons: ["még drágább", "ugyanolyan nedvszívó"],
  speed: "30–80 mm/s", plate: "(támaszként a főanyagra kerül)", hdt: "—",
  printTips: MULTI + " PETG-hez ez az oldható támasz. 50 °C fölötti kamrában meglágyul – fűtött kamrás anyagokhoz inkább HIPS.", dryTips: "55 °C, 6–10 óra, a szárítóból nyomtatva.", tags: ["támaszanyag", "oldható", "nedvszívó"],
});
add("flexible", S, "breakaway", "Letörhető támasz / PLA↔PETG érintkezőréteg", "PLA", [210, 250], [50, 80], null, "off", [50, 100], [55, 4, 6], false, [4, 1, 1, 1, 2], {
  aliases: ["Support for PLA", "Support for PETG", "breakaway support", "letörhető támasz", "interface anyag", "Support W", "Support G"],
  summary: "Egymáshoz nem tapadó anyagpárok: PLA nyomathoz PETG, PETG nyomathoz PLA érintkezőréteg – nulla hézaggal, tükörsima alsó felülettel, víz nélkül.",
  uses: ["sima alsó felület túlnyúlások alatt", "gyorsan, szárazon eltávolítható támasz"],
  props: ["nincs áztatás, kézzel leválik", "0 mm támaszhézaggal nyomtatható", "olcsó (a PLA/PETG maga a támasz)"],
  cons: ["zárt belső üregből nem vehető ki", "a két anyag asztal- és kamraigénye között kompromisszum kell"],
  speed: "a főanyag szerint", plate: "(támaszként a főanyagra kerül)", hdt: "—",
  printTips: "Többfejes gépen a legnagyobb előny: fejváltáskor nincs öblítés, így a PLA↔PETG érintkezőréteg szinte ingyen van; egyfejes gépen öblítési hulladékkal jár. Szeletelőben: csak az interface rétegek menjenek a másik anyagból, Z-hézag 0, interface-távolság 0.", dryTips: "A PETG-t 65 °C-on, a PLA-t 50 °C-on szárítsd; kétzónás szárítóban egyszerre mehet mindkettő.", tags: ["támaszanyag", "többfejes", "kezdőbarát"],
});

S = "Különleges célanyagok";
add("flexible", S, "pvb", "PVB", "PVB", [190, 220], [60, 75], null, "open", [50, 100], [50, 6, 8], false, [4, 2, 1, 1, 4], {
  aliases: ["polivinil-butirál", "PolySmooth", "alkohollal simítható"],
  summary: "PLA-szerűen nyomtatható anyag, amely izopropil-alkohol gőzével vagy permetével üvegsimára polírozható.",
  uses: ["tükörsima dísztárgyak, vázák", "átlátszó, üveghatású lámpaburák", "festés nélküli bemutatómodellek"],
  props: ["IPA-val simítható (az aceton veszélyei nélkül)", "jó átlátszóság", "könnyű nyomtatás"],
  cons: ["nedvszívó", "hőállósága a PLA-é körül", "a simítás puhítja a részleteket"],
  speed: "40–150 mm/s", plate: PEI, hdt: "≈ 55–60 °C",
  printTips: PLA_OPEN, dryTips: "50 °C, 6–8 óra.", tags: ["dekor", "simítható", "átlátszó"],
});
add("flexible", S, "esd", "ESD-biztos anyagok (PETG-ESD, ABS-ESD)", "Egyéb", [240, 270], [70, 110], [0, 65], "optional", [0, 50], [70, 6, 8], true, [3, 3, 3, 1, 3], {
  aliases: ["ESD-safe", "antisztatikus filament", "PETG-ESD", "ABS-ESD", "PLA-ESD", "disszipatív"],
  summary: "Szabályozott felületi ellenállású (10⁶–10⁹ Ω) anyagok elektronikai gyártósegédekhez: nem töltődnek fel, nem sütik ki az alkatrészt.",
  uses: ["NYÁK-tartók, forrasztósablonok", "alkatrésztálcák, műszerházak", "elektronikai szerelőkészülékek"],
  props: ["sztatikusan disszipatív felület", "az alapanyag (PETG/ABS) mechanikai tulajdonságai"],
  cons: ["drága", "az ESD-érték függ a nyomtatási hőfoktól", "szén-nanocső/korom töltet: edzett fúvóka kell"],
  speed: "40–150 mm/s", plate: PEI, hdt: "az alapanyag szerint",
  printTips: "A beállítás az alapanyagot követi: PETG-ESD kamra nélkül, ABS-ESD fűtött kamrával (60–65 °C). " + HARD, dryTips: "PETG-alap 65 °C, ABS-alap 80 °C, 6–8 óra.", tags: ["speciális", "elektronika", "abrazív"],
});
add("flexible", S, "cleaning", "Tisztító filament", "Egyéb", [180, 300], [0, 0], null, "off", [0, 0], [50, 0, 0], false, [5, 1, 1, 1, 1], {
  aliases: ["cleaning filament", "purge filament", "fúvókatisztító"],
  summary: "Nem nyomtatásra való: anyagváltáskor vagy dugulásnál átnyomva kiviszi a fúvókából az előző anyag maradékát.",
  uses: ["váltás magas és alacsony hőfokú anyag között (pl. PA-CF → PLA)", "elszenesedett lerakódás eltávolítása", "hosszabb állás előtti átmosás"],
  props: ["széles hőfoktartományban (180–300 °C) használható", "megköti a szennyeződést"],
  cons: ["csak kézi extrudálással, pár tíz centit érdemes átnyomni"],
  speed: "kézi adagolás", plate: "—", hdt: "—",
  printTips: "Többfejes gépen érdemes fejenként egy anyagcsaládot tartani (pl. 1: PLA, 2: PETG, 3: abrazív/edzett, 4: támasz vagy TPU) – így ritkán kell. Az előző anyag hőfokán kezdd, majd hűtsd az új anyagéra.", dryTips: "Szárítani nem kell.", tags: ["karbantartás", "speciális"],
});

export const TUTTIRIAL: readonly TutEntry[] = E;

/** Egy bejegyzés követelményei az illeszkedés-számításhoz (src/lib/fit.ts). */
export function requirementsOf(e: TutEntry): FitRequirements {
  // A tisztító filamentet nem nyomtatjuk: a 180–300 °C a HASZNÁLHATÓSÁGI tartománya (az előző anyag hőfokán megy át),
  // nem követelmény – bármely gép alkalmas rá, ezért hőfok-vizsgálat nélkül kap címkét.
  if (e.id === "cleaning") return { nozzle: null, bed: null, chamber: null, chamberMode: e.chamberMode, hardened: false, dryTempC: null, ease: e.r[0] };
  return { nozzle: e.nozzle, bed: e.bed, chamber: e.chamber, chamberMode: e.chamberMode, hardened: e.hardened, dryTempC: e.dry[2] > 0 ? e.dry[0] : null, ease: e.r[0] };
}

export const RATING_LABELS = ["Nyomtathatóság", "Szilárdság", "Hőállóság", "Rugalmasság", "Nedvességérzékenység"] as const;

/** Általános szabályok – a Tuttirial fejlécében jelennek meg. */
export const GENERAL_RULES = [
  { title: "Kamra: nem minden anyagnak jó", text: "PLA, PVA, TPU: kamrafűtés KI és nyitott ajtó/fedél (35 °C alatt). PETG: fűtés KI, csukott ajtó még belefér. ABS/ASA/PA/PC: 55–65 °C, 10–20 perc előmelegítéssel." },
  { title: "Fúvóka: a gép maximuma számít", text: "Minden kényelmesen megy 300 °C-ig (PA-CF, PC, PET-CF). A PPA-CF és PPS-CF 300 °C körüli vagy afölötti fúvókát kér; a PEEK/PEI szokásos asztali gépen nem megy. Szálerősített, világító és fémtöltésű anyaghoz edzett fúvóka kell." },
  { title: "Több önálló fej: anyagcsaládok szerint", text: "Ha a gépnek több önálló feje van: fejváltásnál nincs öblítési hulladék, ezért olcsó a PLA↔PETG érintkezőréteg, az oldható támasz és a kemény+rugalmas kombináció. Érdemes egy fejet edzett fúvókával az abrazív anyagoknak fenntartani." },
  { title: "Szárítás: anyagonként más hőfok", text: "PLA/PVA/PVB 50 °C · PETG/PCTG/HIPS 65 °C · TPU 70 °C · ABS/ASA 80 °C · PA/PC/PET-CF 85 °C. Ahol a gyártó 100 °C fölöttit kér (PC, PPA, PPS), és a szárítód nem éri el, hosszabb idő kell. Nylon, PC, TPU, PVA nyomtatás közben is a szárítóból fusson." },
] as const;
