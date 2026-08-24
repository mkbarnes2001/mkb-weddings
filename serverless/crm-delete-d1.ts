type D1Db = any;

type CrmDeleteActor = {
  workspaceId: string;
  permissions: string[];
  accessMode?: string;
};

export type CrmDeletePreflightItem = {
  key: string;
  label: string;
  detail: string;
  count?: number;
};

export type CrmDeletePreflight = {
  policyVersion: "gate-2c.1";
  targetType: "lead" | "job";
  targetId: string;
  reference: string;
  displayName: string;
  canDelete: boolean;
  confirmationText: "DELETE";
  willDelete: CrmDeletePreflightItem[];
  willPreserve: CrmDeletePreflightItem[];
  blockers: CrmDeletePreflightItem[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function countValue(
  row: any,
  key = "total",
) {
  return Number(
    row?.[key] || 0,
  );
}

function httpError(
  message: string,
  statusCode = 400,
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
    };

  error.statusCode =
    statusCode;

  return error;
}

function requireManage(
  actor: CrmDeleteActor,
) {
  if (
    !actor?.permissions?.includes(
      "crm:manage",
    )
    || actor.accessMode === "support"
  ) {
    throw httpError(
      "CRM management access is required.",
      403,
    );
  }
}

function item(
  key: string,
  label: string,
  detail: string,
  count?: number,
): CrmDeletePreflightItem {
  return {
    key,
    label,
    detail,
    ...(
      count == null
        ? {}
        : { count }
    ),
  };
}

async function countRows(
  db: D1Db,
  sql: string,
  bindings: unknown[],
) {
  const row =
    await db.prepare(sql)
      .bind(...bindings)
      .first();

  return countValue(
    row,
  );
}

function statusSummary(
  rows: any[],
) {
  const statuses =
    Array.from(
      new Set(
        rows
          .map(
            (row) =>
              text(row.status),
          )
          .filter(Boolean),
      ),
    );

  return statuses.join(", ");
}


async function hiddenCommercialHistoryBlockers(
  db: D1Db,
  actor: CrmDeleteActor,
  target: {
    enquiryId?: string;
    jobId?: string;
  },
) {
  const enquiryId =
    text(target.enquiryId);

  const jobId =
    text(target.jobId);

  const [
    hiddenQuoteVersions,
    hiddenQuoteAcceptances,
    hiddenInvoices,
    hiddenContractVersions,
    hiddenContracts,
  ] = await Promise.all([
    countRows(
      db,
      `
        SELECT COUNT(
          DISTINCT version.id
        ) AS total
        FROM crm_quote_versions version
        JOIN crm_quotes quote
          ON quote.id =
             version.quote_id
         AND quote.workspace_id =
             version.workspace_id
        WHERE quote.workspace_id = ?
          AND quote.status = 'draft'
          AND version.status <> 'draft'
          AND (
            (
              ? <> ''
              AND quote.enquiry_id = ?
            )
            OR (
              ? <> ''
              AND quote.accepted_job_id = ?
            )
          )
      `,
      [
        actor.workspaceId,
        enquiryId,
        enquiryId,
        jobId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(
          DISTINCT acceptance.id
        ) AS total
        FROM crm_quote_acceptances
          acceptance
        JOIN crm_quotes quote
          ON quote.id =
             acceptance.quote_id
         AND quote.workspace_id =
             acceptance.workspace_id
        WHERE quote.workspace_id = ?
          AND quote.status = 'draft'
          AND (
            (
              ? <> ''
              AND quote.enquiry_id = ?
            )
            OR (
              ? <> ''
              AND quote.accepted_job_id = ?
            )
          )
      `,
      [
        actor.workspaceId,
        enquiryId,
        enquiryId,
        jobId,
        jobId,
      ],
    ),

    jobId
      ? countRows(
          db,
          `
            SELECT COUNT(*) AS total
            FROM crm_invoices
            WHERE workspace_id = ?
              AND job_id = ?
              AND status = 'draft'
              AND (
                issued_at IS NOT NULL
                OR sent_at IS NOT NULL
                OR paid_at IS NOT NULL
                OR voided_at IS NOT NULL
                OR (
                  quote_acceptance_id
                    IS NOT NULL
                  AND trim(
                    quote_acceptance_id
                  ) <> ''
                )
              )
          `,
          [
            actor.workspaceId,
            jobId,
          ],
        )
      : Promise.resolve(0),

    jobId
      ? countRows(
          db,
          `
            SELECT COUNT(
              DISTINCT version.id
            ) AS total
            FROM crm_contract_versions
              version
            JOIN crm_contracts contract
              ON contract.id =
                 version.contract_id
             AND contract.workspace_id =
                 version.workspace_id
            WHERE contract.workspace_id = ?
              AND contract.job_id = ?
              AND contract.status = 'draft'
              AND version.status <> 'draft'
          `,
          [
            actor.workspaceId,
            jobId,
          ],
        )
      : Promise.resolve(0),

    jobId
      ? countRows(
          db,
          `
            SELECT COUNT(*) AS total
            FROM crm_contracts
            WHERE workspace_id = ?
              AND job_id = ?
              AND status = 'draft'
              AND (
                sent_at IS NOT NULL
                OR viewed_at IS NOT NULL
                OR signed_at IS NOT NULL
                OR voided_at IS NOT NULL
                OR (
                  quote_acceptance_id
                    IS NOT NULL
                  AND trim(
                    quote_acceptance_id
                  ) <> ''
                )
              )
          `,
          [
            actor.workspaceId,
            jobId,
          ],
        )
      : Promise.resolve(0),
  ]);

  const blockers:
    CrmDeletePreflightItem[] = [];

  if (hiddenQuoteVersions) {
    blockers.push(
      item(
        "hidden-quote-version-history",
        "Client-visible quote version history",
        "A quote is marked draft but contains a version that has already left draft. Preserve that commercial history.",
        hiddenQuoteVersions,
      ),
    );
  }

  if (hiddenQuoteAcceptances) {
    blockers.push(
      item(
        "hidden-quote-acceptance-history",
        "Quote acceptance history",
        "A draft-labelled quote contains an immutable client acceptance and cannot be erased.",
        hiddenQuoteAcceptances,
      ),
    );
  }

  if (hiddenInvoices) {
    blockers.push(
      item(
        "hidden-invoice-history",
        "Invoice lifecycle history",
        "A draft-labelled invoice has already entered a client-visible or financial lifecycle and cannot be erased.",
        hiddenInvoices,
      ),
    );
  }

  if (hiddenContractVersions) {
    blockers.push(
      item(
        "hidden-contract-version-history",
        "Client-visible contract version history",
        "A contract is marked draft but contains a version that has already left draft. Preserve that legal history.",
        hiddenContractVersions,
      ),
    );
  }

  if (hiddenContracts) {
    blockers.push(
      item(
        "hidden-contract-history",
        "Contract lifecycle history",
        "A draft-labelled contract has already entered a client-visible or legal lifecycle and cannot be erased.",
        hiddenContracts,
      ),
    );
  }

  return blockers;
}


export async function getCrmEnquiryDeletePreflight(
  db: D1Db,
  actor: CrmDeleteActor,
  enquiryIdInput: string,
): Promise<CrmDeletePreflight> {
  requireManage(actor);

  const enquiryId =
    text(enquiryIdInput);

  const enquiry =
    await db.prepare(`
      SELECT
        id,
        reference,
        status,
        accepted_job_id,
        event_date,
        venue_text,
        lead_source
      FROM crm_enquiries
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `)
      .bind(
        actor.workspaceId,
        enquiryId,
      )
      .first();

  if (!enquiry) {
    throw httpError(
      "Lead not found.",
      404,
    );
  }

  const [
    linkedJob,
    quoteResult,
    contactCount,
    communicationCount,
    taskCount,
    activityCount,
  ] = await Promise.all([
    db.prepare(`
      SELECT
        id,
        reference,
        title,
        status
      FROM crm_jobs
      WHERE workspace_id = ?
        AND (
          id = ?
          OR enquiry_id = ?
        )
      LIMIT 1
    `)
      .bind(
        actor.workspaceId,
        text(
          enquiry.accepted_job_id,
        ),
        enquiryId,
      )
      .first(),

    db.prepare(`
      SELECT
        id,
        reference,
        status,
        accepted_job_id
      FROM crm_quotes
      WHERE workspace_id = ?
        AND enquiry_id = ?
      ORDER BY created_at
    `)
      .bind(
        actor.workspaceId,
        enquiryId,
      )
      .all(),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_enquiry_contacts
        WHERE workspace_id = ?
          AND enquiry_id = ?
      `,
      [
        actor.workspaceId,
        enquiryId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_communications
        WHERE workspace_id = ?
          AND enquiry_id = ?
      `,
      [
        actor.workspaceId,
        enquiryId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_tasks
        WHERE workspace_id = ?
          AND enquiry_id = ?
      `,
      [
        actor.workspaceId,
        enquiryId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_activities
        WHERE workspace_id = ?
          AND entity_type = 'enquiry'
          AND entity_id = ?
      `,
      [
        actor.workspaceId,
        enquiryId,
      ],
    ),
  ]);

  const quotes =
    quoteResult.results || [];

  const draftQuotes =
    quotes.filter(
      (quote: any) =>
        text(quote.status)
        === "draft",
    );

  const protectedQuotes =
    quotes.filter(
      (quote: any) =>
        text(quote.status)
        !== "draft",
    );

  const willDelete:
    CrmDeletePreflightItem[] = [
      item(
        "lead",
        "Lead",
        `CRM Lead ${
          text(enquiry.reference)
          || enquiryId
        }.`,
        1,
      ),
    ];

  const willPreserve:
    CrmDeletePreflightItem[] = [];

  const blockers:
    CrmDeletePreflightItem[] = [];

  if (contactCount) {
    willDelete.push(
      item(
        "lead-contact-links",
        "CRM client links",
        "Lead-to-client relationships will be removed. The master client records remain.",
        contactCount,
      ),
    );

    willPreserve.push(
      item(
        "master-contacts",
        "Master client records",
        "Client/contact records are shared business records and will be preserved.",
        contactCount,
      ),
    );
  }

  if (communicationCount) {
    willDelete.push(
      item(
        "lead-communications",
        "Lead communications",
        "CRM communication history attached only to this Lead.",
        communicationCount,
      ),
    );
  }

  if (taskCount) {
    willDelete.push(
      item(
        "lead-tasks",
        "Lead tasks",
        "Operational CRM tasks attached to this Lead.",
        taskCount,
      ),
    );
  }

  if (activityCount) {
    willDelete.push(
      item(
        "lead-activity",
        "Lead activity history",
        "Operational CRM activity attached to this Lead.",
        activityCount,
      ),
    );
  }

  if (draftQuotes.length) {
    willDelete.push(
      item(
        "draft-quotes",
        "Draft quotes",
        "Quotes that have never become client-visible may be removed with the Lead.",
        draftQuotes.length,
      ),
    );
  }

  if (linkedJob) {
    blockers.push(
      item(
        "accepted-job",
        "Booked Job exists",
        `This Lead has already converted to ${
          text(linkedJob.reference)
          || text(linkedJob.title)
          || "a Job"
        }. Permanent deletion must be handled from the Job workspace.`,
        1,
      ),
    );
  }

  if (protectedQuotes.length) {
    blockers.push(
      item(
        "client-visible-quotes",
        "Client-visible quote history",
        `This Lead has quote history that is no longer draft (${statusSummary(
          protectedQuotes,
        )}). Preserve the business record rather than erasing client-visible commercial history.`,
        protectedQuotes.length,
      ),
    );
  }


  blockers.push(
    ...await hiddenCommercialHistoryBlockers(
      db,
      actor,
      {
        enquiryId,
      },
    ),
  );

  return {
    policyVersion:
      "gate-2c.1",
    targetType:
      "lead",
    targetId:
      enquiryId,
    reference:
      text(enquiry.reference),
    displayName:
      text(enquiry.reference)
      || enquiryId,
    canDelete:
      blockers.length === 0,
    confirmationText:
      "DELETE",
    willDelete,
    willPreserve,
    blockers,
  };
}

export async function getCrmJobDeletePreflight(
  db: D1Db,
  actor: CrmDeleteActor,
  jobIdInput: string,
): Promise<CrmDeletePreflight> {
  requireManage(actor);

  const jobId =
    text(jobIdInput);

  const job =
    await db.prepare(`
      SELECT
        id,
        reference,
        enquiry_id,
        status,
        title,
        event_date,
        wedding_slug,
        quote_id,
        quote_version_id
      FROM crm_jobs
      WHERE workspace_id = ?
        AND id = ?
      LIMIT 1
    `)
      .bind(
        actor.workspaceId,
        jobId,
      )
      .first();

  if (!job) {
    throw httpError(
      "Job not found.",
      404,
    );
  }

  const enquiryId =
    text(job.enquiry_id);

  const weddingSlug =
    text(job.wedding_slug);

  const [
    enquiry,
    quoteResult,
    invoiceResult,
    contractResult,
    paymentCount,
    signatureCount,
    jobContactCount,
    portalAccessCount,
    portalInvitationCount,
    questionnaireCount,
    questionnaireFileCount,
    workflowCount,
    taskCount,
    communicationCount,
    activityCount,
    jobFileCount,
    supplierSubmissionCount,
  ] = await Promise.all([
    enquiryId
      ? db.prepare(`
          SELECT
            id,
            reference,
            status
          FROM crm_enquiries
          WHERE workspace_id = ?
            AND id = ?
          LIMIT 1
        `)
          .bind(
            actor.workspaceId,
            enquiryId,
          )
          .first()
      : Promise.resolve(null),

    db.prepare(`
      SELECT
        id,
        reference,
        status,
        accepted_job_id
      FROM crm_quotes
      WHERE workspace_id = ?
        AND (
          accepted_job_id = ?
          OR (
            enquiry_id = ?
            AND ? <> ''
          )
        )
      ORDER BY created_at
    `)
      .bind(
        actor.workspaceId,
        jobId,
        enquiryId,
        enquiryId,
      )
      .all(),

    db.prepare(`
      SELECT
        id,
        reference,
        status,
        total_amount
      FROM crm_invoices
      WHERE workspace_id = ?
        AND job_id = ?
      ORDER BY created_at
    `)
      .bind(
        actor.workspaceId,
        jobId,
      )
      .all(),

    db.prepare(`
      SELECT
        id,
        reference,
        title,
        status
      FROM crm_contracts
      WHERE workspace_id = ?
        AND job_id = ?
      ORDER BY created_at
    `)
      .bind(
        actor.workspaceId,
        jobId,
      )
      .all(),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_invoice_payments payment
        JOIN crm_invoices invoice
          ON invoice.id =
             payment.invoice_id
         AND invoice.workspace_id =
             payment.workspace_id
        WHERE invoice.workspace_id = ?
          AND invoice.job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_contract_signatures signature
        JOIN crm_contracts contract
          ON contract.id =
             signature.contract_id
         AND contract.workspace_id =
             signature.workspace_id
        WHERE contract.workspace_id = ?
          AND contract.job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_job_contacts
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_job_client_access
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_portal_invitations
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_questionnaire_instances
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_questionnaire_files file
        JOIN crm_questionnaire_instances instance
          ON instance.id =
             file.instance_id
         AND instance.workspace_id =
             file.workspace_id
        WHERE instance.workspace_id = ?
          AND instance.job_id = ?
          AND file.status <> 'deleted'
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_job_workflows
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_tasks
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_communications
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_activities
        WHERE workspace_id = ?
          AND entity_type = 'job'
          AND entity_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_job_files
        WHERE workspace_id = ?
          AND job_id = ?
          AND status <> 'deleted'
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),

    countRows(
      db,
      `
        SELECT COUNT(*) AS total
        FROM crm_supplier_submissions
        WHERE workspace_id = ?
          AND job_id = ?
      `,
      [
        actor.workspaceId,
        jobId,
      ],
    ),
  ]);

  const quotes =
    quoteResult.results || [];

  const invoices =
    invoiceResult.results || [];

  const contracts =
    contractResult.results || [];

  const protectedQuotes =
    quotes.filter(
      (row: any) =>
        text(row.status)
        !== "draft",
    );

  const draftQuotes =
    quotes.filter(
      (row: any) =>
        text(row.status)
        === "draft",
    );

  const protectedInvoices =
    invoices.filter(
      (row: any) =>
        text(row.status)
        !== "draft",
    );

  const draftInvoices =
    invoices.filter(
      (row: any) =>
        text(row.status)
        === "draft",
    );

  const protectedContracts =
    contracts.filter(
      (row: any) =>
        text(row.status)
        !== "draft",
    );

  const draftContracts =
    contracts.filter(
      (row: any) =>
        text(row.status)
        === "draft",
    );

  let wedding: any = null;
  let galleryRows: any[] = [];
  let assetCount = 0;
  let publicAssignments = 0;

  if (weddingSlug) {
    const [
      weddingRow,
      galleries,
      assets,
      assignments,
    ] = await Promise.all([
      db.prepare(`
        SELECT
          slug,
          title,
          couple,
          venue,
          wedding_date,
          status,
          story_enabled,
          story_status,
          story_list_visible
        FROM weddings
        WHERE workspace_id = ?
          AND slug = ?
        LIMIT 1
      `)
        .bind(
          actor.workspaceId,
          weddingSlug,
        )
        .first(),

      db.prepare(`
        SELECT
          id,
          title,
          status
        FROM client_galleries
        WHERE workspace_id = ?
          AND wedding_slug = ?
        ORDER BY created_at
      `)
        .bind(
          actor.workspaceId,
          weddingSlug,
        )
        .all(),

      countRows(
        db,
        `
          SELECT COUNT(DISTINCT asset_id) AS total
          FROM asset_wedding_links
          WHERE workspace_id = ?
            AND wedding_slug = ?
        `,
        [
          actor.workspaceId,
          weddingSlug,
        ],
      ),

      db.prepare(`
        SELECT
          (
            SELECT COUNT(
              DISTINCT venue_link.asset_id
            )
            FROM asset_venue_links
              venue_link
            JOIN asset_wedding_links
              wedding_link
              ON wedding_link.asset_id =
                 venue_link.asset_id
             AND wedding_link.workspace_id =
                 venue_link.workspace_id
            WHERE
              wedding_link.workspace_id = ?
              AND wedding_link.wedding_slug = ?
          ) AS venue_count,
          (
            SELECT COUNT(
              DISTINCT moment_link.asset_id
            )
            FROM asset_moment_links
              moment_link
            JOIN asset_wedding_links
              wedding_link
              ON wedding_link.asset_id =
                 moment_link.asset_id
             AND wedding_link.workspace_id =
                 moment_link.workspace_id
            WHERE
              wedding_link.workspace_id = ?
              AND wedding_link.wedding_slug = ?
          ) AS moment_count,
          (
            SELECT COUNT(
              DISTINCT gallery_link.asset_id
            )
            FROM asset_gallery_links
              gallery_link
            JOIN asset_wedding_links
              wedding_link
              ON wedding_link.asset_id =
                 gallery_link.asset_id
             AND wedding_link.workspace_id =
                 gallery_link.workspace_id
            WHERE
              wedding_link.workspace_id = ?
              AND wedding_link.wedding_slug = ?
              AND gallery_link.hidden = 0
          ) AS gallery_count
      `)
        .bind(
          actor.workspaceId,
          weddingSlug,
          actor.workspaceId,
          weddingSlug,
          actor.workspaceId,
          weddingSlug,
        )
        .first(),
    ]);

    wedding =
      weddingRow;

    galleryRows =
      galleries.results || [];

    assetCount =
      Number(
        assets || 0,
      );

    publicAssignments =
      Number(
        assignments?.venue_count
        || 0,
      )
      + Number(
        assignments?.moment_count
        || 0,
      )
      + Number(
        assignments?.gallery_count
        || 0,
      );
  }

  const liveGalleries =
    galleryRows.filter(
      (gallery: any) =>
        text(gallery.status)
        === "live",
    );

  const willDelete:
    CrmDeletePreflightItem[] = [
      item(
        "job",
        "CRM Job",
        `Job ${
          text(job.reference)
          || jobId
        } and its CRM-only operational lifecycle.`,
        1,
      ),
    ];

  const willPreserve:
    CrmDeletePreflightItem[] = [];

  const blockers:
    CrmDeletePreflightItem[] = [];

  if (enquiry) {
    willDelete.push(
      item(
        "originating-lead",
        "Originating Lead",
        `The accepted Lead ${
          text(enquiry.reference)
          || enquiryId
        } is part of the same CRM lifecycle and will be removed with the Job.`,
        1,
      ),
    );
  }

  if (jobContactCount) {
    willDelete.push(
      item(
        "job-contact-links",
        "CRM client links",
        "Job-to-client relationships will be removed.",
        jobContactCount,
      ),
    );

    willPreserve.push(
      item(
        "master-contacts",
        "Master client records",
        "The underlying client/contact records remain in the business database.",
        jobContactCount,
      ),
    );
  }

  const portalCount =
    portalAccessCount
    + portalInvitationCount;

  if (portalCount) {
    willDelete.push(
      item(
        "client-portal-access",
        "Client Portal access",
        "Job-specific portal invitations and access records will be removed.",
        portalCount,
      ),
    );
  }

  if (questionnaireCount) {
    willDelete.push(
      item(
        "questionnaires",
        "Questionnaires",
        "Job questionnaires, responses and CRM questionnaire records will be removed.",
        questionnaireCount,
      ),
    );
  }

  if (questionnaireFileCount) {
    willDelete.push(
      item(
        "questionnaire-files",
        "Questionnaire attachments",
        "Private questionnaire file objects must be physically removed by the destructive delete operation as well as their D1 records.",
        questionnaireFileCount,
      ),
    );
  }

  if (workflowCount) {
    willDelete.push(
      item(
        "workflows",
        "Workflow records",
        "Job workflow instances and operational state.",
        workflowCount,
      ),
    );
  }

  if (taskCount) {
    willDelete.push(
      item(
        "tasks",
        "Tasks and milestones",
        "Job tasks, milestones and completion state.",
        taskCount,
      ),
    );
  }

  if (communicationCount) {
    willDelete.push(
      item(
        "communications",
        "CRM communications",
        "CRM communications attached specifically to this Job.",
        communicationCount,
      ),
    );
  }

  if (activityCount) {
    willDelete.push(
      item(
        "activity",
        "CRM activity history",
        "Operational Job activity records.",
        activityCount,
      ),
    );
  }

  if (supplierSubmissionCount) {
    willDelete.push(
      item(
        "supplier-submissions",
        "Supplier questionnaire submissions",
        "Job-specific supplier review submissions will be removed. Master supplier records remain.",
        supplierSubmissionCount,
      ),
    );

    willPreserve.push(
      item(
        "master-suppliers",
        "Master supplier records",
        "Supplier Master and Wedding supplier records are owned outside the CRM Job and remain preserved.",
      ),
    );
  }

  if (jobFileCount) {
    willDelete.push(
      item(
        "planning-files",
        "Job planning files",
        "Private planning-file objects must be physically removed from private storage by the destructive delete operation.",
        jobFileCount,
      ),
    );
  }

  if (draftQuotes.length) {
    willDelete.push(
      item(
        "draft-quotes",
        "Draft quotes",
        "Draft-only quote records may be removed with the CRM lifecycle.",
        draftQuotes.length,
      ),
    );
  }

  if (draftInvoices.length) {
    willDelete.push(
      item(
        "draft-invoices",
        "Draft invoices",
        "Invoices that have never been issued may be removed with the CRM lifecycle.",
        draftInvoices.length,
      ),
    );
  }

  if (draftContracts.length) {
    willDelete.push(
      item(
        "draft-contracts",
        "Draft contracts",
        "Contracts that have never been sent may be removed with the CRM lifecycle.",
        draftContracts.length,
      ),
    );
  }

  if (wedding) {
    willPreserve.push(
      item(
        "wedding-workspace",
        "Wedding Workspace",
        `The Wedding Workspace ${
          text(wedding.couple)
          || text(wedding.title)
          || weddingSlug
        } becomes independent of the deleted CRM Job.`,
        1,
      ),
    );

    const storyStatus =
      text(wedding.story_status)
      || "draft";

    const storyStarted =
      Boolean(
        Number(
          wedding.story_enabled
          || 0,
        ),
      )
      || storyStatus
        !== "draft";

    if (storyStarted) {
      willPreserve.push(
        item(
          "wedding-story",
          "Wedding Story",
          `WedStudio story content remains preserved with its current ${storyStatus} state.`,
          1,
        ),
      );
    }

    if (assetCount) {
      willPreserve.push(
        item(
          "wedding-assets",
          "Wedding photographs",
          "Canonical photographs, web derivatives and private originals are preserved.",
          assetCount,
        ),
      );
    }

    if (publicAssignments) {
      willPreserve.push(
        item(
          "website-galleries",
          "Website gallery assignments",
          "Venue, Moment and Collection assignments remain controlled by WedStudio.",
          publicAssignments,
        ),
      );
    }
  }

  if (galleryRows.length) {
    willPreserve.push(
      item(
        "client-galleries",
        "Client Galleries",
        `Client Galleries remain intact in their owning module (${statusSummary(
          galleryRows,
        )}).`,
        galleryRows.length,
      ),
    );
  }

  if (liveGalleries.length) {
    blockers.push(
      item(
        "live-client-gallery",
        "Live Client Gallery",
        "Archive the live Client Gallery before permanently deleting the CRM Job. The gallery and its photographs will still be preserved.",
        liveGalleries.length,
      ),
    );
  }

  if (
    protectedQuotes.length
  ) {
    blockers.push(
      item(
        "protected-quotes",
        "Client-visible quote history",
        `Quote history is no longer draft (${statusSummary(
          protectedQuotes,
        )}) and must remain as a business record.`,
        protectedQuotes.length,
      ),
    );
  }

  if (
    protectedInvoices.length
    || paymentCount
  ) {
    blockers.push(
      item(
        "protected-invoices",
        "Issued or paid invoice history",
        protectedInvoices.length
          ? `Invoice history is no longer draft (${statusSummary(
              protectedInvoices,
            )}). Void/archive rather than erase it.`
          : "Payment history exists for this Job and cannot be erased by CRM deletion.",
        Math.max(
          protectedInvoices.length,
          paymentCount,
        ),
      ),
    );
  }

  if (
    protectedContracts.length
    || signatureCount
  ) {
    blockers.push(
      item(
        "protected-contracts",
        "Sent or signed contract history",
        protectedContracts.length
          ? `Contract history is no longer draft (${statusSummary(
              protectedContracts,
            )}). Void/archive rather than erase it.`
          : "Contract signature history exists and cannot be erased by CRM deletion.",
        Math.max(
          protectedContracts.length,
          signatureCount,
        ),
      ),
    );
  }


  blockers.push(
    ...await hiddenCommercialHistoryBlockers(
      db,
      actor,
      {
        enquiryId,
        jobId,
      },
    ),
  );

  return {
    policyVersion:
      "gate-2c.1",
    targetType:
      "job",
    targetId:
      jobId,
    reference:
      text(job.reference),
    displayName:
      text(job.title)
      || text(job.reference)
      || jobId,
    canDelete:
      blockers.length === 0,
    confirmationText:
      "DELETE",
    willDelete,
    willPreserve,
    blockers,
  };
}
