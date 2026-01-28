export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  role?: 'user' | 'admin';
  createdAt?: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image_set?: string;
  description?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  userId: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Date;
  items: OrderItem[];
}

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  expiresAt?: Date;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}
