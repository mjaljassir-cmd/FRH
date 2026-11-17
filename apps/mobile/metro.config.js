// Monorepo-aware Metro config (Expo SDK auto-detects workspaces).
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
