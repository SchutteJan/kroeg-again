import type { Tile, ProgressStats, GenerationState } from '../types';

const BASE_URL = '/api';

export async function fetchTiles(status?: string): Promise<Tile[]> {
  const url = status ? `${BASE_URL}/tiles?status=${status}` : `${BASE_URL}/tiles`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load tiles');
  return response.json();
}

export async function fetchTile(id: string): Promise<Tile | null> {
  const response = await fetch(`${BASE_URL}/tiles/${id}`);
  if (!response.ok) return null;
  return response.json();
}

export async function fetchProgress(): Promise<ProgressStats> {
  const response = await fetch(`${BASE_URL}/progress`);
  if (!response.ok) throw new Error('Failed to load progress');
  return response.json();
}

export async function fetchGenerationStatus(): Promise<GenerationState> {
  const response = await fetch(`${BASE_URL}/generate/status`);
  if (!response.ok) throw new Error('Failed to load generation status');
  return response.json();
}

export async function startGeneration(strategy?: string): Promise<GenerationState> {
  const response = await fetch(`${BASE_URL}/generate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to start generation');
  }
  return response.json();
}

export async function pauseGeneration(): Promise<GenerationState> {
  const response = await fetch(`${BASE_URL}/generate/pause`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to pause generation');
  }
  return response.json();
}

export async function retryTile(id: string): Promise<GenerationState> {
  const response = await fetch(`${BASE_URL}/generate/retry/${id}`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to retry tile');
  }
  return response.json();
}

export async function renderTile(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${BASE_URL}/render/${id}`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to render tile');
  }
  return response.json();
}

export async function generateTile(id: string): Promise<GenerationState> {
  const response = await fetch(`${BASE_URL}/generate/tile/${id}`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to generate tile');
  }
  return response.json();
}

export function getTileImageUrl(id: string, type: 'render' | 'output'): string {
  return `${BASE_URL}/tiles/${id}/image?type=${type}&t=${Date.now()}`;
}
