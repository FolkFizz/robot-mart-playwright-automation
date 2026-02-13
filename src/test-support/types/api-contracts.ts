export type AdminNotificationsResponse = {
  status: 'success' | 'error';
  notifications: Array<Record<string, unknown>>;
};

export type ProductsResponse = {
  ok: boolean;
  products: Array<{
    id: number;
    name: string;
    stock: number;
  }>;
};

export type ResetStockErrorResponse = {
  ok: boolean;
  status: 'forbidden' | 'error';
  message: string;
};
