import fs from 'node:fs/promises';
import path from 'node:path';

import type { OxenGenerationRequest } from './types.js';

export interface OxenClientOptions {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  fetcher?: typeof fetch;
}

export interface OxenEditResult {
  outputUrl: string;
  raw: unknown;
}

export interface DownloadResult {
  outputPath: string;
  size: number;
  contentType?: string | null;
}

const DEFAULT_BASE_URL = 'https://hub.oxen.ai/api';
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 4_000;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  if (status === 429) {
    return true;
  }
  return status >= 500 && status <= 599;
}

function extractOutputUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const direct = record.output_url ?? record.outputUrl ?? record.url;
  if (typeof direct === 'string') {
    return direct;
  }

  const images = record.images;
  if (Array.isArray(images)) {
    for (const entry of images) {
      if (entry && typeof entry === 'object') {
        const imageRecord = entry as Record<string, unknown>;
        const url = imageRecord.url ?? imageRecord.output_url ?? imageRecord.outputUrl;
        if (typeof url === 'string') {
          return url;
        }
      }
    }
  }

  return null;
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export async function requestOxenEdit(
  payload: OxenGenerationRequest,
  options: OxenClientOptions = {}
): Promise<OxenEditResult> {
  const apiKey = options.apiKey ?? process.env.OXEN_API_KEY;
  if (!apiKey) {
    throw new Error('OXEN_API_KEY is required to call Oxen.ai.');
  }

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const fetcher = options.fetcher ?? fetch;

  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetcher(`${baseUrl}/images/edit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const body = (await response.json()) as unknown;
        const outputUrl = extractOutputUrl(body);
        if (!outputUrl) {
          throw new Error('Oxen.ai response missing output URL.');
        }
        return { outputUrl, raw: body };
      }

      const bodyText = await readErrorBody(response);
      const errorMessage = `Oxen.ai request failed (${response.status}). ${bodyText}`.trim();
      const error = new Error(errorMessage);

      if (!shouldRetry(response.status) || attempt === maxRetries) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(String(error));
      }

      if (attempt === maxRetries) {
        break;
      }
    }

    attempt += 1;
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }

  throw lastError ?? new Error('Oxen.ai request failed.');
}

export async function downloadImage(
  url: string,
  outputPath: string,
  options: { fetcher?: typeof fetch } = {}
): Promise<DownloadResult> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url);
  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new Error(`Failed to download image (${response.status}). ${body}`.trim());
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);

  return {
    outputPath,
    size: buffer.byteLength,
    contentType: response.headers.get('content-type'),
  };
}
