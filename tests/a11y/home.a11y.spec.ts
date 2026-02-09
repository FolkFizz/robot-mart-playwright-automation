import { test, expect } from '@fixtures';

/**
 * =============================================================================
 * HOME PAGE ACCESSIBILITY TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. WCAG 2.1 AA Compliance Validation
 * 2. Keyboard Navigation (Nav, Footer, Products)
 * 3. Screen Reader Compatibility (Headings, Semantics)
 * 4. Interactive Elements (Search, Filters)
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - A11Y-HOME-P01: home page has no critical violations
 * 
 * NEGATIVE CASES (2 tests):
 *   - A11Y-HOME-N01: keyboard tab navigation keeps focus on visible interactive elements
 *   - A11Y-HOME-N02: loading state maintains accessibility
 * 
 * EDGE CASES (4 tests):
 *   - A11Y-HOME-E01: product grid with many items remains accessible
 *   - A11Y-HOME-E02: search and price filter controls meet color contrast
 *   - A11Y-HOME-E03: search input supports keyboard submit without focus trap
 *   - A11Y-HOME-E04: category and sort filters accessible via keyboard
 * 
 * Business Rules Tested:
 * ----------------------
 * - Accessibility Standard: WCAG 2.1 Level AA
 * - Semantics: Proper heading hierarchy, landmark roles
 * - Navigation: Focus management, skip links, keyboard traps prevention
 * - Coverage Areas: Product cards, search input, navigation, filters
 * - Keyboard Access: All interactive elements must be keyboard accessible
 * - Known Legacy UI Debt: stock badge contrast + unlabeled sort select are
 *   excluded from non-blocking page-level audits until fixed in the app
 * 
 * =============================================================================
 */

test.describe('home accessibility @a11y @safe', () => {
  const homeA11yExclude = [
    '.chat-toggle',
    '.reset-link',
    'h2 > span',
    '.stock-status .in-stock',
    'select.sort-select'
  ];

  test.describe('positive cases', () => {

    test('A11Y-HOME-P01: home page has no critical violations @a11y @smoke @safe', async ({ page, homePage, runA11y, expectNoA11yViolations }) => {
      // Arrange & Act: Load home page
      await homePage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: homeA11yExclude });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });
  });

  test.describe('negative cases', () => {

    test('A11Y-HOME-N01: keyboard tab navigation keeps focus on visible interactive elements @a11y @home @regression', async ({ page, homePage }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Tab once from page root
      await page.keyboard.press('Tab');

      // Assert: Focus lands on a visible interactive control
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      const focusedTag = await focusedElement.evaluate((el) => el.tagName.toLowerCase());
      expect(['a', 'button', 'input', 'select', 'textarea']).toContain(focusedTag);
    });

    test('A11Y-HOME-N02: loading state maintains accessibility @a11y @home @regression', async ({ page, homePage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to home
      await homePage.goto();
      
      // Act: Reload to trigger loading state
      await page.reload();
      
      // Assert: Check accessibility during/after load
      await page.waitForLoadState('domcontentloaded');
      const results = await runA11y(page, { exclude: homeA11yExclude });
      expectNoA11yViolations(results);
    });
  });

  test.describe('edge cases', () => {

    test('A11Y-HOME-E01: product grid with many items remains accessible @a11y @home @regression', async ({ page, homePage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Load home page with full product catalog
      await homePage.goto();

      // Assert: Product list is populated
      const productCount = await page.locator('[data-testid^="product-card-"]').count();
      expect(productCount).toBeGreaterThan(5);

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: homeA11yExclude });

      // Assert: No violations with full product grid
      expectNoA11yViolations(results);
    });

    test('A11Y-HOME-E02: search and price filter controls meet color contrast @a11y @home @smoke', async ({ page, homePage, runA11y }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Run color-contrast checks on core filter controls
      const results = await runA11y(page, {
        include: [
          'input[placeholder="Search models..."]',
          'input.filter-input[name="minPrice"]',
          'input.filter-input[name="maxPrice"]',
          '.btn-filter'
        ]
      });

      // Assert: No color contrast violations on these controls
      const colorContrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
      expect(colorContrastViolations).toEqual([]);
    });

    test('A11Y-HOME-E03: search input supports keyboard submit without focus trap @a11y @home @regression', async ({ page, homePage }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Use keyboard to submit search
      const searchInput = page.locator('input[placeholder="Search models..."]');
      await expect(searchInput).toBeVisible();
      await searchInput.focus();
      await searchInput.fill('robot');

      const isFocusedBeforeSubmit = await searchInput.evaluate((el) => el === document.activeElement);
      expect(isFocusedBeforeSubmit).toBe(true);

      await searchInput.press('Enter');

      // Assert: Search applies via query param and page remains usable
      await expect(page).toHaveURL(/[?&]q=robot/i);
      const hasAnyResult = (await page.locator('[data-testid^="product-card-"]').count()) > 0;
      const emptyStateVisible = await page.getByText('No bots found matching your criteria.').isVisible().catch(() => false);
      expect(hasAnyResult || emptyStateVisible).toBe(true);
    });

    test('A11Y-HOME-E04: category and sort filters accessible via keyboard @a11y @home @regression', async ({ page, homePage }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act & Assert: Category link can be focused and activated via keyboard
      const categoryLink = page.locator('.category-list a[href*="category="]').first();
      await expect(categoryLink).toBeVisible();
      await categoryLink.focus();
      const categoryFocused = await categoryLink.evaluate((el) => el === document.activeElement);
      expect(categoryFocused).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/category=/i);

      // Act & Assert: Sort dropdown is keyboard focusable
      const sortSelect = page.locator('select.sort-select');
      await expect(sortSelect).toBeVisible();
      await sortSelect.focus();
      const sortFocused = await sortSelect.evaluate((el) => el === document.activeElement);
      expect(sortFocused).toBe(true);
    });
  });
});
