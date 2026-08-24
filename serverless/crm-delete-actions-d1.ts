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
