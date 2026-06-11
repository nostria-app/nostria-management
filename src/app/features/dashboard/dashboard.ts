import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { InvestorAccessService } from '../../core/services/investor-access.service';
import {
  InvestorAdminDashboardResponse,
  InvestorDashboardResponse,
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

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly adminDashboard = signal<InvestorAdminDashboardResponse | null>(null);
  protected readonly investorDashboard = signal<InvestorDashboardResponse | null>(null);
  protected readonly serviceStatus = signal<ServiceStatus | null>(null);

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
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected formatMoney(cents?: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format((cents || 0) / 100);
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
}
