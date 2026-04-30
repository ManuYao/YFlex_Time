const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore npm staging ghost directories left by a partially-failed install
// (Windows NTFS corruption). They have shapes like .expo-audio-oRCPSRvA or
// .react-native-screens-h6o9ORyv. Their subdirs are unreadable and crash
// Metro's file watcher (FallbackWatcher → scandir UNKNOWN errno -4094).
config.resolver.blockList = [
  /node_modules[/\\]\.expo-[\w-]+[/\\].*/,
  /node_modules[/\\]\.react-native[\w-]+[/\\].*/,
];

config.watcher = config.watcher || {};
config.watcher.healthCheck = { enabled: false };

module.exports = config;
