# Kroegen website

Powered by [`solid-start`](https://start.solidjs.com);

## Developing

Once you've installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev
```

## Issues

- Sometimes the dev server will error with `template function not found` on hydration, this was once
  caused because an lucide icon was passed as a prop to another component.
