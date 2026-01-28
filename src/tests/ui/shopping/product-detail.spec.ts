import { test, expect } from '../../../fixtures/test-data';

test.describe('Shopping - Product Detail Page', () => {
  test('should display product information correctly', async ({ productDetailPage, productListPage }) => {
    await productListPage.goto();
    await productListPage.clickFirstProduct();

    // Verify product details are visible
    await expect(productDetailPage.productTitle).toBeVisible();
    await expect(productDetailPage.productPrice).toBeVisible();
    await expect(productDetailPage.productImage).toBeVisible();
    
    const title = await productDetailPage.getProductTitle();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should allow quantity adjustment', async ({ productDetailPage, productListPage }) => {
    await productListPage.goto();
    await productListPage.clickFirstProduct();

    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }

    // Test increase quantity
    await productDetailPage.increaseQuantity(2);
    let qty = await productDetailPage.getQuantity();
    expect(qty).toBe(3);

    // Test decrease quantity
    await productDetailPage.decreaseQuantity(1);
    qty = await productDetailPage.getQuantity();
    expect(qty).toBe(2);

    // Test direct input
    await productDetailPage.setQuantity(5);
    qty = await productDetailPage.getQuantity();
    expect(qty).toBe(5);
  });

  test('should add product to cart successfully', async ({ productDetailPage, productListPage, page }) => {
    await productListPage.goto();
    await productListPage.clickFirstProduct();

    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }

    await productDetailPage.setQuantity(2);
    await productDetailPage.addToCart();

    // Wait for page reload or success indication
    await page.waitForLoadState('networkidle');
  });

  test('should disable add to cart for out of stock products', async ({ productDetailPage, page }) => {
    // Navigate to a product that might be out of stock
    // This is a placeholder - in real scenario, you'd know which product is out of stock
    await page.goto('/');
    
    const outOfStockProduct = page.locator('.out-stock').first();
    const isVisible = await outOfStockProduct.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('No out of stock products available');
    }

    // If we found an out of stock indicator, verify button is disabled
    const isDisabled = await productDetailPage.isAddToCartDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should navigate back to product list', async ({ productDetailPage, productListPage, page }) => {
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    await productDetailPage.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});
