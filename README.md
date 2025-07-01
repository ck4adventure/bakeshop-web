# Stack Setup
React/Vite frontend. using `ts`.
Shadcn/ui for components.
Tailwindcss for styling.
Vitest for testing and coverage reporting.
Playwright for e2e testing across all browsers.

## To run locally
1. clone this repo
2. ensure Node22
3. `npm install`
4. `npm run dev`

## To add shadcn/ui components
`npx shadcn@latest add [item]`

## Vitest
### To run component tests
`npm run test`

### Test List
See [the tests file](./docs/testing/vitest_tests.txt) for a complete list of current tests.

### Adding tests
- test file goes next to component [Name].test.tsx
- describe, before and after blocks, and use `it` for the test
- use `spy` to check if a function has been called
- use `mock` to actually alter the implementation

## To run Playwright
`npx playwright test`, or. 
`npm run playwright`