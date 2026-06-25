# הוראות התקנה - KaLiScore (Tenant Rating)

---

## הרצה עם Docker (מומלץ)

### דרישות מקדימות

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### שלבים

1. שכפל את הריפוזיטורי:

   ```bash
   git clone https://github.com/Sgross1/tanentProjv2.git
   cd tanentProjv2
   ```

2. צור קובץ `.env` בתיקיית השורש (ראה פורמט למטה).

3. הפעל:

   ```bash
   docker compose up -d --build
   ```

4. גלוש ל: `http://localhost:800`

5. לעצור:
   ```bash
   docker compose down
   ```

---

## קובץ `.env` — משתני סביבה נדרשים

צור קובץ `.env` בתיקיית השורש עם הערכים הבאים:

```env
# Azure Document Intelligence (OCR)
AZURE_API_KEY=your_azure_api_key
AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_MODEL_ID=prebuilt-document

# JWT Authentication
JWT_KEY=your_long_random_secret_key_min_32_chars
JWT_ISSUER=TenantRatingAPI
JWT_AUDIENCE=TenantRatingClient

# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# SMS (SMS4Free)
SMS_KEY=your_sms_key
SMS_USER=your_sms_user
SMS_PASS=your_sms_password
```

> **הערה:** קובץ `.env` לא נדחף ל-Git. אל תשמור סודות בקוד.

---

## הגדרות אימייל (Resend)

הגדרות ה-Resend נמצאות ב-`TenantRating.API/appsettings.json`:

```json
"Resend": {
  "ApiKey": "",
  "FromEmail": "no-reply@kaliscore.tech",
  "UseSandboxRecipient": false,
  "SandboxRecipient": ""
}
```

- **`FromEmail`** — חייב להיות מדומיין מאומת ב-Resend (`kaliscore.tech`).
- **`UseSandboxRecipient: false`** — שולח למייל האמיתי של המשתמש.
- **`UseSandboxRecipient: true`** — שולח לכתובת ב-`SandboxRecipient` (לבדיקות בלבד).
- ה-API Key מגיע ממשתנה סביבה `RESEND_API_KEY` בלבד — לא נשמר בקוד.

---

## פריסה לשרת / AWS

השתמש ב-`docker-compose.server.yml`:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

השרת מגדיר:

- `ASPNETCORE_ENVIRONMENT=Production`
- Volume לקובץ ה-SQLite: `tenantrating_v2.db`
- פורט חיצוני: `80`

---

## פיתוח מקומי (ללא Docker)

### דרישות

- Node.js LTS
- .NET 9.0 SDK — [הורדה](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)

### Backend

```bash
cd TenantRating.API
dotnet restore
dotnet run
```

### Frontend

```bash
cd TenantRating.Client
npm install
ng serve
```

גלוש ל: `http://localhost:4200`

---

## מבנה Docker

| קובץ                        | סביבה                | פורט                  |
| --------------------------- | -------------------- | --------------------- |
| `docker-compose.yml`        | Development (מקומי)  | `800:80`, `8080:8080` |
| `docker-compose.server.yml` | Production (AWS/שרת) | `80:80`, `8080:8080`  |
