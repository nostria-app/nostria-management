# NIP-98 HTTP Authentication with Nostr

This implementation provides NIP-98 based HTTP authentication using Nostr browser extensions for the Nostria Management Portal.

## Overview

NIP-98 is a Nostr Improvement Proposal that defines HTTP authentication using Nostr events. This allows users to authenticate API requests by signing events with their Nostr private keys through browser extensions.

## Features

- 🔐 **Secure Authentication**: Uses Nostr cryptographic signatures for API authentication
- 🌐 **Browser Extension Support**: Compatible with popular Nostr extensions (nos2x, Alby, Flamingo, etc.)
- ⚡ **Easy Integration**: Simple API to add NIP-98 auth to any HTTP request
- 🛡️ **Token Validation**: Client-side token validation and timestamp checking
- 🔄 **Automatic Token Management**: Handles token generation with payload hashing

## Dependencies

The following packages are required and have been installed:

```json
{
  "@noble/hashes": "^1.4.0",
  "@scure/base": "^1.1.6",
  "nostr-tools": "^2.7.0"
}
```

## Services

### NostrExtensionService

Handles detection and interaction with Nostr browser extensions.

**Key Features:**
- Auto-detects available Nostr extensions
- Manages connection state
- Provides extension capabilities information
- Observable authentication state

### Nip98AuthService

Implements NIP-98 token generation and validation.

**Key Features:**
- Generates NIP-98 authentication tokens
- Validates token structure and content
- Handles payload hashing for POST/PUT requests
- Timestamp validation (60-second window)

### Enhanced ApiService

The existing API service has been enhanced with NIP-98 support.

**New Features:**
- `useNip98Auth` option for requests
- Automatic token generation and header injection
- Convenience methods for authenticated calls

## Usage Examples

### Basic Setup

```typescript
import { 
  ApiService, 
  NostrExtensionService, 
  Nip98AuthService 
} from './app/index';

constructor(
  private apiService: ApiService,
  private nostrExtension: NostrExtensionService,
  private nip98Auth: Nip98AuthService
) {}
```

### Connect to Nostr Extension

```typescript
async connectToNostr() {
  try {
    if (!this.apiService.isNip98AuthAvailable()) {
      throw new Error('No Nostr extension found');
    }
    
    const pubkey = await this.apiService.connectNostrExtension();
    console.log('Connected with pubkey:', pubkey);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

### Make Authenticated API Calls

#### Using the convenience method:

```typescript
async getUserSettings(pubkey: string) {
  const result = await this.apiService.getUserSettingsWithAuth(pubkey);
  return result;
}
```

#### Using the general method:

```typescript
async makeCustomAuthCall() {
  const result = await this.apiService.makeAuthenticatedRequest('/custom-endpoint', {
    method: 'POST',
    body: { data: 'example' }
  });
  return result;
}
```

#### Manual control:

```typescript
async manualAuthCall() {
  const result = await this.apiService.makeRequest('/protected-endpoint', {
    method: 'GET',
    useNip98Auth: true,
    nip98Options: {
      includeAuthorizationScheme: true
    }
  });
  return result;
}
```

### Monitor Authentication State

```typescript
ngOnInit() {
  this.nostrExtension.authState$.subscribe(state => {
    console.log('Auth state:', state);
    // state.isAuthenticated
    // state.pubkey
    // state.extensionName
  });
}
```

## API Reference

### ApiOptions Interface

```typescript
interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  useNip98Auth?: boolean;           // Enable NIP-98 authentication
  nip98Options?: Nip98AuthOptions;  // NIP-98 specific options
}
```

### Nip98AuthOptions Interface

```typescript
interface Nip98AuthOptions {
  includeAuthorizationScheme?: boolean;  // Include "Nostr " prefix
  payload?: Record<string, any>;         // Custom payload for hashing
}
```

### AuthenticationState Interface

```typescript
interface AuthenticationState {
  isAuthenticated: boolean;
  pubkey?: string;           // User's public key
  extensionName?: string;    // Name of the detected extension
  supportedNips?: number[];  // Supported NIPs (if available)
}
```

## Demo Component

A demo component (`NostrAuthDemoComponent`) is included to showcase the functionality:

```typescript
<app-nostr-auth-demo></app-nostr-auth-demo>
```

This component demonstrates:
- Extension detection
- Connection management
- Making authenticated API calls
- Error handling
- Authentication state display

## Supported Browser Extensions

- **nos2x**: Native Nostr extension
- **Alby**: Bitcoin Lightning and Nostr wallet
- **Flamingo**: Nostr-focused browser extension
- **horse**: Minimalist Nostr extension
- And any extension implementing the NIP-07 `window.nostr` interface

## Security Considerations

1. **Token Expiration**: Tokens are valid for only 60 seconds
2. **Payload Integrity**: POST/PUT requests include payload hash validation
3. **URL Binding**: Tokens are bound to specific URLs
4. **Method Binding**: Tokens are bound to specific HTTP methods
5. **Signature Verification**: All events are cryptographically signed

## Error Handling

The implementation includes comprehensive error handling:

- Extension not found
- Connection failures
- Token generation errors
- Invalid signatures
- Expired tokens
- Payload mismatches

## Browser Compatibility

Requires a modern browser with:
- ES2020 support
- WebCrypto API
- Support for Nostr browser extensions

## Testing

To test the implementation:

1. Install a Nostr browser extension (e.g., nos2x, Alby)
2. Use the demo component to test functionality
3. Check browser console for detailed logs
4. Verify network requests include proper `Authorization` headers

## Troubleshooting

**"No Nostr extension found"**
- Install a compatible Nostr browser extension
- Refresh the page after installation

**"Failed to connect to Nostr extension"**
- Grant permission when prompted by the extension
- Check extension settings and permissions

**"Authentication failed"**
- Ensure you're connected to the extension
- Check if the extension supports event signing
- Verify the API endpoint requires NIP-98 auth

**"Invalid token"**
- Check system clock synchronization
- Ensure the request hasn't been delayed
- Verify payload integrity

## Future Enhancements

- Token caching and reuse
- Multiple extension support
- Advanced error recovery
- Batch request signing
- Relay integration for verification