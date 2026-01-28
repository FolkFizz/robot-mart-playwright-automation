import { test, expect } from '../../../fixtures/test-data';

test.describe('Shopping - Checkout Page', () => {
  test.beforeEach(async ({ productListPage, productDetailPage, cartPage }) => {
    // Setup: Add a product to cart before each test
    await productListPage.goto();
    await productListPage.clickFirstProduct();
    
    const isInStock = await productDetailPage.isInStock();
    if (!isInStock) {
      test.skip('Product is out of stock');
    }
    
    await productDetailPage.addToCart();
    await cartPage.goto();
    await cartPage.proceedToCheckout();
  });

  test('should display order summary correctly', async ({ checkoutPage }) => {
    await expect(checkoutPage.orderSummary).toBeVisible();
    await expect(checkoutPage.checkoutTotal).toBeVisible();
    
    const total = await checkoutPage.getTotalAmount();
    expect(total).toMatch(/\$\d+\.\d{2}/);
  });

  test('should show mock payment option when enabled', async ({ checkoutPage }) => {
    const isMockPayment = await checkoutPage.isMockPaymentEnabled();
    
    // Mock payment should be enabled in test environment
    expect(isMockPayment).toBe(true);
    await expect(checkoutPage.mockPaymentNote).toBeVisible();
  });

  test('should validate customer information fields', async ({ checkoutPage }) => {
    // Try to submit without filling fields
    await checkoutPage.submitOrder();
    
    // HTML5 validation should prevent submission
    // Form should still be visible
    await expect(checkoutPage.checkoutForm).toBeVisible();
  });

  test('should complete checkout with valid information', async ({ checkoutPage, orderSuccessPage }) => {
    await checkoutPage.fillCustomerInfo('John Doe', 'john@example.com');
    await checkoutPage.submitOrder();
    
    // Should redirect to success page
    await expect(orderSuccessPage.successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should preserve discount on checkout page', async ({ 
    productListPage,
    productDetailPage,
    cartPage, 
    checkoutPage 
  }) => {
    // Go back and apply coupon
    await cartPage.goto();
    await cartPage.applyCoupon('WELCOME10');
    
    const hasDiscount = await cartPage.hasDiscount();
    if (!hasDiscount) {
      test.skip('Coupon code not valid or already used');
    }
    
    await cartPage.proceedToCheckout();
    
    // Verify discount is shown on checkout
    const checkoutHasDiscount = await checkoutPage.hasDiscount();
    expect(checkoutHasDiscount).toBe(true);
  });

  test('should show correct shipping cost', async ({ checkoutPage }) => {
    const isFreeShipping = await checkoutPage.isFreeShipping();
    const shippingText = await checkoutPage.shipping.textContent();
    
    if (isFreeShipping) {
      expect(shippingText).toContain('FREE');
    } else {
      expect(shippingText).toMatch(/\$\d+\.\d{2}/);
    }
  });
});
