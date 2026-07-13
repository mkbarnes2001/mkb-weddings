export function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white/75 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 mb-3">{title}</p>
          <p className="text-4xl font-serif text-neutral-950 tracking-tight">{value}</p>
          {detail ? <p className="text-sm text-neutral-500 mt-3">{detail}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-2xl bg-[#f5f3ef] border border-black/5 p-3 text-neutral-800">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
