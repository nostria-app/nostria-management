import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Server } from '../../../shared/models/api.models';

@Component({
  selector: 'app-server-list',
  imports: [CommonModule],
  templateUrl: './server-list.html',
  styleUrl: './server-list.scss'
})
export class ServerList implements OnInit {
  protected readonly servers = signal<Server[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  async ngOnInit() {
    await this.loadServers();
  }

  private async loadServers() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.apiService.getServers();
      
      if (response.success && response.data) {
        this.servers.set(response.data);
      } else {
        this.error.set(response.message || 'Failed to load servers');
      }
    } catch (error) {
      this.error.set('Failed to load servers');
      console.error('Server loading error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async refreshServers() {
    await this.loadServers();
  }

  protected getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'running': 'status-running',
      'stopped': 'status-stopped',
      'maintenance': 'status-maintenance',
      'error': 'status-error'
    };
    return statusClasses[status] || 'status-unknown';
  }

  protected getTypeIcon(type: string): string {
    const typeIcons: Record<string, string> = {
      'web': '🌐',
      'database': '🗄️',
      'cache': '⚡',
      'storage': '💾'
    };
    return typeIcons[type] || '🖥️';
  }

  protected formatUptime(uptime: number): string {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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
