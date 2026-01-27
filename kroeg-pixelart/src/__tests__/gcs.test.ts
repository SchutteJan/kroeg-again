import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import type { BucketLike, FileLike, StorageLike } from '../gcs.js';
import { buildPublicUrl, uploadToGcs } from '../gcs.js';

describe('buildPublicUrl', () => {
  it('encodes object paths safely', () => {
    const url = buildPublicUrl('test-bucket', 'folder name/file.png');
    expect(url).toBe(
      'https://storage.googleapis.com/test-bucket/folder%20name/file.png'
    );
  });
});

describe('uploadToGcs', () => {
  it('uploads the file and returns the public URL', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gcs-test-'));
    const sourcePath = path.join(dir, 'sample.txt');
    await fs.writeFile(sourcePath, 'hello');

    const upload = vi.fn().mockResolvedValue(undefined);
    const makePublic = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockReturnValue({ makePublic } satisfies FileLike);

    const bucket = vi.fn().mockReturnValue({
      upload,
      file,
    } satisfies BucketLike);

    const storage: StorageLike = { bucket };

    const result = await uploadToGcs({
      bucket: 'demo-bucket',
      sourcePath,
      storage,
      makePublic: true,
    });

    expect(upload).toHaveBeenCalledWith(sourcePath, {
      destination: 'sample.txt',
      resumable: false,
      metadata: {
        contentType: undefined,
        cacheControl: undefined,
      },
    });
    expect(file).toHaveBeenCalledWith('sample.txt');
    expect(makePublic).toHaveBeenCalled();
    expect(result.publicUrl).toBe(
      'https://storage.googleapis.com/demo-bucket/sample.txt'
    );
    expect(result.size).toBe(5);

    await fs.rm(dir, { recursive: true, force: true });
  });
});
