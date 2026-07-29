import { resolvePublicWorkspaceId, workspaceContentKey } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

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

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(env.MKB_DB, request);
    const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
    const row: any = await env.MKB_DB.prepare(
      `SELECT document_json FROM content_pages WHERE slug = ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(settingsKey, workspaceId)
      .first();

    const stored = parse(row?.document_json, {});
    const settings = {
      cardOrder: uniqueStrings(stored?.cardOrder).length
        ? uniqueStrings(stored.cardOrder)
        : DEFAULT_ORDER,
      hiddenCards: uniqueStrings(stored?.hiddenCards),
    };

    return Response.json(
      { ok: true, settings },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load gallery landing settings." },
      { status: 500 },
    );
  }
};
