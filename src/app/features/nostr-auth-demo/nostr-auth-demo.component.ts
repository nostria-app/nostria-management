import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { 
  ApiService, 
  NostrExtensionService, 
  AuthenticationState 
} from '../../index';

@Component({
  selector: 'app-nostr-auth-demo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nostr-auth-demo">
      <h3>NIP-98 Authentication Demo</h3>
      
      <div class="auth-status">
        <h4>Authentication Status</h4>
        <p><strong>Extension Available:</strong> {{ extensionAvailable ? 'Yes' : 'No' }}</p>
        <p><strong>Connected:</strong> {{ authState.isAuthenticated ? 'Yes' : 'No' }}</p>
        <p *ngIf="authState.extensionName"><strong>Extension:</strong> {{ authState.extensionName }}</p>
        <p *ngIf="authState.pubkey"><strong>Public Key:</strong> {{ authState.pubkey }}</p>
      </div>

      <div class="auth-actions">
        <button 
          *ngIf="!authState.isAuthenticated && extensionAvailable" 
          (click)="connect()"
          [disabled]="connecting"
          class="btn btn-primary">
          {{ connecting ? 'Connecting...' : 'Connect Nostr Extension' }}
        </button>
        
        <button 
          *ngIf="authState.isAuthenticated" 
          (click)="disconnect()"
          class="btn btn-secondary">
          Disconnect
        </button>
      </div>

      <div class="demo-actions" *ngIf="authState.isAuthenticated">
        <h4>NIP-98 Authenticated API Calls</h4>
        <button 
          (click)="testAuthenticatedCall()"
          [disabled]="testing"
          class="btn btn-info">
          {{ testing ? 'Testing...' : 'Test Authenticated API Call' }}
        </button>
        
        <div class="result" *ngIf="lastResult">
          <h5>Last Result:</h5>
          <pre>{{ lastResult | json }}</pre>
        </div>
      </div>

      <div class="error" *ngIf="error">
        <h4>Error:</h4>
        <p>{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .nostr-auth-demo {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .auth-status {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .auth-actions {
      margin-bottom: 20px;
    }
    
    .btn {
      padding: 8px 16px;
      margin-right: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-info {
      background-color: #17a2b8;
      color: white;
    }
    
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .result {
      background-color: #e9ecef;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
    }
    
    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
    }
    
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class NostrAuthDemoComponent implements OnInit, OnDestroy {
  authState: AuthenticationState = { isAuthenticated: false };
  extensionAvailable = false;
  connecting = false;
  testing = false;
  error: string | null = null;
  lastResult: any = null;
  
  private authSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private nostrExtension: NostrExtensionService
  ) {}

  ngOnInit(): void {
    this.extensionAvailable = this.apiService.isNip98AuthAvailable();
    
    // Subscribe to authentication state changes
    this.authSubscription = this.nostrExtension.authState$.subscribe(
      state => {
        this.authState = state;
      }
    );
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  async connect(): Promise<void> {
    this.connecting = true;
    this.error = null;
    
    try {
      const pubkey = await this.apiService.connectNostrExtension();
      console.log('Connected to Nostr extension with pubkey:', pubkey);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to connect';
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.apiService.disconnectNostrExtension();
    this.lastResult = null;
    this.error = null;
  }

  async testAuthenticatedCall(): Promise<void> {
    if (!this.authState.pubkey) {
      this.error = 'No public key available';
      return;
    }

    this.testing = true;
    this.error = null;
    
    try {
      // Example: Get user settings with NIP-98 authentication
      const result = await this.apiService.getUserSettingsWithAuth(this.authState.pubkey);
      this.lastResult = result;
      
      if (!result.success) {
        this.error = result.message || 'API call failed';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'API call failed';
    } finally {
      this.testing = false;
    }
  }
}