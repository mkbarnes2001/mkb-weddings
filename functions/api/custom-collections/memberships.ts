import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

type MembershipUpdate = {
  assetKey: string;
  collectionIds: string[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function unique(values: unknown[]) {
  return [...new Set(values.map(text).filter(Boolean))];
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const [collectionResult, membershipResult] = await Promise.all([
      context.env.MKB_DB.prepare(`
        SELECT id, slug, name, status, sort_order
        FROM custom_collections
        WHERE status <> 'archived'
        ORDER BY sort_order ASC, name COLLATE NOCASE ASC
      `).all(),
      context.env.MKB_DB.prepare(`
        SELECT ci.asset_key, ci.collection_id
        FROM collection_images ci
        JOIN custom_collections cc ON cc.id = ci.collection_id
        WHERE cc.status <> 'archived'
        ORDER BY cc.sort_order ASC, cc.name COLLATE NOCASE ASC
      `).all(),
    ]);

    const collections = (collectionResult.results || []).map((row: any) => ({
      id: text(row.id),
      slug: text(row.slug),
      name: text(row.name),
      status: row.status === "active" ? "active" : "draft",
      sortOrder: Number(row.sort_order || 0),
    }));

    const memberships: Record<string, string[]> = {};
    for (const row of membershipResult.results || []) {
      const assetKey = text((row as any).asset_key);
      const collectionId = text((row as any).collection_id);
      if (!assetKey || !collectionId) continue;
      memberships[assetKey] = memberships[assetKey] || [];
      memberships[assetKey].push(collectionId);
    }

    return Response.json({ ok: true, collections, memberships });
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
    const rawUpdates = Array.isArray(body?.updates) ? body.updates : [];
    const updates: MembershipUpdate[] = rawUpdates
      .map((item: any) => ({
        assetKey: text(item?.assetKey),
        collectionIds: unique(Array.isArray(item?.collectionIds) ? item.collectionIds : []),
      }))
      .filter((item: MembershipUpdate) => Boolean(item.assetKey));

    if (!updates.length) {
      return Response.json({ ok: true, updated: 0 });
    }

    const collectionResult = await context.env.MKB_DB.prepare(`
      SELECT id
      FROM custom_collections
      WHERE status <> 'archived'
    `).all();
    const assignableIds = new Set(
      (collectionResult.results || []).map((row: any) => text(row.id)).filter(Boolean),
    );

    const assetKeys = unique(updates.map((item) => item.assetKey));
    const validAssets = new Set<string>();
    const currentRows: any[] = [];
    const CHUNK = 75;

    for (let start = 0; start < assetKeys.length; start += CHUNK) {
      const chunk = assetKeys.slice(start, start + CHUNK);
      const placeholders = chunk.map(() => "?").join(",");

      const [assetResult, membershipResult] = await Promise.all([
        context.env.MKB_DB.prepare(`
          SELECT asset_key
          FROM images
          WHERE asset_key IN (${placeholders})
        `).bind(...chunk).all(),
        context.env.MKB_DB.prepare(`
          SELECT ci.asset_key, ci.collection_id, ci.sort_order, ci.hidden, cc.status
          FROM collection_images ci
          JOIN custom_collections cc ON cc.id = ci.collection_id
          WHERE ci.asset_key IN (${placeholders})
        `).bind(...chunk).all(),
      ]);

      for (const row of assetResult.results || []) {
        const key = text((row as any).asset_key);
        if (key) validAssets.add(key);
      }
      currentRows.push(...(membershipResult.results || []));
    }

    const maxOrderResult = await context.env.MKB_DB.prepare(`
      SELECT collection_id, COALESCE(MAX(sort_order), 0) AS max_order
      FROM collection_images
      GROUP BY collection_id
    `).all();
    const nextOrder = new Map<string, number>();
    for (const row of maxOrderResult.results || []) {
      nextOrder.set(text((row as any).collection_id), Number((row as any).max_order || 0));
    }

    const currentByAsset = new Map<string, Set<string>>();
    for (const row of currentRows) {
      if (text(row.status) === "archived") continue;
      const assetKey = text(row.asset_key);
      const collectionId = text(row.collection_id);
      if (!assetKey || !collectionId) continue;
      const set = currentByAsset.get(assetKey) || new Set<string>();
      set.add(collectionId);
      currentByAsset.set(assetKey, set);
    }

    const statements: any[] = [];
    let updated = 0;

    for (const update of updates) {
      if (!validAssets.has(update.assetKey)) continue;

      const selected = new Set(update.collectionIds.filter((id) => assignableIds.has(id)));
      const current = currentByAsset.get(update.assetKey) || new Set<string>();

      for (const collectionId of current) {
        if (selected.has(collectionId)) continue;
        statements.push(
          context.env.MKB_DB.prepare(`
            DELETE FROM collection_images
            WHERE collection_id = ? AND asset_key = ?
          `).bind(collectionId, update.assetKey),
        );
      }

      for (const collectionId of selected) {
        if (current.has(collectionId)) continue;
        const order = (nextOrder.get(collectionId) || 0) + 1;
        nextOrder.set(collectionId, order);
        statements.push(
          context.env.MKB_DB.prepare(`
            INSERT OR IGNORE INTO collection_images (collection_id, asset_key, sort_order, hidden)
            VALUES (?, ?, ?, 0)
          `).bind(collectionId, update.assetKey, order),
        );
      }

      updated += 1;
    }

    for (let start = 0; start < statements.length; start += CHUNK) {
      await context.env.MKB_DB.batch(statements.slice(start, start + CHUNK));
    }

    return Response.json({ ok: true, updated });
  } catch (error) {
    return errorResponse(error);
  }
};
