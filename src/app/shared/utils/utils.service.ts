import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  /**
   * Format timestamp to human-readable date string
   */
  formatDate(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Format timestamp to relative time (e.g., "2 hours ago")
   */
  formatRelativeTime(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    
    const now = Date.now();
    const time = timestamp * 1000;
    const diffMs = now - time;
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  /**
   * Format public key for display (truncated with ellipsis)
   */
  formatPubkey(pubkey: string, length: number = 16): string {
    if (pubkey.length <= length) return pubkey;
    const half = Math.floor(length / 2);
    return `${pubkey.substring(0, half)}...${pubkey.substring(pubkey.length - half)}`;
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format price from cents to dollars
   */
  formatPrice(priceCents: number): string {
    return (priceCents / 100).toFixed(2);
  }

  /**
   * Format percentage with specified decimal places
   */
  formatPercentage(value: number, total: number, decimals: number = 1): string {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  }

  /**
   * Validate hex string format
   */
  isValidHex(hex: string, expectedLength?: number): boolean {
    const hexRegex = /^[a-fA-F0-9]+$/;
    if (!hexRegex.test(hex)) return false;
    if (expectedLength && hex.length !== expectedLength) return false;
    return true;
  }

  /**
   * Validate public key format (64 hex characters)
   */
  isValidPubkey(pubkey: string): boolean {
    return this.isValidHex(pubkey, 64);
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse JSON safely with error handling
   */
  safeJsonParse(json: string): { success: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(json);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON' 
      };
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Download data as file
   */
  downloadAsFile(data: any, filename: string, mimeType: string = 'application/json'): void {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Generate random ID
   */
  generateId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get status color class based on status string
   */
  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (['completed', 'success', 'active', 'ok', 'paid'].includes(statusLower)) {
      return 'success';
    }
    if (['failed', 'error', 'inactive', 'expired'].includes(statusLower)) {
      return 'error';
    }
    if (['in_progress', 'running', 'processing'].includes(statusLower)) {
      return 'warning';
    }
    if (['pending', 'scheduled', 'queued'].includes(statusLower)) {
      return 'info';
    }
    return 'default';
  }

  /**
   * Get emoji icon for common statuses
   */
  getStatusIcon(status: string): string {
    const statusLower = status.toLowerCase();
    if (['completed', 'success', 'active', 'ok', 'paid'].includes(statusLower)) {
      return '✅';
    }
    if (['failed', 'error', 'inactive', 'expired'].includes(statusLower)) {
      return '❌';
    }
    if (['in_progress', 'running', 'processing'].includes(statusLower)) {
      return '⏳';
    }
    if (['pending', 'scheduled', 'queued'].includes(statusLower)) {
      return '⏸️';
    }
    return '❓';
  }

  /**
   * Capitalize first letter of string
   */
  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert snake_case to Title Case
   */
  snakeToTitle(str: string): string {
    return str
      .split('_')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get current timestamp in seconds (Unix timestamp)
   */
  getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Check if timestamp is in the past
   */
  isExpired(timestamp?: number): boolean {
    if (!timestamp) return false;
    return timestamp * 1000 <= Date.now();
  }

  /**
   * Get time until expiration
   */
  getTimeUntilExpiration(timestamp?: number): string {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const expiration = timestamp * 1000;
    
    if (expiration <= now) return 'Expired';
    
    const diff = expiration - now;
    return this.formatDuration(diff);
  }
}
