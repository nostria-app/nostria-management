import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import {
  NotificationRequest, NotificationResult, NotificationStatus,
  NotificationData, PushSubscription
} from '../../shared/models/api.models';

@Component({
  selector: 'app-notification-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './notification-management.html',
  styleUrl: './notification-management.scss'
})
export class NotificationManagement implements OnInit {
  private apiService = new ApiService();
  private fb = new FormBuilder();

  // Signals for reactive state management
  isSendingNotification = signal(false);
  sendNotificationError = signal<string | null>(null);
  notificationResult = signal<NotificationResult | null>(null);

  isCheckingStatus = signal(false);
  statusError = signal<string | null>(null);
  notificationStatus = signal<NotificationStatus | null>(null);

  isSendingTest = signal(false);
  testNotificationError = signal<string | null>(null);
  testNotificationSuccess = signal(false);

  isRegisteringSubscription = signal(false);
  subscriptionError = signal<string | null>(null);
  subscriptionSuccess = signal(false);

  // Forms
  sendNotificationForm: FormGroup;
  statusCheckForm: FormGroup;
  testNotificationForm: FormGroup;
  subscriptionForm: FormGroup;

  // Config
  apiKey = ''; // TODO: Implement proper API key management
  authToken = ''; // TODO: Implement proper auth token management

  constructor() {
    this.sendNotificationForm = this.fb.group({
      notificationType: ['direct', [Validators.required]],
      pubkeys: [''],
      title: ['', [Validators.required]],
      body: ['', [Validators.required]],
      icon: [''],
      url: [''],
      template: [''],
      templateArgs: ['']
    });

    this.statusCheckForm = this.fb.group({
      pubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]]
    });

    this.testNotificationForm = this.fb.group({
      testPubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      testTitle: ['Test Notification', [Validators.required]],
      testBody: ['This is a test notification from Nostria Management.', [Validators.required]],
      testIcon: [''],
      testData: ['']
    });

    this.subscriptionForm = this.fb.group({
      subPubkey: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9]{64}$/)]],
      endpoint: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      p256dh: ['', [Validators.required]],
      auth: ['', [Validators.required]],
      userAgent: ['']
    });

    // Watch notification type to toggle required fields
    this.sendNotificationForm.get('notificationType')?.valueChanges.subscribe(type => {
      this.updateFormValidation(type);
    });
  }

  ngOnInit() {
    this.updateFormValidation('direct');
  }

  updateFormValidation(notificationType: string) {
    const titleControl = this.sendNotificationForm.get('title');
    const bodyControl = this.sendNotificationForm.get('body');
    const templateControl = this.sendNotificationForm.get('template');

    if (notificationType === 'direct') {
      titleControl?.setValidators([Validators.required]);
      bodyControl?.setValidators([Validators.required]);
      templateControl?.clearValidators();
    } else {
      titleControl?.clearValidators();
      bodyControl?.clearValidators();
      templateControl?.setValidators([Validators.required]);
    }

    titleControl?.updateValueAndValidity();
    bodyControl?.updateValueAndValidity();
    templateControl?.updateValueAndValidity();
  }

  async sendNotification() {
    if (this.sendNotificationForm.invalid || !this.apiKey) return;

    this.isSendingNotification.set(true);
    this.sendNotificationError.set(null);
    this.notificationResult.set(null);

    try {
      const formValue = this.sendNotificationForm.value;
      const request: NotificationRequest = {};

      // Parse pubkeys
      if (formValue.pubkeys.trim()) {
        request.pubkeys = formValue.pubkeys.split(',').map((pk: string) => pk.trim()).filter((pk: string) => pk);
      }

      if (formValue.notificationType === 'direct') {
        request.title = formValue.title;
        request.body = formValue.body;
        if (formValue.icon) request.icon = formValue.icon;
        if (formValue.url) request.url = formValue.url;
      } else {
        request.template = formValue.template;
        if (formValue.templateArgs) {
          try {
            request.args = JSON.parse(formValue.templateArgs);
          } catch (e) {
            this.sendNotificationError.set('Invalid JSON in template arguments');
            this.isSendingNotification.set(false);
            return;
          }
        }
      }

      const response = await this.apiService.sendNotification(this.apiKey, request);
      if (response.success) {
        this.notificationResult.set(response.data);
        this.sendNotificationForm.reset({ notificationType: 'direct' });
      } else {
        this.sendNotificationError.set(response.message || 'Failed to send notification');
      }
    } catch (error) {
      this.sendNotificationError.set('Network error sending notification');
    } finally {
      this.isSendingNotification.set(false);
    }
  }

  async checkNotificationStatus() {
    if (this.statusCheckForm.invalid || !this.apiKey) return;

    this.isCheckingStatus.set(true);
    this.statusError.set(null);
    this.notificationStatus.set(null);

    try {
      const pubkey = this.statusCheckForm.get('pubkey')?.value;
      const response = await this.apiService.getNotificationStatus(this.apiKey, pubkey);
      if (response.success) {
        this.notificationStatus.set(response.data);
      } else {
        this.statusError.set(response.message || 'Failed to check notification status');
      }
    } catch (error) {
      this.statusError.set('Network error checking status');
    } finally {
      this.isCheckingStatus.set(false);
    }
  }

  async sendTestNotification() {
    if (this.testNotificationForm.invalid || !this.authToken) return;

    this.isSendingTest.set(true);
    this.testNotificationError.set(null);
    this.testNotificationSuccess.set(false);

    try {
      const formValue = this.testNotificationForm.value;
      const pubkey = formValue.testPubkey;
      const notification: NotificationData = {
        title: formValue.testTitle,
        body: formValue.testBody,
        icon: formValue.testIcon || undefined,
        data: formValue.testData ? JSON.parse(formValue.testData) : undefined
      };

      const response = await this.apiService.sendTestNotification(this.authToken, pubkey, notification);
      if (response.success) {
        this.testNotificationSuccess.set(true);
      } else {
        this.testNotificationError.set(response.message || 'Failed to send test notification');
      }
    } catch (error) {
      this.testNotificationError.set('Network error sending test notification');
    } finally {
      this.isSendingTest.set(false);
    }
  }

  async registerSubscription() {
    if (this.subscriptionForm.invalid || !this.authToken) return;

    this.isRegisteringSubscription.set(true);
    this.subscriptionError.set(null);
    this.subscriptionSuccess.set(false);

    try {
      const formValue = this.subscriptionForm.value;
      const pubkey = formValue.subPubkey;
      const subscription: PushSubscription = {
        endpoint: formValue.endpoint,
        keys: {
          p256dh: formValue.p256dh,
          auth: formValue.auth
        },
        userAgent: formValue.userAgent || undefined
      };

      const response = await this.apiService.registerWebPushSubscription(this.authToken, pubkey, subscription);
      if (response.success) {
        this.subscriptionSuccess.set(true);
        this.subscriptionForm.reset();
      } else {
        this.subscriptionError.set(response.message || 'Failed to register subscription');
      }
    } catch (error) {
      this.subscriptionError.set('Network error registering subscription');
    } finally {
      this.isRegisteringSubscription.set(false);
    }
  }

  formatPubkey(pubkey: string): string {
    if (pubkey.length <= 16) return pubkey;
    return `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`;
  }

  calculateSuccessRate(result: NotificationResult): number {
    const total = result.summary.totalTargeted;
    const successful = result.summary.successful;
    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }

  exportResults() {
    const result = this.notificationResult();
    if (!result) return;

    const data = {
      timestamp: new Date().toISOString(),
      summary: result.summary,
      successful: result.success,
      failed: result.failed,
      filtered: result.filtered,
      limited: result.limited
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearResults() {
    this.notificationResult.set(null);
    this.notificationStatus.set(null);
    this.sendNotificationError.set(null);
    this.statusError.set(null);
    this.testNotificationError.set(null);
    this.testNotificationSuccess.set(false);
    this.subscriptionError.set(null);
    this.subscriptionSuccess.set(false);
  }
}
