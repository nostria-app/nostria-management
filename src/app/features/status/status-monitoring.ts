import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../shared/utils/utils.service';
import { ServiceStatus, HealthStatus } from '../../shared/models/api.models';

@Component({
  selector: 'app-status-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-monitoring.html',
  styleUrl: './status-monitoring.scss'
})
export class StatusMonitoring implements OnInit, OnDestroy {
  private apiService = new ApiService();
  private utils = new UtilsService();
  private refreshInterval?: number;

  // Signals for reactive state management
  serviceStatus = signal<ServiceStatus | null>(null);
  healthStatus = signal<HealthStatus | null>(null);
  
  statusLoading = signal(false);
  healthLoading = signal(false);
  
  statusError = signal<string | null>(null);
  healthError = signal<string | null>(null);

  // Auto-refresh settings
  autoRefresh = signal(false);
  refreshIntervalSeconds = signal(30);
  lastUpdated = signal<number | null>(null);

  // System metrics (simulated - would come from real monitoring)
  systemMetrics = signal({
    cpu: 45,
    memory: 68,
    disk: 72,
    network: 23
  });

  // Service endpoints status (simulated)
  endpointStatus = signal([
    { endpoint: '/status', status: 'ok', responseTime: 12, lastCheck: Date.now() },
    { endpoint: '/status/health', status: 'ok', responseTime: 8, lastCheck: Date.now() },
    { endpoint: '/accounts', status: 'ok', responseTime: 156, lastCheck: Date.now() },
    { endpoint: '/payments', status: 'ok', responseTime: 89, lastCheck: Date.now() },
    { endpoint: '/notifications', status: 'warning', responseTime: 2340, lastCheck: Date.now() },
    { endpoint: '/backups', status: 'ok', responseTime: 234, lastCheck: Date.now() },
    { endpoint: '/settings', status: 'ok', responseTime: 67, lastCheck: Date.now() }
  ]);

  ngOnInit() {
    this.loadServiceStatus();
    this.loadHealthStatus();
    this.startSystemMetricsSimulation();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.stopSystemMetricsSimulation();
  }

  getSystemMetricValue(metricKey: string): number {
    const metrics = this.systemMetrics() as any;
    return metrics[metricKey] || 0;
  }

  getAverageResponseTime(): number {
    const endpoints = this.endpointStatus();
    if (endpoints.length === 0) return 0;
    const total = endpoints.reduce((sum, ep) => sum + ep.responseTime, 0);
    return Math.round(total / endpoints.length);
  }

  getHealthyEndpointsCount(): number {
    return this.endpointStatus().filter(ep => ep.status === 'ok').length;
  }

  getTotalEndpointsCount(): number {
    return this.endpointStatus().length;
  }

  async loadServiceStatus() {
    this.statusLoading.set(true);
    this.statusError.set(null);

    try {
      const response = await this.apiService.getServiceStatus();
      if (response.success && response.data) {
        this.serviceStatus.set(response.data);
        this.lastUpdated.set(Date.now());
      } else {
        this.statusError.set(response.message || 'Failed to load service status');
      }
    } catch (error) {
      this.statusError.set('Network error loading service status');
    } finally {
      this.statusLoading.set(false);
    }
  }

  async loadHealthStatus() {
    this.healthLoading.set(true);
    this.healthError.set(null);

    try {
      const response = await this.apiService.getHealthStatus();
      if (response.success && response.data) {
        this.healthStatus.set(response.data);
      } else {
        this.healthError.set(response.message || 'Failed to load health status');
      }
    } catch (error) {
      this.healthError.set('Network error loading health status');
    } finally {
      this.healthLoading.set(false);
    }
  }

  async refreshAll() {
    await Promise.all([
      this.loadServiceStatus(),
      this.loadHealthStatus()
    ]);
    this.refreshEndpointStatus();
  }

  toggleAutoRefresh() {
    const isEnabled = this.autoRefresh();
    if (isEnabled) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
    this.autoRefresh.set(!isEnabled);
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshInterval = window.setInterval(() => {
      this.refreshAll();
    }, this.refreshIntervalSeconds() * 1000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  setRefreshInterval(seconds: number) {
    this.refreshIntervalSeconds.set(seconds);
    if (this.autoRefresh()) {
      this.startAutoRefresh(); // Restart with new interval
    }
  }

  refreshEndpointStatus() {
    // Simulate endpoint status checks with random response times
    const currentStatus = this.endpointStatus();
    const updatedStatus = currentStatus.map(endpoint => ({
      ...endpoint,
      responseTime: Math.floor(Math.random() * 500) + 10, // 10-510ms
      status: Math.random() > 0.1 ? 'ok' : (Math.random() > 0.5 ? 'warning' : 'error'),
      lastCheck: Date.now()
    }));
    this.endpointStatus.set(updatedStatus);
  }

  private systemMetricsInterval?: number;

  startSystemMetricsSimulation() {
    this.systemMetricsInterval = window.setInterval(() => {
      const current = this.systemMetrics();
      this.systemMetrics.set({
        cpu: Math.max(0, Math.min(100, current.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, current.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(0, Math.min(100, current.disk + (Math.random() - 0.5) * 2)),
        network: Math.max(0, Math.min(100, current.network + (Math.random() - 0.5) * 15))
      });
    }, 2000);
  }

  stopSystemMetricsSimulation() {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = undefined;
    }
  }

  formatDate(timestamp?: number): string {
    return this.utils.formatDate(timestamp);
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatBytes(bytes: string): string {
    const num = parseFloat(bytes);
    if (isNaN(num)) return bytes;
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = num;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ok':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'ok':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  }

  getMetricColor(value: number, type: string): string {
    let threshold = 80;
    if (type === 'network') threshold = 90; // Network can be more variable
    
    if (value >= threshold) return '#ef4444';
    if (value >= threshold * 0.7) return '#f59e0b';
    return '#10b981';
  }

  getResponseTimeColor(responseTime: number): string {
    if (responseTime > 1000) return '#ef4444';
    if (responseTime > 500) return '#f59e0b';
    return '#10b981';
  }

  exportStatus() {
    const statusData = {
      serviceStatus: this.serviceStatus(),
      healthStatus: this.healthStatus(),
      systemMetrics: this.systemMetrics(),
      endpointStatus: this.endpointStatus(),
      timestamp: Date.now(),
      lastUpdated: this.lastUpdated()
    };

    this.utils.downloadAsFile(
      statusData,
      `system-status-${Date.now()}.json`,
      'application/json'
    );
  }

  getOverallStatus(): { status: string; color: string; icon: string } {
    const health = this.healthStatus();
    const endpoints = this.endpointStatus();
    
    if (!health || health.status !== 'ok') {
      return { status: 'Unhealthy', color: '#ef4444', icon: '❌' };
    }
    
    const hasErrors = endpoints.some(ep => ep.status === 'error');
    const hasWarnings = endpoints.some(ep => ep.status === 'warning');
    
    if (hasErrors) {
      return { status: 'Degraded', color: '#ef4444', icon: '⚠️' };
    }
    
    if (hasWarnings) {
      return { status: 'Warning', color: '#f59e0b', icon: '⚠️' };
    }
    
    return { status: 'Healthy', color: '#10b981', icon: '✅' };
  }
}
