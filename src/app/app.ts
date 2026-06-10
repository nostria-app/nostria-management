import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { InvestorAccessService } from './core/services/investor-access.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly access = inject(InvestorAccessService);
  protected readonly title = signal('nostria-management-portal');
  protected readonly angularVersion = '20.3.0';

  protected async login(): Promise<void> {
    await this.access.login();
  }

  protected logout(): void {
    this.access.logout();
  }
}
