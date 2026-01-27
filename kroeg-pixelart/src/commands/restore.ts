import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_DB_PATH } from '../db.js';

export interface RestoreOptions {
  dbPath?: string;
  inputPath?: string;
  force?: boolean;
}

export async function runRestore(
  options: RestoreOptions = {}
): Promise<{ dbPath: string; backupPath: string }> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;

  if (!options.inputPath) {
    throw new Error('Restore input path is required.');
  }

  const backupPath = path.resolve(process.cwd(), options.inputPath);
  const resolvedDbPath = path.resolve(process.cwd(), dbPath);

  await fs.stat(backupPath);
  await fs.mkdir(path.dirname(resolvedDbPath), { recursive: true });

  try {
    await fs.stat(resolvedDbPath);
    if (!options.force) {
      throw new Error(`Database already exists at ${resolvedDbPath}. Use --force to overwrite.`);
    }
    await fs.rm(resolvedDbPath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.copyFile(backupPath, resolvedDbPath);

  return { dbPath: resolvedDbPath, backupPath };
}
