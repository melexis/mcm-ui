import pluginVue from 'eslint-plugin-vue';
import neostandard from 'neostandard';

export default [
  ...neostandard({
    files: ['**/*.{js,mjs,jsx,vue}'],
    env: ['browser'],
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/*env*',
      '**/coverage/**',
      'vite.config.js',
      '.gitignore'
    ],
    semi: true,
    ts: true,
    noJsx: true,
  }),

  ...pluginVue.configs['flat/essential']
];
