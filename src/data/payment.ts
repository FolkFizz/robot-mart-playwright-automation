export const customer = {
  name: 'Test User',
  email: 'test.user@robotstore.com'
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
