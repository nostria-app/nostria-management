import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/services/api.service';
import { InvestorAccessService } from '../../core/services/investor-access.service';
import {
  Investor,
  InvestorAdminDashboardResponse,
  InvestorDashboardResponse,
  InvestorInput,
  InvestorPayout,
} from '../../shared/models/api.models';

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './investor-dashboard.html',
  styleUrl: './investor-dashboard.scss'
})
export class InvestorDashboard implements OnInit {
  protected readonly access = inject(InvestorAccessService);
  private readonly apiService = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly adminDashboard = signal<InvestorAdminDashboardResponse | null>(null);
  protected readonly investorDashboard = signal<InvestorDashboardResponse | null>(null);
  protected readonly editingPubkey = signal<string | null>(null);
  protected readonly savingInvestor = signal(false);
  protected readonly calculatingPeriod = signal(false);
  protected readonly payingPayoutId = signal<string | null>(null);

  protected readonly currentPeriod = computed(() => {
    const date = new Date();
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  protected payoutInvoices: Record<string, string> = {};
  protected payoutAmountsSat: Record<string, number | null> = {};

  protected readonly investorForm = this.fb.group({
    pubkey: ['', [Validators.required]],
    displayName: [''],
    investmentDollars: [0, [Validators.min(0)]],
    sharePercentage: [0, [Validators.min(0), Validators.max(100)]],
    lightningAddress: [''],
    status: ['active']
  });

  protected readonly periodForm = this.fb.group({
    period: [this.currentPeriod(), [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
    revenueSharePercentage: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    notes: ['']
  });

  async ngOnInit(): Promise<void> {
    if (!this.access.session()) {
      await this.access.refreshSession();
    }

    await this.load();
  }

  protected async load(): Promise<void> {
    if (!this.access.hasPortalAccess()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      if (this.access.isAdmin()) {
        const response = await this.apiService.getInvestorAdminDashboard();
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load investor administration dashboard');
        }
        this.adminDashboard.set(response.data);
        this.investorDashboard.set(null);
      } else {
        const response = await this.apiService.getInvestorDashboard();
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load investor dashboard');
        }
        this.investorDashboard.set(response.data);
        this.adminDashboard.set(null);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load investors');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async signIn(): Promise<void> {
    await this.access.login();
    await this.load();
  }

  protected editInvestor(investor: Investor): void {
    this.editingPubkey.set(investor.pubkey);
    this.investorForm.patchValue({
      pubkey: investor.pubkey,
      displayName: investor.displayName || '',
      investmentDollars: investor.investmentCents / 100,
      sharePercentage: investor.shareBasisPoints / 100,
      lightningAddress: investor.lightningAddress || '',
      status: investor.status
    });
  }

  protected clearInvestorForm(): void {
    this.editingPubkey.set(null);
    this.investorForm.reset({
      pubkey: '',
      displayName: '',
      investmentDollars: 0,
      sharePercentage: 0,
      lightningAddress: '',
      status: 'active'
    });
  }

  protected async saveInvestor(): Promise<void> {
    if (this.investorForm.invalid) {
      this.investorForm.markAllAsTouched();
      return;
    }

    this.savingInvestor.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const value = this.investorForm.getRawValue();
      const input: InvestorInput = {
        pubkey: value.pubkey || '',
        displayName: value.displayName || undefined,
        investmentCents: Math.round(Number(value.investmentDollars || 0) * 100),
        shareBasisPoints: Math.round(Number(value.sharePercentage || 0) * 100),
        lightningAddress: value.lightningAddress || undefined,
        status: value.status === 'inactive' ? 'inactive' : 'active'
      };

      const editingPubkey = this.editingPubkey();
      const response = editingPubkey
        ? await this.apiService.updateInvestor(editingPubkey, input)
        : await this.apiService.createInvestor(input);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to save investor');
      }

      this.success.set(editingPubkey ? 'Investor updated.' : 'Investor added.');
      this.clearInvestorForm();
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to save investor');
    } finally {
      this.savingInvestor.set(false);
    }
  }

  protected async deleteInvestor(investor: Investor): Promise<void> {
    this.error.set(null);
    this.success.set(null);

    try {
      const response = await this.apiService.deleteInvestor(investor.pubkey);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete investor');
      }

      this.success.set('Investor removed.');
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to delete investor');
    }
  }

  protected async calculateRevenueShare(): Promise<void> {
    if (this.periodForm.invalid) {
      this.periodForm.markAllAsTouched();
      return;
    }

    this.calculatingPeriod.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const value = this.periodForm.getRawValue();
      const response = await this.apiService.calculateRevenueShare({
        period: value.period || this.currentPeriod(),
        revenueShareBasisPoints: Math.round(Number(value.revenueSharePercentage || 0) * 100),
        notes: value.notes || undefined
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to calculate revenue share');
      }

      this.success.set(`Calculated ${response.data.payouts.length} investor payouts for ${response.data.period.period}.`);
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to calculate revenue share');
    } finally {
      this.calculatingPeriod.set(false);
    }
  }

  protected async payPayout(payout: InvestorPayout): Promise<void> {
    const invoice = this.payoutInvoices[payout.id]?.trim();
    if (!invoice) {
      this.error.set('Enter a Lightning invoice before paying this payout.');
      return;
    }

    this.payingPayoutId.set(payout.id);
    this.error.set(null);
    this.success.set(null);

    try {
      const amountSat = this.payoutAmountsSat[payout.id] || undefined;
      const response = await this.apiService.payInvestorPayout(payout.id, {
        lnInvoice: invoice,
        amountSat
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to pay investor');
      }

      this.success.set('Investor payout paid through Nostr Wallet Connect.');
      this.payoutInvoices[payout.id] = '';
      this.payoutAmountsSat[payout.id] = null;
      await this.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to pay investor');
    } finally {
      this.payingPayoutId.set(null);
    }
  }

  protected formatMoney(cents?: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format((cents || 0) / 100);
  }

  protected formatPercent(basisPoints?: number): string {
    return `${((basisPoints || 0) / 100).toFixed(2)}%`;
  }

  protected formatDate(timestamp?: number): string {
    if (!timestamp) {
      return 'Not paid';
    }

    return new Date(timestamp).toLocaleDateString();
  }

  protected shortPubkey(pubkey: string): string {
    return `${pubkey.slice(0, 10)}...${pubkey.slice(-6)}`;
  }
}
