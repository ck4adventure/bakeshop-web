import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react-x'
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config(
	{ ignores: ['dist'] },
	{
		extends: [js.configs.recommended,     // Remove ...tseslint.configs.recommended and replace with this
		...tseslint.configs.recommendedTypeChecked,
		// Alternatively, use this for stricter rules
		// ...tseslint.configs.strictTypeChecked,
		// Optionally, add this for stylistic rules
		// ...tseslint.configs.stylisticTypeChecked,

		// From vite for react linting
		react.configs.recommended,
		reactDom.configs.recommended,
		],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			// other options...
			parserOptions: {
				project: ['./tsconfig.node.json', './tsconfig.app.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			// Put rules you want to override here
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			"react-x/no-class-component": "warn",
			"react-dom/no-dangerously-set-innerhtml": "warn",
		},
	},
)
