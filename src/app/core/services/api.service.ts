import { Injectable, inject } from '@angular/core';
import { ApiResponse, Customer, Server, ServerConfig } from '../../shared/models/api.models';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8080/api'; // nostria-service API endpoint

  private async makeRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const requestOptions: RequestInit = {
      method,
      headers: { ...defaultHeaders, ...headers },
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data,
        success: true
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        data: null as T,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Customer endpoints
  async getCustomers(): Promise<ApiResponse<Customer[]>> {
    return this.makeRequest<Customer[]>('/customers');
  }

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    return this.makeRequest<Customer>(`/customers/${id}`);
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.makeRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: customer
    });
  }

  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/customers/${id}`, {
      method: 'DELETE'
    });
  }

  // Server endpoints
  async getServers(): Promise<ApiResponse<Server[]>> {
    return this.makeRequest<Server[]>('/servers');
  }

  async getServer(id: string): Promise<ApiResponse<Server>> {
    return this.makeRequest<Server>(`/servers/${id}`);
  }

  async updateServerConfig(id: string, config: ServerConfig): Promise<ApiResponse<ServerConfig>> {
    return this.makeRequest<ServerConfig>(`/servers/${id}/config`, {
      method: 'PUT',
      body: config
    });
  }

  async restartServer(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/servers/${id}/restart`, {
      method: 'POST'
    });
  }

  async stopServer(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/servers/${id}/stop`, {
      method: 'POST'
    });
  }

  async startServer(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/servers/${id}/start`, {
      method: 'POST'
    });
  }
}