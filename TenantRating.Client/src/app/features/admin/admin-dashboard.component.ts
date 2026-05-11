import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AdminService,
  SystemStats,
  UserDto,
  AdminRequestDto,
  GraphStats,
} from "../../core/services/admin.service";
import { Observable } from "rxjs";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.scss"],
})
export class AdminDashboardComponent implements OnInit {
  activeTab = "overview";
  stats$: Observable<SystemStats>;
  graphStats$: Observable<GraphStats> | null = null;

  users: UserDto[] = [];
  userSearch = "";
  userRoleFilter?: number;

  requests: AdminRequestDto[] = [];

  uiMessage = "";
  uiMessageType: "success" | "error" | "info" = "info";
  pendingConfirm = {
    visible: false,
    title: "",
    message: "",
    action: "" as "" | "toggle-status" | "reset-password",
    userId: 0,
  };
  pendingRoleChange = {
    visible: false,
    userId: 0,
    userFirstName: "",
    newRole: 0,
  };

  sortColumn = "";
  sortDirection: "asc" | "desc" = "asc";

  constructor(private adminService: AdminService) {
    this.stats$ = this.adminService.getStats();
  }

  ngOnInit() {}

  loadAnalytics() {
    this.activeTab = "analytics";
    this.graphStats$ = this.adminService.getGraphStats();
  }

  getMax(data: any[]): number {
    const max = Math.max(...data.map((d) => d.count));
    return max === 0 ? 1 : max;
  }

  getMaxScore(data: any[]): number {
    const max = Math.max(...data.map((d) => d.count));
    return max === 0 ? 1 : max;
  }

  loadUsers() {
    this.activeTab = "users";
    this.adminService
      .getUsers(this.userSearch, this.userRoleFilter)
      .subscribe((res) => {
        this.users = res;
        this.sortColumn = ""; // Reset sort on reload
      });
  }

  loadRequests() {
    this.activeTab = "requests";
    this.adminService.getRequests().subscribe((res) => {
      this.requests = res;
      this.sortColumn = ""; // Reset sort on reload
    });
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    const compare = (v1: any, v2: any) => (v1 < v2 ? -1 : v1 > v2 ? 1 : 0);
    const direction = this.sortDirection === "asc" ? 1 : -1;

    const data = this.activeTab === "users" ? this.users : this.requests;

    data.sort((a: any, b: any) => {
      const res = compare(a[column], b[column]);
      return res * direction;
    });
  }

  toggleUserStatus(user: UserDto) {
    this.pendingConfirm = {
      visible: true,
      title: "אישור פעולה",
      message: user.isActive ? "להקפיא את המשתמש?" : "להפעיל את המשתמש?",
      action: "toggle-status",
      userId: user.id,
    };
  }

  resetPassword(user: UserDto) {
    this.pendingConfirm = {
      visible: true,
      title: "איפוס סיסמה",
      message: "לאפס סיסמה ל-123456?",
      action: "reset-password",
      userId: user.id,
    };
  }

  changeRole(user: UserDto) {
    this.pendingRoleChange = {
      visible: true,
      userId: user.id,
      userFirstName: user.firstName,
      newRole: user.role,
    };
  }

  applyRoleChange() {
    if (!this.pendingRoleChange.visible) return;

    const newRole = this.pendingRoleChange.newRole;
    if (newRole < 0 || newRole > 3) {
      this.setUiMessage("ערך לא תקין", "error");
      return;
    }

    const user = this.users.find((u) => u.id === this.pendingRoleChange.userId);
    if (!user) {
      this.setUiMessage("המשתמש לא נמצא.", "error");
      this.cancelRoleChange();
      return;
    }

    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        user.role = newRole;
        this.setUiMessage("התפקיד עודכן בהצלחה.", "success");
        this.cancelRoleChange();
      },
      error: () => {
        this.setUiMessage("עדכון התפקיד נכשל.", "error");
      },
    });
  }

  cancelRoleChange() {
    this.pendingRoleChange = {
      visible: false,
      userId: 0,
      userFirstName: "",
      newRole: 0,
    };
  }

  executePendingConfirm() {
    if (!this.pendingConfirm.visible) return;

    const action = this.pendingConfirm.action;
    const userId = this.pendingConfirm.userId;

    this.cancelPendingConfirm();

    if (action === "toggle-status") {
      const user = this.users.find((u) => u.id === userId);
      if (!user) {
        this.setUiMessage("המשתמש לא נמצא.", "error");
        return;
      }

      this.adminService.toggleUserStatus(user.id).subscribe({
        next: (res) => {
          user.isActive = res.isActive;
          this.setUiMessage("סטטוס המשתמש עודכן בהצלחה.", "success");
        },
        error: () => {
          this.setUiMessage("עדכון סטטוס המשתמש נכשל.", "error");
        },
      });
      return;
    }

    if (action === "reset-password") {
      this.adminService.resetPassword(userId).subscribe({
        next: (res) => {
          this.setUiMessage("הסיסמה אופסה ל: " + res.tempPassword, "success");
        },
        error: () => {
          this.setUiMessage("איפוס סיסמה נכשל.", "error");
        },
      });
    }
  }

  cancelPendingConfirm() {
    this.pendingConfirm = {
      visible: false,
      title: "",
      message: "",
      action: "",
      userId: 0,
    };
  }

  private setUiMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
  ) {
    this.uiMessage = message;
    this.uiMessageType = type;
  }

  updateRequestStatus(req: AdminRequestDto, status: number) {
    this.adminService.updateRequest(req.requestId, { status }).subscribe(() => {
      req.status = status;
    });
  }

  getRoleName(role: number): string {
    return ["שוכר", "משכיר", "מנהל", "שוכר ומשכיר"][role] || "אחר";
  }

  getStatusName(status: number): string {
    return ["ממתין", "בבדיקה", "אושר", "נדחה"][status] || "לא ידוע";
  }
}
