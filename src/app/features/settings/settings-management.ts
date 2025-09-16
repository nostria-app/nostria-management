import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../shared/utils/utils.service';
import {
  UserSettingsRequest, UserSettings, AdminSetUserSettingsRequest,
  ReleaseChannelUpdateRequest, ReleaseChannel
} from '../../shared/models/api.models';

@Component({
  selector: 'app-settings-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-management.html',
  styleUrl: './settings-management.scss'
})
export class SettingsManagement implements OnInit {
  private apiService = new ApiService();
  private fb = new FormBuilder();
  private utils = new UtilsService();

  // Signals for reactive state management
  currentSettings = signal<UserSettings | null>(null);
  settingsLoading = signal(false);
  settingsError = signal<string | null>(null);

  isUpdatingSettings = signal(false);
  updateSettingsError = signal<string | null>(null);
  updateSettingsSuccess = signal(false);

  releaseChannels = signal<ReleaseChannel[]>([]);
  channelsLoading = signal(false);
  channelsError = signal<string | null>(null);

  isUpdatingChannel = signal(false);
  updateChannelError = signal<string | null>(null);
  updateChannelSuccess = signal(false);

  // Admin functions
  isAdminOperation = signal(false);
  adminError = signal<string | null>(null);
  adminSuccess = signal(false);

  // Forms
  settingsForm: FormGroup;
  adminSettingsForm: FormGroup;
  releaseChannelForm: FormGroup;
  getUserSettingsForm: FormGroup;

  // Available options
  tierOptions = [
    { value: 'free', label: 'Free' },
    { value: 'premium', label: 'Premium' },
    { value: 'premium_plus', label: 'Premium Plus' }
  ];

  channelOptions = [
    { value: 'stable', label: 'Stable' },
    { value: 'beta', label: 'Beta' },
    { value: 'alpha', label: 'Alpha' },
    { value: 'dev', label: 'Development' }
  ];

  constructor() {
    this.settingsForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      tier: ['free', [Validators.required]],
      displayName: [''],
      bio: [''],
      picture: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      banner: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      nip05: ['', [Validators.email]],
      lud16: ['', [Validators.email]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });

    this.adminSettingsForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      targetPubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      tier: ['free', [Validators.required]],
      displayName: [''],
      bio: [''],
      picture: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      banner: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      nip05: ['', [Validators.email]],
      lud16: ['', [Validators.email]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });

    this.releaseChannelForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      releaseChannel: ['stable', [Validators.required]]
    });

    this.getUserSettingsForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]]
    });
  }

  ngOnInit() {
    this.loadReleaseChannels();
  }

  async loadUserSettings() {
    if (this.getUserSettingsForm.invalid) return;

    this.settingsLoading.set(true);
    this.settingsError.set(null);
    this.currentSettings.set(null);

    try {
      const pubkey = this.getUserSettingsForm.get('pubkey')?.value;
      const response = await this.apiService.getUserSettings(pubkey);
      if (response.success && response.data) {
        this.currentSettings.set(response.data);
        // Populate the settings form with current values
        this.settingsForm.patchValue({
          pubkey: pubkey,
          tier: response.data.tier || 'free',
          displayName: response.data.displayName || '',
          bio: response.data.bio || '',
          picture: response.data.picture || '',
          banner: response.data.banner || '',
          nip05: response.data.nip05 || '',
          lud16: response.data.lud16 || '',
          website: response.data.website || ''
        });
      } else {
        this.settingsError.set(response.message || 'Failed to load user settings');
      }
    } catch (error) {
      this.settingsError.set('Network error loading settings');
    } finally {
      this.settingsLoading.set(false);
    }
  }

  async updateUserSettings() {
    if (this.settingsForm.invalid) return;

    this.isUpdatingSettings.set(true);
    this.updateSettingsError.set(null);
    this.updateSettingsSuccess.set(false);

    try {
      const formValue = this.settingsForm.value;
      const request: UserSettingsRequest = {
        pubkey: formValue.pubkey,
        tier: formValue.tier,
        displayName: formValue.displayName || undefined,
        bio: formValue.bio || undefined,
        picture: formValue.picture || undefined,
        banner: formValue.banner || undefined,
        nip05: formValue.nip05 || undefined,
        lud16: formValue.lud16 || undefined,
        website: formValue.website || undefined
      };

      const response = await this.apiService.updateUserSettings(request);
      if (response.success) {
        this.updateSettingsSuccess.set(true);
        // Reload the settings to show updated values
        this.loadUserSettings();
      } else {
        this.updateSettingsError.set(response.message || 'Failed to update settings');
      }
    } catch (error) {
      this.updateSettingsError.set('Network error updating settings');
    } finally {
      this.isUpdatingSettings.set(false);
    }
  }

  async adminUpdateUserSettings() {
    if (this.adminSettingsForm.invalid) return;

    this.isAdminOperation.set(true);
    this.adminError.set(null);
    this.adminSuccess.set(false);

    try {
      const formValue = this.adminSettingsForm.value;
      const request: AdminSetUserSettingsRequest = {
        pubkey: formValue.pubkey,
        targetPubkey: formValue.targetPubkey,
        tier: formValue.tier,
        displayName: formValue.displayName || undefined,
        bio: formValue.bio || undefined,
        picture: formValue.picture || undefined,
        banner: formValue.banner || undefined,
        nip05: formValue.nip05 || undefined,
        lud16: formValue.lud16 || undefined,
        website: formValue.website || undefined
      };

      const response = await this.apiService.adminSetUserSettings(request);
      if (response.success) {
        this.adminSuccess.set(true);
        this.adminSettingsForm.reset({
          pubkey: '',
          targetPubkey: '',
          tier: 'free'
        });
      } else {
        this.adminError.set(response.message || 'Failed to update user settings');
      }
    } catch (error) {
      this.adminError.set('Network error updating user settings');
    } finally {
      this.isAdminOperation.set(false);
    }
  }

  async loadReleaseChannels() {
    this.channelsLoading.set(true);
    this.channelsError.set(null);

    try {
      const response = await this.apiService.getReleaseChannels();
      if (response.success && response.data) {
        this.releaseChannels.set(response.data);
      } else {
        this.channelsError.set(response.message || 'Failed to load release channels');
      }
    } catch (error) {
      this.channelsError.set('Network error loading release channels');
    } finally {
      this.channelsLoading.set(false);
    }
  }

  async updateReleaseChannel() {
    if (this.releaseChannelForm.invalid) return;

    this.isUpdatingChannel.set(true);
    this.updateChannelError.set(null);
    this.updateChannelSuccess.set(false);

    try {
      const formValue = this.releaseChannelForm.value;
      const request: ReleaseChannelUpdateRequest = {
        pubkey: formValue.pubkey,
        releaseChannel: formValue.releaseChannel
      };

      const response = await this.apiService.updateReleaseChannel(request);
      if (response.success) {
        this.updateChannelSuccess.set(true);
        this.loadReleaseChannels();
      } else {
        this.updateChannelError.set(response.message || 'Failed to update release channel');
      }
    } catch (error) {
      this.updateChannelError.set('Network error updating release channel');
    } finally {
      this.isUpdatingChannel.set(false);
    }
  }

  formatPubkey(pubkey: string): string {
    return this.utils.formatPubkey(pubkey);
  }

  copyToClipboard(text: string) {
    this.utils.copyToClipboard(text);
  }

  formatDate(timestamp?: number): string {
    return this.utils.formatDate(timestamp);
  }

  clearResults() {
    this.updateSettingsSuccess.set(false);
    this.updateSettingsError.set(null);
    this.adminSuccess.set(false);
    this.adminError.set(null);
    this.updateChannelSuccess.set(false);
    this.updateChannelError.set(null);
  }

  exportSettings() {
    const settings = this.currentSettings();
    if (settings) {
      this.utils.downloadAsFile(
        settings,
        `user-settings-${Date.now()}.json`,
        'application/json'
      );
    }
  }

  exportReleaseChannels() {
    const channels = this.releaseChannels();
    this.utils.downloadAsFile(
      channels,
      `release-channels-${Date.now()}.json`,
      'application/json'
    );
  }

  resetForm(formName: string) {
    switch (formName) {
      case 'settings':
        this.settingsForm.reset({
          pubkey: '',
          tier: 'free'
        });
        break;
      case 'admin':
        this.adminSettingsForm.reset({
          pubkey: '',
          targetPubkey: '',
          tier: 'free'
        });
        break;
      case 'channel':
        this.releaseChannelForm.reset({
          pubkey: '',
          releaseChannel: 'stable'
        });
        break;
      case 'getUser':
        this.getUserSettingsForm.reset();
        this.currentSettings.set(null);
        break;
    }
    this.clearResults();
  }

  isValidUrl(url?: string): boolean {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getTierBadgeColor(tier: string): string {
    switch (tier) {
      case 'premium_plus':
        return '#8b5cf6';
      case 'premium':
        return '#3b82f6';
      case 'free':
      default:
        return '#6b7280';
    }
  }

  getChannelBadgeColor(channel: string): string {
    switch (channel) {
      case 'dev':
        return '#ef4444';
      case 'alpha':
        return '#f59e0b';
      case 'beta':
        return '#3b82f6';
      case 'stable':
      default:
        return '#10b981';
    }
  }
}
