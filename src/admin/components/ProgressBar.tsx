import { percentage } from "../utils/format";

export function ProgressBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = percentage(done, total);

  return (
    <div>
      <div className="admin-progress-label">
        <span>{label}</span>
        <span>{done}/{total} · {pct}%</span>
      </div>
      <div className="admin-progress-track" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="admin-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
