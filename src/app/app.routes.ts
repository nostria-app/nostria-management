import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { CustomerList } from './features/customers/customer-list/customer-list';
import { ServerList } from './features/servers/server-list/server-list';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'customers', component: CustomerList },
  { path: 'servers', component: ServerList },
  { path: '**', redirectTo: '/dashboard' }
];
