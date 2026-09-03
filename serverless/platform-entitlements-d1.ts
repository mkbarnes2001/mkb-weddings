type D1Db = any;

export type WorkspaceSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "complimentary";

export type WorkspaceAccessState =
  | "full"
  | "grace"
  | "recovery";

export type ResolvedWorkspaceEntitlement = {
  featureKey: string;
  name: string;
  description: string;
  unitLabel: string;
  enabled: boolean;
  limit: number | null;
  source: "plan" | "trial" | "manual" | "internal" | "none";
};

export type ResolvedWorkspaceSubscription = {
  id: string;
  planId: string;
  planKey: string;
  planName: string;
  provider: "stripe" | "internal";
  status: WorkspaceSubscriptionStatus;
  billingInterval: "none" | "month" | "year";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  cancelledAt: string | null;
  endedAt: string | null;
  pastDueSince: string | null;
  graceExpiresAt: string | null;
};

export type ResolvedWorkspaceAccess = {
  workspaceId: string;
  resolvedAt: string;
  accessState: WorkspaceAccessState;
  subscription: ResolvedWorkspaceSubscription | null;
  entitlements: ResolvedWorkspaceEntitlement[];
  byKey: Record<string, ResolvedWorkspaceEntitlement>;
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

function nullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? Math.trunc(result) : null;
}

function timestamp(value: unknown) {
  const candidate = nullableText(value);
  if (!candidate) return null;
  const milliseconds = Date.parse(candidate);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function isFuture(value: unknown, nowMs: number) {
  const milliseconds = timestamp(value);
  return milliseconds !== null && milliseconds > nowMs;
}

function subscriptionAccessState(
  subscription: any,
  nowMs: number,
): WorkspaceAccessState {
  if (!subscription) return "recovery";

  const status = text(subscription.status) as WorkspaceSubscriptionStatus;

  if (status === "complimentary" || status === "active") {
    return "full";
  }

  if (status === "trialing") {
    const trialEnd = nullableText(subscription.trial_end);
    return !trialEnd || isFuture(trialEnd, nowMs)
      ? "full"
      : "recovery";
  }

  if (status === "past_due") {
    return isFuture(subscription.grace_expires_at, nowMs)
      ? "grace"
      : "recovery";
  }

  if (status === "cancelled") {
    return isFuture(subscription.current_period_end, nowMs)
      ? "full"
      : "recovery";
  }

  return "recovery";
}

function hydrateSubscription(row: any): ResolvedWorkspaceSubscription | null {
  if (!row) return null;

  return {
    id: text(row.id),
    planId: text(row.plan_id),
    planKey: text(row.plan_key),
    planName: text(row.plan_name),
    provider: text(row.provider) === "internal" ? "internal" : "stripe",
    status: text(row.status) as WorkspaceSubscriptionStatus,
    billingInterval: (
      ["month", "year"].includes(text(row.billing_interval))
        ? text(row.billing_interval)
        : "none"
    ) as "none" | "month" | "year",
    currentPeriodStart: nullableText(row.current_period_start),
    currentPeriodEnd: nullableText(row.current_period_end),
    trialStart: nullableText(row.trial_start),
    trialEnd: nullableText(row.trial_end),
    cancelAtPeriodEnd: bool(row.cancel_at_period_end),
    cancelAt: nullableText(row.cancel_at),
    cancelledAt: nullableText(row.cancelled_at),
    endedAt: nullableText(row.ended_at),
    pastDueSince: nullableText(row.past_due_since),
    graceExpiresAt: nullableText(row.grace_expires_at),
  };
}

export async function resolveWorkspaceEntitlements(
  db: D1Db,
  workspaceIdInput: string,
  nowInput: Date = new Date(),
): Promise<ResolvedWorkspaceAccess> {
  const workspaceId = text(workspaceIdInput);
  if (!workspaceId) {
    throw new Error("Workspace ID is required to resolve entitlements.");
  }

  const workspace = await db.prepare(`
    SELECT id
    FROM workspaces
    WHERE id = ?
    LIMIT 1
  `).bind(
    workspaceId,
  ).first();

  if (!workspace) {
    throw new Error("Business workspace not found.");
  }

  const resolvedAt = nowInput.toISOString();
  const nowMs = nowInput.getTime();

  const subscriptionRow = await db.prepare(`
    SELECT
      subscription.*,
      plan.plan_key,
      plan.name AS plan_name
    FROM workspace_subscriptions subscription
    JOIN platform_plans plan
      ON plan.id = subscription.plan_id
    WHERE subscription.workspace_id = ?
      AND subscription.is_current = 1
    LIMIT 1
  `).bind(
    workspaceId,
  ).first();

  const planId = text(subscriptionRow?.plan_id);
  const accessState = subscriptionAccessState(
    subscriptionRow,
    nowMs,
  );

  const [featureRows, overrideRows] = await Promise.all([
    db.prepare(`
      SELECT
        feature.feature_key,
        feature.name,
        feature.description,
        feature.unit_label,
        plan_entitlement.enabled AS plan_enabled,
        plan_entitlement.limit_value AS plan_limit
      FROM platform_features feature
      LEFT JOIN platform_plan_entitlements plan_entitlement
        ON plan_entitlement.feature_key = feature.feature_key
       AND plan_entitlement.plan_id = ?
      WHERE feature.status = 'active'
      ORDER BY feature.sort_order, feature.name
    `).bind(
      planId,
    ).all(),
    db.prepare(`
      SELECT
        feature_key,
        source,
        enabled,
        limit_value
      FROM workspace_entitlements
      WHERE workspace_id = ?
        AND (
          starts_at IS NULL
          OR trim(starts_at) = ''
          OR datetime(starts_at) <= datetime(?)
        )
        AND (
          ends_at IS NULL
          OR trim(ends_at) = ''
          OR datetime(ends_at) > datetime(?)
        )
    `).bind(
      workspaceId,
      resolvedAt,
      resolvedAt,
    ).all(),
  ]);

  const overrides = new Map<string, any>(
    (overrideRows.results || []).map(
      (row: any) => [text(row.feature_key), row],
    ),
  );

  const planAccessEnabled = accessState !== "recovery";

  const entitlements = (featureRows.results || []).map(
    (row: any): ResolvedWorkspaceEntitlement => {
      const featureKey = text(row.feature_key);
      const override = overrides.get(featureKey);

      if (override) {
        return {
          featureKey,
          name: text(row.name),
          description: text(row.description),
          unitLabel: text(row.unit_label),
          enabled: bool(override.enabled),
          limit: nullableInt(override.limit_value),
          source: text(override.source) as
            | "plan"
            | "trial"
            | "manual"
            | "internal",
        };
      }

      if (planAccessEnabled && bool(row.plan_enabled)) {
        return {
          featureKey,
          name: text(row.name),
          description: text(row.description),
          unitLabel: text(row.unit_label),
          enabled: true,
          limit: nullableInt(row.plan_limit),
          source: "plan",
        };
      }

      return {
        featureKey,
        name: text(row.name),
        description: text(row.description),
        unitLabel: text(row.unit_label),
        enabled: false,
        limit: null,
        source: "none",
      };
    },
  );

  return {
    workspaceId,
    resolvedAt,
    accessState,
    subscription: hydrateSubscription(subscriptionRow),
    entitlements,
    byKey: Object.fromEntries(
      entitlements.map((entitlement) => [
        entitlement.featureKey,
        entitlement,
      ]),
    ),
  };
}

export async function hasWorkspaceEntitlement(
  db: D1Db,
  workspaceId: string,
  featureKeyInput: string,
  nowInput: Date = new Date(),
) {
  const featureKey = text(featureKeyInput);
  if (!featureKey) return false;

  const resolved = await resolveWorkspaceEntitlements(
    db,
    workspaceId,
    nowInput,
  );

  return resolved.byKey[featureKey]?.enabled === true;
}



export async function requireWorkspaceEntitlement(
  db: D1Db,
  workspaceIdInput: string,
  featureKeyInput: string,
  nowInput: Date = new Date(),
) {
  const workspaceId = text(workspaceIdInput);
  const featureKey = text(featureKeyInput);

  if (!workspaceId || !featureKey) {
    const error = new Error(
      "Workspace entitlement context is incomplete.",
    ) as Error & {
      statusCode?: number;
      featureKey?: string;
      accessState?: WorkspaceAccessState;
    };

    error.statusCode = 500;
    error.featureKey = featureKey;

    throw error;
  }

  const resolved = await resolveWorkspaceEntitlements(
    db,
    workspaceId,
    nowInput,
  );

  const entitlement = resolved.byKey[featureKey];

  if (!entitlement?.enabled) {
    const error = new Error(
      "This feature is not available for this workspace.",
    ) as Error & {
      statusCode?: number;
      featureKey?: string;
      accessState?: WorkspaceAccessState;
    };

    error.statusCode = 403;
    error.featureKey = featureKey;
    error.accessState = resolved.accessState;

    throw error;
  }

  return {
    entitlement,
    accessState: resolved.accessState,
    subscription: resolved.subscription,
  };
}
