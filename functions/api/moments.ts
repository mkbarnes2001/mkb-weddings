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
    const moments = Array.isArray(document?.moments) ? document.moments : [];
    const updatedAt = String(document?.updatedAt || new Date().toISOString());
    const statements: any[] = [context.env.MKB_DB.prepare(`DELETE FROM moments`)];
    moments.forEach((moment: any, index: number) => {
      const clean = {
        id: String(moment.id || `moment_${crypto.randomUUID()}`),
        name: String(moment.name || '').trim(),
        slug: String(moment.slug || '').trim(),
        description: String(moment.description || ''),
        availableForAssignment: Boolean(moment.availableForAssignment),
        showOnMomentsLanding: Boolean(moment.showOnMomentsLanding),
        cardImageId: String(moment.cardImageId || '').trim(),
        heroImageId: String(moment.heroImageId || '').trim(),
        pinnedImageIds: Array.isArray(moment.pinnedImageIds) ? [...new Set(moment.pinnedImageIds.map((value: any) => String(value || '').trim()).filter(Boolean))] : [],
        imageOrderIds: Array.isArray(moment.imageOrderIds) ? [...new Set(moment.imageOrderIds.map((value: any) => String(value || '').trim()).filter(Boolean))] : [],
        hiddenImageIds: Array.isArray(moment.hiddenImageIds) ? [...new Set(moment.hiddenImageIds.map((value: any) => String(value || '').trim()).filter(Boolean))] : [],
        sortOrder: Number(moment.sortOrder || index + 1),
        status: moment.status === 'archived' ? 'archived' : 'active',
      };
      if (!clean.name || !clean.slug) return;
      statements.push(context.env.MKB_DB.prepare(`
        INSERT INTO moments (id, slug, name, description, available_for_assignment, show_on_landing, card_image_id, sort_order, status, document_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(clean.id, clean.slug, clean.name, clean.description, clean.availableForAssignment ? 1 : 0, clean.showOnMomentsLanding ? 1 : 0, clean.cardImageId, clean.sortOrder, clean.status, JSON.stringify(clean), updatedAt));
    });
    await context.env.MKB_DB.batch(statements);
    return Response.json({ ok: true, document: { schemaVersion: 1, updatedAt, moments }, backupPath: null });
  } catch (error) { return errorResponse(error); }
};
