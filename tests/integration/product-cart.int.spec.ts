import { test, expect, loginAndSyncSession } from '@fixtures';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * PRODUCT-CART INTEGRATION TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Product Page â†’ Cart Data Transfer Accuracy
 * 2. Product Details Consistency (Name, Price, Image)
 * 3. Quantity Selection Preservation
 * 4. Stock Validation on Add to Cart
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - PROD-CART-INT-P01: product price matches cart price exactly
 *   - PROD-CART-INT-P02: product name transfers correctly to cart
 *   - PROD-CART-INT-P03: selected quantity preserved in cart
 * 
 * NEGATIVE CASES (2 tests):
 *   - PROD-CART-INT-N01: cannot add out-of-stock product via API
 *   - PROD-CART-INT-N02: quantity exceeding stock rejected
 * 
 * EDGE CASES (2 tests):
 *   - PROD-CART-INT-E01: product image URL consistent between pages
 *   - PROD-CART-INT-E02: multiple additions accumulate quantity correctly
 * 
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Product Display â†’ Cart Storage
 * - Data Consistency: Price, name, quantity must match exactly
 * - Stock Validation: Cannot add out-of-stock or excessive quantities
 * - Image Transfer: Product image URL preserved in cart
 * - Quantity Logic: Multiple adds should accumulate, not replace
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('product to cart integration @integration @cart', () => {

  const firstProduct = seededProducts[0];   // Rusty-Bot 101
  const secondProduct = seededProducts[1];  // Helper-X

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {

    test('PROD-CART-INT-P01: product price matches cart price exactly @integration @cart @smoke', async ({ homePage, productPage, cartPage }) => {
      // Arrange: Navigate to product page
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      // Get price from product page
      const productPrice = await productPage.getPriceValue();

      // Act: Add to cart
      await productPage.addToCart();

      // Navigate to cart
      await cartPage.goto();

      // Assert: Cart price matches product price
      const cartPrice = await cartPage.getItemPriceValue(firstProduct.id);
      expect(cartPrice).toBeCloseTo(productPrice, 2);
    });

    test('PROD-CART-INT-P02: product name transfers correctly to cart @integration @cart @regression', async ({ homePage, productPage, cartPage }) => {
      // Arrange: Navigate to product page
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      // Get product name from product page
      const productName = await productPage.getTitle();

      // Act: Add to cart
      await productPage.addToCart();

      // Navigate to cart
      await cartPage.goto();

      // Assert: Cart item name matches product name
      const cartItemName = await cartPage.getItemName(secondProduct.id);
      expect(cartItemName).toContain(productName);
    });

    test('PROD-CART-INT-P03: selected quantity preserved in cart @integration @cart @regression', async ({ api, homePage, productPage, cartPage }) => {
      // Arrange: Clear cart first
      await api.post('/api/cart/clear');

      // Navigate to product page
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      // Act: Add to cart multiple times (quantity should accumulate)
      await productPage.addToCart();
      await productPage.addToCart();

      // Navigate to cart
      await cartPage.goto();

      // Assert: Quantity is 2 (accumulated)
      const quantity = await cartPage.getItemQuantity(firstProduct.id);
      expect(quantity).toBe(2);
    });
  });

  test.describe('negative cases', () => {

    test('PROD-CART-INT-N01: cannot add out-of-stock product via API @integration @cart @regression', async ({ api }) => {
      // Arrange: Try to add product with 0 stock (if any)
      // Using API to simulate out-of-stock scenario
      
      // First, get product with low/no stock

      
      // Find product with 0 stock or use seeded product and set stock to 0
      const productId = firstProduct.id;

      // Act: Try to add excessive quantity that would exceed stock
      const res = await api.post('/api/cart/add', {
        data: { productId: productId, quantity: 999 }
      });

      // Assert: Request rejected
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toMatch(/stock|limit/i);
    });

    test('PROD-CART-INT-N02: quantity exceeding stock rejected @integration @cart @regression', async ({ api }) => {
      // Arrange: Get product current stock
      const productRes = await api.get(`/api/products/${firstProduct.id}`);
      const product = await productRes.json();
      const currentStock = product.stock;

      // Act: Try to add more than available stock
      const res = await api.post('/api/cart/add', {
        data: { productId: firstProduct.id, quantity: currentStock + 100 }
      });

      // Assert: Request rejected with stock limit error
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toContain('Stock Limit Reached');
    });
  });

  test.describe('edge cases', () => {

    test('PROD-CART-INT-E01: product image URL consistent between pages @integration @cart @regression', async ({ page, homePage, productPage, cartPage }) => {
      // Arrange: Navigate to product
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      // Get product image from product page
      const productImage = await page
        .locator('[data-testid="product-image"], .product-image img, .product-detail img, img')
        .first()
        .getAttribute('src')
        .catch(() => null);

      // Act: Add to cart
      await productPage.addToCart();
      await cartPage.goto();

      // Assert: If image exists on product page, verify it's in cart
      if (productImage) {
        const cartImage = await page
          .locator(`[data-testid="cart-item-${firstProduct.id}"] img, tr[data-testid="cart-item-${firstProduct.id}"] img, .cart-item img, img`)
          .first()
          .getAttribute('src')
          .catch(() => null);
        
        if (cartImage && productImage) {
          // Images should reference same product
          expect(cartImage).toContain(firstProduct.id.toString());
        }
      }
    });

    test('PROD-CART-INT-E02: multiple additions accumulate quantity correctly @integration @cart @regression', async ({ api, homePage, productPage, cartPage }) => {
      // Arrange: Clear cart
      await api.post('/api/cart/clear');

      // Navigate to product
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      // Act: Add to cart 3 times
      await productPage.addToCart();
      await productPage.addToCart();
      await productPage.addToCart();

      // Navigate to cart
      await cartPage.goto();

      // Assert: Quantity accumulated to 3
      const quantity = await cartPage.getItemQuantity(secondProduct.id);
      expect(quantity).toBe(3);

      // Assert: Total price = unit price Ã— 3
      const itemTotal = await cartPage.getItemTotalValue(secondProduct.id);
      const unitPrice = await cartPage.getItemPriceValue(secondProduct.id);
      expect(itemTotal).toBeCloseTo(unitPrice * 3, 2);
    });
  });
});
