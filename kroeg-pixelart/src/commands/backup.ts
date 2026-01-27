import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_DB_PATH, openDatabase } from '../db.js';

export interface BackupOptions {
  dbPath?: string;
  outputPath?: string;
  force?: boolean;
}

export async function runBackup(
  options: BackupOptions = {}
): Promise<{ dbPath: string; backupPath: string }> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;

  if (!options.outputPath) {
    throw new Error('Backup output path is required.');
  }

  const backupPath = path.resolve(process.cwd(), options.outputPath);
  const resolvedDbPath = path.resolve(process.cwd(), dbPath);

  await fs.mkdir(path.dirname(backupPath), { recursive: true });

  try {
    await fs.stat(backupPath);
    if (!options.force) {
      throw new Error(`Backup file already exists at ${backupPath}. Use --force to overwrite.`);
    }
    await fs.rm(backupPath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const db = openDatabase(dbPath);
  try {
    await db.backup(backupPath);
  } finally {
    db.close();
  }

  return { dbPath: resolvedDbPath, backupPath };
}
