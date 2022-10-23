module.exports = {
  sourceType: 'unambiguous',
  presets: [
    [
      '@babel/env',
      {
        targets: {
          browsers: [
            'last 2 Chrome versions',
            'not Chrome < 60',
            'last 2 Safari versions',
            'not Safari < 10.1',
            'last 2 iOS versions',
            'not iOS < 10.3',
            'last 2 Firefox versions',
            'not Firefox < 54',
            'last 2 Edge versions',
            'not Edge < 15',
            'ie 11',
          ],
        },
        modules: false,
        useBuiltIns: 'usage',
        corejs: { version: 3, proposals: true },
        loose: false,
      },
    ],
    '@babel/preset-typescript',
    '@babel/react',
  ],
  plugins: [
    ['@babel/transform-runtime', { regenerator: true }],
  ]
};
