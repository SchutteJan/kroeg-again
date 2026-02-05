import open from 'open';

import { DEFAULT_DB_PATH } from '../db.js';
import { startDashboardServer } from '../dashboard/server.js';

export interface DashboardOptions {
  port?: number;
  dbPath?: string;
  openBrowser?: boolean;
}

export interface DashboardHandle {
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function runDashboard(
  options: DashboardOptions = {}
): Promise<DashboardHandle> {
  const handle = await startDashboardServer({
    port: options.port,
    dbPath: options.dbPath ?? DEFAULT_DB_PATH,
  });

  const url = `http://localhost:${handle.port}`;

  if (options.openBrowser === true) {
    void open(url);
  }

  return {
    port: handle.port,
    url,
    close: handle.close,
  };
}
