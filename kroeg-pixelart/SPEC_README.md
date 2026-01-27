# Specs

## Contents

- [Process Overview](#process-overview)
- [Spec Requirements](#spec-requirements)
- [Implementation Plan Requirements](#implementation-plan-requirements)
- [Reference Handling](#reference-handling)

This repo uses specs and implementation plans to define and build features. The goal is to produce
very detailed, living documents that guide implementation without constraining the order of work.

## Process Overview

1. Read the repo documentation first to understand the project and its conventions.
2. Review existing specs for patterns and language; use the highest quality spec in this repo as
   the bar.
3. Review other specs to understand adjacent domains and prior decisions.
4. Review current project code and documentation for context.
5. Collaborate with the user iteratively to refine the spec. Ask questions to close gaps.
6. When the user references outside code or docs, collect those references and add them to
   the repo's references folder (for example, `specs/references/`).
7. Produce the spec and the implementation plan together; they are a matched pair.

## Spec Requirements

- A spec is a living document: no versions, no "draft" stamps.
- Decisions are locked as long as they are part of the spec.
- If open questions exist, list them at the top of the spec. Keep interviewing the user until they
  are resolved.
- When asking questions, always number them for easy responses.
- Specs are detailed and concrete and can include (not limited to) any relevant material:
  - Interfaces and types
  - Database schemas and migrations
  - Naming conventions
  - HTTP routes and payloads
  - Example snippets
- Be mindful of existing code and documentation in this repo. Prefer aligning with current
  conventions.
- References can point to this repo, other local repos, or external sources. Capture outside
  references into the repo's references folder and cite them in the spec.

## Implementation Plan Requirements

- Every spec must have a corresponding implementation plan.
- The plan is a list of tasks required to implement the spec.
- Tasks must refer back to the spec.
- No phases. Do not group tasks into phases or impose an ordering.
- Tasks should be as independent as possible. If a dependency exists, explicitly note it.
- The plan describes what needs to be done, not the order it must be done in.
- Tasks must be concrete implementation work. No research, discovery, or vague items.
- Tasks use checkboxes for status and start unchecked: `[ ]`.

## Reference Handling

- Specs should reference **live code paths** or external URLs directly.
- Do not copy code into `specs/references/`; avoid frozen snapshots.
- Keep references scoped to what the spec needs; do not bulk-copy unrelated material.
