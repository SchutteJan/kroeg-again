import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { downloadImage, requestOxenEdit } from '../oxen.js';

describe('requestOxenEdit', () => {
  it('extracts output url from response', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_url: 'https://example.com/out.png' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await requestOxenEdit(
      {
        model: 'test-model',
        input_image: 'https://example.com/in.png',
        prompt: 'test',
        num_inference_steps: 10,
      },
      { apiKey: 'test-key', fetcher }
    );

    expect(result.outputUrl).toBe('https://example.com/out.png');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('rate limit', {
          status: 429,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ images: [{ url: 'https://example.com/retry.png' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const result = await requestOxenEdit(
      {
        model: 'test-model',
        input_image: 'https://example.com/in.png',
        prompt: 'test',
        num_inference_steps: 10,
      },
      { apiKey: 'test-key', fetcher, maxRetries: 1, initialDelayMs: 0, maxDelayMs: 0 }
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.outputUrl).toBe('https://example.com/retry.png');
  });
});

describe('downloadImage', () => {
  it('writes the fetched image to disk', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      })
    );

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'oxen-test-'));
    const outputPath = path.join(dir, 'download.png');

    const result = await downloadImage('https://example.com/image.png', outputPath, {
      fetcher,
    });

    const written = await fs.readFile(outputPath);

    expect(written).toEqual(Buffer.from([1, 2, 3]));
    expect(result.size).toBe(3);
    expect(result.contentType).toBe('image/png');

    await fs.rm(dir, { recursive: true, force: true });
  });
});
