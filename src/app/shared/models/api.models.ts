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

// Nostria API Types

// Account Management
export interface PublicAccount {
  pubkey: string;
  signupDate: number;
  tier: string;
  isActive: boolean;
  username?: string;
}

export interface Account {
  pubkey: string;
  username?: string;
  signupDate: number;
  lastLoginDate?: number;
  expires?: number;
  tier: Tier;
  entitlements: Entitlements;
}

export interface AddAccountRequest {
  pubkey: string;
  username?: string;
  paymentId?: string;
}

export interface UpdateAccountRequest {
  username?: string;
}

export type Feature = 'BASIC_WEB_PUSH' | 'COMMUNITY_SUPPORT' | 'USERNAME' | 
  'ADVANCED_FILTERING' | 'PRIORITY_SUPPORT' | 'CUSTOM_TEMPLATES' | 
  'API_ACCESS' | 'WEBHOOK' | 'ANALYTICS';

export interface FeatureWithLabel {
  key: Feature;
  label: string;
}

export interface Price {
  priceCents: number;
  currency: string;
}

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Pricing {
  monthly?: Price;
  quarterly?: Price;
  yearly?: Price;
}

export interface Entitlements {
  notificationsPerDay: number;
  features: FeatureWithLabel[];
}

export type Tier = 'free' | 'premium' | 'premium_plus';

export interface TierDetails {
  tier: Tier;
  name: string;
  pricing: Pricing;
  entitlements: Entitlements;
}

// Backup Management
export type BackupType = 'full' | 'incremental' | 'selective';

export type BackupJobStatus = 'pending' | 'scheduled' | 'in_progress' | 
  'completed' | 'failed' | 'expired';

export interface CreateBackupJobRequest {
  backupType: BackupType;
  scheduledAt?: number;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

export interface BackupJobResponse {
  id: string;
  status: BackupJobStatus;
  backupType: BackupType;
  requestedAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
  resultUrl?: string;
  expires?: number;
  metadata?: any;
}

// Keys & VAPID
export interface VapidKey {
  key: string;
}

// Notifications
export interface NotificationRequest {
  pubkeys?: string[];
  template?: string;
  args?: { [key: string]: any };
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
}

export interface NotificationResult {
  success: Array<{
    pubkey: string;
    successCount: number;
    failCount: number;
  }>;
  failed: Array<{
    pubkey: string;
    reason: string;
    deviceCount: number;
  }>;
  filtered: Array<{
    pubkey: string;
    reason: string;
  }>;
  limited: Array<{
    pubkey: string;
    reason: string;
  }>;
  summary: {
    totalTargeted: number;
    successful: number;
    failed: number;
    filtered: number;
    limited: number;
  };
}

export interface NotificationStatus {
  pubkey: string;
  hasSubscription: boolean;
  deviceCount: number;
  isPremium: boolean;
  settings: {
    enabled: boolean;
  };
  notifications: {
    count24h: number;
    dailyLimit: number;
    remaining: number;
  };
}

// Payment Management
export interface CreatePaymentRequest {
  tierName: Tier;
  billingCycle: BillingCycle;
  pubkey: string;
}

export interface Payment {
  id: string;
  lnInvoice: string;
  status: 'pending' | 'expired' | 'paid';
  expires: number;
}

// Settings Management
export interface UserSettingsRequest {
  pubkey: string;
  tier?: Tier;
  displayName?: string;
  bio?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

export interface UserSettings {
  pubkey: string;
  tier: Tier;
  displayName?: string;
  bio?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
  releaseChannel: 'stable' | 'beta' | 'alpha' | 'dev';
  created: number;
  updated: number;
}

export interface AdminSetUserSettingsRequest {
  pubkey: string;
  targetPubkey: string;
  tier?: Tier;
  displayName?: string;
  bio?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
  website?: string;
}

export interface ReleaseChannelUpdateRequest {
  pubkey: string;
  releaseChannel: 'stable' | 'beta' | 'alpha' | 'dev';
}

export interface ReleaseChannel {
  channel: string;
  userCount: number;
  users: string[];
}

export interface UserSettingsUpdate {
  releaseChannel?: 'stable' | 'beta' | 'alpha';
  socialSharing?: boolean;
}

export interface UserSettingsResponse {
  pubkey: string;
  releaseChannel: 'stable' | 'beta' | 'alpha';
  socialSharing: boolean;
  created: number;
  updated: number;
}

export interface UsersByReleaseChannel {
  success: boolean;
  message: string;
  data: {
    releaseChannel: string;
    userCount: number;
    users: string[];
  };
}

// Status & Health
export interface ServiceStatus {
  service: string;
  version: string;
  uptime: number;
  environment: 'development' | 'staging' | 'production';
  key: string;
  timestamp: number;
  system?: {
    platform: string;
    arch: string;
    memory: {
      total: string;
      free: string;
    };
  };
}

export interface HealthStatus {
  status: 'ok';
}

// Subscriptions
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  data?: { [key: string]: any };
}

export interface DeviceInfo {
  deviceId: string;
  endpoint: string;
  userAgent?: string;
  created: number;
  modified: number;
}

export interface DevicesResponse {
  pubkey: string;
  deviceCount: number;
  devices: DeviceInfo[];
}

export interface NotificationSettings {
  [key: string]: any;
}

export interface Error {
  error: string;
  message?: string;
}