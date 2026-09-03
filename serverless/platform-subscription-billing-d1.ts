import {
  resolveWorkspaceEntitlements,
  type ResolvedWorkspaceSubscription,
  type WorkspaceAccessState,
} from "./platform-entitlements-d1";

type D1Db = any;

export type WorkspaceSubscriptionBillingOverview = {
  workspaceId: string;
  resolvedAt: string;
  accessState: WorkspaceAccessState;
  plan: {
    id: string;
    key: string;
    name: string;
    description: string;
    type: "commercial" | "internal" | "promotional";
    public: boolean;
  } | null;
  subscription: ResolvedWorkspaceSubscription | null;
  price: {
    id: string;
    billingInterval: "month" | "year";
    intervalCount: number;
    currency: string;
    unitAmountMinor: number;
    status: "draft" | "active" | "grandfathered" | "retired";
  } | null;
  customer: {
    provider: "stripe";
    configured: boolean;
    lastSyncedAt: string | null;
  } | null;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function nullableText(value: unknown) {
  const result = text(value);
  return result || null;
}

function integer(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? Math.trunc(result) : fallback;
}

export async function getWorkspaceSubscriptionBillingOverview(
  db: D1Db,
  workspaceIdInput: string,
): Promise<WorkspaceSubscriptionBillingOverview> {
  const workspaceId = text(workspaceIdInput);
  if (!workspaceId) {
    const error = new Error("Workspace ID is required to load subscription billing.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const resolved = await resolveWorkspaceEntitlements(
    db,
    workspaceId,
  );

  const subscriptionId = text(resolved.subscription?.id);
  const planId = text(resolved.subscription?.planId);

  const [planRow, priceRow, customerRow] = await Promise.all([
    planId
      ? db.prepare(`
          SELECT
            id,
            plan_key,
            name,
            description,
            plan_type,
            is_public
          FROM platform_plans
          WHERE id = ?
          LIMIT 1
        `).bind(planId).first()
      : Promise.resolve(null),

    subscriptionId
      ? db.prepare(`
          SELECT
            price.id,
            price.billing_interval,
            price.interval_count,
            price.currency,
            price.unit_amount_minor,
            price.status
          FROM workspace_subscriptions subscription
          LEFT JOIN platform_plan_prices price
            ON price.id = subscription.plan_price_id
          WHERE subscription.id = ?
            AND subscription.workspace_id = ?
          LIMIT 1
        `).bind(
          subscriptionId,
          workspaceId,
        ).first()
      : Promise.resolve(null),

    db.prepare(`
      SELECT
        provider,
        CASE
          WHEN trim(provider_customer_id) <> '' THEN 1
          ELSE 0
        END AS configured,
        last_synced_at
      FROM workspace_billing_customers
      WHERE workspace_id = ?
      LIMIT 1
    `).bind(workspaceId).first(),
  ]);

  return {
    workspaceId,
    resolvedAt: resolved.resolvedAt,
    accessState: resolved.accessState,
    plan: planRow
      ? {
          id: text(planRow.id),
          key: text(planRow.plan_key),
          name: text(planRow.name),
          description: text(planRow.description),
          type: (
            ["internal", "promotional"].includes(text(planRow.plan_type))
              ? text(planRow.plan_type)
              : "commercial"
          ) as "commercial" | "internal" | "promotional",
          public: bool(planRow.is_public),
        }
      : null,
    subscription: resolved.subscription,
    price: priceRow?.id
      ? {
          id: text(priceRow.id),
          billingInterval: (
            text(priceRow.billing_interval) === "year"
              ? "year"
              : "month"
          ),
          intervalCount: Math.max(1, integer(priceRow.interval_count, 1)),
          currency: text(priceRow.currency).toUpperCase() || "GBP",
          unitAmountMinor: Math.max(0, integer(priceRow.unit_amount_minor)),
          status: (
            ["active", "grandfathered", "retired"].includes(text(priceRow.status))
              ? text(priceRow.status)
              : "draft"
          ) as "draft" | "active" | "grandfathered" | "retired",
        }
      : null,
    customer: customerRow
      ? {
          provider: "stripe",
          configured: bool(customerRow.configured),
          lastSyncedAt: nullableText(customerRow.last_synced_at),
        }
      : null,
  };
}
