import type { APIRequestContext } from '@playwright/test';
import { test, expect, loginAndSyncSession, seedCart, resetAndSeed } from '@fixtures';
import { disableChaos, loginAsUser } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * PRODUCT-CART INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Product page to cart data transfer (price, name, quantity)
 * 2. Stock validation on cart add API
 * 3. Visual consistency for product image between pages
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - PROD-CART-INT-P01: product price matches cart unit price
 *   - PROD-CART-INT-P02: product name transfers correctly to cart row
 *   - PROD-CART-INT-P03: selected quantity is preserved when added to cart
 *
 * NEGATIVE CASES (2 tests):
 *   - PROD-CART-INT-N01: out-of-stock product cannot be added via API
 *   - PROD-CART-INT-N02: quantity above current stock is rejected
 *
 * EDGE CASES (2 tests):
 *   - PROD-CART-INT-E01: product image mapping remains consistent in cart
 *   - PROD-CART-INT-E02: repeated add operations accumulate quantity and total
 *
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Product detail UI <-> Cart storage/API
 * - Data Consistency: Name, unit price, and quantity must remain consistent
 * - Stock Rule: Add-to-cart is rejected when stock is insufficient
 * - Quantity Rule: Multiple add actions accumulate, not replace
 * - Image Rule: Cart image should represent the same product image set
 *
 * =============================================================================
 */

type ProductDetailResponse = {
  ok: boolean;
  product: {
    id: number;
    name: string;
    stock: number;
    image_set?: string;
    price: string | number;
  };
};

type CartMutationResponse = {
  status?: 'success' | 'error';
  message?: string;
  totalItems?: number;
};

type CartStateResponse = {
  ok: boolean;
  cart: Array<{
    id: number;
    name: string;
    price: number | string;
    quantity: number;
    image_set?: string;
  }>;
};

const FIXED_STOCK = 20;
const firstProduct = seededProducts[0];
const secondProduct = seededProducts[1];

const getProductDetail = async (api: APIRequestContext, productId: number) => {
  const res = await api.get(routes.api.productDetail(productId), {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as ProductDetailResponse;
  expect(body.ok).toBe(true);
  expect(body.product.id).toBe(productId);
  return body.product;
};

const getProductStock = async (api: APIRequestContext, productId: number): Promise<number> => {
  const product = await getProductDetail(api, productId);
  expect(typeof product.stock).toBe('number');
  return product.stock;
};

const addToCartRaw = async (api: APIRequestContext, productId: number, quantity: number) => {
  const res = await api.post(routes.api.cartAdd, {
    data: { productId, quantity },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as CartMutationResponse;
  return { status: res.status(), body };
};

const getCartItem = async (api: APIRequestContext, productId: number) => {
  const res = await api.get(routes.api.cart, {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as CartStateResponse;
  expect(body.ok).toBe(true);
  return body.cart.find((item) => item.id === productId);
};

test.describe('product to cart integration @integration @cart', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await resetAndSeed(FIXED_STOCK);
    await loginAndSyncSession(api, page);
    await seedCart(api, []);
  });

  test.describe('positive cases', () => {
    test('PROD-CART-INT-P01: product price matches cart unit price @integration @cart @smoke', async ({ homePage, productPage, cartPage }) => {
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      const productPrice = await productPage.getPriceValue();
      await productPage.addToCart();

      await cartPage.goto();
      const cartPrice = await cartPage.getItemPriceValue(firstProduct.id);
      expect(cartPrice).toBeCloseTo(productPrice, 2);
    });

    test('PROD-CART-INT-P02: product name transfers correctly to cart row @integration @cart @regression', async ({ homePage, productPage, cartPage }) => {
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      const productName = await productPage.getTitle();
      await productPage.addToCart();

      await cartPage.goto();
      const cartItemName = await cartPage.getItemName(secondProduct.id);
      expect(cartItemName).toContain(productName);
    });

    test('PROD-CART-INT-P03: selected quantity is preserved when added to cart @integration @cart @regression', async ({ homePage, productPage, cartPage }) => {
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      await productPage.setQuantity(2);
      await productPage.addToCart();

      await cartPage.goto();
      const quantity = await cartPage.getItemQuantity(firstProduct.id);
      expect(quantity).toBe(2);
    });
  });

  test.describe('negative cases', () => {
    test('PROD-CART-INT-N01: out-of-stock product cannot be added via API @integration @cart @regression', async ({ api }) => {
      await resetAndSeed(0);
      await loginAsUser(api);
      await seedCart(api, []);

      const add = await addToCartRaw(api, firstProduct.id, 1);
      expect(add.status).toBe(400);
      expect(add.body.status).toBe('error');
      expect((add.body.message ?? '').toLowerCase()).toContain('stock');
    });

    test('PROD-CART-INT-N02: quantity above current stock is rejected @integration @cart @regression', async ({ api }) => {
      const currentStock = await getProductStock(api, firstProduct.id);
      expect(currentStock).toBeGreaterThan(0);

      const add = await addToCartRaw(api, firstProduct.id, currentStock + 1);
      expect(add.status).toBe(400);
      expect(add.body.status).toBe('error');
      expect((add.body.message ?? '').toLowerCase()).toContain('stock');
    });
  });

  test.describe('edge cases', () => {
    test('PROD-CART-INT-E01: product image mapping remains consistent in cart @integration @cart @regression', async ({ api, page, homePage, productPage }) => {
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);

      const productImage = await page
        .locator('[data-testid="product-image"], .product-image img, .product-detail img')
        .first()
        .getAttribute('src');

      const product = await getProductDetail(api, firstProduct.id);
      const imageSet = (product.image_set ?? '').toLowerCase();

      await productPage.addToCart();
      const cartItem = await getCartItem(api, firstProduct.id);

      expect(productImage).toBeTruthy();
      expect(cartItem).toBeTruthy();

      if (productImage && cartItem && imageSet) {
        expect(productImage.toLowerCase()).toContain(imageSet);
        expect((cartItem.image_set ?? '').toLowerCase()).toBe(imageSet);
      }
    });

    test('PROD-CART-INT-E02: repeated add operations accumulate quantity and total @integration @cart @regression', async ({ homePage, productPage, cartPage }) => {
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);

      await productPage.addToCart();
      await productPage.addToCart();
      await productPage.addToCart();

      await cartPage.goto();

      const quantity = await cartPage.getItemQuantity(secondProduct.id);
      expect(quantity).toBe(3);

      const itemTotal = await cartPage.getItemTotalValue(secondProduct.id);
      const unitPrice = await cartPage.getItemPriceValue(secondProduct.id);
      expect(itemTotal).toBeCloseTo(unitPrice * 3, 2);
    });
  });
});
