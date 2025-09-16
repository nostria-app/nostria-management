import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Customer } from '../../../shared/models/api.models';

@Component({
  selector: 'app-customer-list',
  imports: [CommonModule],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss'
})
export class CustomerList implements OnInit {
  protected readonly customers = signal<Customer[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  async ngOnInit() {
    await this.loadCustomers();
  }

  private async loadCustomers() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.apiService.getCustomers();
      
      if (response.success && response.data) {
        this.customers.set(response.data);
      } else {
        this.error.set(response.message || 'Failed to load customers');
      }
    } catch (error) {
      this.error.set('Failed to load customers');
      console.error('Customer loading error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async refreshCustomers() {
    await this.loadCustomers();
  }

  protected getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'active': 'status-active',
      'inactive': 'status-inactive',
      'suspended': 'status-suspended'
    };
    return statusClasses[status] || 'status-unknown';
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
