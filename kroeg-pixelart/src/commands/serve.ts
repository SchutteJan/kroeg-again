import path from 'node:path';

import express from 'express';

export interface ServeOptions {
  port?: number;
  outputDir?: string;
}

const DEFAULT_OUTPUT_DIR = 'output';
const DEFAULT_PORT = 3000;

export function runServe(options: ServeOptions = {}): Promise<{ port: number; url: string }> {
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const port = options.port ?? DEFAULT_PORT;
  const resolvedDir = path.resolve(process.cwd(), outputDir);

  const app = express();
  app.use(express.static(resolvedDir));

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const url = `http://localhost:${actualPort}`;
      console.log(`Viewer running at ${url}/viewer/index.html`);
      resolve({ port: actualPort, url });
    });
  });
}
