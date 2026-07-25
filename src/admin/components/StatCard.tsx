import type { ReactNode } from "react";
export function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="admin-panel admin-panel--compact">
      <div className="admin-panel__body">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="admin-eyebrow mb-0">{title}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
            {detail ? <p className="mt-1.5 text-[10px] leading-5 text-neutral-500">{detail}</p> : null}
          </div>
          {icon ? (
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-black/5 bg-[#f5f3ef] text-neutral-800">
              {icon}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
