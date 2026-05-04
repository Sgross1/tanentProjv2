import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-reset-password",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./reset-password.component.html",
  styleUrls: ["./reset-password.component.scss"],
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string | null = null;
  isLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  uiMessage = "";
  uiMessageType: "success" | "error" | "info" = "info";

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {
    this.resetForm = this.fb.group(
      {
        newPassword: ["", [Validators.required, Validators.minLength(6)]],
        confirmPassword: ["", [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get("token");
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get("newPassword")?.value === g.get("confirmPassword")?.value
      ? null
      : { mismatch: true };
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.resetForm.invalid || !this.token) return;

    this.isLoading = true;
    this.uiMessage = "";
    const newPassword = this.resetForm.get("newPassword")?.value;

    this.authService
      .resetPassword({ token: this.token, newPassword })
      .subscribe({
        next: () => {
          this.uiMessage = "הסיסמה שונתה בהצלחה! כעת ניתן להתחבר.";
          this.uiMessageType = "success";
          setTimeout(() => this.router.navigate(["/"]), 900);
        },
        error: (err: any) => {
          this.uiMessage =
            "שגיאה: " + (err.error?.message || "הקישור פג תוקף או אינו תקין.");
          this.uiMessageType = "error";
          this.isLoading = false;
        },
      });
  }
}
