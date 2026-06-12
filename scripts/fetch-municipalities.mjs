// Повлекува граници на сите 80 општини (OSM admin_level=7), им доделува
// реална општина на училиштата и објектите (точка-во-полигон), и снима
// поедноставени полигони во public/data/municipalities.geojson.
//
// Употреба:  node scripts/fetch-municipalities.mjs

import { readFile, writeFile } from "node:fs/promises";
import osmtogeojson from "osmtogeojson";
import * as turf from "@turf/turf";

const QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="MK"][admin_level=2]->.mk;
relation["boundary"="administrative"]["admin_level"="7"](area.mk);
out geom;
`;

console.log("Повлекувам граници на општините…");
const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "gambling-law-map/0.1 (compliance map; vikvasdesign@gmail.com)",
  },
  body: "data=" + encodeURIComponent(QUERY),
});
if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
const osmJson = await res.json();

const geojson = osmtogeojson(osmJson);
const municipalities = geojson.features
  .filter(
    (f) =>
      f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon",
  )
  .map((f) => {
    const tags = f.properties.tags ?? f.properties;
    const name = (tags["name:mk"] ?? tags.name ?? "")
      .replace(/^Општина\s+/u, "")
      .trim();
    return { feature: f, name };
  })
  .filter((m) => m.name);

console.log(`Општини со полигон: ${municipalities.length}`);

// Додели реална општина на секоја точка (точка-во-полигон).
async function assign(file) {
  const url = new URL(`../public/data/${file}`, import.meta.url);
  const items = JSON.parse(await readFile(url, "utf8"));
  let unassigned = 0;
  for (const item of items) {
    const pt = turf.point([item.lng, item.lat]);
    const hit = municipalities.find((m) =>
      turf.booleanPointInPolygon(pt, m.feature),
    );
    if (hit) item.municipality = hit.name;
    else unassigned++;
  }
  await writeFile(url, JSON.stringify(items, null, 2) + "\n", "utf8");
  console.log(`  ${file}: доделени општини (${unassigned} без погодок)`);
}
await assign("schools.json");
await assign("venues.json");

// Поедноставени полигони + центар за натпис на мапата.
const simplified = municipalities.map((m) => {
  const simple = turf.truncate(
    turf.simplify(m.feature, { tolerance: 0.001, highQuality: true }),
    { precision: 5 },
  );
  const center = turf.centerOfMass(m.feature).geometry.coordinates;
  simple.properties = {
    name: m.name,
    center: [
      Math.round(center[1] * 1e5) / 1e5,
      Math.round(center[0] * 1e5) / 1e5,
    ], // [lat, lng]
  };
  return simple;
});

await writeFile(
  new URL("../public/data/municipalities.geojson", import.meta.url),
  JSON.stringify(turf.featureCollection(simplified)) + "\n",
  "utf8",
);
console.log(`Запишано: municipalities.geojson (${simplified.length} општини)`);
