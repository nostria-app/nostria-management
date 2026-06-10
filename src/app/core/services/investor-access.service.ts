import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { InvestorSession } from '../../shared/models/api.models';

@Injectable({
  providedIn: 'root'
})
export class InvestorAccessService {
  private apiService = inject(ApiService);

  readonly session = signal<InvestorSession | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.role === 'admin');
  readonly isInvestor = computed(() => this.session()?.role === 'investor');
  readonly hasPortalAccess = computed(() => this.isAdmin() || this.isInvestor());

  async login(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.apiService.connectNostrExtension();
      const response = await this.apiService.getInvestorSession();

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Unable to resolve portal access');
      }

      if (response.data.role === 'none') {
        this.session.set(response.data);
        this.error.set('This Nostr account does not have management or investor access.');
        return;
      }

      this.session.set(response.data);
    } catch (error) {
      this.session.set(null);
      this.error.set(error instanceof Error ? error.message : 'Failed to sign in');
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshSession(): Promise<void> {
    if (!this.apiService.getNostrAuthState().isAuthenticated) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.apiService.getInvestorSession();
      if (response.success && response.data) {
        this.session.set(response.data);
      } else {
        this.error.set(response.message || 'Unable to refresh session');
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to refresh session');
    } finally {
      this.isLoading.set(false);
    }
  }

  logout(): void {
    this.apiService.disconnectNostrExtension();
    this.session.set(null);
    this.error.set(null);
  }
}
