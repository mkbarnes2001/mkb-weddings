import type { ReactNode } from "react";
import type { AiStatus } from "../types";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const classes = {
    neutral: "admin-status--neutral",
    green: "admin-status--success",
    amber: "admin-status--warning",
    red: "admin-status--danger",
  };

  return <span className={`admin-status ${classes[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: AiStatus }) {
  if (status === "ready") return <Badge tone="green">Ready</Badge>;
  if (status === "warning") return <Badge tone="amber">Needs check</Badge>;
  return <Badge tone="red">Missing data</Badge>;
}
