export type ProfessionalNotificationEnv = {
  RESEND_API_KEY?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

export type ProfessionalClientAction =
  | "questionnaire_updated"
  | "questionnaire_completed"
  | "questionnaire_updated_after_completion"
  | "contract_signed";

type D1Db = any;

type NotificationInput = {
  workspaceId: string;
  jobId: string;
  action: ProfessionalClientAction;
  documentTitle: string;
  clientName: string;
  clientEmail: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    lower(value),
  );
}

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normaliseHostname(value: unknown) {
  return lower(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "");
}

const ACTION_COPY: Record<
  ProfessionalClientAction,
  {
    verb: string;
    description: string;
  }
> = {
  questionnaire_updated: {
    verb: "updated",
    description:
      "The client saved new planning information in their questionnaire.",
  },

  questionnaire_completed: {
    verb: "completed",
    description:
      "The client marked their questionnaire complete.",
  },

  questionnaire_updated_after_completion: {
    verb: "submitted updates to",
    description:
      "The client updated a questionnaire that was already marked complete.",
  },

  contract_signed: {
    verb: "signed",
    description:
      "A client electronic signature was recorded against the contract.",
  },
};

async function notificationContext(
  db: D1Db,
  workspaceId: string,
  jobId: string,
) {
  return db.prepare(`
    SELECT
      COALESCE(
        NULLIF(
          trim(
            lead_settings.notification_email
          ),
          ''
        ),
        NULLIF(
          trim(
            workspace_settings.contact_email
          ),
          ''
        ),
        (
          SELECT
            NULLIF(
              trim(membership.email),
              ''
            )
          FROM business_memberships membership
          WHERE membership.workspace_id =
            workspace.id
            AND membership.status = 'active'
            AND membership.role IN (
              'owner',
              'admin',
              'manager'
            )
          ORDER BY
            CASE membership.role
              WHEN 'owner' THEN 0
              WHEN 'admin' THEN 1
              ELSE 2
            END,
            membership.created_at
          LIMIT 1
        ),
        ''
      ) AS notification_email,

      COALESCE(
        NULLIF(
          trim(
            workspace_settings.business_name
          ),
          ''
        ),
        NULLIF(
          trim(workspace.name),
          ''
        ),
        'WedPlanned'
      ) AS business_name,

      COALESCE(
        NULLIF(trim(job.title), ''),
        NULLIF(trim(job.reference), ''),
        'Booking'
      ) AS job_title,

      COALESCE(
        NULLIF(trim(job.reference), ''),
        ''
      ) AS job_reference,

      COALESCE(
        (
          SELECT
            NULLIF(
              trim(domain.hostname),
              ''
            )
          FROM workspace_domains domain
          WHERE domain.workspace_id =
            workspace.id
            AND domain.purpose = 'admin'
            AND domain.verified = 1
          ORDER BY domain.created_at DESC
          LIMIT 1
        ),
        NULLIF(
          trim(
            workspace_settings.admin_hostname
          ),
          ''
        ),
        ''
      ) AS admin_hostname

    FROM workspaces workspace

    LEFT JOIN workspace_settings
      ON workspace_settings.workspace_id =
        workspace.id

    LEFT JOIN crm_lead_form_settings
      lead_settings
      ON lead_settings.workspace_id =
        workspace.id

    LEFT JOIN crm_jobs job
      ON job.workspace_id = workspace.id
     AND job.id = ?

    WHERE workspace.id = ?
      AND workspace.status = 'active'

    LIMIT 1
  `).bind(
    jobId,
    workspaceId,
  ).first();
}

export async function sendProfessionalClientActionNotification(
  db: D1Db,
  env: ProfessionalNotificationEnv,
  input: NotificationInput,
) {
  const context =
    await notificationContext(
      db,
      text(input.workspaceId),
      text(input.jobId),
    );

  const recipient =
    lower(
      context?.notification_email,
    );

  const apiKey =
    text(
      env?.RESEND_API_KEY,
    );

  const fromEmail =
    lower(
      env?.WEDPLANNED_AUTH_FROM_EMAIL
      || env?.CLIENT_AUTH_FROM_EMAIL,
    );

  const fromName =
    text(
      env?.WEDPLANNED_AUTH_FROM_NAME
      || env?.CLIENT_AUTH_FROM_NAME
      || "WedPlanned",
    );

  if (
    !validEmail(recipient)
    || !apiKey
    || !validEmail(fromEmail)
  ) {
    return {
      sent: false,
      reason: "not_configured",
    } as const;
  }

  const businessName =
    text(
      context?.business_name
      || "WedPlanned",
    );

  const jobTitle =
    text(
      context?.job_title
      || "Booking",
    );

  const jobReference =
    text(
      context?.job_reference,
    );

  const documentTitle =
    text(
      input.documentTitle
      || (
        input.action
        === "contract_signed"
          ? "Contract"
          : "Questionnaire"
      ),
    );

  const clientName =
    text(
      input.clientName
      || input.clientEmail
      || "A client",
    );

  const clientEmail =
    lower(
      input.clientEmail,
    );

  const copy =
    ACTION_COPY[input.action];

  const heading =
    `${clientName} ${copy.verb} ${documentTitle}`;

  const adminHostname =
    normaliseHostname(
      context?.admin_hostname,
    );

  const jobUrl =
    adminHostname
      ? `https://${adminHostname}/admin/crm/jobs/${encodeURIComponent(
          text(input.jobId),
        )}`
      : "";

  const subject =
    `${businessName}: ${heading}`
      .slice(
        0,
        240,
      );

  const safeBusiness =
    escapeHtml(businessName);

  const safeHeading =
    escapeHtml(heading);

  const safeDescription =
    escapeHtml(copy.description);

  const safeJobTitle =
    escapeHtml(jobTitle);

  const safeJobReference =
    escapeHtml(jobReference);

  const safeClientEmail =
    escapeHtml(clientEmail);

  const safeJobUrl =
    escapeHtml(jobUrl);

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from:
            `${fromName} <${fromEmail}>`,

          to: [
            recipient,
          ],

          subject,

          html:
            `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:580px;margin:auto">`
            + `<p style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b6b6b">WedPlanned · Client activity</p>`
            + `<h1 style="font-size:25px;font-weight:600">${safeHeading}</h1>`
            + `<p>${safeDescription}</p>`
            + `<div style="margin:24px 0;padding:16px;border:1px solid #e3e0da;border-radius:10px;background:#faf9f7">`
            + `<strong>${safeJobTitle}</strong>`
            + `${safeJobReference ? `<br><span style="font-size:13px;color:#666">${safeJobReference}</span>` : ""}`
            + `${safeClientEmail ? `<br><span style="font-size:13px;color:#666">${safeClientEmail}</span>` : ""}`
            + `</div>`
            + (
              safeJobUrl
                ? `<p style="margin:28px 0"><a href="${safeJobUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Open Job in WedCRM</a></p>`
                : ""
            )
            + `<p style="font-size:12px;color:#777">This notification was sent to ${escapeHtml(recipient)} using the business CRM notification setting.</p>`
            + `</div>`,

          text:
            `WedPlanned · Client activity\n\n`
            + `${heading}\n\n`
            + `${copy.description}\n\n`
            + `${jobTitle}`
            + (
              jobReference
                ? ` · ${jobReference}`
                : ""
            )
            + (
              clientEmail
                ? `\n${clientEmail}`
                : ""
            )
            + (
              jobUrl
                ? `\n\nOpen Job in WedCRM:\n${jobUrl}`
                : ""
            ),
        }),
      },
    );

  const responseBody: any =
    await response.json().catch(
      () => ({}),
    );

  if (!response.ok) {
    throw new Error(
      text(
        responseBody?.message
        || responseBody?.error
        || `Notification provider returned ${response.status}.`,
      ),
    );
  }

  return {
    sent: true,
    recipient,
    provider: "resend",
    providerMessageId:
      text(responseBody?.id),
  } as const;
}
