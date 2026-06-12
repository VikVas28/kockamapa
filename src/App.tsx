import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import Legend from "./components/Legend";
import { classifyAll, type ClassifiedVenue } from "./lib/compliance";
import {
  DEFAULT_FILTERS,
  SKOPJE_ALL,
  SKOPJE_MUNICIPALITIES,
  type FiltersState,
} from "./lib/filters";
import type { School, Status, Venue } from "./lib/types";

export default function App() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [zones, setZones] = useState<FeatureCollection | null>(null);
  const [muniBoundaries, setMuniBoundaries] =
    useState<FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/schools.json`, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("schools.json");
        return r.json() as Promise<School[]>;
      }),
      fetch(`${base}data/venues.json`, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("venues.json");
        return r.json() as Promise<Venue[]>;
      }),
    ])
      .then(([s, v]) => {
        setSchools(s);
        setVenues(v);
      })
      .catch((e: Error) =>
        setLoadError(`Не може да се вчитаат податоците (${e.message}).`),
      );
  }, []);

  // Споените зони од 500 м се опционални — без нив се цртаат кругови.
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/zones.geojson`, {
      cache: "no-cache",
    })
      .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .then(setZones)
      .catch(() => setZones(null));
  }, []);

  // Граници на општините (опционален слој).
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/municipalities.geojson`, {
      cache: "no-cache",
    })
      .then((r) => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .then(setMuniBoundaries)
      .catch(() => setMuniBoundaries(null));
  }, []);

  const classified = useMemo<ClassifiedVenue[]>(
    () => (schools && venues ? classifyAll(venues, schools) : []),
    [schools, venues],
  );

  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const c of classified) {
      if (c.venue.municipality) set.add(c.venue.municipality);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "mk"));
  }, [classified]);

  // Филтри без статусот — основа за бројачите, за да се гледа
  // распределбата по статус и кога некој статус е исклучен.
  const baseFiltered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return classified.filter((c) => {
      const v = c.venue;
      if (!filters.kinds[v.kind]) return false;
      if (filters.municipality === SKOPJE_ALL) {
        if (!v.municipality || !SKOPJE_MUNICIPALITIES.has(v.municipality)) {
          return false;
        }
      } else if (
        filters.municipality !== "all" &&
        v.municipality !== filters.municipality
      ) {
        return false;
      }
      if (q) {
        const hay =
          `${v.name} ${v.operator ?? ""} ${v.address ?? ""} ${v.municipality ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [classified, filters]);

  const filtered = useMemo(
    () => baseFiltered.filter((c) => filters.statuses[c.status]),
    [baseFiltered, filters.statuses],
  );

  const counts = useMemo(() => {
    const n: Record<Status, number> = {
      compliant: 0,
      restricted: 0,
      must_relocate: 0,
    };
    for (const c of baseFiltered) n[c.status]++;
    return n;
  }, [baseFiltered]);

  const selected = useMemo(
    () => filtered.find((c) => c.venue.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  // Училишта за приказ — филтерот важи само за приказот; статусите секогаш
  // се пресметуваат спрема СИТЕ училишта (законот важи за основни и средни).
  const visibleSchools = useMemo(
    () => (schools ?? []).filter((s) => filters.schoolTypes[s.type]),
    [schools, filters.schoolTypes],
  );

  const zoneFeature = useMemo<Feature | null>(() => {
    if (!zones) return null;
    const { primary, secondary } = filters.schoolTypes;
    if (!primary && !secondary) return null;
    const scope = primary && secondary ? "all" : primary ? "primary" : "secondary";
    return zones.features.find((f) => f.properties?.scope === scope) ?? null;
  }, [zones, filters.schoolTypes]);

  if (loadError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md rounded-lg border border-red-900 bg-red-950/50 p-5 text-red-200">
          <p className="font-semibold">Грешка</p>
          <p className="mt-1 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!schools || !venues) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950 text-slate-400">
        Се вчитуваат податоците…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <Sidebar
        counts={counts}
        filters={filters}
        onFiltersChange={setFilters}
        municipalities={municipalities}
        items={filtered}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <main className="relative order-1 min-h-0 flex-1 lg:order-2">
        <MapView
          schools={visibleSchools}
          venues={filtered}
          zone={zoneFeature}
          zonesAvailable={zones !== null}
          municipalities={muniBoundaries}
          showMunicipalities={filters.showMunicipalities}
          showSchools={filters.showSchools}
          showZones={filters.showZones}
          selected={selected}
          onSelect={setSelectedId}
        />
        <div className="absolute bottom-6 left-3 z-[1000] max-w-[240px]">
          <Legend />
        </div>
      </main>
    </div>
  );
}
