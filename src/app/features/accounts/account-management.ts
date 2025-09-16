import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Nip98AuthService } from '../../core/services/nip98-auth.service';
import { NostrExtensionService } from '../../core/services/nostr-extension.service';
import { 
  TierDetails, Account, AddAccountRequest, UpdateAccountRequest 
} from '../../shared/models/api.models';

@Component({
  selector: 'app-account-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './account-management.html',
  styleUrl: './account-management.scss'
})
export class AccountManagement implements OnInit {
  private fb = new FormBuilder();

  // Signals for reactive state management
  tiers = signal<Record<string, TierDetails> | null>(null);
  tiersLoading = signal(false);
  tiersError = signal<string | null>(null);
  
  currentAccount = signal<Account | null>(null);
  
  isCreatingAccount = signal(false);
  createAccountError = signal<string | null>(null);
  createAccountSuccess = signal(false);
  
  isUpdatingAccount = signal(false);
  updateAccountError = signal<string | null>(null);
  updateAccountSuccess = signal(false);
  
  usernameCheckResult = signal<any | null>(null);
  
  isLookingUp = signal(false);
  lookupResult = signal<any | null>(null);
  lookupError = signal<string | null>(null);

  // List accounts with NIP-98 auth (for when API becomes available)
  isListingAccounts = signal(false);
  listAccountsError = signal<string | null>(null);
  listedAccounts = signal<Account[]>([]);
  isNostrConnected = signal(false);

  lookupQuery = '';
  authToken = ''; // TODO: Implement proper auth token management

  // Check if Nostr extension is available
  isNostrExtensionAvailable = false;

  // Computed signal for tiers array
  tiersArray = signal<TierDetails[]>([]);

  // Reactive forms
  createAccountForm: FormGroup;
  updateAccountForm: FormGroup;
  listAccountsForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private nip98AuthService: Nip98AuthService,
    private nostrExtensionService: NostrExtensionService
  ) {
    this.createAccountForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      username: [''],
      paymentId: ['']
    });

    this.updateAccountForm = this.fb.group({
      username: ['']
    });

    this.listAccountsForm = this.fb.group({
      limit: [100, [Validators.required, Validators.min(1), Validators.max(1000)]]
    });
  }

  ngOnInit() {
    this.loadTiers();
    this.loadCurrentAccount();
    this.checkNostrExtension();
  }

  private checkNostrExtension() {
    this.isNostrExtensionAvailable = this.nostrExtensionService.isExtensionAvailable();
    // Set connected status based on extension availability for now
    this.isNostrConnected.set(false);
  }

  async loadMockAccounts() {
    // Mock account data for demonstration since there's no API yet
    const mockAccounts: Account[] = [
      {
        pubkey: '8e9f64b35e7e4384b5248f1d4294f109bb8d3442b04d7c59a62c04e702441488',
        username: 'alice',
        signupDate: Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
        lastLoginDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        expires: Math.floor(Date.now() / 1000) + 86400 * 335, // ~1 year from now
        tier: 'premium',
        entitlements: {
          notificationsPerDay: 1000,
          features: [
            { key: 'BASIC_WEB_PUSH', label: 'Basic Web Push' },
            { key: 'USERNAME', label: 'Custom Username' },
            { key: 'ADVANCED_FILTERING', label: 'Advanced Filtering' },
            { key: 'PRIORITY_SUPPORT', label: 'Priority Support' }
          ]
        }
      },
      {
        pubkey: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        username: 'bob_nostr',
        signupDate: Math.floor(Date.now() / 1000) - 86400 * 15, // 15 days ago
        lastLoginDate: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        expires: Math.floor(Date.now() / 1000) + 86400 * 350, // ~1 year from now
        tier: 'premium_plus',
        entitlements: {
          notificationsPerDay: 5000,
          features: [
            { key: 'BASIC_WEB_PUSH', label: 'Basic Web Push' },
            { key: 'USERNAME', label: 'Custom Username' },
            { key: 'ADVANCED_FILTERING', label: 'Advanced Filtering' },
            { key: 'PRIORITY_SUPPORT', label: 'Priority Support' },
            { key: 'API_ACCESS', label: 'API Access' },
            { key: 'WEBHOOK', label: 'Webhook Support' },
            { key: 'ANALYTICS', label: 'Analytics Dashboard' }
          ]
        }
      },
      {
        pubkey: 'f1e2d3c4b5a6978901234567890abcdef1234567890abcdef1234567890abcde',
        signupDate: Math.floor(Date.now() / 1000) - 86400 * 5, // 5 days ago
        lastLoginDate: Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago
        tier: 'free',
        entitlements: {
          notificationsPerDay: 25,
          features: [
            { key: 'BASIC_WEB_PUSH', label: 'Basic Web Push' },
            { key: 'COMMUNITY_SUPPORT', label: 'Community Support' }
          ]
        }
      },
      {
        pubkey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        username: 'developer',
        signupDate: Math.floor(Date.now() / 1000) - 86400 * 60, // 60 days ago
        lastLoginDate: Math.floor(Date.now() / 1000) - 43200, // 12 hours ago
        expires: Math.floor(Date.now() / 1000) + 86400 * 305, // ~10 months from now
        tier: 'premium',
        entitlements: {
          notificationsPerDay: 1000,
          features: [
            { key: 'BASIC_WEB_PUSH', label: 'Basic Web Push' },
            { key: 'USERNAME', label: 'Custom Username' },
            { key: 'ADVANCED_FILTERING', label: 'Advanced Filtering' },
            { key: 'PRIORITY_SUPPORT', label: 'Priority Support' }
          ]
        }
      }
    ];
    this.listedAccounts.set(mockAccounts);
  }

  async loadTiers() {
    this.tiersLoading.set(true);
    this.tiersError.set(null);
    
    try {
      const response = await this.apiService.getTiers();
      if (response.success && response.data) {
        this.tiers.set(response.data);
        this.tiersArray.set(Object.values(response.data));
      } else {
        this.tiersError.set(response.message || 'Failed to load tiers');
      }
    } catch (error) {
      this.tiersError.set('Network error loading tiers');
    } finally {
      this.tiersLoading.set(false);
    }
  }

  async loadCurrentAccount() {
    if (!this.authToken) return;
    
    try {
      const response = await this.apiService.getAccount(this.authToken);
      if (response.success && response.data) {
        this.currentAccount.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load current account:', error);
    }
  }

  async createAccount() {
    if (this.createAccountForm.invalid) return;

    this.isCreatingAccount.set(true);
    this.createAccountError.set(null);
    this.createAccountSuccess.set(false);

    try {
      const formValue = this.createAccountForm.value;
      const request: AddAccountRequest = {
        pubkey: formValue.pubkey,
        username: formValue.username || undefined,
        paymentId: formValue.paymentId || undefined
      };

      const response = await this.apiService.createAccount(request);
      if (response.success) {
        this.createAccountSuccess.set(true);
        this.createAccountForm.reset();
      } else {
        this.createAccountError.set(response.message || 'Failed to create account');
      }
    } catch (error) {
      this.createAccountError.set('Network error creating account');
    } finally {
      this.isCreatingAccount.set(false);
    }
  }

  async updateAccount() {
    if (this.updateAccountForm.invalid) return;

    this.isUpdatingAccount.set(true);
    this.updateAccountError.set(null);
    this.updateAccountSuccess.set(false);

    try {
      const formValue = this.updateAccountForm.value;
      const request: UpdateAccountRequest = {
        username: formValue.username || undefined
      };

      const response = await this.apiService.updateAccount(this.authToken, request);
      if (response.success) {
        this.updateAccountSuccess.set(true);
        this.currentAccount.set(response.data);
      } else {
        this.updateAccountError.set(response.message || 'Failed to update account');
      }
    } catch (error) {
      this.updateAccountError.set('Network error updating account');
    } finally {
      this.isUpdatingAccount.set(false);
    }
  }

  async checkUsername() {
    const username = this.createAccountForm.get('username')?.value;
    if (!username) return;

    try {
      const response = await this.apiService.checkUsername(username);
      this.usernameCheckResult.set(response);
    } catch (error) {
      this.usernameCheckResult.set({
        success: false,
        message: 'Network error checking username'
      });
    }
  }

  async lookupAccount() {
    if (!this.lookupQuery) return;

    this.isLookingUp.set(true);
    this.lookupError.set(null);
    this.lookupResult.set(null);

    try {
      const response = await this.apiService.getPublicAccount(this.lookupQuery);
      if (response.success) {
        this.lookupResult.set(response.data?.result || response.data);
      } else {
        this.lookupError.set(response.message || 'Account not found');
      }
    } catch (error) {
      this.lookupError.set('Network error looking up account');
    } finally {
      this.isLookingUp.set(false);
    }
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    // API returns timestamps in milliseconds, so use directly
    return new Date(timestamp).toLocaleString();
  }

  formatPrice(priceCents: number): string {
    return (priceCents / 100).toFixed(2);
  }

  // Nostr Extension Methods
  async connectToNostr() {
    this.listAccountsError.set(null);
    
    try {
      await this.nostrExtensionService.connect();
      this.isNostrConnected.set(true);
    } catch (error) {
      this.listAccountsError.set(
        error instanceof Error ? error.message : 'Failed to connect to Nostr extension'
      );
    }
  }

  // List accounts method (now with real API)
  async listAccounts() {
    if (this.listAccountsForm.invalid || !this.isNostrConnected()) return;

    this.isListingAccounts.set(true);
    this.listAccountsError.set(null);

    try {
      const limit = this.listAccountsForm.get('limit')?.value || 50;
      
      // Real API call using NIP-98 authentication
      const response = await this.apiService.makeAuthenticatedRequest<any[]>(`/account/list?limit=${limit}`, {
        method: 'GET'
      });

      if (response.success && response.data) {
        // Convert AccountList objects to Account objects for display
        const accounts: Account[] = response.data.map((accountList: any) => ({
          pubkey: accountList.pubkey,
          username: accountList.username,
          signupDate: accountList.created,
          lastLoginDate: accountList.lastLoginDate,
          expires: accountList.expires,
          tier: accountList.tier,
          entitlements: {
            notificationsPerDay: this.getNotificationsPerDayForTier(accountList.tier),
            features: this.getFeaturesForTier(accountList.tier)
          }
        }));
        this.listedAccounts.set(accounts);
      } else {
        this.listAccountsError.set(response.message || 'Failed to load accounts');
      }
    } catch (error) {
      this.listAccountsError.set(
        error instanceof Error ? error.message : 'Network error loading accounts'
      );
    } finally {
      this.isListingAccounts.set(false);
    }
  }

  disconnectNostr() {
    this.nostrExtensionService.disconnect();
    this.isNostrConnected.set(false);
    this.listAccountsError.set(null);
  }

  getAccountStatusClass(account: Account): string {
    const now = Math.floor(Date.now() / 1000);
    
    if (account.expires && account.expires < now) {
      return 'expired';
    }
    
    switch (account.tier) {
      case 'premium_plus': return 'premium-plus';
      case 'premium': return 'premium';
      case 'free': return 'free';
      default: return 'free';
    }
  }

  getTierDisplayName(tier: string): string {
    switch (tier) {
      case 'premium_plus': return 'Premium Plus';
      case 'premium': return 'Premium';
      case 'free': return 'Free';
      default: return tier;
    }
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  isAccountExpired(expires?: number): boolean {
    if (!expires) return false;
    // API returns timestamps in milliseconds, so compare directly
    return expires < Date.now();
  }

  getTimeUntilExpiration(expires: number): string {
    // API returns timestamps in milliseconds, convert to seconds for calculation
    const expiresInSeconds = Math.floor(expires / 1000);
    const now = Math.floor(Date.now() / 1000);
    const diff = expiresInSeconds - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      const minutes = Math.floor((diff % 3600) / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  }

  getNotificationsPerDayForTier(tier: string): number {
    switch (tier) {
      case 'premium_plus': return 5000;
      case 'premium': return 1000;
      case 'free': return 25;
      default: return 25;
    }
  }

  getFeaturesForTier(tier: string): any[] {
    const baseFeatures = [
      { key: 'BASIC_WEB_PUSH', label: 'Basic Web Push' }
    ];

    switch (tier) {
      case 'premium_plus':
        return [
          ...baseFeatures,
          { key: 'USERNAME', label: 'Custom Username' },
          { key: 'ADVANCED_FILTERING', label: 'Advanced Filtering' },
          { key: 'PRIORITY_SUPPORT', label: 'Priority Support' },
          { key: 'API_ACCESS', label: 'API Access' },
          { key: 'WEBHOOK', label: 'Webhook Support' },
          { key: 'ANALYTICS', label: 'Analytics Dashboard' }
        ];
      case 'premium':
        return [
          ...baseFeatures,
          { key: 'USERNAME', label: 'Custom Username' },
          { key: 'ADVANCED_FILTERING', label: 'Advanced Filtering' },
          { key: 'PRIORITY_SUPPORT', label: 'Priority Support' }
        ];
      case 'free':
      default:
        return [
          ...baseFeatures,
          { key: 'COMMUNITY_SUPPORT', label: 'Community Support' }
        ];
    }
  }
}
