import path from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Browser, type Page } from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let browser: Browser | null = null;
let page: Page | null = null;
let initPromise: Promise<Page> | null = null;

/**
 * Get or create a Puppeteer page with WebGL enabled.
 * Uses singleton pattern to reuse browser instance across renders.
 */
export async function getPage(): Promise<Page> {
  if (page) {
    return page;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initBrowser();
  return initPromise;
}

async function initBrowser(): Promise<Page> {
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ],
  });

  page = await browser.newPage();

  // Capture browser console for debugging
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warn') {
      console.error(`[browser ${type}]`, msg.text());
    }
  });

  page.on('pageerror', (err) => {
    console.error('[browser pageerror]', String(err));
  });

  // Set viewport to a reasonable default (will be resized per render)
  await page.setViewport({ width: 512, height: 512 });

  // Load the scene HTML
  const scenePath = path.join(__dirname, 'scene.html');
  console.log(`Loading scene from: ${scenePath}`);
  await page.goto(`file://${scenePath}`, { waitUntil: 'networkidle0' });

  // Wait for Three.js to initialize
  await page.waitForFunction('typeof window.renderScene === "function"', {
    timeout: 30000,
  });

  return page;
}

/**
 * Close the browser instance and clean up resources.
 */
export async function closeBrowser(): Promise<void> {
  if (page) {
    await page.close().catch(() => {});
    page = null;
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
  initPromise = null;
}

/**
 * Check if the browser is currently initialized.
 */
export function isBrowserInitialized(): boolean {
  return browser !== null && page !== null;
}
