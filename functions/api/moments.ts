import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const result = await context.env.MKB_DB.prepare(`
      SELECT document_json, updated_at FROM moments ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all();
    const rows = result.results || [];
    const moments = rows.map((row: any) => {
      try { return JSON.parse(String(row.document_json || "{}")); }
      catch { return {}; }
    });
    const updatedAt = String(rows[0]?.updated_at || new Date().toISOString());
    return Response.json({ ok: true, document: { schemaVersion: 1, updatedAt, moments } });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();

  try {
    const body: any = await context.request.json();
    const document = body?.document || {};
    const incoming = Array.isArray(document?.moments) ? document.moments : [];
    const updatedAt = String(document?.updatedAt || new Date().toISOString());

    const cleanMoments = incoming
      .map((moment: any, index: number) => ({
        id: String(moment.id || `moment_${crypto.randomUUID()}`),
        name: String(moment.name || "").trim(),
        slug: String(moment.slug || "").trim(),
        description: String(moment.description || ""),
        availableForAssignment: Boolean(moment.availableForAssignment),
        showOnMomentsLanding: Boolean(moment.showOnMomentsLanding),
        cardImageId: String(moment.cardImageId || "").trim(),
        heroImageId: String(moment.heroImageId || "").trim(),
        pinnedImageIds: Array.isArray(moment.pinnedImageIds)
          ? [...new Set(moment.pinnedImageIds.map((value: any) => String(value || "").trim()).filter(Boolean))]
          : [],
        imageOrderIds: Array.isArray(moment.imageOrderIds)
          ? [...new Set(moment.imageOrderIds.map((value: any) => String(value || "").trim()).filter(Boolean))]
          : [],
        hiddenImageIds: Array.isArray(moment.hiddenImageIds)
          ? [...new Set(moment.hiddenImageIds.map((value: any) => String(value || "").trim()).filter(Boolean))]
          : [],
        sortOrder: Number(moment.sortOrder || index + 1),
        status: moment.status === "archived" ? "archived" : "active",
      }))
      .filter((moment: any) => moment.name && moment.slug);

    const existingResult = await context.env.MKB_DB.prepare(`SELECT id FROM moments`).all();
    const incomingIds = new Set(cleanMoments.map((moment: any) => moment.id));
    const removedIds = (existingResult.results || [])
      .map((row: any) => String(row.id || ""))
      .filter((id: string) => id && !incomingIds.has(id));

    const statements: any[] = [];

    // Remove dependent links before removing a deliberately deleted moment.
    // The previous implementation deleted every moment first, which violated
    // asset_moment_links(moment_id) foreign keys on every ordinary save.
    if (removedIds.length) {
      const placeholders = removedIds.map(() => "?").join(",");
      statements.push(
        context.env.MKB_DB.prepare(
          `DELETE FROM asset_moment_links WHERE moment_id IN (${placeholders})`,
        ).bind(...removedIds),
      );
      statements.push(
        context.env.MKB_DB.prepare(
          `DELETE FROM moments WHERE id IN (${placeholders})`,
        ).bind(...removedIds),
      );
    }

    for (const moment of cleanMoments) {
      const documentJson = JSON.stringify(moment);
      statements.push(
        context.env.MKB_DB.prepare(`
          INSERT INTO moments (
            id, slug, name, description, available_for_assignment,
            show_on_landing, card_image_id, sort_order, status,
            document_json, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            description = excluded.description,
            available_for_assignment = excluded.available_for_assignment,
            show_on_landing = excluded.show_on_landing,
            card_image_id = excluded.card_image_id,
            sort_order = excluded.sort_order,
            status = excluded.status,
            document_json = excluded.document_json,
            updated_at = excluded.updated_at
        `).bind(
          moment.id,
          moment.slug,
          moment.name,
          moment.description,
          moment.availableForAssignment ? 1 : 0,
          moment.showOnMomentsLanding ? 1 : 0,
          moment.cardImageId,
          moment.sortOrder,
          moment.status,
          documentJson,
          updatedAt,
        ),
      );
    }

    if (statements.length) {
      await context.env.MKB_DB.batch(statements);
    }

    return Response.json({
      ok: true,
      document: { schemaVersion: 1, updatedAt, moments: cleanMoments },
      backupPath: null,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
