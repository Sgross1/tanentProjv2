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
  isLoading = false;
  authForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      // Register only fields
      firstName: [''],
      lastName: [''],
      phoneNumber: [''],
      role: ['Tenant']
    });
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    // Reset validators logic could go here but skipping for simplicity
  }

  close() {
    this.isOpen = false;
    setTimeout(() => this.closeEvent.emit(), 300); // Allow animation
  }

  onSubmit() {
    if (this.authForm.invalid) return;

    this.isLoading = true;
    const val = this.authForm.value;

    let request$;
    if (this.isLogin) {
      request$ = this.authService.login({ email: val.email, password: val.password });
    } else {
      this.authService.logout(); // Ensure clean session
      request$ = this.authService.register(val);
    }

    request$.subscribe({
      next: (user) => {
        console.log('Auth success', user);
        this.isLoading = false;
        this.close();
      },
      error: (err) => {
        console.error('Auth error', err);
        this.isLoading = false;
        // Detailed error message for debugging
        const errorMsg = `Status: ${err.status}\nMessage: ${err.message}\nDetail: ${JSON.stringify(err.error)}`;
        alert('שגיאה בהתחברות:\n' + errorMsg);
      }
    });
  }
}
