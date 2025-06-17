import { test, expect } from '@playwright/test';
const homepageURL = '/'

test.describe('homepage', () => {
	test.beforeEach(async ({ page }) => {
		// Go to the starting url before each test.
		await page.goto(homepageURL);
	});
	test('homepage exists', async ({ page }) => {

		// Expect a title "to contain" a substring.
		expect(page).toBeDefined();
	});
})



// test.describe('navigation', () => {
//   test.beforeEach(async ({ page }) => {
//     // Go to the starting url before each test.
//     await page.goto(homepageURL);
//   });

//   test('main navigation', async ({ page }) => {
//     // Assertions use the expect API.
//     await expect(page).toHaveURL(homepageURL);
//   });
// });