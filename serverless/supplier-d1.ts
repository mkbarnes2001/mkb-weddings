type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalise(value: unknown) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function json(value: unknown, fallback: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value ?? fallback;
  } catch {
    return fallback;
  }
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export type MasterSupplierInput = {
  id?: string;
  name?: string;
  displayName?: string;
  category?: string;
  website?: string;
  instagram?: string;
  email?: string;
  phone?: string;
  location?: string;
  county?: string;
  description?: string;
  notes?: string;
  status?: string;
};

function cleanSupplier(input: MasterSupplierInput) {
  const name = text(input?.name);
  if (!name) throw httpError("Supplier validation failed.", 400, ["Supplier name is required."]);
  const website = text(input?.website);
  if (website && !/^https?:\/\//i.test(website)) {
    throw httpError("Supplier validation failed.", 400, ["Website must begin with http:// or https://."]);
  }
  return {
    id: text(input?.id) || `supplier_${crypto.randomUUID()}`,
    name,
    displayName: text(input?.displayName) || name,
    category: text(input?.category),
    website,
    instagram: text(input?.instagram).replace(/^@/, ""),
    email: text(input?.email),
    phone: text(input?.phone),
    location: text(input?.location),
    county: text(input?.county),
    description: text(input?.description),
    notes: text(input?.notes),
    status: input?.status === "archived" ? "archived" : "active",
  };
}

function hydrate(row: any, weddings: any[] = []) {
  return {
    id: text(row.id),
    name: text(row.name),
    displayName: text(row.display_name || row.name),
    category: text(row.category),
    website: text(row.website),
    instagram: text(row.instagram),
    email: text(row.email),
    phone: text(row.phone),
    location: text(row.location),
    county: text(row.county),
    description: text(row.description),
    notes: text(row.notes),
    status: text(row.status || "active"),
    linkedWeddingCount: new Set(weddings.map((wedding) => text(wedding.wedding_slug))).size,
    linkedWeddings: weddings.map((wedding) => ({
      slug: text(wedding.wedding_slug),
      title: text(wedding.title),
      couple: text(wedding.couple),
      weddingDate: text(wedding.wedding_date),
      role: text(wedding.role),
      sortOrder: Number(wedding.sort_order || 0),
    })),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export async function listMasterSuppliers(db: D1Db, includeArchived = true, workspaceId: string) {
  const supplierResult = await db.prepare(`
    SELECT * FROM suppliers
    WHERE workspace_id = ? ${includeArchived ? "" : "AND status <> 'archived'"}
    ORDER BY status = 'archived' ASC, name COLLATE NOCASE ASC
  `).bind(workspaceId).all();
  const linkResult = await db.prepare(`
    SELECT l.supplier_id, l.wedding_slug, l.role, l.sort_order,
           w.title, w.couple, w.wedding_date
    FROM wedding_supplier_links l
    LEFT JOIN weddings w ON w.slug = l.wedding_slug AND w.workspace_id = l.workspace_id
    WHERE l.workspace_id = ?
    ORDER BY l.sort_order ASC, w.couple COLLATE NOCASE ASC
  `).bind(workspaceId).all();
  const links = linkResult.results || [];
  return (supplierResult.results || []).map((row: any) =>
    hydrate(row, links.filter((link: any) => text(link.supplier_id) === text(row.id))),
  );
}

export async function getMasterSupplier(db: D1Db, id: string, workspaceId: string) {
  const row = await db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workspace_id = ?`).bind(id, workspaceId).first();
  if (!row) return null;
  const links = await db.prepare(`
    SELECT l.supplier_id, l.wedding_slug, l.role, l.sort_order,
           w.title, w.couple, w.wedding_date
    FROM wedding_supplier_links l
    LEFT JOIN weddings w ON w.slug = l.wedding_slug AND w.workspace_id = l.workspace_id
    WHERE l.supplier_id = ? AND l.workspace_id = ?
    ORDER BY l.sort_order ASC, w.couple COLLATE NOCASE ASC
  `).bind(id, workspaceId).all();
  return hydrate(row, links.results || []);
}

export async function findMasterSupplierByName(db: D1Db, name: string, workspaceId: string) {
  const key = normalise(name);
  if (!key) return null;
  const result = await db.prepare(`SELECT * FROM suppliers WHERE workspace_id = ?`).bind(workspaceId).all();
  const row = (result.results || []).find((item: any) => normalise(item.name) === key);
  return row ? hydrate(row) : null;
}

export async function createMasterSupplier(db: D1Db, incoming: MasterSupplierInput, workspaceId: string, pending?: any[]) {
  const supplier = cleanSupplier(incoming);
  const duplicate = await findMasterSupplierByName(db, supplier.name, workspaceId);
  if (duplicate) {
    throw httpError("A supplier with this name already exists.", 409, [duplicate.name]);
  }
  const insert = db.prepare(`
    INSERT INTO suppliers (
      id, workspace_id, name, display_name, category, website, instagram, email, phone,
      location, county, description, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    supplier.id, workspaceId, supplier.name, supplier.displayName, supplier.category,
    supplier.website, supplier.instagram, supplier.email, supplier.phone,
    supplier.location, supplier.county, supplier.description, supplier.notes, supplier.status,
  );
  if (pending) { pending.push(insert); return supplier; }
  await insert.run();
  return getMasterSupplier(db, supplier.id, workspaceId);
}

export async function updateMasterSupplier(db: D1Db, incoming: MasterSupplierInput, workspaceId: string) {
  const supplier = cleanSupplier(incoming);
  if (!text(incoming?.id)) throw httpError("Supplier ID is required.", 400);
  const existing = await db.prepare(`SELECT * FROM suppliers WHERE id = ? AND workspace_id = ?`).bind(supplier.id, workspaceId).first();
  if (!existing) throw httpError("Supplier not found.", 404);
  const oldName = text(existing.name);

  const all = await db.prepare(`SELECT id, name FROM suppliers WHERE workspace_id = ? AND id <> ?`).bind(workspaceId, supplier.id).all();
  const duplicate = (all.results || []).find((item: any) => normalise(item.name) === normalise(supplier.name));
  if (duplicate) throw httpError("A supplier with this name already exists.", 409);

  await db.prepare(`
    UPDATE suppliers SET
      name = ?, display_name = ?, category = ?, website = ?, instagram = ?,
      email = ?, phone = ?, location = ?, county = ?, description = ?, notes = ?,
      status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(
    supplier.name, supplier.displayName, supplier.category, supplier.website,
    supplier.instagram, supplier.email, supplier.phone, supplier.location,
    supplier.county, supplier.description, supplier.notes, supplier.status, supplier.id, workspaceId,
  ).run();

  // Keep denormalised wedding rows and wedding JSON snapshots current so a master edit is reflected everywhere.
  await db.prepare(`
    UPDATE wedding_suppliers
    SET name = ?, website = ?, instagram = ?
    WHERE EXISTS (
      SELECT 1 FROM wedding_supplier_links l
      WHERE l.wedding_slug = wedding_suppliers.wedding_slug
        AND l.sort_order = wedding_suppliers.sort_order
        AND l.supplier_id = ?
        AND l.workspace_id = ?
        AND wedding_suppliers.workspace_id = ?
    )
  `).bind(supplier.name, supplier.website, supplier.instagram, supplier.id, workspaceId, workspaceId).run();

  const linked = await db.prepare(`SELECT wedding_slug, role FROM wedding_supplier_links WHERE supplier_id = ? AND workspace_id = ?`).bind(supplier.id, workspaceId).all();
  for (const link of linked.results || []) {
    const wedding = await db.prepare(`SELECT document_json, published_json FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(link.wedding_slug, workspaceId).first();
    if (!wedding) continue;
    const patchDocument = (raw: unknown) => {
      const document = json(raw, null);
      if (!document || !Array.isArray(document.suppliers)) return raw;
      document.suppliers = document.suppliers.map((item: any) => {
        if (normalise(item?.name) !== normalise(oldName)) return item;
        return {
          ...item,
          name: supplier.name,
          website: supplier.website,
          instagram: supplier.instagram,
        };
      });
      document.updatedAt = new Date().toISOString();
      return JSON.stringify(document);
    };
    const nextDocument = patchDocument(wedding.document_json);
    const nextPublished = text(wedding.published_json) ? patchDocument(wedding.published_json) : wedding.published_json;
    await db.prepare(`UPDATE weddings SET document_json = ?, published_json = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND workspace_id = ?`)
      .bind(nextDocument, nextPublished, link.wedding_slug, workspaceId).run();
  }

  return getMasterSupplier(db, supplier.id, workspaceId);
}

export async function archiveMasterSupplier(db: D1Db, id: string, workspaceId: string) {
  const existing = await getMasterSupplier(db, id, workspaceId);
  if (!existing) throw httpError("Supplier not found.", 404);
  await db.prepare(`UPDATE suppliers SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(id, workspaceId).run();
  return getMasterSupplier(db, id, workspaceId);
}

export async function ensureMasterSupplier(db: D1Db, incoming: MasterSupplierInput, workspaceId: string) {
  const requestedId = text(incoming?.id);
  if (requestedId) {
    const existing = await getMasterSupplier(db, requestedId, workspaceId);
    if (existing) return existing;
  }
  const byName = await findMasterSupplierByName(db, text(incoming?.name), workspaceId);
  if (byName) return byName;
  return createMasterSupplier(db, incoming, workspaceId);
}
