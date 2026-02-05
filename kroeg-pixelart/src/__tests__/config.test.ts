import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../config.js';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('loads defaults from config.json', () => {
    const config = loadConfig('config.json');

    expect(config.bounds.north).toBe(52.3682);
    expect(config.bounds.south).toBe(52.3636);
    expect(config.tileSize).toBe(512);
    expect(config.zoomLevel).toBe(18);
    expect(config.view.originLat).toBe(52.366);
    expect(config.view.viewHeightMeters).toBe(200);
  });

  it('applies environment overrides', () => {
    process.env.OXEN_MODEL = 'test-model';
    process.env.OXEN_NUM_INFERENCE_STEPS = '42';
    process.env.GCS_BUCKET = 'test-bucket';

    const config = loadConfig('config.json');

    expect(config.oxen.model).toBe('test-model');
    expect(config.oxen.numInferenceSteps).toBe(42);
    expect(config.gcs.bucket).toBe('test-bucket');
  });
});
