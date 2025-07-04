/// <reference types="vitest/config" />

import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// adds @ aliasing for shadcn
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		}
	},
	test: {
    // ...
		globals: true,
		environment: 'jsdom',
		exclude: ['e2e-tests/**', 'tests-examples/**', 'node_modules'],
		coverage: {
			// don't include coverage for shadcn/ui component library
      exclude: ['src/components/ui/**', 'e2e-tests/**', 'tests-examples/**'], 
    },
  },
})
