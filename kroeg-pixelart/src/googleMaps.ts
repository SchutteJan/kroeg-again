export interface TilesetContent {
  uri?: string;
  url?: string;
}

export interface TilesetNode {
  content?: TilesetContent;
  children?: TilesetNode[];
}

export interface TilesetJson {
  root?: TilesetNode;
}

export interface GoogleMapsTilesOptions {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  fetcher?: typeof fetch;
}

export interface RootTilesetResult {
  tileset: TilesetJson;
  session: string | null;
  rootUrl: string;
}

const DEFAULT_BASE_URL = 'https://tile.googleapis.com';
const DEFAULT_ROOT_PATH = '/v1/3dtiles/root.json';
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

function parseRetryAfter(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(headerValue);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
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

async function requestWithRetry(
  url: string,
  options: GoogleMapsTilesOptions,
  responseType: 'json' | 'arrayBuffer'
): Promise<unknown> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const fetcher = options.fetcher ?? fetch;

  let attempt = 0;
  let delay = initialDelayMs;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const response = await fetcher(url);

    if (response.ok) {
      if (responseType === 'arrayBuffer') {
        return response.arrayBuffer();
      }
      return response.json();
    }

    const body = await readErrorBody(response);
    const error = new Error(`Google Maps Tiles request failed (${response.status}). ${body}`.trim());

    if (!shouldRetry(response.status) || attempt === maxRetries) {
      throw error;
    }

    lastError = error;

    const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
    const waitTime = retryAfter ?? delay;
    attempt += 1;
    await sleep(waitTime);
    delay = Math.min(delay * 2, maxDelayMs);
  }

  throw lastError ?? new Error('Google Maps Tiles request failed.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function findFirstContentUri(tileset: unknown): string | null {
  if (!isRecord(tileset)) {
    return null;
  }

  const root = isRecord(tileset.root) ? tileset.root : tileset;

  const queue: unknown[] = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current)) {
      continue;
    }

    const content = current.content;
    if (isRecord(content)) {
      const uri = content.uri ?? content.url;
      if (typeof uri === 'string') {
        return uri;
      }
    }

    const children = current.children;
    if (Array.isArray(children)) {
      queue.push(...children);
    }
  }

  return null;
}

export function extractSessionFromUri(uri: string): string | null {
  try {
    const url = new URL(uri, DEFAULT_BASE_URL);
    return url.searchParams.get('session');
  } catch {
    return null;
  }
}

export function resolveTilesetUrl(uri: string, apiKey: string, baseUrl = DEFAULT_BASE_URL): string {
  const normalized =
    uri.startsWith('http://') || uri.startsWith('https://')
      ? uri
      : `${baseUrl}${uri.startsWith('/') ? '' : '/'}${uri}`;
  const url = new URL(normalized);
  if (!url.searchParams.has('key')) {
    url.searchParams.set('key', apiKey);
  }
  return url.toString();
}

export async function fetchRootTileset(
  options: GoogleMapsTilesOptions = {}
): Promise<RootTilesetResult> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required to fetch Google Maps 3D Tiles.');
  }

  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const rootUrl = `${baseUrl}${DEFAULT_ROOT_PATH}?key=${apiKey}`;
  const tileset = (await requestWithRetry(rootUrl, options, 'json')) as TilesetJson;
  const contentUri = findFirstContentUri(tileset);
  const session = contentUri ? extractSessionFromUri(contentUri) : null;

  return { tileset, session, rootUrl };
}

export async function fetchTilesetJson(
  uri: string,
  options: GoogleMapsTilesOptions = {}
): Promise<TilesetJson> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required to fetch Google Maps 3D Tiles.');
  }
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const url = resolveTilesetUrl(uri, apiKey, baseUrl);
  return (await requestWithRetry(url, options, 'json')) as TilesetJson;
}

export async function fetchTileContent(
  uri: string,
  options: GoogleMapsTilesOptions = {}
): Promise<ArrayBuffer> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required to fetch Google Maps 3D Tiles.');
  }
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const url = resolveTilesetUrl(uri, apiKey, baseUrl);
  return (await requestWithRetry(url, options, 'arrayBuffer')) as ArrayBuffer;
}
