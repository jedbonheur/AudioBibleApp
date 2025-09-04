module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@theme': './assets/theme',
            '@typography': './bible-components/typography',
            '@bookcategories': './bible-module/book-categories',
            '@screens': './screens',
            '@header': './bible-module/header',
            '@bookselect': './bible-module/book-select',
            '@data': './api/core',
            '@components': './components',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};
