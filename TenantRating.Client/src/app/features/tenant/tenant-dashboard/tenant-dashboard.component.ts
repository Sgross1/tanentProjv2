import { FormsModule } from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import {
  RequestService,
  RequestResultDto,
} from "../../../core/services/request.service";
import { Observable, combineLatest, map, shareReplay, take } from "rxjs";
import { LandlordService } from "../../../core/services/landlord.service";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-tenant-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./tenant-dashboard.component.html",
  styleUrls: ["./tenant-dashboard.component.scss"],
  /*
  template: `
    <div class="dashboard-container" *ngIf="viewState$ | async as vs">
      <header class="welcome-header">
        <h1>איזור אישי</h1>
        <p>כאן תוכל לנהל את הפעילות שלך במערכת.</p>

        <!-- Tabs only if 'combined' -->
        <div class="tabs" *ngIf="vs.showTabs">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'my-requests'"
            (click)="activeTab = 'my-requests'"
          >
            הפניות שלי
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'saved'"
            (click)="activeTab = 'saved'"
          >
            פניות ששמרתי
          </button>
        </div>
      </header>

      <div
        class="inline-message global-toast"
        *ngIf="uiMessage"
        [class.error]="uiMessageType === 'error'"
        [class.success]="uiMessageType === 'success'"
      >
        {{ uiMessage }}
      </div>

      <!-- Content Area: Show Request Stats/List if (CurrentTab == MyRequests OR ViewState == TenantOnly) -->
      <ng-container
        *ngIf="
          (vs.showTabs && activeTab === 'my-requests') ||
          vs.viewType === 'tenant-only'
        "
      >
        <div class="stats-grid">
          <div class="stat-card">
            <div class="icon">📄</div>
            <div class="value">{{ activeRequestsCount$ | async }}</div>
            <div class="label">בקשות פעילות</div>
          </div>
          <div class="stat-card">
            <div class="icon">⭐</div>
            <div class="value">
              {{ (latestScore$ | async | number: "1.0-1") || "-" }}
            </div>
            <div class="label">דירוג נוכחי</div>
          </div>
        </div>

        <!-- Global Slider Section -->
        <div
          class="slider-container-global"
          *ngIf="hasScore"
          style="background: #ffffff; padding: 2rem; border-radius: 16px; margin-bottom: 3rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05);"
        >
          <h3 style="margin-bottom: 1rem; color: var(--primary-color);">
            סימולטור דירוג
          </h3>
          <p style="margin-bottom: 15px; color: var(--text-muted);">
            הזז את הסליידר כדי לבדוק איך הציון משתנה בהתאם לשכר הדירה המבוקש.
          </p>

          <input
            type="range"
            min="10"
            max="100"
            step="1"
            [(ngModel)]="sliderValue"
            (input)="updateRentCalculation()"
            style="width: 100%; margin: 15px 0;"
          />

          <p
            style="font-weight: bold; color: #0078d4; text-align: center; margin-top: 1rem;"
          >
            כדי לקבל ציון
            <span style="font-size: 1.2em;">{{ sliderValue }}</span
            >, עליך לבקש שכירות של עד:
            <br />
            <span style="font-size: 1.5em;"
              >{{ calculatedRent | number }} ₪</span
            >
          </p>
        </div>

        <div class="requests-list-container">
          <div *ngIf="requests$ | async as requests">
            <div class="empty-state" *ngIf="requests.length === 0">
              <p>טרם יצרת בקשות דירוג.</p>
              <button class="action-btn primary" (click)="uploadNewRequest()">
                צור בקשה ראשונה
              </button>
            </div>

            <div *ngFor="let req of requests">
              <!-- Row -->
              <div class="request-row">
                <div class="req-info">
                  <span class="req-city">פנייה #{{ req.requestId }}</span>
                  <span class="req-date">{{
                    req.dateCreated | date: "dd/MM/yyyy"
                  }}</span>
                  <span class="req-city">{{ req.cityName }}</span>
                  <span class="req-city" *ngIf="req.desiredRent != null"
                    >שכ"ד: {{ req.desiredRent | number: "1.0-0" }} ₪</span
                  >
                </div>
                <div
                  class="req-score"
                  [style.color]="getScoreColor(req.finalScore)"
                >
                  {{ req.finalScore | number: "1.0-1" }}
                </div>
                <div class="req-status">
                  <button
                    class="delete-request-btn"
                    type="button"
                    title="מחק פנייה"
                    aria-label="מחק פנייה"
                    (click)="openDeleteRequestConfirm(req.requestId)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Zm-1 12h12a2 2 0 0 0 2-2V7H4v12a2 2 0 0 0 2 2Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="actions-section">
            <button class="action-btn primary" (click)="uploadNewRequest()">
              <span class="icon">➕</span>
              צור בקשת דירוג חדשה
            </button>
          </div>
        </div>
      </ng-container>

      <!-- Content Area: Show Saved List if (CurrentTab == Saved OR ViewState == LandlordOnly) -->
      <ng-container
        *ngIf="
          (vs.showTabs && activeTab === 'saved') ||
          vs.viewType === 'landlord-only'
        "
      >
        <div class="requests-list-container">
          <div *ngIf="savedRequests$ | async as savedList; else loading">
            <div class="empty-state" *ngIf="savedList.length === 0">
              <p>לא שמרת פניות עדיין.</p>
              <button class="action-btn primary" (click)="goToSearch()">
                חפש דיירים
              </button>
            </div>

            <div
              class="request-row"
              *ngFor="let saved of savedList"
              style="flex-wrap: wrap;"
            >
              <div
                style="display: flex; align-items: center; justify-content: space-between; width: 100%;"
              >
                <div class="req-info">
                  <span class="req-name">{{ saved.tenantName }}</span>
                  <span class="req-city"
                    >{{ saved.cityName }} - {{ saved.desiredRent }} ₪</span
                  >
                  <span class="req-phone" *ngIf="saved.phoneNumber">{{
                    saved.phoneNumber
                  }}</span>
                </div>
                <div
                  class="req-score"
                  [style.color]="getScoreColor(saved.finalScore)"
                >
                  {{ saved.finalScore | number: "1.0-1" }}
                </div>
                <div class="req-status" style="display: flex; gap: 10px;">
                  <button
                    class="action-btn small primary"
                    (click)="
                      startVerification(saved.requestId, !!saved.hasSecondId)
                    "
                  >
                    {{
                      verifyingRequestId === saved.requestId
                        ? "סגור"
                        : "אמת זהות"
                    }}
                  </button>
                  <button
                    class="delete-request-btn"
                    type="button"
                    title="הסר מהמועדפים"
                    aria-label="הסר מהמועדפים"
                    (click)="unsave(saved.requestId)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Zm-1 12h12a2 2 0 0 0 2-2V7H4v12a2 2 0 0 0 2 2Z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Verification Panel -->
              <div
                *ngIf="verifyingRequestId === saved.requestId"
                style="width: 100%; margin-top: 15px; background: #dfe6e9; padding: 15px; border-radius: 8px; animation: fadeIn 0.3s;"
              >
                <ng-container *ngIf="showVerificationInputSection">
                  <p style="margin-bottom: 5px; font-weight: bold;">
                    {{
                      secondVerificationMode
                        ? "אימות מספר נוסף:"
                        : "הקלד ת.ז של הדייר לאימות:"
                    }}
                  </p>
                  <p
                    *ngIf="currentRequestHasSecondId"
                    style="margin-top: 0; margin-bottom: 10px; color: #636e72; font-size: 0.9rem;"
                  >
                    {{
                      secondVerificationMode
                        ? "אימות 2 מתוך 2"
                        : "אימות 1 מתוך 2"
                    }}
                  </p>
                  <div style="display: flex; gap: 10px;">
                    <input
                      type="text"
                      [(ngModel)]="verificationInput"
                      (input)="onVerificationInput()"
                      (blur)="onVerificationBlur()"
                      placeholder="מספר ת.ז..."
                      maxlength="9"
                      style="padding: 8px; border-radius: 4px; border: 1px solid #b2bec3; flex: 1;"
                    />
                    <button
                      class="action-btn small"
                      style="background: #00b894; color: white; border: none; border-radius: 8px; cursor: pointer;"
                      (click)="submitVerification(saved.requestId)"
                      [disabled]="isVerifying || !isVerificationInputValid"
                    >
                      {{
                        isVerifying
                          ? "בודק..."
                          : secondVerificationMode
                            ? "בדוק מספר נוסף"
                            : "בדוק"
                      }}
                    </button>
                  </div>

                  <div
                    class="inline-message error"
                    *ngIf="verificationInputError"
                  >
                    {{ verificationInputError }}
                  </div>
                </ng-container>

                <!-- קוד קודם שנשמר לבקשתך:
                <div
                  class="inline-message"
                  *ngIf="uiMessage"
                  [class.error]="uiMessageType === 'error'"
                  [class.success]="uiMessageType === 'success'"
                >
                  {{ uiMessage }}
                </div>
                -->
                <div
                  class="inline-message verification-message"
                  *ngIf="verificationMessage"
                  [class.error]="verificationMessageType === 'error'"
                  [class.success]="verificationMessageType === 'success'"
                >
                  {{ verificationMessage }}
                </div>

                <div
                  class="inline-confirm verification-confirm"
                  *ngIf="showSecondVerificationPrompt"
                >
                  <div class="confirm-title">יש מספר זהות נוסף לאימות</div>
                  <div class="confirm-text">האם תרצה לבצע אימות נוסף?</div>
                  <div class="confirm-actions">
                    <button
                      class="action-btn small"
                      type="button"
                      style="background: #0984e3; color: white; border: none; border-radius: 8px; cursor: pointer;"
                      (click)="startSecondVerification()"
                    >
                      כן, אמת נוסף
                    </button>
                    <button
                      class="action-btn small warning"
                      type="button"
                      (click)="skipSecondVerification()"
                    >
                      לא תודה
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ng-template #loading>
            <p class="loading-text">טוען פניות שמורות...</p>
          </ng-template>
        </div>
      </ng-container>

      <!-- Empty State / Fallback for Fresh User with no specific role/data -->
      <div *ngIf="vs.viewType === 'empty'" class="empty-dashboard">
        <div class="empty-card">
          <h2>ברוכים הבאים! איך תרצו להתחיל?</h2>
          <div class="options">
            <button class="option-btn" (click)="uploadNewRequest()">
              <span class="icon">🏠</span>
              <span>אני רוצה לשכור דירה</span>
              <small>צור בקשת דירוג חדשה</small>
            </button>
            <button class="option-btn" (click)="goToSearch()">
              <span class="icon">🔑</span>
              <span>אני משכיר נכס</span>
              <small>חפש דיירים מדורגים</small>
            </button>
          </div>
        </div>
      </div>

      <div
        class="confirm-modal-overlay"
        *ngIf="confirmActionVisible"
        (click)="cancelConfirmAction()"
      >
        <div class="confirm-modal" (click)="$event.stopPropagation()">
          <div class="confirm-title">{{ confirmActionTitle }}</div>
          <div class="confirm-text">{{ confirmActionText }}</div>
          <div
            class="inline-message"
            *ngIf="confirmActionMessage"
            [class.error]="confirmActionMessageType === 'error'"
            [class.success]="confirmActionMessageType === 'success'"
          >
            {{ confirmActionMessage }}
          </div>
          <div class="confirm-actions confirm-actions-end">
            <button
              class="action-btn small danger"
              (click)="confirmAction()"
              [disabled]="confirmActionInProgress"
            >
              {{
                confirmActionInProgress
                  ? confirmActionProgressLabel
                  : confirmActionConfirmLabel
              }}
            </button>
            <button
              class="action-btn small neutral"
              (click)="cancelConfirmAction()"
              [disabled]="confirmActionInProgress"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        color: var(--text-color);
        animation: fadeIn 0.5s ease-out;
      }
      .welcome-header {
        text-align: center;
        margin-bottom: 2rem;
        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: var(--color-trust-blue);
        }
        p {
          color: var(--text-muted);
        }
      }

      .tabs {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
      }
      .tab-btn {
        background: transparent;
        border: 2px solid transparent;
        color: var(--text-muted);
        padding: 0.8rem 2rem;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
        &.active,
        &:hover {
          background: rgba(108, 92, 231, 0.1);
          color: var(--primary-color);
          border-color: var(--primary-color);
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 3rem;
      }
      .stat-card {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        .icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        .value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--primary-color);
        }
      }

      .requests-list-container {
        background: #ffffff;
        border-radius: 20px;
        padding: 2rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      }
      .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--text-muted);
      }

      .request-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        transition: background 0.2s;
        &:last-child {
          border-bottom: none;
        }
        &:hover {
          background: #f8f9fa;
        }
      }
      .req-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .req-date,
      .req-name {
        font-weight: bold;
        font-size: 1.1rem;
      }
      .req-city {
        color: var(--text-muted);
        font-size: 0.9rem;
      }
      .req-score {
        font-size: 1.5rem;
        font-weight: 800;
      }

      .req-status {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .delete-request-btn {
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #dc2626;
        border-radius: 8px;
        width: 34px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;

        svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        &:hover {
          background: #fee2e2;
          color: #b91c1c;
        }
      }

      .action-btn.primary {
        background: var(--primary-gradient);
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        transition: opacity 0.2s;
        &:hover {
          opacity: 0.9;
        }
      }
      .action-btn.small {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
      }
      .action-btn.neutral {
        background: #ffffff;
        color: #374151;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        cursor: pointer;
      }
      .action-btn.danger {
        background: #ef4444;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      .action-btn.warning {
        background: #ff7675;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }

      .inline-message {
        margin: 0 auto 1rem;
        max-width: 750px;
        border-radius: 10px;
        padding: 0.75rem 1rem;
        background: #eef6ff;
        border: 1px solid #cfe1ff;
        color: #1d4f91;
        font-weight: 600;

        &.error {
          background: #fff3f3;
          border-color: #f5c2c7;
          color: #b42318;
        }

        &.success {
          background: #eefaf4;
          border-color: #b7ebcb;
          color: #0f7a3f;
        }
      }

      .global-toast {
        position: fixed;
        top: 18px;
        left: 50%;
        transform: translateX(-50%);
        width: min(92vw, 720px);
        z-index: 1300;
        margin: 0;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
      }

      .verification-message {
        margin-top: 0.75rem;
        margin-bottom: 0;
        max-width: 100%;
      }

      .inline-confirm {
        max-width: 750px;
        margin: 0 auto 1rem;
        border: 1px solid #d8e4f7;
        border-radius: 12px;
        background: #ffffff;
        padding: 0.9rem 1rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      }

      .inline-confirm.verification-confirm {
        margin: 1rem auto 1rem;
      }

      .confirm-title {
        font-weight: 700;
        color: #2d3436;
        margin-bottom: 0.35rem;
      }
      .confirm-text {
        color: #636e72;
        margin-bottom: 0.75rem;
      }
      .confirm-actions {
        display: flex;
        gap: 0.6rem;
      }

      .confirm-actions-end {
        justify-content: flex-end;
      }

      .confirm-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1200;
        padding: 1rem;
      }

      .confirm-modal {
        width: min(520px, 100%);
        background: #ffffff;
        border-radius: 14px;
        border: 1px solid #d8e4f7;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
        padding: 1rem 1.15rem;
      }

      // Empty Dashboard
      .empty-dashboard {
        display: flex;
        justify-content: center;
        padding: 2rem 0;
      }
      .empty-card {
        background: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        text-align: center;
      }
      .options {
        display: flex;
        gap: 2rem;
        margin-top: 2rem;
      }
      .option-btn {
        background: white;
        border: 2px solid #eee;
        padding: 2rem;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        min-width: 200px;
        &:hover {
          border-color: var(--primary-color);
          transform: translateY(-5px);
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
        }
        .icon {
          font-size: 2.5rem;
        }
        span {
          font-weight: bold;
          font-size: 1.2rem;
        }
        small {
          color: var(--text-muted);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  */
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

  // Slider Logic (Global)
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
        // Baseline for Inverse Logic: Product of rent and score
        this.currentMaxAffordableRent = (latestInfo.desiredRent! * latestInfo.finalScore);
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

    // Determine Logic
    this.viewState$ = combineLatest([
      this.requests$,
      this.savedRequests$,
      this.authService.currentUser$,
    ]).pipe(
      map(([requests, saved, user]) => {
        const userRole = user?.role; // 'Tenant', 'Landlord', 'Both'
        const hasRequests = requests.length > 0;
        const hasSaved = saved.length > 0;

        // Smart View Logic:
        // 1. If user has data for BOTH sides (or role is explicitly Both) -> Show Combined Tabs
        if (userRole === "Both" || (hasRequests && hasSaved)) {
          return { viewType: "combined", showTabs: true };
        }

        // 2. If user explicitly acts as one side via data, show that side
        if (hasRequests && !hasSaved) {
          return { viewType: "tenant-only", showTabs: false };
        }
        if (hasSaved && !hasRequests) {
          return { viewType: "landlord-only", showTabs: false };
        }

        // 3. Fallback to Role if no data yet
        if (userRole === "Tenant")
          return { viewType: "tenant-only", showTabs: false };
        if (userRole === "Landlord")
          return { viewType: "landlord-only", showTabs: false };

        // 4. Fresh user
        return { viewType: "empty", showTabs: false };
      }),
    );
  }

  ngOnInit(): void { }

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
    // Formula: Inverse Proportionality (Higher Score = Lower Budget)
    // Rent = (BaselineProduct) / Score
    this.calculatedRent = Math.round(this.currentMaxAffordableRent / this.sliderValue);
  }

  // Verification Logic
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
    // קוד קודם שנשמר לבקשתך:
    // startVerification(id: number) {
    if (this.verifyingRequestId === id) {
      this.verifyingRequestId = null; // Toggle off
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
    // קוד קודם שנשמר לבקשתך:
    // this.secondVerificationMode = true;
    // this.showSecondVerificationPrompt = false;
    // this.setVerificationMessage("הקלד מספר זהות נוסף לאימות.", "info");
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
    // קוד קודם שנשמר לבקשתך:
    // this.showSecondVerificationPrompt = false;
    // this.secondVerificationMode = false;
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
      // קוד קודם שנשמר לבקשתך:
      // this.verificationInputError = "יש להזין מספר תעודת זהות";
      this.verificationInputError = "יש להזין מספר תעודת זהות.";
      this.isVerificationInputValid = false;
      return;
    }

    if (digitsOnly.length !== 9) {
      // קוד קודם שנשמר לבקשתך:
      // this.verificationInputError = "מספר הזהות חייב להכיל 9 ספרות";
      this.verificationInputError = "מספר תעודת הזהות חייב להכיל 9 ספרות.";
      this.isVerificationInputValid = false;
      return;
    }

    this.isVerificationInputValid = this.isValidIsraeliId(digitsOnly);
    // קוד קודם שנשמר לבקשתך:
    // this.verificationInputError = this.isVerificationInputValid
    //   ? ""
    //   : "מספר הזהות לא תקין";
    this.verificationInputError = this.isVerificationInputValid
      ? ""
      : "מספר תעודת הזהות אינו תקין.";
  }

  submitVerification(requestId: number) {
    // קוד קודם שנשמר לבקשתך:
    // if (!this.verificationInput.trim()) return;

    this.onVerificationBlur();
    if (!this.isVerificationInputValid) {
      // קוד קודם שנשמר לבקשתך:
      // this.setVerificationMessage(
      //   "לא ניתן להמשיך: מספר תעודת זהות לא תקין.",
      //   "error",
      // );
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
            // קוד קודם שנשמר לבקשתך:
            // alert('✅ אימות הצליח! תעודת הזהות תואמת.');
            // this.setUiMessage("אימות הצליח! תעודת הזהות תואמת.", "success");
            if (this.secondVerificationMode) {
              // קוד קודם שנשמר לבקשתך:
              // this.setVerificationMessage(
              //   "אימות נוסף הצליח! תעודת הזהות תואמת. האימות הסתיים.",
              //   "success",
              // );
              this.setVerificationMessage(
                "האימות הנוסף הצליח: מספר תעודת הזהות תואם. תהליך האימות הושלם.",
                "success",
              );
              this.secondVerificationMode = false;
              this.showSecondVerificationPrompt = false;
              this.showVerificationInputSection = false;
              this.verificationFlowCompleted = true;
            } else {
              // קוד קודם שנשמר לבקשתך:
              // this.setVerificationMessage(
              //   "אימות הצליח! תעודת הזהות תואמת.",
              //   "success",
              // );
              this.setVerificationMessage(
                "האימות הצליח: מספר תעודת הזהות תואם.",
                "success",
              );

              if (this.currentRequestHasSecondId) {
                this.showSecondVerificationPrompt = true;
                this.showVerificationInputSection = false;
              }

              if (!this.currentRequestHasSecondId) {
                // קוד קודם שנשמר לבקשתך:
                // this.setVerificationMessage(
                //   "אימות הצליח! תעודת הזהות תואמת. האימות הסתיים.",
                //   "success",
                // );
                this.setVerificationMessage(
                  "האימות הצליח: מספר תעודת הזהות תואם. תהליך האימות הושלם.",
                  "success",
                );
                this.showVerificationInputSection = false;
                this.verificationFlowCompleted = true;
              }
            }
          } else {
            // קוד קודם שנשמר לבקשתך:
            // alert('❌ אימות נכשל! תעודת הזהות אינה תואמת.');
            // this.setUiMessage("אימות נכשל! תעודת הזהות אינה תואמת.", "error");
            // קוד קודם שנשמר לבקשתך:
            // this.setVerificationMessage(
            //   "אימות נכשל! תעודת הזהות אינה תואמת.",
            //   "error",
            // );
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
          // קוד קודם שנשמר לבקשתך:
          // alert('שגיאה בתהליך האימות.');
          // this.setUiMessage("שגיאה בתהליך האימות.", "error");
          // קוד קודם שנשמר לבקשתך:
          // this.setVerificationMessage("שגיאה בתהליך האימות.", "error");
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
