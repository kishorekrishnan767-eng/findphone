import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Privacy: never log names, numbers or coordinates. All diagnostics go through src/lib/log.ts.
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/lib/log.ts'],
    rules: { 'no-console': 'off' },
  },
);
