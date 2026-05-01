FROM oven/bun:1.2.2-alpine AS deps
WORKDIR /app
# bun.lock keeps better-auth ecosystem versions aligned (e.g. oauth-provider ↔ core).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.2.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["bun", "run", "start:prod"]
