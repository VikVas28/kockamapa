import {
  STATUS_COLORS_DARK,
  STATUS_LABELS,
  STATUS_ORDER,
} from "../lib/compliance";
import type { Status } from "../lib/types";

interface Props {
  counts: Record<Status, number>;
  active: Record<Status, boolean>;
  onToggle: (status: Status) => void;
}

// Три квадрати едно до друго — голема бројка, кликни за прикажи/сокриј.
export default function StatsBar({ counts, active, onToggle }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Филтер по статус">
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onToggle(s)}
          aria-pressed={active[s]}
          title={
            active[s]
              ? "Кликни за да го сокриеш овој статус"
              : "Кликни за да го прикажеш овој статус"
          }
          className={`rounded-lg border px-2 py-2 text-left transition ${
            active[s]
              ? "border-slate-600 bg-slate-800 hover:bg-slate-700/70"
              : "border-slate-800 bg-slate-900 opacity-50 hover:opacity-75"
          }`}
        >
          <span
            className="block text-xl font-bold tabular-nums"
            style={{ color: STATUS_COLORS_DARK[s] }}
          >
            {counts[s]}
          </span>
          <span className="block text-[11px] leading-tight text-slate-300">
            {STATUS_LABELS[s]}
          </span>
        </button>
      ))}
    </div>
  );
}
