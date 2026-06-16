import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import pluginReact from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      pluginReact.configs.flat.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrorsIgnorePattern: '^_'
      }],
      // Disable strict set-state-in-effect rule - common React pattern
      'react-hooks/set-state-in-effect': 'off',
      // Disable react-in-jsx-scope - not needed with new JSX transform (React 17+)
      'react/react-in-jsx-scope': 'off',
      // Disable prop-types - project uses TypeScript/JS without PropTypes
      'react/prop-types': 'off',
      // Disable no-unescaped-entities - style preference, not a bug
      'react/no-unescaped-entities': 'off',
    },
  },
])