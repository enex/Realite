# Use the official Bun image
FROM oven/bun:1.0.35-alpine

# Install Node.js to run Expo CLI with Node for export
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies with npm to ensure Metro alias packages are created
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NO_TELEMETRY_DETACH=1
ENV EXPO_OFFLINE=1
ENV EXPO_IMAGE_UTILS_NO_SHARP=1

# Build the application (web export) using Node to avoid Bun/Metro resolution issues
RUN node node_modules/@expo/cli/build/bin/cli export --platform web

# Expose the port the server runs on
EXPOSE 3000

# Start the server
CMD ["bun", "run", "server.ts"]
