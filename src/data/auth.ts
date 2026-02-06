export const authInputs = {
  wrongPassword: 'wrong_password',
  wrongUsername: 'wrong_username',
  duplicateEmail: 'user@robotstore.com',
  duplicatePassword: 'user123',
  loginLinkText: 'Log in'
} as const;

export const authErrors = {
  invalidCredentials: 'Invalid username or password',
  passwordMismatch: 'Passwords do not match',
  duplicateUser: 'Username or Email already exists'
} as const;

export const inboxSubjects = {
  resetPassword: 'Reset Your Password',
  orderConfirmation: 'Order Confirmation',
  welcome: 'Welcome to Robot Store'
} as const;
