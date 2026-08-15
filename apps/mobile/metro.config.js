const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// apps/mobile isn't an npm workspace (it has its own package.json/lockfile,
// deliberately, so it can be installed/built independently of the Next.js
// web app at the repo root) — so Metro needs to be told explicitly where to
// find the shared package. packages/shared is pure TypeScript with no
// runtime npm dependencies of its own, so this alias is enough; it doesn't
// need its own node_modules.
config.watchFolders = [path.resolve(workspaceRoot, "packages/shared")];
config.resolver.extraNodeModules = {
  "@fanhub/shared": path.resolve(workspaceRoot, "packages/shared/src"),
};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
