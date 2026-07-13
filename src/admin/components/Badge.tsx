import type { AiStatus } from "../types";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const classes = {
    neutral: "bg-white text-neutral-700 border-black/10",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${classes[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: AiStatus }) {
  if (status === "ready") return <Badge tone="green">Ready</Badge>;
  if (status === "warning") return <Badge tone="amber">Needs check</Badge>;
  return <Badge tone="red">Missing data</Badge>;
}
