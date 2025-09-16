import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Customer, Server } from '../../shared/models/api.models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  protected readonly customerCount = signal(0);
  protected readonly activeCustomers = signal(0);
  protected readonly serverCount = signal(0);
  protected readonly runningServers = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly Math = Math;

  constructor(private apiService: ApiService) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [customersResponse, serversResponse] = await Promise.all([
        this.apiService.getCustomers(),
        this.apiService.getServers()
      ]);

      if (customersResponse.success && customersResponse.data) {
        const customers = customersResponse.data;
        this.customerCount.set(customers.length);
        this.activeCustomers.set(customers.filter((c: Customer) => c.status === 'active').length);
      } else {
        this.error.set(customersResponse.message || 'Failed to load customers');
      }

      if (serversResponse.success && serversResponse.data) {
        const servers = serversResponse.data;
        this.serverCount.set(servers.length);
        this.runningServers.set(servers.filter((s: Server) => s.status === 'running').length);
      } else {
        this.error.set(serversResponse.message || 'Failed to load servers');
      }
    } catch (error) {
      this.error.set('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async refreshData() {
    await this.loadDashboardData();
  }
}
