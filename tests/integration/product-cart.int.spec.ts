import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos, loginAsUser } from '@api';
import {
  PRODUCT_CART_FIXED_STOCK as FIXED_STOCK,
  productCartFirstProduct as firstProduct,
  productCartSecondProduct as secondProduct
} from '@test-helpers/constants/inventory';
import { ensureProductStock } from '@test-helpers';
import {
  addToCartRaw,
  canRunStockMutationTests,
  expectStockValidationError,
  getCartItem,
  getProductDetail,
  getProductStock,
  stockMutationSkipReason
} from '@test-helpers/helpers/orders';

/**
 * Overview: Integration tests for product-detail data fidelity after cart insertion.
 * Summary: Checks price/name/image consistency, quantity carryover, repeated-add accumulation, and stock-validation error behavior.
 */

test.use({ seedData: true });

test.describe('product to cart integration @integration @cart', () => {
  test.skip(!canRunStockMutationTests(), stockMutationSkipReason);

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await ensureProductStock(api, firstProduct.id, FIXED_STOCK);
    await ensureProductStock(api, secondProduct.id, FIXED_STOCK);
    await loginAndSyncSession(api, page);
    await seedCart(api, []);
  });

  test.describe('positive cases', () => {
    test('PROD-CART-INT-P01: product price matches cart unit price @integration @cart @smoke', async ({
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Navigate to product detail page.
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      // Act: Add product to cart.
      const productPrice = await productPage.getPriceValue();
      await productPage.addToCart();

      // Assert: Cart row keeps product unit price.
      await cartPage.goto();
      const cartPrice = await cartPage.getItemPriceValue(firstProduct.id);
      expect(cartPrice).toBeCloseTo(productPrice, 2);
    });

    test('PROD-CART-INT-P02: product name transfers correctly to cart row @integration @cart @regression', async ({
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Open second product detail page.
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      // Act: Capture name and add to cart.
      const productName = await productPage.getTitle();
      await productPage.addToCart();

      // Assert: Cart row shows matching product name.
      await cartPage.goto();
      const cartItemName = await cartPage.getItemName(secondProduct.id);
      expect(cartItemName).toContain(productName);
    });

    test('PROD-CART-INT-P03: selected quantity is preserved when added to cart @integration @cart @regression', async ({
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Open product detail page.
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      // Act: Choose quantity and add to cart.
      await productPage.setQuantity(2);
      await productPage.addToCart();

      // Assert: Quantity is preserved in cart line item.
      await cartPage.goto();
      const quantity = await cartPage.getItemQuantity(firstProduct.id);
      expect(quantity).toBe(2);
    });
  });

  test.describe('negative cases', () => {
    test('PROD-CART-INT-N01: out-of-stock product cannot be added via API @integration @cart @regression', async ({
      api
    }) => {
      // Arrange: Deplete stock and login a regular user.
      await ensureProductStock(api, firstProduct.id, 0);
      await loginAsUser(api);
      await seedCart(api, []);

      // Act: Attempt to add unavailable product.
      const add = await addToCartRaw(api, firstProduct.id, 1);

      // Assert: API rejects request with stock validation error.
      expect(add.status).toBe(400);
      expectStockValidationError(add.body);
    });

    test('PROD-CART-INT-N02: quantity above current stock is rejected @integration @cart @regression', async ({
      api
    }) => {
      // Arrange: Read current stock.
      const currentStock = await getProductStock(api, firstProduct.id);
      expect(currentStock).toBeGreaterThan(0);

      // Act: Attempt to add quantity above available stock.
      const add = await addToCartRaw(api, firstProduct.id, currentStock + 1);

      // Assert: API rejects excessive quantity.
      expect(add.status).toBe(400);
      expectStockValidationError(add.body);
    });
  });

  test.describe('edge cases', () => {
    test('PROD-CART-INT-E01: product image mapping remains consistent in cart @integration @cart @regression', async ({
      api,
      homePage,
      productPage
    }) => {
      // Arrange: Open product and fetch product metadata.
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);
      const productImage = await productPage.getImageSrc();
      const product = await getProductDetail(api, firstProduct.id);
      const imageSet = (product.image_set ?? '').toLowerCase();

      // Act: Add to cart and fetch cart item payload.
      await productPage.addToCart();
      const cartItem = await getCartItem(api, firstProduct.id);

      // Assert: Cart keeps the same image-set mapping.
      expect(productImage).toBeTruthy();
      expect(cartItem).toBeTruthy();

      if (productImage && cartItem && imageSet) {
        expect(productImage.toLowerCase()).toContain(imageSet);
        expect((cartItem.image_set ?? '').toLowerCase()).toBe(imageSet);
      }
    });

    test('PROD-CART-INT-E02: repeated add operations accumulate quantity and total @integration @cart @regression', async ({
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Open product detail page.
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      // Act: Add the same product multiple times.
      await productPage.addToCart();
      await productPage.addToCart();
      await productPage.addToCart();

      // Assert: Quantity and row total are accumulated correctly.
      await cartPage.goto();
      const quantity = await cartPage.getItemQuantity(secondProduct.id);
      expect(quantity).toBe(3);

      const itemTotal = await cartPage.getItemTotalValue(secondProduct.id);
      const unitPrice = await cartPage.getItemPriceValue(secondProduct.id);
      expect(itemTotal).toBeCloseTo(unitPrice * 3, 2);
    });
  });
});



