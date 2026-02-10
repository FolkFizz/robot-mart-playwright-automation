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
  test.describe('positive cases', () => {
    test('A11Y-HOME-P01: home page has no critical violations @a11y @smoke @safe', async ({
      page,
      homePage,
      runA11y,
      expectNoA11yViolations
    }) => {
      // Arrange & Act: Load home page
      await homePage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: homePage.getA11yExcludeSelectors() });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });
  });

  test.describe('negative cases', () => {
    test('A11Y-HOME-N01: keyboard tab navigation keeps focus on visible interactive elements @a11y @home @regression', async ({
      homePage
    }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Tab once from page root
      await homePage.pressTabFromPageRoot();

      // Assert: Focus lands on a visible interactive control
      expect(await homePage.isFocusedElementVisible()).toBe(true);
      const focusedTag = await homePage.getFocusedElementTagName();
      expect(['a', 'button', 'input', 'select', 'textarea']).toContain(focusedTag);
    });

    test('A11Y-HOME-N02: loading state maintains accessibility @a11y @home @regression', async ({
      page,
      homePage,
      runA11y,
      expectNoA11yViolations
    }) => {
      // Arrange: Navigate to home
      await homePage.goto();

      // Act: Reload to trigger loading state
      await homePage.reloadDomReady();

      // Assert: Check accessibility during/after load
      const results = await runA11y(page, { exclude: homePage.getA11yExcludeSelectors() });
      expectNoA11yViolations(results);
    });
  });

  test.describe('edge cases', () => {
    test('A11Y-HOME-E01: product grid with many items remains accessible @a11y @home @regression', async ({
      page,
      homePage,
      runA11y,
      expectNoA11yViolations
    }) => {
      // Arrange: Load home page with full product catalog
      await homePage.goto();

      // Assert: Product list is populated
      const productCount = await homePage.getProductCount();
      expect(productCount).toBeGreaterThan(5);

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: homePage.getA11yExcludeSelectors() });

      // Assert: No violations with full product grid
      expectNoA11yViolations(results);
    });

    test('A11Y-HOME-E02: search and price filter controls meet color contrast @a11y @home @smoke', async ({
      page,
      homePage,
      runA11y
    }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Run color-contrast checks on core filter controls
      const results = await runA11y(page, {
        include: homePage.getContrastIncludeSelectors()
      });

      // Assert: No color contrast violations on these controls
      const colorContrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
      expect(colorContrastViolations).toEqual([]);
    });

    test('A11Y-HOME-E03: search input supports keyboard submit without focus trap @a11y @home @regression', async ({
      page,
      homePage
    }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act: Use keyboard to submit search
      await expect(homePage.getSearchInput()).toBeVisible();
      await homePage.focusSearchInput();

      const isFocusedBeforeSubmit = await homePage.isSearchInputFocused();
      expect(isFocusedBeforeSubmit).toBe(true);

      await homePage.submitSearchWithEnter('robot');

      // Assert: Search applies via query param and page remains usable
      await expect(page).toHaveURL(/[?&]q=robot/i);
      expect(await homePage.hasResultsOrEmptyState()).toBe(true);
    });

    test('A11Y-HOME-E04: category and sort filters accessible via keyboard @a11y @home @regression', async ({
      page,
      homePage
    }) => {
      // Arrange: Load home page
      await homePage.goto();

      // Act & Assert: Category link can be focused and activated via keyboard
      expect(await homePage.isFirstCategoryLinkVisible()).toBe(true);
      await homePage.focusFirstCategoryLink();
      const categoryFocused = await homePage.isFirstCategoryLinkFocused();
      expect(categoryFocused).toBe(true);
      await homePage.activateFocusedElement();
      await expect(page).toHaveURL(/category=/i);

      // Act & Assert: Sort dropdown is keyboard focusable
      expect(await homePage.isSortSelectVisible()).toBe(true);
      await homePage.focusSortSelect();
      const sortFocused = await homePage.isSortSelectFocused();
      expect(sortFocused).toBe(true);
    });
  });
});
