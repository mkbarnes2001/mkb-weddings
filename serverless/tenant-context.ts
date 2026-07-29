import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function hostnameFromRequest(request: Request) {
  try {
    return new URL(request.url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolve the workspace for an Admin Pages request.
 *
 * When professional auth is enforced, middleware stores the authenticated
 * membership context in context.data. In bootstrap/local mode we deliberately
 * fall back to the configured default workspace so the existing MKB rollout
 * remains reversible. A browser-supplied workspace ID is never consulted.
 */
export async function resolveAdminWorkspaceId(context: any) {
  const authenticated = text(context?.data?.professionalContext?.workspaceId);
  if (authenticated) return authenticated;
  return getDefaultWorkspaceId(context.env.MKB_DB as D1Db);
}

/**
 * Resolve public content ownership from a verified domain mapping. This is the
 * public equivalent of the authenticated Admin membership boundary.
 *
 * Pages preview/local hosts intentionally fall back to the default workspace
 * so MKB preview deployments continue to work. Production custom domains are
 * expected to be present in workspace_domains.
 */
export async function resolvePublicWorkspaceId(db: D1Db, request: Request) {
  const hostname = hostnameFromRequest(request);
  if (hostname) {
    const row = await db.prepare(`
      SELECT wd.workspace_id
      FROM workspace_domains wd
      JOIN workspaces w ON w.id = wd.workspace_id
      WHERE lower(wd.hostname) = ?
        AND wd.verified = 1
        AND wd.purpose IN ('public', 'gallery', 'api')
        AND w.status = 'active'
      LIMIT 1
    `).bind(hostname).first();
    const mapped = text(row?.workspace_id);
    if (mapped) return mapped;

    const previewHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".pages.dev");
    if (!previewHost) return "";
  }

  return getDefaultWorkspaceId(db);
}

/**
 * Preserve the historic content_pages keys for MKB while giving every other
 * workspace a collision-free storage key. The logical API slug remains the
 * same; only the internal content_pages primary key is namespaced.
 */
export function workspaceContentKey(workspaceId: string, logicalSlug: string) {
  const workspace = text(workspaceId) || "workspace_mkb_weddings";
  const slug = text(logicalSlug);
  return workspace === "workspace_mkb_weddings" ? slug : `${workspace}:${slug}`;
}
