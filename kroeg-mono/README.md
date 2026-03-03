# Kroegen

TypeScript monorepo for kroeg.jan.tf v2

## Tooling

- Task/build management: [turborepo](https://turborepo.com/) configured in
  [turbo.json](./turbo.json)
- Pre-commit hooks: [Lefthook](https://lefthook.dev/) which are configured in
  [lefthook.yaml](./lefthook.yaml)
- Deployment: Cloudflare (see wrangler.jsonc files for details)
- CI/CD: Github Actions, see [workflows here](.github/workflows)

## Prerequisites

- **Node.js**: https://nodejs.org/en/download
- **pnpm**: https://pnpm.io/installation

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Available Commands

```bash
pnpm dev            # Start development servers
pnpm build          # Build all packages and apps
pnpm types:check    # Type-check all packages
pnpm lint           # Lint codebase with Oxlint
pnpm format         # Format code with Prettier
pnpm test           # Run tests
```

## Development

- **Monorepo**: Uses Turborepo for task orchestration and pnpm workspaces
- **Code Quality**: Pre-commit hooks (Lefthook) auto-format and lint staged files
- **TypeScript**: Strict mode enabled across all packages

## Deployment

Deployed to Cloudflare. Configuration in `wrangler.jsonc` files.

## Project Structure

```
/
├── apps/               # Deployable apps
└── packages/           # Resuable packages
    └── typescript-config/  # TypeScript configs
```
