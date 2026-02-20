# AGENTS.md

## Purpose

This repository contains the Realite web app. It must always include clear, user-facing documentation under `/docs`.

## Mandatory Documentation Policy

When implementing any product change, bug fix, or UX flow change, update the docs in the same change set if user behavior is affected.

A change is considered documentation-relevant if it alters at least one of:

- onboarding/login/permissions
- groups, contacts, invites, hashtags, visibility
- event creation/sync/matching/suggestions
- error handling that users can see
- navigation and main user flows

## Source of Truth for User Docs

User docs are rendered from markdown files in:

- `content/docs/*.md`

Routes:

- `/docs`
- `/docs/[slug]`

The docs index and routing metadata are controlled in:

- `src/lib/docs.ts`

## Documentation Quality Requirements

Docs must be:

- written for end users, not developers
- concise, task-oriented, and accurate
- updated with concrete behavior (not planned behavior)
- consistent with current UI labels and flows

For every docs-relevant code change, ensure at least one of these is updated:

1. existing page content in `content/docs/*.md`
2. a new docs page entry in `src/lib/docs.ts`
3. FAQ entries for new error cases or edge cases

## Pull Request / Change Checklist

Before finalizing work, verify:

1. `/docs` still loads
2. changed flow is documented in markdown
3. outdated statements are removed
4. links in docs still work

If no user-facing behavior changed, explicitly state that no docs update was required.

## Style

- Use clear language.
- Prefer German for product docs unless a page is intentionally English.
- Use headings and short sections.
- Include practical steps where relevant.
