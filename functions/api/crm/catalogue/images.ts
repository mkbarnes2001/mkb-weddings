import { requireProfessionalContext } from "../../../../serverless/platform-auth-d1";
import { requireWorkspaceEntitlement } from "../../../../serverless/platform-entitlements-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";

export const onRequestPost: PagesFunction<any> = async (context) => {
  if (!adminApiRequestAllowed(context.env, context.request)) return notFoundResponse();
  try {
    const actor = context.data?.professionalContext || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    if (!actor.workspaceId || !actor.permissions?.includes("crm:manage") || actor.accessMode === "support") return Response.json({ error: "You do not have permission to upload package images." }, { status: 403 });
    await requireWorkspaceEntitlement(context.env.MKB_DB, actor.workspaceId, "bookings");
    if (!context.env.MKB_IMAGES) throw Object.assign(new Error("Image storage is unavailable."), { statusCode: 503 });
    if (Number(context.request.headers.get("content-length") || 0) > 2 * 1024 * 1024 + 16384) return Response.json({ error: "Choose an image of 2 MB or smaller." }, { status: 413 });
    const form = await context.request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return Response.json({ error: "Choose an image of 2 MB or smaller." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = file.type === "image/png" && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
    const webp = file.type === "image/webp" && new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
    if (!jpeg && !png && !webp) return Response.json({ error: "Choose a valid JPG, PNG or WebP image." }, { status: 415 });
    const key = `workspaces/${actor.workspaceId}/crm/packages/${crypto.randomUUID()}.${png ? "png" : webp ? "webp" : "jpg"}`;
    await context.env.MKB_IMAGES.put(key, bytes, { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { workspaceId: actor.workspaceId, purpose: "crm-package-image" } });
    const base = String(context.env.IMAGE_PUBLIC_BASE_URL || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");
    return Response.json({ ok: true, asset: { url: `${base}/${key}`, storageKey: key } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
};
