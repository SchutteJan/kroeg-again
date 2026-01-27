## Rules

The goal is a git history that tells a clear story and allows easy debugging, revering, and
cherry-picking.

### General

- ALWAYS keep tests, types, and docs together with the actual code that is being changed.
- Each line of the commit message should be less than 72 characters.

### Commit Structure

- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`, `ci`, `build`
- Scopes are package based, commits can have multiple scopes.

