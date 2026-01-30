import { test, expect } from '../../../fixtures/test-data';
import { CatalogPage } from '../../../pages/shop/catalog.page';
import { ProductDetailPage } from '../../../pages/shop/product-detail.page';
import { CartPage } from '../../../pages/shop/cart.page';

test.describe('@e2e Shopping Flow', () => {
  
  test('complete shopping journey from search to cart', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const productDetailPage = new ProductDetailPage(page);
    const cartPage = new CartPage(page);

    // 1. Browse catalog
    await catalogPage.goto();
    expect(await catalogPage.hasResults()).toBe(true);

    // 2. Search for product
    await catalogPage.search('robot');
    expect(await catalogPage.hasResults()).toBe(true);

    // 3. Click first product
    await catalogPage.clickProduct(0);
    await page.waitForLoadState('networkidle');

    // 4. Add to cart
    const productName = await productDetailPage.getProductName();
    await productDetailPage.addToCart(1);

    // 5. Go to cart
    await cartPage.goto();
    expect(await cartPage.getCartItemCount()).toBeGreaterThan(0);
  });

  test('filter by category and add to cart', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    const cartPage = new CartPage(page);

    await catalogPage.goto();
    await catalogPage.selectCategory('automation');
    
    const productCount = await catalogPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);

    await catalogPage.clickProduct(0);
    await page.waitForLoadState('networkidle');

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.addToCart(2);

    await cartPage.goto();
    expect(await cartPage.getCartItemCount()).toBeGreaterThan(0);
  });
});
