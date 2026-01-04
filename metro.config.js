const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Configure resolver to properly handle @orpc packages
config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.platforms = ["ios", "android", "native", "web"];

// Add specific module resolution for @orpc and @ path aliases
const path = require("path");
config.resolver.alias = {
  ...config.resolver.alias,
  // Path alias for @/ (maps to project root)
  "@": path.resolve(__dirname),
  "@orpc/server/fetch": require.resolve("@orpc/server/fetch"),
  "@orpc/server/plugins": require.resolve("@orpc/server/plugins"),
  "@orpc/zod": require.resolve("@orpc/zod"),
  "@orpc/openapi": require.resolve("@orpc/openapi"),
  "@orpc/openapi/fetch": require.resolve("@orpc/openapi/fetch"),
};

// Ensure proper node_modules resolution
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  require.resolve("@orpc/server/fetch").replace("/fetch.js", ""),
  require.resolve("@orpc/server/plugins").replace("/plugins.js", ""),
];

module.exports = withNativeWind(config, {
  input: "./global.css",
});
