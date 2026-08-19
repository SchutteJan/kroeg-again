# Kroegen website

Powered by [`solid-start`](https://start.solidjs.com);

## Developing

Once you've installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev
```

### Become admin

```sql
UPDATE "simple-auth-db"."user"
     SET role = 'admin'
     WHERE email = 'use@example.com';
```

## Issues

- Sometimes the dev server will error with `template function not found` on hydration, this was once
  caused because an lucide icon was passed as a prop to another component.
- First request after a (re)start can fail with `Vite environment "ssr" is unavailable` — the SSR
  module graph hasn't finished loading yet, just reload the page. Known upstream issue:
  https://github.com/nitrojs/nitro/issues/4295. To raise the timeout locally, edit the retry loop in
  `node_modules/nitro/dist/runtime/internal/vite/dev-worker.mjs`.
