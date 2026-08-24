import { getCrmJobDeletePreflight } from "./crm-delete-d1";
import {
  getCrmEnquiryDeletePreflight,
  type CrmDeletePreflight,
} from "./crm-delete-d1";

type D1Db = any;

type CrmDeleteActor = {
  workspaceId: string;
  permissions: string[];
  accessMode?: string;
  userId?: string;
  email?: string;
};

export type CrmLeadDeleteReceipt = {
  targetType: "lead";
  targetId: string;
  reference: string;
  deletedAt: string;
  deleted: {
    lead: number;
    draftQuotes: number;
    contactLinks: number;
    communications: number;
    tasks: number;
    activities: number;
  };
  preserved: {
    contactIds: string[];
  };
  policyVersion: string;
};

function text(value: unknown) {
  return String(
    value ?? "",
  ).trim();
}

function lower(value: unknown) {
  return text(value)
    .toLowerCase();
}

function httpError(
  message: string,
  statusCode = 400,
  details: unknown[] = [],
) {
  const error =
    new Error(message) as Error & {
      statusCode?: number;
      details?: unknown[];
    };

  error.statusCode =
    statusCode;

  error.details =
    details;

  return error;
}

function preflightCount(
  preflight: CrmDeletePreflight,
  key: string,
) {
  const match =
    preflight.willDelete.find(
      (item) =>
        item.key === key,
    );

  return Number(
    match?.count || 0,
  );
}

async function guardDraftQuoteHistory(
  db: D1Db,
  actor: CrmDeleteActor,
  enquiryId: string,
) {
  /*
   * A genuinely draft quote should not have an
   * acceptance or an invoice. Treat either state as
   * protected history rather than attempting to erase
   * it because of an inconsistent quote status.
   */
  const row =
    await db.prepare(`
      SELECT
        (
          SELECT COUNT(*)
          FROM crm_quote_acceptances acceptance
          JOIN crm_quotes quote
            ON quote.id =
               acceptance.quote_id
           AND quote.workspace_id =
               acceptance.workspace_id
          WHERE quote.workspace_id = ?
            AND quote.enquiry_id = ?
            AND quote.status = 'draft'
        ) AS acceptance_count,

        (
          SELECT COUNT(*)
          FROM crm_invoices invoice
          JOIN crm_quotes quote
            ON quote.id =
               invoice.quote_id
           AND quote.workspace_id =
               invoice.workspace_id
          WHERE quote.workspace_id = ?
            AND quote.enquiry_id = ?
            AND quote.status = 'draft'
        ) AS invoice_count
    `)
      .bind(
        actor.workspaceId,
        enquiryId,
        actor.workspaceId,
        enquiryId,
      )
      .first();

  const acceptanceCount =
    Number(
      row?.acceptance_count || 0,
    );

  const invoiceCount =
    Number(
      row?.invoice_count || 0,
    );

  if (
    acceptanceCount
    || invoiceCount
  ) {
    throw httpError(
      "This Lead has protected commercial history attached to a draft quote. Correct the quote state before permanent deletion.",
      409,
      [{
        key:
          "draft-quote-protected-history",
        label:
          "Protected draft-quote history",
        acceptanceCount,
        invoiceCount,
      }],
    );
  }
}

export async function deleteCrmEnquiryPermanently(
  db: D1Db,
  actor: CrmDeleteActor,
  enquiryIdInput: string,
  confirmationInput: unknown,
): Promise<CrmLeadDeleteReceipt> {
  const enquiryId =
    text(enquiryIdInput);

  const confirmation =
    text(confirmationInput);

  if (
    confirmation !== "DELETE"
  ) {
    throw httpError(
      "Type DELETE exactly to confirm permanent Lead deletion.",
      400,
    );
  }

  /*
   * Re-run policy immediately before deletion.
   * This prevents a stale UI preflight from bypassing
   * a Job conversion or newly client-visible quote.
   */
  const preflight =
    await getCrmEnquiryDeletePreflight(
      db,
      actor,
      enquiryId,
    );

  if (!preflight.canDelete) {
    throw httpError(
      "This Lead cannot be permanently deleted until its blockers are resolved.",
      409,
      preflight.blockers,
    );
  }

  await guardDraftQuoteHistory(
    db,
    actor,
    enquiryId,
  );

  const enquiry =
    await db.prepare(`
      SELECT
        id,
        reference,
        status,
        source,
        lead_source,
        event_date,
        venue_text
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

  const contactResult =
    await db.prepare(`
      SELECT
        contact_id,
        role
      FROM crm_enquiry_contacts
      WHERE workspace_id = ?
        AND enquiry_id = ?
      ORDER BY role, contact_id
    `)
      .bind(
        actor.workspaceId,
        enquiryId,
      )
      .all();

  const contactIds =
    Array.from(
      new Set(
        (contactResult.results || [])
          .map(
            (row: any) =>
              text(row.contact_id),
          )
          .filter(Boolean),
      ),
    );

  const draftQuoteResult =
    await db.prepare(`
      SELECT id
      FROM crm_quotes
      WHERE workspace_id = ?
        AND enquiry_id = ?
        AND status = 'draft'
      ORDER BY created_at
    `)
      .bind(
        actor.workspaceId,
        enquiryId,
      )
      .all();

  const draftQuoteIds =
    (draftQuoteResult.results || [])
      .map(
        (row: any) =>
          text(row.id),
      )
      .filter(Boolean);

  const deletedAt =
    new Date().toISOString();

  const auditMetadata = {
    reference:
      text(enquiry.reference),
    status:
      text(enquiry.status),
    source:
      text(enquiry.source),
    leadSource:
      text(enquiry.lead_source),
    eventDate:
      text(enquiry.event_date),
    venue:
      text(enquiry.venue_text),
    preservedContactIds:
      contactIds,
    draftQuoteIds,
    preflight: {
      policyVersion:
        preflight.policyVersion,
      willDelete:
        preflight.willDelete,
      willPreserve:
        preflight.willPreserve,
    },
  };

  /*
   * Order is deliberate:
   *
   * 1. Delete draft quotes because crm_quotes.enquiry_id
   *    is intentionally NO ACTION.
   * 2. Delete Lead activity because crm_activities has
   *    no entity foreign key.
   * 3. Delete Lead. Enquiry contacts, communications and
   *    tasks then follow their existing CASCADE rules.
   * 4. Preserve a minimal platform-level deletion audit.
   *
   * crm_contacts is never deleted here.
   */
  await db.batch([
      db.prepare(`
        DELETE FROM crm_quotes
        WHERE workspace_id = ?
          AND enquiry_id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          enquiryId,
        ),

      db.prepare(`
        DELETE FROM crm_activities
        WHERE workspace_id = ?
          AND entity_type = 'enquiry'
          AND entity_id = ?
      `)
        .bind(
          actor.workspaceId,
          enquiryId,
        ),

      db.prepare(`
        DELETE FROM crm_enquiries
        WHERE workspace_id = ?
          AND id = ?
      `)
        .bind(
          actor.workspaceId,
          enquiryId,
        ),

      db.prepare(`
        INSERT INTO platform_audit_events (
          id,
          workspace_id,
          actor_user_id,
          actor_email,
          event_type,
          entity_type,
          entity_id,
          summary,
          metadata_json,
          created_at
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          'crm.enquiry.deleted_permanently',
          'crm_enquiry',
          ?,
          ?,
          ?,
          CURRENT_TIMESTAMP
        )
      `)
        .bind(
          `audit_${crypto.randomUUID()}`,
          actor.workspaceId,
          text(actor.userId)
            || null,
          lower(actor.email),
          enquiryId,
          `Permanently deleted CRM Lead ${
            text(enquiry.reference)
            || enquiryId
          }.`,
          JSON.stringify(
            auditMetadata,
          ),
        ),
    ]);

  const remaining =
    await db.prepare(`
      SELECT id
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

  if (remaining) {
    throw httpError(
      "Lead still exists after permanent deletion.",
      500,
    );
  }

  return {
    targetType:
      "lead",
    targetId:
      enquiryId,
    reference:
      text(enquiry.reference),
    deletedAt,
    deleted: {
      /*
       * The Lead existed immediately before the
       * transactional delete and the post-delete
       * existence check below proves it is gone.
       *
       * Do not use D1 meta.changes here because
       * cascading FK deletes may be included in
       * the reported change count.
       */
      lead:
        1,
      draftQuotes:
        draftQuoteIds.length,
      contactLinks:
        preflightCount(
          preflight,
          "lead-contact-links",
        ),
      communications:
        preflightCount(
          preflight,
          "lead-communications",
        ),
      tasks:
        preflightCount(
          preflight,
          "lead-tasks",
        ),
      activities:
        preflightCount(
          preflight,
          "lead-activity",
        ),
    },
    preserved: {
      contactIds,
    },
    policyVersion:
      preflight.policyVersion,
  };
}
type CrmPermanentDeleteBucket = {
  delete:
    (key: string) =>
      Promise<unknown>;
};


function placeholders(
  count: number,
) {
  return Array.from(
    {
      length: count,
    },
    () => "?",
  ).join(", ");
}


async function strictDeletePrivateObjects(
  bucket:
    CrmPermanentDeleteBucket
    | undefined,
  storageKeys: string[],
) {
  const keys =
    Array.from(
      new Set(
        storageKeys
          .map(text)
          .filter(Boolean),
      ),
    );

  if (!keys.length) {
    return [];
  }

  if (!bucket) {
    throw httpError(
      "Private file storage is not configured. Job deletion was stopped before CRM records were changed.",
      500,
    );
  }

  for (const key of keys) {
    try {
      await bucket.delete(
        key,
      );
    } catch {
      throw httpError(
        "Unable to remove a private planning file. Job deletion was stopped before CRM records were changed.",
        502,
      );
    }
  }

  return keys;
}


async function jobDeleteRows(
  db: D1Db,
  actor: CrmDeleteActor,
  jobId: string,
  enquiryId: string,
) {
  const [
    contacts,
    quotes,
    invoices,
    contracts,
    jobFiles,
    questionnaireFiles,
  ] = await Promise.all([
    db.prepare(`
      SELECT DISTINCT contact_id
      FROM (
        SELECT contact_id
        FROM crm_job_contacts
        WHERE workspace_id = ?
          AND job_id = ?

        UNION

        SELECT contact_id
        FROM crm_enquiry_contacts
        WHERE workspace_id = ?
          AND enquiry_id = ?
      )
      WHERE trim(contact_id) <> ''
    `)
      .bind(
        actor.workspaceId,
        jobId,
        actor.workspaceId,
        enquiryId,
      )
      .all(),

    db.prepare(`
      SELECT
        id,
        reference,
        status
      FROM crm_quotes
      WHERE workspace_id = ?
        AND status = 'draft'
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
        status
      FROM crm_invoices
      WHERE workspace_id = ?
        AND job_id = ?
        AND status = 'draft'
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
        status
      FROM crm_contracts
      WHERE workspace_id = ?
        AND job_id = ?
        AND status = 'draft'
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
        storage_key,
        original_filename,
        status
      FROM crm_job_files
      WHERE workspace_id = ?
        AND job_id = ?
        AND trim(storage_key) <> ''
      ORDER BY uploaded_at
    `)
      .bind(
        actor.workspaceId,
        jobId,
      )
      .all(),

    db.prepare(`
      SELECT
        file.id,
        file.storage_key,
        file.original_filename,
        file.status
      FROM crm_questionnaire_files file
      JOIN crm_questionnaire_instances
        instance
        ON instance.id =
           file.instance_id
       AND instance.workspace_id =
           file.workspace_id
      WHERE instance.workspace_id = ?
        AND instance.job_id = ?
        AND trim(
          file.storage_key
        ) <> ''
      ORDER BY file.uploaded_at
    `)
      .bind(
        actor.workspaceId,
        jobId,
      )
      .all(),
  ]);

  return {
    contactIds:
      (contacts.results || [])
        .map(
          (row: any) =>
            text(row.contact_id),
        )
        .filter(Boolean),

    draftQuotes:
      quotes.results || [],

    draftInvoices:
      invoices.results || [],

    draftContracts:
      contracts.results || [],

    jobFiles:
      jobFiles.results || [],

    questionnaireFiles:
      questionnaireFiles.results
      || [],
  };
}


export async function deleteCrmJobPermanently(
  db: D1Db,
  bucket:
    CrmPermanentDeleteBucket
    | undefined,
  actor: CrmDeleteActor,
  jobIdInput: string,
  confirmationInput: unknown,
) {
  const jobId =
    text(jobIdInput);

  const confirmation =
    text(confirmationInput);

  if (
    confirmation !== "DELETE"
  ) {
    throw httpError(
      "Type DELETE exactly to permanently delete this Job.",
      400,
    );
  }

  /*
   * Re-run the complete dependency preflight immediately
   * before any destructive operation. This is the server-side
   * authority even if the Admin UI loaded an earlier result.
   */
  const preflight =
    await getCrmJobDeletePreflight(
      db,
      actor,
      jobId,
    );

  if (!preflight.canDelete) {
    const error =
      httpError(
        "This Job cannot be permanently deleted until its protected dependencies are resolved.",
        409,
      ) as Error & {
        details?: unknown[];
      };

    error.details =
      preflight.blockers;

    throw error;
  }

  const job =
    await db.prepare(`
      SELECT
        id,
        reference,
        enquiry_id,
        status,
        title,
        event_date,
        venue_text,
        lead_source,
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

  const enquiry =
    enquiryId
      ? await db.prepare(`
          SELECT
            id,
            reference,
            status,
            source,
            lead_source,
            event_date,
            venue_text,
            accepted_job_id
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
      : null;

  const rows =
    await jobDeleteRows(
      db,
      actor,
      jobId,
      enquiryId,
    );

  /*
   * Physical private objects are deliberately removed first.
   * If R2 fails, no CRM D1 lifecycle row has been deleted.
   *
   * Include soft-deleted file rows as well: historical ordinary
   * deletion intentionally swallowed R2 errors, so permanent Job
   * deletion gets one final strict cleanup opportunity.
   */
  const deletedStorageKeys =
    await strictDeletePrivateObjects(
      bucket,
      [
        ...rows.jobFiles.map(
          (row: any) =>
            text(row.storage_key),
        ),
        ...rows.questionnaireFiles.map(
          (row: any) =>
            text(row.storage_key),
        ),
      ],
    );

  const quoteIds =
    rows.draftQuotes
      .map(
        (row: any) =>
          text(row.id),
      )
      .filter(Boolean);

  const invoiceIds =
    rows.draftInvoices
      .map(
        (row: any) =>
          text(row.id),
      )
      .filter(Boolean);

  const contractIds =
    rows.draftContracts
      .map(
        (row: any) =>
          text(row.id),
      )
      .filter(Boolean);

  const statements: any[] = [];

  /*
   * Break the booking pointers first. The originating Lead points
   * at the Job through accepted_job_id and the Job can point at a
   * draft quote/version.
   */
  if (enquiryId) {
    statements.push(
      db.prepare(`
        UPDATE crm_enquiries
        SET
          accepted_job_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
          AND accepted_job_id = ?
      `)
        .bind(
          actor.workspaceId,
          enquiryId,
          jobId,
        ),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE crm_jobs
      SET
        quote_id = NULL,
        quote_version_id = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ?
        AND id = ?
    `)
      .bind(
        actor.workspaceId,
        jobId,
      ),
  );

  /*
   * A draft quote can still contain current-version pointers.
   * The strengthened preflight guarantees every deletable version
   * is draft and there are no immutable acceptances.
   */
  for (const quoteId of quoteIds) {
    statements.push(
      db.prepare(`
        UPDATE crm_quotes
        SET
          current_version_id = NULL,
          accepted_version_id = NULL,
          accepted_job_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          quoteId,
        ),
    );
  }

  for (
    const contractId
    of contractIds
  ) {
    statements.push(
      db.prepare(`
        UPDATE crm_contracts
        SET
          current_version_id = NULL,
          signed_version_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          contractId,
        ),
    );
  }

  /*
   * Communications/activity are operational CRM history and may
   * themselves reference quote records. Remove them before draft
   * commercial parents.
   */
  statements.push(
    db.prepare(`
      DELETE FROM crm_communications
      WHERE workspace_id = ?
        AND (
          job_id = ?
          OR (
            enquiry_id = ?
            AND ? <> ''
          )
        )
    `)
      .bind(
        actor.workspaceId,
        jobId,
        enquiryId,
        enquiryId,
      ),

    db.prepare(`
      DELETE FROM crm_tasks
      WHERE workspace_id = ?
        AND (
          job_id = ?
          OR (
            enquiry_id = ?
            AND ? <> ''
          )
        )
    `)
      .bind(
        actor.workspaceId,
        jobId,
        enquiryId,
        enquiryId,
      ),

    db.prepare(`
      DELETE FROM crm_activities
      WHERE workspace_id = ?
        AND (
          (
            entity_type = 'job'
            AND entity_id = ?
          )
          OR (
            entity_type = 'enquiry'
            AND entity_id = ?
            AND ? <> ''
          )
        )
    `)
      .bind(
        actor.workspaceId,
        jobId,
        enquiryId,
        enquiryId,
      ),
  );

  for (
    const contractId
    of contractIds
  ) {
    statements.push(
      db.prepare(`
        DELETE FROM crm_contracts
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          contractId,
        ),
    );
  }

  for (
    const invoiceId
    of invoiceIds
  ) {
    statements.push(
      db.prepare(`
        DELETE FROM crm_invoices
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          invoiceId,
        ),
    );
  }

  for (
    const quoteId
    of quoteIds
  ) {
    statements.push(
      db.prepare(`
        DELETE FROM crm_quotes
        WHERE workspace_id = ?
          AND id = ?
          AND status = 'draft'
      `)
        .bind(
          actor.workspaceId,
          quoteId,
        ),
    );
  }

  /*
   * Job-owned operational tables cascade here:
   * contacts links, portal access/invitations, workflows/tasks,
   * questionnaires/responses/files, supplier submissions and
   * crm_job_files.
   *
   * Wedding/Story/Gallery/assets are deliberately not touched.
   */
  statements.push(
    db.prepare(`
      DELETE FROM crm_jobs
      WHERE workspace_id = ?
        AND id = ?
    `)
      .bind(
        actor.workspaceId,
        jobId,
      ),
  );

  if (enquiryId) {
    statements.push(
      db.prepare(`
        DELETE FROM crm_enquiries
        WHERE workspace_id = ?
          AND id = ?
      `)
        .bind(
          actor.workspaceId,
          enquiryId,
        ),
    );
  }

  statements.push(
    db.prepare(`
      INSERT INTO platform_audit_events (
        id,
        workspace_id,
        actor_user_id,
        actor_email,
        event_type,
        entity_type,
        entity_id,
        summary,
        metadata_json,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        'crm.job.deleted_permanently',
        'crm_job',
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP
      )
    `)
      .bind(
        `audit_${crypto.randomUUID()}`,
        actor.workspaceId,
        text(
          (actor as any).userId,
        ) || null,
        text(
          (actor as any).email,
        ).toLowerCase(),
        jobId,
        `Permanently deleted CRM Job ${
          text(job.reference)
          || jobId
        }.`,
        JSON.stringify({
          reference:
            text(job.reference),
          title:
            text(job.title),
          status:
            text(job.status),
          enquiryId,
          enquiryReference:
            text(
              enquiry?.reference,
            ),
          weddingSlug:
            text(job.wedding_slug),
          eventDate:
            text(job.event_date),
          venue:
            text(job.venue_text),
          leadSource:
            text(job.lead_source),
          preservedContactIds:
            rows.contactIds,
          deletedDraftQuoteIds:
            quoteIds,
          deletedDraftInvoiceIds:
            invoiceIds,
          deletedDraftContractIds:
            contractIds,
          deletedPrivateStorageKeys:
            deletedStorageKeys,
          preserved: {
            weddingWorkspace:
              Boolean(
                text(
                  job.wedding_slug,
                ),
              ),
            weddingStory: true,
            clientGalleries: true,
            canonicalAssets: true,
            websiteAssignments: true,
            masterContacts: true,
          },
          preflight: {
            policyVersion:
              preflight.policyVersion,
            willDelete:
              preflight.willDelete,
            willPreserve:
              preflight.willPreserve,
          },
        }),
      ),
  );

  await db.batch(
    statements,
  );

  /*
   * D1 cascade metadata is not used as proof of deletion.
   * Verify the authoritative parent rows directly.
   */
  const residualJob =
    await db.prepare(`
      SELECT id
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

  if (residualJob) {
    throw httpError(
      "Job deletion did not complete.",
      500,
    );
  }

  if (enquiryId) {
    const residualLead =
      await db.prepare(`
        SELECT id
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

    if (residualLead) {
      throw httpError(
        "Originating Lead deletion did not complete.",
        500,
      );
    }
  }

  return {
    ok: true,
    policyVersion:
      preflight.policyVersion,
    targetType:
      "job",
    targetId:
      jobId,
    reference:
      text(job.reference),
    deleted: {
      job: 1,
      originatingLead:
        enquiryId
          ? 1
          : 0,
      draftQuotes:
        quoteIds.length,
      draftInvoices:
        invoiceIds.length,
      draftContracts:
        contractIds.length,
      privateFiles:
        deletedStorageKeys.length,
    },
    preserved: {
      contactIds:
        rows.contactIds,
      weddingSlug:
        text(job.wedding_slug),
      weddingWorkspace: true,
      weddingStory: true,
      clientGalleries: true,
      canonicalAssets: true,
      websiteAssignments: true,
    },
  };
}
