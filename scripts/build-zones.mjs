// Гради споени зони од 500 м околу училиштата (унија од кругови) и снима во
// public/data/zones.geojson. Три варијанти: сите / само основни / само средни,
// за филтерот по тип на училиште во апликацијата.
//
// Употреба:  node scripts/build-zones.mjs   (по секоја промена на schools.json)

import { readFile, writeFile } from "node:fs/promises";
import * as turf from "@turf/turf";

const schools = JSON.parse(
  await readFile(new URL("../public/data/schools.json", import.meta.url), "utf8"),
);

function zone(list, scope) {
  if (!list.length) return null;
  const points = turf.featureCollection(
    list.map((s) => turf.point([s.lng, s.lat])),
  );
  const buffered = turf.buffer(points, 0.5, { units: "kilometers", steps: 24 });
  const merged =
    buffered.features.length > 1
      ? turf.union(buffered)
      : buffered.features[0];
  merged.properties = { scope };
  return turf.truncate(merged, { precision: 5 });
}

const features = [
  zone(schools, "all"),
  zone(schools.filter((s) => s.type === "primary"), "primary"),
  zone(schools.filter((s) => s.type === "secondary"), "secondary"),
].filter(Boolean);

await writeFile(
  new URL("../public/data/zones.geojson", import.meta.url),
  JSON.stringify(turf.featureCollection(features)) + "\n",
  "utf8",
);

console.log(
  `Запишано: zones.geojson — ${schools.length} училишта, зони: ${features
    .map((f) => f.properties.scope)
    .join(", ")}`,
);
