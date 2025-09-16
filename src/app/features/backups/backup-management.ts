import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  BackupJobResponse, CreateBackupJobRequest, BackupType, BackupJobStatus
} from '../../shared/models/api.models';

@Component({
  selector: 'app-backup-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './backup-management.html',
  styleUrl: './backup-management.scss'
})
export class BackupManagement implements OnInit {
  private apiService = new ApiService();
  private fb = new FormBuilder();

  // Signals for reactive state management
  backupJobs = signal<BackupJobResponse[]>([]);
  isLoadingJobs = signal(false);
  jobsError = signal<string | null>(null);

  isCreatingBackup = signal(false);
  createBackupError = signal<string | null>(null);
  createBackupSuccess = signal(false);

  selectedJob = signal<BackupJobResponse | null>(null);
  isLoadingJobDetails = signal(false);
  jobDetailsError = signal<string | null>(null);

  authToken = ''; // TODO: Implement proper auth token management

  // Reactive form
  createBackupForm: FormGroup;

  // Backup type options
  backupTypes: { value: BackupType; label: string; description: string }[] = [
    { value: 'full', label: 'Full Backup', description: 'Complete backup of all user data' },
    { value: 'incremental', label: 'Incremental Backup', description: 'Only changes since last backup' },
    { value: 'selective', label: 'Selective Backup', description: 'Backup selected data only' }
  ];

  constructor() {
    this.createBackupForm = this.fb.group({
      backupType: ['full', [Validators.required]],
      scheduledAt: [''],
      description: ['']
    });
  }

  get minDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }

  get objectKeys() {
    return Object.keys;
  }

  ngOnInit() {
    this.loadBackupJobs();
  }

  async loadBackupJobs() {
    if (!this.authToken) {
      this.jobsError.set('Authentication required');
      return;
    }

    this.isLoadingJobs.set(true);
    this.jobsError.set(null);

    try {
      const response = await this.apiService.getBackupJobs(this.authToken, 50);
      if (response.success && response.data) {
        this.backupJobs.set(response.data.jobs);
      } else {
        this.jobsError.set(response.message || 'Failed to load backup jobs');
      }
    } catch (error) {
      this.jobsError.set('Network error loading backup jobs');
    } finally {
      this.isLoadingJobs.set(false);
    }
  }

  async createBackup() {
    if (this.createBackupForm.invalid || !this.authToken) return;

    this.isCreatingBackup.set(true);
    this.createBackupError.set(null);
    this.createBackupSuccess.set(false);

    try {
      const formValue = this.createBackupForm.value;
      const request: CreateBackupJobRequest = {
        backupType: formValue.backupType,
        scheduledAt: formValue.scheduledAt ? new Date(formValue.scheduledAt).getTime() / 1000 : undefined,
        metadata: formValue.description ? { description: formValue.description } : undefined
      };

      const response = await this.apiService.createBackupJob(this.authToken, request);
      if (response.success) {
        this.createBackupSuccess.set(true);
        this.createBackupForm.reset({ backupType: 'full' });
        this.loadBackupJobs(); // Refresh the list
      } else {
        this.createBackupError.set(response.message || 'Failed to create backup job');
      }
    } catch (error) {
      this.createBackupError.set('Network error creating backup job');
    } finally {
      this.isCreatingBackup.set(false);
    }
  }

  async loadJobDetails(jobId: string) {
    if (!this.authToken) return;

    this.isLoadingJobDetails.set(true);
    this.jobDetailsError.set(null);

    try {
      const response = await this.apiService.getBackupJob(this.authToken, jobId);
      if (response.success && response.data) {
        this.selectedJob.set(response.data);
      } else {
        this.jobDetailsError.set(response.message || 'Failed to load job details');
      }
    } catch (error) {
      this.jobDetailsError.set('Network error loading job details');
    } finally {
      this.isLoadingJobDetails.set(false);
    }
  }

  selectJob(job: BackupJobResponse) {
    this.selectedJob.set(job);
    this.loadJobDetails(job.id);
  }

  closeJobDetails() {
    this.selectedJob.set(null);
  }

  downloadBackup(job: BackupJobResponse) {
    if (job.resultUrl) {
      window.open(job.resultUrl, '_blank');
    }
  }

  formatDate(timestamp?: number): string {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStatusColor(status: BackupJobStatus): string {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'in_progress': return 'warning';
      case 'pending': case 'scheduled': return 'info';
      case 'expired': return 'muted';
      default: return 'default';
    }
  }

  getStatusIcon(status: BackupJobStatus): string {
    switch (status) {
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'in_progress': return '⏳';
      case 'pending': return '⏸';
      case 'scheduled': return '📅';
      case 'expired': return '⏰';
      default: return '❓';
    }
  }

  getTypeIcon(type: BackupType): string {
    switch (type) {
      case 'full': return '💾';
      case 'incremental': return '📦';
      case 'selective': return '📋';
      default: return '📁';
    }
  }

  refreshJobs() {
    this.loadBackupJobs();
  }

  isJobDownloadable(job: BackupJobResponse): boolean {
    return job.status === 'completed' && !!job.resultUrl && 
           (!job.expires || job.expires * 1000 > Date.now());
  }

  isJobExpired(job: BackupJobResponse): boolean {
    return job.expires ? job.expires * 1000 <= Date.now() : false;
  }
}
