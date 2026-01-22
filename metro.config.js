const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Configure resolver to properly handle @orpc packages
config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.platforms = ["ios", "android", "native", "web"];

// Add specific module resolution for @orpc packages
config.resolver.alias = {
  ...config.resolver.alias,
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

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});
