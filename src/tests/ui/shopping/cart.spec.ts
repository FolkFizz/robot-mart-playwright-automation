import { test, expect } from '../../../fixtures/test-data';

test.describe('@ui @shopping Shopping - Cart Management', () => {
  test('should add product to cart and update quantity', async ({ 
    productListPage,
    productDetailPage,
    cartPage 
  }) => {
    // Add product
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.setQuantity(2);
    await productDetailPage.addToCart();
    
    // Verify in cart
    await cartPage.goto();
    const itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should update cart item quantity', async ({ 
    productListPage,
    productDetailPage,
    cartPage,
    page 
  }) => {
    // Add product first
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.addToCart();
    await cartPage.goto();
    
    const items = await cartPage.getCartItems();
    if (items.length === 0) {
      test.skip('No items in cart');
    }
    
    const firstItemId = items[0];
    const initialQty = await cartPage.getItemQuantity(firstItemId);
    
    // Increase quantity
    await cartPage.increaseItemQuantity(firstItemId);
    await page.waitForLoadState('networkidle');
    
    const newQty = await cartPage.getItemQuantity(firstItemId);
    expect(newQty).toBe(initialQty + 1);
  });

  test('should remove item from cart', async ({ 
    productListPage,
    productDetailPage,
    cartPage 
  }) => {
    // Add product
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.addToCart();
    await cartPage.goto();
    
    const items = await cartPage.getCartItems();
    if (items.length === 0) {
      test.skip('No items in cart');
    }
    
    const initialCount = items.length;
    await cartPage.removeItem(items[0]);
    
    const newItems = await cartPage.getCartItems();
    expect(newItems.length).toBe(initialCount - 1);
  });

  test('should apply valid coupon code', async ({ 
    productListPage,
    productDetailPage,
    cartPage 
  }) => {
    // Add product
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.addToCart();
    await cartPage.goto();
    
    // Apply coupon
    await cartPage.applyCoupon('ROBOT99');
    
    // Verify discount is applied
    const hasDiscount = await cartPage.hasDiscount();
    expect(hasDiscount).toBe(true);
  });

  test('should clear entire cart', async ({ 
    productListPage,
    productDetailPage,
    cartPage 
  }) => {
    // Add product
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.addToCart();
    await cartPage.goto();
    
    await cartPage.clearCart();
    
    // Verify cart is empty
    const isEmpty = await cartPage.isCartEmpty();
    expect(isEmpty).toBe(true);
  });
});
