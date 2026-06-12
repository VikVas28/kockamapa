// Повлекува училишта и објекти за игри на среќа за цела Македонија од
// OpenStreetMap (Overpass API), нормализира во формат на апликацијата и
// снима во public/data/schools.json и public/data/venues.json.
//
// Употреба:  node scripts/fetch-osm.mjs

import { writeFile } from "node:fs/promises";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const SCHOOLS_QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="MK"][admin_level=2]->.mk;
(
  node["amenity"="school"](area.mk);
  way["amenity"="school"](area.mk);
  relation["amenity"="school"](area.mk);
);
out center;
`;

const VENUES_QUERY = `
[out:json][timeout:120];
area["ISO3166-1"="MK"][admin_level=2]->.mk;
(
  nwr["amenity"="casino"](area.mk);
  nwr["leisure"="adult_gaming_centre"](area.mk);
  nwr["shop"="bookmaker"](area.mk);
  nwr["amenity"="gambling"](area.mk);
);
out center;
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(query) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`→ Барање до ${url} (обид ${attempt}) …`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "gambling-law-map/0.1 (compliance map; vikvasdesign@gmail.com)",
          },
          body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.elements ?? [];
      } catch (e) {
        console.warn(`  неуспех (${e.message})`);
        lastError = e;
      }
    }
    if (attempt < 3) {
      console.log("  чекам 30 секунди пред нов обид (rate limit)…");
      await sleep(30_000);
    }
  }
  throw lastError;
}

function center(el) {
  if (el.type === "node") return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

const EARTH_RADIUS_M = 6371008.8;
function distanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function address(tags) {
  const parts = [];
  if (tags["addr:street"]) {
    parts.push(
      tags["addr:street"] +
        (tags["addr:housenumber"] ? ` бр. ${tags["addr:housenumber"]}` : ""),
    );
  }
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  return parts.length ? parts.join(", ") : undefined;
}

// ОСМ не разликува доследно основно/средно — користиме isced:level ако постои,
// инаку хеуристика по името. За правилото од 500 м двата типа важат еднакво.
function schoolType(tags) {
  const isced = String(tags["isced:level"] ?? "");
  if (isced && /[34]/.test(isced) && !/[12]/.test(isced)) return "secondary";
  const name = (tags.name ?? tags["name:mk"] ?? "").toLowerCase();
  if (/соу|сугс|сосу|ссоу|асуц|гимназ|средно|high school/.test(name)) {
    return "secondary";
  }
  return "primary";
}

function venueKind(tags) {
  if (tags.amenity === "casino") return "casino";
  if (tags.leisure === "adult_gaming_centre") return "automat_club";
  if (tags.shop === "bookmaker") return "betting_shop";
  if (tags.amenity === "gambling") return "automat_club";
  return null;
}

const KIND_FALLBACK_NAMES = {
  casino: "Казино (без име)",
  automat_club: "Автомат клуб (без име)",
  electronic_games: "Е-игри (без име)",
  betting_shop: "Обложувалница (без име)",
};

// Истиот објект знае да е мапиран и како точка и како зграда (node + way).
// Отстрануваме дупликати: исто име (или двете без име) на < threshold метри.
function dedupe(items, threshold) {
  const kept = [];
  for (const item of items) {
    const dup = kept.find(
      (k) =>
        (k.name ?? "") === (item.name ?? "") &&
        distanceMeters(k, item) < threshold,
    );
    if (!dup) kept.push(item);
  }
  return kept;
}

// Во OSM под amenity=school погрешно се мапирани и градинки, универзитети,
// јазични курсеви и автошколи — тие не се основни/средни училишта по законот.
const NOT_A_SCHOOL = /градинк|универзитет|факултет|курс|автошкол|driving/i;

const NAMELESS_SCHOOL = "Училиште (без име)";

function normalizedName(name) {
  return name.toLowerCase().replace(/[^a-zа-џѐѝ]+/gi, "");
}

// Построга дедупликација за училишта:
//  - именуваните имаат предност пред „без име“
//  - < 30 м = иста зграда, спој безусловно
//  - точка „без име“ на < 250 м од задржано училиште = дупликат
//  - исто нормализирано име на < 300 м = дупликат
function dedupeSchools(items) {
  const sorted = [...items].sort((a, b) => {
    const aNamed = a.name === NAMELESS_SCHOOL ? 0 : 1;
    const bNamed = b.name === NAMELESS_SCHOOL ? 0 : 1;
    if (aNamed !== bNamed) return bNamed - aNamed;
    return b.name.length - a.name.length;
  });
  const kept = [];
  for (const item of sorted) {
    const nameless = item.name === NAMELESS_SCHOOL;
    const dup = kept.find((k) => {
      const dist = distanceMeters(k, item);
      if (dist < 30) return true;
      if (nameless && dist < 250) return true;
      return normalizedName(k.name) === normalizedName(item.name) && dist < 300;
    });
    if (!dup) kept.push(item);
  }
  return kept;
}

console.log("Повлекувам училишта…");
const schoolElements = await overpass(SCHOOLS_QUERY);
let schools = schoolElements
  .map((el) => {
    const c = center(el);
    const tags = el.tags ?? {};
    if (!c) return null;
    const name = (tags.name ?? tags["name:mk"] ?? NAMELESS_SCHOOL)
      .replace(/\s+/g, " ")
      .trim();
    return {
      id: `osm-${el.type[0]}-${el.id}`,
      name,
      type: schoolType(tags),
      lat: c.lat,
      lng: c.lng,
      municipality: tags["addr:city"],
      address: address(tags),
      source: "OSM",
    };
  })
  .filter(Boolean)
  .filter((s) => !NOT_A_SCHOOL.test(s.name));
schools = dedupeSchools(schools).sort((a, b) =>
  a.name.localeCompare(b.name, "mk"),
);

console.log("Повлекувам објекти за игри на среќа…");
const venueElements = await overpass(VENUES_QUERY);
let venues = venueElements
  .map((el) => {
    const c = center(el);
    const tags = el.tags ?? {};
    const kind = venueKind(tags);
    if (!c || !kind) return null;
    return {
      id: `osm-${el.type[0]}-${el.id}`,
      name: (tags.name ?? tags["name:mk"] ?? KIND_FALLBACK_NAMES[kind])
        .replace(/\s+/g, " ")
        .trim(),
      kind,
      operator: tags.operator,
      lat: c.lat,
      lng: c.lng,
      municipality: tags["addr:city"],
      address: address(tags),
      source: "OSM",
      verified: false,
    };
  })
  .filter(Boolean);
venues = dedupe(venues, 100).sort((a, b) => a.name.localeCompare(b.name, "mk"));

await writeFile(
  new URL("../public/data/schools.json", import.meta.url),
  JSON.stringify(schools, null, 2) + "\n",
  "utf8",
);
await writeFile(
  new URL("../public/data/venues.json", import.meta.url),
  JSON.stringify(venues, null, 2) + "\n",
  "utf8",
);

const byKind = {};
for (const v of venues) byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
const byType = {};
for (const s of schools) byType[s.type] = (byType[s.type] ?? 0) + 1;

console.log(`\nЗапишано:`);
console.log(`  Училишта: ${schools.length}`, byType);
console.log(`  Објекти:  ${venues.length}`, byKind);
