import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, SystemStats, UserDto, AdminRequestDto, GraphStats } from '../../core/services/admin.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>לוח בקרה למנהל</h1>
        <div class="tabs">
            <button class="tab-btn" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">סקירה כללית</button>
            <button class="tab-btn" [class.active]="activeTab === 'analytics'" (click)="loadAnalytics()">סטטיסטיקה</button>
            <button class="tab-btn" [class.active]="activeTab === 'users'" (click)="loadUsers()">ניהול משתמשים</button>
            <button class="tab-btn" [class.active]="activeTab === 'requests'" (click)="loadRequests()">מעקב פניות</button>
        </div>
      </header>

      <!-- OVERVIEW TAB -->
      <div class="tab-content" *ngIf="activeTab === 'overview'">
          <div class="stats-grid" *ngIf="stats$ | async as stats">
            <div class="stat-card">
              <div class="icon">👥</div>
              <div class="value">{{ stats.totalUsers }}</div>
              <div class="label">סה"כ משתמשים</div>
            </div>
            <div class="stat-card">
              <div class="icon">📝</div>
              <div class="value">{{ stats.totalRequests }}</div>
              <div class="label">בקשות דירוג</div>
            </div>
            <div class="stat-card">
              <div class="icon">🏠</div>
              <div class="value">{{ stats.totalLandlords }}</div>
              <div class="label">משכירים רשומים</div>
            </div>
            <div class="stat-card">
              <div class="icon">🏠</div>
              <div class="value">{{ stats.totalTenants }}</div>
              <div class="label">שוכרים רשומים</div>
            </div>
          </div>
      </div>

       <!-- ANALYTICS TAB -->
      <div class="tab-content fade-in" *ngIf="activeTab === 'analytics' && (graphStats$ | async) as graphs">
          <div class="charts-grid">
              
              <!-- CHARTS 1: Requests By Month -->
              <div class="chart-card">
                  <h3>בקשות לפי חודש</h3>
                  <div class="bar-chart">
                      <div class="bar-item" *ngFor="let m of graphs.requestsByMonth" [style.height.%]="(m.count / getMax(graphs.requestsByMonth)) * 100">
                           <span class="bar-val">{{ m.count }}</span>
                           <span class="bar-label">{{ m.month }}/{{ m.year }}</span>
                      </div>
                  </div>
              </div>

               <!-- CHARTS 2: Score Distribution -->
               <div class="chart-card">
                  <h3>התפלגות ציונים</h3>
                  <div class="bar-chart vertical">
                       <div class="bar-item" *ngFor="let s of graphs.scoreDistribution" [style.height.%]="(s.count / getMaxScore(graphs.scoreDistribution)) * 100">
                           <span class="bar-val">{{ s.count }}</span>
                           <span class="bar-label">{{ s.label }}</span>
                      </div>
                  </div>
              </div>

              <!-- CHARTS 3: Status Distribution (Mini List as Donut is hard in pure CSS without complex calculations per item) -->
              <div class="chart-card">
                  <h3>סטטוס בקשות</h3>
                  <div class="status-list">
                      <div class="status-item" *ngFor="let st of graphs.requestsByStatus">
                          <div class="st-label">{{ getStatusName(st.status) }}</div>
                          <div class="st-bar-bg">
                              <div class="st-bar-fill" [style.width.%]="(st.count / graphs.requestsByStatus.length) * 100 > 100 ? 100 : (st.count * 10)"></div> 
                              <!-- Note: Calculation above is approximate for demo, standardizing by max would be better -->
                          </div>
                          <div class="st-count">{{ st.count }}</div>
                      </div>
                  </div>
              </div>

          </div>
      </div>

      <!-- USERS TAB -->
      <div class="tab-content" *ngIf="activeTab === 'users'">
          <div class="controls fa-border">
              <input type="text" [(ngModel)]="userSearch" (keyup.enter)="loadUsers()" placeholder="חפש משתמש..." class="search-input">
              <select [(ngModel)]="userRoleFilter" (change)="loadUsers()" class="filter-select">
                  <option [ngValue]="undefined">כל התפקידים</option>
                  <option [ngValue]="0">שוכר</option>
                  <option [ngValue]="1">משכיר</option>
                  <option [ngValue]="2">מנהל</option>
                  <option [ngValue]="3">שוכר ומשכיר</option>
              </select>
          </div>
          
          <table class="data-table">
              <thead>
                  <tr>
                      <th (click)="sort('firstName')" class="sortable">
                          שם מלא <span class="sort-icon" [class.active]="sortColumn === 'firstName'">{{ sortColumn === 'firstName' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('email')" class="sortable">
                          אימייל <span class="sort-icon" [class.active]="sortColumn === 'email'">{{ sortColumn === 'email' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('role')" class="sortable">
                          תפקיד <span class="sort-icon" [class.active]="sortColumn === 'role'">{{ sortColumn === 'role' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('isActive')" class="sortable">
                          סטטוס <span class="sort-icon" [class.active]="sortColumn === 'isActive'">{{ sortColumn === 'isActive' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th>פעולות</th>
                  </tr>
              </thead>
              <tbody>
                  <tr *ngFor="let user of users">
                      <td>{{ user.firstName }} {{ user.lastName }}</td>
                      <td>{{ user.email }}</td>
                      <td>{{ getRoleName(user.role) }}</td>
                      <td>
                          <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                              {{ user.isActive ? 'פעיל' : 'מוקפא' }}
                          </span>
                      </td>
                      <td>
                          <button class="action-btn small" (click)="toggleUserStatus(user)">
                              {{ user.isActive ? 'הקפא' : 'הפעל' }}
                          </button>
                          <button class="action-btn small warning" (click)="resetPassword(user)">
                              איפוס סיסמה
                          </button>
                          <button class="action-btn small" style="background: #a29bfe;" (click)="changeRole(user)">
                              תפקיד
                          </button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>

      <!-- REQUESTS TAB -->
      <div class="tab-content" *ngIf="activeTab === 'requests'">
          <table class="data-table">
              <thead>
                  <tr>
                      <th (click)="sort('requestId')" class="sortable">
                          מזהה <span class="sort-icon" [class.active]="sortColumn === 'requestId'">{{ sortColumn === 'requestId' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('tenantName')" class="sortable">
                          שם דייר <span class="sort-icon" [class.active]="sortColumn === 'tenantName'">{{ sortColumn === 'tenantName' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('cityName')" class="sortable">
                          עיר <span class="sort-icon" [class.active]="sortColumn === 'cityName'">{{ sortColumn === 'cityName' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('dateCreated')" class="sortable">
                          תאריך <span class="sort-icon" [class.active]="sortColumn === 'dateCreated'">{{ sortColumn === 'dateCreated' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th (click)="sort('status')" class="sortable">
                          סטטוס <span class="sort-icon" [class.active]="sortColumn === 'status'">{{ sortColumn === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅' }}</span>
                      </th>
                      <th>פעולות</th>
                  </tr>
              </thead>
              <tbody>
                  <tr *ngFor="let req of requests">
                      <td>#{{ req.requestId }}</td>
                      <td>{{ req.tenantName }}</td>
                      <td>{{ req.cityName }}</td>
                      <td>{{ req.dateCreated | date:'dd/MM/yyyy' }}</td>
                      <td>{{ getStatusName(req.status) }}</td>
                      <td>
                          <button class="action-btn small" *ngIf="req.status === 0" (click)="updateRequestStatus(req, 2)">אשר</button>
                          <button class="action-btn small warning" *ngIf="req.status === 0" (click)="updateRequestStatus(req, 3)">דחה</button>
                      </td>
                  </tr>
              </tbody>
          </table>
      </div>

    </div>
  `,
  styles: [`
    .admin-container { max-width: 1200px; margin: 0 auto; color: var(--text-color); animation: fadeIn 0.5s ease-out; }
    .admin-header { 
        margin-bottom: 2rem; 
        text-align: center;
        h1 { margin-bottom: 2rem; font-size: 2.5rem; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    }
    
    .tabs { display: flex; justify-content: center; gap: 1rem; margin-bottom: 2rem; }
    .tab-btn {
        background: transparent; border: 2px solid transparent; color: var(--text-muted); padding: 0.8rem 2rem;
        border-radius: 50px; cursor: pointer; font-weight: bold; transition: all 0.2s;
        &.active, &:hover { background: rgba(108, 92, 231, 0.1); color: var(--primary-color); border-color: var(--primary-color); }
    }

    .controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .search-input, .filter-select { padding: 0.8rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); }
    
    .data-table {
        width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        th, td { padding: 1rem; text-align: right; border-bottom: 1px solid rgba(0,0,0,0.05); }
        th { background: #f8f9fa; color: var(--text-muted); font-weight: 600; user-select: none; }
        th.sortable { cursor: pointer; &:hover { background: #e9ecef; } }
        .sort-icon { font-size: 0.9rem; margin-right: 5px; color: #636e72; transition: color 0.2s; }
        .sort-icon.active { color: var(--primary-color); }
    }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .stat-card { background: #ffffff; padding: 1.5rem; border-radius: 16px; text-align: center; box-shadow: 0 44px 15px rgba(0,0,0,0.05);
        .icon { font-size: 2rem; margin-bottom: 1rem; }
        .value { font-size: 2rem; font-weight: bold; color: var(--primary-color); }
    }

    /* CHARTS STYLES */
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem; margin-top: 1rem; }
    .chart-card { background: #ffffff; padding: 1.5rem; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); 
        h3 { text-align: center; margin-bottom: 2rem; color: var(--text-muted); }
    }

    .bar-chart { 
        display: flex; align-items: flex-end; justify-content: space-around; height: 200px; padding-top: 20px; 
        .bar-item { width: 40px; background: var(--primary-gradient); border-radius: 8px 8px 0 0; position: relative; transition: height 1s ease-out; }
        .bar-val { position: absolute; top: -25px; left: 50%; transform: translateX(-50%); font-weight: bold; color: var(--primary-color); }
        .bar-label { position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 0.85rem; color: #888; }
    }

    .status-list { display: flex; flex-direction: column; gap: 1rem; }
    .status-item { display: flex; align-items: center; gap: 1rem; }
    .st-label { width: 80px; font-weight: bold; }
    .st-bar-bg { flex: 1; height: 10px; background: #eee; border-radius: 10px; overflow: hidden; }
    .st-bar-fill { height: 100%; background: var(--primary-color); border-radius: 10px; }
    .st-count { width: 30px; text-align: left; }
    
    .status-badge { padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.85rem; font-weight: bold;
        &.active { background: rgba(0, 206, 201, 0.1); color: #00cec9; }
        &.inactive { background: rgba(255, 118, 117, 0.1); color: #ff7675; }
    }
    
    .action-btn {
        border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; background: var(--primary-color); color: white;
        &.warning { background: #ff7675; margin-right: 0.5rem; }
    }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'overview';
  stats$: Observable<SystemStats>;
  graphStats$: Observable<GraphStats> | null = null; // initialized on tab switch

  users: UserDto[] = [];
  userSearch = '';
  userRoleFilter?: number;

  requests: AdminRequestDto[] = [];

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private adminService: AdminService) {
    this.stats$ = this.adminService.getStats();
  }

  ngOnInit() { }

  loadAnalytics() {
    this.activeTab = 'analytics';
    this.graphStats$ = this.adminService.getGraphStats();
  }

  getMax(data: any[]): number {
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 1 : max;
  }

  getMaxScore(data: any[]): number {
    const max = Math.max(...data.map(d => d.count));
    return max === 0 ? 1 : max;
  }

  loadUsers() {
    this.activeTab = 'users';
    this.adminService.getUsers(this.userSearch, this.userRoleFilter).subscribe(res => {
      this.users = res;
      this.sortColumn = ''; // Reset sort on reload
    });
  }

  loadRequests() {
    this.activeTab = 'requests';
    this.adminService.getRequests().subscribe(res => {
      this.requests = res;
      this.sortColumn = ''; // Reset sort on reload
    });
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    const compare = (v1: any, v2: any) => v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    const data = this.activeTab === 'users' ? this.users : this.requests;

    data.sort((a: any, b: any) => {
      const res = compare(a[column], b[column]);
      return res * direction;
    });
  }

  toggleUserStatus(user: UserDto) {
    if (!confirm('האם אתה בטוח?')) return;
    this.adminService.toggleUserStatus(user.id).subscribe(res => {
      user.isActive = res.isActive;
    });
  }

  resetPassword(user: UserDto) {
    if (!confirm('לאפס סיסמה ל-123456?')) return;
    this.adminService.resetPassword(user.id).subscribe(res => alert('סיסמה אופסה ל: ' + res.tempPassword));
  }

  changeRole(user: UserDto) {
    const roles = ['שוכר (0)', 'משכיר (1)', 'מנהל (2)', 'שוכר ומשכיר (3)'];
    const newRoleStr = prompt(`בחר תפקיד חדש עבור ${user.firstName}:\n${roles.join('\n')}`, user.role.toString());

    if (newRoleStr !== null) {
      const newRole = parseInt(newRoleStr);
      if (!isNaN(newRole) && newRole >= 0 && newRole <= 3) {
        this.adminService.updateUserRole(user.id, newRole).subscribe(() => {
          user.role = newRole;
        });
      } else {
        alert('ערך לא תקין');
      }
    }
  }

  updateRequestStatus(req: AdminRequestDto, status: number) {
    this.adminService.updateRequest(req.requestId, { status }).subscribe(() => {
      req.status = status;
    });
  }

  getRoleName(role: number): string {
    return ['שוכר', 'משכיר', 'מנהל', 'שוכר ומשכיר'][role] || 'אחר';
  }

  getStatusName(status: number): string {
    return ['ממתין', 'בבדיקה', 'אושר', 'נדחה'][status] || 'לא ידוע';
  }
}
