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

## Frontend Component Architecture (Mandatory)

Build UI with small, composable components and explicit logic boundaries.

- Prefer many focused components over one large page component.
- One file may contain multiple components, but usually export only one top-level component.
- Keep additional components in the same file private unless they are reused.
- If a component is reused in multiple places, move it into its own file.
- Extract non-trivial stateful logic, side effects, and data orchestration into custom hooks (`use*`).
- Keep render logic pure: no side effects, no mutation of props/state, no hidden shared mutable state.
- Call hooks only at top level of components or custom hooks (never in conditions/loops/nested functions).
- Prefer event handlers and derived state over unnecessary `useEffect`.
- Do not silence `rules-of-hooks` or `exhaustive-deps`; refactor instead.

## Refactor Triggers For Large Components

Split a component immediately when one or more of these applies:

- It mixes unrelated responsibilities (layout, data fetching, business rules, and interactions in one body).
- The JSX has multiple distinct UI regions that can be named as separate components.
- State/effect blocks become hard to reason about or require long comments.
- Parts of the UI become reusable or are already duplicated.

## Implementation Notes

- Prefer composition via props/children over deep conditional trees in a single component.
- Name hooks by intent (`useDashboardFilters`, `useEventSyncState`) and keep them focused.
- Co-locate private subcomponents and hooks near their feature; extract only when reused.
- When extracting, keep behavior unchanged and update tests/docs in the same change set when user behavior changes.

## Reference Best Practices

Aligned with React official guidance:

- https://react.dev/learn/thinking-in-react
- https://react.dev/learn/reusing-logic-with-custom-hooks
- https://react.dev/reference/rules/rules-of-hooks
- https://react.dev/learn/removing-effect-dependencies
- https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- https://react.dev/reference/rules/components-and-hooks-must-be-pure
