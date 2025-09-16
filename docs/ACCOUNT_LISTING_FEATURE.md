# Account Management - Account Directory Feature

## Overview

Added a comprehensive account listing feature to the Account Management component with **real API integration** using NIP-98 authentication. The feature connects to the `/api/account/list` endpoint to retrieve actual account data from the Nostria backend.

## Real API Integration

### **Live API Endpoint**
- **Endpoint**: `GET /api/account/list?limit=100`
- **Authentication**: NIP-98 signed requests with Nostr extensions
- **Response Format**: Array of AccountList objects from the database
- **Rate Limiting**: Configurable limit (1-1000 accounts, default 100)

### **Data Source**
- **Live Data**: Real account records from Nostria backend
- **Real-time**: Current account states and subscription information
- **Authenticated Access**: Secure access via cryptographic message signing

## New Features

### 1. **Authenticated Account Directory**
- **Real API**: Live connection to Nostria account database
- **NIP-98 Auth**: Cryptographic authentication via Nostr browser extensions
- **Responsive Design**: Cards adapt to mobile and desktop layouts

### 2. **Detailed Account Cards**
Each account displays comprehensive information:
- **Public Key**: Linked to Nostria profile with copy functionality
- **Username**: Display name or "No username set" indicator
- **Subscription Tier**: Visual badges (Free, Premium, Premium Plus)
- **Activity Dates**: Signup date, last login, expiration with countdown
- **Entitlements**: Notifications per day and feature list based on tier
- **Features**: Visual tags showing available features per subscription level

### 3. **NIP-98 Authentication Flow**
- **Nostr Extension Integration**: Connection status and management
- **Message Signing**: Users sign authentication messages for API access
- **Connection Controls**: Connect/disconnect with visual feedback
- **Security**: Each request cryptographically signed with user's private key

### 4. **Interactive Elements**
- **Profile Links**: Click pubkey to view user on Nostria (`https://nostria.app/p/PUBKEY`)
- **Copy Functions**: Copy pubkey and username to clipboard
- **Visual Status**: Color-coded tier badges and expiration warnings
- **Live Updates**: Real account data refreshed on each request

## Implementation Details

### API Integration (account-management.ts)
- **Real API Call**: `await this.apiService.makeAuthenticatedRequest<any[]>('/account/list?limit=${limit}')`
- **Data Transformation**: AccountList objects converted to Account interface
- **Error Handling**: Network errors, authentication failures, API errors
- **Type Safety**: Full TypeScript support with proper interfaces

### Component Updates
- **New Signals**: `isListingAccounts`, `listAccountsError`, `listedAccounts`, `isNostrConnected`
- **Form Management**: `listAccountsForm` with limit validation (1-1000)
- **Tier Mapping**: `getNotificationsPerDayForTier()` and `getFeaturesForTier()` methods
- **Nostr Methods**: `connectToNostr()`, `disconnectNostr()`, `listAccounts()`
- **Utility Methods**: `getAccountStatusClass()`, `getTierDisplayName()`, `copyToClipboard()`

### Template Updates (account-management.html)
- **Account Listing Section**: Real-time account data display
- **Nostr Status Panel**: Connection indicator and authentication controls
- **API Form**: Live account listing with configurable limits
- **Account Cards**: Detailed layout showing all account information

### Styling Updates (account-management.scss)
- **Card Layout**: Structured account information display
- **Responsive Design**: Mobile-friendly stacked layout
- **Visual Hierarchy**: Clear information grouping and typography
- **Status Indicators**: Color-coded badges and states

## API Response Structure

The real API returns AccountList objects with this structure:
```typescript
{
  id: string;           // Account ID (same as pubkey)
  type: "account";      // Document type
  pubkey: string;       // User's public key in hex format
  username?: string;    // User's username (optional)
  tier: "free" | "premium" | "premium_plus";  // Subscription tier
  subscription: object; // Account subscription details
  expires?: number;     // Subscription expiry timestamp
  created: number;      // Account creation timestamp
  modified: number;     // Last modification timestamp
  lastLoginDate?: number; // Last login timestamp
}
```

## Feature Mapping

The component automatically maps tier levels to appropriate entitlements:

### **Free Tier**
- **Notifications**: 25 per day
- **Features**: Basic Web Push, Community Support

### **Premium Tier**
- **Notifications**: 1,000 per day
- **Features**: Basic Web Push, Username, Advanced Filtering, Priority Support

### **Premium Plus Tier**
- **Notifications**: 5,000 per day
- **Features**: All Premium features + API Access, Webhooks, Analytics

## Authentication Flow

1. **Extension Check**: Detect available Nostr browser extensions
2. **Connection**: User clicks "Connect" to authorize extension access
3. **API Request**: User configures limit and clicks "Sign Message & List Accounts"
4. **Message Signing**: Nostr extension prompts user to sign authentication message
5. **API Call**: Signed request sent to `/api/account/list` endpoint
6. **Data Display**: Real account data rendered in responsive card layout

## User Experience Features

### Visual Indicators
- **🔗 Connected**: Green status when Nostr extension is connected
- **🔒 Disconnected**: Yellow status when not connected
- **Tier Badges**: Color-coded subscription levels (Free, Premium, Premium Plus)
- **Expiration Warnings**: Red text and countdown for expired accounts
- **Feature Tags**: Blue badges showing available features per tier

### Interactive Actions
- **👤 View Profile**: Direct link to Nostria profile
- **📋 Copy Pubkey**: Copy public key to clipboard
- **📋 Copy Username**: Copy username to clipboard (when available)

### Responsive Behavior
- **Desktop**: Three-column grid layout for account details
- **Mobile**: Single-column stacked layout
- **Actions**: Full-width buttons on mobile devices

## Security & Privacy

- **NIP-98 Authentication**: Cryptographic message signing for secure API access
- **Request Binding**: Each signature bound to specific URL and HTTP method
- **Timestamp Validation**: Signatures expire after 60 seconds
- **Pubkey Display**: Truncated format for privacy (first 8 + last 8 characters)
- **External Links**: Secure target="_blank" with rel="noopener noreferrer"

## Error Handling

- **Connection Errors**: Clear feedback for Nostr extension issues
- **Authentication Failures**: Specific error messages for signature problems
- **API Errors**: Network error handling with retry suggestions
- **Validation**: Form validation for limit ranges and required fields

## Performance

- **Configurable Limits**: 1-1000 accounts per request (default 100)
- **Efficient Rendering**: Virtual scrolling for large account lists
- **Caching**: Browser caching of account data for improved performance
- **Loading States**: Visual feedback during API requests

## Integration Points

- **Nostr Extensions**: Compatible with nos2x, Alby, Flamingo, etc.
- **Nostria Platform**: Direct profile links to main application
- **Copy Functionality**: Modern clipboard API with fallback support
- **Real Database**: Live connection to production account database

The account directory now provides real-time access to the complete Nostria user database with full authentication and security measures in place!