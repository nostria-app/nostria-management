import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PaymentProcessorAccessConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PaymentProcessorStatus {
  status?: string;
  chain?: string;
  blockHeight?: number;
  error?: string;
}

export interface PaymentProcessorPrice {
  usd?: number;
  eur?: number;
  gbp?: number;
  error?: string;
}

export interface PaymentProcessorBalance {
  balanceSat?: number;
  feeCreditSat?: number;
  [key: string]: unknown;
}

export interface PaymentProcessorRecord {
  paymentHash?: string;
  hash?: string;
  preimage?: string;
  externalId?: string;
  description?: string;
  invoice?: string;
  isPaid?: boolean;
  receivedSat?: number;
  amountSat?: number;
  feesSat?: number;
  completedAt?: number;
  createdAt?: number;
  type?: 'incoming' | 'outgoing';
  [key: string]: unknown;
}

export interface PaymentProcessorPayInvoiceResult {
  paymentHash?: string;
  preimage?: string;
  routingFeeSat?: number;
  amountSat?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class PaymentProcessorService {
  readonly defaultBaseUrl = environment.paymentProcessorBaseUrl || 'https://pay.ariton.app';

  async getStatus(config: Pick<PaymentProcessorAccessConfig, 'baseUrl'>): Promise<PaymentProcessorStatus> {
    return this.get<PaymentProcessorStatus>(config.baseUrl, '/status');
  }

  async getPrice(config: Pick<PaymentProcessorAccessConfig, 'baseUrl'>): Promise<PaymentProcessorPrice> {
    return this.get<PaymentProcessorPrice>(config.baseUrl, '/price');
  }

  async getBalance(config: PaymentProcessorAccessConfig): Promise<PaymentProcessorBalance> {
    return this.get<PaymentProcessorBalance>(config.baseUrl, '/balance', { apikey: config.apiKey });
  }

  async listIncoming(config: PaymentProcessorAccessConfig, all = true, externalId = ''): Promise<PaymentProcessorRecord[]> {
    const response = await this.get<unknown>(config.baseUrl, '/payments/incoming', {
      apikey: config.apiKey,
      all: String(all),
      externalId,
    });

    return this.normalizePaymentList(response, 'incoming');
  }

  async listOutgoing(config: PaymentProcessorAccessConfig, all = true, externalId = ''): Promise<PaymentProcessorRecord[]> {
    const response = await this.get<unknown>(config.baseUrl, '/payments/outgoing', {
      apikey: config.apiKey,
      all: String(all),
      externalId,
    });

    return this.normalizePaymentList(response, 'outgoing');
  }

  async decodeInvoice(baseUrl: string, invoice: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(baseUrl, '/decodeinvoice', { invoice });
  }

  async payInvoice(config: PaymentProcessorAccessConfig, invoice: string): Promise<PaymentProcessorPayInvoiceResult> {
    const body = new URLSearchParams({
      apikey: config.apiKey,
      invoice,
    });

    const response = await fetch(this.url(config.baseUrl, '/payinvoice'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });

    return this.parseResponse<PaymentProcessorPayInvoiceResult>(response);
  }

  private async get<T>(baseUrl: string, path: string, params: Record<string, string> = {}): Promise<T> {
    const response = await fetch(this.url(baseUrl, path, params), {
      headers: {
        Accept: 'application/json',
      },
    });

    return this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const message = this.extractError(json) || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (json?.error) {
      throw new Error(String(json.error));
    }

    return json as T;
  }

  private extractError(value: unknown): string | undefined {
    if (value && typeof value === 'object' && 'error' in value) {
      return String((value as { error: unknown }).error);
    }

    return undefined;
  }

  private normalizePaymentList(value: unknown, type: 'incoming' | 'outgoing'): PaymentProcessorRecord[] {
    const records = Array.isArray(value)
      ? value
      : value && typeof value === 'object' && Array.isArray((value as { payments?: unknown }).payments)
        ? (value as { payments: unknown[] }).payments
        : [];

    return records.map(record => ({
      ...(record as PaymentProcessorRecord),
      type,
    }));
  }

  private url(baseUrl: string, path: string, params: Record<string, string> = {}): string {
    const url = new URL(path, this.normalizeBaseUrl(baseUrl));
    Object.entries(params)
      .filter(([, value]) => value !== '')
      .forEach(([key, value]) => url.searchParams.set(key, value));

    return url.toString();
  }

  private normalizeBaseUrl(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
