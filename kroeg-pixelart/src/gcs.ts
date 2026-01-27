import fs from 'node:fs/promises';
import path from 'node:path';

import { Storage } from '@google-cloud/storage';

export interface StorageLike {
  bucket(name: string): BucketLike;
}

export interface BucketLike {
  upload(
    sourcePath: string,
    options: {
      destination: string;
      resumable: boolean;
      metadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;
  file(name: string): FileLike;
}

export interface FileLike {
  makePublic(): Promise<unknown>;
}

export interface GcsUploadOptions {
  bucket: string;
  sourcePath: string;
  destination?: string;
  contentType?: string;
  cacheControl?: string;
  makePublic?: boolean;
  storage?: StorageLike;
}

export interface GcsUploadResult {
  bucket: string;
  destination: string;
  publicUrl: string;
  size: number;
}

function encodePath(value: string): string {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function buildPublicUrl(bucket: string, destination: string): string {
  const encoded = encodePath(destination);
  return `https://storage.googleapis.com/${bucket}/${encoded}`;
}

export async function uploadToGcs(options: GcsUploadOptions): Promise<GcsUploadResult> {
  const { bucket, sourcePath } = options;
  const destination = options.destination ?? path.basename(sourcePath);
  const storage = options.storage ?? new Storage();

  const stats = await fs.stat(sourcePath);
  const targetBucket = storage.bucket(bucket);

  await targetBucket.upload(sourcePath, {
    destination,
    resumable: false,
    metadata: {
      contentType: options.contentType,
      cacheControl: options.cacheControl,
    },
  });

  if (options.makePublic) {
    await targetBucket.file(destination).makePublic();
  }

  return {
    bucket,
    destination,
    publicUrl: buildPublicUrl(bucket, destination),
    size: stats.size,
  };
}
