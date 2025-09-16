// Core services
export { ApiService } from './core/services/api.service';
export { NostrExtensionService } from './core/services/nostr-extension.service';
export { Nip98AuthService } from './core/services/nip98-auth.service';

// Shared models
export type { 
  ApiResponse, 
  Customer, 
  Server, 
  ServerConfig,
  // NIP-98 Auth Types
  NostrEvent,
  NostrEventTemplate,
  NostrExtension,
  Nip98AuthOptions,
  Nip98Token,
  AuthenticationState
} from './shared/models/api.models';

// Feature components
export { Dashboard } from './features/dashboard/dashboard';
export { CustomerList } from './features/customers/customer-list/customer-list';
export { ServerList } from './features/servers/server-list/server-list';
export { NostrAuthDemoComponent } from './features/nostr-auth-demo/nostr-auth-demo.component';