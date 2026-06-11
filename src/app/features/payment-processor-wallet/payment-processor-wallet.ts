import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  PaymentProcessorAccessConfig,
  PaymentProcessorBalance,
  PaymentProcessorPayInvoiceResult,
  PaymentProcessorPrice,
  PaymentProcessorRecord,
  PaymentProcessorService,
  PaymentProcessorStatus,
} from '../../core/services/payment-processor.service';
import { InvestorAccessService } from '../../core/services/investor-access.service';

interface StoredPaymentProcessorAccess {
  baseUrl: string;
  apiKey: string;
}

@Component({
  selector: 'app-payment-processor-wallet',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-processor-wallet.html',
  styleUrl: './payment-processor-wallet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentProcessorWallet implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentProcessor = inject(PaymentProcessorService);
  protected readonly access = inject(InvestorAccessService);
  private readonly storageKey = 'nostria-management.payment-processor-wallet';
  private readonly isBrowser = typeof window !== 'undefined';

  protected readonly isLoading = signal(false);
  protected readonly isPaying = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly status = signal<PaymentProcessorStatus | null>(null);
  protected readonly price = signal<PaymentProcessorPrice | null>(null);
  protected readonly balance = signal<PaymentProcessorBalance | null>(null);
  protected readonly incoming = signal<PaymentProcessorRecord[]>([]);
  protected readonly outgoing = signal<PaymentProcessorRecord[]>([]);
  protected readonly decodedInvoice = signal<Record<string, unknown> | null>(null);
  protected readonly payResult = signal<PaymentProcessorPayInvoiceResult | null>(null);
  protected readonly activeList = signal<'incoming' | 'outgoing'>('incoming');

  protected readonly walletBalanceSat = computed(() => Number(this.balance()?.balanceSat || 0));
  protected readonly feeCreditSat = computed(() => Number(this.balance()?.feeCreditSat || 0));

  protected readonly accessForm = this.fb.group({
    baseUrl: [this.paymentProcessor.defaultBaseUrl, [Validators.required]],
    apiKey: [''],
    rememberApiKey: [false],
    all: [true],
    externalId: [''],
  });

  protected readonly payForm = this.fb.group({
    invoice: ['', [Validators.required]],
    confirmed: [false, [Validators.requiredTrue]],
  });

  async ngOnInit(): Promise<void> {
    if (!this.access.session()) {
      await this.access.refreshSession();
    }

    if (!this.access.isAdmin()) {
      return;
    }

    this.loadStoredAccess();
    void this.refreshPublicStatus();
  }

  protected async refreshAll(): Promise<void> {
    this.saveStoredAccess();
    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.refreshPublicStatus();

      if (!this.currentConfig().apiKey) {
        this.balance.set(null);
        this.incoming.set([]);
        this.outgoing.set([]);
        this.success.set('Status loaded. Enter the payment processor API key to load wallet data.');
        return;
      }

      await Promise.all([
        this.loadBalance(),
        this.loadTransactions(),
      ]);

      this.success.set('Payment processor wallet data refreshed.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to refresh payment processor wallet data');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async refreshPublicStatus(): Promise<void> {
    const baseUrl = this.currentBaseUrl();
    const [status, price] = await Promise.all([
      this.paymentProcessor.getStatus({ baseUrl }),
      this.paymentProcessor.getPrice({ baseUrl }),
    ]);

    this.status.set(status);
    this.price.set(price);
  }

  protected async loadBalance(): Promise<void> {
    this.balance.set(await this.paymentProcessor.getBalance(this.currentConfig()));
  }

  protected async loadTransactions(): Promise<void> {
    const value = this.accessForm.getRawValue();
    const all = value.all !== false;
    const externalId = value.externalId?.trim() || '';
    const config = this.currentConfig();
    const [incoming, outgoing] = await Promise.all([
      this.paymentProcessor.listIncoming(config, all, externalId),
      this.paymentProcessor.listOutgoing(config, all, externalId),
    ]);

    this.incoming.set(incoming);
    this.outgoing.set(outgoing);
  }

  protected async decodeInvoice(): Promise<void> {
    const invoice = this.payForm.controls.invoice.value?.trim();
    if (!invoice) {
      this.payForm.controls.invoice.markAsTouched();
      return;
    }

    this.error.set(null);
    this.decodedInvoice.set(null);

    try {
      this.decodedInvoice.set(await this.paymentProcessor.decodeInvoice(this.currentBaseUrl(), invoice));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to decode invoice');
    }
  }

  protected async payInvoice(): Promise<void> {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }

    if (!this.currentConfig().apiKey) {
      this.error.set('Enter the payment processor API key before paying an invoice.');
      return;
    }

    this.isPaying.set(true);
    this.error.set(null);
    this.success.set(null);
    this.payResult.set(null);

    try {
      const invoice = this.payForm.controls.invoice.value?.trim() || '';
      const result = await this.paymentProcessor.payInvoice(this.currentConfig(), invoice);
      this.payResult.set(result);
      this.success.set('Invoice paid through the payment processor.');
      this.payForm.reset({ invoice: '', confirmed: false });
      await Promise.all([
        this.loadBalance(),
        this.loadTransactions(),
      ]);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to pay invoice');
    } finally {
      this.isPaying.set(false);
    }
  }

  protected setActiveList(list: 'incoming' | 'outgoing'): void {
    this.activeList.set(list);
  }

  protected activeTransactions(): PaymentProcessorRecord[] {
    return this.activeList() === 'incoming' ? this.incoming() : this.outgoing();
  }

  protected paymentHash(record: PaymentProcessorRecord): string {
    return String(record.paymentHash || record.hash || record.externalId || 'No hash');
  }

  protected paymentAmount(record: PaymentProcessorRecord): string {
    const amount = Number(record.receivedSat ?? record.amountSat ?? 0);
    return amount > 0 ? this.formatSats(amount) : 'Unknown amount';
  }

  protected paymentDate(record: PaymentProcessorRecord): string {
    return this.formatDate(record.completedAt || record.createdAt);
  }

  protected rawJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  protected formatSats(value?: number): string {
    return new Intl.NumberFormat('en-US').format(value || 0) + ' sats';
  }

  protected formatUsd(value?: number): string {
    if (!value) {
      return 'Unknown';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatDate(value: unknown): string {
    if (!value) {
      return 'Not available';
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 'Not available';
    }

    const milliseconds = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    return new Date(milliseconds).toLocaleString();
  }

  private currentConfig(): PaymentProcessorAccessConfig {
    return {
      baseUrl: this.currentBaseUrl(),
      apiKey: this.accessForm.controls.apiKey.value?.trim() || '',
    };
  }

  private currentBaseUrl(): string {
    return (this.accessForm.controls.baseUrl.value || this.paymentProcessor.defaultBaseUrl).trim();
  }

  private loadStoredAccess(): void {
    if (!this.isBrowser) {
      return;
    }

    const stored = window.localStorage.getItem(this.storageKey);
    if (!stored) {
      return;
    }

    try {
      const value = JSON.parse(stored) as StoredPaymentProcessorAccess;
      this.accessForm.patchValue({
        baseUrl: value.baseUrl || this.paymentProcessor.defaultBaseUrl,
        apiKey: value.apiKey || '',
        rememberApiKey: Boolean(value.apiKey),
      });
    } catch {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private saveStoredAccess(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.accessForm.controls.rememberApiKey.value) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    const value: StoredPaymentProcessorAccess = {
      baseUrl: this.currentBaseUrl(),
      apiKey: this.accessForm.controls.apiKey.value?.trim() || '',
    };

    window.localStorage.setItem(this.storageKey, JSON.stringify(value));
  }
}
