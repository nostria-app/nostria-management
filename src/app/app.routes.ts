import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { CustomerList } from './features/customers/customer-list/customer-list';
import { ServerList } from './features/servers/server-list/server-list';
import { AccountManagement } from './features/accounts/account-management';
import { BackupManagement } from './features/backups/backup-management';
import { NotificationManagement } from './features/notifications/notification-management';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'customers', component: CustomerList },
  { path: 'servers', component: ServerList },
  { path: 'accounts', component: AccountManagement },
  { path: 'backups', component: BackupManagement },
    {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/notification-management').then(m => m.NotificationManagement)
  },
  {
    path: 'payments',
    loadComponent: () => import('./features/payments/payment-management').then(m => m.PaymentManagement)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings-management').then(m => m.SettingsManagement)
  },
  {
    path: 'status',
    loadComponent: () => import('./features/status/status-monitoring').then(m => m.StatusMonitoring)
  },
  // TODO: Add routes for remaining components when created:
  // { path: 'payments', component: PaymentManagement },
  // { path: 'settings', component: SettingsManagement },
  // { path: 'status', component: StatusMonitoring },
  { path: '**', redirectTo: '/dashboard' }
];
