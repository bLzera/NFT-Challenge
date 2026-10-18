import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Specs Playwright (Fase 5): `test.beforeEach(({}, testInfo) => ...)` é o idioma documentado para
    // pular as fixtures e acessar só o `testInfo` — o `{}` dispara `no-empty-pattern`, que aqui é ruído.
    files: ['test/e2e/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
)
