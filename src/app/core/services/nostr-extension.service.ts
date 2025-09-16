import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NostrExtension, AuthenticationState } from '../../shared/models/api.models';

@Injectable({
  providedIn: 'root'
})
export class NostrExtensionService {
  private authStateSubject = new BehaviorSubject<AuthenticationState>({
    isAuthenticated: false
  });

  public authState$ = this.authStateSubject.asObservable();

  private knownExtensions = [
    { name: 'nostr', property: 'nostr' },
    { name: 'nos2x', property: 'nos2x' },
    { name: 'Alby', property: 'alby' },
    { name: 'Flamingo', property: 'flamingo' },
    { name: 'horse', property: 'horse' }
  ];

  constructor() {
    this.detectExtensions();
  }

  /**
   * Detect available Nostr browser extensions
   */
  private detectExtensions(): void {
    // Check if any Nostr extension is available
    const availableExtension = this.knownExtensions.find(ext => 
      window[ext.property] && typeof window[ext.property].getPublicKey === 'function'
    );

    if (availableExtension) {
      this.updateAuthState({
        isAuthenticated: false,
        extensionName: availableExtension.name
      });
    }
  }

  /**
   * Get the available Nostr extension
   */
  public getExtension(): NostrExtension | null {
    for (const ext of this.knownExtensions) {
      const extension = window[ext.property];
      if (extension && typeof extension.getPublicKey === 'function') {
        return extension as NostrExtension;
      }
    }
    return null;
  }

  /**
   * Check if any Nostr extension is available
   */
  public isExtensionAvailable(): boolean {
    return this.getExtension() !== null;
  }

  /**
   * Connect to the Nostr extension and get the public key
   */
  public async connect(): Promise<string> {
    const extension = this.getExtension();
    
    if (!extension) {
      throw new Error('No Nostr extension found. Please install a Nostr browser extension like nos2x, Alby, or Flamingo.');
    }

    try {
      const pubkey = await extension.getPublicKey();
      
      this.updateAuthState({
        isAuthenticated: true,
        pubkey,
        extensionName: this.getCurrentExtensionName()
      });

      return pubkey;
    } catch (error) {
      throw new Error(`Failed to connect to Nostr extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a Nostr event using the browser extension
   */
  public async signEvent(event: any): Promise<any> {
    const extension = this.getExtension();
    
    if (!extension) {
      throw new Error('No Nostr extension available');
    }

    if (!this.authStateSubject.value.isAuthenticated) {
      throw new Error('Not connected to Nostr extension. Please connect first.');
    }

    try {
      return await extension.signEvent(event);
    } catch (error) {
      throw new Error(`Failed to sign event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from the Nostr extension
   */
  public disconnect(): void {
    this.updateAuthState({
      isAuthenticated: false,
      extensionName: this.getCurrentExtensionName()
    });
  }

  /**
   * Get the current authentication state
   */
  public getAuthState(): AuthenticationState {
    return this.authStateSubject.value;
  }

  /**
   * Get the name of the currently detected extension
   */
  private getCurrentExtensionName(): string | undefined {
    const availableExtension = this.knownExtensions.find(ext => 
      window[ext.property] && typeof window[ext.property].getPublicKey === 'function'
    );
    return availableExtension?.name;
  }

  /**
   * Update the authentication state
   */
  private updateAuthState(newState: Partial<AuthenticationState>): void {
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      ...newState
    });
  }

  /**
   * Get extension capabilities
   */
  public async getExtensionInfo(): Promise<{ name: string; nips?: number[] }> {
    const extension = this.getExtension();
    const extensionName = this.getCurrentExtensionName();
    
    if (!extension || !extensionName) {
      throw new Error('No Nostr extension available');
    }

    // Try to get relay information to determine NIP support
    let supportedNips: number[] = [1]; // All extensions support NIP-01

    try {
      if (extension.getRelays) {
        supportedNips.push(2); // NIP-02 Contact List and Petnames
      }
      if (extension.nip04) {
        supportedNips.push(4); // NIP-04 Encrypted Direct Message
      }
      // Assume NIP-07 (window.nostr capability) and NIP-98 (HTTP Auth) are supported
      supportedNips.push(7, 98);
    } catch (error) {
      // Ignore errors when checking capabilities
    }

    return {
      name: extensionName,
      nips: supportedNips
    };
  }
}