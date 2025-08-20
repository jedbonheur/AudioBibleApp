// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
 const config = getDefaultConfig(__dirname);

 // Keep default assetExts for fonts, images, etc.
 config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

 // Add 'svg' to sourceExts so we can import them as components
 config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

 // Use the SVG transformer for .svg files
 config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
 };

 return config;
})();
