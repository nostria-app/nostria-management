import { Injectable, inject } from '@angular/core';
import { 
  ApiResponse, Customer, Server, ServerConfig,
  // Nostria API Types
  Account, AddAccountRequest, UpdateAccountRequest, TierDetails,
  BackupJobResponse, CreateBackupJobRequest, VapidKey,
  NotificationRequest, NotificationResult, NotificationStatus,
  CreatePaymentRequest, Payment, UserSettingsUpdate, UserSettingsResponse,
  UsersByReleaseChannel, ServiceStatus, HealthStatus, PushSubscription,
  NotificationData, DevicesResponse, UserSettingsRequest, UserSettings,
  AdminSetUserSettingsRequest, ReleaseChannelUpdateRequest, ReleaseChannel
} from '../../shared/models/api.models';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api'; // Nostria API endpoint

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

  // Legacy Customer endpoints (keeping for backward compatibility)
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

  // Legacy Server endpoints (keeping for backward compatibility)
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

  // Nostria Account Management API
  async getTiers(): Promise<ApiResponse<Record<string, TierDetails>>> {
    return this.makeRequest<Record<string, TierDetails>>('/account/tiers');
  }

  async createAccount(request: AddAccountRequest): Promise<ApiResponse<Account>> {
    return this.makeRequest<Account>('/account', {
      method: 'POST',
      body: request
    });
  }

  async getAccount(authToken: string): Promise<ApiResponse<Account>> {
    return this.makeRequest<Account>('/account', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  }

  async updateAccount(authToken: string, request: UpdateAccountRequest): Promise<ApiResponse<Account>> {
    return this.makeRequest<Account>('/account', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: request
    });
  }

  async checkUsername(username: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/account/check/${username}`);
  }

  async getPublicAccount(pubkeyOrUsername: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/account/${pubkeyOrUsername}`);
  }

  // Backup Management API
  async createBackupJob(authToken: string, request: CreateBackupJobRequest): Promise<ApiResponse<BackupJobResponse>> {
    return this.makeRequest<BackupJobResponse>('/backup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: request
    });
  }

  async getBackupJobs(authToken: string, limit?: number): Promise<ApiResponse<{ jobs: BackupJobResponse[], total: number }>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.makeRequest<{ jobs: BackupJobResponse[], total: number }>(`/backup${query}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  }

  async getBackupJob(authToken: string, jobId: string): Promise<ApiResponse<BackupJobResponse>> {
    return this.makeRequest<BackupJobResponse>(`/backup/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  }

  // Keys Management API
  async getVapidKey(): Promise<ApiResponse<VapidKey>> {
    return this.makeRequest<VapidKey>('/key');
  }

  // Notifications API
  async sendNotification(apiKey: string, request: NotificationRequest): Promise<ApiResponse<NotificationResult>> {
    return this.makeRequest<NotificationResult>('/notification/send', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey
      },
      body: request
    });
  }

  async getNotificationStatus(apiKey: string, pubkey: string): Promise<ApiResponse<NotificationStatus>> {
    return this.makeRequest<NotificationStatus>(`/notification/status/${pubkey}`, {
      headers: {
        'X-API-Key': apiKey
      }
    });
  }

  // Payment Management API
  async createPayment(request: CreatePaymentRequest): Promise<ApiResponse<Payment>> {
    return this.makeRequest<Payment>('/payment', {
      method: 'POST',
      body: request
    });
  }

  async getPayment(pubkey: string, paymentId: string): Promise<ApiResponse<Payment>> {
    return this.makeRequest<Payment>(`/payment/${pubkey}/${paymentId}`);
  }

  // Settings Management API
  async createOrUpdateUserSettings(authToken: string, pubkey: string, settings: UserSettingsUpdate): Promise<ApiResponse<UserSettingsResponse>> {
    return this.makeRequest<UserSettingsResponse>(`/settings/${pubkey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: settings
    });
  }

  // Simplified method for component use (uses mock auth for demo)
  async getUserSettings(pubkey: string): Promise<ApiResponse<UserSettings>> {
    return this.makeRequest<UserSettings>(`/settings/${pubkey}`, {
      headers: {
        'Authorization': `Bearer mock-token`
      }
    });
  }

  // Simplified method for component use (uses mock auth for demo)
  async updateUserSettings(request: UserSettingsRequest): Promise<ApiResponse<UserSettings>> {
    return this.makeRequest<UserSettings>(`/settings/${request.pubkey}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer mock-token`
      },
      body: request
    });
  }

  async deleteUserSettings(authToken: string, pubkey: string): Promise<ApiResponse<{ success: boolean, message: string }>> {
    return this.makeRequest<{ success: boolean, message: string }>(`/settings/${pubkey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  }

  async getUsersByReleaseChannel(channel: 'stable' | 'beta' | 'alpha'): Promise<ApiResponse<UsersByReleaseChannel>> {
    return this.makeRequest<UsersByReleaseChannel>(`/settings/admin/release-channel/${channel}`);
  }

  // Extended Settings API
  async adminSetUserSettings(request: AdminSetUserSettingsRequest): Promise<ApiResponse<{ success: boolean, message: string }>> {
    return this.makeRequest<{ success: boolean, message: string }>('/settings/admin/set-user-settings', {
      method: 'POST',
      body: request
    });
  }

  async getReleaseChannels(): Promise<ApiResponse<ReleaseChannel[]>> {
    return this.makeRequest<ReleaseChannel[]>('/settings/release-channels');
  }

  async updateReleaseChannel(request: ReleaseChannelUpdateRequest): Promise<ApiResponse<{ success: boolean, message: string }>> {
    return this.makeRequest<{ success: boolean, message: string }>('/settings/release-channel', {
      method: 'POST',
      body: request
    });
  }

  // Status & Health API
  async getServiceStatus(): Promise<ApiResponse<ServiceStatus>> {
    return this.makeRequest<ServiceStatus>('/status');
  }

  async getHealthStatus(): Promise<ApiResponse<HealthStatus>> {
    return this.makeRequest<HealthStatus>('/status/health');
  }

  // Subscriptions API
  async sendTestNotification(authToken: string, pubkey: string, notification: NotificationData): Promise<ApiResponse<{ message: string, success: boolean }>> {
    return this.makeRequest<{ message: string, success: boolean }>(`/subscription/send/${pubkey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: notification
    });
  }

  async registerWebPushSubscription(authToken: string, pubkey: string, subscription: PushSubscription): Promise<ApiResponse<{ success: boolean, message: string }>> {
    return this.makeRequest<{ success: boolean, message: string }>(`/subscription/webpush/${pubkey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: subscription
    });
  }
}