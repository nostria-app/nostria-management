import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { InvestorAccessService } from '../../core/services/investor-access.service';
import {
  PaymentProcessorPrice,
  PaymentProcessorService
} from '../../core/services/payment-processor.service';
import {
  InvestorAdminDashboardResponse,
  InvestorDashboardResponse,
  InvestorPayout,
  ServiceStatus
} from '../../shared/models/api.models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  protected readonly access = inject(InvestorAccessService);
  private readonly apiService = inject(ApiService);
  private readonly paymentProcessor = inject(PaymentProcessorService);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly adminDashboard = signal<InvestorAdminDashboardResponse | null>(null);
  protected readonly investorDashboard = signal<InvestorDashboardResponse | null>(null);
  protected readonly serviceStatus = signal<ServiceStatus | null>(null);
  protected readonly btcPrice = signal<PaymentProcessorPrice | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.access.session()) {
      await this.access.refreshSession();
    }

    await this.refreshData();
  }

  protected async signIn(): Promise<void> {
    await this.access.login();
    await this.refreshData();
  }

  protected async refreshData(): Promise<void> {
    this.error.set(null);

    if (!this.access.hasPortalAccess()) {
      return;
    }

    this.isLoading.set(true);

    try {
      if (this.access.isAdmin()) {
        const [statusResponse, investorResponse] = await Promise.all([
          this.apiService.getServiceStatus(),
          this.apiService.getInvestorAdminDashboard()
        ]);

        if (statusResponse.success && statusResponse.data) {
          this.serviceStatus.set(statusResponse.data);
        }

        if (!investorResponse.success || !investorResponse.data) {
          throw new Error(investorResponse.message || 'Failed to load investor dashboard');
        }

        this.adminDashboard.set(investorResponse.data);
        this.investorDashboard.set(null);
      } else {
        const response = await this.apiService.getInvestorDashboard();
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to load investor dashboard');
        }

        this.investorDashboard.set(response.data);
        this.adminDashboard.set(null);
      }

      await this.loadBtcPrice();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadBtcPrice(): Promise<void> {
    try {
      const price = await this.paymentProcessor.getPrice({
        baseUrl: this.paymentProcessor.defaultBaseUrl
      });
      this.btcPrice.set(price);
    } catch {
      this.btcPrice.set(null);
    }
  }

  protected formatMoney(cents?: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format((cents || 0) / 100);
  }

  protected formatNumber(value?: number): string {
    return new Intl.NumberFormat('en-US').format(value || 0);
  }

  protected formatSats(sats?: number | null): string {
    return `${this.formatNumber(sats || 0)} sats`;
  }

  protected formatSatsWithUsdEstimate(sats?: number | null): string {
    const satsLabel = this.formatSats(sats);
    const usdEstimate = this.formatUsdEstimateForSats(sats);

    return usdEstimate ? `${satsLabel} · ${usdEstimate}` : satsLabel;
  }

  protected formatPayoutAmount(payout: InvestorPayout): string {
    if (payout.amountSat !== undefined && payout.amountSat !== null) {
      return this.formatSatsWithUsdEstimate(payout.amountSat);
    }

    return 'Sats unavailable';
  }

  private formatUsdEstimateForSats(sats?: number | null): string {
    const usd = this.btcPrice()?.usd;
    if (!usd || !sats) {
      return '';
    }

    return `~${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format((sats / 100_000_000) * usd)}`;
  }

  protected formatPercent(partsPerMillion?: number): string {
    return `${((partsPerMillion || 0) / 10000).toFixed(4)}%`;
  }

  protected formatUptime(seconds?: number): string {
    if (!seconds) {
      return 'Unknown';
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  }

  protected displayPayoutInvestor(payout: InvestorPayout): string {
    if (payout.investor?.displayName) {
      return payout.investor.displayName;
    }

    if (payout.investor?.id) {
      return payout.investor.id;
    }

    if (payout.investorId) {
      return payout.investorId;
    }

    if (payout.investorPubkey) {
      return `${payout.investorPubkey.slice(0, 10)}...${payout.investorPubkey.slice(-6)}`;
    }

    return 'Unknown investor';
  }
}
