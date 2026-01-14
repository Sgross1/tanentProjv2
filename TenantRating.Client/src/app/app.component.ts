import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthModalComponent } from './shared/components/auth-modal/auth-modal.component';
import { AuthService } from './core/services/auth.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterModule, RouterOutlet, AuthModalComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'TenantRating.Client';
    showAuthModal = false;
    activeDropdown: string | null = null;

    constructor(public authService: AuthService) { }

    openAuth() {
        this.showAuthModal = true;
    }

    closeAuth() {
        this.showAuthModal = false;
    }

    toggleDropdown(menuName: string) {
        if (this.activeDropdown === menuName) {
            this.activeDropdown = null;
        } else {
            this.activeDropdown = menuName;
        }
    }

    closeDropdown() {
        this.activeDropdown = null;
    }
}
