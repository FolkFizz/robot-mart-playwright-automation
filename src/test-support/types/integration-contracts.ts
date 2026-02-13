export type ResetTokenRow = {
  reset_password_token: string | null;
  reset_password_expires: string | null;
};

export type NotificationDto = {
  id: number;
  type: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationsResponse = {
  status: 'success' | 'error';
  notifications: NotificationDto[];
  unreadCount: number;
  message?: string;
};

export type InventoryProductDetailResponse = {
  ok: boolean;
  product: {
    id: number;
    name: string;
    stock: number;
    price: string | number;
  };
};

export type InventoryCartMutationResponse = {
  status?: 'success' | 'error';
  message?: string;
  totalItems?: number;
};

export type InventoryOrderCreateResponse = {
  status?: 'success' | 'error';
  orderId?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

export type InventoryOrderCreateResult = {
  status: number;
  body: InventoryOrderCreateResponse;
};

export type ProductCartProductDetailResponse = {
  ok: boolean;
  product: {
    id: number;
    name: string;
    stock: number;
    image_set?: string;
    price: string | number;
  };
};

export type ProductCartCartMutationResponse = {
  status?: 'success' | 'error';
  message?: string;
  totalItems?: number;
};

export type ProductCartCartStateResponse = {
  ok: boolean;
  cart: Array<{
    id: number;
    name: string;
    price: number | string;
    quantity: number;
    image_set?: string;
  }>;
};
