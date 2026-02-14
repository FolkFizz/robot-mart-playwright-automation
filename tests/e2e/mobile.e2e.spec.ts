import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos } from '@api';
import { routes } from '@config';
import { seededProducts, catalogSearch, coupons, uiMessages } from '@data';

/**
 * Overview: Mobile viewport E2E checks for responsive navigation and core shopping flows.
 * Summary: Verifies touch-friendly layout behavior, mobile menu interactions, and critical customer actions on small-screen dimensions.
 */

test.use({
  seedData: true
});

test.describe('mobile viewport @e2e @mobile', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('MOBILE-P01: mobile navigation menu accessible @e2e @mobile @smoke', async (
      { page, homePage },
      testInfo
    ) => {
      // Act: Navigate to home on mobile
      await homePage.goto();

      // Assert: Runtime viewport matches active project device profile.
      const viewport = page.viewportSize();
      const configuredViewport = testInfo.project.use.viewport as
        | { width: number; height: number }
        | undefined;
      expect(viewport).toBeTruthy();
      expect(configuredViewport).toBeTruthy();
      expect(viewport?.width).toBe(configuredViewport?.width);
      expect(viewport?.height).toBe(configuredViewport?.height);

      // Verify navigation exists (hamburger menu or nav links)
      expect(await homePage.isNavigationVisible()).toBe(true);
    });

    test('MOBILE-P02: add product to cart on mobile viewport @e2e @mobile @regression', async ({
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Navigate to home
      await homePage.goto();
      await homePage.waitForAnyProductCardVisible();

      // Act: Click product and add to cart
      await homePage.clickProductByIndex(0);
      await productPage.addToCart();

      // Assert: Navigate to cart and verify product added
      await cartPage.goto();
      const itemCount = await cartPage.getItemCount();
      expect(itemCount).toBeGreaterThan(0);
    });

    test('MOBILE-P03: view and update cart quantity on mobile viewport @e2e @mobile @regression', async ({
      api,
      page,
      cartPage
    }) => {
      // Arrange: Seed cart with one product
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      // Act: Navigate to cart
      await cartPage.goto();

      // Assert: Cart page loads on mobile
      await expect(page).toHaveURL((url) => url.pathname === routes.cart);
      expect(await cartPage.getItemCount()).toBeGreaterThan(0);

      // Interact: Increase quantity via mobile controls
      const beforeQty = await cartPage.getItemQuantity(seededProducts[0].id);
      await cartPage.increaseQtyById(seededProducts[0].id);
      const afterQty = await cartPage.waitForItemQuantityAtLeast(
        seededProducts[0].id,
        beforeQty + 1,
        3_000
      );
      expect(afterQty).toBe(beforeQty + 1);
    });

    test('MOBILE-P04: checkout page accessible on mobile @e2e @mobile @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Add item to cart
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      // Act: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckoutWithFallback();

      // Assert: Checkout page loads
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );

      // Verify checkout controls visible
      expect(await checkoutPage.isNameInputVisible()).toBe(true);
      expect(await checkoutPage.isSubmitButtonVisible()).toBe(true);
    });
  });

  test.describe('negative cases', () => {
    test('MOBILE-N01: empty-cart checkout is blocked on mobile @e2e @mobile @regression @destructive', async ({
      api,
      page,
      checkoutPage
    }) => {
      // Arrange: Ensure no items in cart
      await seedCart(api, []);

      // Act: Try direct checkout access
      await checkoutPage.goto();

      // Assert: Redirect to cart OR guarded checkout state
      const url = page.url();
      const redirectedToCart = url.includes(routes.cart);
      const stayedOnCheckout =
        url.includes(routes.order.checkout) || url.includes(routes.order.place);
      const hasGuard = await checkoutPage.hasEmptyCartGuard([
        uiMessages.cartEmpty,
        'cart is empty',
        'empty cart',
        'no items'
      ]);

      expect(redirectedToCart || (stayedOnCheckout && hasGuard)).toBe(true);
    });

    test('MOBILE-N02: invalid coupon shows validation error on mobile cart @e2e @mobile @regression', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with one item
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      await cartPage.goto();

      // Act: Apply invalid coupon
      await cartPage.applyCoupon('INVALID_COUPON_MOBILE');

      // Assert: Error appears and coupon not applied
      await cartPage.expectAlertContains(/invalid coupon/i);
      expect(await cartPage.isRemoveCouponVisible()).toBe(false);
    });

    test('MOBILE-N03: no-result search shows empty state on mobile @e2e @mobile @regression', async ({
      homePage
    }) => {
      // Arrange: Home page on mobile
      await homePage.goto();

      // Act: Search with no-result keyword
      await homePage.search(catalogSearch.noResults);

      // Assert: Empty state shown
      expect(await homePage.isEmptyStateVisible()).toBe(true);
      expect(await homePage.getProductCount()).toBe(0);
    });

    test('MOBILE-N04: invalid checkout email blocked by HTML5 validation on mobile @e2e @mobile @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Cart with one item and open checkout
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      await cartPage.goto();
      await cartPage.proceedToCheckoutWithFallback();
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );

      // Act: Fill invalid email and attempt submit
      await checkoutPage.setName('Mobile Tester');
      await checkoutPage.setEmail('invalid-email');
      await checkoutPage.clickSubmit();

      // Assert: Browser validation blocks submission
      const isValid = await checkoutPage
        .getEmailInput()
        .evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );
    });
  });

  test.describe('edge cases', () => {
    test('MOBILE-E01: product cards remain usable on small screens @e2e @mobile @regression', async ({
      page,
      homePage
    }) => {
      // Act: Navigate to home
      await homePage.goto();

      // Assert: Product grid exists and is visible
      const productCount = await homePage.getProductCount();
      expect(productCount).toBeGreaterThan(0);

      // Verify products are laid out properly (not overflowing)
      await homePage.scrollProductCardIntoViewByIndex(0);
      expect(await homePage.isProductCardVisibleByIndex(0)).toBe(true);

      // Verify card remains at least partially visible in viewport
      const metrics = await homePage.getProductCardViewportMetricsByIndex(0);
      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.left).toBeLessThan(metrics.viewportWidth);
      expect(metrics.top).toBeLessThan(metrics.viewportHeight);

      // Verify card is still actionable on mobile
      await homePage.clickProductByIndex(0);
      await expect(page).toHaveURL(/\/product\/[^/?#]+(?:\?.*)?$/);
    });

    test('MOBILE-E02: landscape rotation keeps checkout flow accessible @e2e @mobile @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Seed cart and rotate to landscape
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      const currentViewport = page.viewportSize();
      expect(currentViewport).toBeTruthy();
      await page.setViewportSize({
        width: currentViewport!.height,
        height: currentViewport!.width
      });

      // Act: Go cart -> checkout in landscape
      await cartPage.goto();
      await cartPage.proceedToCheckoutWithFallback();

      // Assert: Checkout still reachable and interactable
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );
      expect(await checkoutPage.isNameInputVisible()).toBe(true);
      expect(await checkoutPage.isSubmitButtonVisible()).toBe(true);
    });

    test('MOBILE-E03: repeated quantity updates remain consistent on mobile cart @e2e @mobile @regression', async ({
      api,
      cartPage
    }) => {
      // Arrange: Single item in cart
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      await cartPage.goto();

      // Act: Repeat increase interactions and collect final quantity
      const startQty = await cartPage.getItemQuantity(seededProducts[0].id);
      let endQty = startQty;
      for (let i = 0; i < 5; i += 1) {
        await cartPage.increaseQtyById(seededProducts[0].id);
        endQty = await cartPage.waitForItemQuantityAtLeast(
          seededProducts[0].id,
          startQty + 1,
          2_000
        );
        if (endQty >= startQty + 2) break;
      }

      // Assert: Quantity increases and cart count remains consistent
      expect(endQty).toBeGreaterThan(startQty);
      expect(await cartPage.getCartCount()).toBe(endQty);
    });

    test('MOBILE-E04: coupon apply/remove lifecycle works on mobile cart @e2e @mobile @regression', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with one item
      await seedCart(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      await cartPage.goto();

      // Act: Apply then remove coupon
      await cartPage.applyCoupon(coupons.welcome10.code);
      expect(await cartPage.isDiscountVisible()).toBe(true);
      await cartPage.removeCoupon();

      // Assert: Coupon removed and input becomes available again
      expect(await cartPage.isDiscountVisible()).toBe(false);
      expect(await cartPage.isCouponInputVisible()).toBe(true);
    });
  });
});


