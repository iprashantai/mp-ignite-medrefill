import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import * as designTokensPlugin from '@metamask/eslint-plugin-design-tokens';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      '@metamask/design-tokens': designTokensPlugin,
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      complexity: ['warn', { max: 15 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],

      // Best practices
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',

      // Design System: Enforce barrel imports for ui-healthcare
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/ui-healthcare/*', '!@/components/ui-healthcare/table'],
              message: 'Import from @/components/ui-healthcare instead of direct file imports.',
            },
            {
              group: ['@/components/ui-healthcare/table/*'],
              message: 'Import from @/components/ui-healthcare/table instead of direct file imports.',
            },
          ],
        },
      ],
    },
  },
  // Next.js page components are naturally longer - relax function length limit
  {
    files: ['**/app/**/page.tsx', '**/app/**/layout.tsx'],
    rules: {
      'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  // Test files have many test cases - disable function length limit
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  // Design system files: Allow hex colors (these ARE the token definitions)
  {
    files: ['**/design-system/**/*.ts', '**/design-system/**/*.tsx'],
    rules: {
      '@metamask/design-tokens/color-no-hex': 'off',
    },
  },
  // UI-healthcare components: Allow Tailwind colors (these define semantic mappings)
  {
    files: ['**/ui-healthcare/**/*.tsx', '**/ui-healthcare/**/*.ts'],
    rules: {
      '@metamask/design-tokens/color-no-hex': 'off',
    },
  },
  // Application code: Warn on hex colors (should use design system)
  {
    files: ['**/app/**/*.tsx', '**/app/**/*.ts'],
    rules: {
      '@metamask/design-tokens/color-no-hex': 'warn',
    },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'coverage/',
      'neo4j/',
      'scripts/',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
