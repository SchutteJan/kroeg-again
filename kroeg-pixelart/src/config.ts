import fs from 'node:fs';
import path from 'node:path';

import type { AppConfig } from './types.js';

const DEFAULT_CONFIG_PATH = 'config.json';

function assertNumber(name: string, value: number): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Config field ${name} must be a number.`);
  }
}

function assertBounds(config: AppConfig): void {
  assertNumber('bounds.north', config.bounds.north);
  assertNumber('bounds.south', config.bounds.south);
  assertNumber('bounds.east', config.bounds.east);
  assertNumber('bounds.west', config.bounds.west);
}

function assertConfigShape(config: AppConfig): void {
  if (!config.bounds) {
    throw new Error('Config field bounds is required.');
  }

  assertBounds(config);
  assertNumber('tileSize', config.tileSize);
  assertNumber('zoomLevel', config.zoomLevel);

  if (!config.oxen?.model) {
    throw new Error('Config field oxen.model is required.');
  }

  assertNumber('oxen.numInferenceSteps', config.oxen.numInferenceSteps);

  if (!config.gcs?.bucket) {
    throw new Error('Config field gcs.bucket is required.');
  }
}

export function loadConfig(configPath = DEFAULT_CONFIG_PATH): AppConfig {
  const resolvedPath = path.resolve(process.cwd(), configPath);
  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = JSON.parse(raw) as AppConfig;

  const numStepsEnv = process.env.OXEN_NUM_INFERENCE_STEPS;
  const numInferenceSteps = numStepsEnv ? Number(numStepsEnv) : parsed.oxen.numInferenceSteps;

  if (numStepsEnv && Number.isNaN(numInferenceSteps)) {
    throw new Error('OXEN_NUM_INFERENCE_STEPS must be a number.');
  }

  const merged: AppConfig = {
    ...parsed,
    oxen: {
      ...parsed.oxen,
      model: process.env.OXEN_MODEL ?? parsed.oxen.model,
      numInferenceSteps,
    },
    gcs: {
      ...parsed.gcs,
      bucket: process.env.GCS_BUCKET ?? parsed.gcs.bucket,
    },
  };

  assertConfigShape(merged);

  return merged;
}
