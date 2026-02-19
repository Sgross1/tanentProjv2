# הוראות התקנה - Tenant Rating

כדי להריץ את הפרויקט, עליך להתקין את שני הכלים הבאים:

## 1. Node.js (עבור האתר / Frontend)

- **מה להתקין:** גרסת **LTS** (מומלץ) או Current.
- **קישור להורדה:** [https://nodejs.org/en](https://nodejs.org/en)
- _הוראות:_ תוריד את הקובץ ותעשה Next, Next, Next עד שזה מותקן.

## 2. .NET 9 SDK (עבור השרת / Backend)

- **מה להתקין:** .NET SDK version 9.0
- **קישור להורדה:** [https://dotnet.microsoft.com/en-us/download/dotnet/9.0](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)
- _חשוב:_ בחר את הגרסה של **Windows x64**.

---

## מה עושים אחרי ההתקנה?

1.  **סגור את כל החלונות השחורים** (טרמינלים) הפתוחים כרגע.
2.  פתח חלון CMD או PowerShell חדש.
3.  כנס לתיקיית הפרויקט:
    `C:\Users\shlgr\.gemini\antigravity\scratch\tenant-rating`
4.  הפעל שוב את הקובץ האוטומטי:
    `run_app.bat`

בהצלחה!

---

## הגדרות אימייל (Resend) - מצב פיתוח מול ענן

הגדרות ה-Resend נמצאות בקובץ:
`TenantRating.API/appsettings.json`

בפיתוח מקומי הפרויקט מוגדר למצב Sandbox:

- `UseSandboxRecipient: true`
- `SandboxRecipient`: המייל המאומת של חשבון ה-Resend

כאשר מעלים לענן ומאשרים דומיין/נמענים לפי מדיניות Resend:

- שנה ל-`UseSandboxRecipient: false`
- ודא ש-`FromEmail` הוא שולח מאומת

כך לא צריך לשנות קוד, רק קונפיגורציה.
