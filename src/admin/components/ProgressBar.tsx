import { percentage } from "../utils/format";

export function ProgressBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = percentage(done, total);

  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-600 mb-2">
        <span>{label}</span>
        <span>
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-black transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
