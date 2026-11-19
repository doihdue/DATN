import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';
import { AuthService } from './services/auth.service';
import { SidebarService } from './services/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, TopbarComponent, ChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly authService = inject(AuthService);
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  private readonly currentUrl = signal<string>(this.router.url);

  readonly isTvDisplay = computed(() => {
    const url = this.currentUrl();
    return url === '/queue' || url.startsWith('/queue?') || url.startsWith('/queue#');
  });

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects || e.url);
      });
  }
}
