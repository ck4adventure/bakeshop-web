import { test, expect } from '@playwright/test';
const homepageURL = '/'

// TODO
// not logged in should land here
// logged in should redirect to /:business/dashboard
test.describe('homepage', () => {
	test.beforeEach(async ({ page }) => {
		// Go to the starting url before each test.
		await page.goto(homepageURL);
	});
	test('homepage exists', async ({ page }) => {

		// Expect a title "to contain" a substring.
		expect(page).toBeDefined();
	});
	test('homepage has a headerbar', async ({ page }) => {
		const header = page.getByTestId('headerbar');
		await expect(header).toBeVisible();
	})
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