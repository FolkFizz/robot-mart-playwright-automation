export class StripeHelper {
  /**
   * Stripe Test Card Numbers
   * https://stripe.com/docs/testing#cards
   */
  static readonly TEST_CARDS = {
    // Success cards
    VISA_SUCCESS: '4242424242424242',
    VISA_3D_SECURE: '4000002500003155',
    MASTERCARD_SUCCESS: '5555555555554444',
    AMEX_SUCCESS: '378282246310005',
    
    // Decline cards
    CARD_DECLINED: '4000000000000002',
    INSUFFICIENT_FUNDS: '4000000000009995',
    LOST_CARD: '4000000000009987',
    STOLEN_CARD: '4000000000009979',
    
    // Error cards
    EXPIRED_CARD: '4000000000000069',
    INCORRECT_CVC: '4000000000000127',
    PROCESSING_ERROR: '4000000000000119',
  };

  /**
   * Fill Stripe card element (for iframe-based Stripe elements)
   * Note: Playwright cannot directly interact with Stripe's iframe
   * Use Stripe test mode or mock payment for testing
   */
  static async fillStripeCard(
    page: any,
    cardNumber: string,
    expiry: string = '12/34',
    cvc: string = '123',
    postalCode: string = '12345'
  ) {
    // Stripe Elements are in an iframe, which Playwright cannot access directly
    // For E2E testing, use mock payment mode or Stripe test mode
    // This is a placeholder for documentation
    throw new Error(
      'Stripe Elements use iframes that Playwright cannot access. ' +
      'Use mock payment mode for testing or configure Stripe test mode.'
    );
  }

  /**
   * Get test card for specific scenario
   */
  static getTestCard(scenario: 'success' | 'decline' | 'error' = 'success'): string {
    switch (scenario) {
      case 'success':
        return this.TEST_CARDS.VISA_SUCCESS;
      case 'decline':
        return this.TEST_CARDS.CARD_DECLINED;
      case 'error':
        return this.TEST_CARDS.PROCESSING_ERROR;
      default:
        return this.TEST_CARDS.VISA_SUCCESS;
    }
  }

  /**
   * Validate card number using Luhn algorithm
   */
  static isValidCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Format card number with spaces
   */
  static formatCardNumber(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.match(/.{1,4}/g)?.join(' ') || digits;
  }

  /**
   * Get card brand from number
   */
  static getCardBrand(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(digits)) return 'Visa';
    if (/^5[1-5]/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^6(?:011|5)/.test(digits)) return 'Discover';
    
    return 'Unknown';
  }
}
