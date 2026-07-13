import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function required(name, value) {
  if (!value) {
    const error = new Error(
      `Missing required R2 setting: ${name}.`,
    );
    error.statusCode = 500;
    throw error;
  }

  return value;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function createR2StorageFromEnvironment() {
  const enabled =
    String(process.env.MKB_IMAGE_STORAGE || "local")
      .trim()
      .toLowerCase() === "r2";

  if (!enabled) {
    return {
      enabled: false,
      async putImage() {
        throw new Error("R2 storage is not enabled.");
      },
      async deleteImage() {},
    };
  }

  const accountId = required(
    "CLOUDFLARE_ACCOUNT_ID",
    process.env.CLOUDFLARE_ACCOUNT_ID,
  );

  const accessKeyId = required(
    "R2_ACCESS_KEY_ID",
    process.env.R2_ACCESS_KEY_ID,
  );

  const secretAccessKey = required(
    "R2_SECRET_ACCESS_KEY",
    process.env.R2_SECRET_ACCESS_KEY,
  );

  const bucket = required(
    "R2_BUCKET_NAME",
    process.env.R2_BUCKET_NAME,
  );

  const publicBaseUrl = trimTrailingSlash(
    required(
      "R2_PUBLIC_BASE_URL",
      process.env.R2_PUBLIC_BASE_URL,
    ),
  );

  const client = new S3Client({
    region: "auto",
    endpoint:
      `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  async function putImage({
    key,
    body,
    contentType = "image/webp",
    cacheControl =
      "public, max-age=31536000, immutable",
  }) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );

    return {
      key,
      url: `${publicBaseUrl}/${key}`,
    };
  }

  async function deleteImage(key) {
    if (!key) return;

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  return {
    enabled: true,
    bucket,
    publicBaseUrl,
    putImage,
    deleteImage,
  };
}
