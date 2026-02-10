// Core domain model types.

export type IdLike = number | string;

export type UserRole = 'user' | 'admin';

export type Product = {
  id: number;
  name: string;
  price: number;
  description?: string;
  stock: number;
  category?: string;
  image_set?: string;
  battery_health?: number;
  rust_level?: number;
  is_buggy?: boolean;
  serial_number?: string;
  created_at?: string;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  image_set?: string;
  quantity: number;
};

export type CartSummary = {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  grandTotal: number;
  couponCode?: string | null;
};

export type Coupon = {
  id: number;
  code: string;
  discount_percent: number;
  expiry_date?: string;
  is_active?: boolean;
};

export type OrderItem = {
  product_name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  user_id?: number;
  total_price: number;
  coupon_code?: string | null;
  discount_amount?: number;
  created_at?: string;
  items?: OrderItem[];
};

export type UserProfile = {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  address?: string | null;
  phone?: string | null;
};

export type Notification = {
  id: number;
  type: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at?: string;
};

// Standard ok/error API response shape.
export type ApiResponse<T = unknown> = {
  ok: boolean;
  status?: string;
  message?: string;
  data?: T;
  error?: {
    message?: string;
  };
};
