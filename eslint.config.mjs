import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';

// Flat-config port of the former .eslintrc.json + .eslintignore (Next 16 /
// ESLint 10 default format). Next's core-web-vitals + typescript flat configs
// replace the old `extends`; the custom rule block is applied last so it wins.
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'public/**',
      '.vscode/**',
      '.claude/**',
      // Node tooling / experiments — not app code, never in `next lint` scope.
      'scripts/**',
      'rb-extractor/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-duplicate-imports': 'error',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      // eslint-plugin-react-hooks v6 (pulled in by next/core-web-vitals 16)
      // newly promotes these React Compiler-era checks to errors. They flag
      // real patterns to clean up, but were not errors under Next 15 — keep
      // them as warnings so the framework bump doesn't block CI, consistent
      // with this repo's "warnings tracked for incremental cleanup" stance.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/error-boundaries': 'warn',
    },
  },
];

export default eslintConfig;
