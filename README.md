# Tenant Rating System / מערכת דירוג שוכרים

## About the Project / אודות הפרויקט

A comprehensive tenant rating platform that allows landlords to check tenant ratings and tenants to request ratings. The system includes:
- Landlord search functionality for checking tenant ratings
- Tenant request submission and management
- Admin dashboard for request approval
- Rentability score calculation system

מערכת מקיפה לדירוג שוכרים המאפשרת לבעלי דירות לבדוק דירוגי שוכרים ולשוכרים לבקש דירוגים. המערכת כוללת:
- פונקציונליות חיפוש לבעלי דירות לבדיקת דירוג שוכרים
- הגשה וניהול בקשות שוכרים
- לוח בקרה למנהל מערכת לאישור בקשות
- מערכת חישוב ציון השכרתיות

## Technology Stack / סטאק טכנולוגי

### Backend
- **.NET 9** - ASP.NET Core Web API
- **Entity Framework Core** - ORM
- **SQLite** - Database

### Frontend
- **Angular** (latest version)
- **TypeScript**
- **SCSS** for styling

## Installation / התקנה

Please see [INSTALL_INSTRUCTIONS.md](INSTALL_INSTRUCTIONS.md) for detailed installation instructions.

לפרטים מלאים על ההתקנה, ראה [INSTALL_INSTRUCTIONS.md](INSTALL_INSTRUCTIONS.md)

## Running the Application / הרצת האפליקציה

Simply run the provided batch file:
```bash
run_app.bat
```

This will start both the backend API and frontend Angular application.

## Project History / היסטוריית הפרויקט

This project was initialized on **January 22, 2026** with a complete full-stack setup. The initial codebase was preserved via the `backup/save-point-2026-01-22` branch and merged through Pull Request #1.

For detailed changes and updates, see [CHANGELOG.md](CHANGELOG.md).

הפרויקט אותחל ב-**22 בינואר 2026** עם הגדרה מלאה של full-stack. הקוד הראשוני נשמר דרך ענף `backup/save-point-2026-01-22` ומוזג דרך Pull Request #1.

לשינויים מפורטים ועדכונים, ראה [CHANGELOG.md](CHANGELOG.md).

## Features / תכונות

### For Landlords / לבעלי דירות
- Search for tenants by name and ID number
- View tenant ratings and history
- Check rentability scores

### For Tenants / לשוכרים
- Submit rating requests
- Track request status
- Manage personal information

### For Administrators / למנהלי מערכת
- Review and approve requests
- Manage users
- View system statistics
- Data seeding for testing

## License

This project is proprietary software developed for tenant rating purposes.
