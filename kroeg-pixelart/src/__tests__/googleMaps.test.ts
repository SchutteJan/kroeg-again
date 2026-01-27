import { describe, expect, it } from 'vitest';

import {
  extractSessionFromUri,
  fetchRootTileset,
  findFirstContentUri,
  resolveTilesetUrl,
} from '../googleMaps.js';

describe('google maps tiles helpers', () => {
  it('extracts session from a tileset uri', () => {
    const session = extractSessionFromUri(
      '/v1/3dtiles/datasets/abc/files/root.glb?session=SESSION123'
    );
    expect(session).toBe('SESSION123');
  });

  it('finds the first content uri in a tileset', () => {
    const tileset = {
      root: {
        children: [
          {
            content: {
              uri: '/v1/3dtiles/datasets/abc/files/tile.glb?session=SESSION123',
            },
          },
        ],
      },
    };
    expect(findFirstContentUri(tileset)).toBe(
      '/v1/3dtiles/datasets/abc/files/tile.glb?session=SESSION123'
    );
  });

  it('resolves a tileset url with api key', () => {
    const url = resolveTilesetUrl(
      '/v1/3dtiles/datasets/abc/files/tile.glb?session=SESSION123',
      'TEST_KEY'
    );
    expect(url).toBe(
      'https://tile.googleapis.com/v1/3dtiles/datasets/abc/files/tile.glb?session=SESSION123&key=TEST_KEY'
    );
  });

  it('does not overwrite an existing api key', () => {
    const url = resolveTilesetUrl(
      'https://tile.googleapis.com/v1/3dtiles/root.json?key=EXISTING',
      'NEW_KEY'
    );
    expect(url).toBe('https://tile.googleapis.com/v1/3dtiles/root.json?key=EXISTING');
  });

  it('fetches the root tileset and derives the session', async () => {
    let requestedUrl = '';
    const tileset = {
      root: {
        content: {
          uri: '/v1/3dtiles/datasets/abc/files/root.glb?session=SESSION123',
        },
      },
    };

    const fetcher: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify(tileset), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await fetchRootTileset({ apiKey: 'TEST_KEY', fetcher });
    expect(result.session).toBe('SESSION123');
    expect(requestedUrl).toContain('key=TEST_KEY');
  });
});
