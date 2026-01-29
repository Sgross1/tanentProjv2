# Changelog - Tenant Rating Project

## 2026-01-22 - Initial Project Setup (Backup/Save Point)

### תכלית הנקודת שמירה / Purpose of Save Point
נקודת השמירה `backup/save-point-2026-01-22` הוקמה כדי לשמור את הגרסה הראשונית והמלאה של הפרויקט לפני המשך הפיתוח. זהו ציון דרך חשוב המאפשר חזרה למצב יציב של הקוד.

The `backup/save-point-2026-01-22` save point was established to preserve the initial complete version of the project before continuing development. This is an important milestone that allows returning to a stable code state.

### מה כלול במיזוג זה / What's Included in This Merge

#### Backend (.NET 9 API)
- **Controllers**: AdminController, AuthController, LandlordsController, RequestsController
- **Data Layer**: AppDbContext, Entity models (User, Request, SavedRequest)
- **Services**: AuthService, ScoringService
- **Logic**: RentabilityScoreCalculator
- **Database**: SQLite database with initial schema

#### Frontend (Angular)
- **Components**: 
  - Home component with main landing page
  - Admin dashboard for administrative tasks
  - Tenant dashboard and wizard for tenant requests
  - Landlord search functionality
  - Authentication modal
- **Services**: Auth, Admin, Landlord, Request services
- **Guards**: Admin authentication guard
- **Interceptors**: JWT token interceptor

#### Infrastructure
- Solution file (TenantRating.sln)
- Installation instructions (INSTALL_INSTRUCTIONS.md)
- Run scripts (run_app.bat, debug_run.bat)
- .gitignore for proper version control

### סטטיסטיקה / Statistics
- **62 files changed**
- **20,104 additions**
- Complete full-stack application structure
- Ready-to-run development environment

### Pull Request
This code was merged via **Pull Request #1** from branch `backup/save-point-2026-01-22` on January 22, 2026.

---

## Future Updates
כל עדכונים עתידיים יתועדו כאן / All future updates will be documented here.
