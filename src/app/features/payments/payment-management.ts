import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../shared/utils/utils.service';
import {
  CreatePaymentRequest, Payment, TierDetails, Tier, BillingCycle
} from '../../shared/models/api.models';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment-management.html',
  styleUrl: './payment-management.scss'
})
export class PaymentManagement implements OnInit {
  private fb = new FormBuilder();
  private utils = new UtilsService();

  // Signals for reactive state management
  tiers = signal<Record<string, TierDetails> | null>(null);
  tiersLoading = signal(false);
  tiersError = signal<string | null>(null);

  isCreatingPayment = signal(false);
  createPaymentError = signal<string | null>(null);
  createdPayment = signal<Payment | null>(null);

  isCheckingPayment = signal(false);
  paymentCheckError = signal<string | null>(null);
  checkedPayment = signal<Payment | null>(null);

  // List payments with NIP-98 auth
  isListingPayments = signal(false);
  listPaymentsError = signal<string | null>(null);
  listedPayments = signal<Payment[]>([]);
  isNostrConnected = signal(false);

  // Payment history (simulated - would come from real API)
  paymentHistory = signal<Payment[]>([]);

  // Forms
  createPaymentForm: FormGroup;
  checkPaymentForm: FormGroup;
  listPaymentsForm: FormGroup;

  // Available options
  tierOptions: { value: Tier; label: string }[] = [
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium' },
    { value: 'premium_plus', label: 'Premium Plus' }
  ];

  billingCycleOptions: { value: BillingCycle; label: string; discount?: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly', discount: '5% off' },
    { value: 'yearly', label: 'Yearly', discount: '15% off' }
  ];

  constructor(private apiService: ApiService) {
    this.createPaymentForm = this.fb.group({
      tierName: ['premium', [Validators.required]],
      billingCycle: ['monthly', [Validators.required]],
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]]
    });

    this.checkPaymentForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      paymentId: ['', [Validators.required]]
    });

    this.listPaymentsForm = this.fb.group({
      limit: [50, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
  }

  ngOnInit() {
    this.loadTiers();
    this.loadPaymentHistory();
    this.checkNostrConnection();
  }

  checkNostrConnection() {
    this.isNostrConnected.set(this.apiService.isNip98AuthAvailable());
  }

  async loadTiers() {
    this.tiersLoading.set(true);
    this.tiersError.set(null);

    try {
      const response = await this.apiService.getTiers();
      if (response.success && response.data) {
        this.tiers.set(response.data);
      } else {
        this.tiersError.set(response.message || 'Failed to load tiers');
      }
    } catch (error) {
      this.tiersError.set('Network error loading tiers');
    } finally {
      this.tiersLoading.set(false);
    }
  }

  async loadPaymentHistory() {
    // Simulate payment history - in real app, this would be an API call
    const mockPayments: Payment[] = [
      {
        id: 'pay_1234567890',
        type: 'payment',
        paymentType: 'ln',
        lnHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        lnInvoice: 'lnbc100u1pj...',
        lnAmountSat: 10000,
        tier: 'premium',
        billingCycle: 'monthly',
        priceCents: 1000,
        pubkey: '8e9f64b35e7e4384b5248f1d4294f109bb8d3442b04d7c59a62c04e702441488',
        isPaid: true,
        paid: Math.floor(Date.now() / 1000) - 3600,
        status: 'paid',
        expires: Math.floor(Date.now() / 1000) + 3600,
        created: Math.floor(Date.now() / 1000) - 7200,
        modified: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: 'pay_0987654321',
        type: 'payment',
        paymentType: 'ln',
        lnInvoice: 'lnbc50u1pj...',
        lnAmountSat: 5000,
        tier: 'premium',
        billingCycle: 'monthly',
        priceCents: 500,
        pubkey: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        isPaid: false,
        status: 'expired',
        expires: Math.floor(Date.now() / 1000) - 3600,
        created: Math.floor(Date.now() / 1000) - 10800,
        modified: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: 'pay_1122334455',
        type: 'payment',
        paymentType: 'ln',
        lnInvoice: 'lnbc200u1pj...',
        lnAmountSat: 20000,
        tier: 'premium_plus',
        billingCycle: 'quarterly',
        priceCents: 2500,
        pubkey: 'f1e2d3c4b5a6978901234567890abcdef1234567890abcdef1234567890abcde',
        isPaid: false,
        status: 'pending',
        expires: Math.floor(Date.now() / 1000) + 1800,
        created: Math.floor(Date.now() / 1000) - 900,
        modified: Math.floor(Date.now() / 1000) - 900
      }
    ];
    this.paymentHistory.set(mockPayments);
  }

  async createPayment() {
    if (this.createPaymentForm.invalid) return;

    this.isCreatingPayment.set(true);
    this.createPaymentError.set(null);
    this.createdPayment.set(null);

    try {
      const formValue = this.createPaymentForm.value;
      const request: CreatePaymentRequest = {
        tierName: formValue.tierName,
        billingCycle: formValue.billingCycle,
        pubkey: formValue.pubkey
      };

      const response = await this.apiService.createPayment(request);
      if (response.success && response.data) {
        this.createdPayment.set(response.data);
        this.createPaymentForm.reset({
          tierName: 'premium',
          billingCycle: 'monthly',
          pubkey: ''
        });
        // Add to payment history
        const currentHistory = this.paymentHistory();
        this.paymentHistory.set([response.data, ...currentHistory]);
      } else {
        this.createPaymentError.set(response.message || 'Failed to create payment');
      }
    } catch (error) {
      this.createPaymentError.set('Network error creating payment');
    } finally {
      this.isCreatingPayment.set(false);
    }
  }

  async checkPayment() {
    if (this.checkPaymentForm.invalid) return;

    this.isCheckingPayment.set(true);
    this.paymentCheckError.set(null);
    this.checkedPayment.set(null);

    try {
      const formValue = this.checkPaymentForm.value;
      const response = await this.apiService.getPayment(formValue.pubkey, formValue.paymentId);
      if (response.success && response.data) {
        this.checkedPayment.set(response.data);
      } else {
        this.paymentCheckError.set(response.message || 'Payment not found');
      }
    } catch (error) {
      this.paymentCheckError.set('Network error checking payment');
    } finally {
      this.isCheckingPayment.set(false);
    }
  }

  getSelectedTierDetails(): TierDetails | null {
    const tiers = this.tiers();
    const selectedTier = this.createPaymentForm.get('tierName')?.value;
    return tiers ? tiers[selectedTier] : null;
  }

  getCalculatedPrice(): { amount: number; currency: string; originalAmount?: number } | null {
    const tierDetails = this.getSelectedTierDetails();
    const billingCycle = this.createPaymentForm.get('billingCycle')?.value;
    
    if (!tierDetails || !tierDetails.pricing) return null;

    const pricing = tierDetails.pricing[billingCycle as BillingCycle];
    if (!pricing) return null;

    let amount = pricing.priceCents / 100;
    let originalAmount: number | undefined;

    // Apply discounts for longer billing cycles
    if (billingCycle === 'quarterly' && tierDetails.pricing.monthly) {
      originalAmount = (tierDetails.pricing.monthly.priceCents * 3) / 100;
      amount = originalAmount * 0.95; // 5% discount
    } else if (billingCycle === 'yearly' && tierDetails.pricing.monthly) {
      originalAmount = (tierDetails.pricing.monthly.priceCents * 12) / 100;
      amount = originalAmount * 0.85; // 15% discount
    }

    return {
      amount,
      currency: pricing.currency,
      originalAmount
    };
  }

  copyToClipboard(text: string) {
    this.utils.copyToClipboard(text);
  }

  formatDate(timestamp?: number): string {
    return this.utils.formatDate(timestamp);
  }

  formatPubkey(pubkey: string): string {
    return this.utils.formatPubkey(pubkey);
  }

  getStatusColor(status: string): string {
    return this.utils.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return this.utils.getStatusIcon(status);
  }

  isExpired(timestamp?: number): boolean {
    return this.utils.isExpired(timestamp);
  }

  getTimeUntilExpiration(timestamp?: number): string {
    return this.utils.getTimeUntilExpiration(timestamp);
  }

  openLightningInvoice(invoice: string) {
    // Open lightning invoice in default handler
    window.open(`lightning:${invoice}`, '_blank');
  }

  refreshPaymentStatus(payment: Payment) {
    this.checkPaymentForm.patchValue({
      pubkey: '', // Would need actual pubkey
      paymentId: payment.id
    });
    this.checkPayment();
  }

  exportPaymentHistory() {
    const history = this.paymentHistory();
    this.utils.downloadAsFile(
      history,
      `payment-history-${Date.now()}.json`,
      'application/json'
    );
  }

  clearResults() {
    this.createdPayment.set(null);
    this.checkedPayment.set(null);
    this.createPaymentError.set(null);
    this.paymentCheckError.set(null);
    this.listPaymentsError.set(null);
    this.listedPayments.set([]);
  }

  // NIP-98 Authentication and Payment Listing Methods

  get isNostrExtensionAvailable(): boolean {
    return this.apiService.isNip98AuthAvailable();
  }

  async connectToNostr() {
    try {
      const pubkey = await this.apiService.connectNostrExtension();
      this.isNostrConnected.set(true);
      console.log('Connected to Nostr extension with pubkey:', pubkey);
    } catch (error) {
      console.error('Failed to connect to Nostr extension:', error);
      this.listPaymentsError.set(
        error instanceof Error ? error.message : 'Failed to connect to Nostr extension'
      );
    }
  }

  async listPayments() {
    if (this.listPaymentsForm.invalid) return;

    // Check if Nostr extension is connected
    if (!this.apiService.getNostrAuthState().isAuthenticated) {
      this.listPaymentsError.set('Please connect to your Nostr extension first');
      return;
    }

    this.isListingPayments.set(true);
    this.listPaymentsError.set(null);
    this.listedPayments.set([]);

    try {
      const formValue = this.listPaymentsForm.value;
      const limit = formValue.limit || 50;
      
      // Use authenticated request with NIP-98
      const response = await this.apiService.makeAuthenticatedRequest<Payment[]>(`/payment?limit=${limit}`, {
        method: 'GET'
      });

      if (response.success && response.data) {
        this.listedPayments.set(response.data);
      } else {
        this.listPaymentsError.set(response.message || 'Failed to load payments');
      }
    } catch (error) {
      this.listPaymentsError.set(
        error instanceof Error ? error.message : 'Network error loading payments'
      );
    } finally {
      this.isListingPayments.set(false);
    }
  }

  disconnectNostr() {
    this.apiService.disconnectNostrExtension();
    this.isNostrConnected.set(false);
    this.listedPayments.set([]);
    this.listPaymentsError.set(null);
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'secondary';
    }
  }

  formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  isTimestampExpired(timestamp: number): boolean {
    return timestamp * 1000 < Date.now();
  }
}
