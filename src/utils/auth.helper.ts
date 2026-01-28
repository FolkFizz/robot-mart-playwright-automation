import axios, { AxiosInstance } from 'axios';

export class AuthHelper {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.BASE_URL || 'https://robot-store-sandbox.onrender.com';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async login(username: string, password: string): Promise<any> {
    const response = await this.api.post('/login', { username, password });
    return response.data;
  }

  async register(username: string, email: string, password: string): Promise<any> {
    const response = await this.api.post('/register', { username, email, password, confirmPassword: password });
    return response.data;
  }

  async logout(): Promise<any> {
    const response = await this.api.get('/logout');
    return response.data;
  }

  async forgotPassword(email: string): Promise<any> {
    const response = await this.api.post('/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    const response = await this.api.post('/reset-password', { token, password: newPassword });
    return response.data;
  }
}
