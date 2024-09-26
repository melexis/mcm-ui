/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  globals: {
    process: true,
    __APP_VERSION__: true,
    USBDevice: true
  },
  ignorePatterns: ['grab-git-info.js']
}
