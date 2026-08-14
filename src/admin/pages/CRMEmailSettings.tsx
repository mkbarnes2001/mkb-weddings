import {
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Mail,
  Save,
  Server,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import {
  Link,
} from "react-router-dom";
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
  CrmEmailDeliveryMode,
  CrmEmailSettings,
  CrmEmailSettingsInput,
  CrmEmailSignature,
  CrmEmailSmtpSecurity,
} from "../types/crm";

const emptySignature:
  CrmEmailSignature = {
    name: "",
    jobTitle: "",
    businessName: "",
    phone: "",
    website: "",
    text: "",
  };

const emptySettings:
  CrmEmailSettings = {
    deliveryMode: "managed",
    senderName: "",
    senderEmail: "",
    replyToEmail: "",
    signatureEnabled: true,
    signature: {
      ...emptySignature,
    },
    googleEmail: "",
    googleConnected: false,
    smtpHost: "",
    smtpPort: 587,
    smtpSecurity: "starttls",
    smtpUsername: "",
    smtpCredentialConfigured: false,
    lastTestStatus: "",
  };

function statusTone(
  status: string,
) {
  return status === "passed"
    ? "success"
    : status === "failed"
      ? "danger"
      : "neutral";
}

export function CRMEmailSettings() {
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
  ] = useState<CrmEmailSettings>({
    ...emptySettings,
  });

  const [
    smtpPassword,
    setSmtpPassword,
  ] = useState("");

  const [
    googleConnecting,
    setGoogleConnecting,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const current =
        await AdminApiService
          .getCrmEmailSettings();

      setSettings({
        ...emptySettings,
        ...current,
        signature: {
          ...emptySignature,
          ...(current.signature || {}),
        },
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load email settings.",
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

    const googleResult =
      params.get("google");

    if (
      googleResult
      === "connected"
    ) {
      setMessage(
        "Google account connected. Select Google / Gmail above and save when you want CRM email to use it.",
      );

      window.history.replaceState(
        {},
        "",
        "/admin/crm/email-settings",
      );
    } else if (
      googleResult
      === "error"
    ) {
      setError(
        "Google email connection could not be completed. No existing email credentials were changed.",
      );

      window.history.replaceState(
        {},
        "",
        "/admin/crm/email-settings",
      );
    }
  }, [auth.workspaceId]);

  function update(
    patch:
      Partial<CrmEmailSettings>,
  ) {
    setSettings(
      (current) => ({
        ...current,
        ...patch,
      }),
    );
  }

  function updateSignature(
    patch:
      Partial<CrmEmailSignature>,
  ) {
    setSettings(
      (current) => ({
        ...current,
        signature: {
          ...current.signature,
          ...patch,
        },
      }),
    );
  }

  async function save() {

    if (
      settings
      && settings.deliveryMode
        === "smtp"
      && Number(
        settings.smtpPort,
      ) === 25
    ) {
      setError(
        "Port 25 is not supported. Use your provider's secure submission port, normally 465 or 587.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const input:
        CrmEmailSettingsInput = {
          deliveryMode:
            settings.deliveryMode,
          senderName:
            settings.senderName,
          senderEmail:
            settings.senderEmail,
          replyToEmail:
            settings.replyToEmail,
          signatureEnabled:
            settings.signatureEnabled,
          signature:
            settings.signature,
          googleEmail:
            settings.googleEmail,
          smtpHost:
            settings.smtpHost,
          smtpPort:
            settings.smtpPort,
          smtpSecurity:
            settings.smtpSecurity,
          smtpUsername:
            settings.smtpUsername,
          ...(smtpPassword
            ? {
                smtpPassword,
              }
            : {}),
        };

      const saved =
        await AdminApiService
          .saveCrmEmailSettings(
            input,
          );

      setSettings({
        ...emptySettings,
        ...saved,
        signature: {
          ...emptySignature,
          ...(saved.signature || {}),
        },
      });

      setSmtpPassword("");
      setMessage(
        "Email settings saved.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save email settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function connectGoogle() {
    setGoogleConnecting(true);
    setError("");
    setMessage("");

    try {
      const connection =
        await AdminApiService
          .startCrmGoogleEmailConnection();

      if (
        !connection
          .authorizationUrl
      ) {
        throw new Error(
          "Google authorization URL was not returned.",
        );
      }

      window.location.assign(
        connection
          .authorizationUrl,
      );
    } catch (connectError) {
      setError(
        connectError
          instanceof Error
          ? connectError.message
          : "Unable to start the Google email connection.",
      );

      setGoogleConnecting(false);
    }
  }

  async function disconnect(
    provider:
      "google" | "smtp",
  ) {
    const label =
      provider === "google"
        ? "Google"
        : "SMTP";

    if (
      !window.confirm(
        `Disconnect ${label} email delivery? If it is currently active, CRM delivery will return to managed WedPlanned email.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved =
        await AdminApiService
          .disconnectCrmEmailProvider(
            provider,
          );

      setSettings({
        ...emptySettings,
        ...saved,
        signature: {
          ...emptySignature,
          ...(saved.signature || {}),
        },
      });

      setSmtpPassword("");
      setMessage(
        `${label} email delivery disconnected.`,
      );
    } catch (disconnectError) {
      setError(
        disconnectError
          instanceof Error
          ? disconnectError.message
          : `Unable to disconnect ${label}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminPage>
        <p className="text-sm text-neutral-500">
          Loading email settings…
        </p>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow={
          <Link
            to="/admin/crm"
            className="admin-inline-link inline-flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            WedCRM
          </Link>
        }
        title="Email settings"
        description="Choose how this business sends CRM correspondence. Authentication and security emails always remain on WedPlanned-managed delivery."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/crm/templates"
              className="admin-button admin-button--secondary"
            >
              <Mail className="admin-button__icon" />
              Email templates
            </Link>

            {canManage ? (
              <AdminButton
                variant="primary"
                icon={Save}
                disabled={saving}
                onClick={() =>
                  void save()
                }
              >
                {saving
                  ? "Saving…"
                  : "Save settings"}
              </AdminButton>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="admin-alert admin-alert--error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="admin-alert admin-alert--success">
          {message}
        </div>
      ) : null}

      {!canManage ? (
        <div className="admin-alert">
          Email settings are read-only in this session.
        </div>
      ) : null}

      <section className="crm-email-delivery-grid">
        <button
          type="button"
          className={
            settings.deliveryMode
            === "managed"
              ? "crm-email-delivery-card active"
              : "crm-email-delivery-card"
          }
          disabled={!canManage}
          onClick={() =>
            update({
              deliveryMode:
                "managed",
            })
          }
        >
          <span className="crm-email-delivery-card__icon">
            <ShieldCheck />
          </span>

          <span className="crm-email-delivery-card__body">
            <strong>
              Managed by WedPlanned
            </strong>

            <small>
              Send CRM messages through the WedPlanned mail service. Replies can still go directly to your business address.
            </small>
          </span>

          <AdminStatus
            tone={
              settings.deliveryMode
              === "managed"
                ? "success"
                : "neutral"
            }
          >
            {settings.deliveryMode
            === "managed"
              ? "Active"
              : "Available"}
          </AdminStatus>
        </button>

        <button
          type="button"
          className={
            settings.deliveryMode
            === "google"
              ? "crm-email-delivery-card active"
              : "crm-email-delivery-card"
          }
          disabled={
            !canManage
            || !settings
              .googleConnected
          }
          onClick={() =>
            update({
              deliveryMode:
                "google",
            })
          }
        >
          <span className="crm-email-delivery-card__icon">
            <Mail />
          </span>

          <span className="crm-email-delivery-card__body">
            <strong>
              Google / Gmail
            </strong>

            <small>
              Send CRM correspondence through a connected Google mailbox.
            </small>
          </span>

          <AdminStatus
            tone={
              settings
                .googleConnected
                ? settings.deliveryMode
                  === "google"
                    ? "success"
                    : "info"
                : "neutral"
            }
          >
            {settings
              .googleConnected
              ? settings.deliveryMode
                === "google"
                  ? "Active"
                  : "Connected"
              : "Not connected"}
          </AdminStatus>
        </button>

        <button
          type="button"
          className={
            settings.deliveryMode
            === "smtp"
              ? "crm-email-delivery-card active"
              : "crm-email-delivery-card"
          }
          disabled={
            !canManage
            || !settings
              .smtpCredentialConfigured
          }
          onClick={() =>
            update({
              deliveryMode:
                "smtp",
            })
          }
        >
          <span className="crm-email-delivery-card__icon">
            <Server />
          </span>

          <span className="crm-email-delivery-card__body">
            <strong>
              Custom SMTP
            </strong>

            <small>
              Use your own mail provider with TLS or STARTTLS credentials stored securely by WedPlanned.
            </small>
          </span>

          <AdminStatus
            tone={
              settings
                .smtpCredentialConfigured
                ? settings.deliveryMode
                  === "smtp"
                    ? "success"
                    : "info"
                : "neutral"
            }
          >
            {settings
              .smtpCredentialConfigured
              ? settings.deliveryMode
                === "smtp"
                  ? "Active"
                  : "Configured"
              : "Not configured"}
          </AdminStatus>
        </button>
      </section>

      <div className="crm-email-settings-layout">
        <main className="space-y-4">
          <AdminPanel
            title="Sender identity"
            description="These details are used for ordinary CRM correspondence. The actual From address may be constrained by the selected provider."
            icon={Mail}
          >
            <div className="crm-email-settings-fields">
              <AdminField label="Sender name">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .senderName
                  }
                  onChange={(event) =>
                    update({
                      senderName:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder={
                    auth.businessName
                    || "Your business"
                  }
                />
              </AdminField>

              <AdminField
                label="Sender email"
                help="For managed delivery this may be used as display/reply context rather than the technical sending mailbox."
              >
                <input
                  className="admin-input"
                  type="email"
                  disabled={!canManage}
                  value={
                    settings
                      .senderEmail
                  }
                  onChange={(event) =>
                    update({
                      senderEmail:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="hello@example.com"
                />
              </AdminField>

              <AdminField
                label="Reply-to email"
                help="Client replies should normally come directly back to your business."
              >
                <input
                  className="admin-input"
                  type="email"
                  disabled={!canManage}
                  value={
                    settings
                      .replyToEmail
                  }
                  onChange={(event) =>
                    update({
                      replyToEmail:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="hello@example.com"
                />
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Google / Gmail"
            description="Google delivery requires a secure workspace connection before it can be selected."
            icon={Mail}
            actions={
              settings
                .googleConnected
                && canManage ? (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  icon={Unplug}
                  disabled={
                    saving
                    || googleConnecting
                  }
                  onClick={() =>
                    void disconnect(
                      "google",
                    )
                  }
                >
                  Disconnect
                </AdminButton>
              ) : canManage ? (
                <AdminButton
                  variant="secondary"
                  size="sm"
                  icon={Mail}
                  disabled={
                    saving
                    || googleConnecting
                  }
                  onClick={() =>
                    void connectGoogle()
                  }
                >
                  {googleConnecting
                    ? "Connecting…"
                    : "Connect Google"}
                </AdminButton>
              ) : undefined
            }
          >
            {settings
              .googleConnected ? (
              <div className="crm-email-provider-state">
                <span className="crm-email-provider-state__icon success">
                  <CheckCircle2 />
                </span>

                <div>
                  <strong>
                    Google account connected
                  </strong>

                  <p>
                    {settings.googleEmail
                      || "Connected Google mailbox"}
                  </p>
                </div>

                <AdminStatus tone="success">
                  Connected
                </AdminStatus>
              </div>
            ) : (
              <div className="crm-email-provider-state">
                <span className="crm-email-provider-state__icon">
                  <KeyRound />
                </span>

                <div>
                  <strong>
                    No Google account connected
                  </strong>

                  <p>
                    Connect a Google account to authorise WedPlanned to send CRM correspondence through Gmail. Only the email-delivery permission is requested.
                  </p>
                </div>

                <AdminStatus tone="neutral">
                  Not connected
                </AdminStatus>
              </div>
            )}
          </AdminPanel>

          <AdminPanel
            title="Custom SMTP"
            description="Use the submission settings supplied by your email provider. Passwords are encrypted before they are stored."
            icon={Server}
            actions={
              settings
                .smtpCredentialConfigured
                && canManage ? (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  icon={Unplug}
                  disabled={saving}
                  onClick={() =>
                    void disconnect(
                      "smtp",
                    )
                  }
                >
                  Remove credentials
                </AdminButton>
              ) : undefined
            }
          >
            <div className="crm-email-smtp-grid">
              <AdminField label="SMTP host">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings.smtpHost
                  }
                  onChange={(event) =>
                    update({
                      smtpHost:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="smtp.example.com"
                />
              </AdminField>

              <AdminField label="Port" help="Port 25 is unavailable. Use the secure submission port provided by your email service, normally 465 or 587.">
                <input
                  className="admin-input"
                  type="number"
                  min="1"
                  max="65535"
                  disabled={!canManage}
                  value={
                    settings.smtpPort
                  }
                  onChange={(event) =>
                    update({
                      smtpPort:
                        Number(
                          event
                            .target
                            .value
                          || 587,
                        ),
                    })
                  }
                />
              </AdminField>

              <AdminField label="Security">
                <select
                  className="admin-select"
                  disabled={!canManage}
                  value={
                    settings
                      .smtpSecurity
                  }
                  onChange={(event) => {
                    const smtpSecurity =
                      event.target.value as CrmEmailSmtpSecurity;

                    update({
                      smtpSecurity,
                    });
                  }}
                >
                  <option value="starttls">
                    STARTTLS
                  </option>
                  <option value="tls">
                    TLS
                  </option>
                </select>
              </AdminField>

              <AdminField label="Username">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .smtpUsername
                  }
                  onChange={(event) =>
                    update({
                      smtpUsername:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="hello@example.com"
                />
              </AdminField>

              <AdminField
                label="Password"
                help={
                  settings
                    .smtpCredentialConfigured
                    ? "Leave blank to keep the encrypted password already stored."
                    : "Stored only as encrypted credential material."
                }
              >
                <input
                  className="admin-input"
                  type="password"
                  autoComplete="new-password"
                  disabled={!canManage}
                  value={smtpPassword}
                  onChange={(event) =>
                    setSmtpPassword(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={
                    settings
                      .smtpCredentialConfigured
                      ? "••••••••••••"
                      : "SMTP password"
                  }
                />
              </AdminField>
            </div>

            <div className="crm-email-security-note">
              <ShieldCheck />
              <div>
                <strong>
                  Encrypted credential storage
                </strong>
                <p>
                  WedPlanned stores the SMTP secret as AES-GCM encrypted credential data. The password is never returned to this screen after saving.
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Email signature"
            description="Build the business signature appended to CRM email templates when the template has signature enabled."
            icon={ExternalLink}
          >
            <label className="admin-choice-row">
              <div>
                <strong>
                  Append business signature
                </strong>
                <p>
                  Makes this signature available to email templates that request it.
                </p>
              </div>

              <input
                type="checkbox"
                disabled={!canManage}
                checked={
                  settings
                    .signatureEnabled
                }
                onChange={(event) =>
                  update({
                    signatureEnabled:
                      event
                        .target
                        .checked,
                  })
                }
              />
            </label>

            <div className="crm-email-signature-grid">
              <AdminField label="Name">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .signature
                      .name
                    || ""
                  }
                  onChange={(event) =>
                    updateSignature({
                      name:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField label="Job title">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .signature
                      .jobTitle
                    || ""
                  }
                  onChange={(event) =>
                    updateSignature({
                      jobTitle:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField label="Business">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .signature
                      .businessName
                    || ""
                  }
                  onChange={(event) =>
                    updateSignature({
                      businessName:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField label="Phone">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .signature
                      .phone
                    || ""
                  }
                  onChange={(event) =>
                    updateSignature({
                      phone:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>

              <AdminField label="Website">
                <input
                  className="admin-input"
                  disabled={!canManage}
                  value={
                    settings
                      .signature
                      .website
                    || ""
                  }
                  onChange={(event) =>
                    updateSignature({
                      website:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </AdminField>
            </div>

            <AdminField
              label="Additional signature text"
              help="Optional short sign-off or business details."
            >
              <textarea
                className="admin-textarea min-h-24"
                disabled={!canManage}
                value={
                  settings
                    .signature
                    .text
                  || ""
                }
                onChange={(event) =>
                  updateSignature({
                    text:
                      event
                        .target
                        .value,
                  })
                }
              />
            </AdminField>
          </AdminPanel>
        </main>

        <aside className="space-y-4">
          <AdminPanel
            title="Delivery summary"
            icon={Mail}
            compact
          >
            <dl className="admin-compact-details">
              <div>
                <dt>Mode</dt>
                <dd>
                  {settings.deliveryMode
                    === "managed"
                    ? "WedPlanned"
                    : settings.deliveryMode
                      === "google"
                      ? "Google"
                      : "Custom SMTP"}
                </dd>
              </div>

              <div>
                <dt>Reply to</dt>
                <dd>
                  {settings.replyToEmail
                    || settings.senderEmail
                    || "Not set"}
                </dd>
              </div>

              <div>
                <dt>Google</dt>
                <dd>
                  {settings.googleConnected
                    ? "Connected"
                    : "Not connected"}
                </dd>
              </div>

              <div>
                <dt>SMTP</dt>
                <dd>
                  {settings.smtpCredentialConfigured
                    ? "Configured"
                    : "Not configured"}
                </dd>
              </div>

              <div>
                <dt>Signature</dt>
                <dd>
                  {settings.signatureEnabled
                    ? "Enabled"
                    : "Disabled"}
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel
            title="Connection status"
            icon={ShieldCheck}
            compact
          >
            <div className="crm-email-status-stack">
              <div>
                <span>
                  Last delivery test
                </span>
                <AdminStatus
                  tone={
                    statusTone(
                      settings
                        .lastTestStatus,
                    ) as any
                  }
                >
                  {settings
                    .lastTestStatus
                    || "Not tested"}
                </AdminStatus>
              </div>

              {settings
                .lastTestedAt ? (
                <small>
                  {String(
                    settings
                      .lastTestedAt,
                  )}
                </small>
              ) : null}
            </div>
          </AdminPanel>

          <div className="crm-email-auth-boundary">
            <ShieldCheck />
            <div>
              <strong>
                Security boundary
              </strong>

              <p>
                Sign-in links, account verification and client authentication do not use these business email settings.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AdminPage>
  );
}
