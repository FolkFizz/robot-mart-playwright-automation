import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class CartPage extends BasePage {
  // Selectors from cart.ejs
  readonly cartItems: Locator;
  readonly subtotalAmount: Locator;
  readonly shippingAmount: Locator;
  readonly discountAmount: Locator;
  readonly grandTotalAmount: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly removeCouponButton: Locator;
  readonly checkoutButton: Locator;
  readonly clearCartButton: Locator;
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('[data-testid^="cart-item-"]');
    this.subtotalAmount = page.getByTestId('cart-subtotal');
    this.shippingAmount = page.getByTestId('cart-shipping');
    this.discountAmount = page.getByTestId('cart-discount');
    this.grandTotalAmount = page.getByTestId('cart-grand-total');
    this.couponInput = page.getByTestId('cart-coupon-input');
    this.applyCouponButton = page.getByTestId('cart-apply-coupon');
    this.removeCouponButton = page.getByTestId('cart-remove-coupon');
    this.checkoutButton = page.getByTestId('cart-checkout');
    this.clearCartButton = page.getByTestId('cart-clear');
    this.emptyCartMessage = page.locator('.empty-cart');
  }

  async goto() {
    await this.page.goto('/cart');
  }

  async getCartItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  async increaseQuantity(productId: string) {
    await this.page.getByTestId(`cart-qty-increase-${productId}`).click();
  }

  async decreaseQuantity(productId: string) {
    await this.page.getByTestId(`cart-qty-decrease-${productId}`).click();
  }

  async removeItem(productId: string) {
    await this.page.getByTestId(`cart-remove-${productId}`).click();
  }

  async applyCoupon(code: string) {
    await this.couponInput.fill(code);
    await this.applyCouponButton.click();
  }

  async removeCoupon() {
    await this.removeCouponButton.click();
  }

  async clearCart() {
    await this.clearCartButton.click();
  }

  async proceedToCheckout() {
    await this.checkoutButton.click();
  }

  async getGrandTotal(): Promise<string> {
    return await this.grandTotalAmount.textContent() || '';
  }

  async isCartEmpty(): Promise<boolean> {
    return await this.emptyCartMessage.isVisible();
  }

  async getItemQuantity(productId: string): Promise<string> {
    const qtyLocator = this.page.getByTestId(`cart-qty-value-${productId}`);
    return await qtyLocator.textContent() || '';
  }
}
