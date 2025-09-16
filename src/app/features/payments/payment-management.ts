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
  private apiService = new ApiService();
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

  // Payment history (simulated - would come from real API)
  paymentHistory = signal<Payment[]>([]);

  // Forms
  createPaymentForm: FormGroup;
  checkPaymentForm: FormGroup;

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

  constructor() {
    this.createPaymentForm = this.fb.group({
      tierName: ['premium', [Validators.required]],
      billingCycle: ['monthly', [Validators.required]],
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]]
    });

    this.checkPaymentForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      paymentId: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    this.loadTiers();
    this.loadPaymentHistory();
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
        lnInvoice: 'lnbc100u1pj...',
        status: 'paid',
        expires: Math.floor(Date.now() / 1000) + 3600
      },
      {
        id: 'pay_0987654321',
        lnInvoice: 'lnbc50u1pj...',
        status: 'expired',
        expires: Math.floor(Date.now() / 1000) - 3600
      },
      {
        id: 'pay_1122334455',
        lnInvoice: 'lnbc200u1pj...',
        status: 'pending',
        expires: Math.floor(Date.now() / 1000) + 1800
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
  }
}
