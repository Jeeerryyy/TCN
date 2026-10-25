module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@supabase/supabase-js',
            message: 'supabase-js is imported ONLY in src/lib/supabase.ts per TRD rule.'
          }
        ]
      }
    ]
  },
  overrides: [
    {
      files: ['src/lib/supabase.ts'],
      rules: {
        'no-restricted-imports': 'off'
      }
    },
    {
      files: ['src/components/**', 'src/pages/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@supabase/supabase-js', '@/services/**', '../services/**', '../../services/**', '@/lib/supabase*'],
                message: 'Components and Pages must NOT import services or supabase directly. Use hooks (L3) instead.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/hooks/**', 'src/stores/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@supabase/supabase-js', '@/lib/supabase*'],
                message: 'Hooks and stores must call services (L4), never supabase directly.'
              }
            ]
          }
        ]
      }
    }
  ]
};
