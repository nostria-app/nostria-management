export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export interface Server {
  id: string;
  name: string;
  type: 'web' | 'database' | 'cache' | 'storage';
  status: 'running' | 'stopped' | 'maintenance' | 'error';
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  lastHealthCheck: string;
}

export interface ServerConfig {
  maxConnections: number;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}