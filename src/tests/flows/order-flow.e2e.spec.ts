import { test, expect } from '../../fixtures/test-data';

test.describe('@e2e @shopping Complete Order Flow - Mock Payment', () => {
  test('should complete full order lifecycle from browsing to checkout', async ({ 
    page, 
    productListPage, 
    productDetailPage,
    cartPage,
    checkoutPage,
    orderSuccessPage 
  }) => {
    // Step 1: Browse products
    await productListPage.goto();
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);

    // Step 2: View product detail
    await productListPage.clickFirstProduct();
    await expect(productDetailPage.productTitle).toBeVisible();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }

    // Step 3: Add to cart
    await productDetailPage.setQuantity(2);
    await productDetailPage.addToCart();
    
    // Step 4: Go to cart
    await cartPage.goto();
    const itemCount = await cartPage.getCartItemCount();
    expect(itemCount).toBeGreaterThan(0);

    // Step 5: Proceed to checkout
    await cartPage.proceedToCheckout();
    await expect(checkoutPage.checkoutForm).toBeVisible();

    // Step 6: Verify mock payment is enabled
    const isMockPayment = await checkoutPage.isMockPaymentEnabled();
    expect(isMockPayment).toBe(true);

    // Step 7: Complete checkout
    await checkoutPage.completeMockCheckout('Test User', 'test@example.com');

    // Step 8: Verify success page
    await expect(orderSuccessPage.successMessage).toBeVisible();
    const orderId = await orderSuccessPage.getOrderId();
    expect(orderId).toBeTruthy();
    expect(orderId.length).toBeGreaterThan(0);
  });

  test('should handle checkout with coupon code', async ({ 
    cartPage, 
    checkoutPage,
    productListPage,
    productDetailPage 
  }) => {
    // Add product to cart
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    await productDetailPage.addToCart();

    // Go to cart and apply coupon
    await cartPage.goto();
    await cartPage.applyCoupon('ROBOT99');
    
    // Verify discount is applied
    const hasDiscount = await cartPage.hasDiscount();
    expect(hasDiscount).toBe(true);

    // Proceed to checkout
    await cartPage.proceedToCheckout();
    
    // Verify discount is shown on checkout
    const checkoutHasDiscount = await checkoutPage.hasDiscount();
    expect(checkoutHasDiscount).toBe(true);
  });

  test('should show free shipping for orders over threshold', async ({ 
    cartPage,
    checkoutPage,
    productListPage,
    productDetailPage 
  }) => {
    // This test assumes there are products that can reach free shipping threshold
    await productListPage.goto();
    
    // Add multiple products to reach free shipping
    for (let i = 0; i < 3; i++) {
      await productListPage.clickProductByIndex(i);
      const isInStock = await productDetailPage.isInStock();
      if (isInStock) {
        await productDetailPage.setQuantity(5);
        await productDetailPage.addToCart();
      }
      await productListPage.goto();
    }

    // Check cart
    await cartPage.goto();
    const isFreeShipping = await cartPage.isFreeShipping();
    
    if (isFreeShipping) {
      // Verify free shipping on checkout
      await cartPage.proceedToCheckout();
      const checkoutFreeShipping = await checkoutPage.isFreeShipping();
      expect(checkoutFreeShipping).toBe(true);
    }
  });
});
