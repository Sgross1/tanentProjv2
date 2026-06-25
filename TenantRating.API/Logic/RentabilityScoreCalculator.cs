namespace TenantRating.API.Logic;

public static class RentabilityScoreCalculator
{
    private const decimal KidExpenseFactor = 300m; // סיכון לכל ילד
    private const decimal MarriedExpenseFactor = 400m; // סיכון לכל בן/בת זוג

    // יחס חוב להכנסה (DTI)
    public const decimal RentToIncomeRatio = 0.35m; // 35% מההכנסה המתואמת מוקצה לשכר דירה

    public static decimal CalculateTempScore(
        decimal netIncome,
        int numChildren,
        bool isMarried,
        decimal seniorityYears,
        decimal pensionGrossAmount,
        decimal pensionDeductionPercent)
    {
        decimal tempScore = netIncome;

        // --- 1. הפחתה דמוגרפית (תספורות) ---
        tempScore -= CalculateChildrenReduction(numChildren);
        tempScore -= CalculateSpouseReduction(isMarried);

        // --- 2. פרמיית יציבות ---
        decimal stabilityBonus = CalculateStabilityBonus(seniorityYears);
        tempScore += stabilityBonus;

        // --- 3. מנבא משמעת (פנסיה) ---
        decimal disciplineBonus = CalculateDisciplineBonus(pensionDeductionPercent);
        tempScore += disciplineBonus;

        // הבטח ערך לא שלילי
        return Math.Max(0, tempScore);
    }

    public static decimal CalculateFinalScore(decimal tempScore, decimal requestedRent)
    {
        if (requestedRent <= 0) return 100m; // ערך ברירת מחדל

        // 1. שכר דירה מקסימלי אפשרי (35% מההכנסה המתואמת)
        decimal maxAffordableRent = tempScore * RentToIncomeRatio;

        // 2. יחס סיכון
        decimal riskRatio = maxAffordableRent / requestedRent;

        // 3. המרה לציון (0-100)
        decimal finalScore = riskRatio * 100m;

        return Math.Min(Math.Max(finalScore, 0m), 100m);
    }
    // מסלול בדיקות/דיבאג בלבד: מיועד ל-OCR, לוגים ותצוגת פירוט, ולא למסלול הלקוח בייצור.
    public static (string Formula, List<string> Details) GetCalculationDetails(
        decimal netIncome,
        int numChildren,
        bool isMarried,
        decimal seniorityYears,
        decimal pensionGrossAmount,
        decimal pensionDeductionPercent,
        decimal desiredRent)
    {
        var details = new List<string>();

        // A: הכנסה בסיסית
        details.Add($"[A] הכנסה התחלתית (נטו): {netIncome:N0} ₪");

        decimal tempScore = netIncome;

        // B: הפחתה דמוגרפית - ילדים
        decimal childReduction = CalculateChildrenReduction(numChildren);
        tempScore -= childReduction;
        details.Add($"[B] הפחתה דמוגרפית בגין {numChildren} ילדים ({KidExpenseFactor:N0} ₪ לילד): {childReduction:N0} ₪");

        // C: הפחתה דמוגרפית - בן/בת זוג
        decimal spouseReduction = CalculateSpouseReduction(isMarried);
        tempScore -= spouseReduction;
        details.Add($"[C] הפחתה דמוגרפית בגין בן/בת זוג (הוצאות קבועות): {spouseReduction:N0} ₪");

        // D: פרמיית יציבות
        decimal stabilityBonus = CalculateStabilityBonus(seniorityYears);
        tempScore += stabilityBonus;
        details.Add($"[D] פרמיית יציבות בגין {seniorityYears} שנות ותק: {stabilityBonus:N0} ₪");

        // E: מנבא משמעת (פנסיה)
        decimal disciplineBonus = CalculateDisciplineBonus(pensionDeductionPercent);
        tempScore += disciplineBonus;
        details.Add($"[E] מנבא משמעת (פנסיה {pensionDeductionPercent:F1}%): {disciplineBonus:N0} ₪");

        // F: ציון זמני
        tempScore = Math.Max(0, tempScore);
        details.Add($"[F] נטו מתואם (A - B - C + D + E): {tempScore:N0} ₪");

        // חישוב סופי
        if (desiredRent <= 0)
        {
            return ("לא ניתן לחשב (שכר דירה 0)", details);
        }

        // G: מקסימום אפשרי
        decimal maxAffordableRent = tempScore * RentToIncomeRatio;
        details.Add($"[G] שכר דירה מקסימלי מומלץ (F * 0.35): {maxAffordableRent:N0} ₪");

        // H: שכר דירה מבוקש
        details.Add($"[H] שכר דירה מבוקש: {desiredRent:N0} ₪");

        // נוסחה
        string formula = $$"""
        נוסחה: (G / H) * 100
        הצבה: ({{maxAffordableRent:N0}} / {{desiredRent:N0}}) * 100
        """;

        return (formula, details);
    }

    private static decimal CalculateChildrenReduction(int numChildren)
    {
        return numChildren * KidExpenseFactor;
    }

    private static decimal CalculateSpouseReduction(bool isMarried)
    {
        return isMarried ? MarriedExpenseFactor : 0m;
    }

    private static decimal CalculateStabilityBonus(decimal seniorityYears)
    {
        if (seniorityYears < 2) return 0m;

        decimal stabilityBonus;
        if (seniorityYears <= 5)
        {
            stabilityBonus = 50m * (seniorityYears);
        }
        else
        {
            stabilityBonus = 50m * 5 + 100m * (seniorityYears - 5);
        }

        return Math.Min(stabilityBonus, 700m);
    }

    private static decimal CalculateDisciplineBonus(decimal pensionDeductionPercent)
    {
        if (pensionDeductionPercent <= 6) return 0m;

        decimal excessPercent = pensionDeductionPercent - 6;
        decimal disciplineBonus = 50m * (excessPercent / 0.1m);
        return Math.Min(disciplineBonus, 500m);
    }
}
