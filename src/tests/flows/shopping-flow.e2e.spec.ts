import { test, expect } from '../../../fixtures/test-data';
import { ProductListPage } from '../../../pages/public/product-list.page';
import { ProductDetailPage } from '../../../pages/public/product-detail.page';
import { CartPage } from '../../../pages/shopping/cart.page';

test.describe('@e2e Shopping Flow', () => {
  
  test('complete shopping journey from search to cart', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    const productDetailPage = new ProductDetailPage(page);
    const cartPage = new CartPage(page);

    // 1. Browse catalog
    await productListPage.goto();
    expect(await productListPage.hasResults()).toBe(true);

    // 2. Search for product
    await productListPage.search('robot');
    expect(await productListPage.hasResults()).toBe(true);

    // 3. Click first product
    await productListPage.clickProduct(0);
    await page.waitForLoadState('networkidle');

    // 4. Add to cart
    await productDetailPage.setQuantity(1);
    await productDetailPage.addToCart();

    // 5. Go to cart
    await cartPage.goto();
    expect(await cartPage.getCartItemCount()).toBeGreaterThan(0);
  });

  test('filter by category and add to cart', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    const cartPage = new CartPage(page);

    await productListPage.goto();
    await productListPage.selectCategory('automation');
    
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);

    await productListPage.clickProduct(0);
    await page.waitForLoadState('networkidle');

    const productDetailPage = new ProductDetailPage(page);
    await productDetailPage.setQuantity(2);
    await productDetailPage.addToCart();

    await cartPage.goto();
    expect(await cartPage.getCartItemCount()).toBeGreaterThan(0);
  });
});
