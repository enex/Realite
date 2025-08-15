#!/bin/bash

# Build Docker image locally
echo "Building Docker image..."

# Get the current git commit hash for tagging
GIT_HASH=$(git rev-parse --short HEAD)
IMAGE_NAME="realite-server"
TAG="latest"

# Build the image
docker build -t ${IMAGE_NAME}:${TAG} -t ${IMAGE_NAME}:${GIT_HASH} .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo "Image tags: ${IMAGE_NAME}:${TAG}, ${IMAGE_NAME}:${GIT_HASH}"
    
    # Show image info
    echo ""
    echo "Image details:"
    docker images ${IMAGE_NAME}
else
    echo "❌ Docker build failed!"
    exit 1
fi
