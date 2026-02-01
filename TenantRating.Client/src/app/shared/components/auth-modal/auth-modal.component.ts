import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent {
  @Output() closeEvent = new EventEmitter<void>();

  isOpen = true;
  isLogin = true;
  isForgot = false; // New Mode
  isLoading = false;
  authForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [''], // Removed Validators.required to handle dynamic validation manually or via safe check
      // Register only fields
      firstName: [''],
      lastName: [''],
      phoneNumber: [''],
      role: ['Tenant']
    });
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.isForgot = false;
  }

  toggleForgot() {
    this.isForgot = !this.isForgot;
    this.isLogin = true; // Return to login context if canceling forgot
  }

  close() {
    this.isOpen = false;
    setTimeout(() => this.closeEvent.emit(), 300);
  }

  onSubmit() {
    if (this.authForm.invalid) {
      // Allow partial validation for Forgot Password (only email needed)
      if (this.isForgot && this.authForm.get('email')?.valid) {
        // Continue
      } else if (this.isForgot) {
        return;
      } else if (this.isLogin && this.authForm.get('email')?.valid && this.authForm.get('password')?.value) {
        // Simple login check
      } else if (this.isLogin) {
        return;
      } else {
        return; // Register needs all
      }
    }

    this.isLoading = true;
    const val = this.authForm.value;

    let request$;

    if (this.isForgot) {
      request$ = this.authService.forgotPassword(val.email);
    } else if (this.isLogin) {
      request$ = this.authService.login({ email: val.email, password: val.password });
    } else {
      this.authService.logout();
      request$ = this.authService.register(val);
    }

    request$.subscribe({
      next: (res) => {
        this.isLoading = false;
        if (this.isForgot) {
          alert('אם המייל קיים במערכת, נשלח אליך קישור לאיפוס סיסמה.');
          this.toggleForgot(); // Go back to login
        } else {
          console.log('Auth success', res);
          this.close();
        }
      },
      error: (err) => {
        console.error('Auth error', err);
        this.isLoading = false;
        // Handle regular errors
        if (!this.isForgot) {
          alert('שגיאה: ' + (err.error?.message || 'פרטים שגויים'));
        }
      }
    });
  }
}
