import { Injectable } from '@angular/core';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { base64 } from '@scure/base';
import { NostrExtensionService } from './nostr-extension.service';
import { 
  NostrEvent, 
  NostrEventTemplate, 
  Nip98AuthOptions, 
  Nip98Token 
} from '../../shared/models/api.models';

@Injectable({
  providedIn: 'root'
})
export class Nip98AuthService {
  private readonly HTTPAuth = 27235; // NIP-98 kind
  private readonly authorizationScheme = 'Nostr ';
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  constructor(private nostrExtension: NostrExtensionService) {}

  /**
   * Generate NIP-98 authentication token
   * @param loginUrl The URL being accessed
   * @param httpMethod HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param options Additional options for token generation
   * @returns Promise that resolves to the authentication token
   */
  public async getToken(
    loginUrl: string,
    httpMethod: string,
    options: Nip98AuthOptions = {}
  ): Promise<string> {
    const { includeAuthorizationScheme = false, payload } = options;

    if (!this.nostrExtension.isExtensionAvailable()) {
      throw new Error('No Nostr extension available for signing');
    }

    if (!this.nostrExtension.getAuthState().isAuthenticated) {
      throw new Error('Not connected to Nostr extension. Please connect first.');
    }

    const event: NostrEventTemplate = {
      kind: this.HTTPAuth,
      tags: [
        ['u', loginUrl],
        ['method', httpMethod.toUpperCase()],
      ],
      created_at: Math.round(new Date().getTime() / 1000),
      content: '',
    };

    if (payload) {
      event.tags.push(['payload', this.hashPayload(payload)]);
    }

    try {
      const signedEvent = await this.nostrExtension.signEvent(event);
      const authorizationScheme = includeAuthorizationScheme ? this.authorizationScheme : '';
      
      return authorizationScheme + base64.encode(
        this.textEncoder.encode(JSON.stringify(signedEvent))
      );
    } catch (error) {
      throw new Error(`Failed to generate NIP-98 token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a NIP-98 token (client-side validation)
   * @param token The token to validate
   * @param url The URL that should match the token
   * @param method The HTTP method that should match the token
   * @param body Optional request body for payload validation
   * @returns Promise that resolves to validation result
   */
  public async validateToken(
    token: string,
    url: string,
    method: string,
    body?: any
  ): Promise<boolean> {
    try {
      const event = await this.unpackEventFromToken(token);
      return await this.validateEvent(event, url, method, body);
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Unpack a Nostr event from a NIP-98 token
   * @param token The NIP-98 token
   * @returns Promise that resolves to the unpacked event
   */
  public async unpackEventFromToken(token: string): Promise<NostrEvent> {
    if (!token) {
      throw new Error('Missing token');
    }

    // Remove authorization scheme if present
    token = token.replace(this.authorizationScheme, '');

    try {
      const eventB64 = this.textDecoder.decode(base64.decode(token));
      
      if (!eventB64 || eventB64.length === 0 || !eventB64.startsWith('{')) {
        throw new Error('Invalid token format');
      }

      const event = JSON.parse(eventB64) as NostrEvent;
      
      if (!this.isValidNostrEvent(event)) {
        throw new Error('Invalid Nostr event structure');
      }

      return event;
    } catch (error) {
      throw new Error(`Failed to unpack token: ${error instanceof Error ? error.message : 'Invalid token'}`);
    }
  }

  /**
   * Validate event timestamp (within last 60 seconds)
   * @param event The event to validate
   * @returns True if timestamp is valid
   */
  public validateEventTimestamp(event: NostrEvent): boolean {
    if (!event.created_at) {
      return false;
    }
    
    const currentTime = Math.round(new Date().getTime() / 1000);
    return currentTime - event.created_at < 60;
  }

  /**
   * Validate event kind (should be 27235 for NIP-98)
   * @param event The event to validate
   * @returns True if kind is valid
   */
  public validateEventKind(event: NostrEvent): boolean {
    return event.kind === this.HTTPAuth;
  }

  /**
   * Validate event URL tag
   * @param event The event to validate
   * @param url The expected URL
   * @returns True if URL tag is valid
   */
  public validateEventUrlTag(event: NostrEvent, url: string): boolean {
    const urlTag = event.tags.find(t => t[0] === 'u');
    
    if (!urlTag || urlTag.length < 2) {
      return false;
    }
    
    return urlTag[1] === url;
  }

  /**
   * Validate event method tag
   * @param event The event to validate
   * @param method The expected HTTP method
   * @returns True if method tag is valid
   */
  public validateEventMethodTag(event: NostrEvent, method: string): boolean {
    const methodTag = event.tags.find(t => t[0] === 'method');
    
    if (!methodTag || methodTag.length < 2) {
      return false;
    }
    
    return methodTag[1].toLowerCase() === method.toLowerCase();
  }

  /**
   * Validate event payload tag
   * @param event The event to validate
   * @param payload The request payload to validate against
   * @returns True if payload tag is valid
   */
  public validateEventPayloadTag(event: NostrEvent, payload: any): boolean {
    const payloadTag = event.tags.find(t => t[0] === 'payload');
    
    if (!payloadTag || payloadTag.length < 2) {
      return false;
    }
    
    const payloadHash = this.hashPayload(payload);
    return payloadTag[1] === payloadHash;
  }

  /**
   * Hash a payload for NIP-98 payload tag
   * @param payload The payload to hash
   * @returns The hex-encoded hash
   */
  public hashPayload(payload: any): string {
    const hash = sha256(this.textEncoder.encode(JSON.stringify(payload)));
    return bytesToHex(hash);
  }

  /**
   * Validate a complete Nostr event for NIP-98
   * @param event The event to validate
   * @param url The expected URL
   * @param method The expected HTTP method
   * @param body Optional request body
   * @returns Promise that resolves to validation result
   */
  private async validateEvent(
    event: NostrEvent,
    url: string,
    method: string,
    body?: any
  ): Promise<boolean> {
    // Basic event structure validation
    if (!this.validateEventKind(event)) {
      throw new Error('Invalid event kind for NIP-98');
    }

    if (!this.validateEventTimestamp(event)) {
      throw new Error('Event timestamp is too old (must be within 60 seconds)');
    }

    if (!this.validateEventUrlTag(event, url)) {
      throw new Error('Event URL tag does not match request URL');
    }

    if (!this.validateEventMethodTag(event, method)) {
      throw new Error('Event method tag does not match request method');
    }

    // Validate payload if provided
    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      if (!this.validateEventPayloadTag(event, body)) {
        throw new Error('Event payload tag does not match request body hash');
      }
    }

    return true;
  }

  /**
   * Check if an object has the structure of a valid Nostr event
   * @param event The object to validate
   * @returns True if the object has valid Nostr event structure
   */
  private isValidNostrEvent(event: any): event is NostrEvent {
    return (
      event &&
      typeof event === 'object' &&
      typeof event.kind === 'number' &&
      typeof event.created_at === 'number' &&
      typeof event.content === 'string' &&
      Array.isArray(event.tags) &&
      event.tags.every((tag: any) => Array.isArray(tag) && tag.every((item: any) => typeof item === 'string'))
    );
  }

  /**
   * Create a Nip98Token object for caching/storage
   * @param token The token string
   * @param event The associated event
   * @returns Nip98Token object
   */
  public createTokenObject(token: string, event: NostrEvent): Nip98Token {
    return {
      token,
      event,
      createdAt: Date.now()
    };
  }

  /**
   * Check if a cached token is still valid (not expired)
   * @param tokenObj The cached token object
   * @returns True if token is still valid
   */
  public isTokenValid(tokenObj: Nip98Token): boolean {
    const maxAge = 60 * 1000; // 60 seconds in milliseconds
    return (Date.now() - tokenObj.createdAt) < maxAge;
  }
}