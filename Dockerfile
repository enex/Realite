# Stage 1: Build the web export using Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies with npm to ensure Metro alias packages are created
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_TELEMETRY_DETACH=1
ENV EXPO_IMAGE_UTILS_NO_SHARP=1

# Build the application (web export)
RUN npm run build:web

# Stage 2: Runtime with Bun
FROM oven/bun:1.0.35-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies with Bun (faster for runtime)
RUN bun install --production

# Copy built web export from builder stage
COPY --from=builder /app/dist ./dist

# Copy server source code and other necessary files
COPY server ./server
COPY shared ./shared
COPY db ./db
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib
COPY constants ./constants
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY server.ts ./

# Expose the port the server runs on
EXPOSE 3000

# Start the server
CMD ["bun", "run", "server.ts"]
