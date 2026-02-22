import { Component } from "@angular/core";
import { RouterOutlet, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthModalComponent } from "./shared/components/auth-modal/auth-modal.component";
import { AuthService } from "./core/services/auth.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, AuthModalComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "TenantRating.Client";
  showAuthModal = false;
  activeDropdown: string | null = null;

  isMenuOpen = false;

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  openAuth() {
    this.showAuthModal = true;
    this.closeMenu(); // Close menu if auth opens
  }

  closeAuth() {
    this.showAuthModal = false;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.activeDropdown = null; // Also close dropdowns
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

  logout() {
    this.authService.logout();
    this.closeMenu();

    const currentUrl = this.router.url.split("?")[0];
    const isOnSearchPage = currentUrl === "/landlord/search";

    if (!isOnSearchPage) {
      this.router.navigate(["/"]);
    }
  }
}
