# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Docker

This project includes Docker support for running the Bun server in a containerized environment.

### Building the Docker Image

```bash
# Build using the provided script
./scripts/build-docker.sh

# Or build manually
docker build -t realite-server .
```

### Running with Docker

```bash
# Run the container
docker run -p 3000:3000 realite-server

# Or use docker-compose for development
docker-compose up
```

### Docker Compose

For local development with hot-reload:

```bash
# Start the service
docker-compose up

# Start in background
docker-compose up -d

# Stop the service
docker-compose down
```

## GitHub Container Registry

The Docker image is automatically built and published to GitHub Container Registry on:

- Push to `main` or `develop` branches
- New version tags (e.g., `v1.0.0`)
- Pull requests to `main` branch

The image will be available at: `ghcr.io/{your-username}/realite`

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
