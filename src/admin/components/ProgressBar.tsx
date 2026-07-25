import { percentage } from "../utils/format";

export function ProgressBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = percentage(done, total);

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px] text-neutral-600">
        <span>{label}</span>
        <span>{done}/{total} · {pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
        <div className="h-full rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
