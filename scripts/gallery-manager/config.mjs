import path from 'node:path';

export const config = {
  r2Bucket: process.env.R2_BUCKET,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,

  galleryCsv: process.env.GALLERY_CSV || 'public/gallery.csv',

  localThumbRoot: process.env.LOCAL_THUMB_ROOT,
  localFullRoot: process.env.LOCAL_FULL_ROOT,
  localFullHoldingRoot: process.env.LOCAL_FULL_HOLDING_ROOT || '',

  r2ThumbPrefix: process.env.R2_THUMB_PREFIX || 'thumb/',
  r2FullPrefix: process.env.R2_FULL_PREFIX || 'full/',
};

export const requiredColumns = ['venue', 'category', 'filename'];

export const defaultExtraColumns = [
  'tags',
  'blogSlug',
  'blogOrder',
  'blogCover',
  'venuePin',
  'venuePinOrder',
  'momentPin',
  'momentPinOrder',
  'flashPin',
  'flashPinOrder',
];

export const validExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function requireConfig({ allowUndo = false } = {}) {
  if (allowUndo) return;

  const missing = [];

  if (!config.r2Bucket) missing.push('R2_BUCKET');
  if (!config.r2AccountId) missing.push('R2_ACCOUNT_ID');
  if (!config.r2AccessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.r2SecretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.localThumbRoot) missing.push('LOCAL_THUMB_ROOT');
  if (!config.localFullRoot) missing.push('LOCAL_FULL_ROOT');

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export function normalisePrefix(prefix) {
  return String(prefix || '').replace(/^\/+/, '').replace(/\/?$/, '/');
}

export function repoPath(value) {
  return path.resolve(process.cwd(), value);
}
