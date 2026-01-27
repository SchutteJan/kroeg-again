import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const defaultBaseUrl = process.env.KROEG_API_BASE_URL || 'http://localhost:5173';

const optionalString = (description: string) =>
  z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().optional().describe(description),
  );

const sharedAuthSchema = z.object({
  baseUrl: optionalString('Base URL for the Kroeg app API'),
  apiKey: optionalString('API key for /api/curation endpoints'),
  authToken: optionalString('Bearer token for session-protected endpoints'),
});

const sharedHeaders = (auth: { apiKey?: string; authToken?: string }) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (auth.authToken) {
    headers.Authorization = `Bearer ${auth.authToken}`;
  } else if (auth.apiKey) {
    headers.Authorization = `Bearer ${auth.apiKey}`;
  }

  return headers;
};

const requestJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }

  return body;
};

export const kroegApiGetUncuratedTool = createTool({
  id: 'kroeg-api-uncurated',
  description: 'Fetch uncurated licenses for labeling from the local Kroeg app API.',
  inputSchema: sharedAuthSchema.extend({
    limit: z.number().int().min(1).max(100).optional().describe('Max number of licenses to fetch'),
    category: z.string().optional().describe('Optional category filter'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const params = new URLSearchParams();
    if (context.limit) {
      params.set('limit', String(context.limit));
    }
    if (context.category) {
      params.set('category', context.category);
    }

    const url = `${baseUrl}/api/curation/uncurated${params.size ? `?${params}` : ''}`;
    const apiKey = context.apiKey || process.env.KROEG_API_KEY;
    return requestJson(url, {
      method: 'GET',
      headers: sharedHeaders({ apiKey }),
    });
  },
});

export const kroegApiCreateDecisionTool = createTool({
  id: 'kroeg-api-decide',
  description: 'Submit a curation decision for a license/location.',
  inputSchema: sharedAuthSchema.extend({
    license_id: z.number().int().describe('License id from the uncurated list'),
    label: z.string().describe('Curated label'),
    sanitized_name: z.string().min(1).describe('Cleaned location name'),
    reasoning: z.string().optional().describe('Optional reasoning for the decision'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const apiKey = context.apiKey || process.env.KROEG_API_KEY;
    const url = `${baseUrl}/api/curation/decide`;
    return requestJson(url, {
      method: 'POST',
      headers: {
        ...sharedHeaders({ apiKey }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        license_id: context.license_id,
        label: context.label,
        sanitized_name: context.sanitized_name,
        reasoning: context.reasoning,
      }),
    });
  },
});

export const kroegApiStatsTool = createTool({
  id: 'kroeg-api-stats',
  description: 'Get current dataset curation stats.',
  inputSchema: z.object({
    baseUrl: z.string().optional().describe('Base URL for the Kroeg app API'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const url = `${baseUrl}/api/curation/stats`;
    return requestJson(url, {
      method: 'GET',
      headers: sharedHeaders({}),
    });
  },
});

export const kroegApiPendingTool = createTool({
  id: 'kroeg-api-pending',
  description: 'Fetch pending verification decisions (requires a session token).',
  inputSchema: sharedAuthSchema,
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const authToken = context.authToken || process.env.KROEG_AUTH_TOKEN;
    const url = `${baseUrl}/api/curation/pending`;
    return requestJson(url, {
      method: 'GET',
      headers: sharedHeaders({ authToken }),
    });
  },
});

export const kroegApiVerifyTool = createTool({
  id: 'kroeg-api-verify',
  description: 'Verify or reject a pending decision (requires a session token).',
  inputSchema: sharedAuthSchema.extend({
    location_id: z.number().int().describe('Location id to verify'),
    approved: z.boolean().describe('Whether the decision is approved'),
    override_label: z.string().optional().describe('Override label (optional)'),
    override_name: z.string().optional().describe('Override name (optional)'),
    override_reasoning: z.string().optional().describe('Override reasoning (optional)'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const authToken = context.authToken || process.env.KROEG_AUTH_TOKEN;
    const url = `${baseUrl}/api/curation/verify`;
    return requestJson(url, {
      method: 'POST',
      headers: {
        ...sharedHeaders({ authToken }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_id: context.location_id,
        approved: context.approved,
        override_label: context.override_label,
        override_name: context.override_name,
        override_reasoning: context.override_reasoning,
      }),
    });
  },
});

export const kroegApiSyncLicensesTool = createTool({
  id: 'kroeg-api-sync',
  description: 'Trigger license sync from a remote GeoJSON feed (requires a session token).',
  inputSchema: sharedAuthSchema.extend({
    source_url: z.string().url().describe('GeoJSON URL to sync from'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const authToken = context.authToken || process.env.KROEG_AUTH_TOKEN;
    const url = `${baseUrl}/api/licenses/sync`;
    return requestJson(url, {
      method: 'POST',
      headers: {
        ...sharedHeaders({ authToken }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source_url: context.source_url }),
    });
  },
});

export const kroegApiSearchLicensesTool = createTool({
  id: 'kroeg-api-license-search',
  description:
    'Search all licenses (curated and uncurated) by name, address, or feature id.',
  inputSchema: sharedAuthSchema.extend({
    q: z.string().optional().describe('Search query (name/address/postcode)'),
    feature_id: z.string().optional().describe('Exact feature id to match'),
    limit: z.number().int().min(1).max(200).optional().describe('Max results'),
  }),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const baseUrl = context.baseUrl || defaultBaseUrl;
    const apiKey = context.apiKey || process.env.KROEG_API_KEY;
    const params = new URLSearchParams();
    if (context.q) {
      params.set('q', context.q);
    }
    if (context.feature_id) {
      params.set('feature_id', context.feature_id);
    }
    if (context.limit) {
      params.set('limit', String(context.limit));
    }

    const url = `${baseUrl}/api/licenses/search${params.size ? `?${params}` : ''}`;
    return requestJson(url, {
      method: 'GET',
      headers: sharedHeaders({ apiKey }),
    });
  },
});
