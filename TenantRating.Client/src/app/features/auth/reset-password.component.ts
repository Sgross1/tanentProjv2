
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    template: `
    <div class="reset-container">
        <div class="card glass-panel" *ngIf="token; else noToken">
            <h2>איפוס סיסמה</h2>
            <p>אנא בחר סיסמה חדשה לחשבונך.</p>
            
            <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
                <div class="input-group">
                    <input type="password" formControlName="newPassword" placeholder="סיסמה חדשה (מינימום 6 תווים)">
                    <div class="error" *ngIf="resetForm.get('newPassword')?.touched && resetForm.get('newPassword')?.errors?.['minlength']">
                        הסיסמה חייבת להכיל לפחות 6 תווים
                    </div>
                </div>

                <div class="input-group">
                    <input type="password" formControlName="confirmPassword" placeholder="אמת סיסמה חדשה">
                    <div class="error" *ngIf="resetForm.errors?.['mismatch'] && resetForm.get('confirmPassword')?.touched">
                        הסיסמאות אינן תואמות
                    </div>
                </div>

                <button type="submit" class="btn-premium submit-btn" [disabled]="resetForm.invalid || isLoading">
                    <span *ngIf="!isLoading">שמור סיסמה חדשה</span>
                    <span *ngIf="isLoading">מעדכן...</span>
                </button>
            </form>
        </div>

        <ng-template #noToken>
            <div class="card glass-panel error-card">
                <h2>שגיאה</h2>
                <p>קישור לא תקין או חסר טוקן.</p>
                <a routerLink="/" class="btn-link">חזרה לדף הבית</a>
            </div>
        </ng-template>
    </div>
  `,
    styles: [`
    .reset-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
        padding: 2rem;
    }
    .card {
        background: rgba(255, 255, 255, 0.95);
        padding: 2.5rem;
        border-radius: 24px;
        width: 100%;
        max-width: 450px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    h2 { margin-bottom: 0.5rem; color: #1e293b; }
    p { margin-bottom: 2rem; color: #64748b; }
    
    .input-group { margin-bottom: 1rem; text-align: right; }
    input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 1rem;
        transition: all 0.3s ease;
    }
    input:focus {
        border-color: #6366f1;
        outline: none;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
    .btn-premium {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 1.1rem;
        cursor: pointer;
        margin-top: 1rem;
    }
    .btn-premium:disabled { opacity: 0.7; cursor: not-allowed; }
    .error { color: #ef4444; font-size: 0.85rem; margin-top: 0.25rem; }
    .btn-link { color: #6366f1; text-decoration: none; font-weight: 500; }
  `]
})
export class ResetPasswordComponent implements OnInit {
    resetForm: FormGroup;
    token: string | null = null;
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService
    ) {
        this.resetForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit() {
        this.token = this.route.snapshot.queryParamMap.get('token');
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit() {
        if (this.resetForm.invalid || !this.token) return;

        this.isLoading = true;
        const newPassword = this.resetForm.get('newPassword')?.value;

        this.authService.resetPassword({ token: this.token, newPassword }).subscribe({
            next: () => {
                alert('הסיסמה שונתה בהצלחה! כעת ניתן להתחבר.');
                this.router.navigate(['/']);
            },
            error: (err: any) => {
                alert('שגיאה: ' + (err.error?.message || 'הקישור פג תוקף או אינו תקין.'));
                this.isLoading = false;
            }
        });
    }
}
