# AGENTS.md

## Purpose

This repository contains the Realite web app. It must always include clear, user-facing documentation under `/docs`.

## Product Context Every Agent Must Understand

### What Realite is

Realite is the social coordination layer for real life.

Core idea:

- reduce planning overhead
- make real activities easier to discover, create, and join
- help people spend less time coordinating and more time actually meeting

Short product sentence:

- **Weniger organisieren. Mehr zusammen erleben.**

### What problem Realite solves

Realite exists because social coordination often breaks down due to:

- too much back-and-forth in chats
- poor visibility into who is free and what is happening
- too much friction for spontaneous plans
- many existing contacts but too few real shared activities

There is also a secondary, less important use case:

- helping people socialize in the moment at larger events such as city festivals, parties, fairs, or festivals
- making it easier to notice that interesting, known, or mutually relevant people are already nearby and open to being approached

This can support dating and spontaneous socializing, but it is not the primary product center. Treat it as an extension of real-life coordination, not as a people-browsing core.

### Who Realite is for

Primary audience:

- socially active people, especially roughly 20-35
- people with an existing network of friends, contacts, or loose ties
- people who like spontaneity but do not want coordination overhead

### What Realite is not

Do not accidentally steer the product toward the wrong category. Realite is:

- not a chat-first app
- not a feed-first social network
- not a generic event marketplace
- not a stranger-first dating app

It is a layer over an existing social life.

## Product Principles Agents Must Preserve

- **Activity over communication**: the core object is a concrete activity, not a conversation thread.
- **Explicit sharing only**: nothing should be shared automatically without a user-controlled step.
- **Privacy first**: calendar data is input/context, not something to publish by default.
- **Contacts are for relevance, not spam**: importing contacts must not turn into aggressive outreach.
- **Visibility must stay intentional**: users need clear control over who can see or join something.
- **Real-life usefulness beats feature cleverness**: optimize for less coordination and more actual participation.
- **Presence is secondary and opt-in**: if Realite helps users notice relevant people at the same event, that visibility must be explicit, limited, and clearly user-controlled.

## Product Mental Model

When making product or implementation decisions, think in this order:

1. **Activity**: What is the concrete joinable thing the user wants to do?
2. **Context**: What calendar, contacts, location, or preference data can help without being exposed?
3. **Visibility**: Who should be able to see this activity?
4. **Action**: Can the user join directly, request access, or express interest?
5. **Learning**: Can the system use the outcome to make future suggestions better?

For event-presence or on-site socializing features, still apply the same model:

1. What real-world event or place anchors the interaction?
2. Who has explicitly chosen to be visible there?
3. What makes another person relevant: known contact, mutual context, mutual interest, or explicit openness?
4. How can the interaction stay low-pressure and privacy-safe?

If a proposed change adds complexity but does not improve one of these five layers, question it.

## Decision Rules For Ambiguous Work

If requirements are incomplete, prefer decisions that preserve these properties:

1. explicit user control
2. privacy and least surprise
3. reuse of existing social graph over random discovery
4. simple activity flows over feature sprawl
5. clean abstraction boundaries over provider-specific shortcuts

## Repo Map

Use this as the default orientation map before making changes:

- `app/`: Next.js App Router routes, screens, API handlers
- `src/`: application logic, integrations, shared utilities, data access
- `content/docs/`: user-facing documentation rendered at `/docs`
- `src/lib/docs.ts`: docs index metadata and routing source of truth
- `drizzle/`: generated migration artifacts
- `tests/`: Bun tests for business logic and important regressions
- `.cursor/rules/`: workspace-specific agent rules

## Default Working Sequence For Agents

For implementation tasks, follow this order unless there is a strong reason not to:

1. understand the user request in product terms
2. read the relevant code paths and current docs
3. identify the affected product principle(s), user flow, and visibility/privacy constraints
4. make the smallest coherent code change
5. update user-facing docs if behavior changed
6. run the smallest meaningful validation command set
7. summarize what changed, why it changed, and whether docs/tests were updated

## Repository Workflows And Commands

Use Bun for package management and local task execution.

### Core Commands

- `bun install` installs dependencies.
- `bun run dev` starts the local Next.js dev server.
- `bun run build` creates the production build with `next build --webpack`.
- `bun run start` runs the production server locally.
- `bun run lint` runs `next lint`.
- `bun run typecheck` runs `tsc --noEmit`.
- `bun run test` runs the Bun test suite.
- `bun run check` runs the current fast validation gate: typecheck + tests.

### Database Workflow

- `bun run db:generate` generates Drizzle migrations after schema changes.
- `bun run db:migrate` applies pending migrations.
- `bun run db:studio` opens Drizzle Studio for local database inspection.
- When changing `src/db/schema.ts`, include the generated migration artifacts in the same change set.

### Validation Workflow

Before finalizing implementation work, run the smallest command set that proves the change:

1. `bun run typecheck` for TypeScript or API surface changes.
2. `bun run test` for logic changes covered by Bun tests.
3. `bun run lint` for UI or app-router changes.
4. `bun run build` when touching build config, routing, or production-only behavior.

Prefer `bun run check` as the default quick validation pass when it covers the change.

### Documentation Workflow

There are two different documentation audiences in this repository:

- `content/docs/*`: end-user documentation rendered inside the product
- `README.md` and `AGENTS.md`: developer and agent onboarding

Update the right layer:

- change `content/docs/*` when user behavior, product flows, permissions, or visible wording changes
- change `README.md` or `AGENTS.md` when product framing, architecture expectations, or contributor guidance becomes unclear or outdated

### AI-Hub Tasks (Implementierungsaufträge)

When the user asks to implement, fix, or add a feature (e.g. “implement X”, “fix Y”):

1. **Before implementing**: Query AI-Hub tasks (MCP server `user-ai-hub-tasks`, tool `task_find` with a relevant `search` such as “Realite”, “Profilbild”, “Apple”). Use `task_get` to read the matching task’s name and description as the implementation spec. Note: in the API response, `subtasks` denotes the **parent/supertask** of that task (inverted).
2. **After implementing**: Update the task appropriately: `task_complete` with a short message, or `task_update` / `task_comment` to document what was done and what remains.

See `.cursor/rules/ai-hub-tasks.mdc` for the full workflow and tool parameters.

If the MCP server is unavailable in the current environment, continue with local repo context and mention that limitation in the final summary.

### GitHub Workflow

- `.github/workflows/docker-build.yml` builds the Docker image for pushes to `main` and `develop`, and for tags matching `v*`.
- Pull requests targeting `main` trigger the same workflow in build mode without pushing the image.
- Treat Docker build health as part of release readiness when changing runtime dependencies, build inputs, or container behavior.

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

## Product Language And Writing Guidance

When writing copy, docs, UI labels, or implementation notes about product behavior:

- use concrete language over marketing fluff
- describe activities, visibility, participation, and coordination clearly
- avoid framing Realite as a social feed, chat replacement, or mass-invite tool
- be careful with any wording that implies automatic publishing or automatic outreach
- prefer German for user-facing product docs unless there is a deliberate reason to keep a page in English

When in doubt, explain:

- what happens
- what does not happen automatically
- who can see it
- what the user controls

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

## Feature Logic Architecture (Mandatory)

When implementing or changing feature logic on the application/business-logic layer:

- Keep the logic abstract and independent from concrete infrastructure such as Google Calendar, Google Contacts, the database, system time, or other external providers.
- Define clear interfaces / ports at the logic boundary and inject concrete implementations instead of calling provider-specific code directly from the core logic.
- Model time as an injected function or dependency when logic depends on `now`, deadlines, expiry, throttling, scheduling, or comparisons against the current time.
- Prefer in-memory or fake implementations for tests so important scenarios can run without a real database or external calendar/contact provider.
- Structure the code so underlying providers can be replaced later without rewriting the business logic.

## Integration Boundary Guidance

Realite currently integrates with systems like Google Calendar and Google Contacts. Agents must treat those as replaceable adapters, not as the product model itself.

- Calendar integration provides timing context, free/busy signals, and optional import/export helpers.
- Contacts integration provides relevance, ordering, and social graph hints.
- Neither integration should define the product's core concepts.
- Avoid leaking provider-specific terminology into the business logic unless it is isolated to an adapter boundary.

## Logic Testing Requirements

For every non-trivial feature on the logic layer:

- Add unit tests that verify the important behavior and edge cases of the business logic.
- Test the logic independently of the database and external provider implementations whenever reasonably possible.
- Cover success paths, relevant failure/edge cases, and time-dependent scenarios where applicable.
- If a change is intentionally too small to require new tests, state that explicitly in the final summary.

## Definition Of A Good Change

A strong change in this repo usually has these properties:

- the user-facing outcome is clearer or simpler
- privacy and visibility behavior are easier to reason about
- business logic is more isolated from infrastructure
- docs and tests stay aligned with behavior
- the implementation helps future agents understand the intent, not just the mechanics

## Reference Best Practices

Aligned with React official guidance:

- https://react.dev/learn/thinking-in-react
- https://react.dev/learn/reusing-logic-with-custom-hooks
- https://react.dev/reference/rules/rules-of-hooks
- https://react.dev/learn/removing-effect-dependencies
- https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps
- https://react.dev/reference/rules/components-and-hooks-must-be-pure
