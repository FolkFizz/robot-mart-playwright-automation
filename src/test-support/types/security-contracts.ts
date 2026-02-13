export type HeaderMap = Record<string, string>;

export type AuthorizationOrderCreateResponse = {
  status?: 'success' | 'error';
  orderId?: string;
  message?: string;
};
