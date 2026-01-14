import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('scrollSection') scrollSection!: ElementRef;
  isVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private appComponent: AppComponent
  ) { }

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.isVisible = true;
        }
      });
    }, { threshold: 0.3 });

    if (this.scrollSection) {
      observer.observe(this.scrollSection.nativeElement);
    }
  }

  handleRoleClick(role: 'Tenant' | 'Landlord') {
    const currentUser = this.authService.getCurrentUserValue();

    if (!currentUser) {
      this.appComponent.openAuth();
      return;
    }

    // Logged in -> Navigate based on role
    if (role === 'Tenant') {
      this.router.navigate(['/tenant/dashboard']);
    } else if (role === 'Landlord') {
      this.router.navigate(['/landlord/search']);
    }
  }
}
