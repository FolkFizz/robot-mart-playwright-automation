/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2023: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest'
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'playwright-report/',
    'test-results/',
    'allure-report/',
    'allure-results/',
    'performance/results/'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ]
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    {
      files: ['performance/**/*.js'],
      globals: {
        __ENV: 'readonly',
        __VU: 'readonly',
        __ITER: 'readonly',
        open: 'readonly'
      }
    }
  ]
};
