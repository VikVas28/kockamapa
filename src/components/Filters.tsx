import { KIND_LABELS, SCHOOL_COLORS } from "../lib/compliance";
import type { SchoolType, VenueKind } from "../lib/types";
import type { FiltersState } from "../App";

const KINDS: VenueKind[] = [
  "casino",
  "automat_club",
  "electronic_games",
  "betting_shop",
];

const SCHOOL_TYPES: [SchoolType, string][] = [
  ["primary", "Основни"],
  ["secondary", "Средни"],
];

interface Props {
  filters: FiltersState;
  municipalities: string[];
  onChange: (filters: FiltersState) => void;
}

export default function Filters({ filters, municipalities, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Пребарување</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Пребарај по име, приредувач, адреса…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Тип на објект
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {KINDS.map((kind) => (
            <label
              key={kind}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-slate-800/60 px-2 py-1.5 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                checked={filters.kinds[kind]}
                onChange={() =>
                  onChange({
                    ...filters,
                    kinds: { ...filters.kinds, [kind]: !filters.kinds[kind] },
                  })
                }
                className="accent-indigo-500"
              />
              {KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Општина
        </span>
        <select
          value={filters.municipality}
          onChange={(e) =>
            onChange({ ...filters, municipality: e.target.value })
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="all">Сите општини</option>
          {municipalities.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Училишта
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {SCHOOL_TYPES.map(([type, label]) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-slate-800/60 px-2 py-1.5 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                checked={filters.schoolTypes[type]}
                onChange={() =>
                  onChange({
                    ...filters,
                    schoolTypes: {
                      ...filters.schoolTypes,
                      [type]: !filters.schoolTypes[type],
                    },
                  })
                }
                className="accent-indigo-500"
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: SCHOOL_COLORS[type] }}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={filters.showSchools}
              onChange={() =>
                onChange({ ...filters, showSchools: !filters.showSchools })
              }
              className="accent-indigo-500"
            />
            Прикажи училишта
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={filters.showZones}
              onChange={() =>
                onChange({ ...filters, showZones: !filters.showZones })
              }
              className="accent-indigo-500"
            />
            Прикажи зони од 500 м
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={filters.showMunicipalities}
              onChange={() =>
                onChange({
                  ...filters,
                  showMunicipalities: !filters.showMunicipalities,
                })
              }
              className="accent-indigo-500"
            />
            Прикажи општини
          </label>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          Изборот влијае само на приказот — статусите секогаш се пресметуваат
          спрема сите основни и средни училишта, како што бара законот.
        </p>
      </fieldset>
    </div>
  );
}
