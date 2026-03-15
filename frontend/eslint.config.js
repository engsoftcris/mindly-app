import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
  // 1. Pastas e arquivos que o linter NUNCA deve olhar
  globalIgnores([
    'dist',
    'node_modules',
    'cypress/**',
    'cypress.config.js',
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js'
  ]),

  {
    // 2. Configuração para arquivos normais do React
    files: ['src/**/*.{js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
     'no-unused-vars': ['error', { 
  varsIgnorePattern: '^[A-Z_]', // Aceita Maiúsculas (Componentes) ou variáveis com _
  argsIgnorePattern: '^_',      // Aceita argumentos que começam com _
  caughtErrorsIgnorePattern: '^_' // ADICIONE ISSO: Aceita erros de catch com _
}],
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  {
    // 3. REGRA ESPECIAL: Arquivos de teste do Cypress dentro da src
    files: ['src/**/*.cy.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        cy: 'readonly',
        Cypress: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        before: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
      },
    },
    rules: {
      // Desativa regras que não fazem sentido em arquivos de teste
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': 'warn',
    }
  },

  // 4. Prettier sempre por último
  eslintConfigPrettier,
]);