import { FormsModule } from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import {
  RequestService,
  RequestResultDto,
} from "../../core/services/request.service";
import { Observable, combineLatest, map, shareReplay, take } from "rxjs";
import { LandlordService } from "../../core/services/landlord.service";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-tenant-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./tenant-dashboard/tenant-dashboard.component.html",
  styleUrls: ["./tenant-dashboard/tenant-dashboard.component.scss"],
})
export class TenantDashboardComponent implements OnInit {
  activeTab: "my-requests" | "saved" = "my-requests";

  requests$: Observable<RequestResultDto[]>;
  activeRequestsCount$: Observable<number>;
  latestScore$: Observable<number>;

  savedRequests$: Observable<any[]>;

  viewState$: Observable<{
    viewType: "tenant-only" | "landlord-only" | "combined" | "empty";
    showTabs: boolean;
  }>;

  sliderValue = 0;
  calculatedRent = 0;
  currentMaxAffordableRent = 0;
  hasScore = false;
  uiMessage = "";
  uiMessageType: "success" | "error" | "info" = "info";
  confirmActionVisible = false;
  confirmActionType: "delete-request" | "unsave-saved" | null = null;
  confirmActionItemId: number | null = null;
  confirmActionTitle = "";
  confirmActionText = "";
  confirmActionConfirmLabel = "";
  confirmActionProgressLabel = "";
  confirmActionMessage = "";
  confirmActionMessageType: "success" | "error" | "info" = "info";
  confirmActionInProgress = false;
  private uiMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmActionCloseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private landlordService: LandlordService,
    private authService: AuthService,
  ) {
    this.requests$ = this.requestService.requests$;
    this.activeRequestsCount$ = this.requests$.pipe(map((reqs) => reqs.length));
    this.latestScore$ = this.requests$.pipe(
      map((reqs) => (reqs.length > 0 ? reqs[0].finalScore : 0)),
    );

    this.refreshTenantRequests();

    this.requests$.subscribe((reqs) => {
      if (reqs && reqs.length > 0) {
        const latestInfo = reqs[0];
        this.currentMaxAffordableRent =
          latestInfo.maxAffordableRent || latestInfo.finalScore * 0.35 * 100;
        this.sliderValue = Math.round(latestInfo.finalScore);
        this.hasScore = true;
        this.updateRentCalculation();
      } else {
        this.hasScore = false;
        this.currentMaxAffordableRent = 0;
        this.calculatedRent = 0;
      }
    });

    this.savedRequests$ = this.landlordService
      .getSavedRequests()
      .pipe(shareReplay(1));

    this.viewState$ = combineLatest([
      this.requests$,
      this.savedRequests$,
      this.authService.currentUser$,
    ]).pipe(
      map(([requests, saved, user]) => {
        const userRole = user?.role;
        const hasRequests = requests.length > 0;
        const hasSaved = saved.length > 0;

        // Smart View Logic:
        if (userRole === "Both" || (hasRequests && hasSaved)) {
          return { viewType: "combined", showTabs: true };
        }

        if (hasRequests && !hasSaved) {
          return { viewType: "tenant-only", showTabs: false };
        }
        if (hasSaved && !hasRequests) {
          return { viewType: "landlord-only", showTabs: false };
        }

        if (userRole === "Tenant")
          return { viewType: "tenant-only", showTabs: false };
        if (userRole === "Landlord")
          return { viewType: "landlord-only", showTabs: false };

        return { viewType: "empty", showTabs: false };
      }),
    );
  }

  ngOnInit(): void {}

  uploadNewRequest() {
    this.router.navigate(["/tenant/wizard"]);
  }

  goToSearch() {
    this.router.navigate(["/landlord/search"]);
  }

  unsave(id: number) {
    this.openConfirmAction(
      "unsave-saved",
      id,
      "אישור הסרה",
      `האם להסיר את פנייה #${id} מהמועדפים?`,
      "כן, הסר",
      "מסיר...",
    );
  }

  confirmUnsave() {
    this.confirmAction();
  }

  cancelUnsave() {
    this.cancelConfirmAction();
  }

  openDeleteRequestConfirm(requestId: number) {
    this.openConfirmAction(
      "delete-request",
      requestId,
      "אישור מחיקה",
      `האם הינך בטוח שברצונך למחוק את פנייה #${requestId}?`,
      "כן, מחק",
      "מוחק...",
    );
  }

  cancelDeleteRequest() {
    this.cancelConfirmAction();
  }

  confirmDeleteRequest() {
    this.confirmAction();
  }

  confirmAction() {
    if (
      this.confirmActionType == null ||
      this.confirmActionItemId == null ||
      this.confirmActionInProgress
    ) {
      return;
    }

    const actionType = this.confirmActionType;
    const itemId = this.confirmActionItemId;
    this.confirmActionInProgress = true;
    this.confirmActionMessage = "";

    if (actionType === "delete-request") {
      this.requestService.deleteRequest(itemId).subscribe({
        next: (response) => {
          this.confirmActionInProgress = false;
          this.confirmActionMessage =
            response?.message ?? `פנייה #${itemId} נמחקה בהצלחה.`;
          this.confirmActionMessageType = "success";
          this.scheduleConfirmActionClose();
        },
        error: () => {
          this.confirmActionInProgress = false;
          this.confirmActionMessage = `מחיקת פנייה #${itemId} נכשלה.`;
          this.confirmActionMessageType = "error";
        },
      });
      return;
    }

    this.landlordService.unsaveRequest(itemId).subscribe({
      next: () => {
        this.savedRequests$ = this.landlordService
          .getSavedRequests()
          .pipe(shareReplay(1));
        this.confirmActionInProgress = false;
        this.confirmActionMessage = "הפנייה הוסרה מהמועדפים.";
        this.confirmActionMessageType = "success";
        this.scheduleConfirmActionClose();
      },
      error: () => {
        this.confirmActionInProgress = false;
        this.confirmActionMessage = "הסרת הפנייה מהמועדפים נכשלה.";
        this.confirmActionMessageType = "error";
      },
    });
  }

  cancelConfirmAction() {
    if (this.confirmActionCloseTimer) {
      clearTimeout(this.confirmActionCloseTimer);
      this.confirmActionCloseTimer = null;
    }

    this.confirmActionVisible = false;
    this.confirmActionType = null;
    this.confirmActionItemId = null;
    this.confirmActionTitle = "";
    this.confirmActionText = "";
    this.confirmActionConfirmLabel = "";
    this.confirmActionProgressLabel = "";
    this.confirmActionMessage = "";
    this.confirmActionMessageType = "info";
    this.confirmActionInProgress = false;
  }

  private openConfirmAction(
    actionType: "delete-request" | "unsave-saved",
    itemId: number,
    title: string,
    text: string,
    confirmLabel: string,
    progressLabel: string,
  ) {
    this.confirmActionType = actionType;
    this.confirmActionItemId = itemId;
    this.confirmActionTitle = title;
    this.confirmActionText = text;
    this.confirmActionConfirmLabel = confirmLabel;
    this.confirmActionProgressLabel = progressLabel;
    this.confirmActionMessage = "";
    this.confirmActionMessageType = "info";
    this.confirmActionInProgress = false;
    this.confirmActionVisible = true;
  }

  private scheduleConfirmActionClose() {
    if (this.confirmActionCloseTimer) {
      clearTimeout(this.confirmActionCloseTimer);
    }

    this.confirmActionCloseTimer = setTimeout(() => {
      this.cancelConfirmAction();
    }, 1200);
  }

  getScoreColor(score: number): string {
    if (score >= 850) return "#00cec9";
    if (score >= 700) return "#fdcb6e";
    return "#ff7675";
  }

  updateRentCalculation() {
    if (this.sliderValue <= 0) {
      this.calculatedRent = 0;
      return;
    }
    this.calculatedRent = Math.round(
      (this.currentMaxAffordableRent * 100) / this.sliderValue,
    );
  }

  verifyingRequestId: number | null = null;
  verificationInput = "";
  isVerifying = false;
  verificationMessage = "";
  verificationMessageType: "success" | "error" | "info" = "info";
  verificationInputError = "";
  isVerificationInputValid = false;
  currentRequestHasSecondId = false;
  showSecondVerificationPrompt = false;
  secondVerificationMode = false;
  showVerificationInputSection = true;
  verificationFlowCompleted = false;

  startVerification(id: number, hasSecondId = false) {
    if (this.verifyingRequestId === id) {
      this.verifyingRequestId = null;
      this.verificationMessage = "";
      this.verificationInputError = "";
      this.isVerificationInputValid = false;
      this.currentRequestHasSecondId = false;
      this.showSecondVerificationPrompt = false;
      this.secondVerificationMode = false;
      this.showVerificationInputSection = true;
      this.verificationFlowCompleted = false;
    } else {
      this.verifyingRequestId = id;
      this.verificationInput = "";
      this.verificationMessage = "";
      this.verificationInputError = "";
      this.isVerificationInputValid = false;
      this.currentRequestHasSecondId = hasSecondId;
      this.showSecondVerificationPrompt = false;
      this.secondVerificationMode = false;
      this.showVerificationInputSection = true;
      this.verificationFlowCompleted = false;
    }
  }

  startSecondVerification() {
    this.secondVerificationMode = true;
    this.showSecondVerificationPrompt = false;
    this.verificationInput = "";
    this.verificationInputError = "";
    this.isVerificationInputValid = false;
    this.showVerificationInputSection = true;
    this.verificationFlowCompleted = false;
    this.verificationMessage = "";
  }

  skipSecondVerification() {
    this.showSecondVerificationPrompt = false;
    this.secondVerificationMode = false;
    this.showVerificationInputSection = false;
    this.verificationFlowCompleted = true;
    this.setVerificationMessage(
      "האימות הסתיים. ניתן לסגור את הפאנל.",
      "success",
    );
  }

  onVerificationInput() {
    const digitsOnly = (this.verificationInput || "")
      .replace(/\D/g, "")
      .slice(0, 9);
    this.verificationInput = digitsOnly;

    if (!digitsOnly) {
      this.verificationInputError = "";
      this.isVerificationInputValid = false;
      return;
    }

    if (digitsOnly.length < 9) {
      this.verificationInputError = "";
      this.isVerificationInputValid = false;
      return;
    }

    this.isVerificationInputValid = this.isValidIsraeliId(digitsOnly);
    this.verificationInputError = this.isVerificationInputValid
      ? ""
      : "מספר הזהות לא תקין";
  }

  onVerificationBlur() {
    const digitsOnly = (this.verificationInput || "")
      .replace(/\D/g, "")
      .slice(0, 9);
    this.verificationInput = digitsOnly;

    if (!digitsOnly) {
      this.verificationInputError = "יש להזין מספר תעודת זהות.";
      this.isVerificationInputValid = false;
      return;
    }

    if (digitsOnly.length !== 9) {
      this.verificationInputError = "מספר תעודת הזהות חייב להכיל 9 ספרות.";
      this.isVerificationInputValid = false;
      return;
    }

    this.isVerificationInputValid = this.isValidIsraeliId(digitsOnly);
    this.verificationInputError = this.isVerificationInputValid
      ? ""
      : "מספר תעודת הזהות אינו תקין.";
  }

  submitVerification(requestId: number) {
    this.onVerificationBlur();
    if (!this.isVerificationInputValid) {
      this.setVerificationMessage(
        "לא ניתן להמשיך: מספר תעודת הזהות אינו תקין.",
        "error",
      );
      return;
    }

    this.isVerifying = true;
    this.requestService
      .verifyTenantId(requestId, this.verificationInput)
      .subscribe({
        next: (res) => {
          this.isVerifying = false;
          if (res.isMatch) {
            if (this.secondVerificationMode) {
              this.setVerificationMessage(
                "האימות הנוסף הצליח: מספר תעודת הזהות תואם. תהליך האימות הושלם.",
                "success",
              );
              this.secondVerificationMode = false;
              this.showSecondVerificationPrompt = false;
              this.showVerificationInputSection = false;
              this.verificationFlowCompleted = true;
            } else {
              this.setVerificationMessage(
                "האימות הצליח: מספר תעודת הזהות תואם.",
                "success",
              );

              if (this.currentRequestHasSecondId) {
                this.showSecondVerificationPrompt = true;
                this.showVerificationInputSection = false;
              }

              if (!this.currentRequestHasSecondId) {
                this.setVerificationMessage(
                  "האימות הצליח: מספר תעודת הזהות תואם. תהליך האימות הושלם.",
                  "success",
                );
                this.showVerificationInputSection = false;
                this.verificationFlowCompleted = true;
              }
            }
          } else {
            this.setVerificationMessage(
              "האימות נכשל: מספר תעודת הזהות אינו תואם.",
              "error",
            );
            this.showSecondVerificationPrompt = false;
            this.showVerificationInputSection = true;
            this.verificationFlowCompleted = false;
          }
        },
        error: (err) => {
          this.isVerifying = false;
          console.error(err);
          this.setVerificationMessage(
            "אירעה שגיאה במהלך האימות. נא לנסות שוב.",
            "error",
          );
          this.showSecondVerificationPrompt = false;
          this.showVerificationInputSection = true;
          this.verificationFlowCompleted = false;
        },
      });
  }

  private isValidIsraeliId(idNumber: string): boolean {
    if (!/^\d{9}$/.test(idNumber)) {
      return false;
    }

    const sum = idNumber
      .split("")
      .map(Number)
      .map((digit, index) => {
        const step = digit * ((index % 2) + 1);
        return step > 9 ? step - 9 : step;
      })
      .reduce((acc, val) => acc + val, 0);

    return sum % 10 === 0;
  }

  private setVerificationMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
  ) {
    this.verificationMessage = message;
    this.verificationMessageType = type;
  }

  private setUiMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
  ) {
    if (this.uiMessageTimer) {
      clearTimeout(this.uiMessageTimer);
      this.uiMessageTimer = null;
    }

    this.uiMessage = message;
    this.uiMessageType = type;

    this.uiMessageTimer = setTimeout(() => {
      this.uiMessage = "";
      this.uiMessageTimer = null;
    }, 3200);
  }

  private refreshTenantRequests() {
    this.requestService.getMyRequests().pipe(take(1)).subscribe();
  }
}
