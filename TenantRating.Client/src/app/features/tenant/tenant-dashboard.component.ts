import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RequestService, RequestResultDto } from '../../core/services/request.service';
import { Observable, combineLatest, map, shareReplay, take } from 'rxjs';
import { LandlordService } from '../../core/services/landlord.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="dashboard-container" *ngIf="viewState$ | async as vs">
    <header class="welcome-header">
      <h1>איזור אישי</h1>
      <p>כאן תוכל לנהל את הפעילות שלך במערכת.</p>

      <!-- Tabs only if 'combined' -->
      <div class="tabs" *ngIf="vs.showTabs">
        <button class="tab-btn" [class.active]="activeTab === 'my-requests'" (click)="activeTab = 'my-requests'">הפניות שלי</button>
        <button class="tab-btn" [class.active]="activeTab === 'saved'" (click)="activeTab = 'saved'">פניות ששמרתי</button>
      </div>
    </header>

    <!-- Content Area: Show Request Stats/List if (CurrentTab == MyRequests OR ViewState == TenantOnly) -->
    <ng-container *ngIf="(vs.showTabs && activeTab === 'my-requests') || vs.viewType === 'tenant-only'">
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="icon">📄</div>
                <div class="value">{{ activeRequestsCount$ | async }}</div>
                <div class="label">בקשות פעילות</div>
            </div>
            <div class="stat-card">
                <div class="icon">⭐</div>
                <div class="value">{{ (latestScore$ | async | number: '1.0-1') || '-' }}</div>
                <div class="label">דירוג נוכחי</div>
            </div>
        </div>

        <!-- Global Slider Section -->
        <div class="slider-container-global" *ngIf="hasScore" style="background: #ffffff; padding: 2rem; border-radius: 16px; margin-bottom: 3rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <h3 style="margin-bottom: 1rem; color: var(--primary-color);">סימולטור דירוג</h3>
            <p style="margin-bottom: 15px; color: var(--text-muted);">הזז את הסליידר כדי לבדוק איך הציון משתנה בהתאם לשכר הדירה המבוקש.</p>
            
            <input type="range" min="10" max="100" step="1" [(ngModel)]="sliderValue" (input)="updateRentCalculation()" style="width: 100%; margin: 15px 0;">
            
            <p style="font-weight: bold; color: #0078d4; text-align: center; margin-top: 1rem;">
                    כדי לקבל ציון <span style="font-size: 1.2em;">{{ sliderValue }}</span>, עליך לבקש שכירות של עד:
                    <br>
                    <span style="font-size: 1.5em;">{{ calculatedRent | number }} ₪</span>
            </p>
        </div>

        <div class="requests-list-container">
            <div *ngIf="requests$ | async as requests">
                <div class="empty-state" *ngIf="requests.length === 0">
                    <p>טרם יצרת בקשות דירוג.</p>
                    <button class="action-btn primary" (click)="uploadNewRequest()">צור בקשה ראשונה</button>
                </div>

                <div *ngFor="let req of requests">
                    <!-- Row -->
                    <div class="request-row">
                        <div class="req-info">
                            <span class="req-date">{{ req.dateCreated | date: 'dd/MM/yyyy' }}</span>
                            <span class="req-city">{{ req.cityName }}</span>
                        </div>
                        <div class="req-score" [style.color]="getScoreColor(req.finalScore)">
                            {{ req.finalScore | number: '1.0-1' }}
                        </div>
                        <div class="req-status">
                             <span class="badge">הושלם</span>
                        </div>
                    </div>
                </div>
            </div>

            
            <div class="actions-section" *ngIf="(requests$ | async)?.length">
                <button class="action-btn primary" (click)="uploadNewRequest()">
                    <span class="icon">➕</span>
                    צור בקשת דירוג חדשה
                </button>
            </div>
        </div>

    </ng-container>


    <!-- Content Area: Show Saved List if (CurrentTab == Saved OR ViewState == LandlordOnly) -->
    <ng-container *ngIf="(vs.showTabs && activeTab === 'saved') || vs.viewType === 'landlord-only'">
        
        <div class="requests-list-container">
            <div *ngIf="savedRequests$ | async as savedList; else loading">
                <div class="empty-state" *ngIf="savedList.length === 0">
                    <p>לא שמרת פניות עדיין.</p>
                    <button class="action-btn primary" (click)="goToSearch()">חפש דיירים</button>
                </div>

                <div class="request-row" *ngFor="let saved of savedList">
                    <div class="req-info">
                        <span class="req-name">{{ saved.tenantName }}</span>
                        <span class="req-city">{{ saved.cityName }} - {{ saved.desiredRent }} ₪</span>
                        <span class="req-phone" *ngIf="saved.phoneNumber">{{ saved.phoneNumber }}</span>
                    </div>
                    <div class="req-score" [style.color]="getScoreColor(saved.finalScore)">
                        {{ saved.finalScore | number: '1.0-1' }}
                    </div>
                    <div class="req-status">
                        <button class="action-btn small warning" (click)="unsave(saved.requestId)">הסר</button>
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

  </div>
  `,
  styles: [`
    .dashboard-container { max-width: 1200px; margin: 0 auto; color: var(--text-color); animation: fadeIn 0.5s ease-out; }
    .welcome-header {
      text-align: center; margin-bottom: 2rem;
      h1 { font-size: 2.5rem; margin-bottom: 0.5rem; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      p { color: var(--text-muted); }
    }
    
    .tabs { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
    .tab-btn {
      background: transparent; border: 2px solid transparent; color: var(--text-muted); padding: 0.8rem 2rem;
      border-radius: 50px; cursor: pointer; font-weight: bold; transition: all 0.2s;
      &.active, &:hover { background: rgba(108, 92, 231, 0.1); color: var(--primary-color); border-color: var(--primary-color); }
    }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card {
      background: #ffffff; padding: 1.5rem; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      .icon { font-size: 2rem; margin-bottom: 1rem; }
      .value { font-size: 2rem; font-weight: bold; color: var(--primary-color); }
    }

    .requests-list-container { background: #ffffff; border-radius: 20px; padding: 2rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }
    
    .request-row {
      display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border-bottom: 1px solid rgba(0, 0, 0, 0.05); transition: background 0.2s;
      &:last-child { border-bottom: none; }
      &:hover { background: #f8f9fa; }
    }
    .req-info { display: flex; flex-direction: column; gap: 0.3rem; }
    .req-date, .req-name { font-weight: bold; font-size: 1.1rem; }
    .req-city { color: var(--text-muted); font-size: 0.9rem; }
    .req-score { font-size: 1.5rem; font-weight: 800; }
    
    .action-btn.primary { background: var(--primary-color); color: white; padding: 1rem 2rem; border-radius: 50px; border: none; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3); transition: transform 0.2s; &:hover { transform: translateY(-2px); } }
    .action-btn.small { padding: 0.5rem 1rem; font-size: 0.9rem; }
    .action-btn.warning { background: #ff7675; color: white; border: none; border-radius: 8px; cursor: pointer; }

    /* Empty Dashboard */
    .empty-dashboard { display: flex; justify-content: center; padding: 2rem 0; }
    .empty-card { background: white; padding: 3rem; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); text-align: center; }
    .options { display: flex; gap: 2rem; margin-top: 2rem; }
    .option-btn {
        background: white; border: 2px solid #eee; padding: 2rem; border-radius: 16px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 1rem; min-width: 200px;
        &:hover { border-color: var(--primary-color); transform: translateY(-5px); box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
        .icon { font-size: 2.5rem; }
        span { font-weight: bold; font-size: 1.2rem; }
        small { color: var(--text-muted); }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TenantDashboardComponent implements OnInit {
  activeTab: 'my-requests' | 'saved' = 'my-requests';

  requests$: Observable<RequestResultDto[]>;
  activeRequestsCount$: Observable<number>;
  latestScore$: Observable<number>;

  savedRequests$: Observable<any[]>;

  viewState$: Observable<{ viewType: 'tenant-only' | 'landlord-only' | 'combined' | 'empty', showTabs: boolean }>;

  // Slider Logic (Global)
  sliderValue = 0;
  calculatedRent = 0;
  currentMaxAffordableRent = 0;
  hasScore = false;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private landlordService: LandlordService,
    private authService: AuthService
  ) {
    this.requests$ = this.requestService.getMyRequests().pipe(shareReplay(1));
    this.activeRequestsCount$ = this.requests$.pipe(map(reqs => reqs.length));
    this.latestScore$ = this.requests$.pipe(map(reqs => reqs.length > 0 ? reqs[0].finalScore : 0));

    this.requests$.pipe(take(1)).subscribe(reqs => {
      if (reqs && reqs.length > 0) {
        const latestInfo = reqs[0];
        this.currentMaxAffordableRent = latestInfo.maxAffordableRent || (latestInfo.finalScore * 0.35 * 100);
        this.sliderValue = Math.round(latestInfo.finalScore);
        this.hasScore = true;
        this.updateRentCalculation();
      }
    });

    this.savedRequests$ = this.landlordService.getSavedRequests().pipe(shareReplay(1));

    // Determine Logic
    this.viewState$ = combineLatest([this.requests$, this.savedRequests$, this.authService.currentUser$]).pipe(
      map(([requests, saved, user]) => {
        const userRole = user?.role; // 'Tenant', 'Landlord', 'Both'

        // Strict Role View
        if (userRole === 'Both') {
          return { viewType: 'combined', showTabs: true };
        } else if (userRole === 'Tenant') {
          return { viewType: 'tenant-only', showTabs: false };
        } else if (userRole === 'Landlord') {
          return { viewType: 'landlord-only', showTabs: false };
        }

        // Fallback (e.g. Admin or glitch) - use data
        const hasRequests = requests.length > 0;
        const hasSaved = saved.length > 0;

        if (hasRequests && hasSaved) {
          return { viewType: 'combined', showTabs: true };
        } else if (hasRequests) {
          return { viewType: 'tenant-only', showTabs: false };
        } else if (hasSaved) {
          return { viewType: 'landlord-only', showTabs: false };
        }

        return { viewType: 'empty', showTabs: false };
      })
    );
  }

  ngOnInit(): void { }

  uploadNewRequest() {
    this.router.navigate(['/tenant/wizard']);
  }

  goToSearch() {
    this.router.navigate(['/landlord/search']);
  }

  unsave(id: number) {
    if (!confirm('להסיר מהמועדפים?')) return;
    this.landlordService.unsaveRequest(id).subscribe(() => {
      window.location.reload();
    });
  }

  getScoreColor(score: number): string {
    if (score >= 850) return '#00cec9';
    if (score >= 700) return '#fdcb6e';
    return '#ff7675';
  }

  updateRentCalculation() {
    if (this.sliderValue <= 0) {
      this.calculatedRent = 0;
      return;
    }
    this.calculatedRent = Math.round((this.currentMaxAffordableRent * 100) / this.sliderValue);
  }
}
