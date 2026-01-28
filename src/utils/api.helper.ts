import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class ApiHelper {
  private api: AxiosInstance;

  constructor(baseURL?: string) {
    const url = baseURL || process.env.BASE_URL || 'https://robot-store-sandbox.onrender.com';
    this.api = axios.create({
      baseURL: url,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async get(endpoint: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.api.get(endpoint, config);
    return response.data;
  }

  async post(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.api.post(endpoint, data, config);
    return response.data;
  }

  async put(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.api.put(endpoint, data, config);
    return response.data;
  }

  async delete(endpoint: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.api.delete(endpoint, config);
    return response.data;
  }

  async patch(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.api.patch(endpoint, data, config);
    return response.data;
  }

  setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    delete this.api.defaults.headers.common['Authorization'];
  }
}
