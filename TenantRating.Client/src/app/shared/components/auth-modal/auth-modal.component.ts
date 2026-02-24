import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-auth-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./auth-modal.component.html",
  styleUrls: ["./auth-modal.component.scss"],
})
export class AuthModalComponent {
  @Output() closeEvent = new EventEmitter<void>();

  isOpen = true;
  isLogin = true;
  isForgot = false; // New Mode
  isLoading = false;
  authForm: FormGroup;

  phoneError: string = "";
  emailError: string = "";
  firstNameError: string = "";
  lastNameError: string = "";
  passwordError: string = "";
  roleError: string = "";
  loginError: string = "";
  registerError: string = "";
  infoMessage: string = "";

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.authForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: [""],
      firstName: [""],
      lastName: [""],
      phoneNumber: [""],
      role: ["Tenant"],
    });

    // בדיקת תקינות פלאפון תוך כדי הקלדה
    this.authForm.get("phoneNumber")?.valueChanges.subscribe((val) => {
      this.phoneError = "";
      if (!val) return;
      const phone = val.trim().replace(/[-\s]/g, "");
      if (phone.length !== 10 || !/^05[0-8][0-9]{7}$/.test(phone)) {
        this.phoneError = "מספר פלאפון לא תקין";
      }
    });

    // קוד קודם שנשמר לבקשתך:
    // בדיקת תקינות אימייל תוך כדי הקלדה (Regex מחמיר)
    // this.authForm.get("email")?.valueChanges.subscribe((val) => {
    //   this.emailError = "";
    //   if (!val) return;
    //   const strictEmailRegex =
    //     /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    //   if (!strictEmailRegex.test(val)) {
    //     this.emailError = "כתובת אימייל לא תקינה";
    //   }
    // });
  }

  onEmailInput() {
    this.emailError = "";
  }

  onFirstNameInput() {
    this.firstNameError = "";
  }

  onLastNameInput() {
    this.lastNameError = "";
  }

  onPasswordInput() {
    this.passwordError = "";
  }

  onRoleChange() {
    this.roleError = "";
  }

  onEmailBlur() {
    const emailValue = (this.authForm.get("email")?.value ?? "")
      .toString()
      .trim();

    if (!emailValue) {
      this.emailError = "יש להזין כתובת אימייל.";
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    this.emailError = emailRegex.test(emailValue)
      ? ""
      : "כתובת אימייל לא תקינה";
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.isForgot = false;
    this.infoMessage = "";
    this.registerError = "";
  }

  toggleForgot() {
    this.isForgot = !this.isForgot;
    this.isLogin = true; // Return to login context if canceling forgot
    this.infoMessage = "";
    this.registerError = "";
  }

  close() {
    this.isOpen = false;
    setTimeout(() => this.closeEvent.emit(), 300);
  }

  onSubmit() {
    this.loginError = "";
    this.registerError = "";
    this.infoMessage = "";
    this.phoneError = "";
    this.firstNameError = "";
    this.lastNameError = "";
    this.passwordError = "";
    this.roleError = "";
    let hasValidationError = false;

    this.onEmailBlur();
    hasValidationError = !!this.emailError;

    if (this.isForgot) {
      // Email already validated above
      if (hasValidationError) {
        return;
      }
    } else if (this.isLogin) {
      const passwordValue = (this.authForm.get("password")?.value ?? "")
        .toString()
        .trim();
      if (!passwordValue) {
        this.passwordError = "יש להזין סיסמה.";
        hasValidationError = true;
      }

      if (hasValidationError) {
        return;
      }
    } else {
      const firstNameValue = (this.authForm.get("firstName")?.value ?? "")
        .toString()
        .trim();
      const lastNameValue = (this.authForm.get("lastName")?.value ?? "")
        .toString()
        .trim();
      const passwordValue = (this.authForm.get("password")?.value ?? "")
        .toString()
        .trim();
      const roleValue = (this.authForm.get("role")?.value ?? "")
        .toString()
        .trim();
      const phoneRaw = (
        this.authForm.get("phoneNumber")?.value ?? ""
      ).toString();
      const normalizedPhone = phoneRaw.trim().replace(/[-\s]/g, "");

      if (!firstNameValue) {
        this.firstNameError = "יש להזין שם פרטי.";
        hasValidationError = true;
      }

      if (!lastNameValue) {
        this.lastNameError = "יש להזין שם משפחה.";
        hasValidationError = true;
      }

      if (!passwordValue) {
        this.passwordError = "יש להזין סיסמה.";
        hasValidationError = true;
      }

      if (!normalizedPhone) {
        this.phoneError = "יש להזין מספר פלאפון.";
        hasValidationError = true;
      } else if (!/^05[0-8][0-9]{7}$/.test(normalizedPhone)) {
        this.phoneError = "מספר פלאפון לא תקין";
        hasValidationError = true;
      }

      if (!roleValue) {
        this.roleError = "יש לבחור סוג משתמש.";
        hasValidationError = true;
      }

      if (hasValidationError) {
        return;
      }
    }

    this.isLoading = true;
    const val = this.authForm.value;
    // המרת אימייל ל-lowercase לפני שליחה לשרת
    if (val.email) {
      val.email = val.email.trim().toLowerCase();
    }
    let request$;

    if (this.isForgot) {
      request$ = this.authService.forgotPassword(val.email);
    } else if (this.isLogin) {
      request$ = this.authService.login({
        email: val.email,
        password: val.password,
      });
    } else {
      this.authService.logout();
      request$ = this.authService.register(val);
    }

    request$.subscribe({
      next: (res) => {
        this.isLoading = false;
        if (this.isForgot) {
          // קוד קודם שנשמר לבקשתך:
          // alert("אם המייל קיים במערכת, נשלח אליך קישור לאיפוס סיסמה.");
          this.infoMessage =
            "אם המייל קיים במערכת, נשלח אליך קישור לאיפוס סיסמה.";
          this.isForgot = false;
          this.isLogin = true;
        } else {
          console.log("Auth success", res);
          this.close();
        }
      },
      error: (err) => {
        console.error("Auth error", err);
        this.isLoading = false;
        const serverMessage = this.extractServerErrorMessage(err);

        // Handle regular errors
        if (this.isLogin && !this.isForgot) {
          this.loginError =
            serverMessage || "האימייל או הסיסמה אינם נכונים. אנא נסה שוב.";
          return;
        }

        if (!this.isLogin && !this.isForgot) {
          if (serverMessage.includes("אימייל")) {
            this.emailError = serverMessage;
          } else if (
            serverMessage.includes("פלאפון") ||
            serverMessage.includes("טלפון")
          ) {
            this.phoneError = serverMessage;
          } else {
            this.registerError =
              serverMessage || "לא ניתן להשלים הרשמה כרגע. נסה שוב.";
          }
        }
      },
    });
  }

  private extractServerErrorMessage(err: any): string {
    const payload = err?.error;

    if (typeof payload === "string") {
      return payload;
    }

    if (typeof payload?.message === "string") {
      return payload.message;
    }

    if (typeof payload?.title === "string") {
      return payload.title;
    }

    const firstValidationMessage = payload?.errors
      ? Object.values(payload.errors)
          .flat()
          .find((v: unknown) => typeof v === "string")
      : undefined;

    return typeof firstValidationMessage === "string"
      ? firstValidationMessage
      : "";
  }
}
