
<div style="text-align: center; padding-top: 50px;">
    <h1>ספר פרויקט</h1>
    <h2>מערכת דירוג שוכרים (Tenant Rating)</h2>
    <br><br>
    
    <h3>מגיש: סטודנט לפרויקט גמר</h3>
    <h3>מנחה: [שם המנחה]</h3>
    <h3>תאריך: ינואר 2026</h3>
    
    <br><br><br>
    <img src="https://via.placeholder.com/150" alt="לוגו המכללה" />
</div>

<div style="page-break-after: always;"></div>

# הצעת פרויקט גמר

**שם הפרויקט:** Tenant Rating System
**שם הסטודנט:** [שמך המלא]
**תאריך:** 28/01/2026

### תיאור קצר
מערכת אינטרנטית המאפשרת לשוכרי דירות לקבל "ציון אשראי" (Credit Score) מותאם לשוק השכירות הישראלי. המערכת מנתחת תלושי שכר ומסמכים פיננסיים באמצעות בינה מלאכותית (OCR), משקללת נתונים אישיים, ומפיקה דוח אמין שניתן להציג לבעלי דירות.

### מטרת הפרויקט
יצירת סטנדרט אחיד ואובייקטיבי לסינון שוכרים, המקל על בעלי הדירות בקבלת החלטות ומאפשר לשוכרים טובים להוכיח את אמינותם הפיננסית בקלות.

### טכנולוגיות מרכזיות
*   **צד שרת:** C# .NET Core Web API
*   **צד לקוח:** Angular & TypeScript
*   **מסד נתונים:** SQLite / SQL Server
*   **בינה מלאכותית:** Azure Document Intelligence (לניתוח מסמכים)

<div style="page-break-after: always;"></div>

# 1.3 תכולת הפרויקט המורחבת

## 1.3.1 תיאור ורקע כללי מורחב
שוק השכירות בישראל עבר תהפוכות רבות בעשור האחרון. העלייה המתמדת במחירי הדיור הפכה את השכירות לפתרון המגורים היחיד עבור זוגות צעירים ומשפחות רבות. במקביל, חוסר הוודאות הכלכלית ויוקר המחייה יצרו חשש משמעותי בקרב בעלי דירות ("משכירים"), המהססים להשכיר את נכסיהם ללא בטחונות משמעותיים.

מצב זה יצר "כשל שוק":
מצד אחד, שוכרים טובים ואמינים נדרשים לספק ערבויות בנקאיות גבוהות, צ'קים בנקאיים והמלצות רבות, תהליך שהוא בירוקרטי ומתיש.
מצד שני, בעלי דירות נאלצים להסתמך על תחושות בטן או על ניתוח ידני וחובבני של תלושי שכר, שאינו מעיד בהכרח על יכולת ההחזר האמיתית של השוכר לאורך זמן. אין כיום בישראל מנגנון מסודר, בדומה ל-FICO Score בארה"ב, שמאפשר לאמוד את סיכון האשראי של שוכר בצורה פשוטה ושקופה.

הפרויקט **Tenant Rating** בא לגשר על הפער הזה. זוהי מערכת Web Application שמטרתה לייצר "תעודת זהות פיננסית" לשוכר. המערכת עושה שימוש בטכנולוגיות OCR מתקדמות (Azure AI) כדי לקרוא את המסמכים המקוריים (תלושי שכר, דפי חשבון), מאמתת אותם, ומחשבת ציון משוקלל (0-1000) המייצג את האטרקטיביות של השוכר.

## 1.3.2 מטרות המערכת בפירוט
1.  **אובייקטיביות וסטנדרטיזציה:** החלפת השיקול הסובייקטיבי של בעל הדירה ("הם נראים אנשים נחמדים") בניתוח נתונים קר ומדויק הכולל יחס הכנסה-לשכירות, ותק בעבודה, ומצב משפחתי.
2.  **ייעול תהליך הסינון:** חיסכון בזמן יקר לבעלי דירות. במקום להיפגש עם 20 שוכרים פוטנציאליים, בעל הדירה יכול לבקש מראש את ה"דירוג" ולהיפגש רק עם אלו שעומדים ברף מסוים.
3.  **העצמת השוכר:** שוכר בעל נתונים טובים יכול להשתמש בדירוג כקלף מיקוח להורדת שכר הדירה או להפחתת הערבויות הנדרשות ממנו.
4.  **מניעת זיופים:** שימוש במנועי AI המזהים חריגות או אי-התאמות במסמכים שמקשות על זיוף תלושי שכר בפוטושופ.

## 1.3.3 סקירת מצב קיים בשוק והמתחרים
כיום, הפתרונות הקיימים הם חלקיים בלבד:
*   **בדיקת BDI:** קיימת אפשרות להוציא דוח נתוני אשראי מבנק ישראל. עם זאת, דוח זה הוא טכני מאוד, קשה לקריאה לאדם הממוצע, ואינו מתייחס ספציפית ליכולת לשכור דירה (למשל, אין בו התייחסות למספר הילדים או לגובה שכר הדירה המבוקש).
*   **חברות ביטוח שכירות:** חברות כמו WeCheck מציעות בדיקת רקע, אך המודל העסקי שלהן מבוסס על מכירת ביטוח יקר לבעל הדירה, והן פועלות כ"קופסה שחורה" מבלי לתת משוב לשוכר.
*   **רשתות חברתיות:** קבוצות פייסבוק משמשות כיום לבדיקת רקע ("מי מכיר את השוכר הזה?"), שיטה הפוגעת בפרטיות ואינה אמינה.

המערכת שלנו היא ייחודית בכך שהיא **ממוקדת שוכר (Tenant-Centric)**: היא נותנת לשוכר את השליטה במידע שלו ומציגה לו את הציון לפני שהוא חושף אותו לבעל הדירה.

## 1.3.4 מה הפרויקט אמור לחדש
החדשנות בפרויקט באה לידי ביטוי בשילוב של מספר עולמות תוכן:
1.  **FinTech:** ניתוח פיננסי אוטומטי של יכולת ההחזר.
2.  **PropTech:** התאמה ספציפית לעולם הנדל"ן והשכירות.
3.  **AI Integration:** שימוש במודל שפה/OCR ייעודי (Azure Document Intelligence) שאומן לזהות מבנים של תלושי שכר ישראליים (שדות כמו "ברוטו", "נטו", "הפרשות סוציאליות"), בניגוד למנועי OCR גנריים שנכשלים בעברית.
4.  **UX אינטראקטיבי:** במקום טופס משעמם, המערכת בנויה כ"אשף" דינמי המגיב בזמן אמת לנתונים ונותן משוב ויזואלי (גרף אחוזונים).

## 1.3.5 דרישות מערכת ופונקציונאליות מורחבות

### 1.3.5.1 דרישות מערכת (Non-Functional Requirements)
*   **פלטפורמה:** Web Application התומך ב-Cross Platform (PC, Mobile, Tablet).
*   **זמינות (Availability):** זמינות של 99.9% באמצעות אירוח ענן (Azure App Service).
*   **ביצועים (Performance):** המערכת תספק חיווי ראשוני (Upload) תוך פחות משנייה, וניתוח מלא של 3-6 מסמכים תוך עד 10 שניות.
*   **סקלביליות (Scalability):** הארכיטקטורה תומכת בגידול כמות המשתמשים באמצעות שימוש ב-Microservices בעתיד. כרגע מיושם כ-Monolith מודולרי.
*   **תמיכה בריבוי שפות:** תשתית (i18n) לתמיכה עתידית באנגלית/רוסית.

### 1.3.5.2 דרישות פונקציונאליות (Functional Requirements)
**מודול שוכר:**
1.  **הרשמה/התחברות:** אימות דו-שלבי (מייל/SMS) בגרסה הבאה. כרגע שם משתמש וסיסמה.
2.  **ניהול פרופיל:** עדכון פרטים אישיים, סטטוס משפחתי.
3.  **העלאת מסמכים:** תמיכה ב-PDF, JPG, PNG. ולידציה בצד הלקוח (גודל קובץ, סוג).
4.  **סימולטור שכירות:** השוכר יכול "לשחק" עם גובה שכר הדירה ולראות כיצד זה משפיע על הציון שלו בזמן אמת.

**מודול ניתוח:**
1.  **חילוץ נתונים:** המערכת תזהה אוטומטית: הכנסה נטו, ותק בשנים, מצב משפחתי.
2.  **אימות נתונים:** הצלבת המידע מהתלוש מול הנתונים שהוזנו ידנית (Sanity Check).

**מודול דוחות:**
1.  **הפקת דוח PDF:** יצירת מסמך מעוצב להליכה לחתימת חוזה.
2.  **שיתוף:** שליחת הציון במייל/SMS לבעל הדירה ישירות מהמערכת.

## 1.3.6 בעיות צפויות ופתרונות
### בעיית פענוח (OCR Accuracy)
תלושי שכר בישראל מגיעים באלפי פורמטים (חילן, מלם, עוקץ, ועוד).
*   **הפתרון:** שימוש ב-Azure Document Intelligence עם מודל Pre-built למסמכים פיננסיים, בתוספת לוגיקה היוריסטית ב-C# (למשל: חיפוש מילות מפתח נרדפות כמו "נטו לתשלום", "סך הכל נטו", "לזיכוי חשבון"). כמו כן, הוספת מנגנון "Human in the loop" המאפשר למשתמש לתקן ידנית שגיאות זיהוי קריטיות לפני החישוב הסופי.

### בעיית פרטיות (GDPR/Data Privacy)
העלאת תלושי שכר היא פעולה רגישה מאוד.
*   **הפתרון:** עיקרון "Minimal Data Retention". המערכת שומרת את הקבצים המקוריים רק לזמן העיבוד (בזיכרון או בתיקייה זמנית) ומוחקת אותם מיד לאחר חילוץ הנתונים (המספרים). בבסיס הנתונים נשמרים רק הערכים המספריים (הכנסה, ותק) ולא התמונות עצמן.

## 1.3.7 פתרון טכנולוגי וארכיטקטורה - הרחבה

### 1.3.7.1 צד שרת (Backend) - .NET 9
נבחרה סביבת .NET 9 בשל הביצועים הגבוהים (JIT Compilation), הטיפוסיות החזקה (Strongly Typed) שמונעת באגים, והאינטגרציה המעולה עם Azure.
המערכת בנויה כ-RESTful API, המפריד לחלוטין בין הלוגיקה (Controllers) לבין התצוגה.
שימוש ב-**Entity Framework Core** כ-ORM מאפשר עבודה מול בסיסי נתונים שונים (SQLite בפיתוח, SQL Server בייצור) ללא שינוי קוד.

### 1.3.7.2 צד לקוח (Frontend) - Angular
נבחר פריימוורק Angular (גרסה 17+) בשל היכולת לייצר אפליקציות SPA (Single Page Application) מורכבות. שימוש ב-RxJS מאפשר ניהול זרימת מידע אסינכרונית (חיוני להעלאת קבצים והמתנה לתשובת OCR). העיצוב מבוסס על SCSS מודולרי להפרדה נקייה בין לוגיקה לעיצוב.

### 1.3.7.3 שירותי ענן - Azure AI
הבחירה ב-Azure Document Intelligence נבעה מיכולתו להתמודד עם טקסט עברי מורכב וטבלאות לא מסודרות, תחומים בהם ספריות Open Source חינמיות (כגון Tesseract) מתקשות מאוד.

### 1.3.7.4 תרשים שכבות (Layered Architecture)
1.  **Controllers:** נקודות הקצה (Endpoints) - מקבלות HTTP Request, מבצעות ולידציה בסיסית וקוראות ל-Service.
2.  **Services:** "המוח" של המערכת. כאן יושב האלגוריתם לחישוב הדירוג, הלוגיקה של קריאה ל-OCR, וניהול המשתמשים.
3.  **Repositories / DAL:** השכבה האחראית על שליפה ושמירה ב-Database.
4.  **DTOs:** אובייקטים להעברת מידע בין השכבות, כדי לא לחשוף את מבנה ה-Database ישירות ללקוח (Security best practice).

## 1.3.8 מבנה בסיס הנתונים (Database Schema)

הסכמה כוללת את הטבלאות הראשיות הבאות:

**טבלת Users:**
*   `Id` (PK)
*   `Username`
*   `PasswordHash` (מוצפן)
*   `Email`
*   `Role` (Tenant/Admin)

**טבלת Requests (בקשות דירוג):**
*   `Id` (PK)
*   `UserId` (FK) -> קשר 1:N למשתמשים.
*   `DesiredRent` (שכר דירה מבוקש)
*   `CityName` (עיר מבוקשת)
*   `NetIncome` (הכנסה נטו שחולצה)
*   `SeniorityYears` (ותק)
*   `NumChildren` (מספר ילדים)
*   `FinalScore` (תוצאת הדירוג)
*   `DateCreated` (תאריך יצירה)

## 1.3.10 האלגוריתם - פירוט
נוסחת הדירוג משקללת מספר פרמטרים על בסיס מחקר שוק:
1.  **יחס הכנסה/שכירות (50% מהציון):** מומלץ ששכר הדירה לא יעלה על 30-35% מההכנסה הפנויה. יחס נמוך יותר מעלה את הציון.
2.  **יציבות תעסוקתית (20% מהציון):** ותק של מעל שנתיים במקום העבודה מעיד על יציבות ומקטין סיכון.
3.  **מבנה משפחתי (15% מהציון):** זוגות נשואים נתפסים סטטיסטית כיציבים יותר, אך מספר ילדים גבוה מעלה את ההוצאות ומשפיע לרעה אם ההכנסה אינה תואמת.
4.  **חיסכון פנסיוני (15% מהציון):** קיום הפרשות מסודרות לפנסיה מעיד על עבודה מסודרת אצל מעסיק אמין.

## 1.3.11 אבטחת מידע וסייבר
בפרויקט הושם דגש על עקרונות Secure by Design:
1.  **Authentication:** מימוש מנגנון JWT (JSON Web Tokens). כל בקשה לשרת חייבת לכלול טוקן חתום.
2.  **Authorization:** מנגנון Guards ב-Angular וב-Attributes ב-.NET (`[Authorize]`) כדי למנוע ממשתמשים לגשת למידע של אחרים (IDOR Protection).
3.  **Sanitization:** מניעת XSS ו-SQL Injection ע"י שימוש ב-EF Core (שמשתמש ב-Parameterized Queries) ובמנגנוני האבטחה המובנים של Angular.
4.  **Secret Management:** מפתחות ה-API של Azure אינם נשמרים בקוד אלא בקבצי קונפיגורציה חיצוניים שאינם עולים ל-Source Control.

## 1.3.13 תוכנית עבודה וניהול פרויקט (Gantt)
הפרויקט פוצל ל-4 ספרינטים (Sprints), כל אחד באורך שבועיים:
*   **ספרינט 1:** הקמת סביבה, עיצוב DB, ומסכי Login/Register.
*   **ספרינט 2:** פיתוח רכיב העלאת קבצים ואינטגרציה ראשונית מול Azure.
*   **ספרינט 3:** פיתוח אלגוריתם הדירוג, הצגת תוצאות וגרפים.
*   **ספרינט 4:** ליטושים, תיקוני באגים, בדיקות, וכתיבת ספר פרויקט.

## 1.3.14 תכנון הבדיקות המקיף
### בדיקות שפיות (Sanity)
בדיקה שמשתמש יכול להירשם בהצלחה, ושדף הבית עולה.

### בדיקות אינטגרציה (Integration Testing)
בדיקת התקשורת בין ה-API לבין Azure:
*   מקרה בדיקה 1: שליחת תמונה תקינה -> קבלת JSON מפורט.
*   מקרה בדיקה 2: שליחת תמונה מטושטשת -> קבלת שגיאה מתאימה.
*   מקרה בדיקה 3: שליחת קובץ שאינו תמונה -> חסימה ע"י השרת.

### בדיקות קבלה (UAT)
המשתמש (המנחה) יבצע תהליך מלא: הרשמה -> העלאת 3 תלושים -> קבלת ציון. הקריטריון להצלחה: הציון המתקבל תואם את הציפייה (למשל, אדם עם הכנסה גבוהה יקבל ציון גבוה).

---
*(המשך הרחבות בפרקים הבאים...)*

<div style="page-break-after: always;"></div>

# נספח א' - קוד המערכת

להלן חלקים נבחרים מקוד המקור של המערכת, המדגימים את הלוגיקה המרכזית ואת השימוש בטכנולוגיות שנבחרו (Azure AI, Clean Architecture).

## 1. שירות ה-OCR המלא (OcrService.cs)
שירות זה הוא הליבה של ניתוח המסמכים. ניתן לראות את הטיפול במפתחות בעברית, את הנירמול של שדות מספריים, ואת ההתמודדות עם שגיאות.

```csharp
using Azure;
using Azure.AI.DocumentIntelligence;
using Microsoft.Extensions.Configuration;
using TenantRating.API.DTOs;
using System.Text.RegularExpressions;

namespace TenantRating.API.Services;

public class OcrService : IOcrService
{
    private readonly string _endpoint;
    private readonly string _apiKey;
    private readonly string _modelId;
    private readonly ILogger<OcrService> _logger;

    public OcrService(IConfiguration config, ILogger<OcrService> logger)
    {
        _endpoint = config["AzureDocumentIntelligence:Endpoint"]!;
        _apiKey = config["AzureDocumentIntelligence:ApiKey"]!;
        _modelId = config["AzureDocumentIntelligence:ModelId"]!;
        _logger = logger;
    }

    // הפונקציה הראשית שמקבלת רשימת קבצים ומחזירה דוגמא מעובדת
    public async Task<CreateRequestDto> AnalyzePayslipsAsync(List<IFormFile> files)
    {
        var credential = new AzureKeyCredential(_apiKey);
        var client = new DocumentIntelligenceClient(new Uri(_endpoint), credential);

        decimal totalNetIncome = 0;
        int countNetIncome = 0;
        
        decimal maxPension = 0;
        decimal maxSeniority = 0;
        int maxChildren = 0;
        bool isMarriedInText = false;
        
        // מילון לאגירת כל השדות הגולמיים לצורך דיבאג
        var allDebugFields = new Dictionary<string, object>();

        foreach (var file in files)
        {
            if (file.Length == 0) continue;

            try
            {
                using var stream = file.OpenReadStream();
                var content = BinaryData.FromStream(stream);
                var analyzeOptions = new AnalyzeDocumentContent() { Base64Source = content };

                // השהייה מכוונת למניעת חריגה ממגבלות ה-Free Tier של Azure
                await Task.Delay(1000);

                var operation = await client.AnalyzeDocumentAsync(WaitUntil.Completed, _modelId, analyzeOptions);
                var result = operation.Value;
                
                int docIndex = 0;
                foreach (var document in result.Documents)
                {
                    // מיפוי שדות בעברית - בדיקה רובסטית למספר וריאציות אפשריות
                    
                    // ניתוח שכר נטו
                    if (document.Fields.TryGetValue("שכר נטו", out var netIncomeField) || 
                        document.Fields.TryGetValue("נטו לתשלום", out netIncomeField) ||
                        document.Fields.TryGetValue("נטו", out netIncomeField) ||
                        document.Fields.TryGetValue("NetIncome", out netIncomeField))
                    {
                        if (TryGetDecimal(netIncomeField, out var val))
                        {
                            totalNetIncome += val;
                            countNetIncome++;
                        }
                    }
                    
                    // ניתוח מספר ילדים
                    if (document.Fields.TryGetValue("ילדים", out var childrenField) || 
                        document.Fields.TryGetValue("מספר ילדים", out childrenField) ||
                        document.Fields.TryGetValue("NumChildren", out childrenField))
                    {
                        if (TryGetDecimal(childrenField, out var val))
                        {
                            int intVal = (int)val;
                            if (intVal > maxChildren) maxChildren = intVal;
                        }
                    }

                    // ניתוח ותק
                    if (document.Fields.TryGetValue("ותק בעבודה", out var seniorityField) || 
                        document.Fields.TryGetValue("ותק מוכר", out seniorityField) ||
                        document.Fields.TryGetValue("ותק", out seniorityField) ||
                        document.Fields.TryGetValue("וותק", out seniorityField) || 
                        document.Fields.TryGetValue("שנות ותק", out seniorityField) || 
                        document.Fields.TryGetValue("SeniorityYears", out seniorityField))
                    {
                        if (TryGetDecimal(seniorityField, out var val))
                        {
                            if (val > maxSeniority) maxSeniority = val;
                        }
                    }
                    
                    // ניתוח מצב משפחתי מתוך הטקסט
                    if ((document.Fields.TryGetValue("מצב משפחתי", out var maritalField) || 
                         document.Fields.TryGetValue("MaritalStatus", out maritalField)) && maritalField != null)
                    {
                        var maritalContent = maritalField.Content;
                        if (!string.IsNullOrEmpty(maritalContent) && 
                           (maritalContent.Contains("נשוי") || maritalContent.Contains("נשואה")))
                        {
                            isMarriedInText = true;
                        }
                    }
                    
                    // שמירת נתונים גולמיים ללוג
                    var docFields = document.Fields.ToDictionary(
                        kvp => kvp.Key, 
                        kvp => kvp.Value.Content 
                    );
                    allDebugFields.Add($"File_{file.FileName}_Doc_{docIndex++}", docFields);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing file {FileName}", file.FileName);
                allDebugFields.Add($"Error_{file.FileName}", ex.Message);
            }
        }

        // לוגיקת חישוב ממוצע להכנסה
        decimal averageMonthlyIncome = countNetIncome > 0 ? totalNetIncome / 3 : 0; 

        return new CreateRequestDto
        {
            NetIncome = Math.Round(averageMonthlyIncome, 2),
            NumChildren = maxChildren,
            SeniorityYears = maxSeniority,
            PensionGrossAmount = maxPension,
            RawData = allDebugFields,
            IsMarried = files.Count >= 6 || isMarriedInText
        };
    }

    // פונקציית עזר להמרת שדות (מטבע/טקסט) למספרים
    private bool TryGetDecimal(DocumentField field, out decimal value)
    {
        value = 0;
        if (field == null) return false;
        
        if (field.Type == DocumentFieldType.Currency && field.ValueCurrency != null)
        {
            value = (decimal)field.ValueCurrency.Amount;
            return true;
        }
        
        if (field.Type == DocumentFieldType.Double)
        {
            value = (decimal)field.ValueDouble;
            return true;
        }
        
        var content = field.Content;
        if (string.IsNullOrWhiteSpace(content)) return false;

        // ניקוי תווים לא רצויים (כמו ₪ או פסיקים)
        var cleaned = Regex.Replace(content, @"[^\d\.]", "");
        return decimal.TryParse(cleaned, out value);
    }
}
```

## 2. בקר הבקשות (RequestsController.cs)
דוגמה לקוד ה-Controller המטפל בבקשות הלקוח, מבצע ולידציה בסיסית ומשתמש בשירותים השונים.

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TenantRating.API.Data;
using TenantRating.API.Data.Entities;
using TenantRating.API.DTOs;
using TenantRating.API.Services;

namespace TenantRating.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IScoringService _scoringService;
    private readonly IOcrService _ocrService;

    // הזרקת תלויות (Dependency Injection)
    public RequestsController(AppDbContext context, IScoringService scoringService, IOcrService ocrService)
    {
        _context = context;
        _scoringService = scoringService;
        _ocrService = ocrService;
    }

    [HttpPost("analyze")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CreateRequestDto>> AnalyzePayslips([FromForm] List<IFormFile> files)
    {
        // ולידציה על כמות הקבצים
        if (files == null || (files.Count != 3 && files.Count != 6))
        {
            return BadRequest("יש להעלות בדיוק 3 או 6 תלושי שכר.");
        }

        try
        {
            var result = await _ocrService.AnalyzePayslipsAsync(files);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בפענוח הקבצים: {ex.Message}");
        }
    }
    
    // ... יתר הפונקציות ליצירת בקשה ושמירה ב-DB ...
}
```

## 3. אשף הדירוג (TenantWizardComponent.ts & SCSS)
קטע קוד מה-Frontend, המציג את הלוגיקה של האשף מרובה השלבים (Multi-step Wizard) ואת העיצוב המוקפד ב-SCSS.

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { RequestService } from '../../../core/services/request.service';

@Component({
  selector: 'app-tenant-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-wizard.component.html',
  styleUrls: ['./tenant-wizard.component.scss']
})
export class TenantWizardComponent {
  currentStep = 1;
  isProcessing = false;
  
  // נתונים
  uploadedFiles: File[] = [];
  finalScore = 0;
  
  constructor(private router: Router, private requestService: RequestService) { }

  async processRequest() {
    this.currentStep = 3; // Processing view
    this.isProcessing = true;

    // שלב 1: שליחה לניתוח OCR
    this.requestService.analyzePayslip(this.uploadedFiles).subscribe({
      next: (ocrResult) => {
        
        // הצגת מודל דיבאג למשתמש (אופציונלי)
        this.debugOcrData = ocrResult;
        this.showDebugModal = true;

        // שלב 2: יצירת הבקשה הסופית עם הנתונים המעובדים
        const requestDto = {
          ...ocrResult,
          desiredRent: this.requestData.desiredRent!,
          cityName: this.requestData.cities.join(', ')
        };

        this.requestService.createRequest(requestDto).subscribe({
          next: (result) => {
             // מעבר למסך התוצאה
             this.currentStep = 4;
          },
          error: (err) => alert('שגיאה ביצירת הבקשה')
        });
      },
      error: (err) => alert('שגיאה בפענוח')
    });
  }
}
```
