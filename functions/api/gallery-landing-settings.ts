import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

const SETTINGS_SLUG = "gallery-landing-settings";
const DEFAULT_ORDER = ["county", "venues", "moments", "creative-flash", "stories"];

function parse(value: unknown, fallback: any) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function uniqueStrings(values: unknown) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

async function loadSettings(env: Env) {
  const row: any = await env.MKB_DB.prepare(
    `SELECT document_json FROM content_pages WHERE slug = ? LIMIT 1`,
  )
    .bind(SETTINGS_SLUG)
    .first();

  const stored = parse(row?.document_json, {});
  return {
    cardOrder: uniqueStrings(stored?.cardOrder).length
      ? uniqueStrings(stored.cardOrder)
      : DEFAULT_ORDER,
    hiddenCards: uniqueStrings(stored?.hiddenCards),
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    return Response.json({ ok: true, settings: await loadSettings(context.env) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const body: any = await context.request.json();
    const current = await loadSettings(context.env);
    const settings = {
      cardOrder:
        body?.cardOrder !== undefined
          ? uniqueStrings(body.cardOrder)
          : current.cardOrder,
      hiddenCards:
        body?.hiddenCards !== undefined
          ? uniqueStrings(body.hiddenCards)
          : current.hiddenCards,
    };

    await context.env.MKB_DB.prepare(`
      INSERT INTO content_pages (slug, title, status, document_json, updated_at)
      VALUES (?, 'Gallery Landing Settings', 'active', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET
        document_json = excluded.document_json,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(SETTINGS_SLUG, JSON.stringify(settings))
      .run();

    return Response.json({ ok: true, settings });
  } catch (error) {
    return errorResponse(error);
  }
};
