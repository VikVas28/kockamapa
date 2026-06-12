import { useState } from "react";
import StatsBar from "./StatsBar";
import Filters from "./Filters";
import VenueList from "./VenueList";
import LawPanel from "./LawPanel";
import {
  STATUS_COLORS_DARK,
  STATUS_ORDER,
  type ClassifiedVenue,
} from "../lib/compliance";
import {
  DEFAULT_FILTERS,
  isDefaultFilters,
  type FiltersState,
} from "../lib/filters";
import type { Status } from "../lib/types";

type Tab = "overview" | "law";

interface Props {
  counts: Record<Status, number>;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  municipalities: string[];
  items: ClassifiedVenue[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white"
        >
          {step}
        </span>
        {title}
      </h2>
      {hint && (
        <p className="mb-2 mt-0.5 pl-7 text-xs leading-snug text-slate-400">
          {hint}
        </p>
      )}
      <div className="pl-0">{children}</div>
    </section>
  );
}

export default function Sidebar({
  counts,
  filters,
  onFiltersChange,
  municipalities,
  items,
  selectedId,
  onSelect,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleStatus = (status: Status) =>
    onFiltersChange({
      ...filters,
      statuses: { ...filters.statuses, [status]: !filters.statuses[status] },
    });

  const handleSelect = (id: string) => {
    onSelect(id);
    setMobileOpen(false); // на мобилен, врати го фокусот на мапата
  };

  return (
    <aside className="order-2 flex shrink-0 flex-col border-t border-slate-800 bg-slate-900 text-slate-100 lg:order-1 lg:h-full lg:w-[400px] lg:border-r lg:border-t-0">
      {/* Рачка за мобилен (bottom sheet) */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="flex items-center justify-between gap-3 px-4 py-3 text-left lg:hidden"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">
            Игри на среќа — усогласеност
          </span>
          <span className="mt-0.5 flex gap-3 text-xs font-semibold">
            {STATUS_ORDER.map((s) => (
              <span key={s} style={{ color: STATUS_COLORS_DARK[s] }}>
                {counts[s]}
              </span>
            ))}
          </span>
        </span>
        <span aria-hidden className="text-slate-400">
          {mobileOpen ? "▾" : "▴"}
        </span>
      </button>

      <div
        className={`flex min-h-0 flex-col overflow-hidden transition-[height] duration-200 lg:h-auto lg:flex-1 ${
          mobileOpen ? "h-[62dvh]" : "h-0"
        }`}
      >
        <header className="hidden px-4 pb-2 pt-4 lg:block">
          <h1 className="text-lg font-bold">Игри на среќа — усогласеност</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Закон за игри на среќа (2026) · правило од 500 м од училишта
          </p>
        </header>

        <nav className="flex gap-1 px-4 pb-2 pt-1 lg:pt-0" aria-label="Панели">
          {(
            [
              ["overview", "Објекти"],
              ["law", "За законот"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === key
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
          {tab === "overview" ? (
            <>
              <Section
                step={1}
                title="Што да се прикажува"
                hint="Кликни на поле за да го сокриеш или прикажеш тој статус на мапата."
              >
                <StatsBar
                  counts={counts}
                  active={filters.statuses}
                  onToggle={toggleStatus}
                />
              </Section>

              <Section
                step={2}
                title="Најди објект"
                hint="Напиши име или избери општина од листата."
              >
                <Filters
                  filters={filters}
                  municipalities={municipalities}
                  onChange={onFiltersChange}
                />
                {!isDefaultFilters(filters) && (
                  <button
                    type="button"
                    onClick={() => onFiltersChange(DEFAULT_FILTERS)}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700"
                  >
                    ↺ Прикажи сè одново
                  </button>
                )}
              </Section>

              <Section
                step={3}
                title={`Листа на објекти (${items.length})`}
                hint="Кликни на објект — мапата ќе се приближи до него."
              >
                <VenueList
                  items={items}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              </Section>
            </>
          ) : (
            <LawPanel />
          )}
        </div>

        <footer className="border-t border-slate-800 px-4 py-2.5 text-[11px] leading-snug text-slate-400">
          Информативна алатка — не е официјален документ. Меродавни се
          регистрите на{" "}
          <a
            href="https://finance.gov.mk/mk-MK/oblasti/licenci-za-igri-na-srekja"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-200"
          >
            Министерството за финансии
          </a>{" "}
          и{" "}
          <a
            href="http://ujp.gov.mk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-200"
          >
            УЈП
          </a>
          . Непроверените локации се посебно означени.
        </footer>
      </div>
    </aside>
  );
}
