import { useEffect, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  divIcon,
  type Marker as LeafletMarker,
  type PathOptions,
} from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import {
  KIND_GLYPHS,
  RESTRICTION_RADIUS_M,
  SCHOOL_COLORS,
  SCHOOL_TYPE_LABELS,
  STATUS_COLORS,
  type ClassifiedVenue,
} from "../lib/compliance";
import type { School } from "../lib/types";
import VenueDetail from "./VenueDetail";

type Basemap = "map" | "satellite";

// Врз сателитски снимки зоната мора да е поизразена за да се гледа.
const ZONE_STYLES: Record<Basemap, PathOptions> = {
  map: {
    color: "#dc2626",
    weight: 1,
    opacity: 0.6,
    fillColor: "#dc2626",
    fillOpacity: 0.12,
  },
  satellite: {
    color: "#ef4444",
    weight: 1.5,
    opacity: 0.9,
    fillColor: "#ef4444",
    fillOpacity: 0.2,
  },
};

const MUNI_STYLES: Record<Basemap, PathOptions> = {
  map: { color: "#64748b", weight: 1, opacity: 0.7, fill: false, dashArray: "4 3" },
  satellite: { color: "#fff", weight: 1.2, opacity: 0.85, fill: false, dashArray: "4 3" },
};

// Натписите на општините се видливи од ова зумирање нагоре.
const MUNI_LABEL_MIN_ZOOM = 10;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function muniLabelIcon(name: string, basemap: Basemap) {
  return divIcon({
    className: `muni-label muni-label-${basemap}`,
    html: `<span>${escapeHtml(name)}</span>`,
    iconSize: [0, 0],
  });
}

function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

const SKOPJE_CENTER: [number, number] = [41.9981, 21.4254];

function venueIcon(item: ClassifiedVenue) {
  return divIcon({
    className: "venue-marker",
    html: `<div class="marker-dot" style="background:${STATUS_COLORS[item.status]}">${KIND_GLYPHS[item.venue.kind]}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

interface SelectionProps {
  selected: ClassifiedVenue | null;
  markerRefs: React.RefObject<Map<string, LeafletMarker>>;
}

function SelectionController({ selected, markerRefs }: SelectionProps) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const { lat, lng } = selected.venue;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    const t = window.setTimeout(
      () => markerRefs.current.get(selected.venue.id)?.openPopup(),
      650,
    );
    return () => window.clearTimeout(t);
  }, [selected, map, markerRefs]);
  return null;
}

interface Props {
  schools: School[];
  venues: ClassifiedVenue[];
  zone: Feature | null;
  zonesAvailable: boolean;
  municipalities: FeatureCollection | null;
  showMunicipalities: boolean;
  showSchools: boolean;
  showZones: boolean;
  selected: ClassifiedVenue | null;
  onSelect: (id: string | null) => void;
}

export default function MapView({
  schools,
  venues,
  zone,
  zonesAvailable,
  municipalities,
  showMunicipalities,
  showSchools,
  showZones,
  selected,
  onSelect,
}: Props) {
  const markerRefs = useRef(new Map<string, LeafletMarker>());
  const [basemap, setBasemap] = useState<Basemap>("map");
  const [zoom, setZoom] = useState(12);
  const zoneStyle = ZONE_STYLES[basemap];

  return (
    <div className="relative h-full w-full">
    <MapContainer
      center={SKOPJE_CENTER}
      zoom={12}
      className="h-full w-full"
      scrollWheelZoom
      preferCanvas
    >
      {basemap === "map" ? (
        <TileLayer
          key="base-map"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
      ) : (
        <>
          <TileLayer
            key="base-satellite"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {/* Светли натписи на места/улици — читливи врз темни снимки */}
          <TileLayer
            key="labels-satellite"
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          />
        </>
      )}

      {showMunicipalities && municipalities && (
        <GeoJSON
          key={`munis-${basemap}`}
          data={municipalities}
          style={MUNI_STYLES[basemap]}
        />
      )}
      {showMunicipalities &&
        municipalities &&
        zoom >= MUNI_LABEL_MIN_ZOOM &&
        municipalities.features.map((f) => {
          const name = f.properties?.name as string | undefined;
          const center = f.properties?.center as [number, number] | undefined;
          if (!name || !center) return null;
          return (
            <Marker
              key={`muni-label-${name}-${basemap}`}
              position={center}
              icon={muniLabelIcon(name, basemap)}
              interactive={false}
              keyboard={false}
              zIndexOffset={-1000}
            />
          );
        })}

      {showZones && zone && (
        <GeoJSON
          key={`zone-${String(zone.properties?.scope)}-${basemap}`}
          data={zone}
          style={zoneStyle}
        />
      )}
      {/* Резерва ако zones.geojson не постои: кругови по училиште */}
      {showZones &&
        !zonesAvailable &&
        schools.map((s) => (
          <Circle
            key={`zone-${s.id}`}
            center={[s.lat, s.lng]}
            radius={RESTRICTION_RADIUS_M}
            pathOptions={zoneStyle}
          />
        ))}

      {showSchools &&
        schools.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={4}
            pathOptions={{
              color: "#fff",
              weight: 1,
              fillColor: SCHOOL_COLORS[s.type],
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{s.name}</p>
                <p className="text-slate-500">
                  {SCHOOL_TYPE_LABELS[s.type]}
                  {s.municipality ? ` · ${s.municipality}` : ""}
                </p>
                <p className="text-xs text-slate-400">Извор: {s.source}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {venues.map((c) => (
        <Marker
          key={c.venue.id}
          position={[c.venue.lat, c.venue.lng]}
          icon={venueIcon(c)}
          ref={(m) => {
            if (m) markerRefs.current.set(c.venue.id, m);
            else markerRefs.current.delete(c.venue.id);
          }}
          eventHandlers={{ click: () => onSelect(c.venue.id) }}
        >
          <Popup maxWidth={300}>
            <VenueDetail item={c} />
          </Popup>
        </Marker>
      ))}

      <SelectionController selected={selected} markerRefs={markerRefs} />
      <ZoomWatcher onZoom={setZoom} />
    </MapContainer>

    {/* Преклопник Мапа / Сателит */}
    <div
      className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-900/10"
      role="group"
      aria-label="Подлога на мапата"
    >
      {(
        [
          ["map", "Мапа"],
          ["satellite", "Сателит"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setBasemap(key)}
          aria-pressed={basemap === key}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            basemap === key
              ? "bg-slate-800 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
    </div>
  );
}
