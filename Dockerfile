# Use the official Bun image
FROM oven/bun:1.0.35-alpine

# Install Node.js 20+ to run Expo CLI with Node for export
# Alpine edge repository has Node.js 20+ which is musl-compatible
RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/main nodejs npm && \
    node --version && npm --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies with npm to ensure Metro alias packages are created
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_TELEMETRY_DETACH=1
ENV EXPO_IMAGE_UTILS_NO_SHARP=1

# Build the application (web export) using Node to avoid Bun/Metro resolution issues
RUN bun run build:web

# Expose the port the server runs on
EXPOSE 3000

# Start the server
CMD ["bun", "run", "server.ts"]
