import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../serverless/venue-d1";
import { getProfessionalContext, type ProfessionalContext } from "../../serverless/platform-auth-d1";
import {
  archivePlatformBrandAsset,
  createPlatformBrandAsset,
  listPlatformBrandAssets,
} from "../../serverless/platform-brand-assets-d1";
import { getPlatformAdministration } from "../../serverless/platform-administration-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES: R2Bucket;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  IMAGE_PUBLIC_BASE_URL?: string;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

const MAX_ASSET_BYTES = 3 * 1024 * 1024;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function safeName(value: string) {
  return text(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70) || "platform-asset";
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  return "";
}

async function resolveContext(context: any): Promise<ProfessionalContext> {
  const existing = context.data?.professionalContext as ProfessionalContext | undefined;
  return existing || getProfessionalContext(context.env.MKB_DB, context.request, context.env);
}

function allowed(actor: ProfessionalContext) {
  return actor.accessGranted
    && actor.platformRole === "platform_admin"
    && actor.permissions.includes("platform:admin")
    && actor.accessMode !== "support";
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();

  try {
    const actor = await resolveContext(context);
    if (!actor.accessGranted) return Response.json({ error: "Professional sign-in required." }, { status: 401 });
    if (!allowed(actor)) return Response.json({ error: "WedPlanned platform administrator access is required." }, { status: 403 });

    if (context.request.method === "GET") {
      const assets = await listPlatformBrandAssets(context.env.MKB_DB, actor);
      return Response.json({ ok: true, assets }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (context.request.method === "POST") {
      if (!context.env.MKB_IMAGES) {
        return Response.json({ error: "Public image storage is not configured." }, { status: 503 });
      }

      const form = await context.request.formData();
      const file = form.get("file");
      const assetType = text(form.get("assetType"));
      const requestedName = text(form.get("name"));

      if (!(file instanceof File)) return Response.json({ error: "Choose a logo or icon image." }, { status: 400 });
      if (!["logo", "icon"].includes(assetType)) return Response.json({ error: "Asset type must be logo or icon." }, { status: 400 });
      const extension = extensionFor(file.type);
      if (!extension) return Response.json({ error: "Only PNG, JPEG and WebP assets are supported." }, { status: 415 });
      if (file.size <= 0 || file.size > MAX_ASSET_BYTES) {
        return Response.json({ error: "Platform assets must be 3 MB or smaller." }, { status: 413 });
      }

      const name = (requestedName || safeName(file.name)).slice(0, 80);
      const id = `platform_asset_${crypto.randomUUID()}`;
      const filename = `${safeName(name)}-${crypto.randomUUID().slice(-8)}.${extension}`;
      const storageKey = `platform/brand-assets/${assetType}/${filename}`;
      const publicBaseUrl = (text(context.env.IMAGE_PUBLIC_BASE_URL) || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");
      const url = `${publicBaseUrl}/${storageKey}`;

      await context.env.MKB_IMAGES.put(storageKey, file, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: {
          purpose: `platform-${assetType}`,
          originalFilename: file.name,
          uploadedBy: actor.email,
        },
      });

      try {
        await createPlatformBrandAsset(context.env.MKB_DB, actor, {
          id,
          name,
          assetType: assetType as "logo" | "icon",
          storageKey,
          url,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      } catch (error) {
        await context.env.MKB_IMAGES.delete(storageKey).catch(() => {});
        throw error;
      }

      const platformAdmin = await getPlatformAdministration(context.env.MKB_DB, actor);
      return Response.json({ ok: true, platformAdmin }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    }

    if (context.request.method === "DELETE") {
      const assetId = new URL(context.request.url).searchParams.get("id") || "";
      const archived = await archivePlatformBrandAsset(context.env.MKB_DB, actor, assetId);
      if (context.env.MKB_IMAGES && archived.storageKey) {
        context.waitUntil(context.env.MKB_IMAGES.delete(archived.storageKey).catch(() => {}));
      }
      const platformAdmin = await getPlatformAdministration(context.env.MKB_DB, actor);
      return Response.json({ ok: true, platformAdmin }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
