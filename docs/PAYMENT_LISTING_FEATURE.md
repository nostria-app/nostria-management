# Payment Management - List Payments Feature

## Overview

Added a new authenticated payment listing feature to the Payment Management component that uses NIP-98 authentication with Nostr browser extensions.

## New Features

### 1. **Nostr Extension Integration**
- Automatic detection of available Nostr browser extensions (nos2x, Alby, Flamingo, etc.)
- Connection status indicator with visual feedback
- Connect/Disconnect functionality

### 2. **Authenticated Payment Listing**
- New API endpoint: `GET /api/payment?limit=50`
- Requires NIP-98 authentication (Nostr signature)
- User must sign a message with their Nostr extension
- Configurable limit (1-100 payments)

### 3. **User Interface**
- **Connection Status**: Shows whether a Nostr extension is connected
- **Authentication Flow**: One-click connect to Nostr extension
- **List Form**: Configurable limit for number of payments to retrieve
- **Results Table**: Displays payment ID, status, expiration, and actions
- **Status Badges**: Color-coded payment status indicators
- **Lightning Integration**: Direct links to open Lightning invoices

## Implementation Details

### Component Updates
- **TypeScript**: Added signals for Nostr connection state and payment listing
- **Template**: New section with authentication flow and results display
- **Styling**: Added CSS for Nostr status indicators and payment table

### New Methods
- `connectToNostr()`: Establishes connection with Nostr extension
- `listPayments()`: Fetches payments using NIP-98 authentication
- `disconnectNostr()`: Disconnects from Nostr extension
- `getPaymentStatusClass()`: Returns CSS class for payment status
- `formatTimestamp()`: Formats Unix timestamps for display

### Security Features
- **NIP-98 Authentication**: Each request is signed with user's Nostr private key
- **Token Validation**: Automatic token generation and validation
- **Extension Verification**: Checks for valid Nostr extension before proceeding

## User Flow

1. **Check Extension**: System detects if Nostr extension is available
2. **Connect**: User clicks "Connect" to authorize with their Nostr extension
3. **Configure**: User sets the number of payments to retrieve (default: 50)
4. **Authenticate**: User clicks "Sign Message & List Payments"
5. **Sign**: Nostr extension prompts user to sign the authentication message
6. **Retrieve**: System fetches payment data using the signed token
7. **Display**: Payments are shown in a formatted table with actions

## Error Handling

- **No Extension**: Clear message with installation suggestions
- **Connection Failed**: Detailed error messages for connection issues
- **Authentication Failed**: Specific errors for signature/token problems
- **API Errors**: Network and server error handling with retry options

## Visual Indicators

- **🔗 Connected**: Green status when Nostr extension is connected
- **🔒 Disconnected**: Yellow status when not connected
- **Status Badges**: Color-coded payment statuses (paid, pending, expired, cancelled)
- **Loading States**: Spinners during authentication and data loading

## API Integration

The component integrates with the new payment listing API:

```
GET /api/payment?limit=50
Authorization: Nostr <nip98-token>
```

The NIP-98 token contains:
- Request URL binding
- HTTP method binding  
- Timestamp validation (60-second window)
- Cryptographic signature verification

## Browser Extension Support

Compatible with popular Nostr browser extensions:
- **nos2x**: Native Nostr extension
- **Alby**: Lightning wallet with Nostr support
- **Flamingo**: Nostr-focused extension
- **And others implementing NIP-07**

## Future Enhancements

- Payment filtering and search
- Export functionality for payment records
- Real-time payment status updates
- Bulk payment operations
- Payment analytics and reporting