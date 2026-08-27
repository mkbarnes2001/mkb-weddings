import {
  useEffect,
  useState,
} from "react";

import {
  Banknote,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import {
  AdminButton,
  AdminField,
  AdminPage,
  AdminPageHeader,
  AdminPanel,
  AdminStatus,
} from "../components/ui/AdminUI";

import {
  useProfessionalAuth,
} from "../auth/ProfessionalAuth";

import {
  AdminApiService,
} from "../services/AdminApiService";

import type {
  CrmPaymentSettings,
} from "../types/crm";


function displayDate(
  value: string,
) {
  if (!value) {
    return "Not yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}


function stripeStatusLabel(
  status:
    CrmPaymentSettings["stripe"]["connectionStatus"],
) {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "restricted") {
    return "Action required";
  }

  if (status === "pending") {
    return "Setup incomplete";
  }

  return "Not connected";
}


function stripeStatusTone(
  status:
    CrmPaymentSettings["stripe"]["connectionStatus"],
):
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info" {
  if (status === "ready") {
    return "success";
  }

  if (
    status === "restricted"
    || status === "pending"
  ) {
    return "warning";
  }

  return "neutral";
}


export function CRMPaymentSetup() {
  const { auth } =
    useProfessionalAuth();

  const canManage =
    auth.permissions.includes(
      "crm:manage",
    )
    && auth.accessMode !== "support";

  const [
    settings,
    setSettings,
  ] =
    useState<CrmPaymentSettings | null>(
      null,
    );

  const [
    stripeConnectConfigured,
    setStripeConnectConfigured,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    providerBusy,
    setProviderBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");


  async function load() {
    setLoading(true);
    setError("");

    try {
      const result =
        await AdminApiService
          .getCrmPaymentSettings();

      setSettings(
        result.settings,
      );

      setStripeConnectConfigured(
        result
          .stripeConnectConfigured,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load payment setup.",
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void load();

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const stripeResult =
      params.get("stripe");

    if (
      stripeResult === "connected"
    ) {
      setMessage(
        "Stripe connected. Review the account status below before enabling card payments.",
      );
    }

    if (
      stripeResult === "error"
    ) {
      setError(
        params.get(
          "stripeMessage",
        )
        || "Stripe connection was not completed.",
      );
    }
  }, []);


  function patch(
    next:
      Partial<CrmPaymentSettings>,
  ) {
    setSettings(
      (current) =>
        current
          ? {
              ...current,
              ...next,
            }
          : current,
    );
  }


  async function save() {
    if (
      !settings
      || !canManage
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result =
        await AdminApiService
          .saveCrmPaymentSettings({
            cardPaymentsEnabled:
              settings
                .cardPaymentsEnabled,

            bankTransferEnabled:
              settings
                .bankTransferEnabled,

            bankAccountName:
              settings
                .bankAccountName,

            bankName:
              settings
                .bankName,

            bankSortCode:
              settings
                .bankSortCode,

            bankAccountNumber:
              settings
                .bankAccountNumber,

            bankIban:
              settings
                .bankIban,

            bankBic:
              settings
                .bankBic,

            bankTransferInstructions:
              settings
                .bankTransferInstructions,
          });

      setSettings(
        result.settings,
      );

      setStripeConnectConfigured(
        result
          .stripeConnectConfigured,
      );

      setMessage(
        "Payment setup saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payment setup.",
      );
    } finally {
      setSaving(false);
    }
  }


  async function setupStripe() {
    if (!canManage) {
      return;
    }

    setProviderBusy(true);
    setError("");
    setMessage("");

    try {
      const connection =
        await AdminApiService
          .startCrmStripeOnboarding();

      if (
        !connection
          .authorizationUrl
      ) {
        throw new Error(
          "Stripe authorization URL was not returned.",
        );
      }

      window.location.assign(
        connection
          .authorizationUrl,
      );
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start Stripe connection.",
      );

      setProviderBusy(false);
    }
  }

  async function connectStripe() {
    if (!canManage) {
      return;
    }

    setProviderBusy(true);
    setError("");
    setMessage("");

    try {
      const connection =
        await AdminApiService
          .startCrmStripeConnection();

      if (
        !connection
          .authorizationUrl
      ) {
        throw new Error(
          "Stripe authorization URL was not returned.",
        );
      }

      window.location.assign(
        connection
          .authorizationUrl,
      );
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start Stripe connection.",
      );

      setProviderBusy(false);
    }
  }


  async function syncStripe() {
    if (!canManage) {
      return;
    }

    setProviderBusy(true);
    setError("");
    setMessage("");

    try {
      const next =
        await AdminApiService
          .syncCrmStripeConnection();

      setSettings(next);

      setMessage(
        "Stripe account status refreshed.",
      );
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Unable to refresh Stripe account.",
      );
    } finally {
      setProviderBusy(false);
    }
  }


  async function disconnectStripe() {
    if (
      !canManage
      || !settings?.stripe
        .accountId
    ) {
      return;
    }

    if (
      !window.confirm(
        "Disconnect Stripe from this business? Online card payments will be disabled.",
      )
    ) {
      return;
    }

    setProviderBusy(true);
    setError("");
    setMessage("");

    try {
      const next =
        await AdminApiService
          .disconnectCrmStripeConnection();

      setSettings(next);

      setMessage(
        "Stripe disconnected.",
      );
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Unable to disconnect Stripe.",
      );
    } finally {
      setProviderBusy(false);
    }
  }


  if (
    loading
    && !settings
  ) {
    return (
      <AdminPage
        className="crm-payment-setup-page"
      >
        <AdminPageHeader
          eyebrow="Payments"
          title="Payment setup"
          description="Loading payment methods…"
        />
      </AdminPage>
    );
  }


  const stripe =
    settings?.stripe;

  const stripeConnected =
    Boolean(
      stripe?.accountId,
    );

  const stripeReady =
    stripe?.connectionStatus
    === "ready";


  return (
    <AdminPage
      className="crm-payment-setup-page"
    >
      <AdminPageHeader
        eyebrow="Payments"
        title="Payment setup"
        description="Choose how clients can pay WedCRM invoices. Payment schedules remain configured separately."
      />

      {error ? (
        <div className="admin-alert admin-alert--danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {!canManage ? (
        <div className="admin-alert admin-alert--warning">
          Payment setup is read-only with your current access.
        </div>
      ) : null}

      {settings ? (
        <div className="crm-payment-setup-stack">
          <AdminPanel
            title="Stripe"
            description="Accept secure online card payments directly into your connected Stripe account."
            icon={CreditCard}
          >
            <div className="crm-payment-provider-state">
              <div
                className={
                  `crm-payment-provider-state__icon${
                    stripeReady
                      ? " success"
                      : ""
                  }`
                }
              >
                <CreditCard />
              </div>

              <div className="crm-payment-provider-state__body">
                <strong>
                  {stripeConnected
                    ? "Stripe connected"
                    : "Connect Stripe"}
                </strong>

                <p>
                  {stripeConnected
                    ? stripeReady
                      ? "Your Stripe account is ready to receive WedCRM invoice payments."
                      : "Stripe is connected, but account setup or verification still needs attention."
                    : "Connect an existing Stripe account or create one through Stripe."}
                </p>

                {stripeConnected ? (
                  <small>
                    {stripe?.accountId}
                    {stripe?.country
                      ? ` · ${stripe.country}`
                      : ""}
                    {stripe?.defaultCurrency
                      ? ` · ${stripe.defaultCurrency}`
                      : ""}
                  </small>
                ) : null}
              </div>

              <AdminStatus
                tone={
                  stripeStatusTone(
                    stripe?.connectionStatus
                    || "disconnected",
                  )
                }
              >
                {stripeStatusLabel(
                  stripe?.connectionStatus
                  || "disconnected",
                )}
              </AdminStatus>
            </div>

            {stripeConnected ? (
              <>
                <div className="crm-payment-readiness-grid">
                  <div>
                    <span>
                      Account details
                    </span>

                    <strong>
                      {stripe
                        ?.detailsSubmitted
                        ? "Submitted"
                        : "Incomplete"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Card charges
                    </span>

                    <strong>
                      {stripe
                        ?.chargesEnabled
                        ? "Enabled"
                        : "Unavailable"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Payouts
                    </span>

                    <strong>
                      {stripe
                        ?.payoutsEnabled
                        ? "Enabled"
                        : "Unavailable"}
                    </strong>
                  </div>
                </div>

                <div className="crm-payment-provider-meta">
                  <span>
                    Last checked
                  </span>

                  <strong>
                    {displayDate(
                      stripe
                        ?.lastSyncedAt
                        || "",
                    )}
                  </strong>
                </div>
              </>
            ) : null}

            <label className="crm-payment-method-toggle">
              <input
                type="checkbox"
                checked={
                  settings
                    .cardPaymentsEnabled
                }
                disabled={
                  !canManage
                  || saving
                  || !stripeReady
                }
                onChange={(
                  event,
                ) =>
                  patch({
                    cardPaymentsEnabled:
                      event
                        .target
                        .checked,
                  })
                }
              />

              <span>
                <strong>
                  Enable card payments
                </strong>

                <small>
                  {stripeReady
                    ? "Clients can be offered Stripe payment on eligible invoice instalments."
                    : "Stripe must be connected and fully ready before card payments can be enabled."}
                </small>
              </span>
            </label>

            <div className="crm-payment-provider-actions">
              {!stripeConnected ? (
                <>
                  <AdminButton
                    variant="primary"
                    size="sm"
                    icon={ExternalLink}
                    disabled={
                      !canManage
                      || providerBusy
                      || !stripeConnectConfigured
                    }
                    onClick={() =>
                      void setupStripe()
                    }
                  >
                    {providerBusy
                      ? "Opening Stripe…"
                      : "Set up Stripe"}
                  </AdminButton>

                  <AdminButton
                    variant="secondary"
                    size="sm"
                    icon={ExternalLink}
                    disabled={
                      !canManage
                      || providerBusy
                      || !stripeConnectConfigured
                    }
                    onClick={() =>
                      void connectStripe()
                    }
                  >
                    Connect existing Stripe
                  </AdminButton>
                </>
              ) : (
                <>
                  {!stripeReady ? (
                    <AdminButton
                      variant="primary"
                      size="sm"
                      icon={ExternalLink}
                      disabled={
                        !canManage
                        || providerBusy
                      }
                      onClick={() =>
                        void setupStripe()
                      }
                    >
                      Continue setup
                    </AdminButton>
                  ) : null}

                  <AdminButton
                    variant="secondary"
                    size="sm"
                    icon={RefreshCw}
                    disabled={
                      !canManage
                      || providerBusy
                    }
                    onClick={() =>
                      void syncStripe()
                    }
                  >
                    Refresh status
                  </AdminButton>

                  <AdminButton
                    variant="danger"
                    size="sm"
                    icon={Unplug}
                    disabled={
                      !canManage
                      || providerBusy
                    }
                    onClick={() =>
                      void disconnectStripe()
                    }
                  >
                    Disconnect
                  </AdminButton>
                </>
              )}

              {!stripeConnectConfigured ? (
                <small className="crm-payment-provider-actions__note">
                  Stripe Connect is not configured for this WedPlanned environment yet.
                </small>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel
            title="Bank transfer"
            description="Show your own bank details and payment instructions to clients."
            icon={Banknote}
          >
            <label className="crm-payment-method-toggle">
              <input
                type="checkbox"
                checked={
                  settings
                    .bankTransferEnabled
                }
                disabled={
                  !canManage
                  || saving
                }
                onChange={(
                  event,
                ) =>
                  patch({
                    bankTransferEnabled:
                      event
                        .target
                        .checked,
                  })
                }
              />

              <span>
                <strong>
                  Enable bank transfer
                </strong>

                <small>
                  Bank transfers remain externally settled and can be recorded against the invoice from WedCRM.
                </small>
              </span>
            </label>

            <div className="crm-payment-bank-grid">
              <AdminField
                label="Account name"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankAccountName
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankAccountName:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="Bank name"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankName
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankName:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="Sort code"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankSortCode
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankSortCode:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="Account number"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankAccountNumber
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankAccountNumber:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="IBAN"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankIban
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankIban:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField
                label="BIC / SWIFT"
              >
                <input
                  className="admin-input"
                  value={
                    settings
                      .bankBic
                  }
                  disabled={
                    !canManage
                    || saving
                  }
                  onChange={(
                    event,
                  ) =>
                    patch({
                      bankBic:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>
            </div>

            <AdminField
              label="Payment instructions"
              help="Optional wording shown with your bank transfer details, for example the reference clients should use."
            >
              <textarea
                className="admin-textarea"
                rows={4}
                value={
                  settings
                    .bankTransferInstructions
                }
                disabled={
                  !canManage
                  || saving
                }
                onChange={(
                  event,
                ) =>
                  patch({
                    bankTransferInstructions:
                      event
                        .target
                        .value,
                  })
                }
              />
            </AdminField>
          </AdminPanel>

          <div className="crm-payment-security-note">
            <ShieldCheck />

            <div>
              <strong>
                Business-owned payment configuration
              </strong>

              <p>
                WedPlanned stores your connected Stripe account identity and readiness only. Stripe credentials and OAuth access tokens are not stored against the business.
              </p>
            </div>
          </div>

          <div className="crm-payment-setup-actions">
            <AdminButton
              variant="primary"
              icon={CheckCircle2}
              disabled={
                !canManage
                || saving
              }
              onClick={() =>
                void save()
              }
            >
              {saving
                ? "Saving…"
                : "Save payment setup"}
            </AdminButton>

            {settings
              .bankTransferEnabled
              && !settings
                .bankAccountNumber
              && !settings.bankIban
              && !settings
                .bankTransferInstructions ? (
                <span className="crm-payment-setup-warning">
                  <CircleAlert />
                  Add bank details or instructions before saving bank transfer as enabled.
                </span>
              ) : null}
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
