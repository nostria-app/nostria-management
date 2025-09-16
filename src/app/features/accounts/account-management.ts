import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
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
  private apiService = new ApiService();
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

  lookupQuery = '';
  authToken = ''; // TODO: Implement proper auth token management

  // Computed signal for tiers array
  tiersArray = signal<TierDetails[]>([]);

  // Reactive forms
  createAccountForm: FormGroup;
  updateAccountForm: FormGroup;

  constructor() {
    this.createAccountForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      username: [''],
      paymentId: ['']
    });

    this.updateAccountForm = this.fb.group({
      username: ['']
    });
  }

  ngOnInit() {
    this.loadTiers();
    this.loadCurrentAccount();
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
    return new Date(timestamp * 1000).toLocaleString();
  }

  formatPrice(priceCents: number): string {
    return (priceCents / 100).toFixed(2);
  }
}
