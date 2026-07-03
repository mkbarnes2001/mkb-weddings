import fs from 'node:fs';
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config, normalisePrefix } from './config.mjs';
import { contentType, fullFilenameFromThumb, isValidR2ImageKey } from './utils.mjs';

export const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2AccessKeyId,
    secretAccessKey: config.r2SecretAccessKey,
  },
});

export function thumbKey(row) {
  return `${normalisePrefix(config.r2ThumbPrefix)}${row.venue}/${row.category}/${row.filename}`.replace(/\/+/, '/');
}

export function fullKey(row) {
  return `${normalisePrefix(config.r2FullPrefix)}${row.venue}/${row.category}/${fullFilenameFromThumb(row.filename)}`.replace(
    /\/+/,
    '/',
  );
}

export async function listAllKeys(prefix) {
  const keys = [];
  let token;
  const cleanPrefix = normalisePrefix(prefix);

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: config.r2Bucket,
        Prefix: cleanPrefix,
        ContinuationToken: token,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key && isValidR2ImageKey(obj.Key)) keys.push(obj.Key);
    }

    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

export async function uploadFile(localPath, key) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2Bucket,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: contentType(localPath),
    }),
  );
}

export async function deleteR2Key(key) {
  await client.send(new DeleteObjectCommand({ Bucket: config.r2Bucket, Key: key }));
}
