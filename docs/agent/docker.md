# Docker Support

## Building

```bash
# Build Docker image
./scripts/build-docker.sh

# Or directly
docker build -t realite-server .
```

## Running

```bash
# Run with docker-compose (includes postgres)
docker-compose up

# Run container directly
docker run -p 3000:3000 realite-server
```

## Configuration

- `Dockerfile` - Server container definition
- `docker-compose.yml` - Multi-container setup (server + postgres)
- `.dockerignore` - Files excluded from Docker build
