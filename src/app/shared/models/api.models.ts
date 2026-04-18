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
  xConnection?: XConnectionInfo;
  xUsage?: XUsageInfo;
}

export interface XConnectionInfo {
  connected: boolean;
  username?: string;
  userId?: string;
}

export interface XUsageInfo {
  totalPosts: number;
  postsLast24h: number;
  lastPosted?: number;
  limit24h?: number;
  remaining24h?: number;
}

export interface AddAccountRequest {
  pubkey: string;
  username?: string;
  paymentId?: string;
}

export interface UpdateAccountRequest {
  username?: string;
}

export type Feature = 'BASIC_WEBPUSH' | 'COMMUNITY_SUPPORT' | 'USERNAME' |
  'NEWSLETTER' | 'STORAGE_1GB' | 'STORAGE_5GB' | 'STORAGE_50GB' |
  'DUAL_POST_X_10' | 'ANALYTICS' | 'CLOUD_BACKUP_COMING_SOON' |
  'MEMOS' | 'YOUTUBE' | 'EXTRA_BACKUP_FEATURES';

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

export type Tier = 'free' | 'basic' | 'premium' | 'premium_plus';

export interface TierDetails {
  tier: Tier;
  name: string;
  pricing?: Pricing;
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
  type: string;
  paymentType: string;
  lnHash?: string;
  lnInvoice: string;
  lnAmountSat: number;
  tier: Tier;
  billingCycle: BillingCycle;
  priceCents: number;
  pubkey: string;
  isPaid: boolean;
  paid?: number;
  expires: number;
  status: 'pending' | 'expired' | 'paid' | 'cancelled';
  created: number;
  modified: number;
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
  created: number;
  updated: number;
}

export interface GrokResponseModelConfig {
  enabled: boolean;
  inputTokenNanosUsd: number;
  outputTokenNanosUsd: number;
}

export interface GrokImageModelConfig {
  enabled: boolean;
  imageNanosUsd: number;
  includedQuotaEligible: boolean;
}

export interface GrokAdminConfig {
  enabled: boolean;
  allowResponses: boolean;
  allowImages: boolean;
  allowServerSideTools: boolean;
  guardrails: {
    responseSafetyMarginPercent: number;
  };
  defaults: {
    responseModel: string;
    imageModel: string;
  };
  topUp: {
    minimumCents: number;
    maximumCents: number;
    defaultOptionsCents: number[];
    nanosUsdPerCent: number;
  };
  quotas: {
    basic: {
      includedImagesPerMonth: number;
    };
    premium: {
      includedImagesPerMonth: number;
    };
    premiumPlus: {
      includedImagesPerMonth: number;
      dailyImageLimit: number;
    };
  };
  pricing: {
    responses: Record<string, GrokResponseModelConfig>;
    images: Record<string, GrokImageModelConfig>;
  };
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

export interface UserSettingsUpdate {
  socialSharing?: boolean;
}

export interface UserSettingsResponse {
  pubkey: string;
  socialSharing: boolean;
  created: number;
  updated: number;
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

// NIP-98 Authentication Types
export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface NostrEventTemplate {
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

export interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEventTemplate): Promise<NostrEvent>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

export interface Nip98AuthOptions {
  includeAuthorizationScheme?: boolean;
  payload?: Record<string, any>;
}

export interface Nip98Token {
  token: string;
  event: NostrEvent;
  createdAt: number;
}

export interface AuthenticationState {
  isAuthenticated: boolean;
  pubkey?: string;
  extensionName?: string;
  supportedNips?: number[];
}

declare global {
  interface Window {
    nostr?: NostrExtension;
    nos2x?: NostrExtension;
    alby?: NostrExtension;
    [key: string]: any;
  }
}