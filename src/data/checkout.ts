import { users } from './users';

const checkoutEmail = process.env.TEST_CHECKOUT_EMAIL?.trim() || users.user.email;

export const customer = {
  name: 'Test User',
  email: checkoutEmail
} as const;

export const validCard = {
  number: '4242 4242 4242 4242',
  exp: '12/34',
  cvc: '123',
  postal: '10001'
} as const;

export const declinedCard = {
  number: '4000 0000 0000 0002',
  exp: '12/34',
  cvc: '123',
  postal: '10001'
} as const;

export const paymentInputs = {
  empty: '',
  invalidEmail: 'invalid-email'
} as const;

export const paymentMessages = {
  declinedPattern: /declined/i
} as const;

export const coupons = {
  robot99: { code: 'ROBOT99', discountPercent: 20 },
  welcome10: { code: 'WELCOME10', discountPercent: 10 },
  expired50: { code: 'EXPIRED50', discountPercent: 50 }
} as const;
