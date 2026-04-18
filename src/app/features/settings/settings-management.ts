import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../shared/utils/utils.service';
import {
  UserSettingsRequest, UserSettings, AdminSetUserSettingsRequest,
  GrokAdminConfig
} from '../../shared/models/api.models';

const DEFAULT_GROK_ADMIN_CONFIG: GrokAdminConfig = {
  enabled: true,
  allowResponses: true,
  allowImages: true,
  allowServerSideTools: false,
  guardrails: {
    responseSafetyMarginPercent: 25,
  },
  defaults: {
    responseModel: 'grok-4-1-fast-reasoning',
    imageModel: 'grok-imagine-image',
  },
  topUp: {
    minimumCents: 100,
    maximumCents: 50000,
    defaultOptionsCents: [500, 1000, 2500],
    nanosUsdPerCent: 10000000,
  },
  quotas: {
    basic: {
      includedImagesPerMonth: 5,
    },
    premium: {
      includedImagesPerMonth: 10,
    },
    premiumPlus: {
      includedImagesPerMonth: 30,
      dailyImageLimit: 5,
    },
  },
  pricing: {
    responses: {
      'grok-4.20-0309-reasoning': {
        enabled: true,
        inputTokenNanosUsd: 2000,
        outputTokenNanosUsd: 6000,
      },
      'grok-4.20-0309-non-reasoning': {
        enabled: true,
        inputTokenNanosUsd: 2000,
        outputTokenNanosUsd: 6000,
      },
      'grok-4.20-multi-agent-0309': {
        enabled: true,
        inputTokenNanosUsd: 2000,
        outputTokenNanosUsd: 6000,
      },
      'grok-4-1-fast-reasoning': {
        enabled: true,
        inputTokenNanosUsd: 200,
        outputTokenNanosUsd: 500,
      },
      'grok-4-1-fast-non-reasoning': {
        enabled: true,
        inputTokenNanosUsd: 200,
        outputTokenNanosUsd: 500,
      },
    },
    images: {
      'grok-imagine-image': {
        enabled: true,
        imageNanosUsd: 20000000,
        includedQuotaEligible: true,
      },
      'grok-imagine-image-pro': {
        enabled: true,
        imageNanosUsd: 70000000,
        includedQuotaEligible: false,
      },
    },
  },
};

@Component({
  selector: 'app-settings-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings-management.html',
  styleUrl: './settings-management.scss'
})
export class SettingsManagement implements OnInit {
  private fb = new FormBuilder();
  private utils = new UtilsService();

  // Signals for reactive state management
  currentSettings = signal<UserSettings | null>(null);
  settingsLoading = signal(false);
  settingsError = signal<string | null>(null);

  isUpdatingSettings = signal(false);
  updateSettingsError = signal<string | null>(null);
  updateSettingsSuccess = signal(false);

  grokConfig = signal<GrokAdminConfig | null>(null);
  grokConfigLoading = signal(false);
  grokConfigError = signal<string | null>(null);
  grokConfigSaveError = signal<string | null>(null);
  grokConfigSaveSuccess = signal(false);
  isSavingGrokConfig = signal(false);

  // Admin functions
  isAdminOperation = signal(false);
  adminError = signal<string | null>(null);
  adminSuccess = signal(false);

  // Forms
  settingsForm: FormGroup;
  adminSettingsForm: FormGroup;
  getUserSettingsForm: FormGroup;
  grokConfigForm: FormGroup;

  // Available options
  tierOptions = [
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'premium', label: 'Premium' },
    { value: 'premium_plus', label: 'Premium Plus' }
  ];

  constructor(private apiService: ApiService) {
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

    this.getUserSettingsForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]]
    });

    this.grokConfigForm = this.fb.group({
      enabled: [true],
      allowResponses: [true],
      allowImages: [true],
      allowServerSideTools: [false],
      responseSafetyMarginPercent: [25, [Validators.required, Validators.min(0), Validators.max(500)]],
      responseModel: ['grok-4-1-fast-reasoning', [Validators.required]],
      imageModel: ['grok-imagine-image', [Validators.required]],
      minimumCents: [100, [Validators.required, Validators.min(1)]],
      maximumCents: [50000, [Validators.required, Validators.min(1)]],
      defaultOptionsCents: ['500, 1000, 2500', [Validators.required]],
      nanosUsdPerCent: [10000000, [Validators.required, Validators.min(1)]],
      basicIncludedImagesPerMonth: [5, [Validators.required, Validators.min(0)]],
      premiumIncludedImagesPerMonth: [10, [Validators.required, Validators.min(0)]],
      premiumPlusIncludedImagesPerMonth: [30, [Validators.required, Validators.min(0)]],
      premiumPlusDailyImageLimit: [5, [Validators.required, Validators.min(1)]],
      responsePricingJson: ['', [Validators.required]],
      imagePricingJson: ['', [Validators.required]],
    });
  }

  ngOnInit() {
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

  async connectAdminAuth(): Promise<void> {
    try {
      await this.apiService.connectNostrExtension();
      this.grokConfigError.set(null);
    } catch (error) {
      this.grokConfigError.set(error instanceof Error ? error.message : 'Failed to connect to Nostr extension');
    }
  }

  disconnectAdminAuth(): void {
    this.apiService.disconnectNostrExtension();
  }

  async loadGrokConfig(): Promise<void> {
    this.grokConfigLoading.set(true);
    this.grokConfigError.set(null);

    try {
      const response = await this.apiService.getGrokAdminConfig();
      if (!response.success || !response.data) {
        this.grokConfigError.set(response.message || 'Failed to load Grok configuration');
        return;
      }

      const config = this.normalizeGrokConfig(response.data);
      this.grokConfig.set(config);
      this.patchGrokConfigForm(config);
    } catch (error) {
      this.grokConfigError.set(error instanceof Error ? error.message : 'Failed to load Grok configuration');
    } finally {
      this.grokConfigLoading.set(false);
    }
  }

  async saveGrokConfig(): Promise<void> {
    if (this.grokConfigForm.invalid) {
      this.grokConfigSaveError.set('Please correct the Grok configuration form first.');
      return;
    }

    this.isSavingGrokConfig.set(true);
    this.grokConfigSaveError.set(null);
    this.grokConfigSaveSuccess.set(false);

    try {
      const request = this.buildGrokConfigRequest();
      const response = await this.apiService.updateGrokAdminConfig(request);
      if (!response.success || !response.data) {
        this.grokConfigSaveError.set(response.message || 'Failed to save Grok configuration');
        return;
      }

      const config = this.normalizeGrokConfig(response.data);
      this.grokConfig.set(config);
      this.patchGrokConfigForm(config);
      this.grokConfigSaveSuccess.set(true);
    } catch (error) {
      this.grokConfigSaveError.set(error instanceof Error ? error.message : 'Failed to save Grok configuration');
    } finally {
      this.isSavingGrokConfig.set(false);
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
    this.grokConfigSaveSuccess.set(false);
    this.grokConfigSaveError.set(null);
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
      case 'getUser':
        this.getUserSettingsForm.reset();
        this.currentSettings.set(null);
        break;
      case 'grok':
        if (this.grokConfig()) {
          this.patchGrokConfigForm(this.grokConfig()!);
        }
        this.grokConfigSaveError.set(null);
        this.grokConfigSaveSuccess.set(false);
        break;
    }
    this.clearResults();
  }

  isAdminAuthConnected(): boolean {
    return this.apiService.getNostrAuthState().isAuthenticated;
  }

  getAdminAuthPubkey(): string | null {
    return this.apiService.getNostrAuthState().pubkey || null;
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
      case 'basic':
        return '#0f766e';
      case 'free':
      default:
        return '#6b7280';
    }
  }

  private normalizeGrokConfig(config: Partial<GrokAdminConfig> | null | undefined): GrokAdminConfig {
    const pricing = config?.pricing;

    return {
      enabled: config?.enabled ?? DEFAULT_GROK_ADMIN_CONFIG.enabled,
      allowResponses: config?.allowResponses ?? DEFAULT_GROK_ADMIN_CONFIG.allowResponses,
      allowImages: config?.allowImages ?? DEFAULT_GROK_ADMIN_CONFIG.allowImages,
      allowServerSideTools: config?.allowServerSideTools ?? DEFAULT_GROK_ADMIN_CONFIG.allowServerSideTools,
      guardrails: {
        responseSafetyMarginPercent: config?.guardrails?.responseSafetyMarginPercent ?? DEFAULT_GROK_ADMIN_CONFIG.guardrails.responseSafetyMarginPercent,
      },
      defaults: {
        responseModel: config?.defaults?.responseModel ?? DEFAULT_GROK_ADMIN_CONFIG.defaults.responseModel,
        imageModel: config?.defaults?.imageModel ?? DEFAULT_GROK_ADMIN_CONFIG.defaults.imageModel,
      },
      topUp: {
        minimumCents: config?.topUp?.minimumCents ?? DEFAULT_GROK_ADMIN_CONFIG.topUp.minimumCents,
        maximumCents: config?.topUp?.maximumCents ?? DEFAULT_GROK_ADMIN_CONFIG.topUp.maximumCents,
        defaultOptionsCents: config?.topUp?.defaultOptionsCents?.length
          ? [...config.topUp.defaultOptionsCents]
          : [...DEFAULT_GROK_ADMIN_CONFIG.topUp.defaultOptionsCents],
        nanosUsdPerCent: config?.topUp?.nanosUsdPerCent ?? DEFAULT_GROK_ADMIN_CONFIG.topUp.nanosUsdPerCent,
      },
      quotas: {
        basic: {
          includedImagesPerMonth: config?.quotas?.basic?.includedImagesPerMonth ?? DEFAULT_GROK_ADMIN_CONFIG.quotas.basic.includedImagesPerMonth,
        },
        premium: {
          includedImagesPerMonth: config?.quotas?.premium?.includedImagesPerMonth ?? DEFAULT_GROK_ADMIN_CONFIG.quotas.premium.includedImagesPerMonth,
        },
        premiumPlus: {
          includedImagesPerMonth: config?.quotas?.premiumPlus?.includedImagesPerMonth ?? DEFAULT_GROK_ADMIN_CONFIG.quotas.premiumPlus.includedImagesPerMonth,
          dailyImageLimit: config?.quotas?.premiumPlus?.dailyImageLimit ?? DEFAULT_GROK_ADMIN_CONFIG.quotas.premiumPlus.dailyImageLimit,
        },
      },
      pricing: {
        responses: pricing?.responses ? { ...DEFAULT_GROK_ADMIN_CONFIG.pricing.responses, ...pricing.responses } : { ...DEFAULT_GROK_ADMIN_CONFIG.pricing.responses },
        images: pricing?.images ? { ...DEFAULT_GROK_ADMIN_CONFIG.pricing.images, ...pricing.images } : { ...DEFAULT_GROK_ADMIN_CONFIG.pricing.images },
      },
    };
  }

  private patchGrokConfigForm(config: GrokAdminConfig): void {
    this.grokConfigForm.patchValue({
      enabled: config.enabled,
      allowResponses: config.allowResponses,
      allowImages: config.allowImages,
      allowServerSideTools: config.allowServerSideTools,
      responseSafetyMarginPercent: config.guardrails.responseSafetyMarginPercent,
      responseModel: config.defaults.responseModel,
      imageModel: config.defaults.imageModel,
      minimumCents: config.topUp.minimumCents,
      maximumCents: config.topUp.maximumCents,
      defaultOptionsCents: config.topUp.defaultOptionsCents.join(', '),
      nanosUsdPerCent: config.topUp.nanosUsdPerCent,
      basicIncludedImagesPerMonth: config.quotas.basic.includedImagesPerMonth,
      premiumIncludedImagesPerMonth: config.quotas.premium.includedImagesPerMonth,
      premiumPlusIncludedImagesPerMonth: config.quotas.premiumPlus.includedImagesPerMonth,
      premiumPlusDailyImageLimit: config.quotas.premiumPlus.dailyImageLimit,
      responsePricingJson: JSON.stringify(config.pricing.responses, null, 2),
      imagePricingJson: JSON.stringify(config.pricing.images, null, 2),
    });
  }

  private buildGrokConfigRequest(): GrokAdminConfig {
    const formValue = this.grokConfigForm.getRawValue();
    const responsePricing = JSON.parse(formValue.responsePricingJson) as GrokAdminConfig['pricing']['responses'];
    const imagePricing = JSON.parse(formValue.imagePricingJson) as GrokAdminConfig['pricing']['images'];
    const defaultOptionsCents = String(formValue.defaultOptionsCents)
      .split(',')
      .map((value: string) => Number.parseInt(value.trim(), 10))
      .filter((value: number) => Number.isFinite(value) && value > 0);

    return {
      enabled: !!formValue.enabled,
      allowResponses: !!formValue.allowResponses,
      allowImages: !!formValue.allowImages,
      allowServerSideTools: !!formValue.allowServerSideTools,
      guardrails: {
        responseSafetyMarginPercent: Number(formValue.responseSafetyMarginPercent),
      },
      defaults: {
        responseModel: String(formValue.responseModel).trim(),
        imageModel: String(formValue.imageModel).trim(),
      },
      topUp: {
        minimumCents: Number(formValue.minimumCents),
        maximumCents: Number(formValue.maximumCents),
        defaultOptionsCents,
        nanosUsdPerCent: Number(formValue.nanosUsdPerCent),
      },
      quotas: {
        basic: {
          includedImagesPerMonth: Number(formValue.basicIncludedImagesPerMonth),
        },
        premium: {
          includedImagesPerMonth: Number(formValue.premiumIncludedImagesPerMonth),
        },
        premiumPlus: {
          includedImagesPerMonth: Number(formValue.premiumPlusIncludedImagesPerMonth),
          dailyImageLimit: Number(formValue.premiumPlusDailyImageLimit),
        },
      },
      pricing: {
        responses: responsePricing,
        images: imagePricing,
      },
    };
  }
}
